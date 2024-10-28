import { useState, useMemo, useRef } from "react";
import {
  useReactTable,
  flexRender,
  getCoreRowModel,
  RowSelectionState,
  ColumnResizeMode,
  ColumnSizingState,
  OnChangeFn,
  VisibilityState, SortingState, Row, getSortedRowModel,
} from "@tanstack/react-table";
import { createColumnDef } from "./../models/ColumnDef.tsx";
import { Beat, ColumnVis, EditThisBeat } from "./../bindings.ts";
import {
  DragEndEvent,
} from "@dnd-kit/core";
import DraggableRow from "./DraggableRow.tsx";
import { invoke } from "@tauri-apps/api/tauri";
import EditBeatCard from "./EditBeatCard.tsx";

interface BeatTableProps {
  beats: Beat[];
  onBeatPlay: (beat: Beat) => void;
  isEditing: boolean;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  selectedBeat: Beat | null;
  setSelectedBeat: React.Dispatch<React.SetStateAction<Beat | null>>;
  fetchData?: () => void;
  fetchSetData?: (id: number) => void;
  onBeatsChange: (newBeats: Beat[]) => void;
  columnVisibility: ColumnVis;
  setColumnVisibility: (columnVis: ColumnVis) => void;
  saveRowOrder?: (beatsToSave: Beat[]) => Promise<void>; // TODO: make this mandatory and work for sets as well.
  onAddBeatToCollection: (beatId: number, collectionId: number) => void;
  onDragEnd: (event: DragEndEvent) => void;
}

function BeatTable({
  beats,
  onBeatPlay,
  isEditing,
  setIsEditing,
  selectedBeat,
  setSelectedBeat,
  fetchData,
  columnVisibility,
  setColumnVisibility,
}: BeatTableProps) {
  // row selection state
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [sorting, setSorting] = useState<SortingState>([])

  const finalColumnDef = useMemo(
    () => createColumnDef(onBeatPlay),
    []
  );

  const tableInstance = useReactTable<Beat>({
    columns: finalColumnDef,
    data: beats,
    getCoreRowModel: getCoreRowModel(),
    enableColumnResizing: true,
    columnResizeMode: "onChange" as ColumnResizeMode,
    onColumnSizingChange: setColumnSizing,
    getRowId: (row: Record<string, any>) => row.id,
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
      columnVisibility,
      columnSizing,
      sorting,
    },
    enableRowSelection: true,
    enableMultiRowSelection: true,
    onColumnVisibilityChange: setColumnVisibility as OnChangeFn<VisibilityState>,
    enableSorting: true,
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
  });

  const getRowRange = (rows: Row<Beat>[], currentIndex: number, selectedIndex: number): Row<Beat>[] => {
    const [firstIndex, lastIndex] = currentIndex < selectedIndex
      ? [currentIndex, selectedIndex]
      : [selectedIndex, currentIndex];
    return rows.slice(firstIndex, lastIndex + 1);
  };

  const lastSelectedIndex = useRef('');

  const onRowSelection = (e: React.MouseEvent<HTMLTableRowElement>, row): void => {
    if (e.shiftKey) {
      const { rows, rowsById } = tableInstance.getRowModel();
      const rowsToToggle = getRowRange(rows as Row<Beat>[], Number(row.index), Number(lastSelectedIndex.current));
      const isCellSelected = rowsById[row.id].getIsSelected();
      rowsToToggle.forEach((_row) => _row.toggleSelected(!isCellSelected));
    } else {
      row.toggleSelected();
    }

    lastSelectedIndex.current = row.index;
  }

  if (columnVisibility === undefined) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full w-full overflow-y-auto select-none">
      <table className="w-full mb-96">
        <thead>
          {tableInstance.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="relative pr-4 text-left border-gray-800 border-b-4 cursor-pointer mr-2"
                  style={{
                    width: header.getSize(),
                  }}
                  onClick={() => header.column.toggleSorting()}
                >
                  <div className="flex items-center truncate w-full justify-between">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    <div>
                      {header.column.getIsSorted() === "asc" ? (
                          <span className="pi pi-arrow-up text-xs" />
                        ) : header.column.getIsSorted() === "desc" ? (
                          <span className="pi pi-arrow-down text-xs" />
                        ) :
                        null
                      }
                    </div>
                  </div>

                  {header.column.getCanResize() && (
                    <div
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      className={`resizer ${header.column.getIsResizing() ? "isResizing" : ""
                        }`}
                    />
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {tableInstance.getRowModel().rows.map((rowElement) => (
            <DraggableRow
              table={tableInstance}
              row={rowElement as Row<Beat>}
              key={rowElement.id}
              onRowSelection={onRowSelection}
              isSelected={rowElement.getIsSelected()}
            />
          ))}
        </tbody>
      </table>
      <div className="flex px-4 border border-black shadow rounded mt-12 text-sm space-x-4 h-12">
        <div className="px-1 border-b border-black ">
          <label>
            <input
              className="border border-black flex-row"
              type="checkbox"
              checked={tableInstance.getIsAllColumnsVisible()}
              onChange={tableInstance.getToggleAllColumnsVisibilityHandler()}
            />{" "}
            Toggle All
          </label>
        </div>

        {tableInstance.getAllLeafColumns().map((column) => {
          return (
            <div key={column.id}>
              <label>
                <input
                  type="checkbox"
                  checked={column.getIsVisible()}
                  onChange={column.getToggleVisibilityHandler()}
                />{" "}
                {column.id}
              </label>
            </div>
          );
        })}
      </div>
      {isEditing && selectedBeat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <EditBeatCard
              beat={selectedBeat}
              onClose={() => {
                setIsEditing(false);
                setSelectedBeat(null);
                setRowSelection({});
              }}
              onSave={(updatedBeat: EditThisBeat) => {
                console.log("Saving updated beat...");
                setIsEditing(false);
                setSelectedBeat(null);
                setRowSelection({});

                invoke("update_beat", {
                  beat: updatedBeat
                })
                  .then((response) => {
                    console.log("Response from update_beat:", response);
                    console.log("Fetching updated data");
                    if (fetchData) fetchData();
                  })
                  .catch((error) => {
                    console.error("Error updating beat:", error);
                  });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}


export default BeatTable;