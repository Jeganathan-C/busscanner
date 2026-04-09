// frontend/js/search.js
// Handles homepage search form: city autocomplete, passengers, date, navigation

const API_BASE = 'http://localhost:3000/api';

// ── State ──────────────────────────────────────────────────────────────────────
const state = {
  fromCity: null,
  toCity: null,
  adults: 1,
  children: 0,
};

// ── DOM refs ───────────────────────────────────────────────────────────────────
const fromInput     = document.getElementById('fromInput');
const toInput       = document.getElementById('toInput');
const fromDropdown  = document.getElementById('fromDropdown');
const toDropdown    = document.getElementById('toDropdown');
const dateInput     = document.getElementById('dateInput');
const paxWrap       = document.getElementById('paxWrap');
const paxDropdown   = document.getElementById('paxDropdown');
const paxLabel      = document.getElementById('paxLabel');
const adultCount    = document.getElementById('adultCount');
const childCount    = document.getElementById('childCount');
const searchBtn     = document.getElementById('searchBtn');
const swapBtn       = document.getElementById('swapBtn');

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
  // Default date = tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  dateInput.value = tomorrow.toISOString().split('T')[0];
  dateInput.min   = new Date().toISOString().split('T')[0];

  // Return date visibility
  document.querySelectorAll('input[name="tripType"]').forEach(r => {
    r.addEventListener('change', () => {
      const returnGroup = document.getElementById('returnDateGroup');
      if (returnGroup) returnGroup.style.display = r.value === 'return' ? 'flex' : 'none';
    });
  });

  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  // Popular route quick-fill
  document.querySelectorAll('.route-card').forEach(card => {
    card.addEventListener('click', e => {
      e.preventDefault();
      const from = card.dataset.from;
      const to   = card.dataset.to;
      if (from && to) {
        fromInput.value = from;
        toInput.value   = to;
        state.fromCity = { id: `c_${from.toLowerCase()}`, name: from };
        state.toCity   = { id: `c_${to.toLowerCase()}`,   name: to };
        searchBuses();
      }
    });
  });

  setupAutocomplete(fromInput, fromDropdown, 'from');
  setupAutocomplete(toInput,   toDropdown,   'to');
  setupPassengers();
  setupSwap();

  searchBtn.addEventListener('click', searchBuses);

  // Allow Enter key
  [fromInput, toInput, dateInput].forEach(el => {
    el.addEventListener('keypress', e => { if (e.key === 'Enter') searchBuses(); });
  });
}

// ── Autocomplete ──────────────────────────────────────────────────────────────
let allCities = [];
let autocompleteDebounce = null;

async function loadCities() {
  if (allCities.length > 0) return allCities;
  try {
    const res = await fetch(`${API_BASE}/cities`);
    const data = await res.json();
    allCities = data.cities || [];
  } catch {
    // Fallback city list if API not running
    allCities = [
      { id: 'c_chennai',    name: 'Chennai',     state: 'Tamil Nadu' },
      { id: 'c_bangalore',  name: 'Bangalore',   state: 'Karnataka' },
      { id: 'c_mumbai',     name: 'Mumbai',      state: 'Maharashtra' },
      { id: 'c_delhi',      name: 'Delhi',       state: 'Delhi' },
      { id: 'c_hyderabad',  name: 'Hyderabad',   state: 'Telangana' },
      { id: 'c_coimbatore', name: 'Coimbatore',  state: 'Tamil Nadu' },
      { id: 'c_madurai',    name: 'Madurai',     state: 'Tamil Nadu' },
      { id: 'c_pondicherry',name: 'Pondicherry', state: 'Puducherry' },
      { id: 'c_ooty',       name: 'Ooty',        state: 'Tamil Nadu' },
      { id: 'c_mysore',     name: 'Mysore',      state: 'Karnataka' },
      { id: 'c_mangalore',  name: 'Mangalore',   state: 'Karnataka' },
      { id: 'c_pune',       name: 'Pune',        state: 'Maharashtra' },
      { id: 'c_kolkata',    name: 'Kolkata',     state: 'West Bengal' },
      { id: 'c_jaipur',     name: 'Jaipur',      state: 'Rajasthan' },
      { id: 'c_agra',       name: 'Agra',        state: 'Uttar Pradesh' },
    ];
  }
  return allCities;
}

function setupAutocomplete(input, dropdown, which) {
  input.addEventListener('input', async () => {
    clearTimeout(autocompleteDebounce);
    const q = input.value.trim();
    if (q.length < 1) { closeDropdown(dropdown); return; }

    autocompleteDebounce = setTimeout(async () => {
      const cities = await loadCities();
      const filtered = cities.filter(c =>
        c.name.toLowerCase().startsWith(q.toLowerCase())
      ).slice(0, 8);
      renderDropdown(dropdown, filtered, input, which);
    }, 200);
  });

  input.addEventListener('focus', async () => {
    if (input.value.length > 0) {
      const cities = await loadCities();
      const filtered = cities.filter(c =>
        c.name.toLowerCase().startsWith(input.value.toLowerCase())
      ).slice(0, 8);
      if (filtered.length) renderDropdown(dropdown, filtered, input, which);
    }
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDropdown(dropdown);
  });
}

