'use strict';
/* FRC Manager — the season's robots: subsystem designs, built copies on two robots (Robot 1 / Robot 2, either can
   compete), development projects, tech knowledge, driver familiarity, wear & repairs */
(function () {
  const U = G.U, D = G.Data;
  const Robot = G.Robot = {};
  const EFFORT = { rush: { name: 'Rush', h: 0.6, gain: 0.75, cost: 0.9, rel: -3 }, std: { name: 'Standard', h: 1, gain: 1, cost: 1, rel: 0 }, thorough: { name: 'Thorough', h: 1.4, gain: 1.2, cost: 1.15, rel: 2 } };
  Robot.EFFORT = EFFORT;
  Robot.WEIGHT_LIMIT = 125;

  // ---------------- Knowledge ----------------
  Robot.know = (S, area) => D.knowLevel(S.know[area] || 0);
  Robot.addXP = function (S, area, xp) {
    if (!area) return 0;
    let mult = 1 + (G.Career.hasPerk(S, 'xpBonus') ? 0.1 : 0);
    if (S.mentors.some(m => m.spec === area)) mult *= 1.5;
    const before = Robot.know(S, area);
    S.know[area] = Math.round((S.know[area] || 0) + xp * mult);
    S.usedAreas[area] = true;
    const after = Robot.know(S, area);
    if (after > before) G.Career.inbox(S, 'Knowledge level up: ' + D.AREA[area].name, 'Your team reached Level ' + after + ' in ' + D.AREA[area].name + '. Concepts that use it get higher ceilings, fewer build hours and better reliability.', 'know');
    return xp * mult;
  };
  const mainArea = c => (c.areas && c.areas[0]) || null;
  // The mechanism areas a concept depends on: a turret shooter is a flywheel shooter on a turret, so it needs both.
  // Vision, autonomous and electrical areas only count when a concept has nothing else (drivetrains, robot code).
  const SUPPORT = { vision: 1, autoPath: 1, elec: 1 };
  Robot.coreAreas = c => { const a = ((c && c.areas) || []).filter(x => !SUPPORT[x]); return a.length ? a : ((c && c.areas) || []).slice(0, 1); };
  // Knowledge level that applies to a concept: the average of its core areas
  Robot.lvl = (S, c) => { const a = Robot.coreAreas(c); return a.length ? a.reduce((t, x) => t + Robot.know(S, x), 0) / a.length : 0; };
  const lvlFor = (S, subId, c, stat) => (subId === 'soft' && D.STAT_AREA[stat] ? Robot.know(S, D.STAT_AREA[stat]) : Robot.lvl(S, c));

  // ---------------- Robots ----------------
  // S.robot = { year, design: {sub: the latest design}, soft: robot code (shared by both robots),
  //   bots: [Robot 1, Robot 2] as { name, subs: {sub: built unit} }, store: [built units not on a robot],
  //   comp: the competition robot, drive: the robot the drivers practice on, fam: driver familiarity }.
  // R.subs is the competition robot's subsystems (a getter, not saved). A unit with ver 0 is an empty slot.
  const emptyUnit = sub => ({ sub, concept: null, ver: 0, stats: {}, rel: 0, cond: 100, w: 0, hidden: 0, hours: 0 });
  Robot.emptyUnit = emptyUnit;
  Robot.link = function (R) {
    if (!R || !R.bots) return R;
    Object.defineProperty(R, 'subs', { get() { return this.bots[this.comp || 0].subs; }, enumerable: false, configurable: true });
    R.bots.forEach(b => { b.subs.soft = R.soft; });
    return R;
  };
  Robot.newSeason = function (S, year) {
    const soft = G.Seasons.concept(year, 'soft', 'code'), st = {};
    Object.keys(soft.base).forEach(k => st[k] = soft.base[k] + 3 * lvlFor(S, 'soft', soft, k));
    const R = { year, autoTier: 0, visionLvl: 0, pending: [], emergency: 0, comp: 0, drive: 0, store: [], fam: {}, design: {}, bots: [],
      soft: { sub: 'soft', concept: 'code', ver: 1, stats: st, rel: 90, cond: 100, w: 0, hidden: 0, hours: 0 } };
    G.Seasons[year].subs.forEach(sd => { if (sd.id !== 'soft') R.design[sd.id] = { concept: null, ver: 0, stats: {}, rel: 0, w: 0, hours: 0 }; });
    R.bots = [1, 2].map(n => { const subs = {}; G.Seasons[year].subs.forEach(sd => { subs[sd.id] = sd.id === 'soft' ? null : emptyUnit(sd.id); }); return { name: 'Robot ' + n, subs }; });
    S.robot = Robot.link(R);
    S.projects = S.projects.filter(p => p.type === 'research' || p.type === 'kb');
  };
  // Saves from before v2.1: one robot (R.subs) plus an optional practice robot
  Robot.migrate = function (S) {
    const R = S && S.robot;
    if (!R) return;
    if (!R.bots) {
      const old = R.subs || {}, year = R.year, two = !!R.practiceBot;
      delete R.subs; delete R.practiceBot;
      Object.assign(R, { soft: old.soft, design: {}, store: [], comp: 0, drive: two ? 1 : 0, fam: {} });
      if (R.soft) R.soft.sub = 'soft';
      const b1 = {}, b2 = {};
      G.Seasons[year].subs.forEach(sd => {
        const k = sd.id;
        if (k === 'soft') { b1.soft = b2.soft = null; return; }
        const s = old[k] || emptyUnit(k);
        R.design[k] = { concept: s.concept, ver: s.ver, stats: Object.assign({}, s.stats), rel: s.rel, w: s.w, hours: s.hours || 0 };
        if (!s.ver) { b1[k] = emptyUnit(k); b2[k] = emptyUnit(k); return; }
        const u = Object.assign({}, s, { uid: U.uid('u'), sub: k, kits: s.kit ? { [s.kit]: 1 } : null });
        delete u.kit;
        b1[k] = u;
        b2[k] = two ? Object.assign({}, u, { uid: U.uid('u'), stats: Object.assign({}, s.stats), cond: 100, hidden: 0, kits: null }) : emptyUnit(k);
        R.fam[k] = { c: s.concept, ver: s.ver, f: 0.85 };
      });
      R.bots = [{ name: 'Robot 1', subs: b1 }, { name: 'Robot 2', subs: b2 }];
    }
    Robot.link(R);
    (S.projects || []).forEach(p => {
      if (p.kit) { p.kits = { [p.kit]: 1 }; p.kitCov = 1; delete p.kit; }
      if (p.type === 'practiceBot' && !p.subs) { p.bot = Robot.other(R); p.subs = Object.keys(R.design).filter(k => R.design[k].ver); }
    });
  };

  // ---------------- Robot helpers ----------------
  Robot.des = (R, k) => (k === 'soft' ? R.soft : R.design[k]);
  Robot.other = R => 1 - (R.comp || 0);
  // Every built unit: on Robot 1, on Robot 2, or in storage
  Robot.allUnits = R => (R && R.bots ? R.bots.reduce((a, b) => a.concat(Object.keys(b.subs).filter(k => k !== 'soft' && b.subs[k] && b.subs[k].ver).map(k => b.subs[k])), []).concat(R.store || []) : []);
  Robot.findUnit = function (R, uid) {
    for (let i = 0; i < R.bots.length; i++) { const b = R.bots[i]; for (const k of Object.keys(b.subs)) if (k !== 'soft' && b.subs[k] && b.subs[k].uid === uid) return { u: b.subs[k], bi: i, k }; }
    const u = (R.store || []).find(x => x.uid === uid);
    return u ? { u, bi: -1, k: u.sub } : null;
  };
  // A new physical copy of a design (latest version unless `src` says otherwise)
  function makeUnit(k, src, extra) {
    return Object.assign({ uid: U.uid('u'), sub: k, concept: src.concept, ver: src.ver, stats: Object.assign({}, src.stats), rel: src.rel, cond: 100, w: src.w, hidden: 0, hours: 0, kits: null }, extra || {});
  }
  // Put a unit in robot bi's slot; whatever was there goes to storage
  function install(R, bi, k, u) {
    const old = R.bots[bi].subs[k];
    if (old && old.ver) R.store.push(old);
    R.bots[bi].subs[k] = u || emptyUnit(k);
  }
  Robot.isLatest = (R, k, u) => !!(u && u.ver && R.design[k] && u.concept === R.design[k].concept && u.ver >= R.design[k].ver);
  Robot.runnable = (R, bi) => !!(R && R.bots && R.bots[bi] && R.bots[bi].subs.drive && R.bots[bi].subs.drive.ver);
  Robot.twoBots = S => !!(S.robot && S.robot.bots && Robot.runnable(S.robot, 0) && Robot.runnable(S.robot, 1));
  // The robot that is not the competition robot runs this season (a test chassis counts), even before the competition robot drives
  Robot.secondRuns = S => { const R = S.robot; return !!(R && R.bots && R.year === S.year && S.phase !== 'off' && Robot.runnable(R, Robot.other(R))); };
  // The robot the drivers practice on (their pick if it can drive, otherwise the other one; -1 if neither can)
  Robot.driveBot = function (S) {
    const R = S.robot; if (!R || !R.bots) return -1;
    const d = R.drive || 0;
    return Robot.runnable(R, d) ? d : Robot.runnable(R, 1 - d) ? 1 - d : -1;
  };
  // How much of the competition robot the second robot copies (0–1): event tuning bonus
  Robot.secondShare = function (S) {
    const R = S.robot; if (!R || !R.bots || !Robot.runnable(R, Robot.other(R))) return 0;
    const ks = Object.keys(R.subs).filter(k => k !== 'soft' && R.subs[k].ver);
    if (!ks.length) return 0;
    const o = R.bots[Robot.other(R)].subs;
    return ks.filter(k => o[k] && o[k].ver && o[k].concept === R.subs[k].concept).length / ks.length;
  };
  // The competition drivetrain concept (built, or being built) and whether the second robot drives the same way:
  // tank (Kitbot, West Coast) or holonomic (Mecanum, Swerve). A matching test chassis lets programmers develop paths early.
  Robot.compDrive = function (S) {
    const R = S.robot; if (!R || !R.design) return null;
    const p = S.projects.find(x => x.type === 'build' && x.sub === 'drive');
    return p ? p.concept : R.design.drive && R.design.drive.ver ? R.design.drive.concept : null;
  };
  Robot.chassisMatch = function (S) {
    const R = S.robot; if (!R || !R.bots || R.year !== S.year || S.phase === 'off') return false;
    const o = R.bots[Robot.other(R)].subs.drive, cd = Robot.compDrive(S);
    return !!(o && o.ver && cd && D.DRIVE_FAMILY[o.concept] && D.DRIVE_FAMILY[o.concept] === D.DRIVE_FAMILY[cd]);
  };
  Robot.isPathProject = p => p.type === 'auto' || (p.type === 'upgrade' && p.sub === 'soft' && p.focus === 'auto');
  Robot.ceil = function (S, year, subId, c, stat) {
    let v = (c.ceil[stat] || 0) + 3 * lvlFor(S, subId, c, stat);
    // better motors, swerve modules and sensors raise ceilings (parts on the competition robot)
    if (S.robot && (stat === 'speed' || stat === 'scoreSpd' || stat === 'auto')) {
      const pp = G.Parts.profile(S);
      if (subId === 'drive' && stat === 'speed') v += 9 * pp.motor + (c.id === 'swerve' ? 4 * pp.swerve : 0);
      if (stat === 'scoreSpd') v += 7 * pp.motor;
      if (stat === 'auto') v += 6 * pp.enc;
    }
    return Math.min(99, Math.round(v));
  };
  // First time building something complex: any core area still at Level 0
  Robot.firstTime = (S, c) => c.cx >= 3 && Robot.coreAreas(c).some(a => Robot.know(S, a) === 0);
  // Mechanical COTS kits for a build: up to what the concept can use, from kits free on the shelf (minus `held`).
  // cov (0–1, price-weighted) is how much of the set you have: it cuts hours, materials and first-build penalties.
  Robot.kitQuote = function (S, year, k, c, held) {
    const want = G.Parts.kits(year, k, c), use = {};
    let wv = 0, uv = 0;
    Object.keys(want).forEach(cat => {
      const n = Math.max(0, Math.min(want[cat], G.Parts.kitsFree(S, cat) - ((held && held[cat]) || 0)));
      if (n) use[cat] = n;
      wv += want[cat] * D.COTS_PRICE[cat]; uv += n * D.COTS_PRICE[cat] * G.Parts.kitHealth(S, cat);
    });
    const cov = wv ? uv / wv : 0;
    return { want, use: Object.keys(use).length ? use : null, cov, hours: 1 - (1 - D.KIT_HOURS) * cov, cost: 1 - (1 - D.KIT_COST) * cov };
  };
  // Electronics a robot would need on top of what its slot already uses if concept c went there
  function extraFor(S, bi, k, c) {
    const nb = G.Parts.bom(S.robot.year, k, c), cb = G.Parts.slotBom(S, bi, k), x = {};
    Object.keys(nb).forEach(p => { const d = nb[p] - (cb[p] || 0); if (d > 0) x[p] = d; });
    return x;
  }
  // Parts missing if concept c went on robot bi (default: the competition robot); null if the shelves have enough
  Robot.buildShort = function (S, subId, c, bi) {
    const R = S.robot; if (!R) return null;
    if (bi == null) bi = R.comp || 0;
    if (bi < 0) return null;
    const miss = G.Parts.shortage(S, extraFor(S, bi, subId, c), bi === (R.comp || 0) ? 'comp' : 'prac');
    return miss.length ? G.Parts.shortText(miss) : null;
  };
  Robot.reqOk = function (S, c) { return null; };
  Robot.weightOf = (R, bi) => Math.round(Object.keys(R.bots[bi].subs).reduce((s, k) => s + (k !== 'soft' && R.bots[bi].subs[k] && R.bots[bi].subs[k].ver ? R.bots[bi].subs[k].w : 0), 0));
  Robot.weight = S => (S.robot ? Robot.weightOf(S.robot, S.robot.comp || 0) : 0);
  Robot.capOf = function (S, bi) {
    const R = S.robot;
    return G.Cap.build(R.year, R.bots[bi].subs, { autoTier: R.autoTier, visionLvl: R.visionLvl, pp: G.Parts.profile(S, bi === (R.comp || 0) ? 'comp' : 'prac') });
  };
  Robot.cap = S => Robot.capOf(S, S.robot.comp || 0);
  Robot.lookOf = function (S, bi) {
    const R = S.robot, lk = G.Cap.look(R.year, R.bots[bi].subs, { visionLvl: R.visionLvl });
    lk.c1 = S.team.c1; lk.c2 = S.team.c2;
    return lk;
  };
  Robot.look = S => Robot.lookOf(S, S.robot.comp || 0);
  Robot.condOf = (R, bi) => { const s = R.bots[bi].subs, ks = Object.keys(s).filter(k => k !== 'soft' && s[k] && s[k].ver); return ks.length ? U.avg(ks.map(k => s[k].cond)) : 100; };
  Robot.condAvg = S => Robot.condOf(S.robot, S.robot.comp || 0);
  Robot.hidden = S => Object.values(S.robot.subs).reduce((s, x) => s + (x && x.ver ? x.hidden : 0), 0);

  // ---------------- Driver familiarity ----------------
  // R.fam[sub] = { c: concept, ver, f }: the version the drive team last drove and how well they know it (0–1).
  // Switching between very different concepts (a dumper to a turret, tank to swerve) costs far more than a new version.
  Robot.famDrop = function (year, k, a, b) {
    const ca = G.Seasons.concept(year, k, a), cb = G.Seasons.concept(year, k, b);
    if (!ca || !cb) return 0.6;
    const A = Robot.coreAreas(ca), B = Robot.coreAreas(cb), inter = A.filter(x => B.includes(x)).length, uni = new Set(A.concat(B)).size || 1;
    return U.clamp(0.2 + 0.3 * (1 - inter / uni) + 0.04 * Math.abs(ca.cx - cb.cx), 0.15, 0.65);
  };
  // Familiarity the drivers would have with unit u (null for robot code and empty slots)
  Robot.famOf = function (R, k, u) {
    if (k === 'soft' || !u || !u.ver || u.concept === 'none') return null;
    const m = R.fam && R.fam[k];
    if (!m) return D.FAM.NEW;
    if (m.c === u.concept) return m.f * Math.max(0.7, 1 - D.FAM.VER * Math.abs(u.ver - m.ver));
    return m.f * (1 - Robot.famDrop(R.year, k, m.c, u.concept));
  };
  const FAM_W = { drive: 1.5, frame: 0.5 };
  Robot.famAvg = function (R, bi) {
    const s = R.bots[bi].subs; let t = 0, w = 0;
    Object.keys(s).forEach(k => { const f = Robot.famOf(R, k, s[k]); if (f == null) return; const wt = FAM_W[k] || 1; t += f * wt; w += wt; });
    return w ? t / w : null;
  };
  // The drive team drives robot bi: their know-how moves to its subsystems, then closes g of the gap to 1
  Robot.famDrive = function (S, bi, g) {
    const R = S.robot; if (!R || !R.bots || bi == null || bi < 0) return;
    R.fam = R.fam || {};
    const s = R.bots[bi].subs, ci = R.comp || 0;
    Object.keys(s).forEach(k => {
      const f = Robot.famOf(R, k, s[k]); if (f == null) return;
      const cu = bi !== ci ? R.bots[ci].subs[k] : null;
      if (cu && cu.ver && cu.concept !== 'none' && cu.concept !== s[k].concept) {
        // driving a different mechanism (a test chassis): general skills carry over partly to the competition robot's one
        const fc = Robot.famOf(R, k, cu);
        if (fc != null) R.fam[k] = { c: cu.concept, ver: cu.ver, f: Math.min(1, fc + (1 - fc) * (g || 0) * 0.4) };
        return;
      }
      R.fam[k] = { c: s[k].concept, ver: s[k].ver, f: Math.min(1, f + (1 - f) * (g || 0)) };
    });
  };
  // Match multiplier on a subsystem's stats
  Robot.famMult = f => (f == null ? 1 : 1 - D.FAM.EFFECT * (1 - f));

  // ---------------- Garage: built subsystems on the two robots ----------------
  Robot.garageLock = S => (S.event && S.event.stage !== 'done' ? 'Finish the event first: only the competition robot is there.' : null);
  function missingTotal(S) {
    const n = G.Parts.need(S), tot = {};
    [n.comp, n.prac].forEach(b => Object.keys(b).forEach(c => { tot[c] = (tot[c] || 0) + b[c]; }));
    return Object.keys(tot).reduce((t, c) => t + Math.max(0, tot[c] - G.Parts.count(S, c)), 0);
  }
  // Install u on robot bi unless that leaves the robots short of parts; then it goes to storage. Returns where it went.
  function tryInstall(S, bi, k, u) {
    const R = S.robot, before = missingTotal(S), old = R.bots[bi].subs[k], store = R.store.slice();
    install(R, bi, k, u); S.wearTick = (S.wearTick || 0) + 1;
    if (missingTotal(S) <= before) return bi;
    R.bots[bi].subs[k] = old; R.store = store; R.store.push(u); S.wearTick++;
    return -1;
  }
  // Move a built unit (from storage or the other robot) onto robot bi; from the other robot, the two swap
  Robot.place = function (S, uid, bi) {
    const R = S.robot, lock = Robot.garageLock(S); if (lock) return lock;
    const f = Robot.findUnit(R, uid); if (!f) return 'Not found';
    if (f.bi === bi) return null;
    const k = f.k, before = missingTotal(S), snap = { store: R.store.slice(), a: R.bots[0].subs[k], b: R.bots[1].subs[k] };
    if (f.bi < 0) { R.store = R.store.filter(x => x !== f.u); install(R, bi, k, f.u); }
    else { const cur = R.bots[bi].subs[k]; R.bots[f.bi].subs[k] = cur && cur.ver ? cur : emptyUnit(k); R.bots[bi].subs[k] = f.u; }
    S.wearTick = (S.wearTick || 0) + 1;
    if (missingTotal(S) > before) {
      const txt = G.Parts.shortText(G.Parts.shortage(S));
      R.store = snap.store; R.bots[0].subs[k] = snap.a; R.bots[1].subs[k] = snap.b; S.wearTick++;
      return 'Not enough electronics for both robots. ' + txt;
    }
    return null;
  };
  Robot.unmount = function (S, bi, k) {
    const R = S.robot, lock = Robot.garageLock(S); if (lock) return lock;
    if (!R.bots[bi].subs[k] || !R.bots[bi].subs[k].ver) return null;
    if (Robot.storeRoom(R, k) < 1) return 'Storage is full (' + D.STORE_MAX + ' ' + G.Seasons.sub(R.year, k).name.toLowerCase() + ' units). Take one apart first.';
    install(R, bi, k, null); S.wearTick = (S.wearTick || 0) + 1;
    return null;
  };
  // Storage holds D.STORE_MAX built subsystems of each kind. Taking one apart harvests spare parts (more for complex,
  // well-kept ones) and puts its mechanism kits back on the shelf.
  Robot.storeCount = (R, k) => (R.store || []).filter(u => u.sub === k).length;
  Robot.storeRoom = (R, k) => D.STORE_MAX - Robot.storeCount(R, k);
  // Spare parts back: about half of what a copy's materials cost, scaled by condition (so building to scrap never pays)
  Robot.harvestValue = (R, u) => { const c = G.Seasons.concept(R.year, u.sub, u.concept); if (!c) return 0; return Math.floor(0.5 * (0.55 * c.cost + 150 * c.cx) * D.COPY_COST * (u.cond / 100) / D.SPARES_COST); };
  Robot.harvest = function (S, uid) {
    const R = S.robot, u = (R.store || []).find(x => x.uid === uid);
    if (!u) return 'Not found';
    const n = Robot.harvestValue(R, u);
    R.store = R.store.filter(x => x !== u);
    S.parts.spares += n; S.wearTick = (S.wearTick || 0) + 1;
    return { spares: n, kits: u.kits || null, name: (G.Seasons.concept(R.year, u.sub, u.concept) || {}).name || u.sub };
  };
  // Over the storage limit: take apart the least useful (not a spare for the competition robot, oldest, most worn)
  Robot.storeWorst = function (R, k) {
    const cu = R.subs[k], keep = u => (cu && cu.ver && u.concept === cu.concept && u.ver === cu.ver ? 1 : 0);
    return R.store.filter(u => u.sub === k).sort((a, b) => keep(a) - keep(b) || (a.concept === (R.design[k] || {}).concept) - (b.concept === (R.design[k] || {}).concept) || a.ver - b.ver || a.cond - b.cond)[0] || null;
  };
  function trimStore(S) {
    const R = S.robot; if (!R || !R.store) return;
    Object.keys(R.design).forEach(k => {
      while (Robot.storeCount(R, k) > D.STORE_MAX) {
        const u = Robot.storeWorst(R, k), r = Robot.harvest(S, u.uid);
        G.Career.inbox(S, 'Storage full: ' + r.name + ' taken apart', 'There is room for ' + D.STORE_MAX + ' stored ' + G.Seasons.sub(R.year, k).name.toLowerCase() + ' units. The oldest one (v' + u.ver + ') was taken apart' + (r.spares ? ': +' + r.spares + ' spare part' + (r.spares > 1 ? 's' : '') : '') + (r.kits ? (r.spares ? ', and' : ':') + ' its mechanism kits are back on the shelf' : '') + '.', 'dev');
      }
    });
  }
  Robot.trimStore = trimStore;
  Robot.setComp = function (S, bi) {
    const R = S.robot, lock = Robot.garageLock(S); if (lock) return lock;
    if (!Robot.runnable(R, bi)) return R.bots[bi].name + ' has no drivetrain yet';
    R.comp = bi; R.pending = []; S.wearTick = (S.wearTick || 0) + 1;
    return null;
  };
  Robot.setDrive = function (S, bi) {
    const R = S.robot;
    if (!Robot.runnable(R, bi)) return R.bots[bi].name + ' has no drivetrain yet';
    R.drive = bi;
    return null;
  };
  // Where a new copy of a subsystem goes: the second robot if it lacks the latest version, then the competition
  // robot, otherwise storage as a spare (-1)
  Robot.copyTarget = function (R, k) {
    const o = Robot.other(R), c = R.comp || 0;
    if (!Robot.isLatest(R, k, R.bots[o].subs[k])) return o;
    if (!Robot.isLatest(R, k, R.bots[c].subs[k])) return c;
    return -1;
  };
  // Subsystems a full copy of the robot would build for the second robot
  Robot.fullCopySubs = R => Object.keys(R.design).filter(k => R.design[k].ver && R.design[k].concept !== 'none' && !Robot.isLatest(R, k, R.bots[Robot.other(R)].subs[k]));
  // The unit an upgrade, hardening or lightweighting reworks: the competition robot's (same concept), else the newest one
  function targetUnit(R, k) {
    const d = R.design[k], ci = R.comp || 0, c = R.bots[ci].subs[k];
    if (c && c.ver && c.concept === d.concept) return c;
    const list = [R.bots[1 - ci].subs[k]].concat(R.store.filter(u => u.sub === k)).filter(u => u && u.ver && u.concept === d.concept).sort((a, b) => b.ver - a.ver);
    return list[0] || null;
  }
  Robot.setNone = function (S, k) {
    const R = S.robot;
    R.design[k] = { concept: 'none', ver: 0, stats: {}, rel: 0, w: 0, hours: 0 };
    [0, 1].forEach(bi => { if (R.bots[bi].subs[k] && R.bots[bi].subs[k].ver) install(R, bi, k, null); });
    S.wearTick = (S.wearTick || 0) + 1;
    trimStore(S);
  };

  // ---------------- Projects ----------------
  function hwMult(S, subId) {
    let m = G.Shop.hwHoursMult(S);
    m *= 1 - 0.12 * G.Career.mentorSkill(S, 'fab') / 100;
    if (G.Career.hasPerk(S, 'fabSpeed')) m *= 0.9;
    if (G.Parts.count(S, 'pneu') && (subId === 'intake' || subId === 'scorer')) m *= 0.85;
    return m * G.Parts.devMult(S);
  }
  function swMult(S) {
    let m = G.Shop.swHoursMult(S);
    m *= 1 - 0.2 * G.Career.mentorSkill(S, 'prog') / 100;
    if (G.Career.hasPerk(S, 'progSpeed')) m *= 0.85;
    return m * G.Parts.devMult(S);
  }
  const copyHours = (S, k, c, kq) => c.hours * D.COPY_HOURS * (1 - 0.06 * Robot.lvl(S, c)) * kq.hours * hwMult(S, k);
  const copyCost = (c, kq) => (0.55 * c.cost + 150 * c.cx) * D.COPY_COST * kq.cost;
  // Returns {hours, cost, name, err, fields (stored on the project), kitCov}
  Robot.quote = function (S, spec) {
    const R = S.robot, year = R ? R.year : S.year;
    const ef = EFFORT[spec.effort || 'std'];
    let hours = 0, cost = 0, name = '', err = null, fields = {};
    const des = spec.sub && R ? Robot.des(R, spec.sub) : null;
    const sd = spec.sub ? G.Seasons.sub(year, spec.sub) : null;
    if (['harden', 'light', 'copy'].includes(spec.type) && spec.sub === 'soft') return { hours: 0, cost: 0, name: '', err: 'Not for robot code', fields };
    if (['upgrade', 'harden', 'light', 'copy'].includes(spec.type) && (!des || !des.ver)) return { hours: 0, cost: 0, name: '', err: 'Build this subsystem first', fields };
    if (spec.type !== 'research' && spec.type !== 'kb' && !R) return { hours: 0, cost: 0, name: '', err: 'No robot this season yet', fields };
    switch (spec.type) {
      case 'build': {
        const c = G.Seasons.concept(year, spec.sub, spec.concept);
        err = Robot.buildShort(S, spec.sub, c);
        // mechanical COTS kits (as many as are free on the shelf) speed the build and soften first-build penalties
        const kq = Robot.kitQuote(S, year, spec.sub, c), first = Robot.firstTime(S, c);
        hours = c.hours * ef.h * (1 - 0.06 * Robot.lvl(S, c)) * (first ? 1 + 0.2 * (1 - kq.cov) : 1) * kq.hours * hwMult(S, spec.sub);
        cost = (0.55 * c.cost + 150 * c.cx) * ef.cost * kq.cost * D.PROTO_COST; // materials (a prototype); motors, electronics and kits come from the inventory
        fields = { kits: kq.use, kitCov: kq.cov };
        name = (des && des.ver ? 'Switch to ' : 'Build ') + c.name;
        break;
      }
      case 'copy': {
        // another copy of the current design (for the second robot, or a spare); no design work, no knowledge gain
        const c = G.Seasons.concept(year, spec.sub, des.concept), bi = Robot.copyTarget(R, spec.sub);
        if (bi >= 0) err = Robot.buildShort(S, spec.sub, c, bi);
        const kq = Robot.kitQuote(S, year, spec.sub, c);
        hours = copyHours(S, spec.sub, c, kq); cost = copyCost(c, kq);
        fields = { kits: kq.use, kitCov: kq.cov, bot: bi, concept: des.concept, snap: { ver: des.ver, stats: Object.assign({}, des.stats), rel: des.rel, w: des.w } };
        name = 'Build ' + c.name + ' for ' + (bi >= 0 ? R.bots[bi].name : 'storage (spare)');
        break;
      }
      case 'upgrade': {
        const c = G.Seasons.concept(year, spec.sub, des.concept);
        const soft = spec.sub === 'soft';
        hours = (soft ? 60 : 40 + 20 * c.cx) * ef.h * (1 - 0.06 * lvlFor(S, spec.sub, c, spec.focus)) * (soft ? swMult(S) : hwMult(S, spec.sub));
        cost = (soft ? 120 : (250 + 200 * c.cx) * D.PROTO_COST) * ef.cost;
        name = sd.name + ' upgrade (' + (D.STAT[spec.focus] || spec.focus) + ')';
        break;
      }
      case 'harden': { const c = G.Seasons.concept(year, spec.sub, des.concept); hours = (40 + 10 * c.cx) * hwMult(S, spec.sub) * (1 - G.Shop.fx(S, 'weld', 'weld')); cost = 100 + 50 * c.cx; name = sd.name + ' hardening'; break; }
      case 'light': { hours = 40 * hwMult(S, spec.sub) * (1 - G.Shop.fx(S, 'weld', 'weld')); cost = 150; name = sd.name + ' lightweighting'; break; }
      case 'auto': {
        const t = R.autoTier;
        if (t >= 3) err = 'Best auto already';
        hours = (60 + 40 * (t + 1)) * swMult(S); cost = 100;
        name = 'Auto routine: ' + (G.Seasons[year].autoTiers[Math.min(3, t + 1)]);
        break;
      }
      case 'vision': {
        const l = R.visionLvl;
        if (l >= 2) err = 'Vision maxed';
        else if (G.Parts.count(S, 'camera') < l + 1) err = 'Needs ' + (l + 1) + ' vision camera' + (l ? 's' : '') + ' (Inventory)';
        hours = 120 * (l + 1) * swMult(S); cost = 200;
        name = 'Vision Level ' + (l + 1) + (l === 0 ? ' (auto-aim)' : ' (shoot on the move)');
        break;
      }
      case 'practiceBot': {
        // a full copy: every finished subsystem the second robot doesn't have yet, built in one batch
        const o = Robot.other(R), subs = Robot.fullCopySubs(R), held = {}, bySub = {}, extra = {};
        if (!R.design.drive || !R.design.drive.ver) err = 'Build a drivetrain first';
        else if (!subs.length) err = R.bots[o].name + ' already has every subsystem';
        subs.forEach(k => {
          const c = G.Seasons.concept(year, k, R.design[k].concept), kq = Robot.kitQuote(S, year, k, c, held);
          Object.keys(kq.use || {}).forEach(cat => { held[cat] = (held[cat] || 0) + kq.use[cat]; });
          if (kq.use) bySub[k] = kq.use;
          hours += copyHours(S, k, c, kq); cost += copyCost(c, kq);
          const x = extraFor(S, o, k, c); Object.keys(x).forEach(p => { extra[p] = (extra[p] || 0) + x[p]; });
        });
        hours *= 0.9; cost *= 0.9; // one batch: shared setup
        if (!err) { const miss = G.Parts.shortage(S, extra, 'prac'); if (miss.length) err = 'A second set of electronics: ' + G.Parts.shortText(miss); }
        fields = { bot: o, subs, kits: Object.keys(held).length ? held : null, kitsBySub: bySub };
        name = 'Build ' + R.bots[o].name + ' (copy of every subsystem)';
        break;
      }
      case 'testChassis': {
        // a simple drivetrain for the second robot, from parts on the shelf: no design work, no project slot
        const o = Robot.other(R), c = G.Seasons.concept(year, 'drive', spec.concept), cur = R.bots[o].subs.drive;
        if (!c || !D.CHASSIS_CONCEPTS.includes(c.id)) { err = 'Pick a simple drivetrain (Kitbot Tank, Mecanum or West Coast Drive)'; break; }
        if (cur && cur.ver) err = R.bots[o].name + ' already has a drivetrain';
        else err = Robot.buildShort(S, 'drive', c, o);
        hours = c.hours * D.CHASSIS_HOURS_MULT * (1 - 0.06 * Robot.lvl(S, c)) * hwMult(S, 'drive');
        cost = (0.55 * c.cost + 150 * c.cx) * D.COPY_COST;
        fields = { bot: o, concept: c.id };
        name = 'Test chassis (' + c.name + ') for ' + R.bots[o].name;
        break;
      }
      case 'kb': { if (S.equip.kb) err = 'Already built'; hours = 60; cost = 0; name = 'Knowledge Base (wiki + CAD library)'; break; }
      case 'impact': { if (S.season && S.season.impactDone) err = 'Already submitted this season'; hours = 40; cost = 100; name = 'Impact Award submission'; break; }
      case 'research': {
        const r = D.RESEARCH.find(x => x.id === spec.rid);
        hours = r.hours * (1 - 0.04 * Robot.know(S, r.area)); cost = r.cost; name = r.name;
        break;
      }
    }
    // one design project per subsystem at a time (copies run alongside, one at a time)
    if (spec.sub && S.projects.some(p => p.sub === spec.sub && (spec.type === 'copy') === (p.type === 'copy'))) err = err || (spec.type === 'copy' ? 'A copy of this subsystem is already being built' : 'A project on this subsystem is already running');
    if (['auto', 'vision', 'practiceBot', 'impact', 'testChassis'].includes(spec.type) && S.projects.some(p => p.type === spec.type)) err = err || 'Already in progress';
    if (spec.type === 'testChassis' && S.projects.some(p => p.type === 'practiceBot')) err = err || 'A full copy is already being built for the second robot';
    if (spec.type === 'research' && S.projects.some(p => p.rid === spec.rid)) err = err || 'Already in progress';
    if (G.Career.hasPerk(S, 'partsDiscount') && spec.type !== 'research') cost *= 0.92;
    // storage limit: a unit this build pushes off a robot (or a spare) goes to storage; if that is full, the oldest is taken apart
    let note = null;
    if (R && R.bots && spec.type === 'practiceBot' && (fields.subs || []).some(k => R.bots[fields.bot].subs[k] && R.bots[fields.bot].subs[k].ver && Robot.storeRoom(R, k) < 1)) note = 'Storage is full for some subsystems: the oldest stored ones will be taken apart for spare parts when this finishes.';
    if (R && R.bots && spec.sub && spec.sub !== 'soft' && ['build', 'copy'].includes(spec.type)) {
      const bi = spec.type === 'build' ? R.comp || 0 : fields.bot, slot = bi >= 0 ? R.bots[bi].subs[spec.sub] : null;
      if ((bi < 0 || (slot && slot.ver)) && Robot.storeRoom(R, spec.sub) < 1) note = 'Storage is full: the oldest stored ' + sd.name.toLowerCase() + ' will be taken apart for spare parts when this finishes.';
    }
    return { hours: Math.max(10, Math.round(hours)), cost: Math.round(cost), name, err, fields, note, kitCov: fields.kitCov || 0, kits: fields.kits || null };
  };
  // Permanent slots (base 2 + Design/Fab mentors + sponsor perk + facilities) are capped at MAX_SLOTS; temporary boost/guest slots go on top.
  Robot.MAX_SLOTS = 6;
  Robot.slotParts = S => ({ base: 2, mentors: S.mentors.filter(m => m.role === 'design' || m.role === 'fab').length, perk: G.Career.hasPerk(S, 'tempMentor') ? 1 : 0, facilities: G.Shop.facilitySlots(S), temp: G.Shop.boostSlots(S) });
  Robot.permSlots = S => { const p = Robot.slotParts(S); return Math.min(Robot.MAX_SLOTS, p.base + p.mentors + p.perk + p.facilities); };
  Robot.slots = S => Robot.permSlots(S) + G.Shop.boostSlots(S);
  // Fabrication (copies of finished designs, a full second robot) uses team hours but no project slot
  Robot.isFab = p => p.type === 'copy' || p.type === 'practiceBot' || p.type === 'testChassis';
  Robot.slotUsed = S => S.projects.filter(p => !Robot.isFab(p)).length;
  Robot.slotText = S => { const p = Robot.slotParts(S), raw = p.base + p.mentors + p.perk + p.facilities; return p.base + ' base + ' + p.mentors + ' mentors' + (p.perk ? ' + 1 sponsor' : '') + ' + ' + p.facilities + ' facilities' + (raw > Robot.MAX_SLOTS ? ' (capped at ' + Robot.MAX_SLOTS + ')' : ' (max ' + Robot.MAX_SLOTS + ')') + (p.temp ? ' + ' + p.temp + ' temporary' : ''); };
  Robot.startProject = function (S, spec) {
    const q = Robot.quote(S, spec);
    if (q.err) return q.err;
    if (!Robot.isFab(spec) && Robot.slotUsed(S) >= Robot.slots(S)) return 'All project slots are busy (' + Robot.slots(S) + '). Hire Design/Fabrication mentors or upgrade facilities for more (max ' + Robot.MAX_SLOTS + ' permanent).';
    { const e = G.Career.afford(S, q.cost); if (e) return e; }
    G.Career.spend(S, q.cost, q.name);
    S.projects.push(Object.assign({ id: U.uid('p'), name: q.name, need: q.hours, done: 0, prio: spec.prio || 'normal', cost: q.cost, started: G.Career.dateLabel(S), extra: 0 }, q.fields, spec));
    S.wearTick = (S.wearTick || 0) + 1;
    return null;
  };
  Robot.cancelProject = function (S, id) {
    const p = S.projects.find(x => x.id === id);
    if (!p) return;
    S.projects = S.projects.filter(x => x !== p);
    S.wearTick = (S.wearTick || 0) + 1;
    const refund = Math.round(p.cost * 0.4 * (1 - p.done / p.need));
    if (refund > 0) G.Career.earn(S, refund, 'Refund: ' + p.name);
  };
  // Development category of a project (used by shop incidents and boosts)
  Robot.cat = p => (p.type === 'research' || p.type === 'kb' || p.type === 'impact') ? 'research' : (p.type === 'auto' || p.type === 'vision' || p.sub === 'soft') ? 'soft' : 'fab';
  // A sub-team can only put so many hours into one project per week (×4 for an offseason month).
  Robot.capFor = (S, p) => D.PROJ_CAP * (S.phase === 'off' ? 4 : 1) * (p.prio === 'high' ? 1.25 : p.prio === 'low' ? 0.75 : 1);
  // Plan how this turn's hours are shared: by priority, limited by each project's weekly cap and remaining work.
  // mods: optional { fab, soft, research } progress multipliers. Returns { give: {projectId: hours}, idle, hours }.
  Robot.alloc = function (S, hours, mods) {
    const W = { high: 3, normal: 2, low: 1 };
    const mult = p => (mods && mods[Robot.cat(p)] != null ? mods[Robot.cat(p)] : 1);
    const give = {};
    const rem = p => (p.need - p.done) / Math.max(mult(p), 0.01) - (give[p.id] || 0);
    const room = p => Robot.capFor(S, p) - (give[p.id] || 0);
    let left = Math.max(0, hours);
    for (let pass = 0; pass < 8 && left > 0.5; pass++) {
      const act = S.projects.filter(p => mult(p) > 0 && rem(p) > 0.01 && room(p) > 0.01);
      if (!act.length) break;
      const tw = act.reduce((s, p) => s + W[p.prio], 0);
      let used = 0;
      act.forEach(p => { const take = Math.min(left * W[p.prio] / tw, rem(p), room(p)); give[p.id] = (give[p.id] || 0) + take; used += take; });
      left -= used;
      if (used < 0.01) break;
    }
    // polish: hours that would sit idle go to projects with extra hours set (up to a second weekly cap each)
    const pol = {};
    const polLeft = p => (p.extra || 0) - (p.polish || 0) - (pol[p.id] || 0) * mult(p);
    const polRoom = p => 2 * Robot.capFor(S, p) - (give[p.id] || 0) - (pol[p.id] || 0);
    for (let pass = 0; pass < 6 && left > 0.5; pass++) {
      const act = S.projects.filter(p => mult(p) > 0 && polLeft(p) > 0.01 && polRoom(p) > 0.01);
      if (!act.length) break;
      const tw = act.reduce((s, p) => s + W[p.prio], 0);
      let used = 0;
      act.forEach(p => { const take = Math.min(left * W[p.prio] / tw, polLeft(p) / Math.max(mult(p), 0.01), polRoom(p)); pol[p.id] = (pol[p.id] || 0) + take; used += take; });
      left -= used;
      if (used < 0.01) break;
    }
    return { give, pol, idle: Math.max(0, left), hours, mult };
  };
  // Extra hours on a project raise its quality with diminishing returns: 1 − e^(−1.6 × extra/need).
  // Doubling a project's hours gets about 80% of the maximum bonus; it never makes anything perfect.
  Robot.polishQ = p => 1 - Math.exp(-1.6 * (p.polish || 0) / Math.max(1, p.need));
  Robot.polishQFor = (p, extra) => 1 - Math.exp(-1.6 * extra / Math.max(1, p.need));
  // ---------------- Development testing ----------------
  // Projects that can use practice-field testing time (everything except the Impact submission)
  Robot.testable = p => p.type !== 'impact' && p.type !== 'kb' && !Robot.isFab(p);
  // what a bare test chassis can test without a Practice Field: robot code, autos, vision and the drivetrain itself
  Robot.chassisTestable = p => Robot.testable(p) && (p.sub === 'soft' || p.sub === 'drive' || p.type === 'auto' || p.type === 'vision');
  Robot.testCap = S => D.TEST_PER_PROJ * (S.phase === 'off' ? 4 : 1);
  // How validated a project is: 0 (untested) … 1 (fully tested) → better upgrade quality on completion
  Robot.testQ = p => Math.min(1, (p.test || 0) / Math.max(1, p.need * D.TEST_Q));
  // Share development-testing hours between projects that are getting work this turn (each can absorb testCap).
  Robot.testPlan = function (S, devH, give, limited) {
    const out = {}, cap = Robot.testCap(S);
    let left = Math.max(0, devH);
    for (let pass = 0; pass < 4 && left > 0.05; pass++) {
      // a project can only absorb testing in proportion to the build work going into it this turn
      const capOf = p => Math.min(cap, D.TEST_SHARE * (give[p.id] || 0));
      const act = S.projects.filter(p => (limited ? Robot.chassisTestable(p) : Robot.testable(p)) && capOf(p) - (out[p.id] || 0) > 0.01);
      if (!act.length) break;
      const each = left / act.length;
      act.forEach(p => { const t = Math.min(each, capOf(p) - (out[p.id] || 0)); out[p.id] = (out[p.id] || 0) + t; left -= t; });
    }
    return { give: out, idle: left };
  };
  // Apply this turn's hours (and development-testing hours); returns completed project names and testing use
  Robot.work = function (S, hours, mods, devH, limited) {
    const a = Robot.alloc(S, hours, mods), done = [];
    const tp = Robot.testPlan(S, devH || 0, a.give, limited), perH = D.TEST_GAIN / (S.phase === 'off' ? 4 : 1);
    let bonus = 0;
    let polished = 0;
    const pathBoost = Robot.chassisMatch(S) ? D.CHASSIS_PATH : 0; // paths tried on a second robot that drives the same way
    if (pathBoost && hours > 0 && S.phase !== 'off') Robot.addXP(S, 'autoPath', D.CHASSIS_PATH_XP);
    S.projects.forEach(p => {
      const h = a.give[p.id] || 0, t = tp.give[p.id] || 0, ph = a.pol[p.id] || 0;
      const extra = h * a.mult(p) * (t * perH + (pathBoost && Robot.isPathProject(p) ? pathBoost : 0)); // testing catches problems early: less rework
      p.done += h * a.mult(p) + extra; p.lastHours = Math.round(h + ph);
      p.polish = (p.polish || 0) + ph * a.mult(p); p.lastPolish = ph; polished += ph;
      p.test = (p.test || 0) + t; p.lastTest = t; bonus += extra;
    });
    // finished when the work is done and the extra hours are in (or no hours were free for polishing this turn)
    const fin = p => p.done >= p.need - 0.01 && ((p.polish || 0) >= (p.extra || 0) - 0.01 || !(a.pol[p.id] > 0.01));
    const finished = S.projects.filter(fin);
    S.projects = S.projects.filter(p => !fin(p));
    finished.forEach(p => { Robot.complete(S, p); done.push(p.name); });
    if (finished.length) S.wearTick = (S.wearTick || 0) + 1;
    return { done, spare: a.idle, used: hours - a.idle, polished, testUsed: (devH || 0) - tp.idle, testIdle: tp.idle, testBonus: bonus };
  };

  // ---------------- Weekly design suggestion ----------------
  const STAT_W = { scoreSpd: 1.25, accuracy: 1.25, intake: 1.0, speed: 0.95, endgame: 0.9, range: 0.85, agility: 0.6, push: 0.45, auto: 0.7, vision: 0.6, balance: 0.8, ampSkill: 0.7, amp: 0.7, algae: 0.7, traverse: 0.6, feed: 0.8 };
  Robot.suggest = function (S) {
    const R = S.robot;
    if (!R || R.year !== S.year || !['kickoff', 'build', 'comp'].includes(S.phase)) return null;
    const year = R.year, busy = k => S.projects.some(p => p.sub === k && p.type !== 'copy');
    const mk = (spec, title, reason) => { const q = Robot.quote(S, Object.assign({ effort: 'std' }, spec)); return q.err ? null : { spec: Object.assign({ effort: 'std' }, spec), title, reason, quote: q }; };
    const subs = G.Seasons[year].subs.filter(sd => sd.id !== 'soft');
    // 1) anything not designed and built yet
    for (const sd of subs) {
      const d = R.design[sd.id];
      if (d.ver || d.concept === 'none' || busy(sd.id)) continue;
      const opts = sd.concepts.filter(c => c.id !== 'none' && !Robot.reqOk(S, c));
      const score = c => Object.keys(c.ceil).reduce((t, k) => t + Robot.ceil(S, year, sd.id, c, k) * (STAT_W[k] || 0.7), 0) / Math.max(1, Object.keys(c.ceil).length) - (Robot.firstTime(S, c) ? 12 : 0) - c.cx * 2;
      const best = opts.sort((p, q) => score(q) - score(p))[0];
      if (best) { const r = mk({ type: 'build', sub: sd.id, concept: best.id }, 'Build the ' + sd.name + ': ' + best.name, 'Nothing is built for the ' + sd.name + ' yet, and the robot can\'t use it in matches until it is.'); if (r) return r; }
    }
    // 2) over the weight limit (the competition robot)
    if (Robot.weight(S) > Robot.WEIGHT_LIMIT) {
      const k = Object.keys(R.subs).filter(k => R.subs[k].ver && k !== 'soft' && !busy(k)).sort((a, b) => R.subs[b].w - R.subs[a].w)[0];
      if (k) { const r = mk({ type: 'light', sub: k }, 'Lighten the ' + G.Seasons.sub(year, k).name, 'The robot is ' + Robot.weight(S) + ' lb — over the 125 lb limit, so it will fail inspection.'); if (r) return r; }
    }
    // 3) a weak link in reliability on the competition robot
    const weak = Object.keys(R.subs).filter(k => k !== 'soft' && R.subs[k].ver && !busy(k) && (R.subs[k].rel < 55 || R.subs[k].hidden > 0)).sort((a, b) => R.subs[a].rel - R.subs[b].rel)[0];
    if (weak) { const r = mk({ type: 'harden', sub: weak }, 'Harden the ' + G.Seasons.sub(year, weak).name, 'Its reliability is only ' + R.subs[weak].rel + (R.subs[weak].hidden ? ' and the crew suspects a hidden fault' : '') + '. Breakdowns in matches cost more than a slower upgrade.'); if (r) return r; }
    // 4) autonomous routine
    if (R.autoTier < 2 && !S.projects.some(p => p.type === 'auto')) { const r = mk({ type: 'auto' }, 'Write a better auto: ' + G.Seasons[year].autoTiers[R.autoTier + 1], 'Auto points are cheap to earn and count for bonus ranking points in several games.'); if (r) return r; }
    // 5) biggest weighted gap to a stat ceiling
    let best = null;
    G.Seasons[year].subs.forEach(sd => {
      const k = sd.id, s = Robot.des(R, k); if (!s || !s.ver || busy(k)) return;
      const c = G.Seasons.concept(year, k, s.concept); if (!c) return;
      Object.keys(c.ceil).forEach(st => {
        if (k === 'endgame' && !(c.caps && c.caps.endLevel)) return;
        const gap = Robot.ceil(S, year, k, c, st) - (s.stats[st] || 0);
        const v = gap * (STAT_W[st] || 0.7);
        if (gap > 4 && (!best || v > best.v)) best = { v, k, st, gap };
      });
    });
    if (best) { const s = Robot.des(R, best.k); return mk({ type: 'upgrade', sub: best.k, focus: best.st, forConcept: s.concept },
      'Upgrade ' + G.Seasons.sub(year, best.k).name + ' — ' + (D.STAT[best.st] || best.st), 'It has the biggest useful gap on the robot: ' + s.stats[best.st] + ' now, ceiling ' + (s.stats[best.st] + best.gap) + '.'); }
    return null;
  };
  Robot.complete = function (S, p) {
    const rng = G.R, year = S.robot ? S.robot.year : S.year;
    const ef = EFFORT[p.effort || 'std'];
    const q = Robot.testQ(p), qt = q >= 0.2 ? ' Tested ' + Math.round(q * 100) + '% on the practice field.' : '';
    const R = S.robot;
    const designSkill = Math.max(G.Career.mentorSkill(S, 'design'), G.Career.hasPerk(S, 'tempMentor') ? 55 : 0);
    const px = Robot.polishQ(p), pt = px > 0.02 ? ' Extra hours: quality +' + Math.round(px * 100) + '%.' : '';
    const where = bi => (bi >= 0 ? R.bots[bi].name + (bi === (R.comp || 0) ? ' (competition robot)' : '') : 'storage');
    complete1(S, p, rng, year, ef, q, qt, R, designSkill, px, pt, where);
    if (R && R.store) trimStore(S);
  };
  function complete1(S, p, rng, year, ef, q, qt, R, designSkill, px, pt, where) {
    switch (p.type) {
      case 'build': {
        if (!R || R.year !== year) return;
        const c = G.Seasons.concept(year, p.sub, p.concept), d = R.design[p.sub];
        if (d.ver && d.concept !== p.concept) {
          const old = G.Seasons.concept(year, p.sub, d.concept);
          if (old) Robot.addXP(S, mainArea(old), Math.round((d.hours || 0) * 0.25 * 0.3));
        }
        const lvl = Robot.lvl(S, c), cov = p.kitCov || 0, first = Robot.firstTime(S, c) ? 1 - cov : 0;
        const stats = {};
        Object.keys(c.base).forEach(k => { stats[k] = Math.min(Robot.ceil(S, year, p.sub, c, k), Math.round(c.base[k] + 2 * lvlFor(S, p.sub, c, k) + G.Shop.buildStat(S) + 4 * px)); });
        const rel = 6 * px + 72 - 6 * c.cx + 4 * lvl + G.Shop.buildRel(S) + G.Career.mentorSkill(S, 'fab') / 20 - 15 * first + (ef.rel * 1.5)
          + (p.sub === 'drive' && c.id === 'swerve' ? 6 * G.Parts.profile(S).swerve : 0) + 5 * q;
        const hidden = (p.effort === 'rush' && rng.chance(0.5 * (1 - 0.5 * q)) ? 1 : 0) + (first > 0 && rng.chance(0.6 * first * (1 - 0.5 * q)) ? 1 : 0);
        R.design[p.sub] = { concept: p.concept, ver: 1, stats, rel: Math.round(U.clamp(rel, 25, 95)), w: c.w, hours: p.need };
        const ci = R.comp || 0, had = R.bots[ci].subs[p.sub] && R.bots[ci].subs[p.sub].ver;
        install(R, ci, p.sub, makeUnit(p.sub, R.design[p.sub], { hidden, kits: p.kits || null }));
        const core = Robot.coreAreas(c);
        c.areas.forEach(a => Robot.addXP(S, a, Math.round(30 * ef.gain * (core.includes(a) ? 1 : 0.5))));
        G.Career.inbox(S, 'Built: ' + c.name, 'Your ' + G.Seasons.sub(year, p.sub).name + ' is now a ' + c.name + ' (v1), fitted to ' + where(ci) + '.' + (had ? ' The old one is in storage (Garage).' : '') +
          (first > 0.5 ? ' This is the team\'s first time building one, so expect teething problems.' : cov > 0.99 ? ' The COTS kits took the guesswork out of it.' : cov > 0 ? ' COTS kits covered part of it.' : '') +
          ' The drive team will need practice to get used to it.' + qt + pt, 'dev');
        break;
      }
      case 'copy': {
        if (!R || R.year !== year) return;
        const d = R.design[p.sub], c = G.Seasons.concept(year, p.sub, p.concept);
        const src = d && d.ver && d.concept === p.concept ? d : Object.assign({ concept: p.concept }, p.snap);
        const u = makeUnit(p.sub, src, { kits: p.kits || null, hidden: rng.chance(0.06) ? 1 : 0 });
        let bi = p.bot;
        if (bi == null || bi < 0 || Robot.isLatest(R, p.sub, R.bots[bi].subs[p.sub])) bi = Robot.copyTarget(R, p.sub);
        if (bi === (R.comp || 0) && Robot.garageLock(S)) bi = -1;
        const at = bi >= 0 ? tryInstall(S, bi, p.sub, u) : (R.store.push(u), -1);
        G.Career.inbox(S, 'Built: another ' + c.name, 'A v' + u.ver + ' ' + c.name + ' is ready: ' + (at >= 0 ? 'fitted to ' + where(at) : bi >= 0 ? 'in storage (not enough electronics to fit it to ' + R.bots[bi].name + ')' : 'in storage as a spare') + '. Move subsystems between robots in the Garage.' + pt, 'dev');
        break;
      }
      case 'practiceBot': {
        if (!R || R.year !== year) return;
        const bi = p.bot != null ? p.bot : Robot.other(R), put = [], stored = [];
        (p.subs || []).forEach(k => {
          const d = R.design[k]; if (!d || !d.ver || d.concept === 'none' || Robot.isLatest(R, k, R.bots[bi].subs[k])) return;
          const u = makeUnit(k, d, { kits: (p.kitsBySub && p.kitsBySub[k]) || null });
          (tryInstall(S, bi, k, u) >= 0 ? put : stored).push(G.Seasons.sub(year, k).name);
        });
        G.Career.inbox(S, R.bots[bi].name + ' is built', 'New on ' + R.bots[bi].name + ': ' + (put.join(', ') || 'nothing') + '.' + (stored.length ? ' In storage (not enough electronics): ' + stored.join(', ') + '.' : '') +
          ' The closer it matches the competition robot, the more it gives: up to +' + D.TEST_BOT_HOURS + ' testing hours a week (with a Practice Field), driver practice on it up to ' + Math.round((D.BOT2_PRACTICE - 1) * 100) + '% more effective without wearing the competition robot, better tuning at events, and its identical subsystems are spares at events. Pick which robot the drivers practice on in the Garage.', 'dev');
        break;
      }
      case 'testChassis': {
        if (!R || R.year !== year) return;
        const c = G.Seasons.concept(year, 'drive', p.concept), bi = p.bot != null ? p.bot : Robot.other(R);
        const stats = {}; Object.keys(c.base).forEach(k => { stats[k] = c.base[k]; });
        const u = makeUnit('drive', { concept: c.id, ver: 1, stats, rel: Math.round(U.clamp(74 - 5 * c.cx + G.Shop.buildRel(S), 40, 90)), w: c.w }, { chassis: true });
        const cur = R.bots[bi].subs.drive, at = cur && cur.ver ? (R.store.push(u), -1) : tryInstall(S, bi, 'drive', u);
        G.Career.inbox(S, 'Test chassis ready', 'A ' + c.name + ' test chassis is ' + (at >= 0 ? 'running as ' + where(at) : 'in storage (no free electronics or drivetrain slot for it)') + '. ' +
          (G.Shop.lvl(S, 'pfield') ? 'It adds testing hours on your Practice Field' : 'Without a Practice Field it still gives ' + D.CHASSIS_TEST_HOURS + ' testing hours a week in the shop or parking lot: code, autos, vision and drivetrain projects, and driver practice') +
          '. Programmers and drivers can start before the competition robot drives, and the electrical team gets a full control system to wire and debug: every week it runs adds to the electrical shakedown (fewer brownouts and comms dropouts at your first events). Practising on a different drivetrain only partly carries over to the competition robot\'s.', 'dev');
        break;
      }
      case 'upgrade': {
        if (!R) return;
        const soft = p.sub === 'soft', des = Robot.des(R, p.sub), c = des && G.Seasons.concept(year, p.sub, des.concept);
        if (!c || (p.forConcept && des.concept !== p.forConcept)) return;
        const lvl = lvlFor(S, p.sub, c, p.focus);
        const frac = 0.25 * ef.gain * (0.6 + 0.4 * designSkill / 100) * (1 + 0.05 * lvl) * G.Shop.gainMult(S) * rng.range(0.85, 1.15) * (1 + 0.15 * q) * (1 + 0.35 * px);
        const changes = [];
        Object.keys(c.ceil).forEach(k => {
          const cl = Robot.ceil(S, year, p.sub, c, k), cur = des.stats[k] || 0;
          const f = k === p.focus ? frac : frac * 0.35;
          const nv = Math.round(cur + Math.max(0, cl - cur) * f);
          if (nv !== cur) changes.push((D.STAT[k] || k) + ' ' + cur + '→' + nv);
          des.stats[k] = nv;
        });
        des.ver++;
        des.hours = (des.hours || 0) + p.need;
        if (!soft) { des.w += (p.effort === 'rush' ? 1 : 0.6) * (1 - 0.5 * px); des.rel = U.clamp(des.rel + ef.rel + Math.round(4 * q + 3 * px), 20, 97); }
        // the upgraded part goes on the competition robot (or the newest copy of this concept)
        const tgt = soft ? des : targetUnit(R, p.sub);
        if (!soft && tgt) Object.assign(tgt, { ver: des.ver, stats: Object.assign({}, des.stats), w: des.w, rel: des.rel });
        if (tgt && p.effort === 'rush' && rng.chance(0.4 * (1 - 0.5 * q))) tgt.hidden++;
        (c.areas || []).forEach((a, i) => Robot.addXP(S, a, Math.round(30 * ef.gain * (i === 0 ? 1 : 0.4))));
        const onComp = soft || tgt === R.subs[p.sub];
        const note = soft ? '' : !tgt ? ' No robot has this mechanism right now: build a copy to use v' + des.ver + '.' : onComp ? '' : ' Fitted to ' + where(R.bots.findIndex(b => b.subs[p.sub] === tgt)) + '.';
        if (S.event && S.event.stage !== 'done' && !soft && onComp) { R.pending.push(p.sub); G.Career.inbox(S, 'Upgrade ready: ' + p.name, 'Install it in the pits (practice block) to use it at this event. ' + changes.join(', '), 'dev'); }
        else G.Career.inbox(S, 'Upgrade complete: ' + p.name, (changes.join(', ') || 'Already near the ceiling.') + note + qt + pt, 'dev');
        break;
      }
      case 'harden': {
        const d = R.design[p.sub], t = targetUnit(R, p.sub);
        d.rel = Math.round(d.rel + (96 - d.rel) * Math.min(0.9, (0.35 + 0.15 * px) * (1 + G.Shop.fx(S, 'weld', 'weld')))); // a welding station makes hardening go further
        if (t) { t.rel = Math.max(t.rel, d.rel); t.hidden = 0; t.cond = 100; }
        G.Career.inbox(S, 'Hardening complete', G.Seasons.sub(year, p.sub).name + ' reliability is now ' + d.rel + (t ? ' and hidden faults were cleared.' : '.'), 'dev');
        Robot.addXP(S, 'elec', 15);
        break;
      }
      case 'light': {
        // diminishing returns: a subsystem can't be lightened below 40% of its concept weight
        const d = R.design[p.sub], t = targetUnit(R, p.sub), cw = (G.Seasons.concept(year, p.sub, d.concept) || {}).w || d.w;
        const wf = G.Shop.fx(S, 'weld', 'weld'), dw = Math.min(rng.range(2, 6) * (1 + 0.5 * px) * (1 + wf), Math.max(0, d.w - Math.max(1, 0.4 * cw)));
        d.w = Math.max(1, d.w - dw);
        if (t) t.w = Math.min(t.w, d.w);
        if (rng.chance(0.2 * (1 - wf))) { d.rel = Math.max(20, d.rel - 3); if (t) t.rel = Math.max(20, t.rel - 3); }
        G.Career.inbox(S, 'Lightweighting complete', 'Removed ' + dw.toFixed(1) + ' lb from the ' + G.Seasons.sub(year, p.sub).name + '. Competition robot weight: ' + Robot.weight(S) + ' lb.', 'dev');
        break;
      }
      case 'auto': R.autoTier = Math.min(3, R.autoTier + 1); Robot.addXP(S, 'autoPath', 50); if (px) R.soft.stats.auto = Math.min(99, (R.soft.stats.auto || 0) + Math.round(5 * px)); G.Career.inbox(S, 'New auto routine', 'The robot can now run: ' + G.Seasons[year].autoTiers[R.autoTier] + '.', 'dev'); break;
      case 'vision': R.visionLvl = Math.min(2, R.visionLvl + 1); R.soft.stats.vision = Math.min(99, (R.soft.stats.vision || 0) + 15); Robot.addXP(S, 'vision', 60); G.Career.inbox(S, 'Vision Level ' + R.visionLvl, R.visionLvl === 1 ? 'Auto-aim and auto-align are online.' : 'Pose estimation and shoot-on-the-move are online.', 'dev'); break;
      case 'kb': S.equip.kb = true; G.Career.inbox(S, 'Knowledge Base online', 'Knowledge decay between seasons is halved.', 'dev'); break;
      case 'impact': if (S.season) S.season.impactDone = true; G.Career.inbox(S, 'Impact submission ready', 'Your Impact story is submitted. You can now compete for the Impact Award at every regional this season (see the odds on HQ).', 'dev'); break;
      case 'research': {
        const r = D.RESEARCH.find(x => x.id === p.rid);
        const g = Robot.addXP(S, r.area, Math.round(r.xp * (1 + 0.2 * q) * (1 + 0.3 * px)));
        G.Career.inbox(S, 'Research complete: ' + r.name, '+' + Math.round(g) + ' XP in ' + D.AREA[r.area].name + ' (now Level ' + Robot.know(S, r.area) + ').', 'know');
        break;
      }
    }
  }

  // ---------------- Events: entries, wear, repairs ----------------
  Robot.eventStart = function (S, ev) {
    // practice field facility + this season's game elements raise starting tuning; so does a second robot like this one
    const fill = G.Parts.elemFill(S, ev.year), kop = S.elemKop && S.elemKop[ev.year] ? 1 : 0;
    const fieldTune = 0.05 * Math.max(kop, fill) + G.Shop.fx(S, 'pfield', 'tune') * fill;
    let tune = 0.3 + fieldTune + 0.12 * Robot.secondShare(S) + (S.lastTune || 0) * 0.3;
    let conf = 0.3 + (S.practiceWeeks || 0) * 0.04 + (S.lastConf || 0) * 0.3;
    return { tune: U.clamp(tune, 0.2, 0.85), conf: U.clamp(conf, 0.2, 0.85) };
  };
  Robot.inspect = function (S, ev) {
    const R = S.robot;
    const notes = [];
    if (!R.subs.drive.ver) {
      const c = G.Seasons.concept(R.year, 'drive', 'kit'), d = { concept: 'kit', ver: 1, stats: Object.assign({}, c.base), rel: 60, w: c.w, hours: 0 };
      if (!R.design.drive.ver) R.design.drive = d;
      R.bots[R.comp || 0].subs.drive = makeUnit('drive', d);
      G.Career.spend(S, 600, 'Emergency kitbot drivetrain');
      S.morale = Math.max(0, S.morale - 8);
      notes.push('No drivetrain! The team bolted together an emergency kitbot chassis ($600).');
    }
    const w = Robot.weight(S);
    const ok = w <= Robot.WEIGHT_LIMIT;
    if (!ok) notes.push('Robot weighs ' + w + ' lb — over the ' + Robot.WEIGHT_LIMIT + ' lb limit. You must spend a practice block on emergency lightening.');
    return { ok, weight: w, notes };
  };
  Robot.emergencyLighten = function (S) {
    const R = S.robot, over = Robot.weight(S) - Robot.WEIGHT_LIMIT;
    if (over <= 0) return 'Robot is already legal.';
    const k = Object.keys(R.subs).filter(k => R.subs[k].ver && k !== 'soft' && k !== 'drive').sort((a, b) => R.subs[b].w - R.subs[a].w)[0] || 'drive';
    const sub = R.subs[k];
    sub.w -= over + 0.5;
    Object.keys(sub.stats).forEach(s => sub.stats[s] = Math.round(sub.stats[s] * 0.95));
    sub.rel = Math.max(20, sub.rel - 4);
    if (S.event) S.event.inspection.ok = true;
    return 'Drilled out ' + (over + 0.5).toFixed(1) + ' lb from the ' + G.Seasons.sub(R.year, k).name + ' (−5% stats, −4 reliability). Passed inspection.';
  };
  Robot.shakedown = function (S, p) {
    let found = 0;
    Object.values(S.robot.subs).forEach(s => { while (s && s.hidden > 0 && G.R.chance(p)) { s.hidden--; found++; } });
    return found;
  };
  // Spare subsystems identical to the competition robot's (same concept and version), in storage or on the other robot,
  // travel to events: swapping one in restores that subsystem to full condition at any time. The worn one takes its place.
  Robot.spareFor = function (S, k) {
    const R = S.robot, u = R && R.subs[k];
    if (!u || !u.ver || k === 'soft') return null;
    const o = R.bots[Robot.other(R)].subs[k];
    return (R.store || []).concat(o && o.ver ? [o] : []).filter(x => x.sub === k && x.concept === u.concept && x.ver === u.ver && x.cond > u.cond + 0.5).sort((a, b) => b.cond - a.cond)[0] || null;
  };
  Robot.swapSpare = function (S, k) {
    const R = S.robot, sp = Robot.spareFor(S, k);
    if (!sp) return 'No matching spare';
    const old = R.subs[k], oi = Robot.other(R), fromBot = R.bots[oi].subs[k] === sp;
    if (fromBot) R.bots[oi].subs[k] = old;
    else { R.store = R.store.filter(x => x !== sp); R.store.push(old); }
    R.bots[R.comp || 0].subs[k] = sp;
    S.wearTick = (S.wearTick || 0) + 1;
    trimStore(S);
    return { name: G.Seasons.sub(R.year, k).name, from: Math.round(old.cond), to: Math.round(sp.cond), where: fromBot ? R.bots[oi].name : 'storage' };
  };
  Robot.installPending = function (S) { const n = S.robot.pending.length; S.robot.pending = []; return n; };
  Robot.matchEntry = function (S, ev) {
    const R = S.robot, subs = {};
    // drivers who don't know a subsystem well get less out of it
    Object.keys(R.subs).forEach(k => {
      const u = R.subs[k], f = Robot.famOf(R, k, u);
      if (f == null) { subs[k] = u; return; }
      const m = Robot.famMult(f), st = {};
      Object.keys(u.stats).forEach(s => { st[s] = Math.round(u.stats[s] * m); });
      subs[k] = Object.assign({}, u, { stats: st });
    });
    const cap = G.Cap.build(R.year, subs, { autoTier: R.autoTier, visionLvl: R.visionLvl, pp: G.Parts.profile(S) });
    if (R.pending.length) cap.scoreSpd = Math.round(cap.scoreSpd * 0.97);
    const dt = G.Career.driveTeam(S);
    const out = {
      team: S.team.num, cap, look: Robot.look(S), isPlayer: true,
      drv: { drive: dt.driver.attr.drive, comp: Math.round((dt.driver.attr.comp + dt.operator.attr.comp) / 2), aware: dt.driver.attr.aware, mech: dt.operator.attr.mech, hp: dt.hp.attr.hp, strat: dt.coachStrat },
      tune: ev ? ev.tune : 0.5, conf: ev ? ev.conf : 0.5, tuneAuto: ev ? ev.tuneAuto : 0,
      cond: Robot.condAvg(S), batt: ev && ev.batt != null ? ev.batt : 1, hidden: Math.max(0, Robot.hidden(S) - (ev ? ev.shake * 0.5 : 0)),
      power: G.Cap.power(R.year, cap),
      autoFail: !!(ev && ev.incNext && (ev.incNext.autoFail || ev.incNext.codeBad)),
      defSkill: R.year === S.year ? S.defDrill || 0 : 0,
      elecK: 1 - (1 - (R.year === S.year ? G.Career.elecShakeK(S) : 0)) * (1 - G.Shop.fx(S, 'ebench', 'elec')) // second-robot shakedown and the electronics workbench
    };
    const inc = (ev && ev.incNext) || {};
    if (inc.visionOff) { cap.accuracy = Math.round(cap.accuracy * 0.82); cap.vision = Math.round((cap.vision || 0) * 0.5); } // camera calibration skipped
    if (inc.codeBad) { cap.scoreSpd = Math.round(cap.scoreSpd * 0.8); cap.intake = Math.round(cap.intake * 0.88); }            // wrong code: half the controls dead
    if (inc.disableAt) out.disableAt = inc.disableAt;
    if (inc.toolIn) out.toolIn = inc.toolIn;
    if (inc.teleDelay) out.teleDelay = inc.teleDelay;
    if (ev && ev.incNext && ev.incNext.hidden) out.hidden += ev.incNext.hidden;
    return out;
  };
  Robot.applyWear = function (S, rr, playoff) {
    const R = S.robot, P = G.Engine.PACE[rr.pace || 'bal'];
    const extra = 1 + rr.defTime / 30 + rr.contacts / 15;
    Object.keys(R.subs).forEach(k => {
      const s = R.subs[k];
      if (!s || !s.ver || k === 'soft') return;
      let w = G.R.range(2.5, 5.5) * P.wear * (k === 'drive' ? extra : 1 + rr.cycles / 25);
      s.cond = Math.max(0, s.cond - w);
    });
    rr.faults.forEach(f => {
      if (/^Fell from/.test(f)) {
        // a fall from height: everything takes a beating, the climber worst; some bent parts go straight in the scrap bin
        Object.keys(R.subs).forEach(k => {
          const s = R.subs[k]; if (!s || !s.ver || k === 'soft') return;
          s.cond = Math.max(0, s.cond - (k === 'endgame' ? G.R.range(45, 65) : k === 'drive' ? G.R.range(25, 40) : G.R.range(15, 30)));
        });
        if (G.R.chance(0.45)) { const ks = Object.keys(R.subs).filter(k => R.subs[k] && R.subs[k].ver && k !== 'soft'); if (ks.length) R.subs[G.R.pick(ks)].hidden++; }
        const bent = Math.min(S.parts.spares, G.R.int(1, 3));
        S.parts.spares -= bent;
        rr.scrapped = (rr.scrapped || 0) + bent;
        return;
      }
      const map = { 'Intake broke': 'intake', 'Scorer broke': 'scorer', 'Climber broke': 'endgame', 'TIPPED OVER': 'scorer' };
      const k = map[f];
      if (k && R.subs[k] && R.subs[k].ver) R.subs[k].cond = Math.max(0, R.subs[k].cond - 25);
    });
  };
  Robot.pitRepair = function (S, turnaround, bonus) {
    const R = S.robot;
    let pts = (6 + 5 * Math.min(turnaround, 8)) * G.Shop.repairMult(S) * (1 + G.Career.mentorSkill(S, 'fab') / 200) * G.Career.techRepair(S) * (bonus || 1);
    let used = 0;
    const subs = Object.keys(R.subs).filter(k => k !== 'soft' && R.subs[k] && R.subs[k].ver).map(k => R.subs[k]).sort((a, b) => a.cond - b.cond);
    for (const s of subs) {
      if (pts <= 0) break;
      const cap = S.parts.spares > 0 ? 100 : Math.max(s.cond, 60);
      const need = Math.max(0, cap - s.cond), take = Math.min(need, pts);
      s.cond += take; pts -= take;
      // one spare covers D.SPARE_COND_PER_UNIT condition points; fractions carry over between repairs
      if (S.parts.spares > 0) S.parts.spareUse = (S.parts.spareUse || 0) + take / D.SPARE_COND_PER_UNIT;
    }
    const sp = Math.min(S.parts.spares, Math.floor(S.parts.spareUse || 0));
    S.parts.spares -= sp; used += sp;
    S.parts.spareUse = S.parts.spares > 0 ? Math.max(0, (S.parts.spareUse || 0) - sp) : 0;
    return used;
  };
  // Repairs at home use spare parts (one spare ≈ D.SPARE_COND_PER_UNIT condition points). Without spares the team
  // can only patch a subsystem up to D.NO_SPARE_COND. The competition robot comes first (compOnly: only it).
  // Returns { used: spares used, short: condition points left unrepaired on the competition robot }.
  Robot.homeRepair = function (S, compOnly) {
    const R = S.robot; if (!R) return { used: 0, short: 0 };
    const P = S.parts, per = D.SPARE_COND_PER_UNIT, ci = R.comp || 0;
    let short = 0;
    (compOnly || !R.bots ? [ci] : [ci, 1 - ci, -1]).forEach((bi, n) => {
      const s = bi < 0 ? {} : R.bots[bi].subs, list = bi < 0 ? (R.store || []).filter(u => R.design[u.sub] && u.concept === R.design[u.sub].concept) : Object.keys(s).filter(k => k !== 'soft').map(k => s[k]);
      list.filter(x => x && x.ver && x.cond < 100).sort((a, b) => a.cond - b.cond).forEach(x => {
        const credit = Math.max(0, P.spares - (P.spareUse || 0)) * per;
        const fix = Math.min(100 - x.cond, credit);
        x.cond += fix; P.spareUse = (P.spareUse || 0) + fix / per;
        if (x.cond < 99.5) { if (x.cond < D.NO_SPARE_COND) x.cond = D.NO_SPARE_COND; if (!n) short += 100 - x.cond; }
        else x.cond = 100;
      });
    });
    const used = Math.min(P.spares, Math.floor((P.spareUse || 0) + 1e-6));
    P.spares -= used; P.spareUse = P.spares > 0 ? Math.max(0, (P.spareUse || 0) - used) : 0;
    return { used, short: Math.round(short) };
  };
  // Spare parts needed to bring the competition robot back to 100% (for previews)
  Robot.repairNeed = function (S) {
    const R = S.robot; if (!R) return 0;
    return Object.keys(R.subs).reduce((t, k) => t + (k !== 'soft' && R.subs[k] && R.subs[k].ver ? 100 - R.subs[k].cond : 0), 0) / D.SPARE_COND_PER_UNIT;
  };
  // One row per subsystem: the design (latest version) and the competition robot's unit
  Robot.describe = function (S) {
    const R = S.robot, year = R.year;
    return G.Seasons[year].subs.map(sd => {
      const d = Robot.des(R, sd.id), s = R.subs[sd.id];
      return { id: sd.id, name: sd.name, sub: s, design: d, concept: d && d.ver ? G.Seasons.concept(year, sd.id, d.concept) : null };
    });
  };
})();
