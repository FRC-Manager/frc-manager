'use strict';
/* FRC Manager — season rules for the match engine (2022–2026) */
(function () {
  const U = G.U, E = G.Engine, FW = E.FW, FH = E.FH;
  const H = E.H;
  const Rules = G.Rules = {};
  const leavePt = (r, d) => ({ x: U.clamp(r.sx + (r.a === 'blue' ? d : -d), 0.6, FW - 0.6), y: r.sy });
  const zoneOf = (m, a, x0, x1, y0, y1) => {
    const p = E.P(m, a, x0, y0), q = E.P(m, a, x1, y1);
    return { x0: Math.min(p.x, q.x), x1: Math.max(p.x, q.x), y0: Math.min(p.y, q.y), y1: Math.max(p.y, q.y) };
  };
  const claimNearest = (r, list) => {
    let best = null, bd = 1e9;
    for (const p of list) if (!p.claimed) { const d = E.dist(r, p); if (d < bd) { bd = d; best = p; } }
    if (best) best.claimed = true;
    return best;
  };
  // a robot's position in its own alliance's field coordinates (E.P is its own inverse)
  const loc = (m, r) => E.P(m, r.a, r.x, r.y), RR = E.RR;
  // a robot standing still (disabled, tipped, scoring) across the straight run from a to b: a crossing lane it blocks
  const laneBlocked = (m, r, a, b) => (m.robs || []).some(o => {
    if (o.bot === r) return false;
    const dx = b.x - a.x, dy = b.y - a.y, k = U.clamp(((o.x - a.x) * dx + (o.y - a.y) * dy) / (dx * dx + dy * dy || 1e-6), 0, 1);
    return Math.hypot(o.x - a.x - dx * k, o.y - a.y - dy * k) < 2 * RR;
  });
  // an alliance puts its two best human players where the game pieces are handled: their average is its human-player skill
  const setHp = m => { m.hp = {}; ['red', 'blue'].forEach(a => { const h = m.robots.filter(r => r.a === a).map(r => r.drv.hp || 40).sort((p, q) => q - p); m.hp[a] = Math.max(40, Math.round(((h[0] || 40) + (h[1] == null ? h[0] || 40 : h[1])) / 2)); }); };

  // =====================================================================
  // 2022 RAPID REACT
  // =====================================================================
  // a dual-side intake takes cargo from either end without turning round; a motorized pivot intake drops onto cargo
  // that is still bouncing (ground22) and takes it a little quicker
  const DUAL22 = 0.85, PIVOT22 = 0.93;
  // The field is turned: the centre line crosses it at about 66° to the guardrail, the Hub's four arms (its exits) run
  // along and across that line, and its fenders face between them (21°, 111°, 201° and 291°, measured with y pointing
  // down). Each alliance has the two Tarmacs in front of the fenders on its side of the line (blue: 111° and 201°):
  // pentagons 3.89 m wide and 2.15 m deep from the fender face (0.86 m from the Hub's centre). Staged cargo sits on a
  // 3.885 m ring at 9.75° + 22.5° steps, about 1 m beyond the Tarmac edges.
  const F22 = { arm: 66, fen: [21, 111, 201, 291], own: [111, 201], fend: 0.86, tw: 1.945, tu: 2.228, apex: 3.01, ring: 3.885, cargo: [54.75, 99.75, 144.75, 212.25, 257.25, 347.25] };
  Rules.F22 = F22;
  const rad22 = d => d * Math.PI / 180;
  // a point in a Tarmac's own frame (u out from the fender, v across it) for fender normal n (degrees)
  const tarPt22 = (c, n, u, v) => { const g = rad22(n); return { x: c.x + Math.cos(g) * u - Math.sin(g) * v, y: c.y + Math.sin(g) * u + Math.cos(g) * v }; };
  // q (in the alliance's own coordinates) inside one of its Tarmacs, grown by pad
  function inTarmac22(m, q, pad) {
    const c = m.hub, eL = Math.hypot(F22.apex - F22.tu, F22.tw), nu = F22.tw / eL, nv = (F22.apex - F22.tu) / eL;
    for (const n of F22.own) {
      const g = rad22(n), dx = q.x - c.x, dy = q.y - c.y, u = dx * Math.cos(g) + dy * Math.sin(g), v = Math.abs(-dx * Math.sin(g) + dy * Math.cos(g));
      if (u > F22.fend - pad && v - u <= F22.tw - F22.tu + pad * Math.SQRT2 && (u - F22.apex) * nu + v * nv <= pad) return true;
    }
    return false;
  }
  // p on alliance a's side of the centre line (G210: in AUTO, no touching staged cargo on the other side)
  const ownSide22 = (m, a, p) => { const q = E.P(m, a, p.x, p.y), g = rad22(F22.arm + 90); return (q.x - m.hub.x) * Math.cos(g) + (q.y - m.hub.y) * Math.sin(g) > 0; };
  // a lower-hub scorer drives up to the nearest fender face (two robots fit side by side at one)
  function fender22(m, r) {
    const h = m.hub, g = Math.atan2(r.y - h.y, r.x - h.x) * 180 / Math.PI;
    let n = F22.fen[0], bd = 1e9;
    for (const f of F22.fen) { const d = Math.abs((((g - f) % 360) + 540) % 360 - 180); if (d < bd) { bd = d; n = f; } }
    const gn = rad22(n), v = U.clamp(-(r.x - h.x) * Math.sin(gn) + (r.y - h.y) * Math.cos(gn), -0.4, 0.4);
    return tarPt22(h, n, F22.fend + RR + 0.04, v);
  }
  // Cargo is tracked: it starts spread around the field, and every ball that is shot comes back out of the Hub
  // (scored cargo drops out of the four exits, misses bounce off) and rolls somewhere across the whole field.
  // Robots chase their own alliance's cargo wherever it ends up.
  function spawnCargo22(m, c, hit, upper) {
    const g = m.rng.range(0, Math.PI * 2), d = hit ? m.rng.range(2.2, 6.5) : m.rng.range(1.9, 4.5);
    const p = { x: U.clamp(m.hub.x + Math.cos(g) * d * 1.25, 0.6, FW - 0.6), y: U.clamp(m.hub.y + Math.sin(g) * d * 0.75, 0.45, FH - 0.45), c, t: m.t + (hit ? (upper ? 7 : 5) : 0.6) }; // the Hub's agitator: scored cargo is back in play about 7 s later (upper) or 5 s (lower); a miss at once
    const dh = E.dist(p, m.hub); if (dh < 2.0) { const k = 2.0 / (dh || 1); p.x = m.hub.x + (p.x - m.hub.x) * k; p.y = U.clamp(m.hub.y + (p.y - m.hub.y) * k, 0.45, FH - 0.45); }
    m.cargo.push(p);
  }
  function ground22(m, r) {
    let best = null, bv = 1e9;
    for (const p of m.cargo) {
      if (p.c !== r.a || p.t > m.t + (r.cap.catchBounce ? 1.5 : 0) || (p.claim && p.claim !== r.team && p.claimT > m.t)) continue;
      if (m.phase === 'auto' && !ownSide22(m, r.a, p)) continue; // G210
      const v = E.dist(r, p) + (E.dist(p, m.hub) < 1.9 ? 3 : 0);
      if (v < bv) { bv = v; best = p; }
    }
    return best;
  }
  function collect22(m, r, pt, kind) {
    if (kind === 'ground' && pt.c) { pt.claim = r.team; pt.claimT = m.t + 6; }
    H.moveTo(m, r, pt, () => {
      if (!H.canCollect(m, r)) return;
      if (kind === 'ground' && pt.c && !m.cargo.includes(pt)) return; // someone else got there first
      H.act(r, H.collectTime(m, r, kind, kind === 'ground' ? 1.15 * (r.cap.dualSide ? DUAL22 : r.cap.catchBounce ? PIVOT22 : 1) : 2.0), () => {
        if (kind === 'ground' && pt.c) { const i = m.cargo.indexOf(pt); if (i < 0) return; m.cargo.splice(i, 1); }
        r.held++; if (m.phase === 'auto') r.mem.got = (r.mem.got || 1) + 1;
      }, kind === 'ground' ? 'Intaking cargo' : 'Loading at terminal');
    }, kind === 'ground' ? 'To cargo' : 'To terminal');
  }
  function score22(m, r) {
    const c = r.cap, hub = m.hub;
    let upper = !!c.upper;
    if (c.upper && c.lower) {
      if (r.plan.target === 'lower') upper = false;
      else if (r.plan.target === 'auto') upper = 2 * H.hit(m, r, 0.84, 0.05) > 1.15 * H.hit(m, r, 1.12);
    }
    let spot = upper ? H.shootSpot(m, r, hub, null) : fender22(m, r);
    const d = E.dist(spot, hub);
    if (upper && d < 1.8) spot = { x: hub.x + (spot.x - hub.x) / (d || 1) * 1.8, y: hub.y + (spot.y - hub.y) / (d || 1) * 1.8 };
    H.moveTo(m, r, spot, () => {
      if (!H.canScore(m, r)) return;
      const n = r.held;
      H.act(r, H.aimTime(m, r) + n * H.scoreTime(m, r, upper ? 0.55 : 0.7), () => {
        let pts = 0;
        const pen = upper ? H.rangePen(m, r, hub) : 0, ss = m.ss[r.a];
        for (let i = 0; i < n; i++) {
          const hit = m.rng.chance(H.hit(m, r, upper ? 0.84 : 1.12, pen));
          r.stats.shots++; H.shotFx(m, r, hub, hit);
          spawnCargo22(m, r.a, hit, upper);
          if (hit) {
            r.stats.hits++;
            pts += m.phase === 'auto' ? (upper ? 4 : 2) : (upper ? 2 : 1);
            ss.cargo++; if (m.phase === 'auto') ss.autoCargo++;
            if (upper) ss.upper++; else ss.lower++;
          }
        }
        r.held = 0; r.stats.cycles++;
        if (pts) H.addPts(m, r, pts, '+' + pts, hub);
      }, upper ? 'Shooting upper hub' : 'Scoring lower hub');
    }, 'To shoot');
  }
  Rules[2022] = {
    leavePts: 2, tempo: { c: 3.3, s: 2.1 },
    endgame: { levels: [{ name: 'Low', pts: 4, time: 3 }, { name: 'Mid', pts: 6, time: 5, drop: 0.12 }, { name: 'High', pts: 10, time: 9, drop: 0.3 }, { name: 'Traversal', pts: 15, time: 13, drop: 0.45 }], park: 0 },
    // a direct traversal climber hangs on Traversal or not at all
    endLevel: (m, r) => (r.cap.directTrav ? (r.plan.endLevel == null || r.plan.endLevel >= 4 ? 4 : 0) : (r.cap.endLevel || 0)),
    init(m) {
      setHp(m);
      m.hub = { x: FW / 2, y: FH / 2 };
      // the Hub: fender faces 0.86 m out, the lower exits reaching 1.36 m out along the arms. Routes keep clear of the
      // exits; a robot can still drive right up to a fender.
      m.obs = [{ x: m.hub.x, y: m.hub.y, r: 1.85, h: 0.9 }].concat([0, 90, 180, 270].map(k => { const g = rad22(F22.arm + k); return { x: m.hub.x + Math.cos(g) * 1.15, y: m.hub.y + Math.sin(g) * 1.15, r: 0.5, h: 0.22 }; }));
      m.cargo = [];
      ['red', 'blue'].forEach(a => {
        // staged cargo: 6 per alliance on the ring round the Tarmacs (3 on each side of the centre line), 1 in front of its Terminal
        F22.cargo.forEach(deg => { const g = rad22(deg), p = E.P(m, a, m.hub.x + Math.cos(g) * F22.ring, m.hub.y + Math.sin(g) * F22.ring); m.cargo.push({ x: p.x, y: p.y, c: a, t: 0 }); });
        { const p = E.P(m, a, 1.14, 7.07); m.cargo.push({ x: p.x, y: p.y, c: a, t: 0 }); }
        m.ss[a] = { cargo: 0, autoCargo: 0, upper: 0, lower: 0, terminal: 5 };
      });
      m.robots.forEach(r => { r.held = (r.cap.upper || r.cap.lower) ? 1 : 0; });
    },
    // two robots on the Tarmac facing the alliance wall, one on the Tarmac facing the scoring table side
    start(m, r) { const k = [[201, 0.48], [201, -0.48], [111, 0.3]][r.slot] || [111, 0], p = tarPt22(m.hub, k[0], 2.1, k[1]); return E.P(m, r.a, p.x, p.y); },
    // TAXI: bumpers completely out of the Tarmac it started in
    leftCheck(m, r) { return !inTarmac22(m, loc(m, r), RR); },
    guard(m, a) { return E.P(m, a, 5.7, 4.1); },
    // G208: robots in their Hangar Zone in the last 30 s (checked first: a robot on the Low Rung hangs by the Launch Pads);
    // G207: robots touching their Launch Pad (on the two Hub-side Hangar legs)
    protect(m, r) {
      const q = loc(m, r);
      if (m.total - m.t <= 30 && q.x < 3.27 + RR && q.y < 2.95 + RR) return 'Hangar Zone';
      if (Math.hypot(q.x - 3.3, q.y - 0.25) < 0.6 || Math.hypot(q.x - 3.3, q.y - 2.7) < 0.6) return 'Launch Pad';
      return '';
    },
    autoDecide(m, r) {
      const max = m.S.autoPieces[r.cap.autoTier || 0];
      if (r.mem.got == null) r.mem.got = 1;
      if (!r.autoOK) { if (!r.left && !r.mem.tx) { r.mem.tx = 1; H.moveTo(m, r, leavePt(r, -1.8), null, 'Auto (struggling)'); } else r.label = 'Auto stalled'; return; }
      if (r.held > 0 && H.canScore(m, r) && (r.held >= (r.cap.storage || 1) || r.mem.got >= max || !r.cap.ground)) return score22(m, r);
      if (r.mem.got < max && r.cap.ground && H.canCollect(m, r) && m.T.auto - m.t > 2.5) {
        const p = ground22(m, r);
        if (p && E.dist(r, p) < 5.5) return collect22(m, r, p, 'ground');
      }
      if (r.held > 0 && H.canScore(m, r)) return score22(m, r);
      if (!r.left) H.moveTo(m, r, leavePt(r, -1.8), null, 'Taxi');
      else r.label = 'Auto done';
    },
    decide(m, r) {
      const c = r.cap, cap = c.storage || 1;
      if (!c.upper && !c.lower) { r.label = 'No scorer'; return; }
      if (r.held >= cap && H.canScore(m, r)) return score22(m, r);
      if (r.held < cap && H.canCollect(m, r)) {
        const gp = c.ground ? ground22(m, r) : null;
        if (r.held > 0) {
          if (gp && E.dist(r, gp) < 3.5) return collect22(m, r, gp, 'ground');
          if (H.canScore(m, r)) return score22(m, r);
        }
        if (gp) return collect22(m, r, gp, 'ground');
        // no loose cargo of our colour (or no ground intake): the human player feeds from the terminal
        return collect22(m, r, E.P(m, r.a, 1.37, 6.84), 'station');
      }
      if (r.held > 0 && H.canScore(m, r)) return score22(m, r);
      r.label = r.jam.intake ? 'Intake jammed' : r.jam.scorer ? 'Shooter jammed' : 'Waiting';
    },
    // under the rung it hangs from: Traversal 0.99 m from the alliance wall, then High, Mid (over the Shadow Line) and Low
    endSpot(m, r, lvl) { return E.P(m, r.a, [2.21, 3.08, 2.21, 1.6, 0.99][lvl || 0], [0.75, 1.47, 2.19][r.slot] || 1.47); },
    finishEnd(m) {
      m.robots.forEach(r => {
        if (r.end && r.end.lvl > 0 && !r.dead) { const p = this.endgame.levels[r.end.lvl - 1].pts; m.score[r.a].end += p; r.stats.pts += p; }
      });
    },
    hangPts(m, a) { return m.robots.filter(r => r.a === a && r.end && r.end.lvl > 0).reduce((s, r) => s + this.endgame.levels[r.end.lvl - 1].pts, 0); },
    bonus(m, a) {
      const ss = m.ss[a], thr = ss.autoCargo >= 5 ? 18 : 20, hang = this.hangPts(m, a);
      return [
        { key: 'cargo', name: 'Cargo Bonus', val: ss.cargo, thr, ok: ss.cargo >= thr, unit: 'cargo' },
        { key: 'hangar', name: 'Hangar Bonus', val: hang, thr: 16, ok: hang >= 16, unit: 'pts' }
      ];
    },
    hud(m, a) { const ss = m.ss[a]; return ss.autoCargo >= 5 ? ['QUINTET'] : []; }
  };

  // =====================================================================
  // 2023 CHARGED UP
  // =====================================================================
  const PT23 = { auto: [3, 4, 6], tele: [2, 3, 5] };
  const balOf = r => 0.6 * (r.cap.balance || 20) + 0.4 * (r.cap.agility || 30) + (r.cap.lowCG ? 6 : 0); // a low centre of gravity (pivoting telescope) sits steadier on the Charge Station
  const nodeType = (row, col) => row === 0 ? 'any' : ([1, 4, 7].includes(col) ? 'cube' : 'cone');
  const placeTime = (row, type) => [0.9, 1.4, 1.9][row] + (type === 'cone' ? 0.5 : 0);
  function rowLinks(g, row) { let n = 0, c = 0; while (c <= 6) { if (g[row * 9 + c] && g[row * 9 + c + 1] && g[row * 9 + c + 2]) { n++; c += 3; } else c++; } return n; }
  const countLinks = g => rowLinks(g, 0) + rowLinks(g, 1) + rowLinks(g, 2);
  const coopCount = g => { let n = 0; for (let row = 0; row < 3; row++) for (let c = 3; c <= 5; c++) if (g[row * 9 + c]) n++; return n; };
  function linkGain(g, row, col) {
    const before = rowLinks(g, row); g[row * 9 + col] = 9; const after = rowLinks(g, row); g[row * 9 + col] = 0;
    if (after > before) return 5;
    for (let s = Math.max(0, col - 2); s <= Math.min(6, col); s++) {
      let f = 0; for (let k = 0; k < 3; k++) if (g[row * 9 + s + k]) f++;
      if (f === 1) return 1.2;
    }
    return 0;
  }
  function chooseNode(m, r, heldType) {
    const g = m.ss[r.a].grid, c = r.cap, auto = m.phase === 'auto';
    let best = null, bv = -1;
    for (let row = 0; row < 3; row++) for (let col = 0; col < 9; col++) {
      const i = row * 9 + col; if (g[i]) continue;
      const nt = nodeType(row, col);
      for (const pt of (heldType ? [heldType] : ['cube', 'cone'])) {
        if (nt !== 'any' && nt !== pt) continue;
        if (pt === 'cone' && (!c.cones || (c.coneReach || 1) < row + 1)) continue;
        if (pt === 'cube' && (!c.cubes || (c.reach || 1) < row + 1)) continue;
        let val = (auto ? PT23.auto : PT23.tele)[row] + linkGain(g, row, col) * (r.plan.target === 'links' ? 2.5 : 1);
        if (col >= 3 && col <= 5 && coopCount(g) < 3) val += 1.2;
        if (r.plan.target === 'top' && row === 2) val += 3;
        if (r.plan.target === 'fast' && row === 0) val += 2.5;
        const fetch = pt === 'cone' && !c.groundCone ? 1.0 : 0;
        const ev = val * [0.98, 0.94, 0.88][row] * (pt === 'cone' ? 0.9 : 1) / (placeTime(row, pt) + 6 + fetch) + m.rng.next() * 0.01;
        if (ev > bv) { bv = ev; best = { i, row, col, type: pt }; }
      }
    }
    // a complete set of grids: every further piece SUPERCHARGES a node (3 points, no links), the quickest row it reaches
    if (!best && g.every(Boolean) && !auto) {
      for (const pt of (heldType ? [heldType] : ['cube', 'cone'])) {
        if (pt === 'cone' ? !c.cones : !c.cubes) continue;
        const col = pt === 'cube' ? 4 : 3, nb = { i: -1, row: 0, col: col + (r.slot - 1) * 3, type: pt, sup: true };
        if (!best || placeTime(0, pt) < placeTime(0, best.type)) best = nb;
      }
    }
    return best;
  }
  function place23(m, r, node) {
    const spot = E.P(m, r.a, 1.85, 0.5 + node.col * 0.56);
    H.moveTo(m, r, spot, () => {
      if (!H.canScore(m, r)) return;
      H.act(r, H.scoreTime(m, r, placeTime(node.row, r.heldType)), () => {
        const g = m.ss[r.a].grid;
        if (node.sup) { // SUPERCHARGED node
          r.stats.shots++;
          if (m.rng.chance(H.hit(m, r, 1.1))) { m.ss[r.a].sup = (m.ss[r.a].sup || 0) + 1; r.stats.hits++; r.stats.cycles++; H.addPts(m, r, 3, 'SUPERCHARGED +3', spot); r.held = 0; r.heldType = null; }
          r.mem.node = null; return;
        }
        if (g[node.i]) { r.mem.node = null; return; }
        r.stats.shots++;
        if (m.rng.chance(H.hit(m, r, [1.12, 1.04, 0.95][node.row] * (r.heldType === 'cone' ? 0.92 : 1)))) {
          g[node.i] = r.heldType === 'cone' ? 1 : 2; r.stats.hits++; r.stats.cycles++;
          const pts = (m.phase === 'auto' ? PT23.auto : PT23.tele)[node.row];
          H.addPts(m, r, pts, '+' + pts, spot);
          r.held = 0; r.heldType = null; r.mem.node = null;
        } else if (m.rng.chance(0.35)) { r.held = 0; r.heldType = null; r.mem.node = null; r.label = 'Dropped it'; }
      }, 'Placing ' + ['bottom', 'mid', 'top'][node.row] + ' ' + r.heldType);
    }, 'To grid');
  }
  function autoBalance(m, r) {
    H.moveTo(m, r, E.P(m, r.a, 3.9, 2.75), () => {
      H.act(r, 2.5 * (1.6 - balOf(r) / 100), () => {
        const eng = m.rng.chance(U.clamp(0.3 + 0.65 * balOf(r) / 100 + (r.tuneAuto || 0), 0.1, 0.97));
        const pts = eng ? 12 : 8;
        m.ss[r.a].autoCS = pts; H.addPts(m, r, pts, eng ? 'Engaged +12' : 'Docked +8');
        H.log(m, r.a, r.team + (eng ? ' engaged' : ' docked') + ' in auto', 'end');
        r.st = 'wait'; r.timer = 30; r.label = eng ? 'Engaged' : 'Docked';
      }, 'Auto-balancing');
    }, 'To charge station');
  }
  // 2023 zones, in an alliance's own coordinates (Figure 5-6). The Community is 4.91 m deep across the half with the
  // Charge Station and 3.36 m in the band next to the Barrier; the Loading Zone, at the far end, is 6.71 m deep along the
  // guardrail and 3.36 m next to the Barrier. pad: how far outside still counts (RR: a bumper partly in).
  const inComm23 = (q, pad) => q.y < 5.49 + pad && (q.x < 3.36 + pad || (q.y < 4.05 + pad && q.x < 4.91 + pad));
  const inLoad23 = (q, pad) => q.y > 5.49 - pad && (q.x > FW - 3.36 - pad || (q.y > 6.77 - pad && q.x > FW - 6.71 - pad));
  Rules.inComm23 = inComm23; Rules.inLoad23 = inLoad23;
  const inCommunity = (m, r) => inComm23(loc(m, r), 0);
  Rules[2023] = {
    leavePts: 3, tempo: { c: 2.9, s: 2.4 },
    leftCheck: (m, r) => Math.abs(r.x - r.sx) > 3.2,
    endgame: { levels: [{ name: 'Dock', pts: 6, time: (m, r) => 2.0 + 1.3 * m.robots.filter(x => x.a === r.a && x.endBusy && x.endLvl === 1 && x !== r).length, sure: true }], park: 2 },
    endLevel: (m, r) => balOf(r) >= 30 ? 1 : 0,
    init(m) {
      setHp(m);
      m.robots.forEach(r => {
        r.cap = Object.assign({}, r.cap, { endgame: balOf(r), endLevel: 1 });
        r.held = 1; r.heldType = (r.cap.cones && (r.cap.coneReach || 1) >= (r.cap.reach || 1)) ? 'cone' : 'cube';
      });
      m.obs = [{ x: 3.9, y: 2.75, r: 1.2 }, { x: FW - 3.9, y: 2.75, r: 1.2 }];
      ['red', 'blue'].forEach(a => {
        const staged = [0.92, 2.14, 3.36, 4.58].map(y => E.P(m, a, 7.07, y));
        const cand = H.alliance(m, a).filter(r => (r.cap.autoTier || 0) === 1).sort((p, q) => balOf(q) - balOf(p));
        m.ss[a] = { grid: new Array(27).fill(0), autoCS: 0, endCS: 0, staged, balancer: cand.length ? cand[0].team : null };
      });
    },
    start(m, r) { return E.P(m, r.a, 2.1, [0.8, 2.75, 4.7][r.slot]); },
    guard(m, a) { return E.P(m, a, 8.0, 5.8); },
    // G207: a robot inside its opponent's Community or Loading Zone may not contact anyone, so robots are safe in their own
    // (that covers the Charge Station endgame too)
    protect(m, r) {
      const q = loc(m, r);
      // G209: in the endgame a robot on its Charge Station may not be touched at all
      if (m.total - m.t <= 30 && (r.endBusy || r.climbing) && Math.abs(q.x - 3.94) < 0.97 + RR && Math.abs(q.y - 2.745) < 1.24 + RR) return 'Charge Station';
      if (inComm23(q, RR)) return 'Community';
      if (inLoad23(q, RR)) return 'Loading Zone';
      return '';
    },
    // G209: touching a robot on its Charge Station in the endgame makes it Docked and every Docked robot of its alliance
    // Engaged; reaching it means being in the opponent's Community, a foul as well (G207)
    onProtect(m, d, t, pz, H) {
      if (pz !== 'Charge Station') return false;
      if (!t.endCredit) { t.endCredit = 1; m.ss[t.a].csForce = true; H.log(m, d.a, d.team + ' touched ' + t.team + ' on its Charge Station: Docked and Engaged for its alliance', 'foul'); }
      H.foul(m, d, false, 'Community');
      return true;
    },
    autoDecide(m, r) {
      const ss = m.ss[r.a], max = m.S.autoPieces[r.cap.autoTier || 0];
      if (r.mem.got == null) r.mem.got = 1;
      if (!r.autoOK) { r.label = 'Auto failed'; return; }
      if (r.held && H.canScore(m, r)) { const node = chooseNode(m, r, r.heldType); if (node) return place23(m, r, node); }
      if (ss.balancer === r.team) { if (!r.mem.cs && m.T.auto - m.t > 3) { r.mem.cs = 1; return autoBalance(m, r); } r.label = 'Auto done'; return; }
      if (r.mem.got < max && r.cap.ground && H.canCollect(m, r) && m.T.auto - m.t > 4) {
        const p = claimNearest(r, ss.staged);
        if (p) { r.mem.got++; return H.moveTo(m, r, p, () => H.act(r, H.collectTime(m, r, 'ground', 0.9), () => { r.held = 1; r.heldType = 'cube'; }, 'Grabbing cube'), 'Auto: to staged piece'); }
      }
      if (!r.left) H.moveTo(m, r, E.P(m, r.a, 5.9, r.sy), null, 'Mobility');
      else r.label = 'Auto done';
    },
    decide(m, r) {
      const c = r.cap;
      if (r.held) {
        if (!H.canScore(m, r)) { r.label = 'Manipulator jammed'; return; }
        const node = (r.mem.node && !m.ss[r.a].grid[r.mem.node.i] && r.mem.node.type === r.heldType) ? r.mem.node : chooseNode(m, r, r.heldType);
        if (!node) { r.held = 0; r.heldType = null; return; }
        return place23(m, r, node);
      }
      if (!H.canCollect(m, r)) { r.label = 'Intake jammed'; return; }
      const node = chooseNode(m, r, null);
      if (!node) { r.label = 'Grid full'; return; }
      r.mem.node = node;
      const type = node.type, ground = c.ground && (type === 'cube' || c.groundCone);
      const pt = ground ? E.P(m, r.a, m.rng.range(12.6, 14.6), m.rng.range(5.9, 7.6)) : E.P(m, r.a, 15.95, 7.1);
      H.moveTo(m, r, pt, () => {
        if (!H.canCollect(m, r)) return;
        H.act(r, H.collectTime(m, r, ground ? 'ground' : 'station', ground ? 1.3 : 2.1, true) * (type === 'cone' && !c.coneAny ? 1.15 : 1), // a wristed gripper takes a cone however it lies
          () => { r.held = 1; r.heldType = type; }, 'Grabbing ' + type);
      }, 'To loading zone');
    },
    endSpot(m, r, lvl) { return lvl ? E.P(m, r.a, 3.9, 1.98 + r.slot * 0.8) : E.P(m, r.a, 2.3, 0.9 + r.slot * 1.5); },
    finishEnd(m) {
      ['red', 'blue'].forEach(a => {
        const ss = m.ss[a], rs = H.alliance(m, a);
        const docked = rs.filter(r => r.end && r.end.lvl === 1 && !r.dead);
        let eng = false, pts = 0;
        if (docked.length) {
          const avg = U.avg(docked.map(balOf));
          eng = ss.csForce || m.rng.chance(U.clamp((0.25 + 0.68 * avg / 100) * [1, 0.88, 0.7][docked.length - 1], 0.05, 0.97)); // csForce: G209
        }
        docked.forEach(r => { const v = eng ? 10 : 6; pts += v; r.stats.pts += v; r.end.eng = eng; }); // eng: scouts record docks that ended Engaged
        ss.endCS = pts; ss.engaged = eng;
        rs.forEach(r => { if (!docked.includes(r) && !r.dead && inCommunity(m, r) && r.end) { pts += 2; r.stats.pts += 2; } });
        m.score[a].end += pts;
        const L = countLinks(ss.grid); ss.links = L; m.score[a].tele += L * 5;
      });
    },
    bonus(m, a) {
      const ss = m.ss[a], g = ss.grid, og = m.ss[E.opp(a)].grid;
      const coop = coopCount(g) >= 3 && coopCount(og) >= 3, links = countLinks(g);
      const cs = ss.autoCS + (m.done ? ss.endCS : m.robots.filter(r => r.a === a && r.end && r.end.lvl === 1).length * 6);
      return [
        { key: 'sus', name: 'Sustainability', val: links, thr: coop ? 5 : 6, ok: links >= (coop ? 5 : 6), unit: 'links' }, // 6 links, 5 with Coopertition
        { key: 'act', name: 'Activation', val: cs, thr: 26, ok: cs >= 26, unit: 'pts' }
      ];
    },
    hud(m, a) { const ss = m.ss[a], og = m.ss[E.opp(a)].grid; const o = []; if (coopCount(ss.grid) >= 3 && coopCount(og) >= 3) o.push('COOPERTITION'); return o; },
    gridOf: (m, a) => m.ss[a].grid
  };

  // =====================================================================
  // 2024 CRESCENDO
  // =====================================================================
  const canAmp = r => !!(r.cap.amp || r.cap.ampViaShooter);
  // Amp through the shooter (no amp mechanism): ampViaShooter is how well the shooter does it. A fixed (subwoofer) shooter
  // lobs notes in slowly and misses a lot (0.55), pivot shooters are moderate (0.8), turrets a little behind them (0.75).
  const viaF = r => (r.cap.ampViaShooter === true ? 0.8 : r.cap.ampViaShooter || 0.55);
  const ampSpd24 = r => (r.cap.amp ? (r.cap.ampSkill || 45) + 30 : r.cap.scoreSpd * (viaF(r) - 0.05));
  // The amp specialist is the amp-capable robot that is not defending and has the weakest speaker game (re-picked live).
  function ampBotOf(m, a) {
    const rs = m.robots.filter(r => r.a === a && canAmp(r) && r.plan.role !== 'defend' && r.plan.role !== 'feed' && !r.dead && !r.perm.scorer);
    if (!rs.length) return null;
    // every shooter can put notes in the Amp, but a real amp mechanism is far better at it: the amp robot is the one that
    // gives up the least speaker scoring for the most amp ability
    const sp = r => (r.cap.speaker ? r.cap.accuracy + r.cap.scoreSpd + (r.cap.range || 0) : -50);
    const av = r => 2 * ampSpd24(r) - sp(r);
    return rs.sort((p, q) => av(q) - av(p))[0].team;
  }
  function useAmp24(m, r) {
    const ss = m.ss[r.a];
    if (!canAmp(r)) return false;
    if (!r.cap.speaker) return true;
    if (r.plan.target === 'amp') return true;
    if (r.plan.target === 'speaker' || m.phase === 'auto') return false;
    if (ss.ampUntil > m.t || ss.bank >= 2) return false;
    if (ampBotOf(m, r.a) === r.team) return true;
    // a partner with a real amp mechanism or a pivot/turret shooter helps arm Amplify when the amp robot alone would
    // leave the bank short (a fixed shooter's lob into the Amp is too slow to be worth it)
    const going = H.alliance(m, r.a).filter(x => x !== r && (x.label === 'To amp' || x.label === 'Scoring amp')).length;
    return ss.bank + going < 2 && (!!r.cap.amp || viaF(r) >= 0.75) && m.total - m.t > 30;
  }
  // AMPLIFY is the human player's button, not automatic. Two notes in the Amp arm it; a good human player at the Amp holds
  // it until the scorers are lined up at the Speaker with notes (or the fed pile is ready), so the 10 seconds catch
  // several 5-point notes. A beginner presses it as soon as it lights. The scorers hold their shot while they wait.
  const hpAmp24 = (m, a) => (m.hpTop && m.hpTop[a]) || (m.hp && m.hp[a]) || 50, GOODHP24 = 50;
  // how long a good human player holds the button for a second scorer (6 s, up to 18 s for the best); a beginner
  // presses it within a few seconds whoever is ready
  const ampPatience24 = (m, a) => { const hp = hpAmp24(m, a); return hp >= GOODHP24 ? 6 + 12 * (hp - GOODHP24) / 45 : U.clamp(1 + 3 * (hp - 30) / 20, 0.5, 4); };
  const shooters24 = (m, a) => H.alliance(m, a).filter(r => !r.dead && r.cap.speaker && !r.perm.scorer && r.plan.role !== 'defend' && r.plan.role !== 'feed');
  // scorers with a note at (or almost at) the Speaker, plus every two notes ready in the fed pile
  const linedUp24 = (m, a) => shooters24(m, a).filter(r => r.held && H.canScore(m, r) && (r.label === 'Waiting for Amplify' || E.dist(r, m.spk[a]) < (r.cap.rangeM || 1.5) + 1.5)).length
    + Math.floor(m.ss[a].pile.filter(n => n.t <= m.t).length / 2);
  function amplifyNow24(m, a) {
    const ss = m.ss[a], lined = linedUp24(m, a), waited = m.t - ss.readyT;
    if (m.total - m.t < 14) return true; // spend it before the endgame
    // an average human player presses for the first scorer at the Speaker; a beginner may not even wait for that
    if (hpAmp24(m, a) < GOODHP24) return lined >= 1 || (hpAmp24(m, a) < 42 && waited >= ampPatience24(m, a));
    if (lined >= Math.min(2, shooters24(m, a).length)) return true;
    return lined >= 1 && waited >= ampPatience24(m, a);
  }
  // a scorer at its spot while the bank is full and a good human player is holding the button: wait for it
  const holdAmp24 = (m, r) => { const ss = m.ss[r.a]; return m.phase === 'tele' && ss.bank >= 2 && !(ss.ampUntil > m.t) && hpAmp24(m, r.a) >= GOODHP24 && m.total - m.t > 14; };
  function speaker24(m, r) {
    const ss = m.ss[r.a], spk = m.spk[r.a];
    const spot = H.shootSpot(m, r, spk, m.zone[r.a]);
    H.moveTo(m, r, spot, () => {
      if (!H.canScore(m, r)) return;
      if (holdAmp24(m, r) && !r.mem.held24) { r.mem.held24 = 1; ss.waited = (ss.waited || 0) + 1; return H.waitUntil(r, () => ss.ampUntil > m.t || ss.bank < 2, () => speaker24(m, r), 'Waiting for Amplify', ampPatience24(m, r.a) + 0.5); }
      r.mem.held24 = 0;
      const t0 = m.t; // a note that leaves the shooter inside the 10 seconds counts (the field gives notes in flight 3 more seconds)
      H.act(r, H.aimTime(m, r) + H.scoreTime(m, r, 0.5), () => {
        const hit = m.rng.chance(H.hit(m, r, 1.0, H.rangePen(m, r, spk)));
        r.stats.shots++; H.shotFx(m, r, spk, hit);
        if (hit) {
          r.stats.hits++; r.stats.cycles++;
          let pts = 2;
          if (m.phase === 'auto') pts = 5;
          else if (ss.ampLeft > 0 && (ss.ampUntil > m.t || (ss.ampUntil > t0 && m.t - ss.ampUntil < 3))) { pts = 5; ss.ampLeft--; ss.ampScored++; if (ss.ampLeft <= 0) ss.ampUntil = 0; }
          ss.notes++; if (m.phase === 'auto') ss.autoNotes++;
          H.addPts(m, r, pts, '+' + pts, spk);
        }
        r.held = 0;
      }, 'Shooting speaker');
    }, 'To speaker');
  }
  function amp24(m, r) {
    const ss = m.ss[r.a], spot = m.ampSpot[r.a];
    H.moveTo(m, r, spot, () => {
      if (!H.canScore(m, r)) return;
      const skill = r.cap.amp ? (r.cap.ampSkill || 45) : r.cap.scoreSpd * (viaF(r) - 0.05);
      H.act(r, H.scoreTime(m, r, 1.1, skill), () => {
        r.stats.shots++;
        if (m.rng.chance(H.hit(m, r, 1.12, 0, r.cap.amp ? (r.cap.ampSkill || 45) : r.cap.accuracy * (viaF(r) + 0.05)))) {
          r.stats.hits++; r.stats.cycles++; ss.notes++; ss.ampNotes++;
          if (m.phase === 'auto') { ss.autoNotes++; H.addPts(m, r, 2, '+2', spot); }
          else { H.addPts(m, r, 1, '+1', spot); if (!(ss.ampUntil > m.t)) ss.bank = Math.min(2, ss.bank + 1); }
        }
        r.held = 0;
      }, 'Scoring amp');
    }, 'To amp');
  }
  // ---- Note feeding (real 2024 meta) ----
  // A robot can only hold one note, so strong alliances lob notes from the Source end into their own wing ("feeding").
  // The pile near the Speaker lets scorers cycle in seconds and stockpiles notes for AMPLIFY (5-point notes for 10 s).
  // A defender camping the Source smothers the feeder and cancels most of the gain. feedIQ (0..1) is the alliance's
  // grasp of the strategy: pass accuracy, pickup speed and self-passing.
  const canPass24 = r => !!r.cap.speaker && (r.cap.range || 0) >= 30 && !r.perm.scorer;
  const iq24 = (m, a) => m.feedIQ[a] || 0;
  // G414 (no full-court shots): a robot with any part of its bumpers in the opponent's Wing may not send a note into or
  // through its own Wing. The opponent's Wing line is 5.87 m from their wall, so a feeder at the Source drives out until
  // its bumpers are clear of that line (LAUNCH24) before it lobs a note home: a longer trip, and one a defender in the
  // lane can break up. A defended feeder can lob from where it is into the Neutral Zone instead: its partners drive out to
  // collect those notes, and the opponents may take them first.
  const WING24 = 5.87, LAUNCH24 = FW - WING24 - RR - 0.25;
  const inOppWing24 = (m, r) => loc(m, r).x > FW - WING24 - RR;
  const defended24 = (m, r) => !!r.defBy || m.robots.some(o => o.a !== r.a && !o.dead && o.st === 'defend' && o.defT === r && E.dist(o, r) < 2.2);
  function source24(m, r) {
    const ground = r.cap.ground;
    const pt = ground ? E.P(m, r.a, m.rng.range(13.4, 15.0), m.rng.range(0.9, 2.5)) : E.P(m, r.a, 15.45, 0.95);
    H.moveTo(m, r, pt, () => {
      if (!H.canCollect(m, r)) return;
      H.act(r, H.collectTime(m, r, ground ? 'ground' : 'station', ground ? 1.0 : 1.9, true), () => { r.held = 1; }, ground ? 'Intaking' : 'At source');
    }, 'To source');
  }
  // mode: undefined = drive out of the opponent's Wing first (G414), then lob home; 'here' = at the line already;
  // 'mid' = lob from where it is into the Neutral Zone
  function pass24(m, r, mode, tries) {
    const q = loc(m, r);
    tries = tries || 0;
    // pushed aside or sent to a free spot that is still past the line: drive out again (twice at most)
    if (mode === 'here' && q.x > LAUNCH24 + 0.25 && !r.mem.short24) mode = tries < 2 ? undefined : 'mid'; // still boxed in: lob to midfield
    if (!mode && q.x > LAUNCH24 + 0.25) {
      // a driver who misjudges the line stops with a bumper still over it: a FOUL when the note goes
      const short = tries === 0 && m.rng.chance(0.05 * (1 - (r.drv.aware == null ? 50 : r.drv.aware) / 100)) ? 0.75 : 0;
      r.mem.short24 = short > 0;
      const pt = E.P(m, r.a, LAUNCH24 - 0.15 * tries + short, U.clamp(q.y + (tries ? 0.8 : 0), 0.7, 3.0));
      return H.moveTo(m, r, pt, () => { if (r.held && H.canScore(m, r)) pass24(m, r, 'here', tries + 1); }, 'To the wing line');
    }
    r.mem.short24 = false;
    const ss = m.ss[r.a], mid = mode === 'mid', iq = iq24(m, r.a);
    const tgt = mid ? E.P(m, r.a, 6.6, U.clamp(q.y + 1.6, 2.2, 5.8)) : m.pileSpot[r.a];
    const fd = r.plan.role === 'feed' ? 0.75 : 1; // a dedicated feeder has its lob tuned and fires as it reaches the line
    H.act(r, (H.aimTime(m, r) * 0.55 + H.scoreTime(m, r, 0.4)) * fd, () => {
      if (!r.held) return;
      r.held = 0; r.stats.passes = (r.stats.passes || 0) + 1;
      // lobs are forgiving: accuracy comes from shooter range, the drive team and strategy read; a defender in contact spoils them
      const p = U.clamp(0.5 + 0.3 * (r.cap.range || 0) / 100 + 0.15 * r.cap.accuracy / 100 + 0.15 * iq + 0.1 * r.confK - (r.defBy ? 0.2 : 0), 0.2, 0.97);
      const ok = m.rng.chance(p), jit = ok ? 0.55 : 2.0;
      if (mid) {
        // into the Neutral Zone, short of the alliance's own Wing line: anyone may pick it up
        const o = E.P(m, r.a, U.clamp(6.6 + m.rng.range(-jit, jit), WING24 + 0.3, 9.6), U.clamp(tgt.y + m.rng.range(-jit, jit), 0.7, FH - 0.7));
        m.loose.push({ x: o.x, y: o.y, t: m.t + 1.4, a: r.a }); ss.midShots = (ss.midShots || 0) + 1;
        H.shotFx(m, r, o, ok);
        return;
      }
      if (inOppWing24(m, r)) {
        r.mem.g414 = (r.mem.g414 || 0) + 1;
        H.foul(m, r, false, 'G414: launched from the opponent\'s Wing');
        if (r.mem.g414 > 1) H.foul(m, r, true, 'G414 repeated');
      }
      const land = { x: U.clamp(tgt.x + m.rng.range(-jit, jit), 0.7, 9.0), y: U.clamp(tgt.y + m.rng.range(-jit, jit), 0.7, FH - 0.7), t: m.t + 1.3 };
      if (r.a === 'red') land.x = U.clamp(tgt.x + m.rng.range(-jit, jit), FW - 9.0, FW - 0.7);
      ss.pile.push(land); ss.fed++;
      H.shotFx(m, r, land, ok);
    }, mid ? 'Lobbing to midfield' : 'Feeding a note');
  }
  // a note lying in the Neutral Zone: partners go out for it, and an opponent takes it when it is closer than its Source
  function loosePick24(m, r) {
    if (!m.loose.length) return false;
    const src = E.P(m, r.a, 14.3, 1.5), ds = E.dist(r, src);
    let best = null, bd = 1e9;
    for (const n of m.loose) {
      if (n.t > m.t || (n.claim && n.claim !== r.team && n.claimT > m.t)) continue;
      const d = E.dist(r, n);
      if (n.a === r.a ? d > ds - 0.5 : (d > 0.8 * ds || d > 5.5)) continue;
      if (d < bd) { bd = d; best = n; }
    }
    if (!best) return false;
    best.claim = r.team; best.claimT = m.t + 5;
    H.moveTo(m, r, best, () => {
      if (!H.canCollect(m, r) || m.loose.indexOf(best) < 0) return;
      H.act(r, H.collectTime(m, r, 'ground', 0.7), () => {
        const j = m.loose.indexOf(best); if (j < 0) return;
        m.loose.splice(j, 1); r.held = 1;
        if (best.a !== r.a) { const o = m.ss[best.a]; o.stolen = (o.stolen || 0) + 1; }
      }, best.a === r.a ? 'Grabbing a lobbed note' : 'Stealing a lobbed note');
    }, best.a === r.a ? 'To the lobbed notes' : 'To a loose note');
    return true;
  }
  // hoard discipline (the real "amp cycle"): the amp robot charges the Amp straight from the pile, and the
  // scorers keep a 4-note buffer for the 10-second AMPLIFY burst instead of spending it at 2 points a note
  function pileOpen24(m, r) {
    const ss = m.ss[r.a], ready = ss.pile.filter(n => n.t <= m.t).length;
    if (!ready) return false;
    if (!ss.hoard) return true;
    if (ss.ampUntil > m.t || m.total - m.t < 22 || !H.alliance(m, r.a).some(x => canAmp(x) && !x.dead)) return true;
    if (ampBotOf(m, r.a) === r.team && ss.bank < 2) return true;
    if (ss.bank >= 1) return ready > 4; // Amplify is one amp note away: save a burst
    return true;
  }
  function pilePick24(m, r) {
    const ss = m.ss[r.a];
    let best = null, bd = 1e9;
    for (const n of ss.pile) { if (n.t > m.t || (n.claim && n.claim !== r.team && n.claimT > m.t)) continue; const d = E.dist(r, n); if (d < bd) { bd = d; best = n; } }
    if (!best) return false;
    best.claim = r.team; best.claimT = m.t + 5;
    H.moveTo(m, r, best, () => {
      const i = ss.pile.indexOf(best); if (i < 0 || !H.canCollect(m, r)) return;
      H.act(r, H.collectTime(m, r, 'ground', 0.7) * (1 - 0.35 * iq24(m, r.a)), () => { const j = ss.pile.indexOf(best); if (j < 0) return; ss.pile.splice(j, 1); r.held = 1; }, 'Grabbing fed note');
    }, 'To fed notes');
    return true;
  }
  function feeder24(m, r) {
    if (r.held) {
      if (!H.canScore(m, r)) { r.label = 'Shooter jammed'; return; }
      // defended at the Source: the drive out to the line would be smothered, so lob into the Neutral Zone instead
      if (inOppWing24(m, r) && defended24(m, r) && m.rng.chance(0.35 + 0.6 * iq24(m, r.a))) return pass24(m, r, 'mid');
      return pass24(m, r);
    }
    if (!H.canCollect(m, r)) { r.label = 'Intake jammed'; return; }
    // stay at the Source: the human player keeps dropping notes and the feeder lobs each one home
    const home = E.P(m, r.a, 14.3, 1.5), pt = E.dist(r, home) < 1.6 ? { x: r.x + m.rng.range(-0.4, 0.4), y: U.clamp(r.y + m.rng.range(-0.4, 0.4), 0.6, FH - 0.6) } : home;
    H.moveTo(m, r, pt, () => {
      if (!H.canCollect(m, r)) return;
      H.act(r, H.collectTime(m, r, 'ground', 0.55), () => { r.held = 1; }, 'Taking a note from the Source'); // notes the human player drops are scooped off the floor
    }, 'To source');
  }
  // The Stage (blue's coordinates): a triangle of three legs 1.5 m from its centre, pointing at the alliance wall. The leg
  // nearest the wall stands on the Podium; the chains hang along the three sides, so a robot climbs facing a side.
  const ST24 = { x: 4.83, y: 4.105, r: 1.5, legs: [180, 300, 60] };
  Rules.ST24 = ST24;
  // the MELODY threshold by event (Coopertition lowers it): 18/15 at regionals and districts, 21/18 at District
  // Championships, 25/21 at the Championship
  const MELODY24 = { reg: [18, 15], dcmp: [21, 18], cmp: [25, 21] };
  const stLeg24 = (m, a, k) => { const g = ST24.legs[k] * Math.PI / 180; return E.P(m, a, ST24.x + Math.cos(g) * ST24.r, ST24.y + Math.sin(g) * ST24.r); };
  // a place on chain k (on the sides facing 0°, 120° and 240°), just outside the side; off: along it, for a second robot
  function chainPt(m, a, k, off) {
    const g = [0, 120, 240][k] * Math.PI / 180;
    const tx = -Math.sin(g), ty = Math.cos(g);
    return E.P(m, a, ST24.x + Math.cos(g) * 1.05 + tx * off, ST24.y + Math.sin(g) * 1.05 + ty * off);
  }
  Rules[2024] = {
    leavePts: 2, tempo: { c: 2.7, s: 1.9 },
    endgame: { levels: [{ name: 'Onstage', pts: 3, time: 5, drop: 0.05 }], park: 1 },
    init(m) {
      setHp(m);
      // the Stage: routes keep clear of its middle (low trusses), robots cannot drive through its three legs, and the leg
      // nearest the alliance wall stands on the wider Podium. A robot heading for its chain or a park may go under it.
      m.obs = [];
      ['red', 'blue'].forEach(a => {
        const c = E.P(m, a, ST24.x, ST24.y); m.obs.push({ x: c.x, y: c.y, r: 1.05, h: 0, end: true });
        [0, 1, 2].forEach(k => { const p = stLeg24(m, a, k); m.obs.push({ x: p.x, y: p.y, r: k ? 0.1 : 0.25, h: 0.15 }); }); // the Podium leg: a little wider for routes, as solid as the others (the wing note sits just in front of it)
      });
      m.spk = {}; m.ampSpot = {}; m.zone = {}; m.coop = false; m.pileSpot = {}; m.loose = [];
      // the human player at the Amp (Amplify, the HIGH NOTES) is the alliance's best one
      m.hpTop = {}; ['red', 'blue'].forEach(a => { m.hpTop[a] = Math.max(30, ...H.alliance(m, a).map(r => r.drv.hp || 40)); });
      m.center = [0.75, 2.4, 4.1, 5.8, 7.45].map(y => ({ x: FW / 2, y }));
      ['red', 'blue'].forEach(a => {
        m.spk[a] = E.P(m, a, 0.2, 5.55);
        m.ampSpot[a] = E.P(m, a, 1.84, 7.6);
        m.zone[a] = zoneOf(m, a, 0.9, 5.9, 0.6, 7.7);
        m.pileSpot[a] = E.P(m, a, 3.3, 6.1);
        const rs = H.alliance(m, a).filter(canAmp).sort((p, q) => (p.cap.speaker ? p.cap.accuracy + p.cap.scoreSpd + (p.cap.range || 0) : -50) - (q.cap.speaker ? q.cap.accuracy + q.cap.scoreSpd + (q.cap.range || 0) : -50));
        const iq = m.feedIQ[a] || 0, feeding = H.alliance(m, a).some(x => x.plan.role === 'feed');
        m.ss[a] = { notes: 0, autoNotes: 0, ampNotes: 0, bank: 0, ampUntil: 0, ampLeft: 0, coopPressed: false, stage: 0, onstage: 0, chains: [0, 0, 0],
          amps: 0, readyT: 0, waited: 0, midShots: 0, stolen: 0, lit: [false, false, false], hiT: [0, 0, 0], hiDone: false, spot: 0,
          // the wing pile is the hoard: notes stockpiled near the Speaker get dumped fast when AMPLIFIED
          pile: [], fed: 0, ampScored: 0, feeding, hoard: false, selfPass: iq >= 0.55,
          wing: [4.1, 5.55, 7.0].map(y => E.P(m, a, 2.9, y)), ampBot: rs.length ? rs[0].team : null };
      });
      m.robots.forEach(r => { r.held = (r.cap.speaker || canAmp(r)) ? 1 : 0; });
    },
    start(m, r) { return E.P(m, r.a, 1.35, [4.4, 5.55, 6.7][r.slot]); },
    // defenders camp the target alliance's Source lane — which is exactly where a feeder works, so Source defense
    // cancels most of the feeding advantage (as it did in the real game)
    guard(m, a) { return E.P(m, a, 12.6, 2.2); },
    defTarget(m, r) { return m.robots.find(x => x.a !== r.a && x.plan.role === 'feed' && !x.dead) || null; },
    // G424: touching a robot in its Stage Zone late (or one already off the carpet on its Stage) is 2 TECH FOULS, and in a
    // qualification match the opponents get the ENSEMBLE RP
    onProtect(m, d, t, pz, H) {
      if (pz !== 'Stage Zone') return false;
      H.foul(m, d, true, 'Stage Zone'); H.foul(m, d, true, 'Stage Zone');
      if (!m.playoff && !m.ss[t.a].ensembleAward) { m.ss[t.a].ensembleAward = true; H.log(m, t.a, t.a.toUpperCase() + ' awarded the Ensemble RP (contact in the Stage Zone)', 'rp'); }
      return true;
    },
    // G423: Source and Amp Zones; G422: touching the Podium (until the last 20 s); G424: the Stage Zone in the last 20 s
    protect(m, r) {
      const q = loc(m, r), tl = m.total - m.t, ds = Math.hypot(q.x - ST24.x, q.y - ST24.y), dp = Math.hypot(q.x - (ST24.x - ST24.r), q.y - ST24.y);
      if (q.y < q.x - 14.1) return 'Source Zone';
      if (q.x > 1.0 && q.x < 2.7 && q.y > 7.0) return 'Amp Zone';
      if (tl > 20 && dp < 0.3 + RR + 0.05) return 'Podium';
      if ((tl <= 20 || r.climbing) && ds < 1.8) return 'Stage Zone'; // G424: the last 20 s, or a robot already off the carpet on its Stage
      return '';
    },
    autoDecide(m, r) {
      const tier = r.cap.autoTier || 0, max = m.S.autoPieces[tier];
      if (r.mem.got == null) r.mem.got = 1;
      if (!r.autoOK) { if (!r.left && !r.mem.tx) { r.mem.tx = 1; H.moveTo(m, r, leavePt(r, 1.9), null, 'Auto (struggling)'); } else r.label = 'Auto stalled'; return; }
      if (r.held && H.canScore(m, r)) return r.cap.speaker ? speaker24(m, r) : amp24(m, r);
      if (r.mem.got < max && r.cap.ground && H.canCollect(m, r) && m.T.auto - m.t > 2.5) {
        const list = m.ss[r.a].wing.concat(tier >= 3 ? m.center : []);
        const p = claimNearest(r, list);
        if (p) { r.mem.got++; return H.moveTo(m, r, p, () => H.act(r, H.collectTime(m, r, 'ground', 0.75), () => { r.held = 1; }, 'Intaking'), 'Auto: to note'); }
      }
      if (!r.left) H.moveTo(m, r, leavePt(r, 1.9), null, 'Leave');
      else r.label = 'Auto done';
    },
    decide(m, r, H2, role) {
      const c = r.cap, ss = m.ss[r.a];
      if (!c.speaker && !canAmp(r)) { r.label = 'No scorer'; return; }
      if (role === 'feed' && canPass24(r)) return feeder24(m, r);
      if (r.held) {
        if (!H.canScore(m, r)) { r.label = 'Scorer jammed'; return; }
        // self-pass: a scorer that understands the meta lobs a note home from the Source end, then grabs another
        const atSource = (r.a === 'blue' ? r.x : FW - r.x) > 11.5;
        if (atSource && ss.selfPass && canPass24(r) && c.ground && !(ss.ampUntil > m.t) && ss.pile.length < 4 && (r.mem.sp || 0) < 2 && m.total - m.t > 30) {
          r.mem.sp = (r.mem.sp || 0) + 1;
          return pass24(m, r);
        }
        r.mem.sp = 0;
        return useAmp24(m, r) ? amp24(m, r) : speaker24(m, r);
      }
      if (!H.canCollect(m, r)) { r.label = 'Intake jammed'; return; }
      if (c.ground && pileOpen24(m, r) && pilePick24(m, r)) return;
      if (c.ground && m.phase === 'tele' && loosePick24(m, r)) return;
      source24(m, r);
    },
    tick(m) {
      if (m.phase !== 'tele') return;
      const tt = m.t - m.T.auto, tl = m.total - m.t;
      ['red', 'blue'].forEach(a => {
        const ss = m.ss[a];
        if (tt <= 45 && !ss.coopPressed && ss.bank >= 1 && !m.playoff) {
          ss.coopPressed = true; ss.bank--;
          H.log(m, a, a.toUpperCase() + ' pressed Coopertition', 'rp');
          if (m.ss[E.opp(a)].coopPressed && !m.coop) { m.coop = true; H.log(m, null, 'COOPERTITION — Melody now needs ' + MELODY24[m.level][1] + ' notes', 'rp'); }
        }
        if (ss.bank >= 2 && !(ss.ampUntil > m.t)) {
          if (!ss.readyT) ss.readyT = m.t;
          if (amplifyNow24(m, a)) {
            const w = Math.round(m.t - ss.readyT);
            ss.bank = 0; ss.ampUntil = m.t + 10; ss.ampLeft = 4; ss.readyT = 0; ss.amps++;
            H.log(m, a, a.toUpperCase() + ' AMPLIFIED!' + (w >= 2 ? ' (the human player held it ' + w + ' s for the scorers)' : ''), 'rp');
          }
        }
        // SPOTLIGHT: in the last 20 seconds the human player at the Amp throws the three HIGH NOTES at the microphones
        // above the chains. Each one that rings a microphone adds a point for every robot onstage on that chain. It is a
        // long, high throw: a beginner almost never lands one, an expert lands most.
        if (tl <= 17 && !ss.hiDone) {
          ss.hiDone = true;
          const hp = hpAmp24(m, a), p = U.clamp(0.02 + 0.85 * Math.pow(U.clamp((hp - 40) / 55, 0, 1), 1.8), 0.02, 0.87);
          for (let k = 0; k < 3; k++) { ss.hiT[k] = m.t + 1.2 + 2.6 * k; ss.lit[k] = m.rng.chance(p); }
          ss.spot = ss.lit.filter(Boolean).length;
          if (ss.spot) H.log(m, a, a.toUpperCase() + ' human player rang ' + ss.spot + ' of 3 microphones (SPOTLIGHT)', 'rp');
        }
      });
    },
    endSpot(m, r, lvl) {
      const ss = m.ss[r.a];
      if (!lvl) { const g = (180 + 120 * r.slot) * Math.PI / 180; return E.P(m, r.a, ST24.x + Math.cos(g) * 0.6, ST24.y + Math.sin(g) * 0.6); } // parked under the Stage, clear of the legs and the chains
      if (r.mem.chain == null) {
        let k = -1;
        if ((r.cap.endgame || 0) >= 55) k = ss.chains.findIndex(n => n === 1);
        if (k < 0) k = ss.chains.findIndex(n => n === 0);
        if (k < 0) k = ss.chains.indexOf(Math.min(...ss.chains));
        r.mem.chain = k; r.mem.chainIdx = ss.chains[k]; ss.chains[k]++;
      }
      return chainPt(m, r.a, r.mem.chain, r.mem.chainIdx ? 0.45 : -0.45);
    },
    finishEnd(m) {
      ['red', 'blue'].forEach(a => {
        const ss = m.ss[a], rs = H.alliance(m, a);
        const on = rs.filter(r => r.end && r.end.lvl === 1 && !r.dead);
        let pts = 0;
        on.forEach(r => { pts += 3; r.stats.pts += 3; });
        const by = {};
        on.forEach(r => { const k = r.mem.chain || 0; (by[k] = by[k] || []).push(r); });
        Object.values(by).forEach(arr => { if (arr.length > 1) pts += 2 * (arr.length - 1); });
        Object.keys(by).forEach(k => { if (ss.lit[k]) { pts += by[k].length; by[k].forEach(r => { r.stats.pts += 1; }); } }); // SPOTLIT: +1 per robot onstage below a rung microphone
        on.forEach(r => {
          if (r.cap.trap && r.cap.trapMech && m.rng.chance(0.35 + 0.55 * (r.cap.ampSkill || 40) / 100)) { pts += 5; r.stats.pts += 5; ss.trap = (ss.trap || 0) + 1; }
        });
        rs.forEach(r => { if (!on.includes(r) && !r.dead && r.end && r.end.park && E.dist(r, E.P(m, a, ST24.x, ST24.y)) < 2.6) { pts += 1; r.stats.pts += 1; } });
        ss.stage = pts; ss.onstage = on.length;
        m.score[a].end += pts;
      });
    },
    bonus(m, a) {
      const ss = m.ss[a], thr = MELODY24[m.level][m.coop ? 1 : 0];
      const on = m.done ? ss.onstage : m.robots.filter(r => r.a === a && r.end && r.end.lvl === 1).length;
      const stage = m.done ? ss.stage : on * 3;
      return [
        { key: 'melody', name: 'Melody', val: ss.notes, thr, ok: ss.notes >= thr, unit: 'notes' },
        { key: 'ensemble', name: 'Ensemble', val: stage, thr: 10, ok: (stage >= 10 && on >= 2) || !!ss.ensembleAward, unit: 'stage pts' } // ensembleAward: G424
      ];
    },
    hud(m, a) {
      const ss = m.ss[a], o = [];
      if (ss.ampUntil > m.t) o.push('AMPLIFIED ' + Math.ceil(ss.ampUntil - m.t) + 's');
      else o.push(ss.bank >= 2 ? 'AMPLIFY READY' : 'Amp bank ' + ss.bank + '/2');
      if (ss.spot && ss.hiT.some((t, k) => ss.lit[k] && t <= m.t)) o.push('SPOTLIT ' + ss.lit.filter((x, k) => x && ss.hiT[k] <= m.t).length);
      if (m.coop) o.push('CO-OP');
      return o;
    }
  };

  // =====================================================================
  // 2025 REEFSCAPE
  // =====================================================================
  const PT25 = { auto: [3, 4, 6, 7], tele: [2, 3, 4, 5] };
  // blue's cages (its left half of the Barge), 1.05, 2.14 and 3.24 m from mid field; red's are rotated onto the other half.
  // A Cage is 19 cm wide, so a robot just fits between two of them; the gaps by the centre leg and the guardrail are too
  // narrow. The two gaps on its own half are where an alliance crosses the field (LANE25).
  const CAGE_Y = [0.865, 1.965, 3.055], LANE25 = [1.415, 2.51];
  Rules.CAGE25 = CAGE_Y;
  const coralPower = r => (r.cap.reach || 0) * 12 + (r.cap.scoreSpd || 0) + (r.cap.intake || 0) * 0.5;
  // position in the alliance's own (blue-equivalent) frame, to test zones
  const own25 = (a, p) => a === 'blue' ? { x: p.x, y: p.y } : { x: FW - p.x, y: FH - p.y };
  const canProcess = r => !!(r.cap.processor || r.cap.net);
  const canRemove = r => !!(r.cap.algaeRemove);
  // The Reef has six faces. Each face has two branches (two coral) at L2, L3 and L4 and room for about five coral in its
  // L1 trough. One algae rests on every face, alternating low and high, and blocks that face's L2 or L3 until it is removed.
  // Robots fill the faces nearest their coral stations first, then have to drive around to the far side.
  const FACE_CAP = [5, 2, 2, 2];
  const faceRoom = (f, L) => ((L === 2 && f.alg === 'low') || (L === 3 && f.alg === 'high') ? 0 : FACE_CAP[L - 1] - f.lv[L - 1]);
  // nearest face that still has room at level L (-1 if none)
  function faceFor(m, r, L) {
    const ss = m.ss[r.a], spots = m.faces[r.a]; let best = -1, bd = 1e9;
    for (let k = 0; k < 6; k++) { if (faceRoom(ss.fc[k], L) <= 0) continue; const d = E.dist(r, spots[k]); if (d < bd) { bd = d; best = k; } }
    return best;
  }
  function chooseLevel(m, r) {
    const ss = m.ss[r.a], reach = r.cap.reach || 0, auto = m.phase === 'auto';
    const dNear = E.dist(r, H.nearest(r, m.faces[r.a]));
    let best = 0, bv = -1;
    for (let L = 1; L <= reach; L++) {
      const k = faceFor(m, r, L);
      if (k < 0) continue;
      let val = (auto ? PT25.auto : PT25.tele)[L - 1];
      if (!auto && ss.lv[L - 1] < 5 && r.plan.rpHunt) val += 1.2;
      if (r.plan.target === 'L4' && L === 4) val += 4;
      if (r.plan.target === 'mid' && (L === 2 || L === 3)) val += 3;
      if (r.plan.target === 'L1' && L === 1) val += 4;
      // a branch on the far side of the Reef costs a longer drive
      const far = Math.max(0, E.dist(r, m.faces[r.a][k]) - dNear);
      const ev = val * [0.98, 0.95, 0.92, 0.86][L - 1] / ([0.8, 1.0, 1.3, 1.7][L - 1] + 5 + 0.45 * far);
      if (ev > bv) { bv = ev; best = L; }
    }
    return best;
  }
  // The algae specialist is the algae-capable robot that is not defending and has the least coral reach (re-picked live).
  function algaeBotOf(m, a) {
    const rs = m.robots.filter(r => r.a === a && canProcess(r) && r.plan.role !== 'defend' && !r.dead);
    return rs.length ? rs.sort((p, q) => (p.cap.reach || 0) - (q.cap.reach || 0))[0].team : null;
  }
  function placeCoral(m, r, L) {
    const ss = m.ss[r.a], k = faceFor(m, r, L);
    if (k < 0) { r.label = 'Reef level full'; return; }
    const f = ss.fc[k], spot = m.faces[r.a][k];
    H.moveTo(m, r, spot, () => {
      if (!H.canScore(m, r)) return;
      if (faceRoom(f, L) <= 0) { r.label = 'Branch taken'; return; } // a partner filled it on the way: pick again
      H.act(r, H.scoreTime(m, r, [0.8, 1.0, 1.3, 1.7][L - 1]), () => {
        if (faceRoom(f, L) <= 0) return;
        r.stats.shots++;
        if (m.rng.chance(H.hit(m, r, [1.12, 1.05, 1.0, 0.93][L - 1]))) {
          f.lv[L - 1]++; ss.lv[L - 1]++; r.stats.hits++; r.stats.cycles++;
          if (m.phase === 'auto') ss.autoCoral++;
          const pts = (m.phase === 'auto' ? PT25.auto : PT25.tele)[L - 1];
          H.addPts(m, r, pts, 'L' + L + ' +' + pts, m.reef[r.a]);
          r.held = 0; r.heldType = null;
        } else if (m.rng.chance(0.4)) { r.held = 0; r.heldType = null; r.label = 'Dropped coral'; }
      }, 'Placing L' + L);
    }, 'To reef');
  }
  function removeAlgae(m, r, keep) {
    const ss = m.ss[r.a], spots = m.faces[r.a];
    // prefer the high algae with enough reach (or when no low one is left); otherwise the nearest face that still has one
    const wantHigh = ss.algaeHigh > 0 && ((r.cap.reach || 0) >= 3 || ss.algaeLow === 0);
    let best = -1, bd = 1e9;
    for (let k = 0; k < 6; k++) { const f = ss.fc[k]; if (!f.alg) continue; const d = E.dist(r, spots[k]) + ((f.alg === 'high') === wantHigh ? 0 : 3); if (d < bd) { bd = d; best = k; } }
    if (best < 0) return;
    H.moveTo(m, r, spots[best], () => {
      if (!H.canScore(m, r)) return;
      H.act(r, H.scoreTime(m, r, 1.2, r.cap.algaeSkill || 50), () => {
        const f = ss.fc[best];
        if (!f.alg) return;
        if (f.alg === 'high') ss.algaeHigh--; else ss.algaeLow--;
        f.alg = null;
        if (keep && canProcess(r) && !r.held) { r.held = 1; r.heldType = 'algae'; }
      }, 'Removing algae');
    }, 'To reef (algae)');
  }
  function scoreAlgae(m, r) {
    const ss = m.ss[r.a];
    if (!H.canScore(m, r)) { r.label = 'Scorer jammed'; return; }
    const useNet = r.cap.net && (ss.proc >= 2 || r.plan.target === 'algae');
    const spot = useNet ? m.netSpot[r.a] : m.procSpot[r.a];
    H.moveTo(m, r, spot, () => {
      H.act(r, (useNet ? H.aimTime(m, r) : 0) + H.scoreTime(m, r, useNet ? 0.8 : 1.0, r.cap.algaeSkill || 50), () => {
        r.stats.shots++;
        const p = H.hit(m, r, useNet ? 0.92 : 1.15, 0, r.cap.algaeSkill || 50);
        if (useNet) H.shotFx(m, r, { x: FW / 2, y: spot.y }, true);
        if (m.rng.chance(p)) {
          r.stats.hits++; r.stats.cycles++;
          if (useNet) { ss.net++; H.addPts(m, r, 4, 'Net +4', spot); }
          else {
            ss.proc++; H.addPts(m, r, 6, 'Processor +6', spot);
            if (ss.proc >= 2 && m.ss[E.opp(r.a)].proc >= 2 && !m.coop) { m.coop = true; H.log(m, null, 'COOPERTITION — Coral RP needs only 3 levels', 'rp'); }
          }
        }
        r.held = 0; r.heldType = null;
      }, useNet ? 'Shooting net' : 'Processing algae');
    }, useNet ? 'To net' : 'To processor');
  }
  // Each alliance has two Coral Stations. The two best coral scorers take one each and the third shares;
  // a human player feeds one coral at a time down each chute, so robots sharing a station queue up.
  function stationOf(m, r) {
    const asg = m.ss[r.a].stAssign;
    let k = asg[r.team];
    if (k == null) k = m.stations[r.a].indexOf(H.nearest(r, m.stations[r.a]));
    return k;
  }
  function collectCoral(m, r) {
    const c = r.cap, ground = c.ground, ss = m.ss[r.a];
    const k = stationOf(m, r), st = m.stations[r.a][k];
    const pt = ground ? { x: U.clamp(st.x + (st.x < FW / 2 ? 1 : -1) * m.rng.range(0.5, 1.1), 0.5, FW - 0.5), y: U.clamp(st.y + (st.y < FH / 2 ? 1 : -1) * m.rng.range(0.3, 0.8), 0.5, FH - 0.5) } : st;
    H.moveTo(m, r, pt, () => {
      if (!H.canCollect(m, r)) return;
      const take = () => {
        const ct = H.collectTime(m, r, ground ? 'ground' : 'station', ground ? 1.0 : 1.7, true);
        ss.stFree[k] = m.t + ct * 0.6 + 0.5; // the human player needs a moment before the next coral drops
        H.act(r, ct, () => { r.held = 1; r.heldType = 'coral'; }, ground ? 'Intaking coral' : 'At coral station');
      };
      if (m.t < ss.stFree[k]) H.waitUntil(r, () => m.t >= ss.stFree[k], take, 'Waiting at coral station', 6);
      else take();
    }, 'To coral station ' + (k + 1));
  }
  Rules[2025] = {
    leavePts: 3, tempo: { c: 3.4, s: 2.6 },
    endgame: { levels: [{ name: 'Shallow', pts: 6, time: 5 }, { name: 'Deep', pts: 12, time: 8, drop: 0.1 }], park: 2 },
    init(m) {
      setHp(m);
      m.coop = false; m.reef = {}; m.faces = {}; m.stations = {}; m.procSpot = {}; m.netSpot = {}; m.cages = {};
      // the Barge spans the whole midline; robots pass under its truss but not through the centre leg or the hanging cages
      m.obs = [{ x: 4.49, y: 4.03, r: 1.0, h: 0.88 }, { x: FW - 4.49, y: 4.03, r: 1.0, h: 0.88 }, { x: FW / 2, y: FH / 2, r: 0.3, h: 0.22 }];
      ['red', 'blue'].forEach(a => {
        m.reef[a] = E.P(m, a, 4.49, 4.03);
        m.faces[a] = [0, 60, 120, 180, 240, 300].map(d => { const g = d * Math.PI / 180; return E.P(m, a, 4.49 + Math.cos(g) * 1.45, 4.03 + Math.sin(g) * 1.45); });
        m.stations[a] = [E.P(m, a, 0.85, 0.75), E.P(m, a, 0.85, 7.45)];
        m.procSpot[a] = E.P(m, a, 6.0, FH - 0.7);           // processor: on the alliance's right-hand side wall
        m.netSpot[a] = E.P(m, a, FW / 2 - 1.15, 2.1);       // shoot algae into the net above the alliance's half of the Barge
        m.cages[a] = CAGE_Y.map(y => E.P(m, a, FW / 2, y)); // three cages on the alliance's half (its left)
        m.cages[a].forEach(c => m.obs.push({ x: c.x, y: c.y, r: 0.2, h: 0.1, end: true, a })); // only this alliance's climbers may touch them
        const algae = H.alliance(m, a).filter(canProcess).sort((p, q) => (p.cap.reach || 0) - (q.cap.reach || 0));
        // station assignment: best two coral scorers get a station each, the third shares with the weaker of them
        const coral = H.alliance(m, a).filter(r => (r.cap.reach || 0) > 0).sort((p, q) => coralPower(q) - coralPower(p));
        const stAssign = {};
        coral.forEach((r, i) => { stAssign[r.team] = i === 0 ? 0 : 1; });
        m.ss[a] = { lv: [0, 0, 0, 0], algaeLow: 3, algaeHigh: 3, fc: [0, 1, 2, 3, 4, 5].map(k => ({ lv: [0, 0, 0, 0], alg: k % 2 ? 'low' : 'high' })), proc: 0, net: 0, autoCoral: 0, barge: 0, allLeft: false, algaeBot: algae.length ? algae[0].team : null, stAssign, stFree: [0, 0] };
      });
      m.robots.forEach(r => { r.held = (r.cap.reach || 0) > 0 ? 1 : 0; r.heldType = r.held ? 'coral' : null; });
    },
    start(m, r) { return E.P(m, r.a, 6.85, [1.4, 4.03, 6.6][r.slot]); },
    // where a defended robot is heading: the Reef with coral in its hands, else its coral station
    guard(m, a, t) {
      if (!t) return E.P(m, a, 6.4, 3.0);
      if (t.held && t.heldType === 'coral') return E.P(m, a, 4.49, 4.03);
      return m.stations[a][stationOf(m, t)];
    },
    // Defense in REEFSCAPE blocks a robot's lane between its coral station and the Reef, midway: the defender meets it
    // there, and waits there while it is at the station or near the Reef. It never follows it into the Reef Zone (G427,
    // a MAJOR FOUL whoever starts the contact) nor shoves it all the way back.
    defSpot(m, d, t, prot) {
      const q = loc(m, t), st = E.P(m, t.a, m.stations[t.a][stationOf(m, t)].x, m.stations[t.a][stationOf(m, t)].y);
      const ux = st.x - 4.49, uy = st.y - 4.03, ul = Math.hypot(ux, uy) || 1, R0 = 1.38 + RR + 1.3;
      const hold = E.P(m, t.a, 4.49 + ux / ul * R0, 4.03 + uy / ul * R0);
      if (prot || Math.hypot(q.x - 4.49, q.y - 4.03) < 1.38 + RR + 1.0 || Math.hypot(q.x - st.x, q.y - st.y) < 1.5) return hold;
      return null;
    },
    // Crossing the field (a defender on its way to the opposing side): under the Barge truss, through a gap between two
    // of its own alliance's Cages (G418: the opponent's are off-limits in teleop)
    route(m, r, from, to) {
      if (r.endBusy) return null;
      const mid = FW / 2, B = 0.95, f = E.P(m, r.a, from.x, from.y), g = E.P(m, r.a, to.x, to.y);
      const sf = f.x < mid ? -1 : 1, sg = g.x < mid ? -1 : 1;
      if (sf === sg) return null;
      let best = null, bd = 1e9;
      for (const y of LANE25) {
        if (laneBlocked(m, r, E.P(m, r.a, mid - B, y), E.P(m, r.a, mid + B, y))) continue; // a robot stopped in that gap
        const d = E.dist(f, { x: mid + sf * B, y }) + E.dist({ x: mid + sg * B, y }, g); if (d < bd) { bd = d; best = y; }
      }
      if (best == null) return null;
      const inLane = Math.abs(f.x - mid) < B + 0.3 && Math.abs(f.y - best) < 0.3, low = !!r.cap.lowProfile;
      const entry = E.P(m, r.a, mid + sf * B, best), exit = E.P(m, r.a, mid + sg * B, best);
      return (inLane ? [] : H.avoid(m, from, entry, 0, false, low, r)).concat([exit], H.avoid(m, exit, to, 0, false, low, r));
    },
    // G427: Reef Zone and Barge Zone, whoever starts the contact (G428, robots touching a Cage late on, sit in the Barge Zone)
    protect(m, r) {
      const q = loc(m, r);
      if (Math.hypot(q.x - 4.49, q.y - 4.03) < 1.38 + RR * 0.7) return 'Reef Zone';
      if (Math.abs(q.x - FW / 2) < 0.6 + RR && q.y < 3.77 + RR) return 'Barge Zone';
      return '';
    },
    // G428: touching a robot on its Cage in the last 20 s is a MAJOR FOUL and gives the opponents the BARGE RP (anywhere
    // else in the Barge Zone, G427's MAJOR FOUL alone)
    onProtect(m, d, t, pz, H) {
      if (pz !== 'Barge Zone' || m.total - m.t > 20 || !(t.climbing || (t.endBusy && m.cages[t.a].some(c => E.dist(c, t) < 0.75)))) return false;
      H.foul(m, d, true, 'Cage');
      if (!m.playoff && !m.ss[t.a].bargeAward) { m.ss[t.a].bargeAward = true; H.log(m, t.a, t.a.toUpperCase() + ' awarded the Barge RP (contact at the Cage)', 'rp'); }
      return true;
    },
    autoDecide(m, r) {
      const max = m.S.autoPieces[r.cap.autoTier || 0];
      if (r.mem.got == null) { r.mem.got = 1; r.mem.sc = 0; }
      if (!r.autoOK || max === 0) { if (!r.left && !r.mem.tx) { r.mem.tx = 1; H.moveTo(m, r, leavePt(r, -1.6), null, r.autoOK ? 'Leave' : 'Auto (struggling)'); } else r.label = 'Auto done'; return; }
      if (r.held && r.heldType === 'coral' && H.canScore(m, r) && r.mem.sc < max) { const L = chooseLevel(m, r); if (L) { r.mem.sc++; return placeCoral(m, r, L); } }
      if (r.mem.got < max && H.canCollect(m, r) && m.T.auto - m.t > 3.5) { r.mem.got++; return collectCoral(m, r); }
      if (!r.left) H.moveTo(m, r, leavePt(r, -1.6), null, 'Leave');
      else r.label = 'Auto done';
    },
    onTeleop(m) { ['red', 'blue'].forEach(a => { m.ss[a].allLeft = H.alliance(m, a).every(r => r.left); }); },
    decide(m, r) {
      const c = r.cap, ss = m.ss[r.a];
      if (r.heldType === 'algae') return scoreAlgae(m, r);
      if (r.held && r.heldType === 'coral') {
        if (!H.canScore(m, r)) { r.label = 'Manipulator jammed'; return; }
        const L = chooseLevel(m, r);
        if (L) return placeCoral(m, r, L);
        if (canRemove(r) && (ss.algaeLow || ss.algaeHigh)) return removeAlgae(m, r, false);
        r.held = 0; r.heldType = null; return;
      }
      const algaeLeft = ss.algaeLow + ss.algaeHigh > 0;
      const wantAlgae = canProcess(r) && algaeLeft && H.canScore(m, r) && (
        r.plan.target === 'algae' || (r.plan.target === 'auto' && algaeBotOf(m, r.a) === r.team && (ss.proc < 2 || (c.reach || 0) <= 1 || c.net)) || !(c.reach > 0));
      if (wantAlgae) return removeAlgae(m, r, true);
      if (!(c.reach > 0)) { r.label = 'Nothing to score'; return; }
      if (!H.canCollect(m, r)) { r.label = 'Intake jammed'; return; }
      collectCoral(m, r);
    },
    endSpot(m, r, lvl) { return lvl ? E.P(m, r.a, FW / 2 - 0.42, CAGE_Y[r.slot]) : E.P(m, r.a, FW / 2 - 0.7, CAGE_Y[r.slot] + 0.45); },
    finishEnd(m) {
      ['red', 'blue'].forEach(a => {
        const ss = m.ss[a]; let pts = 0;
        H.alliance(m, a).forEach(r => {
          if (r.dead || !r.end) return;
          let v = 0;
          if (r.end.lvl === 1) v = 6; else if (r.end.lvl === 2) v = 12;
          else if (r.end.park) { const q = own25(a, r); if (q.x > FW / 2 - 1.3 && q.x < FW / 2 + 0.7 && q.y < FH / 2 + 0.2) v = 2; } // Barge Zone around the alliance's half
          pts += v; r.stats.pts += v;
        });
        ss.barge = pts; m.score[a].end += pts;
      });
    },
    // G418: a robot may never touch the opponents' Cages, even when it was pushed there: a MAJOR FOUL (at most one per
    // robot every few seconds)
    tick(m) {
      m.robots.forEach(r => {
        if (r.dead || (r.mem.cageF || 0) > m.t) return;
        const o = r.a === 'red' ? 'blue' : 'red';
        if (m.cages[o].some(c => E.dist(r, c) < 0.1 + RR + 0.04)) { r.mem.cageF = m.t + 5; H.foul(m, r, true, 'touched an opponent Cage'); }
      });
    },
    bonus(m, a) {
      const ss = m.ss[a];
      const lvls = ss.lv.filter(n => n >= 7).length, need = m.coop ? 3 : 4; // 7 coral on each level (3 levels with Coopertition)
      const autoOk = (m.phase === 'auto' ? H.alliance(m, a).every(r => r.left) : ss.allLeft) && ss.autoCoral >= 1;
      const barge = m.done ? ss.barge : m.robots.filter(r => r.a === a && r.end && r.end.lvl > 0).reduce((s, r) => s + (r.end.lvl === 2 ? 12 : 6), 0);
      return [
        { key: 'auto', name: 'Auto RP', val: ss.autoCoral, thr: 1, ok: autoOk, unit: 'auto coral' },
        { key: 'coral', name: 'Coral RP', val: lvls, thr: need, ok: lvls >= need, unit: 'levels ≥7' },
        { key: 'barge', name: 'Barge RP', val: barge, thr: 16, ok: barge >= 16 || !!ss.bargeAward, unit: 'pts' } // bargeAward: G428
      ];
    },
    hud(m, a) { const ss = m.ss[a]; return ['L1 ' + ss.lv[0] + ' · L2 ' + ss.lv[1] + ' · L3 ' + ss.lv[2] + ' · L4 ' + ss.lv[3]].concat(m.coop ? ['CO-OP'] : []); }
  };

  // =====================================================================
  // 2026 REBUILT
  // =====================================================================
  const XB = 4.63;
  // The Tower (blue's coordinates): built into the alliance wall between Driver Stations 2 and 3, a little toward the
  // Outpost side; its base reaches 1.15 m into the field and is 1.25 m wide, with the uprights and rungs at its front.
  // Robots climb at the front or on either side (the rungs reach past the uprights).
  const TW26 = { x: 0.6, y: 3.68 }, TSPOT26 = [[1.62, 0], [0.7, -1.04], [0.7, 1.04]];
  Rules.TW26 = TW26;
  const towerSpot26 = (m, a, k) => E.P(m, a, TSPOT26[k][0], TW26.y + TSPOT26[k][1]);
  // bonus RP thresholds by event: ENERGIZED and SUPERCHARGED fuel (TRAVERSAL stays 50)
  const RP26 = { reg: [100, 360], dcmp: [240, 360], cmp: [360, 500] };
  // a linear slide intake packs the fuel down so the shooter is fed faster; a dye-rotor turret shoots more fuel a second
  // and more consistently (less of the range penalty and a little more accuracy)
  const COMPACT26 = 1.1, ROTOR26 = { rate: 1.05, hit: 0.015, pen: 0.75 };
  const cap26 = r => Math.max(4, Math.round((r.cap.storage || 10) * (r.cap.lowProfile ? 0.6 : 1)));
  function active26(m, a) {
    if (m.phase === 'auto') return true;
    const tt = m.t - m.T.auto;
    if (tt < 10 || tt >= 110) return true;
    const shift = Math.floor((tt - 10) / 25);
    return m.firstInactive === a ? shift % 2 === 1 : shift % 2 === 0;
  }
  function shiftInfo(m) {
    if (m.phase === 'auto') return { name: 'AUTO', left: m.T.auto - m.t };
    const tt = m.t - m.T.auto;
    if (tt < 10) return { name: 'TRANSITION', left: 10 - tt };
    if (tt >= 110) return { name: 'ENDGAME', left: 140 - tt };
    const s = Math.floor((tt - 10) / 25);
    return { name: 'SHIFT ' + (s + 1), left: 25 - ((tt - 10) % 25) };
  }
  function activeSoon(m, a, secs) { if (active26(m, a)) return true; const save = m.t; m.t += secs; const v = active26(m, a); m.t = save; return v; }
  const T26 = () => G.Rules[2026].tempo;
  function rate26(r) { return (0.5 + 7.5 * r.cap.scoreSpd / 100) * (0.75 + 0.25 * (r.cap.feed || 50) / 100) * (r.cap.dumper ? 1.9 : 1) * (r.cap.compact ? COMPACT26 : 1) * (r.cap.rotor ? ROTOR26.rate : 1) / E.PACE[r.plan.pace].cyc / T26().s; } // a dumper empties the hopper about twice as fast
  function irate26(r) { return (0.6 + 5.4 * r.cap.intake / 100) * (r.cap.wide || 1) / T26().c; }
  // Fuel on the field: m.neutral is the fuel lying in the neutral zone (about 360 at the start), ss.pool the fuel on the
  // floor of an alliance zone, ss.depot the alliance's depot. Scored fuel drops back into the neutral zone; missed shots
  // mostly bounce into the shooter's own zone. A thinner neutral zone is slower to sweep.
  const dens26 = m => U.clamp(0.45 + m.neutral / 320, 0.45, 1.15);
  // beaching on fuel, per second of driving (average driver, balanced pace): on the open carpet with the neutral zone
  // full, and on a bump. The bumps are the bands of each barrier line that are not trench (see slow()).
  const BEACH26 = { floor: 0.002, bump: 0.012 };
  const bump26 = r => { for (const X of [XB, FW - XB]) { if (Math.abs(r.x - X) < 0.6) { const yb = X < FW / 2 ? r.y : FH - r.y; return (yb > 1.6 && yb < 3.5) || (yb > 4.6 && yb < 6.6); } } return false; };
  // Hoarding (the REBUILT meta): an alliance can't score while its hub is inactive, so strong alliances keep working.
  // They sweep the neutral zone and lob the fuel back into their own zone; when the hub lights up, all three robots
  // refill a few steps from it. How cleanly the lobs land depends on the alliance's grasp of the strategy (feedIQ).
  // The robot keeps whatever is in its hopper for the next shift and works as a conveyor: it sweeps fuel off the neutral
  // zone floor and fires it straight back over its own line, a few seconds at a time.
  function hoard26(m, r) {
    const ss = m.ss[r.a], iq = m.feedIQ[r.a] || 0;
    if (m.neutral < 4) return false;
    const sweep = () => {
      if (!H.canCollect(m, r) || !H.canScore(m, r)) return;
      const T = 3.5, thru = Math.min(irate26(r) * dens26(m) * 1.2, rate26(r)); // no hopper to manage: straight through the robot
      H.act(r, T, () => {
        const k = Math.min(Math.floor(m.neutral), Math.max(1, Math.round(thru * T)));
        if (k <= 0) return;
        const land = Math.round(k * U.clamp(0.55 + 0.4 * iq - (r.defBy ? 0.15 : 0), 0.3, 0.97)); // lobs that fall short stay in the neutral zone
        m.neutral -= land; ss.pool += land; ss.hoarded += land; r.stats.passes = (r.stats.passes || 0) + 1;
        H.shotFx(m, r, E.P(m, r.a, m.rng.range(2.2, 3.4), U.clamp(4.03 + m.rng.range(-2.4, 2.4), 0.9, 7.2)), true);
      }, 'Sweeping fuel home');
    };
    const qx = r.a === 'blue' ? r.x : FW - r.x, qy = r.a === 'blue' ? r.y : FH - r.y; // position in the alliance's own frame
    const pt = qx > 5.3 && qx < 8.4
      ? E.P(m, r.a, U.clamp(qx + m.rng.range(-0.8, 0.8), 5.6, 8.0), U.clamp(qy + m.rng.range(-1.0, 1.0), 0.9, 7.3))
      : E.P(m, r.a, m.rng.range(5.7, 7.4), m.rng.range(0.9, 7.3));
    H.moveTo(m, r, pt, sweep, 'Hoarding: neutral zone');
    return true;
  }
  function shoot26(m, r) {
    const hub = m.hub[r.a], spot = H.shootSpot(m, r, hub, m.zone[r.a]);
    H.moveTo(m, r, spot, () => {
      if (!H.canScore(m, r)) return;
      if (r.cap.dumper) H.face(r, hub); // a dumper's flywheels are fixed across its front: the whole robot squares up to the hub
      if (!active26(m, r.a) && r.plan.target !== 'shoot') {
        return H.waitUntil(r, () => active26(m, r.a) || m.inEnd, () => H.act(r, H.aimTime(m, r), () => volley26(m, r), 'Aiming'), 'Holding — hub inactive', 30);
      }
      H.act(r, H.aimTime(m, r), () => volley26(m, r), 'Aiming');
    }, 'To shoot');
  }
  function volley26(m, r) {
    if (r.held <= 0 || !H.canScore(m, r)) return;
    if (H.endDue(m, r)) return;
    if (!active26(m, r.a) && r.plan.target !== 'shoot') return;
    const rate = rate26(r), k = Math.min(r.held, Math.max(1, Math.round(rate * 0.5)));
    H.act(r, k / rate, () => {
      const hub = m.hub[r.a], ss = m.ss[r.a];
      const p = Math.min(0.99, H.hit(m, r, 1.0, H.rangePen(m, r, hub) * (r.cap.rotor ? ROTOR26.pen : 1)) + (r.cap.rotor ? ROTOR26.hit : 0));
      let hits = 0;
      for (let i = 0; i < k; i++) if (m.rng.next() < p) hits++;
      r.stats.shots += k; r.stats.hits += hits; r.held -= k;
      { const miss = k - hits, back = Math.round(miss * 0.35); ss.pool += back; m.neutral += miss - back + hits; } // scored fuel returns to the neutral zone; misses bounce around the hub
      H.shotFx(m, r, hub, hits > 0);
      if (hits) {
        if (active26(m, r.a)) { ss.fuel += hits; if (m.phase === 'auto') ss.autoFuel += hits; H.addPts(m, r, hits, '+' + hits, hub); }
        else ss.wasted += hits;
      }
      if (r.held > 0) volley26(m, r); else r.stats.cycles++;
    }, 'Shooting fuel');
  }
  function collect26(m, r, opts0) {
    const c = r.cap, ss = m.ss[r.a], need = cap26(r) - r.held;
    if (need <= 0) return false;
    const rate = irate26(r);
    const opts = [];
    if (c.ground) {
      if (ss.pool >= 5) opts.push({ pt: E.P(m, r.a, m.rng.range(2.0, 3.4), m.rng.range(1.5, 6.6)), n: Math.min(need, ss.pool), rate: rate * (1.2 + Math.min(1.6, Math.max(0, ss.pool - 12) / 32)), src: 'pool', k: 1 });
      if (ss.depot > 0) opts.push({ pt: E.P(m, r.a, 0.7, 6.5), n: Math.min(need, ss.depot), rate, src: 'depot', k: 1 });
      if (m.neutral >= 3) opts.push({ pt: E.P(m, r.a, m.rng.range(5.7, 8.0), m.rng.range(0.9, 7.3)), n: Math.min(need, Math.floor(m.neutral)), rate: rate * dens26(m), src: 'neutral', k: c.lowProfile ? 1.25 : 1.6 });
    }
    opts.push({ pt: E.P(m, r.a, 0.65, 0.95), n: need, rate: (1.6 + 0.4 * (m.hp[r.a] || 50) / 100) / T26().c, src: 'outpost', k: 1 }); // the human player at the Outpost matters little
    let best = null, bv = 1e9;
    for (const o of opts) {
      const t = (H.travelEst(m, r, o.pt) * o.k + o.n / o.rate + 0.6) / Math.max(1, o.n);
      if (t < bv) { bv = t; best = o; }
    }
    if (opts0 && opts0.maxT) { best.n = Math.max(1, Math.min(best.n, Math.floor(best.rate * opts0.maxT))); }
    const names = { pool: 'zone fuel', depot: 'depot', neutral: 'neutral zone', outpost: 'outpost' };
    H.moveTo(m, r, best.pt, () => {
      if (!H.canCollect(m, r)) return;
      let n = best.n;
      if (best.src === 'pool') { n = Math.min(n, ss.pool); ss.pool -= n; }
      if (best.src === 'depot') { n = Math.min(n, ss.depot); ss.depot -= n; }
      if (best.src === 'neutral') { n = Math.min(n, Math.floor(m.neutral)); m.neutral -= n; }
      if (n <= 0) return;
      H.act(r, n / best.rate * E.PACE[r.plan.pace].cyc + 0.6, () => { r.held = Math.min(cap26(r), r.held + n); }, 'Collecting fuel');
    }, 'To ' + names[best.src]);
    return true;
  }
  function feed26(m, r) {
    const c = r.cap, ss = m.ss[r.a];
    if (r.held >= cap26(r) * 0.8 || (r.held > 0 && !H.canCollect(m, r))) {
      const spot = E.P(m, r.a, 5.5, U.clamp(r.a === 'blue' ? r.y : FH - r.y, 1.0, 7.2));
      return H.moveTo(m, r, spot, () => {
        H.act(r, r.held / (rate26(r) * 1.3) + 0.3, () => { const land = Math.round(r.held * 0.9); ss.pool += land; m.neutral += r.held - land; r.held = 0; r.stats.cycles++; }, 'Feeding zone');
      }, 'Feeding');
    }
    if (!c.ground || !H.canCollect(m, r)) { r.label = 'Can\'t feed'; return; }
    const rate = irate26(r) * dens26(m), need = Math.min(cap26(r) - r.held, Math.floor(m.neutral));
    if (need < 1) { r.label = 'Neutral zone empty'; return; }
    H.moveTo(m, r, E.P(m, r.a, m.rng.range(6.0, 9.5), m.rng.range(0.9, 7.3)), () => {
      const n = Math.min(need, Math.floor(m.neutral));
      if (n <= 0) return;
      m.neutral -= n;
      H.act(r, n / rate + 0.5, () => { r.held = Math.min(cap26(r), r.held + n); }, 'Collecting fuel');
    }, 'To neutral zone');
  }
  Rules[2026] = {
    leavePts: 0, tempo: { c: 2.0, s: 1.4 },
    // climbs are slow and risky (falls from L2/L3 happen), and both hubs are active in the endgame
    endgame: { levels: [{ name: 'L1', pts: 10, time: 4, risk: 0.04 }, { name: 'L2', pts: 20, time: 9, risk: 0.16, drop: 0.35 }, { name: 'L3', pts: 30, time: 14, risk: 0.3, drop: 0.55 }], park: 0 },
    active: active26, shiftInfo,
    // Most teams found the Tower not worth it: compare the climb's expected points with the fuel the robot would score
    // in the same time (plus a margin for the risk and chaos). An explicit coach call ("Go now" or a set level) is respected.
    endLevel(m, r) {
      const capL = r.cap.endLevel || 0;
      if (!capL || r.plan.endLevel !== 9 || r.plan.endTiming === 'now') return capL;
      if (r.mem.endPick != null) return r.mem.endPick;
      const n = cap26(r), hitP = H.hit(m, r, 1.0, 0.03);
      const sRate = n * hitP / (n / irate26(r) + n / rate26(r) + 3.5); // fuel per second while cycling
      // about 1 team in 8 is a "climbing team" that goes for the Tower anyway
      const fan = ((r.team * 2654435761) >>> 0) % 100 < 12;
      let best = 0, bv = fan ? -6 : 6;
      for (let L = 1; L <= capL; L++) {
        const ev = [10, 20, 30][L - 1] * H.climbChance(m, r, L) - sRate * (H.climbTime(m, r, L) + 3);
        if (ev > bv) { bv = ev; best = L; }
      }
      r.mem.endPick = best;
      return best;
    },
    init(m) {
      setHp(m);
      m.hub = {}; m.zone = {}; m.firstInactive = null; m.lastShift = ''; m.neutral = 360;
      m.obs = [{ x: XB, y: 4.03, r: 0.75, h: 0.62 }, { x: FW - XB, y: FH - 4.03, r: 0.75, h: 0.62 }];
      // the Tower: a solid base and uprights (robots heading for their climb may touch their own)
      ['red', 'blue'].forEach(a => { const p = E.P(m, a, TW26.x, TW26.y); m.obs.push({ x: p.x, y: p.y, r: 0.75, h: 0.55, end: true }); });
      ['red', 'blue'].forEach(a => {
        m.hub[a] = E.P(m, a, XB, 4.03);
        m.zone[a] = zoneOf(m, a, 0.6, 3.85, 0.6, 7.6);
        m.ss[a] = { fuel: 0, autoFuel: 0, tower: 0, autoTower: 0, pool: 0, depot: 24, wasted: 0, depotClaim: false, hoard: (m.feedIQ[a] || 0) > 0, hoarded: 0 };
      });
      m.robots.forEach(r => { r.held = Math.min(8, cap26(r)); });
    },
    start(m, r) { return E.P(m, r.a, 3.55, [1.6, 4.03, 6.45][r.slot]); },
    guard(m, a) { return E.P(m, a, 2.7, 2.4); },
    // G420: robots touching their Tower in the last 30 s, whoever starts the contact
    protect(m, r) {
      if (m.total - m.t > 30) return '';
      const q = loc(m, r);
      return q.x < 1.15 + RR + 0.25 && Math.abs(q.y - TW26.y) < 1.04 + RR + 0.1 ? 'Tower' : '';
    },
    // G420: touching a robot on its Tower in the last 30 s is a MAJOR FOUL, and a robot already off the ground gets
    // LEVEL 3 points for it
    onProtect(m, d, t, pz, H) {
      if (pz !== 'Tower') return false;
      H.foul(m, d, true, 'Tower');
      if (t.climbing && !(t.endCredit >= 3)) { t.endCredit = 3; H.log(m, d.a, d.team + ' touched ' + t.team + ' on its Tower: Level 3 for ' + t.team, 'foul'); }
      return true;
    },
    route(m, r, from, to) {
      const lines = [{ X: XB, own: 'blue' }, { X: FW - XB, own: 'red' }].filter(L => (from.x - L.X) * (to.x - L.X) < 0);
      if (!lines.length) return null;
      lines.sort((p, q) => Math.abs(p.X - from.x) - Math.abs(q.X - from.x));
      const pts = []; let cur = from;
      const ys = r.cap.lowProfile ? [0.62, 7.6] : [2.55, 5.5];
      for (const L of lines) {
        let best = null, bd = 1e9;
        for (const y of ys) {
          const c = E.P(m, L.own, XB, y);
          if (laneBlocked(m, r, { x: c.x - 0.75, y: c.y }, { x: c.x + 0.75, y: c.y })) continue; // a robot stopped on that bump or in that trench
          const d = E.dist(cur, c) + E.dist(c, to); if (d < bd) { bd = d; best = c; }
        }
        if (!best) return null; // every way over blocked: round the robots, as best it can
        const dir = Math.sign(to.x - cur.x) || 1, onIt = Math.abs(cur.x - best.x) < 1.05 && Math.abs(cur.y - best.y) < 0.4; // at the start of the crossing or half way across
        if (!onIt) pts.push({ x: best.x - dir * 0.75, y: best.y });
        pts.push({ x: best.x + dir * 0.75, y: best.y });
        cur = pts[pts.length - 1];
      }
      pts.push(to);
      return pts;
    },
    slow(m, r) {
      for (const X of [XB, FW - XB]) {
        if (Math.abs(r.x - X) < 0.6) {
          const yb = X < FW / 2 ? r.y : FH - r.y, tr = r.cap.traverse || 50;
          if (yb < 1.3 || yb > 6.9) return r.cap.lowProfile ? 0.85 + 0.15 * tr / 100 : 0.5;
          if ((yb > 1.6 && yb < 3.5) || (yb > 4.6 && yb < 6.6)) return 0.3 + 0.4 * tr / 100;
        }
      }
      return 1;
    },
    autoDecide(m, r) {
      const tier = r.cap.autoTier || 0, ss = m.ss[r.a], tl = m.T.auto - m.t;
      if (!r.autoOK) { if (!r.left && !r.mem.tx) { r.mem.tx = 1; H.moveTo(m, r, leavePt(r, -1.4), null, 'Auto (struggling)'); } else r.label = 'Auto stalled'; return; }
      if (tier >= 3 && (r.cap.endLevel || 0) >= 1 && !r.perm.endgame && !r.mem.climbed && (ss.autoClimbers || 0) < 2) { // LEVEL 1 in AUTO: 2 robots at most
        const spot = towerSpot26(m, r.a, r.slot), ct = 3 * (1.6 - (r.cap.endgame || 40) / 100);
        if (tl < H.travelEst(m, r, spot) + ct + 1.5 && tl > ct + 0.5) {
          r.mem.climbed = 1; ss.autoClimbers = (ss.autoClimbers || 0) + 1;
          return H.moveTo(m, r, spot, () => H.act(r, ct, () => {
            if (m.phase !== 'auto') return;
            if (m.rng.chance(0.6 + 0.37 * (r.cap.endgame || 40) / 100)) {
              ss.tower += 15; ss.autoTower += 15; H.addPts(m, r, 15, 'Auto climb +15');
              H.log(m, r.a, r.team + ' auto-climbed Level 1', 'end');
            }
            r.st = 'wait'; r.timer = 30; r.label = 'Hanging (auto)';
          }, 'Auto climb'), 'Auto: to tower');
        }
      }
      if (r.held > 0 && H.canScore(m, r) && !r.mem.shooting) {
        r.mem.shooting = 1;
        return shoot26(m, r);
      }
      r.mem.shooting = 0;
      if (r.held === 0 && H.canCollect(m, r) && tl > 5) {
        if (tier === 1 && r.cap.ground && !ss.depotClaim && !r.mem.depot) { ss.depotClaim = true; r.mem.depot = 1; return collect26(m, r, { maxT: tl - 4 }); }
        if (tier >= 2 && r.cap.ground && !r.mem.sweep) {
          r.mem.sweep = 1;
          const rate = irate26(r), need = Math.min(cap26(r), Math.floor(rate * Math.max(1, tl - 9)));
          if (need >= 3) {
            return H.moveTo(m, r, E.P(m, r.a, 6.3, [1.6, 4.0, 6.4][r.slot]), () => { const n = Math.min(need, Math.floor(m.neutral)); m.neutral -= n; H.act(r, n / rate + 0.4, () => { r.held = n; }, 'Auto sweep'); }, 'Auto: neutral sweep');
          }
        }
      }
      if (!r.left) H.moveTo(m, r, leavePt(r, -1.4), null, 'Leave');
      else r.label = 'Auto done';
    },
    onTeleop(m) {
      const b = m.ss.blue.autoFuel, rd = m.ss.red.autoFuel;
      m.firstInactive = b > rd ? 'blue' : rd > b ? 'red' : (m.rng.chance(0.5) ? 'red' : 'blue');
      H.log(m, null, 'Auto fuel ' + rd + '–' + b + ': ' + m.firstInactive.toUpperCase() + ' hub goes inactive first', 'rp');
      ['red', 'blue'].forEach(a => { if (m.ss[a].hoard) H.log(m, a, a.toUpperCase() + ' alliance hoards fuel in its zone while its hub is inactive', 'call'); });
    },
    tick(m) {
      // Beaching. Fuel is everywhere, and a robot that drives onto a ball instead of over or around it sits on it for a
      // few seconds. On the open carpet it is rare (rarer than in 2020: these robots are built to plough through fuel)
      // and follows how much fuel lies there. On a BUMP it is much likelier: fuel gathers at the foot of the ramps, and
      // a robot climbing one has its weight off the front wheels. A trench-height robot that takes the trench never
      // meets a bump. Careful, skilled drivers get stuck less; a robot that is pushing gets stuck more.
      for (const r of m.robots) {
        if (r.dead || r.st !== 'move' || (r.fault && r.fault.stall)) continue;
        const onBump = bump26(r), mid = r.x > XB && r.x < FW - XB;
        const rate = onBump ? BEACH26.bump : BEACH26.floor * (mid ? m.neutral / 360 : Math.min(1.5, ((m.ss[r.x < FW / 2 ? 'blue' : 'red'] || {}).pool || 0) / 120));
        if (rate > 0 && m.rng.next() < rate * E.careK(r) * E.DT) {
          r.fault = { stall: true, until: m.t + m.rng.range(2, 4.5), label: 'BEACHED ON FUEL', beached: true };
          r.stats.faults.push('Beached on fuel' + (onBump ? ' (bump)' : '')); H.log(m, r.a, r.team + ': beached on fuel' + (onBump ? ' on a bump' : ''), 'fault');
        }
      }
      if (m.phase !== 'tele') return;
      const s = shiftInfo(m).name;
      if (s !== m.lastShift) {
        m.lastShift = s;
        if (s.startsWith('SHIFT')) H.log(m, null, s + ': ' + (active26(m, 'red') ? 'RED' : 'BLUE') + ' hub active', 'phase');
      }
    },
    decide(m, r, H2, role) {
      const capN = cap26(r), act = active26(m, r.a);
      if (role === 'feed') return feed26(m, r);
      const shootAny = r.plan.target === 'shoot';
      // hoarding alliances keep working through their inactive shift, until the hub is about to light up
      if (m.ss[r.a].hoard && !act && !shootAny && !m.inEnd && r.cap.ground && H.canScore(m, r) && H.canCollect(m, r) && !activeSoon(m, r.a, 6) && hoard26(m, r)) return;
      if (r.held > 0 && H.canScore(m, r)) {
        const soon = activeSoon(m, r.a, 4);
        const ready = r.held >= Math.ceil(capN * 0.7) || !H.canCollect(m, r) || !r.cap.ground && !r.cap.station;
        if ((act || soon || shootAny) && (ready || (act && m.inEnd) || shootAny && r.held >= Math.ceil(capN * 0.5))) return shoot26(m, r);
        if (!act && !shootAny && r.held >= capN) return shoot26(m, r);
      }
      if (r.held < capN && H.canCollect(m, r) && collect26(m, r)) return;
      if (r.held > 0 && H.canScore(m, r)) return shoot26(m, r);
      r.label = r.jam.intake ? 'Intake jammed' : 'Waiting';
    },
    endSpot(m, r) { return towerSpot26(m, r.a, r.slot); },
    finishEnd(m) {
      m.robots.forEach(r => {
        if (r.end && r.end.lvl > 0 && !r.dead) { const p = [10, 20, 30][r.end.lvl - 1]; m.score[r.a].end += p; m.ss[r.a].tower += p; r.stats.pts += p; }
      });
    },
    bonus(m, a) {
      const ss = m.ss[a];
      const tower = m.done ? ss.tower : ss.tower + m.robots.filter(r => r.a === a && r.end && r.end.lvl > 0).reduce((s, r) => s + [10, 20, 30][r.end.lvl - 1], 0);
      return [
        { key: 'energized', name: 'Energized', val: ss.fuel, thr: RP26[m.level][0], ok: ss.fuel >= RP26[m.level][0], unit: 'fuel' },
        { key: 'super', name: 'Supercharged', val: ss.fuel, thr: RP26[m.level][1], ok: ss.fuel >= RP26[m.level][1], unit: 'fuel' },
        { key: 'trav', name: 'Traversal', val: tower, thr: 50, ok: tower >= 50, unit: 'tower pts' }
      ];
    },
    hud(m, a) { const ss = m.ss[a]; return [active26(m, a) ? 'HUB ACTIVE' : 'HUB INACTIVE', 'zone fuel ' + ss.pool].concat(ss.hoard ? ['HOARDING'] : []); }
  };
})();

