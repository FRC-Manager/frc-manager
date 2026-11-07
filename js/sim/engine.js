'use strict';
/* FRC Manager — headless match engine (10 ticks/s), shared by live view, quick sim and AI matches */
(function () {
  const U = G.U;
  const FW = 16.54, FH = 8.21, DT = 0.1;
  const E = G.Engine = { FW, FH, DT };

  const PACE = E.PACE = {
    push: { name: 'Push', spd: 1.10, cyc: 0.92, acc: -0.06, foul: 1.8, wear: 1.6, brown: 2.0 },
    bal: { name: 'Balanced', spd: 1.00, cyc: 1.00, acc: 0, foul: 1, wear: 1, brown: 1 },
    cons: { name: 'Conserve', spd: 0.92, cyc: 1.07, acc: 0.03, foul: 0.5, wear: 0.6, brown: 0.6 }
  };
  const dist = E.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const opp = a => a === 'red' ? 'blue' : 'red';
  E.opp = opp;

  // Field coordinates are authored for BLUE (left side); red is mirrored or rotated.
  E.P = function (m, a, x, y) {
    if (a === 'blue') return { x, y };
    return m.sym === 'mirror' ? { x: FW - x, y } : { x: FW - x, y: FH - y };
  };

  // ---------------------------------------------------------------
  E.create = function (o) {
    const S = G.Seasons[o.year], R = G.Rules[o.year];
    const m = {
      year: o.year, S, R, sym: S.sym, rng: G.makeRng(o.seed || 1), t: 0, phase: 'auto', done: false, inEnd: false,
      T: S.timing, total: S.timing.auto + S.timing.tele, robots: [], score: {}, ss: {}, log: [], fx: [], obs: [],
      headless: !!o.headless, playoff: !!o.playoff, calls: o.calls == null ? 3 : o.calls, callsUsed: 0, pending: [],
      diff: o.diff || 1, coachSkill: o.coachSkill || 50, playerTeam: o.playerTeam || null
    };
    ['red', 'blue'].forEach(a => {
      m.score[a] = { auto: 0, tele: 0, end: 0, foul: 0, total: 0 };
      (o[a] || []).forEach((en, i) => m.robots.push(makeRobot(m, a, i, en)));
    });
    R.init(m, H);
    m.robots.forEach(r => {
      const p = R.start(m, r);
      r.x = r.px = r.sx = p.x; r.y = r.py = r.sy = p.y;
      r.hd = (r.a === 'blue') ? 0 : Math.PI;
      r.autoOK = m.rng.chance(U.clamp(0.5 + 0.46 * r.cap.auto / 100 + (r.tuneAuto || 0), 0.3, 0.985));
    });
    return m;
  };

  function makeRobot(m, a, i, en) {
    const drv = en.drv || { drive: 50, comp: 50, aware: 50, mech: 50, hp: 50, strat: 50 };
    const conf = en.conf == null ? 0.5 : en.conf, tune = en.tune == null ? 0.5 : en.tune;
    return {
      team: en.team, a, slot: i, cap: en.cap, look: en.look || {}, drv, isPlayer: !!en.isPlayer,
      plan: Object.assign({ pace: 'bal', role: 'score', target: 'auto', endTiming: 'std', endLevel: 9, rpHunt: false, avoid: false, defTarget: null }, en.plan || {}),
      tune, conf, tuneAuto: en.tuneAuto || 0,
      drvF: 0.78 + 0.22 * drv.drive / 100 + 0.06 * conf,
      opF: 0.86 + 0.14 * drv.mech / 100,
      cond: en.cond == null ? 100 : en.cond, batt: en.batt == null ? 1 : en.batt, hidden: en.hidden || 0,
      x: 0, y: 0, px: 0, py: 0, sx: 0, sy: 0, hd: 0, path: [], st: 'idle', timer: 0, onDone: null, onArrive: null, label: 'Ready',
      held: 0, heldType: null, fault: null, jam: {}, perm: {}, dead: false, left: false,
      end: null, endBusy: false, climbing: false, defBy: null, defT: null, defSlow: 1, contacts: 0, defTime: 0,
      stats: { pts: 0, cycles: 0, shots: 0, hits: 0, fouls: 0, faults: [] }, replan: false, mem: {}
    };
  }

  // ---------------------------------------------------------------
  E.step = function (m) {
    if (m.done) return;
    for (let i = m.pending.length - 1; i >= 0; i--) {
      const c = m.pending[i];
      if (m.t >= c.at) { applyCall(m, c); m.pending.splice(i, 1); }
    }
    if (m.phase === 'auto' && m.t >= m.T.auto - 1e-6) toTeleop(m);
    m.inEnd = m.phase !== 'auto' && m.t >= m.total - m.T.end - 1e-6;
    if (m.inEnd && !m.endAnnounced) { m.endAnnounced = true; log(m, null, 'ENDGAME — ' + m.T.end + ' seconds left', 'phase'); }
    defensePass(m);
    for (const r of m.robots) updateRobot(m, r);
    separate(m);
    if (m.R.tick) m.R.tick(m, H);
    m.t = Math.round((m.t + DT) * 1000) / 1000;
    if (m.t >= m.total - 1e-6) finish(m);
  };
  E.run = function (m) { let g = 0; while (!m.done && g++ < 4000) E.step(m); return m.result; };

  function toTeleop(m) {
    m.phase = 'tele';
    const lp = m.R.leavePts || 0;
    m.robots.forEach(r => {
      if (lp && r.left) { m.score[r.a].auto += lp; r.stats.pts += lp; }
      if (!r.dead) {
        r.st = 'idle'; r.path = []; r.onDone = null; r.onArrive = null; r.onWait = null; r.waitFn = null; r.climbing = false;
        if (!r.keepEnd) { r.end = null; r.endBusy = false; }
      }
    });
    if (m.R.onTeleop) m.R.onTeleop(m, H);
    log(m, null, 'TELEOP', 'phase');
  }

  function updateRobot(m, r) {
    r.px = r.x; r.py = r.y;
    if (r.dead) { r.label = r.tipped ? 'TIPPED' : 'DISABLED'; return; }
    if (r.fault && m.t >= r.fault.until) { r.fault = null; if (r.st === 'idle') r.label = ''; }
    for (const k in r.jam) if (r.jam[k] && m.t >= r.jam[k]) r.jam[k] = 0;
    faultRoll(m, r);
    if (r.dead) return;
    if (r.fault && r.fault.stall) { r.label = r.fault.label; return; }
    if (r.replan && !r.endBusy && (r.st === 'move' || r.st === 'wait' || r.st === 'defend')) {
      r.st = 'idle'; r.path = []; r.onArrive = null; r.onWait = null; r.waitFn = null;
    }
    r.replan = false;
    if (m.phase !== 'auto' && !r.end && !r.endBusy && !r.climbing &&
      (r.st === 'wait' || r.st === 'defend' || r.st === 'move' || (r.st === 'act' && r.timer > 1.0)) && endgameDue(m, r)) {
      r.st = 'idle'; r.path = []; r.onWait = null; r.waitFn = null; r.onArrive = null; r.onDone = null;
    }
    switch (r.st) {
      case 'idle': decide(m, r); break;
      case 'move': moveStep(m, r); break;
      case 'act': {
        r.timer -= DT * (r.defBy && !r.climbing ? 0.85 : 1);
        if (r.timer <= 0) { const f = r.onDone; r.onDone = null; r.st = 'idle'; if (f) f(); }
        break;
      }
      case 'wait':
        r.timer -= DT;
        if (r.timer <= 0 || (r.waitFn && r.waitFn())) {
          const f = r.onWait; r.onWait = null; r.waitFn = null; r.st = 'idle'; if (f) f();
        }
        break;
      case 'defend': defendStep(m, r); break;
      default: break;
    }
    if (!r.left) r.left = m.R.leftCheck ? m.R.leftCheck(m, r) : dist(r, { x: r.sx, y: r.sy }) > 1.2;
  }

  function decide(m, r) {
    if (r.end) { r.st = 'done'; return; }
    if (m.phase === 'auto') {
      m.R.autoDecide(m, r, H);
      if (r.st === 'idle') { r.st = 'wait'; r.timer = 0.5; if (!r.label) r.label = 'Auto done'; }
      return;
    }
    if (!r.endBusy && endgameDue(m, r)) { goEndgame(m, r); return; }
    let role = r.plan.role;
    if (role !== 'defend' && r.perm.scorer && !(m.R.canStillScore && m.R.canStillScore(r))) role = r.cap.push >= 30 ? 'defend' : 'park';
    if (role === 'defend') { startDefend(m, r); return; }
    if (role === 'park') { r.st = 'wait'; r.timer = 2; r.label = 'Out of action'; return; }
    m.R.decide(m, r, H, role);
    if (r.st === 'idle') { r.st = 'wait'; r.timer = 0.4; if (!r.label) r.label = 'Waiting'; }
  }

  // ---------- movement ----------
  function moveTo(m, r, pt, then, label) {
    r.path = m.R.route ? (m.R.route(m, r, { x: r.x, y: r.y }, pt) || avoid(m, r, pt)) : avoid(m, r, pt);
    r.st = 'move'; r.onArrive = then || null; if (label) r.label = label;
    // alignment / acceleration overhead at the end of each leg
    r.settleT = E.dist(r, pt) < 0.3 ? 0 : (0.3 + 0.8 * (1 - (r.cap.agility || 30) / 100) + 1.1 * (1 - r.drv.drive / 100)) * (m.R.settle || 1);
  }
  function avoid(m, a, b) {
    for (const o of m.obs) {
      const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1e-6;
      let t = ((o.x - a.x) * dx + (o.y - a.y) * dy) / L2;
      t = U.clamp(t, 0, 1);
      const cx = a.x + dx * t, cy = a.y + dy * t;
      if (Math.hypot(o.x - cx, o.y - cy) < o.r && t > 0.03 && t < 0.97) {
        let nx = cx - o.x, ny = cy - o.y, nl = Math.hypot(nx, ny);
        if (nl < 1e-3) { nx = -dy; ny = dx; nl = Math.hypot(nx, ny) || 1; }
        const w = { x: U.clamp(o.x + nx / nl * (o.r + 0.55), 0.45, FW - 0.45), y: U.clamp(o.y + ny / nl * (o.r + 0.55), 0.45, FH - 0.45) };
        return [w, b];
      }
    }
    return [b];
  }
  E.avoid = avoid;
  function speedOf(m, r) {
    const c = r.cap;
    let v = 3.6 * (0.45 + 0.55 * c.speed / 100) * r.drvF * PACE[r.plan.pace].spd;
    if (r.defBy) v *= r.defSlow;
    if (r.plan.avoid) v *= 0.93;
    if (r.fault && r.fault.slow) v *= 0.5;
    if (m.R.slow) v *= m.R.slow(m, r);
    if (m.phase === 'auto' && !r.autoOK) v *= 0.55;
    for (const o of m.robots) {
      if (o !== r && Math.abs(o.x - r.x) < 0.95 && Math.abs(o.y - r.y) < 0.95) v *= 0.82 + 0.18 * c.agility / 100;
    }
    return Math.max(0.35, v);
  }
  function moveStep(m, r) {
    let step = speedOf(m, r) * DT;
    while (step > 1e-6 && r.path.length) {
      const p = r.path[0], d = dist(r, p);
      if (d <= step) { r.x = p.x; r.y = p.y; step -= d; r.path.shift(); }
      else { r.x += (p.x - r.x) / d * step; r.y += (p.y - r.y) / d * step; step = 0; }
    }
    const dx = r.x - r.px, dy = r.y - r.py;
    if (dx * dx + dy * dy > 1e-6) r.hd = Math.atan2(dy, dx);
    if (!r.path.length) {
      const f = r.onArrive; r.onArrive = null;
      if (r.settleT > 0.05) { const t = r.settleT; r.settleT = 0; r.st = 'act'; r.timer = t; r.onDone = f; return; }
      r.st = 'idle'; if (f) f();
    }
  }
  function stepToward(r, goal, step) {
    const d = dist(r, goal);
    if (d < 0.05) return;
    const k = Math.min(1, step / d);
    r.x += (goal.x - r.x) * k; r.y += (goal.y - r.y) * k;
    r.hd = Math.atan2(goal.y - r.py, goal.x - r.px);
  }
  function separate(m) {
    const rs = m.robots;
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
      const a = rs[i], b = rs[j];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d < 0.8 && d > 1e-4) {
        const push = (0.8 - d) / 2, ux = dx / d, uy = dy / d;
        if (!a.climbing && !a.dead && a.st !== 'done') { a.x -= ux * push; a.y -= uy * push; }
        if (!b.climbing && !b.dead && b.st !== 'done') { b.x += ux * push; b.y += uy * push; }
      }
    }
    for (const r of rs) { r.x = U.clamp(r.x, 0.4, FW - 0.4); r.y = U.clamp(r.y, 0.4, FH - 0.4); }
  }

  function act(r, secs, then, label) { r.st = 'act'; r.timer = Math.max(0.1, secs); r.onDone = then || null; if (label) r.label = label; }
  function waitUntil(r, fn, then, label, maxT) { r.st = 'wait'; r.timer = maxT || 999; r.waitFn = fn; r.onWait = then || null; if (label) r.label = label; }

  // ---------- defense ----------
  function startDefend(m, r) {
    let t = null;
    if (r.plan.defTarget) t = m.robots.find(x => x.team === r.plan.defTarget && x.a !== r.a && !x.dead);
    if (!t) {
      const os = m.robots.filter(x => x.a !== r.a && !x.dead);
      t = os.sort((p, q) => (q.stats.pts + power(q)) - (p.stats.pts + power(p)))[0];
    }
    if (!t) { r.st = 'wait'; r.timer = 1; r.label = 'Waiting'; return; }
    r.defT = t; r.st = 'defend'; r.label = 'Defending ' + t.team;
  }
  function power(r) { const c = r.cap; return (c.scoreSpd + c.accuracy + c.intake + c.speed) / 4; }
  function defendStep(m, r) {
    const t = r.defT;
    if (!t || t.dead || t.st === 'done' || t.climbing) { r.st = 'idle'; r.defT = null; return; }
    const guard = m.R.guard(m, t.a);
    let goal;
    if (dist(t, guard) < 6) goal = { x: t.x + (guard.x - t.x) * 0.2, y: t.y + (guard.y - t.y) * 0.2 };
    else goal = guard;
    stepToward(r, goal, speedOf(m, r) * DT * 0.95);
    r.label = 'Defending ' + t.team;
  }
  function defensePass(m) {
    for (const r of m.robots) { r.defBy = null; r.defSlow = 1; }
    for (const d of m.robots) {
      if (d.st !== 'defend' || !d.defT || d.dead || (d.fault && d.fault.stall)) continue;
      const t = d.defT;
      if (dist(d, t) < 1.4 && !t.climbing) {
        t.defBy = d;
        const inner = 0.5 + (d.cap.push * (0.8 + 0.2 * d.drvF) - 0.6 * t.cap.agility - 0.3 * t.cap.push) / 100;
        t.defSlow = U.clamp(1 - 0.4 * inner, 0.5, 0.95);
        t.defTime += DT; d.contacts += DT;
        const pf = 0.012 * PACE[d.plan.pace].foul * (1 - d.drv.comp / 220) * (d.plan.avoid ? 0.4 : 1);
        if (m.rng.next() < pf * DT) foul(m, d, m.rng.chance(0.2));
        if (m.rng.next() < 0.002 * DT) foul(m, t, false);
        const tall = t.cap.tall || 0;
        if (tall > 0 && m.rng.next() < 0.004 * tall * PACE[t.plan.pace].wear * (1 - t.drv.comp / 300) * DT) triggerFault(m, t, 'tip');
      }
    }
  }
  function foul(m, r, major) {
    const pts = major ? m.S.foul.major : m.S.foul.minor;
    m.score[opp(r.a)].foul += pts; r.stats.fouls++;
    log(m, r.a, (major ? 'MAJOR FOUL' : 'Foul') + ' on ' + r.team + ' (+' + pts + ' ' + opp(r.a) + ')', 'foul');
  }

  // ---------- faults ----------
  const FAULTS = [{ id: 'brown', w: 30 }, { id: 'intakeJam', w: 18 }, { id: 'scorerJam', w: 18 }, { id: 'mech', w: 9 }, { id: 'comms', w: 8 }];
  function faultRoll(m, r) {
    const c = r.cap, P = PACE[r.plan.pace];
    const h = 0.0002 * (1 + (100 - c.rel) / 25) * (1 + (100 - r.cond) / 40) * (1 + r.hidden * 0.8) * m.diff * P.wear;
    if (m.rng.next() < h * DT) { triggerFault(m, r, m.rng.wpick(FAULTS, f => f.w).id); return; }
    const hb = 0.00012 * P.brown * (r.batt < 0.8 ? 2 : 1) * (c.brown || 1);
    if (m.rng.next() < hb * DT) triggerFault(m, r, 'brown');
    if (m.rng.next() < 0.0006 * P.foul * (r.plan.avoid ? 0.5 : 1) * DT) foul(m, r, false);
  }
  function triggerFault(m, r, id) {
    const rng = m.rng; let msg = '';
    switch (id) {
      case 'brown': r.fault = { stall: true, until: m.t + rng.range(2, 5), label: 'BROWNOUT' }; msg = 'Brownout'; break;
      case 'intakeJam': r.jam.intake = m.t + rng.range(5, 20); msg = 'Intake jammed'; break;
      case 'scorerJam': r.jam.scorer = m.t + rng.range(5, 18); msg = 'Scorer jammed'; break;
      case 'mech': {
        const k = rng.pick(['intake', 'scorer', 'endgame']);
        r.perm[k] = true; msg = (k === 'endgame' ? 'Climber' : k === 'intake' ? 'Intake' : 'Scorer') + ' broke';
        break;
      }
      case 'comms':
        if (rng.chance(0.25)) { r.dead = true; r.st = 'dead'; msg = 'Lost comms — disabled'; }
        else { r.fault = { stall: true, until: m.t + rng.range(3, 6), label: 'COMMS LOSS' }; msg = 'Comms dropout'; }
        break;
      case 'tip': r.dead = true; r.tipped = true; r.st = 'dead'; msg = 'TIPPED OVER'; break;
    }
    r.stats.faults.push(msg);
    log(m, r.a, r.team + ': ' + msg, 'fault');
  }

  // ---------- endgame ----------
  function endLevelOf(m, r) {
    if (r.perm.endgame) return 0;
    const cap = m.R.endLevel ? m.R.endLevel(m, r) : (r.cap.endLevel || 0);
    return Math.min(cap, r.plan.endLevel == null ? 9 : r.plan.endLevel);
  }
  function climbTime(m, r, lvl) {
    const L = m.R.endgame.levels[lvl - 1];
    const base = typeof L.time === 'function' ? L.time(m, r) : L.time;
    return base * (1.6 - (r.cap.endgame || 40) / 100);
  }
  function endgameDue(m, r) {
    if (m.phase === 'auto' || r.end || r.endBusy) return false;
    const lvl = endLevelOf(m, r);
    const EG = m.R.endgame;
    if (lvl === 0 && !EG.park) return false;
    const tl = m.total - m.t;
    if (r.plan.endTiming === 'now') return true;
    if (tl > m.T.end + 25) return false;
    const spot = m.R.endSpot(m, r, lvl);
    const travel = dist(r, spot) / speedOf(m, r) + 1;
    const margin = { early: 8, std: 2.5, late: 0.5 }[r.plan.endTiming] || 2.5;
    const need = lvl > 0 ? climbTime(m, r, lvl) + travel + margin : travel + 1.5 + (r.plan.endTiming === 'early' ? 4 : 0);
    return tl <= need;
  }
  function goEndgame(m, r) {
    const lvl = endLevelOf(m, r);
    r.endBusy = true; r.endLvl = lvl;
    const spot = m.R.endSpot(m, r, lvl);
    const nm = m.S.endNames[lvl] || 'Park';
    moveTo(m, r, spot, () => {
      const begin = () => {
        if (lvl === 0) { r.end = { lvl: 0, park: true }; r.st = 'done'; r.label = 'Parked'; return; }
        r.climbing = true;
        act(r, climbTime(m, r, lvl), () => {
          const p = climbChance(m, r, lvl);
          if (m.rng.chance(p)) { r.end = { lvl }; r.label = nm; log(m, r.a, r.team + ' — ' + nm + '!', 'end'); }
          else { r.end = { lvl: 0, failed: true, park: true }; r.label = 'Climb failed'; r.stats.faults.push('Climb failed'); log(m, r.a, r.team + ' failed the climb', 'fault'); }
          r.st = 'done';
        }, 'Climbing ' + nm);
      };
      if (!m.inEnd) waitUntil(r, () => m.inEnd, begin, 'Waiting for endgame');
      else begin();
    }, lvl ? 'To ' + nm : 'Parking');
  }
  function climbChance(m, r, lvl) {
    if (m.R.endgame.levels[lvl - 1].sure) return 1;
    return U.clamp(0.62 + 0.36 * (r.cap.endgame || 40) / 100 - 0.05 * (lvl - 1) + 0.06 * (r.drv.comp - 50) / 50
      - (m.playoff ? 0.03 : 0) - (100 - r.cond) / 400 - (r.hidden ? 0.05 : 0), 0.25, 0.985);
  }

  // ---------- calls ----------
  E.call = function (m, team, call) {
    if (m.done || m.calls - m.callsUsed <= 0) return false;
    const r = m.robots.find(x => x.team === team);
    if (!r) return false;
    m.callsUsed++;
    const delay = 1 + 2 * (1 - (m.coachSkill || 50) / 100);
    m.pending.push({ at: m.t + delay, team, call });
    log(m, r.a, 'Coach call: ' + (call.text || call.kind), 'call');
    return true;
  };
  function applyCall(m, c) {
    const r = m.robots.find(x => x.team === c.team);
    if (!r || r.dead) return;
    if (m.rng.chance(0.1 * (1 - r.drv.comp / 100))) { log(m, r.a, r.team + ' misread the call', 'call'); return; }
    const k = c.call.kind, v = c.call.value;
    switch (k) {
      case 'pace': r.plan.pace = v; break;
      case 'role': r.plan.role = v.role; r.plan.defTarget = v.target || null; r.replan = true; break;
      case 'target': r.plan.target = v; r.replan = true; break;
      case 'endNow': r.plan.endTiming = 'now'; r.replan = true; break;
      case 'endTiming': r.plan.endTiming = v; break;
      case 'endLevel': r.plan.endLevel = v; break;
      case 'rp': r.plan.rpHunt = v; r.replan = true; break;
      case 'avoid': r.plan.avoid = v; break;
      case 'reset':
        if (r.fault && m.rng.chance(0.5)) r.fault.until = m.t;
        for (const j in r.jam) if (r.jam[j] && m.rng.chance(0.5)) r.jam[j] = 0;
        break;
    }
  }

  // ---------- finish ----------
  function finish(m) {
    m.done = true; m.phase = 'done'; m.t = m.total;
    m.R.finishEnd(m, H);
    ['red', 'blue'].forEach(a => { const s = m.score[a]; s.total = s.auto + s.tele + s.end + s.foul; });
    const res = {};
    ['red', 'blue'].forEach(a => {
      const s = m.score[a], so = m.score[opp(a)];
      const bonus = m.R.bonus(m, a);
      const win = s.total > so.total ? 1 : s.total === so.total ? 0.5 : 0;
      let rp = win === 1 ? m.S.rpWin : win === 0.5 ? 1 : 0;
      bonus.forEach(b => { if (b.ok) rp++; });
      res[a] = { score: s.total, auto: s.auto, tele: s.tele, end: s.end, foul: s.foul, rp, bonus, win };
    });
    res.winner = res.red.score > res.blue.score ? 'red' : res.blue.score > res.red.score ? 'blue' : 'tie';
    res.robots = m.robots.map(r => ({
      team: r.team, a: r.a, pts: r.stats.pts, cycles: r.stats.cycles, shots: r.stats.shots, hits: r.stats.hits,
      fouls: r.stats.fouls, faults: r.stats.faults.slice(), defTime: Math.round(r.defTime), contacts: Math.round(r.contacts),
      end: r.end, dead: r.dead, pace: r.plan.pace, autoOK: r.autoOK
    }));
    m.result = res;
    log(m, null, 'FINAL — Red ' + res.red.score + ' : ' + res.blue.score + ' Blue', 'phase');
  }

  function log(m, a, msg, kind) {
    if (m.headless && kind !== 'fault') return;
    m.log.push({ t: m.t, a, msg, kind: kind || '' });
  }

  // ---------- helpers exposed to season rules ----------
  const H = E.H = {
    P: E.P, dist, opp, moveTo, act, waitUntil, speedOf, log, foul,
    canCollect: (m, r) => !r.cap.noIntake && !r.perm.intake && !(r.jam.intake > m.t),
    canScore: (m, r) => !r.cap.noScorer && !r.perm.scorer && !(r.jam.scorer > m.t),
    collectTime(m, r, kind, base) {
      const i = r.cap.intake, P = PACE[r.plan.pace];
      let t = kind === 'ground' ? base * (1.6 - 0.9 * i / 100) : base * (1.4 - 0.55 * i / 100) * (1.15 - 0.3 * (m.hp[r.a] || 50) / 100);
      return t * P.cyc / (0.9 + 0.1 * r.opF) * (m.R.tempo ? m.R.tempo.c : 1);
    },
    scoreTime(m, r, base, stat) {
      const s = stat == null ? r.cap.scoreSpd : stat;
      return base * (1.5 - 0.8 * s / 100) * PACE[r.plan.pace].cyc / r.opF * (m.R.tempo ? m.R.tempo.s : 1);
    },
    endDue: (m, r) => m.phase !== 'auto' && !r.end && !r.endBusy && endgameDue(m, r),
    aimTime(m, r) {
      const c = r.cap;
      return (c.turret ? 0.3 : 0.95) * (c.visionLvl >= 1 ? 0.6 : 1) * (1.2 - 0.4 * r.drv.mech / 100);
    },
    hit(m, r, mult, distPen, stat) {
      const a = stat == null ? r.cap.accuracy : stat;
      let p = (0.2 + 0.77 * a / 100) * (0.9 + 0.1 * r.tune) * (mult || 1);
      p += PACE[r.plan.pace].acc - (distPen || 0);
      if (r.defBy) p -= 0.12 * (1 - r.drv.comp / 250);
      p *= 0.95 + 0.05 * r.opF;
      p -= (100 - r.cond) / 600;
      return U.clamp(p, 0.1, 0.99);
    },
    addPts(m, r, pts, label, at) {
      const k = m.phase === 'auto' ? 'auto' : 'tele';
      m.score[r.a][k] += pts; r.stats.pts += pts;
      if (!m.headless && label) m.fx.push({ k: 'pop', x: at ? at.x : r.x, y: at ? at.y : r.y, text: label, t: m.t, a: r.a });
    },
    shotFx(m, r, to, hit) { if (!m.headless) m.fx.push({ k: 'shot', x0: r.x, y0: r.y, x1: to.x, y1: to.y, t: m.t, hit, a: r.a }); },
    shootSpot(m, r, goal, zone) {
      const c = r.cap, R = (c.rangeM || 1.5) * (c.turret && c.visionLvl >= 2 ? 1.1 : 1), rmin = c.rmin || 1.0;
      const d = dist(r, goal);
      let p;
      const inZone = !zone || (r.x >= zone.x0 && r.x <= zone.x1 && r.y >= zone.y0 && r.y <= zone.y1);
      if (d <= R && d >= rmin && inZone) p = { x: r.x, y: r.y };
      else {
        const want = Math.max(rmin, R * 0.88), k = d > 1e-6 ? (d - want) / d : 0;
        p = { x: r.x + (goal.x - r.x) * k, y: r.y + (goal.y - r.y) * k };
      }
      if (zone) { p.x = U.clamp(p.x, zone.x0, zone.x1); p.y = U.clamp(p.y, zone.y0, zone.y1); }
      const dd = dist(p, goal);
      if (dd > R) { const k = (dd - R * 0.88) / dd; p = { x: p.x + (goal.x - p.x) * k, y: p.y + (goal.y - p.y) * k }; }
      else if (dd < rmin && dd > 1e-6) { const k = rmin / dd; p = { x: goal.x + (p.x - goal.x) * k, y: goal.y + (p.y - goal.y) * k }; }
      p.x = U.clamp(p.x, 0.5, FW - 0.5); p.y = U.clamp(p.y, 0.5, FH - 0.5);
      return p;
    },
    rangePen(m, r, goal) {
      const c = r.cap, d = dist(r, goal), span = Math.max(0.5, (c.rangeM || 1.5) - (c.rmin || 1));
      return 0.12 * U.clamp((d - (c.rmin || 1)) / span, 0, 1) * (1 - 0.25 * (c.visionLvl || 0));
    },
    nearest(r, pts) { let best = null, bd = 1e9; for (const p of pts) { const d = dist(r, p); if (d < bd) { bd = d; best = p; } } return best; },
    travelEst(m, r, pt) { return dist(r, pt) / speedOf(m, r); },
    alliance: (m, a) => m.robots.filter(x => x.a === a)
  };
})();
