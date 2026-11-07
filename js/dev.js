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

  // Plays a whole career automatically (no UI). Returns a log of key facts. G.Dev.autoplay({profile:'established'})
  Dev.autoplay = function (opts) {
    opts = opts || {};
    const log = [];
    const C = G.Career, S0 = C.newGame({ mode: opts.mode || 'career', team: { num: 4321, name: 'Test Bots', school: 'Test HS', c1: '#f5b800', c2: '#111111', region: 'Midwest' },
      profile: opts.profile || 'established', diff: 'normal', order: opts.order || 'real', year: opts.year || 2024, scenario: opts.scenario || null });
    const S = G.S;
    let guard = 0;
    const playEvent = () => {
      const ev = S.event;
      G.Ev.skipPractice(ev);
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
      G.Career.dueActivities(S).forEach(a => C.resolveActivity(S, a.id, 'hours'));
      if (S.incident) { if (G.Shop.resolve(S, G.R.int(0, S.incident.opts.length - 1))) G.Shop.resolve(S, 0); }
      const ev = C.eventThisTurn(S);
      if (ev && ev.def) {
        if (ev.def.kind === 'champs') C.registerChamps(S);
        C.startEvent(S, ev.def); playEvent(); continue;
      }
      const before = C.dateLabel(S);
      const err = C.advance(S);
      if (err) { log.push('blocked at ' + before + ': ' + err.join(' ')); break; }
    }
    log.push('END phase=' + S.phase + ' money=' + S.money + ' legacy=' + S.legacy + ' support=' + S.support + ' turns=' + guard);
    S.history.forEach(hs => log.push(hs.year + ': legacy ' + hs.legacy + ', money ' + hs.money + ', champs ' + hs.champs + ', avgRP ' + hs.avgRP.toFixed(2)));
    return log;
  };
  const D = G.Data;
})();
