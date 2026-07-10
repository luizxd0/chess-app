

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '../store';
import { Chess } from 'chess.js';
import { Engine } from '../lib/engine';
import ChessBoard from './ChessBoard';
import { Config } from 'chessground/config';
import { DrawShape } from 'chessground/draw';
import { bots, Bot } from '../data/bots';
import { playMoveSound, playCaptureSound } from '../lib/sounds';
import { getMaterialDifference } from '../lib/chess-utils';

export default function ComputerGame() {
  const setGameMode = useAppStore((state) => state.setGameMode);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [chess] = useState(new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [isThinking, setIsThinking] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [tipsShapes, setTipsShapes] = useState<DrawShape[]>([]);

  const engine = useMemo(() => new Engine(), []);
  const tipsEngine = useMemo(() => new Engine(), []);

  useEffect(() => {
    if (selectedBot) {
      engine.setSkillLevel(selectedBot.level);
    }
  }, [engine, selectedBot]);

  const updateTips = useCallback(async (currentFen: string) => {
    if (!showTips || chess.isGameOver()) {
      setTipsShapes([]);
      return;
    }
    const tips = await tipsEngine.getTips(currentFen);
    const shapes: DrawShape[] = [];
    if (tips.best) {
      shapes.push({
        orig: tips.best.substring(0, 2) as any,
        dest: tips.best.substring(2, 4) as any,
        brush: 'green'
      });
    }
    if (tips.second) {
      shapes.push({
        orig: tips.second.substring(0, 2) as any,
        dest: tips.second.substring(2, 4) as any,
        brush: 'blue'
      });
    }
    setTipsShapes(shapes);
  }, [showTips, tipsEngine, chess]);

  useEffect(() => {
    if (showTips && chess.turn() === 'w') {
      updateTips(fen);
    } else {
      setTipsShapes([]);
    }
  }, [showTips, fen, chess, updateTips]);

  const onMove = useCallback(async (orig: string, dest: string) => {
    try {
      setTipsShapes([]); // clear tips immediately on move
      const move = chess.move({ from: orig, to: dest, promotion: 'q' });
      setFen(chess.fen());
      
      if (move.captured) playCaptureSound();
      else playMoveSound();
      
      if (!chess.isGameOver()) {
        setIsThinking(true);
        
        // Add a small artificial delay so the bot doesn't play instantly
        const thinkingTime = Math.random() * 1000 + 500; // 500ms to 1500ms
        const [bestMove] = await Promise.all([
          engine.evaluate(chess.fen(), selectedBot?.level || 10),
          new Promise(resolve => setTimeout(resolve, thinkingTime))
        ]);
        
        if (bestMove) {
          const from = bestMove.substring(0, 2);
          const to = bestMove.substring(2, 4);
          const prom = bestMove.length > 4 ? bestMove[4] : undefined;
          
          const engineMove = chess.move({
            from,
            to,
            promotion: prom
          });
          setFen(chess.fen());
          
          if (engineMove.captured) playCaptureSound();
          else playMoveSound();
        }
        setIsThinking(false);
      }
    } catch (e) {
      setFen(chess.fen());
    }
  }, [chess, engine, selectedBot]);

  const turnColor = chess.turn() === 'w' ? 'white' : 'black';
  const dests = new Map<any, any>();
  if (chess.turn() === 'w') {
    chess.moves({ verbose: true }).forEach(m => {
      const list = dests.get(m.from) || [];
      list.push(m.to);
      dests.set(m.from, list);
    });
  }

  const config: Config = {
    fen,
    turnColor,
    lastMove: chess.history({ verbose: true }).length > 0 
      ? [chess.history({ verbose: true })[chess.history({ verbose: true }).length - 1].from, chess.history({ verbose: true })[chess.history({ verbose: true }).length - 1].to] 
      : undefined,
    movable: {
      free: false,
      color: 'white',
      dests,
      events: {
        after: onMove
      }
    },
    premovable: {
      enabled: true,
      showDests: true,
      castle: true,
      events: {
        set: () => {},
        unset: () => {}
      }
    },
    drawable: {
      enabled: true,
      visible: true,
      shapes: tipsShapes
    }
  };

  if (!selectedBot) {
    return (
      <div className="min-h-screen bg-[#161512] text-white flex flex-col p-8 overflow-y-auto">
        <div className="mb-6 flex items-center">
          <button 
            onClick={() => setGameMode('menu')}
            className="text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-lg bg-[#262421]"
          >
            &larr; Back to Menu
          </button>
          <h2 className="text-3xl font-bold ml-6">Play Computer</h2>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {bots.map((bot) => (
            <div 
              key={bot.id} 
              onClick={() => setSelectedBot(bot)}
              className="bg-[#262421] p-4 rounded-xl cursor-pointer hover:bg-[#322e2b] transition-colors flex flex-col items-center border border-transparent hover:border-[#779556]"
            >
              <img src={bot.avatar} alt={bot.name} referrerPolicy="no-referrer" className="w-24 h-24 rounded-full mb-3 object-cover bg-[#403d39]" />
              <h3 className="font-bold text-lg">{bot.name}</h3>
              <p className="text-sm text-gray-400">Rating: {bot.rating}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const matDiff = getMaterialDifference(chess);

  return (
    <div className="min-h-screen bg-[#161512] text-white flex flex-col items-center justify-center p-4">
      <div className="mb-6 flex w-full max-w-2xl justify-between items-center">
        <div className="flex flex-col gap-2">
          <button 
            onClick={() => {
              setSelectedBot(null);
              chess.reset();
              setFen(chess.fen());
            }}
            className="text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-lg bg-[#262421] w-max"
          >
            &larr; Choose Bot
          </button>
          
          <button
            onClick={() => setShowTips(prev => !prev)}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors w-max flex items-center gap-2 ${showTips ? 'bg-[#779556] text-white' : 'bg-[#262421] text-gray-400 hover:text-white'}`}
          >
            <div className={`w-3 h-3 rounded-full ${showTips ? 'bg-white' : 'bg-transparent border border-gray-400'}`}></div>
            Engine Tips
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-right flex flex-col items-end">
            <h2 className="text-xl font-bold flex items-center gap-2">
              {selectedBot.name}
              {matDiff.advantage < 0 && <span className="text-xs bg-[#262421] px-2 py-1 rounded text-[#779556]">+{Math.abs(matDiff.advantage)}</span>}
            </h2>
            <p className="text-sm text-gray-400">Rating: {selectedBot.rating} {isThinking ? '(Thinking...)' : ''}</p>
          </div>
          <img src={selectedBot.avatar} alt={selectedBot.name} referrerPolicy="no-referrer" className="w-12 h-12 rounded-full object-cover" />
        </div>
      </div>
      
      <div className="w-full max-w-[600px] flex items-center justify-center bg-[#262421] p-4 rounded-xl shadow-2xl">
        <ChessBoard config={config} />
      </div>

      <div className="mt-6 flex w-full max-w-2xl justify-start items-center">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#403d39] flex items-center justify-center font-bold text-xl">
            You
          </div>
          <div className="text-left flex flex-col">
            <h2 className="text-xl font-bold flex items-center gap-2">
              You
              {matDiff.advantage > 0 && <span className="text-xs bg-[#262421] px-2 py-1 rounded text-[#779556]">+{matDiff.advantage}</span>}
            </h2>
            <p className="text-sm text-gray-400">Rating: 1200</p>
          </div>
        </div>
      </div>
    </div>
  );
}
