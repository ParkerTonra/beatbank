import { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/dialog';

interface BenchmarkResult {
  filePath: string;
  fileSize: number;
  loadTimeMs: number;
  analysisTimeMs: number;
  totalTimeMs: number;
  samplesProcessed: number;
  sampleRate: number;
  detectedBpm: number | null;
  frontendTimeMs: number;
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

  const runBenchmark = async (filePaths: string[]) => {
    setIsRunning(true);
    const benchmarkResults: BenchmarkResult[] = [];
    const BATCH_SIZE = 3;  // Match your actual batch size

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
        benchmarkResults.push(...batchResults.filter((result): result is BenchmarkResult => 
          result !== null
        ));

        // Small delay between batches to match your actual implementation
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Error in batch processing:', error);
    }

    setResults(prev => [...prev, ...benchmarkResults]);
    setIsRunning(false);
  };

  const handleBenchmarkStart = async () => {
    try {
      const filePaths = await selectFiles();
      if (filePaths.length > 0) {
        await runBenchmark(filePaths);
      }
    } catch (error) {
      console.error('Error starting benchmark:', error);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Audio Analysis Benchmark</h2>
      
      <div className="flex gap-4 mb-4">
        <button
          className={`px-4 py-2 rounded ${isRunning ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
          onClick={handleBenchmarkStart}
          disabled={isRunning}
        >
          {isRunning ? 'Running Benchmark...' : 'Select Files & Run Benchmark'}
        </button>
        
        {results.length > 0 && (
          <button
            className="px-4 py-2 rounded bg-gray-500 hover:bg-gray-600 text-white"
            onClick={() => setResults([])}
          >
            Clear Results
          </button>
        )}
      </div>

      {results.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Results</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border">
              <thead>
                <tr>
                  <th className="border p-2">File</th>
                  <th className="border p-2">Size</th>
                  <th className="border p-2">Load Time</th>
                  <th className="border p-2">Analysis Time</th>
                  <th className="border p-2">Total Time</th>
                  <th className="border p-2">Frontend Time</th>
                  <th className="border p-2">Samples</th>
                  <th className="border p-2">Sample Rate</th>
                  <th className="border p-2">BPM</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index}>
                    <td className="border p-2">{result.filePath.split('/').pop()}</td>
                    <td className="border p-2">{(result.fileSize / 1024 / 1024).toFixed(2)} MB</td>
                    <td className="border p-2">{result.loadTimeMs.toFixed(2)} ms</td>
                    <td className="border p-2">{result.analysisTimeMs.toFixed(2)} ms</td>
                    <td className="border p-2">{result.totalTimeMs.toFixed(2)} ms</td>
                    <td className="border p-2">{result.frontendTimeMs.toFixed(2)} ms</td>
                    <td className="border p-2">{result.samplesProcessed.toLocaleString()}</td>
                    <td className="border p-2">{result.sampleRate} Hz</td>
                    <td className="border p-2">{result.detectedBpm?.toFixed(1) ?? 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BenchmarkComponent;