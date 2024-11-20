use std::process::{Command, Stdio, Child};
use std::io::{BufReader, BufWriter, Write, BufRead};
use std::sync::Mutex;
use serde::Deserialize;
use std::env;
use std::path::PathBuf;
use tauri::AppHandle;
use std::time::Instant;
use std::thread;
use tokio::sync::oneshot;
use std::sync::Arc;
use std::fs::File;

#[derive(Deserialize)]
struct AnalysisResult {
    key: String,
    tempo: f64,
}

#[derive(Clone, Debug)]
pub enum InitState {
    NotStarted,
    InProgress,
    Complete,
    Failed(String),
}

pub struct AudioAnalysisState {
    python_process: Mutex<Option<PythonProcess>>,
    init_state: Mutex<InitState>,
}

impl AudioAnalysisState {
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            python_process: Mutex::new(None),
            init_state: Mutex::new(InitState::NotStarted),
        })
    }
}

struct PythonProcess {
    child: Child,
    writer: BufWriter<std::process::ChildStdin>,
    reader: BufReader<std::process::ChildStdout>,
}

impl PythonProcess {
    fn new(app_handle: Option<&AppHandle>) -> Result<Self, String> {
        let setup_start = Instant::now();
        println!("Starting Python process initialization...");
        
        let py_executable_path = get_executable_path(app_handle);
        
        let mut child = Command::new(&py_executable_path)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to start Python process: {}", e))?;

        if let Some(stderr) = child.stderr.take() {
            let stderr_reader = BufReader::new(stderr);
            thread::spawn(move || {
                stderr_reader.lines().for_each(|line| {
                    if let Ok(line) = line {
                        println!("Python stderr: {}", line);
                    }
                });
            });
        }
            
        let writer = BufWriter::new(child.stdin.take().unwrap());
        let reader = BufReader::new(child.stdout.take().unwrap());
        
        println!("Python process initialization took: {:?}", setup_start.elapsed());
        Ok(PythonProcess {
            child,
            writer,
            reader,
        })
    }
}

pub async fn initialize_python_service(
    state: Arc<AudioAnalysisState>,
    app_handle: Option<&AppHandle>
) -> Result<(), String> {
    // Check if already initializing
    {
        let init_state = state.init_state.lock().unwrap();
        match *init_state {
            InitState::Complete => return Ok(()),
            InitState::InProgress => return Ok(()),
            InitState::Failed(ref err) => return Err(err.clone()),
            InitState::NotStarted => {}
        }
    }
    
    // Set state to in progress
    {
        let mut init_state = state.init_state.lock().unwrap();
        *init_state = InitState::InProgress;
    }

    // Create channel for async communication
    let (tx, rx) = oneshot::channel();
    let state_clone = state.clone();
    let app_handle = app_handle.cloned(); // Clone the AppHandle if Some

    // Spawn blocking initialization in separate thread
    tokio::task::spawn_blocking(move || {
        let result = initialize_python_process(&state_clone, app_handle.as_ref());
        let _ = tx.send(result);
    });

    // Wait for initialization to complete
    match rx.await {
        Ok(Ok(())) => {
            let mut init_state = state.init_state.lock().unwrap();
            *init_state = InitState::Complete;
            Ok(())
        }
        Ok(Err(e)) => {
            let mut init_state = state.init_state.lock().unwrap();
            *init_state = InitState::Failed(e.clone());
            Err(e)
        }
        Err(e) => {
            let error = format!("Failed to receive initialization result: {}", e);
            let mut init_state = state.init_state.lock().unwrap();
            *init_state = InitState::Failed(error.clone());
            Err(error)
        }
    }
}

fn initialize_python_process(
    state: &AudioAnalysisState,
    app_handle: Option<&AppHandle>
) -> Result<(), String> {
    let mut process_guard = state.python_process.lock().unwrap();
    if process_guard.is_none() {
        println!("Starting Python process...");
        *process_guard = Some(PythonProcess::new(app_handle)?);
        
        let dummy_path = create_dummy_audio_file()?;
        
        if let Some(process) = process_guard.as_mut() {
            println!("Starting warmup...");
            let warmup_start = Instant::now();
            
            writeln!(process.writer, "{}", dummy_path.to_string_lossy())
                .map_err(|e| format!("Failed to write to Python process: {}", e))?;
            process.writer.flush()
                .map_err(|e| format!("Failed to flush Python process stdin: {}", e))?;

            let mut result_line = String::new();
            process.reader.read_line(&mut result_line)
                .map_err(|e| format!("Failed to read from Python process: {}", e))?;

            println!("Warmup completed in {:?}", warmup_start.elapsed());
        }
        
        println!("Python process initialization complete");
    }
    Ok(())
}

