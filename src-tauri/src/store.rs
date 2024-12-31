use serde::{Deserialize, Serialize};
use std::fs::{self, read_to_string, write};
use std::path::PathBuf;
use tauri::api::path;

#[derive(Serialize, Deserialize, Clone)]
pub struct ColumnSettings {
    pub visible: bool,
    pub width: u32,
}

#[derive(Serialize, Deserialize)]
pub struct Settings {
    is_first_time: bool,
    column_settings: std::collections::HashMap<String, ColumnSettings>,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            is_first_time: true,
            column_settings: std::collections::HashMap::new(),
        }
    }
}

impl Settings {
    pub fn is_first_time(&self) -> bool {
        self.is_first_time
    }

    pub fn set_first_time(&mut self, is_first: bool) {
        self.is_first_time = is_first;
    }

    pub fn get_column_settings(&self, column_id: &str) -> Option<&ColumnSettings> {
        self.column_settings.get(column_id)
    }

    pub fn set_column_settings(&mut self, column_id: String, settings: ColumnSettings) {
        self.column_settings.insert(column_id, settings);
    }

    pub fn get_all_column_settings(&self) -> &std::collections::HashMap<String, ColumnSettings> {
        &self.column_settings
    }
}

pub fn resolve_project_root_path(file_name: &str) -> Result<PathBuf, String> {
    let app_dir = path::app_data_dir(&tauri::Config::default())
        .ok_or_else(|| "Failed to get app data directory".to_string())?;
    
    let beatbank_dir = app_dir.join("beatbank");
    
    fs::create_dir_all(&beatbank_dir)
        .map_err(|e| format!("Failed to create app directory: {}", e))?;
    
    Ok(beatbank_dir.join(file_name))
}

#[tauri::command]
pub async fn load_settings() -> Result<Settings, String> {
    let settings_path = resolve_project_root_path("settings.json")
        .map_err(|e| format!("Failed to resolve settings path: {}", e))?;

    if !settings_path.exists() {
        let default_settings = Settings::default();
        let contents = serde_json::to_string(&default_settings)
            .map_err(|e| format!("Failed to serialize settings: {}", e))?;
        write(&settings_path, contents)
            .map_err(|e| format!("Failed to create settings file: {}", e))?;
        return Ok(default_settings);
    }

    let contents = read_to_string(&settings_path)
        .map_err(|e| format!("Failed to read settings file: {}", e))?;

    // Try to parse with current format
    match serde_json::from_str(&contents) {
        Ok(settings) => Ok(settings),
        Err(_) => {
            // If parsing fails, try to migrate old settings
            #[derive(Deserialize)]
            struct OldSettings {
                is_first_time: bool,
            }

            // Try to parse old format
            let old_settings: OldSettings = serde_json::from_str(&contents)
                .map_err(|e| format!("Failed to parse settings: {}", e))?;

            // Create new settings with old values plus defaults
            let new_settings = Settings {
                is_first_time: old_settings.is_first_time,
                column_settings: std::collections::HashMap::new(),
            };

            // Save migrated settings
            let new_contents = serde_json::to_string(&new_settings)
                .map_err(|e| format!("Failed to serialize migrated settings: {}", e))?;
            write(&settings_path, new_contents)
                .map_err(|e| format!("Failed to save migrated settings: {}", e))?;

            Ok(new_settings)
        }
    }
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
pub async fn first_time_setup() -> Result<(), String> {
    println!("Running first time setup...");
    
    // Load current settings
    let mut settings = load_settings().await?;
    
    // Update first_time flag
    settings.set_first_time(false);
    
    // Save settings
    save_settings(settings).await
}

#[tauri::command]
pub async fn check_is_first_time() -> Result<bool, String> {
    let settings = load_settings().await?;
    Ok(settings.is_first_time())
}

#[tauri::command]
pub async fn get_settings_path() -> Result<String, String> {
    let settings_path = resolve_project_root_path("settings.json")
        .map_err(|e| format!("Failed to resolve settings path: {}", e))?;
    Ok(settings_path.to_string_lossy().into_owned())
}

#[tauri::command]
pub async fn set_not_first_time() -> Result<(), String> {
    let mut settings = load_settings().await?;
    settings.set_first_time(false);
    save_settings(settings).await
}

// New commands for column settings
#[tauri::command]
pub async fn update_column_visibility(
    column_id: String,
    visible: bool,
) -> Result<(), String> {
    let mut settings = load_settings().await?;
    let current = settings.get_column_settings(&column_id)
        .cloned()
        .unwrap_or(ColumnSettings { visible: true, width: 100 });
    
    settings.set_column_settings(column_id, ColumnSettings { 
        visible,
        width: current.width 
    });
    save_settings(settings).await
}

#[tauri::command]
pub async fn update_column_width(
    column_id: String,
    width: u32,
) -> Result<(), String> {
    let mut settings = load_settings().await?;
    let current = settings.get_column_settings(&column_id)
        .cloned()
        .unwrap_or(ColumnSettings { visible: true, width: 100 });
    
    settings.set_column_settings(column_id, ColumnSettings { 
        visible: current.visible,
        width 
    });
    save_settings(settings).await
}

#[tauri::command]
pub async fn get_column_settings(column_id: String) -> Result<Option<ColumnSettings>, String> {
    let settings = load_settings().await?;
    Ok(settings.get_column_settings(&column_id).cloned())
}

#[tauri::command]
pub async fn get_all_column_settings() -> Result<std::collections::HashMap<String, ColumnSettings>, String> {
    println!("Getting all column settings...");
    let settings = load_settings().await?;
    Ok(settings.get_all_column_settings().clone())
}