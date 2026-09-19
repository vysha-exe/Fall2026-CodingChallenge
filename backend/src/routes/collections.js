const express = require('express');
const { nanoid } = require('nanoid');
const { queryAll, queryOne, run } = require('../db/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const {
  requireAuth,
  userCanAccessCollection,
  userIsOwner,
} = require('../middleware/auth');

const router = express.Router();

function iso(value) {
  if (!value) return value;
  return value instanceof Date ? value.toISOString() : value;
}

async function mapCollection(row, includeImages = false, extras = {}) {
  if (!row) return null;

  const owner = row.owner_id
    ? await queryOne(`SELECT id, username FROM users WHERE id = ?`, [row.owner_id])
    : null;

  const collection = {
    id: row.id,
    name: row.name,
    description: row.description || '',
    isPublic: Boolean(row.is_public),
    shareToken: row.share_token || null,
    shareUrl: row.share_token ? `/share/${row.share_token}` : null,
    ownerId: row.owner_id || null,
    ownerUsername: owner ? owner.username : null,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    ...extras,
  };

  if (includeImages) {
    const images = await queryAll(
      `SELECT * FROM images WHERE collection_id = ? ORDER BY created_at DESC`,
      [row.id]
    );
    collection.images = images.map(mapImage);

    collection.collaborators = (
      await queryAll(
        `SELECT c.id, c.role, c.created_at AS "createdAt", u.id AS "userId", u.username
         FROM collaborators c
         JOIN users u ON u.id = c.user_id
         WHERE c.collection_id = ?
         ORDER BY c.created_at ASC`,
        [row.id]
      )
    ).map((c) => ({
      ...c,
      createdAt: iso(c.createdAt),
    }));
  } else {
    const countRow = await queryOne(
      `SELECT COUNT(*)::int AS count FROM images WHERE collection_id = ?`,
      [row.id]
    );
    collection.imageCount = countRow ? countRow.count : 0;
  }

  return collection;
}

function mapImage(row) {
  return {
    id: row.id,
    collectionId: row.collection_id,
    pixabayId: row.pixabay_id,
    url: row.url,
    previewUrl: row.preview_url,
    title: row.title || '',
    tags: row.tags || '',
    photographer: row.photographer || '',
    pageUrl: row.page_url || '',
    note: row.note || '',
    createdAt: iso(row.created_at),
  };
}

async function touchCollection(collectionId) {
  await run(`UPDATE collections SET updated_at = ? WHERE id = ?`, [
    new Date().toISOString(),
    collectionId,
  ]);
}

async function getAccessibleCollection(req) {
  const row = await queryOne(`SELECT * FROM collections WHERE id = ?`, [req.params.id]);
  if (!row) throw createError(404, 'Collection not found');
  if (!(await userCanAccessCollection(req.user?.id, row))) {
    throw createError(403, 'You do not have access to this board');
  }
  return row;
}

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = await queryAll(
      `SELECT DISTINCT c.*
       FROM collections c
       LEFT JOIN collaborators col ON col.collection_id = c.id
       WHERE c.owner_id = ? OR col.user_id = ?
       ORDER BY c.updated_at DESC`,
      [req.user.id, req.user.id]
    );

    const mapped = await Promise.all(
      rows.map((row) =>
        mapCollection(row, false, {
          role: row.owner_id === req.user.id ? 'owner' : 'collaborator',
        })
      )
    );
    res.json(mapped);
  })
);

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { name, description = '', isPublic = false } = req.body || {};
    if (!name || !String(name).trim()) {
      throw createError(400, 'Collection name is required');
    }

    const now = new Date().toISOString();
    const id = nanoid(12);

    await run(
      `INSERT INTO collections
        (id, name, description, is_public, share_token, owner_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, ?, ?, ?)`,
      [
        id,
        String(name).trim(),
        String(description).trim(),
        Boolean(isPublic),
        req.user.id,
        now,
        now,
      ]
    );

    const created = await queryOne(`SELECT * FROM collections WHERE id = ?`, [id]);
    res.status(201).json(
      await mapCollection(created, true, { role: 'owner', canEdit: true })
    );
  })
);

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const row = await getAccessibleCollection(req);
    res.json(
      await mapCollection(row, true, {
        role: userIsOwner(req.user.id, row) ? 'owner' : 'collaborator',
        canEdit: true,
      })
    );
  })
);

router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const row = await getAccessibleCollection(req);

    const name = req.body.name !== undefined ? String(req.body.name).trim() : row.name;
    const description =
      req.body.description !== undefined
        ? String(req.body.description).trim()
        : row.description;
    const isPublic =
      req.body.isPublic !== undefined ? Boolean(req.body.isPublic) : row.is_public;

    if (!name) throw createError(400, 'Collection name cannot be empty');

    const now = new Date().toISOString();
    await run(
      `UPDATE collections SET name = ?, description = ?, is_public = ?, updated_at = ? WHERE id = ?`,
      [name, description, isPublic, now, req.params.id]
    );

    const updated = await queryOne(`SELECT * FROM collections WHERE id = ?`, [req.params.id]);
    res.json(
      await mapCollection(updated, true, {
        role: userIsOwner(req.user.id, updated) ? 'owner' : 'collaborator',
        canEdit: true,
      })
    );
  })
);

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const row = await queryOne(`SELECT * FROM collections WHERE id = ?`, [req.params.id]);
    if (!row) throw createError(404, 'Collection not found');
    if (!userIsOwner(req.user.id, row)) {
      throw createError(403, 'Only the board owner can delete it');
    }

    await run(`DELETE FROM collaborators WHERE collection_id = ?`, [req.params.id]);
    await run(`DELETE FROM images WHERE collection_id = ?`, [req.params.id]);
    await run(`DELETE FROM collections WHERE id = ?`, [req.params.id]);
    res.status(204).send();
  })
);

