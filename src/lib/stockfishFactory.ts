// stockfishFactory.ts
export async function createStockfishFactory(
    url = 'https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish.js'
  ): Promise<() => Worker> {
    // Fetch the worker script text from CDN
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch Stockfish script: ${res.status}`);
    const scriptText = await res.text();
  
    // Optional: ensure the script runs in module-like worker environment
    // (we append a sourceURL to make debugging easier)
    const blob = new Blob([scriptText + '\n//# sourceURL=stockfish.js'], {
      type: 'application/javascript',
    });
  
    const blobUrl = URL.createObjectURL(blob);
  
    // Return a "factory" that creates a new Worker instance each time it's called
    return () => new Worker(blobUrl);
  }
  