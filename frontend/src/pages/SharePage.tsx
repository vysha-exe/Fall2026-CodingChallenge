import { Search as SearchIcon } from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, type CollectionDetail, type SearchHit } from '../api'
import ImageCard from '../components/ImageCard'

/**
 * Shared board view — collaborators with the link can browse and add images.
 */
export default function SharePage() {
  const { token = '' } = useParams()
  const [board, setBoard] = useState<CollectionDetail | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('travel')
  const [results, setResults] = useState<SearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [toast, setToast] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      setError('')
      const data = await api.getShared(token)
      setBoard(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Shared board not found')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [token])

  const runSearch = async () => {
    setSearching(true)
    try {
      const data = await api.search(query.trim() || 'travel')
      setResults(data.results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    if (searchOpen) runSearch()
  }, [searchOpen])

  const addImage = async (image: SearchHit) => {
    try {
      await api.addSharedImage(token, {
        url: image.url,
        previewUrl: image.previewUrl,
        title: image.title,
        tags: image.tags,
        photographer: image.photographer,
        pageUrl: image.pageUrl,
        pixabayId: image.pixabayId,
      })
      setToast('Added to shared board')
      setSearchOpen(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add image')
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!board) {
    return <Alert severity="error">{error || 'Shared board not found'}</Alert>
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" color="primary">
          Shared collection
        </Typography>
        <Typography variant="h3">{board.name}</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          {board.description || 'Anyone with this link can view and add images.'}
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Button variant="contained" onClick={() => setSearchOpen(true)} sx={{ alignSelf: 'flex-start' }}>
        Add an image
      </Button>

      {board.images.length === 0 ? (
        <Typography color="text.secondary">No images yet — be the first to add one.</Typography>
      ) : (
        <Box sx={{ columnCount: { xs: 1, sm: 2, md: 3 }, columnGap: 2 }}>
          {board.images.map((image) => (
            <Box
              key={image.id}
              sx={{
                breakInside: 'avoid',
                mb: 2,
                borderRadius: 2.5,
                overflow: 'hidden',
                bgcolor: 'background.paper',
                border: '1px solid rgba(28,35,38,0.08)',
              }}
            >
              <Box
                component="img"
                src={image.previewUrl || image.url}
                alt={image.title}
                loading="lazy"
                sx={{ width: '100%', display: 'block' }}
              />
              <Box sx={{ p: 1.5 }}>
                <Typography variant="subtitle2">{image.title || 'Untitled'}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <Dialog open={searchOpen} onClose={() => setSearchOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Add image to “{board.name}”</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={1}>
              <TextField
                fullWidth
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runSearch()}
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
              <Button variant="contained" onClick={runSearch}>
                Search
              </Button>
            </Stack>
            {searching ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ columnCount: { xs: 1, sm: 2 }, columnGap: 2 }}>
                {results.map((image) => (
                  <ImageCard key={image.pixabayId} image={image} onSave={addImage} />
                ))}
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSearchOpen(false)} color="inherit">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={2500}
        onClose={() => setToast('')}
        message={toast}
      />
    </Stack>
  )
}
