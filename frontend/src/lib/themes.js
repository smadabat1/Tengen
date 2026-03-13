/**
 * Tengen — Theme System
 *
 * Each theme has `light` and `dark` mode variants.
 * applyTheme(themeKey, mode) applies CSS vars and injects fonts.
 */

export const THEMES = {
  obsidian: {
    name: 'Obsidian',
    description: 'Gold on black',
    fonts: {
      heading: 'Playfair+Display:wght@400;600;700',
      body: 'Inter:wght@300;400;500;600',
      headingFamily: 'Playfair Display',
      bodyFamily: 'Inter',
    },
    modes: {
      dark: {
        preview: { bg: '#09090b', surface: '#18181b', accent: '#d4a853' },
        vars: {
          '--background':             '240 10% 4%',
          '--foreground':             '0 0% 95%',
          '--card':                   '240 6% 8%',
          '--card-foreground':        '0 0% 95%',
          '--popover':                '240 6% 7%',
          '--popover-foreground':     '0 0% 95%',
          '--primary':                '43 65% 57%',
          '--primary-foreground':     '240 10% 4%',
          '--secondary':              '240 4% 14%',
          '--secondary-foreground':   '0 0% 80%',
          '--muted':                  '240 4% 11%',
          '--muted-foreground':       '0 0% 48%',
          '--accent':                 '43 65% 57%',
          '--accent-foreground':      '240 10% 4%',
          '--destructive':            '0 72% 51%',
          '--destructive-foreground': '0 0% 98%',
          '--border':                 '240 4% 16%',
          '--input':                  '240 4% 13%',
          '--ring':                   '43 65% 57%',
          '--radius':                 '0.375rem',
          '--font-heading':           '"Playfair Display"',
          '--font-body':              '"Inter"',
        },
      },
      light: {
        preview: { bg: '#fafaf9', surface: '#f5f5f4', accent: '#a16207' },
        vars: {
          '--background':             '30 20% 97%',
          '--foreground':             '30 10% 10%',
          '--card':                   '0 0% 100%',
          '--card-foreground':        '30 10% 10%',
          '--popover':                '0 0% 100%',
          '--popover-foreground':     '30 10% 10%',
          '--primary':                '43 85% 38%',
          '--primary-foreground':     '0 0% 100%',
          '--secondary':              '30 15% 92%',
          '--secondary-foreground':   '30 10% 25%',
          '--muted':                  '30 15% 94%',
          '--muted-foreground':       '30 8% 46%',
          '--accent':                 '43 85% 38%',
          '--accent-foreground':      '0 0% 100%',
          '--destructive':            '0 72% 51%',
          '--destructive-foreground': '0 0% 98%',
          '--border':                 '30 12% 86%',
          '--input':                  '30 12% 90%',
          '--ring':                   '43 85% 38%',
          '--radius':                 '0.375rem',
          '--font-heading':           '"Playfair Display"',
          '--font-body':              '"Inter"',
        },
      },
    },
  },

  ocean: {
    name: 'Ocean',
    description: 'Deep blue & cyan',
    fonts: {
      heading: 'Plus+Jakarta+Sans:wght@400;600;700',
      body: 'Plus+Jakarta+Sans:wght@300;400;500',
      headingFamily: 'Plus Jakarta Sans',
      bodyFamily: 'Plus Jakarta Sans',
    },
    modes: {
      dark: {
        preview: { bg: '#030d17', surface: '#071c2e', accent: '#22d3ee' },
        vars: {
          '--background':             '210 97% 5%',
          '--foreground':             '195 30% 92%',
          '--card':                   '210 80% 8%',
          '--card-foreground':        '195 30% 92%',
          '--popover':                '210 80% 7%',
          '--popover-foreground':     '195 30% 92%',
          '--primary':                '188 94% 43%',
          '--primary-foreground':     '210 97% 5%',
          '--secondary':              '210 60% 13%',
          '--secondary-foreground':   '195 20% 72%',
          '--muted':                  '210 60% 10%',
          '--muted-foreground':       '195 15% 48%',
          '--accent':                 '188 94% 43%',
          '--accent-foreground':      '210 97% 5%',
          '--destructive':            '0 72% 51%',
          '--destructive-foreground': '0 0% 98%',
          '--border':                 '210 55% 17%',
          '--input':                  '210 55% 13%',
          '--ring':                   '188 94% 43%',
          '--radius':                 '0.3rem',
          '--font-heading':           '"Plus Jakarta Sans"',
          '--font-body':              '"Plus Jakarta Sans"',
        },
      },
      light: {
        preview: { bg: '#f0f9ff', surface: '#e0f2fe', accent: '#0284c7' },
        vars: {
          '--background':             '204 100% 97%',
          '--foreground':             '210 40% 10%',
          '--card':                   '0 0% 100%',
          '--card-foreground':        '210 40% 10%',
          '--popover':                '0 0% 100%',
          '--popover-foreground':     '210 40% 10%',
          '--primary':                '199 89% 40%',
          '--primary-foreground':     '0 0% 100%',
          '--secondary':              '204 60% 90%',
          '--secondary-foreground':   '210 40% 22%',
          '--muted':                  '204 40% 93%',
          '--muted-foreground':       '210 20% 46%',
          '--accent':                 '199 89% 40%',
          '--accent-foreground':      '0 0% 100%',
          '--destructive':            '0 72% 51%',
          '--destructive-foreground': '0 0% 98%',
          '--border':                 '204 35% 84%',
          '--input':                  '204 35% 89%',
          '--ring':                   '199 89% 40%',
          '--radius':                 '0.3rem',
          '--font-heading':           '"Plus Jakarta Sans"',
          '--font-body':              '"Plus Jakarta Sans"',
        },
      },
    },
  },

  rose: {
    name: 'Rose',
    description: 'Romantic & bold',
    fonts: {
      heading: 'Cormorant+Garamond:wght@400;600;700',
      body: 'DM+Sans:wght@300;400;500',
      headingFamily: 'Cormorant Garamond',
      bodyFamily: 'DM Sans',
    },
    modes: {
      dark: {
        preview: { bg: '#0f0a14', surface: '#1a1025', accent: '#f472b6' },
        vars: {
          '--background':             '270 45% 7%',
          '--foreground':             '320 25% 92%',
          '--card':                   '270 40% 10%',
          '--card-foreground':        '320 25% 92%',
          '--popover':                '270 40% 8%',
          '--popover-foreground':     '320 25% 92%',
          '--primary':                '330 80% 70%',
          '--primary-foreground':     '270 45% 7%',
          '--secondary':              '270 30% 16%',
          '--secondary-foreground':   '320 18% 74%',
          '--muted':                  '270 30% 12%',
          '--muted-foreground':       '320 10% 52%',
          '--accent':                 '330 80% 70%',
          '--accent-foreground':      '270 45% 7%',
          '--destructive':            '0 72% 56%',
          '--destructive-foreground': '0 0% 98%',
          '--border':                 '270 26% 20%',
          '--input':                  '270 28% 16%',
          '--ring':                   '330 80% 70%',
          '--radius':                 '0.45rem',
          '--font-heading':           '"Cormorant Garamond"',
          '--font-body':              '"DM Sans"',
        },
      },
      light: {
        preview: { bg: '#fff1f5', surface: '#ffe4ed', accent: '#e11d48' },
        vars: {
          '--background':             '343 100% 97%',
          '--foreground':             '340 20% 12%',
          '--card':                   '0 0% 100%',
          '--card-foreground':        '340 20% 12%',
          '--popover':                '0 0% 100%',
          '--popover-foreground':     '340 20% 12%',
          '--primary':                '343 88% 47%',
          '--primary-foreground':     '0 0% 100%',
          '--secondary':              '343 40% 92%',
          '--secondary-foreground':   '340 20% 28%',
          '--muted':                  '343 30% 94%',
          '--muted-foreground':       '340 10% 48%',
          '--accent':                 '343 88% 47%',
          '--accent-foreground':      '0 0% 100%',
          '--destructive':            '0 72% 51%',
          '--destructive-foreground': '0 0% 98%',
          '--border':                 '343 25% 86%',
          '--input':                  '343 25% 90%',
          '--ring':                   '343 88% 47%',
          '--radius':                 '0.45rem',
          '--font-heading':           '"Cormorant Garamond"',
          '--font-body':              '"DM Sans"',
        },
      },
    },
  },

  forest: {
    name: 'Forest',
    description: 'Deep & natural',
    fonts: {
      heading: 'Libre+Baskerville:wght@400;700',
      body: 'Nunito:wght@300;400;500;600',
      headingFamily: 'Libre Baskerville',
      bodyFamily: 'Nunito',
    },
    modes: {
      dark: {
        preview: { bg: '#071a0e', surface: '#0d2416', accent: '#34d399' },
        vars: {
          '--background':             '143 55% 6%',
          '--foreground':             '140 20% 92%',
          '--card':                   '143 50% 9%',
          '--card-foreground':        '140 20% 92%',
          '--popover':                '143 50% 7%',
          '--popover-foreground':     '140 20% 92%',
          '--primary':                '160 84% 46%',
          '--primary-foreground':     '143 55% 5%',
          '--secondary':              '143 40% 13%',
          '--secondary-foreground':   '140 15% 74%',
          '--muted':                  '143 40% 10%',
          '--muted-foreground':       '140 10% 48%',
          '--accent':                 '160 84% 46%',
          '--accent-foreground':      '143 55% 5%',
          '--destructive':            '0 72% 51%',
          '--destructive-foreground': '0 0% 98%',
          '--border':                 '143 35% 16%',
          '--input':                  '143 38% 13%',
          '--ring':                   '160 84% 46%',
          '--radius':                 '0.3rem',
          '--font-heading':           '"Libre Baskerville"',
          '--font-body':              '"Nunito"',
        },
      },
      light: {
        preview: { bg: '#f0fdf4', surface: '#dcfce7', accent: '#059669' },
        vars: {
          '--background':             '138 76% 97%',
          '--foreground':             '143 30% 10%',
          '--card':                   '0 0% 100%',
          '--card-foreground':        '143 30% 10%',
          '--popover':                '0 0% 100%',
          '--popover-foreground':     '143 30% 10%',
          '--primary':                '161 78% 34%',
          '--primary-foreground':     '0 0% 100%',
          '--secondary':              '138 40% 90%',
          '--secondary-foreground':   '143 25% 22%',
          '--muted':                  '138 30% 93%',
          '--muted-foreground':       '143 12% 46%',
          '--accent':                 '161 78% 34%',
          '--accent-foreground':      '0 0% 100%',
          '--destructive':            '0 72% 51%',
          '--destructive-foreground': '0 0% 98%',
          '--border':                 '138 28% 84%',
          '--input':                  '138 28% 89%',
          '--ring':                   '161 78% 34%',
          '--radius':                 '0.3rem',
          '--font-heading':           '"Libre Baskerville"',
          '--font-body':              '"Nunito"',
        },
      },
    },
  },

  violet: {
    name: 'Violet',
    description: 'Mystical & focused',
    fonts: {
      heading: 'Josefin+Sans:wght@300;400;600;700',
      body: 'Josefin+Sans:wght@300;400;500',
      headingFamily: 'Josefin Sans',
      bodyFamily: 'Josefin Sans',
    },
    modes: {
      dark: {
        preview: { bg: '#0c0617', surface: '#140f26', accent: '#a78bfa' },
        vars: {
          '--background':             '258 55% 7%',
          '--foreground':             '260 25% 93%',
          '--card':                   '258 50% 10%',
          '--card-foreground':        '260 25% 93%',
          '--popover':                '258 50% 8%',
          '--popover-foreground':     '260 25% 93%',
          '--primary':                '263 70% 72%',
          '--primary-foreground':     '258 55% 7%',
          '--secondary':              '258 38% 16%',
          '--secondary-foreground':   '260 18% 74%',
          '--muted':                  '258 38% 12%',
          '--muted-foreground':       '260 12% 50%',
          '--accent':                 '263 70% 72%',
          '--accent-foreground':      '258 55% 7%',
          '--destructive':            '0 72% 56%',
          '--destructive-foreground': '0 0% 98%',
          '--border':                 '258 32% 20%',
          '--input':                  '258 34% 16%',
          '--ring':                   '263 70% 72%',
          '--radius':                 '0.45rem',
          '--font-heading':           '"Josefin Sans"',
          '--font-body':              '"Josefin Sans"',
        },
      },
      light: {
        preview: { bg: '#faf5ff', surface: '#f3e8ff', accent: '#7c3aed' },
        vars: {
          '--background':             '270 100% 98%',
          '--foreground':             '270 30% 11%',
          '--card':                   '0 0% 100%',
          '--card-foreground':        '270 30% 11%',
          '--popover':                '0 0% 100%',
          '--popover-foreground':     '270 30% 11%',
          '--primary':                '263 70% 50%',
          '--primary-foreground':     '0 0% 100%',
          '--secondary':              '270 40% 92%',
          '--secondary-foreground':   '270 25% 24%',
          '--muted':                  '270 30% 94%',
          '--muted-foreground':       '270 12% 48%',
          '--accent':                 '263 70% 50%',
          '--accent-foreground':      '0 0% 100%',
          '--destructive':            '0 72% 51%',
          '--destructive-foreground': '0 0% 98%',
          '--border':                 '270 25% 86%',
          '--input':                  '270 25% 90%',
          '--ring':                   '263 70% 50%',
          '--radius':                 '0.45rem',
          '--font-heading':           '"Josefin Sans"',
          '--font-body':              '"Josefin Sans"',
        },
      },
    },
  },

  sand: {
    name: 'Sand',
    description: 'Warm & editorial',
    fonts: {
      heading: 'Lora:wght@400;600;700',
      body: 'Source+Sans+3:wght@300;400;500;600',
      headingFamily: 'Lora',
      bodyFamily: 'Source Sans 3',
    },
    modes: {
      dark: {
        preview: { bg: '#18120a', surface: '#241a0f', accent: '#f59e0b' },
        vars: {
          '--background':             '28 40% 7%',
          '--foreground':             '35 25% 90%',
          '--card':                   '28 35% 10%',
          '--card-foreground':        '35 25% 90%',
          '--popover':                '28 35% 8%',
          '--popover-foreground':     '35 25% 90%',
          '--primary':                '38 92% 50%',
          '--primary-foreground':     '28 40% 7%',
          '--secondary':              '28 28% 16%',
          '--secondary-foreground':   '35 18% 72%',
          '--muted':                  '28 28% 13%',
          '--muted-foreground':       '35 10% 50%',
          '--accent':                 '38 92% 50%',
          '--accent-foreground':      '28 40% 7%',
          '--destructive':            '0 72% 51%',
          '--destructive-foreground': '0 0% 98%',
          '--border':                 '28 25% 18%',
          '--input':                  '28 27% 14%',
          '--ring':                   '38 92% 50%',
          '--radius':                 '0.3rem',
          '--font-heading':           '"Lora"',
          '--font-body':              '"Source Sans 3"',
        },
      },
      light: {
        preview: { bg: '#fffbeb', surface: '#fef3c7', accent: '#d97706' },
        vars: {
          '--background':             '48 100% 97%',
          '--foreground':             '28 30% 12%',
          '--card':                   '0 0% 100%',
          '--card-foreground':        '28 30% 12%',
          '--popover':                '0 0% 100%',
          '--popover-foreground':     '28 30% 12%',
          '--primary':                '32 95% 44%',
          '--primary-foreground':     '0 0% 100%',
          '--secondary':              '45 60% 91%',
          '--secondary-foreground':   '28 25% 24%',
          '--muted':                  '45 40% 93%',
          '--muted-foreground':       '28 12% 48%',
          '--accent':                 '32 95% 44%',
          '--accent-foreground':      '0 0% 100%',
          '--destructive':            '0 72% 51%',
          '--destructive-foreground': '0 0% 98%',
          '--border':                 '40 30% 84%',
          '--input':                  '40 30% 89%',
          '--ring':                   '32 95% 44%',
          '--radius':                 '0.3rem',
          '--font-heading':           '"Lora"',
          '--font-body':              '"Source Sans 3"',
        },
      },
    },
  },
}

