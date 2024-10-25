import { useBeats } from "./../hooks/useBeats";
import { useAudio } from "./../hooks/useAudio";
import { useEffect } from "react";
import { Beat } from "../bindings";

interface BeatJockeyProps {
    isPlaying: boolean;
    currentBeat: Beat | null;
    togglePlayPause: () => void;
    stopBeat: () => void;
    audioRef: React.RefObject<HTMLAudioElement>;
  }



const BeatJockey: React.FC<BeatJockeyProps> = ({ isPlaying, currentBeat, togglePlayPause, stopBeat, audioRef }) => {
  

  return (
    <div>
      {currentBeat && (
        <div>
          <h2>Now Playing: {currentBeat.title}</h2>
          <button onClick={togglePlayPause}>{isPlaying ? "Pause" : "Play"}</button>
          <button onClick={stopBeat}>Stop</button>
        </div>
      )}
      <audio ref={audioRef} src={currentBeat?.file_path} controls />
    </div>
  );
};

export default BeatJockey;