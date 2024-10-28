import { useDraggable, DragOverlay } from '@dnd-kit/core';
import { flexRender, Row } from '@tanstack/react-table';
import { Beat } from '../bindings';
import GhostRow from './GhostDragRow';

interface DraggableRowProps {
  row: Row<Beat>;
  onRowSelection: (beat: Beat) => void;
}

function DraggableRow({ row, onRowSelection }: DraggableRowProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `beat-${row.original.id}`,
    data: {
      type: 'beat',
      beat: row.original,
    },
  });

  return (
    <>
    {/* Render the actual row */}
    <tr
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onRowSelection(row.original)}
      className={`cursor-pointer ${row.getIsSelected() ? 'bg-gray-400' : ''}`}
    >
      {row.getVisibleCells().map((cell) => (
        <td key={cell.id} className="whitespace-nowrap">
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>

    {/* Render the DragOverlay outside of the tr */}
    {isDragging && (
      <DragOverlay dropAnimation={null}>
        <table className="w-full">
          <tbody>
            {/* GhostRow should return a tr element */}
            <GhostRow title={row.original.title} />
          </tbody>
        </table>
      </DragOverlay>
    )}
  </>
  );
}

export default DraggableRow;


