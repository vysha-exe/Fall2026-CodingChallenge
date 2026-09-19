import { createTheme } from '@mui/material/styles'

/** Warm charcoal + coral — all sans-serif */
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#C45C26',
      dark: '#9A4318',
      light: '#E08A5A',
      contrastText: '#FFF8F3',
    },
    secondary: {
      main: '#1F2A2E',
      contrastText: '#F7F3EE',
    },
    background: {
      default: '#F3EEE6',
      paper: '#FFFCF8',
    },
    text: {
      primary: '#1C2326',
      secondary: '#5A656A',
    },
  },
  typography: {
    fontFamily: '"DM Sans", "Segoe UI", sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.03em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, letterSpacing: '-0.02em' },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 14,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: 20,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
})
