import { createContext, useContext, useCallback, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { User, LoginFormData } from '@gamexamxi/shared'
import { getMeApi, loginApi, logoutApi } from '@/lib/api/auth'
import { setAccessToken, setRefreshToken, clearAuth, isAuthenticated } from '@/lib/auth'
import { useRouter } from '@tanstack/react-router'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (data: LoginFormData) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const router = useRouter()

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await getMeApi()
      return res.data
    },
    enabled: isAuthenticated(),
    retry: false,
  })

  const loginMutation = useMutation({
    mutationFn: loginApi,
    onSuccess: async (res) => {
      setAccessToken(res.data.accessToken)
      setRefreshToken(res.data.refreshToken)
      qc.setQueryData(['auth', 'me'], res.data.user)
      await router.navigate({ to: '/' })
    },
  })

  const logoutMutation = useMutation({
    mutationFn: logoutApi,
    onSettled: async () => {
      clearAuth()
      qc.setQueryData(['auth', 'me'], null)
      qc.clear()
      await router.navigate({ to: '/login' })
    },
  })

  const login = useCallback(
    async (data: LoginFormData) => {
      await loginMutation.mutateAsync(data)
    },
    [loginMutation],
  )

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync()
  }, [logoutMutation])

  return (
    <AuthContext.Provider
      value={{
        user: meQuery.data ?? null,
        isLoading: meQuery.isLoading,
        isAuthenticated: !!meQuery.data,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
