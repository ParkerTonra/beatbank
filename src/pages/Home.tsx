import BeatTable from 'components/BeatTable';
import { Beat } from 'src/bindings';

interface HomeProps {
  onBeatPlay: (beat: Beat) => void;
}

const Home: React.FC<HomeProps> = ({ onBeatPlay }) => {

  return (
    <div className="p-4 h-full w-full bg-secondary border">
      <BeatTable onBeatPlay={onBeatPlay} />
    </div>
  );
};

export default Home;
