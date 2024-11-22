use criterion::{criterion_group, criterion_main, Criterion, black_box};
use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Instant;
use dirs;

use crate::CancellationToken;
use crate::audio_analysis::{analyze_audio, load_audio};

const VALID_EXTENSIONS: [&str; 8] = ["flac", "wav", "mp3", "ogg", "m4a", "aac", "aiff", "wma"];

#[derive(Debug, Serialize)]
pub struct BenchmarkResult {
    pub file_path: String,
    pub file_size: u64,
    pub load_time_ms: f64,
    pub analysis_time_ms: f64,
    pub total_time_ms: f64,
    pub samples_processed: usize,
    pub sample_rate: u32,
    pub detected_bpm: Option<f32>,
}

pub fn run_detailed_benchmark(file_path: &str) -> Result<BenchmarkResult, String> {
    let start = Instant::now();
    let cancellation_token = Arc::new(CancellationToken::new());
    
    if !PathBuf::from(file_path).exists() {
        return Err(format!("File not found: {}", file_path));
    }

    let file_size = fs::metadata(file_path)
        .map_err(|e| format!("Failed to get file size: {}", e))?
        .len();

    let load_start = Instant::now();
    let (audio_data, sample_rate) = load_audio(file_path, &cancellation_token)
        .map_err(|e| format!("Failed to load audio: {}", e))?;
    let load_time = load_start.elapsed();

    let analysis_start = Instant::now();
    let bpm_result = analyze_audio(file_path, &cancellation_token)
        .map_err(|e| format!("Failed to analyze audio: {:?}", e))?;
    let analysis_time = analysis_start.elapsed();

    Ok(BenchmarkResult {
        file_path: file_path.to_string(),
        file_size,
        load_time_ms: load_time.as_secs_f64() * 1000.0,
        analysis_time_ms: analysis_time.as_secs_f64() * 1000.0,
        total_time_ms: start.elapsed().as_secs_f64() * 1000.0,
        samples_processed: audio_data.len(),
        sample_rate,
        detected_bpm: Some(bpm_result.1),
    })
}

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

        // Also run and print detailed benchmark
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