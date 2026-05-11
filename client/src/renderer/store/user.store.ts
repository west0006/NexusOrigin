// ─── client/src/renderer/store/user.store.ts ──────────────
import { create } from 'zustand';

interface User {
    id: string;
    email: string;
    username: string;
}

interface UserState {
    user: User | null;
    setUser: (user: User | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
    user: null,
    setUser: (user) => set({ user }),
}));