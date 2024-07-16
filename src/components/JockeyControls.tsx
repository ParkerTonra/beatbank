const JockeyControls = () => {
  return (
    <div className="flex items-center justify-between bg-gray-800 text-white p-4">
      <button>Prev</button>
      <button>Play/Pause</button>
      <button>Next</button>
      <input type="range" />
    </div>
  );
};

export default JockeyControls;
