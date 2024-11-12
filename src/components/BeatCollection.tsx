import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import BeatTable from './BeatTable';
import { useBeats } from '../hooks/useBeats';
import { Beat} from '../bindings';
import { DragEndEvent } from '@dnd-kit/core';

interface BeatCollProps {
onDragEnd: (event: DragEndEvent) => void;
onBeatPlay: (beat: Beat) => void;
isEditing: boolean;
setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
selectedBeat: Beat | null;
setSelectedBeat: React.Dispatch<React.SetStateAction<Beat | null>>;
saveRowOrder: (beatsToSave: Beat[]) => Promise<void>;
saveCollectionOrder: (collectionId: number, beatsToSave: Beat[]) => Promise<void>;
beats: Beat[];
}

const BeatCollectionComponent: React.FC<BeatCollProps> = ({
  onDragEnd, onBeatPlay, isEditing, setIsEditing, selectedBeat, 
  setSelectedBeat, saveRowOrder, saveCollectionOrder, beats
}) => {
  const { id } = useParams<{ id: string }>();
  const {
    setCollectionBeats,
    currentCollection,
    loading,
    error,
    fetchSetData,
    columnVisibility,
    setColumnVisibility,
  } = useBeats();

  useEffect(() => {
    if (id) {
      console.log('Fetching data for collection:', id);
      fetchSetData(parseInt(id));
    }
  }, [id, fetchSetData]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!currentCollection) return <div>No collection found</div>;

  const handleBeatsChange = (newBeats: Beat[]) => {
    console.log('Collection beats changed:', newBeats);
    setCollectionBeats(newBeats);
  };

  return (
    <div>
      <h2>{currentCollection.set_name}</h2>
      <p>Venue: {currentCollection.venue || 'N/A'}</p>
      <p>Date Played: {currentCollection.date_played || 'N/A'}</p>
      <BeatTable
        beats={beats}
        onBeatSelect={(beat: Beat) => setSelectedBeat(beat)}
        onBeatPlay={onBeatPlay}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        selectedBeat={selectedBeat}
        setSelectedBeat={setSelectedBeat}
        fetchSetData={fetchSetData}
        onBeatsChange={handleBeatsChange}
        columnVisibility={columnVisibility}
        setColumnVisibility={setColumnVisibility}
        //onAddBeatToCollection={handleAddBeatToCollection}
        onDragEnd={onDragEnd}
        saveRowOrder={saveRowOrder}
        saveCollectionOrder={saveCollectionOrder}
      />
    </div>
  );
};

export default BeatCollectionComponent;