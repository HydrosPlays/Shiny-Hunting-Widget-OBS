/**
 * Shiny Hunt Counter — zero-dependency Node server.
 *
 * Holds the counter state, serves the OBS overlay + control panel, and pushes
 * live updates to every connected page via Server-Sent Events (SSE) so the
 * overlay updates the instant a Stream Deck button hits an endpoint.
 *
 * Run:  node server.js       (or double-click start.bat)
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PORT = Number(process.env.PORT) || 3620;
const HOST = '0.0.0.0'; // bind to all interfaces so a phone on the LAN can control it too
const PUBLIC_DIR = path.join(__dirname, 'public');
const STATE_FILE = path.join(__dirname, 'state.json');

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const DEFAULT_STATE = {
  pokemon: 'gible',            // PokeAPI species name or id (drives the sprite)
  displayName: 'Gible',        // label shown on the overlay
  method: 'Random Encounter',  // hunting method label
  game: '',                    // optional game label, e.g. "Brilliant Diamond"
  count: 0,                    // total encounters / soft resets this hunt
  phaseCount: 0,               // encounters in the current phase (resets on phase)
  phases: 0,                   // number of phases (wrong shinies) so far
  gen: 8,                      // generation (sets base odds: <=5 => 8192, else 4096)
  shinyCharm: false,           // +2 rolls
  masuda: false,               // +5 rolls (gen5) / +6 (gen6+)
  customOdds: null,            // if set (e.g. 512), overrides the computed denominator
  found: false,                // true => shiny sprite + celebration
  target: null,                // optional target count / goal
  theme: 'dark',               // overlay theme: 'dark' | 'light'
  held: [],                    // parked hunts you can resume later
  caught: [],                  // completed shinies (newest first)
  updatedAt: 0,
};

let state = loadState();

function loadState() {
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed };
  } catch (_) {
    return { ...DEFAULT_STATE };
  }
}

function saveState() {
  state.updatedAt = nowMs();
  try {
    const tmp = STATE_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, STATE_FILE); // atomic-ish replace, avoids half-written files
  } catch (err) {
    console.error('Could not save state.json:', err.message);
  }
}

// Date.now via a helper (kept in one place)
function nowMs() {
  return Date.now();
}

// ---------------------------------------------------------------------------
// Odds math
// ---------------------------------------------------------------------------
function computeOdds(s) {
  if (s.customOdds && Number(s.customOdds) > 0) {
    const denom = Math.round(Number(s.customOdds));
    return { rolls: null, denominator: denom, probability: cumulative(denom, s.count) };
  }
  const base = s.gen <= 5 ? 8192 : 4096;      // Gen 2-5: 1/8192, Gen 6+: 1/4096
  let rolls = 1;                               // full odds = 1 shiny check
  if (s.shinyCharm) rolls += 2;                // Shiny Charm: +2 checks
  if (s.masuda) rolls += s.gen >= 5 ? 5 : 4;   // Masuda: +5 checks (Gen 5+), +4 (Gen 4)
  const denominator = Math.max(1, Math.round(base / rolls));
  return { rolls, denominator, probability: cumulative(denominator, s.count) };
}

// Probability of having seen at least one shiny by `count` tries at 1/denom odds.
function cumulative(denom, count) {
  if (count <= 0) return 0;
  return 1 - Math.pow(1 - 1 / denom, count);
}

function publicState() {
  const odds = computeOdds(state);
  return { ...state, odds };
}

// ---------------------------------------------------------------------------
// SSE (live push to overlay + control panel)
// ---------------------------------------------------------------------------
const clients = new Set();

function broadcast() {
  const payload = 'data: ' + JSON.stringify(publicState()) + '\n\n';
  for (const res of clients) {
    try { res.write(payload); } catch (_) { /* dropped client */ }
  }
}

// keep-alive comment so proxies / OBS don't drop idle SSE connections
setInterval(() => {
  for (const res of clients) {
    try { res.write(': ping\n\n'); } catch (_) {}
  }
}, 15000);

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------
function clampCount(n) { return Math.max(0, Math.round(n)); }

