use std::fs;
use rusqlite::{params, Connection, Result};
use std::env;
use std::path::Path;
use lazy_static::lazy_static;
use std::sync::Mutex;
use rusqlite::Error as SqliteError;


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
        SELECT b.id, b.title, b.bpm, b.key, b.duration, b.artist, b.date_added, b.file_path, b.row_number
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
            key: row.get(3)?,
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
            title TEXT NOT NULL,
            bpm INTEGER NOT NULL,
            key TEXT NOT NULL,
            duration TEXT NOT NULL,
            artist TEXT NOT NULL,
            date_added TEXT NOT NULL,
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
    println!("Fetching column visibility... \n");
    let conn = CONNECTION.lock().unwrap();
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

pub fn fetch_beat(id: String) -> Result<Beat> {
    println!("Fetching beat... \n");
    let conn = CONNECTION.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, title, bpm, key, duration, artist, date_added, file_path FROM beats WHERE id = ?")?;
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
            row_number: row.get(8)?,
        })
    })?;
    let beat: Beat = beat_iter.filter_map(Result::ok).next().unwrap();
    println!("Beat fetched.");
    Ok(beat)
}

pub fn fetch_beats() -> Result<Vec<Beat>> {
    println!("Fetching beats... \n");
    let conn = CONNECTION.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, title, bpm, key, duration, artist, date_added, file_path, row_number FROM beats ORDER BY row_number")?;
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

// fn normalize_path(path: &str) -> String {
//     Path::new(path)
//         .components()
//         .collect::<PathBuf>()
//         .to_str()
//         .unwrap()
//         .to_string()
// }
// pub fn get_audio_path(conn: &Connection, id: u32) -> Result<String> {
//     let mut stmt = conn.prepare("SELECT file_path FROM beats WHERE id = ?1")?;
//     let file_path: String = stmt.query_row([id], |row| row.get(0))?;
//     Ok(normalize_path(&file_path))
// }

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