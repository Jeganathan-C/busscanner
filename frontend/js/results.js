// frontend/js/results.js
// Handles results page: fetches search results, renders cards, filters, seat modal

const API_BASE = 'http://localhost:3000/api';

// ── State ──────────────────────────────────────────────────────────────────────
const state = {
  query:        {},
  allResults:   [],
  filtered:     [],
  sortBy:       'best',
  filters:      { maxPrice: Infinity, departureTimes: [], busTypes: [], amenities: [], sources: ['redbus','abhibus'] },
  selectedTrip: null,
  selectedSeats: [],
  currentDeck:  'lower',
  seatLayout:   null,
};

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
  parseQueryParams();
  updateCompactSearch();
  buildDateStrip();
  setupFilters();
  setupSortPills();
  setupSearchExpand();
  setupSeatModal();
  fetchResults();
}

function parseQueryParams() {
  const p = new URLSearchParams(window.location.search);
  state.query = {
    from:      p.get('from')     || 'c_chennai',
    to:        p.get('to')       || 'c_bangalore',
    date:      p.get('date')     || tomorrowISO(),
    passengers:parseInt(p.get('passengers') || '1'),
    fromName:  p.get('fromName') || 'Chennai',
    toName:    p.get('toName')   || 'Bangalore',
  };
}

function updateCompactSearch() {
  const q = state.query;
  safeText('cs-from',   q.fromName);
  safeText('cs-to',     q.toName);
  safeText('cs-date',   formatDate(q.date));
  safeText('cs-pax',    `${q.passengers} adult${q.passengers > 1 ? 's' : ''}`);
  document.title = `${q.fromName} → ${q.toName} — BusScanner`;
}

// ── Date Strip ────────────────────────────────────────────────────────────────
function buildDateStrip() {
  const strip = document.getElementById('dateStrip');
  if (!strip) return;
  const base  = new Date(state.query.date);
  const days  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  let html    = '';
  for (let i = -3; i <= 3; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    const iso      = d.toISOString().split('T')[0];
    const isActive = iso === state.query.date;
    const fakePx   = Math.floor(Math.random() * 300 + 200);
    html += `<div class="date-chip ${isActive ? 'active' : ''}" data-date="${iso}">
      <div class="dc-day">${days[d.getDay()]}</div>
      <div class="dc-date">${d.getDate()} ${d.toLocaleString('default',{month:'short'})}</div>
      ${!isActive ? `<div class="dc-price">₹${fakePx}</div>` : ''}
    </div>`;
  }
  strip.innerHTML = html;
  strip.querySelectorAll('.date-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      state.query.date = chip.dataset.date;
      document.querySelectorAll('.date-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      fetchResults();
    });
  });
}

// ── Fetch Results ─────────────────────────────────────────────────────────────
async function fetchResults() {
  showLoading();
  const q = state.query;
  const url = `${API_BASE}/search?from=${q.from}&to=${q.to}&date=${q.date}&passengers=${q.passengers}`;

  try {
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    state.allResults = data.results || [];
    state.filters.maxPrice = data.priceRange?.max || Infinity;
    updatePriceRangeSlider(data.priceRange);
    applyFiltersAndRender();
    updateMeta(data);
  } catch (err) {
    console.error('[Results] fetch failed:', err);
    showError(err.message.includes('Failed to fetch')
      ? 'Backend not running. Start with: cd backend && DEMO_MODE=true node server.js'
      : err.message);
  }
}

function showLoading() {
  const c = document.getElementById('resultsContainer');
  c.innerHTML = `
    <div class="loading-state">
      <div class="loading-msg">
        <div class="spinner"></div>
        <span>Searching RedBus & AbhiBus for ${state.query.fromName} → ${state.query.toName}…</span>
      </div>
      ${[1,2,3,4].map(() => `
        <div class="skeleton-card">
          <div></div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <div class="skeleton-line" style="width:60%;height:16px"></div>
            <div class="skeleton-line" style="width:40%;height:12px"></div>
          </div>
          <div class="skeleton-line" style="width:60px;height:36px"></div>
          <div class="skeleton-line" style="width:80px;height:40px"></div>
        </div>`).join('')}
    </div>`;
}

