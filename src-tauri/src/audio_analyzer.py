import os
import librosa
import sys
import json
import numpy as np
import wave 
import traceback
import tempfile

# Pre-calculate these constants once
MAJOR_PROFILE = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MINOR_PROFILE = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
KEY_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

# Normalize profiles once
MAJOR_PROFILE_NORM = MAJOR_PROFILE / np.linalg.norm(MAJOR_PROFILE)
MINOR_PROFILE_NORM = MINOR_PROFILE / np.linalg.norm(MINOR_PROFILE)

# Pre-calculate rotated profiles
MAJOR_PROFILES_ROTATED = [np.roll(MAJOR_PROFILE_NORM, i) for i in range(12)]
MINOR_PROFILES_ROTATED = [np.roll(MINOR_PROFILE_NORM, i) for i in range(12)]

def warmup_librosa():
    """Perform intensive librosa operations once to trigger JIT compilation"""
    try:
        # Create a small synthetic audio signal
        y = np.zeros(22050, dtype=np.float32)
        sr = 22050
        
        # Warm up all the librosa functions we'll use
        librosa.beat.beat_track(y=y, sr=sr)
        librosa.feature.chroma_cqt(y=y, sr=sr)
        
        print("Librosa warmup completed", file=sys.stderr)
        sys.stderr.flush()
    except Exception as e:
        print(f"Warmup error: {e}", file=sys.stderr)
        sys.stderr.flush()

def analyze(file_path):
    try:
        y, sr = librosa.load(file_path)
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
        chroma_mean = np.mean(chroma, axis=1)
        chroma_norm = chroma_mean / np.linalg.norm(chroma_mean)

        # Use pre-calculated profiles
        correlation_major = [np.dot(chroma_norm, profile) for profile in MAJOR_PROFILES_ROTATED]
        correlation_minor = [np.dot(chroma_norm, profile) for profile in MINOR_PROFILES_ROTATED]

        max_major = np.argmax(correlation_major)
        max_minor = np.argmax(correlation_minor)

        if correlation_major[max_major] > correlation_minor[max_minor]:
            key_index = max_major
            mode = 'Major'
        else:
            key_index = max_minor
            mode = 'Minor'

        key = f"{KEY_NAMES[key_index]} {mode}"
        return key, tempo

    except Exception as e:
        print(f"Failed to analyze audio: {e}", file=sys.stderr)
        print("This error is from the audio_analyzer.py script", file=sys.stderr)
        return None, None

def main():
    print("Audio analyzer service started", file=sys.stderr)
    sys.stderr.flush()

    # Perform warmup operations
    warmup_librosa()
    
    while True:
        try:
            file_path = input().strip()
            if file_path == "EXIT":
                break
                
            key, tempo = analyze(file_path)
            if key is not None and tempo is not None:
                result = {
                    "key": key,
                    "tempo": float(tempo)
                }
                result_json = json.dumps(result)
                print(f"{result_json}")
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
        # Command line mode
        file_path = sys.argv[1]
        key, tempo = analyze(file_path)
        if key is not None and tempo is not None:
            print(f"{key},{tempo}")
        else:
            print("Error analyzing audio file")
    else:
        # Service mode
        main()