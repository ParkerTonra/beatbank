import React, { useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import BeatTable from './BeatTable';
import { useBeats } from '../hooks/useBeats';
import { Beat, BeatCollection } from '../bindings';
import { DragEndEvent } from '@dnd-kit/core';
import { invoke } from "@tauri-apps/api/tauri";
import { format } from "date-fns";

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
    if (date === null || date === undefined) {
      return 'N/A';
    }
    const dateObj = new Date(date);
    return format(dateObj, "yyyy-MM-dd");
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
      <div className="w-full px-4 min-h-[64px] bg-gray-700 rounded-xl my-4 bg-opacity-80 backdrop-blur-3xl shadow-sm flex justify-between">
        <div className="text-2xl max-w-[350px] min-w-[250px] font-bold text-white truncate m-0 mr-2 py-4">
          {currentCollection.set_name}
        </div>

        <div className="flex justify-between text-md max-w-[calc(100%-350px)]">
          {/* Always visible - even on small screens */}
          <div className="flex items-center whitespace-nowrap mr-4">
            <span className="text-gray-400 mr-1">Beats:{" "}</span>
            <span>{collectionBeats.length}</span>
          </div>

        {/*  /!* Hidden on screens smaller than 1280px *!/*/}
          <div className="hidden xl:flex justify-end w-fit max-w-[90%] items-center">
            <div className="truncate max-w-[30%] mr-4">
              <span className="text-gray-400 mr-1 text">Venue:</span>
              <span>{currentCollection.venue || 'N/A'}</span>
            </div>
            <div className="truncate max-w-[25%] mr-4">
              <span className="text-gray-400 mr-1">City:</span>
              <span>{currentCollection.city || 'N/A'}</span>
            </div>
            <div className="truncate max-w-[25%] mr-4">
              <span className="text-gray-400 mr-1">State:</span>
              <span>{currentCollection.state_name || 'N/A'}</span>
            </div>
            <div className="w-fit whitespace-nowrap">
              <span className="text-gray-400 mr-1">Date:</span>
              <span>{formatDate(currentCollection?.date_played)}</span>
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
      />
    </>
  );
};

export default BeatCollectionComponent;