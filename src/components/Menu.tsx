import { useAppStore } from '../store';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';

export default function Menu() {
  const setGameMode = useAppStore((state) => state.setGameMode);
  const [elo, setElo] = useState<number | null>(null);

  useEffect(() => {
    if (auth.currentUser) {
      const unsub = onSnapshot(doc(db, 'users', auth.currentUser.uid), (snap) => {
        if (snap.exists()) setElo(snap.data().elo);
      });
      return () => unsub();
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#161512] text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-5xl font-bold mb-4 text-[#779556]">Chess Arena</h1>
      
      <div className="mb-12 text-gray-400 text-center">
        <p>Logged in as: <span className="text-white font-semibold">{auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0]}</span></p>
        <p>Current ELO: <span className="text-[#779556] font-bold">{elo !== null ? elo : '...'}</span></p>
      </div>

      <div className="space-y-4 w-full max-w-md">
        <button 
          onClick={() => setGameMode('computer')}
          className="w-full py-4 bg-[#262421] hover:bg-[#302e2a] rounded-xl text-xl font-semibold transition-colors flex items-center justify-center gap-3"
        >
          Play vs Computer
        </button>
        
        <button 
          onClick={() => setGameMode('online')}
          className="w-full py-4 bg-[#262421] hover:bg-[#302e2a] rounded-xl text-xl font-semibold transition-colors flex items-center justify-center gap-3"
        >
          Play Online
        </button>
      </div>

      <button 
        onClick={() => signOut(auth)}
        className="mt-12 text-gray-400 hover:text-white transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}
