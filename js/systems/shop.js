'use strict';
/* FRC Manager — workshop facilities (levels, wear, upgrade, renovate) and shop incidents */
(function () {
  const U = G.U, D = G.Data;
  const Shop = G.Shop = {};

  // =====================================================================
  // Facilities
  // =====================================================================
  Shop.item = id => D.EQUIP.find(e => e.id === id);
  Shop.get = (S, id) => (S.shop && S.shop[id]) || { lvl: 0, cond: 100, warned: 0 };
  Shop.lvl = (S, id) => Shop.get(S, id).lvl || 0;
  Shop.cond = (S, id) => Shop.get(S, id).cond;
  // Efficiency: 40% of the effect at 0 condition, 100% at full condition.
  Shop.eff = (S, id) => Shop.lvl(S, id) ? 0.4 + 0.6 * U.clamp(Shop.cond(S, id), 0, 100) / 100 : 0;
  Shop.fx = function (S, id, key, lvl, eff) {
    const it = Shop.item(id), l = lvl == null ? Shop.lvl(S, id) : lvl;
    if (!l || !it.fx[key]) return 0;
    return it.fx[key][l - 1] * (eff == null ? Shop.eff(S, id) : eff);
  };
  // Aggregate effects used by the rest of the game
  Shop.hwHoursMult = S => (1 - Shop.fx(S, 'printer', 'hours')) * (1 - Shop.fx(S, 'cnc', 'hours'));
  Shop.swHoursMult = S => 1 - Shop.fx(S, 'laptops', 'soft');
  Shop.gainMult = S => 1 + Shop.fx(S, 'cnc', 'gain');
  Shop.buildRel = S => Shop.fx(S, 'cnc', 'rel') + Shop.fx(S, 'lathe', 'rel') + Shop.fx(S, 'weld', 'weldRel');
  Shop.buildStat = S => Math.round(Shop.fx(S, 'cnc', 'stat'));
  Shop.spareMult = S => 1 - Shop.fx(S, 'lathe', 'spare');
  Shop.chargeRate = S => 0.35 + Shop.fx(S, 'charger', 'charge');
  Shop.repairMult = S => 1 + Shop.fx(S, 'pitcart', 'repair');
  Shop.travelMult = S => 1 - Shop.fx(S, 'trailer', 'travel');
  Shop.upkeep = S => D.EQUIP.reduce((s, e) => s + e.upkeep * Shop.lvl(S, e.id), 0);

  const FX_TEXT = {
    hours: v => '−' + Math.round(v * 100) + '% hardware project hours',
    slot: v => v ? '+' + v + ' project slot' : '',
    gain: v => '+' + Math.round(v * 100) + '% upgrade gains',
    rel: v => '+' + v.toFixed(1) + ' reliability on new builds',
    stat: v => '+' + v.toFixed(1) + ' starting stats on new builds',
    spare: v => '−' + Math.round(v * 100) + '% spare part prices',
    soft: v => '−' + Math.round(v * 100) + '% software project hours',
    charge: v => 'batteries recharge ' + Math.round(v / 0.35 * 100) + '% faster',
    repair: v => '+' + Math.round(v * 100) + '% pit repair speed',
    travel: v => '−' + Math.round(v * 100) + '% Local/Drive travel cost',
    tune: v => '+' + Math.round(v * 100) + ' starting tuning at events',
    test: v => Math.round(v) + ' testing h/week',
    elec: v => '−' + Math.round(v * 100) + '% brownouts and comms dropouts',
    partWear: v => 'motors and electronics wear ' + Math.round(v * 100) + '% slower',
    weld: v => 'hardening and lightweighting: −' + Math.round(v * 100) + '% hours, +' + Math.round(v * 100) + '% effect',
    weldRel: v => '+' + v.toFixed(1) + ' reliability on new builds',
    outreach: v => '+' + Math.round(v * 100) + '% outreach points',
    pitch: v => '+' + Math.round(v) + ' Impact presentation',
    ftc: v => Math.round(v) + ' own FTC team' + (Math.round(v) === 1 ? '' : 's'),
    superPit: v => (v >= 0.5 ? 'one subsystem fully repaired before any match (spare parts)' : ''),
    scout: v => (v >= 0.5 ? 'sharper scouting at events' : ''),
    design: v => '−' + Math.round(v * 100) + '% hours on new mechanisms and upgrades',
    shelf: v => 'shelves hold ' + Math.round(v * 100) + '% of the most parts (50% without)',
    rest: v => '−' + (v * D.FATIGUE_SLOPE).toFixed(1) + ' fatigue a week in season',
    honors: v => (v >= 2 ? 'every banner and trophy on display' : 'this season\'s and last season\'s banners and trophies on display'),
    pride: v => 'team morale settles ' + Math.round(v) + ' higher',
    rep: v => '+' + Math.round(v) + ' reputation at each season review'
  };
  Shop.effectText = function (S, id, lvl, eff) {
    const it = Shop.item(id);
    return Object.keys(it.fx).map(k => k === 'slot' ? FX_TEXT.slot(lvl == null && eff == null ? Shop.slotOf(S, id) : Shop.fx(S, id, k, lvl, 1)) : FX_TEXT[k](Shop.fx(S, id, k, lvl, k === 'ftc' || k === 'honors' || k === 'shelf' ? 1 : eff))).filter(Boolean).join(' · ');
  };
  // a level that does not exist yet in this calendar year (the Super pit: from the 2018 season, on sale from the autumn of 2017)
  Shop.levelBlock = function (S, id) {
    const it = Shop.item(id), l = Shop.lvl(S, id), L = it.levels[l];
    if (!L || !L.from || !S || !S.cal) return null;
    const cy = G.Parts.buyCy(S);
    if (cy < L.from) return 'The ' + L.name + ' does not exist yet: top teams first build one for the ' + L.from + ' season.';
    // on sale from a month of the offseason before that season (the AI coding lab: September 2024)
    if (L.fromMonth != null && cy === L.from && S.phase === 'off' && S.month < L.fromMonth) return 'The ' + L.name + ' is not on sale yet: it arrives in ' + D.MONTHS[L.fromMonth] + '.';
    return null;
  };
  Shop.superPit = S => Shop.lvl(S, 'pitcart') >= 3;
  // "Finish now" cards: a top-level CNC Machining, Prototyping Lab and Manual Machine Shop each give one a season for a
  // hardware project at least half done; the Programming Station gives one for a software project from its third level
  // and two from its fourth (the AI coding lab). No cost, no penalty. at: the levels that each give a card.
  Shop.FINISH = [{ id: 'cnc', kind: 'fab', at: [2] }, { id: 'printer', kind: 'fab', at: [3] }, { id: 'lathe', kind: 'fab', at: [2] }, { id: 'laptops', kind: 'soft', at: [3, 4] }];
  Shop.finishOf = (S, f) => f.at.filter(l => Shop.lvl(S, f.id) >= l).length; // cards a facility gives this season
  Shop.finishCards = function (S) {
    if (!S.finish || S.finish.si !== S.si) S.finish = { si: S.si, used: [] };
    const out = [];
    Shop.FINISH.forEach(f => { const n = Shop.finishOf(S, f) - S.finish.used.filter(x => x === f.id).length; for (let i = 0; i < n; i++) out.push(f); });
    return out;
  };
  Shop.finishFor = (S, p) => (p.done / Math.max(1, p.need) >= 0.5 ? Shop.finishCards(S).find(f => f.kind === G.Robot.cat(p)) || null : null);
  // cards left and cards earned this season, by kind: { fab: [left, total], soft: [left, total] }
  Shop.finishCount = function (S) {
    const left = Shop.finishCards(S), out = { fab: [0, 0], soft: [0, 0] };
    Shop.FINISH.forEach(f => { out[f.kind][1] += Shop.finishOf(S, f); out[f.kind][0] += left.filter(x => x === f).length; });
    return out;
  };
  // Parts Shelf: the share of the most of each bulky part the shop can hold (half without one; the top level holds two
  // robots' worth). Small items (control hubs, cameras, switches, accelerators, actuator kits) always fit.
  Shop.SHELF_FREE = ['ctrl', 'canfd', 'camera', 'nswitch', 'accel', 'pneu', 'servo'];
  Shop.shelfK = S => (S && S.shop ? (Shop.lvl(S, 'shelf') ? Shop.item('shelf').fx.shelf[Shop.lvl(S, 'shelf') - 1] : 0.5) : 1);
  Shop.partMax = (S, cat) => { const c = D.PART_CAT[cat]; return Shop.SHELF_FREE.includes(cat) ? c.max : Math.max(1, Math.round(c.max * Shop.shelfK(S))); };
  // the lowest shelf level that holds everything the team owns (for saves from before the Parts Shelf)
  Shop.shelfFor = function (S) {
    const need = D.PART_CATS.reduce((k, c) => (Shop.SHELF_FREE.includes(c.id) ? k : Math.max(k, ((S.inv && S.inv[c.id]) || []).length / c.max)), 0);
    if (need <= 0.5) return 0;
    const fx = Shop.item('shelf').fx.shelf, l = fx.findIndex(v => need <= v + 1e-9);
    return l < 0 ? fx.length : l + 1;
  };
  // CAD Workstations: hours on new mechanisms and upgrades
  Shop.designMult = S => 1 - Shop.fx(S, 'cad', 'design');
  // Project slots from facilities: whole slots, lost while a facility is below SLOT_COND condition (renovate to get it back)
  Shop.SLOT_COND = 35;
  Shop.slotOf = (S, id) => Shop.lvl(S, id) && Shop.cond(S, id) >= Shop.SLOT_COND ? Shop.fx(S, id, 'slot', null, 1) : 0;
  Shop.facilitySlots = S => D.EQUIP.reduce((n, e) => n + (e.fx.slot ? Shop.slotOf(S, e.id) : 0), 0);

  // ---- Workshop space (square feet): every facility level takes room, and the school decides how much room the team has ----
  Shop.sizeOf = (id, lvl) => { const a = D.EQUIP_SIZE[id] || [0]; return lvl > 0 ? a[Math.min(lvl, a.length) - 1] || 0 : 0; };
  Shop.spaceUsed = S => D.EQUIP.reduce((s, e) => s + Shop.sizeOf(e.id, Shop.lvl(S, e.id)), 0);
  Shop.spaceOfTier = t => Math.round(D.SPACE_MAX * D.SPACE_TIERS[U.clamp(t, 0, D.SPACE_TIERS.length - 1)].pct / 50) * 50;
  Shop.space = S => Shop.spaceOfTier(S.spaceTier || 0);
  Shop.spaceFree = S => Shop.space(S) - Shop.spaceUsed(S);
  Shop.spaceNeed = (S, id) => { const l = Shop.lvl(S, id); return Shop.sizeOf(id, l + 1) - Shop.sizeOf(id, l); };
  Shop.spaceBlock = function (S, id) {
    const need = Shop.spaceNeed(S, id), free = Shop.spaceFree(S);
    return need > free ? 'Not enough workshop space: this needs ' + need + ' sq ft and ' + Math.max(0, free) + ' sq ft is free. The school gives the team more room when Program Support rises (season review).' : null;
  };
  // the next room the school would hand over, and the Program Support it takes
  Shop.nextSpace = S => { const t = (S.spaceTier || 0) + 1; return t < D.SPACE_TIERS.length ? { sup: D.SPACE_TIERS[t].sup, sqft: Shop.spaceOfTier(t), name: D.SPACE_TIERS[t].name } : null; };

  Shop.migrate = function (S) {
    if (!S) return;
    S.equip = S.equip || {};
    if (!S.shop) {
      S.shop = {};
      D.EQUIP.forEach(e => {
        const v = S.equip[e.id];
        const l = typeof v === 'number' ? v : v ? 1 : 0;
        S.shop[e.id] = { lvl: Math.min(l, e.levels.length), cond: 100, warned: 0 };
        delete S.equip[e.id];
      });
    }
    // facilities added after the save was made start at 0, except the Parts Shelf: a save from before it gets the level
    // that holds everything it owns (at least what its profile starts with), so no part is lost
    D.EQUIP.forEach(e => { if (!S.shop[e.id]) S.shop[e.id] = { lvl: e.id === 'shelf' ? Math.max(Shop.shelfFor(S), D.SHELF_START[S.profile] || 0) : 0, cond: 100, warned: 0 }; });
    if (S.spaceV !== 2) { // workshop space: classroom, technology wing, robotics center. By profile, and never less than what is built or was granted
      let t = D.SPACE_START[S.profile] || 0;
      if (S.spaceTier != null) t = Math.max(t, [0, 1, 1, 2, 2][S.spaceTier] || 0); // saves from the first v2.5 build had five steps
      if (S.history && S.history.length) D.SPACE_TIERS.forEach((T, i) => { if (S.support >= T.sup && i > t) t = i; });
      while (t < D.SPACE_TIERS.length - 1 && Shop.spaceOfTier(t) < Shop.spaceUsed(S)) t++;
      S.spaceTier = t; S.spaceV = 2;
    }
    if (S.incident === undefined) S.incident = null;
    if (S.devMods === undefined) S.devMods = null;
    if (S.pendingRisk === undefined) S.pendingRisk = null;
    if (S.incidentCool == null) S.incidentCool = 3;
    // battery fleet: individual batteries instead of one averaged number
    if (S.parts && !S.parts.batts) {
      const n = U.clamp(S.parts.batteries || 4, 1, D.BATT_LIMIT[0]);
      S.parts.batts = Array.from({ length: n }, () => ({ h: S.parts.battHealth || 1 }));
    }
    if (S.parts) { S.parts.batteries = S.parts.batts.length; delete S.parts.battHealth; }
    if (!S.boosts) S.boosts = [];
    if (!S.guests) S.guests = [];
    if (!S.actLog) S.actLog = { key: '', counts: {}, total: 0 };
    if (!S.regReminded) S.regReminded = {};
    if (S.testSplit == null) S.testSplit = 0.5; // share of testing hours that goes to driver practice
    // v2 Impact model: re-roll AI Impact strength once for older saves
    if (S.impV !== 2) { if (S.teams) Object.values(S.teams).forEach(t => { if (!t.rookie) t.impact = G.AI.impactRoll(G.makeRng(t.num * 7919 + 13), t.str); }); S.impV = 2; }
    if (G.Robot) G.Robot.migrate(S); // v2.1 two robots (before parts: they read both robots)
    if (G.Parts) G.Parts.migrate(S); // v2.0 parts inventory and game elements
    if (G.Career && G.Career.migrate) G.Career.migrate(S); // v2.2 feeder programs
    if (S.fatigue == null) S.fatigue = D.FATIGUE_BASE;
    if (S.autoSpares == null) S.autoSpares = true;
  };

  // =====================================================================
  // Battery fleet
  // =====================================================================
  Shop.battLimit = S => D.BATT_LIMIT[Math.min(2, Shop.lvl(S, 'charger'))];
  Shop.fleetHealth = S => (S.parts.batts.length ? U.avg(S.parts.batts.map(b => b.h)) : 0);
  // How many batteries a purchase can add/replace right now (empty slots + worn ones)
  Shop.battRoom = S => (Shop.battLimit(S) - S.parts.batts.length) + S.parts.batts.filter(b => b.h < 0.98).length;
  // Buying fills empty slots first, then automatically replaces the most worn batteries.
  Shop.buyBatteries = function (S, n) {
    const room = Shop.battRoom(S);
    if (room <= 0) return 'Every battery slot is full of healthy batteries';
    n = Math.min(n, room);
    const cost = n * D.BATTERY_COST * (G.Career.hasPerk(S, 'partsDiscount') ? 0.85 : 1);
    { const e = G.Career.afford(S, cost); if (e) return e; }
    G.Career.spend(S, cost, n + ' new batteries');
    for (let i = 0; i < n; i++) S.parts.batts.push({ h: 1 });
    S.parts.batts.sort((a, b) => b.h - a.h);
    const over = S.parts.batts.length - Shop.battLimit(S);
    if (over > 0) S.parts.batts.length = Shop.battLimit(S); // drop the most worn
    S.parts.batteries = S.parts.batts.length;
    return null;
  };
  Shop.ageBatteries = function (S, amt) { S.parts.batts.forEach(b => { b.h = Math.max(0.4, b.h - amt); }); };

  Shop.upgradeCost = function (S, id) { const it = Shop.item(id), l = Shop.lvl(S, id); return l < it.levels.length ? it.levels[l].cost : null; };
  Shop.renoCost = function (S, id) {
    const it = Shop.item(id), l = Shop.lvl(S, id);
    if (!l) return null;
    const miss = 100 - Shop.cond(S, id);
    if (miss < 1) return 0;
    return Math.max(100, Math.round(it.levels[l - 1].cost * D.RENO_RATE * miss / 100 / 50) * 50);
  };
  // opts.grant: paid by the school board's upgrade grant. opts.gift: a donation (no cost, no grant used).
  Shop.grantOk = (S, id) => { const c = Shop.upgradeCost(S, id); return (S.schoolGrant || 0) > 0 && c != null && c <= D.BOARD.cap && !Shop.spaceBlock(S, id) && !Shop.levelBlock(S, id); };
  Shop.upgrade = function (S, id, opts) {
    const cost = Shop.upgradeCost(S, id), it = Shop.item(id), f = S.shop[id];
    if (cost == null) return 'Already at the top level';
    { const e = Shop.spaceBlock(S, id); if (e) return e; }
    { const e = Shop.levelBlock(S, id); if (e) return e; }
    if (opts && opts.grant) {
      if (!(S.schoolGrant > 0)) return 'No school grant left';
      if (cost > D.BOARD.cap) return 'The school grant covers upgrades up to ' + U.money(D.BOARD.cap);
      S.schoolGrant--; G.Career.inbox(S, 'School grant used: ' + it.levels[f.lvl].name, 'The school board paid for your new ' + it.levels[f.lvl].name + ' (' + U.money(cost) + ').', 'shop');
    } else if (!(opts && opts.gift)) {
      const e = G.Career.afford(S, cost); if (e) return e;
      G.Career.spend(S, cost, (f.lvl ? 'Upgrade: ' : 'Buy: ') + it.levels[f.lvl].name);
    }
    f.lvl++; f.cond = 100; f.warned = 0;
    if (opts && (opts.grant || opts.gift)) (f.gift = f.gift || {})[f.lvl] = 1; // a level the team did not pay for: nothing back if it is given up
    S.morale = Math.min(100, S.morale + 3);
    return null;
  };
  // Giving a level back, to make room or for the money. The facility drops one level and part of what that level cost
  // comes back by its condition: half the price at 100%, nothing for a level that was donated or paid by a grant.
  Shop.SELL_RATE = 0.5;
  Shop.downInfo = function (S, id) {
    const it = Shop.item(id), f = Shop.get(S, id), l = f.lvl || 0;
    if (!it || !l) return null;
    const gift = !!(f.gift && f.gift[l]);
    const refund = gift ? 0 : Math.round(it.levels[l - 1].cost * Shop.SELL_RATE * U.clamp(f.cond, 0, 100) / 100 / 50) * 50;
    let block = null, note = '';
    if (id === 'ftc') { const max = Math.round(Shop.fx(S, 'ftc', 'ftc', l - 1, 1)), own = G.Career.ownTeams(S); if (own > max) block = 'It runs ' + own + ' of your own FTC teams and would have room for ' + max + ': close ' + (own - max) + ' on the Team page first'; }
    if (id === 'charger') { const lim = D.BATT_LIMIT[Math.min(2, l - 1)], n = S.parts.batts.length; if (n > lim) note = 'It will hold ' + lim + ' batteries: your ' + (n - lim) + ' most worn ones are recycled.'; }
    if (it.fx.slot && Shop.slotOf(S, id) > Shop.fx(S, id, 'slot', l - 1, 1)) note = 'You lose its project slot.';
    return { lvl: l - 1, name: it.levels[l - 1].name, refund, gift, cond: Math.round(f.cond), sqft: Shop.sizeOf(id, l) - Shop.sizeOf(id, l - 1), block, note };
  };
  Shop.downgrade = function (S, id) {
    const d = Shop.downInfo(S, id), f = S.shop[id];
    if (!d || !f) return 'You don\'t own this';
    if (d.block) return d.block;
    if (f.gift) delete f.gift[f.lvl];
    f.lvl--;
    if (!f.lvl) { f.cond = 100; f.warned = 0; }
    if (d.refund) G.Career.earn(S, d.refund, (f.lvl ? 'Downgraded: ' : 'Sold: ') + d.name);
    if (id === 'charger') { const lim = Shop.battLimit(S); if (S.parts.batts.length > lim) { S.parts.batts.sort((a, b) => b.h - a.h); S.parts.batts.length = lim; } }
    return null;
  };
  Shop.renovate = function (S, id) {
    const cost = Shop.renoCost(S, id), it = Shop.item(id), f = S.shop[id];
    if (cost == null) return 'You don\'t own this yet';
    if (cost === 0) return 'Already in perfect condition';
    { const e = G.Career.afford(S, cost); if (e) return e; }
    G.Career.spend(S, cost, 'Renovate: ' + it.levels[f.lvl - 1].name);
    f.cond = 100; f.warned = 0;
    S.morale = Math.min(100, S.morale + 1);
    return null;
  };
  function warn(S, e, f) {
    const nm = e.levels[f.lvl - 1].name;
    if (f.cond < 35 && f.warned < 2) {
      f.warned = 2;
      G.Career.inbox(S, nm + ' is in bad shape', 'Condition is down to ' + Math.round(f.cond) + '%, so it now works at only ' + Math.round(Shop.eff(S, e.id) * 100) + '% efficiency. Students have started calling it "vintage". Renovate it in the Workshop for ' + U.money(Shop.renoCost(S, e.id)) + '.', 'shop');
    } else if (f.cond < 60 && f.warned < 1) {
      f.warned = 1;
      G.Career.inbox(S, nm + ' needs attention', 'Condition has dropped to ' + Math.round(f.cond) + '% (' + Math.round(Shop.eff(S, e.id) * 100) + '% efficiency). A renovation now costs ' + U.money(Shop.renoCost(S, e.id)) + ' in the Workshop.', 'shop');
    }
  }
  // kind: 'season' (per in-season week), 'off' (per offseason month), 'event' (per event attended)
  Shop.wear = function (S, kind, opts) {
    D.EQUIP.forEach(e => {
      const f = S.shop[e.id];
      if (!f || !f.lvl) return;
      if (kind === 'event' && e.id === 'trailer' && opts && opts.fly) return;
      const w = e.wear[kind] || 0;
      if (!w) return;
      f.cond = Math.max(0, f.cond - w * G.R.range(0.7, 1.3));
      warn(S, e, f);
    });
  };
  Shop.damage = function (S, id, amt) {
    const f = S.shop[id];
    if (!f || !f.lvl) return;
    f.cond = U.clamp(f.cond - amt, 0, 100);
    if (amt < 0 && f.cond >= 60) f.warned = 0;
    warn(S, Shop.item(id), f);
  };

  // =====================================================================
  // Development modifiers (last one turn = at most one week of work)
  // =====================================================================
  function modsText(m) {
    return Object.keys(D.DEV_CATS).filter(k => m[k] != null && m[k] !== 1)
      .map(k => D.DEV_CATS[k] + ' ' + (m[k] > 1 ? '+' : '−') + Math.round(Math.abs(m[k] - 1) * 100) + '%').join(', ');
  }
  Shop.modsText = modsText;
  function addMods(S, mods, why) {
    if (!mods) return;
    if (!S.devMods) S.devMods = { mods: {}, notes: [] };
    Object.keys(mods).forEach(k => { S.devMods.mods[k] = (S.devMods.mods[k] == null ? 1 : S.devMods.mods[k]) * mods[k]; });
    if (why) S.devMods.notes.push(why);
  }
  // Called when a turn's work is processed: resolves pending risks, returns this turn's category multipliers.
  Shop.turnMods = function (S) {
    if (S.pendingRisk) {
      const r = S.pendingRisk; S.pendingRisk = null;
      if (G.R.chance(r.p)) {
        addMods(S, r.mods, r.title);
        if (r.dmg) Object.keys(r.dmg).forEach(k => Shop.damage(S, k, r.dmg[k]));
        if (r.robot && S.robot) Object.values(S.robot.subs).forEach(s => { if (s.ver) s.cond = Math.max(0, s.cond - r.robot); });
        if (r.batt) G.R.shuffle(S.parts.batts.slice()).slice(0, 2).forEach(b => { b.h = Math.max(0.4, b.h - r.batt * 4); });
        G.Career.inbox(S, 'It happened: ' + r.title, r.hit + (r.mods ? ' (' + modsText(r.mods) + ' this turn.)' : ''), 'incident');
      } else G.Career.inbox(S, 'Dodged it: ' + r.title, r.miss, 'incident');
    }
    if (!S.devMods) return null;
    const m = Object.assign({}, S.devMods.mods);
    // An offseason turn is a month; incidents still only cost about one week of it.
    if (S.phase === 'off') Object.keys(m).forEach(k => { m[k] = 1 + (m[k] - 1) * 0.25; });
    return m;
  };
  Shop.clearMods = function (S) { S.devMods = null; };

  // =====================================================================
  // Incidents
  // =====================================================================
  const own = id => S => Shop.lvl(S, id) > 0;
  const lvlOf = (S, id) => Math.max(1, Shop.lvl(S, id));
  const pickMentor = S => (S.mentors.length ? G.R.pick(S.mentors).name : 'Your lead mentor');
  const ALL = m => ({ fab: m, soft: m, research: m });
  Shop.INCIDENTS = [
    // ---------------- with choices ----------------
    { id: 'cnc_defect', w: 3, req: own('cnc'), title: 'CNC spindle is grinding',
      body: () => 'Mid-cut, the CNC spindle started making a grinding noise. It still runs — for now.',
      opts: [
        { label: 'Ignore it and keep cutting', desc: '40% chance it breaks this week: Fabrication −60%, CNC condition −20',
          risk: { p: 0.4, mods: { fab: 0.4 }, dmg: { cnc: 20 }, hit: 'The spindle seized halfway through a gusset plate. Parts were cut by hand for the rest of the week.', miss: 'The grinding stopped on its own. Nobody knows why. Nobody is asking.' } },
        { label: 'Replace the bearing now', cost: S => 400 + 300 * lvlOf(S, 'cnc'), desc: 'No delay, CNC condition +10', fix: { cnc: 10 } }
      ] },
    { id: 'cnc_break', w: 2, req: own('cnc'), title: 'CNC router broke down', dmg: { cnc: 10 },
      body: () => 'The CNC threw a stepper-driver fault and won\'t home. A replacement board is a week away.',
      opts: [
        { label: 'Wait for the part', desc: 'Fabrication paused for a week (−100%)', mods: { fab: 0 } },
        { label: 'Outsource parts to a machine shop', cost: S => 900 + 400 * lvlOf(S, 'cnc'), desc: 'Fabrication −15% for a week', mods: { fab: 0.85 } }
      ] },
    { id: 'printer_clog', w: 3, req: own('printer'), title: '3D printers keep clogging',
      body: () => 'Half the printers are jamming. Someone bought the cheapest filament on the internet.',
      opts: [
        { label: 'Clean the nozzles and reprint', desc: 'Fabrication −25% this week', mods: { fab: 0.75 } },
        { label: 'Order new nozzles and good filament, express', cost: S => 150 + 150 * lvlOf(S, 'printer'), desc: 'No delay, printer condition +5', fix: { printer: 5 } }
      ] },
    { id: 'lathe_chatter', w: 2, req: own('lathe'), title: 'Lathe chuck is out of true',
      body: () => 'Shafts are coming off the lathe slightly oval. The machine shop is "fine, probably".',
      opts: [
        { label: 'Live with it', desc: '35% chance it gets worse: Fabrication −40%, Manual Machine Shop condition −20',
          risk: { p: 0.35, mods: { fab: 0.6 }, dmg: { lathe: 20 }, hit: 'A chewed-up hex shaft finally convinced everyone. The lathe was tagged out while parts were re-made.', miss: 'Turns out "slightly oval" was within tolerance. Barely.' } },
        { label: 'Have the chuck rebuilt', cost: S => 300 + 200 * lvlOf(S, 'lathe'), desc: 'No delay, Manual Machine Shop condition +10', fix: { lathe: 10 } }
      ] },
    { id: 'laptop_update', w: 3, req: own('laptops'), title: 'Bad update hit the programming laptops',
      body: () => 'An automatic update broke the robot code build tools on every programming laptop.',
      opts: [
        { label: 'Roll back by hand', desc: 'Software −70% this week', mods: { soft: 0.3 } },
        { label: 'Pay IT to reimage them tonight', cost: () => 400, desc: 'Software −15% this week', mods: { soft: 0.85 } }
      ] },
    { id: 'cad_licence', w: 2, req: own('cad'), title: 'The CAD licences ran out',
      body: () => 'Every CAD seat logged itself out on Monday: the school forgot to renew the licences. The design team is drawing on whiteboards.',
      opts: [
        { label: 'Wait for the school to renew them', desc: 'Fabrication −20% this week', mods: { fab: 0.8 } },
        { label: 'Pay for a month of licences yourselves', cost: S => 200 + 120 * lvlOf(S, 'cad'), desc: 'No delay, CAD Workstations condition +5', fix: { cad: 5 } }
      ] },
    { id: 'shelf_mess', w: 2, req: own('shelf'), title: 'Nobody can find anything on the parts shelf',
      body: () => 'Half the bins are labelled for parts that are somewhere else. Somebody spent forty minutes looking for an encoder that was in their pocket.',
      opts: [
        { label: 'Hunt for parts as needed', desc: 'Fabrication −15% this week', mods: { fab: 0.85 } },
        { label: 'Stop everything for a sorting night', desc: 'Fabrication −5% this week, Parts Shelf condition +15', mods: { fab: 0.95 }, fix: { shelf: 15 } }
      ] },
    { id: 'lounge_fridge', w: 1, req: own('lounge'), title: 'The break room fridge died',
      body: () => 'The fridge in the break room gave up over the weekend, with everybody\'s lunches inside. The smell reached the CNC.',
      opts: [
        { label: 'Clean up and do without it', desc: 'Fabrication and software −5% this week', mods: { fab: 0.95, soft: 0.95 } },
        { label: 'Buy a new fridge', cost: () => 350, desc: 'No delay, Break Room condition +10', fix: { lounge: 10 } }
      ] },
    { id: 'honors_banner', w: 1, req: own('honors'), title: 'A banner came off the wall',
      body: () => 'A banner slid off its hook during a robot test and landed on the drive base. The robot was fine. The banner has a tread mark.',
      opts: [
        { label: 'Hang it back up yourselves', desc: 'Fabrication −5% this week', mods: { fab: 0.95 } },
        { label: 'Have the wall rail fitted properly', cost: () => 180, desc: 'No delay, Honors Wall condition +15', fix: { honors: 15 } }
      ] },
    { id: 'charger_smell', w: 2, req: own('charger'), title: 'Burning smell from the battery charger',
      body: () => 'Something on the charger smells like a warm electronics store. The fan is not spinning.',
      opts: [
        { label: 'Keep using it', desc: '40% chance: two batteries lose 24% health, Battery Station condition −25',
          risk: { p: 0.4, batt: 0.06, dmg: { charger: 25 }, hit: 'One charging bay cooked two batteries before anyone noticed.', miss: 'The fan started again after a firm tap. Classic.' } },
        { label: 'Replace the fan and wiring', cost: () => 150, desc: 'No risk, Battery Station condition +15', fix: { charger: 15 } }
      ] },
    { id: 'aluminum', w: 3, req: S => S.phase !== 'off', title: 'Aluminum tube is backordered',
      body: () => 'Your usual supplier is out of 2×1 box tube for two weeks.',
      opts: [
        { label: 'Wait and build from scraps', desc: 'Fabrication −50% this week', mods: { fab: 0.5 } },
        { label: 'Buy from a pricier supplier', cost: () => 700, desc: 'No delay' }
      ] },
    { id: 'power', w: 2, req: () => true, title: 'Power work in the tech wing',
      body: () => 'School facilities will cut power to the shop for two afternoons this week.',
      opts: [
        { label: 'Work around it', desc: 'All development −40% this week', mods: ALL(0.6) },
        { label: 'Rent a generator', cost: () => 500, desc: 'All development −10% this week', mods: ALL(0.9) }
      ] },
    { id: 'roof', w: 2, req: () => true, title: 'Roof leak over the electronics bench',
      body: () => 'Rain is dripping onto the electronics bench. Maintenance can come today if you pay for an emergency call.',
      opts: [
        { label: 'Put a bucket under it', desc: '35% chance of water damage: Software −50%, Fabrication −30%, robot condition −10',
          risk: { p: 0.35, mods: { soft: 0.5, fab: 0.7 }, robot: 10, hit: 'The bucket overflowed overnight. A motor controller and two laptops got wet.', miss: 'The bucket held. Someone please empty it.' } },
        { label: 'Pay for an emergency repair', cost: () => 350, desc: 'No impact' }
      ] },
    { id: 'cad_license', w: 2, req: () => true, title: 'CAD license server is down',
      body: () => 'The school\'s CAD license server crashed and the vendor\'s support line has a two-hour hold time.',
      opts: [
        { label: 'Work offline on sketches', desc: 'Fabrication −30%, Research −30% this week', mods: { fab: 0.7, research: 0.7 } },
        { label: 'Buy temporary licenses', cost: () => 300, desc: 'No delay' }
      ] },
    // ---------------- without choices ----------------
    { id: 'snow', w: 3, req: S => S.phase === 'build' && S.week <= 6, title: 'Snow day!',
      body: () => 'School is closed for two days. The students are building snowmen instead of robots.', mods: { fab: 0.5, soft: 0.7, research: 0.5 } },
    { id: 'exams', w: 2, req: S => S.phase === 'build' || (S.phase === 'off' && ['May', 'Dec'].includes(D.MONTHS[S.month])), title: 'Exam week',
      body: () => 'Exams are this week. Half the team is in the library and the other half should be.', mods: ALL(0.7) },
    { id: 'marshal', w: 2, req: () => true, title: 'Fire marshal inspection',
      body: () => 'The fire marshal closed the shop for a day to inspect the extension cord situation. It was not good.', mods: { fab: 0.8 } },
    { id: 'wifi', w: 2, req: () => true, title: 'School Wi-Fi is down',
      body: () => 'The network has been down for three days: no pushing code, no downloading datasheets.', mods: { soft: 0.6, research: 0.8 } },
    { id: 'sick', w: 2, req: S => S.mentors.length > 0, title: 'Mentor out sick',
      body: S => pickMentor(S) + ' is home with the flu. The shop runs a little slower without them.', mods: { fab: 0.8, soft: 0.85 } },
    { id: 'tooling', w: 2, req: () => true, title: 'Tooling donation',
      body: () => 'A retired machinist dropped off three boxes of end mills, taps and drill bits. Machines run better and the students are thrilled.', mods: { fab: 1.2 }, fix: { cnc: 8, lathe: 8, printer: 5 } },
    { id: 'sprint', w: 2, req: () => true, title: 'Weekend coding sprint',
      body: () => 'The programmers held an all-weekend coding sprint powered by questionable snacks.', mods: { soft: 1.4 } },
    { id: 'cleanup', w: 1, req: () => true, title: 'Mandatory shop clean-up',
      body: () => 'The principal toured the shop. A full clean-up day followed, and every tool now has a labeled home.', mods: { fab: 0.85 }, fixAll: 5 }
  ];
  Shop.optCost = (S, o) => (o.cost ? o.cost(S) : 0);

  Shop.rollIncident = function (S) {
    if (S.incident || !['off', 'build', 'comp'].includes(S.phase)) return;
    if (S.incidentCool > 0) { S.incidentCool--; return; }
    if (!G.R.chance(0.09)) return;
    const pool = Shop.INCIDENTS.filter(i => i.req(S));
    if (!pool.length) return;
    const inc = G.R.wpick(pool, i => i.w);
    S.incidentCool = 4;
    const body = inc.body(S);
    if (inc.opts) {
      S.incident = { id: inc.id, title: inc.title, body, opts: inc.opts.map(o => ({ label: o.label, desc: o.desc, cost: Shop.optCost(S, o) })) };
      if (inc.dmg) Object.keys(inc.dmg).forEach(k => Shop.damage(S, k, inc.dmg[k]));
      G.Career.inbox(S, 'Shop incident: ' + inc.title, body + '\n\nA decision is needed before you continue.', 'incident');
      return;
    }
    addMods(S, inc.mods, inc.title);
    if (inc.fix) Object.keys(inc.fix).forEach(k => Shop.damage(S, k, -inc.fix[k]));
    if (inc.fixAll) D.EQUIP.forEach(e => Shop.damage(S, e.id, -inc.fixAll));
    G.Career.inbox(S, (inc.mods && Object.values(inc.mods).some(v => v > 1) ? 'Good news: ' : 'Shop incident: ') + inc.title, body + '\n\nThis turn: ' + modsText(inc.mods) + '.', 'incident');
  };
  Shop.resolve = function (S, idx) {
    const cur = S.incident;
    if (!cur) return null;
    const inc = Shop.INCIDENTS.find(i => i.id === cur.id), o = inc.opts[idx];
    const cost = cur.opts[idx].cost;
    { const e = G.Career.afford(S, cost); if (e) return e; }
    if (cost) G.Career.spend(S, cost, 'Incident: ' + inc.title);
    addMods(S, o.mods, inc.title);
    if (o.fix) Object.keys(o.fix).forEach(k => Shop.damage(S, k, -o.fix[k]));
    if (o.risk) S.pendingRisk = Object.assign({ title: inc.title, desc: o.desc }, o.risk);
    G.Career.inbox(S, 'Decision: ' + inc.title, 'You chose: ' + o.label + (cost ? ' (' + U.money(cost) + ')' : '') + '. ' + o.desc + '.', 'incident');
    S.incident = null;
    return null;
  };

  // =====================================================================
  // Opportunities: school & sponsor events with positive, time-limited effects
  // boost kinds: slots (+project slots), hours (+% team hours), cat (progress × per category)
  // guests: temporary mentors in extra mentor slots
  // =====================================================================
  const turnsFor = (S, inSeason) => (S.phase === 'off' ? Math.max(1, Math.round(inSeason / 3)) : inSeason);
  const sponsorName = S => (S.sponsors.length ? G.R.pick(S.sponsors).name : null);
  function addBoost(S, b) { S.boosts.push(Object.assign({ id: U.uid('b') }, b)); }
  Shop.boostSlots = S => (S.boosts || []).filter(b => b.kind === 'slots').reduce((s, b) => s + b.value, 0) + (S.guests || []).filter(g => g.m.role === 'design' || g.m.role === 'fab').length;
  Shop.boostHours = S => (S.boosts || []).filter(b => b.kind === 'hours').reduce((s, b) => s + b.value, 0);
  Shop.guestHours = S => (S.guests || []).reduce((s, g) => s + g.m.hours, 0);
  Shop.boostMods = function (S) {
    const m = {};
    (S.boosts || []).filter(b => b.kind === 'cat').forEach(b => { m[b.cat] = (m[b.cat] || 1) * b.value; });
    return Object.keys(m).length ? m : null;
  };
  Shop.boostText = function (b) {
    if (b.kind === 'slots') return '+' + b.value + ' project slot' + (b.value > 1 ? 's' : '');
    if (b.kind === 'hours') return '+' + Math.round(b.value * 100) + '% team hours';
    return D.DEV_CATS[b.cat] + ' +' + Math.round((b.value - 1) * 100) + '%';
  };
  Shop.OPPS = [
    { id: 'guest', w: 3, req: S => S.sponsors.length > 0, run: S => {
      const sp = sponsorName(S), role = G.R.pick(['design', 'fab', 'prog']), m = D.makeMentor(G.R, role, G.R.int(3, 4));
      m.cost = 0; m.guest = sp; const turns = turnsFor(S, 4);
      S.guests.push({ m, turns });
      if (G.Career.inSeason(S)) S.fatigue = Math.max(5, S.fatigue - 3); // an extra pair of hands takes some load off
      const rn = D.MENTOR_ROLES.find(r => r.id === role).name;
      return ['Guest mentor from ' + sp, sp + ' is lending one of its engineers, ' + m.name + ', as a guest ' + rn + ' (' + U.stars(m.stars) + ', ' + m.hours + ' h/week) for ' + turns + (S.phase === 'off' ? ' month' : ' week') + (turns > 1 ? 's' : '') + '. Guests take an extra mentor slot' + (role !== 'prog' ? ' and add a project slot' : '') + '.'];
    } },
    { id: 'room', w: 2, req: () => true, run: S => {
      const t = turnsFor(S, 3); addBoost(S, { kind: 'slots', value: 1, turns: t, title: 'Borrowed classroom' });
      return ['The school lends you a second room', 'The classroom next door is free after school, so a second build crew can work in parallel. +1 project slot for ' + t + (S.phase === 'off' ? ' month' : ' week') + (t > 1 ? 's' : '') + '.'];
    } },
    { id: 'late', w: 3, req: () => true, run: S => {
      const t = turnsFor(S, 2); addBoost(S, { kind: 'hours', value: 0.2, turns: t, title: 'Extended shop hours' });
      return ['Extended shop hours', 'The principal approved late shop nights with a custodian on duty. +20% team hours for ' + t + (S.phase === 'off' ? ' month' : ' week') + (t > 1 ? 's' : '') + '.'];
    } },
    { id: 'machine', w: 2, req: S => S.sponsors.length > 0, run: S => {
      const sp = sponsorName(S), t = turnsFor(S, 2); addBoost(S, { kind: 'cat', cat: 'fab', value: 1.3, turns: t, title: sp + ' machine shop' });
      return [sp + ' opens its machine shop', sp + ' is letting your fabrication crew use its machine shop on weekends. Fabrication +30% for ' + t + (S.phase === 'off' ? ' month' : ' week') + (t > 1 ? 's' : '') + '.'];
    } },
    { id: 'lab', w: 2, req: () => true, run: S => {
      const t = turnsFor(S, 2); addBoost(S, { kind: 'cat', cat: 'soft', value: 1.4, turns: t, title: 'University programming lab' });
      return ['University lab access', 'A nearby university lent its robotics lab and a grad student to your programmers. Software +40% for ' + t + (S.phase === 'off' ? ' month' : ' week') + (t > 1 ? 's' : '') + '.'];
    } },
    { id: 'innovate', w: 1, req: () => true, run: S => {
      const t = turnsFor(S, 2); addBoost(S, { kind: 'cat', cat: 'research', value: 1.5, turns: t, title: 'District innovation days' });
      return ['District innovation days', 'The school district gave your team two "innovation days" off regular classes. Research +50% for ' + t + (S.phase === 'off' ? ' month' : ' week') + (t > 1 ? 's' : '') + '.'];
    } },
    { id: 'engday', w: 2, req: S => S.projects.length > 0 && S.sponsors.length > 0, run: S => {
      const sp = sponsorName(S), p = S.projects.slice().sort((a, b) => (b.need - b.done) - (a.need - a.done))[0];
      const h = Math.round(Math.min(p.need - p.done - 1, G.R.int(40, 80)));
      if (h <= 0) return null;
      p.done += h;
      return [sp + ' engineering day', sp + ' sent a team of engineers for a day. They put ' + h + ' hours into "' + p.name + '" right away.'];
    } }
  ];
  Shop.rollBoost = function (S) {
    if (!['off', 'build', 'comp'].includes(S.phase)) return;
    if ((S.boostCool || 0) > 0) { S.boostCool--; return; }
    if (!G.R.chance(0.07)) return;
    const pool = Shop.OPPS.filter(o => o.req(S));
    const o = G.R.wpick(pool, x => x.w);
    const res = o && o.run(S);
    if (!res) return;
    S.boostCool = 4;
    G.Career.inbox(S, res[0], res[1], 'boost');
  };
  // Count down boosts and guest mentors after each turn's work
  Shop.tickBoosts = function (S) {
    S.boosts.forEach(b => b.turns--);
    S.boosts.filter(b => b.turns <= 0).forEach(b => G.Career.inbox(S, 'Boost ended: ' + b.title, Shop.boostText(b) + ' is over.', 'boost'));
    S.boosts = S.boosts.filter(b => b.turns > 0);
    S.guests.forEach(g => g.turns--);
    S.guests.filter(g => g.turns <= 0).forEach(g => G.Career.inbox(S, 'Guest mentor heads back', g.m.name + ' has returned to ' + g.m.guest + '. The students made a thank-you card with a CAD drawing on it.', 'boost'));
    S.guests = S.guests.filter(g => g.turns > 0);
  };
})();
