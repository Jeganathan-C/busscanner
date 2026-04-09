// backend/routes/cities.js
const express    = require('express');
const router     = express.Router();
const aggregator = require('../services/aggregator');
const { cacheCities } = require('../middleware/cache');

/**
 * GET /api/cities
 * Returns merged city list from both providers
 */
router.get('/', cacheCities, async (req, res) => {
  try {
    const cities = await aggregator.getCities();
    res.json({ success: true, cities });
  } catch (err) {
    console.error('[Cities] Error:', err.message);
    res.status(500).json({ error: 'Failed to load cities' });
  }
});

/**
 * GET /api/cities/search?q=chen
 * Autocomplete city search
 */
router.get('/search', async (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  if (q.length < 2) return res.json({ cities: [] });

  try {
    const all = await aggregator.getCities();
    const filtered = all.filter(c => c.name.toLowerCase().startsWith(q)).slice(0, 10);
    res.json({ cities: filtered });
  } catch (err) {
    res.status(500).json({ error: 'City search failed' });
  }
});

module.exports = router;
