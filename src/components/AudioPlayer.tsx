import React, { useRef, useEffect } from "react";
import { convertFileSrc } from '@tauri-apps/api/tauri';

interface AudioPlayerProps {
  audioSrc: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioSrc }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioSrc && audioRef.current) {
      console.log("Audio src:", audioSrc);
      const convertedSrc = convertFileSrc(audioSrc);
      audioRef.current.src = convertedSrc;
      audioRef.current.load();
      audioRef.current.play().catch((error: Error) => console.error("Playback failed:", error));
    }
  }, [audioSrc]);

  return (
    <div>
      {audioSrc && (
        <div>
          <h3>Audio Preview:</h3>
          <audio ref={audioRef} controls>
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;