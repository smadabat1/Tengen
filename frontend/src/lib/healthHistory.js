const HISTORY_KEY = 'tengen_health_history'
const MAX_SNAPSHOTS = 30

/**
 * Save a health snapshot to localStorage.
 * Deduplicates entries within the same minute to avoid noise on quick refreshes.
 */
export function saveSnapshot({ score, weak, pwned, reused, old, total }) {
  const history = loadHistory()
  const now = Date.now()

  // Don't save if last snapshot is less than 60 seconds ago
  if (history.length > 0 && now - history[history.length - 1].ts < 60_000) {
    return history
  }

  const snapshot = { ts: now, score, weak, pwned, reused, old, total }
  const updated = [...history, snapshot].slice(-MAX_SNAPSHOTS)

  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
  } catch (_) {}

  return updated
}

/**
 * Load history from localStorage. Returns [] if empty or corrupt.
 */
export function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch (_) {
    return []
  }
}
