import { useEffect, useRef, useState, useCallback } from 'react';

interface StockfishEvaluation {
  score: number;
  mate?: number;
  bestMove?: string;
  depth?: number;
}

// -------------------
// NEW: factory loader
// -------------------
async function createStockfishFactory(
  url = 'https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish.js'
): Promise<() => Worker> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch Stockfish script: ${res.status}`);
  const scriptText = await res.text();

  const blob = new Blob([scriptText + '\n//# sourceURL=stockfish.js'], {
    type: 'application/javascript',
  });

  const blobUrl = URL.createObjectURL(blob);

  return () => new Worker(blobUrl);
}

// -------------------
// YOUR ORIGINAL HOOK
// -------------------
export const useStockfish = () => {
  const engineRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [evaluation, setEvaluation] = useState<StockfishEvaluation>({ score: 0 });
  const pendingCallbackRef = useRef<((evaluation: StockfishEvaluation) => void) | null>(null);

  useEffect(() => {
    const loadStockfish = async () => {
      try {
        // 🔥 use factory instead of CDN import()
        const Stockfish = await createStockfishFactory();
        const engine = Stockfish(); // returns Worker

        let currentEval: StockfishEvaluation = { score: 0 };

        engine.onmessage = (event: MessageEvent) => {
          const line = typeof event.data === 'string' ? event.data : '';
          console.log('Stockfish:', line);

          if (line.includes('uciok')) {
            engine.postMessage('isready');
          } else if (line.includes('readyok')) {
            setIsReady(true);
          } else if (line.startsWith('info') && line.includes('score')) {
            const depthMatch = line.match(/depth (\d+)/);
            const scoreMatch = line.match(/score cp (-?\d+)/);
            const mateMatch = line.match(/score mate (-?\d+)/);
            const pv = line.match(/pv ([a-h][1-8][a-h][1-8][qrbn]?)/);

            if (depthMatch) {
              const depth = parseInt(depthMatch[1]);

              if (mateMatch) {
                currentEval = {
                  score: parseInt(mateMatch[1]) > 0 ? 999 : -999,
                  mate: parseInt(mateMatch[1]),
                  depth,
                  bestMove: pv ? pv[1] : undefined,
                };
              } else if (scoreMatch) {
                currentEval = {
                  score: parseInt(scoreMatch[1]) / 100,
                  depth,
                  bestMove: pv ? pv[1] : undefined,
                };
              }
            }
          } else if (line.startsWith('bestmove')) {
            setEvaluation(currentEval);
            if (pendingCallbackRef.current) {
              pendingCallbackRef.current(currentEval);
              pendingCallbackRef.current = null;
            }
          }
        };

        engineRef.current = engine;
        engine.postMessage('uci');
      } catch (error) {
        console.error('Failed to load Stockfish:', error);
        setIsReady(true);
      }
    };

    loadStockfish();

    return () => {
      if (engineRef.current) {
        engineRef.current.terminate?.();
      }
    };
  }, []);

  const evaluatePosition = useCallback(
    (fen: string, callback?: (evaluation: StockfishEvaluation) => void, depth: number = 15) => {
      if (!isReady) {
        console.warn('Engine not ready');
        return;
      }

      if (!engineRef.current) {
        console.warn('Engine not initialized');
        return;
      }

      pendingCallbackRef.current = callback || null;

      engineRef.current.postMessage('position fen ' + fen);
      engineRef.current.postMessage(`go depth ${depth}`);
    },
    [isReady]
  );

  const getBestMove = useCallback(
    (fen: string, callback: (move: string) => void, depth: number = 15) => {
      evaluatePosition(
        fen,
        (evaluation) => {
          if (evaluation.bestMove) {
            callback(evaluation.bestMove);
          }
        },
        depth
      );
    },
    [evaluatePosition]
  );

  return {
    isReady,
    evaluation,
    evaluatePosition,
    getBestMove,
  };
};
