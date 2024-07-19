import { useSortable } from '@dnd-kit/sortable';

interface RowDragHandleCellProps {
  rowId: string;
}

export const RowDragHandleCell = ({ rowId }: RowDragHandleCellProps) => {
  const { attributes, listeners } = useSortable({
    id: rowId,
  });
  return (
    <button {...attributes} {...listeners}
    className="bg-transparent"
    >
      ≡
    </button>
  );
};

export default RowDragHandleCell;