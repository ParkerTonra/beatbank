const JockeyControls = () => {
  return (
    <div className="flex items-center bg-gray-800 text-white p-4 space-x-14 justify-left">
      <button>Prev</button>
      <button>Play/Pause</button>
      <button>Next</button>
      <input id ="seekSlider" type="range" min="0" max="100" value="0" className="w-96"/>
      <input id ="volumeSlider" type="range" min="0" max="100" value="0" className="w-64"/>
    </div>
  );
};

export default JockeyControls;
