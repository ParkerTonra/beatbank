import React, { useState } from 'react';
import { Beat } from "../bindings";

// Custom hook for managing multiple beat selections
const useMultiSelect = () => {
  const [selectedBeats, setSelectedBeats] = useState<Beat[]>([]);

  const toggleBeatSelection = (beat: Beat, event?: React.MouseEvent) => {
    if (event?.ctrlKey || event?.metaKey) {
      // Toggle individual selection
      setSelectedBeats(prev => 
        prev.some(b => b.id === beat.id)
          ? prev.filter(b => b.id !== beat.id)
          : [...prev, beat]
      );
    } else if (event?.shiftKey && selectedBeats.length > 0) {
      // Range selection
      const lastSelected = selectedBeats[selectedBeats.length - 1];
      // You'll need to pass the full beats array to this function
      // and implement the range selection logic based on your needs
    } else {
      // Single selection (replaces current selection)
      setSelectedBeats([beat]);
    }
  };

  const clearSelection = () => {
    setSelectedBeats([]);
  };

  const selectAll = (beats: Beat[]) => {
    setSelectedBeats(beats);
  };

  return {
    selectedBeats,
    setSelectedBeats,
    toggleBeatSelection,
    clearSelection,
    selectAll
  };
};

export default useMultiSelect;