// backend/routes/search.js
const express  = require('express');
const router   = express.Router();
const aggregator = require('../services/aggregator');
const { cacheSearch } = require('../middleware/cache');
const { searchLimiter } = require('../middleware/rateLimit');

/**
 * GET /api/search
 * Query params: from, to, date, passengers, sortBy, maxPrice, busTypes, operators, amenities, departureTimes
 */
router.get('/', searchLimiter, cacheSearch, async (req, res) => {
  const { from, to, date, passengers = 1, sortBy, maxPrice, minPrice,
          busTypes, operators, amenities, departureTimes, sources } = req.query;

  if (!from || !to || !date) {
    return res.status(400).json({ error: 'from, to, and date are required' });
  }

  // Validate date format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });
  }

  const filters = {
    sortBy,
    maxPrice:       maxPrice ? parseInt(maxPrice) : null,
    minPrice:       minPrice ? parseInt(minPrice) : null,
    busTypes:       busTypes ? busTypes.split(',') : [],
    operators:      operators ? operators.split(',') : [],
    amenities:      amenities ? amenities.split(',') : [],
    departureTimes: departureTimes ? departureTimes.split(',') : [],
    sources:        sources ? sources.split(',') : [],
    seatsRequired:  parseInt(passengers),
  };

  try {
    const data = await aggregator.searchAll({
      fromCityId: from,
      toCityId:   to,
      date,
      passengers: parseInt(passengers),
      filters,
    });

    res.json({
      success: true,
      query: { from, to, date, passengers: parseInt(passengers) },
      ...data,
    });
  } catch (err) {
    console.error('[Search Route] Error:', err.message);
    res.status(500).json({ error: 'Search failed. Please try again.' });
  }
});

/**
 * GET /api/search/seats
 * Get seat layout for a specific trip
 */
router.get('/seats', async (req, res) => {
  const { tripId, from, to, date } = req.query;
  if (!tripId || !from || !to || !date) {
    return res.status(400).json({ error: 'tripId, from, to, date required' });
  }

  try {
    const layout = await aggregator.getSeatLayout({
      tripId, fromCityId: from, toCityId: to, date,
    });
    res.json({ success: true, layout });
  } catch (err) {
    console.error('[Seats Route] Error:', err.message);
    res.status(500).json({ error: 'Failed to load seat layout.' });
  }
});

module.exports = router;
