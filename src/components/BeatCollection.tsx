import React, { useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import BeatTable from './BeatTable';
import { useBeats } from '../hooks/useBeats';
import { Beat, BeatCollection } from '../bindings';
import { DragEndEvent } from '@dnd-kit/core';
import { invoke } from "@tauri-apps/api/tauri";

interface BeatCollProps {
  beats: Beat[];
  currentCollection?: BeatCollection | null;
  onDragEnd: (event: DragEndEvent) => void;
  onBeatPlay: (beat: Beat) => void;
  isEditing: boolean;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  selectedBeats: Beat[];
  setSelectedBeats: React.Dispatch<React.SetStateAction<Beat[]>>;
  saveRowOrder: (beatsToSave: Beat[]) => Promise<void>;
  saveCollectionOrder: (collectionId: number, beatsToSave: Beat[]) => Promise<void>;
  fetchData: () => void;
  fetchSetData: (setId: number) => Promise<void>;
  showEditColumnsDialog: boolean;
  setShowEditColumnsDialog: (show: boolean) => void;
  handleRefresh: () => void;

}

const BeatCollectionComponent: React.FC<BeatCollProps> = ({
  beats,
  currentCollection,
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
  fetchSetData,
  handleRefresh,
}) => {
  const { id } = useParams<{ id: string }>();
  const {
    setCollectionBeats,
    loading,
    error,
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

  if (loading) return <div className="p-4"></div>;
  if (error) return <div className="p-4 text-red-500">Error: {error.message}</div>;
  if (!currentCollection) return <div className="p-4">No collection found</div>;

  return (
    <>
      <div className="mb-6 flex w-full justify-between">
        <h2 className="text-2xl font-bold pl-0 pb-0">{currentCollection.set_name}</h2>
        <div className="mt-4 flex">
          <div className="mr-4">
            Venue: {currentCollection.venue || 'N/A'}
          </div>
          <div>
            Date Played: {currentCollection.date_played || 'N/A'}
          </div>
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
        handleRefresh={handleRefresh}
      />
    </>
  );
};

export default BeatCollectionComponent;