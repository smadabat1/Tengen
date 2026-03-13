import { useState } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, ChevronUp, Vault, ShieldCheck, Settings, Sun, Moon, ScanSearch, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { vaultApi } from '@/api/vault'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { applyTheme, getSavedTheme, getSavedMode } from '@/lib/themes'
import { TagFilter } from './TagFilter'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { path: '/vault',      icon: Vault,       label: 'Vault'     },
  { path: '/health',     icon: ShieldCheck, label: 'Health'    },
  { path: '/analyse',    icon: ScanSearch,  label: 'Analyse'   },
  { path: '/generator',  icon: Wand2,       label: 'Generator' },
  { path: '/settings',   icon: Settings,    label: 'Settings'  },
]

export function Sidebar({ activeTag, onTagSelect, className }) {
  const { location } = useRouterState()

  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: vaultApi.listTags,
    staleTime: 1000 * 30,
  })

  const { username, logout } = useAuthStore()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [mode, setMode] = useState(getSavedMode)

  const handleModeToggle = (newMode) => {
    applyTheme(getSavedTheme(), newMode)
    setMode(newMode)
  }

  const handleLogout = async () => {
    setLogoutConfirmOpen(false)
    setLoggingOut(true)
    try { await authApi.logout() } catch (_) {}
    logout()
    navigate({ to: '/login' })
    toast.success('Logged out')
  }

  return (
    <div className={cn('w-full h-full flex flex-col py-3 px-2', className)}>
      {/* Top nav links */}
      <div className="space-y-0.5 mb-3 pb-3 border-b border-border/30">
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path
          return (
            <button
              key={path}
              onClick={() => navigate({ to: path })}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'text-foreground font-medium bg-secondary/70'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{label}</span>
              {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
            </button>
          )
        })}
      </div>

      {/* Tags — scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <TagFilter
          tags={tagsData?.tags || []}
          activeTag={activeTag}
          onSelect={onTagSelect}
        />
      </div>

      {/* Logout confirm dialog */}
      <Dialog.Root open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <AnimatePresence>
          {logoutConfirmOpen && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                />
              </Dialog.Overlay>
              <Dialog.Content asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                  style={{ position: 'fixed', zIndex: 50, top: '50%', left: '50%', x: '-50%', y: '-50%' }}
                  className="w-full max-w-sm bg-card border border-border rounded-xl shadow-2xl p-6"
                >
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
                    <LogOut className="w-5 h-5 text-destructive" />
                  </div>
                  <Dialog.Title className="text-base font-semibold mb-1">Sign out?</Dialog.Title>
                  <p className="text-sm text-muted-foreground mb-6">
                    You'll need to enter your master password again to access your vault.
                  </p>
                  <div className="flex gap-2">
                    <Dialog.Close asChild>
                      <button className="flex-1 py-2 bg-secondary hover:bg-secondary/80 text-sm font-medium rounded-xl transition-colors">
                        Cancel
                      </button>
                    </Dialog.Close>
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="flex-1 py-2 bg-destructive text-destructive-foreground text-sm font-medium rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {loggingOut ? 'Signing out…' : 'Sign out'}
                    </button>
                  </div>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>

      {/* User card at bottom */}
      <div className="mt-2 pt-2 border-t border-border/30">
        <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenu.Trigger asChild>
            <button className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all text-left focus:outline-none',
              menuOpen
                ? 'bg-secondary border-primary/30'
                : 'bg-secondary/40 border-border/30 hover:bg-secondary hover:border-border/60'
            )}>
              <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary uppercase">
                  {username?.[0] || '?'}
                </span>
              </div>
              <span className="text-sm text-foreground/80 truncate flex-1 min-w-0 font-medium">
                {username || '—'}
              </span>
              <ChevronUp className={cn(
                'w-3.5 h-3.5 text-muted-foreground flex-shrink-0 transition-transform duration-200',
                menuOpen ? 'rotate-0' : 'rotate-180'
              )} />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              side="top"
              sideOffset={8}
              align="start"
              className={cn(
                'z-50 w-64 rounded-lg border border-border bg-card shadow-2xl p-3',
                'data-[state=open]:animate-in data-[state=closed]:animate-out',
                'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
                'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
                'data-[side=top]:slide-in-from-bottom-2'
              )}
            >
              {/* User header */}
              <div className="flex items-center gap-3 px-1 py-2 mb-3">
                <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-base font-bold text-primary uppercase">{username?.[0] || '?'}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{username || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">Vault owner</p>
                </div>
              </div>

              <div className="border-t border-border/40 mb-3" />

              {/* Light / Dark mode toggle */}
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-1 mb-2">
                Appearance
              </p>
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
                      mode === value
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="border-t border-border/40 mt-3 mb-1.5" />

              {/* Logout */}
              <DropdownMenu.Item asChild>
                <button
                  onClick={() => { setMenuOpen(false); setLogoutConfirmOpen(true) }}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer focus:outline-none"
                >
                  <LogOut className="w-4 h-4" />
                  Log out
                </button>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </div>
  )
}
