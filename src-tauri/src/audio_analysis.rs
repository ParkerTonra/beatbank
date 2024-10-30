use pyo3::prelude::*;
use pyo3::types::{PyAny, PyList, PyModule, PyString, PyTuple};
use pyo3::wrap_pyfunction;
use std::env;
use std::path::PathBuf;

/*
fn get_venv_python_path() -> PathBuf {
    #[cfg(target_os = "windows")]
    { PathBuf::from("python/windows/Scripts/python.exe") }
    #[cfg(target_os = "macos")]
    { PathBuf::from("python/macos/bin/python3.12") }
}
*/

fn get_venv_site_packages() -> PathBuf {
    println!("Rust is getting python packages");
    #[cfg(target_os = "windows")]
    { PathBuf::from(env::current_dir().unwrap().join("..").join("python/windows/Lib/site-packages")) }
    #[cfg(target_os = "macos")]
    { PathBuf::from(env::current_dir().unwrap().join("..").join("python/macos/lib/python3.12/site-packages")) }
}

fn get_analyzer_path() -> PathBuf {
    env::current_dir().unwrap().join("..").join("python").canonicalize().expect("Failed to get absolute path")
}

#[pyfunction]
pub fn analyze_audio(file_path: &str) -> PyResult<(String, f64)> {
    println!("Rust is analyzing audio");
    let venv_site_packages = get_venv_site_packages();
    let analyzer_path = get_analyzer_path();
    
    Python::with_gil(|py| {
        let sys: Bound<'_, PyModule> = py.import_bound("sys")?;
        
        let path: Bound<'_, PyList> = sys.getattr("path")?.extract()?;
        path.call_method("insert", (0, PyString::new_bound(py, venv_site_packages.to_str().unwrap())), None)?;
        path.call_method("append", (PyString::new_bound(py, analyzer_path.to_str().unwrap()),), None)?;

        println!("Updated Python path: {:?}", path);

        let my_module: Bound<'_, PyModule> = py.import_bound("audio_analyzer")?;
        let py_file_path: Bound<'_, PyString> = PyString::new_bound(py, file_path);
        let args = PyTuple::new_bound(py, vec![py_file_path]);
        let result: Bound<'_, PyAny> = my_module.call_method("analyze", args, None)?;
        let extracted_result: (String, f64) = result.extract()?;
        
        Ok(extracted_result)
    })
}

#[pymodule(name = "audio_analyzer")]
fn my_rust_module(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(analyze_audio, m)?)?;
    Ok(())
}
