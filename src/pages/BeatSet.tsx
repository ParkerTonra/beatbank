import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Beat } from '../bindings';
import BeatTable from '../components/BeatTable';
import { useBeats } from 'src/hooks/useBeats';
import { Edit } from 'lucide-react';
import { message } from '@tauri-apps/api/dialog';

interface BeatSetProps {
  onBeatSelect: (beat: Beat) => void;
  onBeatPlay: (beat: Beat) => void;
  onTriggerRefresh: () => void;
  isEditing: boolean;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  selectedBeat: Beat | null;
  setSelectedBeat: React.Dispatch<React.SetStateAction<Beat | null>>;
}

const BeatSetPage: React.FC<BeatSetProps> = ({
  onBeatPlay,
  onBeatSelect,
  isEditing,
  setIsEditing,
  selectedBeat,
  setSelectedBeat,
  onTriggerRefresh
}) => {
  const { id } = useParams<{ id: string }>();
  const {
    beats,
    setBeats,
    columnVisibility,
    loading,
    error,
    fetchSetData,
    setName,
    setColumnVisibility
  } = useBeats();


  useEffect(() => {
    if (id) {
      const numberId = parseInt(id, 10);
      fetchSetData(numberId);
    }
  }, [id, fetchSetData]);

  const handleBeatsChange = (newBeats: Beat[]) => {
    setBeats(newBeats);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="p-4 bg-gray-500">
      <div className='flex w-96 h-12 mx-4 gap-6 items-center text-2xl font-semibold text-gray-100'>
        Beat Set: {setName}
        {/* TODO: implement edit button to edit set name */}
        <Edit onClick={() => {
          message('Edit set name not implemented yet.')
        }} className='cursor-pointer' />

      </div>
      
      {beats.length === 0 ? (
        <p>No beats found in this set.</p>
      ) : (
        <BeatTable
          beats={beats}
          onBeatPlay={onBeatPlay}
          onBeatSelect={onBeatSelect}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          selectedBeat={selectedBeat}
          setSelectedBeat={setSelectedBeat}
          onTriggerRefresh={onTriggerRefresh}
          onBeatsChange={handleBeatsChange}
          columnVisibility={columnVisibility}
          setColumnVisibility={setColumnVisibility}
          //TODO: saveSetRowOrder={saveSetRowOrder}
        />
      )}
    </div>
  );
};

export default BeatSetPage;