import { useState, useEffect, useCallback } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Slider from '@radix-ui/react-slider'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Eye, EyeOff, Wand2, Plus, Tag, RefreshCw, Copy, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { vaultApi } from '@/api/vault'
import { toolsApi } from '@/api/tools'
import { PasswordStrengthMeter } from '@/components/tools/PasswordStrengthMeter'
import { getErrorMessage } from '@/api/client'
import { cn, debounce } from '@/lib/utils'

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(256),
  username: z.string().max(512).optional().or(z.literal('')),
  password: z.string().min(1, 'Password is required').max(4096),
  url: z.string().max(2048).optional().or(z.literal('')),
  notes: z.string().max(10000).optional().or(z.literal('')),
})

const DEFAULT_GEN_OPTIONS = { length: 20, uppercase: true, lowercase: true, digits: true, symbols: true }

export function EntryModal({ open, onOpenChange, entry }) {
  const isEdit = !!entry
  const queryClient = useQueryClient()

  const [showPassword, setShowPassword] = useState(false)
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [strengthData, setStrengthData] = useState(null)

  // Inline generator
  const [genOpen, setGenOpen] = useState(false)
  const [genOptions, setGenOptions] = useState(DEFAULT_GEN_OPTIONS)
  const [genCopied, setGenCopied] = useState(false)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: entry
      ? { title: entry.title, username: entry.username || '', password: entry.password || '', url: entry.url || '', notes: entry.notes || '' }
      : {},
  })

  useEffect(() => {
    if (open) {
      reset(entry
        ? { title: entry.title, username: entry.username || '', password: entry.password || '', url: entry.url || '', notes: entry.notes || '' }
        : { title: '', username: '', password: '', url: '', notes: '' }
      )
      setTags(entry?.tags || [])
      setStrengthData(null)
      setGenOpen(false)
    }
  }, [open, entry, reset])

  // Strength check
  const passwordValue = watch('password')
  const checkStrength = useCallback(debounce(async (pw) => {
    if (!pw) return setStrengthData(null)
    try { setStrengthData(await toolsApi.checkStrength(pw)) } catch (_) {}
  }, 400), [])
  useEffect(() => { checkStrength(passwordValue) }, [passwordValue, checkStrength])

  // Generator query
  const { data: genData, refetch: genRefetch, isFetching: genFetching } = useQuery({
    queryKey: ['generate-password', genOptions],
    queryFn: () => toolsApi.generatePassword(genOptions),
    enabled: genOpen,
    staleTime: 0,
  })
  const generatedPassword = genData?.password || ''

  const handleUseGenerated = () => {
    if (generatedPassword) {
      setValue('password', generatedPassword, { shouldValidate: true })
      setGenOpen(false)
    }
  }

  const handleGenCopy = async () => {
    if (!generatedPassword) return
    await navigator.clipboard.writeText(generatedPassword)
    setGenCopied(true)
    setTimeout(() => setGenCopied(false), 2000)
    toast.success('Password copied')
  }

  const toggleGen = (key) => setGenOptions((o) => ({ ...o, [key]: !o[key] }))

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => vaultApi.createEntry({ ...data, tags }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      toast.success('Entry created')
      onOpenChange(false)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: (data) => vaultApi.updateEntry(entry.id, { ...data, tags }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] })
      queryClient.invalidateQueries({ queryKey: ['health'] })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      toast.success('Entry updated')
      onOpenChange(false)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  const onSubmit = (data) => {
    const payload = { ...data, username: data.username || undefined, url: data.url || undefined, notes: data.notes || undefined }
    isEdit ? updateMutation.mutate(payload) : createMutation.mutate(payload)
  }

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t) && tags.length < 10) { setTags([...tags, t]); setTagInput('') }
  }
  const removeTag = (tag) => setTags(tags.filter((t) => t !== tag))

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            {/* Backdrop */}
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
              />
            </Dialog.Overlay>

            {/* Side sheet slides in from right */}
            <Dialog.Content asChild>
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                style={{ position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 50 }}
                className="w-full max-w-[500px] bg-card border-l border-border flex flex-col shadow-2xl"
              >
                {/* Sheet header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 flex-shrink-0">
                  <div>
                    <Dialog.Title className="text-base font-heading font-semibold">
                      {isEdit ? 'Edit Entry' : 'New Entry'}
                    </Dialog.Title>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isEdit ? 'Update your saved credentials' : 'Add new credentials to your vault'}
                    </p>
                  </div>
                  <Dialog.Close asChild>
                    <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </Dialog.Close>
                </div>

                {/* Scrollable form */}
                <div className="flex-1 overflow-y-auto">
                  <form onSubmit={handleSubmit(onSubmit)} id="entry-form" className="px-6 py-5 space-y-5">

                    <Field label="Title" required error={errors.title?.message}>
                      <input {...register('title')} placeholder="Gmail, GitHub, Netflix…" className={inputClass(errors.title)} />
                    </Field>

                    <Field label="Username / Email" error={errors.username?.message}>
                      <input {...register('username')} placeholder="user@example.com" autoComplete="off" className={inputClass(errors.username)} />
                    </Field>

                    {/* Password field + inline generator */}
                    <Field label="Password" required error={errors.password?.message}>
                      <div className="space-y-2">
                        <div className="relative">
                          <input
                            {...register('password')}
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Your password"
                            autoComplete="new-password"
                            className={cn(inputClass(errors.password), 'pr-16')}
                          />
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors">
                              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button type="button" onClick={() => setGenOpen(!genOpen)}
                              className={cn('p-1.5 rounded-md transition-colors', genOpen ? 'text-primary' : 'text-muted-foreground hover:text-primary')}
                              title="Generate password">
                              <Wand2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {strengthData && (
                          <PasswordStrengthMeter score={strengthData.score} label={strengthData.label} feedback={strengthData.feedback} />
                        )}

                        {/* Inline collapsible generator */}
                        <AnimatePresence>
                          {genOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="border border-primary/20 rounded-xl p-4 bg-primary/5 space-y-3 mt-1">
                                <div className="flex items-center gap-1.5">
                                  <Wand2 className="w-3.5 h-3.5 text-primary" />
                                  <span className="text-xs font-semibold text-primary">Password Generator</span>
                                </div>

                                {/* Preview */}
                                <div className="flex items-center gap-2 p-2.5 bg-card rounded-lg border border-border/60">
                                  <span className="flex-1 font-mono text-xs break-all select-all min-w-0">
                                    {genFetching
                                      ? <span className="text-muted-foreground">Generating…</span>
                                      : generatedPassword || <span className="text-muted-foreground">—</span>
                                    }
                                  </span>
                                  <div className="flex items-center gap-0.5 flex-shrink-0">
                                    <button type="button" onClick={() => genRefetch()} disabled={genFetching}
                                      className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors">
                                      <RefreshCw className={cn('w-3 h-3', genFetching && 'animate-spin')} />
                                    </button>
                                    <button type="button" onClick={handleGenCopy}
                                      className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors">
                                      {genCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                  </div>
                                </div>

                                {/* Length */}
                                <div className="space-y-1.5">
                                  <div className="flex justify-between">
                                    <span className="text-xs text-muted-foreground">Length</span>
                                    <span className="text-xs font-mono text-primary">{genOptions.length}</span>
                                  </div>
                                  <Slider.Root min={8} max={64} step={1} value={[genOptions.length]}
                                    onValueChange={([v]) => setGenOptions((o) => ({ ...o, length: v }))}
                                    className="relative flex items-center select-none touch-none w-full h-4">
                                    <Slider.Track className="bg-secondary relative grow rounded-full h-1">
                                      <Slider.Range className="absolute bg-primary rounded-full h-full" />
                                    </Slider.Track>
                                    <Slider.Thumb className="block w-3.5 h-3.5 bg-primary rounded-full shadow focus:outline-none cursor-pointer" />
                                  </Slider.Root>
                                </div>

                                {/* Character toggles */}
                                <div className="grid grid-cols-2 gap-1.5">
                                  {[
                                    { key: 'uppercase', label: 'Uppercase', example: 'ABC' },
                                    { key: 'lowercase', label: 'Lowercase', example: 'abc' },
                                    { key: 'digits', label: 'Numbers', example: '123' },
                                    { key: 'symbols', label: 'Symbols', example: '!@#' },
                                  ].map(({ key, label, example }) => (
                                    <button key={key} type="button" onClick={() => toggleGen(key)}
                                      className={cn(
                                        'flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs transition-all',
                                        genOptions[key]
                                          ? 'bg-primary/10 border-primary/30 text-foreground'
                                          : 'bg-secondary/50 border-transparent text-muted-foreground hover:border-border'
                                      )}>
                                      <span className="font-medium">{label}</span>
                                      <span className="font-mono opacity-50">{example}</span>
                                    </button>
                                  ))}
                                </div>

                                <button type="button" onClick={handleUseGenerated} disabled={!generatedPassword}
                                  className="w-full py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50">
                                  Use this password ↑
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </Field>

                    <Field label="URL" error={errors.url?.message}>
                      <input {...register('url')} placeholder="https://example.com" type="url" className={inputClass(errors.url)} />
                    </Field>

                    <Field label="Notes" error={errors.notes?.message}>
                      <textarea {...register('notes')} rows={3} placeholder="Any additional notes…" className={cn(inputClass(errors.notes), 'resize-none')} />
                    </Field>

                    {/* Tags */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" /> Tags
                      </label>
                      <div className="flex flex-wrap gap-1.5 min-h-0">
                        {tags.map((tag) => (
                          <span key={tag} className="flex items-center gap-1 px-2 py-0.5 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full">
                            {tag}
                            <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                          placeholder="Add a tag…" className={cn(inputClass(), 'flex-1')} />
                        <button type="button" onClick={addTag} className="px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                  </form>
                </div>

                {/* Sticky footer */}
                <div className="flex gap-3 px-6 py-4 border-t border-border/50 flex-shrink-0">
                  <Dialog.Close asChild>
                    <button type="button" className="flex-1 py-2.5 bg-secondary hover:bg-secondary/80 text-sm font-medium rounded-xl transition-colors">
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button type="submit" form="entry-form" disabled={isPending}
                    className="flex-1 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:opacity-90 transition-all disabled:opacity-50">
                    {isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        Saving…
                      </span>
                    ) : isEdit ? 'Save Changes' : 'Create Entry'}
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

function Field({ label, required, error, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function inputClass(error) {
  return cn(
    'w-full px-3 py-2 text-sm bg-input border rounded-lg',
    'placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors',
    error ? 'border-destructive focus:ring-destructive' : 'border-border'
  )
}
