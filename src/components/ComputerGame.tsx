

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '../store';
import { Chess } from 'chess.js';
import { Engine } from '../lib/engine';
import ChessBoard from './ChessBoard';
import { Config } from 'chessground/config';

export default function ComputerGame() {
  const setGameMode = useAppStore((state) => state.setGameMode);
  const [chess] = useState(new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [isThinking, setIsThinking] = useState(false);
  const engine = useMemo(() => new Engine(), []);

  useEffect(() => {
    engine.setSkillLevel(5);
  }, [engine]);

  const onMove = useCallback(async (orig: string, dest: string) => {
    try {
      chess.move({ from: orig, to: dest, promotion: 'q' });
      setFen(chess.fen());
      
      if (!chess.isGameOver()) {
        setIsThinking(true);
        const bestMove = await engine.evaluate(chess.fen(), 10);
        
        if (bestMove) {
          chess.move({
            from: bestMove.substring(0, 2),
            to: bestMove.substring(2, 4),
            promotion: bestMove.length > 4 ? bestMove[4] : undefined
          });
          setFen(chess.fen());
        }
        setIsThinking(false);
      }
    } catch (e) {
      setFen(chess.fen());
    }
  }, [chess, engine]);

  const dests = new Map<any, any>();
  chess.moves({ verbose: true }).forEach(m => {
    const list = dests.get(m.from) || [];
    list.push(m.to);
    dests.set(m.from, list);
  });

  const config: Config = {
    fen,
    turnColor: 'white',
    movable: {
      color: chess.turn() === 'w' ? 'white' : undefined,
      dests,
      events: {
        after: onMove
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#161512] text-white flex flex-col items-center justify-center p-4">
      <div className="mb-6 flex w-full max-w-2xl justify-between items-center">
        <button 
          onClick={() => setGameMode('menu')}
          className="text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-lg bg-[#262421]"
        >
          &larr; Back to Menu
        </button>
        <h2 className="text-2xl font-bold">vs Computer {isThinking ? '(Thinking...)' : ''}</h2>
      </div>
      
      <div className="w-full max-w-[600px] flex items-center justify-center bg-[#262421] p-4 rounded-xl">
        <ChessBoard config={config} />
      </div>
    </div>
  );
}
