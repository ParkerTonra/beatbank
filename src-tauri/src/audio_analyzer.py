import os
import librosa
import sys
import numpy as np


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
        print(f"Failed to analyze audio: {e}")
        print("This error is from the audio_analyzer.py script")
        return None, None

if __name__ == "__main__":
    file_path = sys.argv[1]
    key, tempo = analyze(file_path)
    if key is not None and tempo is not None:
        print(f"{key},{tempo}")
    else:
        print("Error analyzing audio file")
