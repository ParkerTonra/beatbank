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
import { Dialog } from "primereact/dialog";
import { TableHeader } from "./TableHeader.tsx";

interface BeatTableProps {
  beats: Beat[];
  onBeatPlay: (beat: Beat) => void;
  selectedBeat: Beat | null;
  setSelectedBeat: React.Dispatch<React.SetStateAction<Beat | null>>;
  fetchData?: () => void;
  fetchSetData?: (id: number) => void;
  onBeatsChange: (newBeats: Beat[]) => void;
  columnVisibility: ColumnVis;
  setColumnVisibility: (columnVis: ColumnVis) => void;
  saveRowOrder: (beatsToSave: Beat[]) => Promise<void>;
  saveCollectionOrder: (collectionId: number, beatsToSave: Beat[]) => Promise<void>;
  //onAddBeatToCollection: (beatId: number, collectionId: number) => void;
  onDragEnd: (event: DragEndEvent) => void;
  handleBeatDelete: (selectedBeats: Row<Beat>[]) => Promise<void>
}

function BeatTable({
  beats,
  onBeatPlay,
  fetchData,
  columnVisibility,
  setColumnVisibility,
  handleBeatDelete,
}: BeatTableProps) {
  // row selection state
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [showEditColumnsDialog, setShowEditColumnsDialog] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([])

  const [isEditingBeat, setIsEditingBeat] = useState(false);

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
    <div className="w-full">
      <TableHeader
        setShowEditColumnsDialog={setShowEditColumnsDialog}
        selectedBeats={tableInstance.getSelectedRowModel().rows as Row<Beat>[]}
        setIsEditingBeat={setIsEditingBeat}
        handleBeatDelete={handleBeatDelete}
      />
      <div className="flex flex-col h-[calc(100%-250px)] w-full select-none overflow-x-auto">
        <table className="w-full mb-4 h-full">
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
                row={rowElement as Row<Beat>}
                key={rowElement.id}
                onRowSelection={onRowSelection}
                isSelected={rowElement.getIsSelected()}
              />
            ))}
          </tbody>
        </table>
        <Dialog
          header="Edit Columns"
          visible={showEditColumnsDialog}
          className="bg-blue-900 w-3/4 h-1/2 p-4 rounded-md border-2 border-black"
          modal
          onHide={() => setShowEditColumnsDialog(false)}
        >
          <div className="flex px-4 shadow rounded mt-12 text-sm space-x-4">
            <div className="px-1">
              <label>
                <input
                  className="flex-row"
                  type="checkbox"
                  checked={tableInstance.getIsAllColumnsVisible()}
                  onChange={tableInstance.getToggleAllColumnsVisibilityHandler()}
                />{" "}
                Toggle All
              </label>
            </div>

            {tableInstance.getAllLeafColumns().map((column) => {
              if (column.id === "drag-handle") {
                return;
              }
              return (
                <div key={column.id} className="mb-36">
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
        </Dialog>
        {isEditingBeat && tableInstance.getSelectedRowModel().rows.length === 1 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <EditBeatCard
                  beat={tableInstance.getSelectedRowModel().rows[0].original as Beat}
                  onClose={() => {
                    setIsEditingBeat(false);
                    setRowSelection({});
                  }}
                  onSave={(updatedBeat: EditThisBeat) => {
                    console.log("Saving updated beat...");
                    setIsEditingBeat(false);
                    setRowSelection({});

                    invoke("update_beat", {
                      beat: updatedBeat
                    })
                      .then((response) => {
                        console.log("Beat successfully updated:", response);
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
    </div>
  );
}


export default BeatTable;