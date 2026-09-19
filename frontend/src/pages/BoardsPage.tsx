import { Add, CollectionsBookmark } from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { api, type CollectionSummary } from '../api'

export default function BoardsPage() {
  const [boards, setBoards] = useState<CollectionSummary[]>([])
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      setError('')
      const list = await api.listCollections()
      setBoards(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load boards')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const createBoard = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await api.createCollection({
        name: name.trim(),
        description: description.trim(),
      })
      setOpen(false)
      setName('')
      setDescription('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create board')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <Box>
          <Typography variant="h3">My boards</Typography>
          <Typography color="text.secondary">
            Organize saved images into collections you can edit and share.
          </Typography>
        </Box>
        <Button startIcon={<Add />} variant="contained" onClick={() => setOpen(true)}>
          New board
        </Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      {boards.length === 0 ? (
        <Box
          sx={{
            py: 8,
            textAlign: 'center',
            border: '1px dashed rgba(28,35,38,0.2)',
            borderRadius: 3,
            bgcolor: 'rgba(255,252,248,0.55)',
          }}
        >
          <CollectionsBookmark sx={{ fontSize: 42, color: 'text.secondary', mb: 1 }} />
          <Typography variant="h6">No boards yet</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Create one here, or save an image from Discover.
          </Typography>
          <Button variant="outlined" onClick={() => setOpen(true)}>
            Create your first board
          </Button>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
            },
          }}
        >
          {boards.map((board, index) => (
            <Card
              key={board.id}
              elevation={0}
              sx={{
                border: '1px solid rgba(28,35,38,0.08)',
                bgcolor: 'background.paper',
                animation: 'fadeUp 420ms ease both',
                animationDelay: `${index * 40}ms`,
                '@keyframes fadeUp': {
                  from: { opacity: 0, transform: 'translateY(10px)' },
                  to: { opacity: 1, transform: 'translateY(0)' },
                },
              }}
            >
              <CardActionArea component={RouterLink} to={`/boards/${board.id}`}>
                <CardContent sx={{ minHeight: 140 }}>
                  <Typography variant="h5" gutterBottom>
                    {board.name}
                  </Typography>
                  <Typography color="text.secondary" variant="body2" sx={{ mb: 1.5 }}>
                    {board.description || 'No description'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {board.imageCount} image{board.imageCount === 1 ? '' : 's'}
                    {board.role === 'collaborator' ? ' · shared with you' : ''}
                    {board.shareToken ? ' · link shared' : ''}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          Create a board
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
            />
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={createBoard} disabled={saving || !name.trim()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
