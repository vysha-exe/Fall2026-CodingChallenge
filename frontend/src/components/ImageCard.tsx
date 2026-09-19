import { BookmarkBorder } from '@mui/icons-material'
import { Box, IconButton, Tooltip, Typography } from '@mui/material'
import type { SearchHit } from '../api'

type Props = {
  image: SearchHit
  onSave: (image: SearchHit) => void
}

export default function ImageCard({ image, onSave }: Props) {
  return (
    <Box
      sx={{
        position: 'relative',
        breakInside: 'avoid',
        mb: 2,
        borderRadius: 2.5,
        overflow: 'hidden',
        bgcolor: 'rgba(28,35,38,0.06)',
        transition: 'transform 220ms ease, box-shadow 220ms ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 18px 40px rgba(28,35,38,0.14)',
          '& .save-btn': { opacity: 1, transform: 'translateY(0)' },
          '& img': { transform: 'scale(1.03)' },
        },
      }}
    >
      <Box
        component="img"
        src={image.previewUrl}
        alt={image.title}
        loading="lazy"
        sx={{
          display: 'block',
          width: '100%',
          transition: 'transform 320ms ease',
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, transparent 45%, rgba(20,24,26,0.72) 100%)',
          opacity: 0.95,
          pointerEvents: 'none',
        }}
      />

      <Tooltip title="Save to board">
        <IconButton
          className="save-btn"
          onClick={() => onSave(image)}
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            opacity: { xs: 1, md: 0 },
            transform: { xs: 'none', md: 'translateY(-6px)' },
            transition: 'opacity 200ms ease, transform 200ms ease, background-color 200ms',
            '&:hover': { bgcolor: 'primary.dark' },
          }}
        >
          <BookmarkBorder />
        </IconButton>
      </Tooltip>

      <Box sx={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}>
        <Typography variant="subtitle2" sx={{ color: '#FFF8F3', fontWeight: 600 }}>
          {image.title}
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,248,243,0.78)' }}>
          {image.photographer ? `by ${image.photographer}` : image.tags}
        </Typography>
      </Box>
    </Box>
  )
}
