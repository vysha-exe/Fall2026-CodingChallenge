import { CssBaseline, ThemeProvider } from '@mui/material'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
import BoardDetailPage from './pages/BoardDetailPage'
import BoardsPage from './pages/BoardsPage'
import DiscoverPage from './pages/DiscoverPage'
import FriendsPage from './pages/FriendsPage'
import HomePage from './pages/HomePage'
import SharePage from './pages/SharePage'
import { theme } from './theme'
import type { ReactNode } from 'react'

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (!user) return <Navigate to="/auth" replace state={{ from: location.pathname }} />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="discover" element={<DiscoverPage />} />
        <Route path="auth" element={<AuthPage />} />
        <Route
          path="boards"
          element={
            <RequireAuth>
              <BoardsPage />
            </RequireAuth>
          }
        />
        <Route
          path="boards/:id"
          element={
            <RequireAuth>
              <BoardDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="friends"
          element={
            <RequireAuth>
              <FriendsPage />
            </RequireAuth>
          }
        />
        <Route path="share/:token" element={<SharePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
