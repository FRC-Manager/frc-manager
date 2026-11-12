'use strict';
/* FRC Manager — event screens: hub, practice, quals, alliance selection, playoffs, pre-match, live match, results */
(function () {
  const U = G.U, D = G.Data, h = U.esc, UI = G.UI;
  const Ev = () => G.S.event;
  const me = () => G.S.team.num;
  const tname = n => n === me() ? G.S.team.name : (G.S.teams[n] ? G.S.teams[n].name : '');
  // "Alliance 3"; on Einstein every alliance is a division champion: "Newton · Alliance 3" (short: "Newton (A3)")
  const alName = (ev, i) => (i == null || i < 0 ? '' : (ev.kind === 'einstein' && ev.divNames && ev.divNames[i] ? ev.divNames[i] + ' · ' : '') + 'Alliance ' + (i + 1));
  const alShort = (ev, i) => (i == null || i < 0 ? '' : ev.kind === 'einstein' && ev.divNames && ev.divNames[i] ? ev.divNames[i] + ' (A' + (i + 1) + ')' : 'Alliance ' + (i + 1));
  UI.alName = alName;
  const wl = r => '<b class="' + (r.win === 1 ? 'good' : r.win === 0 ? 'bad' : 'warn') + '">' + (r.win === 1 ? 'W' : r.win === 0 ? 'L' : 'T') + '</b>';
  // What comes next for the player, shown big on the event page and next to the match buttons.
  // Quals: the match number and your alliance. Playoffs: the match, the opposing alliance and your last playoff result.
  // cur: the match on the pre-match page (omit on the event page, where the next one is looked up).
  // "Final 2": the finals game played last (a fully tied game is replayed under the same number)
  function lastFinalName(ev) {
    const F = ev.po && ev.po.matches.find(x => x.id === 'F'), g = F ? F.games : [];
    return 'Final ' + Math.max(1, g.filter(x => !x.replay).length + (g.length && g[g.length - 1].replay ? 1 : 0));
  }
  function nextStrip(ev, cur) {
    const pa = G.Ev.playerAlliance(ev);
    let main = '', side = '', last = '';
    if (cur ? !cur.playoff : ev.stage === 'quals') {
      const mt = cur || ev.quals.slice(ev.qi).find(G.Ev.hasPlayer);
      if (!mt) return '';
      const a = mt.red.includes(me()) ? 'red' : 'blue', lr = ev.playerResults[ev.playerResults.length - 1], rk = ev.rank[me()];
      main = '<span class="nx-k">' + (cur ? 'This match' : 'Next') + '</span><b class="nx-id">Q' + mt.n + '</b><span class="nx-of">of ' + ev.quals.length + '</span>';
      side = 'You are <b class="' + a + '">' + a.toUpperCase() + '</b> with ' + mt[a].filter(t => t !== me()).join(' and ') + ' · against ' + mt[a === 'red' ? 'blue' : 'red'].join(', ');
      last = (lr ? 'Last: ' + h(String(lr.id)) + ' ' + wl(lr) + ' ' + lr.our + '–' + lr.their : 'Your first match here') + (rk && rk.played ? ' · rank ' + U.ord(G.Ev.rankOf(ev, me())) + ' (' + rk.w + '-' + rk.l + '-' + rk.t + ')' : '');
    } else if (ev.po && pa >= 0 && (cur || ev.stage === 'playoffs')) {
      // on the event page, the other alliances' earlier matches are played first so the opponent is known
      const m = cur ? ev.po.matches.find(x => x.id === cur.id) : (G.Ev.playerEliminated(ev) ? null : G.Ev.simPlayoffsUntilPlayer(ev));
      if (!m) return '';
      const sd = m.red === pa ? 'red' : 'blue', opp = sd === 'red' ? m.blue : m.red;
      const lp = ev.playerResults.filter(r => !/^Q\d/.test(String(r.id))).slice(-1)[0];
      const game = m.bo3 ? (m.id === 'F' ? (ev.fmt === 'f5' ? 'Best of 5' : 'Best of 3') : h(m.round) + ' · best of 3') : h(m.round);
      main = '<span class="nx-k">' + (cur ? 'This match' : 'Next') + '</span><b class="nx-id">' + h(G.Ev.poGame(ev, m)) + '</b><span class="nx-vs">against <b>' + h(alName(ev, opp)) + '</b></span><span class="nx-of">' + game + '</span>';
      side = 'You are <b>' + h(alName(ev, pa)) + '</b> on <b class="' + sd + '">' + sd.toUpperCase() + '</b>' + (opp != null && ev.alliances[opp] ? ' · their captain: ' + ev.alliances[opp][0] + ' ' + h(tname(ev.alliances[opp][0])) : '');
      last = lp ? 'Last playoff match: ' + h(lp.id === 'F' ? lastFinalName(ev) : String(lp.id)) + ' ' + wl(lp) + ' ' + lp.our + '–' + lp.their : 'Your first playoff match';
    } else return '';
    return '<div class="nextbar' + (cur ? ' stack' : '') + '"><div class="nx-main">' + main + '</div><div class="nx-side">' + side + '</div><div class="nx-last">' + last + '</div></div>';
  }
  const tlink = (n) => '<a href="#" data-act="scoutTeam" data-arg="' + n + '" class="' + (n === me() ? 'b' : '') + '" style="' + (n === me() ? 'color:var(--accent2)' : 'color:inherit') + '">' + n + '</a>';

  // =====================================================================
  // EVENT HUB
  // =====================================================================
  // The Championship has its own look: the division's colour on its pages, gold and stars on Einstein
  function evTheme(ev) {
    if (!ev || (ev.kind !== 'champs' && ev.kind !== 'einstein')) return false;
    const col = UI.divColor(G.S.champsDiv || 'Newton'), cls = ev.kind === 'einstein' ? 'ev-einstein' : 'ev-champs';
    UI.job(() => { const mn = document.getElementById('main'); if (mn) { mn.classList.add(cls); mn.style.setProperty('--div', col); } });
    return true;
  }
  function evHero(ev, kpi) {
    const S = G.S, season = h(G.Career.seasonName(S, ev.year)).toUpperCase(), div = S.champsDiv || 'Newton';
    evTheme(ev);
    const CH = S.cal ? G.Career.champs(S) : { n: 1, city: '' }, where = CH.n > 1 ? ' · ' + h(CH.city.toUpperCase()) : '';
    if (ev.festival) { const pa0 = G.Ev.playerAlliance(ev);
      return '<div class="ehero einstein"><div class="eh-stars"></div><div class="row"><div><div class="eh-k">JULY ' + ((S.festival || S.festStream || {}).cy || '') + ' · MANCHESTER, NEW HAMPSHIRE · ' + (ev.stream ? 'LIVESTREAM' : 'THE TWO CHAMPION ALLIANCES') + '</div><div class="eh-t gold">FESTIVAL OF CHAMPIONS</div><div class="eh-s">Best of five · one champion for the year</div></div><span class="sp"></span><span class="eh-cup">' + UI.icon('trophy', 46) + '</span></div><div class="eh-divs">' +
        (ev.alliances || []).map((al, i) => '<span class="eh-div' + (i === pa0 ? ' me' : '') + '" style="--div:' + UI.divColor((ev.divNames || [])[i]) + '" title="' + h(al.map(t => t + ' ' + tname(t)).join(', ')) + '"><i></i>' + h((ev.divNames || [])[i] || '') + ' champions' + (i === pa0 ? ' · you' : '') + '</span>').join('') + '</div></div>'; }
    if (ev.kind === 'champs') return '<div class="ehero champs" style="--div:' + UI.divColor(div) + '"><div class="eh-beam"></div><div class="row"><div><div class="eh-k">FIRST CHAMPIONSHIP' + where + ' · ' + season + '</div><div class="eh-t">' + h(div.toUpperCase()) + ' DIVISION</div>' +
      '<div class="eh-s">' + ev.teams.length + ' teams · the winning alliance plays for the world title on Einstein</div></div><span class="sp"></span>' + kpi + '</div></div>';
    const F = ev.po && ev.po.matches.find(x => x.id === 'F'), pa = G.Ev.playerAlliance(ev), losses = i => (ev.po ? ev.po.matches.filter(m => !m.bo3 && m.loser === i).length : 0);
    const chips = (ev.alliances || []).map((al, i) => {
      const dn = (ev.divNames || [])[i] || 'Alliance ' + (i + 1), champ = !!(F && F.winner === i), out = !champ && G.Ev.allianceOut(ev, i);
      return '<span class="eh-div' + (champ ? ' champ' : out ? ' out' : '') + (i === pa ? ' me' : '') + '" style="--div:' + UI.divColor(dn) + '" title="' + h(al.map(t => t + ' ' + tname(t)).join(', ')) + '"><i></i>' + h(dn) + (i === pa ? ' · you' : '') + (champ ? ' ★' : '') + '</span>';
    }).join('');
    return '<div class="ehero einstein"><div class="eh-stars"></div><div class="row"><div><div class="eh-k">FIRST CHAMPIONSHIP' + where + ' · ' + season + ' · WORLD FINALS' + (ev.watch ? ' · FROM THE STANDS' : '') + '</div><div class="eh-t gold">EINSTEIN FIELD</div>' +
      '<div class="eh-s">' + ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'][(ev.alliances || []).length] + ' division champions · ' + (G.Ev.isRR(ev) ? 'round robin, then a best-of-three final' : G.Ev.isSE(ev) ? 'best-of-three series' : 'double elimination') + ' · one World Champion alliance</div></div><span class="sp"></span><span class="eh-cup">' + UI.icon('trophy', 46) + '</span></div><div class="eh-divs">' + chips + '</div></div>';
  }
  // the slim version for the match pages
  function evRibbon(ev) {
    if (!evTheme(ev)) return '';
    const div = G.S.champsDiv || 'Newton';
    return ev.kind === 'einstein' ? '<div class="eribbon einstein">' + UI.icon('trophy', 14) + (ev.festival ? ' FESTIVAL OF CHAMPIONS · MANCHESTER, NEW HAMPSHIRE' + (ev.stream ? ' · LIVESTREAM' : '') : ' EINSTEIN FIELD · WORLD FINALS') + '</div>' : '<div class="eribbon champs" style="--div:' + UI.divColor(div) + '"><i></i>' + h(div.toUpperCase()) + ' DIVISION · FIRST CHAMPIONSHIP</div>';
  }
  UI.S.event = { nav: 'event', after() { const ev = Ev(); if (!ev) return; if (ev.festival && !ev.introSeen && ev.stage !== 'done') { ev.introSeen = true; UI.festivalIntro(ev); return; } if (UI.ceremony(ev)) return; if (ev.stage === 'done' && ev.result && ev.result.won && !ev.party) { ev.party = true; UI.confetti(); } }, html() {
    const S = G.S, ev = Ev();
    if (!ev) return '<h1>Event</h1><p class="muted">No active event.</p><button class="btn" data-act="nav" data-arg="hq">Back to HQ</button>';
    const K = G.Ev.KIND[ev.kind], rk = ev.rank[me()];
    const kpi = rk && rk.played ? '<div class="kpi"><span class="v xl">' + U.ord(G.Ev.rankOf(ev, me())) + '</span><span class="l">Rank · ' + rk.w + '-' + rk.l + '-' + rk.t + ' · ' + (rk.rp / rk.played).toFixed(2) + ' RS</span></div>' : '';
    let o = ev.kind === 'champs' || ev.kind === 'einstein' ? evHero(ev, kpi)
      : '<div class="row"><div><h1>' + h(ev.name) + '</h1><div class="sub">' + h(ev.dist && ev.kind === 'regional' ? 'District event' : K.name) + (ev.week ? ' · Week ' + ev.week : '') + ' · ' + ev.teams.length + ' teams · ' + h(G.Career.seasonName(G.S, ev.year)) + '</div></div><span class="sp"></span>' + kpi + '</div>';
    const stages = ['practice', 'quals', 'selection', 'playoffs', 'done'], stage = ev.pracReview ? 'practice' : ev.stage;
    o += '<div class="row wrap mb">' + stages.filter(s => !(ev.kind === 'scrimmage' && (s === 'selection' || s === 'playoffs')) && !(ev.kind === 'einstein' && (s === 'practice' || s === 'quals' || s === 'selection'))).map(s => UI.tag(s.toUpperCase(), s === stage ? 'acc' : stages.indexOf(s) < stages.indexOf(stage) ? 'good' : '')).join(' ') + '</div>';
    if (stage === 'practice') o += practiceView(ev);
    else if (ev.stage === 'quals') o += qualsView(ev);
    else if (ev.stage === 'selection') o += selectionView(ev);
    else if (ev.stage === 'playoffs') o += playoffView(ev);
    else o += doneView(ev);
    if (ev.stage !== 'done' && S.robot && !ev.watch) o += pitCard(ev);
    if (stage !== 'practice' && ev.kind !== 'einstein') o += tabs(ev);
    return o;
  } };

  // Condition of each subsystem on the competition robot, with "swap in spare" where an identical spare is in storage
  UI.condRows = function (S) {
    const R = S.robot;
    return Object.keys(R.subs).filter(k => k !== 'soft' && R.subs[k] && R.subs[k].ver).map(k => {
      const sp = G.Robot.spareFor(S, k);
      return '<div class="row gap4">' + '<div class="sp">' + UI.stat(G.Seasons.sub(R.year, k).name, R.subs[k].cond, null, UI.colorFor(R.subs[k].cond)) + '</div>' +
        (sp ? '<button class="btn sm" data-act="swapSpare" data-arg="' + k + '" title="An identical spare (v' + sp.ver + ', ' + Math.round(sp.cond) + '%) from storage or the other robot">Swap in spare · ' + Math.round(sp.cond) + '%</button>' : '') + '</div>';
    }).join('');
  };
  UI.A.swapSpare = k => {
    const r = G.Robot.swapSpare(G.S, k);
    if (typeof r === 'string') return UI.err(r);
    UI.toast(r.name + ': spare swapped in (' + r.from + '% → ' + r.to + '%). The worn one went to ' + r.where + '.', 'good'); G.Save.write('auto'); UI.render();
  };
  // ---------------- pit crew: condition + spare parts at event prices ----------------
  function pitCard(ev) {
    const S = G.S, R = S.robot, C = G.Career;
    const up = C.spareUnitPrice(S, true), home = C.spareUnitPrice(S, false);
    const conds = UI.condRows(S);
    return '<div class="card mt"><div class="ct">Pit crew<span class="sp"></span>' + UI.tag(S.parts.spares + ' spare parts', S.parts.spares ? '' : 'bad') + '</div>' +
      '<div class="grid g2"><div>' + (conds || '<p class="muted">Nothing built yet.</p>') + '</div><div class="col">' +
      '<div class="sm muted">Before each match the pit crew repairs the robot. One spare part restores about ' + D.SPARE_COND_PER_UNIT + ' condition points. With no spares left, repairs stop at 60%.</div>' +
      '<div class="row wrap gap4">' + [2, 5, 10].map(n => '<button class="btn sm" data-act="buySparesEvent" data-arg="' + n + '">Buy ' + n + ' · ' + U.money(n * up) + '</button>').join('') + '</div>' +
      '<div class="xs muted">Event price ' + U.money(up) + ' per spare (rush delivery to the pits). Between events they cost ' + U.money(home) + ' in the Inventory tab.</div></div></div></div>';
  }
  UI.A.buySparesEvent = function (n) {
    if (UI.err(G.Career.buySpares(G.S, Number(n), true))) return;
    UI.toast('Bought ' + n + ' spare parts', 'good');
    G.Save.write('auto');
    UI.render();
  };

  function practiceView(ev) {
    const S = G.S;
    let o = '';
    if (ev.inspection && ev.inspection.notes.length) o += '<div class="warnbox mb">' + ev.inspection.notes.map(h).join('<br>') + '</div>';
    if (ev.arrival && ev.arrival.cond != null && ev.practice.used.length === 0) o += '<div class="' + (ev.arrival.cond < 99 ? 'warnbox' : 'hint') + ' mb">Robot arrived at <b>' + ev.arrival.cond + '%</b> condition.' + (ev.arrival.notes.length ? ' ' + ev.arrival.notes.map(h).join(' ') : '') + (ev.arrival.cond < 99 ? ' The pit crew can repair it between matches with spare parts.' : '') + '</div>';
    o += '<div class="grid g2"><div class="card"><div class="ct">' + (ev.pracReview ? 'Practice day complete' : 'Practice day — block ' + (ev.practice.used.length + 1) + ' of ' + ev.practice.blocks) + '</div>';
    const mustLighten = ev.inspection && !ev.inspection.ok;
    if (ev.pracReview) {
      const nm = id => id === 'auto' ? 'Auto-picked blocks' : id === 'lighten' ? 'Emergency lightening' : ((G.Ev.PRACTICE.find(x => x.id === id) || {}).name || id);
      o += '<div class="col">' + (ev.pracLog || []).map((x, i) => '<div class="sm"><b>' + (i + 1) + '. ' + h(nm(x.p)) + '</b><div class="xs muted">' + x.out.map(h).join(' ') + '</div></div>').join('') + '</div>' +
        '<div class="row mt"><span class="sp"></span><button class="btn primary" data-act="endPractice">Continue to ' + (ev.stage === 'playoffs' ? 'playoffs' : 'qualifications') + '</button></div></div>';
    } else {
    o += '<div class="col">' + (mustLighten ? '<button class="btn primary" data-act="practice" data-arg="lighten">Emergency lightening (required to pass inspection)</button>' :
      G.Ev.PRACTICE.map(p => '<button class="btn" data-act="practice" data-arg="' + p.id + '" style="text-align:left;white-space:normal"><b>' + h(p.name) + '</b> <span class="xs muted">' + h(p.desc) + (p.id === 'install' ? ' (' + (S.robot.pending.length + G.Robot.held(S).length) + ' pending' + (G.Robot.held(S).length ? ': ' + h(G.Robot.heldNames(S).join(', ')) : '') + ')' : '') + '</span></button>').join('')) + '</div>';
    o += '<div class="row mt"><span class="sp"></span><button class="btn sm" data-act="skipPractice">Auto-pick remaining blocks</button></div></div>';
    }
    o += '<div class="card"><div class="ct">Readiness</div>' + UI.stat('Robot tuning', ev.tune * 100) + UI.stat('Driver confidence', ev.conf * 100) + UI.stat('Auto bonus', ev.tuneAuto * 500) +
      UI.stat('Condition', G.Robot.condAvg(S), null, UI.colorFor(G.Robot.condAvg(S))) +
      (S.robot && G.Robot.famAvg(S.robot, S.robot.comp || 0) != null ? UI.stat('Driver familiarity', G.Robot.famAvg(S.robot, S.robot.comp || 0) * 100, null, UI.colorFor(G.Robot.famAvg(S.robot, S.robot.comp || 0) * 100)) : '') +
      '<div class="sm mt">' + UI.icon('fatigue', 14) + ' Fatigue ' + UI.fatigueBar(ev.fatigue == null ? 30 : ev.fatigue) + ' <b>' + Math.round(ev.fatigue == null ? 30 : ev.fatigue) + '</b> (' + G.Career.fatigueLabel(ev.fatigue == null ? 30 : ev.fatigue) + ') · ' + UI.icon('scout', 14) + ' scouting credibility <b>' + Math.round((ev.scoutCred || 1) * 100) + '%</b></div>' + '<div class="sm muted mt">Batteries ' + S.parts.batts.length + ' (' + Math.round(G.Shop.fleetHealth(S) * 100) + '% health) · spares ' + S.parts.spares + ' · weight ' + G.Robot.weight(S) + ' lb</div>' +
      (ev.log.length ? '<div class="hr"></div>' + ev.log.slice(-6).map(l => '<div class="sm">• ' + h(l) + '</div>').join('') : '') + '</div></div>';
    return o;
  }
  UI.A.practice = function (p) { const ev = Ev(); if (ev.stage !== 'practice') return; const out = G.Ev.doPractice(ev, p); out.forEach(x => ev.log.push(x)); (ev.pracLog = ev.pracLog || []).push({ p, out }); if (ev.stage !== 'practice') ev.pracReview = true; UI.toast(out.join(' '), 'good'); G.Save.write('auto'); UI.render(); };
  UI.A.skipPractice = function () {
    const ev = Ev(); if (ev.stage !== 'practice') return;
    const n0 = ev.log.length;
    G.Ev.skipPractice(ev);
    (ev.pracLog = ev.pracLog || []).push({ p: 'auto', out: ev.log.slice(n0) });
    ev.pracReview = true; G.Save.write('auto'); UI.render();
  };
  UI.A.endPractice = function () { const ev = Ev(); if (ev) { ev.pracReview = false; G.Save.write('auto'); UI.render(); } };

  function matchTeamsLine(mt) {
    return '<span class="pill-red">' + mt.red.map(tlink).join(' ') + '</span> vs <span class="pill-blue">' + mt.blue.map(tlink).join(' ') + '</span>';
  }
  function qualsView(ev) {
    const left = G.Ev.playerMatchesLeft(ev);
    const next = ev.quals.slice(ev.qi).find(G.Ev.hasPlayer);
    let o = '<div class="grid g2"><div class="card hl"><div class="ct">Qualification matches ' + UI.tag(left + ' left for you', 'acc') + '</div>';
    if (next) {
      const gap = ev.quals.indexOf(next) - ev.qi;
      o += nextStrip(ev) + '<div class="mb sm">' + matchTeamsLine(next) + '</div><div class="sm muted mb">' + (gap > 0 ? gap + ' other match' + (gap > 1 ? 'es' : '') + ' before yours (pit time for repairs).' : 'You\'re up next.') + '</div>' +
        '<div class="row wrap"><button class="btn primary" data-act="nextQual">Prepare match ▶</button><button class="btn" data-act="simQual">Simulate it</button><button class="btn" data-act="simAllQuals">Simulate all remaining</button></div>';
    } else o += '<p>All your qualification matches are done.</p><button class="btn primary" data-act="finishQuals">Continue</button>';
    o += '</div><div class="card"><div class="ct">Your results</div>' + resultsList(ev) + '</div></div>';
    return o;
  }
  function resultsList(ev) {
    if (!ev.playerResults.length) return '<p class="muted">No matches yet.</p>';
    return '<table class="t"><tr><th>Match</th><th class="num">Score</th><th>Result</th><th class="num">RP</th><th>Faults</th></tr>' + ev.playerResults.map(r => '<tr><td>' + h(r.id) + '</td><td class="num">' + r.our + '–' + r.their + '</td><td class="' + (r.win === 1 ? 'good' : r.win === 0 ? 'bad' : 'warn') + '">' + (r.win === 1 ? 'W' : r.win === 0 ? 'L' : 'T') + '</td><td class="num">' + (String(r.id).startsWith('Q') ? r.rp : '—') + '</td><td class="xs warn">' + h(r.faults.join(', ')) + '</td></tr>').join('') + '</table>';
  }
  function prepQual(ev, mt) { if (!mt.prepped) { G.Career.beforePlayerMatch(G.S, ev); mt.prepped = true; } UI.st.match = { kind: 'qual', mt }; }
  UI.A.nextQual = function () {
    const ev = Ev(); const mt = G.Ev.advanceQuals(ev);
    if (!mt) { UI.render(); return; }
    prepQual(ev, mt); UI.go('prematch');
  };
  UI.A.simQual = function () {
    const ev = Ev(); const mt = G.Ev.advanceQuals(ev);
    if (!mt) { UI.render(); return; }
    prepQual(ev, mt);
    const res = G.Ev.runHeadless(ev, mt);
    G.Ev.completePlayerQual(ev, res);
    UI.st.lastResult = { res, obj: mt, kind: 'qual' };
    G.Save.write('auto');
    UI.go('mresult');
  };
  UI.A.simAllQuals = function () { const ev = Ev(); G.Ev.simRestQuals(ev); G.Save.write('auto'); UI.render(); };
  UI.A.finishQuals = function () { const ev = Ev(); G.Ev.advanceQuals(ev); UI.render(); };

  // ---------------- selection ----------------
  function selectionView(ev) {
    const sel = ev.sel;
    let o = '<div class="grid ' + (sel.pending && sel.pending.type === 'pick' ? 'g12' : 'g2') + '"><div class="card"><div class="ct">Alliances</div><table class="t"><tr><th>#</th><th>Captain</th><th>1st pick</th><th>2nd pick</th></tr>';
    for (let k = 0; k < 8; k++) { const a = sel.alliances[k] || []; o += '<tr class="' + (a.includes(me()) ? 'me' : '') + '"><td>' + (k + 1) + '</td><td>' + (a[0] ? tlink(a[0]) : '') + '</td><td>' + (a[1] ? tlink(a[1]) : '') + '</td><td>' + (a[2] ? tlink(a[2]) : '') + '</td></tr>'; }
    o += '</table>' + (sel.log.length ? '<div class="xs muted mt">' + sel.log.slice(-5).map(h).join('<br>') + '</div>' : '') + '</div><div class="card hl">';
    if (sel.pending && sel.pending.type === 'invite') {
      const p = sel.pending, rank = G.Ev.rankOf(ev, p.from);
      o += '<div class="ct">Invitation!</div><p>Alliance <b>' + (p.k + 1) + '</b> captain <b>' + p.from + ' ' + h(tname(p.from)) + '</b> (ranked ' + U.ord(rank) + ', OPR ' + (G.Ev.opr(ev)[p.from] || 0) + ') invites you to join.</p><p class="sm muted">Declining means no other alliance can pick you — you only play playoffs if you become a captain yourself.</p>' +
        '<div class="row"><button class="btn primary" data-act="selRespond" data-arg="1">Accept</button><button class="btn bad" data-act="selRespond" data-arg="0">Decline</button></div>';
    } else if (sel.pending && sel.pending.type === 'pick') {
      o += '<div class="ct">Your pick — Alliance ' + (sel.pending.k + 1) + ' (' + (sel.round === 1 ? 'first' : 'second') + ' round)</div>' + (sel.pending.declinedMsg ? '<div class="warnbox mb">' + h(sel.pending.declinedMsg) + '</div>' : '') + pickTable(ev);
    } else if (sel.done) o += '<p>Alliance selection complete.</p>';
    else o += '<p class="muted">Waiting…</p>';
    o += '</div></div>';
    return o;
  }
  // ---- scouting data cells (observed in this event's qualification matches) ----
  const pctTxt = v => v == null ? '<span class="dim">—</span>' : '<span style="color:' + UI.colorFor(v * 100) + '">' + Math.round(v * 100) + '%</span>';
  const OBS_HEAD = '<th class="num" title="Points this robot scored itself, per match">Pts/m</th><th class="num" title="Matches where its autonomous routine ran as planned">Auto</th><th title="Successful endgame climbs out of attempts, and the usual level">Climb</th><th class="num" title="Matches without a breakdown, brownout, jam or comms loss (✕ = times disabled)">Fault-free</th><th class="num" title="Fouls per match">Fouls</th><th class="num" title="Matches spent playing defense">Def</th>';
  function obsCells(ev, t) {
    const o = G.Ev.obsShown(ev, t), Sz = G.Seasons[ev.year];
    if (!o) return '<td class="dim xs" colspan="6">no matches yet</td>';
    const climb = o.climbTry ? pctTxt(o.climb) + ' <span class="xs dim" title="' + (ev.year === 2023 ? 'Docks that ended Engaged' : 'Successful climbs / attempts') + '">' + Math.round((o.climb || 0) * o.climbTry) + '/' + o.climbTry + (ev.year === 2023 ? ' eng' : o.climbLvl ? ' ' + h(Sz.endNames[Math.round(o.climbLvl)] || '') : '') + '</span>' : '<span class="dim">—</span>';
    return '<td class="num">' + o.pts.toFixed(1) + '</td><td class="num">' + pctTxt(o.auto) + '</td><td class="nowrap">' + climb + '</td><td class="num">' + pctTxt(o.rel) + (o.dead ? ' <span class="xs bad" title="Disabled ' + o.dead + '×">' + o.dead + '✕</span>' : '') + '</td><td class="num">' + o.fouls.toFixed(1) + '</td><td class="num">' + (o.def || '<span class="dim">0</span>') + '</td>';
  }
  function pickTable(ev) {
    const sel = ev.sel, opr = G.Ev.opr(ev), al = sel.alliances[sel.pending.k] || [me()];
    const avail = sel.pool.filter(t => !sel.alliances.some(a => a && a.includes(t)) && !sel.declined.includes(t) && t !== me());
    const rows = avail.map(t => ({ t, sc: G.Ev.scout(ev, t), v: G.Ev.pickScore(ev, al, t, true) })).sort((a, b) => b.v - a.v);
    return '<div class="xs muted mb">Sorted by pick value: OPR discounted by breakdowns, plus auto and climb consistency, fouls, and what your alliance still needs. Hover the headers for details.</div>' +
      '<div style="max-height:440px;overflow:auto"><table class="t tight"><tr><th>Team</th><th class="num">OPR</th>' + OBS_HEAD + '<th class="num">Value</th><th></th></tr>' + rows.slice(0, 30).map((r, i) => {
      return '<tr><td class="nowrap">' + tlink(r.t) + (i < 3 ? ' ' + UI.tag('rec', 'acc') : '') + '<div class="xs muted">#' + G.Ev.rankOf(ev, r.t) + ' · ' + h(r.sc.arch || '') + '</div></td><td class="num">' + (opr[r.t] || 0) + '</td>' + obsCells(ev, r.t) + '<td class="num b">' + r.v.toFixed(1) + '</td><td><button class="btn sm primary" data-act="selPick" data-arg="' + r.t + '">Pick</button></td></tr>';
    }).join('') + '</table></div>';
  }
  UI.A.selPick = function (t) { const ev = Ev(); const ok = G.Ev.playerPick(ev, Number(t)); if (!ok) UI.toast('They declined!', 'bad'); UI.render(); };
  UI.A.selRespond = function (a) { G.Ev.playerRespond(Ev(), a === '1'); UI.render(); };

  // ---------------- playoffs ----------------
  const DIVC = { Archimedes: '#e5484d', Curie: '#ff8a3d', Daly: '#f5c542', Galileo: '#30c27a', Hopper: '#22b8c8', Johnson: '#3e8cff', Milstein: '#9b6bff', Newton: '#ff5fa2',
    Carson: '#c98a3c', Carver: '#8bc34a', Darwin: '#00bfa5', Roebling: '#b0bec5', Tesla: '#f06292', Turing: '#7986cb', Houston: '#ff8a3d', 'St. Louis': '#3e8cff', Detroit: '#3e8cff' };
  UI.divColor = d => DIVC[d] || '#8a96a3';
  // One alliance line in the bracket: on Einstein its division with the division colour, the alliance number and captain.
  // An open slot says where it is filled from ("Winner of M7"), as on the official bracket.
  function bal(ev, i, src) {
    if (i == null) return '<span class="dim">' + (src && (src.W || src.L) ? (src.W ? 'Winner of ' : 'Loser of ') + (src.W || src.L) : 'TBD') + '</span>';
    const dn = ev.kind === 'einstein' && ev.divNames && ev.divNames[i];
    if (dn) return '<span title="' + h(ev.alliances[i].map(t => t + ' ' + tname(t)).join(', ')) + '"><i class="ddot" style="background:' + UI.divColor(dn) + '"></i>' + h(dn) + ' <span class="xs muted">A' + (i + 1) + '</span></span>';
    return 'A' + (i + 1) + ' <span class="xs muted">' + ev.alliances[i][0] + '</span>';
  }
  function bmatch(ev, id) {
    const m = ev.po.matches.find(x => x.id === id), pa = G.Ev.playerAlliance(ev), B = G.Ev.brOf(ev).find(x => x.id === id) || {};
    // In a best-of-three series every game is marked on its own: the winner's score bold, the loser's dim.
    const dec = g => !g.replay && (g.winner === 'red' || g.winner === 'blue');
    const sc = (side) => m.games.map(g => '<span' + (m.bo3 && dec(g) ? ' class="' + (g.winner === side ? 'gw' : 'gl') + '"' : '') + (g.tb ? ' title="Tied: won on ' + h(g.tb) + '"' : g.replay ? ' title="Tied on every tiebreaker: replayed"' : '') + '>' + (side === 'red' ? g.red : g.blue) + (g.tb && g.winner === side ? '*' : g.replay ? 'ʳ' : '') + '</span>').join('<i class="gs"> / </i>');
    const cls = (i) => m.winner == null ? '' : m.winner === i ? 'w' : 'l';
    // ... and the box says where the series stands: "A1 wins 2–0", "A5 leads 1–0", "tied 1–1"
    const wins = side => m.games.filter(g => dec(g) && g.winner === side).length, rw = wins('red'), bw = wins('blue'), hi = Math.max(rw, bw), lo = Math.min(rw, bw);
    const an = i => (ev.kind === 'einstein' && ev.divNames && ev.divNames[i]) || 'A' + (i + 1);
    const ser = !m.bo3 || !(rw + bw) ? '' : ' · <span class="ser' + (m.winner != null ? ' done' : '') + '">' + h(m.winner != null ? an(m.winner) + ' wins ' + hi + '–' + lo : rw === bw ? 'tied ' + rw + '–' + bw : an(rw > bw ? m.red : m.blue) + ' leads ' + hi + '–' + lo) + '</span>';
    return '<div class="bm ' + (m.red === pa || m.blue === pa ? 'me' : '') + (m.winner == null && m.red != null && m.blue != null ? ' next' : '') + '"><div class="xs muted">' + h(G.Ev.poRound(ev, id)) + (m.bye ? ' (bye)' : '') + ser + '</div><div class="al ' + cls(m.red) + (m.red === pa ? ' mine' : '') + '"><span class="red">' + bal(ev, m.red, B.red) + '</span><span>' + sc('red') + '</span></div><div class="al ' + cls(m.blue) + (m.blue === pa ? ' mine' : '') + '"><span class="blue">' + bal(ev, m.blue, B.blue) + '</span><span>' + sc('blue') + '</span></div></div>';
  }
  // The finals are best of three: one box per game (Final 3 only at one win each), plus the state of the series
  function bfinals(ev) {
    const m = ev.po.matches.find(x => x.id === 'F'), pa = G.Ev.playerAlliance(ev), mine = m.red === pa || m.blue === pa, known = m.red != null && m.blue != null;
    const FB = G.Ev.brOf(ev).find(x => x.id === 'F'), al = (i, side) => bal(ev, i, FB[side]);
    const box = (label, g, note, later) => {
      const dec = g && !g.replay && (g.winner === 'red' || g.winner === 'blue');
      const row = side => '<div class="al ' + (dec ? (g.winner === side ? 'w' : 'l') : '') + (m[side] === pa ? ' mine' : '') + '"><span class="' + side + '">' + al(m[side], side) + '</span><span>' + (g ? g[side] + (g.tb && g.winner === side ? '*' : '') : '') + '</span></div>';
      return '<div class="bm ' + (mine ? 'me' : '') + (later ? ' tbd' : '') + '"><div class="xs muted">' + label + (note ? ' · ' + note : '') + '</div>' + row('red') + row('blue') + '</div>';
    };
    const wins = side => m.games.filter(g => !g.replay && g.winner === side).length, rw = wins('red'), bw = wins('blue');
    let n = 0, o = '';
    m.games.forEach(g => { if (!g.replay) n++; o += box('Final ' + (g.replay ? n + 1 : n), g, g.replay ? 'tied, replayed' : g.tb ? 'tied, won on ' + h(g.tb) : ''); });
    const need = m.need || 2, maxG = 2 * need - 1;
    if (m.winner == null) for (let k = n + 1; k <= maxG; k++) o += box('Final ' + k, null, k > need + Math.min(rw, bw) ? 'if needed' : k === n + 1 && known ? 'next' : '', k > n + 1 || !known);
    const lead = rw === bw ? null : rw > bw ? m.red : m.blue, hi = Math.max(rw, bw), lo = Math.min(rw, bw);
    // at the Festival the two sides are the two Championships, so the series is told by city
    const f5 = ev.fmt === 'f5' && ev.divNames, sn = i => f5 ? h(ev.divNames[i] || '') + ' champions' : 'A' + (i + 1), s1 = f5 ? '' : 's';
    const series = !n ? '' : '<div class="xs b mb">' + (m.winner != null ? sn(m.winner) + ' win' + s1 + ' the ' + (f5 ? 'series ' : 'finals ') + hi + '–' + lo : lead == null ? 'Series tied ' + rw + '–' + bw : sn(lead) + ' lead' + s1 + ' ' + hi + '–' + lo) + '</div>';
    return (series || '<div class="xs muted mb">' + (ev.fmt === 'f5' ? 'Best of five' : G.Ev.isRR(ev) ? 'First and second of the round robin' : G.Ev.isSE(ev) ? 'The two semifinal winners' : 'Upper bracket winner against lower bracket winner') + '</div>') + o;
  }
  // Double elimination in the official layout: rounds from left to right, the upper bracket on top, the lower bracket
  // (alliances with one loss) below, and both meet in the finals. The lines show where each winner plays next.
  // Through 2022: single elimination. Quarterfinals, semifinals and finals, every series best of three (the scores of
  // a series are listed game by game in its box, each game's winner in bold, with the state of the series beside the
  // round's name).
  // The lines of a bracket: grey until the match is decided, then lit, and in your colour where your alliance went on
  // from a win (drawn last, so they lie on top). drops: extra paths (double elimination: the way down after a loss).
  function bkLines(ev, P, drops) {
    const pa = G.Ev.playerAlliance(ev), get = id => ev.po.matches.find(x => x.id === id);
    const st = id => { const m = get(id); return !m || m.winner == null ? '' : m.winner === pa ? 'on mine' : 'on'; };
    return P.map(p => ({ c: st(p[0]), d: p[1] })).concat(drops || []).sort((a, b) => (/mine/.test(a.c) ? 1 : 0) - (/mine/.test(b.c) ? 1 : 0)).map(p => '<path class="' + p.c + '" d="' + p.d + '"/>').join('');
  }
  // Your alliance's way through the playoffs in words: one chip per match or series it plays, in bracket order
  function traceBar(ev) {
    const pa = ev.po ? G.Ev.playerAlliance(ev) : -1;
    if (pa < 0) return '';
    let upNext = false; // only the first match still to be played is "next" (in a round robin they are all known in advance)
    const steps = ev.po.matches.filter(m => m.red === pa || m.blue === pa).map(m => {
      const side = m.red === pa ? 'red' : 'blue', other = side === 'red' ? 'blue' : 'red', gs = m.games.filter(g => !g.replay && (g.winner === 'red' || g.winner === 'blue'));
      const w = gs.filter(g => g.winner === side).length, l = gs.length - w, last = gs[gs.length - 1];
      let cls = '', txt = 'to come';
      if (m.bye) { cls = 'won'; txt = 'bye'; }
      else if (m.winner != null) { const won = m.winner === pa; cls = won ? 'won' : 'lost'; txt = (won ? 'won ' : 'lost ') + (m.bo3 || !last ? w + '–' + l : last[side] + '–' + last[other]); }
      else if (gs.length) { cls = 'next'; upNext = true; txt = (w > l ? 'leading ' : w < l ? 'trailing ' : 'tied ') + w + '–' + l; }
      else if (m.red != null && m.blue != null && !upNext) { cls = 'next'; upNext = true; txt = 'next'; }
      return '<span class="tr-step ' + cls + '">' + h(G.Ev.poRound(ev, m.id)) + ' · ' + txt + '</span>';
    });
    const dn = ev.kind === 'einstein' && ev.divNames && ev.divNames[pa];
    return '<div class="bk-trace"><span class="tr-you"><i></i>' + (dn ? h(dn) + ' (your alliance)' : 'Your alliance A' + (pa + 1)) + '</span>' + steps.join('<span class="tr-arrow">→</span>') + '</div>';
  }
  function bracketSE(ev) {
    const RH = 35, H = 8 * RH, done = id => { const m = ev.po.matches.find(x => x.id === id); return m && m.winner != null; };
    const cell = (id, col, r0) => '<div class="bk-c" style="grid-column:' + col + ';grid-row:' + r0 + ' / span 2">' + bmatch(ev, id) + '</div>';
    const P = [['QF1', 'M50,35 H100 V70 H150'], ['QF2', 'M50,105 H100 V70 H150'], ['QF3', 'M50,175 H100 V210 H150'], ['QF4', 'M50,245 H100 V210 H150'], ['SF1', 'M150,70 H200 V140 H203'], ['SF2', 'M150,210 H200 V140 H203']];
    return '<div class="bk-wrap"><div class="bk se' + (ev.kind === 'einstein' ? ' ein' : '') + '">' +
      '<div class="bk-hd">' + ['Quarterfinals', 'Semifinals', 'Finals'].map(t => '<span>' + t + ' · best of 3</span>').join('') + '</div>' +
      '<div class="bk-grid" style="grid-template-rows:repeat(8,' + RH + 'px)">' +
      '<svg class="bk-lines" viewBox="0 0 300 ' + H + '" preserveAspectRatio="none" style="grid-column:1 / -1;grid-row:1 / -1" aria-hidden="true">' + bkLines(ev, P, typeof drops === 'undefined' ? null : drops) + '</svg>' +
      cell('QF1', 1, 1) + cell('QF2', 1, 3) + cell('QF3', 1, 5) + cell('QF4', 1, 7) + cell('SF1', 2, 2) + cell('SF2', 2, 6) +
      '<div class="bk-c fin" style="grid-column:3;grid-row:1 / -1">' + bfinals(ev) + '</div>' +
      '</div></div></div>';
  }
  // 2017 to 2022 on Einstein: the round-robin table, its matches round by round, and the best-of-three final
  function bracketRR(ev) {
    const st = G.Ev.rrStandings(ev), pa = G.Ev.playerAlliance(ev), ms = ev.po.matches.filter(m => m.id !== 'F'), rounds = [];
    ms.forEach(m => { let r = rounds.find(x => x.n === m.round); if (!r) rounds.push(r = { n: m.round, ms: [] }); r.ms.push(m); });
    const nm = i => bal(ev, i, null);
    const row = (i, k) => { const r = st.rows[i]; return '<tr class="' + (i === pa ? 'me' : '') + '"><td>' + (k + 1) + '</td><td>' + nm(i) + (st.done && k < 2 ? ' ' + UI.tag('final', 'acc') : '') + '</td><td class="num">' + r.w + '–' + r.l + '</td><td class="num b">' + r.pts + '</td><td class="num">' + r.score + '</td></tr>'; };
    const mrow = m => { const g = m.games[m.games.length - 1], done = m.winner != null; return '<div class="rr-m ' + (m.red === pa || m.blue === pa ? 'me' : '') + (!done && m === G.Ev.nextPlayoff(ev) ? ' next' : '') + '"><span class="red ' + (done && m.winner === m.red ? 'b' : '') + (m.red === pa ? ' mine' : '') + '">' + nm(m.red) + '</span><span class="sc">' + (done ? g.red + ' – ' + g.blue + (g.tb ? '*' : '') : 'vs') + '</span><span class="blue ' + (done && m.winner === m.blue ? 'b' : '') + (m.blue === pa ? ' mine' : '') + '">' + nm(m.blue) + '</span></div>'; };
    return '<div class="rr"><div><div class="xs muted b mb">ROUND ROBIN · every champion plays every other once · the top two play the final</div><table class="t"><tr><th>#</th><th>Alliance</th><th class="num">W–L</th><th class="num">Pts</th><th class="num">Score</th></tr>' + st.order.map(row).join('') + '</table>' +
      '<div class="rr-rounds">' + rounds.map(r => '<div><div class="xs muted b">' + h(r.n.toUpperCase()) + '</div>' + r.ms.map(mrow).join('') + '</div>').join('') + '</div></div>' +
      '<div class="bk-c fin"><div class="xs muted b mb">FINALS · BEST OF 3</div>' + bfinals(ev) + '</div></div>';
  }
  UI.bracket = function (ev) {
    if (ev.fmt === 'f5') return '<div class="rr"><div class="bk-c fin" style="max-width:420px">' + bfinals(ev) + '</div></div>';
    if (G.Ev.isRR(ev)) return bracketRR(ev);
    if (G.Ev.isSE(ev)) return bracketSE(ev);
    const RH = 35, UP = 8 * RH, GAP = 32, H = UP + GAP + 4 * RH, done = id => { const m = ev.po.matches.find(x => x.id === id); return m && m.winner != null; };
    const cell = (id, col, r0) => '<div class="bk-c" style="grid-column:' + col + ';grid-row:' + r0 + ' / span 2">' + bmatch(ev, id) + '</div>';
    const lo = UP + GAP, fy = H / 2;
    // viewBox is 600 wide (100 per round); the lines run between the centres of the match boxes and are hidden behind them
    const P = [['M1', 'M50,35 H100 V70 H150'], ['M2', 'M50,105 H100 V70 H150'], ['M3', 'M50,175 H100 V210 H150'], ['M4', 'M50,245 H100 V210 H150'],
      ['M7', 'M150,70 H300 V140 H350'], ['M8', 'M150,210 H300 V140 H350'], ['M11', 'M350,140 H500 V' + fy + ' H550'],
      ['M5', 'M150,' + (lo + 35) + ' H250'], ['M6', 'M150,' + (lo + 105) + ' H250'], ['M10', 'M250,' + (lo + 35) + ' H300 V' + (lo + 70) + ' H350'], ['M9', 'M250,' + (lo + 105) + ' H300 V' + (lo + 70) + ' H350'],
      ['M12', 'M350,' + (lo + 70) + ' H450'], ['M13', 'M450,' + (lo + 70) + ' H500 V' + fy + ' H550']];
    const CEN = { M1: [50, 35], M2: [50, 105], M3: [50, 175], M4: [50, 245], M7: [150, 70], M8: [150, 210], M11: [350, 140], M5: [150, lo + 35], M6: [150, lo + 105], M10: [250, lo + 35], M9: [250, lo + 105], M12: [350, lo + 70], M13: [450, lo + 70] };
    const pa = G.Ev.playerAlliance(ev), drops = [];
    if (pa >= 0) ev.po.matches.forEach(m => {
      if (m.loser !== pa || !CEN[m.id]) return;
      const to = G.Ev.brOf(ev).find(b => (b.red && b.red.L === m.id) || (b.blue && b.blue.L === m.id));
      if (to && CEN[to.id]) drops.push({ c: 'on mine drop', d: 'M' + CEN[m.id][0] + ',' + CEN[m.id][1] + ' H' + (CEN[m.id][0] + 42) + ' V' + CEN[to.id][1] + ' H' + CEN[to.id][0] });
    });
    return '<div class="bk-wrap"><div class="bk' + (ev.kind === 'einstein' ? ' ein' : '') + '">' +
      '<div class="bk-hd">' + ['Round 1', 'Round 2', 'Round 3', 'Round 4', 'Round 5', 'Finals · best of 3'].map(t => '<span>' + t + '</span>').join('') + '</div>' +
      '<div class="bk-band">UPPER BRACKET</div>' +
      '<div class="bk-grid" style="grid-template-rows:repeat(8,' + RH + 'px) ' + GAP + 'px repeat(4,' + RH + 'px)">' +
      '<svg class="bk-lines" viewBox="0 0 600 ' + H + '" preserveAspectRatio="none" style="grid-column:1 / -1;grid-row:1 / -1" aria-hidden="true">' + bkLines(ev, P, typeof drops === 'undefined' ? null : drops) + '</svg>' +
      cell('M1', 1, 1) + cell('M2', 1, 3) + cell('M3', 1, 5) + cell('M4', 1, 7) + cell('M7', 2, 2) + cell('M8', 2, 6) + cell('M11', 4, 4) +
      '<div class="bk-band lo" style="grid-column:1 / 6;grid-row:9">LOWER BRACKET · one loss already, the next one ends the event</div>' +
      cell('M5', 2, 10) + cell('M6', 2, 12) + cell('M10', 3, 10) + cell('M9', 3, 12) + cell('M12', 4, 11) + cell('M13', 5, 11) +
      '<div class="bk-c fin" style="grid-column:6;grid-row:1 / -1">' + bfinals(ev) + '</div>' +
      '</div></div></div>';
  };
  { const draw = UI.bracket; UI.bracket = ev => traceBar(ev) + draw(ev); }
  function watchView(ev) {
    const S = G.S, F = ev.po.matches.find(x => x.id === 'F'), set = F.red != null && F.blue != null, ci = S.season && S.season.cmpImpact, n = F.games.filter(g => !g.replay).length;
    const next = !set ? 'The six Finalists are named when both finalists are known, right before Final 1.' : !F.games.length ? 'The finalists are set. The winner of the FIRST Impact Award is announced after Final 1.' : 'The FIRST Impact Award has been presented. The finals continue.';
    return '<div class="card hl mb"><div class="ct">Einstein, from the stands ' + (ci && ci.eligible ? UI.tag('FIRST Impact Award candidate', 'acc') : '') + '</div>' +
      '<div class="sm mb">Your matches are over, but your team is here for the <b>FIRST Impact Award</b>, presented on this field. ' + next + (S.champsDiv ? ' The ' + h(S.champsDiv) + ' champions play for your division.' : '') + '</div>' +
      '<div class="row wrap">' + (!set ? '<button class="btn primary" data-act="watchPO" data-arg="finals">Watch until the finals ▶</button>' : '<button class="btn primary" data-act="watchPO" data-arg="one">Watch Final ' + (n + 1) + ' ▶</button>') +
      '<button class="btn" data-act="simRestPO">Simulate the rest</button></div></div>' + UI.bracket(ev);
  }
  // In the stands: play the other alliances' matches up to the finals, or one finals game at a time (the ceremonies follow the finals)
  UI.A.watchPO = function (mode) {
    const ev = Ev(); let m;
    if (mode === 'finals') { while ((m = G.Ev.nextPlayoff(ev)) && m.id !== 'F') G.Ev.applyPlayoff(ev, m, G.Ev.runHeadless(ev, G.Ev.poMatchObj(ev, m))); }
    else if ((m = G.Ev.nextPlayoff(ev))) G.Ev.applyPlayoff(ev, m, G.Ev.runHeadless(ev, G.Ev.poMatchObj(ev, m)));
    finishIfDone(ev); G.Save.write('auto'); UI.render();
  };
  function playoffView(ev) {
    if (ev.stream) return streamView(ev);
    if (ev.watch) return watchView(ev);
    const pa = G.Ev.playerAlliance(ev);
    let o = '<div class="card hl mb"><div class="ct">Playoffs' + (pa >= 0 ? ' — you are ' + h(alName(ev, pa)) + ' ' + UI.tag(G.Ev.playoffStatus(ev), 'acc') + ' ' + lossTag(ev) : ' ' + UI.tag('not selected', 'bad')) + '</div>';
    if (pa >= 0) o += '<div class="sm mb">Alliance: ' + ev.alliances[pa].map(t => tlink(t) + ' ' + h(tname(t))).join(' · ') + '</div>';
    if (pa >= 0 && !G.Ev.playerEliminated(ev)) o += nextStrip(ev) + '<div class="row wrap"><button class="btn primary" data-act="nextPO">Next playoff match ▶</button><button class="btn" data-act="simPO">Simulate my next match</button></div>';
    else o += '<div class="row wrap"><button class="btn primary" data-act="simRestPO">Simulate remaining playoffs</button></div>';
    o += '</div>' + UI.bracket(ev);
    return o;
  }
  // "1 loss" chip: two losses and you're out (the finals are best of three)
  function lossTag(ev) {
    const l = G.Ev.playerLosses(ev);
    if (l.rr) return UI.tag('Round robin: ' + l.w + '–' + l.l + ' · ' + U.ord(l.rank) + ' of ' + l.n + ' (top two play the final)', l.rank <= 2 ? 'good' : 'warn');
    if (ev.fmt === 'f5') return UI.tag('Best of five: ' + l.w + '–' + l.l, l.l > l.w ? 'warn' : 'good');
    if (l.se && !l.inFinals) return UI.tag(h(l.round) + ': ' + l.w + '–' + l.l + ' · best of 3', l.l ? 'warn' : 'good');
    if (l.inFinals) return UI.tag('Finals: ' + l.finals + ' game' + (l.finals === 1 ? '' : 's') + ' lost (best of 3)', l.finals ? 'warn' : 'good');
    return UI.tag(l.losses + (l.losses === 1 ? ' loss' : ' losses') + ' · out at 2', l.losses ? 'warn' : 'good');
  }
  UI.lossTag = lossTag;
  // Name of the match being played: "Qualification 12 of 64", "Playoff Match 7", "Finals · Game 2"
  UI.matchLabel = function (ev, obj) {
    if (!obj) return '';
    if (!obj.playoff) return 'Qualification ' + obj.n + ' of ' + ev.quals.length;
    const pm = ev && ev.po && ev.po.matches.find(x => x.id === obj.id);
    const rp = (obj.replay ? ' (replay)' : '') + (pm && pm.red != null && pm.blue != null ? ' · ' + alShort(ev, pm.red) + ' vs ' + alShort(ev, pm.blue) : '');
    if (ev.fmt === 'f5') return 'Festival of Champions · Match ' + ((obj.game || 0) + 1) + rp;
    if (G.Ev.isRR(ev) && obj.id !== 'F') return 'Einstein ' + G.Ev.poRound(ev, obj.id) + rp;
    if (G.Ev.isSE(ev) && obj.id !== 'F') return (ev.kind === 'einstein' ? 'Einstein ' : '') + G.Ev.poRound(ev, obj.id) + ' · Game ' + ((obj.game || 0) + 1) + rp;
    if (ev.kind === 'einstein' || obj.id === 'F') return (ev.kind === 'einstein' && obj.id !== 'F' ? 'Einstein ' : '') + (obj.id === 'F' ? 'Finals · Game ' + ((obj.game || 0) + 1) : 'Playoff Match ' + String(obj.id).replace('M', '')) + rp;
    return 'Playoff Match ' + String(obj.id).replace('M', '') + rp;
  };
  function prepPO(ev, m) {
    const key = m.id + ':' + m.games.length;
    if (ev.prepKey !== key) { G.Career.beforePlayerMatch(G.S, ev); ev.prepKey = key; }
    UI.st.match = { kind: 'po', m };
  }
  UI.A.nextPO = function () {
    const ev = Ev(); const m = G.Ev.simPlayoffsUntilPlayer(ev);
    if (!m) { finishIfDone(ev); UI.render(); return; }
    prepPO(ev, m); UI.go('prematch');
  };
  UI.A.simPO = function () {
    const ev = Ev(); const m = G.Ev.simPlayoffsUntilPlayer(ev);
    if (!m) { finishIfDone(ev); UI.render(); return; }
    prepPO(ev, m);
    const obj = G.Ev.poMatchObj(ev, m), res = G.Ev.runHeadless(ev, obj);
    G.Ev.applyPlayoff(ev, m, res);
    UI.st.lastResult = { res, obj, kind: 'po' };
    finishIfDone(ev); G.Save.write('auto');
    UI.go('mresult');
  };
  UI.A.simRestPO = function () {
    const ev = Ev(); let m;
    while ((m = G.Ev.nextPlayoff(ev))) G.Ev.applyPlayoff(ev, m, G.Ev.runHeadless(ev, G.Ev.poMatchObj(ev, m)));
    finishIfDone(ev); G.Save.write('auto'); UI.render();
  };
  function finishIfDone(ev) { if (ev.po && ev.po.done && ev.stage !== 'done') G.Ev.finishEvent(ev); }

  // ---------------- done ----------------
  // The FIRST Impact Award is announced on Einstein. A team that did not advance hears it when its division is over.
  function impactLine(ev) {
    const S = G.S, ci = S.season && S.season.cmpImpact;
    if (!ci || !(ev.kind === 'einstein' || (ev.kind === 'champs' && !S.pendingEinstein))) return '';
    G.Career.settleImpact(S, 'all');
    const nm = n => (n === me() ? '<b class="acc">' + n + ' ' + h(S.team.name) + '</b>' : n + ' ' + h(tname(n)));
    return '<div class="hint mt">' + UI.icon('trophy', 14) + ' <b>FIRST Impact Award</b> (announced on Einstein): ' + nm(ci.winner) + '. Finalists: ' + ci.finalists.map(nm).join(', ') + '.' +
      (ci.out ? '' : ci.eligible ? ' Your entry placed ' + U.ord(ci.rank) + ' of ' + ci.of + ' regional Impact winners.' : S.hallOfFame != null ? '' : ' Only this season\'s regional Impact Award winners are judged.') + '</div>';
  }
  // Einstein finishing page: the FIRST Impact Award winner and the six Finalists (your team highlighted), with the celebration to replay
  function impactCard() {
    const S = G.S, ci = S.season && S.season.cmpImpact;
    if (!ci) return '';
    G.Career.settleImpact(S, 'all');
    const row = (n, role) => '<div class="row sm mb ' + (n === me() ? 'acc b' : '') + '"><span>' + role + '</span><span class="sp"></span><span>' + n + ' ' + h(tname(n)) + '</span></div>';
    return '<div class="card"><div class="ct">FIRST Impact Award' + (ci.cele ? '<span class="sp"></span><button class="btn sm" data-act="impactAgain">' + UI.icon('trophy', 13) + ' Celebration</button>' : '') + '</div>' +
      row(ci.winner, 'Winner · Hall of Fame') + ci.finalists.map(n => row(n, 'Finalist')).join('') +
      '<div class="xs muted mt">' + (ci.result === 'winner' ? 'Your team won the most prestigious award in the program. The banner is on your History wall.' : ci.result === 'finalist' ? 'Your team is one of the six Finalists. The banner is on your History wall.' : ci.eligible ? 'Your entry placed ' + U.ord(ci.rank) + ' of ' + ci.of + ' regional Impact winners.' : S.hallOfFame != null ? 'Your team is already in the Hall of Fame.' : 'Only this season\'s regional Impact Award winners are judged.') + '</div></div>';
  }
  UI.A.impactAgain = () => { const ci = G.S.season && G.S.season.cmpImpact; if (ci && ci.cele) UI.impactCele(ci.cele, true); };
  function doneView(ev) {
    if (ev.festival) return ev.stream ? streamDone(ev) : festDone(ev);
    const r = ev.result || {};
    const bn = G.Career.eventBanners(Object.assign({ kind: ev.kind }, r), ev.year);
    const S = G.S, ci = S.season && S.season.cmpImpact, settled = !!ci && (ev.kind === 'einstein' || (ev.kind === 'champs' && !S.pendingEinstein));
    if (settled) { G.Career.settleImpact(S, 'all'); if (ci.result) bn.push({ award: ci.result === 'winner' ? 'FIRST Impact Award' : 'FIRST Impact Award Finalist', year: G.Career.calYear(S, ev.year), event: 'FIRST Championship', gold: ci.result === 'winner', world: true, key: 'impact' }); }
    let o = bn.length ? '<div class="card hl mb"><div class="ct">' + (bn.length > 1 ? 'New blue banners!' : 'New blue banner!') + '<span class="sp"></span><span class="xs muted">Hung in your History banner wall</span></div>' + UI.bannerWall(bn, true) + '</div>' : '';
    if (ev.watch) {
      // in the stands: who won Einstein, the FIRST Impact Award and the whole bracket
      const F = ev.po.matches.find(x => x.id === 'F'), w = F.winner, wside = F.red === w ? 'red' : 'blue', gw = F.games.filter(g => !g.replay && g.winner === wside).length, gl = F.games.filter(g => !g.replay && g.winner && g.winner !== wside && g.winner !== 'tie').length;
      o += '<div class="grid g2"><div class="card hl"><div class="ct">Einstein finals</div><div class="xs muted b">WORLD CHAMPIONS</div><div class="xl b acc">' + h(alName(ev, w)) + '</div>' +
        '<div class="sm mt">' + ev.alliances[w].map(t => tlink(t) + ' ' + h(tname(t))).join(' · ') + '</div>' +
        '<div class="kv mt"><span class="k">Finals</span><span>' + gw + '–' + gl + ' against ' + h(alName(ev, F.loser)) + '</span><span class="k">Your team</span><span>In the stands' + (ci && ci.result ? ', and on the field for the FIRST Impact Award' : '') + '</span></div>' +
        '<div class="row mt"><span class="sp"></span><button class="btn primary" data-act="leaveEvent">Leave event ▶</button></div></div>' + impactCard() + '</div>';
      return o + '<div class="mt">' + UI.bracket(ev) + '</div>';
    }
    if (ev.kind === 'champs' && S.pendingEinstein && S.lastDivision && S.lastDivision.watch) o += '<div class="hint mb">' + UI.icon('trophy', 14) + ' Your matches are over, but your team is in the running for the <b>FIRST Impact Award</b>. It is presented on Einstein, your next stop: you watch the finals from the stands.</div>';
    o += '<div class="grid g2"><div class="card hl"><div class="ct">Event result</div>';
    o += '<div class="xl b ' + (r.won ? 'acc' : '') + '">' + h(r.finish || '') + '</div>';
    o += '<div class="kv mt">' + (r.rank ? '<span class="k">Qualification rank</span><span>' + U.ord(r.rank) + ' of ' + r.size + '</span><span class="k">Record</span><span>' + h(r.record) + '</span><span class="k">Ranking score</span><span>' + (r.avgRP || 0).toFixed(2) + '</span>' : '') +
      (r.alliance ? '<span class="k">Alliance</span><span>#' + r.alliance + ' (' + h(r.role) + ')</span>' : '') + '<span class="k">OPR</span><span>' + r.opr + '</span>' + (r.pool ? '<span class="k">Pool points</span><span>' + r.pool + '</span>' : '') +
      (r.wild ? '<span class="k">Wildcards</span><span>' + r.wild.cards + ' at this event' + (r.wild.to.length ? ': ' + r.wild.to.map(n => (n === me() ? '<b class="acc">your team</b>' : tlink(n))).join(', ') : ' (every finalist had already qualified)') + '</span>' : '') +
      (r.dpx ? '<span class="k">District points</span><span><b>' + (ev.kind === 'dcmp' ? r.dp + ' × 3 = ' + r.dp * 3 : r.dp) + '</b>' + (r.counts === false ? ' <span class="xs muted">(a third event earns no points)</span>' : '') +
        '<div class="xs muted">rank ' + r.dpx.qual + ' · alliance selection ' + r.dpx.sel + ' · playoffs ' + r.dpx.po + ' · awards ' + r.dpx.aw + '</div></span>' : '') + '</div>';
    if (r.winners && r.winners.length) o += '<div class="sm mt">Event winners: ' + r.winners.map(tlink).join(', ') + '</div>';
    if (ev.kind !== 'einstein') o += impactLine(ev);
    o += '<div class="row mt"><span class="sp"></span><button class="btn primary" data-act="leaveEvent">Leave event ▶</button></div></div>';
    if (ev.kind === 'einstein' && ci) return o + impactCard() + '</div>' + (ev.po ? '<div class="mt">' + UI.bracket(ev) + '</div>' : '');
    o += '<div class="card"><div class="ct">Awards</div>' + (ev.awards.length ? ev.awards.map(a => '<div class="row sm mb ' + (a.team === me() ? 'acc b' : '') + '"><span>' + h(a.name) + '</span><span class="sp"></span><span>' + a.team + ' ' + h(tname(a.team)) + '</span></div>').join('') : '<p class="muted">No judged awards at this event.</p>') + '</div></div>';
    if (ev.po) o += '<div class="mt">' + UI.bracket(ev) + '</div>';
    return o;
  }
  UI.A.leaveEvent = function () {
    const S = G.S; G.Career.leaveEvent(S); G.Save.write('auto'); UI.go('hq');
    // a story that waited for the event to end (the Festival of Champions) is told on the way out
    const q = (S.launchQueue || []).filter(l => l.afterEvent);
    if (q.length) { S.launchQueue = q; UI.launchModal(); }
  };

  // ---------------- tabs: rankings / scouting / schedule ----------------
  function tabs(ev) {
    const t = UI.st.evTab || 'rank';
    let o = UI.tabs(t, [['rank', 'Rankings', 'history'], ['scout', 'Scouting', 'scout'], ['sched', 'Schedule', 'calendar'], ['inc', 'Incidents', 'incident', ev.incidents && ev.incidents.length ? ev.incidents.length : 0]], 'evTab');
    const opr = G.Ev.opr(ev);
    if (t === 'rank') {
      o += '<div class="card"><table class="t"><tr><th>#</th><th>Team</th><th>Name</th><th class="num">RS</th><th>W-L-T</th><th class="num">Avg score</th><th class="num">OPR</th></tr>' + G.Ev.rankings(ev).map((n, i) => {
        const r = ev.rank[n];
        return '<tr class="' + (n === me() ? 'me' : '') + '"><td>' + (i + 1) + '</td><td>' + tlink(n) + '</td><td class="sm">' + h(tname(n)) + '</td><td class="num">' + (r.played ? (r.rp / r.played).toFixed(2) : '—') + '</td><td>' + r.w + '-' + r.l + '-' + r.t + '</td><td class="num">' + (r.played ? Math.round(r.pts / r.played) : '—') + '</td><td class="num">' + (opr[n] || 0) + '</td></tr>';
      }).join('') + '</table></div>';
    } else if (t === 'scout') {
      o += credLine(ev) + '<div class="card"><div class="sm muted mb"><b>Observed</b> columns show what your scouts recorded in qualification matches. <b>Estimated</b> ratings (last four columns) sharpen with a Strategy mentor, Scouting Focus practice and more matches watched.</div><div style="overflow-x:auto"><table class="t tight"><tr><th>Team</th><th>Robot</th><th class="num">OPR</th>' + OBS_HEAD + '<th class="num" title="Estimated">Speed</th><th class="num" title="Estimated">Scoring</th><th class="num" title="Estimated">Acc</th><th class="num" title="Estimated reliability">Rel</th></tr>' +
        ev.teams.slice().sort((a, b) => (opr[b] || 0) - (opr[a] || 0)).map(n => {
          const sc = G.Ev.scout(ev, n), e = sc.est || sc.cap, c = sc.cap;
          const nd = sc.noise ? '<span class="xs dim">±' + sc.noise + '</span>' : '';
          return '<tr class="' + (n === me() ? 'me' : '') + '"><td>' + tlink(n) + '</td><td class="xs">' + h(sc.arch) + '</td><td class="num">' + (opr[n] || 0) + '</td>' + obsCells(ev, n) + '<td class="num">' + Math.round(e.speed) + '</td><td class="num">' + Math.round(e.scoreSpd) + nd + '</td><td class="num">' + Math.round(e.accuracy) + '</td><td class="num">' + Math.round(e.rel) + '</td></tr>';
        }).join('') + '</table></div></div>';
    } else if (t === 'inc') {
      o += incidentsView(ev);
    } else {
      o += '<div class="card"><table class="t"><tr><th>Match</th><th>Red</th><th>Blue</th><th class="num">Score</th></tr>' + ev.quals.map(mt => '<tr class="' + (G.Ev.hasPlayer(mt) ? 'me' : '') + '"><td>Q' + mt.n + '</td><td class="red">' + mt.red.join(' ') + '</td><td class="blue">' + mt.blue.join(' ') + '</td><td class="num">' + (mt.res ? '<span class="red">' + mt.res.red.score + '</span> – <span class="blue">' + mt.res.blue.score + '</span>' : '') + '</td></tr>').join('') + '</table></div>';
    }
    return o;
  }
  UI.A.evTab = t => { UI.st.evTab = t; UI.render(); };
  // ---- fatigue at events: scouting credibility and incidents ----
  function credLine(ev) {
    const c = ev.scoutCred == null ? 1 : ev.scoutCred, col = c >= 0.9 ? 'good' : c >= 0.8 ? 'warn' : 'bad';
    return '<div class="row sm mb cred">' + UI.icon('scout', 16) + '<span>Scouting credibility <b class="' + col + '">' + Math.round(c * 100) + '%</b></span><span class="xs muted">About ' + Math.round((1 - c) * 100) + '% of other teams\' data may belong to the wrong robot. A tired team makes more mistakes; a Strategy mentor, experience and Scouting Focus practice help.</span></div>';
  }
  function incidentsView(ev) {
    const f = ev.fatigue == null ? D.FATIGUE_BASE : ev.fatigue;
    let o = '<div class="row sm mb">' + UI.icon('fatigue', 16) + '<span>Team fatigue at this event: <b class="' + (f > 60 ? 'bad' : f > 40 ? 'warn' : 'good') + '">' + Math.round(f) + ' (' + G.Career.fatigueLabel(f) + ')</b></span><span class="xs muted">' + (f <= D.INCIDENT_FREE ? 'At this level there is at most one incident per event.' : 'Expect about ' + G.Ev.incidentRate(f).toFixed(1) + ' incidents at a regional.') + ' Fatigue is fixed for the whole event (the Championship and Einstein count as one).</span></div>';
    if (!ev.incidents || !ev.incidents.length) return o + '<div class="card"><p class="muted">No incidents so far. The drive team, pit crew and scouts are on top of things.</p></div>';
    return o + '<div class="inc-list">' + ev.incidents.map(x => '<div class="inc"><div class="row">' + UI.icon('incident', 16) + '<b>' + h(x.title) + '</b><span class="sp"></span><span class="xs muted">' + h(x.at) + '</span></div><div class="sm muted">' + h(x.text) + '</div></div>').join('') + '</div>';
  }
  function obsBlock(ev, n) {
    const ob = G.Ev.obsShown(ev, n);
    if (!ob) return '<div class="sm dim mt">No qualification matches observed yet.</div>';
    return '<h3 class="mt">Observed at this event <span class="xs muted">(' + ob.n + ' matches)</span></h3><div class="kv">' +
      '<span class="k">Points scored / match</span><span>' + ob.pts.toFixed(1) + '</span>' +
      '<span class="k">Auto ran as planned</span><span>' + pctTxt(ob.auto) + '</span>' +
      '<span class="k">' + (ev.year === 2023 ? 'Docks that engaged' : 'Endgame climbs') + '</span><span>' + (ob.climbTry ? pctTxt(ob.climb) + ' (' + Math.round((ob.climb || 0) * ob.climbTry) + ' of ' + ob.climbTry + ')' : 'never attempted') + '</span>' +
      '<span class="k">Fault-free matches</span><span>' + pctTxt(ob.rel) + ' · ' + ob.faults + ' fault(s)' + (ob.comms ? ', ' + ob.comms + ' comms' : '') + (ob.dead ? ', <span class="bad">disabled ' + ob.dead + '×</span>' : '') + '</span>' +
      '<span class="k">Fouls / match</span><span>' + ob.fouls.toFixed(1) + '</span>' +
      '<span class="k">Played defense</span><span>' + ob.def + ' match(es)</span></div>';
  }
  UI.A.scoutTeam = function (n) {
    n = Number(n);
    const ev = Ev(); if (!ev) return;
    const sc = G.Ev.scout(ev, n), c = sc.cap, e = sc.est || c, T = G.S.teams[n];
    const look = Object.assign({}, sc.look);
    UI.modal('<h2>' + n + ' ' + h(tname(n)) + '</h2><div class="sub">' + h(sc.arch || '') + (T ? ' · ' + h(T.region) : '') + (sc.noise ? ' · scouting error ±' + sc.noise : '') + '</div>' +
      '<div class="row" style="align-items:flex-start"><div style="flex:1">' + UI.sideCanvas(look, 'red', n, 300, 180) + '</div><div style="flex:1">' +
      UI.stat('Speed', e.speed) + UI.stat('Intake', e.intake) + UI.stat('Scoring speed', e.scoreSpd) + UI.stat('Accuracy', e.accuracy) + UI.stat('Endgame', e.endgame || 0) + UI.stat('Auto', e.auto) + UI.stat('Reliability', e.rel) +
      '<div class="sm muted">Climb: ' + h(G.Seasons[ev.year].endNames[c.endLevel || 0] || '—') + ' · Auto: ' + h(G.Seasons[ev.year].autoTiers[c.autoTier || 0]) + ' · OPR ' + (G.Ev.opr(ev)[n] || 0) + '</div></div></div>' + obsBlock(ev, n), { wide: true });
    UI.jobs.forEach(f => f()); UI.jobs = [];
  };

  // =====================================================================
  // PRE-MATCH
  // =====================================================================
  function curMatchObj() {
    const ev = Ev(), c = UI.st.match;
    if (!ev || !c) return null;
    return c.kind === 'qual' ? c.mt : G.Ev.poMatchObj(ev, c.m);
  }
  UI.S.prematch = { nav: 'event', html() {
    const S = G.S, ev = Ev(), obj = curMatchObj();
    if (!obj) return '<p>No match.</p><button class="btn" data-act="nav" data-arg="event">Back</button>';
    const a = obj.red.includes(me()) ? 'red' : 'blue', o2 = a === 'red' ? 'blue' : 'red';
    const Sz = G.Seasons[ev.year], plan = ev.plan, opr = G.Ev.opr(ev);
    const title = UI.st.match.kind === 'qual' ? 'Qualification ' + obj.n : (UI.st.match.m.bo3 ? '' : obj.id + ' · ') + UI.st.match.m.round + (UI.st.match.m.bo3 ? ' · game ' + (obj.game + 1) : '');
    const pmm = UI.st.match.kind === 'po' ? UI.st.match.m : null, alTag = sd => (pmm ? ' · ' + h(alShort(ev, sd === 'red' ? pmm.red : pmm.blue)) : '');
    let o = evRibbon(ev) + '<h1>' + h(title) + '</h1><div class="sub">You are on the <b class="' + a + '">' + a.toUpperCase() + '</b> alliance' + (pmm ? ': <b>' + h(alName(ev, a === 'red' ? pmm.red : pmm.blue)) + '</b>, against <b>' + h(alName(ev, a === 'red' ? pmm.blue : pmm.red)) + '</b>' : '') + '.</div>';
    const ds = ev.defStats;
    if (Sz.meta) o += '<div class="hint mb"><b>Strategy:</b> ' + h(((String(Sz.meta.note).match(/^[^.:]*[.:]/) || [Sz.meta.note])[0]).replace(/:$/, '.')) + ' ' + UI.q('matches', ev.year <= 2020 ? 'Classic games (2016–2020)' : 'Season strategies') + (ds && ds.n >= 10 ? ' So far at this event, ' + Math.round(100 * ds.d / ds.n) + '% of alliances have played a defender.' : '') + '</div>';
    if (ev.year === 2024) {
      const fs = ev.feedStats, read = Math.round(100 * G.Career.metaInsight(S));
      o += '<div class="xs muted mb"><b>Note feeding:</b> ' + (fs && fs.n >= 6 ? Math.round(100 * fs.f / fs.n) + '% of alliances at this event feed notes across the field to hoard them for Amplify. ' : 'some alliances lob notes across the field to hoard them for Amplify. ') +
        'Your alliance runs it better with a stronger strategy read: <b>' + read + '%</b> (Strategy mentor, drive coach, driver practice and events scouted).</div>';
    }
    if (ev.year === 2026) {
      const fs = ev.feedStats, read = Math.round(100 * G.Career.metaInsight(S));
      o += '<div class="xs muted mb"><b>Fuel hoarding:</b> ' + (fs && fs.n >= 6 ? Math.round(100 * fs.f / fs.n) + '% of alliances at this event keep working while their hub is inactive: they sweep the neutral zone and lob the fuel back into their own zone, so the next scoring shift starts with short cycles. ' : 'some alliances sweep the neutral zone while their hub is inactive and lob the fuel back into their own zone for the next scoring shift. ') +
        'Your alliance runs it more often and more cleanly with a stronger strategy read: <b>' + read + '%</b> (Strategy mentor, drive coach, driver practice and events scouted). "Shoot on sight" turns it off for your robot.</div>';
    }
    if (Sz.meta && Sz.meta.faults) { o += '<div class="xs muted mb">' + h(Sz.meta.faults) + ' ' + UI.q('matches', 'Faults and falls') + '</div>'; }
    const teamCard = (t, side) => {
      const sc = G.Ev.scout(ev, t), c = sc.cap, isMe = t === me();
      let sug = '';
      if (side === a && !isMe) {
        const roles = [['', 'Their choice'], ['score', 'Score'], ['defend', 'Play defense']].concat(ev.year === 2026 ? [['feed', 'Feed fuel']] : []);
        sug = '<label class="f mt">Suggest role<select class="inp" data-chg="suggest" data-t="' + t + '">' + roles.map(r => '<option value="' + r[0] + '" ' + ((ev.suggest[t] || '') === r[0] ? 'selected' : '') + '>' + r[1] + '</option>').join('') + '</select></label>';
      }
      return '<div class="rbox ' + (isMe ? 'me' : '') + '"><div class="hd"><span class="' + side + '">' + t + '</span><span class="xs muted">OPR ' + (opr[t] || 0) + '</span></div><div class="xs muted">' + h(tname(t)) + '</div><div class="row mt">' + UI.topCanvas(sc.look ? Object.assign({ c1: isMe ? S.team.c1 : null, c2: isMe ? S.team.c2 : null }, sc.look) : {}, side, t, 0, ev.year, 72) + '<div class="xs">' + h(sc.arch || '') + '<br>Climb: ' + h(Sz.endNames[c.endLevel || 0] || '—') + '<br>Auto: ' + h(Sz.autoTiers[c.autoTier || 0]) + '</div></div>' + sug + '</div>';
    };
    o += '<div class="grid g3"><div>' + '<h3>Red alliance' + alTag('red') + '</h3>' + obj.red.map(t => teamCard(t, 'red')).join('') + '</div>';
    // plan
    const sel = (k, opts, cur) => '<select class="inp" data-chg="plan" data-k="' + k + '">' + opts.map(x => '<option value="' + x[0] + '" ' + (String(cur) === String(x[0]) ? 'selected' : '') + '>' + x[1] + '</option>').join('') + '</select>';
    const roles = [['score', 'Score'], ['defend', 'Play defense']].concat(ev.year === 2026 ? [['feed', 'Feed fuel to partners']] : []);
    const aud16 = ev.year === 2016 ? G.Ev.audience16(ev, obj) : null; // the audience's defense for this round of matches
    const endL = [[9, ev.year === 2026 ? 'Only if worth it' : 'Highest possible']].concat(Sz.endNames.map((n, i) => [i, i === 0 ? (G.Rules[ev.year].endgame.park ? 'Park only' : 'No endgame') : n]).filter(x => x[0] > 0 || true));
    o += '<div class="card hl"><div class="ct">Match plan (free)</div><div class="col">' +
      '<label class="f">Role' + sel('role', roles, plan.role) + '</label>' +
      (plan.role === 'defend' ? '<label class="f">Defend' + sel('defTarget', [['', 'Their best scorer']].concat(obj[o2].map(t => [t, t + ' ' + tname(t)])), plan.defTarget || '') + '</label>' : '') +
      '<label class="f">Target priority' + sel('target', Sz.coachTargets.map(t => [t.id, t.name]), plan.target) + '</label>' +
      '<label class="f">Pace' + sel('pace', [['push', 'Push (faster, riskier)'], ['bal', 'Balanced'], ['cons', 'Conserve (safer, slower)']], plan.pace) + '</label>' +
      '<label class="f">Endgame timing' + sel('endTiming', [['early', 'Early (safe)'], ['std', 'Standard'], ['late', 'Late (max cycles)']], plan.endTiming) + '</label>' +
      '<label class="f">Endgame target' + sel('endLevel', endL, plan.endLevel) + '</label>' +
      (ev.year === 2016 ? '<div class="f"><span title="Each alliance chooses three of the defenses the other one has to cross, one of each kind. The fourth kind is the audience\'s pick, the same on both sides, and the Low Bar is always there.">Their defenses (one of each kind)</span>' +
        (aud16 ? '<div class="xs muted" style="margin:2px 0 6px">This round the audience picked the <b>' + h(G.Rules.DEF16[aud16.type].n) + '</b> (position 3, on both sides). The Low Bar is always in position 1, across from your Secret Passage.</div>' : '') + '<div class="grid g2" style="gap:6px">' +
        ['A', 'B', 'C', 'D'].filter(c => !aud16 || c !== aud16.cat).map(c => sel('def' + c, [['', c + ': coach decides']].concat(Object.keys(G.Rules.DEF16).filter(k => G.Rules.DEF16[k].cat === c).map(k => { const T = G.Rules.DEF16[k]; return [k, T.n + ' (' + (T.k >= 1.4 ? 'slow' : T.k >= 1.2 ? 'medium' : 'quick') + (T.stuck >= 0.1 ? ', robots get stuck' : '') + (T.need ? ', needs a tool' : '') + ')']; })), plan['def' + c] || '')).join('') + '</div></div>' : '') +
      (ev.year === 2018 ? '<label class="f"><span title="Cubes fed through the Exchange fill the Vault, three per power-up. Levitate lifts one robot for free at the end. Boost doubles your Switch and Scale points for 10 seconds. Force gives you the Switch and Scale for 10 seconds. The drive coach decides when to play them.">Power-up order (Vault)</span>' + sel('puPref', [['', 'Levitate, then Boost, then Force'], ['boost', 'Boost, then Levitate, then Force'], ['force', 'Force, then Boost, then Levitate']], plan.puPref || '') + '</label>' : '') +
      '<label class="row sm"><input type="checkbox" data-chg="planChk" data-k="rpHunt" ' + (plan.rpHunt ? 'checked' : '') + '> Chase bonus ranking points</label>' +
      '<label class="row sm"><input type="checkbox" data-chg="planChk" data-k="avoid" ' + (plan.avoid ? 'checked' : '') + '> Avoid contact (fewer fouls, slower)</label>' +
      // games with buddy climbs (2018, 2019, 2020): a partner that drops you on the way up damages your robot
      (Sz.subs.some(sd => sd.id === 'endgame' && sd.concepts.some(c => c.caps && c.caps.buddy)) ? '<label class="row sm" title="A partner with a buddy climber can lift your robot for extra endgame points. If the lift fails it may drop you, and that damages your robot. Tick this to stay on the ground."><input type="checkbox" data-chg="planChk" data-k="noCarry" ' + (plan.noCarry ? 'checked' : '') + '> Don\'t let a partner carry us (no buddy climb, no risk of being dropped)</label>' : '') + '</div>';
    const R = S.robot;
    o += '<div class="hr"></div><div class="sm"><b>Robot status</b></div>' + UI.condRows(S) +
      '<div class="xs muted">Battery charge ' + Math.round((ev.batt || 1) * 100) + '% · spares ' + S.parts.spares + (ev.lastRepair != null ? ' · used ' + ev.lastRepair + ' spares in repairs' : '') + (ev.lastTurn ? ' · pit time before this match: ' + ev.lastTurn + ' match slot' + (ev.lastTurn === 1 ? '' : 's') : '') + ' · Coach Calls: ' + G.Career.coachCalls(S, UI.st.match.kind === 'po') + '</div>';
    const pa = G.Ev.playerAlliance(ev);
    if (UI.st.match.kind === 'po' && pa >= 0 && !ev.timeouts[pa]) o += '<button class="btn sm mt" data-act="timeout">Call alliance timeout (extra repairs)</button>';
    o += '<div class="mt">' + nextStrip(ev, obj) + '</div>';
    o += '<div class="row mt"><button class="btn primary lg" data-act="watch">Watch ▶</button><button class="btn" data-act="simThis">Simulate</button><span class="sp"></span><button class="btn ghost" data-act="nav" data-arg="event">Back</button></div></div>';
    o += '<div><h3>Blue alliance' + alTag('blue') + '</h3>' + obj.blue.map(t => teamCard(t, 'blue')).join('') + '</div></div>';
    return o;
  } };
  UI.A.plan = (v, el) => { const k = el.dataset.k; const ev = Ev(); ev.plan[k] = (k === 'endLevel' || k === 'defTarget') ? (v === '' ? null : Number(v)) : v; UI.render(); };
  UI.A.planChk = (v, el) => { Ev().plan[el.dataset.k] = v; };
  UI.A.suggest = (v, el) => { const ev = Ev(); if (v) ev.suggest[Number(el.dataset.t)] = v; else delete ev.suggest[Number(el.dataset.t)]; };
  UI.A.timeout = () => { const ev = Ev(), pa = G.Ev.playerAlliance(ev); ev.timeouts[pa] = true; const sp = G.Robot.pitRepair(G.S, 4, 2); UI.toast('Timeout! Extra repairs done (' + sp + ' spares used).', 'good'); UI.render(); };
  UI.A.simThis = function () {
    const ev = Ev(), c = UI.st.match, obj = curMatchObj();
    const res = G.Ev.runHeadless(ev, obj);
    recordResult(ev, c, obj, res);
  };
  function recordResult(ev, c, obj, res) {
    if (c.spectate) { G.Ev.applyPlayoff(ev, c.m, res); finishIfDone(ev); UI.st.match = null; G.Save.write('auto'); return UI.go('event'); } // watched on the stream: back to it
    if (c.kind === 'qual') G.Ev.completePlayerQual(ev, res);
    else G.Ev.applyPlayoff(ev, c.m, res);
    finishIfDone(ev);
    UI.st.lastResult = { res, obj, kind: c.kind };
    UI.st.match = null;
    G.Save.write('auto');
    UI.go('mresult');
  }
  UI.A.watch = () => UI.go('live');

  // =====================================================================
  // LIVE MATCH
  // =====================================================================
  function fieldTag(ev) {
    if (!ev || (ev.kind !== 'champs' && ev.kind !== 'einstein')) return '';
    const div = G.S.champsDiv || 'Newton';
    return ev.kind === 'einstein' ? '<div class="fieldtag ein">★ ' + (ev.festival ? 'FESTIVAL OF CHAMPIONS' : 'EINSTEIN FIELD') + ' ★</div>' : '<div class="fieldtag" style="--div:' + UI.divColor(div) + '">' + h(div.toUpperCase()) + ' DIVISION</div>';
  }
  // under the scoreboard in a Championship playoff match: the two alliances (on Einstein, their divisions and colours)
  function liveVs(ev) {
    const pm = UI.st.match && UI.st.match.kind === 'po' ? UI.st.match.m : null;
    if (!pm || !ev || (ev.kind !== 'champs' && ev.kind !== 'einstein') || pm.red == null || pm.blue == null) return '';
    const dot = i => { const dn = ev.kind === 'einstein' && ev.divNames && ev.divNames[i]; return dn ? '<i style="background:' + UI.divColor(dn) + '"></i>' : ''; }, pa = G.Ev.playerAlliance(ev);
    const nm = i => h(alName(ev, i)) + (i === pa ? ' · you' : '');
    return '<div class="vsbar"><span class="r">' + nm(pm.red) + dot(pm.red) + '</span><span class="m">' + (pm.id === 'F' ? (ev.fmt === 'f5' ? 'THE SERIES · BEST OF 5' : 'FINALS · BEST OF 3') : pm.bo3 ? h(String(pm.round).toUpperCase()) + ' · BEST OF 3' : 'MATCH ' + String(pm.id).slice(1) + ' · ' + h(String(pm.round).toUpperCase())) + '</span><span class="b">' + dot(pm.blue) + nm(pm.blue) + '</span></div>';
  }
  UI.S.live = { nav: 'event', html() {
    const ev = Ev(), obj = curMatchObj();
    if (!obj) return '<p>No match.</p>';
    const Sz = G.Seasons[ev.year];
    const spec = !!(UI.st.match && UI.st.match.spectate); // a match watched on the livestream: no robot of yours, no coach calls
    const a = obj.red.includes(me()) ? 'red' : 'blue', o2 = a === 'red' ? 'blue' : 'red';
    const callBtn = (kind, value, label, cls) => '<button class="btn sm ' + (cls || '') + '" data-act="call" data-arg="' + kind + '|' + value + '">' + h(label) + '</button>';
    let calls = '<div class="col">' +
      '<div class="row wrap gap4"><span class="xs muted" style="width:62px">Pace</span>' + callBtn('pace', 'push', 'Push') + callBtn('pace', 'bal', 'Balanced') + callBtn('pace', 'cons', 'Conserve') + '</div>' +
      '<div class="row wrap gap4"><span class="xs muted" style="width:62px">Role</span>' + callBtn('role', 'score', 'Score') + obj[o2].map(t => callBtn('role', 'defend:' + t, 'Defend ' + t)).join('') + (ev.year === 2026 ? callBtn('role', 'feed', 'Feed') : '') + '</div>' +
      '<div class="row wrap gap4"><span class="xs muted" style="width:62px">Target</span>' + Sz.coachTargets.map(t => callBtn('target', t.id, t.name)).join('') + '</div>' +
      '<div class="row wrap gap4"><span class="xs muted" style="width:62px">Endgame</span>' + callBtn('endNow', '1', 'Go now') + callBtn('endTiming', 'late', 'Go late') + Sz.endNames.map((n, i) => i > 0 ? callBtn('endLevel', i, 'Aim ' + n) : '').join('') + '</div>' +
      partnerRow(ev, obj, a, callBtn) +
      '<div class="row wrap gap4"><span class="xs muted" style="width:62px">Other</span>' + callBtn('rp', '1', 'Chase bonus RP') + callBtn('rp', '0', 'Just win') + callBtn('avoid', '1', 'Avoid contact') + callBtn('avoid', '0', 'Allow contact') + callBtn('reset', '1', 'Reset robot!', 'bad') + '</div></div>';
    return evRibbon(ev) + '<div class="row mb matchhead">' + UI.icon('event', 18) + '<b>' + h(UI.matchLabel(ev, obj)) + '</b><span class="xs muted">' + h(ev.name) + '</span><span class="sp"></span>' + (obj.playoff && ev.kind !== 'einstein' ? lossTag(ev) : '') + '</div>' +
      '<div class="scorebar"><div class="score r" id="scR">0</div><div class="clock"><div class="t" id="clk">0:00</div><div class="p" id="phs">AUTO</div></div><div class="score b" id="scB">0</div></div>' + liveVs(ev) +
      '<div class="matchview"><div><div class="card' + (spec ? ' hidden' : '') + '" style="padding:10px"><div class="ct sm">Your robot</div><div id="myBox"></div></div><div class="card' + (spec ? '' : ' mt') + '" style="padding:10px"><div class="ct sm">Robots</div><div id="robBox"></div></div></div>' +
      '<div><div class="fieldwrap">' + fieldTag(ev) + '<canvas id="fieldCv" width="1100" height="547"></canvas></div>' +
      '<div class="card mt" style="padding:10px"><div class="row mb"><b>' + (spec ? 'Livestream ' + UI.tag('LIVE', 'bad') : 'Coach Calls') + '</b> <span class="tag acc' + (spec ? ' hidden' : '') + '" id="callsLeft"></span><span class="sp"></span><div class="row gap4" id="spd">' +
      ['0', '1', '2', '4', '8'].map(s => '<button class="btn sm" data-act="spd" data-arg="' + s + '">' + (s === '0' ? '❚❚' : s + '×') + '</button>').join('') + '<button class="btn sm" data-act="skipLive">Skip ⏭</button></div></div>' + (spec ? '<div class="sm muted">You are watching the stream: nobody on your team is on the field, so there are no coach calls. Change the speed, pause, or skip to the end of the match.</div>' : calls) + '<div class="row mt"><span class="sp"></span><button class="btn primary hidden" id="liveDone" data-act="liveDone">' + (spec ? 'Back to the stream ▶' : 'Results ▶') + '</button></div></div></div>' +
      '<div><div class="card" style="padding:10px"><div class="ct sm">Ranking points</div><div id="rpBox"></div></div><div class="card mt" style="padding:10px"><div class="ct sm">Match log</div><div class="log" id="logBox"></div></div></div></div>';
  }, after() { UI.startLive(); } };

  UI.startLive = function () {
    const ev = Ev(), c = UI.st.match, obj = curMatchObj();
    if (!obj) return;
    const m = G.Ev.buildEngine(ev, obj, { headless: false });
    const cv = document.getElementById('fieldCv');
    UI.live = { m, c, obj, ev, speed: UI.prefs.speed || 2, acc: 0, last: 0, raf: 0, domT: 0, cv, ctx: cv.getContext('2d'), a: obj.red.includes(me()) ? 'red' : 'blue', recorded: false };
    markSpeed();
    UI.live.raf = requestAnimationFrame(loop);
  };
  UI.stopLive = function () { if (UI.live) { cancelAnimationFrame(UI.live.raf); UI.live = null; } };
  function loop(ts) {
    const L = UI.live; if (!L) return;
    if (!L.last) L.last = ts;
    const dt = Math.min(0.1, (ts - L.last) / 1000); L.last = ts;
    if (L.speed > 0 && !L.m.done) {
      L.acc += dt * L.speed;
      let n = 0;
      while (L.acc >= 0.1 && !L.m.done && n < 200) { G.Engine.step(L.m); L.acc -= 0.1; n++; }
    }
    draw(L);
    if (ts - L.domT > 180 || L.m.done) { dom(L); L.domT = ts; }
    if (L.m.done) { const b = document.getElementById('liveDone'); if (b) b.classList.remove('hidden'); }
    L.raf = requestAnimationFrame(loop);
  }
  function aimFor(m, r) {
    if (m.R.aimAt) return m.R.aimAt(m, r); // the classic games name their own target
    if (m.year === 2022) return m.hub; if (m.year === 2024) return m.spk[r.a]; if (m.year === 2026) return m.hub[r.a]; return null;
  }
  function draw(L) {
    const m = L.m, ctx = L.ctx, s = L.cv.width / G.Engine.FW;
    G.Render.field(ctx, m.year, s, m);
    const al = m.done ? 1 : U.clamp(L.acc / 0.1, 0, 1);
    m.robots.forEach(r => {
      // mechanisms that reach out to place or load (the pivoting telescope, the turreted elevator): ease the reach in and out
      { const tg = !r.dead && r.st === 'act' && /^(Placing|Loading|Scoring)/.test(r.label || '') ? 1 : 0; r.vx = r.vx == null || m.done ? tg : r.vx + (tg - r.vx) * 0.14; }
      const rr = Object.create(r);
      rr.x = r.px + (r.x - r.px) * al; rr.y = r.py + (r.y - r.py) * al;
      if (r.isPlayer) rr.look = Object.assign({}, r.look);
      const g = aimFor(m, r);
      G.Render.robot(ctx, s, rr, { aim: g ? Math.atan2(g.y - rr.y, g.x - rr.x) : null, year: m.year });
    });
    G.Render.fx(ctx, s, m);
  }
  function dom(L) {
    const m = L.m, $ = id => document.getElementById(id);
    if (!$('scR')) return;
    const sr = m.score.red, sb = m.score.blue;
    const tot = s => s.auto + s.tele + s.end + s.foul;
    $('scR').textContent = tot(sr); $('scB').textContent = tot(sb);
    const tl = m.phase === 'auto' ? m.T.auto - m.t : m.total - m.t;
    $('clk').textContent = U.fmtTime(tl);
    let ph = m.done ? 'FINAL' : m.phase === 'auto' ? 'AUTONOMOUS' : m.inEnd ? 'ENDGAME' : 'TELEOP';
    if (m.year === 2026 && !m.done) { const si = G.Rules[2026].shiftInfo(m); ph = si.name + ' · ' + (G.Rules[2026].active(m, 'red') ? 'RED' : '') + (G.Rules[2026].active(m, 'blue') ? ' BLUE' : '') + ' active'; }
    $('phs').textContent = ph;
    const meR = m.robots.find(r => r.isPlayer);
    if (meR) {
      const H = G.Engine.PACE[meR.plan.pace].name;
      $('myBox').innerHTML = '<div class="rbox me"><div class="hd"><span>' + meR.team + '</span><span class="xs">' + h(H) + '</span></div><div class="b">' + h(meR.label || '') + '</div><div class="xs muted">Holding: ' + (meR.held || 0) + (meR.heldType ? ' ' + meR.heldType : '') + ' · role ' + h(meR.plan.role) + ' · target ' + h(meR.plan.target) + '</div>' +
        '<div class="xs muted">Points: ' + meR.stats.pts + ' · shots ' + meR.stats.hits + '/' + meR.stats.shots + '</div>' + (meR.stats.faults.length ? '<div class="xs warn">' + h(meR.stats.faults.join(', ')) + '</div>' : '') + '</div>';
    }
    $('robBox').innerHTML = m.robots.filter(r => !r.isPlayer).map(r => '<div class="rbox"><div class="hd"><span class="' + r.a + '">' + r.team + '</span><span class="xs muted">' + r.stats.pts + ' pts</span></div><div class="xs">' + h(r.label || '') + '</div></div>').join('');
    const R = m.R;
    const bon = a => R.bonus(m, a).map(b => '<div class="rp-item"><div class="row"><span>' + h(b.name) + '</span><span class="sp"></span><span class="' + (b.ok ? 'good b' : 'muted') + '">' + b.val + '/' + b.thr + (b.ok ? ' ✔' : '') + '</span></div>' + UI.bar(b.val, b.thr, a === 'red' ? 'var(--red)' : 'var(--blue)') + '</div>').join('');
    const hud = a => (R.hud ? R.hud(m, a) : []).map(x => UI.tag(x, a === 'red' ? 'bad' : 'info')).join(' ');
    $('rpBox').innerHTML = '<div class="xs red b mb">RED ' + hud('red') + '</div>' + bon('red') + '<div class="hr"></div><div class="xs blue b mb">BLUE ' + hud('blue') + '</div>' + bon('blue');
    $('logBox').innerHTML = m.log.slice(-60).reverse().map(l => '<div class="' + l.kind + '"><span class="dim">' + U.fmtTime(l.t) + '</span> ' + h(l.msg) + '</div>').join('');
    const left = m.calls - m.callsUsed;
    $('callsLeft').textContent = left + ' left';
    document.querySelectorAll('[data-act="call"]').forEach(b => b.disabled = left <= 0 || m.done);
  }
  function markSpeed() { const L = UI.live; document.querySelectorAll('#spd [data-act="spd"]').forEach(b => b.classList.toggle('sel', Number(b.dataset.arg) === (L ? L.speed : -1))); }
  UI.A.spd = s => { if (!UI.live) return; UI.live.speed = Number(s); if (Number(s) > 0) { UI.prefs.speed = Number(s); G.Save.saveSettings(UI.prefs); } markSpeed(); };
  UI.A.skipLive = () => { const L = UI.live; if (!L) return; G.Engine.run(L.m); L.acc = 0; };
  // Playoffs only: an alliance captain can call partners to score or defend (costs a Coach Call each).
  function isCaptain(ev) {
    const c = UI.st.match, pa = G.Ev.playerAlliance(ev);
    return !!(c && c.kind === 'po' && pa >= 0 && ev.alliances[pa][0] === me());
  }
  function partnerRow(ev, obj, a, callBtn) {
    if (!(UI.st.match && UI.st.match.kind === 'po')) return '';
    if (!isCaptain(ev)) return '<div class="xs dim">Only the alliance captain can make calls to partners.</div>';
    return '<div class="row wrap gap4"><span class="xs muted" style="width:62px">Partners</span>' +
      obj[a].filter(t => t !== me()).map(t => callBtn('partner', t + ':score', t + ': score') + callBtn('partner', t + ':defend', t + ': defend')).join('') + '</div>';
  }
  UI.A.call = function (arg) {
    const L = UI.live; if (!L) return;
    let [kind, value] = arg.split('|');
    if (kind === 'partner') {
      if (!isCaptain(L.ev)) return UI.toast('Only the alliance captain can call partners.', 'bad');
      const [t, role] = value.split(':');
      const ok = G.Engine.call(L.m, Number(t), { kind: 'role', value: { role }, text: 'Partner ' + t + ': ' + (role === 'defend' ? 'play defense' : 'score') });
      if (!ok) UI.toast('No coach calls left', 'bad');
      dom(L); return;
    }
    let text = kind + ' ' + value, v = value;
    if (kind === 'role') { if (value.startsWith('defend:')) { v = { role: 'defend', target: Number(value.split(':')[1]) }; text = 'Defend ' + value.split(':')[1]; } else { v = { role: value }; text = value === 'feed' ? 'Feed' : 'Score'; } }
    else if (kind === 'pace') text = 'Pace: ' + G.Engine.PACE[value].name;
    else if (kind === 'target') { const t = G.Seasons[L.m.year].coachTargets.find(x => x.id === value); text = 'Target: ' + (t ? t.name : value); }
    else if (kind === 'endNow') text = 'Go to endgame now';
    else if (kind === 'endTiming') text = 'Endgame: go late';
    else if (kind === 'endLevel') { v = Number(value); text = 'Endgame: aim ' + G.Seasons[L.m.year].endNames[v]; }
    else if (kind === 'rp' || kind === 'avoid') { v = value === '1'; text = kind === 'rp' ? (v ? 'Chase bonus RP' : 'Just win') : (v ? 'Avoid contact' : 'Allow contact'); }
    else if (kind === 'reset') text = 'Reset the robot!';
    const ok = G.Engine.call(L.m, me(), { kind, value: v, text });
    if (!ok) UI.toast('No coach calls left', 'bad');
    dom(L);
  };
  UI.A.liveDone = function () {
    const L = UI.live; if (!L || !L.m.done || L.recorded) return;
    L.recorded = true;
    const res = L.m.result, ev = L.ev, c = L.c, obj = L.obj;
    UI.stopLive();
    recordResult(ev, c, obj, res);
  };

  // =====================================================================
  // MATCH RESULT
  // =====================================================================
  // The event page's match buttons again on the result page, in the same place: play or simulate the next match without going back
  function resultActions(ev) {
    if (!ev) return '';
    const more = ev.stage === 'quals' ? !!ev.quals.slice(ev.qi).find(G.Ev.hasPlayer) : ev.stage === 'playoffs' && G.Ev.playerAlliance(ev) >= 0 && !G.Ev.playerEliminated(ev) && !(ev.po && ev.po.done);
    const btns = !more ? '<button class="btn primary" data-act="nav" data-arg="event">Continue ▶</button>'
      : ev.stage === 'quals' ? '<button class="btn primary" data-act="nextQual">Prepare match ▶</button><button class="btn" data-act="simQual">Simulate it</button><button class="btn" data-act="simAllQuals">Simulate all remaining</button><button class="btn" data-act="nav" data-arg="event">Event page</button>'
        : '<button class="btn primary" data-act="nextPO">Next playoff match ▶</button><button class="btn" data-act="simPO">Simulate my next match</button><button class="btn" data-act="nav" data-arg="event">Event page</button>';
    return '<div class="card hl mt">' + (more ? nextStrip(ev) : '') + '<div class="row wrap">' + btns + '</div></div>';
  }
  UI.S.mresult = { nav: 'event', html() {
    const R = UI.st.lastResult; if (!R) return '<button class="btn" data-act="nav" data-arg="event">Back</button>';
    const res = R.res, obj = R.obj, a = obj.red.includes(me()) ? 'red' : 'blue', o2 = a === 'red' ? 'blue' : 'red';
    const w = res[a].win;
    const ev = Ev();
    let o = evRibbon(ev) + '<div class="row"><div><div class="xs muted">' + h(UI.matchLabel(ev, Object.assign({ playoff: R.kind !== 'qual' }, obj)).toUpperCase()) + (R.kind !== 'qual' && ev && ev.po && !ev.po.done ? ' · ' + lossTag(ev) : '') + '</div><h1 class="' + (w === 1 ? 'good' : w === 0 ? 'bad' : 'warn') + '" style="font-size:34px">' + (w === 1 ? 'VICTORY' : w === 0 ? 'DEFEAT' : 'TIE') + '</h1>' +
      (res.tiebreak ? '<div class="sm">Tied ' + res.red.score + '–' + res.blue.score + ': decided by <b>' + h(res.tiebreak) + '</b>' + (res.tieVals ? ' (' + res.tieVals.red + '–' + res.tieVals.blue + ')' : '') + ', the FRC playoff tiebreaker.</div>' : res.replay ? '<div class="sm warn">Tied on every tiebreaker (fouls, auto and endgame points): the match will be replayed.</div>' : '') + '</div><span class="sp"></span><div class="score r">' + res.red.score + '</div><div class="score b">' + res.blue.score + '</div></div>';
    o += resultActions(ev);
    o += '<div class="grid g2 mt"><div class="card"><div class="ct">Score breakdown</div><table class="t"><tr><th></th><th class="num red">Red</th><th class="num blue">Blue</th></tr>' +
      [['Auto', 'auto'], ['Teleop', 'tele'], ['Endgame', 'end'], ['Fouls received', 'foul'], ['Total', 'score']].map(x => '<tr><td>' + x[0] + '</td><td class="num">' + res.red[x[1]] + '</td><td class="num">' + res.blue[x[1]] + '</td></tr>').join('') + '</table>' +
      (R.kind === 'qual' ? '<div class="hr"></div><div class="b">You earned ' + res[a].rp + ' RP</div>' + res[a].bonus.map(b => '<div class="sm">' + (b.ok ? '<span class="good">✔</span> ' : '<span class="dim">✘</span> ') + h(b.name) + ' <span class="muted">(' + b.val + '/' + b.thr + ')</span></div>').join('') : '') + '</div>';
    o += '<div class="card"><div class="ct">Robots</div><table class="t"><tr><th>Team</th><th class="num">Pts</th><th class="num">Cycles</th><th class="num">Acc</th><th>Endgame</th><th>Issues</th></tr>' + res.robots.map(r => '<tr class="' + (r.team === me() ? 'me' : '') + '"><td class="' + r.a + '">' + r.team + '</td><td class="num">' + r.pts + '</td><td class="num">' + r.cycles + '</td><td class="num">' + (r.shots ? Math.round(100 * r.hits / r.shots) + '%' : '—') + '</td><td class="xs">' + (r.end ? (r.end.lvl ? G.Seasons[ev ? ev.year : G.S.year].endNames[r.end.lvl] : r.end.failed ? 'failed' : 'park') : '—') + '</td><td class="xs warn">' + h(r.faults.concat(r.fouls ? [r.fouls + ' foul' + (r.fouls > 1 ? 's' : '')] : []).join(', ')) + (r.autoOK === false ? ' <span class="dim">auto miss</span>' : '') + '</td></tr>').join('') + '</table></div></div>';
    if (G.S.robot) { const RB = G.S.robot; o += '<div class="card mt"><div class="ct">Robot condition after the match</div><div class="grid g3">' + Object.keys(RB.subs).filter(k => k !== 'soft' && RB.subs[k].ver).map(k => UI.stat(G.Seasons.sub(RB.year, k).name, RB.subs[k].cond, null, UI.colorFor(RB.subs[k].cond))).join('') + '</div><div class="xs muted">Pit repairs happen automatically before your next match (more time between matches = more repairs; uses spare parts).</div></div>'; }
    if (UI.wonEvent(ev, R)) o = '<div class="card hl mb"><div class="row">' + UI.icon('trophy', 26) + '<div><div class="lg b acc">' + (ev.kind === 'einstein' ? 'WORLD CHAMPIONS!' : ev.kind === 'champs' ? 'Division Champions!' : 'Event winners!') + '</div><div class="sm muted">' + h(ev.name) + '</div></div></div></div>' + o;
    o += '<div class="row mt"><span class="sp"></span><button class="btn lg" data-act="nav" data-arg="event">Back to the event page ▶</button></div>';
    return o;
  }, after() {
    const R = UI.st.lastResult, ev = Ev();
    if (!R || !ev || !UI.wonEvent(ev, R)) return;
    // the match that won Einstein: straight to the World Champions celebration
    if (ev.kind === 'einstein' && !ev.wcShown && G.S.season.wc) { ev.wcShown = true; ev.party = true; R.party = true; return UI.worldChampModal(G.S.season.wc); }
    if (!R.party) { R.party = true; UI.confetti(); }
  } };
  // This result is the match that won the event for the player's alliance
  // ---------------- World Champions celebration ----------------
  const TROPHY = '<svg class="wc-trophy" viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="wcg" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#9c700c"/><stop offset=".42" stop-color="#ffe9a0"/><stop offset=".58" stop-color="#f5c542"/><stop offset="1" stop-color="#8a6209"/></linearGradient>' +
    '<linearGradient id="wcs" x1="0" x2="1"><stop offset="0" stop-color="rgba(255,255,255,0)"/><stop offset=".5" stop-color="rgba(255,255,255,.75)"/><stop offset="1" stop-color="rgba(255,255,255,0)"/></linearGradient><clipPath id="wcc"><path d="M34 16h52v20c0 21-11 35-26 37-15-2-26-16-26-37z"/></clipPath></defs>' +
    '<path d="M35 23H19c0 17 8 26 19 28M85 23h16c0 17-8 26-19 28" fill="none" stroke="url(#wcg)" stroke-width="6" stroke-linecap="round"/>' +
    '<path d="M34 16h52v20c0 21-11 35-26 37-15-2-26-16-26-37z" fill="url(#wcg)"/><g clip-path="url(#wcc)"><rect class="wc-glint" x="-40" y="0" width="30" height="80" fill="url(#wcs)" transform="skewX(-20)"/></g>' +
    '<path d="M60 27l3.6 7.4 8.1 1.2-5.9 5.7 1.4 8.1L60 45.6l-7.2 3.8 1.4-8.1-5.9-5.7 8.1-1.2z" fill="#fff6d1"/>' +
    '<rect x="54" y="72" width="12" height="13" fill="url(#wcg)"/><path d="M40 85h40l5 11H35z" fill="url(#wcg)"/><rect x="31" y="96" width="58" height="11" rx="2" fill="#4a3305"/><rect x="44" y="99" width="32" height="5" rx="1" fill="#c99a2e"/></svg>';
  const NUMW = ['', '', 'Two', 'Three', 'Four', 'Five', 'Six'];
  const cq = q => '<div class="wc-q">“' + h(q[0]) + '”<span>— ' + h(q[1]) + '</span></div>';
  // d: the snapshot made when the title was won (Career.wcData); replay: reopened from History
  UI.worldChampModal = function (d, replay) {
    if (!d) return;
    const B = x => '<b class="wc-name">' + h(x) + '</b>';
    const streak = d.streak, titles = d.titles, year = d.year, me0 = d.team.num;
    const consec = d.syears.every((y, i) => !i || y === d.syears[i - 1] + 1);
    const yearTxt = streak < 2 ? String(year) : consec ? d.syears[0] + '–' + d.syears[d.syears.length - 1] : d.syears.slice(0, -1).join(', ') + ' & ' + d.syears[d.syears.length - 1];
    const label = streak === 2 ? 'BACK-TO-BACK WORLD CHAMPIONS' : streak === 3 ? 'THREE-PEAT WORLD CHAMPIONS' : streak > 3 ? streak + '-IN-A-ROW WORLD CHAMPIONS' : 'WORLD CHAMPIONS';
    const role = ['captain', 'first pick', 'second pick', 'backup'][d.alliance.findIndex(x => x.num === me0)] || 'alliance member';
    // the line under the headline: history made, a title won back, or last year's final put right
    const note = streak >= 3 ? (NUMW[streak] || streak) + ' in a row · no one has done it in decades'
      : streak === 2 ? 'Only a few teams in FRC history have done it'
        : titles > 1 ? U.ord(titles) + ' world title' + (d.lastTitleYear ? ' · first since ' + d.lastTitleYear : '') + (d.lastFinalist ? ' · finalists last year' : '')
          : d.rookie ? 'Rookie team · World Champions at the first attempt' : d.lastFinalist ? 'Finalists last year · champions now' : '';
    const lead = streak === 2 ? 'Last season\'s champions did it again. Only a few teams have done it before in FRC history.'
      : streak >= 3 ? (NUMW[streak] || streak) + ' world titles in a row. No one has done it in the past decades.'
        : titles > 1 ? 'World Champions again: this is your ' + U.ord(titles) + ' title' + (d.lastTitleYear ? ', and the first since ' + d.lastTitleYear : '') + '. Winning it once is a great season. Winning it again is a program.' + (d.lastFinalist ? ' It also settles last year\'s lost final.' : '')
          : d.lastFinalist ? 'A year ago you stood on Einstein and watched the confetti fall on the other alliance. This time it is yours.'
            : 'From the game reveal in January to the last buzzer on Einstein, this is the season every team dreams about.';
    const story = h(lead) + (d.rookie ? ' In your rookie season, no less: the whole pit area is talking about it.' : '') +
      ' As ' + role + ' of the ' + h(d.div || 'division') + ' champions, your alliance won the Einstein finals ' + d.fw + '–' + d.fl + (d.opp ? ' against ' + h((d.opp.div ? d.opp.div + ' ' : '') + 'captain ' + d.opp.num + ' ' + d.opp.name) : '') + ' in ' + h(d.game || 'this game') + '. ' +
      B(d.driver) + ' at the controls' + (d.coach ? ' and ' + B(d.coach) + ' calling every play' + (d.coachIsMentor ? ' from behind the glass' : '') : '') + ', with a whole team in the stands that can barely speak.';
    const egg = D.REAL_CHAMPS[d.gyear];
    const eggTxt = egg ? (function () {
      if (egg.none) return egg.none;
      const list = e => e.teams.map(t => t[0] + ' ' + t[1]).join(', ').replace(/, ([^,]*)$/, ' and $1'), all = egg.teams.concat(egg.also ? egg.also.teams : []);
      return 'In the real ' + d.gyear + ' season (' + (d.game || 'that game') + '), ' + (egg.also ? 'there were two Championships. In ' + egg.city + ' Einstein was won by the ' + egg.div + ' division alliance: ' + list(egg) + '. In ' + egg.also.city + ' it was the ' + egg.also.div + ' division alliance: ' + list(egg.also) + '.' + (egg.also.note ? ' ' + egg.also.note : '')
        : 'Einstein was won by the ' + egg.div + ' division alliance: ' + list(egg) + '.') + (all.some(t => t[0] === me0) ? ' Your team number is on that list too. Coincidence?' : ''); })() : '';
    // twinkling stars around the trophy and title only (never behind the text further down)
    const stars = Array.from({ length: 14 }, (_, i) => { const left = i % 2 ? 4 + (i * 7) % 22 : 74 + (i * 5) % 22; return '<i class="wc-star" style="left:' + left + '%;top:' + (14 + (i * 37) % 190) + 'px;animation-delay:' + (i * 0.23).toFixed(2) + 's"></i>'; }).join('');
    const dl = (t, cls) => '<div class="wc-in ' + (cls || '') + '" style="animation-delay:' + t + 's">';
    UI.modal('<div class="wc"><div class="wc-rays"></div>' + stars +
      dl(0.05) + TROPHY + '</div>' +
      dl(0.35, 'wc-kicker') + 'EINSTEIN · ' + (d.fict ? '' : h(String(d.gyear)) + ' ') + h((d.game || '').toUpperCase()) + '</div>' +
      dl(0.5, 'wc-team') + me0 + ' · ' + h(String(d.team.name).toUpperCase()) + '</div>' +
      dl(0.65, 'wc-you') + 'YOU ARE THE</div>' +
      '<div class="wc-title">' + yearTxt + ' ' + label + '</div>' +
      (note ? dl(0.9, 'wc-note') + h(note) + '</div>' : '') +
      dl(1.0, 'wc-bn') + UI.banner({ gold: true, award: streak >= 2 ? 'World Champions ×' + streak : 'World Champions', year, event: 'Einstein · ' + (d.div || '') }, !replay) + '</div>' +
      dl(1.2, 'wc-msg') + story + '</div>' +
      dl(1.4, 'wc-al') + d.alliance.map((t, i) => '<span class="wc-chip' + (t.num === me0 ? ' me' : '') + '"><b>' + t.num + '</b> ' + h(t.name) + '<small>' + ['Captain', '1st pick', '2nd pick', 'Backup'][i] + '</small></span>').join('') + '</div>' +
      dl(1.6, 'wc-qs') + '<div class="wc-h">WHAT PEOPLE ARE SAYING</div>' + (d.quotes || []).map(cq).join('') + '</div>' +
      dl(1.8) + '<button class="btn primary lg wc-btn" data-act="wcClose">' + UI.icon('trophy', 18) + (replay ? ' Close' : ' Celebrate!') + '</button></div>' +
      (eggTxt ? dl(2.0, 'wc-egg') + '<b>Easter egg</b> · ' + h(eggTxt) + '</div>' : '') +
      '</div>', { wide: true, lock: !replay, cls: 'wcm' });
    UI.confetti(replay ? 4500 : 7000); if (!replay) { setTimeout(() => UI.confetti(6000), 2200); setTimeout(() => UI.confetti(5000), 5200); }
  };
  UI.A.wcClose = () => { UI.closeModal(); const ev = Ev(); if (ev && UI.screen === 'event') UI.ceremony(ev); };

  // ---------------- FIRST Impact Award (Championship) ----------------
  const LAUREL = '<svg class="ic-medal" viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="icg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#fff7d6"/><stop offset=".5" stop-color="#f5c542"/><stop offset="1" stop-color="#b8860b"/></linearGradient></defs>' +
    [-1, 1].map(sx => '<g transform="translate(60 62) scale(' + sx + ' 1)">' + [0, 1, 2, 3, 4, 5, 6].map(i => { const deg = 244 - i * 22, a = deg * Math.PI / 180, x = Math.cos(a) * 43, y = -Math.sin(a) * 43; return '<ellipse class="ic-leaf" style="animation-delay:' + (0.2 + i * 0.08) + 's" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" rx="9.5" ry="4.2" transform="rotate(' + (-(deg + 90) - 28) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')" fill="url(#icg)"/>'; }).join('') + '</g>').join('') +
    '<circle cx="60" cy="58" r="25" fill="#0b3f78" stroke="url(#icg)" stroke-width="4"/><path d="M60 40l5.3 10.8 11.9 1.7-8.6 8.4 2 11.9L60 67.2l-10.6 5.6 2-11.9-8.6-8.4 11.9-1.7z" fill="url(#icg)"/>' +
    '<path d="M46 96l14-8 14 8v14l-14-7-14 7z" fill="#0a74c7" stroke="url(#icg)" stroke-width="2"/></svg>';
  // d: the snapshot made when the award was announced (Career.impactCele), kind 'winner' or 'finalist'
  UI.impactCele = function (d, replay) {
    if (!d) return;
    const B = x => '<b class="wc-name">' + h(x) + '</b>', win = d.kind === 'winner';
    const dl = (t, cls) => '<div class="wc-in ' + (cls || '') + '" style="animation-delay:' + t + 's">';
    const sparks = Array.from({ length: 12 }, (_, i) => '<i class="ic-spark" style="left:' + (6 + (i * 29) % 88) + '%;animation-delay:' + (i * 0.37).toFixed(2) + 's;animation-duration:' + (4 + (i % 4)) + 's"></i>').join('');
    const sp = d.speakers || [];
    const story = (win
      ? 'After Einstein Final 1 the head judge read one team number, and it was yours. The FIRST Impact Award goes to the team that best shows what the program is for: not the robot, but everything around it. '
      : 'Before Einstein Final 1 the judges named six teams from the whole world as FIRST Impact Award Finalists, and yours was one of them. ') +
      (sp.length ? B(sp[0]) + (sp[1] ? ' and ' + B(sp[1]) : '') + ' presented your story to the judges' + (d.mentor ? ', coached by ' + B(d.mentor) : '') + '. ' : '') +
      'Behind it: ' + [d.outreach ? d.outreach + ' outreach event' + (d.outreach === 1 ? '' : 's') + ' this season' : '', d.programs ? d.programs + ' feeder program' + (d.programs > 1 ? 's' : '') : '', (d.seasons > 1 ? d.seasons + ' seasons' : 'a season') + ' of steady work'].filter(Boolean).join(', ').replace(/, ([^,]*)$/, ' and $1') + '.' +
      (win ? ' Your team joins the <b>Hall of Fame</b> and is invited to every future Championship.' : ' A blue banner goes on your wall, and the judges will remember the name.');
    const others = win ? (d.finalists || []) : (d.finalists || []);
    UI.modal('<div class="wc ic"><div class="ic-halo"></div>' + sparks +
      dl(0.05) + LAUREL + '</div>' +
      dl(0.35, 'wc-kicker') + 'FIRST CHAMPIONSHIP · ' + h(String(d.year)) + '</div>' +
      dl(0.5, 'wc-team') + d.team.num + ' · ' + h(String(d.team.name).toUpperCase()) + '</div>' +
      dl(0.65, 'wc-you') + (win ? 'YOU WON THE' : 'YOU ARE A') + '</div>' +
      '<div class="wc-title ic-title">' + (win ? 'FIRST IMPACT AWARD' : 'FIRST IMPACT AWARD FINALIST') + '</div>' +
      dl(0.9, 'wc-note') + (win ? 'The most prestigious award in the program · Hall of Fame' : 'One of six in the world') + '</div>' +
      dl(1.0, 'wc-bn') + UI.banner({ gold: win, award: win ? 'FIRST Impact Award' : 'FIRST Impact Award Finalist', year: d.year, event: 'FIRST Championship' }, !replay) + '</div>' +
      dl(1.2, 'wc-msg') + story + '</div>' +
      dl(1.4, 'wc-al') + '<span class="wc-chip me"><b>' + d.score + '</b> Impact rating<small>out of 100</small></span><span class="wc-chip"><b>' + d.outreach + '</b> outreach events<small>this season</small></span><span class="wc-chip"><b>' + d.programs + '</b> feeder programs<small>running</small></span></div>' +
      (others.length ? dl(1.5, 'ic-list') + (win ? 'Finalists: ' : 'The six Finalists: ') + others.map(t => (t.num === d.team.num ? '<b class="wc-name">' + t.num + ' ' + h(t.name) + '</b>' : t.num + ' ' + h(t.name))).join(' · ') + (win ? '' : '. Winner: ' + d.winner.num + ' ' + h(d.winner.name)) + '</div>' : '') +
      dl(1.6, 'wc-qs') + '<div class="wc-h">WHAT PEOPLE ARE SAYING</div>' + (d.quotes || []).map(cq).join('') + '</div>' +
      dl(1.8) + '<button class="btn primary lg wc-btn" data-act="wcClose">' + UI.icon('trophy', 18) + (replay ? ' Close' : win ? ' Celebrate!' : ' Continue') + '</button></div>' +
      '</div>', { wide: true, lock: !replay, cls: 'wcm icm' });
    UI.confetti(win ? 6000 : 3500); if (win && !replay) setTimeout(() => UI.confetti(5000), 2400);
  };
  // The announcement when your team is not the one being called (Einstein only)
  function impactAnnounce(stage) {
    const S = G.S, ci = S.season.cmpImpact, nm = n => n + ' ' + h(n === me() ? S.team.name : tname(n) || ((S.teams[n] || {}).name || ''));
    const body = stage === 'fin'
      ? '<div class="xs b acc">AWARDS · BEFORE EINSTEIN FINAL 1</div><h2>FIRST Impact Award Finalists</h2><p class="muted">The judges call six teams from around the world onto the field. Each of them hangs a blue banner tonight.</p>' +
        '<div class="col">' + ci.finalists.map(n => '<div class="card flat">' + UI.icon('trophy', 14) + ' <b>' + nm(n) + '</b></div>').join('') + '</div>' +
        '<p class="sm muted mt">' + (ci.eligible ? 'Your team is not among the six. One award is still to come: the winner is announced after Final 1.' : 'The winner is announced after Final 1.') + '</p>'
      : '<div class="xs b acc">AWARDS · AFTER EINSTEIN FINAL 1</div><h2>FIRST Impact Award</h2><p class="muted">The most prestigious award in the program goes to…</p>' +
        '<div class="card hl" style="text-align:center"><div class="xl b">' + nm(ci.winner) + '</div><div class="sm muted">Hall of Fame · ' + G.Career.calYear(S) + '</div></div>' +
        '<p class="sm muted mt">' + (ci.out === 'finalist' ? 'Your team stays a Finalist, with a blue banner of its own.' : ci.eligible ? 'Your entry placed ' + U.ord(ci.rank) + ' of ' + ci.of + '.' : 'Win a regional Impact Award to be judged here next time.') + '</p>';
    UI.modal(body + '<div class="row mt"><span class="sp"></span><button class="btn primary" data-act="wcClose">Back to the field</button></div>', { lock: true });
  }
  // ---------------- The Festival of Champions (July 2017) ----------------
  // What the real event was, in four short paragraphs (FIRST's own announcements and the event's results).
  const FEST_REAL = [
    'In the real 2017 season the FIRST Championship was held twice for the first time: in Houston, and a week later in St. Louis. Each crowned its own winning alliance, so nobody could say which of the two was the best in the world. Teams asked for one more event to settle it.',
    'FIRST tried it once, as a pilot. On 28 and 29 July 2017 the two winning alliances met in Manchester, New Hampshire, the city where FIRST has its headquarters, and played a best-of-five on a single field. The Chairman\'s Award winners of both Championships were the guests of honour.',
    'The Houston champions won the first two matches. The St. Louis champions then won three in a row, the last of them 588 to 310, and took the series three matches to two.',
    'It was never held again. In February 2018 FIRST announced that the pilot would not be repeated: the winners already felt like champions without it, and one more trip in the summer was more than many teams could afford. Since 2018 the winners of each Championship are simply champions.'
  ];
  // Shown once, on arriving at the event (only a champion alliance ever gets here)
  UI.festivalIntro = function (ev) {
    const F = G.S.festival || {}, col = '#f5c542', live = !!(ev && ev.stream), c = (ev && ev.divNames) || [];
    UI.modal('<div class="xs b" style="color:' + col + ';letter-spacing:.08em">FESTIVAL OF CHAMPIONS · THE REAL STORY</div><h2>One summer, and never again</h2>' +
      FEST_REAL.map(p => '<p class="story-p">' + h(p) + '</p>').join('') +
      '<div class="card flat mb" style="border-left:3px solid ' + col + '"><div class="xs muted b">' + (live ? 'ON THE STREAM' : 'HERE, IN YOUR CAREER') + '</div><ul class="story-ul">' +
      (live ? ['The ' + (c[0] || 'two') + ' and ' + (c[1] || '') + ' champions play a best of five. The first to win three matches is the one champion alliance of the year.',
        'Your team is not in it: you are watching the stream, and nothing is at stake for you.',
        'Watch each match on the field, or skip to a result. You can close the stream at any time; the series goes on without you.']
        : ['Your alliance, the ' + (F.city || '') + ' champions, plays the ' + (F.otherCity || 'other') + ' champions. The first to win three matches is the one champion alliance of ' + (F.cy || 2017) + '.',
        'There are no qualification matches, no alliance selection and no awards: the series is the whole event.',
        'A champion alliance does not stay home: the event cannot be skipped. The organisers pay the trip for both alliances, so it costs you nothing.',
        'Win it for reputation, legacy and a banner no other team will ever hang. Lose it and you are still the World Champions of ' + (F.city || 'your Championship') + '.']).map(x => '<li>' + h(x) + '</li>').join('') + '</ul></div>' +
      '<div class="row mt"><span class="xs muted">' + (live ? 'Shown once, when the stream opens.' : 'Shown once, on arrival.') + '</span><span class="sp"></span><button class="btn primary" data-act="closeModal">' + (live ? 'Watch ▶' : 'To the field ▶') + '</button></div>', { wide: true });
  };
  // its own emblem: the two Championships as two rings that slide together, and one star where they meet
  const RINGS = '<svg class="fc-rings" viewBox="0 0 160 110" aria-hidden="true"><defs><linearGradient id="fcg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#fff7d6"/><stop offset=".5" stop-color="#f5c542"/><stop offset="1" stop-color="#b8860b"/></linearGradient></defs>' +
    '<circle class="fc-r1" cx="58" cy="55" r="40" fill="none" stroke="var(--fa)" stroke-width="7"/><circle class="fc-r2" cx="102" cy="55" r="40" fill="none" stroke="var(--fb)" stroke-width="7"/>' +
    '<path class="fc-star" d="M80 33l6.5 13.2 14.6 2.1-10.6 10.3 2.5 14.5L80 66.2l-13 6.9 2.5-14.5-10.6-10.3 14.6-2.1z" fill="url(#fcg)"/></svg>';
  // the series, one box a match (unplayed matches stay empty)
  const festStrip = (d, cls) => '<div class="fc-strip ' + (cls || '') + '">' + [0, 1, 2, 3, 4].map(i => { const g = d.games[i]; return '<span class="fc-g ' + (g ? (g.won ? 'w' : 'l') : 'no') + '"><small>MATCH ' + (i + 1) + '</small>' + (g ? '<b>' + g.mine + '</b><i>' + g.theirs + '</i>' : '<b>·</b><i>not needed</i>') + '</span>'; }).join('') + '</div>';
  // d: the snapshot made when the series ended (Career.festData), kind 'winner' or 'finalist'; replay: reopened later
  UI.festivalModal = function (d, replay) {
    if (!d) return;
    const B = x => '<b class="wc-name">' + h(x) + '</b>', win = d.kind === 'winner', n = d.games.length, me0 = d.team.num;
    const dl = (t, cls) => '<div class="wc-in ' + (cls || '') + '" style="animation-delay:' + t + 's">';
    const count = n >= 5 ? 'five' : n === 4 ? 'four' : 'three';
    const note = win ? h(d.city) + ' ' + d.w + '–' + d.l + ' ' + h(d.otherCity) + (d.comeback ? ' · from two matches down' : d.sweep ? ' · in three straight matches' : n >= 5 ? ' · decided in the fifth match' : '')
      : 'Festival of Champions finalists · ' + h(d.otherCity) + ' win the series ' + d.l + '–' + d.w;
    const story = win
      ? 'In April you won Einstein in ' + h(d.city) + '. So did another alliance, in ' + h(d.otherCity) + ', and for three months there were two world champions. Tonight, on one field in the middle of the summer, there was room for only one. ' +
        (d.comeback ? 'You lost the first two matches and did not lose again. ' : d.sweep ? 'It took three matches, and none of them was close to being enough for the other side. ' : n >= 5 ? 'It took all five matches, and the last one was yours. ' : 'It took four matches. ') +
        B(d.driver) + ' drove every one of them' + (d.coach ? ', with ' + B(d.coach) + ' calling the plays' : '') + '. There will never be another Festival, so there will never be another team that can say this.'
      : 'The ' + h(d.otherCity) + ' champions were the better alliance over ' + count + ' matches, and there is no shame anywhere in that sentence. ' + (d.letSlip ? 'You won the first two and could not find the third. ' : '') +
        'Only two alliances in the world were invited onto this field, and yours was one of them. ' + B(d.driver) + ' drove every match' + (d.coach ? ', with ' + B(d.coach) + ' behind the glass' : '') + '. The title you won on Einstein in ' + h(d.city) + ' is yours for good.';
    const chips = (list, lab) => list.map((t, i) => '<span class="wc-chip' + (t.num === me0 ? ' me' : '') + '"><b>' + t.num + '</b> ' + h(t.name) + '<small>' + (i ? lab : lab + ' · captain') + '</small></span>').join('');
    UI.modal('<div class="wc fc' + (win ? '' : ' fin') + '" style="--fa:' + h(d.team.c1 || '#f5b800') + ';--fb:#6aa9ff"><div class="fc-beams"></div>' +
      dl(0.05) + RINGS + '</div>' +
      dl(0.35, 'wc-kicker') + 'FESTIVAL OF CHAMPIONS · JULY ' + h(String(d.year)) + ' · MANCHESTER, NEW HAMPSHIRE</div>' +
      dl(0.5, 'wc-team') + me0 + ' · ' + h(String(d.team.name).toUpperCase()) + '</div>' +
      dl(0.65, 'wc-you') + (win ? 'TWO CHAMPIONSHIPS. ONE CHAMPION. YOU ARE' : 'YOU REMAIN THE') + '</div>' +
      '<div class="wc-title fc-title">' + (win ? 'THE ONE CHAMPION OF ' + h(String(d.year)) : h(String(d.year)) + ' WORLD CHAMPIONS OF ' + h(d.city.toUpperCase())) + '</div>' +
      dl(0.9, 'wc-note') + note + '</div>' +
      dl(1.0) + festStrip(d) + '</div>' +
      dl(1.1, 'wc-bn') + UI.banner({ gold: win, award: win ? 'Festival of Champions' : 'Festival of Champions Finalist', motto: win ? 'The one champion' : null, year: d.year, event: 'Manchester, New Hampshire' }, !replay) + '</div>' +
      dl(1.25, 'wc-msg') + story + '</div>' +
      dl(1.4, 'wc-al') + chips(d.alliance, d.city) + '</div>' +
      dl(1.5, 'wc-al fc-opp') + '<span class="fc-vs">against</span>' + chips(d.opp, d.otherCity) + '</div>' +
      dl(1.6, 'wc-qs') + '<div class="wc-h">WHAT PEOPLE ARE SAYING</div>' + (d.quotes || []).map(cq).join('') + '</div>' +
      dl(1.8) + '<button class="btn primary lg wc-btn" data-act="wcClose">' + UI.icon('trophy', 18) + (replay ? ' Close' : win ? ' Celebrate!' : ' Continue') + '</button></div>' +
      dl(2.0, 'wc-egg') + '<b>The real one</b> · ' + h(FEST_REAL[2]) + '</div>' +
      '</div>', { wide: true, lock: !replay, cls: 'wcm fcm' + (win ? '' : ' fin') });
    if (win) { UI.confetti(replay ? 4000 : 6500); if (!replay) { setTimeout(() => UI.confetti(5000), 1800); setTimeout(() => UI.confetti(5000), 4200); } }
  };
  UI.A.festAgain = () => { const F = G.S.festival; if (F && F.cele) UI.festivalModal(F.cele, true); };
  // the result page of the Festival: the series, the banner, and what the real one was
  function festDone(ev) {
    const S = G.S, F = S.festival || {}, d = F.cele;
    if (!d) return '<div class="card"><div class="ct">Festival of Champions</div><div class="row mt"><span class="sp"></span><button class="btn primary" data-act="leaveEvent">Leave event ▶</button></div></div>' + UI.bracket(ev);
    const win = d.kind === 'winner', list = l => l.map(t => tlink(t.num) + ' ' + h(t.name)).join(' · ');
    return '<div class="card hl mb"><div class="ct">' + (win ? 'A banner no other team will ever hang' : 'A banner from the only Festival ever played') + '<span class="sp"></span><span class="xs muted">Hung in your History banner wall, under Championship honours</span></div>' + UI.bannerWall([G.Career.festBanner(S)], true) + '</div>' +
      '<div class="grid g2"><div class="card hl"><div class="ct">Festival of Champions<span class="sp"></span><button class="btn sm" data-act="festAgain">' + UI.icon('trophy', 13) + ' Celebration</button></div>' +
      '<div class="xs muted b">' + (win ? 'THE ONE CHAMPION OF ' + d.year : d.year + ' WORLD CHAMPIONS OF ' + h(d.city.toUpperCase())) + '</div><div class="xl b ' + (win ? 'acc' : '') + '">' + (win ? 'Winners' : 'Finalists') + ' · ' + d.w + '–' + d.l + '</div>' + festStrip(d, 'left') +
      '<div class="kv mt"><span class="k">' + h(d.city) + ' champions</span><span>' + list(d.alliance) + '</span><span class="k">' + h(d.otherCity) + ' champions</span><span>' + list(d.opp) + '</span>' +
      '<span class="k">What it brought</span><span>' + (win ? '+10 reputation, +40 legacy, morale at its peak' : 'A series only two alliances in the world could play. The title from ' + h(d.city) + ' stays yours.') + '</span><span class="k">Cost</span><span>Nothing: the trip was paid for</span></div>' +
      '<div class="row mt"><span class="sp"></span><button class="btn primary" data-act="leaveEvent">Leave event ▶</button></div></div>' +
      '<div class="card"><div class="ct">The real Festival of Champions</div>' + FEST_REAL.slice(1).map(p => '<p class="sm muted">' + h(p) + '</p>').join('') + '</div></div>' +
      '<div class="mt">' + UI.bracket(ev) + '</div>';
  }
  // The series in the public message (the pop-up everybody gets, and its copy in the Inbox): the result up front, every
  // match with its winner, and the six teams as the world simulation has them (Career.festSeries)
  UI.festSeriesBox = function (s, tag, col) {
    if (!s || !s.a || !s.b) return '';
    const strip = '<div class="fs-strip">' + [0, 1, 2, 3, 4].map(i => { const g = s.games[i];
      return g ? '<span class="fs-g ' + (g.won ? 'a' : 'b') + '"><small>MATCH ' + (i + 1) + '</small><b>' + Math.max(g.a, g.b) + '–' + Math.min(g.a, g.b) + '</b><i>' + h(g.won ? s.a.city : s.b.city) + '</i></span>'
        : '<span class="fs-g no"><small>MATCH ' + (i + 1) + '</small><b>·</b><i>not needed</i></span>'; }).join('') + '</div>';
    const evLine = e => (e.al && e.finish ? '<b>' + h(e.finish) + '</b>' : 'No playoffs') + ' · ' + h(e.name) + ' <span class="muted">(ranked ' + U.ord(e.rank) + ' of ' + e.of + (e.al ? ', ' + (e.pick === 0 ? 'captain of alliance ' : 'alliance ') + e.al : '') + ')</span>' +
      (e.awards.length ? ' · <span class="fs-aw">' + e.awards.map(h).join(', ') + '</span>' : '');
    const team = t => '<div class="fs-t' + (t.me ? ' me' : '') + '"><div class="fs-tn"><b>' + t.num + '</b><span>' + h(t.name) + '</span>' + (t.me ? UI.tag('your team', 'acc') : '') + (t.captain ? UI.tag('captain') : '') + (t.rookie ? UI.tag('rookie', 'good') : '') + '<span class="sp"></span><span class="xs muted">' + h(t.home) + '</span></div>' +
      (t.events.length ? '<div class="xs fs-ev">' + t.events.map(evLine).join('<br>') + '</div>' : '') +
      (t.qual ? '<div class="xs muted">Championship place: ' + h(t.qual) + '</div>' : '') +
      (t.g ? '<div class="xs fs-st">In the series: <b>' + t.ppm + '</b> points a match · endgame in ' + t.end + ' of ' + t.g + (t.dead ? ' · <span class="bad">broke down in ' + t.dead + '</span>' : '') + '</div>' : '') + '</div>';
    const al = (x, win) => '<div class="fs-al' + (win ? ' win' : '') + '"><div class="fs-alh"><b>' + h(x.city) + ' champions</b>' + (x.you ? '<span class="xs muted">your alliance</span>' : '') + '<span class="sp"></span>' + UI.tag(win ? 'winners' : 'finalists', win ? 'acc' : '') + '</div>' + x.teams.map(team).join('') + '</div>';
    return '<div class="fs-box" style="--fsc:' + (col || '#f5c542') + '"><div class="xs muted b">' + h(tag || 'THE SERIES') + ' · THE RESULT IN YOUR WORLD</div>' +
      '<div class="fs-head"><span class="fs-w">' + h(s.a.city) + ' champions</span><b class="fs-sc">' + s.a.wins + '–' + s.b.wins + '</b><span class="fs-l">' + h(s.b.city) + ' champions</span></div>' + strip +
      '<div class="grid g2 fs-als">' + al(s.a, true) + al(s.b, false) + '</div>' +
      '<div class="xs muted fs-note">Each team\'s lines are its ' + s.cy + ' season in your world: its finish, rank and alliance at every event, judged awards, and how it earned its Championship place. Points a match are what its robot scored in this series.</div></div>';
  };

  // ---------------- The Festival livestream (for teams that are not in it) ----------------
  // the announcement at the start of July
  UI.festLiveModal = function () {
    const S = G.S, FS = S.festStream || {}, c = FS.cities || ['Houston', 'St. Louis'];
    UI.modal('<div class="xs b" style="color:#f5c542;letter-spacing:.08em">LIVE THIS MONTH · FESTIVAL OF CHAMPIONS</div><h2>Two champion alliances, one field</h2>' +
      '<p class="story-p">There were two Championships this year, so there are two champion alliances. In July the ' + h(c[0]) + ' and ' + h(c[1]) + ' champions meet in Manchester, New Hampshire, to settle it: a best-of-five, with the whole series on the stream.</p>' +
      '<p class="story-p">Your team is not in it. Half the shop has asked whether the projector can be used "for educational purposes".</p>' +
      '<div class="card flat mb" style="border-left:3px solid #f5c542"><div class="xs muted b">WHAT IT MEANS FOR YOU</div><ul class="story-ul"><li>You can watch the series on the field, match by match, or skip ahead. It is optional: it costs nothing and takes none of the team\'s hours.</li><li>Nothing is at stake for your team. If you do not watch, the result still arrives next month.</li></ul></div>' +
      '<div class="row mt"><span class="xs muted">Also in your inbox, and on the Calendar until the month ends.</span><span class="sp"></span><button class="btn" data-act="launchNext">Not now</button><button class="btn primary" data-act="festStream">Watch the livestream ▶</button></div>', { wide: true });
  };
  UI.A.festStream = function () {
    const S = G.S; if (S.launchQueue) S.launchQueue = S.launchQueue.filter(l => l.kind !== 'festLive');
    UI.closeModal();
    if (UI.err(G.Career.startFestStream(S))) return;
    G.Save.write('auto'); UI.go('event');
  };
  const streamSeries = ev => { const F = ev.po.matches.find(x => x.id === 'F'), gs = F.games.filter(g => !g.replay && (g.winner === 'red' || g.winner === 'blue')); return { F, n: gs.length, rw: gs.filter(g => g.winner === 'red').length, bw: gs.filter(g => g.winner === 'blue').length }; };
  // the stream page while the series is on: watch the next match on the field, or skip
  function streamView(ev) {
    const s = streamSeries(ev), F = s.F, nm = i => h((ev.divNames || [])[i] || '') + ' champions';
    const lead = s.rw === s.bw ? (s.n ? 'The series is tied ' + s.rw + '–' + s.bw + '.' : 'First to three wins.') : nm(s.rw > s.bw ? F.red : F.blue) + ' lead ' + Math.max(s.rw, s.bw) + '–' + Math.min(s.rw, s.bw) + '.';
    return '<div class="card hl mb"><div class="ct">Livestream ' + UI.tag('LIVE', 'bad') + ' ' + UI.tag('best of five', 'acc') + '</div>' +
      '<div class="sm mb">You are watching from the shop: nobody on your team is on the field and nothing is at stake. ' + lead + '</div>' +
      '<div class="grid g2 mb">' + [F.red, F.blue].map((i, k) => '<div class="card flat"><div class="xs b ' + (k ? 'blue' : 'red') + '">' + nm(i).toUpperCase() + '</div><div class="sm mt">' + ev.alliances[i].map(t => tlink(t) + ' ' + h(tname(t))).join(' · ') + '</div></div>').join('') + '</div>' +
      '<div class="row wrap"><button class="btn primary" data-act="streamWatch">Watch Match ' + (s.n + 1) + ' on the field ▶</button><button class="btn" data-act="streamSim">Skip to its result</button><button class="btn" data-act="streamRest">Skip to the end of the series</button><span class="sp"></span><button class="btn" data-act="streamClose">Close the stream</button></div></div>' + UI.bracket(ev);
  }
  // Watch the next match in the match viewer as a spectator (no coach calls: nobody of yours is out there)
  UI.A.streamWatch = function () { const ev = Ev(), m = ev && ev.stream ? G.Ev.nextPlayoff(ev) : null; if (!m) return; UI.st.match = { kind: 'po', m, spectate: true }; UI.go('live'); };
  UI.A.streamSim = function () { const ev = Ev(), m = ev && ev.stream ? G.Ev.nextPlayoff(ev) : null; if (m) G.Ev.applyPlayoff(ev, m, G.Ev.runHeadless(ev, G.Ev.poMatchObj(ev, m))); finishIfDone(ev); G.Save.write('auto'); UI.render(); };
  UI.A.streamRest = function () { const ev = Ev(); let m; while (ev && ev.stream && (m = G.Ev.nextPlayoff(ev))) G.Ev.applyPlayoff(ev, m, G.Ev.runHeadless(ev, G.Ev.poMatchObj(ev, m))); finishIfDone(ev); G.Save.write('auto'); UI.render(); };
  // Closing the stream before the end: the series goes on without you, and its result is told on the way out
  UI.A.streamClose = function () {
    const ev = Ev(); if (!ev || !ev.stream) return;
    const go = () => { let m; while ((m = G.Ev.nextPlayoff(ev))) G.Ev.applyPlayoff(ev, m, G.Ev.runHeadless(ev, G.Ev.poMatchObj(ev, m))); finishIfDone(ev); UI.A.leaveEvent(); };
    if (ev.stage === 'done') return go();
    UI.confirm('Close the stream?', 'The series goes on without you. You will read how it ended.', 'Close it', go);
  };
  // the stream page when the series is over
  function streamDone(ev) {
    const S = G.S, r = (S.festStream || {}).result;
    if (!r) return '<div class="card"><div class="row"><span class="sp"></span><button class="btn primary" data-act="leaveEvent">Close the stream ▶</button></div></div>' + UI.bracket(ev);
    const strip = '<div class="fc-strip left">' + [0, 1, 2, 3, 4].map(i => { const g = r.games[i]; return '<span class="fc-g ' + (g ? (g.won ? 'w' : 'l') : 'no') + '"><small>MATCH ' + (i + 1) + '</small>' + (g ? '<b>' + g.a + '</b><i>' + g.b + '</i>' : '<b>·</b><i>not needed</i>') + '</span>'; }).join('') + '</div>';
    const list = l => l.map(t => tlink(t.num) + ' ' + h(t.name)).join(' · ');
    return '<div class="grid g2"><div class="card hl"><div class="ct">Festival of Champions ' + UI.tag('stream ended') + '</div><div class="xs muted b">THE ONE CHAMPION ALLIANCE OF ' + (S.festStream.cy || '') + '</div><div class="xl b acc">' + h(r.winner) + ' champions · ' + r.w + '–' + r.l + '</div>' +
      '<div class="xs muted mt">The ' + h(r.winner) + ' champions\' score on top in every match</div>' + strip +
      '<div class="kv mt"><span class="k">' + h(r.winner) + ' champions</span><span>' + list(r.teams) + '</span><span class="k">' + h(r.loser) + ' champions</span><span>' + list(r.opp) + '</span><span class="k">Your team</span><span>Watched from the shop. Nothing won, nothing lost.</span></div>' +
      '<div class="row mt"><span class="sp"></span><button class="btn primary" data-act="leaveEvent">Close the stream ▶</button></div></div>' +
      '<div class="card"><div class="ct">The real Festival of Champions</div>' + FEST_REAL.slice(1).map(p => '<p class="sm muted">' + h(p) + '</p>').join('') + '</div></div>' +
      '<div class="mt">' + UI.bracket(ev) + '</div>';
  }
  // Championship ceremonies in order. On Einstein: Finalists before Final 1, the winner after Final 1, then (if you won
  // it all) the World Champions celebration. In a division that ended without Einstein: your own awards only.
  UI.ceremony = function (ev) {
    const S = G.S, C = G.Career, ci = S.season && S.season.cmpImpact;
    if (document.getElementById('modal')) return false;
    // the Festival of Champions has one ceremony of its own, when the series is over
    if (ev.stream) return false; // viewers get no ceremony
    if (ev.festival) { const F = S.festival; if (ev.stage === 'done' && F && F.cele && !ev.fcShown) { ev.fcShown = true; ev.party = true; G.Save.write('auto'); UI.festivalModal(F.cele); return true; } return false; }
    const seen = ev.ciSeen = ev.ciSeen || {};
    if (ev.kind === 'einstein') {
      const F = ev.po && ev.po.matches.find(x => x.id === 'F'), done = ev.stage === 'done';
      if (ci && !seen.fin && (done || (F && F.red != null && F.blue != null))) {
        seen.fin = true; C.settleImpact(S, 'fin'); G.Save.write('auto');
        if (ci.out === 'finalist') UI.impactCele(ci.cele); else impactAnnounce('fin');
        return true;
      }
      if (ci && !seen.win && (done || (F && F.games.length >= 1))) {
        seen.win = true; C.settleImpact(S, 'win'); G.Save.write('auto');
        if (ci.out === 'winner') UI.impactCele(ci.cele); else impactAnnounce('win');
        return true;
      }
      if (done && ev.result && ev.result.won && !ev.wcShown && S.season.wc) { ev.wcShown = true; ev.party = true; UI.worldChampModal(S.season.wc); return true; }
    } else if (ev.kind === 'champs' && ev.stage === 'done' && !S.pendingEinstein && ci) {
      C.settleImpact(S, 'all');
      if (ci.out && !seen.own) { seen.own = true; G.Save.write('auto'); UI.impactCele(ci.cele); return true; }
    }
    return false;
  };
  UI.wonEvent = (ev, R) => !!(ev && R && R.kind !== 'qual' && ev.result && ev.result.won && R.obj && R.obj.id === 'F');
})();
