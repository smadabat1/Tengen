import * as Dialog from '@radix-ui/react-dialog'
import { Trash2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export function DeleteNoteConfirmDialog({ open, onOpenChange, note, onConfirm, isPending }) {
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
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                style={{ position: 'fixed', zIndex: 50, top: '50%', left: '50%', x: '-50%', y: '-50%' }}
                className="w-full max-w-sm bg-background border border-border/40 rounded-2xl shadow-2xl p-6"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center shrink-0">
                      <Trash2 className="w-5 h-5 text-destructive" />
                    </div>
                    <Dialog.Title className="text-xl font-semibold m-0 tracking-tight">
                      Delete note?
                    </Dialog.Title>
                  </div>
                  <Dialog.Close asChild>
                    <button className="p-2 -mr-2 -mt-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all">
                      <X className="w-4 h-4" />
                    </button>
                  </Dialog.Close>
                </div>

                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  <strong className="text-foreground font-medium">"{note?.title || 'Untitled'}"</strong> will be permanently
                  deleted. This cannot be undone.
                </p>

                <div className="flex gap-3">
                  <Dialog.Close asChild>
                    <button className="flex-1 py-2.5 bg-secondary/60 hover:bg-secondary text-sm font-semibold rounded-lg transition-all">
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button
                    onClick={onConfirm}
                    disabled={isPending}
                    className="flex-1 py-2.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground text-sm font-semibold rounded-lg transition-all disabled:opacity-50 shadow-sm"
                  >
                    {isPending ? 'Deleting…' : 'Delete'}
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
