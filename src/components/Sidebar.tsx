import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { X, Star, Home } from "lucide-react";
import { BeatSet } from "src/bindings";

interface SidebarProps {
  iconPath: string;
  beatSets: BeatSet[];
  addNewSet: (setName: string) => void;
  deleteSet: (setId: number) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  iconPath,
  beatSets,
  deleteSet,
}) => {
  const navigate = useNavigate();
  const [hoveredSet, setHoveredSet] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSetClick = (setId: number) => {
    navigate(`/set/${setId}`);
  };

  const handleDeleteClick = (event: React.MouseEvent, setId: number) => {
    event.stopPropagation();
    deleteSet(setId);
  };


  const handleCloseError = () => {
    setError(null);
  };

  return (
    <div className="h-full flex flex-col border-[8px] rounded bg-gray-800 w-56 border-gray-900 border-opacity-55 p-1.5">
      {/* Title and Icon */}
      <div className="w-24 md:w-auto flex justify-center items-center my-2 md:my-0 ml-16 md:ml-0">
        <div className="flex items-center">
          <img className="w-8 h-8" alt="icon" src={iconPath} />
          <h1 className="text-xl text-nowrap font-bold py-3">Beat Bank</h1>
          <img className="w-8 h-8" alt="icon" src={iconPath} />
        </div>
      </div>

      {/* Links */}
      <button type="button" className="py-2 my-2 h-10 flex justify-center items-center">
        <Link to="/" className="py-2 flex justify-center items-center">
          <Home className="mr-1" /> <span className="px-4">Home</span>
        </Link>
      </button>
      <button type="button" className="py-2 my-2 h-10 flex justify-center items-center">
        <Link to="/bank" className="py-2 flex justify-center items-center">
          <Star className="mr-1" /> <span className="px-2">Favorites</span>
        </Link>
      </button>

      <div className="border-2 my-2"></div>

      {/* Dynamic Sets */}
      {beatSets.map((set) => (
        <div
          key={set.id}
          className="relative group my-2 flex items-center justify-center"
          onMouseEnter={() => setHoveredSet(set.id)}
          onMouseLeave={() => setHoveredSet(null)}
        >
          <button
            type="button"
            className="w-full py-2 text-center px-2 flex items-center justify-center"
            onClick={() => handleSetClick(set.id)}
          >
            <span>{set.setName}</span>
          </button>
          {hoveredSet === set.id && (
            <button
              className="ml-2 p-1"
              onClick={(e) => handleDeleteClick(e, set.id)}
              aria-label={`Delete ${set.setName}`}
            >
              <X size={16} />
            </button>
          )}
        </div>
      ))}

      {/* Error Dialog */}
      {error && (
        <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-4 rounded">
            <p>{error}</p>
            <button
              onClick={handleCloseError}
              className="mt-2 bg-red-500 text-white py-1 px-3 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
