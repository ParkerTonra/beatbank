import os
import sys
import json
import traceback
from typing import Optional, Tuple
import warnings
import numpy as np
import time

def log_time(name: str, start_time: float):
    """Log the elapsed time since start_time"""
    elapsed = time.time() - start_time
    print(f"TIMING - {name}: {elapsed:.2f} seconds", file=sys.stderr)
    sys.stderr.flush()
    return time.time()

# Start timing the initialization
total_start = time.time()
init_start = time.time()

print("Starting audio analyzer initialization...", file=sys.stderr)
sys.stderr.flush()

# Import pre-compiled functions
try:
    print("Attempting to load pre-compiled functions...", file=sys.stderr)
    sys.stderr.flush()
    compiler_start = time.time()
    from librosa_compiled import correlate_profiles, find_key_correlation
    log_time("Loading compiled functions", compiler_start)
    print("Successfully loaded pre-compiled functions!", file=sys.stderr)
    USE_COMPILED = True
except ImportError as e:
    print(f"Failed to load pre-compiled functions: {e}", file=sys.stderr)
    print("Using fallback functions", file=sys.stderr)
    USE_COMPILED = False
    def correlate_profiles(chroma_norm, profile_norm):
        return np.dot(chroma_norm, profile_norm)
    def find_key_correlation(chroma_norm, profiles):
        return np.array([np.dot(chroma_norm, profile) for profile in profiles])

sys.stderr.flush()

# Suppress all warnings
warnings.filterwarnings('ignore')

# Time numpy initialization
numpy_start = time.time()

# Configure parameters
SAMPLE_RATE = 22050
HOP_LENGTH = 512

# Pre-calculate key detection constants
KEY_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
MAJOR_PROFILE = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88], dtype=np.float32)
MINOR_PROFILE = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17], dtype=np.float32)

# Pre-calculate normalized profiles
MAJOR_PROFILES = np.array([np.roll(MAJOR_PROFILE, i) for i in range(12)], dtype=np.float32)
MINOR_PROFILES = np.array([np.roll(MINOR_PROFILE, i) for i in range(12)], dtype=np.float32)

for i in range(12):
    MAJOR_PROFILES[i] = MAJOR_PROFILES[i] / np.linalg.norm(MAJOR_PROFILES[i])
    MINOR_PROFILES[i] = MINOR_PROFILES[i] / np.linalg.norm(MINOR_PROFILES[i])

log_time("Numpy initialization and profile calculation", numpy_start)

# Import librosa components with timing
print("Loading minimal librosa components...", file=sys.stderr)
librosa_start = time.time()

print("Loading librosa core...", file=sys.stderr)
from librosa.core import load
log_time("Loading librosa core", librosa_start)

print("Loading librosa rhythm...", file=sys.stderr)
rhythm_start = time.time()
from librosa.feature.rhythm import tempo
log_time("Loading librosa rhythm", rhythm_start)

print("Loading librosa onset...", file=sys.stderr)
onset_start = time.time()
from librosa.onset import onset_strength
log_time("Loading librosa onset", onset_start)

print("Loading librosa feature...", file=sys.stderr)
feature_start = time.time()
from librosa.feature import chroma_cqt
log_time("Loading librosa feature", feature_start)

print("All librosa components loaded", file=sys.stderr)
log_time("Total librosa initialization", librosa_start)
sys.stderr.flush()

def find_key(chroma_norm: np.ndarray) -> Tuple[int, str]:
    """Find the musical key using pre-calculated profiles"""
    key_start = time.time()
    
    # Use pre-compiled correlation functions
    if USE_COMPILED:
        major_correlations = find_key_correlation(chroma_norm, MAJOR_PROFILES)
        minor_correlations = find_key_correlation(chroma_norm, MINOR_PROFILES)
    else:
        major_correlations = np.array([correlate_profiles(chroma_norm, profile) for profile in MAJOR_PROFILES])
        minor_correlations = np.array([correlate_profiles(chroma_norm, profile) for profile in MINOR_PROFILES])
    
    max_major = np.max(major_correlations)
    max_minor = np.max(minor_correlations)
    
    if max_major > max_minor:
        key_index = np.argmax(major_correlations)
        mode = 'Major'
    else:
        key_index = np.argmax(minor_correlations)
        mode = 'Minor'
    
    log_time("Key finding", key_start)    
    return key_index, mode

def analyze(file_path: str) -> Tuple[Optional[str], Optional[float]]:
    try:
        analysis_start = time.time()
        
        # Load audio with minimal parameters
        print(f"Loading audio file: {file_path}", file=sys.stderr)
        load_start = time.time()
        y, sr = load(
            file_path, 
            duration=30.0,
            sr=SAMPLE_RATE,
            mono=True,
            res_type='kaiser_fast'
        )
        log_time("Audio loading", load_start)
        print("Audio loaded, calculating tempo...", file=sys.stderr)

        # Get tempo
        tempo_start = time.time()
        onset_env = onset_strength(
            y=y, 
            sr=sr,
            hop_length=HOP_LENGTH,
            aggregate=np.median
        )
        tempo_value = tempo(
            onset_envelope=onset_env,
            sr=sr,
            hop_length=HOP_LENGTH
        )[0]
        log_time("Tempo calculation", tempo_start)
        print("Tempo calculated, analyzing key...", file=sys.stderr)

        # Get chromagram
        chroma_start = time.time()
        chroma = chroma_cqt(
            y=y, 
            sr=sr,
            hop_length=HOP_LENGTH,
            n_chroma=12,
            n_octaves=5,
            fmin=None
        )
        
        # Process chromagram
        chroma_mean = np.mean(chroma, axis=1)
        chroma_norm = chroma_mean / np.linalg.norm(chroma_mean)
        chroma_norm = chroma_norm.astype(np.float32)
        log_time("Chromagram calculation", chroma_start)

        # Find key
        key_index, mode = find_key(chroma_norm)
        key = f"{KEY_NAMES[key_index]} {mode}"
        
        print("Analysis complete", file=sys.stderr)
        log_time("Total analysis", analysis_start)
        return key, float(tempo_value)

    except Exception as e:
        print(f"Failed to analyze audio: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return None, None

def main():
    print("Audio analyzer service started", file=sys.stderr)
    print(f"Using compiled functions: {USE_COMPILED}", file=sys.stderr)
    log_time("Total initialization", total_start)
    sys.stderr.flush()
    
    while True:
        try:
            file_path = input().strip()
            if file_path == "EXIT":
                break
                
            key, tempo = analyze(file_path)
            if key is not None and tempo is not None:
                result = {"key": key, "tempo": tempo}
                result_json = json.dumps(result)
                print(result_json)
                print(f"Sent result: {result_json}", file=sys.stderr)
            else:
                error_msg = json.dumps({"error": "Error analyzing audio file"})
                print(error_msg)
                print(f"Sent error: {error_msg}", file=sys.stderr)
            sys.stdout.flush()
            sys.stderr.flush()
            
        except Exception as e:
            error_msg = json.dumps({"error": str(e)})
            print(error_msg)
            print(f"Exception: {str(e)}", file=sys.stderr)
            print(f"Traceback: {traceback.format_exc()}", file=sys.stderr)
            sys.stdout.flush()
            sys.stderr.flush()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        key, tempo = analyze(file_path)
        if key is not None and tempo is not None:
            print(f"{key},{tempo}")
        else:
            print("Error analyzing audio file")
    else:
        main()

