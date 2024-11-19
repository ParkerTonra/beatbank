use std::env;
use std::path::PathBuf;
use std::process::Command;
use tauri::AppHandle;

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
            app.path_resolver().resource_dir().expect("Failed to get resource directory")
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
    let py_executable_path = get_executable_path(app_handle);
    println!("Looking for executable at: {:?}", py_executable_path);
    
    if !py_executable_path.exists() {
        return Err(format!("Executable not found at: {}", py_executable_path.display()));
    }

    let output = Command::new(py_executable_path)
        .arg(file_path)
        .output()
        .expect("Failed to execute the Python script");

    let stdout_str = String::from_utf8_lossy(&output.stdout);
    let stderr_str = String::from_utf8_lossy(&output.stderr);
    println!("Raw script stdout: {}", stdout_str);
    println!("Raw script stderr: {}", stderr_str);

    if output.status.success() {
        let output_str = String::from_utf8_lossy(&output.stdout);
        println!("Raw script output: {}", output_str);

        let result: Vec<&str> = output_str.trim().split(',').collect();
        if result.len() == 2 {
            let key = result[0].to_string();
            let tempo_str = result[1].trim_matches(['[', ']'].as_ref());
            let tempo: f64 = tempo_str.parse().expect("Failed to parse tempo");
            Ok((key, tempo))
        } else {
            Err("Invalid script output".to_string())
        }
    } else {
        let error_str = String::from_utf8_lossy(&output.stderr);
        Err(format!("Script error: {}", error_str))
    }
}