// In TableHeader.tsx

import { Beat } from "../bindings";
import DropdownMenu from "./DropdownMenu";
import { Dialog } from "primereact/dialog";
import { MenuItem } from "primereact/menuitem";
import { Tooltip } from 'primereact/tooltip';

import { useTableContext } from "../contexts/TableContext";
import { useEffect, useState } from "react";

interface TableHeaderProps {
  selectedBeats: Beat[];
  setIsEditingBeat: (isEditing: boolean) => void;
  beatActionItems: MenuItem[];
  addBeatItems: MenuItem[];
  uploadStatus: string;
  showStatusDialog: boolean;
  setShowStatusDialog: (show: boolean) => void;
  uploadedFiles: string[];
  showEditColumnsDialog: boolean;
  setShowEditColumnsDialog: (show: boolean) => void;
  handleForceFirstTimeSetup: () => void;
  handleEditSet: () => void;
  isInCollection: boolean;
  handleDeleteSet: () => void;
}



export const TableHeader = ({
  selectedBeats,
  //@ts-ignore
  setIsEditingBeat,
  beatActionItems,
  addBeatItems,
  uploadStatus,
  showStatusDialog,
  setShowStatusDialog,
  uploadedFiles,
  showEditColumnsDialog,
  setShowEditColumnsDialog,
  handleForceFirstTimeSetup,
  handleEditSet,
  isInCollection,
  handleDeleteSet,
}: TableHeaderProps) => {
  const { tableInstance } = useTableContext();
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});

  // Update visibility state when columns change
  useEffect(() => {
    if (tableInstance && showEditColumnsDialog) {
      const visibilityState = tableInstance.getAllLeafColumns()
        .reduce((acc, column) => ({
          ...acc,
          [column.id]: column.getIsVisible()
        }), {});
      setColumnVisibility(visibilityState);
    }
  }, [tableInstance, showEditColumnsDialog]);

  const handleToggleAll = () => {
    if (!tableInstance) return;

    const newValue = !tableInstance.getIsAllColumnsVisible();
    tableInstance.toggleAllColumnsVisible();

    const newVisibility = tableInstance.getAllLeafColumns()
      .reduce((acc, column) => ({
        ...acc,
        [column.id]: newValue
      }), {});
    setColumnVisibility(newVisibility);
  };

  const handleToggleColumn = (column: any) => {
    const newValue = !column.getIsVisible();
    column.toggleVisibility();
    setColumnVisibility(prev => ({ ...prev, [column.id]: newValue }));
  };


  return (
    <div className="w-full flex">
      <button
        onClick={() => setShowEditColumnsDialog(true)}
        className="mr-2 mb-2"
      >
        <span className="pi pi-pencil mr-2" /> Edit Columns
      </button>
      {isInCollection && (

        <button
          onClick={handleEditSet}
          className="mr-2 mb-2"
        >
          <span className="pi pi-pencil mr-2" /> Edit Set
        </button>


      )}

      {isInCollection && (

        <button
          onClick={handleDeleteSet}
          className="mr-2 mb-2"
        >
          <span className="pi pi-trash mr-2" /> Delete Set
        </button>


      )}

      {tableInstance && (
        <Dialog
          header="Edit Columns"
          visible={showEditColumnsDialog}
          className="bg-blue-900 w-3/4 h-1/2 p-4 rounded-md border-2 border-black"
          modal
          onHide={() => setShowEditColumnsDialog(false)}
        >
          <div className="px-4 shadow rounded mt-4 text-sm grid grid-cols-2 gap-4">
            {/* Toggle All columns */}
            <div>
              <label className="inline-flex cursor-pointer">
                <input
                  type="checkbox"
                  checked={Object.values(columnVisibility).every(c => c)}
                  onChange={handleToggleAll}
                  className="w-4 mr-2"
                />
                <span className="font-bold mt-[-2px]">Toggle All</span>
              </label>
            </div>

            {/* Toggle by column*/}
            {tableInstance.getAllLeafColumns()
              .filter(column => column.id !== "drag-handle")
              .map(column => (
                <label key={column.id} className="inline-flex justify-start cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={columnVisibility[column.id] ?? false}
                    onChange={() => handleToggleColumn(column)}
                    className="w-4 mr-2"
                  />
                  <span className="capitalize mt-[-2px]">{column.id.split("_").join(" ")}</span>
                </label>
              ))}
          </div>
        </Dialog>
      )}

      <DropdownMenu
        className="mr-2"
        title="Add"
        icon="pi pi-plus"
        items={addBeatItems}
      />

      {selectedBeats.length > 0 && (
        <DropdownMenu
          title={`Beat Settings (${selectedBeats.length})`}
          icon="pi pi-cog"
          items={beatActionItems}
        />
      )}
      {/* Reset to default settings button.
      TODO: This should be obfuscated final build */}
      {/* <button onClick={handleForceFirstTimeSetup}
        className="h-8 w-8 mt-1.5 mx-4 flex items-center justify-center"
        data-pr-tooltip="Reset to default settings"
        data-pr-position="top"
      >
        <span className="pi pi-refresh" />
      </button> */}

      {uploadStatus && (
        <button
          onClick={() => setShowStatusDialog(true)}
          className="h-8 w-8 mt-1.5 mx-4 flex items-center justify-center"
          data-pr-tooltip="Upload Status"
          data-pr-position="top"
        >
          <span className="pi pi-info-circle" />
        </button>
      )}



      <Dialog
        header="Upload Status"
        visible={showStatusDialog}
        className="bg-blue-900 w-3/4 h-1/2 p-4 rounded-md border-2 border-black"
        modal
        onHide={() => setShowStatusDialog(false)}
      >
        <div className="overflow-y-auto my-4">
          <div>
            {uploadedFiles.length > 0 && (
              <div>
                <p className="font-bold">Added files:</p>
                <ul>
                  {uploadedFiles.map((file, index) => (
                    <li key={index}>{file}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="mt-2">
            {uploadStatus && (
              <div>
                <pre>{uploadStatus}</pre>
              </div>
            )}
          </div>
        </div>
      </Dialog>
      <Tooltip target="button" />
    </div>
  );
};

export default TableHeader;