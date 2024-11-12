import { useEffect, useState } from "react";
import { Beat, CollOrder, RowOrder } from "./bindings";
import Sidebar from "./components/Sidebar";
import "./App.css";
import "./Main.css";
import { SplashScreen } from "./components/SplashScreen";
import UploadBeat from "./components/UploadBeat";
import BeatTable from "./components/BeatTable";
import { SunIcon } from "lucide-react";
import { useBeats } from "./hooks/useBeats";
import { loadSettings, saveSettings, getSettingsPath } from './store';
import { DndContext, DragEndEvent, DragStartEvent, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { invoke } from "@tauri-apps/api/tauri";
import { message } from "@tauri-apps/api/dialog";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import SettingsDropdown from "./components/SettingsDropdown";
import { HashRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import BeatCollTable from "./components/BeatCollection";
import { listen } from '@tauri-apps/api/event';
import BeatJockey from "./components/BeatJockey";
import { useAudio } from "./hooks/useAudio";

function AppContainer() {
  const [showSplashScreen, setShowSplashScreen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedBeat, setSelectedBeat] = useState<Beat | null>(null);
  const [theme, setTheme] = useState<string>('light');
  const [settingsPath, setSettingsPath] = useState<string>('');
  const [isFileDragging, setIsFileDragging] = useState(false);

  const location = useLocation();
  const collectionIdMatch = location.pathname.match(/\/collection\/(\d+)/);
  const isInCollection = Boolean(collectionIdMatch);
  const collectionId = collectionIdMatch ? parseInt(collectionIdMatch[1], 10) : null;

  const { isPlaying, currentBeat, playBeat, stopBeat, togglePlayPause, audioRef } = useAudio();

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor)
  );

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

  const handleAddToCollBtnClick = async (collectionId: number) => {
    if (!selectedBeat) {
      message('Please select a beat first.', { title: 'Error', type: 'error' });
      return;
    }
    let beatId = selectedBeat.id;
    console.log('adding beat to collection:', beatId, collectionId);
    await invoke('add_beat_to_collection', { beatId, collectionId });
    // Refresh data or update state as needed
    fetchData();
  };

  const handleAddToCollection = async (collectionId: number, beatId: number) => {
    try {
      await invoke('add_beat_to_collection', { beatId, collectionId });
      fetchData(); // Refresh data or update state as needed
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
        setSelectedBeat(draggedBeat);
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
    const { active, over } = event;
    if (!over || !active) return;
  
    const activeId = active.id.toString();
    const overId = over.id.toString();
  
    // Handle dropping a beat into a collection
    if (overId.startsWith('collection-') && activeId.startsWith('beat-')) {
      const targetCollectionId = parseInt(overId.replace('collection-', ''), 10);
      const beatId = parseInt(activeId.replace('beat-', ''), 10);
      handleAddToCollection(targetCollectionId, beatId);
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
  //TODO: audio player
  // const [playThisBeat, setPlayThisBeat] = useState<Beat | null>(null);

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

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      console.log("loading settings, path:", settingsPath);
      const settings = await loadSettings(); // Load settings from the backend
      setTheme(settings.theme); // Update the theme state with the loaded settings

      const path = await getSettingsPath(); // Fetch and log the settings path
      setSettingsPath(path); // Update the state to display the settings path
    };

    fetchSettings(); // Invoke the fetchSettings function when the component mounts
  }, []); // Empty dependency array ensures this runs only once

  useEffect(() => {
    if (collectionId) {
      fetchSetData(collectionId);
    }
  }, [collectionId]);


  // Define a function to handle theme changes
  const handleThemeChange = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'; // Toggle between light and dark themes
    setTheme(newTheme); // Update the theme state

    await saveSettings({ theme: newTheme }); // Save the new theme settings to the backend
  };



  if (showSplashScreen) {
    return <SplashScreen closeSplashScreen={() => setShowSplashScreen(false)} />;
  }

  const handleBeatsChange = (newBeats: Beat[]) => {
    setBeats(newBeats);
  };

  const handleBeatSelection = (beat: Beat) => {
    setSelectedBeat(beat);
  };

  if (error) return <div className="flex items-center justify-center h-screen">Error: {error.message}</div>;

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
      <div className="flex bg-slate-900 justify-center overflow-scroll">
        <Sidebar collections={beatCollections} onAddBeatToCollection={handleAddToCollection} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-600 p-6">
            <h1 className="text-3xl font-bold">Welcome to Beatbank!</h1>
            <div className="flex justify-center gap-8">
              <div className="flex flex-row">
                <SettingsDropdown
                  sets={beatCollections}
                  handleAddToCollBtnClick={handleAddToCollBtnClick}
                  selectedBeat={selectedBeat}
                  setIsEditing={setIsEditing}
                />
              </div>
              <button onClick={handleThemeChange}>
                <div className="flex-row items-center justify-center w-52">
                  <div className="flex items-center text-center justify-center">
                    <SunIcon className="h-6 w-6 justify-center mr-2" />
                    Toggle Theme
                  </div>
                </div>
              </button>
            </div>
            <UploadBeat fetchData={fetchData} selectedBeat={selectedBeat} />
            <SortableContext items={beats.map((beat) => `sortable-${beat.id}`)}
              strategy={verticalListSortingStrategy}>
              <Routes>
                {/* default route for main beat table */}
                <Route
                  path="/"
                  element={
                    <BeatTable
                      beats={beats}
                      onBeatPlay={playBeat}
                      onBeatSelect={handleBeatSelection}
                      isEditing={isEditing}
                      setIsEditing={setIsEditing}
                      selectedBeat={selectedBeat}
                      setSelectedBeat={setSelectedBeat}
                      fetchData={fetchData}
                      onBeatsChange={handleBeatsChange}
                      //onAddBeatToCollection={handleAddToCollection}
                      columnVisibility={columnVisibility}
                      setColumnVisibility={setColumnVisibility}
                      onDragEnd={handleDragEnd}
                      saveRowOrder={saveRowOrder}
                      saveCollectionOrder={saveCollectionOrder}
                    />
                  }
                />
                <Route
                  path="/collection/:id"
                  element={<BeatCollTable
                    beats={collectionBeats}
                    onDragEnd={handleDragEnd}
                    onBeatPlay={playBeat}
                    isEditing={isEditing}
                    setIsEditing={setIsEditing}
                    selectedBeat={selectedBeat}
                    setSelectedBeat={setSelectedBeat}
                    saveRowOrder={saveRowOrder}
                    saveCollectionOrder={saveCollectionOrder}
                  />}
                />
              </Routes>
            </SortableContext>

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
      <div className="flex bg-slate-900 justify-center overflow-scroll">
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