function renderDropdown(dropdown, cities, input, which) {
  if (!cities.length) { closeDropdown(dropdown); return; }
  dropdown.innerHTML = cities.map(c => `
    <div class="autocomplete-item" data-id="${c.id}" data-name="${c.name}">
      <span>🏙️</span>
      <span class="city-name">${c.name}</span>
      <span class="city-state">${c.state}</span>
    </div>
  `).join('');

  dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
    item.addEventListener('mousedown', e => {
      e.preventDefault();
      const name = item.dataset.name;
      const id   = item.dataset.id;
      input.value = name;
      if (which === 'from') state.fromCity = { id, name };
      else                  state.toCity   = { id, name };
      closeDropdown(dropdown);
    });
  });

  dropdown.classList.add('open');
}

function closeDropdown(dropdown) { dropdown.classList.remove('open'); dropdown.innerHTML = ''; }

// Close dropdowns on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('.field-group')) {
    closeDropdown(fromDropdown);
    closeDropdown(toDropdown);
  }
  if (!e.target.closest('.pax-wrap')) {
    paxDropdown.classList.remove('open');
  }
});

// ── Swap ──────────────────────────────────────────────────────────────────────
function setupSwap() {
  swapBtn.addEventListener('click', e => {
    e.stopPropagation();
    const tmpVal = fromInput.value;
    fromInput.value = toInput.value;
    toInput.value   = tmpVal;
    const tmpState  = state.fromCity;
    state.fromCity  = state.toCity;
    state.toCity    = tmpState;
  });
}

// ── Passengers ────────────────────────────────────────────────────────────────
function setupPassengers() {
  paxWrap.addEventListener('click', e => {
    e.stopPropagation();
    paxDropdown.classList.toggle('open');
  });

  document.querySelectorAll('.pax-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const type = btn.dataset.type;
      if (btn.classList.contains('plus')) {
        if (type === 'adult' && state.adults < 6) state.adults++;
        if (type === 'child' && state.children < 4) state.children++;
      } else {
        if (type === 'adult' && state.adults > 1) state.adults--;
        if (type === 'child' && state.children > 0) state.children--;
      }
      updatePaxUI();
    });
  });

  document.getElementById('paxDone').addEventListener('click', () => {
    paxDropdown.classList.remove('open');
  });
}

function updatePaxUI() {
  adultCount.textContent = state.adults;
  childCount.textContent = state.children;
  const total = state.adults + state.children;
  paxLabel.textContent = total === 1
    ? '1 Adult'
    : `${state.adults} Adult${state.adults > 1 ? 's' : ''}${state.children > 0 ? `, ${state.children} Child${state.children > 1 ? 'ren' : ''}` : ''}`;

  // Disable minus buttons at minimum
  document.querySelectorAll('.pax-btn.minus').forEach(btn => {
    const type = btn.dataset.type;
    btn.disabled = type === 'adult' ? state.adults <= 1 : state.children <= 0;
  });
  document.querySelectorAll('.pax-btn.plus').forEach(btn => {
    const type = btn.dataset.type;
    btn.disabled = type === 'adult' ? state.adults >= 6 : state.children >= 4;
  });
}

// ── Search ─────────────────────────────────────────────────────────────────────
function searchBuses() {
  const from = fromInput.value.trim();
  const to   = toInput.value.trim();
  const date = dateInput.value;

  if (!from) { showToast('Please enter a departure city', 'error'); fromInput.focus(); return; }
  if (!to)   { showToast('Please enter a destination city', 'error'); toInput.focus(); return; }
  if (from.toLowerCase() === to.toLowerCase()) { showToast('Origin and destination cannot be the same', 'error'); return; }
  if (!date) { showToast('Please select a travel date', 'error'); dateInput.focus(); return; }

  const fromId = state.fromCity?.id || `c_${from.toLowerCase().replace(/\s+/g, '_')}`;
  const toId   = state.toCity?.id   || `c_${to.toLowerCase().replace(/\s+/g, '_')}`;
  const pax    = state.adults + state.children;

  searchBtn.textContent = '⏳ Searching...';
  searchBtn.disabled    = true;

  const params = new URLSearchParams({ from: fromId, to: toId, date, passengers: pax, fromName: from, toName: to });
  setTimeout(() => {
    window.location.href = `results.html?${params.toString()}`;
  }, 300);
}

// ── Toast ──────────────────────────────────────────────────────────────────────
function showToast(msg, type = '') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

init();
