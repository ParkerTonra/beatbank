//App.tsx
import { MemoryRouter as Router, Routes, Route } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import icon from "./assets/icons/db_logo.png";
import BeatJockey from "./components/BeatJockey";
import BeatSet from "./pages/BeatSet";
import Search from "./pages/Search";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import { Beat } from "./bindings";
import "./Main.css";
import { invoke } from "@tauri-apps/api";

interface BeatSet {
  id: number;
  name: string;
}

function App() {
  const [refresh, setRefresh] = useState(false);

  // Function to trigger a refresh
  const triggerRefresh = useCallback(() => {
    setRefresh(true);
  }, []);

  // Function to reset the refresh state
  const resetRefresh = useCallback(() => {
    setRefresh(false);
  }, []);

  // get sets from db
  async function fetchSets() {
    try {
      const response: string = await invoke("get_sets");
      const rawSets = JSON.parse(response);
      // Convert array of arrays to array of objects
      const mySets = rawSets.map((set: [number, string]) => ({
        id: set[0],
        name: set[1],
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
  };

  const handleBeatPlay = (beat: Beat) => {
    setPlayThisBeat(beat);
  };

  const handleAddNewSet = (setName: string) => {
    const newSet: BeatSet = { id: Date.now(), name: setName };
    setSets([...sets, newSet]);
  };

  const addNewSet = async (setName: string) => {
    const newSet: BeatSet = { id: Date.now(), name: setName };
    // invoke "add_set" to add new set to db
    await invoke("add_set", { name: setName });
    setSets((prevSets) => [...prevSets, newSet]);
  };

  const handleDeleteSet = (setId: number) => {
    setSets((prevSets) => prevSets.filter((set) => set.id !== setId));
    // invoke "delete_set" to delete set from db
    invoke("delete_set", { setId });
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
              sets={sets}
              addNewSet={addNewSet}
              deleteSet={handleDeleteSet}
            />
          </div>
          <div className="flex-2 flex-col py-4 w-full h-full">
            {/* right container */}
            <div className="flex w-full">
              <Header onAddNewSet={handleAddNewSet} onTriggerRefresh={triggerRefresh} />
            </div>
            <main className="h-full w-full">
              <Routes>
                <Route
                  path="/"
                  element={
                    <Home
                      onBeatPlay={handleBeatPlay}
                      onBeatSelect={handleBeatSelection}
                      refresh={refresh}
                      onRefreshHandled={resetRefresh}
                    />
                  }
                />
                <Route path="/search" element={<Search />} />
                <Route path="/set/:id" element={<BeatSet />} />
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
