// backend/config/apis.js
// Central configuration for all external API connections

module.exports = {
  redbus: {
    baseURL: process.env.REDBUS_BASE_URL || 'https://api.seatseller.travel',
    apiKey: process.env.REDBUS_API_KEY || '',
    timeout: 15000,
    // SeatSeller uses this header for auth
    authHeader: 'ApiKey',
    endpoints: {
      cities:              '/cities',
      availableTrips:      '/availabletrips',
      tripDetails:         '/tripdetails',
      blockTicket:         '/blockticket',
      bookTicket:          '/bookticket',
      cancelTicket:        '/cancelticket',
      bookingDetails:      '/bookingdetails',
      cancellationPolicy:  '/cancellationpolicies',
      boardingPoints:      '/boardinganddroppingpoints',
    },
  },

  abhibus: {
    baseURL: process.env.ABHIBUS_BASE_URL || 'https://api.abhibus.com/ws',
    username: process.env.ABHIBUS_USERNAME || '',
    password: process.env.ABHIBUS_PASSWORD || '',
    apiKey:   process.env.ABHIBUS_API_KEY  || '',
    timeout: 15000,
    endpoints: {
      sourceCities:        '/getSourceCities',
      destinationCities:   '/getDestinationCities',
      availableServices:   '/getAvailableServices',
      seatLayout:          '/getSeatLayout',
      blockSeats:          '/blockSeats',
      bookTicket:          '/bookTicket',
      cancelTicket:        '/cancelTicket',
      bookingDetails:      '/getBookingDetails',
      cancellationPolicy:  '/getCancellationPolicy',
    },
  },
};
