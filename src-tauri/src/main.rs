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
use serde_json::{self, json};
use std::{
    env, path::Path, sync::{Arc, Mutex}
};
use log::{error, info};
use crate::models::BeatChangeset;
use crate::models::{Beat, BeatCollection};
use tauri::{ AppHandle, Manager, State};

use tokio::spawn;
use tokio::runtime::Runtime;
use tauri::async_runtime;


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

#[derive(Clone)]
struct AnalysisProgress {
    total_files: Arc<Mutex<i32>>,
    completed_files: Arc<Mutex<i32>>,
}

impl AnalysisProgress {
    fn new() -> Self {
        Self {
            total_files: Arc::new(Mutex::new(0)),
            completed_files: Arc::new(Mutex::new(0)),
        }
    }
}

#[derive(Clone)]
pub struct AppState {
    conn: Arc<Mutex<DatabaseConnection>>,
    analysis_progress: AnalysisProgress,
    runtime: Arc<Runtime>,
    pub app_handle: Arc<AppHandle>,
}
impl AppState {
    fn new(conn: DatabaseConnection, app: &tauri::App) -> Self {
        Self {
            conn: Arc::new(Mutex::new(conn)),
            analysis_progress: AnalysisProgress::new(),
            runtime: Arc::new(Runtime::new().expect("Failed to create Tokio runtime")),
            app_handle: Arc::new(app.handle())
        }
    }
}

