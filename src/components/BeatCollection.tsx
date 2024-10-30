import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import BeatTable from './BeatTable';
import { useBeats } from '../hooks/useBeats';
import { Beat, RowOrder } from '../bindings';
import { DragEndEvent } from '@dnd-kit/core';

interface BeatCollProps {
  onDragEnd: (event: DragEndEvent) => void;
  onBeatPlay: (beat: Beat) => void;
  isEditing: boolean;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  selectedBeat: Beat | null;
  setSelectedBeat: React.Dispatch<React.SetStateAction<Beat | null>>;
}

const BeatCollectionComponent: React.FC<BeatCollProps> = ({ onDragEnd, onBeatPlay, isEditing, setIsEditing, selectedBeat, setSelectedBeat }) => {
  const { id } = useParams<{ id: string }>();
  const { 
    beats, 
    currentCollection, 
    loading, 
    error, 
    fetchSetData, 
    columnVisibility, 
    setColumnVisibility 
  } = useBeats();


  useEffect(() => {
    if (id) {
      console.log('Fetching data for collection:', id);
      fetchSetData(parseInt(id));
    }
  }, [id, fetchSetData]);

  useEffect(() => {
    console.log('Beats updated:', beats);
  }, [beats]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!currentCollection) return <div>No collection found</div>;

  const handleBeatsChange = (newBeats: Beat[]) => {
    // Implement this function to update beats in your state management
    console.log('Beats changed:', newBeats);
  };

  const handleAddBeatToCollection = (beatId: number, collectionId: number) => {
    // Implement this function to add a beat to a collection
    console.log('Adding beat to collection:', beatId, collectionId);
  };

  const saveCollectionOrder = async (beatsToSave: Beat[]) => {
    if (!beatsToSave.length) return;

    const rowOrder: CollOrder[] = beatsToSave.map((beat, index) => ({
      row_id: beat.id,
      row_number: index + 1
    }));

    try {
      await invoke("save_row_order", { rowOrder });
      console.log("Row order saved successfully");

    } catch (error) {
      // Could add a toast notification here
      console.error("Error saving row order:", error);
      setBeats(beats);
    }
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
        onAddBeatToCollection={handleAddBeatToCollection}
        onDragEnd={onDragEnd}
        saveRowOrder={saveCollectionOrder}
      />
    </div>
  );
};

export default BeatCollectionComponent;