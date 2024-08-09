use once_cell::sync::Lazy;
use rodio::{Decoder, OutputStream, Sink};
use std::fs::File;
use std::io::BufReader;
use std::ops::Not;
use std::sync::mpsc::{channel, Receiver, Sender};
use std::thread;
use std::time::Duration;

static AUDIO_SENDER: Lazy<Sender<AudioMessage>> = Lazy::new(|| {
    let (sender, receiver) = channel();
    thread::spawn(move || audio_thread(receiver));
    sender
});

#[derive(Debug, Clone)]
enum AudioMessage {
    Play(String),
    Append(String),
    Pause,
    Resume,
    Stop,
    SetVolume(f32),
    GetState(Sender<AudioState>),
    Seek(f32),
}

#[derive(serde::Serialize, Debug, Clone)]
pub struct AudioState {
    is_playing: bool,
    pos: f32,
    duration: f32,
}

struct AudioManager {
    _stream: OutputStream,
    sink: Sink,
    state: AudioState,
}

impl AudioManager {
    fn new() -> Result<Self, String> {
        let (_stream, stream_handle) = OutputStream::try_default()
            .map_err(|e| format!("Failed to create audio output stream: {}", e))?;
        let sink = Sink::try_new(&stream_handle)
            .map_err(|e| format!("Failed to create audio sink: {}", e))?;
        Ok(AudioManager { _stream, sink, state: AudioState {
            is_playing: false,
            pos: 0.0,
            duration: 0.0,
        }})
    }

    fn play(&self, file_path: &str) -> Result<(), String> {
        let file = File::open(file_path)
            .map_err(|e| format!("Failed to open file {}: {}", file_path, e))?;
        let source = Decoder::new(BufReader::new(file))
            .map_err(|e| format!("Failed to decode audio: {}", e))?;
        self.sink.append(source);
        self.sink.play();
        Ok(())
    }

    fn append(&self, file_path: &str) -> Result<(), String> {
        let file = File::open(file_path)
            .map_err(|e| format!("Failed to open file {}: {}", file_path, e))?;
        let source = Decoder::new(BufReader::new(file))
            .map_err(|e| format!("Failed to decode audio: {}", e))?;
        self.sink.append(source);
        Ok(())
    }

    fn pause(&self) {
        self.sink.pause();
    }

    fn play_sink(&self) {
        self.sink.play();
    }

    fn stop(&self) {
        self.sink.clear();
    }

    fn set_volume(&self, volume: f32) {
        self.sink.set_volume(volume);
    }
    // get_pos of the current playing beat, duration, and is_playing
    fn get_state(&mut self) -> AudioState {
        self.state.pos = self.sink.get_pos().as_secs_f32();
        self.state.is_playing = self.sink.is_paused().not();
        self.state.clone()
    }
    fn seek(&self, seconds: f32) {
        let _ = self.sink.try_seek(Duration::from_secs_f32(seconds));
    }

}

fn audio_thread(receiver: Receiver<AudioMessage>) {
    let mut manager = match AudioManager::new() {
        Ok(m) => m,
        Err(e) => {
            eprintln!("Failed to create AudioManager: {}", e);
            return;
        }
    };

    for message in receiver {
        match message {
            AudioMessage::Play(path) => {
                if let Err(e) = manager.play(&path) {
                    eprintln!("Error playing audio: {}", e);
                }
            }
            AudioMessage::Append(path) => {
                if let Err(e) = manager.append(&path) {
                    eprintln!("Error appending audio: {}", e);
                }
            }
            AudioMessage::Pause => manager.pause(),
            AudioMessage::Resume => manager.play_sink(),
            AudioMessage::Stop => manager.stop(),
            AudioMessage::SetVolume(volume) => manager.set_volume(volume),
            AudioMessage::GetState(sender) => {
                let state: AudioState = manager.get_state();
                if sender.send(state).is_err() {
                    eprintln!("Failed to send audio state");
                }
            }
            AudioMessage::Seek(seconds) => {
                manager.seek(seconds);
            }
        }
    }
}

pub fn play_beat(file_path: String) -> Result<(), String> {
    AUDIO_SENDER
        .send(AudioMessage::Play(file_path))
        .map_err(|e| format!("Failed to send play message: {}", e))
}

pub fn append(file_path: String) -> Result<(), String> {
    AUDIO_SENDER
        .send(AudioMessage::Append(file_path))
        .map_err(|e| format!("Failed to send append message: {}", e))
}

pub fn pause() -> Result<(), String> {
    AUDIO_SENDER
        .send(AudioMessage::Pause)
        .map_err(|e| format!("Failed to send pause message: {}", e))
}

pub fn resume() -> Result<(), String> {
    AUDIO_SENDER
        .send(AudioMessage::Resume)
        .map_err(|e| format!("Failed to send resume message: {}", e))
}

pub fn stop() -> Result<(), String> {
    AUDIO_SENDER
        .send(AudioMessage::Stop)
        .map_err(|e| format!("Failed to send stop message: {}", e))
}

pub fn set_volume(volume: f32) -> Result<(), String> {
    AUDIO_SENDER
        .send(AudioMessage::SetVolume(volume))
        .map_err(|e| format!("Failed to send set_volume message: {}", e))
}

pub fn get_state() -> Result<AudioState, String> {
    let (sender, receiver) = channel();
    AUDIO_SENDER
        .send(AudioMessage::GetState(sender))
        .map_err(|e| format!("Failed to send get_state message: {}", e))?;
    receiver.recv().map_err(|e| format!("Failed to receive audio state: {}", e))
}

pub fn seek(seconds: f32) -> Result<(), String> {
    let (_sender, receiver) = channel();
    AUDIO_SENDER
        .send(AudioMessage::Seek(seconds))
        .map_err(|e| format!("Failed to send seek message: {}", e))?;
    receiver.recv().map_err(|e| format!("Failed to receive audio state: {}", e))
}