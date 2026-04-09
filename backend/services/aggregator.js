// backend/services/aggregator.js
// Merges results from RedBus and AbhiBus into a single sorted, deduplicated list

const redbusService  = require('./redbus');
const abhiBusService = require('./abhibus');

/**
 * Search both APIs in parallel, merge results, and apply scoring
 */
async function searchAll({ fromCityId, toCityId, date, passengers = 1, filters = {} }) {
  const [redbusResults, abhiBusResults] = await Promise.allSettled([
    redbusService.searchBuses({ fromCityId, toCityId, date, passengers }),
    abhiBusService.searchBuses({ fromCityId, toCityId, date, passengers }),
  ]);

  const allResults = [
    ...(redbusResults.status  === 'fulfilled' ? redbusResults.value  : []),
    ...(abhiBusResults.status === 'fulfilled' ? abhiBusResults.value : []),
  ];

  if (allResults.length === 0) return { results: [], total: 0, sources: [] };

  // Apply filters
  let filtered = applyFilters(allResults, filters);

  // Score & sort
  filtered = scoreAndSort(filtered, filters.sortBy || 'best');

  // Flag best value (top scored with good rating)
  if (filtered.length > 0) {
    filtered[0].bestValue = true;
  }

  // Flag cheapest separately
  const cheapestIdx = filtered.reduce((minIdx, r, idx, arr) =>
    r.pricing.fare < arr[minIdx].pricing.fare ? idx : minIdx, 0);
  if (cheapestIdx !== 0) filtered[cheapestIdx].cheapest = true;

  // Fastest
  const fastestIdx = filtered.reduce((minIdx, r, idx, arr) =>
    r.duration < arr[minIdx].duration ? idx : minIdx, 0);
  if (fastestIdx !== 0 && fastestIdx !== cheapestIdx) filtered[fastestIdx].fastest = true;

  const sources = [...new Set(allResults.map(r => r.source))];

  return {
    results:       filtered,
    total:         filtered.length,
    totalUnfiltered: allResults.length,
    sources,
    priceRange: {
      min: Math.min(...filtered.map(r => r.pricing.fare)),
      max: Math.max(...filtered.map(r => r.pricing.fare)),
    },
    durationRange: {
      min: Math.min(...filtered.map(r => r.duration)),
      max: Math.max(...filtered.map(r => r.duration)),
    },
  };
}

function applyFilters(results, filters) {
  let out = [...results];

  if (filters.maxPrice) {
    out = out.filter(r => r.pricing.fare <= filters.maxPrice);
  }
  if (filters.minPrice) {
    out = out.filter(r => r.pricing.fare >= filters.minPrice);
  }
  if (filters.busTypes && filters.busTypes.length > 0) {
    out = out.filter(r => filters.busTypes.some(t => r.bus.code.includes(t)));
  }
  if (filters.operators && filters.operators.length > 0) {
    out = out.filter(r => filters.operators.includes(r.operator.id));
  }
  if (filters.amenities && filters.amenities.length > 0) {
    out = out.filter(r => filters.amenities.every(a => r.bus.amenities.includes(a)));
  }
  if (filters.departureTimes && filters.departureTimes.length > 0) {
    out = out.filter(r => {
      const hour = parseInt(r.departure.time.split(':')[0]);
      return filters.departureTimes.some(range => {
        if (range === 'early')   return hour >= 0  && hour < 6;
        if (range === 'morning') return hour >= 6  && hour < 12;
        if (range === 'afternoon') return hour >= 12 && hour < 18;
        if (range === 'evening') return hour >= 18 && hour <= 23;
        return true;
      });
    });
  }
  if (filters.sources && filters.sources.length > 0) {
    out = out.filter(r => filters.sources.includes(r.source));
  }
  if (filters.seatsRequired) {
    out = out.filter(r => r.seats.available >= filters.seatsRequired);
  }

  return out;
}

function scoreAndSort(results, sortBy) {
  const sorted = [...results];

  switch (sortBy) {
    case 'price':
      return sorted.sort((a, b) => a.pricing.fare - b.pricing.fare);

    case 'duration':
      return sorted.sort((a, b) => a.duration - b.duration);

    case 'departure':
      return sorted.sort((a, b) => a.departure.time.localeCompare(b.departure.time));

    case 'rating':
      return sorted.sort((a, b) => b.operator.rating - a.operator.rating);

    case 'best':
    default:
      // Composite: weighted score of price, rating, duration
      return sorted
        .map(r => {
          const priceScore    = 1 / (r.pricing.fare + 1);     // lower price = higher score
          const ratingScore   = r.operator.rating / 5;         // 0–1
          const durationScore = 1 / (r.duration + 1);          // shorter = higher
          const score = priceScore * 0.4 + ratingScore * 0.35 + durationScore * 0.25;
          return { ...r, _score: score };
        })
        .sort((a, b) => b._score - a._score)
        .map(({ _score, ...r }) => r);
  }
}

/**
 * Get seat layout from the correct provider
 */
async function getSeatLayout({ tripId, fromCityId, toCityId, date }) {
  const provider = tripId.startsWith('redbus') ? redbusService : abhiBusService;
  return provider.getSeatLayout({ tripId, fromCityId, toCityId, date });
}

/**
 * Get merged city list (deduplicated)
 */
async function getCities() {
  const [rb, ab] = await Promise.allSettled([
    redbusService.getCities(),
    abhiBusService.getCities(),
  ]);

  const combined = [
    ...(rb.status === 'fulfilled' ? rb.value : []),
    ...(ab.status === 'fulfilled' ? ab.value : []),
  ];

  // Deduplicate by name
  const seen = new Set();
  return combined.filter(c => {
    const key = c.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = { searchAll, getSeatLayout, getCities };
