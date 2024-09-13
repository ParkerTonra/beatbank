import React, {  useEffect } from 'react';
import BeatTable from 'components/BeatTable';
import { Beat } from 'src/bindings';
import { useBeats } from 'src/hooks/useBeats';

interface HomeProps {
  onBeatSelect: (beat: Beat) => void;
  onBeatPlay: (beat: Beat) => void;
  onTriggerRefresh: () => void;
  isEditing: boolean;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  selectedBeat: Beat | null;
  setSelectedBeat: React.Dispatch<React.SetStateAction<Beat | null>>;
}

const Home: React.FC<HomeProps> = ({
  onBeatPlay,
  onBeatSelect,
  isEditing,
  setIsEditing,
  selectedBeat,
  setSelectedBeat,
  onTriggerRefresh
}) => {
  const {
    beats,
    columnVisibility,
    loading,
    error,
    fetchData,
    setBeats,
    setColumnVisibility,
  } = useBeats();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBeatsChange = (newBeats: Beat[]) => {
    setBeats(newBeats);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="p-4 h-full w-full bg-secondary">
      <BeatTable
        beats={beats}
        onBeatPlay={onBeatPlay}
        onBeatSelect={onBeatSelect}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        selectedBeat={selectedBeat}
        setSelectedBeat={setSelectedBeat}
        onTriggerRefresh={onTriggerRefresh}
        onBeatsChange={handleBeatsChange}
        columnVisibility={columnVisibility}
        setColumnVisibility={setColumnVisibility}
      />
    </div>
  );
};

export default Home;