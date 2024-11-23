import { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/dialog';
import { writeBinaryFile } from '@tauri-apps/api/fs';
import { appDataDir } from '@tauri-apps/api/path';

interface BenchmarkResult {
  filePath: string;
  backendTimeMs: number;
  frontendTimeMs: number;
  accuracy: number;
}

const BenchmarkComponent = () => {
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const selectFiles = async () => {
    try {
      const selectedFiles = await open({
        directory: false,
        multiple: true,
        filters: [{
          name: 'Audio Files',
          extensions: ['mp3', 'wav', 'flac']
        }]
      });
      if (!selectedFiles) return [];
      return Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles];
    } catch (error) {
      console.error('Error selecting files:', error);
      return [];
    }
  };

  const saveResultsToFile = async (benchmarkResults: BenchmarkResult[]) => {
    try {
      // Generate a unique filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `benchmark_results_${timestamp}.json`;
      
      // Get the app's data directory
      const appDataDirPath = await appDataDir();
      const filePath = `${appDataDirPath}${fileName}`;

      // Convert results to JSON string and then to Uint8Array
      const jsonString = JSON.stringify(benchmarkResults, null, 2);
      const data = new TextEncoder().encode(jsonString);

      // Write the file using Tauri's filesystem API
      await writeBinaryFile(filePath, data);
      console.log(`Results saved to: ${filePath}`);
      
      return filePath;
    } catch (error) {
      console.error('Error saving results:', error);
      throw error;
    }
  };

  const runBenchmark = async () => {
    setIsRunning(true);
    const filePaths = await selectFiles();
    if (filePaths.length === 0) {
      setIsRunning(false);
      return;
    }

    const benchmarkResults: BenchmarkResult[] = [];
    const BATCH_SIZE = 3;

    try {
      // Process files in batches
      for (let i = 0; i < filePaths.length; i += BATCH_SIZE) {
        const batchStart = performance.now();
        const batch = filePaths.slice(i, i + BATCH_SIZE);
        
        // Run benchmarks in parallel for each batch
        const batchResults = await Promise.all(batch.map(async (filePath) => {
          try {
            const backendResult = await invoke('run_benchmark', { filePath }) as Omit<BenchmarkResult, 'frontendTimeMs'>;
            return {
              ...backendResult,
              frontendTimeMs: performance.now() - batchStart,
            };
          } catch (error) {
            console.error(`Benchmark failed for ${filePath}:`, error);
            return null;
          }
        }));

        // Add successful results from this batch
        const validResults = batchResults.filter((result): result is BenchmarkResult => result !== null);
        benchmarkResults.push(...validResults);

        // Save results after each batch
        await saveResultsToFile(benchmarkResults);
        
        // Update state with current results
        setResults([...benchmarkResults]);

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Error in batch processing:', error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-4">
      <button
        onClick={runBenchmark}
        disabled={isRunning}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
      >
        {isRunning ? 'Running Benchmark...' : 'Start Benchmark'}
      </button>
      
      {results.length > 0 && (
        <div className="mt-4">
          <h2 className="text-xl font-bold">Results</h2>
          <div className="mt-2 space-y-2">
            {results.map((result, index) => (
              <div key={index} className="p-2 border rounded">
                <p>File: {result.filePath}</p>
                <p>Backend Time: {result.backendTimeMs.toFixed(2)}ms</p>
                <p>Frontend Time: {result.frontendTimeMs.toFixed(2)}ms</p>
                <p>Accuracy: {(result.accuracy * 100).toFixed(2)}%</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BenchmarkComponent;