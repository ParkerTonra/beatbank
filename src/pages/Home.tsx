import BeatTable from 'components/BeatTable';
import { Beat } from 'src/bindings';

interface HomeProps {
  onBeatSelect: (beat: Beat) => void;
  onBeatPlay: (beat: Beat) => void;
  onTriggerRefresh: () => void;
  isEditing: boolean;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  selectedBeat: Beat | null;
  setSelectedBeat: React.Dispatch<React.SetStateAction<Beat | null>>;
}

const Home: React.FC<HomeProps> = ({ onBeatPlay, onBeatSelect, isEditing, setIsEditing, selectedBeat, setSelectedBeat , onTriggerRefresh }) => {

  return (
    <div className="p-4 h-full w-full bg-secondary">
      <BeatTable onBeatPlay={onBeatPlay} onBeatSelect={onBeatSelect} isEditing={isEditing} setIsEditing={setIsEditing} selectedBeat={selectedBeat} setSelectedBeat={setSelectedBeat} onTriggerRefresh={onTriggerRefresh} />
    </div>
  );
};

export default Home;
