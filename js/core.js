'use strict';
/* FRC Manager — core utilities, RNG, save system */
window.G = window.G || {};

(function () {
  // ---------- Seeded RNG (mulberry32 with exposed state) ----------
  function Rng(seed) { this.s = (seed >>> 0) || 1; }
  Rng.prototype.next = function () {
    let a = (this.s = (this.s + 0x6D2B79F5) | 0);
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  Rng.prototype.r = function () { return this.next(); };
  Rng.prototype.range = function (a, b) { return a + (b - a) * this.next(); };
  Rng.prototype.int = function (a, b) { return a + Math.floor(this.next() * (b - a + 1)); };
  Rng.prototype.chance = function (p) { return this.next() < p; };
  Rng.prototype.pick = function (arr) { return arr[Math.floor(this.next() * arr.length)]; };
  Rng.prototype.norm = function (mu, sd) {
    let u = 0, v = 0;
    while (u === 0) u = this.next();
    while (v === 0) v = this.next();
    return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  Rng.prototype.shuffle = function (arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };
  Rng.prototype.wpick = function (items, wfn) {
    let tot = 0; const ws = items.map(it => { const w = Math.max(0, wfn(it)); tot += w; return w; });
    if (tot <= 0) return items[Math.floor(this.next() * items.length)];
    let x = this.next() * tot;
    for (let i = 0; i < items.length; i++) { x -= ws[i]; if (x <= 0) return items[i]; }
    return items[items.length - 1];
  };
  G.Rng = Rng;
  G.makeRng = seed => new Rng(seed);
  G.R = new Rng(Date.now() & 0xffffffff); // global game RNG; re-seeded from save

  // ---------- Utilities ----------
  const U = G.U = {};
  U.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.sum = arr => arr.reduce((s, x) => s + x, 0);
  U.avg = arr => arr.length ? U.sum(arr) / arr.length : 0;
  U.round = (v, d = 0) => { const k = Math.pow(10, d); return Math.round(v * k) / k; };
  // Money. Every amount in the game is kept in 2026 dollars and shown in the dollars of the career's current year
  // (the price index, G.Data.PRICE_IDX). px: a stored index for amounts from another year (history, ledger); 1 = as is.
  U.px = () => { const S = G.S, T = G.Data && G.Data.PRICE_IDX; return S && S.pxY && T ? (T[S.pxY] || 1) : 1; };
  U.pxOf = y => { const T = G.Data && G.Data.PRICE_IDX; return (T && T[y]) || 1; };
  U.money = (v, px) => { v *= (px == null ? U.px() : px); return (v < 0 ? '-$' : '$') + Math.abs(Math.round(v)).toLocaleString('en-US'); };
  U.kmoney = (v, px) => { v *= (px == null ? U.px() : px); const a = Math.abs(v); const s = v < 0 ? '-$' : '$'; return a >= 1000 ? s + (a / 1000).toFixed(a >= 10000 ? 0 : 1) + 'k' : s + Math.round(a); };
  // static help text: literal 2026-dollar amounts ("$1,000", "$12k") become the career's current dollars
  U.infl = (str, px) => String(str).replace(/\$(\d[\d,]*)(k?)/g, (m, n, k) => { const v = Number(n.replace(/,/g, '')) * (k ? 1000 : 1); return k ? U.kmoney(v, px) : U.money(v, px); });
  U.pct = v => Math.round(v * 100) + '%';
  U.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.clone = o => JSON.parse(JSON.stringify(o));
  let _uid = 0;
  U.uid = (p = 'id') => p + '_' + Date.now().toString(36) + '_' + (++_uid).toString(36) + Math.floor(Math.random() * 1e4).toString(36);
  U.byId = (arr, id) => arr.find(x => x.id === id);
  U.stars = n => '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n));
  U.ord = n => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
  U.fmtTime = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  // ---------- Version (shown in game; see G.RELEASES in ui/screens-menu.js) ----------
  G.VERSION = '3.6';
  // A beta is published beside the stable game on the same web address, and a browser keeps one store for everything
  // at that address (and one for every page opened from a file). So a beta keeps its own saves and settings: it never
  // touches the stable game's. '' for a stable release.
  G.BETA = '';

  // ---------- Save system ----------
  const KEY = G.BETA ? 'frcm_beta_save_' : 'frcm_save_', SET_KEY = G.BETA ? 'frcm_beta_settings' : 'frcm_settings';
  const BETA_KEY = 'frcm_beta_save_';                                                  // (3.6) where the new-interface beta (3.5.4b to 3.5.7b) kept its careers, at the same address
  const Save = G.Save = {};
  Save.slots = ['auto', '1', '2', '3'];
  Save.write = function (slot) {
    if (!G.S) return false;
    try {
      G.S.rngS = G.R.s;
      G.S.savedAt = Date.now();
      localStorage.setItem(KEY + slot, JSON.stringify(G.S));
      return true;
    } catch (e) { console.warn('Save failed', e); return false; }
  };
  Save.meta = function (slot, beta) {
    try {
      const raw = localStorage.getItem((beta ? BETA_KEY : KEY) + slot);
      if (!raw) return null;
      const s = JSON.parse(raw);
      return { slot, team: s.team, year: s.year, cy: s.cal && s.cal.length ? s.cal[Math.min(s.cal.length - 1, Math.max(0, s.si))] : s.year, mode: s.mode, phase: s.phase, savedAt: s.savedAt, money: s.money, px: U.pxOf(s.pxY), si: s.si };
    } catch (e) { return null; }
  };
  // beta (3.6): a career of the new-interface beta, read from where the beta kept it. It was played in the new interface
  Save.load = function (slot, beta) {
    try {
      const raw = localStorage.getItem((beta ? BETA_KEY : KEY) + slot);
      if (!raw) return false;
      G.S = JSON.parse(raw);
      G.R = new Rng(G.S.rngS || 12345);
      if (G.Shop) G.Shop.migrate(G.S); // older saves: equipment flags → facility levels
      if (beta && !G.S.ui) G.S.ui = 'new';
      // (3.6) a career opens in its own interface. If that is not the one this page started with, the page starts again
      // with the right one and comes back to this career: nothing is opened here (the caller sees "not loaded")
      if (G.uiMismatch()) { G.uiRestart(G.uiOf(G.S), slot, '', beta); return false; }
      G.uiSeen();
      return true;
    } catch (e) { console.warn('Load failed', e); return false; }
  };
  Save.remove = function (slot) { try { localStorage.removeItem(KEY + slot); } catch (e) { } };
  Save.exportText = function () {
    if (!G.S) return '';
    G.S.rngS = G.R.s;
    return JSON.stringify(G.S);
  };
  Save.importText = function (text, cb) {
    try {
      const s = JSON.parse(String(text).trim());
      if (!s || !s.team || !s.v) throw new Error('this is not a FRC Manager save');
      G.S = s; G.R = new Rng(s.rngS || 777);
      if (G.Shop) G.Shop.migrate(G.S);
      // (3.6) a save brought in from a file opens in its own interface too. It is in no slot yet, so it is written to the
      // autosave first (as it would be at its first week anyway) and the page comes back to that
      if (G.uiMismatch()) { if (Save.write('auto')) { G.uiRestart(G.uiOf(G.S), 'auto'); return; } }
      G.uiSeen();
      cb(true);
    } catch (e) { cb(false, e.message); }
  };
  Save.importFile = function (file, cb) {
    const fr = new FileReader();
    fr.onload = () => Save.importText(fr.result, cb);
    fr.onerror = () => cb(false, 'the file could not be read');
    fr.readAsText(file);
  };
  Save.settings = function () {
    try { return JSON.parse(localStorage.getItem(SET_KEY) || '{}'); } catch (e) { return {}; }
  };
  Save.saveSettings = function (o) { try { localStorage.setItem(SET_KEY, JSON.stringify(o)); } catch (e) { } };
  Save.betaSlots = () => (G.BETA ? [] : Save.slots.filter(s => { try { return !!localStorage.getItem(BETA_KEY + s); } catch (e) { return false; } }));

  // ---------- Two interfaces (3.6) ----------
  // The game has two interfaces: the new one (pages in groups, tiles, hover cards, side windows, an exploded Garage:
  // js/ui/ui.js and kit.js) and the classic one (js/ui/ui-classic.js). They are whole files, and only one of them is
  // loaded: js/ui/load.js picks it when the page starts (G.UIKIND), so each runs exactly as it did as an edition of its
  // own. Changing interface therefore starts the page again: the game is saved, the page reloads with the other files and
  // comes back to the same career (uiRestart, uiResume).
  // Each career remembers its interface (S.ui). One saved before 3.6 has none and opens in the classic interface until the
  // player switches it in Settings; a new career starts in the new one, unless the player has chosen the classic
  // interface in Settings before (settings.ui). settings.uiLast is the interface of the career last opened: the page
  // starts with that, so Continue rarely has to start it again.
  const UIK = ['new', 'classic'], BOOT_KEY = 'frcm_ui_boot', RES_KEY = 'frcm_resume';
  // one setting, written into what the browser holds now (never a copy read earlier, which may lack what was set since), and into the interface's own copy
  const pref = (k, v) => { const p = Save.settings(); if (p[k] !== v) { p[k] = v; Save.saveSettings(p); } if (G.UI && G.UI.prefs) G.UI.prefs[k] = v; };
  G.uiOf = S => (S && UIK.includes(S.ui) ? S.ui : 'classic');
  G.uiNew = () => (UIK.includes(window.FRCM_UI) ? window.FRCM_UI : UIK.includes(Save.settings().ui) ? Save.settings().ui : 'new');   // the interface a new career starts in
  // which interface this page starts with: what a test page says; else what a restart asked for (once); else the last
  // career's; else the player's choice; else classic if there are saves from before 3.6, new on a fresh start
  G.uiBoot = function () {
    if (UIK.includes(window.FRCM_UI)) return window.FRCM_UI;
    let k = null; try { k = localStorage.getItem(BOOT_KEY); localStorage.removeItem(BOOT_KEY); } catch (e) { k = null; }
    if (UIK.includes(k)) return k;
    const st = Save.settings(); if (UIK.includes(st.uiLast)) return st.uiLast; if (UIK.includes(st.ui)) return st.ui;
    return Save.slots.some(s => { try { return !!localStorage.getItem(KEY + s); } catch (e) { return false; } }) ? 'classic' : 'new';
  };
  // a career is open in the wrong interface (never in a test page, which says which interface it wants, nor while resuming)
  G.uiMismatch = () => !!(G.S && G.UIKIND && !window.FRCM_UI && !G.uiNoRestart && G.uiOf(G.S) !== G.UIKIND);
  G.uiSeen = () => { if (G.S && G.UIKIND && !window.FRCM_UI) pref('uiLast', G.uiOf(G.S)); };
  G.uiReload = () => { location.reload(); };
  // start the page again with interface `kind`, and come back to the career in `slot` (page: 'settings' or 'start')
  G.uiRestart = function (kind, slot, page, beta) {
    try { localStorage.setItem(BOOT_KEY, kind); if (slot) localStorage.setItem(RES_KEY, JSON.stringify({ slot, page: page || '', beta: !!beta, t: Date.now() })); } catch (e) { return false; }
    try { document.documentElement.style.visibility = 'hidden'; } catch (e) { /* no page to hide */ }
    G.uiRestarting = true;                                                             // (what asked for the career need not say it could not load)
    G.uiReload();
    return true;
  };
  // at the start of the page: the career a restart left to come back to, if any (asked for within the last minute)
  G.uiResume = function () {
    let r = null; try { r = JSON.parse(localStorage.getItem(RES_KEY) || 'null'); localStorage.removeItem(RES_KEY); } catch (e) { r = null; }
    if (!r || !r.slot || !(Date.now() - (r.t || 0) < 60000)) return false;
    G.uiNoRestart = true; let ok = false; try { ok = Save.load(r.slot, r.beta); } finally { G.uiNoRestart = false; }
    if (!ok) return false;
    const UI = G.UI; UI.go(G.S.phase === 'end' ? 'end' : G.S.event ? 'event' : 'hq');
    if (r.page === 'settings') UI.go('settings'); else if (r.page === 'start' && UI.afterStart) UI.afterStart();
    return true;
  };
  // Settings on the main menu, with no career open: the interface the careers started from now on begin in
  G.uiPrefer = function (kind) { if (!UIK.includes(kind)) return false; pref('ui', kind); return true; };
  // the player's switch in Settings: this career changes interface, and so do the careers started from now on
  G.uiSwitch = function (kind) {
    if (!G.S || !UIK.includes(kind) || (G.uiOf(G.S) === kind && G.UIKIND === kind)) return false;
    const was = G.S.ui; G.S.ui = kind;
    if (!Save.write('auto')) { if (was === undefined) delete G.S.ui; else G.S.ui = was; return false; }    // not saved: nothing changes
    pref('ui', kind); pref('uiLast', kind);
    if (G.UIKIND === kind) return true;
    return G.uiRestart(kind, 'auto', 'settings');
  };
})();