// ----- On-hold hunts (a parking lot you can swap in and out of) -----
let idSeq = 0;
function newId() { return nowMs().toString(36) + '-' + (idSeq++).toString(36); }

// snapshot the active hunt into a portable object for the on-hold list
function snapshotCurrent() {
  return {
    id: newId(),
    pokemon: state.pokemon, displayName: state.displayName, method: state.method, game: state.game,
    count: state.count, phaseCount: state.phaseCount, phases: state.phases,
    gen: state.gen, shinyCharm: state.shinyCharm, masuda: state.masuda, customOdds: state.customOdds,
  };
}
// load a held hunt back into the active slot
function loadHunt(h) {
  state.pokemon = h.pokemon || ''; state.displayName = h.displayName || '';
  state.method = h.method || 'Random Encounter'; state.game = h.game || '';
  state.count = clampCount(h.count || 0); state.phaseCount = clampCount(h.phaseCount || 0); state.phases = clampCount(h.phases || 0);
  state.gen = h.gen || 8; state.shinyCharm = !!h.shinyCharm; state.masuda = !!h.masuda;
  state.customOdds = (h.customOdds === undefined ? null : h.customOdds);
  state.found = false;
}
// clear the active slot to a fresh hunt (keeps how you hunt: method / gen / charm / masuda)
function loadFresh() {
  state.pokemon = ''; state.displayName = ''; state.game = '';
  state.count = 0; state.phaseCount = 0; state.phases = 0; state.found = false; state.customOdds = null;
}
function huntHasProgress() {
  return !!((state.pokemon && String(state.pokemon).trim()) || state.count > 0 || state.phases > 0);
}

const actions = {
  increment(q) {
    const by = Number(q.by) || 1;
    state.count = clampCount(state.count + by);
    state.phaseCount = clampCount(state.phaseCount + by);
  },
  decrement(q) {
    const by = Number(q.by) || 1;
    state.count = clampCount(state.count - by);
    state.phaseCount = clampCount(state.phaseCount - by);
  },
  reset() {
    state.count = 0;
    state.phaseCount = 0;
    state.phases = 0;
    state.found = false;
  },
  set(q) {
    if (q.count !== undefined) state.count = clampCount(Number(q.count));
    if (q.phaseCount !== undefined) state.phaseCount = clampCount(Number(q.phaseCount));
  },
  // Log a phase: a wrong-color shiny / chain break. Bumps phase counter and
  // resets the per-phase count while keeping the running total intact.
  phase() {
    state.phases = clampCount(state.phases + 1);
    state.phaseCount = 0;
  },
  found(q) {
    const on = q.on === undefined ? true : q.on === '1' || q.on === 'true';
    state.found = on;
  },
  toggleFound() {
    state.found = !state.found;
  },
  toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
  },
  // Park the active hunt in the on-hold list, then clear the slot for a new one.
  hold() {
    if (!huntHasProgress()) return;      // nothing meaningful to park
    state.held.push(snapshotCurrent());
    loadFresh();
  },
  // Swap a held hunt back into the active slot; auto-park the current one so it's not lost.
  resume(q) {
    const idx = state.held.findIndex((h) => String(h.id) === String(q.id));
    if (idx === -1) return;
    const hunt = state.held.splice(idx, 1)[0];
    if (huntHasProgress()) state.held.push(snapshotCurrent());
    loadHunt(hunt);
  },
  removeHeld(q) {
    state.held = state.held.filter((h) => String(h.id) !== String(q.id));
  },
  // Mark the current hunt done — archive it to Previous Shinies, clear the slot.
  complete() {
    if (!huntHasProgress()) return;
    state.caught.unshift(snapshotCurrent());   // newest first
    loadFresh();
  },
  removeCaught(q) {
    state.caught = state.caught.filter((c) => String(c.id) !== String(q.id));
  },
  config(q) {
    const strFields = ['pokemon', 'displayName', 'method', 'game'];
    for (const f of strFields) {
      if (q[f] !== undefined) state[f] = String(q[f]);
    }
    if (q.gen !== undefined) state.gen = Math.max(1, Math.min(9, Number(q.gen) || 8));
    if (q.shinyCharm !== undefined) state.shinyCharm = truthy(q.shinyCharm);
    if (q.masuda !== undefined) state.masuda = truthy(q.masuda);
    if (q.target !== undefined) state.target = q.target === '' ? null : clampCount(Number(q.target));
    if (q.customOdds !== undefined) {
      state.customOdds = q.customOdds === '' || Number(q.customOdds) <= 0 ? null : Math.round(Number(q.customOdds));
    }
    if (q.theme !== undefined) state.theme = q.theme === 'light' ? 'light' : 'dark';
    // If they switch Pokemon and don't pass a displayName, prettify the species.
    if (q.pokemon !== undefined && q.displayName === undefined) {
      state.displayName = titleCase(String(q.pokemon).replace(/-/g, ' '));
    }
  },
};

