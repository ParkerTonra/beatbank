import { Link } from 'react-router-dom';

const Sidebar = () => {
  return (
    <div className="h-full flex flex-col border-[8px] rounded bg-gray-800 w-56 border-gray-900 border-opacity-55 p-1.5">
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
