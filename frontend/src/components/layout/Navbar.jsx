import { useQuery } from '@tanstack/react-query'
import { Shield, Clock, AlertTriangle, ShieldAlert, Copy, Search } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { toolsApi } from '@/api/tools'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils'

const HEALTH_PILLS = [
  { key: 'weak',   icon: AlertTriangle, color: 'text-orange-500', label: 'Weak' },
  { key: 'pwned',  icon: ShieldAlert,   color: 'text-red-500',    label: 'Pwned' },
  { key: 'reused', icon: Copy,          color: 'text-yellow-500', label: 'Reused' },
  { key: 'old',    icon: Clock,         color: 'text-blue-400',   label: 'Old' },
]

export function Navbar({ onOpenSearch, secondsRemaining }) {
  const navigate = useNavigate()
  const isCountingDown = secondsRemaining !== null && secondsRemaining <= 60

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: toolsApi.getHealth,
    staleTime: 1000 * 60,
  })

  const totalIssues = HEALTH_PILLS.reduce((sum, p) => sum + (health?.[p.key] ?? 0), 0)
  const visiblePills = HEALTH_PILLS.filter((p) => (health?.[p.key] ?? 0) > 0)

  return (
    <header className="sticky top-0 z-40 border-b border-border/30 glass">
      <div className="flex items-center h-14 px-5 gap-3">

        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-heading font-semibold text-lg gradient-text tracking-wide">
            Tengen
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Auto-lock countdown */}
        {isCountingDown && (
          <div className="flex items-center gap-1 text-xs text-destructive animate-pulse flex-shrink-0">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono font-medium">
              {Math.floor(secondsRemaining / 60)}:{String(secondsRemaining % 60).padStart(2, '0')}
            </span>
          </div>
        )}

        {/* Search icon */}
        <Tooltip content="Search  ⌘K" side="bottom">
          <button
            onClick={onOpenSearch}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>
        </Tooltip>

        {/* Health indicator — far right */}
        <Tooltip content="Vault health" side="bottom">
          <button
            onClick={() => navigate({ to: '/health' })}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all',
              'glass hover:ring-1 hover:ring-primary/30 cursor-pointer',
              totalIssues > 0 ? 'border-border/50 hover:border-primary/40' : 'border-transparent hover:border-border/30'
            )}
          >
            {visiblePills.length > 0 ? (
              visiblePills.map(({ key, icon: Icon, color, label }, i) => (
                <span key={key} className="flex items-center gap-1">
                  {i > 0 && <span className="w-px h-3 bg-border/50 mx-0.5 flex-shrink-0" />}
                  <span className={cn('flex items-center gap-1 text-[11px] font-medium', color)}>
                    <Icon className="w-3 h-3" />
                    <span className="font-mono tabular-nums">{health[key]}</span>
                    <span>{label}</span>
                  </span>
                </span>
              ))
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                <span>Secure</span>
              </span>
            )}
          </button>
        </Tooltip>

      </div>
    </header>
  )
}
