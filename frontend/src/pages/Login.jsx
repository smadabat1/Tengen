import { useState } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth'
import { getErrorMessage } from '@/api/client'
import { cn } from '@/lib/utils'

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  master_password: z.string().min(1, 'Password is required'),
})

export default function LoginPage() {
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const res = await authApi.login(data.username, data.master_password)
      setAuth(res.access_token, res.username)
      navigate({ to: '/vault' })
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1">
          <h2 className="text-xl font-heading font-semibold">Welcome back</h2>
          <p className="text-sm text-muted-foreground">Sign in to your vault</p>
        </div>

        {/* Username */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Username</label>
          <input
            {...register('username')}
            autoComplete="username"
            className={cn(
              'w-full px-3 py-2 text-sm bg-input border rounded-lg',
              'placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring',
              'transition-colors',
              errors.username && 'border-destructive focus:ring-destructive'
            )}
            placeholder="your-username"
          />
          {errors.username && (
            <p className="text-xs text-destructive">{errors.username.message}</p>
          )}
        </div>

        {/* Master password */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Master Password</label>
          <div className="relative">
            <input
              {...register('master_password')}
              type={showPass ? 'text' : 'password'}
              autoComplete="current-password"
              className={cn(
                'w-full px-3 py-2 pr-10 text-sm bg-input border rounded-lg',
                'placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring',
                'transition-colors',
                errors.master_password && 'border-destructive focus:ring-destructive'
              )}
              placeholder="••••••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.master_password && (
            <p className="text-xs text-destructive">{errors.master_password.message}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2.5 px-4',
            'bg-primary text-primary-foreground font-medium text-sm rounded-lg',
            'hover:opacity-90 active:scale-[0.98] transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          ) : (
            <LogIn className="w-4 h-4" />
          )}
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        <p className="text-center text-sm text-muted-foreground">
          No account?{' '}
          <Link to="/register" className="text-primary hover:underline font-medium">
            Create one
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
