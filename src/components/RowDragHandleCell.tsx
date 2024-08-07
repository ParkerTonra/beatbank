import { useSortable } from '@dnd-kit/sortable';
import { useEffect } from 'react';

interface RowDragHandleCellProps {
  rowId: string;
}

export const RowDragHandleCell = ({ rowId }: RowDragHandleCellProps) => {
  const { attributes, listeners, setNodeRef } = useSortable({
    id: rowId,
  });

  useEffect(() => {
    console.log('RowDragHandleCell mounted for rowId:', rowId);
    console.log('Event listeners (initial):', listeners);

    return () => {
      console.log('RowDragHandleCell unmounted for rowId:', rowId);
    };
  }, [rowId, listeners]);

  return (
    <button ref={setNodeRef} {...attributes} {...listeners} className="bg-transparent playback-control">
      ≡
    </button>
  );
};

export default RowDragHandleCell;