import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { Beat, BeatCollection } from "./../bindings";
import DroppableCollection from "./DroppableCollection";
import { useNavigate } from "react-router-dom";

interface SidebarProps {
  collections: BeatCollection[];
  setSelectedBeats: (beats: Beat[]) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  collections,
  setSelectedBeats,
}) => {
  const [title, setTitle] = useState("");
  const [beatCollections, setBeatCollections] = useState<BeatCollection[]>(collections);
  const navigate = useNavigate();

  useEffect(() => {
    setBeatCollections(collections);
  }, [collections]);

  async function handleNewBeatCollection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (title.trim()) {
      try {
        const newCollection: BeatCollection = await invoke("new_beat_collection", {
          setName: title.trim(),
        });
        console.log("New beat collection created:", newCollection);
        setBeatCollections([...beatCollections, newCollection]);
        setTitle(""); // Clear the input after successful creation
      } catch (error) {
        console.error("Error creating new beat collection:", error);
      }
    } else {
      console.warn("Please enter a valid title for the new set");
    }
  }

  const returnToAllBeats = () => {
    setSelectedBeats([]);
    navigate("/");
  }

  return (
    <div className="w-64 h-screen bg-gray-800 text-white p-4 flex flex-col">
      <h1 className="text-3xl font-bold font-guerilla py-0 mb-4" id="beatbank-title">BEATBANK</h1>
      <form onSubmit={handleNewBeatCollection} className="mb-4">
        <input
          type="text"
          placeholder="Enter a name for a new set"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full mb-2 p-2 border border-gray-600 bg-gray-700 text-white rounded"
          tabIndex={0}
        />
        <button
          type="submit"
          className="w-full bg-blue-500 hover:bg-blue-600 text-white p-2 rounded transition duration-200"
          tabIndex={0}
        >
          Add New Set
        </button>
      </form>
      <div className="flex-1 overflow-y-auto px-1">
        <h3 className="text-lg font-semibold mb-2" id="set-list">My sets:</h3>
        <button
          className="block w-full text-left p-2 bg-gray-500 hover:bg-gray-600 rounded h-12 items-center justify-start cursor-pointer mb-2"
          onClick={returnToAllBeats}
          tabIndex={0}
        >
            All Beats
        </button>
        {beatCollections.map((collection, index) => (
          <DroppableCollection
            key={collection.id}
            collection={collection}
            setSelectedBeats={setSelectedBeats}
            tabIndex={0}
          />
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