function showError(msg) {
  document.getElementById('resultsContainer').innerHTML = `
    <div class="error-state">
      <strong>⚠️ Could not load results</strong><br>
      <p style="margin-top:8px;font-size:13px">${msg}</p>
      <button onclick="fetchResults()" style="margin-top:14px;padding:8px 20px;background:#0770e3;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;">Try again</button>
    </div>`;
}

function updateMeta(data) {
  const meta = document.getElementById('resultsMeta');
  if (meta) meta.innerHTML = `<strong>${data.results.length} result${data.results.length !== 1 ? 's' : ''}</strong>
    · ${state.query.fromName} → ${state.query.toName} · ${formatDate(state.query.date)} · ${state.query.passengers} adult${state.query.passengers > 1 ? 's' : ''}
    <span style="margin-left:8px;font-size:12px;color:#9b9fad">via ${data.sources?.join(', ')}</span>`;
}

function updatePriceRangeSlider(priceRange) {
  const slider = document.getElementById('priceRange');
  const maxLbl = document.getElementById('priceMaxLabel');
  const valLbl = document.getElementById('priceRangeVal');
  if (!slider || !priceRange) return;
  const max = Math.ceil(priceRange.max / 100) * 100;
  slider.max   = max;
  slider.value = max;
  if (maxLbl) maxLbl.textContent = `₹${max}`;
  if (valLbl) valLbl.textContent = max;
}

// ── Filters ───────────────────────────────────────────────────────────────────
function setupFilters() {
  // Price range
  const slider = document.getElementById('priceRange');
  if (slider) {
    slider.addEventListener('input', () => {
      state.filters.maxPrice = parseInt(slider.value);
      document.getElementById('priceRangeVal').textContent = slider.value;
      applyFiltersAndRender();
    });
  }

  // Departure time
  document.querySelectorAll('.dep-time-filter').forEach(cb => {
    cb.addEventListener('change', () => {
      state.filters.departureTimes = [...document.querySelectorAll('.dep-time-filter:checked')].map(c => c.value);
      applyFiltersAndRender();
    });
  });

  // Bus type
  document.querySelectorAll('.bus-type-filter').forEach(cb => {
    cb.addEventListener('change', () => {
      state.filters.busTypes = [...document.querySelectorAll('.bus-type-filter:checked')].map(c => c.value);
      applyFiltersAndRender();
    });
  });

  // Amenities
  document.querySelectorAll('.amenity-filter').forEach(cb => {
    cb.addEventListener('change', () => {
      state.filters.amenities = [...document.querySelectorAll('.amenity-filter:checked')].map(c => c.value);
      applyFiltersAndRender();
    });
  });

  // Sources
  document.querySelectorAll('.source-filter').forEach(cb => {
    cb.addEventListener('change', () => {
      state.filters.sources = [...document.querySelectorAll('.source-filter:checked')].map(c => c.value);
      applyFiltersAndRender();
    });
  });

  // Reset
  document.getElementById('resetFilters')?.addEventListener('click', resetFilters);
}

function resetFilters() {
  document.querySelectorAll('.filters-sidebar input[type="checkbox"]').forEach(cb => cb.checked = cb.classList.contains('source-filter') ? true : false);
  const slider = document.getElementById('priceRange');
  if (slider) { slider.value = slider.max; document.getElementById('priceRangeVal').textContent = slider.max; }
  state.filters = { maxPrice: Infinity, departureTimes: [], busTypes: [], amenities: [], sources: ['redbus','abhibus'] };
  applyFiltersAndRender();
}

