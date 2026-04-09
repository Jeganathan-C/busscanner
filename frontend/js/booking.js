// frontend/js/booking.js
// Handles seat selection modal, boarding/dropping point selection, and booking flow

const API_BASE = 'http://localhost:3000/api';

// ── State ──────────────────────────────────────────────────────────────────────
const bookingState = {
  trip: null,
  selectedSeats: [],
  boardingPoint: null,
  droppingPoint: null,
  blockKey: null,
  passengers: [],
};

// ── Seat Modal ─────────────────────────────────────────────────────────────────
const seatModal    = document.getElementById('seatModal');
const modalClose   = document.getElementById('modalClose');
const seatMapWrap  = document.getElementById('seatMapWrap');
const deckTabs     = document.getElementById('deckTabs');
const proceedBtn   = document.getElementById('proceedBtn');
const fareSummary  = document.getElementById('fareSummary');
const boardingSel  = document.getElementById('boardingSelect');
const droppingSel  = document.getElementById('droppingSelect');

let currentDeck = 'lower';

// Open seat modal for a trip
async function openSeatModal(trip) {
  bookingState.trip = trip;
  bookingState.selectedSeats = [];
  bookingState.blockKey = null;

  document.getElementById('modalTitle').textContent =
    `${trip.operator.name} · ${trip.departure.time} → ${trip.arrival.time}`;

  seatModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  renderBoardingDropping(trip);
  await loadSeatLayout(trip);
}

function closeSeatModal() {
  seatModal.style.display = 'none';
  document.body.style.overflow = '';
  bookingState.selectedSeats = [];
  updateSeatSummary();
}

if (modalClose) modalClose.addEventListener('click', closeSeatModal);
if (seatModal) seatModal.addEventListener('click', (e) => {
  if (e.target === seatModal) closeSeatModal();
});

// ── Load seat layout ───────────────────────────────────────────────────────────
async function loadSeatLayout(trip) {
  seatMapWrap.innerHTML = '<div class="seat-loading"><div class="spinner"></div> Loading seat map...</div>';

  const params = new URLSearchParams(window.location.search);
  const url = `${API_BASE}/search/seats?tripId=${encodeURIComponent(trip.id)}&from=${params.get('from')}&to=${params.get('to')}&date=${params.get('date')}`;

  try {
    const res  = await fetch(url);
    const data = await res.json();
    if (!data.success) throw new Error('Failed');
    renderSeatMap(data.layout, trip);
  } catch (err) {
    seatMapWrap.innerHTML = '<div class="seat-error">⚠️ Could not load seat map. Please try again.</div>';
  }
}

// ── Render seat map ────────────────────────────────────────────────────────────
function renderSeatMap(layout, trip) {
  const hasUpper = layout.upper && layout.upper.length > 0;

  // Deck tabs
  deckTabs.innerHTML = '';
  const lowerTab = makeDeckTab('Lower Deck', 'lower', true);
  deckTabs.appendChild(lowerTab);
  if (hasUpper) {
    const upperTab = makeDeckTab('Upper Deck', 'upper', false);
    deckTabs.appendChild(upperTab);
  }

  renderDeck(layout.lower, 'lower');

  // Store layout for tab switching
  deckTabs._layout = layout;
}

