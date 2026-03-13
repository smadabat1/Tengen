import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Slider from '@radix-ui/react-slider'
import { RefreshCw, Copy, Check, Wand2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation } from '@tanstack/react-query'
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

/**
 * Password Generator modal.
 * Props:
 *   open: boolean
 *   onOpenChange: (open: boolean) => void
 *   onUse: (password: string) => void — called when user clicks "Use this password"
 */
export function PasswordGenerator({ open, onOpenChange, onUse }) {
  const [options, setOptions] = useState(DEFAULT_OPTIONS)
  const [copied, setCopied] = useState(false)

  const { data, refetch, isFetching } = useQuery({
    queryKey: ['generate-password', options],
    queryFn: () => toolsApi.generatePassword(options),
    enabled: open,
    staleTime: 0,
  })

  const password = data?.password || ''

  const handleCopy = async () => {
    await navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Password copied')
  }

  const handleUse = () => {
    onUse?.(password)
    onOpenChange(false)
  }

  const toggle = (key) => setOptions((o) => ({ ...o, [key]: !o[key] }))

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
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
                  'w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6'
                )}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-primary" />
                    <Dialog.Title className="text-base font-semibold">Password Generator</Dialog.Title>
                  </div>
                  <Dialog.Close asChild>
                    <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </Dialog.Close>
                </div>

                {/* Generated password display */}
                <div className="relative mb-6">
                  <div className="flex items-center gap-2 p-3 bg-secondary rounded-xl border border-border">
                    <span className="flex-1 font-mono text-sm break-all text-foreground select-all">
                      {isFetching ? (
                        <span className="text-muted-foreground">Generating…</span>
                      ) : (
                        password
                      )}
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
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
                        title="Copy"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Length slider */}
                <div className="space-y-2 mb-5">
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
                    <Slider.Track className="bg-secondary relative grow rounded-full h-1.5">
                      <Slider.Range className="absolute bg-primary rounded-full h-full" />
                    </Slider.Track>
                    <Slider.Thumb className="block w-4 h-4 bg-primary rounded-full shadow focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer" />
                  </Slider.Root>
                </div>

                {/* Character type toggles */}
                <div className="grid grid-cols-2 gap-2 mb-6">
                  {[
                    { key: 'uppercase', label: 'Uppercase', example: 'ABC' },
                    { key: 'lowercase', label: 'Lowercase', example: 'abc' },
                    { key: 'digits', label: 'Numbers', example: '123' },
                    { key: 'symbols', label: 'Symbols', example: '!@#' },
                  ].map(({ key, label, example }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggle(key)}
                      className={cn(
                        'flex items-center justify-between px-3 py-2 rounded-xl border text-sm transition-all',
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

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium rounded-xl transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Regenerate
                  </button>
                  <button
                    type="button"
                    onClick={handleUse}
                    disabled={!password}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    Use this password
                  </button>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
