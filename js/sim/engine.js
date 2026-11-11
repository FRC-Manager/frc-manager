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
      diff: o.diff || 1, coachSkill: o.coachSkill || 50, playerTeam: o.playerTeam || null,
      defPick: o.defPick || null, puPref: o.puPref || null, // classic games: the defenses chosen for an alliance (2016), an alliance's power-up order (2018)
      aud16: o.aud16 || null, towerStrength: o.towerStrength || null, // 2016: the audience's defense for this round, and the tower's starting strength (10 at championships)
      feedIQ: Object.assign({ red: 0, blue: 0 }, o.feedIQ || {}) // how well each alliance runs alternative strategies (2024 note feeding)
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
      r.autoOK = m.rng.chance(U.clamp(0.5 + 0.46 * r.cap.auto / 100 + (r.tuneAuto || 0), 0.3, 0.985)) && !r.autoFail;
      if (r.toolIn) { r.perm[r.toolIn] = true; const nm = r.toolIn === 'endgame' ? 'Climber' : r.toolIn === 'intake' ? 'Intake' : 'Scorer'; r.stats.faults.push(nm + ' blocked (tool left inside)'); log(m, r.a, r.team + ': ' + nm.toLowerCase() + ' blocked by a tool left inside the robot', 'fault'); }
    });
    return m;
  };

  function makeRobot(m, a, i, en) {
    const drv = en.drv || { drive: 50, comp: 50, aware: 50, mech: 50, hp: 50, strat: 50 };
    const conf = en.conf == null ? 0.5 : en.conf, tune = en.tune == null ? 0.5 : en.tune;
    return {
      team: en.team, a, slot: i, cap: en.cap, look: en.look || {}, drv, isPlayer: !!en.isPlayer,
      plan: Object.assign({ pace: 'bal', role: 'score', target: 'auto', endTiming: 'std', endLevel: 9, rpHunt: false, avoid: false, defTarget: null }, en.plan || {}),
      tune, conf, tuneAuto: en.tuneAuto || 0, autoFail: !!en.autoFail,
      // pit and drive-team slips (your robot only): a loose bumper, a blocked mechanism, a joystick left unplugged
      disableAt: en.disableAt || 0, teleDelay: en.teleDelay || 0, toolIn: en.toolIn || null,
      defSkill: en.defSkill || 0, // drilled against a defender on a second robot: loses less to defense
      elecK: en.elecK || 0,       // electrical system shaken down on a second robot: fewer brownouts and comms dropouts
      // practiced drive teams (confidence) drive faster, line up quicker, handle pieces faster, foul less and climb more surely; 0.6 ≈ an average AI team
      drvF: 0.816 + 0.22 * drv.drive / 100 + 0.16 * (conf - 0.6), confK: conf - 0.6,
      opF: 0.86 + 0.14 * drv.mech / 100,
      cond: en.cond == null ? 100 : en.cond, batt: en.batt == null ? 1 : en.batt, hidden: en.hidden || 0,
      x: 0, y: 0, px: 0, py: 0, sx: 0, sy: 0, hd: 0, path: [], st: 'idle', timer: 0, onDone: null, onArrive: null, label: 'Ready',
      held: 0, heldType: null, fault: null, jam: {}, perm: {}, dead: false, left: false,
      end: null, endBusy: false, climbing: false, defBy: null, defT: null, defSlow: 1, contacts: 0, defTime: 0,
      pinT: 0, sepT: 0, backoff: 0, pinLimit: null, pins: 0, prog: null,
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
    m.robots.forEach(r => {
      if (r.dead || !r.teleDelay) return;
      r.fault = { stall: true, until: m.t + r.teleDelay, label: 'NO JOYSTICK' };
      r.stats.faults.push('Joystick unplugged (' + r.teleDelay + ' s lost)'); log(m, r.a, r.team + ': joystick not plugged in — ' + r.teleDelay + ' seconds lost', 'fault');
    });
    if (m.R.onTeleop) m.R.onTeleop(m, H);
    log(m, null, 'TELEOP', 'phase');
  }

  function updateRobot(m, r) {
    r.px = r.x; r.py = r.y;
    if (r.dead) { r.label = r.tipped ? 'TIPPED' : 'DISABLED'; return; }
    if (r.fault && m.t >= r.fault.until) { r.fault = null; if (r.st === 'idle') r.label = ''; }
    for (const k in r.jam) if (r.jam[k] && m.t >= r.jam[k]) r.jam[k] = 0;
    if (r.disableAt && m.t >= r.disableAt) {
      r.disableAt = 0; r.dead = true; r.st = 'dead';
      r.stats.faults.push('Bumper fell off — disabled'); log(m, r.a, r.team + ': bumper fell off — disabled by the referee', 'fault');
      return;
    }
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
        r.timer -= DT * (r.defBy && !r.climbing ? 1 - 0.15 * ((m.R.defense && m.R.defense.eff) || 1) * (r.cap.turret ? 0.3 : 1) * (1 - DEF_DRILL * r.defSkill) : 1);
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
    // stuck in traffic or against a field element: sidestep around it; if it keeps failing near the goal, stop there
    if (r.st === 'move' && r.path.length) {
      const pg = r.prog || (r.prog = { t: m.t, x: r.x, y: r.y, n: 0 });
      if (m.t - pg.t >= 1.0) {
        if (Math.hypot(r.x - pg.x, r.y - pg.y) < 0.25) {
          pg.n++;
          const goal = r.path[r.path.length - 1];
          if (pg.n >= 3 && dist(r, goal) < 1.6) r.path = [];
          else r.path.unshift(sidestep(m, r, r.path[0], pg.n));
        } else pg.n = 0;
        pg.t = m.t; pg.x = r.x; pg.y = r.y;
      }
    } else r.prog = null;
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
    r.settleT = E.dist(r, pt) < 0.3 ? 0 : (0.3 + 0.8 * (1 - (r.cap.agility || 30) / 100) + 1.1 * (1 - r.drv.drive / 100)) * (m.R.settle || 1) * (1 - 0.6 * r.confK);
  }
  // Plans around field elements: the first element on the way gets a waypoint beside it, then both legs are checked
  // again (a couple of levels deep). Solid elements (o.h = physical radius) are inflated by half a robot.
  function avoid(m, a, b, depth, noEnd, low) {
    depth = depth || 0; if (noEnd == null) noEnd = !!a.endBusy;
    if (low == null) low = !!(a.cap && a.cap.lowProfile); // elements marked "under" (a low tunnel) only stop robots that do not fit beneath them
    const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1e-6;
    let hit = null;
    for (const o of m.obs) {
      if ((o.end && noEnd) || (o.under && low)) continue;
      const rad = o.h ? Math.max(o.r, o.h + RR + 0.05) : o.r;
      const t = U.clamp(((o.x - a.x) * dx + (o.y - a.y) * dy) / L2, 0, 1);
      const cx = a.x + dx * t, cy = a.y + dy * t;
      if (Math.hypot(o.x - cx, o.y - cy) < rad && t > 0.03 && t < 0.97 && (!hit || t < hit.t)) hit = { o, t, cx, cy, rad };
    }
    if (!hit) return [b];
    const o = hit.o;
    let nx = hit.cx - o.x, ny = hit.cy - o.y, nl = Math.hypot(nx, ny);
    if (nl < 1e-3) { nx = -dy; ny = dx; nl = Math.hypot(nx, ny) || 1; }
    const off = o.h ? hit.rad + 0.3 : o.r + 0.55;
    // go round the side the path leans towards, unless that side is against a wall or another solid element
    const side = k => {
      const p = { x: o.x + nx / nl * off * k, y: o.y + ny / nl * off * k };
      const c = { x: U.clamp(p.x, 0.45, FW - 0.45), y: U.clamp(p.y, 0.45, FH - 0.45) };
      let bad = Math.hypot(p.x - c.x, p.y - c.y);
      for (const q of m.obs) if (q !== o && q.h && !(q.end && noEnd) && !(q.under && low)) bad += Math.max(0, q.h + RR - Math.hypot(c.x - q.x, c.y - q.y));
      return { c, bad };
    };
    const s1 = side(1), s2 = s1.bad > 0.15 ? side(-1) : null;
    const w = s2 && s2.bad < s1.bad ? s2.c : s1.c;
    if (depth >= 2) return [w, b];
    return avoid(m, a, w, depth + 1, noEnd, low).concat(avoid(m, w, b, depth + 1, noEnd, low));
  }
  // Unstick: try headings from "slightly sideways" round to "straight back" and take the first one with room to drive
  function sidestep(m, r, goal, n) {
    const base = Math.atan2(goal.y - r.y, goal.x - r.x), k = 0.7 + 0.25 * Math.min(n, 4), sgn = (n + r.slot) % 2 ? 1 : -1;
    const room = p => {
      let c = Math.min(p.x - RR, FW - RR - p.x, p.y - RR, FH - RR - p.y) + 0.43;
      for (const o of m.robots) if (o !== r) c = Math.min(c, Math.hypot(o.x - p.x, o.y - p.y) - 2 * RR);
      for (const o of m.obs) if (o.h && !(o.end && r.endBusy) && !(o.under && r.cap.lowProfile)) c = Math.min(c, Math.hypot(o.x - p.x, o.y - p.y) - o.h - RR);
      return c;
    };
    let best = null, bc = -1e9;
    for (const deg of [60, -60, 95, -95, 130, -130, 180]) {
      const g = base + sgn * deg * Math.PI / 180, p = { x: U.clamp(r.x + Math.cos(g) * k, 0.5, FW - 0.5), y: U.clamp(r.y + Math.sin(g) * k, 0.5, FH - 0.5) };
      const c = Math.min(room(p), room({ x: (p.x + r.x) / 2, y: (p.y + r.y) / 2 }) + 0.2);
      if (c > 0.05) return p;
      if (c > bc) { bc = c; best = p; }
    }
    return best;
  }
  E.avoid = avoid;
  function speedOf(m, r) {
    const c = r.cap;
    let v = 3.6 * (0.45 + 0.55 * c.speed / 100) * r.drvF * PACE[r.plan.pace].spd * (c.noGrip ? 0.88 : 1); // mecanum rollers turn a good part of the motors' work into sideways slip
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
  // Robots are about 0.86 m across with bumpers: they push each other apart (a robot that cannot move — climbing,
  // disabled or parked — makes the other one give way completely) and cannot drive through solid field elements
  // (hubs, reef, stage legs, barge leg, towers and cages; a robot heading for its climb may touch its own tower/cage).
  const RR = E.RR = 0.43;
  const fixed = r => r.climbing || r.dead || r.st === 'done';
  function separate(m) {
    const rs = m.robots, D2 = 2 * RR;
    for (let it = 0; it < 3; it++) {
      for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
        const a = rs[i], b = rs[j], fa = !fixed(a), fb = !fixed(b);
        if (!fa && !fb) continue;
        let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d >= D2) continue;
        if (d < 1e-4) { dx = 0.3; dy = a.slot >= b.slot ? 0.3 : -0.3; d = Math.hypot(dx, dy); }
        const over = D2 - d, ux = dx / d, uy = dy / d, ka = fa ? (fb ? 0.5 : 1) : 0, kb = fb ? (fa ? 0.5 : 1) : 0;
        a.x -= ux * over * ka; a.y -= uy * over * ka; b.x += ux * over * kb; b.y += uy * over * kb;
      }
      for (const r of rs) {
        if (fixed(r)) continue;
        for (const o of m.obs) {
          if (!o.h || (o.end && (r.endBusy || r.end)) || (o.under && r.cap.lowProfile)) continue;
          const dx = r.x - o.x, dy = r.y - o.y, d = Math.hypot(dx, dy), min = o.h + RR;
          if (d >= min) continue;
          if (d < 1e-4) { r.x = o.x + min; continue; }
          r.x = o.x + dx / d * min; r.y = o.y + dy / d * min;
        }
      }
    }
    for (const r of rs) { r.x = U.clamp(r.x, RR, FW - RR); r.y = U.clamp(r.y, RR, FH - RR); }
  }

  function act(r, secs, then, label) { r.st = 'act'; r.timer = Math.max(0.1, secs); r.onDone = then || null; if (label) r.label = label; }
  function waitUntil(r, fn, then, label, maxT) { r.st = 'wait'; r.timer = maxT || 999; r.waitFn = fn; r.onWait = then || null; if (label) r.label = label; }

  // ---------- defense ----------
  function startDefend(m, r) {
    let t = null;
    if (r.plan.defTarget) t = m.robots.find(x => x.team === r.plan.defTarget && x.a !== r.a && !x.dead);
    if (!t && m.R.defTarget) t = m.R.defTarget(m, r); // season-specific target (e.g. 2024: shut down the feeder)
    if (!t) {
      const os = m.robots.filter(x => x.a !== r.a && !x.dead);
      // defenders go after the best scorer they can actually slow down: turrets shoot on the move, so they are poor targets
      const val = q => (q.stats.pts + power(q)) * (q.cap.turret ? 0.75 : 1);
      t = os.sort((p, q) => val(q) - val(p))[0];
    }
    if (!t) { r.st = 'wait'; r.timer = 1; r.label = 'Waiting'; return; }
    r.defT = t; r.st = 'defend'; r.label = 'Defending ' + t.team;
  }
  function power(r) { const c = r.cap; return (c.scoreSpd + c.accuracy + c.intake + c.speed) / 4; }
  function defendStep(m, r) {
    const t = r.defT;
    if (!t || t.dead || t.st === 'done' || t.climbing) { r.st = 'idle'; r.defT = null; return; }
    const guard = m.R.guard(m, t.a, t), prot = m.R.protect ? m.R.protect(m, t) : '';
    // a season may give the defender a place to wait while its target is protected (2020: across the mouth of the Trench Run)
    const block = prot && !(r.backoff > m.t) && m.R.blockSpot ? m.R.blockSpot(m, r, t, prot) : null;
    let goal;
    if (block) { goal = block; r.label = 'Blocking the way out of the ' + prot; }
    else if (prot || r.backoff > m.t) {
      // pin count used up, or the target is in a protected zone: give it room (6 ft) and wait beside its path
      const gx = guard.x - t.x, gy = guard.y - t.y, gl = Math.hypot(gx, gy) || 1, nx = -gy / gl, ny = gx / gl;
      const side = (r.x - t.x) * nx + (r.y - t.y) * ny >= 0 ? 1 : -1, room = prot ? 1.9 : 2.0;
      goal = { x: t.x + nx * side * room + gx / gl * 0.5, y: t.y + ny * side * room + gy / gl * 0.5 };
      r.label = prot ? 'Waiting: ' + prot + ' is protected' : 'Backing off (pin count)';
    } else {
      // stay bumper to bumper between the target and where it wants to go (never drive "into" it)
      const dg = dist(t, guard);
      if (dg < 6) { const k = Math.max(2 * RR + 0.03, 0.2 * dg) / (dg || 1); goal = { x: t.x + (guard.x - t.x) * k, y: t.y + (guard.y - t.y) * k }; }
      else goal = guard;
      r.label = 'Defending ' + t.team;
    }
    goal = { x: U.clamp(goal.x, 0.5, FW - 0.5), y: U.clamp(goal.y, 0.5, FH - 0.5) };
    stepToward(r, avoid(m, r, goal)[0], speedOf(m, r) * DT * 0.95);
  }
  // Pinning (G202 2022–23, G420 2024: 5 s; G425 2025, G418 2026: 3 s): a defender holding a robot that is trying to
  // drive away must release it and back off 6 ft before the limit. Disciplined drive teams count; sloppy ones overstay.
  function pinCheck(m, d, t, dd, DF) {
    const PIN = DF.pin || 5;
    if (dd > 1.83) { d.sepT += DT; if (d.sepT > (DF.reset || 3)) d.pinT = 0; } else d.sepT = 0;
    const moved = Math.hypot(t.x - t.px, t.y - t.py);
    if (dd < 2 * RR + 0.12 && t.st === 'move' && moved < 0.4 * speedOf(m, t) * DT) {
      if (!d.pinT) d.pinLimit = PIN - 0.7 + 1.3 * U.clamp((40 - d.drv.comp) / 40, 0, 1) - 0.4 * d.confK + m.rng.range(-0.3, 0.35);
      d.pinT += DT;
    }
    if (d.pinT && d.pinT >= d.pinLimit) {
      if (d.pinT > PIN) foul(m, d, false, 'pinning');
      d.pins++; d.pinT = 0; d.pinLimit = null; d.backoff = m.t + (DF.reset || 3) + 0.8;
      log(m, d.a, d.team + ' releases the pin on ' + t.team, 'def');
    }
  }
  const NOGRIP = 0.2; // mecanum rollers have no sideways grip: a defender in contact cancels most of the drive's agility
  function defensePass(m) {
    for (const r of m.robots) { r.defBy = null; r.defSlow = 1; }
    const DF = m.R.defense || { eff: 1, foul: 1 }; // how much defense matters in this game
    const prot = r => (m.R.protect ? m.R.protect(m, r) : '');
    for (const d of m.robots) {
      if (d.st !== 'defend' || !d.defT || d.dead || (d.fault && d.fault.stall)) { d.pinT = 0; continue; }
      const t = d.defT, dd = dist(d, t);
      if (d.backoff > m.t) { if (dd > 1.83) d.sepT += DT; continue; }
      // zone effect: other opponents passing close to the defender get caught in traffic (turrets shrug most of it off)
      if (DF.zone) {
        for (const o of m.robots) {
          if (o === t || o.a === d.a || o.dead || o.climbing || dist(d, o) >= (DF.range || 1.4) * 1.3 || prot(o)) continue;
          const zs = U.clamp(1 - DF.zone * (o.cap.turret ? 0.5 : 1) * (0.5 + (d.cap.push - 0.6 * o.cap.agility * (o.cap.noGrip ? NOGRIP : 1)) / 200) * (1 - DEF_DRILL * o.defSkill) * awareK(o), 0.6, 0.97);
          if (zs < o.defSlow) { o.defSlow = zs; o.defBy = o.defBy || d; }
        }
      }
      const pz = prot(t);
      if (pz) {
        // contact with a robot in its protected zone is a foul, whoever starts it (a tech foul where the manual says so).
        // In the endgame the manuals award the climb instead (DF.credit: the level the robot is credited with).
        if (dd < 2 * RR + 0.03 && m.rng.next() < 0.15 * DT) {
          const cr = m.inEnd && DF.credit && DF.credit[pz];
          if (cr) { if (!t.endCredit) { t.endCredit = cr; log(m, d.a, d.team + ' touched ' + t.team + ' (' + pz + '): ' + t.team + ' is credited with the climb', 'foul'); } }
          else foul(m, d, !!DF.protMajor || !!(DF.major && DF.major[pz]), pz);
        }
        continue;
      }
      if (dd < (DF.range || 1.4) && !t.climbing) {
        t.defBy = d;
        const inner = 0.5 + (d.cap.push * (0.8 + 0.2 * d.drvF) - 0.6 * t.cap.agility * (t.cap.noGrip ? NOGRIP : 1) - 0.3 * t.cap.push) / 100;
        // turrets shoot on the move, so a defender slows them half as much (a season may say otherwise: DF.turretK)
        t.defSlow = U.clamp(1 - 0.4 * inner * DF.eff * (t.cap.turret ? (DF.turretK == null ? 0.5 : DF.turretK) : 1) * (1 - DEF_DRILL * t.defSkill) * awareK(t), 0.35, 0.97);
        pinCheck(m, d, t, dd, DF);
        t.defTime += DT; d.contacts += DT;
        const pf = 0.012 * DF.foul * PACE[d.plan.pace].foul * (1 - d.drv.comp / 220) * (d.plan.avoid ? 0.4 : 1) * (1 - 0.6 * d.confK);
        if (m.rng.next() < pf * DT) foul(m, d, m.rng.chance(0.2));
        if (m.rng.next() < 0.002 * DT) foul(m, t, false);
        const tall = t.cap.tall || 0;
        if (tall > 0 && m.rng.next() < 0.0015 * tall * ((m.R.faults && m.R.faults.tip) || 1) * PACE[t.plan.pace].wear * (1 - t.drv.comp / 300) * DT) triggerFault(m, t, 'tip');
      }
    }
  }
  function foul(m, r, major, why) {
    const pts = major ? m.S.foul.major : m.S.foul.minor;
    m.score[opp(r.a)].foul += pts; r.stats.fouls++;
    log(m, r.a, (major ? 'MAJOR FOUL' : 'Foul') + ' on ' + r.team + (why ? ' (' + why + ')' : '') + ' (+' + pts + ' ' + opp(r.a) + ')', 'foul');
    if (m.R.onFoul) m.R.onFoul(m, r, !!major, why);
  }

  // ---------- faults ----------
  // Comms losses have their own, more frequent hazard (below); the season profile (R.faults) scales brownouts, tips and comms.
  const DEF_DRILL = (G.Data && G.Data.DEF_DRILL_EFFECT) || 0.35;
  // Driver awareness: reads the field, so defenders cost less time and fewer fouls happen (50 is neutral, 85 about 14% better)
  const awareK = r => 1 - ((r.drv && r.drv.aware != null ? r.drv.aware : 50) - 50) / 250;
  const FAULTS = [{ id: 'brown', w: 30 }, { id: 'intakeJam', w: 18 }, { id: 'scorerJam', w: 18 }, { id: 'mech', w: 9 }];
  // 0 = clean, well-built electronics … about 1.5 = poor wiring, worn robot, hidden defects, tired battery
  const elecPoor = r => U.clamp((100 - r.cap.rel) / 60, 0, 1.3) + (100 - r.cond) / 200 + r.hidden * 0.3 + (r.batt < 0.8 ? 0.3 : 0);
  // in contact this tick: being defended, or pinned against the robot it is defending
  const inContact = r => !!r.defBy || (r.st === 'defend' && r.defT && dist(r, r.defT) < 1.5);
  function faultRoll(m, r) {
    const c = r.cap, P = PACE[r.plan.pace], FP = m.R.faults || {};
    const h = 0.0002 * (1 + (100 - c.rel) / 25) * (1 + (100 - r.cond) / 40) * (1 + r.hidden * 0.8) * m.diff * P.wear;
    if (m.rng.next() < h * DT) {
      const id = m.rng.wpick(FAULTS, f => f.w * (f.id === 'brown' ? FP.brown || 1 : 1)).id;
      if (id === 'brown' && r.elecK && m.rng.next() < r.elecK) return; // the shakedown already found this one
      triggerFault(m, r, id); return;
    }
    const hb = 0.00012 * P.brown * (r.batt < 0.8 ? 2 : 1) * (c.brown || 1) * (FP.brown || 1) * (1 - r.elecK);
    if (m.rng.next() < hb * DT) { triggerFault(m, r, 'brown'); return; }
    // brief comms dropouts are common: radio resets, loose connectors, hard hits. Poor electronics and contact make them more frequent and longer.
    if (!r.fault) {
      const hc = 0.0005 * (1 + 2.4 * elecPoor(r)) * (inContact(r) ? 3 : 1) * (FP.comms || 1) * m.diff * (1 - r.elecK);
      if (m.rng.next() < hc * DT) { triggerFault(m, r, 'comms'); return; }
    }
    // tall robots tip on their own now and then (high reach, fast turns), more in tip-heavy seasons
    const tall = (c.tall || 0) + (FP.tipAll || 0); // tipAll: risk every robot shares this season (e.g. 2023 Charge Station)
    if (tall > 0 && m.rng.next() < 0.00006 * tall * (FP.tip || 1) * P.wear * (1 - r.drv.comp / 300) * DT) { triggerFault(m, r, 'tip'); return; }
    if (m.rng.next() < 0.0006 * P.foul * (r.plan.avoid ? 0.5 : 1) * (1 - 0.6 * r.confK) * awareK(r) * DT) foul(m, r, false);
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
      case 'comms': {
        const poor = elecPoor(r), hit = inContact(r);
        if (rng.chance(0.015 + 0.08 * poor * poor + (hit ? 0.05 : 0))) { r.dead = true; r.st = 'dead'; msg = 'Lost comms — disabled'; }
        else { r.fault = { stall: true, until: m.t + rng.range(1.5, 3.5) * (1 + 0.8 * poor) * (hit ? 1.5 : 1), label: 'COMMS LOSS' }; msg = 'Comms dropout'; }
        break;
      }
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
          else {
            // a failed high climb can end in a fall from height: the robot is out and badly damaged
            const L = m.R.endgame.levels[lvl - 1];
            if (L.drop && m.rng.chance(L.drop * (1.15 - (r.cap.endgame || 40) / 200))) {
              r.end = { lvl: 0, failed: true, drop: true }; r.dead = true; r.climbing = false;
              r.label = 'FELL FROM ' + nm.toUpperCase(); r.stats.faults.push('Fell from ' + nm);
              log(m, r.a, r.team + ' FELL from ' + nm + '!', 'fault');
              if (!m.headless) m.fx.push({ k: 'pop', x: r.x, y: r.y, text: 'FALL!', t: m.t, a: r.a });
            } else { r.end = { lvl: 0, failed: true, park: true }; r.label = 'Climb failed'; r.stats.faults.push('Climb failed'); log(m, r.a, r.team + ' failed the climb', 'fault'); }
          }
          r.st = 'done';
        }, 'Climbing ' + nm);
      };
      if (!m.inEnd) waitUntil(r, () => m.inEnd, begin, 'Waiting for endgame');
      else begin();
    }, lvl ? 'To ' + nm : 'Parking');
  }
  function climbChance(m, r, lvl) {
    if (m.R.endgame.levels[lvl - 1].sure) return 1;
    return U.clamp(0.62 + 0.36 * (r.cap.endgame || 40) / 100 - 0.05 * (lvl - 1) + 0.06 * (r.drv.comp - 50) / 50 + 0.1 * r.confK
      - (m.playoff ? 0.03 : 0) - (100 - r.cond) / 400 - (r.hidden ? 0.05 : 0) - (m.R.endgame.levels[lvl - 1].risk || 0), 0.2, 0.985);
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
    // a robot touched in its protected endgame zone counts as having climbed (to the credited level)
    m.robots.forEach(r => { if (r.endCredit && !r.dead && !(r.end && r.end.lvl >= r.endCredit)) r.end = { lvl: r.endCredit, credited: true }; });
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
      end: r.end, dead: r.dead, pace: r.plan.pace, role: r.plan.role, autoOK: r.autoOK,
      bumps: r.stats.bumps || 0 // rough ground driven over (2020: the generator's steel bars): extra drivetrain wear
    }));
    m.result = res;
    log(m, null, 'FINAL — Red ' + res.red.score + ' : ' + res.blue.score + ' Blue', 'phase');
  }

  function log(m, a, msg, kind) {
    if (m.headless && kind !== 'fault') return;
    m.log.push({ t: m.t, a, msg, kind: kind || '' });
  }

  // ---------- helpers exposed to season rules ----------
  // a season may say that a defender in contact also slows what the robot is doing with its game pieces (DF.act: 0.4 = 40% longer)
  const jostle = (m, r) => (r.defBy && m.R.defense && m.R.defense.act ? 1 + m.R.defense.act * (r.cap.turret ? 0.6 : 1) : 1);
  // an end effector's Grip: how surely it takes, holds and lets go of a game piece (seasons with an End Effector only).
  // A poor one costs placements and a little time on every score; a developed one gives both back.
  const GRIP = E.GRIP = { h0: 0.9, h1: 0.15, t0: 1.06, t1: -0.13 };
  const gripK = (r, at0, per100) => (r.cap.grip == null ? 1 : at0 + per100 * r.cap.grip / 100);
  const H = E.H = {
    P: E.P, dist, opp, moveTo, act, waitUntil, speedOf, log, foul, avoid,
    canCollect: (m, r) => !r.cap.noIntake && !r.perm.intake && !(r.jam.intake > m.t),
    canScore: (m, r) => !r.cap.noScorer && !r.perm.scorer && !(r.jam.scorer > m.t),
    // fed: the piece comes straight from a human player even though the robot picks it off the floor (a gear, a cone, a
    // note or a coral dropped at the station), so their skill counts there too
    collectTime(m, r, kind, base, fed) {
      const i = r.cap.intake, P = PACE[r.plan.pace];
      // Loading from a human player: in the games where they feed the robot all match (season.hpLoad: 2017, 2019, 2020,
      // 2023, 2024, 2025) their skill decides the pace: an expert crew loads in about two thirds of the time an average
      // one needs, a beginner takes a fifth longer. Elsewhere they hardly touch the game pieces (5%).
      const hpW = m.S.hpLoad ? 0.45 : 0.05, hpF = 1 - hpW * (((m.hp && m.hp[r.a]) || 50) - 60) / 50;
      let t = kind === 'ground' ? base * (1.6 - 0.9 * i / 100) * (fed ? hpF : 1) : base * (1.4 - 0.55 * i / 100) * hpF;
      return t * P.cyc / (0.9 + 0.1 * r.opF) * (m.R.tempo ? m.R.tempo.c : 1) * (1 - 0.4 * r.confK) * jostle(m, r); // practiced crews handle game pieces faster
    },
    scoreTime(m, r, base, stat) {
      const s = stat == null ? r.cap.scoreSpd : stat;
      return base * (1.5 - 0.8 * s / 100) * (stat == null ? gripK(r, GRIP.t0, GRIP.t1) : 1) * PACE[r.plan.pace].cyc / r.opF * (m.R.tempo ? m.R.tempo.s : 1) * (1 - 0.4 * r.confK) * jostle(m, r);
    },
    endDue: (m, r) => m.phase !== 'auto' && !r.end && !r.endBusy && endgameDue(m, r),
    aimTime(m, r) {
      const c = r.cap;
      return (c.turret ? 0.3 : c.dumper ? 1.15 : 0.95) * (c.visionLvl >= 1 ? 0.6 : 1) * (1.2 - 0.4 * r.drv.mech / 100); // a dumper squares the whole robot up to the hub
    },
    hit(m, r, mult, distPen, stat) {
      const a = stat == null ? r.cap.accuracy : stat;
      let p = (0.2 + 0.77 * a / 100) * (0.9 + 0.1 * r.tune) * (mult || 1) * (stat == null ? gripK(r, GRIP.h0, GRIP.h1) : 1);
      p += PACE[r.plan.pace].acc - (distPen || 0);
      if (r.defBy) p -= 0.12 * ((m.R.defense && m.R.defense.eff) || 1) * (1 - r.drv.comp / 250) * (r.cap.dumper ? 1.6 : r.cap.turret ? 0.25 : 1) * (1 - DEF_DRILL * r.defSkill);
      p *= 0.95 + 0.05 * r.opF;
      p += 0.06 * r.confK;
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
    climbTime: (m, r, lvl) => climbTime(m, r, lvl), climbChance: (m, r, lvl) => climbChance(m, r, lvl),
    nearest(r, pts) { let best = null, bd = 1e9; for (const p of pts) { const d = dist(r, p); if (d < bd) { bd = d; best = p; } } return best; },
    travelEst(m, r, pt) { return dist(r, pt) / speedOf(m, r); },
    alliance: (m, a) => m.robots.filter(x => x.a === a)
  };
})();
