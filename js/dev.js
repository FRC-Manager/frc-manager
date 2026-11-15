'use strict';
/* FRC Manager — developer balance tools. Run in the browser console: G.Dev.balTest(100) */
(function () {
  const Dev = G.Dev = {};
  Dev.balTest = function (n, years) {
    n = n || 100;
    const out = {};
    const rng = G.makeRng(42);
    const pool = G.AI.makePool(rng, 300, 99999, 2022);
    const teams = Object.values(pool);
    for (const year of (years || G.SEASON_YEARS)) {
      const res = { scores: [], rp: {}, faults: 0, robots: 0, fouls: 0, cyc: [], end: [], errs: [], elite: [], eliteRp: {} };
      for (let i = 0; i < n; i++) {
        try {
          const pick = () => G.AI.entry(teams[rng.int(0, teams.length - 1)], year, 0.95, 1, rng);
          const m = G.Engine.create({ year, red: [pick(), pick(), pick()], blue: [pick(), pick(), pick()], seed: rng.int(1, 1e9), headless: true });
          const r = G.Engine.run(m);
          res.scores.push(r.red.score, r.blue.score);
          ['red', 'blue'].forEach(a => r[a].bonus.forEach(b => { res.rp[b.key] = (res.rp[b.key] || 0) + (b.ok ? 1 : 0); }));
          r.robots.forEach(x => { res.faults += x.faults.length; res.robots++; res.fouls += x.fouls; res.cyc.push(x.cycles); res.end.push(x.end && x.end.lvl > 0 ? 1 : 0); });
        } catch (e) { res.errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]); if (res.errs.length > 3) break; }
      }
      const top = teams.slice().sort((a, b) => b.str - a.str).slice(0, 6);
      for (let i = 0; i < 10; i++) {
        const p = j => G.AI.entry(top[j], year, 1.0, 1, rng);
        const m = G.Engine.create({ year, red: [p(0), p(1), p(2)], blue: [p(3), p(4), p(5)], seed: rng.int(1, 1e9), headless: true });
        const r = G.Engine.run(m); res.elite.push(r.red.score, r.blue.score);
        ['red', 'blue'].forEach(a => r[a].bonus.forEach(b => { res.eliteRp[b.key] = (res.eliteRp[b.key] || 0) + (b.ok ? 1 : 0); }));
      }
      const s = res.scores.sort((a, b) => a - b);
      out[year] = {
        avg: Math.round(G.U.avg(s)), p10: s[Math.floor(s.length * 0.1)], p50: s[Math.floor(s.length * 0.5)], p90: s[Math.floor(s.length * 0.9)], elite: Math.round(G.U.avg(res.elite)),
        rp: Object.entries(res.rp).map(([k, v]) => k + ' ' + (v / (2 * n)).toFixed(2)).join(', '), eliteRp: Object.entries(res.eliteRp).map(([k, v]) => k + ' ' + (v / 20).toFixed(2)).join(', '),
        faults: (res.faults / res.robots).toFixed(2), fouls: (res.fouls / res.robots).toFixed(2), cyc: G.U.avg(res.cyc).toFixed(1), climb: G.U.avg(res.end).toFixed(2), errs: res.errs.join(' ; ')
      };
    }
    return out;
  };

  // Performance probe: the player's robot + 2 fixed average partners vs 3 fixed average opponents, same seeds every time.
  Dev.probe = function (S, ev, n) {
    n = n || 40;
    const prng = G.makeRng(99), pool = Object.values(G.AI.makePool(prng, 120, 99999, ev.year)).sort((a, b) => Math.abs(a.str - 50) - Math.abs(b.str - 50)).slice(0, 5);
    const ent = (t, k) => Object.assign(G.AI.entry(t, ev.year, 1, 1, G.makeRng(1000 + k)), { plan: { role: 'score' } });
    const me = Object.assign({}, G.Robot.matchEntry(S, ev), { plan: { role: 'score' } });
    let tot = 0;
    for (let i = 0; i < n; i++) {
      const m = G.Engine.create({ year: ev.year, red: [me, ent(pool[0], 1), ent(pool[1], 2)], blue: [ent(pool[2], 3), ent(pool[3], 4), ent(pool[4], 5)], seed: 5000 + i, headless: true });
      tot += G.Engine.run(m).red.score;
    }
    return tot / n;
  };

  // Fault rates per robot-match by season, split by reliability and by whether the opponents ran a defender.
  // G.Dev.faultTest(150) → { 2023: { comms, commsDead, brown, tip, ... , byRel, defended } }
  Dev.faultTest = function (n, years) {
    n = n || 150;
    const out = {}, rng = G.makeRng(11), pool = Object.values(G.AI.makePool(rng, 300, 99999, 2022));
    const kind = f => /disabled/.test(f) ? 'commsDead' : /Comms/.test(f) ? 'comms' : /Brownout/.test(f) ? 'brown' : /TIPPED/.test(f) ? 'tip' : /jam/i.test(f) ? 'jam' : /broke/.test(f) ? 'broke' : f === 'Climb failed' ? 'climbFail' : 'other';
    for (const year of (years || G.SEASON_YEARS)) {
      const c = {}, rel = { low: [0, 0], mid: [0, 0], high: [0, 0] }, dfd = { yes: [0, 0], no: [0, 0] };
      let robots = 0;
      for (let i = 0; i < n; i++) {
        const pick = () => G.AI.entry(pool[rng.int(0, pool.length - 1)], year, 0.95, 1, rng);
        const red = [pick(), pick(), pick()].map(e => Object.assign({}, e, { plan: { role: 'score' } }));
        const blue = [pick(), pick(), pick()].map(e => Object.assign({}, e, { plan: { role: 'score' } }));
        const defend = i % 2 === 0;
        if (defend) blue[0].plan = { role: 'defend' };
        const r = G.Engine.run(G.Engine.create({ year, red, blue, seed: rng.int(1, 1e9), headless: true }));
        r.robots.forEach((x, j) => {
          robots++;
          const ks = x.faults.map(kind);
          ks.forEach(k => c[k] = (c[k] || 0) + 1);
          const cap = (j < 3 ? red[j] : blue[j - 3]).cap, comm = ks.some(k => k === 'comms' || k === 'commsDead') ? 1 : 0;
          const b = cap.rel < 55 ? 'low' : cap.rel < 80 ? 'mid' : 'high';
          rel[b][0] += comm; rel[b][1]++;
          if (x.a === 'red') { const d = defend ? 'yes' : 'no'; dfd[d][0] += comm; dfd[d][1]++; }
        });
      }
      const o = {};
      Object.keys(c).forEach(k => o[k] = +(c[k] / robots).toFixed(3));
      o.commsMatchRate = Object.fromEntries(Object.entries(rel).map(([k, v]) => [k + ' (' + v[1] + ')', +(v[0] / Math.max(1, v[1])).toFixed(2)]));
      o.commsVsDefender = Object.fromEntries(Object.entries(dfd).map(([k, v]) => [k, +(v[0] / Math.max(1, v[1])).toFixed(2)]));
      out[year] = o;
    }
    return out;
  };

  // Does one defender beat three scorers? Same robots and seed, weakest robot defends vs. everyone scores.
  // G.Dev.defTest(300) → per season: margin change from defending and win rates.
  Dev.defTest = function (N, years) {
    N = N || 200;
    const out = {}, rng = G.makeRng(7), pool = Object.values(G.AI.makePool(rng, 300, 99999, 2022));
    for (const year of (years || G.SEASON_YEARS)) {
      let dSum = 0, winsD = 0, winsS = 0;
      for (let i = 0; i < N; i++) {
        const pick = () => G.AI.entry(pool[rng.int(0, pool.length - 1)], year, 0.95, 1, rng);
        const A = [pick(), pick(), pick()], B = [pick(), pick(), pick()], seed = rng.int(1, 1e9);
        const run = defend => {
          const a = A.map(e => Object.assign({}, e, { plan: { role: 'score' } }));
          if (defend) a.slice().sort((p, q) => (p.power || 0) - (q.power || 0))[0].plan = { role: 'defend' };
          const r = G.Engine.run(G.Engine.create({ year, red: a, blue: B.map(e => Object.assign({}, e, { plan: { role: 'score' } })), seed, headless: true }));
          return { margin: r.red.score - r.blue.score, win: r.red.win };
        };
        const s = run(false), d = run(true);
        dSum += d.margin - s.margin; winsD += d.win === 1 ? 1 : 0; winsS += s.win === 1 ? 1 : 0;
      }
      out[year] = { marginGain: +(dSum / N).toFixed(1), winAllScore: +(winsS / N).toFixed(2), winOneDefender: +(winsD / N).toFixed(2) };
    }
    return out;
  };

  // ---------------- fuzz testing: random player actions + invariant checks ----------------
  // G.Dev.autoplay({ fuzz: true, seed: 3 }) → log.problems lists every broken invariant (empty = all good)
  const pick = a => a[Math.floor(G.R.next() * a.length)];
  Dev.fuzzTurn = function (S, log) {
    const P = G.Parts, Rb = G.Robot, R = S.robot, D2 = G.Data, rnd = () => G.R.next();
    const tries = [];
    // shopping
    tries.push(() => { const x = pick(P.forSale(S)); if (x) P.buy(S, x.prod.id, pick([1, 2, 4, 8])); });
    tries.push(() => { const c = pick(D2.PART_CATS); const it = pick(P.items(S, c.id)); if (it) P.sell(S, c.id, it.id); });
    tries.push(() => { P.buyElem(S, pick(['q', 'h', 'f']), rnd() < 0.5); });
    tries.push(() => { S.vendorPref = pick([null, 'A', 'B']); });
    // v2.2: feeder programs and sponsor signing / undo
    tries.push(() => { const C2 = G.Career; const r = rnd(); if (r < 0.4) C2.addProgram(S, pick(Object.keys(D2.FEEDER_FOCUS))); else if (r < 0.7) { const p = pick(S.programs || []); if (p) C2.setProgramFocus(S, p.id, pick(Object.keys(D2.FEEDER_FOCUS))); } else { const p = pick(S.programs || []); if (p) C2.closeProgram(S, p.id); } });
    tries.push(() => { const C2 = G.Career; const r = rnd(); if (r < 0.3) C2.autoSponsors(S); else if (r < 0.6) { const o = pick(S.offers); if (o) C2.signSponsor(S, o.id); } else { const sp = pick(S.sponsors.filter(x => C2.canUnsign(S, x))); if (sp) C2.unsignSponsor(S, sp.id); } });
    tries.push(() => { S.testSplit = pick([0, 0.25, 0.5, 0.75, 1]); S.overtime = (S.phase === 'build' || S.phase === 'kickoff') && rnd() < 0.3; });
    if (R && R.bots) {
      const year = R.year, subs = G.Seasons[year].subs.map(sd => sd.id).filter(k => k !== 'soft');
      // design office
      tries.push(() => { const k = pick(subs), sd = G.Seasons.sub(year, k), c = pick(sd.concepts); if (c.id === 'none') Rb.setNone(S, k); else Rb.startProject(S, { type: 'build', sub: k, concept: c.id, effort: pick(['rush', 'std', 'thorough']) }); });
      tries.push(() => { const k = pick(subs.concat(['soft'])), d = Rb.des(R, k); if (d && d.ver) { const c = G.Seasons.concept(year, k, d.concept); Rb.startProject(S, { type: 'upgrade', sub: k, focus: pick(Object.keys(c.ceil)), effort: 'std', forConcept: d.concept }); } });
      tries.push(() => { Rb.startProject(S, { type: 'copy', sub: pick(subs) }); });
      tries.push(() => { Rb.startProject(S, { type: pick(['harden', 'light']), sub: pick(subs) }); });
      tries.push(() => { if (rnd() < 0.34) Rb.startFullCopy(S); else Rb.startProject(S, { type: pick(['auto', 'vision']) }); });
      tries.push(() => { if (S.robot) Rb.startProject(S, { type: 'copy', sub: 'drive', concept: pick(D2.CHASSIS_CONCEPTS), bot: Rb.other(S.robot) }); });
      tries.push(() => { const p = pick(S.projects); if (p && rnd() < 0.3) Rb.cancelProject(S, p.id); });
      tries.push(() => { const p = pick(S.projects); if (p && !Rb.isFab(p)) p.extra = Math.round(rnd() * p.need); });
      // garage
      tries.push(() => { const u = pick(Rb.allUnits(R)); if (u) Rb.place(S, u.uid, pick([0, 1])); });
      tries.push(() => { Rb.unmount(S, pick([0, 1]), pick(subs)); });
      tries.push(() => { const u = pick(R.store); if (u && rnd() < 0.4) Rb.harvest(S, u.uid); });
      tries.push(() => { Rb.setComp(S, pick([0, 1])); });
      tries.push(() => { Rb.setDrive(S, pick([0, 1])); });
    }
    const n = 1 + Math.floor(rnd() * 5);
    for (let i = 0; i < n; i++) { const f = pick(tries); try { f(); } catch (e) { log.problems = log.problems || []; log.problems.push('CRASH in action: ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' / ')); } }
  };
  Dev.fuzzEvent = function (S, log) {
    const R = S.robot; if (!R) return;
    try {
      Object.keys(R.subs).forEach(k => { const u = R.subs[k]; if (u && u.ver && k !== 'soft') u.cond = Math.max(0, u.cond - G.R.next() * 60); });
      Object.keys(R.subs).forEach(k => { if (G.Robot.spareFor(S, k)) G.Robot.swapSpare(S, k); });
      if (G.R.next() < 0.3) { const u = R.store[0]; if (u) G.Robot.harvest(S, u.uid); }
      // the garage must stay locked during the event
      if (!G.Robot.garageLock(S)) (log.problems = log.problems || []).push('garage not locked during an event');
    } catch (e) { (log.problems = log.problems || []).push('CRASH at event: ' + e.message); }
    Dev.check(S, log);
  };
  Dev.check = function (S, log) {
    const bad = m => { log.problems = log.problems || []; if (log.problems.length < 60) log.problems.push(G.Career.dateLabel(S) + ': ' + m); };
    const fin = v => typeof v === 'number' && isFinite(v);
    try {
      if (!fin(S.money)) bad('money is ' + S.money);
      if (!fin(S.fatigue) || S.fatigue < 0 || S.fatigue > 100) bad('fatigue ' + S.fatigue);
      if (!fin(S.parts.spares) || S.parts.spares < 0) bad('spares ' + S.parts.spares);
      G.Data.PART_CATS.forEach(c => {
        const n = G.Parts.count(S, c.id);
        if (n > G.Shop.partMax(S, c.id)) bad(c.id + ' over max: ' + n);
        G.Parts.items(S, c.id).forEach(it => { if (!fin(it.h) || it.h < 0 || it.h > 1) bad(c.id + ' health ' + it.h); if (!G.Parts.prod(it.p)) bad('unknown product ' + it.p); });
        if (c.kit && G.Parts.kitsUsed(S, c.id) > n) bad(c.id + ' kits used ' + G.Parts.kitsUsed(S, c.id) + ' > owned ' + n);
      });
      Object.keys(S.elem || {}).forEach(y => (S.elem[y] || []).forEach(e => { if (!(e.s > 0) || !fin(e.h)) bad('element set ' + JSON.stringify(e)); }));
      Object.keys(S.elemPre || {}).forEach(y => (S.elemPre[y] || []).forEach(e => { if (!(e.s > 0)) bad('preorder ' + JSON.stringify(e)); }));
      if (!Array.isArray(S.programs) || S.programs.length > G.Data.FEEDER_MAX || S.feeders !== S.programs.length) bad('feeder programs ' + (S.programs && S.programs.length) + ' / feeders ' + S.feeders);
      (S.programs || []).forEach(p => { if (!G.Data.FEEDER_FOCUS[p.focus] || !(p.years >= 0)) bad('program ' + JSON.stringify(p)); });
      { const sl = G.Career.sponsorSlots(S); ['title', 'grant'].forEach(k => { if (sl[k].n > sl[k].max) bad(k + ' sponsors ' + sl[k].n); }); if (sl.partner.n > 5) bad('partners ' + sl.partner.n); }
      { const ids = {}; S.sponsors.concat(S.offers).forEach(x => { if (ids[x.id]) bad('sponsor id twice ' + x.name); ids[x.id] = 1; }); }
      S.students.forEach(st => Object.keys(st.attr).forEach(k => { if (!fin(st.attr[k]) || st.attr[k] < 0 || st.attr[k] > 100) bad('student attr ' + k + ' ' + st.attr[k]); }));
      S.projects.forEach(p => { if (!fin(p.need) || p.need <= 0 || !fin(p.done) || !fin(p.cost)) bad('project ' + p.name + ' ' + p.need + '/' + p.done); });
      const R = S.robot;
      if (R) {
        if (R.subs !== R.bots[R.comp || 0].subs) bad('R.subs not linked to the competition robot');
        R.bots.forEach((b, i) => { if (b.subs.soft !== R.soft) bad('robot ' + (i + 1) + ' code not linked'); });
        const seen = {};
        R.bots.forEach((b, i) => Object.keys(b.subs).forEach(k => { const u = b.subs[k]; if (k === 'soft' || !u) return; if (u.sub !== k) bad('unit in wrong slot ' + k + ' (' + u.sub + ')'); if (u.ver) { if (seen[u.uid]) bad('unit in two places ' + u.uid); seen[u.uid] = 1; } }));
        (R.store || []).forEach(u => { if (!u.ver) bad('empty unit in storage'); if (seen[u.uid]) bad('stored unit also elsewhere ' + u.uid); seen[u.uid] = 1; });
        Object.keys(R.design).forEach(k => { if (G.Robot.storeCount(R, k) > G.Data.STORE_MAX) bad('storage over limit for ' + k); });
        G.Robot.allUnits(R).concat([R.soft]).forEach(u => { if (!fin(u.cond) || u.cond < 0 || u.cond > 100.01) bad('cond ' + u.cond); Object.keys(u.stats || {}).forEach(st => { if (!fin(u.stats[st])) bad('stat ' + st + ' ' + u.stats[st]); }); if (!fin(u.w)) bad('weight ' + u.w); });
        Object.keys(R.fam || {}).forEach(k => { const f = R.fam[k].f; if (!fin(f) || f < 0 || f > 1.0001) bad('familiarity ' + k + ' ' + f); });
        [0, 1].forEach(bi => { const cap = G.Robot.capOf(S, bi); ['speed', 'scoreSpd', 'accuracy', 'intake', 'rel', 'brown'].forEach(st => { if (!fin(cap[st])) bad('robot ' + (bi + 1) + ' cap.' + st + ' ' + cap[st]); }); });
        ['comp', 'prac'].forEach(w => { const pp = G.Parts.profile(S, w); ['motor', 'enc', 'health'].forEach(k => { if (!fin(pp[k])) bad('profile ' + w + '.' + k + ' ' + pp[k]); }); });
        const th = G.Career.testHours(S); if (!fin(th.total)) bad('test hours ' + th.total);
      }
    } catch (e) { bad('CRASH in check: ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' / ')); }
  };

  // ---- opts.max: the strongest player we can script, for balance tests: every advantage the game offers ----
  // (no outreach, every fundraiser, feeder programs: the way strong players run the money)
  // The concepts with the most expected points at their ceilings (within the weight limit), thorough builds, upgrades on
  // every subsystem toward its biggest gap, hardening when nothing is left to gain, extra hours, overtime while the team
  // is fresh, full auto and vision, pit crew and bumper projects, research and the Knowledge Base, the best mentors,
  // facilities bought as fast as the money allows, spares kept stocked and as many events as the rules allow.
  Dev.bestPicks = function (S) {
    const year = S.year, R = G.Robot, sds = G.Seasons[year].subs.filter(sd => sd.id !== 'soft');
    const ok = (sd, c) => c.id !== 'none' && !R.reqOk(S, c) && !(R.teamBuilt(S, sd.id, c) && G.Shop.lvl(S, 'cnc') < 1 && G.Shop.lvl(S, 'lathe') < 1);
    const atCeil = (sd, c) => { const st = {}; Object.keys(c.ceil).forEach(k => { st[k] = R.ceil(S, year, sd.id, c, k); }); return st; };
    const power = p => {
      const subs = { soft: { concept: 'code', ver: 3, stats: {} } };
      sds.forEach(sd => { const c = G.Seasons.concept(year, sd.id, p[sd.id]); subs[sd.id] = c && c.id !== 'none' ? { concept: c.id, ver: 3, stats: atCeil(sd, c), rel: 85, w: c.w } : { concept: 'none', ver: 0, stats: {} }; });
      const cap = G.Cap.build(year, subs, { autoTier: 3, visionLvl: 2 });
      return cap.weight > R.WEIGHT_LIMIT ? -1 : G.Cap.power(year, cap);
    };
    const pick = {}; sds.forEach(sd => { pick[sd.id] = (sd.concepts.find(c => ok(sd, c)) || sd.concepts[0]).id; });
    const swOk = sds.some(sd => sd.id === 'drive' && sd.concepts.some(c => c.id === 'swerve' && ok(sd, c) && !R.teamBuilt(S, 'drive', c)));
    for (let it = 0; it < 3; it++) sds.forEach(sd => {
      let best = pick[sd.id], bp = power(pick);
      sd.concepts.filter(c => ok(sd, c) || (c.id === 'none' && sd.optional)).forEach(c => { const v = power(Object.assign({}, pick, { [sd.id]: c.id })); if (v > bp) { bp = v; best = c.id; } });
      pick[sd.id] = best;
    });
    if (swOk) pick.drive = 'swerve'; // bought modules: the drivetrain every strong team runs (the points estimate misses agility)
    return pick;
  };
  // opts.ace (tests only): stands in for a skilled human on top of the max strategy. Before every event the robot's
  // subsystems sit at their ceilings, reliability 92 or more, and the drive team is at 95 in everything.
  Dev.ace = function (S) {
    const R = S.robot; if (!R || R.year !== S.year || !R.bots) return;
    const year = R.year, bot = R.bots[R.comp || 0];
    Object.keys(bot.subs).forEach(k => { const u = bot.subs[k]; if (!u || !u.ver || k === 'soft') return; const c = G.Seasons.concept(year, k, u.concept); if (!c || !c.ceil) return; u.stats = u.stats || {}; Object.keys(c.ceil).forEach(st => { u.stats[st] = G.Robot.ceil(S, year, k, c, st); }); u.rel = Math.max(u.rel || 0, 92); u.cond = 100; });
    R.autoTier = 3; R.visionLvl = Math.max(R.visionLvl || 0, G.Era.of(S).vision.max || 0);
    const dt = G.Career.driveTeam(S); [dt.driver, dt.operator, dt.hp].forEach(s => { if (s && s.attr) Object.keys(s.attr).forEach(k => { s.attr[k] = Math.max(s.attr[k], 95); }); });
  };
  Dev.maxTurn = function (S, log, opts) {
    const C = G.Career, R = G.Robot;
    S.settings.autoExtra = true; S.autoSpares = true;
    // opts.rich (tests only): a money floor every month, for an upper bound on what a player can do
    if (opts.rich && S.money < opts.rich) S.money = opts.rich;
    // money: every fundraiser the weekly or monthly limits allow, best pay first, and no outreach at all
    if (S.phase !== 'review' && S.phase !== 'end') D.ACTIVITIES.filter(a => a.kind === 'fund').sort((a, b) => (b.money ? b.money[1] : 0) - (a.money ? a.money[1] : 0)).forEach(a => { for (let k = 0; k < 4; k++) C.doActivity(S, a.id); });
    // feeder programs (students for later seasons): one more each offseason month the money allows, up to the most
    if (S.phase === 'off' && (S.programs || []).length < D.FEEDER_MAX && S.money > opts.reserve * 0.6) C.setFeeders(S, (S.programs || []).length + 1);
    // facilities in the offseason, cheapest first, keeping a reserve for the next season's registrations and travel
    if (S.phase === 'off') { let g = 0; while (g++ < 20) {
      const ups = D.EQUIP.map(e => ({ id: e.id, c: G.Shop.upgradeCost(S, e.id) })).filter(x => x.c != null && !G.Shop.spaceBlock(S, x.id) && S.money - x.c >= opts.reserve).sort((a, b) => a.c - b.c);
      if (!ups.length) break; G.Shop.upgrade(S, ups[0].id); }
      D.EQUIP.forEach(e => { if (G.Shop.lvl(S, e.id) && G.Shop.cond(S, e.id) < 50 && S.money > opts.reserve) G.Shop.renovate(S, e.id); }); }
    // the best mentors the budget carries (up to six, with money to spare after their fee)
    if (S.phase === 'off' && S.market && S.market.length && S.mentors.length < 6) S.market.filter(m => S.money - (m.cost || 0) >= 30000).sort((a, b) => (b.stars || 0) - (a.stars || 0)).slice(0, 1).forEach(m => C.hireMentor(S, m.id));
    // the offseason: the Knowledge Base and research, two projects at a time
    if (S.phase === 'off') { R.startProject(S, { type: 'kb' }); if (opts.code !== false) R.startProject(S, { type: 'code' }); D.RESEARCH.filter(r => !S.projects.some(p => p.rid === r.id)).sort((a, b) => a.cost - b.cost).forEach(r => { if (S.projects.filter(p => p.type === 'research').length < 2 && S.money > 15000) R.startProject(S, { type: 'research', rid: r.id }); }); }
    // Kickoff: the best concepts, built thoroughly (parts bought first)
    if (S.phase === 'kickoff') {
      G.Parts.stockUp(S, { motor: 24, enc: 10, ctrl: 2, swerve: 4, wcd: 2, gearbox: 4, camera: 2 }, opts.vendor || 'B');
      const pk = Dev.bestPicks(S); log.picks = log.picks || {}; log.picks[S.year] = pk;
      Object.keys(pk).forEach(k => { if (pk[k] === 'none') { R.setNone && R.setNone(S, k); return; } const e = R.startProject(S, { type: 'build', sub: k, concept: pk[k], effort: 'thorough' }); if (e) R.startProject(S, { type: 'build', sub: k, concept: pk[k], effort: 'std' }); });
    }
    if ((S.phase === 'build' || S.phase === 'comp') && S.robot && S.robot.year === S.year) {
      const Rb = S.robot, year = Rb.year;
      if (S.phase === 'build' && (S.fatigue == null ? 30 : S.fatigue) < 40) S.overtime = true;
      if (Rb.autoTier < 3) R.startProject(S, { type: 'auto' });
      R.startProject(S, { type: 'vision' });
      if (S.phase === 'comp' || S.week >= 4) { R.startProject(S, { type: 'pit' }); R.startProject(S, { type: 'bumper' }); }
      // upgrades toward each subsystem's biggest gap; hardening once there is little left to gain
      const ks = G.Seasons[year].subs.map(sd => sd.id).filter(k => { const d = R.des(Rb, k); return d && d.ver && !S.projects.some(p => p.sub === k && p.type !== 'copy'); });
      ks.map(k => { const d = R.des(Rb, k), c = G.Seasons.concept(year, k, d.concept), g = Object.keys(c.ceil).map(st => ({ st, g: R.ceil(S, year, k, c, st) - (d.stats[st] || 0) })).sort((a, b) => b.g - a.g)[0]; return { k, c, d, g }; })
        .sort((a, b) => (b.g ? b.g.g : 0) - (a.g ? a.g.g : 0))
        .forEach(x => { if (x.g && x.g.g > 2) R.startProject(S, { type: 'upgrade', sub: x.k, focus: x.g.st, effort: 'thorough', forConcept: x.c.id }); else if (x.k !== 'soft' && (x.d.rel || 0) < 90) R.startProject(S, { type: 'harden', sub: x.k }); });
    }
  };

  // Plays a whole career automatically (no UI). Returns a log of key facts. G.Dev.autoplay({profile:'established'})
  Dev.autoplay = function (opts) {
    opts = opts || {};
    const log = [];
    const C = G.Career, S0 = opts.resume ? G.S : C.newGame({ mode: opts.mode || 'career', team: { num: 4321, name: 'Test Bots', school: 'Test HS', c1: '#f5b800', c2: '#111111', region: opts.region || 'Midwest', home: opts.home || null },
      profile: opts.profile || 'established', diff: opts.diff || 'normal', order: opts.order || 'real', year: opts.year || 2024, scenario: opts.scenario || null, seed: opts.seed, start: opts.start, cal: opts.cal, games: opts.games, fantasy: opts.fantasy, shuffle: opts.shuffle, noWorld: opts.noWorld, settings: opts.settings });
    const S = G.S;
    if (opts.max) { if (opts.reserve == null) opts.reserve = 25000; if (opts.robot2 == null) opts.robot2 = 3; if (opts.copies == null) opts.copies = true; }
    let guard = 0;
    log.probes = []; log.testSpend = 0;
    const playEvent = () => {
      const ev = S.event;
      if (opts.fuzz) Dev.fuzzEvent(S, log);
      ev.watchSel = false; // the autoplay does not watch alliance selection
      if (ev.mconf && !ev.mconf.done) [0, 1, 2, 3].forEach(i => C.summitListen(S, ev, i)); // Summit Champs: the first talks
      G.Ev.skipPractice(ev);
      if (S.robot) { const f = G.Robot.famAvg(S.robot, S.robot.comp || 0); log.famSum = (log.famSum || 0) + (f || 0); log.famN = (log.famN || 0) + 1; }
      if (opts.probe && ev.kind === 'regional') { const p = Dev.probe(S, ev); log.probes.push(p); log.push('  probe ' + ev.name + ': alliance avg ' + p.toFixed(1) + ' · conf ' + ev.conf.toFixed(2) + ' tune ' + ev.tune.toFixed(2) + ' cond ' + Math.round(G.Robot.condAvg(S)) + ' arrival ' + (ev.arrival ? ev.arrival.cond : '-') + ' fam ' + Math.round(100 * (G.Robot.famAvg(S.robot, S.robot.comp || 0) || 0))); }
      if (ev.stage === 'quals') G.Ev.simRestQuals(ev);
      let g2 = 0;
      while (ev.stage === 'selection' && g2++ < 50) {
        const p = ev.sel.pending;
        if (!p) break;
        if (p.type === 'invite') G.Ev.playerRespond(ev, true);
        else { const opr = G.Ev.opr(ev); const avail = ev.sel.pool.filter(t => !ev.sel.alliances.some(a => a && a.includes(t)) && !ev.sel.declined.includes(t) && t !== S.team.num).sort((a, b) => (opr[b] || 0) - (opr[a] || 0)); G.Ev.playerPick(ev, avail[0]); }
      }
      if (ev.stage === 'playoffs') { let m; let g3 = 0; while ((m = G.Ev.nextPlayoff(ev)) && g3++ < 40) { if (G.Ev.hasPlayer(G.Ev.poMatchObj(ev, m))) G.Career.beforePlayerMatch(S, ev); G.Ev.applyPlayoff(ev, m, G.Ev.runHeadless(ev, G.Ev.poMatchObj(ev, m))); } if (ev.po.done && ev.stage !== 'done') G.Ev.finishEvent(ev); }
      log.push(S.year + ' ' + ev.name + ': ' + (ev.result ? ev.result.finish + ' rank ' + ev.result.rank + ' awards ' + ev.result.awardNames.join('/') : ev.stage));
      C.leaveEvent(S);
    };
    while (S.phase !== 'end' && guard++ < 400) {
      if (opts.fuzz) { Dev.fuzzTurn(S, log); Dev.check(S, log); }
      if (opts.until && opts.until(S)) break; // stop early, e.g. to inspect a mid-season state in the UI
      if (S.lostYear && S.lostYear.stage === 'choose') { const e = C.pandemicChoose(S, opts.pandemic || ['remote', 'skills']); if (e) { log.push('PROBLEM pandemic choice: ' + e); break; } log.push('2021: season cancelled (' + S.lostYear.picks.join(' + ') + ')'); }
      if (S.loyalOffer && S.loyalOffer.stage === 'choose') { const O = S.loyalOffer, pk = opts.loyal || ['voucher', 'pack', 'sale'][(S.loyalLog || []).length % 3]; G.Parts.loyalChoose(S, pk); log.push(G.Career.cy(S) + ' loyalty: ' + G.Data.VENDORS[O.brand].name + ' level ' + O.lvl + ' → ' + pk); }
      if (S.prizeOffer && S.prizeOffer.stage === 'choose') { const O = S.prizeOffer, pk = opts.prize || ['voucher', 'pack', 'sale'][(S.prizeLog || []).length % 3]; G.Parts.prizeChoose(S, pk); log.push(G.Career.cy(S) + ' prize: ' + O.name + ' (' + (O.place === 1 ? 'first' : 'second') + ') → ' + pk); }
      { const ch = G.Career.chalNow(S); if (ch && opts.chal !== false) G.Robot.startProject(S, { type: 'vchal', ch: ch.id }); } // vendor challenges (3.1.3)
      if (S.districtOffer && S.districtOffer.stage === 'choose') { const O = S.districtOffer; C.districtChoose(S, !!opts.join); log.push(O.cy + ': the ' + O.id + ' district forms; the team ' + (opts.join ? 'joins' : 'stays regional')); }
      // decisions each turn
      if (S.phase === 'off' && D.MONTHS[S.month] === 'Oct' || (S.mode === 'single' && S.phase === 'kickoff')) {
        S.offers.filter(o => o.slot === 'title').slice(0, 1).forEach(o => C.signSponsor(S, o.id, true));
        S.offers.filter(o => o.slot !== 'title').slice(0, 3).forEach(o => C.signSponsor(S, o.id, true));
        // (3.5) like a sensible player, the script does not cross an ocean for a regional when one is nearer: events
        // overseas only when nothing else can be entered, and then a single one
        const seas = r => D.travelTier(S.team.region, r.region, r.local) === 'intl', open = S.regionals.filter(r => !r.full), near = open.filter(r => !seas(r)), far = open.filter(seas);
        if (opts.max) { const wk = []; near.sort((a, b) => a.week - b.week).forEach(r => { if (!wk.some(w => Math.abs(w - r.week) < 2) && !C.register(S, r.id)) wk.push(r.week); }); } // as many events as allowed, a week apart
        else { const regs = near.filter(r => [2, 4].includes(r.week));
        [2, 4].forEach(w => { const r = regs.find(x => x.week === w); if (r) C.register(S, r.id); });
        if (!S.registered.length && near.length) C.register(S, near[0].id); }
        if (!S.registered.length && far.length) C.register(S, far.sort((a, b) => D.goW(S.team.region, b.region) - D.goW(S.team.region, a.region))[0].id);
        if (S.market.length && S.mentors.length < 6) C.hireMentor(S, S.market[0].id);
      }
      if (S.phase === 'off' && S.robot && D.MONTHS[S.month] === 'Jul' && !S.offReg.length) C.registerOffseason(S, 'os_jul');
      if (S.phase === 'off' && S.robot && S.summit && S.summit.inv === C.cy(S) && !S.offReg.includes('os_summit') && ['Aug', 'Sep'].includes(D.MONTHS[S.month]) && opts.summit !== false) C.registerOffseason(S, 'os_summit'); // an invitation to Summit Champs: go
      if (C.needReg && C.needReg(S)) { const r = S.regionals.find(x => !C.canRegister(S, x)); if (r) C.register(S, r.id); } // nothing registered by December: the season cannot start without an event
      if (S.phase === 'off' && S.projects.length < 2) { const r = D.RESEARCH.find(x => !S.projects.some(p => p.rid === x.id)); G.Robot.startProject(S, { type: 'research', rid: r.id }); }
      // parts: stock up before Kickoff (and top up at Kickoff), like a sensible player
      if ((S.phase === 'off' && D.MONTHS[S.month] === 'Dec') || S.phase === 'kickoff') G.Parts.stockUp(S, opts.stock || { motor: 16, enc: 6, ctrl: 1, swerve: 4, wcd: 2, gearbox: 4 }, opts.vendor || 'B');
      // opts.copy ('any' or 'bp'): wait for that published design, copy it from Build Week 2 (when it is out; what waits for
      // a project slot or parts is tried again every week), and build the subsystems it leaves out
      const refCopy = opts.copy && S.cal ? D.REFBOTS.find(r => r.id === opts.copy && C.cy(S) >= r.from && r.picks[S.year]) : null;
      if (S.phase === 'build' && S.week >= D.REF_WEEK && refCopy) {
        const picks = refCopy.picks[S.year], left = Object.keys(picks).filter(k => !(S.robot.design[k] && S.robot.design[k].ver) && !S.projects.some(p => p.sub === k && p.type !== 'copy'));
        if (left.length) { const r = G.Robot.buildRef(S, refCopy.id); log.copied = log.copied || {}; log.copied[S.year] = (log.copied[S.year] || 0) + r.started.length;
          if (r.started.length || S.week === D.REF_WEEK) log.push('  copied the ' + refCopy.name + ' ' + C.cy(S) + ' (week ' + S.week + '): ' + r.started.join(', ') + (r.skipped.length ? ' (skipped ' + r.skipped.join('; ') + ')' : '')); }
        G.Seasons[S.year].subs.forEach(sd => {
          if (picks[sd.id] || sd.id === 'soft' || sd.optional || (S.robot.design[sd.id] && S.robot.design[sd.id].ver) || S.projects.some(p => p.sub === sd.id)) return;
          const cs = sd.concepts.filter(c => c.id !== 'none' && !G.Robot.reqOk(S, c)), c = cs[Math.min(cs.length - 1, 2)] || cs[0];
          G.Robot.startProject(S, { type: 'build', sub: sd.id, concept: c.id, effort: 'std' });
        });
      }
      if (S.phase === 'kickoff' && !opts.max) {
        G.Seasons[S.year].subs.forEach(sd => {
          if (sd.id === 'soft' || sd.optional || refCopy) return;
          const cs = sd.concepts.filter(c => c.id !== 'none' && !G.Robot.reqOk(S, c));
          const c = cs[Math.min(cs.length - 1, 2)] || cs[0];
          const e = G.Robot.startProject(S, { type: 'build', sub: sd.id, concept: c.id, effort: 'std' });
          if (e) log.push('build fail ' + sd.id + ': ' + e);
        });
      }
      if (S.phase === 'build' && S.week === 1 && C.wfaPick && G.World.on(S) && !(S.season && S.season.wfa) && !S.projects.some(p => p.type === 'wfa')) G.Robot.startProject(S, { type: 'wfa' }); // the Woodie Flowers essay, for the strongest nomination
      if ((S.phase === 'build' || S.phase === 'comp') && S.robot) {
        const R = S.robot, subs = G.Seasons[R.year].subs.filter(sd => !sd.minor).map(sd => sd.id).filter(k => G.Robot.des(R, k) && G.Robot.des(R, k).ver && !S.projects.some(p => p.sub === k && p.type !== 'copy'));
        if (!opts.max) subs.slice(0, 2).forEach(k => { const c = G.Seasons.concept(R.year, k, G.Robot.des(R, k).concept); G.Robot.startProject(S, { type: 'upgrade', sub: k, focus: Object.keys(c.ceil)[0], effort: 'std', forConcept: c.id }); });
        // chassis: build a test chassis ('kit', 'mec' or 'wcd') on the second robot in build week 1-2 (log.chassis records when)
        if (opts.chassis && S.phase === 'build' && S.week <= 3 && !S.projects.some(p => p.type === 'copy' && p.sub === 'drive')) {
          const o = G.Robot.other(R), d2 = R.bots[o].subs.drive;
          if (!(d2 && d2.ver) && !(log.chassisY || {})[S.year]) {
            const e = G.Robot.startProject(S, { type: 'copy', sub: 'drive', concept: opts.chassis, bot: o });
            if (!e) { (log.chassisY = log.chassisY || {})[S.year] = S.week; } else if (S.week === 3) log.push('  chassis fail ' + S.year + ': ' + e);
          }
        }
        // robot2: build a second robot from build week `robot2` (a number, default 3) and keep it current with copies
        if (opts.robot2 && S.phase === 'build' && S.week >= (typeof opts.robot2 === 'number' ? opts.robot2 : 3)) {
          const nc = G.Parts.need(S).comp, dbl = {};
          Object.keys(nc).forEach(k => { if (k !== 'camera') dbl[k] = nc[k] * 2 + (k === 'ctrl' ? 0 : 1); });
          if (!G.Robot.twoBots(S) && !S.projects.some(p => p.type === 'copy' && p.bot === G.Robot.other(R)) && G.Robot.fullCopySubs(R).length && R.design.drive.ver) {
            log.r2spend = (log.r2spend || 0) + G.Parts.stockUp(S, dbl, opts.vendor || 'B');
            const e = G.Robot.startFullCopy(S); if (e) log.push('  robot2 fail: ' + e); else log.push('  robot2 started ' + S.year + ' wk ' + S.week);
          }
          if (opts.copies && G.Robot.twoBots(S)) Object.keys(R.design).forEach(k => { if (!G.Robot.isLatest(R, k, R.bots[G.Robot.other(R)].subs[k]) && R.design[k].ver) G.Robot.startProject(S, { type: 'copy', sub: k }); });
          if (opts.drive2 && G.Robot.twoBots(S)) R.drive = G.Robot.other(R);
        }
        if (S.robot.autoTier < 2) G.Robot.startProject(S, { type: 'auto' });
      }
      if (S.phase === 'review' && !log['rv' + S.year]) {
        log['rv' + S.year] = 1;
        const lv = D.EQUIP.reduce((s, e) => s + G.Shop.lvl(S, e.id), 0), mx = D.EQUIP.reduce((s, e) => s + e.levels.length, 0);
        log.push(S.year + ' review: money ' + S.money + ', facility levels ' + lv + '/' + mx + ', impact rating ' + Math.round(C.impactRating(S).score));
      }
      // grind: a player who maxes outreach, fundraising and facility spending every turn (economy / Impact tests)
      if ((opts.grind === true || (opts.grind === 'off' && S.phase === 'off')) && S.phase !== 'review' && S.phase !== 'end') { // 'off': fundraising and facilities in the offseason only
        D.ACTIVITIES.slice().sort((a, b) => (b.kind === 'outreach') - (a.kind === 'outreach')).forEach(a => { for (let k = 0; k < 4; k++) if (a.kind === 'outreach' || C.fundFatigue(S, a.id) > 0.3) C.doActivity(S, a.id); });
        if (!S.season.impactDone && !S.projects.some(p => p.type === 'impact')) G.Robot.startProject(S, { type: 'impact' });
        if (S.feeders < 3 && S.money > 5000) C.setFeeders(S, 3);
        let g4 = 0;
        while (g4++ < 20) {
          const ups = D.EQUIP.map(e => ({ id: e.id, c: G.Shop.upgradeCost(S, e.id) })).filter(x => x.c != null && !G.Shop.spaceBlock(S, x.id) && S.money - x.c >= (opts.reserve == null ? 25000 : opts.reserve)).sort((a, b) => a.c - b.c);
          if (!ups.length) break;
          G.Shop.upgrade(S, ups[0].id);
        }
        D.EQUIP.forEach(e => { if (G.Shop.lvl(S, e.id) && G.Shop.cond(S, e.id) < 50 && S.money > 20000) G.Shop.renovate(S, e.id); });
      }
      // split: test the testing-hours split (free practice field + game elements, spares kept stocked)
      if (opts.split != null) {
        if (G.Shop.lvl(S, 'pfield') < (opts.field || 1)) { S.shop.pfield.lvl = opts.field || 1; S.shop.pfield.cond = 100; }
        if (S.phase !== 'off' && !G.Parts.elemCov(S, S.year)) S.elem[S.year] = [{ id: 'dev', s: 1, h: 1 }];
        if (opts.practiceBot && S.robot && S.robot.year === S.year && !G.Robot.twoBots(S) && S.robot.design.drive.ver) G.Robot.fullCopySubs(S.robot).forEach(k => G.Robot.complete(S, { type: 'copy', sub: k, bot: G.Robot.other(S.robot), concept: S.robot.design[k].concept, need: 1 }));
        S.shop.pfield.cond = 100;
        S.testSplit = opts.split;
        if (S.parts.spares < 4 && S.money > 2000) C.buySpares(S, 4);
      }
      if (opts.max) Dev.maxTurn(S, log, opts);
      G.Career.dueActivities(S).forEach(a => C.resolveActivity(S, a.id, 'hours'));
      if (S.incident) { if (G.Shop.resolve(S, G.R.int(0, S.incident.opts.length - 1))) G.Shop.resolve(S, 0); }
      const ev = C.eventThisTurn(S);
      if (ev && ev.def) {
        if (ev.def.kind === 'champs') C.registerChamps(S);
        if (ev.def.kind === 'regional') { const ir = C.impactRating(S); log.push('  impact rating ' + Math.round(ir.score) + (ir.submitted ? '' : ' (no submission)') + ', odds ' + Math.round(100 * C.impactOdds(S, ev.def, ir)) + '%'); }
        if (opts.ace) Dev.ace(S);
        C.startEvent(S, ev.def); playEvent(); continue;
      }
      const before = C.dateLabel(S);
      let err;
      try { err = C.advance(S); } catch (e) { log.push('CRASH in advance at ' + before + ': ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' / ')); log.crash = true; break; }
      if (opts.fuzz) Dev.check(S, log);
      if (err) { log.push('blocked at ' + before + ': ' + err.join(' ')); break; }
    }
    if (log.famN) log.push('avg familiarity at events ' + Math.round(100 * log.famSum / log.famN) + '%' + (log.r2spend ? ' · robot2 parts $' + Math.round(log.r2spend) : ''));
    log.push('END phase=' + S.phase + ' money=' + S.money + ' legacy=' + S.legacy + ' support=' + S.support + ' turns=' + guard);
    S.history.forEach(hs => log.push(hs.year + ': legacy ' + hs.legacy + ', money ' + hs.money + ', earned ' + hs.earned + ', spent ' + hs.spent + ', champs ' + hs.champs + ', avgRP ' + hs.avgRP.toFixed(2) + ', outreach ' + hs.impactRaw + ', awards ' + hs.awards.join('/')));
    log.push('facilities ' + D.EQUIP.map(e => e.id + ' ' + G.Shop.lvl(S, e.id) + '/' + e.levels.length).join(', ') + ' · slots ' + G.Robot.slotText(S));
    return log;
  };
  const D = G.Data;
})();
