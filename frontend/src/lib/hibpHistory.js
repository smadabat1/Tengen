const KEY = 'tengen_hibp_runs'
const MAX = 20

export function saveHibpRun({ total, pwned, clean }) {
  const history = loadHibpHistory()
  history.unshift({ ts: Date.now(), total, pwned, clean, unchecked: total - pwned - clean })
  const trimmed = history.slice(0, MAX)
  try { localStorage.setItem(KEY, JSON.stringify(trimmed)) } catch (_) {}
  return trimmed
}

export function loadHibpHistory() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch (_) { return [] }
}
