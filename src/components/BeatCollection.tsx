import React, { useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import BeatTable from './BeatTable';
import { useBeats } from '../hooks/useBeats';
import { Beat, BeatCollection } from '../bindings';
import { DragEndEvent } from '@dnd-kit/core';
import { invoke } from "@tauri-apps/api/tauri";
import { SortingState } from '@tanstack/react-table';

interface BeatCollProps {
  beats: Beat[];
  currentCollection?: BeatCollection | null;
  onDragEnd: (event: DragEndEvent) => void;
  onBeatPlay: (beat: Beat) => void;
  isEditing: boolean;
  isEditingSet: boolean;
  isCreatingSet: boolean;
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
  setIsSorting: (isSorting: boolean) => void;
  sorting: SortingState;
  setSorting: (sorting: SortingState) => void;
}

const BeatCollectionComponent: React.FC<BeatCollProps> = ({
  beats,
  currentCollection,
  onDragEnd,
  onBeatPlay,
  isEditing,
  isEditingSet,
  isCreatingSet,
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
  setIsSorting,
  sorting,
  setSorting,
}) => {
  const { id } = useParams<{ id: string }>();
  const {
    collectionBeats,
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

  const formatDate = (date: string | null | undefined) => {
    console.log('Formatting date:', date);
    if (date === null || date === undefined) {
      return 'N/A';
    }
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

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
      <div className="w-full flex items-center justify-between px-4 min-h-[64px] bg-gray-700 rounded-xl my-4 bg-opacity-80 backdrop-blur-3xl shadow-sm">
        <h2 className="text-2xl font-bold text-white truncate max-w-[300px] flex items-center m-0 p-0">
          {currentCollection.set_name}
        </h2>

        <div className="flex items-center gap-8 xl:gap-12 text-md">
          {/* Always visible - even on small screens */}
          <div className="flex items-center whitespace-nowrap">
            <span className="text-gray-400 mr-2">Beats:</span>
            <span>{collectionBeats.length}</span>
          </div>

          {/* Hidden on screens smaller than 1280px */}
          <div className="hidden xl:flex items-center gap-8">
            <div className="whitespace-nowrap">
              <span className="text-gray-400 mr-2 text">Venue:</span>
              <span>{currentCollection.venue || 'N/A'}</span>
            </div>

            <div className="whitespace-nowrap">
              <span className="text-gray-400 mr-2">Date:</span>
              <span>{formatDate(currentCollection?.date_played)}</span>
            </div>

            <div className="whitespace-nowrap">
              <span className="text-gray-400 mr-2">City:</span>
              <span>{currentCollection.city || 'N/A'}</span>
            </div>

            <div className="whitespace-nowrap">
              <span className="text-gray-400 mr-2">State:</span>
              <span>{currentCollection.state_name || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>


      <BeatTable
        beats={beats}
        onBeatPlay={onBeatPlay}
        isEditing={isEditing}
        isEditingSet={isEditingSet}
        isCreatingSet={isCreatingSet}
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
        setIsSorting={setIsSorting}
        sorting={sorting}
        setSorting={setSorting}
      />
    </>
  );
};

export default BeatCollectionComponent;