
import { auth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export default function Login() {
  const handleGoogleSignIn = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch(console.error);
  };

  return (
    <div className="min-h-screen bg-[#161512] flex items-center justify-center text-white">
      <div className="p-8 bg-[#262421] rounded-lg text-center shadow-lg">
        <h1 className="text-3xl font-bold mb-4">Chess Arena</h1>
        <div className="space-y-4 flex flex-col">
          <button 
            onClick={handleGoogleSignIn}
            className="bg-white text-black hover:bg-gray-200 font-bold py-3 px-6 rounded-lg text-lg transition-colors flex items-center justify-center gap-2"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
}
