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
    const rels = [], live = extra.live || null; let weight = 0; let built = 0;
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
      // (3.5.3) the player's robot: what each unit's parts add, live (G.Robot.partsLive)
      const add = live && live.stat[sd.id];
      Object.keys(s.stats || {}).forEach(k => { cap[STAT_KEY[k] || k] = add && add[k] ? Math.min(99, Math.round(s.stats[k] + add[k])) : s.stats[k]; });
      Object.assign(cap, c.caps || {});
      if (sd.id !== 'soft') rels.push((s.rel == null ? 70 : s.rel) + (live && live.rel[sd.id] || 0));
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
    // (3.5.3) with live parts (the player's robot) each unit's own wear and gearboxes are already in its reliability
    cap.rel = U.clamp(0.6 * avg + 0.4 * mn + (pp ? 3 * pp.enc - (live ? 0 : 10 * (1 - pp.health)) - (pp.mixed ? 3 : pp.kopMix ? 2 : 0) : 0), 5, 99);
    cap.brown = pp ? (1.25 - 0.5 * pp.motor) * (1 + 0.6 * (1 - pp.health)) : 1.25;
    if (pp) { const k = (0.97 + 0.03 * pp.health) * (pp.mixed ? 0.98 : pp.kopMix ? 0.99 : 1); cap.speed = Math.round(cap.speed * k); cap.scoreSpd = Math.round(cap.scoreSpd * k); }
    // optional hardware (calendar careers): planetary gearboxes keep mechanisms running; the vision hardware of the day
    if (pp) {
      const VH = G.Data.VISION_HW, vl = cap.visionLvl || 0;
      if (pp.pgear && !live) cap.rel = U.clamp(cap.rel + 4 * pp.pgear, 5, 99);
      if (vl && pp.cam != null) { cap.accuracy += Math.round(VH.camAcc * (pp.cam - 0.6) * vl); cap.vision += Math.round(VH.camVision * (pp.cam - 0.6)); }
      if (pp.nsw) { cap.netSw = pp.nsw; if (vl) { cap.vision += VH.swVision; cap.accuracy += VH.swAcc; } }
      if (pp.accel && vl) { cap.vision += VH.accVision; cap.intake += VH.accIntake; cap.auto += VH.accAuto; }
      // more motors and encoders than the CAN bus carries (from 2023, without a CAN FD hub): it overloads now and then
      if (pp.can && pp.can.over > 0) { cap.canOver = Math.min(1.5, pp.can.over); cap.rel = U.clamp(cap.rel - Math.round(8 * Math.min(1, pp.can.over)), 5, 99); }
    }
    cap.weight = Math.round(weight);
    if (cap.endLevel && !cap.endgame) cap.endgame = 40;
    return cap;
  };
  G.Cap.look = function (year, subs, extra) {
    const lk = { drive: 'tank', ver: 1, year, sub: {} }; // (3.5.5) sub: the concept built in each subsystem, for the drawings
    let maxVer = 0;
    G.Seasons[year].subs.forEach(sd => {
      const s = subs[sd.id];
      if (!s || !s.ver) return;
      const c = G.Seasons.concept(year, sd.id, s.concept);
      if (c && sd.id !== 'soft') lk.sub[sd.id] = c.id;
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
  // (3.5.5) A few teams powder-coat their robots, and most of the elite ones (and those that once were): [colour, accent],
  // or null for bare aluminium. It hangs on the team number alone, so a team keeps its colour from season to season
  const PAINT = ['#2f6fd0', '#c2412f', '#2e9e5b', '#e08a1e', '#8a4fc0', '#17a0a0', '#c9a80c', '#d1478c', '#1f4fa3', '#8a1f2b', '#3a3f47', '#e9edf1', '#0f8f6a', '#ff6a13'], ACCENT = ['#ffcf4a', '#e9edf1', '#15181c', '#ff7a1a', '#4cc9f0'];
  AI.paintOf = function (num, elite) {
    const h = (Math.imul((Number(num) || 0) + 7919, 2654435761) >>> 0);
    return (h % 1000) / 1000 < (elite ? 0.85 : 0.14) ? [PAINT[(h >>> 10) % PAINT.length], ACCENT[(h >>> 16) % ACCENT.length]] : null;
  };
  AI.makePool = function (rng, n, playerNum, startYear) {
    const pool = {};
    const used = new Set([playerNum]), top = D.numTop(startYear); // numbers follow the year (D.NUM_FROM)
    for (let i = 0; i < n; i++) {
      let num; do { num = rng.int(1, top); } while (used.has(num));
      used.add(num);
      const str = Math.round(U.clamp(rng.norm(48, 18) + (num < top * D.OLD_NUM ? 6 : 0), 6, 96));
      pool[num] = {
        num, name: D.teamName(rng), region: rng.pick(D.REGIONS), str, traj: rng.pick([-1, 0, 0, 1]),
        impact: AI.impactRoll(rng, str), rookie: false, rb: null
      };
    }
    return pool;
  };
  // Impact strength of an established team: loosely tied to robot strength, plus a few outreach powerhouses.
  AI.impactRoll = (rng, str) => Math.round(U.clamp(rng.norm(str * 0.45 + 20, 14) + (rng.chance(0.1) ? 24 : 0), 5, 98));
  // cy: the calendar year, for the season's block of numbers (none: old careers keep 11000 to 11999)
  AI.addRookies = function (pool, rng, year, count, playerNum, cy) {
    for (let i = 0; i < count; i++) {
      const b = cy && D.NUM_FROM[cy] && D.NUM_FROM[cy + 1] ? D.numBlock(cy) : [11000, 11999];
      let num; do { num = rng.int(b[0], b[1]); } while (pool[num] || num === playerNum);
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

  function pickArchetype(rng, S, str, elite) {
    const elig = S.archetypes.filter(a => !a.defense && !a.feed && str >= a.min).sort((p, q) => q.min - p.min);
    if (elite) return elig[0]; // an elite team builds the best robot the game allows
    const spec = S.archetypes.filter(a => (a.defense || a.feed) && str >= a.min);
    if (spec.length && rng.chance(0.08)) return rng.pick(spec);
    const x = rng.next();
    if (x < 0.5 || elig.length === 1) return elig[0];
    if (x < 0.82 && elig[1]) return elig[1];
    return rng.pick(elig);
  }
  // Generate this season's robot design for an AI team (stored on the team)
  AI.seasonRobot = function (team, year, rng) {
    const S = G.Seasons[year], E = G.World && G.World.eliteCfg ? G.World.eliteCfg(G.S) : D.ELITE, el = !!team.elite, arch = pickArchetype(rng, S, team.str, el);
    let q = el ? rng.range(E.q[0], E.q[1]) : U.clamp(Math.pow(team.str / 100, 1.3) + rng.norm(0, 0.07), 0.03, 0.97);
    // published designs (calendar careers): the weakest teams that could not build a scoring robot of their own build the
    // Anybot (from 2018), so fewer robots cannot play the game; some of the lower middle build the Apex Blueprint (from
    // 2022) and come out better. A copy builds the design's concepts and is tagged (rb.ref) for the season recaps and news.
    let ref = null;
    { const cyN = G.S && G.S.cal ? G.Era.cy(G.S) : 0, has = id => { const r = D.REFBOTS.find(x => x.id === id); return r && cyN >= r.from && r.picks[year] ? r : null; };
      if (el) {} // elite teams design their own
      else if (has('any') && team.str < 36 && q < D.REF_AI.anyFloor) { q = D.REF_AI.anyFloor; ref = has('any'); }
      else if (has('bp') && team.str >= 36 && team.str < 62 && rng.chance(D.REF_AI.bpShare)) { q = Math.min(0.97, q + D.REF_AI.bpBoost); ref = has('bp'); } }
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
    if (era.aiSwerve != null && canSw) choice.drive = rng.chance(el ? Math.min(1, era.aiSwerve * 2.5 + 0.05) : era.aiSwerve) ? 'swerve' : ((Array.isArray(dopt) && dopt.find(x => x !== 'swerve')) || 'wcd'); // elite teams machined their own earlier than most
    if (el && canSw && era.aiSwerve == null) choice.drive = 'swerve';
    if (choice.drive === 'swerve' && team.str < 45 && rng.chance(0.6)) choice.drive = 'wcd';
    if (ref) Object.keys(ref.picks[year]).forEach(k => { if (S.subs.some(sd => sd.id === k && sd.concepts.some(c => c.id === ref.picks[year][k]))) choice[k] = ref.picks[year][k]; });
    const jit = {};
    S.subs.forEach(sd => { jit[sd.id] = rng.range(-0.08, 0.08); });
    team.rb = {
      year, arch: arch.name, ref: ref ? ref.id : null, role: arch.defense ? 'defend' : arch.feed ? 'feed' : 'score', choice, q, jit,
      autoTier: el ? 3 : U.clamp(Math.floor(q * 4 + rng.norm(0, 0.6)), 0, 3), visionLvl: era.vision.cam ? Math.min(era.vision.max, q > 0.72 ? 2 : q > 0.45 ? 1 : 0) : (q > 0.8 ? 1 : 0),
      drv: el ? rng.int(E.drv[0], E.drv[1]) : Math.round(U.clamp(30 + 60 * q + rng.norm(0, 8), 15, 97)), comp: el ? rng.int(E.drv[0], E.drv[1]) : Math.round(U.clamp(35 + 50 * q + rng.norm(0, 10), 15, 97)),
      elite: el, ebonus: el ? E.bonus : 0,
      // (3.1.5) an elite team's human player (its own range) and the reliability its robots run at, by difficulty
      hp: el && E.hp ? rng.int(E.hp[0], E.hp[1]) : null, erel: el && E.rel != null ? E.rel : null
    };
    if (el) S.subs.forEach(sd => { jit[sd.id] = rng.range(-0.02, 0.02); }); // no weak spot
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
      if (rb.elite) Object.keys(stats).forEach(k => { stats[k] = Math.min(99, stats[k] + (rb.ebonus == null ? D.ELITE.bonus : rb.ebonus)); }); // years of know-how: past the plain concept's ceiling, like a maxed-out team
      if (era.aiMotor) { if (sd.id === 'drive' && stats.speed != null) stats.speed = Math.max(5, Math.round(stats.speed + 9 * era.aiMotor)); if (stats.scoreSpd != null) stats.scoreSpd = Math.max(5, Math.round(stats.scoreSpd + 7 * era.aiMotor)); }
      const tbRel = sd.id === 'drive' && cid === 'swerve' && !era.swerve.cots ? era.swerve.rel : 0;
      // reliability: an elite team's from its level (3.1.5: extremely high on Normal and Hard; a little less on complex
      // mechanisms, and a team-built swerve is still fragile), everyone else's from its quality
      const rel = rb.elite && rb.erel != null ? U.clamp(rb.erel - 0.5 * c.cx + rng.norm(0, 1) + tbRel, 85, 99) : U.clamp(52 + 42 * qq - c.cx * 2 + rng.norm(0, 4) + tbRel + (rb.elite ? 5 : 0), 30, 97);
      subs[sd.id] = { concept: cid, ver: rb.elite ? 6 + Math.floor(qq * 3) : 1 + Math.floor(qq * 3), stats, rel: Math.round(rel), w: c.w };
    });
    const extra = { autoTier: rb.autoTier, visionLvl: rb.visionLvl, parts: { motors: qe > 0.6 ? 2 : qe > 0.35 ? 1 : 0, sensors: qe > 0.5 ? 1 : 0 } };
    const elite = !!rb.elite;
    const cap = G.Cap.build(year, subs, extra);
    const look = G.Cap.look(year, subs, extra);
    { const pc = AI.paintOf(team.num, !!(team.elite || team.wasElite)); if (pc) { look.c1 = pc[0]; look.c2 = pc[1]; } } // (3.5.5) painted robots
    const d = rb.drv, cp = rb.comp;
    return {
      team: team.num, cap, look, isPlayer: false,
      drv: { drive: d, comp: cp, aware: d, mech: Math.round((d + cp) / 2), hp: elite ? (rb.hp || Math.max(90, d - 3)) : Math.round(U.clamp(30 + 55 * qe, 20, 95)), strat: elite ? Math.min(99, d + 2) : d },
      plan: { role: rb.role }, tune: elite ? 0.95 : U.clamp(0.4 + qe * 0.5, 0, 1), conf: elite ? 0.95 : U.clamp(0.4 + qe * 0.5, 0, 1), cond: 100, batt: 1, hidden: 0, elite,
      arch: rb.arch, power: G.Cap.power(year, cap)
    };
  };

  // Choose AI teams attending an event
  // (3.5) local: { zone, zoneOf } for an event that stays at home (an offseason event, the Week 0 scrimmage). Its field
  // is the home area's own teams (its district or cities first). Only where those are too few to fill it do others
  // make up the numbers, the nearest first: the areas next door, the rest of its part of the world, the nearest other
  // part of the world (D.NEAR, in its order), everybody else.
  // (3.5.2) local.city, local.hubOf: before all of that, by miles from the event's city (D.tripTier): first the teams
  // of that city and around it (a local trip), then those within a drive (the nearer the likelier), then as above.
  AI.pickAttendees = function (pool, rng, count, region, star, exclude, champs, local) {
    const target = champs ? 78 : 28 + star * 9;
    const list = Object.values(pool).filter(t => !exclude.has(t.num));
    const chosen = [];
    const grp = r => (D.GROUP && D.GROUP[r]) || 'NA', adj = D.ADJ[region] || [], near = (D.NEAR || {})[region] || [];
    const areaTier = t => (t.region === region ? 0 : adj.includes(t.region) ? 1 : grp(t.region) === grp(region) ? 2 : near.includes(t.region) ? 3 + near.indexOf(t.region) : 3 + near.length);
    const by = local && local.city && local.hubOf && D.tripTier ? {} : null; // hub: [0 a local trip, 1 a drive, -1 farther; miles]
    const trip = t => { const hb = local.hubOf(t); if (!by[hb]) { const tr = D.tripTier(local.city, hb); by[hb] = [tr === 'local' ? 0 : tr === 'drive' ? 1 : -1, D.tripMiles(local.city, hb) || 0]; } return by[hb]; };
    const tierOf = t => { if (by) { const k = trip(t)[0]; if (k >= 0) return k; } return (by ? 2 : 0) + areaTier(t); };
    const localW = t => (t.region === region && local.zoneOf(t) === local.zone ? 3 : 1) * (by && trip(t)[0] === 1 ? 1 / (1 + Math.pow(trip(t)[1] / 200, 2)) : 1);
    const cand = list.map(t => {
      let w = champs ? 1 : local ? localW(t) : (t.region === region ? 3 : adj.includes(t.region) ? 1.4 : 0.35);
      const z = (t.str - target) / (champs ? 14 : 24);
      w *= Math.exp(-z * z) + (champs ? 0.02 : 0.15);
      return { t, w, tier: local && !champs ? tierOf(t) : 0 };
    });
    [...new Set(cand.map(c => c.tier))].sort((a, b) => a - b).forEach(k => {
      const c = cand.filter(x => x.tier === k);
      while (chosen.length < count && c.length) {
        const pick = rng.wpick(c, x => x.w);
        chosen.push(pick.t.num);
        c.splice(c.indexOf(pick), 1);
      }
    });
    return chosen;
  };
})();
