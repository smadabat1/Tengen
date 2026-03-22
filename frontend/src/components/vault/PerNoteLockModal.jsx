import * as React from 'react'
import { Lock, LockOpen, ShieldAlert } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { cn } from '@/lib/utils'

export function PerNoteLockModal({ open, onOpenChange, isLocked, onLock, onRemoveLock }) {
  const [secret, setSecret] = React.useState('')
  const inputRef = React.useRef(null)

  React.useEffect(() => {
    if (open) {
      setSecret('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (isLocked) {
      onRemoveLock()
      onOpenChange(false)
    } else if (secret.trim()) {
      onLock(secret)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
              isLocked 
                ? "bg-amber-500/10 border-amber-500/20" 
                : "bg-primary/10 border-primary/20"
            )}>
              {isLocked ? (
                <LockOpen className="w-5 h-5 text-amber-600" />
              ) : (
                <Lock className="w-5 h-5 text-primary" />
              )}
            </div>
            <DialogTitle className="text-xl">
              {isLocked ? "Remove Note Lock" : "Lock Note"}
            </DialogTitle>
          </div>
          <DialogDescription>
            {isLocked 
              ? "Are you sure you want to remove the security lock from this note?" 
              : "Enter a PIN or password to secure this specific note."
            }
          </DialogDescription>
        </DialogHeader>

        {!isLocked && (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="lock-secret" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                PIN or Password
              </label>
              <input
                id="lock-secret"
                ref={inputRef}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                type="password"
                placeholder="Enter a secret"
                className={cn(
                  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                )}
              />
            </div>
          </form>
        )}

        <DialogFooter className={cn(isLocked && "mt-6")}>
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
            disabled={!isLocked && !secret.trim()}
            className={cn(
              "h-10 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50",
              isLocked 
                ? "bg-amber-500 hover:bg-amber-600 text-white" 
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {isLocked ? "Remove Lock" : "Secure Note"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
