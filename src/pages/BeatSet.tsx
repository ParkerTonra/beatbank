import { useParams } from 'react-router-dom';

const BeatSet = () => {
  const { id } = useParams();
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Playlist: {id}</h1>
      <p>Songs in this playlist.</p>
    </div>
  );
};

export default BeatSet;
