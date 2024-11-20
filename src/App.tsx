import { useEffect, useState } from "react";
import { Beat, CollOrder, RowOrder } from "./bindings";
import Sidebar from "./components/Sidebar";
import "./App.css";
import "./Main.css";
import 'primeicons/primeicons.css';
import { SplashScreen } from "./components/SplashScreen";
import BeatTable from "./components/BeatTable";
import 'primereact/resources/themes/lara-dark-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import { useBeats } from "./hooks/useBeats";
import { loadSettings, getSettingsPath } from './store';
import { DndContext, DragEndEvent, DragStartEvent, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { invoke } from "@tauri-apps/api/tauri";
import { message } from "@tauri-apps/api/dialog";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { HashRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import { listen } from '@tauri-apps/api/event';
import BeatJockey from "./components/BeatJockey";
import { useAudio } from "./hooks/useAudio";
import { FileEntry, readDir } from "@tauri-apps/api/fs";
import TableHeader from "./components/TableHeader";


import { Table } from "@tanstack/react-table";
import { open, OpenDialogOptions } from "@tauri-apps/api/dialog";
import { MenuItem } from "primereact/menuitem";
import { TableContext } from "./contexts/TableContext";
import BeatCollectionComponent from "./components/BeatCollection";
import BeatbankLogo from './assets/BeatbankLogo.png';


function AppContainer() {
  // state
  const [showSplashScreen, setShowSplashScreen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedBeats, setSelectedBeats] = useState<Beat[]>([]);
  // todo: theme
  //@ts-ignore
  const [theme, setTheme] = useState<string>('light');
  const [settingsPath, setSettingsPath] = useState<string>('');
  const [isFileDragging, setIsFileDragging] = useState(false);
  const [showEditColumnsDialog, setShowEditColumnsDialog] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [tableInstance, setTableInstance] = useState<Table<Beat> | null>(null);

  // react router hooks
  const location = useLocation();
  const collectionIdMatch = location.pathname.match(/\/collection\/(\d+)/);
  const isInCollection = Boolean(collectionIdMatch);
  const collectionId = collectionIdMatch ? parseInt(collectionIdMatch[1], 10) : null;

  const { isPlaying, currentBeat, playBeat, stopBeat, togglePlayPause, audioRef } = useAudio();

  const {
    beats,
    beatCollections,
    fetchData,
    columnVisibility,
    error,
    setBeats,
    setColumnVisibility,
    fetchSetData,
    collectionBeats,
    setCollectionBeats
  } = useBeats();

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor)
  );

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      console.log("loading settings, path:", settingsPath);
      const settings = await loadSettings();
      setTheme(settings.theme);

      const path = await getSettingsPath();
      setSettingsPath(path);
    };

    fetchSettings();
  }, []);

  useEffect(() => {
    if (collectionId) {
      fetchSetData(collectionId);
    }
  }, [collectionId]);

  //TODO: consolidate
  const folderDialogOptions: OpenDialogOptions = {
    multiple: true,
    directory: true,
  } as OpenDialogOptions;


  const handleFolderUpload = async () => {
    try {
      const selected = await open(folderDialogOptions);

      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        for (const filePath of paths) {
          const entries = await readDir(filePath);
          await processEntries(entries);
          fetchData();
        }
      }
    } catch (error) {
      console.error("Error selecting file:", error);
      setUploadStatus(`Error selecting file: ${error}`);
    }
  };


  

  useEffect(() => {
    const unlistenDrop = listen('tauri://file-drop', async (event) => {
      console.log('File dropped:', event.payload); // Logs the file paths or dropped items

      if (Array.isArray(event.payload)) {
        for (const filePath of event.payload) {
          try {
            await invoke('add_beat', { filePath }); // Process the file
          } catch (error) {
            console.error(`Error processing file ${filePath}:`, error);
          }
        }
        fetchData(); // Refresh the data after file drop processing
      }
      setIsFileDragging(false); // Reset dragging state
    });

    const unlistenHover = listen('tauri://file-drop-hover', () => {
      setIsFileDragging(true); // Show file dragging UI
    });

    const unlistenCancelled = listen('tauri://file-drop-cancelled', () => {
      setIsFileDragging(false); // Hide file dragging UI when cancelled
    });

    return () => {
      unlistenDrop.then((dispose) => dispose());
      unlistenHover.then((dispose) => dispose());
      unlistenCancelled.then((dispose) => dispose());
    };
  }, []);


  const addBeatsToSet = async (collectionId: number) => {
    if (!selectedBeats.length) {
      message('Please select a beat first.', { title: 'Error', type: 'error' });
      return;
    }
    const beatsSelectedIds = selectedBeats.map(beat => beat.id);
    beatsSelectedIds.forEach(async (beatId) => {
      handleAddToCollection(collectionId, beatId);
    });
  };

  const removeBeatsFromSet = async () => {
    //remove after debug
    console.log("removeBeatsFromSet");
    if (!selectedBeats.length) {
      message('Please select a beat first.', { title: 'Error', type: 'error' });
      return;
    }
    try {
      await invoke('remove_beats_from_collection', {
        ids: selectedBeats.map(beat => beat.id),
        collectionId: collectionId
      });

      // Check if we're in a collection and refresh accordingly
      if (collectionId) {
        await fetchSetData(collectionId);
      } else {
        await fetchData();
      }
    } catch (error) {
      console.error('Error removing beats from collection:', error);
    }
  };

  const handleRefresh = async () => {
    if (collectionId) {
      await fetchSetData(collectionId);
    } else {
      await fetchData();
    }
  };

  // Add near your other useEffect with event listeners
  useEffect(() => {
    // Listen for beat analysis completion
    const unlistenAnalysis = listen<{ id: number; key: string; bpm: number }>(
      'beat-analyzed',
      (event) => {
        console.log('Beat analyzed:', event.payload);
        handleRefresh(); // This will refresh the table data
      }
    );

    return () => {
      unlistenAnalysis.then(unlisten => unlisten());
    };
  }, [handleRefresh]); // Add handleRefresh to dependencies

  const handleEditBeat = async () => {
    if (selectedBeats.length !== 1) {
      console.log("No beat selected");
      message("No beat selected");
      return;
    }
    setIsEditing(true);
  };
  

  const handleBeatDelete = async () => {
    if (!selectedBeats.length) {
      console.warn("No beat selected");
      setUploadStatus("No beat selected");
      return;
    }
    try {
      const result = await invoke('delete_beats', {
        ids: selectedBeats.map(beat => beat.id)
      });

      // Check if we're in a collection and refresh accordingly
      if (collectionId) {
        await fetchSetData(collectionId);
      } else {
        await fetchData();
      }

      setUploadStatus(prevStatus => prevStatus + `\n${result}`);
    } catch (error) {
      console.error("Error deleting beat:", error);
      setUploadStatus(prevStatus => prevStatus + `\nError deleting beat: ${error}`);
    }
  };

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
    }, function (err) {
      console.error(err)
    });
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



  const handleAddToCollection = async (collectionId: number, beatId: number) => {
    try {
      await invoke('add_beat_to_collection', { beatId, collectionId });
      fetchData();
    } catch (error) {
      console.error('Error adding beat to collection:', error);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const activeId = event.active.id.toString();
    if (activeId.startsWith('sortable-') || activeId.startsWith('beat-')) {
      const beatId = parseInt(activeId.replace(/^(sortable-|beat-)/, ''), 10);
      const draggedBeat = beats.find(beat => beat.id === beatId);
      if (draggedBeat) {
        setSelectedBeats([draggedBeat]);
      }
    }
  };

  const saveCollectionOrder = async (collectionId: number, beatsToSave: Beat[]) => {
    console.log('Saving collection order:', { collectionId, beatsToSave });

    if (!beatsToSave.length) return;

    const collOrder: CollOrder[] = beatsToSave.map((beat, index) => ({
      beat_id: beat.id,
      collection_order: index + 1
    }));

    try {
      // Update collection beats state
      setCollectionBeats(beatsToSave);

      await invoke("save_collection_order", {
        payload: {
          collection_id: collectionId,
          coll_order: collOrder
        }
      });
      await fetchSetData(collectionId);
    } catch (error) {
      console.error("Error saving collection order:", error);
      await fetchSetData(collectionId);
      throw error;
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    console.log("Drag end event:", event);
    const { active, over } = event;
    if (!over || !active) return;

    const activeId = active.id.toString();
    const dragData = active.data.current;
    const overId = over.id.toString();

    if (overId.startsWith('collection-') && activeId.startsWith('beat-') || activeId.startsWith('selected-beats-')) {
      const targetCollectionId = parseInt(overId.replace('collection-', ''), 10);

      if (!dragData || !dragData.beats) {
        console.error("Missing drag data");
        return;
      }

      const beatsToAdd = dragData.beats;
      console.log("Adding beats to collection:", beatsToAdd, targetCollectionId);
      // Handle multiple beats
      beatsToAdd.forEach((beat: { id: number; }) => {
        console.log("Adding beat to collection:", beat.id, targetCollectionId);
        handleAddToCollection(targetCollectionId, beat.id);
      });
      return;
    }

    // Handle reordering beats
    if (activeId.startsWith('sortable-') && overId.startsWith('sortable-')) {
      const activeBeatId = parseInt(activeId.replace('sortable-', ''), 10);
      const overBeatId = parseInt(overId.replace('sortable-', ''), 10);

      let beatsToReorder = isInCollection ? collectionBeats : beats;
      const activeIndex = beatsToReorder.findIndex(beat => beat.id === activeBeatId);
      const overIndex = beatsToReorder.findIndex(beat => beat.id === overBeatId);

      if (activeIndex === -1 || overIndex === -1) {
        console.error("Could not find beat indices");
        return;
      }

      if (activeIndex !== overIndex) {
        const newBeats = arrayMove(beatsToReorder, activeIndex, overIndex);

        // Immediately update UI state based on context
        if (isInCollection && collectionId) {
          setCollectionBeats(newBeats);
          // Save to backend without waiting
          saveCollectionOrder(collectionId, newBeats).catch(error => {
            console.error('Error saving collection order:', error);
            // Revert UI state on error
            setCollectionBeats(beatsToReorder);
          });
        } else {
          setBeats(newBeats);
          // Save to backend without waiting
          saveRowOrder(newBeats).catch(error => {
            console.error('Error saving row order:', error);
            // Revert UI state on error
            setBeats(beatsToReorder);
          });
        }
      }
    }
  };

  // Define the beatActionItems with proper typing
  const getBeatActionItems = (): MenuItem[] => [
    {
      label: "Add to set",
      icon: "pi pi-plus",
      items: beatCollections.map(set => ({
        label: set.set_name,
        // Fix: Call addBeatsToSet instead of handleAddToCollection
        command: () => addBeatsToSet(set.id)
      }))
    },
    {
      label: "Delete",
      icon: "pi pi-trash",
      command: handleBeatDelete,
    },
    ...(selectedBeats.length === 1 ? [{
      label: "Edit",
      icon: "pi pi-pencil",
      command: handleEditBeat,
    }] : []),
    ...(collectionId ? [{
      label: "Remove from set",
      icon: "pi pi-minus",
      command: removeBeatsFromSet,
    }] : [])
  ];

  const addBeatItems: MenuItem[] = [
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
  ];

  const saveRowOrder = async (beatsToSave: Beat[]) => {
    // Don't try to save if we have no beats
    if (!beatsToSave.length) return;

    const rowOrder: RowOrder[] = beatsToSave.map((beat, index) => ({
      row_id: beat.id,
      row_number: index + 1
    }));

    try {
      await invoke("save_row_order", { rowOrder });
    } catch (error) {
      // Could add a toast notification here
      console.error("Error saving row order:", error);
      setBeats(beats);
    }
  };

  if (showSplashScreen) {
    return <SplashScreen closeSplashScreen={() => setShowSplashScreen(false)} />;
  }

  if (error) return <div className="flex items-center justify-center h-screen">Error: {error.message}</div>;

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
      <div className="flex bg-slate-900 justify-center h-screen overflow-x-hidden">
        <Sidebar collections={beatCollections} onAddBeatToCollection={handleAddToCollection} />
        <div className="flex-1 flex flex-col overflow-x-auto">
        <main className="flex-1 bg-gray-600 p-6 flex flex-col overflow-y-auto mb-24">
            <span className="fixed right-4 top-2">
              <img src={BeatbankLogo} width={60} height={100} />
            </span>
            <TableContext.Provider value={{ tableInstance, setTableInstance }}>
            <div className="flex flex-col flex-1 h-full">
              <TableHeader
                selectedBeats={selectedBeats}
                setIsEditingBeat={setIsEditing}
                beatActionItems={getBeatActionItems()}
                addBeatItems={addBeatItems}
                uploadStatus={uploadStatus}
                showStatusDialog={showStatusDialog}
                setShowStatusDialog={setShowStatusDialog}
                uploadedFiles={uploadedFiles}
                showEditColumnsDialog={showEditColumnsDialog}
                setShowEditColumnsDialog={setShowEditColumnsDialog}
              />
              <SortableContext items={beats.map((beat) => `sortable-${beat.id}`)}
                strategy={verticalListSortingStrategy}>
                <Routes>
                  <Route
                    path="/"
                    element={
                    <>
                      <div>
                        <div className="mb-6">
                          <h2 className="text-2xl font-bold mb-2 pl-0 pb-0">All Beats</h2>
                        </div>
                      </div>
                      <BeatTable
                        beats={beats}
                        onBeatPlay={playBeat}
                        selectedBeats={selectedBeats}
                        setSelectedBeats={setSelectedBeats}
                        isEditing={isEditing}
                        setIsEditing={setIsEditing}
                        fetchData={fetchData}
                        columnVisibility={columnVisibility}
                        setColumnVisibility={setColumnVisibility}
                        onDragEnd={handleDragEnd}
                        saveRowOrder={saveRowOrder}
                        saveCollectionOrder={saveCollectionOrder}
                        fetchSetData={fetchSetData}
                        showEditColumnsDialog={showEditColumnsDialog}
                        setShowEditColumnsDialog={setShowEditColumnsDialog}
                        handleRefresh={handleRefresh}
                      />
                    </>
                    }
                  />
                  <Route
                    path="/collection/:id"
                    element={
                      <BeatCollectionComponent
                        onDragEnd={handleDragEnd}
                        onBeatPlay={playBeat}
                        isEditing={isEditing}
                        setIsEditing={setIsEditing}
                        selectedBeats={selectedBeats}
                        setSelectedBeats={setSelectedBeats}
                        saveRowOrder={saveRowOrder}
                        saveCollectionOrder={saveCollectionOrder}
                        fetchData={fetchData}
                        showEditColumnsDialog={showEditColumnsDialog}
                        setShowEditColumnsDialog={setShowEditColumnsDialog}
                        beats={collectionBeats}
                        handleRefresh={handleRefresh}
                      />}
                  />
                </Routes>
              </SortableContext>
              </div>
            </TableContext.Provider>

            {/* Overlay when dragging files */}
            {isFileDragging && (
              <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50">
                <div className="text-2xl font-bold text-white text-center bg-black bg-opacity-75 p-6 rounded-lg">
                  Drop files here
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
      <div className="flex bg-slate-900 justify-center">
        <BeatJockey
          isPlaying={isPlaying}
          currentBeat={currentBeat}
          togglePlayPause={togglePlayPause}
          stopBeat={stopBeat}
          audioRef={audioRef}
        />
      </div>
    </DndContext>
  );
}

function App() {
  return (
    <Router>
      <AppContainer />
    </Router>
  );
}

export default App;
