// client/src/renderer/store/app.ts
import { create } from 'zustand';

export type Route =
    | 'auth'
    | 'dashboard'
    | 'deployment'
    | 'skills'
    | 'community'
    | 'settings'
    | 'agents'
    | 'modelProviders'
    | 'costCenter'
    | 'tasks'
    | 'onboarding'
    | 'taskMarketplace'
    | 'collaborationLab'
    | 'environment'
    | 'assistant';

interface AppState {
    currentRoute: Route;
    previousRoute: Route | null;
    loading: boolean;
    sidebarCollapsed: boolean;

    setRoute: (route: Route) => void;
    setLoading: (loading: boolean) => void;
    toggleSidebar: () => void;
    setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
    currentRoute: 'dashboard',
    previousRoute: null,
    loading: false,
    sidebarCollapsed: false,

    setRoute: (route: Route) => {
        const { currentRoute } = get();
        if (currentRoute === route) return;
        set({ currentRoute: route, previousRoute: currentRoute });
    },

    setLoading: (loading: boolean) => set({ loading }),

    toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),

    setSidebarCollapsed: (collapsed: boolean) => set({ sidebarCollapsed: collapsed }),
}));