// In TableHeader.tsx

import { Beat } from "../bindings";
import DropdownMenu from "./DropdownMenu";
import { Dialog } from "primereact/dialog";
import { MenuItem } from "primereact/menuitem";

import { useTableContext } from "../contexts/TableContext";

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
}: TableHeaderProps) => {
  const { tableInstance } = useTableContext();
  return (
    <div className="w-full flex">
      <button
        onClick={() => setShowEditColumnsDialog(true)}
        className="mr-2 mb-2"
      >
        <span className="pi pi-pencil mr-2" /> Edit Columns
      </button>
      {tableInstance && (
        <Dialog
            header="Edit Columns"
            visible={showEditColumnsDialog}
            className="bg-blue-900 w-3/4 h-1/2 p-4 rounded-md border-2 border-black"
            modal
            onHide={() => setShowEditColumnsDialog(false)}
        >
          <div className="px-4 shadow rounded mt-4 text-sm grid grid-cols-2 gap-4">
            <div>
              <label className="inline-flex cursor-pointer">
                <input
                  type="checkbox"
                  checked={tableInstance.getIsAllColumnsVisible()}
                  onChange={tableInstance.getToggleAllColumnsVisibilityHandler()}
                  className="w-4 mr-2"
                />
                <span className="font-bold mt-[-2px]">Toggle All</span>
              </label>
            </div>

            {tableInstance.getAllLeafColumns().map((column) => {
              if (column.id === "drag-handle") {
                return;
              }
              return (
                <label className="inline-flex justify-start cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={column.getIsVisible()}
                    onChange={column.getToggleVisibilityHandler()}
                    className="w-4 mr-2"
                  />{" "}
                  <span className="capitalize mt-[-2px]">{column.id.split("_").join(" ")}</span>
                </label>
              );
            })}
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

      {uploadStatus && (
        <button 
          onClick={() => setShowStatusDialog(true)} 
          className="ml-2 absolute right-4 top-2"
        >
          <span className="pi pi-info-circle"/>
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
    </div>
  );
};

export default TableHeader;