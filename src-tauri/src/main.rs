// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
mod audio;
use std::thread;

// use tauri::Manager;
// use std::path::PathBuf;

#[tauri::command]
fn fetch_beats() -> Result<String, String> {
    db::fetch_beats()
        .map(|beats| serde_json::to_string(&beats).unwrap())
        .map_err(|e| e.to_string())
}


#[tauri::command]
fn fetch_beat(id: String) -> Result<String, String> {
    db::fetch_beat(id)
        .map(|beat| serde_json::to_string(&beat).unwrap())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn fetch_column_vis() -> Result<String, String> {
    db::fetch_column_vis()
        .map(|column_vis| serde_json::to_string(&column_vis).unwrap())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn play_beat(filePath: String) -> Result<(), String> {
    println!("Playing beat (main thread): {}", filePath);
    thread::spawn(move || {
        println!("Playing beat (spawned thread): {}", filePath);
        audio::play_beat(filePath)
    });
    Ok(())
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
        fetch_beats, 
        fetch_column_vis,
        fetch_beat,
        play_beat
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
