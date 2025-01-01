import RowDragHandleCell from "./../components/RowDragHandleCell.tsx";
import RowPlayHandleCell from "./../components/RowPlayHandleCell.tsx";
import { ColumnDef } from "@tanstack/react-table";
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
): ColumnDef<Beat>[] => {
  return [
    {
      accessorKey: "drag-handle",
      id: "drag-handle",
      header: () => (
        <div
          className="flex justify-center items-center w-full h-full py-1"
          tabIndex={0}
          data-pr-tooltip="Currently sorted? Click to return to manual order. Otherwise, drag handles to reorder tracks"
          data-pr-position="top"
        >
          <span className="pi pi-sort-alt" />
          <Tooltip target="[data-pr-tooltip]" />
        </div>
      ),
      sortUndefined: 1,
      accessorFn: (row) => row.row_order,
      cell: ({ row }: { row: Row }) => (
        <div className="flex items-center justify-center w-full h-full">
          <RowDragHandleCell row={row.original} />
        </div>
      ),
      enableHiding: false,
      enableResizing: false,
    },
    {
      accessorKey: "row_order",
      header: () => (
        <div className="flex justify-center items-center w-full">
          <span>#</span>
        </div>
      ),
      cell: ({ getValue }) => (
        <div className="flex items-center justify-center w-full h-full">
          {getValue() as number}
        </div>
      ),
      enableResizing: false,
    },
    {
      accessorKey: "id",
      header: "ID",
      enableResizing: false,
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ cell }) => <div className="truncate">{cell.getValue() as string}</div>,
    },
    {
      accessorKey: "bpm",
      id: "bpm",
      header: "BPM",
      cell: ({ cell }) => <div className="truncate">{formatBpm(cell.getValue() as number)}</div>,
    },
    {
      accessorKey: "musical_key",
      header: "Key",
    },
    {
      accessorKey: "duration",
      header: "Duration",
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
    },
    {
      accessorKey: "file_path",
      header: "Location",
    },
    {
      accessorKey: "genre",
      header: "Genre",
    },
    {
      accessorKey: "play-handle",
      header: () => (
        <div className="hidden">
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <RowPlayHandleCell
            rowId={row.original.id.toString()}
            onPlay={() => onBeatPlay(row.original)}
          />
        </div>
      ),
      enableResizing: false,
      enableSorting: false,
    }
  ] as ColumnDef<Beat>[]
};

