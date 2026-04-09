// backend/routes/booking.js
const express = require('express');
const router  = express.Router();
const redbusService  = require('../services/redbus');
const abhiBusService = require('../services/abhibus');
const { bookingLimiter } = require('../middleware/rateLimit');

function getService(tripId) {
  return tripId.startsWith('redbus') ? redbusService : abhiBusService;
}

/**
 * POST /api/booking/block
 * Temporarily reserve seats (10 min hold)
 */
router.post('/block', bookingLimiter, async (req, res) => {
  const { tripId, seats, boardingPointId, droppingPointId, passengerDetails } = req.body;

  if (!tripId || !seats || !Array.isArray(seats) || seats.length === 0) {
    return res.status(400).json({ error: 'tripId and seats array are required' });
  }

  try {
    let result;
    if (tripId.startsWith('redbus')) {
      result = await redbusService.blockTicket({ tripId, seats, boardingPointId, droppingPointId, passengerDetails });
    } else {
      result = await abhiBusService.blockSeats({ tripId, seats, boardingPoint: boardingPointId, droppingPoint: droppingPointId, passengerDetails });
    }
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[Block] Error:', err.message);
    res.status(500).json({ error: 'Seat blocking failed. Please try again.' });
  }
});

/**
 * POST /api/booking/confirm
 * Confirm a blocked booking after payment
 */
router.post('/confirm', bookingLimiter, async (req, res) => {
  const { blockKey, tripId, paymentDetails } = req.body;

  if (!blockKey || !tripId) {
    return res.status(400).json({ error: 'blockKey and tripId are required' });
  }

  try {
    let result;
    if (tripId.startsWith('redbus')) {
      result = await redbusService.bookTicket({
        blockKey,
        paymentMode: paymentDetails?.mode || 'Online',
        pgTransactionId: paymentDetails?.transactionId,
      });
    } else {
      result = await abhiBusService.bookTicket({ blockId: blockKey, paymentDetails });
    }
    res.json({ success: true, booking: result });
  } catch (err) {
    console.error('[Confirm] Error:', err.message);
    res.status(500).json({ error: 'Booking confirmation failed.' });
  }
});

/**
 * POST /api/booking/cancel
 * Cancel a confirmed booking
 */
router.post('/cancel', async (req, res) => {
  const { bookingId, tripId, seats } = req.body;
  if (!bookingId || !tripId) {
    return res.status(400).json({ error: 'bookingId and tripId are required' });
  }

  try {
    let result;
    if (tripId.startsWith('redbus')) {
      result = await redbusService.cancelTicket({ tin: bookingId, seats });
    } else {
      result = await abhiBusService.cancelTicket({ bookingId, seatNumbers: seats });
    }
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[Cancel] Error:', err.message);
    res.status(500).json({ error: 'Cancellation failed.' });
  }
});

module.exports = router;
