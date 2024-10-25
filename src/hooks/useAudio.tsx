
import { useState, useRef, useEffect } from "react";
import { Beat } from "./../bindings";


export const useAudio = () => {
  // audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState<Beat | null>(null);
//TODO: implement queue 
//const [beatQueue, setBeatQueue] = useState<Beat[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (currentBeat && audioRef.current) {
      audioRef.current.src = currentBeat.file_path; // Assuming Beat has a file_path property
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [currentBeat]);

  const playBeat = (beat: Beat) => {
    console.log("playing beat:", beat);
    setCurrentBeat(beat);
  };

  const stopBeat = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return {
    isPlaying,
    currentBeat,
    playBeat,
    stopBeat,
    togglePlayPause,
    audioRef,
  };
};