import { useState } from "react";

const SearchBar = () => {
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Search for songs, artists, albums..."
        value={query}
        onChange={handleSearch}
        className="w-full p-2 border rounded"
      />
    </div>
  );
};

export default SearchBar;
