'use strict';
/* FRC Manager — guided tours (each season, first event, first match) and the categorized How to play guide */
(function () {
  const U = G.U, D = G.Data, h = U.esc, UI = G.UI;
  const ic = (n, s) => UI.icon(n, s || 16);
  const flow = list => '<div class="diagram">' + list.map((x, i) => (i ? '<span class="arr">→</span>' : '') + '<span class="node">' + ic(x[0], 14) + h(x[1]) + '</span>').join('') + '</div>';

  // =====================================================================
  // Tours: a card next to the highlighted control, Back / Next / Skip, and "Don't show tutorials"
  // =====================================================================
  const TOURS = {
    season: () => [
      { icon: 'trophy', title: 'Your season at a glance', body: 'You are the Lead Mentor. You don\'t drive: you run the program behind the robot.', diagram: flow([['design', 'Plan the week'], ['play', 'Continue'], ['event', 'Compete'], ['history', 'Season review']]) },
      { sel: '[data-act="continue"]', icon: 'play', title: 'Continue = next turn', points: ['One turn is a <b>week</b> in season and a <b>month</b> in the offseason.', 'Team hours are spent when you press it.', 'Budget, morale, support, reputation and (in season) fatigue sit up here.'] },
      { sel: '.nav[data-arg="hq"]', screen: 'hq', icon: 'hq', title: 'Headquarters', points: ['This week\'s to-do and your next event.', 'Robot, projects, money and goals in one place.'] },
      { sel: '.nav[data-arg="inbox"]', icon: 'inbox', title: 'Inbox', points: ['News, results and decisions.', 'Some messages take an optional <b>reply</b> with a small effect.'] },
      { sel: '.nav[data-arg="design"]', screen: 'design', icon: 'design', title: 'Design Office', points: ['Pick a <b>concept</b> for each subsystem, then upgrade it. <b>Build copy</b> makes more of a finished design.', 'Projects share the team hours. Give a project <b>extra hours</b> to raise its quality.', 'Leave about <b>10% idle</b> each week to keep fatigue steady.'] },
      { sel: '.nav[data-arg="garage"]', screen: 'garage', icon: 'garage', title: 'Garage: two robots', points: ['<b>Robot 1</b> and <b>Robot 2</b>: pick which one competes and which one the drivers practice on.', 'Fit built subsystems to either robot; spares wait in storage.', 'Drivers need practice with each new mechanism (<b>familiarity</b>).'] },
      { sel: '.nav[data-arg="parts"]', screen: 'parts', icon: 'parts', title: 'Shop', points: ['Every build needs motors and electronics. Kickoff brings a small free kit.', 'Two vendors: <b>Apex</b> (premium) and <b>Lumen</b> (value). Mixing them costs a little.', 'In season, parts often <b>sell out</b>: stock up before Kickoff.'] },
      { sel: '.nav[data-arg="workshop"]', icon: 'workshop', title: 'Workshop', points: ['Facilities speed up projects and add project slots.', 'They wear down: renovate or upgrade.'] },
      { sel: '.nav[data-arg="team"]', icon: 'team', title: 'Team', points: ['Choose the drive team.', 'Outreach and fundraising (each repeat in a month pays less).'] },
      { sel: '.nav[data-arg="finance"]', icon: 'finance', title: 'Finance', points: ['Sign sponsors in October; they pay at Kickoff.', 'In season you may go into debt; under ' + U.money(D.STEM_FUND.below) + ' the STEM fund can help.'] },
      { sel: '.nav[data-arg="calendar"]', icon: 'calendar', title: 'Calendar', points: ['The whole year with filters.', 'Register for regionals (weeks 1–6). Week 7 is a rest week before the Championship.', 'Withdraw a month ahead for a half refund.'] },
      { sel: '.helpq', icon: 'help', title: 'Need more?', points: ['The <b>?</b> on every screen opens its guide.', 'The full guide is in <b>☰ → How to play</b>.'] }
    ],
    event: () => [
      { icon: 'event', title: 'Your first event', body: 'An event runs in stages:', diagram: flow([['spare', 'Practice'], ['play', 'Qualifications'], ['team', 'Alliance selection'], ['trophy', 'Playoffs']]) },
      { sel: '.card .ct', icon: 'spare', title: 'Practice day', points: ['Spend practice blocks on tuning, driver reps, auto, scouting or a <b>Systems Shakedown</b> (rebuilds the robot to 100%).'] },
      { sel: '.card.mt .ct', icon: 'spare', title: 'Pit crew', points: ['Repairs between matches use <b>spare parts</b>. Buying them here costs double.', 'A spare subsystem in storage identical to the robot\'s can be <b>swapped in</b> to restore it to 100%.'] },
      { icon: 'fatigue', title: 'Fatigue at events', points: ['Team fatigue is locked in when the event starts.', 'Tired teams make mistakes: wrong auto, flat battery, mixed-up scouting. See the <b>Incidents</b> and <b>Scouting</b> tabs.'] }
    ],
    match: () => [
      { icon: 'play', title: 'Your first match', points: ['Set the plan: pace, role (score / defend / feed), target and endgame.', 'Watch it live or simulate it.'] },
      { icon: 'mentors', title: 'Coach Calls', points: ['A few calls per match: change pace or role, go for the endgame, reset a faulted robot.', 'Defense follows the real rules: pins are limited and some zones are protected.'] }
    ]
  };
  const Tut = UI.Tut = { cur: null };
  Tut.enabled = () => !G.Save.settings().noTut;
  Tut.setEnabled = on => { const st = G.Save.settings(); st.noTut = !on; G.Save.saveSettings(st); };
  // start(id, force): season tours run every season; event and match tours only the first time
  Tut.start = function (id, force) {
    if (!force && !Tut.enabled()) return false;
    const S = G.S;
    if (!force && S && id !== 'season') { S.tutSeen = S.tutSeen || {}; if (S.tutSeen[id]) return false; S.tutSeen[id] = true; }
    Tut.cur = { id, steps: TOURS[id](), i: 0 };
    setTimeout(Tut.show, 60);
    return true;
  };
  Tut.close = function () {
    document.querySelectorAll('.tut-spot').forEach(e => e.classList.remove('tut-spot'));
    const c = document.getElementById('tutcard'); if (c) c.remove();
    Tut.cur = null;
  };
  Tut.show = function () {
    const t = Tut.cur; if (!t) return;
    document.querySelectorAll('.tut-spot').forEach(e => e.classList.remove('tut-spot'));
    const st = t.steps[t.i];
    if (st.screen && UI.screen !== st.screen && !(G.S && G.S.event)) { UI.go(st.screen); }
    let card = document.getElementById('tutcard');
    if (!card) { card = document.createElement('div'); card.id = 'tutcard'; card.className = 'tut-card'; document.body.appendChild(card); }
    card.innerHTML = '<div class="row"><span class="tico">' + ic(st.icon || 'info', 22) + '</span><h3>' + h(st.title) + '</h3><span class="sp"></span><div class="tut-dots">' + t.steps.map((x, k) => '<i class="' + (k === t.i ? 'on' : '') + '"></i>').join('') + '</div></div>' +
      (st.body ? '<div class="sm muted">' + st.body + '</div>' : '') + (st.diagram || '') + (st.points ? '<ul class="sm">' + st.points.map(p => '<li>' + p + '</li>').join('') + '</ul>' : '') +
      '<div class="row mt"><label class="row xs muted"><input type="checkbox" data-chg="tutOff" ' + (Tut.enabled() ? '' : 'checked') + '> Don\'t show tutorials</label><span class="sp"></span>' +
      (t.i ? '<button class="btn sm" data-act="tutBack">Back</button>' : '<button class="btn sm ghost" data-act="tutSkip">Skip</button>') +
      '<button class="btn sm primary" data-act="tutNext">' + (t.i === t.steps.length - 1 ? 'Done' : 'Next') + '</button></div>';
    const el = st.sel ? document.querySelector(st.sel) : null;
    if (el) {
      el.classList.add('tut-spot');
      const r = el.getBoundingClientRect(), W = window.innerWidth, Hh = window.innerHeight, cw = Math.min(380, W - 32);
      let x = r.right + 14, y = r.top;
      if (x + cw > W - 16) { x = Math.max(16, Math.min(W - cw - 16, r.left)); y = r.bottom + 12; }
      card.style.left = x + 'px'; card.style.top = Math.max(16, Math.min(Hh - card.offsetHeight - 16, y)) + 'px'; card.style.transform = '';
    } else { card.style.left = '50%'; card.style.top = '50%'; card.style.transform = 'translate(-50%, -50%)'; }
  };
  UI.A.tutNext = () => { const t = Tut.cur; if (!t) return; if (t.i >= t.steps.length - 1) return Tut.close(); t.i++; Tut.show(); };
  UI.A.tutBack = () => { const t = Tut.cur; if (!t || !t.i) return; t.i--; Tut.show(); };
  UI.A.tutSkip = () => Tut.close();
  UI.A.tutOff = v => { Tut.setEnabled(!v); if (v) { UI.toast('Tutorials off. Turn them back on in Settings or How to play.'); Tut.close(); } };
  // re-place the card after each render (screens change under it)
  const baseRender = UI.render;
  UI.render = function () { baseRender.apply(UI, arguments); if (Tut.cur) setTimeout(Tut.show, 0); };
  window.addEventListener('resize', () => { if (Tut.cur) Tut.show(); });

  // hooks: kickoff → season tour; first event; first match
  UI.A.kickoffDone = () => { UI.closeModal(); UI.go('hq'); Tut.start('season'); };
  const baseGo = UI.go;
  UI.go = function (screen, p) {
    baseGo(screen, p);
    if (!G.S || Tut.cur) return;
    if (screen === 'event' && G.S.event && G.S.event.kind !== 'einstein') Tut.start('event');
    if (screen === 'prematch') Tut.start('match');
  };

  // =====================================================================
  // How to play: categories with short, icon-led sections
  // =====================================================================
  const CATS = [
    { id: 'basics', icon: 'hq', name: 'Basics', desc: 'Turns, goals and the season loop', secs: [
      { icon: 'play', t: 'The loop', d: flow([['calendar', 'Offseason (months)'], ['bolt', 'Kickoff'], ['design', 'Build weeks 1–7'], ['event', 'Competition weeks 1–7'], ['trophy', 'Championship'], ['history', 'Review']]), li: ['Each <b>Continue</b> is one week in season, one month in the offseason.', 'Build week 7 is <b>Week 0</b> (scrimmage week). Competition week 7 has no regionals: a rest week before the Championship.'] },
      { icon: 'trophy', t: 'Goals and Program Support', li: ['At Kickoff the school sets three goals (minimum, target, stretch).', 'Meeting them raises <b>Program Support</b>; missing them lowers it. At 0 the program is cut (unless No-fail is on).', 'Reputation brings sponsors, recruits and scrimmage invitations.'] },
      { icon: 'inbox', t: 'Inbox', li: ['At least one news item and one to three chatter posts every turn.', 'Some messages take a <b>reply</b> (optional): small effects like reputation, spare parts or extra practice.'] }
    ] },
    { id: 'design', icon: 'design', name: 'Design & hours', desc: 'Concepts, projects, extra hours, fatigue', secs: [
      { icon: 'design', t: 'Concepts and projects', li: ['Pick a <b>concept</b> for each subsystem at Kickoff, then run <b>upgrades</b> with a focus stat and an effort level.', 'The first one of a new concept or version is a <b>prototype</b> (+10% materials) and goes on the competition robot.', 'Each project absorbs up to 80 h a week (±25% by priority); project slots come from mentors and facilities.', 'Keep the robot under <b>125 lb</b>.'] },
      { icon: 'atom', t: 'Knowledge each concept needs', li: ['Each concept has <b>core areas</b> (★). A turret shooter is a flywheel shooter on a turret, so it needs both Turret and Flywheel Shooter knowledge.', 'Any core area at Level 0 on a complex concept means a first-time penalty. Build hours and ceilings use the average of the core areas.'] },
      { icon: 'garage', t: 'Copies and fabrication', d: flow([['design', 'Design + prototype'], ['bolt', 'Build copy'], ['garage', 'Robot 2 or a spare']]), li: ['<b>Build copy</b> makes another unit of a finished design: about a quarter of the first build\'s hours and 60% of its materials, plus its own electronics and kits.', 'Copies go to the robot that lacks the latest version (the second robot first), otherwise to storage as a spare.', 'Copies and full robot copies are <b>fabrication</b>: they use team hours but no project slot.'] },
      { icon: 'clock', t: 'Extra hours', d: flow([['clock', 'Planned hours'], ['bolt', '+ extra hours'], ['check', 'Better result']]), li: ['Set <b>extra hours</b> (in steps of 1 h) on any project: they use hours that would sit idle.', 'Quality rises with diminishing returns: doubling a project gets about 80% of the maximum bonus.', 'Builds start with better stats, upgrades gain more and add less weight, hardening goes further. You can\'t lighten anything below 40% of its design weight.'] },
      { icon: 'fatigue', t: 'Fatigue (in season)', li: ['Fatigue settles around <b>30</b>. Leaving about <b>10% of the week\'s hours idle</b> holds it there.', 'Busier weeks, <b>overtime</b> (+10) and <b>competition weeks</b> (+9) raise it; idle time and team nights lower it. The offseason resets it.', 'It only matters at events: tired teams have more <b>incidents</b> and less reliable <b>scouting</b>.'] },
      { icon: 'pfield', t: 'Testing hours', li: ['A Practice Field gives weekly testing hours: development testing (faster, better upgrades) or driver practice (skills and confidence).', 'Driver practice needs this game\'s field elements (Shop → Game elements) for full value, and builds familiarity with the robot they practice on.'] },
      { icon: 'know', t: 'Tech Knowledge', li: ['Building and competing with a concept earns knowledge; research earns it directly.', 'Higher levels mean higher ceilings, fewer hours and better reliability in later games.'] }
    ] },
    { id: 'garage', icon: 'garage', name: 'Garage & two robots', desc: 'Robot 1 and 2, familiarity, storage, spares', secs: [
      { icon: 'garage', t: 'Two robots', li: ['Every season you have <b>Robot 1</b> and <b>Robot 2</b>. Either can be the <b>competition robot</b>: it gets the best electronics and goes to events.', 'Fit built subsystems to either robot in the Garage, swap them between robots, or take them off into storage.', 'A second robot gives up to +6 testing hours a week (with a Practice Field), up to 25% more effective driver practice on it (the competition robot can be worked on meanwhile), better tuning at events, and its identical subsystems are spares at events. These scale with how many of the competition robot\'s subsystems it copies: a bare chassis gives little.', 'It costs a lot: a full second set of electronics plus copies of every subsystem. Usually only well-funded teams with big inventories can justify it, rarely in a first season.'] },
      { icon: 'team', t: 'Driver familiarity', d: flow([['bolt', 'New mechanism about 35%'], ['play', 'Practice and matches'], ['check', 'Up to 100%']]), li: ['The drive team knows each subsystem they have driven. In matches a subsystem gives 85–100% of its stats depending on familiarity.', 'A new version of the same mechanism costs a few percent; switching concept costs 20–65% (a dumper to a turret, or tank to swerve, is a big change).', 'Weekly shop driving, driver practice, event practice blocks and matches win it back. Choose which robot the drivers practice on: practicing on an older robot keeps them familiar with the old parts.'] },
      { icon: 'box', t: 'Storage and spares', li: ['Up to 2 built units of each subsystem fit in storage. When a build would overflow it, the oldest is taken apart (the build quote warns you).', '<b>Take apart</b> any stored unit for spare parts; its mechanism kits go back on the shelf.', 'A spare identical to the competition robot\'s (same concept and version), in storage or on the other robot, goes to events: swap it in between matches to restore that subsystem to 100%.'] }
    ] },
    { id: 'parts', icon: 'parts', name: 'Shop', desc: 'Vendors, stock, wear, kits, game elements', secs: [
      { icon: 'chip', t: 'Two electronics vendors', li: ['<b>Apex Motion</b>: top performance, premium prices. <b>Lumen Robotics</b>: dependable and cheaper.', 'Motors, encoders, control hubs and swerve modules come from one of them. Drivetrains always need these.', '<b>Mixing</b> both on the competition robot: hardware and software projects take 10% longer, and the robot loses a little reliability and speed. Use "Apex first" or "Lumen first" to keep one system.', 'Vendors release new generations every few years; the old one stays on sale for a year.'] },
      { icon: 'box', t: 'Kit of Parts and stock', d: flow([['truck', 'Offseason: everything in stock'], ['bolt', 'Kickoff: free kit'], ['incident', 'In season: often sold out']]), li: ['Each Kickoff brings a small free kit: brushed motors, kitbot gearboxes, a basic control hub and game pieces (rookies get a bigger one).', 'In season, electronics are often <b>sold out</b> for the week. Stock up before Kickoff.', 'More <b>Kit of Parts</b> electronics (brushed motors, low-profile encoders, a basic hub, kitbot gearboxes) can be bought any time: very cheap and never sold out, but much slower. Next to Apex or Lumen parts they cost 5% more project hours and a little performance. They can\'t be resold.'] },
      { icon: 'garage', t: 'What builds use', li: ['A swerve drive uses 4 modules, 8 motors and 4 encoders; tank drives 4–6 motors and 2 gearboxes; most mechanisms 1–3 motors.', 'Each robot needs one control hub; a <b>second robot</b> needs its own set of electronics.', 'Parts are reusable: the best ones go on the competition robot, the rest on the other robot.'] },
      { icon: 'spare', t: 'Wear and slots', li: ['Parts wear in matches and practice. Worn parts barely slow the robot but fail more often.', 'Each part type has a slot limit; buying more replaces your most worn parts.'] },
      { icon: 'money', t: 'Selling parts', li: ['Sell parts you no longer need in <b>Shop → Sell</b>: about 55% of today\'s list price at full condition, less as they wear.', 'Only parts above 60% condition can be sold. Kit parts can\'t, and you can\'t sell below what your robots need.', 'Handy when switching vendors: sell the old set while it still has value.'] },
      { icon: 'elevator', t: 'Mechanism kits (optional)', li: ['Each concept can use a set of COTS kits: a turret shooter takes a turret kit and a shooter kit, a traversal climber up to 4 climber kits, a tall elevator 2 stage kits.', 'A full set makes the build 28% faster, uses 25% less material and removes the first-build penalty; a partial set gives part of that. Copies use kits too.', 'Kits stay in the subsystem they were built into. Take a stored subsystem apart to get them back. They wear with use, and worn kits help less (down to half). Without kits, the team fabricates its own.'] },
      { icon: 'elements', t: 'Game elements', li: ['Without a Practice Field the kit game pieces are all you need. With one, sets fill it up to its size: Level 1 fits a quarter set, Level 2 a half set, Level 3 a full set.', 'Preordered sets show as <b>pending</b> right away and arrive at Kickoff.', 'They wear with driver practice. Store up to two fields\' worth.', 'In season they often sell out: <b>preorder</b> next season\'s elements in the offseason (they arrive at Kickoff).'] },
      { icon: 'battery', t: 'Spare parts and batteries', li: ['Spare parts fix the robot at home and in the pits. They are cleared out at each Kickoff.', 'Turn on <b>auto-restock</b> to buy what the next event will need.', 'Batteries wear one match at a time; new ones replace the most worn.'] }
    ] },
    { id: 'workshop', icon: 'workshop', name: 'Workshop', desc: 'Facilities, the trailer, incidents', secs: [
      { icon: 'cnc', t: 'Facilities', li: ['3D printing, CNC, machine shop and programming station cut hours and can add project slots.', 'They wear down. Below 35% condition a facility loses its slot until renovated.', 'Some unlock new outreach and fundraising activities.'] },
      { icon: 'trailer', t: 'Team trailer', li: ['Far events become a long drive instead of a flight: 15% cheaper and no air-freight damage.', 'Robot demos for sponsors wear the robot less; robot outreach counts 20% more; unlocks the Trailer roadshow.'] },
      { icon: 'incident', t: 'Shop incidents', li: ['Now and then something breaks or goes wrong in the shop: pick how to handle it.'] }
    ] },
    { id: 'team', icon: 'team', name: 'Team & outreach', desc: 'Drive team, mentors, activities, Impact', secs: [
      { icon: 'team', t: 'Students and the drive team', li: ['Driver, operator, human player and coach use different skills. They improve with matches and practice.', 'Seniors graduate in June; new students join in September.'] },
      { icon: 'mentors', t: 'Mentors', li: ['Design and fabrication mentors add project slots; each role has its own benefits.'] },
      { icon: 'outreach', t: 'Outreach and fundraising', li: ['Up to 3 activities a week (12 a month in the offseason), each type once a week.', 'Repeating an activity <b>in the same month</b> pays less; it resets every month.', 'Facilities, sponsors, mentors and the trailer unlock more activities.'] },
      { icon: 'trophy', t: 'Impact Award', li: ['Needs a submission (Design Office) and a strong Impact rating built over several seasons of outreach.'] }
    ] },
    { id: 'money', icon: 'finance', name: 'Money', desc: 'Sponsors, debt, the STEM fund', secs: [
      { icon: 'sponsor', t: 'Sponsors', li: ['Offers arrive in October. A title sponsor pays about three times a partner.', 'Offers grow a little with reputation and last season\'s results.', '<b>Top programs</b> (powerhouse or very high reputation) attract sponsors who expect wins: miss a regional win or Championship spot and they cool off fast.'] },
      { icon: 'money', t: 'Debt', li: ['From Kickoff to the Championship you can spend into debt (down to −' + U.money(D.DEBT_LIMIT) + ').', 'The school clears it at the season review, at a cost in Program Support and reputation.', 'In the offseason you can only spend cash you have.'] },
      { icon: 'fund', t: 'STEM support fund', li: ['When the balance is under ' + U.money(D.STEM_FUND.below) + ', apply for up to ' + U.money(D.STEM_FUND.max) + ' (twice a program year). Each application costs ' + D.STEM_FUND.rep + ' reputation.'] }
    ] },
    { id: 'calendar', icon: 'calendar', name: 'Calendar & events', desc: 'Registration, withdrawing, skipping', secs: [
      { icon: 'calendar', t: 'Registration', li: ['Register for up to four regionals (weeks 1–6) from October.', 'Withdraw at least a month ahead for half the fee back; closer than that, no refund.', 'Any event can be skipped on the week it happens (no refund).'] },
      { icon: 'event', t: 'Championship', li: ['Qualify by winning a regional, winning Impact or Engineering Inspiration, or through the Regional Pool.', 'Use Week 7 to lighten the load so the team arrives rested.'] }
    ] },
    { id: 'events', icon: 'event', name: 'At events', desc: 'Practice, scouting, incidents, playoffs', secs: [
      { icon: 'spare', t: 'Practice day', li: ['Tuning, driver reps, auto validation, scouting focus, installing upgrades, or a <b>Systems Shakedown</b> that finds hidden faults and rebuilds the robot to 100%.'] },
      { icon: 'scout', t: 'Scouting credibility', li: ['Your scouts\' data is usually right (90%+ at normal fatigue). Tired scouts log the wrong robot now and then.', 'A Strategy mentor, event experience and Scouting Focus practice raise it.'] },
      { icon: 'incident', t: 'Incidents', li: ['Drive-team and pit-crew mistakes: battery not swapped, wrong auto, loose connector, unfinished repairs.', 'At normal fatigue: at most one per event. Tired teams have many more. See the Incidents tab.', 'Fatigue is fixed for the whole event (Championship division and Einstein count as one).'] },
      { icon: 'team', t: 'Alliance selection and playoffs', li: ['Top 8 seeds pick alliances; playoffs are double elimination. The pick list uses your scouting data.'] }
    ] },
    { id: 'matches', icon: 'play', name: 'Matches', desc: 'Coach calls, defense, faults', secs: [
      { icon: 'mentors', t: 'Coach Calls', li: ['3–6 calls a match: pace, role (score / defend / feed), target, endgame timing and level, bonus RPs, avoid contact, reset a fault.'] },
      { icon: 'shield', t: 'Defense and pins', li: ['Pins last at most 5 s (2022–2024) or 3 s (2025–2026), then the defender backs off six feet.', 'Protected zones: Launch Pad and late Hangar (2022), Community and Loading Zone (2023), Source, Amp, Podium and late Stage (2024), Reef and Barge Zones (2025), the Tower late in the match (2026).', 'Turrets shoot on the move and are hard to defend.'] },
      { icon: 'incident', t: 'Faults and falls', li: ['Low condition, low reliability, worn parts and hidden faults raise the chance of brownouts, jams and breakdowns.', 'A failed high climb can end in a fall.'] }
    ] }
  ];
  UI.HELP_CATS = CATS;
  UI.A.helpTopic = t => UI.go('help', { cat: t === 'basics' || CATS.some(c => c.id === t) ? t : 'basics' });
  UI.A.helpCat = c => { UI.p.cat = c; UI.render(); const m = document.querySelector('.menu-box'); if (m) m.scrollIntoView({ block: 'start' }); };
  UI.A.tutAgain = () => { UI.A.back(); setTimeout(() => Tut.start('season', true), 80); };
  UI.A.tutToggle = v => { Tut.setEnabled(!!v); UI.render(); };
  UI.S.help = { full: true, html() {
    const cur = CATS.find(c => c.id === (UI.p.cat || 'basics')) || CATS[0];
    let o = '<div class="menu-wrap"><div class="menu-box" style="max-width:980px"><div class="row"><div class="logo" style="font-size:28px">How to play</div><span class="tag" style="margin-left:10px">v' + h(G.VERSION) + '</span><span class="sp"></span>' +
      (G.S && G.S.team ? '<button class="btn" data-act="tutAgain">' + ic('play', 14) + ' Replay the tour</button>' : '') + '<button class="btn" data-act="back">Back</button></div>' +
      '<label class="row sm muted mt"><input type="checkbox" data-chg="tutToggle" ' + (Tut.enabled() ? 'checked' : '') + '> Show tutorials (a short tour each season, and the first event and match)</label>';
    o += '<div class="help-grid mt">' + CATS.map(c => '<button class="help-cat ' + (c === cur ? 'on' : '') + '" data-act="helpCat" data-arg="' + c.id + '">' + ic(c.icon, 22) + '<div><div class="b">' + h(c.name) + '</div><div class="xs muted">' + h(c.desc) + '</div></div></button>').join('') + '</div>';
    o += '<h2 class="mt">' + ic(cur.icon, 20) + ' ' + h(cur.name) + '</h2>' + cur.secs.map(s => '<div class="help-sec"><h3>' + ic(s.icon, 18) + h(s.t) + '</h3>' + (s.d || '') + '<ul>' + s.li.map(x => '<li>' + x + '</li>').join('') + '</ul></div>').join('');
    return o + '</div></div>';
  } };
})();
