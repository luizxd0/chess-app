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
import { Lightbulb, Lock } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

export default function ComputerGame() {
  const setGameMode = useAppStore((state) => state.setGameMode);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [chess] = useState(new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [isThinking, setIsThinking] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [tipsShapes, setTipsShapes] = useState<DrawShape[]>([]);
  const [gameOverStats, setGameOverStats] = useState<{ winner: string | null, type: string } | null>(null);
  
  const [maxBotUnlocked, setMaxBotUnlocked] = useState<number>(0);

  const user = auth.currentUser;

  useEffect(() => {
    if (user) {
      const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
        if (snap.exists()) {
          setMaxBotUnlocked(snap.data().maxBotUnlocked || 0);
        }
      });
      return () => unsub();
    }
  }, [user]);

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

  const handleGameOver = useCallback(async (winner: string | null, type: string) => {
    setGameOverStats({ winner, type });
    if (winner === 'white' && selectedBot && user) {
      const botIndex = bots.findIndex(b => b.id === selectedBot.id);
      if (botIndex >= maxBotUnlocked && botIndex + 1 < bots.length) {
        // Unlock next bot
        const newMax = botIndex + 1;
        await setDoc(doc(db, 'users', user.uid), { maxBotUnlocked: newMax }, { merge: true });
      }
    }
  }, [selectedBot, user, maxBotUnlocked]);

  const checkGameOver = useCallback(() => {
    if (chess.isGameOver()) {
      if (chess.isCheckmate()) {
        handleGameOver(chess.turn() === 'w' ? 'black' : 'white', 'checkmate');
      } else if (chess.isStalemate()) {
        handleGameOver(null, 'stalemate');
      } else {
        handleGameOver(null, 'draw');
      }
      return true;
    }
    return false;
  }, [chess, handleGameOver]);

  const onMove = useCallback(async (orig: string, dest: string) => {
    try {
      setTipsShapes([]); // clear tips immediately on move
      const move = chess.move({ from: orig, to: dest, promotion: 'q' });
      setFen(chess.fen());
      
      if (move.captured) playCaptureSound();
      else playMoveSound();
      
      if (!checkGameOver()) {
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

          checkGameOver();
        }
        setIsThinking(false);
      }
    } catch (e) {
      setFen(chess.fen());
    }
  }, [chess, engine, selectedBot, checkGameOver]);

  const turnColor = chess.turn() === 'w' ? 'white' : 'black';
  const dests = new Map<any, any>();
  if (chess.turn() === 'w' && !gameOverStats) {
    chess.moves({ verbose: true }).forEach(m => {
      const list = dests.get(m.from) || [];
      list.push(m.to);
      dests.set(m.from, list);
    });
  }

  const config: Config = {
    fen,
    turnColor,
    check: chess.inCheck(),
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
          {bots.map((bot, index) => {
            const isLocked = index > maxBotUnlocked;
            return (
              <div 
                key={bot.id} 
                onClick={() => {
                  if (!isLocked) setSelectedBot(bot);
                }}
                className={`p-4 rounded-xl flex flex-col items-center border transition-colors relative
                  ${isLocked 
                    ? 'bg-[#1b1a17] border-transparent opacity-60 cursor-not-allowed' 
                    : 'bg-[#262421] cursor-pointer hover:bg-[#322e2b] border-transparent hover:border-[#779556]'
                  }`}
              >
                <div className="relative mb-3">
                  <img 
                    src={bot.avatar} 
                    alt={bot.name} 
                    referrerPolicy="no-referrer" 
                    className={`w-24 h-24 rounded-full object-cover bg-[#403d39] ${isLocked ? 'grayscale' : ''}`} 
                  />
                  {isLocked && (
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                      <Lock className="text-white drop-shadow-md" size={32} />
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-lg">{bot.name}</h3>
                <p className="text-sm text-gray-400">Rating: {bot.rating}</p>
              </div>
            );
          })}
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
              setGameOverStats(null);
            }}
            className="text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-lg bg-[#262421] w-max"
          >
            &larr; Choose Bot
          </button>
          
          <button
            onClick={() => setShowTips(prev => !prev)}
            className={`p-2 rounded-lg transition-colors w-max flex items-center justify-center ${showTips ? 'bg-[#779556] text-white' : 'bg-[#262421] text-gray-400 hover:text-white'}`}
            title="Engine Tips"
          >
            <Lightbulb size={24} />
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
      
      <div className="w-full max-w-[600px] flex items-center justify-center bg-[#262421] p-4 rounded-xl shadow-2xl relative">
        <ChessBoard config={config} />
        {gameOverStats && (
          <div className="absolute inset-0 bg-black/70 rounded-xl flex flex-col items-center justify-center animate-in fade-in duration-500 z-10">
            <h2 className="text-5xl font-bold text-white mb-2 shadow-sm drop-shadow-lg">
              {gameOverStats.winner === 'white' ? 'You Won!' : gameOverStats.winner === 'black' ? 'Computer Won' : 'Draw'}
            </h2>
            <p className="text-xl text-gray-300 mb-6 capitalize">by {gameOverStats.type}</p>
            <button onClick={() => {
              setSelectedBot(null);
              chess.reset();
              setFen(chess.fen());
              setGameOverStats(null);
            }} className="px-8 py-4 bg-[#779556] hover:bg-[#69824c] rounded-xl font-bold text-xl transition-colors shadow-lg">
              Play Again
            </button>
          </div>
        )}
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
