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
        />

        <div className="flex flex-1 overflow-hidden w-full">
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="w-56 flex-shrink-0 border-r border-border/30 overflow-hidden flex flex-col"
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