function truthy(v) { return v === '1' || v === 'true' || v === 'on' || v === true; }
function titleCase(s) { return s.replace(/\b\w/g, (c) => c.toUpperCase()); }

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = decodeURIComponent(parsed.pathname);
  const query = parsed.query;

  // Allow any origin (OBS browser source, phone, etc.)
  res.setHeader('Access-Control-Allow-Origin', '*');

  // ---- API ----------------------------------------------------------------
  if (pathname === '/api/state') {
    return sendJson(res, publicState());
  }

  if (pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write('retry: 2000\n\n');
    res.write('data: ' + JSON.stringify(publicState()) + '\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  if (pathname.startsWith('/api/')) {
    const action = pathname.slice('/api/'.length).replace(/\/$/, '');
    const fn = actions[action];
    if (typeof fn !== 'function') {
      return sendJson(res, { ok: false, error: 'unknown action: ' + action }, 404);
    }
    fn(query);
    saveState();
    broadcast();
    return sendJson(res, { ok: true, state: publicState() });
  }

  // ---- Static files -------------------------------------------------------
  let rel = pathname === '/' ? 'widget.html'
          : pathname === '/control' ? 'control.html'
          : pathname.replace(/^\/+/, '');
  const filePath = path.join(PUBLIC_DIR, rel);

  // prevent path traversal outside public/
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
});

function sendJson(res, obj, code = 200) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(obj));
}

server.listen(PORT, HOST, () => {
  const lan = getLanAddress();
  console.log('');
  console.log('  ✨ Shiny Hunt Counter running ✨');
  console.log('  --------------------------------------------------');
  console.log('  OBS overlay  ->  http://localhost:' + PORT + '/');
  console.log('  Control page ->  http://localhost:' + PORT + '/control');
  if (lan) {
    console.log('  Phone/LAN    ->  http://' + lan + ':' + PORT + '/control');
  }
  console.log('  --------------------------------------------------');
  console.log('  Stream Deck endpoints (open these URLs to act):');
  console.log('    +1     http://localhost:' + PORT + '/api/increment');
  console.log('    -1     http://localhost:' + PORT + '/api/decrement');
  console.log('    reset  http://localhost:' + PORT + '/api/reset');
  console.log('    phase  http://localhost:' + PORT + '/api/phase');
  console.log('    found  http://localhost:' + PORT + '/api/toggleFound');
  console.log('');
  console.log('  Leave this window open while streaming. Ctrl+C to stop.');
  console.log('');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('\n  Port ' + PORT + ' is already in use.');
    console.error('  Close the other program, or start with a different port:');
    console.error('    set PORT=3720 && node server.js\n');
  } else {
    console.error(err);
  }
  process.exit(1);
});

function getLanAddress() {
  try {
    const os = require('os');
    const ifaces = os.networkInterfaces();
    for (const name of Object.keys(ifaces)) {
      for (const iface of ifaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) return iface.address;
      }
    }
  } catch (_) {}
  return null;
}
