import React from 'react';
import { Play } from "lucide-react";

interface RowPlayHandleCellProps {
  rowId: string;
  onPlay: () => void;
}

const RowPlayHandleCell: React.FC<RowPlayHandleCellProps> = ({ onPlay }) => {
  const handlePlay = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      onPlay();
      e.preventDefault();
    }
  }

  return (
    <button onClick={handlePlay} onKeyDown={handlePlay} className="bg-transparent z-30" tabIndex={0}>
      <Play size={18} color='darkgray' />
    </button>
  );
};

export default RowPlayHandleCell;
