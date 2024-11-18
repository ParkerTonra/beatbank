// DraggableRow.tsx
import { Cell, flexRender, Row } from '@tanstack/react-table';
import { useDraggable, DragOverlay } from '@dnd-kit/core';
import { Beat } from '../bindings';
import GhostRow from './GhostDragRow';

interface DraggableRowProps {
  row: Row<Beat>;
  onRowSelection: (e: React.MouseEvent<HTMLTableRowElement>, row: Row<Beat>) => void;
  selectedBeats: Beat[];
}

function DraggableRow({ row, onRowSelection, selectedBeats}: DraggableRowProps) {
  const isSelected = row.getIsSelected();
  const draggableId = isSelected && selectedBeats.length > 1
    ? `selected-beats-${selectedBeats.map(b => b.id).join('-')}`
    : `beat-${row.original.id}`;
 
  const dragData = isSelected ? {
    type: 'beats',
    beats: selectedBeats,
    count: selectedBeats.length,
    isMultiple: true
  } : {
    type: 'beat',
    beats: [row.original],
    count: 1,
    isMultiple: false
  };

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: draggableId,
    data: dragData,
  });

  const handleClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
    if (!isDragging) {
      onRowSelection(e, row);
    }
  };

  return (
  <>
    {isDragging && (
        <DragOverlay 
          dropAnimation={null}
          style={{
            cursor: 'grabbing',
          }}
        >
          <GhostRow 
            title={
              isSelected && selectedBeats.length > 1
                ? `${selectedBeats.length} items selected`
                : row.original.title
            }
          />
        </DragOverlay>
      )}
      <tr
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        onClick={handleClick}
        className={`border-b-2 border-gray-500 cursor-pointer max-h-[50px] ${row.getIsSelected() ? 'bg-blue-900' : ''}`}
      >
        {row.getVisibleCells().map((cell: Cell<Beat, unknown>) => (
          <td 
            key={cell.id} 
            className="whitespace-nowrap h-[40px] mr-2"
            style={{
              width: cell.column.getSize(),
              maxWidth: cell.column.getSize(),
              minWidth: cell.column.getSize(),
              overflowX: "hidden",
              paddingLeft: "4px",
            }}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        ))}
      </tr>
      
    </>
  );
}

export default DraggableRow;
