import { create } from 'zustand';
import { api } from '@/lib/api/axios';
import type { User } from '@/lib/api/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  fetchUser: () => Promise<void>;
  loginGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  
  fetchUser: async () => {
    try {
      set({ isLoading: true });
      const res = await api.get<User>('/auth/me');
      set({ user: res.data, isLoading: false });
    } catch {
      set({ user: null, isLoading: false });
    }
  },

  loginGoogle: async (idToken: string) => {
    const res = await api.post<User>('/auth/google', { idToken });
    set({ user: res.data });
  },

  logout: async () => {
    await api.post('/auth/logout');
    set({ user: null });
  },
}));

interface UIState {
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  toggleLoginModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isLoginModalOpen: false,
  openLoginModal: () => set({ isLoginModalOpen: true }),
  closeLoginModal: () => set({ isLoginModalOpen: false }),
  toggleLoginModal: () => set((state) => ({ isLoginModalOpen: !state.isLoginModalOpen })),
}));
