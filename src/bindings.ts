// TODO: update to new schema
export type Beat = {
  id: number;
  title: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: number;
  track_number?: number;
  duration?: number;
  composer?: string;
  lyricist?: string;
  cover_art?: string;
  comments?: string;
  file_path: string;
  bpm?: number | undefined;
  musical_key?: string;
  row_order?: number;
};

export type BeatCollection = {
  id: number;
  set_name: string;
  venue?: string;
  city?: string;
  state_name?: string;
  date_played?: string;
  date_created?: string;
};

export type CollectionChangeset = {
  id: number;            // Make this required since it's for changes
  set_name?: string | null;    // Optional with null
  venue?: string | null;       // Optional with null
  city?: string | null;        // Optional with null
  state_name?: string | null;  // Optional with null
  date_played?: string | null; // Optional with null for timestamp
};

export type ColumnVis = {
  title: boolean;
  bpm: boolean;
  musical_key: boolean;
  duration: boolean;
  artist: boolean;
  date_added: boolean;
  file_path: boolean;
  id: boolean;
  genre: boolean;
  row_order: boolean;
}

export type EditThisBeat = {
  id: number;
  title: string;
  bpm?: number;
  musical_key?: string;
  duration?: number;
  artist?: string;
  comments?: string;
  album?: string;
  year?: number;
  track_number?: number;
  composer?: string;
  lyricist?: string;
  cover_art?: string;
  file_path?: string;
  genre?: string;
}

export type BeatInCollection = {
  beat_id: number;
  beat_collection_id: number;
}

export interface RowOrder {
  row_id: number;
  row_number: number;
}

export interface CollOrder {
  beat_id: number;
  collection_order: number;
}

export interface ColumnVisibility {
  title: boolean;
  bpm: boolean;
  musical_key: boolean;
  duration: boolean;
  artist: boolean;
  date_added: boolean;
  file_path: boolean;
  id: boolean;
  genre: boolean;
  row_order: boolean;
}

export interface ColumnVisibilityState {
  title: boolean;
  bpm: boolean;
  musical_key: boolean;
  duration: boolean;
  artist: boolean;
  date_added: boolean;
  file_path: boolean;
  id: boolean;
  genre: boolean;
  row_order: boolean;
}

export type AudioExtension = 'flac' | 'wav' | 'mp3' | 'ogg' | 'm4a' | 'aac' | 'aiff' | 'wma';
export type TempoDetectionExtension = 'flac' | 'wav' | 'mp3';