use serde::{Deserialize, Serialize};
use std::fs::{self, read_to_string, write};
use std::path::PathBuf;
use tauri::api::path;
use crate::db::{self};


#[derive(Serialize, Deserialize)]
pub struct Settings {
    version: u32,  // Add version field
    theme: String,
    is_first_time: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            version: 1,  // Current version
            theme: "light".to_string(),
            is_first_time: true,
        }
    }
}

impl Settings {
    // Getter methods
    
    // get & set theme go here, if necessary

    pub fn is_first_time(&self) -> bool {
        self.is_first_time
    }

    

    pub fn set_first_time(&mut self, is_first: bool) {
        self.is_first_time = is_first;
    }
}

// Uses Tauri's app_data_dir to get the correct path for settings
pub fn resolve_project_root_path(file_name: &str) -> Result<PathBuf, String> {
    let app_dir = path::app_data_dir(&tauri::Config::default())
        .ok_or_else(|| "Failed to get app data directory".to_string())?;
    
    // Create the beatbank subdirectory in the app directory
    let beatbank_dir = app_dir.join("beatbank");
    
    // Create the directory if it doesn't exist
    fs::create_dir_all(&beatbank_dir)
        .map_err(|e| format!("Failed to create app directory: {}", e))?;
    
    Ok(beatbank_dir.join(file_name))
}

#[tauri::command]
pub async fn force_first_time_setup() -> Result<(), String> {
    println!("Forcing first time setup...");
    
    // Step 1: Clear and reinitialize database
    let mut connection = db::establish_connection()
        .map_err(|e| format!("Failed to establish database connection: {}", e))?;
    
    db::clear_database(&mut connection)
        .map_err(|e| format!("Failed to clear database: {}", e))?;
    
    let settings_path = db::get_app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?
        .join("settings.json");

    let default_settings = Settings::default(); // is_first_time = true
    let contents = serde_json::to_string(&default_settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    
    write(&settings_path, contents)
        .map_err(|e| format!("Failed to save settings: {}", e))?;

    println!("First time setup completed successfully");
    Ok(())
}

#[tauri::command]
pub async fn load_settings() -> Result<Settings, String> {
    let settings_path = resolve_project_root_path("settings.json")
        .map_err(|e| format!("Failed to resolve settings path: {}", e))?;

    if !settings_path.exists() {
        // File doesn't exist, create with default settings
        let default_settings = Settings::default();
        let contents = serde_json::to_string(&default_settings)
            .map_err(|e| format!("Failed to serialize settings: {}", e))?;
        write(&settings_path, contents)
            .map_err(|e| format!("Failed to create settings file: {}", e))?;
        return Ok(default_settings);
    }

    // Try to read existing settings
    let contents = read_to_string(&settings_path)
        .map_err(|e| format!("Failed to read settings file: {}", e))?;

    // Try to parse with current format
    match serde_json::from_str(&contents) {
        Ok(settings) => Ok(settings),
        Err(_) => {
            // If parsing fails, try to migrate old settings
            #[derive(Deserialize)]
            struct OldSettings {
                theme: String,
            }

            // Try to parse old format
            let old_settings: OldSettings = serde_json::from_str(&contents)
                .map_err(|e| format!("Failed to parse old settings format: {}", e))?;

            // Create new settings with old values plus defaults
            let new_settings = Settings {
                version: 1,
                theme: old_settings.theme,
                is_first_time: true,
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
    
    // Clear and reinitialize database
    let mut connection = db::establish_connection()
        .map_err(|e| format!("Failed to establish database connection: {}", e))?;
    
    db::clear_database(&mut connection)
        .map_err(|e| format!("Failed to clear database: {}", e))?;

    // Update settings
    let settings_path = resolve_project_root_path("settings.json")
        .map_err(|e| format!("Failed to resolve settings path: {}", e))?;

    let mut settings = if settings_path.exists() {
        read_to_string(&settings_path)
            .map_err(|e| format!("Failed to read settings file: {}", e))
            .and_then(|contents| {
                match serde_json::from_str(&contents) {
                    Ok(settings) => Ok(settings),
                    Err(_) => migrate_old_settings(&contents)
                }
            })?
    } else {
        Settings::default()
    };
    
    let contents = serde_json::to_string(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    
    write(settings_path, contents)
        .map_err(|e| format!("Failed to save settings: {}", e))
}

fn migrate_old_settings(contents: &str) -> Result<Settings, String> {
    #[derive(Deserialize)]
    struct OldSettings {
        theme: String,
    }

    let old_settings: OldSettings = serde_json::from_str(contents)
        .map_err(|e| format!("Failed to parse old settings format: {}", e))?;

    Ok(Settings {
        version: 1,
        theme: old_settings.theme,
        is_first_time: true,
    })
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
    let settings_path = resolve_project_root_path("settings.json")
        .map_err(|e| format!("Failed to resolve settings path: {}", e))?;
    
    // Load existing settings
    let mut settings = if settings_path.exists() {
        let contents = read_to_string(&settings_path)
            .map_err(|e| format!("Failed to read settings file: {}", e))?;
        
        serde_json::from_str(&contents)
            .map_err(|e| format!("Failed to parse settings: {}", e))?
    } else {
        Settings::default()
    };

    // Update first_time flag
    settings.set_first_time(false);
    
    // Save updated settings
    let contents = serde_json::to_string(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    
    write(&settings_path, contents)
        .map_err(|e| format!("Failed to save settings: {}", e))
}