import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Copy, Pencil, Trash2, ShieldAlert, ShieldCheck, Shield, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useClipboard } from '@/hooks/useClipboard'
import { toolsApi } from '@/api/tools'
import { STRENGTH_LABELS, STRENGTH_COLORS, STRENGTH_BG, getFaviconUrl, timeAgo, cn } from '@/lib/utils'

/**
 * EntryCard — displays a single vault entry.
 * Props:
 *   entry: EntryResponse
 *   onEdit: (entry) => void
 *   onDelete: (entry) => void
 */
export function EntryCard({ entry, onEdit, onDelete }) {
  const [showPassword, setShowPassword] = useState(false)
  const [checkingHibp, setCheckingHibp] = useState(false)
  const { copy, copied } = useClipboard()
  const queryClient = useQueryClient()
  const faviconUrl = getFaviconUrl(entry.url)

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

  const strength = entry.strength_score
  const strengthLabel = strength != null ? STRENGTH_LABELS[strength] : null
  const strengthColor = strength != null ? STRENGTH_COLORS[strength] : null
  const strengthBg = strength != null ? STRENGTH_BG[strength] : null

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
          {faviconUrl ? (
            <img
              src={faviconUrl}
              alt=""
              className="w-5 h-5 object-contain"
              onError={(e) => { e.target.style.display = 'none' }}
            />
          ) : (
            <span className="text-sm font-semibold text-primary uppercase">
              {entry.title[0] ?? "E"}
            </span>
          )}
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

        {/* HIBP badge */}
        <HIBPBadge
          pwned={entry.hibp_pwned}
          checked={!!entry.hibp_checked_at}
          checking={checkingHibp}
        />

        {/* Age */}
        <span className="text-[10px] text-muted-foreground ml-auto">
          {timeAgo(entry.updated_at)}
        </span>
      </div>
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
