// audio_analysis.rs

use std::process::{Command, Stdio, Child};
use std::io::{BufReader, BufWriter, Write, BufRead};
use std::sync::Mutex;
use once_cell::sync::Lazy;
use serde::Deserialize;
use std::env;
use std::path::PathBuf;
use tauri::AppHandle;
use std::time::Instant;

#[derive(Deserialize)]
struct AnalysisResult {
    key: String,
    tempo: f64,
}

static PYTHON_PROCESS: Lazy<Mutex<Option<PythonProcess>>> = Lazy::new(|| Mutex::new(None));

struct PythonProcess {
    child: Child,
    writer: BufWriter<std::process::ChildStdin>,
    reader: BufReader<std::process::ChildStdout>,
}

impl PythonProcess {
    fn new(app_handle: Option<&AppHandle>) -> Result<Self, String> {
        let setup_start = Instant::now();
        println!("Starting Python service initialization...");
        
        let py_executable_path = get_executable_path(app_handle);
        
        let mut child = Command::new(py_executable_path)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to start Python process: {}", e))?;
            
        let writer = BufWriter::new(child.stdin.take().unwrap());
        let reader = BufReader::new(child.stdout.take().unwrap());
        
        println!("Python service initialization took: {:?}", setup_start.elapsed());
        Ok(PythonProcess {
            child,
            writer,
            reader,
        })
    }
}

pub fn initialize_python_service(app_handle: Option<&AppHandle>) -> Result<(), String> {
    let mut process_guard = PYTHON_PROCESS.lock().unwrap();
    if process_guard.is_none() {
        println!("Starting Python process...");
        *process_guard = Some(PythonProcess::new(app_handle)?);
        println!("Python process started successfully");
    }
    Ok(())
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

pub fn analyze_audio(file_path: &str, app_handle: Option<&AppHandle>) -> Result<(String, f64), String> {
    let total_start = Instant::now();
    
    // Just get the process, don't try to create it
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