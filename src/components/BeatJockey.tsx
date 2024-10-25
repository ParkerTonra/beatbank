import { useBeats } from "./../hooks/useBeats";
import { useAudio } from "./../hooks/useAudio";
import { useEffect } from "react";
import { Beat } from "../bindings";

interface BeatJockeyProps {
    isPlaying: boolean;
    currentBeat: Beat | null;
    togglePlayPause: () => void;
    stopBeat: () => void;
  }
  

const BeatJockey: React.FC<BeatJockeyProps> = ({ isPlaying, currentBeat, togglePlayPause, stopBeat }) => {
  

  return (
    <div>
      {currentBeat && (
        <div>
          <h2>Now Playing: {currentBeat.title}</h2>
          <button onClick={togglePlayPause}>{isPlaying ? "Pause" : "Play"}</button>
          <button onClick={stopBeat}>Stop</button>
        </div>
      )}
      <audio></audio>
    </div>
  );
};

export default BeatJockey;