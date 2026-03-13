import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** shadcn/ui utility — merge Tailwind classes safely */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/** Format a date for display */
export function formatDate(dateStr) {
  if (!dateStr) return 'Never'
  const d = new Date(dateStr)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
}

/** Get relative time string */
export function timeAgo(dateStr) {
  if (!dateStr) return 'Never'
  const d = new Date(dateStr)
  const seconds = Math.floor((Date.now() - d) / 1000)
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`
  return formatDate(dateStr)
}

/** Extract domain from URL for favicon */
export function extractDomain(url) {
  if (!url) return null
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

/** Get favicon URL from domain */
export function getFaviconUrl(url) {
  const domain = extractDomain(url)
  if (!domain) return null
  return `https://www.google.com/s2/favicons?sz=32&domain=${domain}`
}

/** Strength score → label */
export const STRENGTH_LABELS = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong']
export const STRENGTH_COLORS = [
  'text-red-500',
  'text-orange-500',
  'text-yellow-500',
  'text-blue-400',
  'text-emerald-500',
]
export const STRENGTH_BG = [
  'bg-red-500',
  'bg-orange-500',
  'bg-yellow-500',
  'bg-blue-400',
  'bg-emerald-500',
]

/** Mask a string — show first + last chars */
export function maskString(str, visibleChars = 2) {
  if (!str) return ''
  if (str.length <= visibleChars * 2) return '••••••'
  return str.slice(0, visibleChars) + '••••••' + str.slice(-visibleChars)
}

/** Debounce a function */
export function debounce(fn, delay) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}
