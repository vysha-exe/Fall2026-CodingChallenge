import {
  ArrowBack,
  DeleteOutlined,
  EditOutlined,
  IosShare,
  LockOpen,
  PersonAdd,
  Public,
} from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { api, type CollectionDetail, type SavedImage } from '../api'

export default function BoardDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [board, setBoard] = useState<CollectionDetail | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [editImage, setEditImage] = useState<SavedImage | null>(null)
  const [note, setNote] = useState('')
  const [title, setTitle] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviting, setInviting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setError('')
      const data = await api.getCollection(id)
      setBoard(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load board')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  const share = async () => {
    try {
      const result = await api.shareCollection(id)
      const fullUrl = `${window.location.origin}${result.shareUrl}`
      await navigator.clipboard.writeText(fullUrl)
      setBoard(result.collection)
      setToast('Share link copied to clipboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share')
    }
  }

  const togglePublic = async (checked: boolean) => {
    if (!board) return
    try {
      const updated = await api.updateCollection(board.id, { isPublic: checked })
      setBoard(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update privacy')
    }
  }

  const removeImage = async (imageId: string) => {
    try {
      await api.removeImage(id, imageId)
      await load()
      setToast('Image removed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove image')
    }
  }

  const deleteBoard = async () => {
    if (!window.confirm('Delete this board and all of its images?')) return
    try {
      await api.deleteCollection(id)
      navigate('/boards')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete board')
    }
  }

  const saveEdits = async () => {
    if (!editImage) return
    try {
      await api.updateImage(id, editImage.id, { title: title.trim(), note: note.trim() })
      setEditImage(null)
      await load()
      setToast('Image updated')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update image')
    }
  }

  const inviteCollaborator = async () => {
    if (!inviteUsername.trim()) return
    setInviting(true)
    try {
      await api.inviteCollaborator(id, inviteUsername.trim())
      setInviteOpen(false)
      setInviteUsername('')
      await load()
      setToast(`Invited @${inviteUsername.trim().toLowerCase()}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite collaborator')
    } finally {
      setInviting(false)
    }
  }

  const removeCollaborator = async (userId: string) => {
    try {
      await api.removeCollaborator(id, userId)
      await load()
      setToast('Collaborator removed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove collaborator')
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
    return <Alert severity="error">{error || 'Board not found'}</Alert>
  }

  return (
    <Stack spacing={3}>
      <Button
        component={RouterLink}
        to="/boards"
        startIcon={<ArrowBack />}
        sx={{ alignSelf: 'flex-start' }}
        color="inherit"
      >
        All boards
      </Button>

      {error && <Alert severity="error">{error}</Alert>}

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { md: 'flex-start' } }}
      >
        <Box>
          <Typography variant="h3">{board.name}</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5, maxWidth: 560 }}>
            {board.description || 'No description yet.'}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: 'center' }}>
            {board.isPublic ? <Public fontSize="small" /> : <LockOpen fontSize="small" />}
            <Typography variant="body2" color="text.secondary">
              {board.isPublic ? 'Public board' : 'Private board'}
              {board.ownerUsername ? ` · @${board.ownerUsername}` : ''}
              {board.role === 'collaborator' ? ' · collaborator' : ''}
            </Typography>
            <Switch
              checked={board.isPublic}
              onChange={(e) => togglePublic(e.target.checked)}
              size="small"
            />
          </Stack>
        </Box>

        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Button startIcon={<PersonAdd />} variant="outlined" onClick={() => setInviteOpen(true)}>
            Invite user
          </Button>
          <Button startIcon={<IosShare />} variant="contained" onClick={share}>
            Share link
          </Button>
          {board.role === 'owner' && (
            <Button color="inherit" onClick={deleteBoard}>
              Delete board
            </Button>
          )}
        </Stack>
      </Stack>

      {(board.collaborators?.length || 0) > 0 && (
        <Stack spacing={1}>
          <Typography variant="subtitle2">Collaborators</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {board.collaborators?.map((c) => (
              <Box
                key={c.id}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1.25,
                  py: 0.5,
                  borderRadius: 999,
                  bgcolor: 'rgba(28,35,38,0.06)',
                }}
              >
                <Typography variant="body2">@{c.username}</Typography>
                {board.role === 'owner' && (
                  <IconButton size="small" onClick={() => removeCollaborator(c.userId)}>
                    <DeleteOutlined fontSize="inherit" />
                  </IconButton>
                )}
              </Box>
            ))}
          </Stack>
        </Stack>
      )}

      {board.images.length === 0 ? (
        <Box
          sx={{
            py: 8,
            textAlign: 'center',
            border: '1px dashed rgba(28,35,38,0.2)',
            borderRadius: 3,
          }}
        >
          <Typography variant="h6">This board is empty</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Head to Discover and save images here.
          </Typography>
          <Button component={RouterLink} to="/discover" variant="outlined">
            Discover images
          </Button>
        </Box>
      ) : (
        <Box
          sx={{
            columnCount: { xs: 1, sm: 2, md: 3 },
            columnGap: 2,
          }}
        >
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
                position: 'relative',
                '&:hover .actions': { opacity: 1 },
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
                {image.note && (
                  <Typography variant="body2" color="text.secondary">
                    {image.note}
                  </Typography>
                )}
              </Box>
              <Stack
                className="actions"
                direction="row"
                spacing={0.5}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  opacity: { xs: 1, md: 0 },
                  transition: 'opacity 180ms ease',
                  bgcolor: 'rgba(255,252,248,0.92)',
                  borderRadius: 999,
                  p: 0.25,
                }}
              >
                <Tooltip title="Edit">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setEditImage(image)
                      setTitle(image.title)
                      setNote(image.note)
                    }}
                  >
                    <EditOutlined fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Remove">
                  <IconButton size="small" onClick={() => removeImage(image.id)}>
                    <DeleteOutlined fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
          ))}
        </Box>
      )}

      <Dialog open={Boolean(editImage)} onClose={() => setEditImage(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit saved image</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
            <TextField
              label="Note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              fullWidth
              multiline
              minRows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditImage(null)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={saveEdits}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Invite a collaborator</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            They must already have a One Place account. Invited users can edit this board.
          </Typography>
          <TextField
            autoFocus
            label="Username"
            value={inviteUsername}
            onChange={(e) => setInviteUsername(e.target.value)}
            fullWidth
            onKeyDown={(e) => e.key === 'Enter' && inviteCollaborator()}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setInviteOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={inviteCollaborator}
            disabled={inviting || !inviteUsername.trim()}
          >
            Invite
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={2800}
        onClose={() => setToast('')}
        message={toast}
      />
    </Stack>
  )
}
