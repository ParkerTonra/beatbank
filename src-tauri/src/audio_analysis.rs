use std::process::{Command, Stdio, Child};
use std::io::{BufReader, BufWriter, Write, BufRead};
use std::sync::Mutex;
use once_cell::sync::Lazy;
use serde::Deserialize;
use std::env;
use std::path::PathBuf;
use tauri::AppHandle;
use std::time::Instant;
use std::thread;
use std::time::Duration;

#[derive(Deserialize)]
struct AnalysisResult {
    key: String,
    tempo: f64,
}

static PYTHON_PROCESS: Lazy<Mutex<Option<PythonProcess>>> = Lazy::new(|| Mutex::new(None));
static INITIALIZATION_COMPLETE: Lazy<Mutex<bool>> = Lazy::new(|| Mutex::new(false));

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

        // Create a separate thread to read stderr
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
        
        let process = PythonProcess {
            child,
            writer,
            reader,
        };

        println!("Python process initialization took: {:?}", setup_start.elapsed());
        Ok(process)
    }
}

fn get_executable_path(app_handle: Option<&AppHandle>) -> PathBuf {
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

pub fn initialize_python_service(app_handle: Option<&AppHandle>) -> Result<(), String> {
    let mut process_guard = PYTHON_PROCESS.lock().unwrap();
    if process_guard.is_none() {
        println!("Starting Python process...");
        *process_guard = Some(PythonProcess::new(app_handle)?);
        
        // Create a dummy audio file for warmup
        let dummy_path = create_dummy_audio_file()?;
        
        // Perform warmup analysis
        if let Some(process) = process_guard.as_mut() {
            println!("Performing warmup analysis...");
            let warmup_start = Instant::now();
            
            writeln!(process.writer, "{}", dummy_path.to_string_lossy())
                .map_err(|e| format!("Failed to write to Python process: {}", e))?;
            process.writer.flush()
                .map_err(|e| format!("Failed to flush Python process stdin: {}", e))?;

            // Read the result
            let mut result_line = String::new();
            process.reader.read_line(&mut result_line)
                .map_err(|e| format!("Failed to read from Python process: {}", e))?;

            println!("Warmup analysis took: {:?}", warmup_start.elapsed());
            
            // Set initialization complete flag
            let mut init_complete = INITIALIZATION_COMPLETE.lock().unwrap();
            *init_complete = true;
        }
        
        println!("Python process initialization complete");
    }
    Ok(())
}

fn create_dummy_audio_file() -> Result<PathBuf, String> {
    use std::fs::File;
    use std::io::Write;
    
    let temp_dir = env::temp_dir();
    let dummy_path = temp_dir.join("dummy.wav");
    
    let mut file = File::create(&dummy_path)
        .map_err(|e| format!("Failed to create dummy file: {}", e))?;
    
    // Write a minimal WAV header and some silence
    let header: Vec<u8> = vec![
        // RIFF header (12 bytes)
        b'R', b'I', b'F', b'F',
        0x24, 0x00, 0x00, 0x00,  // File size (36 bytes)
        b'W', b'A', b'V', b'E',

        // fmt chunk (24 bytes)
        b'f', b'm', b't', b' ',
        0x10, 0x00, 0x00, 0x00,  // Chunk size (16 bytes)
        0x01, 0x00,              // PCM format
        0x01, 0x00,              // Mono
        0x44, 0xAC, 0x00, 0x00,  // Sample rate (44100)
        0x88, 0x58, 0x01, 0x00,  // Byte rate
        0x02, 0x00,              // Block align
        0x10, 0x00,              // Bits per sample

        // data chunk (8 bytes + data)
        b'd', b'a', b't', b'a',
        0x00, 0x00, 0x00, 0x00   // Data size (0 bytes)
    ];
    
    file.write_all(&header)
        .map_err(|e| format!("Failed to write dummy file: {}", e))?;
    
    Ok(dummy_path)
}

pub fn analyze_audio(file_path: &str, app_handle: Option<&AppHandle>) -> Result<(String, f64), String> {
    let total_start = Instant::now();
    
    // Check if initialization is complete
    let init_complete = *INITIALIZATION_COMPLETE.lock().unwrap();
    if !init_complete {
        initialize_python_service(app_handle)?;
    }
    
    let mut process_guard = PYTHON_PROCESS.lock().unwrap();
    let process = process_guard.as_mut()
        .ok_or_else(|| "Python process not initialized".to_string())?;
    
    println!("Sending file path: {}", file_path);
    writeln!(process.writer, "{}", file_path)
        .map_err(|e| format!("Failed to write to Python process: {}", e))?;
    process.writer.flush()
        .map_err(|e| format!("Failed to flush Python process stdin: {}", e))?;
    
    // Read result
    let mut result_line = String::new();
    process.reader.read_line(&mut result_line)
        .map_err(|e| format!("Failed to read from Python process: {}", e))?;
    
    println!("Raw output from Python: {:?}", result_line);
    
    // Parse JSON result
    let result: AnalysisResult = serde_json::from_str(result_line.trim())
        .map_err(|e| {
            println!("JSON parse error: {}", e);
            println!("Attempted to parse: {:?}", result_line);
            format!("Failed to parse Python output: {}", e)
        })?;
        
    println!("Successfully parsed result: key={}, tempo={}", result.key, result.tempo);
    println!("Total analysis took: {:?}", total_start.elapsed());
    
    Ok((result.key, result.tempo))
}