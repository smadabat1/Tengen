import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle, ShieldAlert, Copy, Clock, Shield,
  TrendingUp, TrendingDown, Minus, RefreshCw,
} from 'lucide-react'
import {
  RadialBarChart, RadialBar, PolarAngleAxis,
  RadarChart, Radar, PolarGrid, PolarRadiusAxis,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { toolsApi } from '@/api/tools'
import { vaultApi } from '@/api/vault'
import { Tooltip as UiTooltip } from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils'

const HEALTH_CONFIG = [
  { key: 'weak',   icon: AlertTriangle, color: '#f97316', bg: 'bg-orange-500/10', border: 'border-orange-500/20', label: 'Weak',   desc: 'Low strength score' },
  { key: 'pwned',  icon: ShieldAlert,   color: '#ef4444', bg: 'bg-red-500/10',    border: 'border-red-500/20',    label: 'Pwned',  desc: 'Found in data breaches' },
  { key: 'reused', icon: Copy,          color: '#eab308', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', label: 'Reused', desc: 'Shared across entries' },
  { key: 'old',    icon: Clock,         color: '#60a5fa', bg: 'bg-blue-400/10',   border: 'border-blue-400/20',   label: 'Old',    desc: 'Not updated in 90+ days' },
]

function scoreColor(s) {
  return s >= 80 ? '#22c55e' : s >= 50 ? '#eab308' : '#ef4444'
}

function scoreLabel(s) {
  return s >= 80 ? 'Great shape' : s >= 50 ? 'Needs attention' : 'Action required'
}

function formatTs(ts) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(ts))
}

function formatTsShort(ts) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(ts))
}

function AreaTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass border border-border/60 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="font-semibold" style={{ color: scoreColor(payload[0].value) }}>
        Score: {payload[0].value}
      </p>
    </div>
  )
}

function RadarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass border border-border/60 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold">{payload[0].payload.category}</p>
      <p className="text-muted-foreground">Affected: {payload[0].value}%</p>
    </div>
  )
}

