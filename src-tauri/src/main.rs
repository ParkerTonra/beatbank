// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod db;
mod models;
mod schema;
mod store;
mod audio_analysis;
use diesel::prelude::*;
use models::CollOrder;
use serde::Deserialize;
use serde_json;
use serde_json::json; 
use std::{
    env,
    //path::Path,
    sync::{Arc, Mutex},
};
use log::{error, info};
use crate::models::BeatChangeset;
use crate::models::{Beat, BeatCollection};
use tauri::{ Manager, State, AppHandle};
//use crate::audio_analysis::initialize_python_service;
use crate::audio_analysis::AudioAnalysisState;


struct DatabaseConnection {
    conn: SqliteConnection,
}

#[derive(Deserialize)]
struct CollectionOrderPayload {
    collection_id: i32,
    coll_order: Vec<CollOrder>
}


impl Drop for DatabaseConnection {
    fn drop(&mut self) {
        // Optimize the database before closing
        diesel::sql_query("PRAGMA optimize")
            .execute(&mut self.conn)
            .ok();
        println!("Database connection cleaned up");
    }
}

struct AppState {
    conn: Arc<Mutex<DatabaseConnection>>,
    audio_analysis: Arc<AudioAnalysisState>,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn fetch_beats(state: State<AppState>) -> Result<String, String> {
    let mut conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
    let conn = &mut conn_guard.conn;
    use crate::schema::beats::dsl::*;

    beats
        .order(row_order.asc())
        .load::<Beat>(conn)
        .map_err(|e| e.to_string())
        .and_then(|beats_result| serde_json::to_string(&beats_result).map_err(|e| e.to_string()))
}

#[tauri::command]
fn fetch_column_vis() -> String {
    println!("Fetching column visibility...");
    String::from("{}")
}

#[tauri::command]
async fn add_beat(
    state: State<'_, AppState>,
    app_handle: AppHandle,
    file_path: String
) -> Result<String, String> {
    let file_name = std::path::Path::new(&file_path)
        .file_name()
        .and_then(|name| name.to_str())
        .and_then(|name| name.rsplitn(2, '.').nth(1))
        .unwrap_or("Unknown")
        .to_string();

    // Add beat to database first
    let inserted_beat = {
        let conn = &mut state.conn.lock().map_err(|e| e.to_string())?.conn;
        db::add_beat(conn, &file_name, &file_path)
            .map_err(|e| e.to_string())?
    };

    println!("New beat added with id: {}", inserted_beat.id);

    // Spawn analysis as background task
    let state_clone = state.audio_analysis.clone();
    let conn_clone = state.conn.clone();
    let file_path_clone = file_path.clone();
    let app_handle_clone = app_handle.clone();
    
    tauri::async_runtime::spawn(async move {
        match crate::audio_analysis::analyze_audio(
            state_clone,
            file_path_clone,
            Some(&app_handle_clone)
        ).await {
            Ok((key, tempo)) => {
                // Clone key before using it in the update
                let key_clone = key.clone();
                
                // Update beat with analysis results
                let conn = &mut conn_clone.lock().unwrap().conn;
                match diesel::update(crate::schema::beats::dsl::beats.find(inserted_beat.id))
                    .set((
                        crate::schema::beats::dsl::musical_key.eq(Some(key_clone)),
                        crate::schema::beats::dsl::bpm.eq(Some(tempo)),
                    ))
                    .execute(conn)
                {
                    Ok(_) => {
                        println!("Successfully updated beat {} with analysis results", inserted_beat.id);
                        // Now use the original key in the event emission
                        let _ = app_handle_clone.emit_all("beat-analyzed", json!({
                            "id": inserted_beat.id,
                            "key": key,
                            "bpm": tempo
                        }));
                    },
                    Err(e) => println!("Error updating beat: {:?}", e),
                }
            },
            Err(e) => println!("Failed to analyze audio. Error: {}", e),
        }
    });

    Ok(format!("New beat added with id: {}", inserted_beat.id))
}

async fn analyze_and_update_beat(
    beat_id: i32, 
    file_path: String,
    conn: &mut diesel::SqliteConnection,
    audio_state: Arc<AudioAnalysisState>,
    app_handle: Option<&AppHandle>,
) -> Result<(), String> {
    println!("Starting analysis for file: {}", file_path);

    if diesel::select(diesel::dsl::sql::<diesel::sql_types::Integer>("1"))
        .load::<i32>(conn)
        .is_err()
    {
        println!("Database connection test failed");
        return Err("Connection check failed".into());
    }
    println!("Connection check passed");

    match crate::audio_analysis::analyze_audio(
        audio_state,
        file_path,
        app_handle
    ).await {
        Ok((key, tempo)) => {
            println!("Analysis Result: Key: {}, Tempo: {}", key, tempo);
            let musical_key_str = key;  // No need to call to_string() as it's already a String

            diesel::update(crate::schema::beats::dsl::beats.find(beat_id))
                .set((
                    crate::schema::beats::dsl::musical_key.eq(Some(musical_key_str)),
                    crate::schema::beats::dsl::bpm.eq(Some(tempo)),
                ))
                .execute(conn)
                .map_err(|e| {
                    println!("Error updating beat: {:?}", e);
                    e.to_string()
                })?;

            Ok(())
        }
        Err(e) => {
            println!("Failed to analyze audio. Error: {}", e);
            Err(e)
        }
    }
}

#[tauri::command]
fn delete_beat(id: i32, state: State<AppState>) -> Result<(), String> {
    let mut conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
    let conn = &mut conn_guard.conn;
    db::delete_beat(&mut *conn, id).map_err(|e| e.to_string())?;
    Ok(())
}


#[tauri::command]
fn delete_beats(ids: Vec<i32>, state: State<AppState>) -> Result<(), String> {
    let mut conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
    let conn = &mut conn_guard.conn;
    db::delete_beats(&mut *conn, ids).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn update_beat(beat: BeatChangeset, state: State<AppState>) -> Result<(), String> {
    let mut conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
    let conn = &mut conn_guard.conn;

    db::update_beat(conn, beat)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn save_row_order(row_order: Vec<models::RowOrder>, state: State<AppState>) -> Result<(), String> {
    let mut conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
    let conn = &mut conn_guard.conn;
    db::save_row_order(conn, row_order).map_err(|e| e.to_string())
}


#[tauri::command]
fn save_collection_order(
    payload: CollectionOrderPayload, // payload is a struct with two fields: beat_id and collection_order
    state: State<AppState>
) -> Result<(), String> {
    let mut conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
    let conn = &mut conn_guard.conn;

    db::save_collection_order(
        conn,
        payload.coll_order,
        payload.collection_id
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn new_beat_collection(
    state: State<AppState>,
    set_name: String,
    venue: Option<String>,
    city: Option<String>,
    state_name: Option<String>,
    date_played: Option<String>,
    date_created: Option<String>,
) -> Result<BeatCollection, String> {
    let mut conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
    let conn = &mut conn_guard.conn;
    let collection = db::new_beat_collection(
        &mut *conn,
        &set_name,
        venue.as_deref(),
        city.as_deref(),
        state_name.as_deref(),
        date_played.as_deref(),
        date_created.as_deref(),
    )
    .map_err(|e| e.to_string())?;
    Ok(collection)
}

#[tauri::command]
fn get_beat_collection(state: State<AppState>, id: i32) -> Result<BeatCollection, String> {
    let mut conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
    let conn = &mut conn_guard.conn;
    db::get_beat_collection(&mut *conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_beats_in_collection(state: State<AppState>, id: i32) -> Result<Vec<Beat>, String> {
    println!("getting beats in collection");
    let mut conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
    let conn = &mut conn_guard.conn;
    db::get_beats_in_collection(&mut *conn, id).map_err(|e| e.to_string())
    // print the result
}

#[tauri::command]
fn delete_beat_collection(state: State<AppState>, id: i32) -> Result<(), String> {
    let mut conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
    let conn = &mut conn_guard.conn;
    db::delete_beat_collection(&mut *conn, id).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn fetch_collections(state: State<AppState>) -> Result<String, String> {
    println!("Fetching collections...");
    let mut conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
    let conn = &mut conn_guard.conn;

    use crate::schema::beat_collection::dsl::*;

    beat_collection
        .load::<BeatCollection>(&mut *conn)
        .map_err(|e| e.to_string())
        .and_then(|beats_result| serde_json::to_string(&beats_result).map_err(|e| e.to_string()))
}

#[tauri::command]
fn add_beat_to_collection(
    state: State<AppState>,
    collection_id: i32,
    beat_id: i32,
) -> Result<(), String> {
    let mut conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
    let conn = &mut conn_guard.conn;
    db::add_beat_to_collection(&mut *conn, collection_id, beat_id).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn add_beats_to_collection(
    state: State<AppState>,
    collection_id: i32,
    ids: Vec<i32>,
) -> Result<(), String> {
    let mut conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
    let conn = &mut conn_guard.conn;
    db::add_beats_to_collection(&mut *conn, collection_id, ids).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn remove_beats_from_collection(
    state: State<AppState>,
    collection_id: i32,
    ids: Vec<i32>,
) -> Result<(), String> {
    println!("Removing beats from collection...");
    let mut conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
    let conn = &mut conn_guard.conn;


    println!("Removing beats from collection...");
    db::remove_beats_from_collection(&mut *conn, collection_id, ids).map_err(|e| e.to_string())?;

    Ok(())
}


// Opens the file location in the default file manager & selects the file
// Needs to be tested on Mac & Linux
#[tauri::command]
async fn open_file_location(path: String) -> Result<(), String> {
    if cfg!(target_os = "windows") {
        // On Windows, use explorer with the /select flag to highlight the file
        let result = std::process::Command::new("explorer")
            .arg("/select,")
            .arg(path.replace("/", "\\")) // Convert to backslashes for Windows
            .spawn();
        
        if result.is_err() {
            return Err("Failed to open file location in Windows Explorer.".to_string());
        }
    } else if cfg!(target_os = "macos") {
        // On macOS, use 'open -R' to reveal the file in Finder
        let result = std::process::Command::new("open")
            .arg("-R")
            .arg(&path)
            .spawn();
        
        if result.is_err() {
            return Err("Failed to open file location in Finder.".to_string());
        }
    } else {
        // On Linux, just open the directory since most file managers don't support selecting files directly
        let parent_dir = std::path::Path::new(&path)
            .parent()
            .ok_or_else(|| "Failed to extract parent directory".to_string())?;
        
        let result = std::process::Command::new("xdg-open")
            .arg(parent_dir)
            .spawn();
        
        if result.is_err() {
            return Err("Failed to open file location in Linux file manager.".to_string());
        }
    }

    Ok(())
}


fn main() {
    env_logger::init();
    println!("Starting beatbank...");
    let conn = DatabaseConnection {
        conn: db::establish_connection().unwrap_or_else(|e| {
            error!("Failed to establish database connection: {}", e);
            panic!("Database connection failed: {}", e)
        }),
    };
    info!("Database connection established successfully");

    let app_state = AppState {
        conn: Arc::new(Mutex::new(conn)),
        audio_analysis: AudioAnalysisState::new(),
    };

    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            greet,
            fetch_beats,
            add_beat,
            delete_beat,
            delete_beats,
            update_beat,
            fetch_column_vis,
            new_beat_collection,
            fetch_collections,
            delete_beat_collection,
            add_beat_to_collection,
            add_beats_to_collection,
            remove_beats_from_collection,
            get_beat_collection,
            get_beats_in_collection,
            save_row_order,
            save_collection_order,
            open_file_location,
            store::load_settings,
            store::save_settings,
            store::get_settings_path
        ])
        .setup(|app| {
            info!("Starting application setup...");
        
            #[cfg(debug_assertions)]
            {
                let window = app.get_window("main").unwrap();
                window.open_devtools();
            }
        
            let state: State<AppState> = app.state();
            let mut conn_guard = state.conn.lock().map_err(|e| {
                error!("Failed to acquire database lock: {:?}", e);
                e.to_string()
            })?;
            
            info!("Setting up foreign keys...");
            diesel::sql_query("PRAGMA foreign_keys = ON")
                .execute(&mut conn_guard.conn)
                .map_err(|e| format!("Failed to enable foreign keys: {:?}", e))?;
            
            drop(conn_guard);
            
            // Initialize Python service asynchronously
            let app_handle = app.app_handle();
            let audio_state = state.audio_analysis.clone();
            
            info!("Starting Python service initialization...");
            tauri::async_runtime::spawn(async move {
                match crate::audio_analysis::initialize_python_service(audio_state, Some(&app_handle)).await {
                    Ok(()) => info!("Python service initialized successfully"),
                    Err(e) => error!("Failed to initialize Python service: {}", e),
                }
            });
            
            info!("Setup completed successfully");
            Ok(())
        })
        .on_window_event(|e| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = e.event() {
                info!("Window close requested, beginning cleanup...");
                api.prevent_close();
                let window = e.window().clone();
                let app_handle = window.app_handle();
                
                std::thread::spawn(move || {
                    info!("Cleaning up before exit...");
                    std::thread::sleep(std::time::Duration::from_millis(100));
                    info!("Cleanup complete, exiting application");
                    app_handle.exit(0);
                });
            }
        })
        .build(tauri::generate_context!())
        .map_err(|e| {
            error!("Failed to build application: {:?}", e);
            e
        })
        .expect("error while running tauri application")
        .run(|_app_handle, event| match event {
            tauri::RunEvent::ExitRequested { .. } => {
                info!("Application exit requested");
            }
            tauri::RunEvent::Ready => {
                info!("Application ready");
            }
            tauri::RunEvent::WindowEvent { label, event, .. } => {
                match event {
                    tauri::WindowEvent::Focused(_) => {},
                    tauri::WindowEvent::Moved(_) => {},
                    tauri::WindowEvent::ScaleFactorChanged { .. } => {},
                    tauri::WindowEvent::CloseRequested { .. } => {
                        info!("Window '{}' close requested", label);
                    }
                    tauri::WindowEvent::Destroyed => {
                        info!("Window '{}' destroyed", label);
                    }
                    _ => error!("Window '{}' unexpected event: {:?}", label, event),
                }
            }
            _ => {}
        });
}
