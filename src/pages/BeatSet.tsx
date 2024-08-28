import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api';
import { useParams } from 'react-router-dom';
import { Beat } from '../bindings';

const BeatSetPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [beatSet, setBeatSet] = useState<Beat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setName, setSetName] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
  
      try {
        const numberId = parseInt(id ?? '', 10);
        
        // Fetch set name
        const name = await invoke('get_set_name', { id: numberId });
        setSetName(typeof name === 'string' ? name : 'Unknown Set');
  
        // Fetch beat set data
        const response = await invoke('get_beat_set', { setId: numberId });
        
        // Parse the response if it's a string
        const beats = typeof response === 'string' ? JSON.parse(response) : response;
        
        console.log('Received beat set:', beats); // Log the received data
  
        if (Array.isArray(beats)) {
          setBeatSet(beats);
        } else {
          console.error('Unexpected response format:', beats);
          setError('Received invalid data format for beat set.');
          setBeatSet([]);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('An error occurred while fetching data.');
        setBeatSet([]);
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchData();
  }, [id]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Beat Set: {setName}</h1>
      {beatSet.length === 0 ? (
        <p>No beats found in this set.</p>
      ) : (
        <ul>
          {beatSet.map((beat) => (
            <li key={beat.id}>
              {beat.title} - BPM: {beat.bpm}, Key: {beat.key || 'Unknown'}, Artist: {beat.artist}, Duration: {beat.duration}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default BeatSetPage;