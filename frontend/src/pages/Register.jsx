import { useState } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, UserPlus, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { authApi } from '@/api/auth'
import { getErrorMessage } from '@/api/client'
import { cn } from '@/lib/utils'

const schema = z
  .object({
    username: z
      .string()
      .min(3, 'At least 3 characters')
      .max(64, 'Max 64 characters')
      .regex(/^[a-zA-Z0-9_\-]+$/, 'Only letters, numbers, _ and - allowed'),
    master_password: z.string().min(8, 'At least 8 characters').max(256),
    confirm_password: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.master_password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

export default function RegisterPage() {
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await authApi.register(data.username, data.master_password)
      toast.success('Account created! Please sign in.')
      navigate({ to: '/login' })
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
          <h2 className="text-xl font-heading font-semibold">Create your vault</h2>
          <p className="text-sm text-muted-foreground">One master password protects everything</p>
        </div>

        {/* Warning banner */}
        <div className="flex gap-2.5 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-destructive leading-relaxed">
            Your master password <strong>cannot be recovered</strong>. If you forget it,
            you will lose access to your vault permanently. Store it safely.
          </p>
        </div>

        {/* Username */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Username</label>
          <input
            {...register('username')}
            autoComplete="username"
            className={cn(
              'w-full px-3 py-2 text-sm bg-input border rounded-lg',
              'placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors',
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
              autoComplete="new-password"
              className={cn(
                'w-full px-3 py-2 pr-10 text-sm bg-input border rounded-lg',
                'placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors',
                errors.master_password && 'border-destructive focus:ring-destructive'
              )}
              placeholder="Minimum 8 characters"
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

        {/* Confirm password */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Confirm Password</label>
          <div className="relative">
            <input
              {...register('confirm_password')}
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              className={cn(
                'w-full px-3 py-2 pr-10 text-sm bg-input border rounded-lg',
                'placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors',
                errors.confirm_password && 'border-destructive focus:ring-destructive'
              )}
              placeholder="Repeat your password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirm_password && (
            <p className="text-xs text-destructive">{errors.confirm_password.message}</p>
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
            <UserPlus className="w-4 h-4" />
          )}
          {loading ? 'Creating vault…' : 'Create Vault'}
        </button>

        <p className="text-center text-sm text-muted-foreground">
          Already have a vault?{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
