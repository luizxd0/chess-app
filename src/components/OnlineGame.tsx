import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../store';
import { Chess } from 'chess.js';
import ChessBoard from './ChessBoard';
import { Config } from 'chessground/config';
import { playMoveSound, playCaptureSound } from '../lib/sounds';
import { auth, db } from '../lib/firebase';
import { collection, doc, runTransaction, onSnapshot, setDoc, getDocs, query, limit, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { getMaterialDifference } from '../lib/chess-utils';

export default function OnlineGame() {
  const setGameMode = useAppStore((state) => state.setGameMode);
  const [chess] = useState(new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [gameId, setGameId] = useState<string | null>(null);
  const [color, setColor] = useState<'white' | 'black' | null>(null);
  const [opponentName, setOpponentName] = useState<string>('Opponent');
  const [status, setStatus] = useState<string>('finding_match');
  const [myElo, setMyElo] = useState<number>(500);
  const [oppElo, setOppElo] = useState<number>(500);
  const [gameOverStats, setGameOverStats] = useState<{ winner: string | null, type: string } | null>(null);
  
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    
    let unsubscribeGame: () => void;

    const findMatch = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef).catch(err => { throw new Error('getDoc users failed: ' + err.message); });
        const currentElo = userSnap.exists() ? userSnap.data().elo : 500;
        setMyElo(currentElo);

        const queueRef = collection(db, 'queue');
        const q = query(queueRef, limit(1));
        const snapshot = await getDocs(q).catch(err => { throw new Error('getDocs queue failed: ' + err.message); });
        
        let matched = false;

        for (const queueDoc of snapshot.docs) {
          if (queueDoc.id !== user.uid) {
            try {
              const gameRef = doc(collection(db, 'games'));
              await runTransaction(db, async (transaction) => {
                const docSnap = await transaction.get(queueDoc.ref);
                if (!docSnap.exists()) throw new Error("Already matched");
                transaction.delete(queueDoc.ref);
                
                transaction.set(gameRef, {
                  whiteId: queueDoc.id,
                  blackId: user.uid,
                  whiteName: docSnap.data().name || 'Anonymous',
                  blackName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
                  whiteElo: docSnap.data().elo || 500,
                  blackElo: currentElo,
                  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                  turn: 'w',
                  status: 'playing',
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp()
                });
              });
              
              setGameId(gameRef.id);
              setColor('black');
              setOpponentName(queueDoc.data().name || 'Anonymous');
              setOppElo(queueDoc.data().elo || 500);
              matched = true;
              break;
            } catch (e: any) {
              console.error("Transaction failed", e);
              throw new Error('Transaction failed: ' + e.message);
            }
          }
        }

        if (!matched) {
          await setDoc(doc(db, 'queue', user.uid), {
            uid: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'Anonymous',
            elo: currentElo,
            joinedAt: serverTimestamp()
          }).catch(err => { throw new Error('setDoc queue failed: ' + err.message); });
          setColor('white');
        }

        const gamesRef = collection(db, 'games');
        unsubscribeGame = onSnapshot(gamesRef, (snapshot) => {
          for (const change of snapshot.docChanges()) {
            const gameData = change.doc.data();
            if (gameData.whiteId === user.uid || gameData.blackId === user.uid) {
              if (change.type === 'added') {
                setGameId(change.doc.id);
                setColor(gameData.whiteId === user.uid ? 'white' : 'black');
                setOpponentName(gameData.whiteId === user.uid ? gameData.blackName : gameData.whiteName);
                setOppElo(gameData.whiteId === user.uid ? gameData.blackElo : gameData.whiteElo);
                setStatus('playing');
              }
              
              if (gameData.fen && gameData.fen !== chess.fen()) {
                chess.load(gameData.fen);
                setFen(gameData.fen);
                playMoveSound();
                
                if (chess.isGameOver()) {
                  if (chess.isCheckmate()) {
                    setGameOverStats({ winner: chess.turn() === 'w' ? 'black' : 'white', type: 'checkmate' });
                  } else {
                    setGameOverStats({ winner: null, type: 'draw' });
                  }
                }
              }
            }
          }
        }, err => {
          console.error("onSnapshot games failed:", err);
        });
      } catch (err: any) {
        console.error("Matchmaking error:", err.message);
      }
    };

    findMatch();

    return () => {
      if (unsubscribeGame) unsubscribeGame();
      if (status === 'finding_match') {
        deleteDoc(doc(db, 'queue', user.uid)).catch(console.error);
      }
    };
  }, [user, chess, status]);

  const onMove = useCallback(async (orig: string, dest: string) => {
    try {
      const move = chess.move({ from: orig, to: dest, promotion: 'q' });
      setFen(chess.fen());
      
      if (move.captured) playCaptureSound();
      else playMoveSound();
      
      let gameStatus = 'playing';
      if (chess.isGameOver()) {
        if (chess.isCheckmate()) {
          gameStatus = chess.turn() === 'w' ? 'black_won' : 'white_won';
          setGameOverStats({ winner: chess.turn() === 'w' ? 'black' : 'white', type: 'checkmate' });
        } else {
          gameStatus = 'draw';
          setGameOverStats({ winner: null, type: 'draw' });
        }
      }

      if (gameId) {
        await setDoc(doc(db, 'games', gameId), {
          fen: chess.fen(),
          turn: chess.turn(),
          status: gameStatus,
          updatedAt: serverTimestamp()
        }, { merge: true });
        
        // If game over, update elo
        if (gameStatus !== 'playing') {
          const userRef = doc(db, 'users', user!.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const currentElo = userSnap.data().elo || 500;
            // Simple elo change: +20 for win, -20 for loss, 0 for draw
            let diff = 0;
            if (gameStatus === 'draw') diff = 0;
            else if ((gameStatus === 'white_won' && color === 'white') || (gameStatus === 'black_won' && color === 'black')) diff = 20;
            else diff = -20;
            
            await setDoc(userRef, { elo: Math.max(0, currentElo + diff) }, { merge: true });
            setMyElo(Math.max(0, currentElo + diff));
          }
        }
      }
    } catch (e) {
      setFen(chess.fen());
    }
  }, [chess, gameId, color, user]);

  const dests = new Map<any, any>();
  if (color && (chess.turn() === 'w' ? 'white' : 'black') === color && !gameOverStats) {
    chess.moves({ verbose: true }).forEach(m => {
      const list = dests.get(m.from) || [];
      list.push(m.to);
      dests.set(m.from, list);
    });
  }

  const config: Config = {
    fen,
    turnColor: chess.turn() === 'w' ? 'white' : 'black',
    orientation: color || 'white',
    check: chess.inCheck(),
    lastMove: chess.history({ verbose: true }).length > 0 
      ? [chess.history({ verbose: true })[chess.history({ verbose: true }).length - 1].from, chess.history({ verbose: true })[chess.history({ verbose: true }).length - 1].to] 
      : undefined,
    movable: {
      color: color || 'white',
      dests,
      events: {
        after: onMove
      }
    }
  };

  const matDiff = getMaterialDifference(chess);
  const myAdvantage = color === 'white' ? matDiff.advantage : -matDiff.advantage;
  const oppAdvantage = -myAdvantage;

  if (status === 'finding_match') {
    return (
      <div className="min-h-screen bg-[#161512] text-white flex flex-col items-center justify-center p-4">
        <Loader2 className="animate-spin text-[#779556] mb-4" size={48} />
        <h2 className="text-2xl font-bold">Finding Match...</h2>
        <button 
          onClick={() => {
            if (user) deleteDoc(doc(db, 'queue', user.uid));
            setGameMode('menu');
          }}
          className="mt-6 text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-lg bg-[#262421]"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#161512] text-white flex flex-col items-center justify-center p-4">
      <div className="mb-6 flex w-full max-w-2xl justify-between items-center">
        <button 
          onClick={() => setGameMode('menu')}
          className="text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-lg bg-[#262421]"
        >
          &larr; Resign & Leave
        </button>
        
        <div className="flex items-center gap-3">
          <div className="text-right flex flex-col items-end">
            <h2 className="text-xl font-bold flex items-center gap-2">
              {opponentName}
              {oppAdvantage > 0 && <span className="text-xs bg-[#262421] px-2 py-1 rounded text-[#779556]">+{oppAdvantage}</span>}
            </h2>
            <p className="text-sm text-gray-400">Rating: {oppElo}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-[#403d39] flex items-center justify-center font-bold text-xl">
            {opponentName[0]?.toUpperCase()}
          </div>
        </div>
      </div>
      
      <div className="w-full max-w-[600px] flex items-center justify-center bg-[#262421] p-4 rounded-xl shadow-2xl relative">
        <ChessBoard config={config} />
        {gameOverStats && (
          <div className="absolute inset-0 bg-black/70 rounded-xl flex flex-col items-center justify-center animate-in fade-in duration-500 z-10">
            <h2 className="text-5xl font-bold text-white mb-2 shadow-sm drop-shadow-lg">
              {gameOverStats.winner === color ? 'You Won!' : gameOverStats.winner ? 'You Lost' : 'Draw'}
            </h2>
            <p className="text-xl text-gray-300 mb-6 capitalize">by {gameOverStats.type}</p>
            <button onClick={() => setGameMode('menu')} className="px-8 py-4 bg-[#779556] hover:bg-[#69824c] rounded-xl font-bold text-xl transition-colors shadow-lg">
              Return to Menu
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
              {user?.displayName || user?.email?.split('@')[0] || 'You'}
              {myAdvantage > 0 && <span className="text-xs bg-[#262421] px-2 py-1 rounded text-[#779556]">+{myAdvantage}</span>}
            </h2>
            <p className="text-sm text-gray-400">Rating: {myElo}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
