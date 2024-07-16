import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { flexRender, Row, Cell } from '@tanstack/react-table';
import { Beat } from '../bindings';

const DraggableRow = ({ row }: { row: Row<Beat> }) => {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  });

  const style: any = {
    transform: CSS.Transform.toString(transform),
    transition: transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1 : 0,
    position: 'relative',
  };

  const handleDragStart = (event: any) => {
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
      {row.getVisibleCells().map((cell: Cell<Beat, unknown>) => (
        <td key={cell.id} style={{ width: cell.column.getSize() }}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  );
};

export default DraggableRow;
