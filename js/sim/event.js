'use strict';
/* FRC Manager — event flow: practice, qualification schedule, rankings, OPR, alliance selection, playoffs, awards */
(function () {
  const U = G.U, D = G.Data;
  const Ev = G.Ev = {};

  const KIND = {
    regional: { name: 'Regional', perTeam: n => n <= 44 ? 11 : n <= 54 ? 10 : 9, blocks: 3, sel: true, awards: true },
    champs: { name: 'Championship Division', perTeam: () => 10, blocks: 3, sel: true, awards: true },
    offseason: { name: 'Offseason Event', perTeam: () => 6, blocks: 1, sel: true, awards: false },
    scrimmage: { name: 'Week 0 Scrimmage', perTeam: () => 5, blocks: 2, sel: false, awards: false },
    einstein: { name: 'Einstein', perTeam: () => 0, blocks: 0, sel: false, awards: false },
    dcmp: { name: 'District Championship', perTeam: () => 12, blocks: 2, sel: true, awards: true }
  };
  Ev.KIND = KIND;

  function hash(a, b) { let h = (a ^ 0x9e3779b9) >>> 0; h = Math.imul(h ^ (b + 0x7f4a7c15), 2654435761) >>> 0; return (h ^ (h >>> 13)) >>> 0; }

  // ------------------------------------------------------------------
  Ev.start = function (def) {
    const S = G.S, rng = G.R;
    const K = KIND[def.kind];
    const year = def.year || S.year;
    const ev = {
      id: def.id || U.uid('ev'), name: def.name, kind: def.kind, year, week: def.week || 0, region: def.region || S.team.region,
      star: def.str || 3, seed: rng.int(1, 2e9), stage: 'practice', teams: [], caps: {}, rank: {}, quals: [], qi: 0,
      dist: def.dist || null, // a district event (two days, twelve qualification matches each) or the District Championship
      practice: { blocks: def.dist ? 2 : K.blocks, used: [] }, tune: 0.3, conf: 0.3, tuneAuto: 0, shake: 0, plan: { pace: 'bal', role: 'score', target: 'auto', endTiming: 'std', endLevel: 9, rpHunt: false, avoid: false, noCarry: false },
      suggest: {}, sel: null, alliances: null, po: null, awards: [], log: [], lastPlayerMatch: -1, timeouts: {}, matchCount: 0, playerResults: [],
      incidents: [], fatigue: S.fatigue == null ? D.FATIGUE_BASE : S.fatigue,
      fmt: def.fmt || G.Era.playoffs(G.Era.cy(S)) // playoff format of the calendar year: 'se' single elimination (to 2022), 'de' double elimination
    };
    ev.scoutCred = Ev.credibility(S, ev);
    const player = S.team.num;
    const weekMult = def.kind === 'champs' || def.kind === 'einstein' ? 1.08 : def.kind === 'offseason' ? 1.04 : def.kind === 'scrimmage' ? 0.8 : 0.85 + 0.03 * (ev.week - 1);
    const diffMult = { easy: 0.9, normal: 1, hard: 1.1 }[S.diff] || 1;
    const size = def.size || 40;
    const exclude = new Set([player]);
    // a simulated world names the teams at every event; otherwise the field is drawn by area and strength
    const ai = def.teams && def.teams.length >= 11 ? def.teams.filter(n => S.teams[n] && n !== player) : G.AI.pickAttendees(S.teams, rng, size - 1, ev.region, ev.star, exclude, def.kind === 'champs');
    ev.teams = [player].concat(ai);
    ai.forEach(n => { ev.caps[n] = G.AI.entry(S.teams[n], year, weekMult, diffMult, rng); });
    ev.teams.forEach(n => { ev.rank[n] = { rp: 0, played: 0, w: 0, l: 0, t: 0, pts: 0, auto: 0, tb: rng.next() }; });
    // practice starting values
    const st = G.Robot.eventStart(S, ev);
    ev.tune = st.tune; ev.conf = st.conf;
    if (def.kind === 'einstein') { ev.stage = 'playoffs'; }
    else ev.quals = makeSchedule(ev.teams, def.dist ? 12 : K.perTeam(ev.teams.length), rng);
    ev.inspection = G.Robot.inspect(S, ev);
    S.event = ev;
    return ev;
  };

  function makeSchedule(teams, perTeam, rng) {
    const q = [];
    for (let r = 0; r < perTeam; r++) q.push(...rng.shuffle(teams.slice()));
    const matches = [];
    while (q.length) {
      const m = [];
      while (m.length < 6 && q.length) {
        let k = q.findIndex(t => !m.includes(t));
        if (k < 0) break;
        m.push(q.splice(k, 1)[0]);
      }
      while (m.length < 6) { const t = rng.pick(teams); if (!m.includes(t)) m.push(t); }
      matches.push({ n: matches.length + 1, red: m.slice(0, 3), blue: m.slice(3, 6), res: null });
    }
    // spread consecutive appearances
    for (let i = 1; i < matches.length; i++) {
      const prev = matches[i - 1], cur = matches[i];
      const clash = cur.red.concat(cur.blue).some(t => prev.red.includes(t) || prev.blue.includes(t));
      if (clash && i + 1 < matches.length) {
        const j = i + 1 + Math.floor(rng.next() * (matches.length - i - 1));
        const tmp = matches[i]; matches[i] = matches[j]; matches[j] = tmp;
      }
    }
    matches.forEach((m, i) => m.n = i + 1);
    return matches;
  }

  // ------------------------------------------------------------------
  // Practice
  // ------------------------------------------------------------------
  Ev.PRACTICE = [
    { id: 'driver', name: 'Driver Reps', desc: '+Driver Confidence (faster, cleaner cycles).' },
    { id: 'calib', name: 'Mechanism Calibration', desc: '+Robot Tuning (accuracy).' },
    { id: 'auto', name: 'Auto Validation', desc: '+Autonomous success rate.' },
    { id: 'shake', name: 'Systems Shakedown', desc: 'Find hidden faults, lower fault chance and rebuild worn parts: robot condition back to 100%.' },
    { id: 'scout', name: 'Scouting Focus', desc: 'Sharper scouting data on other teams.' },
    { id: 'install', name: 'Install Upgrade', desc: 'Install finished upgrades in the pits.' }
  ];
  Ev.canInstall = S => !!(S.robot && ((S.robot.pending || []).length || G.Robot.held(S).length));
  Ev.doPractice = function (ev, prog) {
    const S = G.S, rng = G.R, out = [];
    // nothing to install: the block is not used up (the button says so too)
    if (prog === 'install' && !Ev.canInstall(S)) return ['No pending upgrades to install: the practice block is still free.'];
    const coach = G.Career.mentorSkill(S, 'coach'), strat = G.Career.mentorSkill(S, 'strat'), prog2 = G.Career.mentorSkill(S, 'prog'), fab = G.Career.mentorSkill(S, 'fab');
    switch (prog) {
      case 'driver': {
        const d = 0.22 + 0.12 * coach / 100, f0 = S.robot ? G.Robot.famAvg(S.robot, S.robot.comp || 0) : null;
        ev.conf = U.clamp(ev.conf + d, 0, 1); out.push('Driver confidence +' + Math.round(d * 100) + '%');
        if (f0 != null) { G.Robot.famDrive(S, S.robot.comp || 0, D.FAM.BLOCK); out.push('Robot familiarity ' + Math.round(f0 * 100) + '% → ' + Math.round(G.Robot.famAvg(S.robot, S.robot.comp || 0) * 100) + '%'); }
        break;
      }
      case 'calib': { const d = 0.22 + 0.1 * G.Career.mentorSkill(S, 'design') / 100; ev.tune = U.clamp(ev.tune + d, 0, 1); out.push('Robot tuning +' + Math.round(d * 100) + '%'); break; }
      case 'auto': { const d = 0.06 + 0.05 * prog2 / 100; ev.tuneAuto = U.clamp(ev.tuneAuto + d, 0, 0.2); out.push('Auto success +' + Math.round(d * 100) + '%'); break; }
      case 'shake': {
        ev.shake = Math.min(2, ev.shake + 1);
        const found = G.Robot.shakedown(S, 0.55 + 0.3 * fab / 100);
        out.push(found ? 'Found and fixed ' + found + ' hidden fault' + (found > 1 ? 's' : '') + '.' : 'No hidden faults found. Systems look healthy.');
        // a full teardown: every worn part is rebuilt, using spares first and borrowing from other pits for the rest
        const before = Math.round(G.Robot.condAvg(S));
        if (before < 100) {
          const rep = G.Robot.homeRepair(S, true);
          let borrowed = false;
          Object.values(S.robot.subs).forEach(sb => { if (sb.ver && sb.cond < 100) { sb.cond = 100; borrowed = true; } });
          out.push('Rebuilt worn parts: condition ' + before + '% → 100%' + (rep.used ? ' (' + rep.used + ' spare part' + (rep.used > 1 ? 's' : '') + ')' : '') + (borrowed ? ', finished with parts borrowed from other teams\' pits' : '') + '.');
        } else out.push('Robot condition already 100%.');
        break;
      }
      case 'scout': { ev.scoutBonus = (ev.scoutBonus || 0) + 1; ev.scoutCred = Math.min(0.99, ev.scoutCred + 0.03); out.push('Scouting data sharpened (strategy mentor ' + Math.round(strat) + '). Scouting credibility ' + Math.round(ev.scoutCred * 100) + '%.'); break; }
      case 'install': {
        // parts made while the robot was in the bag come out of the crate; then anything that was finished during the event
        const fit = G.Robot.installHeld(S), n = G.Robot.installPending(S);
        if (fit.length) {
          out.push('Fitted in the pits: ' + fit.join(', ') + '.');
          ev.inspection = G.Robot.inspect(S, ev);
          if (!ev.inspection.ok) out.push('With the new parts the robot weighs ' + ev.inspection.weight + ' lb. ' + G.Robot.emergencyLighten(S));
        }
        if (n) out.push('Installed ' + n + ' upgrade' + (n > 1 ? 's' : '') + '.');
        if (!fit.length && !n) out.push('No pending upgrades to install.');
        break;
      }
      case 'lighten': { out.push(G.Robot.emergencyLighten(S)); break; }
    }
    ev.practice.used.push(prog);
    if (ev.practice.used.length >= ev.practice.blocks) ev.stage = ev.kind === 'einstein' ? 'playoffs' : 'quals';
    return out;
  };
  Ev.skipPractice = function (ev) { while (ev.stage === 'practice') Ev.doPractice(ev, ev.inspection && !ev.inspection.ok && !ev.practice.used.includes('lighten') ? 'lighten' : G.Robot.held(G.S).length ? 'install' : 'calib'); };

  // ------------------------------------------------------------------
  // Match building & running
  // ------------------------------------------------------------------
  Ev.entryFor = function (ev, team, alliance, matchIdx, playoff) {
    const S = G.S;
    if (team === S.team.num) {
      const en = G.Robot.matchEntry(S, ev);
      en.plan = Object.assign({}, ev.plan);
      return en;
    }
    const base = ev.caps[team];
    const en = Object.assign({}, base);
    en.plan = Object.assign({}, base.plan);
    return en;
  };
  Ev.matchEntries = function (ev, match, playoff) {
    const S = G.S, rng = G.makeRng(hash(ev.seed, match.key || match.n || 1));
    const out = {};
    ['red', 'blue'].forEach(a => {
      const teams = match[a];
      const ens = teams.map(t => Ev.entryFor(ev, t, a, match.n, playoff));
      const hasPlayer = teams.includes(S.team.num);
      ens.forEach(e => {
        if (e.isPlayer) return;
        if (hasPlayer && ev.suggest[e.team]) {
          const acc = 0.4 + 0.1 * G.Career.mentorStars(S, 'strat') + S.rep / 500;
          if (rng.chance(acc)) e.plan.role = ev.suggest[e.team];
          e.followed = e.plan.role === ev.suggest[e.team];
          e.suggested = true;
        }
        if (playoff || rng.chance(0.5)) e.plan.rpHunt = !playoff;
      });
      // 2024 note feeding: an alliance needs a robot that can lob notes (ranged shooter + ground intake) and another scorer.
      // AI alliances pick it up over the season; your alliance's grasp comes from your team's strategy read.
      let iq = 0, feeding = false;
      if (ev.year === 2024) {
        const ai = Ev.feedChance(ev, playoff), mine = hasPlayer ? G.Career.metaInsight(S) : 0;
        const cands = ens.filter(e => !e.isPlayer && !e.suggested && e.plan.role === 'score' && e.cap.speaker && (e.cap.range || 0) >= 30 && e.cap.ground);
        const scorers = ens.filter(e => e.cap.speaker || e.cap.amp || e.cap.ampViaShooter).length;
        if (cands.length && scorers >= 2 && rng.chance(hasPlayer ? Math.max(ai, mine * 0.9) : ai)) {
          cands.sort((p, q) => (p.power || 0) - (q.power || 0))[0].plan.role = 'feed';
          feeding = true;
        }
        const k = Ev.metaProgress(ev);
        iq = hasPlayer ? Math.max(mine, feeding ? 0.35 + 0.45 * k : ai * 0.6) : (feeding ? 0.4 + 0.5 * k : ai * 0.6);
        ev.feedStats = ev.feedStats || { n: 0, f: 0 };
        ev.feedStats.n++; if (feeding) ev.feedStats.f++;
      }
      // 2026 fuel hoarding: while its hub is inactive an alliance lobs fuel from the neutral zone back into its own zone.
      // AI alliances pick it up over the season; your alliance's grasp comes from your team's strategy read.
      if (ev.year === 2026) {
        const ai = Ev.hoardChance(ev, playoff), mine = hasPlayer ? G.Career.metaInsight(S) : 0, k = Ev.metaProgress(ev);
        const hoards = rng.chance(hasPlayer ? Math.max(ai, mine * 0.9) : ai);
        iq = hoards ? (hasPlayer ? Math.max(mine, 0.35 + 0.45 * k) : 0.4 + 0.5 * k) : 0;
        ev.feedStats = ev.feedStats || { n: 0, f: 0 };
        ev.feedStats.n++; if (hoards) ev.feedStats.f++;
      }
      out.feedIQ = out.feedIQ || {}; out.feedIQ[a] = iq;
      // AI alliance strategy: should the weakest robot play defense? Teams learn each game's meta over the season.
      const already = ens.some(e => e.plan.role === 'defend');
      const cands = ens.filter(e => !e.isPlayer && !e.suggested && e.plan.role === 'score' && (e.cap.push || 0) >= 30);
      if (!already && cands.length) {
        const pDef = Ev.defenseChance(ev, playoff) * (feeding ? 0.5 : 1); // a feeding alliance rarely has a spare robot to defend
        const used = rng.chance(pDef);
        if (used) cands.sort((p, q) => (p.power || 0) - (q.power || 0))[0].plan.role = 'defend';
      }
      ev.defStats = ev.defStats || { n: 0, d: 0 };
      ev.defStats.n++; if (ens.some(e => e.plan.role === 'defend')) ev.defStats.d++;
      out[a] = ens;
    });
    return out;
  };
  // 0 at the start of the competition season → 1 by Week 6 / Championship / offseason
  Ev.metaProgress = function (ev) {
    if (ev.kind === 'champs' || ev.kind === 'einstein' || ev.kind === 'offseason') return 1;
    if (ev.kind === 'scrimmage') return 0;
    return U.clamp((ev.week - 1) / 5, 0, 1);
  };
  // 2024: chance an AI alliance runs a note feeder. Feeding spread through the real season and dominated late events.
  Ev.feedChance = function (ev, playoff) {
    if (ev.year !== 2024) return 0;
    const k = Ev.metaProgress(ev);
    return playoff ? 0.15 + 0.6 * k : 0.05 + 0.45 * k;
  };
  // 2026: chance an AI alliance hoards fuel during its inactive shifts (rare in Week 1, standard by the Championship)
  Ev.hoardChance = function (ev, playoff) {
    if (ev.year !== 2026) return 0;
    const k = Ev.metaProgress(ev);
    return playoff ? 0.2 + 0.65 * k : 0.08 + 0.5 * k;
  };
  // Chance an AI alliance assigns one defender. Shooting games trend toward defense; placement games away from it.
  Ev.defenseChance = function (ev, playoff) {
    const meta = G.Seasons[ev.year].meta || {}, k = Ev.metaProgress(ev);
    if (meta.defense) return playoff ? 0.35 + 0.55 * k : 0.12 + 0.5 * k;
    return playoff ? 0.05 + 0.25 * (1 - k) : 0.04 + 0.2 * (1 - k);
  };
  // 2016: the audience picks one defense for every round of matches (position 3, the same for both alliances). The
  // category rotates A, B, C, D from a random start; which of its two defenses wins the cheer is up to the crowd.
  Ev.audience16 = function (ev, match) {
    if (!ev || ev.year !== 2016 || !match) return null;
    const per = Math.max(1, Math.ceil(((ev.teams || []).length || 24) / 6));
    const rd = match.playoff ? 500 + ((match.key || match.n || 0) % 97) : Math.floor(((match.n || 1) - 1) / per);
    const cat = 'ABCD'[(hash(ev.seed, 1601) + rd) % 4];
    const two = Object.keys(G.Rules.DEF16).filter(k => G.Rules.DEF16[k].cat === cat);
    return { cat, type: two[hash(ev.seed, 1613 + rd * 31) % two.length] };
  };
  Ev.buildEngine = function (ev, match, opts) {
    const S = G.S;
    const playoff = !!match.playoff;
    const ens = Ev.matchEntries(ev, match, playoff);
    // the player's optional pre-match choices in the classic games
    const mine = match.red.includes(S.team.num) ? 'red' : match.blue.includes(S.team.num) ? 'blue' : null, opp = mine === 'red' ? 'blue' : 'red', p = ev.plan || {};
    const defPick = mine && ev.year === 2016 && (p.defA || p.defB || p.defC || p.defD) ? { [opp]: { A: p.defA || null, B: p.defB || null, C: p.defC || null, D: p.defD || null } } : null;
    const puPref = mine && ev.year === 2018 && p.puPref ? { [mine]: p.puPref } : null;
    return G.Engine.create({ defPick, puPref, aud16: Ev.audience16(ev, match),
      towerStrength: ev.year === 2016 && ['dcmp', 'champs', 'einstein'].includes(ev.kind) ? 10 : null, // FIRST raised the tower from 8 to 10 for the championships
      level: ev.kind === 'dcmp' ? 'dcmp' : ev.kind === 'champs' || ev.kind === 'einstein' ? 'cmp' : 'reg',
      year: ev.year, red: ens.red, blue: ens.blue, seed: hash(ev.seed, (match.key || match.n) * 7919 + (match.game || 0)),
      headless: !!(opts && opts.headless), playoff, diff: { easy: 0.6, normal: 1, hard: 1.3 }[S.diff] || 1,
      calls: G.Career.coachCalls(S, playoff), coachSkill: G.Career.coachSkill(S), playerTeam: S.team.num, feedIQ: ens.feedIQ
    });
  };
  Ev.runHeadless = function (ev, match) { const m = Ev.buildEngine(ev, match, { headless: true }); G.Engine.run(m); return m.result; };
  Ev.hasPlayer = (match) => match.red.includes(G.S.team.num) || match.blue.includes(G.S.team.num);

  Ev.applyQual = function (ev, match, res) {
    match.res = res;
    ['red', 'blue'].forEach(a => {
      match[a].forEach(t => {
        const rk = ev.rank[t];
        rk.played++; rk.rp += res[a].rp; rk.pts += res[a].score; rk.auto += res[a].auto;
        if (res[a].win === 1) rk.w++; else if (res[a].win === 0) rk.l++; else rk.t++;
      });
    });
    ev.matchCount++;
    observe(ev, res);
    if (Ev.hasPlayer(match)) G.Career.afterPlayerMatch(G.S, ev, match, res);
  };
  // ------------------------------------------------------------------
  // Scouting observations: what each robot actually did in its qualification matches
  // ------------------------------------------------------------------
  function observe(ev, res) {
    if (!res || !res.robots) return;
    ev.obs = ev.obs || {};
    res.robots.forEach(r => {
      const o = ev.obs[r.team] || (ev.obs[r.team] = { n: 0, pts: 0, auto: 0, endTry: 0, endOK: 0, endLvl: 0, faultM: 0, faults: 0, comms: 0, dead: 0, fouls: 0, def: 0 });
      const fl = (r.faults || []).filter(f => f !== 'Climb failed');
      o.n++; o.pts += r.pts || 0; if (r.autoOK) o.auto++;
      if (fl.length || r.dead) o.faultM++;
      o.faults += fl.length; o.comms += fl.filter(f => /comms/i.test(f)).length; if (r.dead) o.dead++;
      if (r.end && (r.end.lvl > 0 || r.end.failed)) { o.endTry++; if (r.end.lvl > 0 && r.end.eng !== false) { o.endOK++; o.endLvl += r.end.lvl; } } // 2023: only an Engaged dock counts as a success
      o.fouls += r.fouls || 0;
      if (r.role === 'defend') o.def++;
    });
  }
  // Per-match averages and rates for one team (null before its first match)
  // ------------------------------------------------------------------
  // Fatigue at events: scouting credibility and drive-team / pit-crew incidents
  // ------------------------------------------------------------------
  // How much of the scouting data is right: tired scouts mix teams up; a strategy mentor and experience help
  Ev.credibility = function (S, ev) {
    const f = ev.fatigue, strat = G.Career.mentorSkill(S, 'strat');
    const exp = S.history.reduce((n, h) => n + (h.events || []).length, 0) + ((S.season && S.season.events) || []).length;
    return U.clamp(0.95 - Math.max(0, f - D.FATIGUE_BASE) * 0.0065 + 0.035 * strat / 100 + Math.min(0.03, exp * 0.005) - (ev.kind === 'champs' ? 0.01 : 0), 0.5, 0.99);
  };
  const frac = (a, b) => hash(a, b) / 4294967296;
  // The scouting data you see: mostly true, but now and then a tired scout logged a different team's robot
  Ev.obsShown = function (ev, t) {
    const o = Ev.obsOf(ev, t);
    if (!o || t === G.S.team.num || frac(ev.seed, t * 7 + 3) < (ev.scoutCred == null ? 1 : ev.scoutCred)) return o;
    const others = ev.teams.filter(x => x !== t && x !== G.S.team.num && Ev.obsOf(ev, x));
    if (!others.length) return o;
    return Ev.obsOf(ev, others[hash(ev.seed, t) % others.length]);
  };
  // Expected incidents per event: about 0.5 at normal fatigue (never more than one), rising fast for a tired team
  Ev.incidentRate = f => f <= D.FATIGUE_BASE ? 0.5 * f / D.FATIGUE_BASE : 0.5 + (f - D.FATIGUE_BASE) * 0.065;
  const INCIDENTS = [
    { id: 'batt', w: 3, title: 'Battery not swapped', text: 'The pit crew sent the robot out on the battery from the last match.', apply: ev => { ev.batt = (ev.batt || 1) * 0.45; } },
    { id: 'auto', w: 3, title: 'Wrong auto selected', text: 'The drive team picked the wrong autonomous routine from the dashboard.', apply: ev => { ev.incNext = Object.assign({}, ev.incNext, { autoFail: true }); } },
    { id: 'bumper', w: 2, title: 'Loose bumper', text: 'A bumper bolt was never tightened. The bumper fell off mid-match and the referee disabled the robot.', apply: ev => { ev.incNext = Object.assign({}, ev.incNext, { disableAt: G.R.range(30, 110) }); } },
    { id: 'vision', w: 2, req: S => !!(S.robot && S.robot.visionLvl > 0), title: 'Vision not calibrated', text: 'Nobody re-ran the camera calibration after the last repair: the robot aimed off target for the whole match.', apply: ev => { ev.incNext = Object.assign({}, ev.incNext, { visionOff: true }); } },
    { id: 'code', w: 2, title: 'Wrong code on the robot', text: 'A test branch was pushed to the robot in the queue: the autonomous routine did not run and half the operator controls were dead.', apply: ev => { ev.incNext = Object.assign({}, ev.incNext, { codeBad: true }); } },
    { id: 'tool', w: 2, title: 'Tool left inside the robot', text: 'A wrench stayed inside the robot after the last repair and blocked a mechanism for the whole match.', apply: ev => { ev.incNext = Object.assign({}, ev.incNext, { toolIn: G.R.pick(['intake', 'scorer', 'endgame']) }); } },
    { id: 'stick', w: 2, title: 'Joystick not plugged in', text: 'The driver station came back from the pits with the joystick unplugged. The first 20 seconds of teleop were gone before anyone noticed.', apply: ev => { ev.incNext = Object.assign({}, ev.incNext, { teleDelay: 20 }); } },
    { id: 'wire', w: 3, title: 'Loose connector missed', text: 'A loose CAN connector slipped through the pit checklist.', apply: ev => { ev.incNext = Object.assign({}, ev.incNext, { hidden: 1 }); } },
    { id: 'repair', w: 2, title: 'Repairs unfinished', text: 'The pit crew ran out of time before queuing and left a repair half-done.', apply: (ev, S) => { if (S.robot) Object.values(S.robot.subs).forEach(x => { if (x.ver && x !== S.robot.subs.soft) x.cond = Math.max(0, x.cond - 8); }); } },
    { id: 'scouts', w: 2, title: 'Scouting sheets mixed up', text: 'Two scouts swapped team numbers for a whole round of matches.', apply: ev => { ev.scoutCred = Math.max(0.5, (ev.scoutCred || 0.95) - 0.05); } }
  ];
  Ev.rollIncident = function (S, ev) {
    if (ev.kind === 'scrimmage') return;
    const f = ev.fatigue == null ? D.FATIGUE_BASE : ev.fatigue, n = ev.incidents.length;
    if (f <= D.INCIDENT_FREE && n >= 1) return;
    const perMatch = Ev.incidentRate(f) / (ev.kind === 'einstein' ? 4 : ev.kind === 'offseason' ? 8 : 12) * G.Career.techCheck(S); // a Technician runs the pre-match checklist
    if (!G.R.chance(perMatch)) return;
    const inc = G.R.wpick(INCIDENTS.filter(x => !x.req || x.req(S, ev)), x => x.w);
    inc.apply(ev, S);
    const at = ev.stage === 'playoffs' ? 'Playoffs' : 'Qual ' + ((ev.quals[ev.qi] || {}).n || '');
    ev.incidents.push({ at, title: inc.title, text: inc.text, f: Math.round(f) });
    ev.log.push('Incident: ' + inc.title + '. ' + inc.text);
  };
  Ev.obsOf = function (ev, t) {
    const o = (ev.obs || {})[t];
    if (!o || !o.n) return null;
    return { n: o.n, pts: o.pts / o.n, auto: o.auto / o.n, climb: o.endTry ? o.endOK / o.endTry : null, climbTry: o.endTry, climbLvl: o.endOK ? o.endLvl / o.endOK : 0,
      rel: 1 - o.faultM / o.n, faults: o.faults, comms: o.comms, dead: o.dead, fouls: o.fouls / o.n, def: o.def };
  };
  // How valuable a pick is to an alliance, from the scouting data (shared by AI captains and the player's recommendations).
  // Small samples are shrunk toward a typical robot so one lucky or unlucky match doesn't dominate.
  // shown: use the data the player's scouts recorded (possibly mixed up) instead of the truth
  // shown: everything comes from your own scouting (match sheets that tired scouts may have mixed up, and the pit
  // scouts' estimate of how hard a robot pushes); otherwise the truth, as for the AI captains. The OPR is public: it is
  // worked out from the official scores, so both use it, blended with the points the scouts saw each robot score.
  Ev.pickScore = function (ev, al, cand, shown) {
    const S = G.S, capOf = t => ev.caps[t] ? ev.caps[t].cap : G.Robot.matchEntry(S, ev).cap, obs = shown ? Ev.obsShown : Ev.obsOf;
    const cap = capOf(cand), o = obs(ev, cand), n = o ? o.n : 0, K = 3, opr = Ev.opr(ev)[cand] || 0;
    const shrink = (rate, cnt, prior) => ((rate == null ? 0 : rate * cnt) + prior * K) / (cnt + K);
    const rel = shrink(o && o.rel, n, 0.8), auto = shrink(o && o.auto, n, 0.75), pts = shrink(o && o.pts, n, opr);
    const lvl = o && o.climbLvl ? o.climbLvl : (o && o.climbTry ? 0 : cap.endLevel || 0);
    const climb = shrink(o && o.climb, o ? o.climbTry : 0, lvl ? 0.65 : 0);
    let v = (0.5 * opr + 0.5 * pts) * (0.55 + 0.45 * rel);            // unreliable robots lose a lot of their value in playoffs
    v += (auto - 0.75) * 8 + climb * lvl * 2 - (o ? o.fouls * 1.5 + o.dead * 1.5 : 0);
    const climbers = al.filter(t => { const ob = obs(ev, t); return ob ? (ob.climb || 0) >= 0.6 && ob.climbLvl >= 2 : (capOf(t).endLevel || 0) >= 2; }).length;
    if (!climbers && lvl >= 2) v += 4 * climb;                         // complement: the alliance still needs a reliable climber
    const meta = G.Seasons[ev.year].meta;
    const push = shown && cand !== S.team.num && ev.caps[cand] ? Ev.scout(ev, cand).est.push : cap.push || 0;
    if (meta && meta.defense && al.length === 2) v += push / 20 + (o && o.def ? 2 : 0); // a second pick that can defend
    return v;
  };
  // Simulate AI matches until the next player match (or end of quals). Returns the player's match or null.
  Ev.advanceQuals = function (ev) {
    while (ev.qi < ev.quals.length) {
      const mt = ev.quals[ev.qi];
      if (Ev.hasPlayer(mt)) return mt;
      Ev.applyQual(ev, mt, Ev.runHeadless(ev, mt));
      ev.qi++;
    }
    ev.stage = KIND[ev.kind].sel ? 'selection' : 'done';
    if (ev.stage === 'selection') Ev.initSelection(ev);
    else Ev.finishEvent(ev);
    return null;
  };
  Ev.completePlayerQual = function (ev, res) {
    const mt = ev.quals[ev.qi];
    Ev.applyQual(ev, mt, res);
    ev.lastPlayerMatch = ev.qi;
    ev.qi++;
  };
  Ev.simRestQuals = function (ev) {
    while (ev.stage === 'quals') {
      const mt = Ev.advanceQuals(ev);
      if (!mt) break;
      G.Career.beforePlayerMatch(G.S, ev, { sim: true });
      Ev.completePlayerQual(ev, Ev.runHeadless(ev, mt));
    }
  };
  Ev.playerMatchesLeft = ev => ev.quals.slice(ev.qi).filter(Ev.hasPlayer).length;
  Ev.turnaround = function (ev) {
    if (ev.lastPlayerMatch < 0) return 99;
    return ev.qi - ev.lastPlayerMatch;
  };

  // ------------------------------------------------------------------
  // Rankings & OPR
  // ------------------------------------------------------------------
  Ev.rankings = function (ev) {
    return ev.teams.slice().sort((a, b) => {
      const A = ev.rank[a], B = ev.rank[b];
      const ra = A.played ? A.rp / A.played : 0, rb = B.played ? B.rp / B.played : 0;
      if (rb !== ra) return rb - ra;
      const pa = A.played ? A.pts / A.played : 0, pb = B.played ? B.pts / B.played : 0;
      if (pb !== pa) return pb - pa;
      const aa = A.played ? A.auto / A.played : 0, ab = B.played ? B.auto / B.played : 0;
      if (ab !== aa) return ab - aa;
      return B.tb - A.tb;
    });
  };
  Ev.rankOf = (ev, team) => Ev.rankings(ev).indexOf(team) + 1;
  Ev.opr = function (ev) {
    if (ev._oprAt === ev.matchCount && ev._opr) return ev._opr;
    ev._opr = oprSolve(ev, r => r.score - r.foul, ev.oprBase || null); ev._oprAt = ev.matchCount;
    return ev._opr;
  };
  // the same estimate for one part of the score: 'auto', 'tele' or 'end' (they add up to the OPR)
  Ev.oprPart = function (ev, key) {
    const c = ev._oprP = ev._oprP && ev._oprP.at === ev.matchCount ? ev._oprP : { at: ev.matchCount };
    if (!c[key]) {
      const tot = Ev.opr(ev), base = ev.oprBase ? {} : null;
      if (base) { // Einstein: split the division OPRs by this event's shares so far
        const sh = oprSolve(ev, r => r[key], null), all = oprSolve(ev, r => r.score - r.foul, null);
        ev.teams.forEach(t => { base[t] = all[t] > 0 ? Math.max(0, tot[t] * sh[t] / all[t]) : 0; });
      }
      c[key] = oprSolve(ev, r => r[key] || 0, base);
    }
    return c[key];
  };
  function oprSolve(ev, val, base) {
    const teams = ev.teams, n = teams.length, idx = {};
    teams.forEach((t, i) => idx[t] = i);
    const A = []; for (let i = 0; i < n; i++) A.push(new Float64Array(n));
    const b = new Float64Array(n);
    let tot = 0, cnt = 0;
    const ms = ev.quals.filter(m => m.res).concat(ev.po ? ev.po.matches.filter(m => m.res && m.redT) : []);
    ms.forEach(mt => ['red', 'blue'].forEach(a => {
      const ts = mt.redT ? (a === 'red' ? mt.redT : mt.blueT) : mt[a];
      const sc = val(mt.res[a]);
      tot += sc; cnt += 3;
      ts.forEach(i => { b[idx[i]] += sc; ts.forEach(j => { A[idx[i]][idx[j]] += 1; }); });
    }));
    const mean = cnt ? tot / cnt : 0, lam = base ? 2.5 : 0.8;
    for (let i = 0; i < n; i++) { A[i][i] += lam; b[i] += lam * (base && base[teams[i]] != null ? base[teams[i]] : mean); }
    // Gaussian elimination
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      if (p !== c) { const t = A[c]; A[c] = A[p]; A[p] = t; const tb = b[c]; b[c] = b[p]; b[p] = tb; }
      const d = A[c][c] || 1e-9;
      for (let r = c + 1; r < n; r++) {
        const f = A[r][c] / d; if (!f) continue;
        for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
        b[r] -= f * b[c];
      }
    }
    const x = new Float64Array(n);
    for (let r = n - 1; r >= 0; r--) { let s = b[r]; for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k]; x[r] = s / (A[r][r] || 1e-9); }
    const out = {}; teams.forEach((t, i) => out[t] = Math.round(x[i] * 10) / 10);
    return out;
  }
  // Scouting view of a team (noisy for others)
  Ev.scout = function (ev, team) {
    const S = G.S;
    if (team === S.team.num) { const en = G.Robot.matchEntry(S, ev); return { cap: en.cap, look: en.look, arch: 'Your robot', noise: 0 }; }
    const e = ev.caps[team];
    const sk = G.Career.mentorSkill(S, 'strat');
    const noise = U.clamp(14 - sk / 10 - ((ev.scoutBonus || 0) + (G.Shop.superPit(S) ? 1 : 0)) * 3 - Math.min(6, (ev.rank[team] ? ev.rank[team].played : 0) * 0.5), 2, 16);
    const r = G.makeRng(hash(ev.seed, team));
    const est = {};
    ['speed', 'intake', 'scoreSpd', 'accuracy', 'endgame', 'auto', 'rel', 'push'].forEach(k => { est[k] = Math.round(U.clamp((e.cap[k] || 0) + r.norm(0, noise), 0, 100)); });
    return { cap: e.cap, est, look: e.look, arch: e.arch, noise: Math.round(noise) };
  };

  // ------------------------------------------------------------------
  // Alliance selection
  // ------------------------------------------------------------------
  Ev.initSelection = function (ev) {
    const order = Ev.rankings(ev);
    ev.sel = { round: 1, k: 0, alliances: [], pool: order.slice(), declined: [], pending: null, done: false, log: [] };
    ev.stage = 'selection';
    Ev.selStep(ev);
  };
  function inAlliance(ev, t) { return ev.sel.alliances.some(a => a.includes(t)); }
  function pickValue(ev, captainAlliance, cand, rng) {
    return Ev.pickScore(ev, captainAlliance, cand) + rng.norm(0, 3);
  }
  Ev.selStep = function (ev) {
    const sel = ev.sel, S = G.S, me = S.team.num;
    const rng = G.makeRng(hash(ev.seed, 991 + sel.log.length));
    while (!sel.done && !sel.pending) {
      const k = sel.k;
      if (!sel.alliances[k]) {
        const cap = sel.pool.find(t => !inAlliance(ev, t));
        if (cap == null) { sel.done = true; break; }
        sel.alliances[k] = [cap];
        sel.pool = sel.pool.filter(t => t !== cap);
      }
      const al = sel.alliances[k];
      const captain = al[0];
      const avail = sel.pool.filter(t => !inAlliance(ev, t) && !sel.declined.includes(t));
      if (!avail.length) { sel.done = true; break; }
      if (captain === me) { sel.pending = { type: 'pick', k }; break; }
      let best = null, bv = -1e9;
      avail.forEach(t => { const v = pickValue(ev, al, t, rng); if (v > bv) { bv = v; best = t; } });
      if (best === me) { sel.pending = { type: 'invite', k, from: captain }; break; }
      // an AI invitee that would captain an alliance itself may decline, if it can do better that way
      if (rng.chance(Ev.declineChance(ev, k, best).p)) { sel.declined.push(best); sel.log.push(best + ' declined alliance ' + (k + 1)); continue; }
      Ev.selAccept(ev, k, best);
    }
    if (sel.done) Ev.finishSelection(ev);
  };
  // How likely a team is to turn an invitation down: { p, why }. Only a team that would captain an alliance itself later in
  // the first round can (anyone else who declines sits the playoffs out). It weighs the alliance it is offered (the
  // inviting captain and itself, by OPR) against the one it could build as a captain: itself and the best team likely
  // left when its own turn comes, after every alliance before it has picked. Offered the stronger alliance it nearly
  // always accepts; offered a clearly weaker one, it often declines. (Until v2.9.8 any future captain declined one
  // invitation in five, whoever asked: the best robot at an event could be turned down three times running.)
  Ev.declineChance = function (ev, k, team) {
    const sel = ev.sel, none = { p: 0, why: '' };
    if (!sel || sel.round !== 1) return none;
    const order = sel.pool.filter(t => !inAlliance(ev, t)), seats = 8 - sel.alliances.length, pos = order.indexOf(team);
    if (pos < 0 || pos >= seats) return none; // it would not be a captain
    const O = Ev.opr(ev), str = t => Math.max(1, O[t] || 0), captain = sel.alliances[k][0];
    const caps = order.slice(0, seats), rest = order.filter(t => !caps.includes(t) && !sel.declined.includes(t)).sort((a, b) => str(b) - str(a));
    const theirPick = rest[Math.min(pos + 1, rest.length - 1)]; // this alliance picks again, then the pos alliances before its own: each takes the best left
    const asCaptain = str(team) + (theirPick != null ? str(theirPick) : 0), offered = str(captain) + str(team);
    const vals = Object.keys(O).map(t => Math.max(1, O[t])), avg = vals.length ? U.avg(vals) : 10;
    const gain = (asCaptain - offered) / avg;                    // in average teams
    const p = gain <= -0.5 ? 0 : gain <= 0 ? 0.04 : U.clamp(0.1 + 0.6 * gain, 0.1, 0.8);
    return { p, why: gain > 0 ? 'as a captain they expect a stronger alliance (OPR ' + Math.round(str(team)) + ' with ' + (theirPick != null ? Math.round(str(theirPick)) : 0) + ', against ' + Math.round(str(captain)) + ' with ' + Math.round(str(team)) + ')' : 'they wanted to captain their own alliance' };
  };
  Ev.selAccept = function (ev, k, team) {
    const sel = ev.sel;
    sel.alliances[k].push(team);
    sel.pool = sel.pool.filter(t => t !== team);
    sel.log.push('Alliance ' + (k + 1) + ' (' + sel.alliances[k][0] + ') picks ' + team);
    advanceK(ev);
  };
  function advanceK(ev) {
    const sel = ev.sel;
    if (sel.round === 1) { if (sel.k < 7) sel.k++; else { sel.round = 2; sel.k = 7; } }
    else { if (sel.k > 0) sel.k--; else sel.done = true; }
  }
  Ev.playerPick = function (ev, team) {
    const sel = ev.sel, k = sel.pending.k;
    sel.pending = null;
    const rng = G.makeRng(hash(ev.seed, 555 + sel.log.length * 7919 + team));
    const dc = Ev.declineChance(ev, k, team);
    if (rng.chance(dc.p)) {
      sel.declined.push(team); sel.log.push(team + ' declined your invitation!');
      sel.pending = { type: 'pick', k, declinedMsg: team + ' declined your invitation: ' + dc.why + '. Pick again.' };
      return false;
    }
    Ev.selAccept(ev, k, team);
    Ev.selStep(ev);
    return true;
  };
  Ev.playerRespond = function (ev, accept) {
    const sel = ev.sel, p = sel.pending, me = G.S.team.num;
    sel.pending = null;
    if (accept) Ev.selAccept(ev, p.k, me);
    else { sel.declined.push(me); sel.log.push(me + ' declined alliance ' + (p.k + 1)); }
    Ev.selStep(ev);
  };
  Ev.finishSelection = function (ev) {
    ev.alliances = ev.sel.alliances.filter(a => a && a.length >= 2);
    ev.alliances.forEach(a => {
      while (a.length < 3) {
        const t = ev.sel.pool.find(x => !ev.alliances.some(b => b.includes(x)));
        if (t == null) break;
        a.push(t); ev.sel.pool = ev.sel.pool.filter(x => x !== t);
      }
    });
    ev.alliances = ev.alliances.slice(0, 8);
    Ev.initPlayoffs(ev);
  };

  // ------------------------------------------------------------------
  // Playoffs: 8-alliance double elimination + best-of-3 finals
  // ------------------------------------------------------------------
  const BR = [
    { id: 'M1', red: { s: 1 }, blue: { s: 8 }, round: 'Upper R1' }, { id: 'M2', red: { s: 4 }, blue: { s: 5 }, round: 'Upper R1' },
    { id: 'M3', red: { s: 2 }, blue: { s: 7 }, round: 'Upper R1' }, { id: 'M4', red: { s: 3 }, blue: { s: 6 }, round: 'Upper R1' },
    { id: 'M5', red: { L: 'M1' }, blue: { L: 'M2' }, round: 'Lower R1' }, { id: 'M6', red: { L: 'M3' }, blue: { L: 'M4' }, round: 'Lower R1' },
    { id: 'M7', red: { W: 'M1' }, blue: { W: 'M2' }, round: 'Upper R2' }, { id: 'M8', red: { W: 'M3' }, blue: { W: 'M4' }, round: 'Upper R2' },
    { id: 'M9', red: { L: 'M7' }, blue: { W: 'M6' }, round: 'Lower R2' }, { id: 'M10', red: { L: 'M8' }, blue: { W: 'M5' }, round: 'Lower R2' },
    { id: 'M11', red: { W: 'M7' }, blue: { W: 'M8' }, round: 'Upper Final' }, { id: 'M12', red: { W: 'M10' }, blue: { W: 'M9' }, round: 'Lower R3' },
    { id: 'M13', red: { L: 'M11' }, blue: { W: 'M12' }, round: 'Lower Final' },
    { id: 'F', red: { W: 'M11' }, blue: { W: 'M13' }, round: 'Finals', bo3: true }
  ];
  Ev.BR = BR;
  // Through 2022: single elimination, 1 v 8 / 4 v 5 / 2 v 7 / 3 v 6, every series best of three.
  const BR_SE = [
    { id: 'QF1', red: { s: 1 }, blue: { s: 8 }, round: 'Quarterfinal 1', bo3: true }, { id: 'QF2', red: { s: 4 }, blue: { s: 5 }, round: 'Quarterfinal 2', bo3: true },
    { id: 'QF3', red: { s: 2 }, blue: { s: 7 }, round: 'Quarterfinal 3', bo3: true }, { id: 'QF4', red: { s: 3 }, blue: { s: 6 }, round: 'Quarterfinal 4', bo3: true },
    { id: 'SF1', red: { W: 'QF1' }, blue: { W: 'QF2' }, round: 'Semifinal 1', bo3: true }, { id: 'SF2', red: { W: 'QF3' }, blue: { W: 'QF4' }, round: 'Semifinal 2', bo3: true },
    { id: 'F', red: { W: 'SF1' }, blue: { W: 'SF2' }, round: 'Finals', bo3: true }
  ];
  Ev.BR_SE = BR_SE;
  Ev.isSE = ev => !!(ev && ev.fmt === 'se');
  // 2017 to 2022: Einstein is a round robin (every division champion plays every other once), and the top two play a
  // best-of-three final. Built for the number of alliances at hand.
  const RR_CACHE = {};
  function brRR(n) {
    if (RR_CACHE[n]) return RR_CACHE[n];
    const arr = []; for (let i = 0; i < n; i++) arr.push(i);
    if (n % 2) arr.push(-1);
    const N = arr.length, t = []; let k = 1;
    for (let rd = 0; rd < N - 1; rd++) {
      for (let i = 0; i < N / 2; i++) { const a = arr[i], b = arr[N - 1 - i]; if (a < 0 || b < 0) continue; t.push({ id: 'R' + k++, red: { a: rd % 2 ? b : a }, blue: { a: rd % 2 ? a : b }, round: 'Round ' + (rd + 1) }); }
      arr.splice(1, 0, arr.pop());
    }
    t.push({ id: 'F', red: { rk: 0 }, blue: { rk: 1 }, round: 'Finals', bo3: true });
    return (RR_CACHE[n] = t);
  }
  // the Festival of Champions: the two Championship winners, best of five
  const BR_F5 = [{ id: 'F', red: { s: 1 }, blue: { s: 2 }, round: 'Festival of Champions', bo3: true, need: 3 }];
  const brOf = ev => (!ev ? BR : ev.fmt === 'se' ? BR_SE : ev.fmt === 'rr' ? brRR((ev.alliances || []).length || 6) : ev.fmt === 'f5' ? BR_F5 : BR);
  Ev.isRR = ev => !!(ev && ev.fmt === 'rr');
  // round-robin table: 2 points a win, 1 a tie; total score breaks ties
  Ev.rrStandings = function (ev) {
    const n = ev.alliances.length, rows = []; for (let i = 0; i < n; i++) rows.push({ i, w: 0, l: 0, t: 0, pts: 0, score: 0, played: 0 });
    const ms = ev.po ? ev.po.matches.filter(m => m.id !== 'F') : [];
    ms.forEach(m => { if (m.winner == null) return; const g = m.games[m.games.length - 1]; rows[m.winner].w++; rows[m.winner].pts += 2; rows[m.loser].l++; rows[m.red].played++; rows[m.blue].played++; rows[m.red].score += g.red; rows[m.blue].score += g.blue; });
    const order = rows.slice().sort((p, q) => q.pts - p.pts || q.score - p.score || p.i - q.i);
    return { rows, order: order.map(r => r.i), done: ms.length > 0 && ms.every(m => m.winner != null) };
  };
  Ev.brOf = brOf;
  Ev.initPlayoffs = function (ev) {
    ev.stage = 'playoffs';
    const n = ev.alliances.length, T = brOf(ev);
    ev.po = { matches: T.map(b => ({ id: b.id, round: b.round, bo3: !!b.bo3, need: b.need || 2, red: null, blue: null, games: [], winner: null, loser: null, res: null })), done: false, finish: {} };
    ev.po.matches.forEach(m => resolveSlots(ev, m));
    // Byes when fewer than 8 alliances
    if (n < 8) ev.po.matches.forEach(m => { const b = T.find(x => x.id === m.id); if (m.red != null && m.blue == null && b.blue.s && b.blue.s > n) { m.winner = m.red; m.bye = true; } });
    ev.timeouts = {};
  };
  // Names: "Match 7" / "Quarterfinal 2" for a bracket slot; "M7" / "QF2-1" / "Final 2" for one game of it
  Ev.poRound = (ev, id) => (id === 'F' ? 'Finals' : /^M\d/.test(id) ? 'Match ' + id.slice(1) : /^R\d/.test(id) ? 'Round robin ' + id.slice(1) : ((brOf({ fmt: 'se' }).find(b => b.id === id) || {}).round || id));
  Ev.poGame = function (ev, m, played) {
    const k = played ? Math.max(1, m.games.filter(g => !g.replay).length + (m.games.length && m.games[m.games.length - 1].replay ? 1 : 0)) : m.games.filter(g => !g.replay).length + 1;
    return m.id === 'F' ? 'Final ' + k : m.bo3 ? m.id + '-' + k : m.id;
  };
  // out of the tournament: two losses (double elimination) or a lost series (single elimination); the finals loser too
  Ev.allianceOut = function (ev, i) {
    if (!ev.po) return false;
    const F = ev.po.matches.find(x => x.id === 'F');
    if (F && F.loser === i) return true;
    if (ev.fmt === 'f5') return false;
    if (ev.fmt === 'rr') { const st = Ev.rrStandings(ev); return st.done && st.order.indexOf(i) > 1; }
    if (ev.fmt === 'se') return ev.po.matches.some(m => m.loser === i);
    return ev.po.matches.filter(m => !m.bo3 && m.loser === i).length >= 2;
  };
  function slotVal(ev, spec) {
    if (spec.a != null) return spec.a < ev.alliances.length ? spec.a : null;
    if (spec.rk != null) { const st = Ev.rrStandings(ev); return st.done ? st.order[spec.rk] : null; }
    if (spec.s) return spec.s <= ev.alliances.length ? spec.s - 1 : null;
    const m = ev.po.matches.find(x => x.id === (spec.W || spec.L));
    if (!m || m.winner == null) return null;
    if (spec.W) return m.winner;
    return m.bye ? null : m.loser;
  }
  function resolveSlots(ev, m) {
    const b = brOf(ev).find(x => x.id === m.id);
    if (m.red == null) m.red = slotVal(ev, b.red);
    if (m.blue == null) m.blue = slotVal(ev, b.blue);
  }
  // Next unplayed playoff match (ready to play), simulating other alliances' matches first when told to.
  Ev.nextPlayoff = function (ev) {
    const po = ev.po;
    if (ev.fmt === 'se') { // the series of a round take turns: QF1-1, QF2-1, QF3-1, QF4-1, QF1-2, ...
      for (const rd of ['QF', 'SF', 'F']) {
        const open = po.matches.filter(m => m.id.indexOf(rd) === 0 && (resolveSlots(ev, m), m.winner == null));
        if (!open.length) continue;
        const ready = open.filter(m => m.red != null && m.blue != null);
        open.forEach(m => { if ((m.red == null) !== (m.blue == null)) { m.winner = m.red != null ? m.red : m.blue; m.bye = true; } }); // an empty side: a bye
        if (ready.length) return ready.reduce((a, b) => (b.games.length < a.games.length ? b : a));
        if (open.some(m => m.bye)) return Ev.nextPlayoff(ev);
        return null;
      }
      return null;
    }
    for (const m of po.matches) {
      resolveSlots(ev, m);
      if (m.winner != null) continue;
      if (m.red == null || m.blue == null) {
        // handle byes cascading in lower bracket
        const b = brOf(ev).find(x => x.id === m.id);
        const srcMissing = (spec) => spec.L && (() => { const s = po.matches.find(x => x.id === spec.L); return s && s.bye; })();
        if (m.red != null && m.blue == null && srcMissing(b.blue)) { m.winner = m.red; m.bye = true; continue; }
        if (m.blue != null && m.red == null && srcMissing(b.red)) { m.winner = m.blue; m.bye = true; continue; }
        continue;
      }
      return m;
    }
    return null;
  };
  Ev.playerAlliance = function (ev) { const me = G.S.team.num; return ev.alliances ? ev.alliances.findIndex(a => a.includes(me)) : -1; };
  Ev.poMatchObj = function (ev, m) {
    const g = m.games.filter(x => !x.replay).length, last = m.games[m.games.length - 1];
    return { key: 1000 + brOf(ev).findIndex(b => b.id === m.id) * 10 + m.games.length, game: g, replay: !!(last && last.replay), playoff: true, red: ev.alliances[m.red], blue: ev.alliances[m.blue], id: m.id };
  };
  // FRC playoff tiebreakers (game manuals): foul points first, then the season's auto / endgame points, and only if
  // everything is still equal is the match replayed. 2022 Hangar and 2023 Charge Station come before auto.
  Ev.TIEBREAK = year => (G.Seasons[year] && G.Seasons[year].tiebreak ? [['foul', 'foul points'], ['auto', 'auto points'], ['end', G.Seasons[year].tiebreak + ' points']] : year === 2022 || year === 2023
    ? [['foul', 'foul points'], ['end', year === 2022 ? 'Hangar points' : 'Charge Station points'], ['auto', 'auto points']]
    : [['foul', 'foul points'], ['auto', 'auto points'], ['end', ({ 2024: 'Stage', 2025: 'Barge', 2026: 'Tower' })[year] ? ({ 2024: 'Stage', 2025: 'Barge', 2026: 'Tower' })[year] + ' points' : 'endgame points']]);
  Ev.breakTie = function (ev, res) {
    if (res.winner !== 'tie') return;
    for (const [k, label] of Ev.TIEBREAK(ev.year)) {
      if (res.red[k] === res.blue[k]) continue;
      const w = res.red[k] > res.blue[k] ? 'red' : 'blue';
      res.winner = w; res.tiebreak = label; res.tieVals = { red: res.red[k], blue: res.blue[k] };
      res[w].win = 1; res[w === 'red' ? 'blue' : 'red'].win = 0;
      return;
    }
    res.replay = true; // tied on every tiebreaker
  };
  // Pit time before a playoff match, in match slots: the matches the other alliances play between two of yours in bracket
  // order (an upper-bracket winner waits longer than a lower-bracket alliance on back-to-back matches), plus the scheduled
  // break before and between finals matches. The first playoff match follows alliance selection and lunch.
  Ev.poTurnaround = function (ev) {
    if (ev.poLast == null) return 6;
    const nm = Ev.nextPlayoff(ev);
    return Math.min(8, Math.max(0, ev.matchCount - ev.poLast) + 1 + (nm && nm.id === 'F' ? 2 : 0));
  };
  Ev.applyPlayoff = function (ev, m, res) {
    const obj = Ev.poMatchObj(ev, m);
    Ev.breakTie(ev, res);
    // safety: a match tied on everything three times in a row goes to the alliance with more auto points, then the higher seed
    if (res.replay && m.games.filter(x => x.replay).length >= 2) { const w = res.red.auto !== res.blue.auto ? (res.red.auto > res.blue.auto ? 'red' : 'blue') : (m.red < m.blue ? 'red' : 'blue'); res.replay = false; res.winner = w; res.tiebreak = res.red.auto !== res.blue.auto ? 'auto points' : 'alliance seed'; res[w].win = 1; res[w === 'red' ? 'blue' : 'red'].win = 0; }
    m.games.push({ red: res.red.score, blue: res.blue.score, winner: res.winner, res, replay: !!res.replay, tb: res.tiebreak || null });
    m.res = res; m.redT = obj.red; m.blueT = obj.blue;
    ev.matchCount++;
    if (obj.red.includes(G.S.team.num) || obj.blue.includes(G.S.team.num)) { G.Career.afterPlayerMatch(G.S, ev, obj, res); ev.poLast = ev.matchCount; }
    let w = null;
    if (m.bo3) {
      const rw = m.games.filter(x => x.winner === 'red').length, bw = m.games.filter(x => x.winner === 'blue').length;
      if (rw >= (m.need || 2)) w = 'red'; else if (bw >= (m.need || 2)) w = 'blue';
    } else if (res.winner !== 'tie') w = res.winner;
    if (w) {
      m.winner = w === 'red' ? m.red : m.blue;
      m.loser = w === 'red' ? m.blue : m.red;
    }
    if (m.id === 'F' && m.winner != null) { ev.po.done = true; computeFinish(ev); }
  };
  function computeFinish(ev) {
    const get = id => ev.po.matches.find(x => x.id === id);
    const f = ev.po.finish = {};
    ev.alliances.forEach((a, i) => f[i] = 'Quarterfinalist');
    if (ev.fmt === 'rr' || ev.fmt === 'f5') {
      ev.alliances.forEach((a, i) => f[i] = 'Einstein round robin');
      const F = get('F'); f[F.loser] = 'Finalist'; f[F.winner] = 'Winner';
      return;
    }
    if (ev.fmt === 'se') {
      ['SF1', 'SF2'].forEach(id => { const x = get(id); if (x.loser != null) f[x.loser] = 'Semifinalist'; });
      const F = get('F'); f[F.loser] = 'Finalist'; f[F.winner] = 'Winner';
      return;
    }
    const F = get('F'), M13 = get('M13'), M12 = get('M12');
    ['M9', 'M10'].forEach(id => { const x = get(id); if (x.loser != null) f[x.loser] = 'Lower R2'; });
    ['M5', 'M6'].forEach(id => { const x = get(id); if (x.loser != null) f[x.loser] = 'Lower R1'; });
    if (M12.loser != null) f[M12.loser] = '4th place';
    if (M13.loser != null) f[M13.loser] = '3rd place';
    f[F.loser] = 'Finalist'; f[F.winner] = 'Winner';
  }
  Ev.simPlayoffsUntilPlayer = function (ev) {
    const pa = Ev.playerAlliance(ev);
    let m;
    while ((m = Ev.nextPlayoff(ev))) {
      if (m.red === pa || m.blue === pa) return m;
      Ev.applyPlayoff(ev, m, Ev.runHeadless(ev, Ev.poMatchObj(ev, m)));
    }
    return null;
  };
  // Losses so far in the double-elimination bracket (finals games count separately)
  Ev.playerLosses = function (ev) {
    const pa = Ev.playerAlliance(ev);
    if (pa < 0 || !ev.po) return { losses: 0, finals: 0 };
    if (ev.fmt === 'rr') { const st = Ev.rrStandings(ev), row = st.rows[pa], F = ev.po.matches.find(x => x.id === 'F'), inF = !!(F && (F.red === pa || F.blue === pa));
      if (!inF) return { rr: true, w: row.w, l: row.l, rank: st.order.indexOf(pa) + 1, n: st.rows.length, losses: row.l, finals: 0, inFinals: false }; }
    if (ev.fmt === 'se' || ev.fmt === 'f5' || ev.fmt === 'rr') { // the series you are in: games won and lost
      const cur = ev.po.matches.slice().reverse().find(m => m.red === pa || m.blue === pa) || null;
      const mine = cur && cur.red === pa ? 'red' : 'blue', w = cur ? cur.games.filter(g => !g.replay && g.winner === mine).length : 0, l = cur ? cur.games.filter(g => !g.replay && g.winner !== mine && g.winner !== 'tie').length : 0;
      return { se: true, round: cur ? cur.round : '', w, l, losses: l, finals: cur && cur.id === 'F' ? l : 0, inFinals: !!(cur && cur.id === 'F') };
    }
    const F = ev.po.matches.find(x => x.id === 'F'), side = F && F.red === pa ? 'blue' : 'red';
    return { losses: ev.po.matches.filter(m => m.loser === pa && !m.bo3).length, finals: F && (F.red === pa || F.blue === pa) ? F.games.filter(g => g.winner === side).length : 0, inFinals: !!(F && (F.red === pa || F.blue === pa)) };
  };
  Ev.playoffStatus = function (ev) {
    const pa = Ev.playerAlliance(ev);
    if (pa < 0) return 'Not in playoffs';
    const losses = ev.po.matches.filter(m => m.loser === pa && !m.bo3).length;
    if (ev.po.done) return ev.po.finish[pa];
    if (ev.fmt === 'f5') return 'Best of five';
    if (ev.fmt === 'rr') { const st = Ev.rrStandings(ev); return !st.done ? 'Round robin' : st.order.indexOf(pa) <= 1 ? 'Finals' : 'Eliminated'; }
    if (ev.fmt === 'se') { if (Ev.allianceOut(ev, pa)) return 'Eliminated'; const cur = ev.po.matches.slice().reverse().find(m => m.red === pa || m.blue === pa); return cur ? cur.round.replace(/ \d$/, 's').replace('Finalss', 'Finals') : 'Quarterfinals'; }
    return losses >= 2 ? 'Eliminated' : losses === 1 ? 'Lower bracket' : 'Upper bracket';
  };
  Ev.playerEliminated = function (ev) {
    const pa = Ev.playerAlliance(ev);
    if (pa < 0) return true;
    const f = ev.po.matches.find(x => x.id === 'F');
    if (f.winner != null) return true;
    if (ev.fmt === 'se' || ev.fmt === 'rr' || ev.fmt === 'f5') return Ev.allianceOut(ev, pa);
    return ev.po.matches.filter(m => m.loser === pa && !m.bo3).length >= 2;
  };

  // ------------------------------------------------------------------
  // Awards & finish
  // ------------------------------------------------------------------
  Ev.computeAwards = function (ev) {
    const S = G.S, rng = G.makeRng(hash(ev.seed, 4242)), me = S.team.num;
    const ps = G.Career.awardScores(S, ev);
    const winners = new Set(), list = [];
    D.AWARDS.forEach(aw => {
      if (ev.kind === 'champs' && aw.champs) return; // judged once for the whole Championship (the FIRST Impact Award is announced on Einstein)
      let best = null, bv = -1;
      ev.teams.forEach(t => {
        if (winners.has(t)) return;
        let v;
        if (t === me) { if (aw.rookie && !ps.rookie) return; v = ps[aw.id] || 0; }
        else {
          const T = S.teams[t], e = ev.caps[t];
          if (!T || !e) return;
          if (aw.rookie && T.rookie !== ev.year) return;
          const q = T.str;
          switch (aw.id) {
            case 'impact': v = T.impact; break;
            case 'ei': v = (T.impact + q) / 2; break;
            case 'ras': v = T.impact * 0.6 + q * 0.4; break;
            case 'auto': v = (e.cap.autoTier || 0) * 18 + e.cap.auto * 0.4; break;
            case 'ic': v = e.cap.vision * 0.5 + (e.cap.visionLvl || 0) * 15 + e.cap.auto * 0.3; break;
            case 'quality': v = e.cap.rel * 0.8; break;
            case 'gp': case 'spirit': case 'judges': v = 40 + rng.norm(0, 15); break;
            default: v = q * 0.9;
          }
        }
        v += rng.norm(0, aw.id === 'impact' || aw.id === 'ei' || aw.id === 'ras' ? 6 : 9); // judged awards are steadier than the rest
        if (v > bv) { bv = v; best = t; }
      });
      if (best != null) { winners.add(best); list.push({ id: aw.id, name: aw.name, team: best }); }
    });
    return list;
  };
  Ev.poolPoints = function (ev) {
    const me = G.S.team.num, n = ev.teams.length, rank = Ev.rankOf(ev, me);
    let pts = Math.round(22 - 20 * (rank - 1) / Math.max(1, n - 1));
    const pa = Ev.playerAlliance(ev);
    if (pa >= 0) {
      const pos = ev.alliances[pa].indexOf(me);
      pts += pos <= 1 ? 16 - pa : 8 - pa;
      const f = ev.po.finish[pa];
      pts += { Winner: 30, Finalist: 20, '3rd place': 13, '4th place': 7, Semifinalist: 10 }[f] || 0; // single elimination: 10 per series won
    }
    ev.awards.filter(a => a.team === me).forEach(a => { const d = D.AWARDS.find(x => x.id === a.id); pts += d ? d.pool : 5; });
    return pts;
  };
  Ev.finishEvent = function (ev) {
    const S = G.S, me = S.team.num;
    if (KIND[ev.kind].awards) ev.awards = Ev.computeAwards(ev);
    const rk = ev.rank[me];
    const pa = Ev.playerAlliance(ev);
    const finish = pa >= 0 && ev.po && ev.po.finish ? ev.po.finish[pa] : (ev.kind === 'scrimmage' ? 'Scrimmage' : 'Did not qualify for playoffs');
    let winners = [];
    if (ev.po && ev.po.done) { const F = ev.po.matches.find(x => x.id === 'F'); winners = ev.alliances[F.winner].slice(); }
    ev.result = {
      id: ev.id, name: ev.name, kind: ev.kind, week: ev.week, year: ev.year, size: ev.teams.length,
      rank: ev.kind === 'einstein' ? 0 : Ev.rankOf(ev, me), record: rk ? rk.w + '-' + rk.l + '-' + rk.t : '-', avgRP: rk && rk.played ? rk.rp / rk.played : 0,
      rpTotal: rk ? rk.rp : 0, played: rk ? rk.played : 0,
      alliance: pa >= 0 ? pa + 1 : 0, role: pa >= 0 ? ['Captain', '1st pick', '2nd pick'][ev.alliances[pa].indexOf(me)] : '',
      playoffs: pa >= 0, finish, won: finish === 'Winner', finalist: finish === 'Finalist',
      awards: ev.awards.filter(a => a.team === me).map(a => a.id), awardNames: ev.awards.filter(a => a.team === me).map(a => a.name),
      winners, pool: ev.kind === 'regional' && !ev.dist && !G.Career.wildEra(G.S) ? Ev.poolPoints(ev) : 0, opr: Ev.opr(ev)[me] || 0
    };
    ev.stage = 'done';
    G.Career.onEventDone(S, ev);
  };
})();