export const DEFAULT_THEME = 'forest'
export const DEFAULT_MODE  = 'dark'
export const THEME_STORAGE_KEY = 'tengen_theme'
export const MODE_STORAGE_KEY  = 'tengen_mode'

export function applyTheme(themeKey, mode) {
  const theme      = THEMES[themeKey] || THEMES[DEFAULT_THEME]
  const activeMode = mode || getSavedMode()
  const modeVars   = theme.modes[activeMode] || theme.modes.dark

  const root = document.documentElement
  root.setAttribute('data-theme', themeKey)
  root.setAttribute('data-mode', activeMode)

  Object.entries(modeVars.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })

  _injectFont(theme.fonts.heading, theme.fonts.body)

  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeKey)
    localStorage.setItem(MODE_STORAGE_KEY, activeMode)
  } catch (_) {}
}

function _injectFont(heading, body) {
  const id = `tengen-font-${heading.split(':')[0]}`
  if (document.getElementById(id)) return
  document.querySelectorAll('[data-tengen-font]').forEach((el) => el.remove())
  const families = heading === body ? heading : `${heading}&family=${body}`
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.dataset.tengenFont = 'true'
  link.href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`
  document.head.appendChild(link)
}

export function getSavedTheme() {
  try { return localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME } catch (_) { return DEFAULT_THEME }
}

export function getSavedMode() {
  try { return localStorage.getItem(MODE_STORAGE_KEY) || DEFAULT_MODE } catch (_) { return DEFAULT_MODE }
}
