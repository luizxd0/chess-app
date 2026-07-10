
import { useAppStore } from '../store';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

export default function Menu() {
  const setGameMode = useAppStore((state) => state.setGameMode);

  return (
    <div className="min-h-screen bg-[#161512] text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-5xl font-bold mb-12 text-[#779556]">Chess Arena</h1>
      
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
