'use strict';
/* FRC Manager — 90-second reveal video (1920×1080, 30 fps).
   Scenes are drawn on a canvas with the game's own match engine, renderer, world simulation and map geometry, plus real
   screens captured from the game (media/reveal-shots/*.png, 1440×900 at 1.5×). The soundtrack is synthesized with an
   OfflineAudioContext (120 BPM, 2-second bars; scene cuts sit on bar lines).
   Render MP4: WebCodecs (H.264 + AAC) → mp4-muxer → POST /__save (local server) or a browser download. */
(function () {
  const W = 1920, H = 1080, FPS = 30, DUR = 90, NF = FPS * DUR;
  // the canvas drawn on: the one on the page, or (while rendering) one off the page, which the browser never holds back
  const cvPage = document.getElementById('cv'), ctxPage = cvPage.getContext('2d');
  let cv = cvPage, ctx = ctxPage;
  const U = G.U, Rd = G.Render, E = G.Engine;
  const C = { bg: '#080b0f', panel: '#121821', panel2: '#1a222c', line: '#2a3540', text: '#eef2f6', muted: '#9aa7b4', dim: '#6c7884',
    acc: '#f5b800', acc2: '#ffd24d', red: '#e5484d', blue: '#3e8cff', good: '#3ecf8e', warn: '#ffb020', bad: '#ff5c5c', vio: '#9b8cff', cyan: '#3fd0e0' };
  const FD = 'Rajdhani, "Arial Narrow", sans-serif', FB = 'Inter, system-ui, sans-serif';
  const TEAM = 4321, TC1 = '#f5b800', TC2 = '#ffffff';
  const URL_TXT = 'frc-manager.github.io/frc-manager';

  // ---------------------------------------------------------------- helpers
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, k) => a + (b - a) * k;
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const eo = k => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
  const eio = k => { k = clamp(k, 0, 1); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
  const back = k => { k = clamp(k, 0, 1); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
  const vis = (t, a, b, fi, fo) => Math.min(eo(seg(t, a, a + (fi || 0.3))), 1 - seg(t, b - (fo || 0.3), b));
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  function txt(s, x, y, o) {
    o = o || {};
    ctx.save();
    ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    ctx.font = (o.weight || 700) + ' ' + (o.size || 40) + 'px ' + (o.font || FD);
    ctx.fillStyle = o.color || C.text; ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic';
    if (o.spacing != null) ctx.letterSpacing = o.spacing + 'px';
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.blur || 30; }
    if (o.stroke) { ctx.lineWidth = o.lw || 6; ctx.strokeStyle = o.stroke; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
    if (!o.noFill) ctx.fillText(s, x, y);
    const w = ctx.measureText(s).width;
    ctx.restore();
    return w;
  }
  function tw(s, size, o) { o = o || {}; ctx.save(); ctx.font = (o.weight || 700) + ' ' + size + 'px ' + (o.font || FD); ctx.letterSpacing = (o.spacing || 0) + 'px'; const w = ctx.measureText(s).width; ctx.restore(); return w; }
  // slide-up reveal
  function rtxt(s, x, y, t, a, b, o) {
    const v = vis(t, a, b, o && o.fi || 0.35, o && o.fo || 0.3);
    if (v <= 0) return;
    txt(s, x, y + (1 - v) * 28, Object.assign({}, o, { alpha: (o && o.alpha != null ? o.alpha : 1) * v }));
  }
  // words that slam in one after another: scale from big to normal with a motion trail
  function slam(s, x, y, t, a, o) {
    o = o || {};
    const k = seg(t, a, a + (o.d || 0.22)); if (k <= 0) return;
    const sc = lerp(o.from || 1.8, 1, eo(k)), al = (o.alpha == null ? 1 : o.alpha) * eo(k);
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    if (k < 1) for (let i = 3; i >= 1; i--) txt(s, 0, 0, Object.assign({}, o, { alpha: al * 0.12 * (4 - i), glow: null, color: o.trail || C.acc }));
    txt(s, 0, 0, Object.assign({}, o, { alpha: al }));
    ctx.restore();
  }
  function rr(x, y, w, h, r, fill, stroke, lw) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = lw || 2; ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  function wrap(s, maxW, font) {
    ctx.save(); ctx.font = font; const words = s.split(' '), lines = []; let cur = '';
    words.forEach(w => { const tryL = cur ? cur + ' ' + w : w; if (ctx.measureText(tryL).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tryL; });
    if (cur) lines.push(cur); ctx.restore(); return lines;
  }
  const num = v => Math.round(v).toLocaleString('en-US');

  // background: dark, drifting grid, optional glow
  function bg(t, o) {
    o = o || {};
    ctx.fillStyle = o.color || C.bg; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = o.grid == null ? 0.06 : o.grid; ctx.strokeStyle = '#8fa3b8'; ctx.lineWidth = 1;
    const off = (t * 18) % 60;
    for (let x = -60 + off; x < W + 60; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = -60 + off * 0.5; y < H + 60; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore();
    if (o.glow) glow(o.glow.x, o.glow.y, o.glow.r, o.glow.c);
  }
  function glow(x, y, r, c) { const g = ctx.createRadialGradient(x, y, 4, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
  function vignette(k) {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,' + (k == null ? 0.65 : k) + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function kicker(s, x, y, alpha, col) {
    if (alpha <= 0) return;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = col || C.acc; ctx.fillRect(x, y - 22, 6, 28);
    txt(s.toUpperCase(), x + 20, y, { font: FB, weight: 800, size: 24, color: col || C.acc, spacing: 4 });
    ctx.restore();
  }
  // floating game pieces
  const PARTS = (function () { const r = G.makeRng(31), out = []; for (let i = 0; i < 70; i++) out.push({ x: r.next() * W, y: r.next() * H, s: 5 + r.next() * 14, v: 20 + r.next() * 60, k: r.int(0, 4), p: r.next() * 6.28 }); return out; })();
  function particles(t, alpha) {
    const cols = ['#ffd84a', '#ff9a3c', '#3fd0b0', '#9b6bff', '#ffd23f'];
    ctx.save();
    PARTS.forEach(p => {
      const y = ((p.y - t * p.v) % (H + 80) + H + 80) % (H + 80) - 40, x = p.x + Math.sin(t * 0.7 + p.p) * 18;
      ctx.globalAlpha = alpha * (0.2 + 0.3 * (p.s / 20));
      ctx.fillStyle = cols[p.k];
      if (p.k === 1) { ctx.beginPath(); ctx.arc(x, y, p.s, 0, 7); ctx.lineWidth = p.s * 0.45; ctx.strokeStyle = cols[1]; ctx.stroke(); }
      else if (p.k === 3) ctx.fillRect(x - p.s * 0.8, y - p.s * 0.8, p.s * 1.6, p.s * 1.6);
      else { ctx.beginPath(); ctx.arc(x, y, p.s, 0, 7); ctx.fill(); }
    });
    ctx.restore();
  }
  // a shock ring expanding from a point
  function shock(x, y, k, col, maxR) {
    if (k <= 0 || k >= 1) return;
    ctx.save(); ctx.globalAlpha = (1 - k) * 0.8; ctx.strokeStyle = col || C.acc; ctx.lineWidth = 2 + 18 * (1 - k);
    ctx.beginPath(); ctx.arc(x, y, (maxR || 900) * eo(k), 0, 7); ctx.stroke(); ctx.restore();
  }
  // light streaks sweeping across
  function streaks(t, alpha, col) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const sp = 500 + hash(i) * 900, yy = 120 + hash(i + 9) * (H - 240), len = 300 + hash(i + 3) * 500;
      const x = ((t * sp + hash(i + 5) * 4000) % (W + len * 2)) - len;
      const g = ctx.createLinearGradient(x, 0, x + len, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, col || 'rgba(245,184,0,0.35)');
      ctx.globalAlpha = alpha * (0.4 + 0.6 * hash(i + 7)); ctx.fillStyle = g; ctx.fillRect(x, yy, len, 2 + hash(i + 2) * 3);
    }
    ctx.restore();
  }
  // the FRC Manager mark: a dark gear on a rounded gold tile (the gear is drawn offscreen, then blitted)
  const gearCv = document.createElement('canvas'); gearCv.width = gearCv.height = 400;
  const SOFT = document.createElement('canvas'); SOFT.width = 384; SOFT.height = 216; // the out-of-focus match behind the opening words
  function gearTile(x, y, s, rot) {
    const g = gearCv.getContext('2d'), o = ctx; g.clearRect(0, 0, 400, 400);
    g.save(); g.translate(200, 200); g.rotate(rot || 0); g.fillStyle = '#141414'; g.beginPath();
    const n = 8, r = 130;
    for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n, r2 = i % 2 ? r * 0.76 : r; const a0 = a - Math.PI / n * 0.45, a1 = a + Math.PI / n * 0.45; g.lineTo(Math.cos(a0) * r2, Math.sin(a0) * r2); g.lineTo(Math.cos(a1) * r2, Math.sin(a1) * r2); }
    g.closePath(); g.fill(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(0, 0, r * 0.38, 0, 7); g.fill(); g.restore();
    o.drawImage(gearCv, x - s * 0.45, y - s * 0.45, s * 0.9, s * 0.9);
  }
  // FRC MANAGER wordmark with a chromatic split that settles, and a light sweep
  function wordmark(cx, cy, size, t, a, o) {
    o = o || {};
    const k = seg(t, a, a + 0.5), split = (1 - eo(k)) * 26 + (o.jitter ? Math.max(0, Math.sin(t * 40)) * 2 : 0);
    const s1 = 'FRC', s2 = 'MANAGER', gap = size * 0.28;
    const w1 = tw(s1, size, { weight: 700, spacing: size * 0.04 }), w2 = tw(s2, size, { weight: 700, spacing: size * 0.04 });
    const total = w1 + gap + w2, x0 = cx - total / 2;
    const al = eo(k) * (o.alpha == null ? 1 : o.alpha);
    if (al <= 0) return;
    ctx.save(); ctx.globalAlpha = al;
    if (split > 0.5) {
      ctx.globalCompositeOperation = 'lighter';
      txt(s1, x0 - split, cy, { size, weight: 700, color: 'rgba(255,40,60,0.7)', spacing: size * 0.04 });
      txt(s2, x0 + w1 + gap - split, cy, { size, weight: 700, color: 'rgba(255,40,60,0.7)', spacing: size * 0.04 });
      txt(s1, x0 + split, cy, { size, weight: 700, color: 'rgba(40,140,255,0.7)', spacing: size * 0.04 });
      txt(s2, x0 + w1 + gap + split, cy, { size, weight: 700, color: 'rgba(40,140,255,0.7)', spacing: size * 0.04 });
      ctx.globalCompositeOperation = 'source-over';
    }
    txt(s1, x0, cy, { size, weight: 700, color: C.acc, spacing: size * 0.04, glow: 'rgba(245,184,0,0.6)', blur: 40 });
    txt(s2, x0 + w1 + gap, cy, { size, weight: 700, color: '#ffffff', spacing: size * 0.04, glow: 'rgba(255,255,255,0.25)', blur: 30 });
    // light sweep across the letters
    if (o.sweep != null) {
      const sk = seg(t, o.sweep, o.sweep + 0.7);
      if (sk > 0 && sk < 1) {
        ctx.save(); ctx.font = '700 ' + size + 'px ' + FD; ctx.letterSpacing = (size * 0.04) + 'px'; ctx.textBaseline = 'alphabetic';
        ctx.beginPath(); ctx.rect(x0 - 40, cy - size, total + 80, size * 1.2); ctx.clip();
        const sx = lerp(x0 - 300, x0 + total + 300, eio(sk));
        const g = ctx.createLinearGradient(sx - 120, 0, sx + 120, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.globalCompositeOperation = 'source-atop';
        ctx.fillText(s1, x0, cy); ctx.fillText(s2, x0 + w1 + gap, cy);
        ctx.restore();
      }
    }
    ctx.restore();
    return { x0, total };
  }

  // ---------------------------------------------------------------- matches (real game engine)
  // Every match runs with the parts of its own game year (motors, swerve modules, cameras), as in a career.
  const eraOf0 = G.Era.of;
  const withEra = (year, fn) => { G.Era.of = () => G.Era.at(year); try { return fn(); } finally { G.Era.of = eraOf0; } };
  function aimFor(m, r) { if (m.year === 2022) return m.hub; if (m.year === 2024) return m.spk && m.spk[r.a]; if (m.year === 2026) return m.hub && m.hub[r.a]; return null; }
  // strong scoring robots (the montage)
  function makeMatch(year, seed, o) {
    o = o || {};
    return withEra(year, () => {
      const rng = G.makeRng(seed);
      const pool = Object.values(G.AI.makePool(rng, 90, TEAM, year)).filter(t => t.str >= 55).sort((a, b) => b.str - a.str);
      const pick = i => { const e = G.AI.entry(pool[i % pool.length], year, 1.08, 1, rng); e.plan = { role: 'score' }; return e; };
      const red = [pick(0), pick(3), pick(4)], blue = [pick(1), pick(2), pick(5)];
      if (o.player) { red[0].team = TEAM; red[0].look = Object.assign({}, red[0].look, { c1: TC1, c2: TC2, ver: 3 }); }
      if (o.defense) blue[2].plan = { role: 'defend' };
      const m = E.create({ year, red, blue, seed, headless: false, calls: 0 });
      const M = { m, year, acc: 0, speed: o.speed || 1, ev: o.ev || [] };
      while (!m.done && m.t < (o.from || 0)) E.step(m);
      return M;
    });
  }
  // the match tester's own robots: six of any strength on random strategies (same seed = same match as the tester)
  const COLS = [['#e8b400', '#ffcf4a'], ['#2f80ed', '#9cc4ff'], ['#27ae60', '#9be7b4'], ['#c0392b', '#ff9b8a'], ['#8e44ad', '#d2a8ff'], ['#16a085', '#7fe3d0'], ['#d35400', '#ffbf8a'], ['#7f8c8d', '#d5dbdb'], ['#e84393', '#ffb3d9'], ['#2d3436', '#b2bec3']];
  function makeTester(year, seed, o) {
    o = o || {};
    return withEra(year, () => {
      const rng = G.makeRng(seed), Sz = G.Seasons[year];
      const pool = Object.values(G.AI.makePool(rng, 40, 0, 2022)), teams = [];
      while (teams.length < 6) { const t = rng.pick(pool); if (!teams.includes(t)) teams.push(t); }
      const roles = ['score', 'score', 'score', 'score', 'defend'].concat(year === 2024 || year === 2026 ? ['feed'] : []);
      const setup = teams.map((t, i) => {
        t.str = rng.int(10, 95); t.rb = null;
        const e = G.AI.entry(t, year, rng.range(0.85, 1.05), 1, rng), col = rng.pick(COLS);
        e.look = Object.assign({}, e.look, { c1: col[0], c2: col[1] });
        e.plan = { role: rng.pick(roles), pace: rng.pick(['push', 'bal', 'bal', 'cons']), target: rng.pick(Sz.coachTargets).id, endTiming: rng.pick(['early', 'std', 'std', 'late']),
          endLevel: rng.chance(0.25) ? rng.int(0, Sz.endNames.length - 1) : 9, avoid: rng.chance(0.2), rpHunt: rng.chance(0.5) };
        e.a = i < 3 ? 'red' : 'blue'; e.str = t.str; e.name = t.name;
        return e;
      });
      const ent = a => setup.filter(e => e.a === a).map(e => Object.assign({}, e, { plan: Object.assign({}, e.plan) }));
      const m = E.create({ year, red: ent('red'), blue: ent('blue'), seed, headless: false, calls: 0 });
      const M = { m, year, acc: 0, speed: o.speed || 1, ev: (o.ev || []).slice(), tester: true };
      while (!m.done && m.t < (o.from || 0)) { E.step(m); fire(M); }
      return M;
    });
  }
  // changes made while it runs, as in the tester (break an intake at a given match time)
  function fire(M) {
    while (M.ev.length && M.ev[0].t <= M.m.t + 1e-6) {
      const a = M.ev.shift(), r = M.m.robots[a.i];
      if (a.what === 'intake') { r.perm.intake = true; r.stats.faults.push('Intake broke'); M.broke = { r, t: M.m.t }; }
    }
  }
  function tickMatch(M, dt) {
    if (M.m.done) return;
    withEra(M.year, () => {
      M.acc += dt * M.speed;
      let n = 0;
      while (M.acc >= 0.1 && !M.m.done && n++ < 50) { E.step(M.m); fire(M); M.acc -= 0.1; }
    });
  }
  const slot = r => (r.a === 'red' ? 'R' : 'B') + (r.slot + 1);
  // draw a match: field x,y with width w; o.routes / o.labels: the match tester's overlays (scaled for video)
  function drawMatch(M, x, y, w, o) {
    o = o || {};
    const m = M.m, s = w / E.FW;
    ctx.save(); ctx.translate(x, y);
    Rd.field(ctx, m.year, s, m);
    const al = m.done ? 1 : clamp(M.acc / 0.1, 0, 1);
    const pos = r => ({ x: r.px + (r.x - r.px) * al, y: r.py + (r.y - r.py) * al });
    if (o.routes) m.robots.forEach(r => {
      if (r.dead) return;
      let pts = null, goal = null;
      if (r.st === 'move' && r.path && r.path.length) { pts = r.path; goal = r.goal || r.path[r.path.length - 1]; }
      else if (r.st === 'defend' && r.mem.dRoute) { pts = [r.mem.dRoute.wp]; goal = r.defT; }
      if (!pts) return;
      const p = pos(r), col = r.a === 'red' ? 'rgba(255,130,130,0.9)' : 'rgba(140,185,255,0.9)';
      ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, s * 0.03); ctx.setLineDash([s * 0.12, s * 0.09]); ctx.lineDashOffset = -m.t * s * 0.8;
      ctx.beginPath(); ctx.moveTo(p.x * s, p.y * s); pts.forEach(q => ctx.lineTo(q.x * s, q.y * s)); if (r.st === 'defend' && goal) ctx.lineTo(goal.x * s, goal.y * s); ctx.stroke();
      ctx.setLineDash([]);
      if (goal) { ctx.beginPath(); ctx.arc(goal.x * s, goal.y * s, s * 0.16, 0, 7); ctx.stroke(); }
      ctx.restore();
    });
    m.robots.forEach(r => {
      const q = Object.create(r), p = pos(r); q.x = p.x; q.y = p.y;
      const g = aimFor(m, r);
      Rd.robot(ctx, s, q, { aim: g ? Math.atan2(g.y - q.y, g.x - q.x) : null, year: m.year });
    });
    Rd.fx(ctx, s, m);
    if (o.labels) m.robots.forEach(r => {
      const p = pos(r), t = slot(r) + ' ' + (r.dead ? (r.tipped ? 'TIPPED' : 'DISABLED') : r.label || r.st);
      const fs = Math.round(clamp(s * 0.18, 14, 24));
      ctx.save(); ctx.font = '600 ' + fs + 'px ' + FB; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      const ww = ctx.measureText(t).width + fs * 0.8, xx = clamp(p.x * s - ww / 2, 2, E.FW * s - ww - 2), yy = Math.max(2, p.y * s - 0.62 * s - fs * 1.5);
      ctx.fillStyle = 'rgba(8,10,14,0.82)'; ctx.beginPath(); ctx.roundRect(xx, yy, ww, fs * 1.42, 5); ctx.fill();
      ctx.fillStyle = r.mem && r.mem.broken ? '#ffb0b0' : r.st === 'defend' ? '#d6c4ff' : r.a === 'red' ? '#ffc2c2' : '#c8dcff';
      ctx.fillText(t, xx + fs * 0.4, yy + fs * 1.08); ctx.restore();
    });
    ctx.restore();
    return s;
  }
  // a match filling a view rectangle (cover), centred on a point (field metres)
  function drawMatchView(M, vx, vy, vw, vh, scale, cx, cy, o) {
    const s = scale, fw = E.FW * s, fh = E.FH * s;
    let ox = vx + vw / 2 - cx * s, oy = vy + vh / 2 - cy * s;
    ox = fw >= vw ? clamp(ox, vx + vw - fw, vx) : vx + (vw - fw) / 2;
    oy = fh >= vh ? clamp(oy, vy + vh - fh, vy) : vy + (vh - fh) / 2;
    ctx.save(); ctx.beginPath(); ctx.rect(vx, vy, vw, vh); ctx.clip();
    ctx.fillStyle = '#0d1116'; ctx.fillRect(vx, vy, vw, vh);
    drawMatch(M, ox, oy, fw, o);
    ctx.restore();
    return { ox, oy, s };
  }
  const tot = sc => sc.auto + sc.tele + sc.end + sc.foul;
  function clock(m) { const tl = Math.max(0, Math.ceil(m.total - m.t)); return Math.floor(tl / 60) + ':' + String(tl % 60).padStart(2, '0'); }

  // blue banner (canvas version of the in-game banner)
  function banner(x, y, w, h, award, year, event, gold) {
    ctx.save(); ctx.translate(x, y);
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0a74c7'); g.addColorStop(0.6, '#0066b3'); g.addColorStop(1, '#00539a');
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(w, h); ctx.lineTo(w / 2, h * 0.86); ctx.lineTo(0, h); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, 0, w, 10);
    const ec = gold ? '#f5c542' : 'rgba(255,255,255,0.92)', k = w / 240;
    ctx.lineWidth = 4 * k; ctx.strokeStyle = ec; ctx.beginPath(); ctx.arc(w / 2, 70 * k, 30 * k, 0, 7); ctx.stroke();
    txt(gold ? '★' : award.indexOf('Impact') === 0 ? '✦' : '⚙', w / 2, 72 * k, { font: FB, size: 32 * k, weight: 800, color: ec, align: 'center', base: 'middle' });
    let yy = 138 * k;
    wrap(award.toUpperCase(), w - 30 * k, '900 ' + (22 * k) + 'px ' + FB).forEach(l => { txt(l, w / 2, yy, { font: FB, size: 22 * k, weight: 900, color: gold ? '#ffe08a' : '#fff', align: 'center', spacing: 1 }); yy += 27 * k; });
    txt(String(year), w / 2, yy + 32 * k, { font: FB, size: 42 * k, weight: 800, color: '#fff', align: 'center' });
    yy += 70 * k;
    wrap(event, w - 34 * k, '400 ' + (18 * k) + 'px ' + FB).forEach(l => { txt(l, w / 2, yy, { font: FB, size: 18 * k, weight: 400, color: 'rgba(255,255,255,0.92)', align: 'center' }); yy += 23 * k; });
    ctx.restore();
  }

  // ---------------------------------------------------------------- real screens from the game
  const SHOT_NAMES = ['design', 'garage', 'parts', 'workshop', 'team', 'finance', 'calendar', 'hq', 'quals', 'select', 'bracket', 'scout', 'history', 'worldmap'];
  const IMG = {};
  const imagesReady = Promise.all(SHOT_NAMES.map(n => new Promise(res => { const im = new Image(); im.onload = () => { IMG[n] = im; res(); }; im.onerror = () => res(); im.src = '../../media/reveal-shots/' + n + '.png'; })));
  // a floating window with the screen inside: slides in, tilts flat, zooms toward a focus point, spotlights regions
  // o: { title, fx, fy, z1, zs, ze, hl: [[x0,y0,x1,y1,at]], from: 'right'|'left'|'bottom', out }
  function shotWin(key, x, y, w, lt, o) {
    const img = IMG[key]; if (!img) return;
    o = o || {};
    const h = w * img.height / img.width, bh = 40;
    const kin = eo(seg(lt, 0, 0.45)), kout = o.out != null ? eio(seg(lt, o.out, o.out + 0.3)) : 0;
    const dir = o.from === 'left' ? -1 : 1;
    const dx = (1 - kin) * 260 * dir + kout * 900 * dir, dy = o.from === 'bottom' ? (1 - kin) * 300 : 0;
    const al = kin * (1 - kout);
    if (al <= 0) return;
    ctx.save(); ctx.globalAlpha = al;
    ctx.translate(x + w / 2 + dx, y + (h + bh) / 2 + dy);
    const tilt = (1 - kin) * 0.12 * dir + (o.tilt || 0);
    ctx.transform(1, tilt * 0.25, -tilt * 0.15, 1, 0, 0);
    ctx.scale(lerp(0.9, 1, kin), lerp(0.9, 1, kin));
    ctx.translate(-w / 2, -(h + bh) / 2);
    // chrome
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18; rr(0, 0, w, h + bh, 14, '#0e1318'); ctx.restore();
    rr(0, 0, w, h + bh, 14, null, 'rgba(245,184,0,0.35)', 2);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(22 + i * 22, bh / 2, 7, 0, 7); ctx.fill(); });
    txt(o.title || 'FRC Manager', w / 2, bh / 2 + 1, { font: FB, size: 16, weight: 600, color: C.muted, align: 'center', base: 'middle' });
    // content: zoom toward the focus point
    ctx.save(); ctx.beginPath(); ctx.roundRect(0, bh, w, h, [0, 0, 14, 14]); ctx.clip();
    const kz = eio(seg(lt, o.zs == null ? 0.35 : o.zs, o.ze == null ? 1.5 : o.ze)), z = lerp(1, o.z1 || 1.4, kz);
    const fx = lerp(0.5, o.fx == null ? 0.5 : o.fx, kz), fy = lerp(0.5, o.fy == null ? 0.5 : o.fy, kz);
    const sw = w * z, sh = h * z;
    const ix = clamp(w / 2 - fx * sw, w - sw, 0), iy = clamp(bh + h / 2 - fy * sh, bh + h - sh, bh);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, ix, iy, sw, sh);
    // spotlights: dim everything else, outline the region with a running gold dash
    (o.hl || []).forEach(([a, b, c, d, at]) => {
      const v = eo(seg(lt, at, at + 0.35)); if (v <= 0) return;
      const rx = ix + a * sw, ry = iy + b * sh, rw = (c - a) * sw, rh = (d - b) * sh;
      ctx.save(); ctx.globalAlpha = al * v * 0.55; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.rect(0, bh, w, h); ctx.roundRect(rx, ry, rw, rh, 10); ctx.fill('evenodd'); ctx.restore();
      ctx.save(); ctx.globalAlpha = al * v; ctx.shadowColor = 'rgba(245,184,0,0.8)'; ctx.shadowBlur = 24;
      ctx.strokeStyle = C.acc; ctx.lineWidth = 4; ctx.setLineDash([22, 10]); ctx.lineDashOffset = -lt * 60;
      const grow = (1 - v) * 30; ctx.beginPath(); ctx.roundRect(rx - grow, ry - grow, rw + grow * 2, rh + grow * 2, 10); ctx.stroke(); ctx.restore();
    });
    ctx.restore();
    ctx.restore();
  }

  // ---------------------------------------------------------------- the simulated world (map scene)
  let WORLD = null;
  function buildWorld() {
    const Geo = G.Geo;
    const snap = (start) => {
      G.Dev.autoplay({ start, seed: 3, profile: 'established', settings: { noFail: true }, until: s => true });
      const S = G.S, ws = S.wseason, cy = ws.cy;
      const teams = Object.values(S.teams).map(t => { const p = Geo.teamPos(t.num, t.region, t.home, cy); return { num: t.num, x: p.xy[0], y: p.xy[1], str: t.str, home: t.home }; });
      const events = ws.events.filter(e => e.kind !== 'cmp' && e.kind !== 'einstein').map(e => { let p = null; try { p = Geo.eventPos(ws, e); } catch (x) { p = null; } const xy = p ? (p.xy || p) : null; return xy && xy.length ? { x: xy[0], y: xy[1], kind: e.kind } : null; }).filter(Boolean);
      const dists = G.World.districtsAt(cy).map(d => ({ id: d.id, color: d.color, path: new Path2D(Geo.path(Geo.DIST[d.id])), name: (G.Data.DISTRICT[d.id] && G.Data.DISTRICT[d.id].short) || d.id }));
      return { teams, events, dists, cy };
    };
    const a = snap(2016), b = snap(2026);
    const byNum = {}; a.teams.forEach(t => { byNum[t.num] = t; });
    b.teams.forEach(t => { t.old = byNum[t.num] || null; });
    a.teams.forEach(t => { t.gone = !b.teams.some(u => u.num === t.num); });
    const col = s => (G.UI && G.UI.strColor ? G.UI.strColor(s) : '#6da7ec');
    a.teams.forEach(t => { t.col = col(t.str); t.at = 0.15 + t.x / 1000 * 1.6 + hash(t.num) * 0.35; });
    b.teams.forEach(t => { t.col = col(t.str); t.at = t.old ? t.old.at : 0; });
    const P = s => new Path2D(Geo.path(s));
    const lbl = k => { const L = Geo.LABEL[k]; return L ? Geo.xy(L[0], L[1]) : null; };
    WORLD = { a, b, us: P(Geo.US), ca: P(Geo.CA), water: Geo.WATER.map(P), regions: ['West', 'Southwest', 'Midwest', 'Northeast', 'Southeast'].map(r => P(Geo.REGION[r])),
      city: Object.keys(Geo.CITY).reduce((o, k) => { o[k] = Geo.xy(Geo.CITY[k][0], Geo.CITY[k][1]); return o; }, {}), lbl };
  }

  // ---------------------------------------------------------------- content
  const GAMES = [2016, 2017, 2018, 2019, 2020, 2022, 2023, 2024, 2025, 2026];
  const MONT = [ // montage cuts: [year, t0, t1, seed, from]
    [2016, 8.0, 9.0, 1601, 70], [2017, 9.0, 10.0, 1702, 60], [2018, 10.0, 11.0, 1803, 62], [2019, 11.0, 12.0, 1904, 58], [2020, 12.0, 13.0, 2005, 60],
    [2021, 13.0, 13.5], [2022, 13.5, 14.4, 2201, 64], [2023, 14.4, 15.3, 2302, 58], [2024, 15.3, 16.2, 2403, 60], [2025, 16.2, 17.1, 2504, 64], [2026, 17.1, 18.0, 2605, 66]
  ];
  const DECADE = [ // [year, text, kind]  kind: tech | rules | world | crisis
    [2016, 'Stop Build Day: robots go in the bag', 'rules'], [2016, 'Tank drives only', 'tech'],
    [2017, 'Two Championships', 'world'], [2017, 'Festival of Champions', 'world'], [2017, 'Planetary gearboxes', 'tech'],
    [2018, 'Lantern vision cameras', 'tech'], [2018, 'The Super pit', 'tech'],
    [2019, 'Brushless motors', 'tech'], [2019, 'Sterling Motion closes', 'crisis'], [2019, 'Mesa District forms', 'world'],
    [2020, 'Swerve modules for sale', 'tech'], [2020, 'Apex Motion arrives', 'tech'],
    [2021, 'Mechanism kits for sale', 'tech'], [2021, 'THE LOST SEASON', 'crisis'],
    [2022, 'Servo actuator kits', 'tech'], [2022, 'Chairman\'s becomes Impact', 'rules'],
    [2023, 'AprilTags on the field', 'tech'], [2023, 'Double elimination', 'rules'],
    [2024, 'One Championship, 8 divisions', 'world'],
    [2025, 'The Regional Pool', 'rules'],
    [2026, 'Sierra District forms', 'world']
  ];
  const KCOL = { tech: C.cyan, rules: C.acc, world: C.vio, crisis: C.bad };
  const KLAB = { tech: 'TECH', rules: 'RULES', world: 'WORLD', crisis: 'BREAKING' };
  const MGMT = [ // [shot, title, line, opts]
    ['design', 'DESIGN OFFICE', 'Pick concepts. Run upgrades. Spend every team hour.', { fx: 0.46, fy: 0.34, z1: 1.55, hl: [[0.15, 0.265, 0.79, 0.37, 0.7]] }],
    ['garage', 'TWO ROBOTS', 'Copies, spares and a test chassis. You choose which one competes.', { fx: 0.57, fy: 0.38, z1: 1.3, hl: [[0.15, 0.2, 0.565, 0.55, 0.6], [0.575, 0.2, 0.99, 0.55, 0.95]] }],
    ['parts', 'INVENTORY', 'Two vendors, loyalty levels, sell-outs and mechanism kits.', { fx: 0.55, fy: 0.62, z1: 1.45, hl: [[0.14, 0.44, 0.98, 0.88, 0.65]] }],
    ['workshop', 'WORKSHOP', 'Machines, floor space and Finish now cards.', { fx: 0.55, fy: 0.32, z1: 1.45, hl: [[0.15, 0.155, 0.98, 0.27, 0.6]] }],
    ['team', 'YOUR STUDENTS', 'Draft the drive team. Train them. Do outreach.', { fx: 0.38, fy: 0.3, z1: 1.55, hl: [[0.15, 0.16, 0.565, 0.345, 0.6]] }],
    ['finance', 'SPONSORS', 'Sign sponsors, keep them happy, balance the budget.', { fx: 0.55, fy: 0.55, z1: 1.35, hl: [[0.15, 0.37, 0.98, 0.98, 0.65]] }],
    ['calendar', 'THE CALENDAR', 'Register for events and plan every week of the year.', { fx: 0.7, fy: 0.5, z1: 1.25, hl: [[0.495, 0.42, 0.985, 0.61, 0.65]] }],
    ['hq', 'THE SCHOOL IS WATCHING', 'Goals, Program Support and reputation decide your future.', { fx: 0.56, fy: 0.62, z1: 1.45, hl: [[0.43, 0.68, 0.69, 0.98, 0.65]] }]
  ];
  const BANNERS = [['Regional Winners', 2017, 'Prairie Wind Regional'], ['Rookie All-Star', 2016, 'Gateway Regional'], ['Engineering Inspiration', 2019, 'Lakeshore District Championship'],
    ['Impact Award', 2023, 'Blue Ridge Regional'], ['Woodie Flowers Finalist Award', 2020, 'Prairie Wind Regional'], ['Championship Winners', 2025, 'FIRST Championship', true]];

  // field thumbnails for the shuffle cards
  const THUMB = {};
  function thumbs() {
    GAMES.forEach(y => { const c = document.createElement('canvas'); c.width = 330; c.height = Math.round(330 * E.FH / E.FW); const g = c.getContext('2d'); Rd.field(g, y, c.width / E.FW, null); THUMB[y] = c; });
  }

  let MS = {};
  function prep() {
    MS = {
      cold: makeMatch(2024, 911, { from: 40, speed: 3 }),
      title: makeMatch(2025, 4401, { from: 50, speed: 1.4 }),
      mont: MONT.map(c => c[3] ? makeMatch(c[0], c[3], { from: c[4], speed: 5 }) : null),
      t25: makeTester(2025, 435846, { from: 14.2, speed: 2 }),
      t18: makeTester(2018, 4242, { from: 38, speed: 2.4 }),
      t24: makeTester(2024, 3131, { from: 46, speed: 2.4, ev: [{ t: 49, i: 0, what: 'intake' }] }),
      champ: makeMatch(2019, 6106, { from: 50, speed: 2.5 }),
      award: makeMatch(2017, 7107, { from: 60, speed: 1.5 })
    };
    CONF = null;
  }

  // ---------------------------------------------------------------- scenes
  function montageHud(t, year, lt, d) {
    // year strip along the bottom
    const xs = 260, xe = W - 260, step = (xe - xs) / 10;
    ctx.save(); ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, H - 92, W, 92);
    for (let i = 0; i <= 10; i++) {
      const y = 2016 + i, x = xs + i * step, on = y === year, past = y < year;
      ctx.fillStyle = on ? (y === 2021 ? C.bad : C.acc) : past ? 'rgba(245,184,0,0.5)' : 'rgba(255,255,255,0.22)';
      ctx.beginPath(); ctx.arc(x, H - 56, on ? 9 : 5, 0, 7); ctx.fill();
      txt(String(y), x, H - 22, { font: FB, size: on ? 20 : 15, weight: on ? 900 : 600, color: on ? '#fff' : 'rgba(255,255,255,0.45)', align: 'center' });
    }
    ctx.fillStyle = 'rgba(245,184,0,0.6)'; ctx.fillRect(xs, H - 57, (year - 2016) * step, 2);
    ctx.restore();
  }
  function montageCut(c, lt, t) {
    const [year, t0, t1] = c, d = t1 - t0;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (year === 2021) {
      // the lost season: static and a red stamp
      bg(t, { color: '#0a0505', grid: 0.04 });
      ctx.save(); for (let i = 0; i < 1400; i++) { const r = hash(i * 7.3 + Math.floor(t * 30) * 13.1); ctx.fillStyle = 'rgba(255,255,255,' + (r * 0.12) + ')'; ctx.fillRect(hash(i + Math.floor(t * 30)) * W, r * H, 3, 2); } ctx.restore();
      const k = eo(seg(lt, 0, 0.15));
      txt('2021', W / 2, H / 2 - 30, { size: 260, weight: 700, color: 'rgba(255,255,255,0.12)', align: 'center', base: 'middle', alpha: k });
      ctx.save(); ctx.translate(W / 2, H / 2 + 10); ctx.rotate(-0.06); ctx.scale(lerp(1.6, 1, k), lerp(1.6, 1, k));
      rr(-430, -62, 860, 124, 12, null, C.bad, 8);
      txt('THE LOST SEASON', 0, 4, { size: 92, weight: 700, color: C.bad, align: 'center', base: 'middle', spacing: 6, alpha: k, glow: 'rgba(255,60,60,0.6)', blur: 30 });
      ctx.restore();
      txt('Cancelled. The teams that survive come back changed.', W / 2, H / 2 + 150, { font: FB, size: 28, weight: 600, color: C.muted, align: 'center', alpha: k });
      montageHud(t, 2021, lt, d);
      return;
    }
    const M = MS.mont[MONT.indexOf(c)], Sz = G.Seasons[year];
    const push = 1 + lt * 0.05, s = W / E.FW * 1.04 * push;
    drawMatchView(M, 0, 0, W, H - 92, s, E.FW / 2, E.FH / 2);
    // colour wash and darkening at the left for the words
    const g = ctx.createLinearGradient(0, 0, W * 0.65, 0); g.addColorStop(0, 'rgba(0,0,0,0.85)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const k = eo(seg(lt, 0, 0.18));
    txt(String(year), 90 - (1 - k) * 80, 330, { size: 250, weight: 700, color: 'rgba(0,0,0,0)', stroke: C.acc, lw: 4, noFill: true, alpha: k * 0.9 });
    txt(String(year), 90 - (1 - k) * 80, 330, { size: 250, weight: 700, color: 'rgba(245,184,0,0.12)', alpha: k });
    txt(Sz.name, 96 + (1 - k) * 60, 430, { size: 76, weight: 700, color: '#fff', alpha: k, spacing: 2 });
    txt(Sz.tagline || '', 98 + (1 - k) * 90, 486, { font: FB, size: 26, weight: 600, color: 'rgba(255,255,255,0.75)', alpha: eo(seg(lt, 0.1, 0.3)) });
    montageHud(t, year, lt, d);
  }

  // shuffle cards: real order, then random order
  const SHUF = (function () { const r = G.makeRng(77), a = GAMES.slice(); for (let i = a.length - 1; i > 0; i--) { const j = r.int(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; })();
  function cardPos(i) { const col = i % 5, row = Math.floor(i / 5); return { x: 205 + col * 310, y: 330 + row * 300 }; }

  // decade timeline
  const colX = y => 320 + (y - 2016) * 360;
  function decadeScene(lt, t) {
    bg(t, { glow: { x: W * 0.5, y: H * 0.6, r: 900, c: 'rgba(62,140,255,0.08)' } });
    const pan = lerp(0, colX(2026) - W + 420, eio(seg(lt, 0.4, 7.4)));
    // a huge, faint year behind it all: the newest year in view
    { let yy = 2016; for (let y = 2016; y <= 2026; y++) if (colX(y) - pan < W * 0.66) yy = y;
      txt(String(yy), W * 0.56, 560, { size: 420, weight: 700, color: yy === 2021 ? 'rgba(255,70,70,0.07)' : 'rgba(245,184,0,0.06)', align: 'center', spacing: 20 }); }
    ctx.save(); ctx.translate(-pan, 0);
    // axis
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(colX(2016) - 200, 860, colX(2026) - colX(2016) + 400, 3);
    const prog = colX(2016) - 200 + (pan + W * 0.62 - (colX(2016) - 200));
    ctx.fillStyle = C.acc; ctx.fillRect(colX(2016) - 200, 859, Math.max(0, prog - colX(2016) + 200), 5);
    for (let y = 2016; y <= 2026; y++) {
      const x = colX(y), sx = x - pan, on = sx < W * 0.66, k = eo(seg(sx, W * 0.95, W * 0.66) === 0 ? 0 : 1 - seg(sx, W * 0.66, W * 0.95));
      if (y === 2021) { ctx.fillStyle = 'rgba(255,70,70,' + (0.08 * k) + ')'; ctx.fillRect(x - 170, 140, 340, 720); }
      ctx.fillStyle = on ? C.acc : 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.arc(x, 861, on ? 11 : 6, 0, 7); ctx.fill();
      txt(String(y), x, 960, { size: 84, weight: 700, color: y === 2021 ? C.bad : on ? '#fff' : 'rgba(255,255,255,0.25)', align: 'center', alpha: 0.4 + 0.6 * k });
      if (GAMES.includes(y)) txt(G.Seasons[y].name, x, 1004, { font: FB, size: 18, weight: 700, color: C.muted, align: 'center', spacing: 2, alpha: 0.3 + 0.7 * k });
      // chips for this year, stacked above the axis
      DECADE.filter(d => d[0] === y).forEach((d, i) => {
        const pk = seg(sx, W * 0.9 - i * 30, W * 0.72 - i * 30), v = back(pk);
        if (pk <= 0) return;
        const big = d[2] === 'crisis' && y === 2021, cw = 340, ch = big ? 150 : 112, cx0 = x - cw / 2, cy0 = 712 - i * 132 - (big ? 38 : 0);
        ctx.save(); ctx.globalAlpha = clamp(pk * 2, 0, 1); ctx.translate(x, cy0 + ch / 2); ctx.scale(v, v); ctx.translate(-x, -(cy0 + ch / 2));
        ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 24; rr(cx0, cy0, cw, ch, 14, big ? '#2a0d10' : C.panel); ctx.shadowColor = 'transparent';
        rr(cx0, cy0, cw, ch, 14, null, KCOL[d[2]], big ? 3 : 2);
        ctx.fillStyle = KCOL[d[2]]; ctx.fillRect(cx0, cy0 + 14, 6, ch - 28);
        txt(KLAB[d[2]], cx0 + 26, cy0 + 36, { font: FB, size: 17, weight: 900, color: KCOL[d[2]], spacing: 3 });
        const lines = big ? [d[1]] : wrap(d[1], cw - 50, '800 28px ' + FB);
        if (big) txt(d[1], cx0 + 26, cy0 + ch - 34, { font: FD, size: Math.min(46, Math.floor(46 * (cw - 52) / tw(d[1], 46, { weight: 700 }))), weight: 700, color: '#ffd0d0', glow: 'rgba(255,60,60,0.5)', blur: 20 });
        else lines.slice(0, 2).forEach((l, j) => txt(l, cx0 + 26, cy0 + 70 + j * 32 - (lines.length > 1 ? 4 : -8), { font: FB, size: 28, weight: 800, color: '#fff' }));
        ctx.restore();
      });
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x, 160, 1, 690);
    }
    ctx.restore();
    // header
    kicker('The decade', 110, 92, vis(lt, 0, 8, 0.4, 0.3));
    rtxt('The world changes as the years go by.', 110, 150, lt, 0.15, 8, { size: 54, weight: 700, color: '#fff' });
    // legend
    let lx = W - 110;
    ['crisis', 'world', 'rules', 'tech'].forEach(k => { const w2 = tw(KLAB[k], 16, { font: FB, weight: 900, spacing: 3 }); lx -= w2 + 44; ctx.fillStyle = KCOL[k]; ctx.fillRect(lx, 74, 14, 14); txt(KLAB[k], lx + 22, 87, { font: FB, size: 16, weight: 900, color: KCOL[k], spacing: 3, alpha: vis(lt, 0.3, 8) }); });
  }

  // management sequence: one screen every 2 s
  function mgmtScene(i, lt, t) {
    const [key, title, line, o] = MGMT[i], left = i % 2 === 0;
    bg(t, { glow: { x: left ? W * 0.75 : W * 0.25, y: H * 0.5, r: 900, c: 'rgba(245,184,0,0.07)' } });
    streaks(t, 0.5);
    const ww = 1190, wx = left ? W - ww - 60 : 60, wy = 150;
    shotWin(key, wx, wy, ww, lt, Object.assign({ from: left ? 'right' : 'left', title: 'FRC Manager — ' + title.charAt(0) + title.slice(1).toLowerCase(), out: 1.72, zs: 0.4, ze: 1.45 }, o));
    // words
    const tx = left ? 100 : W - 580, kOut = 1 - seg(lt, 1.75, 1.98);
    ctx.save(); ctx.globalAlpha = kOut;
    kicker('Management  ' + String(i + 1).padStart(2, '0') + ' / ' + String(MGMT.length).padStart(2, '0'), tx, 330, eo(seg(lt, 0.05, 0.3)));
    const lines = wrap(title, 500, '700 86px ' + FD);
    lines.forEach((l, j) => slam(l, tx, 440 + j * 84, lt, 0.12 + j * 0.08, { size: 86, weight: 700, color: '#fff', from: 1.5, d: 0.25 }));
    const ly = 440 + lines.length * 84 + 30;
    wrap(line, 470, '600 32px ' + FB).forEach((l, j) => rtxt(l, tx, ly + j * 44, lt, 0.35 + j * 0.06, 9, { font: FB, size: 32, weight: 600, color: '#c3ccd5' }));
    // progress pips
    for (let j = 0; j < MGMT.length; j++) { ctx.fillStyle = j === i ? C.acc : j < i ? 'rgba(245,184,0,0.45)' : 'rgba(255,255,255,0.18)'; rr(tx + j * 40, 860, 30, 7, 3.5, ctx.fillStyle); }
    ctx.restore();
  }

  // the world map
  function mapScene(lt, t) {
    bg(t, { color: '#070a0e', grid: 0.035 });
    if (!WORLD) return;
    const Wd = WORLD, sc = 1.36, ox = 30, oy = 150;
    ctx.save(); ctx.translate(ox, oy);
    // gentle push-in
    const z = lerp(1, 1.06, seg(lt, 0, 10)); ctx.translate(500 * sc, 311 * sc); ctx.scale(z, z); ctx.translate(-500 * sc, -311 * sc);
    const toScr = p => [ox + 500 * sc + (p[0] * sc - 500 * sc) * z, oy + 311 * sc + (p[1] * sc - 311 * sc) * z];
    ctx.scale(sc, sc);
    const draw = eo(seg(lt, 0, 1.1));
    ctx.save(); ctx.globalAlpha = draw;
    ctx.fillStyle = '#121a22'; ctx.fill(Wd.ca); ctx.fill(Wd.us);
    ctx.lineWidth = 1.2 / sc; ctx.strokeStyle = '#3a4a5a'; ctx.stroke(Wd.ca); ctx.stroke(Wd.us);
    ctx.fillStyle = '#070a0e'; Wd.water.forEach(p => { ctx.fill(p); ctx.stroke(p); });
    ctx.save(); ctx.clip(Wd.us); ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(120,140,160,0.45)'; Wd.regions.forEach(p => ctx.stroke(p)); ctx.restore();
    ctx.restore();
    // districts: 2016's three, then Mesa (2019) and Sierra (2026)
    const yearK = eio(seg(lt, 4.2, 5.6)); // 2016 → 2026
    const dset = Wd.b.dists;
    dset.forEach(d => {
      const isNew = !Wd.a.dists.some(x => x.id === d.id), dk = isNew ? eo(seg(lt, d.id === 'mesa' ? 4.6 : 5.2, (d.id === 'mesa' ? 4.6 : 5.2) + 0.5)) : eo(seg(lt, 2.2, 2.9));
      if (dk <= 0) return;
      ctx.save(); ctx.clip(Wd.us); ctx.globalAlpha = dk * (isNew ? 0.32 + 0.2 * Math.max(0, Math.sin(lt * 6)) : 0.22); ctx.fillStyle = d.color; ctx.fill(d.path); ctx.globalAlpha = dk; ctx.lineWidth = (isNew ? 2.4 : 1.6) / sc; ctx.strokeStyle = d.color; ctx.stroke(d.path); ctx.restore();
    });
    // team dots
    const r0 = 5.2 / sc;
    const set = yearK < 0.5 ? Wd.a.teams : Wd.b.teams;
    if (yearK < 0.5) {
      Wd.a.teams.forEach(tm => { const k = seg(lt, tm.at + 0.4, tm.at + 0.7); if (k <= 0) return; const sz = r0 * back(k) * (tm.gone ? 1 - yearK * 2 : 1); if (sz <= 0) return; ctx.fillStyle = tm.col; ctx.beginPath(); ctx.arc(tm.x, tm.y, sz, 0, 7); ctx.fill(); });
    } else {
      const k2 = (yearK - 0.5) * 2;
      Wd.b.teams.forEach(tm => {
        let x = tm.x, y = tm.y, sz = r0;
        if (tm.old) { x = lerp(tm.old.x, tm.x, k2); y = lerp(tm.old.y, tm.y, k2); }
        else { const kk = eo(seg(k2, hash(tm.num) * 0.6, hash(tm.num) * 0.6 + 0.4)); sz = r0 * back(kk); if (sz <= 0) return; }
        ctx.fillStyle = tm.old ? tm.col : '#9ff0c8'; ctx.beginPath(); ctx.arc(x, y, sz, 0, 7); ctx.fill();
      });
    }
    // events (violet diamonds)
    const evs = yearK < 0.5 ? Wd.a.events : Wd.b.events, ek = eo(seg(lt, 2.6, 3.3));
    if (ek > 0) evs.forEach((e, i) => { const s2 = (6.5 / sc) * ek * (1 + 0.25 * Math.sin(t * 5 + i)); ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(Math.PI / 4); ctx.fillStyle = '#9085e9'; ctx.globalAlpha = 0.9; ctx.fillRect(-s2, -s2, s2 * 2, s2 * 2); ctx.restore(); });
    // Championship cities and arcs (two Championships, 2017–2020)
    const ck = eo(seg(lt, 6.0, 6.6));
    if (ck > 0) {
      const cities = [['Houston', C.acc], ['St. Louis', '#ff9a3c'], ['Detroit', '#ff9a3c']];
      cities.forEach(([nm, col], i) => {
        const p = Wd.city[nm]; if (!p) return;
        const kk = eo(seg(lt, 6.0 + i * 0.25, 6.5 + i * 0.25)); if (kk <= 0) return;
        ctx.save(); ctx.globalAlpha = kk; ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(p[0], p[1], 7 / sc * 1.4, 0, 7); ctx.fill(); ctx.restore();
        ctx.save(); ctx.globalAlpha = kk * (1 - ((lt * 1.2 + i * 0.3) % 1)); ctx.strokeStyle = col; ctx.lineWidth = 2 / sc; ctx.beginPath(); ctx.arc(p[0], p[1], (7 + 26 * ((lt * 1.2 + i * 0.3) % 1)) / sc * 1.4, 0, 7); ctx.stroke(); ctx.restore();
      });
      // arcs from events to Houston and St. Louis
      const H1 = Wd.city.Houston, S1 = Wd.city['St. Louis'];
      Wd.b.events.forEach((e, i) => {
        if (i % 3) return;
        const dst = e.x < 520 ? H1 : S1; if (!dst) return;
        const kk = seg(lt, 6.3 + (i % 9) * 0.12, 7.6 + (i % 9) * 0.12); if (kk <= 0 || kk >= 1) return;
        const mx = (e.x + dst[0]) / 2, my = Math.min(e.y, dst[1]) - 60;
        const p = q => { const a = 1 - q; return [a * a * e.x + 2 * a * q * mx + q * q * dst[0], a * a * e.y + 2 * a * q * my + q * q * dst[1]]; };
        ctx.save(); ctx.strokeStyle = 'rgba(245,184,0,0.5)'; ctx.lineWidth = 1.4 / sc; ctx.beginPath();
        for (let j = 0; j <= 20; j++) { const q = Math.max(0, eo(kk) - 0.35) + j / 20 * Math.min(0.35, eo(kk)); const pp = p(q); j ? ctx.lineTo(pp[0], pp[1]) : ctx.moveTo(pp[0], pp[1]); }
        ctx.stroke(); const hd = p(eo(kk)); ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.arc(hd[0], hd[1], 2.4 / sc * 1.4, 0, 7); ctx.fill(); ctx.restore();
      });
    }
    // district labels
    ctx.restore();
    const L = (k, name, col, at) => { const p = Wd.lbl(k); if (!p) return; const kk = eo(seg(lt, at, at + 0.4)); if (kk <= 0) return; const q = toScr(p), X = q[0], Y = q[1] + (k === 'sierra' ? 30 : k === 'evergreen' ? -12 : 0); txt(name, X, Y, { font: FB, size: 20, weight: 900, color: col, align: 'center', spacing: 2, alpha: kk, stroke: 'rgba(0,0,0,0.75)', lw: 5 }); };
    Wd.b.dists.forEach(d => L(d.id, (d.name + ' District').toUpperCase(), d.color, d.id === 'mesa' ? 4.8 : d.id === 'sierra' ? 5.4 : 2.5));
    // counters and captions (right)
    const px = 1480, n16 = Wd.a.teams.length, n26 = Wd.b.teams.length;
    const tcount = yearK < 0.5 ? n16 * eo(seg(lt, 0.3, 2.2)) : lerp(n16, n26, (yearK - 0.5) * 2);
    kicker('The world', px, 120, vis(lt, 0.1, 10));
    rtxt('Every team simulated,', px, 182, lt, 0.2, 10, { size: 46, weight: 700, color: '#fff' });
    rtxt('every week.', px, 230, lt, 0.28, 10, { size: 46, weight: 700, color: '#fff' });
    const stat = (v, label, y, at, col) => { const kk = vis(lt, at, 10); if (kk <= 0) return; txt(v, px, y, { size: 72, weight: 700, color: col || C.acc, alpha: kk }); txt(label, px, y + 30, { font: FB, size: 18, weight: 800, color: C.muted, spacing: 2, alpha: kk }); };
    stat(num(tcount), 'TEAMS', 340, 0.3);
    stat(String(Math.round(lerp(Wd.a.events.length, Wd.b.events.length, clamp((yearK - 0.5) * 2, 0, 1)))), 'EVENTS A SEASON', 450, 2.6, '#b3a9ff');
    stat(String(yearK < 0.6 ? Wd.a.dists.length : Wd.b.dists.length), 'DISTRICTS', 560, 2.2, '#7fe3d0');
    const yr = yearK < 0.5 ? 2016 : 2026;
    txt(String(yr), px, 720, { size: 110, weight: 700, color: 'rgba(255,255,255,0.12)', alpha: vis(lt, 0.5, 10) });
    if (lt > 6.0) { rtxt('TWO CHAMPIONSHIPS', px, 800, lt, 6.1, 10, { font: FB, size: 22, weight: 900, color: C.acc, spacing: 3 }); rtxt('Houston, and St. Louis or Detroit, 2017–2020', px, 834, lt, 6.25, 10, { font: FB, size: 18, weight: 600, color: C.muted }); }
    // scouting table slides up at the end
    if (lt > 7.6) shotWin('scout', 330, 330, 1000, lt - 7.6, { from: 'bottom', title: 'FRC Manager — Scouting every team', fx: 0.55, fy: 0.55, z1: 1.35, zs: 0.4, ze: 1.6, hl: [[0.13, 0.31, 0.98, 0.62, 0.7]] });
    if (lt > 7.8) { const kk = eo(seg(lt, 7.8, 8.2)); ctx.save(); ctx.globalAlpha = kk; rr(330, 250, 1000, 64, 12, 'rgba(10,14,18,0.92)', C.acc, 2); txt('SCOUT THE WORLD: OPR, AUTO, TELEOP AND ENDGAME FOR EVERY TEAM', 830, 290, { font: FB, size: 20, weight: 900, color: '#fff', align: 'center', spacing: 1 }); ctx.restore(); }
  }

  // match tester footage
  function testerScene(M, lt, t, o) {
    ctx.fillStyle = '#05070a'; ctx.fillRect(0, 0, W, H);
    const vw = W, vh = H, s = W / E.FW * (o.zoom || 1.0) * (1 + lt * 0.015);
    drawMatchView(M, 0, 0, vw, vh, s, o.cx == null ? E.FW / 2 : o.cx, o.cy == null ? E.FH / 2 : o.cy, { routes: true, labels: true });
    vignette(0.45);
    // HUD
    ctx.save(); ctx.globalAlpha = eo(seg(lt, 0, 0.3));
    const sub = G.Seasons[M.year].name + '  ·  ×' + M.speed + ' speed', tw1 = tw('MATCH TESTER', 38, { weight: 700, spacing: 2 }), tw2 = tw(sub, 18, { font: FB, weight: 700 });
    rr(40, 34, tw1 + tw2 + 76, 66, 12, 'rgba(8,10,14,0.85)', 'rgba(245,184,0,0.6)', 2);
    txt('MATCH TESTER', 62, 80, { size: 38, weight: 700, color: C.acc, spacing: 2 });
    txt(sub, 62 + tw1 + 18, 76, { font: FB, size: 18, weight: 700, color: C.muted });
    const sc = M.m.score; rr(W - 360, 34, 320, 66, 12, 'rgba(8,10,14,0.85)');
    txt(String(tot(sc.red)), W - 300, 82, { size: 48, weight: 700, color: C.red, align: 'center' });
    txt(clock(M.m), W - 200, 80, { font: FB, size: 26, weight: 800, color: '#fff', align: 'center' });
    txt(String(tot(sc.blue)), W - 100, 82, { size: 48, weight: 700, color: C.blue, align: 'center' });
    ctx.restore();
    // callouts
    (o.lines || []).forEach((l, i) => {
      const k = vis(lt, l[1], o.d, 0.3, 0.25); if (k <= 0) return;
      const y = (o.ly || 820) + i * 64, w2 = tw(l[0], 34, { font: FB, weight: 800 }) + 60;
      ctx.save(); ctx.globalAlpha = k; ctx.translate((1 - k) * -60, 0);
      rr(40, y - 44, w2, 58, 10, 'rgba(8,10,14,0.88)'); ctx.fillStyle = C.acc; ctx.fillRect(40, y - 44, 6, 58);
      txt(l[0], 66, y - 4, { font: FB, size: 34, weight: 800, color: '#fff' }); ctx.restore();
    });
  }

  let CONF = null;
  function confetti(t0, t, x, y, n) {
    if (!CONF) { const r = G.makeRng(55); CONF = []; for (let i = 0; i < 260; i++) CONF.push({ a: r.range(-Math.PI, 0), v: r.range(500, 1400), s: r.range(8, 18), c: ['#f5b800', '#ffffff', '#3e8cff', '#e5484d', '#3ecf8e', '#9b8cff'][r.int(0, 5)], w: r.range(-8, 8), d: r.range(0, 0.25) }); }
    const dt = t - t0; if (dt < 0 || dt > 4) return;
    ctx.save();
    CONF.slice(0, n || 260).forEach(p => {
      const tt = dt - p.d; if (tt <= 0) return;
      const px = x + Math.cos(p.a) * p.v * tt * 0.55, py = y + Math.sin(p.a) * p.v * tt * 0.55 + 420 * tt * tt;
      ctx.globalAlpha = clamp(1 - (tt - 2.6) / 1.2, 0, 1); ctx.fillStyle = p.c; ctx.save(); ctx.translate(px, py); ctx.rotate(p.w * tt); ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
    });
    ctx.restore();
  }

  const SC = [
    // 0–4 cold open: words over a dark, fast match
    { t0: 0, t1: 4, tick(lt, dt) { tickMatch(MS.cold, dt); },
      draw(lt, t) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        // a soft, out-of-focus match: drawn at a fifth of the size and scaled up (a blur filter is very slow in a headless browser)
        { const c0 = ctx; ctx = SOFT.getContext('2d'); ctx.save(); ctx.setTransform(SOFT.width / W, 0, 0, SOFT.height / H, 0, 0);
          drawMatchView(MS.cold, 0, 0, W, H, W / E.FW * 1.35, E.FW / 2, E.FH / 2); ctx.restore(); ctx = c0; }
        ctx.save(); ctx.globalAlpha = 0.18 + 0.1 * seg(lt, 0, 3.6); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(SOFT, 0, 0, W, H); ctx.restore();
        vignette(0.9);
        const words = [['TEN SEASONS', 0.3, 1.25], ['ONE PROGRAM', 1.3, 2.25], ['EVERY DECISION', 2.3, 3.2], ['IS YOURS', 3.2, 3.95]];
        words.forEach(([s, a, b]) => { if (lt < a || lt > b) return; const k = vis(lt, a, b, 0.12, 0.12); ctx.save(); ctx.globalAlpha = k; const sc2 = 1 + (lt - a) * 0.06; ctx.translate(W / 2, H / 2); ctx.scale(sc2, sc2); txt(s, 0, 30, { size: 130, weight: 700, color: s === 'IS YOURS' ? C.acc : '#fff', align: 'center', spacing: 14, glow: s === 'IS YOURS' ? 'rgba(245,184,0,0.6)' : null }); ctx.restore(); });
        streaks(t, seg(lt, 2.5, 4) * 1.2, 'rgba(255,255,255,0.4)');
      } },
    // 4–8 title
    { t0: 4, t1: 8, tick(lt, dt) { tickMatch(MS.title, dt); },
      draw(lt, t) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.globalAlpha = 0.28; drawMatchView(MS.title, 0, 0, W, H, W / E.FW * 1.2, E.FW / 2, E.FH / 2); ctx.restore();
        const g = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 1000); g.addColorStop(0, 'rgba(8,11,15,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0.92)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        glow(W / 2, H / 2 - 40, 700, 'rgba(245,184,0,' + (0.18 * eo(seg(lt, 0, 0.5))) + ')');
        particles(t, 0.6);
        shock(W / 2, H / 2 - 40, seg(lt, 0, 0.9), C.acc, 1100);
        const mk = back(seg(lt, 0, 0.45));
        if (mk > 0) { ctx.save(); ctx.translate(W / 2, 330); ctx.scale(mk, mk); ctx.save(); ctx.shadowColor = 'rgba(245,184,0,0.7)'; ctx.shadowBlur = 60; rr(-80, -80, 160, 160, 36, C.acc); ctx.restore(); gearTile(0, 0, 160, lt * 0.8); ctx.restore(); }
        wordmark(W / 2, 640, 210, lt, 0.15, { sweep: 1.0 });
        const tk = eo(seg(lt, 0.9, 1.4));
        ctx.save(); ctx.globalAlpha = tk; ctx.fillStyle = C.acc; ctx.fillRect(W / 2 - 360 * tk, 690, 720 * tk, 3); ctx.restore();
        rtxt('RUN THE TEAM BEHIND THE ROBOT', W / 2, 760, lt, 1.1, 4, { font: FB, size: 34, weight: 800, color: '#fff', align: 'center', spacing: 10 });
        rtxt('2016 – 2026  ·  TEN FRC GAMES  ·  ONE CAREER', W / 2, 816, lt, 1.4, 4, { font: FB, size: 24, weight: 700, color: C.acc, align: 'center', spacing: 6 });
        vignette(0.5);
      } }
  ];
  // montage
  MONT.forEach((c, i) => SC.push({ t0: c[1], t1: c[2], tick(lt, dt) { const M = MS.mont[i]; if (M) tickMatch(M, dt); }, draw(lt, t) { montageCut(c, lt, t); } }));
  SC.push(
    // 18–22 real order → random order
    { t0: 18, t1: 22, draw(lt, t) {
        bg(t, { glow: { x: W / 2, y: H * 0.55, r: 1000, c: 'rgba(155,140,255,0.08)' } });
        const sk = eio(seg(lt, 1.35, 2.25));
        GAMES.forEach((y, i) => {
          const a = cardPos(i), b = cardPos(SHUF.indexOf(y));
          const ki = back(seg(lt, i * 0.06, i * 0.06 + 0.4));
          if (ki <= 0) return;
          const lift = Math.sin(Math.PI * sk) * (50 + 50 * hash(y));
          const x = lerp(a.x, b.x, sk) + Math.sin(Math.PI * sk) * (hash(y + 3) - 0.5) * 300, yy = lerp(a.y, b.y, sk) - lift, rot = Math.sin(Math.PI * sk) * (hash(y + 1) - 0.5) * 0.9;
          ctx.save(); ctx.translate(x + 140, yy + 120); ctx.rotate(rot); ctx.scale(ki, ki);
          ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 14; rr(-140, -120, 280, 240, 16, C.panel); ctx.shadowColor = 'transparent';
          rr(-140, -120, 280, 240, 16, null, sk > 0.5 ? 'rgba(155,140,255,0.6)' : 'rgba(245,184,0,0.5)', 2);
          ctx.save(); ctx.beginPath(); ctx.roundRect(-128, -108, 256, 140, 10); ctx.clip(); ctx.drawImage(THUMB[y], -128, -108 - 2, 256, 256 * THUMB[y].height / THUMB[y].width + 8); ctx.restore();
          txt(String(y), -124, 82, { size: 46, weight: 700, color: sk > 0.5 ? '#c9c0ff' : C.acc });
          txt(G.Seasons[y].name, -124, 108, { font: FB, size: fitCard(G.Seasons[y].name), weight: 800, color: '#fff' });
          ctx.restore();
        });
        // the words sit above the flying cards
        kicker(sk < 0.5 ? 'Real order' : 'Random order', 110, 120, vis(lt, 0, 4), sk < 0.5 ? C.acc : C.vio);
        rtxt(sk < 0.5 ? 'Play the decade as it happened…' : '…or shuffle the games.', 110, 190, lt, sk < 0.5 ? 0.1 : 1.6, sk < 0.5 ? 1.45 : 4, { size: 60, weight: 700, color: '#fff', stroke: 'rgba(8,11,15,0.9)', lw: 10 });
        rtxt('The vendors, rules and prices still follow the calendar year.', 110, 236, lt, 2.2, 4, { font: FB, size: 26, weight: 600, color: C.muted });
        // start in any year
        if (lt > 2.6) { const k = back(seg(lt, 2.6, 3.0)); ctx.save(); ctx.translate(W - 330, 150); ctx.scale(k, k); rr(-220, -50, 440, 100, 50, 'rgba(155,140,255,0.16)', C.vio, 2); txt('START IN ANY YEAR', 0, 12, { font: FB, size: 30, weight: 900, color: '#fff', align: 'center', spacing: 3 }); ctx.restore(); }
      } },
    // 22–30 the decade
    { t0: 22, t1: 30, draw(lt, t) { decadeScene(lt, t); } }
  );
  function fitCard(s) { const w = tw(s, 20, { font: FB, weight: 800 }); return w > 248 ? Math.floor(20 * 248 / w) : 20; }
  // 30–46 management, 2 s a screen
  MGMT.forEach((m, i) => SC.push({ t0: 30 + i * 2, t1: 32 + i * 2, draw(lt, t) { mgmtScene(i, lt, t); } }));
  SC.push(
    // 46–56 the world
    { t0: 46, t1: 56, draw(lt, t) { mapScene(lt, t); } },
    // 56–66 the simulation engine, through the match tester
    { t0: 56, t1: 60, tick(lt, dt) { tickMatch(MS.t25, dt); }, draw(lt, t) {
        testerScene(MS.t25, lt, t, { d: 4, zoom: 1.0, lines: [['Every robot plans its own route', 0.8], ['and picks its next task', 1.2], ['A defender crosses under the Barge', 1.9]] });
        if (lt < 0.8) { const k = 1 - seg(lt, 0.5, 0.75); ctx.fillStyle = 'rgba(0,0,0,' + (0.88 * k) + ')'; ctx.fillRect(0, 0, W, H);
          const s2 = lerp(1.25, 1, eo(seg(lt, 0, 0.3))); ctx.save(); ctx.translate(W / 2, H / 2 - 30); ctx.scale(s2, s2);
          txt('THE SIMULATION', 0, 0, { size: 150, weight: 700, color: '#fff', align: 'center', base: 'middle', spacing: 12, alpha: k, glow: 'rgba(245,184,0,0.5)' }); ctx.restore();
          txt('Six robots, each thinking for itself', W / 2, H / 2 + 80, { font: FB, size: 34, weight: 700, color: C.acc, align: 'center', alpha: k * eo(seg(lt, 0.1, 0.35)) }); }
      } },
    { t0: 60, t1: 63, tick(lt, dt) { tickMatch(MS.t18, dt); }, draw(lt, t) {
        testerScene(MS.t18, lt, t, { d: 3, zoom: 1.0, lines: [['Partners share the Scale', 0.2], ['Defense, pins and protected zones', 0.7]] });
      } },
    { t0: 63, t1: 66, tick(lt, dt) { tickMatch(MS.t24, dt); }, draw(lt, t) {
        testerScene(MS.t24, lt, t, { d: 3, zoom: 1.0, lines: [['Breakdowns change the plan', 0.2]] });
        const b = MS.t24.broke; if (b) { const r = b.r, s = W / E.FW * (1 + lt * 0.015); const k = (lt * 2) % 1; ctx.save(); ctx.strokeStyle = C.bad; ctx.lineWidth = 5; ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(r.x * s, r.y * s, (0.7 + k * 0.9) * s, 0, 7); ctx.stroke(); ctx.restore();
          const kk = eo(seg(lt, 0.3, 0.6)); ctx.save(); ctx.globalAlpha = kk; rr(40, 900, 760, 58, 10, 'rgba(60,10,12,0.9)', C.bad, 2); txt('INTAKE BROKE  →  ' + r.team + ' PLAYS DEFENSE', 66, 940, { font: FB, size: 30, weight: 900, color: '#ffd0d0' }); ctx.restore(); }
      } },
    // 66–76 event day
    { t0: 66, t1: 68, draw(lt, t) { eventShot('quals', 'QUALIFICATIONS', 'Scout, plan every match, make the coach calls.', lt, t, { fx: 0.36, fy: 0.3, z1: 1.6, hl: [[0.15, 0.14, 0.56, 0.37, 0.6]] }); } },
    { t0: 68, t1: 70.5, draw(lt, t) {
        eventShot('select', 'ALLIANCE SELECTION', 'Pick your partners. Future captains may say no.', lt, t, { fx: 0.7, fy: 0.42, z1: 1.45, hl: [[0.43, 0.155, 0.99, 0.78, 0.6]], out: 2.2 });
        stamp('DECLINED', C.bad, 1080, 520, lt, 1.0, -0.12); stamp('ACCEPTED', C.good, 1500, 700, lt, 1.5, 0.08);
      } },
    { t0: 70.5, t1: 73, draw(lt, t) { eventShot('bracket', 'PLAYOFFS', 'Best of three, then double elimination from 2023.', lt, t, { fx: 0.55, fy: 0.48, z1: 1.3, hl: [[0.15, 0.23, 0.985, 0.79, 0.6]], out: 2.2 }); } },
    { t0: 73, t1: 76, tick(lt, dt) { tickMatch(MS.champ, dt); }, draw(lt, t) { champScene(lt, t); } },
    // 76–84 awards and celebration
    { t0: 76, t1: 84, tick(lt, dt) { tickMatch(MS.award, dt); }, draw(lt, t) { awardScene(lt, t); } },
    // 84–90 end card
    { t0: 84, t1: 90, draw(lt, t) { endScene(lt, t); } }
  );

  function eventShot(key, title, line, lt, t, o) {
    bg(t, { glow: { x: W * 0.7, y: H * 0.5, r: 900, c: 'rgba(62,140,255,0.08)' } });
    streaks(t, 0.4, 'rgba(62,140,255,0.35)');
    shotWin(key, 640, 150, 1210, lt, Object.assign({ from: 'right', title: 'FRC Manager — ' + title.charAt(0) + title.slice(1).toLowerCase(), out: o.out || 1.72, zs: 0.4, ze: 1.4 }, o));
    const kOut = 1 - seg(lt, (o.out || 1.72) + 0.03, (o.out || 1.72) + 0.26);
    ctx.save(); ctx.globalAlpha = kOut;
    kicker('Event day', 90, 330, eo(seg(lt, 0.05, 0.3)), C.blue);
    wrap(title, 520, '700 72px ' + FD).forEach((l, j) => slam(l, 90, 420 + j * 70, lt, 0.12 + j * 0.08, { size: 72, weight: 700, color: '#fff', from: 1.5, trail: C.blue }));
    const n = wrap(title, 520, '700 72px ' + FD).length;
    wrap(line, 500, '600 28px ' + FB).forEach((l, j) => rtxt(l, 90, 420 + n * 70 + 20 + j * 40, lt, 0.35 + j * 0.05, 9, { font: FB, size: 28, weight: 600, color: C.muted }));
    ctx.restore();
  }
  function stamp(s, col, x, y, lt, at, rot) {
    const k = seg(lt, at, at + 0.18); if (k <= 0) return;
    const sc2 = lerp(2.4, 1, eo(k));
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc2, sc2); ctx.globalAlpha = eo(k) * (1 - seg(lt, 2.15, 2.4));
    rr(-200, -52, 400, 104, 12, 'rgba(0,0,0,0.55)', col, 7);
    txt(s, 0, 4, { size: 76, weight: 700, color: col, align: 'center', base: 'middle', spacing: 6 }); ctx.restore();
  }
  function champScene(lt, t) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = 0.35; drawMatchView(MS.champ, 0, 0, W, H, W / E.FW * 1.15, E.FW / 2, E.FH / 2); ctx.restore();
    vignette(0.85);
    const divs = ['ARCHIMEDES', 'CURIE', 'DALY', 'GALILEO', 'HOPPER', 'JOHNSON', 'MILSTEIN', 'NEWTON'];
    const conv = eio(seg(lt, 1.2, 1.9));
    divs.forEach((d, i) => {
      const k = back(seg(lt, i * 0.07, i * 0.07 + 0.35)); if (k <= 0) return;
      const col = i % 4, row = Math.floor(i / 4), x0 = 260 + col * 360, y0 = 330 + row * 170;
      const x = lerp(x0, W / 2 - 160, conv), y = lerp(y0, H / 2 - 60, conv);
      ctx.save(); ctx.globalAlpha = 1 - conv * 0.9; ctx.translate(x + 160, y + 60); ctx.scale(k * (1 - conv * 0.5), k * (1 - conv * 0.5));
      rr(-160, -60, 320, 120, 14, 'rgba(18,24,33,0.92)', 'rgba(62,140,255,0.7)', 2);
      txt(d, 0, 12, { size: 44, weight: 700, color: '#fff', align: 'center', spacing: 4 }); ctx.restore();
    });
    kicker('The Championship', 260, 250, vis(lt, 0, 1.4), C.blue);
    const ek = seg(lt, 1.85, 2.15);
    if (ek > 0) {
      shock(W / 2, H / 2, seg(lt, 1.85, 2.8), '#ffffff', 1200);
      glow(W / 2, H / 2, 700, 'rgba(245,184,0,' + (0.35 * eo(ek)) + ')');
      const sc2 = lerp(1.8, 1, eo(ek));
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(sc2, sc2);
      txt('EINSTEIN', 0, 40, { size: 210, weight: 700, color: '#fff', align: 'center', spacing: 18, glow: 'rgba(245,184,0,0.8)', blur: 50, alpha: eo(ek) }); ctx.restore();
      rtxt('Win your division. Play the champions of the others.', W / 2, H / 2 + 140, lt, 2.1, 3, { font: FB, size: 30, weight: 700, color: C.muted, align: 'center' });
    }
    // the eras of the Championship: two of them 2017–2020, and the Festival of Champions in July 2017
    const fk = eo(seg(lt, 0.5, 0.9)) * (1 - seg(lt, 2.75, 3.0));
    if (fk > 0) {
      ctx.save(); ctx.globalAlpha = fk;
      const items = [['TWO CHAMPIONSHIPS', '2017–2020', C.blue], ['FESTIVAL OF CHAMPIONS', 'JULY 2017', C.acc], ['DOUBLE ELIMINATION', 'FROM 2023', C.vio]];
      const bw2 = 470, gx = (W - (items.length * bw2 + 2 * 30)) / 2;
      items.forEach(([a, b, col], i) => { const x = gx + i * (bw2 + 30), y = 900 + (1 - eo(seg(lt, 0.5 + i * 0.12, 0.9 + i * 0.12))) * 60; rr(x, y, bw2, 86, 14, 'rgba(10,14,20,0.9)', col, 2); txt(a, x + bw2 / 2, y + 40, { font: FB, size: 24, weight: 900, color: '#fff', align: 'center', spacing: 2 }); txt(b, x + bw2 / 2, y + 70, { font: FB, size: 18, weight: 800, color: col, align: 'center', spacing: 3 }); });
      ctx.restore();
    }
  }
  function awardScene(lt, t) {
    ctx.fillStyle = '#04060a'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = 0.18; drawMatchView(MS.award, 0, 0, W, H, W / E.FW * 1.1, E.FW / 2, E.FH / 2); ctx.restore();
    // stage lights
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    [[0.2, '#3e8cff'], [0.5, '#f5b800'], [0.8, '#3e8cff']].forEach(([fx, c], i) => { const a = Math.sin(t * 0.9 + i * 2) * 0.25; ctx.save(); ctx.translate(W * fx, -40); ctx.rotate(a); const g = ctx.createLinearGradient(0, 0, 0, H * 1.1); g.addColorStop(0, c + '55'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(30, 0); ctx.lineTo(260, H * 1.1); ctx.lineTo(-260, H * 1.1); ctx.closePath(); ctx.fill(); ctx.restore(); });
    ctx.restore();
    // banners drop one after another and swing to rest
    const bw = 236, bh = 430, gap = 40, x0 = (W - (BANNERS.length * bw + (BANNERS.length - 1) * gap)) / 2;
    const bOut = eio(seg(lt, 5.9, 6.4));
    BANNERS.forEach((b, i) => {
      const at = 0.25 + i * 0.32, k = seg(lt, at, at + 0.55); if (k <= 0) return;
      const drop = eo(k), sw = Math.sin((lt - at) * 9) * Math.exp(-(lt - at) * 3.2) * 0.12;
      const x = x0 + i * (bw + gap), y = lerp(-bh - 40, 250, drop) - bOut * 900;
      ctx.save(); ctx.translate(x + bw / 2, y); ctx.rotate(sw);
      ctx.strokeStyle = 'rgba(200,210,220,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-bw * 0.3, 0); ctx.lineTo(0, -60); ctx.lineTo(bw * 0.3, 0); ctx.stroke();
      banner(-bw / 2, 0, bw, bh, b[0], b[1], b[2], b[3]); ctx.restore();
    });
    kicker('Banners and awards', x0, 175, vis(lt, 0.1, 6.0));
    rtxt('Regional wins, the Impact Award, the Woodie Flowers Award, the Hall of Fame.', x0, 222, lt, 0.4, 6.0, { font: FB, size: 28, weight: 700, color: '#fff' });
    // celebration
    if (lt > 6.0) {
      const k = eo(seg(lt, 6.0, 6.4));
      glow(W / 2, H / 2, 900, 'rgba(245,184,0,' + (0.25 * k) + ')');
      shock(W / 2, H / 2 + 20, seg(lt, 6.0, 7.0), C.acc, 1300);
      ctx.save(); ctx.translate(W / 2, H / 2 - 40); ctx.scale(lerp(0.4, 1, back(seg(lt, 6.0, 6.45))), lerp(0.4, 1, back(seg(lt, 6.0, 6.45))));
      trophy(0, 0, 1);
      ctx.restore();
      slam('EVENT WINNERS', W / 2, H / 2 + 250, lt, 6.15, { size: 110, weight: 700, color: '#fff', align: 'center', spacing: 12, from: 2, glow: 'rgba(245,184,0,0.6)' });
    }
    confetti(82.0, t, W / 2, H / 2 + 60, 260);
    confetti(82.25, t, W * 0.2, H * 0.9, 120);
    confetti(82.25, t, W * 0.8, H * 0.9, 120);
  }
  function trophy(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const g = ctx.createLinearGradient(-110, -150, 110, 120); g.addColorStop(0, '#fff2b0'); g.addColorStop(0.45, '#f5b800'); g.addColorStop(1, '#a86f00');
    ctx.fillStyle = g; ctx.shadowColor = 'rgba(245,184,0,0.8)'; ctx.shadowBlur = 60;
    ctx.beginPath(); ctx.moveTo(-110, -150); ctx.lineTo(110, -150); ctx.quadraticCurveTo(105, 10, 0, 40); ctx.quadraticCurveTo(-105, 10, -110, -150); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 18; ctx.strokeStyle = '#e0a400'; ctx.beginPath(); ctx.arc(-110, -90, 46, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke(); ctx.beginPath(); ctx.arc(110, -90, 46, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
    ctx.fillStyle = g; ctx.fillRect(-18, 36, 36, 60); ctx.fillRect(-80, 96, 160, 30); ctx.fillStyle = '#2a2f36'; ctx.fillRect(-100, 126, 200, 34);
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-50, -90, 14, 50, -0.2, 0, 7); ctx.fill();
    ctx.restore();
  }
  function endScene(lt, t) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    bg(t, { color: '#05070a', grid: 0.05 });
    glow(W / 2, H / 2 - 60, 900, 'rgba(245,184,0,' + (0.16 * eo(seg(lt, 0, 0.6))) + ')');
    particles(t, 0.5);
    shock(W / 2, 400, seg(lt, 0, 1.0), C.acc, 1300);
    const mk = back(seg(lt, 0.0, 0.45));
    if (mk > 0) { ctx.save(); ctx.translate(W / 2, 300); ctx.scale(mk, mk); ctx.save(); ctx.shadowColor = 'rgba(245,184,0,0.7)'; ctx.shadowBlur = 60; rr(-75, -75, 150, 150, 34, C.acc); ctx.restore(); gearTile(0, 0, 150, lt * 0.6); ctx.restore(); }
    wordmark(W / 2, 560, 190, lt, 0.1, { sweep: 1.4 });
    rtxt('YOUR PROGRAM. YOUR DECADE.', W / 2, 640, lt, 0.7, 9, { font: FB, size: 32, weight: 800, color: '#fff', align: 'center', spacing: 10 });
    const bk = back(seg(lt, 1.3, 1.75));
    if (bk > 0) { ctx.save(); ctx.translate(W / 2, 760); ctx.scale(bk, bk); rr(-430, -48, 860, 96, 48, C.acc); txt('PLAY FREE IN YOUR BROWSER', 0, 14, { font: FB, size: 34, weight: 900, color: '#141414', align: 'center', spacing: 3 }); ctx.restore(); }
    rtxt(URL_TXT, W / 2, 890, lt, 1.7, 9, { font: FB, size: 44, weight: 800, color: C.acc2, align: 'center', spacing: 1 });
    const f = seg(lt, 5.3, 6.0); if (f > 0) { ctx.fillStyle = 'rgba(0,0,0,' + f + ')'; ctx.fillRect(0, 0, W, H); }
  }

  // cuts: a gold whip bar and a glitch slice across the frame
  const CUTS = [4, 8, 18, 22, 30, 46, 56, 66, 76, 84];
  const MCUTS = MONT.map(c => c[1]).filter(x => x > 8).concat([32, 34, 36, 38, 40, 42, 44, 60, 63, 68, 70.5, 73]);
  const FLASH = [[4, 0.35, 0.9], [8, 0.2, 0.5], [56, 0.25, 0.6], [76, 0.25, 0.5], [84, 0.35, 0.8], [82, 0.2, 0.5]];
  const buf = document.createElement('canvas'); buf.width = W; buf.height = H;
  function overlays(t) {
    // glitch slices around the montage cuts and the screen changes
    const near = MCUTS.find(c => Math.abs(t - c) < 0.07);
    if (near != null) {
      const b = buf.getContext('2d'); b.clearRect(0, 0, W, H); b.drawImage(cv, 0, 0);
      for (let i = 0; i < 9; i++) { const y = hash(i + near * 10) * H, h = 20 + hash(i + 3 + near) * 90, off = (hash(i + 7 + near) - 0.5) * 160; ctx.drawImage(buf, 0, y, W, h, off, y, W, h); }
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25; ctx.drawImage(buf, 8, 0); ctx.restore();
    }
    FLASH.forEach(([at, d, k]) => { if (t >= at && t < at + d) { ctx.fillStyle = 'rgba(255,255,255,' + (k * (1 - (t - at) / d)) + ')'; ctx.fillRect(0, 0, W, H); } });
    CUTS.forEach(at => {
      const k = (t - (at - 0.12)) / 0.3; if (k < 0 || k > 1) return;
      const x = lerp(-700, W + 200, eio(k));
      ctx.save(); ctx.transform(1, 0, -0.35, 1, 0, 0); ctx.fillStyle = 'rgba(245,184,0,0.85)'; ctx.fillRect(x, 0, 160, H); ctx.fillStyle = 'rgba(245,184,0,0.3)'; ctx.fillRect(x - 140, 0, 110, H); ctx.restore();
    });
    // film grain-free letterbox fade in at the very start
    if (t < 0.4) { ctx.fillStyle = 'rgba(0,0,0,' + (1 - t / 0.4) + ')'; ctx.fillRect(0, 0, W, H); }
  }

  // ---------------------------------------------------------------- timeline
  let cur = -1, ready = false;
  function reset() { prep(); cur = -1; }
  function stepTo(fi) {
    if (fi < cur) reset();
    while (cur < fi) {
      cur++;
      const t = cur / FPS;
      SC.forEach(s => { if (s.tick && t >= s.t0 && t < s.t1) s.tick(t - s.t0, 1 / FPS); });
    }
  }
  function drawFrame(fi) {
    stepTo(fi);
    const t = fi / FPS;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.letterSpacing = '0px';
    const s = SC.find(x => t >= x.t0 && t < x.t1) || SC[SC.length - 1];
    s.draw(t - s.t0, t);
    ctx.restore();
    ctx.save(); overlays(t); ctx.restore();
  }

  // ---------------------------------------------------------------- soundtrack
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  async function renderMusic() {
    const SR = 48000, ac = new OfflineAudioContext(2, SR * DUR, SR);
    const R = G.makeRng(808);
    const noise = ac.createBuffer(1, SR * 2, SR); { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = R.next() * 2 - 1; }
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.18;
    const master = ac.createGain(); master.gain.value = 0.62; master.connect(comp); comp.connect(ac.destination);
    master.gain.setValueAtTime(0.62, 88.0); master.gain.linearRampToValueAtTime(0.0001, 89.95);
    const rev = ac.createConvolver(); { const len = SR * 2.6, ib = ac.createBuffer(2, len, SR); for (let c = 0; c < 2; c++) { const d = ib.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (R.next() * 2 - 1) * Math.pow(1 - i / len, 3.2); } rev.buffer = ib; }
    const revOut = ac.createGain(); revOut.gain.value = 0.22; rev.connect(revOut); revOut.connect(master);
    const drums = ac.createGain(); drums.gain.value = 0.9; drums.connect(master);
    const duck = ac.createGain(); duck.gain.value = 1; duck.connect(master);
    const send = (node, amt) => { const g = ac.createGain(); g.gain.value = amt; node.connect(g); g.connect(rev); };
    const ns = (t, dur, off) => { const s = ac.createBufferSource(); s.buffer = noise; s.start(t, (off || R.next() * 1.5), dur); return s; };
    const env = (g, t, a, peak, d, end) => { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(Math.max(0.0001, end || 0.0001), t + a + d); };
    function kick(t, v) {
      v = v == null ? 1 : v;
      const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(44, t + 0.12);
      env(g, t, 0.003, 0.95 * v, 0.4); o.connect(g); g.connect(drums); o.start(t); o.stop(t + 0.5);
      const c = ns(t, 0.02), hp = ac.createBiquadFilter(), cg = ac.createGain(); hp.type = 'highpass'; hp.frequency.value = 2500; env(cg, t, 0.001, 0.25 * v, 0.02); c.connect(hp); hp.connect(cg); cg.connect(drums);
      duck.gain.setValueAtTime(1, t); duck.gain.linearRampToValueAtTime(0.42, t + 0.012); duck.gain.linearRampToValueAtTime(1, t + 0.22);
    }
    function clap(t, v) {
      v = v == null ? 1 : v;
      const s = ns(t, 0.3), bp = ac.createBiquadFilter(), g = ac.createGain(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 0.9;
      g.gain.setValueAtTime(0.0001, t);
      [0, 0.011, 0.022].forEach(d => { g.gain.linearRampToValueAtTime(0.55 * v, t + d + 0.002); g.gain.linearRampToValueAtTime(0.12 * v, t + d + 0.009); });
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      s.connect(bp); bp.connect(g); g.connect(drums); send(g, 0.35);
      const o = ac.createOscillator(), og = ac.createGain(); o.type = 'triangle'; o.frequency.value = 190; env(og, t, 0.002, 0.18 * v, 0.09); o.connect(og); og.connect(drums); o.start(t); o.stop(t + 0.15);
    }
    function hat(t, open, v) {
      v = v == null ? 1 : v;
      const s = ns(t, open ? 0.35 : 0.08), hp = ac.createBiquadFilter(), g = ac.createGain(); hp.type = 'highpass'; hp.frequency.value = 7600;
      env(g, t, 0.001, (open ? 0.16 : 0.12) * v, open ? 0.3 : 0.045); s.connect(hp); hp.connect(g); g.connect(drums);
    }
    function crash(t, v) {
      const s = ns(t, 2.5), hp = ac.createBiquadFilter(), g = ac.createGain(); hp.type = 'highpass'; hp.frequency.value = 4200;
      env(g, t, 0.002, 0.2 * (v || 1), 2.2); s.connect(hp); hp.connect(g); g.connect(drums); send(g, 0.4);
    }
    function bass(t, dur, n, v) {
      v = v == null ? 1 : v;
      const o = ac.createOscillator(), o2 = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain();
      o.type = 'sawtooth'; o.frequency.value = midi(n); o2.type = 'square'; o2.frequency.value = midi(n - 12);
      lp.type = 'lowpass'; lp.Q.value = 6; lp.frequency.setValueAtTime(1100 * v, t); lp.frequency.exponentialRampToValueAtTime(260, t + Math.min(dur, 0.2));
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.32 * v, t + 0.006); g.gain.setValueAtTime(0.26 * v, t + dur - 0.03); g.gain.linearRampToValueAtTime(0.0001, t + dur);
      const sg = ac.createGain(); sg.gain.value = 0.5; o2.connect(sg); sg.connect(lp); o.connect(lp); lp.connect(g); g.connect(duck);
      o.start(t); o2.start(t); o.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
    }
    function pad(t, dur, notes, v) {
      v = v == null ? 1 : v;
      const lp = ac.createBiquadFilter(), g = ac.createGain(); lp.type = 'lowpass'; lp.frequency.value = 1500; lp.Q.value = 0.4;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05 * v, t + Math.min(0.5, dur * 0.3)); g.gain.setValueAtTime(0.05 * v, t + dur - 0.15); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.35);
      lp.connect(g); g.connect(duck); send(g, 0.6);
      notes.forEach(n => [-7, 7].forEach(dt => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midi(n); o.detune.value = dt; o.connect(lp); o.start(t); o.stop(t + dur + 0.4); }));
    }
    function pluck(t, n, v) {
      v = v == null ? 1 : v;
      const o = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain(); o.type = 'square'; o.frequency.value = midi(n);
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(4200, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.16);
      env(g, t, 0.002, 0.075 * v, 0.24); o.connect(lp); lp.connect(g); g.connect(duck); send(g, 0.3); o.start(t); o.stop(t + 0.3);
    }
    function lead(t, dur, n, v) {
      v = v == null ? 1 : v;
      const lp = ac.createBiquadFilter(), g = ac.createGain(); lp.type = 'lowpass'; lp.frequency.value = 3200; lp.Q.value = 1.5;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.085 * v, t + 0.012); g.gain.setValueAtTime(0.07 * v, t + Math.max(0.02, dur - 0.04)); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.06);
      lp.connect(g); g.connect(duck); send(g, 0.35);
      [['sawtooth', 0], ['sawtooth', 9], ['square', -6]].forEach(([ty, de]) => { const o = ac.createOscillator(); o.type = ty; o.frequency.value = midi(n); o.detune.value = de; o.connect(lp); o.start(t); o.stop(t + dur + 0.1); });
    }
    function riser(t0, t1, v) {
      const s = ns(t0, t1 - t0 + 0.05, 0), bp = ac.createBiquadFilter(), g = ac.createGain(); bp.type = 'bandpass'; bp.Q.value = 3;
      bp.frequency.setValueAtTime(300, t0); bp.frequency.exponentialRampToValueAtTime(7500, t1);
      g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.32 * (v || 1), t1); g.gain.linearRampToValueAtTime(0.0001, t1 + 0.05);
      s.connect(bp); bp.connect(g); g.connect(master); send(g, 0.3);
    }
    function whoosh(t, v) {
      const s = ns(t - 0.25, 0.6), bp = ac.createBiquadFilter(), g = ac.createGain(); bp.type = 'bandpass'; bp.Q.value = 1.4;
      bp.frequency.setValueAtTime(6000, t - 0.25); bp.frequency.exponentialRampToValueAtTime(400, t + 0.3);
      g.gain.setValueAtTime(0.0001, t - 0.25); g.gain.linearRampToValueAtTime(0.17 * (v || 1), t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      s.connect(bp); bp.connect(g); g.connect(master); send(g, 0.25);
    }
    function impact(t, v) {
      v = v || 1;
      const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(38, t + 1.4);
      env(g, t, 0.004, 0.95 * v, 2.2); o.connect(g); g.connect(drums); o.start(t); o.stop(t + 2.4);
      const s = ns(t, 1.2), lp = ac.createBiquadFilter(), ng = ac.createGain(); lp.type = 'lowpass'; lp.frequency.value = 700; env(ng, t, 0.002, 0.5 * v, 0.9); s.connect(lp); lp.connect(ng); ng.connect(drums); send(ng, 0.5);
      crash(t, 1.2 * v);
    }
    // harmony (A minor: Am F C G), one chord per 2-second bar
    const CH = [
      { b: 45, pad: [57, 60, 64, 69], arp: [57, 60, 64, 69, 72, 69, 64, 60], lead: [76, -1, 81, -1, 79, 76, 74, 76] },
      { b: 41, pad: [53, 57, 60, 65], arp: [53, 57, 60, 65, 69, 65, 60, 57], lead: [72, -1, 77, -1, 76, 72, 69, 72] },
      { b: 48, pad: [55, 60, 64, 67], arp: [48, 52, 55, 60, 64, 60, 55, 52], lead: [76, -1, 79, -1, 84, 79, 76, 79] },
      { b: 43, pad: [55, 59, 62, 67], arp: [55, 59, 62, 67, 71, 67, 62, 59], lead: [74, -1, 79, -1, 83, 81, 79, 74] }
    ];
    const sect = b => b < 2 ? 'intro' : b < 4 ? 'title' : b < 9 ? 'montage' : b < 11 ? 'shuffle' : b < 15 ? 'decade' : b < 19 ? 'mgmt' : b < 23 ? 'mgmt2' : b < 28 ? 'world' : b < 33 ? 'engine' : b < 38 ? 'events' : b < 42 ? 'awards' : 'end';
    for (let b = 0; b < 45; b++) {
      const t = b * 2, c = CH[b % 4], s = sect(b), E8 = 0.25;
      const full = s === 'montage' || s === 'engine' || s === 'events' || s === 'awards';
      const groove = full || s === 'decade' || s === 'mgmt' || s === 'mgmt2';
      if (s !== 'end') pad(t, 2, c.pad, s === 'intro' ? 0.8 : s === 'world' ? 1.25 : full ? 1.1 : 1);
      if (groove) {
        const brk = b === 8 || b === 27 || b === 37;
        for (let q = 0; q < 4; q++) { if (brk && q >= 2) continue; kick(t + q * 0.5, full ? 1 : 0.85); }
        if (s !== 'decade' || b >= 13) { clap(t + 0.5, full ? 1 : 0.8); clap(t + 1.5, full ? 1 : 0.8); }
        for (let e = 0; e < 8; e++) hat(t + e * E8, e % 2 === 1, e % 2 ? 0.9 : 0.6);
        if (full) for (let e = 0; e < 8; e++) hat(t + e * E8 + 0.125, false, 0.35);
      } else if (s === 'world') {
        for (let e = 0; e < 8; e++) hat(t + e * E8, e % 2 === 1, 0.45);
        if (b >= 26) for (let q = 0; q < 4; q++) kick(t + q * 0.5, 0.6 + (b - 26) * 0.15);
      } else if (s === 'shuffle') { kick(t, 0.8); hat(t + 1, true, 0.6); }
      else if (s === 'intro' && b === 1) { for (let e = 0; e < 16; e++) hat(t + e * 0.125, false, 0.12 + e * 0.012); }
      if (groove) { for (let e = 0; e < 8; e++) bass(t + e * E8, 0.21, c.b + (e % 4 === 3 ? 12 : 0), full ? 1 : 0.85); }
      else if (s === 'title' || s === 'shuffle') bass(t, 1.9, c.b - 12, 0.7);
      else if (s === 'world') bass(t, 1.9, c.b, 0.6);
      if (s === 'montage' || s === 'decade' || s === 'world') for (let e = 0; e < (s === 'world' ? 16 : 8); e++) pluck(t + e * (s === 'world' ? 0.125 : E8), c.arp[e % 8] + 12, s === 'world' ? 0.7 : 0.9);
      if (s === 'mgmt' || s === 'mgmt2' || s === 'awards') for (let e = 0; e < 16; e++) pluck(t + e * 0.125, c.arp[e % 8] + 12, 0.7);
      if (s === 'shuffle') for (let e = 0; e < 4; e++) pluck(t + e * 0.5, c.arp[e * 2] + 24, 0.8);
      if (s === 'mgmt2' || s === 'engine' || s === 'events' || s === 'awards') {
        const L = c.lead, up = s === 'awards' ? 12 : 0;
        for (let e = 0; e < 8; e++) { if (L[e] < 0) continue; let d = 1; while (e + d < 8 && L[e + d] === -1) d++; lead(t + e * E8, d * E8 - 0.03, L[e] + up, s === 'mgmt2' ? 0.7 : 1); }
      }
      if (b === 8 || b === 27 || b === 37) for (let e = 0; e < 8; e++) clap(t + 1 + e * 0.125, 0.25 + e * 0.09);
    }
    riser(1.0, 4.0, 1); impact(4.0, 1);
    riser(6.6, 8.0, 0.8); impact(8.0, 0.8);
    MONT.forEach(c => { if (c[1] > 8) whoosh(c[1], 0.8); });
    whoosh(18); whoosh(22); impact(22, 0.5); whoosh(30); impact(30, 0.6);
    [32, 34, 36, 38, 40, 42, 44].forEach(x => whoosh(x, 0.9));
    whoosh(46); crash(46, 0.8);
    riser(52.0, 56.0, 1.1); impact(56.0, 1.1);
    [60, 63, 66, 68, 70.5].forEach(x => whoosh(x));
    crash(66, 0.7); riser(74.0, 76.0, 0.9); impact(75.85, 0.9); impact(76.0, 0.6);
    crash(78, 0.6); crash(80, 0.6); impact(82.0, 1.0);
    riser(82.4, 84.0, 1.0); impact(84.0, 1.2);
    pad(84, 5.4, [57, 60, 64, 69, 76], 1.1);
    bass(84, 5.0, 33, 0.5);
    [[84.5, 76], [85.0, 81], [85.5, 79], [86.0, 76], [86.75, 74], [87.25, 76], [88.0, 81]].forEach(([t, n]) => pluck(t, n, 1));
    return ac.startRendering();
  }

  // ---------------------------------------------------------------- render & encode
  const status = s => { document.getElementById('st').textContent = s; window.TR.status = s; };
  async function render(opts) {
    opts = opts || {};
    const TR = window.TR;
    if (TR.busy) return 'busy';
    TR.busy = true; TR.error = null; TR.progress = 0;
    try {
      await document.fonts.ready;
      status('Composing soundtrack…');
      const audio = await renderMusic();
      const target = new Mp4Muxer.ArrayBufferTarget();
      const muxer = new Mp4Muxer.Muxer({ target, video: { codec: 'avc', width: W, height: H, frameRate: FPS }, audio: { codec: 'aac', numberOfChannels: 2, sampleRate: 48000 }, fastStart: 'in-memory', firstTimestampBehavior: 'offset' });
      status('Encoding audio…');
      const aenc = new AudioEncoder({ output: (ch, meta) => muxer.addAudioChunk(ch, meta), error: e => { TR.error = 'audio: ' + e.message; } });
      aenc.configure({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 });
      const L = audio.getChannelData(0), Rr = audio.getChannelData(1), N = 1024;
      for (let off = 0; off < L.length; off += N) {
        const n = Math.min(N, L.length - off), b2 = new Float32Array(n * 2);
        b2.set(L.subarray(off, off + n), 0); b2.set(Rr.subarray(off, off + n), n);
        const ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(off / 48000 * 1e6), data: b2 });
        aenc.encode(ad); ad.close();
      }
      await aenc.flush(); aenc.close();
      const venc = new VideoEncoder({ output: (ch, meta) => muxer.addVideoChunk(ch, meta), error: e => { TR.error = 'video: ' + e.message; } });
      // opts.sw: prefer the software encoder
      venc.configure({ codec: 'avc1.640028', width: W, height: H, bitrate: opts.bitrate || 16e6, framerate: FPS, latencyMode: 'quality', avc: { format: 'avc' }, hardwareAcceleration: opts.sw ? 'prefer-software' : 'no-preference' });
      // draw off the page: a canvas on a page the browser thinks is hidden is only updated about once a second
      cv = document.createElement('canvas'); cv.width = W; cv.height = H; ctx = cv.getContext('2d');
      reset();
      const yieldNow = () => new Promise(r => { const ch = new MessageChannel(); ch.port1.onmessage = () => r(); ch.port2.postMessage(0); });
      const n0 = opts.frames || NF, t0 = performance.now();
      const plog = [], report = s => { plog.push(s); if (opts.log) fetch('/__save?name=reveal-progress.txt', { method: 'POST', body: plog.join('\n') }).catch(() => {}); };
      for (let i = 0; i < n0; i++) {
        drawFrame(i + (opts.from || 0));
        // opts.pixels: hand the encoder a copy of the pixels instead of the canvas itself
        const ts = { timestamp: Math.round(i * 1e6 / FPS), duration: Math.round(1e6 / FPS) };
        const vf = opts.pixels ? new VideoFrame(ctx.getImageData(0, 0, W, H).data, Object.assign({ format: 'RGBA', codedWidth: W, codedHeight: H }, ts)) : new VideoFrame(cv, ts);
        venc.encode(vf, { keyFrame: i % (FPS * 2) === 0 }); vf.close();
        // wait for the encoder without a timer (a timer is held to one a second while the page is in the background)
        while (venc.encodeQueueSize > 6 && !TR.error) await yieldNow();
        if (i % 15 === 0) { TR.progress = i / n0; status('Rendering video… ' + Math.round(100 * i / n0) + '%'); await yieldNow(); }
        if (i % (opts.every || 300) === 0) report('frame ' + i + ' / ' + n0 + ' after ' + Math.round((performance.now() - t0) / 100) / 10 + ' s, queue ' + venc.encodeQueueSize);
        if (TR.error) throw new Error(TR.error);
      }
      await venc.flush(); venc.close();
      muxer.finalize();
      const out = target.buffer;
      TR.bytes = out.byteLength;
      status('Saving ' + (out.byteLength / 1048576).toFixed(1) + ' MB…');
      const name = opts.name || 'FRC-Manager-Reveal-90s.mp4';
      let saved = '';
      try { saved = await fetch('/__save?name=' + encodeURIComponent(name), { method: 'POST', body: out }).then(r => r.ok ? r.text() : ''); } catch (e) { saved = ''; }
      if (!saved) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([out], { type: 'video/mp4' })); a.download = name; a.click(); saved = 'downloaded'; }
      TR.saved = saved; TR.progress = 1;
      status('Done: ' + saved);
      return saved;
    } catch (e) { TR.error = e.message; status('Error: ' + e.message); throw e; }
    finally { TR.busy = false; cv = cvPage; ctx = ctxPage; reset(); }
  }

  // ---------------------------------------------------------------- preview UI
  const seek = document.getElementById('seek'), tm = document.getElementById('tm');
  let playing = false, raf = 0, pf = 0;
  function show(t) { const fi = clamp(Math.round(t * FPS), 0, NF - 1); drawFrame(fi); tm.textContent = (fi / FPS).toFixed(2) + ' s'; seek.value = fi / FPS; }
  seek.addEventListener('input', () => { playing = false; show(Number(seek.value)); });
  document.getElementById('play').addEventListener('click', () => {
    playing = !playing; if (!playing) return;
    let last = performance.now(); pf = Math.round(Number(seek.value) * FPS);
    const loop = now => { if (!playing) return; const adv = Math.round((now - last) * FPS / 1000); if (adv > 0) { pf = Math.min(NF - 1, pf + adv); last = now; show(pf / FPS); } if (pf < NF - 1) raf = requestAnimationFrame(loop); else playing = false; };
    raf = requestAnimationFrame(loop);
  });
  document.getElementById('render').addEventListener('click', () => { window.TR.render().catch(() => {}); });
  const fontsReady = Promise.all(['400', '600', '700', '800', '900'].map(w => document.fonts.load(w + ' 40px Inter')).concat(['600', '700'].map(w => document.fonts.load(w + ' 40px Rajdhani')))).catch(() => null).then(() => document.fonts.ready);
  const allReady = Promise.all([fontsReady, imagesReady]).then(() => { buildWorld(); thumbs(); reset(); ready = true; });
  window.TR = { show, render: o => allReady.then(() => render(o)), renderMusic, drawFrame, reset, ready: () => ready, allReady, status: '', progress: 0, NF, FPS };
  allReady.then(() => show(6.0)).catch(e => { document.getElementById('st').textContent = 'Error: ' + e.message; });
  // ?bench: time a few frames of each part (draw + read back), save the numbers and close
  if (/[?&]bench\b/.test(location.search)) allReady.then(async () => {
    const out = [], c = document.getElementById('cv');
    for (const t of [1, 6, 10, 20, 25, 34, 50, 58, 70, 74, 80, 86]) {
      const f = Math.round(t * FPS); drawFrame(f - 1); const a = performance.now();
      for (let k = 0; k < 5; k++) { drawFrame(f + k); const vf = new VideoFrame(c, { timestamp: k }); vf.close(); }
      out.push(t + 's ' + Math.round((performance.now() - a) / 5) + 'ms');
    }
    const a = performance.now(); await renderMusic(); out.push('music ' + Math.round((performance.now() - a) / 1000) + 's');
    await fetch('/__save?name=reveal-bench-' + (location.search.match(/bench=(\w+)/) || [0, 'x'])[1] + '.txt', { method: 'POST', body: out.join('\n') });
    window.close();
  });
  // ?autorender[&name=file.mp4][&frames=n][&from=frame][&every=n][&sw][&pixels]: render, save and close the window,
  // reporting progress to the local server (media/reveal-progress.txt). The released video was made in a headless
  // browser with the GPU on for drawing (on the CPU the soft shadows make it about fifty times slower), in about 90 s:
  //   msedge --headless=new --enable-gpu --use-angle=d3d11 --ignore-gpu-blocklist "http://localhost:<port>/tools/trailer/index.html?autorender&sw&pixels"
  // To check a render, decode frames straight from the file (a seeked <video> in a hidden page shows a stale frame).
  const qs = k => (location.search.match(new RegExp('[?&]' + k + '=([\\w.-]+)')) || [0, ''])[1];
  if (/[?&]autorender\b/.test(location.search)) window.TR.render({ name: qs('name') || undefined, frames: Number(qs('frames')) || 0, every: Number(qs('every')) || 0, from: Number(qs('from')) || 0, sw: /[?&]sw\b/.test(location.search), pixels: /[?&]pixels\b/.test(location.search), log: true }).then(r => fetch('/__save?name=reveal-render-log.txt', { method: 'POST', body: 'saved ' + r + ' · ' + (window.TR.bytes || 0) + ' bytes' }), e => fetch('/__save?name=reveal-render-log.txt', { method: 'POST', body: 'error ' + e.message })).finally(() => window.close());
})();
