import { Tag, Hash } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * TagFilter — sidebar tag list.
 * Props:
 *   tags: string[]
 *   activeTag: string | null
 *   onSelect: (tag: string | null) => void
 */
export function TagFilter({ tags = [], activeTag, onSelect }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2 mb-2">
        Tags
      </p>

      {/* All */}
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors',
          !activeTag
            ? 'text-foreground font-medium'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
        )}
      >
        <Hash className="w-3 h-3 flex-shrink-0" />
        <span className="truncate flex-1 text-left">All entries</span>
        {!activeTag && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
      </button>

      {tags.map((tag) => (
        <button
          key={tag}
          onClick={() => onSelect(tag)}
          className={cn(
            'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors text-left',
            activeTag === tag
              ? 'text-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
          )}
        >
          <Tag className="w-3 h-3 flex-shrink-0" />
          <span className="truncate flex-1">{tag}</span>
          {activeTag === tag && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
        </button>
      ))}

      {tags.length === 0 && (
        <p className="text-xs text-muted-foreground px-2 py-1">No tags yet</p>
      )}
    </div>
  )
}
