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
  }, []); // No dependencies, meaning it will be memoized once

  return {
    beats,
    columnVisibility,
    loading,
    error,
    fetchData,
    setBeats,
    setColumnVisibility,
  };
};
