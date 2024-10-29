fn main() {
    println!("Expected binary path: {:?}", std::env::current_dir().unwrap().join("dist/audio_analyzer.exe"));
    tauri_build::build();
}
