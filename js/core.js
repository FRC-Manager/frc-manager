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
  U.money = v => (v < 0 ? '-$' : '$') + Math.abs(Math.round(v)).toLocaleString('en-US');
  U.kmoney = v => { const a = Math.abs(v); const s = v < 0 ? '-$' : '$'; return a >= 1000 ? s + (a / 1000).toFixed(a >= 10000 ? 0 : 1) + 'k' : s + Math.round(a); };
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
  G.VERSION = '2.2';

  // ---------- Save system ----------
  const KEY = 'frcm_save_';
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
  Save.meta = function (slot) {
    try {
      const raw = localStorage.getItem(KEY + slot);
      if (!raw) return null;
      const s = JSON.parse(raw);
      return { slot, team: s.team, year: s.year, mode: s.mode, phase: s.phase, savedAt: s.savedAt, money: s.money, si: s.si };
    } catch (e) { return null; }
  };
  Save.load = function (slot) {
    try {
      const raw = localStorage.getItem(KEY + slot);
      if (!raw) return false;
      G.S = JSON.parse(raw);
      G.R = new Rng(G.S.rngS || 12345);
      if (G.Shop) G.Shop.migrate(G.S); // older saves: equipment flags → facility levels
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
    try { return JSON.parse(localStorage.getItem('frcm_settings') || '{}'); } catch (e) { return {}; }
  };
  Save.saveSettings = function (o) { try { localStorage.setItem('frcm_settings', JSON.stringify(o)); } catch (e) { } };
})();
