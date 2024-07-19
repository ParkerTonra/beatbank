import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";

const BeatJockey: React.FC = () => {
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [beatQueue, setBeatQueue] = useState<string[]>([
    "testbeat1",
    "testbeat2",
    "testbeat3",
    "testbeat4",
    "testbeat5",
    "testbeat6",
    "testbeat7",
    "testbeat8",
    "testbeat9",
    "testbeat10",
  ]);
  const [beatIndex, setBeatIndex] = useState<number>(0);

  // slider seek
  const handleSliderChange = (value: number) => {
    invoke("seek_audio", { seconds: value });
  };

  // play / pause
  const handlePlayPause = () => {
    if (isPlaying) {
      invoke("pauseAudio");
      setIsPlaying(false);
    } else {
      invoke("playAudio");
      setIsPlaying(true);
    }
  };

  const handleNext = () => {
    setBeatIndex((prevIndex) => {
      if (prevIndex < beatQueue.length - 1) {
        return prevIndex + 1;
      }
      return prevIndex;
    });
  };

  const handlePrev = () => {
    if (isPlaying) {
      invoke("restart_beat");
    } else {
      setBeatIndex((prevIndex) => {
        if (prevIndex > 0) {
          return prevIndex - 1;
        }
        return prevIndex;
      });
    }
  };

  // Function to update playback position and duration
  const updatePlaybackStatus = () => {
    // Call Rust function to get current playback position and duration
    invoke("getCurrentPlaybackStatus").then((status) => {
      setCurrentTime(status.currentTime);
      setDuration(status.duration);
      setIsPlaying(status.isPlaying);
    });
  };

  // Update playback status initially and on component mount
  useEffect(() => {
    updatePlaybackStatus();
  }, []);

  // Effect to change the beat when beatIndex changes
  useEffect(() => {
    // Here you would typically call a function to change the playing beat
    // For example: invoke('changeBeat', { beatName: beatQueue[beatIndex] });
    console.log(`Changing to beat: ${beatQueue[beatIndex]}`);
  }, [beatIndex, beatQueue]);

  return (
    <div className="flex-col fixed bottom-0 w-full bg-gray-800 ">
      <div className="flex items-center text-white p-4 space-x-4 w-full">
        <button onClick={handlePlayPause}>
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button onClick={handleNext}>Next</button>
        <button onClick={handlePrev}>Prev</button>
        <input
          className="w-1/3"
          id="seekSlider"
          type="range"
          min={0}
          max={duration}
          value={currentTime}
          onChange={(e) => handleSliderChange(parseInt(e.target.value))}
        />
        <input
          className="w-1/5"
          id="volumeSlider"
          type="range"
          min="0"
          max="100"
          defaultValue="0"
        />
      </div>
      <div className="flex w-full space-x-12">
        <p className="text-white">
          {currentTime.toFixed(2)} / {duration.toFixed(2)} seconds
        </p>
        <p className="text-white">
          currently playing: {beatQueue[beatIndex] || "No beats in queue"}{" "}
        </p>
      </div>
    </div>
  );
};

export default BeatJockey;
