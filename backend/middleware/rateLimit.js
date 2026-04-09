// backend/middleware/rateLimit.js
const rateLimit = require('express-rate-limit');

const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { error: 'Too many search requests. Please wait a moment.' },
});

const bookingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many booking attempts. Please wait.' },
});

module.exports = { searchLimiter, bookingLimiter };
