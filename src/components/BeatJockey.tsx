import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { Beat } from "src/bindings";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Square,
  Volume2,
} from "lucide-react";

interface BeatJockeyProps {
  currentBeat: Beat | null;
}

const BeatJockey: React.FC<BeatJockeyProps> = ({ currentBeat }) => {
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [beatPlaying, setBeatPlaying] = useState<Beat | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [beatQueue, setBeatQueue] = useState<Beat[]>([]);
  const [beatIndex, setBeatIndex] = useState<number>(0);
  const [playbackState, setPlaybackState] = useState<{
    currentTime: number;
    isPlaying: boolean;
  }>({ currentTime: 0, isPlaying: false });

  // debugging
  useEffect(() => {
    console.log("currentTime updated:", currentTime);
  }, [currentTime]);

  useEffect(() => {
    console.log("isPlaying updated:", isPlaying);
  }, [isPlaying]);

  useEffect(() => {
    console.log("currentBeat updated:", currentBeat);
  }, [currentBeat]);

  useEffect(() => {
    if (currentBeat) {
      console.log("Current beat changed:", currentBeat);
      setBeatQueue([currentBeat]);
      setBeatIndex(0);

      invoke("play_beat", { filePath: currentBeat.file_path })
        .then(() => {
          setPlaybackState((prev) => ({ ...prev, isPlaying: true, currentTime: 0 }));
          setIsPlaying(true);
        })
        .catch((error) => {
          console.error("Error playing beat:", error);
        });
      setBeatPlaying(currentBeat);
    }
  }, [currentBeat]);

  interface PlaybackStatus {
    pos: number;
    is_playing: boolean;
  }

  useEffect(() => {
    const updatePlaybackStatus = async () => {
      try {
        const statusString = await invoke("get_playback_state");
        console.log("Playback status string:", statusString);

        // Parse the JSON string into an object
        const status = JSON.parse(statusString) as PlaybackStatus;
        console.log("Parsed playback status:", status);
        console.log("pos:", status.pos);

        // Check if pos is defined
        if (typeof status.pos !== "undefined") {
          setPlaybackState((prev) => ({
            ...prev,
            currentTime: status.pos,
            isPlaying: status.is_playing,
          }));
          setCurrentTime(status.pos);
          setIsPlaying(status.is_playing);
        } else {
          console.error("pos is undefined");
        }
      } catch (error) {
        console.error("Error updating playback status:", error);
      }
    };

    const interval = setInterval(updatePlaybackStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSliderChange = async (value: number) => {
    setCurrentTime(value);
    try {
      await invoke("seek_audio", { seconds: value });
      setPlaybackState((prev) => ({ ...prev, currentTime: value }));
    } catch (error) {
      console.error("Error seeking audio:", error);
    }
  };

  const handlePlayPause = async () => {
    if (isPlaying) {
      await invoke("pause_beat");
    } else if (beatQueue[beatIndex]) {
      await invoke("play_beat", { filePath: beatQueue[beatIndex].file_path });
    }
    setPlaybackState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
    setIsPlaying(!isPlaying);
  };

  const handleNext = async () => {
    if (beatIndex < beatQueue.length - 1) {
      const nextIndex = beatIndex + 1;
      setBeatIndex(nextIndex);
      await invoke("play_beat", { filePath: beatQueue[nextIndex].file_path });
      setIsPlaying(true);
    }
  };

  const handlePrev = async () => {
    if (currentTime > 3) {
      await invoke("restart_beat");
    } else if (beatIndex > 0) {
      const prevIndex = beatIndex - 1;
      setBeatIndex(prevIndex);
      await invoke("play_beat", { filePath: beatQueue[prevIndex].file_path });
      setIsPlaying(true);
    }
  };

  const handleStop = async () => {
    await invoke("stop_beat");
    setIsPlaying(false);
  };

  const handleVolumeChange = (value: number) => {
    invoke("set_volume", { volume: value / 100 });
  };

  const getDurationInSeconds = (duration: string) => {
    const [minutes, seconds] = duration.split(":").map(Number);
    return minutes * 60 + seconds;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-2 sm:p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 sm:space-x-4">
          {/* Playback controls */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={handlePlayPause}
              className="p-1 sm:p-2 hover:bg-gray-700 rounded transition-colors"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button
              onClick={handlePrev}
              className="p-1 sm:p-2 hover:bg-gray-700 rounded transition-colors"
            >
              <SkipBack size={20} />
            </button>
            <button
              onClick={handleNext}
              className="p-1 sm:p-2 hover:bg-gray-700 rounded transition-colors"
            >
              <SkipForward size={20} />
            </button>
            <button
              onClick={handleStop}
              className="p-1 sm:p-2 hover:bg-gray-700 rounded transition-colors"
            >
              <Square size={20} />
            </button>
          </div>

          {/* Progress and volume controls */}
          <div className="flex-grow w-full sm:w-auto flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <input
              className="w-full sm:w-64 md:w-96"
              type="range"
              min={0}
              max={currentBeat ? getDurationInSeconds(currentBeat.duration) : 0}
              value={currentTime}
              onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
            />
            <div className="flex items-center space-x-2">
              <Volume2 size={20} />
              <input
                className="w-20 sm:w-24"
                type="range"
                min="0"
                max="100"
                defaultValue="50"
                onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
              />
            </div>
          </div>

          {/* Playback info */}
          <div className="text-xs sm:text-sm flex flex-col items-end">
            <p className="whitespace-nowrap sm:items-center sm:justify-center">
              {playbackState.currentTime < 60
                ? Math.floor(playbackState.currentTime)
                : `${Math.floor(playbackState.currentTime / 60)}:${String(Math.floor(playbackState.currentTime % 60)).padStart(2, "0")}`}{" "}
              / {beatPlaying?.duration || "0.00"}
            </p>
            <p className="truncate max-w-[150px] sm:max-w-[200px] md:max-w-[300px]">
              Now playing: {beatPlaying?.title || "No beat selected"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BeatJockey;
