import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { X, User, Palette, Shield } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { ThemePicker } from './ThemePicker'
import { cn } from '@/lib/utils'

export function SettingsModal({ open, onOpenChange }) {
  const { username } = useAuthStore()

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{ position: 'fixed', zIndex: 50, top: '50%', left: '50%', x: '-50%', y: '-50%' }}
                className={cn(
                  'w-full max-w-lg max-h-[85vh] overflow-y-auto',
                  'bg-card border border-border rounded-2xl shadow-2xl p-6'
                )}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-lg font-heading font-semibold">
                    Settings
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </Dialog.Close>
                </div>

                {/* Tabs */}
                <Tabs.Root defaultValue="appearance">
                  <Tabs.List className="flex gap-1 p-1 bg-secondary rounded-lg mb-6">
                    {[
                      { value: 'appearance', label: 'Appearance', icon: Palette },
                      { value: 'profile', label: 'Profile', icon: User },
                      { value: 'security', label: 'Security', icon: Shield },
                    ].map(({ value, label, icon: Icon }) => (
                      <Tabs.Trigger
                        key={value}
                        value={value}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5',
                          'text-xs font-medium rounded-md transition-all',
                          'text-muted-foreground hover:text-foreground',
                          'data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm'
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </Tabs.Trigger>
                    ))}
                  </Tabs.List>

                  {/* Appearance — Theme picker */}
                  <Tabs.Content value="appearance" className="space-y-4 animate-fade-in">
                    <div>
                      <h3 className="text-sm font-semibold mb-1">Theme</h3>
                      <p className="text-xs text-muted-foreground mb-4">
                        Choose your vault's visual style. Changes apply instantly.
                      </p>
                      <ThemePicker />
                    </div>
                  </Tabs.Content>

                  {/* Profile */}
                  <Tabs.Content value="profile" className="space-y-4 animate-fade-in">
                    <div className="flex items-center gap-4 p-4 bg-secondary rounded-xl">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-primary font-heading font-semibold text-lg uppercase">
                          {username?.[0] || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold">{username}</p>
                        <p className="text-xs text-muted-foreground">Vault owner</p>
                      </div>
                    </div>
                  </Tabs.Content>

                  {/* Security */}
                  <Tabs.Content value="security" className="space-y-4 animate-fade-in">
                    <div className="space-y-3">
                      <InfoRow label="Encryption" value="AES-256-GCM" />
                      <InfoRow label="Key Derivation" value="Argon2id" />
                      <InfoRow label="Session Storage" value="Memory only (sessionStorage)" />
                      <InfoRow label="Auto-lock" value="15 minutes inactivity" />
                      <InfoRow label="Clipboard" value="Auto-clear after 30 seconds" />
                    </div>
                    <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                      Your master password never leaves this device. All vault data is encrypted
                      before being stored.
                    </p>
                  </Tabs.Content>
                </Tabs.Root>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}
