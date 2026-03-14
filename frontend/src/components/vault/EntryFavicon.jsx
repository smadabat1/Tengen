import { useEffect, useMemo, useState } from 'react'
import { extractDomain, getFaviconUrl, cn } from '@/lib/utils'

export function EntryFavicon({
  url,
  title,
  size = 20,
  loading = 'eager',
  imgClassName,
  textClassName,
}) {
  const [status, setStatus] = useState('loading')

  const faviconUrl = useMemo(() => getFaviconUrl(url, 64), [url])
  const fallbackLetter = useMemo(() => {
    const fromTitle = title?.trim?.()?.[0]
    if (fromTitle) return fromTitle.toUpperCase()
    const domain = extractDomain(url)
    const fromDomain = domain?.[0]
    if (fromDomain) return fromDomain.toUpperCase()
    return 'E'
  }, [title, url])

  useEffect(() => {
    setStatus('loading')
  }, [faviconUrl])

  return (
    <span
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {(!faviconUrl || status !== 'loaded') && (
        <span className={cn('text-sm font-semibold text-primary uppercase', textClassName)}>
          {fallbackLetter}
        </span>
      )}

      {faviconUrl && status !== 'error' && (
        <img
          src={faviconUrl}
          alt=""
          width={size}
          height={size}
          loading={loading}
          decoding="async"
          fetchPriority="low"
          referrerPolicy="no-referrer"
          className={cn(
            'absolute inset-0 h-full w-full object-contain rounded-[4px] transition-opacity',
            status === 'loaded' ? 'opacity-100' : 'opacity-0',
            imgClassName
          )}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
        />
      )}
    </span>
  )
}
