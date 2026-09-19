const express = require('express');
const { nanoid } = require('nanoid');
const { queryAll, queryOne, run } = require('../db/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function iso(value) {
  if (!value) return value;
  return value instanceof Date ? value.toISOString() : value;
}

function mapUserBrief(row) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
  };
}

/** GET /api/friends — accepted friends */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = await queryAll(
      `SELECT u.id, u.username, u.email, fr.id AS request_id, fr.created_at
       FROM friend_requests fr
       JOIN users u ON u.id = CASE
         WHEN fr.from_user_id = ? THEN fr.to_user_id
         ELSE fr.from_user_id
       END
       WHERE fr.status = 'accepted'
         AND (fr.from_user_id = ? OR fr.to_user_id = ?)
       ORDER BY u.username ASC`,
      [req.user.id, req.user.id, req.user.id]
    );

    res.json(
      rows.map((row) => ({
        id: row.id,
        username: row.username,
        email: row.email,
        requestId: row.request_id,
        friendsSince: iso(row.created_at),
      }))
    );
  })
);

/** GET /api/friends/requests — incoming pending */
router.get(
  '/requests',
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = await queryAll(
      `SELECT fr.id, fr.created_at, u.id AS user_id, u.username, u.email
       FROM friend_requests fr
       JOIN users u ON u.id = fr.from_user_id
       WHERE fr.to_user_id = ? AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
      [req.user.id]
    );

    res.json(
      rows.map((row) => ({
        id: row.id,
        createdAt: iso(row.created_at),
        from: { id: row.user_id, username: row.username, email: row.email },
      }))
    );
  })
);

/** GET /api/friends/requests/outgoing — sent pending */
router.get(
  '/requests/outgoing',
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = await queryAll(
      `SELECT fr.id, fr.created_at, u.id AS user_id, u.username, u.email
       FROM friend_requests fr
       JOIN users u ON u.id = fr.to_user_id
       WHERE fr.from_user_id = ? AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
      [req.user.id]
    );

    res.json(
      rows.map((row) => ({
        id: row.id,
        createdAt: iso(row.created_at),
        to: { id: row.user_id, username: row.username, email: row.email },
      }))
    );
  })
);

/** GET /api/friends/search?q= — find users to add */
router.get(
  '/search',
  requireAuth,
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '')
      .trim()
      .toLowerCase();
    if (!q || q.length < 1) {
      throw createError(400, 'Search query "q" is required');
    }

    const rows = await queryAll(
      `SELECT id, username, email FROM users
       WHERE username LIKE ? AND id <> ?
       ORDER BY username ASC
       LIMIT 20`,
      [`%${q}%`, req.user.id]
    );

    const results = [];
    for (const row of rows) {
      const friendship = await queryOne(
        `SELECT id, status, from_user_id, to_user_id FROM friend_requests
         WHERE (from_user_id = ? AND to_user_id = ?)
            OR (from_user_id = ? AND to_user_id = ?)
         ORDER BY created_at DESC
         LIMIT 1`,
        [req.user.id, row.id, row.id, req.user.id]
      );

      let relationship = 'none';
      if (friendship?.status === 'accepted') relationship = 'friends';
      else if (friendship?.status === 'pending') {
        relationship =
          friendship.from_user_id === req.user.id ? 'outgoing' : 'incoming';
      }

      results.push({
        ...mapUserBrief(row),
        relationship,
        requestId: friendship?.id || null,
      });
    }

    res.json(results);
  })
);

