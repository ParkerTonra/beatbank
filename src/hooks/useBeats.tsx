import { useState, useCallback, Dispatch, SetStateAction } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { Beat } from "./../bindings";

const defaultColumnVisibility = {
  title: true,
  bpm: true,
  key: true,
  duration: true,
  artist: false,
  date_added: false,
  file_path: false,
  id: false
};

export const useBeats = () => {
    const [beats, setBeats]: [Beat[], Dispatch<SetStateAction<Beat[]>>] =
    useState<Beat[]>([]);
  const [columnVisibility, setColumnVisibility] = useState(
    defaultColumnVisibility
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [setName, setSetName] = useState('');

  const fetchData = useCallback(async () => {
    console.log("Fetching data...");
    setLoading(true);
    setError(null);
    try {
      const [beatsResult, columnVisResult] = await Promise.all([
        invoke<string>("fetch_beats"),
        invoke<string>("fetch_column_vis"),
      ]);

      const beats = JSON.parse(beatsResult);
      setBeats(beats);

      let columnVis = JSON.parse(columnVisResult);
      if (columnVis && typeof columnVis === "object" && "0" in columnVis) {
        columnVis = columnVis[0];
      }

      setColumnVisibility({ ...defaultColumnVisibility, ...columnVis });
    } catch (error) {
      setError(error as Error);
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSetData = useCallback(async (setId: number) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch set name
      const name = await invoke('get_set_name', { id: setId });
      setSetName(typeof name === 'string' ? name : 'Unknown Set');

      // Fetch beat set data
      const response = await invoke('get_beat_set', { setId });
      const fetchedBeats = typeof response === 'string' ? JSON.parse(response) : response;

      console.log('Received beat set:', fetchedBeats);
      if (Array.isArray(fetchedBeats)) {
        setBeats(fetchedBeats);
      } else {
        console.error('Unexpected response format:', fetchedBeats);
        setError(new Error('Received invalid data format for beat set.'));
        setBeats([]);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(new Error('An error occurred while fetching data.'));
      setBeats([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    beats,
    setBeats,
    columnVisibility,
    setColumnVisibility,
    loading,
    error,
    fetchData,
    fetchSetData,
    setName,
  };
};
