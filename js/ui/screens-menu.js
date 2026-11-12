'use strict';
/* FRC Manager — main menu, new game setup, load, help, settings, season review, career summary */
(function () {
  const U = G.U, D = G.Data, h = U.esc, UI = G.UI;

  // =====================================================================
  // MAIN MENU
  // =====================================================================
  UI.S.menu = { full: true, html() {
    const auto = G.Save.meta('auto');
    return '<div class="menu-wrap"><div class="menu-box"><div class="logo">FRC <span>MANAGER</span></div><div class="muted mb">Run a FIRST Robotics Competition team through ten seasons, from 2016 to 2026. Unofficial fan game.</div>' +
      '<div class="grid g3 mt">' +
      '<div class="choice" data-act="newGame" data-arg="career"><div class="lg b">New Career</div><div class="sm muted">Start in any year from 2016 and play through 2026: up to ten seasons, in real or random order. Build a program that learns from every robot.</div></div>' +
      '<div class="choice" data-act="newGame" data-arg="single"><div class="lg b">Single Season Challenge</div><div class="sm muted">Pick one of the ten games and a scenario. Graded S to D.</div></div>' +
      '<div class="choice" data-act="continueGame" ' + (auto ? '' : 'style="opacity:.5"') + '><div class="lg b">Continue</div><div class="sm muted">' + (auto ? h(auto.team.num + ' ' + auto.team.name + ' · ' + (auto.cy || auto.year) + ' · ' + new Date(auto.savedAt).toLocaleString()) : 'No autosave yet') + '</div></div>' +
      '</div><div class="row mt wrap"><button class="btn" data-act="nav" data-arg="load">Load / import</button><button class="btn" data-act="nav" data-arg="help">How to play</button><button class="btn" data-act="nav" data-arg="notes">What\'s new in v' + h(G.VERSION) + '</button></div>' +
      '<div class="grid g5 mt">' + G.SEASON_YEARS.map(y => '<div class="card flat seasoncard" data-act="seasonCard" data-arg="' + y + '" title="Open this game\'s Kickoff briefing"><div class="xs muted">' + y + '</div><div class="b">' + h(G.Seasons[y].name) + '</div><canvas data-prev="' + y + '" width="330" height="164" style="width:100%;border-radius:6px;margin-top:6px"></canvas><div class="xs muted mt">' + h(G.Seasons[y].tagline) + '</div></div>').join('') + '</div>' +
      '<p class="xs dim mt">Version ' + h(G.VERSION) + ' · Not affiliated with or endorsed by FIRST®, Formula 1® or Frontier Developments. Sponsors, regionals and teams are fictional; team numbers are random.</p></div></div>';
  }, after() { document.querySelectorAll('canvas[data-prev]').forEach(c => G.Render.preview(c, Number(c.dataset.prev))); } };
  // a season card opens that game's Kickoff briefing, with a way straight into a Single Season Challenge of it
  UI.A.seasonCard = y => UI.gameBriefModal(Number(y));
  UI.A.playSeason = y => { UI.closeModal(); UI.A.newGame('single'); UI.st.ng.year = Number(y); UI.render(); };
  UI.A.continueGame = () => { if (G.Save.load('auto')) { UI.go(G.S.phase === 'end' ? 'end' : G.S.event ? 'event' : 'hq'); } else UI.toast('No autosave found', 'bad'); };

  // =====================================================================
  // NEW GAME
  // =====================================================================
  UI.A.newGame = function (mode) {
    const rng = G.makeRng(Date.now() & 0xffffff);
    UI.st.ng = { mode, num: rng.int(1000, 9999), name: D.teamName(rng), school: rng.pick(D.SCHOOLS) + ' High School', c1: UI.TEAM_COLORS[0].hex, c2: UI.TEAM_COLORS2[0].hex, avatar: rng.pick(UI.AVATARS), region: 'Midwest',
      profile: mode === 'single' ? 'established' : 'established', diff: 'normal', order: 'real', year: 2026, scenario: 'custom', start: G.startYears('real')[0] };
    UI.go('newgame');
  };
  UI.S.newgame = { full: true, html() {
    const n = UI.st.ng;
    const inp = (k, lbl, type) => '<label class="f">' + lbl + '<input class="inp" type="' + (type || 'text') + '" value="' + h(n[k]) + '" data-chg="ng" data-k="' + k + '"></label>';
    const choice = (k, v, title, desc) => '<div class="choice ' + (n[k] === v ? 'on' : '') + '" data-act="ngSet" data-arg="' + k + '|' + v + '"><div class="b">' + title + '</div>' + (desc ? '<div class="xs muted">' + desc + '</div>' : '') + '</div>';
    const starts = G.startYears(n.order); if (!starts.includes(n.start)) n.start = starts[0];
    if (n.home && (n.mode !== 'career' || !(D.DISTRICT[n.home] && D.DISTRICT[n.home].from <= n.start))) n.home = null; // that district does not exist yet in the start year
    const ngPx = U.pxOf(n.mode === 'single' ? n.year : n.start); // amounts on this page: in the first season's dollars
    let o = '<div class="menu-wrap"><div class="menu-box"><div class="row"><div class="logo" style="font-size:28px">' + (n.mode === 'career' ? 'New Career' : 'Single Season Challenge') + '</div><span class="sp"></span><button class="btn" data-act="nav" data-arg="menu">Back</button></div>';
    if (n.mode === 'single') {
      o += '<h3 class="mt">Season</h3><div class="grid g4" style="grid-template-columns:repeat(5,minmax(0,1fr))">' + G.SEASON_YEARS.map(y => choice('year', y, y + ' ' + G.Seasons[y].name, G.Seasons[y].tagline)).join('') + '</div>';
      o += '<h3 class="mt">Scenario</h3><div class="grid g4">' + D.SCENARIOS.map(s => choice('scenario', s.id, s.name, U.infl(s.goalText, ngPx) + ' (' + D.PROFILES[s.profile].name + ')')).join('') + '</div>';
    }
    o += '<h3 class="mt">Your team</h3><div class="grid g4">' + inp('num', 'Team number', 'number') + inp('name', 'Team name') + inp('school', 'School / organisation') +
      '<label class="f">' + (n.mode === 'career' ? 'Home: a regional area or a district' : 'Home region') + '<select class="inp" data-chg="ng" data-k="homeSel"><optgroup label="Regional areas">' + D.REGIONS.map(r => '<option value="r:' + r + '" ' + (!n.home && n.region === r ? 'selected' : '') + '>' + r + '</option>').join('') + '</optgroup>' +
        (n.mode === 'career' ? '<optgroup label="Districts">' + G.World.districtsAt(n.start).map(d => '<option value="d:' + d.id + '" ' + (n.home === d.id ? 'selected' : '') + '>' + h(d.name) + ' (' + d.region + ')</option>').join('') + '</optgroup>' : '') + '</select></label>' +
      '</div>';
    if (n.mode === 'career') {
      const d = n.home ? D.DISTRICT[n.home] : null;
      o += '<div class="hint mt">' + (d ? '<b>' + h(d.name) + '</b> · ' + h(d.desc) + ' In ' + n.start + ': ' + G.World.sizeOf(d, n.start) + ' teams, ' + Math.max(2, Math.round(G.World.sizeOf(d, n.start) * 2 / 36)) + ' district events, a District Championship of ' + d.dcmp + '. <b>District play:</b> one fee covers two local district events of about 36 teams with 12 qualification matches each. Every result earns district points; the best teams go to the District Championship, and the district sends its share of teams to the Championship from the top of the points list.'
        : '<b>Regional team in the ' + h(n.region) + '.</b> Register for one to four regionals (bigger events, more travel). Qualify for the Championship by winning a regional, with the Impact, Engineering Inspiration or Rookie All-Star award, or ' + (G.Era.wildcards(Number(n.start) || 0) ? 'on a wildcard as a finalist (the Regional Pool begins in 2025).' : 'through the Regional Pool.')) + '</div>';
    }
    // avatar and colours (the whole UI picks up the primary colour)
    o += '<div class="grid g3 mt"><div><div class="sm muted mb">Team colour</div><div class="swatches">' + UI.TEAM_COLORS.map(c => '<button class="swatch ' + (n.c1 === c.hex ? 'on' : '') + '" style="background:' + c.hex + '" title="' + c.name + '" data-act="ngSet" data-arg="c1|' + c.hex + '"></button>').join('') + '</div>' +
      '<div class="sm muted mb mt">Second colour</div><div class="swatches">' + UI.TEAM_COLORS2.map(c => '<button class="swatch ' + (n.c2 === c.hex ? 'on' : '') + '" style="background:' + c.hex + '" title="' + c.name + '" data-act="ngSet" data-arg="c2|' + c.hex + '"></button>').join('') + '</div></div>' +
      '<div class="span2"><div class="sm muted mb">Team emblem</div><div class="avpick">' + UI.AVATARS.map(a => '<button class="' + (n.avatar === a ? 'on' : '') + '" data-act="ngSet" data-arg="avatar|' + a + '" title="' + a + '">' + UI.avatar({ avatar: a, c1: n.c1, c2: n.c2 }, 40) + '</button>').join('') + '</div>' +
      '<div class="row mt">' + UI.avatar(n, 56) + '<div><div class="lg b">' + h(String(n.num)) + ' ' + h(n.name) + '</div><div class="sm muted">' + h(n.school) + ' · ' + h(n.home ? D.DISTRICT[n.home].name : n.region) + '</div></div></div></div></div>';
    if (n.mode === 'career' || n.scenario === 'custom') {
      o += '<h3 class="mt">Starting profile</h3><div class="grid g3">' + Object.keys(D.PROFILES).map(k => { const P = D.PROFILES[k]; return choice('profile', k, P.name + ' — ' + U.money(P.money, ngPx), P.desc + ' ' + P.students + ' students, ' + P.mentors.length + ' mentors.'); }).join('') + '</div>';
    }
    o += '<h3 class="mt">Difficulty</h3><div class="grid g3">' + choice('diff', 'easy', 'Easy', 'Weaker opponents, fewer faults, more sponsor money.') + choice('diff', 'normal', 'Normal', 'The intended experience.') + choice('diff', 'hard', 'Hard', 'Stronger opponents, more faults, stingy sponsors.') + '</div>';
    if (n.mode === 'career') {
      const cal = G.calFrom(n.start), nS = cal.length;
      o += '<h3 class="mt">Season order</h3><div class="grid g2">' + choice('order', 'real', 'Real order', 'Every year plays its own game.') + choice('order', 'random', 'Random order', 'The games are shuffled: the next one is a surprise at each Kickoff. Technology, vendors, prices and events still follow the calendar year.') + '</div>';
      o += '<h3 class="mt">Start year <span class="sm muted" style="font-weight:400">· the career runs through 2026' + (cal.includes(2020) && cal.includes(2022) ? ' (no 2021 season)' : '') + '</span></h3><div class="grid g4" style="grid-template-columns:repeat(5,minmax(0,1fr))">' +
        starts.map(y => choice('start', y, String(y), (n.order === 'real' && G.Seasons[y] ? G.Seasons[y].name + ' · ' : '') + G.calFrom(y).length + ' season' + (G.calFrom(y).length === 1 ? '' : 's'))).join('') + '</div>' +
        '<div class="hint mt">' + nS + ' season' + (nS === 1 ? '' : 's') + ': ' + cal[0] + (nS > 1 ? ' to ' + cal[nS - 1] : '') + '. Money is shown in each year\'s own dollars: prices and budgets rise a little every year.</div>';
    }
    o += '<div class="row mt"><span class="sp"></span><button class="btn primary lg" data-act="startGame">Start ▶</button></div></div></div>';
    return o;
  } };
  UI.A.ng = (v, el) => {
    const n = UI.st.ng, k = el.dataset.k;
    if (k === 'homeSel') { if (String(v).indexOf('d:') === 0) { n.home = String(v).slice(2); n.region = D.DISTRICT[n.home].region; } else { n.home = null; n.region = String(v).slice(2); } UI.render(); return; }
    n[k] = k === 'num' ? Math.max(1, Math.min(99999, Number(v) || 1)) : v;
  };
  UI.A.ngSet = arg => { const [k, v] = arg.split('|'); UI.st.ng[k] = k === 'year' || k === 'start' ? Number(v) : v; if (k === 'c1') UI.applyTheme(UI.st.ng); if (k === 'scenario') { const s = D.SCENARIOS.find(x => x.id === v); UI.st.ng.profile = s.profile; } UI.render(); };
  UI.A.startGame = function () {
    const n = UI.st.ng;
    if (!String(n.name).trim()) return UI.toast('Give your team a name', 'bad');
    const scen = n.mode === 'single' ? D.SCENARIOS.find(s => s.id === n.scenario) : null;
    G.Career.newGame({ mode: n.mode, team: { num: Number(n.num), name: String(n.name).trim(), school: n.school, c1: n.c1, c2: n.c2, avatar: n.avatar, region: n.region, home: n.mode === 'career' ? n.home || null : null },
      profile: scen && !scen.custom ? scen.profile : n.profile, diff: n.diff, order: n.order, year: n.year, start: n.start, scenario: scen ? scen.id : null });
    G.Save.write('auto');
    UI.go('hq');
    if (G.S.phase === 'kickoff') UI.kickoffModal();
    else if (!UI.Tut.start('season')) UI.modal('<h2>Welcome, Lead Mentor</h2><p class="muted">It\'s October. The first game will be revealed at Kickoff in January. Sign sponsors (Finance), hire mentors, look at facilities (Workshop), stock up on parts (Inventory), register for regionals (Calendar) and start research (Design Office), then press <b>Continue</b>.</p>' + (function () { const eb = G.Career.eraBrief(G.S); return eb ? '<div class="card flat mb"><div class="xs muted b">' + h(eb.title.toUpperCase()) + '</div><ul class="story-ul">' + eb.lines.map(x => '<li>' + h(x) + '</li>').join('') + '</ul></div>' : ''; })() + '<div class="row"><span class="sp"></span><button class="btn primary" data-act="closeModal">Let\'s go</button></div>');
  };

  // =====================================================================
  // LOAD
  // =====================================================================
  UI.S.load = { full: true, html() {
    const rows = G.Save.slots.map(s => {
      const m = G.Save.meta(s);
      return '<div class="card mb"><div class="row"><div class="sp"><b>' + (s === 'auto' ? 'Autosave' : 'Slot ' + s) + '</b><div class="sm muted">' + (m ? h(m.team.num + ' ' + m.team.name + ' · ' + (m.cy || m.year) + ' · ' + (m.mode === 'career' ? 'Career' : 'Single season') + ' · ' + U.money(m.money, m.px || 1) + ' · ' + new Date(m.savedAt).toLocaleString()) : 'Empty') + '</div></div>' +
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
  // =====================================================================
  // VERSION NOTES ("What's new")
  // =====================================================================
  // Newest first. Keep G.VERSION (core.js) equal to the first entry.
  G.RELEASES = [
    { v: '2.9.4', title: 'Preview of 3.0: the Festival of Champions, a livestream, and brackets you can follow', notes: [
      'The Festival of Champions (July 2017). A team that wins Einstein in 2017 now gets the whole event. A pop-up on arrival tells what the real Festival was and why it was held only once. Both champion alliances are expected, so the event cannot be skipped, and the trip is paid for. The series ends with a celebration of its own (the winners are the one champion of 2017; the finalists remain World Champions of their city), a banner under Championship honours whose celebration can be replayed from the History page, and its own result page. On leaving you still get the story every team gets, "One champion after all", told about your series.',
      'A livestream for everyone else. Teams that are not in the Festival get an announcement in July (a pop-up, the inbox, the Calendar and a button on Headquarters). Watching is optional and free, takes none of the team\'s hours, and nothing is at stake. The series is played on the field in the match viewer: you watch as a spectator, with no coach calls, and can watch each match, skip to its result, skip to the end or close the stream. The pop-up about the real event is shown to anyone who opens the stream. If you do not watch, the result arrives the next month.',
      'The result, up front. The story everybody gets after the Festival ("One champion after all", pop-up and Inbox) now shows the series as a block of its own: the score, every match with its winner, and the six teams that played. Each team is listed with its season in your world: its finish, rank and alliance at every event, judged awards, how it earned its Championship place, and what its robot scored in the series. The champion alliances you did not see win are now drawn from the teams that really qualified for that Championship, from its half of the world.',
      'Brackets. A best-of-three series now shows every game it took (two or three), each with its score and its winner, and where the series stands. In every bracket your alliance is easy to follow: its rows are marked, its path through the bracket is drawn in gold (dashed where it drops to the lower bracket), and a line above the bracket says where you stand and which match is next.',
      'Elite designs. Four games get one more mechanism, the hardest of its season, marked "elite design": the 2016 Turret + hood shooter (aims while driving, hard to defend), the 2019 Turreted elevator + wrist (places without turning the chassis: a tank drive gains the most, a swerve or mecanum drive little), and the 2023 and 2025 Pivoting telescope (scores like the best lift of its year, never tips, and is a little better on the Charge Station and the cage). Each beats the next best by a few percent for much more work, and only the strongest teams in the world field them. The other lifts of 2019, 2025 and the 2023 double-jointed arm moved down one step of complexity to make room.',
      'Things that go wrong. A failed high climb in 2016 to 2020 now ends in a fall about a quarter of the time (it was one in twenty). Tipping in 2018 and 2019 depends much more on the driver. In 2020 and 2026 a robot can beach itself on a ball for a few seconds: in 2020 most of all on the generator bars, in 2026 less often and mostly on the bumps. A beached robot that another robot runs into is freed at once seven times in ten and tips over three times in ten. A buddy climb that fails can drop the partner and damage it: tick "Don\'t let a partner carry us" in the match plan to stay on the ground. For all of these a skilled driver has fewer, Push pace causes more and Conserve fewer.',
      'Effort. Rush now costs 15% more materials and Thorough 10% less; hours and results are as they were. Thorough used to cost more money for about what free extra hours give.',
      'Shorter pages, a glossary. Long explanations on the pages are now a line or two with a small "?" that opens the guide at the right section. How to play has a Glossary. The lost season is marked as the game\'s own timeline: the real 2020 season was stopped part-way through and its Championships were never held.',
      'Fix. The Festival\'s result page showed a World Champions banner that belonged to another event.'
    ] },
    { v: '2.9.3', title: 'Preview of 3.0: end effectors, drive sets, mechanisms in a box and an inbox worth reading', notes: [
      'End Effector. 2018, 2019, 2023 and 2025 have a new subsystem: the claw or gripper at the end of the lift, with its own Grip stat. A poor one costs placements and a little time on every score. In those games the ground intake is now optional: without one, the end effector collects the pieces itself. Each game offers three (a claw that throws cubes in 2018, one that keeps hold of a missed hatch in 2019, a wristed gripper in 2023, a pivoting coral head in 2025). A robot from an older save gets its end effector automatically.',
      'Drivetrain parts. The two vendors now sell West Coast drive sets, the standard before swerve: a West Coast drive runs on two of them, and better sets raise its speed and pushing power. Sterling sells them until it closes; Lumen stops making them when it launches its own swerve module and sells the last stock through the 2022 season. A West Coast drive also runs on two COTS Drive gearboxes, at lower performance, so it can always be built. The same gearboxes drive a mecanum (4) or make a kit chassis faster (2). The Kit drivetrain (the old kitbot gearbox) fits the kit chassis only and is the slowest of the three. In the Inventory the drive sets share a Drivetrain section with the swerve modules. Mecanum is slower than it was and nearly helpless against a defender: with the same robots, a West Coast drive scores 1 to 12% more, and keeps that lead when defended.',
      'Mechanisms in a box. A new story for the lost year: arm, intake, indexer, climber and gripper kits are first sold in August 2021, together with GridTube frame stock that every mechanical build can use (10% fewer hours and 15% less material, on top of the kits). Before that only elevator, shooter and turret kits exist. The catalogue is now called Subsystem COTS. Its Kit of Parts shelf holds four basic subsystem kits (KOP gripper, intake, shooter and lift), sold in every year: each helps only the simplest concept of a subsystem, by 20% of the hours and materials. The Kit drivetrain is listed in the Drivetrain section under Electronics.',
      'An inbox worth reading. About eighty new messages: mid-season arguments about every game (is a shooter worth it in 2017?), trends in mechanisms, what the two vendors say about each other, and rumours ahead of the calendar\'s big changes. None of them pops up. They sit in the Inbox among the other news, and some are worth acting on.',
      'Second-hand prices follow the news. A part that has been overtaken sells for less from the day its replacement is on sale: an older version, a brushed motor once brushless ones exist, Sterling parts, West Coast drive sets once swerve modules are sold, a pneumatics kit as motors take over. The Sell tab shows each markdown and the reason.',
      'Rules. A registration made this turn can be undone for everything it cost, until you press Continue. A team wins the FIRST Impact Award once: Hall of Fame teams are not judged again. Know-how at Level 4 or 5 is tuned to the way things were: a rule, technology or design change costs it half as much again and always takes one level, with or without a specialist mentor. The Knowledge Base needs a 25-hour update every year, or it protects nothing. Facilities wear less than half as fast in the offseason. Pneumatics fade a year later (10% from the 2023 season).',
      'Also. The 2026 season gets its recap before the career summary, and the season review\'s own button now shows the pop-ups of the new offseason (they were queued but never shown). The season cards on the main menu open that game\'s Kickoff briefing, with a button to play it as a Single Season Challenge. Texts brought up to date: ten seasons on the main menu, how often vendors launch, the Apex founding story (the founder is one of the six engineers), the 2025 recap (four seasons after the lost year).'
    ] },
    { v: '2.9.2', title: 'Preview of 3.0: the 2016–2020 games checked against the official manuals', notes: [
      'Fields. The five classic fields now follow the zone and element drawings in the game manuals. 2016: the Low Bar stands at the guardrail, straight across from the attackers\' own Secret Passage; the audience picks the defense in position 3 and you pick the other three. 2017: the airship is its real size, with one rope on the face toward the alliance wall and two toward the neutral zone, and the Retrieval Zone is the band in front of the angled Loading Station. 2018: the Scale plates sit where they should and the Exchange is left of centre for each alliance. 2019: the cargo depots are against the wall, the two ships stand apart at the centre line and the rockets are 8 ft from it. 2020: the Shield Generator has its floor bars and its legs at the trench edges, and the Control Panel sits on a tunnel.',
      'Limited game pieces. 2016 has 18 boulders, 2018 has 30 cubes for each alliance and 2020 has 48 Power Cells. A boulder or cell you score comes back out on the other alliance\'s side (their Secret Passage, their Loading Bay). In 2020 that makes two shooters and a defender the strong line-up.',
      '2020 in detail. Robots slow down over the steel bars under the Shield Generator, and the bars wear swerve modules and mecanum wheels (a tank drive is not affected). A trench-height robot crosses under the Control Panel instead, where nobody may touch it. The tunnel is one robot wide, so two trench runners hold each other up, and defenders wait at its mouth and outside the Loading Zone. A low frame climbs more slowly and a defender can block some of its shots.',
      'Rules from the manuals. Contact in a protected zone is a tech foul where the manual says so, and touching a robot in its endgame zone awards it the climb. 2016: the tower has strength 10 at District Championships and the Championship, a tech foul makes it one stronger, and attackers in the courtyard may not be touched in the last 20 seconds. 2017: the boiler counts five balls a second and stops at the buzzer. 2018: taking ownership scores a point at once. 2019: the HAB Zone is protected all match and includes the Loading Stations, and the two bays in the ship\'s nose start with cargo that a sandstorm hatch keeps.',
      'Human players. In 2017, 2019, 2020, 2023, 2024 and 2025 the human player feeds the robot all match, and their skill now sets the loading speed: 5 to 10% of an alliance\'s score between a beginner and an expert crew. In 2016, 2018, 2022 and 2026 it hardly matters. An alliance uses its two best human players.',
      '2017 fuel and buddy climbs. Most 2017 teams now run gears and a rope and nothing else: a fuel shooter misses most of what it fires until it is well developed, so it only pays on strong robots. Each of the five hoppers is tipped once, on its own: by a shooter catching its fuel, or by an opposing gear robot sent to tip it first so that nothing is caught (your coach can order that with "Tip their hoppers first"). The fuel then lies all over the carpet and has to be swept up, slowly. A buddy climber, which lifts a partner that parked underneath, is on offer in 2018, 2019 and now 2020, the games whose rules allowed it.'
    ] },
    { v: '2.9.1', title: 'Preview of 3.0: vendor loyalty, a longer banner wall and the 2020 recap', notes: [
      'Vendor loyalty. Each vendor keeps a loyalty level for your team, built from the seasons your competition robot runs on its electronics and from what you order. Every new level brings a loyalty sponsorship as a pop-up in September, with a choice of free parts at Kickoff, a voucher, or a sale until Kickoff; a team that stays with one vendor gets three in a ten-season career. Loyal teams also find parts in stock more often in season. The Electronics tab shows your level with each vendor.',
      'History: the banner wall uses smaller banners once a long career has hung many of them, a District Championship win now earns a banner, and the robots of past seasons wrap into rows. The 2020 season has its recap, shown before the season that never came.',
      'Pop-ups: the month in a window\'s header now appears only on offseason news (Stop Build Day no longer says December in March), each product in Apex\'s first launch has its own description, and the performance figures on launch cards stay inside the card.'
    ] },
    { v: '2.9.0', title: 'Preview of 3.0: ten seasons (2016–2026) and the district model', notes: [
      'A career now covers ten seasons. Start in any year from 2016 to 2026 (there is no 2021 season) and play through to 2026. Five games are new: 2016 FIRST STRONGHOLD, 2017 FIRST STEAMWORKS, 2018 FIRST POWER UP, 2019 DESTINATION: DEEP SPACE and 2020 INFINITE RECHARGE, each with its own field, robot concepts, six AI robot types, strategies, news and chatter. In random order the games are shuffled, but everything below still follows the calendar year.',
      'Careers saved in v2.5 load and finish exactly as before. New features apply to careers started in this version or later.',
      'Money follows the year. Every price, fee and budget is shown in the dollars of the current season, about 27% lower in 2016 than in 2026, so a 2016 budget buys what it bought then.',
      'A third vendor. From 2016 to 2019 the premium catalogue is Sterling Motion, with brushed motors under their own names. In the 2018 offseason Lumen launches the first brushless motor at about the same price; Sterling has no answer, holds a clearance sale and closes, and Apex Motion opens for the 2020 season. Sterling parts fit Apex parts, and old stock can be resold at a discount.',
      'Technology by year. Swerve is team-built before 2020 (a CNC Router or a Lathe, far more hours, fragile) and sold as modules afterwards. Vision cameras go on sale for 2018, and AprilTags arrive in 2023, when vision also starts helping autonomous. Pneumatics kits save fewer hours every few years. AI teams follow the same curve: almost no swerve in 2016, most strong teams by 2024.',
      'Stop Build Day (2016–2019): after build season the competition robot is bagged. You can still develop new mechanisms and upgrades: they are packed when finished and fitted in the pits on practice day (Install Upgrade), or in the robot access window for district teams. Hardware projects run at half speed and drivers cannot practise at home, unless a second robot carries the work.',
      'Playoffs by year: single elimination with best-of-three series through 2022, double elimination from 2023. The Championship changes too: one in 2016, two from 2017 to 2020 with a round robin on Einstein, one again from 2022. In 2017 the two winning alliances meet at the Festival of Champions, a best of five in July.',
      'The lost season. Right after the 2020 Championship a pandemic shuts everything down. The 2021 season is cancelled, the calendar jumps to June 2021, and you choose two programs for the year at home. Know-how, student skills, mentors, sponsors and a fifth of all teams are lost. The 2021 offseason events are played with the 2020 robot.',
      'Districts. Choose a district as your home (Lakeshore, Harbor, Evergreen; Mesa from 2019; Sierra from 2026) or stay a regional team. District teams play two local two-day events for one fee, earn district points with the real formula, and qualify through a District Championship in week 7. When a district forms in your area, a pop-up the July before lets you join or stay regional.',
      'Wildcards before the Regional Pool. Through 2024 a regional team qualifies by winning, with the Chairman\'s (Impact), Engineering Inspiration or Rookie All-Star award, or on a wildcard: when a team that has already qualified earns another place at a regional, that place goes to the finalist alliance, captain first. The Regional Pool takes over in 2025, as it really did.',
      'A living world. Every team and every event of the season is simulated: about 740 teams in 2016, 930 in 2020, 760 after the lost season and 900 in 2026, with rookies arriving and teams folding every year. The new World page (District page for district teams) shows standings, every event\'s winners and who has qualified for the Championship. Your Championship division is made of the teams that really qualified.',
      'Stories. Big changes arrive as pop-ups with their background: a season recap every year, the first vision camera, the brushless motor, the fall of Sterling and the alumnus who founded Apex, the first competitive swerve drives, the end of bag day, double elimination, AprilTags, new districts, and the Chairman\'s Award becoming the Impact Award in 2023. A career that starts later gets one letter with the state of the art.',
      'History shows every season\'s robot, drawn as it competed, and you can name each robot in the Garage. The lost year has its own card.',
      'Two optional pre-match choices: in 2016 your alliance picks the defenses the opponents must cross, and in 2018 the order in which the Vault buys Levitate, Boost and Force.',
      'How to play has a new guide, The decade, and the other guides cover the classic games, districts and the older playoff formats.'
    ] },
    { v: '2.5', title: 'Finals game by game, sponsor outlook and the electrical shakedown', notes: [
      'Playoff bracket: the finals show every game. Final 1, Final 2 and Final 3 each get their own box with both alliances and the score (Final 3 is marked "if needed" until the series stands at one win each), and a line above them gives the state of the series ("A2 leads 1–0"). The Next strip names the game too: "Next: Final 2 against Alliance 2".',
      'Finance has a Sponsor funding card. This season: base money paid, bonuses reached and bonuses still possible. Next season: the expected base (contracts that continue, plus deals up for renewal weighted by their renewal chance) and the possible max bonus. In the offseason it shows how last season ended and what is already signed for Kickoff. Bonus amounts under each sponsor now include that sponsor\'s +50% bonus perk, so they add up to the totals.',
      'A second robot helps the electrical team too. Every week a second robot runs in season (a test chassis is enough, even before the competition robot drives) builds an electrical shakedown from the testing hours you run. At 100% (30 hours) the competition robot has 40% fewer brownouts and comms dropouts at its first event, 25% at the second and 10% after that, and the team gains Electrical & Reliability XP every week. Build the chassis early in build season to have it ready for your first event. The bar is in the Design Office under Testing hours.',
      'Offseason tech changes: when an area held XP far above the top level, the pop-up and the inbox post now say what happened ("2403 → 938 XP: only 1250 XP still counted as current, then −25%") instead of showing only the percentage.',
      'FIRST Impact Award without playing on Einstein: a regional Impact Award winner that is knocked out in its division (or not picked) now goes to Einstein anyway and watches from the stands. The other alliances play the bracket, the six Finalists are named before Final 1 and the winner after it with the same ceremony and celebration, and the finishing page shows your new banner, the award list and the whole Einstein bracket.',
      'Workshop space. Every facility level now takes floor space in square feet (a full practice field 2,200, a CNC router 160, the trailer none), and the school decides how much room the team has, in three levels: the robotics classroom (2,550 sq ft), the technology wing (3,850) and a robotics center (5,100, which fits everything at its top level). A rookie starts in the classroom; established and powerhouse teams start in the technology wing. At a season review the school moves you up when Program Support has reached 80 (technology wing) or 90 (robotics center), and room is never taken back. The Workshop shows the floor plan as a bar, and an upgrade that does not fit is greyed out.',
      'Four new facilities: an Electronics Workbench (fewer brownouts and comms dropouts, motors and electronics wear more slowly), a Welding Station (hardening and lightweighting take fewer hours and do more, more reliable new builds), a Team Meeting Room (outreach counts for more, Impact presenters rehearse here) and an FTC Team Space (run one to three FTC teams of your own: each takes a feeder program slot, costs $300 a year instead of $1,000 and counts 1.8 times for recruit quality).',
      'The school board and your sponsors give back. When Program Support rises by 6 or more in a season the board renovates every worn facility for free; at +12 it adds a grant for one upgrade of your choice (up to $12,000). The season review and a board letter list what you got. Satisfied sponsors donate equipment: a facility level that matches their business, if your workshop has room, announced with a pop-up. The higher a sponsor\'s satisfaction above 60, the likelier. With every sponsor slot filled and no sponsor activity skipped it averages about one donation a year (fewer in the first year, at most one per season and one per offseason).',
      'Drive team: a fifth, optional role, the Technician (Mechanism speeds up pit repairs, Composure catches pre-match mistakes). "Auto-pick best" now gives the coach seat to your best student strategist unless the adult behind the glass is better, and the list says what that adult is worth. Matches count for every role. Awareness now matters on the field: a driver who reads the game loses less time to defenders and fouls less. Column headers in the student table explain each skill on hover.',
      'Playoff bracket in the official layout: rounds left to right, the upper bracket on top, the lower bracket below, lines showing where each winner goes, and open slots that say "Winner of M7". Pit time in the playoffs now follows the bracket: the matches other alliances play between two of yours (an upper-bracket winner rests longer than a lower-bracket alliance on back-to-back matches), plus the break before and between finals. Qualification matches already used the gap in the schedule.',
      'The Championship has its own look: division colours on your division\'s pages, and gold, stars and the eight division champions (crossed out as they fall) on Einstein. The match viewer joins in: the field is framed in the division colour or in gold, and the scoreboard names the alliances and their divisions.',
      'After a match, the buttons to prepare or simulate the next one are at the top of the result page, where they are on the event page, so you can play through a schedule without moving the mouse across the screen. Pages also keep their scroll position when a button redraws them.',
      'Reputation is earned more slowly, and the last points are the hardest: a gain counts for less the higher your reputation is, while losses count in full. A powerhouse now starts at 85 reputation and 72 Program Support. A team is full at 100 students: further applicants go on a waiting list.',
      'Impact Award: the Team page now shows exactly what your Presentation score is made of (Business mentor, your two best presenters by name, meeting room) and what raises it; hover any line of the rating for what moves it.',
      'Inbox: a "Sidebar count" switch makes the number next to Inbox count only what waits for you (open replies, a shop incident, sponsor activities). Table headers line up with their columns. A rookie World Champion gets its own line in the celebration. News and team chatter talk about the new seasons\' strategies, tech changes, workshop space and the new facilities.'
    ] },
    { v: '2.4', title: 'The Championship stage, a moving state of the art and deeper games', notes: [
      'FIRST Impact Award at the Championship. Win a regional Impact Award and your team is judged again against the world\'s best programs: six Finalists are named before Einstein Final 1 and the winner after it. Both hang a blue banner. The winner gets its own celebration, joins the Hall of Fame and is invited to every future Championship. Division events no longer hand out Impact, Engineering Inspiration or Rookie All-Star awards.',
      'World Champions celebration, refined: the driver and the drive coach are named and highlighted, and the message knows your history (finalists last year, champions again after a gap, back-to-back: "only a few teams have done it before in FRC history", three or more in a row: "no one has done it in the past decades"). History lists Championship honours on their own and can replay each celebration, and shows this season\'s finished events while the season runs.',
      'Event pages show where you stand at a glance: a "Next" strip on the event page and beside the match buttons with the match number (Q12 of 60), and in playoffs your alliance number, the alliance you face and your last playoff result (for example "Next M10 against Alliance 1 · last: M7 W 95–80"). Einstein shows each alliance\'s division, and its OPR now starts from the division numbers instead of zero.',
      'The state of the art moves on. From your second season, each offseason starts with two rule or vendor changes for next season (new wiring rules, a new code architecture, new vision software…), and one month between July and September brings three new designs spotted online. Each makes part of your know-how outdated: the area loses 25% (rules) or 15% (designs) of its XP, counted from at most a little over the top level, so no area stays maxed for free. A mentor who specializes in the area halves the loss. Each arrives as a pop-up and an inbox post.',
      '2024 CRESCENDO: every shooter can score the Amp without an amp mechanism. Fixed subwoofer shooters do it slowly with a low success rate, pivot and turret shooters at a moderate rate; an amp bar or amp elevator is still far better. Concept cards say so.',
      '2025 REEFSCAPE: the Reef has six faces with their own branches (two coral per face at L2, L3 and L4, an L1 trough, one algae each). Robots fill the faces nearest their stations first and then drive around to the far side, so the last branches cost longer cycles. The field shows the coral on each face.',
      '2026 REBUILT: fuel is tracked on the field (neutral zone, each alliance zone, depots), scored fuel returns to the neutral zone and a thin neutral zone is slower to sweep. The hoarding meta is in: while their hub is inactive, alliances sweep the neutral zone and lob fuel back into their own zone, then refill a few steps from the hub when it lights up (about 10–15% more fuel for alliances that run it well). AI alliances pick it up over the season; yours follows your strategy read, as with note feeding in 2024.',
      'A second robot now teaches more. With two robots running (a test chassis is enough), driver practice includes defense drills: at 100% your drivers lose 35% less speed, cycle time and accuracy to a defender. If the second robot drives like the competition robot (tank: Kitbot or West Coast; holonomic: Mecanum or Swerve), auto routines and auto upgrades develop 20% faster and the team gains Autonomous Pathing XP every week.',
      'New event incidents: a loose bumper that falls off mid-match (the referee disables the robot; this replaces the old bumper-swap incident), vision not calibrated (only with vision on the robot), wrong code on the robot, a tool left inside that blocks a mechanism, and a joystick left unplugged that costs the first 20 seconds of teleop.',
      'Shop is now called Inventory. Buying mechanical COTS on a full shelf replaces the most worn one, like electronics; replaced parts are sold automatically when they are still sellable. Fixed: in the offseason a part could show "in stock" and still refuse the purchase.',
      'Tutorial tours run once per game instead of every season. Bars, scales and scouting highlights use fixed colours instead of the team colour (the testing-hours bar has a legend now).'
    ] },
    { v: '2.3', title: 'Layout polish, smarter spare parts and a bigger Kickoff kit', notes: [
      'Shop → Electronics: products line up in three columns under their vendor (Apex Motion, Lumen Robotics, Kit of Parts), newest version first. A vendor without a version of a part shows an empty slot instead of shifting the others.',
      'Calendar: every month card is the same size and scrolls inside, empty months say so, and the Week 0 scrimmage card now sits above Week 1 in Regional registration.',
      'Auto-restock for spare parts now works all year. Every week (every month in the offseason) it keeps enough spares for driver practice and home repairs on both robots, using cash on hand. Before each event it buys what the event needs with a safety margin (falls and breakages can double the usual need). If money runs short it buys what it can and says so, instead of buying nothing.',
      'Every team gets a Kit of Parts at every Kickoff: 4 brushed motors, 2 low-profile encoders and 2 kitbot gearboxes. As in FRC, only rookies get a control hub, in a bigger first-season kit (8 motors, 4 encoders, 4 gearboxes and the hub). Established and powerhouse teams start with one leftover kit hub on the shelf (a powerhouse fills its third hub slot with it). The Kickoff pop-up lists the kit, and the inbox says if a full shelf recycled anything.',
      'The Alumni fundraising dinner is available from the first season for established and powerhouse teams (rookie teams still wait a season).',
      'Test chassis (Garage → Robot 2): a simple Kitbot Tank, Mecanum or West Coast Drive built from parts on the shelf early in the season, with no project slot (about 20–45 team hours). Even without a Practice Field it gives 6 testing hours a week: development testing for robot code, autos, vision and drivetrain projects at half the cost, and driver practice. With a Practice Field it counts as half a second robot. Driving a different drivetrain only partly carries over to the competition robot\'s familiarity.',
      'Winning the World Championship now opens a celebration: an animated trophy, rotating gold rays, shimmering "YOU ARE THE 20XX WORLD CHAMPIONS" (or "2023–2024 BACK-TO-BACK…", THREE-PEAT…), your new gold banner, your alliance, the story of the final, and what people are saying. There is an easter egg at the bottom too: the alliance that won that game\'s real Einstein, with the game named.',
      'Random-order careers now have their own timeline: seasons count up from 2022 in career order (2022, 2023, …) while the games are shuffled, so dates, banners, season titles and back-to-back headlines read in order. The real game\'s year only appears where it identifies the game (the easter egg).',
      'Established teams start with more older parts at different wear levels (extra Lumen motors, encoders and gearboxes): enough for a test chassis once the competition robot takes the best ones.',
      'More breathing room: section titles sit further from the cards above them, labels no longer touch their bars, and a few cards and pop-ups got more padding.'
    ] },
    { v: '2.2', title: 'Feeder programs, vendor launch events and FRC playoff tiebreakers', notes: [
      'Feeder programs have their own card on the Team page, under the Impact Award. Run up to 6 (FLL, FTC, camps, clubs), each with a focus: Balanced, Drive team, Technical, Strategy or Outreach. Programs grow over three school years (60% → 85% → 100% strength). Every September they add students to the team, and core recruits who come from a program bring the skills its focus trains (the roster shows where each one came from). Outreach programs add the most students and count most for Impact. Changing a focus costs a year of growth, except while a program is new. Older saves keep their programs as established, balanced ones.',
      'Finance shows title, partner and grant slots (for example Title 0/1, Partners 2/4, Grant 0/1). A deal signed this turn has an Undo button until you press Continue, and "Auto-pick best" fills every open slot with the best-value offers. Offers whose slot is full say so instead of showing Sign.',
      'Project slots now show on the Active projects card (Design Office) and the mentor count on the Your mentors card, instead of at the top of the page.',
      'Events: after the last practice block (or Auto-pick), the practice day stays on screen with what each block did and the readiness numbers. Press Continue to start qualifications.',
      'Fixed: a tied playoff game no longer leads to a "Finals 4". Ties follow the FRC tiebreakers: foul points first, then auto points and endgame points (2022 Hangar and 2023 Charge Station points come before auto). Only a game tied on all of them is replayed, and it shows as a replay (for example "Finals · Game 3 (replay)"). The result screen says which tiebreaker decided it, and the bracket marks the winner with *.',
      'Inbox replies are open only for the turn they arrive in: a week in season, a month in the offseason. Unanswered offers show as expired.',
      'Vendor launch events: every fall, 1–4 months before Kickoff, Apex Motion and Lumen Robotics each hold one launch with at least one new product (a launch before the first season too). Each launch gets a pop-up and an inbox post with the presentation, what the community says and your electrical lead\'s take. A rumor at the start of each offseason says when each vendor will launch, and the Calendar shows the launch months. No product line goes past version III in a career; the previous version stays on sale through the next season. Saves in progress keep the products already out and plan the rest under the new rules.'
    ] },
    { v: '2.1', title: 'Two robots, driver familiarity and mechanism kits', notes: [
      'Robot 1 and Robot 2 in the Garage. Either can be the competition robot (it gets the best electronics and goes to events); choose which one the drivers practice on each week. The practice robot project became "Build a full copy" in the Garage. A second robot adds up to 6 testing hours a week, makes practice on it up to 25% more effective and helps event tuning (more the closer it matches the competition robot), but a second set of electronics and copies is expensive.',
      'Build copy: make more of a finished subsystem design for the second robot or as a spare. Copies take about a quarter of the first build\'s hours, use team hours but no project slot (they sit under Fabrication), and need their own electronics and kits. The first one of a new concept or version is a prototype and costs 10% more.',
      'Driver familiarity for each subsystem: new mechanisms start low, new versions cost a little, very different concepts (a dumper to a turret, tank to swerve) cost a lot. Shop driving, practice and matches win it back; in matches a subsystem gives 85–100% of its stats.',
      'Storage holds up to 2 built units of each subsystem. Take old ones apart for spare parts and to get their mechanism kits back. At events, a spare identical to the competition robot\'s (in storage or on the other robot) can be swapped in to restore that subsystem to 100%.',
      'Mechanism kits per concept: a turret shooter uses a turret kit and a shooter kit, a traversal climber up to 4 climber kits. Partial sets help partly. New indexer & hopper kit; kit prices and slot limits adjusted, and motor and encoder slots raised for two robots.',
      'Kit of Parts electronics can now be bought any time (brushed motors, low-profile encoders, a basic control hub, kitbot gearboxes): very cheap and always in stock, for rookies and for teams caught short in season. They are much slower than Apex or Lumen parts, and mixing them with vendor electronics costs 5% more project hours and a little performance. A full shelf no longer accepts parts that would be thrown straight out.',
      'A turret shooter builds on fixed-shooter know-how: concepts now need knowledge in all their core areas (marked ★).',
      'Game elements: fixed preordered and bought sets showing 0% (they now count), preorders show as pending right away, and the practice field card shows element status. Without a Practice Field the kit game pieces are enough; Level 1 fits a quarter set, Level 2 a half, Level 3 a full set.',
      'Loophole fixes: taking a subsystem apart returns at most half its materials in spare parts, a bare second chassis no longer unlocks the second-robot bonuses, a Practice Field without game elements is never worse than none, copies can\'t soak up testing or extra hours, worn mechanism kits help less, and overdrafts in consecutive seasons cost more each time.',
      'Parts is now the Shop. Overtime weeks never lower fatigue, and fatigue is shown as a bar. Calendar months scroll on their own. The Team page is tidier, with the Impact Award under the drive team.'
    ] },
    { v: '2.0', title: 'Parts, fatigue and a new look', notes: [
      'New Parts screen with a real parts library: motors, encoders, control hubs and swerve modules from two electronics vendors (Apex Motion: premium; Lumen Robotics: value), plus drive gearboxes, cameras, pneumatics and optional mechanism kits.',
      'Sell parts you no longer need (Shop → Sell) for part of their price: the better their condition, the more you get. Only parts above 60% condition can be sold.',
      'Every build, including the practice robot, now uses parts. Parts are reusable but wear in matches and practice (slightly slower, more failures). The newest parts go on the competition robot, the rest on the practice robot. Each part type has slot limits; new parts replace the most worn.',
      'Mixing Apex and Lumen electronics costs 10% more hours on hardware and software projects and a little performance. Vendors release 2–3 new generations over a career; the old one stays on sale for a year.',
      'A free Kit of Parts at every Kickoff (bigger for rookies). In season, parts and field elements often sell out, so stock up before Kickoff. Mechanism kits make builds faster and remove first-build penalties.',
      'Game elements: quarter, half and full-field sets that wear down, only help up to your practice field\'s size, and can be preordered for next season.',
      'Extra hours: put spare hours into any project (in 1-hour steps) to raise its quality, with diminishing returns.',
      'Fatigue: leaving about 10% of a week\'s hours idle keeps it steady; overtime and competitions raise it. At events it causes incidents (wrong auto, flat battery, mixed-up scouting) and lowers scouting credibility. New Incidents tab at events, and a Week 7 rest week before the Championship.',
      'Skip any event on its week, and withdraw from any event in the Calendar (half refund only a month or more ahead). Fixed: the game could get stuck in the offseason with a negative balance.',
      'Outreach and fundraising: repeats within a month pay less (resets monthly). New activities unlocked by facilities, sponsors, mentors and the trailer, plus a team night that lowers fatigue.',
      'Team trailer: drive to far events instead of flying (cheaper, no air-freight damage), gentler sponsor demos and +20% robot outreach.',
      'Spare parts reset every season (none before the first), with an auto-restock toggle that buys what the next event needs.',
      'Sponsors: offers sit at a similar level for each difficulty, title sponsors pay about three times a partner, and offers grow a little with reputation and results. Top programs face sponsors who expect wins.',
      'STEM support fund when the balance is under $1,000: emergency money at a cost in reputation.',
      'Team emblem and team colours: the whole interface takes on your team colour. New icons throughout.',
      'Guided tours each season and at your first event and match (switch them off any time), "?" help on every screen, and a new How to play guide organized by topic.'
    ] },
    { v: '1.5', title: 'Debt, calendar & inbox update', notes: [
      'In-season debt: from Kickoff to the Championship you can spend into the red (down to −$50,000). The school clears it at the season review, with a hit to Program Support and reputation that grows with the debt, and the school board writes to you about it. Offseason spending still needs cash, and fundraisers now work even when the balance is negative.',
      'New program calendar: every turn from May to the season review, with events and results, project finish dates, sponsor duties, program milestones and money dates. Filter by category.',
      'Inbox: at least one news item and one to three chatter posts every turn, many about your own team (results, awards, mentors, school, reputation), with far fewer repeats.',
      'Inbox replies: some messages (rookie teams asking for help, interviews, scrimmage invitations, pit requests, school board meetings) let you reply for a small effect. Optional, no popups.',
      'Defense follows the real rules: pin limits (5 s in 2022–2024, 3 s in 2025–2026, then back off six feet) and each game\'s protected zones. No more robots stuck for long stretches.',
      'Turret shooters are much harder to defend: they aim and shoot on the move.',
      'Robots no longer overlap each other or drive through hubs, the Reef, Stage legs, the Barge leg, cages or Towers; stuck robots now steer around traffic.',
      'Systems Shakedown at an event now also rebuilds worn parts, bringing robot condition back to 100%.',
      'Graphics: 2022 shots use red and blue cargo, and 2022 low-goal robots show a bucket instead of the 2026 dumper.'
    ] },
    { v: '1.4', title: 'Season realism update', notes: [
      'REEFSCAPE (2025): the Barge now spans the whole midline, with each alliance\'s three cages and Net on its own half; Processors sit on each alliance\'s right.',
      'REEFSCAPE: alliances share two Coral Stations — the best scorer takes one and the others share the second, queueing at the chute.',
      'RAPID REACT (2022): cargo bounces out of the Hub all over the field, and robots chase their own color anywhere.',
      'CRESCENDO (2024): alliances learn to feed notes across the field and stockpile them for Amplify. A Source-lane defender cancels most of it. Your alliance picks it up through your new strategy read — Strategy mentor, drive coach, driver practice and events scouted — never a button.',
      'REBUILT (2026): new wide dumper shooter — huge throughput, worse under defense. Turrets now shrug off defense.',
      'REBUILT: Tower climbs are slow and risky, so most strong teams keep shooting instead. The default endgame plan is now "Only if worth it".',
      'New failure: a failed high climb can end in a fall — the robot is out for the match, badly damaged, and spare parts are scrapped.',
      'All five fields and the robots got a detail pass: real field elements, bumpers with team numbers, frames, electronics and intake rollers.'
    ] },
    { v: '1.3', title: 'Testing hours', notes: [
      'A Practice Field now gives weekly testing hours (8/12/16 h, +4 with a practice robot), like wind-tunnel time.',
      'Split them between development testing (faster, better upgrades; $40/h) and driver practice (drive-team skills and confidence; costs a few spare parts).',
      'Driver confidence matters more in matches: faster cycles, quicker alignment, fewer fouls and surer climbs.',
      'Repairs use spare parts. The robot arrives at events at 100% unless you\'re short on spares, flying, or did a sponsor demo that week; HQ previews the arrival condition.'
    ] },
    { v: '1.2', title: 'Awards, money and scouting', notes: [
      'The Impact Award is much harder: a multi-season Impact rating plus a submission. HQ shows your odds at each registered regional.',
      'Outreach and fundraising no longer use team hours; repeated fundraisers pay less within a program year.',
      'Facilities cost more, and upgraded 3D Printing, CNC, Machine Shop and Programming Station add project slots (6 permanent at most).',
      'Scouting shows what each robot actually did in qualifications — auto, climbs, fault-free matches, fouls, defense — and AI captains pick by it.',
      'Each season has its own weak spots (tip-overs in 2023, brownouts in 2026), and brief comms drops are now common.'
    ] },
    { v: '1.1', title: 'Program depth', notes: [
      'Battery fleet: up to 10 batteries (20 with a Smart Charging Station); new ones replace the most worn.',
      'Blue banners for event wins and Impact Awards, and a banner wall in History.',
      'Strategy follows the real games: one defender in 2022, 2024 and 2026; three scorers in 2023 and 2025. AI teams catch on during the season.',
      'Alliance captains can call partners to score or defend in the playoffs.',
      'Upgradable Practice Field, sponsor and school opportunities, weekly activity limits, an October registration reminder, a weekly suggested upgrade and a visual team-hours planner.'
    ] },
    { v: '1.0', title: 'First release', notes: [
      'Career mode (five seasons, real or random order) and the Single Season Challenge across 2022–2026.',
      'Budget, sponsors, mentors, facilities with wear, shop incidents and a lively inbox.',
      'Regionals, Championship qualification, live 2D matches with coach calls, alliance selection and double-elimination playoffs.'
    ] }
  ];
  const SEEN_KEY = 'frcm_seen_version';
  UI.S.notes = { full: true, html() {
    return '<div class="menu-wrap"><div class="menu-box" style="max-width:820px"><div class="row"><div class="logo" style="font-size:28px">What\'s new</div><span class="tag acc" style="margin-left:10px">v' + h(G.VERSION) + '</span><span class="sp"></span><button class="btn" data-act="back">Back</button></div>' +
      '<p class="muted">Version notes for FRC Manager. Saves from earlier versions keep working.</p>' +
      G.RELEASES.map((r, i) => '<div class="card mb' + (i === 0 ? ' hl' : '') + '"><div class="ct"><span class="tag ' + (i === 0 ? 'acc' : '') + '">v' + h(r.v) + '</span>&nbsp; ' + h(r.title) + (i === 0 ? ' <span class="xs good" style="margin-left:6px">Latest</span>' : '') + '</div>' +
        '<ul class="vnotes">' + r.notes.map(n => '<li>' + h(n) + '</li>').join('') + '</ul></div>').join('') +
      '</div></div>';
  } };
  // One-time popup when a player opens a newer version than they last saw (first-time players just get the menu).
  UI.versionCheck = function () {
    let seen = null;
    try { seen = localStorage.getItem(SEEN_KEY); localStorage.setItem(SEEN_KEY, G.VERSION); } catch (e) { return; }
    const hadSaves = (function () { try { return G.Save.slots.some(s => !!G.Save.meta(s)); } catch (e) { return false; } })();
    if (seen === G.VERSION || (!seen && !hadSaves)) return;
    const r = G.RELEASES[0];
    UI.modal('<h2>Updated to v' + h(r.v) + '</h2><div class="sub">' + h(r.title) + '</div><ul class="vnotes">' + r.notes.slice(0, 5).map(n => '<li>' + h(n) + '</li>').join('') + '</ul>' +
      '<div class="row mt"><button class="btn primary" data-act="nav2" data-arg="notes">See all version notes</button><span class="sp"></span><button class="btn" data-act="closeModal">Close</button></div>');
  };
  // How to play: see tutorial.js (guide by topic)
  UI.A.back = () => UI.go(G.S && G.S.team ? 'hq' : 'menu');
  UI.S.settings = { full: true, html() {
    const S = G.S;
    return '<div class="menu-wrap"><div class="menu-box" style="max-width:720px"><div class="row"><div class="logo" style="font-size:28px">Settings</div><span class="sp"></span><button class="btn" data-act="back">Back</button></div>' +
      '<div class="card mt"><label class="f">Default match speed<select class="inp" data-chg="prefSpeed">' + [1, 2, 4, 8].map(s => '<option value="' + s + '" ' + (UI.prefs.speed === s ? 'selected' : '') + '>' + s + '×</option>').join('') + '</select></label>' +
      '<label class="row mt"><input type="checkbox" data-chg="tutToggle" ' + (UI.Tut.enabled() ? 'checked' : '') + '> Show tutorials (a short tour once per game: at your first Kickoff, first event and first match)</label>' +
      (S ? '<label class="row mt"><input type="checkbox" data-chg="badgeActSet" ' + (S.settings && S.settings.badgeAct ? 'checked' : '') + '> Inbox count in the sidebar shows only items that wait for you (open replies, a shop incident, sponsor activities)</label>' : '') +
      (S && S.mode === 'career' ? '<label class="row mt"><input type="checkbox" data-chg="noFail" ' + (S.settings.noFail ? 'checked' : '') + '> No-fail mode (the program can\'t be cut when Program Support hits 0)</label>' : '') + '</div></div></div>';
  } };
  UI.A.badgeActSet = v => { const S = G.S; if (!S) return; S.settings = S.settings || {}; S.settings.badgeAct = !!v; G.Save.write('auto'); };
  UI.A.prefSpeed = v => { UI.prefs.speed = Number(v); G.Save.saveSettings(UI.prefs); };
  UI.A.noFail = v => { G.S.settings.noFail = v; };

  // =====================================================================
  // SEASON REVIEW
  // =====================================================================
  UI.S.review = { nav: 'hq', html() {
    const S = G.S, hs = S.history[S.history.length - 1];
    if (!hs) return '<p>No review.</p>';
    let o = '<div class="xs muted">SEASON REVIEW</div><h1>' + h(G.Career.seasonName(G.S, hs.year)) + '</h1>';
    const head = hs.worldChamp ? 'WORLD CHAMPIONS' : hs.divWin ? 'Championship division winners' : hs.champs ? 'Championship qualifiers' : hs.events.some(e => e.won) ? 'Regional winners' : hs.events.some(e => e.playoffs) ? 'Playoff team' : 'Building season';
    o += '<div class="sub lg acc b">' + head + '</div><div class="grid g3">';
    o += UI.card('Events', hs.events.length ? '<table class="t"><tr><th>Event</th><th>Rank</th><th>Result</th></tr>' + hs.events.map(e => '<tr><td>' + h(e.name) + '</td><td>' + (e.rank ? e.rank + '/' + e.size : '') + '</td><td>' + h(e.finish) + (e.awardNames.length ? '<div class="xs acc">' + h(e.awardNames.join(', ')) + '</div>' : '') + '</td></tr>').join('') + '</table>' : '<p class="muted">No events attended.</p>');
    if (hs.loyal && hs.loyal.length) o += UI.card('Vendor loyalty', hs.loyal.map(y => '<div class="mb"><div class="row sm"><b style="color:' + D.VENDORS[y.brand].color + '">' + h(D.VENDORS[y.brand].name) + '</b><span class="sp"></span><span class="muted nowrap">' + y.pts + (y.next != null ? ' / ' + y.next : '') + ' points</span></div>' +
      '<div class="sm">' + h(D.LOYALTY.names[y.lvl]) + (y.up ? ' ' + UI.tag('new level', 'acc') : '') + '</div>' +
      '<div class="xs muted">+' + y.gain + ' this season: ' + (y.robot || 0) + ' for the competition robot, ' + (y.buy || 0) + ' for your orders.' + (y.up ? ' A letter from ' + h(D.VENDORS[y.brand].short) + ' arrives in September.' : '') + '</div></div>').join(''), '', 'mb');
    o += UI.card('Program goals', hs.goals.map(g => '<div class="row sm mb"><span class="' + (g.met ? 'good' : 'bad') + '">' + (g.met ? '✔' : '✘') + '</span><span class="tag">' + g.tier + '</span><span>' + h(G.Career.goalText(G.S, D.PROGRAM_GOALS[g.id].text, hs.home || null)) + '</span></div>').join('') +
      '<div class="hr"></div><div class="kv"><span class="k">Program support</span><span>' + Math.round(S.support) + ' (' + (S.season.supportDelta >= 0 ? '+' : '') + (S.season.supportDelta || 0) + ')</span><span class="k">Reputation</span><span>' + Math.round(S.rep) + '</span><span class="k">Legacy this season</span><span class="acc b">+' + hs.legacy + '</span></div>');
    o += UI.card('Finances', '<div class="kv"><span class="k">Earned</span><span class="good">' + U.money(hs.earned, hs.px) + '</span><span class="k">Spent</span><span class="bad">' + U.money(hs.spent, hs.px) + '</span><span class="k">Balance</span><span class="' + (hs.money < 0 ? 'bad' : '') + ' b">' + U.money(hs.money, hs.px) + '</span><span class="k">Avg RP / qual match</span><span>' + hs.avgRP.toFixed(2) + '</span>' +
      (S.season && S.season.debt ? '<span class="k">Debt covered by school</span><span class="bad">' + U.money(S.season.debt) + ' (support −' + S.season.debtPen.support + ', reputation −' + S.season.debtPen.rep + ')</span>' : '') + '</div>');
    o += '</div>';
    { const bd = (S.season && S.season.board) || hs.board, Sh = G.Shop, nx = Sh.nextSpace(S), n = v => v.toLocaleString('en-US');
      if (bd) o += '<div class="card ' + (bd.space || bd.reno || bd.grant ? 'hl ' : '') + 'mt"><div class="ct">' + UI.icon('workshop', 18) + ' From the school board<span class="sp"></span>' + UI.tag(D.SPACE_TIERS[S.spaceTier || 0].title + ' · ' + n(Sh.space(S)) + ' sq ft') + '</div>' +
        (bd.space ? '<div class="row sm mb"><span class="good">✔</span><span><b>More room.</b> The team moves into ' + h(bd.space.name) + ': ' + n(bd.space.from) + ' → <b>' + n(bd.space.to) + ' sq ft</b>.</span></div>' : '') +
        (bd.reno ? '<div class="row sm mb"><span class="good">✔</span><span><b>Free renovation.</b> The district\'s crew brought ' + (bd.reno === 1 ? 'your worn facility' : 'all ' + bd.reno + ' worn facilities') + ' back to 100% condition.</span></div>' : '') +
        (bd.grant ? '<div class="row sm mb"><span class="good">✔</span><span><b>Equipment grant.</b> One facility upgrade of your choice, up to ' + U.money(D.BOARD.cap) + ', paid by the board. Use it in the Workshop.</span></div>' : '') +
        (!bd.space && !bd.reno && !bd.grant ? '<div class="sm muted mb">No changes to your workshop this year.</div>' : '') +
        '<div class="xs muted">' + (nx ? 'Next room: ' + h(nx.name) + ' (' + n(nx.sqft) + ' sq ft) at Program Support ' + nx.sup + '. ' : 'You have all the room there is. ') + 'When support rises by ' + D.BOARD.reno + ' or more in a season the board renovates your facilities for free; at +' + D.BOARD.grant + ' (and support ' + D.BOARD.grantSup + '+) it adds an upgrade grant. Room is never taken back.</div></div>'; }
    const last = S.upcoming >= S.order.length || S.mode === 'single';
    o += '<div class="hint mt">' + (last ? 'This was your final season.' : S.support <= 0 && !S.settings.noFail ? 'Program Support has collapsed — the school is ending the program.' : 'Next: the offseason. Rule and vendor changes in May, graduation in June, new designs over the summer, recruiting in September, vendor launches in the fall, sponsors and registration in October, Kickoff in January.') + '</div>';
    o += '<div class="row mt"><span class="sp"></span><button class="btn primary lg" data-act="reviewNext">' + (last ? 'Final summary ▶' : 'Continue to offseason ▶') + '</button></div>';
    return o;
  } };
  UI.A.reviewNext = function () {
    const S = G.S; G.Career.advance(S); UI.go(S.phase === 'end' ? 'end' : 'hq');
    if (S.phase !== 'end' && G.Career.dueActivities(S).length) UI.A.activities();
    else if (S.phase !== 'end' && S.incident) UI.A.incident();
    else if (S.launchQueue && S.launchQueue.length) UI.launchModal();
  };

  // =====================================================================
  // END / SUMMARY
  // =====================================================================
  UI.S.end = { nav: 'hq', html() {
    const S = G.S;
    let o = '';
    if (S.mode === 'single') {
      const g = G.Career.grade(S);
      o += '<div class="xs muted">SINGLE SEASON CHALLENGE</div><h1>Grade: <span class="acc" style="font-size:44px">' + g.grade + '</span></h1><div class="sub">' + h(U.infl(g.goalText)) + ' — ' + (g.met ? '<span class="good">achieved</span>' : '<span class="bad">not achieved</span>') + ' · legacy ' + g.legacy + '</div>';
    } else {
      const L = S.legacy;
      const title = S.endReason === 'fired' ? 'Program cut' : L >= 1500 ? 'Hall of Fame Program' : L >= 900 ? 'Dynasty' : L >= 500 ? 'Regional Powerhouse' : L >= 200 ? 'Rising Program' : 'Building Program';
      o += '<div class="xs muted">CAREER COMPLETE</div><h1>' + h(title) + '</h1><div class="sub">' + S.team.num + ' ' + h(S.team.name) + ' · Legacy points <b class="acc">' + L + '</b>' + (S.worldChamps ? ' · ' + S.worldChamps + '× World Champions' : '') + '</div>';
    }
    o += '<div class="card"><table class="t"><tr><th>Season</th><th>Events</th><th>Best result</th><th>Awards</th><th>Champs</th><th class="num">Legacy</th></tr>' + S.history.map(hs => {
      const best = hs.worldChamp ? 'World Champion' : hs.divWin ? 'Division winner' : hs.events.some(e => e.won) ? 'Regional winner' : hs.events.some(e => e.finalist) ? 'Finalist' : hs.events.some(e => e.playoffs) ? 'Playoffs' : '—';
      return '<tr><td>' + h(G.Career.seasonName(G.S, hs.year)) + '</td><td>' + hs.events.length + '</td><td>' + best + '</td><td>' + hs.awards.length + '</td><td>' + (hs.champs ? '✔' : '') + '</td><td class="num">' + hs.legacy + '</td></tr>';
    }).join('') + '</table></div>';
    const bn = G.Career.banners(S);
    if (bn.length) o += '<div class="card mt"><div class="ct">Banner wall ' + UI.tag(bn.length + ' banner' + (bn.length > 1 ? 's' : ''), 'acc') + '</div>' + UI.bannerWall(bn) + '</div>';
    const k = D.AREAS.map(a => ({ a, l: G.Robot.know(S, a.id) })).filter(x => x.l > 0).sort((p, q) => q.l - p.l);
    o += '<div class="card mt"><div class="ct">Knowledge legacy</div>' + (k.length ? k.map(x => UI.tag(x.a.name + ' Lv' + x.l, 'acc')).join(' ') : '<span class="muted">—</span>') + '</div>';
    o += '<div class="row mt"><button class="btn" data-act="nav" data-arg="history">Season details</button><span class="sp"></span><button class="btn primary" data-act="quitMenu">Main menu</button></div>';
    return o;
  } };
})();
