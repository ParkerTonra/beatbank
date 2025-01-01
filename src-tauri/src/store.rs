use serde::{Deserialize, Serialize};
use std::fs::{self};
use std::path::PathBuf;
use tauri::api::path;
use std::collections::HashMap;
use std::sync::Mutex;
use std::sync::LazyLock;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Settings {
    is_first_time: bool,
    column_settings: HashMap<String, ColumnSettings>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ColumnSettings {
    pub visible: bool,
    pub width: u32,
}

impl Default for Settings {
    fn default() -> Self {
        let mut column_settings = HashMap::new();
        
        // Define default columns and their settings
        let defaults = [
            ("drag-handle", (true, 1)),
            ("row_order", (true, 1)),
            ("title", (true, 232)),
            ("bpm", (true, 38)),
            ("musical_key", (false, 100)),
            ("duration", (true, 38)),
            ("artist", (true, 54)),
            ("date_created", (true, 52)),
            ("file_path", (false, 100)),
            ("id", (false, 50)),
            ("genre", (false, 60)),
            ("play-handle", (true, 1)),

        ];

        // Initialize column settings with defaults
        for (column_id, (visible, width)) in defaults {
            column_settings.insert(
                column_id.to_string(),
                ColumnSettings { visible, width }
            );
        }

        Settings {
            is_first_time: true,
            column_settings,
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

static SETTINGS_LOCK: LazyLock<Mutex<()>> = LazyLock::new(|| Mutex::new(()));

#[tauri::command]
pub async fn load_settings() -> Result<Settings, String> {
    // Acquire lock for file operations
    let _lock = SETTINGS_LOCK.lock().map_err(|_| "Failed to acquire settings lock".to_string())?;
    
    let settings_path = resolve_project_root_path("settings.json")
        .map_err(|e| format!("Failed to resolve settings path: {}", e))?;

    if !settings_path.exists() {
        let default_settings = Settings::default();
        save_settings_internal(&default_settings, &settings_path)?;
        return Ok(default_settings);
    }

    let contents = fs::read_to_string(&settings_path)
        .map_err(|e| format!("Failed to read settings file: {}", e))?;

    match serde_json::from_str(&contents) {
        Ok(settings) => Ok(settings),
        Err(e) => {
            println!("Invalid settings file detected, resetting to default: {}", e);
            let default_settings = Settings::default();
            save_settings_internal(&default_settings, &settings_path)?;
            Ok(default_settings)
        }
    }
}

fn save_settings_internal(settings: &Settings, path: &PathBuf) -> Result<(), String> {
    let contents = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    
    // Write to temporary file first
    let temp_path = path.with_extension("json.tmp");
    fs::write(&temp_path, &contents)
        .map_err(|e| format!("Failed to write temporary settings file: {}", e))?;
    
    // Atomically rename temporary file to actual settings file
    fs::rename(&temp_path, path)
        .map_err(|e| format!("Failed to save settings: {}", e))?;
    
    Ok(())
}


#[tauri::command]
pub async fn save_settings(settings: Settings) -> Result<(), String> {
    let _lock = SETTINGS_LOCK.lock().map_err(|_| "Failed to acquire settings lock".to_string())?;
    
    let settings_path = resolve_project_root_path("settings.json")
        .map_err(|e| format!("Failed to resolve settings path: {}", e))?;
    
    save_settings_internal(&settings, &settings_path)
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
    let mut settings = load_settings().await
        .map_err(|e| format!("Failed to load settings: {}", e))?;

    let current = settings.get_column_settings(&column_id)
        .cloned()
        .unwrap_or(ColumnSettings { visible: true, width: 100 });
    
    settings.set_column_settings(column_id, ColumnSettings { 
        visible: current.visible,
        width 
    });

    save_settings(settings).await
        .map_err(|e| format!("Failed to save settings: {}", e))
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