/** POST /api/friends/request — send friend request by username */
router.post(
  '/request',
  requireAuth,
  asyncHandler(async (req, res) => {
    const username = String(req.body.username || '')
      .trim()
      .toLowerCase();
    if (!username) throw createError(400, 'Username is required');

    const target = await queryOne(`SELECT * FROM users WHERE username = ?`, [username]);
    if (!target) throw createError(404, `No user found with username "${username}"`);
    if (target.id === req.user.id) {
      throw createError(400, 'You cannot add yourself as a friend');
    }

    const existing = await queryOne(
      `SELECT * FROM friend_requests
       WHERE (from_user_id = ? AND to_user_id = ?)
          OR (from_user_id = ? AND to_user_id = ?)
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.user.id, target.id, target.id, req.user.id]
    );

    if (existing?.status === 'accepted') {
      throw createError(409, 'You are already friends');
    }
    if (existing?.status === 'pending') {
      if (existing.from_user_id === req.user.id) {
        throw createError(409, 'Friend request already sent');
      }
      // They already sent you a request — auto-accept
      await run(`UPDATE friend_requests SET status = 'accepted' WHERE id = ?`, [
        existing.id,
      ]);
      return res.json({
        id: existing.id,
        status: 'accepted',
        message: `You are now friends with @${target.username}`,
        user: mapUserBrief(target),
      });
    }

    // If previously rejected, allow a new request by updating or inserting
    if (existing?.status === 'rejected') {
      await run(
        `UPDATE friend_requests
         SET from_user_id = ?, to_user_id = ?, status = 'pending', created_at = ?
         WHERE id = ?`,
        [req.user.id, target.id, new Date().toISOString(), existing.id]
      );
      return res.status(201).json({
        id: existing.id,
        status: 'pending',
        message: `Friend request sent to @${target.username}`,
        user: mapUserBrief(target),
      });
    }

    const id = nanoid(12);
    const now = new Date().toISOString();
    await run(
      `INSERT INTO friend_requests (id, from_user_id, to_user_id, status, created_at)
       VALUES (?, ?, ?, 'pending', ?)`,
      [id, req.user.id, target.id, now]
    );

    res.status(201).json({
      id,
      status: 'pending',
      message: `Friend request sent to @${target.username}`,
      user: mapUserBrief(target),
    });
  })
);

/** POST /api/friends/requests/:id/accept */
router.post(
  '/requests/:id/accept',
  requireAuth,
  asyncHandler(async (req, res) => {
    const row = await queryOne(`SELECT * FROM friend_requests WHERE id = ?`, [
      req.params.id,
    ]);
    if (!row) throw createError(404, 'Friend request not found');
    if (row.to_user_id !== req.user.id) {
      throw createError(403, 'Only the recipient can accept this request');
    }
    if (row.status !== 'pending') {
      throw createError(400, 'This request is no longer pending');
    }

    await run(`UPDATE friend_requests SET status = 'accepted' WHERE id = ?`, [row.id]);
    const fromUser = await queryOne(`SELECT id, username, email FROM users WHERE id = ?`, [
      row.from_user_id,
    ]);

    res.json({
      id: row.id,
      status: 'accepted',
      message: `You are now friends with @${fromUser.username}`,
      user: mapUserBrief(fromUser),
    });
  })
);

/** POST /api/friends/requests/:id/reject */
router.post(
  '/requests/:id/reject',
  requireAuth,
  asyncHandler(async (req, res) => {
    const row = await queryOne(`SELECT * FROM friend_requests WHERE id = ?`, [
      req.params.id,
    ]);
    if (!row) throw createError(404, 'Friend request not found');
    if (row.to_user_id !== req.user.id) {
      throw createError(403, 'Only the recipient can reject this request');
    }
    if (row.status !== 'pending') {
      throw createError(400, 'This request is no longer pending');
    }

    await run(`UPDATE friend_requests SET status = 'rejected' WHERE id = ?`, [row.id]);
    res.json({ id: row.id, status: 'rejected' });
  })
);

/** DELETE /api/friends/requests/:id — cancel outgoing pending request */
router.delete(
  '/requests/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const row = await queryOne(`SELECT * FROM friend_requests WHERE id = ?`, [
      req.params.id,
    ]);
    if (!row) throw createError(404, 'Friend request not found');
    if (row.from_user_id !== req.user.id) {
      throw createError(403, 'Only the sender can cancel this request');
    }
    if (row.status !== 'pending') {
      throw createError(400, 'Only pending requests can be cancelled');
    }

    await run(`DELETE FROM friend_requests WHERE id = ?`, [row.id]);
    res.status(204).send();
  })
);

/** DELETE /api/friends/:userId — unfriend */
router.delete(
  '/:userId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const row = await queryOne(
      `SELECT * FROM friend_requests
       WHERE status = 'accepted'
         AND ((from_user_id = ? AND to_user_id = ?)
           OR (from_user_id = ? AND to_user_id = ?))`,
      [req.user.id, req.params.userId, req.params.userId, req.user.id]
    );
    if (!row) throw createError(404, 'Friendship not found');

    await run(`DELETE FROM friend_requests WHERE id = ?`, [row.id]);
    res.status(204).send();
  })
);

module.exports = router;
