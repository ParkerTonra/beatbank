import SearchBar from "./SearchBar";
import { message, open } from "@tauri-apps/api/dialog";
import { invoke } from "@tauri-apps/api";
import { useState } from "react";
import { RefreshCcw } from "lucide-react";
import SettingsDropdown from "./SettingsDropdown";

interface HeaderButtonProps {
  onClick: () => void;
  children: React.ReactNode;
}

interface HeaderProps {
  onAddNewSet: (setName: string) => void;
  onTriggerRefresh: () => void;
  onDeleteBeat: () => void;
  onEditBeat: () => void;
  sets: string[];
}

const Header: React.FC<HeaderProps> = ({
  onAddNewSet,
  onTriggerRefresh,
  onDeleteBeat,
  onEditBeat,
  sets,
}) => {
  const [isAddingNewSet, setIsAddingNewSet] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  //@ts-ignore
  const [isEditing, setIsEditing] = useState(false);
  // const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  async function handleAddBeat() {
    try {
      const filePath = await open({
        filters: [
          {
            name: "Audio Files",
            extensions: ["wav", "mp3", "flac"],
          },
        ],
      });

      if (filePath) {
        await invoke("add_beat", { filePath: filePath.toString() });
        onTriggerRefresh();
      } else {
        console.log("No file selected");
      }
    } catch (error) {
      console.error("Error adding beat:", error);
      message("Failed to add beat. Please try again.");
    }
  }

  async function handleEditBeat() {
    try {
      setIsEditing(true);
      onEditBeat();
      await message("Edit Beat", "TODO: Not yet implemented.");
    } catch (error) {
      console.error("Error editing beat:", error);
      message("Failed to edit beat. Please try again.");
    }
  }

  async function handleDelete() {
    try {
      onDeleteBeat();
    } catch (error) {
      console.error("Error deleting beat:", error);
      message("Failed to delete beat. Please try again.");
    }
  }

  function handleNewSetClick() {
    setIsAddingNewSet(true);
  }

  async function handleAddNewSet() {
    const trimmedSetName = newSetName.trim();

    if (trimmedSetName) {
      // Check if a set with the same name already exists
      const setExists = sets.includes(trimmedSetName);

      if (setExists) {
        // Show a message to the user if the set already exists
        await message("A set with this name already exists.");
      } else {
        try {
          onAddNewSet(trimmedSetName);
          await invoke("add_set", { name: trimmedSetName });
          setNewSetName("");
          setIsAddingNewSet(false);
        } catch (error) {
          console.error("Error adding new set:", error);
          message("Failed to add new set. Please try again.");
        }
      }
    } else {
      await message("Set name cannot be empty.");
    }
  }

  const handleRefresh = async () => {
    try {
      onTriggerRefresh();
      await message("TODO: Not yet implemented.");
    } catch (error) {
      console.error("Error refreshing:", error);
      message("Failed to refresh. Please try again.");
    }
  };

  // const handleSettings = async () => {
  //   try {
  //     await message("TODO: Not yet implemented.");
  //   } catch (error) {
  //     console.error("Error opening settings:", error);
  //     message("Failed to open settings. Please try again.");
  //   }
  // };

  const handleAddToSet = async (setName: string) => {
    try {
      console.log(`Adding to set: ${setName}`);
      await invoke("add_to_set", { setName });
    } catch (error) {
      console.error(`Error adding to set ${setName}:`, error);
      message(`Failed to add to set ${setName}. Please try again.`);
    }
  };

  return (
    <header className="flex flex-wrap w-full text-white shadow-md items-center px-4 py-2">
      {/* Buttons */}
      <div className="flex flex-wrap justify-start space-x-2 md:space-x-4 mb-2 lg:mt-1 lg:mb-1">
        <HeaderButton onClick={handleAddBeat}>Add Beat</HeaderButton>
        <HeaderButton onClick={handleEditBeat}>Edit Beat</HeaderButton>
        <HeaderButton onClick={handleDelete}>Delete</HeaderButton>

        {isAddingNewSet ? (
          <div className="flex space-x-2">
            <input
              type="text"
              value={newSetName}
              onChange={(e) => setNewSetName(e.target.value)}
              placeholder="New set name"
              className="p-2 rounded text-black"
            />
            <button
              onClick={handleAddNewSet}
              className="bg-green-500 text-white font-bold py-2 px-4 rounded"
            >
              Add
            </button>
          </div>
        ) : (
          <HeaderButton onClick={handleNewSetClick}>New Set</HeaderButton>
        )}
      </div>

      <div className="justify-center px-6 space-x-5 ml-3 flex">
        <IconHeaderButton onClick={handleRefresh}>
          <RefreshCcw size={20} width={20} />
        </IconHeaderButton>
        <SettingsDropdown sets={sets} onAddToSet={handleAddToSet} />
      </div>

      {/* Search bar */}
      <div className="w-full md:w-auto flex-grow flex justify-end">
        <div className="w-full max-w-[300px]">
          {!isAddingNewSet && <SearchBar />}
        </div>
      </div>
    </header>
  );
};

const HeaderButton: React.FC<HeaderButtonProps> = ({ onClick, children }) => (
  <button
    className="text-white font-bold py-2 px-4 rounded w-28 h-10 text-sm"
    onClick={onClick}
  >
    {children}
  </button>
);

const IconHeaderButton: React.FC<HeaderButtonProps> = ({
  onClick,
  children,
}) => (
  <button
    className="text-white font-bold justify-center items-center rounded text-sm bg-blue-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-600"
    onClick={onClick}
  >
    {children}
  </button>
);

export default Header;
