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
      '</div><div class="row mt wrap"><button class="btn" data-act="nav" data-arg="load">Load / import</button><button class="btn" data-act="nav" data-arg="help">How to play</button><button class="btn" data-act="nav" data-arg="notes">What\'s new in v' + h(G.VERSION) + '</button></div>' +
      '<div class="grid g5 mt">' + G.SEASON_YEARS.map(y => '<div class="card flat"><div class="xs muted">' + y + '</div><div class="b">' + h(G.Seasons[y].name) + '</div><canvas data-prev="' + y + '" width="330" height="164" style="width:100%;border-radius:6px;margin-top:6px"></canvas><div class="xs muted mt">' + h(G.Seasons[y].tagline) + '</div></div>').join('') + '</div>' +
      '<p class="xs dim mt">Version ' + h(G.VERSION) + ' · Not affiliated with or endorsed by FIRST®, Formula 1® or Frontier Developments. Sponsors, regionals and teams are fictional; team numbers are random.</p></div></div>';
  }, after() { document.querySelectorAll('canvas[data-prev]').forEach(c => G.Render.preview(c, Number(c.dataset.prev))); } };
  UI.A.continueGame = () => { if (G.Save.load('auto')) { UI.go(G.S.phase === 'end' ? 'end' : G.S.event ? 'event' : 'hq'); } else UI.toast('No autosave found', 'bad'); };

  // =====================================================================
  // NEW GAME
  // =====================================================================
  UI.A.newGame = function (mode) {
    const rng = G.makeRng(Date.now() & 0xffffff);
    UI.st.ng = { mode, num: rng.int(1000, 9999), name: D.teamName(rng), school: rng.pick(D.SCHOOLS) + ' High School', c1: UI.TEAM_COLORS[0].hex, c2: UI.TEAM_COLORS2[0].hex, avatar: rng.pick(UI.AVATARS), region: 'Midwest',
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
      '</div>';
    // avatar and colours (the whole UI picks up the primary colour)
    o += '<div class="grid g3 mt"><div><div class="sm muted mb">Team colour</div><div class="swatches">' + UI.TEAM_COLORS.map(c => '<button class="swatch ' + (n.c1 === c.hex ? 'on' : '') + '" style="background:' + c.hex + '" title="' + c.name + '" data-act="ngSet" data-arg="c1|' + c.hex + '"></button>').join('') + '</div>' +
      '<div class="sm muted mb mt">Second colour</div><div class="swatches">' + UI.TEAM_COLORS2.map(c => '<button class="swatch ' + (n.c2 === c.hex ? 'on' : '') + '" style="background:' + c.hex + '" title="' + c.name + '" data-act="ngSet" data-arg="c2|' + c.hex + '"></button>').join('') + '</div></div>' +
      '<div class="span2"><div class="sm muted mb">Team emblem</div><div class="avpick">' + UI.AVATARS.map(a => '<button class="' + (n.avatar === a ? 'on' : '') + '" data-act="ngSet" data-arg="avatar|' + a + '" title="' + a + '">' + UI.avatar({ avatar: a, c1: n.c1, c2: n.c2 }, 40) + '</button>').join('') + '</div>' +
      '<div class="row mt">' + UI.avatar(n, 56) + '<div><div class="lg b">' + h(String(n.num)) + ' ' + h(n.name) + '</div><div class="sm muted">' + h(n.school) + ' · ' + h(n.region) + '</div></div></div></div></div>';
    if (n.mode === 'career' || n.scenario === 'custom') {
      o += '<h3 class="mt">Starting profile</h3><div class="grid g3">' + Object.keys(D.PROFILES).map(k => { const P = D.PROFILES[k]; return choice('profile', k, P.name + ' — ' + U.money(P.money), P.desc + ' ' + P.students + ' students, ' + P.mentors.length + ' mentors.'); }).join('') + '</div>';
    }
    o += '<h3 class="mt">Difficulty</h3><div class="grid g3">' + choice('diff', 'easy', 'Easy', 'Weaker opponents, fewer faults, more sponsor money.') + choice('diff', 'normal', 'Normal', 'The intended experience.') + choice('diff', 'hard', 'Hard', 'Stronger opponents, more faults, stingy sponsors.') + '</div>';
    if (n.mode === 'career') o += '<h3 class="mt">Season order</h3><div class="grid g2">' + choice('order', 'real', 'Real order', '2022 → 2023 → 2024 → 2025 → 2026') + choice('order', 'random', 'Random order', 'All five games, shuffled. The next game is a surprise at each Kickoff.') + '</div>';
    o += '<div class="row mt"><span class="sp"></span><button class="btn primary lg" data-act="startGame">Start ▶</button></div></div></div>';
    return o;
  } };
  UI.A.ng = (v, el) => { UI.st.ng[el.dataset.k] = el.dataset.k === 'num' ? Math.max(1, Math.min(99999, Number(v) || 1)) : v; };
  UI.A.ngSet = arg => { const [k, v] = arg.split('|'); UI.st.ng[k] = k === 'year' ? Number(v) : v; if (k === 'c1') UI.applyTheme(UI.st.ng); if (k === 'scenario') { const s = D.SCENARIOS.find(x => x.id === v); UI.st.ng.profile = s.profile; } UI.render(); };
  UI.A.startGame = function () {
    const n = UI.st.ng;
    if (!String(n.name).trim()) return UI.toast('Give your team a name', 'bad');
    const scen = n.mode === 'single' ? D.SCENARIOS.find(s => s.id === n.scenario) : null;
    G.Career.newGame({ mode: n.mode, team: { num: Number(n.num), name: String(n.name).trim(), school: n.school, c1: n.c1, c2: n.c2, avatar: n.avatar, region: n.region },
      profile: scen && !scen.custom ? scen.profile : n.profile, diff: n.diff, order: n.order, year: n.year, scenario: scen ? scen.id : null });
    G.Save.write('auto');
    UI.go('hq');
    if (G.S.phase === 'kickoff') UI.kickoffModal();
    else if (!UI.Tut.start('season')) UI.modal('<h2>Welcome, Lead Mentor</h2><p class="muted">It\'s October. The first game will be revealed at Kickoff in January. Sign sponsors (Finance), hire mentors, stock up on parts, register for regionals (Calendar) and start research (Design Office), then press <b>Continue</b>.</p><div class="row"><span class="sp"></span><button class="btn primary" data-act="closeModal">Let\'s go</button></div>');
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
  // =====================================================================
  // VERSION NOTES ("What's new")
  // =====================================================================
  // Newest first. Keep G.VERSION (core.js) equal to the first entry.
  G.RELEASES = [
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
      '<div class="hr"></div><div class="kv"><span class="k">Program support</span><span>' + Math.round(S.support) + ' (' + (S.season.supportDelta >= 0 ? '+' : '') + (S.season.supportDelta || 0) + ')</span><span class="k">Reputation</span><span>' + Math.round(S.rep) + '</span><span class="k">Legacy this season</span><span class="acc b">+' + hs.legacy + '</span></div>');
    o += UI.card('Finances', '<div class="kv"><span class="k">Earned</span><span class="good">' + U.money(hs.earned) + '</span><span class="k">Spent</span><span class="bad">' + U.money(hs.spent) + '</span><span class="k">Balance</span><span class="' + (hs.money < 0 ? 'bad' : '') + ' b">' + U.money(hs.money) + '</span><span class="k">Avg RP / qual match</span><span>' + hs.avgRP.toFixed(2) + '</span>' +
      (S.season && S.season.debt ? '<span class="k">Debt covered by school</span><span class="bad">' + U.money(S.season.debt) + ' (support −' + S.season.debtPen.support + ', reputation −' + S.season.debtPen.rep + ')</span>' : '') + '</div>');
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
    const bn = G.Career.banners(S);
    if (bn.length) o += '<div class="card mt"><div class="ct">Banner wall ' + UI.tag(bn.length + ' banner' + (bn.length > 1 ? 's' : ''), 'acc') + '</div>' + UI.bannerWall(bn) + '</div>';
    const k = D.AREAS.map(a => ({ a, l: G.Robot.know(S, a.id) })).filter(x => x.l > 0).sort((p, q) => q.l - p.l);
    o += '<div class="card mt"><div class="ct">Knowledge legacy</div>' + (k.length ? k.map(x => UI.tag(x.a.name + ' Lv' + x.l, 'acc')).join(' ') : '<span class="muted">—</span>') + '</div>';
    o += '<div class="row mt"><button class="btn" data-act="nav" data-arg="history">Season details</button><span class="sp"></span><button class="btn primary" data-act="quitMenu">Main menu</button></div>';
    return o;
  } };
})();
