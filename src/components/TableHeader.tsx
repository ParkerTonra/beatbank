// In TableHeader.tsx
import { useState } from "react";
import { Beat } from "../bindings";
import DropdownMenu from "./DropdownMenu";
import { Dialog } from "primereact/dialog";
import { MenuItem } from "primereact/menuitem";
import { Table } from "@tanstack/react-table";
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