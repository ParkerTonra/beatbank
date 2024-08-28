export type Beat = {
    id: number;
    title: string;
    bpm: number;
    key: string;
    duration: string;
    artist: string;
    date_added: string;
    file_path: string;
  };

export type BeatSet = {
  id: number
  setName: string;
}

  export type ColumnVis = {
    id: boolean;
    title: boolean;
    bpm: boolean;
    key: boolean;
    duration: boolean;
    artist: boolean;
    date_added: boolean;
    file_path: boolean;
};