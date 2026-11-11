'use strict';
/* FRC Manager — season rules for the match engine: the classic games (2016–2020). Same contract as rules.js. */
(function () {
  const U = G.U, E = G.Engine, FW = E.FW, FH = E.FH, H = E.H, Rules = G.Rules, S = G.Seasons, RR = E.RR;
  const leavePt = (r, d) => ({ x: U.clamp(r.sx + (r.a === 'blue' ? d : -d), 0.6, FW - 0.6), y: r.sy });
  // a robot's position in its own alliance's field coordinates (E.P is its own inverse)
  const loc = (m, r) => E.P(m, r.a, r.x, r.y);
  const setHp = m => { m.hp = {}; ['red', 'blue'].forEach(a => m.hp[a] = Math.max(40, ...m.robots.filter(r => r.a === a).map(r => r.drv.hp || 40))); };
  const inBox = (q, x0, x1, y0, y1) => q.x >= x0 && q.x <= x1 && q.y >= y0 && q.y <= y1;

  // =====================================================================
  // 2020 INFINITE RECHARGE
  // Field (blue's coordinates; red is rotated): an alliance shoots at the Power Port on the FAR wall and reloads at the
  // Loading Bay on its OWN wall, so a cycle runs the length of the field. Its Trench Run (with the Control Panel) lies
  // along the near-side rail; the Shield Generator and its switch stand in the middle.
  // =====================================================================
  const G20 = { port: { x: FW - 0.12, y: FH - 2.4 }, bay: { x: 0.75, y: FH - 2.5 }, line: FW - 3.05, panel: { x: 7.0, y: FH - 0.75 }, trench: { x0: 5.6, x1: 10.9, y0: FH - 1.45, y1: FH - 0.05 }, sw: { x: FW / 2 + 0.38, y: FH / 2 + 0.92, dx: 0.924, dy: -0.383 },
    // Shield Generator: a square turned 22.5 degrees that fills the gap between the two Trench Runs; its four pillars
    // (left, top, right, bottom, from the field's centre) stand at the trench edges
    gen: [[-2.5, -1.04], [1.04, -2.5], [2.5, 1.04], [-1.04, 2.5]],
    trenchCells: [[9.9, FH - 0.75], [9.0, FH - 0.75], [8.1, FH - 0.75], [6.3, FH - 0.5], [6.3, FH - 1.0]], midCells: [[5.6, 5.63], [6.09, 4.58], [6.4, 6.0], [9.73, 5.98], [9.9, 4.9]] };
  Rules.G20 = G20;
  const CAP20 = [9, 20, 20];
  const port20 = (m, a) => E.P(m, a, G20.port.x, G20.port.y);
  // loose cells are neutral: any robot may take them. Misses bounce back in front of the port.
  function spawnCell20(m, a) {
    const q = E.P(m, a, G20.port.x - m.rng.range(1.0, 3.6), G20.port.y + m.rng.range(-1.6, 1.6));
    m.cells.push({ x: U.clamp(q.x, 0.5, FW - 0.5), y: U.clamp(q.y, 0.45, FH - 0.45), t: m.t + 0.8 });
  }
  function ground20(m, r, maxD) {
    let best = null, bv = maxD == null ? 1e9 : maxD;
    for (const p of m.cells) {
      if (p.t > m.t || (p.claim && p.claim !== r.team && p.claimT > m.t)) continue;
      const d = E.dist(r, p);
      if (d < bv) { bv = d; best = p; }
    }
    return best;
  }
  function collect20(m, r, pt, kind) {
    const cap = r.cap.storage || 3;
    if (kind === 'ground') { pt.claim = r.team; pt.claimT = m.t + 6; }
    H.moveTo(m, r, kind === 'ground' ? pt : E.P(m, r.a, G20.bay.x, G20.bay.y + (r.slot - 1) * 0.5), () => {
      if (!H.canCollect(m, r)) return;
      if (kind === 'ground') {
        if (!m.cells.includes(pt)) return; // someone else got there first
        H.act(r, H.collectTime(m, r, 'ground', 1.0) / (r.cap.wide || 1), () => {
          const i = m.cells.indexOf(pt); if (i < 0) return; m.cells.splice(i, 1);
          r.held++; r.heldType = 'cell'; if (m.phase === 'auto') r.mem.got = (r.mem.got || 0) + 1;
        }, 'Intaking a cell');
      } else {
        const n = cap - r.held;
        H.act(r, n * H.collectTime(m, r, 'station', 0.75), () => { r.held = cap; r.heldType = 'cell'; }, 'Loading ' + n + ' cells');
      }
    }, kind === 'ground' ? 'To a cell' : 'To the Loading Bay');
  }
  // how far off the port's centre line a spot is, 0 (straight on) to 1 (60° or more): side shots cannot reach the Inner Port
  function offAxis20(m, a, spot) { const g = port20(m, a); return U.clamp(Math.abs(Math.atan2(spot.y - g.y, Math.abs(spot.x - g.x))) / (Math.PI / 3), 0, 1); }
  function score20(m, r) {
    const c = r.cap, goal = port20(m, r.a), ss = m.ss[r.a];
    let upper = !!c.upper;
    if (c.upper && c.lower) {
      if (r.plan.target === 'lower') upper = false;
      else if (r.plan.target === 'auto') upper = 2.2 * H.hit(m, r, 0.84, 0.05) > 1.0 * H.hit(m, r, 1.15);
    }
    let spot;
    if (upper) spot = H.shootSpot(m, r, goal, null);
    else { const q = E.P(m, r.a, G20.port.x - 0.75, G20.port.y + (r.slot - 1) * 0.55); spot = q; }
    H.moveTo(m, r, spot, () => {
      if (!H.canScore(m, r)) return;
      const n = r.held;
      H.act(r, H.aimTime(m, r) + n * H.scoreTime(m, r, upper ? 0.5 : 0.6), () => {
        let pts = 0;
        const pen = upper ? H.rangePen(m, r, goal) : 0, off = offAxis20(m, r.a, r);
        const pInner = upper ? U.clamp((0.06 + 0.5 * c.accuracy / 100 + 0.08 * (c.visionLvl || 0)) * (1 - 0.85 * off), 0.02, 0.8) : 0;
        for (let i = 0; i < n; i++) {
          const hit = m.rng.chance(H.hit(m, r, upper ? 0.78 : 1.12, pen));
          r.stats.shots++; H.shotFx(m, r, goal, hit);
          if (!hit) { spawnCell20(m, r.a); continue; }
          r.stats.hits++;
          const inner = upper && m.rng.chance(pInner), v = upper ? (inner ? 3 : 2) : 1;
          pts += m.phase === 'auto' ? v * 2 : v;
          ss.cells++; if (inner) ss.inner++;
          // only cells scored while a stage is charging count toward it; Stage 1 cannot finish before teleop
          if (ss.stage <= 3 && !ss.need) {
            ss.sc++;
            if (ss.sc >= CAP20[ss.stage - 1] && m.phase !== 'auto') stageFull20(m, r.a);
          }
        }
        r.held = 0; r.heldType = null; r.stats.cycles++;
        if (pts) H.addPts(m, r, pts, '+' + pts, goal);
      }, upper ? 'Shooting' : 'Bottom port');
    }, 'To shoot');
  }
  // a stage has its cells: Stage 1 simply activates; Stages 2 and 3 wait for the Control Panel
  function stageFull20(m, a) {
    const ss = m.ss[a];
    if (ss.stage === 1) { ss.stage = 2; ss.sc = 0; H.log(m, a, 'Stage 1 activated', 'end'); }
    else if (ss.stage === 2) { ss.need = 'rot'; H.log(m, a, 'Stage 2 at capacity — Rotation Control needed', 'end'); }
    else if (ss.stage === 3) { ss.need = 'pos'; H.log(m, a, 'Stage 3 at capacity — Position Control needed', 'end'); }
  }
  function panelBot20(m, a) {
    const ss = m.ss[a], lvl = ss.need === 'pos' ? 2 : 1;
    const c = m.robots.filter(r => r.a === a && !r.dead && !r.end && !r.endBusy && (r.cap.panel || 0) >= lvl && r.plan.role !== 'defend' && !r.perm.scorer);
    if (!c.length) return null;
    return c.sort((p, q) => (p.cap.scoreSpd || 0) - (q.cap.scoreSpd || 0) || p.slot - q.slot)[0]; // the weakest shooter leaves the line
  }
  function panel20(m, r) {
    const ss = m.ss[r.a], kind = ss.need;
    ss.panelBy = r.team;
    H.moveTo(m, r, E.P(m, r.a, G20.panel.x + 0.75, G20.panel.y), () => {
      if (ss.need !== kind) { ss.panelBy = null; return; }
      H.act(r, (kind === 'rot' ? 6.5 : 8.5) * (1.35 - 0.5 * r.drv.mech / 100) * (kind === 'pos' && (r.cap.visionLvl || 0) >= 1 ? 0.85 : 1), () => {
        ss.panelBy = null;
        if (ss.need !== kind) return;
        // Position Control has to stop on one colour: a nervous operator overshoots and tries again
        if (kind === 'pos' && !m.rng.chance(U.clamp(0.6 + 0.35 * r.drv.comp / 100 + 0.1 * (r.cap.visionLvl || 0), 0.4, 0.98))) { H.log(m, r.a, r.team + ' overshot the colour', ''); return; }
        ss.need = null;
        if (kind === 'rot') { ss.rot = true; ss.stage = 3; ss.sc = 0; H.addPts(m, r, 10, 'ROTATION +10'); H.log(m, r.a, r.team + ' — Rotation Control: Stage 2 activated', 'end'); }
        else { ss.pos = true; ss.stage = 4; H.addPts(m, r, 20, 'POSITION +20'); H.log(m, r.a, r.team + ' — Position Control: SHIELD ENERGIZED', 'end'); }
      }, kind === 'rot' ? 'Rotation Control' : 'Position Control');
    }, 'To the Control Panel');
  }
  Rules[2020] = {
    leavePts: 5, tempo: { c: 3.9, s: 2.7 },
    endgame: { levels: [{ name: 'Hang', pts: 25, time: 6.5, drop: 0.06 }], park: 5 },
    init(m) {
      setHp(m);
      m.cells = []; m.obs = [];
      // Shield Generator: four pillars, at the edges of the Trench Runs
      G20.gen.forEach(p => m.obs.push({ x: FW / 2 + p[0], y: FH / 2 + p[1], r: 0.28, h: 0.2 }));
      ['red', 'blue'].forEach(a => {
        // five cells in each Trench Run and five around each alliance's side of the Shield Generator
        G20.trenchCells.forEach(p => { const q = E.P(m, a, p[0], p[1]); m.cells.push({ x: q.x, y: q.y, t: 0, trench: a }); });
        G20.midCells.forEach(p => { const q = E.P(m, a, p[0], p[1]); m.cells.push({ x: q.x, y: q.y, t: 0 }); });
        m.ss[a] = { cells: 0, inner: 0, stage: 1, sc: 0, need: null, rot: false, pos: false, panelBy: null, level: false, endPts: 0 };
      });
      m.robots.forEach(r => { r.held = (r.cap.upper || r.cap.lower) ? Math.min(3, r.cap.storage || 3) : 0; if (r.held) r.heldType = 'cell'; });
    },
    // robots start on their Initiation Line, in front of the port they shoot at (the far wall from their drivers)
    start(m, r) { return E.P(m, r.a, G20.line, [G20.port.y, 7.2, 4.3][r.slot]); },
    aimAt: (m, r) => port20(m, r.a),
    // where this alliance wants to be (its shooting spot): a defender gets in the way of it
    guard(m, a) { return E.P(m, a, FW - 3.6, G20.port.y); },
    // Target Zone and Loading Zone (always), the alliance's own Trench Run, and the Rendezvous Point in the endgame
    protect(m, r) {
      const q = loc(m, r);
      if (q.x > FW - 0.9 && Math.abs(q.y - G20.port.y) < 1.1) return 'Target Zone';
      if (q.x < 1.0 && Math.abs(q.y - G20.bay.y) < 1.3) return 'Loading Zone';
      if (inBox(q, G20.trench.x0, G20.trench.x1, G20.trench.y0, G20.trench.y1)) return 'Trench Run';
      if (m.total - m.t <= 30 && Math.abs(q.x - FW / 2) < 2.7 && Math.abs(q.y - FH / 2) < 2.6) return 'Rendezvous Point';
      return '';
    },
    // tall robots cross mid-field over the generator's floor rails; trench-height robots slip under the Control Panel
    slow(m, r) {
      if (r.cap.lowProfile) return 1;
      const q = loc(m, r);
      return q.x > 5.6 && q.x < 10.9 ? 0.72 + 0.28 * (r.cap.traverse || 45) / 100 : 1;
    },
    autoDecide(m, r) {
      const max = m.S.autoPieces[r.cap.autoTier || 0];
      if (r.mem.got == null) r.mem.got = r.held;
      if (!r.autoOK) { if (!r.left && !r.mem.tx) { r.mem.tx = 1; H.moveTo(m, r, leavePt(r, -1.6), null, 'Auto (struggling)'); } else r.label = 'Auto stalled'; return; }
      const left = m.T.auto - m.t;
      if (r.held > 0 && H.canScore(m, r) && (!r.mem.first || r.held >= (r.cap.storage || 3) || r.mem.got >= max || !r.cap.ground || left < 4.5)) { r.mem.first = 1; return score20(m, r); }
      if (r.mem.got < max && r.cap.ground && H.canCollect(m, r) && left > 3) {
        // the alliance's own trench first, then whatever is close
        const own = m.cells.filter(p => p.trench === r.a && p.t <= m.t && !(p.claim && p.claim !== r.team && p.claimT > m.t)).sort((p, q) => E.dist(r, p) - E.dist(r, q))[0];
        const p = own || ground20(m, r, 4.5);
        if (p) return collect20(m, r, p, 'ground');
      }
      if (r.held > 0 && H.canScore(m, r)) return score20(m, r);
      if (!r.left) H.moveTo(m, r, leavePt(r, -1.6), null, 'Off the line');
      else r.label = 'Auto done';
    },
    decide(m, r) {
      const c = r.cap, cap = c.storage || 3, ss = m.ss[r.a];
      if (ss.need && !ss.panelBy && panelBot20(m, r.a) === r && m.total - m.t > 14) return panel20(m, r);
      if (!c.upper && !c.lower) { r.label = 'No scorer'; return; }
      if (r.held >= cap && H.canScore(m, r)) return score20(m, r);
      if (r.held < cap && H.canCollect(m, r)) {
        const near = c.ground ? ground20(m, r, r.held > 0 ? 2.6 : 5) : null;
        if (near) return collect20(m, r, near, 'ground');
        if (r.held >= 3 && H.canScore(m, r)) return score20(m, r);
        return collect20(m, r, null, 'station');
      }
      if (r.held > 0 && H.canScore(m, r)) return score20(m, r);
      r.label = r.jam.intake ? 'Intake jammed' : r.jam.scorer ? 'Shooter jammed' : 'Waiting';
    },
    // robots hang side by side along the alliance's Generator Switch (or park under it)
    endSpot(m, r, lvl) { const k = (r.slot - 1) * 0.9; return E.P(m, r.a, G20.sw.x + k * G20.sw.dx + (lvl ? 0 : 0.21), G20.sw.y + k * G20.sw.dy + (lvl ? 0 : 0.5)); },
    finishEnd(m) {
      ['red', 'blue'].forEach(a => {
        const ss = m.ss[a], bots = m.robots.filter(r => r.a === a && r.end && !r.dead), hang = bots.filter(r => r.end.lvl > 0);
        let pts = 0;
        hang.forEach(r => { pts += 25; r.stats.pts += 25; });
        bots.filter(r => !(r.end.lvl > 0) && r.end.park).forEach(r => { pts += 5; r.stats.pts += 5; });
        // the switch is level if the hanging robots balance it: easy alone at the centre, harder with company, and a
        // sliding carriage fixes most of it
        if (hang.length) {
          const lev = hang.filter(r => r.cap.leveler).length, skill = U.avg(hang.map(r => (r.cap.endgame || 40) / 100));
          const p = U.clamp([0, 0.4, 0.2, 0.14][hang.length] + 0.3 * skill + 0.3 * Math.min(1, lev / Math.max(1, hang.length - 0.5)), 0.05, 0.97);
          if (m.rng.chance(p)) { ss.level = true; pts += 15; H.log(m, a, 'The Generator Switch is LEVEL (+15)', 'end'); }
        }
        ss.endPts = pts; m.score[a].end += pts;
      });
    },
    bonus(m, a) {
      const ss = m.ss[a];
      return [
        { key: 'operational', name: 'Shield Operational', val: ss.endPts, thr: 65, ok: ss.endPts >= 65, unit: 'pts' },
        { key: 'energized', name: 'Shield Energized', val: Math.min(3, ss.stage - 1), thr: 3, ok: ss.stage >= 4, unit: 'stages' }
      ];
    },
    hud(m, a) {
      const ss = m.ss[a];
      return [ss.stage >= 4 ? 'ENERGIZED' : 'STAGE ' + ss.stage + ' · ' + Math.min(ss.sc, CAP20[ss.stage - 1]) + '/' + CAP20[ss.stage - 1]].concat(ss.need ? [ss.need === 'rot' ? 'ROTATION CONTROL' : 'POSITION CONTROL'] : []);
    }
  };
  Rules[2020].defense = { eff: 1.3, foul: 1.3, range: 1.8, zone: 0.45, pin: 5, reset: 3 };
  Rules[2020].faults = { brown: 1.3, tip: 0.8, tipAll: 0.1, comms: 1.0 };
  S[2020].meta = { defense: false, note: 'Scoring wins in INFINITE RECHARGE: the Trench Run, the Target Zone and the Loading Zone are all protected, so a defender only gets a few seconds at mid-field. Top alliances run three shooters, and one of them carries a Control Panel spinner.',
    faults: 'Common failures: brownouts from flywheels and indexers running together, and cells jamming in the indexer.' };
  S[2020].tiebreak = 'Shield Generator';

  // =====================================================================
  // 2019 DESTINATION: DEEP SPACE
  // Field (mirrored): each alliance has the HAB platform and two Loading Stations on its own wall, a Cargo Ship in its
  // half and a Rocket on each side rail. A bay takes a hatch panel first, then cargo.
  // =====================================================================
  const G19 = { habX: 2.44, stations: [[0.75, 0.7], [0.75, FH - 0.7]], depots: [[1.35, 1.85], [1.35, FH - 1.85]] };
  const PL19 = { hatch: [1.3, 1.8, 2.3], cargo: [1.1, 1.6, 2.1] };
  function bays19() {
    const b = [];
    [FH / 2 - 0.3, FH / 2 + 0.3].forEach(y => b.push({ k: 'ship', lvl: 1, x: 5.08, y, hatch: 0, cargo: 0, front: true }));
    [FH / 2 - 1.28, FH / 2 + 1.28].forEach(y => [6.45, 7.0, 7.55].forEach(x => b.push({ k: 'ship', lvl: 1, x, y, hatch: 2, cargo: 0 }))); // a blank panel is already on: cargo can go straight in
    [0, 1].forEach(rk => { const y = rk ? FH - 1.05 : 1.05; [1, 2, 3].forEach(lvl => [5.3, 6.35].forEach(x => b.push({ k: 'rocket', rk, lvl, x, y, hatch: 0, cargo: 0 }))); });
    return b;
  }
  const rocketDone19 = (ss, rk) => ss.bays.filter(b => b.k === 'rocket' && b.rk === rk).every(b => b.hatch && b.cargo);
  const rocketFill19 = (ss, rk) => ss.bays.filter(b => b.k === 'rocket' && b.rk === rk).reduce((n, b) => n + (b.hatch ? 1 : 0) + (b.cargo ? 1 : 0), 0);
  // the best bay for the piece in hand (or the one to fetch): points per second, with a push toward the rocket the
  // alliance is trying to complete
  function pick19(m, r, type) {
    const ss = m.ss[r.a], c = r.cap, reach = c.reach || 1;
    let best = null, bv = -1;
    for (const b of ss.bays) {
      if (b.lvl > reach) continue;
      if (b.claim && b.claim !== r.team && b.claimT > m.t) continue;
      if (type === 'hatch' ? b.hatch : (!b.hatch || b.cargo)) continue;
      let val = type === 'hatch' ? 3.1 : 3; // a hatch is worth 2 and opens a bay for 3 more
      if (b.k === 'rocket') val += ss.goal === b.rk || r.plan.target === 'rocket' ? 2.2 + (reach >= 3 ? 0.5 * (b.lvl - 1) : 0) : -0.4;
      else if (r.plan.target === 'ship') val += 1.5;
      const q = E.P(m, r.a, b.x, b.y), t = E.dist(r, q) / 2.6 + PL19[type][b.lvl - 1] + 2.5;
      const ev = val / t + m.rng.next() * 0.01;
      if (ev > bv) { bv = ev; best = b; }
    }
    return best ? { b: best, ev: bv } : null;
  }
  function place19(m, r, b) {
    const type = r.heldType === 'hatch' ? 'hatch' : 'cargo', spot = E.P(m, r.a, b.x, b.y);
    b.claim = r.team; b.claimT = m.t + 9;
    H.moveTo(m, r, spot, () => {
      if (!H.canScore(m, r)) return;
      H.act(r, H.scoreTime(m, r, PL19[type][b.lvl - 1]), () => {
        if (type === 'hatch' ? b.hatch : (!b.hatch || b.cargo)) return; // the bay changed meanwhile: keep the piece and choose again
        r.stats.shots++;
        if (m.rng.chance(H.hit(m, r, [1.1, 1.0, 0.93][b.lvl - 1] * (type === 'hatch' ? 0.95 : 1)))) {
          const ss = m.ss[r.a];
          if (type === 'hatch') b.hatch = 1; else b.cargo = 1;
          r.stats.hits++; r.stats.cycles++;
          if (m.phase === 'auto') r.mem.got = (r.mem.got || 0) + 1;
          H.addPts(m, r, type === 'hatch' ? 2 : 3, type === 'hatch' ? '+2' : '+3', spot);
          r.held = 0; r.heldType = null;
          if (b.k === 'rocket' && !ss.rocket && rocketDone19(ss, b.rk)) { ss.rocket = true; H.log(m, r.a, 'ROCKET COMPLETE', 'end'); }
        } else if (m.rng.chance(r.cap.hatchFloor && type === 'hatch' ? 0.15 : 0.4)) { r.held = 0; r.heldType = null; r.label = 'Dropped it'; }
      }, 'Placing ' + (type === 'hatch' ? 'a hatch' : 'cargo') + (b.lvl > 1 ? ' (level ' + b.lvl + ')' : ''));
    }, b.k === 'ship' ? 'To the cargo ship' : 'To the rocket');
  }
  function collect19(m, r, type, b) {
    const ss = m.ss[r.a];
    if (b) { b.claim = r.team; b.claimT = m.t + 14; }
    // cargo: the depot beside the HAB while it lasts (ground intake), else the human player at a Loading Station
    const di = type === 'cargo' && r.cap.ground ? [0, 1].filter(i => ss.depot[i] > 0).sort((i, j) => E.dist(r, E.P(m, r.a, G19.depots[i][0], G19.depots[i][1])) - E.dist(r, E.P(m, r.a, G19.depots[j][0], G19.depots[j][1])))[0] : null;
    const st = G19.stations.map(p => E.P(m, r.a, p[0], p[1])).sort((p, q) => E.dist(r, p) - E.dist(r, q))[0];
    const pt = di != null ? E.P(m, r.a, G19.depots[di][0], G19.depots[di][1]) : st;
    H.moveTo(m, r, pt, () => {
      if (!H.canCollect(m, r)) return;
      H.act(r, di != null ? H.collectTime(m, r, 'ground', 1.2) : H.collectTime(m, r, 'station', type === 'hatch' ? (r.cap.hatchFloor ? 1.25 : 1.6) : 1.5), () => {
        if (di != null) { if (ss.depot[di] <= 0) return; ss.depot[di]--; }
        r.held = 1; r.heldType = type === 'hatch' ? 'hatch' : 'cargo19';
      }, type === 'hatch' ? 'Loading a hatch' : 'Loading cargo');
    }, di != null ? 'To the depot' : 'To the Loading Station');
  }
  // which HAB level a robot ends on: one Level 3 platform (the alliance's best Level 3 climber), two Level 2 platforms
  function habLevel19(m, r) {
    const bots = m.robots.filter(x => x.a === r.a && !x.dead && !x.perm.endgame).sort((p, q) => (q.cap.endLevel || 0) - (p.cap.endLevel || 0) || (q.cap.endgame || 0) - (p.cap.endgame || 0) || p.slot - q.slot);
    let l3 = false, l2 = 0, out = 1;
    for (const x of bots) {
      const cl = Math.max(1, x.cap.endLevel || 0);
      let lv = 1;
      if (cl >= 3 && !l3) { lv = 3; l3 = true; } else if (cl >= 2 && l2 < 2) { lv = 2; l2++; }
      if (x === r) { out = lv; break; }
    }
    return out;
  }
  Rules[2019] = {
    leavePts: 0, tempo: { c: 3.8, s: 3.3 },
    endgame: { levels: [{ name: 'HAB 1', pts: 3, time: 1.4, sure: true }, { name: 'HAB 2', pts: 6, time: 3.6 }, { name: 'HAB 3', pts: 12, time: 7.2, drop: 0.07 }], park: 0 },
    leftCheck: (m, r) => loc(m, r).x > G19.habX + 0.35,
    endLevel: (m, r) => habLevel19(m, r),
    init(m) {
      setHp(m);
      m.obs = [];
      ['red', 'blue'].forEach(a => {
        const c = E.P(m, a, 6.95, FH / 2); m.obs.push({ x: c.x, y: c.y, r: 1.2, h: 0.7 }); // the cargo ship
        const bots = m.robots.filter(r => r.a === a), hi = bots.filter(r => (r.cap.reach || 1) >= 3);
        // going for a rocket needs a three-level robot and an alliance quick enough to fill twelve places
        const goal = hi.length && (bots.some(r => r.isPlayer && (r.plan.rpHunt || r.plan.target === 'rocket')) || U.avg(bots.map(r => r.cap.scoreSpd || 0)) >= 58) ? 0 : null;
        m.ss[a] = { bays: bays19(), depot: [6, 6], goal, rocket: false, hab: 0 };
        // the two best drivers start on HAB Level 2 (6 points for leaving instead of 3)
        bots.slice().sort((p, q) => q.drv.drive - p.drv.drive).slice(0, 2).forEach(r => { if (r.drv.drive >= 45) r.mem.hab2 = true; });
      });
      m.robots.forEach(r => {
        // sandstorm: a camera lets the drivers do what the autonomous code cannot
        r.cap = Object.assign({}, r.cap, { auto: Math.max(r.cap.auto || 0, Math.round(0.85 * r.drv.drive)) });
        if (r.cap.hatch) { r.held = 1; r.heldType = 'hatch'; } else if (r.cap.cargo) { r.held = 1; r.heldType = 'cargo19'; }
      });
    },
    start(m, r) { return r.mem.hab2 ? E.P(m, r.a, 0.75, r.slot % 2 ? FH / 2 + 1.15 : FH / 2 - 1.15) : E.P(m, r.a, 1.8, [FH / 2, FH / 2 - 1.2, FH / 2 + 1.2][r.slot]); },
    // leaving the HAB in the sandstorm: 3 points, 6 from Level 2
    onTeleop(m) {
      m.robots.forEach(r => { if (r.left) { const p = r.mem.hab2 ? 6 : 3; m.score[r.a].auto += p; r.stats.pts += p; } });
    },
    guard(m, a) { return E.P(m, a, 4.6, FH / 2 - 1.4); },
    protect(m, r) { const q = loc(m, r); return m.total - m.t <= 30 && q.x < G19.habX + RR && Math.abs(q.y - FH / 2) < 2.1 ? 'HAB Zone' : ''; },
    autoDecide(m, r) {
      const max = m.S.autoPieces[r.cap.autoTier || 0], left = m.T.auto - m.t;
      if (r.mem.got == null) r.mem.got = 0;
      if (!r.autoOK) { if (!r.left && !r.mem.tx) { r.mem.tx = 1; H.moveTo(m, r, E.P(m, r.a, G19.habX + 1.2, r.sy > FH / 2 ? FH / 2 + 1.2 : FH / 2 - 1.2), null, 'Sandstorm (struggling)'); } else r.label = 'Sandstorm'; return; }
      if (r.mem.got < max && H.canScore(m, r)) {
        if (r.held) { const p = pick19(m, r, r.heldType === 'hatch' ? 'hatch' : 'cargo'); if (p && (p.b.k === 'ship' || left > 6)) return place19(m, r, p.b); }
        else if (left > 7.5 && H.canCollect(m, r)) { const type = r.mem.got >= 2 && r.cap.cargo ? 'cargo' : r.cap.hatch ? 'hatch' : null, p = type ? pick19(m, r, type) : null; if (p) return collect19(m, r, type, p.b); }
      }
      if (!r.left) H.moveTo(m, r, E.P(m, r.a, G19.habX + 1.3, r.y), null, 'Off the HAB');
      else r.label = 'Sandstorm done';
    },
    decide(m, r) {
      const c = r.cap;
      if (!c.hatch && !c.cargo) { r.label = 'No manipulator'; return; }
      if (r.held) {
        const p = H.canScore(m, r) ? pick19(m, r, r.heldType === 'hatch' ? 'hatch' : 'cargo') : null;
        if (p) return place19(m, r, p.b);
        if (H.canScore(m, r)) { r.held = 0; r.heldType = null; } // nowhere left for it
        else { r.label = 'Manipulator jammed'; return; }
      }
      if (!H.canCollect(m, r)) { r.label = 'Intake jammed'; return; }
      const ph = c.hatch ? pick19(m, r, 'hatch') : null, pc = c.cargo ? pick19(m, r, 'cargo') : null;
      if (!ph && !pc) { r.label = 'Everything is full'; return; }
      const type = pc && (!ph || pc.ev >= ph.ev) ? 'cargo' : 'hatch';
      return collect19(m, r, type, (type === 'cargo' ? pc : ph).b);
    },
    endSpot(m, r, lvl) {
      if (lvl >= 3) return E.P(m, r.a, 0.75, FH / 2);
      if (lvl === 2) return E.P(m, r.a, 0.75, r.slot % 2 ? FH / 2 + 1.15 : FH / 2 - 1.15);
      return E.P(m, r.a, 1.8, [FH / 2, FH / 2 - 1.25, FH / 2 + 1.25][r.slot]);
    },
    finishEnd(m) {
      ['red', 'blue'].forEach(a => {
        const ss = m.ss[a], bots = m.robots.filter(r => r.a === a && r.end && r.end.lvl > 0 && !r.dead);
        // a Level 3 lift with partner ramps carries one partner up with it
        const lifter = bots.find(r => r.end.lvl >= 3 && r.cap.buddy), rider = lifter && bots.filter(r => r !== lifter && r.end.lvl < 3).sort((p, q) => p.end.lvl - q.end.lvl)[0];
        if (rider && m.rng.chance(U.clamp(0.45 + 0.45 * (lifter.cap.endgame || 40) / 100, 0.3, 0.95))) { rider.end.lvl = 3; rider.end.lifted = true; H.log(m, a, lifter.team + ' lifted ' + rider.team + ' to HAB Level 3', 'end'); }
        bots.forEach(r => { const p = this.endgame.levels[r.end.lvl - 1].pts; ss.hab += p; m.score[a].end += p; r.stats.pts += p; });
      });
    },
    bonus(m, a) {
      const ss = m.ss[a], fill = Math.max(rocketFill19(ss, 0), rocketFill19(ss, 1));
      return [
        { key: 'rocket', name: 'Complete Rocket', val: fill, thr: 12, ok: rocketDone19(ss, 0) || rocketDone19(ss, 1), unit: 'pieces' },
        { key: 'hab', name: 'HAB Docking', val: ss.hab, thr: 15, ok: ss.hab >= 15, unit: 'pts' }
      ];
    },
    hud(m, a) { const ss = m.ss[a]; return ss.rocket ? ['ROCKET COMPLETE'] : ss.goal != null ? ['ROCKET ' + rocketFill19(ss, ss.goal) + '/12'] : []; },
    baysOf: (m, a) => m.ss[a].bays
  };
  Rules[2019].defense = { eff: 2.3, foul: 1.2, range: 1.7, zone: 0.4, pin: 5, reset: 3 };
  Rules[2019].faults = { brown: 0.9, tip: 1.7, tipAll: 0.3, comms: 1.0 };
  S[2019].meta = { defense: true, note: 'Defense wins in DEEP SPACE: nothing but the HAB is protected, so one robot parked in front of the other alliance\'s rocket or Loading Station can halve its cycles. Strong drivetrains matter more than in any other game.',
    faults: 'Common failures: tip-overs from tall elevators under defense, and falls from HAB Level 2 and 3.' };
  S[2019].tiebreak = 'HAB climb';

  // =====================================================================
  // 2018 FIRST POWER UP
  // Field (mirrored): each alliance has a Switch on its side; the Scale stands at mid-field. Each is a balance with a
  // plate per alliance, and which plate is whose is drawn at random for every match. More cubes on your plate than
  // on the opponents' = ownership = a point every second (two in auto).
  // =====================================================================
  const H18 = FH / 2;
  const G18 = { autoLine: 3.05, swX: 4.27, pY: [2.75, FH - 2.75], scX: FW / 2, scY: [1.85, FH - 1.85], exch: { x: 0.95, y: H18 - 0.9 }, pile: { x: 3.25, y: H18 }, lineX: 5.4, rung: { x: FW / 2 - 0.85, y: H18 } };
  const o18 = a => (a === 'red' ? 'blue' : 'red');
  // cubes on alliance a's plate and on the other plate, for: its own switch, the scale, the opponents' switch
  const swOwn18 = (m, a) => m.sw[a][m.side[a].sw] - m.sw[a][1 - m.side[a].sw];
  const scLead18 = (m, a) => m.scale[m.side[a].sc] - m.scale[1 - m.side[a].sc];
  const forced18 = (m, a, what) => !!(m.pu && m.pu.kind === 'force' && m.pu.a === a && m.pu.until > m.t && (what === 'sw' ? m.pu.lvl !== 2 : m.pu.lvl >= 2));
  const ownsSw18 = (m, a) => forced18(m, a, 'sw') || swOwn18(m, a) > 0;
  const ownsSc18 = (m, a) => forced18(m, a, 'sc') || (!forced18(m, o18(a), 'sc') && scLead18(m, a) > 0);
  const boosted18 = (m, a, what) => !!(m.pu && m.pu.kind === 'boost' && m.pu.a === a && m.pu.until > m.t && (what === 'sw' ? m.pu.lvl !== 2 : m.pu.lvl >= 2));
  // where a robot stands to reach a plate
  function spot18(m, r, kind) {
    const s = m.side[r.a], q = loc(m, r);
    if (kind === 'scale') return E.P(m, r.a, G18.scX - 1.15, G18.scY[s.sc]);
    if (kind === 'switch') return E.P(m, r.a, G18.swX + (q.x > G18.swX ? 1.0 : -1.0), G18.pY[s.sw]);
    if (kind === 'deny') return E.P(m, r.a, FW - G18.swX - 1.0, G18.pY[1 - m.side[o18(r.a)].sw]);
    return E.P(m, r.a, G18.exch.x, G18.exch.y); // the Exchange
  }
  // what to do with the next cube: the plate that most needs it, or the Vault
  function want18(m, r) {
    const a = r.a, o = o18(a), ss = m.ss[a], reach = r.cap.reach || 1, tl = m.total - m.t, t = r.plan.target;
    const sc = scLead18(m, a), sw = swOwn18(m, a), dn = swOwn18(m, o);
    // the alliance's two best elevators work the Scale; everybody else keeps the Switch, feeds the Vault and tips the other Switch
    const scaler = reach >= 2 && ss.scalers.includes(r.team), opts = [];
    if (reach >= 2) opts.push(['scale', (sc <= 0 ? 10 : sc === 1 ? 6.5 : sc === 2 ? 2.6 : 0.7) * (t === 'scale' ? 1.6 : 1) * (scaler ? 1 : 0.45)]);
    opts.push(['switch', (sw <= 0 ? 8.5 : sw === 1 ? 4 : sw === 2 ? 1.2 : 0.3) * (t === 'switch' ? 1.6 : 1) * (scaler ? 0.7 : 1)]);
    opts.push(['deny', (dn <= 0 ? (dn === 0 ? 2.6 : 0.4) : dn === 1 ? 3.2 : 1.1) * (scaler ? 0.5 : 1)]);
    if (ss.vault < 9) opts.push(['vault', (ss.vault < 3 ? 3.3 : ss.vault < 6 ? 2.7 : 2.1) * (t === 'vault' ? 1.8 : 1) * (scaler ? 0.45 : 1)]);
    let best = null, bv = -1;
    opts.forEach(([k, v]) => {
      const sp = spot18(m, r, k), ev = v / (E.dist(r, sp) / 2.6 + (k === 'scale' ? 3.2 : 2.2) + 2) * (tl < 9 && k !== 'vault' ? 0.5 : 1) + m.rng.next() * 0.01;
      if (ev > bv) { bv = ev; best = k; }
    });
    return best;
  }
  function place18(m, r, kind) {
    const sp = spot18(m, r, kind), a = r.a, o = o18(a), ss = m.ss[a];
    H.moveTo(m, r, sp, () => {
      if (!H.canScore(m, r)) return;
      H.act(r, H.scoreTime(m, r, kind === 'scale' ? 1.9 : kind === 'vault' ? 0.9 : 1.2), () => {
        r.stats.shots++;
        if (kind === 'vault') { if (ss.vault >= 9) return; ss.vault++; r.stats.hits++; r.stats.cycles++; r.held = 0; r.heldType = null; H.addPts(m, r, 5, 'VAULT +5', sp); return; }
        if (m.rng.chance(H.hit(m, r, kind === 'scale' ? 0.94 : 1.08))) {
          if (kind === 'scale') m.scale[m.side[a].sc]++; else if (kind === 'switch') m.sw[a][m.side[a].sw]++; else m.sw[o][1 - m.side[o].sw]++;
          r.stats.hits++; r.stats.cycles++; r.mem[kind] = (r.mem[kind] || 0) + 1;
          if (m.phase === 'auto') r.mem.got = (r.mem.got || 0) + 1;
          r.held = 0; r.heldType = null;
          if (!m.headless) m.fx.push({ k: 'pop', x: sp.x, y: sp.y, text: kind === 'scale' ? 'SCALE' : kind === 'switch' ? 'SWITCH' : 'DENY', t: m.t, a });
        } else if (m.rng.chance(0.6)) { r.held = 0; r.heldType = null; r.label = 'Cube fell off'; }
      }, kind === 'scale' ? 'Placing on the Scale' : kind === 'vault' ? 'Feeding the Exchange' : kind === 'switch' ? 'Placing on the Switch' : 'Tipping their Switch');
    }, kind === 'scale' ? 'To the Scale' : kind === 'vault' ? 'To the Exchange' : kind === 'switch' ? 'To our Switch' : 'To their Switch');
  }
  // nearest cube on the way to where it will go: the pile by the Switch, the line behind it, or a Portal at the far end
  function collect18(m, r, kind) {
    const ss = m.ss[r.a], tgt = spot18(m, r, kind), src = [];
    if (ss.pile > 0) src.push({ k: 'pile', p: E.P(m, r.a, G18.pile.x - 0.35, G18.pile.y + (r.slot - 1) * 0.5) });
    if (ss.line > 0) src.push({ k: 'line', p: E.P(m, r.a, G18.lineX + 0.45, H18 + ((6 - ss.line) - 2.5) * 0.66) });
    [0.8, FH - 0.8].forEach(y => src.push({ k: 'portal', p: E.P(m, r.a, FW - 1.0, y) }));
    const best = src.sort((p, q) => (E.dist(r, p.p) + E.dist(p.p, tgt) + (p.k === 'portal' ? 1.5 : 0)) - (E.dist(r, q.p) + E.dist(q.p, tgt) + (q.k === 'portal' ? 1.5 : 0)))[0];
    r.mem.want = kind;
    H.moveTo(m, r, best.p, () => {
      if (!H.canCollect(m, r)) return;
      if (best.k !== 'portal' && ss[best.k] <= 0) return;
      H.act(r, (best.k === 'portal' ? H.collectTime(m, r, 'station', 1.5) : H.collectTime(m, r, 'ground', 1.25)) / (r.cap.wide || 1), () => {
        if (best.k !== 'portal') { if (ss[best.k] <= 0) return; ss[best.k]--; }
        r.held = 1; r.heldType = 'pcube';
      }, best.k === 'portal' ? 'Loading at the Portal' : 'Grabbing a cube');
    }, best.k === 'portal' ? 'To the Portal' : 'To a cube');
  }
  const PU18 = { lev: ['lev', 'boost', 'force'], boost: ['boost', 'lev', 'force'], force: ['force', 'boost', 'lev'] };
  // the drive coaches play the power-ups (one at a time). A sharper coach notices the moment sooner.
  function coach18(m) {
    if (m.phase === 'auto') return;
    const tl = m.total - m.t, busy = m.pu && m.pu.until > m.t && m.pu.kind !== 'lev';
    (m.rng.chance(0.5) ? ['red', 'blue'] : ['blue', 'red']).forEach(a => {
      const ss = m.ss[a], c = ss.cols, skill = m.playerTeam && m.robots.some(r => r.a === a && r.team === m.playerTeam) ? m.coachSkill : 55;
      if (!m.rng.chance(0.2 + 0.7 * skill / 100)) return;
      if (!ss.used.lev && c.lev >= 3 && tl < 27) { ss.used.lev = true; H.log(m, a, 'LEVITATE played', 'end'); }
      if (busy || (m.pu && m.pu.until > m.t && m.pu.kind !== 'lev')) return;
      const oSw = swOwn18(m, a) > 0, oSc = scLead18(m, a) > 0;
      if (!ss.used.boost && c.boost >= 1) {
        const lv = c.boost, gain = (lv !== 2 && oSw ? 1 : 0) + (lv >= 2 && oSc ? 1 : 0), full = lv === 3 ? 2 : 1;
        if ((gain >= full && (lv === 3 || tl < 50)) || (gain > 0 && tl < 14)) { ss.used.boost = true; m.pu = { kind: 'boost', a, lvl: lv, until: m.t + 10 }; H.log(m, a, 'BOOST ' + lv + ' played', 'end'); return; }
      }
      if (!ss.used.force && c.force >= 1) {
        const lv = c.force, gain = (lv !== 2 && !oSw ? 1 : 0) + (lv >= 2 && !oSc ? 1 : 0);
        if ((gain >= 1 && (lv >= 2 || tl < 40) && (lv === 3 || tl < 60)) || (gain > 0 && tl < 13)) { ss.used.force = true; m.pu = { kind: 'force', a, lvl: lv, until: m.t + 10 }; H.log(m, a, 'FORCE ' + lv + ' played', 'end'); }
      }
    });
  }
  Rules[2018] = {
    leavePts: 5, tempo: { c: 3.1, s: 2.6 },
    endgame: { levels: [{ name: 'Climb', pts: 30, time: 6.5, drop: 0.05 }], park: 5 },
    leftCheck: (m, r) => loc(m, r).x > G18.autoLine + 0.35,
    // the rung has room for two: the alliance's two best climbers go up, the rest park on the platform
    endLevel(m, r) {
      if (!(r.cap.endLevel > 0)) return 0;
      const c = m.robots.filter(x => x.a === r.a && !x.dead && !x.perm.endgame && x.cap.endLevel > 0).sort((p, q) => (q.cap.buddy ? 1 : 0) - (p.cap.buddy ? 1 : 0) || (q.cap.endgame || 0) - (p.cap.endgame || 0) || p.slot - q.slot);
      return c.indexOf(r) < 2 ? 1 : 0;
    },
    init(m) {
      setHp(m);
      // the plate assignment (the "game data"): which plate of each balance belongs to whom
      const scTop = m.rng.chance(0.5) ? 0 : 1;
      m.side = { blue: { sw: m.rng.chance(0.5) ? 0 : 1, sc: scTop }, red: { sw: m.rng.chance(0.5) ? 0 : 1, sc: 1 - scTop } };
      m.sw = { red: [0, 0], blue: [0, 0] }; m.scale = [0, 0]; m.pu = null; m.sec = 0;
      m.obs = [{ x: FW / 2, y: H18, r: 0.75, h: 0.5 }];
      ['red', 'blue'].forEach(a => {
        const c = E.P(m, a, G18.swX, H18); m.obs.push({ x: c.x, y: c.y, r: 0.95, h: 0.6 });
        const bots = m.robots.filter(r => r.a === a);
        const scalers = bots.filter(r => (r.cap.reach || 1) >= 2).sort((p, q) => (q.cap.scoreSpd || 0) - (p.cap.scoreSpd || 0)).slice(0, 2).map(r => r.team);
        // in auto one robot takes the Switch (Auto Quest needs it): the one with the simplest routine
        const autoSw = bots.filter(r => (r.cap.autoTier || 0) >= 1).sort((p, q) => (p.cap.autoTier || 0) - (q.cap.autoTier || 0) || (p.cap.reach || 1) - (q.cap.reach || 1) || p.slot - q.slot)[0];
        m.ss[a] = { pile: 10, line: 6, vault: 0, cols: { lev: 0, boost: 0, force: 0 }, used: { lev: false, boost: false, force: false }, quest: false, runs: 0, climbs: 0, swSec: 0, scSec: 0, scalers, autoSw: autoSw ? autoSw.team : null };
      });
      m.robots.forEach(r => { r.held = 1; r.heldType = 'pcube'; });
    },
    start(m, r) { return E.P(m, r.a, 0.6, [H18 + 0.4, 1.4, FH - 1.4][r.slot]); },
    guard(m, a) { return E.P(m, a, G18.scX - 1.6, H18); },
    protect(m, r) {
      const q = loc(m, r), s = m.side[r.a];
      if (Math.abs(q.x - G18.scX) < 1.9 && Math.abs(q.y - G18.scY[s.sc]) < 1.1 && q.x < G18.scX + 0.2) return 'Null Territory';
      if (q.x < 1.5 && Math.abs(q.y - G18.exch.y) < 0.9) return 'Exchange Zone';
      if (m.total - m.t <= 30 && Math.abs(q.x - G18.scX) < 1.7 && Math.abs(q.y - H18) < 1.5 && q.x < G18.scX) return 'Platform Zone';
      return '';
    },
    onTeleop(m) {
      ['red', 'blue'].forEach(a => { const ss = m.ss[a], bots = m.robots.filter(r => r.a === a); ss.runs = bots.filter(r => r.left).length; ss.quest = ss.runs >= 3 && swOwn18(m, a) > 0; if (ss.quest) H.log(m, a, 'AUTO QUEST complete', 'end'); });
    },
    // once a second: ownership points, and the coaches look at their power-ups
    tick(m) {
      m.sec += E.DT;
      if (m.sec < 1 - 1e-6 || m.done) return;
      m.sec -= 1;
      const auto = m.phase === 'auto', key = auto ? 'auto' : 'tele';
      ['red', 'blue'].forEach(a => {
        const ss = m.ss[a], bots = m.robots.filter(r => r.a === a);
        // ownership points are credited to the robots that put the cubes there (whole points, remainders carried over)
        const give = (pts, what) => { m.score[a][key] += pts; const tot = bots.reduce((n, r) => n + (r.mem[what] || 0), 0);
          bots.forEach(r => { r.mem.ownF = (r.mem.ownF || 0) + (tot ? pts * (r.mem[what] || 0) / tot : pts / bots.length); const w = Math.floor(r.mem.ownF); if (w > 0) { r.stats.pts += w; r.mem.ownF -= w; } }); };
        if (ownsSw18(m, a)) { ss.swSec++; give((auto ? 2 : 1) * (boosted18(m, a, 'sw') ? 2 : 1), 'switch'); }
        if (ownsSc18(m, a)) { ss.scSec++; give((auto ? 2 : 1) * (boosted18(m, a, 'sc') ? 2 : 1), 'scale'); }
        // the Vault's columns fill in the coach's order: Levitate, then Boost, then Force (unless the alliance asked otherwise)
        let v = ss.vault; (PU18[(m.puPref && m.puPref[a]) || 'lev'] || PU18.lev).forEach(k => { ss.cols[k] = Math.min(3, v); v = Math.max(0, v - 3); });
      });
      coach18(m);
    },
    autoDecide(m, r) {
      const tier = r.cap.autoTier || 0, max = m.S.autoPieces[tier], left = m.T.auto - m.t, reach = r.cap.reach || 1;
      if (r.mem.got == null) r.mem.got = 0;
      if (!r.autoOK) { if (!r.left && !r.mem.tx) { r.mem.tx = 1; H.moveTo(m, r, E.P(m, r.a, G18.autoLine + 0.9, r.slot === 0 ? H18 + 1.9 : loc(m, r).y), null, 'Auto (struggling)'); } else r.label = 'Auto stalled'; return; }
      if (r.mem.got < max && H.canScore(m, r)) {
        // a scale auto goes for the Scale, everything else for the alliance's own Switch
        const kind = tier >= 2 && reach >= 2 && m.ss[r.a].autoSw !== r.team && (r.mem.got === 0 || scLead18(m, r.a) <= 1) ? 'scale' : 'switch';
        if (r.held) return place18(m, r, kind);
        if (left > 5 && H.canCollect(m, r) && m.ss[r.a].line > 0) return collect18(m, r, kind);
      }
      if (!r.left) H.moveTo(m, r, E.P(m, r.a, G18.autoLine + 0.9, r.slot === 0 ? H18 + 1.9 : loc(m, r).y), null, 'Auto-run');
      else r.label = 'Auto done';
    },
    decide(m, r) {
      if (r.held) {
        if (!H.canScore(m, r)) { r.label = 'Lift jammed'; return; }
        return place18(m, r, want18(m, r));
      }
      if (!H.canCollect(m, r)) { r.label = 'Intake jammed'; return; }
      return collect18(m, r, want18(m, r));
    },
    endSpot(m, r, lvl) { return lvl ? E.P(m, r.a, G18.rung.x, H18 + (r.slot - 1) * 0.5) : E.P(m, r.a, G18.rung.x - 0.6, H18 + (r.slot - 1) * 1.0); },
    finishEnd(m) {
      ['red', 'blue'].forEach(a => {
        const ss = m.ss[a], bots = m.robots.filter(r => r.a === a && r.end && !r.dead), up = bots.filter(r => r.end.lvl > 0);
        let climbs = up.length;
        // partner forks carry a robot that is parked underneath
        const lifter = up.find(r => r.cap.buddy), rider = lifter && bots.filter(r => !(r.end.lvl > 0) && r.end.park)[0];
        if (rider && m.rng.chance(U.clamp(0.4 + 0.5 * (lifter.cap.endgame || 40) / 100, 0.3, 0.95))) { rider.end.lifted = true; climbs++; H.log(m, a, lifter.team + ' carried ' + rider.team + ' up', 'end'); }
        if (ss.used.lev && climbs < 3) { climbs++; ss.lev = true; }
        const parked = bots.filter(r => !(r.end.lvl > 0) && r.end.park && !r.end.lifted).length - (ss.lev && bots.some(r => !(r.end.lvl > 0) && !r.end.lifted) ? 1 : 0);
        const pts = 30 * climbs + 5 * Math.max(0, parked);
        ss.climbs = climbs; m.score[a].end += pts;
        up.forEach(r => { r.stats.pts += 30; });
      });
    },
    bonus(m, a) {
      const ss = m.ss[a];
      return [
        { key: 'quest', name: 'Auto Quest', val: ss.quest ? 3 : Math.min(2, ss.runs), thr: 3, ok: ss.quest, unit: 'tasks' },
        { key: 'boss', name: 'Face the Boss', val: ss.climbs, thr: 3, ok: ss.climbs >= 3, unit: 'climbs' }
      ];
    },
    hud(m, a) {
      const ss = m.ss[a], out = [];
      if (ownsSc18(m, a)) out.push('SCALE'); if (ownsSw18(m, a)) out.push('SWITCH');
      out.push('VAULT ' + ss.vault + '/9');
      if (m.pu && m.pu.until > m.t && m.pu.a === a) out.push(m.pu.kind.toUpperCase() + '!');
      return out;
    }
  };
  Rules[2018].defense = { eff: 1.4, foul: 1.2, range: 1.7, zone: 0.4, pin: 5, reset: 3 };
  Rules[2018].faults = { brown: 1.0, tip: 1.8, tipAll: 0.3, comms: 1.0 };
  S[2018].meta = { defense: false, note: 'Ownership wins in FIRST POWER UP: the alliance that holds the Scale for most of the match almost always wins, so the best elevators go there and the third robot feeds the Vault and keeps the Switch. A robot at its own end of the Scale cannot be touched, which leaves little room for defense.',
    faults: 'Common failures: tip-overs with the elevator up at the Scale, and cubes jammed sideways in the intake.' };
  S[2018].tiebreak = 'climb';

  // =====================================================================
  // 2017 FIRST STEAMWORKS
  // Field (mirrored): each alliance has its Airship (three gear pegs toward its wall, three ropes on the far side),
  // its Boiler in a corner of its own wall, two fuel Hoppers on the side rails, and its Loading Station for gears in
  // the far corner. Gears turn rotors; fuel makes pressure; the human players are the pilots who haul the gears up.
  // =====================================================================
  const H17 = FH / 2;
  const G17 = { base: 2.36, ship: { x: 3.95, y: H17, r: 1.15 }, pegs: [[2.9, H17], [3.42, H17 - 0.98], [3.42, H17 + 0.98]], ropes: [[5.0, H17], [4.48, H17 - 0.98], [4.48, H17 + 0.98]],
    boiler: { x: 0.35, y: FH - 0.35 }, key: { x: 1.7, y: FH - 1.6 }, station: { x: FW - 0.95, y: 1.0 }, hoppers: [[3.2, FH - 0.45], [5.2, 0.45]] };
  Rules.G17 = G17;
  const ROTOR17 = [1, 3, 7, 13];
  // rotors that the gears on board can turn (the spare gear on the airship may only be used once auto is over)
  function rotors17(m, a) {
    const ss = m.ss[a], have = ss.gears + (m.phase === 'auto' ? 0 : 1), n = ROTOR17.filter(k => k <= have).length;
    if (n <= ss.rotors) return;
    const pts = (m.phase === 'auto' ? 60 : 40) * (n - ss.rotors), key = m.phase === 'auto' ? 'auto' : 'tele';
    if (m.phase === 'auto') ss.autoRotors = n;
    ss.rotors = n; m.score[a][key] += pts;
    H.log(m, a, 'Rotor ' + n + ' is turning (+' + pts + ')', 'end');
    if (!m.headless) { const q = E.P(m, a, G17.ship.x, G17.ship.y); m.fx.push({ k: 'pop', x: q.x, y: q.y, text: 'ROTOR ' + n, t: m.t, a }); }
  }
  function kpa17(m, r, kpa) {
    const ss = m.ss[r.a], before = Math.floor(ss.kpa + 1e-9);
    ss.kpa += kpa;
    const gain = Math.floor(ss.kpa + 1e-9) - before;
    if (gain > 0) H.addPts(m, r, gain, '+' + gain + ' kPa', E.P(m, r.a, G17.boiler.x + 0.4, G17.boiler.y - 0.4));
  }
  // gears: the Loading Station at the far end, then a peg. The pilot's hands decide how long the peg is busy.
  function gearFetch17(m, r) {
    const st = E.P(m, r.a, G17.station.x, G17.station.y + r.slot * 0.55);
    H.moveTo(m, r, st, () => {
      if (!H.canCollect(m, r)) return;
      H.act(r, H.collectTime(m, r, r.cap.gearFloor ? 'ground' : 'station', r.cap.gearFloor ? 1.1 : 1.9), () => { r.held = 1; r.heldType = 'gear'; }, 'Loading a gear');
    }, 'To the Loading Station');
  }
  function gearPlace17(m, r) {
    const ss = m.ss[r.a];
    // the least busy peg (the centre one faces the wall and is the easiest to reach from a start position)
    const k = [0, 1, 2].sort((i, j) => (ss.peg[i] - ss.peg[j]) || (E.dist(r, E.P(m, r.a, G17.pegs[i][0], G17.pegs[i][1])) - E.dist(r, E.P(m, r.a, G17.pegs[j][0], G17.pegs[j][1]))))[0];
    const pg = G17.pegs[k], spot = E.P(m, r.a, pg[0] - (k === 0 ? 0.58 : 0.36), pg[1] + (k === 1 ? -0.5 : k === 2 ? 0.5 : 0));
    ss.peg[k] = Math.max(ss.peg[k], m.t) + 4;
    H.moveTo(m, r, spot, () => {
      if (!H.canScore(m, r)) return;
      const hp = m.hp[r.a] || 50;
      // lining up on the peg, then the pilot hauls the gear up
      H.act(r, H.scoreTime(m, r, 1.5) + 1.6 * (1.45 - 0.7 * hp / 100), () => {
        r.stats.shots++;
        ss.peg[k] = m.t;
        const ok = m.rng.chance(H.hit(m, r, 1.06)) && m.rng.chance(0.86 + 0.13 * hp / 100);
        if (ok) {
          r.held = 0; r.heldType = null; r.stats.hits++; r.stats.cycles++; ss.gears++;
          r.stats.pts += 9; // a gear's share of the rotors (4 rotors = 160 points for 13 gears, more in auto)
          if (m.phase === 'auto') r.mem.got = (r.mem.got || 0) + 1;
          rotors17(m, r.a);
        } else if (!r.cap.gearFloor && m.rng.chance(0.55)) { r.held = 0; r.heldType = null; r.label = 'Gear dropped'; } // a floor pickup simply grabs it again
      }, 'On the peg');
    }, 'To the airship');
  }
  // fuel: a field Hopper (or the preload), then the Key in front of the Boiler
  function fuelLoad17(m, r) {
    const ss = m.ss[r.a], i = [0, 1].filter(k => ss.hop[k] > 0).sort((p, q) => E.dist(r, E.P(m, r.a, G17.hoppers[p][0], G17.hoppers[p][1])) - E.dist(r, E.P(m, r.a, G17.hoppers[q][0], G17.hoppers[q][1])))[0];
    if (i == null) return false;
    const hp = G17.hoppers[i], pt = E.P(m, r.a, hp[0], hp[1] + (hp[1] > H17 ? -0.75 : 0.75));
    H.moveTo(m, r, pt, () => {
      H.act(r, 3.2 * (1.35 - 0.5 * (r.cap.fuel || 40) / 100), () => {
        // a hopper tips fifty balls at a time; what the robot does not catch is lost on the carpet
        const n = Math.min(ss.hop[i], 50), got = Math.min(r.cap.storage - (r.fuel || 0), Math.round(n * (0.6 + 0.35 * (r.cap.fuel || 40) / 100)));
        ss.hop[i] -= n; r.fuel = (r.fuel || 0) + Math.max(0, got);
      }, 'Catching a hopper');
    }, 'To a hopper');
    return true;
  }
  function fuelShoot17(m, r) {
    const hi = !!r.cap.fuelHigh, by = E.P(m, r.a, G17.boiler.x, G17.boiler.y);
    const spot = hi ? E.P(m, r.a, G17.key.x + (r.slot - 1) * 0.35, G17.key.y - (r.slot - 1) * 0.35) : E.P(m, r.a, G17.boiler.x + 0.75, G17.boiler.y - 0.75);
    H.moveTo(m, r, spot, () => {
      if (!H.canScore(m, r) || !(r.fuel > 0)) return;
      const f = r.cap.fuel || 40, rate = hi ? (3 + 10 * f / 100) * (r.cap.storage >= 60 ? 1.35 : 1) : 16;
      const left = (m.phase === 'auto' ? m.T.auto : m.total) - m.t - 0.3, n = Math.max(1, Math.min(r.fuel, Math.floor(rate * Math.max(0.5, left - (hi ? H.aimTime(m, r) : 0.4)))));
      H.act(r, (hi ? H.aimTime(m, r) : 0.4) + n / rate, () => {
        const p = hi ? H.hit(m, r, 0.9, 0.04, f) : 0.92, hits = Math.round(n * U.clamp(p + m.rng.range(-0.08, 0.08), 0.05, 0.99));
        r.fuel -= n; r.stats.shots += n; r.stats.hits += hits; r.stats.cycles++;
        H.shotFx(m, r, by, hits > n / 2);
        m.ss[r.a].fuel += hits;
        kpa17(m, r, hits * (hi ? (m.phase === 'auto' ? 1 : 1 / 3) : (m.phase === 'auto' ? 1 / 3 : 1 / 9)));
      }, hi ? 'Shooting fuel' : 'Dumping fuel');
    }, 'To the boiler');
  }
  // a robot works fuel if it is told to, or if it carries the big shooter and the alliance has gear runners without it
  function fuelRole17(m, r) {
    const c = r.cap;
    if (!c.fuelHigh && !c.fuelLow) return false;
    if (r.plan.target === 'gears') return false;
    if (r.plan.target === 'fuel' || !c.gear) return true;
    const ss = m.ss[r.a];
    if (ss.gears >= 12) return true; // every rotor is turning: nothing left to do with gears
    return c.storage >= 60 && m.robots.filter(x => x.a === r.a && x !== r && !x.dead && x.cap.gear && x.plan.role !== 'defend').length >= 2;
  }
  Rules[2017] = {
    leavePts: 5, tempo: { c: 3.6, s: 3.1 },
    endgame: { levels: [{ name: 'Climb', pts: 50, time: 6.5, drop: 0.03 }], park: 0 },
    leftCheck: (m, r) => loc(m, r).x > G17.base + 0.3,
    init(m) {
      setHp(m);
      m.obs = [];
      ['red', 'blue'].forEach(a => {
        const c = E.P(m, a, G17.ship.x, G17.ship.y); m.obs.push({ x: c.x, y: c.y, r: 1.15, h: 0.95 });
        m.ss[a] = { gears: 0, rotors: 0, autoRotors: 0, kpa: 0, fuel: 0, hop: [100, 100], peg: [0, 0, 0] };
      });
      m.robots.forEach(r => { if (r.cap.gear) { r.held = 1; r.heldType = 'gear'; } r.fuel = (r.cap.fuelHigh || r.cap.fuelLow) ? Math.min(10, r.cap.storage || 0) : 0; });
    },
    start(m, r) { return E.P(m, r.a, 0.55, [H17, H17 - 1.9, H17 + 1.9][r.slot]); },
    aimAt: (m, r) => (r.fuel > 0 ? E.P(m, r.a, G17.boiler.x, G17.boiler.y) : null),
    guard(m, a) { return E.P(m, a, FW - 4.6, 2.3); },
    protect(m, r) {
      const q = loc(m, r);
      if (q.x > FW - 2.3 && q.y < 2.4) return 'Retrieval Zone';
      if (q.x < 2.5 && q.y > FH - 2.5 && q.x + (FH - q.y) < 3.6) return 'Key';
      if (m.total - m.t <= 30 && Math.hypot(q.x - G17.ship.x, q.y - G17.ship.y) < 2.0 && q.x > G17.ship.x) return 'Rope';
      return '';
    },
    onTeleop(m) { ['red', 'blue'].forEach(a => rotors17(m, a)); }, // the spare gear comes into play
    autoDecide(m, r) {
      const tier = r.cap.autoTier || 0, c = r.cap, left = m.T.auto - m.t;
      if (r.mem.got == null) r.mem.got = 0;
      if (!r.autoOK) { if (!r.left && !r.mem.tx) { r.mem.tx = 1; H.moveTo(m, r, E.P(m, r.a, G17.base + 0.8, r.slot === 0 ? H17 + 2.4 : loc(m, r).y), null, 'Auto (struggling)'); } else r.label = 'Auto stalled'; return; }
      const fuelBot = (c.fuelHigh || c.fuelLow) && (!c.gear || tier >= 2);
      if (c.gear && tier >= 1 && r.held && !r.mem.gearTried && H.canScore(m, r)) { r.mem.gearTried = 1; return gearPlace17(m, r); }
      if (fuelBot && H.canScore(m, r) && left > 3) {
        // the best fuel autos trigger a hopper first; the others fire the ten preloaded balls
        if (tier >= 3 && c.storage >= 60 && !r.mem.hop && left > 9 && fuelLoad17(m, r)) { r.mem.hop = 1; return; }
        if (r.fuel > 0) return fuelShoot17(m, r);
      }
      if (!r.left) H.moveTo(m, r, E.P(m, r.a, G17.base + 0.8, r.slot === 0 ? H17 + 2.4 : loc(m, r).y), null, 'Across the base line');
      else r.label = 'Auto done';
    },
    decide(m, r) {
      const c = r.cap, ss = m.ss[r.a];
      if (r.held) { if (!H.canScore(m, r)) { r.label = 'Gear mechanism jammed'; return; } if (ss.gears < 12) return gearPlace17(m, r); r.held = 0; r.heldType = null; }
      if (fuelRole17(m, r)) {
        if (!H.canScore(m, r)) { r.label = 'Shooter jammed'; return; }
        if ((r.fuel || 0) >= Math.min(c.storage, 25) || ((r.fuel || 0) > 0 && !ss.hop.some(h => h > 0))) return fuelShoot17(m, r);
        if (fuelLoad17(m, r)) return;
        if (r.fuel > 0) return fuelShoot17(m, r);
      }
      if (c.gear && ss.gears < 12) { if (!H.canCollect(m, r)) { r.label = 'Gear mechanism jammed'; return; } return gearFetch17(m, r); }
      r.label = 'Nothing left to do';
    },
    endSpot(m, r) { const p = G17.ropes[r.slot]; return E.P(m, r.a, p[0] + 0.55, p[1] + (r.slot === 1 ? -0.3 : r.slot === 2 ? 0.3 : 0)); },
    finishEnd(m) {
      ['red', 'blue'].forEach(a => {
        const ss = m.ss[a];
        m.robots.filter(r => r.a === a && r.end && r.end.lvl > 0 && !r.dead).forEach(r => { m.score[a].end += 50; r.stats.pts += 50; });
        // playoffs: the two bonuses are points instead of ranking points
        if (m.playoff) { if (ss.rotors >= 4) m.score[a].tele += 100; if (ss.kpa >= 40) m.score[a].tele += 20; }
      });
    },
    bonus(m, a) {
      const ss = m.ss[a];
      return [
        { key: 'kpa', name: 'Pressure (40 kPa)', val: Math.floor(ss.kpa + 1e-9), thr: 40, ok: ss.kpa >= 40 - 1e-9, unit: 'kPa' },
        { key: 'rotors', name: 'All Rotors', val: ss.rotors, thr: 4, ok: ss.rotors >= 4, unit: 'rotors' }
      ];
    },
    hud(m, a) { const ss = m.ss[a], nx = ROTOR17[ss.rotors]; return ['ROTORS ' + ss.rotors + '/4' + (nx ? ' · GEARS ' + (ss.gears + (m.phase === 'auto' ? 0 : 1)) + '/' + nx : ''), Math.floor(ss.kpa + 1e-9) + ' kPa']; }
  };
  Rules[2017].defense = { eff: 1.7, foul: 1.2, range: 1.7, zone: 0.45, pin: 5, reset: 3 };
  Rules[2017].faults = { brown: 0.9, tip: 0.6, tipAll: 0.1, comms: 1.0 };
  S[2017].meta = { defense: true, note: 'Gears and ropes win in FIRST STEAMWORKS: four rotors and three climbs beat almost anything, and fuel only decides matches between the very best. A defender in the lane between the Loading Station and the airship costs the other alliance a rotor. The human players matter here: the pilots haul every gear up by hand.',
    faults: 'Common failures: dropped gears on the peg, missed rope catches, and fuel jammed in the shooter.' };
  S[2017].tiebreak = 'climb';

  // =====================================================================
  // 2016 FIRST STRONGHOLD
  // Field (mirrored): an alliance attacks the tower on the FAR wall. Between the neutral zone and that tower's
  // courtyard stand five defenses in five lanes. Boulders come out of the Secret Passage on the neutral-zone side,
  // next to the low bar, so every cycle crosses a defense twice.
  // =====================================================================
  const H16 = FH / 2, PASS16 = 1.35, LINE16 = 10.25, LANE16 = i => (i + 0.5) * (FH - PASS16) / 5;
  const G16 = { tower: { x: FW - 0.45, y: H16 }, src: { x: 6.0, y: 0.7 }, mid: FW / 2, line: LINE16, pass: PASS16, ownEnd: FW - LINE16 + 0.65 };
  Rules.G16 = G16;
  // defense types: category, how long a crossing takes, how often a robot hangs up on it, what it needs
  const DEF16 = {
    lowbar: { n: 'Low Bar', ab: 'LB', cat: 'L', k: 0.75, stuck: 0, need: 'lowProfile' },
    portcullis: { n: 'Portcullis', ab: 'PC', cat: 'A', k: 1.5, stuck: 0.06, need: 'toolA' },
    cheval: { n: 'Cheval de Frise', ab: 'CF', cat: 'A', k: 1.45, stuck: 0.08, need: 'toolA' },
    moat: { n: 'Moat', ab: 'MT', cat: 'B', k: 1.35, stuck: 0.16 },
    ramparts: { n: 'Ramparts', ab: 'RP', cat: 'B', k: 1.25, stuck: 0.1 },
    drawbridge: { n: 'Drawbridge', ab: 'DB', cat: 'C', k: 2.1, stuck: 0.05, need: 'toolC' },
    sallyport: { n: 'Sally Port', ab: 'SP', cat: 'C', k: 1.9, stuck: 0.05, need: 'toolC' },
    rockwall: { n: 'Rock Wall', ab: 'RW', cat: 'D', k: 1.5, stuck: 0.18 },
    rough: { n: 'Rough Terrain', ab: 'RT', cat: 'D', k: 0.95, stuck: 0.03 }
  };
  Rules.DEF16 = DEF16;
  const canCross16 = (r, d) => { const T = DEF16[d.type]; return !T.need || !!r.cap[T.need]; };
  const crossTime16 = (r, d) => 2.2 * DEF16[d.type].k * (1.75 - 1.15 * (r.cap.traverse || 40) / 100) / (0.85 + 0.15 * r.drvF);
  const side16 = (m, r) => (loc(m, r).x > LINE16 ? 'c' : 'n');
  const breached16 = ss => ss.def.filter(d => d.dmg >= 2).length >= 4;
  // cross a defense (dir 1: into the courtyard, -1: back out). Going in, a defense that is not yet damaged scores.
  function cross16(m, r, dir, then) {
    const ss = m.ss[r.a], auto = m.phase === 'auto';
    const lanes = ss.def.map((d, i) => ({ d, i })).filter(x => canCross16(r, x.d));
    if (!lanes.length) { r.label = 'No defense it can cross'; r.st = 'wait'; r.timer = 2; return; }
    const y0 = loc(m, r).y, want = dir === 1 && !breached16(ss) && r.plan.target !== 'tower';
    const best = lanes.sort((p, q) => {
      const v = x => crossTime16(r, x.d) * (1 + 2.2 * DEF16[x.d.type].stuck * (1.3 - (r.cap.traverse || 40) / 100)) + Math.abs(LANE16(x.i) - y0) / 2.4 - (want && x.d.dmg < 2 ? (r.plan.target === 'breach' ? 6 : 3.2) : 0) + (x.d.busy > m.t ? 2 : 0);
      return v(p) - v(q);
    })[0], d = best.d, ly = LANE16(best.i);
    d.busy = m.t + 4;
    H.moveTo(m, r, E.P(m, r.a, LINE16 - dir * 0.95, ly), () => {
      const T = DEF16[d.type], stuck = m.rng.chance(U.clamp(T.stuck * (1.5 - 1.2 * (r.cap.traverse || 40) / 100) * 2, 0, 0.6));
      if (stuck) r.stats.stuck = (r.stats.stuck || 0) + 1;
      r.crossing = true;
      H.act(r, crossTime16(r, d) + (stuck ? m.rng.range(2.5, 5) : 0), () => {
        H.moveTo(m, r, E.P(m, r.a, LINE16 + dir * 0.95, ly), () => {
          r.crossing = false;
          if (dir === 1) {
            if (d.dmg < 2) {
              d.dmg++; const p = auto ? 10 : 5; H.addPts(m, r, p, T.ab + ' +' + p);
              if (!ss.breach && breached16(ss)) { ss.breach = true; H.log(m, r.a, 'BREACH: four defenses damaged', 'end'); }
            }
            if (auto) r.mem.crossed = true;
          }
          if (then) then();
        }, null);
      }, (stuck ? 'Stuck on the ' : 'Crossing the ') + T.n.toLowerCase());
    }, 'To the ' + DEF16[d.type].n.toLowerCase());
  }
  function shoot16(m, r) {
    const c = r.cap, a = r.a, ss = m.ss[a], tw = E.P(m, a, G16.tower.x, G16.tower.y);
    let upper = !!c.upper;
    if (c.upper && c.lower) { if (r.plan.target === 'lower') upper = false; else upper = 5 * H.hit(m, r, 0.82, 0.05) > 2 * H.hit(m, r, 1.15); }
    const zone = (() => { const p = E.P(m, a, LINE16 + 0.75, 0.6), q = E.P(m, a, FW - 1.3, FH - PASS16 - 0.5); return { x0: Math.min(p.x, q.x), x1: Math.max(p.x, q.x), y0: Math.min(p.y, q.y), y1: Math.max(p.y, q.y) }; })();
    const spot = upper ? H.shootSpot(m, r, tw, zone) : E.P(m, a, G16.tower.x - 1.25, G16.tower.y + (r.slot - 1) * 0.8);
    H.moveTo(m, r, spot, () => {
      if (!H.canScore(m, r)) return;
      H.act(r, H.aimTime(m, r) + H.scoreTime(m, r, upper ? 0.9 : 0.8), () => {
        const hit = m.rng.chance(H.hit(m, r, upper ? 0.82 : 1.15, upper ? H.rangePen(m, r, tw) : 0));
        r.stats.shots++; r.stats.cycles++; H.shotFx(m, r, tw, hit);
        r.held = 0; r.heldType = null;
        if (!hit) return;
        r.stats.hits++; ss.boulders++;
        const p = m.phase === 'auto' ? (upper ? 10 : 5) : (upper ? 5 : 2);
        H.addPts(m, r, p, '+' + p, tw);
        if (ss.boulders === ss.strength) H.log(m, a, 'The tower is WEAKENED', 'end');
      }, upper ? 'Shooting the high goal' : 'Low goal');
    }, 'To the tower');
  }
  function fetch16(m, r) {
    const ss = m.ss[r.a];
    // the boulders on the midline first, then the Secret Passage, where the human players roll them back out
    const midI = ss.mid > 0 && m.t < 40 ? ss.mid : 0;
    const pt = midI ? E.P(m, r.a, G16.mid - 0.45, 0.9 + (3 - midI) * 1.28) : E.P(m, r.a, G16.src.x - r.slot * 0.75, G16.src.y);
    H.moveTo(m, r, pt, () => {
      if (!H.canCollect(m, r)) return;
      if (midI && ss.mid <= 0) return;
      H.act(r, H.collectTime(m, r, 'ground', midI ? 1.0 : 1.3) * (midI ? 1 : 1.25 - 0.4 * (m.hp[r.a] || 50) / 100), () => { if (midI) { if (ss.mid <= 0) return; ss.mid--; } r.held = 1; r.heldType = 'boulder'; }, 'Picking up a boulder');
    }, midI ? 'To the midline' : 'To the Secret Passage');
  }
  Rules[2016] = {
    leavePts: 0, tempo: { c: 2.6, s: 2.2 },
    endgame: { levels: [{ name: 'Scale', pts: 15, time: 6, drop: 0.05 }], park: 5 },
    leftCheck: (m, r) => !!r.mem.crossed,
    init(m) {
      setHp(m);
      m.obs = [];
      ['red', 'blue'].forEach(a => {
        // the defenses this alliance has to cross were chosen by the other side: one from each category, in random lanes,
        // with the low bar always in the lane beside the Secret Passage
        const cats = { A: ['portcullis', 'cheval'], B: ['moat', 'ramparts'], C: ['drawbridge', 'sallyport'], D: ['rockwall', 'rough'] };
        const bots = m.robots.filter(r => r.a === a), ask = (m.defPick && m.defPick[a]) || {};
        const types = ['A', 'B', 'C', 'D'].map(c => ask[c] || (c === 'D' ? (m.rng.chance(0.65) ? 'rockwall' : 'rough') : m.rng.pick(cats[c])));
        m.rng.shuffle(types);
        m.ss[a] = { def: types.map(t => ({ type: t, dmg: 0, busy: 0 })).concat([{ type: 'lowbar', dmg: 0, busy: 0 }]), boulders: 0, strength: m.towerStrength || 8, breach: false, capture: false, mid: 3, onTower: 0, reach: 0 };
        const tw = E.P(m, a, G16.tower.x + 0.1, G16.tower.y); m.obs.push({ x: tw.x, y: tw.y, r: 0.6, h: 0.5 });
        bots.forEach(r => { if (r.cap.lower || r.cap.upper) { r.held = 1; r.heldType = 'boulder'; } });
      });
    },
    // robots start in the neutral zone, each in front of a lane it can cross
    start(m, r) {
      const ss = m.ss[r.a], ok = ss.def.map((d, i) => ({ d, i })).filter(x => canCross16(r, x.d)).sort((p, q) => crossTime16(r, p.d) - crossTime16(r, q.d));
      const lane = ok.length ? ok[Math.min(ok.length - 1, r.slot % Math.max(1, Math.min(ok.length, 3)))].i : [1, 2, 3][r.slot];
      return E.P(m, r.a, FW / 2 - 0.8 - (r.slot % 2) * 0.45, LANE16(lane) + (r.slot - 1) * 0.12); // on the auto line, facing the defense
    },
    aimAt: (m, r) => (side16(m, r) === 'c' ? E.P(m, r.a, G16.tower.x, G16.tower.y) : null),
    guard(m, a) { return E.P(m, a, FW - 2.6, H16); },
    protect(m, r) {
      if (r.crossing) return 'Outer Works';
      const q = loc(m, r);
      if (q.x < G16.ownEnd && q.y < PASS16) return 'Secret Passage';
      return '';
    },
    onTeleop(m) {
      // auto: reaching a defense without crossing it is worth 2
      m.robots.forEach(r => { if (r.mem.reached && !r.mem.crossed) { m.score[r.a].auto += 2; r.stats.pts += 2; m.ss[r.a].reach++; } r.crossing = false; });
    },
    autoDecide(m, r) {
      const tier = r.cap.autoTier || 0, left = m.T.auto - m.t;
      if (r.mem.did) { r.label = 'Auto done'; return; }
      const reach = () => { r.mem.did = 1; H.moveTo(m, r, E.P(m, r.a, LINE16 - 1.1, loc(m, r).y), () => { r.mem.reached = true; }, 'Reaching a defense'); };
      if (!r.autoOK || tier < 1) return reach();
      if (!r.mem.crossed) {
        if (r.mem.tryX) { r.mem.did = 1; return; }
        r.mem.tryX = 1;
        return cross16(m, r, 1, () => { r.mem.reached = true; });
      }
      r.mem.did = 1;
      if (tier >= 2 && r.held && H.canScore(m, r) && left > 3.5) { if (tier < 3) r.plan = Object.assign({}, r.plan, { target: r.cap.lower ? 'lower' : r.plan.target }); return shoot16(m, r); }
      r.label = 'Auto done';
    },
    decide(m, r) {
      const c = r.cap, sd = side16(m, r), ss = m.ss[r.a];
      if (r.crossing) r.crossing = false;
      if (!c.lower && !c.upper) {
        // nothing to score with: cross back and forth until the defenses are breached
        if (breached16(ss)) { r.label = 'Breached: nothing left to do'; return; }
        return cross16(m, r, sd === 'c' ? -1 : 1, null);
      }
      if (r.held) {
        if (sd === 'n') return cross16(m, r, 1, null);
        if (!H.canScore(m, r)) { r.label = 'Shooter jammed'; return; }
        return shoot16(m, r);
      }
      if (!H.canCollect(m, r)) { r.label = 'Intake jammed'; return; }
      if (sd === 'c') return cross16(m, r, -1, null);
      return fetch16(m, r);
    },
    endSpot(m, r, lvl) { return E.P(m, r.a, G16.tower.x - (lvl ? 0.75 : 1.05), G16.tower.y + (r.slot - 1) * 0.85); },
    finishEnd(m) {
      ['red', 'blue'].forEach(a => {
        const ss = m.ss[a], on = m.robots.filter(r => r.a === a && r.end && !r.dead && (r.end.lvl > 0 || r.end.park));
        on.forEach(r => { const p = r.end.lvl > 0 ? 15 : 5; m.score[a].end += p; r.stats.pts += p; });
        ss.onTower = on.length;
        ss.capture = ss.boulders >= ss.strength && on.length >= 3;
        if (ss.capture) H.log(m, a, 'TOWER CAPTURED', 'end');
        if (m.playoff) { if (breached16(ss)) m.score[a].tele += 20; if (ss.capture) m.score[a].tele += 25; }
      });
    },
    bonus(m, a) {
      const ss = m.ss[a];
      return [
        { key: 'breach', name: 'Breach', val: ss.def.filter(d => d.dmg >= 2).length, thr: 4, ok: breached16(ss), unit: 'defenses' },
        { key: 'capture', name: 'Capture', val: Math.min(ss.boulders, ss.strength), thr: ss.strength, ok: !!ss.capture, unit: 'boulders' }
      ];
    },
    hud(m, a) { const ss = m.ss[a]; return ['TOWER ' + Math.max(0, ss.strength - ss.boulders), 'DEFENSES ' + ss.def.filter(d => d.dmg >= 2).length + '/4']; },
    defOf: (m, a) => m.ss[a].def
  };
  Rules[2016].defense = { eff: 2.2, foul: 1.1, range: 1.8, zone: 0.45, pin: 5, reset: 3 };
  Rules[2016].faults = { brown: 0.9, tip: 1.6, tipAll: 0.5, comms: 1.25 };
  S[2016].meta = { defense: true, note: 'A blocker wins matches in FIRST STRONGHOLD: one robot waiting in its own courtyard can smother every shot taken from the tower\'s base. The answer is a shooter with range, and a low frame that slips under the low bar beside the Secret Passage. Breaching is routine; capturing the tower decides the rankings.',
    faults: 'Common failures: robots hung up on the moat and the rock wall, radios shaken loose by the defenses, and tip-overs on the ramparts.' };
  S[2016].tiebreak = 'tower';
})();
