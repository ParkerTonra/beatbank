import { Play } from "lucide-react";

interface RowPlayHandleCellProps {
  rowId: string;
  onPlay: () => void;
}

interface KeyboardEvent {
  key: string;
}

const RowPlayHandleCell: React.FC<RowPlayHandleCellProps> = ({ onPlay }) => {
  const handlePlay = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      onPlay();
    }
  }

  return (
    <button onClick={onPlay} onKeyPress={handlePlay} className="bg-transparent z-30" tabIndex={0}>
      <Play size={18} color='darkgray' />
    </button>
  );
};

export default RowPlayHandleCell;
