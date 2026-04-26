import { useState, useEffect, createContext, useContext, Suspense } from 'react'
import { Outlet, useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Navbar } from './Navbar'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { CommandModal } from '@/components/ui/CommandModal'
import { PageLoader } from '@/components/ui/PageLoader'
import { useAutoLock, useActivityTracker } from '@/hooks/useAutoLock'

const AppContext = createContext({})
export const useAppContext = () => useContext(AppContext)

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [activeTag, setActiveTag] = useState(null)
  const [pendingViewEntry, setPendingViewEntry] = useState(null)
  const [pendingViewNote, setPendingViewNote] = useState(null)
  const navigate = useNavigate()

  useActivityTracker()
  const secondsRemaining = useAutoLock()

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleSelectEntry = (entry) => {
    setPendingViewEntry(entry)
    navigate({ to: '/vault' })
  }

  const handleSelectTag = (tagName) => {
    setActiveTag(tagName)
    navigate({ to: '/vault' })
  }

  const handleSelectNote = (note) => {
    setPendingViewNote(note)
    navigate({ to: '/notes' })
  }

  return (
    <AppContext.Provider value={{ activeTag, setActiveTag, sidebarOpen, setSidebarOpen, pendingViewEntry, setPendingViewEntry, pendingViewNote, setPendingViewNote }}>
      <div className="h-screen overflow-hidden bg-background flex flex-col">
        <Navbar
          onOpenSearch={() => setCmdOpen(true)}
          secondsRemaining={secondsRemaining}
          onToggleMobileDrawer={() => setMobileDrawerOpen(o => !o)}
        />

        <div className="flex flex-1 overflow-hidden w-full">
          {/* Mobile drawer — visible only below md breakpoint */}
          <div className="md:hidden">
            {mobileDrawerOpen && (
              <div
                className="fixed inset-0 z-40 bg-black/50"
                onClick={() => setMobileDrawerOpen(false)}
              />
            )}
            <motion.div
              initial={false}
              animate={{ x: mobileDrawerOpen ? 0 : -288 }}
              transition={{ type: 'tween', duration: 0.22 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-background border-r border-border/30 flex flex-col overflow-hidden"
            >
              <Sidebar
                activeTag={activeTag}
                onTagSelect={(tag) => { setActiveTag(tag); setMobileDrawerOpen(false) }}
                onClose={() => setMobileDrawerOpen(false)}
              />
            </motion.div>
          </div>

          {/* Desktop sidebar — hidden on mobile */}
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="hidden md:flex w-56 flex-shrink-0 border-r border-border/30 overflow-hidden flex-col"
            >
              <Sidebar activeTag={activeTag} onTagSelect={setActiveTag} />
            </motion.div>
          )}

          <main className="flex-1 overflow-y-auto">
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </main>
        </div>

        <CommandModal
          open={cmdOpen}
          onOpenChange={setCmdOpen}
          onSelectEntry={handleSelectEntry}
          onSelectNote={handleSelectNote}
          onSelectTag={handleSelectTag}
        />
      </div>
    </AppContext.Provider>
  )
}
