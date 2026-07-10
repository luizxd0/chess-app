import { useEffect, useState } from 'react';
import { useAppStore } from './store';
import Menu from './components/Menu';
import ComputerGame from './components/ComputerGame';
import OnlineGame from './components/OnlineGame';
import Login from './components/Login';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { gameMode } = useAppStore();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous',
              elo: 500,
              maxBotUnlocked: 0,
              createdAt: serverTimestamp()
            });
          }
        } catch (e) {
          console.error("Error setting up user:", e);
        }
      }
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#161512] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#779556]" size={48} />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <>
      {gameMode === 'menu' && <Menu />}
      {gameMode === 'computer' && <ComputerGame />}
      {gameMode === 'online' && <OnlineGame />}
    </>
  );
}
