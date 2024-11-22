// src-tauri/benches/audio_benchmarks.rs
use criterion::{criterion_group, criterion_main, Criterion, black_box};
use std::path::PathBuf;
use std::sync::Arc;
use dirs;

use beatbank_tauri::audio_analysis::analyze_audio;
use beatbank_tauri::CancellationToken;

// Access the benchmark function from where it's actually defined (src/benchmarks.rs)
use beatbank_tauri::benchmarks::run_detailed_benchmark;


const VALID_EXTENSIONS: [&str; 8] = ["flac", "wav", "mp3", "ogg", "m4a", "aac", "aiff", "wma"];

fn get_audio_files() -> Vec<String> {
    let downloads_dir = dirs::download_dir()
        .expect("Could not find Downloads directory");
    
    let mut audio_files = Vec::new();
    
    if let Ok(entries) = std::fs::read_dir(downloads_dir) {
        for entry in entries.flatten() {
            if let Some(extension) = entry.path()
                .extension()
                .and_then(|ext| ext.to_str())
                .map(|s| s.to_lowercase())
            {
                if VALID_EXTENSIONS.contains(&extension.as_str()) {
                    if let Some(path_str) = entry.path().to_str() {
                        audio_files.push(path_str.to_string());
                    }
                }
            }
        }
    }
    audio_files
}

pub fn benchmark_audio_analysis(c: &mut Criterion) {
    let test_files = get_audio_files();
    
    if test_files.is_empty() {
        println!("No audio files found in Downloads directory!");
        return;
    }

    println!("Found {} audio files to benchmark", test_files.len());
    let mut group = c.benchmark_group("audio_analysis");
    
    for file_path in test_files {
        let path_buf = PathBuf::from(&file_path);
        let file_name = path_buf
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown");
            
        println!("\nBenchmarking: {}", file_name);
        
        group.bench_function(format!("analyze_{}", file_name), |b| {
            b.iter(|| {
                let cancellation_token = Arc::new(CancellationToken::new());
                analyze_audio(black_box(&file_path), &cancellation_token)
            });
        });

        match run_detailed_benchmark(&file_path) {
            Ok(result) => {
                println!("\nDetailed results for {}:", file_name);
                println!("File path: {}", result.file_path);
                println!("File size: {:.2} MB", result.file_size as f64 / 1024.0 / 1024.0);
                println!("Load time: {:.2} ms", result.load_time_ms);
                println!("Analysis time: {:.2} ms", result.analysis_time_ms);
                println!("Total time: {:.2} ms", result.total_time_ms);
                println!("Samples processed: {}", result.samples_processed);
                println!("Sample rate: {} Hz", result.sample_rate);
                println!("Detected BPM: {}", result.detected_bpm.map_or("N/A".to_string(), |bpm| bpm.to_string()));
            },
            Err(e) => println!("Failed to benchmark {}: {}", file_name, e),
        }
    }
    group.finish();
}

criterion_group!(benches, benchmark_audio_analysis);
criterion_main!(benches);