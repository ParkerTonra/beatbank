import { Link } from 'react-router-dom';

const Sidebar = () => {
  return (
    <div className="h-full flex flex-col p-4 border-2 border-gray-700 rounded-xl text-white">
        <Link to="/" className="py-2">
          <button type="button" className="w-full">Home</button>
        </Link>
        <Link to="/bank" className="py-2">
          <button type="button" className="w-full">My Beats</button>
        </Link>
        <Link to="/search" className="py-2">
          <button type="button" className="w-full">Search</button>
        </Link>
      </div>
  );
};

export default Sidebar;
