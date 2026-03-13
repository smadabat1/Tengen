import { useEffect, useState } from 'react'
import { Command } from 'cmdk'
import { Search, Shield, Tag, LogIn } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { vaultApi } from '@/api/vault'
import { cn } from '@/lib/utils'

export function CommandModal({ open, onOpenChange, onSelectEntry, onSelectTag }) {
  const [query, setQuery] = useState('')

  const { data: entries = [] } = useQuery({
    queryKey: ['entries', {}],
    queryFn: () => vaultApi.listEntries({}),
    staleTime: 1000 * 30,
    enabled: open,
  })

  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: vaultApi.listTags,
    staleTime: 1000 * 30,
    enabled: open,
  })

  // Reset query when closed
  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const filtered = query.trim()
    ? entries.filter((e) =>
        e.title?.toLowerCase().includes(query.toLowerCase()) ||
        e.username?.toLowerCase().includes(query.toLowerCase()) ||
        e.url?.toLowerCase().includes(query.toLowerCase())
      )
    : entries.slice(0, 8)

  const allTags = tagsData?.tags || []
  const filteredTags = query.trim()
    ? allTags.filter((t) => t.toLowerCase().includes(query.toLowerCase()))
    : allTags.slice(0, 5)

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-start justify-center pt-[15vh]',
        open ? 'pointer-events-auto' : 'pointer-events-none'
      )}
    >
      {/* Backdrop */}
      {open && (
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        />
      )}

      {open && (
        <div className="relative w-full max-w-lg mx-4 rounded-2xl border border-border/50 bg-card shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          <Command shouldFilter={false} className="flex flex-col">
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Command.Input
                autoFocus
                value={query}
                onValueChange={setQuery}
                placeholder="Search entries, tags…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-muted-foreground/50 bg-secondary/80 rounded border border-border/30 font-mono">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <Command.List className="max-h-80 overflow-y-auto py-2">
              <Command.Empty className="px-4 py-8 text-center text-sm text-muted-foreground">
                No results found
              </Command.Empty>

              {filtered.length > 0 && (
                <Command.Group
                  heading={
                    <span className="px-4 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                      Entries
                    </span>
                  }
                >
                  {filtered.map((entry) => (
                    <Command.Item
                      key={entry.id}
                      value={entry.id}
                      onSelect={() => {
                        onSelectEntry?.(entry)
                        onOpenChange(false)
                      }}
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-secondary/60 aria-selected:bg-secondary/60 transition-colors outline-none"
                    >
                      <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{entry.title}</p>
                        {entry.username && (
                          <p className="text-[11px] text-muted-foreground truncate">{entry.username}</p>
                        )}
                      </div>
                      {entry.url && (
                        <span className="text-[10px] text-muted-foreground/50 truncate max-w-[100px]">
                          {entry.url.replace(/^https?:\/\//, '')}
                        </span>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {filteredTags.length > 0 && (
                <Command.Group
                  heading={
                    <span className="px-4 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                      Tags
                    </span>
                  }
                >
                  {filteredTags.map((tag) => (
                    <Command.Item
                      key={tag}
                      value={`tag:${tag}`}
                      onSelect={() => { onSelectTag?.(tag); onOpenChange(false) }}
                      className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-secondary/60 aria-selected:bg-secondary/60 transition-colors outline-none"
                    >
                      <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm">#{tag}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>

            {/* Footer */}
            <div className="border-t border-border/30 px-4 py-2 flex items-center gap-3 text-[10px] text-muted-foreground/50">
              <span><kbd className="font-mono">↑↓</kbd> navigate</span>
              <span><kbd className="font-mono">↵</kbd> open</span>
              <span><kbd className="font-mono">ESC</kbd> close</span>
            </div>
          </Command>
        </div>
      )}
    </div>
  )
}
