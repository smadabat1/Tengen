import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ShieldAlert, Copy, Clock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { toolsApi } from '@/api/tools'
import { vaultApi } from '@/api/vault'
import { cn } from '@/lib/utils'

const HEALTH_CARDS = [
  { key: 'weak', label: 'Weak', icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  { key: 'pwned', label: 'Pwned', icon: ShieldAlert, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  { key: 'reused', label: 'Reused', icon: Copy, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  { key: 'old', label: 'Old', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
]

/**
 * PasswordHealthPanel — sidebar health summary.
 * Props:
 *   onFilterChange: (filterType: string | null) => void
 */
export function PasswordHealthPanel({ onFilterChange, activeFilter }) {
  const queryClient = useQueryClient()

  const { data: health, isLoading } = useQuery({
    queryKey: ['health'],
    queryFn: toolsApi.getHealth,
    staleTime: 1000 * 60,
  })

  const { data: entries } = useQuery({
    queryKey: ['entries', {}],
    queryFn: () => vaultApi.listEntries(),
    staleTime: 1000 * 30,
  })

  const [checkingAll, setCheckingAll] = useState(false)

  const handleCheckAll = async () => {
    if (!entries?.length) return
    setCheckingAll(true)
    let checked = 0
    try {
      for (const entry of entries) {
        await toolsApi.hibpCheck(entry.id)
        checked++
      }
      queryClient.invalidateQueries({ queryKey: ['entries'] })
      queryClient.invalidateQueries({ queryKey: ['health'] })
      toast.success(`HIBP check complete — ${checked} entries checked`)
    } catch {
      toast.error('HIBP check failed')
    } finally {
      setCheckingAll(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2">
        Health
      </p>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {HEALTH_CARDS.map(({ key, label, icon: Icon, color, bg, border }) => {
            const count = health?.[key] || 0
            const isActive = activeFilter === key
            return (
              <button
                key={key}
                onClick={() => onFilterChange?.(isActive ? null : key)}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-2 px-1.5 rounded-xl border text-center transition-all',
                  isActive
                    ? `${bg} ${border} ${color}`
                    : count > 0
                    ? `${bg} ${border} ${color} hover:opacity-80`
                    : 'bg-secondary border-transparent text-muted-foreground opacity-50 cursor-default'
                )}
              >
                <Icon className="w-3 h-3" />
                <span className="text-sm font-bold font-mono leading-none">{count}</span>
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Check all HIBP */}
      <button
        onClick={handleCheckAll}
        disabled={checkingAll || !entries?.length}
        className={cn(
          'w-full flex items-center justify-center gap-1.5 py-1.5 px-3',
          'text-xs text-muted-foreground hover:text-foreground',
          'bg-secondary hover:bg-secondary/80 rounded-lg transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {checkingAll ? (
          <><Loader2 className="w-3 h-3 animate-spin" /> Checking…</>
        ) : (
          <><ShieldAlert className="w-3 h-3" /> Check all HIBP</>
        )}
      </button>
    </div>
  )
}
