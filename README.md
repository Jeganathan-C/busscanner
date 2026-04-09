# 🚌 BusScanner — Skyscanner-style Bus Booking Platform

A full-stack bus ticket aggregator inspired by Skyscanner, integrating **RedBus (SeatSeller)** and **AbhiBus** APIs.

---

## 📁 Project Structure

```
busscanner/
├── backend/
│   ├── server.js               # Express app entry point
│   ├── config/
│   │   └── apis.js             # API credentials & base URLs
│   ├── routes/
│   │   ├── search.js           # Search routes
│   │   ├── booking.js          # Booking routes
│   │   └── cities.js           # City/source lookup
│   ├── services/
│   │   ├── redbus.js           # RedBus SeatSeller API service
│   │   ├── abhibus.js          # AbhiBus API service
│   │   ├── aggregator.js       # Merges results from both APIs
│   │   └── mockData.js         # Realistic mock data (dev/demo mode)
│   └── middleware/
│       ├── auth.js             # API key validation
│       ├── cache.js            # Redis/memory caching layer
│       └── rateLimit.js        # Rate limiter
├── frontend/
│   ├── index.html              # Main search page
│   ├── results.html            # Search results page
│   ├── booking.html            # Seat selection & booking
│   ├── css/
│   │   └── styles.css          # Skyscanner-style CSS
│   └── js/
│       ├── search.js           # Search form logic
│       ├── results.js          # Results rendering
│       └── booking.js          # Seat map & booking flow
├── .env.example                # Environment variables template
├── package.json
└── README.md
```

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
cd busscanner/backend
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your API credentials
```

### 3. Run in DEMO mode (no API keys needed)
```bash
DEMO_MODE=true npm start
```

### 4. Run in PRODUCTION mode (requires approved API keys)
```bash
npm start
```

### 5. Open the frontend
```
Open frontend/index.html in a browser
OR serve with: npx serve frontend -p 3001
```

---

## 🔑 Getting Real API Access

### RedBus (SeatSeller API)
RedBus exposes its API under the brand **SeatSeller**. It is a **B2B partner API** — not publicly available.

**Steps to get access:**
1. Visit: https://seatseller.travel or https://plus.redbus.com
2. Email: b2b@redbus.in or partnerships@redbus.in
3. Mention: you want SeatSeller API access for a travel portal
4. They will send an NDA + partner agreement
5. After approval (~2–4 weeks), you receive:
   - `REDBUS_BASE_URL` (e.g., https://api.seatseller.travel)
   - `REDBUS_API_KEY` (auth token for headers)
   - Access to sandbox environment

**Key SeatSeller endpoints (once approved):**
```
GET  /availabletrips          - Search available buses
GET  /tripdetails             - Get seat layout
POST /blockticket             - Reserve/block seats
POST /bookticket              - Confirm booking & payment
POST /cancelticket            - Cancel a ticket
GET  /cancellationpolicies    - Get cancellation rules
GET  /cities                  - Get all source cities
```

### AbhiBus API
AbhiBus (owned by Goibibo/MakeMyTrip group) also requires B2B partnership.

**Steps to get access:**
1. Visit: https://www.abhibus.com/corporate or contact via https://www.abhibus.com/contact
2. Email: techsupport@abhibus.com or api@abhibus.com
3. Request API partner access
4. After approval, you receive:
   - `ABHIBUS_BASE_URL`
   - `ABHIBUS_USERNAME` + `ABHIBUS_PASSWORD` (basic auth)
   - `ABHIBUS_API_KEY`

**Key AbhiBus endpoints (once approved):**
```
POST /getSourceCities         - List source cities
POST /getDestinationCities    - List destinations
POST /getAvailableServices    - Search buses
POST /getSeatLayout           - Get seat map
POST /blockSeats              - Block seats temporarily
POST /bookTicket              - Confirm booking
POST /cancelTicket            - Cancel ticket
POST /getBookingDetails       - Fetch booking info
```

---

## ⚙️ Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development
DEMO_MODE=true        # Set false when using real APIs

# RedBus SeatSeller API
REDBUS_BASE_URL=https://api.seatseller.travel
REDBUS_API_KEY=your_redbus_api_key_here

# AbhiBus API
ABHIBUS_BASE_URL=https://api.abhibus.com/ws
ABHIBUS_USERNAME=your_abhibus_username
ABHIBUS_PASSWORD=your_abhibus_password
ABHIBUS_API_KEY=your_abhibus_api_key

# Cache (optional - uses in-memory if Redis not available)
REDIS_URL=redis://localhost:6379
CACHE_TTL=300         # seconds

# Frontend
FRONTEND_URL=http://localhost:3001
```

---

## 🛡️ Architecture

```
Browser → Frontend (HTML/CSS/JS)
              ↓ fetch()
         Backend API (Express)
              ↓
     ┌────────┴────────┐
     ▼                 ▼
RedBus Service    AbhiBus Service
(SeatSeller API)  (AbhiBus API)
     └────────┬────────┘
              ▼
        Aggregator
    (merge + normalize)
              ↓
       Cache Layer
    (memory / Redis)
              ↓
      JSON Response
```

---

## 📦 Dependencies

```json
{
  "express": "^4.18.2",
  "axios": "^1.6.0",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "express-rate-limit": "^7.1.5",
  "node-cache": "^5.1.2",
  "helmet": "^7.1.0",
  "morgan": "^1.10.0"
}
```
