import { create } from 'zustand';

interface AppState {
  gameMode: 'menu' | 'computer' | 'friend';
  setGameMode: (mode: 'menu' | 'computer' | 'friend') => void;
}

export const useAppStore = create<AppState>((set) => ({
  gameMode: 'menu',
  setGameMode: (mode) => set({ gameMode: mode }),
}));
