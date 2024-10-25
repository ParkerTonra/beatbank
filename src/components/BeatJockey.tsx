import React, { useEffect, useState } from 'react';
import { Beat } from "../bindings";
import { Play, Pause, StopCircle, Volume2, VolumeX } from "lucide-react";

interface BeatJockeyProps {
  isPlaying: boolean;
  currentBeat: Beat | null;
  togglePlayPause: () => void;
  stopBeat: () => void;
  audioRef: React.RefObject<HTMLAudioElement>;
}

const BeatJockey: React.FC<BeatJockeyProps> = ({ 
  isPlaying, 
  currentBeat, 
  togglePlayPause, 
  stopBeat, 
  audioRef 
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
    };
  }, [audioRef]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Number(e.target.value);
    }
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      audioRef.current.volume = newMuted ? 0 : volume;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 px-4 py-3 z-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          {/* Track Info */}
          <div className="w-1/4 min-w-[200px]">
            {currentBeat && (
              <div className="text-white">
                <h2 className="text-sm font-semibold truncate">{currentBeat.title}</h2>
                <p className="text-xs text-slate-400 truncate">Now Playing</p>
              </div>
            )}
          </div>

          {/* Playback Controls */}
          <div className="flex-1 max-w-2xl">
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-4">
                <button 
                  onClick={stopBeat}
                  className="text-slate-400 hover:text-white transition"
                >
                  <StopCircle size={20} />
                </button>
                <button 
                  onClick={togglePlayPause}
                  className="text-white hover:scale-110 transition"
                >
                  {isPlaying ? <Pause size={32} /> : <Play size={32} />}
                </button>
              </div>

              {/* Progress Bar */}
              <div className="w-full flex items-center gap-2 text-xs text-slate-400">
                <span>{formatTime(currentTime)}</span>
                <div className="flex-1">
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer 
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 
                    [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white 
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                </div>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          {/* Volume Control */}
          <div className="w-1/4 min-w-[150px] flex justify-end items-center gap-2">
            <button 
              onClick={toggleMute}
              className="text-slate-400 hover:text-white transition"
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolume}
              className="w-24 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 
              [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white 
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
            />
          </div>
        </div>
      </div>
      <audio 
        ref={audioRef} 
        src={currentBeat?.file_path} 
        className="hidden"
      />
    </div>
  );
};

export default BeatJockey;