export default function HealthPage() {
  const queryClient = useQueryClient()

  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: toolsApi.getHealth,
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  })
  const { data: health, isLoading: healthLoading, isFetching: healthRefreshing } = healthQuery

  const { data: entries = [] } = useQuery({
    queryKey: ['entries', {}],
    queryFn: () => vaultApi.listEntries({}),
    staleTime: 1000 * 30,
  })

  const { data: historyData } = useQuery({
    queryKey: ['health-history'],
    queryFn: toolsApi.getHealthHistory,
    staleTime: 1000 * 60,
  })

  const history = historyData?.snapshots ?? []

  const total = health?.total ?? entries.length
  const healthyCount = health?.healthy ?? 0
  const score = total > 0 ? Math.round((healthyCount / total) * 100) : 100
  const totalIssues = HEALTH_CONFIG.reduce((sum, c) => sum + (health?.[c.key] ?? 0), 0)

  const radarData = HEALTH_CONFIG.map(({ key, label }) => ({
    category: label,
    value: total > 0 ? Math.round(((health?.[key] ?? 0) / total) * 100) : 0,
  }))

  const areaData = history.map((s) => ({ date: formatTsShort(s.created_at), score: s.score }))
  const gaugeData = [{ name: 'score', value: score, fill: scoreColor(score) }]
  const snapshotMutation = useMutation({
    mutationFn: toolsApi.saveHealthSnapshot,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['health-history'] }),
  })
  const snapshotPending = snapshotMutation.isPending

  const buildSnapshotPayload = (data) => {
    const totalCount = data?.total ?? 0
    const healthyCount = data?.healthy ?? 0
    const scoreValue = totalCount > 0 ? Math.round((healthyCount / totalCount) * 100) : 100
    return {
      score: scoreValue,
      healthy: healthyCount,
      weak: data?.weak ?? 0,
      pwned: data?.pwned ?? 0,
      reused: data?.reused ?? 0,
      old: data?.old ?? 0,
      total: totalCount,
    }
  }

  const handleRefreshSnapshot = async () => {
    const result = await healthQuery.refetch()
    if (!result?.data) return
    snapshotMutation.mutate(buildSnapshotPayload(result.data))
  }

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading font-semibold text-lg">Vault Health</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Security overview of your stored passwords</p>
        </div>
        <div className="flex items-center gap-2">
          <UiTooltip content="You can refresh health once every 5 minutes." side="bottom">
            <button
              type="button"
              onClick={handleRefreshSnapshot}
              disabled={!health || healthLoading || healthRefreshing || snapshotPending}
              className={cn(
                'text-xs font-semibold px-3 py-1.5 rounded-full border flex items-center gap-1.5',
                'bg-card/60 hover:bg-card transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {snapshotPending || healthRefreshing ? 'Refreshing…' : 'Refresh Health'}
            </button>
          </UiTooltip>
          <span
            className="text-xs font-semibold px-3 py-1.5 rounded-full border"
            style={{ color: scoreColor(score), borderColor: scoreColor(score) + '40', background: scoreColor(score) + '15' }}
          >
            {scoreLabel(score)}
          </span>
        </div>
      </div>

      {/* Main 2-column layout */}
      <div className="flex gap-5 items-start">

        {/* ── LEFT COLUMN ── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Score gauge + radar side by side */}
          <div className="grid grid-cols-2 gap-4">
            {/* Radial gauge */}
            <div className="glass border border-border/40 rounded-xl p-5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">Overall Score</p>
              <div className="flex flex-col items-center">
                <div className="relative">
                  <ResponsiveContainer width={140} height={140}>
                    <RadialBarChart
                      cx="50%" cy="50%"
                      innerRadius="68%" outerRadius="100%"
                      startAngle={90} endAngle={-270}
                      data={gaugeData} barSize={14}
                    >
                      <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                      <RadialBar dataKey="value" background={{ fill: 'hsl(var(--border))' }} cornerRadius={8} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-bold font-mono" style={{ color: scoreColor(score) }}>
                      {healthLoading ? '–' : score}
                    </span>
                    <span className="text-[10px] text-muted-foreground">/100</span>
                  </div>
                </div>
                <p className="text-sm font-semibold mt-3">{scoreLabel(score)}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 text-center">
                  {totalIssues === 0
                    ? 'No issues detected'
                    : `${totalIssues} issue${totalIssues !== 1 ? 's' : ''} in ${total} entries`}
                </p>
              </div>
            </div>

            {/* Radar */}
            <div className="glass border border-border/40 rounded-xl p-5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Breakdown</p>
              <ResponsiveContainer width="100%" height={170}>
                <RadarChart data={radarData} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="category" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, Math.max(10, ...radarData.map(d => d.value))]}
                    tick={false} axisLine={false}
                  />
                  <Radar
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.25}
                    dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                  />
                  <Tooltip content={<RadarTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-muted-foreground text-center">% of entries per category</p>
            </div>
          </div>

          {/* 4 issue cards */}
          <div className="grid grid-cols-2 gap-3">
            {HEALTH_CONFIG.map(({ key, icon: Icon, color, bg, border, label, desc }) => {
              const count = health?.[key] ?? 0
              const pct = total > 0 ? (count / total) * 100 : 0
              const hasIssues = count > 0
              return (
                <div key={key} className={cn('glass border rounded-xl p-4', border, hasIssues ? bg : 'opacity-50')}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: color + '20', border: `1px solid ${color}30` }}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <span className="text-2xl font-bold font-mono"
                      style={{ color: hasIssues ? color : 'hsl(var(--muted-foreground))' }}>
                      {healthLoading ? '–' : count}
                    </span>
                  </div>
                  <p className="text-xs font-semibold mb-0.5">{label}</p>
                  <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">{desc}</p>
                  <div className="h-1.5 bg-border/60 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: hasIssues ? color : 'hsl(var(--border))' }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{Math.round(pct)}% of vault</p>
                </div>
              )
            })}
          </div>

          {/* Natural Language Explanation */}
          <div className="glass border border-border/40 rounded-xl p-5 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">How is my health calculated?</h3>
            </div>
            <div className="space-y-3 text-[11px] leading-relaxed text-muted-foreground">
              <p>
                Your overall score of <span className="font-semibold text-foreground">{score}/100</span> reflects the percentage of entries in your vault that are <span className="font-semibold text-foreground">Perfectly Healthy</span>.
              </p>
              <p>
                An entry is considered healthy if it meets all the following criteria:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-1">
                <li><span className="text-foreground font-medium">Strong:</span> It has a high complexity score (zxcvbn score of 2 or more).</li>
                <li><span className="text-foreground font-medium">Unique:</span> It isn't reused across any other entries in your vault.</li>
                <li><span className="text-foreground font-medium">Secure:</span> It has not appeared in any known data breaches (HIBP check).</li>
                <li><span className="text-foreground font-medium">Fresh:</span> It has been updated within the last 90 days.</li>
              </ul>
              <p className="pt-1 border-t border-border/20">
                To improve your score, focus on fixing <span className="text-red-500 font-medium italic">Pwned</span> and <span className="text-orange-500 font-medium italic">Weak</span> passwords first, as these represent the highest security risks.
              </p>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="w-80 flex-shrink-0 space-y-4">

          {/* Score history area chart */}
          <div className="glass border border-border/40 rounded-xl p-5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">Score History</p>
            {areaData.length >= 2 ? (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={areaData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<AreaTooltip />} />
                  <Area
                    type="monotone" dataKey="score"
                    stroke="hsl(var(--primary))" strokeWidth={2}
                    fill="url(#scoreGrad)"
                    dot={{ fill: 'hsl(var(--primary))', r: 2.5, strokeWidth: 0 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center">
                <p className="text-xs text-muted-foreground text-center">
                  Visit again to build<br />your score history
                </p>
              </div>
            )}
          </div>

          {/* Timeline */}
          {history.length > 0 && (
            <div className="glass border border-border/40 rounded-xl p-5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Timeline</p>
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border/40" />
                <div className="space-y-0">
                  {[...history].reverse().map((snap, i, arr) => {
                    const prev = arr[i + 1]
                    const delta = prev ? snap.score - prev.score : null
                    return (
                      <div key={snap.id} className="flex items-start gap-3 py-2.5 border-b border-border/20 last:border-0">
                        {/* Dot on timeline */}
                        <div className="relative z-10 mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2"
                          style={{ background: scoreColor(snap.score), '--tw-ring-color': 'hsl(var(--background))' }} />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] text-muted-foreground">{formatTs(snap.created_at)}</p>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <span className="text-xs font-bold font-mono" style={{ color: scoreColor(snap.score) }}>
                                {snap.score}
                              </span>
                              {delta !== null && (
                                <span className={cn(
                                  'flex items-center gap-0.5 text-[10px] font-medium',
                                  delta > 0 ? 'text-green-500' : delta < 0 ? 'text-red-500' : 'text-muted-foreground'
                                )}>
                                  {delta > 0
                                    ? <TrendingUp className="w-2.5 h-2.5" />
                                    : delta < 0
                                    ? <TrendingDown className="w-2.5 h-2.5" />
                                    : <Minus className="w-2.5 h-2.5" />}
                                  {delta !== 0 && Math.abs(delta)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {snap.weak   > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-500">{snap.weak} weak</span>}
                            {snap.pwned  > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-500">{snap.pwned} pwned</span>}
                            {snap.reused > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-500">{snap.reused} reused</span>}
                            {snap.old    > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-400/15 text-blue-400">{snap.old} old</span>}
                            {snap.weak === 0 && snap.pwned === 0 && snap.reused === 0 && snap.old === 0 && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-500">All clear</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Empty state when no history */}
          {history.length === 0 && (
            <div className="glass border border-border/40 rounded-xl p-5 flex flex-col items-center justify-center gap-2 py-8">
              <Shield className="w-6 h-6 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground text-center">
                No history yet.<br />Check back after your next visit.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
