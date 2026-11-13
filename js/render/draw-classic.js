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
    const g = G.Rules.G20, A = g.genA, B = g.genB;
    const gp = (a, b) => ({ x: CX + a * g.d[0] + b * g.n[0], y: CY + a * g.d[1] + b * g.n[1] }); // a point on the generator floor
    ['blue', 'red'].forEach(a => {
      const ss = m && m.ss ? m.ss[a] : null;
      // the alliance's Sector in front of its own station, closed by the Initiation Line the opponents start on
      arect(ctx, s, sym, a, 0.1, 0.06, 2.95, FH - 0.12, tint(a, 0.07), null, 0);
      aline(ctx, s, sym, a, 3.05, 0.06, 3.05, FH - 0.06, TAPE, 1.5);
      // Loading Zone on its own wall (5 ft wide; the opponents' Target Zone is beside it, drawn with the other alliance);
      // the number is what the Loading Bay holds: five to start with, then every cell the opponents score
      apoly(ctx, s, sym, a, [[0.1, g.bay.y - 0.76], [0.1, g.bay.y + 0.76], [0.86, g.bay.y]], tint(a, 0.3), alc(a), 2);
      atext(ctx, s, sym, a, 'LOADING', 1.5, g.bay.y + 0.08, alc(a), 7);
      atext(ctx, s, sym, a, ss ? String(ss.bay) : '5', 0.4, g.bay.y + 0.1, CELL, 9);
      // the Power Port it shoots at, with the Target Zone (4 ft wide), on the far wall
      apoly(ctx, s, sym, a, [[FW - 0.1, g.port.y - 0.61], [FW - 0.1, g.port.y + 0.61], [FW - 0.86, g.port.y]], tint(a, 0.45), alc(a), 2);
      { const q = P(sym, a, FW - 0.2, g.port.y); circ(ctx, s, q.x, q.y, 0.3, '#2b3138', alc(a), 2.5); circ(ctx, s, q.x, q.y, 0.12, DARK, '#e8edf2', 1); }
      atext(ctx, s, sym, a, 'TARGET', FW - 1.5, g.port.y + 0.08, alc(a), 7);
      // Trench Run along the side rail; the Trench (a 28 in. tunnel from the generator's leg to the rail) carries the Control Panel
      arect(ctx, s, sym, a, g.trench.x0, g.trench.y0, g.trench.x1 - g.trench.x0, g.trench.y1 - g.trench.y0, tint(a, 0.2), alc(a), 1.5);
      atext(ctx, s, sym, a, 'TRENCH RUN', CX + 1.3, FH - 1.2, alc(a), 7);
      arect(ctx, s, sym, a, g.panel.x - 0.52, g.trench.y0, 1.04, g.trench.y1 - g.trench.y0, 'rgba(170,180,190,0.28)', '#8d97a1', 1.5);
      { const c = P(sym, a, g.panel.x, g.panel.y), r0 = 0.41 * s;
        for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(c.x * s, c.y * s); ctx.arc(c.x * s, c.y * s, r0, i * Math.PI / 4, (i + 1) * Math.PI / 4); ctx.closePath(); ctx.fillStyle = WHEEL[i % 4]; ctx.fill(); }
        circ(ctx, s, c.x, c.y, 0.41, null, '#e8edf2', 1.5); circ(ctx, s, c.x, c.y, 0.09, DARK); }
    });
    // Shield Generator: turned 22.5 degrees between the Trench Runs. Its floor is ringed and crossed by the BOUNDARIES
    // (steel bars an inch high: red's half toward red's trench, blue's toward blue's, a black pair between them);
    // four truss legs at the corners, and a Generator Switch over each half.
    poly(ctx, s, [gp(-A, -B), gp(A, -B), gp(A, 0), gp(-A, 0)], tint('red', 0.2), null, 0); poly(ctx, s, [gp(-A, 0), gp(A, 0), gp(A, B), gp(-A, B)], tint('blue', 0.2), null, 0);
    { const bar = (p, q, col, w) => line(ctx, s, p.x, p.y, q.x, q.y, col, w);
      bar(gp(-A, -B), gp(A, -B), alc('red'), 3); bar(gp(-A, -B), gp(-A, 0), alc('red'), 3); bar(gp(A, -B), gp(A, 0), alc('red'), 3);
      bar(gp(-A, B), gp(A, B), alc('blue'), 3); bar(gp(-A, B), gp(-A, 0), alc('blue'), 3); bar(gp(A, B), gp(A, 0), alc('blue'), 3);
      bar(gp(-A, 0), gp(A, 0), '#0b0d10', 5); bar(gp(0, -B), gp(0, B), '#0b0d10', 3); }
    g.gen.forEach(p => rect(ctx, s, CX + p[0] - 0.19, CY + p[1] - 0.19, 0.38, 0.38, '#5d6670', METAL, 1.5));
    ['blue', 'red'].forEach(a => { const q = P(sym, a, g.sw.x, g.sw.y), L = 1.45, ux = g.sw.dx * L, uy = g.sw.dy * L;
      line(ctx, s, q.x - ux, q.y - uy, q.x + ux, q.y + uy, '#e8edf2', 6); line(ctx, s, q.x - ux, q.y - uy, q.x + ux, q.y + uy, alc(a), 3);
      const t = P(sym, a, g.sw.x + 0.4, g.sw.y + 0.5); text(ctx, s, 'RENDEZVOUS', t.x, t.y, alc(a), 6); });
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
    else if (b && b.pre) ball(ctx, s, x, y, 0.1, 'rgba(255,138,61,0.5)'); // staged cargo: it stays only if a hatch goes on in the sandstorm
  }
  FIELD[2019] = function (ctx, s, sym, m) {
    const H2 = FH / 2, g = G.Rules.G19, rx = g.rocketX;
    line(ctx, s, CX, 0.06, CX, FH - 0.06, TAPE, 1.5); // the centre line (the ships stand 9 in. either side of it)
    ['blue', 'red'].forEach(a => {
      const bays = m && m.ss && m.ss[a] ? m.ss[a].bays : null, get = i => (bays ? bays[i] : (i >= 2 && i < 8 ? { hatch: 2 } : i < 2 ? { pre: true } : null));
      // HAB Zone: everything behind the HAB Line, from rail to rail. The platform: the Level 1 ramp, two Level 2 decks and
      // Level 3 in the middle
      arect(ctx, s, sym, a, 0.1, 0.06, 2.34, FH - 0.12, tint(a, 0.07), null, 0);
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
      g.depotY.forEach((y, i) => { const n = m && m.ss && m.ss[a] ? m.ss[a].depot[i] : 6; arect(ctx, s, sym, a, 0.1, y - 0.28, 1.02, 0.56, null, '#8d97a1', 1);
        for (let k = 0; k < n; k++) { const q = P(sym, a, 0.3 + (k % 3) * 0.3, y + (k < 3 ? -0.13 : 0.13)); ball(ctx, s, q.x, q.y, 0.1, CARGO); } });
      // Cargo Ship: the two ships stand nose out, stern to stern, 9 in. off the centre line; two bays in the nose (staged
      // with cargo) and three on each side (staged with blank panels)
      apoly(ctx, s, sym, a, [[g.nose, H2 - 0.38], [g.nose + 0.35, H2 - 0.71], [g.stern, H2 - 0.71], [g.stern, H2 + 0.71], [g.nose + 0.35, H2 + 0.71], [g.nose, H2 + 0.38]], tint(a, 0.28), alc(a), 2);
      [[g.nose + 0.27, H2 - 0.21], [g.nose + 0.27, H2 + 0.21]].forEach((p, i) => { const q = P(sym, a, p[0], p[1]); bay19(ctx, s, q.x, q.y, get(i)); });
      [H2 - 0.5, H2 + 0.5].forEach((y, j) => g.shipX.forEach((x, i) => { const q = P(sym, a, x, y); bay19(ctx, s, q.x, q.y, get(2 + j * 3 + i)); }));
      // Rockets on the side rails: three levels (the row nearest the field is level 1), two bays each
      [0, 1].forEach(rk => {
        const y0 = rk ? FH - 0.08 : 0.08, d = rk ? -1 : 1;
        apoly(ctx, s, sym, a, [[rx - 0.72, y0], [rx + 0.72, y0], [rx + 0.4, y0 + d * 0.7], [rx - 0.4, y0 + d * 0.7]], tint(a, 0.3), alc(a), 2);
        [1, 2, 3].forEach(lvl => [rx - 0.22, rx + 0.22].forEach((x, i) => { const q = P(sym, a, x, y0 + d * (0.7 - 0.2 * lvl + 0.03)); const b = bays ? bays[8 + rk * 6 + (lvl - 1) * 2 + i] : null;
          circ(ctx, s, q.x, q.y, 0.085, b && b.cargo ? CARGO : '#1d2227', b && b.hatch ? HATCH : '#59626c', b && b.hatch ? 2 : 1); }));
        atext(ctx, s, sym, a, 'ROCKET', rx, y0 + d * 1.02, alc(a), 7);
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
  // A balance tips toward the plate with more cubes: that plate is drawn sunk (shaded), the raised one lit, and chevrons
  // in the lower plate's colour run along the arm towards it. Level when the counts are equal.
  function tilt18(ctx, s, p0, p1, n0, n1, c0, c1, w, h) {
    if (n0 === n1) return;
    const dn = n0 > n1 ? p0 : p1, up = n0 > n1 ? p1 : p0, col = n0 > n1 ? c0 : c1;
    rect(ctx, s, dn.x - w / 2, dn.y - h / 2, w, h, 'rgba(0,0,0,0.30)', null, 0);
    rect(ctx, s, up.x - w / 2, up.y - h / 2, w, h, 'rgba(255,255,255,0.10)', 'rgba(255,255,255,0.75)', 1.5);
    const mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2, L = Math.hypot(dn.x - mx, dn.y - my) || 1, dx = (dn.x - mx) / L, dy = (dn.y - my) / L;
    [0.22, 0.48].forEach(f => {
      const cx = mx + (dn.x - mx) * f, cy = my + (dn.y - my) * f;
      poly(ctx, s, [{ x: cx + dx * 0.16, y: cy + dy * 0.16 }, { x: cx - dx * 0.06 - dy * 0.2, y: cy - dy * 0.06 + dx * 0.2 }, { x: cx - dx * 0.06 + dy * 0.2, y: cy - dy * 0.06 - dx * 0.2 }], alc(col), 'rgba(0,0,0,0.5)', 1);
    });
  }
  FIELD[2018] = function (ctx, s, sym, m) {
    const g = G.Rules.G18, H2 = FH / 2, side = m && m.side ? m.side : { blue: { sw: 0, sc: 0 }, red: { sw: 1, sc: 1 } }, pY = g.pY, scY = g.scY;
    // Null Territory at each end of the Scale (6 ft along the field, 7 ft 11 in out from the guardrail), then the two
    // halves of the Platform Zone
    [0, 1].forEach(k => rect(ctx, s, CX - g.nullX, k ? FH - g.nullY : 0.06, 2 * g.nullX, g.nullY - 0.06, NULLT + '0.10)', NULLT + '0.75)', 2));
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
      if (m && m.sw) tilt18(ctx, s, P(sym, a, 4.27, pY[0]), P(sym, a, 4.27, pY[1]), m.sw[a][0], m.sw[a][1], side[a].sw === 0 ? a : o, side[a].sw === 1 ? a : o, 1.14, 1.0);
      // Power Cube Zone (the pile of ten) against the Switch, the line of six on the Platform side, the Exchange, the far Portals
      arect(ctx, s, sym, a, 2.5, H2 - 0.6, 1.08, 1.2, tint(a, 0.2), NULLT + '0.75)', 1.5);
      { const n = ss ? ss.pile : 10, rows = [[3.38, 4], [3.1, 3], [2.82, 2], [2.64, 1]]; let k = 0; rows.forEach(rw => { for (let i = 0; i < rw[1]; i++, k++) { if (k >= n) return; const q = P(sym, a, rw[0], H2 + (i - (rw[1] - 1) / 2) * 0.28); rect(ctx, s, q.x - 0.12, q.y - 0.12, 0.24, 0.24, CUBE, 'rgba(0,0,0,0.4)', 1); } }); }
      { const n = ss ? ss.line : 6; for (let i = 6 - n; i < 6; i++) { const q = P(sym, a, 5.15, H2 + (i - 2.5) * 0.66); rect(ctx, s, q.x - 0.13, q.y - 0.13, 0.26, 0.26, CUBE, 'rgba(0,0,0,0.4)', 1); } }
      // the Exchange Zone (4 ft by 3 ft) is left of centre as the alliance looks down the field
      { const ey = g.exch.y(a), up = ey < H2;
        arect(ctx, s, sym, a, 0.1, ey - 0.61, 0.9, 1.22, tint(a, 0.2), alc(a), 2); atext(ctx, s, sym, a, 'EXCHANGE', 0.68, up ? ey - 0.78 : ey + 0.92, alc(a), 6);
        if (ss) atext(ctx, s, sym, a, 'VAULT ' + ss.vault, 0.75, up ? ey + 0.95 : ey - 0.78, CUBE, 8); }
      // the Portals in the far corners, with the cubes they still hold
      [[FW - 0.95, 0.1], [FW - 0.95, FH - 1.2]].forEach((p, i) => { arect(ctx, s, sym, a, p[0], p[1], 0.85, 1.1, tint(a, 0.2), alc(a), 2);
        const n = ss ? ss.portal[i] : 7; for (let k = 0; k < n; k++) { const q = P(sym, a, p[0] + 0.2 + (k % 3) * 0.22, p[1] + 0.2 + Math.floor(k / 3) * 0.22); rect(ctx, s, q.x - 0.08, q.y - 0.08, 0.16, 0.16, CUBE, 'rgba(0,0,0,0.4)', 1); } });
      atext(ctx, s, sym, a, 'PORTAL', FW - 0.55, 1.45, alc(a), 6); atext(ctx, s, sym, a, 'PORTAL', FW - 0.55, FH - 1.35, alc(a), 6);
    });
    // the Scale: tower with a rung on each side, arm and the two plates
    line(ctx, s, CX, scY[0], CX, scY[1], '#cfd6dd', 5);
    rect(ctx, s, CX - 0.3, H2 - 0.45, 0.6, 0.9, '#4a525b', '#aab4be', 1.5);
    line(ctx, s, CX - 0.75, H2 - 0.45, CX - 0.75, H2 + 0.45, '#e8edf2', 3); line(ctx, s, CX + 0.75, H2 - 0.45, CX + 0.75, H2 + 0.45, '#e8edf2', 3);
    [0, 1].forEach(k => { const col = side.blue.sc === k ? 'blue' : 'red'; rect(ctx, s, CX - 0.61, scY[k] - 0.46, 1.22, 0.92, tint(col, 0.35), alc(col), 2.5); cubes18(ctx, s, CX, scY[k] - 0.2, m && m.scale ? m.scale[k] : 0, 1); });
    if (m && m.scale) tilt18(ctx, s, { x: CX, y: scY[0] }, { x: CX, y: scY[1] }, m.scale[0], m.scale[1], side.blue.sc === 0 ? 'blue' : 'red', side.blue.sc === 1 ? 'blue' : 'red', 1.22, 0.92);
    text(ctx, s, 'SCALE', CX, H2 + 0.85, '#cfd6dd', 8);
  };

  // =====================================================================
  // 2017 FIRST STEAMWORKS (mirrored field)
  // =====================================================================
  const GEAR = '#f2c94c', FUEL = '#c8e83c';
  Rd.PIECES.gear = { shape: 'gear', col: GEAR, r: 0.2 };
  Rd.SHOTS[2017] = { col: FUEL, r: 0.06, many: true };
  FIELD[2017] = function (ctx, s, sym, m) {
    const H2 = FH / 2, g = G.Rules.G17, sx = g.ship.x, R = g.ship.r, LP = g.lp, KL = g.keyLeg;
    // Neutral Zone between the two Launchpad Lines
    rect(ctx, s, LP, 0.06, FW - 2 * LP, FH - 0.12, 'rgba(90,170,70,0.10)', null, 0);
    text(ctx, s, 'NEUTRAL ZONE', CX, H2 + 0.08, 'rgba(160,210,140,0.6)', 8);
    ['blue', 'red'].forEach(a => {
      const ss = m && m.ss ? m.ss[a] : null;
      // Launchpad (the alliance's own end) with the Base Line; the Launchpad Line runs along the airship's far face
      arect(ctx, s, sym, a, 0.1, 0.06, LP - 0.1, FH - 0.12, tint(a, 0.08), null, 0);
      aline(ctx, s, sym, a, g.base, 0.06, g.base, FH - 0.06, TAPE, 1.5);
      aline(ctx, s, sym, a, LP, 0.06, LP, FH - 0.06, alc(a), 1.5);
      // Airship: a hexagon with a flat face to the alliance wall (the rail overhangs the deck). Gear pegs on the three
      // faces toward the wall; ropes on the wall face and on the two faces toward the neutral zone; four rotors on deck.
      { const hex = rad => { const pts = []; for (let i = 0; i < 6; i++) { const t = (i * 60 + 30) * Math.PI / 180; pts.push([sx + Math.cos(t) * rad, H2 + Math.sin(t) * rad]); } return pts; };
        apoly(ctx, s, sym, a, hex(1.48), null, 'rgba(170,180,190,0.35)', 1);
        apoly(ctx, s, sym, a, hex(R), 'rgba(0,0,0,0.38)', alc(a), 2.5); }
      g.pegs.forEach((p, k) => aline(ctx, s, sym, a, p[0], p[1], p[0] - (k ? 0.2 : 0.38), p[1] + (k === 1 ? -0.32 : k === 2 ? 0.32 : 0), '#e8edf2', 3));
      g.ropes.forEach(p => { const dx = p[0] - sx, dy = p[1] - H2, dl = Math.hypot(dx, dy) || 1; aline(ctx, s, sym, a, sx + dx / dl * 1.25, H2 + dy / dl * 1.25, p[0], p[1], '#7a6238', 2);
        const q = P(sym, a, p[0], p[1]); circ(ctx, s, q.x, q.y, 0.1, '#c9a66b', '#7a6238', 1.5); });
      for (let i = 0; i < 4; i++) { const q = P(sym, a, sx - 0.3 + (i % 2) * 0.6, H2 - 0.3 + Math.floor(i / 2) * 0.6), on = ss && ss.rotors > i; circ(ctx, s, q.x, q.y, 0.22, on ? 'rgba(242,201,76,0.35)' : '#1d2227', on ? GEAR : '#59626c', on ? 2.5 : 1); if (on) { line(ctx, s, q.x - 0.18, q.y, q.x + 0.18, q.y, GEAR, 2); line(ctx, s, q.x, q.y - 0.18, q.x, q.y + 0.18, GEAR, 2); } }
      atext(ctx, s, sym, a, ss ? 'GEARS ' + ss.gears : 'AIRSHIP', sx, H2 + 1.48 + 0.34, alc(a), 7);
      // Boiler and its Key in the corner of the alliance's own wall
      apoly(ctx, s, sym, a, [[0.08, FH - KL], [KL, FH - 0.08], [0.08, FH - 0.08]], tint(a, 0.25), alc(a), 1.5);
      apoly(ctx, s, sym, a, [[0.08, FH - 1.0], [1.0, FH - 0.08], [0.08, FH - 0.08]], '#3d454e', '#e8edf2', 2);
      atext(ctx, s, sym, a, 'KEY', 1.35, FH - 1.3, alc(a), 7);
      atext(ctx, s, sym, a, ss ? Math.floor(ss.kpa + 1e-9) + ' kPa' : 'BOILER', 0.72, FH - 0.24, '#e8edf2', 6);
      // fuel Hoppers on the side rails
      g.hoppers.forEach((p, i) => { const n = ss ? ss.hop[i] : 100, y = p[1] > H2 ? FH - 0.3 : 0.3; arect(ctx, s, sym, a, p[0] - 0.55, y - 0.22, 1.1, 0.44, n > 0 ? 'rgba(200,232,60,0.25)' : 'rgba(0,0,0,0.3)', alc(a), 1.5);
        for (let k = 0; k < Math.ceil(n / 25); k++) { const q = P(sym, a, p[0] - 0.36 + k * 0.24, y); ball(ctx, s, q.x, q.y, 0.08, FUEL); } });
      // fuel spilled from the tipped hoppers lies all over the alliance's end of the carpet
      if (ss && ss.floor > 4) { const n = Math.min(70, Math.round(ss.floor / 4)); for (let k = 1; k <= n; k++) { const fx = 1.3 + ((k * 0.754878) % 1) * (CX - 1.7), fy = 0.5 + ((k * 0.569840) % 1) * (FH - 1.0); if (Math.hypot(fx - sx, fy - H2) < 1.6) continue; const q = P(sym, a, fx, fy); ball(ctx, s, q.x, q.y, 0.05, FUEL); } }
      // the Loading Station (gears) stands across the far corner; the Retrieval Zone is the band in front of it
      apoly(ctx, s, sym, a, [[g.retrTape[0][0], 0.08], [g.stationWall[0][0], 0.08], [FW - 0.08, g.stationWall[1][1]], [FW - 0.08, g.retrTape[1][1]]], tint(a, 0.25), alc(a), 1.5);
      apoly(ctx, s, sym, a, [[g.stationWall[0][0], 0.08], [FW - 0.08, 0.08], [FW - 0.08, g.stationWall[1][1]]], '#3d454e', alc(a), 2);
      atext(ctx, s, sym, a, 'RETRIEVAL', FW - 2.25, 0.62, alc(a), 6);
    });
    // the fifth hopper stands on the rail at mid-field: whoever gets there first
    { const n = m && m.hopMid != null ? m.hopMid : 100; rect(ctx, s, CX - 0.55, FH - 0.52, 1.1, 0.44, n > 0 ? 'rgba(200,232,60,0.18)' : 'rgba(0,0,0,0.3)', '#8d97a1', 1.5);
      for (let k = 0; k < Math.ceil(n / 25); k++) ball(ctx, s, CX - 0.36 + k * 0.24, FH - 0.3, 0.08, FUEL); }
  };

  // =====================================================================
  // 2016 FIRST STRONGHOLD (rotated field)
  // =====================================================================
  const BOULDER = '#b9c0c8';
  Rd.PIECES.boulder = { shape: 'ball', col: BOULDER, r: 0.19 };
  Rd.SHOTS[2016] = { col: BOULDER, r: 0.13 };
  const DEFCOL = { L: '#8d97a1', A: '#c98a3c', B: '#4f9fd1', C: '#9b6bff', D: '#7a8f5a' };
  FIELD[2016] = function (ctx, s, sym, m) {
    const g = G.Rules.G16, LINE = g.line, HW = g.half, PASS = g.pass, LH = (FH - PASS) / 5, D16 = G.Rules.DEF16, TY = g.tower.y;
    line(ctx, s, CX, 0.06, CX, FH - 0.06, TAPE, 1.5);
    // the auto lines, a foot either side of the midline
    [CX - 0.3, CX + 0.3].forEach(x => line(ctx, s, x, 0.06, x, FH - 0.06, 'rgba(48,194,122,0.4)', 1));
    text(ctx, s, 'NEUTRAL ZONE', CX + 1.35, FH / 2 + 0.08, 'rgba(207,214,221,0.5)', 7);
    ['blue', 'red'].forEach(a => {
      const o = a === 'blue' ? 'red' : 'blue', ss = m && m.ss ? m.ss[a] : null;
      // (in the attackers' coordinates) the enemy courtyard and tower on the far wall; the tower stands a little toward
      // the defenders' Secret Passage
      arect(ctx, s, sym, a, LINE + HW, 0.06, FW - LINE - HW - 0.06, FH - PASS - 0.06, tint(o, 0.08), null, 0);
      atext(ctx, s, sym, a, 'COURTYARD', LINE + 2.6, 1.0, tint(o, 0.8), 8);
      apoly(ctx, s, sym, a, [[FW - 0.08, TY - 1.5], [FW - 0.95, TY - 1.0], [FW - 1.3, TY], [FW - 0.95, TY + 1.0], [FW - 0.08, TY + 1.5]], 'rgba(170,180,190,0.22)', alc(o), 2);
      apoly(ctx, s, sym, a, [[FW - 0.08, TY - 0.62], [FW - 0.55, TY - 0.4], [FW - 0.55, TY + 0.4], [FW - 0.08, TY + 0.62]], '#3d454e', '#e8edf2', 2);
      atext(ctx, s, sym, a, ss ? String(Math.max(0, ss.strength - ss.boulders)) : '8', FW - 0.32, TY + 0.1, ss && ss.boulders >= ss.strength ? '#30c27a' : '#e8edf2', 10);
      atext(ctx, s, sym, a, 'TOWER', FW - 0.75, TY + 1.85, alc(o), 7);
      // boulders that missed lie in the courtyard
      if (ss) ss.loose.forEach((t, k) => { const q = P(sym, a, g.tower.x - 1.9 - (k % 3) * 0.5, TY + (k % 2 ? 1.3 : -1.3)); ball(ctx, s, q.x, q.y, 0.13, BOULDER); });
      // the Outer Works the attackers cross: position 1 (the low bar) at the guardrail, position 5 beside the defenders'
      // Secret Passage, position 3 the audience's choice; a pip per crossing
      const defs = ss ? ss.def : [{ type: 'lowbar' }, { type: 'portcullis' }, { type: 'moat' }, { type: 'sallyport' }, { type: 'rockwall' }];
      arect(ctx, s, sym, a, LINE - HW, 0.06, 2 * HW, FH - PASS - 0.06, 'rgba(214,200,80,0.10)', null, 0);
      defs.forEach((d, i) => {
        const T = D16[d.type], done = (d.dmg || 0) >= 2;
        arect(ctx, s, sym, a, LINE - HW + 0.04, i * LH + 0.1, 2 * HW - 0.08, LH - 0.14, done ? 'rgba(48,194,122,0.16)' : 'rgba(0,0,0,0.38)', DEFCOL[T.cat], 2);
        atext(ctx, s, sym, a, T.ab, LINE, (i + 0.5) * LH - 0.08, DEFCOL[T.cat], 10);
        if (i === 2) atext(ctx, s, sym, a, 'CROWD', LINE, (i + 0.5) * LH - 0.42, 'rgba(232,237,242,0.55)', 5);
        [0, 1].forEach(k => { const q = P(sym, a, LINE - 0.22 + k * 0.44, (i + 0.5) * LH + 0.36); circ(ctx, s, q.x, q.y, 0.09, (d.dmg || 0) > k ? '#30c27a' : '#1d2227', '#8d97a1', 1); });
      });
      // the alliance's own Secret Passage: along the rail from its wall, past its own Outer Works, into the neutral zone.
      // The boulders its castle has to give wait at the mouth (three at the start, then whatever the opponents score).
      arect(ctx, s, sym, a, 0.08, 0.08, g.ownEnd - 0.08, PASS - 0.12, tint(a, 0.4), alc(a), 2);
      atext(ctx, s, sym, a, 'SECRET PASSAGE', 2.4, PASS / 2 + 0.1, '#e8edf2', 8);
      { const n = ss ? ss.stock : 3; for (let k = 0; k < Math.min(6, n); k++) { const q = P(sym, a, g.ownEnd - 0.35 - k * 0.45, PASS / 2 - 0.02); ball(ctx, s, q.x, q.y, 0.12, BOULDER); }
        if (n > 6) atext(ctx, s, sym, a, '+' + (n - 6), g.ownEnd - 3.3, PASS / 2 + 0.1, BOULDER, 8); }
      // boulders on the midline: three within each alliance's reach
      { const n = ss ? ss.mid : 3; for (let k = 3 - n; k < 3; k++) { const q = P(sym, a, CX, g.midY(k)); ball(ctx, s, q.x, q.y, 0.13, BOULDER); } }
    });
  };
})();
