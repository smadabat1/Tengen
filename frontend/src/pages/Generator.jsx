import { useState } from 'react'
import * as Slider from '@radix-ui/react-slider'
import { RefreshCw, Copy, Check, Wand2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { toolsApi } from '@/api/tools'
import { cn } from '@/lib/utils'

const DEFAULT_OPTIONS = {
  length: 20,
  uppercase: true,
  lowercase: true,
  digits: true,
  symbols: true,
}

const CHAR_TYPES = [
  { key: 'uppercase', label: 'Uppercase', example: 'ABC' },
  { key: 'lowercase', label: 'Lowercase', example: 'abc' },
  { key: 'digits',    label: 'Numbers',   example: '123' },
  { key: 'symbols',   label: 'Symbols',   example: '!@#' },
]

export default function GeneratorPage() {
  const [options, setOptions] = useState(DEFAULT_OPTIONS)
  const [copied, setCopied] = useState(false)

  const { data, refetch, isFetching } = useQuery({
    queryKey: ['generate-password', options],
    queryFn: () => toolsApi.generatePassword(options),
    staleTime: 0,
  })

  const password = data?.password || ''

  const handleCopy = async () => {
    if (!password) return
    await navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Password copied')
  }

  const toggle = (key) => setOptions((o) => ({ ...o, [key]: !o[key] }))

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Wand2 className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-semibold text-lg">Password Generator</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Generate strong, random passwords with custom rules. Copy and use them in your vault entries.
        </p>
      </div>

      <div className="glass border border-border/40 rounded-xl p-6 space-y-6">
        {/* Generated password display */}
        <div>
          <label className="text-sm font-medium block mb-2">Generated password</label>
          <div className="flex items-center gap-2 p-3 bg-secondary rounded-xl border border-border">
            <span className="flex-1 font-mono text-sm break-all text-foreground select-all min-h-[1.25rem]">
              {isFetching
                ? <span className="text-muted-foreground">Generating…</span>
                : password || <span className="text-muted-foreground">—</span>}
            </span>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
                title="Regenerate"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
              </button>
              <button
                onClick={handleCopy}
                disabled={!password}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors disabled:opacity-40"
                title="Copy"
              >
                {copied
                  ? <Check className="w-3.5 h-3.5 text-emerald-500" />
                  : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Length slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Length</label>
            <span className="text-sm font-mono text-primary">{options.length}</span>
          </div>
          <Slider.Root
            min={8} max={64} step={1}
            value={[options.length]}
            onValueChange={([v]) => setOptions((o) => ({ ...o, length: v }))}
            className="relative flex items-center select-none touch-none w-full h-5"
          >
            <Slider.Track className="bg-border/60 relative grow rounded-full h-1.5">
              <Slider.Range className="absolute bg-primary rounded-full h-full" />
            </Slider.Track>
            <Slider.Thumb className="block w-4 h-4 bg-primary rounded-full shadow focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer" />
          </Slider.Root>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>8</span><span>64</span>
          </div>
        </div>

        {/* Character type toggles */}
        <div>
          <label className="text-sm font-medium block mb-2">Character types</label>
          <div className="grid grid-cols-2 gap-2">
            {CHAR_TYPES.map(({ key, label, example }) => (
              <button
                key={key}
                type="button"
                onClick={() => toggle(key)}
                className={cn(
                  'flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all',
                  options[key]
                    ? 'bg-primary/10 border-primary/40 text-foreground'
                    : 'bg-secondary border-transparent text-muted-foreground hover:border-border'
                )}
              >
                <span className="font-medium">{label}</span>
                <span className="font-mono text-xs opacity-60">{example}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
            Regenerate
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!password}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy password'}
          </button>
        </div>
      </div>
    </div>
  )
}
