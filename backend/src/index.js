require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./db/database');
const { errorHandler } = require('./middleware/errorHandler');
const { optionalAuth } = require('./middleware/auth');
const authRouter = require('./routes/auth');
const collectionsRouter = require('./routes/collections');
const shareRouter = require('./routes/share');
const searchRouter = require('./routes/search');
const friendsRouter = require('./routes/friends');

const PORT = process.env.PORT || 3001;

async function start() {
  await initDatabase();

  const app = express();

  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          return callback(null, true);
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
    })
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(optionalAuth);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'oneplace-api' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/collections', collectionsRouter);
  app.use('/api/share', shareRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/friends', friendsRouter);

  app.use(errorHandler);

  app.listen(PORT, () => {
    console.log(`One Place API running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err.message || err);
  process.exit(1);
});