// ---------------------------------------------------------------------
// Season strategy profiles (real-world meta). eff scales how much a dedicated
// defender slows and disrupts its target; foul scales contact penalty risk.
// Shooting games (2022, 2024, 2026): one defender is the strongest strategy.
// Placement games (2023, 2025): protected zones make defense weak; run three scorers.
// ---------------------------------------------------------------------
(function () {
  const R = G.Rules, S = G.Seasons;
  // pin: seconds a robot may be pinned (G202 2022–23 and G420 2024: 5 s; G425 2025 and G418 2026: 3 s);
  // reset: how long the defender must stay 6 ft away before pinning again; protMajor: protected-zone contact is a major/tech foul
  R[2022].defense = { eff: 2.4, foul: 0.8, range: 1.8, zone: 0.45, pin: 5, reset: 3, credit: { 'Hangar Zone': 4 } }; // G208: touching a robot in its Hangar Zone in the last 30 s gives it Traversal points
  R[2023].defense = { eff: 0.5, foul: 1.7, pin: 5, reset: 3 };
  R[2024].defense = { eff: 3.6, foul: 0.7, range: 2.0, zone: 0.7, pin: 5, reset: 5, protMajor: true };
  R[2025].defense = { eff: 0.5, foul: 1.1, majorK: 0.08, pin: 3, reset: 3, protMajor: true, maxDef: 1 }; // one robot at most on the opposing side of the field; it blocks lanes midway (defSpot)
  R[2026].defense = { eff: 1.8, foul: 0.9, range: 1.7, zone: 0.35, pin: 3, reset: 3, protMajor: true, maxDef: 1 }; // two defenders could block both bumps or both trenches, which the rules forbid
  S[2022].meta = { defense: true, note: 'Defense wins in RAPID REACT: top alliances send their third robot to harass the other alliance\'s best shooter around the Hub.' };
  S[2023].meta = { defense: false, note: 'Scoring wins in CHARGED UP: protected Communities and Loading Zones make defense weak, so most alliances run three scorers.' };
  S[2024].meta = { defense: true, note: 'Defense wins in CRESCENDO: one defender in the opponent\'s wing or near their Source is standard for top alliances. Late in the season, top alliances also feed notes home from the Source end (G414: only once the feeder\'s bumpers are out of the opponent\'s Wing), and their human players hold Amplify until two scorers are lined up. Any shooter can put notes in the Amp without an amp mechanism: slowly and unreliably with a fixed shooter, moderately with a pivot or turret.' };
  S[2025].meta = { defense: false, note: 'Scoring wins in REEFSCAPE: the Reef is hard to defend, so nearly every alliance runs three scorers. Each of its six faces has its own branches: the faces nearest the coral stations fill first, and the last coral means a longer drive around to the far side.' };
  S[2026].meta = { defense: true, note: 'Defense wins in REBUILT: a defender in the opponent\'s alliance zone during their active shift cuts the fuel stream. Later in the season, top alliances also hoard: while their hub is inactive they lob fuel from the neutral zone back into their own zone, so the next scoring shift starts with short cycles.' };

  // Season failure profiles: multipliers on brownouts, tip-overs and comms losses (engine faultRoll)
  R[2022].faults = { brown: 1.2, tip: 1.0, tipAll: 0.1, comms: 1.05 };
  R[2023].faults = { brown: 0.9, tip: 2.5, tipAll: 0.5, comms: 1.0 };
  R[2024].faults = { brown: 1.2, tip: 1.0, tipAll: 0.05, comms: 1.1 };
  R[2025].faults = { brown: 1.0, tip: 1.4, tipAll: 0.2, comms: 1.0 };
  R[2026].faults = { brown: 2.8, tip: 0.8, tipAll: 0.1, comms: 1.1 };
  S[2022].meta.faults = 'Common failures: comms drops from hard hits around the Hub and brownouts from big shooter flywheels.';
  S[2023].meta.faults = 'Common failures: tip-overs. Tall arms and elevators reaching the high nodes, plus the Charge Station, put a lot of robots on their side.';
  S[2024].meta.faults = 'Common failures: comms drops from heavy defense contact and brownouts from shooters and intakes running together.';
  S[2025].meta.faults = 'Common failures: tip-overs from tall elevators reaching L4, especially when hit with the elevator up.';
  S[2026].meta.faults = 'Common failures: brownouts (multi-motor shooters and hoppers pull huge current, so battery health matters), and robots beached on fuel for a few seconds, most of all on the bumps.';
})();