// Add the progress tracking command
#[tauri::command]
async fn get_analysis_progress(state: State<'_, AppState>) -> Result<(i32, i32), String> {
    let total = *state.analysis_progress.total_files.lock().map_err(|e| e.to_string())?;
    let completed = *state.analysis_progress.completed_files.lock().map_err(|e| e.to_string())?;
    Ok((completed, total))
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn fetch_beats(state: State<'_, AppState>) -> Result<String, String> {
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
async fn add_beat(state: State<'_, AppState>, file_path: String) -> Result<i32, String> {
    let file_name = Path::new(&file_path)
        .file_name()
        .and_then(|name| name.to_str())
        .and_then(|name| name.rsplitn(2, '.').nth(1))
        .unwrap_or("Unknown")
        .to_string();

    // Lock connection only for the initial insert
    let inserted_beat = {
        let mut conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
        let conn = &mut conn_guard.conn;
        db::add_beat(conn, &file_name, &file_path).map_err(|e| e.to_string())?
    }; 

    

    Ok(inserted_beat.id)
}

#[tauri::command]
async fn analyze_beat(state: State<'_, AppState>, beat_id: i32, file_path: String) -> Result<String, String> {
    let file_extension = file_path.split('.').last().unwrap_or("");
    if !["mp3", "flac", "wav"].contains(&file_extension) {
        return Ok(format!("Tempo analysis unavailable for this file type: {}", file_path));
    }

    // Increment total files counter
    *state.analysis_progress.total_files.lock().map_err(|e| e.to_string())? += 1;
    
    // Create owned copies of the data we need to move into the async block
    let file_path = file_path.clone();
   
    // Clone all the required state pieces
    let runtime = state.runtime.clone();
    let conn = state.conn.clone();
    let progress = state.analysis_progress.clone();
    let app_handle = state.app_handle.clone();
    
    // Spawn the analysis task
    runtime.spawn(async move {
        // Run the CPU-intensive analysis in a blocking task
        let analysis_result = tokio::task::spawn_blocking(move || {
            analyze_audio(&file_path)
        }).await.map_err(|e| e.to_string());

        match analysis_result {
            Ok(Ok((bpm_string, bpm_float))) => {
                println!("Analysis complete for beat {}. BPM: {}", beat_id, bpm_string);
                
                // Update the database with the results
                if let Ok(mut conn_guard) = conn.lock() {
                    use crate::schema::beats::dsl::*;
                    if let Err(e) = diesel::update(beats.find(beat_id))
                        .set(bpm.eq(bpm_float as f64))
                        .execute(&mut conn_guard.conn) {
                        eprintln!("Failed to update beat {}: {}", beat_id, e);
                    }
                }
                
                // Update progress counter
                if let Ok(mut completed) = progress.completed_files.lock() {
                    *completed += 1;
                }

                // Emit event for frontend
                let _ = app_handle.emit_all(
                    "beat-analyzed",
                    json!({
                        "beatId": beat_id,
                        "bpm": bpm_float
                    })
                );
            }
            Err(e) => {
                eprintln!("Error analyzing beat {}: {}", beat_id, e);
            }
            Ok(Err(e)) => {
                eprintln!("Error in audio analysis for beat {}: {}", beat_id, e);
            }
        }
    });

    Ok(format!("Analysis started for beat: {}", beat_id))
}
use crate::audio_analysis::analyze_audio;
fn analyze_and_update_beat(
    beat_id: i32,
    beat_path: String,
    conn: &mut diesel::SqliteConnection
) -> Result<(), String> {
    // Check if the connection works before running analysis
    if diesel::select(diesel::dsl::sql::<diesel::sql_types::Integer>("1"))
        .load::<i32>(conn)
        .is_err()
    {
        println!("Database connection test failed");
        return Err("Connection check failed".into());
    }
    println!("Connection check passed");

    // Convert the file path to a strin

    // Run the audio analysis
    let analysis_result = analyze_audio(&beat_path)?;
    let (bpm_string, bpm_float) = analysis_result;
    
    println!("Analysis complete. BPM: {}", bpm_string);
    use crate::schema::beats::dsl::*; 
    // Update the beat in the database with the detected BPM
    diesel::update(beats.find(beat_id))
        .set(bpm.eq(bpm_float as f64))  // Assuming your bpm column is f64
        .execute(conn)
        .map_err(|e| format!("Failed to update beat: {}", e))?;

    println!("Successfully updated beat {} with BPM {}", beat_id, bpm_string);
    
    Ok(())
}

async fn analyze_beat_async(
    beat_id: i32,
    beat_path: String,
    app_state: &AppState,
) -> Result<(), String> {
    // Run the CPU-intensive analysis in a blocking task
    let analysis_result = app_state.runtime.spawn_blocking(move || {
        analyze_audio(&beat_path)
    }).await.map_err(|e| e.to_string())??;

    let (bpm_string, bpm_float) = analysis_result;
    println!("Analysis complete for beat {}. BPM: {}", beat_id, bpm_string);

    // Update the database with the results
    let mut conn_guard = app_state.conn.lock().map_err(|e| e.to_string())?;
    let conn = &mut conn_guard.conn;

    use crate::schema::beats::dsl::*;
    diesel::update(beats.find(beat_id))
        .set(bpm.eq(bpm_float as f64))
        .execute(conn)
        .map_err(|e| format!("Failed to update beat: {}", e))?;

    Ok(())
}

#[tauri::command]
fn delete_beat(id: i32, state: State<'_, AppState>) -> Result<(), String> {
    let mut conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
    let conn = &mut conn_guard.conn;
    db::delete_beat(&mut *conn, id).map_err(|e| e.to_string())?;
    Ok(())
}


#[tauri::command]
fn delete_beats(ids: Vec<i32>, state: State<'_, AppState>) -> Result<(), String> {
    let mut conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
    let conn = &mut conn_guard.conn;
    db::delete_beats(&mut *conn, ids).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn update_beat(beat: BeatChangeset, state: State<'_, AppState>) -> Result<(), String> {
    let mut conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
    let conn = &mut conn_guard.conn;

    db::update_beat(conn, beat)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn save_row_order(row_order: Vec<models::RowOrder>, state: State<'_, AppState>) -> Result<(), String> {
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
    state: State<'_, AppState>,
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
fn get_beat_collection(state: State<'_, AppState>, id: i32) -> Result<BeatCollection, String> {
    let mut conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
    let conn = &mut conn_guard.conn;
    db::get_beat_collection(&mut *conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_beats_in_collection(state: State<'_, AppState>, id: i32) -> Result<Vec<Beat>, String> {
    println!("getting beats in collection");
    let mut conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
    let conn = &mut conn_guard.conn;
    db::get_beats_in_collection(&mut *conn, id).map_err(|e| e.to_string())
    // print the result
}

#[tauri::command]
fn delete_beat_collection(state: State<'_, AppState>, id: i32) -> Result<(), String> {
    let mut conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
    let conn = &mut conn_guard.conn;
    db::delete_beat_collection(&mut *conn, id).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn fetch_collections(state: State<'_, AppState>) -> Result<String, String> {
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
    state: State<'_, AppState>,
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
    state: State<'_, AppState>,
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
    state: State<'_, AppState>,
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

     // Add build-specific initialization
     #[cfg(not(debug_assertions))]
    {
        use tokio::runtime::Runtime;
        // Create a runtime for the async force_first_time_setup
        let rt = Runtime::new().expect("Failed to create Tokio runtime");
        if let Err(e) = rt.block_on(store::force_first_time_setup()) {
            error!("Failed to force first time setup: {}", e);
            panic!("First time setup failed: {}", e);
        }
        info!("Release build: Forced first-time setup completed");
    }
    
    
    
    info!("Database connection established successfully");

    

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            greet,
            fetch_beats,
            add_beat,
            analyze_beat,
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
            store::get_settings_path,
            store::check_is_first_time,
            store::first_time_setup,
            store::force_first_time_setup,
            
        ])
        .setup(|app| {


            info!("Starting application setup...");

            

            let conn = DatabaseConnection {
                conn: db::establish_connection().unwrap_or_else(|e| {
                    error!("Failed to establish database connection: {}", e);
                    panic!("Database connection failed: {}", e)
                }),
            };

            let app_state = AppState::new(conn, app);

            app.manage(app_state);

            info!("Database connection established successfully");

            println!("cargo:rustc-cfg=feature=\"async-await\"");

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
            tauri::RunEvent::ExitRequested {  .. } => {
                info!("Application exit requested");
            }
            tauri::RunEvent::Ready => {
                info!("Application ready");
            }
            tauri::RunEvent::WindowEvent { label, event, .. } => {
                // Only log specific window events we care about
                match event {
                    // Ignore these common window events
                    tauri::WindowEvent::Focused(_) => {},
                    tauri::WindowEvent::Moved(_) => {},
                    tauri::WindowEvent::ScaleFactorChanged { .. } => {},
                    // Log only important window events
                    tauri::WindowEvent::CloseRequested { .. } => {
                        info!("Window '{}' close requested", label);
                    }
                    tauri::WindowEvent::Destroyed => {
                        info!("Window '{}' destroyed", label);
                    }
                    // Log unexpected window events as errors
                    _ => error!("Window '{}' unexpected event: {:?}", label, event),
                }
            }
            _ => {}
        });
}