import React, { useEffect, useState } from 'react';
import { Beat } from "../bindings";
import { Play, Pause, StopCircle, Volume2, VolumeX, File } from "lucide-react";
import { convertFileSrc } from '@tauri-apps/api/tauri';
import { invoke } from '@tauri-apps/api';

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
    const [isHovered, setIsHovered] = useState(false);

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

    const openFileLocation = async () => {
        await invoke('open_file_location', { path: currentBeat?.file_path });
    };
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 px-4 py-3" id="beat-jockey">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between gap-4">
                    {/* Track Info */}
                    <div className="w-1/4 min-w-[200px] flex items-center gap-3">
                        {currentBeat && (
                            <>
                                <div className="flex-1">
                                    <div
                                        className="relative overflow-hidden"
                                        onMouseEnter={() => setIsHovered(true)}
                                        onMouseLeave={() => setIsHovered(false)}
                                    >
                                        <h2
                                            className={`text-sm font-semibold text-white whitespace-nowrap ${isHovered ? 'animate-scroll-text' : 'truncate'
                                                }`}
                                            style={{
                                                animation: isHovered ? 'scroll 15s linear infinite' : 'none',
                                            }}
                                        >
                                            {currentBeat.title}
                                        </h2>
                                    </div>
                                    <div className="flex gap-2 text-sm text-slate-300 items-center">
                                        <span>{currentBeat.bpm?.toFixed(2)} BPM</span>
                                        <span>•</span>
                                        <span>Key: {currentBeat.musical_key}</span>
                                        <button
                                            onClick={openFileLocation}
                                            className="text-slate-400 hover:text-white transition p-2 mx-4"
                                            title="Open file location"
                                        >
                                            <File size={16} />
                                        </button>
                                    </div>
                                </div>

                            </>
                        )}
                    </div>

                    {/* Rest of the component remains the same */}
                    <div className="flex-1 max-w-2xl">
                        <div className="flex flex-col items-center gap-2">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={stopBeat}
                                    className="text-slate-400 hover:text-white transition"
                                    data-testID="stop-beat"
                                    tabIndex={0}
                                >
                                    <StopCircle size={20} />
                                </button>
                                <button
                                    onClick={togglePlayPause}
                                    className="text-white hover:scale-110 transition"
                                    data-testID="play-pause-beat"
                                    tabIndex={0}
                                >
                                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                                </button>
                            </div>

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
                                        focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500 focus:opacity-100
                                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                                        [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white
                                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                                    />
                                </div>
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="w-1/4 min-w-[150px] flex justify-end items-center gap-2">
                        <button
                          onClick={toggleMute}
                          className="text-slate-400 hover:text-white transition"
                          tabIndex={0}
                        >
                            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>
                        <input
                          tabIndex={0}
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={isMuted ? 0 : volume}
                          onChange={handleVolume}
                          className="w-24 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer
                            focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500 focus:opacity-100
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                            [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white
                            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                        />
                    </div>
                </div>
            </div>
            <audio
                ref={audioRef}
                src={currentBeat?.file_path ? convertFileSrc(currentBeat.file_path) : undefined}
                className="hidden"
            />

            {/* Add the scrolling animation styles */}
            <style>
                {`
          @keyframes scroll {
            0% {
              transform: translateX(0);
            }
            45% {
              transform: translateX(calc(-100% + 200px));
            }
            55% {
              transform: translateX(calc(-100% + 200px));
            }
            100% {
              transform: translateX(0);
            }
          }
          
          .animate-scroll-text:hover {
            animation: scroll 15s linear infinite;
          }
        `}
            </style>
        </div>
    );
};

export default BeatJockey;