function applyFiltersAndRender() {
  let results = [...state.allResults];

  if (state.filters.maxPrice !== Infinity) {
    results = results.filter(r => r.pricing.fare <= state.filters.maxPrice);
  }
  if (state.filters.departureTimes.length > 0) {
    results = results.filter(r => {
      const hour = parseInt(r.departure.time.split(':')[0]);
      return state.filters.departureTimes.some(range => {
        if (range === 'early')     return hour < 6;
        if (range === 'morning')   return hour >= 6  && hour < 12;
        if (range === 'afternoon') return hour >= 12 && hour < 18;
        if (range === 'evening')   return hour >= 18;
        return false;
      });
    });
  }
  if (state.filters.busTypes.length > 0) {
    results = results.filter(r => state.filters.busTypes.some(t => r.bus.code.includes(t)));
  }
  if (state.filters.amenities.length > 0) {
    results = results.filter(r => state.filters.amenities.every(a => r.bus.amenities.includes(a)));
  }
  if (state.filters.sources.length > 0) {
    results = results.filter(r => state.filters.sources.includes(r.source));
  }

  // Sort
  results = sortResults(results, state.sortBy);

  state.filtered = results;
  renderResults(results);
}

function sortResults(results, by) {
  const sorted = [...results];
  switch (by) {
    case 'price':     return sorted.sort((a,b) => a.pricing.fare - b.pricing.fare);
    case 'duration':  return sorted.sort((a,b) => a.duration - b.duration);
    case 'departure': return sorted.sort((a,b) => a.departure.time.localeCompare(b.departure.time));
    case 'rating':    return sorted.sort((a,b) => b.operator.rating - a.operator.rating);
    default:          return sorted; // already best-scored from API
  }
}

// ── Sort pills ────────────────────────────────────────────────────────────────
function setupSortPills() {
  document.querySelectorAll('.sort-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.sort-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.sortBy = pill.dataset.sort;
      applyFiltersAndRender();
    });
  });
}

