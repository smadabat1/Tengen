import { motion } from 'framer-motion'
import { STRENGTH_LABELS, STRENGTH_BG, cn } from '@/lib/utils'

/**
 * Visual password strength meter.
 * Props:
 *   score: 0-4 (zxcvbn score)
 *   label: "Very Weak" | "Weak" | "Fair" | "Strong" | "Very Strong"
 *   feedback: string[]
 *   compact: boolean (hide feedback list)
 */
export function PasswordStrengthMeter({ score, label, feedback = [], compact = false }) {
  if (score === undefined || score === null) return null

  const segments = [0, 1, 2, 3, 4]

  return (
    <div className="space-y-2">
      {/* Bar segments */}
      <div className="flex gap-1">
        {segments.map((i) => (
          <div key={i} className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
            <motion.div
              className={cn('h-full rounded-full', i <= score ? STRENGTH_BG[score] : 'bg-transparent')}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: i <= score ? 1 : 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              style={{ transformOrigin: 'left' }}
            />
          </div>
        ))}
      </div>

      {/* Label */}
      <div className="flex items-center justify-between">
        <span className={cn('text-xs font-medium', STRENGTH_BG[score].replace('bg-', 'text-'))}>
          {label || STRENGTH_LABELS[score]}
        </span>
      </div>

      {/* Feedback */}
      {!compact && feedback.length > 0 && (
        <ul className="space-y-0.5">
          {feedback.slice(0, 3).map((tip, i) => (
            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
              <span className="mt-1 w-1 h-1 rounded-full bg-muted-foreground flex-shrink-0" />
              {tip}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