function makeDeckTab(label, deck, active) {
  const btn = document.createElement('button');
  btn.className = `deck-tab${active ? ' active' : ''}`;
  btn.textContent = label;
  btn.addEventListener('click', () => {
    document.querySelectorAll('.deck-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    currentDeck = deck;
    renderDeck(deckTabs._layout[deck], deck);
  });
  return btn;
}

function renderDeck(rows, deck) {
  if (!rows) {
    seatMapWrap.innerHTML = '<div class="seat-error">No data for this deck.</div>';
    return;
  }

  // Bus front indicator
  let html = `
    <div class="bus-front">
      <div class="driver-seat">🪑 Driver</div>
      <div class="bus-door">🚪 Door</div>
    </div>
    <div class="seat-grid">
  `;

  rows.forEach(row => {
    html += '<div class="seat-row">';
    row.forEach((seat, colIdx) => {
      // Add aisle gap after 2nd seat in sleeper, 3rd in seater
      const isSleeperRow = row.length <= 2;
      if (!isSleeperRow && colIdx === 2) html += '<div class="aisle-gap"></div>';

      const cls = ['seat-cell', seat.status, seat.type].join(' ');
      const icon = seat.status === 'booked' ? '✖' : seat.status === 'ladies' ? '♀' : seat.type === 'sleeper' ? '▬' : '🪑';
      html += `
        <div class="${cls}" 
             data-id="${seat.id}" 
             data-number="${seat.number}"
             data-fare="${seat.fare}"
             data-status="${seat.status}"
             data-deck="${deck}"
             title="${seat.number} · ₹${seat.fare}">
          <span class="seat-icon">${icon}</span>
          <span class="seat-num">${seat.number}</span>
          <span class="seat-fare-label">₹${seat.fare}</span>
        </div>`;
    });
    html += '</div>';
  });

  html += '</div>';
  seatMapWrap.innerHTML = html;

  // Attach click handlers
  seatMapWrap.querySelectorAll('.seat-cell.available, .seat-cell.ladies').forEach(cell => {
    cell.addEventListener('click', () => toggleSeat(cell));
  });

  // Re-mark already selected seats
  bookingState.selectedSeats.forEach(s => {
    const el = seatMapWrap.querySelector(`[data-id="${s.id}"][data-deck="${deck}"]`);
    if (el) el.classList.add('selected');
  });
}

// ── Seat toggle ────────────────────────────────────────────────────────────────
function toggleSeat(cell) {
  const seatId = cell.dataset.id;
  const already = bookingState.selectedSeats.findIndex(s => s.id === seatId);

  if (already >= 0) {
    bookingState.selectedSeats.splice(already, 1);
    cell.classList.remove('selected');
  } else {
    if (bookingState.selectedSeats.length >= 6) {
      showToast('Maximum 6 seats per booking');
      return;
    }
    bookingState.selectedSeats.push({
      id:     seatId,
      number: cell.dataset.number,
      fare:   parseInt(cell.dataset.fare),
      deck:   cell.dataset.deck,
    });
    cell.classList.add('selected');
  }

  updateSeatSummary();
}

// ── Update summary panel ───────────────────────────────────────────────────────
function updateSeatSummary() {
  const info = document.getElementById('selectedSeatsInfo');
  const seats = bookingState.selectedSeats;

  if (seats.length === 0) {
    info.innerHTML = '<p class="no-seat-msg">Tap a seat to select it</p>';
    fareSummary.style.display = 'none';
    proceedBtn.disabled = true;
    return;
  }

  let html = '<div class="selected-seat-chips">';
  seats.forEach(s => {
    html += `<div class="seat-chip">
      <span>Seat ${s.number}</span>
      <span class="chip-fare">₹${s.fare}</span>
      <button class="chip-remove" data-id="${s.id}">✕</button>
    </div>`;
  });
  html += '</div>';
  info.innerHTML = html;

  // Remove buttons
  info.querySelectorAll('.chip-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      bookingState.selectedSeats = bookingState.selectedSeats.filter(s => s.id !== id);
      const cell = seatMapWrap.querySelector(`[data-id="${id}"]`);
      if (cell) cell.classList.remove('selected');
      updateSeatSummary();
    });
  });

  const seatTotal = seats.reduce((sum, s) => sum + s.fare, 0);
  const total = seatTotal + 30;

  document.getElementById('seatFare').textContent  = `₹${seatTotal}`;
  document.getElementById('totalFare').textContent = `₹${total}`;
  fareSummary.style.display = 'block';
  proceedBtn.disabled = false;
}

// ── Boarding / dropping points ─────────────────────────────────────────────────
function renderBoardingDropping(trip) {
  boardingSel.innerHTML = '';
  droppingSel.innerHTML = '';

  (trip.boardingPoints || []).forEach(bp => {
    const opt = document.createElement('option');
    opt.value = bp.id;
    opt.textContent = `${bp.name} · ${bp.time}`;
    boardingSel.appendChild(opt);
  });

  (trip.droppingPoints || []).forEach(dp => {
    const opt = document.createElement('option');
    opt.value = dp.id;
    opt.textContent = `${dp.name} · ${dp.time}`;
    droppingSel.appendChild(opt);
  });
}

