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
    tries.push(() => { S.testSplit = pick([0, 0.25, 0.5, 0.75, 1]); S.overtime = (S.phase === 'build' || S.phase === 'kickoff') && rnd() < 0.3; });
    if (R && R.bots) {
      const year = R.year, subs = G.Seasons[year].subs.map(sd => sd.id).filter(k => k !== 'soft');
      // design office
      tries.push(() => { const k = pick(subs), sd = G.Seasons.sub(year, k), c = pick(sd.concepts); if (c.id === 'none') Rb.setNone(S, k); else Rb.startProject(S, { type: 'build', sub: k, concept: c.id, effort: pick(['rush', 'std', 'thorough']) }); });
      tries.push(() => { const k = pick(subs.concat(['soft'])), d = Rb.des(R, k); if (d && d.ver) { const c = G.Seasons.concept(year, k, d.concept); Rb.startProject(S, { type: 'upgrade', sub: k, focus: pick(Object.keys(c.ceil)), effort: 'std', forConcept: d.concept }); } });
      tries.push(() => { Rb.startProject(S, { type: 'copy', sub: pick(subs) }); });
      tries.push(() => { Rb.startProject(S, { type: pick(['harden', 'light']), sub: pick(subs) }); });
      tries.push(() => { Rb.startProject(S, { type: pick(['practiceBot', 'auto', 'vision']) }); });
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
        if (n > c.max) bad(c.id + ' over max: ' + n);
        G.Parts.items(S, c.id).forEach(it => { if (!fin(it.h) || it.h < 0 || it.h > 1) bad(c.id + ' health ' + it.h); if (!G.Parts.prod(it.p)) bad('unknown product ' + it.p); });
        if (c.kit && G.Parts.kitsUsed(S, c.id) > n) bad(c.id + ' kits used ' + G.Parts.kitsUsed(S, c.id) + ' > owned ' + n);
      });
      Object.keys(S.elem || {}).forEach(y => (S.elem[y] || []).forEach(e => { if (!(e.s > 0) || !fin(e.h)) bad('element set ' + JSON.stringify(e)); }));
      Object.keys(S.elemPre || {}).forEach(y => (S.elemPre[y] || []).forEach(e => { if (!(e.s > 0)) bad('preorder ' + JSON.stringify(e)); }));
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

  // Plays a whole career automatically (no UI). Returns a log of key facts. G.Dev.autoplay({profile:'established'})
  Dev.autoplay = function (opts) {
    opts = opts || {};
    const log = [];
    const C = G.Career, S0 = C.newGame({ mode: opts.mode || 'career', team: { num: 4321, name: 'Test Bots', school: 'Test HS', c1: '#f5b800', c2: '#111111', region: 'Midwest' },
      profile: opts.profile || 'established', diff: opts.diff || 'normal', order: opts.order || 'real', year: opts.year || 2024, scenario: opts.scenario || null, seed: opts.seed });
    const S = G.S;
    let guard = 0;
    log.probes = []; log.testSpend = 0;
    const playEvent = () => {
      const ev = S.event;
      if (opts.fuzz) Dev.fuzzEvent(S, log);
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
      // decisions each turn
      if (S.phase === 'off' && D.MONTHS[S.month] === 'Oct' || (S.mode === 'single' && S.phase === 'kickoff')) {
        S.offers.filter(o => o.slot === 'title').slice(0, 1).forEach(o => C.signSponsor(S, o.id, true));
        S.offers.filter(o => o.slot !== 'title').slice(0, 3).forEach(o => C.signSponsor(S, o.id, true));
        const regs = S.regionals.filter(r => [2, 4].includes(r.week) && !r.full);
        [2, 4].forEach(w => { const r = regs.find(x => x.week === w); if (r) C.register(S, r.id); });
        if (S.market.length && S.mentors.length < 6) C.hireMentor(S, S.market[0].id);
      }
      if (S.phase === 'off' && S.robot && D.MONTHS[S.month] === 'Jul' && !S.offReg.length) C.registerOffseason(S, 'os_jul');
      if (S.phase === 'off' && S.projects.length < 2) { const r = D.RESEARCH.find(x => !S.projects.some(p => p.rid === x.id)); G.Robot.startProject(S, { type: 'research', rid: r.id }); }
      // parts: stock up before Kickoff (and top up at Kickoff), like a sensible player
      if ((S.phase === 'off' && D.MONTHS[S.month] === 'Dec') || S.phase === 'kickoff') G.Parts.stockUp(S, opts.stock || { motor: 16, enc: 6, ctrl: 1, swerve: 4, gearbox: 2 }, opts.vendor || 'B');
      if (S.phase === 'kickoff') {
        G.Seasons[S.year].subs.forEach(sd => {
          if (sd.id === 'soft') return;
          const cs = sd.concepts.filter(c => c.id !== 'none' && !G.Robot.reqOk(S, c));
          const c = cs[Math.min(cs.length - 1, 2)] || cs[0];
          const e = G.Robot.startProject(S, { type: 'build', sub: sd.id, concept: c.id, effort: 'std' });
          if (e) log.push('build fail ' + sd.id + ': ' + e);
        });
      }
      if ((S.phase === 'build' || S.phase === 'comp') && S.robot) {
        const R = S.robot, subs = G.Seasons[R.year].subs.map(sd => sd.id).filter(k => G.Robot.des(R, k) && G.Robot.des(R, k).ver && !S.projects.some(p => p.sub === k && p.type !== 'copy'));
        subs.slice(0, 2).forEach(k => { const c = G.Seasons.concept(R.year, k, G.Robot.des(R, k).concept); G.Robot.startProject(S, { type: 'upgrade', sub: k, focus: Object.keys(c.ceil)[0], effort: 'std', forConcept: c.id }); });
        // robot2: build a second robot from build week `robot2` (a number, default 3) and keep it current with copies
        if (opts.robot2 && S.phase === 'build' && S.week >= (typeof opts.robot2 === 'number' ? opts.robot2 : 3)) {
          const nc = G.Parts.need(S).comp, dbl = {};
          Object.keys(nc).forEach(k => { if (k !== 'camera') dbl[k] = nc[k] * 2 + (k === 'ctrl' ? 0 : 1); });
          if (!G.Robot.twoBots(S) && !S.projects.some(p => p.type === 'practiceBot') && G.Robot.fullCopySubs(R).length && R.design.drive.ver) {
            log.r2spend = (log.r2spend || 0) + G.Parts.stockUp(S, dbl, opts.vendor || 'B');
            const e = G.Robot.startProject(S, { type: 'practiceBot' }); if (e) log.push('  robot2 fail: ' + e); else log.push('  robot2 started ' + S.year + ' wk ' + S.week);
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
      if (opts.grind && S.phase !== 'review' && S.phase !== 'end') {
        D.ACTIVITIES.slice().sort((a, b) => (b.kind === 'outreach') - (a.kind === 'outreach')).forEach(a => { for (let k = 0; k < 4; k++) if (a.kind === 'outreach' || C.fundFatigue(S, a.id) > 0.3) C.doActivity(S, a.id); });
        if (!S.season.impactDone && !S.projects.some(p => p.type === 'impact')) G.Robot.startProject(S, { type: 'impact' });
        if (S.feeders < 3 && S.money > 5000) C.setFeeders(S, 3);
        let g4 = 0;
        while (g4++ < 20) {
          const ups = D.EQUIP.map(e => ({ id: e.id, c: G.Shop.upgradeCost(S, e.id) })).filter(x => x.c != null && S.money - x.c >= (opts.reserve == null ? 25000 : opts.reserve)).sort((a, b) => a.c - b.c);
          if (!ups.length) break;
          G.Shop.upgrade(S, ups[0].id);
        }
        D.EQUIP.forEach(e => { if (G.Shop.lvl(S, e.id) && G.Shop.cond(S, e.id) < 50 && S.money > 20000) G.Shop.renovate(S, e.id); });
      }
      // split: test the testing-hours split (free practice field + game elements, spares kept stocked)
      if (opts.split != null) {
        if (G.Shop.lvl(S, 'pfield') < (opts.field || 1)) { S.shop.pfield.lvl = opts.field || 1; S.shop.pfield.cond = 100; }
        if (S.phase !== 'off' && !G.Parts.elemCov(S, S.year)) S.elem[S.year] = [{ id: 'dev', s: 1, h: 1 }];
        if (opts.practiceBot && S.robot && S.robot.year === S.year && !G.Robot.twoBots(S) && S.robot.design.drive.ver) G.Robot.complete(S, { type: 'practiceBot', bot: G.Robot.other(S.robot), subs: G.Robot.fullCopySubs(S.robot), need: 1 });
        S.shop.pfield.cond = 100;
        S.testSplit = opts.split;
        if (S.parts.spares < 4 && S.money > 2000) C.buySpares(S, 4);
      }
      G.Career.dueActivities(S).forEach(a => C.resolveActivity(S, a.id, 'hours'));
      if (S.incident) { if (G.Shop.resolve(S, G.R.int(0, S.incident.opts.length - 1))) G.Shop.resolve(S, 0); }
      const ev = C.eventThisTurn(S);
      if (ev && ev.def) {
        if (ev.def.kind === 'champs') C.registerChamps(S);
        if (ev.def.kind === 'regional') { const ir = C.impactRating(S); log.push('  impact rating ' + Math.round(ir.score) + (ir.submitted ? '' : ' (no submission)') + ', odds ' + Math.round(100 * C.impactOdds(S, ev.def, ir)) + '%'); }
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
