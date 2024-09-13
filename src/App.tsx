//App.tsx
import { MemoryRouter as Router, Routes, Route } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import icon from "./assets/icons/db_logo.png";
import BeatJockey from "./components/BeatJockey";
import BeatSetPage from "./pages/BeatSet";
import Search from "./pages/Search";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import { Beat, BeatSet } from "./bindings";
import "./Main.css";
import { invoke } from "@tauri-apps/api";
import { confirm, message } from "@tauri-apps/api/dialog";

function App() {
  //@ts-ignore
  const [refresh, setRefresh] = useState(false);
  const [selectedBeat, setSelectedBeat] = useState<Beat | null>(null);

  const [isEditing, setIsEditing] = useState(false);

  // Function to trigger a refresh
  const triggerRefresh = useCallback(() => {
    console.log("triggerRefresh");
    setRefresh(prev => !prev);
  }, []);

  // get sets from db
  async function fetchSets() {
    try {
      const response: string = await invoke("get_sets");
      const rawSets = JSON.parse(response);
      // Convert array of arrays to array of objects
      const mySets = rawSets.map((set: [number, string]) => ({
        id: set[0],
        setName: set[1],
      }));
      console.log("Transformed sets:", mySets);
      return mySets;
    } catch (error) {
      console.error("Failed to fetch sets:", error);
      return [];
    }
  }

  const [playThisBeat, setPlayThisBeat] = useState<Beat | null>(null);

  const [sets, setSets] = useState<BeatSet[]>([]);

  useEffect(() => {
    fetchSets().then((fetchedSets) => {
      console.log(fetchedSets); // Check what is actually being fetched
      setSets(fetchedSets);
    });
  }, []);

  const handleBeatSelection = (beat: Beat) => {
    console.log("beat selected:", beat);
    setSelectedBeat(beat);
  };

  const handleBeatPlay = (beat: Beat) => {
    setPlayThisBeat(beat);
  };

  const handleAddNewSet = (setName: string) => {
    const newSet: BeatSet = { id: Date.now(), setName: setName };
    setSets([...sets, newSet]);
  };

  const addNewSet = async (setName: string) => {
    // Trim whitespace and check if the name is empty
    const trimmedSetName = setName.trim();
    if (!trimmedSetName) {
      await message("Set name cannot be empty", { title: "Error", type: "error" });
      return;
    }

    // Fetch the latest sets to ensure the most current state
    const latestSets = await fetchSets();

    // Check if the set name already exists
    const setNameExists = latestSets.some(
      (set: BeatSet) => set.setName.toLowerCase() === trimmedSetName.toLowerCase()
    );

    if (setNameExists) {
      await message("A set with this name already exists", { title: "Error", type: "error" });
      return;
    }

    try {
      // Invoke the backend to add a new set and get the new ID
      const newSetId: number = await invoke("add_set", { name: trimmedSetName });
      const newSet: BeatSet = { id: newSetId, setName: trimmedSetName };
      setSets((prevSets) => [...prevSets, newSet]);
    } catch (error) {
      console.error("Failed to add new set:", error);
      await message("Failed to add new set", { title: "Error", type: "error" });
    }
  };

  const handleDeleteSet = (setId: number) => {
    confirm("Are you sure you want to delete this set?", {
      title: "Delete Set",
    }).then(async (confirmed) => {
      if (confirmed) {
        try {
          await invoke("delete_set", { setId });
          setSets((prevSets) => prevSets.filter((set) => set.id !== setId));
        } catch (error) {
          console.error("Failed to delete set:", error);
          // Optionally, show an error message to the user
        }
      }
    });
  };

  const handleDeleteBeat = async () => {
    console.log("handleDeleteBeat");
    if (selectedBeat) {
      console.log("Deleting beat: ", selectedBeat);
      const confirmed = await confirm("This action cannot be reverted. Are you sure?", {
        title: "Tauri",
        type: "warning",
      });
      console.log(confirmed);
      if (confirmed) {
        console.log(`Deleting beat:${selectedBeat}`);
        const beatId = selectedBeat.id;
        try {
          await invoke("delete_beat", { beatId });
        } catch (error) {
          console.error("Error deleting beat:", error);
        }
        setSelectedBeat(null);
        // Refresh the table
        triggerRefresh();
      }
    } else {
      message("No beat selected", { title: "Error", type: "error" });
    }
  };


  if (!sets) {
    return <div>Loading...</div>; // Show loading state or error message
  }

  return (
    <div className="h-full">
      <Router>
        <div className="flex h-screen text-xl font-sans w-full">
          <div className="w-64">
            <Sidebar
              iconPath={icon}
              beatSets={sets}
              addNewSet={addNewSet}
              deleteSet={handleDeleteSet}
            />
          </div>
          <div className="flex-2 flex-col py-4 w-full h-full">
            {/* right container */}
            <div className="flex w-full">
              <Header
                onAddNewSet={handleAddNewSet}
                onTriggerRefresh={triggerRefresh}
                onDeleteBeat={handleDeleteBeat}
                setIsEditing={setIsEditing}
                sets={sets}
                selectedBeat={selectedBeat}
              />
            </div>
            <main className="h-full w-full">
              <Routes>
                <Route
                  path="/"
                  element={
                    <Home
                      onBeatPlay={handleBeatPlay}
                      onBeatSelect={handleBeatSelection}
                      onTriggerRefresh={triggerRefresh}
                      isEditing={isEditing}
                      setIsEditing={setIsEditing}
                      selectedBeat={selectedBeat}
                      setSelectedBeat={setSelectedBeat}
                    />
                  }
                />
                <Route path="/search" element={<Search />} />
                <Route path="/set/:id" element={<BeatSetPage onBeatPlay={handleBeatPlay}
                      onBeatSelect={handleBeatSelection}
                      onTriggerRefresh={triggerRefresh}
                      isEditing={isEditing}
                      setIsEditing={setIsEditing}
                      selectedBeat={selectedBeat}
                      setSelectedBeat={setSelectedBeat}/>} />
              </Routes>
              <div className="flex-grow flex-col justify-center">
                <BeatJockey playThisBeat={playThisBeat} />
              </div>
            </main>
          </div>
        </div>
      </Router>
    </div>
  );
}

export default App;