router.post(
  '/:id/images',
  requireAuth,
  asyncHandler(async (req, res) => {
    await getAccessibleCollection(req);

    const {
      url,
      previewUrl = '',
      title = '',
      tags = '',
      photographer = '',
      pageUrl = '',
      pixabayId = null,
      note = '',
    } = req.body || {};

    if (!url) throw createError(400, 'Image url is required');

    const id = nanoid(12);
    const now = new Date().toISOString();

    await run(
      `INSERT INTO images
        (id, collection_id, pixabay_id, url, preview_url, title, tags, photographer, page_url, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.params.id,
        pixabayId,
        url,
        previewUrl,
        title,
        tags,
        photographer,
        pageUrl,
        note,
        now,
      ]
    );

    await touchCollection(req.params.id);
    res
      .status(201)
      .json(mapImage(await queryOne(`SELECT * FROM images WHERE id = ?`, [id])));
  })
);

router.patch(
  '/:id/images/:imageId',
  requireAuth,
  asyncHandler(async (req, res) => {
    await getAccessibleCollection(req);

    const image = await queryOne(
      `SELECT * FROM images WHERE id = ? AND collection_id = ?`,
      [req.params.imageId, req.params.id]
    );
    if (!image) throw createError(404, 'Image not found in this collection');

    const title = req.body.title !== undefined ? String(req.body.title) : image.title;
    const note = req.body.note !== undefined ? String(req.body.note) : image.note;

    await run(`UPDATE images SET title = ?, note = ? WHERE id = ?`, [
      title,
      note,
      req.params.imageId,
    ]);
    await touchCollection(req.params.id);

    res.json(mapImage(await queryOne(`SELECT * FROM images WHERE id = ?`, [req.params.imageId])));
  })
);

router.delete(
  '/:id/images/:imageId',
  requireAuth,
  asyncHandler(async (req, res) => {
    await getAccessibleCollection(req);

    const image = await queryOne(
      `SELECT * FROM images WHERE id = ? AND collection_id = ?`,
      [req.params.imageId, req.params.id]
    );
    if (!image) throw createError(404, 'Image not found in this collection');

    await run(`DELETE FROM images WHERE id = ?`, [req.params.imageId]);
    await touchCollection(req.params.id);
    res.status(204).send();
  })
);

router.post(
  '/:id/share',
  requireAuth,
  asyncHandler(async (req, res) => {
    await getAccessibleCollection(req);

    const token = nanoid(16);
    const now = new Date().toISOString();
    await run(
      `UPDATE collections SET share_token = ?, is_public = TRUE, updated_at = ? WHERE id = ?`,
      [token, now, req.params.id]
    );

    const updated = await queryOne(`SELECT * FROM collections WHERE id = ?`, [req.params.id]);
    res.json({
      shareToken: token,
      shareUrl: `/share/${token}`,
      collection: await mapCollection(updated, true, {
        role: userIsOwner(req.user.id, updated) ? 'owner' : 'collaborator',
        canEdit: true,
      }),
    });
  })
);

router.post(
  '/:id/collaborators',
  requireAuth,
  asyncHandler(async (req, res) => {
    const row = await queryOne(`SELECT * FROM collections WHERE id = ?`, [req.params.id]);
    if (!row) throw createError(404, 'Collection not found');
    if (!userIsOwner(req.user.id, row)) {
      throw createError(403, 'Only the owner can invite collaborators');
    }

    const username = String(req.body.username || '').trim().toLowerCase();
    if (!username) throw createError(400, 'Username is required');

    const invitee = await queryOne(`SELECT * FROM users WHERE username = ?`, [username]);
    if (!invitee) throw createError(404, `No user found with username "${username}"`);
    if (invitee.id === req.user.id) {
      throw createError(400, 'You already own this board');
    }

    const existing = await queryOne(
      `SELECT id FROM collaborators WHERE collection_id = ? AND user_id = ?`,
      [row.id, invitee.id]
    );
    if (existing) throw createError(409, 'User is already a collaborator');

    const id = nanoid(12);
    const now = new Date().toISOString();
    await run(
      `INSERT INTO collaborators (id, collection_id, user_id, role, created_at)
       VALUES (?, ?, ?, 'editor', ?)`,
      [id, row.id, invitee.id, now]
    );
    await touchCollection(row.id);

    res.status(201).json({
      id,
      userId: invitee.id,
      username: invitee.username,
      role: 'editor',
      createdAt: now,
    });
  })
);

router.delete(
  '/:id/collaborators/:userId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const row = await queryOne(`SELECT * FROM collections WHERE id = ?`, [req.params.id]);
    if (!row) throw createError(404, 'Collection not found');
    if (!userIsOwner(req.user.id, row)) {
      throw createError(403, 'Only the owner can remove collaborators');
    }

    await run(`DELETE FROM collaborators WHERE collection_id = ? AND user_id = ?`, [
      req.params.id,
      req.params.userId,
    ]);
    await touchCollection(req.params.id);
    res.status(204).send();
  })
);

module.exports = router;
