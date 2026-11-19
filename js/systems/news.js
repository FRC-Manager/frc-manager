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
  const mentor = S => { const m = mentorObj(S); return m ? m.name : G.Career.leadName(S); }; // no mentors hired: the lead mentor, who is you
  const mentorOf = (S, role) => S.mentors.find(m => m.role === role) || null;
  const driver = S => { const d = G.Career.driveTeam(S).driver; return d && d.name ? first(d.name) : student(S); };
  const teamName = S => S.team.num + ' ' + S.team.name;
  const others = S => Object.values(S.teams || {}).filter(t => t.num !== S.team.num);
  const rivalT = S => {
    const ts = others(S).filter(t => t.region === S.team.region && t.str > 55);
    const pool = ts.length ? ts : others(S);
    return pool.length ? R().pick(pool) : { num: 254, name: 'Rival Robotics', str: 70 };
  };
  const rival = S => tn(rivalT(S));
  // local teams are local on the world map (G.Geo): a team within `mi` miles of yours, widening if there is none
  // the teams a message names go with it (m.teams), for the Inbox's "Show this team on the map"
  let named = [];
  const tn = t => { if (t && t.num) named.push(t.num); return t.num + ' ' + t.name; };
  const away = mi => (mi < 12 ? 'across town' : 'about ' + Math.max(15, Math.round(mi / 5) * 5) + ' miles away');
  // (3.1.2) a request from outside the team as an email to the lead mentor: hi() opens it, asMail() adds the header to
  // a NEWS item's extra (its reply stays) and an optional note on what it means in the game
  const hi = S => 'Hi ' + G.Career.leadFirst(S) + ',\n\n'; // (3.5) to the lead mentor, who is you
  const asMail = (S, from, subject, extra, note) => { const cc = G.Career.mailCc(S, from, subject); return Object.assign(extra || {}, { mail: Object.assign({ from, to: G.Career.teamAddr(S), subject }, cc ? { cc } : {}) }, note ? { note } : {}); };
  const near = (S, ok, mi) => G.Geo.localTeam(S, ok, mi) || { t: rivalT(S), mi: 0 };
  // your regional or district event this week, in competition season only (null in any other week)
  const evNow = S => { const e = S.phase === 'comp' ? G.Career.eventThisTurn(S) : null; return e && e.def && (e.def.kind === 'regional' || e.def.kind === 'dcmp') ? e.def : null; };
  // the AI teams at it (none away from events)
  const eventMates = S => { const e = evNow(S), l = e && G.World.on(S) ? e.teams || G.World.attendees(S, e) : null; return (l || []).map(n => S.teams[n]).filter(Boolean); };
  const rookie = S => { const ts = others(S).filter(t => t.str < 40 && t.region === S.team.region); const t = ts.length ? R().pick(ts) : null; return t ? tn(t) : (9000 + R().int(100, 999)) + ' the ' + R().pick(['Gearheads', 'Bolts', 'Circuit Breakers', 'Iron Owls', 'Robo Raptors']); };
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
  // demos and shows: a team with a real second robot brings that one, and the competition robot is spared
  const wearDemo = (S, lo, hi) => {
    const Rb = S.robot; if (!(Rb && Rb.bots && G.Robot.realSecond(S))) return wearRobot(S, lo, hi);
    const s = Rb.bots[G.Robot.other(Rb)].subs;
    Object.keys(s).forEach(k => { const u = s[k]; if (k !== 'soft' && u && u.ver) u.cond = Math.max(0, u.cond - R().range(lo, hi)); });
    return 0; // nothing off the competition robot
  };
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
      { text: 'Bring the robot too', req: S => S.robot && !G.Career.bagged(S), run: S => { addRep(S, 1); const w = inSeason(S) ? wearDemo(S, 2, 5) : 0; return 'The robot drove circles around the reporter and stole the show. Reputation +1' + (w ? ', robot condition slightly down from the demo.' : '.'); } },
      { text: 'Politely decline', run: () => 'You thanked them and kept the team focused on the shop.' }
    ],
    rookie: [
      { text: 'Send two students on Saturday', run: S => { addRep(S, 1); S.actHours += 8; return 'Your students helped them wire their first drivetrain. They sent a photo of it driving. Reputation +1, 8 team hours used.'; } },
      { text: 'Give them a spare part', req: S => S.parts.spares > 0, run: S => { S.parts.spares--; addRep(S, 0.5); return 'One spare gearbox is now living a better life on a rookie robot. Spare parts −1, reputation +0.5.'; } },
      { text: 'Point them to the online guides', run: () => 'You sent a list of good tutorials. They said thanks.' }
    ],
    scrimmage: [
      { text: 'Accept: bring the competition robot', req: S => S.robot && !G.Career.bagged(S), run: S => {
        S.practiceWeeks = Math.min(D.DRILL_CAP, (S.practiceWeeks || 0) + 1);
        S.lastConf = Math.min(0.9, (S.lastConf || 0) + 0.05);
        const dt = G.Career.driveTeam(S); if (dt.driver.id) G.Career.studentXP(S, dt.driver, ['drive', 'comp'], 0.6);
        S.actHours += 6;
        const c0 = G.Robot.condAvg(S); wearRobot(S, 6, 12);
        return 'Real matches against a real defender. Your drivers came home sharper (+1 week of driver practice, a little more confidence at your next event), but the robot took a beating (condition −' + Math.round(c0 - G.Robot.condAvg(S)) + '%).';
      } },
      { text: 'Send the drive team with the second robot', req: S => G.Robot.realSecond(S), run: S => { S.practiceWeeks = Math.min(D.DRILL_CAP, (S.practiceWeeks || 0) + 0.5); S.actHours += 4; return 'The practice robot took the hits. +0.5 week of driver practice, no wear on the competition robot.'; } },
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
      { text: 'Yes: run a fundraiser', run: S => { const g = R().int(250, 600); G.Career.earn(S, g, 'Parent-run fundraiser'); return 'The parents ran ' + D.word('fundraiser', S) + '. +' + U.money(g) + '.'; } },
      { text: 'Cook for build nights instead', run: S => { addMorale(S, 3); return 'Build nights now come with dinner. Morale +3.'; } }
    ],
    alumni: [
      { text: 'Invite them to talk to the team', run: S => { addMorale(S, 2); return 'Their talk on "what I wish I knew as a freshman" was a hit. Morale +2.'; } },
      { text: 'Ask them to review your design', req: S => S.robot, run: S => { addRep(S, 0.3); S.parts.spares += 1; return 'They found a weak bracket and brought a replacement from their lab. +1 spare part.'; } }
    ],
    // a vendor warns that a part will be out of stock next week: order it now, or wait (data: { pid, n })
    restock: [
      { text: (S, d) => { const p = G.Parts.prod(d.pid); return 'Order ' + d.n + ' now (' + G.U.money(d.n * G.Parts.price(S, p)) + ')'; },
        req: (S, d) => { const p = G.Parts.prod(d.pid); return !!p && G.Parts.inStock(S, d.pid) && G.Parts.buyRoom(S, d.pid) > 0 && !G.Career.afford(S, d.n * G.Parts.price(S, p)); },
        run: (S, d) => { const r = G.Parts.buy(S, d.pid, d.n); if (typeof r === 'string') return 'The order did not go through: ' + r; return 'Ordered ' + r.bought + '× ' + G.Parts.prod(d.pid).name + ' before the shelves emptied.'; } },
      { text: 'Wait and see', run: () => 'You decided to wait. Next week the shelf will be empty.' }
    ],
    tired: [
      { text: 'Give them a weekend off', run: (S, d) => { const m = S.mentors.find(x => x.id === d.m); if (m) m.morale = Math.min(100, (m.morale || 70) + 12); S.actHours += 4; return (m ? m.name : 'Your mentor') + ' came back rested. Mentor morale +12, a few team hours lost.'; } },
      { text: 'Thank them in front of the team', run: (S, d) => { const m = S.mentors.find(x => x.id === d.m); if (m) m.morale = Math.min(100, (m.morale || 70) + 5); addMorale(S, 1); return 'The team made a card. It has 31 signatures and a drawing of a robot. Mentor morale +5.'; } }
    ],
    // (3.5.1) a grant from the education office and a company of the team's city: nothing to do but apply (data: { amt, from })
    edugrant: [
      { text: 'Apply', run: (S, d) => { G.Career.earn(S, d.amt, 'Grant: ' + d.from); return 'The form took ' + R().int(3, 9) + ' minutes to fill in. ' + G.U.money(d.amt) + ' is in the team account (Finance).'; } }
    ],
    // (3.5.1) the school board would like to watch an event (data: { ev, name }): G.Career.boardReply settles it
    boardInvite: [
      { text: 'Invite the board', run: (S, d) => G.Career.boardReply(S, d, true) },
      { text: 'Not this event', run: (S, d) => G.Career.boardReply(S, d, false) }
    ],
    showcase: [
      { text: 'Do the demo', req: S => S.robot && (!G.Career.bagged(S) || G.Robot.realSecond(S)), run: S => { addRep(S, 1); S.support = U.clamp(S.support + 0.5, 0, 100); const w = inSeason(S) ? wearDemo(S, 1, 4) : 0; return 'The robot drove through the gym during the assembly. The applause was louder than for the basketball team. Reputation +1, program support +0.5' + (w ? ', a little robot wear.' : '.'); } },
      { text: 'Show the video instead', run: S => { addRep(S, 0.3); return 'The highlight video played on the big screen. Reputation +0.3.'; } }
    ]
  };
  // In season: a part that will be out of stock next week, in stock now. Something the team's robots use, or that this
  // game's robots want, picked by demand; the vendor's warning comes true (S.stockNext). peek: only check there is one.
  function stockAlert(S, peek) {
    const P = G.Parts;
    if (!S.inv || !P.inSeason(S)) return null;
    const need = S.robot ? P.need(S) : { comp: {}, prac: {} };
    const cand = P.forSale(S).filter(x => !x.kop && !x.ending && !x.closing && P.inStock(S, x.prod.id) && P.buyRoom(S, x.prod.id) > 0 && !(S.stockNext && S.stockNext[x.prod.id])).map(x => {
      const cat = x.prod.cat, uses = (need.comp[cat] || 0) + (need.prac[cat] || 0), kit = D.PART_CAT[cat].kit;
      return { x, dm: P.demand(S, x), w: P.demand(S, x) * (uses ? 2 : kit ? 1 : 0.3), uses };
    }).filter(c => c.w > 0.2);
    if (!cand.length) return null;
    if (peek) return true;
    const c = R().wpick(cand, z => z.w), p = c.x.prod, cat = p.cat;
    const n = Math.max(1, Math.min(P.buyRoom(S, p.id), { motor: 4, enc: 2, swerve: 4, pgear: 4, wcd: 2 }[cat] || 1));
    (S.stockNext = S.stockNext || {})[p.id] = 'new'; // out of stock from next week
    const who = p.v === 'C' ? 'Your usual COTS supplier' : D.VENDORS[P.brand(p)].name;
    const why = c.dm >= 0.8 ? 'Every team wants one this season.' : D.PART_CAT[cat].kit ? 'This game\'s robots use a lot of them, and the last batch sold in a day.' : 'A shipment is stuck at the port.';
    const have = P.count(S, cat);
    return { prod: p, n, text: who + ' warns that the ' + p.name + ' will be out of stock next week. ' + why + '\n\nYou have ' + have + ' ' + D.PART_CAT[cat].short.toLowerCase() + ' on the shelf' + (c.uses ? ' and your robots use ' + c.uses : '') + '. Order now, or do without until it is back.' };
  }
  function replyMsg(key, extra) {
    const data = extra && extra.data; if (extra) delete extra.data;
    return Object.assign({ reply: { key, data, opts: REPLY[key].map(o => (typeof o.text === 'function' ? '' : o.text)) } }, extra || {});
  }
  // (3.5.1) for letters written elsewhere (career.js) that take a reply: the extra fields of the Inbox message
  N.replyExtra = (S, key, extra, turns) => Object.assign(replyMsg(key, extra), { until: turnNo(S) + (turns || 0) });
  N.replyOptions = function (S, m) {
    if (!m.reply || m.replied != null) return [];
    if (m.until != null && turnNo(S) > m.until) return [];
    const dt = m.reply.data || {};
    return REPLY[m.reply.key].map((o, i) => ({ i, text: typeof o.text === 'function' ? o.text(S, dt) : o.text, ok: !o.req || o.req(S, dt) }));
  };
  N.reply = function (S, id, i) {
    const m = S.inbox.find(x => x.id === id);
    if (!m || !m.reply || m.replied != null) return null;
    const o = REPLY[m.reply.key][i];
    if (!o || (o.req && !o.req(S, m.reply.data || {}))) return null;
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
    { id: 'gp', w: 2, run: S => { S.parts.spares += 2; const x = near(S, null, 40); return ['Gracious Professionalism', 'Team ' + tn(x.t) + ', ' + away(x.mi) + ', heard you were short on parts and dropped off two spare gearbox kits. +2 spare parts.']; } },
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
    // (3.1.2) invitations and requests from outside the team arrive as emails (asMail); the reply buttons stay
    { id: 'scrim', w: 5, cd: 4, req: S => S.robot && S.rep >= 50 && (S.phase === 'comp' || (S.phase === 'build' && S.week >= 3) || (off(S) && ['Jun', 'Jul', 'Sep', 'Oct', 'Nov'].includes(month(S)))),
      run: S => { const x = near(S, t => t.str >= 40, 120), t = tn(x.t), who = D.personName(R(), x.t); return ['Scrimmage invitation from ' + t, hi(S) + 'We are hosting a weekend scrimmage on our practice field and we would love to have ' + S.team.num + ' there' + (S.rep >= 75 ? '. Honestly, we need someone who will actually play defense' : '') + '. Real matches are good practice for both of us.\n\nLet me know this week,\n' + who + '\nLead mentor, Team ' + t, asMail(S, who + ' (lead mentor, Team ' + t + ', ' + away(x.mi) + ')', 'Scrimmage invitation', replyMsg('scrimmage', { until: turnNo(S) + 1 }), 'Real matches are great practice, but the robot will take some hits.')]; } },
    { id: 'rook', w: 4, cd: 6, run: S => { const cy = G.Geo.cyOf(S), nw = G.Geo.localTeam(S, t => t.ry === cy, 80), x = nw || near(S, t => t.str < 40, 80), t = tn(x.t), who = D.personName(R(), x.t);
      return ['A ' + (nw ? 'rookie' : 'young') + ' team asks for help', hi(S) + 'I am the lead mentor of Team ' + t + ', ' + (nw ? 'a rookie team' : 'and this is my first season with a team of ' + D.word('freshmen', S)) + ' ' + away(x.mi) + '. We have a kit of parts and a lot of enthusiasm. Could anyone from your team show us how to wire this?\n\nThank you so much,\n' + who, asMail(S, who + ' (lead mentor, Team ' + t + ')', 'Could you help us?', replyMsg('rookie', { until: turnNo(S) + 2 }))]; } },
    { id: 'press', w: 3, cd: 8, run: S => { const o = R().pick(['the local paper', 'the school news channel', 'the city radio station', 'a regional STEM podcast']), who = D.personName(R()); return ['Interview request', hi(S) + 'I work for ' + o + ' and I would love to interview the team about ' + (S.phase === 'comp' ? 'your season so far' : inSeason(S) ? 'build season' : 'what a robotics team does all year') + '. Half an hour with a few students and a mentor would be plenty.\n\nBest,\n' + who, asMail(S, who + ' (' + o.replace(/^the |^a /, '') + ')', 'Interview request', replyMsg('interview', { until: turnNo(S) + 2 }))]; } },
    { id: 'forum', w: 3, cd: 8, req: S => S.robot && (S.phase === 'build' || S.phase === 'comp'), run: S => ['Forum thread about your robot', 'A thread titled "What is ' + S.team.num + ' building?" has ' + R().int(40, 260) + ' replies, most of them guesses from a single blurry photo. ' + (S.rep >= 60 ? 'People are paying attention.' : 'It is mostly people asking who you are.'), replyMsg('forum', { until: turnNo(S) + 2 })] },
    { id: 'board', w: 2, cd: 10, req: S => off(S) || S.phase === 'build', run: S => ['School board meeting', hi(S) + 'Robotics is on the agenda at next week\'s school board meeting' + (S.support < 45 ? ', right after the budget review. I will be honest: the tone has been tense.' : '. The superintendent has asked for "a short update, with pictures".') + ' Could someone from the team come and speak?\n\nRegards,\nThe Superintendent\'s Office', asMail(S, 'The ' + (S.team.school || 'school') + ' school board (Superintendent\'s Office)', 'Robotics on next week\'s agenda', replyMsg('board', { until: turnNo(S) + 1 }))] },
    { id: 'borrow', w: 3, cd: 5, req: S => !!evNow(S) && (!G.World.on(S) || eventMates(S).length > 0), run: S => ['Pit request from ' + (G.World.on(S) ? tn(R().pick(eventMates(S))) : rival(S)), 'They are at the ' + evNow(S).name + ' with you this week. Their drivetrain cracked a gearbox plate in the last match and the vendor booth is sold out. They are asking around the pits for a spare.', replyMsg('borrow', { until: turnNo(S) })] },
    { id: 'parent', w: 2, cd: 12, run: S => { const st = student(S), who = D.personName(R()); return ['A parent wants to help', hi(S) + st + ' talks about the team at dinner every night, and I would like to help: with anything that does not involve a soldering iron. Driving, food, spreadsheets, a truck for the trailer, you name it.\n\nThanks,\n' + who + ' (' + st + '\'s parent)', asMail(S, who + ' (parent of ' + st + ')', 'Can I help?', replyMsg('parent', { until: turnNo(S) + 2 }))]; } },
    { id: 'alumni', w: 2, cd: 12, req: S => off(S) || S.phase === 'build', run: S => { const who = D.personName(R()); return ['An alum checks in', hi(S) + 'I am home from my engineering degree for a few weeks. Could I stop by the shop? I would love to see the robot, and I promise not to tell the freshmen how we did it in my day. Well, maybe a little.\n\nCheers,\n' + who + ' (former team captain)', asMail(S, who + ' (former team captain)', 'Stopping by?', replyMsg('alumni', { until: turnNo(S) + 2 }))]; } },
    { id: 'restock', w: 0.01, cd: 4, req: S => (S.phase === 'build' || S.phase === 'comp') && !!stockAlert(S, true), run: S => { const a = stockAlert(S); return ['Stock alert: ' + a.prod.name, a.text, Object.assign(replyMsg('restock', { until: turnNo(S), data: { pid: a.prod.id, n: a.n } }), { prio: true })]; } },
    { id: 'spPost', w: 3, cd: 6, req: S => S.sponsors.length > 0, run: S => { const sp = R().pick(S.sponsors); return [sp.name + ' posted about you', sp.name + ' shared a photo of your team on their company page: "Proud to support ' + teamName(S) + '!" It has more likes than anything else they have posted this year.', replyMsg('sponsorPost', { until: turnNo(S) + 2, reply: { key: 'sponsorPost', opts: REPLY.sponsorPost.map(o => o.text), data: { sp: sp.id } } })]; } },
    { id: 'tired', w: 3, cd: 8, req: S => S.mentors.some(m => (m.morale || 70) < 55), run: S => { const m = S.mentors.filter(x => (x.morale || 70) < 55).sort((a, b) => a.morale - b.morale)[0]; return [m.name + ' looks tired', m.name + ' has been in the shop every night this week and fell asleep in the car park. The students noticed.', { reply: { key: 'tired', opts: REPLY.tired.map(o => o.text), data: { m: m.id } }, until: turnNo(S) + 1 }]; } },
    { id: 'pepRally', w: 2, cd: 14, req: S => S.robot && (S.phase === 'comp' || (off(S) && ['Sep', 'Oct'].includes(month(S)))), run: S => [D.word('rally', S)[0], 'The principal asked if the robot could appear at the ' + (D.word('rally', S)[1] || (S.phase === 'comp' ? 'spring' : 'homecoming') + ' pep rally') + '.', replyMsg('showcase', { until: turnNo(S) + 1 })] },
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
    { id: 'wk', w: 4, cd: 2, req: S => S.phase === 'comp', run: S => {
      // "locally": a winner of last week's events from within about 200 miles on the map, or else a strong team near you
      const ws = S.wseason, Geo = G.Geo, me = Geo.myPos(S), cy = Geo.cyOf(S), mi = t => Math.round(Geo.miles(me, Geo.posOf(S, t, cy).xy));
      const wins = ws ? [].concat(...ws.events.filter(e => e.week === S.week - 1 && e.done && e.res && e.res.winners && !e.teams.includes(S.team.num)).map(e => e.res.winners.map(n => ({ e, t: S.teams[n] })))).filter(x => x.t).map(x => Object.assign(x, { mi: mi(x.t) })).filter(x => x.mi <= 200) : [];
      const w = wins.length ? R().pick(wins) : null, x = w || near(S, t => t.str > 55, 200);
      return ['Week ' + S.week + ' around the world', 'Highest scores this week came from ' + R().int(2, 5) + ' different regions. Locally, ' + tn(x.t) + ' (' + away(x.mi) + ') ' + (w ? 'won the ' + w.e.name : R().pick(['set a new high score at their event', 'went undefeated in qualifications', 'is the team everyone at the next event is scouting'])) + '.']; } },
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
    2022: ['Team Update: cargo that bounces out of the Upper Hub does not count, however beautiful the shot.', 'Team Update: the centre line runs at 66 degrees, not 90. In AUTO, staged cargo on the far side of it is off limits.','Team Update: the Launch Pad protection rule gets a new diagram. It is still a very small piece of plastic.', 'Team Update: Traversal Rung contact rules clarified. Swinging robots, please mind your neighbours.'],
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
    { id: 'mDonut', req: S => S.mentors.length, get title() { return D.word('snackDay'); }, body: S => mentor(S) + ' brought ' + D.word('snackLot', S) + '. The programmers took eleven of them before anyone noticed.' },
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
    body: S => { const f = { student: student(S), driver: driver(S), mentor: mentor(S) }; return c[1].replace(/\{(student|driver|mentor)\}/g, (x, k) => f[k]); } }))); // (3.5.2) every mention, the same person each time

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
  const farmEra = S => { const cy = G.Parts.buyCy(S); return !!cy && (cy > 2023 || (cy === 2023 && !(S.phase === 'off' && S.month < 4))); }; // the print farm (Sep 2022)
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
    // (3.1.2) the print farm era (September 2022): fast desktop printers that print carbon-fiber parts
    { id: 'n313win', w: 2, cd: 60, req: S => off(S) && ['Jul', 'Oct', 'Dec'].includes(month(S)) && (() => { const r = G.Career.chalState(S).res, y = String(G.Career.offCal(S)); return Object.keys(r).some(k => k.slice(-4) === y && !r[k].place); })(), run: S => { const r = G.Career.chalState(S).res, y = String(G.Career.offCal(S)), k = Object.keys(r).filter(x => x.slice(-4) === y && !r[x].place).pop(), c = G.Career.chal(k.slice(0, -4)), t = S.teams && S.teams[r[k].win[0]]; return ['Forum: the winning entry', 'The ' + c.name + ' winner' + (t ? ', Team ' + t.num + ' ' + t.name + ',' : '') + ' posted its entry for anyone to download. ' + R().pick(['Within a day three teams had copied the intake.', 'The thread has ' + R().int(200, 600) + ' replies, and half of them are questions about one bracket.', 'The notes from the judges are in the thread too, and they are the best part.'])]; } },
    { id: 'n12farm', w: 3, cd: 60, req: S => farmEra(S) && (off(S) || S.phase === 'build'), run: S => ['Trend: the print farm', 'Walk into a top team\'s shop this season and the loudest thing in it is a shelf of fast desktop printers, running all night. Gussets, swerve covers, intake rollers and camera mounts in carbon-fiber nylon, printed while everyone sleeps. ' + (G.Shop.lvl(S, 'printer') >= 4 ? 'Ours included.' : 'The Prototyping Lab can have one too (Workshop).')] },
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
    // ---- planetary gearboxes, Lanternworks, servo kits, the Super pit
    { id: 'n16gear', w: 3, cd: 80, req: S => between(S, 2016, 2016) && S.phase === 'comp', run: S => ['Trend: the gearbox graveyard', 'Pit crews at every regional are swapping gearboxes between matches. Most of them were cut, drilled and stacked by students in January, and plenty are now in pieces. ' + rival(S) + ' has a cardboard box labelled "gearbox graveyard" with nine in it, and it is only Saturday.'] },
    { id: 'v9orbit', w: 3, cd: 80, req: S => between(S, 2016.5, 2019.5) && sold(S, 'pgear', 'B'), run: S => ['Vendor watch: two planetaries', 'Sterling\'s Orbital planetary is machined steel with a lifetime warranty. Lumen\'s Sunwheel costs two thirds as much, is made of sintered metal and comes with a sticker. A forum thread asked which one survives a hard hit and got forty photos of each, broken.'] },
    { id: 'v9lantern', w: 3, cd: 80, req: S => between(S, 2017.5, 2030) && off(S) && G.Parts.lanternOut(S, D.LANTERN[0]), run: S => ['Vendor watch: Lanternworks moves out', 'Lanternworks, the vision company that started in an apartment, has moved into a real building with a loading dock. The founders say the first fifty cameras were assembled on a kitchen table, and that the table has been retired with honours.'] },
    { id: 'n9ring', w: 3, cd: 60, req: S => between(S, 2018, 2022.5) && S.phase === 'comp', run: S => ['Trend: the green glow', 'Count the green ring lights on any qualification field: most of the strong robots carry one now. Drive coaches say a robot that lines up its own shot is worth a second per cycle. Spectators say the field looks like an aquarium.'] },
    { id: 'n9switch', w: 2, cd: 80, req: S => between(S, 2018, 2030) && S.phase === 'comp' && S.week >= 2, run: S => ['Ref corner: why robots stop', 'A field technician posted the season\'s comms losses so far. The top three causes: a loose radio cable, a loose camera cable, and a camera that floods the radio with video. Her advice: one network switch, labelled cables, and zip ties.'] },
    { id: 'v9spark', w: 3, cd: 80, req: S => between(S, 2022.5, 2030) && G.Parts.lanternOut(S, D.LANTERN[3]), run: S => ['Vendor watch: the stick that sees', 'The Lanternworks Spark is a USB stick that runs a neural network on the robot. The demo video shows a robot driving straight to a game piece that was thrown behind it. The comments are split between "witchcraft" and "my programmers will not sleep until April".'] },
    { id: 'n9servo', w: 3, cd: 80, req: S => between(S, 2022, 2030) && revealWin(S), run: S => ['Trend: the servo drawer', 'Reveal videos this year show fewer air tanks and more small grey boxes: servos and linear actuators for the latches, hood flaps and little flippers. The big motions went to brushless motors years ago. The small ones are going now.'] },
    // v2.9.8: smarter drive teams
    { id: 'n10read', w: 3, cd: 80, req: S => S.phase === 'comp' && S.week >= 2, run: S => ['Drive coaches: reading the field', 'The best drive teams this season do not fight for a spot. A partner stopped in front of the peg means another peg; a crowd at the station means the other side; two robots on one plate work it side by side. Coaches call it reading the field, and it shows in the cycle counts.'] },
    { id: 'n10decline', w: 2, cd: 80, req: S => S.phase === 'comp' && S.week >= 2, run: S => ['Strategy corner: why captains say no', 'Declining an invitation is a bet: the team gives up the alliance it is offered to build its own when its turn comes. Nobody makes that bet against the best robot in the building. Against a weaker captain, a strong team with a good partner still on the board sometimes does.'] },
    { id: 'n10endprot', w: 2, cd: 80, req: S => S.phase === 'comp' && yr(S) >= 2022, run: S => ['Ref corner: hands off at the end', { 2022: 'Touch a robot in its Hangar Zone in the last 30 seconds and the referees give it Traversal points, whatever it was doing.', 2023: 'Touch a robot on its Charge Station in the endgame and its whole alliance counts as Docked and Engaged. Expensive.', 2024: 'Contact in an opponent\'s Stage Zone in the last 20 seconds costs two tech fouls and hands them the Ensemble RP.', 2025: 'Touch a robot on its Cage in the last 20 seconds and the opponents get the Barge RP on top of the foul.', 2026: 'Touch a robot on its Tower in the last 30 seconds and, if it is off the ground, it is scored at Level 3.' }[S.year] || seasonText(S, 'prot') || 'The endgame is protected: leave robots at their climb alone.'] },
    { id: 'n10onedef', w: 2, cd: 80, req: S => S.phase === 'comp' && S.week >= 2, run: S => ['Ref corner: one at a time', 'Two robots on one opponent is not defense, it is a wall, and in some games the referees call it as a pin. Good alliances send one defender to a robot and keep the other two scoring. ' + (yr(S) === 2025 ? 'This year the rules allow only one robot on the opposing side anyway.' : yr(S) === 2026 ? 'This year two defenders blocking both bumps or both trenches is against the rules.' : 'Watch the best drive coaches wave a second defender back.')] },
    { id: 'n10cage', w: 3, cd: 80, req: S => playing(S, 2025), run: S => ['Ref corner: mind the Cages', 'A robot crosses the field under the Barge, through the gap between two Cages, and it had better use its own alliance\'s: touching an opponent\'s Cage is a MAJOR FOUL, even when another robot shoved it there. The gap is a few centimetres wider than a robot. Drive teams practise it at home between two chairs.'] },
    // v2.9.9
    { id: 'n11g414', w: 4, cd: 80, req: S => game(S, 2024), run: S => ['Ref corner: no full-court shots', 'G414: a robot with any part of its bumpers in the opponents\' Wing may not send a note into its own. Feeders at the Source now drive out past the Wing line before they lob a note home, and a feeder with a defender on it lobs into the Neutral Zone instead, where anyone can pick the notes up. Opponents included.'] },
    { id: 'n11amp', w: 3, cd: 80, req: S => playing(S, 2024), run: S => ['Strategy corner: hold the button', 'The best human players do not press Amplify the moment it lights. They wait until two scorers are lined up at the Speaker with notes, and only then press: three or four 5-point notes instead of one. A nervous human player presses at once and the ten seconds run out on an empty field.'] },
    { id: 'n11spot', w: 3, cd: 80, req: S => game(S, 2024), run: S => ['Human players: the long throw', 'In the last 20 seconds the human player at the Amp throws three HIGH NOTES at the microphones above the Stage chains. Each one that rings a microphone gives every robot onstage on that chain a point more. The best human players land most of them. Most human players land none.'] },
    { id: 'n11lane', w: 3, cd: 80, req: S => playing(S, 2025) && S.week >= 2, run: S => ['Strategy corner: meet them halfway', 'Good REEFSCAPE defenders never follow a robot into the Reef Zone, where any contact is a MAJOR FOUL. They wait halfway between its coral station and the Reef and make it go round. It costs the scorer a second or two each trip, and the referees have nothing to call.'] },
    { id: 'n11hab', w: 2, cd: 80, req: S => playing(S, 2019) && S.week >= 2, run: S => ['Ref corner: stay on the carpet', 'A defender waiting by the other alliance\'s HAB stays on the carpet or Level 1. The Level 2 and 3 platforms are for robots climbing at the end, and a drive team that parks up there finds out how steep six inches is.'] },
    { id: 'n11dump', w: 3, cd: 80, req: S => game(S, 2026), run: S => ['Trend: hooded dumpers', 'The wide dumpers this season put an adjustable hood over their flywheels, four balls wide: a few more feet of range than a fixed bank. The whole robot still has to square up to the hub before the fuel goes, and defenders know it.'] },
    { id: 'n11eff', w: 3, cd: 80, req: S => (off(S) || S.phase === 'build') && G.Seasons[S.year] && !!G.Seasons.sub(S.year, 'effector'), run: S => ['Shop talk: the hand at the end', 'The best end effectors are not small arms. Grip, compliance, sensing the game piece and letting go cleanly are a craft of their own, and the strong teams now research End Effectors on their own, with mentors who do nothing else.'] },
    { id: 'n11ment', w: 2, cd: 80, req: S => off(S) && S.month >= D.MONTHS.indexOf('Aug') && G.Career.mentorSearchLeft(S) > 0, run: S => ['Shop talk: finding mentors', 'When the August list of candidate mentors is thin, teams go looking: an advert in the local paper, a booth at a maker fair, a round of calls to alumni. Mentors Screen: Search for more mentors (twice before Kickoff).'] },
    // v3.0
    { id: 'n12pit', w: 3, cd: 80, req: S => S.phase === 'build' && S.week >= 3 && !(S.season && S.season.pitTrained), run: S => ['Shop talk: pit crews that drill', 'The fastest pit crews at last year\'s events did not have better tools. They had practised: a worn robot, a stopwatch and a cart where every part has a place. Design Office, Program projects: Pit crew training.'] },
    { id: 'n12bump', w: 2, cd: 80, req: S => S.phase === 'build' && S.week >= 2 && !(S.season && S.season.bumperStd), run: S => ['Ref corner: bumpers that stay on', 'A loose bumper is the most common reason a robot is disabled mid-match, and it is nearly always a tired pit crew and one bolt. The teams it never happens to build quick-latch bumpers for each new frame (Program projects: Bumper standards).'] },
    { id: 'n12cad', w: 2, cd: 80, req: S => (off(S) || S.phase === 'build') && lvl(S, 'cad') < 1, run: S => ['Shop talk: draw it first', 'Ask a top team how long their intake took and they will tell you how long the CAD took: the cutting is the easy part. A room of CAD workstations and a library of parts that worked saves hours on every new mechanism.'] },
    { id: 'n12shelf', w: 2, cd: 80, req: S => (off(S) || inSeason(S)) && lvl(S, 'shelf') < 2 && D.PART_CATS.some(c => G.Parts.count(S, c.id) >= G.Shop.partMax(S, c.id) && !G.Shop.SHELF_FREE.includes(c.id)), run: S => ['Shop talk: out of shelf', 'Parts that do not fit on the shelf end up in a box under a bench and then nowhere. A proper parts room (labelled bins, an inventory list) holds twice as much and finds it again.'] },
    { id: 'n12lounge', w: 2, cd: 80, req: S => S.phase === 'build' && lvl(S, 'lounge') < 1 && (S.fatigue || 0) > 35, run: S => ['Shop talk: ten minutes off', 'The programs that work the longest weeks are the ones with somewhere to stop: a couch, a fridge, a table that is not a workbench. Teams with a break room report less fatigue for the same hours.'] },
    { id: 'n12honors', w: 2, cd: 80, req: S => off(S) && lvl(S, 'honors') < 1 && G.Career.banners(S).length + G.Career.trophies(S).length > 0, run: S => ['Shop talk: the wall', 'Every banner and trophy you have won is in a box in the storeroom. Visitors, sponsors and new students never see them. Most programs put up a banner wall in their first good season.'] },
    { id: 'n12can', w: 4, cd: 60, req: S => inSeason(S) && !!(G.Parts.canBus(S) && G.Parts.canBus(S).over > 0), run: S => ['Shop talk: the bus is full', 'Your programmers pulled the logs from the last practice: the CAN bus ran at its limit, and twice the robot froze for a few seconds while the frames caught up. ' + G.Parts.canBus(S).dev + ' motors and encoders on a bus that carries ' + G.Parts.canBus(S).cap + '. A CAN FD hub (Inventory, Control system) gives the robot a second, faster bus.'] },
    { id: 'n12ref', w: 3, cd: 80, req: S => S.phase === 'build' && S.week >= 2 && S.week <= 4 && G.Robot.refs(S).length > 0, run: S => ['Trend: published robots everywhere', 'Walk any build season forum this month and half the threads are about this year\'s ' + G.Robot.refs(S).map(r => r.name).join(' and the ') + '. Rookie teams are driving in week two. The teams that do well with them treat the design as a start: by the first event their robots look a little different from everyone else\'s.'] },
    { id: 'n12refev', w: 4, cd: 3, req: S => cal(S) && S.phase === 'comp' && lastEv(S) && lastEv(S).refs && lastEv(S).refs.any + lastEv(S).refs.bp >= 3 && S.season.newsRef !== lastEv(S).name, run: S => { const e = lastEv(S), r = e.refs; S.season.newsRef = e.name;
      return ['Event report: published robots at the ' + e.name, 'Of the ' + r.n + ' other robots there, ' + G.Career.refPhrase(r.any, r.bp) + '. ' + (r.any >= r.bp ? 'Nearly every one of them scored in every match, which is more than the kit chassis managed before the Anybot.' : 'In the playoffs some of them could be told apart only by their bumpers.')]; } },
    { id: 'n12refsum', w: 4, cd: 80, req: S => cal(S) && off(S) && month(S) === 'Jun' && lastSeason(S) && lastSeason(S).cy >= 2018, run: S => { const ls = lastSeason(S), k = ls.cy - 2018, n = 700 + 120 * k + R().int(0, 80), bp = ls.cy >= 2022 ? 500 + 90 * (ls.cy - 2022) + R().int(0, 60) : 0, mine = Object.values(ls.copied || {});
      return ['Community: the published robots in numbers', 'The Gearwrights say ' + n + ' teams built at least part of the ' + ls.cy + ' Anybot, about a third of them rookies.' + (bp ? ' Apex counts ' + bp + ' teams that started from the Blueprint.' : '') + (mine.length ? ' Your team is on ' + (new Set(mine).size > 1 ? 'both lists' : 'the list') + '.' : '') + ' Next January\'s robots are already being drawn.']; } },
    // v3.1
    { id: 'n13shelf', w: 3, cd: 80, req: S => (off(S) || inSeason(S)) && lvl(S, 'shelf') > 0 && G.Shop.cond(S, 'shelf') < 60, run: S => { const e = G.Shop.item('shelf');
      return ['Shop talk: the shelf that eats money', 'A worn parts room still holds every part, but it costs more each season: cracked bins, new labels, a rack held up with zip ties. Yours will cost ' + U.money(G.Shop.upkeepOf(S, e)) + ' at the next Kickoff, against ' + U.money(e.upkeep * lvl(S, 'shelf')) + ' after a renovation (Workshop).']; } },
    { id: 'n12booth', w: 3, cd: 80, req: S => cal(S) && S.phase === 'comp' && S.week <= 4, run: S => ['Event tip: the vendor booths', 'At regionals and district events two vendors set up a booth on practice day, with the parts that are sold out online: a few each per team, and no shipping. Bring the budget, not just the robot.'] },
    { id: 'n11scout', w: 2, cd: 80, req: S => S.phase === 'comp' && S.week >= 2, run: S => ['Strategy corner: trust your sheets', 'A pick list is only as good as the scouting behind it. Tired scouts mix up team numbers, and a list built on a mixed-up sheet recommends the wrong robot with total confidence. The teams that pick well keep their scouts rested.'] },
    { id: 'n10broken', w: 2, cd: 80, req: S => S.phase === 'comp' && S.week >= 3, run: S => ['Strategy corner: when the intake breaks', 'A robot that loses its intake in a match is not out of it: it plays defense, and the partner that was defending goes back to scoring. The alliances that do it without being told are the ones still winning on Saturday.'] },
    { id: 'n9superpit', w: 3, cd: 80, req: S => between(S, 2017.5, 2030) && S.phase === 'comp', run: S => ['Trend: pits that roll in', 'The top teams no longer build their pits at the event: they wheel them in. Road cases that open into workbenches, tool walls and a screen for the strategy team, set up in twenty minutes. Inspectors have started timing it for fun.'] },
    // (3.5) fantasy games: nobody has played them before
    { id: 'n35first', w: 5, cd: 400, req: S => G.isFantasy(S.year) && S.phase === 'build' && S.week <= 2, run: S => { const Sz = G.Seasons[S.year]; return ['First look: ' + Sz.name, 'Nobody has played ' + Sz.name + ' before, so there is no match video, no old CAD and no robot from last time to copy. The forums have ' + R().int(40, 90) + ' pages of strategy already. The most quoted post: "' + String(Sz.meta.note).split('. ')[0].replace(/:.*$/, '') + '."']; } },
    { id: 'n35week', w: 4, cd: 400, req: S => G.isFantasy(S.year) && S.phase === 'comp' && S.week >= 2 && S.week <= 4, run: S => { const Sz = G.Seasons[S.year]; return ['Week ' + S.week + ': what ' + Sz.name + ' turned out to be', 'A week of events in, the early guesses are being marked. ' + (Sz.meta.defense ? 'The alliances that sent a robot to defend are winning more than the forums expected.' : 'The alliances that kept all three robots scoring are winning, and the defenders mostly collected fouls.') + ' ' + Sz.meta.faults]; } },
    { id: 'v9stick', w: 2, cd: 80, req: S => cal(S) && S.phase === 'comp' && G.Parts.loyalOn(S), run: S => ['Vendor watch: counting stickers', 'Vendor reps walk the pits at every event and write down whose parts are on which robot. A team that ran one vendor\'s control system for years got a letter and a crate. A team that ran both got two polite phone calls in the same afternoon.'] }
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
    { id: 'c9pgear', req: S => inSeason(S) && G.Parts.count(S, 'pgear') > 0, title: 'Planetaries', body: S => student(S) + ' opened a planetary gearbox "just to look" and spent the evening putting it back together. It works. There is one spare washer on the bench and nobody will talk about it.' },
    { id: 'c9ring', req: S => G.Parts.items(S, 'camera').some(it => /^cameraL/.test(it.p)), title: 'Green', body: S => 'The vision camera\'s ring light is so bright that ' + student(S) + ' wears sunglasses to tune it. ' + mentor(S) + ' has asked for a pair.' },
    { id: 'c9switch', req: S => G.Parts.count(S, 'nswitch') > 0 && inSeason(S), title: 'Cable labels', body: S => 'Every cable that goes into the network switch has a printed label now. ' + student(S) + ' labelled the label printer as well.' },
    { id: 'c9spark', req: S => G.Parts.count(S, 'accel') > 0 && inSeason(S), title: 'Object detection', body: S => 'The accelerator recognised a game piece across the shop in one frame. It also recognised ' + student(S) + '\'s lunch as a game piece. The model is being retrained.' },
    { id: 'c9servo', req: S => G.Parts.count(S, 'servo') > 0, title: 'Servo drawer', body: S => student(S) + ' sorted the servo kit by size and torque and labelled the drawer. ' + mentor(S) + ' put the old pneumatic fittings in a box marked "history".' },
    { id: 'c9superpit', req: S => G.Shop.superPit(S) && (S.phase === 'comp' || S.phase === 'champs'), title: 'Road cases', body: S => 'The Super pit opened in eighteen minutes at the last event. ' + student(S) + ' times the setup now and posts the record on the whiteboard.' },
    { id: 'c9finish', req: S => !!(S.finish && S.finish.used && S.finish.used.length), title: 'Overnight', body: S => 'The machines ran all night and the parts were on the bench in the morning. ' + mentor(S) + ' called it "the best shift nobody worked".' },
    // v2.9.8: the second robot's copies, spares, old versions taken apart, drills in the bag
    { id: 'c10copy', req: S => inSeason(S) && S.robot && S.robot.bots && S.projects.filter(p => p.type === 'copy' && p.bot === G.Robot.other(S.robot)).length >= 2, title: 'A column for Robot 2', body: S => 'The fabrication board has a column for Robot 2 now, one magnet for each subsystem being copied. ' + student(S) + ' moves a magnet across every time a copy is done, with ceremony.' },
    { id: 'c10chassis', req: S => inSeason(S) && S.robot && S.robot.bots && (S.robot.bots[G.Robot.other(S.robot)].subs.drive || {}).chassis, title: 'Kit chassis', body: S => 'The basic chassis on the second robot has no mechanisms, a laptop zip-tied to the top and a name: the programmers call it "the cart". ' + mentor(S) + ' says the cart has driven more than the robot.' },
    { id: 'c10spares', req: S => inSeason(S) && S.robot && S.robot.year === S.year && Object.keys(S.robot.design).some(k => G.Robot.spareCount(S, k) >= G.Robot.SPARE_MAX()), title: 'Three of three', body: S => student(S) + ' labelled the spare shelf "3 of 3" and taped a note to the CNC: no fourth copy. Storage has no room for one anyway.' },
    { id: 'c10scrap', req: S => G.Robot.autoScrapOn(S) && S.robot, title: 'Into the parts bin', body: S => 'Old versions go straight to the parts bin now. ' + student(S) + ' rescued one bracket from the first intake "for the history wall".' },
    { id: 'c10bag', req: S => G.Career.bagged(S) && G.Robot.twoBots(S) && (S.defDrill || 0) > 0, title: 'No sparring partner', body: S => 'With the competition robot in the bag there is no robot to play defender, so the defense drills have stopped. ' + driver(S) + ' drives laps around a recycling bin instead. It does not push back.' },
    // v2.9.9
    { id: 'c11amp', req: S => S.year === 2024 && inSeason(S), title: 'The button', body: S => 'The human player practises Amplify with a desk bell: no pressing until both scorers shout "set". ' + student(S) + ' has learned to shout "set" from across the shop.' },
    { id: 'c11spot', req: S => S.year === 2024 && inSeason(S), title: 'High notes', body: S => student(S) + ' taped a broom handle to the top of a ladder and has been throwing notes at it every evening. Three in a row tonight. The whole shop stopped to watch the fourth.' },
    { id: 'c11pack', req: S => G.Career.bagged(S) && G.Robot.held(S).length > 0, title: 'The crate', body: S => 'The crate for the next event has a list taped to the lid: the newest parts, and spares identical to what is in the bag. ' + student(S) + ' tried to sneak in last month\'s version "just in case". It is back on the storage shelf.' },
    { id: 'c11tip', req: S => S.tipT != null && turnNo(S) - S.tipT <= 2, title: 'On its side', body: S => 'The robot tipped over in a match and landed on its lift. ' + mentor(S) + ' squared it up again with a mallet and a lot of patience. ' + driver(S) + ' has been told about centre of gravity, at length.' },
    { id: 'c11hood', req: S => (G.Parts.count(S, 'servo') > 0 || G.Parts.count(S, 'pneu') > 0) && S.phase === 'build' && S.robot && (S.robot.subs.endgame && S.robot.subs.endgame.ver), title: 'Latches', body: S => 'The climber\'s latches and the shooter hood now run off the actuator kit. ' + student(S) + ' calls it "the click", and demonstrates it to every visitor.' },
    { id: 'c11ment', req: S => off(S) && !!(S.mSearch && S.mSearch.n > 0), title: 'Wanted: mentors', body: S => student(S) + ' designed the flyer for the mentor search. It has a robot on it, a coffee cup and the words "No experience necessary. Patience essential."' },
    { id: 'c11eff', req: S => G.Robot.know(S, 'effector') >= 2, title: 'The gripper binder', body: S => 'There is a binder now just for end effectors: grip tests, roller compounds, how hard to squeeze a cone. ' + student(S) + ' calls it "the hand book" and will not stop.' },
    // v3.0
    { id: 'c12pit', req: S => !!(S.season && S.season.pitTrained) && S.phase === 'comp', title: 'The stopwatch', body: S => 'The pit crew times every repair now. ' + student(S) + ' swapped an intake roller in two minutes ten and has been insufferable since.' },
    { id: 'c12bump', req: S => !!(S.season && S.season.bumperStd) && inSeason(S), title: 'Click', body: S => 'The new bumpers come off with two latches and go on with a click. ' + student(S) + ' changed them from red to blue and back eleven times "to test the latches".' },
    { id: 'c12farm', req: S => lvl(S, 'printer') >= 4, title: 'The night shift', body: S => 'The print farm ran all night: ' + R().int(18, 60) + ' parts on the bench by morning. ' + student(S) + ' has named every printer. Only one, "Gerald", is trusted with carbon fiber.' },
    { id: 'c12pitprint', req: S => lvl(S, 'printer') >= 4 && S.phase === 'comp', title: 'Printed in the pit', body: S => 'A bracket cracked in a qualification match. The replacement came off the pit printer ' + R().int(4, 8) + ' matches later, still warm. ' + student(S) + ' wants a printer on the cart for every event now.' },
    { id: 'c12ai', req: S => lvl(S, 'laptops') >= 4, title: 'Code review', body: S => 'The assistant wrote the new intake command in a minute. ' + mentor(S) + ' spent twenty asking ' + student(S) + ' to explain every line of it. That is the rule.' },
    { id: 'c12aiback', cd: 40, req: S => S.aiOutage != null && (S.turnSeq || 0) - S.aiOutage >= 1 && (S.turnSeq || 0) - S.aiOutage <= 4, title: 'Written by hand', body: S => student(S) + ' wrote a whole command by hand during the AI outage. It worked the first time. Nobody believes it, and ' + student2(S, '') + ' has asked to see the commit history twice.' },
    { id: 'c12cad', req: S => lvl(S, 'cad') > 0 && S.phase === 'build', title: 'The part library', body: S => student(S) + ' found last year\'s gearbox plate in the CAD library, changed one hole and sent it to be cut. It fitted first time. Nobody believes it.' },
    { id: 'c12shelf', req: S => lvl(S, 'shelf') >= 2, title: 'Bin 47', body: S => 'Every bin on the parts shelf has a label and a number. ' + student(S) + ' keeps the list, and knows without looking that the spare encoders are in bin 47.' },
    { id: 'c12lounge', req: S => lvl(S, 'lounge') > 0 && inSeason(S), title: 'The couch', body: S => 'The break room couch has a rota now. ' + student(S) + ' fell asleep on it during build week and woke up with a zip tie bracelet.' },
    { id: 'c12honors', req: S => lvl(S, 'honors') > 0, title: 'The wall', body: S => 'Visitors always stop at the honors wall. ' + student(S) + ' gives the tour, and knows which banner came from which match and who was driving.' },
    { id: 'c12can', req: S => G.Parts.count(S, 'canfd') > 0 && inSeason(S), title: 'Two buses', body: S => student(S) + ' drew the robot\'s two CAN buses on the whiteboard in two colours, every motor and encoder on one or the other. ' + mentor(S) + ' photographed it for the wiki before anyone could wipe it.' },
    { id: 'c12ref', req: S => S.phase === 'build' && S.projects.some(p => p.ref), title: 'Following the videos', body: S => { const a = student(S); return a + ' has the build video on the big screen and pauses it every thirty seconds. ' + student2(S, a) + ' reads out the part numbers. They are two steps ahead of the video now.'; }, },
    { id: 'c13reno', req: S => S.renoAllTurn != null && (S.newsTurn || 0) - S.renoAllTurn <= 3, title: 'Renovation weekend', body: S => student(S) + ' spent the whole weekend with a paint roller. The shop smells of fresh paint, every bin has a label again and the drill press has stopped squeaking.' },
    { id: 'c13shelf', req: S => lvl(S, 'shelf') > 0 && G.Shop.cond(S, 'shelf') < 50, title: 'Zip ties', body: S => 'The middle shelf of the parts rack came down during a meeting. ' + student(S) + ' had it back up in ten minutes with zip ties, and the zip ties went on the shopping list.' },
    { id: 'c12refq', req: S => S.phase === 'comp' && lastEv(S) && lastEv(S).refs && lastEv(S).refs.any >= 2, title: 'Spot the difference', body: S => 'There were ' + lastEv(S).refs.any + ' Anybots at the ' + lastEv(S).name + '. ' + student(S) + ' kept a list of how each team had changed theirs, and it ran to two pages.' },
    { id: 'c12refbp', req: S => S.phase === 'comp' && lastEv(S) && lastEv(S).refs && lastEv(S).refs.bp >= 2, title: 'Same intake, different team', body: S => student(S) + ' fixed a Blueprint team\'s intake in the queue with a spare from our cart. ' + (S.season.copied && Object.values(S.season.copied).includes('bp') ? 'It is the same part as ours.' : 'Theirs is the Apex design and ours is not, but the bolts are the same.') },
    // 3.1.3: Summit Champs, before and after
    { id: 'c313chal', cd: 20, req: S => off(S) && S.projects.some(p => p.type === 'vchal'), title: 'Contest weekend', body: S => { const c = G.Career.chal(S.projects.find(p => p.type === 'vchal').ch); return c.id === 'cad' ? student(S) + ' has been in CAD since Friday for the ' + c.name + '. The robot has ' + R().int(900, 2400) + ' parts and one rule: "nothing goes in that we could not buy this afternoon". ' + student2(S, '') + ' is in charge of snacks and fillets.' : c.id === 'code' ? 'The ' + c.name + ' leaderboard is on the shop TV. ' + student(S) + ' refreshes it every ' + R().int(4, 9) + ' minutes and has stopped pretending not to.' : student(S) + ' has wired the ' + c.name + ' board three times this weekend. The third time every wire has a label at both ends, and ' + student2(S, '') + ' cried a little.'; } },
    { id: 'c315elite', cd: 160, req: S => S.phase === 'comp' && S.diff !== 'easy' && G.World.on(S) && G.World.elites(S).length > 0, title: 'Not one fault', body: S => { const t = R().pick(G.World.elites(S)); return student(S) + ' scouted Team ' + t.num + ' ' + t.name + ' all weekend: ' + R().int(10, 14) + ' matches, not one fault, and their human player did not miss a throw. ' + student2(S, '') + ' wants to know what they eat.'; } },
    { id: 'c35letter', cd: 150, req: S => (S.inbox || []).slice(0, 25).some(m => m.mail && S.sponsors.some(sp => sp.slot === 'title' && m.mail.from.includes('(' + sp.name + ')'))), title: 'The letter on the wall', body: S => { const sp = S.sponsors.find(x => x.slot === 'title'); return student(S) + ' printed the letter from ' + sp.name + ' and pinned it by the shop door, with one line marked in yellow. ' + student2(S, '') + ' has read the postscript aloud to ' + R().pick(['every new member', 'two parents and a delivery driver', 'the whole drive team']) + '. ' + mentor(S) + ' says the logo goes on straight this year.'; } },
    { id: 'c35leadname', cd: 500, req: S => off(S) && !!(S.team && S.team.lead) && (S.history || []).length >= 1, title: 'The name on the office door', body: S => 'Somebody has printed a label for the shop office door: "' + G.Career.leadName(S) + ', Lead Mentor". Underneath, in ' + student(S) + '\'s handwriting: "' + R().pick(['knock first, bring snacks', 'office hours: always, apparently', 'the answer is "did you check the wiki?"']) + '".' },
    { id: 'c35dispute', cd: 6, req: S => !!S.lastDispute && (S.turnSeq || 0) - S.lastDispute.tq <= 2 && (S.turnSeq || 0) > S.lastDispute.tq, title: 'A new rule on the whiteboard', body: S => 'After this week\'s argument the whiteboard by the door has a new rule on it, number ' + R().int(9, 23) + ': "' + R().pick(['Say it to the person, not to the group chat.', 'The robot belongs to whoever is holding the checklist.', 'Nobody is "just saying".', 'Arguments stop when the pizza arrives.', 'If it is not in the drawing, it did not happen.']) + '" ' + student(S) + ' wrote it. ' + (S.lastDispute.bad ? student2(S, '') + ' has added "(we are working on it)".' : 'Nobody has crossed it out.') },
    { id: 'c35undo', cd: 400, req: S => off(S) && (S.mentors || []).some(m => (m.ten || 0) === 0) && month(S) !== 'May', title: 'Trial evening', body: S => 'The newest mentor came to one meeting before saying yes for good. ' + student(S) + ' used the evening to ask ' + R().int(14, 31) + ' questions about gear ratios. They came back the next day anyway.' },
    { id: 'c35maker', cd: 200, req: S => S.sponsors.some(s => s.type === 'maker'), title: 'The box from Corvane', body: S => 'A box from Corvane Labs came with this month\'s paperwork: ' + R().int(6, 14) + ' spools of filament in colours nobody ordered and a sticker sheet. ' + student(S) + ' has already printed the team number in ' + R().pick(['translucent orange', 'glow-in-the-dark green', 'a purple called "Grape Soda"']) + '. ' + mentor(S) + ' asked what it is for. Nobody had an answer and nobody minded.' },
    { id: 'c35makerletter', cd: 400, req: S => (S.inbox || []).slice(0, 25).some(m => m.mail && S.sponsors.some(sp => sp.type === 'maker' && m.mail.from.includes('(' + sp.name + ')'))), title: 'Read by the printers', body: S => { const a = student(S); return 'The letter from Corvane Labs is taped to the side of the printer, where ' + a + ' says it belongs. ' + student2(S, a) + ' has started a bag for broken printed parts, with the match number on each, in case the postscript was serious. ' + mentor(S) + ' thinks it was.'; } },
    { id: 'c35intl', cd: 300, req: S => S.sponsors.some(s => s.slot === 'partner' && s.type !== 'maker' && D.sponsorIntl && D.sponsorIntl(s.name)), title: 'A parcel from head office', body: S => { const sp = R().pick(S.sponsors.filter(s => s.slot === 'partner' && s.type !== 'maker' && D.sponsorIntl(s.name))); return 'The partnership pack from ' + sp.name + ' came from a head office ' + R().pick(['nine', 'eleven', 'seven']) + ' time zones away: ' + R().int(30, 60) + ' lanyards, a banner in six languages and a brand manual of ' + R().int(70, 120) + ' pages. ' + student(S) + ' read the chapter on how much empty space the logo needs aloud. It needs more than the robot has.'; } },
    { id: 'c35near', cd: 300, req: S => { const c = G.Geo && G.Geo.cityOf ? G.Geo.cityOf(S) : ''; return !!c && !!D.sponsorCity && S.sponsors.some(s => !D.sponsorIntl(s.name) && D.sponsorCity(s.name, c) === c); }, title: 'Round the corner', body: S => { const c = G.Geo.cityOf(S), sp = R().pick(S.sponsors.filter(s => !D.sponsorIntl(s.name) && D.sponsorCity(s.name, c) === c)); return 'Two people from ' + sp.name + ' came by after work: they are here in ' + c + ' too, ' + R().pick(['twenty minutes away', 'two bus stops down the road', 'on the other side of the river']) + ', and one of them has a ' + R().pick(['niece', 'nephew', 'neighbour']) + ' on the team. They stayed for drive practice and left with ' + R().int(2, 5) + ' keyrings ' + student(S) + ' had printed that afternoon.'; } },
    { id: 'c35far', cd: 400, req: S => { const c = G.Geo && G.Geo.cityOf ? G.Geo.cityOf(S) : ''; return !!c && !!D.sponsorCity && S.sponsors.some(s => !D.sponsorIntl(s.name) && D.sponsorCities(s.name).length > 0 && !D.sponsorCities(s.name).some(x => D.landOf(x) === D.landOf(c))); }, title: 'A stamp nobody had seen', body: S => { const c = G.Geo.cityOf(S), sp = R().pick(S.sponsors.filter(s => !D.sponsorIntl(s.name) && D.sponsorCities(s.name).length > 0 && !D.sponsorCities(s.name).some(x => D.landOf(x) === D.landOf(c)))); return 'The sponsor banner from ' + sp.name + ' came all the way from ' + D.sponsorCity(sp.name, c) + ', across a border, with customs forms in two languages and a stamp nobody had seen before. ' + student(S) + ' kept the envelope. ' + mentor(S) + ' says a company that far away does not write to many teams, so the thank-you video had better be good.'; } },
    // (3.5.1)
    // (3.5.2)
    // (3.5.3)
    { id: 'c353crate', cd: 300, req: S => G.Career.bagged(S) && (G.Robot.held(S) || []).some(h => h.u), title: 'The crate', body: S => 'The crate for the next event is in the hall by the shop door, with a list taped to the lid in ' + student(S) + '\'s handwriting: what goes in, in what order, and which bolts to bring. ' + mentor(S) + ' has added one line at the bottom: "and the tools to fit it".' },
    { id: 'c353ctrl', cd: 400, req: S => !!(G.Parts.sysDiffer && G.Parts.sysDiffer(S)), title: 'Two sets of code', body: S => 'With two control systems in the shop, the programmers keep two branches of the robot code. ' + student(S) + ' has labelled the laptops so nobody deploys the wrong one. ' + mentor(S) + ' says the drivers notice the difference too: the practice robot never quite feels like the real one.' },
    { id: 'c353live', cd: 400, req: S => !!(S.cal && S.robot && S.robot.bots && S.phase !== 'off' && S.robot.year === S.year), title: 'Same robot, new motors', body: S => student(S) + ' moved the drivetrain onto the newest motors on the shelf and ran the test lap again: same code, same driver, a little faster every time. ' + mentor(S) + ' wrote "parts count" on the whiteboard and underlined it twice.' },
    { id: 'c353bag', cd: 500, req: S => !!(S.cal && S.bagParts && G.Career.bagged(S)), title: 'Every serial number', body: S => 'The sheet that went into the bag with the robot lists every motor and sensor on it by serial number. ' + student(S) + ' says that way nobody will borrow one before the next event. Nobody has.' },
    { id: 'c353fam', cd: 500, req: S => !!(S.cal && S.robot && S.robot.bots && G.Robot.twoBots(S)), title: 'It feels lazy', body: S => student(S) + ' came off the practice robot saying one mechanism felt lazy. It runs on different motors from the competition robot\'s, and the drivers can feel it. ' + mentor(S) + ' has asked for the same parts on both, where the shelf allows.' },
    { id: 'c353gbx', cd: 600, req: S => !!(S.cal && S.inv && G.Parts.count(S, 'gearbox')), title: 'Same part number', body: S => 'Lumen\'s new catalogue arrived. ' + student(S) + ' found the standard drive gearbox on the same page with the same part number as in a catalogue from years ago. Lumen\'s rep says it is the one part they will never change, and ' + mentor(S) + ' says that is why every team has a pair of them somewhere.' },
    { id: 'c354nsw', cd: 500, req: S => !!(S.cal && G.Parts.devK && (G.Parts.devK(S, 'comp').nsw || G.Parts.devK(S, 'prac').nsw)), title: 'The camera ate the network', body: S => student(S) + ' ran the new code on the bench and the robot kept dropping its connection. The camera was sending every frame over the same network as the controls. ' + mentor(S) + ' says a network switch costs less than another evening of this.' },
    { id: 'c354read', cd: 600, req: S => !!(S.season && G.Career.metaUse(S.robot ? S.robot.year : S.year)), title: 'The whiteboard', body: S => 'The drive coach has started a whiteboard of what the best alliances do that nobody else does yet. ' + student(S) + ' adds a line after every event they watch. ' + mentor(S) + ' says reading the game is a skill like any other.' },
    { id: 'c354shot', cd: 600, req: S => !!(S.robot && S.robot.year === 2026), title: 'Slow motion', body: S => student(S) + ' filmed the shooters at the last event at 240 frames a second. The turrets fire one ball after another, the fixed shooters two at a time, and the big dumpers four abreast. The video has more views than the reveal.' },
    { id: 'c355cad', cd: 700, req: S => !!(S.robot && S.robot.bots && S.phase === 'build' && S.week >= 3), title: 'Side view', body: S => student(S) + ' posted a side view of the robot straight from the CAD model. Within the hour someone had counted the holes in the tubes, and a rival asked what the pockets in the plates save in weight. ' + mentor(S) + ' says the answer is in the picture for anyone who looks. The only argument left is whether the number belongs in the middle of the bumper or at its end, and the Garage lets the team try both.' },
    { id: 'c355green', cd: 700, req: S => !!(S.robot && S.robot.visionLvl >= 1 && G.Era && !G.Era.of(S).vision.tags), title: 'The green ring', body: S => student(S) + ' wired the green ring light to the trigger: it comes on when the robot aims, and the tape round the goal shines back into the camera. The drive team has asked for sunglasses, and ' + mentor(S) + ' has asked that nobody point it at the judges.' },
    { id: 'c355paint', cd: 800, req: S => !!(S.robot && S.robot.bots && S.season), title: 'Powder coat', body: S => student(S) + ' has been counting painted robots at events: about one in seven, and nearly every elite team, always in the same colour as last year. ' + mentor(S) + ' says paint weighs something and wins nothing, and has still asked what a batch of tubes would cost in the team\'s colour. The Garage has the answer for free.' },
    { id: 'c356drive', cd: 700, req: S => !!(S.season && S.phase === 'comp' && S.robot && S.robot.bots), title: 'Sideways', body: S => student(S) + ' spent a lunch break with match video: the swerve robots never stop to turn, they arrive already facing the goal, and with a defender on them they roll off like a door on a hinge. The tank drives back up, swing round and go. ' + mentor(S) + ' says both get there, and that one of them is cheaper.' },
    { id: 'c356face', cd: 800, req: S => !!(S.season && S.phase === 'comp'), title: 'Square up', body: S => 'A new rule on the drive team\'s whiteboard: "Scorer to the goal, intake to the station." ' + student(S) + ' wrote it after watching the robot drive up to a goal sideways and wait there, pointing at nothing.' },
    { id: 'c356flip', cd: 900, req: S => !!(S.robot && S.robot.year === 2018 && S.phase !== 'off'), title: 'Over the top', body: S => 'One of the best teams in the world has a claw that flips right over its lift: it puts a cube on the Scale behind it without turning round. ' + student(S) + ' watched it three times and says the arm with two joints on the next field is nearly as quick and half the weight. ' + mentor(S) + ' has asked how many pivots this team has ever got right.' },
    { id: 'c356suction', cd: 900, req: S => !!(S.robot && S.robot.year === 2019 && S.phase !== 'off'), title: 'Stuck to it', body: S => 'A robot climbed HAB Level 3 on a vacuum disk and hung there beside the platform while its partner drove up onto it. ' + student(S) + ' wants to know what happens when the pump stops. The answer, from the next pit: "It comes down."' },
    { id: 'c356long', cd: 900, req: S => !!(S.robot && S.robot.year === 2020 && S.phase !== 'off'), title: 'The big wheel', body: S => 'There is a robot with a wheelchair wheel for a flywheel. It shoots from behind the Trench Run, most of the field away, and is back at the Loading Bay before anyone else has crossed the generator. ' + student(S) + ' counted: fewer go in from there, and almost none find the Inner Port. It does not fit under the Trench either.' },
    { id: 'c356fuel17', cd: 900, req: S => !!(S.robot && S.robot.year === 2017 && S.phase !== 'off'), title: 'From out there', body: S => 'One robot at the last event never drove into the Key. It took fuel in at both ends, turned its turret and emptied the hopper from the middle of the field, while the defender sent to the Key waited for nobody. ' + student(S) + ' counted a few more misses than from close in. ' + mentor(S) + ' counted the hours it must have taken.' },
    { id: 'c356turret24', cd: 900, req: S => !!(S.robot && S.robot.year === 2024 && S.phase !== 'off'), title: 'A heavy turret', body: S => student(S) + ' timed the turret shooters at the last event: the shooter is so big that the turret takes its time coming round, and it hits no more often than a good pivot. ' + mentor(S) + ' says it is the hardest shooter of the year to build for a few points a match, and that the best teams build it anyway.' },
    { id: 'c356esc', cd: 900, req: S => !!(S.robot && S.robot.year === 2023 && S.phase !== 'off'), title: 'Escalator', body: S => 'Nobody calls it a wrist any more. The stages that run out level from the elevator, one inside the next, are "the escalator", and ' + student(S) + ' has been told twice that it does not carry passengers.' },
    { id: 'c356prep', cd: 800, req: S => !!(S.season && S.phase === 'comp'), title: 'Six robots on one sheet', body: S => 'The scouts now hand the drive team a sheet before every match with all six robots drawn from the side. ' + student(S) + ' can tell a team from the far end of the field by where it puts the number on its bumpers: in the middle, or out at the end.' },
    { id: 'c356fridge', cd: 900, req: S => G.Shop.superPit(S) && (S.phase === 'comp' || S.phase === 'champs'), title: 'Cold drinks', body: S => 'The pit was up before the truck had finished unloading, and nobody carried a workbench. ' + student(S) + ' found the mini fridge in the third road case. ' + mentor(S) + ' says the team has never come home from an event this awake.' },
    { id: 'c356ftc', cd: 900, req: S => S.phase === 'off' && G.Career.ownTeams(S) > 0, title: 'Tuesday is FTC night', body: S => 'The FTC team has the workshop on Tuesdays and Thursdays this autumn, and a mentor with it. ' + mentor(S) + ' counted ' + (G.Career.ownTeams(S) * G.Data.FTC_OWN.mentorH) + ' hours a week that used to go to the big robot, and says they are the best spent hours of the offseason.' },
    { id: 'c355fold', cd: 700, req: S => !!(S.season && S.phase === 'comp'), title: 'Intake in', body: S => 'The drive coach has a new call for the long runs across the field: "intake in". ' + student(S) + ' says a folded intake is one less thing for a defender to hit, and it comes out again faster than anyone can say it.' },
    { id: 'c353cam2', cd: 500, req: S => !!(S.cal && S.robot && S.robot.bots && S.projects.some(p => p.type === 'vision') && G.Robot.twoBots(S)), title: 'A camera for the practice robot', body: S => student(S) + ' has been writing the new vision code against the practice robot. ' + (G.Robot.vision2(S) ? 'It has its own camera now, and every test run ends with a screenshot of the target lock on the shop whiteboard.' : 'It has no camera, so every test is a guess until the competition robot is free. ' + mentor(S) + ' has put a second camera on the shopping list.') },
    { id: 'c353can2', cd: 500, req: S => !!(S.cal && G.Parts.can2 && G.Parts.can2(S) && G.Parts.can2(S).over > 0), title: 'The practice robot froze again', body: S => 'The practice robot stopped dead on the bench twice this week, with every motor and encoder on one CAN bus. ' + student(S) + ' says it is not the code. ' + mentor(S) + ' says it is the bus, and that a CAN FD hub would cost less than the hours.' },
    { id: 'c353elec', cd: 400, req: S => !!(S.subPref && Object.keys(S.subPref).length), title: 'Colour-coded', body: S => student(S) + ' has put coloured tape on every motor in the shop, one colour per vendor, so that nobody fits the wrong one to the wrong mechanism again. ' + mentor(S) + ' says the tape is the best wiring standard the team has ever had.' },
    { id: 'c353stock', cd: 600, req: S => (S.inbox || []).slice(0, 20).some(m => m.reply && m.reply.key === 'restock' && m.replied === 0), title: 'Just in time', body: S => 'The order went in an hour after the vendor\'s warning, and the shelf was empty the week after. ' + student(S) + ' has started reading the vendor emails out loud at the start of every meeting.' },
    { id: 'c352bag', cd: 6, req: S => S.phase === 'build' && S.week >= 5 && !!S.cal && G.Era.of(S).bag, title: 'The number on the whiteboard', body: S => { const n = 8 - S.week; return 'Somebody has written a number on the shop whiteboard in red marker: ' + n + (n === 1 ? '. Underneath, in smaller letters: "this is the week".' : '. Every week it goes down by one, and every week ' + student(S) + ' asks whether it can be made to go down slower.') + ' ' + mentor(S) + ' has started bringing the bag to meetings, folded, so that nobody forgets what it is for.'; } },
    { id: 'c352scrim', cd: 300, req: S => S.phase === 'build' && S.week === 7 && !!S.scrimmage && G.World.on(S), title: 'Everybody we know', body: S => 'The list for Saturday\'s scrimmage came out: most of the teams are from ' + (G.Geo.cityOf(S) || 'town') + ' and the towns around it. ' + student(S) + ' knows somebody on half of them and has already started a group chat. ' + mentor(S) + ' says a scrimmage is where you find out what breaks, so nobody should be embarrassed when it does.' },
    { id: 'c352bagged', cd: 400, req: S => S.phase === 'comp' && S.week <= 2 && G.Career.bagged(S) && G.Robot.secondRuns(S), title: 'The other robot', body: S => 'The robot in the bag is the one the team chose on Stop Build Day. The other one is on the practice field every afternoon, and ' + student(S) + ' says it drives better already. ' + mentor(S) + ' says that is what everybody says about the robot in the shop.' },
    { id: 'c351renew', cd: 200, req: S => (S.offers || []).some(o => o.renew), title: 'The form on the fridge', body: S => { const o = S.offers.find(x => x.renew); return 'The renewal form from ' + o.name + ' is held to the shop fridge by a swerve-module magnet. ' + student(S) + ' has drawn an arrow to the signature line. ' + mentor(S) + ' says a sponsor that asks to stay has already said the nice part, and the rest is your decision.'; } },
    { id: 'c351board', cd: 300, req: S => !!(S.season && S.season.board && S.season.board.done && S.season.board.verdict != null) && (S.phase === 'comp' || S.phase === 'champs'), title: 'After the visit', body: S => { const v = S.season.board.verdict; return v > 0 ? 'A photograph went round the school on Monday: three board members in safety glasses, one of them holding a wrench the wrong way round. ' + student(S) + ' has printed it for the pit.' : 'Nobody has mentioned the board\'s visit since Monday. ' + student(S) + ' has put a new line on the pit checklist anyway: "check who is in the stands".'; } },
    { id: 'c351grant', cd: 400, req: S => (S.inbox || []).slice(0, 40).some(m => m.reply && m.reply.key === 'edugrant' && m.replied != null), title: 'Four minutes of paperwork', body: S => student(S) + ' timed the grant form: four minutes, including finding a pen. ' + mentor(S) + ' has asked for every form to be like that one. ' + student2(S, '') + ' is spending the grant, on paper, for the third time this week.' },
    { id: 'c351batt', cd: 30, req: S => S.battOut != null && (S.turnSeq || 0) - S.battOut <= 2, title: 'Two zip ties', body: S => 'Since the battery came unplugged in the middle of a match, the connector wears two zip ties and a strip of tape, and ' + student(S) + ' pulls on it before every match with the whole drive team watching. The signal light went dark the moment it happened: from the stands that is how you tell no power from no comms.' },
    { id: 'c351own', cd: 200, req: S => S.selfPaid != null && (S.turnSeq || 0) - S.selfPaid <= 3, title: 'Empty seats on the bus', body: S => 'Not everybody could pay for the trip. ' + student(S) + ' scouted two fields\' worth of matches alone and has stopped speaking in full sentences. ' + mentor(S) + ' is keeping a list of who stayed home, to take them first next time.' },
    { id: 'c351super', cd: 300, req: S => G.Shop.superPit(S) && (S.phase === 'comp' || S.phase === 'champs') && !!S.robot, title: 'Nobody asked them to', body: S => 'The pit crew no longer waits to be told. Whatever came off the field in the worst state is on the bench before the drive team has put the controllers down. ' + student(S) + ' calls it triage. ' + mentor(S) + ' still walks over now and then to point at something else.' },
    { id: 'c351local', cd: 300, req: S => { const d = evNow(S); try { return !!(d && d.kind === 'regional' && G.Career.travelMode(S, d) === 'local'); } catch (x) { return false; } }, title: 'Sleeping in their own beds', body: S => 'This week\'s event is in town. No bus at five in the morning, no hotel, and ' + student(S) + '\'s grandmother has announced that she is coming on Saturday with a folding chair. ' + mentor(S) + ' has warned the drive team that playing at home counts for nothing on the scoreboard.' },
    { id: 'c35elite', cd: 250, req: S => !!(S.team && S.team.elite), title: 'What the tag changes', body: S => 'Since the Elite tag went up, scouts from other teams arrive at the pit in pairs, and one of them always photographs the ' + R().pick(['intake', 'drivetrain', 'wiring', 'bumper mounts']) + '. ' + student(S) + ' has started charging them one sticker a photograph. ' + mentor(S) + ' says that is what the tag means: everybody copies your homework, so do it properly.' },
    { id: 'c35away', cd: 300, req: S => off(S) && month(S) === 'Oct' && Object.keys(S.sponsorGone || {}).length > 0, title: 'Not on the list', body: S => { const n = Object.keys(S.sponsorGone)[0]; return student(S) + ' went through this autumn\'s offers twice looking for ' + n + '. It is not there. "Give them a year," ' + mentor(S) + ' said. "Nobody comes back the same autumn they left."'; } },
    { id: 'c315partners', cd: 200, req: S => off(S) && month(S) === 'Oct' && S.sponsors.filter(s => s.slot === 'partner').length < G.Career.partnerSlots(S) && (S.history || []).length >= 2, title: 'The partner board', body: S => 'The partner list on the shop whiteboard changed again: ' + student(S) + ' wiped off ' + R().pick(['two names', 'a name', 'three names']) + ' and left room for the new ones. ' + mentor(S) + ' says partners like one-season deals, so October is when the team finds out who its friends are.' },
    { id: 'c315grant', cd: 200, req: S => off(S) && (S.inbox || []).slice(0, 15).some(m => /^Grant renewed:/.test(m.title)), title: 'The grant report', body: S => student(S) + ' wrote the grant report for the foundation: ' + R().int(6, 14) + ' pages, a photo of every outreach event and one chart nobody understands. The grant was renewed. ' + student2(S, '') + ' says the chart did it.' },
    // 3.5 (the world): teams from outside North America, flights overseas, visitors from far away
    { id: 'c35jetlag', cd: 200, req: S => S.phase === 'comp' && lastEv(S) && S.lastEventIntl && D.overseas && D.overseas(S.team.region, 'Midwest'), title: 'Body clocks', body: S => 'Three days after the flight home, ' + student(S) + ' still wakes at four in the morning and falls asleep in physics. ' + mentor(S) + ' has moved this week\'s build meeting to "whenever people are conscious".' },
    { id: 'c35crate', cd: 260, req: S => inSeason(S) && D.overseas && D.overseas(S.team.region, 'Midwest') && G.World.on(S), title: 'The customs list', body: S => 'The shipping crate needs a list of everything in it, with a value for each line. ' + student(S) + ' has reached line 212: "zip ties, assorted, used". The batteries travel on their own paperwork.' },
    { id: 'c35kickoff', cd: 400, req: S => S.phase === 'kickoff' && D.overseas && D.overseas(S.team.region, 'Midwest'), title: 'Kickoff at an odd hour', body: S => 'The game reveal is broadcast from the other side of the world, so the team watched it ' + R().pick(['at two in the morning, in sleeping bags, in the school library', 'before sunrise, with breakfast on the workbenches', 'at midnight, on a projector borrowed from the physics room']) + '. Nobody went home afterwards.' },
    { id: 'c35visitors', cd: 300, req: S => S.phase === 'comp' && lastEv(S) && G.World.on(S) && !G.World.legacy(S) && !D.overseas(S.team.region, 'Midwest') && Object.values(S.teams).some(t => D.overseas(t.region, S.team.region)), title: 'A long way from home', body: S => 'A team from ' + R().pick(D.REGIONS.filter(r => D.overseas(r, S.team.region))) + ' had the pit next door: three days of travel, a robot rebuilt out of its crate overnight, and a box of sweets nobody here had seen before. ' + student(S) + ' traded two shirts for one of theirs.' },
    { id: 'c35offhome', cd: 150, req: S => off(S) && G.Career.offEvents(S).some(e => e.city && S.offReg.includes(e.id) && !S.eventsDone[e.id + S.year]), title: 'The poster by the door', body: S => { const e = G.Career.offEvents(S).find(x => x.city && S.offReg.includes(x.id) && !S.eventsDone[x.id + S.year]); return student(S) + ' pinned the poster for the ' + e.name + ' to the shop door: ' + e.city + ', ' + ({ Jun: 'June', Jul: 'July', Sep: 'September', Oct: 'October', Nov: 'November' }[e.month] || e.month) + ', ' + e.size + ' teams. ' + student2(S, '') + ' went down the list and knew ' + R().pick(['most of them from our own events', 'half of them by their pit banners', 'nearly every number on it']) + '. "No flights, no crate, no excuses," ' + mentor(S) + ' said.'; } },
    { id: 'c35octfree', cd: 400, req: S => off(S) && G.World.on(S) && D.offseasonAbroad(S.team) && ['Sep', 'Oct'].includes(month(S)), title: 'Nothing in October', body: S => 'There is no offseason event around here in October: the calendar leaves the month open for Summit Champs, an ocean away. ' + student(S) + (S.offReg.includes('os_summit') ? ' has already weighed the crate twice.' : ' says the gap is "for when we are invited", and has started a list of what goes in the crate.') },
    { id: 'c35names', cd: 400, req: S => off(S) && G.World.on(S) && !G.World.legacy(S) && month(S) === 'Aug', title: 'The map on the wall', body: S => student(S) + ' pinned a world map to the shop wall and marked every area with teams in it. The pins run from the Pacific coast to the far side of the Tasman Sea, and ' + D.regionThe(S.team.region) + ' has ' + Object.values(S.teams).filter(t => t.region === S.team.region).length + ' of them.' },
    { id: 'c35novideo', cd: 300, req: S => G.isFantasy(S.year) && inSeason(S) && S.week <= 2, title: 'No old video', body: S => student(S) + ' went looking for match video of ' + G.Seasons[S.year].name + ' from earlier seasons. There is none: nobody has ever played it. ' + mentor(S) + ' called that "a level field".' },
    { id: 'c35custom', cd: 400, req: S => S.customGames && S.orderMode === 'custom' && off(S) && S.upcoming < S.order.length, title: 'The list on the wall', body: S => 'The seasons to come are pinned to the shop wall. Next up: ' + G.Seasons[S.order[S.upcoming]].name + '. ' + student(S) + ' has already drawn a robot for it. It has six arms.' },
    { id: 'c35surprise', cd: 400, req: S => S.orderMode === 'random' && off(S) && S.upcoming < S.order.length && (S.order || []).some(g => G.isFantasy(g)), title: 'Guessing the game', body: S => 'The betting pool on next season\'s game has a new column this year: "something nobody has seen before". ' + student(S) + ' put a cookie on it.' },
    { id: 'c313code', cd: 120, req: S => off(S) && S.projects.some(p => p.type === 'code'), title: 'The beta', body: S => student(S) + ' installed the beta of next season\'s control system release on ' + R().int(2, 5) + ' laptops and keeps a list of what broke in the code library. It is ' + R().int(11, 38) + ' lines long. ' + student2(S, '') + ' has crossed out the first ' + R().int(4, 9) + '.' },
    { id: 'c313codeok', cd: 200, req: S => ['kickoff', 'build'].includes(S.phase) && S.week <= 1 && G.Career.codeCurrent(S), title: 'It compiled', body: S => 'Kickoff day, two hours after the game reveal: the robot code built on the new release on the first try. ' + student(S) + ' took a screenshot of the build log for the team chat. Nobody else on the forum is that calm today.' },
    { id: 'c313rd', cd: 120, req: S => off(S) && !S.preseason && ['May', 'Jun', 'Jul'].includes(month(S)) && S.projects.some(p => p.type === 'research'), title: 'The R&D whiteboard', body: S => 'The whiteboard by the shop door says "R&D" at the top again, with ' + R().int(9, 17) + ' ideas under it and ' + R().int(2, 4) + ' circled. ' + student(S) + ' wrote "before Kickoff" under the circled ones and underlined it twice.' },
    { id: 'c313rdend', cd: 120, req: S => S.phase === 'kickoff' && (S.inbox || []).slice(0, 12).some(m => m.title === 'R&D closes for the season'), title: 'Written up as it stands', body: S => student(S) + ' spent the last evening before Kickoff writing up the research that did not finish: ' + R().int(6, 14) + ' pages, three photos of a half-built prototype and one line in capitals: "FINISH THIS IN MAY".' },
    { id: 'c313gold', cd: 60, req: S => off(S) && (() => { const r = G.Career.chalState(S).res, y = String(G.Career.offCal(S)); return Object.keys(r).some(k => k.slice(-4) === y && r[k].place === 1); })(), title: 'The email on the shop door', body: S => student(S) + ' printed the first-prize email and taped it to the shop door, at eye level. ' + student2(S, '') + ' added a frame. ' + mentor(S) + ' says it stays up until somebody wins another one.' },
    { id: 'c313pack', cd: 20, req: S => off(S) && S.offReg.includes('os_summit') && ['Sep', 'Oct'].includes(month(S)) && !S.eventsDone['os_summit' + S.year], title: 'Packing for California', body: S => student(S) + ' has made a packing list for Summit Champs with ' + R().int(140, 260) + ' lines. Line 1 is "the robot". Line 2 is "a second robot, just in case". ' + mentor(S) + ' has crossed out line 2.' },
    { id: 'c313back', cd: 30, req: S => off(S) && !!(S.summit && S.summit.res && S.summit.res[G.Career.cy(S)] && S.summit.res[G.Career.cy(S)] !== 'not attended') && ['Oct', 'Nov', 'Dec'].includes(month(S)), title: 'Back from Summit Champs', body: S => student(S) + ' came back from Summit Champs with ' + R().int(12, 40) + ' pages of notes from the mentor conference and a photo with ' + R().pick(['three elite drive teams', 'the host team\'s pit crew', 'a robot nobody is allowed to describe']) + '. ' + student2(S, '') + ' wants to "do it their way" for everything now.' },
    // 3.1.1: a team that turned your invitation down, and the travel bill of a big team
    { id: 'c311decl', cd: 30, req: S => S.phase === 'comp' && !!(S.season && S.season.declinedBy && S.teams && S.teams[S.season.declinedBy.team]), title: 'Turned down', body: S => { const d = S.season.declinedBy, t = S.teams[d.team]; named.push(t.num); return 'At the ' + d.ev + ', ' + t.num + ' ' + t.name + ' said no to our invitation and captained an alliance of their own. ' + student(S) + ' has been checking their results ever since "just out of interest". ' + student2(S, '') + ' has added them to the scouting watch list in red.'; } },
    { id: 'c311bus', cd: 40, req: S => (S.phase === 'comp' || S.phase === 'build') && (S.studentsCount || 0) >= 32, title: 'The travel spreadsheet', body: S => 'Treasurer ' + student(S) + ' built a spreadsheet for the next trip: ' + S.studentsCount + ' students, ' + Math.ceil(S.studentsCount / 4) + ' hotel rooms and a very long column of meals. "Every new member is another seat on the bus," they told the meeting. Nobody is sure whether that was a complaint.' },
    { id: 'c13elite', req: S => S.phase === 'comp' && eventMates(S).some(t => t.elite), title: 'Next to an elite pit', body: S => { const t = eventMates(S).find(x => x.elite); named.push(t.num); return student(S) + ' walked past ' + t.num + ' ' + t.name + '\'s pit three times this week. Every bin labelled, every battery logged, a spare for every part on the robot, and it is quieter than a library. ' + student2(S, '') + ' came back with a notebook full of ideas and a slightly smaller ego.'; } },
    { id: 'c13wait', req: S => S.phase === 'build' && S.week < D.REF_WEEK && G.Robot.refsSoon(S).length && !S.projects.some(p => p.type === 'build'), title: 'Waiting for the published robot', body: S => student(S) + ' has refreshed the ' + G.Robot.refsSoon(S)[0].by.replace(/^the /, '') + ' page forty times today. Everyone else is wiring a test chassis, writing drive code or, for once, going home on time.' },
    { id: 'c13own', req: S => S.phase === 'build' && S.week < D.REF_WEEK && G.Robot.refsSoon(S).length && S.projects.filter(p => p.type === 'build' && !p.ref).length >= 2, title: 'Not waiting', body: S => student(S) + ' says the team is not waiting a week for somebody else\'s robot. The intake CAD has been on the big screen since Saturday, and nobody has asked to go home.' },
    { id: 'c13swerve', req: S => S.phase === 'build' && S.week <= 3 && G.Robot.refs(S).some(r => r.id === 'bp') && !(S.robot.design.drive && S.robot.design.drive.ver) && G.Parts.count(S, 'swerve') < 4, title: 'A Blueprint with no wheels', body: S => student(S) + ' printed the whole Apex Blueprint and pinned it to the wall. Then someone counted the swerve modules on the shelf: ' + G.Parts.count(S, 'swerve') + ' of 4. The drivetrain page is now pinned next to the Inventory order form.' },
    { id: 'c12ref3', req: S => S.phase === 'build' && S.projects.some(p => p.ref), title: 'Driving a robot that is not built yet', body: S => { const r = D.REFBOTS.find(x => S.projects.some(p => p.ref === x.id)); return 'The real ' + (r ? r.name : 'robot') + ' is still in pieces on the bench, but ' + student(S) + ' has driven its simulator model for three evenings straight and runs the drills with their eyes half shut.'; } },
    { id: 'c12ref2', req: S => inSeason(S) && S.robot && Object.keys(S.robot.design || {}).some(k => { const d = S.robot.design[k]; return d && d.ver >= 3 && D.REFBOTS.some(r => (r.picks[S.year] || {})[k] === d.concept); }), title: 'Not a copy any more', body: S => 'A visitor asked whether that was the published design. ' + student(S) + ' spent ten minutes explaining everything they changed. The visitor did not ask anything else.' },
    { id: 'c12booth', req: S => S.boothT != null && turnNo(S) - S.boothT <= 1, title: 'At the booth', body: S => 'The vendor booth had the parts nobody could get online. ' + student(S) + ' carried them back to the pit like a trophy.' },
    { id: 'c11open', req: S => S.phase === 'champs' || !!(S.event && (S.event.kind === 'champs' || S.event.kind === 'einstein')), title: 'Opening Ceremonies', body: S => 'The drumline started and ' + student(S) + ' was on their feet before anyone else. ' + mentor(S) + ' has been to a dozen Championships and still filmed the whole thing.' },
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
    { id: 'r_pg1', cy: 2016, ph: 'comp', at: [3, 6], title: 'Heard in the pits: a gearbox in a can', body: 'An engineer from Sterling and one from Lumen were seen in the same pit queue this week, both holding a broken student-made gearbox, both taking notes. The rumour is that each company is working on a sealed planetary gearbox that bolts straight to a motor.' },
    { id: 'r_pg2', cy: 2017, ph: 'off', at: [0, 3], title: 'Forum whispers: do not cut gear plates this summer', body: 'A distributor told a team that "something for mechanism gearboxes" is coming from both big vendors before Kickoff. The thread advises against cutting any more gear plates until then.' },
    { id: 'r_sp1', cy: 2017, ph: 'comp', at: [3, 6], title: 'Heard in the pits: a pit that folds up', body: 'One of the top teams arrived at its last event with the whole pit in four road cases: tool walls, a workbench, a television for the scouts. It was open before the team next door had found its extension cord. People took photos.' },
    { id: 'r_lan1', cy: 2022, ph: 'comp', at: [3, 6], title: 'Heard in the pits: Lanternworks is hiring', body: 'Lanternworks posted three job adverts this month, all for machine-learning engineers, and one more for "someone who knows what an AprilTag is". The paper squares at the offseason events are starting to make sense.' },
    { id: 'r_srv', cy: 2022, ph: 'comp', at: [2, 6], title: 'Heard in the pits: where did the air go?', body: 'A pneumatics supplier\'s rep was overheard saying orders are down by a third. The teams that stopped buying are not buying air tanks somewhere else. They are buying servos.' },
    { id: 'r_lan2', cy: 2023, ph: 'off', at: [3, 5], title: 'Forum whispers: a camera that knows where it is', body: 'Beta testers are not allowed to talk about the next Lanternworks camera. One posted a photo of a robot parked within a centimetre of a target with nobody at the controls, and deleted it an hour later.' },
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
    wcdEnd: ['Vendor watch: the last Trailhead', 'Lumen\'s warehouse shipped its last West Coast drive set this spring, to a team that ordered six "for the museum". Nobody makes one now. A West Coast drive still runs on the sets a team already owns, or on Lumen\'s standard drive gearboxes with less speed and less push.'],
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
  // general news that is about your own season or the game's strategy and rules stays in front when background is hidden
  const PLOT = new Set(['n5rules', 'n5impact', 'n5amp', 'n5reef', 'n5hoard', 'meta', 'lastyr', 'award', 'restock', 'champs']);
  function runNews(S, e, bg) { // bg: general news from the NEWS pool (no effect): background unless it takes a reply, names a team or is in PLOT
    if (bg && PLOT.has(e && e.id)) bg = false;
    if (!e) return false;
    named = [];
    const res = e.run(S);
    if (!res) return false;
    seen(S)[e.id] = turnNo(S);
    if (res[2] && res[2].reply) res[2].until = turnNo(S); // replies are open for this turn only (a week in season, a month in the offseason)
    post(S, res[0], res[1], res[2] && res[2].mail ? 'mail' : 'news', Object.assign({}, res[2] || {}, named.length ? { teams: [...new Set(named)] } : {}, bg && !named.length && !(res[2] && res[2].reply) ? { bg: true } : {}));
    return true;
  }
  // Called once per turn
  // ---- Robot reveals (3.1): Build Week 5 to Competition Week 2, the two weeks either side of Week 0 ----
  // Every elite team near you posts one (always in the Inbox), a few elite reveals from elsewhere come through because
  // everyone watches them, and one local rival's. Each message carries a picture of the robot the team will play with.
  const revealWin = S => (S.phase === 'build' && S.week >= 5) || (S.phase === 'comp' && S.week <= 2);
  const winLeft = S => (S.phase === 'build' ? 10 - S.week : 3 - S.week); // turns left in the window, this one included
  // (3.5.2) A reveal exactly as long as the team number: its digits read as a time, the last two the seconds (4756:
  // 47:56, 254: 2:54, 10432: 1:04:32). A number whose digits cannot be a time (1678) is counted in seconds instead.
  N.revealLen = function (n) {
    const ss = n % 100, mm = Math.floor(n / 100) % 100, hh = Math.floor(n / 10000), p = x => String(x).padStart(2, '0');
    if (ss < 60 && mm < 60) return (hh ? hh + ':' + p(mm) : String(mm)) + ':' + p(ss);
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' seconds';
  };
  // a team's reveal style stays the same from year to year: a render that stays up as long as the team number, a
  // cinematic video, a teaser, raw practice footage, a live stream, one picture on the forum with no words, or nothing
  // at all (the picture is somebody's photo from a scrimmage)
  const STYLES = ['render', 'cinematic', 'teaser', 'full', 'stream', 'forum', 'scrim'];
  const styleOf = t => (t.elite && t.num % 11 === 0 ? 'none' : STYLES[(t.num * 11 + Math.floor(t.num / 10) + 3) % STYLES.length]);
  const styleText = (t, a, b, S) => {
    const ago = S && S.phase === 'comp' ? 'before the season started' : 'last weekend'; // scrimmages are around Week 0
    const st = styleOf(t);
    if (st === 'render') { const len = N.revealLen(t.num); return 'The whole reveal is one rendered image of the robot that stays on screen for ' + len + ': their team number, as every year. Nobody skips it. ' + a + ' watched all of it twice and swears the render moved.'; }
    if (st === 'cinematic') return R().pick(['Drone shots, slow motion and a soundtrack that sounds expensive. The robot is on screen for nine seconds in total, and those nine seconds have been looped a thousand times.',
      'A film, not a video: a sunrise, a countdown, sparks in slow motion, and the robot rolling out of fog to a drum hit. ' + a + ' says the fog machine alone must have cost more than our drivetrain.']);
    if (st === 'teaser') return 'Twelve seconds: a wheel, a flash of bumper, a noise that might be a climber. The forum has a frame-by-frame thread and ' + b + ' has posted in it eleven times.';
    if (st === 'full') return 'Eight minutes of uncut practice-field footage, cycle after cycle, no music, no edits. Somehow it is the most frightening one of all.';
    if (st === 'stream') return 'They revealed it live on a stream with ' + R().int(3, 9) + ',' + R().int(100, 999) + ' viewers, then drove it for an hour and answered questions about everything except the intake.';
    if (st === 'forum') return 'No video. One picture on the forum, on a grey background: no title, no caption, not a word. It had ' + R().int(300, 900) + ' replies by morning, ' + R().pick(['most of them arrows and circles drawn on the picture.', 'and somebody has already measured the wheel base from the pixels.', 'and the top one just says "oh no".']);
    if (st === 'scrim') return 'Someone in the stands at a scrimmage ' + ago + ' took this picture and put it online without asking: a little blurry, slightly sideways, and shared more than any reveal video this year. ' + b + ' has it as a phone background "for motivation".';
    return 'The first anyone was meant to see of their robot was a practice field in Week 1, but a parent in the stands at their scrimmage took this blurry photo, and it was everywhere by morning.';
  };
  // what people notice in the picture
  const featureTalk = (S, lk, el) => {
    const c = [];
    if (lk.manip === 'turretlift') c.push(el ? 'A turret on top of an elevator, from an elite team. Everyone is shocked; three teams have already started on one.' : 'A turret on top of an elevator. Nobody knew that was allowed, including, possibly, them.');
    if (lk.shooter === 'turret' || lk.shooter === 'rotor') c.push('The turret keeps the shooter on target the whole time, even while the robot drives the other way.');
    if (['triple', 'arms', 'hook2'].includes(lk.climber)) c.push('Top comment, with nine hundred likes: "I can\'t even tell how their climber works from this."');
    if (lk.drive === 'swerve' && !G.Era.of(S).swerve.cots) c.push('They machined their own swerve modules. ' + (el ? 'Again.' : 'Bold.'));
    else if (lk.drive === 'swerve') c.push('Swerve, of course: the robot drifts sideways through traffic like it is on ice.');
    if (lk.manip === 'elevwrist' || lk.manip === 'dja') c.push('The arm folds into a shape the frame rules never imagined.');
    if (lk.manip === 'elevator' && !c.length) c.push('The elevator goes up in one smooth motion, which this season is a statement.');
    if (lk.shooter === 'wide') c.push('The shooter is as wide as the robot and empties the hopper in about a second.');
    return c;
  };
  const revealLook = (S, t) => {
    const year = S.year; if (!t.rb || t.rb.year !== year) G.AI.seasonRobot(t, year, R());
    const subs = {}; Object.keys(t.rb.choice).forEach(k => { subs[k] = { concept: t.rb.choice[k], ver: Math.min(9, 1 + Math.round(t.rb.q * 3) + (t.rb.elite ? 5 : 0)), stats: {} }; });
    const lk = G.Cap.look(year, subs, { visionLvl: t.rb.visionLvl }), pc = G.AI.paintOf(t.num, !!(t.elite || t.wasElite)); if (pc) { lk.c1 = pc[0]; lk.c2 = pc[1]; } // (3.5.5) a team that paints its robot reveals it in its colour
    if (G.AI.numSide(t.num)) lk.numAt = 'side';
    return lk;
  };
  function postReveal(S, t, kind, mi) {
    const sv = S.season.rev, a = student(S), b = student2(S, a), el = !!t.elite, lk = revealLook(S, t), st = styleOf(t);
    // a still picture or a video; the scrimmage photo and the no-reveal teams' photo were taken by somebody else and leaked
    const leak = st === 'scrim' || st === 'none', still = leak || st === 'forum' || st === 'render';
    sv.done[t.num] = 1;
    const where = mi != null ? away(mi) : 'from ' + (t.home ? D.DISTRICT[t.home].name : t.region);
    const ft = R().shuffle(featureTalk(S, lk, el)).slice(0, 2);
    const react = el ? R().pick(still
      ? ['Every team in the world had seen it before lunch. ' + a + ' says the gearbox is "just a gearbox" and has zoomed in on the gearbox eleven times.', 'By evening there were four forum threads measuring it in pixels and a spreadsheet guessing their cycle time to a tenth of a second.', a + ' put it on the shop TV and the build session stopped for twenty minutes.', 'It has more views than the game animation. ' + b + ' thinks that is fair.', 'Three forum threads are arguing about one bolt in it. ' + b + ' has opinions on the bolt.', a + ' printed it and taped it to the shop door with the words "this is the bar".']
      : ['Every team in the world watched it before lunch. ' + a + ' says the gearbox is "just a gearbox" and has rewatched the gearbox eleven times.', 'By evening there were four "response" videos and a spreadsheet estimating their cycle time to a tenth of a second.', a + ' put it on the shop TV and the build session stopped for twenty minutes.', 'The video has more views than the game animation. ' + b + ' thinks that is fair.', 'Three forum threads are arguing about one bolt in it. ' + b + ' has opinions on the bolt.', a + ' paused it on the best frame, printed it and taped it to the shop door with the words "this is the bar".'])
      : R().pick(still
        ? ['Your students have zoomed in on it ' + R().int(20, 90) + ' times and are "definitely not worried".', a + ' noticed they use the same bearings as you and is taking it as a compliment.', b + ' is already sketching the defense plan on the whiteboard.', a + ' and ' + b + ' have measured it in pixels twice and got two different sizes. Both say it proves ours is better.']
        : ['Your students have watched it ' + R().int(20, 90) + ' times and are "definitely not worried".', a + ' noticed they use the same bearings as you and is taking it as a compliment.', b + ' is already sketching the defense plan on the whiteboard.', a + ' and ' + b + ' have counted their cycles twice and got two different numbers. Both say it proves we are faster.']);
    const nm = t.num + ' ' + t.name, title = kind === 'local' ? (leak ? 'Elite robot leaked: ' : 'Elite reveal: ') + nm : kind === 'far' ? 'Everyone is watching: ' + nm : (leak ? 'Rival robot leaked: ' : 'Rival reveal: ') + nm;
    const rival = kind === 'rival' ? '\n\n' + R().pick(['On paper they are about as strong as you are this year: the team you will be fighting for the same picks.', 'They look about as strong as you this year, and every scout around here knows it.']) : '';
    const opens = st === 'none' ? 'kept to its tradition: no reveal. The robot leaked anyway.' : st === 'scrim' ? 'never posts a reveal, but the robot leaked anyway.' : 'posted its reveal.';
    const body = 'Team ' + nm + (el ? ', one of the elite teams' : '') + ' (' + where + ') ' + opens + ' ' + styleText(t, a, b, S) + (ft.length ? '\n\n' + ft.join(' ') : '') + rival + '\n\n' + react;
    post(S, title, body, el ? 'news' : 'fun', { teams: [t.num], robot: { look: lk, num: t.num } });
  }
  // the local rival: a team near you (not elite) whose robot should be about as strong as yours this season (your robot
  // as it stands; if it is barely built yet, a middling local team)
  function rivalOf(S, sv) {
    const all = G.Geo.nearTeams(S).filter(x => !x.t.elite && !sv.done[x.t.num]), close = all.filter(x => x.mi <= 150), near = (close.length >= 5 ? close : all.filter(x => x.mi <= 250)).slice(0, 30); // within 150 miles when there are enough teams there
    if (!near.length) return null;
    const ps = near.map(x => { const t = x.t; if (!t.rb || t.rb.year !== S.year) G.AI.seasonRobot(t, S.year, R()); return { x, p: G.AI.entry(t, S.year, 0.9, 1, G.makeRng(t.num * 7919 + S.year)).power || 0 }; });
    const mine = G.Robot.powerNow(S), target = mine >= 30 ? mine : ps.map(o => o.p).sort((a, b) => a - b)[ps.length >> 1];
    ps.sort((a, b) => (Math.abs(a.p - target) + a.x.mi / 25) - (Math.abs(b.p - target) + b.x.mi / 25));
    return ps[0].x;
  }
  // your own reveal, once the robot has a few subsystems on it: the views, the top comment and the picture
  function ownReveal(S) {
    const a = student(S), b = student2(S, a), k = Math.max(1, Math.round(S.rep / 10));
    const how = R().pick(['a ninety-second video ' + b + ' edited at 3 a.m., with a drone shot borrowed from a parent', 'one render that stays on screen far too long, "as a tribute"', 'a teaser of a wheel and a bumper, then the whole robot in one slow turn', 'a live stream from the shop that mostly showed the back of ' + a + '\'s head', 'two minutes of practice-field cycles and a drum loop']);
    const top = R().pick(['how is it that fast', 'clean wiring, respect', 'the bumpers are perfect', 'my grandma could drive that (compliment)', 'is that legal??', 'need the CAD please', 'the music choice is elite', 'ok but what does the climber do']);
    post(S, 'Our reveal is live', 'The team posted its robot reveal: ' + how + '. It reached ' + R().int(k, 4 * k) + ',' + R().int(100, 999) + ' views. Top comment: "' + top + '".\n\n' +
      R().pick([a + ' has replied to every comment. Every single one.', 'Two rival teams liked it, which ' + b + ' says is "a statement".', a + ' has watched the view counter more than the robot this week.']), 'fun', { robot: { look: G.Robot.look(S), num: S.team.num } });
  }
  function reveals(S) {
    if (!S.season || !revealWin(S)) return;
    const sv = S.season.rev = S.season.rev || { done: {} }, left = winLeft(S);
    // yours, in every mode (the rest needs the world simulation)
    const R0 = S.robot, subs = R0 && R0.bots && R0.bots[R0.comp || 0] ? R0.bots[R0.comp || 0].subs : {}, built = Object.keys(subs).filter(k => k !== 'soft' && subs[k] && subs[k].ver).length;
    if (!sv.mine && built >= 2 && (left <= 1 || R().chance(0.5))) { sv.mine = 1; ownReveal(S); }
    if (!S.cal || !G.World.on(S)) return;
    const Geo = G.Geo, me = Geo.myPos(S), cy = Geo.cyOf(S), area = S.team.home || S.team.region;
    const mi = t => Math.round(Geo.miles(me, Geo.posOf(S, t, cy).xy));
    const el = G.World.elites(S).filter(t => !sv.done[t.num]), local = el.filter(t => G.World.areaOf(t) === area || mi(t) <= 300);
    local.forEach(t => { if (left <= 1 || R().chance(1 / left)) postReveal(S, t, 'local', mi(t)); }); // a local elite reveal always reaches you
    // and three or four from elsewhere, spread over the window: everyone in the world watches the elite teams' reveals
    if (sv.farWant == null) sv.farWant = R().int(3, 4);
    const far = el.filter(t => !local.includes(t)), need = sv.farWant - (sv.far || 0), per = need / left;
    for (let i = 0, k = Math.min(need, Math.floor(per) + (R().chance(per % 1) ? 1 : 0)); i < k; i++) {
      const pool = far.filter(t => !sv.done[t.num]); if (!pool.length) break;
      postReveal(S, R().wpick(pool, t => Math.max(1, (t.str || 85) - 80)), 'far'); sv.far = (sv.far || 0) + 1;
    }
    if (!sv.rival && (left <= 1 || R().chance(1 / left))) { const x = rivalOf(S, sv); if (x) { postReveal(S, x.t, 'rival', x.mi); sv.rival = 1; } }
  }
  // ---- FIRST Tech Challenge (3.1.1): the FTC season runs beside yours ----
  // Its own schedule, never the news lottery. World news (background): the kickoff in September, a midseason look in
  // Build Week 4 and the World Championship in May. With your own FTC teams (FTC Team Space) a report on them five
  // times a season: kickoff, league meets (November), qualifier (Build Week 3), state championship (Competition Week 2)
  // and the end of their season (May). Calendar careers only.
  const ftcNum = (rng, y) => rng.int(200, 9000 + (Math.max(2016, Math.min(2026, y)) - 2016) * 1900);
  const ftcSeason = y => (y - 1) + '–' + String(y).slice(2);
  // the FTC game of the season ending in year y: the real one, or in a random-order career one of the eleven shuffled on
  // their own (never paired with the FRC game, which would give away next season's FRC game in September)
  function ftcGame(S, y) {
    const F = S.ftc = S.ftc || { done: {} }, i = D.FTC_GAMES.findIndex(g => g.y === y);
    if (i < 0) return null;
    if (!G.Career.isFictional(S)) return D.FTC_GAMES[i];
    if (!F.order) F.order = R().shuffle(D.FTC_GAMES.map((g, k) => k));
    return D.FTC_GAMES[F.order[i]];
  }
  N.ftcGame = ftcGame;
  // your FTC teams this season: how strong (p, 0-1) from the program's year (its maturity: New, Growing, Established),
  // the FTC Team Space and its focus; a team in its first FTC season (a rookie team) a little less. yr: its FTC season.
  function ftcMine(S, y) {
    const F = S.ftc, own = (S.programs || []).filter(p => p.own);
    if (F.cur && F.cur.y === y) { F.cur.teams = F.cur.teams.filter(t => own.some(p => p.id === t.id)); return F.cur.teams; }
    const lvl = Math.max(1, G.Shop.lvl(S, 'ftc') || 1), fb = { drive: 0.06, tech: 0.06, strat: 0.03, balanced: 0.03, outreach: -0.03 };
    F.cur = { y, teams: own.map(pg => {
      if (!pg.ftcNum) pg.ftcNum = Math.max(200, ftcNum(R(), y) - R().int(0, 600));
      pg.ftcSeasons = (pg.ftcSeasons || 0) + 1;
      const yr = pg.ftcSeasons, m = G.Career.programMaturity(pg);
      return { id: pg.id, name: pg.name, num: pg.ftcNum, yr, stage: G.Career.programStage(pg), out: pg.focus === 'outreach', p: U.clamp(0.12 + 0.55 * m + 0.08 * (lvl - 1) + (fb[pg.focus] || 0) - (yr === 1 ? 0.05 : 0) + R().norm(0, 0.12), 0.05, 0.97) };
    }) };
    return F.cur.teams;
  }
  const ftcYr = t => (t.yr === 1 ? 'rookie season' : U.ord(t.yr || 1) + ' season');
  const ftcName = t => 'FTC ' + t.num + ' ' + t.name + (t.yr ? ' (' + ftcYr(t) + ')' : '');
  const ftcAward = t => (R().chance(t.out ? 0.45 : 0.22) ? (R().chance(t.p * 0.45) ? 'Inspire' : R().pick(D.FTC_AWARDS)) : null);
  function ftcWorld(S, y, key) {
    const g = ftcGame(S, y); if (!g) return;
    const rng = R(), when = ftcSeason(y);
    if (key === 'kick') post(S, 'FTC kickoff: ' + g.name, 'The FIRST Tech Challenge revealed its ' + when + ' game, ' + g.name + '. ' + g.desc + (ftcEraNew(y) ? '\n\nNew this season: ' + ftcEraNew(y).text : '') + (D.FTC_RULES.find(r => r.y === y) ? '\n\nRule change: ' + D.FTC_RULES.find(r => r.y === y).text : '') + '\n\nFTC robots are smaller (18 inches to a side) and play two against two on a 12-foot field. Many of your future students are watching this reveal from a middle-school classroom.', 'ftc', { bg: true });
    else if (key === 'mid') {
      const t = ftcNum(rng, y), mech = rng.pick(['a two-stage linear slide', 'a four-bar arm', 'a roller intake as wide as the robot', 'a flywheel shooter', 'a passive funnel and a fast drivetrain', 'a claw on a rotating wrist']);
      post(S, 'FTC midseason: ' + g.name, 'Halfway through the ' + when + ' FTC season, team ' + t + ' ' + D.teamName(rng) + ' tops the world rankings. The robot everyone copies handles the ' + g.bits + ' with ' + mech + ', and the forums are arguing about whether it is legal, as every year.', 'ftc', { bg: true });
    } else if (key === 'worlds') {
      const CH = G.Era.champs(y), al = () => [0, 1, 2].map(() => ftcNum(rng, y) + ' ' + D.teamName(rng));
      const one = c => 'In ' + c + ': ' + (a => a[0] + ', ' + a[1] + ' and ' + a[2])(al()) + '. Inspire Award: ' + ftcNum(rng, y) + ' ' + D.teamName(rng) + '.';
      post(S, 'FTC World Championship: ' + g.name, 'The ' + when + ' FIRST Tech Challenge World Championship' + (CH.n > 1 ? 's are' : ' is') + ' over. The winning alliance' + (CH.n > 1 ? 's' : '') + ':\n\n' + CH.cities.map(one).join('\n') + '\n\nThe Inspire Award is FTC\'s highest honour: the team that best shows what the program stands for.', 'ftc', { bg: true });
    }
  }
  function ftcReport(S, y, key) {
    if (key === 'end' && !(S.ftc && S.ftc.cur && S.ftc.cur.y === y)) return; // no season of ours to review
    const g = ftcGame(S, y), ts = ftcMine(S, y); if (!g || !ts.length) return;
    const m = mentor(S), one = ts.length === 1, they = one ? 'it' : 'they';
    let title = 'Our FTC teams', body = '';
    if (key === 'kick') {
      title = 'Our FTC teams: ' + g.name; body = 'Down the hall, ' + (one ? 'our FTC team' : 'our ' + ts.length + ' FTC teams') + ' watched the ' + g.name + ' reveal: ' + ts.map(t => ftcName(t) + (/^[AEIOU]/.test(t.stage) ? ', an ' : ', a ') + t.stage.toLowerCase() + ' program').join('; ') + '. ' + g.desc + (ts.some(t => t.yr === 1) ? ' For the rookies it is their first game ever: they spent the afternoon learning what a match is.' : '') + (ftcEraNew(y) ? ' ' + ftcEraNew(y).ours : '') + '\n\n' + m + ' has already been asked to judge a "which intake is better" argument. ' + student(S) + ' volunteered to mentor them on Thursdays.';
    } else if (key === 'league') {
      title = 'Our FTC teams: league meets'; body = 'After the fall league meets:\n\n' + ts.map(t => { const w = Math.round(10 * U.clamp(0.2 + 0.65 * t.p + R().norm(0, 0.1), 0, 1)), n = R().int(8, 14), rk = U.clamp(Math.round(1 + (1 - t.p) * (n - 1) + R().norm(0, 1.5)), 1, n); t.league = { w, rk, n }; return ftcName(t) + ': ' + w + '–' + (10 - w) + ', ' + U.ord(rk) + ' of ' + n + ' in the league.'; }).join('\n') + '\n\n' + R().pick(['The FRC drivers watched the last meet and are now very quiet about their own cycle times.', 'One of their robots is held together with more zip ties than ours, which ' + student(S) + ' calls "inspiring".']);
    } else if (key === 'qual') {
      title = 'Our FTC teams: the qualifier'; body = ts.map(t => {
        const n = R().int(24, 36), rk = U.clamp(Math.round(1 + (1 - t.p) * (n - 1) + R().norm(0, 3)), 1, n), won = rk <= 4 ? R().chance(0.25 + 0.5 * t.p) : rk <= 12 && R().chance(0.12 * t.p), aw = ftcAward(t);
        t.adv = won || aw === 'Inspire' || rk <= 3 || (!!aw && R().chance(0.4)) || (rk <= 8 && R().chance(0.2));
        const de = y >= 2025, fin = !won && rk <= 8 && R().chance(0.35), third = !won && !fin && rk <= 10 && R().chance(0.3); // the playoffs: best-of-three series, from 2024–25 double elimination
        t.qual = { rk, n, won, aw, how: won ? (de ? 'won the double-elimination playoffs' : 'on the winning alliance') : fin ? (de ? 'finalists, through the lower bracket' : 'finalists') : null,
          ap: y >= 2026 ? Math.round(2 + 14 * (n - rk) / (n - 1)) + (won ? 40 : fin ? 20 : third ? 10 : 0) + (aw ? (aw === 'Inspire' ? 30 : 12) : 0) : null }; // 2025–26: advancement points (D.FTC_RULES)
        return ftcName(t) + ': ranked ' + U.ord(rk) + ' of ' + n + (t.qual.how ? ', ' + t.qual.how : '') + (t.qual.ap != null ? ', ' + t.qual.ap + ' advancement points' : '') + (aw ? ', ' + aw + ' Award' : '') + '. ' + (t.adv ? 'On to the state championship!' + (t.yr === 1 ? ' As a rookie team!' : '') : 'Their season ends here' + (t.yr === 1 ? ': a first season is for learning.' : '.'));
      }).join('\n') + (ts.some(t => t.adv) ? '\n\nThe FRC team cheered from the stands: ' + student(S) + ' lost their voice.' : '\n\n' + m + ': "Next year. And they learned more this season than we did."');
    } else if (key === 'state') {
      const go = ts.filter(t => t.adv); if (!go.length) return;
      title = 'Our FTC teams: state championship'; body = go.map(t => {
        const won = R().chance(0.05 + 0.35 * t.p * t.p), fin = !won && R().chance(0.15 + 0.3 * t.p), aw = ftcAward(t), res = won ? 'state champions' : fin ? 'finalists' : 'out in the ' + R().pick(['semifinals', 'quarterfinals']);
        t.worlds = won || aw === 'Inspire' || (fin && R().chance(0.35)); t.state = { res, aw };
        return ftcName(t) + ': ' + res + (aw ? ', ' + aw + ' Award' : '') + '. ' + (t.worlds ? 'They are going to the World Championship!' + (t.yr === 1 ? ' In their rookie season.' : '') : 'Their season is over, and a good one.');
      }).join('\n');
    } else if (key === 'end') {
      // after the Championship: the season review, every team's whole season, its program year and what comes next
      const go = ts.filter(t => t.worlds);
      go.forEach(t => { const div = R().chance(0.03 + 0.15 * Math.pow(t.p, 3)), champ = div && R().chance(0.25), rk = U.clamp(Math.round(1 + (1 - t.p) * 35 + R().norm(0, 5)), 1, 36); t.wres = champ ? 'WORLD CHAMPIONS' : div ? 'division champions, then out on the Einstein of FTC' : rk <= 4 ? 'ranked ' + U.ord(rk) + ' in their division, then out in the division playoffs' : 'ranked ' + U.ord(rk) + ' of 36 in their division'; t.wtop = champ ? 2 : div ? 1 : 0; });
      const pgOf = t => (S.programs || []).find(p => p.id === t.id), next = t => { const pg = pgOf(t); return pg ? G.Career.programStage({ years: (pg.years || 0) + 1 }) : t.stage; };
      // what the season does for next September's recruits: a run that went far draws more and better students to the
      // program (pg.ftcBoost, used by C.programPower at the September intake, then cleared)
      const fo0 = G.Career.feederOutlook(S);
      ts.forEach(t => { t.boost = t.wtop === 2 ? 0.35 : t.wtop === 1 ? 0.3 : t.wres ? 0.2 : t.state ? (/champions/.test(t.state.res) ? 0.15 : 0.1) : t.qual && (t.qual.won || t.qual.aw) ? 0.05 : 0; const pg = pgOf(t); if (pg) pg.ftcBoost = t.boost; });
      const fo1 = G.Career.feederOutlook(S), AT = { drive: 'driving', aware: 'awareness', comp: 'composure', mech: 'mechanisms', hp: 'human player', strat: 'strategy' };
      const ups = Object.keys(AT).map(k => ({ k, a: fo0.attr[k], b: fo1.attr[k] })).filter(x => Math.round(x.b) > Math.round(x.a)).sort((p, q) => (q.b - q.a) - (p.b - p.a)).slice(0, 3);
      const recruits = ts.some(t => t.boost) ? 'Next September\'s recruits: ' + (Math.round(fo1.share * 100) > Math.round(fo0.share * 100) ? Math.round(fo1.share * 100) + '% of core recruits come through your programs (from ' + Math.round(fo0.share * 100) + '%), and ' : '') + (ups.length ? 'the average recruit\'s skill bonus rises: ' + ups.map(x => AT[x.k] + ' +' + Math.round(x.a) + ' → +' + Math.round(x.b)).join(', ') + '.' : 'a little more talent from the FTC teams.') + ' This lift is for that intake only (Team page, Feeder programs).'
        : 'Next September\'s recruits: no lift from this season. A run to the state championship or beyond draws more and better students to a program.';
      const line = t => { const r = [];
        if (t.league) r.push('league ' + t.league.w + '–' + (10 - t.league.w) + ' (' + U.ord(t.league.rk) + ' of ' + t.league.n + ')');
        if (t.qual) r.push('qualifier ' + U.ord(t.qual.rk) + ' of ' + t.qual.n + (t.qual.how ? ', ' + t.qual.how : t.qual.won ? ', winning alliance' : '') + (t.qual.ap != null ? ', ' + t.qual.ap + ' advancement points' : '') + (t.qual.aw ? ', ' + t.qual.aw + ' Award' : ''));
        if (t.state) r.push('state: ' + t.state.res + (t.state.aw ? ', ' + t.state.aw + ' Award' : ''));
        if (t.wres) r.push('World Championship: ' + t.wres);
        return ftcName(t) + (/^[AEIOU]/.test(t.stage) ? ', an ' : ', a ') + t.stage.toLowerCase() + ' program:\n  ' + (r.length ? r.join(' · ') : 'joined during the season: no events this year') + '.\n  Next season: ' + (next(t) === t.stage ? 'still ' + t.stage.toLowerCase() : 'it grows to ' + next(t).toLowerCase()) + (t.yr === 1 ? ', and no longer rookies' : '') + '. Pull on next fall\'s recruits: ' + (t.boost ? '+' + Math.round(t.boost * 100) + '% for this season' : 'unchanged') + '.'; };
      const best = go.some(t => t.wtop === 2) ? 'One of our FTC teams won the World Championship. The whole shop is wearing their T-shirts.' : go.some(t => t.wtop === 1) ? 'A division title at Worlds: a season nobody here will forget.' : go.length ? 'Worlds! ' + m + ' watched every match on the stream: "Some of them will be on our drive team in three years. Remember this."' : ts.some(t => t.state) ? 'A state championship run, and a long list of ideas for next year.' : 'No trophies this time, but every one of them can now build, wire and drive a robot.';
      title = 'FTC season review: ' + g.name; body = 'The ' + ftcSeason(y) + ' FTC season is over. How our ' + (one ? 'team' : ts.length + ' teams') + ' did:\n\n' + ts.map(line).join('\n\n') + '\n\n' + best + ' ' + R().int(2, 6) + ' of ' + (one ? 'its' : 'their') + ' eighth-graders have already asked when they can join the FRC team.\n\n' + recruits;
    }
    if (body) post(S, title, body, 'ftc', { plot: true });
  }
  // the vendors go after FTC too: one launch each October, from a vendor that exists that year (y: the FTC season's end).
  // What they sell follows FTC's technology (D.FTC_ERAS); in the season an era begins, a launch that goes with it comes first.
  const ftcEraAt = y => D.FTC_ERAS.filter(e => e.y <= y).pop() || null, ftcEraNew = y => D.FTC_ERAS.find(e => e.y === y) || null;
  const FTC_VEND = [
    { id: 'sterling', ok: y => y <= 2019, era: 'android', title: () => 'Sterling Motion mails an FTC catalogue', body: () => 'Sterling Motion sent out its first FTC catalogue: the same brushed motors, only smaller, phone mounts in three colours, and the same carpeted booth, now at FTC qualifiers too. The prices are "premium, as always". The middle-school teams are buying them anyway, because their mentors did.' },
    { id: 'apex', ok: y => y >= 2020 && y < 2025, title: () => 'Apex Motion launches Apex Mini for FTC', body: () => 'Apex Motion has an FTC motor: Apex Mini, palm-sized, with an encoder built in and the same software as its big brother. The founder says FTC kids broke more Sterling parts than anyone, so they deserve better ones. The launch video has more views than some FRC reveals.' },
    { id: 'apexodo', ok: y => y >= 2025, era: 'odometry', title: () => 'Apex Motion: an odometry computer for FTC', body: () => 'Apex Motion\'s new FTC board reads two small dead wheels and an IMU and tells the robot where it is on the field, a hundred times a second. "Path following used to be a senior project," the founder says. "Now it is a cable."' },
    { id: 'lumen', ok: () => true, era: 'controlhub', title: y => (y >= 2021 ? 'Lumen Robotics: a control hub for FTC' : 'Lumen Robotics: an expansion hub for FTC'), body: y => (y >= 2021 ? 'Lumen Robotics released an FTC control hub with the Android computer built in: no phone on the robot, at a price a middle-school team can pay.' : 'Lumen Robotics released an FTC expansion hub: motors, servos and sensors on one board, still with a phone on the robot, at a price a middle-school team can pay.') + ' Lumen\'s FRC customers recognise the colour of the case.' },
    { id: 'lantern', ok: y => y >= 2018, era: 'visionportal', title: () => 'Lanternworks: Lantern Pocket for FTC', body: y => 'Lanternworks shrank its camera for FTC: Lantern Pocket is the size of a matchbox and ' + (y >= 2023 ? 'reads AprilTags on board, so the robot knows where it is without the hub doing the maths.' : 'finds the vision targets and game pieces on its own.') + ' FTC robots can now line up a shot the way FRC robots do, and the FTC forums are already arguing about whether that is fair.' },
    { id: 'cots', ok: () => true, title: () => 'A slide kit in every FTC box', body: () => 'One of the COTS suppliers released a modular linear-slide kit for FTC: aluminium channel, pulleys and a string kit that bolts together in an afternoon. Half the FTC robots at the next qualifier will have one, and so will a few FRC prototypes.' }
  ];
  function ftcVendor(S, y) {
    const F = S.ftc, used = F.vend = F.vend || [], ok = FTC_VEND.filter(v => v.ok(y)), en = ftcEraNew(y);
    if (!ok.length) return;
    const tied = en && ok.find(v => v.era === en.id), fresh = ok.filter(v => !used.includes(v.id));
    const v = tied || (fresh.length ? R().pick(fresh) : ok.sort((a, b) => used.lastIndexOf(a.id) - used.lastIndexOf(b.id))[0]);
    used.push(v.id); const own = ftcMine(S, y).length;
    post(S, 'Vendor news: ' + v.title(y), v.body(y) + (tied ? ' It is out just in time for ' + en.name + '.' : '') + (own ? '\n\nOur own FTC teams have already asked ' + mentor(S) + ' for two.' : ''), 'news', own ? { plot: true } : { bg: true });
  }
  // Is the FTC game a hint at ours? The team argues in October and finds out at Kickoff. Since 2018–19 FTC and FRC share
  // a season theme (D.FTC_GAMES theme), so in real order the guess comes true; in a random-order career the FTC game is
  // drawn on its own, so it is right only by chance, and the October talk never names the next FRC game.
  function ftcHint(S, y) {
    const g = ftcGame(S, y); if (!g) return;
    const a = student(S), b = student2(S, a), m = mentor(S);
    const th = y >= 2019 && g.theme ? g.theme : null; // the shared season themes start with the 2018–19 season (calendar)
    S.ftc.guess = { y, gy: g.y, ftc: g.name, theme: th, who: a, doubt: b };
    post(S, 'Is the FTC game a hint?', a + ' is sure of it: "' + (th ? g.name + ' is all about ' + th + ', and FTC and FRC share a season theme now. Our game in January is about ' + th + ' too. I am already sketching."' : 'Every year somebody says the FTC game gives ours away. ' + g.name + ' has ' + g.bits + ' in it, so I say we get ' + g.bits + ' too."') + '\n\n' +
      b + ' is not having it: "FTC robots are 18 inches wide and play on a 12-foot field. Even when the theme matches, the game does not. We learn nothing until January."\n\n' +
      m + ': "Write your guesses on the whiteboard. Closest one gets first pick of the Kickoff donuts."', 'fun', { plot: true });
  }
  N.ftcHintCheck = function (S) { // at Kickoff: was the guess right?
    const q = S.ftc && S.ftc.guess, C = G.Career; if (!q || q.y !== C.cy(S) || q.told) return;
    q.told = true;
    const fr = (G.Seasons[S.year] || {}).name || 'this game', right = !!q.theme && q.gy === S.year;
    post(S, 'Was the FTC game a hint?', right ? q.who + '\'s guess on the whiteboard was right: ' + fr + ' shares its theme, ' + q.theme + ', with ' + q.ftc + '. The robots could not be more different, but ' + q.who + ' got the first donut and has not stopped talking about it.'
      : q.theme ? 'The whiteboard said ' + q.theme + '. ' + fr + ' has nothing to do with it. ' + q.doubt + ' erased the whiteboard with great ceremony and took the first donut.'
      : 'No link again: ' + fr + ' has nothing in common with ' + q.ftc + ' except the carpet. ' + q.doubt + ' says "told you" about once an hour.', 'fun', { plot: true });
  };
  function ftc(S) {
    if (!S.cal || S.mode !== 'career') return;
    const F = S.ftc = S.ftc || { done: {} }, once = (k, f) => { if (!F.done[k]) { F.done[k] = 1; f(); } };
    if (S.phase === 'off') {
      const mo = month(S), next = S.upcoming < S.cal.length ? S.cal[S.upcoming] : null, cy = G.Career.cy(S);
      if (mo === 'May') once('w' + cy, () => { ftcWorld(S, cy, 'worlds'); ftcReport(S, cy, 'end'); });
      if (S.lostYear && S.offYear === 2021) once('w2020', () => ftcReport(S, 2020, 'end')); // the review the jump to 2021 skipped
      if (S.lostYear && S.offYear === 2021) once('lost', () => { const g = ftcGame(S, 2021); if (g) post(S, 'FTC in the lost year: ' + g.name, 'While there was no FRC season, the FIRST Tech Challenge played ' + g.name + ' at remote events. ' + g.desc + ' Teams ran their matches alone on half-fields in garages and classrooms and sent in the scores.' + (ftcEraNew(2021) ? ' It was also the year ' + ftcEraNew(2021).name + ' arrived: ' + ftcEraNew(2021).text.replace(/^[^:]*: /, '') : '') +(ftcMine(S, 2021).length ? '\n\nOur own FTC teams did it in the shop parking lot, with an extension cord and a tarp.' : ''), 'ftc', { bg: true }); });
      if (mo === 'Sep' && next) once('k' + next, () => { ftcWorld(S, next, 'kick'); ftcReport(S, next, 'kick'); });
      if (mo === 'Oct' && next) once('v' + next, () => ftcVendor(S, next));
      if (mo === 'Oct' && next) once('h' + next, () => ftcHint(S, next));
      if (mo === 'Nov' && next) once('l' + next, () => ftcReport(S, next, 'league'));
      return;
    }
    const cy = G.Career.cy(S);
    if (S.phase === 'build' && S.week === 3) once('q' + cy, () => ftcReport(S, cy, 'qual'));
    if (S.phase === 'build' && S.week === 4) once('m' + cy, () => ftcWorld(S, cy, 'mid'));
    if (S.phase === 'comp' && S.week === 2) once('s' + cy, () => ftcReport(S, cy, 'state'));
  }
  N.revealWin = revealWin;
  N.item = id => EVENTS.concat(NEWS, CHAT).find(x => x.id === id) || null; // for the developer tools and tests
  N.turn = function (S) {
    S.newsTurn = turnNo(S) + 1;
    // at least one news item: now and then one with an effect, otherwise a story about the FRC world or your program
    let got = false;
    if (R().chance(0.17)) got = runNews(S, pickT(S, EVENTS, 10));
    for (let k = 0; k < 4 && !got; k++) got = runNews(S, pickT(S, NEWS, 12), true);
    if (R().chance(0.2)) runNews(S, pickT(S, NEWS, 12), true);
    seasonTalk(S); // this game's big argument, once a season
    // in season, about one week in four: a vendor warns that a part will be gone next week (its own roll, not the news lottery)
    if ((S.phase === 'build' || S.phase === 'comp') && R().chance(0.25) && !(seen(S).restock >= turnNo(S) - 1)) { const e = NEWS.find(x => x.id === 'restock'); if (e && e.req(S)) runNews(S, e); }
    reveals(S);   // robot reveals around Week 0: every elite team near you, a few famous ones, a local rival
    ftc(S);       // the FTC season beside yours: world news, and your own FTC teams
    // the outside feeder programs the team can run (3.1.1): say so when an outreach mentor or reputation opens one more
    { const fc = G.Career.feederCap(S).n; if (S.fcSeen != null && fc > S.fcSeen && S.mode === 'career') post(S, 'Room for another feeder program', (G.Career.feederCap(S).fr && fc > S.fcSeen ? 'Word about the team gets around: ' : '') + 'a middle school and a library club have asked whether we could run a program with them. ' + G.Career.feederCapWhy(S) + ' (Team page, Feeder programs.)', 'staff'); S.fcSeen = fc; }
    rumours(S);   // what people have heard about the changes the calendar is about to bring
    usedNews(S);  // the second-hand market, the first time it marks a kind of part down
    // one to three chatter posts
    const n = 1 + (R().chance(0.45) ? 1 : 0) + (R().chance(0.15) ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const c = pickT(S, CHAT, 16);
      if (!c) break;
      seen(S)[c.id] = turnNo(S);
      named = []; const body = c.body(S);
      post(S, c.title, body, 'fun', named.length ? { teams: [...new Set(named)] } : undefined);
    }
  };
  N.kickoff = function (S) {
    const mf = G.Seasons[S.year].meta;
    if (mf && mf.faults) G.Career.inbox(S, 'Scouting report: what breaks this year', mf.faults + ' Expect brief comms drops at every event; clean wiring and a reliable, well-maintained robot keep them rare and short.', 'info');
    post(S, 'Kickoff watch party', R().int(18, 45) + ' students, ' + R().int(4, 12) + ' ' + D.word('snackBoxes', S) + ' and one very loud reaction when the ' + G.Seasons[S.year].name + ' field appeared on screen. ' + student(S) + ' has already sketched three robots on a napkin.', 'fun');
    N.ftcHintCheck(S); // October's whiteboard guess from the FTC game
  };
  // The published designs in the team's own words (calendar careers from 2018): the argument at the start of Build
  // Week 1 (wait for them, or build our own?), a first look when they are out (Week 2), and a follow-up in Week 3 that
  // depends on what the team did.
  N.refTalk = function (S, stage) {
    const Rb = G.Robot, C = G.Career, and = l => (l.length > 1 ? l.slice(0, -1).join(', ') + ' and ' + l[l.length - 1] : l[0] || '');
    const rs = stage === 'wait' ? Rb.refsSoon(S) : Rb.refs(S); if (!rs.length || !S.robot) return;
    // three voices with different first names: two students and a mentor
    const m = mentor(S), stu = S.students.filter(s => first(s.name) !== first(m)), pk = not => { const l = stu.filter(s => first(s.name) !== not); return l.length ? first(R().pick(l).name) : 'another student'; };
    const year = S.year, R0 = S.robot, a = pk(null), b = pk(a), v = C.cy(S) % 2;
    const subName = k => G.Seasons.sub(year, k).name.toLowerCase(), names = and(rs.map(r => 'the ' + r.name));
    // the team's own mechanisms: built, or a build running (robot code does not count)
    const own = [...new Set(S.projects.filter(p => p.type === 'build' && !p.ref).map(p => p.sub).concat(Object.keys(R0.design).filter(k => R0.design[k] && R0.design[k].ver)))].filter(k => k !== 'soft');
    const wk = C.turnHours(S), sv = rs.map(r => ({ r, s: Rb.refSave(S, r).save })).sort((x, y) => y.s - x.s), top = sv[0];
    if (stage === 'wait') {
      if (!own.length) C.inbox(S, 'Wait for ' + names + ', or build our own?', 'The team spent the whole meeting arguing about ' + names + ', out at the start of Build Week 2.\n\n' +
        a + ' wants to start now: "' + (v ? 'We know this game better than any video will. Every week we wait is a week we are not building, and a robot we designed is one we know how to fix.' : 'We did not join a robotics team to build somebody else\'s robot. If we start today, ours is half done by the time theirs is out.') + '"\n\n' +
        b + ' wants to wait: "Copying the whole ' + top.r.name + ' saves about ' + top.s + ' hours, ' + (top.s >= 1.15 * wk ? 'more than a week of our time' : top.s >= 0.85 * wk ? 'about a week of our time' : top.s >= 0.5 * wk ? 'a good part of a week' : 'a few days of our time') + '. It starts as a version 2, and the drivers can practise on its simulator model while we build it."\n\n' +
        m + ' had the last word: "It is your call. If we wait, this week goes to a test chassis, the drive code and the program projects, or we go home on time for once and push hard in Week 2. If we start, we start now. Decide by the end of the week." (Design Office)', 'staff');
      else C.inbox(S, 'Should we have waited?', 'Not everyone is sure about starting at Kickoff. ' + a + ' asked at the meeting whether we should have waited for ' + names + ': "Copying the whole ' + top.r.name + ' saves about ' + top.s + ' hours. We could have spent those on upgrades."\n\n' +
        b + ' disagrees: "Our ' + (own.length > 3 ? own.slice(0, 3).map(subName).join(', ') + ' and the rest' : and(own.map(subName))) + ' ' + (own.length > 1 ? 'are' : 'is') + ' already under way. By the time theirs is out, ours is half built, and it is ours."\n\n' +
        m + ': "Both of you are right. We look at theirs next week and compare. If one of their subsystems is clearly better, we can still switch to it."', 'staff');
      return;
    }
    if (stage === 'out') {
      // the oldest joke in the sport: a good team recommends the simple published robot to everybody else
      const jr = rs.find(x => x.id === 'any') || rs[0], jv = C.cy(S) % 3;
      // a good (not great) team, one you will meet at an event if the schedule says so: the punchline needs them there
      const meet = G.World.on(S) ? [].concat(...(S.registered || []).map(id => G.World.attendees(S, { id: id && id.id ? id.id : id }) || [])) : [];
      const good = t => t.str >= 45 && t.str < 62, jm = meet.map(n => S.teams[n]).filter(t => t && good(t)), jp = others(S).filter(t => t.region === S.team.region && good(t));
      const jt = jm.length ? R().pick(jm) : jp.length ? R().pick(jp) : rivalT(S);
      const joke = jv === 0 ? 'Every team should take a close look at the ' + jr.name + ' this year. It is a fantastic robot and it always plays the game. Not for us, obviously. We are far too good for that.'
        : jv === 1 ? 'Honestly, I would tell any team to start from the ' + jr.name + '. Smartest robot of the year. We will not, of course: we are much too good for it.'
        : 'Great ' + jr.name + ' again this year. I recommend it to every team out there. Every other team, I mean. We are above all that.';
      const jokeP = '\n\nThe top post on the forum this morning, from a mentor on Team ' + jt.num + ' ' + jt.name + ': "' + joke + '" ' + (jv === 0 ? b + ' has printed it and taped it to the shop door.' : jv === 1 ? 'It has 400 likes. ' + a + ' liked it twice.' : m + ' bets they post the same thing next year, and mean it just as much.');
      if (S.season) S.season.joke = { num: jt.num, ref: jr.id };
      if (own.length) {
        // the design closest to ours (most subsystems on the same concept) is the one the team compares with
        const conc = k => (R0.design[k] && R0.design[k].ver ? R0.design[k].concept : (S.projects.find(p => p.sub === k && p.type === 'build') || {}).concept);
        const r = rs.map(x => ({ x, n: own.filter(k => x.picks[year][k] === conc(k)).length })).sort((p, q) => q.n - p.n)[0].x, picks = r.picks[year];
        const same = own.filter(k => picks[k] && conc(k) === picks[k]), diff = own.filter(k => picks[k] && conc(k) !== picks[k]);
        C.inbox(S, 'Theirs and ours', a + ' put the ' + r.name + '\'s CAD on the big screen next to ours. ' + (same.length ? 'Same idea on the ' + and(same.map(subName)) + ', which ' + b + ' calls proof that we got it right. ' : '') +
          (diff.length ? 'Different on the ' + and(diff.map(subName)) + ': ' + (same.length ? a : b) + ' thinks ours is better, ' + m + ' wants to see both on the field first. ' : '') +
          'Anything we have not started yet can still be copied, and a built unit can be switched to theirs for the cost of a switch (Design Office).' + jokeP, 'dev', { plot: true });
      } else {
        const short = rs.map(r => ({ r, pl: Rb.refPlan(S, r) })).filter(x => x.pl.miss.length);
        C.inbox(S, 'First look at ' + names, 'The team watched the build videos in the shop over pizza. ' + a + ' printed the parts list and went straight to the shelf: ' + (short.length ? 'for the ' + short[0].r.name + ' we are short of ' + G.Parts.missList(short[0].pl.miss) + ' (Inventory).' : 'everything we need is there.') + ' ' + b + ' had the simulator model running before the second video ended.' +
          (rs.length > 1 ? '\n\nThe argument now is which one. ' + b + ' wants the ' + rs[1].name + ': "It is what the good teams build." ' + a + ' wants the ' + rs[0].name + ': "We can finish it, and then make it ours." ' + m + ': "Whichever we pick, we pick it this week."' : '') +
          '\n\nCopy a whole robot from the window, or single subsystems from the concept chooser (Design Office).' + jokeP, 'dev', { plot: true });
      }
      return;
    }
    // stage 'after' (Build Week 3)
    const copied = Object.keys((S.season && S.season.copied) || {}).concat(S.projects.filter(p => p.ref).map(p => p.sub)), building = S.projects.some(p => p.type === 'build' && p.sub !== 'soft') || own.length > 0;
    if (!building) C.inbox(S, 'Week 3, and nothing on the build list', m + ' put the calendar on the wall at the start of the meeting: Build Week 3, and not one subsystem is being built. "We waited for ' + names + ', and they are out. Copy one today or start our own, but start." (Design Office)', 'staff');
    else if (copied.length) { const r = rs.find(x => S.projects.some(p => p.ref === x.id) || Object.values(S.season.copied || {}).includes(x.id)) || rs[0];
      C.inbox(S, 'A week with the ' + r.name, a + ' says the build videos skip the step where the bolt turns out to be too short, and ' + b + ' has a list of them now. ' + driver(S) + ' has driven the simulator model every evening and claims to know the robot better than the people building it.\n\n' + m + ': "The easy part is nearly done. From here, every upgrade is our own work, and that is where we pull away from the other ' + r.name + 's."', 'dev'); }
    else C.inbox(S, 'Our own robot', m + ' reminded everyone at the meeting that half the field will turn up with ' + names + '. "Ours is different, so it has to be better. Test it, break it, fix it." ' + a + ' has already written "NOT A COPY" on the frame in marker.', 'dev');
  };
  // ...and the punchline, the first time that team turns up at one of your events with a copied robot
  N.refJoke = function (S, t, ev) {
    const j = S.season.joke, was = (D.REFBOTS.find(x => x.id === j.ref) || {}).name || 'Anybot', is = (D.REFBOTS.find(x => x.id === t.rb.ref) || {}).name || was;
    G.Career.inbox(S, 'Too good for it', 'Remember Team ' + t.num + ' ' + t.name + ', far too good for the ' + was + '? At the ' + ev.name + ' their robot was ' + (is === was ? 'the ' + was + ', bolt for bolt.' : 'the ' + is + ', bolt for bolt. Too good for the ' + was + ', maybe.') + ' ' + student(S) + ' took a photo. ' + mentor(S) + ' made everyone promise not to post it, and then laughed for a full minute.', 'fun');
  };
  N.afterEvent = function (S, r) {
    if (!r) return;
    const lines = r.won ? ['The bus ride home was one long chant. ' + driver(S) + ' slept clutching the banner.', 'The group chat has posted the winning-match video 63 times. Nobody is tired of it yet.', mentor(S) + ' let the drive team ring the shop bell. It is not a bell. It is a pot and a wrench.']
      : r.playoffs ? ['The drive team got a standing ovation from the parents in the stands. ' + driver(S) + ' turned bright red.', student(S) + ' is already making a list of "things we fix before next time". It is four pages long.', 'The scouts were right about the opposing alliance. They would like everyone to remember that.']
        : ['Tough event. ' + mentor(S) + ' gave a speech about learning from it that made two people cry, one of them ' + mentor(S).split(' ')[0] + '.', 'The team agreed on three things to fix and ate an entire gas station\'s worth of snacks on the way home.', student(S) + ' spent the ride home re-watching every match and taking notes. The notes are mostly arrows.'];
    post(S, 'After ' + r.name, R().pick(lines), 'fun');
  };
})();
