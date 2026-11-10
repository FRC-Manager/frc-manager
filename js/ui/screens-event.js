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
      const game = m.bo3 ? 'Best of 3 · Game ' + (m.games.filter(g => !g.replay).length + 1) : h(m.round);
      main = '<span class="nx-k">' + (cur ? 'This match' : 'Next') + '</span><b class="nx-id">' + (m.id === 'F' ? 'Finals' : h(m.id)) + '</b><span class="nx-vs">against <b>' + h(alName(ev, opp)) + '</b></span><span class="nx-of">' + game + '</span>';
      side = 'You are <b>' + h(alName(ev, pa)) + '</b> on <b class="' + sd + '">' + sd.toUpperCase() + '</b>' + (opp != null && ev.alliances[opp] ? ' · their captain: ' + ev.alliances[opp][0] + ' ' + h(tname(ev.alliances[opp][0])) : '');
      last = lp ? 'Last playoff match: ' + h(String(lp.id)) + ' ' + wl(lp) + ' ' + lp.our + '–' + lp.their : 'Your first playoff match';
    } else return '';
    return '<div class="nextbar' + (cur ? ' stack' : '') + '"><div class="nx-main">' + main + '</div><div class="nx-side">' + side + '</div><div class="nx-last">' + last + '</div></div>';
  }
  const tlink = (n) => '<a href="#" data-act="scoutTeam" data-arg="' + n + '" class="' + (n === me() ? 'b' : '') + '" style="' + (n === me() ? 'color:var(--accent2)' : 'color:inherit') + '">' + n + '</a>';

  // =====================================================================
  // EVENT HUB
  // =====================================================================
  UI.S.event = { nav: 'event', after() { const ev = Ev(); if (!ev) return; if (UI.ceremony(ev)) return; if (ev.stage === 'done' && ev.result && ev.result.won && !ev.party) { ev.party = true; UI.confetti(); } }, html() {
    const S = G.S, ev = Ev();
    if (!ev) return '<h1>Event</h1><p class="muted">No active event.</p><button class="btn" data-act="nav" data-arg="hq">Back to HQ</button>';
    const K = G.Ev.KIND[ev.kind], rk = ev.rank[me()];
    let o = '<div class="row"><div><h1>' + h(ev.name) + '</h1><div class="sub">' + h(K.name) + (ev.week ? ' · Week ' + ev.week : '') + ' · ' + ev.teams.length + ' teams · ' + h(G.Career.seasonName(G.S, ev.year)) + '</div></div><span class="sp"></span>' +
      (rk && rk.played ? '<div class="kpi"><span class="v xl">' + U.ord(G.Ev.rankOf(ev, me())) + '</span><span class="l">Rank · ' + rk.w + '-' + rk.l + '-' + rk.t + ' · ' + (rk.rp / rk.played).toFixed(2) + ' RS</span></div>' : '') + '</div>';
    const stages = ['practice', 'quals', 'selection', 'playoffs', 'done'], stage = ev.pracReview ? 'practice' : ev.stage;
    o += '<div class="row wrap mb">' + stages.filter(s => !(ev.kind === 'scrimmage' && (s === 'selection' || s === 'playoffs')) && !(ev.kind === 'einstein' && (s === 'practice' || s === 'quals' || s === 'selection'))).map(s => UI.tag(s.toUpperCase(), s === stage ? 'acc' : stages.indexOf(s) < stages.indexOf(stage) ? 'good' : '')).join(' ') + '</div>';
    if (stage === 'practice') o += practiceView(ev);
    else if (ev.stage === 'quals') o += qualsView(ev);
    else if (ev.stage === 'selection') o += selectionView(ev);
    else if (ev.stage === 'playoffs') o += playoffView(ev);
    else o += doneView(ev);
    if (ev.stage !== 'done' && S.robot) o += pitCard(ev);
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
      G.Ev.PRACTICE.map(p => '<button class="btn" data-act="practice" data-arg="' + p.id + '" style="text-align:left;white-space:normal"><b>' + h(p.name) + '</b> <span class="xs muted">' + h(p.desc) + (p.id === 'install' ? ' (' + S.robot.pending.length + ' pending)' : '') + '</span></button>').join('')) + '</div>';
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
  function bmatch(ev, id) {
    const m = ev.po.matches.find(x => x.id === id), pa = G.Ev.playerAlliance(ev);
    const al = i => i == null ? '<span class="dim">TBD</span>' : (ev.kind === 'einstein' && ev.divNames && ev.divNames[i] ? h(ev.divNames[i]) + ' ' : '') + 'A' + (i + 1) + ' <span class="xs muted">' + ev.alliances[i][0] + '</span>';
    const sc = (side) => m.games.map(g => '<span' + (g.tb ? ' title="Tied: won on ' + h(g.tb) + '"' : g.replay ? ' title="Tied on every tiebreaker: replayed"' : '') + '>' + (side === 'red' ? g.red : g.blue) + (g.tb && g.winner === side ? '*' : g.replay ? 'ʳ' : '') + '</span>').join(' / ');
    const cls = (i) => m.winner == null ? '' : m.winner === i ? 'w' : 'l';
    return '<div class="bm ' + (m.red === pa || m.blue === pa ? 'me' : '') + '"><div class="xs muted">' + id + (m.bye ? ' (bye)' : '') + '</div><div class="al ' + cls(m.red) + '"><span class="red">' + al(m.red) + '</span><span>' + sc('red') + '</span></div><div class="al ' + cls(m.blue) + '"><span class="blue">' + al(m.blue) + '</span><span>' + sc('blue') + '</span></div></div>';
  }
  UI.bracket = function (ev) {
    const col = (t, ids) => '<div><div class="xs muted mb">' + t + '</div>' + ids.map(i => bmatch(ev, i)).join('') + '</div>';
    return '<div class="bracket">' + col('Upper R1', ['M1', 'M2', 'M3', 'M4']) + col('Lower R1 · Upper R2', ['M5', 'M6', 'M7', 'M8']) + col('Lower R2 · Upper Final', ['M9', 'M10', 'M11']) + col('Lower R3 · Lower Final', ['M12', 'M13']) + col('Finals (best of 3)', ['F']) + '</div>';
  };
  function playoffView(ev) {
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
  function doneView(ev) {
    const r = ev.result || {};
    const bn = G.Career.eventBanners(Object.assign({ kind: ev.kind }, r), ev.year);
    let o = bn.length ? '<div class="card hl mb"><div class="ct">' + (bn.length > 1 ? 'New blue banners!' : 'New blue banner!') + '<span class="sp"></span><span class="xs muted">Hung in your History banner wall</span></div>' + UI.bannerWall(bn, true) + '</div>' : '';
    o += '<div class="grid g2"><div class="card hl"><div class="ct">Event result</div>';
    o += '<div class="xl b ' + (r.won ? 'acc' : '') + '">' + h(r.finish || '') + '</div>';
    o += '<div class="kv mt">' + (r.rank ? '<span class="k">Qualification rank</span><span>' + U.ord(r.rank) + ' of ' + r.size + '</span><span class="k">Record</span><span>' + h(r.record) + '</span><span class="k">Ranking score</span><span>' + (r.avgRP || 0).toFixed(2) + '</span>' : '') +
      (r.alliance ? '<span class="k">Alliance</span><span>#' + r.alliance + ' (' + h(r.role) + ')</span>' : '') + '<span class="k">OPR</span><span>' + r.opr + '</span>' + (r.pool ? '<span class="k">Pool points</span><span>' + r.pool + '</span>' : '') + '</div>';
    if (r.winners && r.winners.length) o += '<div class="sm mt">Event winners: ' + r.winners.map(tlink).join(', ') + '</div>';
    o += impactLine(ev);
    o += '<div class="row mt"><span class="sp"></span><button class="btn primary" data-act="leaveEvent">Leave event ▶</button></div></div>';
    o += '<div class="card"><div class="ct">Awards</div>' + (ev.awards.length ? ev.awards.map(a => '<div class="row sm mb ' + (a.team === me() ? 'acc b' : '') + '"><span>' + h(a.name) + '</span><span class="sp"></span><span>' + a.team + ' ' + h(tname(a.team)) + '</span></div>').join('') : '<p class="muted">No judged awards at this event.</p>') + '</div></div>';
    if (ev.po) o += '<div class="mt">' + UI.bracket(ev) + '</div>';
    return o;
  }
  UI.A.leaveEvent = function () { G.Career.leaveEvent(G.S); G.Save.write('auto'); UI.go('hq'); };

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
    const title = UI.st.match.kind === 'qual' ? 'Qualification ' + obj.n : obj.id + ' · ' + UI.st.match.m.round + (UI.st.match.m.bo3 ? ' · game ' + (obj.game + 1) : '');
    const pmm = UI.st.match.kind === 'po' ? UI.st.match.m : null, alTag = sd => (pmm ? ' · ' + h(alShort(ev, sd === 'red' ? pmm.red : pmm.blue)) : '');
    let o = '<h1>' + h(title) + '</h1><div class="sub">You are on the <b class="' + a + '">' + a.toUpperCase() + '</b> alliance' + (pmm ? ': <b>' + h(alName(ev, a === 'red' ? pmm.red : pmm.blue)) + '</b>, against <b>' + h(alName(ev, a === 'red' ? pmm.blue : pmm.red)) + '</b>' : '') + '.</div>';
    const ds = ev.defStats;
    if (Sz.meta) o += '<div class="hint mb"><b>Strategy:</b> ' + h(Sz.meta.note) + (ds && ds.n >= 10 ? ' So far at this event, ' + Math.round(100 * ds.d / ds.n) + '% of alliances have played a defender.' : '') + '</div>';
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
    if (Sz.meta && Sz.meta.faults) { o += '<div class="xs muted mb">' + h(Sz.meta.faults) + ' Brief comms drops are common for every robot; well-built electronics, a healthy robot and avoiding contact keep them short.</div>'; }
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
    const endL = [[9, ev.year === 2026 ? 'Only if worth it' : 'Highest possible']].concat(Sz.endNames.map((n, i) => [i, i === 0 ? (G.Rules[ev.year].endgame.park ? 'Park only' : 'No endgame') : n]).filter(x => x[0] > 0 || true));
    o += '<div class="card hl"><div class="ct">Match plan (free)</div><div class="col">' +
      '<label class="f">Role' + sel('role', roles, plan.role) + '</label>' +
      (plan.role === 'defend' ? '<label class="f">Defend' + sel('defTarget', [['', 'Their best scorer']].concat(obj[o2].map(t => [t, t + ' ' + tname(t)])), plan.defTarget || '') + '</label>' : '') +
      '<label class="f">Target priority' + sel('target', Sz.coachTargets.map(t => [t.id, t.name]), plan.target) + '</label>' +
      '<label class="f">Pace' + sel('pace', [['push', 'Push (faster, riskier)'], ['bal', 'Balanced'], ['cons', 'Conserve (safer, slower)']], plan.pace) + '</label>' +
      '<label class="f">Endgame timing' + sel('endTiming', [['early', 'Early (safe)'], ['std', 'Standard'], ['late', 'Late (max cycles)']], plan.endTiming) + '</label>' +
      '<label class="f">Endgame target' + sel('endLevel', endL, plan.endLevel) + '</label>' +
      '<label class="row sm"><input type="checkbox" data-chg="planChk" data-k="rpHunt" ' + (plan.rpHunt ? 'checked' : '') + '> Chase bonus ranking points</label>' +
      '<label class="row sm"><input type="checkbox" data-chg="planChk" data-k="avoid" ' + (plan.avoid ? 'checked' : '') + '> Avoid contact (fewer fouls, slower)</label></div>';
    const R = S.robot;
    o += '<div class="hr"></div><div class="sm"><b>Robot status</b></div>' + UI.condRows(S) +
      '<div class="xs muted">Battery charge ' + Math.round((ev.batt || 1) * 100) + '% · spares ' + S.parts.spares + (ev.lastRepair != null ? ' · used ' + ev.lastRepair + ' spares in repairs' : '') + ' · Coach Calls: ' + G.Career.coachCalls(S, UI.st.match.kind === 'po') + '</div>';
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
  UI.S.live = { nav: 'event', html() {
    const ev = Ev(), obj = curMatchObj();
    if (!obj) return '<p>No match.</p>';
    const Sz = G.Seasons[ev.year];
    const a = obj.red.includes(me()) ? 'red' : 'blue', o2 = a === 'red' ? 'blue' : 'red';
    const callBtn = (kind, value, label, cls) => '<button class="btn sm ' + (cls || '') + '" data-act="call" data-arg="' + kind + '|' + value + '">' + h(label) + '</button>';
    let calls = '<div class="col">' +
      '<div class="row wrap gap4"><span class="xs muted" style="width:62px">Pace</span>' + callBtn('pace', 'push', 'Push') + callBtn('pace', 'bal', 'Balanced') + callBtn('pace', 'cons', 'Conserve') + '</div>' +
      '<div class="row wrap gap4"><span class="xs muted" style="width:62px">Role</span>' + callBtn('role', 'score', 'Score') + obj[o2].map(t => callBtn('role', 'defend:' + t, 'Defend ' + t)).join('') + (ev.year === 2026 ? callBtn('role', 'feed', 'Feed') : '') + '</div>' +
      '<div class="row wrap gap4"><span class="xs muted" style="width:62px">Target</span>' + Sz.coachTargets.map(t => callBtn('target', t.id, t.name)).join('') + '</div>' +
      '<div class="row wrap gap4"><span class="xs muted" style="width:62px">Endgame</span>' + callBtn('endNow', '1', 'Go now') + callBtn('endTiming', 'late', 'Go late') + Sz.endNames.map((n, i) => i > 0 ? callBtn('endLevel', i, 'Aim ' + n) : '').join('') + '</div>' +
      partnerRow(ev, obj, a, callBtn) +
      '<div class="row wrap gap4"><span class="xs muted" style="width:62px">Other</span>' + callBtn('rp', '1', 'Chase bonus RP') + callBtn('rp', '0', 'Just win') + callBtn('avoid', '1', 'Avoid contact') + callBtn('avoid', '0', 'Allow contact') + callBtn('reset', '1', 'Reset robot!', 'bad') + '</div></div>';
    return '<div class="row mb matchhead">' + UI.icon('event', 18) + '<b>' + h(UI.matchLabel(ev, obj)) + '</b><span class="xs muted">' + h(ev.name) + '</span><span class="sp"></span>' + (obj.playoff && ev.kind !== 'einstein' ? lossTag(ev) : '') + '</div>' +
      '<div class="scorebar"><div class="score r" id="scR">0</div><div class="clock"><div class="t" id="clk">0:00</div><div class="p" id="phs">AUTO</div></div><div class="score b" id="scB">0</div></div>' +
      '<div class="matchview"><div><div class="card" style="padding:10px"><div class="ct sm">Your robot</div><div id="myBox"></div></div><div class="card mt" style="padding:10px"><div class="ct sm">Robots</div><div id="robBox"></div></div></div>' +
      '<div><div class="fieldwrap"><canvas id="fieldCv" width="1100" height="547"></canvas></div>' +
      '<div class="card mt" style="padding:10px"><div class="row mb"><b>Coach Calls</b> <span class="tag acc" id="callsLeft"></span><span class="sp"></span><div class="row gap4" id="spd">' +
      ['0', '1', '2', '4', '8'].map(s => '<button class="btn sm" data-act="spd" data-arg="' + s + '">' + (s === '0' ? '❚❚' : s + '×') + '</button>').join('') + '<button class="btn sm" data-act="skipLive">Skip ⏭</button></div></div>' + calls + '<div class="row mt"><span class="sp"></span><button class="btn primary hidden" id="liveDone" data-act="liveDone">Results ▶</button></div></div></div>' +
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
    if (m.year === 2022) return m.hub; if (m.year === 2024) return m.spk[r.a]; if (m.year === 2026) return m.hub[r.a]; return null;
  }
  function draw(L) {
    const m = L.m, ctx = L.ctx, s = L.cv.width / G.Engine.FW;
    G.Render.field(ctx, m.year, s, m);
    const al = m.done ? 1 : U.clamp(L.acc / 0.1, 0, 1);
    m.robots.forEach(r => {
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
  UI.S.mresult = { nav: 'event', html() {
    const R = UI.st.lastResult; if (!R) return '<button class="btn" data-act="nav" data-arg="event">Back</button>';
    const res = R.res, obj = R.obj, a = obj.red.includes(me()) ? 'red' : 'blue', o2 = a === 'red' ? 'blue' : 'red';
    const w = res[a].win;
    const ev = Ev();
    let o = '<div class="row"><div><div class="xs muted">' + h(UI.matchLabel(ev, Object.assign({ playoff: R.kind !== 'qual' }, obj)).toUpperCase()) + (R.kind !== 'qual' && ev && ev.po && !ev.po.done ? ' · ' + lossTag(ev) : '') + '</div><h1 class="' + (w === 1 ? 'good' : w === 0 ? 'bad' : 'warn') + '" style="font-size:34px">' + (w === 1 ? 'VICTORY' : w === 0 ? 'DEFEAT' : 'TIE') + '</h1>' +
      (res.tiebreak ? '<div class="sm">Tied ' + res.red.score + '–' + res.blue.score + ': decided by <b>' + h(res.tiebreak) + '</b>' + (res.tieVals ? ' (' + res.tieVals.red + '–' + res.tieVals.blue + ')' : '') + ', the FRC playoff tiebreaker.</div>' : res.replay ? '<div class="sm warn">Tied on every tiebreaker (fouls, auto and endgame points): the match will be replayed.</div>' : '') + '</div><span class="sp"></span><div class="score r">' + res.red.score + '</div><div class="score b">' + res.blue.score + '</div></div>';
    o += '<div class="grid g2 mt"><div class="card"><div class="ct">Score breakdown</div><table class="t"><tr><th></th><th class="num red">Red</th><th class="num blue">Blue</th></tr>' +
      [['Auto', 'auto'], ['Teleop', 'tele'], ['Endgame', 'end'], ['Fouls received', 'foul'], ['Total', 'score']].map(x => '<tr><td>' + x[0] + '</td><td class="num">' + res.red[x[1]] + '</td><td class="num">' + res.blue[x[1]] + '</td></tr>').join('') + '</table>' +
      (R.kind === 'qual' ? '<div class="hr"></div><div class="b">You earned ' + res[a].rp + ' RP</div>' + res[a].bonus.map(b => '<div class="sm">' + (b.ok ? '<span class="good">✔</span> ' : '<span class="dim">✘</span> ') + h(b.name) + ' <span class="muted">(' + b.val + '/' + b.thr + ')</span></div>').join('') : '') + '</div>';
    o += '<div class="card"><div class="ct">Robots</div><table class="t"><tr><th>Team</th><th class="num">Pts</th><th class="num">Cycles</th><th class="num">Acc</th><th>Endgame</th><th>Issues</th></tr>' + res.robots.map(r => '<tr class="' + (r.team === me() ? 'me' : '') + '"><td class="' + r.a + '">' + r.team + '</td><td class="num">' + r.pts + '</td><td class="num">' + r.cycles + '</td><td class="num">' + (r.shots ? Math.round(100 * r.hits / r.shots) + '%' : '—') + '</td><td class="xs">' + (r.end ? (r.end.lvl ? G.Seasons[ev ? ev.year : G.S.year].endNames[r.end.lvl] : r.end.failed ? 'failed' : 'park') : '—') + '</td><td class="xs warn">' + h(r.faults.concat(r.fouls ? [r.fouls + ' foul' + (r.fouls > 1 ? 's' : '')] : []).join(', ')) + (r.autoOK === false ? ' <span class="dim">auto miss</span>' : '') + '</td></tr>').join('') + '</table></div></div>';
    if (G.S.robot) { const RB = G.S.robot; o += '<div class="card mt"><div class="ct">Robot condition after the match</div><div class="grid g3">' + Object.keys(RB.subs).filter(k => k !== 'soft' && RB.subs[k].ver).map(k => UI.stat(G.Seasons.sub(RB.year, k).name, RB.subs[k].cond, null, UI.colorFor(RB.subs[k].cond))).join('') + '</div><div class="xs muted">Pit repairs happen automatically before your next match (more time between matches = more repairs; uses spare parts).</div></div>'; }
    if (UI.wonEvent(ev, R)) o = '<div class="card hl mb"><div class="row">' + UI.icon('trophy', 26) + '<div><div class="lg b acc">' + (ev.kind === 'einstein' ? 'WORLD CHAMPIONS!' : ev.kind === 'champs' ? 'Division Champions!' : 'Event winners!') + '</div><div class="sm muted">' + h(ev.name) + '</div></div></div></div>' + o;
    if (ev && ev.stage !== 'done') o += '<div class="mt">' + nextStrip(ev) + '</div>';
    o += '<div class="row mt"><span class="sp"></span><button class="btn primary lg" data-act="nav" data-arg="event">Continue ▶</button></div>';
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
          : d.lastFinalist ? 'Finalists last year · champions now' : '';
    const lead = streak === 2 ? 'Last season\'s champions did it again. Only a few teams have done it before in FRC history.'
      : streak >= 3 ? (NUMW[streak] || streak) + ' world titles in a row. No one has done it in the past decades.'
        : titles > 1 ? 'World Champions again: this is your ' + U.ord(titles) + ' title' + (d.lastTitleYear ? ', and the first since ' + d.lastTitleYear : '') + '. Winning it once is a great season. Winning it again is a program.' + (d.lastFinalist ? ' It also settles last year\'s lost final.' : '')
          : d.lastFinalist ? 'A year ago you stood on Einstein and watched the confetti fall on the other alliance. This time it is yours.'
            : 'From the game reveal in January to the last buzzer on Einstein, this is the season every team dreams about.';
    const story = h(lead) + (d.rookie ? ' In your rookie season, no less: the whole pit area is talking about it.' : '') +
      ' As ' + role + ' of the ' + h(d.div || 'division') + ' champions, your alliance won the Einstein finals ' + d.fw + '–' + d.fl + (d.opp ? ' against ' + h((d.opp.div ? d.opp.div + ' ' : '') + 'captain ' + d.opp.num + ' ' + d.opp.name) : '') + ' in ' + h(d.game || 'this game') + '. ' +
      B(d.driver) + ' at the controls' + (d.coach ? ' and ' + B(d.coach) + ' calling every play' + (d.coachIsMentor ? ' from behind the glass' : '') : '') + ', with a whole team in the stands that can barely speak.';
    const egg = D.REAL_CHAMPS[d.gyear];
    const eggTxt = egg ? 'In the real ' + d.gyear + ' season (' + (d.game || 'that game') + '), Einstein was won by the ' + egg.div + ' division alliance: ' + egg.teams.map(t => t[0] + ' ' + t[1]).join(', ').replace(/, ([^,]*)$/, ' and $1') + '.' + (egg.teams.some(t => t[0] === me0) ? ' Your team number is on that list too. Coincidence?' : '') : '';
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
  // Championship ceremonies in order. On Einstein: Finalists before Final 1, the winner after Final 1, then (if you won
  // it all) the World Champions celebration. In a division that ended without Einstein: your own awards only.
  UI.ceremony = function (ev) {
    const S = G.S, C = G.Career, ci = S.season && S.season.cmpImpact;
    if (document.getElementById('modal')) return false;
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
