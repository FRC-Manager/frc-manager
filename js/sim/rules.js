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
  const setHp = m => { m.hp = {}; ['red', 'blue'].forEach(a => m.hp[a] = Math.max(40, ...m.robots.filter(r => r.a === a).map(r => r.drv.hp || 40))); };

  // =====================================================================
  // 2022 RAPID REACT
  // =====================================================================
  function fender22(m, r) { const h = m.hub, d = E.dist(r, h) || 1; return { x: h.x + (r.x - h.x) / d * 1.8, y: h.y + (r.y - h.y) / d * 1.8 }; }
  function ground22(m, r) {
    let best = null, bd = 1e9;
    for (let i = 0; i < 4; i++) {
      const p = E.P(m, r.a, m.rng.range(1.4, 7.0), m.rng.range(0.7, 7.5));
      if (E.dist(p, m.hub) < 2.2) continue;
      const d = E.dist(r, p); if (d < bd) { bd = d; best = p; }
    }
    return best || E.P(m, r.a, 3.0, 2.0);
  }
  function collect22(m, r, pt, kind) {
    H.moveTo(m, r, pt, () => {
      if (!H.canCollect(m, r)) return;
      H.act(r, H.collectTime(m, r, kind, kind === 'ground' ? 1.15 : 2.0), () => { r.held++; if (m.phase === 'auto') r.mem.got = (r.mem.got || 1) + 1; },
        kind === 'ground' ? 'Intaking cargo' : 'Loading at terminal');
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
    if (d < 1.8) spot = { x: hub.x + (spot.x - hub.x) / (d || 1) * 1.8, y: hub.y + (spot.y - hub.y) / (d || 1) * 1.8 };
    H.moveTo(m, r, spot, () => {
      if (!H.canScore(m, r)) return;
      const n = r.held;
      H.act(r, H.aimTime(m, r) + n * H.scoreTime(m, r, upper ? 0.55 : 0.7), () => {
        let pts = 0;
        const pen = upper ? H.rangePen(m, r, hub) : 0, ss = m.ss[r.a];
        for (let i = 0; i < n; i++) {
          const hit = m.rng.chance(H.hit(m, r, upper ? 0.84 : 1.12, pen));
          r.stats.shots++; H.shotFx(m, r, hub, hit);
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
    endgame: { levels: [{ name: 'Low', pts: 4, time: 3 }, { name: 'Mid', pts: 6, time: 5 }, { name: 'High', pts: 10, time: 9 }, { name: 'Traversal', pts: 15, time: 13 }], park: 0 },
    init(m) {
      setHp(m);
      m.hub = { x: FW / 2, y: FH / 2 };
      m.obs = [{ x: m.hub.x, y: m.hub.y, r: 1.65 }];
      ['red', 'blue'].forEach(a => {
        const staged = [125, 155, 205, 235].map(deg => { const g = deg * Math.PI / 180; return E.P(m, a, m.hub.x + Math.cos(g) * 3.4, m.hub.y + Math.sin(g) * 3.4); });
        staged.push(E.P(m, a, 1.0, 7.2));
        m.ss[a] = { cargo: 0, autoCargo: 0, upper: 0, lower: 0, staged };
      });
      m.robots.forEach(r => { r.held = (r.cap.upper || r.cap.lower) ? 1 : 0; });
    },
    start(m, r) { const g = [150, 180, 210][r.slot] * Math.PI / 180; return E.P(m, r.a, m.hub.x + Math.cos(g) * 2.5, m.hub.y + Math.sin(g) * 2.5); },
    guard(m, a) { return E.P(m, a, 5.7, 4.1); },
    autoDecide(m, r) {
      const max = m.S.autoPieces[r.cap.autoTier || 0];
      if (r.mem.got == null) r.mem.got = 1;
      if (!r.autoOK) { if (!r.left && !r.mem.tx) { r.mem.tx = 1; H.moveTo(m, r, leavePt(r, -1.8), null, 'Auto (struggling)'); } else r.label = 'Auto stalled'; return; }
      if (r.held > 0 && H.canScore(m, r) && (r.held >= (r.cap.storage || 1) || r.mem.got >= max || !r.cap.ground)) return score22(m, r);
      if (r.mem.got < max && r.cap.ground && H.canCollect(m, r) && m.T.auto - m.t > 2.5) {
        const p = claimNearest(r, m.ss[r.a].staged);
        if (p) return collect22(m, r, p, 'ground');
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
        if (r.held > 0) {
          const gp = c.ground ? ground22(m, r) : null;
          if (gp && E.dist(r, gp) < 3.5) return collect22(m, r, gp, 'ground');
          if (H.canScore(m, r)) return score22(m, r);
        }
        if (c.ground) return collect22(m, r, ground22(m, r), 'ground');
        return collect22(m, r, E.P(m, r.a, 1.0, 7.2), 'station');
      }
      if (r.held > 0 && H.canScore(m, r)) return score22(m, r);
      r.label = r.jam.intake ? 'Intake jammed' : r.jam.scorer ? 'Shooter jammed' : 'Waiting';
    },
    endSpot(m, r) { return E.P(m, r.a, 0.9 + r.slot * 0.85, 1.35); },
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
  const balOf = r => 0.6 * (r.cap.balance || 20) + 0.4 * (r.cap.agility || 30);
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
    return best;
  }
  function place23(m, r, node) {
    const spot = E.P(m, r.a, 1.85, 0.5 + node.col * 0.56);
    H.moveTo(m, r, spot, () => {
      if (!H.canScore(m, r)) return;
      H.act(r, H.scoreTime(m, r, placeTime(node.row, r.heldType)), () => {
        const g = m.ss[r.a].grid;
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
  const inCommunity = (m, r) => r.a === 'blue' ? r.x < 4.9 && r.y < 5.6 : r.x > FW - 4.9 && r.y < 5.6;
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
        H.act(r, H.collectTime(m, r, ground ? 'ground' : 'station', ground ? 1.3 : 2.1) * (type === 'cone' ? 1.15 : 1),
          () => { r.held = 1; r.heldType = type; }, 'Grabbing ' + type);
      }, 'To loading zone');
    },
    endSpot(m, r, lvl) { return lvl ? E.P(m, r.a, 3.9, 2.2 + r.slot * 0.55) : E.P(m, r.a, 2.3, 0.9 + r.slot * 1.5); },
    finishEnd(m) {
      ['red', 'blue'].forEach(a => {
        const ss = m.ss[a], rs = H.alliance(m, a);
        const docked = rs.filter(r => r.end && r.end.lvl === 1 && !r.dead);
        let eng = false, pts = 0;
        if (docked.length) {
          const avg = U.avg(docked.map(balOf));
          eng = m.rng.chance(U.clamp((0.25 + 0.68 * avg / 100) * [1, 0.88, 0.7][docked.length - 1], 0.05, 0.97));
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
        { key: 'sus', name: 'Sustainability', val: links, thr: coop ? 4 : 5, ok: links >= (coop ? 4 : 5), unit: 'links' },
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
  // The amp specialist is the amp-capable robot that is not defending and has the weakest speaker game (re-picked live).
  function ampBotOf(m, a) {
    const rs = m.robots.filter(r => r.a === a && canAmp(r) && r.plan.role !== 'defend' && !r.dead && !r.perm.scorer);
    if (!rs.length) return null;
    const sp = r => (r.cap.speaker ? r.cap.accuracy + r.cap.scoreSpd + (r.cap.range || 0) : -50);
    return rs.sort((p, q) => sp(p) - sp(q))[0].team;
  }
  function useAmp24(m, r) {
    const ss = m.ss[r.a];
    if (!canAmp(r)) return false;
    if (!r.cap.speaker) return true;
    if (r.plan.target === 'amp') return true;
    if (r.plan.target === 'speaker' || m.phase === 'auto') return false;
    if (ss.ampUntil > m.t || ss.bank >= 2) return false;
    return ampBotOf(m, r.a) === r.team;
  }
  function speaker24(m, r) {
    const ss = m.ss[r.a], spk = m.spk[r.a];
    const spot = H.shootSpot(m, r, spk, m.zone[r.a]);
    H.moveTo(m, r, spot, () => {
      if (!H.canScore(m, r)) return;
      H.act(r, H.aimTime(m, r) + H.scoreTime(m, r, 0.5), () => {
        const hit = m.rng.chance(H.hit(m, r, 1.0, H.rangePen(m, r, spk)));
        r.stats.shots++; H.shotFx(m, r, spk, hit);
        if (hit) {
          r.stats.hits++; r.stats.cycles++;
          let pts = 2;
          if (m.phase === 'auto') pts = 5;
          else if (ss.ampUntil > m.t && ss.ampLeft > 0) { pts = 5; ss.ampLeft--; if (ss.ampLeft <= 0) ss.ampUntil = 0; }
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
      const skill = r.cap.amp ? (r.cap.ampSkill || 45) : r.cap.scoreSpd * 0.75;
      H.act(r, H.scoreTime(m, r, 1.1, skill), () => {
        r.stats.shots++;
        if (m.rng.chance(H.hit(m, r, 1.12, 0, r.cap.amp ? (r.cap.ampSkill || 45) : r.cap.accuracy * 0.85))) {
          r.stats.hits++; r.stats.cycles++; ss.notes++; ss.ampNotes++;
          if (m.phase === 'auto') { ss.autoNotes++; H.addPts(m, r, 2, '+2', spot); }
          else { H.addPts(m, r, 1, '+1', spot); if (!(ss.ampUntil > m.t)) ss.bank = Math.min(2, ss.bank + 1); }
        }
        r.held = 0;
      }, 'Scoring amp');
    }, 'To amp');
  }
  function chainPt(m, a, k, off) {
    const g = [0, 120, 240][k] * Math.PI / 180, cx = 4.9, cy = 4.1;
    const tx = -Math.sin(g), ty = Math.cos(g);
    return E.P(m, a, cx + Math.cos(g) * 1.5 + tx * off, cy + Math.sin(g) * 1.5 + ty * off);
  }
  Rules[2024] = {
    leavePts: 2, tempo: { c: 2.7, s: 1.9 },
    endgame: { levels: [{ name: 'Onstage', pts: 3, time: 5 }], park: 1 },
    init(m) {
      setHp(m);
      m.obs = [{ x: 4.9, y: 4.1, r: 1.05 }, { x: FW - 4.9, y: 4.1, r: 1.05 }];
      m.spk = {}; m.ampSpot = {}; m.zone = {}; m.coop = false;
      m.center = [0.75, 2.4, 4.1, 5.8, 7.45].map(y => ({ x: FW / 2, y }));
      ['red', 'blue'].forEach(a => {
        m.spk[a] = E.P(m, a, 0.2, 5.55);
        m.ampSpot[a] = E.P(m, a, 1.84, 7.6);
        m.zone[a] = zoneOf(m, a, 0.9, 5.9, 0.6, 7.7);
        const rs = H.alliance(m, a).filter(canAmp).sort((p, q) => (p.cap.speaker ? p.cap.accuracy + p.cap.scoreSpd + (p.cap.range || 0) : -50) - (q.cap.speaker ? q.cap.accuracy + q.cap.scoreSpd + (q.cap.range || 0) : -50));
        m.ss[a] = { notes: 0, autoNotes: 0, ampNotes: 0, bank: 0, ampUntil: 0, ampLeft: 0, coopPressed: false, stage: 0, onstage: 0, chains: [0, 0, 0],
          wing: [4.1, 5.55, 7.0].map(y => E.P(m, a, 2.9, y)), ampBot: rs.length ? rs[0].team : null };
      });
      m.robots.forEach(r => { r.held = (r.cap.speaker || canAmp(r)) ? 1 : 0; });
    },
    start(m, r) { return E.P(m, r.a, 1.35, [4.4, 5.55, 6.7][r.slot]); },
    guard(m, a) { return E.P(m, a, 12.6, 2.2); }, // defenders camp the target alliance's Source lane
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
    decide(m, r) {
      const c = r.cap;
      if (!c.speaker && !canAmp(r)) { r.label = 'No scorer'; return; }
      if (r.held) {
        if (!H.canScore(m, r)) { r.label = 'Scorer jammed'; return; }
        return useAmp24(m, r) ? amp24(m, r) : speaker24(m, r);
      }
      if (!H.canCollect(m, r)) { r.label = 'Intake jammed'; return; }
      const ground = c.ground;
      const pt = ground ? E.P(m, r.a, m.rng.range(13.4, 15.0), m.rng.range(0.9, 2.5)) : E.P(m, r.a, 15.45, 0.95);
      H.moveTo(m, r, pt, () => {
        if (!H.canCollect(m, r)) return;
        H.act(r, H.collectTime(m, r, ground ? 'ground' : 'station', ground ? 1.0 : 1.9), () => { r.held = 1; }, ground ? 'Intaking' : 'At source');
      }, 'To source');
    },
    tick(m) {
      if (m.phase !== 'tele') return;
      const tt = m.t - m.T.auto;
      ['red', 'blue'].forEach(a => {
        const ss = m.ss[a];
        if (tt <= 45 && !ss.coopPressed && ss.bank >= 1) {
          ss.coopPressed = true; ss.bank--;
          H.log(m, a, a.toUpperCase() + ' pressed Coopertition', 'rp');
          if (m.ss[E.opp(a)].coopPressed && !m.coop) { m.coop = true; H.log(m, null, 'COOPERTITION — Melody now needs 15 notes', 'rp'); }
        }
        if (ss.bank >= 2 && !(ss.ampUntil > m.t)) { ss.bank = 0; ss.ampUntil = m.t + 10; ss.ampLeft = 4; H.log(m, a, a.toUpperCase() + ' AMPLIFIED!', 'rp'); }
      });
    },
    endSpot(m, r, lvl) {
      const ss = m.ss[r.a];
      if (!lvl) return E.P(m, r.a, 3.1, 2.6 + r.slot * 1.4);
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
        const lit = {};
        for (let i = 0; i < 3; i++) if (m.rng.chance(0.2 + 0.45 * m.hp[a] / 100)) lit[i] = true;
        Object.keys(by).forEach(k => { if (lit[k]) pts += by[k].length; });
        on.forEach(r => {
          if (r.cap.trap && r.cap.trapMech && m.rng.chance(0.35 + 0.55 * (r.cap.ampSkill || 40) / 100)) { pts += 5; r.stats.pts += 5; ss.trap = (ss.trap || 0) + 1; }
        });
        rs.forEach(r => { if (!on.includes(r) && !r.dead && r.end && r.end.park && E.dist(r, E.P(m, a, 4.9, 4.1)) < 3.4) { pts += 1; r.stats.pts += 1; } });
        ss.stage = pts; ss.onstage = on.length;
        m.score[a].end += pts;
      });
    },
    bonus(m, a) {
      const ss = m.ss[a], thr = m.coop ? 15 : 18;
      const on = m.done ? ss.onstage : m.robots.filter(r => r.a === a && r.end && r.end.lvl === 1).length;
      const stage = m.done ? ss.stage : on * 3;
      return [
        { key: 'melody', name: 'Melody', val: ss.notes, thr, ok: ss.notes >= thr, unit: 'notes' },
        { key: 'ensemble', name: 'Ensemble', val: stage, thr: 10, ok: stage >= 10 && on >= 2, unit: 'stage pts' }
      ];
    },
    hud(m, a) {
      const ss = m.ss[a], o = [];
      if (ss.ampUntil > m.t) o.push('AMPLIFIED ' + Math.ceil(ss.ampUntil - m.t) + 's');
      else o.push('Amp bank ' + ss.bank + '/2');
      if (m.coop) o.push('CO-OP');
      return o;
    }
  };

  // =====================================================================
  // 2025 REEFSCAPE
  // =====================================================================
  const PT25 = { auto: [3, 4, 6, 7], tele: [2, 3, 4, 5] };
  const canProcess = r => !!(r.cap.processor || r.cap.net);
  const canRemove = r => !!(r.cap.algaeRemove);
  function avail25(ss, L) {
    if (L === 1) return 30 - ss.lv[0];
    if (L === 2) return 12 - ss.lv[1] - 2 * ss.algaeLow;
    if (L === 3) return 12 - ss.lv[2] - 2 * ss.algaeHigh;
    return 12 - ss.lv[3];
  }
  function chooseLevel(m, r) {
    const ss = m.ss[r.a], reach = r.cap.reach || 0, auto = m.phase === 'auto';
    let best = 0, bv = -1;
    for (let L = 1; L <= reach; L++) {
      if (avail25(ss, L) <= 0) continue;
      let val = (auto ? PT25.auto : PT25.tele)[L - 1];
      if (!auto && ss.lv[L - 1] < 5 && r.plan.rpHunt) val += 1.2;
      if (r.plan.target === 'L4' && L === 4) val += 4;
      if (r.plan.target === 'mid' && (L === 2 || L === 3)) val += 3;
      if (r.plan.target === 'L1' && L === 1) val += 4;
      const ev = val * [0.98, 0.95, 0.92, 0.86][L - 1] / ([0.8, 1.0, 1.3, 1.7][L - 1] + 5);
      if (ev > bv) { bv = ev; best = L; }
    }
    return best;
  }
  // The algae specialist is the algae-capable robot that is not defending and has the least coral reach (re-picked live).
  function algaeBotOf(m, a) {
    const rs = m.robots.filter(r => r.a === a && canProcess(r) && r.plan.role !== 'defend' && !r.dead);
    return rs.length ? rs.sort((p, q) => (p.cap.reach || 0) - (q.cap.reach || 0))[0].team : null;
  }
  const reefSpot = (m, r) => H.nearest(r, m.faces[r.a]);
  function placeCoral(m, r, L) {
    const spot = reefSpot(m, r);
    H.moveTo(m, r, spot, () => {
      if (!H.canScore(m, r)) return;
      H.act(r, H.scoreTime(m, r, [0.8, 1.0, 1.3, 1.7][L - 1]), () => {
        const ss = m.ss[r.a];
        if (avail25(ss, L) <= 0) return;
        r.stats.shots++;
        if (m.rng.chance(H.hit(m, r, [1.12, 1.05, 1.0, 0.93][L - 1]))) {
          ss.lv[L - 1]++; r.stats.hits++; r.stats.cycles++;
          if (m.phase === 'auto') ss.autoCoral++;
          const pts = (m.phase === 'auto' ? PT25.auto : PT25.tele)[L - 1];
          H.addPts(m, r, pts, 'L' + L + ' +' + pts, m.reef[r.a]);
          r.held = 0; r.heldType = null;
        } else if (m.rng.chance(0.4)) { r.held = 0; r.heldType = null; r.label = 'Dropped coral'; }
      }, 'Placing L' + L);
    }, 'To reef');
  }
  function removeAlgae(m, r, keep) {
    H.moveTo(m, r, reefSpot(m, r), () => {
      if (!H.canScore(m, r)) return;
      H.act(r, H.scoreTime(m, r, 1.2, r.cap.algaeSkill || 50), () => {
        const ss = m.ss[r.a];
        if (ss.algaeHigh > 0 && ((r.cap.reach || 0) >= 3 || ss.algaeLow === 0)) ss.algaeHigh--;
        else if (ss.algaeLow > 0) ss.algaeLow--;
        else return;
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
        if (useNet) H.shotFx(m, r, E.P(m, r.a, 8.27, spot.y), true);
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
  function collectCoral(m, r) {
    const c = r.cap, ground = c.ground;
    const st = H.nearest(r, m.stations[r.a]);
    const pt = ground ? { x: U.clamp(st.x + (r.a === 'blue' ? 1 : -1) * m.rng.range(0.6, 1.6), 0.5, FW - 0.5), y: U.clamp(st.y + (st.y < FH / 2 ? 1 : -1) * m.rng.range(0.4, 1.2), 0.5, FH - 0.5) } : st;
    H.moveTo(m, r, pt, () => {
      if (!H.canCollect(m, r)) return;
      H.act(r, H.collectTime(m, r, ground ? 'ground' : 'station', ground ? 1.0 : 1.7), () => { r.held = 1; r.heldType = 'coral'; }, ground ? 'Intaking coral' : 'At coral station');
    }, 'To coral station');
  }
  Rules[2025] = {
    leavePts: 3, tempo: { c: 3.4, s: 2.6 },
    endgame: { levels: [{ name: 'Shallow', pts: 6, time: 5 }, { name: 'Deep', pts: 12, time: 8 }], park: 2 },
    init(m) {
      setHp(m);
      m.coop = false; m.reef = {}; m.faces = {}; m.stations = {}; m.procSpot = {}; m.netSpot = {};
      m.obs = [{ x: 4.49, y: 4.03, r: 1.0 }, { x: FW - 4.49, y: 4.03, r: 1.0 },
        { x: FW / 2, y: 4.9, r: 0.55 }, { x: FW / 2, y: 6.0, r: 0.55 }, { x: FW / 2, y: 7.1, r: 0.55 }, { x: FW / 2, y: 7.9, r: 0.45 }];
      ['red', 'blue'].forEach(a => {
        m.reef[a] = E.P(m, a, 4.49, 4.03);
        m.faces[a] = [0, 60, 120, 180, 240, 300].map(d => { const g = d * Math.PI / 180; return E.P(m, a, 4.49 + Math.cos(g) * 1.45, 4.03 + Math.sin(g) * 1.45); });
        m.stations[a] = [E.P(m, a, 0.85, 0.75), E.P(m, a, 0.85, 7.45)];
        m.procSpot[a] = E.P(m, a, 6.0, 0.7);
        m.netSpot[a] = E.P(m, a, 7.15, 6.6);
        const algae = H.alliance(m, a).filter(canProcess).sort((p, q) => (p.cap.reach || 0) - (q.cap.reach || 0));
        m.ss[a] = { lv: [0, 0, 0, 0], algaeLow: 3, algaeHigh: 3, proc: 0, net: 0, autoCoral: 0, barge: 0, allLeft: false, algaeBot: algae.length ? algae[0].team : null };
      });
      m.robots.forEach(r => { r.held = (r.cap.reach || 0) > 0 ? 1 : 0; r.heldType = r.held ? 'coral' : null; });
    },
    start(m, r) { return E.P(m, r.a, 7.1, [1.0, 2.4, 3.8][r.slot]); },
    guard(m, a) { return E.P(m, a, 6.4, 3.0); },
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
    endSpot(m, r, lvl) { return lvl ? E.P(m, r.a, 7.6, 5.0 + r.slot * 1.1) : E.P(m, r.a, 7.2, 4.7 + r.slot * 1.05); },
    finishEnd(m) {
      ['red', 'blue'].forEach(a => {
        const ss = m.ss[a]; let pts = 0;
        H.alliance(m, a).forEach(r => {
          if (r.dead || !r.end) return;
          let v = 0;
          if (r.end.lvl === 1) v = 6; else if (r.end.lvl === 2) v = 12;
          else if (r.end.park && (r.a === 'blue' ? r.x > 6.5 && r.x < FW / 2 : r.x < FW - 6.5 && r.x > FW / 2) && r.y > 4.2) v = 2;
          pts += v; r.stats.pts += v;
        });
        ss.barge = pts; m.score[a].end += pts;
      });
    },
    bonus(m, a) {
      const ss = m.ss[a];
      const lvls = ss.lv.filter(n => n >= 5).length, need = m.coop ? 3 : 4;
      const autoOk = (m.phase === 'auto' ? H.alliance(m, a).every(r => r.left) : ss.allLeft) && ss.autoCoral >= 1;
      const barge = m.done ? ss.barge : m.robots.filter(r => r.a === a && r.end && r.end.lvl > 0).reduce((s, r) => s + (r.end.lvl === 2 ? 12 : 6), 0);
      return [
        { key: 'auto', name: 'Auto RP', val: ss.autoCoral, thr: 1, ok: autoOk, unit: 'auto coral' },
        { key: 'coral', name: 'Coral RP', val: lvls, thr: need, ok: lvls >= need, unit: 'levels ≥5' },
        { key: 'barge', name: 'Barge RP', val: barge, thr: 14, ok: barge >= 14, unit: 'pts' }
      ];
    },
    hud(m, a) { const ss = m.ss[a]; return ['L1 ' + ss.lv[0] + ' · L2 ' + ss.lv[1] + ' · L3 ' + ss.lv[2] + ' · L4 ' + ss.lv[3]].concat(m.coop ? ['CO-OP'] : []); }
  };

  // =====================================================================
  // 2026 REBUILT
  // =====================================================================
  const XB = 4.63;
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
  function rate26(r) { return (0.5 + 7.5 * r.cap.scoreSpd / 100) * (0.75 + 0.25 * (r.cap.feed || 50) / 100) / E.PACE[r.plan.pace].cyc / T26().s; }
  function irate26(r) { return (0.6 + 5.4 * r.cap.intake / 100) * (r.cap.wide || 1) / T26().c; }
  function shoot26(m, r) {
    const hub = m.hub[r.a], spot = H.shootSpot(m, r, hub, m.zone[r.a]);
    H.moveTo(m, r, spot, () => {
      if (!H.canScore(m, r)) return;
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
      const p = H.hit(m, r, 1.0, H.rangePen(m, r, hub));
      let hits = 0;
      for (let i = 0; i < k; i++) if (m.rng.next() < p) hits++;
      r.stats.shots += k; r.stats.hits += hits; r.held -= k;
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
      if (ss.pool >= 5) opts.push({ pt: E.P(m, r.a, m.rng.range(2.0, 3.4), m.rng.range(1.5, 6.6)), n: Math.min(need, ss.pool), rate: rate * 1.2, src: 'pool', k: 1 });
      if (ss.depot > 0) opts.push({ pt: E.P(m, r.a, 0.7, 6.5), n: Math.min(need, ss.depot), rate, src: 'depot', k: 1 });
      opts.push({ pt: E.P(m, r.a, m.rng.range(5.7, 8.0), m.rng.range(0.9, 7.3)), n: need, rate, src: 'neutral', k: c.lowProfile ? 1.25 : 1.6 });
    }
    opts.push({ pt: E.P(m, r.a, 0.65, 0.95), n: need, rate: (1.0 + 1.6 * (m.hp[r.a] || 50) / 100) / T26().c, src: 'outpost', k: 1 });
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
        H.act(r, r.held / (rate26(r) * 1.3) + 0.3, () => { ss.pool += Math.round(r.held * 0.9); r.held = 0; r.stats.cycles++; }, 'Feeding zone');
      }, 'Feeding');
    }
    if (!c.ground || !H.canCollect(m, r)) { r.label = 'Can\'t feed'; return; }
    const rate = irate26(r), need = cap26(r) - r.held;
    H.moveTo(m, r, E.P(m, r.a, m.rng.range(6.0, 9.5), m.rng.range(0.9, 7.3)), () => {
      H.act(r, need / rate + 0.5, () => { r.held = cap26(r); }, 'Collecting fuel');
    }, 'To neutral zone');
  }
  Rules[2026] = {
    leavePts: 0, tempo: { c: 2.0, s: 1.4 },
    endgame: { levels: [{ name: 'L1', pts: 10, time: 3 }, { name: 'L2', pts: 20, time: 6 }, { name: 'L3', pts: 30, time: 9 }], park: 0 },
    active: active26, shiftInfo,
    init(m) {
      setHp(m);
      m.hub = {}; m.zone = {}; m.firstInactive = null; m.lastShift = '';
      m.obs = [{ x: XB, y: 4.03, r: 0.75 }, { x: FW - XB, y: FH - 4.03, r: 0.75 }, { x: 1.1, y: 4.03, r: 0.4 }, { x: FW - 1.1, y: FH - 4.03, r: 0.4 }];
      ['red', 'blue'].forEach(a => {
        m.hub[a] = E.P(m, a, XB, 4.03);
        m.zone[a] = zoneOf(m, a, 0.6, 3.85, 0.6, 7.6);
        m.ss[a] = { fuel: 0, autoFuel: 0, tower: 0, autoTower: 0, pool: 0, depot: 24, wasted: 0, depotClaim: false };
      });
      m.robots.forEach(r => { r.held = Math.min(8, cap26(r)); });
    },
    start(m, r) { return E.P(m, r.a, 3.55, [1.6, 4.03, 6.45][r.slot]); },
    guard(m, a) { return E.P(m, a, 2.7, 2.4); },
    route(m, r, from, to) {
      const lines = [{ X: XB, own: 'blue' }, { X: FW - XB, own: 'red' }].filter(L => (from.x - L.X) * (to.x - L.X) < 0);
      if (!lines.length) return null;
      lines.sort((p, q) => Math.abs(p.X - from.x) - Math.abs(q.X - from.x));
      const pts = []; let cur = from;
      const ys = r.cap.lowProfile ? [0.62, 7.6] : [2.55, 5.5];
      for (const L of lines) {
        let best = null, bd = 1e9;
        for (const y of ys) { const c = E.P(m, L.own, XB, y); const d = E.dist(cur, c) + E.dist(c, to); if (d < bd) { bd = d; best = c; } }
        const dir = Math.sign(to.x - cur.x) || 1;
        pts.push({ x: best.x - dir * 0.75, y: best.y }, { x: best.x + dir * 0.75, y: best.y });
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
      if (tier >= 3 && (r.cap.endLevel || 0) >= 1 && !r.perm.endgame && !r.mem.climbed) {
        const spot = E.P(m, r.a, 1.1, 4.03 + (r.slot - 1) * 0.75), ct = 3 * (1.6 - (r.cap.endgame || 40) / 100);
        if (tl < H.travelEst(m, r, spot) + ct + 1.5 && tl > ct + 0.5) {
          r.mem.climbed = 1;
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
            return H.moveTo(m, r, E.P(m, r.a, 6.3, [1.6, 4.0, 6.4][r.slot]), () => H.act(r, need / rate + 0.4, () => { r.held = need; }, 'Auto sweep'), 'Auto: neutral sweep');
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
    },
    tick(m) {
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
    endSpot(m, r) { return E.P(m, r.a, 1.15, 4.03 + (r.slot - 1) * 0.75); },
    finishEnd(m) {
      m.robots.forEach(r => {
        if (r.end && r.end.lvl > 0 && !r.dead) { const p = [10, 20, 30][r.end.lvl - 1]; m.score[r.a].end += p; m.ss[r.a].tower += p; r.stats.pts += p; }
      });
    },
    bonus(m, a) {
      const ss = m.ss[a];
      const tower = m.done ? ss.tower : ss.tower + m.robots.filter(r => r.a === a && r.end && r.end.lvl > 0).reduce((s, r) => s + [10, 20, 30][r.end.lvl - 1], 0);
      return [
        { key: 'energized', name: 'Energized', val: ss.fuel, thr: 100, ok: ss.fuel >= 100, unit: 'fuel' },
        { key: 'super', name: 'Supercharged', val: ss.fuel, thr: 360, ok: ss.fuel >= 360, unit: 'fuel' },
        { key: 'trav', name: 'Traversal', val: tower, thr: 50, ok: tower >= 50, unit: 'tower pts' }
      ];
    },
    hud(m, a) { return [active26(m, a) ? 'HUB ACTIVE' : 'HUB INACTIVE']; }
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
  R[2022].defense = { eff: 2.2, foul: 0.8, range: 1.8, zone: 0.45 };
  R[2023].defense = { eff: 0.5, foul: 1.7 };
  R[2024].defense = { eff: 3.2, foul: 0.7, range: 2.0, zone: 0.7 };
  R[2025].defense = { eff: 0.5, foul: 1.7 };
  R[2026].defense = { eff: 1.8, foul: 0.9, range: 1.7, zone: 0.35 };
  S[2022].meta = { defense: true, note: 'Defense wins in RAPID REACT: top alliances send their third robot to harass the other alliance\'s best shooter around the Hub.' };
  S[2023].meta = { defense: false, note: 'Scoring wins in CHARGED UP: protected Communities and Loading Zones make defense weak, so most alliances run three scorers.' };
  S[2024].meta = { defense: true, note: 'Defense wins in CRESCENDO: one defender in the opponent\'s wing or near their Source is standard for top alliances.' };
  S[2025].meta = { defense: false, note: 'Scoring wins in REEFSCAPE: the Reef is hard to defend, so nearly every alliance runs three scorers.' };
  S[2026].meta = { defense: true, note: 'Defense wins in REBUILT: a defender in the opponent\'s alliance zone during their active shift cuts the fuel stream.' };

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
  S[2026].meta.faults = 'Common failures: brownouts. Multi-motor shooters and hoppers spinning at once pull huge current, so battery health matters more than ever.';
})();
