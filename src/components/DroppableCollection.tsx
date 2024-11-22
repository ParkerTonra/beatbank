import { useDroppable, useDndContext } from '@dnd-kit/core';
import { useLocation, useNavigate } from 'react-router-dom';
import { Beat, BeatCollection } from '../bindings';

interface DroppableCollectionProps {
  collection: BeatCollection;
  setSelectedBeats: (beats: Beat[]) => void;
}

const DroppableCollection: React.FC<DroppableCollectionProps> = ({
  collection,
  setSelectedBeats,
}) => {

  const location = useLocation();
  const setId = location.pathname.split("/").pop();
  const { isOver, setNodeRef } = useDroppable({
    id: `collection-${collection.id}`,
  });

  const { active } = useDndContext();
  const navigate = useNavigate();

  const handleClick = () => {
    if (active) {
      return;
    }
    setSelectedBeats([]);
    navigate(`/collection/${collection.id}`);
  };

  return (
    <button
      ref={setNodeRef}
      onClick={handleClick}
      
      className={`${setId === collection.id.toString() 
          ? "bg-gray-600" 
          : "bg-gray-700"
        } p-2 rounded hover:bg-gray-600 transition duration-200 cursor-pointer w-full text-left mb-2
        ${isOver ? 'border-2 border-green-500' : ''}
      `}
      draggable={false}
    >
      {collection.set_name}
    </button>
  );
};

export default DroppableCollection;