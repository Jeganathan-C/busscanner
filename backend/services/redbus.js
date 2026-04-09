// backend/services/redbus.js
// RedBus SeatSeller API integration
// Docs & access: https://seatseller.travel | email: b2b@redbus.in

const axios = require('axios');
const config = require('../config/apis').redbus;
const { generateSearchResults, generateSeatLayout } = require('./mockData');

const DEMO_MODE = process.env.DEMO_MODE === 'true' || !config.apiKey;

// Axios instance pre-configured for SeatSeller
const client = axios.create({
  baseURL: config.baseURL,
  timeout: config.timeout,
  headers: {
    [config.authHeader]: config.apiKey,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// ─── Normalizer ──────────────────────────────────────────────────────────────
// Transforms SeatSeller response shape → our unified shape
function normalizeSeatSellerTrip(trip) {
  return {
    id:       `redbus_${trip.id}`,
    source:   'redbus',
    operator: {
      id:      `rb_${trip.operatorId}`,
      name:    trip.travels,
      rating:  trip.rating || 0,
      reviews: trip.ratingsCount || 0,
    },
    bus: {
      type:      trip.busType,
      code:      trip.busType.includes('Sleeper') ? 'SL' : 'ST',
      amenities: trip.amenities || [],
    },
    departure: {
      time: trip.departureTime,
      city: trip.origin,
      date: trip.doj,
    },
    arrival: {
      time:      trip.arrivalTime,
      city:      trip.destination,
      date:      trip.arrivalDate || trip.doj,
      overnight: trip.arrivalDate !== trip.doj,
    },
    duration:     trip.duration,
    durationText: trip.durationInMinutes
      ? `${Math.floor(trip.durationInMinutes/60)}h ${trip.durationInMinutes%60}m`
      : trip.duration,
    pricing: {
      fare:      trip.fare.publishedFare,
      currency:  'INR',
      perPerson: trip.fare.publishedFare,
      total:     trip.fare.publishedFare,
      taxes:     trip.fare.operatorServiceCharge || 0,
    },
    seats: {
      available: trip.availableSeats,
      total:     trip.totalSeats || 40,
      lastFew:   trip.availableSeats <= 5,
    },
    boardingPoints:  trip.boardingTimes || [],
    droppingPoints:  trip.droppingTimes || [],
    liveTracking:    trip.liveTrackAvailable || false,
    mTicket:         trip.mTicket || true,
    bestValue:       false,
    cancellationPolicy: null,
  };
}

// ─── API Methods ─────────────────────────────────────────────────────────────

/**
 * Search available buses
 * Real endpoint: GET /availabletrips?srcCityId=&destCityId=&doj=
 */
async function searchBuses({ fromCityId, toCityId, date }) {
  if (DEMO_MODE) {
    // Simulate network delay
    await new Promise(r => setTimeout(r, randomDelay(600, 1400)));
    const from = fromCityId.replace('c_', '');
    const to   = toCityId.replace('c_', '');
    const fromName = capitalize(from);
    const toName   = capitalize(to);
    const results  = generateSearchResults(fromName, toName, date);
    // Return only redbus-sourced ones
    return results.filter(r => r.source === 'redbus');
  }

  try {
    const response = await client.get(config.endpoints.availableTrips, {
      params: { srcCityId: fromCityId, destCityId: toCityId, doj: date },
    });

    if (!response.data || !response.data.availableTrips) return [];
    return response.data.availableTrips.map(normalizeSeatSellerTrip);
  } catch (err) {
    console.error('[RedBus] searchBuses error:', err.message);
    return [];
  }
}

/**
 * Get seat layout for a trip
 * Real endpoint: GET /tripdetails?tripId=&srcCityId=&destCityId=&doj=
 */
async function getSeatLayout({ tripId, fromCityId, toCityId, date }) {
  if (DEMO_MODE) {
    await new Promise(r => setTimeout(r, randomDelay(300, 700)));
    return generateSeatLayout(tripId);
  }

  try {
    const response = await client.get(config.endpoints.tripDetails, {
      params: { tripId, srcCityId: fromCityId, destCityId: toCityId, doj: date },
    });
    return response.data;
  } catch (err) {
    console.error('[RedBus] getSeatLayout error:', err.message);
    throw err;
  }
}

/**
 * Block (temporarily reserve) seats
 * Real endpoint: POST /blockticket
 */
async function blockTicket({ tripId, boardingPointId, droppingPointId, seats, passengerDetails, partialCancellationAllowed = true }) {
  if (DEMO_MODE) {
    await new Promise(r => setTimeout(r, randomDelay(500, 1000)));
    return {
      blockKey: `MOCK_BLK_${Date.now()}`,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min hold
      amount: seats.reduce((sum, s) => sum + s.fare, 0),
      convenienceFee: 30,
      totalAmount: seats.reduce((sum, s) => sum + s.fare, 0) + 30,
    };
  }

  try {
    const response = await client.post(config.endpoints.blockTicket, {
      tripId, boardingPointId, droppingPointId,
      seats, passengerDetails, partialCancellationAllowed,
    });
    return response.data;
  } catch (err) {
    console.error('[RedBus] blockTicket error:', err.message);
    throw err;
  }
}

/**
 * Confirm booking
 * Real endpoint: POST /bookticket
 */
async function bookTicket({ blockKey, paymentMode = 'Online', pgTransactionId }) {
  if (DEMO_MODE) {
    await new Promise(r => setTimeout(r, randomDelay(1000, 2000)));
    return {
      tin:            `RB${Date.now()}`,
      pnr:            `PNR${Math.floor(Math.random()*9000000+1000000)}`,
      status:         'CONFIRMED',
      bookedAt:       new Date().toISOString(),
      amount:         1450,
      downloadUrl:    '#',
    };
  }

  try {
    const response = await client.post(config.endpoints.bookTicket, {
      blockKey, paymentMode, pgTransactionId,
    });
    return response.data;
  } catch (err) {
    console.error('[RedBus] bookTicket error:', err.message);
    throw err;
  }
}

/**
 * Get all available source cities
 * Real endpoint: GET /cities
 */
async function getCities() {
  if (DEMO_MODE) {
    const { CITIES } = require('./mockData');
    return CITIES;
  }

  try {
    const response = await client.get(config.endpoints.cities);
    return response.data;
  } catch (err) {
    console.error('[RedBus] getCities error:', err.message);
    return [];
  }
}

/**
 * Cancel a ticket
 * Real endpoint: POST /cancelticket
 */
async function cancelTicket({ tin, seats }) {
  if (DEMO_MODE) {
    await new Promise(r => setTimeout(r, randomDelay(500, 1200)));
    return {
      cancellationStatus: 'SUCCESS',
      refundAmount:       1050,
      message:            'Cancellation successful. Refund will be processed in 5–7 business days.',
    };
  }

  try {
    const response = await client.post(config.endpoints.cancelTicket, { tin, seats });
    return response.data;
  } catch (err) {
    console.error('[RedBus] cancelTicket error:', err.message);
    throw err;
  }
}

function randomDelay(min, max) { return Math.floor(Math.random() * (max - min)) + min; }
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

module.exports = { searchBuses, getSeatLayout, blockTicket, bookTicket, getCities, cancelTicket };
