'use strict';
/* FRC Manager — career systems: calendar & turns, finance, sponsors, staff, offseason, reviews, qualification */
(function () {
  const U = G.U, D = G.Data;
  const C = G.Career = {};
  const DIVS = ['Archimedes', 'Curie', 'Daly', 'Galileo', 'Hopper', 'Johnson', 'Milstein', 'Newton'];

  // ======================= helpers =======================
  C.inbox = function (S, title, body, kind, extra) {
    S.inbox.unshift(Object.assign({ id: U.uid('i'), title, body, kind: kind || 'info', date: C.dateLabel(S), read: false }, extra || {}));
    if (S.inbox.length > 120) S.inbox.length = 120;
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
  C.isFictional = S => !!(S && S.orderMode === 'random' && S.order && S.order.length > 1);
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
  C.drawGames = function (rng, cal) {
    const all = rng.shuffle(G.SEASON_YEARS.slice()), order = all.slice(0, cal.length), spare = all.slice(cal.length);
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
  C.newGame = function (o) {
    const seed = o.seed || ((Date.now() ^ Math.floor(Math.random() * 1e9)) & 0x7fffffff); // o.seed: dev tests only
    G.R = new G.Rng(seed);
    const rng = G.R, P = D.PROFILES[o.profile];
    // The calendar (v3): one season a year from the start year to 2026, except 2021. Real order plays each year's own
    // game; random order shuffles the games (technology, vendors, formats and events still follow the calendar).
    let cal = o.mode === 'single' ? [o.year] : G.calFrom(o.start || (G.startYears(o.order).includes(2022) ? 2022 : G.startYears(o.order)[0]));
    if (o.cal) cal = o.cal.slice(); // dev tests: any calendar under today's games
    let order;
    if (o.mode === 'single') order = [o.year];
    else if (o.order === 'random') order = C.drawGames(rng, cal);
    else order = cal.every(y => G.Seasons[y]) ? cal.slice() : G.SEASON_YEARS.slice(0, cal.length);
    if (o.games) order = o.games.slice(); // dev tests
    cal = cal.slice(0, order.length);
    const scen = o.scenario ? D.SCENARIOS.find(s => s.id === o.scenario) : null;
    const S = G.S = {
      v: 1, mode: o.mode, seed, team: Object.assign({}, o.team), profile: o.profile, diff: o.diff || 'normal', orderMode: o.order || 'real',
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
    // equipment / knowledge
    P.equip.forEach(e => { if (e === 'printer') S.equip.printer = 1; else if (e !== 'field') S.equip[e] = true; });
    G.Parts.setup(S, rng); // starting parts inventory, vendor release plan, stock
    if (P.equip.includes('field')) S.elemPre[order[0]] = [{ s: 1 }]; // powerhouse: a full field of elements on preorder
    G.Shop.migrate(S); // converts starting equipment into facility levels + condition
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
      if (S.team.home) { S.team.region = D.DISTRICT[S.team.home].region; if (!scen) S.maxEvents = 3; }
      G.World.setup(S, rng);
    } else {
      S.team.home = null;
      S.teams = G.AI.makePool(rng, 620, S.team.num, cal[0]); // team numbers follow the calendar year
      G.AI.addRookies(S.teams, rng, order[0], 12, S.team.num, cal[0]);
    }
    C.refreshMarket(S);
    if (!G.World.on(S)) S.regionals = D.makeRegionals(order[0], rng);
    if (o.mode === 'career') {
      C.genOffers(S);
      G.Parts.teaser(S);
      { const eb = C.eraBrief(S); if (eb) C.inbox(S, eb.title, 'What the sport looks like as your career begins:\n\n' + eb.lines.map(x => '• ' + x).join('\n') + '\n\nAll of this changes over the years. The big changes arrive as pop-ups, and a recap after every season tells the story of the year.', 'info'); }
      C.inbox(S, 'Welcome, Lead Mentor', 'You lead ' + S.team.num + ' ' + S.team.name + '. It is October — the first game is revealed in January.\n\nBefore Kickoff: sign sponsors (Finance), hire mentors, buy facilities (Workshop) and parts (Inventory), start pre-season research (Design Office) and register for regionals (Calendar). Press Continue to advance a month.', 'info');
      C.inbox(S, ...C.regNotice(S)); // the career starts in October: registration is already open
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
    const types = Object.keys(D.SPONSOR_TYPES);
    const used = new Set(S.sponsors.map(s => s.name));
    const make = (slot) => {
      const tk = slot === 'title' ? rng.pick(types.filter(t => D.SPONSOR_TYPES[t].title)) : slot === 'grant' ? 'found' : rng.pick(types.filter(t => !D.SPONSOR_TYPES[t].grant));
      const T = D.SPONSOR_TYPES[tk];
      let name; let g = 0; do { name = rng.pick(D.SPONSOR_NAMES[tk]); g++; } while (used.has(name) && g < 10);
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
      const perk = T.perks.length && rng.chance(slot === 'title' ? 0.9 : 0.6) ? rng.pick(T.perks) : (slot !== 'grant' && rng.chance(0.15) ? 'travelDiscount' : null);
      const exp = high && slot !== 'grant' ? 'High' : T.exp;
      return { id: U.uid('o'), name, type: tk, typeName: T.name, slot, base, length: slot === 'grant' ? 1 : rng.int(1, 3), goals, obligations, perk, exp };
    };
    for (let i = 0; i < 3; i++) offers.push(make('title'));
    for (let i = 0; i < 6; i++) offers.push(make('partner'));
    for (let i = 0; i < rng.int(1, 2); i++) offers.push(make('grant'));
    S.offers = offers;
  };
  C.partnerSlots = S => 4 + (S.mentors.some(m => m.role === 'biz') ? 1 : 0);
  C.signSponsor = function (S, offerId, silent) {
    const o = S.offers.find(x => x.id === offerId);
    if (!o) return 'Offer not found';
    if (o.slot === 'title' && S.sponsors.some(s => s.slot === 'title')) return 'You already have a title sponsor';
    if (o.slot === 'partner' && S.sponsors.filter(s => s.slot === 'partner').length >= C.partnerSlots(S)) return 'All partner slots are full';
    if (o.slot === 'grant' && S.sponsors.some(s => s.slot === 'grant')) return 'You can only hold one grant at a time';
    const sp = Object.assign({}, o, { seasonsLeft: o.length, sat: 60, paidYear: null, goals: o.goals.map(g => Object.assign({}, g)) });
    S.sponsors.push(sp);
    S.offers = S.offers.filter(x => x !== o);
    sp.undo = { turn: turnKey(S), offer: JSON.parse(JSON.stringify(o)), paid: 0 };
    const bizBoost = S.mentors.some(m => m.role === 'biz') ? 1.1 : 1;
    if (S.phase !== 'off') { const amt = Math.round(sp.base * bizBoost); C.earn(S, amt, 'Sponsor: ' + sp.name); sp.paidYear = S.year; sp.paidAmt = amt; sp.undo.paid = amt; C.scheduleActivities(S, sp); }
    if (!silent) C.inbox(S, 'Signed: ' + sp.name, (sp.slot === 'title' ? 'Title sponsor' : sp.slot === 'grant' ? 'Grant' : 'Partner sponsor') + ' — ' + U.money(sp.base) + ' per season for ' + sp.length + ' season(s).' + (S.phase === 'off' ? ' First payment arrives at Kickoff.' : ''), 'money');
    return null;
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
    const mi = S.inbox.findIndex(m => m.title === 'Signed: ' + sp.name);
    if (mi >= 0) S.inbox.splice(mi, 1);
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
      else if (sp.slot === 'grant') r.ending.push(sp.name);
      else {
        // the same sums as the season review: renewal chance = satisfaction, new base 90%..130% of the old one
        const p = U.clamp(sp.sat / 100, 0, 1), nb = Math.round(Math.round(sp.base * (0.9 + sp.sat / 250) / 250) * 250 * biz);
        r.renew.push({ name: sp.name, chance: p, base: nb, bonus: gb }); r.renewBase += nb; r.renewBonus += gb; r.expected += p * nb;
      }
    });
    r.expected = Math.round((r.contract + r.expected) / 50) * 50;
    const sl = C.sponsorSlots(S);
    r.open = ['title', 'partner', 'grant'].map(k => ({ k, n: sl[k].max - sl[k].n })).filter(x => x.n > 0);
    return r;
  };
  // How good an offer looks: yearly money, contract length, likely bonuses and perks, minus obligations and risky expectations
  C.offerValue = function (S, o) {
    const strong = C.highExpect(S) || S.rep >= 60;
    const bonus = U.sum(o.goals.map(g => g.bonus * (({ win: 0.25, champs: 0.25, playoffs2: 0.45 })[g.id] || 0.6)));
    return o.base * (1 + 0.12 * (o.length - 1)) + bonus * 0.5 + (o.perk ? 600 : 0) - 450 * o.obligations.length - (o.exp === 'High' && !strong ? o.base * 0.25 : 0);
  };
  // Fill every open slot with the best offers (title, partners, grant)
  C.autoSponsors = function (S) {
    const signed = [];
    ['title', 'grant', 'partner'].forEach(slot => {
      const list = S.offers.filter(o => o.slot === slot).sort((a, b) => C.offerValue(S, b) - C.offerValue(S, a));
      for (const o of list) { if (C.signSponsor(S, o.id, true)) break; signed.push(o.name); }
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
    S.sponsors.forEach(sp => sp.goals.forEach(g => {
      if (!g.met && check[g.id]) {
        g.met = true;
        const bonus = g.bonus * (C.hasPerk(S, 'bonusBoost') && sp.perk === 'bonusBoost' ? 1.5 : 1);
        g.paid = bonus;
        C.earn(S, bonus, 'Bonus: ' + sp.name + ' — ' + C.goalText(S, D.GOALS[g.id].text));
        sp.sat = Math.min(100, sp.sat + 10);
        C.inbox(S, 'Sponsor bonus: ' + U.money(bonus), sp.name + ' is thrilled: "' + C.goalText(S, D.GOALS[g.id].text) + '" achieved.', 'money');
      }
    }));
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
    if (m.cost) C.spend(S, m.cost, 'Mentor: ' + m.name);
    m.paid = true; m.contract = Math.max(1, m.contract);
    C.mentorMeta(S, m); m.ten = 0;
    S.mentors.push(m); S.market = S.market.filter(x => x !== m);
    S.morale = Math.min(100, S.morale + 2);
    C.inbox(S, 'Mentor joined: ' + m.name, D.MENTOR_ROLES.find(r => r.id === m.role).name + ' (' + U.stars(m.stars) + ').', 'staff');
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
      add('c' + r.week, 'event', (done ? '✓ ' : '') + r.name + (res ? ' — ' + res.finish : ' (' + D.TRAVEL[D.travelTier(S.team.region, r.region, r.local)].name.toLowerCase() + ')'), done ? 'good' : 'acc');
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
    D.OFFSEASON_EVENTS.forEach(e => {
      const i = D.MONTHS.indexOf(e.month), reg = S.offReg.includes(e.id), done = S.eventsDone[e.id + S.year];
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
      const o = D.OFFSEASON_EVENTS.find(x => S.offReg.includes(x.id) && x.month === D.MONTHS[S.month]);
      if (o && !S.eventsDone[o.id + S.year]) return { def: { id: o.id + S.year, kind: 'offseason', name: o.name, size: o.size, str: 3, week: 0 } };
    }
    return null;
  };
  // How the team gets there: local, drive, fly — or, with a team trailer, a long drive instead of flying the robot
  C.travelMode = function (S, def) {
    if (def.kind === 'einstein') return 'none';
    let tier = def.kind === 'champs' ? 'fly' : def.kind === 'dcmp' ? 'drive' : def.kind === 'regional' ? D.travelTier(S.team.region, def.region, def.local) : 'local';
    if (def.kind === 'offseason') tier = 'drive';
    if (tier === 'fly' && G.Shop.lvl(S, 'trailer')) return 'trailer';
    return tier;
  };
  C.travelCost = function (S, def) {
    if (def.kind === 'einstein') return 0;
    const mode = C.travelMode(S, def), tier = mode === 'trailer' ? 'fly' : mode;
    let c = D.TRAVEL[tier].cost * (def.kind === 'offseason' ? 0.4 : 1) * (mode === 'trailer' ? D.TRAILER_LONG : 1);
    if (tier !== 'fly') c *= G.Shop.travelMult(S);
    if (C.hasPerk(S, 'travelDiscount')) c *= 0.75;
    return Math.round(c);
  };
  C.startEvent = function (S, def) {
    if (S.event) return S.event; // never overwrite an event in progress
    S.lastEventTurn = turnKey(S);
    if (def.kind !== 'einstein') {
      const tc = C.travelCost(S, def);
      if (tc) C.spend(S, tc, 'Travel: ' + def.name);
      if (def.kind === 'dcmp') C.spend(S, D.FEES.dcmp, 'Registration: ' + def.name);
    }
    if (def.kind === 'einstein') return C.startEinstein(S, def);
    const fly = C.travelMode(S, def) === 'fly';
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
      if (fly) hit(() => G.R.range(4, 9), 'The robot was shipped by air and took some knocks in transit.');
      if (S.demoWear && S.demoWear.key === turnKey(S)) { hit(() => S.demoWear.amt, 'The sponsor demo earlier this week left wear the team had no time to fix.'); }
      S.demoWear = null;
      arrival.cond = Math.round(G.Robot.condAvg(S));
    }
    if (S.robot && G.Robot.held(S).length && S.team.home && G.World.on(S) && (def.dist || def.kind === 'dcmp')) {
      const fit = G.Robot.installHeld(S);
      if (fit.length) arrival.notes.push('Robot access window: in the six hours before the event the team fitted ' + fit.join(', ') + '.');
    }
    if (['regional', 'dcmp', 'champs'].includes(def.kind)) G.Parts.loyalSample(S);
    const ev = G.Ev.start(Object.assign({ year: S.year }, def));
    ev.batts = S.parts.batts.map(() => 1);
    ev.arrival = arrival;
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
    const fly = C.travelMode(S, def) === 'fly';
    if (fly) { notes.push('flying (−4–9%)'); cond -= 6.5; }
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
    const strong = Object.values(S.teams).filter(t => !exclude.has(t.num)).sort((a, b) => b.str - a.str).slice(0, 60);
    rng.shuffle(strong);
    const alliances = [myAll];
    for (let i = 0; i < (S.cal ? CH.divs : 8) - 1; i++) alliances.push(strong.slice(i * 3, i * 3 + 3).map(t => t.num));
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
    const ment = U.sum(S.mentors.map(m => m.hours)) + (C.hasPerk(S, 'tempMentor') ? 10 : 0) + G.Shop.guestHours(S);
    const moraleM = 0.8 + 0.3 * S.morale / 100, boost = 1 + G.Shop.boostHours(S);
    const total = Math.round((stud + ment) * mult * moraleM * boost);
    if (!breakdown) return total;
    return { total, stud, ment, perStudent, students: S.studentsCount, mult, why, moraleM, boost };
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
    return { total: h, drive, dev: h - drive, unlocked: true, limited: !lvl, elem, canDrive, unit: S.phase === 'off' ? 'month' : 'week' };
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
    else C.inbox(S, 'Stop Build Day', 'The competition robot is in the bag until the season ends. ' + (second ? 'Your second robot carries the work: hardware projects keep their full speed, and the drivers practise on it.' : 'With no second robot, hardware projects run at half speed and the drive team cannot practise at home.') + ' New mechanisms and upgrades you finish now are packed and fitted on practice day at your next event (Install Upgrade). Software and research carry on as usual.', 'dev');
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
  C.autoExtraTarget = S => (['kickoff', 'build', 'comp'].includes(S.phase) ? 0.1 : S.phase === 'off' ? 0 : null);
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
    if (S.lostYear && S.lostYear.stage === 'choose') b.push('Choose the team\'s two programs for the year at home (Headquarters).');
    if (S.loyalOffer && S.loyalOffer.stage === 'choose') b.push('Choose your loyalty sponsorship from ' + D.VENDORS[S.loyalOffer.brand].name + ' (Headquarters).');
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
      case 'kickoff': { const r = processWork(S, hours, th); fatigueWeek(S, hours, r.spare, false); S.phase = 'build'; S.week = 1; break; }
      case 'build': processWeek(S, hours, th); if (S.week >= 7) { S.phase = 'comp'; S.week = 1; C.bagDay(S); } else S.week++; break;
      case 'comp': processWeek(S, hours, th); if (G.World.on(S)) G.World.weekDone(S, S.week); if (S.week >= 7) C.toChamps(S); else S.week++; break;
      case 'champs': C.toReview(S); break;
      case 'review': C.endReview(S); break;
    }
    // new turn: random news, team chatter, (rarely) a shop incident or a school/sponsor opportunity
    if (['off', 'build', 'comp'].includes(S.phase)) { G.News.turn(S); G.Shop.rollIncident(S); G.Shop.rollBoost(S); C.rollDonation(S); }
    G.Parts.rollStock(S);
    if (S.phase === 'build' || S.phase === 'comp') C.weeklySuggestion(S);
    S.overtime = false;
    S.sponsors.forEach(sp => { delete sp.undo; });
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
    const r = G.Robot.work(S, hours, mods, th ? th.dev : 0, !!(th && th.limited));
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
    let d = (D.FATIGUE_IDLE - f) * D.FATIGUE_SLOPE * (eventWeek ? 0.5 : 1), drift = (D.FATIGUE_BASE - before) * 0.08;
    if (S.overtime) { d = Math.max(0, d) + D.FATIGUE_OVERTIME; drift = Math.max(0, drift); }
    if (eventWeek) d += S.team.home && G.World.on(S) && S.week <= 5 ? D.FATIGUE_DISTRICT : D.FATIGUE_EVENT;
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
    S.morale = Math.round(S.morale + (62 - S.morale) * 0.15);
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
      (S.programs || []).forEach(pg => { pg.years = (pg.years || 0) + 1; });
      const via = Object.keys(from).map(k => from[k] + ' from ' + k).join(', ');
      C.inbox(S, 'New school year', n + ' new students joined (' + S.studentsCount + ' total).' + (waitlist > 0 ? ' The team is full at ' + D.STUDENT_CAP + ' students: ' + waitlist + ' more applied and went on the waiting list.' : '') + (via ? ' Core recruits: ' + via + '.' : '') + ' School funding: ' + U.money(fund) + '.' + (np ? ' Feeder programs: ' + U.money(C.programCost(S)) + '.' : ''), 'staff');
    }
    if (mo === 'Oct') {
      // a team that chose to join a new district plays there from the season now being planned
      if (S.team.homeNext) { S.team.home = S.team.homeNext; delete S.team.homeNext; if (!S.scenario) S.maxEvents = Math.min(S.maxEvents, 3); }
      C.genOffers(S);
      if (G.World.on(S)) G.World.plan(S, rng); else S.regionals = D.makeRegionals(S.order[S.upcoming] || S.year, rng);
      S.registered = []; S.scrimmage = false;
      C.inbox(S, 'Sponsor season', 'New sponsor offers are in (Finance).', 'money');
      C.inbox(S, ...C.regNotice(S));
    }
    if (mo === 'Nov') C.inbox(S, 'Drive team tryouts', 'Pick next season\'s drive team on the Team screen.', 'staff');
    // November: last call for next season's field elements (preorders arrive with the Kit of Parts and never sell out)
    if (mo === 'Nov' && S.mode === 'career' && G.Parts.nextYear(S) != null && !G.Parts.elemPending(S, G.Parts.nextYear(S)).length) { C.inbox(S, ...C.preorderNotice(S)); (S.launchQueue = S.launchQueue || []).push({ kind: 'preorder' }); }
    if (mo === 'Dec' && S.mode === 'career' && !S.registered.length) C.inbox(S, 'Kickoff is next month: register first', 'The team is not registered for any ' + C.evWord(S) + ' yet. Sign up for at least one in the Calendar this month: the season cannot start without one.', 'event');
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
        (d ? ' Your district, the ' + d.name + ', has ' + G.World.sizeOf(d, su.cy) + ' teams; the top ' + d.dcmp + ' reach its District Championship and about ' + G.World.slots(S, d) + ' go on to the Championship.' : '') +
        ' The ' + (d ? 'District' : 'World') + ' page follows every event.', 'info');
    }
    else if (!first) G.AI.addRookies(S.teams, rng, S.year, 10, S.team.num, S.cal ? C.cy(S) : null);
    Object.values(S.teams).forEach(t => t.rb = null);
    if (!S.season || S.season.year !== S.year) { const imp = S.season ? S.season.impact : 0, out = S.season ? S.season.outreach : 0, done = !!(S.season && S.season.impactDone), fundN = (S.season && S.season.fundN) || {}; S.season = newSeasonState(S.year); S.season.impact = imp; S.season.outreach = out; S.season.impactDone = done; S.season.fundN = fundN; }
    S.season.year = S.year;
    G.Robot.newSeason(S, S.year);
    G.Parts.kickoff(S, first);
    // spare parts are specific to each game: last season's stock is no use now
    if (S.parts.spares) C.inbox(S, 'Spare parts cleared out', 'Last season\'s ' + S.parts.spares + ' spare parts don\'t fit the new game. Restock before your first event (Inventory), or turn on auto-restock.', 'dev');
    S.parts.spares = 0; S.parts.spareUse = 0;
    S.usedAreas = {}; S.practiceWeeks = 0; S.defDrill = 0; S.elecShake = 0; S.lastTune = 0; S.lastConf = 0; S.champsDeclined = false; S.pendingEinstein = false;
    S.champsDiv = rng.pick(S.cal ? C.champs(S).div : DIVS);
    if (!S.regionals.length || S.regionals[0].year !== S.year) S.regionals = D.makeRegionals(S.year, rng);
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
    // a district team's ladder: the District Championship, the district's top ten, a district event win, the Championship
    else if (r < 75) ids = dist ? ['dcmp', 'dTop10', 'champs'] : ['playoffs1', 'winEvent', 'champs'];
    else ids = dist ? ['dTop10', 'winEvent', 'champs'] : ['playoffs2', 'winEvent', 'champs'];
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
    return null;
  };
  // Until you press Continue, a registration made this turn can be taken back for everything it cost. Keys: a regional's
  // id, 'off:' + an offseason event's id, 'scrim'. (After that it is a withdrawal: half back a month ahead, else nothing.)
  C.regUndoable = (S, key) => !!(S.regUndo && S.regUndo[key] != null);
  C.undoRegister = function (S, key) {
    if (!C.regUndoable(S, key)) return 'That registration is final: withdraw instead';
    let back = 0, name = '';
    if (key === 'scrim') { S.scrimmage = false; back = S.regUndo[key]; name = 'Week 0 scrimmage'; }
    else if (String(key).indexOf('off:') === 0) { const o = D.OFFSEASON_EVENTS.find(x => x.id === key.slice(4)); S.offReg = S.offReg.filter(x => x !== o.id); back = S.regUndo[key]; name = o.name; }
    else {
      // the fee schedule counts places, so the place given back is the last one paid for (plus this one's late fee)
      const r = S.regionals.find(x => x.id === key);
      S.registered = S.registered.filter(x => x !== key);
      back = C.regFee(S) + S.regUndo[key]; name = r ? r.name : 'event';
    }
    delete S.regUndo[key];
    if (back) C.spend(S, -back, 'Registration undone: ' + name);
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
    const o = D.OFFSEASON_EVENTS.find(x => x.id === id);
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
    return null;
  };
  C.markFull = function (S) { S.regionals.forEach(r => { if (!S.registered.includes(r.id) && G.R.chance(0.3)) r.full = true; }); };

  // ======================= match hooks =======================
  C.beforePlayerMatch = function (S, ev, opts) {
    const turn = ev.lastPlayerMatch < 0 ? 0 : (ev.stage === 'playoffs' ? G.Ev.poTurnaround(ev) : G.Ev.turnaround(ev));
    ev.lastTurn = turn;
    ev.pmSeq = (ev.pmSeq || 0) + 1; // one Super pit full repair per match
    if (ev.lastPlayerMatch >= 0 || ev.stage === 'playoffs') {
      const sp = G.Robot.pitRepair(S, turn, opts && opts.timeout ? 2.5 : 1);
      ev.lastRepair = sp;
    }
    // simulated matches: the Super pit crew fully repairs whatever is in the worst shape
    if (opts && opts.sim && G.Shop.superPit(S) && S.robot) {
      const R = S.robot, ks = Object.keys(R.subs).filter(k => k !== 'soft' && R.subs[k] && R.subs[k].ver && R.subs[k].cond < 99.5).sort((a, b) => R.subs[a].cond - R.subs[b].cond);
      if (ks.length) { const r = G.Robot.superFix(S, ev, ks[0]); if (r && typeof r === 'object') ev.lastRepair = (ev.lastRepair || 0) + r.used; }
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
  C.regNotice = function (S) {
    const d = S.team.home && G.World.on(S) ? D.DISTRICT[S.team.home] : null;
    return [(d ? 'District event' : 'Regional') + ' registration is open', 'Sign up for next season\'s ' + (d ? d.name + ' events' : 'regionals') + ' in the Calendar while every event still has spots. ' +
      (d ? 'Two district events cost ' + U.money(D.FEES.firstRegional) + ', a third ' + U.money(D.FEES.extraDistrict) + ' (no points).' : 'The first regional costs ' + U.money(D.FEES.firstRegional) + ', each one after it ' + U.money(D.FEES.addRegional) + '.') +
      ' After Kickoff some events fill up and late registration costs ' + U.money(D.FEES.late) + ' more; withdrawing at least a month ahead returns half the fee.\n\n' +
      'Stronger fields (more ★) are harder to win but teach the team more: drive-team skills, know-how and strategy read grow ×' + (1 - 2 * D.EVENT_EXP).toFixed(1) + ' at ★ and ×' + (1 + 2 * D.EVENT_EXP).toFixed(1) + ' at ★★★★★.', 'event'];
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
    const xm = C.expMult(ev), dt = C.driveTeam(S), mult = (match.playoff ? 1.5 : 1) * (ev.kind === 'champs' || ev.kind === 'einstein' ? 1.5 : 1) * (ev.kind === 'offseason' ? 2 : 1) * xm;
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
    if (!S.season) return 0;
    const dt = C.driveTeam(S);
    return U.clamp(0.05 + 0.3 * C.mentorSkill(S, 'strat') / 100 + 0.2 * (dt.coachStrat || 30) / 100
      + 0.3 * Math.min(1, S.season.metaSeen || 0) + 0.15 * Math.min(1, (S.practiceWeeks || 0) / D.DRILL_CAP), 0, 1);
  };
  C.onEventDone = function (S, ev) {
    const r = ev.result;
    // watching other alliances teaches the meta (more when it is common at the event, and with scouting focus)
    if (S.season && ev.year === S.year && ev.kind !== 'einstein') {
      const fs = ev.feedStats, share = fs && fs.n ? fs.f / fs.n : 0;
      S.season.metaSeen = (S.season.metaSeen || 0) + (0.12 + 0.6 * share + 0.08 * ((ev.scoutBonus || 0) + (G.Shop.superPit(S) ? 1 : 0))) * C.expMult(ev);
    }
    S.lastTune = ev.tune; S.lastConf = ev.conf;
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
      if (r.won) { S.season.worldChamp = true; S.worldChamps++; S.rep = 100; S.morale = 100; S.lastChamp = S.year; S.lastChampSi = S.si; S.season.wc = C.wcData(S, ev); C.inbox(S, 'WORLD CHAMPIONS!', 'Your alliance won Einstein. Unbelievable season!', 'event');
        // 2017: two Championships, two champion alliances, and one more event to settle it
        const CH = S.cal ? C.champs(S) : null;
        if (CH && CH.final) { S.festival = { cy: C.cy(S), gy: S.year, city: CH.city, otherCity: CH.cities[1 - CH.side], alliance: ev.alliances[G.Ev.playerAlliance(ev)].slice(), pending: true };
          C.inbox(S, 'Invitation: the Festival of Champions', 'There were two Championships this year, so there are two champion alliances. In July the ' + CH.city + ' and ' + CH.cities[1 - CH.side] + ' champions meet for a best-of-five to settle it. The organisers pay the trip for both alliances, and a champion alliance does not stay home: the event is on your calendar and cannot be skipped. Keep the robot ready.', 'event'); } }
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
      if (why) { S.season.champsQualified = true; S.season.champsReason = why; C.inbox(S, 'Qualified for the Championship!', why + '. Register when the Championship turn arrives.', 'event'); }
    }
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
    const d = { kind: won ? 'winner' : 'finalist', year: F.cy, gyear: ev.year, game: (G.Seasons[ev.year] || {}).name || '', city: F.city, otherCity: F.otherCity, team: { num: me, name: S.team.name, c1: S.team.c1 },
      alliance: ev.alliances[pa].map(t => ({ num: t, name: nm(t) })), opp: ev.alliances[1 - pa].map(t => ({ num: t, name: nm(t) })), games, w, l, driver, coach, sponsor,
      comeback: won && games.length > 3 && !games[0].won && !games[1].won, letSlip: !won && games.length > 3 && games[0].won && games[1].won, sweep: games.length === 3 };
    const pool = won ? [
      ['Two champions was one too many. Now there is one.', 'the Festival emcee'],
      ['We drove a thousand miles in July to watch ' + (games.length === 5 ? 'five' : games.length === 4 ? 'four' : 'three') + ' matches. I would do it again tomorrow.', 'a parent in the stands'],
      [driver.split(' ')[0] + ' has now won the last match of the season twice in one year.', 'your lead mentor'],
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
      ['We are still World Champions of ' + F.city + '. It says so on the wall.', 'your lead mentor'],
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
    const d = { gyear: gy, year, game: Sz.name || '', fict: C.isFictional(S), div: S.champsDiv || '', city: CHw && CHw.n > 1 ? CHw.city : '', team: { num: me, name: S.team.name },
      alliance: al.map(t => ({ num: t, name: nm(t) })), fw, fl, opp: oc != null ? { num: oc, name: nm(oc), div: ev.divNames && opp != null ? ev.divNames[opp] : '' } : null,
      driver, coach, coachIsMentor: !dt.coach, sponsor, streak, titles, syears, lastFinalist,
      lastTitleYear: streak < 2 && before.length ? C.calYear(S, before[before.length - 1].year) : null, rookie: S.team.rookieYear === gy };
    const again = streak === 2 ? '… for the second year in a row' : streak > 2 ? '… for the ' + U.ord(streak) + ' year in a row' : titles > 1 ? ', champions once more' : '';
    const pool = [
      ['I can\'t feel my hands. Did we actually just win that?', driver + ', driver'],
      coach ? ['Every call in that final was one we had drilled. All I did was say them out loud.', coach + ', drive coach'] : null,
      ['At Kickoff I told them we could make it here. I wasn\'t sure I believed it. They did.', 'your lead mentor'],
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
    const d = { kind, gyear: gy, year: C.calYear(S, gy), game: (G.Seasons[gy] || {}).name || '', team: { num: me, name: S.team.name }, score: ci.score, speakers, mentor: biz ? biz.name : null,
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
  C.makeProf = function (role, r) {
    const p = r.pick(D.PROFESSIONS[role] || D.PROFESSIONS.design), k = p[2];
    return { t: p[0], area: p[1], at: k === 'school' ? r.pick(D.SCHOOLS) + ' High School' : r.pick(D.SPONSOR_NAMES[k] || D.SPONSOR_NAMES.eng) };
  };
  C.profLine = p => (p ? p.t + (p.at ? ' at ' + p.at : '') : 'Mentor');
  // a mentor's background: profession, years in FIRST and seasons with this team (filled in once from the mentor's own id)
  C.mentorMeta = function (S, m) {
    if (m.prof && m.exp != null && m.ten != null) return m;
    const r = wRng('mentor:' + m.id + ':' + m.name);
    if (!m.prof) m.prof = C.makeProf(m.role, r);
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
      : { e: e.id, ename: e.name, team: x.team, name: D.personName(r), prof: C.makeProf(r.pick(roles), r), v: x.v });
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
    C.inbox(S, 'Einstein: an invitation from the Woodie Flowers Award committee', 'The committee has asked ' + W.name + ' and the team to be on Einstein for the Championship awards. The FIRST Impact Award and the Woodie Flowers Award are presented there, between the finals. Go to Einstein from Headquarters: the trip is part of the Championship and costs nothing.', 'event');
  };
  C.wfaCele = function (S) {
    const c = S.season.wfaCmp, W = c.winner, m = S.mentors.find(x => x.id === W.mid) || { name: W.name, prof: W.prof, ten: 0, exp: 0, role: 'design' };
    const w = S.season.wfa || {}, cy = C.calYear(S), writers = (w.writers || C.wfaWriters(S).map(s => s.name)).slice(0, 2);
    const role = (D.MENTOR_ROLES.find(r => r.id === m.role) || {}).name || 'Mentor';
    const past = Object.keys(D.REAL_WFA).map(Number).filter(y => y < cy).sort((a, b) => b - a), pick = past.slice(0, 4).concat(past.includes(1996) && !past.slice(0, 4).includes(1996) ? [1996] : []);
    const d = { year: cy, team: { num: S.team.num, name: S.team.name }, name: m.name, prof: W.prof, role, ten: m.ten || 0, exp: m.exp || 0, how: W.how, of: c.of, writers,
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
    for (let i = 0; i < D.WFA.past && ts.length; i++) S.wfaPast.push({ name: D.personName(r), team: r.pick(ts), prof: C.makeProf(r.pick(roles), r), v: U.clamp(r.norm(74, 6), 55, 96), cy: (S.cal ? S.cal[0] : S.year) - r.int(1, 12) });
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

  // ======================= a new district forms =======================
  // July: a district that forms next season is announced. A regional team in its area chooses whether to join; everybody
  // else reads the story.
  C.districtNews = function (S) {
    if (!G.World.on(S) || S.mode !== 'career') return;
    const cy = C.cyNext(S); if (!cy) return;
    S.storySeen = S.storySeen || {};
    D.DISTRICTS.filter(d => d.from === cy && !S.storySeen['dist_' + d.id]).forEach(d => {
      const I = G.World.formInfo(S, d, cy);
      if (!S.team.home && S.team.region === d.region) {
        S.storySeen['dist_' + d.id] = 1;
        S.districtOffer = { id: d.id, cy, stage: 'choose' };
        C.inbox(S, I.title, I.body.join('\n\n') + '\n\nYour school is inside the new district\'s borders. Decide whether to join it or stay a regional team (Headquarters).', 'event');
        (S.launchQueue = S.launchQueue || []).push({ kind: 'district' });
      } else C.tellStory(S, { id: 'dist_' + d.id, at: 'off:2', tag: 'DISTRICT NEWS', color: d.color, title: I.title, body: I.body, talk: D.DISTRICT_TALK,
        means: [S.team.home ? 'Your own district is not affected.' : 'You are not in its area: your team stays with the regionals.', 'The ' + d.region + ' runs fewer regionals from ' + cy + ', so teams from there will turn up at events elsewhere.', 'More Championship places are now decided by district points.'] });
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
      (hs.awards && hs.awards.length ? ' ' + hs.awards.length + ' award' + (hs.awards.length === 1 ? '' : 's') + '.' : '');
  };
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
    lines.push(era.swerve.cots ? 'Swerve: modules are sold in the Inventory' + (cy < 2022 ? ' (Apex only, for now).' : '.') : 'Swerve: nobody sells modules. A swerve drive means machining your own (a CNC Router or a Lathe, ' + (era.swerve.hours >= 2 ? 'twice' : 'one and a half times') + ' the build hours, and it is fragile).');
    lines.push(!era.vision.cam ? 'Vision: home-made. No camera is sold; Vision Level 1 takes twice the hours and Level 2 is out of reach.' : era.vision.tags ? 'Vision: Lanternworks sells the Lantern 2 camera, a network switch and the Spark ML accelerator, and the field has AprilTags, so vision also helps autonomous.' : 'Vision: Lanternworks sells the Lantern 1 camera and a network switch; the camera tracks reflective tape (auto-aim), not yet the robot\'s position.');
    if (cy >= 2017) lines.push('Gearboxes: both vendors sell planetary gearboxes for mechanism motors (optional, fewer breakdowns), and a low-profile one comes in every Kit of Parts.');
    lines.push('Pneumatics: a kit saves ' + Math.round(era.pneu * 100) + '% of the hours on intake, manipulator, end effector, climber and adjustable-hood shooter builds' + (era.servo ? '; a servo actuator kit saves ' + Math.round(era.servo * 100) + '% (the better of the two counts).' : '.'));
    if (cy >= 2018) lines.push('Pits: the top teams roll in a Super pit in road cases (the top level of Pit Setup): a full repair of one subsystem before every match.');
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
    if (tot >= C.poolThreshold(S)) { S.season.champsQualified = true; S.season.champsReason = 'Regional Pool wildcard (' + tot + ' pts)'; C.inbox(S, 'Championship wildcard!', 'Your Regional Pool total of ' + tot + ' points earned a Championship spot.', 'event'); }
    else if (S.season.events.length) C.inbox(S, 'Regional Pool', 'Your pool total was ' + tot + ' points; the wildcard cut-off was ' + C.poolThreshold(S) + '. No Championship invitation this year.', 'event');
  }
  C.toChamps = function (S) {
    if (!S.season.champsQualified && !(S.team.home && G.World.on(S)) && !C.wildEra(S)) poolCheck(S); // a district team's place comes from its district's list; before 2025 there is no pool
    if (!S.season.champsQualified && S.mode === 'career' && (S.lastChampSi != null ? S.lastChampSi === S.si - 1 : S.lastChamp === S.year - 1 && S.orderMode === 'real')) { S.season.champsQualified = true; S.season.champsReason = 'Defending champions'; }
    if (!S.season.champsQualified && S.hallOfFame != null && S.hallOfFame < S.si) { S.season.champsQualified = true; S.season.champsReason = 'Hall of Fame team'; }
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
    C.inbox(S, 'From the school board: your workshop', 'The board reviewed the robotics program this week (Program Support ' + Math.round(S.support) + ', ' + (dSup >= 0 ? '+' : '') + Math.round(dSup) + ' this season).\n\n' +
      (b.space ? '• More room: the team moves into ' + b.space.name + '. Your workshop grows from ' + b.space.from.toLocaleString('en-US') + ' to ' + b.space.to.toLocaleString('en-US') + ' sq ft.\n' : '') +
      (b.reno ? '• Maintenance: the district\'s facilities crew will bring ' + (b.reno === 1 ? 'your worn facility' : 'all ' + b.reno + ' of your worn facilities') + ' back to full condition over the summer, at no cost to the team.\n' : '') +
      (b.grant ? '• Equipment grant: the board will pay for one facility upgrade of your choice, up to ' + U.money(D.BOARD.cap) + '. Use it in the Workshop whenever you like.\n' : '') +
      (b.cash ? '• Grant: there is nothing in the workshop the board could upgrade, so it sends ' + U.money(b.cash) + ' in cash instead, for the program to spend as it sees fit.\n' : '') +
      '\nKeep it up. Room is never taken back, but the next step needs Program Support ' + ((Sh.nextSpace(S) || {}).sup || 'to stay this high') + '.', 'shop');
  }
  // Rare: a very satisfied sponsor donates equipment, one facility level of a kind that fits what they do, if the workshop has room
  C.rollDonation = function (S) {
    const Sh = G.Shop, rng = G.R, DN = D.DONATION;
    if (!S.season || S.season.donated || S.phase === 'review' || S.phase === 'end') return null;
    for (const sp of rng.shuffle(S.sponsors.slice())) {
      const w = U.clamp((sp.sat - DN.sat) / (100 - DN.sat), 0, 1); // the happier the sponsor, the likelier
      if (!w || !rng.chance(DN.chance * w)) continue;
      const cap = DN.cap[sp.slot] || 9000, opts = (DN.types[sp.type] || []).filter(id => { const c = Sh.upgradeCost(S, id); return c != null && c <= cap && !Sh.spaceBlock(S, id); });
      if (!opts.length) continue;
      const id = rng.pick(opts), it = Sh.item(id), l0 = Sh.lvl(S, id), value = Sh.upgradeCost(S, id);
      if (Sh.upgrade(S, id, { gift: true })) continue;
      S.season.donated = true; sp.sat = Math.min(100, sp.sat + 2);
      const L = { kind: 'donation', sponsor: sp.name, type: sp.typeName, id, name: it.name, level: it.levels[l0].name, lvl: l0 + 1, value, sqft: Sh.sizeOf(id, l0 + 1) - Sh.sizeOf(id, l0), month: C.dateLabel(S),
        intro: rng.pick(DN.intro), fx: Sh.effectText(S, id, l0 + 1, 1), talk: rng.shuffle(DN.talk.slice()).slice(0, 3).map(q => [q[0], q[1].replace('{s}', sp.name)]) };
      C.inbox(S, 'Donation from ' + sp.name + ': ' + L.level, L.intro + '\n\n' + sp.name + ' (' + sp.typeName + ') donated a ' + L.level + ' to the team: ' + it.name + ' is now level ' + L.lvl + ' (worth ' + U.money(value) + ', ' + L.sqft + ' sq ft of your workshop). ' + L.fx + '.\n\nSponsors do this when they are happy with the partnership and the workshop has the room: the higher their satisfaction above ' + DN.sat + ', the likelier. Keep every sponsor slot filled and never skip their activities, and it averages about one donation a year.', 'money');
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
      C.inbox(S, 'From the school board: about the overdraft', 'The district has covered this season\'s ' + U.money(debt) + ' overdraft so the team can keep operating, and your balance is back to $0. ' +
        'The board has noted it in your program review (program support −' + pen.support + ') and word has got around (reputation −' + pen.rep + '). ' + (pen.mult > 1 ? 'This is not the first time, so the board is less forgiving (penalties ×' + pen.mult.toFixed(1) + '). Another overdraft next season will cost even more. ' : 'If it happens again next season, the penalties grow. ') +
        (debt > 20000 ? 'Please present a realistic budget before next season.' : 'A strong season goes a long way with the board — results like yours make this easier to defend.'), 'money');
    }
    S.legacy += s.legacy;
    // sponsors
    S.lastSponsor = Object.assign({ year: S.year }, C.sponsorSeason(S)); // kept for the offseason: sponsors that leave take their numbers with them
    const left = [];
    S.sponsors.forEach(sp => {
      sp.goals.forEach(g => { if (!g.met) sp.sat = Math.max(0, sp.sat - 8); });
      if (sp.exp === 'High' && !s.events.some(e => e.playoffs)) sp.sat = Math.max(0, sp.sat - 10);
      if (sp.exp === 'High' && C.highExpect(S) && !(s.events.some(e => e.won) || s.champsQualified)) sp.sat = Math.max(0, sp.sat - 12); // top programs are expected to win
      sp.seasonsLeft--;
      if (sp.seasonsLeft <= 0) {
        if (sp.slot !== 'grant' && G.R.chance(sp.sat / 100)) { sp.seasonsLeft = G.R.int(1, 2); sp.base = Math.round(sp.base * (0.9 + sp.sat / 250) / 250) * 250; C.inbox(S, 'Sponsor renewed: ' + sp.name, 'They renewed for ' + sp.seasonsLeft + ' more season(s) at ' + U.money(sp.base) + '.', 'money'); }
        else left.push(sp);
      }
    });
    S.sponsors = S.sponsors.filter(x => !left.includes(x));
    if (left.length) C.inbox(S, 'Sponsors leaving', left.map(x => x.name).join(', ') + ' did not renew. Look for new offers in October.', 'money');
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
    S.history.push({
      loyal: s.loyal || null,
      year: S.year, cy: C.cy(S), px: C.px(S), robot: C.robotRecord(S), events: s.events, awards: s.awards, champs: s.champsQualified, champsReason: s.champsReason || '', divWin: s.divWin, einstein: s.einstein, worldChamp: s.worldChamp, worldFinalist: !!s.worldFinalist, wc: s.wc || null, cmpImpact: s.cmpImpact && s.cmpImpact.result ? { result: s.cmpImpact.result, cele: s.cmpImpact.cele || null } : null,
      home: S.team.home && G.World.on(S) ? S.team.home : null,
      goals: s.goals.map(g => ({ id: g.id, met: g.met, tier: g.tier })), money: S.money, legacy: s.legacy, support: S.support, rep: S.rep,
      earned: s.earned, spent: s.spent, avgRP: s.qualMatches ? s.rpSum / s.qualMatches : 0, impactRaw: s.impact, board: s.board || null
    });
    S.phase = 'review';
    S.champsPaid = null;
  };
  // The Knowledge Base only works while it is kept up: it covers the season it was built or last updated for.
  C.kbCycle = S => S.si + (['off', 'review', 'end'].includes(S.phase) ? 1 : 0);
  C.kbCurrent = S => !!(S.equip.kb && (S.kbFor == null || S.kbFor >= C.kbCycle(S)));
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
    if (S.equip.kb) C.inbox(S, 'The Knowledge Base needs its yearly update', 'The rules have changed and the students who wrote half the wiki have graduated. A short project in the Design Office (' + D.KB_UPKEEP_HOURS + ' hours) brings the wiki and the CAD library up to date for the coming season. Left as it is, it will not slow the loss of know-how at the end of next season.', 'know');
    C.inbox(S, 'Offseason begins', 'Use the summer and fall to research new mechanisms, attend offseason events with last season\'s robot, recruit, and line up sponsors. Research matters more than it used to: rule changes and new designs date part of what you know every offseason. Stock up on parts before Kickoff: in season they often sell out. The next game is revealed at Kickoff in January.', 'info');
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
  // Spare parts cost more when bought at an event (rush delivery to the pits).
  C.spareUnitPrice = function (S, atEvent) {
    return Math.round(D.SPARES_COST * (atEvent ? D.SPARES_EVENT_MULT : 1) * G.Shop.spareMult(S) * (C.hasPerk(S, 'partsDiscount') ? 0.85 : 1));
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
  C.registerOffseason = function (S, id) {
    const o = D.OFFSEASON_EVENTS.find(x => x.id === id);
    if (S.offReg.includes(id)) return 'Registered';
    if (!S.robot) return 'You need last season\'s robot';
    if (D.MONTHS.indexOf(o.month) < S.month) return 'Already past';
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
  C.programPower = pg => C.programMaturity(pg) * (pg.own ? D.FTC_OWN.power : 1);
  C.programCost = S => (S.programs || []).reduce((s, p) => s + (p.own ? D.FTC_OWN.cost : D.FEEDER_COST), 0);
  C.ownTeams = S => (S.programs || []).filter(p => p.own).length;
  C.ownMax = S => Math.round(G.Shop.fx(S, 'ftc', 'ftc', null, 1));
  C.addProgram = function (S, focus, own) {
    S.programs = S.programs || [];
    if (S.programs.length >= D.FEEDER_MAX) return 'You can run at most ' + D.FEEDER_MAX + ' feeder programs';
    if (own && C.ownTeams(S) >= C.ownMax(S)) return C.ownMax(S) ? 'Your FTC Team Space has room for ' + C.ownMax(S) + ' team' + (C.ownMax(S) > 1 ? 's' : '') + ': upgrade it in the Workshop for another' : 'Build an FTC Team Space in the Workshop first';
    const used = new Set(S.programs.map(p => p.name)), rng = G.R;
    let name, g = 0;
    do { name = own ? S.team.name + ' FTC ' + 'ABCDEF'[Math.min(5, C.ownTeams(S) + g)] : rng.pick(D.FEEDER_SCHOOLS) + ' ' + rng.pick(D.FEEDER_KINDS); g++; } while (used.has(name) && g < 30);
    S.programs.push(Object.assign({ id: U.uid('fp'), name, focus: D.FEEDER_FOCUS[focus] ? focus : 'balanced', years: 0 }, own ? { own: true } : {}));
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
  C.migrate = function (S) {
    if (S.equip && S.equip.kb && S.kbFor == null) S.kbFor = C.kbCycle(S); // v2.9.3: an existing Knowledge Base is up to date for now
    if (!S.programs) {
      const n = U.clamp(S.feeders || 0, 0, D.FEEDER_MAX);
      S.programs = [];
      for (let i = 0; i < n; i++) { C.addProgram(S, 'balanced'); S.programs[i].years = 2; }
    }
    S.feeders = S.programs.length;
    // v2.9.9: End Effectors became their own knowledge area. Until then claws and grippers taught Arms & Wrists and Ground
    // Intakes, so a career starts it from half of the better of those two.
    if (S.know && S.know.effector == null) S.know.effector = Math.round(0.5 * Math.max(S.know.arm || 0, S.know.intake || 0));
  };
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
    C.inbox(S, 'STEM support fund approved', U.money(f.amt) + ' has been granted to keep the team running. Word gets around that the team needed a bailout (reputation −' + f.rep + ').', 'money');
    return null;
  };
})();
