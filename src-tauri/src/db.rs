use std::fs;
use rusqlite::{params, Connection, Result};
use std::env;
use lazy_static::lazy_static;
use std::sync::Mutex;
use chrono::Local;
use std::path::Path;
use std::fs::File;
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use symphonia::core::units::Time;


#[derive(serde::Serialize)]
pub struct Beat {
    id: u32,
    title: String,
    bpm: u32,
    musical_key: String,
    duration: String,
    artist: String,
    date_added: String,
    file_path: String,
    row_number: i32,
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

#[derive(serde::Deserialize)]
pub struct RowOrder {
    row_id: String,
    row_number: i32,
}

lazy_static! {
    static ref DB_PATH: String = get_db_path();
    static ref CONNECTION: Mutex<Connection> = Mutex::new(establish_db_connection());
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
    let conn = CONNECTION.lock().unwrap();
    create_beat_table(&conn);
    init_column_vis(&conn);
    create_set_tables(&conn);
}

fn create_set_tables(conn: &Connection) {
    println!("Creating set tables...\n");
    let create_set_name_table_sql = "
        CREATE TABLE IF NOT EXISTS set_name (
            id INTEGER PRIMARY KEY,
            set_name TEXT NOT NULL
        );
    ";

    let create_set_beat_table_sql = "
        CREATE TABLE IF NOT EXISTS set_beat (
            set_id INTEGER,
            beat_id INTEGER,
            PRIMARY KEY (set_id, beat_id),
            FOREIGN KEY (set_id) REFERENCES set_name(id),
            FOREIGN KEY (beat_id) REFERENCES beats(id)
        );
    ";

    match conn.execute(create_set_name_table_sql, []) {
        Ok(_) => println!("set_name table created successfully."),
        Err(e) => println!("Error creating set_name table: {}", e),
    }

    match conn.execute(create_set_beat_table_sql, []) {
        Ok(_) => println!("set_beat table created successfully."),
        Err(e) => println!("Error creating set_beat table: {}", e),
    }
}

pub fn create_set(set_name: &str) -> Result<i64> {
    let conn = CONNECTION.lock().unwrap();
    conn.execute("INSERT INTO set_name (set_name) VALUES (?1)", params![set_name])?;
    Ok(conn.last_insert_rowid())
}

pub fn delete_set(set_id: i64) -> Result<()> {
    let mut conn = CONNECTION.lock().unwrap();
    let tx = conn.transaction()?;
    tx.execute("DELETE FROM set_beat WHERE set_id = ?1", params![set_id])?;
    tx.execute("DELETE FROM set_name WHERE id = ?1", params![set_id])?;
    tx.commit()?;
    Ok(())
}

pub fn add_beat_to_set(set_id: i64, beat_id: i64) -> Result<()> {
    let conn = CONNECTION.lock().unwrap();
    conn.execute("INSERT INTO set_beat (set_id, beat_id) VALUES (?1, ?2)", params![set_id, beat_id])?;
    Ok(())
}

pub fn remove_beat_from_set(set_id: i64, beat_id: i64) -> Result<()> {
    let conn = CONNECTION.lock().unwrap();
    conn.execute("DELETE FROM set_beat WHERE set_id = ?1 AND beat_id = ?2", params![set_id, beat_id])?;
    Ok(())
}

pub fn get_sets() -> Result<Vec<(i64, String)>> {
    let conn = CONNECTION.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, set_name FROM set_name")?;
    let sets_iter = stmt.query_map([], |row| {
        Ok((row.get(0)?, row.get(1)?))
    })?;
    sets_iter.collect()
}

pub fn get_beats_in_set(set_id: i64) -> Result<Vec<Beat>> {
    let conn = CONNECTION.lock().unwrap();
    let mut stmt = conn.prepare("
        SELECT b.id, b.title, b.bpm, b.musical_key, b.duration, b.artist, b.date_added, b.file_path, b.row_number
        FROM beats b
        JOIN set_beat sb ON b.id = sb.beat_id
        WHERE sb.set_id = ?1
        ORDER BY b.row_number
    ")?;
    let beat_iter = stmt.query_map(params![set_id], |row| {
        Ok(Beat {
            id: row.get(0)?,
            title: row.get(1)?,
            bpm: row.get(2)?,
            musical_key: row.get(3)?,
            duration: row.get(4)?,
            artist: row.get(5)?,
            date_added: row.get(6)?,
            file_path: row.get(7)?,
            row_number: row.get(8)?,
        })
    })?;
    beat_iter.collect()
}


fn establish_db_connection() -> Connection {
    println!("Establishing database connection. DB PATH: {}", *DB_PATH);
    Connection::open(&*DB_PATH)
        .unwrap_or_else(|_| panic!("Error connecting to {}", *DB_PATH))
}

fn create_beat_table(conn: &Connection) {
    println!("Creating beats table...\n");
    let create_table_sql = "
        CREATE TABLE IF NOT EXISTS beats (
            id INTEGER PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            bpm INTEGER
            musical_key VARCHAR(2),
            duration varchar(255) NOT NULL,
            artist varchar(255),
            date_added varchar(10) NOT NULL,
            file_path TEXT NOT NULL,
            row_number INTEGER NOT NULL
        );
    ";

    match conn.execute(create_table_sql, []) {
        Ok(_) => println!("beats table created successfully."),
        Err(e) => println!("Error creating beats table: {}", e),
    }
}

fn init_column_vis(conn: &Connection) {
    println!("Creating column visibility table...\n");
    let create_table_sql = "
        CREATE TABLE IF NOT EXISTS column_visibility (
            title BOOLEAN NOT NULL DEFAULT TRUE,
            bpm BOOLEAN NOT NULL DEFAULT TRUE,
            `key` BOOLEAN NOT NULL DEFAULT TRUE,
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
    println!("Fetching column visibility... \n");
    let conn = CONNECTION.lock().unwrap();
    let mut stmt = conn.prepare("SELECT title, bpm, `key`, duration, artist, date_added, file_path FROM column_visibility")?;
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
// deprecated
// pub fn fetch_beat(id: String) -> Result<Beat> {
//     println!("Fetching beat... \n");
//     let conn = CONNECTION.lock().unwrap();
//     let mut stmt = conn.prepare("SELECT id, title, bpm, musical_key, duration, artist, date_added, file_path FROM beats WHERE id = ?")?;
//     let beat_iter = stmt.query_map([], |row| {
//         Ok(Beat {
//             id: row.get(0)?,
//             title: row.get(1)?,
//             bpm: row.get(2)?,
//             musical_key: row.get(3)?,
//             duration: row.get(4)?,
//             artist: row.get(5)?,
//             date_added: row.get(6)?,
//             file_path: row.get(7)?,
//             row_number: row.get(8)?,
//         })
//     })?;
//     let beat: Beat = beat_iter.filter_map(Result::ok).next().unwrap();
//     println!("Beat fetched.");
//     Ok(beat)
// }

pub fn fetch_beats() -> Result<Vec<Beat>> {
    println!("Fetching beats... \n");
    let conn = CONNECTION.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, title, bpm, musical_key, duration, artist, date_added, file_path, row_number FROM beats ORDER BY row_number")?;
    let beat_iter = stmt.query_map([], |row| {
        Ok(Beat {
            id: row.get(0)?,
            title: row.get(1)?,
            bpm: row.get(2)?,
            musical_key: row.get(3)?,
            duration: row.get(4)?,
            artist: row.get(5)?,
            date_added: row.get(6)?,
            file_path: row.get(7)?,
            row_number: row.get(8)?,
        })
    })?;

    let beats: Vec<Beat> = beat_iter.filter_map(Result::ok).collect();
    Ok(beats)
}


pub fn save_row_order(row_order: Vec<RowOrder>) -> Result<(), rusqlite::Error> {
    let conn = CONNECTION.lock().unwrap();
    let mut stmt = conn.prepare("UPDATE beats SET row_number = ?1 WHERE id = ?2")?;
    for row in row_order {
        stmt.execute(params![row.row_number, row.row_id])?;
    }
    Ok(())
}

pub fn add_beat(file_path: String) -> Result<(), Box<dyn std::error::Error>> {
    let path = Path::new(&file_path);
    
    // Extract title from file name
    let title = path.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Unknown")
        .to_string();

    // Open the media source
    let file = File::open(path)?;
    let mss = MediaSourceStream::new(Box::new(file), Default::default());

    // Create a hint to help the format registry guess what format reader is appropriate
    let hint = Hint::new();

    // Use the default options for metadata and format readers
    let meta_opts: MetadataOptions = Default::default();
    let fmt_opts: FormatOptions = Default::default();

    // Probe the media source
    let probed = symphonia::default::get_probe().format(&hint, mss, &fmt_opts, &meta_opts)?;

    // Get the instantiated format reader
    let format = probed.format;

    // Get metadata from the format reader
    let track = format.default_track().unwrap();
    let bpm = 0;
    let duration = track.codec_params.time_base
        .map(|tb| tb.calc_time(track.codec_params.n_frames.unwrap_or(0)))
        .map(|time| format_time(time))
        .unwrap_or("0:00".to_string());

    // Note: Depending on your metadata extraction needs, you may need to parse the artist and musical key differently.
    let musical_key = "Unknown".to_string();
    let artist = "Unknown".to_string();

    // Call commit_beat with extracted information
    commit_beat(file_path, title, bpm, musical_key, duration, artist)?;

    Ok(())
}

fn format_time(time: Time) -> String {
    let total_seconds = time.seconds;
    let minutes = total_seconds / 60;
    let seconds = total_seconds % 60;
    format!("{}:{:02}", minutes, seconds)
}

pub fn commit_beat(file_path: String, title: String, bpm: u32, musical_key: String, duration: String, artist: String) -> Result<(), rusqlite::Error> {
    let mut conn = CONNECTION.lock().unwrap();
    let tx = conn.transaction()?;

    // Get the current date in the format "MM/DD/YYYY"
    let current_date = Local::now().format("%m/%d/%Y").to_string();

    // Increment row_number for all existing beats
    tx.execute("UPDATE beats SET row_number = row_number + 1", [])?;

    // Insert the new beat at the top (row_number = 1)
    tx.execute(
        "INSERT INTO beats (title, bpm, musical_key, duration, artist, date_added, file_path, row_number) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1)",
        params![title, bpm, musical_key, duration, artist, current_date, file_path],
    )?;

    // Commit the transaction
    tx.commit()?;

    Ok(())
}



fn create_db_file() {
    println!("Creating database file...\n");
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
    println!("Checking if database file exists...\n");
    let db_path = &*DB_PATH;
    let exists = Path::new(&db_path).exists();
    exists
}



// Check if a database file exists, and create one if it does not.
fn get_db_path() -> String {
    println!("Getting database path...\n");
    let current_dir = env::current_dir().unwrap();
    let db_path = current_dir.join(".config/beatbank.db");
    let db_path_str = db_path.to_str().unwrap().to_string();
    println!("Database path: {}", db_path_str);
    db_path_str
}