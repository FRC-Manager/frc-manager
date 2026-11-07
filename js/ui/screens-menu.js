'use strict';
/* FRC Manager — main menu, new game setup, load, help, settings, season review, career summary */
(function () {
  const U = G.U, D = G.Data, h = U.esc, UI = G.UI;

  // =====================================================================
  // MAIN MENU
  // =====================================================================
  UI.S.menu = { full: true, html() {
    const auto = G.Save.meta('auto');
    return '<div class="menu-wrap"><div class="menu-box"><div class="logo">FRC <span>MANAGER</span></div><div class="muted mb">Run a FIRST Robotics Competition team across five seasons — 2022 to 2026. Unofficial fan game.</div>' +
      '<div class="grid g3 mt">' +
      '<div class="choice" data-act="newGame" data-arg="career"><div class="lg b">New Career</div><div class="sm muted">Five seasons, real or random order. Build a program that learns from every robot.</div></div>' +
      '<div class="choice" data-act="newGame" data-arg="single"><div class="lg b">Single Season Challenge</div><div class="sm muted">Pick one game and a scenario. Graded S to D.</div></div>' +
      '<div class="choice" data-act="continueGame" ' + (auto ? '' : 'style="opacity:.5"') + '><div class="lg b">Continue</div><div class="sm muted">' + (auto ? h(auto.team.num + ' ' + auto.team.name + ' · ' + auto.year + ' · ' + new Date(auto.savedAt).toLocaleString()) : 'No autosave yet') + '</div></div>' +
      '</div><div class="row mt wrap"><button class="btn" data-act="nav" data-arg="load">Load / import</button><button class="btn" data-act="nav" data-arg="help">How to play</button></div>' +
      '<div class="grid g5 mt">' + G.SEASON_YEARS.map(y => '<div class="card flat"><div class="xs muted">' + y + '</div><div class="b">' + h(G.Seasons[y].name) + '</div><canvas data-prev="' + y + '" width="330" height="164" style="width:100%;border-radius:6px;margin-top:6px"></canvas><div class="xs muted mt">' + h(G.Seasons[y].tagline) + '</div></div>').join('') + '</div>' +
      '<p class="xs dim mt">Not affiliated with or endorsed by FIRST®, Formula 1® or Frontier Developments. Sponsors, regionals and teams are fictional; team numbers are random.</p></div></div>';
  }, after() { document.querySelectorAll('canvas[data-prev]').forEach(c => G.Render.preview(c, Number(c.dataset.prev))); } };
  UI.A.continueGame = () => { if (G.Save.load('auto')) { UI.go(G.S.phase === 'end' ? 'end' : G.S.event ? 'event' : 'hq'); } else UI.toast('No autosave found', 'bad'); };

  // =====================================================================
  // NEW GAME
  // =====================================================================
  UI.A.newGame = function (mode) {
    const rng = G.makeRng(Date.now() & 0xffffff);
    UI.st.ng = { mode, num: rng.int(1000, 9999), name: D.teamName(rng), school: rng.pick(D.SCHOOLS) + ' High School', c1: '#f5b800', c2: '#111111', region: 'Midwest',
      profile: mode === 'single' ? 'established' : 'established', diff: 'normal', order: 'real', year: 2026, scenario: 'custom' };
    UI.go('newgame');
  };
  UI.S.newgame = { full: true, html() {
    const n = UI.st.ng;
    const inp = (k, lbl, type) => '<label class="f">' + lbl + '<input class="inp" type="' + (type || 'text') + '" value="' + h(n[k]) + '" data-chg="ng" data-k="' + k + '"></label>';
    const choice = (k, v, title, desc) => '<div class="choice ' + (n[k] === v ? 'on' : '') + '" data-act="ngSet" data-arg="' + k + '|' + v + '"><div class="b">' + title + '</div>' + (desc ? '<div class="xs muted">' + desc + '</div>' : '') + '</div>';
    let o = '<div class="menu-wrap"><div class="menu-box"><div class="row"><div class="logo" style="font-size:28px">' + (n.mode === 'career' ? 'New Career' : 'Single Season Challenge') + '</div><span class="sp"></span><button class="btn" data-act="nav" data-arg="menu">Back</button></div>';
    if (n.mode === 'single') {
      o += '<h3 class="mt">Season</h3><div class="grid g4" style="grid-template-columns:repeat(5,minmax(0,1fr))">' + G.SEASON_YEARS.map(y => choice('year', y, y + ' ' + G.Seasons[y].name, G.Seasons[y].tagline)).join('') + '</div>';
      o += '<h3 class="mt">Scenario</h3><div class="grid g4">' + D.SCENARIOS.map(s => choice('scenario', s.id, s.name, s.goalText + ' (' + D.PROFILES[s.profile].name + ')')).join('') + '</div>';
    }
    o += '<h3 class="mt">Your team</h3><div class="grid g4">' + inp('num', 'Team number', 'number') + inp('name', 'Team name') + inp('school', 'School / organisation') +
      '<label class="f">Home region<select class="inp" data-chg="ng" data-k="region">' + D.REGIONS.map(r => '<option ' + (n.region === r ? 'selected' : '') + '>' + r + '</option>').join('') + '</select></label>' +
      '<label class="f">Primary colour<input class="inp" type="color" value="' + h(n.c1) + '" data-chg="ng" data-k="c1"></label><label class="f">Secondary colour<input class="inp" type="color" value="' + h(n.c2) + '" data-chg="ng" data-k="c2"></label></div>';
    if (n.mode === 'career' || n.scenario === 'custom') {
      o += '<h3 class="mt">Starting profile</h3><div class="grid g3">' + Object.keys(D.PROFILES).map(k => { const P = D.PROFILES[k]; return choice('profile', k, P.name + ' — ' + U.money(P.money), P.desc + ' ' + P.students + ' students, ' + P.mentors.length + ' mentors.'); }).join('') + '</div>';
    }
    o += '<h3 class="mt">Difficulty</h3><div class="grid g3">' + choice('diff', 'easy', 'Easy', 'Weaker opponents, fewer faults, more sponsor money.') + choice('diff', 'normal', 'Normal', 'The intended experience.') + choice('diff', 'hard', 'Hard', 'Stronger opponents, more faults, stingy sponsors.') + '</div>';
    if (n.mode === 'career') o += '<h3 class="mt">Season order</h3><div class="grid g2">' + choice('order', 'real', 'Real order', '2022 → 2023 → 2024 → 2025 → 2026') + choice('order', 'random', 'Random order', 'All five games, shuffled. The next game is a surprise at each Kickoff.') + '</div>';
    o += '<div class="row mt"><span class="sp"></span><button class="btn primary lg" data-act="startGame">Start ▶</button></div></div></div>';
    return o;
  } };
  UI.A.ng = (v, el) => { UI.st.ng[el.dataset.k] = el.dataset.k === 'num' ? Math.max(1, Math.min(99999, Number(v) || 1)) : v; };
  UI.A.ngSet = arg => { const [k, v] = arg.split('|'); UI.st.ng[k] = k === 'year' ? Number(v) : v; if (k === 'scenario') { const s = D.SCENARIOS.find(x => x.id === v); UI.st.ng.profile = s.profile; } UI.render(); };
  UI.A.startGame = function () {
    const n = UI.st.ng;
    if (!String(n.name).trim()) return UI.toast('Give your team a name', 'bad');
    const scen = n.mode === 'single' ? D.SCENARIOS.find(s => s.id === n.scenario) : null;
    G.Career.newGame({ mode: n.mode, team: { num: Number(n.num), name: String(n.name).trim(), school: n.school, c1: n.c1, c2: n.c2, region: n.region },
      profile: scen && !scen.custom ? scen.profile : n.profile, diff: n.diff, order: n.order, year: n.year, scenario: scen ? scen.id : null });
    G.Save.write('auto');
    UI.go('hq');
    if (G.S.phase === 'kickoff') UI.kickoffModal();
    else UI.modal('<h2>Welcome, Lead Mentor</h2><p class="muted">It\'s October. The first game will be revealed at Kickoff in January.</p><ol class="muted"><li><b>Finance</b> — sign a title sponsor and partners.</li><li><b>Mentors</b> — hire the people you need.</li><li><b>Calendar</b> — register for 1–4 regionals (weeks 1–6).</li><li><b>Design Office</b> — start pre-season research to build Tech Knowledge.</li><li>Press <b>Continue</b> to advance a month.</li></ol><div class="row"><span class="sp"></span><button class="btn primary" data-act="closeModal">Let\'s go</button></div>');
  };

  // =====================================================================
  // LOAD
  // =====================================================================
  UI.S.load = { full: true, html() {
    const rows = G.Save.slots.map(s => {
      const m = G.Save.meta(s);
      return '<div class="card mb"><div class="row"><div class="sp"><b>' + (s === 'auto' ? 'Autosave' : 'Slot ' + s) + '</b><div class="sm muted">' + (m ? h(m.team.num + ' ' + m.team.name + ' · ' + m.year + ' · ' + (m.mode === 'career' ? 'Career' : 'Single season') + ' · ' + U.money(m.money) + ' · ' + new Date(m.savedAt).toLocaleString()) : 'Empty') + '</div></div>' +
        (m ? '<button class="btn primary" data-act="loadSlot" data-arg="' + s + '">Load</button><button class="btn bad" data-act="delSlot" data-arg="' + s + '">Delete</button>' : '') + '</div></div>';
    }).join('');
    return '<div class="menu-wrap"><div class="menu-box" style="max-width:720px"><div class="row"><div class="logo" style="font-size:28px">Load game</div><span class="sp"></span><button class="btn" data-act="nav" data-arg="menu">Back</button></div><div class="mt">' + rows + '</div>' +
      '<div class="card"><b>Import a save</b><p class="sm muted">Paste a save code from <b>☰ → Export save</b>, or choose a save file.</p>' +
      '<label class="f" for="impText">Save code<textarea id="impText" class="inp mono" rows="4" style="resize:vertical;font-size:11px" placeholder="Paste your save code here"></textarea></label>' +
      '<div class="row wrap mt"><input type="file" accept=".json,application/json" id="impFile" class="inp" style="flex:1;min-width:0"><button class="btn primary" data-act="importSave">Import</button></div></div></div></div>';
  } };
  UI.A.loadSlot = s => { if (G.Save.load(s)) UI.go(G.S.phase === 'end' ? 'end' : G.S.event ? 'event' : 'hq'); else UI.toast('Could not load', 'bad'); };
  UI.A.delSlot = s => UI.confirm('Delete save?', 'This cannot be undone.', 'Delete', () => { G.Save.remove(s); UI.render(); });
  UI.A.importSave = () => {
    const done = (ok, msg) => { if (ok) { G.Save.write('auto'); UI.go(G.S.phase === 'end' ? 'end' : G.S.event ? 'event' : 'hq'); } else UI.toast('Import failed: ' + msg + '.', 'bad'); };
    const txt = (document.getElementById('impText') || {}).value || '';
    if (txt.trim()) return G.Save.importText(txt, done);
    const f = document.getElementById('impFile').files[0];
    if (!f) return UI.toast('Paste a save code or choose a save file first.', 'bad');
    G.Save.importFile(f, done);
  };

  // =====================================================================
  // HELP / SETTINGS
  // =====================================================================
  UI.S.help = { full: true, html() {
    const sec = (t, b) => '<div class="card mb"><div class="ct">' + t + '</div><div class="muted" style="line-height:1.55">' + b + '</div></div>';
    return '<div class="menu-wrap"><div class="menu-box" style="max-width:900px"><div class="row"><div class="logo" style="font-size:28px">How to play</div><span class="sp"></span><button class="btn" data-act="back">Back</button></div><div class="mt">' +
      sec('The loop', 'You are the Lead Mentor. Each turn (a month in the offseason, a week in season) you make decisions, then press <b>Continue</b>. Offseason → Kickoff (game reveal) → 7 build weeks → Competition weeks 1–6 → Championship → Season review.') +
      sec('Building the robot', 'In the <b>Design Office</b> choose a <b>concept</b> (development direction) for each subsystem, then run <b>upgrade projects</b> with a focus stat and an effort level. Weekly team hours are shared between active projects by priority. Watch the <b>125 lb</b> weight limit. Buy parts (motors, swerve modules, cameras) in the Workshop — they carry over between seasons.') +
      sec('Tech Knowledge', 'Every concept uses knowledge areas. Building and competing with a concept earns XP; research projects earn XP directly. Higher levels raise ceilings, cut hours and improve reliability — so a turret in one shooting game helps the next. Unused areas decay as students graduate; specialist mentors and a Knowledge Base prevent that.') +
      sec('Money', 'Sponsors pay at Kickoff; goal bonuses pay when met. Sponsor obligations show up as activities during build season. Regionals cost $6,000 (first) / $4,000 (more) plus travel. School funding arrives in September and depends on Program Support.') +
      sec('Events', 'Practice day: pick practice programs (tuning, driver reps, auto, shakedown, scouting). Qualifications: plan each match, then watch or simulate. Top 8 seeds pick alliances; playoffs are double elimination. Win a regional or an Impact / Engineering Inspiration award — or earn enough Regional Pool points — to reach the Championship.') +
      sec('Coach Calls', 'During a match you have 3–6 calls: change pace (push/conserve), switch role (score/defend/feed), set target priority, send the robot to the endgame, chase bonus RPs, avoid contact, or try to reset a faulted robot. Calls take a second or two and drivers with low composure sometimes misread them.') +
      sec('Facilities & shop incidents', 'Workshop facilities (3D printing, CNC, machine shop, programming station, battery station, pit setup, trailer) have levels and a condition that wears down with use. Worn facilities work at lower efficiency. <b>Renovate</b> to restore condition cheaply, or <b>upgrade</b> to the next level. Now and then a shop incident happens — a broken machine, a leaky roof, a snow day. Some ask you to choose (pay to fix it, or take the risk or the delay); others just happen. Either way, the impact lasts one week at most.') +
      sec('Faults & wear', 'Every match wears the robot. Low condition, low reliability, rushed projects and hidden faults raise the chance of brownouts, jams and broken mechanisms. Pit repairs use spare parts; Systems Shakedown and Hardening find hidden faults.') +
      '</div></div></div>';
  } };
  UI.A.back = () => UI.go(G.S && G.S.team ? 'hq' : 'menu');
  UI.S.settings = { full: true, html() {
    const S = G.S;
    return '<div class="menu-wrap"><div class="menu-box" style="max-width:720px"><div class="row"><div class="logo" style="font-size:28px">Settings</div><span class="sp"></span><button class="btn" data-act="back">Back</button></div>' +
      '<div class="card mt"><label class="f">Default match speed<select class="inp" data-chg="prefSpeed">' + [1, 2, 4, 8].map(s => '<option value="' + s + '" ' + (UI.prefs.speed === s ? 'selected' : '') + '>' + s + '×</option>').join('') + '</select></label>' +
      (S && S.mode === 'career' ? '<label class="row mt"><input type="checkbox" data-chg="noFail" ' + (S.settings.noFail ? 'checked' : '') + '> No-fail mode (the program can\'t be cut when Program Support hits 0)</label>' : '') + '</div></div></div>';
  } };
  UI.A.prefSpeed = v => { UI.prefs.speed = Number(v); G.Save.saveSettings(UI.prefs); };
  UI.A.noFail = v => { G.S.settings.noFail = v; };

  // =====================================================================
  // SEASON REVIEW
  // =====================================================================
  UI.S.review = { nav: 'hq', html() {
    const S = G.S, hs = S.history[S.history.length - 1];
    if (!hs) return '<p>No review.</p>';
    let o = '<div class="xs muted">SEASON REVIEW</div><h1>' + hs.year + ' ' + h(G.Seasons[hs.year].name) + '</h1>';
    const head = hs.worldChamp ? 'WORLD CHAMPIONS' : hs.divWin ? 'Championship division winners' : hs.champs ? 'Championship qualifiers' : hs.events.some(e => e.won) ? 'Regional winners' : hs.events.some(e => e.playoffs) ? 'Playoff team' : 'Building season';
    o += '<div class="sub lg acc b">' + head + '</div><div class="grid g3">';
    o += UI.card('Events', hs.events.length ? '<table class="t"><tr><th>Event</th><th>Rank</th><th>Result</th></tr>' + hs.events.map(e => '<tr><td>' + h(e.name) + '</td><td>' + (e.rank ? e.rank + '/' + e.size : '') + '</td><td>' + h(e.finish) + (e.awardNames.length ? '<div class="xs acc">' + h(e.awardNames.join(', ')) + '</div>' : '') + '</td></tr>').join('') + '</table>' : '<p class="muted">No events attended.</p>');
    o += UI.card('Program goals', hs.goals.map(g => '<div class="row sm mb"><span class="' + (g.met ? 'good' : 'bad') + '">' + (g.met ? '✔' : '✘') + '</span><span class="tag">' + g.tier + '</span><span>' + h(D.PROGRAM_GOALS[g.id].text) + '</span></div>').join('') +
      '<div class="hr"></div><div class="kv"><span class="k">Program support</span><span>' + S.support + ' (' + (S.season.supportDelta >= 0 ? '+' : '') + (S.season.supportDelta || 0) + ')</span><span class="k">Reputation</span><span>' + S.rep + '</span><span class="k">Legacy this season</span><span class="acc b">+' + hs.legacy + '</span></div>');
    o += UI.card('Finances', '<div class="kv"><span class="k">Earned</span><span class="good">' + U.money(hs.earned) + '</span><span class="k">Spent</span><span class="bad">' + U.money(hs.spent) + '</span><span class="k">Balance</span><span class="' + (hs.money < 0 ? 'bad' : '') + ' b">' + U.money(hs.money) + '</span><span class="k">Avg RP / qual match</span><span>' + hs.avgRP.toFixed(2) + '</span></div>');
    o += '</div>';
    const last = S.upcoming >= S.order.length || S.mode === 'single';
    o += '<div class="hint mt">' + (last ? 'This was your final season.' : S.support <= 0 && !S.settings.noFail ? 'Program Support has collapsed — the school is ending the program.' : 'Next: the offseason. Graduation in June, recruiting in September, sponsors and registration in October, Kickoff in January.') + '</div>';
    o += '<div class="row mt"><span class="sp"></span><button class="btn primary lg" data-act="reviewNext">' + (last ? 'Final summary ▶' : 'Continue to offseason ▶') + '</button></div>';
    return o;
  } };
  UI.A.reviewNext = function () { const S = G.S; G.Career.advance(S); UI.go(S.phase === 'end' ? 'end' : 'hq'); };

  // =====================================================================
  // END / SUMMARY
  // =====================================================================
  UI.S.end = { nav: 'hq', html() {
    const S = G.S;
    let o = '';
    if (S.mode === 'single') {
      const g = G.Career.grade(S);
      o += '<div class="xs muted">SINGLE SEASON CHALLENGE</div><h1>Grade: <span class="acc" style="font-size:44px">' + g.grade + '</span></h1><div class="sub">' + h(g.goalText) + ' — ' + (g.met ? '<span class="good">achieved</span>' : '<span class="bad">not achieved</span>') + ' · legacy ' + g.legacy + '</div>';
    } else {
      const L = S.legacy;
      const title = S.endReason === 'fired' ? 'Program cut' : L >= 1500 ? 'Hall of Fame Program' : L >= 900 ? 'Dynasty' : L >= 500 ? 'Regional Powerhouse' : L >= 200 ? 'Rising Program' : 'Building Program';
      o += '<div class="xs muted">CAREER COMPLETE</div><h1>' + h(title) + '</h1><div class="sub">' + S.team.num + ' ' + h(S.team.name) + ' · Legacy points <b class="acc">' + L + '</b>' + (S.worldChamps ? ' · ' + S.worldChamps + '× World Champions' : '') + '</div>';
    }
    o += '<div class="card"><table class="t"><tr><th>Season</th><th>Events</th><th>Best result</th><th>Awards</th><th>Champs</th><th class="num">Legacy</th></tr>' + S.history.map(hs => {
      const best = hs.worldChamp ? 'World Champion' : hs.divWin ? 'Division winner' : hs.events.some(e => e.won) ? 'Regional winner' : hs.events.some(e => e.finalist) ? 'Finalist' : hs.events.some(e => e.playoffs) ? 'Playoffs' : '—';
      return '<tr><td>' + hs.year + ' ' + h(G.Seasons[hs.year].name) + '</td><td>' + hs.events.length + '</td><td>' + best + '</td><td>' + hs.awards.length + '</td><td>' + (hs.champs ? '✔' : '') + '</td><td class="num">' + hs.legacy + '</td></tr>';
    }).join('') + '</table></div>';
    const k = D.AREAS.map(a => ({ a, l: G.Robot.know(S, a.id) })).filter(x => x.l > 0).sort((p, q) => q.l - p.l);
    o += '<div class="card mt"><div class="ct">Knowledge legacy</div>' + (k.length ? k.map(x => UI.tag(x.a.name + ' Lv' + x.l, 'acc')).join(' ') : '<span class="muted">—</span>') + '</div>';
    o += '<div class="row mt"><button class="btn" data-act="nav" data-arg="history">Season details</button><span class="sp"></span><button class="btn primary" data-act="quitMenu">Main menu</button></div>';
    return o;
  } };
})();
