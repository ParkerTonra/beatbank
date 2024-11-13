import { Beat } from "../bindings.ts";
import { useBeats } from "../hooks/useBeats.tsx";
import { Row } from "@tanstack/react-table";
import DropdownMenu from "./DropdownMenu.tsx";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Dialog } from "primereact/dialog";
import { invoke } from "@tauri-apps/api/tauri";
import { FileEntry, readDir } from "@tauri-apps/api/fs";
import { message, open } from "@tauri-apps/api/dialog";
import { MenuItem } from "primereact/menuitem";

export const TableHeader = ({
  selectedBeats,
  setShowEditColumnsDialog,
  setIsEditingBeat,
  handleBeatDelete,
}: {
  selectedBeats: Row<Beat>[]
  setShowEditColumnsDialog: (isVisible: boolean) => void,
  setIsEditingBeat: (isEditing: boolean) => void,
  handleBeatDelete: (selectedBeats: Row<Beat>[]) => Promise<void>
}) => {
  const location = useLocation();
  const setId = Number(location.pathname.split("/").pop());
  const {
    fetchData,
    beatCollections,
  } = useBeats();
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const addBeatsToSet = async (collectionId: number) => {
    if (!selectedBeats.length) {
      message('Please select a beat first.', { title: 'Error', type: 'error' });
      return;
    }
    await invoke('add_beats_to_collection', { ids: selectedBeats.map(beat => beat.id), collectionId }).then(() => fetchData());
  };

  const removeBeatsFromSet = async () => {
    if (!selectedBeats.length) {
      message('Please select a beat first.', { title: 'Error', type: 'error' });
      return;
    }
    await invoke('remove_beats_from_collection', { ids: selectedBeats.map(beat => beat.id), collectionId: setId }).then(() => fetchData());
  };

  //opens up EditBeatCard as a popup
  async function handleEditBeat() {
    if (selectedBeats.length !== 1) {
      console.log("No beat selected");
      message("No beat selected");
      return;
    }
    setIsEditingBeat(true);
  }

  

  async function processEntries(entries: FileEntry[]) {
    const promises = [];
    const filePaths = [];
    for (const filepath of entries) {
      if (filepath.children) {
        await processEntries(filepath.children);
      } else {
        filePaths.push(filepath.path)
        const validExtensions = ['flac', 'wav', 'mp3', 'ogg', 'm4a', 'aac', 'aiff', 'wma'];
        const extension = (filepath.name || "").split(".").pop() || "";
        if (validExtensions.indexOf(extension) >= 0) {
          setUploadedFiles(Array.isArray(filePaths) ? filePaths : [filePaths]);
          promises.push(invoke('add_beat', {
            filePath: filepath.path
          }));
        }
      }
    }
    Promise.all(promises).then((values) => {
      fetchData();
      setUploadStatus(values.join("\n"));
    }, function(err) {
      console.error(err)
    });
  }

  const handleFolderUpload = async () => {
    try {
      const filePaths = await open({
        directory: true,
        recursive: true,
        multiple: true,
      });

      if (filePaths && filePaths.length > 0) {
        // Upload each file
        for (const filePath of (Array.isArray(filePaths) ? filePaths : [filePaths])) {
          const entries = await readDir(filePath);
          await processEntries(entries);
          fetchData();
        }
      }
    } catch (error) {
      console.error("Error selecting file:", error);
      setUploadStatus(`Error selecting file: ${error}`);
    }
  }

  const handleFileUpload = async () => {
    try {
      const filePaths = await open({
        directory: false,
        multiple: true,
        filters: [{
          name: 'Audio Files',
          extensions: ['flac', 'wav', 'mp3', 'ogg', 'm4a', 'aac', 'aiff', 'wma']
        }]
      });

      if (filePaths && filePaths.length > 0) {
        setUploadedFiles(Array.isArray(filePaths) ? filePaths : [filePaths]);

        // Upload each file
        for (const filePath of (Array.isArray(filePaths) ? filePaths : [filePaths])) {
          try {
            const result = await invoke('add_beat', {
              filePath: filePath,
            });
            fetchData();
            setUploadStatus(prevStatus => prevStatus + `\n${result}`);
          } catch (error) {
            console.error("Error adding beat:", error);
            setUploadStatus(prevStatus => prevStatus + `\nError uploading ${filePath}: ${error}`);
          }
        }
      }
    } catch (error) {
      console.error("Error selecting file:", error);
      setUploadStatus(`Error selecting file: ${error}`);
    }
  };

  const beatActionItems: MenuItem[] = [
    {
      label: "Add to set",
      icon: "pi pi-plus",
      items: beatCollections.map(set => ({ label: set.set_name, command: () => addBeatsToSet(set.id) }))
    },
    {
      label: "Delete",
      icon: "pi pi-trash",
      command: () => handleBeatDelete(selectedBeats),
    },
  ];

  if(selectedBeats.length === 1){
    beatActionItems.push(
      {
        label: "Edit",
        icon: "pi pi-pencil",
        command: handleEditBeat,
      }
    )
  }

  if (setId) {
    beatActionItems.push(
      {
        label: "Remove from set",
        icon: "pi pi-minus",
        command: removeBeatsFromSet,
      }
    )
  }

  const addBeatItems = [
    {
      label: "Add Beat",
      icon: "pi pi-plus",
      command: handleFileUpload,
    },
    {
      label: "Add Folder",
      icon: "pi pi-plus",
      command: handleFolderUpload,
    },
  ]

  return <div className="w-full flex">
    <button
      onClick={() => setShowEditColumnsDialog(true)}
      className="mr-2 mb-2"
    >
      <span className="pi pi-pencil mr-2" /> Edit Columns
    </button>
    <DropdownMenu className="mr-2" title="Add" icon="pi pi-plus" items={addBeatItems} />
    {selectedBeats.length > 0 && <DropdownMenu title={`Beat Settings (${selectedBeats.length})`} icon="pi pi-cog"  items={beatActionItems} />}

    {uploadStatus && <button onClick={() => setShowStatusDialog(true)} className="ml-2 absolute right-4 top-2"><span className="pi pi-info-circle"/></button>}
    <Dialog
      header="Upload Status"
      visible={showStatusDialog}
      className="bg-blue-900 w-3/4 h-1/2 p-4 rounded-md border-2 border-black"
      modal
      onHide={() => {setShowStatusDialog(false)}}
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
}