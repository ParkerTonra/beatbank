import React, { CSSProperties } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { flexRender } from '@tanstack/react-table';
import RowDragHandleCell from './RowDragHandleCell';

const DraggableRow = ({ row }) => {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1 : 0,
    position: 'relative',
  };

  const handleDragStart = (event) => {
    event.dataTransfer.setData('text/plain', JSON.stringify(row.original));
    event.dataTransfer.setData('text/uri-list', row.original.file_path);
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      draggable
      onDragStart={handleDragStart}
    >
      {row.getVisibleCells().map(cell => (
        <td key={cell.id} style={{ width: cell.column.getSize() }}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  );
};

export default DraggableRow;
