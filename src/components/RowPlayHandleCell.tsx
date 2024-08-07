import React from 'react';

interface RowPlayHandleCellProps {
  rowId: string;
  onPlay: () => void;
}

const RowPlayHandleCell: React.FC<RowPlayHandleCellProps> = ({  onPlay }) => {
  return (
    <button onClick={onPlay} className="bg-transparent">
      ▶️
    </button>
  );
};

export default RowPlayHandleCell;
