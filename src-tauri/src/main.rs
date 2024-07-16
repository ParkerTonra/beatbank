// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;

// use tauri::Manager;
// use std::path::PathBuf;

#[derive(serde::Serialize)]
struct Beat {
    id: u32,
    title: String,
    bpm: u32,
    key: String,
    duration: String,
    artist: String,
    date_added: String,
    file_path: String,
}

#[tauri::command]
fn get_beats_json() -> Result<Vec<Beat>, String> {
    // Implement the logic to retrieve and return the beats JSON
    // This should return a Result with a Vec of Beat structs or an error string
    Ok(vec![
        Beat {
            id: 1,
            title: "Go Time".to_string(),
            bpm: 120,
            key: "Fm".to_string(),
            duration: "1:44".to_string(),
            artist: "Dreaddy Bear".to_string(),
            date_added: "07/11/2024".to_string(),
            file_path: "Go Time.wav".to_string(),
        },
        // Add more beats as needed
    ])
}

#[tauri::command]
fn get_audio_path(file_path: String) -> Result<String, String> {
    // Implement the logic to get the full audio path
    // This should return a Result with the audio path as a string or an error string
    Ok(file_path)
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn main() {
    tauri::Builder::default()
    .setup(|_app| {
        // Initialize the database.
        db::init();

        Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        greet, 
        get_beats_json, 
        get_audio_path
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
