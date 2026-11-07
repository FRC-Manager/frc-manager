'use strict';
/* FRC Manager — player robot, development projects, tech knowledge, wear & repairs */
(function () {
  const U = G.U, D = G.Data;
  const Robot = G.Robot = {};
  const EFFORT = { rush: { name: 'Rush', h: 0.6, gain: 0.75, cost: 0.9, rel: -3 }, std: { name: 'Standard', h: 1, gain: 1, cost: 1, rel: 0 }, thorough: { name: 'Thorough', h: 1.4, gain: 1.2, cost: 1.15, rel: 2 } };
  Robot.EFFORT = EFFORT;
  Robot.WEIGHT_LIMIT = 125;

  // ---------------- Knowledge ----------------
  Robot.know = (S, area) => D.knowLevel(S.know[area] || 0);
  Robot.addXP = function (S, area, xp) {
    if (!area) return 0;
    let mult = 1 + (G.Career.hasPerk(S, 'xpBonus') ? 0.1 : 0);
    if (S.mentors.some(m => m.spec === area)) mult *= 1.5;
    const before = Robot.know(S, area);
    S.know[area] = Math.round((S.know[area] || 0) + xp * mult);
    S.usedAreas[area] = true;
    const after = Robot.know(S, area);
    if (after > before) G.Career.inbox(S, 'Knowledge level up: ' + D.AREA[area].name, 'Your team reached Level ' + after + ' in ' + D.AREA[area].name + '. Concepts that use it get higher ceilings, fewer build hours and better reliability.', 'know');
    return xp * mult;
  };
  const mainArea = c => (c.areas && c.areas[0]) || null;
  const statArea = (subId, c, stat) => subId === 'soft' && D.STAT_AREA[stat] ? D.STAT_AREA[stat] : mainArea(c);

  // ---------------- Robot lifecycle ----------------
  Robot.newSeason = function (S, year) {
    const subs = {};
    G.Seasons[year].subs.forEach(sd => { subs[sd.id] = { concept: null, ver: 0, stats: {}, rel: 0, cond: 100, w: 0, hidden: 0, hours: 0 }; });
    const soft = G.Seasons.concept(year, 'soft', 'code');
    const st = {};
    Object.keys(soft.base).forEach(k => st[k] = soft.base[k] + 3 * Robot.know(S, statArea('soft', soft, k)));
    subs.soft = { concept: 'code', ver: 1, stats: st, rel: 90, cond: 100, w: 0, hidden: 0, hours: 0 };
    S.robot = { year, subs, autoTier: 0, visionLvl: 0, practiceBot: false, pending: [], emergency: 0 };
    S.projects = S.projects.filter(p => p.type === 'research' || p.type === 'kb');
  };
  Robot.ceil = function (S, year, subId, c, stat) {
    let v = (c.ceil[stat] || 0) + 3 * Robot.know(S, statArea(subId, c, stat));
    const P = S.parts;
    if (subId === 'drive' && stat === 'speed') v += [0, 4, 8][P.motors || 0] + (c.id === 'swerve' && P.swerve === 2 ? 3 : 0);
    if (stat === 'scoreSpd') v += [0, 3, 6][P.motors || 0];
    if (stat === 'auto') v += P.sensors ? 5 : 0;
    return Math.min(99, v);
  };
  Robot.firstTime = (S, c) => c.cx >= 3 && mainArea(c) && Robot.know(S, mainArea(c)) === 0;
  Robot.reqOk = function (S, c) {
    if (c.req && c.req.part === 'swerve' && !(S.parts.swerve > 0)) return 'Needs swerve modules (Parts store)';
    return null;
  };
  Robot.weight = function (S) {
    if (!S.robot) return 0;
    return Math.round(Object.keys(S.robot.subs).reduce((s, k) => s + (S.robot.subs[k].ver ? S.robot.subs[k].w : 0), 0));
  };
  Robot.cap = function (S) {
    const R = S.robot;
    return G.Cap.build(R.year, R.subs, { autoTier: R.autoTier, visionLvl: R.visionLvl, parts: S.parts });
  };
  Robot.look = function (S) {
    const R = S.robot;
    const lk = G.Cap.look(R.year, R.subs, { visionLvl: R.visionLvl });
    lk.c1 = S.team.c1; lk.c2 = S.team.c2;
    return lk;
  };
  Robot.condAvg = function (S) {
    const subs = Object.keys(S.robot.subs).filter(k => k !== 'soft' && S.robot.subs[k].ver);
    return subs.length ? U.avg(subs.map(k => S.robot.subs[k].cond)) : 100;
  };
  Robot.hidden = S => Object.values(S.robot.subs).reduce((s, x) => s + (x.ver ? x.hidden : 0), 0);

  // ---------------- Projects ----------------
  function hwMult(S, subId) {
    let m = G.Shop.hwHoursMult(S);
    m *= 1 - 0.12 * G.Career.mentorSkill(S, 'fab') / 100;
    if (G.Career.hasPerk(S, 'fabSpeed')) m *= 0.9;
    if (S.parts.pneu && (subId === 'intake' || subId === 'scorer')) m *= 0.85;
    return m;
  }
  function swMult(S) {
    let m = G.Shop.swHoursMult(S);
    m *= 1 - 0.2 * G.Career.mentorSkill(S, 'prog') / 100;
    if (G.Career.hasPerk(S, 'progSpeed')) m *= 0.85;
    return m;
  }
  // Returns {hours, cost, name, err}
  Robot.quote = function (S, spec) {
    const year = S.robot ? S.robot.year : S.year;
    const ef = EFFORT[spec.effort || 'std'];
    let hours = 0, cost = 0, name = '', err = null;
    const sub = spec.sub && S.robot ? S.robot.subs[spec.sub] : null;
    const sd = spec.sub ? G.Seasons.sub(year, spec.sub) : null;
    if (['upgrade', 'harden', 'light'].includes(spec.type) && (!sub || !sub.ver)) return { hours: 0, cost: 0, name: '', err: 'Build this subsystem first' };
    if (spec.type !== 'research' && spec.type !== 'kb' && !S.robot) return { hours: 0, cost: 0, name: '', err: 'No robot this season yet' };
    switch (spec.type) {
      case 'build': {
        const c = G.Seasons.concept(year, spec.sub, spec.concept);
        err = Robot.reqOk(S, c);
        hours = c.hours * ef.h * (1 - 0.06 * Robot.know(S, mainArea(c))) * (Robot.firstTime(S, c) ? 1.2 : 1) * hwMult(S, spec.sub);
        cost = (c.cost + 250 * c.cx) * ef.cost;
        name = (sub && sub.ver ? 'Switch to ' : 'Build ') + c.name;
        break;
      }
      case 'upgrade': {
        const c = G.Seasons.concept(year, spec.sub, sub.concept);
        const soft = spec.sub === 'soft';
        hours = (soft ? 60 : 40 + 20 * c.cx) * ef.h * (1 - 0.06 * Robot.know(S, statArea(spec.sub, c, spec.focus))) * (soft ? swMult(S) : hwMult(S, spec.sub));
        cost = (soft ? 120 : 250 + 200 * c.cx) * ef.cost;
        name = sd.name + ' upgrade (' + (D.STAT[spec.focus] || spec.focus) + ')';
        break;
      }
      case 'harden': { const c = G.Seasons.concept(year, spec.sub, sub.concept); hours = (40 + 10 * c.cx) * hwMult(S, spec.sub); cost = 100 + 50 * c.cx; name = sd.name + ' hardening'; break; }
      case 'light': { hours = 40 * hwMult(S, spec.sub); cost = 150; name = sd.name + ' lightweighting'; break; }
      case 'auto': {
        const t = S.robot.autoTier;
        if (t >= 3) err = 'Best auto already';
        hours = (60 + 40 * (t + 1)) * swMult(S); cost = 100;
        name = 'Auto routine: ' + (G.Seasons[year].autoTiers[Math.min(3, t + 1)]);
        break;
      }
      case 'vision': {
        const l = S.robot.visionLvl;
        if (l >= 2) err = 'Vision maxed';
        else if ((S.parts.vision || 0) < l + 1) err = 'Needs ' + (l === 0 ? 'a camera' : 'dual camera + coprocessor') + ' (Parts store)';
        hours = 120 * (l + 1) * swMult(S); cost = 200;
        name = 'Vision Level ' + (l + 1) + (l === 0 ? ' (auto-aim)' : ' (shoot on the move)');
        break;
      }
      case 'practiceBot': {
        if (S.robot.practiceBot) err = 'Already built';
        const spent = Object.keys(S.robot.subs).reduce((s, k) => { const x = S.robot.subs[k]; if (!x.ver) return s; const c = G.Seasons.concept(year, k, x.concept); return s + (c ? c.cost : 0); }, 0);
        hours = 250 * hwMult(S); cost = 500 + 0.4 * spent; name = 'Practice robot';
        break;
      }
      case 'kb': { if (S.equip.kb) err = 'Already built'; hours = 60; cost = 0; name = 'Knowledge Base (wiki + CAD library)'; break; }
      case 'impact': { if (S.season && S.season.impactDone) err = 'Already submitted this season'; hours = 40; cost = 100; name = 'Impact Award submission'; break; }
      case 'research': {
        const r = D.RESEARCH.find(x => x.id === spec.rid);
        hours = r.hours * (1 - 0.04 * Robot.know(S, r.area)); cost = r.cost; name = r.name;
        break;
      }
    }
    if (spec.sub && S.projects.some(p => p.sub === spec.sub)) err = err || 'A project on this subsystem is already running';
    if (['auto', 'vision', 'practiceBot', 'impact'].includes(spec.type) && S.projects.some(p => p.type === spec.type)) err = err || 'Already in progress';
    if (spec.type === 'research' && S.projects.some(p => p.rid === spec.rid)) err = err || 'Already in progress';
    if (G.Career.hasPerk(S, 'partsDiscount') && spec.type !== 'research') cost *= 0.92;
    return { hours: Math.max(10, Math.round(hours)), cost: Math.round(cost), name, err };
  };
  Robot.slots = S => Math.min(6, 2 + S.mentors.filter(m => m.role === 'design' || m.role === 'fab').length + (G.Career.hasPerk(S, 'tempMentor') ? 1 : 0));
  Robot.startProject = function (S, spec) {
    const q = Robot.quote(S, spec);
    if (q.err) return q.err;
    if (S.projects.length >= Robot.slots(S)) return 'All project slots are busy (' + Robot.slots(S) + '). Hire Design/Fabrication mentors for more.';
    if (S.money < q.cost) return 'Not enough money (' + U.money(q.cost) + ')';
    G.Career.spend(S, q.cost, q.name);
    S.projects.push(Object.assign({ id: U.uid('p'), name: q.name, need: q.hours, done: 0, prio: spec.prio || 'normal', cost: q.cost, started: G.Career.dateLabel(S) }, spec));
    return null;
  };
  Robot.cancelProject = function (S, id) {
    const p = S.projects.find(x => x.id === id);
    if (!p) return;
    S.projects = S.projects.filter(x => x !== p);
    const refund = Math.round(p.cost * 0.4 * (1 - p.done / p.need));
    if (refund > 0) G.Career.earn(S, refund, 'Refund: ' + p.name);
  };
  // Distribute weekly hours; returns list of completed project names
  // Development category of a project (used by shop incidents)
  Robot.cat = p => (p.type === 'research' || p.type === 'kb' || p.type === 'impact') ? 'research' : (p.type === 'auto' || p.type === 'vision' || p.sub === 'soft') ? 'soft' : 'fab';
  // mods: optional { fab, soft, research } progress multipliers for this turn
  Robot.work = function (S, hours, mods) {
    const W = { high: 3, normal: 2, low: 1 };
    const mult = p => (mods && mods[Robot.cat(p)] != null ? mods[Robot.cat(p)] : 1);
    const done = [];
    let left = hours;
    for (let pass = 0; pass < 3 && left > 0.5; pass++) {
      const act = S.projects.filter(p => p.done < p.need && mult(p) > 0);
      if (!act.length) break;
      const tw = act.reduce((s, p) => s + W[p.prio], 0);
      let used = 0;
      act.forEach(p => { const k = mult(p), share = left * W[p.prio] / tw; const take = Math.min(share, (p.need - p.done) / k); p.done += take * k; used += take; });
      left -= used;
    }
    S.projects.filter(p => p.done >= p.need - 0.01).forEach(p => { Robot.complete(S, p); done.push(p.name); });
    S.projects = S.projects.filter(p => p.done < p.need - 0.01);
    return { done, spare: left };
  };
  Robot.complete = function (S, p) {
    const rng = G.R, year = S.robot ? S.robot.year : S.year;
    const ef = EFFORT[p.effort || 'std'];
    const R = S.robot;
    const designSkill = Math.max(G.Career.mentorSkill(S, 'design'), G.Career.hasPerk(S, 'tempMentor') ? 55 : 0);
    switch (p.type) {
      case 'build': {
        if (!R || R.year !== year) return;
        const c = G.Seasons.concept(year, p.sub, p.concept), sub = R.subs[p.sub];
        if (sub.ver && sub.concept !== p.concept) {
          const old = G.Seasons.concept(year, p.sub, sub.concept);
          if (old) Robot.addXP(S, mainArea(old), Math.round(sub.hours * 0.25 * 0.3));
        }
        const lvl = Robot.know(S, mainArea(c)), first = Robot.firstTime(S, c);
        const stats = {};
        Object.keys(c.base).forEach(k => { stats[k] = Math.min(Robot.ceil(S, year, p.sub, c, k), c.base[k] + 2 * Robot.know(S, statArea(p.sub, c, k)) + G.Shop.buildStat(S)); });
        let rel = 72 - 6 * c.cx + 4 * lvl + G.Shop.buildRel(S) + G.Career.mentorSkill(S, 'fab') / 20 - (first ? 15 : 0) + (ef.rel * 1.5)
          + (p.sub === 'drive' && c.id === 'swerve' && S.parts.swerve === 2 ? 5 : 0);
        let hidden = (p.effort === 'rush' && rng.chance(0.5) ? 1 : 0) + (first && rng.chance(0.6) ? 1 : 0);
        Object.assign(sub, { concept: p.concept, ver: 1, stats, rel: Math.round(U.clamp(rel, 25, 95)), cond: 100, w: c.w, hidden, hours: p.need });
        c.areas.forEach((a, i) => Robot.addXP(S, a, Math.round(30 * ef.gain * (i === 0 ? 1 : 0.5))));
        G.Career.inbox(S, 'Built: ' + c.name, 'Your ' + G.Seasons.sub(year, p.sub).name + ' is now a ' + c.name + ' (v1).' + (first ? ' This is the team\'s first time building one, so expect teething problems.' : ''), 'dev');
        break;
      }
      case 'upgrade': {
        if (!R) return;
        const sub = R.subs[p.sub], c = G.Seasons.concept(year, p.sub, sub.concept);
        if (!c || sub.concept !== p.forConcept && p.forConcept) return;
        const lvl = Robot.know(S, statArea(p.sub, c, p.focus));
        const frac = 0.25 * ef.gain * (0.6 + 0.4 * designSkill / 100) * (1 + 0.05 * lvl) * G.Shop.gainMult(S) * rng.range(0.85, 1.15);
        const changes = [];
        Object.keys(c.ceil).forEach(k => {
          const cl = Robot.ceil(S, year, p.sub, c, k), cur = sub.stats[k] || 0;
          const f = k === p.focus ? frac : frac * 0.35;
          const nv = Math.round(cur + Math.max(0, cl - cur) * f);
          if (nv !== cur) changes.push((D.STAT[k] || k) + ' ' + cur + '→' + nv);
          sub.stats[k] = nv;
        });
        sub.ver++;
        sub.hours += p.need;
        if (p.sub !== 'soft') { sub.w += p.effort === 'rush' ? 1 : 0.6; sub.rel = U.clamp(sub.rel + ef.rel, 20, 97); }
        if (p.effort === 'rush' && rng.chance(0.4)) sub.hidden++;
        (c.areas || []).forEach((a, i) => Robot.addXP(S, a, Math.round(30 * ef.gain * (i === 0 ? 1 : 0.4))));
        if (S.event && S.event.stage !== 'done' && p.sub !== 'soft') { R.pending.push(p.sub); G.Career.inbox(S, 'Upgrade ready: ' + p.name, 'Install it in the pits (practice block) to use it at this event. ' + changes.join(', '), 'dev'); }
        else G.Career.inbox(S, 'Upgrade complete: ' + p.name, changes.join(', ') || 'Already near the ceiling.', 'dev');
        break;
      }
      case 'harden': {
        const sub = R.subs[p.sub];
        sub.rel = Math.round(sub.rel + (96 - sub.rel) * 0.35); sub.hidden = 0; sub.cond = 100;
        G.Career.inbox(S, 'Hardening complete', G.Seasons.sub(year, p.sub).name + ' reliability is now ' + sub.rel + ' and hidden faults were cleared.', 'dev');
        Robot.addXP(S, 'elec', 15);
        break;
      }
      case 'light': {
        const sub = R.subs[p.sub], d = rng.range(2, 6);
        sub.w = Math.max(1, sub.w - d);
        if (rng.chance(0.2)) sub.rel = Math.max(20, sub.rel - 3);
        G.Career.inbox(S, 'Lightweighting complete', 'Removed ' + d.toFixed(1) + ' lb from the ' + G.Seasons.sub(year, p.sub).name + '. Robot weight: ' + Robot.weight(S) + ' lb.', 'dev');
        break;
      }
      case 'auto': R.autoTier = Math.min(3, R.autoTier + 1); Robot.addXP(S, 'autoPath', 50); G.Career.inbox(S, 'New auto routine', 'The robot can now run: ' + G.Seasons[year].autoTiers[R.autoTier] + '.', 'dev'); break;
      case 'vision': R.visionLvl = Math.min(2, R.visionLvl + 1); R.subs.soft.stats.vision = Math.min(99, (R.subs.soft.stats.vision || 0) + 15); Robot.addXP(S, 'vision', 60); G.Career.inbox(S, 'Vision Level ' + R.visionLvl, R.visionLvl === 1 ? 'Auto-aim and auto-align are online.' : 'Pose estimation and shoot-on-the-move are online.', 'dev'); break;
      case 'practiceBot': R.practiceBot = true; S.parts.spares += 6; G.Career.inbox(S, 'Practice robot complete', 'Drivers can now practice while the competition robot is upgraded (+driver growth, +10% starting tuning). +6 spare parts.', 'dev'); break;
      case 'kb': S.equip.kb = true; G.Career.inbox(S, 'Knowledge Base online', 'Knowledge decay between seasons is halved.', 'dev'); break;
      case 'impact': if (S.season) { S.season.impactDone = true; S.season.impact += 18; } G.Career.inbox(S, 'Impact submission ready', 'Judges will see a polished Impact story this season (+18 Impact score).', 'dev'); break;
      case 'research': {
        const r = D.RESEARCH.find(x => x.id === p.rid);
        const g = Robot.addXP(S, r.area, r.xp);
        G.Career.inbox(S, 'Research complete: ' + r.name, '+' + Math.round(g) + ' XP in ' + D.AREA[r.area].name + ' (now Level ' + Robot.know(S, r.area) + ').', 'know');
        break;
      }
    }
  };

  // ---------------- Events: entries, wear, repairs ----------------
  Robot.eventStart = function (S, ev) {
    let tune = 0.3 + (S.equip.field === ev.year ? 0.2 : 0) + (S.robot && S.robot.practiceBot ? 0.1 : 0) + (S.lastTune || 0) * 0.3;
    let conf = 0.3 + (S.practiceWeeks || 0) * 0.04 + (S.lastConf || 0) * 0.3;
    return { tune: U.clamp(tune, 0.2, 0.85), conf: U.clamp(conf, 0.2, 0.85) };
  };
  Robot.inspect = function (S, ev) {
    const R = S.robot;
    const notes = [];
    if (!R.subs.drive.ver) {
      const c = G.Seasons.concept(R.year, 'drive', 'kit');
      Object.assign(R.subs.drive, { concept: 'kit', ver: 1, stats: Object.assign({}, c.base), rel: 60, cond: 100, w: c.w, hidden: 0 });
      G.Career.spend(S, 600, 'Emergency kitbot drivetrain');
      S.morale = Math.max(0, S.morale - 8);
      notes.push('No drivetrain! The team bolted together an emergency kitbot chassis ($600).');
    }
    const w = Robot.weight(S);
    const ok = w <= Robot.WEIGHT_LIMIT;
    if (!ok) notes.push('Robot weighs ' + w + ' lb — over the ' + Robot.WEIGHT_LIMIT + ' lb limit. You must spend a practice block on emergency lightening.');
    return { ok, weight: w, notes };
  };
  Robot.emergencyLighten = function (S) {
    const R = S.robot, over = Robot.weight(S) - Robot.WEIGHT_LIMIT;
    if (over <= 0) return 'Robot is already legal.';
    const k = Object.keys(R.subs).filter(k => R.subs[k].ver && k !== 'soft' && k !== 'drive').sort((a, b) => R.subs[b].w - R.subs[a].w)[0] || 'drive';
    const sub = R.subs[k];
    sub.w -= over + 0.5;
    Object.keys(sub.stats).forEach(s => sub.stats[s] = Math.round(sub.stats[s] * 0.95));
    sub.rel = Math.max(20, sub.rel - 4);
    if (S.event) S.event.inspection.ok = true;
    return 'Drilled out ' + (over + 0.5).toFixed(1) + ' lb from the ' + G.Seasons.sub(R.year, k).name + ' (−5% stats, −4 reliability). Passed inspection.';
  };
  Robot.shakedown = function (S, p) {
    let found = 0;
    Object.values(S.robot.subs).forEach(s => { while (s.hidden > 0 && G.R.chance(p)) { s.hidden--; found++; } });
    return found;
  };
  Robot.installPending = function (S) { const n = S.robot.pending.length; S.robot.pending = []; return n; };
  Robot.matchEntry = function (S, ev) {
    const R = S.robot, subs = {};
    Object.keys(R.subs).forEach(k => { subs[k] = R.subs[k]; });
    // upgrades not yet installed at an event use previous stats: approximate by ignoring nothing (pending simply flags)
    const cap = G.Cap.build(R.year, subs, { autoTier: R.autoTier, visionLvl: R.visionLvl, parts: S.parts });
    if (R.pending.length) cap.scoreSpd = Math.round(cap.scoreSpd * 0.97);
    const dt = G.Career.driveTeam(S);
    return {
      team: S.team.num, cap, look: Robot.look(S), isPlayer: true,
      drv: { drive: dt.driver.attr.drive, comp: Math.round((dt.driver.attr.comp + dt.operator.attr.comp) / 2), aware: dt.driver.attr.aware, mech: dt.operator.attr.mech, hp: dt.hp.attr.hp, strat: dt.coachStrat },
      tune: ev ? ev.tune : 0.5, conf: ev ? ev.conf : 0.5, tuneAuto: ev ? ev.tuneAuto : 0,
      cond: Robot.condAvg(S), batt: ev && ev.batt != null ? ev.batt : 1, hidden: Math.max(0, Robot.hidden(S) - (ev ? ev.shake * 0.5 : 0)),
      power: G.Cap.power(R.year, cap)
    };
  };
  Robot.applyWear = function (S, rr, playoff) {
    const R = S.robot, P = G.Engine.PACE[rr.pace || 'bal'];
    const extra = 1 + rr.defTime / 30 + rr.contacts / 15;
    Object.keys(R.subs).forEach(k => {
      const s = R.subs[k];
      if (!s.ver || k === 'soft') return;
      let w = G.R.range(2.5, 5.5) * P.wear * (k === 'drive' ? extra : 1 + rr.cycles / 25);
      s.cond = Math.max(0, s.cond - w);
    });
    rr.faults.forEach(f => {
      const map = { 'Intake broke': 'intake', 'Scorer broke': 'scorer', 'Climber broke': 'endgame', 'TIPPED OVER': 'scorer' };
      const k = map[f];
      if (k && R.subs[k] && R.subs[k].ver) R.subs[k].cond = Math.max(0, R.subs[k].cond - 25);
    });
  };
  Robot.pitRepair = function (S, turnaround, bonus) {
    const R = S.robot;
    let pts = (6 + 5 * Math.min(turnaround, 8)) * G.Shop.repairMult(S) * (1 + G.Career.mentorSkill(S, 'fab') / 200) * (bonus || 1);
    let used = 0;
    const subs = Object.keys(R.subs).filter(k => k !== 'soft' && R.subs[k].ver).map(k => R.subs[k]).sort((a, b) => a.cond - b.cond);
    for (const s of subs) {
      if (pts <= 0) break;
      const cap = S.parts.spares > 0 ? 100 : Math.max(s.cond, 60);
      const need = Math.max(0, cap - s.cond), take = Math.min(need, pts);
      s.cond += take; pts -= take;
      // one spare covers D.SPARE_COND_PER_UNIT condition points; fractions carry over between repairs
      if (S.parts.spares > 0) S.parts.spareUse = (S.parts.spareUse || 0) + take / D.SPARE_COND_PER_UNIT;
    }
    const sp = Math.min(S.parts.spares, Math.floor(S.parts.spareUse || 0));
    S.parts.spares -= sp; used += sp;
    S.parts.spareUse = S.parts.spares > 0 ? Math.max(0, (S.parts.spareUse || 0) - sp) : 0;
    return used;
  };
  Robot.homeRepair = function (S) {
    const R = S.robot; if (!R) return 0;
    let cost = 0;
    Object.keys(R.subs).forEach(k => { const s = R.subs[k]; if (s.ver && s.cond < 100) { cost += (100 - s.cond) * 6; s.cond = 100; } });
    return Math.round(cost);
  };
  Robot.describe = function (S) {
    const R = S.robot, year = R.year;
    return G.Seasons[year].subs.map(sd => {
      const s = R.subs[sd.id];
      const c = s.ver ? G.Seasons.concept(year, sd.id, s.concept) : null;
      return { id: sd.id, name: sd.name, sub: s, concept: c };
    });
  };
})();
