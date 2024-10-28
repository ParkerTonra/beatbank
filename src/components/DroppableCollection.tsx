import { useDroppable, useDndContext } from '@dnd-kit/core';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { BeatCollection } from '../bindings';

interface DroppableCollectionProps {
  collection: BeatCollection;
}

const DroppableCollection: React.FC<DroppableCollectionProps> = ({ collection }) => {

  const location = useLocation();
  const setId = location.pathname.split("/").pop()
  const { isOver, setNodeRef } = useDroppable({
    id: `collection-${collection.id}`,
  });

  const { active } = useDndContext();
  const navigate = useNavigate();

  const handleClick = () => {
    if (active) {
      console.log("Preventing navigation")
      return;
    }
    navigate(`/collection/${collection.id}`);
  };

  return (
    <li
      ref={setNodeRef}
      onClick={handleClick}
      className={`${setId == collection.id ? "bg-gray-600" : "bg-gray-700"} p-2 rounded hover:bg-gray-600 transition duration-200 cursor-pointer ${
        isOver ? 'border-2 border-green-500' : ''
      }`}
    >
      {collection.set_name}
    </li>
  );
};

export default DroppableCollection;