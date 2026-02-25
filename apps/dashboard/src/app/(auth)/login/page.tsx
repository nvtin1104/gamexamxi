'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/store/auth'
import { authApi, ApiError } from '@/lib/api'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const trimmedEmail = email.trim()
      const trimmedPassword = password.trim()
      const res = await authApi.login({ email: trimmedEmail, password: trimmedPassword })
      setAuth(res.token, res.user)
      toast.success('Đăng nhập thành công')
      router.push('/overview')
    } catch (err) {
      if (err instanceof ApiError) {
        const errorMsg = err.status === 403 ? 'Tài khoản không có quyền truy cập admin panel' : err.message
        setError(errorMsg)
        toast.error(errorMsg)
      } else {
        setError('Đăng nhập thất bại')
        toast.error('Đăng nhập thất bại')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-brand" />
            <span className="font-bold">GameXamXi Admin</span>
          </div>
          <CardTitle className="text-2xl">Đăng nhập</CardTitle>
          <CardDescription>Nhập thông tin quản trị viên</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
