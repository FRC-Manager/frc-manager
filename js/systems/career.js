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
  C.spend = function (S, amt, desc) { amt = Math.round(amt); S.money -= amt; S.ledger.unshift({ d: C.dateLabel(S), desc, amt: -amt }); if (S.season) S.season.spent += amt; if (S.ledger.length > 300) S.ledger.length = 300; };
  C.earn = function (S, amt, desc) { amt = Math.round(amt); S.money += amt; S.ledger.unshift({ d: C.dateLabel(S), desc, amt }); if (S.season) S.season.earned += amt; if (S.ledger.length > 300) S.ledger.length = 300; };
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
  C.coachSkill = function (S) { const dt = C.driveTeam(S); return Math.max(C.mentorSkill(S, 'coach'), dt.coachStrat); };
  C.driveTeam = function (S) {
    const by = id => S.students.find(s => s.id === id);
    const pool = S.students.slice().sort((a, b) => (b.attr.drive + b.attr.comp) - (a.attr.drive + a.attr.comp));
    const fallback = { name: 'Walk-on', attr: { drive: 25, aware: 25, comp: 25, mech: 25, hp: 25, strat: 25 } };
    const driver = by(S.driveTeam.driver) || pool[0] || fallback;
    const operator = by(S.driveTeam.operator) || pool.find(s => s !== driver) || fallback;
    const hp = by(S.driveTeam.hp) || pool.find(s => s !== driver && s !== operator) || fallback;
    const coachSt = S.driveTeam.coach && S.driveTeam.coach !== 'mentor' ? by(S.driveTeam.coach) : null;
    const coachStrat = coachSt ? coachSt.attr.strat : Math.max(C.mentorSkill(S, 'coach'), C.mentorSkill(S, 'strat') * 0.8, 30);
    return { driver, operator, hp, coach: coachSt, coachStrat: Math.round(coachStrat) };
  };
  C.seasonName = (S, year) => { const s = G.Seasons[year || S.year]; return year || S.year ? s.year + ' ' + s.name : ''; };
  C.monthName = S => D.MONTHS[S.month];
  C.dateLabel = function (S) {
    if (!S) return '';
    const yr = S.year || '';
    switch (S.phase) {
      case 'off': return (S.preseason ? 'Pre-season' : 'Offseason') + ' · ' + D.MONTHS[S.month] + (S.preseason ? '' : ' ' + yr);
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
      impactDone: false, impact: 0, outreach: 0, earned: 0, spent: 0, rpSum: 0, qualMatches: 0, matches: 0, faults: 0, legacy: 0 };
  }
  C.newGame = function (o) {
    const seed = o.seed || ((Date.now() ^ Math.floor(Math.random() * 1e9)) & 0x7fffffff); // o.seed: dev tests only
    G.R = new G.Rng(seed);
    const rng = G.R, P = D.PROFILES[o.profile];
    let order = G.SEASON_YEARS.slice();
    if (o.mode === 'career' && o.order === 'random') rng.shuffle(order);
    if (o.mode === 'single') order = [o.year];
    const scen = o.scenario ? D.SCENARIOS.find(s => s.id === o.scenario) : null;
    const S = G.S = {
      v: 1, mode: o.mode, seed, team: Object.assign({}, o.team), profile: o.profile, diff: o.diff || 'normal', orderMode: o.order || 'real',
      settings: Object.assign({ noFail: false }, o.settings || {}), scenario: scen ? scen.id : null, maxEvents: scen && scen.maxEvents ? scen.maxEvents : 4,
      order, si: -1, upcoming: 0, year: order[0], phase: 'off', month: 5, week: 0, preseason: o.mode === 'career',
      money: scen && scen.money ? scen.money : P.money, ledger: [], morale: scen && scen.morale ? scen.morale : 65, support: P.support, rep: P.rep,
      studentsCount: P.students, students: [], driveTeam: { driver: null, operator: null, hp: null, coach: 'mentor' },
      mentors: [], market: [], equip: { printer: 0, cnc: false, lathe: false, field: null, laptops: false, charger: false, pitcart: false, trailer: false, kb: false },
      parts: Object.assign({ motors: 0, swerve: 0, sensors: 0, vision: 0, pneu: 0, batteries: 4, battHealth: 1, spares: 6 }, P.parts),
      know: {}, usedAreas: {}, robot: null, projects: [], sponsors: [], offers: [], activities: [], regionals: [], registered: [], scrimmage: false,
      offReg: [], event: null, eventsDone: {}, season: newSeasonState(order[0]), history: [], offResults: [], inbox: [], teams: null,
      feeders: 0, practiceWeeks: 0, lastTune: 0, lastConf: 0, schoolBase: P.school, legacy: 0, overtime: false, turnHours: 0, actHours: 0,
      lastChamp: null, worldChamps: 0, lateFree: o.mode === 'single'
    };
    S.team.rookieYear = o.profile === 'rookie' ? order[0] : null;
    // equipment / knowledge
    P.equip.forEach(e => { if (e === 'printer') S.equip.printer = 1; else if (e === 'field') S.equip.field = 'pending'; else S.equip[e] = true; });
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
    // world
    S.teams = G.AI.makePool(rng, 620, S.team.num, order[0]);
    G.AI.addRookies(S.teams, rng, order[0], 12, S.team.num);
    C.refreshMarket(S);
    S.regionals = D.makeRegionals(order[0], rng);
    if (o.mode === 'career') {
      C.genOffers(S);
      C.inbox(S, 'Welcome, Lead Mentor', 'You lead ' + S.team.num + ' ' + S.team.name + '. It is October — the first game is revealed in January.\n\nBefore Kickoff: sign sponsors (Finance), hire mentors, buy equipment, start pre-season research (Design Office) and register for regionals (Calendar). Press Continue to advance a month.', 'info');
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
    S.driveTeam = { driver: d && d.id, operator: op && op.id, hp: hp && hp.id, coach: 'mentor' };
  }
  C.autoDriveTeam = autoDriveTeam;

  // ======================= sponsors =======================
  C.genOffers = function (S) {
    const rng = G.R, offers = [];
    const money = { easy: 1.25, normal: 1, hard: 0.85 }[S.diff] || 1;
    const repF = 0.6 + 0.6 * S.rep / 100;
    const types = Object.keys(D.SPONSOR_TYPES);
    const used = new Set(S.sponsors.map(s => s.name));
    const make = (slot) => {
      const tk = slot === 'title' ? rng.pick(types.filter(t => D.SPONSOR_TYPES[t].title)) : slot === 'grant' ? 'found' : rng.pick(types.filter(t => !D.SPONSOR_TYPES[t].grant));
      const T = D.SPONSOR_TYPES[tk];
      let name; let g = 0; do { name = rng.pick(D.SPONSOR_NAMES[tk]); g++; } while (used.has(name) && g < 10);
      used.add(name);
      let base = rng.range(T.money[0], T.money[1]) * repF * money;
      base = Math.round(base / 250) * 250;
      const goals = rng.shuffle(T.goals.slice()).slice(0, slot === 'grant' ? 1 : rng.int(1, 2)).map(id => ({ id, bonus: Math.round(D.GOALS[id].bonus * (slot === 'title' ? 1.5 : 1) * money / 250) * 250, met: false }));
      const nOb = rng.int(T.oblig[0], T.oblig[1]) + (slot === 'title' ? 1 : 0);
      const obligations = [];
      const obPool = rng.shuffle(D.OBLIGATIONS.slice());
      for (let i = 0; i < (slot === 'grant' ? 0 : Math.min(nOb, obPool.length)); i++) obligations.push(obPool[i].text.replace('{s}', name));
      const perk = T.perks.length && rng.chance(slot === 'title' ? 0.9 : 0.6) ? rng.pick(T.perks) : (slot !== 'grant' && rng.chance(0.15) ? 'travelDiscount' : null);
      return { id: U.uid('o'), name, type: tk, typeName: T.name, slot, base, length: slot === 'grant' ? 1 : rng.int(1, 3), goals, obligations, perk, exp: T.exp };
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
    const bizBoost = S.mentors.some(m => m.role === 'biz') ? 1.1 : 1;
    if (S.phase !== 'off') { C.earn(S, sp.base * bizBoost, 'Sponsor: ' + sp.name); sp.paidYear = S.year; C.scheduleActivities(S, sp); }
    if (!silent) C.inbox(S, 'Signed: ' + sp.name, (sp.slot === 'title' ? 'Title sponsor' : sp.slot === 'grant' ? 'Grant' : 'Partner sponsor') + ' — ' + U.money(sp.base) + ' per season for ' + sp.length + ' season(s).' + (S.phase === 'off' ? ' First payment arrives at Kickoff.' : ''), 'money');
    return null;
  };
  C.dropSponsor = function (S, id) { const s = S.sponsors.find(x => x.id === id); if (!s) return; S.sponsors = S.sponsors.filter(x => x !== s); S.rep = Math.max(0, S.rep - 3); };
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
    if (how === 'robot') { if (S.robot) Object.values(S.robot.subs).forEach(s => { if (s.ver) s.cond = Math.max(0, s.cond - 10); }); if ((S.phase === 'comp' || S.phase === 'champs') && !S.event) S.demoWear = { key: turnKey(S), amt: 10 }; if (sp) sp.sat = Math.min(100, sp.sat + 10); S.rep = Math.min(100, S.rep + 1); S.season.impact += 3; }
    if (how === 'hours') { S.actHours += 30; if (sp) sp.sat = Math.min(100, sp.sat + 8); S.season.impact += 2; }
    if (how === 'skip') { if (sp) sp.sat = Math.max(0, sp.sat - 15); }
  };
  C.checkSponsorGoals = function (S, final) {
    const s = S.season;
    const tech = s.awards.some(a => D.AWARDS.find(x => x.id === a && x.tech));
    const has = id => s.awards.includes(id);
    const evs = s.events.filter(e => e.kind === 'regional');
    const avgRP = s.qualMatches ? s.rpSum / s.qualMatches : 0;
    const check = {
      playoffs1: evs.some(e => e.playoffs), playoffs2: evs.filter(e => e.playoffs).length >= 2, win: evs.some(e => e.won), champs: s.champsQualified,
      award: s.awards.length > 0, techAward: tech, quality: has('quality') || has('eie'), autoAward: has('auto') || has('ic'), impactAward: has('impact') || has('ei'),
      avgRP: final && avgRP >= 2, outreach: s.outreach >= 2, events2: evs.length >= 2
    };
    S.sponsors.forEach(sp => sp.goals.forEach(g => {
      if (!g.met && check[g.id]) {
        g.met = true;
        const bonus = g.bonus * (C.hasPerk(S, 'bonusBoost') && sp.perk === 'bonusBoost' ? 1.5 : 1);
        C.earn(S, bonus, 'Bonus: ' + sp.name + ' — ' + D.GOALS[g.id].text);
        sp.sat = Math.min(100, sp.sat + 10);
        C.inbox(S, 'Sponsor bonus: ' + U.money(bonus), sp.name + ' is thrilled: "' + D.GOALS[g.id].text + '" achieved.', 'money');
      }
    }));
  };

  // ======================= mentors & students =======================
  C.refreshMarket = function (S) {
    const rng = G.R, n = rng.int(6, 9);
    S.market = [];
    for (let i = 0; i < n; i++) {
      const stars = rng.wpick([1, 2, 3, 4, 5], s => [0, 3, 4, 3 + S.rep / 40, 1.5 + S.rep / 50, 0.5 + S.rep / 60][s]);
      S.market.push(D.makeMentor(rng, null, stars));
    }
  };
  C.hireMentor = function (S, id) {
    const m = S.market.find(x => x.id === id);
    if (!m) return 'Not found';
    if (S.mentors.length >= 8) return 'You can have at most 8 mentors';
    if (S.money < m.cost) return 'Not enough money';
    if (m.cost) C.spend(S, m.cost, 'Mentor: ' + m.name);
    m.paid = true; m.contract = Math.max(1, m.contract);
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

  // ======================= calendar / turns =======================
  C.eventThisTurn = function (S) {
    // An event stays active (including its results page) until the player leaves it.
    if (S.event) return { active: true, def: null };
    if (S.phase === 'build' && S.week === 7 && S.scrimmage && !S.eventsDone['scrim' + S.year]) return { def: { id: 'scrim' + S.year, kind: 'scrimmage', name: 'Week 0 Scrimmage', size: 18, str: 2, week: 0 } };
    if (S.phase === 'comp') {
      const r = S.regionals.find(x => S.registered.includes(x.id) && x.week === S.week);
      if (r && !S.eventsDone[r.id]) return { def: Object.assign({ kind: 'regional' }, r) };
    }
    if (S.phase === 'champs' && S.season.champsQualified && !S.eventsDone['champs' + S.year] && !S.champsDeclined) return { def: { id: 'champs' + S.year, kind: 'champs', name: 'Championship — ' + (S.champsDiv || 'Newton') + ' Division', size: 64, str: 5, week: 8 } };
    if (S.phase === 'champs' && S.pendingEinstein && !S.eventsDone['ein' + S.year]) return { def: { id: 'ein' + S.year, kind: 'einstein', name: 'Einstein Field', week: 8 } };
    if (S.phase === 'off' && S.robot) {
      const o = D.OFFSEASON_EVENTS.find(x => S.offReg.includes(x.id) && x.month === D.MONTHS[S.month]);
      if (o && !S.eventsDone[o.id + S.year]) return { def: { id: o.id + S.year, kind: 'offseason', name: o.name, size: o.size, str: 3, week: 0 } };
    }
    return null;
  };
  C.travelCost = function (S, def) {
    if (def.kind === 'einstein') return 0;
    let tier = def.kind === 'champs' ? 'fly' : def.kind === 'regional' ? D.travelTier(S.team.region, def.region, def.local) : 'local';
    if (def.kind === 'offseason') tier = 'drive';
    let c = D.TRAVEL[tier].cost * (def.kind === 'offseason' ? 0.4 : 1);
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
    }
    if (def.kind === 'einstein') return C.startEinstein(S, def);
    const fly = def.kind === 'champs' || (def.kind === 'regional' && D.travelTier(S.team.region, def.region, def.local) === 'fly');
    G.Shop.wear(S, 'event', { fly });
    // The robot arrives at 100% unless: not enough spare parts for the repairs, a long trip (shipped by air),
    // or a sponsor demo with the robot this same competition week. (Einstein follows the division too closely for any of this.)
    const arrival = { notes: [] };
    if (S.robot) {
      const rep = G.Robot.homeRepair(S);
      if (rep.used) arrival.notes.push('Repairs used ' + rep.used + ' spare part' + (rep.used > 1 ? 's' : '') + '.');
      if (rep.short) arrival.notes.push('Not enough spare parts to finish the repairs (' + rep.short + ' condition points left).');
      const hit = (amt, why) => { Object.values(S.robot.subs).forEach(x => { if (x.ver && x !== S.robot.subs.soft) x.cond = Math.max(0, x.cond - amt()); }); arrival.notes.push(why); };
      if (fly) hit(() => G.R.range(4, 9), 'The robot was shipped by air and took some knocks in transit.');
      if (S.demoWear && S.demoWear.key === turnKey(S)) { hit(() => S.demoWear.amt, 'The sponsor demo earlier this week left wear the team had no time to fix.'); }
      S.demoWear = null;
      arrival.cond = Math.round(G.Robot.condAvg(S));
    }
    const ev = G.Ev.start(Object.assign({ year: S.year }, def));
    ev.batts = S.parts.batts.map(() => 1);
    ev.arrival = arrival;
    return ev;
  };
  // What the robot's condition will be when it arrives at an event (HQ / calendar preview)
  C.arrivalPreview = function (S, def) {
    if (!S.robot || !def || def.kind === 'einstein') return null;
    const notes = [], need = G.Robot.repairNeed(S), have = Math.max(0, S.parts.spares - (S.parts.spareUse || 0));
    let cond = 100;
    if (need > have + 0.01) { notes.push('short on spare parts'); cond -= Math.min(25, (need - have) * D.SPARE_COND_PER_UNIT / Math.max(1, Object.values(S.robot.subs).filter(x => x.ver).length)); }
    const fly = def.kind === 'champs' || (def.kind === 'regional' && D.travelTier(S.team.region, def.region, def.local) === 'fly');
    if (fly) { notes.push('flying (−4–9%)'); cond -= 6.5; }
    if (S.demoWear && S.demoWear.key === turnKey(S)) { notes.push('sponsor demo this week (−' + S.demoWear.amt + '%)'); cond -= S.demoWear.amt; }
    return { cond: Math.round(cond), notes, spares: Math.max(0, Math.ceil(need - have)) };
  };
  C.startEinstein = function (S, def) {
    const div = S.lastDivision;
    const ev = G.Ev.start({ id: def.id, kind: 'einstein', name: def.name, size: 1, year: S.year, week: 8, str: 5 });
    ev.batts = S.parts.batts.map(() => 1);
    const rng = G.R;
    const myAll = div.alliance.slice();
    const exclude = new Set(div.teams);
    const strong = Object.values(S.teams).filter(t => !exclude.has(t.num)).sort((a, b) => b.str - a.str).slice(0, 60);
    rng.shuffle(strong);
    const alliances = [myAll];
    for (let i = 0; i < 7; i++) alliances.push(strong.slice(i * 3, i * 3 + 3).map(t => t.num));
    rng.shuffle(alliances);
    ev.teams = [].concat(...alliances);
    ev.teams.forEach(n => {
      if (n !== S.team.num) ev.caps[n] = div.caps[n] || G.AI.entry(S.teams[n], S.year, 1.12, { easy: 0.9, normal: 1, hard: 1.1 }[S.diff] || 1, rng);
      ev.rank[n] = { rp: 0, played: 0, w: 0, l: 0, t: 0, pts: 0, auto: 0, tb: 0 };
    });
    ev.alliances = alliances;
    ev.tune = div.tune; ev.conf = div.conf; ev.tuneAuto = div.tuneAuto;
    ev.practice.blocks = 0;
    G.Ev.initPlayoffs(ev);
    return ev;
  };
  C.leaveEvent = function (S) {
    const ev = S.event;
    if (!ev) return;
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
    const lvl = G.Shop.lvl(S, 'pfield');
    if (!lvl || !['off', 'kickoff', 'build', 'comp'].includes(S.phase)) return { total: 0, drive: 0, dev: 0, unlocked: !!lvl };
    if (eventWeek == null) eventWeek = C.isEventTurn(S);
    let h = G.Shop.fx(S, 'pfield', 'test') + (S.robot && S.robot.practiceBot ? D.TEST_BOT_HOURS : 0);
    if (S.phase === 'off') h *= 4;
    if (eventWeek) h *= 0.5;
    h = Math.round(h);
    const canDrive = !!S.robot, split = canDrive ? (S.testSplit == null ? 0.5 : S.testSplit) : 0;
    const drive = Math.round(h * split);
    // driver practice on the real game needs this season's game elements (offseason: last season's game)
    const elem = S.phase === 'off' ? 0.6 : S.equip.field === S.year ? 1 : 0.5;
    return { total: h, drive, dev: h - drive, unlocked: true, elem, canDrive, unit: S.phase === 'off' ? 'month' : 'week' };
  };
  C.setTestSplit = function (S, v) { S.testSplit = U.clamp(Number(v), 0, 1); };
  // Driver practice: drive-team skills and confidence; uses a few spare parts and a little battery life.
  // Out of spares, the robot itself wears (unless a practice robot takes the beating).
  function driverPractice(S, th) {
    const h = th.drive;
    if (!h || !S.robot) return null;
    const eff = h * th.elem, out = { hours: h, spares: 0, wear: 0 };
    S.practiceWeeks = Math.min(D.DRILL_CAP, (S.practiceWeeks || 0) + eff / D.DRILL_PER);
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
      // no spares: broken bits stay broken, and the robot itself wears (a practice robot takes the beating instead)
      P.drillUse = 0;
      if (!S.robot.practiceBot) {
        const subs = Object.values(S.robot.subs).filter(x => x.ver && x !== S.robot.subs.soft);
        out.wear = Math.round(h * D.DRILL_WEAR);
        subs.forEach(x => x.cond = Math.max(0, x.cond - out.wear * G.R.range(0.6, 1.4)));
      }
    }
    if (P.batts.length) P.batts.forEach(b => b.h = Math.max(0.3, b.h - D.DRILL_BATT * h / P.batts.length * G.R.range(0.5, 1.5)));
    return out;
  }
  // Hours still free this turn after team activities
  C.freeHours = S => Math.max(0, C.turnHours(S, C.isEventTurn(S)) - S.actHours);
  // This turn's development plan: how free hours will be shared between projects
  C.hoursPlan = function (S) {
    const free = C.freeHours(S);
    const mods = mergeMods(S.devMods ? S.devMods.mods : null, G.Shop.boostMods(S));
    return Object.assign(G.Robot.alloc(S, free, mods), { free, mods });
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
    if (ev && ev.active) b.push('Finish the current event first.');
    else if (ev && ev.def) b.push('You have an event this turn: ' + ev.def.name + '.');
    if (C.dueActivities(S).length) b.push('Sponsor activities need a decision (Inbox).');
    if (S.incident) b.push('A shop incident needs a decision: ' + S.incident.title + '.');
    return b;
  };
  C.advance = function (S) {
    if (C.blockers(S).length) return C.blockers(S);
    const thisWeekEvent = S.lastEventTurn === turnKey(S);
    const hours = Math.max(0, C.turnHours(S, thisWeekEvent) - S.actHours);
    const th = C.testHours(S, thisWeekEvent);
    S.actHours = 0;
    switch (S.phase) {
      case 'off': processWork(S, hours, th); offMonthEnd(S); break;
      case 'kickoff': processWork(S, hours, th); S.phase = 'build'; S.week = 1; break;
      case 'build': processWeek(S, hours, th); if (S.week >= 7) { S.phase = 'comp'; S.week = 1; } else S.week++; break;
      case 'comp': processWeek(S, hours, th); if (S.week >= 6) C.toChamps(S); else S.week++; break;
      case 'champs': C.toReview(S); break;
      case 'review': C.endReview(S); break;
    }
    // new turn: random news, team chatter, (rarely) a shop incident or a school/sponsor opportunity
    if (['off', 'build', 'comp'].includes(S.phase)) { G.News.turn(S); G.Shop.rollIncident(S); G.Shop.rollBoost(S); }
    if (S.phase === 'build' || S.phase === 'comp') C.weeklySuggestion(S);
    S.overtime = false;
    G.Save.write('auto');
    return null;
  };
  function turnKey(S) { return S.phase + ':' + S.week + ':' + S.month + ':' + S.year; }
  C.turnKey = turnKey;
  C.markEventTurn = S => { S.lastEventTurn = turnKey(S); };
  function processWork(S, hours, th) {
    const inc = G.Shop.turnMods(S); // shop incidents: one turn only
    const mods = mergeMods(inc, G.Shop.boostMods(S));
    const r = G.Robot.work(S, hours, mods, th ? th.dev : 0);
    S.lastWork = { hours, used: Math.round(r.used), idle: Math.round(r.spare), done: r.done, mods: inc ? G.Shop.modsText(inc) : '' };
    if (th && th.total) {
      if (r.testUsed > 0.05) C.spend(S, r.testUsed * D.TEST_COST, 'Development testing (' + Math.round(r.testUsed) + ' h)');
      const dp = driverPractice(S, th);
      S.lastTest = { total: th.total, dev: th.dev, devUsed: Math.round(r.testUsed), devIdle: Math.round(r.testIdle), bonus: Math.round(r.testBonus), drive: th.drive, spares: dp ? dp.spares : 0, wear: dp ? dp.wear : 0 };
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
  function processWeek(S, hours, th) {
    const r = processWork(S, hours, th);
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
    if (mo === 'Aug') { C.refreshMarket(S); C.inbox(S, 'Mentor market refreshed', 'New mentor candidates are available (Mentors screen).', 'staff'); }
    if (mo === 'Sep') {
      S.students.forEach(s => s.grade++);
      const n = Math.max(2, Math.round(4 + S.rep / 10 + S.season.outreach + S.feeders * 1.5 + rng.int(-2, 2)));
      S.studentsCount += n;
      const add = Math.min(12 - S.students.length, Math.max(2, Math.round(n / 2)));
      for (let i = 0; i < add; i++) S.students.push(D.makeStudent(rng, rng.chance(0.7) ? 9 : 10, S.feeders * 6 + S.rep / 10 - 5));
      const fund = Math.round(S.schoolBase * (0.6 + 0.8 * S.support / 100));
      C.earn(S, fund, 'School funding');
      if (S.feeders) C.spend(S, S.feeders * 1000, 'Feeder programs');
      C.inbox(S, 'New school year', n + ' new students joined (' + S.studentsCount + ' total). School funding: ' + U.money(fund) + '.', 'staff');
    }
    if (mo === 'Oct') {
      C.genOffers(S);
      S.regionals = D.makeRegionals(S.order[S.upcoming] || S.year, rng);
      S.registered = []; S.scrimmage = false;
      C.inbox(S, 'Sponsor season & registration', 'New sponsor offers are in (Finance). Regional registration for next season is open (Calendar).', 'money');
    }
    if (mo === 'Nov') C.inbox(S, 'Drive team tryouts', 'Pick next season\'s drive team on the Team screen.', 'staff');
  }
  function autoDriveTeamIfMissing(S) {
    const ids = S.students.map(s => s.id);
    if (!ids.includes(S.driveTeam.driver) || !ids.includes(S.driveTeam.operator) || !ids.includes(S.driveTeam.hp)) autoDriveTeam(S);
  }

  // ======================= kickoff =======================
  C.kickoff = function (S) {
    const rng = G.R;
    const first = S.si < 0;
    S.si = S.upcoming; S.upcoming = S.si + 1;
    S.year = S.order[S.si];
    S.phase = 'kickoff'; S.week = 0; S.preseason = false;
    if (!first) { G.AI.evolve(S.teams, rng); G.AI.addRookies(S.teams, rng, S.year, 10, S.team.num); }
    Object.values(S.teams).forEach(t => t.rb = null);
    if (!S.season || S.season.year !== S.year) { const imp = S.season ? S.season.impact : 0, out = S.season ? S.season.outreach : 0, done = !!(S.season && S.season.impactDone), fundN = (S.season && S.season.fundN) || {}; S.season = newSeasonState(S.year); S.season.impact = imp; S.season.outreach = out; S.season.impactDone = done; S.season.fundN = fundN; }
    S.season.year = S.year;
    G.Robot.newSeason(S, S.year);
    S.usedAreas = {}; S.practiceWeeks = 0; S.lastTune = 0; S.lastConf = 0; S.champsDeclined = false; S.pendingEinstein = false;
    S.champsDiv = rng.pick(DIVS);
    if (S.equip.field === 'pending') S.equip.field = S.year; else if (S.equip.field !== S.year) S.equip.field = null;
    if (!S.regionals.length || S.regionals[0].year !== S.year) S.regionals = D.makeRegionals(S.year, rng);
    if (S.mode === 'career') C.markFull(S);
    // finances
    const biz = S.mentors.some(m => m.role === 'biz') ? 1.1 : 1;
    S.sponsors.forEach(sp => {
      if (sp.paidYear !== S.year) { C.earn(S, sp.base * biz, 'Sponsor: ' + sp.name); sp.paidYear = S.year; C.scheduleActivities(S, sp); }
      sp.goals.forEach(g => g.met = false);
    });
    S.mentors.forEach(m => { if (!m.paid && m.cost) C.spend(S, m.cost, 'Mentor: ' + m.name); m.paid = false; });
    C.spend(S, D.FEES.shopOps, 'Shop operations');
    const upkeep = G.Shop.upkeep(S);
    if (upkeep) C.spend(S, upkeep, 'Equipment upkeep');
    if (S.mode === 'single' && S.robot) { /* nothing */ }
    // goals
    S.season.goals = C.makeGoals(S);
    const Sz = G.Seasons[S.year];
    C.inbox(S, 'KICKOFF — ' + S.year + ' ' + Sz.name, Sz.brief.join('\n\n') + '\n\nOpen the Design Office to choose your concepts. Your Tech Knowledge shows which past experience helps this game.', 'kickoff');
    G.News.kickoff(S);
    C.inbox(S, 'Program goals for ' + S.year, 'The program director expects:\n' + S.season.goals.map(g => '• [' + g.tier + '] ' + D.PROGRAM_GOALS[g.id].text).join('\n') + '\n\nAnd finish the season with money in the bank.', 'goal');
    G.Save.write('auto');
  };
  C.makeGoals = function (S) {
    const r = S.rep;
    let ids;
    if (S.mode === 'single' || r < 35) ids = ['finish', 'playoffs1', 'award'];
    else if (r < 55) ids = ['playoffs1', 'award', 'winEvent'];
    else if (r < 75) ids = ['playoffs1', 'winEvent', 'champs'];
    else ids = ['playoffs2', 'winEvent', 'champs'];
    return ids.map((id, i) => ({ id, tier: ['Minimum', 'Target', 'Stretch'][i], met: false }));
  };

  // ======================= registration =======================
  C.regFee = function (S) { const n = S.registered.length; return n === 0 ? D.FEES.firstRegional : D.FEES.addRegional; };
  C.canRegister = function (S, r) {
    if (S.registered.includes(r.id)) return 'Registered';
    if (S.phase === 'comp' && r.week <= S.week) return 'Already past';
    if (!['off', 'kickoff', 'build', 'comp'].includes(S.phase)) return 'Closed';
    if (S.phase === 'off' && D.MONTHS.indexOf('Oct') > S.month) return 'Opens in October';
    if (S.registered.length >= S.maxEvents) return 'Max ' + S.maxEvents + ' regionals';
    if (S.regionals.some(x => S.registered.includes(x.id) && x.week === r.week)) return 'Already registered that week';
    if (r.full) return 'Event full';
    return null;
  };
  C.isLate = S => S.phase !== 'off' && !(S.lateFree && (S.phase === 'kickoff' || (S.phase === 'build' && S.week <= 1)));
  C.register = function (S, id) {
    const r = S.regionals.find(x => x.id === id);
    const err = C.canRegister(S, r); if (err) return err;
    const fee = C.regFee(S) + (C.isLate(S) ? D.FEES.late : 0);
    if (S.money < fee) return 'Not enough money (' + U.money(fee) + ')';
    C.spend(S, fee, 'Registration: ' + r.name);
    S.registered.push(id);
    return null;
  };
  C.withdraw = function (S, id) {
    const r = S.regionals.find(x => x.id === id);
    if (!r || !S.registered.includes(id) || S.eventsDone[id]) return;
    S.registered = S.registered.filter(x => x !== id);
    C.earn(S, Math.round((S.registered.length === 0 ? D.FEES.firstRegional : D.FEES.addRegional) * 0.5), 'Withdrawal refund: ' + r.name);
  };
  C.markFull = function (S) { S.regionals.forEach(r => { if (!S.registered.includes(r.id) && G.R.chance(0.3)) r.full = true; }); };

  // ======================= match hooks =======================
  C.beforePlayerMatch = function (S, ev, opts) {
    const turn = ev.lastPlayerMatch < 0 ? 0 : (ev.stage === 'playoffs' ? 3 : G.Ev.turnaround(ev));
    if (ev.lastPlayerMatch >= 0 || ev.stage === 'playoffs') {
      const sp = G.Robot.pitRepair(S, turn, opts && opts.timeout ? 2.5 : 1);
      ev.lastRepair = sp;
    }
    // batteries
    const rate = G.Shop.chargeRate(S), fleet = S.parts.batts;
    if (!ev.batts || ev.batts.length !== fleet.length) ev.batts = fleet.map(() => 1);
    ev.batts = ev.batts.map(b => Math.min(1, b + rate * Math.max(1, turn)));
    // pick the most charged battery; break ties with the healthiest
    let bi = 0; ev.batts.forEach((b, i) => { if (b > ev.batts[bi] + 1e-9 || (Math.abs(b - ev.batts[bi]) < 1e-9 && fleet[i].h > fleet[bi].h)) bi = i; });
    ev.battIdx = bi;
    ev.batt = ev.batts[bi] * (fleet[bi] ? fleet[bi].h : 1);
  };
  C.afterPlayerMatch = function (S, ev, match, res) {
    const me = S.team.num;
    const rr = res.robots.find(r => r.team === me);
    if (!rr) return;
    const a = rr.a, o = a === 'red' ? 'blue' : 'red';
    G.Robot.applyWear(S, rr, !!match.playoff);
    if (rr.faults.some(f => /^Fell from/.test(f))) {
      const msg = 'Your robot fell from the ' + rr.faults.find(f => /^Fell from/.test(f)).replace('Fell from ', '') + ' — heavy damage everywhere' + (rr.scrapped ? ', ' + rr.scrapped + ' spare part' + (rr.scrapped > 1 ? 's' : '') + ' scrapped' : '') + '. The pit crew will need spares to rebuild it.';
      ev.log.push(msg);
      G.Career.inbox(S, 'Hard fall at ' + ev.name, msg, 'event');
    }
    if (ev.batts) {
      const i = ev.battIdx || 0;
      ev.batts[i] = 0.15;
      if (S.parts.batts[i]) S.parts.batts[i].h = Math.max(0.4, S.parts.batts[i].h - 0.012); // only the battery used wears
    }
    // XP
    const dt = C.driveTeam(S), mult = (match.playoff ? 1.5 : 1) * (ev.kind === 'champs' || ev.kind === 'einstein' ? 1.5 : 1) * (ev.kind === 'offseason' ? 2 : 1);
    if (dt.driver.attr && dt.driver.id) { studentXP(S, dt.driver, ['drive', 'aware', 'comp'], mult); dt.driver.matches++; }
    if (dt.operator.attr && dt.operator.id) { studentXP(S, dt.operator, ['mech', 'comp'], mult); dt.operator.matches++; }
    if (dt.hp.attr && dt.hp.id) studentXP(S, dt.hp, ['hp'], mult);
    if (dt.coach) studentXP(S, dt.coach, ['strat'], mult);
    // knowledge from using concepts
    if (S.robot && S.robot.year === ev.year) {
      Object.keys(S.robot.subs).forEach(k => {
        const s = S.robot.subs[k]; if (!s.ver || k === 'soft') return;
        const c = G.Seasons.concept(S.robot.year, k, s.concept); if (c && c.areas[0]) G.Robot.addXP(S, c.areas[0], 2);
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
    const stu = S.students.map(s => (s.attr.strat + s.attr.aware) / 2).sort((a, b) => b - a).slice(0, 2);
    const parts = {
      outreach: impSat(raw), record: impSat(U.avg(past)),
      pitch: U.clamp(C.mentorSkill(S, 'biz') * 0.6 + (stu.length ? U.avg(stu) : 25) * 0.6, 0, 100),
      programs: S.feeders / 3 * 100, rep: S.rep
    };
    let score = 0;
    Object.keys(C.IMPACT_W).forEach(k => score += parts[k] * C.IMPACT_W[k]);
    const won = !!(S.season && (S.season.awards || []).some(a => a === 'impact' || (a && a.id === 'impact')));
    return { score, parts, raw, submitted: !!(S.season && S.season.impactDone), won };
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
      S.season.metaSeen = (S.season.metaSeen || 0) + 0.12 + 0.6 * share + 0.08 * (ev.scoutBonus || 0);
    }
    S.lastTune = ev.tune; S.lastConf = ev.conf;
    if (ev.kind === 'offseason') {
      S.offResults.push(r); S.rep = Math.min(100, S.rep + 2 + (r.won ? 3 : 0));
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
    if (ev.kind === 'einstein') {
      S.season.einstein = true;
      if (r.won) { S.season.worldChamp = true; S.worldChamps++; S.rep = 100; S.morale = 100; S.lastChamp = S.year; C.inbox(S, 'WORLD CHAMPIONS!', 'Your alliance won Einstein. Unbelievable season!', 'event'); }
      else C.inbox(S, 'Einstein: ' + r.finish, 'Reaching Einstein is an achievement few teams ever manage.', 'event');
      if (r.finalist) S.lastChamp = S.year;
      S.pendingEinstein = false;
      return;
    }
    S.season.events.push(r);
    r.awards.forEach(a => S.season.awards.push(a));
    if (ev.kind === 'champs') {
      S.season.champsPlayoffs = r.playoffs;
      if (r.won) { S.season.divWin = true; S.pendingEinstein = true; S.lastDivision = { alliance: ev.alliances[G.Ev.playerAlliance(ev)], teams: ev.teams.slice(), caps: ev.caps, tune: ev.tune, conf: ev.conf, tuneAuto: ev.tuneAuto }; C.inbox(S, 'Division Champions!', 'You won the ' + S.champsDiv + ' Division and advance to Einstein!', 'event'); }
    }
    // reputation & morale
    S.rep = U.clamp(S.rep + (r.won ? 8 : r.finalist ? 4 : r.playoffs ? 2 : -1) + r.awards.length * 3, 0, 100);
    S.morale = U.clamp(S.morale + (r.won ? 12 : r.playoffs ? 4 : -3) + r.awards.length * 4, 0, 100);
    // champs qualification
    if (ev.kind === 'regional' && !S.season.champsQualified) {
      let why = '';
      if (r.won) why = 'Regional winner at ' + ev.name;
      else if (r.awards.includes('impact')) why = 'Impact Award at ' + ev.name;
      else if (r.awards.includes('ei')) why = 'Engineering Inspiration Award at ' + ev.name;
      else if (r.awards.includes('ras')) why = 'Rookie All-Star Award at ' + ev.name;
      if (why) { S.season.champsQualified = true; S.season.champsReason = why; C.inbox(S, 'Qualified for the Championship!', why + '. Register when the Championship turn arrives.', 'event'); }
    }
    C.checkSponsorGoals(S, false);
    const sum = ev.name + ': ranked ' + U.ord(r.rank) + ' of ' + r.size + ' (' + r.record + ')' + (r.playoffs ? ', alliance ' + r.alliance + ' ' + r.role + ' — ' + r.finish : ', no playoffs') + (r.awardNames.length ? '. Awards: ' + r.awardNames.join(', ') : '') + '.';
    C.inbox(S, 'Event complete: ' + ev.name, sum, 'event');
    G.News.afterEvent(S, r);
  };
  C.poolThreshold = S => ({ easy: 75, normal: 85, hard: 95 }[S.diff] || 85);
  C.poolTotal = S => { const p = S.season.events.filter(e => e.kind === 'regional').map(e => e.pool).sort((a, b) => b - a); return (p[0] || 0) + (p[1] || 0); };
  function poolCheck(S) {
    if (S.season.champsQualified) return;
    const tot = C.poolTotal(S);
    if (tot >= C.poolThreshold(S)) { S.season.champsQualified = true; S.season.champsReason = 'Regional Pool wildcard (' + tot + ' pts)'; C.inbox(S, 'Championship wildcard!', 'Your Regional Pool total of ' + tot + ' points earned a Championship spot.', 'event'); }
    else if (S.season.events.length) C.inbox(S, 'Regional Pool', 'Your pool total was ' + tot + ' points; the wildcard cut-off was ' + C.poolThreshold(S) + '. No Championship invitation this year.', 'event');
  }
  C.toChamps = function (S) {
    if (!S.season.champsQualified) poolCheck(S);
    if (!S.season.champsQualified && S.mode === 'career' && S.lastChamp === S.year - 1 && S.orderMode === 'real') { S.season.champsQualified = true; S.season.champsReason = 'Defending champions'; }
    S.phase = 'champs';
    if (S.season.champsQualified) {
      C.inbox(S, 'Championship', 'You are qualified (' + S.season.champsReason + '). Registration ' + U.money(D.FEES.champs) + ' + flights. Attend from the HQ screen, or Continue to skip.', 'event');
    } else C.toReview(S);
  };
  C.registerChamps = function (S) {
    if (S.champsPaid) return null;
    if (S.money < D.FEES.champs) return 'Not enough money';
    C.spend(S, D.FEES.champs, 'Championship registration');
    S.champsPaid = S.year;
    return null;
  };

  // ======================= review =======================
  C.legacyFor = function (s) {
    let p = 0;
    s.events.forEach(e => { if (e.kind === 'regional' && e.won) p += 100; e.awards.forEach(a => p += a === 'impact' ? 120 : a === 'ei' ? 80 : 30); });
    if (s.champsQualified) p += 50;
    if (s.divWin) p += 150;
    if (s.worldChamp) p += 400;
    return p;
  };
  // Blue banners: official event wins and Impact Awards (offseason events don't earn banners).
  C.eventBanners = function (e, year) {
    const out = [];
    if (e.kind === 'regional' && e.won) out.push({ award: 'Winner', year, event: e.name });
    if (e.kind === 'champs' && e.won) out.push({ award: 'Division Winner', year, event: e.name.replace('Championship — ', '') + ' · FIRST Championship' });
    if (e.kind === 'einstein' && e.won) out.push({ award: 'World Champions', year, event: 'Einstein Field · FIRST Championship', gold: true });
    if ((e.awards || []).includes('impact')) out.push({ award: 'Impact Award', year, event: e.name.replace('Championship — ', '') });
    return out;
  };
  C.banners = function (S) {
    const out = [];
    const add = (year, events, worldChamp) => {
      events.forEach(e => out.push(...C.eventBanners(e, year)));
      if (worldChamp) out.push(...C.eventBanners({ kind: 'einstein', won: true }, year));
    };
    S.history.forEach(h => add(h.year, h.events, h.worldChamp));
    if (S.season && S.season.events && !S.history.some(h => h.year === S.season.year)) add(S.season.year || S.year, S.season.events, S.season.worldChamp);
    return out;
  };
  C.toReview = function (S) {
    if (S.phase === 'review') return;
    const s = S.season;
    C.checkSponsorGoals(S, true);
    let dSup = 0;
    const TIER = { Minimum: [4, -14], Target: [8, -6], Stretch: [14, -2] };
    s.goals.forEach(g => { g.met = !!D.PROGRAM_GOALS[g.id].check(s); const t = TIER[g.tier] || [8, -6]; dSup += g.met ? t[0] : t[1]; });
    if (S.money < 0) dSup -= 20;
    dSup *= dSup < 0 ? ({ easy: 0.5, normal: 1, hard: 1.5 }[S.diff] || 1) : 1;
    S.support = Math.round(U.clamp(S.support + dSup, 0, 100));
    s.supportDelta = Math.round(dSup);
    s.legacy = C.legacyFor(s) + (S.money >= 0 ? 20 : 0);
    S.legacy += s.legacy;
    // sponsors
    const left = [];
    S.sponsors.forEach(sp => {
      sp.goals.forEach(g => { if (!g.met) sp.sat = Math.max(0, sp.sat - 8); });
      if (sp.exp === 'High' && !s.events.some(e => e.playoffs)) sp.sat = Math.max(0, sp.sat - 10);
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
    S.mentors.forEach(m => { m.contract--; if (m.contract <= 0 && G.R.chance(0.5 - S.morale / 300)) gone.push(m); else if (m.contract <= 0) m.contract = G.R.int(1, 2); });
    S.mentors = S.mentors.filter(m => !gone.includes(m));
    if (gone.length) C.inbox(S, 'Mentors moving on', gone.map(m => m.name).join(', ') + ' decided not to return next season.', 'staff');
    // knowledge decay
    const decay = S.equip.kb ? 0.1 : 0.2;
    D.AREAS.forEach(a => { if (!S.usedAreas[a.id] && !S.mentors.some(m => m.spec === a.id)) S.know[a.id] = Math.round((S.know[a.id] || 0) * (1 - decay)); });
    S.history.push({
      year: S.year, events: s.events, awards: s.awards, champs: s.champsQualified, divWin: s.divWin, einstein: s.einstein, worldChamp: s.worldChamp,
      goals: s.goals.map(g => ({ id: g.id, met: g.met, tier: g.tier })), money: S.money, legacy: s.legacy, support: S.support, rep: S.rep,
      earned: s.earned, spent: s.spent, avgRP: s.qualMatches ? s.rpSum / s.qualMatches : 0, impactRaw: s.impact
    });
    S.phase = 'review';
    S.champsPaid = null;
  };
  C.endReview = function (S) {
    const last = S.upcoming >= S.order.length || S.mode === 'single';
    if (last || (S.support <= 0 && !S.settings.noFail)) { S.phase = 'end'; S.endReason = S.support <= 0 && !last ? 'fired' : 'complete'; G.Save.write('auto'); return; }
    S.phase = 'off'; S.month = 0; S.week = 0;
    const imp = 0;
    S.season = newSeasonState(null); S.season.impact = imp;
    S.offReg = [];
    C.inbox(S, 'Offseason begins', 'Use the summer and fall to research new mechanisms, attend offseason events with last season\'s robot, recruit, and line up sponsors. The next game is revealed at Kickoff in January.', 'info');
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
  C.fundFatigue = (S, id) => Math.pow(D.FUND_FATIGUE, (S.season && S.season.fundN && S.season.fundN[id]) || 0);
  C.doActivity = function (S, id) {
    const a = D.ACTIVITIES.find(x => x.id === id), rng = G.R;
    const lim = C.actLimits(S);
    if (lim.used >= lim.max) return 'The team has already done ' + lim.max + ' activities this ' + lim.unit + '. Try again next ' + lim.unit + '.';
    if ((lim.counts[id] || 0) >= lim.perType) return 'Already done this ' + lim.unit + (lim.perType > 1 ? ' (' + lim.perType + '×)' : '') + '.';
    if (S.money < a.cost) return 'Not enough money';
    S.actLog.counts[id] = (S.actLog.counts[id] || 0) + 1; S.actLog.total++;
    if (a.cost) C.spend(S, a.cost, a.name);
    let msg = '';
    if (a.kind === 'outreach') {
      S.season.impact += a.impact; S.season.outreach++; S.rep = Math.min(100, S.rep + a.rep);
      msg = '+' + a.impact + ' outreach points, +' + a.rep + ' reputation';
    } else {
      // donor fatigue: each repeat of the same fundraiser in this program year (June–May) pays less
      const fat = C.fundFatigue(S, a.id);
      S.season.fundN = S.season.fundN || {};
      S.season.fundN[a.id] = (S.season.fundN[a.id] || 0) + 1;
      let g;
      if (a.grant) { const p = (0.25 + C.impactRating(S).parts.outreach / 300) * fat; g = rng.chance(p) ? rng.int(a.money[0], a.money[1]) : 0; }
      else g = Math.round(rng.range(a.money[0], a.money[1]) * (a.repScale ? 0.5 + S.rep / 100 : 1) * (S.mentors.some(m => m.role === 'biz') ? 1.15 : 1) * fat);
      if (g) C.earn(S, g, a.name);
      msg = g ? 'Raised ' + U.money(g) + (fat < 1 ? ' (repeat donors give less: ×' + fat.toFixed(2) + ')' : '') : 'The application was not funded this time.';
    }
    return { ok: true, msg };
  };
  // Facilities are bought/upgraded through G.Shop; only the per-season practice field is handled here.
  C.buyEquip = function (S, id) {
    if (id !== 'field') return G.Shop.upgrade(S, id);
    if ((S.equip.field === S.year && S.phase !== 'off') || S.equip.field === 'pending') return 'Owned';
    const cost = D.FIELD.cost;
    if (S.money < cost) return 'Not enough money (' + U.money(cost) + ' needed)';
    C.spend(S, cost, D.FIELD.name);
    S.equip.field = S.phase === 'off' ? 'pending' : S.year;
    S.morale = Math.min(100, S.morale + 3);
    return null;
  };
  C.buyPart = function (S, id, tier) {
    const p = D.PARTS.find(x => x.id === id);
    const cur = S.parts[id] || 0;
    if (tier <= cur) return 'Already owned';
    let cost = p.tiers[tier].cost;
    if (C.hasPerk(S, 'partsDiscount')) cost *= 0.85;
    if (S.money < cost) return 'Not enough money';
    C.spend(S, cost, p.tiers[tier].name);
    S.parts[id] = tier;
    return null;
  };
  C.buyBatteries = (S, n) => G.Shop.buyBatteries(S, n);
  // Spare parts cost more when bought at an event (rush delivery to the pits).
  C.spareUnitPrice = function (S, atEvent) {
    return Math.round(D.SPARES_COST * (atEvent ? D.SPARES_EVENT_MULT : 1) * G.Shop.spareMult(S) * (C.hasPerk(S, 'partsDiscount') ? 0.85 : 1));
  };
  C.buySpares = function (S, n, atEvent) {
    const cost = n * C.spareUnitPrice(S, atEvent);
    if (S.money < cost) return 'Not enough money (' + U.money(cost) + ' needed)';
    C.spend(S, cost, n + ' spare parts' + (atEvent ? ' (at event)' : ''));
    S.parts.spares += n;
    return null;
  };
  C.registerOffseason = function (S, id) {
    const o = D.OFFSEASON_EVENTS.find(x => x.id === id);
    if (S.offReg.includes(id)) return 'Registered';
    if (!S.robot) return 'You need last season\'s robot';
    if (D.MONTHS.indexOf(o.month) < S.month) return 'Already past';
    if (S.money < o.fee) return 'Not enough money';
    C.spend(S, o.fee, 'Offseason: ' + o.name);
    S.offReg.push(id);
    return null;
  };
  C.setFeeders = function (S, n) { S.feeders = U.clamp(n, 0, 3); };
})();
