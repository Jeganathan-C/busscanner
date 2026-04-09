// backend/services/mockData.js
// Realistic mock data that mirrors real RedBus & AbhiBus API responses.
// Used when DEMO_MODE=true or when real API credentials are absent.

const OPERATORS = [
  { id: 'rb_vrl',    name: 'VRL Travels',      source: 'redbus',  rating: 4.2, reviews: 24150 },
  { id: 'rb_srs',    name: 'SRS Travels',       source: 'redbus',  rating: 4.5, reviews: 11320 },
  { id: 'rb_kpn',    name: 'KPN Travels',       source: 'redbus',  rating: 3.9, reviews: 8430  },
  { id: 'ab_pvn',    name: 'Parveen Travels',   source: 'abhibus', rating: 4.4, reviews: 31200 },
  { id: 'ab_inb',    name: 'IntraBus',          source: 'abhibus', rating: 3.7, reviews: 5620  },
  { id: 'ab_orange', name: 'Orange Travels',    source: 'abhibus', rating: 4.1, reviews: 9870  },
  { id: 'rb_kallada', name: 'Kallada Travels',  source: 'redbus',  rating: 4.6, reviews: 18900 },
  { id: 'ab_govt',   name: 'TNSTC (Govt)',      source: 'abhibus', rating: 3.5, reviews: 4100  },
];

const BUS_TYPES = [
  { type: 'AC Sleeper',       code: 'AC_SL',  amenities: ['ac', 'sleeper', 'wifi', 'usb'] },
  { type: 'Non-AC Sleeper',   code: 'NAC_SL', amenities: ['sleeper'] },
  { type: 'AC Semi-Sleeper',  code: 'AC_SS',  amenities: ['ac', 'wifi', 'usb'] },
  { type: 'AC Seater',        code: 'AC_ST',  amenities: ['ac', 'usb'] },
  { type: 'Non-AC Seater',    code: 'NAC_ST', amenities: [] },
  { type: 'Volvo Multi-Axle', code: 'VOLVO',  amenities: ['ac', 'wifi', 'usb', 'charging', 'snacks'] },
  { type: 'Bharat Benz A/C',  code: 'BB_AC',  amenities: ['ac', 'wifi', 'usb'] },
];

const POPULAR_ROUTES = {
  'Chennai-Bangalore':   { duration: 340, basePrice: 299 },
  'Chennai-Coimbatore':  { duration: 420, basePrice: 349 },
  'Chennai-Hyderabad':   { duration: 600, basePrice: 499 },
  'Chennai-Madurai':     { duration: 420, basePrice: 249 },
  'Chennai-Pondicherry': { duration: 150, basePrice: 149 },
  'Chennai-Ooty':        { duration: 480, basePrice: 399 },
  'Bangalore-Mysore':    { duration: 180, basePrice: 199 },
  'Bangalore-Mangalore': { duration: 420, basePrice: 349 },
  'Mumbai-Pune':         { duration: 180, basePrice: 249 },
  'Delhi-Agra':          { duration: 240, basePrice: 299 },
};

