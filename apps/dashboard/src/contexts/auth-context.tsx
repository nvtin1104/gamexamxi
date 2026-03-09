import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { User, LoginFormData } from '@gamexamxi/shared'
import { getMeApi, loginApi, logoutApi } from '@/lib/api/auth'
import { clearAuth } from '@/lib/auth'
import { useNavigate } from '@tanstack/react-router'

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
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await getMeApi()
      return res
    },
    retry: false,
    retryOnMount: false,
  })

  useEffect(() => {
    if (!meQuery.isLoading && meQuery.data) {
      setIsAuthenticated(true)
    }
  }, [meQuery.isLoading, meQuery.data])

  const loginMutation = useMutation({
    mutationFn: loginApi,
    onSuccess: async (res) => {
      if (res.accountRole !== 'admin') {
        throw new Error('Tài khoản không có quyền truy cập trang quản trị')
      }
      setIsAuthenticated(true)
      qc.setQueryData(['auth', 'me'], res)
      navigate({ to: '/' })
    },
  })

  const logoutMutation = useMutation({
    mutationFn: logoutApi,
    onSettled: async () => {
      setIsAuthenticated(false)
      clearAuth()
      qc.setQueryData(['auth', 'me'], null)
      qc.clear()
      navigate({ to: '/login' })
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
        isAuthenticated,
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
