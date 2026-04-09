// backend/server.js
require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');

const searchRoutes  = require('./routes/search');
const bookingRoutes = require('./routes/booking');
const citiesRoutes  = require('./routes/cities');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3001',
    'http://localhost:3000',
    'http://127.0.0.1:5500',  // VS Code Live Server
    'null',                    // local file:// opens
  ],
  methods: ['GET', 'POST'],
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status:   'ok',
    demoMode: process.env.DEMO_MODE === 'true',
    apis: {
      redbus:  process.env.REDBUS_API_KEY ? 'configured' : 'not configured (demo)',
      abhibus: process.env.ABHIBUS_API_KEY ? 'configured' : 'not configured (demo)',
    },
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/search',  searchRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/cities',  citiesRoutes);

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  const mode = process.env.DEMO_MODE === 'true' ? '🎭 DEMO MODE' : '🔴 LIVE MODE';
  console.log(`\n🚌 BusScanner backend running on http://localhost:${PORT}`);
  console.log(`   Mode: ${mode}`);
  console.log(`   RedBus API:  ${process.env.REDBUS_API_KEY  ? '✅ Configured' : '⚠️  Not configured'}`);
  console.log(`   AbhiBus API: ${process.env.ABHIBUS_API_KEY ? '✅ Configured' : '⚠️  Not configured'}`);
  console.log(`   API docs:    http://localhost:${PORT}/health\n`);
});

module.exports = app;
