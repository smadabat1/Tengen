import { useState } from 'react'
import { Eye, EyeOff, Copy, Pencil, Trash2, ShieldOff, ShieldAlert, ShieldCheck, Shield, Loader2, CopyCheck, Clock } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useClipboard } from '@/hooks/useClipboard'
import { toolsApi } from '@/api/tools'
import { STRENGTH_LABELS, STRENGTH_COLORS, STRENGTH_BG, timeAgo, cn, getAgeDays, PASSWORD_AGE_THRESHOLD_DAYS } from '@/lib/utils'
import { EntryFavicon } from '@/components/vault/EntryFavicon'
import { Tooltip } from '@/components/ui/Tooltip'

const COLS = ['', 'Title', 'Username', 'Password', 'Tags', 'Strength', 'HIBP', 'Updated', '']

function TableRow({ entry, onEdit, onDelete, sharedWith }) {
  const [showPassword, setShowPassword] = useState(false)
  const [checkingHibp, setCheckingHibp] = useState(false)
  const { copy, copied } = useClipboard()
  const queryClient = useQueryClient()

  const strength = entry.strength_score
  const strengthLabel = strength != null ? STRENGTH_LABELS[strength] : null
  const strengthColor = strength != null ? STRENGTH_COLORS[strength] : null
  const strengthBg = strength != null ? STRENGTH_BG[strength] : null
  const ageDays = getAgeDays(entry.updated_at)

  const handleHibpCheck = async () => {
    if (checkingHibp) return
    setCheckingHibp(true)
    try {
      await toolsApi.hibpCheck(entry.id)
      queryClient.invalidateQueries({ queryKey: ['entries'] })
      queryClient.invalidateQueries({ queryKey: ['health'] })
    } catch {
      toast.error('HIBP check failed')
    } finally {
      setCheckingHibp(false)
    }
  }

  return (
    <tr className="border-b border-border/20 hover:bg-secondary/30 transition-colors group">
      {/* Icon */}
      <td className="py-2.5 pl-3 pr-2 w-10">
        <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
          <EntryFavicon url={entry.url} title={entry.title} size={16} loading="lazy" textClassName="text-[10px] font-bold" />
        </div>
      </td>

      {/* Title + URL */}
      <td className="py-2.5 pr-4 max-w-[180px]">
        <p className="text-sm font-medium truncate">{entry.title}</p>
        {entry.url && (
          <a
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-muted-foreground hover:text-primary truncate block transition-colors"
          >
            {entry.url.replace(/^https?:\/\//, '').split('/')[0]}
          </a>
        )}
      </td>

      {/* Username */}
      <td className="py-2.5 pr-4 max-w-[140px]">
        <span className="text-xs text-muted-foreground truncate block">
          {entry.username || '—'}
        </span>
      </td>

      {/* Password */}
      <td className="py-2.5 pr-4">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs text-foreground">
            {showPassword ? entry.password : '•'.repeat(Math.min(entry.password?.length || 10, 14))}
          </span>
          {sharedWith?.length > 0 && (
            <Tooltip
              side="top"
              content={
                <div className="space-y-1">
                  <p className="font-semibold text-[11px]">Same password as:</p>
                  {sharedWith.map(t => (
                    <p key={t} className="text-muted-foreground">• {t}</p>
                  ))}
                </div>
              }
            >
              <span className="flex items-center gap-0.5 text-[10px] text-amber-500 px-1 py-0.5 rounded bg-amber-500/10 flex-shrink-0 cursor-default">
                <CopyCheck className="w-2.5 h-2.5" />
                Reused
              </span>
            </Tooltip>
          )}
          <button
            onClick={() => setShowPassword(!showPassword)}
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </button>
          <button
            onClick={() => copy(entry.password, entry.title)}
            className={cn(
              'p-1 rounded transition-colors flex-shrink-0',
              copied ? 'text-emerald-500' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
      </td>

      {/* Tags */}
      <td className="py-2.5 pr-4">
        <div className="flex items-center gap-1 flex-wrap">
          {entry.tags?.slice(0, 2).map(tag => (
            <span key={tag} className="px-1.5 py-0.5 text-[10px] bg-secondary text-muted-foreground rounded">
              {tag}
            </span>
          ))}
          {entry.tags?.length > 2 && (
            <span className="text-[10px] text-muted-foreground">+{entry.tags.length - 2}</span>
          )}
          {!entry.tags?.length && <span className="text-[10px] text-muted-foreground/40">—</span>}
        </div>
      </td>

      {/* Strength */}
      <td className="py-2.5 pr-4">
        {strength != null ? (
          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', `${strengthBg}/10`, strengthColor)}>
            {strengthLabel}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground/40">—</span>
        )}
      </td>

      {/* HIBP */}
      <td className="py-2.5 pr-4">
        {checkingHibp ? (
          <span className="flex items-center gap-1 text-[10px] text-primary">
            <Loader2 className="w-3 h-3 animate-spin" /> Checking…
          </span>
        ) : !entry.hibp_checked_at ? (
          <button
            onClick={handleHibpCheck}
            className="flex items-center gap-1 text-[10px] text-muted-foreground border border-dashed border-border/60 hover:border-primary/50 hover:text-primary rounded px-1.5 py-0.5 transition-colors"
          >
            <Shield className="w-3 h-3" /> Check
          </button>
        ) : entry.hibp_pwned ? (
          <button onClick={handleHibpCheck} className="flex items-center gap-1 text-[10px] text-red-500 hover:opacity-80 transition-opacity">
            <ShieldAlert className="w-3 h-3" /> Pwned
          </button>
        ) : (
          <button onClick={handleHibpCheck} className="flex items-center gap-1 text-[10px] text-emerald-500 hover:opacity-80 transition-opacity">
            <ShieldCheck className="w-3 h-3" /> Clean
          </button>
        )}
      </td>

      {/* Updated */}
      <td className="py-2.5 pr-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(entry.updated_at)}</span>
          {ageDays > PASSWORD_AGE_THRESHOLD_DAYS && (
            <Tooltip content={`Not changed in ${ageDays} days`} side="top">
              <span className="flex items-center gap-0.5 text-[10px] text-orange-500 px-1 py-0.5 rounded bg-orange-500/10 flex-shrink-0 cursor-default">
                <Clock className="w-2.5 h-2.5" />
                Outdated
              </span>
            </Tooltip>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="py-2.5 pr-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(entry)}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(entry)}
            className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

export function EntryTable({ entries = [], onEdit, onDelete, isLoading, duplicateMap }) {
  if (isLoading) {
    return (
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border/40">
              {COLS.map((col, i) => (
                <th key={i} className="text-left py-2.5 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-border/20">
                {COLS.map((_, j) => (
                  <td key={j} className="py-3 px-3">
                    <div className="h-4 bg-secondary rounded animate-pulse" style={{ width: j === 0 ? 28 : '80%' }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (!entries.length) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-24 text-center"
      >
        <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center mb-4">
          <ShieldOff className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-heading font-semibold text-lg mb-1">Your vault is empty</h3>
        <p className="text-sm text-muted-foreground max-w-xs">Add your first entry using the button below.</p>
      </motion.div>
    )
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-border/40">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border/40 bg-secondary/30">
            {COLS.map((col, i) => (
              <th
                key={i}
                className="text-left py-2.5 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap first:pl-3 last:pr-3"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map(entry => (
            <TableRow key={entry.id} entry={entry} onEdit={onEdit} onDelete={onDelete} sharedWith={duplicateMap?.get(entry.password)?.filter(t => t !== entry.title)} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