pub async fn analyze_audio(
    state: Arc<AudioAnalysisState>,
    file_path: String,
    app_handle: Option<&AppHandle>
) -> Result<(String, f64), String> {
    let total_start = Instant::now();
    
    // Check initialization state and initialize if needed
    let need_init = {
        let init_state = state.init_state.lock().unwrap();
        match *init_state {
            InitState::Complete => false,
            InitState::Failed(ref err) => return Err(err.clone()),
            InitState::NotStarted | InitState::InProgress => true,
        }
    }; // MutexGuard is dropped here

    if need_init {
        initialize_python_service(state.clone(), app_handle).await?;
    }
    
    // Spawn blocking analysis in separate thread
    let (tx, rx) = oneshot::channel();
    let state_clone = state.clone();
    let file_path_clone = file_path.clone();
    
    tokio::task::spawn_blocking(move || {
        let result = analyze_audio_blocking(&state_clone, &file_path_clone);
        let _ = tx.send(result);
    });

    match rx.await {
        Ok(result) => {
            println!("Total analysis took: {:?}", total_start.elapsed());
            result
        }
        Err(e) => Err(format!("Failed to receive analysis result: {}", e))
    }
}

fn analyze_audio_blocking(
    state: &AudioAnalysisState,
    file_path: &str,
) -> Result<(String, f64), String> {
    let mut process_guard = state.python_process.lock().unwrap();
    let process = process_guard.as_mut()
        .ok_or_else(|| "Python process not initialized".to_string())?;
    
    println!("Sending file path: {}", file_path);
    writeln!(process.writer, "{}", file_path)
        .map_err(|e| format!("Failed to write to Python process: {}", e))?;
    process.writer.flush()
        .map_err(|e| format!("Failed to flush Python process stdin: {}", e))?;
    
    let mut result_line = String::new();
    process.reader.read_line(&mut result_line)
        .map_err(|e| format!("Failed to read from Python process: {}", e))?;
    
    println!("Raw output from Python: {:?}", result_line);
    
    let result: AnalysisResult = serde_json::from_str(result_line.trim())
        .map_err(|e| {
            println!("JSON parse error: {}", e);
            println!("Attempted to parse: {:?}", result_line);
            format!("Failed to parse Python output: {}", e)
        })?;
        
    println!("Successfully parsed result: key={}, tempo={}", result.key, result.tempo);
    
    Ok((result.key, result.tempo))
}

fn create_dummy_audio_file() -> Result<PathBuf, String> {
    let temp_dir = env::temp_dir();
    let dummy_path = temp_dir.join("dummy.wav");
    
    // Create a very small WAV file (0.25 seconds of silence at 22050 Hz)
    let sample_rate: u32 = 22050;
    let duration_secs: f32 = 0.25;
    let num_samples = (sample_rate as f32 * duration_secs) as u32;
    let data_size = num_samples * 2; // 2 bytes per sample
    
    let header: Vec<u8> = vec![
        // RIFF header
        b'R', b'I', b'F', b'F',
        ((data_size + 36) & 0xff) as u8,
        ((data_size + 36) >> 8 & 0xff) as u8,
        ((data_size + 36) >> 16 & 0xff) as u8,
        ((data_size + 36) >> 24 & 0xff) as u8,
        b'W', b'A', b'V', b'E',

        // fmt chunk
        b'f', b'm', b't', b' ',
        16, 0, 0, 0,            // Chunk size (16 bytes)
        1, 0,                   // PCM format
        1, 0,                   // Mono
        0x22, 0x56, 0x00, 0x00, // Sample rate (22050)
        0x44, 0xac, 0x00, 0x00, // Byte rate (22050 * 2)
        2, 0,                   // Block align
        16, 0,                  // Bits per sample

        // data chunk
        b'd', b'a', b't', b'a',
        (data_size & 0xff) as u8,
        ((data_size >> 8) & 0xff) as u8,
        ((data_size >> 16) & 0xff) as u8,
        ((data_size >> 24) & 0xff) as u8,
    ];
    
    let mut file = File::create(&dummy_path)
        .map_err(|e| format!("Failed to create dummy file: {}", e))?;
    
    // Write header
    file.write_all(&header)
        .map_err(|e| format!("Failed to write header: {}", e))?;
    
    // Write silence (all zeros)
    let silence = vec![0u8; data_size as usize];
    file.write_all(&silence)
        .map_err(|e| format!("Failed to write audio data: {}", e))?;
    
    Ok(dummy_path)
}

fn get_executable_path(_app_handle: Option<&AppHandle>) -> PathBuf {
    #[cfg(debug_assertions)]
    {
        // During development (tauri dev)
        let current_dir = env::current_dir().expect("Failed to get current directory");
        #[cfg(target_os = "windows")] { 
            current_dir.join("dist").join("audio_analyzer-x86_64-pc-windows-msvc.exe") 
        } 
        #[cfg(target_os = "macos")] { 
            current_dir.join("dist").join("audio_analyzer-aarch64-apple-darwin")
        }
    }

    #[cfg(not(debug_assertions))]
    {
        // Release path
        let base_path = if let Some(app) = app_handle {
            app.path_resolver().resource_dir()
        } else {
            env::current_dir().expect("Failed to get current directory")
        };
            
        #[cfg(target_os = "windows")] { 
            base_path.join("resources").join("audio_analyzer-x86_64-pc-windows-msvc.exe") 
        } 
        #[cfg(target_os = "macos")] { 
            base_path.join("resources").join("audio_analyzer-aarch64-apple-darwin")
        }
    }
}