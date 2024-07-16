import React, { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { convertFileSrc } from '@tauri-apps/api/tauri';

interface Beat {
  id: string;
  file_path: string;
  // Add other properties as needed
}

interface RowPlayHandleCellProps {
  rowId: string;
  setAudioSrc: (src: string) => void;
}

const RowPlayHandleCell: React.FC<RowPlayHandleCellProps> = ({ rowId, setAudioSrc }) => {
  const playButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const playButton = playButtonRef.current;

    const handlePlayButtonClick = async () => {
      console.log('Play button clicked, rowId:', rowId);
      try {
        const beats = await invoke<Beat[]>('get_beats_json');
        const matchingBeat = beats.find(beat => beat.id === rowId);
        if (matchingBeat) {
          const audioPath = await invoke<string>('get_audio_path', { filePath: matchingBeat.file_path });
          console.log('Audio path:', audioPath);
          const convertedPath = convertFileSrc(audioPath);
          setAudioSrc(convertedPath);
        } else {
          console.error('No matching audio file found for rowId:', rowId);
        }
      } catch (error) {
        console.error('Error playing audio:', error);
      }
    };

    if (playButton) {
      playButton.addEventListener('click', handlePlayButtonClick);
    }

    return () => {
      if (playButton) {
        playButton.removeEventListener('click', handlePlayButtonClick);
      }
    };
  }, [rowId, setAudioSrc]);

  return <button ref={playButtonRef}>▶️</button>;
};

export default RowPlayHandleCell;