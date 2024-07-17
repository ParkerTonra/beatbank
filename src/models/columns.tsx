import RowDragHandleCell from "components/RowDragHandleCell.tsx";
import RowPlayHandleCell from "components/RowPlayHandleCell.tsx";
import { ColumnDef } from "@tanstack/react-table";
import { Beat } from "../bindings";

interface Row {
  id: string;
  // TODO: Add other properties 
}

export const columnDef: ColumnDef<Beat>[] = [
  {
    accessorKey: "drag-handle",
    header: "Move",
    cell: ({ row }: { row: Row }) => <RowDragHandleCell rowId={row.id} />,
    size: 20,
    enableHiding: false,
  },
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "title",
    header: "Title",
  },
  {
    accessorKey: "bpm",
    header: "BPM",
  },
  {
    accessorKey: "key",
    header: "Key",
  },
  {
    accessorKey: "duration",
    header: "Duration",
  },
  {
    accessorKey: "artist",
    header: "Artist",
  },
  
  {
    accessorKey: "date_added",
    header: "Date Added",
  },
  {
    accessorKey: "file_path",
    header: "Location",
  },
  {
    accessorKey: "play-handle",
    header: "Play",
    cell: ({ row }) => <RowPlayHandleCell rowId={row.id.toString()} setAudioSrc={() => {}} />,
    size: 20,
  },
];
// function setAudioSrc(src: string): void {
//   // Implement the function here
//   // For example, you can set the audio source to the provided src
//   const audioElement = document.getElementById("audio") as HTMLAudioElement;
//   audioElement.src = src;
// }

