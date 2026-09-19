import { Search as SearchIcon } from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { api, type SearchHit } from '../api'
import ImageCard from '../components/ImageCard'
import SaveToBoardDialog from '../components/SaveToBoardDialog'

const SUGGESTIONS = ['nature', 'food', 'travel', 'minimal', 'ocean', 'city']

export default function DiscoverPage() {
  const [query, setQuery] = useState('')
  const [input, setInput] = useState('')
  const [results, setResults] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<SearchHit | null>(null)
  const [toast, setToast] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    if (!query) {
      setResults([])
      setLoading(false)
      return
    }

    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await api.search(query)
        if (!cancelled) setResults(data.results)
      } catch (err) {
        if (!cancelled) {
          setResults([])
          setError(err instanceof Error ? err.message : 'Search failed')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [query])

  const submitSearch = (value: string) => {
    const next = value.trim()
    if (!next) return
    setHasSearched(true)
    setInput(next)
    setQuery(next)
  }

  return (
    <Stack spacing={3}>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          animation: 'fadeUp 500ms ease both',
          '@keyframes fadeUp': {
            from: { opacity: 0, transform: 'translateY(12px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
        }}
      >
        <Typography variant="h2" sx={{ fontSize: { xs: '2.2rem', md: '3.2rem' } }}>
          Find it. Keep it. Share it.
        </Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 560 }}>
          Search for images, pin them onto boards, and share a live link so friends can
          collaborate. Everything you love, in One Place.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitSearch(input)
            }}
            placeholder="Search images…"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Button variant="contained" size="large" onClick={() => submitSearch(input)}>
            Search
          </Button>
        </Stack>

        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
          {SUGGESTIONS.map((tag) => (
            <Button
              key={tag}
              size="small"
              variant={query === tag ? 'contained' : 'outlined'}
              color={query === tag ? 'primary' : 'secondary'}
              onClick={() => submitSearch(tag)}
            >
              {tag}
            </Button>
          ))}
        </Stack>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box
          sx={{
            columnCount: { xs: 1, sm: 2, md: 3 },
            columnGap: 2,
          }}
        >
          {results.map((image) => (
            <ImageCard key={image.pixabayId} image={image} onSave={setSelected} />
          ))}
        </Box>
      )}

      {!loading && !error && hasSearched && results.length === 0 && (
        <Typography color="text.secondary">No images found. Try another search.</Typography>
      )}

      {!loading && !hasSearched && (
        <Typography color="text.secondary">
          Type a search or pick a suggestion to get started.
        </Typography>
      )}

      <SaveToBoardDialog
        open={Boolean(selected)}
        image={selected}
        onClose={() => setSelected(null)}
        onSaved={(name) => setToast(`Saved to “${name}”`)}
      />

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={2800}
        onClose={() => setToast('')}
        message={toast}
      />
    </Stack>
  )
}
