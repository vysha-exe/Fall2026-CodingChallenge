import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { api, type CollectionSummary, type SearchHit } from '../api'
import { useAuth } from '../auth/AuthContext'

type Props = {
  open: boolean
  image: SearchHit | null
  onClose: () => void
  onSaved: (collectionName: string) => void
}

export default function SaveToBoardDialog({ open, image, onClose, onSaved }: Props) {
  const { user } = useAuth()
  const [boards, setBoards] = useState<CollectionSummary[]>([])
  const [collectionId, setCollectionId] = useState('')
  const [newName, setNewName] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !user) return
    setError('')
    setNote('')
    setNewName('')
    api
      .listCollections()
      .then((list) => {
        setBoards(list)
        setCollectionId(list[0]?.id || '')
      })
      .catch((err: Error) => setError(err.message))
  }, [open, user])

  const handleSave = async () => {
    if (!image || !user) return
    setLoading(true)
    setError('')
    try {
      let targetId = collectionId
      let targetName = boards.find((b) => b.id === collectionId)?.name || 'board'

      if (newName.trim()) {
        const created = await api.createCollection({ name: newName.trim() })
        targetId = created.id
        targetName = created.name
      }

      if (!targetId) {
        throw new Error('Create or select a board first')
      }

      await api.addImage(targetId, {
        url: image.url,
        previewUrl: image.previewUrl,
        title: image.title,
        tags: image.tags,
        photographer: image.photographer,
        pageUrl: image.pageUrl,
        pixabayId: image.pixabayId,
        note: note.trim(),
      })

      onSaved(targetName)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Save to a board
      </DialogTitle>
      <DialogContent>
        {!user ? (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography>
              Log in or create an account to save images to your boards.
            </Typography>
            <Button component={RouterLink} to="/auth" variant="contained" onClick={onClose}>
              Log in / Sign up
            </Button>
          </Stack>
        ) : (
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {image && (
              <Box
                component="img"
                src={image.previewUrl}
                alt={image.title}
                sx={{
                  width: '100%',
                  maxHeight: 220,
                  objectFit: 'cover',
                  borderRadius: 2,
                }}
              />
            )}

            <FormControl fullWidth disabled={Boolean(newName.trim())}>
              <InputLabel id="board-select-label">Existing board</InputLabel>
              <Select
                labelId="board-select-label"
                label="Existing board"
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
              >
                {boards.length === 0 && (
                  <MenuItem value="" disabled>
                    No boards yet
                  </MenuItem>
                )}
                {boards.map((board) => (
                  <MenuItem key={board.id} value={board.id}>
                    {board.name} ({board.imageCount})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Or create a new board"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Weekend moodboard"
              fullWidth
            />

            <TextField
              label="Personal note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              multiline
              minRows={2}
              fullWidth
            />

            {error && (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        {user && (
          <Button onClick={handleSave} variant="contained" disabled={loading || !image}>
            {loading ? 'Saving…' : 'Save'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
