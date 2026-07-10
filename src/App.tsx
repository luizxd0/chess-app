import { useEffect, useState } from 'react';

import { useAppStore } from './store';
import Menu from './components/Menu';
import ComputerGame from './components/ComputerGame';
import OnlineGame from './components/OnlineGame';
import Login from './components/Login';
import { auth } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { gameMode } = useAppStore();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
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
