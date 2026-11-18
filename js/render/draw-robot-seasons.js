/* FRC Manager — every season's robots from the side (3.5.5). One recipe a season: it reads the concept built in each
   subsystem (c.intake, c.scorer, ...) and queues that season's version of it with k.L(z, subsystem, draw). The front of
   the robot is on the right. Drawn in the pose a robot is usually photographed in: lifts down, intakes out. */
(function () {
  'use strict';
  const Rd = G.Render, K = Rd.sideKit, SIDE = Rd.SIDE, ALIAS = Rd.SIDE_ALIAS, PI = Math.PI, D = PI / 180;
  const { mast, tower, tele, shooter, ring, overIntake, hopper, cams, ALU, ALU2, STEEL, DARK, DARK2, GOLD, SMOKE, CW } = K;
  const along = (p, a, l) => [p[0] + l * Math.cos(a), p[1] + l * Math.sin(a)];

  // ================================================================ 2022 RAPID REACT
  // A tower of belts carries cargo from the intake up to a big hooded flywheel; the climbers are telescoping arms.
  SIDE[2022] = function (k, c) {
    const g = k.g, ft = g.ft, c1 = k.c1, c2 = k.c2, it = c.intake, sh = c.scorer, end = c.endgame, dual = it === 'dual', S = [dual ? 0 : -0.1, 0.8];
    if (dual) k.L(3, 'intake', q => {                                                 // an intake at each end: the indexer is the same from both, and they meet under a shooter in the middle
      q.glass([[-0.4, ft - 0.02], [0.4, ft - 0.02], [0.16, 0.6], [-0.16, 0.6]]);
      const half = t => { t.belt(0.31, ft + 0.05, 0.03, 0.115, 0.55, 0.03); t.wheel(0.31, ft + 0.05, 0.03, 'pul'); t.wheel(0.115, 0.55, 0.03, 'pul'); t.wheel(0.225, 0.33, 0.022, 'pul'); t.tube(0.4, ft - 0.02, 0.16, 0.6, 0.03, c1, { holes: 1 }); t.motor(0.2, ft + 0.02, PI, 0.1, 0.027); };
      half(q); q.mir(half); q.wheel(0, ft + 0.07, 0.04, 'comp', CW.g);
    });
    else if (it) k.L(3, 'intake', q => {                                              // the indexer
      q.glass([[0.08, ft - 0.02], [0.4, ft - 0.02], [0.06, 0.6], [-0.2, 0.6]]);
      q.belt(0.3, ft + 0.05, 0.03, -0.06, 0.55, 0.03); q.wheel(0.3, ft + 0.05, 0.03, 'pul'); q.wheel(-0.06, 0.55, 0.03, 'pul'); q.wheel(0.12, 0.34, 0.022, 'pul');
      q.tube(0.4, ft - 0.02, 0.06, 0.6, 0.03, c1, { holes: 1 }); q.motor(0.2, ft + 0.02, PI, 0.1, 0.027);
      if (it === 'term') { q.glass([[-0.22, 0.6], [0.08, 0.6], [0.2, 0.76], [-0.3, 0.76]]); }               // loaded by hand at the Terminal: a catch funnel
    });
    const arm = q => overIntake(q, it === 'pivot' ? { px: 0.34, py: ft + 0.09, ex: 0.71, ey: 0.17, n: 2, r: 0.047, wc: CW.b, wc2: CW.k, w: 0.058, gear: 1, motor: 1 } : { px: 0.34, py: ft + 0.09, ex: 0.69, ey: 0.17, n: 2, r: 0.043, wc: CW.k, wc2: CW.g, four: 1 });
    if (it === 'over' || it === 'pivot' || it === 'dual') k.L(4, 'intake', arm);
    if (it === 'dual') k.L(4, 'intake', q => q.mir(arm));
    if (sh === 'dump') k.L(4, 'scorer', q => {                                        // a bucket that tips cargo into the lower hub
      q.tube(-0.08, ft, -0.12, 0.62, 0.04, c1, { holes: 1 });
      q.poly([[-0.44, 0.56], [-0.02, 0.56], [0.06, 0.8], [-0.4, 0.86]], SMOKE); q.bar([[-0.44, 0.56], [-0.02, 0.56]], 0.016, ALU);
      q.piston(-0.3, ft + 0.04, -0.3, 0.56, 0.03); q.wheel(-0.02, 0.56, 0.022, 'pul');
    });
    else if (sh) k.L(4, 'scorer', q => {
      q.tube(S[0] - 0.2, ft - 0.02, S[0] - 0.12, 0.6, 0.04, c1, { truss: 1 }); if (dual) q.tube(0.2, ft - 0.02, 0.12, 0.6, 0.04, c1, { truss: 1 });
      if (sh === 'turret') { ring(q, S[0] - 0.02, 0.62, 0.42, ft - 0.02); shooter(q, S[0], 0.86, { r: 0.058, gap: 0.21, ang: 64 * D, hood: 2, top: 1 }); }
      else shooter(q, S[0], S[1], { r: 0.066, gap: 0.23, ang: (sh === 'fender' ? 74 : 62) * D, hood: sh === 'hood' ? 2 : 1, top: sh === 'hood', two: sh === 'fender', base: ft - 0.02 });
    });
    if (end === 'trav') k.L(4.6, 'endgame', q => {                                    // one long arm that turns end over end, from rung to rung
      const P = [-0.24, 0.74], a = 38 * D, A = along(P, a, 0.56), B = along(P, a + PI, 0.5);
      q.tube(-0.4, ft - 0.02, P[0], P[1], 0.05, c1, { truss: 1 }); q.tube(-0.1, ft - 0.02, P[0], P[1], 0.04, c1, { holes: 1 });
      q.tube(B[0], B[1], A[0], A[1], 0.05, ALU, { truss: 1 });
      q.hook(A[0] - 0.03, A[1] + 0.02, 0.036, -0.6, PI * 1.2, 0.02, c2); q.hook(B[0] + 0.035, B[1] - 0.015, 0.036, PI - 0.6, PI * 1.2, 0.02, c2); q.wheel(P[0], P[1], 0.07, 'gear'); q.motor(P[0] + 0.06, P[1] - 0.07, -PI / 2, 0.1, 0.028);
    });
    else if (end === 'direct') {                                                      // three parts in a row across the robot, at a right angle to the intakes, so from the side they face the viewer:
      const cx = dual ? 0 : -0.02, WH = '#eef1f4';                                    // a reaction bar in front, the elevator behind it, and a long arm on the far side that leans away
      k.L(2, 'endgame', q => {                                                        // the long arm, seen along its lean: three stages and a hook, edge on
        q.tube(cx, 1.0, cx, 1.36, 0.03, DARK2, { holes: 1, pitch: 0.07 }); q.tube(cx, 0.6, cx, 1.04, 0.042, DARK2, { holes: 1, pitch: 0.08 }); q.tube(cx, ft - 0.02, cx, 0.64, 0.056, c1, { holes: 1 });
        q.rect(cx - 0.036, 0.62, 0.072, 0.035, DARK, 0.004); q.rect(cx - 0.028, 1.02, 0.056, 0.03, DARK, 0.004); q.rect(cx - 0.012, 1.31, 0.024, 0.1, WH, 0.01); q.wheel(cx, ft + 0.03, 0.034, 'gear');
      });
      k.L(4.6, 'endgame', q => {                                                      // the elevator, face on: two uprights, and a cross-braced stage that carries a hook at each end of its top
        [-1, 1].forEach(s => q.tube(cx + s * 0.115, 0.5, cx + s * 0.115, 1.17, 0.034, DARK2, { holes: 1, pitch: 0.07 }));
        q.bar([[cx - 0.115, 0.95], [cx + 0.115, 1.15]], 0.014, DARK2); q.bar([[cx + 0.115, 0.95], [cx - 0.115, 1.15]], 0.014, DARK2);
        [-1, 1].forEach(s => q.tube(cx + s * 0.165, ft - 0.02, cx + s * 0.165, 0.92, 0.056, c1, { holes: 1 }));
        q.rect(cx - 0.2, 0.9, 0.4, 0.035, DARK, 0.006); q.rect(cx - 0.2, 0.56, 0.4, 0.028, DARK, 0.006);
        q.plate([[cx - 0.15, 1.16], [cx + 0.15, 1.16], [cx + 0.12, 1.28], [cx - 0.12, 1.28]], DARK2);
        [-1, 1].forEach(s => { q.rect(cx + s * 0.15 - 0.024, 1.15, 0.048, 0.04, c1, 0.006); q.rect(cx + s * 0.15 - 0.012, 1.18, 0.024, 0.14, WH, 0.01); });
        q.line([[cx + 0.07, ft + 0.05], [cx + 0.07, 1.16]], '#8a949f', 0.01, [0.012, 0.009]); q.wheel(cx + 0.07, ft + 0.05, 0.026, 'spr'); q.motor(cx + 0.04, ft + 0.05, PI, 0.09, 0.026);
      });
      k.L(4.7, 'endgame', q => {                                                      // the bar that braces against the rung below: a long tube held out towards the viewer on two struts
        const y = 0.62; [-1, 1].forEach(s => { q.tube(cx + s * 0.165, ft, cx + s * 0.215, y, 0.03, c1); q.rect(cx + s * 0.19 - 0.02, 0.4, 0.04, 0.06, DARK, 0.008); });
        q.tube(cx - 0.35, y, cx + 0.35, y, 0.04, c1); [-1, 1].forEach(s => q.rect(cx + s * 0.36 - 0.012, y - 0.024, 0.024, 0.048, DARK, 0.01));
      });
    } else if (end && end !== 'none') k.L(4.6, 'endgame', q => {
      if (end === 'high') { const P = [-0.3, ft + 0.02], T = along(P, 80 * D, 0.72); q.tube(P[0], P[1], T[0], T[1], 0.034, ALU, { holes: 1 }); q.hook(T[0] - 0.03, T[1] + 0.01, 0.034, -0.5, PI * 1.15, 0.018, c2); q.wheel(P[0], P[1], 0.03, 'pul'); }   // a second, fixed pair of hooks, opening the same way
      tele(q, -0.41, ft - 0.02, end === 'high' ? 0.94 : 0.9, { st: 2, dir: -1 });
    });
    cams(k, [sh === 'turret' ? [S[0] + 0.1, 0.95, 1, 1] : [S[0] + 0.12, 0.66], [-0.34, 0.5, -1]]);
  };

  // ================================================================ 2025 REEFSCAPE
  // A tall elevator (or an arm, or a telescope on a pivot) carries a coral head; algae rollers; a claw for the cage.
  SIDE[2025] = function (k, c) {
    const g = k.g, ft = g.ft, c1 = k.c1, c2 = k.c2, lift = c.scorer, eff = c.effector, alg = c.algae, end = c.endgame, it = c.intake;
    let head = null, ha = 0, cam = [0.24, ft + 0.12], tl = null;
    if (lift === 'elev' || lift === 'elevw') {
      const w3 = lift === 'elevw', M = mast(g, -0.02, 0.1, w3 ? 1.14 : 1.06, { st: w3 ? 3 : 2, car: w3 ? 0.36 : 0.3, brace: [[-0.4, 0.44]], rig: w3 ? 'belt' : 'chain' });
      k.L(3, 'scorer', q => M.draw(q));
      head = [M.car[0] + 0.07, M.car[1]]; ha = -0.2; cam = [M.at(0.6, 0)[0] + 0.035, 0.7];
      if (w3) { const p0 = M.car, p = along(p0, 28 * D, 0.24); k.L(4, 'scorer', q => { q.tube(p0[0], p0[1], p[0], p[1], 0.04, ALU, { holes: 1 }); q.wheel(p0[0], p0[1], 0.036, 'gear'); q.motor(p0[0] - 0.01, p0[1] + 0.045, PI / 2, 0.09, 0.025); }); head = p; ha = -0.55; }
    } else if (lift === 'arm') {
      const P = [-0.14, 0.76], tip = along(P, -16 * D, 0.5);
      k.L(3, 'scorer', q => { tower(q, -0.4, 0.1, ft - 0.02, P[0], P[1], c1); q.chain(P[0], P[1], 0.05, -0.2, ft + 0.05, 0.022); q.motor(-0.3, ft + 0.05, 0, 0.1, 0.028); });
      k.L(4, 'scorer', q => { const back = along(P, -16 * D + PI, 0.1); q.tube(back[0], back[1], tip[0], tip[1], 0.05, c1, { holes: 1 }); q.wheel(P[0], P[1], 0.055, 'spr'); });
      head = tip; ha = -0.4; cam = [-0.02, 0.5];
    } else if (lift === 'tele') {
      const P = [-0.26, ft + 0.12], a = 61 * D, L = 0.98;
      k.L(3, 'scorer', q => {
        q.plate([[-0.47, ft - 0.02], [-0.05, ft - 0.02], [P[0] + 0.07, P[1] + 0.08], [P[0] - 0.08, P[1] + 0.08]], DARK2);
        q.at(P[0], P[1], a, t => { t.tube(0.5, 0, L, 0, 0.036, STEEL, { holes: 1, pitch: 0.07 }); t.tube(0.3, 0, 0.84, 0, 0.05, ALU, { holes: 1, pitch: 0.08 }); t.tube(-0.1, 0, 0.62, 0, 0.068, c1, { truss: 1 }); t.rect(0.585, -0.042, 0.035, 0.084, DARK, 0.004); t.rect(0.815, -0.032, 0.028, 0.064, DARK, 0.004); t.line([[0, 0.05], [0.6, 0.05]], K.BELT, 0.008); });
        q.wheel(P[0], P[1], 0.072, 'gear'); q.motor(P[0] + 0.08, P[1] - 0.04, 0, 0.1, 0.028);
      });
      head = along(P, a, L); ha = -1.0; cam = [0.2, ft + 0.12]; tl = [P, a];
    } else if (lift === 'trough') {
      k.L(3, 'scorer', q => { q.tube(-0.3, ft - 0.02, -0.3, 0.62, 0.04, c1, { holes: 1 }); q.tube(0.22, ft - 0.02, 0.22, 0.4, 0.04, c1, { holes: 1 }); q.tube(-0.3, 0.44, 0.22, ft + 0.02, 0.028, ALU); });
      head = [0.3, 0.385]; ha = -0.36;
    }
    if (eff) {
      if (!head) { head = [0.2, 0.5]; ha = -0.2; k.L(3, 'effector', q => q.tube(0.14, ft - 0.02, 0.18, 0.48, 0.04, c1, { holes: 1 })); }
      const H = head, A = ha, tr = lift === 'trough';
      // coral comes down a slide from the Station: a smoked funnel at the back (the trough robot's slide is its whole scorer)
      if (tr) k.L(4, 'effector', q => q.at(H[0], H[1], A, t => { t.glass([[-0.68, 0], [0.12, 0], [0.12, 0.1], [-0.68, 0.16]]); t.bar([[-0.68, 0], [0.13, 0]], 0.016, ALU2); if (eff === 'chute') { t.plate([[-0.05, 0.02], [0.12, 0.02], [0.108, 0.225], [-0.02, 0.225]], ALU2, 0); t.wheel(0.045, 0.165, 0.046, 'roll', '#1f2328'); t.motor(-0.025, 0.215, PI, 0.085, 0.022); } else { t.wheel(0.04, 0.115, 0.03, 'comp', CW.b); t.wheel(-0.06, 0.125, 0.03, 'comp', CW.b); t.motor(-0.02, 0.17, 0, 0.08, 0.024); } if (eff === 'pivot') t.wheel(0.11, 0.0, 0.03, 'gear'); }));
      else {
        if (lift !== 'tele') k.L(2, 'effector', q => { q.poly([[-0.5, 0.86], [-0.2, 0.96], [-0.1, 0.5], [-0.3, 0.44]], SMOKE); q.bar([[-0.3, 0.44], [-0.1, 0.5]], 0.014, ALU2); q.tube(-0.36, ft - 0.02, -0.34, 0.47, 0.03, ALU2); });
        k.L(4.4, 'effector', q => q.at(H[0], H[1], A, t => {
          if (eff === 'chute') { t.glass([[-0.12, -0.04], [0.16, -0.04], [0.16, 0.05], [-0.12, 0.08]]); t.bar([[-0.12, -0.04], [0.17, -0.04]], 0.014, ALU2); return; }
          const pv = eff === 'pivot', x1 = pv ? 0.2 : 0.16;
          t.plate([[-0.08, -0.055], [x1, -0.055], [x1 + 0.02, 0.03], [x1 - 0.04, 0.07], [-0.08, 0.07]], DARK2, 0);
          [[-0.03, 0.035], [0.06, 0.035], [x1 - 0.03, -0.015]].forEach(p => t.wheel(p[0], p[1], 0.028, 'comp', CW.b)); if (pv) t.wheel(0.02, -0.03, 0.022, 'comp', CW.g);
          t.motor(-0.02, 0.085, 0, 0.085, 0.024); if (pv) { t.wheel(-0.08, 0, 0.04, 'gear'); t.line([[-0.06, 0.07], [x1 - 0.04, 0.07]], c2, 0.008); }
        }));
      }
    }
    if (alg === 'proc') k.L(4.2, 'algae', q => {                                      // a wheel on a stick knocks algae off the reef; a roller cradle holds it
      const b = head && lift !== 'trough' ? [head[0] - 0.06, head[1] + 0.09] : [0.14, 0.56], tp = [b[0] + 0.27, b[1] + 0.13]; if (!(head && lift !== 'trough')) q.tube(0.1, ft - 0.02, 0.135, 0.56, 0.036, c1, { holes: 1 });
      q.bar([b, tp], 0.022, ALU); q.wheel(tp[0], tp[1], 0.042, 'comp', CW.g);
      q.bar([[0.3, ft + 0.02], [0.44, 0.4], [0.56, 0.36]], 0.03, DARK2); q.wheel(0.56, 0.36, 0.036, 'roll'); q.wheel(0.44, 0.42, 0.03, 'roll'); q.line([[0.42, 0.455], [0.55, 0.4]], c2, 0.008);
    });
    else if (alg === 'net') k.L(4.5, 'algae', q => {                                  // two flywheels throw algae into the net
      const b = head && lift !== 'trough' ? [head[0] - 0.02, head[1] + 0.1] : [0.12, 0.6];
      if (!(head && lift !== 'trough')) q.tube(0.06, ft - 0.02, 0.1, 0.58, 0.04, c1, { holes: 1 });
      q.at(b[0], b[1], 0.5, t => { t.plate([[-0.06, -0.05], [0.26, -0.03], [0.3, 0.06], [0.2, 0.13], [-0.04, 0.09]], DARK2, 0); t.wheel(0.07, 0.03, 0.05, 'fly', c2); t.wheel(0.21, 0.05, 0.05, 'fly', c2); t.belt(0.07, 0.03, 0.02, 0.21, 0.05, 0.02); t.motor(0.0, -0.075, 0, 0.09, 0.025); });
    });
    if (tl && (end === 'shallow' || end === 'deep')) k.L(3.4, 'endgame', q => q.at(tl[0][0], tl[0][1], tl[1], t => {   // with a telescope on a pivot the climber is built onto the back of its first stage (2910's): the arm itself pulls the robot up
      if (end === 'deep') {                                                           // low on the stage, just above the pivot: a claw with rollers that grip the cage, and its winch
        t.plate([[0.04, 0.03], [0.34, 0.03], [0.33, 0.12], [0.25, 0.2], [0.1, 0.2], [0.03, 0.12]], DARK2, 0);
        t.wheel(0.18, 0.108, 0.064, 'std', '#59626c'); t.wheel(0.09, 0.2, 0.034, 'comp', CW.b); t.wheel(0.26, 0.2, 0.034, 'comp', CW.b);
        t.bar([[0.03, 0.12], [-0.01, 0.2], [0.03, 0.25]], 0.016, c2); t.motor(0.3, 0.075, 0, 0.085, 0.024);
      } else {                                                                        // the shallow cage hangs high: a hook on a bracket near the top of the stage
        const r = 0.036, ca = Math.cos(tl[1]), sa = Math.sin(tl[1]);
        t.plate([[0.44, 0.03], [0.6, 0.03], [0.565, 0.1], [0.5, 0.1]], DARK2, 0); t.tube(0.533, 0.08, 0.533, 0.2, 0.03, ALU, { holes: 1, pitch: 0.05 });
        t.hook(0.533 - r * ca, 0.2 + r * sa, r, -tl[1], PI * 1.2, 0.02, c2);
      }
    }));
    else if (end === 'shallow') k.L(2, 'endgame', q => {                              // the shallow cage hangs high off the floor: a tall braced post with a hook
      q.tube(-0.18, ft - 0.02, -0.4, 0.58, 0.032, c1); q.tube(-0.415, 0.52, -0.44, 0.98, 0.036, ALU, { holes: 1, pitch: 0.07 }); q.tube(-0.38, ft - 0.02, -0.418, 0.62, 0.05, c1, { holes: 1 }); q.rect(-0.45, 0.6, 0.065, 0.03, DARK, 0.004);
      q.hook(-0.476, 0.98, 0.036, 0, PI * 1.2, 0.02, c2); q.wheel(-0.36, ft + 0.05, 0.032, 'pul'); q.line([[-0.36, ft + 0.08], [-0.447, 0.95]], '#d3b24a', 0.007);
    });
    else if (end === 'deep') k.L(2, 'endgame', q => {                                 // an arm swings out, grips the cage between rollers and winches the robot up
      const P = [-0.3, ft + 0.05], T = along(P, 112 * D, 0.5);
      q.tube(P[0], P[1], T[0], T[1], 0.05, c1, { truss: 1 });
      q.plate([[T[0] - 0.13, T[1] - 0.03], [T[0] + 0.03, T[1] - 0.05], [T[0] + 0.05, T[1] + 0.06], [T[0] - 0.1, T[1] + 0.11]], DARK2, 0);
      q.wheel(T[0] - 0.08, T[1] + 0.055, 0.036, 'comp', CW.b); q.wheel(T[0] - 0.005, T[1] + 0.015, 0.036, 'comp', CW.b); q.hook(T[0] - 0.14, T[1] + 0.0, 0.03, PI / 2, PI * 1.1, 0.016, c2);
      q.piston(P[0] + 0.14, ft, T[0] + 0.06, T[1] - 0.16, 0.026); q.wheel(P[0], P[1], 0.06, 'gear'); q.motor(P[0] + 0.02, P[1] + 0.07, 0.2, 0.1, 0.028);
    });
    if (it === 'ground') k.L(4, 'intake', q => overIntake(q, { px: 0.35, py: ft + 0.07, ex: 0.7, ey: 0.14, rise: 0.11, n: 2, sp: 0.5, r: 0.05, wk: 'star', wc: '#2f353c', gear: 1, belt: 0 }));
    cams(k, [cam, [-0.4, ft + 0.14, -1]]);
  };

  // ================================================================ 2026 REBUILT
  // Low and long: most of the robot is hopper, with a full-width intake at the front and a hooded shooter at the back.
  SIDE[2026] = function (k, c) {
    const g = k.g, ft = g.ft, low = k.lk.frame === 'low', top = low ? 0.64 : 0.84, c1 = k.c1, c2 = k.c2, hop = c.hopper, sh = c.scorer, it = c.intake, end = c.endgame;
    const mid = sh === 'rotor';                                                       // a dye rotor stands in the middle of the robot, with the hopper all round it
    const hx0 = mid ? -0.43 : sh === 'turret' ? -0.11 : -0.06, hx1 = 0.42, hy0 = ft - 0.01, hy1 = hop === 'small' ? hy0 + 0.2 : hop === 'med' ? Math.min(top - 0.07, hy0 + 0.34) : top - 0.02;
    if (hop) k.L(2, 'hopper', q => {
      const big = hop === 'large';
      hopper(q, hx0, hx1, hy0, hy1, { fr: big ? 0.05 : 0.02, fl: mid ? 0.015 : 0, post: c1, tint: big ? 'rgba(74,84,96,0.5)' : undefined });
      if (big) { const x = hx1 + 0.06, a = [x, hy0 + 0.2], b = [x + 0.26, hy0 + 0.25], e = [x + 0.26, hy1], d = [x, hy1]; q.glass([a, b, e, d]); q.bar([a, e], 0.014, ALU2); q.bar([b, d], 0.014, ALU2); q.bar([a, b, e, d, a], 0.018, c1); }   // the wall that folds out over the intake
      if (!mid) { q.belt(hx0 + 0.04, hy0 + 0.035, 0.02, hx1 - 0.05, hy0 + 0.035, 0.02); q.wheel(hx0 + 0.04, hy0 + 0.035, 0.02, 'pul'); q.wheel(hx1 - 0.05, hy0 + 0.035, 0.02, 'pul'); }
    });
    if (mid) {
      const ry = low ? 0.37 : 0.5;                                                    // where the turret's ring sits
      k.L(1.8, 'scorer', q => {                                                       // under the fuel: the rotor, a wide low drum that turns fuel in to its middle
        q.rect(-0.31, ft - 0.02, 0.62, 0.115, '#30353c', 0.03); for (let i = 1; i < 10; i++) q.line([[-0.31 + i * 0.062, ft - 0.005], [-0.31 + i * 0.062, ft + 0.08]], '#69737d', 0.006); q.line([[-0.3, ft + 0.085], [0.3, ft + 0.085]], c2, 0.01);
      });
      k.L(3, 'scorer', q => {                                                         // the column that lifts fuel up the middle, and the frame that holds the turret over it
        q.poly([[-0.085, ft + 0.09], [0.085, ft + 0.09], [0.07, ry], [-0.07, ry]], SMOKE); q.wheel(0, ft + 0.15, 0.034, 'comp', CW.b); q.wheel(0, ry - 0.05, 0.028, 'comp', CW.b); q.belt(0, ft + 0.15, 0.012, 0, ry - 0.05, 0.012);
        [-1, 1].forEach(s => q.tube(s * 0.41, hop ? hy1 : ft - 0.02, s * 0.15, ry + 0.012, 0.03, c1, { truss: 1 }));
      });
      k.L(4, 'scorer', q => { ring(q, 0, ry, 0.32); shooter(q, 0, ry + 0.12, { r: 0.046, gap: low ? 0.105 : 0.13, ang: 56 * D, hood: 2, feed: 0 }); });
    } else if (sh) k.L(4, 'scorer', q => {
      const sy = low ? ft + 0.215 : ft + 0.3, sx = sh === 'turret' ? -0.3 : -0.25, base = ft - 0.02;
      q.wheel(hx0 - 0.03, ft + 0.06, 0.034, 'comp', CW.b);                              // the kicker that feeds it
      if (sh === 'turret') { ring(q, sx, ft + 0.05, 0.3); shooter(q, sx + 0.01, ft + 0.05 + (low ? 0.165 : 0.2), { r: 0.05, gap: low ? 0.13 : 0.15, ang: 60 * D, hood: 2, feed: 0 }); }   // on a back corner of the chassis
      else if (sh === 'dumper') shooter(q, sx + 0.02, sy - 0.01, { r: 0.076, gap: 0.15, ang: 48 * D, hood: 2, sweep: 1.7, fc: CW.o, base });   // a drum as wide as the robot
      else shooter(q, sx, sy, { r: 0.058, gap: 0.155, ang: 60 * D, hood: sh === 'hood' ? 2 : 1, top: sh === 'hood', base });
    });
    if (it === 'ground' || it === 'wide') k.L(4, 'intake', q => overIntake(q, it === 'wide' ? { px: 0.34, py: ft + 0.1, ex: 0.71, ey: 0.14, n: 2, r: 0.05, wc: CW.b, wc2: CW.k, w: 0.056, guard: 1, sp: 0.36 } : { px: 0.34, py: ft + 0.1, ex: 0.68, ey: 0.14, n: 1, r: 0.045, wc: CW.g, four: 1 }));
    else if (it === 'slide') k.L(4, 'intake', q => {                                  // rails run it straight out over the bumper
      const y = ft + 0.09;
      q.tube(0.08, y, 0.74, y, 0.036, ALU, { holes: 1, pitch: 0.06 }); q.rect(0.3, y - 0.03, 0.09, 0.06, DARK, 0.006); q.wheel(0.26, y - 0.035, 0.024, 'gear');
      q.plate([[0.6, y + 0.06], [0.76, y + 0.04], [0.8, 0.1], [0.66, 0.07], [0.6, y - 0.03]], DARK2, 0);
      q.wheel(0.74, 0.13, 0.047, 'comp', CW.g); q.wheel(0.66, y + 0.0, 0.034, 'comp', CW.k); q.belt(0.74, 0.13, 0.015, 0.66, y, 0.015); q.motor(0.6, y + 0.07, 0, 0.08, 0.024);
    });
    else if (it === 'outpost' && hop && !low) k.L(2.5, 'intake', q => q.glass([[hx0, hy1], [hx1 + 0.02, hy1], [hx1 + 0.1, hy1 + 0.09], [hx0 - 0.08, hy1 + 0.09]]));   // fed by hand at the Outpost: a wide mouth
    if (end && end !== 'none') k.L(4.6, 'endgame', q => {
      const h = top - ft - 0.06, x0 = mid ? -0.445 : -0.42;
      if (end === 'l3') { const P = [x0 + 0.13, ft + 0.03], T = along(P, 80 * D, h * 0.86); q.tube(P[0], P[1], T[0], T[1], 0.032, ALU, { holes: 1 }); q.hook(T[0] - 0.03, T[1], 0.032, -0.5, PI * 1.15, 0.017, c2); }   // a second pair of hooks: every hook opens the same way
      tele(q, x0, ft - 0.02, end === 'l1' ? h * 0.72 : h * 0.9, { st: end === 'l1' ? 1 : end === 'l2' ? 2 : 3, dir: -1, w: 0.048, spool: end === 'l1' ? 0 : 1 });
    });
    cams(k, [mid ? [0.09, (low ? 0.37 : 0.5) + 0.15, 1, 1] : sh === 'turret' ? [-0.2, ft + 0.08 + (low ? 0.165 : 0.2), 1, 1] : [hx1 - 0.02, hy0 + 0.12], [mid ? 0.28 : -0.4, ft + 0.1, mid ? 1 : -1]]);
  };

  // ================================================================ 2024 CRESCENDO
  // Low enough to drive under the Stage: a note goes in at the front and out of a shooter that points back over the robot.
  SIDE[2024] = function (k, c) {
    const g = k.g, ft = g.ft, c1 = k.c1, c2 = k.c2, it = c.intake, sh = c.scorer, amp = c.amp, end = c.endgame;
    let tipA = [-0.2, 0.5];                                                           // where an amp bar would hinge
    const wheels = (t, x, r) => { t.wheel(x, -0.05, r, 'fly', c2); t.wheel(x, 0.055, r, 'fly', c2); };
    if (sh === 'pivot') { const P = [0.12, ft + 0.07], a = 152 * D; tipA = along(P, a, 0.5); tipA[1] += 0.09;
      k.L(4, 'scorer', q => { q.tube(0.2, ft - 0.02, P[0], P[1] + 0.01, 0.045, c1); q.wheel(P[0] - 0.03, P[1] - 0.02, 0.085, 'gear');
        q.at(P[0], P[1], a, t => { t.plate([[-0.05, -0.06], [0.5, -0.1], [0.59, -0.02], [0.59, 0.07], [0.5, 0.12], [-0.02, 0.07]], DARK2, { c: [0.27, 0] }); wheels(t, 0.5, 0.045); t.wheel(0.3, -0.04, 0.026, 'comp', CW.o); t.wheel(0.3, 0.045, 0.026, 'comp', CW.o); t.wheel(0.14, 0.04, 0.022, 'comp', CW.o); t.motor(0.38, 0.13, PI, 0.09, 0.025); t.belt(0.5, 0.055, 0.016, 0.34, 0.13, 0.014); });
        q.wheel(P[0], P[1], 0.03, 'pul'); q.motor(P[0] + 0.07, P[1] - 0.04, 0, 0.09, 0.026); });
    } else if (sh === 'sub') { const P = [0.1, ft + 0.03], a = 126 * D; tipA = along(P, a, 0.5);
      k.L(4, 'scorer', q => { q.tube(-0.2, ft - 0.02, -0.14, ft + 0.34, 0.04, c1, { holes: 1 }); q.tube(0.16, ft - 0.02, 0.06, ft + 0.12, 0.04, c1);
        q.at(P[0], P[1], a, t => { t.plate([[0, -0.085], [0.46, -0.1], [0.5, 0.0], [0.46, 0.11], [0, 0.085]], DARK2, { c: [0.2, 0] }); wheels(t, 0.4, 0.05); t.wheel(0.2, -0.045, 0.03, 'comp', CW.o); t.wheel(0.2, 0.05, 0.03, 'comp', CW.o); t.motor(0.3, 0.14, PI, 0.09, 0.025); }); });
    } else if (sh === 'turret') { tipA = [-0.3, ft + 0.36];
      k.L(4, 'scorer', q => { ring(q, -0.06, ft + 0.04, 0.5);
        q.at(0.08, ft + 0.13, 158 * D, t => { t.plate([[-0.02, -0.07], [0.4, -0.085], [0.46, 0], [0.4, 0.1], [-0.02, 0.08]], DARK2, { c: [0.18, 0] }); wheels(t, 0.34, 0.043); t.wheel(0.16, -0.035, 0.026, 'comp', CW.o); t.wheel(0.16, 0.045, 0.026, 'comp', CW.o); t.arc(0.34, 0.0, 0.13, -0.5, -1.0, 0.012, c2); }); });
    }
    if (it === 'otb') k.L(4.2, 'intake', q => overIntake(q, { px: 0.33, py: ft + 0.08, ex: 0.67, ey: 0.13, rise: 0.12, n: 3, sp: 0.3, r: 0.036, wc: CW.o, wc2: CW.k, four: 1, guard: 1 }));
    else if (it === 'utb') { k.L(4.2, 'intake', q => { q.plate([[0.14, ft - 0.02], [0.44, ft - 0.02], [0.44, ft + 0.07], [0.2, ft + 0.1]], DARK2, 0); q.wheel(0.38, ft + 0.03, 0.026, 'comp', CW.o); q.wheel(0.26, ft + 0.045, 0.026, 'comp', CW.o); });
      k.L(6.5, 'intake', q => { [0.47, 0.38, 0.29].forEach((x, i) => q.wheel(x, 0.04 - i * 0.004, 0.033, 'comp', i % 2 ? CW.k : CW.o)); q.line([[0.25, 0.012], [0.5, 0.012]], ALU2, 0.008); }); }   // rollers under the front bumper
    else if (it === 'src') k.L(3, 'intake', q => { q.tube(0.4, ft - 0.02, 0.42, 0.58, 0.03, ALU2); q.glass([[0.1, ft + 0.14], [0.2, ft + 0.1], [0.48, 0.58], [0.38, 0.64]]); q.bar([[0.2, ft + 0.1], [0.48, 0.58]], 0.014, ALU2); });   // a slide for notes dropped from the Source
    if (amp === 'ampbar') k.L(4.5, 'amp', q => { const T = along(tipA, 78 * D, 0.2); q.bar([tipA, T], 0.02, ALU); q.wheel(T[0], T[1], 0.022, 'roll', CW.o); q.wheel(tipA[0], tipA[1], 0.018, 'pul'); });   // a bar flips up and knocks the note down into the Amp
    else if (amp === 'amptrap') { const M = mast(g, 0.2, 0.1, 0.66, { st: 2, car: 0.62, w: 0.05 }); k.L(3, 'amp', q => { M.draw(q); const h = M.car; q.plate([[h[0] - 0.02, h[1] - 0.05], [h[0] + 0.16, h[1] - 0.03], [h[0] + 0.16, h[1] + 0.07], [h[0] - 0.02, h[1] + 0.07]], DARK2, 0); q.wheel(h[0] + 0.04, h[1] + 0.02, 0.028, 'comp', CW.o); q.wheel(h[0] + 0.12, h[1] + 0.02, 0.028, 'comp', CW.o); }); }
    if (end && end !== 'none') k.L(4.6, 'endgame', q => {
      const tr = end === 'chaintrap';
      tele(q, -0.41, ft - 0.02, tr ? 0.5 : 0.42, { st: tr ? 3 : 2, dir: 1, w: 0.048 });
      if (tr) { const P = [-0.3, ft + 0.02], T = along(P, 74 * D, 0.5); q.bar([P, T], 0.024, ALU); q.wheel(T[0], T[1], 0.026, 'roll', CW.o); }                              // a finger that pushes the note into the Trap
    });
    cams(k, [sh === 'turret' ? [0.01, ft + 0.28, -1, 1] : [-0.36, ft + 0.14, -1], [0.3, ft + 0.16]]);   // the shooter points back, and so does its camera
  };

  // ================================================================ 2023 CHARGED UP
  // Arms: one joint, two joints, an elevator leaning forward, or a telescope on a pivot, with a gripper on the end.
  SIDE[2023] = function (k, c) {
    const g = k.g, ft = g.ft, c1 = k.c1, c2 = k.c2, lift = c.scorer, eff = c.effector, it = c.intake;
    let head = null, ha = 0, cam = [0.22, ft + 0.12];
    if (lift === 'sja') { const P = [-0.14, 0.8], a = -30 * D, tip = along(P, a, 0.58); head = tip; ha = -0.15; cam = [-0.02, 0.5];
      k.L(3, 'scorer', q => { tower(q, -0.4, 0.14, ft - 0.02, P[0], P[1], c1); q.chain(P[0], P[1], 0.06, -0.24, ft + 0.05, 0.022); q.motor(-0.34, ft + 0.05, 0, 0.1, 0.028); });
      k.L(4, 'scorer', q => { const b = along(P, a + PI, 0.12); q.piston(0.06, ft + 0.02, P[0] + 0.2, P[1] - 0.115, 0.026); q.tube(b[0], b[1], tip[0], tip[1], 0.055, c1, { truss: 1 }); q.wheel(P[0], P[1], 0.062, 'spr'); });
    } else if (lift === 'elev') { const M = mast(g, -0.38, ft - 0.03, 1.0, { st: 2, tilt: 0.74, car: 0.5, w: 0.064, rig: 'chain' }); head = [M.car[0] + 0.05, M.car[1] - 0.04]; ha = -0.2; cam = [0.3, ft + 0.12];
      k.L(3, 'scorer', q => { const p = M.at(0.62, 0); q.tube(0.22, ft - 0.02, p[0], p[1], 0.045, c1, { truss: 1 }); M.draw(q); q.motor(-0.3, ft + 0.03, 0, 0.1, 0.028); });
    } else if (lift === 'elevw') { const M = mast(g, -0.3, 0.1, 1.12, { st: 3, car: 0.42, brace: [[-0.02, 0.34]] }), p0 = M.car, tip = [p0[0] + 0.5, p0[1] + 0.02]; head = tip; ha = -0.35;
      k.L(3, 'scorer', q => M.draw(q));
      k.L(4, 'scorer', q => { q.tube(p0[0] - 0.03, p0[1] + 0.02, p0[0] + 0.34, p0[1] + 0.02, 0.06, ALU, { holes: 1 }); q.tube(p0[0] + 0.14, p0[1] + 0.02, tip[0], tip[1], 0.04, STEEL, { holes: 1, pitch: 0.07 }); q.wheel(tip[0], tip[1], 0.034, 'gear'); q.motor(p0[0] + 0.02, p0[1] + 0.075, 0, 0.09, 0.025); });   // the stage that runs out sideways
    } else if (lift === 'dja') { const P = [-0.18, 0.86], E = [0.2, 0.44], Wp = [-0.02, 0.72]; head = Wp; ha = 0.35; cam = [0.28, ft + 0.12];
      k.L(3, 'scorer', q => { tower(q, -0.42, 0.06, ft - 0.02, P[0], P[1], c1, 0.055); q.chain(P[0], P[1], 0.06, -0.26, ft + 0.05, 0.022); q.motor(-0.36, ft + 0.05, 0, 0.1, 0.028); q.motor(-0.12, ft + 0.05, 0, 0.1, 0.028); });
      k.L(4, 'scorer', q => { q.tube(P[0], P[1], E[0], E[1], 0.055, c1, { truss: 1 }); q.chain(P[0], P[1], 0.04, E[0], E[1], 0.04); q.tube(E[0], E[1], Wp[0], Wp[1], 0.045, ALU, { holes: 1 }); q.wheel(P[0], P[1], 0.064, 'spr'); q.wheel(E[0], E[1], 0.045, 'spr'); q.piston(-0.02, ft + 0.02, P[0] + 0.16, P[1] - 0.2, 0.024); });
    } else if (lift === 'tele') { const P = [-0.26, ft + 0.14], a = 66 * D, L = 1.02; head = along(P, a, L); ha = -1.05;
      k.L(3, 'scorer', q => {
        q.plate([[-0.46, ft - 0.02], [-0.06, ft - 0.02], [P[0] + 0.07, P[1] + 0.08], [P[0] - 0.08, P[1] + 0.08]], DARK2);
        q.at(P[0], P[1], a, t => { t.tube(0.5, 0, L, 0, 0.036, STEEL, { holes: 1, pitch: 0.07 }); t.tube(0.28, 0, 0.84, 0, 0.05, ALU, { holes: 1, pitch: 0.08 }); t.tube(-0.12, 0, 0.62, 0, 0.07, c1, { holes: 1 }); t.rect(0.585, -0.043, 0.035, 0.086, DARK, 0.004); t.rect(0.815, -0.032, 0.028, 0.064, DARK, 0.004); t.rect(-0.2, -0.05, 0.1, 0.1, '#30353c', 0.01); });   // (a counterweight behind the pivot)
        q.wheel(P[0], P[1], 0.07, 'gear'); q.motor(P[0] + 0.08, P[1] - 0.05, 0, 0.1, 0.028);
      });
    } else if (lift === 'hyb') { head = [0.3, ft + 0.2]; ha = 0; k.L(3, 'scorer', q => { q.tube(0.2, ft - 0.02, 0.26, ft + 0.2, 0.045, c1, { holes: 1 }); q.tube(0.02, ft - 0.02, 0.24, ft + 0.16, 0.035, c1); }); }
    if (eff) {
      if (!head) { head = [0.26, ft + 0.3]; k.L(3, 'effector', q => q.tube(0.2, ft - 0.02, 0.24, ft + 0.3, 0.04, c1, { holes: 1 })); }
      const H = head, A = ha;
      k.L(4.4, 'effector', q => q.at(H[0], H[1], A, t => {
        if (eff === 'claw') { t.piston(-0.02, 0, 0.12, 0, 0.03, 0.55); t.bar([[0, 0.03], [0.1, 0.09], [0.28, 0.07]], 0.022, ALU2); t.bar([[0, -0.03], [0.1, -0.09], [0.28, -0.07]], 0.022, ALU2); t.line([[0.2, 0.062], [0.28, 0.058]], '#1b1e22', 0.012); t.line([[0.2, -0.062], [0.28, -0.058]], '#1b1e22', 0.012); t.rect(-0.05, -0.045, 0.07, 0.09, DARK, 0.008); return; }   // two jaws on an air cylinder
        const wr = eff === 'wrist';
        t.plate([[-0.05, -0.08], [0.2, -0.1], [0.25, -0.03], [0.25, 0.04], [0.2, 0.1], [-0.05, 0.08]], DARK2, 0);
        t.wheel(0.19, 0.055, 0.036, 'comp', CW.g); t.wheel(0.19, -0.055, 0.036, 'comp', CW.g); t.wheel(0.07, 0.045, 0.028, 'comp', CW.k); t.wheel(0.07, -0.045, 0.028, 'comp', CW.k);
        t.motor(0.0, 0.1, 0, 0.085, 0.024); if (wr) { t.wheel(-0.05, 0, 0.042, 'gear'); t.line([[-0.02, -0.08], [0.2, -0.1]], c2, 0.008); }
      }));
    }
    if (it === 'gcube' || it === 'gall') k.L(4, 'intake', q => overIntake(q, it === 'gall' ? { px: 0.34, py: ft + 0.08, ex: 0.7, ey: 0.17, n: 2, r: 0.05, wc: CW.g, wc2: CW.o, w: 0.055, sp: 0.4, guard: 1 } : { px: 0.34, py: ft + 0.08, ex: 0.67, ey: 0.2, n: 1, r: 0.052, wc: CW.g, four: 1 }));
    cams(k, [cam, [-0.4, ft + 0.12, -1]]);
  };

  // ================================================================ 2020 INFINITE RECHARGE
  // A full-width intake, belts that queue five power cells, a hooded shooter (often on a turret), hooks that telescope up.
  SIDE[2020] = function (k, c) {
    const g = k.g, ft = g.ft, low = k.lk.frame === 'low', top = low ? 0.82 : 1.3, c1 = k.c1, c2 = k.c2, it = c.intake, sh = c.scorer, pn = c.panel, end = c.endgame;
    const rev = it === 'revolver', fy = low ? ft + 0.2 : ft + 0.24;
    if (it) k.L(3, 'intake', q => {
      if (rev) { q.rect(-0.2, ft - 0.02, 0.56, 0.17, '#30353c', 0.03); for (let i = 1; i < 8; i++) q.line([[-0.2 + i * 0.07, ft], [-0.2 + i * 0.07, ft + 0.13]], '#6b7580', 0.006); q.line([[-0.19, ft + 0.14], [0.35, ft + 0.14]], c2, 0.01); q.wheel(0.08, ft - 0.0, 0.03, 'gear'); }   // the revolver: a drum of five pockets
      else { q.poly([[-0.24, ft - 0.02], [0.42, ft - 0.02], [0.42, ft + 0.17], [-0.24, fy + 0.14]], SMOKE); q.belt(0.34, ft + 0.05, 0.028, -0.14, fy, 0.028); q.wheel(0.34, ft + 0.05, 0.028, 'pul'); q.wheel(-0.14, fy, 0.028, 'pul'); q.wheel(0.1, (ft + 0.05 + fy) / 2, 0.02, 'pul'); }
      if (it === 'bay') q.glass([[-0.02, ft + 0.2], [0.34, ft + 0.14], [0.44, ft + 0.3], [-0.08, ft + 0.38]]);                                                   // loaded at the bay only: a catch funnel
    });
    if (it === 'over') k.L(4, 'intake', q => overIntake(q, { px: 0.34, py: ft + 0.09, ex: 0.68, ey: 0.15, n: 1, r: 0.045, wk: 'star', wc: '#2f353c', four: 1 }));
    else if (it === 'wide') k.L(4, 'intake', q => overIntake(q, { px: 0.34, py: ft + 0.09, ex: 0.71, ey: 0.14, n: 3, sp: 0.27, r: 0.04, wk: 'star', wc: '#2f353c', wc2: '#2f353c', w: 0.055, guard: 1 }));
    else if (rev) k.L(4, 'intake', q => K.fourBar(q, { wk: 'star', wc: '#2f353c', wc2: '#2f353c', guard: 1 }));   // two parallel links carry the head out and keep it level
    if (sh === 'dump') k.L(4, 'scorer', q => {                                        // belts lift the cells and roll them out of the back
      const ty = low ? 0.66 : 0.78; q.poly([[-0.2, ft - 0.02], [-0.06, ft - 0.02], [-0.3, ty + 0.06], [-0.47, ty]], SMOKE); q.belt(-0.14, ft + 0.04, 0.026, -0.4, ty - 0.02, 0.026); q.wheel(-0.14, ft + 0.04, 0.026, 'pul'); q.wheel(-0.4, ty - 0.02, 0.03, 'comp', CW.g); q.tube(-0.42, ft - 0.02, -0.44, ty - 0.06, 0.035, c1, { holes: 1 });
    });
    else if (sh) k.L(4, 'scorer', q => {
      const tur = sh === 'turret', sx = -0.25, sy = low ? ft + (tur ? 0.39 : 0.35) : 0.93;
      if (!low) { q.tube(-0.42, ft - 0.02, -0.36, sy - 0.14, 0.045, c1, { truss: 1 }); q.tube(-0.06, ft - 0.02, -0.16, sy - 0.14, 0.045, c1, { holes: 1 }); q.glass([[-0.34, fy + 0.04], [-0.14, fy], [-0.16, sy - 0.16], [-0.34, sy - 0.16]]); q.belt(-0.24, fy + 0.04, 0.026, -0.25, sy - 0.2, 0.026); }   // a tall robot: a tower of belts up to the shooter
      if (tur) ring(q, sx - 0.01, sy - (low ? 0.2 : 0.17), 0.36, low ? ft - 0.02 : null);
      shooter(q, sx, sy, { r: tur ? 0.05 : 0.058, gap: tur && low ? 0.14 : 0.16, ang: 58 * D, hood: sh === 'fixed' ? 1 : 2, top: sh === 'hood', base: low && !tur ? ft - 0.02 : null });
    });
    if (pn === 'spin' || pn === 'color') k.L(4.5, 'panel', q => {                     // a wheel on a post that turns the Control Panel
      const x = 0.27, y = top - 0.07; q.tube(x - 0.02, ft - 0.02, x, y - 0.02, 0.03, ALU, { holes: 1 }); q.rect(x - 0.06, y - 0.018, 0.13, 0.036, CW.g, 0.012); q.motor(x - 0.02, y - 0.03, -PI / 2, 0.08, 0.024);
      if (pn === 'color') { q.rect(x + 0.07, y - 0.012, 0.035, 0.03, '#15181c', 0.006, K.EDGE); q.circ(x + 0.1, y + 0.003, 0.008, '#4ad3ff', 0); }
    });
    if (end && end !== 'none') k.L(4.6, 'endgame', q => {
      const h = top - ft - 0.1;
      tele(q, 0.02, ft - 0.02, h, { st: low ? 3 : 2, dir: 1, w: 0.05 });
      if (end === 'level') { const y = ft - 0.02 + h * (low ? 1.14 : 1.07) + 0.012; q.rect(-0.06, y - 0.012, 0.2, 0.026, DARK2, 0.008); q.wheel(-0.03, y, 0.016, 'pul'); q.wheel(0.11, y, 0.016, 'pul'); }       // the hook rides a carriage along the bar
      if (end === 'buddy') { q.bar([[-0.44, ft + 0.03], [-0.5, ft + 0.3], [-0.56, ft + 0.3]], 0.03, c1); q.bar([[-0.36, ft + 0.03], [-0.4, ft + 0.22]], 0.022, ALU); q.wheel(-0.44, ft + 0.03, 0.022, 'pul'); }       // a bar a partner hooks on to
    });
    cams(k, [sh === 'turret' ? [-0.16, (low ? ft + 0.39 : 0.93) + 0.05, 1, 1] : [0.24, ft + 0.26], [-0.38, ft + 0.1, -1]]);
  };

  // ================================================================ 2019 DESTINATION: DEEP SPACE
  // An elevator (sometimes on a turret) carries a hatch plate and a cargo roller; the climbers are stilts and ramps.
  SIDE[2019] = function (k, c) {
    const g = k.g, ft = g.ft, c1 = k.c1, c2 = k.c2, lift = c.scorer, eff = c.effector, it = c.intake, end = c.endgame;
    let head = null, ha = 0, cam = [0.2, ft + 0.14];
    if (lift === 'elev' || lift === 'elevfast') { const f = lift === 'elevfast', M = mast(g, 0.1, 0.1, f ? 1.2 : 1.14, { st: 3, car: f ? 0.3 : 0.24, brace: [[-0.3, 0.4]], rig: f ? 'belt' : 'chain' }); head = [M.car[0] + 0.07, M.car[1]]; cam = [0.02, 0.6];
      k.L(3, 'scorer', q => M.draw(q));
      if (f) { const p0 = M.car, p = along(p0, 20 * D, 0.2); k.L(4, 'scorer', q => { q.tube(p0[0], p0[1], p[0], p[1], 0.04, ALU, { holes: 1 }); q.wheel(p0[0], p0[1], 0.034, 'gear'); }); head = p; }
    } else if (lift === 'turretlift') { const M = mast(g, -0.04, ft + 0.07, 1.0, { st: 2, car: 0.62, w: 0.06 }), p0 = M.car, e = along(p0, 150 * D, 0.2), p = along(e, 12 * D, 0.46); head = p; cam = [-0.1, 0.9, 1, 1];
      k.L(3, 'scorer', q => { ring(q, -0.04, ft + 0.03, 0.52); M.draw(q); });
      k.L(4, 'scorer', q => { q.tube(p0[0], p0[1], e[0], e[1], 0.045, c1, { holes: 1 }); q.tube(e[0], e[1], p[0], p[1], 0.04, ALU, { holes: 1 }); q.wheel(e[0], e[1], 0.034, 'spr'); q.wheel(p0[0], p0[1], 0.04, 'spr'); });   // the arm on the carriage, folded back on itself
    } else if (lift === 'arm') { const P = [-0.1, 0.74], tip = along(P, -14 * D, 0.5); head = tip; cam = [-0.02, 0.48];
      k.L(3, 'scorer', q => { tower(q, -0.38, 0.16, ft - 0.02, P[0], P[1], c1); q.chain(P[0], P[1], 0.055, -0.22, ft + 0.05, 0.022); q.motor(-0.32, ft + 0.05, 0, 0.11, 0.03, ALU2); });
      k.L(4, 'scorer', q => { const b = along(P, -14 * D + PI, 0.1); q.tube(b[0], b[1], tip[0], tip[1], 0.05, c1, { holes: 1 }); q.wheel(P[0], P[1], 0.058, 'spr'); });
    } else if (lift === 'low') { head = [0.36, ft + 0.24]; k.L(3, 'scorer', q => { q.tube(0.26, ft - 0.02, 0.32, ft + 0.26, 0.045, c1, { holes: 1 }); q.tube(0.06, ft - 0.02, 0.3, ft + 0.2, 0.035, c1); }); }
    if (eff) {
      if (!head) { head = [0.34, ft + 0.26]; k.L(3, 'effector', q => q.tube(0.26, ft - 0.02, 0.3, ft + 0.26, 0.04, c1, { holes: 1 })); }
      const H = head;
      k.L(4.4, 'effector', q => q.at(H[0], H[1], ha, t => {
        t.bar([[0, 0.05], [0.09, 0.05]], 0.018, ALU2); t.bar([[0, -0.05], [0.09, -0.05]], 0.018, ALU2);
        t.rect(0.09, -0.14, 0.022, 0.28, eff === 'plate' ? '#d8dde2' : DARK2, 0.004);                                       // the plate a hatch panel sticks to
        if (eff === 'plate') [-0.09, 0, 0.09].forEach(y => t.rect(0.112, y - 0.025, 0.012, 0.05, '#1b1e22', 0, 0));          // hook-and-loop strips
        else { t.bar([[0.02, 0.1], [0.13, 0.2], [0.26, 0.19]], 0.026, DARK2); t.wheel(0.26, 0.19, 0.034, 'comp', CW.g); t.wheel(0.15, 0.2, 0.026, 'comp', CW.g); t.belt(0.26, 0.19, 0.012, 0.15, 0.2, 0.012);   // the cargo roller above it
          if (eff === 'active') { t.poly([[0.112, 0.03], [0.24, 0.006], [0.24, -0.006], [0.112, -0.03]], c2); t.piston(0.0, -0.02, 0.1, -0.02, 0.022, 0.5); } }   // a beak that opens inside the hatch
      }));
    }
    if (it === 'ground') k.L(4, 'intake', q => overIntake(q, { px: 0.36, py: ft + 0.08, ex: 0.7, ey: 0.2, n: 1, r: 0.052, wc: CW.g, four: 1 }));
    else if (it === 'floor') k.L(4, 'intake', q => { overIntake(q, { px: 0.36, py: ft + 0.08, ex: 0.69, ey: 0.2, n: 1, r: 0.048, wc: CW.g, gear: 1 }); q.bar([[0.4, ft + 0.02], [0.56, 0.05], [0.78, 0.03]], 0.02, ALU2); q.wheel(0.6, 0.065, 0.022, 'roll'); });   // and a fork that slides under a hatch on the floor
    if (end && end !== 'none') {
      if (end === 'l2') k.L(4.6, 'endgame', q => { [-0.4, 0.26].forEach(x => { q.tube(x, ft - 0.04, x, ft + 0.2, 0.04, '#aab3bc'); q.rect(x - 0.016, ft + 0.2, 0.032, 0.02, DARK, 0.004); }); });   // short air cylinders that jack the robot up
      else k.L(4.6, 'endgame', q => {                                                 // stilts: racks that push the robot up to Level 3
        [[-0.4, 0.74], [0.24, 0.6]].forEach((p, i) => { q.tube(p[0], ft - 0.05, p[0], p[1], 0.045, ALU, { holes: 1, pitch: 0.05 }); q.line([[p[0] + 0.03, ft], [p[0] + 0.03, p[1] - 0.02]], '#6b7580', 0.008, [0.008, 0.008]); q.wheel(p[0] + 0.045, ft + 0.06, 0.03, 'gear'); if (!i) q.motor(p[0] + 0.08, ft + 0.06, 0, 0.1, 0.028, ALU2); });
        if (end === 'l3buddy' || end === 'l3triple') { q.plate([[-0.5, ft + 0.02], [-0.47, ft + 0.02], [-0.6, 0.78], [-0.66, 0.76]], ALU2, 0); q.line([[-0.5, ft + 0.06], [-0.64, 0.74]], 'rgba(8,10,13,0.5)', 0.012, [0.05, 0.03]); q.wheel(-0.485, ft + 0.02, 0.02, 'pul'); }   // a ramp for a partner, folded up
        if (end === 'l3triple') { q.plate([[-0.42, ft + 0.3], [-0.39, ft + 0.3], [-0.47, 0.92], [-0.52, 0.9]], ALU2, 0); q.line([[-0.41, ft + 0.34], [-0.5, 0.88]], 'rgba(8,10,13,0.5)', 0.012, [0.05, 0.03]); }
      });
      if (end !== 'l2') k.L(6.6, 'endgame', q => [[-0.4], [0.24]].forEach(p => q.wheel(p[0], 0.028, 0.026, 'roll')));       // the stilts' feet show under the bumper
    }
    cams(k, [cam, [-0.3, ft + 0.12, -1]]);
  };

  // ================================================================ 2018 FIRST POWER UP
  // A tall elevator with a claw on the carriage (or just an arm for the Switch); a hook on a strap; forks for a partner.
  SIDE[2018] = function (k, c) {
    const g = k.g, ft = g.ft, c1 = k.c1, c2 = k.c2, lift = c.scorer, eff = c.effector, it = c.intake, end = c.endgame;
    let head = null, ha = 0, hookAt = null, cam = [0.26, ft + 0.14];
    if (lift === 'elev' || lift === 'elevfast') { const f = lift === 'elevfast', M = mast(g, 0.08, 0.12, f ? 1.1 : 1.14, { st: f ? 3 : 2, car: 0.16, w: 0.07, brace: [[-0.4, 0.46], [0.4, 0.2]], rig: f ? 'belt' : 'chain' }); head = [M.car[0] + 0.06, M.car[1]]; hookAt = [M.top[0] - 0.01, M.top[1] + (f ? 0.14 : 0.09)]; cam = [-0.02, 0.56];
      k.L(3, 'scorer', q => { M.draw(q); q.motor(-0.12, ft + 0.05, 0, 0.13, 0.032, ALU2); q.motor(-0.12, ft + 0.12, 0, 0.13, 0.032, ALU2); });
      if (f) { const p0 = M.car, p = along(p0, 38 * D, 0.2); k.L(4, 'scorer', q => { q.tube(p0[0], p0[1], p[0], p[1], 0.045, ALU, { holes: 1 }); q.wheel(p0[0], p0[1], 0.036, 'spr'); }); head = p; ha = -0.2; }
    } else if (lift === 'low') { const P = [-0.16, 0.66], a = -6 * D, tip = along(P, a, 0.5); head = tip; cam = [-0.04, 0.42];
      k.L(3, 'scorer', q => { tower(q, -0.42, 0.1, ft - 0.02, P[0], P[1], c1); q.chain(P[0], P[1], 0.06, -0.26, ft + 0.06, 0.024); q.motor(-0.36, ft + 0.06, 0, 0.13, 0.032, ALU2); });
      k.L(4, 'scorer', q => { const b = along(P, a + PI, 0.1); q.tube(b[0], b[1], tip[0], tip[1], 0.055, c1, { truss: 1 }); q.wheel(P[0], P[1], 0.062, 'spr'); });
    }
    if (eff) {
      if (!head) { head = [0.22, ft + 0.22]; k.L(3, 'effector', q => q.tube(0.14, ft - 0.02, 0.18, ft + 0.22, 0.045, c1, { holes: 1 })); }
      const H = head, A = ha;
      k.L(4.4, 'effector', q => q.at(H[0], H[1], A, t => {
        t.rect(-0.04, -0.07, 0.08, 0.14, DARK2, 0.01);
        if (eff === 'pinch') { t.piston(0.0, 0, 0.16, 0, 0.032, 0.55); t.bar([[0.02, 0.06], [0.36, 0.06]], 0.024, ALU2); t.bar([[0.02, -0.06], [0.36, -0.06]], 0.024, ALU2); t.line([[0.22, 0.046], [0.36, 0.046]], '#1b1e22', 0.012); t.line([[0.22, -0.046], [0.36, -0.046]], '#1b1e22', 0.012); return; }   // two flat fingers squeeze the cube
        const ln = eff === 'launch';
        t.bar([[0, 0.02], [0.14, 0.07], [0.36, 0.06]], 0.034, DARK2); t.bar([[0, -0.02], [0.14, -0.07], [0.36, -0.06]], 0.034, DARK2);
        [[0.34, 0.06], [0.34, -0.06], [0.2, 0.068], [0.2, -0.068]].forEach(p => t.wheel(p[0], p[1], 0.042, 'comp', CW.g)); t.belt(0.34, 0.06, 0.014, 0.2, 0.068, 0.014); t.belt(0.34, -0.06, 0.014, 0.2, -0.068, 0.014);
        if (ln) { t.piston(-0.02, 0, 0.14, 0, 0.034, 0.5); t.rect(0.14, -0.04, 0.02, 0.08, c2, 0.004); }                    // and a punch that throws it
      }));
    }
    if (it === 'wheeled' || it === 'wide') k.L(4, 'intake', q => { const w = it === 'wide';   // arms with wheels, down at the floor in front
      q.bar([[0.38, ft + 0.03], [0.52, 0.16], [w ? 0.8 : 0.72, 0.16]], 0.036, DARK2); (w ? [0.78, 0.66, 0.56] : [0.7, 0.58]).forEach((x, i) => q.wheel(x, 0.16, i ? 0.04 : 0.05, 'comp', CW.g)); q.wheel(0.38, ft + 0.03, 0.022, 'pul'); if (w) q.wheel(0.84, 0.2, 0.03, 'comp', CW.b); });
    if (end && end !== 'none') {
      k.L(4.6, 'endgame', q => {
        const b = hookAt || [-0.3, 1.14];
        if (!hookAt) q.tube(-0.32, ft - 0.02, -0.3, 1.1, 0.045, c1, { holes: 1 });
        q.bar([[b[0], b[1] - 0.14], b], 0.022, ALU); q.hook(b[0] + 0.036, b[1], 0.036, PI, -PI * 1.15, 0.022, c2);          // the hook that is left on the rung
        q.wheel(-0.3, ft + 0.03, 0.04, 'pul'); q.line([[-0.3, ft + 0.07], [b[0] - 0.01, b[1] - 0.1]], '#d3b24a', 0.008);   // its strap, back down to the winch
      });
      if (end === 'buddy') k.L(2, 'endgame', q => { [[-0.47, -0.6], [-0.41, -0.52]].forEach(p => q.tube(p[0], ft + 0.0, p[1], 0.9, 0.036, ALU, { holes: 1, pitch: 0.06 })); q.bar([[-0.45, ft + 0.3], [-0.56, 0.32]], 0.018, ALU2); q.wheel(-0.44, ft + 0.0, 0.024, 'pul'); });   // forks for a partner, folded up
    }
    cams(k, [cam, [-0.36, ft + 0.2, -1]]);
  };

  // ================================================================ 2017 FIRST STEAMWORKS
  // A box: a gear pocket at the front, a hopper of fuel with a shooter on top, a drum that winds the robot up a rope.
  SIDE[2017] = function (k, c) {
    const g = k.g, ft = g.ft, c1 = k.c1, c2 = k.c2, gear = c.scorer, fuel = c.fuel, end = c.endgame;
    const hx0 = -0.38, hx1 = 0.2, hy1 = fuel === 'mega' ? 0.72 : 0.64;
    if (fuel && fuel !== 'none') {
      k.L(2, 'fuel', q => {
        const mg = fuel === 'mega'; hopper(q, hx0, hx1, ft - 0.01, hy1, { fl: mg ? 0.0 : 0, fr: mg ? 0.0 : 0, post: c1 });
        for (let i = 1; i < 6; i++) q.line([[hx0, ft + (hy1 - ft) * i / 6], [hx1, ft + (hy1 - ft) * i / 6]], 'rgba(206,222,238,0.14)', 0.004);   // netting
        if (mg) { q.glass([[hx0, hy1], [hx0 - 0.1, hy1 + 0.24], [hx0 - 0.08, hy1 + 0.25], [hx0 + 0.02, hy1]]); q.glass([[hx1, hy1], [hx1 + 0.16, hy1 + 0.22], [hx1 + 0.14, hy1 + 0.24], [hx1 - 0.02, hy1]]); }   // flaps that fold out for more room
        q.wheel(hx0 + 0.2, ft + 0.08, 0.05, 'star', '#2f353c');                                                              // the agitator
      });
      if (fuel === 'dump') k.L(4, 'fuel', q => { q.bar([[hx0, ft + 0.02], [hx0 - 0.1, ft + 0.16]], 0.02, ALU); q.belt(hx0 + 0.3, ft + 0.03, 0.022, hx0 + 0.02, ft + 0.08, 0.022); q.wheel(hx0 + 0.02, ft + 0.08, 0.026, 'comp', CW.g); q.piston(hx0 + 0.1, ft + 0.3, hx0 - 0.07, ft + 0.14, 0.022); });   // a door at the bottom lets it roll out
      else k.L(4, 'fuel', q => { const mg = fuel === 'mega', sx = hx0 + 0.13, sy = hy1 - 0.02;
        q.belt(sx + 0.1, ft + 0.06, 0.022, sx + 0.05, sy - 0.16, 0.022); q.wheel(sx + 0.1, ft + 0.06, 0.022, 'pul');
        shooter(q, sx, sy, { r: 0.052, gap: 0.12, ang: 62 * D, hood: 1, two: mg, fc: CW.b }); });
    }
    if (gear) {
      k.L(4.2, 'scorer', q => {                                                       // the pocket a gear rides in, open to the peg
        if (gear === 'floor') { overIntake(q, { px: 0.36, py: ft + 0.07, ex: 0.68, ey: 0.13, rise: 0.09, n: 2, sp: 0.42, r: 0.036, wc: CW.o, wc2: CW.k, gear: 1 }); q.glass([[0.4, ft + 0.02], [0.62, 0.2], [0.72, 0.42], [0.6, 0.44], [0.42, ft + 0.2]]); return; }
        q.tube(0.3, ft - 0.02, 0.3, ft + 0.36, 0.036, c1, { holes: 1 });
        q.glass([[0.3, ft + 0.02], [0.47, ft + 0.02], [0.5, ft + 0.36], [0.3, ft + 0.36]]); q.bar([[0.47, ft + 0.02], [0.5, ft + 0.36]], 0.012, ALU2); q.line([[0.4, ft + 0.06], [0.4, ft + 0.3]], 'rgba(8,10,13,0.6)', 0.016);
        if (gear === 'active') { q.piston(0.16, ft + 0.2, 0.38, ft + 0.2, 0.03, 0.55); q.bar([[0.44, ft + 0.3], [0.52, ft + 0.26]], 0.018, c2); q.bar([[0.44, ft + 0.1], [0.52, ft + 0.14]], 0.018, c2); }   // fingers that push it on to the peg
      });
    }
    if (end && end !== 'none') k.L(4.6, 'endgame', q => {                             // the rope climber: a drum high on two plates
      const fast = end === 'fast', P = [0.1, fuel && fuel !== 'none' ? hy1 + 0.12 : 0.76];
      q.plate([[P[0] - 0.14, ft - 0.02], [P[0] + 0.12, ft - 0.02], [P[0] + 0.06, P[1] + 0.07], [P[0] - 0.06, P[1] + 0.07]], c1 === ALU ? ALU2 : c1, { f: 0.3 });
      q.wheel(P[0], P[1], fast ? 0.062 : 0.05, fast ? 'star' : 'roll', fast ? c2 : '#3a4149'); if (!fast) [-0.02, 0.02].forEach(d => q.line([[P[0] + d, P[1] - 0.045], [P[0] + d, P[1] + 0.045]], '#d3b24a', 0.008));
      q.chain(P[0], P[1], 0.03, P[0] - 0.04, ft + 0.2, 0.04); q.wheel(P[0] - 0.04, ft + 0.2, 0.045, 'gear'); q.motor(P[0] - 0.2, ft + 0.2, 0, 0.14, 0.034, ALU2);
      if (fast) { q.bar([[P[0] - 0.05, P[1] + 0.06], [P[0] - 0.12, P[1] + 0.16]], 0.016, ALU); q.bar([[P[0] + 0.05, P[1] + 0.06], [P[0] + 0.12, P[1] + 0.16]], 0.016, ALU); }   // prongs that guide the rope in
    });
    cams(k, [[0.24, ft + 0.5], [-0.4, ft + 0.3, -1]]);
  };

  // ================================================================ 2016 FIRST STRONGHOLD
  // Low enough for the low bar, on big air-filled tyres: a roller arm out front, a shooter folded down, a hook to scale.
  SIDE[2016] = function (k, c) {
    const g = k.g, ft = g.ft, low = k.lk.frame === 'low', c1 = k.c1, c2 = k.c2, it = c.intake, sh = c.scorer, end = c.endgame, plate = c1 === ALU ? ALU2 : c1;
    // the side plates over the wheels; a tall robot carries a tower as well
    k.L(2.5, 'frame', q => { q.plate([[-0.45, ft - 0.02], [0.32, ft - 0.02], [0.24, ft + 0.12], [-0.4, ft + 0.14]], plate, { f: 0.3 }); if (!low) { const ty = sh && sh !== 'low' ? 0.86 : 0.62; q.tube(-0.4, ft + 0.1, -0.16, ty, 0.05, c1, { truss: 1 }); q.tube(0.14, ft + 0.08, -0.1, ty, 0.05, c1, { holes: 1 }); q.tube(-0.2, ty, -0.04, ty, 0.05, c1); } });
    if (sh === 'low') k.L(3, 'scorer', q => { q.glass([[-0.06, ft + 0.02], [0.3, ft + 0.02], [0.3, ft + 0.17], [-0.02, ft + 0.14]]); q.wheel(0.06, ft + 0.14, 0.032, 'comp', CW.g); q.wheel(0.2, ft + 0.16, 0.032, 'comp', CW.g); });   // rollers hold the boulder and spit it into the low goal
    else if (sh) k.L(4, 'scorer', q => {
      const tur = sh === 'turret', sx = low ? -0.1 : -0.12, sy = low ? ft + (tur ? 0.1 : 0.075) : 0.72;
      if (tur) ring(q, sx - 0.02, low ? ft - 0.0 : 0.56, 0.42);
      shooter(q, sx, sy, { r: low ? 0.055 : 0.066, gap: low ? 0.085 : 0.2, ang: (low ? 28 : 50) * D, sweep: low ? 1.2 : 1.6, hood: sh === 'batter' ? 1 : 2, two: sh === 'batter' && !low, feed: low ? 0 : 1 });
      if (sh !== 'batter' && !low) q.piston(sx + 0.12, sy - 0.3, sx - 0.14, sy - 0.02, 0.024);                             // the actuator that sets the hood
    });
    if (it) k.L(4.2, 'intake', q => {
      if (it === 'fixed') { q.plate([[0.28, ft - 0.02], [0.56, ft], [0.6, ft + 0.1], [0.3, ft + 0.14]], DARK2, 0); q.wheel(0.55, ft + 0.05, 0.04, 'comp', CW.g); q.wheel(0.44, ft + 0.09, 0.034, 'comp', CW.k); return; }
      const P = [0.14, ft + 0.1], E = [0.74, 0.2];
      q.bar([P, [0.5, ft + 0.14], E], 0.044, c1 === ALU ? ALU2 : c1); [1, 0.72, 0.44].forEach((t, i) => q.wheel(0.5 + (E[0] - 0.5) * t, ft + 0.14 + (E[1] - ft - 0.14) * t, i ? 0.034 : 0.042, 'comp', CW.g)); q.wheel(P[0], P[1], 0.03, 'spr'); q.piston(0.0, ft + 0.03, 0.34, ft + 0.115, 0.024);
      if (it === 'hook') q.hook(E[0] + 0.03, E[1] + 0.06, 0.05, -PI * 0.7, PI * 1.25, 0.018, '#e9edf1');                    // a hook for the doors and the portcullis
    });
    if (end === 'scale') k.L(4.6, 'endgame', q => {
      if (low) { const P = [-0.4, ft + 0.16], T = along(P, 4 * D, 0.62); q.tube(P[0] + 0.2, P[1] + 0.014, T[0], T[1], 0.03, STEEL, { holes: 1, pitch: 0.06 }); q.tube(P[0], P[1], P[0] + 0.4, P[1] + 0.028, 0.044, ALU, { holes: 1 }); q.hook(T[0], T[1] - 0.034, 0.034, PI / 2, -PI * 1.15, 0.018, c2); q.wheel(P[0], P[1], 0.03, 'pul'); q.wheel(-0.3, ft + 0.05, 0.036, 'pul'); }   // folded flat to pass the low bar
      else tele(q, -0.4, ft + 0.02, 0.7, { st: 2, dir: -1 });
    });
    cams(k, [sh === 'turret' ? [(low ? -0.1 : -0.12) + 0.1, low ? ft + 0.15 : 0.78, 1, 1] : [low ? 0.22 : -0.02, low ? ft + 0.12 : 0.6], [-0.38, ft + 0.18, -1]]);
  };

  // ================================================================ the fantasy seasons
  // [the real season whose parts are used, { fantasy subsystem: { $: the real subsystem (if named differently), fantasy concept: real concept } }, { extra real parts }]
  const sameShooter = { dump: 'dump', fixed: 'fender', hood: 'hood', turret: 'turret' };
  ALIAS[2101] = [[2022, { intake: { lane: 'term', over: 'over', wide: 'pivot', catch: 'pivot' }, scorer: Object.assign({ twin: 'turret' }, sameShooter), endgame: { hook: 'mid', level: 'high' } }]];
  ALIAS[2102] = [[2018, { intake: { floor: 'wheeled', wide: 'wide', roll: 'wide' }, scorer: { low: 'low', arm: 'low', elev: 'elev', tip: 'elevfast' }, endgame: { low: 'hook', high: 'hook' } }, { effector: ['scorer', 'roller'] }], [2022, { scorer: { lob: 'fender' } }]];
  ALIAS[2103] = [[2024, { intake: { floor: 'otb', wide: 'otb', touch: 'utb' }, scorer: { push: 'sub', fixed: 'sub', adj: 'pivot', turret: 'turret', orbit: 'turret' }, endgame: { hook: 'chain', latch: 'chaintrap' } }]];
  ALIAS[2104] = [[2025, { intake: { floor: 'ground', wide: 'ground' }, scorer: { arm2: 'arm', elev3: 'elev', elev4: 'elev', fast4: 'elevw', twin: 'elevw' } }, { effector: ['scorer', 'roller'] }], [2022, { endgame: { r1: 'mid', r2: 'high', r3: 'trav' } }]];
  ALIAS[2105] = [[2020, { intake: { bay: 'bay', over: 'over', wide: 'wide' }, scorer: { dump: 'dump', fixed: 'fixed', hood: 'hood', turret: 'turret' }, spinner: { $: 'panel', roller: 'spin', torque: 'color', side: 'color' }, endgame: { clamp: 'hook', climb: 'level' } }]];
  ALIAS[2106] = [[2024, { intake: { floor: 'otb', two: 'otb' }, scorer: { push: 'sub', launch: 'sub', hammer: 'pivot', curl: 'turret' }, endgame: { winch: 'chain' } }]];
  ALIAS[2107] = [[2018, { intake: { floor: 'wheeled', wide: 'wide' }, scorer: { t1: 'low', t2: 'low', t3: 'elev', fast: 'elevfast', double: 'elevfast' }, endgame: { hook: 'hook', fast: 'hook' } }, { effector: ['scorer', 'roller'] }]];
  ALIAS[2108] = [[2026, { intake: { narrow: 'ground', wide: 'wide', sort: 'wide', sweep: 'slide' }, scorer: { dump: 'dumper', lob: 'fixed', hood: 'hood', turret: 'turret' }, endgame: { hook: 'l1', winch: 'l2' } }, { hopper: ['intake', 'small'] }]];
  ALIAS[2109] = [[2023, { intake: { floor: 'gcube', two: 'gall' }, scorer: { drop: 'sja', tall: 'sja', fast: 'elevw', stack: 'elevw' } }, { effector: ['scorer', 'roller'] }], [2022, { endgame: { hook: 'mid', fast: 'high' } }]];
  ALIAS[2110] = [[2019, { intake: { floor: 'ground', wide: 'ground' }, scorer: { low: 'low', arm: 'arm', fast: 'elevfast' }, panel: { $: 'effector', fork: 'plate', mag: 'combo' } }, { effector: ['scorer', 'plate'] }], [2022, { endgame: { hook: 'mid' } }]];
})();
