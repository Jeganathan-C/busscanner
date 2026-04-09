// backend/middleware/auth.js
// Optional internal API key protection for your own backend endpoints.
// Set INTERNAL_API_KEY in .env to require it on all /api/* routes.

const INTERNAL_KEY = process.env.INTERNAL_API_KEY;

function authMiddleware(req, res, next) {
  // If no internal key is configured, skip auth (open access)
  if (!INTERNAL_KEY) return next();

  const provided = req.headers['x-api-key'] || req.query.apiKey;
  if (!provided || provided !== INTERNAL_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key.' });
  }
  next();
}

module.exports = authMiddleware;
