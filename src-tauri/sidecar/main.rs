use std::process::Command;

fn main() {
    println!("Running the bundled Python script...");

    let py_executable_path = "dist/audio_analyzer.exe";

    let output = Command::new(py_executable_path)
        .arg("some_argument") // Pass any arguments if needed
        .output()
        .expect("Failed to execute the Python script");

    if output.status.success() {
        println!("Script output: {}", String::from_utf8_lossy(&output.stdout));
    } else {
        eprintln!("Script error: {}", String::from_utf8_lossy(&output.stderr));
    }
}
