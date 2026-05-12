import { create } from 'zustand';

export type Route = 'dashboard' | 'deployment' | 'skills' | 'community' | 'auth' | 'settings' | "agents";

interface AppState {
    currentRoute: Route;
    setRoute: (route: Route) => void;
}

export const useAppStore = create<AppState>((set) => ({
    currentRoute: 'dashboard',
    setRoute: (route) => set({ currentRoute: route }),
}));