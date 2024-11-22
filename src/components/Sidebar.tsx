import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { BeatCollection, CollectionChangeset, Beat } from "./../bindings";
import DroppableCollection from "./DroppableCollection";
import CollectionCard from "./CollectionCard";
import { useNavigate } from "react-router-dom";

interface SidebarProps {
  beatCollections: BeatCollection[];
  isCreatingSet: boolean;
  setIsCreatingSet: (isCreatingSet: boolean) => void;
  setSelectedBeats: (beats: Beat[]) => void;
  setIsEditingSet: (isEditingSet: boolean) => void;
  isEditingSet: boolean;
  currentCollection: BeatCollection | null;
  fetchSetData: (setId: number) => Promise<void>;
  fetchData: () => Promise<void>;
  setBeatCollections: (collections: BeatCollection[]) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  beatCollections,
  setSelectedBeats,
  setIsEditingSet,
  isCreatingSet,
  setIsCreatingSet,
  isEditingSet,
  currentCollection,
  fetchSetData,
  fetchData,
  setBeatCollections,
}) => {
  const [title, setTitle] = useState("");
  const navigate = useNavigate();
  const [newSetName, setNewSetName] = useState("");

  useEffect(() => {
    setBeatCollections(beatCollections);
  }, [beatCollections, setBeatCollections]);

  const handleCreateSetClick = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (title.trim()) {
      setNewSetName(title.trim());
      setIsCreatingSet(true);
      setTitle(""); // Clear the input
    } else {
      setNewSetName("");
      setIsCreatingSet(true);
      setTitle("");
      console.warn("Please enter a valid title for the new set");
    }

    
  };
  const returnToAllBeats = () => {
    setSelectedBeats([]);
    navigate("/");
  };
  const handleSetSave = async (setData: Partial<BeatCollection>) => {
    try {
        if (setData.id) {
            const collectionData: CollectionChangeset = {
                id: setData.id,
                set_name: setData.set_name || null,
                venue: setData.venue || null,
                city: setData.city || null,
                state_name: setData.state_name || null,
                date_played: setData.date_played || null
            };
            
            try {
                await invoke("edit_beat_collection", {
                    collection: collectionData
                });
                
                setBeatCollections(beatCollections.map(collection => {
                  if (collection.id === setData.id) {
                      return {
                          ...collection,
                          // Only update non-null values
                          set_name: setData.set_name || collection.set_name,
                          venue: setData.venue ?? collection.venue,
                          city: setData.city ?? collection.city,
                          state_name: setData.state_name ?? collection.state_name,
                          date_played: setData.date_played ?? collection.date_played
                      };
                  }
                  return collection;
              }));
              setIsEditingSet(false);
            } catch (error) {
                console.error("Error updating beat collection:", error);
            } finally {
                fetchSetData(setData.id);
            }
        } else {
            console.log("Creating new collection:", setData);
            const newCollection: BeatCollection = await invoke("new_beat_collection", {
                setName: setData.set_name,
                venue: setData.venue,
                city: setData.city,
                stateName: setData.state_name,
                datePlayed: setData.date_played
            });
            
            console.log("New beat collection created:", newCollection);
            setBeatCollections([...beatCollections, newCollection]);
            setIsCreatingSet(false);
        }
    } catch (error) {
        console.error("Error creating/updating beat collection:", error);
    }
 };


  return (
    <div className="w-64 h-screen bg-gray-800 text-white p-4 flex flex-col">
      <h1 className="text-3xl font-bold font-guerilla py-0 mb-4">BEATBANK</h1>
      <form onSubmit={handleCreateSetClick} className="mb-4">
        <input
          type="text"
          placeholder="Enter a name for a new set"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full mb-2 p-2 border border-gray-600 bg-gray-700 text-white rounded"
        />
        <button
          type="submit"
          className="w-full bg-blue-500 hover:bg-blue-600 text-white p-2 rounded transition duration-200"
        >
          Add New Set
        </button>
      </form>
      <div className="flex-1 overflow-y-auto mb-28">
        <h3 className="text-lg font-semibold mb-2">My sets:</h3>
        <ul className="space-y-2" aria-labelledby="set-list">
          <li
            className="block w-full text-left p-2 bg-gray-500 py-4 hover:bg-gray-600 rounded h-12 items-center justify-start cursor-pointer"
            onClick={returnToAllBeats}
          >
              All Beats
          </li>
          {beatCollections.map((collection) => (
            <DroppableCollection
              key={collection.id}
              collection={collection}
              setSelectedBeats={setSelectedBeats}
            />
          ))}
        </ul>
      </div>
      {/* EditSetCard Modal (creating new set) */}
      {isCreatingSet && (
        <CollectionCard
          isCreating={true}
          set={{
            set_name: newSetName
          }}
          onCloseCollection={() => {
            setIsCreatingSet(false);
            setNewSetName("");
          }}
          onSaveCollection={handleSetSave}
        />
      )}
      {/* EditSetCard Modal (editing existing set) */}
      {isEditingSet && (
        <CollectionCard
          isCreating={false}
          set={{
            id: currentCollection?.id,
            set_name: currentCollection?.set_name,
            venue: currentCollection?.venue,
            city: currentCollection?.city,
            state_name: currentCollection?.state_name,
            date_played: currentCollection?.date_played?.toString(),
          }}
          onCloseCollection={() => {
            setIsEditingSet(false);
            setNewSetName("");
          }}
          onSaveCollection={handleSetSave}
        />
      )}
    </div>
  );
};

export default Sidebar;