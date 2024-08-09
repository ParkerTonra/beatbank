import SearchBar from "./SearchBar";
import { message, open } from '@tauri-apps/api/dialog';
import { invoke } from "@tauri-apps/api";
import { useState } from "react";


interface HeaderButtonProps {
  onClick: () => void;
  children: React.ReactNode;
}

interface HeaderProps {
  onAddNewSet: (setName: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onAddNewSet }) => {
  const [isAddingNewSet, setIsAddingNewSet] = useState(false);
  const [newSetName, setNewSetName] = useState('');

  async function handleAddBeat() {
    const filePath = await open({
      filters: [{
        name: 'Audio Files',
        extensions: ['wav', 'mp3', 'flac']
      }]
    });
    console.log(filePath);
    invoke('add_beat', { file_path: filePath });
  }

  async function handleEditBeat() {
    console.log("Edit Beat clicked");
    const msg = await message("Edit Beat", "TODO: Not yet implemented.");
    console.log(msg);
  }

  async function handleDelete() {
    console.log("Delete clicked");
    const msg = await message("Delete Beat", "TODO: Not yet implemented.");
    console.log(msg);
  }

  function handleNewSetClick() {
    setIsAddingNewSet(true);
  }

  function handleAddNewSet() {
    if (newSetName.trim()) {
      onAddNewSet(newSetName.trim());
      invoke('add_set', { name: newSetName.trim() });
      setNewSetName('');
      setIsAddingNewSet(false);
    }
  }

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
   
      {/* Search bar */}
      <div className="w-full md:w-auto flex-grow flex justify-end">
        <div className="w-full max-w-md">
          <SearchBar />
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

export default Header;
