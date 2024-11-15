import RowDragHandleCell from "./../components/RowDragHandleCell.tsx";
import RowPlayHandleCell from "./../components/RowPlayHandleCell.tsx";
import { ColumnDef } from "@tanstack/react-table";
import { Beat } from "../bindings";
import { format } from "date-fns";

interface Row {
  id: string;
  original: Beat;
}
//format seconds, and integer into MM:SS format (string)
const formatSecs = (secs?: number): string => {
  if (secs === undefined || secs === null) return "0:00";
  const minutes = Math.floor(secs / 60);
  const seconds = secs % 60;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

const formatDate = (datetime: string): string => {
  return format(new Date(datetime), "yyyy-MM-dd");
};

export const createColumnDef = (onBeatPlay: (beat: Beat) => void): ColumnDef<Beat>[] => [
  {
    accessorKey: "drag-handle",
    header: "",
    cell: ({ row }: { row: Row }) => (
      <div>
        <RowDragHandleCell row={row.original} />
      </div>
      
    ),
    enableHiding: false,
    enableResizing: false,
    size: 30
  },
  {
    accessorKey: "id",
    header: "ID",
    maxSize: 30,
  },
  {
    accessorKey: "title",
    header: "Title",
    size: 250,
    cell: ({ cell }) => <div className="truncate">{cell.getValue() as string}</div>,
  },
  {
    accessorKey: "bpm",
    header: "BPM",
    size: 35,
  },
  {
    accessorKey: "musical_key",
    header: "Key",
    size: 50,
  },
  {
    accessorKey: "duration",
    header: "Duration",
    size: 20,
    cell: ({ row }) => formatSecs(row.original.duration),
  },
  {
    accessorKey: "artist",
    header: "Artist",
  },
  {
    accessorKey: "date_created",
    header: "Date Added",
    cell: ({ cell }) => formatDate(cell.getValue() as string),
    maxSize: 40
  },
  {
    accessorKey: "file_path",
    header: "Location",
  },
  {
    accessorKey: "play-handle",
    header: "Play",
    cell: ({ row }) => (
      <RowPlayHandleCell
        rowId={row.original.id.toString()}
        onPlay={() => onBeatPlay(row.original)}
      />
    ),
    size: 20,
  }
];
// function setAudioSrc(src: string): void {
//   // Implement the function here
//   // For example, you can set the audio source to the provided src
//   const audioElement = document.getElementById("audio") as HTMLAudioElement;
//   audioElement.src = src;
// }

