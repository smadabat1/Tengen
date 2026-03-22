import * as React from 'react'
import { Edit2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { cn } from '@/lib/utils'

export function RenameNoteFolderModal({ open, onOpenChange, folder, onConfirm }) {
  const [name, setName] = React.useState('')
  const inputRef = React.useRef(null)

  React.useEffect(() => {
    if (open) {
      setName(folder?.name || '')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, folder])

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (name.trim() && name.trim() !== folder?.name) {
      onConfirm(name.trim())
      onOpenChange(false)
    } else {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Edit2 className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle className="text-xl">Rename Folder</DialogTitle>
          </div>
          <DialogDescription>
            Change the name of your folder.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="rename-folder-name" className="text-sm font-medium leading-none">
              Folder Name
            </label>
            <input
              id="rename-folder-name"
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Folder name"
              className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              )}
            />
          </div>
        </form>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-10 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!name.trim() || name.trim() === folder?.name}
            className="h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
          >
            Rename Folder
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
