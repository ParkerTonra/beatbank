//Sidebar.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

interface SidebarProps {
  iconPath: string;
  sets: { id: number; name: string }[];
  addNewSet: (setName: string) => void;
  deleteSet: (setId: number) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ iconPath, sets, addNewSet, deleteSet }) => {
  const navigate = useNavigate();
  const [hoveredSet, setHoveredSet] = useState<number | null>(null);

  const handleSetClick = (setId: number) => {
    navigate(`/set/${setId}`);
  };

  const handleDeleteClick = (event: React.MouseEvent, setId: number) => {
    event.stopPropagation();
    deleteSet(setId);
  };

  return (
    <div className="h-full flex flex-col border-[8px] rounded bg-gray-800 w-56 border-gray-900 border-opacity-55 p-1.5">
      {/* Title and Icon */}
      <div className="w-36 md:w-auto flex justify-center items-center my-2 md:my-0 ml-16 md:ml-0">
        <div className="flex items-center">
          <img className="w-8 h-8" alt="icon" src={iconPath} />
          <h1 className="text-xl text-nowrap font-bold py-3">Beat Bank</h1>
          <img className="w-8 h-8" alt="icon" src={iconPath} />
        </div>
      </div>
      {/* Links */}
      <Link to="/" className="py-2">
        <button type="button" className="w-full">Home</button>
      </Link>
      <Link to="/bank" className="py-2">
        <button type="button" className="w-full">My Beats</button>
      </Link>
      <Link to="/search" className="py-2">
        <button type="button" className="w-full">Search</button>
      </Link>
      {/* Dynamic Sets */}
      {sets.map((set) => (
        <div
          key={set.id}
          className="relative group" // Added group class
          onMouseEnter={() => setHoveredSet(set.id)}
          onMouseLeave={() => setHoveredSet(null)}
        >
          <button 
            type="button" 
            className="w-full py-2 text-left px-2 flex items-center justify-between"
            onClick={() => handleSetClick(set.id)}
          >
            <span>{set.name}</span>
            {hoveredSet === set.id && (
              <button
                className="ml-2"
                onClick={(e) => handleDeleteClick(e, set.id)}
              >
                <X size={16} />
              </button>
            )}
          </button>
        </div>
      ))}
    </div>
  );
};

export default Sidebar;
