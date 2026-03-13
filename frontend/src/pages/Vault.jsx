import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, SlidersHorizontal, LayoutGrid, List, Search, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { vaultApi } from '@/api/vault'
import { EntryGrid } from '@/components/vault/EntryGrid'
import { EntryTable } from '@/components/vault/EntryTable'
import { EntryModal } from '@/components/vault/EntryModal'
import { DeleteConfirmDialog } from '@/components/vault/DeleteConfirmDialog'
import { Select } from '@/components/ui/Select'
import { Tooltip } from '@/components/ui/Tooltip'
import { useAppContext } from '@/components/layout/AppLayout'
import { cn } from '@/lib/utils'

const SORT_OPTIONS = [
  { value: 'created_at', label: 'Date added' },
  { value: 'updated_at', label: 'Last updated' },
  { value: 'title', label: 'Title' },
]

const VIEW_TOGGLE = [
  { value: 'grid',  icon: LayoutGrid, label: 'Card view'  },
  { value: 'table', icon: List,        label: 'Table view' },
]

export default function VaultPage() {
  const { activeTag, setSidebarOpen, sidebarOpen, pendingViewEntry, setPendingViewEntry } = useAppContext()

  const [sort, setSort] = useState('created_at')
  const [order, setOrder] = useState('desc')
  const [search, setSearch] = useState('')
  const [view, setView] = useState(() => localStorage.getItem('tengen_vault_view') || 'grid')
  const [entryModalOpen, setEntryModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [deleteEntry, setDeleteEntry] = useState(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Open detail modal when cmd+k selects an entry
  useEffect(() => {
    if (pendingViewEntry) {
      setEditingEntry(pendingViewEntry)
      setEntryModalOpen(true)
      setPendingViewEntry(null)
    }
  }, [pendingViewEntry, setPendingViewEntry])

  const handleViewChange = (v) => {
    setView(v)
    localStorage.setItem('tengen_vault_view', v)
  }

  const queryParams = useMemo(() => ({
    ...(activeTag && { tag: activeTag }),
    ...(search.trim() && { search: search.trim() }),
    sort,
    order,
  }), [activeTag, search, sort, order])

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['entries', queryParams],
    queryFn: () => vaultApi.listEntries(queryParams),
    staleTime: 1000 * 30,
  })

  const handleEdit = (entry) => {
    setEditingEntry(entry)
    setEntryModalOpen(true)
  }

  const handleDelete = (entry) => {
    setDeleteEntry(entry)
    setDeleteOpen(true)
  }

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Tooltip content="Toggle sidebar" side="right">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </Tooltip>
          <div>
            <h2 className="font-heading font-semibold text-lg">
              {activeTag ? `#${activeTag}` : 'All entries'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Inline search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="h-8 w-44 pl-8 pr-7 text-xs bg-secondary border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <Select value={sort} onValueChange={setSort} options={SORT_OPTIONS} />
          <button
            onClick={() => setOrder(order === 'desc' ? 'asc' : 'desc')}
            className="text-xs bg-secondary border border-border rounded-lg px-2 py-1.5 hover:bg-secondary/80 transition-colors"
          >
            {order === 'desc' ? '↓' : '↑'}
          </button>

          {/* View toggle */}
          <div className="flex items-center gap-0.5 p-0.5 bg-secondary rounded-lg border border-border/40">
            {VIEW_TOGGLE.map(({ value, icon: Icon, label }) => (
              <Tooltip key={value} content={label} side="bottom">
                <button
                  onClick={() => handleViewChange(value)}
                  className={cn(
                    'p-1.5 rounded-md transition-colors',
                    view === value
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>

      {view === 'grid' ? (
        <EntryGrid
          entries={entries}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoading={isLoading}
        />
      ) : (
        <EntryTable
          entries={entries}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoading={isLoading}
        />
      )}

      {/* FAB */}
      <Tooltip content="Add new entry" side="left">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { setEditingEntry(null); setEntryModalOpen(true) }}
          className="fixed bottom-6 right-6 z-30 w-12 h-12 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/40 flex items-center justify-center hover:shadow-xl hover:shadow-primary/50 transition-all"
        >
          <Plus className="w-5 h-5" />
        </motion.button>
      </Tooltip>

      <EntryModal
        open={entryModalOpen}
        onOpenChange={(open) => {
          setEntryModalOpen(open)
          if (!open) setEditingEntry(null)
        }}
        entry={editingEntry}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        entry={deleteEntry}
      />
    </div>
  )
}
