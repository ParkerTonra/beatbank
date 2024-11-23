import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { Beat, BeatCollection } from "./../bindings";
import { VisibilityState } from "@tanstack/react-table";


const defaultColumnVisibility = {
  title: true,
  bpm: true,
  musical_key: true,
  duration: true,
  artist: false,
  date_added: false,
  file_path: false,
  id: false,
  genre: true,
};

export const useBeats = () => {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [collectionBeats, setCollectionBeats] = useState<Beat[]>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    title: true,
    bpm: true,
    musical_key: true,
    duration: true,
    artist: true,
    date_added: true,
    file_path: true,
    id: true,
    genre: true,
    row_order: true,
  });
  const [beatCollections, setBeatCollections] = useState<BeatCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentCollection, setCurrentCollection] = useState<BeatCollection | null>(null);

  const fetchColumnVisibility = useCallback(async () => {
    try {
      const columnVisResult = await invoke<string>("fetch_column_vis");
      let columnVis = JSON.parse(columnVisResult);
      if (columnVis && typeof columnVis === "object" && "0" in columnVis) {
        columnVis = columnVis[0];
      }
      setColumnVisibility({ ...defaultColumnVisibility, ...columnVis });
    } catch (error) {
      console.error("Error fetching column visibility:", error);
      // Fallback to default visibility on error
      setColumnVisibility(defaultColumnVisibility);
    }
  }, []);

  useEffect(() => {
    fetchColumnVisibility();
  }, []);

  // fetch sets, data, and column visibility for initialization
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    console.log("Fetching data...");
    try {
      const [beatsResult, collectionsResult] = await Promise.all([
        invoke<string>("fetch_beats"),
        //invoke<string>("fetch_column_vis"),
        invoke<string>("fetch_collections"),
      ]);
      const myBeats = JSON.parse(beatsResult);
      setBeats(myBeats);
      
      let myBeatCollections = JSON.parse(collectionsResult);
      setBeatCollections(myBeatCollections);
    } catch (error) {
      setError(error as Error);
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSetData = useCallback(async (setId: number) => {
    console.log("Fetching set data for ID:", setId);
    setLoading(true);
    setError(null);
    try {
      // Fetch beat collection data
      const collectionResponse = await invoke<BeatCollection>('get_beat_collection', { id: setId });
      console.log("Collection response:", collectionResponse);
      setCurrentCollection(collectionResponse);
     
      // Fetch beats in the collection
      const beatsResponse = await invoke<Beat[]>('get_beats_in_collection', { id: setId });
      console.log("Beats response:", beatsResponse);
      
      if (Array.isArray(beatsResponse)) {
        setCollectionBeats(beatsResponse);
      } else {
        console.error('Unexpected response format for beats:', beatsResponse);
        setError(new Error('Received invalid data format for beats.'));
        setCollectionBeats([]);
      }
    } catch (err) {
      console.error('Error fetching collection data:', err);
      setError(new Error('An error occurred while fetching data.'));
      setCollectionBeats([]);
      setCurrentCollection(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    beats,
    setBeats,
    collectionBeats,
    setCollectionBeats,
    beatCollections,
    setBeatCollections,
    currentCollection,
    loading,
    error,
    columnVisibility,
    setColumnVisibility,
    fetchData,
    fetchSetData,
    fetchColumnVisibility,
  };
};