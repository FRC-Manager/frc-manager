'use strict';
/* FRC Manager — 2D rendering: season fields (top-down), robots (top-down + side profile), effects */
(function () {
  const E = G.Engine, FW = E.FW, FH = E.FH;
  const Rd = G.Render = {};
  const COL = {
    red: '#e5484d', blue: '#3e8cff', redS: 'rgba(229,72,77,0.16)', blueS: 'rgba(62,140,255,0.16)',
    carpet: '#2a3036', carpet2: '#262b31', line: 'rgba(235,240,245,0.55)', metal: '#9aa4ae', dark: '#1a1e23',
    cargoR: '#ff6b6b', cargoB: '#5aa2ff', cone: '#ffd23f', cube: '#9b6bff', note: '#ff9a3c', coral: '#f3efe6', algae: '#3fd0b0', fuel: '#ffd84a'
  };
  Rd.COL = COL;
  const alc = a => a === 'red' ? COL.red : COL.blue;
  const als = a => a === 'red' ? COL.redS : COL.blueS;

  function P(sym, a, x, y) { return a === 'blue' ? { x, y } : sym === 'mirror' ? { x: FW - x, y } : { x: FW - x, y: FH - y }; }
  function rect(ctx, s, x, y, w, h, fill, stroke, lw) {
    ctx.beginPath(); ctx.rect(x * s, y * s, w * s, h * s);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.5; ctx.stroke(); }
  }
  // rect given in blue coords, converted for alliance a
  function arect(ctx, s, sym, a, x, y, w, h, fill, stroke, lw) {
    const p = P(sym, a, x, y), q = P(sym, a, x + w, y + h);
    rect(ctx, s, Math.min(p.x, q.x), Math.min(p.y, q.y), Math.abs(q.x - p.x), Math.abs(q.y - p.y), fill, stroke, lw);
  }
  function circ(ctx, s, x, y, r, fill, stroke, lw) {
    ctx.beginPath(); ctx.arc(x * s, y * s, r * s, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.5; ctx.stroke(); }
  }
  function poly(ctx, s, pts, fill, stroke, lw) {
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x * s, p.y * s) : ctx.moveTo(p.x * s, p.y * s)); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.5; ctx.stroke(); }
  }
  function line(ctx, s, x0, y0, x1, y1, col, lw, dash) {
    ctx.beginPath(); ctx.moveTo(x0 * s, y0 * s); ctx.lineTo(x1 * s, y1 * s);
    ctx.strokeStyle = col; ctx.lineWidth = lw || 1.5; if (dash) ctx.setLineDash(dash); ctx.stroke(); if (dash) ctx.setLineDash([]);
  }
  function text(ctx, s, str, x, y, col, size, align) {
    ctx.fillStyle = col; ctx.font = '600 ' + (size || 11) + 'px system-ui, sans-serif'; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(str, x * s, y * s);
  }
  function seeded(n) { const r = G.makeRng(n); return () => r.next(); }

  // ------------------------------------------------------------------
  // Field
  // ------------------------------------------------------------------
  Rd.field = function (ctx, year, s, m) {
    const S = G.Seasons[year], sym = S.sym;
    // carpet
    ctx.fillStyle = COL.carpet; ctx.fillRect(0, 0, FW * s, FH * s);
    for (let i = 0; i < 16; i++) { ctx.fillStyle = i % 2 ? COL.carpet : COL.carpet2; ctx.fillRect(i * FW / 16 * s, 0, FW / 16 * s + 1, FH * s); }
    rect(ctx, s, 0.05, 0.05, FW - 0.1, FH - 0.1, null, 'rgba(255,255,255,0.25)', 2);
    line(ctx, s, FW / 2, 0, FW / 2, FH, 'rgba(255,255,255,0.18)', 2);
    const fn = FIELD[year];
    if (fn) fn(ctx, s, sym, m);
  };

  const FIELD = {};
  FIELD[2022] = function (ctx, s, sym, m) {
    const cx = FW / 2, cy = FH / 2;
    // tarmacs
    ['blue', 'red'].forEach(a => {
      const pts = [];
      for (let d = 112; d <= 248; d += 8) { const g = d * Math.PI / 180; const p = P(sym, a, cx + Math.cos(g) * 3.3, cy + Math.sin(g) * 3.3); pts.push(p); }
      for (let d = 248; d >= 112; d -= 8) { const g = d * Math.PI / 180; pts.push(P(sym, a, cx + Math.cos(g) * 1.4, cy + Math.sin(g) * 1.4)); }
      poly(ctx, s, pts, als(a), alc(a), 1.5);
      // hangar
      arect(ctx, s, sym, a, 0.1, 0.1, 3.0, 2.6, 'rgba(0,0,0,0.25)', alc(a), 2);
      for (let i = 0; i < 4; i++) { const p = P(sym, a, 0.5 + i * 0.75, 0.25), q = P(sym, a, 0.5 + i * 0.75, 2.55); line(ctx, s, p.x, p.y, q.x, q.y, COL.metal, 3); }
      const lbl = P(sym, a, 1.6, 2.85); text(ctx, s, 'HANGAR', lbl.x, lbl.y, alc(a), 10);
      // terminal
      const t1 = P(sym, a, 0.1, 6.6), t2 = P(sym, a, 1.6, 8.1), t3 = P(sym, a, 0.1, 8.1);
      poly(ctx, s, [t1, t2, t3], als(a), alc(a), 1.5);
    });
    // hub
    circ(ctx, s, cx, cy, 1.36, '#3a4048', '#c8d0d8', 2);
    circ(ctx, s, cx, cy, 0.67, '#4b525b', '#e8edf2', 2);
    text(ctx, s, 'HUB', cx, cy, '#e8edf2', 11);
    // cargo dots
    const r = seeded(2022);
    for (let i = 0; i < 22; i++) { const x = 1.3 + r() * (FW - 2.6), y = 0.5 + r() * (FH - 1); if (Math.hypot(x - cx, y - cy) < 2) continue; circ(ctx, s, x, y, 0.12, i % 2 ? COL.cargoR : COL.cargoB); }
  };
  FIELD[2023] = function (ctx, s, sym, m) {
    ['blue', 'red'].forEach(a => {
      // community
      arect(ctx, s, sym, a, 0.05, 0.05, 4.85, 5.45, als(a), null);
      // grid
      arect(ctx, s, sym, a, 0.05, 0.1, 1.38, 5.3, 'rgba(0,0,0,0.35)', alc(a), 2);
      const g = m && m.ss[a] ? m.ss[a].grid : null;
      for (let row = 0; row < 3; row++) for (let col = 0; col < 9; col++) {
        const x = 1.2 - row * 0.42, y = 0.5 + col * 0.56, p = P(sym, a, x, y);
        const type = row === 0 ? 'any' : ([1, 4, 7].includes(col) ? 'cube' : 'cone');
        const v = g ? g[row * 9 + col] : 0;
        if (v === 1) poly(ctx, s, [{ x: p.x, y: p.y - 0.17 }, { x: p.x + 0.15, y: p.y + 0.13 }, { x: p.x - 0.15, y: p.y + 0.13 }], COL.cone);
        else if (v === 2) rect(ctx, s, p.x - 0.14, p.y - 0.14, 0.28, 0.28, COL.cube);
        else circ(ctx, s, p.x, p.y, 0.07, null, type === 'cube' ? COL.cube : type === 'cone' ? COL.cone : '#aaa', 1.5);
      }
      // charge station
      arect(ctx, s, sym, a, 2.95, 1.55, 1.93, 2.45, 'rgba(0,0,0,0.3)', alc(a), 2);
      const c = P(sym, a, 3.9, 2.78); text(ctx, s, 'CHARGE', c.x, c.y, alc(a), 10);
      // loading zone
      arect(ctx, s, sym, a, 13.2, 5.5, 3.3, 2.66, als(a), alc(a), 1);
      const ss = P(sym, a, 15.9, 7.1); text(ctx, s, 'SUBSTATION', ss.x, ss.y - 0.55, alc(a), 9);
      arect(ctx, s, sym, a, 16.2, 6.2, 0.3, 1.9, alc(a));
    });
    // staged pieces (decor)
    [0.92, 2.14, 3.36, 4.58].forEach((y, i) => { [7.07, FW - 7.07].forEach(x => { if (i % 2) rect(ctx, s, x - 0.12, y - 0.12, 0.24, 0.24, 'rgba(155,107,255,0.5)'); else circ(ctx, s, x, y, 0.12, 'rgba(255,210,63,0.5)'); }); });
  };
  FIELD[2024] = function (ctx, s, sym, m) {
    ['blue', 'red'].forEach(a => {
      // wing line
      const w1 = P(sym, a, 5.87, 0), w2 = P(sym, a, 5.87, FH); line(ctx, s, w1.x, w1.y, w2.x, w2.y, alc(a), 1.5, [6, 6]);
      // speaker + subwoofer
      arect(ctx, s, sym, a, 0.0, 4.6, 0.95, 1.9, als(a), alc(a), 2);
      const sp = P(sym, a, 0.45, 5.55); text(ctx, s, m && m.ss[a] && m.ss[a].ampUntil > m.t ? '★' : 'SPK', sp.x, sp.y, '#fff', 10);
      // amp
      arect(ctx, s, sym, a, 1.45, 7.75, 0.8, 0.45, alc(a));
      const ap = P(sym, a, 1.85, 7.45); text(ctx, s, 'AMP', ap.x, ap.y, alc(a), 9);
      // source
      const t1 = P(sym, a, 14.8, 0.0), t2 = P(sym, a, 16.54, 0.0), t3 = P(sym, a, 16.54, 1.7);
      poly(ctx, s, [t1, t2, t3], als(a), alc(a), 1.5);
      // stage triangle
      const pts = [0, 120, 240].map(d => { const g = d * Math.PI / 180; return P(sym, a, 4.9 + Math.cos(g) * 1.25, 4.1 + Math.sin(g) * 1.25); });
      poly(ctx, s, pts, 'rgba(0,0,0,0.3)', alc(a), 2);
      [0, 120, 240].forEach(d => { const g = (d + 60) * Math.PI / 180; const p = P(sym, a, 4.9 + Math.cos(g) * 0.62, 4.1 + Math.sin(g) * 0.62); circ(ctx, s, p.x, p.y, 0.06, COL.metal); });
      pts.forEach(p => circ(ctx, s, p.x, p.y, 0.12, COL.metal));
      // staged wing notes
      if (m && m.ss[a] && m.ss[a].wing) m.ss[a].wing.forEach(n => { if (!n.claimed) circ(ctx, s, n.x, n.y, 0.16, null, COL.note, 3); });
    });
    if (m && m.center) m.center.forEach(n => { if (!n.claimed) circ(ctx, s, n.x, n.y, 0.16, null, COL.note, 3); });
    else [0.75, 2.4, 4.1, 5.8, 7.45].forEach(y => circ(ctx, s, FW / 2, y, 0.16, null, COL.note, 3));
  };
  FIELD[2025] = function (ctx, s, sym, m) {
    // barge
    rect(ctx, s, FW / 2 - 0.25, 4.35, 0.5, 3.8, '#3a4048', '#c8d0d8', 2);
    text(ctx, s, 'BARGE', FW / 2, 4.15, '#c8d0d8', 9);
    ['blue', 'red'].forEach(a => {
      // reef hexagon
      const c = P(sym, a, 4.49, 4.03);
      const pts = [0, 60, 120, 180, 240, 300].map(d => { const g = (d + 30) * Math.PI / 180; return { x: c.x + Math.cos(g) * 0.95, y: c.y + Math.sin(g) * 0.95 }; });
      poly(ctx, s, pts, 'rgba(0,0,0,0.35)', alc(a), 2.5);
      const ss = m && m.ss[a];
      if (ss) {
        text(ctx, s, ss.lv[3] + '/' + ss.lv[2] + '/' + ss.lv[1] + '/' + ss.lv[0], c.x, c.y - 0.12, '#fff', 10);
        for (let i = 0; i < ss.algaeLow + ss.algaeHigh; i++) { const g = i * Math.PI / 3; circ(ctx, s, c.x + Math.cos(g) * 0.62, c.y + Math.sin(g) * 0.62, 0.13, COL.algae); }
        text(ctx, s, 'L4/L3/L2/L1', c.x, c.y + 0.22, 'rgba(255,255,255,0.6)', 8);
      } else text(ctx, s, 'REEF', c.x, c.y, '#fff', 10);
      // coral stations
      [[0.0, 0.0, 1.7, 0.0, 0.0, 1.3], [0.0, FH, 1.7, FH, 0.0, FH - 1.3]].forEach(t => {
        poly(ctx, s, [P(sym, a, t[0], t[1]), P(sym, a, t[2], t[3]), P(sym, a, t[4], t[5])], als(a), alc(a), 1.5);
      });
      // processor
      arect(ctx, s, sym, a, 5.6, 0.0, 0.8, 0.35, alc(a));
      // cages
      for (let i = 0; i < 3; i++) { const p = P(sym, a, 7.6, 5.0 + i * 1.1); rect(ctx, s, p.x - 0.18, p.y - 0.18, 0.36, 0.36, null, alc(a), 2); }
      // start line
      const l1 = P(sym, a, 7.4, 0.2), l2 = P(sym, a, 7.4, 4.2); line(ctx, s, l1.x, l1.y, l2.x, l2.y, alc(a), 1.2, [4, 4]);
    });
  };
  FIELD[2026] = function (ctx, s, sym, m) {
    const XB = 4.63;
    ['blue', 'red'].forEach(a => {
      arect(ctx, s, sym, a, 0.05, 0.05, 3.98, FH - 0.1, als(a), null);
      const l1 = P(sym, a, 4.03, 0), l2 = P(sym, a, 4.03, FH); line(ctx, s, l1.x, l1.y, l2.x, l2.y, alc(a), 2);
      // trenches & bumps
      arect(ctx, s, sym, a, XB - 0.6, 0.05, 1.2, 1.2, '#15181c', '#555', 1);
      arect(ctx, s, sym, a, XB - 0.6, FH - 1.25, 1.2, 1.2, '#15181c', '#555', 1);
      arect(ctx, s, sym, a, XB - 0.55, 1.65, 1.1, 1.85, 'rgba(160,160,160,0.25)', '#888', 1);
      arect(ctx, s, sym, a, XB - 0.55, 4.6, 1.1, 1.95, 'rgba(160,160,160,0.25)', '#888', 1);
      // hub
      const h = P(sym, a, XB, 4.03);
      const on = m && G.Rules[2026].active(m, a);
      circ(ctx, s, h.x, h.y, 0.62, on ? alc(a) : '#3a4048', on ? '#fff' : '#777', 2.5);
      text(ctx, s, 'HUB', h.x, h.y, '#fff', 9);
      // tower
      const t = P(sym, a, 1.1, 4.03); rect(ctx, s, t.x - 0.35, t.y - 1.1, 0.7, 2.2, 'rgba(0,0,0,0.35)', alc(a), 2);
      for (let i = 0; i < 3; i++) line(ctx, s, t.x - 0.35, t.y - 0.7 + i * 0.7, t.x + 0.35, t.y - 0.7 + i * 0.7, COL.metal, 2);
      // depot & outpost
      arect(ctx, s, sym, a, 0.1, 5.8, 0.9, 1.3, 'rgba(255,216,74,0.12)', COL.fuel, 1);
      const o1 = P(sym, a, 0.0, 0.0), o2 = P(sym, a, 1.4, 0.0), o3 = P(sym, a, 0.0, 1.6); poly(ctx, s, [o1, o2, o3], als(a), alc(a), 1.5);
      if (m && m.ss[a] && m.ss[a].pool > 0) { const p = P(sym, a, 2.7, 4.03); text(ctx, s, 'zone fuel ' + m.ss[a].pool, p.x, p.y + 1.6, COL.fuel, 9); }
    });
    const r = seeded(2026);
    for (let i = 0; i < 70; i++) circ(ctx, s, 5.5 + r() * (FW - 11), 0.4 + r() * (FH - 0.8), 0.07, 'rgba(255,216,74,0.65)');
  };

  // ------------------------------------------------------------------
  // Robot — top-down
  // ------------------------------------------------------------------
  Rd.robot = function (ctx, s, r, o) {
    o = o || {};
    const lk = r.look || {};
    const x = r.x * s, y = r.y * s, sz = 0.88 * s, h = sz / 2;
    const ac = alc(r.a);
    ctx.save();
    ctx.translate(x, y);
    if (r.climbing || (r.end && r.end.lvl > 0)) { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4; }
    ctx.rotate(r.hd || 0);
    // drivetrain under frame
    const drv = lk.drive || 'tank';
    ctx.fillStyle = '#111';
    if (drv === 'swerve') {
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(c => { ctx.save(); ctx.translate(c[0] * h * 0.68, c[1] * h * 0.68); ctx.beginPath(); ctx.arc(0, 0, sz * 0.13, 0, 7); ctx.fillStyle = '#222'; ctx.fill(); ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1; ctx.stroke(); ctx.beginPath(); ctx.moveTo(-sz * 0.1, 0); ctx.lineTo(sz * 0.1, 0); ctx.stroke(); ctx.restore(); });
    } else {
      const n = drv === 'wcd' ? 3 : drv === 'mecanum' ? 2 : 3;
      for (let i = 0; i < n; i++) {
        const wx = -h * 0.7 + i * (h * 1.4 / Math.max(1, n - 1));
        [-1, 1].forEach(sd => {
          ctx.fillStyle = '#1a1a1a'; ctx.fillRect(wx - sz * 0.1, sd * h * 0.95 - sz * 0.07, sz * 0.2, sz * 0.14);
          if (drv === 'mecanum') { ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(wx - sz * 0.08, sd * h * 0.95 - sz * 0.05 * sd); ctx.lineTo(wx + sz * 0.08, sd * h * 0.95 + sz * 0.05 * sd); ctx.stroke(); }
        });
      }
    }
    // bumper + frame
    ctx.fillStyle = ac; ctx.fillRect(-h, -h, sz, sz);
    const ver = lk.ver || 1;
    ctx.fillStyle = ver >= 2 ? shade(lk.c1 || '#7a8591', -0.15) : '#77808a';
    if (!r.isPlayer && ver >= 2) ctx.fillStyle = '#5d6670';
    ctx.fillRect(-h + sz * 0.11, -h + sz * 0.11, sz * 0.78, sz * 0.78);
    if (ver >= 3) { ctx.strokeStyle = r.held ? '#4cff8a' : (lk.c2 || '#fff'); ctx.lineWidth = 1.5; ctx.strokeRect(-h + sz * 0.14, -h + sz * 0.14, sz * 0.72, sz * 0.72); }
    // intake (front = +x)
    const it = lk.intake;
    ctx.fillStyle = '#d9dee3';
    if (it === 'over') ctx.fillRect(h - sz * 0.02, -h * 0.75, sz * 0.12, h * 1.5);
    else if (it === 'wide') ctx.fillRect(h - sz * 0.02, -h * 0.98, sz * 0.13, h * 1.96);
    else if (it === 'under') ctx.fillRect(h - sz * 0.13, -h * 0.7, sz * 0.06, h * 1.4);
    else if (it === 'dual') { ctx.fillRect(h - sz * 0.02, -h * 0.75, sz * 0.12, h * 1.5); ctx.fillRect(-h - sz * 0.1, -h * 0.75, sz * 0.12, h * 1.5); }
    else if (it === 'claw') { ctx.fillRect(h - sz * 0.05, -h * 0.4, sz * 0.12, sz * 0.06); ctx.fillRect(h - sz * 0.05, h * 0.4 - sz * 0.06, sz * 0.12, sz * 0.06); }
    else if (it === 'funnel') { ctx.beginPath(); ctx.moveTo(-h * 0.2, -h * 0.6); ctx.lineTo(-h * 0.85, 0); ctx.lineTo(-h * 0.2, h * 0.6); ctx.strokeStyle = '#d9dee3'; ctx.lineWidth = 2; ctx.stroke(); }
    // hopper
    if (lk.hopper) {
      const fill = Math.min(1, (r.held || 0) / Math.max(1, (r.cap && r.cap.storage) || lk.hopper));
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-h * 0.7, -h * 0.6, h * 1.0, h * 1.2);
      ctx.fillStyle = COL.fuel; ctx.fillRect(-h * 0.7, -h * 0.6 + h * 1.2 * (1 - fill), h * 1.0, h * 1.2 * fill);
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1; for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-h * 0.7 + i * h / 3, -h * 0.6); ctx.lineTo(-h * 0.7 + i * h / 3, h * 0.6); ctx.stroke(); }
    }
    // manipulator
    const mp = lk.manip;
    ctx.strokeStyle = '#f0f3f6'; ctx.lineWidth = 2;
    if (mp === 'elevator' || mp === 'elevwrist') {
      ctx.fillStyle = '#c3cad1'; ctx.fillRect(-h * 0.1, -h * 0.55, sz * 0.08, h * 1.1); ctx.fillRect(h * 0.18, -h * 0.55, sz * 0.08, h * 1.1);
      ctx.fillStyle = '#e8edf2'; ctx.fillRect(-h * 0.05, -h * 0.25, h * 0.45, h * 0.5);
      if (mp === 'elevwrist') { ctx.fillStyle = lk.c2 || '#ffcf4a'; ctx.fillRect(h * 0.45, -h * 0.15, h * 0.35, h * 0.3); }
    } else if (mp === 'arm') { ctx.beginPath(); ctx.moveTo(-h * 0.3, 0); ctx.lineTo(h * 0.95, 0); ctx.lineWidth = 4; ctx.stroke(); ctx.fillStyle = '#e8edf2'; ctx.fillRect(h * 0.8, -h * 0.2, h * 0.3, h * 0.4); }
    else if (mp === 'dja') { ctx.beginPath(); ctx.moveTo(-h * 0.5, 0); ctx.lineTo(h * 0.25, -h * 0.3); ctx.lineTo(h * 1.0, 0); ctx.lineWidth = 3.5; ctx.stroke(); }
    else if (mp === 'low') { ctx.fillStyle = '#e8edf2'; ctx.fillRect(h * 0.55, -h * 0.5, h * 0.25, h); }
    else if (mp === 'ampbar') { ctx.fillStyle = '#e8edf2'; ctx.fillRect(-h * 0.8, -h * 0.85, h * 1.2, h * 0.12); }
    // shooter
    const sh = lk.shooter;
    if (sh === 'turret') {
      ctx.save();
      const ang = o.aim != null ? o.aim - (r.hd || 0) : 0;
      ctx.beginPath(); ctx.arc(-h * 0.1, 0, sz * 0.24, 0, 7); ctx.fillStyle = '#2f353c'; ctx.fill(); ctx.strokeStyle = lk.c2 || '#ffcf4a'; ctx.lineWidth = 2; ctx.stroke();
      ctx.translate(-h * 0.1, 0); ctx.rotate(ang); ctx.fillStyle = '#e8edf2'; ctx.fillRect(0, -sz * 0.05, sz * 0.36, sz * 0.1);
      ctx.restore();
    } else if (sh === 'hood' || sh === 'pivot') {
      ctx.fillStyle = '#2f353c'; ctx.fillRect(-h * 0.6, -h * 0.4, h * 0.8, h * 0.8);
      ctx.strokeStyle = lk.c2 || '#ffcf4a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-h * 0.2, 0, h * 0.35, -1.2, 1.2); ctx.stroke();
    } else if (sh === 'fixed') { ctx.fillStyle = '#2f353c'; ctx.fillRect(-h * 0.55, -h * 0.35, h * 0.7, h * 0.7); ctx.fillStyle = '#e8edf2'; ctx.fillRect(-h * 0.55, -h * 0.08, h * 0.7, h * 0.16); }
    else if (sh === 'dump') { ctx.fillStyle = '#3b424a'; ctx.fillRect(-h * 0.5, -h * 0.45, h * 0.6, h * 0.9); }
    // algae mech
    if (lk.algae === 'net') { ctx.beginPath(); ctx.arc(-h * 0.55, h * 0.45, sz * 0.12, 0, 7); ctx.fillStyle = COL.algae; ctx.fill(); }
    else if (lk.algae === 'proc') { ctx.fillStyle = COL.algae; ctx.fillRect(-h * 0.8, h * 0.35, h * 0.3, h * 0.3); }
    // climber (rear = -x)
    const cl = lk.climber;
    if (cl && cl !== 'none') {
      ctx.strokeStyle = '#ffcf4a'; ctx.lineWidth = cl === 'arms' ? 3 : 2;
      const len = cl === 'arms' ? 0.32 : cl === 'hook2' ? 0.22 : 0.16;
      [-1, 1].forEach(sd => { ctx.beginPath(); ctx.moveTo(-h * 0.85, sd * h * 0.6); ctx.lineTo(-h * 0.85 - sz * len, sd * h * 0.6); ctx.stroke(); });
    }
    // held piece
    if (r.held && !lk.hopper) {
      const t = r.heldType;
      const col = t === 'cone' ? COL.cone : t === 'cube' ? COL.cube : t === 'algae' ? COL.algae : t === 'coral' ? COL.coral : G.S && r.year === 2024 ? COL.note : null;
      ctx.rotate(-(r.hd || 0));
      if (t === 'cone') { ctx.beginPath(); ctx.moveTo(0, -sz * 0.2); ctx.lineTo(sz * 0.16, sz * 0.14); ctx.lineTo(-sz * 0.16, sz * 0.14); ctx.closePath(); ctx.fillStyle = COL.cone; ctx.fill(); }
      else if (t === 'cube') { ctx.fillStyle = COL.cube; ctx.fillRect(-sz * 0.14, -sz * 0.14, sz * 0.28, sz * 0.28); }
      else if (t === 'coral') { ctx.fillStyle = COL.coral; ctx.fillRect(-sz * 0.22, -sz * 0.06, sz * 0.44, sz * 0.12); }
      else if (t === 'algae') { ctx.beginPath(); ctx.arc(0, 0, sz * 0.17, 0, 7); ctx.fillStyle = COL.algae; ctx.fill(); }
      else if (o.year === 2024) { ctx.beginPath(); ctx.arc(0, 0, sz * 0.15, 0, 7); ctx.strokeStyle = COL.note; ctx.lineWidth = 4; ctx.stroke(); }
      else { for (let i = 0; i < Math.min(2, r.held); i++) { ctx.beginPath(); ctx.arc((i - (r.held > 1 ? 0.5 : 0)) * sz * 0.26, 0, sz * 0.12, 0, 7); ctx.fillStyle = r.a === 'red' ? COL.cargoR : COL.cargoB; ctx.fill(); } }
      ctx.rotate(r.hd || 0);
    }
    ctx.restore();
    // labels (unrotated)
    ctx.save();
    ctx.font = '700 ' + Math.max(9, Math.round(s * 0.27)) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 3;
    ctx.strokeText(String(r.team), x, y + h + 8); ctx.fillText(String(r.team), x, y + h + 8);
    if (r.isPlayer) { ctx.beginPath(); ctx.arc(x, y, sz * 0.82, 0, 7); ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]); }
    if (r.dead || r.fault) {
      ctx.fillStyle = r.dead ? 'rgba(20,20,20,0.6)' : 'rgba(255,170,0,0.35)'; ctx.fillRect(x - h, y - h, sz, sz);
      ctx.fillStyle = r.dead ? '#ff5c5c' : '#ffb020'; ctx.font = '800 ' + Math.round(sz * 0.5) + 'px system-ui'; ctx.fillText(r.dead ? '✕' : '!', x, y);
    }
    if (r.defBy) { ctx.strokeStyle = 'rgba(255,90,90,0.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, sz * 0.75, 0, 7); ctx.stroke(); }
    if (lk.hopper && r.held) { ctx.font = '700 10px system-ui'; ctx.fillStyle = COL.fuel; ctx.strokeText(r.held, x, y - h - 7); ctx.fillText(r.held, x, y - h - 7); }
    ctx.restore();
  };
  function shade(hex, k) {
    const c = hex.replace('#', ''); const n = parseInt(c.length === 3 ? c.split('').map(x => x + x).join('') : c, 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.round(Math.min(255, Math.max(0, r + 255 * k))); g = Math.round(Math.min(255, Math.max(0, g + 255 * k))); b = Math.round(Math.min(255, Math.max(0, b + 255 * k)));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  Rd.shade = shade;

  // ------------------------------------------------------------------
  // Robot — side profile (Garage)
  // ------------------------------------------------------------------
  Rd.robotSide = function (ctx, W, H, look, a, team) {
    const lk = look || {};
    ctx.clearRect(0, 0, W, H);
    const gy = H - 24, s = Math.min(W / 2.0, (H - 30) / 1.45);
    // floor
    ctx.fillStyle = '#20252b'; ctx.fillRect(0, gy, W, 24);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    const cx = W / 2, fw = 0.9 * s, x0 = cx - fw / 2;
    const ver = lk.ver || 1, frame = ver >= 2 ? shade(lk.c1 || '#7a8591', -0.1) : '#8a949e';
    const low = lk.frame === 'low';
    // wheels
    const wr = 0.075 * s;
    const nW = lk.drive === 'swerve' ? 2 : 3;
    for (let i = 0; i < nW; i++) { const wx = x0 + wr + 4 + i * ((fw - 2 * wr - 8) / (nW - 1)); ctx.beginPath(); ctx.arc(wx, gy - wr, wr, 0, 7); ctx.fillStyle = '#151515'; ctx.fill(); ctx.strokeStyle = '#666'; ctx.lineWidth = 2; ctx.stroke(); }
    // frame + bumper
    const fy = gy - 2 * wr - 0.06 * s;
    ctx.fillStyle = frame; ctx.fillRect(x0, fy - 0.05 * s, fw, 0.07 * s);
    ctx.fillStyle = alc(a || 'blue'); ctx.fillRect(x0 - 0.06 * s, fy - 0.02 * s, fw + 0.12 * s, 0.13 * s);
    ctx.fillStyle = '#fff'; ctx.font = '700 ' + Math.round(0.08 * s) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(team || ''), cx, fy + 0.045 * s);
    const top = fy - 0.05 * s;
    // electronics belly pan
    ctx.fillStyle = '#2b3036'; ctx.fillRect(x0 + 0.08 * s, top - 0.08 * s, fw * 0.5, 0.08 * s);
    ctx.fillStyle = '#e5484d'; ctx.fillRect(x0 + 0.12 * s, top - 0.06 * s, 0.05 * s, 0.04 * s);
    // manipulator / elevator
    const mp = lk.manip;
    ctx.strokeStyle = '#d6dce2'; ctx.fillStyle = '#c3cad1';
    if (mp === 'elevator' || mp === 'elevwrist' || mp === 'ampbar') {
      const eh = (mp === 'ampbar' ? 0.35 : low ? 0.5 : 1.1) * s;
      ctx.fillRect(cx - 0.02 * s, top - eh, 0.04 * s, eh); ctx.fillRect(cx + 0.06 * s, top - eh * 0.92, 0.035 * s, eh * 0.92);
      ctx.fillStyle = frame; ctx.fillRect(cx - 0.02 * s, top - eh * 0.6, 0.2 * s, 0.08 * s);
      if (mp === 'elevwrist') { ctx.fillStyle = lk.c2 || '#ffcf4a'; ctx.save(); ctx.translate(cx + 0.18 * s, top - eh * 0.56); ctx.rotate(-0.5); ctx.fillRect(0, -0.03 * s, 0.22 * s, 0.07 * s); ctx.restore(); }
    } else if (mp === 'arm' || mp === 'dja') {
      ctx.lineWidth = 0.05 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx - 0.2 * s, top - 0.35 * s);
      if (mp === 'dja') { ctx.lineTo(cx + 0.1 * s, top - 0.85 * s); ctx.lineTo(cx + 0.55 * s, top - 0.7 * s); }
      else ctx.lineTo(cx + 0.45 * s, top - 0.65 * s);
      ctx.stroke();
      ctx.fillStyle = '#d6dce2'; ctx.fillRect(cx - 0.25 * s, top - 0.35 * s, 0.06 * s, 0.35 * s);
    } else if (mp === 'low') { ctx.fillStyle = '#d6dce2'; ctx.fillRect(x0 + fw - 0.05 * s, top - 0.2 * s, 0.12 * s, 0.05 * s); }
    // shooter
    const sh = lk.shooter;
    if (sh) {
      const sy = top - (low ? 0.12 : 0.28) * s, sx = cx - 0.15 * s;
      ctx.fillStyle = '#2f353c';
      if (sh === 'turret') { ctx.fillRect(sx - 0.18 * s, sy + 0.04 * s, 0.36 * s, 0.06 * s); ctx.beginPath(); ctx.arc(sx, sy, 0.12 * s, Math.PI, 0); ctx.fill(); ctx.strokeStyle = lk.c2 || '#ffcf4a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sx, sy, 0.12 * s, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke(); }
      else if (sh === 'hood' || sh === 'pivot') { ctx.beginPath(); ctx.arc(sx, sy, 0.12 * s, 0, 7); ctx.fill(); ctx.strokeStyle = lk.c2 || '#ffcf4a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sx, sy, 0.15 * s, Math.PI * 1.15, Math.PI * 1.75); ctx.stroke(); }
      else if (sh === 'fixed') { ctx.save(); ctx.translate(sx, sy); ctx.rotate(-0.9); ctx.fillRect(-0.05 * s, -0.05 * s, 0.32 * s, 0.1 * s); ctx.restore(); }
      else if (sh === 'dump') { ctx.fillRect(sx - 0.15 * s, sy, 0.3 * s, 0.15 * s); }
      ctx.fillStyle = '#2f353c'; ctx.fillRect(sx - 0.03 * s, sy, 0.06 * s, top - sy);
    }
    // hopper
    if (lk.hopper) { const hh = Math.min(0.5, 0.15 + lk.hopper / 120) * s * (low ? 0.6 : 1); ctx.strokeStyle = '#aab3bc'; ctx.lineWidth = 2; ctx.strokeRect(x0 + 0.06 * s, top - hh, fw * 0.55, hh); ctx.fillStyle = 'rgba(255,216,74,0.35)'; ctx.fillRect(x0 + 0.06 * s, top - hh * 0.5, fw * 0.55, hh * 0.5); }
    // intake
    const it = lk.intake;
    if (it && it !== 'none') {
      const ix = it === 'dual' ? [x0 - 0.08 * s, x0 + fw + 0.08 * s] : [x0 + fw + 0.08 * s];
      ix.forEach(xx => { ctx.beginPath(); ctx.arc(xx, fy + (it === 'under' ? 0.06 : -0.04) * s, (it === 'wide' ? 0.06 : 0.05) * s, 0, 7); ctx.fillStyle = '#d9dee3'; ctx.fill(); });
      if (it === 'funnel') { ctx.strokeStyle = '#d9dee3'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0 + 0.1 * s, top - 0.55 * s); ctx.lineTo(x0 + 0.25 * s, top - 0.2 * s); ctx.lineTo(x0 + 0.4 * s, top - 0.55 * s); ctx.stroke(); }
      if (it === 'claw') { ctx.fillStyle = '#d9dee3'; ctx.fillRect(x0 + fw - 0.02 * s, top - 0.45 * s, 0.14 * s, 0.05 * s); }
    }
    // climber
    const cl = lk.climber;
    if (cl && cl !== 'none') {
      const ch = { hook: 0.55, hook2: 0.75, arms: 0.95 }[cl] * s * (low ? 0.75 : 1), clx = x0 + 0.06 * s;
      ctx.fillStyle = '#ffcf4a'; ctx.fillRect(clx, top - ch, 0.035 * s, ch);
      ctx.strokeStyle = '#ffcf4a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(clx + 0.06 * s, top - ch, 0.05 * s, Math.PI, Math.PI * 2.1); ctx.stroke();
      if (cl === 'arms') { ctx.fillRect(clx + 0.12 * s, top - ch * 0.8, 0.03 * s, ch * 0.8); }
    }
    // algae
    if (lk.algae === 'net' || lk.algae === 'proc') { ctx.beginPath(); ctx.arc(x0 + fw * 0.75, top - 0.15 * s, 0.07 * s, 0, 7); ctx.fillStyle = COL.algae; ctx.fill(); }
    // vision camera
    if (lk.vision) { ctx.fillStyle = '#111'; ctx.fillRect(cx + 0.25 * s, top - 0.12 * s, 0.06 * s, 0.05 * s); ctx.fillStyle = '#4cff8a'; ctx.fillRect(cx + 0.31 * s, top - 0.11 * s, 0.015 * s, 0.03 * s); if (lk.vision > 1) { ctx.fillStyle = '#111'; ctx.fillRect(x0 + 0.1 * s, top - 0.16 * s, 0.06 * s, 0.05 * s); } }
    // LEDs
    if (ver >= 3) { ctx.fillStyle = lk.c2 || '#4cff8a'; ctx.fillRect(x0, fy - 0.07 * s, fw, 0.015 * s); }
    if (low) { ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(0, gy - 0.6 * s); ctx.lineTo(W, gy - 0.6 * s); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '10px system-ui'; ctx.textAlign = 'left'; ctx.fillText('trench clearance', 6, gy - 0.6 * s - 7); }
  };

  // ------------------------------------------------------------------
  // Effects
  // ------------------------------------------------------------------
  Rd.fx = function (ctx, s, m) {
    const now = m.t;
    m.fx = m.fx.filter(f => now - f.t < 1.2);
    m.fx.forEach(f => {
      const age = (now - f.t) / 1.2;
      if (f.k === 'shot') {
        const k = Math.min(1, age * 2.2);
        const x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k - Math.sin(k * Math.PI) * 0.6;
        circ(ctx, s, x, y, 0.1, f.hit ? 'rgba(255,240,140,' + (1 - age) + ')' : 'rgba(180,180,180,' + (1 - age) + ')');
      } else if (f.k === 'pop') {
        ctx.globalAlpha = Math.max(0, 1 - age);
        text(ctx, s, f.text, f.x, f.y - 0.4 - age * 0.8, alc(f.a), 13);
        ctx.globalAlpha = 1;
      }
    });
  };

  // Scaled static preview of a season field with sample robots
  Rd.preview = function (canvas, year) {
    const ctx = canvas.getContext('2d'), s = canvas.width / FW;
    Rd.field(ctx, year, s, null);
  };
})();
