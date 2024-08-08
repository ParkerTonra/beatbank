import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { flexRender, Row, Cell } from "@tanstack/react-table";
import { Beat } from "../bindings";

interface DraggableRowProps {
  row: Row<Beat>;
  onRowSelection: (rowId: string) => void;
}

function DraggableRow({ row, onRowSelection}: DraggableRowProps) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  });

  const style: any = {
    transform: CSS.Transform.toString(transform),
    transition: transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1 : 0,
    position: "relative",
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      draggable
      onDragOver={(e) => e.preventDefault()}
      onClick={() => onRowSelection(row.id)}
      className={row.getIsSelected() ? "bg-blue-100" : ""}
      data-row-id={row.original.id}
    >
      {row.getVisibleCells().map((cell: Cell<Beat, unknown>) => (
        <td key={cell.id} style={{ width: cell.column.getSize() }}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  );
}

export default DraggableRow;
