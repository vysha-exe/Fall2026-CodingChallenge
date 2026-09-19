import { Box } from '@mui/material'
import { useEffect, useState } from 'react'
import { api } from '../api'

const ROTATE_MS = 5500
const TOPICS = ['nature', 'travel', 'city', 'ocean', 'food', 'art']

type Props = {
  /** When true, fills the parent instead of the whole viewport */
  contained?: boolean
}

/**
 * Soft, crossfading photo backdrop pulled from the image search API.
 * Used only on the home page.
 */
export default function DynamicBackground({ contained = false }: Props) {
  const [urls, setUrls] = useState<string[]>([])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)]
        const data = await api.search(topic, 1)
        if (cancelled) return
        const next = data.results
          .map((r) => r.previewUrl || r.url)
          .filter(Boolean)
          .slice(0, 8)
        if (next.length) setUrls(next)
      } catch {
        // Keep gradient-only backdrop if search is unavailable
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (urls.length < 2) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % urls.length)
    }, ROTATE_MS)
    return () => window.clearInterval(id)
  }, [urls])

  return (
    <Box
      aria-hidden
      sx={{
        position: contained ? 'absolute' : 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        borderRadius: 'inherit',
      }}
    >
      {urls.map((url, i) => (
        <Box
          key={url}
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: i === index ? 1 : 0,
            transform: i === index ? 'scale(1.04)' : 'scale(1)',
            transition: 'opacity 1.4s ease, transform 8s ease',
            filter: 'saturate(0.92)',
          }}
        />
      ))}

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(243,238,230,0.55) 0%, rgba(232,225,214,0.72) 50%, rgba(243,238,230,0.82) 100%)',
        }}
      />
    </Box>
  )
}
