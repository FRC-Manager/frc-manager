/* FRC Manager — the robots, drawn from the side (3.5.5)
   A robot is put together from the things a real one is made of: box tube with its hole pattern, pocketed plate,
   polycarbonate, belts and pulleys, compliant wheels, gas springs and hooks. Every season has its own recipe (SIDE[year]),
   which reads the concept built in each subsystem (look.sub) and draws that season's version of it: a 2018 climber is a
   hook on a strap, a 2019 one is a pair of stilts. The fantasy seasons borrow the recipe of a real season (ALIAS).
   Units: 1 = the length of the robot with its bumpers (about 34 inches); x runs from the back (-) to the front (+), y up
   from the floor. Recipes queue their parts with k.L(z, section, draw); sections are subsystem ids, so one subsystem can
   be drawn on its own (opts.only).
   (3.5.7) It is a true side view, a parallel projection: no part shows its top or its far side. A shaft that runs across the
   robot is seen end on (a wheel, a roller, a motor on it: circles); one that lies in the picture is seen from its side (a
   wheel on an upright axle is a bar: k.wheelEdge). Of two things side by side across the robot (the arms of a claw, a pair
   of forks, the far upright of an elevator) only the near one is drawn: the other is exactly behind it. */
(function () {
  'use strict';
  const Rd = G.Render, shade = Rd.shade, alc = Rd.K.alc, PI = Math.PI, TAU = PI * 2, D2R = PI / 180;
  const ALU = '#c5ccd4', ALU2 = '#98a2ad', STEEL = '#e2e7ec', DARK = '#2c3138', DARK2 = '#3d444d', INK = 'rgba(6,8,11,0.62)', EDGE = '#6c7682', GOLD = '#b9a56c', HOLE = 'rgba(9,11,14,0.5)';
  const GLASS = 'rgba(170,196,222,0.15)', GLASSL = 'rgba(206,222,238,0.6)', SMOKE = 'rgba(52,59,68,0.8)', BELT = '#5b646e';
  const CW = { g: '#41b062', b: '#3f83dc', o: '#e57e2d', k: '#2a2f35', y: '#dcb521' };
  const TEAMCOL = ['#2f6fd0', '#c2412f', '#2e9e5b', '#e08a1e', '#8a4fc0', '#17a0a0', '#c9a80c', '#59626d', '#b8bfc7', '#d1478c', '#1f4fa3', '#7a1f2b'];
  const lumC = new Map();
  function lum(c) {
    if (lumC.has(c)) return lumC.get(c);
    let r = 200, g = 200, b = 200; const m = /^#([0-9a-f]{3,6})$/i.exec(c), n = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(c);
    if (m) { const h = m[1].length === 3 ? m[1].split('').map(x => x + x).join('') : m[1], v = parseInt(h, 16); r = v >> 16 & 255; g = v >> 8 & 255; b = v & 255; }
    else if (n) { r = +n[1]; g = +n[2]; b = +n[3]; if (n[4] != null && +n[4] < 0.5) { r = g = b = 200; } }
    const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255; lumC.set(c, L); return L;
  }
  // a colour that still reads on the dark page (a black powder coat becomes charcoal)
  const seen = c => (lum(c) < 0.16 ? shade(c, 0.16) : c);

  // ------------------------------------------------------------------ the kit
  function Kit(ctx, s, cx, gy, sx, env) {
    const X = x => cx + sx * x * s, Y = y => gy - y * s, px = Math.max(1, s / 150), k = Object.assign({ ctx, s, X, Y, px }, env);
    const fin = (fill, stroke, lw) => {
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke === 0) return;
      ctx.strokeStyle = stroke || (fill && lum(fill) < 0.22 ? EDGE : INK); ctx.lineWidth = (lw || 1) * px; ctx.stroke();
    };
    const trace = (pts, close) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])))); if (close) ctx.closePath(); };
    k.poly = (pts, fill, stroke, lw) => { trace(pts, true); ctx.lineJoin = 'round'; fin(fill, stroke, lw); };
    k.rect = (x, y, w, h, fill, r, stroke) => { ctx.beginPath(); const x0 = Math.min(X(x), X(x + w)); if (r) ctx.roundRect(x0, Y(y + h), w * s, h * s, r * s); else ctx.rect(x0, Y(y + h), w * s, h * s); fin(fill, stroke); };
    k.circ = (x, y, r, fill, stroke, lw) => { ctx.beginPath(); ctx.arc(X(x), Y(y), r * s, 0, TAU); fin(fill, stroke, lw); };
    // a line of a given thickness (in units); dash in units
    k.line = (pts, col, w, dash) => { trace(pts); ctx.strokeStyle = col; ctx.lineWidth = Math.max(px * 0.8, w * s); ctx.lineCap = dash ? 'butt' : 'round'; ctx.lineJoin = 'round'; if (dash) ctx.setLineDash(dash.map(d => d * s)); ctx.stroke(); if (dash) ctx.setLineDash([]); };
    // a bar: a thick, outlined line (links, rods, hooks, bent plate seen edge-on)
    k.bar = (pts, w, col) => { k.line(pts, lum(col) < 0.22 ? EDGE : 'rgba(6,8,11,0.75)', w + 2.2 * px / s); k.line(pts, col, w); };
    k.arc = (x, y, r, a0, sweep, w, col) => { const pts = [], n = Math.max(6, Math.ceil(Math.abs(sweep) * 6)); for (let i = 0; i <= n; i++) { const g = a0 + sweep * i / n; pts.push([x + r * Math.cos(g), y + r * Math.sin(g)]); } k.bar(pts, w, col); };
    // box tube from one point to another. o.holes: the hole pattern down its face; o.truss: pocketed into a truss
    k.tube = (x1, y1, x2, y2, w, fill, o) => {
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1e-6, ux = dx / L, uy = dy / L, nx = -uy * w / 2, ny = ux * w / 2;
      fill = fill || ALU;
      k.poly([[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]], fill);
      if (o && o.dim) { k.poly([[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]], 'rgba(0,0,0,0.34)', 0); return; }
      if (w * s < 5) return;
      k.line([[x1 + nx * 0.62, y1 + ny * 0.62], [x2 + nx * 0.62, y2 + ny * 0.62]], 'rgba(255,255,255,0.22)', 0);
      if (!o) return;
      ctx.fillStyle = lum(fill) < 0.22 ? 'rgba(0,0,0,0.6)' : HOLE;
      if (o.holes) { const p = o.pitch || w * 1.15, n = Math.floor((L - w * 0.7) / p); for (let i = 0; i <= n; i++) { const t = (L - n * p) / 2 + i * p; ctx.beginPath(); ctx.arc(X(x1 + ux * t), Y(y1 + uy * t), w * 0.19 * s, 0, TAU); ctx.fill(); } }
      if (o.truss && w * s >= 7) {
        const p = w * 1.5, st = p / 2, gap = w * 0.2, n = Math.floor((L - p - w * 0.3) / st), m = (L - (n * st + p)) / 2, e = 0.3, P = (t, d) => [x1 + ux * t + nx * 2 * d, y1 + uy * t + ny * 2 * d];
        for (let i = 0; i <= n; i++) { const t0 = m + i * st + gap, t1 = m + i * st + p - gap, sg = i % 2 ? 1 : -1, a = P(t0, sg * e), b = P(t1, sg * e), c = P((t0 + t1) / 2, -sg * e * 0.55); trace([a, b, c], true); ctx.fill(); }
      }
    };
    // plate: an outline, pocketed towards its middle so only the webs are left (o === 0: left solid)
    k.plate = (pts, fill, o) => {
      fill = fill || DARK2; k.poly(pts, fill);
      if (o === 0) return;
      const n = pts.length, c = (o && o.c) || pts.reduce((a, p) => [a[0] + p[0] / n, a[1] + p[1] / n], [0, 0]), f = (o && o.f) || 0.27;
      ctx.fillStyle = lum(fill) < 0.3 ? 'rgba(3,4,6,0.6)' : HOLE;
      for (let i = 0; i < n; i++) {
        const a = pts[i], b = pts[(i + 1) % n], g = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3];
        if (Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) * s * s < 110) continue;
        trace([a, b, c].map(p => [p[0] + (g[0] - p[0]) * f, p[1] + (g[1] - p[1]) * f]), true); ctx.fill();
      }
    };
    k.glass = (pts, tint) => k.poly(pts, tint || GLASS, GLASSL, 1);
    k.wheel = (x, y, r, kind, c) => {
      const R = r * s, wx = X(x), wy = Y(y), ring = (rr, fill, stroke, lw) => { ctx.beginPath(); ctx.arc(wx, wy, rr * R, 0, TAU); fin(fill, stroke, lw); };
      const spokes = (n, r0, r1, col, lw) => { ctx.strokeStyle = col; ctx.lineWidth = lw * px; ctx.beginPath(); for (let i = 0; i < n; i++) { const g = i * TAU / n + 0.2; ctx.moveTo(wx + Math.cos(g) * r0 * R, wy + Math.sin(g) * r0 * R); ctx.lineTo(wx + Math.cos(g) * r1 * R, wy + Math.sin(g) * r1 * R); } ctx.stroke(); };
      const dots = (n, rr, rad, col) => { ctx.fillStyle = col; for (let i = 0; i < n; i++) { const g = i * TAU / n + 0.3; ctx.beginPath(); ctx.arc(wx + Math.cos(g) * rr * R, wy + Math.sin(g) * rr * R, rad * R, 0, TAU); ctx.fill(); } };
      if (kind === 'tyre') { ring(1, '#1d2025', '#565f69', 1.4); spokes(20, 0.85, 1, '#565f69', 1); ring(0.55, ALU2); dots(5, 0.35, 0.075, HOLE); ring(0.13, DARK, 0); }       // pneumatic
      else if (kind === 'kit') { ring(1, '#2b3036', '#606a75', 1.2); ring(0.74, '#d5dae0'); spokes(6, 0.22, 0.7, 'rgba(70,78,88,0.9)', 1.5); ring(0.2, ALU2); }                     // the kit of parts' wheel
      else if (kind === 'mec') { ring(1, '#272b31', '#606a75', 1.2); ctx.save(); ctx.beginPath(); ctx.arc(wx, wy, R, 0, TAU); ctx.clip(); ctx.strokeStyle = '#8f9aa5'; ctx.lineWidth = 1.3 * px; ctx.beginPath(); for (let i = -3; i <= 3; i++) { ctx.moveTo(wx + i * R * 0.42 - R * 0.34, wy + R); ctx.lineTo(wx + i * R * 0.42 + R * 0.34, wy - R); } ctx.stroke(); ctx.restore(); ring(0.52, ALU2); ring(0.14, DARK, 0); }
      else if (kind === 'comp') { ring(1, c || CW.g, 'rgba(6,8,11,0.7)'); if (R > 3.5) dots(7, 0.64, 0.16, 'rgba(6,8,11,0.5)'); ring(0.3, DARK, 0); }                                // a compliant wheel
      else if (kind === 'star') { const n = 8; ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const g = i * PI / n, rr = (i % 2 ? 0.62 : 1) * R; i ? ctx.lineTo(wx + Math.cos(g) * rr, wy + Math.sin(g) * rr) : ctx.moveTo(wx + rr, wy); } ctx.closePath(); fin(c || '#2a2f35', EDGE); ring(0.3, ALU2, 0); }
      else if (kind === 'fly') { ring(1, '#23272d', EDGE, 1.2); ring(0.8, 0, c || '#ffcf4a', 2); ring(0.45, ALU2); if (R > 5) dots(4, 0.27, 0.07, HOLE); ring(0.11, DARK, 0); }      // a flywheel
      else if (kind === 'pul') { ring(1, ALU2); ring(0.42, DARK, 0); }
      else if (kind === 'gear' || kind === 'spr') { ring(1, kind === 'gear' ? GOLD : '#59626c'); ctx.setLineDash([1.6 * px, 1.6 * px]); ring(1, 0, kind === 'gear' ? '#6f6238' : '#22262b', 2); ctx.setLineDash([]); if (R > 5) dots(5, 0.58, 0.14, HOLE); ring(0.2, DARK, 0); }
      else if (kind === 'roll') { ring(1, c || CW.k, EDGE); ring(0.32, ALU2, 0); }
      else { ring(1, '#24282d', '#606a75', 1.2); ring(0.5, c || ALU2); ring(0.14, DARK, 0); }                                                                                        // a plain tread wheel
    };
    // a belt round two pulleys
    k.belt = (x1, y1, r1, x2, y2, r2, col, w, dash) => {
      const d = Math.hypot(x2 - x1, y2 - y1) || 1e-6, a = Math.atan2(y2 - y1, x2 - x1), b = Math.acos(Math.max(-1, Math.min(1, (r1 - r2) / d)));
      [1, -1].forEach(g => { const t = a + g * b; k.line([[x1 + r1 * Math.cos(t), y1 + r1 * Math.sin(t)], [x2 + r2 * Math.cos(t), y2 + r2 * Math.sin(t)]], col || BELT, w || 0.011, dash); });
    };
    k.chain = (x1, y1, r1, x2, y2, r2) => k.belt(x1, y1, r1, x2, y2, r2, '#8a949f', 0.012, [0.012, 0.009]);
    // a motor whose shaft lies in the picture (a swerve module's, standing up): its can from the side, one flat rectangle
    // with two bands round it. (3.5.7: it had a lighter end, which read as the top of a box)
    k.motor = (x, y, ang, L, r, cap) => k.at(x, y, ang, q => { q.rect(-L * 0.1, -r * 0.3, L * 0.14, r * 0.6, ALU2); q.rect(0, -r, L, 2 * r, '#262a30', r * 0.16); q.line([[L * 0.22, -r * 0.9], [L * 0.22, r * 0.9]], '#4a525b', 0.006); q.line([[L * 0.8, -r * 0.9], [L * 0.8, r * 0.9]], cap || '#6c7682', 0.007); });
    // (3.5.7) a motor on a shaft that runs across the robot (nearly all of them: they drive rollers, gears and pulleys that
    // are seen end on): its end, a circle. Same arguments as k.motor: it sits where the middle of that can would be
    k.motorE = (x, y, ang, L, r, cap) => { const mx = x + Math.cos(ang) * L * 0.5, my = y + Math.sin(ang) * L * 0.5; k.circ(mx, my, r * 1.08, '#262a30', EDGE); k.circ(mx, my, r * 0.74, null, cap || '#6c7682', 1.3); for (let i = 0; i < 4; i++) { const g = i * PI / 2 + 0.6; k.circ(mx + Math.cos(g) * r * 0.74, my + Math.sin(g) * r * 0.74, r * 0.12, HOLE, 0); } k.circ(mx, my, r * 0.3, ALU2, 0); k.circ(mx, my, r * 0.12, DARK, 0); };
    // (3.5.7) a wheel seen edge on: its axle lies in the picture (the wheels of a claw that grips from both sides, a
    // pinion under a turret's ring). r along x, th thick; the stubs of its axle show above and below
    k.wheelEdge = (x, y, r, th, c) => { k.rect(x - r * 0.16, y - th / 2 - 0.008, r * 0.32, th + 0.016, ALU2, 0, 0); k.rect(x - r, y - th / 2, 2 * r, th, c || CW.g, th * 0.3, 'rgba(6,8,11,0.7)'); [-0.5, 0, 0.5].forEach(d => k.line([[x + r * d, y - th * 0.34], [x + r * d, y + th * 0.34]], 'rgba(6,8,11,0.35)', 0.005)); };
    // an air cylinder (or a gas spring): the body from the first point, the rod to the second
    k.piston = (x1, y1, x2, y2, w, part) => { const f = part || 0.6, mx = x1 + (x2 - x1) * f, my = y1 + (y2 - y1) * f; k.bar([[mx, my], [x2, y2]], w * 0.32, STEEL); k.tube(x1, y1, mx, my, w, '#aab3bc'); };
    k.hook = (x, y, r, a0, sweep, w, col) => k.arc(x, y, r, a0, sweep, w, col);
    k.text = (t, x, y, size, col, weight) => { ctx.fillStyle = col; ctx.font = (weight || 700) + ' ' + Math.round(size * s) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, X(x), Y(y)); };
    // draw in a turned frame: its x runs along `ang` from the point
    k.at = (x, y, ang, fn) => { ctx.save(); ctx.translate(X(x), Y(y)); ctx.rotate(-ang * sx); fn(Kit(ctx, s, 0, 0, sx, env)); ctx.restore(); };
    k.mir = fn => fn(Kit(ctx, s, cx, gy, -sx, env));
    return k;
  }

  // ------------------------------------------------------------------ parts shared by the seasons
  // where the wheels, the frame and the bumpers sit for this drivetrain and year
  function geo(lk) {
    const d = lk.drive || 'tank', pneu = lk.year === 2016, sw = d === 'swerve';
    const wr = d === 'tread' ? 0.09 : d === 'wcd8' ? 0.1 : pneu ? 0.118 : sw ? 0.06 : d === 'mecanum' ? 0.088 : lk.year <= 2018 ? 0.086 : 0.07;
    const by0 = pneu ? 0.125 : sw ? 0.045 : wr > 0.08 ? 0.07 : 0.052, bh = 0.15;
    return { d, wr, by0, bh, bt: by0 + bh, ft: by0 + bh - 0.025, pneu, sw };
  }
  function base(k, a, team) {
    const g = k.g, d = g.d, wr = g.wr, lk = k.lk;
    k.L(5, 'drive', q => {
      // the chassis under the bumpers
      q.rect(-0.45, Math.max(0.028, wr * 0.55), 0.9, g.by0 + 0.03 - Math.max(0.028, wr * 0.55), '#23272c', 0.008);
      if (d === 'tread') {
        const xa = -0.45 + wr + 0.01, xb = 0.45 - wr - 0.01;
        q.rect(xa - wr, 0, xb - xa + 2 * wr, 2 * wr, '#1d2025', wr, '#565f69');
        for (let i = 0; i <= 14; i++) { const tx = xa + i * (xb - xa) / 14; q.line([[tx, 0.004], [tx, 0.022]], '#7d8791', 0.008); q.line([[tx, 2 * wr - 0.004], [tx, 2 * wr - 0.022]], '#7d8791', 0.008); }
        [xa, (xa + xb) / 2 - 0.12, (xa + xb) / 2 + 0.12, xb].forEach((wx, i) => q.wheel(wx, wr, wr * (i % 3 ? 0.45 : 0.72), i % 3 ? 'pul' : 'spr'));
      } else if (d === 'swerve') {
        [-0.36, 0.36].forEach(wx => { q.rect(wx - 0.075, wr * 0.9, 0.15, g.by0 - wr * 0.9 + 0.02, '#30353c', 0.01); q.wheel(wx, wr, wr, 'std', k.ver >= 2 ? k.c1 : ALU2); });
      } else {
        const n = d === 'wcd8' ? 4 : d === 'mecanum' ? 2 : 3, kind = g.pneu ? 'tyre' : d === 'mecanum' ? 'mec' : d === 'tank' ? 'kit' : 'std', span = 0.9 - 2 * wr - 0.02;
        for (let i = 0; i < n; i++) q.wheel(-span / 2 + i * span / (n - 1), wr - (n === 3 && i === 1 ? 0.004 : 0), wr, kind);
      }
    });
    k.L(1, 'drive', q => {
      // (3.5.7) what stands on the chassis is the lowest layer: every mechanism is drawn over it. The battery, and the swerve modules' motors
      q.rect(-0.2, g.ft - 0.03, 0.17, 0.085, '#1f2327', 0.008); q.rect(-0.185, g.ft + 0.052, 0.03, 0.014, '#c9413b', 0, 0); q.rect(-0.08, g.ft + 0.052, 0.03, 0.014, '#8b949d', 0, 0);
      if (d === 'swerve') [-0.37, 0.37].forEach(wx => { q.motor(wx - 0.03, g.bt - 0.03, PI / 2, 0.1, 0.027); q.motor(wx + 0.03, g.bt - 0.03, PI / 2, 0.075, 0.022); });
    });
    k.L(6, 'drive', q => {
      const ctx = q.ctx, col = alc(a || 'blue');
      q.rect(-0.51, g.by0, 1.02, g.bh, col, 0.034, shade(col, -0.25));
      q.line([[-0.49, g.bt - 0.018], [0.49, g.bt - 0.018]], 'rgba(255,255,255,0.16)', 0.006);
      [-0.455, 0.455].forEach(x => q.line([[x, g.by0 + 0.012], [x, g.bt - 0.012]], 'rgba(0,0,0,0.22)', 0.005));
      if (team != null && team !== '') { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 2 * q.px; const nSz = g.bh * 0.66, nx = lk.numAt === 'side' ? 0.43 - String(team).length * nSz * 0.29 : typeof lk.numAt === 'number' ? lk.numAt : 0; q.text(String(team), nx, g.by0 + g.bh * 0.47, nSz, '#fff', 800); ctx.restore(); }   // lk.numAt 'side': the number sits at the front end of the bumper
      if (k.ver >= 3) { ctx.save(); ctx.shadowColor = k.c2; ctx.shadowBlur = 5 * q.px; q.line([[-0.45, g.bt + 0.008], [0.45, g.bt + 0.008]], k.c2, 0.009); ctx.restore(); }
    });
  }
  // An elevator from the side: the fixed stage, the stages that ride in front of it and the carriage. (3.5.7) Only the
  // near upright of each stage: the far one, and the cross-members between them, are exactly behind it. Returns where things bolt on; .draw(k) paints it. o.tilt: lean forward (radians); o.st: stages;
  // o.car: how far up the carriage rides (0..1); o.brace: [[foot x, how far up it meets the mast], ...]
  function mast(g, x, y0, h, o) {
    o = o || {}; const ang = PI / 2 - (o.tilt || 0), ca = Math.cos(ang), sa = Math.sin(ang), w = o.w || 0.066, st = o.st || 2;
    const at = (l, d) => [x + ca * l - sa * d, y0 + sa * l + ca * d], cd = -w * 0.66 * (st - 1) - w * 0.72, cl = h * (o.car == null ? 0.22 : o.car), ch = Math.min(0.19, h * 0.2);
    return { at, car: at(cl + ch / 2, cd - w * 0.35), top: at(h, 0), ang,
      draw(k) {
        const col = o.col || k.c1;
        (o.brace || []).forEach(b => { const p = at(h * b[1], 0); k.tube(b[0], g.ft - 0.02, p[0], p[1], w * 0.82, col, { truss: 1 }); });
        k.at(x, y0, ang, q => {
          for (let i = st - 1; i >= 1; i--) { const d = -w * 0.66 * i, up = h * 0.04 * i; q.tube(up, d, h + up, d, w * 0.76, i % 2 ? ALU : STEEL, { holes: 1, pitch: w * 1.7 }); q.rect(h + up - w * 0.3, d - w * 0.46, w * 0.42, w * 0.92, DARK); }
          q.tube(0, 0, h, 0, w, col, { holes: 1 });
          q.rect(h - w * 0.45, -w * 0.62, w * 0.6, w * 1.24, DARK, 0.004); q.wheel(h - w * 0.15, w * 0.2, w * 0.36, 'pul'); q.rect(0, -w * 0.72, w * 0.55, w * 1.44, DARK, 0.004);
          if (o.rig !== 0) { const ch2 = o.rig === 'chain'; q.line([[w * 0.5, w * 1.12], [h - w * 0.3, w * 1.12]], ch2 ? '#8a949f' : BELT, ch2 ? 0.012 : 0.01, ch2 ? [0.012, 0.009] : null); q.wheel(w * 0.5, w * 0.95, w * 0.4, ch2 ? 'spr' : 'pul'); }
          q.rect(cl, cd - w * 0.42, ch, w * 0.95, DARK2, 0.008); q.circ(cl + ch * 0.25, cd, w * 0.14, ALU2, 0); q.circ(cl + ch * 0.75, cd, w * 0.14, ALU2, 0);
        });
      } };
  }
  // an A-frame: two legs up to a pivot
  function tower(k, xa, xb, y0, px, py, col, w) { k.tube(xa, y0, px, py, w || 0.05, col, { truss: 1 }); k.tube(xb, y0, px, py, w || 0.05, col, { holes: 1 }); k.plate([[px - 0.07, py - 0.1], [px + 0.07, py - 0.1], [px + 0.05, py + 0.045], [px - 0.05, py + 0.045]], DARK2, 0); }
  // a telescoping tube that ends in a hook (the climbers since 2020). o.tilt: lean forward; o.st: stages; o.dir: which way the hook opens
  function tele(k, x, y0, h, o) {
    o = o || {}; const w = o.w || 0.052, st = o.st || 2, dir = o.dir || 1, hc = o.hc || k.c2;
    k.at(x, y0, PI / 2 - (o.tilt || 0), q => {
      const top = h + (st - 1) * h * 0.07;
      q.hook(top + 0.012, -dir * 0.036, 0.036, dir > 0 ? PI / 2 : -PI / 2, -dir * PI * 1.15, 0.02, hc);
      for (let i = st - 1; i >= 1; i--) q.tube(h * 0.3, 0, h + i * h * 0.07, 0, w * (1 - 0.2 * i), i % 2 ? ALU : STEEL, { holes: 1, pitch: w * 1.8 });
      q.tube(0, 0, h, 0, w, o.col || k.c1, o.truss ? { truss: 1 } : { holes: 1 });
      q.rect(h - w * 0.4, -w * 0.6, w * 0.4, w * 1.2, DARK, 0.004); q.rect(0, -w * 0.75, w * 0.7, w * 1.5, DARK, 0.004);
      if (o.spool !== 0) { q.wheel(w * 0.9, dir * w * 1.15, w * 0.62, 'pul'); q.line([[w * 0.9, dir * w * 0.58], [h - w * 0.3, dir * w * 0.58]], '#d3b24a', 0.007); }
    });
  }
  // A flywheel shooter between two plates. The ball comes in under the hood, rides over the wheel and leaves along
  // o.ang. o.r: wheel radius; o.gap: the ball; o.hood: 1 fixed, 2 adjustable; o.top: a roller at the hood's lip;
  // o.two: a second flywheel beside the first (from the side it is exactly behind it: nothing shows); o.feed: 0 for no feeder wheel
  function shooter(k, x, y, o) {
    const r = o.r || 0.06, gap = o.gap || 0.17, R = r + gap, a = o.ang, h0 = a + PI / 2, sw = o.sweep || (o.hood === 2 ? 1.95 : 1.6), P = (g, rr) => [x + rr * Math.cos(g), y + rr * Math.sin(g)];
    const pl = []; for (let i = 0; i <= 6; i++) pl.push(P(h0 - 0.12 + (sw + 0.24) * i / 6, R + 0.022));
    pl.push(P(h0 + sw + 0.9, r * 1.7), P(a - 0.5, r * 1.75), P(a + 0.25, r * 1.5));
    if (o.base != null) [P(h0 + sw - 0.15, R * 0.86), P(h0 + sw + 0.9, r * 1.5)].forEach((p, i) => { if (p[1] > o.base + 0.04) k.tube(p[0] + (i ? 0.02 : -0.02), o.base, p[0], p[1], 0.034, k.c1, { holes: 1 }); });   // the legs it stands on
    k.poly(pl, o.col || '#474f59'); { const h1 = P(a - 0.55, r * 1.05), h2 = P(h0 + sw + 0.75, r * 1.25); k.circ(h1[0], h1[1], r * 0.26, HOLE, 0); k.circ(h2[0], h2[1], r * 0.22, HOLE, 0); }
    // (3.5.7) the side plate is pocketed, as on a real one: windows between ribs that run from the wheel's bearing out to the
    // hood, and along the hood the standoffs that tie it to the far plate
    if (R * k.s > 16) { const n = Math.max(3, Math.round(sw / 0.48)), ri = r * 1.32 + 0.01, ro = R - 0.014, rib = 0.085, g0 = h0 + 0.02, dg = (sw - 0.04) / n;
      for (let i = 0; i < n; i++) { const a0 = g0 + i * dg + rib / 2, a1 = g0 + (i + 1) * dg - rib / 2, pts = [];
        for (let j = 0; j <= 4; j++) pts.push(P(a0 + (a1 - a0) * j / 4, ro));
        for (let j = 2; j >= 0; j--) pts.push(P(a0 + 0.07 + (a1 - a0 - 0.14) * j / 2, ri));
        k.poly(pts, 'rgba(9,11,14,0.5)', 0); }
      for (let i = 0; i <= n; i++) { const p = P(g0 + i * dg, R + 0.005); k.circ(p[0], p[1], 0.0065, ALU2, 0); } }
    k.arc(x, y, R, h0, sw, 0.016, o.hc || ALU);
    if (o.hood === 2) { k.arc(x, y, R + 0.014, h0 - 0.5, 0.62, 0.014, k.c2); const gp = P(h0 + 0.5, R + 0.016); k.wheel(gp[0], gp[1], 0.024, 'gear'); }
    if (o.feed !== 0) { const f = P(h0 + sw + 0.32, R * 0.98), f2 = P(h0 + sw + 0.2, r + gap * 0.05); k.wheel(f[0], f[1], Math.min(0.045, r * 0.75), 'comp', o.fc || CW.g); k.belt(x, y, r * 0.4, f2[0], f2[1], 0.012); }
    k.wheel(x, y, r, 'fly', k.c2);
    if (o.top) { const t = P(h0 + 0.02, R + 0.004); k.wheel(t[0], t[1], 0.026, 'roll', o.tc || CW.b); }
    const m = P(a - 1.25, r * 1.7); k.belt(x, y, r * 0.42, m[0], m[1], r * 0.3); k.motorE(m[0], m[1], 0, 0, r * 0.5);   // its motor is on a shaft across the robot, like the wheel: end on
    return { lip: P(h0, R), in: P(h0 + sw, R - gap / 2) };
  }
  // a turret's ring, seen edge-on
  function ring(k, x, y, w, base) { if (base != null && y > base + 0.04) [-1, 1].forEach(s => k.tube(x + s * w * 0.3, base, x + s * w * 0.3, y + 0.01, 0.034, k.c1, { holes: 1 })); k.rect(x - w / 2, y, w, 0.034, '#30353c', 0.008); k.line([[x - w / 2 + 0.01, y + 0.017], [x + w / 2 - 0.01, y + 0.017]], '#7c8691', 0.012, [0.008, 0.008]); k.line([[x - w / 2, y + 0.04], [x + w / 2, y + 0.04]], k.c2, 0.008); k.rect(x + w / 2 + 0.002, y + 0.004, 0.036, 0.026, GOLD, 0.005); }   // (3.5.7) the pinion that turns it stands on an upright shaft: edge on
  // An intake that reaches out over the bumper, deployed. o.px, o.py: its pivot; o.ex, o.ey: the front roller;
  // o.n: rollers; o.wk, o.wc: their wheels; o.four: a four-bar's second link; o.guard: a polycarbonate cover
  function overIntake(k, o) {
    const r = o.r || 0.042, col = o.col || DARK2, mx = o.px + (o.ex - o.px) * 0.52, my = Math.max(o.py, o.ey) + (o.rise == null ? 0.13 : o.rise), n = o.n || 1;
    if (o.four) { k.bar([[o.px - 0.1, o.py - 0.01], [mx - 0.09, my - 0.035]], 0.02, ALU2); k.circ(o.px - 0.1, o.py - 0.01, 0.012, DARK, 0); }
    if (o.guard) k.glass([[mx - 0.06, my + 0.03], [o.ex + 0.01, o.ey + r + 0.05], [o.ex + r + 0.03, o.ey + 0.02], [o.ex - 0.03, o.ey + 0.03], [mx - 0.02, my - 0.04]]);
    k.bar([[o.px, o.py], [mx, my], [o.ex, o.ey]], o.w || 0.05, col);
    if (k.s * 0.05 > 7) { k.line([[o.px + (mx - o.px) * 0.25, o.py + (my - o.py) * 0.25], [o.px + (mx - o.px) * 0.8, o.py + (my - o.py) * 0.8]], 'rgba(3,4,6,0.55)', 0.02); k.line([[mx + (o.ex - mx) * 0.22, my + (o.ey - my) * 0.22], [mx + (o.ex - mx) * 0.72, my + (o.ey - my) * 0.72]], 'rgba(3,4,6,0.55)', 0.02); }
    for (let i = n - 1; i >= 0; i--) { const t = 1 - i * (o.sp || 0.42); k.wheel(mx + (o.ex - mx) * t, my + (o.ey - my) * t, r * (i ? 0.85 : 1), o.wk || 'comp', i % 2 ? (o.wc2 || o.wc || CW.k) : (o.wc || CW.g)); }
    if (n > 1 && o.belt !== 0) k.belt(o.ex, o.ey, r * 0.3, mx + (o.ex - mx) * (1 - (n - 1) * (o.sp || 0.42)), my + (o.ey - my) * (1 - (n - 1) * (o.sp || 0.42)), r * 0.3);
    k.wheel(o.px, o.py, 0.024, o.gear ? 'gear' : 'pul'); if (o.motor) k.motorE(o.px - 0.02, o.py + 0.03, PI * 0.8, 0.09, 0.026);
  }
  // (3.5.7) A four-bar intake, out over the bumper, after a real one's side view: a plate low on the frame (most of it is
  // behind the bumper), two long links that rise forward from it, and the arm they carry, which bends down in front of the
  // bumper to its roller. A chain from a motor on the plate swings the front link; a belt runs up the rear link and down the
  // arm to the rollers. o.wk, o.wc, o.wc2: the rollers' wheels; o.guard: a polycarbonate cover
  function fourBar(k, o) {
    const bt = k.g.bt, ft = k.g.ft, A = [0.15, bt + 0.09], B = [0.27, bt + 0.015], C = [0.46, bt + 0.3], E = [0.545, bt + 0.265], M = [0.63, bt + 0.2], T = [0.745, 0.165];
    k.plate([[-0.04, ft - 0.03], [0.3, ft - 0.03], [0.33, bt], [0.19, bt + 0.12], [0.1, bt + 0.13], [-0.04, bt + 0.03]], DARK2, { f: 0.3 });
    k.chain(B[0], B[1], 0.04, B[0] - 0.1, bt + 0.05, 0.018); k.wheel(B[0] - 0.1, bt + 0.05, 0.02, 'spr'); k.motorE(B[0] - 0.165, bt + 0.055, 0, 0, 0.024);
    k.tube(B[0], B[1], E[0], E[1], 0.05, ALU2);
    if (o.guard) k.glass([[E[0] - 0.02, E[1] + 0.05], [M[0] + 0.03, M[1] + 0.07], [T[0] + 0.075, T[1] + 0.05], [T[0] + 0.065, T[1] - 0.02], [M[0], M[1] - 0.01]]);
    k.bar([C, E, M, T], 0.046, DARK2);
    k.tube(A[0], A[1], C[0], C[1], 0.04, ALU2, { holes: 1, pitch: 0.06 });
    k.belt(A[0], A[1], 0.018, C[0], C[1], 0.018, BELT, 0.008); k.belt(C[0], C[1], 0.018, M[0], M[1], 0.016, BELT, 0.008); k.belt(M[0], M[1], 0.016, T[0], T[1], 0.016, BELT, 0.008);
    k.wheel(B[0], B[1], 0.04, 'spr');
    k.wheel(M[0], M[1], 0.03, o.wk || 'comp', o.wc2 || o.wc); k.wheel(T[0], T[1], 0.044, o.wk || 'comp', o.wc);
    [A, C, E].forEach(p => k.wheel(p[0], p[1], 0.02, 'pul'));
  }
  // a hopper: polycarbonate walls with their slots, a rim, ribs. o.fl / o.fr: how far the left and right walls lean out
  function hopper(k, x0, x1, y0, y1, o) {
    o = o || {}; const fl = o.fl || 0, fr = o.fr || 0, w = x1 - x0, hh = y1 - y0;
    k.glass([[x0, y0], [x1, y0], [x1 + fr, y1], [x0 - fl, y1]], o.tint);
    const n = Math.max(2, Math.round(w / 0.16)); for (let i = 1; i < n; i++) { const t = i / n; k.line([[x0 + w * t, y0], [x0 - fl + (w + fl + fr) * t, y1]], 'rgba(206,222,238,0.28)', 0.006); }
    if (hh > 0.2) [0.36, 0.68].forEach(t => k.line([[x0 + w * 0.12, y0 + hh * t], [x1 - w * 0.12, y0 + hh * t]], 'rgba(8,10,13,0.55)', 0.02));
    k.tube(x0 - fl, y1, x1 + fr, y1, 0.02, o.rim || ALU2);
    k.tube(x0, y0, x0 - fl, y1, 0.022, o.post || ALU2); k.tube(x1, y0, x1 + fr, y1, 0.022, o.post || ALU2);
  }
  // cameras: small black boxes with a lit ring. [x, y, facing (1 front, -1 back), 1 if it rides on a mechanism (a turret's camera): no pole]
  function cams(k, pts) { const n = Math.min(pts.length, k.lk.vision || 0); for (let i = 0; i < n; i++) { const p = pts[i], f = p[2] || 1; if (!p[3] && p[1] > k.g.ft + 0.06) k.L(1.5, 'soft', q => q.bar([[p[0] - f * 0.014, p[1]], [p[0] - f * 0.014, k.g.ft - 0.01]], 0.014, ALU2)); k.L(7, 'soft', q => { q.rect(p[0] - 0.03, p[1] - 0.022, 0.06, 0.044, '#15181c', 0.008, EDGE); q.rect(p[0] + f * 0.036 - 0.007, p[1] - 0.014, 0.014, 0.028, '#52e58a', 0.004, '#0d3a1f'); }); } }   // (3.5.7) the lens looks along the robot: from the side it is its rim, not a circle

  // ------------------------------------------------------------------ the seasons
  const SIDE = {};
  Rd.SIDE = SIDE; Rd.sideKit = { mast, tower, tele, shooter, ring, overIntake, fourBar, hopper, cams, geo, seen, lum, ALU, ALU2, STEEL, DARK, DARK2, GOLD, GLASS, SMOKE, CW, BELT, EDGE };

  // the concept built in each subsystem. A look made before 3.5.5 has no list: work it out from what the look says
  function subsOf(lk) {
    if (lk.sub) return lk.sub;
    const Sz = G.Seasons[lk.year], out = {};
    if (!Sz) return out;
    Sz.subs.forEach(sd => {
      let best = null, bn = 0;
      (sd.concepts || []).forEach(c => { const L = c.look || {}, ks = Object.keys(L); if (!ks.length) return; for (const q of ks) { if ((q === 'eff' ? (lk.eff != null ? lk.eff : lk.intake) : lk[q]) !== L[q]) return; } if (ks.length > bn) { bn = ks.length; best = c.id; } });
      if (best) out[sd.id] = best;
    });
    return out;
  }
  Rd.subsOf = subsOf;
  // A fantasy season is drawn with real seasons' parts. ALIAS[year] is a list of groups: [the real season,
  // { fantasy subsystem: { $: the real subsystem if it is named differently, fantasy concept: real concept } },
  // { real subsystem: [the fantasy subsystem it comes with, concept] }]. Parts keep the fantasy subsystem as their section
  const ALIAS = Rd.SIDE_ALIAS = {};
  // how much height the picture leaves for a season's robots (in robot lengths): the low seasons are drawn larger
  const VIEW = Rd.SIDE_VIEW = { 2016: 1.16, 2017: 1.16, 2024: 1.0, 2026: 1.0 };
  Rd.sideRecipes = function (lk) {
    const c = subsOf(lk), al = ALIAS[lk.year];
    if (!al) return [{ year: lk.year, c, fn: SIDE[lk.year] || SIDE[2022], back: null }];
    return al.map(grp => {
      const m = {}, back = {};
      Object.keys(grp[1]).forEach(sub => { const to = grp[1][sub], v = to[c[sub]]; if (!v || c[sub] === '$') return; const t = to.$ || sub; m[t] = v; back[t] = sub; });
      if (grp[2]) Object.keys(grp[2]).forEach(t => { const w = grp[2][t]; if (!m[t] && Object.keys(back).some(r => back[r] === w[0])) { m[t] = w[1]; back[t] = w[0]; } });
      return { year: grp[0], c: m, fn: SIDE[grp[0]], back };
    }).filter(R => Object.keys(R.c).length);
  };

  // opts.only: draw only these sections (subsystem ids, and 'floor'); the rest still takes part in the geometry
  Rd.robotSide = function (ctx, W, H, look, a, team, opts) {
    const lk = look || {}, only = opts && opts.only, on = sec => !only || only.includes(sec);
    ctx.clearRect(0, 0, W, H);
    const RS = Rd.sideRecipes(lk), vh = Math.max(...RS.map(R => VIEW[R.year] || 1.44), 0.9);
    const fl = Math.max(12, Math.round(H * 0.11)), gy = H - fl, s = Math.min(W / 2.3, (H - fl - H * 0.035) / vh), cx = W / 2 - 0.07 * s;
    const ver = lk.ver || 1, c1 = ver >= 2 && lk.c1 ? seen(lk.c1) : ALU, c2 = seen(lk.c2 || '#ffcf4a'); // painted from Version 2, if the team paints (G.AI.paintOf for rivals)
    let back = null;
    const parts = [], env = { lk, g: geo(lk), c1, c2, ver, L: (z, sec, fn) => parts.push({ z, sec: (back && back[sec]) || sec, fn, i: parts.length }) };
    const k = Kit(ctx, s, cx, gy, 1, env);
    if (on('floor')) {
      ctx.fillStyle = '#20252b'; ctx.fillRect(0, gy, W, fl); ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = k.px; ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
      const bar = lk.frame === 'low' ? (lk.year === 2016 ? [0.5, 'low bar'] : lk.year === 2020 ? [0.86, 'trench'] : lk.year === 2026 ? [0.68, 'trench'] : null) : null;
      if (bar) { ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.setLineDash([5 * k.px, 5 * k.px]); ctx.beginPath(); ctx.moveTo(0, k.Y(bar[0])); ctx.lineTo(W, k.Y(bar[0])); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = 'rgba(255,255,255,0.42)'; ctx.font = Math.round(0.06 * s) + 'px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(bar[1], 6 * k.px, k.Y(bar[0]) - 3 * k.px); }
    }
    RS.forEach(R => { back = R.back; R.fn(k, R.c); }); back = null;
    base(k, a, team);
    parts.sort((p, q) => p.z - q.z || p.i - q.i).forEach(p => { if (on(p.sec)) { ctx.save(); p.fn(k); ctx.restore(); } });
  };
})();
