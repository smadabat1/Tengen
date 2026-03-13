import { motion } from 'framer-motion'
import { ShieldOff } from 'lucide-react'
import { EntryCard } from './EntryCard'

/**
 * EntryGrid — responsive card grid with empty state.
 */
export function EntryGrid({ entries = [], onEdit, onDelete, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-44 bg-card border border-border rounded-xl animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (!entries.length) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-24 text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
          <ShieldOff className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-heading font-semibold text-lg mb-1">Your vault is empty</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Add your first entry using the button below.
        </p>
      </motion.div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {entries.map((entry) => (
        <EntryCard
          key={entry.id}
          entry={entry}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
