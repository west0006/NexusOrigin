// ─── client/src/renderer/store/app.ts ─────────────────────
import { create } from 'zustand';

type Route = 'dashboard' | 'deployment' | 'skills' | 'community';

interface AppState {
    currentRoute: Route;
    setRoute: (route: Route) => void;
}

export const useAppStore = create<AppState>((set) => ({
    currentRoute: 'dashboard',
    setRoute: (route: Route) => set({ currentRoute: route }),
}));