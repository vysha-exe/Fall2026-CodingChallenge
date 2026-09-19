import { Box, Button, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import DynamicBackground from '../components/DynamicBackground'

export default function HomePage() {
  const { user } = useAuth()

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: { xs: '70vh', md: '75vh' },
        mx: { xs: -2, sm: -3, md: -4 },
        px: { xs: 2, sm: 3, md: 4 },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        overflow: 'hidden',
        borderRadius: { md: 3 },
      }}
    >
      <DynamicBackground contained />

      <Stack
        spacing={3}
        alignItems="center"
        sx={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 640,
          px: 3,
          py: 4,
          borderRadius: 3,
          bgcolor: 'rgba(255,252,248,0.78)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(28,35,38,0.06)',
          animation: 'fadeUp 500ms ease both',
          '@keyframes fadeUp': {
            from: { opacity: 0, transform: 'translateY(14px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
        }}
      >
        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: '2.6rem', md: '4rem' },
            fontWeight: 700,
            letterSpacing: '-0.04em',
            lineHeight: 1.1,
          }}
        >
          One Place
        </Typography>
        <Typography color="text.secondary" sx={{ fontSize: { xs: '1.05rem', md: '1.2rem' }, maxWidth: 520 }}>
          Search for images, pin them onto boards, and share a live link so friends can
          collaborate. Everything you love, in One Place.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button
            component={RouterLink}
            to="/discover"
            variant="contained"
            size="large"
            sx={{ px: 4, py: 1.25 }}
          >
            Get started
          </Button>
          {!user && (
            <Button
              component={RouterLink}
              to="/auth"
              variant="outlined"
              color="secondary"
              size="large"
              sx={{ px: 4, py: 1.25 }}
            >
              Log in
            </Button>
          )}
          {user && (
            <Button
              component={RouterLink}
              to="/boards"
              variant="outlined"
              color="secondary"
              size="large"
              sx={{ px: 4, py: 1.25 }}
            >
              My boards
            </Button>
          )}
        </Stack>
      </Stack>
    </Box>
  )
}
