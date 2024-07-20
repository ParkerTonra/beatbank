import  { useEffect, useState, useMemo } from "react";
import {
  useReactTable,
  flexRender,
  getCoreRowModel,
  RowSelectionState,
  VisibilityState,
  Updater,
} from "@tanstack/react-table";
import { createColumnDef } from "../models/columns.tsx";
// db location: "C:\Users\parke\code\beatbank\beatbank-tauri\beatbank\src-tauri\.config\beatbank.db"
import { Beat, ColumnVis } from "./../bindings.ts";
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
import { invoke } from "@tauri-apps/api/tauri";

interface BeatTableProps {

  onBeatPlay: (beat: Beat) => void;
}



//function BeatTable({ setAudioSrc }) {
function BeatTable({  onBeatPlay }: BeatTableProps) {
  // table data state
  const [data, setData] = useState<Beat[]>([]);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVis>();
  // row selection state
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({}) 

  // key press state
  const [lastSelectedRow, setLastSelectedRow] = useState<string | null>(null);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  // react based on key press state:
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') setIsCtrlPressed(true);
      if (e.key === 'Shift') setIsShiftPressed(true);
    };
  
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') setIsCtrlPressed(false);
      if (e.key === 'Shift') setIsShiftPressed(false);
    };
  
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
  
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleRowSelection = (rowId: string) => {
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
        const rowIds = tableInstance.getRowModel().rows.map(row => row.id);
        const startIndex = rowIds.indexOf(lastSelectedRow);
        const endIndex = rowIds.indexOf(rowId);
        const [start, end] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
        for (let i = start; i <= end; i++) {
          newSelection[rowIds[i]] = true;
        }
        return newSelection;
      } else {
        // Select only the clicked row
        setLastSelectedRow(rowId);
        return { [rowId]: true };
      }
    });
  };

  //once the component renders, fetch the beats and column visibility from the database.
  useEffect(() => {
    async function fetchBeats() {
      try {
        const result = await invoke<string>("fetch_beats");
        const beats: Beat[] = JSON.parse(result);
        setData(beats);
      } catch (error) {
        console.error("Error fetching beats:", error);
      }
    }
    fetchBeats();
  }, []);

  useEffect(() => {
    async function fetchColumnVisibility() {
      try {
        const result = await invoke<string>("fetch_column_vis");
        let columnVis: ColumnVis = JSON.parse(result);
        
        if (columnVis && typeof columnVis === 'object' && '0' in columnVis) {
          columnVis = (columnVis as { 0: ColumnVis })[0];
        }
        
        // Ensure all expected properties are present
        const defaultVis: ColumnVis = {
          id: false,
          title: true,
          bpm: true,
          key: true,
          duration: true,
          artist: true,
          date_added: true,
          file_path: true,
        };
        
        setColumnVisibility({ ...defaultVis, ...columnVis });
      } catch (error) {
        console.error("Error fetching column visibility:", error);
      }
    }
    fetchColumnVisibility();
  }, []);

  const finalData = useMemo(() => data, [data]);
  const finalColumnDef = useMemo(() => createColumnDef(onBeatPlay), [onBeatPlay]);

  useEffect(() => {
    console.log("row selection:", rowSelection);
  }, [rowSelection]);

  const dataIds = useMemo(
    () => finalData?.map(({ id }) => id),
    [finalData]
  );

  console.log("columnVisibility:", columnVisibility);

  const handleColumnVisibilityChange = (updaterOrValue: Updater<VisibilityState>) => {
    setColumnVisibility((prev) => {
      if (typeof updaterOrValue === 'function') {
        const newState = updaterOrValue(prev as VisibilityState);
        return newState as ColumnVis;
      }
      return updaterOrValue as ColumnVis;
    });
  };

  const tableInstance = useReactTable<Beat>({
    columns: finalColumnDef,
    data: finalData,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: Record<string, any>) => row.id,
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
      columnVisibility,
    },
    enableRowSelection: true,
    enableMultiRowSelection: true,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    debugTable: true,
    debugHeaders: true,
    debugColumns: true,
  });

  

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setData((data) => {
        const oldIndex = dataIds.indexOf(active.id as number);
        const newIndex = dataIds.indexOf(over.id as number);
        return arrayMove(data, oldIndex, newIndex);
      });
    }
  }

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
              {headerGroup.headers.map((columnElement) => (
                <th className="border-b border-black text-left pr-7"
                  key={columnElement.id} colSpan={columnElement.colSpan}>
                  {flexRender(
                    columnElement.column.columnDef.header,
                    columnElement.getContext(),
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
              key={rowElement.id} 
              row={rowElement}
              onRowSelection={handleRowSelection} />
            ))}
          </SortableContext>
        </tbody>
      </table>
    </DndContext>
    <div className="flex px-4 border border-black shadow rounded mt-12">
  <div className="px-1 border-b border-black ">
    <label>
      <input className="border border-black flex-row"
        type="checkbox"
        checked={tableInstance.getIsAllColumnsVisible()}
        onChange={tableInstance.getToggleAllColumnsVisibilityHandler()}
      />{' '}
      Toggle All
    </label>
  </div>
  
  {tableInstance.getAllLeafColumns().map(column => {
    return (
      <div key={column.id} className="px-1">
        <label>
          <input
            type="checkbox"
            checked={column.getIsVisible()}
            onChange={column.getToggleVisibilityHandler()}
          />{' '}
          {column.id}
        </label>
      </div>
    )
  })}
</div>

    
</div>
    
  )
}

export default BeatTable;
