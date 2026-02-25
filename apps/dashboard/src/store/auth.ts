import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@gamexamxi/shared'

type AuthStore = {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  _hasHydrated: boolean
  setAuth: (token: string, user: User) => void
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
      clearAuth: () => set({ token: null, user: null, isAuthenticated: false }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'gamexamxi-dashboard-auth',
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