// ── Proceed to booking ─────────────────────────────────────────────────────────
if (proceedBtn) {
  proceedBtn.addEventListener('click', async () => {
    if (bookingState.selectedSeats.length === 0) return;

    proceedBtn.disabled = true;
    proceedBtn.textContent = 'Blocking seats...';

    try {
      const res = await fetch(`${API_BASE}/booking/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId:          bookingState.trip.id,
          seats:           bookingState.selectedSeats,
          boardingPointId: boardingSel.value,
          droppingPointId: droppingSel.value,
          passengerDetails: [],
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Block failed');

      bookingState.blockKey = data.blockKey || data.blockId;

      // Save to sessionStorage and go to passenger details
      sessionStorage.setItem('bookingState', JSON.stringify({
        trip:         bookingState.trip,
        seats:        bookingState.selectedSeats,
        blockKey:     bookingState.blockKey,
        boarding:     boardingSel.options[boardingSel.selectedIndex]?.text,
        dropping:     droppingSel.options[droppingSel.selectedIndex]?.text,
        totalFare:    bookingState.selectedSeats.reduce((s, seat) => s + seat.fare, 0) + 30,
        expiresAt:    data.expiresAt,
      }));

      closeSeatModal();
      showPassengerForm();
    } catch (err) {
      showToast('Seat blocking failed. Please try again.');
      proceedBtn.disabled = false;
      proceedBtn.textContent = 'Proceed to book';
    }
  });
}

// ── Passenger details form ─────────────────────────────────────────────────────
function showPassengerForm() {
  const bs = JSON.parse(sessionStorage.getItem('bookingState') || '{}');
  if (!bs.trip) return;

  // Create overlay form
  const overlay = document.createElement('div');
  overlay.className = 'booking-overlay';
  overlay.id = 'passengerOverlay';

  const expiresIn = bs.expiresAt
    ? Math.max(0, Math.floor((new Date(bs.expiresAt) - Date.now()) / 1000))
    : 600;

  let passengerFields = '';
  bs.seats.forEach((seat, idx) => {
    passengerFields += `
      <div class="passenger-block">
        <h4>Passenger ${idx + 1} — Seat ${seat.number}</h4>
        <div class="pax-form-row">
          <div class="pax-form-group">
            <label>Full Name</label>
            <input type="text" class="pax-input" id="pax_name_${idx}" placeholder="As on ID card" required>
          </div>
          <div class="pax-form-group">
            <label>Age</label>
            <input type="number" class="pax-input" id="pax_age_${idx}" placeholder="e.g. 28" min="1" max="100" required>
          </div>
          <div class="pax-form-group">
            <label>Gender</label>
            <select class="pax-input" id="pax_gender_${idx}">
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
          </div>
        </div>
      </div>`;
  });

  overlay.innerHTML = `
    <div class="booking-panel">
      <div class="booking-panel-header">
        <button class="back-btn" id="backFromPax">← Back</button>
        <h2>Passenger details</h2>
        <div class="timer-badge" id="timerBadge">⏱ <span id="timerDisplay">${formatTime(expiresIn)}</span> remaining</div>
      </div>

      <div class="booking-panel-body">
        <div class="booking-summary-strip">
          <div><strong>${bs.trip.operator.name}</strong></div>
          <div>${bs.trip.departure.time} → ${bs.trip.arrival.time}</div>
          <div>Seats: ${bs.seats.map(s => s.number).join(', ')}</div>
          <div class="booking-total">Total: ₹${bs.totalFare}</div>
        </div>

        <div class="passenger-form" id="passengerForm">
          ${passengerFields}
          <div class="contact-block">
            <h4>Contact details</h4>
            <div class="pax-form-row">
              <div class="pax-form-group">
                <label>Mobile number</label>
                <input type="tel" class="pax-input" id="contactPhone" placeholder="10-digit mobile" maxlength="10" required>
              </div>
              <div class="pax-form-group">
                <label>Email address</label>
                <input type="email" class="pax-input" id="contactEmail" placeholder="you@email.com" required>
              </div>
            </div>
          </div>
        </div>

        <button class="btn-pay" id="payBtn">
          💳 Pay ₹${bs.totalFare} & Confirm Booking
        </button>
        <p class="pay-note">🔒 Secure payment · Full refund if cancelled 24hrs before departure</p>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Timer countdown
  let remaining = expiresIn;
  const timerInterval = setInterval(() => {
    remaining--;
    const el = document.getElementById('timerDisplay');
    if (el) el.textContent = formatTime(remaining);
    if (remaining <= 60) document.getElementById('timerBadge')?.classList.add('urgent');
    if (remaining <= 0) {
      clearInterval(timerInterval);
      showToast('Session expired. Please select seats again.');
      overlay.remove();
    }
  }, 1000);

  document.getElementById('backFromPax').addEventListener('click', () => {
    clearInterval(timerInterval);
    overlay.remove();
  });

  document.getElementById('payBtn').addEventListener('click', () => confirmBooking(bs, timerInterval));
}

// ── Confirm booking ────────────────────────────────────────────────────────────
async function confirmBooking(bs, timerInterval) {
  const payBtn = document.getElementById('payBtn');
  payBtn.disabled = true;
  payBtn.textContent = '⏳ Confirming booking...';

  try {
    const res = await fetch(`${API_BASE}/booking/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blockKey: bs.blockKey,
        tripId:   bs.trip.id,
        paymentDetails: {
          mode: 'Online',
          transactionId: `TXN_${Date.now()}`,
        },
      }),
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Booking failed');

    clearInterval(timerInterval);
    showBookingConfirmation(data.booking, bs);
  } catch (err) {
    showToast('Booking failed. Please try again or contact support.');
    payBtn.disabled = false;
    payBtn.textContent = `💳 Pay ₹${bs.totalFare} & Confirm Booking`;
  }
}

// ── Booking confirmation screen ────────────────────────────────────────────────
function showBookingConfirmation(booking, bs) {
  const overlay = document.getElementById('passengerOverlay');
  if (overlay) overlay.remove();

  const conf = document.createElement('div');
  conf.className = 'booking-overlay confirmation-overlay';
  conf.innerHTML = `
    <div class="confirmation-box">
      <div class="conf-icon">✅</div>
      <h2>Booking Confirmed!</h2>
      <p class="conf-pnr">PNR: <strong>${booking.pnr || booking.bookingId}</strong></p>
      <div class="conf-details">
        <div class="conf-row"><span>Operator</span><strong>${bs.trip.operator.name}</strong></div>
        <div class="conf-row"><span>Route</span><strong>${bs.trip.departure.city} → ${bs.trip.arrival.city}</strong></div>
        <div class="conf-row"><span>Date</span><strong>${bs.trip.departure.date}</strong></div>
        <div class="conf-row"><span>Departure</span><strong>${bs.trip.departure.time}</strong></div>
        <div class="conf-row"><span>Seats</span><strong>${bs.seats.map(s => s.number).join(', ')}</strong></div>
        <div class="conf-row"><span>Boarding</span><strong>${bs.boarding}</strong></div>
        <div class="conf-row"><span>Amount Paid</span><strong>₹${bs.totalFare}</strong></div>
        <div class="conf-row"><span>Status</span><strong class="status-confirmed">CONFIRMED</strong></div>
      </div>
      <div class="conf-actions">
        <button class="btn-download" onclick="window.print()">📥 Download Ticket</button>
        <button class="btn-home" onclick="window.location.href='index.html'">🏠 Back to Home</button>
      </div>
      <p class="conf-note">📧 Ticket sent to your email · 📱 mTicket available on your phone</p>
    </div>
  `;
  document.body.appendChild(conf);
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function showToast(msg) {
  const existing = document.getElementById('toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'toast';
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3500);
}

// Export for use in results.js
window.openSeatModal = openSeatModal;
