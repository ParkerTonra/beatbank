import os
import librosa
import sys
import json
import numpy as np
import traceback

def analyze(file_path):
    try:
        y, sr = librosa.load(file_path)
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
        chroma_mean = np.mean(chroma, axis=1)
        chroma_norm = chroma_mean / np.linalg.norm(chroma_mean)

        major_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
        minor_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])

        major_profile = major_profile / np.linalg.norm(major_profile)
        minor_profile = minor_profile / np.linalg.norm(minor_profile)

        correlation_major = []
        correlation_minor = []

        for i in range(12):
            major_profile_rotated = np.roll(major_profile, i)
            minor_profile_rotated = np.roll(minor_profile, i)
            corr_major = np.dot(chroma_norm, major_profile_rotated)
            corr_minor = np.dot(chroma_norm, minor_profile_rotated)
            correlation_major.append(corr_major)
            correlation_minor.append(corr_minor)

        max_major = np.argmax(correlation_major)
        max_minor = np.argmax(correlation_minor)

        if correlation_major[max_major] > correlation_minor[max_minor]:
            key_index = max_major
            mode = 'Major'
            confidence = correlation_major[max_major]
        else:
            key_index = max_minor
            mode = 'Minor'
            confidence = correlation_minor[max_minor]

        key_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        key = f"{key_names[key_index]} {mode}"
        return key, tempo

    except Exception as e:
        print(f"Failed to analyze audio: {e}", file=sys.stderr)
        print("This error is from the audio_analyzer.py script", file=sys.stderr)
        return None, None

def main():
    print("Audio analyzer service started", file=sys.stderr)
    sys.stderr.flush()
    
    while True:
        try:
            file_path = input().strip()
            print(f"Received file path: {file_path}", file=sys.stderr)
            sys.stderr.flush()
            
            if file_path == "EXIT":
                break
                
            key, tempo = analyze(file_path)
            if key is not None and tempo is not None:
                result = {
                    "key": key,
                    "tempo": float(tempo)  # Ensure tempo is a number
                }
                result_json = json.dumps(result)
                print(f"{result_json}")  # Print exact JSON
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