import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { Beat } from "src/bindings";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";

interface BeatJockeyProps {
  playThisBeat: Beat | null;
}

const BeatJockey: React.FC<BeatJockeyProps> = ({ playThisBeat }) => {
  const [playbackState, setPlaybackState] = useState<{
    currentTime: number;
    isPlaying: boolean;
  }>({ currentTime: 0, isPlaying: false });
  const [beatQueue, setBeatQueue] = useState<Beat[]>([]);
  const [beatIndex, setBeatIndex] = useState<number>(0);
  const hasPlayedRef = useRef(false);

  const stopPlayback = useCallback(async () => {
    try {
      await invoke("stop_beat");
      setPlaybackState({ currentTime: 0, isPlaying: false });
    } catch (error) {
      console.error("Error stopping beat:", error);
    }
  }, []);

  const startPlayback = useCallback(
    async (beat: Beat) => {
      try {
        await stopPlayback();
        await invoke("play_beat", { filePath: beat.file_path });
        setPlaybackState({ currentTime: 0, isPlaying: true });
      } catch (error) {
        console.error("Error playing beat:", error);
      }
    },
    [stopPlayback]
  );

  useEffect(() => {
    if (
      playThisBeat &&
      (!hasPlayedRef.current ||
        beatQueue[beatIndex]?.file_path !== playThisBeat.file_path)
    ) {
      setBeatQueue([playThisBeat]);
      setBeatIndex(0);
      startPlayback(playThisBeat);
      hasPlayedRef.current = true;
    }
  }, [playThisBeat, startPlayback, beatIndex, beatQueue]);

  interface PlaybackStatus {
    pos: number;
    is_playing: boolean;
  }

  useEffect(() => {
    const updatePlaybackStatus = async () => {
      try {
        const statusString = await invoke("get_playback_state");
        const status = JSON.parse(statusString as string) as PlaybackStatus;

        setPlaybackState((prevState) => {
          // Only update state if there's a change
          if (
            prevState.currentTime !== status.pos ||
            prevState.isPlaying !== status.is_playing
          ) {
            return {
              currentTime: status.pos,
              isPlaying: status.is_playing,
            };
          }
          return prevState;
        });
      } catch (error) {
        console.error("Error updating playback status:", error);
      }
    };

    const interval = setInterval(updatePlaybackStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSliderChange = (value: number) => {
    setPlaybackState((prev) => ({ ...prev, currentTime: value }));
  };

  const handleSliderChangeComplete = async (value: number) => {
    try {
      await invoke("seek_audio", { seconds: value });
    } catch (error) {
      console.error("Error seeking audio:", error);
    }
  };

  const handlePlayPause = async () => {
    if (playbackState.isPlaying) {
      await invoke("pause_beat");
    } else if (beatQueue[beatIndex]) {
      await invoke("resume_beat");
    }
    setPlaybackState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const handleNext = async () => {
    if (beatIndex < beatQueue.length - 1) {
      const nextIndex = beatIndex + 1;
      setBeatIndex(nextIndex);
      await startPlayback(beatQueue[nextIndex]);
    }
  };

  const handlePrev = async () => {
    if (playbackState.currentTime > 3) {
      await invoke("restart_beat");
    } else if (beatIndex > 0) {
      const prevIndex = beatIndex - 1;
      setBeatIndex(prevIndex);
      await startPlayback(beatQueue[prevIndex]);
    }
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
      <div className="max-w-7xlmx-auto px-12">
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
          {/* Playback controls */}
          <div className="flex items-center space-x-2 sm:space-x-4 justify-start">
            <button
              onClick={handlePlayPause}
              className="p-1 sm:p-2 hover:bg-gray-700 rounded transition-colors"
            >
              {playbackState.isPlaying ? (
                <Pause size={20} />
              ) : (
                <Play size={20} />
              )}
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
          </div>
          {/* Playback info */}
          <div className="text-xs sm:text-sm flex flex-col items-end"></div>
          <div className="">
            <p className="sm:px-4 text-nowrap sm:ml-2 md:ml-4 lg:ml-2 xl:ml-24">
              {beatQueue[beatIndex]?.title || "No beat selected"}
            </p>
          </div>
          <p className="text-nowrap"> {beatQueue[beatIndex]?.bpm || ""}</p>
          <p> {beatQueue[beatIndex]?.key && "BPM"} </p>
          {/* Progress and volume controls */}
          <div className="flex-grow w-auto flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 px-2 lg:w-[242px]">
            <input
              className="w-full sm:w-64 md:w-48 lg:w-48 xl:w-[600px]"
              type="range"
              min={0}
              max={
                playThisBeat ? getDurationInSeconds(playThisBeat.duration) : 0
              }
              value={playbackState.currentTime}
              onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
              onMouseUp={(e) =>
                handleSliderChangeComplete(parseFloat(e.currentTarget.value))
              }
              onTouchEnd={(e) =>
                handleSliderChangeComplete(parseFloat(e.currentTarget.value))
              }
            />
            <p className="whitespace-nowrap sm:items-center sm:justify-center text-sm px-2 xl:mr-28">
              {playbackState.currentTime < 60
                ? Math.floor(playbackState.currentTime)
                : `${Math.floor(playbackState.currentTime / 60)}:${String(
                    Math.floor(playbackState.currentTime % 60)
                  ).padStart(2, "0")}`}{" "}
              / {beatQueue[beatIndex]?.duration || "0.00"}
            </p>
            <div className="flex items-center space-x-2 px-12 md:px-4 lg:px-4 xl:px-4">
              <Volume2 size={20} />
              <input
                className="w-52"
                type="range"
                min="0"
                max="100"
                defaultValue="50"
                onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BeatJockey;
