import { useState, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Download, Upload, AlertTriangle, Loader2, X, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { vaultApi } from '@/api/vault'
import {
  BitwardenIcon, ChromeIcon, LastPassIcon,
  OnePasswordIcon, DashlaneIcon, KeePassIcon, GenericCsvIcon,
} from './PasswordManagerIcons'

const ACTION_LABEL = {
  export_backup:             'Export (Encrypted Backup)',
  export_bitwarden:          'Export (Bitwarden JSON)',
  import:                    'Import (.tengen)',
  import_bitwarden_json:     'Import (Bitwarden JSON)',
  import_csv_chrome:         'Import (Chrome / Firefox / Edge CSV)',
  import_csv_lastpass:       'Import (LastPass CSV)',
  import_csv_1password:      'Import (1Password CSV)',
  import_csv_dashlane:       'Import (Dashlane CSV)',
  import_csv_keepass:        'Import (KeePass CSV)',
  import_csv_generic:        'Import (Generic CSV)',
}


export function DataTab() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)
  const [exportingBackup, setExportingBackup] = useState(false)
  const [exportingBitwarden, setExportingBitwarden] = useState(false)
  const [importing, setImporting] = useState(false)
  const [bitwardenWarnOpen, setBitwardenWarnOpen] = useState(false)

  const { data: auditData, refetch: refetchAudit, isFetching: auditFetching } = useQuery({
    queryKey: ['auditLog'],
    queryFn: () => vaultApi.getAuditLog(),
    staleTime: 0,
  })

  const downloadJson = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportBackup = async () => {
    setExportingBackup(true)
    try {
      const data = await vaultApi.exportVault()
      const date = new Date().toISOString().slice(0, 10)
      downloadJson(data, `tengen-backup-${date}.tengen`)
      toast.success(`Exported ${data.entries_count} ${data.entries_count === 1 ? 'entry' : 'entries'}`)
      refetchAudit()
    } catch {
      toast.error('Export failed')
      refetchAudit()
    } finally {
      setExportingBackup(false)
    }
  }

  const handleExportBitwarden = async () => {
    setBitwardenWarnOpen(false)
    setExportingBitwarden(true)
    try {
      const data = await vaultApi.exportBitwarden()
      const date = new Date().toISOString().slice(0, 10)
      downloadJson(data, `tengen-bitwarden-${date}.json`)
      toast.success(`Exported ${data.items?.length ?? 0} entries`)
      refetchAudit()
    } catch {
      toast.error('Export failed')
      refetchAudit()
    } finally {
      setExportingBitwarden(false)
    }
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large (max 10 MB)')
      return
    }
    setImporting(true)
    try {
      const text = await file.text()
      const payload = JSON.parse(text)
      const result = await vaultApi.importVault(payload)
      queryClient.invalidateQueries({ queryKey: ['entries'] })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      toast.success(`Imported ${result.imported} ${result.imported === 1 ? 'entry' : 'entries'}`)
      refetchAudit()
    } catch (err) {
      const raw = err?.response?.data?.detail
      const msg = typeof raw === 'string' ? raw : 'Invalid or corrupted backup file'
      toast.error(msg)
      refetchAudit()
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Encrypted backup */}
      <div className="glass border border-border/40 rounded-xl p-5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Encrypted Backup</p>
        <p className="text-xs text-muted-foreground mb-4">
          Download an encrypted copy of your vault. The file is protected with your vault key — only Tengen can restore it.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleExportBackup}
            disabled={exportingBackup}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {exportingBackup
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Exporting…</>
              : <><Download className="w-3.5 h-3.5" /> Download Backup</>
            }
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-secondary border border-border rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            {importing
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing…</>
              : <><Upload className="w-3.5 h-3.5" /> Restore Backup</>
            }
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".tengen"
            className="hidden"
            onChange={handleImport}
          />
        </div>
        <div className="flex items-start gap-2 mt-3 px-3 py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
          <span className="text-[11px] leading-relaxed">
            Only <span className="font-mono font-semibold">.tengen</span> backup files are supported here. Use the <span className="font-semibold">Import from App</span> section below for Bitwarden, 1Password, LastPass, and CSV files.
          </span>
        </div>
        <details className="mt-3 group">
          <summary className="text-[11px] text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors list-none flex items-center gap-1">
            <span className="group-open:rotate-90 transition-transform inline-block">›</span>
            Import limits &amp; restrictions
          </summary>
          <div className="mt-2 px-3 py-2.5 rounded-lg bg-secondary/60 border border-border/40 space-y-1">
            {[
              ['Max file size',    '10 MB'],
              ['Max entries',      '2,000 per import'],
              ['Title',            '256 characters'],
              ['Username',         '512 characters'],
              ['Password',         '4,096 characters'],
              ['URL',              '2,048 characters'],
              ['Notes',            '10,000 characters'],
              ['Tags per entry',   '20 tags, 64 chars each'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono text-foreground/80">{value}</span>
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground pt-1 mt-1 border-t border-border/30">
              Fields exceeding these limits are silently truncated. Entries without a password are skipped.
            </p>
          </div>
        </details>
      </div>

      {/* Import from other apps */}
      <div className="glass border border-border/40 rounded-xl p-5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Import from App</p>
        <p className="text-xs text-muted-foreground mb-4">
          Migrate from another password manager. The format is auto-detected from the file.
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { fmt: 'bitwarden_json', Icon: BitwardenIcon,    label: 'Bitwarden' },
            { fmt: 'csv_chrome',     Icon: ChromeIcon,       label: 'Chrome / Firefox / Edge' },
            { fmt: 'csv_lastpass',   Icon: LastPassIcon,     label: 'LastPass' },
            { fmt: 'csv_1password',  Icon: OnePasswordIcon,  label: '1Password' },
            { fmt: 'csv_dashlane',   Icon: DashlaneIcon,     label: 'Dashlane' },
            { fmt: 'csv_keepass',    Icon: KeePassIcon,      label: 'KeePass' },
            { fmt: 'csv_generic',    Icon: GenericCsvIcon,   label: 'Generic CSV' },
          ].map(({ fmt, Icon, label }) => (
            <div key={fmt} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary border border-border/40">
              <Icon size={14} />
              <span className="text-[11px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-secondary/50 border border-border/40 rounded-lg text-muted-foreground cursor-not-allowed select-none">
          <Upload className="w-3.5 h-3.5 opacity-50" />
          Choose File to Import
          <span className="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 uppercase tracking-wide">Coming Soon</span>
        </div>
      </div>

      {/* Bitwarden export */}
      <div className="glass border border-border/40 rounded-xl p-5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Export for Bitwarden</p>
        <p className="text-xs text-muted-foreground mb-4">
          Export your vault in Bitwarden-compatible JSON format. Compatible with Bitwarden, Vaultwarden, and Proton Pass.
        </p>
        <button
          onClick={() => setBitwardenWarnOpen(true)}
          disabled={exportingBitwarden}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-secondary border border-border rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
        >
          {exportingBitwarden
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Exporting…</>
            : <><Download className="w-3.5 h-3.5" /> Export (Bitwarden JSON)</>
          }
        </button>
      </div>

      {/* Audit log */}
      <div className="glass border border-border/40 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Activity History</p>
          <button
            onClick={() => refetchAudit()}
            disabled={auditFetching}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${auditFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {!auditData?.logs?.length ? (
          <p className="text-xs text-muted-foreground py-2">No activity yet.</p>
        ) : (
          <div className="space-y-0.5">
            {auditData.logs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                {log.status === 'success'
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  : <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{ACTION_LABEL[log.action] ?? log.action}</p>
                  {log.detail && <p className="text-[10px] text-muted-foreground truncate">{log.detail}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  {log.entries_count != null && (
                    <p className="text-xs font-mono text-muted-foreground">{log.entries_count} {log.entries_count === 1 ? 'entry' : 'entries'}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bitwarden warning dialog */}
      <Dialog.Root open={bitwardenWarnOpen} onOpenChange={setBitwardenWarnOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <Dialog.Title className="font-semibold text-sm mb-1">Unencrypted export</Dialog.Title>
                <Dialog.Description className="text-xs text-muted-foreground leading-relaxed">
                  This file will contain your passwords in plain text. Store it securely and delete it after importing into your new password manager.
                </Dialog.Description>
              </div>
              <Dialog.Close className="ml-auto p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex-shrink-0">
                <X className="w-4 h-4" />
              </Dialog.Close>
            </div>
            <div className="flex gap-3">
              <Dialog.Close asChild>
                <button className="flex-1 py-2.5 bg-secondary/60 hover:bg-secondary text-sm font-semibold rounded-lg transition-all">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                onClick={handleExportBitwarden}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-500/90 text-white text-sm font-semibold rounded-lg transition-all"
              >
                Export anyway
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
