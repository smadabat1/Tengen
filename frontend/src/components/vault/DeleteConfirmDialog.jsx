import * as Dialog from '@radix-ui/react-dialog'
import { Trash2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { vaultApi } from '@/api/vault'
import { getErrorMessage } from '@/api/client'
import { cn } from '@/lib/utils'

export function DeleteConfirmDialog({ open, onOpenChange, entry }) {
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: () => vaultApi.deleteEntry(entry.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] })
      queryClient.invalidateQueries({ queryKey: ['health'] })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      toast.success(`"${entry?.title}" deleted`)
      onOpenChange(false)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

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
                className="w-full max-w-sm bg-card border border-border rounded-xl shadow-2xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-destructive" />
                  </div>
                  <Dialog.Close asChild>
                    <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </Dialog.Close>
                </div>

                <Dialog.Title className="text-base font-semibold mb-1">
                  Delete entry?
                </Dialog.Title>
                <p className="text-sm text-muted-foreground mb-6">
                  <strong className="text-foreground">"{entry?.title}"</strong> will be permanently
                  deleted. This cannot be undone.
                </p>

                <div className="flex gap-2">
                  <Dialog.Close asChild>
                    <button className="flex-1 py-2 bg-secondary hover:bg-secondary/80 text-sm font-medium rounded-xl transition-colors">
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    className="flex-1 py-2 bg-destructive text-destructive-foreground text-sm font-medium rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
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
