import { useEffect, useState } from 'react'
import {
  AppBar,
  Box,
  Button,
  Container,
  Link,
  Toolbar,
  Typography,
} from '@mui/material'
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Discover', to: '/discover' },
  { label: 'My Boards', to: '/boards' },
  { label: 'Friends', to: '/friends' },
]

export default function Layout() {
  const location = useLocation()
  const { user, logout, loading } = useAuth()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        background:
          'radial-gradient(1200px 600px at 10% -10%, #f7d9c4 0%, transparent 55%), radial-gradient(900px 500px at 100% 0%, #d7e4df 0%, transparent 50%), linear-gradient(180deg, #F3EEE6 0%, #E8E1D6 100%)',
      }}
    >
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          zIndex: 2,
          bgcolor: scrolled ? 'rgba(255,252,248,0.88)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(28,35,38,0.08)' : 'none',
          color: 'text.primary',
          transition: 'background-color 220ms ease, border-color 220ms ease',
        }}
      >
        <Toolbar sx={{ gap: 1.5, flexWrap: 'wrap' }}>
          <Typography
            component={RouterLink}
            to="/"
            variant="h5"
            sx={{
              textDecoration: 'none',
              color: 'inherit',
              flexGrow: 1,
              letterSpacing: '-0.03em',
              fontWeight: 700,
            }}
          >
            One Place
          </Typography>
          {navItems.map((item) => {
            const active = location.pathname === item.to
            return (
              <Button
                key={item.to}
                component={RouterLink}
                to={item.to}
                color={active ? 'primary' : 'inherit'}
                variant={active ? 'contained' : 'text'}
              >
                {item.label}
              </Button>
            )
          })}
          {!loading &&
            (user ? (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>
                  @{user.username}
                </Typography>
                <Button color="inherit" onClick={logout}>
                  Log out
                </Button>
              </>
            ) : (
              <Button component={RouterLink} to="/auth" variant="outlined" color="secondary">
                Log in
              </Button>
            ))}
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 }, flex: 1, position: 'relative', zIndex: 1 }}>
        <Outlet />
      </Container>

      <Box
        component="footer"
        sx={{
          position: 'relative',
          zIndex: 1,
          borderTop: '1px solid rgba(28,35,38,0.08)',
          py: 2.5,
          px: 2,
          textAlign: 'center',
          bgcolor: 'rgba(255,252,248,0.72)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} One Place. All rights reserved.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          <Link
            href="https://github.com/vysha-exe"
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
            color="inherit"
          >
            github.com/vysha-exe
          </Link>
        </Typography>
      </Box>
    </Box>
  )
}
