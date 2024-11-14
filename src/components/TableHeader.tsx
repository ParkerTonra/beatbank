// In TableHeader.tsx
import { Beat } from "../bindings";
import { Row } from "@tanstack/react-table";
import DropdownMenu from "./DropdownMenu";
import { Dialog } from "primereact/dialog";
import { MenuItem } from "primereact/menuitem";

interface TableHeaderProps {
  selectedBeats: Beat[];
  setShowEditColumnsDialog: (isVisible: boolean) => void;
  setIsEditingBeat: (isEditing: boolean) => void;
  beatActionItems: MenuItem[];
  addBeatItems: MenuItem[];
  uploadStatus: string;
  showStatusDialog: boolean;
  setShowStatusDialog: (show: boolean) => void;
  uploadedFiles: string[];
}

export const TableHeader = ({
  selectedBeats,
  setShowEditColumnsDialog,
  beatActionItems,
  addBeatItems,
  uploadStatus,
  showStatusDialog,
  setShowStatusDialog,
  uploadedFiles,
}: TableHeaderProps) => {
  return (
    <div className="w-full flex">
      <button
        onClick={() => setShowEditColumnsDialog(true)}
        className="mr-2 mb-2"
      >
        <span className="pi pi-pencil mr-2" /> Edit Columns
      </button>
      
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