const CITIES = [
  { id: 'c_chennai',   name: 'Chennai',     state: 'Tamil Nadu'      },
  { id: 'c_bangalore', name: 'Bangalore',   state: 'Karnataka'       },
  { id: 'c_mumbai',    name: 'Mumbai',      state: 'Maharashtra'     },
  { id: 'c_delhi',     name: 'Delhi',       state: 'Delhi'           },
  { id: 'c_hyderabad', name: 'Hyderabad',   state: 'Telangana'       },
  { id: 'c_coimbatore',name: 'Coimbatore',  state: 'Tamil Nadu'      },
  { id: 'c_madurai',   name: 'Madurai',     state: 'Tamil Nadu'      },
  { id: 'c_pondicherry',name:'Pondicherry', state: 'Puducherry'      },
  { id: 'c_ooty',      name: 'Ooty',        state: 'Tamil Nadu'      },
  { id: 'c_mysore',    name: 'Mysore',      state: 'Karnataka'       },
  { id: 'c_mangalore', name: 'Mangalore',   state: 'Karnataka'       },
  { id: 'c_pune',      name: 'Pune',        state: 'Maharashtra'     },
  { id: 'c_agra',      name: 'Agra',        state: 'Uttar Pradesh'   },
  { id: 'c_jaipur',    name: 'Jaipur',      state: 'Rajasthan'       },
  { id: 'c_kolkata',   name: 'Kolkata',     state: 'West Bengal'     },
];

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addMinutes(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2,'0')}:${String(nm).padStart(2,'0')}`;
}

function generateAvailableSeats(busType) {
  const total = busType.code.includes('SL') ? 40 : 45;
  return randomBetween(3, total - 5);
}

/**
 * Generate realistic mock bus results
 */
function generateSearchResults(from, to, date, passengers = 1) {
  const routeKey = `${from}-${to}`;
  const route = POPULAR_ROUTES[routeKey] || { duration: 300, basePrice: 299 };

  const departureTimes = ['05:30', '06:00', '07:15', '08:00', '09:30',
                           '10:00', '11:45', '13:00', '14:30', '16:00',
                           '18:00', '20:30', '21:00', '22:00', '23:30'];

  const results = [];

  // Generate 10–16 results
  const numResults = randomBetween(10, 16);
  const usedTimes = new Set();

  for (let i = 0; i < numResults; i++) {
    const operator = OPERATORS[i % OPERATORS.length];
    const busType  = BUS_TYPES[randomBetween(0, BUS_TYPES.length - 1)];

    let depTime = departureTimes[i % departureTimes.length];
    while (usedTimes.has(`${operator.id}_${depTime}`)) {
      depTime = departureTimes[randomBetween(0, departureTimes.length - 1)];
    }
    usedTimes.add(`${operator.id}_${depTime}`);

    const durationVariance = randomBetween(-30, 60);
    const duration = route.duration + durationVariance;
    const arrTime  = addMinutes(depTime, duration);
    const overnight = duration + parseInt(depTime.split(':')[0]) * 60 + parseInt(depTime.split(':')[1]) >= 1440;

    const priceMultiplier = {
      'AC_SL': 1.8, 'NAC_SL': 1.0, 'AC_SS': 1.4,
      'AC_ST': 1.2, 'NAC_ST': 0.7, 'VOLVO': 2.2, 'BB_AC': 1.6,
    }[busType.code] || 1.0;

    const basePrice = Math.round(route.basePrice * priceMultiplier * randomBetween(85, 115) / 100);
    const availableSeats = generateAvailableSeats(busType);

    const boardingPoints = [
      { id: `bp_${i}_1`, name: 'CMBT (Koyambedu)', time: depTime,                        address: 'Chennai Mofussil Bus Terminus' },
      { id: `bp_${i}_2`, name: 'Koyambedu Metro',  time: addMinutes(depTime, 10),         address: 'Koyambedu Metro Station' },
      { id: `bp_${i}_3`, name: 'Tidel Park',       time: addMinutes(depTime, 25),         address: 'Tidel Park, OMR' },
    ];
    const droppingPoints = [
      { id: `dp_${i}_1`, name: 'Majestic',         time: addMinutes(depTime, duration - 20), address: 'Kempegowda Bus Station' },
      { id: `dp_${i}_2`, name: 'Shivajinagar',     time: addMinutes(depTime, duration - 10), address: 'Shivajinagar Bus Stand' },
      { id: `dp_${i}_3`, name: 'Electronic City',  time: arrTime,                             address: 'Electronic City, Phase 1' },
    ];

    results.push({
      id:             `${operator.source}_trip_${Date.now()}_${i}`,
      source:         operator.source,        // 'redbus' | 'abhibus'
      operator: {
        id:           operator.id,
        name:         operator.name,
        rating:       operator.rating,
        reviews:      operator.reviews,
      },
      bus: {
        type:         busType.type,
        code:         busType.code,
        amenities:    busType.amenities,
      },
      departure: {
        time:         depTime,
        city:         from,
        date:         date,
      },
      arrival: {
        time:         arrTime,
        city:         to,
        date:         overnight ? 'next day' : date,
        overnight:    overnight,
      },
      duration:       duration,              // minutes
      durationText:   `${Math.floor(duration/60)}h ${duration%60}m`,
      pricing: {
        fare:         basePrice,
        currency:     'INR',
        perPerson:    basePrice,
        total:        basePrice * passengers,
        taxes:        Math.round(basePrice * 0.05),
      },
      seats: {
        available:    availableSeats,
        total:        busType.code.includes('SL') ? 40 : 45,
        lastFew:      availableSeats <= 5,
      },
      boardingPoints,
      droppingPoints,
      cancellationPolicy: {
        freeCancellationUpto: '24 hours before departure',
        charges: [
          { window: '> 24 hours', refund: '100%' },
          { window: '12–24 hours', refund: '75%' },
          { window: '< 12 hours',  refund: '50%' },
          { window: 'After departure', refund: '0%' },
        ],
      },
      liveTracking: operator.source === 'redbus',
      mTicket:      true,
    });
  }

  // Sort by departure time by default
  results.sort((a, b) => a.departure.time.localeCompare(b.departure.time));

  // Flag best value (lowest price with decent rating)
  const scored = results.map(r => ({
    ...r,
    _score: (r.operator.rating * 100) - r.pricing.fare * 0.1
  }));
  scored.sort((a, b) => b._score - a._score);
  if (scored.length > 0) scored[0].bestValue = true;
  scored.forEach(r => delete r._score);

  return scored;
}

/**
 * Generate seat layout for a trip
 */
function generateSeatLayout(tripId) {
  const isSleeperBus = tripId.includes('SL') || Math.random() > 0.5;
  const rows = isSleeperBus ? 10 : 9;
  const layout = { lower: [], upper: isSleeperBus ? [] : null };

  const seatTypes = isSleeperBus
    ? ['window', 'aisle', 'window', 'aisle']
    : ['window', 'middle', 'aisle', 'window', 'aisle'];

  for (let row = 1; row <= rows; row++) {
    const lowerRow = [];
    for (let col = 0; col < (isSleeperBus ? 2 : 3); col++) {
      const isBooked = Math.random() < 0.45;
      const isLadies = !isBooked && Math.random() < 0.1;
      lowerRow.push({
        id:       `L${row}${col+1}`,
        number:   `${row}${String.fromCharCode(64 + col + 1)}`,
        type:     isSleeperBus ? 'sleeper' : 'seater',
        position: seatTypes[col],
        status:   isBooked ? 'booked' : isLadies ? 'ladies' : 'available',
        fare:     isSleeperBus ? randomBetween(400, 700) : randomBetween(200, 400),
      });
    }
    layout.lower.push(lowerRow);

    if (isSleeperBus) {
      const upperRow = [];
      for (let col = 0; col < 2; col++) {
        const isBooked = Math.random() < 0.35;
        upperRow.push({
          id:       `U${row}${col+1}`,
          number:   `U${row}${String.fromCharCode(64 + col + 1)}`,
          type:     'sleeper',
          position: col === 0 ? 'window' : 'aisle',
          status:   isBooked ? 'booked' : 'available',
          fare:     randomBetween(350, 600),
        });
      }
      layout.upper.push(upperRow);
    }
  }

  return layout;
}

module.exports = { generateSearchResults, generateSeatLayout, CITIES };
