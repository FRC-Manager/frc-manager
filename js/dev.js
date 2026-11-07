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

  // Plays a whole career automatically (no UI). Returns a log of key facts. G.Dev.autoplay({profile:'established'})
  Dev.autoplay = function (opts) {
    opts = opts || {};
    const log = [];
    const C = G.Career, S0 = C.newGame({ mode: opts.mode || 'career', team: { num: 4321, name: 'Test Bots', school: 'Test HS', c1: '#f5b800', c2: '#111111', region: 'Midwest' },
      profile: opts.profile || 'established', diff: 'normal', order: opts.order || 'real', year: opts.year || 2024, scenario: opts.scenario || null, seed: opts.seed });
    const S = G.S;
    let guard = 0;
    log.probes = []; log.testSpend = 0;
    const playEvent = () => {
      const ev = S.event;
      G.Ev.skipPractice(ev);
      if (opts.probe && ev.kind === 'regional') { const p = Dev.probe(S, ev); log.probes.push(p); log.push('  probe ' + ev.name + ': alliance avg ' + p.toFixed(1) + ' · conf ' + ev.conf.toFixed(2) + ' tune ' + ev.tune.toFixed(2) + ' cond ' + Math.round(G.Robot.condAvg(S)) + ' arrival ' + (ev.arrival ? ev.arrival.cond : '-')); }
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
        const subs = Object.keys(S.robot.subs).filter(k => S.robot.subs[k].ver && !S.projects.some(p => p.sub === k));
        subs.slice(0, 2).forEach(k => { const c = G.Seasons.concept(S.robot.year, k, S.robot.subs[k].concept); G.Robot.startProject(S, { type: 'upgrade', sub: k, focus: Object.keys(c.ceil)[0], effort: 'std', forConcept: c.id }); });
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
        if (S.phase !== 'off' && S.equip.field !== S.year) S.equip.field = S.year;
        if (opts.practiceBot && S.robot) S.robot.practiceBot = true;
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
      const err = C.advance(S);
      if (err) { log.push('blocked at ' + before + ': ' + err.join(' ')); break; }
    }
    log.push('END phase=' + S.phase + ' money=' + S.money + ' legacy=' + S.legacy + ' support=' + S.support + ' turns=' + guard);
    S.history.forEach(hs => log.push(hs.year + ': legacy ' + hs.legacy + ', money ' + hs.money + ', earned ' + hs.earned + ', spent ' + hs.spent + ', champs ' + hs.champs + ', avgRP ' + hs.avgRP.toFixed(2) + ', outreach ' + hs.impactRaw + ', awards ' + hs.awards.join('/')));
    log.push('facilities ' + D.EQUIP.map(e => e.id + ' ' + G.Shop.lvl(S, e.id) + '/' + e.levels.length).join(', ') + ' · slots ' + G.Robot.slotText(S));
    return log;
  };
  const D = G.Data;
})();
