use rodio::{Decoder, OutputStream, Sink};
use std::fs::File;
use std::io::BufReader;
use std::thread;
use std::time::Duration;

pub fn play_beat(file_path: String) -> Result<(), String> {
    println!("Playing beat: {}", file_path);
    let (_stream, stream_handle) = OutputStream::try_default()
        .map_err(|e| format!("Failed to get default output stream: {}", e))?;

    let file = File::open(&file_path)
        .map_err(|e| format!("Failed to open file {}: {}", file_path, e))?;

    let source = Decoder::new(BufReader::new(file))
        .map_err(|e| format!("Failed to decode audio: {}", e))?;

    let sink = Sink::try_new(&stream_handle)
        .map_err(|e| format!("Failed to create sink: {}", e))?;

    sink.set_volume(0.2);
    sink.append(source);
    sink.play();

    // Keep the function running while audio is playing
    while !sink.empty() {
        thread::sleep(Duration::from_millis(100));
    }

    Ok(())
}