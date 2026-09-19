const express = require('express');
const { asyncHandler, createError } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * GET /api/search?q=mountains&page=1
 * Proxies Pixabay so the API key stays on the server.
 *
 * Pixabay docs: https://pixabay.com/api/docs/
 * Free key: sign up at Pixabay → API → copy your key into backend/.env
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const apiKey = process.env.PIXABAY_API_KEY;
    if (!apiKey || apiKey === 'your_pixabay_api_key_here') {
      throw createError(
        500,
        'Pixabay API key missing. Add PIXABAY_API_KEY to backend/.env — see README.txt'
      );
    }

    const q = (req.query.q || '').toString().trim();
    if (!q) throw createError(400, 'Query parameter "q" is required');

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const perPage = Math.min(40, Math.max(3, parseInt(req.query.per_page, 10) || 24));

    const params = new URLSearchParams({
      key: apiKey,
      q,
      image_type: 'photo',
      safesearch: 'true',
      page: String(page),
      per_page: String(perPage),
    });

    const response = await fetch(`https://pixabay.com/api/?${params.toString()}`);
    if (!response.ok) {
      throw createError(502, `Pixabay request failed (${response.status})`);
    }

    const data = await response.json();
    const hits = (data.hits || []).map((hit) => ({
      pixabayId: hit.id,
      url: hit.largeImageURL || hit.webformatURL,
      previewUrl: hit.webformatURL || hit.previewURL,
      title: hit.tags ? hit.tags.split(',')[0].trim() : 'Untitled',
      tags: hit.tags || '',
      photographer: hit.user || '',
      pageUrl: hit.pageURL || '',
      width: hit.imageWidth,
      height: hit.imageHeight,
    }));

    res.json({
      total: data.totalHits || 0,
      page,
      perPage,
      results: hits,
    });
  })
);

module.exports = router;
