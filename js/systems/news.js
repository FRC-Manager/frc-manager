'use strict';
/* FRC Manager — random inbox content: small random events with effects, and team chatter (flavor only) */
(function () {
  const U = G.U, D = G.Data;
  const N = G.News = {};
  const R = () => G.R;
  const first = name => String(name).split(' ')[0];
  const student = S => (S.students.length ? first(R().pick(S.students).name) : 'A freshman');
  const mentor = S => (S.mentors.length ? R().pick(S.mentors).name : 'Your lead mentor');
  const driver = S => { const d = G.Career.driveTeam(S).driver; return d && d.name ? first(d.name) : student(S); };
  const rival = S => {
    const ts = Object.values(S.teams).filter(t => t.region === S.team.region && t.str > 55);
    const t = ts.length ? R().pick(ts) : R().pick(Object.values(S.teams));
    return t.num + ' ' + t.name;
  };
  const concept = (S, sub) => S.robot && S.robot.subs[sub] && S.robot.subs[sub].ver ? S.robot.subs[sub].concept : null;
  const inSeason = S => S.phase === 'build' || S.phase === 'comp' || S.phase === 'kickoff';
  const month = S => D.MONTHS[S.month];
  const ROBOT_NAMES = ['Sir Spins-a-Lot', 'Captain Torque', 'Gearbox Gertrude', 'The Toaster', 'Big Bertha', 'Sparky', 'Turbo Tortoise', 'Chonk', 'Professor Zip Tie', 'Bolt Bucket', 'Steve', 'Lady Hex Key', 'The Dishwasher', 'Mr. Brownout', 'Wheelie Nelson'];
  const FOODS = ['three trays of homemade lasagna', 'a mountain of pizza', 'dumplings for forty', 'a cooler of tamales', 'a cake shaped like a swerve module', 'enough cookies to void the weight limit'];
  const PLUSH = ['penguin', 'capybara', 'axolotl', 'shark', 'frog', 'goose'];

  // ---------------------------------------------------------------
  // Small random events with real effects (kind: news)
  // ---------------------------------------------------------------
  const EVENTS = [
    { w: 3, run: S => { S.rep = Math.min(100, S.rep + 3); return ['Local news feature', 'A local TV station ran a story on the team. ' + student(S) + ' said "robots" eleven times in a 40-second clip. Reputation +3.']; } },
    { w: 2, run: S => { const c = R().int(200, 600); G.Career.spend(S, c, 'Supplier rush shipping'); return ['Supplier delay', 'A parts order got stuck in a warehouse. You paid ' + U.money(c) + ' for rush shipping.']; } },
    { w: 3, run: S => { S.morale = Math.min(100, S.morale + 5); return ['Team bonding night', 'Pizza, board games and a very competitive round of robot trivia. Morale +5.']; } },
    { w: 2, run: S => { const g = R().int(300, 1200); G.Career.earn(S, g, 'Alumni donation'); return ['Alumni donation', 'A former team member who now works as an engineer donated ' + U.money(g) + '. The note said "buy good wire".']; } },
    { w: 2, req: S => S.robot && inSeason(S), run: S => { const ks = Object.keys(S.robot.subs).filter(k => S.robot.subs[k].ver && k !== 'soft'); if (!ks.length) return null; const k = R().pick(ks); S.robot.subs[k].hidden++; return ['Something sounds off…', student(S) + ' reports a strange noise from the ' + G.Seasons.sub(S.robot.year, k).name + '. It might be nothing. (A Systems Shakedown or Hardening would find out.)']; } },
    { w: 2, run: S => { S.parts.spares += 2; return ['Gracious Professionalism', 'Team ' + rival(S) + ' heard you were short on parts and dropped off two spare gearbox kits. +2 spare parts.']; } },
    { w: 2, run: S => { const g = R().int(300, 800); G.Career.earn(S, g, 'Hardware store donation'); return ['Hardware store donation', 'The local hardware store donated fasteners and paint worth ' + U.money(g) + '. In return, the robot will wear their sticker.']; } },
    { w: 2, run: S => { S.rep = Math.min(100, S.rep + 2); return ['Magazine feature', 'A STEM education magazine featured your outreach program. Reputation +2.']; } },
    { w: 1, req: S => S.studentsCount > 12, run: S => { S.studentsCount--; S.morale = Math.max(0, S.morale - 2); return ['A student left the team', 'A sophomore left to join the esports club. "The robots were too real." Team size −1, morale −2.']; } },
    { w: 2, run: S => { S.studentsCount++; return ['New student', 'A transfer student walked into the shop, said "I can weld", and was immediately adopted. Team size +1.']; } },
    { w: 2, run: S => { S.morale = Math.min(100, S.morale + 3); return ['Team shirts arrived', 'The new team shirts arrived and the team number is spelled correctly this year. Morale +3.']; } },
    { w: 2, req: S => S.sponsors.length > 0, run: S => { const sp = R().pick(S.sponsors); sp.sat = Math.min(100, sp.sat + 8); return ['Great sponsor visit', sp.name + ' stopped by and ' + student(S) + ' gave the best robot tour of their life. ' + sp.name + ' satisfaction +8.']; } },
    { w: 1, req: S => S.robot && S.phase === 'comp', run: S => { Object.values(S.robot.subs).forEach(s => { if (s.ver) s.cond = Math.max(0, s.cond - 8); }); return ['Robot cart incident', 'The robot cart hit a curb in the parking lot. The robot survived, mostly. Robot condition −8.']; } }
  ];

  // ---------------------------------------------------------------
  // Team chatter (kind: fun) — flavor only
  // ---------------------------------------------------------------
  const CHAT = [
    { req: S => S.phase === 'build' && S.robot && !S.season.robotName, title: 'Robot naming vote',
      body: S => { const n = R().shuffle(ROBOT_NAMES.slice()); S.season.robotName = n[0]; return 'The team voted on a name for the ' + S.year + ' robot. Winner: "' + n[0] + '". Runner-up: "' + n[1] + '". ' + student(S) + ' is demanding a recount.'; } },
    { title: 'Googly eyes proposal', body: S => student(S) + ' has proposed adding googly eyes to the robot. The motion passed 14–3. The design mentor abstained.' },
    { title: 'Late-night CAD', body: S => student(S) + ' was spotted doing CAD at 2 a.m. again. ' + mentor(S) + ' has confiscated their laptop charger "for their own good".' },
    { title: 'The zip tie talk', body: S => mentor(S) + ' gave a 40-minute talk on why zip ties are not a structural fastener. The robot currently contains 212 zip ties.' },
    { title: 'Label maker', body: S => mentor(S) + ' bought a label maker. Everything in the shop is now labeled, including the label maker.' },
    { title: 'Snack report', body: S => 'A parent brought ' + R().pick(FOODS) + '. Productivity dropped briefly, then soared.' },
    { title: 'Safety first', body: S => 'Safety captain ' + student(S) + ' handed out ' + R().int(14, 40) + ' safety-glasses reminders today. A new team record.' },
    { title: 'New pit mascot', body: S => 'Someone brought a ' + R().pick(PLUSH) + ' plushie to the shop. It is now the official pit mascot and has its own badge.' },
    { title: 'Parent group chat', body: () => 'The parent group chat has ' + R().int(120, 400) + ' unread messages. Most are about carpools. One is a lasagna recipe.' },
    { req: S => S.robot && inSeason(S), title: 'Drive practice', body: S => 'Drive practice: ' + driver(S) + ' set a personal-best cycle time and took a victory lap around the shop. The lap was slower.' },
    { req: S => inSeason(S), title: 'Rival reveal video', body: S => 'Team ' + rival(S) + ' posted their robot reveal. Your students have watched it ' + R().int(20, 90) + ' times and are "definitely not worried".' },
    { req: S => S.robot && inSeason(S), title: 'Reveal video stats', body: S => 'Your robot reveal reached ' + R().int(2, 40) + ',' + R().int(100, 999) + ' views. Top comment: "' + R().pick(['how is it that fast', 'clean wiring, respect', 'the bumpers are perfect', 'my grandma could drive that (compliment)', 'is that legal??', 'need the CAD please']) + '"' },
    { req: S => S.robot && inSeason(S) && G.Robot.weight(S) >= 115, title: 'The scale', body: S => 'The robot weighs ' + G.Robot.weight(S) + ' lb. The team now refers to the scale as "the enemy".' },
    { req: S => S.money < 5000, title: 'Swear jar', body: S => 'Treasurer ' + student(S) + ' started a swear jar. It is already the team\'s fourth-largest sponsor.' },
    { req: S => S.morale < 45, title: 'Quiet shop', body: () => 'The shop has been quiet lately. Someone made a playlist called "Robot Blues". It has 41 songs.' },
    { req: S => S.morale > 80, title: 'Team chant', body: () => 'Spirits are high. The team chant has gained a second verse and an optional dance.' },
    { req: S => concept(S, 'drive') === 'swerve', title: 'Swerve noises', body: S => 'The swerve modules are making a new noise. ' + student(S) + ' calls it "the song of my people".' },
    { req: S => concept(S, 'scorer') === 'turret', title: 'Turret tracking', body: S => student(S) + ' spent an hour making the turret track ' + mentor(S) + '\'s face. It works disturbingly well.' },
    { req: S => ['elev', 'elevw', 'amptrap'].includes(concept(S, 'scorer')) || concept(S, 'amp') === 'amptrap', title: 'Elevator test', body: () => 'Elevator test: it went up very fast and came down even faster. Nobody was hurt. One ceiling tile was.' },
    { req: S => S.robot && S.robot.subs.endgame && S.robot.subs.endgame.ver, title: 'Climb test', body: () => 'The first full climb on the practice rig worked. The team celebrated like it was a playoff win.' },
    // game-specific
    { req: S => S.year === 2022 && inSeason(S), title: 'Cargo escape', body: () => 'A cargo ball was launched over the practice net and into the hallway. The principal returned it personally.' },
    { req: S => S.year === 2022 && inSeason(S), title: 'Traversal debate', body: S => student(S) + ' insists the robot can do Traversal "if we believe hard enough".' },
    { req: S => S.year === 2023 && inSeason(S), title: 'Cones vs. cubes', body: () => 'The cone-versus-cube debate has split the team into two camps. They now sit at opposite ends of the shop.' },
    { req: S => S.year === 2023 && inSeason(S), title: 'Charge station', body: S => 'The practice charge station has become ' + student(S) + '\'s favorite place to eat lunch. It balances perfectly when they do.' },
    { req: S => S.year === 2024 && inSeason(S), title: 'Note in the ceiling', body: () => 'A note got stuck in the ceiling tiles. It has been named "Steve" and will not be removed.' },
    { req: S => S.year === 2024 && inSeason(S), title: 'Amp anxiety', body: S => student(S) + ' yells "AMPLIFY!" every time anyone touches a button. Including the microwave.' },
    { req: S => S.year === 2025 && inSeason(S), title: 'Coral dust', body: () => 'PVC dust is everywhere. The custodian has opinions and has shared them.' },
    { req: S => S.year === 2025 && inSeason(S), title: 'Algae count', body: () => 'Algae (the ball) in the shop: 37. Algae (the real kind) in the team fish tank: also too many.' },
    { req: S => S.year === 2026 && inSeason(S), title: 'Fuel everywhere', body: () => 'Fuel balls found so far: backpacks (4), the microwave (1), the principal\'s office (2), unaccounted for (lots).' },
    { req: S => S.year === 2026 && inSeason(S), title: 'Hub shift drills', body: S => student(S) + ' now announces "SHIFT CHANGE!" every 25 seconds during practice. Even during lunch.' },
    // calendar-specific
    { req: S => S.phase === 'off' && ['Jun', 'Jul', 'Aug'].includes(month(S)), title: 'Summer shop day', body: () => 'Summer shop day: a few students built a machine that makes smoothies. It is the most reliable mechanism you own.' },
    { req: S => S.phase === 'off' && ['Jun', 'Jul', 'Aug'].includes(month(S)), title: 'Alumni visit', body: S => 'An alum visited from college and said college robotics is "the same chaos, just with a bigger budget".' },
    { req: S => S.phase === 'off' && month(S) === 'Sep', title: 'Club fair', body: () => 'Club fair: the robot drove into the cafeteria and recruited three freshmen and one confused chemistry teacher.' },
    { req: S => S.phase === 'off' && month(S) === 'Oct', title: 'Halloween costumes', body: S => student(S) + ' came to the meeting dressed as a swerve module. Nobody understood it except the programmers.' },
    { req: S => S.phase === 'off' && month(S) === 'Dec', title: 'Holiday party', body: () => 'Holiday gift exchange: nine of the twelve gifts were hex key sets. Everyone was happy.' },
    { req: S => S.phase === 'off' && month(S) === 'Dec', title: 'Kickoff predictions', body: S => student(S) + '\'s prediction for next season\'s game: "robots throw robots". The pool is open at $1 a guess.' },
    { req: S => S.phase === 'off' && S.history.length > 0, title: 'Looking back', body: S => { const h = S.history[S.history.length - 1]; return 'Someone made a highlight video of the ' + h.year + ' season. The comment section is entirely parents, and it is wonderful.'; } }
  ];

  function post(S, title, body, kind) { G.Career.inbox(S, title, body, kind); }
  // Called once per turn
  N.turn = function (S) {
    if (R().chance(0.15)) {
      const pool = EVENTS.filter(e => !e.req || e.req(S));
      const e = R().wpick(pool, x => x.w);
      const res = e && e.run(S);
      if (res) post(S, res[0], res[1], 'news');
    }
    if (R().chance(0.32)) {
      const recent = new Set(S.inbox.slice(0, 25).map(m => m.title));
      const pool = CHAT.filter(c => (!c.req || c.req(S)) && !recent.has(c.title));
      if (pool.length) { const c = R().pick(pool); post(S, c.title, c.body(S), 'fun'); }
    }
  };
  N.kickoff = function (S) {
    post(S, 'Kickoff watch party', R().int(18, 45) + ' students, ' + R().int(4, 12) + ' boxes of donuts and one very loud reaction when the ' + G.Seasons[S.year].name + ' field appeared on screen. ' + student(S) + ' has already sketched three robots on a napkin.', 'fun');
  };
  N.afterEvent = function (S, r) {
    if (!r || !R().chance(0.6)) return;
    const lines = r.won ? ['The bus ride home was one long chant. ' + driver(S) + ' slept clutching the banner.', 'The group chat has posted the winning-match video 63 times. Nobody is tired of it yet.']
      : r.playoffs ? ['The drive team got a standing ovation from the parents in the stands. ' + driver(S) + ' turned bright red.', student(S) + ' is already making a list of "things we fix before next time". It is four pages long.']
        : ['Tough event. ' + mentor(S) + ' gave a speech about learning from it that made two people cry, one of them ' + mentor(S).split(' ')[0] + '.', 'The team agreed on three things to fix and ate an entire gas station\'s worth of snacks on the way home.'];
    post(S, 'After ' + r.name, R().pick(lines), 'fun');
  };
})();
