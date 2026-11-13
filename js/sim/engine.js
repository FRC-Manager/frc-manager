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
      level: o.level || 'reg', // the event: 'reg' (regional or district), 'dcmp' (District Championship), 'cmp' (Championship): some bonus thresholds rise
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
      r.autoOK = m.rng.chance(E.autoChance(r.cap.auto, r.tuneAuto)) && !r.autoFail;
      if (r.toolIn) { r.perm[r.toolIn] = true; const nm = r.toolIn === 'endgame' ? 'Climber' : r.toolIn === 'intake' ? 'Intake' : 'Scorer'; r.stats.faults.push(nm + ' blocked (tool left inside)'); log(m, r.a, r.team + ': ' + nm.toLowerCase() + ' blocked by a tool left inside the robot', 'fault'); }
    });
    return m;
  };

  function makeRobot(m, a, i, en) {
    const drv = en.drv || { drive: 50, comp: 50, aware: 50, mech: 50, hp: 50, strat: 50 };
    const conf = en.conf == null ? 0.5 : en.conf, tune = en.tune == null ? 0.5 : en.tune;
    return {
      team: en.team, a, slot: i, cap: en.cap, look: en.look || {}, drv, isPlayer: !!en.isPlayer,
      plan: Object.assign({ pace: 'bal', role: 'score', target: 'auto', endTiming: 'std', endLevel: 9, rpHunt: false, avoid: false, noCarry: false, defTarget: null }, en.plan || {}),
      tune, conf, tuneAuto: en.tuneAuto || 0, autoFail: !!en.autoFail,
      // pit and drive-team slips (your robot only): a loose bumper, a blocked mechanism, a joystick left unplugged
      disableAt: en.disableAt || 0, teleDelay: en.teleDelay || 0, toolIn: en.toolIn || null,
      defSkill: en.defSkill || 0, // drilled against a defender on a second robot: loses less to defense
      elecK: en.elecK || 0,       // electrical system shaken down on a second robot: fewer brownouts and comms dropouts
      // practiced drive teams (confidence) drive faster, line up quicker, handle pieces faster, foul less and climb more surely; 0.6 ≈ an average AI team
      drvF: 0.816 + 0.22 * drv.drive / 100 + 0.16 * (conf - 0.6), confK: conf - 0.6,
      opF: 0.86 + 0.14 * drv.mech / 100,
      cond: en.cond == null ? 100 : en.cond, batt: en.batt == null ? 1 : en.batt, hidden: en.hidden || 0,
      x: 0, y: 0, px: 0, py: 0, sx: 0, sy: 0, hd: 0, path: [], st: 'idle', timer: 0, onDone: null, onArrive: null, label: 'Ready', goal: null, gprog: null,
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
    // robots standing still (disabled, tipped, climbing, finished, or busy at a spot): routes steer round them. Not in
    // autonomous: auto routines are planned paths that partners agree on before the match.
    m.robs = m.phase === 'auto' ? [] : m.robots.filter(still).map(r => ({ x: r.x, y: r.y, r: 2 * RR, h: RR, bot: r }));
    rethink(m);
    defensePass(m);
    for (const r of m.robots) updateRobot(m, r);
    beachHit(m);
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
    if (r.fault && r.fault.stall) { r.label = r.fault.label; if (r.gprog) r.gprog.t += DT; return; } // a stalled robot is not stuck
    // a spell of defense (nothing else to do, or blocked everywhere) is over: back to its job
    if (r.st === 'defend' && r.mem.tmpDef && m.t >= r.mem.tmpDef && r.plan.role !== 'defend') { r.mem.tmpDef = 0; r.st = 'idle'; r.defT = null; }
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
    // a robot that has to point its whole chassis at a target while it works there (a 2026 dumper at its hub) turns to it
    if (r.faceAt) { if (r.st === 'act' || r.st === 'wait') turnTo(r, Math.atan2(r.faceAt.y - r.y, r.faceAt.x - r.x)); else if (r.st !== 'idle') r.faceAt = null; }
    // stuck in traffic or against a field element: sidestep around it; if it keeps failing near the goal, stop there
    if (r.st === 'move' && r.path.length) {
      const pg = r.prog || (r.prog = { t: m.t, x: r.x, y: r.y, n: 0, chk: m.t });
      const goal = r.path[r.path.length - 1];
      if (m.t - pg.t >= 1.0) {
        if (Math.hypot(r.x - pg.x, r.y - pg.y) < 0.25) {
          pg.n++;
          if (pg.n >= 3 && dist(r, goal) < 1.6) r.path = [];
          else r.path.unshift(sidestep(m, r, r.path[0], pg.n));
        } else pg.n = 0;
        pg.t = m.t; pg.x = r.x; pg.y = r.y;
      }
      // twice a second: the spot it is going to has been taken (a robot stopped on it), or a robot has stopped across
      // the way: pick a free spot beside it, or a route round it
      if (r.path.length && m.phase !== 'auto' && m.t - pg.chk >= 0.5) {
        pg.chk = m.t;
        if (!r.endBusy && r.goal && dist(r, r.goal) < 3.5 && spotUse(m, r, r.goal, true)) {
          const alt = freeNear(m, r, r.goal);
          if (alt) { r.goal = alt; r.path = planTo(m, r, alt); r.gprog = null; }
        } else if (r.path.length && blockedLeg(m, r, r.path[0])) r.path = planTo(m, r, r.path[r.path.length - 1]);
      }
      // no closer to where it is going for a long while (a robot parked on the spot, a wall of traffic, a waypoint it
      // can never reach): give that spot up and think again, instead of trying for the rest of the match
      if (r.path.length) {
        const gd = dist(r, goal), gp = r.gprog || (r.gprog = { best: gd, t: m.t, near: 0 });
        if (r.defBy) gp.t += DT * 0.5; // a defender in the way: it fights for the spot twice as long before trying another
        // within a bumper's width of the spot for a second and a half (a robot shoving it back each time): it is there
        gp.near = gd < 0.65 && m.phase !== 'auto' ? gp.near + DT : 0; // in autonomous the spot is the point (a line to cross)
        if (gp.near > 1.5) r.path = [];
        else if (gd < gp.best - 0.3) { gp.best = gd; gp.t = m.t; }
        else if (m.t - gp.t > GIVE_UP) {
          if (gd < (r.endBusy ? (r.endLvl === 0 ? 2.6 : 2.2) : 1.6)) r.path = []; // close enough (parking only needs the zone)
          else if (r.endBusy) { r.path.unshift(sidestep(m, r, r.path[0], 3)); gp.t = m.t; gp.best = gd; }
          else giveUp(m, r, goal);
        }
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
    if (role !== 'defend' && (r.mem.broken || r.mem.tmpDef > m.t)) role = 'defend';
    if (role === 'defend' && r.mem.noDef > m.t) role = r.mem.broken ? 'park' : 'score'; // nobody it may defend just now
    if (role === 'park') { if (r.st === 'idle') noDefense(m, r, 'nobody left to defend', true); return; }
    if (role === 'defend') { startDefend(m, r); if (r.st !== 'idle') return; role = 'score'; }
    m.R.decide(m, r, H, role);
    if (r.st === 'idle') {
      // the season's rules found nothing for it to do (everything full, nothing left to pick up): after a few seconds of
      // that it stops sitting in its partners' way and plays defense for a while. A jam that will clear is waited out.
      const jammed = Object.keys(r.jam).some(k => r.jam[k] > m.t);
      if (!r.mem.idleT) r.mem.idleT = m.t;
      if (!jammed && !E.noIdleDefense && m.phase !== 'auto' && m.t - r.mem.idleT >= 3) { r.mem.idleT = 0; tmpDefend(m, r, 10, 'Nothing to do: playing defense'); return; }
      r.st = 'wait'; r.timer = 0.4; if (!r.label) r.label = 'Waiting';
    } else r.mem.idleT = 0;
  }
  // Defense for a while (secs), then back to the robot's own job
  function tmpDefend(m, r, secs, label) {
    r.mem.tmpDef = m.t + secs; r.path = []; r.onArrive = null;
    startDefend(m, r);
    if (r.st === 'defend' && label) { r.label = label; log(m, r.a, r.team + ': ' + label.charAt(0).toLowerCase() + label.slice(1), 'ai'); }
  }
  // Once a second each alliance takes stock. A robot whose intake or scorer has broken for good (and has nothing left
  // to score) stops cycling and plays defense; and while one of its robots is out (broken or disabled), a partner that
  // was sent to defend goes back to scoring. A defense call the coach made during the match stands.
  function brokenWhy(m, r) {
    if (r.perm.scorer && !(m.R.canWork && m.R.canWork(m, r, 'scorer'))) return 'its scorer broke';
    if (r.perm.intake && !(r.held > 0) && !(r.fuel > 0) && !(m.R.canWork && m.R.canWork(m, r, 'intake'))) return 'its intake broke';
    return null;
  }
  function rethink(m) {
    if (m.phase === 'auto' || m.t - (m.thinkT || 0) < 1 - 1e-6) return;
    m.thinkT = m.t;
    for (const a of ['red', 'blue']) {
      const bots = m.robots.filter(r => r.a === a);
      bots.forEach(r => {
        if (r.dead || r.mem.broken || r.end) return;
        const why = brokenWhy(m, r); if (!why) return;
        r.mem.broken = why; r.mem.switched = 1;
        if (r.plan.role !== 'defend' && !r.endBusy) { r.replan = true; log(m, a, r.team + ': ' + why + ', so it plays defense now', 'ai'); }
      });
      if (!bots.some(r => r.dead || r.mem.broken)) continue;
      bots.forEach(r => {
        if (r.dead || r.mem.broken || r.plan.role !== 'defend' || r.mem.calledDef) return;
        r.plan.role = 'score'; r.plan.defTarget = null; r.replan = true; r.mem.switched = 1;
        log(m, a, r.team + ' stops defending and goes back to scoring: a partner is out of action', 'ai');
      });
    }
  }

  // ---------- movement ----------
  function moveTo(m, r, pt, then, label) {
    // the spot is taken (a robot stopped on it, a partner about to get there, or this robot gave up on it a moment ago):
    // use a free one beside it. Climbing spots are not moved.
    if (!r.endBusy && m.phase !== 'auto' && spotUse(m, r, pt)) { const alt = freeNear(m, r, pt); if (alt) pt = alt; }
    r.goal = pt; r.gprog = null; r.faceAt = null;
    r.path = planTo(m, r, pt);
    r.st = 'move'; r.onArrive = then || null; if (label) r.label = label;
    // alignment / acceleration overhead at the end of each leg
    // lining up on arrival: the chassis has to be squared up (agility) and the driver has to find the spot. A lift on a
    // turret (cap.turretLift) points itself, so the chassis part goes, and some of the fixed part with it (it need not stop square
    // either): a tank drive saves about half a second a leg, a holonomic drive, which lines up quickly anyway, a tenth.
    r.settleT = E.dist(r, pt) < 0.3 ? 0 : (0.3 + 0.8 * (1 - (r.cap.agility || 30) / 100) * (r.cap.turretLift ? -0.3 : 1) + 1.1 * (1 - r.drv.drive / 100) * (r.cap.turretLift ? 0.9 : 1)) * (m.R.settle || 1) * (1 - 0.6 * r.confK);
  }
  // Plans around field elements: the first element on the way gets a waypoint beside it, then both legs are checked
  // again (a couple of levels deep). Solid elements (o.h = physical radius) are inflated by half a robot.
  // Robots standing still are solid too (m.robs, refreshed every tick), except the one that is planning
  // A robot on its way to the endgame does not steer round robots already at the place it is going (the climbing spots
  // are shared by design: a partner on the charge station or the rung is where it is meant to be), only round the ones
  // elsewhere on the way and the disabled ones. A defender does not steer round the robot it is defending either:
  // getting in its way is the point.
  // an element only a climbing robot may pass (end: true): with an alliance set (o.a), only that alliance's climbers
  const skipE = (o, noEnd, who) => !!(o.end && noEnd && !(o.a && who && who.a && o.a !== who.a));
  const robsFor = (m, self) => (m.robs || []).filter(o => o.bot !== self && !(self && self.endBusy && !o.bot.dead && self.goal && Math.hypot(o.x - self.goal.x, o.y - self.goal.y) < 0.9) && !(self && self.st === 'defend' && o.bot === self.defT));
  const solids = (m, self) => { const l = robsFor(m, self); return l.length ? m.obs.concat(l) : m.obs; };
  // Push a point out of every solid element (and robot standing still) it is inside: a waypoint there can never be reached
  function clearOf(m, p, noEnd, low, self) {
    const q = { x: p.x, y: p.y }, list = solids(m, self);
    for (let it = 0; it < 4; it++) {
      let moved = false;
      for (const o of list) {
        if (!o.h || skipE(o, noEnd, self) || (o.under && low)) continue;
        const min = o.h + RR + 0.06, dx = q.x - o.x, dy = q.y - o.y, d = Math.hypot(dx, dy);
        if (d >= min - 1e-6) continue;
        if (d < 1e-4) q.x = o.x + min; else { q.x = o.x + dx / d * min; q.y = o.y + dy / d * min; }
        moved = true;
      }
      q.x = U.clamp(q.x, RR + 0.05, FW - RR - 0.05); q.y = U.clamp(q.y, RR + 0.05, FH - RR - 0.05);
      if (!moved) break;
    }
    return q;
  }
  E.clearOf = clearOf;
  // a straight run from a to b touches no solid element (nor a robot standing still)
  function clearRun(list, a, b, noEnd, low, who) {
    const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1e-6;
    for (const o of list) {
      if (skipE(o, noEnd, who) || (o.under && low)) continue;
      const rad = o.h ? Math.max(o.r, o.h + RR + 0.05) : o.r;
      const t = U.clamp(((o.x - a.x) * dx + (o.y - a.y) * dy) / L2, 0, 1);
      if (t > 0.03 && t < 0.97 && Math.hypot(o.x - a.x - dx * t, o.y - a.y - dy * t) < rad) return false;
    }
    return true;
  }
  // Pull the route tight: skip every waypoint the robot can already see past. Detours planned round several elements
  // one at a time could otherwise double back on themselves.
  function tighten(m, a, path, noEnd, low, self) {
    const list = solids(m, self), out = [];
    let cur = a, i = 0;
    while (i < path.length) {
      let j = path.length - 1;
      while (j > i && !clearRun(list, cur, path[j], noEnd, low, self)) j--;
      out.push(path[j]); cur = path[j]; i = j + 1;
    }
    return out;
  }
  function avoid(m, a, b, depth, noEnd, low, self) {
    if (!depth) { // the top call: plan, then pull the route tight
      const nE = noEnd == null ? !!a.endBusy : noEnd, lo = low == null ? !!(a.cap && a.cap.lowProfile) : low, sf = self === undefined ? (a.cap ? a : null) : self;
      const p = avoid(m, a, b, 1, nE, lo, sf);
      return p.length > 1 ? tighten(m, a, p, nE, lo, sf) : p;
    }
    if (self === undefined) self = a.cap ? a : null;
    if (low == null) low = !!(a.cap && a.cap.lowProfile); // elements marked "under" (a low tunnel) only stop robots that do not fit beneath them
    const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1e-6, list = solids(m, self);
    let hit = null;
    for (const o of list) {
      if (skipE(o, noEnd, self) || (o.under && low)) continue;
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
      for (const q of list) if (q !== o && q.h && !skipE(q, noEnd, self) && !(q.under && low)) bad += Math.max(0, q.h + RR - Math.hypot(c.x - q.x, c.y - q.y));
      return { c, bad };
    };
    const s1 = side(1), s2 = s1.bad > 0.15 ? side(-1) : null;
    // a waypoint must be somewhere a robot can stand: next to a row of elements (a Switch, a reef) it would otherwise land
    // inside the neighbour and be chased all match
    const w = clearOf(m, s2 && s2.bad < s1.bad ? s2.c : s1.c, noEnd, low, self);
    if (depth >= 3) return [w, b];
    return avoid(m, a, w, depth + 1, noEnd, low, self).concat(avoid(m, w, b, depth + 1, noEnd, low, self));
  }
  // a whole route: the season's own way across (2020 Trench Run, 2025 between two Cages, 2026 over a bump or through a
  // trench) when it has to make that crossing, otherwise a detour round the field elements. Replanning mid-route uses it
  // too: a plain detour from there would drive straight at the crossing it was making.
  const planTo = (m, r, pt) => (m.R.route && m.R.route(m, r, { x: r.x, y: r.y }, pt)) || avoid(m, r, pt);
  // Unstick: try headings from "slightly sideways" round to "straight back" and take the first one with room to drive
  function sidestep(m, r, goal, n) {
    const base = Math.atan2(goal.y - r.y, goal.x - r.x), k = 0.7 + 0.25 * Math.min(n, 4), sgn = (n + r.slot) % 2 ? 1 : -1;
    const room = p => {
      let c = Math.min(p.x - RR, FW - RR - p.x, p.y - RR, FH - RR - p.y) + 0.43;
      for (const o of m.robots) if (o !== r) c = Math.min(c, Math.hypot(o.x - p.x, o.y - p.y) - 2 * RR);
      for (const o of m.obs) if (o.h && !skipE(o, r.endBusy, r) && !(o.under && r.cap.lowProfile)) c = Math.min(c, Math.hypot(o.x - p.x, o.y - p.y) - o.h - RR);
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
  // ---------- traffic sense ----------
  const GIVE_UP = 5; // seconds without getting any closer before a robot gives a spot up
  // standing still: disabled, tipped, climbing, finished, busy at a spot, or stalled by a fault
  const still = r => r.dead || r.climbing || r.st === 'done' || r.st === 'act' || r.st === 'wait' || !!(r.fault && r.fault.stall);
  // Is spot p taken, for robot r? 2: for good (a disabled, tipped, climbing or finished robot is on it, or r gave up on
  // it a moment ago); 1: for now (a robot is working there, or a partner closer to it is on its way). 0: free.
  // `here`: only robots already on the spot count (the check made on the way there).
  function spotUse(m, r, p, here) {
    if (r.mem.blk && r.mem.blk.some(b => b.until > m.t && Math.hypot(b.x - p.x, b.y - p.y) < 0.6)) return 2;
    let use = 0;
    for (const o of m.robots) {
      if (o === r) continue;
      const d = Math.hypot(o.x - p.x, o.y - p.y);
      if (d < 0.8 && (o.dead || o.climbing || o.st === 'done')) return 2;
      if (d < 0.7 && still(o)) use = 1;
      else if (!here && o.a === r.a && o.st === 'move' && o.goal && Math.hypot(o.goal.x - p.x, o.goal.y - p.y) < 0.5 && d < dist(r, p)) use = 1;
    }
    return use;
  }
  // a free spot next to p (about a robot's width away), the closest to p and not far out of r's way; null if none
  function freeNear(m, r, p) {
    let best = null, bv = 1e9;
    for (const rad of [0.95, 1.35]) for (let k = 0; k < 10; k++) {
      const g = k * Math.PI / 5, c = { x: p.x + Math.cos(g) * rad, y: p.y + Math.sin(g) * rad };
      if (c.x < 0.5 || c.x > FW - 0.5 || c.y < 0.5 || c.y > FH - 0.5) continue;
      const q = clearOf(m, c, !!r.endBusy, !!r.cap.lowProfile, r);
      if (Math.hypot(q.x - c.x, q.y - c.y) > 0.05 || spotUse(m, r, q)) continue;
      const v = rad + 0.2 * dist(r, q);
      if (v < bv) { bv = v; best = q; }
    }
    return best;
  }
  // a robot has stopped across the next leg of the route
  function blockedLeg(m, r, p) {
    const dx = p.x - r.x, dy = p.y - r.y, L2 = dx * dx + dy * dy;
    if (L2 < 0.25) return false;
    for (const o of robsFor(m, r)) {
      const t = U.clamp(((o.x - r.x) * dx + (o.y - r.y) * dy) / L2, 0, 1);
      if (t > 0.05 && t < 0.95 && Math.hypot(o.x - (r.x + dx * t), o.y - (r.y + dy * t)) < 2 * RR) return true;
    }
    return false;
  }
  // Give up on a spot it cannot reach and think again; the spot stays off its list for a while. Blocked three times in
  // half a minute, it stops trying for a bit and plays defense instead.
  function giveUp(m, r, goal) {
    r.mem.blk = (r.mem.blk || []).filter(b => b.until > m.t).concat([{ x: goal.x, y: goal.y, until: m.t + 12 }]);
    r.stats.gaveUp = (r.stats.gaveUp || 0) + 1;
    r.path = []; r.onArrive = null; r.st = 'idle'; r.gprog = null; r.prog = null;
    r.label = 'Blocked: trying another way';
    log(m, r.a, r.team + ' could not get through: it tries something else', 'ai');
    const g = r.mem.gaveT = (r.mem.gaveT || []).filter(t => t > m.t - 30); g.push(m.t);
    if (g.length >= 3 && m.phase !== 'auto') { r.mem.gaveT = []; tmpDefend(m, r, 12, 'Blocked everywhere: playing defense'); }
  }
  // Two partners driving at each other: the one with less to do steps aside (to its right), the other keeps its line.
  // Carrying a game piece or heading for the endgame wins the road; otherwise the robot in the lower slot does.
  function yieldCheck(m, r) {
    if (r.endBusy || r.mem.yieldT > m.t || !r.path.length) return; // on its way to the endgame: it keeps its line
    const p = r.path[0], hx = p.x - r.x, hy = p.y - r.y, hl = Math.hypot(hx, hy);
    if (hl < 0.6) return;
    for (const o of m.robots) {
      if (o === r || o.a !== r.a || o.dead || o.st !== 'move' || !o.path.length) continue;
      const dx = o.x - r.x, dy = o.y - r.y, d = Math.hypot(dx, dy);
      if (d > 2.6 || d < 0.5 || (dx * hx + dy * hy) / (d * hl) < 0.75) continue; // not close ahead
      const q = o.path[0], ox = q.x - o.x, oy = q.y - o.y, ol = Math.hypot(ox, oy);
      if (ol < 0.3 || -(ox * dx + oy * dy) / (ol * d) < 0.6) continue;            // not coming this way
      const pri = x => (x.endBusy ? 4 : 0) + (x.held ? 2 : 0) - x.slot * 0.1;
      if (pri(r) > pri(o)) continue;
      const s = clearOf(m, { x: r.x + hy / hl * 1.0 + hx / hl * 0.35, y: r.y - hx / hl * 1.0 + hy / hl * 0.35 }, !!r.endBusy, !!r.cap.lowProfile, r);
      r.path.unshift(s); r.mem.yieldT = m.t + 2; o.mem.yieldT = m.t + 1;
      return;
    }
  }
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
    if (m.phase !== 'auto') yieldCheck(m, r);
    let step = speedOf(m, r) * DT;
    // keep a gap to a partner just ahead on the same way: ease off instead of running into its back
    if (r.path.length && m.phase !== 'auto' && !r.endBusy) {
      const hx = r.path[0].x - r.x, hy = r.path[0].y - r.y, hl = Math.hypot(hx, hy);
      if (hl > 0.2) for (const o of m.robots) {
        if (o === r || o.a !== r.a || o.dead || o.st !== 'move' || !o.path.length) continue; // robots standing still: the route goes round them
        const dx = o.x - r.x, dy = o.y - r.y, d = Math.hypot(dx, dy);
        if (d > 1.25 || d < 1e-3 || (dx * hx + dy * hy) / (d * hl) < 0.55) continue;
        const ox = o.path[0].x - o.x, oy = o.path[0].y - o.y, ol = Math.hypot(ox, oy);
        if (ol > 0.2 && (ox * hx + oy * hy) / (ol * hl) > 0.3) step *= U.clamp((d - 0.88) / 0.35, 0.3, 1); // it is going the same way
      }
    }
    while (step > 1e-6 && r.path.length) {
      const p = r.path[0], d = dist(r, p);
      if (d <= step) { r.x = p.x; r.y = p.y; step -= d; r.path.shift(); }
      else { r.x += (p.x - r.x) / d * step; r.y += (p.y - r.y) / d * step; step = 0; }
    }
    const dx = r.x - r.px, dy = r.y - r.py;
    if (dx * dx + dy * dy > 4e-4) turnTo(r, Math.atan2(dy, dx)); // 2 cm or more this tick: it is driving that way
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
    if (d > 0.25) turnTo(r, Math.atan2(goal.y - r.y, goal.x - r.x));
  }
  // Robots turn at a real robot's pace (about 330° a second) and only towards a heading they are actually driving: a
  // bump of a few centimetres from another robot no longer spins them round, which looked like shaking at high speed
  const TURN = 0.58;
  function turnTo(r, want) {
    let d = want - (r.hd || 0);
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    r.hd = (r.hd || 0) + U.clamp(d, -TURN, TURN);
  }
  // Robots are about 0.86 m across with bumpers: they push each other apart (a robot that cannot move — climbing,
  // disabled or parked — makes the other one give way completely) and cannot drive through solid field elements
  // (hubs, reef, stage legs, barge leg, towers and cages; a robot heading for its climb may touch its own tower/cage).
  const RR = E.RR = 0.43;
  // chance the autonomous routine runs as planned: the Autonomous stat, plus what auto tuning on practice day added (up to +20%)
  E.autoChance = (auto, tuneAuto) => U.clamp(0.5 + 0.46 * (auto || 0) / 100 + (tuneAuto || 0), 0.3, 0.985);
  // A beached robot (2020: on a Power Cell, 2026: on fuel) that another robot runs into: seven times in ten the knock
  // frees it at once, three times in ten it goes over. Once per beaching; a low centre of gravity is always freed.
  function beachHit(m) {
    for (const r of m.robots) {
      const f = r.fault;
      if (!f || !f.beached || f.hit || r.dead) continue;
      const o = m.robots.find(x => x !== r && !x.dead && x.st === 'move' && dist(x, r) < 2 * RR + 0.04);
      if (!o) continue;
      f.hit = true;
      if (r.cap.lowCG || m.rng.chance(0.7)) { f.until = m.t; r.stats.freed = (r.stats.freed || 0) + 1; log(m, r.a, o.team + ' ran into ' + r.team + ' and knocked it free', 'fault'); }
      else { log(m, r.a, o.team + ' ran into ' + r.team + ' while it was beached', 'fault'); triggerFault(m, r, 'tip'); r.stats.beachTip = 1; }
    }
  }
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
        let ka = fa ? (fb ? 0.5 : 1) : 0, kb = fb ? (fa ? 0.5 : 1) : 0;
        // a defender and the robot it is defending: the stronger pusher gives way less (a steady shove, not a jostle)
        if (fa && fb && ((a.st === 'defend' && a.defT === b) || (b.st === 'defend' && b.defT === a))) { const pa = 30 + (a.cap.push || 0), pb = 30 + (b.cap.push || 0); ka = pb / (pa + pb); kb = pa / (pa + pb); }
        const over = D2 - d, ux = dx / d, uy = dy / d;
        a.x -= ux * over * ka; a.y -= uy * over * ka; b.x += ux * over * kb; b.y += uy * over * kb;
      }
      for (const r of rs) {
        if (fixed(r)) continue;
        for (const o of m.obs) {
          if (!o.h || skipE(o, r.endBusy || r.end, r) || (o.under && r.cap.lowProfile)) continue;
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
  // One defender per opponent: two on one robot is rare in real matches and against the rules in some games (a pin
  // that lasts). A season may also cap how many robots of an alliance defend at once (defense.maxDef: 2025, where only
  // one robot may be on the opposing side; 2026, where two could wall off both bumps or both trenches).
  const defMates = (m, r) => m.robots.filter(x => x.a === r.a && x !== r && !x.dead && x.st === 'defend' && x.defT);
  function startDefend(m, r) {
    const DF = m.R.defense || {}, mates = defMates(m, r), taken = new Set(mates.map(x => x.defT)), named = r.plan.defTarget;
    let t = null;
    if (DF.maxDef && mates.length >= DF.maxDef) return noDefense(m, r, 'a partner is already defending');
    if (named) t = m.robots.find(x => x.team === named && x.a !== r.a && !x.dead) || null; // the coach's call stands (the partner on it moves)
    if (!t && m.R.defTarget) { t = m.R.defTarget(m, r); if (t && taken.has(t)) t = null; } // season-specific target (e.g. 2024: shut down the feeder)
    if (!t) {
      // defenders go after the best scorer they can actually slow down: turrets shoot on the move, so they are poor
      // targets, and a robot that is itself defending (or broken) scores nothing worth stopping
      const nr = r.mem.noReach && r.mem.noReach.until > m.t ? r.mem.noReach.team : null; // one it could not get to lately
      const all = m.robots.filter(x => x.a !== r.a && !x.dead && !taken.has(x) && x.team !== nr), busy = all.filter(x => x.st !== 'defend' && x.plan.role !== 'defend' && !x.mem.broken);
      const val = q => (q.stats.pts + power(q)) * (q.cap.turret ? 0.75 : 1);
      t = (busy.length ? busy : all).sort((p, q) => val(q) - val(p))[0] || null;
    }
    if (!t) return noDefense(m, r, 'every opponent already has a defender');
    r.defT = t; r.st = 'defend'; r.label = 'Defending ' + t.team;
  }
  // No one left to defend (every opponent taken, or the season's cap reached): back to scoring for a while if it can,
  // otherwise out of the way at its own end of the field
  function noDefense(m, r, why, keep) {
    r.defT = null; r.mem.tmpDef = 0; if (!keep) r.mem.noDef = m.t + 6; // keep: already waiting (the wait is not renewed)
    if (!r.mem.broken && !(r.perm.scorer || r.cap.noScorer)) { r.st = 'idle'; r.label = 'Scoring: ' + why; return; }
    const hide = E.P(m, r.a, 3.0, r.slot % 2 ? 0.6 : FH - 0.6);
    if (dist(r, hide) > 0.5) moveTo(m, r, hide, null, 'Out of the way: ' + why);
    else { r.st = 'wait'; r.timer = 3; r.label = 'Out of the way'; }
  }
  function power(r) { const c = r.cap; return (c.scoreSpd + c.accuracy + c.intake + c.speed) / 4; }
  function defendStep(m, r) {
    const t = r.defT;
    if (!t || t.dead || t.st === 'done' || t.climbing) { r.st = 'idle'; r.defT = null; return; }
    // its target has stopped scoring (it defends now, or broke): pick another, unless the coach named this one
    if ((t.st === 'defend' || t.mem.broken) && !(r.plan.defTarget && t.team === r.plan.defTarget) && m.robots.some(x => x.a === t.a && x !== t && !x.dead && x.st !== 'defend' && !x.mem.broken)) { r.st = 'idle'; r.defT = null; return; }
    // a partner on the same robot, or more defenders than the game allows: the one with the weaker claim moves on (a
    // coach's call first, then a robot sent to defend, then one that broke, then the lower slot)
    { const DF = m.R.defense || {}, prio = x => (x.mem.calledDef ? 8 : 0) + (x.plan.role === 'defend' ? 4 : 0) + (x.mem.broken ? 2 : 0) - x.slot * 0.1;
      const mates = defMates(m, r), over = (DF.maxDef && mates.length >= DF.maxDef) ? mates : mates.filter(x => x.defT === t);
      if (over.some(x => prio(x) > prio(r))) { if (over.some(x => x.defT === t)) { r.st = 'idle'; r.defT = null; r.mem.noDef = DF.maxDef && mates.length >= DF.maxDef ? m.t + 6 : 0; } else noDefense(m, r, 'a partner is already defending'); return; } }
    const guard = m.R.guard(m, t.a, t), prot = m.R.protect ? m.R.protect(m, t) : '';
    // a season may give the defender a place to wait while its target is protected (2020: across the mouth of the Trench Run)
    const block = prot && !(r.backoff > m.t) && m.R.blockSpot ? m.R.blockSpot(m, r, t, prot) : null;
    // or keep it in the middle of the target's cycle, meeting it there instead of chasing it into a zone (2025)
    const hold = !block && m.R.defSpot ? m.R.defSpot(m, r, t, prot) : null;
    let goal;
    if (block) { goal = block; r.label = 'Blocking the way out of the ' + prot; }
    else if (hold) { goal = hold; r.label = 'Blocking ' + t.team + '\'s lane'; }
    else if (prot || r.backoff > m.t) {
      // pin count used up, or the target is in a protected zone: give it room (6 ft) and wait beside its path
      const gx = guard.x - t.x, gy = guard.y - t.y, gl = Math.hypot(gx, gy) || 1, nx = -gy / gl, ny = gx / gl;
      // keep to the side it is on: deciding afresh every tick made a defender on the line flick from side to side
      const cr = (r.x - t.x) * nx + (r.y - t.y) * ny;
      if (!r.mem.dSide || Math.abs(cr) > 0.35) r.mem.dSide = cr >= 0 ? 1 : -1;
      const side = r.mem.dSide, room = prot ? 1.9 : 2.0;
      goal = { x: t.x + nx * side * room + gx / gl * 0.5, y: t.y + ny * side * room + gy / gl * 0.5 };
      r.label = prot ? 'Waiting: ' + prot + ' is protected' : 'Backing off (pin count)';
    } else {
      // stay bumper to bumper between the target and where it wants to go (never drive "into" it)
      const dg = dist(t, guard);
      if (dg < 6) { const k = Math.max(2 * RR + 0.03, 0.2 * dg) / (dg || 1); goal = { x: t.x + (guard.x - t.x) * k, y: t.y + (guard.y - t.y) * k }; }
      else goal = guard;
      r.label = 'Defending ' + t.team;
    }
    // somewhere a robot can stand: between a robot scoring at the Hub and where it heads next can be inside the Hub
    goal = clearOf(m, { x: U.clamp(goal.x, 0.5, FW - 0.5), y: U.clamp(goal.y, 0.5, FH - 0.5) }, false, !!r.cap.lowProfile, r);
    // in place (within a hand's width of where it wants to be): hold there instead of creeping a few centimetres into
    // the robot it is defending every tick, which made both of them shake
    const dt = dist(r, t);
    // Where it drives: the season's crossing if it has to make one (2025: between two Cages), straight there when no field
    // element is in the way, otherwise round it, by a detour planned on the field elements alone. The way is kept for half
    // a second (planned afresh every tick, a robot passing nearby made it zig-zag).
    let aim = goal;
    const rb = m.robs, rt = m.R.route ? m.R.route(m, r, { x: r.x, y: r.y }, goal) : null; // (a lane a robot is stopped in is skipped)
    const detour = !!rt || !clearRun(m.obs, r, goal, false, !!r.cap.lowProfile);
    // going round field elements for 3 s and no closer, hardly moving (it finds no way round them): it leaves that robot
    // alone for a while instead of shoving at the element. Robots in the way do not count (pushing past is defense), nor do
    // the seconds it stood stalled (a comms loss, a brownout).
    { const gd = dist(r, goal); let dp = r.mem.dProg;
      if (!dp || dp.tgt !== t || m.t - dp.last > 0.3) dp = r.mem.dProg = { tgt: t, best: gd, t: m.t, x: r.x, y: r.y };
      dp.last = m.t;
      if (!detour || gd < 0.6 || dt < 2 * RR + 0.15 || gd < dp.best - 0.3 || Math.hypot(r.x - dp.x, r.y - dp.y) > 0.8) { dp.best = gd; dp.t = m.t; dp.x = r.x; dp.y = r.y; }
      else if (m.t - dp.t > 3) { r.mem.dProg = null; r.mem.noReach = { team: t.team, until: m.t + 15 }; return noDefense(m, r, 'no way through to ' + t.team); } }
    if (detour) {
      const dc = r.mem.dRoute;
      if (dc && dc.until > m.t && dist(dc.goal, goal) < 0.6 && dist(r, dc.wp) > 0.2) aim = dc.wp;
      else {
        m.robs = []; const way = rt || avoid(m, r, goal); m.robs = rb;
        aim = way.find(p => dist(r, p) > 0.25) || way[way.length - 1]; // past the waypoints it is already standing on
        // the new way doubles straight back on the one planned a moment ago (both sides of an element look as good from
        // here): it waits where it is for up to a second rather than flick between them
        const dx = aim.x - r.x, dy = aim.y - r.y, dl = Math.hypot(dx, dy);
        if (dc && dc.dl && m.t - dc.at < 1 && dl > 0.05 && (dx * dc.dx + dy * dc.dy) / (dl * dc.dl) < -0.5) { aim = { x: r.x, y: r.y }; r.mem.dRoute = Object.assign(dc, { wp: aim, goal, until: m.t + 0.1 }); }
        else r.mem.dRoute = { wp: aim, goal, until: m.t + 0.5, at: m.t, dx, dy, dl };
      }
    }
    // it eases in (never more than 60% of the way in one tick) and holds once in place: no overshoot, no shaking
    const ad = dist(r, aim);
    if (ad > 0.08) stepToward(r, aim, Math.min(speedOf(m, r) * DT * 0.95, ad === dist(r, goal) ? 0.6 * ad : ad));
    // close to its target it faces it; otherwise it faces where it goes
    if (dt < 2.2) turnTo(r, Math.atan2(t.y - r.y, t.x - r.x));
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
          // a season may have its own penalty for this contact (an RP for the opponents, points for the robot touched)
          if (m.R.onProtect && m.R.onProtect(m, d, t, pz, H)) continue;
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
        if (m.rng.next() < pf * DT) foul(m, d, m.rng.chance(DF.majorK == null ? 0.2 : DF.majorK)); // now and then the contact is a major one (a season may say how often)
        if (m.rng.next() < 0.002 * DT) foul(m, t, false);
        const tall = t.cap.lowCG ? 0 : t.cap.tall || 0; // a low centre of gravity (pivoting telescope) cannot be pushed over
        if (tall > 0 && m.rng.next() < 0.0015 * tall * ((m.R.faults && m.R.faults.tip) || 1) * PACE[t.plan.pace].wear * tipDrv(m, t) * DT) triggerFault(m, t, 'tip');
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
  // what the driver does to the risk of tipping: composure, a little (the default), or in the seasons that say so
  // (faults.tipDrv: 2018 and 2019, tall lifts driven hard) driving skill, a lot: an expert tips 40% less than a novice
  const tipDrv = (m, r) => (m.R.faults && m.R.faults.tipDrv ? 1.35 - 0.7 * ((r.drv.drive == null ? 50 : r.drv.drive) / 100) : 1 - r.drv.comp / 300);
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
      const hc = 0.0005 * (1 + 2.4 * elecPoor(r)) * (inContact(r) ? 3 : 1) * (FP.comms || 1) * m.diff * (1 - r.elecK) * (1 - (1 - G.Data.VISION_HW.swDrop) * (c.netSw || 0)); // a network switch: fewer dropouts
      if (m.rng.next() < hc * DT) { triggerFault(m, r, 'comms'); return; }
    }
    // tall robots tip on their own now and then (high reach, fast turns), more in tip-heavy seasons
    const tall = c.lowCG ? 0 : (c.tall || 0) + (FP.tipAll || 0); // tipAll: risk every robot shares this season (e.g. 2023 Charge Station); a low centre of gravity never tips
    if (tall > 0 && m.rng.next() < 0.00006 * tall * (FP.tip || 1) * P.wear * tipDrv(m, r) * DT) { triggerFault(m, r, 'tip'); return; }
    if (m.rng.next() < 0.0006 * P.foul * (r.plan.avoid ? 0.5 : 1) * (1 - 0.6 * r.confK) * awareK(r) * DT) foul(m, r, false);
  }
  function triggerFault(m, r, id) {
    const rng = m.rng; let msg = '';
    // an intake that folds or slides out of the way when it is hit (cap.robustIntake) shrugs off most jams and breakages
    if (r.cap.robustIntake && id === 'intakeJam' && rng.chance(0.7)) return;
    switch (id) {
      case 'brown': r.fault = { stall: true, until: m.t + rng.range(2, 5), label: 'BROWNOUT' }; msg = 'Brownout'; break;
      case 'intakeJam': r.jam.intake = m.t + rng.range(5, 20); msg = 'Intake jammed'; break;
      case 'scorerJam': r.jam.scorer = m.t + rng.range(5, 18); msg = 'Scorer jammed'; break;
      case 'mech': {
        const k = rng.pick(['intake', 'scorer', 'endgame']);
        if (k === 'intake' && r.cap.robustIntake && rng.chance(0.7)) return;
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
    return base * (1.6 - (r.cap.endgame || 40) / 100) * (r.cap.lowCG ? 0.95 : 1) * (r.cap.climbK || 1); // a low centre of gravity hangs straight: a little quicker and surer
  }
  // How carefully a robot is driven, for the accidents a driver can prevent (a fall from a high climb, a partner dropped
  // from a buddy climb, 2020: beaching on a Power Cell): 1 for an average driver at a balanced pace, about 0.7 for an
  // expert, 1.2 for a novice; ×1.6 when pushing, ×0.6 when conserving.
  const careK = E.careK = r => PACE[r.plan.pace].wear * (1.35 - 0.7 * ((r.drv && r.drv.drive != null ? r.drv.drive : 50) / 100));
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
            if (L.drop && m.rng.chance(U.clamp(L.drop * (1.15 - (r.cap.endgame || 40) / 200) * careK(r) * (r.cap.dropK || 1), 0, 0.9))) {
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
      - (m.playoff ? 0.03 : 0) - (100 - r.cond) / 400 - (r.hidden ? 0.05 : 0) - (m.R.endgame.levels[lvl - 1].risk || 0) + (r.cap.lowCG ? 0.03 : 0) + (r.cap.climbAdd || 0), 0.2, 0.985);
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
      case 'role': r.plan.role = v.role; r.plan.defTarget = v.target || null; r.replan = true; r.mem.calledDef = v.role === 'defend'; r.mem.tmpDef = 0; break;
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
      end: r.end, dead: r.dead, pace: r.plan.pace, role: r.plan.role, autoOK: r.autoOK, freed: r.stats.freed || 0, beachTip: r.stats.beachTip || 0,
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
    face: (r, pt) => { r.faceAt = pt; }, // keep the chassis pointed at pt while the robot works where it stands
    // traffic sense for the season rules: is a spot taken (0 free, 1 for now, 2 for good), a free spot beside one,
    // and a spell of defense when there is nothing useful to do
    spotUse: (m, r, p) => spotUse(m, r, p), freeNear, tmpDefend, clearOf,
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
      return t * P.cyc / (0.9 + 0.1 * r.opF) * (m.R.tempo ? m.R.tempo.c : 1) * (1 - 0.4 * r.confK) * (r.cap.robustIntake ? 1 + (jostle(m, r) - 1) * 0.5 : jostle(m, r)); // practiced crews handle game pieces faster
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
    climbTime: (m, r, lvl) => climbTime(m, r, lvl), climbChance: (m, r, lvl) => climbChance(m, r, lvl), careK,
    // A buddy climber lifts a partner (2018 forks, 2019 ramps, 2020 a hook under the bar). A robot that will not be
    // carried (plan.noCarry) is never the partner. When the lift fails, the partner may come down hard from part way up:
    // how often is up to the lifter's drive team (careful and skilled: rarely; pushing: often). The partner is not out
    // of the match (it is over), but the fall is on its record and the pit crew pays for it.
    riders: list => list.filter(r => !r.plan.noCarry),
    buddyLift(m, lifter, rider, p) {
      if (m.rng.chance(p)) return true;
      if (m.rng.chance(U.clamp(0.55 * careK(lifter), 0.1, 0.9))) {
        rider.stats.faults.push('Dropped by a partner');
        log(m, rider.a, lifter.team + ' dropped ' + rider.team + ' during the buddy climb', 'fault');
        if (!m.headless) m.fx.push({ k: 'pop', x: rider.x, y: rider.y, text: 'DROPPED!', t: m.t, a: rider.a });
      }
      return false;
    },
    // A triple climber (2019) lifts both partners at once or neither: with one partner on board it would not balance.
    // When the lift fails, each partner may be dropped, as in a buddy climb, and the lifter itself may come off the
    // platform with them (a fall from HAB 3).
    tripleLift(m, lifter, riders, p) {
      if (m.rng.chance(p)) return true;
      riders.forEach(rd => {
        if (m.rng.chance(U.clamp(0.55 * careK(lifter), 0.1, 0.9))) { rd.stats.faults.push('Dropped by a partner'); log(m, rd.a, lifter.team + ' dropped ' + rd.team + ' during the triple climb', 'fault'); }
      });
      if (m.rng.chance(U.clamp(0.25 * careK(lifter), 0.05, 0.6))) {
        lifter.end = { lvl: 0, failed: true, drop: true }; lifter.stats.faults.push('Fell from HAB 3');
        log(m, lifter.a, lifter.team + ' FELL from HAB 3 with both partners on board!', 'fault');
        if (!m.headless) m.fx.push({ k: 'pop', x: lifter.x, y: lifter.y, text: 'FALL!', t: m.t, a: lifter.a });
      } else log(m, lifter.a, lifter.team + ' could not lift both partners', 'fault');
      return false;
    },
    nearest(r, pts) { let best = null, bd = 1e9; for (const p of pts) { const d = dist(r, p); if (d < bd) { bd = d; best = p; } } return best; },
    travelEst(m, r, pt) { return dist(r, pt) / speedOf(m, r); },
    alliance: (m, a) => m.robots.filter(x => x.a === a)
  };
})();
