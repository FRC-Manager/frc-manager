/* FRC Manager — the robots from above, as they play (3.5.5). The match view draws the chassis (draw.js) and asks
   Rd.topMech for the mechanisms: every season draws its own, from the concept built in each subsystem, and they move:
   A.vi: the intake is out (0..1), A.vx: the lift or arm reaches (0..1), A.vc: the climber is out (0..1), A.aim: where
   a turret points. Units: 1 = the robot's width with bumpers; x runs to the robot's front, y to its right. */
(function () {
  'use strict';
  const Rd = G.Render, PI = Math.PI, TAU = PI * 2, CW = Rd.sideKit.CW, TOP = Rd.TOP = {};
  const ALU = '#c5ccd4', ALU2 = '#98a2ad', STEEL = '#e2e7ec', DARK2 = '#3a4149', EDGE = '#6c7682', INK = 'rgba(6,8,11,0.7)', RING = '#2c3138', ROLL = '#3a4149';
  const SMOKE = 'rgba(30,35,42,0.72)', GLASS = 'rgba(170,196,222,0.2)', GLASSL = 'rgba(206,222,238,0.6)';

  function Kit(ctx, sz, env) {
    const u = sz, px = Math.max(1, sz / 58), k = Object.assign({ ctx, sz, px }, env);
    const fin = (fill, stroke, lw) => { if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = (lw || 1) * px; ctx.stroke(); } };
    const trace = pts => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0] * u, p[1] * u) : ctx.moveTo(p[0] * u, p[1] * u))); };
    k.rect = (x, y, w, h, fill, stroke, r) => { ctx.beginPath(); if (r) ctx.roundRect(x * u, y * u, w * u, h * u, r * u); else ctx.rect(x * u, y * u, w * u, h * u); fin(fill, stroke); };
    k.circ = (x, y, r, fill, stroke, lw) => { ctx.beginPath(); ctx.arc(x * u, y * u, r * u, 0, TAU); fin(fill, stroke, lw); };
    k.poly = (pts, fill, stroke) => { trace(pts); ctx.closePath(); fin(fill, stroke); };
    k.line = (pts, col, w, cap) => { trace(pts); ctx.strokeStyle = col; ctx.lineWidth = Math.max(px, w * u); ctx.lineCap = cap || 'butt'; ctx.lineJoin = 'round'; ctx.stroke(); };
    k.tube = (x1, y1, x2, y2, w, col) => { k.line([[x1, y1], [x2, y2]], INK, w + 2 * px / u); k.line([[x1, y1], [x2, y2]], col, w); };
    k.arc = (x, y, r, a0, a1, w, col) => { ctx.beginPath(); ctx.arc(x * u, y * u, r * u, a0, a1); ctx.strokeStyle = col; ctx.lineWidth = Math.max(px, w * u); ctx.lineCap = 'round'; ctx.stroke(); };
    // a roller lying across the robot at x: a shaft with wheels along it. hw: half its length; y0: its middle
    k.roller = (x, hw, r, wc, n, y0) => { const c = y0 || 0; n = n || Math.max(2, Math.round(hw / 0.075)); k.rect(x - r * 0.4, c - hw, r * 0.8, 2 * hw, '#191c20', null); const st = 2 * hw / n; for (let i = 0; i < n; i++) k.rect(x - r, c - hw + (i + 0.19) * st, 2 * r, st * 0.62, wc, INK, r * 0.5); };
    k.at = (x, y, ang, fn) => { ctx.save(); ctx.translate(x * u, y * u); ctx.rotate(ang); fn(k); ctx.restore(); };
    return k;
  }

  // ---------------------------------------------------------------- shared parts
  // an intake that reaches over the front bumper. ext 0..1; hw: half its width; o.rows, o.wc, o.wc2, o.reach, o.guard
  function intake(k, ext, hw, o) {
    o = o || {}; const rows = o.rows || 1, r = o.r || 0.034, x = 0.5 + r * 0.6 + ext * (o.reach || 0.13);
    [-1, 1].forEach(s => k.tube(0.3, s * (hw - 0.035), x, s * (hw - 0.035), 0.035, o.arm || DARK2));
    if (o.guard) k.rect(x - rows * r * 2.3, -hw, rows * r * 2.3, 2 * hw, GLASS, null);
    for (let i = rows - 1; i >= 0; i--) k.roller(x - i * r * 2.3, hw, r * (i ? 0.85 : 1), i % 2 ? (o.wc2 || o.wc) : o.wc, o.n);
  }
  // an elevator: two uprights and the tube that joins them
  function mast(k, x, hw, col) { k.tube(x - 0.05, -hw, x - 0.05, hw, 0.03, DARK2); [-1, 1].forEach(s => k.rect(x - 0.05, s * hw - 0.045, 0.1, 0.09, col, INK, 0.012)); }
  // the two uprights of an A-frame, and the arm between them
  function tower(k, x, col) { [-1, 1].forEach(s => k.rect(x - 0.05, s * 0.13 - 0.04, 0.1, 0.08, col, INK, 0.012)); }
  // a flywheel shooter facing +x: side plates, the wheels on their shaft, the hood behind. o.n wheels; o.hood 1 fixed, 2 adjustable; o.flat: a wide hood
  function shooter(k, hw, o) {
    o = o || {}; const n = o.n || 2, st = (2 * hw - 0.05) / n;
    if (o.flat) k.rect(-0.155, -hw - 0.012, 0.05, 2 * hw + 0.024, o.hood === 2 ? k.c2 : ALU, INK, 0.012);                // a hood over several balls abreast: flat from above
    else k.arc(0.03, 0, hw * 1.04, PI * 0.63, PI * 1.37, 0.04, o.hood === 2 ? k.c2 : ALU);
    [-1, 1].forEach(s => k.rect(-0.1, s * hw - 0.018, 0.22, 0.036, DARK2, EDGE));
    k.line([[0.02, -hw], [0.02, hw]], ALU2, 0.022);
    for (let i = 0; i < n; i++) { const y = -hw + 0.025 + i * st + st * 0.14; k.rect(-0.04, y, 0.12, st * 0.72, '#191c20', EDGE, 0.015); k.rect(0.005, y, 0.03, st * 0.72, k.c2, null); }
  }
  const turret = (k, x, y, r) => k.circ(x, y, r, RING, k.c2, 1.6);
  // telescoping climbers: a tube each side with its hook; out: how far the hooks reach when it climbs; two: a second pair
  function teles(k, x, hw, out, col, two) { [-1, 1].forEach(s => { if (two) k.line([[x + 0.1, s * (hw - 0.07)], [x + 0.02 - out * 0.1, s * (hw - 0.07)]], k.c2, 0.028, 'round'); k.line([[x, s * hw], [x - 0.07 - out * 0.16, s * hw]], k.c2, 0.036, 'round'); k.rect(x - 0.04, s * hw - 0.04, 0.08, 0.08, col, INK, 0.012); }); }
  // a hopper: walls, a net, and the balls in it (filling from the back)
  function hopper(k, x0, x1, hw, A) {
    const r = A.r, cap = Math.max(1, (r.cap && r.cap.storage) || k.lk.hopper || 1), fill = Math.min(1, (r.held || 0) / cap), pc = Rd.PIECES[r.heldType];
    k.rect(x0, -hw, x1 - x0, 2 * hw, 'rgba(0,0,0,0.38)', null);
    if (fill > 0) k.rect(x0, -hw, (x1 - x0) * fill, 2 * hw, (pc && pc.col) || Rd.COL.fuel, null);
    for (let i = 1; i < 4; i++) k.line([[x0 + (x1 - x0) * i / 4, -hw], [x0 + (x1 - x0) * i / 4, hw]], 'rgba(20,24,28,0.55)', 0.012);
    k.rect(x0, -hw, x1 - x0, 2 * hw, null, ALU2, 0.01);
  }
  const hookMark = (k, x, y, a) => k.arc(x, y, 0.05, a, a + PI * 1.25, 0.032, k.c2);

  // ---------------------------------------------------------------- the seasons
  TOP[2016] = function (k, c, A) {
    const it = c.intake, sh = c.scorer, c1 = k.c1;
    [-1, 1].forEach(s => k.tube(-0.38, s * 0.3, 0.3, s * 0.3, 0.045, c1));                                                // the side plates over the wheels
    if (c.endgame === 'scale') { k.tube(-0.4, -0.39, 0.12, -0.39, 0.035, ALU); k.line([[-0.4, -0.39], [-0.46 - 0.14 * A.vc, -0.39]], k.c2, 0.04, 'round'); }
    if (sh === 'low') k.rect(0.0, -0.18, 0.32, 0.36, SMOKE, GLASSL, 0.03);
    else if (sh === 'turret') { turret(k, -0.08, 0, 0.27); k.at(-0.08, 0, A.aim, q => shooter(q, 0.16, { hood: 2 })); }
    else if (sh) k.at(-0.1, 0, 0, q => shooter(q, 0.17, { hood: sh === 'hood' ? 2 : 1 }));
    if (it === 'fixed') k.roller(0.46, 0.3, 0.034, CW.g);
    else if (it) { intake(k, A.vi, 0.34, { wc: CW.g, arm: c1, reach: 0.17 }); if (it === 'hook') [-1, 1].forEach(s => hookMark(k, 0.56 + A.vi * 0.17, s * 0.39, s > 0 ? -PI / 2 : PI * 0.25)); }
    return { at: sh === 'turret' ? [-0.08, 0] : sh && sh !== 'low' ? [-0.02, 0] : [0.16, 0], tur: sh === 'turret' ? [-0.08, 0] : null, sh: sh === 'low' ? [0.3, 0] : sh ? [-0.1, 0] : null };
  };
  TOP[2017] = function (k, c, A) {
    const gear = c.scorer, fuel = c.fuel, has = fuel && fuel !== 'none', c1 = k.c1;
    if (fuel === 'dualturret') {                                                       // (3.5.6) an intake at each end, the feeder's rings in the middle of the hopper, the turret over them
      const bar = q => intake(q, A.vi, 0.44, { rows: 2, wc: '#23272c', wc2: CW.b, guard: 1 }); bar(k); k.at(0, 0, PI, bar);
      hopper(k, -0.38, 0.38, 0.39, A); k.circ(0, 0, 0.27, null, c1, 1.3); [-1, 1].forEach(s => { k.tube(-0.38, s * 0.38, -0.12, s * 0.12, 0.03, c1); k.tube(0.38, s * 0.38, 0.12, s * 0.12, 0.03, c1); });
      turret(k, 0, 0, 0.18); k.at(0, 0, A.aim, q => shooter(q, 0.09, { n: 2, hood: 2 }));
    }
    else if (has) { hopper(k, -0.38, 0.2, fuel === 'mega' ? 0.39 : 0.33, A); if (fuel === 'dump') k.roller(-0.41, 0.2, 0.03, CW.g); else k.at(-0.32, 0, 0, q => shooter(q, fuel === 'mega' ? 0.27 : 0.15, { n: fuel === 'mega' ? 4 : 2, flat: 1 })); }
    if (gear === 'floor') intake(k, A.vi, 0.2, { wc: CW.o, reach: 0.1 });
    if (gear) { k.rect(0.3, -0.19, 0.15, 0.38, GLASS, GLASSL, 0.02); k.line([[0.37, -0.14], [0.37, 0.14]], 'rgba(8,10,13,0.65)', 0.035); if (gear === 'active') [-1, 1].forEach(s => k.line([[0.4, s * 0.16], [0.48, s * 0.1]], k.c2, 0.03, 'round')); }   // the gear pocket
    if (c.endgame && c.endgame !== 'none') { k.rect(0.02, 0.24, 0.17, 0.14, c1, INK, 0.012); k.roller(0.105, 0.055, 0.04, c.endgame === 'fast' ? k.c2 : '#d3b24a', 2, 0.31); }   // the rope drum
    if (fuel === 'dualturret') return { own: true, tur: [0, 0], dir: 0 };
    return has ? { own: true, sh: fuel === 'dump' ? [-0.41, 0] : [-0.32, 0], dir: fuel === 'dump' ? PI : 0 } : { at: [0.375, 0] };
  };
  TOP[2018] = function (k, c, A) {
    const lift = c.scorer, eff = c.effector, it = c.intake, end = c.endgame, c1 = k.c1; let tip = 0.12;
    if (end === 'buddy') [-1, 1].forEach(s => k.tube(-0.4, s * 0.3, -0.47 - 0.5 * A.vc, s * 0.3, 0.04, ALU));               // forks drop behind for a partner
    if (lift === 'elev' || lift === 'elevfast') { [-1, 1].forEach(s => k.tube(-0.38, s * 0.3, 0.05, s * 0.2, 0.03, c1)); mast(k, 0.1, 0.2, c1); tip = 0.16 + 0.1 * A.vx; }
    else if (lift === 'low') { tower(k, -0.16, c1); tip = 0.2 + 0.14 * A.vx; k.tube(-0.16, 0, tip, 0, 0.06, c1); }
    else if (lift === 'dja') { tower(k, 0.02, c1); tip = 0.16 + 0.22 * A.vx; k.tube(0.02, 0.035, -0.28, 0.035, 0.06, '#2b3036'); k.tube(-0.28, -0.03, tip, -0.03, 0.045, '#2b3036'); k.circ(-0.28, 0, 0.05, ALU2, INK); }   // (3.5.6) the lower tube runs back to the elbow, the upper one forward over it
    const pv = lift === 'low' ? -0.16 : lift === 'dja' ? 0.02 : 0.1, fl = eff === 'flip' ? Math.cos(PI * ((A.r && A.r.vf) || 0)) : 1;   // (3.5.6) a flipping claw goes over the lift (pv): from above it draws in to the lift and comes out behind
    if (it === 'wheeled' || it === 'wide') [-1, 1].forEach(s => { const x = 0.53 + A.vi * (it === 'wide' ? 0.15 : 0.09); k.tube(0.36, s * 0.34, x, s * 0.31, 0.035, DARK2); k.circ(x, s * 0.31, 0.045, CW.g, INK); if (it === 'wide') k.circ(x - 0.1, s * 0.33, 0.036, CW.g, INK); });
    if (eff) { const open = A.held ? 0.15 : 0.21, x1 = tip + 0.3, pinch = eff === 'pinch', cx2 = k.ctx; cx2.save(); if (fl !== 1) { cx2.translate(pv * k.sz, 0); cx2.scale(Math.abs(fl) < 0.08 ? 0.08 : fl, 1); cx2.translate(-pv * k.sz, 0); }
      k.rect(tip - 0.03, -0.1, 0.07, 0.2, DARK2, EDGE, 0.012);
      [-1, 1].forEach(s => { k.tube(tip, s * 0.08, x1, s * open, pinch ? 0.03 : 0.04, pinch ? ALU2 : DARK2); if (!pinch) { k.circ(x1, s * open, 0.042, CW.g, INK); k.circ(x1 - 0.12, s * (open - 0.03), 0.036, CW.g, INK); } });
      if (eff === 'launch' || eff === 'flip') k.rect(tip + 0.04, -0.04, 0.05, 0.08, k.c2, null); if (eff === 'flip') k.circ(tip, 0, 0.05, '#b9a56c', INK); cx2.restore(); }
    if (end && end !== 'none') hookMark(k, lift === 'low' || lift === 'dja' ? -0.3 : 0.05, lift === 'dja' ? 0.3 : 0, PI * 0.4);
    return { at: [pv + (tip + 0.2 - pv) * fl, 0] };
  };
  TOP[2019] = function (k, c, A) {
    const lift = c.scorer, eff = c.effector, it = c.intake, end = c.endgame, c1 = k.c1; let tip = 0.3, ang = 0;
    if (end === 'l3buddy' || end === 'l3triple') { k.rect(-0.3, 0.48, 0.52, 0.06 + 0.3 * A.vc, ALU2, INK, 0.012); if (end === 'l3triple') k.rect(-0.3, -0.54 - 0.3 * A.vc, 0.52, 0.06 + 0.3 * A.vc, ALU2, INK, 0.012); }   // ramps fold out for partners
    if (it === 'ground' || it === 'floor') intake(k, A.vi, 0.3, { wc: CW.g, reach: 0.12 });
    if (it === 'floor') [-1, 1].forEach(s => k.line([[0.5, s * 0.12], [0.57 + A.vi * 0.16, s * 0.12]], ALU2, 0.028));
    if (lift === 'turretlift') { ang = A.aim; tip = 0.2 + 0.2 * A.vx; turret(k, 0, 0, 0.3); k.at(0, 0, ang, q => { mast(q, -0.04, 0.16, c1); q.tube(0, 0, tip, 0, 0.05, ALU); }); }
    else if (lift === 'elev' || lift === 'elevfast') { [-1, 1].forEach(s => k.tube(-0.32, s * 0.3, 0.07, s * 0.2, 0.03, c1)); mast(k, 0.12, 0.2, c1); tip = 0.2 + 0.13 * A.vx; if (lift === 'elevfast') k.tube(0.12, 0, tip, 0, 0.045, ALU); }
    else if (lift === 'arm') { tower(k, -0.1, c1); tip = 0.24 + 0.15 * A.vx; k.tube(-0.1, 0, tip, 0, 0.055, c1); }
    if (eff) k.at(0, 0, ang, q => { [-1, 1].forEach(s => q.line([[tip, s * 0.06], [tip + 0.06, s * 0.06]], ALU2, 0.028)); q.rect(tip + 0.055, -0.17, 0.035, 0.34, eff === 'plate' ? '#d8dde2' : DARK2, INK);
      if (eff !== 'plate') q.roller(tip + 0.15, 0.13, 0.03, CW.g, 3); if (eff === 'active') q.poly([[tip + 0.09, -0.045], [tip + 0.18, 0], [tip + 0.09, 0.045]], q.c2, INK); });
    if (end === 'suction') { const bx = lift === 'turretlift' ? -0.12 : lift === 'elev' || lift === 'elevfast' ? 0.03 : -0.3, x1 = bx - 0.07 - 0.6 * A.vc;   // (3.5.6) on the back of the elevator, in the middle: the arm swings out behind and sets its pad on Level 3
      k.tube(bx, 0, x1, 0, 0.05, c1); if (A.vc > 0.3) k.rect(bx + (x1 - bx) * 0.62 - 0.03, -0.04, 0.06, 0.08, '#15181c', EDGE, 0.01);   // (its kickstand, down on the platform's edge)
      k.rect(x1 - 0.12, -0.13, 0.14, 0.26, '#23272c', ALU2, 0.02); k.rect(x1 - 0.105, -0.11, 0.11, 0.22, '#0d0f12', null, 0.015); }
    else if (end === 'l2') [[-0.36, -0.3], [-0.36, 0.3], [0.3, -0.3], [0.3, 0.3]].forEach(p => k.circ(p[0], p[1], 0.042, '#aab3bc', INK));
    else if (end && end !== 'none') [[-0.38, -0.31], [-0.38, 0.31], [0.26, -0.33], [0.26, 0.33]].forEach(p => k.rect(p[0] - 0.04, p[1] - 0.04, 0.08, 0.08, ALU, INK, 0.01));   // the stilts
    return { at: [Math.cos(ang) * (tip + 0.15), Math.sin(ang) * (tip + 0.15)], tur: lift === 'turretlift' ? [0, 0] : null };
  };
  TOP[2020] = function (k, c, A) {
    const it = c.intake, sh = c.scorer, end = c.endgame, c1 = k.c1, r = A.r, pc = Rd.PIECES[r.heldType] || Rd.PIECES.cell, col = (pc && pc.col) || Rd.COL.fuel, rev = it === 'revolver';
    if (it === 'over') intake(k, A.vi, 0.33, { wc: ROLL, n: 6 }); else if (it === 'wide' || rev) intake(k, A.vi, 0.46, { rows: 3, r: 0.028, wc: ROLL, n: 8, guard: 1 });
    if (end === 'buddy') { const x = -0.47 - 0.12 * A.vc; k.tube(x, -0.2, x, 0.2, 0.035, c1); }
    if (rev) {                                                                                                               // the revolver: five pockets round a hub
      const rx = 0.2, R0 = 0.25, n = Math.min(5, A.held);
      k.circ(rx, 0, R0, RING, k.c2, 1.5); for (let i = 0; i < 5; i++) { const g = (i + 0.5) * TAU / 5; k.line([[rx + Math.cos(g) * R0 * 0.25, Math.sin(g) * R0 * 0.25], [rx + Math.cos(g) * R0, Math.sin(g) * R0]], '#69737d', 0.014); }
      k.circ(rx, 0, R0 * 0.22, ALU2, null); for (let i = 0; i < 5; i++) { const g = i * TAU / 5; k.circ(rx + Math.cos(g) * 0.155, Math.sin(g) * 0.155, 0.07, i < n ? col : null, i < n ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.14)'); }
    } else if (it) { k.rect(-0.2, -0.14, 0.58, 0.28, SMOKE, EDGE, 0.02); [-1, 1].forEach(s => k.line([[-0.18, s * 0.1], [0.36, s * 0.1]], '#5b646e', 0.02)); for (let i = 0; i < Math.min(5, A.held); i++) k.circ(0.3 - i * 0.115, 0, 0.062, col, 'rgba(0,0,0,0.4)'); }   // cells queue on the belts
    if (sh === 'dump') { k.rect(-0.46, -0.16, 0.26, 0.32, SMOKE, EDGE, 0.02); k.roller(-0.43, 0.14, 0.03, CW.g, 3); }
    else if (sh === 'turret') { turret(k, -0.22, 0, 0.22); k.at(-0.22, 0, A.aim, q => shooter(q, 0.13, { hood: 2 })); }
    else if (sh === 'long' && k.lk.frame !== 'low') { k.rect(-0.43, -0.21, 0.54, 0.42, GLASS, GLASSL, 0.02); k.rect(-0.47, -0.2, 0.045, 0.4, k.c2, INK, 0.012); k.rect(-0.41, -0.06, 0.5, 0.12, '#191c20', EDGE, 0.04); k.rect(-0.41, -0.06, 0.5, 0.03, CW.o, null); k.line([[-0.16, -0.19], [-0.16, 0.19]], ALU2, 0.024); }   // (3.5.6) the big wheel, edge on, in its tall frame
    else if (sh) k.at(-0.28, 0, 0, q => shooter(q, 0.15, { hood: sh === 'hood' || sh === 'long' ? 2 : 1 }));
    if (c.panel === 'spin' || c.panel === 'color') { k.circ(0.27, -0.31, 0.062, CW.g, INK); k.circ(0.27, -0.31, 0.02, RING, null); }
    if (end && end !== 'none') { if (end === 'level') k.tube(-0.08, 0.31, 0.14, 0.31, 0.03, DARK2); k.rect(-0.015, 0.265, 0.09, 0.09, c1, INK, 0.012); hookMark(k, 0.03, 0.31, PI * 0.4); }
    return { own: true, tur: sh === 'turret' ? [-0.22, 0] : null, sh: sh === 'dump' ? [-0.43, 0] : sh ? [-0.28, 0] : null, dir: sh === 'dump' ? PI : 0 };
  };
  TOP[2022] = function (k, c, A) {
    const it = c.intake, sh = c.scorer, end = c.endgame, c1 = k.c1, dual = it === 'dual', sx = dual ? 0 : -0.08, fx = dual ? 0 : -0.12;   // an intake at each end: the shooter sits in the middle
    const bar = q => intake(q, A.vi, 0.36, it === 'pivot' ? { wc: CW.b, wc2: CW.k, rows: 2 } : { wc: CW.g, wc2: CW.k, rows: 2 });
    if (it === 'over' || it === 'pivot' || it === 'dual') bar(k); if (it === 'dual') k.at(0, 0, PI, bar);
    if (end === 'trav') [-1, 1].forEach(s => {                                          // an arm each side turns end over end: seen from above it only grows and shrinks
      const th = (38 + A.vc * 200) * PI / 180, L = 0.05 + 0.42 * Math.abs(Math.cos(th)), y = s * 0.43;
      k.tube(-0.22 - L, y, -0.22 + L, y, 0.04, ALU); k.circ(-0.22 - L, y, 0.032, k.c2, INK); k.circ(-0.22 + L, y, 0.032, k.c2, INK); k.circ(-0.22, y, 0.046, '#b9a56c', INK);
    });
    else if (end === 'direct') k.at(dual ? 0 : -0.02, 0, PI / 2, q => {                // across the robot, at a right angle to the intakes: the elevator along one side, its reaction bar outside it, a long arm that leans out over the other side
      const bx = 0.46 + 0.18 * A.vc, x1 = 0.44 + 0.22 * A.vc;
      [-1, 1].forEach(s => q.tube(0.36, s * 0.2, bx, s * 0.2, 0.026, c1)); q.tube(bx, -0.34, bx, 0.34, 0.04, c1);
      mast(q, 0.36, 0.165, c1); [-1, 1].forEach(s => q.line([[0.3, s * 0.165], [0.42, s * 0.165]], '#eef1f4', 0.026, 'round'));
      q.tube(-0.32, 0, -x1, 0, 0.04, DARK2); q.circ(-x1, 0, 0.03, '#eef1f4', INK); q.rect(-0.37, -0.04, 0.08, 0.08, c1, INK, 0.012);
    });
    else if (end && end !== 'none') teles(k, -0.41, 0.33, A.vc, c1, end === 'high');
    if (dual) k.rect(-0.32, -0.15, 0.64, 0.3, SMOKE, EDGE, 0.02); else if (it) k.rect(-0.1, -0.15, 0.42, 0.3, SMOKE, EDGE, 0.02);
    if (sh === 'dump') { k.rect(-0.44, -0.25, 0.38, 0.5, '#3b424a', ALU2, 0.03); k.rect(-0.39, -0.2, 0.28, 0.4, '#23282e', null, 0.02); }
    else if (sh === 'turret') { turret(k, sx, 0, 0.27); k.at(sx, 0, A.aim, q => shooter(q, 0.16, { hood: 2 })); }
    else if (sh) k.at(fx, 0, 0, q => shooter(q, 0.18, { hood: sh === 'hood' ? 2 : 1 }));
    return { at: sh === 'dump' ? [-0.25, 0] : [sx + 0.2, 0], tur: sh === 'turret' ? [sx, 0] : null, sh: sh === 'dump' ? [-0.25, 0] : sh ? [fx, 0] : null, dir: sh === 'dump' ? PI : 0 };
  };
  TOP[2023] = function (k, c, A) {
    const lift = c.scorer, eff = c.effector, it = c.intake, c1 = k.c1, vx = A.vx; let tip = 0.3;
    if (it === 'gcube' || it === 'gall') intake(k, A.vi, 0.34, it === 'gall' ? { wc: CW.g, wc2: CW.o, rows: 2, guard: 1 } : { wc: CW.g });
    if (lift === 'sja') { tower(k, -0.14, c1); tip = 0.28 + 0.4 * vx; k.tube(-0.14, 0, tip, 0, 0.06, c1); }
    else if (lift === 'elev') { [-1, 1].forEach(s => k.tube(-0.38, s * 0.17, 0.34, s * 0.17, 0.05, c1)); tip = 0.08 + 0.42 * vx; k.rect(tip - 0.13, -0.2, 0.13, 0.4, DARK2, EDGE, 0.012); }   // the leaning elevator: its rails run the length of the robot
    else if (lift === 'elevw') { mast(k, -0.28, 0.2, c1); tip = 0.24 + 0.5 * vx; k.tube(-0.28, 0, 0.1, 0, 0.078, '#2b3036'); k.tube(-0.12, 0, 0.13 + 0.25 * vx, 0, 0.058, '#3a4149'); k.tube(0.0, 0, tip, 0, 0.04, '#59626c'); }   // (3.5.6) the escalator's three stages
    else if (lift === 'dja') { tower(k, -0.18, c1); tip = 0.02 + 0.68 * vx; const e = 0.22 + 0.12 * vx; k.tube(-0.18, 0.045, e, 0.045, 0.055, c1); k.tube(e, -0.035, tip, -0.035, 0.045, ALU); k.circ(e, 0.005, 0.04, EDGE, INK); }
    else if (lift === 'tele') { k.rect(-0.43, -0.2, 0.19, 0.4, '#2f353c', EDGE, 0.02); tip = 0.3 + 0.5 * vx; k.tube(-0.3, 0, 0.26, 0, 0.09, c1); k.tube(0.0, 0, tip, 0, 0.055, ALU); }
    if (eff) { const y = lift === 'dja' ? -0.035 : 0, open = A.held ? 0.09 : 0.15;
      if (eff === 'claw') [-1, 1].forEach(s => k.line([[tip, y + s * 0.04], [tip + 0.08, y + s * open], [tip + 0.2, y + s * open * 0.9]], ALU2, 0.035, 'round'));
      else { k.rect(tip, y - 0.14, 0.16, 0.28, DARK2, EDGE, 0.02); k.roller(tip + 0.135, 0.12, 0.03, CW.g, 3, y); if (eff === 'wrist') k.line([[tip + 0.01, y - 0.13], [tip + 0.01, y + 0.13]], k.c2, 0.022); } }
    return { at: [tip + 0.14, lift === 'dja' ? -0.035 : 0] };
  };
  TOP[2024] = function (k, c, A) {
    const it = c.intake, sh = c.scorer, amp = c.amp, end = c.endgame, c1 = k.c1;
    // the shooter is a box of wheels that throws the note out of its far end (it points back over the robot)
    const box = (q, L, hw) => { q.rect(-L, -hw, L + 0.1, 2 * hw, DARK2, EDGE, 0.02); q.roller(-L + 0.07, hw - 0.03, 0.036, q.c2, 2); q.roller(-L * 0.42, hw - 0.04, 0.024, CW.o, 3); };
    if (it === 'otb') intake(k, A.vi, 0.36, { rows: 3, r: 0.025, wc: CW.o, wc2: CW.k, n: 7, guard: 1, reach: 0.1 });
    else if (it === 'utb') { k.rect(0.385, -0.31, 0.12, 0.62, '#15181b', null); k.roller(0.45, 0.29, 0.026, CW.o, 6); k.roller(0.39, 0.29, 0.02, CW.k, 6); }   // rollers under the front bumper
    else if (it === 'src') k.rect(0.04, -0.2, 0.34, 0.4, GLASS, GLASSL, 0.02);
    if (end && end !== 'none') teles(k, -0.41, 0.35, A.vc, c1, end === 'chaintrap');
    if (sh === 'turret') { turret(k, -0.04, 0, 0.3); k.at(-0.04, 0, A.aim + PI, q => box(q, 0.26, 0.15)); }
    else if (sh) k.at(0.08, 0, 0, q => box(q, sh === 'pivot' ? 0.44 : 0.36, 0.19));
    if (amp === 'ampbar') { const x = -0.38 - 0.1 * A.vx; k.tube(x, -0.2, x, 0.2, 0.03, ALU); }
    else if (amp === 'amptrap') { mast(k, 0.24, 0.15, c1); k.roller(0.3 + 0.1 * A.vx, 0.1, 0.03, CW.o, 2); }
    return { at: sh === 'turret' ? [-0.04, 0] : [-0.02, 0], tur: sh === 'turret' ? [-0.04, 0] : null, sh: sh ? [sh === 'pivot' ? -0.36 : -0.28, 0] : null, dir: PI };   // the shooter, and its camera, point back
  };
  TOP[2025] = function (k, c, A) {
    const lift = c.scorer, eff = c.effector, alg = c.algae, end = c.endgame, it = c.intake, c1 = k.c1, vx = A.vx, out = {}; let hx = 0.22;
    const onArm = lift === 'tele' && (end === 'deep' || end === 'shallow');           // a telescope on a pivot carries the climber on the back of its first stage, in the middle of the robot
    if (onArm) { /* drawn with the telescope, below */ }
    else if (end === 'deep') { const y = -0.4 - 0.28 * A.vc; k.tube(-0.28, -0.3, -0.28, y, 0.045, c1); k.circ(-0.335, y, 0.042, CW.b, INK); k.circ(-0.225, y, 0.042, CW.b, INK); }   // the arm that swings out and grips the cage
    else if (end === 'shallow') hookMark(k, -0.42, -0.32, 0);
    if (it === 'ground') intake(k, A.vi, 0.3, { wc: ROLL, rows: 2, n: 5 });
    if (eff && lift !== 'trough' && lift !== 'tele') k.poly([[-0.46, -0.3], [-0.16, -0.2], [-0.16, 0.2], [-0.46, 0.3]], SMOKE, ALU2);   // the funnel coral drops into
    if (lift === 'elev' || lift === 'elevw') { [-1, 1].forEach(s => k.tube(-0.36, s * 0.3, -0.07, s * 0.2, 0.03, c1)); mast(k, -0.02, 0.2, c1); hx = (lift === 'elevw' ? 0.16 : 0.08) + 0.24 * vx; if (lift === 'elevw') k.tube(-0.02, 0, hx, 0, 0.045, ALU); }
    else if (lift === 'arm') { tower(k, -0.14, c1); hx = 0.3 + 0.14 * vx; k.tube(-0.14, 0, hx, 0, 0.055, c1); }
    else if (lift === 'tele') { k.rect(-0.44, -0.2, 0.2, 0.4, '#2f353c', EDGE, 0.02); hx = 0.28 + 0.5 * vx; k.tube(-0.3, 0, 0.24, 0, 0.09, c1); k.tube(0.0, 0, hx, 0, 0.055, ALU);
      if (onArm && end === 'deep') { const x = -0.2 - 0.16 * A.vc; k.rect(x - 0.1, -0.115, 0.2, 0.23, DARK2, EDGE, 0.02); k.circ(x + 0.02, 0, 0.05, '#59626c', INK); [-1, 1].forEach(s => k.circ(x - 0.045, s * 0.068, 0.04, CW.b, INK)); k.line([[x - 0.1, -0.06], [x - 0.1, 0.06]], k.c2, 0.024, 'round'); }   // the claw swings back and down with the arm to take the cage
      else if (onArm) { const x = -0.08 - 0.2 * A.vc; k.rect(x - 0.04, -0.045, 0.1, 0.09, DARK2, EDGE, 0.015); hookMark(k, x - 0.03, 0, PI * 0.4); } }
    else if (lift === 'trough') { k.rect(-0.36, -0.15, 0.82, 0.3, GLASS, GLASSL, 0.02); hx = 0.3;                           // the ramp, and over its low end the roller that pushes the coral out
      if (eff) { [-1, 1].forEach(s => k.rect(0.3, s * 0.165 - 0.016, 0.14, 0.032, DARK2, EDGE)); if (eff === 'chute') { k.rect(0.358, -0.15, 0.024, 0.3, '#191c20', null); k.rect(0.334, -0.128, 0.072, 0.256, '#2b3036', INK, 0.02); k.line([[0.356, -0.11], [0.356, 0.11]], 'rgba(255,255,255,0.2)', 0.01); } else { k.roller(0.33, 0.14, 0.024, CW.b, 3); k.roller(0.4, 0.14, 0.024, CW.b, 3); } } }
    if (eff && lift !== 'trough') { k.rect(hx, -0.12, 0.14, 0.24, DARK2, EDGE, 0.02); if (eff !== 'chute') { k.roller(hx + 0.04, 0.1, 0.022, CW.b, 2); k.roller(hx + 0.105, 0.1, 0.022, CW.b, 2); } if (eff === 'pivot') k.line([[hx + 0.01, -0.11], [hx + 0.01, 0.11]], k.c2, 0.022); }
    if (alg === 'net') { out.algae = [-0.25, 0.27]; k.rect(-0.42, 0.18, 0.34, 0.17, DARK2, EDGE, 0.02); [0.215, 0.315].forEach(y => k.line([[-0.4, y], [-0.1, y]], k.c2, 0.032)); }
    else if (alg === 'proc') { out.algae = [-0.31, 0.27]; k.rect(-0.42, 0.18, 0.23, 0.18, DARK2, EDGE, 0.02); k.line([[-0.42, 0.27], [-0.19, 0.27]], CW.g, 0.036); }
    out.at = [hx + 0.07, 0]; if (alg === 'net') out.sh = [-0.25, 0.27]; if (lift !== 'tele') out.load = PI; return out;   // the funnel (and the kit robot's ramp) take coral at the back
  };
  TOP[2026] = function (k, c, A) {
    const hop = c.hopper, sh = c.scorer, it = c.intake, end = c.endgame, c1 = k.c1, mid = sh === 'rotor';
    if (it === 'ground') intake(k, A.vi, 0.3, { wc: CW.g }); else if (it === 'wide') intake(k, A.vi, 0.47, { rows: 2, wc: CW.b, wc2: CW.k, guard: 1 });
    else if (it === 'slide') { [-1, 1].forEach(s => k.tube(0.1, s * 0.3, 0.52 + A.vi * 0.2, s * 0.3, 0.03, ALU)); intake(k, A.vi, 0.44, { rows: 2, wc: CW.g, wc2: CW.k, reach: 0.2 }); }
    if (hop) hopper(k, mid ? -0.39 : sh === 'turret' ? -0.12 : -0.08, 0.42, Math.max(mid ? 0.36 : 0, hop === 'small' ? 0.24 : hop === 'med' ? 0.32 : 0.39), A);
    if (end && end !== 'none') teles(k, -0.42, 0.38, A.vc, c1, end === 'l3');
    if (mid) {                                                                         // the rotor fills the middle of the hopper; the turret rides over its centre
      k.circ(0, 0, 0.3, 'rgba(35,39,44,0.8)', k.c2, 1.4); for (let i = 0; i < 8; i++) { const g = i * PI / 4 + 0.2; k.line([[Math.cos(g) * 0.1, Math.sin(g) * 0.1], [Math.cos(g) * 0.29, Math.sin(g) * 0.29]], '#69737d', 0.014); }
      [-1, 1].forEach(s => { k.tube(-0.38, s * 0.38, -0.11, s * 0.11, 0.03, c1); k.tube(0.38, s * 0.38, 0.11, s * 0.11, 0.03, c1); });   // the frame that holds the turret
      turret(k, 0, 0, 0.17); k.at(0, 0, A.aim, q => shooter(q, 0.085, { n: 1, hood: 2 }));
    } else if (sh === 'turret') { turret(k, -0.24, 0.23, 0.16); k.at(-0.24, 0.23, A.aim, q => shooter(q, 0.08, { n: 1, hood: 2 })); }   // on a back corner: the hopper keeps the rest
    else if (sh === 'dumper') k.at(-0.33, 0, PI, q => shooter(q, 0.39, { n: 4, hood: 2, flat: 1 }));                    // (3.5.6) it throws over its back, away from the intake
    else if (sh) k.at(-0.28, 0, 0, q => shooter(q, 0.17, { hood: sh === 'hood' ? 2 : 1, flat: 1 }));
    return { own: !!hop, tur: mid ? [0, 0] : sh === 'turret' ? [-0.24, 0.23] : null, sh: sh === 'dumper' ? [-0.33, 0] : sh ? [-0.28, 0] : null, dir: sh === 'dumper' ? PI : 0 };
  };

  // A robot showing its moves on its own (the Garage, the robot viewer): twelve seconds in which it collects, carries,
  // scores, collects again and climbs. demoPiece: what it carries meanwhile, by season
  Rd.demoPhase = t => ({ carry: t > 2.4 && t < 6.4, score: t > 4 && t < 6.2, climb: t > 8.6 });
  Rd.demoPiece = { 2016: 'boulder', 2017: 'gear', 2018: 'pcube', 2019: 'hatch', 2020: 'cell', 2023: 'cone', 2025: 'coral', 2101: 'pinball', 2102: 'drum', 2103: 'disc', 2104: 'girder', 2105: 'gcell', 2106: 'stoneB', 2107: 'cont', 2110: 'crate' };

  // What the engine asks of the drawings (only in a watched match). topInfo: a robot's recipe run without drawing, once
  // for each look: where its turret (tur) or fixed shooter (sh) is, in robot widths, and which way it fires (dir).
  const NOCTX = new Proxy({}, { get: () => () => {}, set: () => true }), INFO = new WeakMap();
  Rd.topInfo = function (r) {
    const lk = r.look || {}; let I = INFO.get(lk);
    if (!I) { I = Rd.topMech(NOCTX, 1, { look: lk, isPlayer: false, held: 0, cap: r.cap || {}, hd: 0 }, lk, {}); INFO.set(lk, I); }
    return I;
  };
  Rd.firesBack = r => Rd.topInfo(r).dir === PI;
  Rd.loadsBack = r => Rd.topInfo(r).load === PI;   // (3.5.6) a robot fed at a station from behind (a recipe returns load: PI)                                         // its scorer points backwards (the 2024 shooters, the dumpers)
  // where a shot leaves the robot, on the field: the turret or the shooter, not the robot's middle
  Rd.muzzle = function (r) {
    const I = Rd.topInfo(r), p = I.tur || I.sh, hd = r.hd || 0, c = Math.cos(hd), s = Math.sin(hd);
    return p ? { x: r.x + (p[0] * c - p[1] * s) * 0.88, y: r.y + (p[0] * s + p[1] * c) * 0.88 } : { x: r.x, y: r.y };
  };

  // One frame of a robot's match animation, for whatever draws a match (the game, the match tester, the trailer): the
  // reach (vx), the intake (vi) and the climber (vc) ease towards what the robot is doing. Returns whether it is aiming
  // or placing (a robot with vision shows its green light then, in the years of reflective tape)
  // (3.5.6) where and which way a robot is drawn between two ticks (al: 0 at the last tick, 1 at this one). The engine
  // keeps both ticks' heading and drawn offset (a tank drive rounds its corners and hangs back while it turns)
  Rd.pose = function (r, al) {
    const ph = r.phd == null ? r.hd || 0 : r.phd, px = r.px == null ? r.x : r.px, py = r.py == null ? r.y : r.py, pox = r.pox || 0, poy = r.poy || 0;
    let d = ((r.hd || 0) - ph) % TAU; if (d > PI) d -= TAU; else if (d < -PI) d += TAU;
    return { x: px + (r.x - px) * al + pox + ((r.ox || 0) - pox) * al, y: py + (r.y - py) * al + poy + ((r.oy || 0) - poy) * al, hd: ph + d * al };
  };
  Rd.animate = function (m, r) {
    const act = !r.dead && r.st === 'act', lab = r.label || '', ease = (k, to, rate) => { r[k] = r[k] == null || m.done ? to : r[k] + (to - r[k]) * rate; };
    ease('vx', act && /^(Placing|Loading|Scoring)/.test(lab) ? 1 : 0, 0.14);                                              // lifts, arms and telescopes reach out to place or load
    ease('vi', !r.dead && !r.climbing && !r.end && (r.held || 0) < ((r.cap && r.cap.storage) || 1) && !(act && /^(Placing|Scoring|Aiming|Shooting|Climbing)/.test(lab)) ? 1 : 0, 0.12);   // the intake is out while there is room and nothing to score
    ease('vc', r.climbing || (r.end && r.end.lvl > 0) ? 1 : 0, 0.05);
    if (r.cap && r.cap.flip) { const fa = r.faceAt; ease('vf', act && fa && !fa.side && /^(Placing|Scoring|Feeding the|Tipping their Switch)/.test(lab) && Math.cos(Math.atan2(fa.y - r.y, fa.x - r.x) - (r.hd || 0)) < 0 ? 1 : 0, 0.22); } // (3.5.6) a flipping claw places behind the robot when that is nearer                                                      // climbers, forks and ramps come out to climb
    return act && /^(Aiming|Shooting|Placing|Scoring)/.test(lab);
  };

  // Draw a robot's mechanisms (the canvas is already at the robot, turned to its heading). Returns where the piece it
  // holds is drawn (at, algae; in robot widths), or own: true when the mechanisms show what it holds themselves
  Rd.topMech = function (ctx, sz, r, lk, o) {
    const ver = lk.ver || 1, c1 = ver >= 2 && lk.c1 ? Rd.sideKit.seen(lk.c1) : r.isPlayer ? ALU : ver >= 2 ? '#8791a0' : '#a9b1ba'; // painted from Version 2: yours, and the rivals that paint (bare ones stay grey)
    const A = { vi: r.vi == null ? 1 : r.vi, vx: r.vx || 0, vc: r.vc == null ? 0 : r.vc, aim: o && o.aim != null ? o.aim - (r.hd || 0) : 0, held: r.held || 0, r };
    const k = Kit(ctx, sz, { c1, c2: lk.c2 || '#ffcf4a', lk, A }), out = {};
    Rd.sideRecipes(lk).forEach(R => { const f = TOP[R.year]; if (!f) return; ctx.save(); const res = f(k, R.c, A) || {}; ctx.restore();
      if (res.at && (R.c.scorer != null || out.at == null)) out.at = res.at;                                              // the piece rides where the scorer is
      if (res.algae) out.algae = res.algae; if (res.own) out.own = true; if (res.tur) out.tur = res.tur; if (res.sh) out.sh = res.sh; if (res.dir != null && (R.c.scorer != null || res.sh)) out.dir = res.dir; });
    // the camera (with vision): on the turret, turning with it; otherwise fixed, looking the way the scorer points.
    // out.cam says where it is and which way it looks: the green light of the reflective-tape years shines from it
    if (lk.vision) {
      const a = out.tur ? A.aim : (out.dir || 0), ca = Math.cos(a), sa = Math.sin(a), b = out.tur || [0.26 * Math.cos(out.dir || 0), 0.25], off = out.tur ? [0.09, -0.11] : [0, 0];
      const px = b[0] + off[0] * ca - off[1] * sa, py = b[1] + off[0] * sa + off[1] * ca;
      k.at(px, py, a, q => { q.rect(-0.045, -0.032, 0.085, 0.064, '#111417', EDGE, 0.012); q.circ(0.04, 0, 0.02, '#52e58a', '#0d3a1f'); });
      out.cam = [px + ca * 0.04, py + sa * 0.04, a];
    }
    return out;
  };
})();
