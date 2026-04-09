// backend/middleware/cache.js
const NodeCache = require('node-cache');

const searchCache = new NodeCache({ stdTTL: parseInt(process.env.CACHE_TTL_SEARCH) || 300 });
const citiesCache = new NodeCache({ stdTTL: parseInt(process.env.CACHE_TTL_CITIES) || 86400 });

function cacheMiddleware(cacheInstance) {
  return (req, res, next) => {
    const key = req.originalUrl;
    const cached = cacheInstance.get(key);
    if (cached) {
      return res.json({ ...cached, fromCache: true });
    }
    // Patch res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      if (res.statusCode === 200) cacheInstance.set(key, data);
      return originalJson(data);
    };
    next();
  };
}

module.exports = {
  cacheSearch: cacheMiddleware(searchCache),
  cacheCities: cacheMiddleware(citiesCache),
};
