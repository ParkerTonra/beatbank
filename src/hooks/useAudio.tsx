
import { useState, useRef, useEffect } from "react";
import { Beat } from "./../bindings";
import { convertFileSrc } from "@tauri-apps/api/tauri";


export const useAudio = () => {
  // audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState<Beat | null>(null);
//TODO: implement queue 
//const [beatQueue, setBeatQueue] = useState<Beat[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (currentBeat?.file_path && audioRef.current) {
      console.log('Original file path:', currentBeat.file_path);
      
      try {
        const audioUrl = convertFileSrc(currentBeat.file_path);
        console.log('Converted audio URL:', audioUrl);
        
        audioRef.current.src = audioUrl;
        console.log('Audio element src set to:', audioRef.current.src);
        
        audioRef.current.play()
          .then(() => {
            console.log('Audio playing successfully');
            setIsPlaying(true);
          })
          .catch(error => {
            console.error('Error playing audio:', error);
            if (audioRef.current) {
                console.log('Audio element error:', audioRef.current.error);
            }
            setIsPlaying(false);
          });
      } catch (error) {
        console.error('Error in convertFileSrc:', error);
        setIsPlaying(false);
      }
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