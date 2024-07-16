import React from "react";
import {
  useReactTable,
  flexRender,
  getCoreRowModel,
} from "@tanstack/react-table";
import { columnDef } from "../models/columns.tsx";
import dataJSON from "./../beats/beats.json";
import { Beat } from "./../bindings.ts";
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

interface BeatTableProps {
  setAudioSrc: (src: string) => void;
}

//function BeatTable({ setAudioSrc }) {
function BeatTable({ setAudioSrc }: BeatTableProps) {
  const [data, setData] = React.useState(dataJSON);
  const finalData = React.useMemo(() => data, [data]);
  const finalColumnDef = React.useMemo(() => columnDef, [setAudioSrc]);

  const dataIds = React.useMemo(
    () => finalData?.map(({ id }) => id),
    [finalData]
  );

  const tableInstance = useReactTable<Beat>({
    columns: finalColumnDef,
    data: finalData,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: Record<string, any>) => row.id,
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

  return (
    <DndContext
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      <table>
        <thead>
          {tableInstance.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((columnElement) => (
                <th key={columnElement.id} colSpan={columnElement.colSpan}>
                  {flexRender(
                    columnElement.column.columnDef.header,
                    columnElement.getContext()
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
              <DraggableRow key={rowElement.id} row={rowElement} />
            ))}
          </SortableContext>
        </tbody>
      </table>
    </DndContext>
  );
}

export default BeatTable;
