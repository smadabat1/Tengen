import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ShieldAlert, ShieldCheck, Shield, RefreshCw, Loader2,
  CheckCircle2, XCircle, Clock,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { toolsApi } from '@/api/tools'
import { vaultApi } from '@/api/vault'
import { cn } from '@/lib/utils'

function formatTs(ts) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(ts))
}

function formatTsRelative(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export default function AnalysePage() {
  const queryClient = useQueryClient()
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [liveResults, setLiveResults] = useState([])
  const [lastRun, setLastRun] = useState(null)

  const { data: entries = [] } = useQuery({
    queryKey: ['entries', {}],
    queryFn: () => vaultApi.listEntries({}),
    staleTime: 1000 * 30,
  })

  const { data: runsData } = useQuery({
    queryKey: ['hibp-runs'],
    queryFn: toolsApi.getHibpRuns,
    staleTime: 1000 * 30,
  })

  const hibpHistory = runsData?.runs ?? []

  const handleStart = async () => {
    if (!entries.length || running) return
    setRunning(true)
    setLastRun(null)
    setProgress({ done: 0, total: entries.length })
    setLiveResults(entries.map(e => ({ id: e.id, title: e.title, status: 'pending' })))

    let pwned = 0, clean = 0

    try {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]
        setLiveResults(prev => prev.map(r => r.id === entry.id ? { ...r, status: 'checking' } : r))
        const result = await toolsApi.hibpCheck(entry.id)
        const status = result?.pwned ? 'pwned' : 'clean'
        if (status === 'pwned') pwned++
        else clean++
        setLiveResults(prev => prev.map(r => r.id === entry.id ? { ...r, status } : r))
        setProgress({ done: i + 1, total: entries.length })
      }
      queryClient.invalidateQueries({ queryKey: ['entries'] })
      queryClient.invalidateQueries({ queryKey: ['health'] })

      await toolsApi.saveHibpRun({ total: entries.length, pwned, clean })
      queryClient.invalidateQueries({ queryKey: ['hibp-runs'] })

      setLastRun({ total: entries.length, pwned, clean })
      toast.success(`Breach check complete — ${entries.length} entries scanned`)
    } catch {
      toast.error('Breach check failed')
    } finally {
      setRunning(false)
    }
  }

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0
  const isIdle = !running && liveResults.length === 0

  return (
    <div className="p-4 md:p-6 max-w-screen-xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h2 className="font-heading font-semibold text-lg">Breach Analysis</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-xl">
          Check every password in your vault against the{' '}
          <span className="text-foreground font-medium">Have I Been Pwned</span> database —
          a collection of billions of credentials exposed in known data breaches.
          Runs are logged so you can track your vault's security over time.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">

        {/* ── LEFT — trigger + live feed ── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Trigger card */}
          <div className="glass border border-border/40 rounded-xl p-6">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold">Run Breach Check</p>
                <p className="text-xs text-muted-foreground">
                  {entries.length} {entries.length === 1 ? 'entry' : 'entries'} will be checked sequentially against HIBP.
                  Each password is hashed client-side — only the first 5 characters of the SHA-1 hash are sent.
                </p>
              </div>
              <button
                onClick={handleStart}
                disabled={running || !entries.length}
                className={cn(
                  'flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all',
                  'bg-primary text-primary-foreground hover:opacity-90 active:scale-95',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {running
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Scanning…</>
                  : <><RefreshCw className="w-4 h-4" /> Start Check</>}
              </button>
            </div>

            {/* Progress bar */}
            {(running || progress.done > 0) && progress.total > 0 && (
              <div className="mt-5">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>{running ? 'Scanning passwords…' : 'Scan complete'}</span>
                  <span className="font-mono font-medium">{progress.done} / {progress.total}</span>
                </div>
                <div className="h-2 bg-border/50 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ ease: 'linear', duration: 0.2 }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>{pct}% complete</span>
                  {!running && lastRun && (
                    <span className="text-emerald-500 font-medium">
                      {lastRun.pwned > 0
                        ? `${lastRun.pwned} breach${lastRun.pwned > 1 ? 'es' : ''} found`
                        : 'All clear — no breaches found'}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Last run summary banner */}
          <AnimatePresence>
            {!running && lastRun && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  'flex items-center gap-3 px-5 py-3.5 rounded-xl border text-sm font-medium',
                  lastRun.pwned > 0
                    ? 'bg-red-500/10 border-red-500/30 text-red-500'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                )}
              >
                {lastRun.pwned > 0
                  ? <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  : <ShieldCheck className="w-4 h-4 flex-shrink-0" />}
                {lastRun.pwned > 0
                  ? `${lastRun.pwned} password${lastRun.pwned > 1 ? 's' : ''} found in known data breaches. Update them immediately.`
                  : `All ${lastRun.total} passwords are clean. No known breaches detected.`}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Live results feed */}
          {liveResults.length > 0 && (
            <div className="glass border border-border/40 rounded-xl p-5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Scan Results
              </p>
              <div className="space-y-px max-h-[420px] overflow-y-auto">
                {liveResults.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 py-2 px-2 rounded-lg">
                    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                      {r.status === 'pending' && <div className="w-2 h-2 rounded-full bg-border" />}
                      {r.status === 'checking' && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
                      {r.status === 'pwned' && <XCircle className="w-4 h-4 text-red-500" />}
                      {r.status === 'clean' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <span className={cn(
                      'text-xs flex-1 truncate',
                      r.status === 'pwned' ? 'text-red-500 font-medium' : 'text-foreground'
                    )}>
                      {r.title}
                    </span>
                    <span className={cn(
                      'text-[10px] flex-shrink-0',
                      r.status === 'pending' ? 'text-muted-foreground/50' :
                      r.status === 'checking' ? 'text-primary' :
                      r.status === 'pwned' ? 'text-red-500' : 'text-emerald-500'
                    )}>
                      {r.status === 'pending' ? 'Waiting' :
                       r.status === 'checking' ? 'Checking…' :
                       r.status === 'pwned' ? 'Breached' : 'Secure'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Footer summary */}
              {!running && (
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/30 text-xs">
                  <span className="flex items-center gap-1.5 text-red-500">
                    <XCircle className="w-3.5 h-3.5" />
                    {liveResults.filter(r => r.status === 'pwned').length} breached
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-500">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {liveResults.filter(r => r.status === 'clean').length} secure
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground ml-auto">
                    {liveResults.length} total entries
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Idle empty state */}
          {isIdle && (
            <div className="glass border border-border/40 rounded-xl p-10 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-semibold">Ready to scan</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Press "Start Check" to scan all {entries.length} vault{' '}
                {entries.length === 1 ? 'entry' : 'entries'} against the HIBP breach database.
              </p>
            </div>
          )}

        </div>

        {/* ── RIGHT — run history ── */}
        <div className="w-full md:w-80 flex-shrink-0">
          <div className="glass border border-border/40 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Run History</p>
              {hibpHistory.length > 0 && (
                <span className="text-[10px] text-muted-foreground">{hibpHistory.length} run{hibpHistory.length > 1 ? 's' : ''}</span>
              )}
            </div>

            {hibpHistory.length === 0 ? (
              <div className="py-8 flex flex-col items-center gap-2">
                <Clock className="w-6 h-6 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground text-center">
                  No runs yet.<br />History will appear here after your first scan.
                </p>
              </div>
            ) : (
              <div className="space-y-1 max-h-[600px] overflow-y-auto">
                {hibpHistory.map((run, i) => {
                  const isClean = run.pwned === 0
                  return (
                    <div key={run.id} className="p-3 rounded-lg border border-border/30 hover:border-border/60 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn(
                          'w-2 h-2 rounded-full flex-shrink-0',
                          isClean ? 'bg-emerald-500' : 'bg-red-500'
                        )} />
                        <span className="text-xs font-medium flex-1 truncate">
                          {isClean ? 'All clear' : `${run.pwned} breach${run.pwned > 1 ? 'es' : ''} found`}
                        </span>
                        {i === 0 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium flex-shrink-0">
                            Latest
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{formatTs(run.created_at)}</span>
                        <span>{formatTsRelative(run.created_at)}</span>
                      </div>
                      <div className="flex gap-2 mt-2 text-[10px]">
                        <span className="flex items-center gap-1 text-emerald-500">
                          <CheckCircle2 className="w-3 h-3" /> {run.clean} clean
                        </span>
                        {run.pwned > 0 && (
                          <span className="flex items-center gap-1 text-red-500">
                            <XCircle className="w-3 h-3" /> {run.pwned} pwned
                          </span>
                        )}
                        <span className="text-muted-foreground ml-auto">{run.total} total</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
