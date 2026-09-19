const jwt = require('jsonwebtoken');
const { queryOne } = require('../db/database');
const { createError } = require('./errorHandler');

const JWT_SECRET = process.env.JWT_SECRET || 'oneplace-dev-secret-change-me';
const JWT_EXPIRES_IN = '7d';

function signToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : row.created_at,
  };
}

async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const row = await queryOne(`SELECT * FROM users WHERE id = ?`, [payload.sub]);
    req.user = mapUser(row);
  } catch {
    req.user = null;
  }
  next();
}

async function requireAuth(req, res, next) {
  await optionalAuth(req, res, () => {
    if (!req.user) {
      return next(createError(401, 'Login required'));
    }
    next();
  });
}

async function userCanAccessCollection(userId, collection) {
  if (!collection || !userId) return false;
  if (collection.owner_id === userId) return true;
  const collab = await queryOne(
    `SELECT id FROM collaborators WHERE collection_id = ? AND user_id = ?`,
    [collection.id, userId]
  );
  return Boolean(collab);
}

function userIsOwner(userId, collection) {
  return Boolean(userId && collection && collection.owner_id === userId);
}

module.exports = {
  signToken,
  mapUser,
  optionalAuth,
  requireAuth,
  userCanAccessCollection,
  userIsOwner,
  JWT_SECRET,
};
