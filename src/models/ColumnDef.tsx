import RowDragHandleCell from "./../components/RowDragHandleCell.tsx";
import RowPlayHandleCell from "./../components/RowPlayHandleCell.tsx";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { Beat } from "../bindings";
import { format } from "date-fns";
import { Tooltip } from "primereact/tooltip";

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

const formatBpm = (bpm?: number): string => {
  if (bpm === undefined || bpm === null) return "0";
  return bpm.toFixed(2);
};

const formatDate = (datetime: string): string => {
  return format(new Date(datetime), "yyyy-MM-dd");
};

export const createColumnDef = (
  onBeatPlay: (beat: Beat) => void,
  setSorting: (sorting: SortingState) => void
): ColumnDef<Beat>[] => { return [
    {
      accessorKey: "drag-handle",
      id: "drag-handle",
      header: () => (
        <div className="flex justify-center items-center w-full h-full"
          tabIndex={0}
          data-pr-tooltip="Currently sorted? Click to return to manual order. Otherwise, drag handles to reorder tracks"
          data-pr-position="top"
        >
            <span className="pi pi-sort-alt" />
            <Tooltip target="[data-pr-tooltip]"   />
        </div>
      ),
      sortUndefined: 1,
      accessorFn: (row) => row.row_order,
      cell: ({ row }: { row: Row }) => (
        <div className="flex justify-center">
          <RowDragHandleCell row={row.original} />
        </div>
      ),
      enableHiding: false,
      enableResizing: false,
      maxSize: 50,
      minSize: 50,
      enableSorting: false,
    },
    {
      accessorKey: "row_order",
      header: () => (
        <div className="flex justify-center items-center w-full gap-1">
          <span>#</span>
        </div>
      ),
      size: 60,
      enableResizing: false,
    },
    {
      accessorKey: "id",
      header: "ID",
      maxSize: 60,
      minSize: 60,
      size: 60,
    },
    {
      accessorKey: "title",
      header: "Title",
      size: 450,
      cell: ({ cell }) => <div className="truncate">{cell.getValue() as string}</div>,
    },
    {
      accessorKey: "bpm",
      id: "bpm",
      header: "BPM",
      minSize: 80,
      size: 80,
      cell: ({ cell }) => <div className="truncate">{formatBpm(cell.getValue() as number)}</div>,
    },
    {
      accessorKey: "musical_key",
      header: "Key",
      minSize: 80,
      size: 80,
    },
    {
      accessorKey: "duration",
      header: "Duration",
      minSize: 100,
      size: 100,
      cell: ({ row }) => formatSecs(row.original.duration),
    },
    {
      accessorKey: "artist",
      header: "Artist",
      minSize: 100,
      size: 100,
    },
    {
      accessorKey: "date_created",
      header: "Date Added",
      minSize: 130,
      size: 130,
      cell: ({ cell }) => formatDate(cell.getValue() as string),
    },
    {
      accessorKey: "file_path",
      header: "Location",
    },
    {
      accessorKey: "genre",
      header: "Genre",
      minSize: 100,
      size: 100,
    },
    {
      accessorKey: "play-handle",
      header: "Play",
      cell: ({ row }) => (
        <div className="flex justify-center">
          <RowPlayHandleCell
            rowId={row.original.id.toString()}
            onPlay={() => onBeatPlay(row.original)}
          />
        </div>
      ),
      size: 70,
      enableResizing: false,
    }
  ] as ColumnDef<Beat>[]
};
// function setAudioSrc(src: string): void {
//   // Implement the function here
//   // For example, you can set the audio source to the provided src
//   const audioElement = document.getElementById("audio") as HTMLAudioElement;
//   audioElement.src = src;
// }

