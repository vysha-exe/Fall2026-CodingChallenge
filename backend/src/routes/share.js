const express = require('express');
const { queryOne, queryAll, run } = require('../db/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { nanoid } = require('nanoid');

const router = express.Router();

function iso(value) {
  if (!value) return value;
  return value instanceof Date ? value.toISOString() : value;
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

router.get(
  '/:token',
  asyncHandler(async (req, res) => {
    const row = await queryOne(`SELECT * FROM collections WHERE share_token = ?`, [
      req.params.token,
    ]);
    if (!row) throw createError(404, 'Shared collection not found');

    const images = (
      await queryAll(
        `SELECT * FROM images WHERE collection_id = ? ORDER BY created_at DESC`,
        [row.id]
      )
    ).map(mapImage);

    res.json({
      id: row.id,
      name: row.name,
      description: row.description || '',
      isPublic: Boolean(row.is_public),
      shareToken: row.share_token,
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
      images,
      collaborative: true,
    });
  })
);

router.post(
  '/:token/images',
  asyncHandler(async (req, res) => {
    const collection = await queryOne(`SELECT * FROM collections WHERE share_token = ?`, [
      req.params.token,
    ]);
    if (!collection) throw createError(404, 'Shared collection not found');

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
        collection.id,
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

    await run(`UPDATE collections SET updated_at = ? WHERE id = ?`, [now, collection.id]);
    res
      .status(201)
      .json(mapImage(await queryOne(`SELECT * FROM images WHERE id = ?`, [id])));
  })
);

module.exports = router;
