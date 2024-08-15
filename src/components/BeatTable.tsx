import { useEffect, useState, useMemo } from "react";
import {
  useReactTable,
  flexRender,
  getCoreRowModel,
  RowSelectionState,
  VisibilityState,
  Updater,
  ColumnResizeMode,
  ColumnSizingState,
} from "@tanstack/react-table";
import { createColumnDef } from "../models/columns.tsx";
import { Beat, ColumnVis } from "./../bindings.ts";
import { UniqueIdentifier } from "@dnd-kit/core";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import DraggableRow from "./DraggableRow";
import { useBeats } from "src/hooks/useBeats.tsx";
import { invoke } from "@tauri-apps/api/tauri";
import EditBeatCard from "./EditBeatCard.tsx";

interface BeatTableProps {
  onBeatPlay: (beat: Beat) => void;
  onBeatSelect: (beat: Beat) => void;
  isEditing: boolean;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  selectedBeat: Beat | null;
  setSelectedBeat: React.Dispatch<React.SetStateAction<Beat | null>>;
  onTriggerRefresh: () => void;
}

interface EditThisBeat {
  id: number;
  title: string;
  bpm: number;
  key: string;
  duration: string;
  artist: string;
}

function BeatTable({ onBeatPlay, onBeatSelect, isEditing, setIsEditing, selectedBeat, setSelectedBeat, onTriggerRefresh }: BeatTableProps) {
  // table data state
  const {
    beats,
    columnVisibility,
    //@ts-ignore
    loading,
    //@ts-ignore
    error,
    fetchData,
    setBeats,
    setColumnVisibility,
  } = useBeats();

  const [shouldRefresh, setShouldRefresh] = useState(false);

  // row selection state
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // key press state
  const [lastSelectedRow, setLastSelectedRow] = useState<string | null>(null);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});

  // react based on key press state:
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Control") setIsCtrlPressed(true);
      if (e.key === "Shift") setIsShiftPressed(true);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Control") setIsCtrlPressed(false);
      if (e.key === "Shift") setIsShiftPressed(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const handleRowSelection = (beat: Beat) => {
    const rowId = beat.id.toString();
    console.log("handleRowSelection:", rowId);
    setRowSelection((prev) => {
      if (isCtrlPressed) {
        // Toggle the selected row
        const newSelection = { ...prev };
        newSelection[rowId] = !newSelection[rowId];
        setLastSelectedRow(rowId);
        return newSelection;
      } else if (isShiftPressed && lastSelectedRow) {
        // Select all rows between last selected and current
        const newSelection = { ...prev };
        const rowIds = tableInstance.getRowModel().rows.map((row) => row.id);
        const startIndex = rowIds.indexOf(lastSelectedRow);
        const endIndex = rowIds.indexOf(rowId);
        const [start, end] =
          startIndex < endIndex
            ? [startIndex, endIndex]
            : [endIndex, startIndex];
        for (let i = start; i <= end; i++) {
          newSelection[rowIds[i]] = true;
        }
        return newSelection;
      } else {
        // Select only the clicked row
        setLastSelectedRow(rowId);
        // get the beat object from the rowId
        onBeatSelect(beat);
        return { [rowId]: true };
      }
    });
  };

  const finalData = useMemo(() => beats, [beats]);
  const finalColumnDef = useMemo(
    () => createColumnDef(onBeatPlay),
    [onBeatPlay]
  );

  // Fetch data when the component mounts
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const dataIds: UniqueIdentifier[] = useMemo(
    () => finalData?.map(({ id }) => id),
    [finalData]
  );

  //console.log("columnVisibility:", columnVisibility);

  const handleColumnVisibilityChange = (
    updaterOrValue: Updater<VisibilityState>
  ) => {
    console.log("handleColumnVisibilityChange:", updaterOrValue);
    setColumnVisibility((prev) => {
      if (typeof updaterOrValue === "function") {
        const newState = updaterOrValue(prev as VisibilityState);
        return newState as ColumnVis;
      }
      return updaterOrValue as ColumnVis;
    });
  };

  useEffect(() => {
    if (shouldRefresh) {
      onTriggerRefresh();
      setShouldRefresh(false);
    }
  }, [shouldRefresh, onTriggerRefresh]);

  const tableInstance = useReactTable<Beat>({
    columns: finalColumnDef,
    data: finalData,
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
    },
    enableRowSelection: true,
    enableMultiRowSelection: true,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    debugTable: true,
    debugHeaders: true,
    debugColumns: true,
  });

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setBeats((prevBeats) => {
        const oldIndex = prevBeats.findIndex((beat) => beat.id === active.id);
        const newIndex = prevBeats.findIndex((beat) => beat.id === over.id);
        const newBeats = arrayMove(prevBeats, oldIndex, newIndex);

        // Save the new order
        saveRowOrder(newBeats);

        return newBeats;
      });
    }
  };

  const saveRowOrder = async (beatsToSave: Beat[]) => {
    const rowOrder = beatsToSave.map((beat, index) => ({
      row_id: beat.id.toString(),
      row_number: index + 1, // Changed from row_order to row_number
    }));
    try {
      await invoke("save_row_order", { rowOrder }); // Changed from row_order to rowOrder
      console.log("Row order saved successfully");
    } catch (error) {
      console.error("Error saving row order:", error);
    }
  };

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  );

  if (columnVisibility === undefined) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full w-full overflow-y-auto">
      <DndContext
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
        sensors={sensors}
      >
        <table className="w-full mb-96">
          <thead>
            {tableInstance.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="relative pr-4 text-left border-gray-800 border-b-4" // Add text-left class
                    style={{
                      width: header.getSize(),
                    }}
                  >
                    <div className="flex items-center truncate">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
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
            <SortableContext
              items={dataIds}
              strategy={verticalListSortingStrategy}
            >
              {tableInstance.getRowModel().rows.map((rowElement) => (
                <DraggableRow
                  row={rowElement}
                  key={rowElement.id}
                  onRowSelection={handleRowSelection}
                />
              ))}
            </SortableContext>
          </tbody>
        </table>
      </DndContext>
      <div className="flex px-4 border border-black shadow rounded mt-12 text-sm space-x-4">
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
                setIsEditing(false);
                setSelectedBeat(null);
                setRowSelection({});

                invoke("update_beat", { beat: updatedBeat })
                  .then((response) => {
                    console.log("Response from update_beat:", response);
                    console.log("Fetching updated data");
                    fetchData();  // Directly call fetchData here
                    onTriggerRefresh();  // Still call this in case other components need to refresh
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
