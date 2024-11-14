import React, { useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import BeatTable from './BeatTable';
import { useBeats } from '../hooks/useBeats';
import { Beat } from '../bindings';
import { DragEndEvent } from '@dnd-kit/core';
import { invoke } from "@tauri-apps/api/tauri";

interface BeatCollProps {
  onDragEnd: (event: DragEndEvent) => void;
  onBeatPlay: (beat: Beat) => void;
  isEditing: boolean;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  selectedBeats: Beat[];
  setSelectedBeats: React.Dispatch<React.SetStateAction<Beat[]>>;
  saveRowOrder: (beatsToSave: Beat[]) => Promise<void>;
  saveCollectionOrder: (collectionId: number, beatsToSave: Beat[]) => Promise<void>;
  fetchData: () => void;
  showEditColumnsDialog: boolean;
  setShowEditColumnsDialog: (show: boolean) => void;
  beats: Beat[];

}

const BeatCollectionComponent: React.FC<BeatCollProps> = ({
  beats,
  onDragEnd,
  onBeatPlay,
  isEditing,
  setIsEditing,
  selectedBeats,
  setSelectedBeats,
  saveRowOrder,
  saveCollectionOrder,
  showEditColumnsDialog,
  setShowEditColumnsDialog,
  fetchData,
}) => {
  const { id } = useParams<{ id: string }>();
  const {
    collectionBeats,
    setCollectionBeats,
    currentCollection,
    loading,
    error,
    fetchSetData,
    columnVisibility,
    setColumnVisibility,
  } = useBeats();

  // Create a memoized refresh function that includes all necessary data fetching
  const refreshCollectionData = useCallback(async () => {
    console.log('Refreshing collection data...');
    if (!id) {
      console.error('No collection ID found');
      return;
    }

    const collectionId = parseInt(id);
    console.log('Refreshing collection data for ID:', collectionId);

    try {
      // Fetch both collection and beats data
      const [collectionResponse, beatsResponse] = await Promise.all([
        invoke<any>('get_beat_collection', { id: collectionId }),
        invoke<Beat[]>('get_beats_in_collection', { id: collectionId })
      ]);

      console.log('Collection refresh response:', { collection: collectionResponse, beats: beatsResponse });

      // Update collection beats state
      if (Array.isArray(beatsResponse)) {
        setCollectionBeats(beatsResponse);
      }

      // Force a re-fetch of the main data to keep everything in sync
      fetchSetData(collectionId);
    } catch (err) {
      console.error('Error refreshing collection data:', err);
    }
  }, [id, setCollectionBeats, fetchSetData]);

  // Initial data fetch
  useEffect(() => {
    if (id) {
      refreshCollectionData();
    }
  }, [id, refreshCollectionData]);

  const handleCollectionUpdate = useCallback(async () => {
    console.log('Handling collection update...');
    if (fetchData) {
      fetchData(); // This will now trigger the route refresh
    }
  }, [fetchData]);

  // Custom handler for beat selection that works specifically for collections
  const handleBeatSelect = useCallback((beat: Beat) => {
    setSelectedBeats(prev => {
      const exists = prev.some(b => b.id === beat.id);
      if (exists) {
        return prev.filter(b => b.id !== beat.id);
      }
      return [...prev, beat];
    });
  }, [setSelectedBeats]);

  

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error.message}</div>;
  if (!currentCollection) return <div className="p-4">No collection found</div>;

  return (
    <div className="p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">{currentCollection.set_name}</h2>
        <div className="grid grid-cols-2 gap-4">
          <p>Venue: {currentCollection.venue || 'N/A'}</p>
          <p>Date Played: {currentCollection.date_played || 'N/A'}</p>
        </div>
      </div>

      <BeatTable
        beats={beats}
        onBeatPlay={onBeatPlay}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        selectedBeats={selectedBeats}
        setSelectedBeats={setSelectedBeats}
        fetchData={handleCollectionUpdate}
        fetchSetData={fetchSetData}
        columnVisibility={columnVisibility}
        setColumnVisibility={setColumnVisibility}
        onDragEnd={onDragEnd}
        saveRowOrder={saveRowOrder}
        saveCollectionOrder={saveCollectionOrder}
        showEditColumnsDialog={showEditColumnsDialog}
        setShowEditColumnsDialog={setShowEditColumnsDialog}
      />
    </div>
  );
};

export default BeatCollectionComponent;