// ── Render results ────────────────────────────────────────────────────────────
function renderResults(results) {
  const container = document.getElementById('resultsContainer');

  if (!results.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="es-icon">🚌</div>
        <h3>No buses found</h3>
        <p>Try adjusting your filters or changing the travel date</p>
      </div>`;
    return;
  }

  container.innerHTML = results.map((r, i) => renderCard(r, i)).join('');

  // Attach click handlers
  container.querySelectorAll('.btn-select').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const tripId = btn.dataset.tripid;
      openSeatModal(tripId);
    });
  });
  container.querySelectorAll('.result-card').forEach(card => {
    card.addEventListener('click', () => {
      const tripId = card.dataset.tripid;
      openSeatModal(tripId);
    });
  });
}

function renderCard(r, index) {
  const ratingClass = r.operator.rating >= 8.5 ? 'high' : r.operator.rating < 7 ? 'low' : '';
  const ratingWord  = r.operator.rating >= 9 ? 'Outstanding' : r.operator.rating >= 8 ? 'Excellent' : r.operator.rating >= 7 ? 'Good' : 'Average';
  const logoColor   = LOGO_COLORS[index % LOGO_COLORS.length];
  const logoAbbr    = r.operator.name.split(' ').map(w => w[0]).join('').slice(0,3);

  const cardClass   = r.bestValue ? 'best-value' : r.cheapest ? 'cheapest' : '';
  const sourceTag   = r.source === 'redbus'
    ? '<span class="tag source-rb">redBus</span>'
    : '<span class="tag source-ab">AbhiBus</span>';

  const amenityTags = r.bus.amenities.slice(0,3).map(a => {
    const map = { wifi:'📶 WiFi', usb:'🔌 USB', ac:'❄️ A/C', sleeper:'🛏 Sleeper', charging:'⚡', snacks:'🍪 Snacks' };
    return map[a] ? `<span class="tag ${a === 'wifi' ? 'wifi' : ''}">${map[a]}</span>` : '';
  }).join('');

  const badgeTags = [
    r.bestValue ? '<span class="tag best">⭐ Best value</span>' : '',
    r.cheapest  ? '<span class="tag cheapest">💰 Cheapest</span>' : '',
    r.fastest   ? '<span class="tag fastest">⚡ Fastest</span>' : '',
    r.seats.lastFew ? `<span class="tag hurry">🔥 ${r.seats.available} seats left</span>` : '',
  ].filter(Boolean).join('');

  return `
    <div class="result-card ${cardClass}" data-tripid="${r.id}" style="animation: fadeInUp 0.3s ease ${index * 0.04}s both">
      <div class="op-logo" style="background:${logoColor}">${logoAbbr}</div>

      <div class="journey-col">
        <div class="times-row">
          <div class="dep-time">${r.departure.time}</div>
          <div class="route-line">
            <div class="route-bar">
              <div class="route-line-seg"></div>
              <span class="bus-mid-icon">🚌</span>
              <div class="route-line-seg"></div>
            </div>
            <div class="duration-txt">${r.durationText}</div>
          </div>
          <div class="arr-time-wrap">
            <span class="arr-time">${r.arrival.time}</span>
            ${r.arrival.overnight ? '<span class="overnight-badge">+1</span>' : ''}
          </div>
        </div>
        <div class="tags-row">
          <span class="tag direct">Direct</span>
          ${sourceTag}
          ${amenityTags}
          ${badgeTags}
        </div>
        <div style="font-size:12px;color:#9b9fad;margin-top:5px;font-weight:600">${r.operator.name} · ${r.bus.type} · ${r.seats.available} seats left</div>
      </div>

      <div class="rating-col">
        <div class="rating-badge ${ratingClass}">⭐ ${r.operator.rating.toFixed(1)}</div>
        <div class="rating-label">${ratingWord}</div>
        <div class="rating-label">${(r.operator.reviews/1000).toFixed(1)}k reviews</div>
      </div>

      <div class="price-col">
        <div class="per-person-label">from</div>
        <div class="fare-amount"><sub>₹</sub>${r.pricing.fare}</div>
        <button class="btn-select" data-tripid="${r.id}">Select →</button>
      </div>
    </div>
  `;
}

const LOGO_COLORS = [
  'linear-gradient(135deg,#0770e3,#084980)',
  'linear-gradient(135deg,#e65c00,#f9a825)',
  'linear-gradient(135deg,#11998e,#38ef7d)',
  'linear-gradient(135deg,#7b2ff7,#f107a3)',
  'linear-gradient(135deg,#c0392b,#e74c3c)',
  'linear-gradient(135deg,#00b09b,#96c93d)',
  'linear-gradient(135deg,#fc4a1a,#f7b733)',
  'linear-gradient(135deg,#355c7d,#6c5b7b)',
];

// ── Search Expand ─────────────────────────────────────────────────────────────
function setupSearchExpand() {
  const compactSearch = document.getElementById('compactSearch');
  const panel         = document.getElementById('searchExpandPanel');
  const editBtn       = document.getElementById('csEditBtn');

  if (editBtn) editBtn.addEventListener('click', e => {
    e.stopPropagation();
    const open = panel.style.display !== 'none';
    panel.style.display = open ? 'none' : 'block';
    // Pre-fill
    const d2 = document.getElementById('dateInput2');
    if (d2) d2.value = state.query.date;
    const f2 = document.getElementById('fromInput2');
    if (f2) f2.value = state.query.fromName;
    const t2 = document.getElementById('toInput2');
    if (t2) t2.value = state.query.toName;
  });

  const searchBtn2 = document.getElementById('searchBtn2');
  if (searchBtn2) {
    searchBtn2.addEventListener('click', () => {
      const from = document.getElementById('fromInput2')?.value?.trim();
      const to   = document.getElementById('toInput2')?.value?.trim();
      const date = document.getElementById('dateInput2')?.value;
      if (from) state.query.fromName = from;
      if (to)   state.query.toName   = to;
      if (date) state.query.date     = date;
      if (from) state.query.from     = `c_${from.toLowerCase()}`;
      if (to)   state.query.to       = `c_${to.toLowerCase()}`;
      panel.style.display = 'none';
      updateCompactSearch();
      fetchResults();
    });
  }

  // Swap btn 2
  const swapBtn2 = document.getElementById('swapBtn2');
  if (swapBtn2) {
    swapBtn2.addEventListener('click', e => {
      e.stopPropagation();
      const f = document.getElementById('fromInput2');
      const t = document.getElementById('toInput2');
      if (f && t) { const tmp = f.value; f.value = t.value; t.value = tmp; }
    });
  }
}

// ── Seat Modal ────────────────────────────────────────────────────────────────
function setupSeatModal() {
  document.getElementById('modalClose')?.addEventListener('click', closeSeatModal);
  document.getElementById('seatModal')?.addEventListener('click', e => {
    if (e.target.id === 'seatModal') closeSeatModal();
  });
  document.getElementById('proceedBtn')?.addEventListener('click', proceedToBooking);
}

async function openSeatModal(tripId) {
  const trip = state.allResults.find(r => r.id === tripId);
  if (!trip) return;
  state.selectedTrip  = trip;
  state.selectedSeats = [];

  const modal = document.getElementById('seatModal');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  safeText('modalTitle', `Select seat · ${trip.operator.name} · ${trip.departure.time} → ${trip.arrival.time}`);
  populateBoardingDropdowns(trip);
  resetSeatSummary();

  // Load seat layout
  document.getElementById('seatMapWrap').innerHTML = '<div class="seat-loading"><div class="spinner" style="margin:0 auto 12px"></div>Loading seat map…</div>';

  try {
    const q = state.query;
    const url = `${API_BASE}/search/seats?tripId=${tripId}&from=${q.from}&to=${q.to}&date=${q.date}`;
    const res = await fetch(url);
    const data = await res.json();
    state.seatLayout = data.layout;
    renderSeatMap(data.layout);
  } catch (err) {
    document.getElementById('seatMapWrap').innerHTML = '<div class="seat-loading">⚠️ Could not load seat map. Please try again.</div>';
  }
}

function closeSeatModal() {
  document.getElementById('seatModal').style.display = 'none';
  document.body.style.overflow = '';
  state.selectedSeats = [];
  state.selectedTrip  = null;
}

function populateBoardingDropdowns(trip) {
  const bpSel = document.getElementById('boardingSelect');
  const dpSel = document.getElementById('droppingSelect');
  if (bpSel && trip.boardingPoints?.length) {
    bpSel.innerHTML = trip.boardingPoints.map(bp =>
      `<option value="${bp.id}">${bp.name} — ${bp.time}</option>`
    ).join('');
  }
  if (dpSel && trip.droppingPoints?.length) {
    dpSel.innerHTML = trip.droppingPoints.map(dp =>
      `<option value="${dp.id}">${dp.name} — ${dp.time}</option>`
    ).join('');
  }
}

function renderSeatMap(layout) {
  const deckTabs = document.getElementById('deckTabs');
  const mapWrap  = document.getElementById('seatMapWrap');

  const hasUpper = layout.upper && layout.upper.length > 0;
  deckTabs.innerHTML = `
    <button class="deck-tab active" data-deck="lower">Lower deck</button>
    ${hasUpper ? '<button class="deck-tab" data-deck="upper">Upper deck</button>' : ''}
  `;
  deckTabs.querySelectorAll('.deck-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      deckTabs.querySelectorAll('.deck-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentDeck = btn.dataset.deck;
      renderDeck(layout, btn.dataset.deck, mapWrap);
    });
  });

  renderDeck(layout, 'lower', mapWrap);
}

function renderDeck(layout, deck, container) {
  const rows = layout[deck];
  if (!rows) { container.innerHTML = '<div class="seat-loading">No data for this deck</div>'; return; }

  const seatType = rows[0]?.[0]?.type || 'seater';
  const isSleeper = seatType === 'sleeper';

  let html = '<div class="seat-grid">';
  rows.forEach((row, rowIdx) => {
    html += `<div class="seat-row"><div class="seat-row-label">${rowIdx + 1}</div>`;
    row.forEach((seat, colIdx) => {
      if (colIdx === Math.floor(row.length / 2)) {
        html += '<div class="seat-aisle"></div>';
      }
      html += `<div class="seat ${seat.status} ${isSleeper ? 'sleeper' : ''}"
        data-id="${seat.id}" data-number="${seat.number}" data-fare="${seat.fare}" data-status="${seat.status}">
        ${seat.status === 'booked' ? '✕' : seat.number}
      </div>`;
    });
    html += '</div>';
  });
  html += '</div>';
  container.innerHTML = html;

  // Attach seat click handlers
  container.querySelectorAll('.seat.available, .seat.ladies').forEach(seatEl => {
    seatEl.addEventListener('click', () => toggleSeat(seatEl));
  });
}

function toggleSeat(seatEl) {
  const id    = seatEl.dataset.id;
  const num   = seatEl.dataset.number;
  const fare  = parseInt(seatEl.dataset.fare);
  const idx   = state.selectedSeats.findIndex(s => s.id === id);

  if (idx > -1) {
    state.selectedSeats.splice(idx, 1);
    seatEl.classList.remove('selected');
    seatEl.classList.add('available');
  } else {
    if (state.selectedSeats.length >= state.query.passengers) {
      showToast(`You can only select ${state.query.passengers} seat(s)`, 'error');
      return;
    }
    state.selectedSeats.push({ id, number: num, fare });
    seatEl.classList.remove('available');
    seatEl.classList.add('selected');
  }
  updateSeatSummary();
}

function updateSeatSummary() {
  const info     = document.getElementById('selectedSeatsInfo');
  const summary  = document.getElementById('fareSummary');
  const proceedBtn = document.getElementById('proceedBtn');
  const seatFare = document.getElementById('seatFare');
  const totalFare = document.getElementById('totalFare');

  if (!state.selectedSeats.length) {
    resetSeatSummary(); return;
  }

  info.innerHTML = state.selectedSeats.map(s => `
    <div class="selected-seat-row">
      <span>Seat ${s.number}</span>
      <span>₹${s.fare}</span>
      <span class="remove-seat" data-id="${s.id}">✕</span>
    </div>
  `).join('');

  info.querySelectorAll('.remove-seat').forEach(btn => {
    btn.addEventListener('click', () => {
      const el = document.querySelector(`.seat[data-id="${btn.dataset.id}"]`);
      if (el) { el.classList.remove('selected'); el.classList.add('available'); }
      state.selectedSeats = state.selectedSeats.filter(s => s.id !== btn.dataset.id);
      updateSeatSummary();
    });
  });

  const subtotal = state.selectedSeats.reduce((s, seat) => s + seat.fare, 0);
  const total    = subtotal + 30;
  if (seatFare)  seatFare.textContent  = `₹${subtotal}`;
  if (totalFare) totalFare.textContent = `₹${total}`;
  if (summary)   summary.style.display = 'block';
  if (proceedBtn) proceedBtn.disabled = false;
}

function resetSeatSummary() {
  const info = document.getElementById('selectedSeatsInfo');
  if (info) info.innerHTML = '<p class="no-seat-msg">Tap a seat to select it</p>';
  const summary = document.getElementById('fareSummary');
  if (summary) summary.style.display = 'none';
  const proceedBtn = document.getElementById('proceedBtn');
  if (proceedBtn) proceedBtn.disabled = true;
}

function proceedToBooking() {
  if (!state.selectedSeats.length || !state.selectedTrip) return;

  const bookingData = {
    trip:     state.selectedTrip,
    seats:    state.selectedSeats,
    query:    state.query,
    boarding: document.getElementById('boardingSelect')?.value,
    dropping: document.getElementById('droppingSelect')?.value,
    total:    state.selectedSeats.reduce((s, seat) => s + seat.fare, 0) + 30,
  };

  localStorage.setItem('busscanner_booking', JSON.stringify(bookingData));
  window.location.href = 'booking.html';
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function tomorrowISO() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
}
function safeText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
function showToast(msg, type = '') {
  let container = document.querySelector('.toast-container');
  if (!container) { container = document.createElement('div'); container.className = 'toast-container'; document.body.appendChild(container); }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`; toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => { toast.style.animation = 'slideOutRight 0.3s forwards'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// Add fade-in-up animation
const style = document.createElement('style');
style.textContent = `@keyframes fadeInUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }`;
document.head.appendChild(style);

init();
