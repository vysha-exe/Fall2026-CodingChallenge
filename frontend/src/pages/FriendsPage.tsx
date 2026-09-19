import { PersonAdd, PeopleOutline } from '@mui/icons-material'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import {
  api,
  type Friend,
  type FriendRequestIncoming,
  type FriendRequestOutgoing,
  type UserSearchResult,
} from '../api'

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([])
  const [incoming, setIncoming] = useState<FriendRequestIncoming[]>([])
  const [outgoing, setOutgoing] = useState<FriendRequestOutgoing[]>([])
  const [inputValue, setInputValue] = useState('')
  const [options, setOptions] = useState<UserSearchResult[]>([])
  const [selected, setSelected] = useState<UserSearchResult | null>(null)
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [f, inc, out] = await Promise.all([
        api.listFriends(),
        api.listIncomingRequests(),
        api.listOutgoingRequests(),
      ])
      setFriends(f)
      setIncoming(inc)
      setOutgoing(out)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load friends')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Live search as the user types (debounced)
  useEffect(() => {
    const q = inputValue.trim()
    if (q.length < 1) {
      setOptions([])
      setSearching(false)
      return
    }

    let cancelled = false
    setSearching(true)
    const timer = window.setTimeout(async () => {
      try {
        const results = await api.searchUsers(q)
        if (!cancelled) {
          setOptions(results)
          setDropdownOpen(true)
        }
      } catch (err) {
        if (!cancelled) {
          setOptions([])
          setError(err instanceof Error ? err.message : 'Search failed')
        }
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [inputValue])

  const refreshOptions = async () => {
    const q = inputValue.trim()
    if (!q) {
      setOptions([])
      return
    }
    try {
      setOptions(await api.searchUsers(q))
    } catch {
      // ignore refresh errors
    }
  }

  const sendToUser = async (user: UserSearchResult) => {
    if (user.relationship !== 'none') return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await api.sendFriendRequest(user.username)
      setMessage(result.message)
      setSelected(null)
      setInputValue('')
      setOptions([])
      setDropdownOpen(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send request')
    } finally {
      setBusy(false)
    }
  }

  const sendSelectedOrTyped = async () => {
    if (selected) {
      await sendToUser(selected)
      return
    }
    const username = inputValue.trim()
    if (!username) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await api.sendFriendRequest(username)
      setMessage(result.message)
      setInputValue('')
      setOptions([])
      setDropdownOpen(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send request')
    } finally {
      setBusy(false)
    }
  }

  const accept = async (id: string) => {
    setBusy(true)
    try {
      const result = await api.acceptFriendRequest(id)
      setMessage(result.message)
      await load()
      await refreshOptions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept')
    } finally {
      setBusy(false)
    }
  }

  const reject = async (id: string) => {
    setBusy(true)
    try {
      await api.rejectFriendRequest(id)
      setMessage('Request declined')
      await load()
      await refreshOptions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline')
    } finally {
      setBusy(false)
    }
  }

  const cancel = async (id: string) => {
    setBusy(true)
    try {
      await api.cancelFriendRequest(id)
      setMessage('Request cancelled')
      await load()
      await refreshOptions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel')
    } finally {
      setBusy(false)
    }
  }

  const unfriend = async (userId: string, name: string) => {
    if (!window.confirm(`Remove @${name} from your friends?`)) return
    setBusy(true)
    try {
      await api.removeFriend(userId)
      setMessage(`Removed @${name}`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove friend')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h3">Friends</Typography>
        <Typography color="text.secondary">
          Search for users as you type, send friend requests, and manage your list.
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {message && (
        <Alert severity="success" onClose={() => setMessage('')}>
          {message}
        </Alert>
      )}

      <Box
        sx={{
          p: 2.5,
          borderRadius: 3,
          bgcolor: 'rgba(255,252,248,0.8)',
          border: '1px solid rgba(28,35,38,0.08)',
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <PersonAdd />
          <Typography variant="h6">Add a friend</Typography>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="flex-start">
          <Autocomplete
            fullWidth
            open={dropdownOpen && (searching || options.length > 0 || inputValue.trim().length > 0)}
            onOpen={() => setDropdownOpen(true)}
            onClose={() => setDropdownOpen(false)}
            options={options}
            loading={searching}
            filterOptions={(x) => x}
            value={selected}
            inputValue={inputValue}
            onChange={(_e, value) => setSelected(value)}
            onInputChange={(_e, value, reason) => {
              if (reason === 'input' || reason === 'clear') {
                setInputValue(value)
                setSelected(null)
              }
            }}
            getOptionLabel={(option) =>
              typeof option === 'string' ? option : `@${option.username}`
            }
            isOptionEqualToValue={(a, b) => a.id === b.id}
            noOptionsText={
              searching
                ? 'Searching…'
                : inputValue.trim()
                  ? 'No users found'
                  : 'Start typing a username'
            }
            renderOption={(props, option) => {
              const { key, ...rest } = props as typeof props & { key?: string }
              return (
                <Box
                  component="li"
                  key={key ?? option.id}
                  {...rest}
                  sx={{
                    display: 'flex !important',
                    justifyContent: 'space-between',
                    gap: 2,
                    alignItems: 'center',
                  }}
                >
                  <Typography>@{option.username}</Typography>
                  {option.relationship === 'none' && (
                    <Button
                      size="small"
                      variant="contained"
                      disabled={busy}
                      onClick={(e) => {
                        e.stopPropagation()
                        sendToUser(option)
                      }}
                    >
                      Add
                    </Button>
                  )}
                  {option.relationship === 'friends' && (
                    <Typography variant="caption" color="text.secondary">
                      Friends
                    </Typography>
                  )}
                  {option.relationship === 'outgoing' && (
                    <Typography variant="caption" color="text.secondary">
                      Request sent
                    </Typography>
                  )}
                  {option.relationship === 'incoming' && option.requestId && (
                    <Stack direction="row" spacing={0.5}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={(e) => {
                          e.stopPropagation()
                          accept(option.requestId!)
                        }}
                      >
                        Accept
                      </Button>
                      <Button
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          reject(option.requestId!)
                        }}
                      >
                        Decline
                      </Button>
                    </Stack>
                  )}
                </Box>
              )
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search users"
                placeholder="Type a username…"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    sendSelectedOrTyped()
                  }
                }}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {searching ? <CircularProgress color="inherit" size={18} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
          <Button
            variant="contained"
            onClick={sendSelectedOrTyped}
            disabled={busy || (!selected && !inputValue.trim())}
            sx={{ whiteSpace: 'nowrap', mt: { sm: 0.5 } }}
          >
            Send request
          </Button>
        </Stack>
      </Box>

      <Box>
        <Typography variant="h5" sx={{ mb: 1.5 }}>
          Incoming requests ({incoming.length})
        </Typography>
        {incoming.length === 0 ? (
          <Typography color="text.secondary">No pending requests.</Typography>
        ) : (
          <Stack spacing={1}>
            {incoming.map((req) => (
              <Stack
                key={req.id}
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ sm: 'center' }}
                spacing={1}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,252,248,0.85)',
                  border: '1px solid rgba(28,35,38,0.08)',
                }}
              >
                <Typography>
                  <strong>@{req.from.username}</strong> wants to be friends
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="contained" disabled={busy} onClick={() => accept(req.id)}>
                    Accept
                  </Button>
                  <Button size="small" disabled={busy} onClick={() => reject(req.id)}>
                    Decline
                  </Button>
                </Stack>
              </Stack>
            ))}
          </Stack>
        )}
      </Box>

      <Box>
        <Typography variant="h5" sx={{ mb: 1.5 }}>
          Sent requests ({outgoing.length})
        </Typography>
        {outgoing.length === 0 ? (
          <Typography color="text.secondary">No outgoing requests.</Typography>
        ) : (
          <Stack spacing={1}>
            {outgoing.map((req) => (
              <Stack
                key={req.id}
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ sm: 'center' }}
                spacing={1}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,252,248,0.85)',
                  border: '1px solid rgba(28,35,38,0.08)',
                }}
              >
                <Typography>
                  Waiting on <strong>@{req.to.username}</strong>
                </Typography>
                <Button size="small" disabled={busy} onClick={() => cancel(req.id)}>
                  Cancel
                </Button>
              </Stack>
            ))}
          </Stack>
        )}
      </Box>

      <Box>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <PeopleOutline />
          <Typography variant="h5">Your friends ({friends.length})</Typography>
        </Stack>
        {friends.length === 0 ? (
          <Typography color="text.secondary">
            No friends yet. Search for a user above to get started.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {friends.map((friend) => (
              <Stack
                key={friend.id}
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ sm: 'center' }}
                spacing={1}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,252,248,0.85)',
                  border: '1px solid rgba(28,35,38,0.08)',
                }}
              >
                <Box>
                  <Typography fontWeight={600}>@{friend.username}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Friends since {new Date(friend.friendsSince).toLocaleDateString()}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  color="inherit"
                  disabled={busy}
                  onClick={() => unfriend(friend.id, friend.username)}
                >
                  Remove
                </Button>
              </Stack>
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  )
}
