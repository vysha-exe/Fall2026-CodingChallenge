const express = require('express');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');
const { queryOne, run } = require('../db/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { signToken, mapUser, requireAuth } = require('../middleware/auth');

const router = express.Router();

function validateCredentials({ username, email, password }, { requireEmail = true } = {}) {
  if (!username || !String(username).trim()) {
    throw createError(400, 'Username is required');
  }
  if (requireEmail && (!email || !String(email).trim())) {
    throw createError(400, 'Email is required');
  }
  if (!password || String(password).length < 6) {
    throw createError(400, 'Password must be at least 6 characters');
  }
}

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const username = String(req.body.username || '').trim().toLowerCase();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    validateCredentials({ username, email, password });

    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      throw createError(
        400,
        'Username must be 3–24 characters (letters, numbers, underscore)'
      );
    }

    const existingUser = await queryOne(
      `SELECT id FROM users WHERE username = ? OR email = ?`,
      [username, email]
    );
    if (existingUser) {
      throw createError(409, 'Username or email already in use');
    }

    const id = nanoid(12);
    const now = new Date().toISOString();
    const passwordHash = await bcrypt.hash(password, 10);

    await run(
      `INSERT INTO users (id, username, email, password_hash, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, username, email, passwordHash, now]
    );

    const user = mapUser(await queryOne(`SELECT * FROM users WHERE id = ?`, [id]));
    res.status(201).json({ user, token: signToken(user) });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const login = String(req.body.login || req.body.username || req.body.email || '')
      .trim()
      .toLowerCase();
    const password = String(req.body.password || '');

    if (!login || !password) {
      throw createError(400, 'Login and password are required');
    }

    const row = await queryOne(
      `SELECT * FROM users WHERE username = ? OR email = ?`,
      [login, login]
    );
    if (!row) throw createError(401, 'Invalid credentials');

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) throw createError(401, 'Invalid credentials');

    const user = mapUser(row);
    res.json({ user, token: signToken(user) });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
);

module.exports = router;
