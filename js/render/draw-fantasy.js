'use strict';
/* FRC Manager — fields of the fantasy games (seasons-fantasy.js), top-down. Each field is drawn from the match state
   when there is one (m), or as it stands before a match (the menu and Kickoff previews). */
(function () {
  const E = G.Engine, FW = E.FW, FH = E.FH, Rd = G.Render, K = Rd.K, FIELD = Rd.FIELD;
  const { rect, arect, circ, poly, line, text, apoly, aline, atext, ball, ring, P, alc, als, seeded } = K;
  const METAL = '#aab4be', DARK = '#1d2227', TAPE = 'rgba(235,240,245,0.55)', GOLD = '#f5c542';
  const CX = FW / 2, CY = FH / 2;
  const tint = (a, k) => (a === 'red' ? 'rgba(229,72,77,' + k + ')' : 'rgba(62,140,255,' + k + ')');
  const other = a => (a === 'red' ? 'blue' : 'red');
  // a thick bar between two points given in blue coordinates (a flipper, a hang bar, a rail)
  function abar(ctx, s, sym, a, x0, y0, x1, y1, col, w) { const p = P(sym, a, x0, y0), q = P(sym, a, x1, y1); ctx.lineCap = 'round'; line(ctx, s, p.x, p.y, q.x, q.y, col, Math.max(2, w * s)); ctx.lineCap = 'butt'; }
  const loose = (m, fn) => { if (m && m.loose) m.loose.forEach(p => { if (p.t <= m.t) fn(p); }); };

  // =====================================================================
  // FULL TILT (rotated field)
  // =====================================================================
  const PIN = '#d5dbe1';
  Rd.PIECES.pinball = { shape: 'ball', col: PIN, r: 0.1, many: 4 };
  Rd.SHOTS[2101] = { col: PIN, r: 0.09 };
  FIELD[2101] = function (ctx, s, sym, m) {
    const T = G.Rules.T01;
    ['blue', 'red'].forEach(a => {
      const ss = m && m.ss ? m.ss[a] : null;
      // the Shooter Lane along the guardrail, with the Plunger at its head and the pinballs it has fired
      arect(ctx, s, sym, a, 0.1, FH - T.laneW, CX - 0.1, T.laneW - 0.05, tint(a, 0.13), tint(a, 0.6), 1.5);
      atext(ctx, s, sym, a, 'SHOOTER LANE', 4.6, FH - 0.3, alc(a), 7);
      arect(ctx, s, sym, a, 0.1, FH - 1.1, 0.75, 1.0, '#14171b', alc(a), 2);
      abar(ctx, s, sym, a, 0.25, FH - 0.6, 0.72, FH - 0.6, METAL, 0.07);
      atext(ctx, s, sym, a, 'PLUNGER', 0.5, FH - 1.3, alc(a), 6);
      for (let i = 0; i < (ss ? ss.lane : 0); i++) { const p = P(sym, a, 1.25 + i * 0.5, T.laneY); ball(ctx, s, p.x, p.y, 0.09, PIN); }
      // the Multiball Rack in the other corner: six pinballs for each of the first three banks
      arect(ctx, s, sym, a, 0.1, 0.08, 1.05, 1.25, '#14171b', GOLD, 1.5);
      for (let i = 0; i < (ss ? ss.rack : 18); i++) { const p = P(sym, a, 0.28 + (i % 4) * 0.23, 0.3 + Math.floor(i / 4) * 0.2); ball(ctx, s, p.x, p.y, 0.075, PIN); }
      atext(ctx, s, sym, a, 'MULTIBALL', 0.63, 1.5, GOLD, 6);
      // the edge of the start zone, and the two flippers: sloping bars that point in towards the middle
      aline(ctx, s, sym, a, T.line, 0.06, T.line, FH - T.laneW, TAPE, 1.5);
      T.flip.forEach((f, i) => {
        const d = i ? -1 : 1;
        abar(ctx, s, sym, a, f.x - 0.62, f.y - 0.62 * d, f.x + 0.62, f.y + 0.62 * d, '#0f1215', 0.3);
        abar(ctx, s, sym, a, f.x - 0.62, f.y - 0.62 * d, f.x + 0.62, f.y + 0.62 * d, alc(a), 0.2);
        const q = P(sym, a, f.x - 0.62, f.y - 0.62 * d); circ(ctx, s, q.x, q.y, 0.11, '#e8edf2', DARK, 1);
      });
      atext(ctx, s, sym, a, 'FLIPPERS', 2.35, CY, alc(a), 7);
      // this alliance's TARGET BANK on the far wall: the Drain under it, five drop targets, the Jackpot ring above
      arect(ctx, s, sym, a, FW - 0.78, CY - 1.55, 0.45, 3.1, 'rgba(0,0,0,0.45)', METAL, 1.5);
      atext(ctx, s, sym, a, 'DRAIN', FW - 0.56, CY + 1.78, '#8d97a1', 6);
      for (let i = 0; i < 5; i++) {
        const dn = ss ? (ss.resetAt ? true : !!ss.down[i]) : false, y = CY + (i - 2) * T.tdy;
        arect(ctx, s, sym, a, FW - 0.3, y - 0.24, 0.2, 0.48, dn ? '#262b31' : alc(a), dn ? '#59626c' : '#fff', 1.5);
        if (dn) { const q = P(sym, a, FW - 0.2, y); circ(ctx, s, q.x, q.y, 0.07, GOLD); }
      }
      const jl = !!(ss && m && ss.jackUntil > m.t), j = P(sym, a, FW - 0.56, CY);
      if (jl) circ(ctx, s, j.x, j.y, 0.42, 'rgba(245,197,66,0.3)');
      circ(ctx, s, j.x, j.y, 0.2, jl ? GOLD : '#2c3238', jl ? '#fff' : GOLD, 2);
      atext(ctx, s, sym, a, a === 'red' ? 'RED BANK' : 'BLUE BANK', FW - 1.3, CY - 1.85, alc(a), 7);
      if (ss) atext(ctx, s, sym, a, 'BANKS ' + ss.banks, FW - 1.3, CY + 2.15, alc(a), 9);
    });
    // pop bumpers
    T.bump.forEach(b => {
      circ(ctx, s, b[0], b[1], 0.46, '#e8edf2', DARK, 2); circ(ctx, s, b[0], b[1], 0.33, '#e5484d', '#fff', 1.5);
      circ(ctx, s, b[0], b[1], 0.17, '#f5c542', DARK, 1);
    });
    if (m && m.loose) loose(m, p => ball(ctx, s, p.x, p.y, 0.09, PIN));
    else ['blue', 'red'].forEach(a => [[5.7, 1.0], [6.0, 3.7], [5.7, 6.2], [7.4, 2.0], [7.4, 5.2], [7.9, 7.3]].forEach(q => { const p = P(sym, a, q[0], q[1]); ball(ctx, s, p.x, p.y, 0.09, PIN); }));
  };

  // =====================================================================
  // MAINLINE (mirrored field: the rail runs along the far guardrail)
  // =====================================================================
  const DRUM = '#d08a3e';
  Rd.PIECES.drum = { shape: 'gear', col: DRUM, r: 0.14, many: 3 };
  Rd.SHOTS[2102] = { col: DRUM, r: 0.12 };
  function drum(ctx, s, x, y) { circ(ctx, s, x, y, 0.13, DRUM, 'rgba(0,0,0,0.45)', 1); circ(ctx, s, x, y, 0.05, '#7a4d1f'); }
  FIELD[2102] = function (ctx, s, sym, m) {
    const T = G.Rules.T02, eng = m && m.eng != null ? m.eng : 0, ex = CX + eng / T.term * T.span;
    // the Line: rail, sleepers, a mark every 8 ft, the two termini and the Engine
    for (let x = CX - T.span - 0.4; x <= CX + T.span + 0.4; x += 0.3) line(ctx, s, x, 0.14, x, 0.46, '#5a4a3a', 2);
    line(ctx, s, CX - T.span - 0.5, 0.22, CX + T.span + 0.5, 0.22, METAL, 2); line(ctx, s, CX - T.span - 0.5, 0.38, CX + T.span + 0.5, 0.38, METAL, 2);
    [-1, 1].forEach(k => { const x = CX + k * T.span / 2; line(ctx, s, x, 0.08, x, 0.62, TAPE, 2); });
    rect(ctx, s, CX - 0.05, 0.06, 0.1, 0.6, '#e8edf2'); text(ctx, s, 'JUNCTION', CX, 0.82, '#aab4be', 6);
    ['blue', 'red'].forEach(a => { const p = P(sym, a, CX - T.span, 0.3); rect(ctx, s, p.x - 0.28, 0.06, 0.56, 0.52, tint(a, 0.55), alc(a), 2); text(ctx, s, 'TERMINUS', p.x, 0.82, alc(a), 6); });
    rect(ctx, s, ex - 0.45, 0.1, 0.9, 0.4, '#1d2227', GOLD, 2); rect(ctx, s, ex - 0.2, 0.16, 0.4, 0.28, GOLD);
    circ(ctx, s, ex + (eng >= 0 ? 0.36 : -0.36), 0.3, 0.07, '#fff');
    ['blue', 'red'].forEach(a => {
      const ss = m && m.ss ? m.ss[a] : null, braked = !!(m && m.robots && m.robots.some(r => r.a === a && r.mem && r.mem.brake && r.st !== 'move' && Math.hypot(r.x - P(sym, a, T.pad.x, T.pad.y).x, r.y - P(sym, a, T.pad.x, T.pad.y).y) < 0.5));
      aline(ctx, s, sym, a, T.line, 0.7, T.line, FH - 0.06, TAPE, 1.5);
      // Freight House on the alliance wall (high door above the low door) and its Apron
      arect(ctx, s, sym, a, 0.62, CY - T.apronH, T.apronX - 0.62, 2 * T.apronH, tint(a, 0.13), tint(a, 0.7), 1.5);
      arect(ctx, s, sym, a, 0.1, CY - 1.05, 0.52, 2.1, '#14171b', alc(a), 2);
      arect(ctx, s, sym, a, 0.5, CY - 0.75, 0.12, 1.5, '#59626c', null); arect(ctx, s, sym, a, 0.5, CY - 0.38, 0.12, 0.76, GOLD, null);
      atext(ctx, s, sym, a, 'FREIGHT HOUSE', 1.3, CY - 1.0, alc(a), 6); atext(ctx, s, sym, a, 'APRON', 1.25, CY + 1.05, alc(a), 6);
      if (ss) atext(ctx, s, sym, a, ss.drums + ' drums', 1.3, CY + 1.5, alc(a), 9);
      // Brake Pad
      arect(ctx, s, sym, a, T.pad.x - 0.47, T.pad.y - 0.47, 0.94, 0.94, braked ? 'rgba(245,197,66,0.45)' : tint(a, 0.18), braked ? GOLD : alc(a), braked ? 3 : 2);
      atext(ctx, s, sym, a, 'BRAKE', T.pad.x, T.pad.y, braked ? '#fff' : alc(a), 7);
      // the Yards in the far corners, each with its Crank House and the drums waiting at the chute
      T.yards.forEach((y, i) => {
        arect(ctx, s, sym, a, y.x - 1.25, y.y - 0.9, 2.15, 1.8, tint(a, 0.13), tint(a, 0.7), 1.5);
        arect(ctx, s, sym, a, y.x + 0.25, y.y - 0.55, 0.6, 1.1, '#14171b', alc(a), 2);
        const c = P(sym, a, y.x + 0.55, y.y); circ(ctx, s, c.x, c.y, 0.2, null, METAL, 2); line(ctx, s, c.x, c.y, c.x + 0.16, c.y - 0.14, METAL, 2);
        for (let k = 0; k < (ss ? ss.q[i] : 1); k++) { const p = P(sym, a, y.x - 0.05 - k * 0.32, y.y); drum(ctx, s, p.x, p.y); }
        atext(ctx, s, sym, a, 'YARD', y.x - 0.6, y.y + (i ? -0.68 : 0.68), alc(a), 6);
      });
      // Signal Gantry: two posts and the bars between them
      abar(ctx, s, sym, a, T.gantry.x, T.gantry.y0, T.gantry.x, T.gantry.y1, '#0f1215', 0.2); abar(ctx, s, sym, a, T.gantry.x, T.gantry.y0, T.gantry.x, T.gantry.y1, METAL, 0.1);
      [T.gantry.y0, T.gantry.y1].forEach(y => { const p = P(sym, a, T.gantry.x, y); rect(ctx, s, p.x - 0.11, p.y - 0.11, 0.22, 0.22, '#5d6670', METAL, 1.5); });
      atext(ctx, s, sym, a, 'GANTRY', T.gantry.x + 0.62, T.gantry.y0 + 0.3, alc(a), 6);
    });
    if (m && m.loose) loose(m, p => drum(ctx, s, p.x, p.y));
    else for (let i = 0; i < 12; i++) drum(ctx, s, CX, 0.9 + i * (FH - 1.8) / 11);
  };

  // =====================================================================
  // STATION KEEPING (rotated field): the station is drawn at the angle the match has turned it to
  // =====================================================================
  const DISC = '#ece6cf';
  Rd.PIECES.disc = { shape: 'ball', col: DISC, r: 0.13, many: 4 };
  Rd.SHOTS[2103] = { col: DISC, r: 0.12 };
  function disc(ctx, s, x, y) { circ(ctx, s, x, y, 0.13, DISC, 'rgba(0,0,0,0.45)', 1); circ(ctx, s, x, y, 0.07, null, 'rgba(0,0,0,0.25)', 1); }
  FIELD[2103] = function (ctx, s, sym, m) {
    const T = G.Rules.T03, ang = k => (m ? G.Rules.ang03(m, k, 0) : Math.PI / 4 + k * Math.PI / 2), colOf = k => (k % 2 ? 'blue' : 'red');
    // the Orbit Lane, one-way, with arrows the way the station turns
    ctx.save(); ctx.setLineDash([6, 6]); circ(ctx, s, CX, CY, T.lane[0], null, TAPE, 1.5); circ(ctx, s, CX, CY, T.lane[1], null, TAPE, 1.5); ctx.restore();
    [0.4, 2.0, 3.55, 5.1].forEach(g => {
      const r0 = (T.lane[0] + T.lane[1]) / 2, x = CX + Math.cos(g) * r0, y = CY + Math.sin(g) * r0, tx = -Math.sin(g), ty = Math.cos(g);
      poly(ctx, s, [{ x: x + tx * 0.2, y: y + ty * 0.2 }, { x: x - tx * 0.1 + Math.cos(g) * 0.12, y: y - ty * 0.1 + Math.sin(g) * 0.12 }, { x: x - tx * 0.1 - Math.cos(g) * 0.12, y: y - ty * 0.1 - Math.sin(g) * 0.12 }], 'rgba(235,240,245,0.45)');
    });
    text(ctx, s, 'ORBIT LANE', CX, CY - T.lane[1] - 0.22, '#aab4be', 7);
    ['blue', 'red'].forEach(a => {
      const ss = m && m.ss ? m.ss[a] : null;
      aline(ctx, s, sym, a, T.line, 0.06, T.line, FH - 0.06, TAPE, 1.5);
      T.pads.forEach(p => { arect(ctx, s, sym, a, p.x - 0.61, p.y - 0.61, 1.22, 1.22, tint(a, 0.2), alc(a), 2); atext(ctx, s, sym, a, 'PAD', p.x, p.y, alc(a), 7); });
      T.depots.forEach((d, i) => {
        arect(ctx, s, sym, a, 0.1, d.y - 0.6, 0.55, 1.2, '#14171b', alc(a), 2);
        abar(ctx, s, sym, a, 0.62, d.y - 0.35, 0.62, d.y + 0.35, DISC, 0.05);
        atext(ctx, s, sym, a, 'DEPOT' + (ss && !i ? ' ' + ss.hp : ''), 1.25, d.y + (i ? 0.72 : -0.72), alc(a), 6);
      });
    });
    // docking arms under the ports, then the station itself with its four ports
    for (let k = 0; k < 4; k++) {
      const g = ang(k), c = colOf(k), x1 = CX + Math.cos(g) * (T.arm + 0.35), y1 = CY + Math.sin(g) * (T.arm + 0.35);
      ctx.lineCap = 'round'; line(ctx, s, CX, CY, x1, y1, '#0f1215', Math.max(3, 0.2 * s)); line(ctx, s, CX, CY, x1, y1, alc(c), Math.max(2, 0.11 * s)); ctx.lineCap = 'butt';
      const tx = -Math.sin(g) * 0.3, ty = Math.cos(g) * 0.3; line(ctx, s, x1 - tx, y1 - ty, x1 + tx, y1 + ty, '#e8edf2', Math.max(2, 0.07 * s));
    }
    circ(ctx, s, CX, CY, T.rad, '#2c3238', METAL, 3);
    for (let k = 0; k < 4; k++) { const g = ang(k), c = colOf(k); circ(ctx, s, CX + Math.cos(g) * (T.rad - 0.16), CY + Math.sin(g) * (T.rad - 0.16), 0.17, alc(c), '#fff', 1.5); }
    const hatch = !!(m && m.inEnd);
    circ(ctx, s, CX, CY, 0.3, hatch ? GOLD : '#14171b', hatch ? '#fff' : '#59626c', 2);
    text(ctx, s, 'STATION', CX, CY + T.lane[1] + 0.25, '#aab4be', 7);
    if (m && m.loose) loose(m, p => disc(ctx, s, p.x, p.y));
    else ['blue', 'red'].forEach(a => [[4.4, 1.2], [4.4, CY], [4.4, FH - 1.2], [6.2, 0.9], [6.2, FH - 0.9], [5.6, 2.6], [5.6, FH - 2.6], [7.3, 1.9]].forEach(q => { const p = P(sym, a, q[0], q[1]); disc(ctx, s, p.x, p.y); }));
  };

  // =====================================================================
  // HIGH RISE (rotated field). The tower is drawn laid on its back: floor 1 is the strip nearest the field, floor 4
  // the one nearest the alliance wall, and each strip has its three bays.
  // =====================================================================
  const GIRD = '#e0a23a';
  Rd.PIECES.girder = { shape: 'bar', col: GIRD, r: 0.16, many: 2 };
  function girder(ctx, s, x, y, g) { const dx = Math.cos(g) * 0.5, dy = Math.sin(g) * 0.5; ctx.lineCap = 'round'; line(ctx, s, x - dx, y - dy, x + dx, y + dy, '#0f1215', Math.max(3, 0.13 * s)); line(ctx, s, x - dx, y - dy, x + dx, y + dy, GIRD, Math.max(2, 0.08 * s)); ctx.lineCap = 'butt'; }
  FIELD[2104] = function (ctx, s, sym, m) {
    const T = G.Rules.T04, fw = (T.tx - 0.22) / 4;
    ['blue', 'red'].forEach(a => {
      const ss = m && m.ss ? m.ss[a] : null, top = ss ? G.Rules.floors04(ss) : 0;
      aline(ctx, s, sym, a, T.line, 0.06, T.line, FH - 0.06, TAPE, 1.5);
      arect(ctx, s, sym, a, 0.1, CY - T.siteH, T.siteX - 0.1, 2 * T.siteH, tint(a, 0.12), tint(a, 0.7), 1.5);
      atext(ctx, s, sym, a, 'SITE', 2.25, CY - T.siteH + 0.22, alc(a), 7);
      // the tower: four floors by three bays, a girder across every filled bay
      arect(ctx, s, sym, a, 0.18, CY - 1.6, T.tx - 0.14, 3.2, '#14171b', METAL, 2);
      for (let f = 0; f < 4; f++) {
        const x0 = T.tx - 0.04 - (f + 1) * fw, done = f < top;
        for (let b = 0; b < 3; b++) {
          const y0 = CY + (b - 1) * T.bayDy - 0.45, on = ss ? ss.grid[f][b] : 0;
          arect(ctx, s, sym, a, x0 + 0.02, y0, fw - 0.04, 0.9, 'rgba(255,255,255,0.05)', done ? '#fff' : '#59626c', done ? 1.5 : 1);
          for (let k = 0; k < on; k++) arect(ctx, s, sym, a, x0 + 0.04 + k * (fw - 0.06) / 2, y0 + 0.04, (fw - 0.1) / 2, 0.82, GIRD, null);
        }
        atext(ctx, s, sym, a, String(f + 1), x0 + fw / 2, CY + 2.17, done ? '#fff' : '#8d97a1', 6);
      }
      atext(ctx, s, sym, a, 'TOWER', 0.75, CY - 2.17, alc(a), 7);
      if (ss && ss.stock) atext(ctx, s, sym, a, 'STOCKPILE ' + ss.stock, 2.1, CY + 2.17, GIRD, 6);
      // the rungs on both flanks: lit when the floor that opens them is topped out
      [-1, 1].forEach(sd => [0, 1, 2].forEach(k => {
        const open = G.Rules.rungs04(top) > k, x = T.tx - 0.25 - k * 0.3;
        abar(ctx, s, sym, a, x, CY + sd * 1.68, x, CY + sd * 2.0, open ? '#4cff8a' : '#59626c', 0.07);
      }));
      atext(ctx, s, sym, a, 'RUNGS', 1.85, CY - 1.84, top >= 1 ? '#4cff8a' : '#8d97a1', 6);
      // Supply Yard racks in the far corners with the girders waiting on them
      T.racks.forEach((y, i) => {
        arect(ctx, s, sym, a, y.x - 1.3, y.y - 0.85, 2.0, 1.7, tint(a, 0.12), tint(a, 0.7), 1.5);
        arect(ctx, s, sym, a, y.x + 0.1, y.y - 0.6, 0.55, 1.2, '#14171b', alc(a), 2);
        for (let k = 0; k < (ss ? ss.q[i] : 1); k++) abar(ctx, s, sym, a, y.x - 0.55, y.y - 0.2 + k * 0.4, y.x + 0.25, y.y - 0.2 + k * 0.4, GIRD, 0.08);
        atext(ctx, s, sym, a, 'SUPPLY YARD', y.x - 0.5, y.y + (i ? -0.68 : 0.68), alc(a), 6);
      });
      // this alliance's two cradles on the Footbridge
      const nb = ss ? ss.bridge : 0;
      [-0.5, 0.5].forEach((dy, k) => { arect(ctx, s, sym, a, CX - 0.62, CY + dy - 0.2, 0.5, 0.4, k < nb ? GIRD : tint(a, 0.25), alc(a), 1.5); });
    });
    rect(ctx, s, CX - 0.12, CY - 0.75, 0.24, 1.5, '#3a4048', METAL, 2);
    text(ctx, s, 'FOOTBRIDGE', CX, CY - 1.0, m && m.coop ? '#4cff8a' : '#aab4be', 7);
    const rr = seeded(2104);
    if (m && m.loose) loose(m, p => girder(ctx, s, p.x, p.y, ((p.x * 7.3 + p.y * 3.1) % 3.14)));
    else ['blue', 'red'].forEach(a => T.floor.forEach(q => { const p = P(sym, a, q[0], q[1]); girder(ctx, s, p.x, p.y, 1.2 + rr() * 0.7); }));
  };

  // =====================================================================
  // GALE FORCE (rotated field): the rotors turn as fast as the match says, and glow while they generate
  // =====================================================================
  const GCELL = '#9be15d';
  Rd.PIECES.gcell = { shape: 'ball', col: GCELL, r: 0.1, many: 5 };
  Rd.SHOTS[2105] = { col: GCELL, r: 0.09 };
  FIELD[2105] = function (ctx, s, sym, m) {
    const T = G.Rules.T05, NAME = { home: 'HOME', field: 'FIELD', off: 'OFFSHORE' };
    ['blue', 'red'].forEach(a => {
      const ss = m && m.ss ? m.ss[a] : null, n = ss ? T.keys.filter(k => ss.t[k] >= T.gen).length : 0;
      aline(ctx, s, sym, a, T.line, 0.06, T.line, FH - 0.06, TAPE, 1.5);
      arect(ctx, s, sym, a, 0.1, 0.08, T.pad - 0.1, T.pad - 0.08, tint(a, 0.13), tint(a, 0.7), 1.5);
      atext(ctx, s, sym, a, 'HOME PAD', 1.1, T.pad + 0.2, alc(a), 6);
      // the chute and, beside the Home turbine, the human player's crank
      arect(ctx, s, sym, a, 0.1, T.chute.y - 0.6, 0.6, 1.2, '#14171b', alc(a), 2);
      atext(ctx, s, sym, a, 'CHUTE' + (ss ? ' ' + ss.hp : ''), 1.25, T.chute.y + 0.8, alc(a), 6);
      { const c = P(sym, a, 0.32, 1.15), on = !!(ss && ss.crank); circ(ctx, s, c.x, c.y, 0.17, on ? GOLD : null, on ? '#fff' : METAL, 2); line(ctx, s, c.x, c.y, c.x + 0.14, c.y - 0.12, on ? '#fff' : METAL, 2); }
      // this alliance's Grid on the far wall: the high inlet and the low trough, and what a cell is worth right now
      arect(ctx, s, sym, a, FW - 0.5, CY - 1.0, 0.4, 2.0, '#14171b', alc(a), 2);
      { const g = P(sym, a, FW - 0.3, CY); circ(ctx, s, g.x, g.y, 0.26, n ? alc(a) : '#3a4048', '#fff', 2); }
      atext(ctx, s, sym, a, a === 'red' ? 'RED GRID' : 'BLUE GRID', FW - 1.25, CY - 1.25, alc(a), 7);
      if (ss) atext(ctx, s, sym, a, 'CELL +' + n, FW - 1.25, CY + 1.3, n === 3 ? GOLD : alc(a), 9);
      // the three turbines
      T.keys.forEach(k => {
        const p = P(sym, a, T.turb[k].x, T.turb[k].y), sp = ss ? ss.t[k] : 0, on = sp >= T.gen, g0 = (m ? m.t : 0) * (0.6 + 5 * sp) * (a === 'red' ? -1 : 1) + (k === 'field' ? 1 : k === 'off' ? 2 : 0);
        if (on) circ(ctx, s, p.x, p.y, 0.95, tint(a, 0.22));
        circ(ctx, s, p.x, p.y, 0.62, null, on ? alc(a) : '#59626c', on ? 2.5 : 1.5);
        for (let b = 0; b < 3; b++) { const g = g0 + b * 2.094; ctx.lineCap = 'round'; line(ctx, s, p.x, p.y, p.x + Math.cos(g) * 0.58, p.y + Math.sin(g) * 0.58, on ? '#f4f7fa' : '#8d97a1', Math.max(2, 0.1 * s)); ctx.lineCap = 'butt'; }
        circ(ctx, s, p.x, p.y, 0.13, alc(a), DARK, 1.5);
        // the speed gauge under the name: full, down to the generating line, empty
        const up = p.y > CY ? -1 : 1, gy = p.y + up * 1.0 - 0.045; // toward the middle of the field, so nothing falls off the edge
        text(ctx, s, NAME[k], p.x, p.y + up * 0.82, alc(a), 6);
        rect(ctx, s, p.x - 0.4, gy, 0.8, 0.09, '#14171b', '#59626c', 1); rect(ctx, s, p.x - 0.4, gy, 0.8 * sp, 0.09, on ? '#4cff8a' : '#e5484d');
        line(ctx, s, p.x - 0.4 + 0.8 * T.gen, gy - 0.04, p.x - 0.4 + 0.8 * T.gen, gy + 0.13, '#fff', 1.5);
      });
    });
    const st = [[4.3, 2.2], [4.3, CY], [4.3, FH - 2.4], [5.6, 1.0], [5.6, 3.2], [5.6, 5.2], [6.9, 2.1], [6.9, CY], [7.6, 6.0], [7.6, 0.9]];
    if (m && m.loose) loose(m, p => ball(ctx, s, p.x, p.y, 0.09, GCELL));
    else ['blue', 'red'].forEach(a => st.forEach(q => { const p = P(sym, a, q[0], q[1]); ball(ctx, s, p.x, p.y, 0.09, GCELL); }));
  };

  // =====================================================================
  // DEEP FREEZE (rotated field)
  // =====================================================================
  const ICE = '#dfeefa';
  Rd.PIECES.stoneR = { shape: 'gear', col: '#e5484d', r: 0.15, many: 2 };
  Rd.PIECES.stoneB = { shape: 'gear', col: '#3e8cff', r: 0.15, many: 2 };
  Rd.SHOTS[2106] = { col: '#c9d2da', r: 0.11 };
  function stone(ctx, s, x, y, a) { circ(ctx, s, x, y, 0.125, alc(a), '#0f1215', 1.5); circ(ctx, s, x, y, 0.05, '#f4f7fa'); }
  FIELD[2106] = function (ctx, s, sym, m) {
    const T = G.Rules.T06;
    ['blue', 'red'].forEach(a => {
      const ss = m && m.ss ? m.ss[a] : null;
      aline(ctx, s, sym, a, T.line, 0.06, T.line, FH - 0.06, TAPE, 1.5);
      // the human players' lane from the wall to the ice
      arect(ctx, s, sym, a, 0.1, CY - 0.3, CX - T.ice - 0.1, 0.6, 'rgba(223,238,250,0.16)', 'rgba(223,238,250,0.5)', 1);
      atext(ctx, s, sym, a, 'HUMAN PLAYER LANE', 3.3, CY - 0.48, '#aab4be', 6);
      // Sled Chutes with the stones waiting at them
      T.chutes.forEach((c, i) => {
        arect(ctx, s, sym, a, 0.1, c.y - 0.45, 0.55, 0.9, '#14171b', alc(a), 2);
        for (let k = 0; k < (ss ? ss.q[i] : 1); k++) { const p = P(sym, a, 0.85 + k * 0.3, c.y); stone(ctx, s, p.x, p.y, a); }
      });
      atext(ctx, s, sym, a, 'SLED CHUTES' + (ss ? ' ' + ss.hp : ''), 1.2, 0.3, alc(a), 6);
      // the Lodge: deck in the corner, the icy ramp up to it
      arect(ctx, s, sym, a, 0.1, T.lodge.y, T.lodge.x - 0.1, FH - T.lodge.y - 0.08, tint(a, 0.3), alc(a), 2.5);
      arect(ctx, s, sym, a, T.lodge.x, T.lodge.y, 1.1, FH - T.lodge.y - 0.08, 'rgba(223,238,250,0.22)', 'rgba(223,238,250,0.6)', 1.5);
      for (let k = 0; k < 4; k++) aline(ctx, s, sym, a, T.lodge.x + 0.2 + k * 0.24, T.lodge.y + 0.15, T.lodge.x + 0.2 + k * 0.24, FH - 0.2, 'rgba(223,238,250,0.35)', 1);
      atext(ctx, s, sym, a, 'LODGE', 1.25, T.lodge.y + 0.9, alc(a), 9); atext(ctx, s, sym, a, 'RAMP', T.lodge.x + 0.55, T.lodge.y - 0.2, '#aab4be', 6);
    });
    // the ice and the House
    circ(ctx, s, CX, CY, T.ice, ICE, '#8fb4d6', 3);
    circ(ctx, s, CX, CY, 1.22, 'rgba(62,140,255,0.28)', '#5f7f9c', 1.5); circ(ctx, s, CX, CY, 0.76, ICE, '#5f7f9c', 1.5);
    circ(ctx, s, CX, CY, 0.38, 'rgba(229,72,77,0.32)', '#5f7f9c', 1.5); circ(ctx, s, CX, CY, 0.15, '#f7fbff', '#31465a', 1.5);
    line(ctx, s, CX, CY - T.ice, CX, CY + T.ice, 'rgba(49,70,90,0.35)', 1); line(ctx, s, CX - T.ice, CY, CX + T.ice, CY, 'rgba(49,70,90,0.35)', 1);
    if (m && m.stones) {
      let shot = null; m.stones.forEach(st => { if (!shot || Math.hypot(st.x - CX, st.y - CY) < Math.hypot(shot.x - CX, shot.y - CY)) shot = st; });
      if (shot && Math.hypot(shot.x - CX, shot.y - CY) <= T.rings[3]) circ(ctx, s, shot.x, shot.y, 0.22, null, GOLD, 2.5);
      m.stones.forEach(st => stone(ctx, s, st.x, st.y, st.a));
      loose(m, p => stone(ctx, s, p.x, p.y, p.c));
      const nx = m.phase === 'auto' ? m.T.auto - m.t : m.frozen < 3 ? T.freeze[m.frozen - 1] - m.t : m.total - m.t;
      if (!m.done) text(ctx, s, 'FREEZE ' + (m.frozen + 1) + ' IN ' + Math.max(0, Math.ceil(nx)) + ' s', CX, 0.32, nx < 8 ? GOLD : '#dfeefa', 10);
      if (m.lastFreeze) text(ctx, s, 'LAST FREEZE  RED ' + m.lastFreeze.red + '  BLUE ' + m.lastFreeze.blue, CX, FH - 0.3, m.lastFreeze.shot ? alc(m.lastFreeze.shot) : '#dfeefa', 8);
    } else {
      [[0.1, -0.05, 'blue'], [-0.45, 0.3, 'red'], [0.7, 0.9, 'red'], [-1.1, -0.7, 'blue'], [1.5, -0.5, 'red'], [0.35, -1.3, 'blue']].forEach(q => stone(ctx, s, CX + q[0], CY + q[1], q[2]));
      text(ctx, s, 'ICE: ROBOTS KEEP OFF', CX, 0.32, '#dfeefa', 8);
    }
  };

  // =====================================================================
  // EVEN KEEL (rotated field): the ship's heavy side is shaded as it lists, and every stack shows how high it stands
  // =====================================================================
  const CONT = '#3fb8a6';
  Rd.PIECES.cont = { shape: 'box', col: CONT, r: 0.16, many: 2 };
  function cont(ctx, s, x, y, k) { rect(ctx, s, x - 0.13, y - 0.13, 0.26, 0.26, k === 0 ? '#6f7b85' : CONT, 'rgba(0,0,0,0.45)', 1); }
  FIELD[2107] = function (ctx, s, sym, m) {
    const T = G.Rules.T07;
    ['blue', 'red'].forEach(a => {
      const ss = m && m.ss ? m.ss[a] : null, M = ss ? G.Rules.mom07(m, a) : 0, list = Math.abs(M) >= 3;
      aline(ctx, s, sym, a, T.line, 0.06, T.line, FH - 0.06, TAPE, 1.5);
      arect(ctx, s, sym, a, 0.1, CY - T.hh, T.hx - 0.1, 2 * T.hh, tint(a, 0.1), tint(a, 0.7), 1.5);
      atext(ctx, s, sym, a, 'HARBOUR', 4.3, CY - T.hh + 0.22, alc(a), 7);
      // hull and deck: stern at the wall, bow toward the field; the keel down the middle
      apoly(ctx, s, sym, a, [[0.12, CY - T.half - 0.12], [T.bow, CY - T.half - 0.12], [T.bow + 0.75, CY], [T.bow, CY + T.half + 0.12], [0.12, CY + T.half + 0.12]], '#1f262c', alc(a), 2.5);
      apoly(ctx, s, sym, a, [[0.2, CY - T.half], [T.bow - 0.05, CY - T.half], [T.bow + 0.5, CY], [T.bow - 0.05, CY + T.half], [0.2, CY + T.half]], '#55483a', '#8a765f', 1);
      if (ss && M) arect(ctx, s, sym, a, 0.2, M > 0 ? CY - T.half : CY, T.bow - 0.25, T.half, list ? 'rgba(229,72,77,0.35)' : 'rgba(245,197,66,0.14)', null);
      aline(ctx, s, sym, a, 0.2, CY, T.bow + 0.5, CY, 'rgba(255,255,255,0.3)', 1, [5, 5]);
      // the eight stack spots: containers drawn fanned out so the height reads (grey = placed while listing, no points)
      for (let i = 0; i < 8; i++) {
        const sd = i < 4 ? -1 : 1, x = T.sx[i % 4], y = CY + sd * 0.42, st = ss ? ss.st[i] : [];
        arect(ctx, s, sym, a, x - 0.2, y - 0.2, 0.4, 0.4, 'rgba(0,0,0,0.25)', 'rgba(255,255,255,0.35)', 1);
        st.forEach((v, k) => { const p = P(sym, a, x - 0.07 + k * 0.07, y - 0.07 * sd + k * 0.07 * sd); cont(ctx, s, p.x, p.y, v); });
        if (st.length) { const p = P(sym, a, x, y + sd * 0.0); text(ctx, s, String(st.length), p.x, p.y, '#0f1215', 8); }
      }
      atext(ctx, s, sym, a, 'PORT', 1.9, CY - T.half - 0.3, '#aab4be', 6); atext(ctx, s, sym, a, 'STARBOARD', 1.9, CY + T.half + 0.3, '#aab4be', 6);
      // ballast trays at the stern (the Bosun's bags), and the davits at the bow
      [0, 1].forEach(sd => { const n = ss ? (sd ? 6 - ss.bal : ss.bal) : 3; for (let k = 0; k < n; k++) { const p = P(sym, a, 0.34, CY + (sd ? 1 : -1) * (0.14 + k * 0.1)); rect(ctx, s, p.x - 0.09, p.y - 0.04, 0.18, 0.08, '#d9c58a', 'rgba(0,0,0,0.5)', 1); } });
      [-1, 1].forEach(sd => { abar(ctx, s, sym, a, T.davit.x - 0.4, CY + sd * (T.half + 0.14), T.davit.x + 0.4, CY + sd * (T.half + 0.14), '#0f1215', 0.16); abar(ctx, s, sym, a, T.davit.x - 0.4, CY + sd * (T.half + 0.14), T.davit.x + 0.4, CY + sd * (T.half + 0.14), '#e8edf2', 0.07); });
      if (ss) atext(ctx, s, sym, a, list ? 'LISTING ' + (M > 0 ? 'TO PORT' : 'TO STARBOARD') : Math.abs(M) <= 1 ? 'LEVEL' : 'out of trim ' + Math.abs(M), 2.2, CY + T.hh - 0.25, list ? '#ff6b6b' : Math.abs(M) <= 1 ? '#4cff8a' : GOLD, 8);
      // the Quay chutes in the far corners
      T.quay.forEach((q, i) => {
        arect(ctx, s, sym, a, q.x - 1.3, q.y - 0.85, 2.0, 1.7, tint(a, 0.12), tint(a, 0.7), 1.5);
        arect(ctx, s, sym, a, q.x + 0.1, q.y - 0.55, 0.55, 1.1, '#14171b', alc(a), 2);
        for (let k = 0; k < (ss ? ss.q[i] : 1); k++) { const p = P(sym, a, q.x - 0.15 - k * 0.34, q.y); cont(ctx, s, p.x, p.y, 1); }
        atext(ctx, s, sym, a, 'QUAY', q.x - 0.6, q.y + (i ? -0.68 : 0.68), alc(a), 6);
      });
    });
    if (m && m.loose) loose(m, p => cont(ctx, s, p.x, p.y, 1));
    else for (let i = 0; i < 12; i++) cont(ctx, s, CX, 0.75 + i * (FH - 1.5) / 11, 1);
  };

  // =====================================================================
  // MOTHERLODE (rotated field)
  // =====================================================================
  const ORE = { red: '#d9774a', blue: '#4a8fd9', gold: '#f5c542' };
  Rd.PIECES.oreR = { shape: 'ball', col: ORE.red, r: 0.09, many: 6 };
  Rd.PIECES.oreB = { shape: 'ball', col: ORE.blue, r: 0.09, many: 6 };
  Rd.SHOTS[2108] = { col: '#c9a56a', r: 0.07 };
  FIELD[2108] = function (ctx, s, sym, m) {
    const T = G.Rules.T08;
    // the two Veins above the side walls and their detonators
    T.veins.forEach((v, i) => {
      const full = !m || !m.vein || m.vein[i], dn = v.y < CY ? 1 : -1;
      rect(ctx, s, v.x - 1.6, v.y - 0.35, 3.2, 0.7, '#14171b', full ? GOLD : '#59626c', 2);
      if (full) { const r = seeded(80 + i); for (let k = 0; k < 26; k++) ball(ctx, s, v.x - 1.45 + r() * 2.9, v.y - 0.22 + r() * 0.44, 0.06, k % 9 === 0 ? ORE.gold : k % 2 ? ORE.red : ORE.blue); }
      text(ctx, s, full ? 'VEIN' : 'VEIN (FIRED)', v.x, v.y + dn * 0.6, full ? GOLD : '#8d97a1', 7);
      rect(ctx, s, v.x - 0.2, v.y + dn * 0.38 - 0.08, 0.4, 0.16, full ? '#e5484d' : '#59626c', '#0f1215', 1.5);
    });
    ['blue', 'red'].forEach(a => {
      const ss = m && m.ss ? m.ss[a] : null, up = !!(ss && m.robots && m.robots.some(r => r.a === a && r.end && r.end.lvl > 0));
      aline(ctx, s, sym, a, T.line, 0.06, T.line, FH - 0.06, TAPE, 1.5);
      arect(ctx, s, sym, a, 0.1, CY - T.ch, T.cx - 0.1, 2 * T.ch, tint(a, 0.12), tint(a, 0.7), 1.5);
      atext(ctx, s, sym, a, 'CLAIM', 2.25, CY - T.ch + 0.22, alc(a), 7);
      // headframe and Skip, with what is in it
      arect(ctx, s, sym, a, T.skip.x - 0.75, CY - 0.62, 1.5, 1.24, '#14171b', METAL, 2);
      arect(ctx, s, sym, a, T.skip.x - 0.55, CY - 0.46, 1.1, 0.92, up ? tint(a, 0.6) : '#2c3238', alc(a), 2.5);
      if (ss) { const r = seeded(a === 'red' ? 91 : 92), n = Math.min(40, ss.ore + ss.gold + ss.bad);
        for (let k = 0; k < n; k++) { const p = P(sym, a, T.skip.x - 0.42 + r() * 0.84, CY - 0.34 + r() * 0.68); ball(ctx, s, p.x, p.y, 0.055, k < ss.gold ? ORE.gold : k < ss.gold + ss.bad ? ORE[other(a)] : ORE[a]); }
        atext(ctx, s, sym, a, ss.ore + ' ore · ' + ss.gold + ' gold' + (ss.bad ? ' · ' + ss.bad + ' wrong' : ''), 1.45, CY - 0.85, alc(a), 8); }
      atext(ctx, s, sym, a, 'SKIP', T.skip.x, CY + 0.85, alc(a), 7);
      // the Hoist Chain and its tow ring; the chute where the human player sends ore back
      abar(ctx, s, sym, a, T.skip.x + 0.2, CY + 0.62, T.ring.x, T.ring.y, '#8d97a1', 0.05);
      { const p = P(sym, a, T.ring.x, T.ring.y); circ(ctx, s, p.x, p.y, 0.13, null, GOLD, 3); }
      atext(ctx, s, sym, a, 'HOIST', T.ring.x + 0.1, T.ring.y + 0.32, GOLD, 6);
      arect(ctx, s, sym, a, 0.1, T.chute.y - 0.5, 0.5, 1.0, '#14171b', alc(a), 2);
      atext(ctx, s, sym, a, 'CHUTE' + (ss && ss.hp ? ' ' + ss.hp : ''), 1.1, T.chute.y - 0.7, alc(a), 6);
    });
    if (m && m.loose) loose(m, p => ball(ctx, s, p.x, p.y, 0.075, ORE[p.c]));
    else { const r = seeded(2108); for (let k = 0; k < 42; k++) ball(ctx, s, 3.4 + r() * (FW - 6.8), 0.8 + r() * (FH - 1.6), 0.075, k % 21 === 0 ? ORE.gold : k % 2 ? ORE.red : ORE.blue); }
  };

  // =====================================================================
  // SIGNAL FIRE (rotated field): every post shows its rings in the order they went on, and glows in its owner's colour
  // =====================================================================
  Rd.PIECES.ringR = { shape: 'disc', col: '#ff6b6b', r: 0.15, many: 2 };
  Rd.PIECES.ringB = { shape: 'disc', col: '#5aa2ff', r: 0.15, many: 2 };
  function ringPc(ctx, s, x, y, a) { circ(ctx, s, x, y, 0.13, null, a === 'red' ? '#ff6b6b' : '#5aa2ff', Math.max(2, 0.055 * s)); }
  FIELD[2109] = function (ctx, s, sym, m) {
    const T = G.Rules.T09, posts = m && m.posts ? m.posts : T.posts.map(p => Object.assign({ rings: [] }, p));
    ['blue', 'red'].forEach(a => {
      const ss = m && m.ss ? m.ss[a] : null;
      aline(ctx, s, sym, a, T.line, 0.06, T.line, FH - 0.06, TAPE, 1.5);
      T.chutes.forEach((c, i) => {
        arect(ctx, s, sym, a, 0.1, c.y - 0.5, 0.5, 1.0, '#14171b', alc(a), 2);
        for (let k = 0; k < (ss ? ss.q[i] : 1); k++) { const p = P(sym, a, 0.85 + k * 0.32, c.y); ringPc(ctx, s, p.x, p.y, a); }
        atext(ctx, s, sym, a, 'CHUTE', 1.0, c.y + (i ? 0.72 : -0.72), alc(a), 6);
      });
      // the Keeper's box at the middle of the wall, and the Lighthouse bar in the corner
      arect(ctx, s, sym, a, 0.1, CY - 0.45, 0.4, 0.9, tint(a, 0.4), alc(a), 1.5); atext(ctx, s, sym, a, 'KEEPER' + (ss ? ' ' + ss.hp : ''), 0.85, CY - 0.62, alc(a), 6);
      abar(ctx, s, sym, a, T.bar.x0, T.bar.y, T.bar.x1, T.bar.y, '#0f1215', 0.2); abar(ctx, s, sym, a, T.bar.x0, T.bar.y, T.bar.x1, T.bar.y, '#e8edf2', 0.09);
      [T.bar.x0, T.bar.x1].forEach(x => { const p = P(sym, a, x, T.bar.y); rect(ctx, s, p.x - 0.11, p.y - 0.11, 0.22, 0.22, '#5d6670', METAL, 1.5); });
      atext(ctx, s, sym, a, 'LIGHTHOUSE', (T.bar.x0 + T.bar.x1) / 2, T.bar.y - 0.4, alc(a), 6);
    });
    posts.forEach(p => {
      const ow = m ? G.Rules.owner09(p) : null, R = p.tall ? 0.62 : 0.5, nr = p.rings.filter(c => c === 'red').length, nb = p.rings.length - nr;
      const lock = Math.max(nr, nb) > p.cap / 2;
      if (p.home) circ(ctx, s, p.x, p.y, 0.9, tint(p.home, 0.14), tint(p.home, 0.7), 1.5);
      circ(ctx, s, p.x, p.y, R, ow ? tint(ow, lock ? 0.55 : 0.3) : 'rgba(255,255,255,0.05)', ow ? alc(ow) : '#8d97a1', lock ? 4 : 2);
      // the stack, bottom ring outermost, top ring at the pole
      p.rings.forEach((c, i) => { const rr = R - 0.06 - (R - 0.16) * i / Math.max(1, p.cap - 1); circ(ctx, s, p.x, p.y, rr, null, c === 'red' ? '#ff6b6b' : '#5aa2ff', Math.max(1.5, 0.035 * s)); });
      circ(ctx, s, p.x, p.y, 0.08, p.tall ? GOLD : '#e8edf2', DARK, 1.5);
      text(ctx, s, p.tall ? 'CENTRE ×2' : p.k, p.x, p.y - R - 0.2, ow ? alc(ow) : '#aab4be', p.tall ? 8 : 6);
      if (m) text(ctx, s, nr + ' : ' + nb + (lock ? ' LOCKED' : ''), p.x, p.y + R + 0.2, ow ? alc(ow) : '#aab4be', 7);
    });
    if (m && m.loose) loose(m, p => ringPc(ctx, s, p.x, p.y, p.c));
    else ['blue', 'red'].forEach(a => T.floor.forEach(q => { const p = P(sym, a, q[0], q[1]); ringPc(ctx, s, p.x, p.y, a); }));
    if (m && m.phase === 'tele' && !m.done) text(ctx, s, 'NEXT PULSE ' + Math.max(0, Math.ceil(m.T.auto + 10 * (m.pulses + 1) - m.t)) + ' s', CX, FH - 0.3, '#dfe6ee', 9);
  };

  // =====================================================================
  // BRIDGEWORK (rotated field)
  // =====================================================================
  const CRATE = '#c9925a', PANEL = '#d9c58a';
  Rd.PIECES.crate = { shape: 'box', col: CRATE, r: 0.15, many: 2 };
  function crate(ctx, s, x, y) { rect(ctx, s, x - 0.12, y - 0.12, 0.24, 0.24, CRATE, 'rgba(0,0,0,0.45)', 1); line(ctx, s, x - 0.12, y, x + 0.12, y, 'rgba(0,0,0,0.3)', 1); }
  FIELD[2110] = function (ctx, s, sym, m) {
    const T = G.Rules.T10, NM = ['NORTH', 'CENTRE', 'SOUTH'];
    // the River and its kerbs
    rect(ctx, s, CX - T.rx, 0.05, 2 * T.rx, FH - 0.1, '#1f4b6e', null);
    for (let k = 0; k < 9; k++) { const y = 0.5 + k * 0.9; line(ctx, s, CX - 0.3, y, CX - 0.05, y + 0.12, 'rgba(160,205,240,0.35)', 1.5); line(ctx, s, CX + 0.05, y + 0.4, CX + 0.3, y + 0.52, 'rgba(160,205,240,0.35)', 1.5); }
    line(ctx, s, CX - T.rx, 0.05, CX - T.rx, FH - 0.05, '#8d97a1', 3); line(ctx, s, CX + T.rx, 0.05, CX + T.rx, FH - 0.05, '#8d97a1', 3);
    // the three Crossings: frame, the panels laid so far in the colour of who laid them, barriers until it opens
    T.cross.forEach((y, i) => {
      const c = m && m.cross ? m.cross[i] : { n: 0, by: { red: 0, blue: 0 }, open: false };
      rect(ctx, s, CX - T.rx - 0.08, y - T.cw, 2 * T.rx + 0.16, 2 * T.cw, c.open ? '#6b5a3f' : '#14171b', c.open ? '#4cff8a' : METAL, c.open ? 3 : 2);
      for (let k = 0; k < 5; k++) {
        const py = y - T.cw + 0.04 + k * (2 * T.cw - 0.08) / 5, on = k < c.n, col = k < c.by.blue ? 'blue' : 'red';
        rect(ctx, s, CX - T.rx - 0.04, py + 0.02, 2 * T.rx + 0.08, (2 * T.cw - 0.08) / 5 - 0.04, on ? PANEL : 'rgba(255,255,255,0.05)', on ? alc(col) : '#3a4048', on ? 1.5 : 1);
      }
      if (!c.open) { line(ctx, s, CX - T.rx - 0.12, y - T.cw, CX - T.rx - 0.12, y + T.cw, '#e5484d', 3); line(ctx, s, CX + T.rx + 0.12, y - T.cw, CX + T.rx + 0.12, y + T.cw, '#e5484d', 3); }
      text(ctx, s, NM[i] + (c.open ? ' OPEN' : ' ' + c.n + '/5'), CX, y - T.cw - 0.2, c.open ? '#4cff8a' : '#aab4be', 7);
    });
    // the Arch over the centre Crossing, a hang bar on each bank
    [-1, 1].forEach(sd => { const x = CX + sd * (T.rx + 0.3); line(ctx, s, x, CY - 0.95, x, CY + 0.95, '#0f1215', Math.max(3, 0.16 * s)); line(ctx, s, x, CY - 0.95, x, CY + 0.95, '#e8edf2', Math.max(2, 0.07 * s)); });
    text(ctx, s, 'ARCH', CX, CY + T.cw + 0.22, '#e8edf2', 7);
    ['blue', 'red'].forEach(a => {
      const ss = m && m.ss ? m.ss[a] : null;
      aline(ctx, s, sym, a, T.line, 0.06, T.line, FH - 0.06, TAPE, 1.5);
      // Home Dock on the alliance wall
      arect(ctx, s, sym, a, 0.1, CY - 1.0, 0.5, 2.0, '#14171b', alc(a), 2.5);
      atext(ctx, s, sym, a, 'HOME DOCK' + (ss ? ' ' + ss.home : ''), 1.45, CY + 1.22, alc(a), 7);
      if (ss) for (let k = 0; k < Math.min(ss.home, 16); k++) { const p = P(sym, a, 0.24 + (k % 2) * 0.22, CY - 0.82 + Math.floor(k / 2) * 0.235); rect(ctx, s, p.x - 0.09, p.y - 0.09, 0.18, 0.18, CRATE, 'rgba(0,0,0,0.4)', 1); }
      // this alliance's Export Dock, in a far corner on the other bank
      arect(ctx, s, sym, a, FW - 1.9, 0.12, 1.8, 2.0, tint(a, 0.13), tint(a, 0.7), 1.5);
      arect(ctx, s, sym, a, FW - 0.6, T.exp.y - 0.75, 0.5, 1.5, '#14171b', alc(a), 2.5);
      atext(ctx, s, sym, a, (a === 'red' ? 'RED' : 'BLUE') + ' EXPORT' + (ss ? ' ' + ss.exp : ''), FW - 1.25, T.exp.y + 1.2, alc(a), 7);
      if (ss) for (let k = 0; k < Math.min(ss.exp, 12); k++) { const p = P(sym, a, FW - 0.46 + (k % 2) * 0.22, T.exp.y - 0.6 + Math.floor(k / 2) * 0.235); rect(ctx, s, p.x - 0.09, p.y - 0.09, 0.18, 0.18, CRATE, 'rgba(0,0,0,0.4)', 1); }
      // crate chute and panel rack on the alliance wall
      arect(ctx, s, sym, a, 0.1, T.chute.y - 0.45, 0.5, 0.9, '#14171b', alc(a), 2);
      for (let k = 0; k < (ss ? ss.q : 1); k++) { const p = P(sym, a, 0.85 + k * 0.3, T.chute.y); crate(ctx, s, p.x, p.y); }
      atext(ctx, s, sym, a, 'CRATES' + (ss ? ' ' + ss.hp : ''), 1.0, T.chute.y - 0.65, alc(a), 6);
      arect(ctx, s, sym, a, 0.1, T.rack.y - 0.5, 0.5, 1.0, '#14171b', PANEL, 2);
      for (let k = 0; k < (ss ? ss.pq : 1); k++) abar(ctx, s, sym, a, 0.72 + k * 0.2, T.rack.y - 0.4, 0.72 + k * 0.2, T.rack.y + 0.4, PANEL, 0.1);
      atext(ctx, s, sym, a, 'PANELS' + (ss ? ' ' + (ss.panels + ss.pq) : ''), 1.35, T.rack.y + 0.68, PANEL, 6);
    });
    if (m && m.loose) loose(m, p => crate(ctx, s, p.x, p.y));
    else ['blue', 'red'].forEach(a => T.floor.forEach(q => { const p = P(sym, a, q[0], q[1]); crate(ctx, s, p.x, p.y); }));
    // a robot carrying a deck panel shows it across its back
    if (m && m.robots) m.robots.forEach(r => { if (r.mem && r.mem.panel && !r.dead) { ctx.lineCap = 'round'; line(ctx, s, r.x - 0.5, r.y - 0.3, r.x + 0.5, r.y - 0.3, PANEL, Math.max(3, 0.12 * s)); ctx.lineCap = 'butt'; } });
  };
})();
