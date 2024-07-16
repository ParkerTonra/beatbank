import BeatTable from 'components/BeatTable';
import { useState, useEffect } from 'react';
import AudioPlayer from "components/AudioPlayer";
const Home = () => {
  const [audioSrc, setAudioSrc] = useState<string>("");

  useEffect(() => {
    console.log("audioSrc:", audioSrc);
  }, [audioSrc]);

  return (
    <div className="p-4 h-full w-full bg-secondary justify-center border">
      <BeatTable setAudioSrc={setAudioSrc} />
      <AudioPlayer audioSrc={audioSrc} />
    </div>
  );
};

export default Home;
