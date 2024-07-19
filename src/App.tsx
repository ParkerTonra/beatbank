import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import icon from './assets/icons/db_logo.png';
import './Main.css';
import BeatJockey from './components/BeatJockey';
import BeatSet from './pages/BeatSet';
import Search from './pages/Search';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';

function App() {
  return (
    <div className='container w-full h-full'>
      <Router>
        <div className="flex h-screen text-xl font-sans w-screen">
          <div className=" w-64 p-4  bg-background-dark">
            <Sidebar />
          </div>
          <div className="flex-2 flex-col py-4 w-full h-full"> {/* right container */}
            <div className="flex w-full">
              <Header iconPath={icon} />
            </div>

            <main className="h-full w-full">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/search" element={<Search />} />
                <Route path="/set/:id" element={<BeatSet />} />

              </Routes>
              <BeatJockey />
            </main>
            
          </div>
        </div>
      </Router>
    </div>
  );
}

export default App;
