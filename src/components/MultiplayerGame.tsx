

import { useState, useCallback } from 'react';
import { useAppStore } from '../store';
import { Chess } from 'chess.js';
import ChessBoard from './ChessBoard';
import { Config } from 'chessground/config';

export default function MultiplayerGame() {
  const setGameMode = useAppStore((state) => state.setGameMode);
  const [chess] = useState(new Chess());
  const [fen, setFen] = useState(chess.fen());

  const onMove = useCallback((orig: string, dest: string) => {
    try {
      chess.move({ from: orig, to: dest, promotion: 'q' });
      setFen(chess.fen());
    } catch (e) {
      setFen(chess.fen());
    }
  }, [chess]);

  const dests = new Map<any, any>();
  chess.moves({ verbose: true }).forEach(m => {
    const list = dests.get(m.from) || [];
    list.push(m.to);
    dests.set(m.from, list);
  });

  const config: Config = {
    fen,
    turnColor: chess.turn() === 'w' ? 'white' : 'black',
    movable: {
      color: chess.turn() === 'w' ? 'white' : 'black',
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
        <h2 className="text-2xl font-bold">vs Friend (Pass & Play)</h2>
      </div>
      
      <div className="w-full max-w-[600px] flex items-center justify-center bg-[#262421] p-4 rounded-xl">
        <ChessBoard config={config} />
      </div>
    </div>
  );
}
