// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
mod audio;

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
async fn play_beat(file_path: String) -> Result<(), String> {
    audio::play_beat(file_path)
}

#[tauri::command]
async fn append_beat(file_path: String) -> Result<(), String> {
    audio::append(file_path)
}

#[tauri::command]
async fn pause_beat() -> Result<(), String> {
    audio::pause()
}

#[tauri::command]
async fn resume_beat() -> Result<(), String> {
    audio::resume()
}

#[tauri::command]
async fn stop_beat() -> Result<(), String> {
    audio::stop()
}

#[tauri::command]
async fn set_volume(volume: f32) -> Result<(), String> {
    audio::set_volume(volume)
}

#[tauri::command]
async fn add_set(name: String) -> Result<i64, String> {
    println!("Adding set: {}", name);
    db::create_set(&name)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_playback_state() -> Result<String, String> {
    audio::get_state()
        .map(|state| serde_json::to_string(&state).unwrap())
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_sets() -> Result<String, String> {
    println!("getting sets from the database...");
    db::get_sets()
        .map(|sets| serde_json::to_string(&sets).unwrap())
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn seek_audio(seconds: f32) -> Result<(), String> {
    audio::seek(seconds)
}
#[tauri::command]
async fn save_row_order(row_order: Vec<db::RowOrder>) -> Result<(), String> {
    println!("save_row_order");
    db::save_row_order(row_order).map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_set(set_id: i64) -> Result<(), String> {
    println!("deleting set with id: {}", set_id);
    db::delete_set(set_id).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .setup(|_app| {
            // Initialize the database.
            db::init();
            // The audio thread is automatically started when the first message is sent
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            fetch_beats,
            fetch_column_vis,
            fetch_beat,
            play_beat,
            append_beat,
            pause_beat,
            resume_beat,
            stop_beat,
            set_volume,
            get_playback_state,
            seek_audio,
            save_row_order,
            add_set,
            get_sets,
            delete_set
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}