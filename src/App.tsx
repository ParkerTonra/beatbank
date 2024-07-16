import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import icon from './assets/icons/db_logo.png';
import './Main.css';
import BeatJockey from './pages/BeatJockey';
import BeatSet from './pages/BeatSet';
import Search from './pages/Search';
import Bank from './pages/Bank';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';

function App() {
  return (
    <div>
      <Router>
        <div className="flex h-screen w-screen text-xl container font-sans ">
          <div className=" w-64 p-4  bg-background-dark">
            <Sidebar />
          </div>
          <div className="flex-1 flex flex-col py-4 w-full"> {/* right container */}
            <div className="flex">
              <Header iconPath={icon} />
            </div>

            <main className="flex-1 h-full">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/bank" element={<Bank />} />
                <Route path="/search" element={<Search />} />
                <Route path="/set/:id" element={<BeatSet />} />
                <Route path="/player" element={<BeatJockey />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </div>
  );
}

export default App;
