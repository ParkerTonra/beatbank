use aubio::{Smpl, Tempo, OnsetMode};
use std::fs::File;
use std::path::Path;
use symphonia::core::errors::Error;
use symphonia::core::codecs::DecoderOptions;
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;

pub fn analyze_audio(file_path: &str) -> Result<(String, f32), String> {
    println!("Starting analysis for file: {}", file_path);
    let (audio_data, sample_rate) = load_audio(file_path)?;
    let bpm = detect_bpm(audio_data, sample_rate)?;
    Ok((format!("{}", bpm), bpm))
}

fn detect_bpm(audio_data: Vec<Smpl>, sample_rate: u32) -> Result<f32, String> {
    println!("Detecting BPM...");
    
    // Configure parameters
    let buf_size = 1024; // FFT size
    let hop_size = buf_size / 4; // Smaller hop size for better accuracy
    
    // Create Tempo object
    let mut tempo = Tempo::new(OnsetMode::SpecFlux, buf_size, hop_size, sample_rate)
        .map_err(|e| e.to_string())?;

    // Process all frames to detect beats
    for frame in audio_data.chunks(hop_size) {
        // Pad the last frame if needed
        let mut padded_frame = vec![0.0; hop_size];
        padded_frame[..frame.len()].copy_from_slice(frame);
        
        // Process frame to detect beats
        let _ = tempo.do_result(&padded_frame);
    }

    // Get the calculated BPM after processing all frames
    let final_bpm = tempo.get_bpm();
    let confidence = tempo.get_confidence();
    
    println!("Analysis complete - BPM: {:.1} (confidence: {:.2})", final_bpm, confidence);
    
    if final_bpm > 0.0 {
        Ok(final_bpm)
    } else {
        Err("Failed to detect BPM".to_string())
    }
}

fn load_audio(file_path: &str) -> Result<(Vec<f32>, u32), String> {
    println!("Loading audio file...");
    // Create the media source and stream
    let file = File::open(Path::new(file_path)).map_err(|e| e.to_string())?;
    let mss = MediaSourceStream::new(Box::new(file), Default::default());

    // Create the probe and format
    let mut format = symphonia::default::get_probe()
        .format(
            &Hint::new(),
            mss,
            &FormatOptions::default(),
            &MetadataOptions::default()
        )
        .map_err(|e| e.to_string())?
        .format;

    // Get the default track
    let track = format.default_track().ok_or("No default track found")?;
    let sample_rate = track.codec_params.sample_rate.ok_or("No sample rate found")?;
    println!("Sample rate: {}", sample_rate);

    // Create a decoder
    let mut decoder = symphonia::default::get_codecs()
        .make(&track.codec_params, &DecoderOptions::default())
        .map_err(|e| e.to_string())?;
    println!("Decoder created");

    let mut audio_data = Vec::new();
    let mut sample_count = 0;

    loop {
        let packet = match format.next_packet() {
            Ok(packet) => packet,
            Err(Error::IoError(_)) => {
                println!("Reached end of stream");
                break;
            }
            Err(e) => {
                return Err(format!("Error reading packet: {}", e));
            }
        };

        // Decode the packet
        let decoded = match decoder.decode(&packet) {
            Ok(decoded) => decoded,
            Err(Error::IoError(_)) => {
                println!("Reached end of decoding");
                break;
            }
            Err(e) => {
                return Err(format!("Error decoding packet: {}", e));
            }
        };

        match decoded {
            symphonia::core::audio::AudioBufferRef::F32(buf) => {
                if let Some(channel_data) = buf.planes().planes().get(0) {
                    audio_data.extend_from_slice(channel_data);
                    sample_count += channel_data.len();
                    println!("Processed {} samples (total: {})", channel_data.len(), sample_count);
                }
            },
            symphonia::core::audio::AudioBufferRef::U8(buf) => {
                if let Some(channel_data) = buf.planes().planes().get(0) {
                    audio_data.extend(channel_data.iter().map(|&x| (x as f32 / 128.0) - 1.0));
                    sample_count += channel_data.len();
                    println!("Processed {} samples (total: {})", channel_data.len(), sample_count);
                }
            },
            symphonia::core::audio::AudioBufferRef::S16(buf) => {
                if let Some(channel_data) = buf.planes().planes().get(0) {
                    audio_data.extend(channel_data.iter().map(|&x| x as f32 / 32768.0));
                    sample_count += channel_data.len();
                    println!("Processed {} samples (total: {})", channel_data.len(), sample_count);
                }
            },
            symphonia::core::audio::AudioBufferRef::S32(buf) => {
                if let Some(channel_data) = buf.planes().planes().get(0) {
                    audio_data.extend(channel_data.iter().map(|&x| x as f32 / 2_147_483_648.0));
                    sample_count += channel_data.len();
                    println!("Processed {} samples (total: {})", channel_data.len(), sample_count);
                }
            },
            symphonia::core::audio::AudioBufferRef::U16(buf) => {
                if let Some(channel_data) = buf.planes().planes().get(0) {
                    audio_data.extend(channel_data.iter().map(|&x| (x as f32 / 32768.0) - 1.0));
                    sample_count += channel_data.len();
                    println!("Processed {} samples (total: {})", channel_data.len(), sample_count);
                }
            },
            symphonia::core::audio::AudioBufferRef::U32(buf) => {
                if let Some(channel_data) = buf.planes().planes().get(0) {
                    audio_data.extend(channel_data.iter().map(|&x| x as f32 / 2_147_483_648.0));
                    sample_count += channel_data.len();
                    println!("Processed {} samples (total: {})", channel_data.len(), sample_count);
                }
            },
            symphonia::core::audio::AudioBufferRef::S8(buf) => {
                if let Some(channel_data) = buf.planes().planes().get(0) {
                    audio_data.extend(channel_data.iter().map(|&x| x as f32 / 128.0));
                    sample_count += channel_data.len();
                    println!("Processed {} samples (total: {})", channel_data.len(), sample_count);
                }
            },
            _ => {
                return Err("Unsupported audio format".to_string());
            }
        }

        // Safety check
        if sample_count > 50_000_000 {
            return Err("Audio file too long or possible infinite loop detected".to_string());
        }
    }

    if audio_data.is_empty() {
        return Err("No audio data was decoded".to_string());
    }

    println!("Successfully loaded {} samples", audio_data.len());
    Ok((audio_data, sample_rate))
}