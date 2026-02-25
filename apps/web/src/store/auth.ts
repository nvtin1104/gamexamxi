import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type User = {
  id: string
  username: string
  name: string | null
  email: string
  avatar: string | null
  bio: string | null
  role: string
  level: number
  experience: number
  points: number
  totalPointsEarned: number
  loginStreak: number
}

type AuthStore = {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  _hasHydrated: boolean
  setAuth: (token: string, user: User) => void
  updateUser: (user: Partial<User>) => void
  clearAuth: () => void
  setHasHydrated: (v: boolean) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setAuth: (token, user) => set({ token, user, isAuthenticated: true }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      clearAuth: () => set({ token: null, user: null, isAuthenticated: false }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'gamexamxi-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
