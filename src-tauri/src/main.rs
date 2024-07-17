// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;

// use tauri::Manager;
// use std::path::PathBuf;



#[tauri::command]
fn fetch_beats() -> Result<String, String> {
    db::fetch_beats()
        .map(|beats| serde_json::to_string(&beats).unwrap())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn fetch_column_vis() -> Result<String, String> {
    db::fetch_column_vis()
        .map(|column_vis| serde_json::to_string(&column_vis).unwrap())
        .map_err(|e| e.to_string())
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
        fetch_column_vis
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
