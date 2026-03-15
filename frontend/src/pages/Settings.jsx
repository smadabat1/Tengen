import * as Tabs from '@radix-ui/react-tabs'
import { Palette, User, Shield, Database } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { ThemePicker } from '@/components/ui/ThemePicker'
import { DataTab } from '@/components/settings/DataTab'
import { cn } from '@/lib/utils'

const TABS = [
  { value: 'appearance', label: 'Appearance', icon: Palette },
  { value: 'profile',    label: 'Profile',    icon: User    },
  { value: 'security',   label: 'Security',   icon: Shield  },
  { value: 'data',       label: 'Data',       icon: Database },
]

export default function SettingsPage() {
  const { username } = useAuthStore()

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="font-heading font-semibold text-lg">Settings</h2>
        <p className="text-xs text-muted-foreground">Manage your preferences and account</p>
      </div>

      <Tabs.Root defaultValue="appearance">
        <Tabs.List className="flex gap-1 p-1 bg-secondary rounded-xl mb-6">
          {TABS.map(({ value, label, icon: Icon }) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-3 py-2',
                'text-sm font-medium rounded-lg transition-all',
                'text-muted-foreground hover:text-foreground',
                'data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* Appearance */}
        <Tabs.Content value="appearance">
          <div className="glass border border-border/40 rounded-xl p-6">
            <h3 className="font-semibold text-sm mb-1">Theme</h3>
            <p className="text-xs text-muted-foreground mb-5">
              Choose your vault's visual style. Changes apply instantly.
            </p>
            <ThemePicker />
          </div>
        </Tabs.Content>

        {/* Profile */}
        <Tabs.Content value="profile">
          <div className="glass border border-border/40 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-4 p-4 bg-secondary/60 rounded-xl">
              <div className="w-14 h-14 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-heading font-semibold text-xl uppercase">
                  {username?.[0] || 'U'}
                </span>
              </div>
              <div>
                <p className="font-semibold text-base">{username}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Vault owner</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Account management features coming soon.
            </p>
          </div>
        </Tabs.Content>

        {/* Security */}
        <Tabs.Content value="security">
          <div className="glass border border-border/40 rounded-xl p-5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Encryption</p>
            <div className="space-y-0.5">
              {[
                { label: 'Encryption',      value: 'AES-256-GCM' },
                { label: 'Key Derivation',  value: 'Argon2id' },
                { label: 'Session Storage', value: 'Memory only (sessionStorage)' },
                { label: 'Auto-lock',       value: '15 min inactivity' },
                { label: 'Clipboard',       value: 'Auto-clear after 30 s' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-sm font-medium font-mono">{value}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground pt-3 mt-2 border-t border-border/30">
              Your master password never leaves this device. All vault data is encrypted before being stored.
            </p>
          </div>
        </Tabs.Content>

        {/* Data */}
        <Tabs.Content value="data">
          <DataTab />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}
