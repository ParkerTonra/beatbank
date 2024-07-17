use std::fs;
use rusqlite::{Connection, Result};
use std::env;
use std::path::{Path, PathBuf};

#[derive(serde::Serialize)]
pub struct Beat {
    id: u32,
    title: String,
    bpm: u32,
    key: String,
    duration: String,
    artist: String,
    date_added: String,
    file_path: String,
}
#[derive(serde::Serialize)]
pub struct ColumnVisibility {
    title: bool,
    bpm: bool,
    key: bool,
    duration: bool,
    artist: bool,
    date_added: bool,
    file_path: bool,
}

// Check if a database file exists, and create one if it does not.
pub fn init() {
    println!("Initializing database...");
    if !db_file_exists() {
        println!("Database file does not exist. Creating...");
        create_db_file();
    } else {
        println!("Database file already exists.");
    }
    let conn = establish_db_connection();
    create_beat_table(&conn);
    init_column_vis(&conn);
}



fn establish_db_connection() -> Connection {
    let db_path = get_db_path();
    println!("Establishing database connection. DB PATH: {}", db_path);
    Connection::open(&db_path)
        .unwrap_or_else(|_| panic!("Error connecting to {}", db_path))
}

fn create_beat_table(conn: &Connection) {
    let create_table_sql = "
        CREATE TABLE IF NOT EXISTS beats (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            bpm INTEGER NOT NULL,
            key TEXT NOT NULL,
            duration TEXT NOT NULL,
            artist TEXT NOT NULL,
            date_added TEXT NOT NULL,
            file_path TEXT NOT NULL
        );
    ";

    match conn.execute(create_table_sql, []) {
        Ok(_) => println!("beats table created successfully."),
        Err(e) => println!("Error creating beats table: {}", e),
    }
}

fn init_column_vis(conn: &Connection) {
    // if table exists, return
    
    let create_table_sql = "
        CREATE TABLE IF NOT EXISTS column_visibility (
            title BOOLEAN NOT NULL DEFAULT TRUE,
            bpm BOOLEAN NOT NULL DEFAULT TRUE,
            key BOOLEAN NOT NULL DEFAULT TRUE,
            duration BOOLEAN NOT NULL DEFAULT TRUE,
            artist BOOLEAN NOT NULL DEFAULT FALSE,
            date_added BOOLEAN NOT NULL DEFAULT FALSE,
            file_path BOOLEAN NOT NULL DEFAULT FALSE
        );
    ";

    match conn.execute(create_table_sql, []) {
        Ok(_) => println!("Column visibility table created successfully."),
        Err(e) => println!("Error creating column visibility table: {}", e),
    }
}

pub fn fetch_column_vis() -> Result<Vec<ColumnVisibility>> {
    let conn = establish_db_connection();
    let mut stmt = conn.prepare("SELECT title, bpm, key, duration, artist, date_added, file_path FROM column_visibility")?;
    let column_vis_iter = stmt.query_map([], |row| {
        Ok(ColumnVisibility {
            title: row.get(0)?,
            bpm: row.get(1)?,
            key: row.get(2)?,
            duration: row.get(3)?,
            artist: row.get(4)?,
            date_added: row.get(5)?,
            file_path: row.get(6)?,
        })
    })?;

    let column_vis: Vec<ColumnVisibility> = column_vis_iter.filter_map(Result::ok).collect();
    Ok(column_vis)
}

pub fn fetch_beats() -> Result<Vec<Beat>> {
    let conn = establish_db_connection();
    let mut stmt = conn.prepare("SELECT id, title, bpm, key, duration, artist, date_added, file_path FROM beats")?;
    let beat_iter = stmt.query_map([], |row| {
        Ok(Beat {
            id: row.get(0)?,
            title: row.get(1)?,
            bpm: row.get(2)?,
            key: row.get(3)?,
            duration: row.get(4)?,
            artist: row.get(5)?,
            date_added: row.get(6)?,
            file_path: row.get(7)?,
        })
    })?;

    let beats: Vec<Beat> = beat_iter.filter_map(Result::ok).collect();
    Ok(beats)
}

fn normalize_path(path: &str) -> String {
    Path::new(path)
        .components()
        .collect::<PathBuf>()
        .to_str()
        .unwrap()
        .to_string()
}
pub fn get_audio_path(conn: &Connection, id: u32) -> Result<String> {
    let mut stmt = conn.prepare("SELECT file_path FROM beats WHERE id = ?1")?;
    let file_path: String = stmt.query_row([id], |row| row.get(0))?;
    Ok(normalize_path(&file_path))
}

fn create_db_file() {
    let db_path = get_db_path();
    let db_dir = Path::new(&db_path).parent().unwrap();
    if !db_dir.exists() {
        println!("Creating database directory: {:?}", db_dir);
        fs::create_dir_all(db_dir).unwrap();
    }
    println!("Creating database file: {}", db_path);
    Connection::open(&db_path).unwrap();
}

fn db_file_exists() -> bool {
    let db_path = get_db_path();
    let exists = Path::new(&db_path).exists();
    println!("Checking if database file exists: {} ({})", db_path, exists);
    exists
}


fn get_db_path() -> String {
    let current_dir = env::current_dir().unwrap();
    let db_path = current_dir.join(".config/beatbank.db");
    let db_path_str = db_path.to_str().unwrap().to_string();
    println!("Database path: {}", db_path_str);
    db_path_str
}