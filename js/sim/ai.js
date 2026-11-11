'use strict';
/* FRC Manager — robot capability builder (shared by player & AI) and the AI team pool */
(function () {
  const U = G.U, D = G.Data;

  // ------------------------------------------------------------------
  // Capability builder: subsystems -> flat match capability object
  // subs: { subId: { concept, ver, stats:{}, rel, w } }
  // ------------------------------------------------------------------
  const STAT_KEY = { amp: 'ampSkill', algae: 'algaeSkill' };
  G.Cap = {};
  G.Cap.build = function (year, subs, extra) {
    extra = extra || {};
    const cap = {
      speed: 0, agility: 0, push: 0, intake: 0, scoreSpd: 0, accuracy: 0, range: 0, endgame: 0, auto: 20, vision: 0,
      balance: 20, ampSkill: 0, algaeSkill: 0, traverse: 40, feed: 40, endLevel: 0, storage: 1,
      autoTier: extra.autoTier || 0, visionLvl: extra.visionLvl || 0
    };
    const rels = []; let weight = 0; let built = 0;
    G.Seasons[year].subs.forEach(sd => {
      const s = subs[sd.id];
      if (!s || !s.ver) {
        if (sd.id === 'intake') cap.noIntake = true;
        if (sd.id === 'scorer') cap.noScorerMain = true;
        return;
      }
      const c = G.Seasons.concept(year, sd.id, s.concept);
      if (!c) return;
      built++;
      Object.keys(s.stats || {}).forEach(k => { cap[STAT_KEY[k] || k] = s.stats[k]; });
      Object.assign(cap, c.caps || {});
      if (sd.id !== 'soft') rels.push(s.rel == null ? 70 : s.rel);
      weight += s.w == null ? c.w : s.w;
    });
    // Games with an End Effector (the gripper at the end of the lift). Without one the robot cannot hold a game piece.
    // With one and no separate intake, the end effector collects the pieces itself: how well follows from how developed
    // it is (the concept's `self` range), and where it can pick up from is the concept's own.
    const effSd = G.Seasons.sub(year, 'effector');
    if (effSd) {
      const eu = subs.effector, ec = eu && eu.ver ? effSd.concepts.find(x => x.id === eu.concept) : null;
      if (!ec) { cap.noEffector = true; cap.noScorerMain = true; cap.noIntake = true; delete cap.grip; }
      else if (cap.noIntake && ec.self) {
        const lo = ec.base.grip, hi = ec.ceil.grip, t = U.clamp(((eu.stats && eu.stats.grip != null ? eu.stats.grip : lo) - lo) / Math.max(1, hi - lo), 0, 1.15);
        cap.intake = Math.round(ec.self.lo + (ec.self.hi - ec.self.lo) * t);
        cap.ground = !!ec.self.ground; cap.station = ec.self.station !== false;
        if (ec.self.groundCone != null) cap.groundCone = ec.self.groundCone;
        cap.noIntake = false; cap.selfLoad = true;
      }
    }
    if (cap.rmax) cap.rangeM = cap.rmin + (cap.rmax - cap.rmin) * (cap.range || 0) / 100;
    if (!subs.drive || !subs.drive.ver) { cap.speed = 15; cap.agility = 15; cap.push = 20; cap.noDrive = true; }
    // no scorer at all?
    const hasAlt = (subs.amp && subs.amp.ver) || (subs.algae && subs.algae.ver);
    cap.noScorer = !!cap.noScorerMain && !hasAlt;
    const avg = rels.length ? U.avg(rels) : 60, mn = rels.length ? Math.min(...rels) : 60;
    // the player's parts: sensors help reliability, worn parts fail more, mixed control systems cost a little everywhere
    const pp = extra.pp;
    cap.rel = U.clamp(0.6 * avg + 0.4 * mn + (pp ? 3 * pp.enc - 10 * (1 - pp.health) - (pp.mixed ? 3 : pp.kopMix ? 2 : 0) : 0), 5, 99);
    cap.brown = pp ? (1.25 - 0.5 * pp.motor) * (1 + 0.6 * (1 - pp.health)) : 1.25;
    if (pp) { const k = (0.97 + 0.03 * pp.health) * (pp.mixed ? 0.98 : pp.kopMix ? 0.99 : 1); cap.speed = Math.round(cap.speed * k); cap.scoreSpd = Math.round(cap.scoreSpd * k); }
    cap.weight = Math.round(weight);
    if (cap.endLevel && !cap.endgame) cap.endgame = 40;
    return cap;
  };
  G.Cap.look = function (year, subs, extra) {
    const lk = { drive: 'tank', ver: 1, year };
    let maxVer = 0;
    G.Seasons[year].subs.forEach(sd => {
      const s = subs[sd.id];
      if (!s || !s.ver) return;
      const c = G.Seasons.concept(year, sd.id, s.concept);
      if (c && c.look) Object.assign(lk, c.look);
      if (sd.id !== 'soft') maxVer = Math.max(maxVer, s.ver);
    });
    if (lk.eff && (lk.intake == null || lk.intake === 'none')) lk.intake = lk.eff; // no separate intake: the end effector is what shows at the front
    lk.ver = maxVer; lk.vision = (extra && extra.visionLvl) || 0;
    return lk;
  };
  // Expected-points "power" of a capability (used for scouting estimates and AI picks)
  G.Cap.power = function (year, cap) {
    if (cap.noDrive) return 0;
    const sc = cap.noScorer ? 0.15 : (0.35 + 0.65 * (cap.scoreSpd * 0.5 + cap.accuracy * 0.5) / 100);
    const cyc = (0.4 + 0.6 * (cap.speed * 0.6 + cap.intake * 0.4) / 100);
    const end = [0, 0.4, 0.7, 1.0, 1.3][cap.endLevel || 0] * (0.5 + 0.5 * (cap.endgame || 0) / 100);
    return Math.round(100 * (sc * cyc * 0.75 + end * 0.18 + (cap.autoTier || 0) * 0.03) * (0.7 + 0.3 * cap.rel / 100));
  };

  // ------------------------------------------------------------------
  // AI team pool
  // ------------------------------------------------------------------
  const AI = G.AI = {};
  AI.makePool = function (rng, n, playerNum, startYear) {
    const pool = {};
    const used = new Set([playerNum]);
    for (let i = 0; i < n; i++) {
      let num; do { num = rng.int(1, 10999); } while (used.has(num));
      used.add(num);
      const str = Math.round(U.clamp(rng.norm(48, 18) + (num < 2000 ? 6 : 0), 6, 96));
      pool[num] = {
        num, name: D.teamName(rng), region: rng.pick(D.REGIONS), str, traj: rng.pick([-1, 0, 0, 1]),
        impact: AI.impactRoll(rng, str), rookie: false, rb: null
      };
    }
    return pool;
  };
  // Impact strength of an established team: loosely tied to robot strength, plus a few outreach powerhouses.
  AI.impactRoll = (rng, str) => Math.round(U.clamp(rng.norm(str * 0.45 + 20, 14) + (rng.chance(0.1) ? 24 : 0), 5, 98));
  AI.addRookies = function (pool, rng, year, count, playerNum) {
    for (let i = 0; i < count; i++) {
      let num; do { num = rng.int(11000, 11999); } while (pool[num] || num === playerNum);
      pool[num] = { num, name: D.teamName(rng), region: rng.pick(D.REGIONS), str: Math.round(U.clamp(rng.norm(26, 10), 5, 60)), traj: 1,
        impact: Math.round(U.clamp(rng.norm(30, 12), 5, 80)), rookie: year, rb: null };
    }
  };
  AI.evolve = function (pool, rng) {
    Object.values(pool).forEach(t => {
      t.str = Math.round(U.clamp(t.str + t.traj * rng.range(1, 5) + rng.norm(0, 4), 5, 97));
      if (rng.chance(0.2)) t.traj = rng.pick([-1, 0, 1]);
      t.impact = Math.round(U.clamp(t.impact + rng.norm(0, 5), 5, 98));
      t.rb = null;
    });
  };

  function pickArchetype(rng, S, str) {
    const elig = S.archetypes.filter(a => !a.defense && !a.feed && str >= a.min).sort((p, q) => q.min - p.min);
    const spec = S.archetypes.filter(a => (a.defense || a.feed) && str >= a.min);
    if (spec.length && rng.chance(0.08)) return rng.pick(spec);
    const x = rng.next();
    if (x < 0.5 || elig.length === 1) return elig[0];
    if (x < 0.82 && elig[1]) return elig[1];
    return rng.pick(elig);
  }
  // Generate this season's robot design for an AI team (stored on the team)
  AI.seasonRobot = function (team, year, rng) {
    const S = G.Seasons[year], arch = pickArchetype(rng, S, team.str);
    const q = U.clamp(Math.pow(team.str / 100, 1.3) + rng.norm(0, 0.07), 0.03, 0.97);
    const choice = {};
    S.subs.forEach(sd => {
      let p = arch.pick[sd.id];
      if (sd.id === 'soft') p = 'code';
      if (Array.isArray(p)) p = rng.pick(p);
      if (!p) p = sd.concepts[0].id;
      choice[sd.id] = p;
    });
    // the calendar year decides how many of the teams that could run swerve do: a few machined their own before modules
    // were sold (2020), most strong teams run it from 2022
    const era = G.Era.of(G.S), dopt = arch.pick.drive, canSw = Array.isArray(dopt) ? dopt.includes('swerve') : dopt === 'swerve';
    if (era.aiSwerve != null && canSw) choice.drive = rng.chance(era.aiSwerve) ? 'swerve' : ((Array.isArray(dopt) && dopt.find(x => x !== 'swerve')) || 'wcd');
    if (choice.drive === 'swerve' && team.str < 45 && rng.chance(0.6)) choice.drive = 'wcd';
    const jit = {};
    S.subs.forEach(sd => { jit[sd.id] = rng.range(-0.08, 0.08); });
    team.rb = {
      year, arch: arch.name, role: arch.defense ? 'defend' : arch.feed ? 'feed' : 'score', choice, q, jit,
      autoTier: U.clamp(Math.floor(q * 4 + rng.norm(0, 0.6)), 0, 3), visionLvl: era.vision.cam ? Math.min(era.vision.max, q > 0.72 ? 2 : q > 0.45 ? 1 : 0) : (q > 0.8 ? 1 : 0),
      drv: Math.round(U.clamp(30 + 60 * q + rng.norm(0, 8), 15, 97)), comp: Math.round(U.clamp(35 + 50 * q + rng.norm(0, 10), 15, 97))
    };
    return team.rb;
  };
  // Event-time capability for an AI team; weekMult models in-season improvement
  AI.entry = function (team, year, weekMult, diffMult, rng) {
    if (!team.rb || team.rb.year !== year) AI.seasonRobot(team, year, rng);
    const rb = team.rb, S = G.Seasons[year];
    const qe = U.clamp(rb.q * weekMult * diffMult, 0.03, 0.99);
    const era = G.Era.of(G.S); // the motors of the day set how fast everybody is; team-built swerve is fragile
    const subs = {};
    S.subs.forEach(sd => {
      const cid = rb.choice[sd.id];
      const c = sd.concepts.find(x => x.id === cid);
      if (!c) return;
      if (c.id === 'none') { subs[sd.id] = { concept: 'none', ver: 0, stats: {} }; return; }
      const qq = U.clamp(qe + rb.jit[sd.id], 0.02, 0.99);
      const stats = {};
      Object.keys(c.ceil).forEach(k => { stats[k] = Math.round(c.base[k] + (c.ceil[k] - c.base[k]) * qq); });
      if (era.aiMotor) { if (sd.id === 'drive' && stats.speed != null) stats.speed = Math.max(5, Math.round(stats.speed + 9 * era.aiMotor)); if (stats.scoreSpd != null) stats.scoreSpd = Math.max(5, Math.round(stats.scoreSpd + 7 * era.aiMotor)); }
      const tbRel = sd.id === 'drive' && cid === 'swerve' && !era.swerve.cots ? era.swerve.rel : 0;
      subs[sd.id] = { concept: cid, ver: 1 + Math.floor(qq * 3), stats, rel: Math.round(U.clamp(52 + 42 * qq - c.cx * 2 + rng.norm(0, 4) + tbRel, 30, 97)), w: c.w };
    });
    const extra = { autoTier: rb.autoTier, visionLvl: rb.visionLvl, parts: { motors: qe > 0.6 ? 2 : qe > 0.35 ? 1 : 0, sensors: qe > 0.5 ? 1 : 0 } };
    const cap = G.Cap.build(year, subs, extra);
    const look = G.Cap.look(year, subs, extra);
    const d = rb.drv, cp = rb.comp;
    return {
      team: team.num, cap, look, isPlayer: false,
      drv: { drive: d, comp: cp, aware: d, mech: Math.round((d + cp) / 2), hp: Math.round(U.clamp(30 + 55 * qe, 20, 95)), strat: d },
      plan: { role: rb.role }, tune: U.clamp(0.4 + qe * 0.5, 0, 1), conf: U.clamp(0.4 + qe * 0.5, 0, 1), cond: 100, batt: 1, hidden: 0,
      arch: rb.arch, power: G.Cap.power(year, cap)
    };
  };

  // Choose AI teams attending an event
  AI.pickAttendees = function (pool, rng, count, region, star, exclude, champs) {
    const target = champs ? 78 : 28 + star * 9;
    const list = Object.values(pool).filter(t => !exclude.has(t.num));
    const chosen = [];
    const cand = list.map(t => {
      let w = champs ? 1 : (t.region === region ? 3 : (D.ADJ[region] || []).includes(t.region) ? 1.4 : 0.35);
      const z = (t.str - target) / (champs ? 14 : 24);
      w *= Math.exp(-z * z) + (champs ? 0.02 : 0.15);
      return { t, w };
    });
    for (let i = 0; i < count && cand.length; i++) {
      const pick = rng.wpick(cand, c => c.w);
      chosen.push(pick.t.num);
      cand.splice(cand.indexOf(pick), 1);
    }
    return chosen;
  };
})();
