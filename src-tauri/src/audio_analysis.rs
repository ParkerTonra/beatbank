use pyo3::prelude::*;
use pyo3::types::{PyAny, PyList, PyModule, PyString, PyTuple};
use pyo3::wrap_pyfunction;
use std::env;
use std::path::{Path, PathBuf};
use std::process::Command;


fn get_executable_path() -> PathBuf {
    // Get the current directory
    let current_dir = env::current_dir().expect("Failed to get current directory");

    // Move one level up to account for the "src" folder
    let project_root = current_dir.parent().expect("Failed to get project root");

    // Build the path to the executable in src-tauri/dist
    project_root.join("src-tauri").join("dist").join("audio_analyzer-x86_64-pc-windows-msvc.exe")
}


#[pyfunction]
pub fn analyze_audio(file_path: &str) -> PyResult<(String, f64)> {
    // Acquire the GIL to ensure thread safety when interacting with Python
    Python::with_gil(|py| {
        let py_executable_path = get_executable_path();

        // Check if the executable exists
        if !py_executable_path.exists() {
            return Err(PyErr::new::<pyo3::exceptions::PyRuntimeError, _>(
                format!("Executable not found at: {}", py_executable_path.display()),
            ));
        }else {
            println!("Executable found at: {}", py_executable_path.display());
        }

        // Run the bundled Python script
        let output = Command::new(py_executable_path)
            .arg(file_path) // Pass the file path as an argument
            .output()
            .expect("Failed to execute the Python script");

        // Debug: print stdout and stderr
        let stdout_str = String::from_utf8_lossy(&output.stdout);
        let stderr_str = String::from_utf8_lossy(&output.stderr);
        println!("Raw script stdout: {}", stdout_str);
        println!("Raw script stderr: {}", stderr_str);

        if output.status.success() {
            // Parse the output from the Python script
            let output_str = String::from_utf8_lossy(&output.stdout);

            // debug print
            println!("Raw script output: {}", output_str);

            let result: Vec<&str> = output_str.trim().split(',').collect();
            if result.len() == 2 {
                let key = result[0].to_string();
                let tempo_str = result[1].trim_matches(['[', ']'].as_ref());
                let tempo: f64 = tempo_str.parse().expect("Failed to parse tempo");
                Ok((key, tempo))
            } else {
                Err(PyErr::new::<pyo3::exceptions::PyRuntimeError, _>("Invalid script output"))
            }
        } else {
            let error_str = String::from_utf8_lossy(&output.stderr);
            Err(PyErr::new::<pyo3::exceptions::PyRuntimeError, _>(format!("Script error: {}", error_str)))
        }
    })
}

#[pymodule]
fn my_rust_module(m: &pyo3::Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(analyze_audio, m)?)?;
    Ok(())
}

