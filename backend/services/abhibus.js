// backend/services/abhibus.js
// AbhiBus API integration
// Access: email techsupport@abhibus.com or api@abhibus.com

const axios = require('axios');
const config = require('../config/apis').abhibus;
const { generateSearchResults, generateSeatLayout } = require('./mockData');

const DEMO_MODE = process.env.DEMO_MODE === 'true' || !config.apiKey;

// AbhiBus uses HTTP Basic Auth + custom API key header
const client = axios.create({
  baseURL: config.baseURL,
  timeout: config.timeout,
  auth: {
    username: config.username,
    password: config.password,
  },
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Api-Key': config.apiKey,
  },
});

// ─── Normalizer ──────────────────────────────────────────────────────────────
// Transforms AbhiBus response shape → our unified shape
function normalizeAbhiBusService(svc) {
  const durationMinutes = svc.duration
    ? parseInt(svc.duration.split('h')[0]) * 60 + parseInt((svc.duration.split('h')[1] || '0m').replace('m','').trim())
    : 300;

  return {
    id:       `abhibus_${svc.serviceId}`,
    source:   'abhibus',
    operator: {
      id:      `ab_${svc.operatorId || svc.serviceId}`,
      name:    svc.operatorName,
      rating:  svc.rating ? parseFloat(svc.rating) : 0,
      reviews: svc.reviewCount || 0,
    },
    bus: {
      type:      svc.busType,
      code:      svc.busType.toLowerCase().includes('sleeper') ? 'SL' : 'ST',
      amenities: parseAmenities(svc.amenities),
    },
    departure: {
      time: svc.departureTime,
      city: svc.sourceCity,
      date: svc.travelDate,
    },
    arrival: {
      time:      svc.arrivalTime,
      city:      svc.destinationCity,
      date:      svc.arrivalDate || svc.travelDate,
      overnight: svc.isOvernightJourney || false,
    },
    duration:     durationMinutes,
    durationText: svc.duration || `${Math.floor(durationMinutes/60)}h ${durationMinutes%60}m`,
    pricing: {
      fare:      parseFloat(svc.fare),
      currency:  'INR',
      perPerson: parseFloat(svc.fare),
      total:     parseFloat(svc.fare),
      taxes:     parseFloat(svc.gstAmount || 0),
    },
    seats: {
      available: parseInt(svc.availableSeats),
      total:     parseInt(svc.totalSeats || 40),
      lastFew:   parseInt(svc.availableSeats) <= 5,
    },
    boardingPoints:  svc.boardingPoints || [],
    droppingPoints:  svc.droppingPoints || [],
    liveTracking:    false,
    mTicket:         true,
    bestValue:       false,
    cancellationPolicy: svc.cancellationPolicy || null,
  };
}

function parseAmenities(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    return raw.split(',').map(a => a.trim().toLowerCase());
  }
  return [];
}

// ─── API Methods ─────────────────────────────────────────────────────────────

/**
 * Search available buses
 * Real endpoint: POST /getAvailableServices
 * Body: { username, password, fromCity, toCity, doj, noOfSeats }
 */
async function searchBuses({ fromCityId, toCityId, date, passengers = 1 }) {
  if (DEMO_MODE) {
    await new Promise(r => setTimeout(r, randomDelay(700, 1600)));
    const from = fromCityId.replace('c_', '');
    const to   = toCityId.replace('c_', '');
    const results = generateSearchResults(capitalize(from), capitalize(to), date, passengers);
    return results.filter(r => r.source === 'abhibus');
  }

  try {
    const response = await client.post(config.endpoints.availableServices, {
      username:  config.username,
      password:  config.password,
      fromCity:  fromCityId,
      toCity:    toCityId,
      doj:       date,
      noOfSeats: passengers,
    });

    const services = response.data?.services || response.data?.result || [];
    return services.map(normalizeAbhiBusService);
  } catch (err) {
    console.error('[AbhiBus] searchBuses error:', err.message);
    return [];
  }
}

/**
 * Get seat layout
 * Real endpoint: POST /getSeatLayout
 */
async function getSeatLayout({ tripId, fromCityId, toCityId, date }) {
  if (DEMO_MODE) {
    await new Promise(r => setTimeout(r, randomDelay(300, 800)));
    return generateSeatLayout(tripId);
  }

  try {
    const response = await client.post(config.endpoints.seatLayout, {
      username: config.username,
      password: config.password,
      serviceId: tripId, fromCity: fromCityId, toCity: toCityId, doj: date,
    });
    return response.data;
  } catch (err) {
    console.error('[AbhiBus] getSeatLayout error:', err.message);
    throw err;
  }
}

/**
 * Block seats temporarily
 * Real endpoint: POST /blockSeats
 */
async function blockSeats({ tripId, seats, boardingPoint, droppingPoint, passengerDetails }) {
  if (DEMO_MODE) {
    await new Promise(r => setTimeout(r, randomDelay(500, 1000)));
    return {
      blockId:    `AB_BLK_${Date.now()}`,
      expiresAt:  new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      totalFare:  seats.reduce((s, seat) => s + seat.fare, 0),
      status:     'BLOCKED',
    };
  }

  try {
    const response = await client.post(config.endpoints.blockSeats, {
      username: config.username, password: config.password,
      serviceId: tripId, seats, boardingPoint, droppingPoint, passengerDetails,
    });
    return response.data;
  } catch (err) {
    console.error('[AbhiBus] blockSeats error:', err.message);
    throw err;
  }
}

/**
 * Confirm booking
 * Real endpoint: POST /bookTicket
 */
async function bookTicket({ blockId, paymentDetails }) {
  if (DEMO_MODE) {
    await new Promise(r => setTimeout(r, randomDelay(1000, 2000)));
    return {
      bookingId:  `AB${Date.now()}`,
      pnr:        `ABPNR${Math.floor(Math.random()*9000000+1000000)}`,
      status:     'CONFIRMED',
      bookedAt:   new Date().toISOString(),
      totalFare:  1420,
    };
  }

  try {
    const response = await client.post(config.endpoints.bookTicket, {
      username: config.username, password: config.password,
      blockId, paymentDetails,
    });
    return response.data;
  } catch (err) {
    console.error('[AbhiBus] bookTicket error:', err.message);
    throw err;
  }
}

/**
 * Cancel ticket
 * Real endpoint: POST /cancelTicket
 */
async function cancelTicket({ bookingId, seatNumbers }) {
  if (DEMO_MODE) {
    await new Promise(r => setTimeout(r, randomDelay(500, 1200)));
    return {
      status:        'SUCCESS',
      refundAmount:  980,
      message:       'Cancelled successfully.',
    };
  }

  try {
    const response = await client.post(config.endpoints.cancelTicket, {
      username: config.username, password: config.password,
      bookingId, seatNumbers,
    });
    return response.data;
  } catch (err) {
    console.error('[AbhiBus] cancelTicket error:', err.message);
    throw err;
  }
}

/**
 * Get source cities list
 * Real endpoint: POST /getSourceCities
 */
async function getCities() {
  if (DEMO_MODE) {
    const { CITIES } = require('./mockData');
    return CITIES;
  }

  try {
    const response = await client.post(config.endpoints.sourceCities, {
      username: config.username,
      password: config.password,
    });
    return response.data?.cities || [];
  } catch (err) {
    console.error('[AbhiBus] getCities error:', err.message);
    return [];
  }
}

function randomDelay(min, max) { return Math.floor(Math.random() * (max - min)) + min; }
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

module.exports = { searchBuses, getSeatLayout, blockSeats, bookTicket, cancelTicket, getCities };
