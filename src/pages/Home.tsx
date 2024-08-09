import BeatTable from 'components/BeatTable';
import { Beat } from 'src/bindings';

interface HomeProps {
  onBeatSelect: (beat: Beat) => void;
  onBeatPlay: (beat: Beat) => void;
  refresh: boolean;
  onRefreshHandled: () => void;
}

const Home: React.FC<HomeProps> = ({ onBeatPlay, onBeatSelect, refresh, onRefreshHandled }) => {

  return (
    <div className="p-4 h-full w-full bg-secondary">
      <BeatTable onBeatPlay={onBeatPlay} onBeatSelect={onBeatSelect} refresh={refresh} onRefreshHandled={onRefreshHandled} />
    </div>
  );
};

export default Home;
