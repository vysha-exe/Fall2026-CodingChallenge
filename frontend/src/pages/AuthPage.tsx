import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function AuthPage() {
  const { user, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || '/boards'

  const [mode, setMode] = useState(0)
  const [loginValue, setLoginValue] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to={from} replace />

  const submit = async () => {
    setLoading(true)
    setError('')
    try {
      if (mode === 0) {
        await login(loginValue.trim(), password)
      } else {
        await register(username.trim(), email.trim(), password)
      }
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: { xs: 2, md: 6 } }}>
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 440,
          p: { xs: 3, md: 4 },
          border: '1px solid rgba(28,35,38,0.08)',
          bgcolor: 'rgba(255,252,248,0.92)',
        }}
      >
        <Typography variant="h4" gutterBottom>
          {mode === 0 ? 'Welcome back' : 'Create your account'}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Accounts let you own boards and invite classmates by username to edit together
          in One Place.
        </Typography>

        <Tabs value={mode} onChange={(_e, v) => setMode(v)} sx={{ mb: 2 }}>
          <Tab label="Log in" />
          <Tab label="Sign up" />
        </Tabs>

        <Stack spacing={2}>
          {mode === 0 ? (
            <TextField
              label="Username or email"
              value={loginValue}
              onChange={(e) => setLoginValue(e.target.value)}
              fullWidth
              autoFocus
            />
          ) : (
            <>
              <TextField
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                helperText="3–24 chars: letters, numbers, underscore"
                fullWidth
                autoFocus
              />
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
              />
            </>
          )}
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            helperText={mode === 1 ? 'At least 6 characters' : undefined}
            fullWidth
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />

          {error && <Alert severity="error">{error}</Alert>}

          <Button variant="contained" size="large" onClick={submit} disabled={loading}>
            {loading ? 'Please wait…' : mode === 0 ? 'Log in' : 'Create account'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  )
}
