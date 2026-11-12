'use strict';
/* FRC Manager — inbox life: news (some with small effects, some you can reply to) and team chatter.
   Every turn (a week in season, a month in the offseason) brings at least one news item and one to three chatter
   posts. Each template has a cooldown so the same story does not come round again for months. None of it pops up:
   rumours, vendor gossip and second-hand prices (the last part of this file) wait in the Inbox for whoever reads them. */
(function () {
  const U = G.U, D = G.Data;
  const N = G.News = {};
  const R = () => G.R;
  const first = name => String(name).split(' ')[0];
  const student = S => (S.students.length ? first(R().pick(S.students).name) : 'A freshman');
  const student2 = (S, not) => { const p = S.students.filter(s => first(s.name) !== not); return p.length ? first(R().pick(p).name) : 'another student'; };
  const mentorObj = S => (S.mentors.length ? R().pick(S.mentors) : null);
  const mentor = S => { const m = mentorObj(S); return m ? m.name : 'Your lead mentor'; };
  const mentorOf = (S, role) => S.mentors.find(m => m.role === role) || null;
  const driver = S => { const d = G.Career.driveTeam(S).driver; return d && d.name ? first(d.name) : student(S); };
  const teamName = S => S.team.num + ' ' + S.team.name;
  const others = S => Object.values(S.teams || {}).filter(t => t.num !== S.team.num);
  const rivalT = S => {
    const ts = others(S).filter(t => t.region === S.team.region && t.str > 55);
    const pool = ts.length ? ts : others(S);
    return pool.length ? R().pick(pool) : { num: 254, name: 'Rival Robotics', str: 70 };
  };
  const rival = S => { const t = rivalT(S); return t.num + ' ' + t.name; };
  const rookie = S => { const ts = others(S).filter(t => t.str < 40); const t = ts.length ? R().pick(ts) : null; return t ? t.num + ' ' + t.name : (9000 + R().int(100, 999)) + ' the ' + R().pick(['Gearheads', 'Bolts', 'Circuit Breakers', 'Iron Owls', 'Robo Raptors']); };
  const concept = (S, sub) => S.robot && S.robot.subs[sub] && S.robot.subs[sub].ver ? S.robot.subs[sub].concept : null;
  const inSeason = S => S.phase === 'build' || S.phase === 'comp' || S.phase === 'kickoff';
  const month = S => D.MONTHS[S.month];
  const off = S => S.phase === 'off';
  const lastEv = S => (S.season && S.season.events.length ? S.season.events[S.season.events.length - 1] : null);
  const lastSeason = S => (S.history.length ? S.history[S.history.length - 1] : null);
  const regName = S => (D.REGIONS ? S.team.region : 'your region');
  const ord = n => n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');
  const turnNo = S => S.newsTurn || 0;
  const seen = S => S.newsSeen || (S.newsSeen = {});
  const fresh = (S, id, cd) => { const t = seen(S)[id]; return t == null || turnNo(S) - t >= cd; };
  const addRep = (S, v) => G.Career.addRep(S, v);
  const addMorale = (S, v) => { S.morale = U.clamp(S.morale + v, 0, 100); };
  const wearRobot = (S, lo, hi) => { let w = 0; if (S.robot) Object.values(S.robot.subs).forEach(s => { if (s.ver && s !== S.robot.subs.soft) { const d = R().range(lo, hi); s.cond = Math.max(0, s.cond - d); w += d; } }); return w; };
  const ROBOT_NAMES = ['Sir Spins-a-Lot', 'Captain Torque', 'Gearbox Gertrude', 'The Toaster', 'Big Bertha', 'Sparky', 'Turbo Tortoise', 'Chonk', 'Professor Zip Tie', 'Bolt Bucket', 'Steve', 'Lady Hex Key', 'The Dishwasher', 'Mr. Brownout', 'Wheelie Nelson'];
  const FOODS = ['three trays of homemade lasagna', 'a mountain of pizza', 'dumplings for forty', 'a cooler of tamales', 'a cake shaped like a swerve module', 'enough cookies to void the weight limit', 'a slow cooker of chili', 'two hundred samosas'];
  const PLUSH = ['penguin', 'capybara', 'axolotl', 'shark', 'frog', 'goose', 'otter'];
  const GAME = { 2022: 'RAPID REACT', 2023: 'CHARGED UP', 2024: 'CRESCENDO', 2025: 'REEFSCAPE', 2026: 'REBUILT' };
  Object.keys(G.Seasons).filter(k => /^\d{4}$/.test(k)).forEach(y => { GAME[y] = GAME[y] || G.Seasons[y].name; });
  const seasonText = (S, key) => (G.Seasons[S.year] && G.Seasons[S.year].news ? G.Seasons[S.year].news[key] : null);

  // =================================================================
  // Replies: a message can carry options; picking one applies a small effect. Optional, never a popup.
  // =================================================================
  const REPLY = {
    interview: [
      { text: 'Send the team captain', run: S => { addRep(S, 0.5); return 'The captain was calm, clear and only said "basically" six times. Reputation +0.5.'; } },
      { text: 'Bring the robot too', req: S => S.robot, run: S => { addRep(S, 1); const w = inSeason(S) ? wearRobot(S, 2, 5) : 0; return 'The robot drove circles around the reporter and stole the show. Reputation +1' + (w ? ', robot condition slightly down from the demo.' : '.'); } },
      { text: 'Politely decline', run: () => 'You thanked them and kept the team focused on the shop.' }
    ],
    rookie: [
      { text: 'Send two students on Saturday', run: S => { addRep(S, 1); S.actHours += 8; return 'Your students helped them wire their first drivetrain. They sent a photo of it driving. Reputation +1, 8 team hours used.'; } },
      { text: 'Give them a spare part', req: S => S.parts.spares > 0, run: S => { S.parts.spares--; addRep(S, 0.5); return 'One spare gearbox is now living a better life on a rookie robot. Spare parts −1, reputation +0.5.'; } },
      { text: 'Point them to the online guides', run: () => 'You sent a list of good tutorials. They said thanks.' }
    ],
    scrimmage: [
      { text: 'Accept: bring the competition robot', req: S => S.robot, run: S => {
        S.practiceWeeks = Math.min(D.DRILL_CAP, (S.practiceWeeks || 0) + 1);
        S.lastConf = Math.min(0.9, (S.lastConf || 0) + 0.05);
        const dt = G.Career.driveTeam(S); if (dt.driver.id) G.Career.studentXP(S, dt.driver, ['drive', 'comp'], 0.6);
        S.actHours += 6;
        const c0 = G.Robot.condAvg(S); wearRobot(S, 6, 12);
        return 'Real matches against a real defender. Your drivers came home sharper (+1 week of driver practice, a little more confidence at your next event), but the robot took a beating (condition −' + Math.round(c0 - G.Robot.condAvg(S)) + '%).';
      } },
      { text: 'Send the drive team with the practice robot', req: S => G.Robot.twoBots(S), run: S => { S.practiceWeeks = Math.min(D.DRILL_CAP, (S.practiceWeeks || 0) + 0.5); S.actHours += 4; return 'The practice robot took the hits. +0.5 week of driver practice, no wear on the competition robot.'; } },
      { text: 'Decline: we need the build time', run: () => 'You declined. The shop stayed busy.' }
    ],
    sponsorPost: [
      { text: 'Post a thank-you video', run: (S, d) => { const sp = S.sponsors.find(x => x.id === d.sp); if (sp) sp.sat = Math.min(100, sp.sat + 4); addRep(S, 0.3); return (sp ? sp.name : 'The sponsor') + ' loved it and shared it with the whole company. Satisfaction +4.'; } },
      { text: 'Just like and share it', run: () => 'You shared it. Nice and easy.' }
    ],
    forum: [
      { text: 'Post a teaser photo', run: S => { addRep(S, 1); return 'A blurry photo of a gearbox started a 300-reply thread. Reputation +1.'; } },
      { text: 'Share your CAD and code openly', req: S => S.robot, run: S => { addRep(S, 1.5); S.actHours += 4; return 'Other teams are learning from your design, and they say so. Reputation +1.5 (4 hours spent cleaning up the files).'; } },
      { text: 'Stay quiet', run: () => 'Mystery is also a strategy.' }
    ],
    board: [
      { text: 'Send students to present', run: S => { S.support = U.clamp(S.support + 1, 0, 100); S.actHours += 6; return 'Three students explained what an encoder is to the school board. Two board members asked follow-up questions. Program support +1.'; } },
      { text: 'Send a written report', run: S => { S.support = U.clamp(S.support + 0.5, 0, 100); return 'The report was read into the minutes. Program support +0.5.'; } },
      { text: 'Skip it', run: () => 'The meeting went ahead without you.' }
    ],
    borrow: [
      { text: 'Lend them a spare', req: S => S.parts.spares > 0, run: S => { S.parts.spares--; addRep(S, 1); return 'They made their next match with your part on the robot. The whole pit area heard about it. Spare parts −1, reputation +1.'; } },
      { text: 'Lend tools and a student', run: S => { addRep(S, 0.5); return 'Your pit crew helped them rebuild. Reputation +0.5.'; } },
      { text: 'Sorry, we need everything', run: () => 'You kept your spares. Fair enough.' }
    ],
    parent: [
      { text: 'Yes: run a fundraiser', run: S => { const g = R().int(250, 600); G.Career.earn(S, g, 'Parent-run fundraiser'); return 'The parents ran a car wash and a raffle. +' + U.money(g) + '.'; } },
      { text: 'Cook for build nights instead', run: S => { addMorale(S, 3); return 'Build nights now come with dinner. Morale +3.'; } }
    ],
    alumni: [
      { text: 'Invite them to talk to the team', run: S => { addMorale(S, 2); return 'Their talk on "what I wish I knew as a freshman" was a hit. Morale +2.'; } },
      { text: 'Ask them to review your design', req: S => S.robot, run: S => { addRep(S, 0.3); S.parts.spares += 1; return 'They found a weak bracket and brought a replacement from their lab. +1 spare part.'; } }
    ],
    restock: [
      { get text() { return 'Stock up now (' + G.U.money(400) + ')'; }, req: S => !G.Career.afford(S, 400), run: S => { G.Career.spend(S, 400, 'Stocked up before a shortage'); S.parts.spares += 2; return 'Bought ahead of the shortage. +2 spare parts for ' + G.U.money(400) + '.'; } },
      { text: 'Wait and see', run: () => 'You decided to wait.' }
    ],
    tired: [
      { text: 'Give them a weekend off', run: (S, d) => { const m = S.mentors.find(x => x.id === d.m); if (m) m.morale = Math.min(100, (m.morale || 70) + 12); S.actHours += 4; return (m ? m.name : 'Your mentor') + ' came back rested. Mentor morale +12, a few team hours lost.'; } },
      { text: 'Thank them in front of the team', run: (S, d) => { const m = S.mentors.find(x => x.id === d.m); if (m) m.morale = Math.min(100, (m.morale || 70) + 5); addMorale(S, 1); return 'The team made a card. It has 31 signatures and a drawing of a robot. Mentor morale +5.'; } }
    ],
    showcase: [
      { text: 'Do the demo', req: S => S.robot, run: S => { addRep(S, 1); S.support = U.clamp(S.support + 0.5, 0, 100); const w = inSeason(S) ? wearRobot(S, 1, 4) : 0; return 'The robot drove through the gym during the assembly. The applause was louder than for the basketball team. Reputation +1, program support +0.5' + (w ? ', a little robot wear.' : '.'); } },
      { text: 'Show the video instead', run: S => { addRep(S, 0.3); return 'The highlight video played on the big screen. Reputation +0.3.'; } }
    ]
  };
  function replyMsg(key, extra) {
    return Object.assign({ reply: { key, opts: REPLY[key].map(o => o.text) } }, extra || {});
  }
  N.replyOptions = function (S, m) {
    if (!m.reply || m.replied != null) return [];
    if (m.until != null && turnNo(S) > m.until) return [];
    return REPLY[m.reply.key].map((o, i) => ({ i, text: o.text, ok: !o.req || o.req(S) }));
  };
  N.reply = function (S, id, i) {
    const m = S.inbox.find(x => x.id === id);
    if (!m || !m.reply || m.replied != null) return null;
    const o = REPLY[m.reply.key][i];
    if (!o || (o.req && !o.req(S))) return null;
    const res = o.run(S, m.reply.data || {});
    m.replied = i; m.outcome = res; m.read = true;
    return res;
  };

  // =================================================================
  // News with real effects (rare: about one turn in six)
  // =================================================================
  const EVENTS = [
    { id: 'tv', w: 3, run: S => { addRep(S, 3); return ['Local news feature', 'A local TV station ran a story on the team. ' + student(S) + ' said "robots" eleven times in a 40-second clip. Reputation +3.']; } },
    { id: 'delay', w: 2, run: S => { const c = R().int(200, 600); G.Career.spend(S, c, 'Supplier rush shipping'); return ['Supplier delay', 'A parts order got stuck in a warehouse. You paid ' + U.money(c) + ' for rush shipping.']; } },
    { id: 'bond', w: 3, run: S => { addMorale(S, 5); const tired = G.Career.inSeason(S); if (tired) S.fatigue = Math.max(5, S.fatigue - 5); return ['Team bonding night', 'Pizza, board games and a very competitive round of robot trivia. Morale +5' + (tired ? ', fatigue −5' : '') + '.']; } },
    { id: 'rest', w: 2, req: S => G.Career.inSeason(S) && S.fatigue > 35, run: S => { S.fatigue = Math.max(5, S.fatigue - 6); return ['A quiet evening', 'The mentors sent everyone home early and nobody argued. Fatigue −6.']; } },
    { id: 'alum$', w: 2, run: S => { const g = R().int(300, 1200); G.Career.earn(S, g, 'Alumni donation'); return ['Alumni donation', 'A former team member who now works as an engineer donated ' + U.money(g) + '. The note said "buy good wire".']; } },
    { id: 'noise', w: 2, req: S => S.robot && inSeason(S), run: S => { const ks = Object.keys(S.robot.subs).filter(k => S.robot.subs[k].ver && k !== 'soft'); if (!ks.length) return null; const k = R().pick(ks); S.robot.subs[k].hidden++; return ['Something sounds off…', student(S) + ' reports a strange noise from the ' + G.Seasons.sub(S.robot.year, k).name + '. It might be nothing. (A Systems Shakedown or Hardening would find out.)']; } },
    { id: 'gp', w: 2, run: S => { S.parts.spares += 2; return ['Gracious Professionalism', 'Team ' + rival(S) + ' heard you were short on parts and dropped off two spare gearbox kits. +2 spare parts.']; } },
    { id: 'hw$', w: 2, run: S => { const g = R().int(300, 800); G.Career.earn(S, g, 'Hardware store donation'); return ['Hardware store donation', 'The local hardware store donated fasteners and paint worth ' + U.money(g) + '. In return, the robot will wear their sticker.']; } },
    { id: 'mag', w: 2, run: S => { addRep(S, 2); return ['Magazine feature', 'A STEM education magazine featured your outreach program. Reputation +2.']; } },
    { id: 'leave', w: 1, req: S => S.studentsCount > 12, run: S => { S.studentsCount--; addMorale(S, -2); return ['A student left the team', 'A sophomore left to join the esports club. "The robots were too real." Team size −1, morale −2.']; } },
    { id: 'join', w: 2, run: S => { S.studentsCount++; return ['New student', 'A transfer student walked into the shop, said "I can weld", and was immediately adopted. Team size +1.']; } },
    { id: 'shirts', w: 2, run: S => { addMorale(S, 3); return ['Team shirts arrived', 'The new team shirts arrived and the team number is spelled correctly this year. Morale +3.']; } },
    { id: 'spvisit', w: 2, req: S => S.sponsors.length > 0, run: S => { const sp = R().pick(S.sponsors); sp.sat = Math.min(100, sp.sat + 8); return ['Great sponsor visit', sp.name + ' stopped by and ' + student(S) + ' gave the best robot tour of their life. ' + sp.name + ' satisfaction +8.']; } },
    { id: 'cart', w: 1, req: S => S.robot && S.phase === 'comp', run: S => { wearRobot(S, 8, 8); return ['Robot cart incident', 'The robot cart hit a curb in the parking lot. The robot survived, mostly. Robot condition −8.']; } },
    { id: 'snow', w: 1, req: S => S.phase === 'build' && S.week <= 5, run: S => { S.actHours += 10; return ['Snow day', 'The school closed for snow. The shop was locked and the group chat was full of CAD screenshots. About 10 team hours lost this week.']; } }
  ];

  // =================================================================
  // News: the FRC world and your own program (flavor, often team-specific; some invite a reply)
  // =================================================================
  const NEWS = [
    // ---- v2.4 / v2.5: the state of the art, Impact, season strategies, workshop
    { id: 'n5rules', w: 3, cd: 20, req: S => off(S) && S.history.length && month(S) === 'Jun', run: S => ['Forum watch: next season\'s rule changes', 'The longest thread this week is fourteen pages about wire gauge. The second longest is people finding out their favourite library was rewritten. ' + rival(S) + ' posted a migration guide; ' + mentor(S) + ' printed it and has already filled the margins.'] },
    { id: 'n5designs', w: 3, cd: 20, req: S => off(S) && S.history.length && ['Aug', 'Sep'].includes(month(S)), run: S => ['Reveal season: everybody copies everybody', 'Offseason reveal videos are out and the same three mechanisms are in half of them. A veteran mentor summed it up: "What you knew last year is a starting point now." Teams that keep researching through the summer keep their edge.'] },
    { id: 'n5impact', w: 3, cd: 25, req: S => S.phase === 'comp' && S.week >= 3, run: S => ['Impact Award watch', 'The community list of regional Impact Award winners is growing. Every one of them is judged again at the Championship: six Finalists are called onto Einstein before Final 1 and the FIRST Impact Award winner after it. Winners join the Hall of Fame, even when their robot never plays on that field.'] },
    { id: 'n5chassis', w: 3, cd: 25, req: S => S.phase === 'build' && S.week <= 2, run: S => ['Trend: the week-one test chassis', 'Half the teams in ' + regName(S) + ' posted a driving chassis before the end of week one. Programmers get paths, drivers get someone to play defense against, and the electrical team finds the loose crimp in January instead of March.'] },
    { id: 'n5amp', w: 3, cd: 40, req: S => S.year === 2024 && S.phase === 'comp', run: S => ['Meta watch: the Amp without an amp mechanism', 'Pivot shooters are dropping notes into the Amp with nothing but a slow, flat shot. It is not fast and it misses, but it keeps the amplification running. Fixed shooters try it too, with more hope than success.'] },
    { id: 'n5reef', w: 3, cd: 40, req: S => S.year === 2025 && S.phase === 'comp', run: S => ['Meta watch: the far side of the Reef', 'The near faces of the Reef fill up in the first minute. After that the best alliances send one robot around the back, where the branches are still empty and the cycles are long. Scouts have started counting "far-side coral" on their own sheet.'] },
    { id: 'n5hoard', w: 3, cd: 40, req: S => S.year === 2026 && S.phase === 'comp', run: S => ['Meta watch: fuel hoarding', 'More alliances now sweep the neutral zone while their hub is dark and lob the fuel home, so the next scoring shift starts with a pile a few steps from the hub. Alliances that ignore it spend that shift chasing single balls.'] },
    { id: 'n5space', w: 2, cd: 30, req: S => off(S), run: S => ['School board season', 'Programs across ' + regName(S) + ' are asking their boards for room. ' + rival(S) + ' moved into a full wing after two strong seasons. ' + rookie(S) + ' still shares a storage room with the marching band and has learned to machine around a tuba.'] },
    { id: 'n5gift', w: 2, cd: 30, req: S => S.sponsors.length > 0, run: S => ['A sponsor cleans out a lab', rival(S) + ' came back from winter break to find a pallet at the shop door: equipment their sponsor no longer needed. "They only do that when they like you," said their lead mentor, "and when you have somewhere to put it."'] },
    { id: 'n5ftc', w: 2, cd: 30, req: S => off(S) && month(S) !== 'Jun', run: S => ['Homegrown: FTC teams in the building', 'Several top programs now run their own FTC teams down the hall. Their freshmen arrive knowing how to wire a robot, read a game manual and lose a match gracefully. Outside programs still help, but a team in your own building is cheaper and closer.'] },
    { id: 'n5tech', w: 2, cd: 30, req: S => S.phase === 'comp', run: S => ['The fifth button: Technician', 'More teams send a fifth student to the field with the drive team. The Technician runs the pre-match checklist and leads repairs in the pits. One team credits theirs with "catching the joystick thing. Twice."'] },
    { id: 'n5full', w: 2, cd: 40, req: S => S.studentsCount >= 85, run: S => ['Too popular', 'Robotics is now one of the biggest clubs at your school. The activities office says the roster stops at ' + D.STUDENT_CAP + ': after that, new applicants go on a waiting list. ' + student(S) + ' suggested try-outs. ' + mentor(S) + ' suggested a second team.'] },
    // ---- your results and standing
    { id: 'rank', w: 4, cd: 3, req: S => S.phase === 'comp' && lastEv(S), run: S => { const e = lastEv(S), n = U.clamp(Math.round(1 + (100 - S.rep) / 6 + R().int(-2, 2)), 1, 40); return ['Power rankings: ' + regName(S), 'This week\'s community power rankings put ' + teamName(S) + ' at #' + n + ' in ' + regName(S) + '. Your OPR at ' + e.name + ' was ' + e.opr.toFixed(1) + '. ' + (n <= 5 ? 'The comment section calls you "a problem".' : n <= 15 ? 'One commenter calls you "a dark horse".' : 'Nobody has commented yet.')]; } },
    { id: 'recap', w: 6, cd: 1, req: S => S.phase === 'comp' && lastEv(S) && S.season.newsRecap !== lastEv(S).id, run: S => { const e = lastEv(S); S.season.newsRecap = e.id; return ['Event recap: ' + e.name, 'The recap video for ' + e.name + ' is up. ' + (e.won ? 'Your alliance\'s final match is the thumbnail.' : e.playoffs ? 'Your playoff run gets a highlight at 3:42 (' + e.finish.toLowerCase() + ').' : 'You appear for one second, in the background, fixing a bumper.') + ' Qualification record: ' + e.record + ', ranked ' + ord(e.rank) + ' of ' + e.size + '.']; } },
    { id: 'award', w: 5, cd: 1, req: S => S.season && S.season.awards.length > (S.season.newsAwards || 0), run: S => { S.season.newsAwards = S.season.awards.length; const a = D.AWARDS.find(x => x.id === S.season.awards[S.season.awards.length - 1]); return ['Your ' + (a ? a.name : 'award') + ' is getting noticed', 'Two teams from other regions asked how you approached the ' + (a ? a.name : 'award') + '. ' + student(S) + ' wrote them a four-page answer.']; } },
    { id: 'lastyr', w: 2, cd: 30, req: S => off(S) && lastSeason(S), run: S => { const h = lastSeason(S); return ['Season in review', 'A regional blog ranked the ' + (h.cy || G.Career.calYear(S, h.year)) + ' season\'s teams. ' + teamName(S) + ' made the list ' + (h.champs ? 'as a Championship team.' : (h.events || []).some(e => e.won) ? 'as an event winner.' : 'under "teams to watch next year".')]; } },
    { id: 'repUp', w: 3, cd: 10, req: S => S.rep >= 70, run: S => ['People know your name', 'At the last outreach event, three people recognized the team shirt before you said anything. Your reputation is opening doors: expect more invitations.'] },
    { id: 'repLow', w: 2, cd: 12, req: S => S.rep < 35, run: S => ['"Underrated teams to watch"', 'A forum thread lists 40 underrated teams. ' + teamName(S) + ' is not on it. ' + student(S) + ' has made an account to fix that.'] },
    // ---- invitations and requests (reply)
    { id: 'scrim', w: 5, cd: 4, req: S => S.robot && S.rep >= 50 && (S.phase === 'comp' || (S.phase === 'build' && S.week >= 3) || (off(S) && ['Jun', 'Jul', 'Sep', 'Oct', 'Nov'].includes(month(S)))),
      run: S => { const t = rival(S); return ['Scrimmage invitation from ' + t, 'Team ' + t + ' is hosting a weekend scrimmage on their practice field and asked for you by name' + (S.rep >= 75 ? ' ("we need someone who will actually play defense")' : '') + '. Real matches are great practice, but the robot will take some hits.', replyMsg('scrimmage', { until: turnNo(S) + 1 })]; } },
    { id: 'rook', w: 4, cd: 6, run: S => { const t = rookie(S); return ['A rookie team asks for help', 'Team ' + t + ' is in its first season. Their lead mentor emailed: "We have a kit of parts and a lot of enthusiasm. Could anyone show us how to wire this?"', replyMsg('rookie', { until: turnNo(S) + 2 })]; } },
    { id: 'press', w: 3, cd: 8, run: S => ['Interview request', 'The ' + R().pick(['local paper', 'school news channel', 'city radio station', 'regional STEM podcast']) + ' wants to interview the team about ' + (S.phase === 'comp' ? 'your season so far' : inSeason(S) ? 'build season' : 'what a robotics team does all year') + '.', replyMsg('interview', { until: turnNo(S) + 2 })] },
    { id: 'forum', w: 3, cd: 8, req: S => S.robot && (S.phase === 'build' || S.phase === 'comp'), run: S => ['Forum thread about your robot', 'A thread titled "What is ' + S.team.num + ' building?" has ' + R().int(40, 260) + ' replies, most of them guesses from a single blurry photo. ' + (S.rep >= 60 ? 'People are paying attention.' : 'It is mostly people asking who you are.'), replyMsg('forum', { until: turnNo(S) + 2 })] },
    { id: 'board', w: 2, cd: 10, req: S => off(S) || S.phase === 'build', run: S => ['School board meeting', 'Robotics is on the agenda at next week\'s school board meeting' + (S.support < 45 ? ', right after the budget review. The tone has been tense.' : '. The superintendent asked for "a short update, with pictures".'), replyMsg('board', { until: turnNo(S) + 1 })] },
    { id: 'borrow', w: 3, cd: 5, req: S => S.phase === 'comp', run: S => ['Pit request from ' + rival(S), 'Their drivetrain cracked a gearbox plate in the last match and the vendor booth is sold out. They are asking around the pits for a spare.', replyMsg('borrow', { until: turnNo(S) })] },
    { id: 'parent', w: 2, cd: 12, run: S => ['A parent wants to help', 'The parent of ' + student(S) + ' offered to help the team "with anything that does not involve a soldering iron".', replyMsg('parent', { until: turnNo(S) + 2 })] },
    { id: 'alumni', w: 2, cd: 12, req: S => off(S) || S.phase === 'build', run: S => ['An alum checks in', 'A former team captain is home from an engineering degree and offered to stop by the shop.', replyMsg('alumni', { until: turnNo(S) + 2 })] },
    { id: 'restock', w: 2, cd: 10, req: S => S.phase === 'build' || (off(S) && ['Oct', 'Nov', 'Dec'].includes(month(S))), run: S => ['Vendor stock alert', 'A big FRC vendor warns that ' + (brushlessOut(S) ? 'brushless motors' : 'motors') + ' and gearbox parts will be back-ordered for six weeks.', replyMsg('restock', { until: turnNo(S) + 1 })] },
    { id: 'spPost', w: 3, cd: 6, req: S => S.sponsors.length > 0, run: S => { const sp = R().pick(S.sponsors); return [sp.name + ' posted about you', sp.name + ' shared a photo of your team on their company page: "Proud to support ' + teamName(S) + '!" It has more likes than anything else they have posted this year.', replyMsg('sponsorPost', { until: turnNo(S) + 2, reply: { key: 'sponsorPost', opts: REPLY.sponsorPost.map(o => o.text), data: { sp: sp.id } } })]; } },
    { id: 'tired', w: 3, cd: 8, req: S => S.mentors.some(m => (m.morale || 70) < 55), run: S => { const m = S.mentors.filter(x => (x.morale || 70) < 55).sort((a, b) => a.morale - b.morale)[0]; return [m.name + ' looks tired', m.name + ' has been in the shop every night this week and fell asleep in the car park. The students noticed.', { reply: { key: 'tired', opts: REPLY.tired.map(o => o.text), data: { m: m.id } }, until: turnNo(S) + 1 }]; } },
    { id: 'pepRally', w: 2, cd: 14, req: S => S.robot && (S.phase === 'comp' || (off(S) && ['Sep', 'Oct'].includes(month(S)))), run: S => ['Pep rally invitation', 'The principal asked if the robot could appear at the ' + (S.phase === 'comp' ? 'spring' : 'homecoming') + ' pep rally.', replyMsg('showcase', { until: turnNo(S) + 1 })] },
    // ---- mentors and school
    { id: 'mPromo', w: 2, cd: 14, req: S => S.mentors.length, run: S => { const m = mentorObj(S); return ['Mentor news', m.name + ' got a promotion at work. Their first question was whether the new schedule still allows Tuesday and Thursday nights in the shop. It does.']; } },
    { id: 'mTalk', w: 2, cd: 14, req: S => S.mentors.length, run: S => { const m = mentorObj(S), role = (D.MENTOR_ROLES.find(r => r.id === m.role) || { name: 'mentor' }).name.toLowerCase(); return ['Workshop night', m.name + ' (' + role + ') ran a workshop for three local teams. Afterwards, two of them asked if they could come back next month.']; } },
    { id: 'principal', w: 2, cd: 10, run: S => ['Principal visit', 'The principal toured the shop. ' + (S.support >= 65 ? '"This is exactly the kind of program we want to grow." Program support is strong.' : S.support >= 40 ? 'They asked good questions and left with a team sticker.' : 'They asked a lot of questions about the budget. Program support needs attention.')] },
    { id: 'budget', w: 3, cd: 20, req: S => off(S) && ['Sep', 'Oct', 'Nov'].includes(month(S)), run: S => ['District budget update', 'The district published next year\'s activities budget. ' + (S.support >= 60 ? 'Robotics is listed as a "flagship program".' : S.support >= 35 ? 'Robotics is funded at last year\'s level.' : 'Robotics is listed under "under review". Results and outreach this season matter.')] },
    { id: 'grads', w: 4, cd: 30, req: S => off(S) && ['Jun', 'Jul'].includes(month(S)), run: S => ['Where the seniors are going', R().int(2, 6) + ' of your graduating seniors are heading to engineering or computer science programs. One is going to study ' + R().pick(['marine biology', 'architecture', 'music', 'law']) + ' "because of robotics, somehow".'] },
    { id: 'scholar', w: 3, cd: 30, req: S => S.phase === 'comp' || (off(S) && month(S) === 'May'), run: S => ['Scholarship news', 'Senior ' + student(S) + ' won a ' + R().pick(['FIRST-affiliated', 'local engineering society', 'community foundation']) + ' scholarship. They thanked the team in their acceptance speech.'] },
    { id: 'deans', w: 2, cd: 30, req: S => S.phase === 'comp', run: S => ['Dean\'s List nominee', 'The mentors nominated ' + student(S) + ' for the Dean\'s List Award. Nobody has told them yet. Everybody knows.'] },
    { id: 'paper', w: 2, cd: 14, run: S => ['School newspaper', 'The school paper ran a front-page piece on the team, headlined "' + R().pick(['Inside the Room That Never Sleeps', 'They Build Robots. In Six Weeks.', 'Meet the Students Who Know What a Hex Shaft Is', 'Gears, Grit and Pizza']) + '".'] },
    { id: 'space', w: 1, cd: 20, req: S => off(S), run: S => ['Shop space', 'The athletics department asked whether the shop could share its storage room with the wrestling mats. Negotiations are ongoing.'] },
    // ---- the FRC world (season-aware)
    { id: 'tu', w: 3, cd: 3, req: S => S.phase === 'build' || S.phase === 'comp', run: S => ['Team Update posted', R().pick(TEAM_UPDATES[S.year] || seasonText(S, 'updates') || TEAM_UPDATES.any)] },
    { id: 'ri3d', w: 4, cd: 30, req: S => S.phase === 'build' && S.week <= 2, run: S => ['Robot in 3 Days', 'The build-in-three-days teams have posted their ' + GAME[S.year] + ' robots. ' + student(S) + ' has watched every video twice and now has "notes".'] },
    { id: 'oa', w: 3, cd: 20, req: S => S.phase === 'build', run: S => ['Open build threads', 'Dozens of teams are posting weekly build updates for everyone to learn from. One of them is designing almost exactly your robot, ' + R().int(2, 5) + ' days ahead of you.'] },
    { id: 'wk', w: 4, cd: 2, req: S => S.phase === 'comp', run: S => { const t = rival(S); return ['Week ' + S.week + ' around the world', 'Highest scores this week came from ' + R().int(2, 5) + ' different regions. Locally, ' + t + ' ' + R().pick(['won their event', 'set a new regional high score', 'went undefeated in qualifications', 'won an Engineering award']) + '.']; } },
    { id: 'meta', w: 3, cd: 6, req: S => S.phase === 'comp' && G.Seasons[S.year].meta, run: S => ['Strategy talk', 'The meta is settling: ' + G.Seasons[S.year].meta.note] },
    { id: 'champs', w: 3, cd: 20, req: S => S.phase === 'comp' && S.week >= 4, run: S => ['Championship countdown', S.season.champsQualified ? 'Your Championship spot is confirmed. ' + student(S) + ' has started a packing list. Item one: "the robot".' : (S.team.home && G.World.on(S) ? 'Championship spots are filling up. Your district decides its places after the District Championship. ' + (G.World.myLine(S) || '') : G.Career.wildEra(S) ? 'Championship spots are filling up, and every week more of the winners have already qualified: the finalists at the late regionals are collecting wildcards.' : 'Championship spots are filling up. The Regional Pool cut-off sits around ' + G.Career.poolThreshold(S) + ' points; you have ' + G.Career.poolTotal(S) + '.')] },
    { id: 'offev', w: 2, cd: 12, req: S => off(S) && ['Jun', 'Jul', 'Sep', 'Oct'].includes(month(S)), run: S => ['Offseason events', 'Offseason event registrations are open (Calendar). Lots of teams use them to train new drivers and try out new ideas.'] },
    { id: 'kickoffHype', w: 3, cd: 30, req: S => off(S) && month(S) === 'Dec', run: S => ['Kickoff is coming', 'Kickoff is a few weeks away. The game teaser video is three seconds long and the forum has already written ' + R().int(200, 900) + ' posts analyzing it.'] },
    { id: 'pins', w: 2, cd: 30, req: S => S.phase === 'build' && S.week >= 2, run: S => ['Ref corner: pins and protected zones', 'This year a robot may pin an opponent for ' + (G.Rules[S.year].defense.pin === 3 ? 'three' : 'five') + ' seconds, then it has to back off six feet. ' + (PROT[S.year] || seasonText(S, 'prot') || '') + ' Your drive coach is making the drivers count out loud.'] }
  ];
  const PROT = {
    2022: 'Robots touching their Launch Pad are protected all match, and the Hangar Zone in the last 30 seconds.',
    2023: 'Nobody may touch a robot in its own Community or Loading Zone, so defense happens mid-field.',
    2024: 'The Source and Amp Zones are protected, and the Stage in the last 20 seconds.',
    2025: 'The Reef Zone and Barge Zone are protected, so the Reef is almost impossible to defend.',
    2026: 'Robots touching their Tower are protected in the last 30 seconds.'
  };
  const TEAM_UPDATES = {
    any: ['The latest Team Update fixes a typo in a rule nobody had read. Three teams are disappointed.'],
    2022: ['Team Update: cargo that bounces out of the Upper Hub does not count, however beautiful the shot.', 'Team Update: the Launch Pad protection rule gets a new diagram. It is still a very small piece of plastic.', 'Team Update: Traversal Rung contact rules clarified. Swinging robots, please mind your neighbours.'],
    2023: ['Team Update: cone orientation at the Double Substation clarified. Tipped cones remain everyone\'s problem.', 'Team Update: a robot is Docked only if it is fully supported by the Charge Station. No, the bumper on the ramp does not count.', 'Team Update: Links can be shared with the Co-op Grid. Spreadsheets everywhere are updated.'],
    2024: ['Team Update: notes damaged in play will be replaced "as soon as practical". Ring-shaped foam has never been so popular.', 'Team Update: Amplification lasts 10 seconds, and the timer starts when the human player presses the button. Human players everywhere are practicing.', 'Team Update: Stage contact rules for the last 20 seconds clarified. Do not touch robots that are Onstage.'],
    2025: ['Team Update: coral that falls off a branch and lands in the trough still counts as Level 1.', 'Team Update: algae removal from the Reef is legal; algae pinning against the Reef is not.', 'Team Update: Cage contact rules for the last 20 seconds clarified.'],
    2026: ['Team Update: fuel scored into an inactive Hub does not count, however hard you shoot it.', 'Team Update: Trench clearance confirmed. Tall robots, plan your route.', 'Team Update: Tower contact rules for the last 30 seconds clarified.']
  };

  // =================================================================
  // Team chatter (flavor only)
  // =================================================================
  const CHAT = [
    // v2.4 / v2.5 features
    { id: 'c5tech', req: S => inSeason(S) && G.Career.driveTeam(S).tech, title: 'The checklist', body: S => first(G.Career.driveTeam(S).tech.name) + ' laminated a pre-match checklist. Item 7: "Is the joystick plugged in?" Item 8: "No, really."' },
    { id: 'c5space', req: S => G.Shop.spaceFree(S) < 160 && G.Shop.spaceUsed(S) > 300, title: 'The tape measure', body: S => student(S) + ' measured the shop twice to prove the next machine "technically fits". It fits if nobody opens the door.' },
    { id: 'c5weld', req: S => G.Shop.lvl(S, 'weld') > 0, title: 'First welds', body: S => student(S) + '\'s first weld looks like a caterpillar. The second one held ' + mentor(S) + ' standing on it.' },
    { id: 'c5bench', req: S => G.Shop.lvl(S, 'ebench') > 0, title: 'Solder smell', body: S => 'The electronics bench has a rule now: label every connector. ' + student(S) + ' labelled the label maker.' },
    { id: 'c5meet', req: S => G.Shop.lvl(S, 'meeting') > 0, title: 'The whiteboard', body: S => 'The meeting room has a whiteboard. It took one day to fill it with strategy and one more for somebody to draw the robot wearing a hat.' },
    { id: 'c5ftc', req: S => G.Career.ownTeams(S) > 0, title: 'Little siblings', body: S => 'The FTC kids down the hall beat ' + driver(S) + ' in a driving contest on the small field. A rematch is scheduled. Trash talk is ongoing.' },
    { id: 'c5shake', req: S => inSeason(S) && S.elecShake > 0.5, title: 'Brownout hunt', body: S => 'The electrical team found a loose crimp on the second robot before it ever reached the competition robot. They framed it.' },
    { id: 'c5def', req: S => inSeason(S) && S.defDrill > 0.5, title: 'Play meaner', body: S => driver(S) + ' asked whoever drives the second robot to "play meaner". They have since regretted asking.' },
    { id: 'c5old', req: S => off(S) && S.history.length && S.month <= 4, title: 'Two seasons of notes', body: S => mentor(S) + ' read the new rules and said "well, there go two seasons of notes". Then opened a new notebook and wrote the date on the first page.' },
    { id: 'c5hoard', req: S => S.year === 2026 && S.phase === 'comp', title: 'Fuel everywhere', body: S => student(S) + ' counted the fuel in your zone after practice: 41. Then counted again: 43. Nobody knows where the other two came from.' },
    { id: 'c5hof', req: S => S.hallOfFame != null, title: 'Hall of Fame', body: S => 'The Hall of Fame banner hangs highest of all. New members are shown it on their first day, before the bathrooms.' },
    { id: 'c5grant', req: S => S.schoolGrant > 0, title: 'The grant', body: () => 'The school board\'s equipment grant letter is taped to the shop door. Nobody can agree what to spend it on. There is a spreadsheet. There are factions.' },
    { id: 'c5wait', req: S => S.studentsCount >= 95, title: 'Standing room only', body: S => 'The kickoff meeting needed the cafeteria. ' + student(S) + ' counted heads and gave up at ninety.' },
    { id: 'name', req: S => S.phase === 'build' && S.robot && !S.season.robotName, title: 'Robot naming vote',
      body: S => { const n = R().shuffle(ROBOT_NAMES.slice()); S.season.robotName = n[0]; return 'The team voted on a name for the ' + G.Career.calYear(S) + ' robot. Winner: "' + n[0] + '". Runner-up: "' + n[1] + '". ' + student(S) + ' is demanding a recount.'; } },
    { id: 'eyes', title: 'Googly eyes proposal', body: S => student(S) + ' has proposed adding googly eyes to the robot. The motion passed 14–3. The design mentor abstained.' },
    { id: 'cad2am', title: 'Late-night CAD', body: S => student(S) + ' was spotted doing CAD at 2 a.m. again. ' + mentor(S) + ' has confiscated their laptop charger "for their own good".' },
    { id: 'zip', title: 'The zip tie talk', body: S => mentor(S) + ' gave a 40-minute talk on why zip ties are not a structural fastener. The robot currently contains ' + R().int(140, 260) + ' zip ties.' },
    { id: 'label', title: 'Label maker', body: S => mentor(S) + ' bought a label maker. Everything in the shop is now labeled, including the label maker.' },
    { id: 'snack', title: 'Snack report', body: S => 'A parent brought ' + R().pick(FOODS) + '. Productivity dropped briefly, then soared.' },
    { id: 'safety', title: 'Safety first', body: S => 'Safety captain ' + student(S) + ' handed out ' + R().int(14, 40) + ' safety-glasses reminders today. A new team record.' },
    { id: 'plush', title: 'New pit mascot', body: S => 'Someone brought a ' + R().pick(PLUSH) + ' plushie to the shop. It is now the official pit mascot and has its own badge.' },
    { id: 'parents', title: 'Parent group chat', body: () => 'The parent group chat has ' + R().int(120, 400) + ' unread messages. Most are about carpools. One is a lasagna recipe.' },
    { id: 'drive', req: S => S.robot && inSeason(S), title: 'Drive practice', body: S => 'Drive practice: ' + driver(S) + ' set a personal-best cycle time and took a victory lap around the shop. The lap was slower.' },
    { id: 'revealR', req: S => inSeason(S), title: 'Rival reveal video', body: S => 'Team ' + rival(S) + ' posted their robot reveal. Your students have watched it ' + R().int(20, 90) + ' times and are "definitely not worried".' },
    { id: 'reveal', req: S => S.robot && inSeason(S), title: 'Reveal video stats', body: S => 'Your robot reveal reached ' + R().int(2, 40) + ',' + R().int(100, 999) + ' views. Top comment: "' + R().pick(['how is it that fast', 'clean wiring, respect', 'the bumpers are perfect', 'my grandma could drive that (compliment)', 'is that legal??', 'need the CAD please']) + '"' },
    { id: 'scale', req: S => S.robot && inSeason(S) && G.Robot.weight(S) >= 115, title: 'The scale', body: S => 'The robot weighs ' + G.Robot.weight(S) + ' lb. The team now refers to the scale as "the enemy".' },
    { id: 'swear', req: S => S.money < 5000, title: 'Swear jar', body: S => 'Treasurer ' + student(S) + ' started a swear jar. It is already the team\'s fourth-largest sponsor.' },
    { id: 'debt', req: S => S.money < 0, title: 'The red number', body: S => 'Someone wrote the team balance on the whiteboard in red marker. ' + student(S) + ' added "temporary!!" underneath. ' + mentor(S) + ' added a third exclamation mark.' },
    { id: 'quiet', req: S => S.morale < 45, title: 'Quiet shop', body: () => 'The shop has been quiet lately. Someone made a playlist called "Robot Blues". It has 41 songs.' },
    { id: 'chant', req: S => S.morale > 80, title: 'Team chant', body: () => 'Spirits are high. The team chant has gained a second verse and an optional dance.' },
    { id: 'swerve', req: S => concept(S, 'drive') === 'swerve', title: 'Swerve noises', body: S => 'The swerve modules are making a new noise. ' + student(S) + ' calls it "the song of my people".' },
    { id: 'turret', req: S => concept(S, 'scorer') === 'turret', title: 'Turret tracking', body: S => student(S) + ' spent an hour making the turret track ' + mentor(S) + '\'s face. It works disturbingly well.' },
    { id: 'elev', req: S => ['elev', 'elevw', 'amptrap'].includes(concept(S, 'scorer')) || concept(S, 'amp') === 'amptrap', title: 'Elevator test', body: () => 'Elevator test: it went up very fast and came down even faster. Nobody was hurt. One ceiling tile was.' },
    { id: 'climb', req: S => S.robot && S.robot.subs.endgame && S.robot.subs.endgame.ver, title: 'Climb test', body: () => 'The first full climb on the practice rig worked. The team celebrated like it was a playoff win.' },
    // results, awards, reputation
    { id: 'banner', req: S => S.season && S.season.events.some(e => e.won), title: 'The banner', body: S => 'The new blue banner is hanging in the shop. ' + student(S) + ' says good morning to it every day.' },
    { id: 'loss', req: S => lastEv(S) && !lastEv(S).playoffs, title: 'Fix list', body: S => student(S) + ' pinned a "never again" list on the wall after ' + lastEv(S).name + '. Item one is "check the battery". Item two is also "check the battery".' },
    { id: 'pick', req: S => lastEv(S) && lastEv(S).role === '2nd pick', title: 'The second pick', body: S => 'Being picked last at ' + lastEv(S).name + ' has become a team motto: "Second pick, first in our hearts."' },
    { id: 'capt', req: S => lastEv(S) && lastEv(S).role === 'Captain', title: 'Alliance captain', body: S => driver(S) + ' still has the alliance selection sign from ' + lastEv(S).name + '. It is now laminated.' },
    { id: 'impactP', req: S => inSeason(S) && S.projects.some(p => p.type === 'impact'), title: 'Impact practice', body: S => student(S) + ' and ' + student2(S, '') + ' are rehearsing the Impact presentation in the hallway. The janitor can now recite it.' },
    { id: 'awardC', req: S => S.season && S.season.awards.length, title: 'Award shelf', body: S => 'The award shelf needed a second bracket. ' + mentor(S) + ' made one on the CNC. It is overbuilt.' },
    { id: 'fans', req: S => S.rep >= 65, title: 'Fan mail', body: S => 'A kid from the elementary school sent the team a drawing of your robot. It has wings. ' + student(S) + ' wants to add wings.' },
    { id: 'joinAsk', req: S => S.rep >= 55 && off(S), title: 'Recruits', body: () => 'Three middle schoolers asked when they are old enough to join. The answer was "soon", followed by a robot demo.' },
    // mentors
    { id: 'mDonut', req: S => S.mentors.length, title: 'Donut Friday', body: S => mentor(S) + ' brought two dozen donuts. The programmers took eleven of them before anyone noticed.' },
    { id: 'mArgue', req: S => S.mentors.length >= 2, title: 'Mentor debate', body: S => { const a = R().pick(S.mentors), b = R().pick(S.mentors.filter(x => x !== a)); return a.name + ' and ' + b.name + ' have been arguing about tabs versus spaces for twenty minutes. The students are taking bets.'; } },
    { id: 'mCoach', req: S => mentorOf(S, 'coach'), title: 'Drive coach drills', body: S => mentorOf(S, 'coach').name + ' set up cones in the parking lot and timed every drill. ' + driver(S) + ' now dreams in cycle times.' },
    { id: 'mProg', req: S => mentorOf(S, 'prog'), title: 'Code review', body: S => mentorOf(S, 'prog').name + ' reviewed the robot code and left ' + R().int(30, 120) + ' comments. The most common was "why?"' },
    { id: 'mFab', req: S => mentorOf(S, 'fab'), title: 'Machine shop rules', body: S => mentorOf(S, 'fab').name + ' laminated the machine shop rules and hung them at eye level. Rule 7 is just "no".' },
    { id: 'mBiz', req: S => mentorOf(S, 'biz'), title: 'Sponsor deck', body: S => mentorOf(S, 'biz').name + ' rewrote the sponsor pitch deck. It now has a slide with a graph that goes up and to the right.' },
    { id: 'mStrat', req: S => mentorOf(S, 'strat'), title: 'Scouting app', body: S => mentorOf(S, 'strat').name + ' and the scouts rebuilt the scouting app. It now has a dark mode and a button that just says "defense?"' },
    // school
    { id: 'cafe', title: 'Cafeteria', body: S => 'The cafeteria has named a sandwich after the team. It is mostly bread, like the early prototypes.' },
    { id: 'vacuum', title: 'Shop vacuum', body: S => 'The chemistry teacher would like the shop vacuum back. It has been "borrowed" since ' + R().pick(['September', 'last year', 'before anyone can remember']) + '.' },
    { id: 'tests', req: S => S.phase === 'off' && ['May', 'Dec'].includes(month(S)), title: 'Exam season', body: () => 'Exam season. The shop is quiet and the whiteboard says "STUDY. Then robots."' },
    { id: 'bus', req: S => S.phase === 'comp', title: 'Bus playlist', body: S => 'The bus playlist for the next event is ' + R().int(4, 9) + ' hours long. ' + student(S) + ' has veto power and is using it.' },
    { id: 'hotel', req: S => S.phase === 'comp', title: 'Hotel rules', body: S => mentor(S) + ' has written the hotel rules for the trip. Rule 1: no robot parts in the pool.' },
    // parts and robot state
    { id: 'spares0', req: S => S.robot && S.parts.spares <= 1, title: 'Empty bins', body: S => 'The spare parts bins are nearly empty. ' + student(S) + ' labeled one "hope".' },
    { id: 'cond', req: S => S.robot && G.Robot.condAvg(S) < 70, title: 'Held together', body: S => 'The robot is currently held together by ' + R().pick(['three hose clamps and optimism', 'a lot of zip ties', 'sheer willpower']) + '. A Systems Shakedown at the next event would rebuild it.' },
    { id: 'battery', req: S => S.robot && inSeason(S), title: 'Battery cart', body: S => student(S) + ' built a battery cart with labelled slots and charge timers. It is the best-organized thing the team owns.' },
    { id: 'bumpers', req: S => S.phase === 'build' && S.week >= 4, title: 'Bumper night', body: S => 'Bumper night: ' + R().int(3, 9) + ' students, two staple guns and one sewing machine that is older than the school.' },
    // game-specific
    { id: 'g22a', req: S => S.year === 2022 && inSeason(S), title: 'Cargo escape', body: () => 'A cargo ball was launched over the practice net and into the hallway. The principal returned it personally.' },
    { id: 'g22b', req: S => S.year === 2022 && inSeason(S), title: 'Traversal debate', body: S => student(S) + ' insists the robot can do Traversal "if we believe hard enough".' },
    { id: 'g22c', req: S => S.year === 2022 && inSeason(S), title: 'Wrong color', body: S => driver(S) + ' intaked an opponent\'s cargo at practice and ejected it so fast it hit the ceiling. The team calls it "the rejection".' },
    { id: 'g23a', req: S => S.year === 2023 && inSeason(S), title: 'Cones vs. cubes', body: () => 'The cone-versus-cube debate has split the team into two camps. They now sit at opposite ends of the shop.' },
    { id: 'g23b', req: S => S.year === 2023 && inSeason(S), title: 'Charge station', body: S => 'The practice charge station has become ' + student(S) + '\'s favorite place to eat lunch. It balances perfectly when they do.' },
    { id: 'g23c', req: S => S.year === 2023 && inSeason(S), title: 'Tipped cone', body: S => 'A tipped cone has been sitting on the practice field for a week. Nobody can pick it up. It has become a landmark.' },
    { id: 'g24a', req: S => S.year === 2024 && inSeason(S), title: 'Note in the ceiling', body: () => 'A note got stuck in the ceiling tiles. It has been named "Steve" and will not be removed.' },
    { id: 'g24b', req: S => S.year === 2024 && inSeason(S), title: 'Amp anxiety', body: S => student(S) + ' yells "AMPLIFY!" every time anyone touches a button. Including the microwave.' },
    { id: 'g24c', req: S => S.year === 2024 && inSeason(S), title: 'Note feeding', body: S => student(S) + ' has been lobbing notes across the shop "to practice feeding". ' + mentor(S) + ' has been lobbing them back.' },
    { id: 'g25a', req: S => S.year === 2025 && inSeason(S), title: 'Coral dust', body: () => 'PVC dust is everywhere. The custodian has opinions and has shared them.' },
    { id: 'g25b', req: S => S.year === 2025 && inSeason(S), title: 'Algae count', body: () => 'Algae (the ball) in the shop: 37. Algae (the real kind) in the team fish tank: also too many.' },
    { id: 'g25c', req: S => S.year === 2025 && inSeason(S), title: 'Deep cage', body: S => student(S) + ' timed the deep climb on the practice cage: ' + R().int(4, 9) + ' seconds. They have the stopwatch photo as their phone background.' },
    { id: 'g26a', req: S => S.year === 2026 && inSeason(S), title: 'Fuel everywhere', body: () => 'Fuel balls found so far: backpacks (4), the microwave (1), the principal\'s office (2), unaccounted for (lots).' },
    { id: 'g26b', req: S => S.year === 2026 && inSeason(S), title: 'Hub shift drills', body: S => student(S) + ' now announces "SHIFT CHANGE!" every 25 seconds during practice. Even during lunch.' },
    { id: 'g26c', req: S => S.year === 2026 && inSeason(S), title: 'Trench clearance', body: S => 'The robot cleared the practice trench by ' + R().int(1, 9) + ' millimetres. ' + mentor(S) + ' asked for "a little more margin, please".' },
    // calendar
    { id: 'summer', req: S => off(S) && ['Jun', 'Jul', 'Aug'].includes(month(S)), title: 'Summer shop day', body: () => 'Summer shop day: a few students built a machine that makes smoothies. It is the most reliable mechanism you own.' },
    { id: 'alumV', req: S => off(S) && ['Jun', 'Jul', 'Aug'].includes(month(S)), title: 'Alumni visit', body: () => 'An alum visited from college and said college robotics is "the same chaos, just with a bigger budget".' },
    { id: 'camp', req: S => off(S) && ['Jun', 'Jul'].includes(month(S)), title: 'Summer camp', body: S => student(S) + ' is teaching a summer robotics camp for fifth graders. They have been asked "can it shoot lasers" 40 times.' },
    { id: 'fair', req: S => off(S) && month(S) === 'Sep', title: 'Club fair', body: () => 'Club fair: the robot drove into the cafeteria and recruited three freshmen and one confused chemistry teacher.' },
    { id: 'fresh', req: S => off(S) && ['Sep', 'Oct'].includes(month(S)), title: 'Freshman training', body: S => 'Freshman training week: ' + student(S) + ' taught the new members how to use a drill press, then how to use it safely, then how to use it safely again.' },
    { id: 'hallo', req: S => off(S) && month(S) === 'Oct', title: 'Halloween costumes', body: S => student(S) + ' came to the meeting dressed as a swerve module. Nobody understood it except the programmers.' },
    { id: 'thanks', req: S => off(S) && month(S) === 'Nov', title: 'Thankful wall', body: () => 'The "thankful" wall in the shop has 63 sticky notes. Eleven are about the 3D printer.' },
    { id: 'holiday', req: S => off(S) && month(S) === 'Dec', title: 'Holiday party', body: () => 'Holiday gift exchange: nine of the twelve gifts were hex key sets. Everyone was happy.' },
    { id: 'predict', req: S => off(S) && month(S) === 'Dec', title: 'Kickoff predictions', body: S => student(S) + '\'s prediction for next season\'s game: "robots throw robots". The pool is open at $1 a guess.' },
    { id: 'look', req: S => off(S) && S.history.length > 0, title: 'Looking back', body: S => { const h = S.history[S.history.length - 1]; return 'Someone made a highlight video of the ' + (h.cy || G.Career.calYear(S, h.year)) + ' season. The comment section is entirely parents, and it is wonderful.'; } },
    { id: 'offbot', req: S => off(S) && S.robot, title: 'Offseason projects', body: S => student(S) + ' wants to put the old robot\'s shooter on a go-kart "for science". ' + mentor(S) + ' has not said no yet.' }
  ];
  // chatter the classic games bring along: [title, text] with {student}, {driver} and {mentor} filled in
  Object.keys(G.Seasons).filter(k => /^\d{4}$/.test(k)).forEach(k => ((G.Seasons[k].news || {}).chatter || []).forEach((c, i) => CHAT.push({ id: 'g' + k + '_' + i, req: S => S.year === Number(k) && inSeason(S), title: c[0],
    body: S => c[1].replace('{student}', student(S)).replace('{driver}', driver(S)).replace('{mentor}', mentor(S)) })));

  // =================================================================
  // v2.9.3: more of the world in the inbox. None of this ever gets a pop-up: it sits in the Inbox for whoever reads it.
  //  - mid-season arguments and trends about each game and its mechanisms
  //  - what the two vendors are up to (and what they say about each other)
  //  - rumours: what people have heard ahead of the calendar's big changes. Some are worth acting on.
  //  - the second-hand market reacting to those changes
  // =================================================================
  const cal = S => !!(S.cal && S.mode === 'career');
  const cyS = S => G.Career.cy(S);       // the season being played, or the one just played
  const cyN = S => G.Career.cyNext(S);   // the season the offseason leads to
  // a sortable "when": 2018 is the 2018 season, 2018.5 the offseason after it (no calendar: null)
  const yr = S => (cal(S) ? (off(S) ? (cyN(S) || cyS(S) + 1) - 0.5 : cyS(S)) : null);
  const between = (S, a, b) => { const y = yr(S); return y != null && y >= a && y <= b; };
  const game = (S, y) => S.year === y && (S.phase === 'build' || S.phase === 'comp');
  const playing = (S, y) => S.year === y && S.phase === 'comp';
  const sold = (S, cat, v) => !!(cal(S) && G.Parts.genAt(S, cat, v) >= 1);
  const brushlessOut = S => !cal(S) || ['A', 'B'].some(v => { const p = G.Parts.cur(S, 'motor', v); return p && p.kind === 'brushless'; });
  const hasEff = S => !!(S.robot && G.Seasons.sub(S.robot.year, 'effector') && inSeason(S));
  const lvl = (S, id) => G.Shop.lvl(S, id);

  NEWS.push(
    // ---- the games: arguments and trends, a few weeks into each season
    { id: 'n16def', must: 1, w: 4, cd: 60, req: S => playing(S, 2016) && S.week >= 2, run: S => ['Mid-season argument: choose their defenses, or just get faster?', 'Scouts in ' + regName(S) + ' are split. One camp studies every opponent and picks the three defenses that hurt them most; the other says a robot that crosses anything in three seconds makes the choice pointless. Both camps agree on the audience: it always seems to vote for the defense your drivetrain likes least.'] },
    { id: 'n16low', w: 3, cd: 60, req: S => game(S, 2016) && S.week >= 3, run: S => ['Mid-season argument: low robot or tall shooter?', 'A robot that fits under the Low Bar always has one defense it can cross, and it reaches the Secret Passage boulders without a fight. A tall robot shoots over defenders from the courtyard. ' + rival(S) + ' built both in one robot, and the forum would like to see the weight sheet.'] },
    { id: 'n17shoot', must: 1, w: 5, cd: 60, req: S => playing(S, 2017) && S.week >= 2, run: S => ['Mid-season argument: is a shooter worth it?', 'Three weeks of results are in. At most events the winning alliance carried gears and climbed, and its fuel stayed on the carpet. A handful of high-volume shooters do reach 40 kPa, and they belong to teams that also never drop a gear. "We spent three weeks on a shooter that scores six points," wrote one mentor. "The rope scores fifty." The replies are not kind to shooters, with one exception: nobody wants to face a good one in the playoffs.'] },
    { id: 'n17deny', w: 3, cd: 60, req: S => playing(S, 2017) && S.week >= 3, run: S => ['Trend: tipping the other alliance\'s hoppers', 'Drive coaches have started sending a gear robot past the opponents\' hoppers in the first seconds of teleop. The fuel pours onto the carpet before a shooter can get under it, and a hopper only tips once. Shooter teams call it unsporting. Everyone else calls it Tuesday.'] },
    { id: 'n18vault', must: 1, w: 4, cd: 60, req: S => playing(S, 2018) && S.week >= 2, run: S => ['Mid-season argument: the Scale or the Vault?', 'Owning the Scale scores every second, so the fast elevators fight over it all match. The quiet alliances feed nine cubes through the Exchange, play Boost at the right moment and Levitate at the end, and win by twenty. ' + rival(S) + ' lost a final that way and has not stopped talking about it.'] },
    { id: 'n18claw', w: 3, cd: 60, req: S => game(S, 2018) && S.week >= 3, run: S => ['Trend: cubes that fly', 'The pinch claws of week one are disappearing. In their place: roller claws that swallow a cube from any angle, and a few that spin fast enough to throw it onto the plate from a step back. Most of these robots have no separate intake at all. The end effector goes to the floor and does the collecting itself.'] },
    { id: 'n19l3', must: 1, w: 4, cd: 60, req: S => playing(S, 2019) && S.week >= 2, run: S => ['Mid-season argument: Level 3, or one more cycle?', 'Twelve points for a Level 3 climb is four cargo, and a climber that lifts a whole robot nineteen inches costs weight and weeks. The cyclers say the time is better spent on the rocket. The climbers point at the HAB Docking ranking point and at the buddy climbers that carry a partner up for twenty-four.'] },
    { id: 'n19plate', w: 3, cd: 60, req: S => game(S, 2019) && S.week >= 3, run: S => ['Trend: hook tape against fingers', 'Half the field holds its hatch panels with a strip of hook tape and hopes. The other half has fingers that open inside the panel and let go on command. The tape is lighter and never breaks. The fingers do not leave a panel on the carpet when a placement misses, and at the top of a rocket that is the difference.'] },
    { id: 'n20meta', must: 1, w: 5, cd: 60, req: S => playing(S, 2020) && S.week >= 2, run: S => ['Mid-season argument: two shooters and a defender', 'There are only so many Power Cells, and every one you score rolls out of the other alliance\'s Loading Bay. A third shooter mostly feeds the opponents. More and more alliances send their third robot across the field instead, to sit at the mouth of the Trench Run and outside the Loading Zone. The shooters hate it, which is the point.'] },
    { id: 'n20trench', w: 3, cd: 60, req: S => game(S, 2020) && S.week >= 3, run: S => ['Mid-season argument: under the Control Panel, or over the bars?', 'A trench-height robot crosses the field where nobody may touch it, but it climbs slowly and the tunnel is one robot wide. A tall robot has to cross the steel bars under the Shield Generator, and the swerve and mecanum teams are counting what that does to their wheels. Tank drives roll over the bars and wonder what the fuss is about.'] },
    { id: 'n22turret', must: 1, w: 4, cd: 60, req: S => playing(S, 2022) && S.week >= 2, run: S => ['Mid-season argument: turret or hood?', 'A turret shoots from wherever the robot happens to be and shrugs off most defense. A hood shooter is lighter, cheaper and done two weeks sooner. The teams with turrets say the argument is over. The teams without them point at the standings, where a well-practised hood shooter is doing just fine.'] },
    { id: 'n23grip', must: 1, w: 4, cd: 60, req: S => game(S, 2023) && S.week >= 2, run: S => ['Trend: the roller gripper takes over', 'The pneumatic claws are coming off. A pair of rollers takes a cone or a cube from any angle and does not let go when the robot is hit, and the teams that put the gripper on its own wrist pick cones up however they are lying. Plenty of these robots skip the ground intake and load everything from the shelf.'] },
    { id: 'n23bal', w: 3, cd: 60, req: S => playing(S, 2023) && S.week >= 3, run: S => ['Mid-season argument: a third piece, or the Charge Station?', 'Twelve points for an engaged Charge Station in auto is more than two pieces on the top row, and it needs no arm. The top alliances do both. Everybody else has to choose, and the drive teams that practised the balance are the ones still playing on Saturday afternoon.'] },
    { id: 'n24feed', must: 1, w: 3, cd: 60, req: S => playing(S, 2024) && S.week >= 3, run: S => ['Mid-season argument: score it, or pass it?', 'The strongest alliances no longer let every robot drive the full field. One collects at the Source and lobs notes over the Stage, and the others never leave the Speaker. It looks like less work. The scores say otherwise.'] },
    { id: 'n25head', must: 1, w: 4, cd: 60, req: S => game(S, 2025) && S.week >= 2, run: S => ['Trend: the pivoting coral head', 'A gravity chute scores coral when the robot is square and still, and the robot is rarely either. Powered rollers hold the piece through a hit. The newest heads sit on their own pivot, line the coral up with the branch and flick the algae off on the way past. Most of them take coral straight from the station chute with no intake in between.'] },
    { id: 'n26climb', must: 1, w: 4, cd: 60, req: S => playing(S, 2026) && S.week >= 2, run: S => ['Mid-season argument: climb, or keep shooting?', 'Both Hubs are active for the last thirty seconds, and a good shooter scores more in that time than a Level 3 climb is worth. So the best robots stay on the ground. The climbers answer that fifty Tower points are a ranking point, and that a climb cannot be defended.'] },
    // ---- mechanisms that came in with the long career
    { id: 'n9hp', w: 3, cd: 50, req: S => S.phase === 'comp' && G.Seasons[S.year].hpLoad, run: S => ['Trend: try-outs for human player', 'This is a game where a person hands the robot every piece it scores, and the teams at the top have noticed. ' + rival(S) + ' held try-outs for human player and timed them with a stopwatch. An alliance plays with its two best, and scouts have started writing down who they are.'] },
    { id: 'n9buddy', w: 3, cd: 60, req: S => S.phase === 'comp' && [2018, 2019, 2020].includes(S.year) && S.week >= 3, run: S => ['Trend: carry a partner', 'A climber that lifts a second robot is heavy, late and hard to make reliable. It is also two climbs from one mechanism, and alliance captains have started asking about it before they ask about anything else.'] },
    { id: 'n9wcd', w: 3, cd: 60, req: S => between(S, 2016, 2019.5) && (S.phase === 'build' || off(S)), run: S => ['Trend: six wheels and a drop centre', 'Look under the robots on any Einstein field and you find the same thing: six wheels, the middle pair a few millimetres lower, on a pair of drive sets from one of the two vendors. A West Coast drive is fast, pushes hard and stays where the driver puts it. The kit chassis is cheaper and mecanum turns on the spot, and neither of them wins a pushing match.'] },
    { id: 'n9mec', w: 3, cd: 60, req: S => S.phase === 'comp' && G.Rules[S.year] && G.Rules[S.year].defense && (G.Rules[S.year].defense.eff || 0) >= 1.5, run: S => ['Ref corner: the mecanum robot in the corner', 'A question from the stands: why does the robot on roller wheels keep ending up against the wall? Because mecanum rollers have almost no sideways grip. It strafes beautifully when nobody touches it. When a defender leans on it, it goes where the defender is going.'] },
    { id: 'n9grid', w: 3, cd: 60, req: S => between(S, 2021.5, 2030) && (S.phase === 'build' || off(S)), run: S => ['Trend: robots out of a box', 'Half the robots in this year\'s reveal videos share the same pre-drilled tube and the same boxed mechanisms. Purists say they all look alike. The teams without a mill say they have a robot in week three for the first time, and that the difference shows in driver practice.'] },
    { id: 'n9deep', w: 3, cd: 40, req: S => off(S) && S.history.length && D.AREAS.some(a => G.Robot.know(S, a.id) >= 4), run: S => ['Forum watch: the experts\' problem', 'Somebody asked why the teams that knew the most about last year\'s way of doing things seem to struggle most when it changes. The top answer: "When you know one way perfectly, you have also learned a hundred habits that only work that way." The deepest know-how dates fastest, and no mentor can stop it.'] },
    { id: 'n9kb', w: 2, cd: 40, req: S => off(S) && S.equip.kb && !G.Career.kbCurrent(S) && !S.projects.some(p => p.type === 'kb'), run: S => ['A wiki nobody trusts', 'A freshman followed the wiki\'s wiring guide to the letter and wired last year\'s robot. The page was a season old. ' + mentor(S) + ' has added "update the wiki" to the whiteboard, under three older items that say the same thing.'] },
    // ---- facilities
    { id: 'n9field', w: 2, cd: 60, req: S => (off(S) || S.phase === 'build') && lvl(S, 'pfield') < 1, run: S => ['Shop talk: who has a practice field', 'A survey of the strongest teams in ' + regName(S) + ': nearly all of them have somewhere to drive against real field elements, even if it is a quarter of a field in a cafeteria. "Driver hours are the cheapest points there are," said one coach. "You just need a floor."'] },
    { id: 'n9weld', w: 2, cd: 60, req: S => off(S) && lvl(S, 'weld') < 1 && lvl(S, 'lathe') > 0, run: S => ['Shop talk: the welding table', rival(S) + ' welded its frame this year and posted the weight sheet: lighter than the bolted one and stiffer. Their mentor adds that hardening and lightening a mechanism goes a good deal faster with a welder in the room.'] },
    { id: 'n9bench', w: 2, cd: 60, req: S => (off(S) || S.phase === 'build') && lvl(S, 'ebench') < 1, run: S => ['Shop talk: a bench for the wiring', 'The teams whose robots never brown out tend to have one thing in common: a bench where the electrical work happens, with the crimpers hung up and a tester plugged in. Parts last longer too when somebody checks them before they go on the robot.'] },
    { id: 'n9meet', w: 2, cd: 60, req: S => off(S) && lvl(S, 'meeting') < 1, run: S => ['Shop talk: a room with a door', 'Strategy meetings in a machine shop are held at a shout. Several programs in ' + regName(S) + ' have taken over a classroom next door: a whiteboard, a screen for match video and a door that closes. Their scouts say alliance selection has never gone so calmly.'] },
    { id: 'n9space', w: 2, cd: 60, req: S => off(S) && G.Shop.spaceFree(S) < 120, run: S => ['Shop talk: out of floor', 'A machine only helps if it fits. Programs that outgrow their room go to the school board with results and a floor plan, and the ones with strong Program Support come back with a bigger room. The others stack things.'] },
    // ---- the vendors, and what they say about each other
    { id: 'v9price', w: 3, cd: 80, req: S => between(S, 2015.5, 2018.5), run: S => ['Vendor watch: the price list war', 'Lumen Robotics now prints Sterling Motion\'s price next to its own on every product page. Sterling\'s regional sales director was asked about it at a trade show. "We do not compete on price," he said. "We compete on whether it is still running in April." Lumen has put that on the page too.'] },
    { id: 'v9booth', w: 3, cd: 80, req: S => between(S, 2016, 2019) && S.phase === 'comp', run: S => ['Vendor watch: booth neighbours', 'The organisers of a big regional put the Sterling booth (carpet, espresso machine, four people in blazers) next to Lumen\'s folding table. By Saturday Lumen\'s founder was drinking Sterling\'s coffee and a Sterling engineer had borrowed Lumen\'s crimping tool. Neither company will confirm this.'] },
    { id: 'v9six', w: 2, cd: 80, req: S => between(S, 2016, 2019.5) && S.phase !== 'comp', run: S => ['Vendor watch: six wheels, two philosophies', 'Sterling\'s West Coast drive set has hardened gears, two speeds and a price to match. Lumen\'s has belts, sealed bearings and fits in one box. A forum poll asked which was better and got 600 replies, most of them photographs of broken chain.'] },
    { id: 'v9toy', w: 4, cd: 80, req: S => between(S, 2018.5, 2019) && sold(S, 'motor', 'B') && brushlessOut(S), run: S => ['Vendor watch: "a toy for hobbyists"', 'Lumen has printed the Sterling sales director\'s verdict on its new motor across the front of a T-shirt, and its whole staff wears one at every event. Sterling declined to comment. A Sterling engineer was seen buying a shirt.'] },
    { id: 'v9dyno', w: 3, cd: 80, req: S => between(S, 2019, 2019) && S.phase === 'comp', run: S => ['Vendor watch: the dyno video', 'Lumen posted a test-bench video of its brushless motor beside "a leading brushed motor" with tape over the label. The tape does not cover much. Sterling\'s lawyers sent a letter, and Lumen has framed it above the test bench.'] },
    { id: 'v9plant', w: 4, cd: 80, req: S => between(S, 2019.5, 2020) && G.Parts.premium(S) === 'A', run: S => ['Vendor watch: Lumen sends a plant', 'When Apex Motion opened its doors, a plant arrived from Lumen Robotics with a card: "Welcome. Please make the connectors as good as you say. We never managed it." Apex\'s founder sent back a box of latching connectors and a note: "Fit these. No charge."'] },
    { id: 'v9cut', w: 3, cd: 80, req: S => between(S, 2019.5, 2020.5) && G.Parts.premium(S) === 'A', run: S => ['Vendor watch: a price cut, timed to the minute', 'Lumen lowered the price of its brushless motor at the exact minute Apex\'s launch stream began. Apex\'s founder was asked about it on stage. "Good," she said. "Now nobody has an excuse to run brushed."'] },
    { id: 'v9plate', w: 2, cd: 80, req: S => between(S, 2020, 2030) && G.Parts.premium(S) === 'A', run: S => ['Vendor watch: the adapter plate', student(S) + ' drew a plate that mounts an Apex hub on Lumen\'s hole pattern and posted the file. Both vendors linked to it within the hour, each explaining that it proved their pattern was the standard.'] },
    { id: 'v9fools', w: 3, cd: 40, req: S => between(S, 2020, 2030) && S.phase === 'comp' && S.week >= 4 && S.week <= 5 && G.Parts.premium(S) === 'A', run: S => ['Vendor watch: the first of April', R().pick(['Lumen announced the Ion Zero, "a motor with no wires at all". Apex announced premium zip ties, individually serialised. Three hundred teams tried to order the zip ties.', 'Apex announced a swerve module that drives itself to the pits for maintenance. Lumen announced a module that "comes pre-broken, to save you time". Both order pages took real orders for an hour.', 'Lumen swapped its logo for Apex\'s for a day. Apex changed all its prices to Lumen\'s for one minute, and a treasurer somewhere got very lucky.'])] },
    { id: 'v9panel', w: 3, cd: 80, req: S => between(S, 2021.5, 2030) && off(S) && ['Jun', 'Jul', 'Aug'].includes(month(S)), run: S => ['Vendor watch: two founders, one microphone', 'The founders of Apex and Lumen shared a stage at a summer conference. Asked what each would steal from the other, Apex\'s founder said "their prices" and Lumen\'s said "her list". They were then asked what is coming next, and both looked at the ceiling.'] },
    { id: 'v9recall', w: 2, cd: 80, req: S => between(S, 2022, 2030) && S.phase === 'build' && G.Parts.premium(S) === 'A', run: S => ['Vendor watch: a recall, handled', 'Apex found a bad batch of encoder cables and had replacements on doorsteps the next morning, each with a handwritten apology. Lumen\'s account replied "Respect", and then reminded everyone that its cable costs half as much.'] },
    { id: 'v9wars', w: 3, cd: 80, req: S => sold(S, 'swerve', 'A') && sold(S, 'swerve', 'B'), run: S => ['Vendor watch: module wars', 'Apex posted a video of its swerve module drifting sideways for half a minute in slow motion. Lumen answered with its own module being driven off a kerb forty times in a car park. Both videos end with the same sentence: "Available now."'] },
    { id: 'v9rookie', w: 2, cd: 80, req: S => between(S, 2019.5, 2030) && off(S) && G.Parts.premium(S) === 'A', run: S => ['Vendor watch: boxes for rookies', 'Both vendors now send every rookie team a starter box. Lumen\'s holds a motor and a sticker sheet. Apex\'s holds a torque wrench and a card that says "Use it". Veteran teams have asked, without much hope, whether they can be rookies again.'] },
    { id: 'v9blame', w: 2, cd: 80, req: S => between(S, 2022, 2030) && S.phase === 'build' && S.week >= 2 && G.Parts.premium(S) === 'A', run: S => ['Vendor watch: who has the magnets?', 'Motors are back-ordered again. Apex blames a strike at the port. Lumen blames Apex, for buying every magnet on the continent in November. The teams that stocked up before Kickoff are saying nothing and building robots.'] },
    { id: 'v9stick', w: 2, cd: 80, req: S => cal(S) && S.phase === 'comp' && G.Parts.loyalOn(S), run: S => ['Vendor watch: counting stickers', 'Vendor reps walk the pits at every event and write down whose parts are on which robot. A team that ran one vendor\'s electronics for years got a letter and a crate. A team that ran both got two polite phone calls in the same afternoon.'] }
  );

  CHAT.push(
    { id: 'c9eff1', req: S => hasEff(S) && S.robot.subs.effector && S.robot.subs.effector.ver, title: 'Grip test', body: S => student(S) + ' tests the end effector by trying to pull the game piece out of it by hand. Current score: end effector ' + R().int(3, 9) + ', ' + student2(S, '') + ' ' + R().int(0, 2) + '.' },
    { id: 'c9eff2', req: S => hasEff(S) && S.robot.subs.intake && !S.robot.subs.intake.ver && S.robot.subs.effector.ver, title: 'No intake', body: S => 'A visitor asked where the intake is. ' + student(S) + ' pointed at the end effector and said "that is the intake". The visitor asked what picks things up, then. This went on for some time.' },
    { id: 'c9eff3', req: S => hasEff(S) && S.phase === 'build' && !S.robot.subs.effector.ver, title: 'Half a robot', body: S => 'The lift goes up and down beautifully. There is nothing on the end of it. ' + mentor(S) + ' has started calling it "the flagpole".' },
    { id: 'c9wcd', req: S => ['wcd', 'wcd8'].includes(concept(S, 'drive')), title: 'Drop centre', body: S => student(S) + ' measured the centre wheel drop with a feeler gauge, twice, and announced that the robot "turns on purpose now".' },
    { id: 'c9mec', req: S => concept(S, 'drive') === 'mec' && inSeason(S), title: 'Sideways', body: S => driver(S) + ' strafed the whole length of the shop without turning once. Then ' + mentor(S) + ' leaned on the bumper with one hand, and the robot left.' },
    { id: 'c9grid', req: S => G.Parts.count(S, 'kFrame') > 0, title: 'One hole pattern', body: S => student(S) + ' bolted two pieces of GridTube together, then a third, and has not stopped. There is now a chair. Nobody asked for a chair.' },
    { id: 'c9kit', req: S => cal(S) && between(S, 2021.5, 2030) && inSeason(S), title: 'Out of the box', body: S => 'The new kit went together in an afternoon. ' + mentor(S) + ' looked at it for a long time and said, to nobody, "I used to machine those."' },
    { id: 'c9nokit', req: S => cal(S) && between(S, 2015.5, 2021) && S.phase === 'build', title: 'Chips everywhere', body: S => 'Every bracket on this robot started as a flat plate and a drawing. ' + student(S) + ' has aluminium chips in both shoes and one in a sandwich.' },
    { id: 'c9kb', req: S => S.equip.kb && G.Career.kbCurrent(S), title: 'The wiki', body: S => student(S) + ' updated the wiki page on wiring and added a photo of what not to do. It is a photo of last year\'s robot.' },
    { id: 'c9rum', req: S => cal(S) && off(S), title: 'A theory', body: S => student(S) + ' has a theory about what the vendors are hiding this year, with a diagram. ' + student2(S, '') + ' has a different theory. Neither of them reads the actual news in the inbox.' },
    { id: 'c9used', req: S => cal(S) && S.inv && D.PART_CATS.some(c => G.Parts.items(S, c.id).some(it => G.Parts.usedFactor(S, G.Parts.prod(it.p)) < 0.6)), title: 'The old shelf', body: S => 'There is a shelf at the back with parts nobody will buy any more. ' + mentor(S) + ' calls it "the museum". ' + student(S) + ' calls it "spares".' },
    { id: 'c9undo', req: S => off(S) && ['Oct', 'Nov', 'Dec'].includes(month(S)), title: 'Registration night', body: S => 'Registration opened at noon. By one o\'clock ' + mentor(S) + ' had signed up for an event, checked the travel budget, and signed back out again.' },
    { id: 'c9hp', req: S => S.phase === 'comp' && G.Seasons[S.year].hpLoad, title: 'Human player practice', body: S => 'The human player has been feeding game pieces to a cardboard box with a slot in it for an hour. The box has not dropped one.' },
    { id: 'c9bag', req: S => cal(S) && G.Era.of(S).bag && S.phase === 'build' && S.week >= 5, title: 'The bag', body: S => 'Somebody bought the bag early this year. It sits folded on the shelf, and people have stopped making eye contact with it.' },
    { id: 'c9brush', req: S => cal(S) && !brushlessOut(S) && inSeason(S), title: 'That smell', body: S => 'A drive motor got hot enough at practice to smell like a toaster. ' + student(S) + ' wrote "let it rest" on it in marker.' },
    { id: 'c9deep', req: S => off(S) && D.AREAS.some(a => G.Robot.know(S, a.id) >= 4), title: 'The way we do it', body: S => mentor(S) + ' explained to a new member how the team builds its best mechanism, and finished with "and that is how it is done". ' + student(S) + ' asked what happens if the rules change. There was a pause.' }
  );

  // ---- Rumours (calendar careers). cy: the season it belongs to. ph 'build'/'comp': told in weeks at[0]..at[1] of that
  // season; ph 'off': in months at[0]..at[1] (0 = May … 7 = Dec) of the offseason BEFORE that season. Each is told once.
  const RUMORS = [
    { id: 'r_vis1', cy: 2017, ph: 'comp', at: [3, 6], title: 'Heard in the pits: a small black box', body: 'Two former drive-team programmers have been walking the pits at the late regionals with a small black box and a green ring light. They will not say what it is. They did ask three teams how many hours they spent on vision this year, and wrote the answers down.' },
    { id: 'r_vis2', cy: 2018, ph: 'off', at: [1, 3], title: 'Forum whispers: the waiting list', body: 'A sign-up form is going round for "a camera that does the vision for you". It has no price and no date, and 400 names. A programmer who spent last summer on a home-made system has posted one word under it: "Typical." Teams about to start a vision project of their own are wondering whether the autumn will make it cheaper.' },
    { id: 'r_bl1', cy: 2018, ph: 'build', at: [3, 6], title: 'Trade show gossip: three wires', body: 'Somebody photographed a motor on the Lumen table at a trade show with three wires where there should be two. Lumen says it was "a display piece". The photo has been taken down twice and reposted four times.' },
    { id: 'r_bl2', cy: 2018, ph: 'comp', at: [2, 6], title: 'Heard in the pits: Lumen is not restocking', body: 'A vendor rep let slip that Lumen has stopped re-ordering its brushed motors from the factory "until the autumn". A company does that when it expects not to need them. Teams that were about to fill a shelf with motors for next year have gone quiet.' },
    { id: 'r_bl3', cy: 2019, ph: 'off', at: [0, 3], title: 'Forum whispers: what is a used motor worth?', body: 'The thread "what happens to second-hand prices if brushless is real" has reached twelve pages. The treasurers in it agree on one thing: the day a brushless motor goes on sale, a used brushed one is worth about half. A few teams have quietly listed their spares already.' },
    { id: 'r_st1', cy: 2019, ph: 'build', at: [2, 6], title: 'Vendor watch: no catalogue in the mail', body: 'For the first time in thirty years no Sterling Motion catalogue arrived before Kickoff. The company says it is "moving to digital". Its booth at the season opener was half the usual size, and the espresso machine was gone.' },
    { id: 'r_st2', cy: 2019, ph: 'comp', at: [2, 6], title: 'Heard in the pits: the phone rings out', body: 'Two of Sterling\'s regional sales reps have new jobs and nobody has replaced them. A mentor who has ordered from them for twenty years says the phone now rings out. Parts from a company in trouble keep working. They get harder to sell on, and now and then much cheaper to buy, right at the end.' },
    { id: 'r_bag', cy: 2019, ph: 'comp', at: [3, 6], title: 'Forum whispers: question seven', body: 'A survey went to every lead mentor this week. Question seven: "If Stop Build Day did not exist, would your team still build a second robot?" Nobody sends that question for fun. Teams planning to spend next season\'s budget on a full second robot are reading it twice.' },
    { id: 'r_apex1', cy: 2020, ph: 'off', at: [1, 3], title: 'Vendor watch: lights on in the old warehouse', body: 'Somebody is renting a corner of the old Sterling warehouse. A van delivered castings there on Tuesday. The six engineers from those lunches have all changed their profiles to "working on something new", on the same day.' },
    { id: 'r_apex2', cy: 2020, ph: 'off', at: [2, 3], title: 'Forum whispers: a swerve module with a part number', body: 'A drawing is going round of a swerve module with a part number in the corner, as if somebody meant to sell it. If it is real, the hundred hours a team spends machining its own modules could be spent on something else, and a set of West Coast drive parts will not fetch what it used to.' },
    { id: 'r_virus', cy: 2020, ph: 'comp', at: [5, 6], title: 'Event notice', body: 'Two events overseas were postponed this week "as a precaution", and every team has been asked to bring hand sanitiser to the Championship. Most people expect it to be over by the summer.' },
    { id: 'r_cots1', cy: 2020, ph: 'comp', at: [1, 4], title: 'Vendor watch: three job adverts', body: 'Three parts suppliers are advertising the same job this month: "mechanism kit designer". One advert adds that the kits "must go together with hand tools, by students, at a kitchen table". Until now a kit meant an elevator, a shooter or a turret, and everything else came off a mill.' },
    { id: 'r_cots2', cy: 2022, ph: 'off', at: [2, 2], title: 'Forum whispers: one hole pattern', body: 'Photos from a supplier\'s open day show shelves of box tube, already drilled, and gussets that fit all of it. Behind them: boxes labelled ARM, INTAKE, CLIMB and GRIPPER. The sign says "this summer". A team about to spend its budget on another machine might want to see that catalogue first.' },
    { id: 'r_pivot', cy: 2022, ph: 'off', at: [2, 3], title: 'Vendor watch: the covered table', body: 'Lumen brought a table to an offseason event with a cloth over something the size of a swerve module. A student lifted the corner and was offered an internship. The word is that the price starts with a three, and that the people who used to design Lumen\'s West Coast drive sets all work on this now. Anyone about to pay full price for four premium modules has stopped to think. So has anyone hoping to sell a used set of West Coast drive parts, and anyone who meant to keep driving on them for years.' },
    { id: 'r_pneu', cy: 2022, ph: 'comp', at: [2, 6], title: 'Heard in the pits: count the compressors', body: 'A scout with too much time counted the air tanks at the last event: fewer than half the robots carry one, and most of the fast ones do not. "A small motor does it now," said one mentor, "and it never leaks." A pneumatics kit on the shelf is not getting more valuable.' },
    { id: 'r_de', cy: 2022, ph: 'comp', at: [4, 6], title: 'Forum whispers: a new bracket', body: 'An offseason event has announced "an experimental playoff format, at the request of headquarters": eight alliances, one match at a time, and nobody out before losing twice. If that is the future, a robot will play more playoff matches than it used to, with less time between them.' },
    { id: 'r_tags', cy: 2023, ph: 'off', at: [1, 4], title: 'Heard at an offseason event: paper squares', body: 'The test field at a summer event had black-and-white squares taped beside every target. A volunteer said they were "for calibration" and changed the subject. The programmers who went home and read up on them have stopped tuning their reflective-tape code. What a team knows about vision today may not be what it needs to know by Kickoff.' },
    { id: 'r_pool', cy: 2024, ph: 'comp', at: [3, 6], req: S => !S.team.home, title: 'Forum whispers: points instead of wildcards', body: 'A leaked slide shows regional teams collecting points at their two best events, with the Championship places going down a list. If it is real, a second regional stops being a luxury and becomes half of the qualification.' }
  ];
  // Every game has one argument everybody ends up having (must: 1). It is told once a season, by competition week 5.
  function seasonTalk(S) {
    if (S.phase !== 'comp') return;
    const e = NEWS.find(x => { if (!x.must || !fresh(S, x.id, x.cd)) return false; try { return x.req(S); } catch (err) { return false; } });
    if (e && (S.week >= 5 || R().chance(0.45))) runNews(S, e);
  }
  const rum = S => S.rumSeen || (S.rumSeen = {});
  const rumOn = (S, r) => !rum(S)[r.id] && (r.ph === 'off' ? off(S) && cyN(S) === r.cy && S.month >= r.at[0] && S.month <= r.at[1] : S.phase === r.ph && cyS(S) === r.cy && S.week >= r.at[0] && S.week <= r.at[1]) && (!r.req || r.req(S));
  const rumLast = (S, r) => (r.ph === 'off' ? S.month : S.week) >= r.at[1];
  function rumours(S) {
    if (!cal(S)) return;
    // a district is about to form in the team's own area: the volunteers hear it first
    if (S.phase === 'comp' && S.week >= 3 && !S.team.home) {
      const d = (D.DISTRICTS || []).find(x => x.region === S.team.region && x.from === cyN(S));
      if (d && !rum(S)['r_dist_' + d.id] && (S.week >= 6 || R().chance(0.5))) {
        rum(S)['r_dist_' + d.id] = turnNo(S);
        post(S, 'Heard at the regional: districts for the ' + d.region + '?', 'Volunteers in the ' + d.region + ' have been asked whether they could staff two-day events in school gyms next year, and a planning committee for something called the ' + d.name + ' meets next month. District play means two smaller local events on one fee and a different road to the Championship. If it happens, every team in the area will be asked to choose.', 'news');
        return;
      }
    }
    const rs = RUMORS.filter(r => rumOn(S, r));
    if (!rs.length) return;
    const due = rs.filter(x => rumLast(S, x));
    (due.length ? due : R().chance(0.6) ? [rs[0]] : []).forEach(r => { rum(S)[r.id] = turnNo(S); post(S, r.title, r.body, 'news'); });
  }
  // The second-hand market reacts to the news: one inbox line the first time each kind of part is marked down.
  // (A career that starts after a change has simply always known those prices.)
  const USED_NEWS = {
    brushed: ['Second-hand prices: brushed motors', 'With a brushless motor on sale, the classified pages filled up with brushed ones overnight. A used brushed motor now sells for about half of what it did last month.'],
    sterling: ['Second-hand prices: Sterling parts', 'Sterling Motion is gone and so is its service desk. Used Sterling parts still work, and they still sell, for about half of what they used to.'],
    wcd1: ['Second-hand prices: West Coast drive sets', 'Swerve modules can be bought now, and the first teams to switch are selling their West Coast drive sets. Used sets fetch about a fifth less than they did.'],
    wcd2: ['Second-hand prices: West Coast drive sets, again', 'Both vendors sell a swerve module, and more used West Coast drive sets are listed every week. They are down to a little over half of their old second-hand price.'],
    wcdEnd: ['Vendor watch: the last Trailhead', 'Lumen\'s warehouse shipped its last West Coast drive set this spring, to a team that ordered six "for the museum". Nobody makes one now. A West Coast drive still runs on the sets a team already owns, or on plain Drive gearboxes with less speed and less push.'],
    pneu: ['Second-hand prices: pneumatics', 'Fewer robots carry air every year, and the people selling compressors outnumber the people buying them. A used pneumatics kit is worth clearly less than it was a year ago.']
  };
  function usedNews(S) {
    if (!cal(S) || !S.inv) return;
    const cy = G.Parts.buyCy(S), P = G.Parts;
    const now = { brushed: brushlessOut(S), sterling: cy > G.Era.STERLING_LAST, wcd1: sold(S, 'swerve', 'A') || sold(S, 'swerve', 'B'), wcd2: sold(S, 'swerve', 'A') && sold(S, 'swerve', 'B'), wcdEnd: P.lineEnd(S, 'wcd', 'B') === 2, pneu: G.Era.at(cy).pneu < 0.19 };
    if (!S.usedSeen) { S.usedSeen = now; return; }
    Object.keys(now).forEach(k => {
      if (!now[k] || S.usedSeen[k]) return;
      S.usedSeen[k] = true;
      const own = k === 'brushed' ? P.items(S, 'motor').some(it => (P.prod(it.p) || {}).kind === 'brushed' && P.prod(it.p).v !== 'K') : k === 'sterling' ? D.PART_CATS.some(c => P.items(S, c.id).some(it => (P.prod(it.p) || {}).brand === 'T')) : k === 'pneu' ? P.count(S, 'pneu') > 0 : P.count(S, 'wcd') > 0;
      post(S, USED_NEWS[k][0], USED_NEWS[k][1] + (k === 'wcdEnd' ? (own ? ' You have ' + P.count(S, 'wcd') + ' on your shelves.' : '') : own ? ' You have some on your shelves (Inventory, Sell).' : ''), 'news');
    });
  }
  function post(S, title, body, kind, extra) { G.Career.inbox(S, title, body, kind, extra); }
  // weighted pick among templates that are allowed now and off cooldown; if everything is on cooldown, the stalest one
  function pickT(S, list, cd) {
    const ok = list.filter(e => { try { return !e.req || e.req(S); } catch (err) { return false; } });
    const fr = ok.filter(e => fresh(S, e.id, e.cd || cd));
    if (fr.length) return R().wpick(fr, e => e.w || 1);
    return ok.sort((a, b) => (seen(S)[a.id] || 0) - (seen(S)[b.id] || 0))[0] || null;
  }
  function runNews(S, e) {
    if (!e) return false;
    const res = e.run(S);
    if (!res) return false;
    seen(S)[e.id] = turnNo(S);
    if (res[2] && res[2].reply) res[2].until = turnNo(S); // replies are open for this turn only (a week in season, a month in the offseason)
    post(S, res[0], res[1], 'news', res[2]);
    return true;
  }
  // Called once per turn
  N.turn = function (S) {
    S.newsTurn = turnNo(S) + 1;
    // at least one news item: now and then one with an effect, otherwise a story about the FRC world or your program
    let got = false;
    if (R().chance(0.17)) got = runNews(S, pickT(S, EVENTS, 10));
    for (let k = 0; k < 4 && !got; k++) got = runNews(S, pickT(S, NEWS, 12));
    if (R().chance(0.2)) runNews(S, pickT(S, NEWS, 12));
    seasonTalk(S); // this game's big argument, once a season
    rumours(S);   // what people have heard about the changes the calendar is about to bring
    usedNews(S);  // the second-hand market, the first time it marks a kind of part down
    // one to three chatter posts
    const n = 1 + (R().chance(0.45) ? 1 : 0) + (R().chance(0.15) ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const c = pickT(S, CHAT, 16);
      if (!c) break;
      seen(S)[c.id] = turnNo(S);
      post(S, c.title, c.body(S), 'fun');
    }
  };
  N.kickoff = function (S) {
    const mf = G.Seasons[S.year].meta;
    if (mf && mf.faults) G.Career.inbox(S, 'Scouting report: what breaks this year', mf.faults + ' Expect brief comms drops at every event; clean wiring and a reliable, well-maintained robot keep them rare and short.', 'info');
    post(S, 'Kickoff watch party', R().int(18, 45) + ' students, ' + R().int(4, 12) + ' boxes of donuts and one very loud reaction when the ' + G.Seasons[S.year].name + ' field appeared on screen. ' + student(S) + ' has already sketched three robots on a napkin.', 'fun');
  };
  N.afterEvent = function (S, r) {
    if (!r) return;
    const lines = r.won ? ['The bus ride home was one long chant. ' + driver(S) + ' slept clutching the banner.', 'The group chat has posted the winning-match video 63 times. Nobody is tired of it yet.', mentor(S) + ' let the drive team ring the shop bell. It is not a bell. It is a pot and a wrench.']
      : r.playoffs ? ['The drive team got a standing ovation from the parents in the stands. ' + driver(S) + ' turned bright red.', student(S) + ' is already making a list of "things we fix before next time". It is four pages long.', 'The scouts were right about the opposing alliance. They would like everyone to remember that.']
        : ['Tough event. ' + mentor(S) + ' gave a speech about learning from it that made two people cry, one of them ' + mentor(S).split(' ')[0] + '.', 'The team agreed on three things to fix and ate an entire gas station\'s worth of snacks on the way home.', student(S) + ' spent the ride home re-watching every match and taking notes. The notes are mostly arrows.'];
    post(S, 'After ' + r.name, R().pick(lines), 'fun');
  };
})();
