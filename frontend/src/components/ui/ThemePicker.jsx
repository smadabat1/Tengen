import { useState } from 'react'
import { Check, Sun, Moon } from 'lucide-react'
import { motion } from 'framer-motion'
import { THEMES, getSavedTheme, getSavedMode, applyTheme } from '@/lib/themes'
import { cn } from '@/lib/utils'

export function ThemePicker() {
  const [activeTheme, setActiveTheme] = useState(getSavedTheme)
  const [activeMode,  setActiveMode]  = useState(getSavedMode)

  const handleThemeSelect = (themeKey) => {
    applyTheme(themeKey, activeMode)
    setActiveTheme(themeKey)
  }

  const handleModeToggle = (mode) => {
    applyTheme(activeTheme, mode)
    setActiveMode(mode)
  }

  return (
    <div className="space-y-4">
      {/* Light / Dark toggle */}
      <div className="flex items-center gap-1 p-1 bg-secondary rounded-xl">
        {[
          { value: 'light', icon: Sun,  label: 'Light' },
          { value: 'dark',  icon: Moon, label: 'Dark'  },
        ].map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            onClick={() => handleModeToggle(value)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              activeMode === value
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Theme swatches */}
      <div className="grid grid-cols-3 gap-2.5">
        {Object.entries(THEMES).map(([key, theme]) => {
          const preview  = theme.modes[activeMode].preview
          const isActive = activeTheme === key
          return (
            <motion.button
              key={key}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleThemeSelect(key)}
              className={cn(
                'relative rounded-xl border-2 text-left p-3 transition-all cursor-pointer focus:outline-none',
                isActive
                  ? 'border-primary shadow-md'
                  : 'border-transparent hover:border-border/60'
              )}
              style={{ background: `linear-gradient(135deg, ${preview.surface}, ${preview.bg})` }}
            >
              {/* Color dots */}
              <div className="flex gap-1 mb-2">
                {[preview.bg, preview.surface, preview.accent].map((color, i) => (
                  <div
                    key={i}
                    className="w-3 h-3 rounded-full"
                    style={{ background: color, boxShadow: '0 0 0 1px rgba(0,0,0,0.15)' }}
                  />
                ))}
              </div>
              <p className="text-xs font-semibold leading-tight" style={{ color: preview.accent }}>
                {theme.name}
              </p>
              <p className="text-[10px] mt-0.5 leading-tight" style={{ color: preview.accent, opacity: 0.65 }}>
                {theme.description}
              </p>
              {isActive && (
                <div
                  className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: preview.accent }}
                >
                  <Check className="w-2.5 h-2.5" style={{ color: preview.bg }} />
                </div>
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
