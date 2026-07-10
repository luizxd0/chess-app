import { create } from 'zustand';

interface AppState {
  gameMode: 'menu' | 'computer' | 'online';
  setGameMode: (mode: 'menu' | 'computer' | 'online') => void;
}

export const useAppStore = create<AppState>((set) => ({
  gameMode: 'menu',
  setGameMode: (mode) => set({ gameMode: mode }),
}));
