'use strict';
/* FRC Manager — the classic games (2016–2020): field drawings and game pieces. Uses the helpers of draw.js.
   Layouts follow the official field drawings, seen from the scoring table with blue on the left. Everything is
   authored in blue's coordinates; P() turns it for red (mirrored or rotated, as each field really is). */
(function () {
  const E = G.Engine, FW = E.FW, FH = E.FH, Rd = G.Render, K = Rd.K, FIELD = Rd.FIELD;
  const { rect, arect, circ, poly, line, text, apoly, aline, atext, ball, P, alc } = K;
  const METAL = '#aab4be', DARK = '#1d2227', CELL = '#ffd23f';
  const CX = FW / 2, CY = FH / 2;
  const tint = (a, k) => (a === 'red' ? 'rgba(229,72,77,' + k + ')' : 'rgba(62,140,255,' + k + ')');
  const TAPE = 'rgba(235,240,245,0.55)';

  // =====================================================================
  // 2020 INFINITE RECHARGE (rotated field)
  // =====================================================================
  Rd.PIECES.cell = { shape: 'ball', col: CELL, r: 0.11, many: 3 };
  Rd.SHOTS[2020] = { col: CELL, r: 0.09 };
  const WHEEL = ['#ffd23f', '#e5484d', '#30c27a', '#3e8cff'];
  FIELD[2020] = function (ctx, s, sym, m) {
    const g = G.Rules.G20;
    ['blue', 'red'].forEach(a => {
      // the alliance's Sector in front of its own station, closed by the Initiation Line the opponents start on
      arect(ctx, s, sym, a, 0.1, 0.06, 2.95, FH - 0.12, tint(a, 0.07), null, 0);
      aline(ctx, s, sym, a, 3.05, 0.06, 3.05, FH - 0.06, TAPE, 1.5);
      // Loading Zone on its own wall (the opponents' Target Zone is beside it, drawn with the other alliance)
      apoly(ctx, s, sym, a, [[0.1, g.bay.y - 0.75], [0.1, g.bay.y + 0.75], [0.85, g.bay.y]], tint(a, 0.3), alc(a), 2);
      atext(ctx, s, sym, a, 'LOADING', 1.5, g.bay.y + 0.08, alc(a), 7);
      // the Power Port it shoots at, with the Target Zone, on the far wall
      apoly(ctx, s, sym, a, [[FW - 0.1, g.port.y - 0.75], [FW - 0.1, g.port.y + 0.75], [FW - 0.85, g.port.y]], tint(a, 0.45), alc(a), 2);
      { const q = P(sym, a, FW - 0.2, g.port.y); circ(ctx, s, q.x, q.y, 0.3, '#2b3138', alc(a), 2.5); circ(ctx, s, q.x, q.y, 0.12, DARK, '#e8edf2', 1); }
      atext(ctx, s, sym, a, 'TARGET', FW - 1.5, g.port.y + 0.08, alc(a), 7);
      // Trench Run along the side rail, with the Control Panel
      arect(ctx, s, sym, a, g.trench.x0, g.trench.y0, g.trench.x1 - g.trench.x0, g.trench.y1 - g.trench.y0, tint(a, 0.2), alc(a), 1.5);
      atext(ctx, s, sym, a, 'TRENCH RUN', 9.0, FH - 1.2, alc(a), 7);
      { const c = P(sym, a, g.panel.x, g.panel.y), r0 = 0.42 * s;
        for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(c.x * s, c.y * s); ctx.arc(c.x * s, c.y * s, r0, i * Math.PI / 4, (i + 1) * Math.PI / 4); ctx.closePath(); ctx.fillStyle = WHEEL[i % 4]; ctx.fill(); }
        circ(ctx, s, c.x, c.y, 0.42, null, '#e8edf2', 1.5); circ(ctx, s, c.x, c.y, 0.09, DARK); }
    });
    // Shield Generator: a square turned on the field that fills the gap between the Trench Runs, four pillars at the
    // trench edges, the two halves of the Rendezvous Point and a Generator Switch in each
    const pil = g.gen.map(p => ({ x: CX + p[0], y: CY + p[1] }));
    const mid = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }), mA = mid(pil[0], pil[3]), mB = mid(pil[1], pil[2]);
    poly(ctx, s, [pil[0], pil[1], mB, mA], tint('red', 0.2), null, 0); poly(ctx, s, [mA, mB, pil[2], pil[3]], tint('blue', 0.2), null, 0);
    poly(ctx, s, pil, null, '#8d97a1', 3);
    line(ctx, s, mA.x, mA.y, mB.x, mB.y, '#8d97a1', 2);
    pil.forEach(p => rect(ctx, s, p.x - 0.17, p.y - 0.17, 0.34, 0.34, '#5d6670', METAL, 1.5));
    ['blue', 'red'].forEach(a => { const q = P(sym, a, g.sw.x, g.sw.y), L = 1.45, ux = g.sw.dx * L, uy = g.sw.dy * L;
      line(ctx, s, q.x - ux, q.y - uy, q.x + ux, q.y + uy, '#e8edf2', 6); line(ctx, s, q.x - ux, q.y - uy, q.x + ux, q.y + uy, alc(a), 3);
      const t = P(sym, a, g.sw.x + 0.45, g.sw.y + 1.05); text(ctx, s, 'RENDEZVOUS POINT', t.x, t.y, alc(a), 7); });
    text(ctx, s, 'SHIELD GENERATOR', CX, CY + 0.09, '#e8edf2', 8);
    // power cells: live positions during a match, the starting layout otherwise
    if (m && m.cells) m.cells.forEach(p => { if (p.t <= m.t) ball(ctx, s, p.x, p.y, 0.09, CELL); });
    else ['blue', 'red'].forEach(a => g.trenchCells.concat(g.midCells).forEach(p => { const q = P(sym, a, p[0], p[1]); ball(ctx, s, q.x, q.y, 0.09, CELL); }));
  };

  // =====================================================================
  // 2019 DESTINATION: DEEP SPACE (mirrored field)
  // =====================================================================
  const HATCH = '#f2c94c', CARGO = '#ff8a3d';
  Rd.PIECES.hatch = { shape: 'disc', col: HATCH, r: 0.2 };
  Rd.PIECES.cargo19 = { shape: 'ball', col: CARGO, r: 0.17 };
  // one bay: an outline, a ring when it has a hatch panel (grey for the blank panels), a ball when it holds cargo
  function bay19(ctx, s, x, y, b) {
    circ(ctx, s, x, y, 0.19, '#1d2227', '#59626c', 1);
    if (b && b.hatch) circ(ctx, s, x, y, 0.16, null, b.hatch === 2 ? '#8d97a1' : HATCH, Math.max(2, s * 0.05));
    if (b && b.cargo) ball(ctx, s, x, y, 0.1, CARGO);
  }
  FIELD[2019] = function (ctx, s, sym, m) {
    const H2 = FH / 2;
    line(ctx, s, CX, 0.06, CX, H2 - 0.72, TAPE, 1.5); line(ctx, s, CX, H2 + 0.72, CX, FH - 0.06, TAPE, 1.5); // the centre line
    ['blue', 'red'].forEach(a => {
      const bays = m && m.ss && m.ss[a] ? m.ss[a].bays : null, get = i => (bays ? bays[i] : (i >= 2 && i < 8 ? { hatch: 2 } : null));
      // HAB Zone: the Level 1 ramp, two Level 2 platforms and Level 3 in the middle
      arect(ctx, s, sym, a, 0.1, H2 - 1.95, 2.34, 3.9, tint(a, 0.22), alc(a), 2);
      arect(ctx, s, sym, a, 0.1, H2 - 1.75, 1.12, 1.15, 'rgba(255,255,255,0.10)', alc(a), 1.5);
      arect(ctx, s, sym, a, 0.1, H2 + 0.6, 1.12, 1.15, 'rgba(255,255,255,0.10)', alc(a), 1.5);
      arect(ctx, s, sym, a, 0.1, H2 - 0.6, 1.12, 1.2, 'rgba(255,255,255,0.24)', '#e8edf2', 2);
      atext(ctx, s, sym, a, '3', 0.66, H2 + 0.08, '#e8edf2', 10); atext(ctx, s, sym, a, '2', 0.66, H2 - 1.1, alc(a), 9); atext(ctx, s, sym, a, '2', 0.66, H2 + 1.25, alc(a), 9);
      atext(ctx, s, sym, a, 'HAB', 1.85, H2 + 0.08, alc(a), 9);
      aline(ctx, s, sym, a, 2.44, 0.06, 2.44, FH - 0.06, alc(a), 1.5);
      // Loading Stations in the corners and the cargo depots beside the HAB
      [[0.1, 0.1], [0.1, FH - 1.3]].forEach(p => arect(ctx, s, sym, a, p[0], p[1], 0.75, 1.2, tint(a, 0.2), alc(a), 2));
      atext(ctx, s, sym, a, 'LOAD', 0.48, 1.5, alc(a), 7); atext(ctx, s, sym, a, 'LOAD', 0.48, FH - 1.45, alc(a), 7);
      [[1.35, 1.85], [1.35, FH - 1.85]].forEach((p, i) => { const n = m && m.ss && m.ss[a] ? m.ss[a].depot[i] : 6; arect(ctx, s, sym, a, p[0] - 0.5, p[1] - 0.32, 1.0, 0.64, null, '#59626c', 1);
        for (let k = 0; k < n; k++) { const q = P(sym, a, p[0] + (k % 3 - 1) * 0.24, p[1] + (k < 3 ? -0.12 : 0.12)); ball(ctx, s, q.x, q.y, 0.1, CARGO); } });
      // Cargo Ship: the two ships stand nose out, back to back on the centre line; two front bays and three on each side
      apoly(ctx, s, sym, a, [[5.65, H2 - 0.38], [6.0, H2 - 0.72], [CX, H2 - 0.72], [CX, H2 + 0.72], [6.0, H2 + 0.72], [5.65, H2 + 0.38]], tint(a, 0.28), alc(a), 2);
      [[5.92, H2 - 0.21], [5.92, H2 + 0.21]].forEach((p, i) => { const q = P(sym, a, p[0], p[1]); bay19(ctx, s, q.x, q.y, get(i)); });
      [H2 - 0.5, H2 + 0.5].forEach((y, j) => [6.45, 7.0, 7.55].forEach((x, i) => { const q = P(sym, a, x, y); bay19(ctx, s, q.x, q.y, get(2 + j * 3 + i)); }));
      // Rockets on the side rails: three levels (the row nearest the field is level 1), two bays each
      [0, 1].forEach(rk => {
        const y0 = rk ? FH - 0.08 : 0.08, d = rk ? -1 : 1;
        apoly(ctx, s, sym, a, [[5.2, y0], [6.6, y0], [6.3, y0 + d * 0.62], [5.5, y0 + d * 0.62]], tint(a, 0.3), alc(a), 2);
        [1, 2, 3].forEach(lvl => [5.68, 6.12].forEach((x, i) => { const q = P(sym, a, x, y0 + d * (0.62 - 0.19 * lvl + 0.04)); const b = bays ? bays[8 + rk * 6 + (lvl - 1) * 2 + i] : null;
          circ(ctx, s, q.x, q.y, 0.085, b && b.cargo ? CARGO : '#1d2227', b && b.hatch ? HATCH : '#59626c', b && b.hatch ? 2 : 1); }));
        atext(ctx, s, sym, a, 'ROCKET', 5.9, y0 + d * 0.95, alc(a), 7);
      });
    });
    text(ctx, s, 'CARGO SHIPS', CX, H2 + 1.08, '#cfd6dd', 7);
  };

  // =====================================================================
  // 2018 FIRST POWER UP (mirrored field)
  // =====================================================================
  const CUBE = '#f4d03f', NULLT = 'rgba(214,200,80,';
  Rd.PIECES.pcube = { shape: 'box', col: CUBE, r: 0.17 };
  function cubes18(ctx, s, x, y, n, dir) { for (let i = 0; i < Math.min(n, 9); i++) rect(ctx, s, x - 0.11 + (i % 3 - 1) * 0.25, y - 0.11 + Math.floor(i / 3) * 0.25 * dir, 0.22, 0.22, CUBE, 'rgba(0,0,0,0.4)', 1); if (n > 9) text(ctx, s, '+' + (n - 9), x, y + 0.9 * dir, CUBE, 8); }
  FIELD[2018] = function (ctx, s, sym, m) {
    const H2 = FH / 2, side = m && m.side ? m.side : { blue: { sw: 0, sc: 0 }, red: { sw: 0, sc: 1 } }, pY = [2.75, FH - 2.75], scY = [1.85, FH - 1.85];
    // Null Territory at each end of the Scale, then the two halves of the Platform Zone
    [0, 1].forEach(k => rect(ctx, s, CX - 0.95, k ? FH - 2.45 : 0.06, 1.9, 2.39, NULLT + '0.10)', NULLT + '0.75)', 2));
    text(ctx, s, 'NULL TERRITORY', CX, 0.42, NULLT + '0.9)', 6); text(ctx, s, 'NULL TERRITORY', CX, FH - 0.28, NULLT + '0.9)', 6);
    ['blue', 'red'].forEach(a => {
      const o = a === 'blue' ? 'red' : 'blue', ss = m && m.ss ? m.ss[a] : null;
      arect(ctx, s, sym, a, 5.0, H2 - 1.65, CX - 5.0, 3.3, tint(a, 0.3), NULLT + '0.75)', 2);
      atext(ctx, s, sym, a, 'PLATFORM', 6.35, H2 + 1.45, alc(a), 7);
      aline(ctx, s, sym, a, 3.05, 0.06, 3.05, FH - 0.06, TAPE, 1.5);
      // the alliance's Switch: fence, arm and two plates (one per alliance, drawn at random each match)
      arect(ctx, s, sym, a, 3.6, H2 - 1.95, 1.34, 3.9, 'rgba(0,0,0,0.3)', '#8d97a1', 2);
      aline(ctx, s, sym, a, 4.27, H2 - 1.2, 4.27, H2 + 1.2, '#cfd6dd', 4);
      [0, 1].forEach(k => { const mine = side[a].sw === k, col = mine ? a : o; arect(ctx, s, sym, a, 3.7, pY[k] - 0.5, 1.14, 1.0, tint(col, 0.35), alc(col), 2);
        const q = P(sym, a, 4.27, pY[k]); cubes18(ctx, s, q.x, q.y - 0.12, m && m.sw ? m.sw[a][k] : 0, 1); });
      // Power Cube Zone (the pile of ten) against the Switch, the line of six on the Platform side, the Exchange, the far Portals
      arect(ctx, s, sym, a, 2.5, H2 - 0.6, 1.08, 1.2, tint(a, 0.2), NULLT + '0.75)', 1.5);
      { const n = ss ? ss.pile : 10, rows = [[3.38, 4], [3.1, 3], [2.82, 2], [2.64, 1]]; let k = 0; rows.forEach(rw => { for (let i = 0; i < rw[1]; i++, k++) { if (k >= n) return; const q = P(sym, a, rw[0], H2 + (i - (rw[1] - 1) / 2) * 0.28); rect(ctx, s, q.x - 0.12, q.y - 0.12, 0.24, 0.24, CUBE, 'rgba(0,0,0,0.4)', 1); } }); }
      { const n = ss ? ss.line : 6; for (let i = 6 - n; i < 6; i++) { const q = P(sym, a, 5.15, H2 + (i - 2.5) * 0.66); rect(ctx, s, q.x - 0.13, q.y - 0.13, 0.26, 0.26, CUBE, 'rgba(0,0,0,0.4)', 1); } }
      arect(ctx, s, sym, a, 0.1, H2 - 1.5, 0.9, 1.2, tint(a, 0.2), alc(a), 2); atext(ctx, s, sym, a, 'EXCHANGE', 0.68, H2 - 1.68, alc(a), 6);
      if (ss) atext(ctx, s, sym, a, 'VAULT ' + ss.vault, 0.75, H2 + 0.05, CUBE, 8);
      [[FW - 0.95, 0.1], [FW - 0.95, FH - 1.2]].forEach(p => arect(ctx, s, sym, a, p[0], p[1], 0.85, 1.1, tint(a, 0.2), alc(a), 2));
      atext(ctx, s, sym, a, 'PORTAL', FW - 0.55, 1.45, alc(a), 6); atext(ctx, s, sym, a, 'PORTAL', FW - 0.55, FH - 1.35, alc(a), 6);
    });
    // the Scale: tower with a rung on each side, arm and the two plates
    line(ctx, s, CX, scY[0], CX, scY[1], '#cfd6dd', 5);
    rect(ctx, s, CX - 0.3, H2 - 0.45, 0.6, 0.9, '#4a525b', '#aab4be', 1.5);
    line(ctx, s, CX - 0.75, H2 - 0.45, CX - 0.75, H2 + 0.45, '#e8edf2', 3); line(ctx, s, CX + 0.75, H2 - 0.45, CX + 0.75, H2 + 0.45, '#e8edf2', 3);
    [0, 1].forEach(k => { const col = side.blue.sc === k ? 'blue' : 'red'; rect(ctx, s, CX - 0.55, scY[k] - 0.75, 1.1, 1.5, tint(col, 0.35), alc(col), 2.5); cubes18(ctx, s, CX, scY[k] - 0.15, m && m.scale ? m.scale[k] : 0, 1); });
    text(ctx, s, 'SCALE', CX, H2 + 0.85, '#cfd6dd', 8);
  };

  // =====================================================================
  // 2017 FIRST STEAMWORKS (mirrored field)
  // =====================================================================
  const GEAR = '#f2c94c', FUEL = '#c8e83c';
  Rd.PIECES.gear = { shape: 'gear', col: GEAR, r: 0.2 };
  Rd.SHOTS[2017] = { col: FUEL, r: 0.06, many: true };
  FIELD[2017] = function (ctx, s, sym, m) {
    const H2 = FH / 2, g = G.Rules.G17, sx = g.ship.x, R = g.ship.r, LP = 5.2;
    // Neutral Zone between the two Launchpad Lines
    rect(ctx, s, LP, 0.06, FW - 2 * LP, FH - 0.12, 'rgba(90,170,70,0.10)', null, 0);
    text(ctx, s, 'NEUTRAL ZONE', CX, H2 + 0.08, 'rgba(160,210,140,0.6)', 8);
    ['blue', 'red'].forEach(a => {
      const ss = m && m.ss ? m.ss[a] : null;
      // Launchpad (the alliance's own end) with the Base Line; the Launchpad Line closes it
      arect(ctx, s, sym, a, 0.1, 0.06, LP - 0.1, FH - 0.12, tint(a, 0.08), null, 0);
      aline(ctx, s, sym, a, g.base, 0.06, g.base, FH - 0.06, TAPE, 1.5);
      aline(ctx, s, sym, a, LP, 0.06, LP, FH - 0.06, alc(a), 1.5);
      // Airship: a hexagon with a flat side to the alliance wall; three pegs on the near sides, three ropes on the far sides, four rotors on deck
      { const pts = []; for (let i = 0; i < 6; i++) { const t = (i * 60 + 30) * Math.PI / 180; pts.push([sx + Math.cos(t) * R, H2 + Math.sin(t) * R]); }
        apoly(ctx, s, sym, a, pts, 'rgba(0,0,0,0.38)', alc(a), 2.5); }
      g.pegs.forEach((p, k) => aline(ctx, s, sym, a, p[0], p[1], p[0] - (k ? 0.2 : 0.38), p[1] + (k === 1 ? -0.32 : k === 2 ? 0.32 : 0), '#e8edf2', 3));
      g.ropes.forEach(p => { const q = P(sym, a, p[0], p[1]); circ(ctx, s, q.x, q.y, 0.1, '#c9a66b', '#7a6238', 1.5); });
      for (let i = 0; i < 4; i++) { const q = P(sym, a, sx - 0.34 + (i % 2) * 0.68, H2 - 0.34 + Math.floor(i / 2) * 0.68), on = ss && ss.rotors > i; circ(ctx, s, q.x, q.y, 0.25, on ? 'rgba(242,201,76,0.35)' : '#1d2227', on ? GEAR : '#59626c', on ? 2.5 : 1); if (on) { line(ctx, s, q.x - 0.21, q.y, q.x + 0.21, q.y, GEAR, 2); line(ctx, s, q.x, q.y - 0.21, q.x, q.y + 0.21, GEAR, 2); } }
      atext(ctx, s, sym, a, ss ? 'GEARS ' + ss.gears : 'AIRSHIP', sx, H2 + R + 0.42, alc(a), 7);
      // Boiler and its Key in the corner of the alliance's own wall
      apoly(ctx, s, sym, a, [[0.08, FH - 2.7], [2.7, FH - 0.08], [0.08, FH - 0.08]], tint(a, 0.25), alc(a), 1.5);
      apoly(ctx, s, sym, a, [[0.08, FH - 1.0], [1.0, FH - 0.08], [0.08, FH - 0.08]], '#3d454e', '#e8edf2', 2);
      atext(ctx, s, sym, a, 'KEY', 1.3, FH - 1.25, alc(a), 7);
      atext(ctx, s, sym, a, ss ? Math.floor(ss.kpa + 1e-9) + ' kPa' : 'BOILER', 0.72, FH - 0.24, '#e8edf2', 6);
      // fuel Hoppers on the side rails, and the Retrieval Zone (gears) in the far corner
      g.hoppers.forEach((p, i) => { const n = ss ? ss.hop[i] : 100, y = p[1] > H2 ? FH - 0.3 : 0.3; arect(ctx, s, sym, a, p[0] - 0.55, y - 0.22, 1.1, 0.44, n > 0 ? 'rgba(200,232,60,0.25)' : 'rgba(0,0,0,0.3)', alc(a), 1.5);
        for (let k = 0; k < Math.ceil(n / 25); k++) { const q = P(sym, a, p[0] - 0.36 + k * 0.24, y); ball(ctx, s, q.x, q.y, 0.08, FUEL); } });
      apoly(ctx, s, sym, a, [[FW - 0.08, 0.08], [FW - 2.3, 0.08], [FW - 0.08, 2.3]], tint(a, 0.25), alc(a), 1.5);
      atext(ctx, s, sym, a, 'RETRIEVAL', FW - 0.85, 0.8, alc(a), 6);
    });
    // the fifth hopper stands on the rail at mid-field
    rect(ctx, s, CX - 0.55, FH - 0.52, 1.1, 0.44, 'rgba(200,232,60,0.18)', '#8d97a1', 1.5);
    for (let k = 0; k < 4; k++) ball(ctx, s, CX - 0.36 + k * 0.24, FH - 0.3, 0.08, FUEL);
  };

  // =====================================================================
  // 2016 FIRST STRONGHOLD (rotated field)
  // =====================================================================
  const BOULDER = '#b9c0c8';
  Rd.PIECES.boulder = { shape: 'ball', col: BOULDER, r: 0.19 };
  Rd.SHOTS[2016] = { col: BOULDER, r: 0.13 };
  const DEFCOL = { L: '#8d97a1', A: '#c98a3c', B: '#4f9fd1', C: '#9b6bff', D: '#7a8f5a' };
  FIELD[2016] = function (ctx, s, sym, m) {
    const H2 = FH / 2, g = G.Rules.G16, LINE = g.line, PASS = g.pass, LH = (FH - PASS) / 5, D16 = G.Rules.DEF16;
    line(ctx, s, CX, 0.06, CX, FH - 0.06, TAPE, 1.5);
    text(ctx, s, 'NEUTRAL ZONE', CX + 1.2, 0.5, 'rgba(207,214,221,0.5)', 7);
    ['blue', 'red'].forEach(a => {
      const o = a === 'blue' ? 'red' : 'blue', ss = m && m.ss ? m.ss[a] : null;
      // (in the attackers' coordinates) the enemy courtyard and tower on the far wall
      arect(ctx, s, sym, a, LINE + 0.68, 0.06, FW - LINE - 0.74, FH - PASS - 0.06, tint(o, 0.08), null, 0);
      atext(ctx, s, sym, a, 'COURTYARD', LINE + 2.8, 1.0, tint(o, 0.8), 8);
      apoly(ctx, s, sym, a, [[FW - 0.08, H2 - 1.5], [FW - 0.95, H2 - 1.0], [FW - 1.3, H2], [FW - 0.95, H2 + 1.0], [FW - 0.08, H2 + 1.5]], 'rgba(170,180,190,0.22)', alc(o), 2);
      apoly(ctx, s, sym, a, [[FW - 0.08, H2 - 0.62], [FW - 0.55, H2 - 0.4], [FW - 0.55, H2 + 0.4], [FW - 0.08, H2 + 0.62]], '#3d454e', '#e8edf2', 2);
      atext(ctx, s, sym, a, ss ? String(Math.max(0, ss.strength - ss.boulders)) : '8', FW - 0.32, H2 + 0.1, ss && ss.boulders >= ss.strength ? '#30c27a' : '#e8edf2', 10);
      atext(ctx, s, sym, a, 'TOWER', FW - 0.75, H2 + 1.85, alc(o), 7);
      // the Outer Works the attackers cross: five defenses (the low bar beside the defenders' Secret Passage), a pip per crossing
      const defs = ss ? ss.def : [{ type: 'portcullis' }, { type: 'moat' }, { type: 'sallyport' }, { type: 'rockwall' }, { type: 'lowbar' }];
      arect(ctx, s, sym, a, LINE - 0.68, 0.06, 1.36, FH - PASS - 0.06, 'rgba(214,200,80,0.10)', null, 0);
      defs.forEach((d, i) => {
        const T = D16[d.type], done = (d.dmg || 0) >= 2;
        arect(ctx, s, sym, a, LINE - 0.6, i * LH + 0.1, 1.2, LH - 0.14, done ? 'rgba(48,194,122,0.16)' : 'rgba(0,0,0,0.38)', DEFCOL[T.cat], 2);
        atext(ctx, s, sym, a, T.ab, LINE, (i + 0.5) * LH - 0.08, DEFCOL[T.cat], 10);
        [0, 1].forEach(k => { const q = P(sym, a, LINE - 0.22 + k * 0.44, (i + 0.5) * LH + 0.36); circ(ctx, s, q.x, q.y, 0.09, (d.dmg || 0) > k ? '#30c27a' : '#1d2227', '#8d97a1', 1); });
      });
      // the alliance's own Secret Passage: along the rail on its own half, from its wall to its own Outer Works
      arect(ctx, s, sym, a, 0.08, 0.08, g.ownEnd - 0.08, PASS - 0.12, tint(a, 0.4), alc(a), 2);
      atext(ctx, s, sym, a, 'SECRET PASSAGE', 2.6, PASS / 2 + 0.1, '#e8edf2', 8);
      [5.1, 5.75, 6.4].forEach(x => { const q = P(sym, a, x, PASS / 2 - 0.02); ball(ctx, s, q.x, q.y, 0.12, BOULDER); });
      // boulders on the midline: three within each alliance's reach
      { const n = ss ? ss.mid : 3; for (let k = 3 - n; k < 3; k++) { const q = P(sym, a, CX, 0.9 + k * 1.28); ball(ctx, s, q.x, q.y, 0.13, BOULDER); } }
    });
  };
})();
