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
    ctx.fillStyle = col; ctx.font = '600 ' + Math.round((size || 11) * Math.max(0.85, Math.min(2.6, s / 62))) + 'px system-ui, sans-serif'; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(str, x * s, y * s);
  }
  function seeded(n) { const r = G.makeRng(n); return () => r.next(); }

  // ------------------------------------------------------------------
  // Field
  // ------------------------------------------------------------------
  // polygon given in blue coordinates, converted for alliance a
  function apoly(ctx, s, sym, a, pts, fill, stroke, lw) { poly(ctx, s, pts.map(p => P(sym, a, p[0], p[1])), fill, stroke, lw); }
  function aline(ctx, s, sym, a, x0, y0, x1, y1, col, lw, dash) { const p = P(sym, a, x0, y0), q = P(sym, a, x1, y1); line(ctx, s, p.x, p.y, q.x, q.y, col, lw, dash); }
  function atext(ctx, s, sym, a, str, x, y, col, size) { const p = P(sym, a, x, y); text(ctx, s, str, p.x, p.y, col, size); }
  // a ball with a soft highlight (cargo, algae, fuel)
  function ball(ctx, s, x, y, r, col) {
    circ(ctx, s, x, y, r, col, 'rgba(0,0,0,0.35)', 1);
    circ(ctx, s, x - r * 0.3, y - r * 0.3, r * 0.35, 'rgba(255,255,255,0.35)');
  }
  function ring(ctx, s, x, y, r, col, alpha) { ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha; circ(ctx, s, x, y, r, null, col, Math.max(2, r * s * 0.55)); ctx.restore(); }
  const METAL = '#aab4be', DARKM = '#2c3238', TAPE = 'rgba(240,244,248,0.7)';
  Rd.field = function (ctx, year, s, m) {
    const S = G.Seasons[year], sym = S.sym;
    // carpet with subtle seams
    ctx.fillStyle = COL.carpet; ctx.fillRect(0, 0, FW * s, FH * s);
    for (let i = 0; i < 16; i++) { ctx.fillStyle = i % 2 ? COL.carpet : COL.carpet2; ctx.fillRect(i * FW / 16 * s, 0, FW / 16 * s + 1, FH * s); }
    // guardrail and alliance walls with driver stations
    rect(ctx, s, 0.03, 0.03, FW - 0.06, FH - 0.06, null, '#59626c', Math.max(2, s * 0.06));
    [['blue', 0.0], ['red', FW - 0.1]].forEach(([a, x]) => {
      rect(ctx, s, x, 0.03, 0.1, FH - 0.06, alc(a));
      for (let i = 0; i < 3; i++) rect(ctx, s, x + (a === 'blue' ? 0.1 : -0.06), 1.4 + i * 2.05, 0.06, 1.2, 'rgba(255,255,255,0.18)');
    });
    const fn = FIELD[year];
    if (!(fn && fn.noMid)) line(ctx, s, FW / 2, 0.05, FW / 2, FH - 0.05, 'rgba(255,255,255,0.22)', 2);
    if (fn) fn(ctx, s, sym, m);
  };

  const FIELD = {};
  Rd.FIELD = FIELD;
  Rd.K = { rect, arect, circ, poly, line, text, apoly, aline, atext, ball, ring, P, alc, als, seeded };
  // Game pieces of the classic games: how a held piece and a shot look. { shape: 'ball' | 'box' | 'disc' | 'gear', col, r }
  Rd.PIECES = {}; Rd.SHOTS = {};
  FIELD[2022] = function (ctx, s, sym, m) {
    const cx = FW / 2, cy = FH / 2, F = G.Rules.F22, rd = d => d * Math.PI / 180;
    // a point at u along direction n (degrees, y down) and v across it, from the Hub's centre
    const hp = (n, u, v) => { const g = rd(n); return { x: cx + Math.cos(g) * u - Math.sin(g) * (v || 0), y: cy + Math.sin(g) * u + Math.cos(g) * (v || 0) }; };
    // centre line: about 66° to the guardrail, through the Hub
    { const g = rd(F.arm), k = (FH / 2 - 0.05) * Math.cos(g) / Math.sin(g); line(ctx, s, cx - k, 0.05, cx + k, FH - 0.05, 'rgba(235,240,245,0.6)', 2.5); }
    ['blue', 'red'].forEach(a => {
      // two Tarmacs per alliance, in front of the fenders on its side of the centre line
      const vi = F.fend + F.tw - F.tu;
      F.own.forEach(n => apoly(ctx, s, sym, a, [[F.fend, -vi], [F.tu, -F.tw], [F.apex, 0], [F.tu, F.tw], [F.fend, vi]].map(([u, v]) => { const p = hp(n, u, v); return [p.x, p.y]; }), als(a), alc(a), 2));
      // Hangar Zone, the truss (two arches on four legs, Launch Pads on the Hub-side legs) and the rungs:
      // Traversal nearest the alliance wall, then High, Mid and Low
      arect(ctx, s, sym, a, 0.05, 0.05, 3.22, 2.9, 'rgba(0,0,0,0.28)', alc(a), 2);
      arect(ctx, s, sym, a, 0.2, 0.1, 3.07, 0.3, '#3a424b', METAL, 1);
      arect(ctx, s, sym, a, 0.2, 2.55, 3.07, 0.3, '#3a424b', METAL, 1);
      [[0.35, 0.25], [3.12, 0.25], [0.35, 2.7], [3.12, 2.7]].forEach(p => { const q = P(sym, a, p[0], p[1]); rect(ctx, s, q.x - 0.15, q.y - 0.15, 0.3, 0.3, '#5d6670', METAL, 1); });
      [0.25, 2.7].forEach(y => arect(ctx, s, sym, a, 3.27, y - 0.13, 0.07, 0.26, alc(a)));
      [['TRAV', 0.99], ['HIGH', 1.6], ['MID', 2.21], ['LOW', 3.15]].forEach(([nm, x], i) => {
        if (nm === 'MID') aline(ctx, s, sym, a, x, 0.4, x, 2.55, 'rgba(0,0,0,0.55)', 7); // the Shadow Line on the floor below it
        aline(ctx, s, sym, a, x, 0.4, x, 2.55, i <= 1 ? '#d7dde3' : METAL, 5 - i);
        atext(ctx, s, sym, a, nm, x, 3.1, alc(a), 8);
      });
      // Terminal across the corner, with the human player chute
      apoly(ctx, s, sym, a, [[0.05, 6.2], [2.01, FH - 0.05], [0.05, FH - 0.05]], als(a), alc(a), 2);
      aline(ctx, s, sym, a, 0.3, 6.75, 1.45, 7.9, '#e8edf2', 3);
      atext(ctx, s, sym, a, 'TERMINAL', 0.62, 7.62, alc(a), 7);
    });
    // Hub: fenders between four lower exits, the upper hub with its four upper exits along the arms
    const R1 = Math.hypot(F.fend, 0.585), da = 45 - Math.atan2(0.585, F.fend) * 180 / Math.PI, foot = [];
    for (let k = 0; k < 4; k++) {
      const A = F.arm + k * 90, hw = R1 * Math.sin(rd(da));
      foot.push(hp(A - da, R1), hp(A, 1.36, -hw), hp(A, 1.36, hw), hp(A + da, R1));
    }
    poly(ctx, s, foot, '#353c44', '#c8d0d8', 2);
    F.fen.forEach(n => { const p = hp(n, F.fend, -0.585), q = hp(n, F.fend, 0.585); line(ctx, s, p.x, p.y, q.x, q.y, '#e8edf2', 4); });
    circ(ctx, s, cx, cy, 0.77, '#2b3138', '#8d97a1', 1.5);
    for (let k = 0; k < 4; k++) {
      const A = F.arm + k * 90, p = hp(A, 0.55), q = hp(A, 1.62);
      line(ctx, s, p.x, p.y, q.x, q.y, '#c8d0d8', Math.max(3, s * 0.16));
      poly(ctx, s, [hp(A, 1.55, -0.2), hp(A, 1.86, -0.17), hp(A, 1.86, 0.17), hp(A, 1.55, 0.2)], '#e8edf2', METAL, 1);
    }
    ctx.save(); ctx.setLineDash([3, 3]); circ(ctx, s, cx, cy, 0.61, '#3f4750', '#e8edf2', 2); ctx.restore();
    circ(ctx, s, cx, cy, 0.14, '#1d2227', METAL, 1);
    text(ctx, s, 'HUB', cx, cy + 0.36, '#e8edf2', 8);
    // cargo: live positions during a match, the staged layout otherwise
    if (m && m.cargo) m.cargo.forEach(c => { if (c.t <= m.t) ball(ctx, s, c.x, c.y, 0.12, c.c === 'red' ? COL.cargoR : COL.cargoB); });
    else ['blue', 'red'].forEach(a => F.cargo.map(d => hp(d, F.ring)).concat([{ x: 1.14, y: 7.07 }]).forEach(p => { const q = P(sym, a, p.x, p.y); ball(ctx, s, q.x, q.y, 0.12, a === 'red' ? COL.cargoR : COL.cargoB); }));
  };
  FIELD[2022].noMid = true;
  FIELD[2023] = function (ctx, s, sym, m) {
    ['blue', 'red'].forEach(a => {
      // community and loading zone tape (both L-shaped), and the Barrier between the community and the other loading zone
      apoly(ctx, s, sym, a, [[0.05, 0.05], [4.91, 0.05], [4.91, 4.05], [3.36, 4.05], [3.36, 5.49], [0.05, 5.49]], als(a), alc(a), 1.5);
      apoly(ctx, s, sym, a, [[FW - 0.05, 5.49], [FW - 3.36, 5.49], [FW - 3.36, 6.77], [FW - 6.71, 6.77], [FW - 6.71, FH - 0.05], [FW - 0.05, FH - 0.05]], als(a), alc(a), 1.5);
      aline(ctx, s, sym, a, 1.43, 5.49, 3.67, 5.49, '#e8edf2', 3);
      // grid: 3 rows x 9 columns; co-op grid in the middle
      arect(ctx, s, sym, a, 0.05, 0.12, 1.42, 5.28, '#23282e', alc(a), 2);
      arect(ctx, s, sym, a, 0.08, 1.87, 1.36, 1.76, null, 'rgba(255,255,255,0.35)', 1);
      const g = m && m.ss[a] ? m.ss[a].grid : null;
      for (let row = 0; row < 3; row++) for (let col = 0; col < 9; col++) {
        const x = 1.2 - row * 0.42, y = 0.5 + col * 0.56, p = P(sym, a, x, y);
        const type = row === 0 ? 'any' : ([1, 4, 7].includes(col) ? 'cube' : 'cone');
        const v = g ? g[row * 9 + col] : 0;
        if (type === 'cone') { circ(ctx, s, p.x, p.y, 0.09, '#1a1e23', METAL, 1.5); circ(ctx, s, p.x, p.y, 0.03, METAL); }
        else rect(ctx, s, p.x - 0.15, p.y - 0.15, 0.3, 0.3, type === 'cube' ? 'rgba(155,107,255,0.12)' : 'rgba(255,255,255,0.05)', type === 'cube' ? 'rgba(155,107,255,0.7)' : '#7d8791', 1.2);
        if (v === 1) poly(ctx, s, [{ x: p.x, y: p.y - 0.18 }, { x: p.x + 0.16, y: p.y + 0.14 }, { x: p.x - 0.16, y: p.y + 0.14 }], COL.cone, 'rgba(0,0,0,0.4)', 1);
        else if (v === 2) rect(ctx, s, p.x - 0.14, p.y - 0.14, 0.28, 0.28, COL.cube, 'rgba(0,0,0,0.35)', 1);
      }
      // charge station: platform, hinge and ramps (glows when an alliance engages)
      const eng = m && m.ss[a] && m.ss[a].engaged;
      arect(ctx, s, sym, a, 2.95, 1.55, 0.35, 2.45, '#3a4249', null);
      arect(ctx, s, sym, a, 4.53, 1.55, 0.35, 2.45, '#3a4249', null);
      arect(ctx, s, sym, a, 3.3, 1.55, 1.23, 2.45, eng ? 'rgba(62,207,142,0.35)' : '#2f363d', eng ? '#3ecf8e' : alc(a), 2);
      aline(ctx, s, sym, a, 3.915, 1.6, 3.915, 3.95, METAL, 1.5, [4, 3]);
      for (let i = 0; i < 4; i++) { aline(ctx, s, sym, a, 3.0 + 0.05, 1.8 + i * 0.6, 3.25, 1.95 + i * 0.6, '#7d8791', 1.5); aline(ctx, s, sym, a, 4.83, 1.8 + i * 0.6, 4.58, 1.95 + i * 0.6, '#7d8791', 1.5); }
      atext(ctx, s, sym, a, 'CHARGE STATION', 3.915, 1.3, alc(a), 8);
      // double substation shelves on the wall and the single substation chute on the side wall
      arect(ctx, s, sym, a, 16.25, 6.15, 0.25, 1.95, alc(a));
      [6.55, 7.2, 7.85].forEach(y => aline(ctx, s, sym, a, 16.0, y, 16.25, y, '#e8edf2', 2));
      arect(ctx, s, sym, a, 14.0, 7.95, 0.6, 0.2, '#e8edf2', alc(a), 1);
      atext(ctx, s, sym, a, 'SUBSTATION', 15.0, 5.85, alc(a), 8);
    });
    // staged game pieces at mid-field
    [0.92, 2.14, 3.36, 4.58].forEach((y, i) => { [7.07, FW - 7.07].forEach(x => { ctx.save(); ctx.globalAlpha = 0.55; if (i % 2) rect(ctx, s, x - 0.13, y - 0.13, 0.26, 0.26, COL.cube); else poly(ctx, s, [{ x, y: y - 0.17 }, { x: x + 0.15, y: y + 0.13 }, { x: x - 0.15, y: y + 0.13 }], COL.cone); ctx.restore(); }); });
  };
  FIELD[2024] = function (ctx, s, sym, m) {
    ['blue', 'red'].forEach(a => {
      const ss = m && m.ss[a], amped = ss && ss.ampUntil > m.t;
      // wing and starting lines
      aline(ctx, s, sym, a, 5.87, 0.05, 5.87, FH - 0.05, alc(a), 1.5, [6, 6]);
      aline(ctx, s, sym, a, 1.93, 0.05, 1.93, FH - 0.05, 'rgba(255,255,255,0.35)', 1);
      // speaker + subwoofer
      if (amped) { const c = P(sym, a, 0.35, 5.55); circ(ctx, s, c.x, c.y, 1.25, 'rgba(255,210,77,0.18)'); }
      apoly(ctx, s, sym, a, [[0.05, 4.55], [0.62, 4.75], [0.95, 5.2], [0.95, 5.9], [0.62, 6.35], [0.05, 6.55]], '#30373e', alc(a), 2);
      aline(ctx, s, sym, a, 0.12, 5.05, 0.12, 6.05, amped ? COL.acc || '#ffd24d' : '#e8edf2', 5);
      atext(ctx, s, sym, a, amped ? 'AMPLIFIED' : 'SPEAKER', 0.55, 5.55, amped ? '#ffd24d' : '#e8edf2', 8);
      // amp with its two-note bank lights
      arect(ctx, s, sym, a, 1.45, 7.8, 0.8, 0.38, '#30373e', alc(a), 2);
      for (let i = 0; i < 2; i++) { const p = P(sym, a, 1.65 + i * 0.4, 7.62); circ(ctx, s, p.x, p.y, 0.08, ss && (amped || ss.bank > i) ? '#ffd24d' : '#4a525b', '#1a1e23', 1); }
      atext(ctx, s, sym, a, 'AMP', 1.85, 7.4, alc(a), 8);
      // source: human player slots
      apoly(ctx, s, sym, a, [[14.75, 0.05], [16.48, 0.05], [16.48, 1.75]], als(a), alc(a), 2);
      [0.35, 0.8, 1.25].forEach(t => aline(ctx, s, sym, a, 16.48 - t * 0.7, 0.05 + t * 0.7, 16.2 - t * 0.7, 0.33 + t * 0.7, '#e8edf2', 2));
      atext(ctx, s, sym, a, 'SOURCE', 15.6, 1.25, alc(a), 8);
      // stage: a triangle of three legs pointing at the alliance wall (the leg nearest the wall stands on the Podium),
      // a truss from the middle to each leg, chains along the sides with a trap slot in each
      const ST = G.Rules.ST24, legs = ST.legs.map(d => { const g = d * Math.PI / 180; return P(sym, a, ST.x + Math.cos(g) * ST.r, ST.y + Math.sin(g) * ST.r); }), c = P(sym, a, ST.x, ST.y);
      poly(ctx, s, legs, 'rgba(0,0,0,0.28)', 'rgba(255,255,255,0.12)', 1);
      legs.forEach(p => line(ctx, s, c.x, c.y, p.x, p.y, 'rgba(195,202,209,0.55)', 4));
      circ(ctx, s, c.x, c.y, 0.18, '#30373e', 'rgba(195,202,209,0.7)', 1.5);
      for (let i = 0; i < 3; i++) {
        const p = legs[i], q = legs[(i + 1) % 3];
        line(ctx, s, p.x, p.y, q.x, q.y, '#c3cad1', 2.5, [3, 2]);
        const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2; rect(ctx, s, mx - 0.12, my - 0.12, 0.24, 0.24, '#30373e', alc(a), 1.5);
      }
      rect(ctx, s, legs[0].x - 0.27, legs[0].y - 0.27, 0.54, 0.54, '#30373e', alc(a), 1.5); // the Podium
      legs.forEach(p => rect(ctx, s, p.x - 0.13, p.y - 0.13, 0.26, 0.26, '#5d6670', METAL, 2));
      // SPOTLIGHT: a HIGH NOTE ringing the microphone above a chain (thrown by the human player in the last 20 s)
      if (ss && ss.lit) [0, 120, 240].forEach((d, k) => {
        if (!ss.lit[k] || !(ss.hiT[k] <= m.t)) return;
        const g = d * Math.PI / 180, q = P(sym, a, ST.x + Math.cos(g) * 0.75, ST.y + Math.sin(g) * 0.75);
        circ(ctx, s, q.x, q.y, 0.42, 'rgba(255,210,77,0.22)'); ring(ctx, s, q.x, q.y, 0.15, '#ffffff');
      });
      // notes: staged wing notes and the fed pile near the speaker
      if (ss && ss.wing) ss.wing.forEach(n => { if (!n.claimed) ring(ctx, s, n.x, n.y, 0.16, COL.note); });
      if (ss && ss.pile) ss.pile.forEach(n => ring(ctx, s, n.x, n.y, 0.16, COL.note, n.t <= m.t ? 1 : 0.35));
    });
    if (m && m.loose) m.loose.forEach(n => ring(ctx, s, n.x, n.y, 0.16, COL.note, n.t <= m.t ? 1 : 0.35)); // notes lobbed into the Neutral Zone
    if (m && m.center) m.center.forEach(n => { if (!n.claimed) ring(ctx, s, n.x, n.y, 0.16, COL.note); });
    else [0.75, 2.4, 4.1, 5.8, 7.45].forEach(y => ring(ctx, s, FW / 2, y, 0.16, COL.note));
  };
  FIELD[2025] = function (ctx, s, sym, m) {
    const CY = G.Rules.CAGE25;
    ['blue', 'red'].forEach(a => {
      // starting line and the barge zone tape around the alliance's half of the Barge
      aline(ctx, s, sym, a, 6.85, 0.05, 6.85, FH - 0.05, 'rgba(0,0,0,0.55)', 2);
      arect(ctx, s, sym, a, FW / 2 - 0.6, 0.05, 1.2, 3.72, als(a), alc(a), 2);
      // reef zone and reef: six faces, two branch pipes per face (12), algae resting on the reef
      const c = P(sym, a, 4.49, 4.03), hex = r => [0, 60, 120, 180, 240, 300].map(d => { const g = (d + 30) * Math.PI / 180; return { x: c.x + Math.cos(g) * r, y: c.y + Math.sin(g) * r }; });
      poly(ctx, s, hex(1.38), als(a), alc(a), 1.5);
      poly(ctx, s, hex(0.95), '#2c3238', alc(a), 3);
      poly(ctx, s, hex(0.55), '#3a4249', 'rgba(255,255,255,0.25)', 1);
      for (let f = 0; f < 6; f++) {
        const g = f * 60 * Math.PI / 180, tx = -Math.sin(g), ty = Math.cos(g), bx = c.x + Math.cos(g) * 0.82, by = c.y + Math.sin(g) * 0.82;
        [-0.17, 0.17].forEach(o => circ(ctx, s, bx + tx * o, by + ty * o, 0.06, '#d7c9f5', '#7f6bb3', 1));
      }
      const ss = m && m.ss[a];
      if (ss) {
        if (ss.fc) ss.fc.forEach((f, k) => {
          const g = k * 60 * Math.PI / 180, n = f.lv[0] + f.lv[1] + f.lv[2] + f.lv[3];
          if (f.alg) { const p = P(sym, a, 4.49 + Math.cos(g) * 0.45, 4.03 + Math.sin(g) * 0.45); ball(ctx, s, p.x, p.y, f.alg === 'high' ? 0.13 : 0.11, COL.algae); }
          if (n) { const p = P(sym, a, 4.49 + Math.cos(g) * 1.16, 4.03 + Math.sin(g) * 1.16); text(ctx, s, String(n), p.x, p.y, n >= 11 ? '#3ecf8e' : '#f3efe6', 8); }
        });
        else for (let i = 0; i < ss.algaeLow + ss.algaeHigh; i++) { const g = (i * 60 + 30) * Math.PI / 180; ball(ctx, s, c.x + Math.cos(g) * 0.42, c.y + Math.sin(g) * 0.42, 0.13, COL.algae); }
        text(ctx, s, ss.lv[3] + '·' + ss.lv[2] + '·' + ss.lv[1] + '·' + ss.lv[0], c.x, c.y, '#fff', 9);
      } else text(ctx, s, 'REEF', c.x, c.y, '#fff', 9);
      // coral stations in the two corners of the alliance wall
      [[0.05, 0.05, 1.75, 0.05, 0.05, 1.35], [0.05, FH - 0.05, 1.75, FH - 0.05, 0.05, FH - 1.35]].forEach(t => {
        apoly(ctx, s, sym, a, [[t[0], t[1]], [t[2], t[3]], [t[4], t[5]]], als(a), alc(a), 2);
        aline(ctx, s, sym, a, (t[0] + t[2]) / 2, t[1], (t[0] + t[4]) / 2, (t[1] + t[5]) / 2, '#f3efe6', 3);
      });
      // processor on the alliance's right-hand side wall
      arect(ctx, s, sym, a, 5.6, FH - 0.32, 0.8, 0.28, '#30373e', alc(a), 2);
      atext(ctx, s, sym, a, 'PROCESSOR', 6.0, FH - 0.55, alc(a), 7);
      // net above the alliance's half of the Barge, and its three cages hanging from the truss
      arect(ctx, s, sym, a, FW / 2 - 0.12, 0.25, 0.24, 3.45, 'rgba(255,255,255,0.08)', alc(a), 1.5);
      CY.forEach(y => { const p = P(sym, a, FW / 2, y); line(ctx, s, p.x, p.y - 0.3, p.x, p.y - 0.12, METAL, 1.5); rect(ctx, s, p.x - 0.12, p.y - 0.12, 0.24, 0.24, 'rgba(0,0,0,0.35)', alc(a), 2.5); circ(ctx, s, p.x, p.y, 0.06, METAL); });
    });
    // the Barge truss spans the whole midline (with a centre support)
    ctx.save(); ctx.globalAlpha = 0.85;
    rect(ctx, s, FW / 2 - 0.56, 0.0, 1.12, FH, null, '#c8d0d8', 2);
    for (let y = 0.2; y < FH; y += 0.55) line(ctx, s, FW / 2 - 0.56, y, FW / 2 + 0.56, y + 0.4, 'rgba(200,208,216,0.35)', 1);
    ctx.restore();
    circ(ctx, s, FW / 2, FH / 2, 0.22, '#5d6670', METAL, 2);
    text(ctx, s, 'BARGE', FW / 2, FH / 2 + 0.45, '#c8d0d8', 8);
  };
  FIELD[2026] = function (ctx, s, sym, m) {
    const XB = 4.63;
    ['blue', 'red'].forEach(a => {
      arect(ctx, s, sym, a, 0.1, 0.05, 3.93, FH - 0.1, als(a), null);
      aline(ctx, s, sym, a, 4.03, 0.05, 4.03, FH - 0.05, alc(a), 2.5);
      // trenches (low tunnel under a crossbar) at both walls, bumps (ramps) in between
      [[0.05, 1.2], [FH - 1.25, 1.2]].forEach(([y, h]) => {
        arect(ctx, s, sym, a, XB - 0.6, y, 1.2, h, '#14171b', '#666', 1);
        aline(ctx, s, sym, a, XB, y, XB, y + h, METAL, 4);
        atext(ctx, s, sym, a, 'TRENCH', XB, y + h / 2, '#8d97a1', 7);
      });
      [[1.65, 1.85], [4.6, 1.95]].forEach(([y, h]) => {
        arect(ctx, s, sym, a, XB - 0.55, y, 1.1, h, 'rgba(160,168,176,0.28)', '#8d97a1', 1);
        for (let i = 0; i < 4; i++) { const yy = y + 0.25 + i * (h - 0.5) / 3; aline(ctx, s, sym, a, XB - 0.4, yy, XB, yy + 0.15, '#9aa4ae', 1.5); aline(ctx, s, sym, a, XB, yy + 0.15, XB + 0.4, yy, '#9aa4ae', 1.5); }
      });
      // hub: hexagonal funnel that lights up while active
      const h = P(sym, a, XB, 4.03), on = m && G.Rules[2026].active(m, a);
      if (on) circ(ctx, s, h.x, h.y, 0.95, a === 'red' ? 'rgba(229,72,77,0.25)' : 'rgba(62,140,255,0.25)');
      const hx = r => [0, 60, 120, 180, 240, 300].map(d => { const g = d * Math.PI / 180; return { x: h.x + Math.cos(g) * r, y: h.y + Math.sin(g) * r }; });
      poly(ctx, s, hx(0.66), on ? alc(a) : '#3a4048', on ? '#fff' : '#7d8791', 2.5);
      poly(ctx, s, hx(0.4), '#1d2227', '#9aa4ae', 1.5);
      text(ctx, s, 'HUB', h.x, h.y, '#fff', 8);
      // tower: built into the wall a little toward the outpost side. Its base plate (1.15 m deep, 1 m wide), the two
      // uprights at the front and the three rungs between them, reaching past the uprights on both sides (L1-L3 stacked)
      const TW = G.Rules.TW26;
      arect(ctx, s, sym, a, 0.05, TW.y - 0.5, 1.15, 1.0, 'rgba(0,0,0,0.35)', alc(a), 2);
      [-0.41, 0.41].forEach(dy => { const u = P(sym, a, 1.08, TW.y + dy); rect(ctx, s, u.x - 0.06, u.y - 0.06, 0.12, 0.12, '#5d6670', METAL, 1.5); });
      ['L1', 'L2', 'L3'].forEach((nm, i) => { const x = 1.08 - i * 0.07; aline(ctx, s, sym, a, x, TW.y - 0.56, x, TW.y + 0.56, i === 2 ? '#e8edf2' : METAL, 2 + i); });
      atext(ctx, s, sym, a, 'TOWER', 0.6, TW.y, alc(a), 7);
      // depot (fuel bin) and outpost (human player chute)
      arect(ctx, s, sym, a, 0.12, 5.8, 0.9, 1.3, 'rgba(255,216,74,0.12)', COL.fuel, 1.5);
      const dr = seeded(a === 'red' ? 61 : 62), dep = m && m.ss[a] ? Math.min(14, Math.ceil(m.ss[a].depot / 2)) : 12;
      for (let i = 0; i < dep; i++) { const p = P(sym, a, 0.25 + dr() * 0.65, 5.95 + dr() * 1.0); ball(ctx, s, p.x, p.y, 0.065, COL.fuel); }
      apoly(ctx, s, sym, a, [[0.05, 0.05], [1.45, 0.05], [0.05, 1.65]], als(a), alc(a), 2);
      atext(ctx, s, sym, a, 'OUTPOST', 0.5, 0.45, alc(a), 7);
      if (m && m.ss[a] && m.ss[a].pool > 0) {
        const zr = seeded(a === 'red' ? 71 : 72), nb = Math.min(48, Math.ceil(m.ss[a].pool / 2));
        for (let i = 0; i < nb; i++) { const p = P(sym, a, 1.7 + zr() * 2.1, 0.9 + zr() * 6.2); ball(ctx, s, p.x, p.y, 0.065, COL.fuel); }
        const p = P(sym, a, 2.7, 4.03); text(ctx, s, 'zone fuel ' + m.ss[a].pool, p.x, p.y + 1.6, COL.fuel, 8);
      }
    });
    const r = seeded(2026);
    const nN = m && m.neutral != null ? Math.min(120, Math.ceil(m.neutral / 3)) : 80;
    for (let i = 0; i < nN; i++) ball(ctx, s, 5.5 + r() * (FW - 11), 0.4 + r() * (FH - 0.8), 0.065, COL.fuel);
    if (m && m.neutral != null) text(ctx, s, 'neutral zone fuel ' + Math.round(m.neutral), FW / 2, 0.22, COL.fuel, 8);
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
    } else if (drv === 'tread') {
      // tank treads: one long belt down each side, with its grousers
      [-1, 1].forEach(sd => {
        ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.roundRect(-h * 0.86, sd * h * 0.95 - sz * 0.08, h * 1.72, sz * 0.16, sz * 0.07); ctx.fill();
        ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
        for (let k = 0; k <= 8; k++) { const tx = -h * 0.78 + k * (h * 1.56 / 8); ctx.beginPath(); ctx.moveTo(tx, sd * h * 0.95 - sz * 0.07); ctx.lineTo(tx, sd * h * 0.95 + sz * 0.07); ctx.stroke(); }
      });
    } else {
      const n = drv === 'wcd8' ? 4 : drv === 'mecanum' ? 2 : 3;
      for (let i = 0; i < n; i++) {
        const wx = -h * 0.7 + i * (h * 1.4 / Math.max(1, n - 1));
        [-1, 1].forEach(sd => {
          ctx.fillStyle = '#1a1a1a'; ctx.fillRect(wx - sz * 0.1, sd * h * 0.95 - sz * 0.07, sz * 0.2, sz * 0.14);
          if (drv === 'mecanum') { ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(wx - sz * 0.08, sd * h * 0.95 - sz * 0.05 * sd); ctx.lineTo(wx + sz * 0.08, sd * h * 0.95 + sz * 0.05 * sd); ctx.stroke(); }
        });
      }
    }
    // bumper (with a darker seam) + frame
    ctx.fillStyle = ac; ctx.beginPath(); ctx.roundRect(-h, -h, sz, sz, sz * 0.08); ctx.fill();
    ctx.strokeStyle = shade(ac, -0.22); ctx.lineWidth = Math.max(1, sz * 0.025); ctx.strokeRect(-h + sz * 0.055, -h + sz * 0.055, sz * 0.89, sz * 0.89);
    const ver = lk.ver || 1;
    ctx.fillStyle = ver >= 2 ? shade(lk.c1 || '#7a8591', -0.15) : '#77808a';
    if (!r.isPlayer && ver >= 2) ctx.fillStyle = '#5d6670';
    ctx.fillRect(-h + sz * 0.11, -h + sz * 0.11, sz * 0.78, sz * 0.78);
    // frame rails, battery and electronics (only drawn when there is room)
    if (sz > 26) {
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = Math.max(1, sz * 0.02);
      ctx.beginPath(); ctx.moveTo(-h + sz * 0.11, -h * 0.35); ctx.lineTo(h - sz * 0.11, -h * 0.35); ctx.moveTo(-h + sz * 0.11, h * 0.35); ctx.lineTo(h - sz * 0.11, h * 0.35); ctx.stroke();
      ctx.fillStyle = '#16191c'; ctx.fillRect(-h * 0.78, h * 0.42, sz * 0.2, sz * 0.12);
      ctx.fillStyle = '#d33'; ctx.fillRect(-h * 0.78 + sz * 0.02, h * 0.42 + sz * 0.02, sz * 0.03, sz * 0.03);
      ctx.fillStyle = '#2f6b3a'; ctx.fillRect(-h * 0.78, -h * 0.66, sz * 0.14, sz * 0.1);
      ctx.fillStyle = '#e8862e'; ctx.fillRect(-h * 0.78 + sz * 0.15, -h * 0.66, sz * 0.05, sz * 0.05);
    }
    // team number on the rear bumper
    if (sz > 34) { ctx.save(); ctx.rotate(Math.PI / 2); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = '800 ' + Math.round(sz * 0.085) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(r.team), 0, h - sz * 0.028); ctx.restore(); }
    if (ver >= 3) { ctx.strokeStyle = r.held ? '#4cff8a' : (lk.c2 || '#fff'); ctx.lineWidth = 1.5; ctx.strokeRect(-h + sz * 0.14, -h + sz * 0.14, sz * 0.72, sz * 0.72); }
    // intake (front = +x)
    const it = lk.intake;
    ctx.fillStyle = '#d9dee3';
    const stripes = (x0, y0, w, hh) => { if (sz < 26) return; ctx.save(); ctx.strokeStyle = 'rgba(40,46,52,0.6)'; ctx.lineWidth = 1; for (let yy = y0 + hh * 0.12; yy < y0 + hh; yy += hh / 6) { ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 + w, yy); ctx.stroke(); } ctx.restore(); };
    if (it === 'over') { ctx.fillRect(h - sz * 0.02, -h * 0.75, sz * 0.12, h * 1.5); stripes(h - sz * 0.02, -h * 0.75, sz * 0.12, h * 1.5); }
    else if (it === 'wide') { ctx.fillRect(h - sz * 0.02, -h * 0.98, sz * 0.13, h * 1.96); stripes(h - sz * 0.02, -h * 0.98, sz * 0.13, h * 1.96); }
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
    else if (mp === 'turretlift') {
      // 2019: the elevator on a turret. A ring on the frame; the mast, carriage and wrist turn to face the bay or the
      // Loading Station while the chassis keeps its heading, and the carriage reaches out when it places (r.vx)
      const ang = o.aim != null ? o.aim - (r.hd || 0) : 0, ex = r.vx || 0;
      ctx.beginPath(); ctx.arc(0, 0, sz * 0.27, 0, 7); ctx.fillStyle = '#2f353c'; ctx.fill(); ctx.strokeStyle = lk.c2 || '#ffcf4a'; ctx.lineWidth = 2; ctx.stroke();
      ctx.save(); ctx.rotate(ang);
      ctx.fillStyle = '#c3cad1'; ctx.fillRect(-sz * 0.07, -sz * 0.18, sz * 0.08, sz * 0.36);
      ctx.fillStyle = '#e8edf2'; ctx.fillRect(0, -sz * 0.09, sz * (0.24 + 0.2 * ex), sz * 0.18);
      ctx.fillStyle = lk.c2 || '#ffcf4a'; ctx.fillRect(sz * (0.2 + 0.2 * ex), -sz * 0.13, sz * 0.1, sz * 0.26);
      ctx.restore();
    } else if (mp === 'tele') {
      // 2023 / 2025: a telescoping arm on a low pivot at the back. It lies flat inside the frame while the robot drives
      // and shoots out over the front bumper when it places (r.vx: 0 folded … 1 fully out)
      const ex = r.vx || 0, x0 = -h * 0.62, L0 = h * 1.15, L1 = h * (1.15 + 0.95 * ex);
      ctx.fillStyle = '#2f353c'; ctx.fillRect(-h * 0.8, -h * 0.42, h * 0.3, h * 0.84);
      ctx.fillStyle = '#c3cad1'; ctx.fillRect(x0, -h * 0.17, L0, h * 0.34);
      ctx.fillStyle = '#e8edf2'; ctx.fillRect(x0 + L0 * 0.3, -h * 0.1, L1 - L0 * 0.3, h * 0.2);
      ctx.fillStyle = lk.c2 || '#ffcf4a'; ctx.fillRect(x0 + L1 - h * 0.06, -h * 0.27, h * 0.26, h * 0.54);
    }
    else if (mp === 'ampbar') { ctx.fillStyle = '#e8edf2'; ctx.fillRect(-h * 0.8, -h * 0.85, h * 1.2, h * 0.12); }
    // shooter
    const sh = lk.shooter;
    if (sh === 'turret' || sh === 'rotor') {
      ctx.save();
      const ang = o.aim != null ? o.aim - (r.hd || 0) : 0;
      ctx.beginPath(); ctx.arc(-h * 0.1, 0, sz * 0.24, 0, 7); ctx.fillStyle = '#2f353c'; ctx.fill(); ctx.strokeStyle = lk.c2 || '#ffcf4a'; ctx.lineWidth = 2; ctx.stroke();
      ctx.translate(-h * 0.1, 0); ctx.rotate(ang); ctx.fillStyle = '#e8edf2'; ctx.fillRect(0, -sz * 0.05, sz * 0.36, sz * 0.1);
      if (sh === 'rotor') { ctx.strokeStyle = lk.c2 || '#ffcf4a'; ctx.lineWidth = 1.5; for (let i = 0; i < 6; i++) { const g = i * Math.PI / 3; ctx.beginPath(); ctx.arc(Math.cos(g) * sz * 0.14, Math.sin(g) * sz * 0.14, sz * 0.03, 0, 7); ctx.stroke(); } } // the rotor that feeds it
      ctx.restore();
    } else if (sh === 'hood' || sh === 'pivot') {
      ctx.fillStyle = '#2f353c'; ctx.fillRect(-h * 0.6, -h * 0.4, h * 0.8, h * 0.8);
      ctx.strokeStyle = lk.c2 || '#ffcf4a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-h * 0.2, 0, h * 0.35, -1.2, 1.2); ctx.stroke();
    } else if (sh === 'fixed') { ctx.fillStyle = '#2f353c'; ctx.fillRect(-h * 0.55, -h * 0.35, h * 0.7, h * 0.7); ctx.fillStyle = '#e8edf2'; ctx.fillRect(-h * 0.55, -h * 0.08, h * 0.7, h * 0.16); }
    else if (sh === 'dump') {
      // 2022 low-goal bucket: an open tray that tips cargo out of the back
      ctx.fillStyle = '#3b424a'; ctx.fillRect(-h * 0.72, -h * 0.5, h * 0.8, h);
      ctx.fillStyle = '#23282e'; ctx.fillRect(-h * 0.62, -h * 0.38, h * 0.6, h * 0.76);
      ctx.strokeStyle = '#9aa4ae'; ctx.lineWidth = Math.max(1, sz * 0.02); ctx.strokeRect(-h * 0.72, -h * 0.5, h * 0.8, h);
    } else if (sh === 'wide') {
      // 2026 wide dumper: a bank of flywheels across the front, four fuel balls wide (4 x 15 cm), under an adjustable hood
      ctx.fillStyle = '#2f353c'; ctx.fillRect(h * 0.16, -h * 0.72, h * 0.5, h * 1.44);
      ctx.strokeStyle = '#9aa4ae'; ctx.lineWidth = Math.max(1, sz * 0.02); ctx.beginPath(); ctx.arc(h * 0.05, 0, h * 0.72, -0.85, 0.85); ctx.stroke(); // the hood
      for (let i = 0; i < 4; i++) {
        const yy = (i - 1.5) * sz * 0.17;
        ctx.beginPath(); ctx.arc(h * 0.41, yy, sz * 0.075, 0, 7); ctx.fillStyle = lk.c2 || '#ffcf4a'; ctx.fill();
        ctx.beginPath(); ctx.arc(h * 0.41, yy, sz * 0.03, 0, 7); ctx.fillStyle = '#2f353c'; ctx.fill();
      }
    }
    // 2020 revolver indexer: a drum of five 7-inch power cells (about 20 inches across) in front of the shooter
    if (lk.indexer === 'revolver') { ctx.beginPath(); ctx.arc(h * 0.42, 0, sz * 0.25, 0, 7); ctx.fillStyle = '#2f353c'; ctx.fill(); ctx.strokeStyle = lk.c2 || '#ffcf4a'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = '#ffd84a'; for (let i = 0; i < 5; i++) { const g = i * Math.PI * 0.4 + (o.t || 0) * 2; ctx.beginPath(); ctx.arc(h * 0.42 + Math.cos(g) * sz * 0.15, Math.sin(g) * sz * 0.15, sz * 0.085, 0, 7); ctx.fill(); } }
    // algae mech
    if (lk.algae === 'net') { ctx.beginPath(); ctx.arc(-h * 0.55, h * 0.45, sz * 0.12, 0, 7); ctx.fillStyle = COL.algae; ctx.fill(); }
    else if (lk.algae === 'proc') { ctx.fillStyle = COL.algae; ctx.fillRect(-h * 0.8, h * 0.35, h * 0.3, h * 0.3); }
    // climber (rear = -x)
    const cl = lk.climber;
    if (cl && cl !== 'none') {
      ctx.strokeStyle = '#ffcf4a'; ctx.lineWidth = cl === 'arms' || cl === 'triple' ? 3 : 2;
      if (cl === 'triple') { ctx.lineWidth = 2; [-1, 1].forEach(sd => { ctx.beginPath(); ctx.moveTo(-h * 0.6, sd * h * 0.95); ctx.lineTo(-h * 0.6, sd * (h * 0.95 + sz * 0.26)); ctx.stroke(); }); ctx.lineWidth = 3; } // ramps out to both sides for the two partners
      const len = cl === 'arms' || cl === 'triple' ? 0.32 : cl === 'hook2' ? 0.22 : 0.16;
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
      else if (Rd.PIECES[t]) {
        const pc = Rd.PIECES[t], q = sz * (pc.r || 0.15), n = Math.min(pc.many || 1, r.held);
        for (let i = 0; i < n; i++) {
          const ox = (i - (n - 1) / 2) * q * 1.5;
          ctx.beginPath();
          if (pc.shape === 'box') { ctx.fillStyle = pc.col; ctx.fillRect(ox - q, -q, 2 * q, 2 * q); ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1; ctx.strokeRect(ox - q, -q, 2 * q, 2 * q); }
          else if (pc.shape === 'disc') { ctx.arc(ox, 0, q, 0, 7); ctx.strokeStyle = pc.col; ctx.lineWidth = Math.max(2, q * 0.5); ctx.stroke(); }
          else if (pc.shape === 'gear') { ctx.arc(ox, 0, q, 0, 7); ctx.fillStyle = pc.col; ctx.fill(); ctx.beginPath(); ctx.arc(ox, 0, q * 0.4, 0, 7); ctx.fillStyle = '#1a1e23'; ctx.fill(); }
          else { ctx.arc(ox, 0, q, 0, 7); ctx.fillStyle = pc.col; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.stroke(); }
        }
      }
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
    // wheels on one side: 2 for swerve and mecanum (four-wheel drives), 4 for the 2016 eight-wheel drive, 3 for six-wheel ones
    const nW = lk.drive === 'swerve' || lk.drive === 'mecanum' ? 2 : lk.drive === 'wcd8' ? 4 : 3;
    if (lk.drive === 'tread') {
      // tank treads: a belt looped over the drive sprockets, with road wheels and grousers
      const r2 = wr * 1.05, xa = x0 + r2 + 4, xb = x0 + fw - r2 - 4, cy0 = gy - r2;
      ctx.fillStyle = '#1b1d20'; ctx.beginPath(); ctx.roundRect(xa - r2, cy0 - r2, xb - xa + 2 * r2, 2 * r2, r2); ctx.fill(); ctx.strokeStyle = '#7d858d'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = '#8d959d'; ctx.lineWidth = 1.5;
      for (let k = 0; k <= 12; k++) { const tx = xa + k * (xb - xa) / 12; ctx.beginPath(); ctx.moveTo(tx, gy - 3); ctx.lineTo(tx, gy); ctx.stroke(); ctx.beginPath(); ctx.moveTo(tx, cy0 - r2); ctx.lineTo(tx, cy0 - r2 + 3); ctx.stroke(); }
      [xa, (xa + xb) / 2, xb].forEach((wx, k) => { ctx.beginPath(); ctx.arc(wx, cy0, r2 * (k === 1 ? 0.55 : 0.7), 0, 7); ctx.fillStyle = '#454c54'; ctx.fill(); ctx.beginPath(); ctx.arc(wx, cy0, r2 * 0.25, 0, 7); ctx.fillStyle = '#8d97a1'; ctx.fill(); });
    } else for (let i = 0; i < nW; i++) {
      const wx = x0 + wr + 4 + i * ((fw - 2 * wr - 8) / (nW - 1));
      ctx.beginPath(); ctx.arc(wx, gy - wr, wr, 0, 7); ctx.fillStyle = '#151515'; ctx.fill(); ctx.strokeStyle = '#666'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(wx, gy - wr, wr * 0.35, 0, 7); ctx.fillStyle = '#8d97a1'; ctx.fill();
      if (lk.drive === 'mecanum') { ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1.2; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(wx - wr * 0.75 + k * wr * 0.5, gy - wr * 1.7); ctx.lineTo(wx - wr * 0.25 + k * wr * 0.5, gy - wr * 0.3); ctx.stroke(); } } // the angled rollers
    }
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
    else if (mp === 'turretlift') {
      // 2019: the whole cascade elevator stands on a turret ring, with a wrist at the carriage
      const eh = (low ? 0.5 : 1.05) * s, ty = top - 0.05 * s;
      ctx.fillStyle = '#2f353c'; ctx.fillRect(cx - 0.21 * s, ty, 0.42 * s, 0.05 * s);
      ctx.strokeStyle = lk.c2 || '#ffcf4a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 0.21 * s, ty); ctx.lineTo(cx + 0.21 * s, ty); ctx.stroke();
      ctx.fillStyle = '#c3cad1'; ctx.fillRect(cx - 0.04 * s, ty - eh, 0.04 * s, eh); ctx.fillRect(cx + 0.03 * s, ty - eh * 0.92, 0.035 * s, eh * 0.92);
      ctx.fillStyle = frame; ctx.fillRect(cx - 0.04 * s, ty - eh * 0.6, 0.2 * s, 0.08 * s);
      ctx.fillStyle = lk.c2 || '#ffcf4a'; ctx.save(); ctx.translate(cx + 0.16 * s, ty - eh * 0.56); ctx.rotate(-0.35); ctx.fillRect(0, -0.03 * s, 0.24 * s, 0.07 * s); ctx.restore();
    } else if (mp === 'tele') {
      // 2023 / 2025: a three-stage telescoping arm on a low pivot at the back of the frame, drawn raised to a scoring
      // angle; everything heavy sits down by the axles
      const px = cx - 0.28 * s, py = top - 0.1 * s;
      ctx.fillStyle = '#2f353c'; ctx.beginPath(); ctx.moveTo(px - 0.1 * s, top); ctx.lineTo(px + 0.1 * s, top); ctx.lineTo(px + 0.035 * s, py - 0.05 * s); ctx.lineTo(px - 0.035 * s, py - 0.05 * s); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.translate(px, py); ctx.rotate(-0.62);
      ctx.fillStyle = '#c3cad1'; ctx.fillRect(-0.07 * s, -0.045 * s, 0.6 * s, 0.09 * s);
      ctx.fillStyle = '#dfe5ea'; ctx.fillRect(0.5 * s, -0.032 * s, 0.38 * s, 0.064 * s);
      ctx.fillStyle = '#f4f7fa'; ctx.fillRect(0.85 * s, -0.02 * s, 0.2 * s, 0.04 * s);
      ctx.translate(1.05 * s, 0); ctx.rotate(0.95);
      ctx.fillStyle = lk.c2 || '#ffcf4a'; ctx.fillRect(-0.02 * s, -0.035 * s, 0.2 * s, 0.07 * s);
      ctx.restore();
      ctx.beginPath(); ctx.arc(px, py, 0.035 * s, 0, 7); ctx.fillStyle = lk.c2 || '#ffcf4a'; ctx.fill();
    }
    // shooter
    const sh = lk.shooter;
    if (sh) {
      const sy = top - (low ? 0.12 : 0.28) * s, sx = cx - 0.15 * s;
      ctx.fillStyle = '#2f353c';
      if (sh === 'turret' || sh === 'rotor') { if (sh === 'rotor') { ctx.save(); ctx.strokeStyle = lk.c2 || '#ffcf4a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy + 0.07 * s, 0.09 * s, 0, Math.PI); ctx.stroke(); ctx.restore(); } ctx.fillRect(sx - 0.18 * s, sy + 0.04 * s, 0.36 * s, 0.06 * s); ctx.beginPath(); ctx.arc(sx, sy, 0.12 * s, Math.PI, 0); ctx.fill(); ctx.strokeStyle = lk.c2 || '#ffcf4a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sx, sy, 0.12 * s, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke(); }
      else if (sh === 'hood' || sh === 'pivot') { ctx.beginPath(); ctx.arc(sx, sy, 0.12 * s, 0, 7); ctx.fill(); ctx.strokeStyle = lk.c2 || '#ffcf4a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sx, sy, 0.15 * s, Math.PI * 1.15, Math.PI * 1.75); ctx.stroke(); }
      else if (sh === 'fixed') { ctx.save(); ctx.translate(sx, sy); ctx.rotate(-0.9); ctx.fillRect(-0.05 * s, -0.05 * s, 0.32 * s, 0.1 * s); ctx.restore(); }
      else if (sh === 'dump') { ctx.beginPath(); ctx.moveTo(sx - 0.2 * s, sy); ctx.lineTo(sx + 0.15 * s, sy); ctx.lineTo(sx + 0.22 * s, sy - 0.16 * s); ctx.lineTo(sx - 0.27 * s, sy - 0.16 * s); ctx.closePath(); ctx.fill(); }
      else if (sh === 'wide') { ctx.fillRect(sx - 0.05 * s, sy - 0.12 * s, 0.42 * s, 0.24 * s); ctx.fillStyle = lk.c2 || '#ffcf4a'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(sx + 0.05 * s + i * 0.12 * s, sy, 0.045 * s, 0, 7); ctx.fill(); } ctx.fillStyle = '#2f353c'; }
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
      if (it === 'claw' && mp !== 'tele' && mp !== 'turretlift') { ctx.fillStyle = '#d9dee3'; ctx.fillRect(x0 + fw - 0.02 * s, top - 0.45 * s, 0.14 * s, 0.05 * s); } // (the telescope and the turreted elevator draw their own gripper at the wrist)
    }
    // climber
    const cl = lk.climber;
    if (cl && cl !== 'none') {
      const ch = { hook: 0.55, hook2: 0.75, arms: 0.95, triple: 0.95 }[cl] * s * (low ? 0.75 : 1), clx = x0 + 0.06 * s;
      ctx.fillStyle = '#ffcf4a'; ctx.fillRect(clx, top - ch, 0.035 * s, ch);
      ctx.strokeStyle = '#ffcf4a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(clx + 0.06 * s, top - ch, 0.05 * s, Math.PI, Math.PI * 2.1); ctx.stroke();
      if (cl === 'arms' || cl === 'triple') { ctx.fillRect(clx + 0.12 * s, top - ch * 0.8, 0.03 * s, ch * 0.8); }
      if (cl === 'triple') { ctx.fillRect(x0 - 0.3 * s, gy - 0.03 * s, 0.3 * s, 0.03 * s); ctx.fillRect(x0 + fw, gy - 0.03 * s, 0.3 * s, 0.03 * s); } // the partners' ramps, folded down
    }
    // algae
    if (lk.algae === 'net' || lk.algae === 'proc') { ctx.beginPath(); ctx.arc(x0 + fw * 0.75, top - 0.15 * s, 0.07 * s, 0, 7); ctx.fillStyle = COL.algae; ctx.fill(); }
    // vision camera
    if (lk.vision) { ctx.fillStyle = '#111'; ctx.fillRect(cx + 0.25 * s, top - 0.12 * s, 0.06 * s, 0.05 * s); ctx.fillStyle = '#4cff8a'; ctx.fillRect(cx + 0.31 * s, top - 0.11 * s, 0.015 * s, 0.03 * s); if (lk.vision > 1) { ctx.fillStyle = '#111'; ctx.fillRect(x0 + 0.1 * s, top - 0.16 * s, 0.06 * s, 0.05 * s); } }
    // LEDs
    if (ver >= 3) { ctx.fillStyle = lk.c2 || '#4cff8a'; ctx.fillRect(x0, fy - 0.07 * s, fw, 0.015 * s); }
    if (low) { ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(0, gy - 0.6 * s); ctx.lineTo(W, gy - 0.6 * s); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '10px system-ui'; ctx.textAlign = 'left'; ctx.fillText(lk.year === 2016 ? 'low bar' : 'trench clearance', 6, gy - 0.6 * s - 7); }
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
        ctx.save(); ctx.globalAlpha = Math.max(0, 1 - age) * (f.hit ? 1 : 0.55);
        if (m.year === 2024) ring(ctx, s, x, y, 0.15, COL.note);
        else if (m.year === 2022) ball(ctx, s, x, y, 0.12, f.a === 'red' ? COL.cargoR : COL.cargoB);
        else if (m.year === 2025) ball(ctx, s, x, y, 0.17, COL.algae);
        else if (m.year === 2026) { ball(ctx, s, x, y, 0.07, COL.fuel); ball(ctx, s, x - 0.18, y + 0.1, 0.06, COL.fuel); ball(ctx, s, x + 0.12, y - 0.14, 0.06, COL.fuel); }
        else if (Rd.SHOTS[m.year]) { const sh = Rd.SHOTS[m.year]; if (sh.shape === 'box') rect(ctx, s, x - sh.r, y - sh.r, sh.r * 2, sh.r * 2, sh.col, 'rgba(0,0,0,0.35)', 1); else ball(ctx, s, x, y, sh.r, sh.col); if (sh.many) { ball(ctx, s, x - 0.18, y + 0.1, sh.r * 0.9, sh.col); ball(ctx, s, x + 0.12, y - 0.14, sh.r * 0.9, sh.col); } }
        else circ(ctx, s, x, y, 0.1, '#d9dee3');
        ctx.restore();
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
