use serde::{Deserialize, Serialize};
use std::fs::{self, read_to_string, write};
use std::path::PathBuf;
use tauri::api::path;

#[derive(Serialize, Deserialize)]
pub struct Settings {
    theme: String,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            theme: "light".to_string(),
        }
    }
}

// Uses Tauri's app_data_dir to get the correct path for settings
fn resolve_project_root_path(file_name: &str) -> Result<PathBuf, String> {
    let app_dir = path::app_data_dir(&tauri::Config::default())
        .ok_or_else(|| "Failed to get app data directory".to_string())?;
    
    // Create the app directory if it doesn't exist
    fs::create_dir_all(&app_dir)
        .map_err(|e| format!("Failed to create app directory: {}", e))?;
    
    Ok(app_dir.join(file_name))
}

#[tauri::command]
pub async fn load_settings() -> Result<Settings, String> {
    let settings_path = resolve_project_root_path("settings.json")
        .map_err(|e| format!("Failed to resolve settings path: {}", e))?;

    if !settings_path.exists() {
        // File doesn't exist, create it with default settings
        let default_settings = Settings::default();
        let contents = serde_json::to_string(&default_settings)
            .map_err(|e| format!("Failed to serialize settings: {}", e))?;
        
        write(&settings_path, contents)
            .map_err(|e| format!("Failed to create settings file: {}", e))?;
    }

    read_to_string(settings_path)
        .map_err(|e| format!("Failed to read settings file: {}", e))
        .and_then(|contents| {
            serde_json::from_str(&contents)
                .map_err(|e| format!("Failed to parse settings: {}", e))
        })
}

#[tauri::command]
pub async fn save_settings(settings: Settings) -> Result<(), String> {
    let settings_path = resolve_project_root_path("settings.json")
        .map_err(|e| format!("Failed to resolve settings path: {}", e))?;
    
    let contents = serde_json::to_string(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    
    write(settings_path, contents)
        .map_err(|e| format!("Failed to save settings: {}", e))
}

#[tauri::command]
pub async fn get_settings_path() -> Result<String, String> {
    let settings_path = resolve_project_root_path("settings.json")
        .map_err(|e| format!("Failed to resolve settings path: {}", e))?;
    
    Ok(settings_path.to_string_lossy().into_owned())
}