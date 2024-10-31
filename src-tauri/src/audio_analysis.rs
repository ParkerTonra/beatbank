use std::env;
use std::path::PathBuf;
use std::process::Command;

fn get_executable_path() -> PathBuf {
    let current_dir = env::current_dir().expect("Failed to get current directory");
    let project_root = current_dir.parent().expect("Failed to get project root");
    project_root.join("src-tauri").join("dist").join("audio_analyzer-x86_64-pc-windows-msvc.exe")
}

pub fn analyze_audio(file_path: &str) -> Result<(String, f64), String> {
    let py_executable_path = get_executable_path();
    if !py_executable_path.exists() {
        return Err(format!("Executable not found at: {}", py_executable_path.display()));
    } else {
        println!("Executable found at: {}", py_executable_path.display());
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
