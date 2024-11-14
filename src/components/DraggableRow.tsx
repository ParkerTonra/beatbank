import { Cell, flexRender, Row } from '@tanstack/react-table';
import { useDraggable, DragOverlay } from '@dnd-kit/core';
import { Beat } from '../bindings';
import GhostRow from './GhostDragRow';

interface DraggableRowProps {
  row: Row<Beat>;
  onRowSelection: (e: React.MouseEvent<HTMLTableRowElement>, row: Row<Beat>) => void;
}

function DraggableRow({ row, onRowSelection }: DraggableRowProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `beat-${row.original.id}`,
    data: {
      type: 'beat',
      beat: row.original,
    },
  });

  const handleClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
    // Prevent click from firing when dragging
    if (!isDragging) {
      console.log("Row clicked, calling onRowSelection"); // Debug log
      onRowSelection(e, row);
    }
  };

  return (
    <>
      <tr
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        onClick={handleClick}
        className={`cursor-pointer max-h-[50px] ${row.getIsSelected() ? 'bg-blue-900' : ''}`}
      >
        {row.getVisibleCells().map((cell: Cell<Beat, unknown>) => (
          <td key={cell.id} className="whitespace-nowrap h-[40px] mr-2"
              style={{
                width: cell.column.getSize(),
                maxWidth: cell.column.getSize(),
                overflowX: "hidden",
                paddingLeft: "4px",
              }}>
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
