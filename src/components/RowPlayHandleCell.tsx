import React, { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/tauri";

interface Beat {
  id: string;
  file_path: string;
  title: string;
  // Add other properties as needed
}

interface RowPlayHandleCellProps {
  rowId: string;
  onPlay: (beat: Beat) => void;
}

const RowPlayHandleCell: React.FC<RowPlayHandleCellProps> = ({
  rowId,
  onPlay,
}) => {
  const playButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const playButton = playButtonRef.current;

    const handlePlayButtonClick = async () => {
      console.log("Play button clicked, rowId:", rowId);
      try {
        const beatJson = await invoke<string>("fetch_beat", { id: rowId });

        const beat: Beat = JSON.parse(beatJson);

        if (beat) {
          const filePath = beat.file_path;
          console.log("Beat file path:", filePath);

          try{ 
            invoke("play_beat", { filePath: filePath })
          }// Log the file_path property
          catch(e){
            console.error("Error playing beat:", e);
          }

          if (filePath) {
            onPlay(beat);
          } else {
            console.error("file_path is undefined on beat object");
          }
        }
      } catch (error) {
        console.error("Error playing audio:", error);
      }
    };

    if (playButton) {
      playButton.addEventListener("click", handlePlayButtonClick);
    }

    return () => {
      if (playButton) {
        playButton.removeEventListener("click", handlePlayButtonClick);
      }
    };
  }, [rowId, onPlay]);

  return (
    <button ref={playButtonRef} className="bg-transparent">
      ▶️
    </button>
  );
};

export default RowPlayHandleCell;
