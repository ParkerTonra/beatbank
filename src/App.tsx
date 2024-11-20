import { useEffect, useState } from "react";
import { Beat, CollOrder, RowOrder, AudioExtension, TempoDetectionExtension } from "./bindings";
import Sidebar from "./components/Sidebar";
import "./App.css";
import "./Main.css";
import { SplashScreen } from "./components/SplashScreen";
import BeatTable from "./components/BeatTable";
import 'primereact/resources/themes/lara-dark-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import { ProgressSpinner } from 'primereact/progressspinner';
import { useBeats } from "./hooks/useBeats";
import { loadSettings, getSettingsPath, forceFirstTimeSetup } from './store';
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
import { dialog } from "@tauri-apps/api";
import { Tooltip } from "primereact/tooltip";

function AppContainer() {
  // state
  const [showSplashScreen, setShowSplashScreen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedBeats, setSelectedBeats] = useState<Beat[]>([]);

  const [cancelUpload, setCancelUpload] = useState(false);

  const [_, setTheme] = useState<string>('light');
  //@ts-ignore
  const [settingsPath, setSettingsPath] = useState<string>('');
  const [isFileDragging, setIsFileDragging] = useState(false);
  const [showEditColumnsDialog, setShowEditColumnsDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [tableInstance, setTableInstance] = useState<Table<Beat> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({
    filesProcessed: 0,
    totalFiles: 0,
    beatsAnalyzed: 0,
    totalAnalyzable: 0
  });
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);


  // react router hooks
  const location = useLocation();
  const collectionIdMatch = location.pathname.match(/\/collection\/(\d+)/);
  const isInCollection = Boolean(collectionIdMatch);
  const collectionId = collectionIdMatch ? parseInt(collectionIdMatch[1], 10) : null;
  const { isPlaying, currentBeat, playBeat, stopBeat, togglePlayPause, audioRef } = useAudio();

  const {
    beats,
    beatCollections,
    currentCollection,
    fetchData,
    columnVisibility,
    error,
    setBeats,
    setColumnVisibility,
    fetchSetData,
    collectionBeats,
    setCollectionBeats,
    fetchColumnVisibility
  } = useBeats();

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor)
  );

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // First load settings
        const settings = await loadSettings();
        setTheme(settings.theme);

        // Check if it's first time
        if (settings.is_first_time) {
          // Show welcome message and complete setup
          await message('Welcome to beatbank!');
          await invoke('first_time_setup');
        }

        // Get settings path (if needed)
        const path = await getSettingsPath();
        setSettingsPath(path);

        // Then fetch data
        await fetchData();

        // Finally close splash screen
        setShowSplashScreen(false);
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };

    initializeApp();
  }, []);

  useEffect(() => {
    fetchColumnVisibility();
  }, [setColumnVisibility]);

  //TODO: consolidate
  const folderDialogOptions: OpenDialogOptions = {
    multiple: true,
    directory: true,
  } as OpenDialogOptions;

  const handleForceSetup = async () => {
    try {
      // ask user to confirm w/ tauri
      const confirmed = await confirm('Are you sure you want to wipe your data? This will delete all your beats and collections.');
      if (confirmed) {
        await forceFirstTimeSetup();
        // Reload the page or reinitialize the app
        window.location.reload();
      }
    } catch (error) {
      console.error('Error forcing first time setup:', error);
      await message('Error forcing first time setup', { type: 'error' });
    }
  };

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
    let dragTimeoutId: number;
    document.body.classList.add('select-none');

    const unlistenDrop = listen('tauri://file-drop', async (event) => {
      clearTimeout(dragTimeoutId);
      setIsFileDragging(false);

      if (!Array.isArray(event.payload) || event.payload.length === 0) return;

      const fileCount = event.payload.length;
      const confirmMessage = fileCount === 1
        ? `Add "${event.payload[0].split('/').pop()}" to your library?`
        : `Add ${fileCount} files to your library?`;

      const shouldAdd = await dialog.ask(confirmMessage, {
        title: 'Add Files'
      });

      if (!shouldAdd) return;

      // Use the existing processFiles function
      await processFiles(event.payload);
    });

    const unlistenHover = listen('tauri://file-drop-hover', () => {
      clearTimeout(dragTimeoutId);
      setIsFileDragging(true);

      dragTimeoutId = window.setTimeout(() => {
        setIsFileDragging(false);
      }, 5000);
    });
    
    const unlistenCancelled = listen('tauri://file-drop-cancelled', () => {
      clearTimeout(dragTimeoutId);
      setIsFileDragging(false);
    });

    return () => {
      clearTimeout(dragTimeoutId);
      document.body.classList.remove('select-none');
      unlistenDrop.then(dispose => dispose());
      unlistenHover.then(dispose => dispose());
      unlistenCancelled.then(dispose => dispose());
    };
  }, []);

  useEffect(() => {
    if (cancelUpload) {
      setIsProcessing(false);
      setProcessingProgress({
        filesProcessed: 0,
        totalFiles: 0,
        beatsAnalyzed: 0,
        totalAnalyzable: 0
      });
      setCancelUpload(false);
      setUploadedFiles([]);
    }
  }, [cancelUpload]);

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
    // confirm dialog
    const confirmed = await confirm('Are you sure you want to delete the selected beats?');
    if (!confirmed) {
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
        setSelectedBeats([]);
        await fetchData();
      }

      setUploadStatus(prevStatus => prevStatus + `\n${result}`);
    } catch (error) {
      console.error("Error deleting beat:", error);
      setUploadStatus(prevStatus => prevStatus + `\nError deleting beat: ${error}`);
    }
  };

  const VALID_EXTENSIONS = {
    all: ['flac', 'wav', 'mp3', 'ogg', 'm4a', 'aac', 'aiff', 'wma'] as AudioExtension[],
    tempoDetection: ['mp3', 'flac', 'wav'] as TempoDetectionExtension[]
  } as const;

  const isTempoDetectionSupported = (extension: string): extension is TempoDetectionExtension => {
    return VALID_EXTENSIONS.tempoDetection.includes(extension as TempoDetectionExtension);
  };

  async function processEntries(entries: FileEntry[]) {
    try {
      const filesToProcess: string[] = [];

      // Collect valid file paths recursively
      const collectPaths = (entry: FileEntry) => {
        if (entry.children) {
          entry.children.forEach(collectPaths);
        } else {
          const extension = entry.name?.split('.').pop()?.toLowerCase() || '';
          if (VALID_EXTENSIONS.all.includes(extension as AudioExtension)) {
            filesToProcess.push(entry.path);
          }
        }
      };

      entries.forEach(collectPaths);
      setUploadedFiles(filesToProcess);

      // Process files with the improved implementation
      await processFiles(filesToProcess);
    } catch (error) {
      console.error('Error in processEntries:', error);
      setUploadStatus(prev => `${prev}\nError processing files: ${error}`);
    }
  }

  const handleFileUpload = async () => {
    try {
      const selectedFiles = await open({
        directory: false,
        multiple: true,
        filters: [{
          name: 'Audio Files',
          extensions: VALID_EXTENSIONS.all
        }]
      });

      if (!selectedFiles || selectedFiles.length === 0) return;

      const filePaths = Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles];
      setUploadedFiles(filePaths);

      // Process files with the new implementation
      await processFiles(filePaths);
    } catch (error) {
      console.error('Error in handleFileUpload:', error);
      setUploadStatus(`Error selecting files: ${error}`);
    }
  };

  // Process files with the new implementation
  const processFiles = async (filePaths: string[]) => {
    const analyzableFiles = filePaths.filter(path => {
      const extension = path.split('.').pop()?.toLowerCase() || '';
      return isTempoDetectionSupported(extension);
    });

    if (isProcessing) {
      await message('Please wait for the current task to finish before starting a new one.', { title: 'Tauri', type: 'error' });
      return;
    }

    setIsProcessing(true);
    setProcessingProgress({
      filesProcessed: 0,
      totalFiles: filePaths.length,
      beatsAnalyzed: 0,
      totalAnalyzable: analyzableFiles.length
    });

    try {
      // Step 1: Add all files to database first
      const BATCH_SIZE = 3;
      const addedBeats: { beatId: number, filePath: string }[] = [];

      for (let i = 0; i < filePaths.length; i += BATCH_SIZE) {
        if (cancelUpload) {
          return;
        }
        const batch = filePaths.slice(i, i + BATCH_SIZE);

        const batchResults = await Promise.all(batch.map(async (filePath) => {
          try {
            // Just add to database, don't analyze yet
            const beatId = await invoke('add_beat', { filePath }) as number;

            setProcessingProgress(prev => ({
              ...prev,
              filesProcessed: Math.min(prev.filesProcessed + 1, prev.totalFiles)
            }));

            const extension = filePath.split('.').pop()?.toLowerCase() || '';
            if (isTempoDetectionSupported(extension)) {
              return { beatId, filePath };
            }
            return null;
          } catch (error) {
            console.error(`Error adding file ${filePath}:`, error);
            setUploadStatus(prev =>
              `${prev}\nError adding ${filePath.split('/').pop()}: ${error}`
            );
            return null;
          }
        }));

        addedBeats.push(...batchResults.filter((result): result is { beatId: number, filePath: string } =>
          result !== null
        ));

        await fetchData(); // Update UI with new files
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Step 2: Start BPM analysis for analyzable files
      const analysisPromises = addedBeats.map(async ({ beatId, filePath }) => {
        try {
          if (cancelUpload) {
            return;
          }
          console.log("Starting analysis for beat:", beatId);
          console.log("File path:", filePath);

          // Create the promise before invoking to avoid race conditions
          const analysisPromise = new Promise<void>(async (resolve) => {
            const unsubscribe = await listen('beat-analyzed', async (event: any) => {
              if (event.payload.beatId === beatId) {
                switch (event.payload.status) {
                  case 'success':
                    setProcessingProgress(prev => ({
                      ...prev,
                      beatsAnalyzed: prev.beatsAnalyzed + 1
                    }));
                    await fetchData();
                    break;
                  case 'cancelled':
                    console.log(`Analysis cancelled for beat ${beatId}`);
                    break;
                  case 'error':
                    console.error(`Analysis failed for beat ${beatId}: ${event.payload.error}`);
                    setProcessingProgress(prev => ({
                      ...prev,
                      beatsAnalyzed: prev.beatsAnalyzed + 1
                    }));
                    setUploadStatus(prev =>
                      `${prev}\nError analyzing ${filePath.split('/').pop()}: ${event.payload.error}`
                    );
                    break;
                }
                await unsubscribe();
                resolve();
              }
            });
          });

          // Start the analysis after setting up the listener
          await invoke('analyze_beat', { beatId, filePath });

          // Wait for the analysis to complete
          return analysisPromise;

        } catch (error) {
          console.error(`Error analyzing beat ${filePath}:`, error);
          setUploadStatus(prev =>
            `${prev}\nError analyzing ${filePath.split('/').pop()}: ${error}`
          );
        }
      });

      // Wait for all analyses to complete or timeout
      await Promise.race([
        Promise.all(analysisPromises),
        new Promise(resolve => setTimeout(resolve, 300000)) // 5 minute timeout
      ]);

      await fetchData(); // Final UI update
      setIsProcessing(false);

    } catch (error) {
      console.error('Error in processFiles:', error);
      setIsProcessing(false);
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

  const handleCancel = async () => {
    setCancelUpload(true);
    try {
      await invoke('cancel_processing');
      setIsProcessing(false);
      setProcessingProgress({
        filesProcessed: 0,
        totalFiles: 0,
        beatsAnalyzed: 0,
        totalAnalyzable: 0
      });
      setUploadedFiles([]);
    } catch (error) {
      console.error('Error cancelling processing:', error);
    }
  };

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

  // Add global CSS to prevent text selection/dragging
  document.body.classList.add('select-none');
  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
      <div className="flex bg-slate-900 justify-center h-screen overflow-x-hidden">
        <Sidebar collections={beatCollections} />
        <div className="flex-1 flex flex-col overflow-x-auto">
          <main className="flex-1 bg-gray-600 p-6 flex flex-col overflow-y-auto mb-24">
            <span className="fixed right-4 top-2">
              <img src={BeatbankLogo} width={60} height={100} />
            </span>
            <TableContext.Provider value={{ tableInstance, setTableInstance }}>
              <div className="flex flex-col flex-1 h-full">
                <TableHeader
                  uploadStatus={uploadStatus}
                  selectedBeats={selectedBeats}
                  setIsEditingBeat={setIsEditing}
                  beatActionItems={getBeatActionItems()}
                  addBeatItems={addBeatItems}
                  showStatusDialog={showStatusDialog}
                  setShowStatusDialog={setShowStatusDialog}
                  uploadedFiles={uploadedFiles}
                  showEditColumnsDialog={showEditColumnsDialog}
                  setShowEditColumnsDialog={setShowEditColumnsDialog}
                  handleForceFirstTimeSetup={handleForceSetup}
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
                          beats={collectionBeats}
                          currentCollection={currentCollection}
                          onDragEnd={handleDragEnd}
                          onBeatPlay={playBeat}
                          isEditing={isEditing}
                          setIsEditing={setIsEditing}
                          selectedBeats={selectedBeats}
                          setSelectedBeats={setSelectedBeats}
                          saveRowOrder={saveRowOrder}
                          saveCollectionOrder={saveCollectionOrder}
                          fetchData={fetchData}
                          fetchSetData={fetchSetData}
                          showEditColumnsDialog={showEditColumnsDialog}
                          setShowEditColumnsDialog={setShowEditColumnsDialog}
                          handleRefresh={handleRefresh}
                        />}
                    />
                  </Routes>
                </SortableContext>
              </div>
            </TableContext.Provider>
            {/* Overlay when dragging files */}
            {isFileDragging && (
              <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50 flex-col">
                <div className="text-2xl font-bold text-white text-center bg-black bg-opacity-75 p-6 rounded-lg">
                  Drop files here
                </div>
                {/* cancel button */}
                <button
                  className=" p-2 text-white bg-red-400 rounded-md w-16 h-12 my-4"
                  onClick={() => setIsFileDragging(false)}
                  aria-label="Cancel"
                >
                  <span className="">Cancel</span>
                </button>
              </div>
            )}
            
            {/* Processing overlay */}
            {isProcessing && (
              <div className="fixed bottom-4 left-4 flex items-center bg-gray-900 bg-opacity-95 rounded-lg p-4 shadow-lg z-40 max-w-md">
                <div className="flex-shrink-0 mr-4">
                  <ProgressSpinner
                    style={{ width: '20px', height: '20px' }}
                    strokeWidth="3"
                    fill="var(--surface-ground)"
                    animationDuration=".5s"
                  />
                </div>

                <div className="flex flex-col flex-grow mx-2">
                  <div className="text-white font-semibold mb-1">Processing Files</div>

                  <div className="w-full bg-gray-600 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(processingProgress.filesProcessed / processingProgress.totalFiles) * 100}%`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-sm text-gray-300 mb-2">
                    <span>Files Processed:</span>
                    <span>
                      {processingProgress.filesProcessed} of {processingProgress.totalFiles}
                      {' '}({Math.round((processingProgress.filesProcessed / processingProgress.totalFiles) * 100)}%)
                    </span>
                  </div>

                  {/* Tempo Analysis Progress */}
                  <div className="w-full bg-gray-600 rounded-full h-2 mb-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(processingProgress.beatsAnalyzed / processingProgress.totalAnalyzable) * 100}%`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-sm text-gray-300">
                    <span>Tempos Analyzed:</span>
                    <span>
                      {processingProgress.beatsAnalyzed} of {processingProgress.totalAnalyzable}
                      {processingProgress.totalAnalyzable > 0 ?
                        ` (${Math.round((processingProgress.beatsAnalyzed / processingProgress.totalAnalyzable) * 100)}%)` :
                        ' (No eligible files)'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col flex-grow mx-8 space-y-3">
                <button
                  onClick={() => handleCancel()}
                  className="p-2 text-white hover:bg-red-500 bg-red-400 rounded-md w-16"
                  title="Cancel"
                  data-pr-tooltip="Cancel adding beats"
                  data-pr-position="right"
                >
                  <span>Cancel</span>
                </button>
                <button
                  onClick={() => setShowStatusDialog(!showStatusDialog)}
                  className="p-2 text-white hover:bg-blue-500 bg-blue-400 rounded-md w-16"
                  type="button"
                  data-pr-tooltip="Upload Status"
                  data-pr-position="right"
                >
                  <span>Status</span>
                </button>
                <Tooltip target = "button"/>
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
    </DndContext >
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
