import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Copy, Pencil, Trash2, ShieldAlert, ShieldCheck, Shield, Loader2, CopyCheck, Clock } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useClipboard } from '@/hooks/useClipboard'
import { toolsApi } from '@/api/tools'
import { STRENGTH_LABELS, STRENGTH_COLORS, STRENGTH_BG, timeAgo, cn, getAgeDays, PASSWORD_AGE_THRESHOLD_DAYS } from '@/lib/utils'
import { EntryFavicon } from '@/components/vault/EntryFavicon'
import { Tooltip } from '@/components/ui/Tooltip'

/**
 * EntryCard — displays a single vault entry.
 * Props:
 *   entry: EntryResponse
 *   onEdit: (entry) => void
 *   onDelete: (entry) => void
 */
export function EntryCard({ entry, onEdit, onDelete, sharedWith }) {
  const [showPassword, setShowPassword] = useState(false)
  const [checkingHibp, setCheckingHibp] = useState(false)
  const { copy, copied } = useClipboard()
  const queryClient = useQueryClient()

  const handleHibpCheck = async () => {
    if (checkingHibp) return
    setCheckingHibp(true)
    try {
      let pwned = 0, clean = 0
      const result = await toolsApi.hibpCheck(entry.id);
      const status = result?.pwned ? 'pwned' : 'clean';
      
      if (status === 'pwned') pwned++
      else clean++

      //Save the results in history.
      await toolsApi.saveHibpRun({ total: 1, pwned, clean })

      queryClient.invalidateQueries({ queryKey: ['entries'] })
      queryClient.invalidateQueries({ queryKey: ['health'] })
      //Refresh the results in history.
      queryClient.invalidateQueries({ queryKey: ['hibp-runs'] })
    } catch(error) {
      console.error(error)
      toast.error('HIBP check failed')
    } finally {
      setCheckingHibp(false)
    }
  }

  const strength = entry.strength_score
  const strengthLabel = strength != null ? STRENGTH_LABELS[strength] : null
  const strengthColor = strength != null ? STRENGTH_COLORS[strength] : null
  const strengthBg = strength != null ? STRENGTH_BG[strength] : null

  const ageDays = getAgeDays(entry.updated_at)
  const isOld = ageDays > PASSWORD_AGE_THRESHOLD_DAYS

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="group relative bg-card border border-border/60 rounded-xl p-4 hover:border-primary/40 card-glow transition-all"
    >
      {/* Header row */}
      <div className="flex items-center gap-3 mb-3">
        {/* Favicon / initial */}
        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
          <EntryFavicon url={entry.url} title={entry.title} size={20} />
        </div>

        {/* Title + URL */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{entry.title}</p>
          {entry.url && (
            <a
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary truncate block max-w-full transition-colors"
              title={entry.url}
            >
              {entry.url.replace(/^https?:\/\//, '').split('/')[0]}
            </a>
          )}
        </div>

        {/* Actions — show on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleHibpCheck}
            disabled={checkingHibp}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
            title="Check breach status (HIBP)"
          >
            {checkingHibp
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Shield className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => onEdit(entry)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(entry)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Username */}
      {entry.username && (
        <p className="text-xs text-muted-foreground mb-2 truncate">
          {entry.username}
        </p>
      )}

      {/* Password row */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 flex items-center gap-2 px-2.5 py-1.5 bg-secondary rounded-lg min-w-0">
          <span className="font-mono text-xs text-foreground flex-1 truncate">
            {showPassword ? entry.password : '•'.repeat(Math.min(entry.password?.length || 12, 16))}
          </span>
        </div>
        <button
          onClick={() => setShowPassword(!showPassword)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex-shrink-0"
          title={showPassword ? 'Hide' : 'Show'}
        >
          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={() => copy(entry.password, entry.title)}
          className={cn(
            'p-1.5 rounded-lg transition-colors flex-shrink-0',
            copied
              ? 'text-emerald-500 bg-emerald-500/10'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          )}
          title="Copy password"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tags */}
      {entry.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {entry.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 text-[10px] bg-secondary text-muted-foreground rounded-md"
            >
              {tag}
            </span>
          ))}
          {entry.tags.length > 3 && (
            <span className="px-1.5 py-0.5 text-[10px] text-muted-foreground">
              +{entry.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer badges */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Strength badge */}
        {strength != null && (
          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-md', `${strengthBg}/10`, strengthColor)}>
            {strengthLabel}
          </span>
        )}

        {/* Duplicate password badge */}
        {sharedWith?.length > 0 && (
          <Tooltip
            side="top"
            content={
              <div className="space-y-1">
                <p className="font-semibold text-[11px]">Same password as:</p>
                {sharedWith.map((t, i) => (
                  <p key={i} className="text-muted-foreground">• {t}</p>
                ))}
              </div>
            }
          >
            <span className="flex items-center gap-1 text-[10px] text-amber-500 px-1.5 py-0.5 rounded-md bg-amber-500/10 cursor-default">
              <CopyCheck className="w-3 h-3" />
              Reused
            </span>
          </Tooltip>
        )}

        {/* Password age badge */}
        {isOld && (
          <Tooltip content={`Not changed in ${ageDays} days`} side="top">
            <span className="flex items-center gap-1 text-[10px] text-orange-500 px-1.5 py-0.5 rounded-md bg-orange-500/10 cursor-default">
              <Clock className="w-3 h-3" />
              Outdated
            </span>
          </Tooltip>
        )}

        {/* HIBP badge */}
        <HIBPBadge
          pwned={entry.hibp_pwned}
          checked={!!entry.hibp_checked_at}
          checking={checkingHibp}
        />
      </div>

      {/* Date — separate row so badges always wrap cleanly */}
      <p className="text-[10px] text-muted-foreground mt-1.5">
        {timeAgo(entry.updated_at)}
      </p>
    </motion.div>
  )
}

function HIBPBadge({ pwned, checked, checking }) {
  if (checking) {
    return (
      <span className="flex items-center gap-1 text-[10px] text-primary px-1.5 py-0.5 rounded-md bg-primary/10">
        <Loader2 className="w-3 h-3 animate-spin" />
        Checking…
      </span>
    )
  }
  if (!checked) return null
  if (pwned) {
    return (
      <span className="flex items-center gap-1 text-[10px] text-red-500 px-1.5 py-0.5 rounded-md bg-red-500/10">
        <ShieldAlert className="w-3 h-3" />
        Pwned
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-[10px] text-emerald-500 px-1.5 py-0.5 rounded-md bg-emerald-500/10">
      <ShieldCheck className="w-3 h-3" />
      Clean
    </span>
  )
}
