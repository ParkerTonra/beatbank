import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import icon from './assets/icons/db_logo.png';
import BeatJockey from './components/BeatJockey';
import BeatSet from './pages/BeatSet';
import Search from './pages/Search';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import { Beat } from './bindings';
import './Main.css';

function App() {
  const [playThisBeat, setPlayThisBeat] = useState<Beat | null>(null);

  const handleBeatSelection = (beat: Beat) => {
    console.log("beat selected:", beat);
  };

  const handleBeatPlay = (beat: Beat) => {
    setPlayThisBeat(beat);
  };
  
  return (
    <div className='h-full'>
      <Router>
        <div className="flex h-screen text-xl font-sans w-full">
          <div className=" w-64 p-4  bg-background-dark">
            <Sidebar />
          </div>
          <div className="flex-2 flex-col py-4 w-full h-full"> {/* right container */}
            <div className="flex w-full">
              <Header iconPath={icon} />
            </div>

            <main className="h-full w-full">
              <Routes>
                <Route path="/" element={<Home onBeatPlay={handleBeatPlay} onBeatSelect={handleBeatSelection} />} />
                <Route path="/search" element={<Search />} />
                <Route path="/set/:id" element={<BeatSet />} />

              </Routes>
              <div className="flex-grow flex-col">
                <BeatJockey playThisBeat={playThisBeat} />
              </div>
            </main> 
            
          </div>
        </div>
      </Router>
    </div>
  );
}

export default App;
