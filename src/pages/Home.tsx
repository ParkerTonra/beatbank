import BeatTable from 'components/BeatTable';
import { useState, useEffect } from 'react';
const Home = () => {
  const [audioSrc, setAudioSrc] = useState<string>("");

  useEffect(() => {
    console.log("audioSrc:", audioSrc);
  }, [audioSrc]);

  return (
    <div className="p-4 h-full w-full bg-secondary border">
      <BeatTable setAudioSrc={setAudioSrc} />
    </div>
  );
};

export default Home;
