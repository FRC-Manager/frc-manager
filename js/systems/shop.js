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
  Shop.buildRel = S => Shop.fx(S, 'cnc', 'rel') + Shop.fx(S, 'lathe', 'rel');
  Shop.buildStat = S => Math.round(Shop.fx(S, 'cnc', 'stat'));
  Shop.spareMult = S => 1 - Shop.fx(S, 'lathe', 'spare');
  Shop.chargeRate = S => 0.35 + Shop.fx(S, 'charger', 'charge');
  Shop.repairMult = S => 1 + Shop.fx(S, 'pitcart', 'repair');
  Shop.travelMult = S => 1 - Shop.fx(S, 'trailer', 'travel');
  Shop.upkeep = S => D.EQUIP.reduce((s, e) => s + e.upkeep * Shop.lvl(S, e.id), 0);

  const FX_TEXT = {
    hours: v => '−' + Math.round(v * 100) + '% hardware project hours',
    gain: v => '+' + Math.round(v * 100) + '% upgrade gains',
    rel: v => '+' + v.toFixed(1) + ' reliability on new builds',
    stat: v => '+' + v.toFixed(1) + ' starting stats on new builds',
    spare: v => '−' + Math.round(v * 100) + '% spare part prices',
    soft: v => '−' + Math.round(v * 100) + '% software project hours',
    charge: v => 'batteries recharge ' + Math.round(v / 0.35 * 100) + '% faster',
    repair: v => '+' + Math.round(v * 100) + '% pit repair speed',
    travel: v => '−' + Math.round(v * 100) + '% Local/Drive travel cost'
  };
  Shop.effectText = function (S, id, lvl, eff) {
    const it = Shop.item(id);
    return Object.keys(it.fx).map(k => FX_TEXT[k](Shop.fx(S, id, k, lvl, eff))).join(' · ');
  };

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
    D.EQUIP.forEach(e => { if (!S.shop[e.id]) S.shop[e.id] = { lvl: 0, cond: 100, warned: 0 }; });
    if (S.incident === undefined) S.incident = null;
    if (S.devMods === undefined) S.devMods = null;
    if (S.pendingRisk === undefined) S.pendingRisk = null;
    if (S.incidentCool == null) S.incidentCool = 3;
  };

  Shop.upgradeCost = function (S, id) { const it = Shop.item(id), l = Shop.lvl(S, id); return l < it.levels.length ? it.levels[l].cost : null; };
  Shop.renoCost = function (S, id) {
    const it = Shop.item(id), l = Shop.lvl(S, id);
    if (!l) return null;
    const miss = 100 - Shop.cond(S, id);
    if (miss < 1) return 0;
    return Math.max(100, Math.round(it.levels[l - 1].cost * D.RENO_RATE * miss / 100 / 50) * 50);
  };
  Shop.upgrade = function (S, id) {
    const cost = Shop.upgradeCost(S, id), it = Shop.item(id), f = S.shop[id];
    if (cost == null) return 'Already at the top level';
    if (S.money < cost) return 'Not enough money (' + U.money(cost) + ' needed)';
    G.Career.spend(S, cost, (f.lvl ? 'Upgrade: ' : 'Buy: ') + it.levels[f.lvl].name);
    f.lvl++; f.cond = 100; f.warned = 0;
    S.morale = Math.min(100, S.morale + 3);
    return null;
  };
  Shop.renovate = function (S, id) {
    const cost = Shop.renoCost(S, id), it = Shop.item(id), f = S.shop[id];
    if (cost == null) return 'You don\'t own this yet';
    if (cost === 0) return 'Already in perfect condition';
    if (S.money < cost) return 'Not enough money (' + U.money(cost) + ' needed)';
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
        if (r.batt) S.parts.battHealth = Math.max(0.5, S.parts.battHealth - r.batt);
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
        { label: 'Live with it', desc: '35% chance it gets worse: Fabrication −40%, Machine Shop condition −20',
          risk: { p: 0.35, mods: { fab: 0.6 }, dmg: { lathe: 20 }, hit: 'A chewed-up hex shaft finally convinced everyone. The lathe was tagged out while parts were re-made.', miss: 'Turns out "slightly oval" was within tolerance. Barely.' } },
        { label: 'Have the chuck rebuilt', cost: S => 300 + 200 * lvlOf(S, 'lathe'), desc: 'No delay, Machine Shop condition +10', fix: { lathe: 10 } }
      ] },
    { id: 'laptop_update', w: 3, req: own('laptops'), title: 'Bad update hit the programming laptops',
      body: () => 'An automatic update broke the robot code build tools on every programming laptop.',
      opts: [
        { label: 'Roll back by hand', desc: 'Software −70% this week', mods: { soft: 0.3 } },
        { label: 'Pay IT to reimage them tonight', cost: () => 400, desc: 'Software −15% this week', mods: { soft: 0.85 } }
      ] },
    { id: 'charger_smell', w: 2, req: own('charger'), title: 'Burning smell from the battery charger',
      body: () => 'Something on the charger smells like a warm electronics store. The fan is not spinning.',
      opts: [
        { label: 'Keep using it', desc: '40% chance: battery fleet health −6%, Battery Station condition −25',
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
    if (cost && S.money < cost) return 'Not enough money (' + U.money(cost) + ' needed)';
    if (cost) G.Career.spend(S, cost, 'Incident: ' + inc.title);
    addMods(S, o.mods, inc.title);
    if (o.fix) Object.keys(o.fix).forEach(k => Shop.damage(S, k, -o.fix[k]));
    if (o.risk) S.pendingRisk = Object.assign({ title: inc.title, desc: o.desc }, o.risk);
    G.Career.inbox(S, 'Decision: ' + inc.title, 'You chose: ' + o.label + (cost ? ' (' + U.money(cost) + ')' : '') + '. ' + o.desc + '.', 'incident');
    S.incident = null;
    return null;
  };
})();
