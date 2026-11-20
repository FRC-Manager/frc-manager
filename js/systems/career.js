'use strict';
/* FRC Manager — career systems: calendar & turns, finance, sponsors, staff, offseason, reviews, qualification */
(function () {
  const U = G.U, D = G.Data;
  const C = G.Career = {};
  const DIVS = ['Archimedes', 'Curie', 'Daly', 'Galileo', 'Hopper', 'Johnson', 'Milstein', 'Newton'];

  // ======================= helpers =======================
  C.inbox = function (S, title, body, kind, extra) {
    S.inbox.unshift(Object.assign({ id: U.uid('i'), title, body, kind: kind || 'info', date: C.dateLabel(S), read: false, tq: S.turnSeq || 0 }, extra || {}));
    // The Inbox keeps D.INBOX_MAX messages (120 until 3.1.1, when a busy season pushed its own messages out). The newest
    // D.INBOX_RECENT always stay. Older than that, background messages (C.msgBg) and lapsed replies go first, then the
    // oldest of the rest, so results, emails and decisions outlast the chatter. A reply still open is never removed.
    if (S.inbox.length > D.INBOX_MAX) {
      const open = m => !!(m.reply && m.replied == null && G.News && G.News.replyOptions(S, m).length), light = m => C.msgBg(m) || (!!m.reply && !open(m));
      while (S.inbox.length > D.INBOX_MAX) {
        let i = -1;
        for (let k = S.inbox.length - 1; k >= D.INBOX_RECENT && i < 0; k--) if (light(S.inbox[k])) i = k;
        for (let k = S.inbox.length - 1; k >= D.INBOX_RECENT && i < 0; k--) if (!open(S.inbox[k])) i = k;
        S.inbox.splice(i < 0 ? S.inbox.length - 1 : i, 1);
      }
    }
  };
  // Background messages (3.1.1): what a player can skip without missing anything about the season. Development reports
  // (projects done, knowledge levels), team chatter and general news (m.bg). A message that names a team, shows a robot,
  // takes a reply, is marked plot or announces a product is never background. The Inbox can hide them (Hide background).
  C.msgBg = m => !m.reply && !m.prio && !m.robot && !m.plot && !m.launch && !(m.teams && m.teams.length) && (!!m.bg || m.kind === 'dev' || m.kind === 'know' || m.kind === 'fun');
  // An email (3.1.1): a letter with From / To / Subject, shown in the Inbox as one
  C.mail = function (S, from, to, subject, body, extra) { C.inbox(S, subject, body, 'mail', Object.assign({ mail: { from, to, subject } }, extra || {})); };
  const leadMentor = S => (S.mentors.length ? S.mentors.slice().sort((a, b) => (b.stars || 0) - (a.stars || 0) || (b.ten || 0) - (a.ten || 0))[0] : null);
  const teamTo = S => 'Everyone on Team ' + S.team.num + ' ' + S.team.name + ': students, mentors and parents';
  const atSchool = S => (S.team.school ? ', ' + S.team.school : ''); // the team's school or organisation, for an address line
  C.leadMentor = leadMentor;
  // (3.5) The lead mentor is the player, under the name given when the game was made (S.team.lead). Every letter from
  // outside the team is addressed to them. (leadMentor above is somebody else: the most senior of the hired mentors.)
  C.leadName = S => (S.team && S.team.lead) || 'Lead Mentor';
  C.leadFirst = S => (S.team && S.team.lead ? String(S.team.lead).split(' ')[0] : 'Lead Mentor');
  const teamAddr = S => C.leadName(S) + ', Team ' + S.team.num + ' ' + S.team.name;
  C.teamAddr = teamAddr;
  // Somebody else a letter also goes to: a mentor, with their post ("Mia Castillo (Business & Outreach Mentor)")
  C.ccMentor = m => (m && m.name ? m.name + ' (' + ((D.MENTOR_ROLES.find(r => r.id === m.role) || {}).name || 'Mentor') + ')' : '');
  C.ccRole = (S, role) => C.ccMentor(S.mentors.find(x => x.role === role));
  // ... by who is writing: a sponsor, a vendor's partnership desk or anybody writing about money copies in the business
  // mentor; an invitation to play copies in the drive coach
  C.mailCc = function (S, from, subject) {
    const f = String(from || ''), s = String(subject || '');
    if (S.sponsors.some(sp => f.indexOf(sp.name) >= 0) || /support fund|finance office|team partnerships|paper|news channel|radio|podcast/i.test(f)) return C.ccRole(S, 'biz');
    if (/Summit Champs|Festival of Champions/i.test(f) || /scrimmage/i.test(s)) return C.ccRole(S, 'coach');
    return '';
  };
  // (3.1.2) A letter from outside the team, as an email to the lead mentor: a greeting, the letter, a sign-off. What it
  // does in the game goes in extra.note, shown under the letter, so the letter itself stays a letter.
  // extra.school: the letter is addressed to the team at its school or organisation (the ones FIRST sends)
  C.letter = function (S, from, subject, text, sign, extra, kind) {
    const ex = Object.assign({}, extra), sch = ex.school, cc = [].concat(ex.cc || C.mailCc(S, from, subject)).filter(Boolean).join('; '); delete ex.school; delete ex.cc;
    const to = teamAddr(S) + (sch ? atSchool(S) : '');
    C.inbox(S, subject, 'Dear ' + C.leadFirst(S) + ',\n\n' + text + '\n\n' + sign, 'mail', Object.assign({ mail: Object.assign({ from, to, subject }, cc ? { cc } : {}) }, ex));
  };
  const board = S => 'The ' + (S.team.school || 'school') + ' school board';
  // the World Champions hear from the mentor of the alliance they beat in the finals
  C.mailChampCongrats = function (S, ev) {
    const F = ev.po && ev.po.matches.find(x => x.id === 'F'); if (!F || F.loser == null) return;
    const fin = ev.alliances[F.loser] || [], cap = fin[0], T = S.teams[cap]; if (!T) return;
    const rng = G.makeRng(cap * 7919 + 17), name = D.personName(rng, T), lead = leadMentor(S), el = !!T.elite;
    // the finals as they were played: every game that counted (replays aside), from the champions' side, with its score
    const cs = F.red === F.winner ? 'red' : 'blue', fs = cs === 'red' ? 'blue' : 'red', W = ['', 'one', 'two', 'three', 'four', 'five'];
    const gs = F.games.filter(g => !g.replay).map(g => ({ w: g[cs], l: g[fs], res: g.winner === cs ? 'won' : g.winner === fs ? 'lost' : 'tie', tb: g.tb || null }));
    const isClose = g => Math.abs(g.w - g.l) <= Math.max(5, Math.round(0.08 * Math.max(g.w, g.l))) || !!g.tb, sc = g => g.w + '–' + g.l;
    const won = gs.filter(g => g.res === 'won'), lost = gs.filter(g => g.res === 'lost'), ties = gs.filter(g => g.res === 'tie'), nClose = gs.filter(isClose).length, last = gs[gs.length - 1];
    const ord = i => ['first', 'second', 'third', 'fourth', 'fifth'][i] || 'next';
    let story;
    if (!lost.length && !ties.length) story = nClose === gs.length ? (W[gs.length] || gs.length).replace(/^./, c => c.toUpperCase()) + ' finals, and ' + (gs.length === 2 ? 'both' : 'all of them') + ' came down to the last few points (' + gs.map(sc).join(', ') + '). Your drive team did not give us one mistake to work with.'
      : nClose ? 'We ran you close in the ' + ord(gs.findIndex(isClose)) + ' final (' + sc(gs.find(isClose)) + '), but you pulled away in the ' + ord(gs.findIndex(g => !isClose(g))) + ' (' + sc(gs.find(g => !isClose(g))) + ').'
      : 'Two finals (' + gs.map(sc).join(', ') + '), and we never found a way back into either of them.';
    else story = (W[gs.length] || gs.length).replace(/^./, c => c.toUpperCase()) + ' finals. ' + (lost.length ? 'We took Final ' + (gs.indexOf(lost[0]) + 1) + ' (' + lost[0].l + '–' + lost[0].w + ' to us)' : 'Final ' + (gs.indexOf(ties[0]) + 1) + ' ended in a tie') + (lost.length && ties.length ? ' and tied Final ' + (gs.indexOf(ties[0]) + 1) : '') + ', and you won ' + (won.length === 2 ? 'the other two' : won.length + ' of them') + ' (' + won.map(sc).join(', ') + '). ' +
      (isClose(last) ? 'The last one came down to the final seconds' + (last.tb ? ' and a tiebreaker' : '') + '. I still have not sat down.' : 'In the last one you left no doubt.');
    const body = 'Hi ' + C.leadFirst(S) + ',\n\n' +
      'Congratulations to you and the whole of ' + S.team.num + ' on the World Championship. ' + story + '\n\n' +
      'Well done this year. ' + (el ? 'We have been on that stage before and we will be on it again, so enjoy the banner while it is the newest one in the building.' : 'We will be back, a little faster and a lot more stubborn.') + ' We\'ll see if you can be as lucky next year.\n\n' +
      'Our students asked me to say one more thing: your pit crew lent us a spare on Friday, and they have not stopped talking about it.\n\n' +
      'See you next April,\n' + name + '\nLead mentor, Team ' + cap + ' ' + T.name;
    C.mail(S, name + ' (lead mentor, Team ' + cap + ' ' + T.name + ')', teamAddr(S), 'Congratulations, and see you next year', body, { teams: [cap] });
  };
  // the Hall of Fame: FIRST writes to the team that won the FIRST Impact Award at the Championship
  C.mailHallOfFame = function (S) {
    const lead = leadMentor(S), cy = C.calYear(S);
    C.mail(S, 'FIRST Robotics Competition (Hall of Fame)', 'Everyone on Team ' + S.team.num + ' ' + S.team.name + atSchool(S) + ': students, mentors and parents', 'Welcome to the FIRST Hall of Fame', 'Dear Team ' + S.team.num + ',\n\n' +
      'Congratulations on the ' + cy + ' FIRST Impact Award. With it, ' + S.team.name + (S.team.school ? ' of ' + S.team.school : '') + ' joins the FIRST Hall of Fame: the teams whose work for their communities, year after year, best shows what this program is for.\n\n' +
      'As a Hall of Fame team you are invited to every future FIRST Championship. You no longer need to qualify: your place is reserved each season, and your team number will be on the Hall of Fame wall at the Championship.\n\n' +
      'Hall of Fame teams are also asked to share what they have learned: a session for other teams at the Championship, and help for the rookie teams near you. We hope you will.\n\n' +
      'Thank you for everything that got you here, and please pass our thanks to ' + C.leadName(S) + ' and every mentor and student who worked on your submission.\n\n' +
      'With our congratulations,\nThe FIRST Robotics Competition team');
  };
  // a mentor who won the Woodie Flowers Award (kind 'wfa') or a Woodie Flowers Finalist Award ('wffa') writes to the team
  C.mailWfaThanks = function (S, mid, name, prof, kind, where) {
    const m = S.mentors.find(x => x.id === mid) || { name, role: 'design' }, role = ((D.MENTOR_ROLES.find(r => r.id === m.role) || {}).name || 'Mentor');
    const w = S.season && S.season.wfa, mf = String(m.name).split(' ')[0], writers = ((w && w.writers) || []).map(s => String(s).split(' ')[0]).filter(f => f !== mf).slice(0, 2), area = prof && prof.area ? prof.area : 'this work';
    const wrote = writers.length ? (writers.length > 1 ? writers[0] + ' and ' + writers[1] : writers[0]) : 'the students who wrote it';
    const body = 'Hi everyone,\n\n' + (kind === 'wfa'
      ? 'I have tried to write this email four times since Einstein. Here is the short version: thank you. The Woodie Flowers Award has my name on it, but it is about you. The committee read your essay about ' + area + ', and every line in it was something one of you figured out on your own after I asked one more question.\n\n' + wrote + ': I know how many evenings that essay took. I read it again on the flight home and had to put my sunglasses on.\n\nNothing changes on Monday. The shop opens at 3:30, the robot still needs a new intake, and I still expect safety glasses on every head. But I will be smiling more than usual, and you will know why.'
      : 'Thank you. When the judges at the ' + (where || 'event') + ' read your essay and called my name, I could not hear the rest over you in the stands. A Woodie Flowers Finalist Award is about a mentor, but it is earned by the students who explain what they learned. ' + wrote + ' did that better than I ever could.\n\nThe award also puts my name in front of the Woodie Flowers committee at the Championship. Whatever happens there, this banner already means more to me than any trophy on our shelf.\n\nSee you at practice. Bring your safety glasses, and maybe some tissues for me.');
    C.mail(S, m.name + ' (' + role + ')', teamTo(S), kind === 'wfa' ? 'Thank you, all of you' : 'About Saturday', body + '\n\n' + m.name.split(' ')[0]);
  };
  // In season (Kickoff → Championship) the team may run up debt down to D.DEBT_LIMIT; the school settles it at the
  // season review at a cost to program support and reputation. In the offseason spending needs cash.
  C.inSeason = S => ['kickoff', 'build', 'comp', 'champs'].includes(S.phase);
  C.afford = function (S, cost) {
    if (!cost || cost <= 0) return null;
    if (C.inSeason(S)) return S.money - cost >= -D.DEBT_LIMIT ? null : 'The school board caps in-season debt at ' + U.money(D.DEBT_LIMIT) + '.';
    return S.money >= cost ? null : 'Not enough money (' + U.money(cost) + ' needed; in the offseason you can only spend cash you have)';
  };
  // Repeat overdrafts cost more: +50% for each consecutive season that ended in debt (S.debtRun), so debt can't be a
  // yearly free budget for permanent investments like facilities.
  C.debtPenalty = (debt, run) => { const m = 1 + 0.5 * Math.min(4, run || 0); return { support: Math.round(Math.min(30, 3 + debt / 1500) * m), rep: Math.round(Math.min(12, 1 + debt / 4000) * m), mult: m }; };
  C.spend = function (S, amt, desc) { amt = Math.round(amt); S.money -= amt; S.ledger.unshift({ d: C.dateLabel(S), desc, amt: -amt, px: C.px(S) }); if (S.season) S.season.spent += amt; if (S.ledger.length > 300) S.ledger.length = 300; };
  C.earn = function (S, amt, desc) { amt = Math.round(amt); S.money += amt; S.ledger.unshift({ d: C.dateLabel(S), desc, amt, px: C.px(S) }); if (S.season) S.season.earned += amt; if (S.ledger.length > 300) S.ledger.length = 300; };
  C.hasPerk = (S, id) => S.sponsors.some(s => s.perk === id);
  C.allMentors = S => S.mentors.concat((S.guests || []).map(g => g.m)); // includes temporary guest mentors
  C.mentorSkill = function (S, role) {
    const ms = C.allMentors(S).filter(m => m.role === role);
    let v = ms.length ? Math.max(...ms.map(m => m.skill)) : 0;
    if (role === 'design' && C.hasPerk(S, 'tempMentor')) v = Math.max(v, 55);
    return v;
  };
  C.mentorStars = (S, role) => { const ms = C.allMentors(S).filter(m => m.role === role); return ms.length ? Math.max(...ms.map(m => m.stars)) : 0; };
  C.coachCalls = function (S, playoff) { const st = C.mentorStars(S, 'coach'); return 3 + (st >= 3 ? 1 : 0) + (st >= 5 ? 1 : 0) + (playoff ? 1 : 0); };
  // Strategy of the adult behind the glass when no student coaches: a Drive Coach mentor, a Strategy mentor at 80%, or any mentor filling in (30)
  C.mentorCoach = S => Math.round(Math.max(C.mentorSkill(S, 'coach'), C.mentorSkill(S, 'strat') * 0.8, 30));
  // Technician (a student): Mechanism speeds up pit repairs, Composure catches pre-match mistakes (wrong code, loose bumper, flat battery…)
  C.techRepair = S => { const t = C.driveTeam(S).tech; return 1 + (t ? t.attr.mech / D.TECH_ROLE.repair : 0); };
  C.techCheck = S => { const t = C.driveTeam(S).tech; return 1 - (t ? t.attr.comp / D.TECH_ROLE.check : 0); };
  // Reputation: gains shrink as it rises, losses count in full
  C.addRep = function (S, v) { if (v > 0) v *= D.REP_GAIN * Math.max(0.1, 1 - S.rep / D.REP_SOFT); S.rep = U.clamp(Math.round((S.rep + v) * 10) / 10, 0, 100); };
  C.coachSkill = function (S) { const dt = C.driveTeam(S); return Math.max(C.mentorSkill(S, 'coach'), dt.coachStrat); };
  C.driveTeam = function (S) {
    const by = id => S.students.find(s => s.id === id);
    const pool = S.students.slice().sort((a, b) => (b.attr.drive + b.attr.comp) - (a.attr.drive + a.attr.comp));
    const fallback = { name: 'Walk-on', attr: { drive: 25, aware: 25, comp: 25, mech: 25, hp: 25, strat: 25 } };
    const driver = by(S.driveTeam.driver) || pool[0] || fallback;
    const operator = by(S.driveTeam.operator) || pool.find(s => s !== driver) || fallback;
    const hp = by(S.driveTeam.hp) || pool.find(s => s !== driver && s !== operator) || fallback;
    const coachSt = S.driveTeam.coach && S.driveTeam.coach !== 'mentor' ? by(S.driveTeam.coach) : null;
    const tech = by(S.driveTeam.tech) || null; // optional fifth member: pit repairs and the pre-match checklist
    const coachStrat = coachSt ? coachSt.attr.strat : Math.max(C.mentorSkill(S, 'coach'), C.mentorSkill(S, 'strat') * 0.8, 30);
    return { driver, operator, hp, coach: coachSt, coachStrat: Math.round(coachStrat), tech };
  };
  C.seasonName = (S, year) => { const gy = year || S.year, s = G.Seasons[gy]; return gy ? C.calYear(S, gy) + ' ' + s.name : ''; };
  C.monthName = S => D.MONTHS[S.month];
  // Calendar year of a season. Real order: the game's own year. Random order: a fictional timeline that counts up from the
  // earliest game year in career order (season 1 = 2022, season 2 = 2023, …) while the games themselves are shuffled.
  C.calYear = function (S, gy) {
    if (gy == null) gy = S && S.year;
    if (S && S.cal && S.order) { const i = S.order.indexOf(gy); return i < 0 || S.cal[i] == null ? gy : S.cal[i]; } // v3: every career carries its calendar
    if (!S || S.orderMode !== 'random' || !S.order || !S.order.length) return gy;
    const i = S.order.indexOf(gy);
    return i < 0 ? gy : Math.min.apply(null, S.order) + i;
  };
  // a timeline of its own: the games shuffled, or a custom career whose games are not all in their own years
  C.isFictional = S => !!(S && S.order && S.order.length > 1 && (S.orderMode === 'random' || (S.orderMode === 'custom' && S.cal && S.order.some((g, i) => g !== S.cal[i]))));
  // Calendar year of the season being played (before the first Kickoff: of the first season). Technology, vendors,
  // prices and formats follow this year, whatever game is being played.
  C.cy = function (S) { if (!S) return null; if (S.cal && S.cal.length) return S.cal[Math.min(S.cal.length - 1, Math.max(0, S.si))]; return C.calYear(S); };
  C.cyNext = S => (S && S.cal && S.upcoming < S.cal.length ? S.cal[S.upcoming] : null); // the season after this one
  // Price index: amounts are kept in 2026 dollars and shown in the current year's dollars. The index steps at each
  // Kickoff; the balance keeps its face value, so savings lose a little buying power every year.
  C.px = S => (S && S.pxY ? D.PRICE_IDX[S.pxY] || 1 : 1);
  C.setPxYear = function (S, y) {
    const a = C.px(S); S.pxY = y; const b = C.px(S);
    if (a !== b) S.money = Math.round(S.money * a / b);
    return b / a;
  };
  C.dateLabel = function (S) {
    if (!S) return '';
    const yr = C.calYear(S) || '';
    switch (S.phase) {
      case 'off': return (S.preseason ? 'Pre-season' : 'Offseason') + ' · ' + D.MONTHS[S.month] + (S.preseason ? '' : ' ' + (S.offYear || yr));
      case 'kickoff': return 'Kickoff · Jan ' + yr;
      case 'build': return (S.week === 7 ? 'Week 0' : 'Build Week ' + S.week) + ' · ' + (S.week <= 4 ? 'Jan' : 'Feb') + ' ' + yr;
      case 'comp': return 'Competition Week ' + S.week + ' · ' + (S.week <= 4 ? 'Mar' : 'Apr') + ' ' + yr;
      case 'champs': return 'Championship · Apr ' + yr;
      case 'review': return 'Season Review · ' + yr;
      case 'end': return 'Career complete';
    }
    return '';
  };

  // ======================= new game =======================
  function newSeasonState(year) {
    return { year: year || null, goals: [], events: [], awards: [], champsQualified: false, champsReason: '', champsPlayoffs: false, einstein: false, worldChamp: false, divWin: false,
      impactDone: false, dcmpQualified: false, impact: 0, outreach: 0, earned: 0, spent: 0, rpSum: 0, qualMatches: 0, matches: 0, faults: 0, legacy: 0, worldFinalist: false, wc: null, cmpImpact: null };
  }
  // Random order: the games shuffled over the calendar. A game with drawIn only lands in those years (STRONGHOLD allows
  // tank drives only: later it would contradict every swerve-era recap and find no drive sets on sale after 2022).
  // Drawn anywhere else, it gives its place to a game the shuffle left out, or, in a ten-season career where nothing is
  // left out, trades places with the game drawn for one of its years.
  // nFan (3.5): that many of the seasons are fantasy games, picked at random and shuffled in with the real ones.
  C.drawGames = function (rng, cal, nFan) {
    const nF = Math.max(0, Math.min(nFan || 0, cal.length, (G.FANTASY_YEARS || []).length));
    let order, spare;
    if (nF) {
      const fan = rng.shuffle(G.FANTASY_YEARS.slice()).slice(0, nF), real = rng.shuffle(G.SEASON_YEARS.slice());
      order = rng.shuffle(fan.concat(real.slice(0, cal.length - nF))); spare = real.slice(cal.length - nF);
    } else { const all = rng.shuffle(G.SEASON_YEARS.slice()); order = all.slice(0, cal.length); spare = all.slice(cal.length); }
    const fits = (gy, i) => { const d = G.Seasons[gy].drawIn; return !d || d.includes(cal[i]); };
    order.forEach((gy, i) => {
      if (fits(gy, i)) return;
      const k = spare.findIndex(x => fits(x, i));
      if (k >= 0) { order[i] = spare[k]; spare[k] = gy; return; }
      const slots = order.map((x, j) => j).filter(j => j !== i && fits(gy, j) && fits(order[j], i));
      if (slots.length) { const j = rng.pick(slots); order[i] = order[j]; order[j] = gy; }
    });
    return order;
  };
  // A custom career (3.5) in random order: the player's own games shuffled over the calendar, each kept to the years it
  // may be played in (a game with drawIn trades places with one drawn for one of its years).
  C.placeGames = function (rng, games, cal) {
    const order = rng.shuffle(games.slice()), fits = (gy, i) => { const d = G.Seasons[gy].drawIn; return !d || d.includes(cal[i]); };
    order.forEach((gy, i) => {
      if (fits(gy, i)) return;
      const slots = order.map((x, j) => j).filter(j => j !== i && fits(gy, j) && fits(order[j], i));
      if (slots.length) { const j = rng.pick(slots); order[i] = order[j]; order[j] = gy; }
    });
    return order;
  };
  // Can these games be played on this calendar: as listed (ordered), or in some order? '' or what is in the way.
  C.gamesFit = function (games, cal, ordered) {
    for (let i = 0; i < games.length; i++) {
      const Sz = G.Seasons[games[i]], d = Sz && Sz.drawIn; if (!d) continue;
      if (ordered ? !d.includes(cal[i]) : !cal.slice(0, games.length).some(y => d.includes(y)))
        return Sz.name + ' can only be played in ' + d.join(' or ') + ': it allows tank drives only, which would not fit the swerve years.';
    }
    return '';
  };
  C.newGame = function (o) {
    const seed = o.seed || ((Date.now() ^ Math.floor(Math.random() * 1e9)) & 0x7fffffff); // o.seed: dev tests only
    G.R = new G.Rng(seed);
    const rng = G.R, P = D.PROFILES[o.profile];
    // The calendar (v3): one season a year from the start year to 2026, except 2021. Real order plays each year's own
    // game; random order shuffles the games (technology, vendors, formats and events still follow the calendar).
    // A fantasy game (3.5) has no year of its own: as a single season it is the 2027 game. A custom career plays the
    // player's own list of games from the start year, as listed or shuffled, and ends when the list does.
    const custom = o.mode !== 'single' && o.order === 'custom' && o.games && o.games.length;
    let cal = o.mode === 'single' ? [G.singleCy(o.year)] : G.calFrom(o.start || (G.startYears(o.order).includes(2022) ? 2022 : G.startYears(o.order)[0]));
    if (o.cal) cal = o.cal.slice(); // dev tests: any calendar under today's games
    let order;
    if (o.mode === 'single') order = [o.year];
    else if (custom) { cal = cal.slice(0, o.games.length); order = o.shuffle ? C.placeGames(rng, o.games, cal) : o.games.slice(0, cal.length); }
    else if (o.order === 'random') order = C.drawGames(rng, cal, o.fantasy);
    else order = cal.every(y => G.Seasons[y]) ? cal.slice() : G.SEASON_YEARS.slice(0, cal.length);
    if (o.games && !custom) order = o.games.slice(); // dev tests
    cal = cal.slice(0, order.length);
    const scen = o.scenario ? D.SCENARIOS.find(s => s.id === o.scenario) : null;
    const S = G.S = {
      v: 1, liveParts: 1, ui: G.uiNew ? G.uiNew() : 'new', mode: o.mode, seed, team: Object.assign({}, o.team), profile: o.profile, diff: o.diff || 'normal', orderMode: custom ? (o.shuffle ? 'random' : 'custom') : o.order || 'real', customGames: !!custom,
      settings: Object.assign({ noFail: false }, o.settings || {}), scenario: scen ? scen.id : null, maxEvents: scen && scen.maxEvents ? scen.maxEvents : 4,
      order, cal, pxY: cal[0], si: -1, upcoming: 0, year: order[0], phase: 'off', month: 5, week: 0, preseason: o.mode === 'career',
      money: scen && scen.money ? scen.money : P.money, ledger: [], morale: scen && scen.morale ? scen.morale : 65, support: P.support, rep: P.rep,
      studentsCount: P.students, students: [], driveTeam: { driver: null, operator: null, hp: null, coach: 'mentor' },
      mentors: [], market: [], equip: { printer: 0, cnc: false, lathe: false, field: null, laptops: false, charger: false, pitcart: false, trailer: false, kb: false },
      parts: { batteries: 4, battHealth: 1, spares: 0 }, // spare parts are bought per season (none before the first one)
      know: {}, usedAreas: {}, robot: null, projects: [], sponsors: [], offers: [], activities: [], regionals: [], registered: [], scrimmage: false,
      offReg: [], event: null, eventsDone: {}, season: newSeasonState(order[0]), history: [], offResults: [], inbox: [], teams: null,
      feeders: 0, programs: [], practiceWeeks: 0, lastTune: 0, lastConf: 0, schoolBase: P.school, legacy: 0, overtime: false, turnHours: 0, actHours: 0,
      lastChamp: null, worldChamps: 0, lateFree: o.mode === 'single',
      fatigue: D.FATIGUE_BASE, autoSpares: true, stemFund: null, actMonth: null
    };
    S.team.rookieYear = o.profile === 'rookie' ? order[0] : null;
    // (3.5) Where the team stands decides what its people are called (D.namesFor), so its home and its school's place
    // are settled before anybody is named (the world's own setup, further down, finds them as they are).
    if (S.cal && o.mode === 'career' && G.World && !o.noWorld) {
      if (S.team.home && !(D.DISTRICT[S.team.home] && D.DISTRICT[S.team.home].from <= cal[0])) S.team.home = null;
      if (!S.team.home && !G.World.regionOpen(S.team.region, cal[0])) S.team.home = D.DISTRICTS.find(d => d.region === S.team.region && d.from <= cal[0] && G.World.wholeArea(d)).id;
      if (!S.team.home) { const dz = G.World.soleDistrict(S.team.region, cal[0]); if (dz) S.team.z = dz.id; }
      if (S.team.home) S.team.region = D.DISTRICT[S.team.home].region;
    } else S.team.home = null;
    // the cities its school points to: the school picked on the New Career page (the name may have been edited since), else by the name
    if (S.team.place === undefined) S.team.place = (D.schoolAt && D.schoolAt(S.team.school)) || null;
    // ... and, for a regional team, the district still to form whose cities those are (the team stands there with
    // the area's other teams, and is asked when the district forms). The New Career page says which; else by the
    // school and the team number (D.startZone). A single season has no districts: every city of the area is open.
    { const worldOn = !!(S.cal && o.mode === 'career' && G.World && !o.noWorld), dz = worldOn && !S.team.home ? G.World.soleDistrict(S.team.region, cal[0]) : null, zs = D.zonesAhead(S.team.region, cal[0], !worldOn);
      const z = S.team.home ? null : dz ? dz.id : S.team.z !== undefined && (!S.team.z || zs.some(d => d.id === S.team.z)) ? S.team.z : D.startZone(S.team.num, S.team.region, cal[0], !worldOn, S.team.school, S.team.place);
      if (z) S.team.z = z; else delete S.team.z; }
    // equipment / knowledge
    P.equip.forEach(e => { if (e === 'printer') S.equip.printer = 1; else if (e !== 'field') S.equip[e] = true; });
    G.Parts.setup(S, rng); // starting parts inventory, vendor release plan, stock
    if (P.equip.includes('field')) S.elemPre[order[0]] = [{ s: 1 }]; // powerhouse: a full field of elements on preorder
    G.Shop.migrate(S); // converts starting equipment into facility levels + condition
    S.shop.shelf.lvl = D.SHELF_START[o.profile] || 0; // the parts room a program starts with
    D.AREAS.forEach(a => S.know[a.id] = 0);
    if (P.know > 0 && !(scen && scen.resetKnow)) {
      const areas = rng.shuffle(D.AREAS.map(a => a.id)).slice(0, P.know === 1 ? 3 : 6);
      areas.forEach(a => S.know[a] = D.KNOW_THRESH[P.know] + rng.int(0, 60) + (P.know >= 2 && rng.chance(0.4) ? 200 : 0));
      if (o.profile === 'powerhouse') S.know.swerve = Math.max(S.know.swerve, 260);
    }
    // students
    const talent = { rookie: -5, established: 5, powerhouse: 15 }[o.profile];
    for (let i = 0; i < 8; i++) S.students.push(D.makeStudent(rng, [9, 10, 10, 11, 11, 12, 12, 11][i], talent));
    autoDriveTeam(S);
    // mentors
    P.mentors.forEach((rng2, i) => {
      const roles = ['design', 'fab', 'prog', 'coach', 'strat', 'biz', 'design'];
      const m = D.makeMentor(rng, roles[i], rng.int(rng2[0], rng2[1]));
      m.contract = rng.int(1, 3); m.paid = true;
      S.mentors.push(m);
    });
    if (scen && scen.dropMentors) S.mentors.splice(0, scen.dropMentors);
    S.mentors.forEach(m => C.mentorMeta(S, m));
    // world
    // world: a v3 career simulates every team and event (regionals and districts); a single season keeps the simple pool
    if (S.cal && o.mode === 'career' && G.World && !o.noWorld) {
      if (S.team.home && !(D.DISTRICT[S.team.home] && D.DISTRICT[S.team.home].from <= cal[0])) S.team.home = null;
      // (3.4.4) an area that is all one district: a team there is in the district once it has formed, and before
      // that it stands in the district's cities and joins with everybody else
      if (!S.team.home && !G.World.regionOpen(S.team.region, cal[0])) S.team.home = D.DISTRICTS.find(d => d.region === S.team.region && d.from <= cal[0] && G.World.wholeArea(d)).id;
      if (!S.team.home) { const dz = G.World.soleDistrict(S.team.region, cal[0]); if (dz) S.team.z = dz.id; }
      if (S.team.home) { S.team.region = D.DISTRICT[S.team.home].region; if (!scen) S.maxEvents = 3; }
      G.World.setup(S, rng);
    } else {
      S.team.home = null;
      S.teams = G.AI.makePool(rng, 620, S.team.num, cal[0]); // team numbers follow the calendar year
      G.AI.addRookies(S.teams, rng, order[0], 12, S.team.num, cal[0]);
    }
    if (!S.team.lead || !String(S.team.lead).trim()) S.team.lead = D.personName(G.makeRng(hashS('lead:' + S.team.num + ':' + S.team.name) || 3), S.team); // (3.5) the lead mentor is you: a name of your own, or one is given (as C.migrate gives an older save)
    C.refreshMarket(S);
    if (!G.World.on(S)) S.regionals = D.makeRegionals(order[0], rng, S.team.region);
    if (o.mode === 'career') {
      C.genOffers(S);
      G.Parts.teaser(S);
      { const eb = C.eraBrief(S); if (eb) C.inbox(S, eb.title, 'What the sport looks like as your career begins:\n\n' + eb.lines.map(x => '• ' + x).join('\n') + '\n\nAll of this changes over the years. The big changes arrive as pop-ups, and a recap after every season tells the story of the year.', 'info'); }
      C.inbox(S, 'Welcome, ' + C.leadFirst(S), 'You are ' + C.leadName(S) + ', lead mentor of ' + S.team.num + ' ' + S.team.name + '. It is October — the first game is revealed in January.\n\nBefore Kickoff: sign sponsors (Finance), hire mentors, buy facilities (Workshop) and parts (Inventory), start pre-season research (Design Office) and register for regionals (Calendar). Press Continue to advance a month.\n\nResearch, the Knowledge Base and the code library (Design Office) are offseason jobs: start them before Kickoff. Research still running at Kickoff ends there with partial credit.', 'info');
      C.inbox(S, ...C.regNotice(S)); // the career starts in October: registration is already open
      C.farSeasonNote(S);
      if (G.World.on(S)) C.wfaSeed(S);
    } else {
      // single season: auto-sign starter sponsors, then kickoff right away
      C.genOffers(S);
      const t = S.offers.filter(x => x.slot === 'title')[0], ps = S.offers.filter(x => x.slot === 'partner').slice(0, o.profile === 'powerhouse' ? 3 : 2);
      [t].concat(ps).forEach(x => x && C.signSponsor(S, x.id, true));
      C.kickoff(S);
    }
    return S;
  };
  function autoDriveTeam(S) {
    const st = S.students.slice();
    const pick = (key) => { st.sort((a, b) => key(b) - key(a)); return st.shift(); };
    const d = pick(s => s.attr.drive * 1.2 + s.attr.comp + s.attr.aware);
    const op = pick(s => s.attr.mech * 1.5 + s.attr.comp);
    const hp = pick(s => s.attr.hp * 2);
    // coach: the best strategist left, unless the adult behind the glass (Drive Coach or Strategy mentor) is better
    const cs = st.slice().sort((a, b) => b.attr.strat - a.attr.strat)[0], coach = cs && cs.attr.strat > C.mentorCoach(S) ? cs : null;
    if (coach) st.splice(st.indexOf(coach), 1);
    const tech = pick(s => s.attr.mech * 1.2 + s.attr.comp * 0.8);
    S.driveTeam = { driver: d && d.id, operator: op && op.id, hp: hp && hp.id, coach: coach ? coach.id : 'mentor', tech: tech ? tech.id : null };
  }
  C.autoDriveTeam = autoDriveTeam;

  // ======================= sponsors =======================
  // Offer sizes depend on difficulty, with a small lift for reputation and last season's results. Title sponsors pay about
  // three times a partner. Powerhouse programs (and very high reputation) draw sponsors who expect wins.
  C.sponsorPerf = function (S) {
    const last = S.history[S.history.length - 1];
    return 0.92 + 0.16 * S.rep / 100 + (last ? Math.min(0.08, (last.legacy || 0) / 2500) : 0);
  };
  C.highExpect = S => S.profile === 'powerhouse' || S.rep >= 80;
  C.genOffers = function (S) {
    const rng = G.R, offers = [];
    const money = D.SPONSOR_DIFF[S.diff] || 1, perf = C.sponsorPerf(S), high = C.highExpect(S);
    const types = Object.keys(D.SPONSOR_TYPES).filter(t => !D.SPONSOR_TYPES[t].special);
    // (3.5) One company, one offer: a list never shows a name twice (no title deal and partner deal from the same
    // company), never a sponsor you have, and never one that left since the last list (C.sponsorLeft): a sponsor that
    // did not renew, or whose contract you ended, stays away for a year.
    const round = S.offerRound = (S.offerRound || 0) + 1, gone = S.sponsorGone || {};
    Object.keys(gone).forEach(n => { if (gone[n] < round) delete gone[n]; });
    // (3.5.1) a renewal offer made since the last list stays on this one; an older one is gone (its company makes no other offer this autumn)
    const keep = (S.offers || []).filter(o => o.renew && (o.renew.round == null || o.renew.round >= round - 1)), lapsed = (S.offers || []).filter(o => o.renew && !keep.includes(o));
    const used = new Set(S.sponsors.map(s => s.name).concat(Object.keys(gone), keep.map(o => o.name), lapsed.map(o => o.name)));
    S.sponsors.map(s => s.name).concat(Object.keys(gone)).forEach(n => { const now = (D.SPONSOR_RENAMED || {})[n]; if (now) used.add(now); }); // a sponsor of an earlier version, under its old name: the same company
    // (3.5) Every company has a city (D.SPONSOR_AT), and a team hears from the companies around it: mostly those
    // close to its own city, then the rest of its land, now and then one from a land next door (D.sponsorRings).
    // (A team whose city cannot be told goes by its home's list, as before.)
    const city = G.Geo && G.Geo.cityOf ? G.Geo.cityOf(S) : '', known = !!(city && D.sponsorRings && G.Geo.hub(city));
    const rings = t => (known ? D.sponsorRings(t, city, used) : { near: D.sponsorPool(t, S.team.home, S.team.region).filter(n => !used.has(n)).map(n => ({ name: n, w: 1 })), land: [], abroad: [] });
    const atHome = t => { const r = rings(t); return r.near.length + r.land.length; }; // the companies of that kind in the team's own land that are free
    const fits = (slot, t) => (slot === 'title' ? !!D.SPONSOR_TYPES[t].title : slot === 'grant' ? !!D.SPONSOR_TYPES[t].grant : !D.SPONSOR_TYPES[t].grant);
    // (3.5) an international company (D.SPONSOR_NAMES): they sponsor teams everywhere, as partners only. Any that is
    // not on this list, among your sponsors or away for a year.
    const intl = () => { const l = []; Object.keys(D.SPONSOR_NAMES).forEach(t => D.SPONSOR_NAMES[t].forEach(n => { if (!used.has(n)) l.push({ name: n, type: t }); })); return l.length ? rng.pick(l) : null; };
    const make = (slot, special) => {
      let tk = special ? special.type : slot === 'title' ? rng.pick(types.filter(t => D.SPONSOR_TYPES[t].title)) : slot === 'grant' ? 'found' : rng.pick(types.filter(t => !D.SPONSOR_TYPES[t].grant));
      let name = special ? special.name : null;
      if (!name && !atHome(tk)) { // every company of that kind in the team's own land is taken, or it has none: another kind that fits the slot
        const alt = types.filter(t => t !== tk && fits(slot, t) && atHome(t));
        if (alt.length) tk = rng.pick(alt);
        else { // nobody at home is left: a partner offer comes from an international company, a title from a land next door (a grant never crosses a border)
          const g = slot === 'partner' ? intl() : null;
          if (g) { tk = g.type; name = g.name; }
          else { const far = []; types.filter(t => fits(slot, t)).forEach(t => rings(t).abroad.forEach(c => far.push({ name: c.name, w: c.w, type: t })));
            if (!far.length && slot === 'title' && known && D.sponsorFar) D.sponsorFar(types.filter(t => fits(slot, t)), city, used).forEach(c => far.push(c)); // ... and, so that there is always a title to sign, from farther still
            if (!far.length) return null; const c = rng.wpick(far, x => x.w); tk = c.type; name = c.name; }
        }
      }
      if (!name) name = D.sponsorDraw ? D.sponsorDraw(rng, rings(tk)) : (rng.pick(rings(tk).near) || {}).name;
      if (!name) return null;
      const T = D.SPONSOR_TYPES[tk];
      used.add(name);
      let base = D.SPONSOR_BASE[slot] * (T.f || 1) * perf * money * rng.range(0.94, 1.06);
      base = Math.round(base / 250) * 250;
      let gids = rng.shuffle(T.goals.slice()).slice(0, slot === 'grant' ? 1 : rng.int(1, 2));
      if (high && slot !== 'grant') { const hard = rng.pick(slot === 'title' ? ['win', 'champs'] : ['playoffs2', 'win']); if (!gids.includes(hard)) gids = [hard].concat(gids).slice(0, 2); }
      if (S.team.home && G.World.on(S)) gids = gids.map(id => (id === 'events2' ? 'dcmp' : id)).filter((id, i, a) => a.indexOf(id) === i);
      const goals = gids.map(id => ({ id, bonus: Math.round(D.GOALS[id].bonus * (slot === 'title' ? 1.5 : 1) * money / 250) * 250, met: false }));
      const nOb = rng.int(T.oblig[0], T.oblig[1]) + (slot === 'title' ? 1 : 0);
      const obligations = [];
      const obPool = rng.shuffle(D.OBLIGATIONS.slice());
      for (let i = 0; i < (slot === 'grant' ? 0 : Math.min(nOb, obPool.length)); i++) obligations.push(obPool[i].text.replace('{s}', name));
      const perk = T.perks.length && rng.chance(slot === 'title' ? 0.9 : 0.6) ? rng.pick(T.perks) : (slot !== 'grant' && !T.special && rng.chance(0.15) ? 'travelDiscount' : null);
      const exp = high && slot !== 'grant' ? 'High' : T.exp;
      const TM = D.SPONSOR_TERMS[slot], length = rng.int(TM.len[0], TM.len[1]); // titles and grants 2–4 seasons, partners 1–3 (3.1.5)
      return { id: U.uid('o'), name, type: tk, typeName: T.name, slot, base, length, goals, obligations, perk, exp };
    };
    // (3.5) the printer maker: from the 2022 offseason one of the six partner offers may be Corvane Labs'
    const MK = D.SPONSOR_MAKER, mk = MK && C.offerSeason(S) >= MK.from && !used.has(MK.name) && rng.chance(MK.chance) ? rng.int(0, 5) : -1;
    for (let i = 0; i < 3; i++) offers.push(make('title'));
    // (3.5) ... and any of the other partner offers may come from an international company, far less often than from the home
    const IN = D.SPONSOR_INTL;
    // (3.5) In a land with few companies of its own they turn up more often: they make up for the partner offers the
    // land cannot fill (own: its free companies that could be partners; left: the partner offers still to make).
    const ownLeft = () => (known ? types.filter(t => fits('partner', t)).reduce((n, t) => n + atHome(t), 0) : 99);
    for (let i = 0; i < 6; i++) { const left = 6 - i, own = IN ? ownLeft() : 0, p = !IN ? 0 : own >= left ? IN.chance : 1 - (own / left) * (1 - IN.chance);
      offers.push(make('partner', i === mk ? MK : IN && rng.chance(p) ? intl() : null)); }
    for (let i = 0; i < rng.int(1, 2); i++) offers.push(make('grant'));
    S.offers = keep.concat(offers.filter(Boolean));
    if (MK && S.mode === 'career' && !S.makerSeen && S.offers.some(o => o.type === MK.type)) { // its first offer: a note in the Inbox
      S.makerSeen = 1;
      C.inbox(S, MK.name + ' is looking for teams', 'The printer maker ' + MK.name + ' has started to sponsor robotics teams all over the world, and one of this autumn\'s partner offers is theirs. It is an international company and a partner like the others (+' + ((D.SPONSOR_INTL || {}).rep || 0) + ' reputation at every season review, as all of them bring), with one difference: when ' + MK.name + ' gives equipment, it gives what it knows, a level of the Prototyping Lab or of the Electronics Workbench.', 'money', { note: 'Finance: Sponsor offers. Its offer is not on every year\'s list.' });
    }
    { const io = S.mode === 'career' && !S.intlSeen && S.offers.find(o => o.slot === 'partner' && !(MK && o.type === MK.type) && D.sponsorIntl && D.sponsorIntl(o.name)); // the first offer from abroad (the printer maker has its own note): a note in the Inbox
      if (io) { S.intlSeen = 1; C.inbox(S, 'An international company on the list', io.name + ' sponsors teams all over the world, and one of this autumn\'s partner offers is theirs. Companies of that size never take a title: they are partners like the others, marked International on the list, and they turn up far less often than the companies around you. A name known all over the world does bring one small thing of its own: +' + D.SPONSOR_INTL.rep + ' reputation at every season review while it is on your robot.', 'money', { note: 'Finance: Sponsor offers.' }); }
    }
  };
  // your international partners (D.sponsorIntl: the general list's giants and the printer maker), each worth a little reputation a season
  C.intlPartners = S => (S.sponsors || []).filter(sp => sp.slot === 'partner' && D.sponsorIntl && D.sponsorIntl(sp.name));
  // the season a new list of offers is for: the one being planned (the list of October 2022 is for 2023)
  C.offerSeason = S => (S.cal ? G.Parts.buyCy(S) : C.cy(S)) || 0;
  // a sponsor that leaves is not on the next list of offers: it comes back a year later at the earliest
  C.sponsorLeft = function (S, sp) { (S.sponsorGone = S.sponsorGone || {})[sp.name] = (S.offerRound || 0) + 1; };
  C.partnerSlots = S => 4 + (S.mentors.some(m => m.role === 'biz') ? 1 : 0);
  C.signSponsor = function (S, offerId, silent) {
    const o = S.offers.find(x => x.id === offerId);
    if (!o) return 'Offer not found';
    if (o.slot === 'title' && S.sponsors.some(s => s.slot === 'title')) return 'You already have a title sponsor';
    if (o.slot === 'partner' && S.sponsors.filter(s => s.slot === 'partner').length >= C.partnerSlots(S)) return 'All partner slots are full';
    if (o.slot === 'grant' && S.sponsors.some(s => s.slot === 'grant')) return 'You can only hold one grant at a time';
    const sp = Object.assign({}, o, { seasonsLeft: o.length, sat: 60, paidYear: null, goals: o.goals.map(g => Object.assign({}, g)) });
    if (o.renew) { sp.sat = o.renew.sat == null ? 60 : o.renew.sat; if (o.renew.contact) sp.contact = o.renew.contact; sp.renewed = 1; delete sp.renew; } // (3.5.1) a renewal: the same people, as satisfied as they were
    sp.contact = C.sponsorContact(sp); // who writes for it, from now on
    S.sponsors.push(sp);
    S.offers = S.offers.filter(x => x !== o);
    sp.undo = { turn: turnKey(S), offer: JSON.parse(JSON.stringify(o)), paid: 0 };
    const bizBoost = S.mentors.some(m => m.role === 'biz') ? 1.1 : 1;
    if (S.phase !== 'off') { const amt = Math.round(sp.base * bizBoost); C.earn(S, amt, 'Sponsor: ' + sp.name); sp.paidYear = S.year; sp.paidAmt = amt; sp.undo.paid = amt; C.scheduleActivities(S, sp); }
    // (3.5) nothing is said yet: a deal can be undone this turn, so it is announced when the turn ends (C.announceSignings).
    // silent: true says nothing at all (a single season's starting sponsors); 'auto' (Auto-pick best) only the letters (the title sponsor's, the printer maker's, an international partner's).
    sp.undo.say = silent === true ? 0 : silent === 'auto' ? (sp.slot === 'title' || C.isMaker(sp) || C.isIntl(sp) ? 1 : 0) : 1; // (3.5.6) an international partner writes too when Auto-pick signs it
    return null;
  };
  // ---------- signed this turn, announced the next (3.5) ----------
  // A sponsor signed or a mentor hired can be taken back until Continue is pressed, so its message waits until then:
  // a letter from a title sponsor, a line for a partner, a grant or a mentor.
  C.announceSignings = function (S) {
    S.sponsors.forEach(sp => {
      if (!sp.undo || !sp.undo.say) return;
      const terms = (sp.slot === 'title' ? 'Title sponsor' : sp.slot === 'grant' ? 'Grant' : 'Partner sponsor') + ': ' + U.money(sp.base) + ' a season for ' + sp.length + ' season' + (sp.length === 1 ? '' : 's') + '.' + (sp.paidYear === S.year ? '' : ' The first payment arrives at Kickoff.') +
        (sp.slot === 'partner' && D.sponsorIntl && D.sponsorIntl(sp.name) ? ' An international partner: +' + ((D.SPONSOR_INTL || {}).rep || 0) + ' reputation at every season review.' : '');
      if (sp.renewed) { C.inbox(S, 'Renewed: ' + sp.name, terms.replace(/^(Title sponsor|Grant|Partner sponsor): /, m => m.replace(': ', ', renewed: ')), 'money'); delete sp.renewed; } // (3.5.1) their letter came with the offer
      else if (sp.slot === 'title' && D.SPONSOR_MAIL && D.SPONSOR_MAIL.roles[sp.type]) C.sponsorMail(S, sp, 'sign', { terms });
      else if (C.isMaker(sp)) C.makerMail(S, sp, 'sign', { terms }); // the printer maker writes too
      else if (C.isIntl(sp) && D.SPONSOR_MAIL && D.SPONSOR_MAIL.intl) C.intlMail(S, sp, 'sign', { terms }); // (3.5.1) ... and an international partner, from its branch or its head office
      else C.inbox(S, 'Signed: ' + sp.name, terms, 'money');
    });
    S.mentors.forEach(m => { if (m.undo) C.inbox(S, 'Mentor joined: ' + m.name, D.MENTOR_ROLES.find(r => r.id === m.role).name + ' (' + U.stars(m.stars) + ').', 'staff'); });
  };
  // ---------- a title sponsor's letters (3.5) ----------
  // The company's side of the contract: always the same person in the same post for the same company.
  // (its people carry the names of the company's own city, the one nearest to you; an international company's keep
  // the international mix; a company with no city, your home's)
  const myCity = () => (G.S && G.Geo && G.Geo.cityOf ? G.Geo.cityOf(G.S) : '');
  C.isIntl = sp => !!(sp && D.sponsorIntl && D.sponsorIntl(sp.name) && !C.isMaker(sp));
  // (3.5.1) An international company (the printer maker too) writes from the office that looks after the team: always
  // its head office when that is in the team's own area, else, more often than not, a branch in the team's city.
  // { office: 'hq' | 'branch', city }
  C.intlOffice = function (sp) {
    const hq = D.sponsorCity ? D.sponsorCity(sp.name, '') : '', me = myCity(), hb = hq && G.Geo && G.Geo.hub ? G.Geo.hub(hq) : null;
    if (!hq || !me || (hb && G.S && G.S.team && hb.r === G.S.team.region)) return { office: 'hq', city: hq || '' };
    return G.makeRng(hashS('office:' + sp.name + ':' + me) || 3).chance(0.7) ? { office: 'branch', city: me } : { office: 'hq', city: hq };
  };
  // "our Seoul office", "our head office in Zurich" (a contact from before 3.5.1 has no office: the head office)
  C.officeText = function (sp, who) { const hq = D.sponsorCity ? D.sponsorCity(sp.name, '') : ''; return who && who.office === 'branch' && who.city ? 'our ' + who.city + ' office' : hq ? 'our head office in ' + hq : 'our head office'; };
  C.sponsorWho = function (sp) {
    if (D.sponsorIntl && D.sponsorIntl(sp.name)) { const c = sp.contact ? sp.contact.city : C.intlOffice(sp).city; return c ? { hub: c } : 'intl'; } // the people of the office that writes (an older save's contact: the international mix)
    const hub = D.sponsorCity ? D.sponsorCity(sp.name, myCity()) : '';
    return hub ? { hub } : undefined;
  };
  C.sponsorContact = function (sp) {
    if (sp.contact) return sp.contact; // set on the day it signs
    const r = G.makeRng(hashS('contact:' + sp.name) || 7), M = D.SPONSOR_MAIL, roles = (M && (M.roles[sp.type] || M.roles.eng)) || ['Partnerships Manager']; // (a page without the letters' texts still signs sponsors)
    if (D.sponsorIntl && D.sponsorIntl(sp.name)) { const o = C.intlOffice(sp); return { name: D.personName(r, o.city ? { hub: o.city } : 'intl'), role: r.pick(o.office === 'branch' ? ['Branch Manager', 'Regional Partnerships Lead', 'Community Programmes Coordinator', 'Site Director'] : ['Global Partnerships Manager', 'Head of Community Programmes', 'Director of Education Partnerships']), office: o.office, city: o.city }; }
    return { name: D.personName(r, C.sponsorWho(sp)), role: r.pick(roles) };
  };
  const lcFirst = s => s.charAt(0).toLowerCase() + s.slice(1);
  const listAnd = a => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
  const numWord = n => ['no', 'one', 'two', 'three', 'four', 'five'][n] || String(n);
  // kind 'sign': who they are, a word about their trade, why this team, what they expect.
  // kind 'renew' (info: { met: [goal met?], oldBase }): how the season looked from their side, the new terms, the targets.
  C.sponsorMail = function (S, sp, kind, info) {
    const M = D.SPONSOR_MAIL, who = C.sponsorContact(sp), r = G.makeRng(hashS(kind + ':' + sp.name + ':' + S.year + ':' + (S.offerRound || 0)) || 5);
    const colleague = D.personName(r, C.sponsorWho(sp)).split(' ')[0];
    const fill = t => String(t).replace(/\{co\}/g, sp.name).replace(/\{num\}/g, S.team.num).replace(/\{team\}/g, S.team.name).replace(/\{who\}/g, colleague);
    const goalTxt = g => M.goal[g.id] || D.GOALS[g.id].text.toLowerCase(), goals = sp.goals.map(goalTxt), many = goals.length > 1;
    const type = M.close[sp.type] && M.ps[sp.type] && M.tradeType[sp.type] ? sp.type : 'eng', P = []; // the three kinds of company that take a title
    info = info || {};
    if (kind === 'renew') {
      const met = info.met || sp.goals.map(g => !!g.met), missed = sp.goals.filter((g, i) => !met[i]).map(goalTxt);
      const tone = sp.sat >= 80 ? 'high' : sp.sat >= 55 ? 'mid' : 'low', how = !missed.length ? 'all' : missed.length === goals.length ? 'none' : 'some';
      P.push(r.pick(M.renewOpen[tone]) + ' ' + fill(r.pick(M.renewSeason[how])).replace('{goals}', listAnd(goals)).replace('{missed}', listAnd(missed)));
      { const d = D.sponsorDesc(sp.name).split(/[;:]/)[0].replace(/\.$/, ''); if (d) P.push(fill(r.pick(M.renewRel[how === 'none' || tone === 'low' ? 'hard' : 'good'])).replace('{d}', lcFirst(d))); }
      const dir = info.oldBase == null || sp.base === info.oldBase ? 'same' : sp.base > info.oldBase ? 'up' : 'down';
      P.push(M.renewTerms[dir].replace('{n}', numWord(sp.seasonsLeft) + ' more season' + (sp.seasonsLeft === 1 ? '' : 's')).replace('{base}', U.money(sp.base)) + ' ' + fill(r.pick(M.renewAsk)).replace('{goals}', listAnd(goals)) + ' ' + r.pick(M.expect[sp.exp] || M.expect.Medium));
      P.push(r.pick(M.close[type]));
      C.letter(S, who.name + ' (' + sp.name + ')', fill(r.pick(M.renewSubject)), P.join('\n\n'), 'Yours,\n' + who.name + '\n' + who.role + ', ' + sp.name,
        { note: info.note || 'Title sponsor renewed: ' + sp.seasonsLeft + ' more season' + (sp.seasonsLeft === 1 ? '' : 's') + ' at ' + U.money(sp.base) + ' a season.' }, 'money');
      return;
    }
    const desc = D.sponsorDesc(sp.name), trade = (M.trade.find(x => x.re.test(sp.name)) || { t: M.tradeType[type] }).t;
    // one writer in four has never seen a robot: the name goes "on the bumpers" (which carry team numbers only), and the letter stays in that voice
    const NV = M.naive, naive = !!(NV && desc && r.chance(NV.chance));
    P.push(r.pick(M.open) + (desc ? ' ' + fill(r.pick(naive ? NV.intro : M.intro)).replace('{desc}', lcFirst(desc)) : ''));
    P.push(r.pick(trade));
    // why this team: last season's win or Championship place, its name in the sport, a first season, or any of the standing reasons
    const last = S.history[S.history.length - 1], wonEv = last && (last.events || []).find(e => e.won), why = ['any'];
    if (wonEv) why.push('won', 'won', 'won'); if (last && last.champs) why.push('champs', 'champs'); if (S.rep >= 70) why.push('rep', 'rep'); if (S.profile === 'rookie' && S.history.length <= 1) why.push('fresh', 'fresh', 'fresh');
    P.push(fill(r.pick(M.why[r.pick(why)])).replace('{ev}', wonEv ? wonEv.name : 'event'));
    let ask = r.pick(M.expect[sp.exp] || M.expect.Medium) + ' ' + fill(r.pick(M.goals)).replace('{goals}', listAnd(goals)).replace('{each}', many ? 'each' : 'it').replace('{them}', many ? 'them' : 'it');
    if (sp.obligations.length) ask += ' ' + r.pick(M.oblig).replace('{n}', numWord(sp.obligations.length) + ' date' + (sp.obligations.length === 1 ? '' : 's')).replace('{list}', sp.obligations.join('; '));
    P.push(ask);
    if (sp.perk && M.perk[sp.perk]) P.push(M.perk[sp.perk]);
    P.push(r.pick(naive ? NV.close : M.close[type]));
    C.letter(S, who.name + ' (' + sp.name + ')', fill(r.pick(M.subject)), P.join('\n\n'), 'Yours,\n' + who.name + '\n' + who.role + ', ' + sp.name + '\n\n' + r.pick(naive ? NV.ps : M.ps[type]), { note: info.terms || '' }, 'money');
  };
  // ---------- the printer maker's letters (3.5) ----------
  // D.SPONSOR_MAKER's company is a partner, but it writes as a title sponsor does, when it signs and when it renews:
  // what it makes, what teams do to its printers, why this team, what it asks, and what it sends when things go well
  // (it donates only Prototyping Lab and Electronics Workbench levels). kind, info: as C.sponsorMail.
  C.isMaker = sp => !!(sp && D.SPONSOR_MAKER && sp.type === D.SPONSOR_MAKER.type && D.SPONSOR_MAIL && D.SPONSOR_MAIL.maker);
  C.makerMail = function (S, sp, kind, info) {
    const M = D.SPONSOR_MAIL, K = M.maker, who = C.sponsorContact(sp), r = G.makeRng(hashS('maker:' + kind + ':' + S.year + ':' + (S.offerRound || 0) + ':' + S.team.num) || 5);
    const colleague = D.personName(r, C.sponsorWho(sp)).split(' ')[0];
    const fill = t => String(t).replace(/\{co\}/g, sp.name).replace(/\{num\}/g, S.team.num).replace(/\{team\}/g, S.team.name).replace(/\{who\}/g, colleague);
    const goalTxt = g => M.goal[g.id] || D.GOALS[g.id].text.toLowerCase(), goals = sp.goals.map(goalTxt), many = goals.length > 1, P = [];
    // (3.5.1) like the other international companies, it says which office is writing: the branch near the team or the head office
    const from = who.office ? 'I am writing from ' + C.officeText(sp, who) + '. ' : '', at = who.office && who.city ? ' (' + who.city + ')' : '';
    const sign = 'Yours,\n' + who.name + '\n' + who.role + ', ' + sp.name + at, gives = ' When ' + sp.name + ' gives equipment, it is a level of the Prototyping Lab or of the Electronics Workbench.';
    info = info || {};
    if (kind === 'renew') {
      const met = info.met || sp.goals.map(g => !!g.met), missed = sp.goals.filter((g, i) => !met[i]).map(goalTxt);
      const tone = sp.sat >= 80 ? 'high' : sp.sat >= 55 ? 'mid' : 'low', how = !missed.length ? 'all' : missed.length === goals.length ? 'none' : 'some';
      P.push(from + r.pick(K.renewOpen[tone]) + ' ' + r.pick(K.renewSeason[how]).replace('{goals}', listAnd(goals)).replace('{missed}', listAnd(missed)));
      const dir = info.oldBase == null || sp.base === info.oldBase ? 'same' : sp.base > info.oldBase ? 'up' : 'down';
      P.push(M.renewTerms[dir].replace('{n}', numWord(sp.seasonsLeft) + ' more season' + (sp.seasonsLeft === 1 ? '' : 's')).replace('{base}', U.money(sp.base)) + ' ' + fill(r.pick(M.renewAsk)).replace('{goals}', listAnd(goals)) + ' ' + r.pick(K.renewGift));
      P.push(r.pick(K.close));
      C.letter(S, who.name + ' (' + sp.name + ')', fill(r.pick(K.renewSubject)), P.join('\n\n'), sign,
        { note: info.note || 'Partner sponsor renewed: ' + sp.seasonsLeft + ' more season' + (sp.seasonsLeft === 1 ? '' : 's') + ' at ' + U.money(sp.base) + ' a season. Partners like short deals: expect to talk again next autumn.' }, 'money');
      return;
    }
    P.push(from + fill(r.pick(K.open)) + ' ' + r.pick(K.who));
    P.push(r.pick(K.trade));
    const last = S.history[S.history.length - 1], wonEv = last && (last.events || []).find(e => e.won), why = ['any', 'any'];
    if (wonEv) why.push('won', 'won', 'won'); if (last && last.champs) why.push('champs', 'champs');
    P.push(fill(r.pick(K.why[r.pick(why)])).replace('{ev}', wonEv ? wonEv.name : 'event'));
    let ask = r.pick(K.ask).replace('{goals}', listAnd(goals)).replace('{each}', many ? 'each' : 'it');
    if (sp.obligations.length) ask += ' ' + r.pick(M.oblig).replace('{n}', numWord(sp.obligations.length) + ' date' + (sp.obligations.length === 1 ? '' : 's')).replace('{list}', sp.obligations.join('; '));
    P.push(ask);
    P.push(r.pick(K.gift));
    P.push(r.pick(K.close));
    C.letter(S, who.name + ' (' + sp.name + ')', fill(r.pick(K.subject)), P.join('\n\n'), sign + '\n\n' + r.pick(K.ps), { note: (info.terms || '') + gives }, 'money');
  };
  // ---------- an international partner's letters (3.5.1) ----------
  // Shorter than a title sponsor's: where it is written from (the branch near the team, or the head office), what the
  // company is, what it asks. kind, info: as C.sponsorMail.
  C.intlMail = function (S, sp, kind, info) {
    const M = D.SPONSOR_MAIL, K = M.intl, who = C.sponsorContact(sp), r = G.makeRng(hashS('intl:' + kind + ':' + sp.name + ':' + S.year + ':' + (S.offerRound || 0)) || 5);
    const hq = D.sponsorCity ? D.sponsorCity(sp.name, '') : '', branch = who.office === 'branch' && who.city, office = C.officeText(sp, who);
    const desc = D.sponsorDesc(sp.name).replace(/\.$/, ''), fill = t => String(t).replace(/\{co\}/g, sp.name).replace(/\{num\}/g, S.team.num).replace(/\{team\}/g, S.team.name).replace(/\{office\}/g, office).replace(/\{hq\}/g, hq || 'head office').replace(/\{desc\}/g, lcFirst(desc));
    const goalTxt = g => M.goal[g.id] || D.GOALS[g.id].text.toLowerCase(), goals = sp.goals.map(goalTxt), many = goals.length > 1, P = [];
    const sign = 'Kind regards,\n' + who.name + '\n' + who.role + ', ' + sp.name + (branch ? ' (' + who.city + ')' : hq ? ' (' + hq + ')' : '');
    info = info || {};
    if (kind === 'renew') {
      const met = info.met || sp.goals.map(g => !!g.met), missed = sp.goals.filter((g, i) => !met[i]).map(goalTxt), how = !missed.length ? 'all' : missed.length === goals.length ? 'none' : 'some';
      P.push(fill(r.pick(K.renewOpen)) + ' ' + fill(r.pick(K.renewSeason[how])).replace('{goals}', listAnd(goals)).replace('{missed}', listAnd(missed)));
      const dir = info.oldBase == null || sp.base === info.oldBase ? 'same' : sp.base > info.oldBase ? 'up' : 'down';
      P.push(M.renewTerms[dir].replace('{n}', numWord(sp.seasonsLeft) + ' more season' + (sp.seasonsLeft === 1 ? '' : 's')).replace('{base}', U.money(sp.base)) + ' ' + fill(r.pick(M.renewAsk)).replace('{goals}', listAnd(goals)));
      P.push(fill(r.pick(K.close)));
      C.letter(S, who.name + ' (' + sp.name + ')', fill(r.pick(K.renewSubject)), P.join('\n\n'), sign, { note: info.note || '' }, 'money');
      return;
    }
    P.push(fill(r.pick(K.open)) + ' ' + fill(r.pick(branch ? K.branch : K.hq)));
    if (desc) P.push(fill(r.pick(K.who)));
    let ask = fill(r.pick(K.ask)).replace('{goals}', listAnd(goals)).replace('{each}', many ? 'each' : 'it');
    if (sp.obligations.length) ask += ' ' + r.pick(M.oblig).replace('{n}', numWord(sp.obligations.length) + ' date' + (sp.obligations.length === 1 ? '' : 's')).replace('{list}', sp.obligations.join('; '));
    P.push(ask);
    P.push(fill(r.pick(K.close)));
    C.letter(S, who.name + ' (' + sp.name + ')', fill(r.pick(K.subject)), P.join('\n\n'), sign, { note: info.terms || '' }, 'money');
  };
  // A deal signed this turn can be taken back until time moves on (the offer returns to the list)
  C.canUnsign = (S, sp) => !!(sp && sp.undo && sp.undo.turn === turnKey(S));
  C.unsignSponsor = function (S, id) {
    const sp = S.sponsors.find(x => x.id === id);
    if (!sp) return 'Sponsor not found';
    if (!C.canUnsign(S, sp)) return 'This deal is final: it was signed before this turn';
    S.sponsors = S.sponsors.filter(x => x !== sp);
    if (sp.undo.paid) {
      S.money -= sp.undo.paid; if (S.season) S.season.earned -= sp.undo.paid;
      const li = S.ledger.findIndex(l => l.desc === 'Sponsor: ' + sp.name && l.amt === sp.undo.paid);
      if (li >= 0) S.ledger.splice(li, 1);
    }
    S.activities = S.activities.filter(a => !(a.sponsorId === sp.id && a.status === 'pending'));
    S.offers.push(sp.undo.offer);
    return null;
  };
  C.sponsorSlots = S => {
    const n = k => S.sponsors.filter(s => s.slot === k).length;
    return { title: { n: n('title'), max: 1 }, partner: { n: n('partner'), max: C.partnerSlots(S) }, grant: { n: n('grant'), max: 1 } };
  };
  // ---- sponsor money at a glance (Finance): this season's base and bonuses, and what next season looks like ----
  const bizMult = S => (S.mentors.some(m => m.role === 'biz') ? 1.1 : 1);
  const goalPay = (sp, g) => g.bonus * (sp.perk === 'bonusBoost' ? 1.5 : 1);
  C.goalPay = goalPay;
  // This season: base money received, bonuses earned so far and what the open goals are still worth
  C.sponsorSeason = function (S) {
    const biz = bizMult(S), r = { base: 0, reached: 0, possible: 0, met: 0, goals: 0, n: 0 };
    S.sponsors.forEach(sp => {
      if (sp.paidYear !== S.year) return; // signed for next season: nothing paid or at stake yet
      r.n++; r.base += sp.paidAmt != null ? sp.paidAmt : Math.round(sp.base * biz);
      sp.goals.forEach(g => { const b = goalPay(sp, g); r.goals++; r.possible += b; if (g.met) { r.met++; r.reached += g.paid != null ? g.paid : b; } });
    });
    return r;
  };
  // Next season: base money under contract, deals that end after this season (renewal follows satisfaction) and the bonuses on offer
  C.sponsorNext = function (S) {
    if (S.mode !== 'career' || S.phase === 'end' || S.upcoming >= S.order.length) return null; // no season after this one
    const biz = bizMult(S), settled = S.phase === 'off' || S.phase === 'review'; // contracts for next season are already decided
    const r = { year: C.calYear(S, S.order[S.upcoming]), settled, biz: biz > 1, contract: 0, contractN: 0, bonus: 0, renew: [], renewBase: 0, renewBonus: 0, expected: 0, ending: [] };
    S.sponsors.forEach(sp => {
      const gb = U.sum(sp.goals.map(g => goalPay(sp, g)));
      if (settled || sp.seasonsLeft >= 2) { r.contract += Math.round(sp.base * biz); r.contractN++; r.bonus += gb; }
      else {
        // the same sums as the season review: renewal chance = satisfaction (a partner's a little less), new base 90%..130% of the old one
        const p = C.renewChance(sp), nb = Math.round(Math.round(sp.base * (0.9 + sp.sat / 250) / 250) * 250 * biz);
        r.renew.push({ name: sp.name, chance: p, base: nb, bonus: gb }); r.renewBase += nb; r.renewBonus += gb; r.expected += p * nb;
      }
    });
    r.expected = Math.round((r.contract + r.expected) / 50) * 50;
    const sl = C.sponsorSlots(S);
    r.open = ['title', 'partner', 'grant'].map(k => ({ k, n: sl[k].max - sl[k].n })).filter(x => x.n > 0);
    return r;
  };
  // A deal in its last season renews with this chance at the season review: its satisfaction, a partner's a little less
  // (partners prefer short deals and move on more often, 3.1.5)
  C.renewChance = sp => U.clamp((sp.sat / 100) * ((D.SPONSOR_TERMS[sp.slot] || {}).keep || 1), 0, 1);
  // How good an offer looks: yearly money, contract length, likely bonuses and perks, minus obligations and risky expectations
  C.offerValue = function (S, o) {
    const strong = C.highExpect(S) || S.rep >= 60;
    const bonus = U.sum(o.goals.map(g => g.bonus * (({ win: 0.25, champs: 0.25, playoffs2: 0.45 })[g.id] || 0.6)));
    return o.base * (1 + 0.12 * (o.length - 1)) + bonus * 0.5 + (o.perk ? 600 : 0) + (o.slot === 'partner' && D.sponsorIntl && D.sponsorIntl(o.name) ? 300 : 0) - 450 * o.obligations.length - (o.exp === 'High' && !strong ? o.base * 0.25 : 0);
  };
  // Fill every open slot with the best offers (title, partners, grant)
  C.autoSponsors = function (S) {
    const signed = [];
    ['title', 'grant', 'partner'].forEach(slot => {
      const list = S.offers.filter(o => o.slot === slot).sort((a, b) => C.offerValue(S, b) - C.offerValue(S, a));
      for (const o of list) { if (C.signSponsor(S, o.id, 'auto')) break; signed.push(o.name); }
    });
    return signed;
  };
  // Ending a contract early. Only in the autumn, while the new offers are on the table (October to Kickoff): the sponsor
  // leaves, its slot is free for another offer, and word gets round. Reputation: title 6, partner 3, grant 2, plus 1 for
  // each further season the contract still had to run. (A deal signed this turn is simply undone instead.)
  C.endSponsorCost = sp => (sp.slot === 'title' ? 6 : sp.slot === 'grant' ? 2 : 3) + Math.max(0, (sp.seasonsLeft || 1) - 1);
  C.endSponsorOpen = S => S.phase === 'off' && ['Oct', 'Nov', 'Dec'].includes(D.MONTHS[S.month]);
  C.canEndSponsor = (S, sp) => !!sp && C.endSponsorOpen(S) && !C.canUnsign(S, sp);
  C.endSponsor = function (S, id) {
    const sp = S.sponsors.find(x => x.id === id);
    if (!sp) return 'Sponsor not found';
    if (C.canUnsign(S, sp)) return 'Signed this turn: use Undo signing instead';
    if (!C.canEndSponsor(S, sp)) return 'A contract can only be ended in the autumn, while the new offers are open (October to Kickoff)';
    const cost = C.endSponsorCost(sp), left = sp.seasonsLeft || 1;
    S.sponsors = S.sponsors.filter(x => x !== sp);
    C.sponsorLeft(S, sp);
    S.activities = S.activities.filter(a => !(a.sponsorId === sp.id && a.status === 'pending'));
    C.addRep(S, -cost);
    C.inbox(S, 'Sponsorship ended: ' + sp.name, 'You ended the contract with ' + sp.name + ' (' + U.money(sp.base) + ' a season, ' + left + ' season' + (left === 1 ? '' : 's') + ' still to run). Its ' + (sp.slot === 'title' ? 'title' : sp.slot === 'grant' ? 'grant' : 'partner') + ' slot is free for another offer. Sponsors talk to each other: reputation −' + cost + '.', 'money');
    return null;
  };
  C.dropSponsor = (S, id) => C.endSponsor(S, id);
  C.scheduleActivities = function (S, sp) {
    const rng = G.R;
    sp.obligations.forEach(text => {
      const wk = rng.int(Math.max(1, S.phase === 'build' ? S.week + 1 : 2), 7);
      S.activities.push({ id: U.uid('a'), sponsorId: sp.id, sponsor: sp.name, text, week: wk, status: 'pending', year: S.year });
    });
  };
  C.dueActivities = S => S.phase === 'build' ? S.activities.filter(a => a.status === 'pending' && a.week <= S.week && a.year === S.year) : [];
  C.resolveActivity = function (S, id, how) {
    const a = S.activities.find(x => x.id === id); if (!a) return;
    const sp = S.sponsors.find(s => s.id === a.sponsorId);
    a.status = how === 'skip' ? 'skipped' : 'done';
    if (how === 'student') { S.lastConf = Math.max(0, S.lastConf - 0.1); S.morale = Math.max(0, S.morale - 1); if (sp) sp.sat = Math.min(100, sp.sat + 8); S.season.impact += 2; }
    if (how === 'robot') {
      const tr = G.Shop.lvl(S, 'trailer') > 0, wear = tr ? 4 : 10; // a trailer means a proper display and safe transport
      // a team with a real second robot demos that one: the competition robot keeps its condition
      const second = G.Robot.realSecond(S), demoSubs = S.robot ? (second ? S.robot.bots[G.Robot.other(S.robot)].subs : S.robot.subs) : null;
      if (demoSubs) Object.values(demoSubs).forEach(s => { if (s && s.ver) s.cond = Math.max(0, s.cond - wear); });
      if (!second && (S.phase === 'comp' || S.phase === 'champs') && !S.event) S.demoWear = { key: turnKey(S), amt: wear };
      if (sp) sp.sat = Math.min(100, sp.sat + (tr ? 13 : 10)); C.addRep(S, 1); S.season.impact += tr ? 4 : 3;
    }
    if (how === 'hours') { S.actHours += 30; if (sp) sp.sat = Math.min(100, sp.sat + 8); S.season.impact += 2; }
    if (how === 'skip') { if (sp) sp.sat = Math.max(0, sp.sat - 15); }
  };
  C.checkSponsorGoals = function (S, final) {
    const s = S.season;
    const tech = s.awards.some(a => D.AWARDS.find(x => x.id === a && x.tech));
    const has = id => s.awards.includes(id);
    const evs = s.events.filter(e => e.kind === 'regional' || e.kind === 'dcmp');
    const avgRP = s.qualMatches ? s.rpSum / s.qualMatches : 0;
    const check = {
      playoffs1: evs.some(e => e.playoffs), playoffs2: evs.filter(e => e.playoffs).length >= 2, win: evs.some(e => e.won), champs: s.champsQualified,
      award: s.awards.length > 0, techAward: tech, quality: has('quality') || has('eie'), autoAward: has('auto') || has('ic'), impactAward: has('impact') || has('ei'),
      avgRP: final && avgRP >= 2, outreach: s.outreach >= 2, events2: evs.length >= 2, dcmp: !!s.dcmpQualified
    };
    // (3.5.1) One message for everything a sponsor's targets paid at this check: a short email from a title sponsor,
    // an international partner or the printer maker (its contact person writes), one line for all the others together.
    const plain = [];
    S.sponsors.forEach(sp => {
      const hit = [];
      sp.goals.forEach(g => {
        if (g.met || !check[g.id]) return;
        g.met = true;
        const bonus = g.bonus * (C.hasPerk(S, 'bonusBoost') && sp.perk === 'bonusBoost' ? 1.5 : 1);
        g.paid = bonus;
        C.earn(S, bonus, 'Bonus: ' + sp.name + ' — ' + C.goalText(S, D.GOALS[g.id].text));
        sp.sat = Math.min(100, sp.sat + 10);
        hit.push({ text: C.goalText(S, D.GOALS[g.id].text), bonus });
      });
      if (!hit.length) return;
      const sum = U.sum(hit.map(x => x.bonus)), what = listAnd(hit.map(x => '"' + x.text + '"'));
      if (sp.slot === 'title' || C.isIntl(sp) || C.isMaker(sp)) {
        const who = C.sponsorContact(sp), r = G.makeRng(hashS('bonus:' + sp.name + ':' + S.year + ':' + hit.length + ':' + sum) || 9), many = hit.length > 1;
        C.letter(S, who.name + ' (' + sp.name + ')', (many ? 'Targets met: ' : 'Target met: ') + U.money(sum),
          r.pick(['The result reached us before your message did.', 'Somebody here was watching the stream at their desk, so the whole floor knows.', 'I have just been shown the standings.', 'Good news travels fast in this building.']) + ' ' + what + ': done. ' +
          (many ? 'The bonuses we agreed, ' + U.money(sum) + ' in all, are' : 'The bonus we agreed, ' + U.money(sum) + ', is') + ' on ' + (many ? 'their' : 'its') + ' way to the team account. ' + r.pick(['Please tell the students.', 'Well done to everybody in the shop.', 'Keep going.', 'We will put it in the staff newsletter.']),
          'Congratulations,\n' + who.name + '\n' + who.role + ', ' + sp.name, { note: '+' + U.money(sum) + ' (Finance). The sponsor is happier with the partnership.' }, 'money');
      } else plain.push({ sp, hit, sum });
    });
    if (plain.length) C.inbox(S, (plain.length > 1 ? 'Sponsor bonuses: ' : 'Sponsor bonus: ') + U.money(U.sum(plain.map(x => x.sum))), plain.map(x => x.sp.name + ': ' + x.hit.map(y => y.text + ' (+' + U.money(y.bonus) + ')').join(', ')).join('\n') + '\n\nPaid today (Finance). ' + (plain.length > 1 ? 'These sponsors are' : 'The sponsor is') + ' happier with the partnership.', 'money');
    C.checkProgramGoals(S);
  };
  // (3.5.1) The school writes when a program goal is reached: once for each goal, one email for all that are new.
  // (Not for a goal that can still be lost: the top half at every regional is settled at the season review.)
  C.checkProgramGoals = function (S) {
    const s = S.season, hit = ((s && s.goals) || []).filter(g => !g.told && g.id !== 'topHalf' && D.PROGRAM_GOALS[g.id] && D.PROGRAM_GOALS[g.id].check(s));
    if (!hit.length || S.mode !== 'career') return;
    hit.forEach(g => { g.told = 1; });
    const r = G.makeRng(hashS('pg:' + S.year + ':' + hit.map(g => g.id).join(',')) || 11), all = s.goals.every(g => g.told || g.id === 'topHalf'), many = hit.length > 1;
    C.letter(S, 'The program director' + atSchool(S), (many ? 'Program goals reached: ' : 'Program goal reached: ') + hit.map(g => C.goalText(S, D.PROGRAM_GOALS[g.id].text)).join(', '),
      r.pick(['I saw the result this morning and wanted you to hear it from me first.', 'The result was on my desk before the first bell.', 'The principal stopped me in the corridor to ask whether it was true. It is.']) + ' ' + listAnd(hit.map(g => '"' + C.goalText(S, D.PROGRAM_GOALS[g.id].text) + '"')) + ': ' + (many ? 'those were on' : 'that was on') + ' the list we agreed at Kickoff, and ' + (many ? 'they are' : 'it is') + ' done. ' +
      (all ? 'That is the whole list. I will say so at the season review.' : 'It will count at the season review. The rest of the list still stands.') + ' Please pass on my congratulations to the students and the mentors.',
      'With thanks,\nThe program director', { note: 'Program goals are settled at the season review: each one met raises Program Support.', school: true }, 'goal');
  };

  // ======================= mentors & students =======================
  C.refreshMarket = function (S, search) {
    const rng = G.R, n = rng.int(6, 9);
    S.market = [];
    for (let i = 0; i < n; i++) {
      const stars = rng.wpick([1, 2, 3, 4, 5], s => [0, 3, 4, 3 + S.rep / 40, 1.5 + S.rep / 50, 0.5 + S.rep / 60][s]);
      S.market.push(D.makeMentor(rng, null, stars));
    }
    if (!search) S.mSearch = { n: 0 }; // the yearly refresh: two searches of your own until Kickoff
  };
  // After the August refresh the team can go looking for more candidates (ads, a booth at a local maker fair, calls to
  // alumni): a new list of candidates, twice at most before Kickoff, for a small fee
  D.MENTOR_SEARCH = { cost: 400, max: 2 };
  C.mentorSearchLeft = S => (S.phase === 'off' && S.month >= D.MONTHS.indexOf('Aug') ? D.MENTOR_SEARCH.max - (S.mSearch ? S.mSearch.n : 0) : 0);
  C.searchMentors = function (S) {
    if (S.phase !== 'off' || S.month < D.MONTHS.indexOf('Aug')) return 'You can search for mentors after the market refreshes in August, until Kickoff';
    if (!S.mSearch) S.mSearch = { n: 0 };
    if (S.mSearch.n >= D.MENTOR_SEARCH.max) return 'You have searched twice already: the next new candidates come with next August\'s refresh';
    { const e = C.afford(S, D.MENTOR_SEARCH.cost); if (e) return e; }
    C.spend(S, D.MENTOR_SEARCH.cost, 'Mentor search');
    S.mSearch.n++;
    C.refreshMarket(S, true);
    return null;
  };
  C.hireMentor = function (S, id) {
    const m = S.market.find(x => x.id === id);
    if (!m) return 'Not found';
    if (S.mentors.length >= 8) return 'You can have at most 8 mentors';
    { const e = C.afford(S, m.cost); if (e) return e; }
    C.mentorMeta(S, m);
    const was = { turn: turnKey(S), cost: m.cost || 0, paid: m.paid, contract: m.contract, ten: m.ten, morale: S.morale, at: S.market.indexOf(m) };
    if (m.cost) C.spend(S, m.cost, 'Mentor: ' + m.name);
    m.paid = true; m.contract = Math.max(1, m.contract);
    m.ten = 0;
    S.mentors.push(m); S.market = S.market.filter(x => x !== m);
    S.morale = Math.min(100, S.morale + 2);
    was.morale = S.morale - was.morale;
    m.undo = was; // (3.5) a hire can be taken back this turn; the Inbox hears of it when the turn ends (C.announceSignings)
    return null;
  };
  // A mentor hired this turn can be let go again for everything the hire cost, until time moves on (back to the market)
  C.canUnhire = (S, m) => !!(m && m.undo && m.undo.turn === turnKey(S));
  C.unhireMentor = function (S, id) {
    const m = S.mentors.find(x => x.id === id);
    if (!m) return 'Mentor not found';
    if (!C.canUnhire(S, m)) return 'This hire is final: it was made before this turn';
    const u = m.undo;
    S.mentors = S.mentors.filter(x => x !== m);
    if (u.cost) {
      S.money += u.cost; if (S.season) S.season.spent -= u.cost;
      const li = S.ledger.findIndex(l => l.desc === 'Mentor: ' + m.name && l.amt === -u.cost);
      if (li >= 0) S.ledger.splice(li, 1);
    }
    S.morale = Math.max(0, S.morale - u.morale);
    m.contract = u.contract; m.ten = u.ten; if (u.paid === undefined) delete m.paid; else m.paid = u.paid;
    delete m.undo;
    S.market.splice(Math.max(0, Math.min(u.at, S.market.length)), 0, m);
    return null;
  };
  C.releaseMentor = function (S, id) { const m = S.mentors.find(x => x.id === id); if (!m) return; S.mentors = S.mentors.filter(x => x !== m); S.morale = Math.max(0, S.morale - 5); };
  function studentXP(S, st, keys, mult) {
    const coach = C.mentorSkill(S, 'coach');
    keys.forEach(k => {
      const a = st.attr[k];
      st.attr[k] = Math.min(99, a + 0.38 * (st.pot / 100) * (1 + coach / 120) * (1 - a / 112) * mult);
    });
  }
  C.studentXP = studentXP;

  // ======================= program-year calendar =======================
  // Every turn of the program year as a slot (offseason months, Kickoff, build weeks, Week 0, competition weeks,
  // Championship, review) with what happens in it: events, development, sponsor duties and program milestones.
  C.calendarSlots = function (S) {
    const slots = [];
    D.MONTHS.forEach((mo, i) => slots.push({ key: 'off' + i, month: mo, label: mo, unit: 'month' }));
    slots.push({ key: 'kick', month: 'Jan', label: 'Kickoff' });
    for (let w = 1; w <= 7; w++) slots.push({ key: 'b' + w, month: w <= 4 ? 'Jan' : 'Feb', label: w === 7 ? 'Week 0' : 'Build week ' + w, week: w });
    for (let w = 1; w <= 7; w++) slots.push({ key: 'c' + w, month: w <= 4 ? 'Mar' : 'Apr', label: w === 7 ? 'Week 7 · rest week' : 'Competition week ' + w, week: w });
    slots.push({ key: 'champs', month: 'Apr', label: 'Championship' });
    slots.push({ key: 'review', month: 'May', label: 'Season review' });
    return slots;
  };
  C.calendarIndex = function (S) {
    switch (S.phase) {
      case 'off': return S.month;
      case 'kickoff': return 8;
      case 'build': return 8 + S.week;
      case 'comp': return 15 + S.week;
      case 'champs': return 23;
      default: return 24;
    }
  };
  C.calendar = function (S) {
    const slots = C.calendarSlots(S), cur = C.calendarIndex(S), at = k => slots.find(x => x.key === k);
    slots.forEach((x, i) => { x.items = []; x.past = i < cur; x.cur = i === cur; });
    const add = (k, cat, text, cls) => { const x = typeof k === 'number' ? slots[Math.min(slots.length - 1, Math.max(0, k))] : at(k); if (x) x.items.push({ cat, text, cls: cls || '' }); };
    const off = S.phase === 'off';
    // program milestones
    add('off1', 'program', 'Graduation: seniors leave');
    add('off3', 'program', 'Mentor market refreshes');
    add('off4', 'program', 'New students join · school funding');
    if (S.feeders) add('off4', 'money', 'Feeder programs ' + U.money(C.programCost(S)));
    add('off5', 'program', 'Sponsor offers · regional registration opens');
    { const li = off ? G.Parts.buyIdx(S) : S.si; const seen = {};
      (S.vendorPlan || []).filter(r => r.idx === li && r.mo >= 4 && !seen[r.v] && (seen[r.v] = 1)).forEach(r => { const pr = S.cal ? G.Parts.prodAt(S, r.cat, r.v, r.n) : null; if (!(pr && pr.quiet)) add('off' + r.mo, 'dev', D.VENDORS[pr ? G.Parts.brand(pr) : r.v].name + ' product launch'); }); }
    add('kick', 'program', 'Game reveal: pick concepts');
    add('kick', 'money', 'Sponsors pay · facility upkeep ' + U.money(G.Shop.upkeep(S)));
    add('review', 'program', 'Program review: goals, support, graduation');
    add('c7', 'program', 'No regionals: recover fatigue before the Championship');
    // events
    S.regionals.forEach(r => {
      if (!S.registered.includes(r.id)) return;
      const done = S.eventsDone[r.id], res = done && S.season.events.find(e => e.id === r.id);
      add('c' + r.week, 'event', (done ? '✓ ' : '') + r.name + (res ? ' — ' + res.finish : ' (' + D.TRAVEL[C.travelTierOf(S, Object.assign({ kind: 'regional' }, r))].name.toLowerCase() + ')'), done ? 'good' : 'acc');
    });
    // regionals you could still register for (only for weeks that have not happened yet)
    for (let w = 1; w <= 6; w++) {
      if (slots.findIndex(x => x.key === 'c' + w) < cur) continue;
      const open = S.regionals.filter(r => r.week === w && !S.registered.includes(r.id) && !C.canRegister(S, r)).length;
      if (open && !S.registered.some(id => { const r = S.regionals.find(x => x.id === id); return r && r.week === w; })) add('c' + w, 'event', open + ' regional' + (open > 1 ? 's' : '') + ' open', 'dim');
    }
    if (S.scrimmage) add('b7', 'event', 'Week 0 scrimmage', 'acc');
    const sq = S.season && S.season.champsQualified;
    add('champs', 'event', sq ? C.champs(S).label + ' — qualified!' : C.champs(S).label + (S.team.home && G.World.on(S) ? ' (through your district\'s points list)' : C.wildEra(S) ? ' (win a regional, Impact/EI/Rookie All-Star, or a finalist\'s wildcard)' : ' (win a regional, Impact/EI or Regional Pool)'), sq ? 'good' : 'dim');
    if (S.festStream && S.festStream.stage === 'open') add('off2', 'event', 'Festival of Champions livestream (optional): the two champion alliances, best of five', 'acc');
    if (S.festival && S.festival.pending) add('off2', 'event', 'Festival of Champions: best of five against the ' + S.festival.otherCity + ' champions (travel paid, cannot be skipped)', 'acc');
    C.offEvents(S).forEach(e => {
      const i = D.MONTHS.indexOf(e.month), reg = S.offReg.includes(e.id), done = S.eventsDone[e.id + S.year];
      if (e.invite && !reg && !done && C.summit(S).inv !== C.cy(S)) return; // Summit Champs: only for an invited team
      if (!reg && i < cur) return; // missed: nothing to show
      add(i, 'event', (done ? '✓ ' : reg ? '' : 'Open: ') + e.name + (reg ? '' : ' (' + U.money(e.fee) + ')'), done ? 'good' : reg ? 'acc' : 'dim');
    });
    // development: when each project should finish at its current share of the hours
    if (S.phase !== 'review' && S.phase !== 'end') {
      const plan = C.hoursPlan(S);
      S.projects.forEach(p => {
        const rate = (plan.give[p.id] || 0) * plan.mult(p);
        if (rate < 0.5) { add(cur, 'dev', p.name + ' — no hours this ' + (off ? 'month' : 'week'), 'warn'); return; }
        const turns = Math.max(1, Math.ceil((p.need + (p.extra || 0) - p.done - (p.polish || 0)) / rate - 1e-6));
        add(cur + turns - 1, 'dev', (turns === 1 ? 'Finishes: ' : 'ETA: ') + p.name, turns === 1 ? 'good' : '');
      });
      (S.boosts || []).forEach(b => add(cur + Math.max(0, (b.turns || 1) - 1), 'dev', 'Ends: ' + (b.title || 'boost'), 'dim'));
    }
    // sponsor duties
    (S.activities || []).forEach(a => { if (a.year === S.year && a.status === 'pending') add('b' + a.week, 'sponsor', a.sponsor + ': ' + a.text, 'warn'); });
    return slots;
  };

  // ======================= calendar / turns =======================
  // (3.5) The offseason events of this team: D.OFFSEASON_EVENTS with the names and cities of its home (D.OFFSEASON_BY).
  // A team outside North America has no October event (Summit Champs is that month, an ocean away); one it had
  // already signed up for in an older save stays until it is played.
  C.offEvents = function (S) {
    const by = D.OFFSEASON_BY[D.offseasonHome(S.team)] || D.OFFSEASON_BY[S.team.region] || {}, abroad = D.offseasonAbroad(S.team);
    // where few teams live nearby the events are no bigger than they have to be (24: eight alliances), so that as few
    // guests as possible come from far away
    const near = abroad && S.teams ? Object.values(S.teams).filter(t => D.GROUP[t.region] === D.GROUP[S.team.region] && t.num !== S.team.num).length : 999;
    return D.OFFSEASON_EVENTS.filter(e => !(abroad && e.id === 'os_oct' && !(S.offReg || []).includes(e.id) && !S.eventsDone[e.id + S.year]))
      .map(e => (by[e.id] && !e.invite ? Object.assign({}, e, { name: by[e.id][0], city: by[e.id][1], size: Math.max(24, Math.min(e.size, near + 1)) }) : e));
  };
  C.offEvent = (S, id) => C.offEvents(S).find(x => x.id === id) || null;
  C.eventThisTurn = function (S) {
    // An event stays active (including its results page) until the player leaves it.
    if (S.event) return { active: true, def: null };
    if (S.phase === 'build' && S.week === 7 && S.scrimmage && !S.eventsDone['scrim' + S.year]) return { def: { id: 'scrim' + S.year, kind: 'scrimmage', name: 'Week 0 Scrimmage', size: 18, str: 2, week: 0 } };
    if (S.phase === 'comp') {
      const r = S.regionals.find(x => S.registered.includes(x.id) && x.week === S.week);
      if (r && !S.eventsDone[r.id]) return { def: Object.assign({ kind: 'regional' }, r, G.World.on(S) ? { teams: G.World.attendees(S, r) } : {}) };
      // week 7: the District Championship, for the district teams that made the cut
      if (S.week === 7 && G.World.on(S) && S.team.home && S.season.dcmpQualified && S.dcmpDeclined !== S.year) {
        const e = G.World.dcmpEvent(S, S.team.home);
        if (e && !S.eventsDone[e.id]) return { def: { id: e.id, kind: 'dcmp', name: e.name, region: e.region, dist: e.dist, week: 7, str: 5, size: e.teams.length + 1, teams: G.World.attendees(S, e) } };
      }
    }
    if (S.phase === 'champs' && S.season.champsQualified && !S.eventsDone['champs' + S.year] && !S.champsDeclined) return { def: { id: 'champs' + S.year, kind: 'champs', name: C.champs(S).label + ' — ' + (S.champsDiv || 'Newton') + ' Division', size: 64, str: 5, week: 8, teams: G.World.on(S) ? G.World.champsField(S, 63) : null } };
    if (S.phase === 'off' && S.festival && S.festival.pending && D.MONTHS[S.month] === 'Jul' && S.robot) return { def: { id: 'fest' + S.festival.cy, kind: 'einstein', festival: true, name: 'Festival of Champions', week: 0 } };
    if (S.phase === 'champs' && S.pendingEinstein && !S.eventsDone['ein' + S.year]) {
      const watch = !!(S.lastDivision && S.lastDivision.watch); // out of the tournament, on Einstein for the FIRST Impact Award
      return { def: { id: 'ein' + S.year, kind: 'einstein', name: watch ? 'Einstein Field: finals and awards' : 'Einstein Field', week: 8, watch } };
    }
    if (S.phase === 'off' && S.robot) {
      const o = C.offEvents(S).find(x => S.offReg.includes(x.id) && x.month === D.MONTHS[S.month] && !S.eventsDone[x.id + S.year]); // two in one month (Summit Champs and the October event at home): one after the other
      if (o && !S.eventsDone[o.id + S.year]) return { def: o.invite ? C.summitDef(S, o) : { id: o.id + S.year, kind: 'offseason', name: o.name, size: o.size, str: 3, week: 0, hub: o.city, zone: D.offseasonHome(S.team) } }; // (3.5) hub: its city; zone: whose teams fill the field
    }
    return null;
  };
  // How the team gets there: local, drive, fly — or, with a team trailer, a long drive instead of flying the robot.
  // (3.5) An event in another part of the world is a flight overseas (intl): dearer, harder on the robot, and no trip
  // for the trailer. The Championship is in the middle of North America: overseas for every team from outside it.
  // (3.5.1) The city an event is held in: the Championship's, Summit Champs', an event's own (def.hub), or where the
  // World map has it. '' when it cannot be told (a single season's regionals, a scrimmage).
  C.eventCity = function (S, def) {
    if (!def || !G.Geo || !G.Geo.hub) return '';
    try {
      if (def.kind === 'champs') return C.champs(S).city || '';
      if (def.summit || def.id === D.SUMMIT.id) return D.SUMMIT.city || '';
      if (def.hub && G.Geo.hub(def.hub)) return def.hub;
      if (G.World.on(S) && S.wseason) { const e = S.wseason.events.find(x => x.id === def.id); if (e) return G.Geo.eventPos(S.wseason, e).hub || ''; }
    } catch (x) { /* an event the map does not know */ }
    return '';
  };
  // (3.5.1) By miles, from the team's city to the event's (D.tripTier): the same city or a short trip is local, up to
  // a day's drive is a drive, more is a flight, and a city no road reaches is always a flight, with no trailer. A
  // district's own events are never a flight. Where either city is unknown, by areas as before.
  C.travelMode = function (S, def) {
    if (def.kind === 'einstein') return 'none';
    const home = S.team.region, me = G.Geo && G.Geo.cityOf ? G.Geo.cityOf(S) : '', at = def.kind === 'scrimmage' ? '' : C.eventCity(S, def);
    let tier = me && at && D.tripTier ? D.tripTier(me, at) : null, road = true;
    if (tier) { road = D.roadNet(me) === D.roadNet(at); if (tier === 'fly' && road && S.team.home && (def.kind === 'dcmp' || def.dist === S.team.home)) tier = 'drive'; }
    else {
      tier = def.kind === 'champs' ? (D.overseas(home, 'Midwest') ? 'intl' : 'fly') : def.kind === 'dcmp' ? 'drive' : def.kind === 'regional' ? D.travelTier(home, def.region, def.local) : 'local';
      if (def.kind === 'offseason') tier = def.summit ? D.travelTier(home, D.SUMMIT.region, false) : 'drive'; // Summit Champs: California
    }
    if (tier === 'fly' && road && G.Shop.lvl(S, 'trailer')) return 'trailer';
    return tier;
  };
  // ... for a list (the Calendar): the tier, with a trailer's long drive counted as the flight it replaces
  C.travelTierOf = (S, def) => { const m = C.travelMode(S, def); return m === 'trailer' ? 'fly' : m === 'none' ? 'local' : m; };
  C.byAir = mode => mode === 'fly' || mode === 'intl';
  // A bigger team costs more to move: the robot's freight and the tools cost every team the same, the seats, rooms and
  // meals grow with the students who go. The D.TRAVEL prices are for a team of 25 (×0.72 at 15, ×1.42 at 40).
  C.travelSize = S => { const n = Math.min(80, Math.max(5, S.studentsCount || (S.students || []).length || 25)); return 0.3 + 0.7 * n / 25; };
  C.travelCost = function (S, def) {
    if (def.kind === 'einstein') return 0;
    const mode = C.travelMode(S, def), tier = mode === 'trailer' ? 'fly' : mode;
    let c = D.TRAVEL[tier].cost * (def.kind === 'offseason' && !def.summit ? 0.4 : 1) * (mode === 'trailer' ? D.TRAILER_LONG : 1) * C.travelSize(S);
    if (!C.byAir(tier)) c *= G.Shop.travelMult(S);
    if (C.hasPerk(S, 'travelDiscount')) c *= 0.75;
    if (C.selfPayOn(S, def)) c *= D.SELF_PAY.cost; // (3.5.1) the students pay their own way
    return Math.round(c);
  };
  // (3.5.1) Students pay for their own travel to one event (chosen before leaving, on Headquarters): the team pays far
  // less, but it costs morale and reputation, the more the farther the trip, and fewer students come, so scouting and
  // the repairs between matches are a little weaker at that event (D.SELF_PAY).
  C.selfPayOn = (S, def) => !!(def && S.selfPay && S.selfPay === def.id && def.kind !== 'einstein');
  C.selfPayCost = function (S, def) { const m = C.travelMode(S, def), P = D.SELF_PAY; return { morale: P.morale[m] || 0, rep: P.rep[m] || 0 }; };
  C.setSelfPay = function (S, def, on) { S.selfPay = on && def && def.kind !== 'einstein' ? def.id : null; };
  C.startEvent = function (S, def) {
    if (S.event) return S.event; // never overwrite an event in progress
    S.lastEventTurn = turnKey(S);
    const self = C.selfPayOn(S, def);
    if (def.kind !== 'einstein') {
      const tc = C.travelCost(S, def);
      if (tc) C.spend(S, tc, 'Travel: ' + def.name + (self ? ' (students paid their own way)' : ''));
      if (def.kind === 'dcmp') C.spend(S, D.FEES.dcmp, 'Registration: ' + def.name);
    }
    if (self) { const k = C.selfPayCost(S, def); S.morale = U.clamp(S.morale - k.morale, 0, 100); if (k.rep) C.addRep(S, -k.rep); S.selfPaid = S.turnSeq || 0; }
    S.selfPay = null;
    if (def.kind === 'einstein') return C.startEinstein(S, def);
    const mode = C.travelMode(S, def), fly = C.byAir(mode), intl = mode === 'intl';
    if (intl) S.lastEventIntl = turnKey(S); // jet lag (fatigueNext)
    G.Shop.wear(S, 'event', { fly });
    // The robot arrives at 100% unless: not enough spare parts for the repairs, a long trip (shipped by air),
    // or a sponsor demo with the robot this same competition week. (Einstein follows the division too closely for any of this.)
    const arrival = { notes: [] };
    if (S.robot && S.autoSpares && def.kind !== 'einstein') {
      const want = C.spareEstimate(S, def.kind) - S.parts.spares, r = C.autoBuySpares(S, want, 'for ' + def.name);
      if (r.bought) arrival.notes.push('Auto-restock bought ' + r.bought + ' spare part' + (r.bought > 1 ? 's' : '') + ' for this event.');
      if (r.short) arrival.notes.push('Auto-restock could only afford ' + r.bought + ' of the ' + want + ' spare parts this event needs.');
    }
    if (C.travelMode(S, def) === 'trailer') arrival.notes.push('The robot travelled in the team trailer: no air-freight knocks.');
    if (S.robot) {
      G.Robot.famDrive(S, S.robot.comp || 0, 0);
      const rep = G.Robot.homeRepair(S, true);
      if (rep.used) arrival.notes.push('Repairs used ' + rep.used + ' spare part' + (rep.used > 1 ? 's' : '') + '.');
      if (rep.short) arrival.notes.push('Not enough spare parts to finish the repairs (' + rep.short + ' condition points left).');
      const hit = (amt, why) => { Object.values(S.robot.subs).forEach(x => { if (x.ver && x !== S.robot.subs.soft) x.cond = Math.max(0, x.cond - amt()); }); arrival.notes.push(why); };
      if (intl) hit(() => G.R.range(D.INTL_KNOCKS[0], D.INTL_KNOCKS[1]), 'The robot crossed an ocean in its crate and took some knocks on the way.');
      else if (fly) hit(() => G.R.range(4, 9), 'The robot was shipped by air and took some knocks in transit.');
      if (S.demoWear && S.demoWear.key === turnKey(S)) { hit(() => S.demoWear.amt, 'The sponsor demo earlier this week left wear the team had no time to fix.'); }
      S.demoWear = null;
      arrival.cond = Math.round(G.Robot.condAvg(S));
    }
    // (3.5.3) the team brings every robot part and fits the best there are on the competition robot: what it went into
    // the bag with is free again, and what the team fits here is what it keeps in the bag afterwards (G.Parts.bagLocked)
    if (S.bagParts) delete S.bagParts;
    if (C.bagged(S)) S.bagEv = S.year;
    S.wearTick = (S.wearTick || 0) + 1;
    // (3.5.3) a mechanism the competition robot lacks, built and waiting at home, goes along (in the crate, in the bag years)
    if (S.robot && def.kind !== 'einstein' && G.Robot.autoCrate) {
      const took = G.Robot.autoCrate(S);
      if (took.length) arrival.notes.push((G.Robot.held(S).some(h => h.crate) ? 'The competition robot lacked them, so the team packed them in the crate: ' + took.join(', ') + '. They go on at practice day (Install Upgrade).' : 'The competition robot lacked them, so the team fitted them before the trip: ' + took.join(', ') + '.'));
      G.Robot.held(S).forEach(h => { delete h.crate; });
    }
    if (S.robot && G.Robot.held(S).length && S.team.home && G.World.on(S) && (def.dist || def.kind === 'dcmp')) {
      const fit = G.Robot.installHeld(S);
      if (fit.length) arrival.notes.push('Robot access window: in the six hours before the event the team fitted ' + fit.join(', ') + '.');
    }
    if (['regional', 'dcmp', 'champs'].includes(def.kind)) G.Parts.loyalSample(S);
    if (self) arrival.notes.push('The students paid their own way, and not all of them could: a thinner scouting crew and fewer hands in the pit this event.');
    const ev = G.Ev.start(Object.assign({ year: S.year }, def));
    if (self) ev.selfPay = true;
    ev.batts = S.parts.batts.map(() => 1);
    ev.arrival = arrival;
    if (def.summit) { ev.summit = true; C.summitConference(S, ev); } // Summit Champs: the mentor conference comes before practice
    return ev;
  };
  // Spare parts the next event will probably use: today's repairs plus wear over the matches
  C.spareEstimate = function (S, kind) {
    if (!S.robot) return 0;
    const subs = Object.keys(S.robot.subs).filter(k => k !== 'soft' && S.robot.subs[k].ver).length;
    // about 4 condition points per subsystem per match on average, but falls and breakages vary a lot: +25% and two extra
    // (running out mid-event caps pit repairs at 60%; leftovers carry over to the next event)
    const matches = { champs: 13, offseason: 10, scrimmage: 5 }[kind] || 12;
    return Math.max(0, Math.ceil(G.Robot.repairNeed(S) + 1.25 * matches * subs * 4 / D.SPARE_COND_PER_UNIT + 2));
  };
  // What the robot's condition will be when it arrives at an event (HQ / calendar preview)
  C.arrivalPreview = function (S, def) {
    if (!S.robot || !def || def.kind === 'einstein') return null;
    const notes = [], need = G.Robot.repairNeed(S), have = Math.max(0, S.parts.spares - (S.parts.spareUse || 0));
    let cond = 100;
    if (need > have + 0.01) { notes.push('short on spare parts'); cond -= Math.min(25, (need - have) * D.SPARE_COND_PER_UNIT / Math.max(1, Object.values(S.robot.subs).filter(x => x.ver).length)); }
    const mode = C.travelMode(S, def);
    if (mode === 'intl') { notes.push('flying overseas (−' + D.INTL_KNOCKS[0] + '–' + D.INTL_KNOCKS[1] + '%)'); cond -= (D.INTL_KNOCKS[0] + D.INTL_KNOCKS[1]) / 2; }
    else if (mode === 'fly') { notes.push('flying (−4–9%)'); cond -= 6.5; }
    if (S.demoWear && S.demoWear.key === turnKey(S)) { notes.push('sponsor demo this week (−' + S.demoWear.amt + '%)'); cond -= S.demoWear.amt; }
    return { cond: Math.round(cond), notes, spares: Math.max(0, Math.ceil(need - have)) };
  };
  C.startEinstein = function (S, def) {
    if (def.festival) return C.startFestival(S, def);
    const div = S.lastDivision, CH = C.champs(S);
    const ev = G.Ev.start({ id: def.id, kind: 'einstein', name: def.name, size: 1, year: S.year, week: 8, str: 5, fmt: S.cal ? CH.fmt : 'de' });
    ev.watch = !!div.watch; // your team is in the stands: div.alliance is the alliance that won your division
    ev.batts = S.parts.batts.map(() => 1);
    const rng = G.R;
    const myAll = div.alliance.slice();
    const exclude = new Set(div.teams);
    // the other division champions: each led by its division's elite teams (world simulation), with strong partners
    const other = (S.wseason && S.wseason.cmp && S.wseason.cmp.divs) || [], used = new Set(exclude);
    const strong = rng.shuffle(Object.values(S.teams).filter(t => !exclude.has(t.num) && !t.elite).sort((a, b) => b.str - a.str).slice(0, 60));
    const alliances = [myAll];
    for (let i = 0; i < (S.cal ? CH.divs : 8) - 1; i++) {
      const al = (other[i] || []).filter(n => S.teams[n] && !used.has(n)).sort((a, b) => S.teams[b].str - S.teams[a].str).slice(0, G.World.eliteCfg(S).ein);
      while (al.length < 3 && strong.length) { const t = strong.shift(); if (!used.has(t.num)) al.push(t.num); }
      al.forEach(n => used.add(n)); alliances.push(al);
    }
    rng.shuffle(alliances);
    ev.teams = [].concat(...alliances);
    ev.teams.forEach(n => {
      if (n !== S.team.num) ev.caps[n] = div.caps[n] || G.AI.entry(S.teams[n], S.year, 1.12, { easy: 0.9, normal: 1, hard: 1.1 }[S.diff] || 1, rng);
      ev.rank[n] = { rp: 0, played: 0, w: 0, l: 0, t: 0, pts: 0, auto: 0, tb: 0 };
    });
    ev.alliances = alliances;
    // each Einstein alliance is a division champion: yours keeps its division, the others take the remaining names
    { const rest = rng.shuffle((S.cal ? CH.div : DIVS).filter(d => d !== S.champsDiv)); let k = 0; ev.divNames = alliances.map(al => (al === myAll ? S.champsDiv : rest[k++ % rest.length])); }
    ev.oprBase = C.einsteinOpr(S, ev, div);
    ev.tune = div.tune; ev.conf = div.conf; ev.tuneAuto = div.tuneAuto;
    // Einstein is part of the Championship: same fatigue, same scouting team
    if (div.fatigue != null) { ev.fatigue = div.fatigue; ev.scoutCred = div.scoutCred; }
    ev.practice.blocks = 0;
    G.Ev.initPlayoffs(ev);
    return ev;
  };
  C.startFestival = function (S, def) {
    const F = S.festival, rng = G.R;
    const ev = G.Ev.start({ id: def.id, kind: 'einstein', name: def.name, size: 1, year: S.robot.year, week: 0, str: 5, fmt: 'f5' });
    ev.festival = true; ev.batts = S.parts.batts.map(() => 1);
    const mine = F.alliance.filter(n => n === S.team.num || S.teams[n]).slice(0, 3);
    const strong = Object.values(S.teams).filter(t => !mine.includes(t.num)).sort((a, b) => b.str - a.str).slice(0, 12);
    rng.shuffle(strong);
    while (mine.length < 3 && strong.length) mine.push(strong.pop().num);
    // the other Championship's winners come from its real field in the world simulation
    const other = champAlliance(S, Math.max(0, G.Era.champs(F.cy).cities.indexOf(F.otherCity)), F.cy, [], mine, rng);
    ev.alliances = rng.chance(0.5) ? [mine, other] : [other, mine];
    ev.teams = [].concat(...ev.alliances);
    ev.teams.forEach(n => { if (n !== S.team.num) ev.caps[n] = G.AI.entry(S.teams[n], ev.year, 1.14, { easy: 0.9, normal: 1, hard: 1.1 }[S.diff] || 1, rng); ev.rank[n] = { rp: 0, played: 0, w: 0, l: 0, t: 0, pts: 0, auto: 0, tb: 0 }; });
    ev.divNames = ev.alliances.map(al => (al === mine ? F.city : F.otherCity));
    ev.practice.blocks = 0;
    G.Ev.initPlayoffs(ev);
    return ev;
  };

  // Einstein starts from what the divisions showed: your division's OPR for its teams, and for the other champions an
  // estimate from the same strength-to-OPR relation (new Einstein matches then pull the numbers toward what happens there)
  C.einsteinOpr = function (S, ev, div) {
    const base = {}, opr = div.opr || {};
    const pts = (div.teams || []).filter(n => n !== S.team.num && S.teams[n] && opr[n] != null).map(n => [S.teams[n].str, opr[n]]);
    let a = 0, b = 0;
    if (pts.length >= 6) {
      const mx = U.avg(pts.map(p => p[0])), my = U.avg(pts.map(p => p[1]));
      let sxy = 0, sxx = 0; pts.forEach(p => { sxy += (p[0] - mx) * (p[1] - my); sxx += (p[0] - mx) * (p[0] - mx); });
      b = sxx ? sxy / sxx : 0; a = my - b * mx;
    }
    const top = Object.keys(opr).map(k => opr[k]).sort((x, y) => y - x);
    ev.teams.forEach(n => {
      if (opr[n] != null) { base[n] = opr[n]; return; }
      const T = S.teams[n];
      base[n] = Math.round(Math.max(0, pts.length >= 6 && T ? a + b * T.str : (top[8] || 0)) * 10) / 10;
    });
    return base;
  };
  C.leaveEvent = function (S) {
    const ev = S.event;
    if (!ev) return;
    if (ev.kind === 'einstein' || (ev.kind === 'champs' && !S.pendingEinstein)) C.settleImpact(S, 'all');
    if (ev.kind === 'einstein' || (ev.kind === 'champs' && !S.pendingEinstein)) C.settleWfa(S);
    S.eventsDone[ev.id] = true;
    S.event = null;
  };

  // Hours available this turn
  // Team hours for this turn. breakdown=true returns the pieces for the UI.
  C.turnHours = function (S, eventWeek, breakdown) {
    let mult, why;
    if (S.phase === 'off') { const summer = ['Jun', 'Jul', 'Aug'].includes(D.MONTHS[S.month]); mult = (summer ? 0.4 : 0.6) * 4; why = (summer ? 'summer' : 'school-year') + ' month (×' + mult.toFixed(1) + ')'; }
    else if (S.phase === 'build' || S.phase === 'kickoff') { mult = S.overtime ? 1.3 : 1; why = S.overtime ? 'overtime week (×1.3)' : 'build week'; }
    else if (S.phase === 'comp') { mult = eventWeek ? 0.3 : 0.8; why = eventWeek ? 'event week (×0.3)' : 'competition week (×0.8)'; }
    else { mult = 0.5; why = '×0.5'; }
    const perStudent = S.phase === 'off' ? 5 : 7;
    const stud = S.studentsCount * perStudent;
    let ment = U.sum(S.mentors.map(m => m.hours)) + (C.hasPerk(S, 'tempMentor') ? 10 : 0) + G.Shop.guestHours(S);
    // (3.5.6) in the offseason the mentors also see your own FTC teams through their season: a few hours a week each, never more than half of what the mentors give
    const ftcH = S.phase === 'off' ? Math.min(Math.floor(ment / 2), C.ownTeams(S) * D.FTC_OWN.mentorH) : 0; ment -= ftcH;
    const moraleM = 0.8 + 0.3 * S.morale / 100, boost = 1 + G.Shop.boostHours(S);
    const total = Math.round((stud + ment) * mult * moraleM * boost);
    if (!breakdown) return total;
    return { total, stud, ment, perStudent, students: S.studentsCount, mult, why, moraleM, boost, ftcH, ftcN: C.ownTeams(S) };
  };
  C.isEventTurn = S => S.lastEventTurn === turnKey(S) || !!(C.eventThisTurn(S) && S.phase !== 'off');
  // Testing hours: limited practice-field time each week (like wind-tunnel time), split between development
  // testing and driver practice. Unlocked by the Practice Field; a practice robot adds more.
  C.TEST_SPLITS = [0, 0.25, 0.5, 0.75, 1];
  C.testHours = function (S, eventWeek) {
    const lvl = G.Shop.lvl(S, 'pfield'), R = S.robot;
    // a runnable second robot this season (a test chassis counts)
    const chassis = !!(R && R.bots && R.year === S.year && S.phase !== 'off' && G.Robot.runnable(R, G.Robot.other(R)));
    if ((!lvl && !chassis) || !['off', 'kickoff', 'build', 'comp'].includes(S.phase)) return { total: 0, drive: 0, dev: 0, unlocked: !!lvl };
    if (C.bagged(S) && !chassis) return { total: 0, drive: 0, dev: 0, unlocked: !!lvl, bagged: true }; // nothing to run on the field: the robot is in the bag
    if (eventWeek == null) eventWeek = C.isEventTurn(S);
    let h = lvl ? G.Shop.fx(S, 'pfield', 'test') + D.TEST_BOT_HOURS * Math.max(G.Robot.secondShare(S), chassis ? D.CHASSIS_SHARE : 0) : D.CHASSIS_TEST_HOURS;
    if (S.phase === 'off') h *= 4;
    if (eventWeek) h *= 0.5;
    h = Math.round(h);
    const canDrive = G.Robot.driveBot(S) >= 0, split = canDrive ? (S.testSplit == null ? 0.5 : S.testSplit) : 0;
    const drive = Math.round(h * split);
    // driver practice on the real game needs this season's game elements (offseason: last season's game)
    const elem = lvl ? G.Parts.elemQ(S, G.Parts.elemYear(S)) : D.CHASSIS_ELEM;
    // (3.5.3) the development hours that run on the second robot: all of them without a Practice Field or while the
    // competition robot is in the bag, else its share on the field (a Vision Level needs its cameras there: G.Robot.vision2)
    const on2 = !chassis ? 0 : !lvl || C.bagged(S) ? h : Math.min(h, Math.round(D.TEST_BOT_HOURS * Math.max(G.Robot.secondShare(S), D.CHASSIS_SHARE) * (eventWeek ? 0.5 : 1)));
    // what each robot's parts make of its hours (an overloaded CAN bus, cameras without a network switch): G.Parts.devK,
    // applied in G.Robot.testShare
    return { total: h, drive, dev: h - drive, dev2: Math.min(h - drive, Math.round(on2 * (1 - split))), unlocked: true, limited: !lvl, elem, canDrive, unit: S.phase === 'off' ? 'month' : 'week' };
  };
  C.setTestSplit = function (S, v) { S.testSplit = U.clamp(Number(v), 0, 1); };
  // Driver practice: drive-team skills, confidence and familiarity with the robot they drive; uses a few spare parts
  // and a little battery life. Out of spares, the robot they practice on wears.
  function driverPractice(S, th) {
    const h = th.drive, bi = G.Robot.driveBot(S);
    if (!h || !S.robot || bi < 0) return null;
    const R = S.robot, eff = h * th.elem * (bi !== (R.comp || 0) ? 1 + (D.BOT2_PRACTICE - 1) * G.Robot.secondShare(S) : 1), out = { hours: h, spares: 0, wear: 0, bot: bi };
    G.Parts.wearPractice(S, h, bi);                 // motors and electronics on the robot that practices
    G.Robot.famDrive(S, bi, 1 - Math.exp(-eff / D.FAM.PRACTICE));
    G.Parts.wearElem(S, G.Parts.elemYear(S), h);    // and the game elements on the field
    S.practiceWeeks = Math.min(D.DRILL_CAP, (S.practiceWeeks || 0) + eff / D.DRILL_PER);
    // two running robots: one plays defender, so the drive team learns to keep cycling under pressure (not while the
    // competition robot is in the bag: only one robot drives at home then)
    if (G.Robot.drillPair(S) && R.year === S.year) { out.def0 = S.defDrill || 0; S.defDrill = Math.min(1, (S.defDrill || 0) + eff / D.DEF_DRILL_HOURS); out.def1 = S.defDrill; }
    const dt = C.driveTeam(S), k = 0.15 * eff;
    if (dt.driver.id) studentXP(S, dt.driver, ['drive', 'aware', 'comp'], k);
    if (dt.operator.id) studentXP(S, dt.operator, ['mech', 'comp'], k);
    if (dt.hp.id) studentXP(S, dt.hp, ['hp'], k * 0.6);
    if (dt.coach && dt.coach.id) studentXP(S, dt.coach, ['strat'], k * 0.6);
    const P = S.parts;
    if (P.spares > 0) {
      P.drillUse = (P.drillUse || 0) + h * D.DRILL_SPARES;
      while (P.drillUse >= 1 && P.spares > 0) { P.spares--; P.drillUse--; out.spares++; }
    } else {
      // no spares: broken bits stay broken, and the robot they practice on wears
      P.drillUse = 0;
      const sb = S.robot.bots[bi].subs, subs = Object.keys(sb).filter(k => k !== 'soft' && sb[k] && sb[k].ver).map(k => sb[k]);
      out.wear = Math.round(h * D.DRILL_WEAR);
      subs.forEach(x => x.cond = Math.max(0, x.cond - out.wear * G.R.range(0.6, 1.4)));
    }
    if (P.batts.length) P.batts.forEach(b => b.h = Math.max(0.3, b.h - D.DRILL_BATT * h / P.batts.length * G.R.range(0.5, 1.5)));
    return out;
  }
  // Stop Build Day (2016 to 2019): from the first competition week the competition robot is in the bag and may only
  // be touched at events. At home the team works from drawings and fits the parts in the pits, so hardware projects
  // run at half speed. A team with a second robot has something to build on and try parts on: no penalty at all.
  // The drive team can only practise at home on a second robot (Robot.driveBot).
  C.bagged = S => !!(S && S.cal && G.Era.of(S).bag && S.robot && S.robot.year === S.year && (S.phase === 'comp' || S.phase === 'champs'));
  C.bagK = function (S) {
    if (!C.bagged(S)) return 1;
    const win = S.team.home && G.World.on(S) ? 0.15 : 0; // district teams: six hours with the robot before each event
    return G.Robot.secondRuns(S) ? 1 : Math.min(1, 0.5 + win);
  };
  C.bagMods = S => { const k = C.bagK(S); return k < 1 ? { fab: k } : null; };
  // the first competition week: the robot is bagged (a pop-up the first time in a career, a note every season)
  C.bagDay = function (S) {
    if (!C.bagged(S)) return;
    const k = C.bagK(S), second = G.Robot.secondRuns(S);
    // two robots that both run: the team picks the one that goes in the bag (the competition robot by default)
    if (G.Robot.runnable(S.robot, 0) && G.Robot.runnable(S.robot, 1)) { S.bagPick = true; (S.launchQueue = S.launchQueue || []).push({ kind: 'bagPick' }); }
    if (!(S.storySeen = S.storySeen || {}).bagday) C.tellStory(S, D.STORY_BAG);
    else C.inbox(S, 'Stop Build Day', 'The competition robot is in the bag until the season ends. ' + (second ? 'Your second robot carries the work: hardware projects keep their full speed, and the drivers practise on it.' : 'With no second robot, hardware projects run at half speed and the drive team cannot practise at home.') + ' New units and upgrades you finish now are packed and fitted on practice day at your next event (Install Upgrade). Software and program projects carry on as usual.', 'dev', { prio: true });
  };

  // Stop Build Day: put the chosen robot in the bag (it becomes the competition robot). Only on the day itself.
  C.bagPick = function (S, bi) {
    if (!S.bagPick) return 'The robot is already in the bag';
    const R = S.robot;
    if (!G.Robot.runnable(R, bi)) return R.bots[bi].name + ' has no drivetrain';
    S.bagPick = false;
    if (bi !== (R.comp || 0)) { R.comp = bi; R.pending = []; if (R.drive === bi) R.drive = 1 - bi; S.wearTick = (S.wearTick || 0) + 1; }
    return null;
  };
  // Hours still free this turn after team activities
  C.freeHours = S => Math.max(0, C.turnHours(S, C.isEventTurn(S)) - S.actHours);
  // This turn's development plan: how free hours will be shared between projects
  C.hoursPlan = function (S) {
    const free = C.freeHours(S);
    const mods = mergeMods(mergeMods(S.devMods ? S.devMods.mods : null, G.Shop.boostMods(S)), C.bagMods(S));
    return Object.assign(G.Robot.alloc(S, free, mods), { free, mods });
  };
  // Auto-fill: turn this turn's idle hours into extra hours on the projects that are already running, down to the idle
  // time worth keeping: a tenth of the hours in season (it holds fatigue steady), none in the offseason (no fatigue).
  // It starts no project and takes nothing back, so a week that is already 90% full is left alone. Returns the hours added.
  // the share of a week's hours left idle that holds fatigue steady: 10%, less with a Break Room
  C.idleTarget = S => D.FATIGUE_IDLE - G.Shop.fx(S, 'lounge', 'rest');
  C.autoExtraTarget = S => (['kickoff', 'build', 'comp'].includes(S.phase) ? C.idleTarget(S) : S.phase === 'off' ? 0 : null);
  C.autoExtra = function (S) {
    const k = C.autoExtraTarget(S), W = { high: 3, normal: 2, low: 1 }, Rb = G.Robot;
    if (k == null) return 0;
    let added = 0;
    for (let pass = 0; pass < 8; pass++) {
      const plan = C.hoursPlan(S), spare = plan.idle - k * plan.free;
      if (spare < 1) break;
      const room = p => 2 * Rb.capFor(S, p) - (plan.give[p.id] || 0) - (plan.pol[p.id] || 0); // what it can still absorb this turn
      const cand = S.projects.filter(p => !Rb.isFab(p) && plan.mult(p) > 0 && (p.extra || 0) < p.need - 0.5 && room(p) > 0.5);
      if (!cand.length) break;
      const tw = cand.reduce((t, p) => t + W[p.prio], 0);
      let did = 0;
      cand.forEach(p => {
        const m = Math.max(plan.mult(p), 0.01), raw = Math.min(spare * W[p.prio] / tw, room(p), (p.need - (p.extra || 0)) / m);
        const add = Math.floor(raw * m + 1e-6); // extra hours are counted in work done, after this turn's speed changes
        if (add >= 1) { p.extra = Math.min(p.need, (p.extra || 0) + add); did += add; }
      });
      if (!did) { // shares under an hour each: the first project that has room takes what is left
        const p = cand[0], m = Math.max(plan.mult(p), 0.01), add = Math.floor(Math.min(spare, room(p), (p.need - (p.extra || 0)) / m) * m + 1e-6);
        if (add < 1) break;
        p.extra = Math.min(p.need, (p.extra || 0) + add); did = add;
      }
      added += did;
    }
    return Math.round(added);
  };
  function mergeMods(a, b) {
    if (!a && !b) return null;
    const m = Object.assign({}, a || {});
    Object.keys(b || {}).forEach(k => { m[k] = (m[k] == null ? 1 : m[k]) * b[k]; });
    return m;
  }
  C.blockers = function (S) {
    const b = [];
    const ev = C.eventThisTurn(S);
    if (ev && ev.active) b.push(S.event && S.event.stream ? 'The Festival livestream is still open: close it first (Event).' : 'Finish the current event first.');
    else if (ev && ev.def) b.push('You have an event this turn: ' + ev.def.name + '.' + (ev.def.festival ? ' Both champion alliances are expected: it cannot be skipped, and the trip costs you nothing.' : ''));
    if (C.dueActivities(S).length) b.push('Sponsor activities need a decision (Inbox).');
    if (S.incident) b.push('A shop incident needs a decision: ' + S.incident.title + '.');
    if (S.dispute) b.push('A team dispute needs a decision: ' + S.dispute.title + '.');
    if (S.bagPick) b.push('Stop Build Day: choose which robot goes in the bag (Headquarters).'); // (3.5.2)
    if (S.lostYear && S.lostYear.stage === 'choose') b.push('Choose the team\'s two programs for the year at home (Headquarters).');
    if (S.loyalOffer && S.loyalOffer.stage === 'choose') b.push('Choose your loyalty sponsorship from ' + D.VENDORS[S.loyalOffer.brand].name + ' (Headquarters).');
    if (S.prizeOffer && S.prizeOffer.stage === 'choose') b.push('Choose your ' + S.prizeOffer.name + ' prize (Headquarters).');
    if (S.districtOffer && S.districtOffer.stage === 'choose') b.push('Decide whether to join the ' + D.DISTRICT[S.districtOffer.id].name + ' (Headquarters).');
    if (C.needReg(S)) b.push('Register for at least one ' + C.evWord(S) + ' before Kickoff (Calendar).');
    return b;
  };
  // December, the last turn before Kickoff: a career team goes into the season registered for at least one event. Not
  // enforced when nothing is open to it or it cannot pay the fee (in the offseason only cash can be spent).
  C.needReg = S => S.mode === 'career' && S.phase === 'off' && S.month >= D.MONTHS.length - 1 && !S.registered.length &&
    (S.regionals || []).some(r => !C.canRegister(S, r)) && !C.afford(S, C.regFee(S));
  // ...and when it cannot register yet (no cash for the fee, nothing open), the same December turn only warns
  C.regWarn = S => S.mode === 'career' && S.phase === 'off' && S.month >= D.MONTHS.length - 1 && !S.registered.length && !C.needReg(S);
  C.advance = function (S) {
    if (C.blockers(S).length) return C.blockers(S);
    S.turnSeq = (S.turnSeq || 0) + 1; // (3.1.2) every message stamps the turn it arrived in (m.tq): the Inbox divides this turn's from older ones
    C.announceSignings(S); // (3.5) sponsors signed and mentors hired last turn: final now, so the Inbox hears of them
    C.autoActivities(S); // "every turn": free activity slots are filled first (they take hours too)
    if (S.settings && S.settings.autoExtra) C.autoExtra(S); // "every turn": idle hours go to extra hours before they are spent
    if (G.Robot.autoScrapOn(S) && !G.Robot.garageLock(S)) G.Robot.scrapOld(S); // Garage setting: old versions in storage are taken apart
    const thisWeekEvent = S.lastEventTurn === turnKey(S);
    S.launchQueue = []; // launch pop-ups belong to the turn they happened in
    const hours = Math.max(0, C.turnHours(S, thisWeekEvent) - S.actHours);
    const th = C.testHours(S, thisWeekEvent);
    S.actHours = 0;
    switch (S.phase) {
      case 'off': processWork(S, hours, th); offMonthEnd(S); break;
      case 'kickoff': { const r = processWork(S, hours, th); fatigueWeek(S, hours, r.spare, false); S.phase = 'build'; S.week = 1; G.News.refTalk(S, 'wait'); break; } // the team argues: wait for the published designs?
      case 'build': processWeek(S, hours, th); if (S.week >= 7) { S.phase = 'comp'; S.week = 1; C.bagDay(S); } else { S.week++; if (S.week === D.REF_WEEK) C.refRelease(S); if (S.week === D.REF_WEEK + 1) G.News.refTalk(S, 'after'); } break;
      case 'comp': processWeek(S, hours, th); if (G.World.on(S)) G.World.weekDone(S, S.week); if (S.week >= 7) C.toChamps(S); else S.week++; break;
      case 'champs': C.toReview(S); break;
      case 'review': C.endReview(S); break;
    }
    // new turn: random news, team chatter, (rarely) a shop incident or a school/sponsor opportunity
    delete S.lastOutcome; // the result of last turn's decision has been seen
    if (['off', 'build', 'comp'].includes(S.phase)) { G.News.turn(S); G.Shop.rollIncident(S); C.rollDispute(S); G.Shop.rollBoost(S); C.rollDonation(S); }
    C.boardInvite(S); C.eduGrantMonth(S); // (3.5.1) the school board asks to watch this week's event; the offseason grant from the education office
    G.Parts.rollStock(S);
    if (S.phase === 'build' || S.phase === 'comp') C.weeklySuggestion(S);
    S.overtime = false;
    S.sponsors.forEach(sp => { delete sp.undo; });
    S.mentors.forEach(m => { delete m.undo; });
    delete S.regUndo; // registrations made last turn are final now
    G.Save.write('auto');
    return null;
  };
  function turnKey(S) { return S.phase + ':' + S.week + ':' + S.month + ':' + S.year; }
  C.turnKey = turnKey;
  C.markEventTurn = S => { S.lastEventTurn = turnKey(S); };
  function processWork(S, hours, th) {
    const inc = G.Shop.turnMods(S); // shop incidents: one turn only
    const mods = mergeMods(mergeMods(inc, G.Shop.boostMods(S)), C.bagMods(S));
    const r = G.Robot.work(S, hours, mods, th ? th.dev : 0, !!(th && th.limited), th ? th.dev2 || 0 : 0);
    // the drive team drives the robot around the shop every week (practice-field time comes on top)
    if (S.robot && S.robot.bots && S.lastEventTurn !== turnKey(S)) G.Robot.famDrive(S, G.Robot.driveBot(S), S.phase === 'off' ? D.FAM.OFF : D.FAM.WEEK);
    S.lastWork = { hours, used: Math.round(r.used), idle: Math.round(r.spare), polished: Math.round(r.polished || 0), done: r.done, mods: inc ? G.Shop.modsText(inc) : '' };
    S.lastRestock = null;
    if (S.autoSpares && S.robot && (S.phase === 'off' ? th && th.drive > 0 : true)) {
      const want = C.spareBuffer(S, th) - S.parts.spares;
      if (want > 0) S.lastRestock = Object.assign({ want }, C.autoBuySpares(S, want, 'weekly', true));
    }
    if (th && th.total) {
      if (r.testUsed > 0.05) C.spend(S, r.testUsed * D.TEST_COST * (th.limited ? D.CHASSIS_TEST_COST : 1), (th.limited ? 'Test chassis testing (' : 'Development testing (') + Math.round(r.testUsed) + ' h)');
      const dp = driverPractice(S, th);
      // a running second robot (a test chassis counts) is a full control system to wire, power up and debug, weeks before the competition robot
      if (G.Robot.secondRuns(S)) { S.elecShake = Math.min(1, (S.elecShake || 0) + th.total / D.ELEC_SHAKE_HOURS); G.Robot.addXP(S, 'elec', D.ELEC_SHAKE_XP); }
      S.lastTest = { total: th.total, dev: th.dev, devUsed: Math.round(r.testUsed), devIdle: Math.round(r.testIdle), bonus: Math.round(r.testBonus), drive: th.drive, spares: dp ? dp.spares : 0, wear: dp ? dp.wear : 0, bot: dp ? dp.bot : null };
    } else S.lastTest = null;
    G.Shop.clearMods(S);
    G.Shop.tickBoosts(S);
    return r;
  }
  // Each in-season week the design lead suggests one upgrade (inbox + Design Office card)
  C.weeklySuggestion = function (S) {
    const sg = G.Robot.suggest(S);
    if (!sg) return;
    const lead = S.mentors.find(m => m.role === 'design') || S.mentors[0];
    C.inbox(S, 'Design meeting: ' + sg.title, (lead ? lead.name + ' (design lead)' : 'The design captain') + ' suggests: ' + sg.title + '.\n\nWhy: ' + sg.reason + '\n\nCost: ' + sg.quote.hours + ' h · ' + U.money(sg.quote.cost) + '. Start it from the Design Office.', 'dev');
  };
  // Fatigue (in season only): about 10% idle hours a week holds it steady; busier weeks, overtime and competitions
  // pile it on; quieter weeks let the team recover. It matters at events (incidents, scouting mistakes).
  function fatigueWeek(S, hours, idle, eventWeek) {
    const f = hours > 0 ? idle / hours : 1, before = S.fatigue == null ? D.FATIGUE_BASE : S.fatigue;
    S.fatigue = fatigueNext(S, before, f, eventWeek);
    S.lastFatigue = { before: Math.round(before), after: S.fatigue, idlePct: Math.round(f * 100), overtime: !!S.overtime, event: !!eventWeek };
  }
  // Overtime weeks never lower fatigue, however much time sits idle
  function fatigueNext(S, before, f, eventWeek) {
    let d = (C.idleTarget(S) - f) * D.FATIGUE_SLOPE * (eventWeek ? 0.5 : 1), drift = (D.FATIGUE_BASE - before) * 0.08;
    if (S.overtime) { d = Math.max(0, d) + D.FATIGUE_OVERTIME; drift = Math.max(0, drift); }
    if (eventWeek) d += S.team.home && G.World.on(S) && S.week <= 5 ? D.FATIGUE_DISTRICT : D.FATIGUE_EVENT;
    if (eventWeek && G.Shop.superPit(S)) d -= D.FATIGUE_SUPERPIT; // (3.5.6) it sets up in minutes, and it has a mini fridge
    if (eventWeek) { const e = C.eventThisTurn(S); if (S.lastEventIntl === turnKey(S) || (e && e.def && C.travelMode(S, e.def) === 'intl')) d += D.FATIGUE_INTL; } // jet lag
    return Math.round(U.clamp(before + d + drift, 5, 100));
  }
  C.fatigueWeek = fatigueWeek;
  C.fatigueLabel = f => f < 22 ? 'Fresh' : f <= 40 ? 'Normal' : f <= 60 ? 'Tired' : 'Exhausted';
  // The fatigue the team would end this week with, given this turn's plan (for the Design Office preview)
  C.fatiguePreview = function (S) {
    if (!['kickoff', 'build', 'comp'].includes(S.phase)) return null;
    const ev = S.lastEventTurn === turnKey(S), hours = Math.max(0, C.turnHours(S, ev) - S.actHours), plan = C.hoursPlan(S);
    const f = hours > 0 ? plan.idle / hours : 1, before = S.fatigue == null ? D.FATIGUE_BASE : S.fatigue;
    return { now: Math.round(before), next: fatigueNext(S, before, f, ev), idlePct: Math.round(f * 100) };
  };
  function processWeek(S, hours, th) {
    const r = processWork(S, hours, th);
    fatigueWeek(S, hours, r.spare, S.lastEventTurn === turnKey(S));
    if (S.overtime) { S.morale = Math.max(0, S.morale - 6); C.spend(S, 200, 'Overtime meals'); }
    // home repair with spare parts (driver practice above may have used some)
    if (S.robot && S.robot.year === S.year && !(S.lastEventTurn === turnKey(S))) {
      const rp = G.Robot.homeRepair(S);
      S.repairShort = rp.short;
    }
    // morale drift
    S.morale = Math.round(S.morale + (62 + G.Shop.fx(S, 'honors', 'pride') - S.morale) * 0.15); // the Honors Wall lifts the level morale settles at
    // battery aging
    G.Shop.wear(S, 'season');
    return r;
  }
  function offMonthEnd(S) {
    G.Shop.wear(S, 'off');
    S.fatigue = Math.round((S.fatigue == null ? D.FATIGUE_BASE : S.fatigue) + (D.FATIGUE_BASE - (S.fatigue == null ? D.FATIGUE_BASE : S.fatigue)) * 0.7); // the offseason resets the team
    G.Shop.ageBatteries(S, 0.004); // batteries slowly age on the shelf
    if (S.month >= 7) { C.kickoff(S); return; }
    S.month++;
    onMonthStart(S);
  }
  function onMonthStart(S) {
    const rng = G.R, mo = D.MONTHS[S.month];
    if (mo === 'Jun') {
      // graduation
      const grads = S.students.filter(s => s.grade >= 12);
      S.students = S.students.filter(s => s.grade < 12);
      const lost = Math.round(S.studentsCount * 0.22);
      S.studentsCount = Math.max(8, S.studentsCount - lost);
      if (grads.length) C.inbox(S, 'Graduation', grads.map(s => s.name).join(', ') + ' graduated. ' + lost + ' students left the team in total. Train new drivers at offseason events!', 'staff');
      autoDriveTeamIfMissing(S);
    }
    C.fireStories(S, 'off:' + S.month);
    if (S.month === 2) C.districtNews(S); // July: a district that forms next season is announced
    G.Parts.launchMonth(S); // vendor product launches (September to December)
    G.Parts.loyalMonth(S);  // a vendor's loyalty letter (from September)
    if (S.designMonth != null && S.month === S.designMonth && !S.preseason) C.techDesigns(S);
    if (D.MONTHS[S.month] === D.SUMMIT.inviteMonth) C.summitInvite(S); // Summit Champs: the invitations (3.1.3)
    if (mo === 'Nov') C.summitNews(S);
    C.chalMonth(S); // vendor challenges: a new one announced, this month's, the results (3.1.3)
    if (mo === 'Dec') C.researchWarn(S); // R&D closes at Kickoff (3.1.3)
    if (mo === 'Dec') C.seasonPreview(S); // (3.5.1) FIRST: what next season looks like
    if (mo === 'Aug') { C.refreshMarket(S); C.inbox(S, 'Mentor market refreshed', 'New mentor candidates are available (Mentors screen).', 'staff'); }
    if (mo === 'Sep') {
      S.students.forEach(s => s.grade++);
      const fo = C.feederOutlook(S);
      const wanted = Math.max(2, Math.round(4 + S.rep / 10 + S.season.outreach + fo.size + rng.int(-2, 2)));
      const n = Math.max(0, Math.min(wanted, D.STUDENT_CAP - S.studentsCount)), waitlist = wanted - n; // the club is full at 100 students
      S.studentsCount += n;
      const add = Math.min(12 - S.students.length, Math.max(2, Math.round(n / 2)));
      const from = {};
      for (let i = 0; i < add; i++) {
        const st = D.makeStudent(rng, rng.chance(0.7) ? 9 : 10, fo.talent + S.rep / 10 - 5);
        const pg = rng.chance(fo.share) ? C.pickProgram(S, rng) : null;
        if (pg) {
          const F = D.FEEDER_FOCUS[pg.focus] || D.FEEDER_FOCUS.balanced, m = C.programPower(pg) * rng.range(0.7, 1.3);
          Object.keys(F.attr).forEach(k => { st.attr[k] = Math.round(U.clamp(st.attr[k] + F.attr[k] * m, 10, 85)); });
          st.pot = Math.round(U.clamp(st.pot + F.pot * m, 25, 100));
          st.from = pg.name; from[pg.name] = (from[pg.name] || 0) + 1;
        }
        S.students.push(st);
      }
      const fund = Math.round(S.schoolBase * (0.6 + 0.8 * S.support / 100));
      C.earn(S, fund, 'School funding');
      const np = (S.programs || []).length;
      if (np) C.spend(S, C.programCost(S), 'Feeder programs (' + np + ')');
      (S.programs || []).forEach(pg => { pg.years = (pg.years || 0) + 1; delete pg.ftcBoost; }); // a strong FTC season (ftcBoost) lifted this intake only
      const via = Object.keys(from).map(k => from[k] + ' from ' + k).join(', ');
      C.inbox(S, 'New school year', n + ' new students joined (' + S.studentsCount + ' total).' + (waitlist > 0 ? ' The team is full at ' + D.STUDENT_CAP + ' students: ' + waitlist + ' more applied and went on the waiting list.' : '') + (via ? ' Core recruits: ' + via + '.' : '') + ' School funding: ' + U.money(fund) + '.' + (np ? ' Feeder programs: ' + U.money(C.programCost(S)) + '.' : ''), 'staff');
    }
    if (mo === 'Oct') {
      // a team that chose to join a new district plays there from the season now being planned
      if (S.team.homeNext) { S.team.home = S.team.homeNext; delete S.team.homeNext; delete S.team.z; if (!S.scenario) S.maxEvents = Math.min(S.maxEvents, 3); }
      C.genOffers(S);
      if (G.World.on(S)) G.World.plan(S, rng); else S.regionals = D.makeRegionals(S.order[S.upcoming] || S.year, rng, S.team.region);
      S.registered = []; S.scrimmage = false;
      C.inbox(S, 'Sponsor season', 'New sponsor offers are in (Finance).', 'money');
      C.inbox(S, ...C.regNotice(S));
      C.farSeasonNote(S);
    }
    if (mo === 'Nov') C.inbox(S, 'Drive team tryouts', 'Pick next season\'s drive team on the Team screen.', 'staff');
    // November: last call for next season's field elements (preorders arrive with the Kit of Parts and never sell out)
    if (mo === 'Nov' && S.mode === 'career' && G.Parts.nextYear(S) != null && !G.Parts.elemPending(S, G.Parts.nextYear(S)).length) { C.inbox(S, ...C.preorderNotice(S)); (S.launchQueue = S.launchQueue || []).push({ kind: 'preorder' }); }
    if (mo === 'Dec' && S.mode === 'career' && !S.registered.length) C.inbox(S, 'Kickoff is next month: register first', 'The team is not registered for any ' + C.evWord(S) + ' yet. Sign up for at least one in the Calendar this month: the season cannot start without one.', 'event', { prio: true });
  }
  // the November preorder reminder (Inbox; the pop-up says the same)
  C.preorderNotice = function (S) {
    const fs = G.Parts.fieldSize(S);
    return ['Preorder field elements for next season', 'Kickoff is two months away. Field elements preordered now arrive with the Kit of Parts and never sell out; ordered in season they often do, and the week of waiting costs driver practice.\n\n' +
      (fs ? 'Your Practice Field fits a ' + G.Parts.setName(fs).toLowerCase() + ' set. Preorder one in the Inventory (Preorder tab).' : 'Without a Practice Field the free kit game pieces are all your drivers need, so a set is only a spare for later.'), 'dev'];
  };
  function autoDriveTeamIfMissing(S) {
    const ids = S.students.map(s => s.id);
    if (!ids.includes(S.driveTeam.driver) || !ids.includes(S.driveTeam.operator) || !ids.includes(S.driveTeam.hp)) autoDriveTeam(S);
  }

  // ======================= kickoff =======================
  C.kickoff = function (S) {
    const rng = G.R;
    const first = S.si < 0;
    S.si = S.upcoming; S.upcoming = S.si + 1;
    S.year = S.order[S.si]; S.offYear = null;
    if (S.cal) { // a new calendar year: prices and budgets move with the index
      const k = C.setPxYear(S, C.cy(S));
      if (!first && Math.abs(k - 1) >= 0.005) C.inbox(S, 'Prices in ' + C.cy(S), 'Prices are up ' + (Math.round((k - 1) * 1000) / 10) + '% on last year. Sponsor cheques, school funding and fundraising rise with them, so a budget buys about what it did; money left in the bank buys a little less.', 'money');
    }
    S.phase = 'kickoff'; S.week = 0; S.preseason = false;
    if (!first) G.AI.evolve(S.teams, rng);
    if (G.World.on(S)) {
      const wl = G.World.newSeason(S, first), su = G.World.summary(S), d = G.World.myDistrict(S); // teams fold, rookies arrive, new districts form, everybody gets a schedule
      C.inbox(S, 'The ' + su.cy + ' season in numbers', su.teams + ' teams are registered this season' + (first ? '' : ': ' + su.rookies + ' rookie teams joined and ' + wl.folded + ' teams did not return') + '. ' +
        su.regional + ' of them play the ' + su.regionals + ' regionals; ' + su.district + ' play in ' + su.districts + ' districts (' + su.dEvents + ' district events).' +
        (wl.formed.length ? ' New this year: the ' + wl.formed.map(id => D.DISTRICT[id].name).join(' and the ') + '.' : '') +
        (() => { const nw = D.REGIONS.filter(r => D.WORLD_AREAS[r] && D.WORLD_AREAS[r].first === su.cy && D.sitesOf(r, su.cy).length && !G.World.legacy(S)); return nw.length ? ' A first: ' + nw.map(r => D.regionThe(r) + ' holds a regional of its own (' + D.sitesOf(r, su.cy)[0] + ')').join(', and ') + '.' : ''; })() +
        (d ? ' Your district, the ' + d.name + ', has ' + G.World.sizeOf(d, su.cy) + ' teams; the top ' + G.World.dcmpSize(d, su.cy) + ' reach its District Championship and about ' + G.World.slots(S, d) + ' go on to the Championship.' : '') +
        ' The ' + (d ? 'District' : 'World') + ' page follows every event.', 'info');
      // the top tier: who fell out of it (a local powerhouse now) and who joined it
      { const nm = n => { const t = S.teams[n]; return t ? n + ' ' + t.name + ' (' + (t.home ? D.DISTRICT[t.home].short : t.region) + ')' : String(n); }, f = wl.faded || [], r = wl.rose || [];
        if (f.length || r.length) C.inbox(S, 'Elite watch', (r.length ? r.map(nm).join(' and ') + (r.length > 1 ? ' join' : ' joins') + ' the elite teams after years near the top: the forum has added ' + (r.length > 1 ? 'them' : 'it') + ' to every prediction list. ' : '') +
          (f.length ? f.map(nm).join(' and ') + (f.length > 1 ? ' are' : ' is') + ' no longer counted among the elite. Still a local powerhouse, but the mentors who built ' + (f.length > 1 ? 'those programs' : 'that program') + ' have moved on, and the rest of the world has noticed.' : ''), 'news', { teams: r.concat(f).filter(n => S.teams[n]) }); }
    }
    else if (!first) G.AI.addRookies(S.teams, rng, S.year, 10, S.team.num, S.cal ? C.cy(S) : null);
    Object.values(S.teams).forEach(t => t.rb = null);
    if (!S.season || S.season.year !== S.year) { const imp = S.season ? S.season.impact : 0, out = S.season ? S.season.outreach : 0, done = !!(S.season && S.season.impactDone), fundN = (S.season && S.season.fundN) || {}; S.season = newSeasonState(S.year); S.season.impact = imp; S.season.outreach = out; S.season.impactDone = done; S.season.fundN = fundN; }
    S.season.year = S.year;
    C.closeResearch(S); // R&D is an offseason job (3.1.3): what is unfinished at Kickoff ends with partial credit
    G.Robot.newSeason(S, S.year);
    G.Parts.kickoff(S, first);
    // spare parts are specific to each game: last season's stock is no use now
    if (S.parts.spares) C.inbox(S, 'Spare parts cleared out', 'Last season\'s ' + S.parts.spares + ' spare parts don\'t fit the new game. Restock before your first event (Inventory), or turn on auto-restock.', 'dev', { prio: true });
    S.parts.spares = 0; S.parts.spareUse = 0;
    S.usedAreas = {}; S.practiceWeeks = 0; S.defDrill = 0; S.elecShake = 0; S.lastTune = 0; S.lastConf = 0; S.champsDeclined = false; S.pendingEinstein = false;
    S.champsDiv = rng.pick(S.cal ? C.champs(S).div : DIVS);
    if (!S.regionals.length || S.regionals[0].year !== S.year) S.regionals = D.makeRegionals(S.year, rng, S.team.region);
    if (S.mode === 'career') C.markFull(S);
    // finances
    const biz = S.mentors.some(m => m.role === 'biz') ? 1.1 : 1;
    S.sponsors.forEach(sp => {
      if (sp.paidYear !== S.year) { C.earn(S, sp.base * biz, 'Sponsor: ' + sp.name); sp.paidYear = S.year; sp.paidAmt = Math.round(sp.base * biz); C.scheduleActivities(S, sp); }
      sp.goals.forEach(g => { g.met = false; delete g.paid; });
    });
    S.mentors.forEach(m => { if (!m.paid && m.cost) C.spend(S, m.cost, 'Mentor: ' + m.name); m.paid = false; });
    C.spend(S, D.FEES.shopOps, 'Shop operations');
    const upkeep = G.Shop.upkeep(S);
    if (upkeep) C.spend(S, upkeep, 'Equipment upkeep');
    if (S.mode === 'single' && S.robot) { /* nothing */ }
    // goals
    S.season.goals = C.makeGoals(S);
    const Sz = G.Seasons[S.year];
    C.inbox(S, 'KICKOFF — ' + C.seasonName(S),Sz.brief.join('\n\n') + '\n\nOpen the Design Office to choose your concepts. Your Tech Knowledge shows which past experience helps this game.', 'kickoff');
    G.News.kickoff(S);
    if (G.World.on(S)) G.World.hofQualify(S); // Hall of Fame teams are invited to every Championship, from Kickoff
    C.inbox(S, 'Program goals for ' + C.calYear(S), 'The program director expects:\n' + S.season.goals.map(g => '• [' + g.tier + '] ' + C.goalText(S, D.PROGRAM_GOALS[g.id].text)).join('\n') + '\n\nAnd finish the season with money in the bank.', 'goal');
    G.Save.write('auto');
  };
  // goals read "district event" for a district team (home: the team's home when the goal was set, for old seasons)
  C.goalText = function (S, text, home) {
    const d = home === undefined ? !!(S.team.home && G.World.on(S)) : !!home;
    return d ? text.replace(/regionals/g, 'district events').replace(/regional/g, 'district event') : text;
  };
  C.makeGoals = function (S) {
    const r = S.rep, dist = !!(S.team.home && G.World.on(S));
    let ids;
    if (S.mode === 'single' || r < 35) ids = ['finish', 'playoffs1', 'award'];
    else if (r < 55) ids = dist ? ['playoffs1', 'award', 'dcmp'] : ['playoffs1', 'award', 'winEvent'];
    // qualifying for the Championship comes before winning an event: an event win qualifies a regional team, and a
    // regional team can also qualify on an award or a wildcard. A district team qualifies on points: a district with ten or
    // more Championship places sends its top ten, so the Championship comes before the top ten there.
    else {
      const d = dist ? G.World.myDistrict(S) : null, many = d ? G.World.slots(S, d) >= 10 : false;
      if (r < 75) ids = dist ? (many ? ['dcmp', 'champs', 'dTop10'] : ['dcmp', 'dTop10', 'champs']) : ['playoffs1', 'champs', 'winEvent'];
      else ids = dist ? (many ? ['champs', 'dTop10', 'winEvent'] : ['dTop10', 'champs', 'winEvent']) : ['playoffs2', 'champs', 'winEvent'];
    }
    return ids.map((id, i) => ({ id, tier: ['Minimum', 'Target', 'Stretch'][i], met: false }));
  };

  // ======================= registration =======================
  C.regFee0 = function (S, n) { if (S.team.home && G.World.on(S)) return n === 0 ? D.FEES.firstRegional : n === 1 ? 0 : D.FEES.extraDistrict; return n === 0 ? D.FEES.firstRegional : D.FEES.addRegional; };
  C.regFee = function (S) { const n = S.registered.length; if (S.team.home && G.World.on(S)) return n === 0 ? D.FEES.firstRegional : n === 1 ? 0 : D.FEES.extraDistrict; return n === 0 ? D.FEES.firstRegional : D.FEES.addRegional; };
  C.evWord = (S, plural) => (S.team.home && G.World.on(S) ? (plural ? 'district events' : 'district event') : (plural ? 'regionals' : 'regional'));
  C.canRegister = function (S, r) {
    if (S.registered.includes(r.id)) return 'Registered';
    if (S.phase === 'comp' && r.week <= S.week) return 'Already past';
    if (!['off', 'kickoff', 'build', 'comp'].includes(S.phase)) return 'Closed';
    if (S.phase === 'off' && D.MONTHS.indexOf('Oct') > S.month) return 'Opens in October';
    if (S.registered.length >= S.maxEvents) return 'Max ' + S.maxEvents + ' ' + C.evWord(S, true);
    if (S.team.home && S.phase === 'comp' && r.week > 5) return 'Closed';
    if (S.regionals.some(x => S.registered.includes(x.id) && x.week === r.week)) return 'Already registered that week';
    if (r.full) return 'Event full';
    return null;
  };
  C.isLate = S => S.phase !== 'off' && !(S.lateFree && (S.phase === 'kickoff' || (S.phase === 'build' && S.week <= 1)));
  C.register = function (S, id) {
    const r = S.regionals.find(x => x.id === id);
    const err = C.canRegister(S, r); if (err) return err;
    const fee = C.regFee(S) + (C.isLate(S) ? D.FEES.late : 0);
    { const e = C.afford(S, fee); if (e) return e; }
    C.spend(S, fee, 'Registration: ' + r.name);
    S.registered.push(id);
    (S.regUndo = S.regUndo || {})[id] = fee - C.regFee0(S, S.registered.length - 1); // the late fee, if one was charged
    // (3.5.1) an area with no regional of its own: FIRST pays part of the first event's fee (C.farSeasonNote)
    if (S.regSubsidy && !S.regSubsidy.used && S.wseason && S.regSubsidy.cy === S.wseason.cy) { S.regSubsidy.used = id; C.earn(S, S.regSubsidy.amt, 'FIRST registration subsidy'); }
    return null;
  };
  // Until you press Continue, a registration made this turn can be taken back for everything it cost. Keys: a regional's
  // id, 'off:' + an offseason event's id, 'scrim'. (After that it is a withdrawal: half back a month ahead, else nothing.)
  C.regUndoable = (S, key) => !!(S.regUndo && S.regUndo[key] != null);
  C.undoRegister = function (S, key) {
    if (!C.regUndoable(S, key)) return 'That registration is final: withdraw instead';
    let back = 0, name = '';
    if (key === 'scrim') { S.scrimmage = false; back = S.regUndo[key]; name = 'Week 0 scrimmage'; }
    else if (String(key).indexOf('off:') === 0) { const o = C.offEvent(S, key.slice(4)); S.offReg = S.offReg.filter(x => x !== o.id); back = S.regUndo[key]; name = o.name; }
    else {
      // the fee schedule counts places, so the place given back is the last one paid for (plus this one's late fee)
      const r = S.regionals.find(x => x.id === key);
      S.registered = S.registered.filter(x => x !== key);
      back = C.regFee(S) + S.regUndo[key]; name = r ? r.name : 'event';
    }
    delete S.regUndo[key];
    if (back) C.spend(S, -back, 'Registration undone: ' + name);
    if (S.regSubsidy && S.regSubsidy.used === key) { delete S.regSubsidy.used; C.spend(S, S.regSubsidy.amt, 'FIRST registration subsidy returned'); }
    return null;
  };
  // Weeks from now until a calendar slot (offseason months count as four weeks)
  C.weeksUntil = function (S, key) {
    const slots = C.calendarSlots(S), cur = C.calendarIndex(S), t = slots.findIndex(x => x.key === key);
    if (t < 0) return 0;
    let w = 0;
    for (let i = cur; i < t; i++) w += slots[i].unit === 'month' ? 4 : 1;
    return w;
  };
  C.refundable = (S, key) => C.weeksUntil(S, key) >= 4;
  // Withdraw from a regional: half the fee back if it is at least a month away, otherwise nothing
  C.withdraw = function (S, id) {
    const r = S.regionals.find(x => x.id === id);
    if (!r || !S.registered.includes(id) || S.eventsDone[id]) return;
    const refund = C.refundable(S, 'c' + r.week);
    S.registered = S.registered.filter(x => x !== id);
    if (S.regUndo) delete S.regUndo[id];
    if (refund && C.regFee(S)) C.earn(S, Math.round(C.regFee(S) * 0.5), 'Withdrawal refund: ' + r.name); // half of what the last place cost
    return refund;
  };
  C.withdrawOffseason = function (S, id) {
    const o = C.offEvent(S, id);
    if (!o || !S.offReg.includes(id) || S.eventsDone[o.id + S.year]) return;
    const refund = C.refundable(S, 'off' + D.MONTHS.indexOf(o.month));
    S.offReg = S.offReg.filter(x => x !== id);
    if (S.regUndo) delete S.regUndo['off:' + id];
    if (refund) C.earn(S, Math.round(o.fee * 0.5), 'Withdrawal refund: ' + o.name);
    return refund;
  };
  C.withdrawScrimmage = function (S) {
    if (!S.scrimmage || S.eventsDone['scrim' + S.year]) return;
    const refund = C.refundable(S, 'b7');
    S.scrimmage = false;
    if (S.regUndo) delete S.regUndo.scrim;
    if (refund) C.earn(S, Math.round(D.FEES.scrimmage * 0.5), 'Withdrawal refund: Week 0 scrimmage');
    return refund;
  };
  // Skip the event that is on this turn (no refund this close to it)
  C.skipEvent = function (S) {
    const ev = C.eventThisTurn(S);
    if (!ev || !ev.def) return 'No event to skip';
    const d = ev.def;
    if (d.kind === 'champs') { S.champsDeclined = true; if (S.season.wfaCmp && S.season.wfaCmp.mine) C.wfaSeat(S); }
    else if (d.kind === 'dcmp') S.dcmpDeclined = S.year;
    else if (d.kind === 'einstein') return d.festival ? 'The Festival of Champions cannot be skipped: both champion alliances are expected, and the trip is paid for' : 'You can\'t skip Einstein';
    else { S.eventsDone[d.id] = true; (S.season.skipped = S.season.skipped || []).push(d.name); }
    C.inbox(S, 'Skipped: ' + d.name, 'The team stayed home from ' + d.name + '. Fees for events this close are not refunded.', 'event');
    // (3.5.1) the school board had been invited to this one
    { const B = S.season.board; if (B && B.visit === d.id && !B.done) { B.done = 1; B.verdict = -1; B.delta = -2; S.support = U.clamp(S.support - 2, 0, 100); C.inbox(S, 'The board had cleared its weekend', 'The school board was invited to the ' + d.name + ', and the team did not go. The assistant has sent the apologies. Program Support −2.', 'goal'); } }
    return null;
  };
  C.markFull = function (S) { S.regionals.forEach(r => { if (!S.registered.includes(r.id) && G.R.chance(0.3)) r.full = true; }); };

  // ======================= match hooks =======================
  C.beforePlayerMatch = function (S, ev, opts) {
    const turn = ev.lastPlayerMatch < 0 ? 0 : (ev.stage === 'playoffs' ? G.Ev.poTurnaround(ev) : G.Ev.turnaround(ev));
    ev.lastTurn = turn;
    ev.pmSeq = (ev.pmSeq || 0) + 1; // one Super pit full repair per match
    if (ev.lastPlayerMatch >= 0 || ev.stage === 'playoffs') {
      const sp = G.Robot.pitRepair(S, turn, (opts && opts.timeout ? 2.5 : 1) * (ev.selfPay ? D.SELF_PAY.repair : 1)); // (3.5.1) fewer hands in the pit when the students paid their own way
      ev.lastRepair = sp;
    }
    // (3.5.1) The Super pit crew always fully repairs whatever is in the worst shape, before every match, watched or
    // simulated. On the pre-match page you can have it repair another subsystem instead (G.Robot.superSwitch: ev.superRec
    // says what was done, so that it can be taken back).
    ev.superRec = null;
    if (G.Shop.superPit(S) && S.robot) {
      const R = S.robot, ks = Object.keys(R.subs).filter(k => k !== 'soft' && R.subs[k] && R.subs[k].ver && R.subs[k].cond < 99.5).sort((a, b) => R.subs[a].cond - R.subs[b].cond);
      if (ks.length) { const c0 = R.subs[ks[0]].cond, r = G.Robot.superFix(S, ev, ks[0]); if (r && typeof r === 'object') { ev.lastRepair = (ev.lastRepair || 0) + r.used; ev.superRec = { k: ks[0], cond0: c0, fix: R.subs[ks[0]].cond - c0, used: r.used }; } }
    }
    // batteries
    const rate = G.Shop.chargeRate(S), fleet = S.parts.batts;
    if (!ev.batts || ev.batts.length !== fleet.length) ev.batts = fleet.map(() => 1);
    ev.batts = ev.batts.map(b => Math.min(1, b + rate * Math.max(1, turn)));
    // pick the most charged battery; break ties with the healthiest
    let bi = 0; ev.batts.forEach((b, i) => { if (b > ev.batts[bi] + 1e-9 || (Math.abs(b - ev.batts[bi]) < 1e-9 && fleet[i].h > fleet[bi].h)) bi = i; });
    ev.battIdx = bi;
    ev.batt = ev.batts[bi] * (fleet[bi] ? fleet[bi].h : 1);
    G.Ev.rollIncident(S, ev);
  };
  // October: registration for next season opens (the inbox message; the pop-up in the UI says the same)
  // ---------- letters from FIRST (3.5.1) ----------
  const FIRST_REG = 'FIRST Robotics Competition (Event Registration)', FIRST_UPD = 'FIRST Robotics Competition (Team Updates)', FIRST_CMP = 'FIRST Robotics Competition (Championship)', FIRST_SIGN = 'The FIRST Robotics Competition team';
  // the season before cy that was played (2021 was not)
  const prevCy = cy => (cy - 1 === 2021 ? 2020 : cy - 1);
  // (3.5) When registration opens, a regional team outside North America hears what its own area holds next season.
  // (3.5.1) FIRST writes it: the area's first regional, a regional that is back after a season without one, or none
  // at all. With none, the letter names the nearest areas that hold events and FIRST pays part of the registration
  // fee of the team's first event (D.REG_SUBSIDY of the fee, credited when the team registers: C.register).
  C.farSeasonNote = function (S) {
    if (!G.World.on(S) || S.team.home || !S.wseason || !D.WORLD_AREAS[S.team.region]) return;
    const r = S.team.region, cy = S.wseason.cy, A = D.WORLD_AREAS[r], home = S.regionals.filter(e => e.region === r), the = D.regionThe(r);
    const prev = prevCy(cy), had = prev >= 2016 ? D.sitesOf(r, prev).length : -1;
    if (home.length) {
      const first = A.first === cy, back = !first && had === 0;
      if (!first && !back) return;
      C.letter(S, FIRST_REG, first ? 'A regional in ' + the + ' for the first time' : 'The regional in ' + the + ' is back',
        (first ? 'We are glad to tell you that ' + the + ' holds its first regional in ' + cy + ': the ' + home[0].name + ' in ' + home[0].hub + '.' : 'After a season without one, ' + the + ' has a regional again in ' + cy + ': the ' + home[0].name + ' in ' + home[0].hub + '.') +
        ' It took a venue, a field crew and a great many volunteers from the teams of the area, and we thank every one of them.\n\nFor your team it means an event with no ocean to cross, where half the pits will be neighbours. ' + (home.length > 1 ? 'It is one of ' + home.length + ' events in the area this season. ' : '') + 'Events close to home fill quickly: please register while there is room.',
        'See you there,\n' + FIRST_SIGN, { note: 'Calendar: registration for ' + cy + ' is open.', school: true, prio: true }, 'event');
      return;
    }
    const near = (D.NEAR[r] || []).filter(x => S.regionals.some(e => e.region === x)), sea = near.filter(x => D.overseas(r, x)), sub = Math.round(D.FEES.firstRegional * (D.REG_SUBSIDY || 0.5));
    const evs = S.regionals.filter(e => near.includes(e.region) && !e.dist).sort((a, b) => near.indexOf(a.region) - near.indexOf(b.region) || a.week - b.week).slice(0, 4);
    S.regSubsidy = { cy, amt: sub };
    C.letter(S, FIRST_REG, 'No regional in ' + the + ' in ' + cy + ': support for your first event',
      'We are sorry to tell you that ' + the + ' holds no regional in ' + cy + '. ' + (had > 0 ? 'Last season\'s event cannot be held again this year.' : 'We could not find a venue and enough volunteers for one this season.') + ' Every team of your area will have to travel to compete.\n\n' +
      (near.length ? 'The teams there usually go to ' + near.map(D.regionThe).join(' or ') + (sea.length === near.length ? ', a flight overseas' : sea.length ? ', some of it overseas' : '') + '.' + (evs.length ? ' Events with room at the moment: ' + evs.map(e => e.name + ' (' + e.region + ', week ' + e.week + ')').join('; ') + '.' : '') : 'Any regional with room will take you.') +
      '\n\nSo that the journey does not cost you the season, FIRST will pay ' + U.money(sub) + ' towards the registration fee of your team\'s first event of ' + cy + '. There is nothing to apply for: the amount is credited the day you register.',
      'With our thanks for travelling,\n' + FIRST_SIGN,
      { note: 'Registration subsidy: +' + U.money(sub) + ' when you register for your first event of ' + cy + ' (Calendar). A flight overseas costs about ' + U.money(Math.round(D.TRAVEL.intl.cost * C.travelSize(S) / 100) * 100) + ' for your team, is harder on the robot than an ordinary one, and the team trailer cannot make the trip.', school: true, prio: true }, 'event');
  };
  // December: what next season looks like, from FIRST. How many regionals and district events, the districts (new
  // ones first), the Championship, what changes in the rules of play and of the robot from the season before, and a
  // reminder to register and to preorder. Nothing about the game itself: that is for Kickoff.
  C.seasonPreview = function (S) {
    if (S.mode !== 'career' || !S.cal) return;
    const cy = C.cyNext(S); if (!cy) return;
    const E = G.Era, prev = prevCy(cy), era = E.at(cy), was = prev >= S.cal[0] || prev >= 2016 ? E.at(prev) : null, hasPrev = !!was && prev >= 2016, L = [], N = [];
    const pl = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
    if (G.World.on(S) && S.wseason && S.wseason.cy === cy) {
      const ev = S.wseason.events, reg = ev.filter(e => e.kind === 'regional' && !e.dist).length, de = ev.filter(e => e.kind === 'regional' && e.dist).length, ds = G.World.districtsOf(S, cy), nu = ds.filter(d => d.from === cy);
      L.push('Events: ' + pl(reg, 'regional') + ' around the world' + (ds.length ? ', and ' + pl(de, 'district event') + ' in ' + pl(ds.length, 'district') + ', each with its District Championship in week 7' : '') + '.');
      if (nu.length) L.push('New this season: ' + listAnd(nu.map(d => 'the ' + d.name + ' (' + d.region + ')')) + '. Teams there play two-day district events for points, and the area holds fewer regionals.');
      const mine = S.regionals.filter(e => (S.team.home ? e.dist === S.team.home : e.region === S.team.region && !e.dist)).length;
      L.push(S.team.home ? 'Your district, the ' + D.DISTRICT[S.team.home].name + ', holds ' + pl(mine, 'event') + '.' : mine ? D.regionThe(S.team.region).replace(/^t/, 'T') + ' holds ' + pl(mine, 'regional') + '.' : D.regionThe(S.team.region).replace(/^t/, 'T') + ' holds no regional this season.');
    }
    const ch = E.champs(cy), chWas = hasPrev ? E.champs(prev) : null;
    L.push('Championship: ' + (ch.n > 1 ? 'two, in ' + ch.cities.join(' and ') + (ch.final ? ', and the two winning alliances meet at the Festival of Champions in July' : '') : 'one, in ' + ch.cities[0]) + ', with ' + ch.divs + ' divisions' + (ch.n > 1 ? ' each' : '') + (chWas && (chWas.n !== ch.n || chWas.cities.join() !== ch.cities.join() || chWas.divs !== ch.divs) ? ' (last season: ' + (chWas.n > 1 ? 'two, in ' + chWas.cities.join(' and ') : 'one, in ' + chWas.cities[0]) + ', ' + chWas.divs + ' divisions)' : '') + '.');
    L.push('Qualifying: ' + (E.wildcards(cy) ? 'a regional team qualifies by winning a regional, with the Impact, Engineering Inspiration or Rookie All-Star award, or on a wildcard as a finalist' : 'a regional team qualifies by winning a regional, with the Impact, Engineering Inspiration or Rookie All-Star award, or through the Regional Pool, the points of its two best regionals') + '; a district team through its district\'s points list.');
    // what is different from the season before
    if (hasPrev) {
      if (E.playoffs(cy) !== E.playoffs(prev)) N.push(E.playoffs(cy) === 'de' ? 'Playoffs are double elimination from this season: eight alliances, an upper and a lower bracket, and finals that are still best of three.' : 'Playoffs are single elimination: every series best of three.');
      if (!!era.bag !== !!was.bag) N.push(era.bag ? 'Stop Build Day applies: the competition robot is bagged at the end of the build season.' : 'Stop Build Day is abolished. There is no bag any more: teams may work on the competition robot until they load in at their event.');
      if (!!era.vision.tags !== !!was.vision.tags && era.vision.tags) N.push('The field carries AprilTags from this season, in place of the reflective tape. A camera that reads them tells the robot where it is on the field.');
      if (E.wildcards(cy) !== E.wildcards(prev)) N.push('The Regional Pool replaces the wildcards: Championship places not won outright go to the regional teams with the most points from their two best events.');
      if (ch.fmt !== chWas.fmt) N.push('Einstein is played ' + (ch.fmt === 'de' ? 'as a double-elimination bracket' : ch.fmt === 'rr' ? 'as a round robin between the division champions, then a final' : 'as a single-elimination bracket') + '.');
    }
    const tech = ((S.techSeen || {}).rules || []).map(id => (D.TECH_RULES.find(x => x.id === id) || {}).title).filter(Boolean);
    const rules = N.length ? N.map(x => '• ' + x).join('\n') : '• The tournament rules are as they were last season.';
    const robot = tech.length ? 'Robot rules: the changes we published in May stand (' + tech.join('; ') + '). The full robot rules come with the game manual at Kickoff.' : 'Robot rules: no changes beyond those in the game manual, which is published at Kickoff.';
    const reg = S.registered.length, nextY = G.Parts.nextYear ? G.Parts.nextYear(S) : null, pre = nextY != null && G.Parts.elemPending ? G.Parts.elemPending(S, nextY).length : 0;
    C.letter(S, FIRST_UPD, 'The ' + cy + ' season: what to expect',
      'Kickoff is next month. Before the game is revealed, here is the shape of the ' + cy + ' season.\n\n' + L.map(x => '• ' + x).join('\n') + '\n\n' + (hasPrev ? 'What changes from ' + prev + ':\n' : 'How the tournament is played:\n') + (hasPrev ? rules : ['• Playoffs: ' + (E.playoffs(cy) === 'de' ? 'double elimination, finals best of three.' : 'single elimination, every series best of three.'), era.bag ? '• Stop Build Day: the competition robot is bagged when the build season ends.' : '• No Stop Build Day: teams work on the robot until they load in.'].join('\n')) + '\n\n' + robot + '\n\n' +
      'Two reminders. ' + (reg ? 'Your team is registered for ' + pl(reg, C.evWord(S)) + '; events still have room, and after Kickoff a late registration costs more.' : 'Your team is not registered for any event yet: please register this month, since the season cannot start without one.') + ' ' +
      (pre ? 'Your field element order is in and ships with the Kit of Parts.' : 'Field elements for the new game can be preordered until Kickoff and ship with the Kit of Parts; after that they are sold while stocks last.'),
      'See you at Kickoff,\n' + FIRST_SIGN, { note: 'Calendar: registration. Inventory: field element preorders.', school: true }, 'event');
  };
  // Qualified for the Championship, or for the District Championship: FIRST writes. why: how the place was earned.
  C.mailChampsQualified = function (S, why) {
    if (S.mode !== 'career' || !S.season || S.season.cmpMailed) return;
    S.season.cmpMailed = 1;
    const CH = C.champs(S), fee = D.FEES.champs;
    C.letter(S, FIRST_CMP, 'Team ' + S.team.num + ' has qualified for the ' + C.calYear(S) + ' FIRST Championship',
      'Congratulations. Team ' + S.team.num + ' ' + S.team.name + ' has earned a place at the ' + C.calYear(S) + ' FIRST Championship' + (CH.n > 1 ? ' in ' + CH.city : ' in ' + CH.cities[0]) + (why ? ': ' + lcFirst(String(why)) : '') + '.\n\n' +
      'You will play in one of ' + CH.divs + ' divisions' + (CH.n > 1 ? ' at your Championship' : '') + '; the division is drawn when registration closes. Division champions go on to Einstein.\n\n' +
      'Registration is ' + U.money(fee) + ', paid when the team travels. Please book early, tell your sponsors, and bring spare parts: it is a long event.',
      'Congratulations again,\n' + FIRST_SIGN, { note: 'The Championship comes after the last competition week: register and travel from Headquarters when its turn arrives.', school: true }, 'event');
  };
  C.mailDcmpQualified = function (S) {
    if (S.mode !== 'career' || !S.season || S.season.dcmpMailed || !S.team.home || !D.DISTRICT[S.team.home]) return;
    S.season.dcmpMailed = 1;
    const d = D.DISTRICT[S.team.home], e = G.World.on(S) ? G.World.dcmpEvent(S, S.team.home) : null;
    C.letter(S, 'FIRST Robotics Competition (' + d.name + ')', 'Team ' + S.team.num + ' has qualified for the ' + d.short + ' District Championship',
      'Congratulations. With ' + (S.season.dPts != null ? S.season.dPts + ' district points' : 'its district points') + (S.season.dRank ? ', ' + U.ord(S.season.dRank) + ' on the list' : '') + ', Team ' + S.team.num + ' ' + S.team.name + ' has earned a place at the ' + (e ? e.name : d.name + ' Championship') + ' in week 7.\n\n' +
      'Points there count three times, and the best of the final list go on to the FIRST Championship. Registration is ' + U.money(D.FEES.dcmp) + ', paid when the team travels.',
      'See you in week 7,\n' + FIRST_SIGN, { note: 'The District Championship is played in competition week 7 (Headquarters).', school: true }, 'event');
  };
  // Your first own FTC team: FIRST Tech Challenge writes
  C.mailFtcWelcome = function (S, pg) {
    if (S.mode !== 'career' || S.ftcWelcomed) return;
    S.ftcWelcomed = 1;
    C.letter(S, 'FIRST Tech Challenge (Team Registration)', 'Welcome to FIRST Tech Challenge: ' + pg.name,
      'Thank you for registering ' + pg.name + '. A team that meets in the workshop of a FIRST Robotics Competition team starts with a great deal: tools, mentors, and older students who have made every mistake already.\n\n' +
      'Your season starts in September, with league meets through the autumn and a championship in the winter. The robots are smaller, the teams are up to fifteen students, and the engineering notebook counts as much as the robot.\n\n' +
      'Two requests from us. Let the students do the building, even when it is slower. And bring the team to an event of yours: nothing recruits like the big field.',
      'Good luck with the first season,\nThe FIRST Tech Challenge team', { note: 'Your own FTC team sends you stronger recruits every September, and its season shows in the Inbox (Team: Feeder programs).', school: true }, 'staff');
  };
  C.regNotice = function (S) {
    const d = S.team.home && G.World.on(S) ? D.DISTRICT[S.team.home] : null;
    return [(d ? 'District event' : 'Regional') + ' registration is open', 'Sign up for next season\'s ' + (d ? d.name + ' events' : 'regionals') + ' in the Calendar while every event still has spots. ' +
      (d ? 'Two district events cost ' + U.money(D.FEES.firstRegional) + ', a third ' + U.money(D.FEES.extraDistrict) + ' (no points).' : 'The first regional costs ' + U.money(D.FEES.firstRegional) + ', each one after it ' + U.money(D.FEES.addRegional) + '.') +
      ' After Kickoff some events fill up and late registration costs ' + U.money(D.FEES.late) + ' more; withdrawing at least a month ahead returns half the fee.\n\n' +
      'Stronger fields (more ★) are harder to win but teach the team more: drive-team skills, know-how and strategy read grow ×' + (1 - 2 * D.EVENT_EXP).toFixed(1) + ' at ★ and ×' + (1 + 2 * D.EVENT_EXP).toFixed(1) + ' at ★★★★★.', 'event', { prio: true }];
  };
  // what an event teaches, by the strength of its field (D.EVENT_EXP): takes a running event (star) or a registration entry (str)
  C.expMult = ev => (ev && (ev.kind == null || ev.kind === 'regional' || ev.kind === 'dcmp') ? 1 + D.EVENT_EXP * ((ev.star != null ? ev.star : ev.str || 3) - 3) : 1);
  C.afterPlayerMatch = function (S, ev, match, res) {
    const me = S.team.num;
    const rr = res.robots.find(r => r.team === me);
    if (!rr) return;
    const a = rr.a, o = a === 'red' ? 'blue' : 'red';
    G.Robot.applyWear(S, rr, !!match.playoff);
    G.Parts.wearMatch(S, rr);
    G.Robot.famDrive(S, S.robot.comp || 0, D.FAM.MATCH);
    ev.incNext = null;
    if (rr.faults.some(f => /^Fell from/.test(f))) {
      const msg = 'Your robot fell from the ' + rr.faults.find(f => /^Fell from/.test(f)).replace('Fell from ', '') + ' — heavy damage everywhere' + (rr.scrapped ? ', ' + rr.scrapped + ' spare part' + (rr.scrapped > 1 ? 's' : '') + ' scrapped' : '') + '. The pit crew will need spares to rebuild it.';
      ev.log.push(msg);
      G.Career.inbox(S, 'Hard fall at ' + ev.name, msg, 'event');
    }
    if (rr.faults.some(f => /^Battery disconnected/.test(f))) { ev.log.push('Your robot\'s battery connector came apart in the match: no power from that moment on. The pit crew has taped and zip-tied it.'); S.battOut = S.turnSeq || 0; } // (3.5.1)
    if (rr.tipDmg) ev.log.push('Your robot tipped over: the parts up high (' + G.Robot.UPPER.filter(k => S.robot.subs[k] && S.robot.subs[k].ver).map(k => G.Seasons.sub(S.robot.year, k).name.toLowerCase()).join(', ') + ') took a knock.');
    if (rr.faults.some(f => /^Dropped by a partner/.test(f))) {
      const msg = 'A partner\'s buddy climber let go of your robot on the way up: the drivetrain took most of it, and everything else took some. The pit crew will need spares. To stay on the ground next time, tick "Don\'t let a partner carry us" in the match plan.';
      ev.log.push(msg);
      G.Career.inbox(S, 'Dropped in a buddy climb at ' + ev.name, msg, 'event');
    }
    if (ev.batts) {
      const i = ev.battIdx || 0;
      ev.batts[i] = 0.15;
      if (S.parts.batts[i]) S.parts.batts[i].h = Math.max(0.4, S.parts.batts[i].h - 0.012); // only the battery used wears
    }
    // XP
    const xm = C.expMult(ev), dt = C.driveTeam(S), mult = (match.playoff ? 1.5 : 1) * (ev.kind === 'champs' || ev.kind === 'einstein' ? 1.5 : 1) * (ev.kind === 'offseason' ? (ev.summit ? D.SUMMIT.xp : 2) : 1) * xm;
    if (dt.driver.attr && dt.driver.id) { studentXP(S, dt.driver, ['drive', 'aware', 'comp'], mult); dt.driver.matches++; }
    if (dt.operator.attr && dt.operator.id) { studentXP(S, dt.operator, ['mech', 'comp'], mult); dt.operator.matches++; }
    if (dt.hp.attr && dt.hp.id) { studentXP(S, dt.hp, ['hp'], mult); dt.hp.matches++; }
    if (dt.coach) { studentXP(S, dt.coach, ['strat'], mult); dt.coach.matches++; }
    if (dt.tech) { studentXP(S, dt.tech, ['mech', 'comp'], mult * 0.6); dt.tech.matches++; }
    // knowledge from using concepts
    if (S.robot && S.robot.year === ev.year) {
      Object.keys(S.robot.subs).forEach(k => {
        const s = S.robot.subs[k]; if (!s.ver || k === 'soft') return;
        const c = G.Seasons.concept(S.robot.year, k, s.concept); if (c && c.areas[0]) G.Robot.addXP(S, c.areas[0], 2 * xm);
      });
    }
    // season stats
    if (!match.playoff && ev.kind === 'regional') { S.season.rpSum += res[a].rp; S.season.qualMatches++; }
    if (ev.kind !== 'offseason') { S.season.matches++; S.season.faults += rr.faults.length; }
    S.morale = U.clamp(S.morale + (res[a].win === 1 ? 0.6 : res[a].win === 0 ? -0.4 : 0), 0, 100);
    ev.playerResults.push({ id: match.id || ('Q' + match.n), our: res[a].score, their: res[o].score, rp: res[a].rp, win: res[a].win, faults: rr.faults, pts: rr.pts, a });
  };
  // ======================= Impact Award =======================
  // Judges weigh this season's outreach, a sustained track record (last three seasons), the presentation,
  // feeder programs and reputation. A team without a track record can't realistically win, so Impact takes
  // several seasons of steady work. A submission is required, and a team wins it at most once per season.
  const IMPACT_BASE = { rookie: 0, established: 90, powerhouse: 220 }; // assumed outreach in seasons before the career
  C.IMPACT_W = { outreach: 0.32, record: 0.25, pitch: 0.18, programs: 0.12, rep: 0.13 };
  C.IMPACT_LABEL = { outreach: 'This season\'s outreach', record: 'Track record (3 seasons)', pitch: 'Presentation', programs: 'Feeder programs', rep: 'Reputation' };
  const impSat = r => 100 * (1 - Math.exp(-Math.max(0, r) / 280));
  C.impactRating = function (S) {
    const raw = S.season ? S.season.impact : 0;
    const past = S.history.slice(-3).map(x => x.impactRaw != null ? x.impactRaw : (x.awards || []).includes('impact') ? 400 : 120);
    while (past.length < 3) past.unshift(IMPACT_BASE[S.profile] || 0);
    // Presentation: the Business mentor (60% of their skill), the two best presenters (60% of their average Strategy and Awareness) and a room to rehearse in
    const top = S.students.slice().sort((a, b) => (b.attr.strat + b.attr.aware) - (a.attr.strat + a.attr.aware)).slice(0, 2);
    const stu = top.map(s => (s.attr.strat + s.attr.aware) / 2), biz = C.mentorSkill(S, 'biz'), room = G.Shop.fx(S, 'meeting', 'pitch');
    const parts = {
      outreach: impSat(raw), record: impSat(U.avg(past)),
      pitch: U.clamp(biz * 0.6 + (stu.length ? U.avg(stu) : 25) * 0.6 + room, 0, 100),
      programs: Math.min(100, C.feederOutlook(S).impact / 3 * 100), rep: S.rep
    };
    let score = 0;
    Object.keys(C.IMPACT_W).forEach(k => score += parts[k] * C.IMPACT_W[k]);
    const won = !!(S.season && (S.season.awards || []).some(a => a === 'impact' || (a && a.id === 'impact')));
    const pitchBy = { biz: Math.round(biz * 0.6), bizSkill: Math.round(biz), stu: Math.round((stu.length ? U.avg(stu) : 25) * 0.6), room: Math.round(room), names: top.map(s => ({ name: s.name, v: Math.round((s.attr.strat + s.attr.aware) / 2) })) };
    return { score, parts, raw, submitted: !!(S.season && S.season.impactDone), won, pitchBy };
  };
  // Chance to win the Impact Award at a regional: Monte Carlo over likely fields (cached per event + AI pool state).
  const impField = {};
  C.impactOdds = function (S, r, ir) {
    ir = ir || C.impactRating(S);
    if (!S.teams) return 0;
    let sum = 0;
    Object.values(S.teams).forEach(t => sum += t.impact);
    const key = r.id + '|' + sum;
    if (!impField[key]) {
      const rng = G.makeRng((sum * 31 + r.week * 977 + r.id.length * 131 + r.id.charCodeAt(r.id.length - 1)) >>> 0);
      const tops = [];
      for (let k = 0; k < 24; k++) {
        const ai = G.AI.pickAttendees(S.teams, rng, (r.size || 40) - 1, r.region, r.str || 3, new Set([S.team.num]), false);
        tops.push(ai.map(n => S.teams[n].impact).sort((a, b) => b - a).slice(0, 8));
      }
      impField[key] = tops;
    }
    const rng = G.makeRng(12345);
    let win = 0, n = 0;
    impField[key].forEach(top => {
      for (let j = 0; j < 40; j++) {
        const me = ir.score + rng.norm(0, 6);
        let best = -1;
        top.forEach(v => { const x = v + rng.norm(0, 6); if (x > best) best = x; });
        if (me > best) win++;
        n++;
      }
    });
    return win / n;
  };
  C.awardScores = function (S, ev) {
    const en = G.Robot.matchEntry(S, ev), c = en.cap;
    const ir = C.impactRating(S), imp = ir.score, sub = ir.submitted ? 1 : 0.75;
    const design = U.avg([c.speed, c.intake, c.scoreSpd, c.accuracy, c.endgame || 30]);
    const vers = S.robot ? U.avg(Object.values(S.robot.subs).filter(s => s.ver).map(s => s.ver)) : 1;
    const maxCx = S.robot ? Math.max(...Object.keys(S.robot.subs).map(k => { const s = S.robot.subs[k]; const cc = s.ver ? G.Seasons.concept(S.robot.year, k, s.concept) : null; return cc ? cc.cx : 0; })) : 1;
    const faultsHere = ev.playerResults.reduce((s, r) => s + r.faults.length, 0);
    return {
      rookie: S.team.rookieYear === ev.year,
      impact: ir.submitted && !ir.won ? imp : -999, ei: 0.5 * imp * sub + 0.5 * design, ras: 0.6 * imp * sub + 0.4 * design,
      eie: design, id: design * 0.6 + vers * 6 + (G.Robot.WEIGHT_LIMIT - G.Robot.weight(S)) * 0.4 + C.mentorSkill(S, 'design') * 0.15,
      ic: c.vision * 0.5 + (c.visionLvl || 0) * 15 + c.auto * 0.3, quality: c.rel * 0.8 + (faultsHere === 0 ? 10 : -faultsHere * 3),
      creativity: maxCx * 12 + 10, auto: (c.autoTier || 0) * 18 + c.auto * 0.4,
      gp: S.morale * 0.5 + imp * 0.2 + 12, spirit: S.morale * 0.6 + 10, judges: imp * 0.3 + design * 0.3 + 10
    };
  };

  // Electrical shakedown (0..1, built on a second robot): how much it helps at the next event. It matters most early in the
  // season, before the competition robot has match time of its own: first event, second event, later events.
  C.elecShakeK = function (S, n) {
    if (!S.elecShake || !S.season) return 0;
    const E = D.ELEC_SHAKE_EFFECT;
    if (n == null) n = S.season.events.filter(e => e.kind !== 'scrimmage').length;
    return S.elecShake * E[Math.min(n, E.length - 1)];
  };

  // ======================= event done =======================
  // Strategy read (0..1): how well the team spots and runs a season's alternative strategies (2024 note feeding).
  // Built by management: a Strategy mentor, a drive coach with strategy skill, driver practice, and events played and scouted.
  C.metaInsight = function (S) {
    const p = C.metaParts(S); if (!p) return 0;
    return U.clamp((p.base + p.mentor + p.coach + p.events + p.practice) / 100, 0, 1);
  };
  // (3.5.4) what the strategy read is made of, in points of 100: a base 5, the Strategy mentor (up to 30), the drive
  // coach's strategy (20), the events played and scouted this season (30), driver practice (15). null out of season.
  C.metaParts = function (S) {
    if (!S.season) return null;
    const dt = C.driveTeam(S);
    return { base: 5, mentor: 30 * C.mentorSkill(S, 'strat') / 100, coach: 20 * (dt.coachStrat || 30) / 100,
      events: 30 * Math.min(1, S.season.metaSeen || 0), practice: 15 * Math.min(1, (S.practiceWeeks || 0) / D.DRILL_CAP) };
  };
  // ... and what it does in a game: null when the game has no strategy it changes
  C.metaUse = year => ({ 2024: 'note feeding for Amplify', 2026: 'fuel hoarding while your hub is inactive' })[year] || null;
  C.onEventDone = function (S, ev) {
    const r = ev.result;
    // watching other alliances teaches the meta (more when it is common at the event, and with scouting focus)
    if (S.season && ev.year === S.year && ev.kind !== 'einstein') {
      const fs = ev.feedStats, share = fs && fs.n ? fs.f / fs.n : 0;
      S.season.metaSeen = (S.season.metaSeen || 0) + (0.12 + 0.6 * share + 0.08 * ((ev.scoutBonus || 0) + (G.Shop.superPit(S) ? 1 : 0))) * C.expMult(ev);
    }
    S.lastTune = ev.tune; S.lastConf = ev.conf;
    if (ev.kind === 'offseason' && ev.summit) { // Summit Champs: more of everything than any other offseason event
      const SMD = D.SUMMIT; S.offResults.push(r); C.summit(S).res[C.cy(S)] = r.finish;
      C.addRep(S, SMD.rep + (r.won ? SMD.repWin : 0)); S.sponsors.forEach(s => s.sat = Math.min(100, s.sat + SMD.sat)); S.morale = Math.min(100, S.morale + (r.won ? SMD.moraleWin : SMD.morale));
      C.inbox(S, 'Summit Champs: ' + r.finish, (r.won ? 'Your alliance won Summit Champs, against the best teams of the season. ' : r.finalist ? 'Your alliance reached the final, against the best teams of the season. ' : r.playoffs ? 'Your alliance reached the playoffs against the best teams of the season. ' : 'A hard weekend against the best teams of the season. ') +
        'The students learned more in two days than in a month of practice (triple experience), the sponsors were in the stands, and people will remember the robot.', 'event', { teams: (r.winners || []).filter(n => n !== S.team.num).slice(0, 3) });
      return;
    }
    if (ev.kind === 'offseason') {
      S.offResults.push(r); C.addRep(S, 2 + (r.won ? 3 : 0));
      S.sponsors.forEach(s => s.sat = Math.min(100, s.sat + 3));
      S.morale = Math.min(100, S.morale + (r.won ? 8 : 3));
      C.inbox(S, 'Offseason: ' + ev.name, 'Result: ' + r.finish + '. Your students gained valuable experience (double XP).', 'event');
      return;
    }
    if (ev.kind === 'scrimmage') {
      S.lastTune = Math.max(S.lastTune, ev.tune + 0.1); S.lastConf = Math.max(S.lastConf, ev.conf + 0.1);
      C.inbox(S, 'Week 0 scrimmage complete', 'Your drivers and robot got real reps. Starting tuning/confidence at your first regional is higher.', 'event');
      return;
    }
    if (ev.kind === 'einstein' && ev.stream) { C.festStreamClose(S, false, ev); return; } // the livestream: nothing at stake for your team
    if (ev.kind === 'einstein' && ev.festival) {
      const F = S.festival; F.pending = false; F.won = !!r.won; F.result = r.finish;
      const d = F.cele = C.festData(S, ev); // the series as it went: for the celebration, the result page, the story and the History wall
      if (r.won) { C.addRep(S, 10); S.morale = 100; S.legacy += 40; C.inbox(S, 'Festival of Champions: winners!', 'Your alliance beat the ' + F.otherCity + ' champions ' + d.w + '–' + d.l + ' in the best-of-five. 2017 has one champion alliance, and it is yours.', 'event'); }
      else C.inbox(S, 'Festival of Champions', 'The ' + F.otherCity + ' champions took the best-of-five ' + d.l + '–' + d.w + '. You are still World Champions of ' + F.city + ', and you were part of the best series of the year.', 'event');
      // The pop-up everybody else got at the start of July was held back for this team (story.hold): it is told now, with
      // this series in it, and shown on the way out of the event.
      { const st = D.STORIES.find(x => x.id === 'festival'); if (st && !(S.storySeen || {}).festival) C.tellStory(S, st).afterEvent = true; }
      return;
    }
    if (ev.kind === 'einstein' && ev.watch) {
      // watched from the stands: nothing rides on the matches, the FIRST Impact Award is settled by the ceremony (or on leaving)
      const nm = n => n + ' ' + ((S.teams[n] || {}).name || '');
      S.pendingEinstein = false;
      C.inbox(S, 'Einstein: the World Champions', (r.winners || []).map(nm).join(', ') + ' won the Einstein finals. Your team watched from the stands.', 'event');
      return;
    }
    if (ev.kind === 'einstein') {
      S.season.einstein = true;
      if (r.won) { S.season.worldChamp = true; S.worldChamps++; S.rep = 100; S.morale = 100; S.lastChamp = S.year; S.lastChampSi = S.si; S.season.wc = C.wcData(S, ev); C.inbox(S, 'WORLD CHAMPIONS!', 'Your alliance won Einstein. Unbelievable season!', 'event'); C.mailChampCongrats(S, ev);
        // 2017: two Championships, two champion alliances, and one more event to settle it
        const CH = S.cal ? C.champs(S) : null;
        if (CH && CH.final) { S.festival = { cy: C.cy(S), gy: S.year, city: CH.city, otherCity: CH.cities[1 - CH.side], alliance: ev.alliances[G.Ev.playerAlliance(ev)].slice(), pending: true };
          C.letter(S, 'The Festival of Champions organisers', 'Invitation: the Festival of Champions', 'Congratulations on your World Championship. There were two Championships this year, so there are two champion alliances, and in July the ' + CH.city + ' and ' + CH.cities[1 - CH.side] + ' champions meet for a best-of-five to settle it.\n\nWe would be honoured to have your alliance there. We pay the trip for both alliances.', 'See you in July,\nThe Festival of Champions team', { note: 'The Festival is on your calendar and cannot be skipped. Keep the robot ready.', school: true }); } }
      else C.inbox(S, 'Einstein: ' + r.finish, 'Reaching Einstein is an achievement few teams ever manage.', 'event');
      if (r.finalist) { S.lastChamp = S.year; S.lastChampSi = S.si; S.season.worldFinalist = true; }
      S.pendingEinstein = false;
      return;
    }
    if (G.World.on(S) && (ev.kind === 'regional' || ev.kind === 'dcmp')) {
      // the whole event goes into the world's books; a district team's own district points with it
      G.World.record(S, ev);
      ev.wffa = C.wffaJudge(S, ev, ev.teams, true); // Woodie Flowers Finalist Award(s) at a regional or District Championship
      if (ev.dist) { const mine = (S.wseason.rec[S.team.num] || []).find(x => x.e === ev.id); r.dist = ev.dist; r.dp = mine ? mine.dp : 0; r.dpx = mine ? G.World.points(mine, ev.fmt === 'se' ? 'se' : 'de') : null; r.counts = ev.kind === 'dcmp' || S.season.events.filter(e => e.dist && e.kind === 'regional').length < 2; }
    }
    if (S.cal && C.cy(S) >= 2018 && ev.year === S.year) r.refs = C.refCount(S, ev.teams); // copies of the published designs there (the recap, news)
    { const j = S.season.joke, t = j && !j.paid && (ev.teams || []).includes(j.num) ? S.teams[j.num] : null; // the team too good for the published robot, with one
      if (t && t.rb && t.rb.year === S.year && t.rb.ref) { j.paid = 1; G.News.refJoke(S, t, ev); } }
    S.season.events.push(r);
    r.awards.forEach(a => S.season.awards.push(a));
    if (ev.kind === 'champs') {
      S.season.champsPlayoffs = r.playoffs;
      S.season.cmpImpact = C.rollChampsImpact(S);
      if (!r.won && (S.season.cmpImpact.eligible || (S.season.wfaCmp && S.season.wfaCmp.mine)) && ev.po && ev.po.done) {
        // Out of the tournament, but this season's regional Impact Award winners are judged for the FIRST Impact Award,
        // and that is presented on Einstein: the team goes there to watch the finals and hear the announcement.
        const F = ev.po.matches.find(x => x.id === 'F');
        if (F && F.winner != null) {
          S.pendingEinstein = true;
          S.lastDivision = { watch: true, alliance: ev.alliances[F.winner].slice(), teams: ev.teams.slice(), caps: ev.caps, opr: Object.assign({}, G.Ev.opr(ev)), tune: ev.tune, conf: ev.conf, tuneAuto: ev.tuneAuto, fatigue: ev.fatigue, scoutCred: ev.scoutCred };
          C.inbox(S, 'Einstein: a seat for the awards', S.season.cmpImpact.eligible ? 'Your matches are over, but as a regional Impact Award winner your team is in the running for the FIRST Impact Award. It is presented on Einstein: the six Finalists before Final 1 and the winner after it. Go to Einstein to watch the finals and hear the announcement.' : 'Your matches are over, but the Woodie Flowers Award committee has asked ' + S.season.wfaCmp.winner.name + ' and the team to be on Einstein for the Championship awards. Go to Einstein to watch the finals.', 'event');
        }
      }
      if (r.won) { S.season.divWin = true; S.pendingEinstein = true; S.lastDivision = { alliance: ev.alliances[G.Ev.playerAlliance(ev)], teams: ev.teams.slice(), caps: ev.caps, opr: Object.assign({}, G.Ev.opr(ev)), tune: ev.tune, conf: ev.conf, tuneAuto: ev.tuneAuto, fatigue: ev.fatigue, scoutCred: ev.scoutCred }; C.inbox(S, 'Division Champions!', 'You won the ' + S.champsDiv + ' Division and advance to Einstein!', 'event'); }
    }
    // reputation & morale
    C.addRep(S, (r.won ? 8 : r.finalist ? 4 : r.playoffs ? 2 : -1) + r.awards.length * 3);
    S.morale = U.clamp(S.morale + (r.won ? 12 : r.playoffs ? 4 : -3) + r.awards.length * 4, 0, 100);
    // champs qualification
    if (ev.kind === 'regional' && !ev.dist && !S.season.champsQualified) {
      let why = '';
      if (r.won) why = 'Regional winner at ' + ev.name;
      else if (r.awards.includes('impact')) why = 'Impact Award at ' + ev.name;
      else if (r.awards.includes('ei')) why = 'Engineering Inspiration Award at ' + ev.name;
      else if (r.awards.includes('ras')) why = 'Rookie All-Star Award at ' + ev.name;
      else if (r.finalist && C.wildEra(S) && C.wildcard(S, ev)) why = 'Wildcard: finalist at ' + ev.name + ', where a team that had already qualified earned another place';
      if (why) { S.season.champsQualified = true; S.season.champsReason = why; C.inbox(S, 'Qualified for the Championship!', why + '. Register when the Championship turn arrives.', 'event'); C.mailChampsQualified(S, why); }
    }
    C.boardOutcome(S, ev); // (3.5.1) the school board was in the stands
    C.checkSponsorGoals(S, false);
    // wildcards handed out at this regional (through 2024), for the summary and the result page
    if (ev.kind === 'regional' && !ev.dist && C.wildEra(S) && G.World.on(S)) { const we = S.wseason.events.find(x => x.id === ev.id); if (we && we.res && we.res.cards) r.wild = { cards: we.res.cards, to: we.res.wild.slice() }; }
    const sum = ev.name + ': ranked ' + U.ord(r.rank) + ' of ' + r.size + ' (' + r.record + ')' + (r.playoffs ? ', alliance ' + r.alliance + ' ' + r.role + ' — ' + r.finish : ', no playoffs') + (r.awardNames.length ? '. Awards: ' + r.awardNames.join(', ') : '') + '.' +
      (r.wild ? ' Wildcards at this event: ' + r.wild.cards + (r.wild.to.length ? ', to ' + r.wild.to.map(n => (n === S.team.num ? 'your team' : n)).join(', ') : ', but every finalist had already qualified') + '.' : '');
    C.inbox(S, 'Event complete: ' + ev.name, sum, 'event');
    G.News.afterEvent(S, r);
  };
  // ======================= World Champions: what the celebration shows (kept so History can replay it) =======================
  const pickN = (arr, n) => { const a = arr.slice(), out = []; while (a.length && out.length < n) out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]); return out; };
  C.coachName = function (S) {
    const dt = C.driveTeam(S);
    if (dt.coach) return dt.coach.name;
    const m = C.allMentors(S).filter(x => x.role === 'coach').sort((a, b) => b.skill - a.skill)[0];
    return m ? m.name : null;
  };
  // ======================= The Festival of Champions (July 2017) =======================
  // The series as it went, with the people in it and what was said afterwards
  C.festData = function (S, ev) {
    const F = S.festival, me = S.team.num, pa = G.Ev.playerAlliance(ev), m = ev.po.matches.find(x => x.id === 'F');
    const side = m.red === pa ? 'red' : 'blue', o = side === 'red' ? 'blue' : 'red', nm = t => (t === me ? S.team.name : (S.teams[t] || {}).name || '');
    const games = m.games.filter(g => !g.replay && (g.winner === 'red' || g.winner === 'blue')).map(g => ({ mine: g[side], theirs: g[o], won: g.winner === side }));
    const w = games.filter(g => g.won).length, l = games.length - w, won = m.winner === pa;
    const dt = C.driveTeam(S), driver = dt.driver && dt.driver.name ? dt.driver.name : 'Your driver', coach = C.coachName(S);
    const sponsor = (S.sponsors.find(x => x.slot === 'title') || S.sponsors[0] || {}).name || null;
    const d = { kind: won ? 'winner' : 'finalist', year: F.cy, gyear: ev.year, game: (G.Seasons[ev.year] || {}).name || '', city: F.city, otherCity: F.otherCity, team: { num: me, name: S.team.name, c1: S.team.c1, school: S.team.school || '', city: G.Geo.cityOf(S) },
      alliance: ev.alliances[pa].map(t => ({ num: t, name: nm(t) })), opp: ev.alliances[1 - pa].map(t => ({ num: t, name: nm(t) })), games, w, l, driver, coach, sponsor,
      comeback: won && games.length > 3 && !games[0].won && !games[1].won, letSlip: !won && games.length > 3 && games[0].won && games[1].won, sweep: games.length === 3 };
    const pool = won ? [
      ['Two champions was one too many. Now there is one.', 'the Festival emcee'],
      ['We drove a thousand miles in July to watch ' + (games.length === 5 ? 'five' : games.length === 4 ? 'four' : 'three') + ' matches. I would do it again tomorrow.', 'a parent in the stands'],
      [driver.split(' ')[0] + ' has now won the last match of the season twice in one year.', C.leadName(S) + ', lead mentor'],
      ['They beat everybody in ' + F.city + ', and then the alliance that beat everybody in ' + F.otherCity + '.', 'a forum regular'],
      ['Twenty years with a whistle. That was the best series I ever stood beside.', 'the head referee'],
      ['I told the students that July was the offseason.', coach ? coach + ', drive coach' : 'your drive coach'],
      sponsor ? ['We ordered a second banner for the lobby. It is the same banner. We just wanted two.', sponsor] : null,
      d.comeback ? ['Two matches down, they asked for a fresh battery and changed nothing else.', 'the ' + F.otherCity + ' drive coach'] : null,
      d.sweep ? ['Three matches. We had tickets for both days.', 'a parent from ' + F.otherCity] : null
    ] : [
      ['Losing in July to the only other champions on earth. I can live with that.', coach ? coach + ', drive coach' : 'your drive coach'],
      ['Both alliances signed both banners. Ours hangs in the shop.', 'a student on your team'],
      ['Nobody in that arena lost anything today.', 'the Festival emcee'],
      ['We are still World Champions of ' + F.city + '. It says so on the wall.', C.leadName(S) + ', lead mentor'],
      d.letSlip ? ['Two matches up and one hand on the trophy. I will be telling this story for years, and it will sting every time.', driver + ', driver'] : null,
      sponsor ? ['They were invited to a final only two alliances in the world could play. That is the photo in our lobby.', sponsor] : null
    ];
    d.quotes = pickN(pool.filter(Boolean), 3);
    d.series = C.festSeries(S, ev, F.cy);
    return d;
  };
  // ---- The six teams of the series, as the world simulation has them ----
  // Three teams for a champion alliance nobody watched win. Only the player's own division and Einstein are played
  // match by match, so the winners of the other Championship are drawn from its real field: teams from that half of
  // the world that qualified for the Championship this season (World: wseason.q), the strongest of them.
  // have: teams the books already name for this alliance; taken: teams that are on the other one.
  function champAlliance(S, si, cy, have, taken, rng) {
    const ws = S.wseason && S.wseason.cy === cy ? S.wseason : null, me = S.team.num;
    const free = t => t.num !== me && !taken.includes(t.num) && !have.includes(t.num);
    const all = Object.values(S.teams).filter(t => free(t) && G.Era.champsSide(t.region) === si).sort((a, b) => b.str - a.str);
    let pool = all.filter(t => ws && ws.q[t.num]);
    if (pool.length < 6) pool = pool.concat(all.filter(t => !pool.includes(t)).slice(0, 6 - pool.length));
    if (pool.length < 3) pool = pool.concat(Object.values(S.teams).filter(t => free(t) && !pool.includes(t)).sort((a, b) => b.str - a.str).slice(0, 3)); // a very small world
    const top = rng.shuffle(pool.slice(0, 8)), out = have.slice();
    while (out.length < 3 && top.length) out.push(top.pop().num);
    if (!have.length) out.sort((a, b) => S.teams[b].str - S.teams[a].str); // the strongest of the three is the captain
    return out;
  }
  // What the world simulation knows about one team in the season `cy`: where it plays, every event it played (rank,
  // alliance, finish, judged awards) and how it earned its Championship place
  C.teamBrief = function (S, n, cy) {
    const me = n === S.team.num, T = me ? S.team : S.teams[n] || {}, ws = S.wseason && S.wseason.cy === cy ? S.wseason : null;
    const AW = { impact: 'Impact Award', ei: 'Engineering Inspiration', ras: 'Rookie All-Star' };
    const evn = id => { const e = ws.events.find(x => x.id === id); return e ? e.name : 'an event'; };
    const events = ws ? (ws.rec[n] || []).slice().sort((a, b) => a.w - b.w).map(r => ({ name: evn(r.e), rank: r.r, of: r.n, finish: r.f || '', al: r.a || 0, pick: r.p || 0, awards: (r.aw || []).filter(a => AW[a]).map(a => AW[a]) })) : [];
    const hs = me ? S.history.find(x => x.cy === cy) : null;
    return { num: n, name: T.name || '', home: T.home && D.DISTRICT[T.home] ? D.DISTRICT[T.home].name : T.region || '', rookie: !me && T.ry === cy, events,
      qual: me ? (hs && hs.champsReason) || '' : (ws && ws.q[n]) || '' };
  };
  // The series for the public message: the result, every match, and both alliances (the winners first) with each
  // team's season in the world simulation and what its robot did in the series (the per-robot results of the matches)
  C.festSeries = function (S, ev, cy) {
    const F = ev.po.matches.find(x => x.id === 'F'), sd = i => (F.red === i ? 'red' : 'blue'), me = S.team.num;
    const games = F.games.filter(g => !g.replay && (g.winner === 'red' || g.winner === 'blue'));
    const wi = F.winner, li = F.red === wi ? F.blue : F.red;
    const stat = n => { let g = 0, pts = 0, end = 0, dead = 0; games.forEach(x => { const r = x.res && x.res.robots && x.res.robots.find(q => q.team === n); if (!r) return; g++; pts += r.pts || 0; if (r.end && r.end.lvl > 0) end++; if (r.dead) dead++; }); return { g, ppm: g ? Math.round(pts / g) : 0, end, dead }; };
    const side = i => ({ city: ev.divNames[i], wins: games.filter(g => g.winner === sd(i)).length, you: ev.alliances[i].includes(me),
      teams: ev.alliances[i].map((n, k) => Object.assign(C.teamBrief(S, n, cy), { me: n === me, captain: k === 0 }, stat(n))) });
    return { cy, game: (G.Seasons[ev.year] || {}).name || '', a: side(wi), b: side(li), games: games.map(g => ({ a: g[sd(wi)], b: g[sd(li)], won: g.winner === sd(wi) })) };
  };
  // ---- The livestream: a team that is not in the Festival can watch it (optional, costs nothing, nothing at stake) ----
  // July after a season with two Championships and a Festival: the stream opens for every team that is not playing in it
  C.festStreamOpen = function (S) {
    const prev = S.history[S.history.length - 1];
    if (!S.cal || S.mode !== 'career' || S.festival || S.festStream || !prev || !prev.cy || !G.Era.champs(prev.cy).final) return;
    const CH = G.Era.champs(prev.cy);
    S.festStream = { cy: prev.cy, gy: prev.year, stage: 'open', cities: CH.cities.slice() };
    C.inbox(S, 'Live this month: the Festival of Champions', 'The ' + CH.cities[0] + ' and ' + CH.cities[1] + ' champions meet in Manchester, New Hampshire, for a best-of-five, and the whole series is streamed. Your team is not in it, but anyone can watch (Headquarters or Calendar). It is optional and costs nothing; the result arrives either way.', 'event');
    (S.launchQueue = S.launchQueue || []).push({ kind: 'festLive' });
  };
  // the two champion alliances: the winners of the Einstein your team was at, when the books have them, and for the
  // rest the best of each Championship's field in the world simulation (champAlliance)
  function buildFestStream(S) {
    const FS = S.festStream, rng = G.R, gy = FS.gy, me = S.team.num, prev = S.history.find(h => h.cy === FS.cy);
    const ev = G.Ev.start({ id: 'festlive' + FS.cy, kind: 'einstein', name: 'Festival of Champions', size: 1, year: gy, week: 0, str: 5, fmt: 'f5' });
    ev.festival = true; ev.stream = true; ev.watch = true; ev.batts = S.parts.batts.map(() => 1);
    const ein = prev && (prev.events || []).find(e => e.kind === 'einstein' && e.winners && e.winners.length >= 3);
    const known = ein ? ein.winners.filter(n => n !== me && S.teams[n]).slice(0, 3) : [];
    const side = G.Era.champsSide(S.team.region), mine = champAlliance(S, side, FS.cy, known, [], rng), other = champAlliance(S, 1 - side, FS.cy, [], mine, rng);
    ev.alliances = side === 0 ? [mine, other] : [other, mine]; // in city order: the first Championship's champions first
    ev.divNames = FS.cities.slice();
    ev.teams = [].concat(...ev.alliances);
    ev.teams.forEach(n => { ev.caps[n] = G.AI.entry(S.teams[n], gy, 1.14, 1, rng); ev.rank[n] = { rp: 0, played: 0, w: 0, l: 0, t: 0, pts: 0, auto: 0, tb: 0 }; });
    ev.practice.blocks = 0;
    G.Ev.initPlayoffs(ev);
    return ev;
  }
  C.startFestStream = function (S) {
    const FS = S.festStream;
    if (!FS || FS.stage !== 'open') return 'The stream is not on';
    if (S.event) return 'Finish the current event first';
    S.event = buildFestStream(S); // no travel, no fees, no hours: the team watches from the shop
    return null;
  };
  // The series is over: watched to the end, closed early (the rest is played out) or never opened (missed: all of it is).
  // The result is kept and the story everybody gets is told with it.
  C.festStreamClose = function (S, missed, ev) {
    const FS = S.festStream;
    if (!FS || FS.stage !== 'open') return;
    // never opened: the series is played in the background. Ev.start makes its event the current one, so put back
    // whatever was current (nothing, normally) or the month would stay blocked by an event nobody is at.
    const own = !ev, was = S.event;
    if (own) ev = buildFestStream(S);
    let m; while ((m = G.Ev.nextPlayoff(ev))) G.Ev.applyPlayoff(ev, m, G.Ev.runHeadless(ev, G.Ev.poMatchObj(ev, m)));
    if (own) S.event = was || null;
    const F = ev.po.matches.find(x => x.id === 'F'), wside = F.red === F.winner ? 'red' : 'blue', lside = wside === 'red' ? 'blue' : 'red';
    const games = F.games.filter(g => !g.replay && (g.winner === 'red' || g.winner === 'blue')).map(g => ({ a: g[wside], b: g[lside], won: g.winner === wside }));
    FS.stage = missed ? 'missed' : 'watched';
    FS.result = { winner: ev.divNames[F.winner], loser: ev.divNames[F.loser], w: games.filter(g => g.won).length, l: games.filter(g => !g.won).length, games,
      teams: ev.alliances[F.winner].map(n => ({ num: n, name: (S.teams[n] || {}).name || '' })), opp: ev.alliances[F.loser].map(n => ({ num: n, name: (S.teams[n] || {}).name || '' })) };
    FS.result.series = C.festSeries(S, ev, FS.cy);
    const st = D.STORIES.find(x => x.id === 'festival');
    if (st && !(S.storySeen || {}).festival) { const L = C.tellStory(S, st); if (!missed) L.afterEvent = true; }
  };
  C.wcData = function (S, ev) {
    const me = S.team.num, gy = ev.year, Sz = G.Seasons[gy] || {}, pa = G.Ev.playerAlliance(ev), al = pa >= 0 ? ev.alliances[pa] : [me];
    const nm = t => (t === me ? S.team.name : (S.teams[t] || {}).name || '');
    let streak = 1; for (let i = S.history.length - 1; i >= 0 && S.history[i].worldChamp; i--) streak++;
    const before = S.history.filter(h => h.worldChamp), last = S.history[S.history.length - 1];
    const year = C.calYear(S, gy), syears = S.history.slice(S.history.length - (streak - 1)).map(x => C.calYear(S, x.year)).concat([year]);
    const F = ev.po && ev.po.matches.find(x => x.id === 'F'), side = F && F.red === pa ? 'red' : 'blue', opp = F ? (side === 'red' ? F.blue : F.red) : null;
    const fw = F ? F.games.filter(g => !g.replay && g.winner === side).length : 2, fl = F ? F.games.filter(g => !g.replay && g.winner && g.winner !== side && g.winner !== 'tie').length : 0;
    const oc = opp != null && ev.alliances[opp] ? ev.alliances[opp][0] : null;
    const dt = C.driveTeam(S), driver = dt.driver.name, coach = C.coachName(S), partners = al.filter(t => t !== me);
    const sponsor = (S.sponsors.find(x => x.slot === 'title') || S.sponsors[0] || {}).name || null;
    const titles = before.length + 1, lastFinalist = !!(last && last.worldFinalist && !last.worldChamp);
    const CHw = S.cal ? C.champs(S) : null; // two Championships (2017 to 2020): the city goes into the title
    const d = { gyear: gy, year, game: Sz.name || '', fict: C.isFictional(S), div: S.champsDiv || '', city: CHw && CHw.n > 1 ? CHw.city : '', team: { num: me, name: S.team.name, school: S.team.school || '', city: G.Geo.cityOf(S) },
      alliance: al.map(t => ({ num: t, name: nm(t) })), fw, fl, opp: oc != null ? { num: oc, name: nm(oc), div: ev.divNames && opp != null ? ev.divNames[opp] : '' } : null,
      driver, coach, coachIsMentor: !dt.coach, sponsor, streak, titles, syears, lastFinalist,
      lastTitleYear: streak < 2 && before.length ? C.calYear(S, before[before.length - 1].year) : null, rookie: S.team.rookieYear === gy };
    const again = streak === 2 ? '… for the second year in a row' : streak > 2 ? '… for the ' + U.ord(streak) + ' year in a row' : titles > 1 ? ', champions once more' : '';
    const pool = [
      ['I can\'t feel my hands. Did we actually just win that?', driver + ', driver'],
      coach ? ['Every call in that final was one we had drilled. All I did was say them out loud.', coach + ', drive coach'] : null,
      ['At Kickoff I told them we could make it here. I wasn\'t sure I believed it. They did.', C.leadName(S) + ', lead mentor'],
      partners[0] ? ['Best alliance we have ever been part of. Thank you for picking us.', 'Team ' + partners[0] + ' ' + nm(partners[0])] : null,
      partners[1] ? ['We are going to need a bigger trailer for the ride home.', 'Team ' + partners[1] + ' ' + nm(partners[1])] : null,
      oc != null ? ['Hardest finals we have ever played. Congratulations, you earned every point.', 'Team ' + oc + ' ' + nm(oc) + ', Einstein finalists'] : null,
      sponsor ? ['We are hanging the banner photo in our lobby. Next season is on us.', sponsor] : null,
      ['We are adding a trophy case. A bigger one.', 'your school principal'],
      ['A rookie team asked for a photo with your robot. Then twenty more did.', 'the pit announcer'],
      lastFinalist ? ['Last year they watched the confetti fall on somebody else. Not today.', 'the Einstein commentator'] : null,
      streak >= 2 ? ['Back-to-back? Somebody check their code for a cheat mode.', 'a forum comment with 1,200 upvotes'] : ['Who ARE these people? Bookmarking their team page right now.', 'a forum comment'],
      ['The robot is fine. The drive team is not fine. Nobody is fine. It is wonderful.', 'your pit crew']
    ].filter(Boolean);
    d.quotes = [['Ladies and gentlemen, your ' + year + ' FIRST World Champions' + again + '!', 'the Einstein emcee']].concat(pickN(pool, 3));
    return d;
  };

  // ======================= Championship: FIRST Impact Award =======================
  // Regional Impact Award winners are judged again at the Championship: one FIRST Impact Award winner (Hall of Fame) and
  // six Finalists. The field is the world's strongest Impact programs; your entry is your Impact rating. The Finalists
  // are announced before Einstein Final 1 and the winner after it (settleImpact applies each announcement once).
  C.rollChampsImpact = function (S) {
    const s = S.season, me = S.team.num, rng = G.R;
    const eligible = S.hallOfFame == null && s.events.some(e => e.kind === 'regional' && (e.awards || []).includes('impact'));
    const hof = S.hof || []; // Hall of Fame teams have won it and are not judged again
    const field = Object.keys(S.teams).map(k => S.teams[k]).filter(t => t.num !== me && !hof.includes(t.num)).sort((a, b) => b.impact - a.impact).slice(0, 70).map(t => ({ num: t.num, v: t.impact * 0.9 + rng.norm(0, 4) }));
    const ir = C.impactRating(S);
    if (eligible) field.push({ num: me, v: ir.score + rng.norm(0, 4) });
    field.sort((a, b) => b.v - a.v);
    const rank = field.findIndex(x => x.num === me);
    return { eligible, score: Math.round(ir.score), rank: rank < 0 ? null : rank + 1, of: field.length, winner: field[0].num, finalists: field.slice(1, 7).map(x => x.num),
      out: rank === 0 ? 'winner' : rank > 0 && rank < 7 ? 'finalist' : null, result: null, told: {} };
  };
  C.impactCele = function (S, kind) {
    const s = S.season, gy = S.year, ci = s.cmpImpact, me = S.team.num;
    const nm = t => (t === me ? S.team.name : (S.teams[t] || {}).name || '');
    const speakers = S.students.slice().sort((a, b) => (b.attr.strat + b.attr.aware) - (a.attr.strat + a.attr.aware)).slice(0, 2).map(x => x.name);
    const biz = C.allMentors(S).filter(x => x.role === 'biz').sort((a, b) => b.skill - a.skill)[0];
    const sponsor = (S.sponsors.find(x => x.slot === 'title') || S.sponsors[0] || {}).name || null;
    const d = { kind, gyear: gy, year: C.calYear(S, gy), game: (G.Seasons[gy] || {}).name || '', team: { num: me, name: S.team.name, school: S.team.school || '', city: G.Geo.cityOf(S) }, score: ci.score, speakers, mentor: biz ? biz.name : null,
      outreach: s.outreach || 0, points: Math.round(s.impact || 0), programs: (S.programs || []).length, seasons: S.history.length + 1,
      winner: { num: ci.winner, name: nm(ci.winner) }, finalists: ci.finalists.map(n => ({ num: n, name: nm(n) })) };
    const pool = kind === 'winner' ? [
      speakers[0] ? ['They asked what happens to our programs when we graduate. I said: come back in ten years and ask the kids we taught.', speakers[0] + ', presenter'] : null,
      speakers[1] ? ['I practised that presentation in the shower for a month. Worth it.', speakers[1] + ', presenter'] : null,
      d.mentor ? ['The robot takes six weeks. This took years, and every student who ever ran a demo table owns a piece of it.', d.mentor + ', outreach mentor'] : null,
      ['We do not give this to the best robot. We give it to the team we want every other team to become.', 'the head judge'],
      d.programs ? ['Half my class is on a robotics team now. I blame them entirely.', 'a teacher at one of your feeder programs'] : null,
      sponsor ? ['We sponsored a robotics team. It turns out we sponsored a movement.', sponsor] : null,
      ['The Hall of Fame banner goes up next to the gym scoreboard. The basketball coach has agreed, in writing.', 'your school principal'],
      ['I joined because of a robot at the county fair. That was their booth.', 'a rookie from Team ' + ci.finalists[0]]
    ] : [
      speakers[0] ? ['Six finalists in the whole world, and they read our number. I am still shaking.', speakers[0] + ', presenter'] : null,
      d.mentor ? ['Finalist means the judges want to see it again next year. So do I.', d.mentor + ', outreach mentor'] : null,
      ['Any of these teams could be the model for the program. That is the point of naming them.', 'the head judge'],
      sponsor ? ['We put the news on the front page of our site before the team got back to the pits.', sponsor] : null,
      ['A blue banner for outreach. The trophy case did not see that one coming.', 'your school principal']
    ];
    d.quotes = pickN(pool.filter(Boolean), 3);
    return d;
  };
  C.settleImpact = function (S, stage) {
    const ci = S.season && S.season.cmpImpact; if (!ci) return null;
    ci.told = ci.told || {};
    const me = S.team.num, nm = n => n + ' ' + (n === me ? S.team.name : (S.teams[n] || {}).name || '');
    const all = stage === 'all';
    if ((all || stage === 'fin') && !ci.told.fin) {
      ci.told.fin = true;
      if (ci.out === 'finalist') {
        ci.result = 'finalist'; ci.cele = C.impactCele(S, 'finalist');
        C.addRep(S, 12); S.morale = Math.min(100, S.morale + 10); S.sponsors.forEach(sp => { sp.sat = Math.min(100, sp.sat + 8); });
        C.inbox(S, 'FIRST Impact Award Finalist!', 'On Einstein, before Final 1, the judges named the six FIRST Impact Award Finalists, and your team is one of them. A blue banner is on its way to your wall (History).', 'event');
      }
    }
    if ((all || stage === 'win') && !ci.told.win) {
      ci.told.win = true;
      S.hof = S.hof || []; if (!S.hof.includes(ci.winner)) { S.hof.push(ci.winner); (S.hofList = S.hofList || []).push({ num: ci.winner, cy: C.calYear(S), name: ci.winner === me ? S.team.name : (S.teams[ci.winner] || {}).name || '' }); } // one FIRST Impact Award per team, ever; the Hall of Fame page lists them
      if (ci.out === 'winner') {
        ci.result = 'winner'; ci.cele = C.impactCele(S, 'winner'); S.hallOfFame = S.si;
        S.rep = 100; S.morale = 100; S.sponsors.forEach(sp => { sp.sat = Math.min(100, sp.sat + 20); });
        C.inbox(S, 'FIRST IMPACT AWARD!', 'After Einstein Final 1 the judges called your team to the field: you won the FIRST Impact Award, the most prestigious award in the program, and joined the Hall of Fame. Hall of Fame teams are invited to every future Championship.', 'event');
        C.mailHallOfFame(S);
      } else {
        C.inbox(S, 'FIRST Impact Award: Team ' + nm(ci.winner), 'Team ' + nm(ci.winner) + ' won the FIRST Impact Award at the Championship. Finalists: ' + ci.finalists.map(nm).join(', ') + '.' +
          (ci.out === 'finalist' ? ' Your team was among the Finalists.' : ci.eligible ? ' Your entry (Impact rating ' + ci.score + ') placed ' + U.ord(ci.rank) + ' of ' + ci.of + '.' : S.hallOfFame != null ? ' Your team is already in the Hall of Fame.' : ' Only this season\'s regional Impact Award winners are judged at the Championship.'), 'event');
      }
    }
    return ci;
  };

  // ======================= Woodie Flowers Award =======================
  // D.WFA has the rules. The team writes one essay a season for one mentor: a mentor who has never been a Finalist is
  // judged for the Woodie Flowers Finalist Award (WFFA) at the team's next regional, or at its District Championship;
  // a past Finalist is re-nominated for the Woodie Flowers Award (WFA) itself. The WFA is decided when the Championship
  // begins and presented on Einstein with the FIRST Impact Award; a team whose mentor wins it goes to Einstein to watch.
  // None of this uses the game's random numbers (each draw has its own seed), so the season plays out as before.
  const hashS = s => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; };
  const wRng = key => G.makeRng(hashS(key) || 11);
  // S0, team: the career and the team the mentor belongs to (yours when not given)
  C.makeProf = function (role, r, S0, team) {
    const p = r.pick(D.PROFESSIONS[role] || D.PROFESSIONS.design), k = p[2];
    const S = S0 || G.S, tm = team || (S && S.team) || {}; // (3.5) the mentor works near the team: at a school of its part of the home, or at a company of its city or its land
    if (k === 'school') return { t: p[0], area: p[1], at: D.schoolName(r, tm.home || tm.z, tm.region) };
    let city = ''; try { city = S && tm.num != null && G.Geo && G.Geo.posOf ? G.Geo.posOf(S, tm, G.Geo.cyOf(S)).hub : ''; } catch (e) { city = ''; }
    const at = (city && D.sponsorDraw && D.sponsorDraw(r, D.sponsorRings(k, city), true)) || r.pick(D.sponsorPool(k, tm.home, tm.region));
    return { t: p[0], area: p[1], at };
  };
  C.profLine = p => (p ? p.t + (p.at ? ' at ' + p.at : '') : 'Mentor');
  // a mentor's background: profession, years in FIRST and seasons with this team (filled in once from the mentor's own id)
  C.mentorMeta = function (S, m) {
    if (m.prof && m.exp != null && m.ten != null) return m;
    const r = wRng('mentor:' + m.id + ':' + m.name);
    if (!m.prof) m.prof = C.makeProf(m.role, r, S);
    if (m.exp == null) m.exp = r.int(1, 4 + (m.stars || 2) * 3);
    if (m.ten == null) m.ten = S.profile === 'rookie' && !S.history.length ? 0 : Math.min(m.exp, r.int(0, 5));
    return m;
  };
  C.wfaWriters = S => S.students.slice().sort((a, b) => (b.attr.strat + b.attr.aware) - (a.attr.strat + a.attr.aware)).slice(0, 2);
  // what the students' essay can make of a mentor, 0 to 100 (q: the essay's quality, 0 to 1, from the hours put into it)
  C.wfaRating = function (S, m, q) {
    C.mentorMeta(S, m);
    const w = C.wfaWriters(S), parts = { skill: m.skill, ten: Math.min(100, m.ten * 12), exp: Math.min(100, m.exp * 6), reach: Math.min(100, (S.studentsCount || S.students.length) * 1.6),
      writing: w.length ? U.avg(w.map(s => (s.attr.strat + s.attr.aware) / 2)) : 25, essay: 100 * (q == null ? D.WFA.q0 : q) };
    let score = 0; Object.keys(D.WFA.w).forEach(k => { score += parts[k] * D.WFA.w[k]; });
    if (/teach|educat|professor/i.test(m.prof.t + ' ' + m.prof.area)) score += D.WFA.teacher;
    return { score: U.clamp(score, 0, 100), parts, writers: w.map(s => s.name) };
  };
  C.wfaCandidates = S => S.mentors.map(m => C.mentorMeta(S, m)).filter(m => !m.wfa);
  // the mentor the essay should be about: the strongest nomination on the team
  C.wfaPick = S => C.wfaCandidates(S).sort((a, b) => C.wfaRating(S, b).score - C.wfaRating(S, a).score)[0] || null;
  C.wffaSlots = (S, distId, cy) => ((cy || C.cy(S)) < 2022 ? 1 : (D.DISTRICT[distId] && D.DISTRICT[distId].teams >= 100 ? 3 : 2));
  // the essay the team sent this season, if it waits to be judged at this event (a regional the team plays, or its
  // District Championship, played or not)
  C.wfaMineAt = function (S, e, attending) {
    const w = S.season && S.season.wfa;
    if (!w || w.kind !== 'nom' || w.res) return null;
    const m = S.mentors.find(x => x.id === w.m); if (!m || m.wffa || m.wfa) return null;
    const dist = !!(S.team.home && G.World.on(S));
    if (dist ? !(e.kind === 'dcmp' && e.dist === S.team.home) : !(attending && e.kind === 'regional' && !e.dist)) return null;
    return m;
  };
  // one event's Woodie Flowers Finalist Award(s): the best essays of those sent there. Every regional and every District
  // Championship in the world has them; district events have none.
  C.wffaAt = function (S, e, teams, mine) {
    if (!(e.kind === 'dcmp' || (e.kind === 'regional' && !e.dist))) return [];
    const cy = (S.wseason && S.wseason.cy) || C.cy(S), r = wRng('wffa:' + e.id + ':' + cy), me = S.team.num;
    const slots = e.kind === 'dcmp' ? C.wffaSlots(S, e.dist, cy) : 1;
    const pool = teams.filter(t => t !== me && S.teams[t]).map(t => ({ t, k: S.teams[t].impact + r.norm(0, 25) })).sort((a, b) => b.k - a.k);
    const n = Math.max(slots + 2, Math.round(pool.length * D.WFA.nom));
    const field = pool.slice(0, n).map(x => ({ team: x.t, v: U.clamp(r.norm(D.WFA.ai[0], D.WFA.ai[1]) + (S.teams[x.t].impact - 50) * 0.08, 10, 97) }));
    if (mine) field.push({ team: me, me: true, mid: mine.id, v: C.wfaRating(S, mine, S.season.wfa.q).score + r.norm(0, D.WFA.noise) });
    field.sort((a, b) => b.v - a.v);
    const roles = Object.keys(D.PROFESSIONS);
    return field.slice(0, slots).map(x => x.me ? { e: e.id, ename: e.name, team: me, me: true, mid: x.mid, name: mine.name, prof: mine.prof, v: x.v }
      : { e: e.id, ename: e.name, team: x.team, name: D.personName(r, S.teams[x.team]), prof: C.makeProf(r.pick(roles), r, S, S.teams[x.team]), v: x.v });
  };
  // judge an event: record its Finalists in the world's books, and tell the team about its own essay
  C.wffaJudge = function (S, e, teams, attending) {
    const mine = C.wfaMineAt(S, e, attending), won = C.wffaAt(S, e, teams, mine);
    if (S.wseason) (S.wseason.wffa = S.wseason.wffa || []).push(...won);
    if (mine) {
      const w = S.season.wfa, ok = won.some(x => x.me), other = won.filter(x => !x.me)[0];
      w.res = ok ? 'wffa' : 'judged'; w.at = e.name;
      if (ok) {
        mine.wffa = C.calYear(S); C.addRep(S, D.WFA.rep.wffa); S.morale = Math.min(100, S.morale + 6);
        (S.wfaHonors = S.wfaHonors || []).push({ kind: 'wffa', cy: C.calYear(S), mid: mine.id, name: mine.name, prof: mine.prof, event: e.name });
        C.inbox(S, 'Woodie Flowers Finalist Award: ' + mine.name, 'At the ' + e.name + ' the judges read your students\' essay aloud and called ' + mine.name + ', ' + C.profLine(mine.prof).replace(/^./, c => c.toLowerCase()) + ', to the field: a Woodie Flowers Finalist. The award honours a mentor who leads, inspires and teaches through communication, and the students\' words about ' + mine.prof.area + ' made the case. A blue banner for the award goes on your wall (History).\n\n' + mine.name + ' is now one of the mentors the Woodie Flowers Award is chosen from at the Championship, this season and, re-nominated, in any season after.', 'event');
        C.mailWfaThanks(S, mine.id, mine.name, mine.prof, 'wffa', e.name);
      } else C.inbox(S, 'Woodie Flowers Finalist Award at the ' + e.name, 'Your students\' essay about ' + mine.name + ' was judged here. The award went to ' + (other ? other.name + ' of Team ' + other.team + ', ' + C.profLine(other.prof).replace(/^./, c => c.toLowerCase()) : 'another mentor') + '. ' + mine.name + ' can be nominated again next season.', 'event');
    }
    return won;
  };
  // the Championship's one Woodie Flowers Award: this season's Finalists and the re-nominated past Finalists, each with a new essay
  C.rollWfa = function (S) {
    const s = S.season; if (!s || s.wfaCmp) return s && s.wfaCmp;
    if (!S.wfaPast) C.wfaSeed(S); // an older save
    const cy = C.cy(S), r = wRng('wfa:' + cy + ':' + S.team.num), field = [];
    ((S.wseason && S.wseason.cy === cy && S.wseason.wffa) || []).forEach(x => { if (!x.me) field.push({ name: x.name, team: x.team, prof: x.prof, v: x.v - 3 + r.norm(0, D.WFA.wfaNoise), how: 'Finalist at the ' + x.ename }); });
    (S.wfaPast || []).forEach(x => { if (S.teams[x.team] && r.chance(D.WFA.renom)) field.push({ name: x.name, team: x.team, prof: x.prof, v: x.v - 3 + r.norm(0, D.WFA.wfaNoise), how: 'Finalist in ' + x.cy + ', re-nominated' }); });
    const w = s.wfa, m = w && S.mentors.find(x => x.id === w.m);
    let mine = null;
    if (m && !m.wfa && (w.res === 'wffa' || w.kind === 'renom')) { mine = { name: m.name, team: S.team.num, prof: m.prof, me: true, mid: m.id, v: C.wfaRating(S, m, w.q).score + r.norm(0, D.WFA.noise), how: w.res === 'wffa' ? 'Finalist at the ' + w.at : 'Finalist in ' + m.wffa + ', re-nominated' }; field.push(mine); }
    field.sort((a, b) => b.v - a.v);
    const win = field[0] || null;
    s.wfaCmp = { winner: win ? { name: win.name, team: win.team, prof: win.prof, how: win.how, me: !!win.me, mid: win.mid || null } : null, of: field.length, rank: mine ? field.indexOf(mine) + 1 : null, nominee: mine ? mine.name : null, mine: !!(win && win.me), told: false };
    return s.wfaCmp;
  };
  // a team whose mentor wins goes to Einstein to watch, whether or not it played the Championship
  C.wfaSeat = function (S) {
    const CH = C.champs(S), side = CH.n > 1 ? G.Era.champsSide(S.team.region) : 0, rng = wRng('wfaseat:' + C.cy(S));
    if (!S.season.cmpImpact) S.season.cmpImpact = C.rollChampsImpact(S);
    S.pendingEinstein = true;
    S.lastDivision = { watch: true, wfa: true, alliance: champAlliance(S, side, C.cy(S), [], [], rng), teams: [], caps: {}, opr: {}, tune: 0.5, conf: 0.5, tuneAuto: 0, fatigue: S.fatigue, scoutCred: 1 };
    const W = S.season.wfaCmp.winner;
    C.letter(S, 'The Woodie Flowers Award committee', 'Einstein: an invitation from the Woodie Flowers Award committee', 'The committee would like ' + W.name + ' and the team to be on Einstein for the Championship awards. The FIRST Impact Award and the Woodie Flowers Award are presented there, between the finals, and we would very much like you to be in the room.', 'Warm regards,\nThe Woodie Flowers Award committee', { note: 'Go to Einstein from Headquarters: the trip is part of the Championship and costs nothing.', prio: true, school: true, cc: C.ccMentor(W) });
  };
  C.wfaCele = function (S) {
    const c = S.season.wfaCmp, W = c.winner, m = S.mentors.find(x => x.id === W.mid) || { name: W.name, prof: W.prof, ten: 0, exp: 0, role: 'design' };
    const w = S.season.wfa || {}, cy = C.calYear(S), writers = (w.writers || C.wfaWriters(S).map(s => s.name)).slice(0, 2);
    const role = (D.MENTOR_ROLES.find(r => r.id === m.role) || {}).name || 'Mentor';
    const past = Object.keys(D.REAL_WFA).map(Number).filter(y => y < cy).sort((a, b) => b - a), pick = past.slice(0, 4).concat(past.includes(1996) && !past.slice(0, 4).includes(1996) ? [1996] : []);
    const d = { year: cy, team: { num: S.team.num, name: S.team.name, school: S.team.school || '', city: G.Geo.cityOf(S) }, name: m.name, prof: W.prof, role, ten: m.ten || 0, exp: m.exp || 0, how: W.how, of: c.of, writers,
      students: S.studentsCount || S.students.length, past: pick.map(y => Object.assign({ year: y }, D.REAL_WFA[y])), real: D.REAL_WFA[cy] ? Object.assign({ year: cy }, D.REAL_WFA[cy]) : null };
    d.quotes = [
      writers[0] ? ['We wrote it in the library after practice for three weeks. Every sentence was something ' + m.name + ' actually said to one of us.', writers[0] + ', who wrote the essay'] : null,
      ['I did not build the robot. They did. I just kept asking them why.', m.name],
      ['The essays we remember explain an idea the way the mentor explained it to them. This one did.', 'a member of the award committee'],
      writers[1] ? ['When they read the first line we knew. We had read it to each other forty times.', writers[1] + ', who wrote the essay'] : null,
      ['Our shop has a lot of trophies. This is the one everybody stops to read.', 'your school principal']
    ].filter(Boolean).slice(0, 3);
    return d;
  };
  // announce the Woodie Flowers Award (once): on Einstein, or when the Championship is over
  C.settleWfa = function (S) {
    const c = S.season && S.season.wfaCmp; if (!c || c.told || !c.winner) return c;
    c.told = true;
    const W = c.winner, cy = C.calYear(S);
    if (c.mine) {
      const m = S.mentors.find(x => x.id === W.mid); if (m) m.wfa = cy;
      C.addRep(S, D.WFA.rep.wfa); S.morale = Math.min(100, S.morale + 12); S.sponsors.forEach(sp => { sp.sat = Math.min(100, sp.sat + 6); });
      c.cele = C.wfaCele(S);
      (S.wfaHonors = S.wfaHonors || []).push({ kind: 'wfa', cy, mid: W.mid, name: W.name, prof: W.prof, event: 'FIRST Championship', cele: c.cele });
      C.inbox(S, 'WOODIE FLOWERS AWARD: ' + W.name, 'On Einstein, alongside the FIRST Impact Award, ' + W.name + ' received the ' + cy + ' Woodie Flowers Award: one mentor chosen from ' + c.of + ' candidates, every one of them a Woodie Flowers Finalist. ' + W.name + ' is ' + C.profLine(W.prof).replace(/^(\w)/, x => (/^[aeiou]/i.test(x) ? 'an ' : 'a ') + x.toLowerCase()) + ', and your students\' essay was about what that work in ' + W.prof.area + ' taught them. A mentor receives the award once in a lifetime. Its blue banner hangs with your Championship honours (History).', 'event');
      C.mailWfaThanks(S, W.mid, W.name, W.prof, 'wfa');
    } else C.inbox(S, 'Woodie Flowers Award: ' + W.name + ', Team ' + W.team, 'The ' + cy + ' Woodie Flowers Award went to ' + W.name + ' of Team ' + W.team + ' ' + ((S.teams[W.team] || {}).name || '') + ', ' + C.profLine(W.prof).replace(/^./, x => x.toLowerCase()) + ' (' + W.how + '). It was chosen from ' + c.of + ' Woodie Flowers Finalists.' +
      (c.nominee ? ' Your nominee, ' + c.nominee + ', was one of them.' : ''), 'event');
    return c;
  };
  // at the season review: this season's Finalists elsewhere join the past Finalists who can be re-nominated
  function wfaPastUpdate(S) {
    const ws = S.wseason, c = S.season && S.season.wfaCmp, add = ((ws && ws.wffa) || []).filter(x => !x.me);
    let past = (S.wfaPast || []).concat(add.map(x => ({ name: x.name, team: x.team, prof: x.prof, v: x.v, cy: ws.cy })));
    if (c && c.winner && !c.winner.me) past = past.filter(x => !(x.name === c.winner.name && x.team === c.winner.team));
    past = past.filter(x => S.teams[x.team]);
    if (past.length > D.WFA.pastMax) past = past.sort((a, b) => b.v - a.v).slice(0, D.WFA.pastMax);
    S.wfaPast = past;
  }
  // a career starts with past Finalists already in the world
  C.wfaSeed = function (S) {
    if (S.wfaPast) return;
    const r = wRng('wfapast:' + S.team.num + ':' + (S.cal ? S.cal[0] : S.year)), ts = Object.keys(S.teams || {}).map(Number), roles = Object.keys(D.PROFESSIONS);
    S.wfaPast = [];
    for (let i = 0; i < D.WFA.past && ts.length; i++) { const team = r.pick(ts); S.wfaPast.push({ name: D.personName(r, S.teams[team]), team, prof: C.makeProf(r.pick(roles), r, S, S.teams[team]), v: U.clamp(r.norm(74, 6), 55, 96), cy: (S.cal ? S.cal[0] : S.year) - r.int(1, 12) }); }
  };

  // ======================= The state of the art moves on (offseason) =======================
  const techTeam = (S, rng) => { const ks = Object.keys(S.teams || {}); return ks.length ? rng.pick(ks) : String(rng.int(100, 9999)); };
  C.techHit = function (S, area, pct) {
    const xp0 = S.know[area] || 0, l0 = D.knowLevel(xp0), guard = S.mentors.some(m => m.spec === area);
    // XP banked far above the top level is old know-how: only the first 125% of the top level still counts as current
    const top = Math.round(D.KNOW_THRESH[D.KNOW_THRESH.length - 1] * D.TECH_CAP), base = Math.min(xp0, top);
    // Deep know-how (the two highest levels) is tuned to the way things were, so it adapts worst: it loses half as much
    // again and always drops a level, specialist mentor or not (the mentor still softens how far it falls). One change
    // never takes more than one level.
    const deep = l0 >= D.TECH_DEEP_LVL, k = pct * (deep ? D.TECH_DEEP : 1) * (guard ? 0.5 : 1);
    let xp1 = Math.round(base * (1 - k)), forced = false;
    if (deep) { const lo = D.KNOW_THRESH[l0 - 1], hi = D.KNOW_THRESH[l0]; forced = D.knowLevel(xp1) >= l0; xp1 = U.clamp(xp1, lo, Math.round(lo + (hi - lo) * (guard ? 0.85 : 0.6))); }
    S.know[area] = xp1;
    return { area, name: D.AREA[area].name, xp0, xp1, l0, l1: D.knowLevel(xp1), guard, pct: Math.round(k * 100), base, capped: xp0 > top, deep, forced };
  };
  function techNews(S, kind, picks, pct) {
    const rng = G.R, year = C.calYear(S, S.order[S.upcoming]) || '';
    const items = picks.map(x => Object.assign({ title: x.title, body: x.body, tag: x.tag || 'Seen online' }, C.techHit(S, x.area, pct)));
    const talk = rng.shuffle(picks.reduce((a, x) => a.concat(x.talk || []), []).concat(rng.shuffle(D.TECH_TALK[kind].slice()))).slice(0, 3).map(q => [q[0], q[1].replace('{t}', techTeam(S, rng))]);
    const lost = items.filter(i => i.l1 < i.l0), guard = items.filter(i => i.guard);
    const take = (lost.length ? 'Knowledge levels down: ' + lost.map(i => i.name + ' ' + i.l0 + ' → ' + i.l1).join(', ') + '.' : 'No knowledge level lost, but the XP is gone.') +
      (guard.length ? ' Your specialist mentor' + (guard.length > 1 ? 's' : '') + ' halved the loss in ' + guard.map(i => i.name).join(' and ') + '.' : ' A mentor who specializes in an area halves its loss.') +
      (items.some(i => i.deep) ? ' Know-how at Level ' + D.TECH_DEEP_LVL + ' or 5 is tuned to the way things were: it loses half as much again and always drops a level, mentor or not.' : '') + ' Research (Design Office) wins it back.';
    const L = { kind, title: kind === 'rules' ? 'Rule and vendor changes for ' + (year || 'next season') : 'New designs spotted online', month: D.MONTHS[S.month], year, intro: rng.pick(D.TECH_INTRO[kind]), items, talk, take };
    const text = L.intro + '\n\n' + items.map(i => i.title + ' (' + i.tag + ') — ' + i.body + '\n→ ' + i.name + ': ' + (i.capped ? i.xp0 + ' → ' + i.xp1 + ' XP (only ' + i.base + ' XP still counted as current, then −' + i.pct + '%' : '−' + i.pct + '% know-how (' + i.xp0 + ' → ' + i.xp1 + ' XP') + (i.l1 < i.l0 ? ', Level ' + i.l0 + ' → ' + i.l1 : '') + (i.deep ? '; Level ' + i.l0 + ' know-how was tuned to the old way, so it lost more and dropped a level' : '') + ')').join('\n\n') +
      '\n\nWhat people are saying:\n' + talk.map(q => '“' + q[0] + '” — ' + q[1]).join('\n') + '\n\n' + take;
    C.inbox(S, L.title, text, 'know');
    (S.launchQueue = S.launchQueue || []).push(L);
    return L;
  }
  // pick n entries from a list, avoiding the ones used last year and areas already hit this offseason
  function techPick(S, list, n, key) {
    const rng = G.R, seen = (S.techSeen = S.techSeen || {}), lastIds = seen[key] || [], hit = seen.areas || [];
    let pool = rng.shuffle(list.filter(x => !lastIds.includes(x.id) && !hit.includes(x.area)));
    if (pool.length < n) pool = pool.concat(rng.shuffle(list.filter(x => !pool.includes(x) && !hit.includes(x.area))));
    const out = []; pool.forEach(x => { if (out.length < n && !out.some(y => y.area === x.area)) out.push(x); });
    seen[key] = out.map(x => x.id); seen.areas = hit.concat(out.map(x => x.area));
    return out;
  }
  // Start of each offseason (after a season was played): next season's rule and vendor changes
  C.techRules = function (S) {
    if (S.mode !== 'career' || !S.history.length) return null;
    (S.techSeen = S.techSeen || {}).areas = [];
    S.designMonth = G.R.pick([2, 3, 4]); // new designs spread in July, August or September
    return techNews(S, 'rules', techPick(S, D.TECH_RULES, D.TECH_RULES_N, 'rules'), D.TECH_RULE_PCT);
  };
  C.techDesigns = function (S) {
    if (S.mode !== 'career' || !S.history.length) return null;
    S.designMonth = null;
    return techNews(S, 'designs', techPick(S, D.TECH_DESIGNS, D.TECH_DESIGNS_N, 'designs'), D.TECH_DESIGN_PCT);
  };

  // ======================= the pandemic: the 2021 season is never played =======================
  C.pandemicDue = S => !!(S && S.cal && S.mode === 'career' && C.cy(S) === 2020 && S.upcoming < S.cal.length && !S.lostYear);
  // right after the 2020 season review: the world shuts down and the calendar jumps to June 2021
  C.startPandemic = function (S) {
    S.lostYear = { cy: 2021, stage: 'choose', picks: [] };
    S.month = 1; S.offYear = 2021;                         // June 2021
    C.setPxYear(S, 2021);
    C.tellStory(S, D.STORY_PANDEMIC);
    (S.launchQueue = S.launchQueue || []).push({ kind: 'pandemic' });
  };
  C.pandemicPrograms = S => D.PANDEMIC.programs.map(p => Object.assign({}, p, { ok: !p.need || G.Shop.lvl(S, p.need) >= 1 }));
  // the two programs are chosen: fifteen months pass
  C.pandemicChoose = function (S, picks) {
    const L = S.lostYear, PD = D.PANDEMIC, rng = G.R;
    if (!L || L.stage !== 'choose') return 'Nothing to choose';
    const ok = C.pandemicPrograms(S).filter(p => p.ok).map(p => p.id);
    picks = (picks || []).filter((p, i, a) => ok.includes(p) && a.indexOf(p) === i).slice(0, PD.picks);
    if (picks.length < Math.min(PD.picks, ok.length)) return 'Choose ' + PD.picks + ' programs';
    const has = id => picks.includes(id), out = [];
    // know-how
    const kk = PD.know * (has('remote') ? 0.5 : 1);
    D.AREAS.forEach(a => { S.know[a.id] = Math.round((S.know[a.id] || 0) * (1 - kk)); });
    out.push('Know-how: −' + Math.round(kk * 100) + '% in every area' + (has('remote') ? ' (remote training halved the loss)' : '') + '.');
    // two graduations and a small intake in between
    const n0 = S.students.length, c0 = S.studentsCount;
    S.students = S.students.filter(s => s.grade < 12); S.studentsCount = Math.max(8, S.studentsCount - Math.round(S.studentsCount * 0.22));
    S.students.forEach(s => s.grade++);
    { const n = Math.max(1, Math.round((4 + S.rep / 10) * 0.5)); S.studentsCount += n; for (let i = 0; i < Math.min(2, 12 - S.students.length); i++) S.students.push(D.makeStudent(rng, 9, S.rep / 10 - 8)); }
    S.students = S.students.filter(s => s.grade < 12); S.studentsCount = Math.max(8, S.studentsCount - Math.round(S.studentsCount * 0.22));
    const sk = PD.skill * (has('skills') ? 0.5 : 1);
    S.students.forEach(s => Object.keys(s.attr).forEach(a => { s.attr[a] = Math.max(10, Math.round(s.attr[a] * (1 - sk))); }));
    if (S.robot && S.robot.fam && !has('skills')) Object.keys(S.robot.fam).forEach(k => { const f = S.robot.fam[k]; if (typeof f === 'number') S.robot.fam[k] = f * 0.5; else if (f && typeof f === 'object') Object.keys(f).forEach(j => { if (typeof f[j] === 'number') f[j] *= 0.5; }); });
    autoDriveTeamIfMissing(S);
    out.push('Students: the classes of 2020 and 2021 have both graduated. ' + S.students.length + ' of your ' + n0 + ' core students remain (' + S.studentsCount + ' on the team, down from ' + c0 + '), and they have lost ' + Math.round(sk * 100) + '% of their skills' + (has('skills') ? ' (the skills challenge halved it)' : '') + '.');
    // mentors
    { const gone = S.mentors.filter(m => rng.chance(PD.mentor) && !m.wffa && !m.wfa); if (gone.length >= S.mentors.length) gone.pop(); // Woodie Flowers honourees stay
      S.mentors = S.mentors.filter(m => !gone.includes(m));
      out.push(gone.length ? 'Mentors who moved on: ' + gone.map(m => m.name).join(', ') + '.' : 'Every mentor is still here.'); }
    // sponsors
    { const gone = has('sponsors') ? [] : S.sponsors.filter(() => rng.chance(PD.sponsor));
      S.sponsors = S.sponsors.filter(sp => !gone.includes(sp));
      S.sponsors.forEach(sp => { sp.sat = Math.round(sp.sat + (50 - sp.sat) * 0.6 + (has('community') ? 10 : 0)); });
      let paid = 0; if (has('sponsors')) S.sponsors.forEach(sp => { paid += Math.round(sp.base * 0.5); });
      if (paid) C.earn(S, paid, 'Sponsors: half payment for the lost season');
      out.push(has('sponsors') ? 'Sponsors: all of them stayed and paid half for the lost season (' + U.money(paid) + ').' : gone.length ? 'Sponsors lost: ' + gone.map(sp => sp.name).join(', ') + '. Nobody paid for a season that was not played.' : 'Sponsors: all of them stayed, but nobody paid for a season that was not played.'); }
    // school, reputation, shop
    S.support = U.clamp(S.support - PD.support, 0, 100); S.rep = Math.max(0, Math.round(S.rep * (1 - PD.rep) * 10) / 10);
    if (has('community')) { C.addRep(S, 8); S.season.outreach = (S.season.outreach || 0) + 6; out.push('The face shields were noticed: reputation and sponsor satisfaction are up, and it counts as outreach for next season.'); }
    { const up = Math.round(G.Shop.upkeep(S) * 0.5); if (up > 0) C.spend(S, up, 'Shop upkeep through the lost year'); }
    D.EQUIP.forEach(e => { const f = S.shop && S.shop[e.id]; if (f && f.lvl) f.cond = Math.max(20, f.cond - PD.cond); });
    (S.parts.batts || []).forEach(b => { b.h = Math.max(0.3, b.h * (1 - PD.batt)); });
    S.fatigue = D.FATIGUE_BASE; S.morale = U.clamp(Math.round((S.morale + 55) / 2), 0, 100);
    out.push('Program Support −' + PD.support + ', reputation −' + Math.round(PD.rep * 100) + '%. Facilities lost ' + PD.cond + ' condition and the batteries ' + Math.round(PD.batt * 100) + '% of their health.');
    // the rest of the world: a fifth of the teams fold, the others are rusty too
    { const all = Object.values(S.teams), nFold = Math.round(all.length * PD.fold), pool = all.map(t => ({ t, w: 1.7 - t.str / 100 }));
      for (let i = 0; i < nFold && pool.length; i++) { const x = rng.wpick(pool, p => p.w); delete S.teams[x.t.num]; pool.splice(pool.indexOf(x), 1); }
      Object.values(S.teams).forEach(t => { t.str = Math.max(5, t.str - rng.int(2, 7)); t.rb = null; });
      L.folded = nFold; L.teams = all.length;
      out.push(nFold + ' of the ' + all.length + ' teams you used to meet have folded, and the ones that remain are as rusty as you are.'); }
    L.stage = 'done'; L.picks = picks; L.summary = out;
    // the offseason of 2021 begins
    const s = Object.assign({}, D.STORY_RETURN, { means: out });
    C.tellStory(S, s);
    C.inbox(S, 'Offseason 2021', 'Research, recruit, find sponsors and take the 2020 robot to an offseason event or two (Calendar): everyone needs the practice. Rule changes and new designs arrive as usual. The next game is revealed at Kickoff in January 2022.', 'info');
    G.Parts.rollStock(S); G.Parts.teaser(S); C.techRules(S);
    return null;
  };

  // ======================= a grant from the education office (3.5.1) =======================
  // In the offseason, in about six seasons of ten (D.EDU_GRANT), the office that runs the schools around the team
  // and a company of the team's city (never a local business) give every team of the area a small grant. The email
  // takes a reply, Apply, and lapses like any other reply when Continue is pressed: it is in the Inbox and nowhere
  // else (no pop-up, no priority mark). Its dice are its own: the game's random numbers are not touched.
  C.eduGrantMonth = function (S) {
    const EG = D.EDU_GRANT; if (!EG || S.mode !== 'career' || S.phase !== 'off' || !G.News || !G.News.replyExtra) return;
    const key = S.upcoming + ':' + (S.offYear || 0);
    if (!S.eduGrant || S.eduGrant.key !== key) { const r0 = G.makeRng(hashS('edu:' + S.team.num + ':' + S.team.name + ':' + key) || 5); S.eduGrant = { key, month: r0.chance(EG.chance) ? r0.int(EG.months[0], EG.months[1]) : -1 }; }
    const E = S.eduGrant; if (E.sent || E.month !== S.month) return;
    E.sent = 1;
    const r = G.makeRng(hashS('edu2:' + S.team.num + ':' + key) || 7), city = myCity(), hb = city && G.Geo.hub(city), area = hb && D.US_REGIONS.includes(hb.r) ? 'US' : S.team.region;
    const body = (D.EDU_BODY[area] || D.EDU_BODY[S.team.region] || D.EDU_BODY.US).replace('{city}', city || S.team.region);
    const kind = r.pick(['tech', 'eng', 'mfg', 'soft']), co = (city && D.sponsorDraw && D.sponsorDraw(r, D.sponsorRings(kind, city), true)) || r.pick(D.sponsorPool(kind, S.team.home, S.team.region));
    const amt = Math.round(r.range(EG.amt[0], EG.amt[1]) / 250) * 250, desc = D.sponsorDesc(co).replace(/\.$/, ''), who = D.personName(r);
    C.letter(S, who + ' (' + body + ')', 'A grant for our school robotics teams, with ' + co,
      'Good news in an official envelope, for once. This year the ' + body + ' and ' + co + ' have set up a small fund for the school robotics teams of ' + (city || 'our area') + ': ' + U.money(amt) + ' for each team, to spend on tools, parts or travel as you see fit.\n\n' +
      (desc ? co + ' ' + lcFirst(desc) + '. ' : '') + 'They asked for nothing in return but a photograph of the robot for their notice board.\n\nThere is no competition and no report to write: every team that applies receives the grant. Please send the form back before the month is out.',
      'With best wishes for the season,\n' + who + '\nSchools Programme Officer, ' + body,
      Object.assign(G.News.replyExtra(S, 'edugrant', { data: { amt, from: body } }, 0), { note: 'Reply "Apply" this month and the team receives ' + U.money(amt) + '. Like any reply, it lapses when you press Continue.' }), 'money');
  };

  // ======================= the school board comes to watch (3.5.1) =======================
  // Once a season the assistant at the school asks whether the board may watch an event. With one event it asks
  // before that one; with two, before the first, and before the second if you said no; with three or more, before
  // the nearer of the first two, then before the nearer of the next two. Two emails at most, one visit at most. The
  // board comes with an expectation (the program goals and how strong the team is); what it sees moves Program Support.
  C.boardEvents = S => S.regionals.filter(r => S.registered.includes(r.id)).sort((a, b) => a.week - b.week);
  // how far an event is: by the way the team travels there, then by miles
  C.tripRank = function (S, r) {
    const mode = C.travelMode(S, Object.assign({ kind: 'regional' }, r)), tier = { local: 0, drive: 1, trailer: 2, fly: 2, intl: 3 }[mode] || 0;
    let mi = 0; try { if (G.World.on(S) && S.wseason) { const e = S.wseason.events.find(x => x.id === r.id); if (e) mi = G.Geo.miles(G.Geo.myPos(S), G.Geo.eventPos(S.wseason, e).xy); } } catch (x) { mi = 0; }
    return tier * 100000 + mi;
  };
  // the event the next invitation is for (null: no more invitations this season)
  C.boardTarget = function (S) {
    const B = (S.season && S.season.board) || {}, asked = B.asked || [], list = C.boardEvents(S);
    if (!list.length || B.visit || asked.length >= 2) return null;
    let cand;
    if (!asked.length) cand = list.length >= 3 ? list.slice(0, 2) : list.slice(0, 1);
    else { const j = list.findIndex(r => r.id === asked[asked.length - 1]); cand = j < 0 ? list.slice(0, 2) : list.slice(j + 1, j + 3); }
    cand = cand.filter(r => !S.eventsDone[r.id] && !asked.includes(r.id) && !(S.phase === 'comp' && r.week < S.week));
    return cand.length ? cand.slice().sort((a, b) => C.tripRank(S, a) - C.tripRank(S, b) || a.week - b.week)[0] : null;
  };
  // What the board expects to see: 1 a team that holds its own, 2 the playoffs, 3 a deep playoff run. Half from the
  // program goals, half from how the team has been doing (this season's events, else last season's, else its profile).
  C.boardExpect = function (S) {
    const ids = ((S.season && S.season.goals) || []).map(g => g.id), gl = ids.some(i => ['winEvent', 'divPlayoffs', 'einstein'].includes(i)) ? 3 : ids.some(i => ['playoffs1', 'playoffs2', 'dcmp', 'dTop10', 'champs'].includes(i)) ? 2 : 1;
    const evs = S.season.events.filter(e => e.kind === 'regional' && e.size), last = S.history[S.history.length - 1], old = last ? (last.events || []).filter(e => e.size && e.rank) : [];
    const pc = l => U.avg(l.map(e => e.rank / e.size)), form = evs.length ? pc(evs) : old.length ? pc(old) : { rookie: 0.65, established: 0.45, powerhouse: 0.25 }[S.profile] || 0.5;
    const sl = form <= 0.2 ? 3 : form <= 0.45 ? 2 : 1, level = U.clamp(Math.round((gl + sl) / 2 + 0.01), 1, 3);
    return { level, form, text: ['', 'a robot that plays every match and finishes in the top two thirds', 'the team in the playoffs', 'the team deep in the playoffs: a semifinal at least'][level] };
  };
  // what the board saw: 2 delighted, 1 satisfied, -1 disappointed, -2 badly disappointed
  C.boardVerdict = function (level, r) {
    const deep = ['Winner', 'Finalist', 'Semifinalist', '3rd place', '4th place'].includes(r.finish), aw = (r.awards || []).length > 0, top = r.size ? r.rank / r.size : 1;
    const got = r.won ? 4 : deep ? 3 : r.playoffs ? 2 : top <= 0.667 || aw ? 1 : 0, need = level;
    return got >= need + 1 || r.won ? 2 : got >= need || (aw && got >= need - 1) ? 1 : got >= need - 1 ? -1 : -2;
  };
  const assistant = S => D.personName(G.makeRng(hashS('assistant:' + S.team.num + ':' + S.team.name) || 3));
  const assistantFrom = S => assistant(S) + ' (assistant to the principal' + atSchool(S) + ')';
  // each competition week: is this the event to ask about?
  C.boardInvite = function (S) {
    if (S.mode !== 'career' || S.phase !== 'comp' || !G.News || !G.News.replyExtra) return;
    const e = C.eventThisTurn(S); if (!e || !e.def || e.def.kind !== 'regional') return;
    const B = S.season.board = S.season.board || { asked: [] }, t = C.boardTarget(S);
    if (!t || t.id !== e.def.id) return;
    B.asked.push(t.id);
    const X = C.boardExpect(S), again = C.boardTarget(S), n = 2 + (hashS('bn:' + S.year + S.team.num) % 3); // again: the event a second invitation would be for
    C.letter(S, assistantFrom(S), 'The board would like to watch the team at the ' + t.name,
      'The school board has asked whether it may come and watch the robotics team this week, at the ' + t.name + '. ' + ['Two', 'Three', 'Four'][n - 2] + ' members would make the trip, and the principal would come with them.\n\n' +
      'They have the program goals for the year in front of them, and they have followed the results. In plain words, they expect to see ' + X.text + '. A good weekend in front of the board does the program a great deal of good; a poor one they will have seen as well.\n\n' +
      'Shall I send the invitation? ' + (again ? 'If this is not the right event, say so and I will ask once more, before the ' + again.name + '.' : B.asked.length > 1 ? 'I will not trouble you with this again this season.' : 'It is your only event on my list, so I will not ask again this season.'),
      'Kind regards,\n' + assistant(S) + '\nAssistant to the principal',
      Object.assign(G.News.replyExtra(S, 'boardInvite', { data: { ev: t.id, name: t.name, level: X.level } }, 0), { note: 'Invite the board before you leave for the event. If it sees what it expects, Program Support rises; if not, it falls. Saying no costs nothing.', prio: true }), 'goal');
    (S.launchQueue = S.launchQueue || []).push({ kind: 'mail', id: S.inbox[0].id });
  };
  C.boardReply = function (S, d, yes) {
    const B = S.season.board = S.season.board || { asked: [] };
    if (yes) { B.visit = d.ev; B.level = d.level || C.boardExpect(S).level; return 'The invitation went out the same afternoon. The board will be in the stands at the ' + d.name + '.'; }
    const n = C.boardTarget(S);
    return n ? 'Understood. The assistant will ask once more, before the ' + n.name + '.' : 'Understood. The board will not be asked again this season.';
  };
  // after the event the board watched: its verdict, Program Support, and the assistant's second email
  C.boardOutcome = function (S, ev) {
    const B = S.season && S.season.board; if (!B || B.visit !== ev.id || B.done || !ev.result) return;
    B.done = 1;
    const r = ev.result, v = C.boardVerdict(B.level || 2, r), E = D.BOARD_VISIT || { delighted: 6, satisfied: 4, let: -4, bad: -6 }, d = v === 2 ? E.delighted : v === 1 ? E.satisfied : v === -1 ? E.let : E.bad;
    S.support = U.clamp(S.support + d, 0, 100); B.verdict = v; B.delta = d;
    const what = r.won ? 'the team won the event' : r.playoffs ? 'the team reached the playoffs (' + String(r.finish).toLowerCase() + ')' : 'the team finished ' + U.ord(r.rank) + ' of ' + r.size + ' and missed the playoffs', aw = (r.awardNames || []).length ? ' and came home with ' + listAnd(r.awardNames.map(a => 'the ' + a)) : '';
    const say = v === 2 ? 'I have not seen the board in such a mood since the new library opened. ' + ['One of them asked where to buy a team shirt.', 'They talked about it for the whole drive back.', 'The chair has asked for the robot at the next public meeting.'][hashS(ev.id) % 3]
      : v === 1 ? 'The board saw what it came to see: ' + what + aw + '. They were pleased, and they said so in the car and again on Monday.'
      : v === -1 ? 'The board came hoping for a little more than it saw: ' + what + aw + '. Nobody was unkind about it, but the questions on Monday were about money.'
      : 'I will be plain: it was not the weekend to have the board in the stands. They saw that ' + what + ', and the drive home was quiet.';
    C.letter(S, assistantFrom(S), 'After the ' + ev.name + ': what the board thought',
      'Thank you for having the board at the ' + ev.name + '.\n\n' + (v === 2 ? 'They saw that ' + what + aw + '. ' : '') + say + '\n\n' + (d > 0 ? 'It will help when the budget is discussed.' : 'It can be mended: results at the next event will reach them too, and the season review counts for more than one weekend.'),
      'Kind regards,\n' + assistant(S) + '\nAssistant to the principal', { note: 'Program Support ' + (d > 0 ? '+' : '') + d + ' (now ' + Math.round(S.support) + ').' }, 'goal');
  };

  // ======================= a new district forms =======================
  // July: a district that forms next season is announced. A regional team in its area chooses whether to join; everybody
  // else reads the story.
  C.districtNews = function (S) {
    if (!G.World.on(S) || S.mode !== 'career') return;
    const cy = C.cyNext(S); if (!cy) return;
    S.storySeen = S.storySeen || {};
    D.DISTRICTS.filter(d => d.from === cy && !S.storySeen['dist_' + d.id]).forEach(d => {
      const I = G.World.formInfo(S, d, cy);
      if (!S.team.home && S.team.region === d.region && G.World.wholeArea(d)) {
        // (3.4.4) the district takes in the whole area: nothing to choose, the team is in it from next season
        S.storySeen['dist_' + d.id] = 1; S.team.homeNext = d.id; S.districtOffer = { id: d.id, cy, stage: 'done', join: true, auto: true };
        C.tellStory(S, { id: 'dist_' + d.id, at: 'off:2', tag: 'DISTRICT NEWS', color: d.color, title: I.title, body: I.body, talk: D.DISTRICT_TALK,
          means: ['Your team is in it: from ' + cy + ' you play district events, not regionals.', 'One fee covers two district events; registration opens in October (Calendar).', 'The points list decides who plays the District Championship in week 7 and who goes on to the Championship: about ' + I.slots + ' of the district\'s ' + I.n + ' teams.'] });
        C.inbox(S, 'You join the ' + d.name, 'From the ' + cy + ' season every team of ' + D.regionThe(d.region) + ' plays in the ' + d.name + ', yours included. Registration opens in October (Calendar): one fee covers two district events. The points list decides who plays the District Championship in week 7 and who goes on to the Championship.', 'event');
      } else if (!S.team.home && S.team.region === d.region && G.World.inside(S, d, C.cy(S))) { // (3.5) a team that stands in the district's cities
        S.storySeen['dist_' + d.id] = 1;
        S.districtOffer = { id: d.id, cy, stage: 'choose' };
        C.inbox(S, I.title, I.body.join('\n\n') + '\n\nYour school is inside the new district\'s borders. Decide whether to join it or stay a regional team (Headquarters).', 'event');
        (S.launchQueue = S.launchQueue || []).push({ kind: 'district' });
      } else C.tellStory(S, { id: 'dist_' + d.id, at: 'off:2', tag: 'DISTRICT NEWS', color: d.color, title: I.title, body: I.body, talk: D.DISTRICT_TALK,
        means: S.team.home || S.team.region !== d.region ? [S.team.home ? 'Your own district is not affected.' : 'You are not in its area: your team stays with the regionals.', 'The ' + d.region + ' runs fewer regionals from ' + cy + ', so teams from there will turn up at events elsewhere.', 'More Championship places are now decided by district points.']
          : ['Your school is outside its borders: your team stays with the regionals.', 'The ' + d.region + ' runs fewer regionals from ' + cy + ': look at the neighbouring areas too when registration opens in October.', 'More Championship places are now decided by district points.'] });
    });
  };
  // join the new district (from the season it forms) or stay a regional team
  C.districtChoose = function (S, join) {
    const O = S.districtOffer;
    if (!O || O.stage !== 'choose') return 'Nothing to choose';
    const d = D.DISTRICT[O.id];
    O.stage = 'done'; O.join = !!join;
    if (join) S.team.homeNext = d.id;
    C.inbox(S, join ? 'You join the ' + d.name : 'You stay a regional team', join
      ? 'From the ' + O.cy + ' season your team plays in the ' + d.name + '. Registration opens in October (Calendar): one fee covers two district events. The points list decides who plays the District Championship in week 7 and who goes on to the Championship. From then on the World page shows the district standings.'
      : 'The ' + d.name + ' forms without you. Your team keeps playing regionals, but the ' + d.region + ' will run fewer of them from ' + O.cy + ': look at the neighbouring areas when registration opens in October.', 'event');
    return null;
  };

  // ======================= stories: the calendar's big changes, told in pop-ups =======================
  // when: 'off:N' (month N of the offseason; the story belongs to the coming season) or 'recap' (the season just played)
  C.fireStories = function (S, when) {
    if (!S.cal || S.mode !== 'career') return;
    const cy = when === 'recap' ? C.cy(S) : C.cyNext(S);
    if (!cy) return;
    S.storySeen = S.storySeen || {};
    // the Festival livestream opens in July for teams that are not in it; a month later it has been played without them
    if (when === 'off:2') C.festStreamOpen(S);
    else if (/^off:/.test(when) && S.festStream && S.festStream.stage === 'open') C.festStreamClose(S, true);
    D.STORIES.filter(s => s.cy === cy && s.at === when && !S.storySeen[s.id] && !(s.skipIf && S[s.skipIf]) && !(s.hold && s.hold(S))).forEach(s => C.tellStory(S, s));
  };
  // one line on the season just finished, for the recap pop-up
  C.seasonLine = function (S) {
    const hs = S.history[S.history.length - 1];
    if (!hs) return '';
    const evs = (hs.events || []).filter(e => e.kind === 'regional' || e.kind === 'district' || e.kind === 'dcmp'), rankOf = f => ['Winner', 'Finalist', '3rd place', 'Semifinalist', '4th place', 'Lower R2', 'Lower R1', 'Quarterfinalist'].indexOf(f);
    const best = evs.filter(e => e.playoffs).sort((a, b) => rankOf(a.finish) - rankOf(b.finish))[0];
    return (evs.length ? evs.length + ' event' + (evs.length === 1 ? '' : 's') + (best ? ', best result: ' + best.finish.toLowerCase() + ' at the ' + best.name : ', no playoff appearance') : 'No events played') +
      (hs.worldChamp ? '. World Champions.' : hs.worldFinalist ? '. World finalists.' : hs.divWin ? '. Division winners at the Championship.' : hs.champs ? '. Qualified for the Championship.' : '.') +
      (hs.awards && hs.awards.length ? ' ' + hs.awards.length + ' award' + (hs.awards.length === 1 ? '' : 's') + '.' : '') +
      (C.refLine(S, hs) ? ' ' + C.refLine(S, hs) : '');
  };
  // published designs in the recap: what your robot started from, and how many copies played at your events
  // (r.refs, counted when each event ends: { any, bp, n })
  C.refCount = function (S, nums) {
    const o = { any: 0, bp: 0, n: 0 };
    (nums || []).forEach(n => { const t = S.teams[n]; if (!t || n === S.team.num) return; o.n++; if (t.rb && t.rb.year === S.year && t.rb.ref) o[t.rb.ref]++; });
    return o;
  };
  C.refLine = function (S, hs) {
    if (!hs || !hs.cy || hs.cy < 2018) return '';
    const out = [], name = id => (D.REFBOTS.find(r => r.id === id) || {}).name || id, cp = hs.copied || {};
    const by = {}; G.Seasons[hs.year].subs.map(sd => sd.id).filter(k => cp[k]).forEach(k => { (by[cp[k]] = by[cp[k]] || []).push(G.Seasons.sub(hs.year, k).name.toLowerCase()); });
    const ids = Object.keys(by), and = l => (l.length > 1 ? l.slice(0, -1).join(', ') + ' and ' + l[l.length - 1] : l[0] || '');
    if (ids.length) out.push('Your robot started from ' + and(ids.map(id => { const all = Object.keys((D.REFBOTS.find(r => r.id === id) || { picks: {} }).picks[hs.year] || {}).length; return 'the ' + name(id) + (by[id].length >= all ? '' : ' (' + and(by[id]) + ')'); })) + '.');
    const ev = (hs.events || []).filter(e => e.refs && e.refs.n), n = U.sum(ev.map(e => e.refs.n)), a = U.sum(ev.map(e => e.refs.any)), b = U.sum(ev.map(e => e.refs.bp));
    if (n && (a || b)) out.push('Of the ' + n + ' other robots at your events, ' + C.refPhrase(a, b) + '.');
    return out.join(' ');
  };
  // "9 were Anybots and 4 Apex Blueprints", "1 was an Apex Blueprint"
  C.refPhrase = (a, b) => [a ? a + (a === 1 ? ' was an Anybot' : ' were Anybots') : '', b ? b + (b === 1 ? (a ? ' an' : ' was an') + ' Apex Blueprint' : (a ? '' : ' were') + ' Apex Blueprints') : ''].filter(Boolean).join(' and ');
  C.tellStory = function (S, s) {
    const rng = G.R; (S.storySeen = S.storySeen || {})[s.id] = 1;
    const v = (s.vary && s.vary(S)) || {}; // a story may read differently for a team that was part of it
    const L = { kind: 'story', id: s.id, tag: s.tag, color: s.color, title: s.title, body: (v.body || s.body).slice(), means: (v.means || s.means || []).slice(), btn: s.btn || null, month: /^off:/.test(s.at || '') ? D.MONTHS[S.month] : '',
      talk: rng.shuffle((s.talk || []).slice()).slice(0, 3).map(q => [q[0], q[1].replace('{t}', techTeam(S, rng))]) };
    if (s.hit) L.hit = C.techHit(S, s.hit.area, s.hit.pct);
    if (s.at === 'recap') L.mine = C.seasonLine(S);
    if (v.mine) { L.mine = v.mine; L.mineTag = v.mineTag || null; }
    if (v.series) { L.series = v.series; L.mineTag = v.mineTag || null; } // a result shown as a block of its own (the Festival), in the pop-up and in the Inbox
    const text = L.body.join('\n\n') + (L.mine ? '\n\n' + (L.mineTag ? L.mineTag.charAt(0) + L.mineTag.slice(1).toLowerCase() : 'Your season') + ': ' + L.mine : '') + (L.means.length ? '\n\nWhat it means for you:\n' + L.means.map(x => '• ' + x).join('\n') : '') +
      (L.hit ? '\n→ ' + L.hit.name + ': −' + L.hit.pct + '% know-how (' + L.hit.xp0 + ' → ' + L.hit.xp1 + ' XP' + (L.hit.l1 < L.hit.l0 ? ', Level ' + L.hit.l0 + ' → ' + L.hit.l1 : '') + (L.hit.deep ? '; Level ' + L.hit.l0 + ' know-how was tuned to the old way, so it lost more and dropped a level' : '') + ')' : '') +
      (L.talk.length ? '\n\nWhat people are saying:\n' + L.talk.map(q => '“' + q[0] + '” — ' + q[1]).join('\n') : '');
    C.inbox(S, s.title, text, s.hit ? 'know' : 'info', v.series ? { series: v.series, seriesTag: v.mineTag || null } : null);
    (S.launchQueue = S.launchQueue || []).push(L);
    return L;
  };
  // The state of the art when a career starts: one inbox letter (and the welcome window) instead of the pop-ups it missed
  C.eraBrief = function (S) {
    if (!S.cal) return null;
    const cy = S.cal[0], era = G.Era.at(cy), prem = cy <= G.Era.STERLING_LAST ? 'Sterling Motion' : 'Apex Motion', lines = [];
    lines.push(cy < 2019 ? 'Motors: every motor has brushes. ' + prem + ' is the premium catalogue, Lumen Robotics the cheaper one.' : cy === 2019 ? 'Motors: Lumen has just launched the first brushless motor, the Ion. Sterling Motion, the premium catalogue, still sells brushed ones.' : 'Motors: brushless. ' + prem + ' is the premium vendor, Lumen Robotics the value one.');
    lines.push(era.swerve.cots ? 'Swerve: modules are sold in the Inventory' + (cy < 2022 ? ' (Apex only, for now).' : '.') : 'Swerve: nobody sells modules. A swerve drive means machining your own (CNC Machining or a Manual Machine Shop, ' + (era.swerve.hours >= 2 ? 'twice' : 'one and a half times') + ' the build hours, and it is fragile).');
    lines.push(!era.vision.cam ? 'Vision: home-made. No camera is sold; Vision Level 1 takes twice the hours and Level 2 is out of reach.' : era.vision.tags ? 'Vision: Lanternworks sells the Lantern 2 camera, a network switch and the Spark ML accelerator, and the field has AprilTags, so vision also helps autonomous.' : 'Vision: Lanternworks sells the Lantern 1 camera and a network switch; the camera tracks reflective tape (auto-aim), not yet the robot\'s position.');
    if (cy >= 2017) lines.push('Gearboxes: both vendors sell planetary gearboxes for mechanism motors (optional, fewer breakdowns), and a low-profile one comes in every Kit of Parts.');
    lines.push('Pneumatics: a kit saves ' + Math.round(era.pneu * 100) + '% of the hours on intake, manipulator, end effector, climber and adjustable-hood shooter builds' + (era.servo ? '; a servo actuator kit saves ' + Math.round(era.servo * 100) + '% (the better of the two counts).' : '.'));
    if (cy >= 2018) lines.push('Pits: the top teams roll in a Super pit in road cases (the top level of Pit Setup): a full repair of one subsystem before every match.');
    if (cy >= 2018) lines.push('Published designs: at the start of Build Week 2 the Gearwrights publish the Anybot, a simple robot for the year\'s game' + (cy >= 2022 ? ', and Apex Motion the Apex Blueprint, a competitive one on swerve (its drivetrain needs 4 swerve modules from the Inventory)' : '') + '. Copy one in the Design Office: the first build is cheaper, and the drivers practise on its simulator model while it is built. Until it is out, design your own or wait for it.');
    if (cy >= 2023) lines.push('CAN bus: modern motors and encoders talk so much that a robot with more than 14 of them needs a CAN FD hub (Inventory), or it freezes now and then in matches.');
    if (cy >= 2025) lines.push('Code: AI coding assistants write much of the robot code now, with every line reviewed by a person (the AI coding lab, the top level of the Programming Station: two Finish now cards a season).');
    lines.push(G.Era.playoffs(cy) === 'se' ? 'Playoffs: single elimination, every series best of three' + (cy <= 2022 ? ' (double elimination arrives in 2023).' : '.') : 'Playoffs: double elimination, finals best of three.');
    if (era.bag) lines.push('Stop Build Day: after the build season the competition robot goes in a bag and may only be touched at events. Teams that can afford it build a second robot.');
    lines.push('Money: shown in ' + cy + ' dollars. Prices and budgets rise a little every year.');
    return { title: 'FRC in ' + cy, lines };
  };

  // The Championship of this season: how many, where, which divisions, how Einstein is played (old saves: today's)
  C.champs = function (S) {
    const info = G.Era.champs(G.Era.cy(S)), side = info.n > 1 ? G.Era.champsSide(S.team.region) : 0;
    return Object.assign({}, info, { side, city: info.cities[side], div: info.names[side], label: info.n > 1 ? info.cities[side] + ' Championship' : 'Championship' });
  };
  // through 2024 regional teams have no pool: finalists can get in on a wildcard
  C.wildEra = S => !!(S && S.cal) && G.Era.wildcards(G.Era.cy(S));
  // Did a wildcard reach the player, a finalist at this regional? With the simulated world the count is exact (the
  // event is already in the world's books); without it, the number of wildcards is drawn: few in week 1, about three by week 6.
  C.wildcard = function (S, ev) {
    const me = S.team.num;
    if (G.World.on(S)) { const e = S.wseason.events.find(x => x.id === ev.id); return !!(e && e.res && (e.res.wild || []).includes(me)); }
    const al = ev.alliances[G.Ev.playerAlliance(ev)] || [], pos = Math.max(0, Math.min(2, al.indexOf(me))), lam = 0.35 + 0.45 * ((ev.week || 1) - 1);
    let cards = 0, p = Math.exp(-lam), c = p; const u = G.R.next();
    while (u > c && cards < 6) { cards++; p *= lam / cards; c += p; }
    return cards > pos;
  };
  C.poolThreshold = S => ({ easy: 75, normal: 85, hard: 95 }[S.diff] || 85) - (C.champs(S).n > 1 ? G.Era.POOL_TWO : 0);
  C.poolTotal = S => { const p = S.season.events.filter(e => e.kind === 'regional').map(e => e.pool).sort((a, b) => b - a); return (p[0] || 0) + (p[1] || 0); };
  function poolCheck(S) {
    if (S.season.champsQualified) return;
    const tot = C.poolTotal(S);
    if (tot >= C.poolThreshold(S)) { S.season.champsQualified = true; S.season.champsReason = 'Regional Pool wildcard (' + tot + ' pts)'; C.inbox(S, 'Championship wildcard!', 'Your Regional Pool total of ' + tot + ' points earned a Championship spot.', 'event'); C.mailChampsQualified(S, 'a place from the Regional Pool, with ' + tot + ' points'); }
    else if (S.season.events.length) C.inbox(S, 'Regional Pool', 'Your pool total was ' + tot + ' points; the wildcard cut-off was ' + C.poolThreshold(S) + '. No Championship invitation this year.', 'event');
  }
  C.toChamps = function (S) {
    if (!S.season.champsQualified && !(S.team.home && G.World.on(S)) && !C.wildEra(S)) poolCheck(S); // a district team's place comes from its district's list; before 2025 there is no pool
    if (!S.season.champsQualified && S.mode === 'career' && (S.lastChampSi != null ? S.lastChampSi === S.si - 1 : S.lastChamp === S.year - 1 && S.orderMode === 'real')) { S.season.champsQualified = true; S.season.champsReason = 'Defending champions'; }
    if (!S.season.champsQualified && S.hallOfFame != null && S.hallOfFame < S.si) { S.season.champsQualified = true; S.season.champsReason = 'Hall of Fame team'; }
    if (S.season.champsQualified) C.mailChampsQualified(S, S.season.champsReason); // (3.5.1) FIRST writes (once a season, however the place came)
    if (!S.season.champsQualified && C.wildEra(S) && !(S.team.home && G.World.on(S)) && S.season.events.length) C.inbox(S, 'No Championship invitation', 'Regional teams reach the Championship by winning a regional, with the Impact, Engineering Inspiration or Rookie All-Star award, or on a wildcard as a finalist. It did not happen this year.', 'event');
    const wf = G.World.on(S) && S.mode === 'career' ? C.rollWfa(S) : null; // the Woodie Flowers Award is decided as the Championship begins
    S.phase = 'champs';
    if (S.season.champsQualified) {
      C.inbox(S, 'Championship', 'You are qualified (' + S.season.champsReason + '). Registration ' + U.money(D.FEES.champs) + ' + flights. Attend from the HQ screen, or Continue to skip.', 'event');
    } else if (wf && wf.mine) C.wfaSeat(S); // not qualified, but its mentor won the Woodie Flowers Award: to Einstein, to watch
    else C.toReview(S);
  };
  C.registerChamps = function (S) {
    if (S.champsPaid) return null;
    { const e = C.afford(S, D.FEES.champs); if (e) return e; }
    C.spend(S, D.FEES.champs, 'Championship registration');
    S.champsPaid = S.year;
    return null;
  };

  // ======================= review =======================
  C.legacyFor = function (s) {
    let p = 0;
    s.events.forEach(e => { if (e.kind === 'regional' && e.won) p += 100; if (e.kind === 'dcmp' && e.won) p += 120; e.awards.forEach(a => p += a === 'impact' ? 120 : a === 'ei' ? 80 : 30); });
    if (s.champsQualified) p += 50;
    if (s.divWin) p += 150;
    if (s.wfa && s.wfa.res === 'wffa') p += D.WFA.legacy.wffa; if (s.wfaCmp && s.wfaCmp.mine) p += D.WFA.legacy.wfa;
    if (s.cmpImpact && s.cmpImpact.result === 'winner') p += 350; else if (s.cmpImpact && s.cmpImpact.result === 'finalist') p += 120;
    if (s.worldChamp) p += 400;
    return p;
  };
  // Blue banners: official event wins and Impact Awards (offseason events don't earn banners).
  C.eventBanners = function (e, year) {
    const out = [];
    year = C.calYear(G.S, year); // random career order: the fictional timeline
    if (e.kind === 'regional' && e.won) out.push({ award: 'Winner', year, event: e.name });
    if (e.kind === 'dcmp' && e.won) out.push({ award: 'District Champions', year, event: e.name });
    if (e.kind === 'champs' && e.won) out.push({ award: 'Division Winner', year, event: e.name.replace('Championship — ', '') + ' · FIRST Championship' });
    if (e.kind === 'einstein' && e.won) out.push({ award: 'World Champions', year, event: 'Einstein Field · FIRST Championship', gold: true, world: true, key: 'wc' });
    if ((e.awards || []).includes('impact')) out.push({ award: 'Impact Award', year, event: e.name.replace('Championship — ', '') });
    return out;
  };
  C.wfaBanner = x => (x.kind === 'wfa' ? { award: 'Woodie Flowers Award', year: x.cy, event: 'FIRST Championship', world: true, key: 'wfa' } // blue, as the real one
    : { award: 'Woodie Flowers Finalist Award', year: x.cy, event: x.event });
  C.festBanner = S => ({ award: S.festival.won ? 'Festival of Champions' : 'Festival of Champions Finalist', year: S.festival.cy, event: 'Manchester, New Hampshire', gold: !!S.festival.won, world: true, key: 'fest', motto: S.festival.won ? 'The one champion' : null });
  C.banners = function (S) {
    const out = [];
    const add = (gy, events, s, past) => {
      const n0 = out.length;
      events.forEach(e => out.push(...C.eventBanners(e, gy)));
      if (s.worldChamp) out.push(...C.eventBanners({ kind: 'einstein', won: true }, gy));
      if (past && S.festival && S.festival.cele && S.festival.gy === gy) out.push(C.festBanner(S)); // played in the July after that season
      const ci = s.cmpImpact && s.cmpImpact.result;
      if (ci) out.push({ award: ci === 'winner' ? 'FIRST Impact Award' : 'FIRST Impact Award Finalist', year: C.calYear(S, gy), event: 'FIRST Championship', gold: ci === 'winner', world: true, key: 'impact' });
      // the Woodie Flowers awards of that season (a blue banner for the team, as on The Blue Alliance)
      (S.wfaHonors || []).forEach(x => { if (x.cy === C.calYear(S, gy)) out.push(C.wfaBanner(x)); });
      for (let i = n0; i < out.length; i++) out[i].gy = gy;
    };
    S.history.forEach(h => add(h.year, h.events, h, true));
    // the season being played (after the review the season state has no year: everything is in History already, and
    // adding it again would hang that season's Woodie Flowers banners twice)
    if (S.season && S.season.year && S.season.events && !S.history.some(h => h.year === S.season.year)) add(S.season.year, S.season.events, S.season);
    return out;
  };
  // The start of Build Week 2: this season's published designs are out (the Anybot from 2018, the Apex Blueprint from
  // 2022): a message for each, and a window with both robots (once: a save from before 3.1 may have had them in Week 1)
  C.refRelease = function (S) {
    const rs = G.Robot.refs(S); if (!rs.length) return;
    const year = S.year, cy = C.cy(S);
    if (rs.every(r => (S.inbox || []).some(m => m.title === 'Published: the ' + cy + ' ' + r.name))) return;
    rs.forEach(r => {
      const picks = r.picks[year], list = Object.keys(picks).map(k => G.Seasons.sub(year, k).name + ': ' + G.Seasons.concept(year, k, picks[k]).name).join('; ');
      C.inbox(S, 'Published: the ' + cy + ' ' + r.name, (r.id === 'any' ? r.by.charAt(0).toUpperCase() + r.by.slice(1) : r.by) + ' published the ' + r.name + ' for ' + G.Seasons[year].name + ': ' + list + '. ' + r.blurb + ' It comes with build videos, practice drills and a model for the driving simulators, so your drivers can practise on it while it is being built.\n\nCopy any of it, or the whole robot, in the Design Office: the first build of each copied subsystem takes ' + Math.round((1 - r.k.hours) * 100) + '% fewer hours and starts as a version 2. Upgrades are your own work.', 'dev');
    });
    G.News.refTalk(S, 'out'); // the team's first look
    (S.launchQueue = S.launchQueue || []).push({ kind: 'refbot' });
  };
  // Trophies and plaques for the Honors Wall: finalist places, judges' awards (every award but the Impact Award, which is a
  // banner) and offseason winners and finalists. Each: { kind: 'win' | 'fin' | 'award', name, cy, event, world }
  C.trophies = function (S) {
    const out = [];
    const add = (gy, events, s) => {
      const cy = C.calYear(S, gy);
      (events || []).forEach(e => {
        const ev = String(e.name || '').replace('Championship — ', ''), champs = e.kind === 'champs';
        if (e.finish === 'Finalist' && e.kind !== 'scrimmage' && e.kind !== 'einstein') out.push({ kind: 'fin', name: champs ? 'Division Finalist' : 'Finalist', cy, event: ev + (champs ? ' · FIRST Championship' : ''), world: champs });
        (e.awards || []).forEach((id, i) => { if (id !== 'impact') out.push({ kind: 'award', name: (e.awardNames || [])[i] || id, cy, event: ev, world: champs }); });
      });
      if (s && s.worldFinalist) out.push({ kind: 'fin', name: 'Einstein Finalist', cy, event: 'Einstein Field · FIRST Championship', world: true });
    };
    S.history.forEach(h => add(h.year, h.events, h));
    if (S.season && S.season.year && S.season.events && !S.history.some(h => h.year === S.season.year)) add(S.season.year, S.season.events, S.season);
    (S.offResults || []).forEach(r => {
      const cy = C.calYear(S, r.year);
      if (r.won) out.push({ kind: 'win', name: 'Offseason Winner', cy, event: r.name });
      else if (r.finish === 'Finalist') out.push({ kind: 'fin', name: 'Offseason Finalist', cy, event: r.name });
      (r.awards || []).forEach((id, i) => out.push({ kind: 'award', name: (r.awardNames || [])[i] || id, cy, event: r.name }));
    });
    return out.sort((a, b) => b.cy - a.cy);
  };
  // The school board at the season review. More room when Program Support has reached the next tier (never taken back), and
  // gifts when support went up this season: a free full renovation, and after a strong year one upgrade of your choice.
  function boardReview(S, dSup) {
    const Sh = G.Shop, b = { space: null, reno: 0, grant: false }, t0 = S.spaceTier || 0;
    let t = t0;
    D.SPACE_TIERS.forEach((T, i) => { if (S.support >= T.sup && i > t) t = i; });
    if (t > t0) { S.spaceTier = t; b.space = { from: Sh.spaceOfTier(t0), to: Sh.spaceOfTier(t), name: D.SPACE_TIERS[t].name }; }
    if (dSup >= D.BOARD.reno) D.EQUIP.forEach(e => { const f = S.shop[e.id]; if (f && f.lvl && f.cond < 99) { f.cond = 100; f.warned = 0; b.reno++; } });
    if (dSup >= D.BOARD.grant && S.support >= D.BOARD.grantSup) {
      // nothing the grant could pay for (every facility at its top level, too dear or out of room): the board sends cash
      const canUse = D.EQUIP.some(e => { const c = Sh.upgradeCost(S, e.id); return c != null && c <= D.BOARD.cap && !Sh.spaceBlock(S, e.id) && !Sh.levelBlock(S, e.id); });
      if (canUse) { S.schoolGrant = (S.schoolGrant || 0) + 1; b.grant = true; }
      else { C.earn(S, D.BOARD.cash, 'School board grant (cash)'); b.cash = D.BOARD.cash; }
    }
    S.season.board = b;
    if (!b.space && !b.reno && !b.grant && !b.cash) return;
    C.letter(S, board(S), 'From the school board: your workshop', 'The board reviewed the robotics program at this week\'s meeting, and we are glad to share what we decided.\n\n' +
      (b.space ? '• More room: the team moves into ' + b.space.name + '. Your workshop grows from ' + b.space.from.toLocaleString('en-US') + ' to ' + b.space.to.toLocaleString('en-US') + ' sq ft.\n' : '') +
      (b.reno ? '• Maintenance: the district\'s facilities crew will bring ' + (b.reno === 1 ? 'your worn facility' : 'all ' + b.reno + ' of your worn facilities') + ' back to full condition over the summer, at no cost to the team.\n' : '') +
      (b.grant ? '• Equipment grant: the board will pay for one facility upgrade of your choice, up to ' + U.money(D.BOARD.cap) + '. Use it in the Workshop whenever you like.\n' : '') +
      (b.cash ? '• Grant: there is nothing in the workshop the board could upgrade, so it sends ' + U.money(b.cash) + ' in cash instead, for the program to spend as it sees fit.\n' : '') +
      '\nKeep it up. The students have earned it.', 'With thanks,\n' + board(S), { note: 'Program Support ' + Math.round(S.support) + ' (' + (dSup >= 0 ? '+' : '') + Math.round(dSup) + ' this season). Room is never taken back; the next step needs Program Support ' + ((Sh.nextSpace(S) || {}).sup || 'to stay this high') + '.' });
  }
  // ======================= Team disputes (3.5) =======================
  // In season the team falls out with itself once or twice (D.DISPUTE.n), in weeks drawn when the build starts and
  // moved by nothing else. A dispute is a decision that Continue waits for, like a shop incident: leave it for a small
  // sure loss, or step in and take a chance (settled at once, so the window can say how it went: S.lastOutcome).
  // A week's number in the season: build weeks 1 to 7, then competition weeks 8 to 14.
  C.disputeSlot = S => (S.phase === 'build' ? S.week : S.phase === 'comp' ? 7 + S.week : 0);
  const fillNames = (t, n) => String(t || '').replace(/\{(\w+)\}/g, (m, k) => (n && n[k] != null ? n[k] : m));
  C.disputeNames = function (S) {
    const dt = C.driveTeam(S), f = st => (st && st.name ? st.name.split(' ')[0] : null), lead = leadMentor(S), pool = G.R.shuffle(S.students.slice());
    return { driver: f(dt.driver) || 'the driver', operator: f(dt.operator) || 'the operator', coach: dt.coach ? f(dt.coach) : (S.mentors.find(m => m.role === 'coach') || { name: C.leadName(S) }).name, // a mentor coaches: the Drive Coach, else you
      tech: dt.tech ? f(dt.tech) : f(pool[3]) || 'the pit lead',
      mentor: S.mentors.length ? G.R.pick(S.mentors).name : 'a mentor', a: f(pool[0]) || 'one student', b: f(pool[1]) || 'another student', c: f(pool[2]) || 'a third student' };
  };
  C.rollDispute = function (S) {
    if (S.dispute || !S.season || !['build', 'comp'].includes(S.phase) || !D.DISPUTES) return;
    const slot = C.disputeSlot(S), r = G.R;
    if (!S.season.disputes) { // how many this season and in which weeks: with two, one in the build weeks and one in the competition weeks
      const n = r.int(D.DISPUTE.n[0], D.DISPUTE.n[1]), at = n >= 2 ? [r.int(2, 7), r.int(9, 13)] : [r.int(2, 13)];
      S.season.disputes = { at: at.filter(x => x >= slot), done: [] }; // a season already under way (an older save): the weeks still to come
    }
    const P = S.season.disputes;
    if (!P.at.includes(slot) || P.done.includes(slot)) return;
    P.done.push(slot);
    const seen = S.disputeSeen || [], all = D.DISPUTES.filter(d => !d.req || d.req(S)), fresh = all.filter(d => !seen.includes(d.id)), pool = fresh.length ? fresh : all;
    if (!pool.length) return;
    const d = r.wpick(pool, x => x.w || 1), names = C.disputeNames(S), body = fillNames(d.body, names);
    S.disputeSeen = seen.concat([d.id]).slice(-8);
    S.dispute = { id: d.id, title: d.title, body, names, opts: d.opts.map(o => ({ label: o.label, desc: o.desc, cost: o.cost || 0 })) };
    C.inbox(S, 'Team dispute: ' + d.title, body + '\n\nA decision is needed before you continue.', 'staff', { prio: true });
  };
  // what a result does to the team: every effect is applied and named (for the window and the Inbox)
  const FX_ATTR = { drive: 'driving', aware: 'awareness', comp: 'composure', mech: 'mechanism', hp: 'human player', strat: 'strategy' };
  const FX_ROLE = { driver: 'Driver', operator: 'Operator', hp: 'Human player', coach: 'Drive coach', tech: 'Technician' };
  C.applyFx = function (S, fx, why) {
    const out = [], sgn = v => (v > 0 ? '+' : '−') + Math.abs(v);
    if (!fx) return out;
    if (fx.mods) { G.Shop.addMods(S, fx.mods, why); const t = G.Shop.modsText(fx.mods); if (t) out.push(t + ' this week'); }
    if (fx.morale) { S.morale = U.clamp(S.morale + fx.morale, 0, 100); out.push('Morale ' + sgn(fx.morale)); }
    if (fx.fatigue) { S.fatigue = U.clamp((S.fatigue == null ? D.FATIGUE_BASE : S.fatigue) + fx.fatigue, 5, 100); out.push('Fatigue ' + sgn(fx.fatigue)); }
    if (fx.skill) { const dt = C.driveTeam(S); fx.skill.forEach(k => { const st = dt[k[0]]; if (!st || !st.id) return; st.attr[k[1]] = U.clamp(st.attr[k[1]] + k[2], 1, 99); out.push(FX_ROLE[k[0]] + ' ' + st.name.split(' ')[0] + ': ' + FX_ATTR[k[1]] + ' ' + sgn(k[2])); }); }
    if (fx.support) { S.support = U.clamp(S.support + fx.support, 0, 100); out.push('Program Support ' + sgn(fx.support)); }
    if (fx.rep) { C.addRep(S, fx.rep); out.push('Reputation ' + sgn(fx.rep)); }
    if (fx.sat && S.sponsors.length) { S.sponsors.forEach(sp => { sp.sat = U.clamp(sp.sat + fx.sat, 0, 100); }); out.push('Sponsor satisfaction ' + sgn(fx.sat)); }
    return out;
  };
  C.resolveDispute = function (S, idx) {
    const cur = S.dispute;
    if (!cur) return null;
    const d = D.DISPUTES.find(x => x.id === cur.id), o = d && d.opts[idx];
    if (!o) { S.dispute = null; return null; }
    const cost = o.cost || 0;
    { const e = C.afford(S, cost); if (e) return e; }
    if (cost) C.spend(S, cost, 'Team: ' + d.title);
    const bad = !!o.risk && G.R.chance(o.risk.p), res = o.risk ? (bad ? o.risk.bad : o.risk.good) : o;
    const fx = (cost ? ['Paid ' + U.money(cost)] : []).concat(C.applyFx(S, res.fx, d.title)), text = fillNames(res.text, cur.names);
    if (!fx.length) fx.push('No loss');
    S.lastOutcome = { kind: 'dispute', title: d.title, choice: o.label, text, effects: fx, bad, risk: !!o.risk };
    S.lastDispute = { id: d.id, tq: S.turnSeq || 0, bad };
    C.inbox(S, 'Decision: ' + d.title, 'You chose: ' + o.label + '. ' + text + '\n\n' + fx.join(' · ') + '.', 'staff');
    S.dispute = null;
    return null;
  };
  // Rare: a very satisfied sponsor donates equipment, one facility level of a kind that fits what they do, if the workshop has room
  C.rollDonation = function (S) {
    const Sh = G.Shop, rng = G.R, DN = D.DONATION;
    if (!S.season || S.season.donated || S.phase === 'review' || S.phase === 'end') return null;
    if (DN.wait && S.lastDonTurn != null && (S.turnSeq || 0) - S.lastDonTurn < DN.wait) return null; // (3.5) two years go by before the next one
    for (const sp of rng.shuffle(S.sponsors.slice())) {
      const w = U.clamp((sp.sat - DN.sat) / (100 - DN.sat), 0, 1); // the happier the sponsor, the likelier
      if (!w || !rng.chance(DN.chance * w)) continue;
      const cap = (DN.capType || {})[sp.type] || DN.cap[sp.slot] || 9000, opts = (DN.types[sp.type] || []).filter(id => { const c = Sh.upgradeCost(S, id); return c != null && c <= cap && !Sh.spaceBlock(S, id); });
      if (!opts.length) continue;
      const id = rng.pick(opts), it = Sh.item(id), l0 = Sh.lvl(S, id), value = Sh.upgradeCost(S, id);
      if (Sh.upgrade(S, id, { gift: true })) continue;
      S.season.donated = true; S.lastDonTurn = S.turnSeq || 0; sp.sat = Math.min(100, sp.sat + 2);
      const L = { kind: 'donation', sponsor: sp.name, type: sp.typeName, id, name: it.name, level: it.levels[l0].name, lvl: l0 + 1, value, sqft: Sh.sizeOf(id, l0 + 1) - Sh.sizeOf(id, l0), month: C.dateLabel(S),
        intro: rng.pick(DN.intro), fx: Sh.effectText(S, id, l0 + 1, 1), talk: rng.shuffle(DN.talk.slice()).slice(0, 3).map(q => [q[0], q[1].replace('{s}', sp.name).replace('{lead}', C.leadName(S) + ', lead mentor')]) };
      C.letter(S, sp.name + ' (' + sp.typeName + ')', 'Donation from ' + sp.name + ': ' + L.level, 'We are proud to sponsor your team, and we would like to do a little more: please accept a ' + L.level + ' for your workshop. Our people have seen what your students do with what they have. We think they will do even more with this.\n\nIt should arrive this week. Send us a picture when it is running.', 'With best wishes,\n' + sp.name,
        { note: it.name + ' is now level ' + L.lvl + ' (worth ' + U.money(value) + ', ' + L.sqft + ' sq ft of your workshop). ' + L.fx + '. Only a very satisfied sponsor donates (satisfaction above ' + DN.sat + '), and only when the workshop has room: about once in three or four seasons when every sponsor is delighted, far less often when they are merely content, and never twice within two years.' });
      (S.launchQueue = S.launchQueue || []).push(L);
      return L;
    }
    return null;
  };

  // What the season's competition robot was: its drawing, its mechanisms and a few numbers (kept in History)
  C.robotRecord = function (S) {
    const R = S.robot;
    if (!R || R.year !== S.year || !R.bots) return null;
    const bi = R.comp || 0, subs = R.bots[bi].subs, Sz = G.Seasons[R.year];
    if (!Sz || !Object.keys(subs).some(k => k !== 'soft' && subs[k] && subs[k].ver)) return null;
    const parts = Sz.subs.filter(sd => sd.id !== 'soft' && subs[sd.id] && subs[sd.id].ver).map(sd => { const c = G.Seasons.concept(R.year, sd.id, subs[sd.id].concept); return { sub: sd.name, name: c ? c.name : subs[sd.id].concept, ver: subs[sd.id].ver }; });
    let cap = null; try { cap = G.Robot.cap(S); } catch (e) { cap = null; }
    return { look: G.Robot.look(S), name: R.nick || '', parts, power: cap ? G.Cap.power(R.year, cap) : null, rel: cap ? Math.round(cap.rel) : null, weight: G.Robot.weight(S),
      auto: Sz.autoTiers ? Sz.autoTiers[R.autoTier || 0] : '', vision: R.visionLvl || 0 };
  };

  C.toReview = function (S) {
    if (S.phase === 'review') return;
    // the FIRST Impact Award is given at every Championship, played or not: the Hall of Fame keeps every winner
    if (!S.season.cmpImpact && S.mode === 'career' && S.teams) S.season.cmpImpact = C.rollChampsImpact(S);
    C.settleImpact(S, 'all');
    if (G.World.on(S) && S.mode === 'career') {
      if (!S.season.wfaCmp) C.rollWfa(S);
      C.settleWfa(S);
      const w = S.season.wfa; if (w && w.kind === 'nom' && !w.res) C.inbox(S, 'Woodie Flowers essay not judged', 'Your students\' essay about ' + w.name + ' was never judged: ' + (S.team.home ? 'the District Championship had passed' : 'the team played no regional after it was sent') + '. Send it earlier next season.', 'event');
      wfaPastUpdate(S);
    }
    const s = S.season;
    C.checkSponsorGoals(S, true);
    let dSup = 0;
    const TIER = { Minimum: [4, -14], Target: [8, -6], Stretch: [14, -2] };
    s.goals.forEach(g => { g.met = !!D.PROGRAM_GOALS[g.id].check(s); const t = TIER[g.tier] || [8, -6]; dSup += g.met ? t[0] : t[1]; });
    const debt = Math.max(0, Math.round(-S.money)), pen = C.debtPenalty(debt, S.debtRun);
    if (debt) dSup -= pen.support;
    S.debtRun = debt ? (S.debtRun || 0) + 1 : 0;
    dSup *= dSup < 0 ? ({ easy: 0.5, normal: 1, hard: 1.5 }[S.diff] || 1) : 1;
    if (dSup < 0 && S.lostYear && C.cy(S) === 2022) { dSup *= 0.5; s.rebuilding = true; } // everybody is starting again
    S.support = Math.round(U.clamp(S.support + dSup, 0, 100));
    s.supportDelta = Math.round(dSup);
    boardReview(S, dSup);
    s.legacy = C.legacyFor(s) + (debt ? 0 : 20);
    // the school pays the bills: the balance goes back to $0, but the board remembers
    if (debt) {
      S.rep = U.clamp(S.rep - pen.rep, 0, 100);
      s.debt = debt; s.debtPen = pen;
      S.money = 0; S.ledger.unshift({ d: C.dateLabel(S), desc: 'School board covered the season\'s debt', amt: debt, px: C.px(S) });
      C.letter(S, board(S) + ' (district finance office)', 'From the school board: about the overdraft', 'The district has covered this season\'s ' + U.money(debt) + ' overdraft so the team can keep operating, and your balance is back to $0.\n\n' +
        'The board has noted it in the program review, and I am afraid word has got around. ' + (pen.mult > 1 ? 'This is not the first time, so the board is less forgiving this year. Another overdraft next season will cost the program even more. ' : 'If it happens again next season, the board will take a firmer line. ') +
        (debt > 20000 ? 'Please present a realistic budget before next season.' : 'A strong season goes a long way with the board, and results like yours make this easier to defend.'), 'Regards,\nThe District Finance Office', { note: 'Program support −' + pen.support + ', reputation −' + pen.rep + (pen.mult > 1 ? ' (penalties ×' + pen.mult.toFixed(1) + ' for a repeat overdraft)' : '') + '.' });
    }
    S.legacy += s.legacy;
    { const hr = G.Shop.fx(S, 'honors', 'rep'); if (hr > 0) S.rep = U.clamp(Math.round((S.rep + hr) * 10) / 10, 0, 100); } // every visitor walks past the Honors Wall (the reputation it shows, as it says)
    // (3.5) an international partner's name on the robot: a little reputation every season
    { const n = C.intlPartners(S).length, r = n * ((D.SPONSOR_INTL || {}).rep || 0); if (r > 0) { S.rep = U.clamp(Math.round((S.rep + r) * 10) / 10, 0, 100); s.intlRep = r; } }
    // sponsors
    S.lastSponsor = Object.assign({ year: S.year }, C.sponsorSeason(S)); // kept for the offseason: sponsors that leave take their numbers with them
    const left = [], renewing = [];
    S.sponsors.forEach(sp => {
      sp.goals.forEach(g => { if (!g.met) sp.sat = Math.max(0, sp.sat - 8); });
      if (sp.exp === 'High' && !s.events.some(e => e.playoffs)) sp.sat = Math.max(0, sp.sat - 10);
      if (sp.exp === 'High' && C.highExpect(S) && !(s.events.some(e => e.won) || s.champsQualified)) sp.sat = Math.max(0, sp.sat - 12); // top programs are expected to win
      sp.seasonsLeft--;
      if (sp.seasonsLeft <= 0) {
        // (3.5.1) A sponsor that wants to stay does not renew by itself any more: its new terms go on the offer list,
        // marked Renewal, and the choice is yours. Not signing costs nothing.
        if (G.R.chance(C.renewChance(sp))) { const TM = D.SPONSOR_TERMS[sp.slot] || D.SPONSOR_TERMS.partner, len = G.R.int(TM.renew[0], TM.renew[1]), oldBase = sp.base, base = Math.round(sp.base * (0.9 + sp.sat / 250) / 250) * 250, met = sp.goals.map(g => !!g.met);
          const o = { id: U.uid('o'), name: sp.name, type: sp.type, typeName: sp.typeName, slot: sp.slot, base, length: len, goals: sp.goals.map(g => ({ id: g.id, bonus: g.bonus, met: false })), obligations: (sp.obligations || []).slice(), perk: sp.perk || null, exp: sp.exp,
            renew: { sat: sp.sat, oldBase, contact: sp.contact || null, round: S.offerRound || 0 } };
          renewing.push(sp); S.offers.unshift(o);
          const view = Object.assign({}, sp, { base, seasonsLeft: len }), how = 'Renewal offer: ' + len + ' more season' + (len > 1 ? 's' : '') + ' at ' + U.money(base) + ' a season. It is on the Finance page, marked Renewal: sign it there if you want them back. Leaving it unsigned costs nothing.';
          if (sp.slot === 'title' && D.SPONSOR_MAIL && D.SPONSOR_MAIL.roles[sp.type]) C.sponsorMail(S, view, 'renew', { oldBase, met, note: how }); // (3.5) a title sponsor writes
          else if (C.isMaker(sp)) C.makerMail(S, view, 'renew', { oldBase, met, note: how }); // ... and so does the printer maker
          else if (C.isIntl(sp) && D.SPONSOR_MAIL && D.SPONSOR_MAIL.intl) C.intlMail(S, view, 'renew', { oldBase, met, note: how }); // ... and an international partner
          else C.inbox(S, sp.name + ' would like to renew', (sp.slot === 'grant' ? 'The foundation liked what the grant paid for and offers it again: ' : 'They would like to stay with the team: ') + len + ' more season' + (len > 1 ? 's' : '') + ' at ' + U.money(base) + ' a season. The offer is on the Finance page, marked Renewal. Sign it if you want them back; leaving it unsigned costs nothing.', 'money'); }
        else left.push(sp);
      }
    });
    S.sponsors = S.sponsors.filter(x => !left.includes(x) && !renewing.includes(x));
    left.forEach(sp => C.sponsorLeft(S, sp)); // (3.5) not on this October's list: back next year at the earliest
    if (left.length) C.inbox(S, 'Sponsors leaving', left.map(x => x.name).join(', ') + ' did not renew. ' + (left.length > 1 ? 'They' : 'It') + ' will not be back on the list for a year. Look for new offers in October.', 'money');
    // mentors
    const gone = [];
    S.mentors.forEach(m => { C.mentorMeta(S, m); m.ten++; m.exp++; });
    // a Woodie Flowers Finalist (or Award winner) never leaves on their own: the draw is made anyway, so nothing else changes
    S.mentors.forEach(m => { m.contract--; if (m.contract <= 0 && G.R.chance(0.5 - S.morale / 300) && !m.wffa && !m.wfa) gone.push(m); else if (m.contract <= 0) m.contract = G.R.int(1, 2); });
    S.mentors = S.mentors.filter(m => !gone.includes(m));
    if (gone.length) C.inbox(S, 'Mentors moving on', gone.map(m => m.name).join(', ') + ' decided not to return next season.', 'staff');
    // knowledge decay
    const decay = C.kbCurrent(S) ? 0.1 : 0.2;
    if (S.equip.kb && !C.kbCurrent(S)) C.inbox(S, 'The Knowledge Base was out of date', 'Nobody updated the wiki and the CAD library this year, so they did not slow the loss of know-how in the areas you left unused. The yearly update is a short project in the Design Office.', 'know');
    D.AREAS.forEach(a => { if (!S.usedAreas[a.id] && !S.mentors.some(m => m.spec === a.id)) S.know[a.id] = Math.round((S.know[a.id] || 0) * (1 - decay)); });
    s.loyal = G.Parts.loyalSeason(S);
    s.elite = C.eliteReview(S); // (3.5) your own Elite tag for next season
    S.history.push({
      loyal: s.loyal || null, elite: s.elite || null,
      year: S.year, cy: C.cy(S), px: C.px(S), robot: C.robotRecord(S), copied: s.copied || null, events: s.events, awards: s.awards, champs: s.champsQualified, champsReason: s.champsReason || '', divWin: s.divWin, einstein: s.einstein, worldChamp: s.worldChamp, worldFinalist: !!s.worldFinalist, wc: s.wc || null, cmpImpact: s.cmpImpact && s.cmpImpact.result ? { result: s.cmpImpact.result, cele: s.cmpImpact.cele || null } : null,
      home: S.team.home && G.World.on(S) ? S.team.home : null,
      goals: s.goals.map(g => ({ id: g.id, met: g.met, tier: g.tier })), money: S.money, legacy: s.legacy, support: S.support, rep: S.rep,
      earned: s.earned, spent: s.spent, avgRP: s.qualMatches ? s.rpSum / s.qualMatches : 0, impactRaw: s.impact, board: s.board || null
    });
    S.phase = 'review';
    S.champsPaid = null;
  };
  // ---------- your own Elite tag (3.5) ----------
  // The elite teams are the best of the world by rating. At every season review your team is measured the same way:
  // its season OPR (the Scouting numbers: the average over its events) against every other team's. Inside the top N,
  // N being the number of elite teams in the world, in a season in which it also qualified for the Championship (as
  // the elite do; in a game where OPR says little, 2018 above all, a middling team can rank high by chance), it has
  // met the elite standard and carries the Elite tag through the next season: on Headquarters, at events and in
  // scouting. A mark of standing, nothing else, and measured again at every review. A season with no event played
  // measures nothing: a tag held is kept. (The max player of the tests meets it in about nine seasons of ten, the
  // plain autoplay never.)
  C.eliteStanding = function (S) {
    if (!G.World.on(S) || !S.wseason || S.mode !== 'career' || !G.Scout) return null;
    const rows = G.Scout.rows(S).filter(r => r.opr != null), me = rows.find(r => r.me), n = G.World.elites(S).length;
    if (!me || !n) return null;
    const others = rows.filter(r => !r.me).sort((a, b) => b.opr - a.opr), rank = 1 + others.filter(r => r.opr > me.opr).length;
    const champs = !!(S.season && S.season.champsQualified);
    return { rank, of: rows.length, n, opr: me.opr, cut: others[n - 1] ? others[n - 1].opr : 0, champs, met: rank <= n && champs };
  };
  C.eliteReview = function (S) {
    const E = C.eliteStanding(S), had = S.team.elite || null, cy = C.cy(S), next = C.cyNext(S);
    if (!E) return null;
    const where = U.ord(E.rank) + ' of ' + E.of + ' teams in the world by OPR', forNext = next ? 'the ' + next + ' season' : 'the summer';
    if (E.met) {
      const since = had ? had.since || had.cy : cy; S.team.elite = { cy, since, rank: E.rank, of: E.of, n: E.n };
      E.since = since;
      if (had) C.inbox(S, 'Still elite', 'Your ' + cy + ' season ranked ' + where + ', inside the top ' + E.n + ' again. The Elite tag stays through ' + forNext + '.', 'info', { note: 'World: Scouting lists every team\'s OPR.' });
      else C.inbox(S, 'Your team is elite', 'The numbers are in, and your ' + cy + ' season was one of the best anywhere: ' + where + '. The top ' + E.n + ' are the teams the sport calls elite, and yours, a Championship team this year, is now one of them.\n\nThrough ' + forNext + ' your team carries the Elite tag: on the Headquarters page, at events and in every scouting list. It is measured again at the next review.', 'info', { note: 'World: Scouting lists every team\'s OPR.' });
    } else if (had) {
      delete S.team.elite; E.lost = true;
      C.inbox(S, 'The Elite tag comes off', 'Your ' + cy + ' season ranked ' + where + '. ' + (E.rank <= E.n ? 'That is inside the top ' + E.n + ', but an elite team also plays the Championship, and yours did not qualify this year. The tag comes off for ' : 'The top ' + E.n + ' are elite, so the tag comes off for ') + forNext + '. It can be won back at the next review.', 'info', { note: 'World: Scouting lists every team\'s OPR.' });
    }
    return E;
  };
  // The Knowledge Base only works while it is kept up: it covers the season it was built or last updated for.
  C.kbCycle = S => S.si + (['off', 'review', 'end'].includes(S.phase) ? 1 : 0);
  C.kbCurrent = S => !!(S.equip.kb && (S.kbFor == null || S.kbFor >= C.kbCycle(S)));
  // the code library (3.1.3): ported for the season being played (in the offseason: for the coming one)
  C.codeCurrent = S => !!(S && S.equip && S.equip.code && S.codeFor != null && S.codeFor >= C.kbCycle(S));
  C.endReview = function (S) {
    const last = S.upcoming >= S.order.length || S.mode === 'single';
    if (last || (S.support <= 0 && !S.settings.noFail)) {
      S.phase = 'end'; S.endReason = S.support <= 0 && !last ? 'fired' : 'complete';
      if (last) C.fireStories(S, 'recap'); // the last season's year in review, shown before the career summary
      G.Save.write('auto'); return;
    }
    S.phase = 'off'; S.month = 0; S.week = 0;
    const imp = 0;
    S.season = newSeasonState(null); S.season.impact = imp;
    S.offReg = [];
    if (S.robot && G.Robot.held(S).length) { const fit = G.Robot.installHeld(S); if (fit.length) C.inbox(S, 'The bag is open', 'The season is over and the robot is out of the bag. The parts that were still packed are on it now: ' + fit.join(', ') + '.', 'dev'); }
    if (C.pandemicDue(S)) { C.fireStories(S, 'recap'); C.startPandemic(S); return; } // 2020: the year in review, then there is no summer and no 2021 season
    C.fireStories(S, 'recap'); C.fireStories(S, 'off:0'); // the year in review, and what the summer brings
    C.researchOpens(S); // R&D for next year opens (3.1.3)
    if (S.equip.kb) C.inbox(S, 'The Knowledge Base needs its yearly update', 'The rules have changed and the students who wrote half the wiki have graduated. A short project in the Design Office (' + D.KB_UPKEEP_HOURS + ' hours) brings the wiki and the CAD library up to date for the coming season. Left as it is, it will not slow the loss of know-how at the end of next season.', 'know', { prio: true });
    if (S.equip.code) C.inbox(S, 'The code library needs a port', 'Next season\'s control system release comes out in beta this autumn, and the code library is written for this season\'s. A port in the Design Office (Program projects) before Kickoff gets the new robot code off to a flying start.', 'dev', { prio: true, note: 'Ported before Kickoff: the robot code starts a little further on, and the first code upgrade, auto routine and vision level take ' + Math.round(D.CODELIB.first * 100) + '% fewer hours. Offseason only.' });
    C.inbox(S, 'Offseason begins', 'Use the summer and fall to research new mechanisms (R&D is open until Kickoff), attend offseason events with last season\'s robot, recruit, and line up sponsors. Research matters more than it used to: rule changes and new designs date part of what you know every offseason. Stock up on parts before Kickoff: in season they often sell out. The next game is revealed at Kickoff in January.', 'info');
    G.Parts.rollStock(S);
    G.Parts.teaser(S);
    C.techRules(S);
  };
  C.grade = function (S) {
    const sc = D.SCENARIOS.find(x => x.id === S.scenario) || {};
    const h = S.history[S.history.length - 1] || {};
    const evs = h.events || [];
    const met = {
      rookieWin: (h.awards || []).includes('ras') || evs.some(e => e.playoffs), champs: h.champs, einstein: h.worldChamp, win: evs.some(e => e.won),
      avgRP25: h.avgRP >= 2.5, legacy: (h.legacy || 0) >= 150
    }[sc.goal];
    const leg = h.legacy || 0;
    let g = met ? (leg >= 300 ? 'S' : 'A') : leg >= 150 ? 'B' : leg >= 60 ? 'C' : 'D';
    return { grade: g, met: !!met, legacy: leg, goalText: sc.goalText || '' };
  };

  // ======================= offseason activities & purchases =======================
  // Weekly limits on non-development activities: D.ACT_LIMIT total and each type once (×4 for an offseason month)
  C.actLimits = function (S) {
    const key = turnKey(S);
    if (!S.actLog || S.actLog.key !== key) S.actLog = { key, counts: {}, total: 0 };
    const k = S.phase === 'off' ? 4 : 1;
    return { max: D.ACT_LIMIT * k, perType: k, used: S.actLog.total, counts: S.actLog.counts, unit: S.phase === 'off' ? 'month' : 'week' };
  };
  // Repeats of the same activity within a month pay less (donor fatigue / the same audience); counts reset every month
  C.monthKey = function (S) {
    if (S.phase === 'off') return 'o' + S.si + '-' + S.month;
    if (S.phase === 'kickoff' || (S.phase === 'build' && S.week <= 4)) return 's' + S.si + '-Jan';
    if (S.phase === 'build') return 's' + S.si + '-Feb';
    if (S.phase === 'comp' && S.week <= 4) return 's' + S.si + '-Mar';
    return 's' + S.si + '-Apr';
  };
  function actMonth(S) { const k = C.monthKey(S); if (!S.actMonth || S.actMonth.key !== k) S.actMonth = { key: k, n: {} }; return S.actMonth; }
  C.fundFatigue = (S, id) => Math.pow(D.FUND_FATIGUE, actMonth(S).n[id] || 0);
  C.actAvailable = (S, a) => !a.req || a.req(S);
  C.doActivity = function (S, id) {
    const a = D.ACTIVITIES.find(x => x.id === id), rng = G.R;
    if (!a) return 'Unknown activity';
    if (!C.actAvailable(S, a)) return a.reqText || 'Not available';
    const lim = C.actLimits(S);
    if (lim.used >= lim.max) return 'The team has already done ' + lim.max + ' activities this ' + lim.unit + '. Try again next ' + lim.unit + '.';
    if ((lim.counts[id] || 0) >= lim.perType) return 'Already done this ' + lim.unit + (lim.perType > 1 ? ' (' + lim.perType + '×)' : '') + '.';
    { const e = C.afford(S, a.cost); if (e) return e; } // free fundraisers always work, even in the red
    S.actLog.counts[id] = (S.actLog.counts[id] || 0) + 1; S.actLog.total++;
    if (a.cost) C.spend(S, a.cost, a.name);
    let msg = '';
    const fat = C.fundFatigue(S, a.id), mo = actMonth(S);
    mo.n[a.id] = (mo.n[a.id] || 0) + 1;
    const trailer = a.robot && G.Shop.lvl(S, 'trailer') ? D.TRAILER_OUTREACH : 1; // the trailer makes robot shows easier
    if (a.kind === 'rest') {
      const before = S.fatigue;
      if (C.inSeason(S)) S.fatigue = Math.max(5, S.fatigue + a.fatigue * fat);
      S.morale = Math.min(100, S.morale + a.morale);
      msg = 'Morale +' + a.morale + (C.inSeason(S) ? ', fatigue ' + Math.round(before) + ' → ' + Math.round(S.fatigue) : ' (fatigue only matters in season)');
    } else if (a.kind === 'outreach') {
      const imp = Math.round(a.impact * fat * trailer * (1 + G.Shop.fx(S, 'meeting', 'outreach')) * 10) / 10, rp = Math.round(a.rep * fat * 10) / 10;
      S.season.impact += imp; S.season.outreach++; C.addRep(S, rp);
      if (a.recruits && fat > 0.6) S.studentsCount = Math.min(D.STUDENT_CAP, S.studentsCount + a.recruits);
      if (a.money) { const gm = Math.round(rng.range(a.money[0], a.money[1]) * fat); C.earn(S, gm, a.name); msg = U.money(gm) + ' raised, '; }
      if (a.sponsorSat) S.sponsors.forEach(sp => sp.sat = Math.min(100, sp.sat + a.sponsorSat));
      if (a.fatigue && C.inSeason(S)) S.fatigue = Math.max(5, S.fatigue + a.fatigue);
      msg += '+' + imp + ' outreach points, +' + rp + ' reputation' + (fat < 1 ? ' (same audience again this month: ×' + fat.toFixed(2) + ')' : '') + (trailer > 1 ? ' · trailer bonus' : '');
    } else {
      let g;
      if (a.grant) { const p = (0.25 + C.impactRating(S).parts.outreach / 300) * fat; g = rng.chance(p) ? rng.int(a.money[0], a.money[1]) : 0; }
      else g = Math.round(rng.range(a.money[0], a.money[1]) * (a.repScale ? 0.5 + S.rep / 100 : 1) * (S.mentors.some(m => m.role === 'biz') ? 1.15 : 1) * fat);
      if (g) C.earn(S, g, a.name);
      if (a.sponsorSat) S.sponsors.forEach(sp => sp.sat = Math.min(100, sp.sat + a.sponsorSat));
      msg = g ? 'Raised ' + U.money(g) + (fat < 1 ? ' (repeat donors this month give less: ×' + fat.toFixed(2) + ')' : '') : 'The application was not funded this time.';
    }
    return { ok: true, msg };
  };
  // "Every turn" activities (S.settings.autoAct: 'fund', 'outreach' or 'mixed'): when Continue is pressed the team fills
  // its free activity slots on its own, the best-paying fundraiser or the outreach worth most points first (taking this
  // month's repeat penalty into account), only what it can afford, and alternating the two kinds when mixed.
  C.autoActivities = function (S) {
    const mode = S.settings && S.settings.autoAct;
    if (!mode) return [];
    const done = [], kinds = mode === 'mixed' ? ['outreach', 'fund'] : [mode];
    const worth = a => { const f = C.fundFatigue(S, a.id); if (a.kind === 'outreach') return a.impact * f + (a.money ? (a.money[0] + a.money[1]) / 400 : 0) - a.cost / 200; const m = a.money ? (a.money[0] + a.money[1]) / 2 * (a.grant ? 0.4 : a.repScale ? 0.5 + S.rep / 100 : 1) : 0; return m * f - a.cost; };
    for (let i = 0; i < 24; i++) {
      const lim = C.actLimits(S);
      if (lim.used >= lim.max) break;
      const ok = a => C.actAvailable(S, a) && (lim.counts[a.id] || 0) < lim.perType && !C.afford(S, a.cost);
      let pick = null;
      for (let k = 0; k < kinds.length && !pick; k++) {
        const kind = kinds[(done.length + k) % kinds.length];
        pick = D.ACTIVITIES.filter(a => a.kind === kind && ok(a)).sort((a, b) => worth(b) - worth(a))[0] || null;
        if (pick && worth(pick) <= 0) pick = null;
      }
      if (!pick) break;
      const r = C.doActivity(S, pick.id);
      if (!r || typeof r === 'string') break;
      done.push(pick.name);
    }
    if (done.length) C.inbox(S, 'Activities this ' + (S.phase === 'off' ? 'month' : 'week'), 'The team ran ' + done.length + ' activit' + (done.length === 1 ? 'y' : 'ies') + ' on its own: ' + done.join(', ') + '. (Team page: "every turn" is on.)', 'info');
    return done;
  };
  // Facilities are bought/upgraded through G.Shop (parts and game elements: G.Parts).
  C.buyEquip = (S, id, opts) => G.Shop.upgrade(S, id, opts);
  C.buyBatteries = (S, n) => G.Shop.buyBatteries(S, n);
  // Spare parts cost more when bought at an event (rush delivery to the pits); a print farm prints many of them in the pit
  C.spareEventMult = S => (G.Shop.lvl(S, 'printer') >= 4 ? D.SPARES_EVENT_PRINT : D.SPARES_EVENT_MULT);
  C.spareUnitPrice = function (S, atEvent) {
    return Math.round(D.SPARES_COST * (atEvent ? C.spareEventMult(S) : 1) * G.Shop.spareMult(S) * (C.hasPerk(S, 'partsDiscount') ? 0.85 : 1));
  };
  // Auto-restock: buy up to n spares at shop prices. Before events it may use the in-season overdraft like any purchase;
  // the weekly top-up only spends cash on hand. Returns { bought, short }.
  C.autoBuySpares = function (S, n, why, cashOnly) {
    n = Math.max(0, Math.ceil(n));
    if (!n) return { bought: 0, short: false };
    const price = C.spareUnitPrice(S, false);
    let k = n;
    if (cashOnly) k = Math.min(k, Math.floor(Math.max(0, S.money) / price));
    while (k > 0 && C.afford(S, k * price)) k--;
    if (k > 0) { C.spend(S, k * price, k + ' spare part' + (k > 1 ? 's' : '') + ' (auto-restock' + (why ? ' ' + why : '') + ')'); S.parts.spares += k; }
    return { bought: k, short: k < n };
  };
  // Spares the team should keep on hand between events: home repairs on both robots, this turn's driver practice, plus one
  C.spareBuffer = function (S, th) {
    const R = S.robot; if (!R || !R.bots) return 0;
    let need = 0;
    R.bots.forEach(b => Object.keys(b.subs).forEach(k => { const u = b.subs[k]; if (k !== 'soft' && u && u.ver) need += (100 - u.cond) / D.SPARE_COND_PER_UNIT; }));
    const drive = th ? th.drive || 0 : 0;
    need += drive * D.DRILL_SPARES + (S.parts.drillUse || 0);
    return Math.ceil(need + (drive > 0 || need > 0 ? 1 : 0));
  };
  C.buySpares = function (S, n, atEvent) {
    const cost = n * C.spareUnitPrice(S, atEvent);
    { const e = C.afford(S, cost); if (e) return e; }
    C.spend(S, cost, n + ' spare parts' + (atEvent ? ' (at event)' : ''));
    S.parts.spares += n;
    return null;
  };
  // ======================= Summit Champs (3.1.3): the invitation-only October event (D.SUMMIT) =======================
  C.summit = S => (S.summit = S.summit || { sent: {}, res: {} });
  // the host: an elite team in California (the Sierra zone), chosen once and the same every year
  C.summitHost = function (S) {
    const sm = C.summit(S), W = G.World;
    if (sm.host && S.teams[sm.host]) return S.teams[sm.host];
    if (!W.on(S)) return null;
    const cy = C.cy(S), el = W.elites(S), ca = el.filter(t => W.zoneOf(t, cy) === 'sierra'), west = el.filter(t => t.region === 'West');
    const t = (ca.length ? ca : west.length ? west : el).slice().sort((a, b) => b.str - a.str)[0];
    if (t) sm.host = t.num;
    return t || null;
  };
  // invited from the world's books: every team that won an official event this season as captain or first pick
  C.summitInvitees = function (S) {
    const ws = S.wseason; if (!ws) return [];
    return Object.keys(ws.rec).map(Number).filter(n => n !== S.team.num && S.teams[n] && (ws.rec[n] || []).some(r => r.f === 'Winner' && r.p <= 1));
  };
  // your team: an official event won as captain or first pick in the season just played (or null)
  C.summitEarned = function (S) {
    const h = S.history[S.history.length - 1]; if (!h || h.cy !== C.cy(S)) return null;
    return (h.events || []).find(e => e.won && (e.role === 'Captain' || e.role === '1st pick') && ['regional', 'dcmp', 'champs', 'einstein'].includes(e.kind)) || null;
  };
  // the field: the host, the elite teams among the invited, then the strongest of the others (a thin season: the
  // strongest teams of the world fill it)
  // A field as strong as a Championship division's playoffs: the host, up to D.SUMMIT.elites of the invited elite teams, and
  // the rest drawn from the other invited teams, the stronger ones likelier (D.SUMMIT.pull). Fixed for the season (sm.field).
  C.summitField = function (S, n) {
    const host = C.summitHost(S), out = host ? [host.num] : [], rng = G.makeRng(hash32('summitfield' + C.cy(S) + ':' + S.team.num));
    const inv = C.summitInvitees(S).map(x => S.teams[x]).filter(t => !host || t.num !== host.num);
    rng.shuffle(inv.filter(t => t.elite)).sort((a, b) => b.str - a.str).slice(0, Math.max(0, D.SUMMIT.elites - out.length)).forEach(t => out.push(t.num));
    const rest = inv.filter(t => !t.elite).map(t => ({ t, w: Math.exp((t.str - 80) / D.SUMMIT.pull) }));
    while (out.length < n && rest.length) { const p = rng.wpick(rest, x => x.w); out.push(p.t.num); rest.splice(rest.indexOf(p), 1); }
    if (out.length < n) Object.values(S.teams).filter(t => !out.includes(t.num) && !t.elite).sort((a, b) => b.str - a.str).slice(0, n - out.length).forEach(t => out.push(t.num)); // a thin season
    return out;
  };
  C.summitDef = function (S, o) {
    const sm = C.summit(S), cy = C.cy(S), list = sm.field && sm.field.cy === cy ? sm.field.list : C.summitField(S, o.size - 1);
    return { id: o.id + S.year, kind: 'offseason', summit: true, name: o.name, size: o.size, str: D.SUMMIT.str, week: 0, region: D.SUMMIT.region, teams: list.slice(0, o.size - 1) };
  };
  // August: the invitations go out. An invited team gets an email and a pop-up and may sign up in the Calendar; everybody
  // else hears who is going.
  C.summitInvite = function (S) {
    const sm = C.summit(S), cy = C.cy(S), o = D.OFFSEASON_EVENTS.find(x => x.id === D.SUMMIT.id);
    if (!o || !G.World.on(S) || S.mode !== 'career' || sm.sent[cy] || !S.wseason || S.wseason.cy !== cy) return;
    sm.sent[cy] = 1;
    const host = C.summitHost(S); if (!host) return;
    const won = S.robot ? C.summitEarned(S) : null, list = C.summitField(S, won ? o.size - 1 : o.size);
    sm.field = { cy, list };
    const nEl = list.filter(n => S.teams[n] && S.teams[n].elite).length, hn = 'Team ' + host.num + ' ' + host.name;
    if (won) {
      sm.inv = cy; const both = S.offReg.includes('os_oct'); if (both) sm.both = cy; // already signed up for the October event at home: it may play both
      const oct = C.offEvent(S, 'os_oct'), octName = oct ? 'the ' + oct.name : ''; // (3.5) the October event has a local name; outside North America there is none
      const who = D.personName(G.makeRng(host.num * 31 + 7), host), tc = C.travelCost(S, C.summitDef(S, o));
      C.letter(S, who + ' (' + hn + ', host of Summit Champs)', 'Invitation: Summit Champs', 'Every October we invite the teams that won an event this season, as captains or first picks, to our home field in California for Summit Champs. You won the ' + won.name + ' as ' + (won.role === 'Captain' ? 'captain' : 'first pick') + ', so you are one of them.\n\n' +
        nEl + ' of the elite teams are coming. The day before the matches we hold a mentor conference: our mentors and theirs, on what worked this season and what did not. Bring a notebook.\n\nWe hope to see you there.', 'Best,\n' + who + '\n' + hn,
        { teams: [host.num], prio: true, note: 'Sign up in the Calendar for October (' + (both ? 'you are already signed up for ' + octName + ' that month: you can play both, one after the other' : oct ? 'it takes the place of ' + octName + ' that month' : 'your area holds no event that month, so the month is free for it') + '): registration ' + U.money(o.fee) + ', travel about ' + U.money(tc) + '. A field like a Championship division\'s playoffs, more reputation, morale and experience than any other offseason event.' });
      (S.launchQueue = S.launchQueue || []).push({ kind: 'story', id: 'summitinv' + cy, tag: 'INVITATION', color: 'var(--accent)', title: 'Invited to Summit Champs',
        body: [hn + ' has invited your team to Summit Champs in October: the offseason event of the teams that won an event this season as captains or first picks. You won the ' + won.name + ' as ' + (won.role === 'Captain' ? 'captain' : 'first pick') + '.', nEl + ' elite teams are going. Before practice day there is a mentor conference: pick the talks you want to hear.'],
        means: ['Sign up in the Calendar (October) for ' + U.money(o.fee) + ' plus travel (about ' + U.money(tc) + ')' + (both ? '. You are already signed up for ' + octName + ' that month: you can play both, one after the other.' : oct ? ', or ignore it and play ' + octName + ' that month.' : '. Your area holds no event in October, so nothing else is in the way.'), 'The field is as strong as a Championship division\'s playoffs. It pays more than any other offseason event: reputation, morale, sponsor goodwill and experience.', 'At the mentor conference you choose ' + D.SUMMIT.listen + ' of ' + D.SUMMIT.talks + ' talks; each adds a little know-how in its area.'], btn: 'calendar' });
    } else C.inbox(S, 'Summit Champs: the invitations are out', hn + ' has sent its invitations for Summit Champs in October: the teams that won an event this season as captains or first picks, ' + nEl + ' of them elite teams. Your team was not invited this year: win an event as captain or first pick to be on the list next year.', 'news', { teams: [host.num] });
  };
  // the mentor conference: talks by the mentors of the teams there, one area each; you choose D.SUMMIT.listen of them
  C.summitConference = function (S, ev) {
    const rng = G.makeRng(hash32(ev.id) + 11), field = (ev.teams || []).filter(n => n !== S.team.num && S.teams[n]), el = field.filter(n => S.teams[n].elite);
    const areas = rng.shuffle(D.AREAS.slice()).slice(0, D.SUMMIT.talks);
    const T = ['what we learned this season', 'from prototype to the field', 'the mistakes we made so you do not have to', 'a teardown, part by part', 'how we practise it'];
    ev.mconf = { picked: [], done: false, talks: areas.map((a, i) => { const n = (el.length ? el : field)[i % Math.max(1, (el.length ? el : field).length)], t = S.teams[n];
      return { area: a.id, title: a.name + ': ' + rng.pick(T), by: D.personName(rng, t || 'intl') + ', Team ' + n + ' ' + (t ? t.name : ''), team: n }; }) };
  };
  C.summitListen = function (S, ev, i) {
    const c = ev && ev.mconf; if (!c || c.done || c.picked.includes(i) || !c.talks[i]) return null;
    c.picked.push(i); const t = c.talks[i];
    G.Robot.addXP(S, t.area, D.SUMMIT.confXP);
    if (c.picked.length >= D.SUMMIT.listen) c.done = true;
    return t;
  };
  // November: how Summit Champs went, when your team was not there (the world simulation's field: the strongest alliance
  // usually wins, not always)
  C.summitNews = function (S) {
    const sm = C.summit(S), cy = C.cy(S), o = D.OFFSEASON_EVENTS.find(x => x.id === D.SUMMIT.id);
    if (!sm.sent[cy] || !sm.field || sm.field.cy !== cy || S.eventsDone[o.id + S.year] || sm.res[cy]) return;
    const rng = G.makeRng(hash32('summit' + cy)), f = sm.field.list.filter(n => S.teams[n]).map(n => ({ n, v: S.teams[n].str + rng.norm(0, 4) })).sort((a, b) => b.v - a.v);
    if (f.length < 3) return;
    const cap = f[Math.min(f.length - 1, rng.chance(0.65) ? 0 : rng.int(1, 3))], rest = f.filter(x => x !== cap), win = [cap.n, rest[0].n, rest[Math.min(rest.length - 1, rng.int(4, 9))].n];
    sm.res[cy] = 'not attended';
    const nm = n => n + ' ' + S.teams[n].name, host = C.summitHost(S);
    C.inbox(S, 'Summit Champs: ' + nm(win[0]) + ' and partners win', 'The best teams of the season met in California at Summit Champs' + (host ? ', hosted by Team ' + nm(host.num) : '') + '. The winning alliance: ' + win.map(nm).join(', ') + '. ' + rng.pick(['The final went to a third match.', 'The final was over in two, and nobody in the stands sat down for either.', 'The lower bracket produced the best match of the weekend.']), 'news', { teams: win });
  };
  const hash32 = s => { let x = 2166136261; String(s).split('').forEach(ch => { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619); }); return x >>> 0; };

  // ---------- Vendor challenges (3.1.3): D.CHALLENGES ----------
  // the calendar year of an offseason month (a challenge starts in a calendar year)
  C.offCal = S => S.offYear || C.cy(S);
  C.chal = id => D.CHALLENGES.find(x => x.id === id) || null;
  C.chalState = S => (S.vchal = S.vchal || { ent: {}, res: {} });
  // a challenge runs this offseason: a career, from its first year, not in the opening pre-season
  C.chalOn = (S, c) => !!c && S.mode === 'career' && S.phase === 'off' && !S.preseason && C.offCal(S) >= c.from;
  C.chalNow = S => (S.phase === 'off' && D.CHALLENGES.find(c => c.month === D.MONTHS[S.month] && C.chalOn(S, c))) || null;
  C.chalKey = (S, c) => c.id + C.offCal(S);
  // an entry's score (0 to 1): the station, the students' average mechanism skill and the entry's quality q (extra hours)
  C.chalOdds = function (S, c, q) {
    const K = D.CHAL, m = S.students.map(x => x.attr.mech), mech = m.length ? m.reduce((a, b) => a + b, 0) / m.length : 0;
    const fac = Math.min(1, G.Shop.lvl(S, c.fac) / K.full), mf = U.clamp((mech - K.mech[0]) / (K.mech[1] - K.mech[0]), 0, 1);
    const s = K.w.fac * fac + K.w.mech * mf + K.w.q * (q || 0);
    return { s, fac, lvl: G.Shop.lvl(S, c.fac), mech: Math.round(mech), p1: K.p1 * s * s * s, p2: K.p2 * s * s };
  };
  // the entry is finished (the project): it is sent
  C.chalSent = function (S, p, q) {
    const c = C.chal(p.ch); if (!c) return;
    const st = C.chalState(S), key = C.chalKey(S, c);
    const i = G.R.int(0, c.made.length - 1), area = Array.isArray(c.area) ? c.area[i] : c.area; // the CAD Sprint: know-how in what was designed
    st.ent[key] = { q: Math.round(q * 100) / 100, made: c.made[i] };
    G.Robot.addXP(S, area, D.CHAL.xp);
    C.inbox(S, 'Entry sent: ' + c.name, 'The students sent ' + st.ent[key].made + '. ' + D.VENDORS[c.v].name + ' announces the results in ' + MONTH_LONG[c.res] + '.' + (q > 0.02 ? ' Extra hours: quality +' + Math.round(q * 100) + '%.' : ''), 'dev', { note: '+' + D.CHAL.xp + ' XP in ' + D.AREA[area].name + '.' });
  };
  // at each offseason month: the news of a new challenge (the month before its first one; May starts without a month
  // start, so a June contest is announced in June), the month it runs, the results
  C.chalMonth = function (S) {
    if (S.mode !== 'career' || S.phase !== 'off' || S.preseason) return;
    const mo = D.MONTHS[S.month], yr = C.offCal(S);
    D.CHALLENGES.forEach(c => {
      const V = D.VENDORS[c.v], mi = D.MONTHS.indexOf(c.month);
      if (yr === c.from && S.month === Math.max(1, mi - 1)) C.inbox(S, V.short + ' starts a contest: the ' + c.name, V.name + ' announced the ' + c.name + ', a contest for FRC students every ' + MONTH_LONG[c.month] + ': ' + c.what + '. Free to enter; the winners get ' + V.short + ' parts.', 'news');
      if (yr >= c.from && mo === c.month) C.chalInvite(S, c, yr);
      if (yr >= c.from && mo === c.month) C.inbox(S, 'This month: the ' + c.name, 'The ' + c.name + ' runs this month: ' + c.what + '.', 'dev', { prio: true, note: 'Enter in the Design Office (Program projects): about ' + c.hours + ' hours this month, and extra hours make a better entry. Odds: the ' + G.Shop.item(c.fac).name + ' and the students\' mechanism skill. Results in ' + MONTH_LONG[c.res] + '.' });
      if (yr >= c.from && mo === c.res) C.chalResults(S, c);
    });
  };
  // the contest month: the invitation window (its first year has its own story; later ones recall last year's winners)
  const NTH = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
  C.chalInvite = function (S, c, yr) {
    const rng = G.R, ed = yr - c.from + 1, prev = C.chalState(S).res[c.id + (yr - 1)];
    // the CAD Sprint's game from the past. Real order: any real game from before last season. Random order: only a game this
    // career has already played (not last season's, while there is another), with its year in this timeline, so a game
    // still to come is never named
    const played = (S.order || []).slice(0, Math.max(0, S.si) + 1).filter(g => G.Seasons[g]);
    const past = C.isFictional(S) ? (played.length > 1 ? played.slice(0, -1) : played) : (G.SEASON_YEARS || []).filter(y => y < yr - 1 && G.Seasons[y]);
    const gy = past.length ? rng.pick(past) : null;
    const x = c.twist ? rng.pick(c.twist) : gy ? G.Seasons[gy].name + ' (' + C.calYear(S, gy) + ')' : 'a game from the archive';
    const sub = s => s.replace('{n}', NTH[ed] || U.ord(ed)).replace('{x}', x);
    const nm = n => (n === S.team.num ? 'your team' : 'Team ' + n + ' ' + ((S.teams && S.teams[n] || {}).name || ''));
    const last = ed > 1 && prev ? 'Last year\'s first prize went to ' + nm(prev.win[0]) + (prev.place === 1 ? '' : prev.place === 2 ? ', and your team took one of the two second prizes' : prev.entered ? '; your entry placed ' + U.ord(prev.rank) + ' of ' + prev.n : '; your team did not enter') + '.' : null;
    (S.launchQueue = S.launchQueue || []).push({ kind: 'chalinv', ch: c.id, yr, ed, first: ed === 1, month: c.month, body: (ed === 1 ? c.first : c.later).map(sub).concat(last ? [last] : []) });
  };
  C.chalResults = function (S, c) {
    const st = C.chalState(S), key = C.chalKey(S, c), K = D.CHAL, rng = G.R, yr = C.offCal(S), V = D.VENDORS[c.v];
    if (st.res[key]) return st.res[key];
    const run = S.projects.find(p => p.type === 'vchal' && p.ch === c.id);
    if (run) { S.projects = S.projects.filter(p => p !== run); C.inbox(S, c.name + ': the deadline passed', 'The entry was not finished in ' + MONTH_LONG[c.month] + ', so it was never sent. The ' + c.name + ' comes back next ' + MONTH_LONG[c.month] + '.', 'dev'); }
    const e = st.ent[key], o = e ? C.chalOdds(S, c, e.q) : null, n = Math.max(80, Math.round(K.entries[0] + K.entries[1] * (yr - c.from) + rng.int(-25, 25)));
    let place = 0;
    if (o) { const r = rng.next(); place = r < o.p1 ? 1 : r < o.p1 + o.p2 ? 2 : 0; }
    // the other winners: any team in the world, the stronger programs likelier (a vendor's contest is wide open)
    const pool = Object.keys(S.teams || {}).map(Number).filter(x => x !== S.team.num && S.teams[x]).map(x => S.teams[x]), win = [];
    const take = () => { const t = pool.length ? rng.wpick(pool, t => Math.exp(((t.str || 50) - 70) / 10)) : null; if (t) pool.splice(pool.indexOf(t), 1); return t ? t.num : null; };
    win.push(place === 1 ? S.team.num : take()); win.push(place === 2 ? S.team.num : take()); win.push(take());
    const rank = o && !place ? Math.round(4 + (n - 4) * U.clamp(Math.pow(1 - o.s, 1.4) * rng.range(0.5, 1.5), 0.004, 0.97)) : null;
    const res = st.res[key] = { place, rank, n, win: win.filter(x => x != null), entered: !!e };
    const nm = x => (x === S.team.num ? 'Team ' + x + ' ' + S.team.name + ' (you)' : 'Team ' + x + ' ' + ((S.teams[x] || {}).name || ''));
    if (place) {
      C.addRep(S, K.rep[place - 1]); S.morale = U.clamp(S.morale + K.morale[place - 1], 0, 100);
      G.Parts.prizeOffer(S, c, place, n);
      return res;
    }
    const sec = res.win.slice(1).map(nm).join(' and ');
    C.inbox(S, c.name + ': the results', V.name + ' announced the ' + c.name + ' winners, out of ' + n + ' entries. First prize: ' + nm(res.win[0]) + '. Second prizes: ' + sec + '.' + (e ? ' Our entry placed ' + U.ord(rank) + '. No prize, but every team that entered gets a box from ' + V.short + ': ' + c.merch.join(', ') + '.' : ''), e ? 'dev' : 'news',
      e ? { plot: true, note: 'Morale +' + K.merchMorale + '. Odds this year: ' + C.chalOddsText(o) + '. ' + C.chalTip(S, c, o) } : { bg: true });
    // every entrant gets the vendor's merch and stickers: a window with the place and the winners
    if (e) {
      S.morale = U.clamp(S.morale + K.merchMorale, 0, 100);
      (S.launchQueue = S.launchQueue || []).push({ kind: 'merch', ch: c.id, name: c.name, v: c.v, rank, n, made: e.made, month: D.MONTHS[S.month], tip: C.chalTip(S, c, o),
        win: res.win.map((x, i) => ({ num: x, name: (S.teams[x] || {}).name || '', prize: i ? 'Second prize' : 'First prize' })) });
    }
    return res;
  };
  const MONTH_LONG = { May: 'May', Jun: 'June', Jul: 'July', Aug: 'August', Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December' };
  const oddTxt = v => (v < 0.001 ? 'under 0.1%' : 'about ' + (v < 0.095 ? (v * 100).toFixed(1) : Math.round(v * 100)) + '%');
  C.chalOddsText = o => 'first prize ' + oddTxt(o.p1) + ', any prize ' + oddTxt(o.p1 + o.p2);
  // what would raise the odds most
  // ---------- R&D window (3.1.3): research opens after the Championship and closes at Kickoff ----------
  C.researchOpen = S => !!S && S.phase === 'off';
  // Kickoff: research still running ends, and gives know-how for the share of it that was done (partial credit)
  C.closeResearch = function (S) {
    const run = S.projects.filter(p => p.type === 'research');
    if (!run.length) return [];
    const out = run.map(p => { const r = D.RESEARCH.find(x => x.id === p.rid), f = U.clamp((p.done || 0) / Math.max(1, p.need), 0, 1), base = r ? Math.round(r.xp * f) : 0;
      const xp = r && base > 0 ? Math.round(G.Robot.addXP(S, r.area, base)) : 0; // what was gained (a specialist mentor adds to it)
      return { name: p.name, pct: Math.round(f * 100), xp, area: r ? D.AREA[r.area].name : '' }; });
    S.projects = S.projects.filter(p => p.type !== 'research');
    C.inbox(S, 'R&D closes for the season', 'Kickoff: the team\'s hours go to the new robot now, and the research still under way is written up as it stands.\n' + out.map(x => '• ' + x.name + ': ' + x.pct + '% done, +' + x.xp + ' XP in ' + x.area).join('\n'), 'know', { plot: true, note: 'Partial credit: research that runs into the season gives know-how for the part that was done. Research opens again after the Championship.' });
    return out;
  };
  // after the Championship: a pop-up, research for next year is open
  C.researchOpens = function (S) {
    const next = C.cyNext(S) || C.cy(S) + 1, lvl = a => G.Robot.know(S, a), low = D.AREAS.slice().sort((a, b) => lvl(a.id) - lvl(b.id)).slice(0, 2);
    (S.launchQueue = S.launchQueue || []).push({ kind: 'story', id: 'rdopen' + C.cy(S), tag: 'R&D · OFFSEASON', color: 'var(--info)', title: 'Research for next year is open',
      body: ['The Championship is over, and the Design Office opens its research list again: prototypes and studies that build Tech Knowledge for the ' + next + ' season and after.', 'R&D is an offseason job. It runs until Kickoff in January, when the team\'s hours go to the new robot.'],
      means: ['Start research in the Design Office any month from now to December.', 'Research still running at Kickoff ends there and gives partial credit: know-how for the share that was done.', 'The Knowledge Base and the code library are offseason jobs too: build or update them before Kickoff (Program projects).', 'Your weakest areas now: ' + low.map(a => a.name + ' (Level ' + lvl(a.id) + ')').join(' and ') + '.'], btn: 'design' });
  };
  // December: research that will not be done by Kickoff
  C.researchWarn = function (S) {
    const plan = C.hoursPlan(S), late = S.projects.filter(p => p.type === 'research' && p.done + (plan.give[p.id] || 0) * plan.mult(p) < p.need - 0.5);
    if (late.length) C.inbox(S, 'R&D closes at Kickoff', 'Research ends at Kickoff next month, and ' + late.map(p => p.name + ' (' + Math.round(100 * p.done / Math.max(1, p.need)) + '% done)').join(', ') + (late.length > 1 ? ' are' : ' is') + ' not on track to finish this month.', 'know', { prio: true, note: 'Unfinished research gets partial credit: know-how for the share that was done. Extra hours or a higher priority this month can still finish it.' });
  };
  C.chalTip = (S, c, o) => (o.fac < 1 ? 'A higher ' + G.Shop.item(c.fac).name + ' level raises the odds most.' : o.mech < D.CHAL.mech[1] - 5 ? 'Students with more mechanism skill raise the odds.' : 'Extra hours on the entry raise the odds a little.');
  C.registerOffseason = function (S, id) {
    const o = C.offEvent(S, id);
    if (!o) return 'Not held in your area'; // (3.5) no October event outside North America
    if (S.offReg.includes(id)) return 'Registered';
    if (!S.robot) return 'You need last season\'s robot';
    if (D.MONTHS.indexOf(o.month) < S.month) return 'Already past';
    if (o.invite && C.summit(S).inv !== C.cy(S)) return 'Invitation only: the teams that won an event this season as captain or first pick';
    { const same = C.offEvents(S).find(x => x.id !== id && x.month === o.month && S.offReg.includes(x.id)), both = C.summit(S).both === C.cy(S) && [id, same && same.id].includes(D.SUMMIT.id); // signed up for the October event at home before the invitation: both
      if (same && !both) return 'You are registered for the ' + same.name + ' that month: one event a month'; }
    { const e = C.afford(S, o.fee); if (e) return e; }
    C.spend(S, o.fee, 'Offseason: ' + o.name);
    S.offReg.push(id);
    (S.regUndo = S.regUndo || {})['off:' + id] = o.fee;
    return null;
  };
  // ======================= Feeder programs =======================
  // Up to 6 programs (FLL, FTC, camps, clubs), each with a development focus. They grow over three school years and
  // shape the next September's recruits: team size, overall talent and the skills their focus trains.
  C.programMaturity = pg => [0.6, 0.85, 1][Math.min(2, pg.years || 0)];
  C.programStage = pg => ['New', 'Growing', 'Established'][Math.min(2, pg.years || 0)];
  C.feederOutlook = function (S) {
    const list = S.programs || [];
    let mat = 0, size = 0, impact = 0;
    const attr = { drive: 0, aware: 0, comp: 0, mech: 0, hp: 0, strat: 0 };
    list.forEach(pg => { const F = D.FEEDER_FOCUS[pg.focus] || D.FEEDER_FOCUS.balanced, m = C.programMaturity(pg); mat += C.programPower(pg); size += F.size * m; impact += F.impact * m * (pg.own ? D.FTC_OWN.impact : 1); });
    const talent = 3 * mat, share = Math.min(0.85, 0.2 * mat);
    // expected bonus per recruit: general talent (0.4 per point) + the focus of the program they come from
    Object.keys(attr).forEach(k => { attr[k] = talent * 0.4; });
    if (mat) list.forEach(pg => { const F = D.FEEDER_FOCUS[pg.focus] || D.FEEDER_FOCUS.balanced, m = C.programPower(pg), w = share * m / mat; Object.keys(F.attr).forEach(k => { attr[k] += F.attr[k] * m * w; }); });
    return { n: list.length, mat, size, talent, share, impact, attr };
  };
  C.pickProgram = function (S, rng) {
    const list = S.programs || []; if (!list.length) return null;
    let r = rng.next() * U.sum(list.map(C.programPower));
    for (const pg of list) { r -= C.programPower(pg); if (r <= 0) return pg; }
    return list[list.length - 1];
  };
  // Your own FTC teams run in the FTC Team Space: one per facility level, each in a feeder program slot
  // (3.1.1) an own FTC team's season adds pg.ftcBoost to its pull on next September's recruits (news.js, FTC season review)
  C.programPower = pg => C.programMaturity(pg) * (pg.own ? D.FTC_OWN.power * (1 + (pg.ftcBoost || 0)) : 1);
  C.programCost = S => (S.programs || []).reduce((s, p) => s + (p.own ? D.FTC_OWN.cost : D.FEEDER_COST), 0);
  C.ownTeams = S => (S.programs || []).filter(p => p.own).length;
  C.ownMax = S => Math.round(G.Shop.fx(S, 'ftc', 'ftc', null, 1));
  // (3.1.1) How many outside feeder programs (FLL, camps, clubs, other schools' FTC) the team can run: 3, plus up to 3
  // more from its Business & Outreach Mentor (+1 at 2★, +2 at 4★) and its reputation (+1 at 50, +2 at 80), at most
  // D.FEEDER_MAX. Your own FTC teams don't count (the FTC Team Space limits them). Programs over the cap keep running.
  C.feederCap = function (S) {
    const biz = C.mentorStars(S, 'biz'), rep = S.rep || 0, fm = biz >= 4 ? 2 : biz >= 2 ? 1 : 0, fr = rep >= 80 ? 2 : rep >= 50 ? 1 : 0;
    return { n: Math.min(D.FEEDER_MAX, 3 + fm + fr), biz, rep, fm, fr };
  };
  C.outsidePrograms = S => (S.programs || []).filter(p => !p.own).length;
  C.feederCapWhy = S => { const c = C.feederCap(S); return 'Room for ' + c.n + ' feeder programs, your own FTC teams included: 3, ' + (c.fm ? '+' + c.fm + ' from your ' + c.biz + '★ Business & Outreach Mentor, ' : '') + (c.fr ? '+' + c.fr + ' from your reputation, ' : '') + 'at most ' + D.FEEDER_MAX + '. A Business & Outreach Mentor (2★, 4★) and reputation (50, 80) open more.'; };
  C.addProgram = function (S, focus, own, noCap) { // noCap: an older save's programs, which keep running
    S.programs = S.programs || [];
    if (S.programs.length >= D.FEEDER_MAX) return 'You can run at most ' + D.FEEDER_MAX + ' feeder programs';
    if (!noCap && S.programs.length >= C.feederCap(S).n) return C.feederCapWhy(S); // (3.5.1) the cap counts every program, your own FTC teams too
    if (own && C.ownTeams(S) >= C.ownMax(S)) return C.ownMax(S) ? 'Your FTC Team Space has room for ' + C.ownMax(S) + ' team' + (C.ownMax(S) > 1 ? 's' : '') + ': upgrade it in the Workshop for another' : 'Build an FTC Team Space in the Workshop first';
    const used = new Set(S.programs.map(p => p.name)), rng = G.R;
    let name, g = 0;
    do { name = own ? S.team.name + ' FTC ' + 'ABCDEF'[Math.min(5, C.ownTeams(S) + g)] : (D.feederName ? D.feederName(rng, S.team) : rng.pick(D.FEEDER_SCHOOLS) + ' ' + rng.pick(D.FEEDER_KINDS)); g++; } while (used.has(name) && g < 30);
    S.programs.push(Object.assign({ id: U.uid('fp'), name, focus: D.FEEDER_FOCUS[focus] ? focus : 'balanced', years: 0 }, own ? { own: true } : {}));
    if (own && !noCap) C.mailFtcWelcome(S, S.programs[S.programs.length - 1]); // (3.5.1) your first own FTC team: FIRST Tech Challenge writes
    S.feeders = S.programs.length;
    return null;
  };
  C.closeProgram = function (S, id) { S.programs = (S.programs || []).filter(p => p.id !== id); S.feeders = S.programs.length; };
  // Changing a program's focus retrains its coaches: it loses a year of growth (free while it is new)
  C.setProgramFocus = function (S, id, focus) {
    const pg = (S.programs || []).find(p => p.id === id);
    if (!pg || !D.FEEDER_FOCUS[focus] || pg.focus === focus) return;
    pg.focus = focus; pg.years = Math.max(0, (pg.years || 0) - 1);
  };
  C.setFeeders = function (S, n) { // dev and old callers: balanced programs up to n
    n = U.clamp(n, 0, D.FEEDER_MAX); S.programs = S.programs || [];
    while (S.programs.length < n && !C.addProgram(S, 'balanced'));
    while (S.programs.length > n) S.programs.pop();
    S.feeders = S.programs.length;
  };
  // older saves: a feeder count becomes that many established, balanced programs
  // (3.5) an area's name from before: every `region` in the save takes the new one
  function renameRegions(S) {
    const seen = new Set(), walk = o => {
      if (!o || typeof o !== 'object' || seen.has(o)) return; seen.add(o);
      if (typeof o.region === 'string' && D.REGION_OLD[o.region]) o.region = D.REGION_OLD[o.region];
      (Array.isArray(o) ? o : Object.values(o)).forEach(walk);
    };
    walk(S);
  }
  C.migrate = function (S) {
    // (3.5.2) Stop Build Day's choice could be left open by a pop-up that never showed: only the day itself chooses,
    // and a save past it keeps the robot that was bagged
    if (S.bagPick && !(S.phase === 'comp' && S.week === 1 && C.bagged(S) && G.Robot.runnable(S.robot, 0) && G.Robot.runnable(S.robot, 1))) delete S.bagPick;
    if (S.team && D.REGION_OLD && (D.REGION_OLD[S.team.region] || (S.teams && Object.values(S.teams).some(t => D.REGION_OLD[t.region])))) renameRegions(S);
    if (G.World.splitMiddleEast) G.World.splitMiddleEast(S); // 3.4.4: Anatolia leaves the Middle East
    if (S.team && !S.team.lead) S.team.lead = D.personName(G.makeRng(hashS('lead:' + S.team.num + ':' + S.team.name) || 3), S.team);
    // (3.5) The city a team stands in is settled for good (S.team.place). A save from before that keeps the city it
    // has today; a world from before 3.5 settles it when it grows (G.World: upgrade).
    if (S.team && S.team.place === undefined && G.Geo && !(G.World && G.World.legacy(S))) { try { S.team.place = [G.Geo.posOf(S, S.team, G.Geo.cyOf(S)).hub]; } catch (e) { /* no map for this save: it goes by the school's name */ } }
    // (3.5) people are named after their home now. A sponsor signed before that keeps the contact its letters had.
    (S.sponsors || []).forEach(sp => { if (!sp.contact && D.SPONSOR_MAIL) { const r = G.makeRng(hashS('contact:' + sp.name) || 7); sp.contact = { name: D.personName(r, 'intl'), role: r.pick(D.SPONSOR_MAIL.roles[sp.type] || D.SPONSOR_MAIL.roles.eng) }; } }); // (3.5) a save from before the lead mentor had a name: one is given (Mentors page to change it)
    { const RN = { 'Jordan Valley Water Engineering': 'Rift Valley Water Engineering' }, fix = t => (typeof t === 'string' ? Object.keys(RN).reduce((x, k) => x.split(k).join(RN[k]), t) : t); // (3.5) a sponsor renamed
      (S.sponsors || []).concat(S.offers || []).forEach(x => { if (RN[x.name]) { x.name = RN[x.name]; x.obligations = (x.obligations || []).map(fix); } });
      (S.activities || []).forEach(a => { a.sponsor = fix(a.sponsor); a.text = fix(a.text); }); }
    if (G.World.on(S) && S.teams && !G.World.elites(S).length && S.wseason) G.World.eliteSetup(S, G.R, S.wseason.cy); // 3.1: elite teams in a world from before
    if (S.equip && S.equip.kb && S.kbFor == null) S.kbFor = C.kbCycle(S); // v2.9.3: an existing Knowledge Base is up to date for now
    if (!S.programs) {
      const n = U.clamp(S.feeders || 0, 0, D.FEEDER_MAX);
      S.programs = [];
      for (let i = 0; i < n; i++) { C.addProgram(S, 'balanced', false, true); S.programs[i].years = 2; }
    }
    S.feeders = S.programs.length;
    // v2.9.9: End Effectors became their own knowledge area. Until then claws and grippers taught Arms & Wrists and Ground
    // Intakes, so a career starts it from half of the better of those two.
    if (S.know && S.know.effector == null) S.know.effector = Math.round(0.5 * Math.max(S.know.arm || 0, S.know.intake || 0));
    // (3.5.3) Robot parts add to a unit live now (G.Robot.partsLive) instead of raising the ceilings. A save from before
    // has that share inside its stats: what is above today's ceiling (which no longer counts parts) comes off, once.
    if (!S.liveParts) { try { trimToCeil(S); } catch (e) { /* no robot to trim */ } S.liveParts = 1; }
  };
  function trimToCeil(S) {
    const R = S.robot; if (!R || !R.bots || !R.design) return;
    const year = R.year, cut = (k, x) => {
      const c = x && x.stats && G.Seasons.concept(year, k, x.concept); if (!c || !c.ceil) return;
      Object.keys(x.stats).forEach(st => { if (c.ceil[st] == null) return; const cl = G.Robot.ceil(S, year, k, c, st); if (x.stats[st] > cl) x.stats[st] = cl; });
    };
    Object.keys(R.design).forEach(k => { if (R.design[k] && R.design[k].ver) cut(k, R.design[k]); });
    if (R.soft) cut('soft', R.soft);
    G.Robot.allUnits(R).forEach(u => cut(u.sub, u));
    (R.held || []).forEach(h => { if (h.u) cut(h.k, h.u); if (h.set && h.set.stats) cut(h.k, { concept: h.concept, stats: h.set.stats }); });
  }
  // STEM support fund: emergency money when the balance is under $1,000, at a cost in reputation. Twice per program year at most.
  C.stemFundInfo = function (S) {
    const key = G.Parts.buyIdx(S), used = S.stemFund && S.stemFund.key === key ? S.stemFund.n : 0;
    const amt = Math.round(U.clamp(D.STEM_FUND.below - S.money + 2000, 2000, D.STEM_FUND.max) / 500) * 500;
    return { ok: S.money < D.STEM_FUND.below && used < D.STEM_FUND.uses, left: D.STEM_FUND.uses - used, amt, rep: D.STEM_FUND.rep };
  };
  C.applyStemFund = function (S) {
    const f = C.stemFundInfo(S);
    if (S.money >= D.STEM_FUND.below) return 'The fund only helps teams with less than ' + U.money(D.STEM_FUND.below) + ' left';
    if (!f.ok) return 'You have used the STEM support fund ' + D.STEM_FUND.uses + ' times this program year';
    const key = G.Parts.buyIdx(S);
    S.stemFund = { key, n: (S.stemFund && S.stemFund.key === key ? S.stemFund.n : 0) + 1 };
    C.earn(S, f.amt, 'STEM support fund');
    S.rep = Math.max(0, S.rep - f.rep);
    C.letter(S, 'The district STEM support fund', 'STEM support fund approved', 'Your application has been approved: ' + U.money(f.amt) + ' to keep the team running this season. We know how hard it is to run a program like yours, and we are glad to help.', 'Best of luck,\nThe STEM support fund committee', { note: 'Word gets around that the team needed a bailout: reputation −' + f.rep + '.' });
    return null;
  };
})();
