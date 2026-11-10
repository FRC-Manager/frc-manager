'use strict';
/* FRC Manager — parts inventory: vendor catalog and product releases, stock, building robots from parts,
   allocation (newest parts on the competition robot, the rest on the practice robot), wear; game elements. */
(function () {
  const U = G.U, D = G.Data;
  const P = G.Parts = {};
  const R = () => G.R;

  // ======================= catalog =======================
  const PROD = {};
  const reg = p => { PROD[p.id] = p; return p; };
  D.ELEC_CATS.forEach(c => ['A', 'B'].forEach(v => { for (let g = 1; g <= 4; g++) reg(D.makeProduct(c, v, g)); }));
  D.KOP_CATS.forEach(c => reg(D.makeProduct(c, 'K', 0)));
  D.COTS_CATS.forEach(c => reg(D.makeProduct(c, 'C', 1)));
  P.prod = id => PROD[id];

  // Career season index the shop is selling for: during the offseason you buy for the coming season
  P.buyIdx = S => S.si + (['off', 'review', 'end'].includes(S.phase) ? 1 : 0);
  P.inSeason = S => ['kickoff', 'build', 'comp', 'champs'].includes(S.phase);
  // Product launches. Before every season each vendor holds one launch event, 1–4 months before Kickoff (Sep–Dec),
  // and puts 1–2 new products on sale at once. No product line goes past version III in a career.
  // Plan entries: { idx: season index the product is for, cat, v, mo: launch month (D.MONTHS index) }.
  // The previous version stays on sale until the end of that season.
  P.MAX_GEN = 3; P.LAUNCH_MONTHS = [4, 5, 6, 7];
  P.planReleases = function (S, rng, from) {
    if (from == null) S.vendorPlan = [];
    S.vendorPlan = S.vendorPlan || [];
    if (S.mode !== 'career') return;
    const N = S.order.length;
    ['A', 'B'].forEach(v => {
      const cnt = {}; D.ELEC_CATS.forEach(c => { cnt[c] = S.vendorPlan.filter(r => r.v === v && r.cat === c).length; });
      for (let idx = from || 0; idx < N; idx++) {
        if (S.vendorPlan.some(r => r.v === v && r.idx === idx)) continue; // (migrated saves) this vendor already launched this season
        const cap = D.ELEC_CATS.reduce((a, c) => a + Math.max(0, P.MAX_GEN - 1 - cnt[c]), 0), later = N - idx - 1;
        if (cap <= 0) break;
        const k = Math.max(1, Math.min(rng.chance(0.35) ? 2 : 1, cap - later)); // always leave room for a launch every later year
        const last = new Set(S.vendorPlan.filter(r => r.v === v && r.idx === idx - 1).map(r => r.cat));
        const pool = D.ELEC_CATS.filter(c => cnt[c] < P.MAX_GEN - 1).map(c => ({ c, o: (last.has(c) ? 10 : 0) + cnt[c] * 2 + rng.next() * 1.5 })).sort((a, b) => a.o - b.o);
        // the first season's launch has to come after the career starts (October)
        const months = idx === (from || 0) && S.phase === 'off' && P.buyIdx(S) === idx ? P.LAUNCH_MONTHS.filter(m => m > S.month) : P.LAUNCH_MONTHS;
        if (!months.length) continue;
        const mo = rng.pick(months);
        pool.slice(0, k).forEach(x => { S.vendorPlan.push({ idx, cat: x.c, v, mo }); cnt[x.c]++; });
      }
    });
    S.vendorPlan.sort((a, b) => a.idx - b.idx || a.mo - b.mo);
  };
  // Is a planned product on sale yet? Earlier seasons' launches always; this season's once its launch month has come.
  P.released = function (S, r) {
    const idx = P.buyIdx(S);
    return r.idx < idx || (r.idx === idx && (P.inSeason(S) || (S.phase === 'off' && S.month >= (r.mo || 0))));
  };
  P.genAt = (S, cat, v) => 1 + (S.vendorPlan || []).filter(r => r.cat === cat && r.v === v && P.released(S, r)).length;
  // Everything you can buy right now: [{ prod, isNew, ending }]
  P.forSale = function (S) {
    const idx = P.buyIdx(S), out = [];
    D.ELEC_CATS.forEach(cat => ['A', 'B'].forEach(v => {
      const g = P.genAt(S, cat, v), justOut = (S.vendorPlan || []).some(r => r.cat === cat && r.v === v && r.idx === idx && P.released(S, r));
      out.push({ prod: PROD[cat + v + g], isNew: justOut && g > 1 });
      if (justOut && g > 1) out.push({ prod: PROD[cat + v + (g - 1)], ending: true });
    }));
    D.COTS_CATS.forEach(cat => out.push({ prod: PROD[cat + 'C'] }));
    D.KOP_CATS.forEach(cat => out.push({ prod: PROD[cat + 'K'], kop: true }));
    return out;
  };
  P.price = function (S, prod) {
    if (!prod.price) return 0;
    return Math.round(prod.price * (D.PART_PRICE_DIFF[S.diff] || 1) * (G.Career.hasPerk(S, 'partsDiscount') ? 0.85 : 1));
  };

  // ======================= stock =======================
  // Rolled every turn. In season, COTS parts (electronics especially) are often sold out — stock up before Kickoff.
  P.rollStock = function (S) {
    const rng = R(), st = {}, d = D.STOCK.diff[S.diff] || 0, season = P.inSeason(S);
    P.forSale(S).forEach(x => {
      const e = D.PART_CAT[x.prod.cat].elec;
      const p = season ? (e ? D.STOCK.elec : D.STOCK.cots) + d + (x.isNew ? D.STOCK.newRelease : 0) : D.STOCK.off;
      st[x.prod.id] = x.kop ? true : rng.chance(U.clamp(p, 0.1, 1)); // Kit of Parts items never sell out
    });
    D.ELEM_SETS.forEach(e => { st['elem' + e.id] = season ? rng.chance(U.clamp(D.STOCK.elem + d, 0.1, 1)) : true; });
    S.stock = st;
  };
  // In the offseason everything is in stock (the shop says so): only in-season weeks can sell out
  P.inStock = (S, id) => !P.inSeason(S) || !S.stock || S.stock[id] !== false;
  // How many of a product fit on the shelf right now: free slots plus worse parts it would push off (worn or older ones)
  P.buyRoom = function (S, prodId) {
    const prod = PROD[prodId]; if (!prod) return 0;
    const nv = prod.perf * 0.65 + 0.35;
    return D.PART_CAT[prod.cat].max - P.count(S, prod.cat) + P.items(S, prod.cat).filter(it => value(it) < nv - 1e-9).length;
  };

  // ======================= inventory =======================
  P.items = (S, cat) => (S.inv && S.inv[cat]) || [];
  P.count = (S, cat) => P.items(S, cat).length;
  const value = it => { const p = PROD[it.p]; return (p ? p.perf : 0) * 0.65 + it.h * 0.35; };
  // Add parts; over the slot limit, the least valuable (oldest / most worn) are recycled. Returns how many were dropped.
  P.add = function (S, cat, prodId, n, h) {
    const list = S.inv[cat] = S.inv[cat] || [];
    for (let i = 0; i < n; i++) list.push({ id: U.uid('q'), p: prodId, h: h == null ? 1 : h });
    const max = D.PART_CAT[cat].max;
    S.wearTick = (S.wearTick || 0) + 1;
    if (list.length <= max) return 0;
    list.sort((a, b) => value(b) - value(a));
    const drop = list.length - max;
    list.length = max;
    return drop;
  };
  P.buy = function (S, prodId, n) {
    const prod = PROD[prodId];
    if (!prod) return 'Unknown part';
    if (!P.forSale(S).some(x => x.prod.id === prodId)) return 'No longer sold';
    if (!P.inStock(S, prodId)) return 'Out of stock this week. In season, check back next week (or stock up before Kickoff).';
    const cat = D.PART_CAT[prod.cat];
    // a full shelf only takes parts better than its worst ones (worn or older): those are sold if they still can be, else recycled
    { const room = P.buyRoom(S, prodId);
      if (room <= 0) return 'No room: all ' + cat.max + ' slots for ' + cat.short.toLowerCase() + ' hold parts at least as good as this one. Sell some first.';
      n = Math.min(n, room); }
    const cost = n * P.price(S, prod);
    { const e = G.Career.afford(S, cost); if (e) return e; }
    G.Career.spend(S, cost, n + '× ' + prod.name);
    const had = P.items(S, prod.cat).slice();
    const dropped = P.add(S, prod.cat, prodId, n, 1);
    let sold = 0, got = 0;
    if (dropped) {
      const keep = new Set(P.items(S, prod.cat));
      had.filter(it => !keep.has(it)).forEach(it => { const v = it.h > D.SELL_MIN ? P.resale(S, it) : 0; if (v > 0) { sold++; got += v; } });
      if (got) G.Career.earn(S, got, 'Sold ' + sold + ' replaced ' + cat.short.toLowerCase());
    }
    return { bought: n, replaced: dropped, sold, got };
  };

  // The product to buy for a category from a vendor (electronics) or the COTS suppliers
  P.pick = function (S, cat, v) {
    const list = P.forSale(S).filter(x => x.prod.cat === cat && !x.ending && (v === 'K' || x.prod.v !== 'K'));
    const e = list.find(x => x.prod.v === v) || list[0];
    return e ? e.prod : null;
  };
  // Buy until the shelf holds `target` of each category (used by the autoplay bot and the "stock up" helper)
  P.stockUp = function (S, target, v) {
    let spent = 0;
    Object.keys(target).forEach(cat => {
      const n = target[cat] - P.count(S, cat); if (n <= 0) return;
      const pr = P.pick(S, cat, v); if (!pr) return;
      const before = S.money;
      const r = P.buy(S, pr.id, n); if (typeof r !== 'string') spent += before - S.money;
    });
    return spent;
  };
  // ======================= selling =======================
  // Resale value: a share of today's list price, scaled by the part's health
  P.resale = (S, it) => { const pr = PROD[it.p]; return pr && pr.price && pr.v !== 'K' ? Math.round(P.price(S, pr) * D.RESALE * it.h) : 0; };
  // Why a part can't be sold (null if it can): too worn, a kit part, or the robots still need it
  P.sellBlock = function (S, cat, it) {
    const pr = PROD[it.p];
    if (!pr || !pr.price || pr.v === 'K') return 'Kit of Parts items can\'t be resold';
    if (it.h <= D.SELL_MIN) return 'Only parts above ' + Math.round(D.SELL_MIN * 100) + '% condition can be sold';
    const c = D.PART_CAT[cat];
    if (P.sellRoom(S, cat) < 1) return c.kit ? 'This kit is built into the robot' : 'Your robots use all of these ' + c.short.toLowerCase() + '. Buy replacements first.';
    return null;
  };
  // How many parts of a category can go without putting a kit part (or nothing) on a robot
  P.sellRoom = function (S, cat) {
    if (D.PART_CAT[cat].kit) return P.kitsFree(S, cat);
    const a = P.alloc(S), real = x => PROD[x.p] && PROD[x.p].v !== 'K';
    const used = (a.comp[cat] || []).concat(a.prac[cat] || []).filter(real).length, have = P.items(S, cat).filter(real).length;
    return Math.max(0, have - used);
  };
  P.sell = function (S, cat, id) {
    const list = P.items(S, cat), it = list.find(x => x.id === id);
    if (!it) return 'Part not found';
    const why = P.sellBlock(S, cat, it); if (why) return why;
    const v = P.resale(S, it), pr = PROD[it.p];
    S.inv[cat] = list.filter(x => x !== it);
    S.wearTick = (S.wearTick || 0) + 1;
    G.Career.earn(S, v, 'Sold: ' + pr.name + ' (' + Math.round(it.h * 100) + '%)');
    return { amount: v, name: pr.name };
  };

  // ======================= bills of materials =======================
  // What one subsystem needs. Mechanical kits are optional and handled separately.
  P.bom = function (year, subId, c) {
    if (!c || subId === 'soft' || subId === 'frame' || c.id === 'none' || (!c.cost && !c.hours)) return {};
    if (subId === 'drive') return ({ kit: { motor: 4, gearbox: 2 }, wcd: { motor: 6, gearbox: 2 }, mec: { motor: 4, gearbox: 4 }, swerve: { motor: 8, swerve: 4, enc: 4 } })[c.id] || { motor: 4, gearbox: 2 };
    let motor = c.cx <= 1 ? 1 : c.cx <= 3 ? 2 : 3;
    if (c.look && c.look.shooter === 'wide') motor = 4;
    let enc = 0;
    (c.areas || []).forEach(a => { if (a === 'turret' || a === 'arm' || a === 'elevator') enc++; });
    if (c.id === 'hood' || (c.look && c.look.shooter === 'pivot')) enc++;
    const out = { motor };
    if (enc) out.enc = enc;
    return out;
  };
  // Mechanical COTS kits a concept can use: its main mechanism scales with size (a traversal climber takes 4 climber
  // kits, a tall elevator 2 stages), each other mechanism area adds one (a turret shooter: 1 turret + 1 shooter kit).
  const NOKIT = { vision: 1, autoPath: 1, elec: 1, swerve: 1 };
  P.kits = function (year, subId, c) {
    if (!c || c.id === 'none' || subId === 'soft' || subId === 'drive' || subId === 'frame' || (!c.cost && !c.hours)) return {};
    const out = {};
    (c.areas || []).filter(a => !NOKIT[a]).forEach((a, i) => {
      const cat = D.KIT_FOR_AREA[a]; if (!cat) return;
      let n = 1;
      if (i === 0) {
        if (a === 'climb') n = c.cx <= 2 ? 1 : c.cx - 1;
        else if (a === 'elevator' && c.cx >= 4) n = 2;
        else if (a === 'arm' && c.cx >= 5) n = 2;
        else if (a === 'intake' && (c.id === 'dual' || c.id === 'wide')) n = 2;
        else if (a === 'shooter' && (c.id === 'dumper' || (c.look && c.look.shooter === 'wide'))) n = 2;
        else if (a === 'index' && c.cx >= 4) n = 2;
      }
      out[cat] = (out[cat] || 0) + Math.min(4, n);
    });
    return out;
  };
  P.kitFor = c => (c && c.areas && c.areas.length ? D.KIT_FOR_AREA[c.areas[0]] || null : null);
  const addB = (a, b, k) => { Object.keys(b || {}).forEach(c => { a[c] = (a[c] || 0) + b[c] * (k || 1); }); return a; };
  const maxB = (a, b) => { const o = Object.assign({}, a); Object.keys(b || {}).forEach(k => { o[k] = Math.max(o[k] || 0, b[k]); }); return o; };
  // Electronics one robot slot needs: what is installed there, or what a running project will put there (whichever is more)
  P.slotBom = function (S, bi, k) {
    const R = S.robot; if (!R || !R.bots) return {};
    const year = R.year, ci = R.comp || 0, u = R.bots[bi].subs[k];
    let b = u && u.ver ? P.bom(year, k, G.Seasons.concept(year, k, u.concept)) : {};
    S.projects.forEach(p => {
      let cid = null;
      if (p.type === 'build' && p.sub === k && bi === ci) cid = p.concept;
      else if (p.type === 'copy' && p.sub === k && p.bot === bi) cid = p.concept;
      else if (p.type === 'practiceBot' && p.bot === bi && (p.subs || []).includes(k) && R.design[k]) cid = R.design[k].concept;
      else if (p.type === 'testChassis' && p.bot === bi && k === 'drive') cid = p.concept;
      if (cid) b = maxB(b, P.bom(year, k, G.Seasons.concept(year, k, cid)));
    });
    return b;
  };
  // Parts the robots need: { comp, prac } by category (kits excluded). comp is the competition robot, prac the other one.
  // extra is added to `to` ('comp' or 'prac').
  P.need = function (S, extra, to) {
    const R = S.robot, comp = {}, prac = {};
    if (!R || !R.bots) return { comp, prac };
    const ci = R.comp || 0;
    G.Seasons[R.year].subs.forEach(sd => {
      if (sd.id === 'soft') return;
      addB(comp, P.slotBom(S, ci, sd.id));
      addB(prac, P.slotBom(S, 1 - ci, sd.id));
    });
    if (extra) addB(to === 'prac' ? prac : comp, extra);
    if (Object.keys(comp).length) comp.ctrl = 1;
    if (Object.keys(prac).length) prac.ctrl = 1;
    const cams = (R.visionLvl || 0) + (S.projects.some(p => p.type === 'vision') ? 1 : 0);
    if (cams) comp.camera = cams;
    return { comp, prac };
  };
  // Missing parts if the robots also needed `extra` (on the competition robot, or on the other one when to = 'prac')
  P.shortage = function (S, extra, to) {
    const n = P.need(S, extra, to), tot = addB(addB({}, n.comp), n.prac);
    const miss = [];
    Object.keys(tot).forEach(cat => { const have = P.count(S, cat); if (tot[cat] > have) miss.push({ cat, n: tot[cat] - have }); });
    return miss;
  };
  P.shortText = miss => 'Needs ' + miss.map(m => m.n + ' more ' + (m.n > 1 ? D.PART_CAT[m.cat].short.toLowerCase() : D.PART_CAT[m.cat].short.toLowerCase().replace(/s$/, ''))).join(', ') + ' (Inventory)';
  // Mechanical kits built into subsystems (on either robot or in storage) or reserved by running builds
  P.kitsUsed = function (S, cat) {
    let used = 0;
    S.projects.forEach(p => { if (p.kits && p.kits[cat]) used += p.kits[cat]; });
    G.Robot.allUnits(S.robot).forEach(u => { if (u.kits && u.kits[cat]) used += u.kits[cat]; });
    return used;
  };
  P.kitsFree = (S, cat) => Math.max(0, P.count(S, cat) - P.kitsUsed(S, cat));
  // How well a category's kits still work: worn bearings and belts help less (average health, never below half)
  P.kitHealth = (S, cat) => { const l = P.items(S, cat); return l.length ? Math.max(0.5, U.avg(l.map(x => x.h))) : 1; };
  // Kits on one robot's subsystems
  const kitsOn = (R, bi, cat) => (R && R.bots ? Object.keys(R.bots[bi].subs).reduce((t, k) => { const u = R.bots[bi].subs[k]; return t + (k !== 'soft' && u && u.ver && u.kits && u.kits[cat] ? u.kits[cat] : 0); }, 0) : 0);

  // ======================= allocation & effects =======================
  // Newest / best parts go on the competition robot (shared evenly between subsystems), the rest on the practice robot.
  // vendorPref 'A' or 'B' keeps the competition robot on one control system when it can.
  function order(S, cat) {
    const list = P.items(S, cat).slice(), pref = S.vendorPref;
    const rank = it => { const p = PROD[it.p]; if (!p) return 0; let v = value(it); if (pref && D.PART_CAT[cat].elec) v += p.v === pref ? 2 : p.v === 'K' ? 1 : 0; return v; };
    return list.sort((a, b) => rank(b) - rank(a));
  }
  P.alloc = function (S) {
    const n = P.need(S), comp = {}, prac = {}, short = {}, pshort = {};
    const R = S.robot;
    D.PART_CATS.forEach(c => {
      const list = order(S, c.id);
      if (c.kit) { // kits sit where they were built in
        const kc = kitsOn(R, R ? R.comp || 0 : 0, c.id), kp = R ? kitsOn(R, 1 - (R.comp || 0), c.id) : 0;
        comp[c.id] = list.slice(0, kc); prac[c.id] = list.slice(kc, kc + kp); return;
      }
      const nc = n.comp[c.id] || 0, np = n.prac[c.id] || 0;
      comp[c.id] = list.slice(0, nc); prac[c.id] = list.slice(nc, nc + np);
      if (nc > comp[c.id].length) short[c.id] = nc - comp[c.id].length;
      if (np > prac[c.id].length) pshort[c.id] = np - prac[c.id].length;
    });
    return { comp, prac, short, pshort, need: n };
  };
  // What the competition robot's parts are worth: perf by category (0–1), average health, mixed control systems
  // cached on a cheap signature (robot, inventory sizes, wear tick), because ceilings ask for it a lot
  let pcache = {};
  const sig = S => (S.robot && S.robot.bots ? S.robot.bots.map(b => Object.keys(b.subs).map(k => b.subs[k] && b.subs[k].ver ? b.subs[k].concept + b.subs[k].ver : '-').join(',')).join('/') + 'c' + (S.robot.comp || 0) + 'v' + S.robot.visionLvl : '') + '|' +
    D.PART_CATS.map(c => P.count(S, c.id)).join(',') + '|' + S.vendorPref + '|' + S.projects.map(p => p.type + p.sub + p.concept + (p.bot == null ? '' : p.bot)).join(',') + '|' + (S.wearTick || 0);
  // which: 'comp' (the competition robot, default) or 'prac' (the other robot)
  P.profile = function (S, which) {
    const k = sig(S) + (which || 'comp');
    if (pcache[k] && pcache.S === S) return pcache[k];
    if (pcache.S !== S || Object.keys(pcache).length > 8) pcache = { S };
    return (pcache[k] = profile(S, which === 'prac' ? 'prac' : 'comp'));
  };
  function profile(S, side) {
    const a = P.alloc(S), out = { motor: 0, enc: 0, swerve: 0, ctrl: 0, health: 1, mixed: false, vendors: {}, short: 0 };
    let hs = 0, hn = 0;
    const lists = a[side], need = a.need[side], short = side === 'prac' ? a.pshort : a.short;
    ['motor', 'enc', 'swerve', 'ctrl'].forEach(cat => {
      const nd = need[cat] || 0, got = lists[cat] || [];
      if (nd) out[cat] = got.reduce((s, it) => s + PROD[it.p].perf, 0) / nd;
      got.forEach(it => { const v = PROD[it.p].v; out.vendors[v] = (out.vendors[v] || 0) + 1; });
      out.short += short[cat] || 0;
    });
    Object.keys(lists).forEach(cat => lists[cat].forEach(it => { hs += it.h; hn++; }));
    if (hn) out.health = hs / hn;
    out.mixed = !!(out.vendors.A && out.vendors.B);
    out.kopMix = !!(out.vendors.K && (out.vendors.A || out.vendors.B)); // kit electronics next to vendor ones
    return out;
  }
  P.devMult = S => { if (!S.robot) return 1; const pp = P.profile(S); return pp.mixed ? D.MIX_HOURS : pp.kopMix ? D.KOP_MIX_HOURS : 1; };

  // ======================= wear =======================
  const DRIVE_CATS = { swerve: 1, gearbox: 1 };
  P.wearMatch = function (S, rr) {
    if (!S.inv) return;
    const a = P.alloc(S), rng = R(), hit = 1 + Math.min(1.5, ((rr && rr.defTime) || 0) / 40);
    S.wearTick = (S.wearTick || 0) + 1;
    Object.keys(a.comp).forEach(cat => a.comp[cat].forEach(it => {
      it.h = Math.max(D.PART_MIN_HEALTH, it.h - rng.range(D.PART_WEAR_MATCH[0], D.PART_WEAR_MATCH[1]) * (DRIVE_CATS[cat] ? hit : 1));
    }));
  };
  P.wearPractice = function (S, hours, bi) {
    if (!S.inv || !hours) return;
    const a = P.alloc(S), use = S.robot && bi != null && bi !== (S.robot.comp || 0) ? a.prac : a.comp;
    S.wearTick = (S.wearTick || 0) + 1;
    Object.keys(use).forEach(cat => use[cat].forEach(it => { it.h = Math.max(D.PART_MIN_HEALTH, it.h - hours * D.PART_WEAR_PRACTICE * R().range(0.6, 1.4)); }));
  };

  // ======================= game elements =======================
  // The game whose elements matter now: this season's in season, last season's in the offseason (offseason events)
  P.elemYear = S => (P.inSeason(S) ? S.year : (S.robot ? S.robot.year : null));
  P.nextYear = S => (['off', 'review'].includes(S.phase) && S.upcoming < S.order.length ? S.order[S.upcoming] : null);
  P.elemSets = (S, y) => (S.elem && S.elem[y]) || [];
  P.elemCov = (S, y) => P.elemSets(S, y).reduce((t, e) => t + e.s * e.h, 0);
  P.fieldSize = S => D.FIELD_SIZE[Math.min(3, G.Shop.lvl(S, 'pfield'))];
  // 0–1: how much of your practice field the elements fill (a bigger set than your field adds nothing)
  P.elemFill = function (S, y) {
    if (y == null) return 0;
    const fs = P.fieldSize(S);
    if (!fs) return S.elemKop && S.elemKop[y] ? 1 : 0; // no practice field: the kit game pieces are all you need
    return Math.min(1, P.elemCov(S, y) / fs);
  };
  // Sets on order for a season (shown as pending until they arrive at Kickoff)
  P.elemPending = (S, y) => (y != null && S.elemPre && S.elemPre[y]) || [];
  P.setName = sz => (sz >= 1 ? 'Full' : sz >= 0.5 ? 'Half' : 'Quarter');
  // Driver-practice quality: kit game pieces alone give a little, a full field of elements gives everything
  P.elemQ = function (S, y) {
    if (y == null) return 0.25;
    const base = S.elemKop && S.elemKop[y] ? D.ELEM_KOP_Q : 0.15;
    return base + (1 - base) * P.elemFill(S, y);
  };
  P.elemRoom = (S, y) => D.ELEM_MAX - P.elemSets(S, y).reduce((t, e) => t + e.s, 0) - ((S.elemPre && S.elemPre[y]) || []).reduce((t, e) => t + e.s, 0);
  // Buy a set for this season's game (in season: often sold out), last season's (offseason), or preorder next season's
  P.buyElem = function (S, setId, pre) {
    const set = D.ELEM_SETS.find(x => x.id === setId);
    const y = pre ? P.nextYear(S) : P.elemYear(S);
    if (y == null) return pre ? 'Preorders open after the season review' : 'No game to buy elements for yet';
    if (!pre && P.inSeason(S) && !P.inStock(S, 'elem' + setId)) return 'Sold out this week. Field elements are scarce in season: preorder before Kickoff next time.';
    const cost = Math.round(set.price * (D.PART_PRICE_DIFF[S.diff] || 1));
    { const e = G.Career.afford(S, cost); if (e) return e; }
    if (pre) {
      if (P.elemRoom(S, y) < set.size - 1e-6) return 'You can store at most ' + D.ELEM_MAX + ' fields\' worth of elements';
      G.Career.spend(S, cost, 'Preorder: ' + set.name + ' (' + y + ')');
      S.elemPre = S.elemPre || {}; (S.elemPre[y] = S.elemPre[y] || []).push({ s: set.size });
      return null;
    }
    G.Career.spend(S, cost, set.name + ' (' + y + ')');
    S.elem = S.elem || {};
    const list = S.elem[y] = S.elem[y] || [];
    list.push({ id: U.uid('e'), s: set.size, h: 1 });
    // over the storage limit: the most worn sets are recycled
    list.sort((a, b) => b.h - a.h);
    while (list.reduce((t, e) => t + e.s, 0) > D.ELEM_MAX + 1e-6) list.pop();
    return null;
  };
  // Driver practice wears the sets that are actually on the field (best ones first, up to the field size)
  P.wearElem = function (S, y, hours) {
    if (y == null || !hours) return;
    let room = P.fieldSize(S);
    if (!room) return;
    P.elemSets(S, y).slice().sort((a, b) => b.h - a.h).forEach(e => {
      if (room <= 0) return;
      const use = Math.min(e.s, room); room -= use;
      e.h = Math.max(0.2, e.h - hours * D.ELEM_WEAR * (use / P.fieldSize(S)) * R().range(0.7, 1.3));
    });
  };

  P.kopText = kit => [kit.motor ? kit.motor + ' brushed motors' : '', kit.enc ? kit.enc + ' low-profile encoders' : '', kit.gearbox ? kit.gearbox + ' kitbot gearboxes' : '', kit.ctrl ? (kit.ctrl > 1 ? kit.ctrl + ' control hubs' : 'a basic control hub') : ''].filter(Boolean).join(', ');
  // ======================= season hooks =======================
  P.kickoff = function (S, first) {
    const rookie = S.profile === 'rookie' && first, kit = rookie ? D.KOP_ROOKIE : D.KOP, full = [];
    Object.keys(kit).forEach(cat => {
      // the kit is always handed out; only if a shelf is already full does the weakest part (often the kit one) get recycled
      const drop = P.add(S, cat, cat + 'K', kit[cat], 1);
      if (drop) full.push(drop + ' ' + D.PART_CAT[cat].short.toLowerCase());
    });
    S.lastKop = { kit, rookie, full, year: S.year };
    S.elemKop = S.elemKop || {}; S.elemKop[S.year] = true;
    const pre = S.elemPre && S.elemPre[S.year];
    if (pre && pre.length) { S.elem = S.elem || {}; S.elem[S.year] = (S.elem[S.year] || []).concat(pre.map(e => ({ id: U.uid('e'), s: e.s, h: 1 }))); delete S.elemPre[S.year]; }
    G.Career.inbox(S, rookie ? 'Rookie Kit of Parts' : 'Kit of Parts', 'This season\'s ' + (rookie ? 'rookie kit (bigger than the yearly kit every team gets)' : 'kit') + ' is in: ' + P.kopText(kit) + ' and a few ' + G.Seasons[S.year].pieceName.toLowerCase() + '.' +
      (full.length ? ' Some shelves were already full, so the weakest parts were recycled (' + full.join(', ') + ').' : '') +
      (pre && pre.length ? ' Your preordered field elements arrived too.' : '') + ' Anything else comes from the Inventory tab, and in season it often sells out.', 'dev');
  };
  // ======================= product launch events =======================
  const CAT_WORD = { motor: 'motors', enc: 'encoders', ctrl: 'control hubs', swerve: 'swerve modules' };
  const LAUNCH_INTRO = {
    A: [
      'Apex Motion rented a convention hall, dimmed the lights and let a fog machine run for a full minute before anyone said a word. Then the CEO walked out holding a single box.',
      'The Apex Motion livestream opened with a countdown clock, a drone shot of the factory and a drum solo. Fourteen thousand people watched; about thirty stayed for the spec sheet.',
      'At the Apex Motion keynote, the lead engineer pulled a cloth off a pedestal and the room went quiet. Somebody in the back said "finally".',
      'Apex Motion launched with a cinematic trailer, a waitlist and a press kit printed on brushed aluminum. The trailer had a slow-motion shot of a motor shaft. Twice.'
    ],
    B: [
      'Lumen Robotics announced its launch with a forum post at 6 a.m. titled "some new stuff". It had one photo, a price list and a spreadsheet of test data.',
      'Lumen\'s founder livestreamed from the warehouse floor, between pallets, holding the new parts up to a phone camera. The audio cut out twice. Nobody minded.',
      'Lumen Robotics launched by mailing samples to fifty rookie teams and reposting the unboxing videos they sent back.',
      'Lumen\'s launch was a twelve-minute video: what changed, what it costs, when it ships. Then it ended. The comments called it "refreshing".'
    ]
  };
  const LAUNCH_TAG = {
    motorA: '"More torque per gram than anything we have ever made. And yes, the fan is louder."',
    motorB: 'Close to the premium motors for a lot less money, with the same mounting pattern as before.',
    encA: '"Zero drift. We checked. Twice." Faster reads and a tougher housing.',
    encB: 'Same footprint, faster reads, and a connector that no longer wiggles loose by the third match of the day.',
    ctrlA: 'Built-in IMU, live CAN diagnostics and an LED ring that is "strictly for diagnostics".',
    ctrlB: 'More channels, better brownout protection, and it still fits where the old one did.',
    swerveA: 'Lower profile, faster steering and tool-free tread swaps. The demo video drifts sideways for nine seconds straight.',
    swerveB: 'A bigger bearing, a stiffer plate and, finally, a module that survives curbs and bumps.'
  };
  const LAUNCH_TALK = {
    any: [
      ['Pre-ordered before the livestream ended.', 'a lead mentor on Team {t}'],
      ['Cool. Now ship the ones I ordered last year.', 'a forum comment with 412 upvotes'],
      ['Our programmers already want to rewrite everything for it.', 'a student on Team {t}'],
      ['I will wait for the teardown video.', 'a cautious electrical mentor'],
      ['Lead time is six weeks. Kickoff is in {k}. Do the math.', 'a team treasurer'],
      ['Our sponsor asked if we were buying it. Our sponsor is now buying it.', 'Team {t}'],
      ['Does it come in team colors?', 'a rookie, asking the important questions'],
      ['The spec sheet has more footnotes than our Impact essay.', 'the strategy lead on Team {t}'],
      ['We bought forty of the old ones last week. Of course.', 'a very tired mentor on Team {t}'],
      ['Someone in the chat asked if it is legal. It is legal.', 'an FRC volunteer']
    ],
    A: [
      ['It costs how much?', 'the entire chat, at once'],
      ['The fog machine drew more current than our drivetrain.', 'a student on Team {t}'],
      ['Beautiful. Expensive. Beautiful.', 'a mentor on Team {t}'],
      ['Every top-ten team will run it by Week 1. Watch.', 'a scouting lead on Team {t}']
    ],
    B: [
      ['Lumen keeps doing more with less. Respect.', 'a rookie mentor'],
      ['The stream buffered for ten minutes and it was still the best launch of the year.', 'a forum regular'],
      ['Most of the performance for a lot less money. Our treasurer cried a little, in a good way.', 'Team {t}'],
      ['No fog machine, no drum solo, just a price. I love it.', 'a mentor on Team {t}']
    ]
  };
  function someTeam(S, rng) {
    const ks = S.teams ? Object.keys(S.teams).filter(n => Number(n) !== S.team.num) : [];
    return ks.length ? rng.pick(ks) : String(rng.int(100, 9999));
  }
  // Called at the start of each offseason month: vendors whose launch is this month put their new products on sale
  P.launchMonth = function (S) {
    if (S.phase !== 'off') return;
    const idx = P.buyIdx(S), rng = R();
    ['A', 'B'].forEach(v => {
      const rs = (S.vendorPlan || []).filter(r => r.v === v && r.idx === idx && r.mo === S.month);
      if (!rs.length) return;
      const V = D.VENDORS[v], year = S.order[idx] || S.year + 1, toKick = 8 - S.month;
      const prods = rs.map(r => {
        const g = P.genAt(S, r.cat, v), np = PROD[r.cat + v + g], op = PROD[r.cat + v + (g - 1)];
        const own = P.items(S, r.cat).reduce((m, it) => Math.max(m, (PROD[it.p] || {}).perf || 0), 0);
        return { id: np.id, cat: r.cat, name: np.name, oldName: op.name, perf: np.perf, oldPerf: op.perf, price: P.price(S, np), oldPrice: P.price(S, op), tag: LAUNCH_TAG[r.cat + v] || '', own };
      });
      const talk = rng.shuffle(LAUNCH_TALK[v].slice()).slice(0, rng.int(1, 2)).concat(rng.shuffle(LAUNCH_TALK.any.slice())).slice(0, 3)
        .map(([t, w]) => [t.replace('{k}', toKick + ' month' + (toKick > 1 ? 's' : '')), w.replace('{t}', someTeam(S, rng))]);
      const best = prods.slice().sort((a, b) => (b.perf - b.own) - (a.perf - a.own))[0];
      const take = !best.own ? 'Your electrical lead: "We have never run ' + CAT_WORD[best.cat] + ' like these. Worth a look before Kickoff."'
        : best.perf - best.own >= 0.1 ? 'Your electrical lead wants the ' + best.name + ' on the competition robot: a clear step up from what is on the shelf.'
          : 'Your electrical lead: "What we have is close enough. No need to rush."';
      const L = { id: U.uid('L'), v, vendor: V.name, month: D.MONTHS[S.month], year, toKick, intro: rng.pick(LAUNCH_INTRO[v]), prods, talk, take };
      L.title = V.name + ' launch: ' + prods.map(p => p.name).join(' & ');
      const text = L.intro + '\n\n' + prods.map(p => p.name + ' — performance ' + Math.round(p.oldPerf * 100) + ' → ' + Math.round(p.perf * 100) + ', ' + U.money(p.price) + ' each. ' + p.tag).join('\n') +
        '\n\nWhat people are saying:\n' + talk.map(([t, w]) => '“' + t + '” — ' + w).join('\n') + '\n\n' + take +
        '\n\nOn sale now in the Inventory tab. ' + prods.map(p => p.oldName).join(' and ') + (prods.length > 1 ? ' stay' : ' stays') + ' on sale through the ' + year + ' season, then ' + (prods.length > 1 ? 'they are' : 'it is') + ' discontinued. Parts you own keep working.';
      G.Career.inbox(S, L.title, text, 'dev', { launch: L.id });
      (S.launchQueue = S.launchQueue || []).push(L);
    });
  };
  // Rumors at the start of each offseason (and at the start of a career): when each vendor will launch, and roughly what
  P.teaser = function (S) {
    const idx = P.buyIdx(S), rs = (S.vendorPlan || []).filter(r => r.idx === idx && !P.released(S, r));
    if (!rs.length) return;
    const lines = ['A', 'B'].map(v => { const x = rs.filter(r => r.v === v); return x.length ? D.VENDORS[v].name + ': launch event in ' + D.MONTHS[x[0].mo] + '. The rumor is new ' + x.map(r => CAT_WORD[r.cat]).join(' and ') + '.' : null; }).filter(Boolean);
    G.Career.inbox(S, 'Vendor launch season', 'Both electronics vendors launch new products this fall, 1–4 months before Kickoff.\n\n' + lines.join('\n') + '\n\nIf you are about to stock up on those parts, it may be worth waiting. New products cost a little more; the older ones stay on sale through next season.', 'dev');
  };
  P.announce = P.teaser; // older callers

  // ======================= setup & migration =======================
  P.setup = function (S, rng) {
    S.inv = {}; D.PART_CATS.forEach(c => S.inv[c.id] = []);
    (D.START_PARTS[S.profile] || []).forEach(([cat, v, n, h]) => P.add(S, cat, v === 'C' || v === 'K' ? cat + v : cat + v + 1, n, h));
    S.elem = {}; S.elemPre = {}; S.elemKop = {}; S.vendorPref = null;
    P.planReleases(S, rng);
    P.rollStock(S);
  };
  // v2.0 saved element sets without a size: recover it from the ledger ("Half-field set (2026)"), else assume a quarter
  function fixElemSizes(S) {
    const bad = [];
    [S.elem || {}, S.elemPre || {}].forEach(m => Object.keys(m).forEach(y => (m[y] || []).forEach(e => { if (!(e.s > 0)) bad.push({ e, y }); })));
    if (!bad.length) return;
    const bought = {};
    (S.ledger || []).slice().reverse().forEach(l => { const mm = /(Quarter|Half|Full)-field set \((\d{4})\)/.exec(l.desc || ''); if (mm) (bought[mm[2]] = bought[mm[2]] || []).push({ Quarter: 0.25, Half: 0.5, Full: 1 }[mm[1]]); });
    bad.forEach(b => { const q = bought[b.y]; b.e.s = q && q.length ? q.shift() : 0.25; });
  }
  // v2.2 launch events: earlier plans had no launch month. Past and current releases stay released;
  // future seasons are planned again under the new rules (one launch per vendor per season, at most version III).
  function migrateLaunches(S) {
    if (!S.vendorPlan || S.mode !== 'career' || S.vendorPlan.every(r => r.mo != null)) return;
    const idx = P.buyIdx(S);
    S.vendorPlan = S.vendorPlan.filter(r => r.idx <= idx).map(r => Object.assign(r, { mo: 0 }));
    P.planReleases(S, G.makeRng((S.team ? S.team.num : 1) * 31 + idx), P.inSeason(S) ? idx + 1 : idx);
  }
  P.migrate = function (S) {
    if (S && S.inv) { fixElemSizes(S); migrateLaunches(S); return; }
    if (!S || S.inv) return;
    const rng = G.makeRng((S.seed || 1) * 31 + 7), old = S.parts || {};
    S.inv = {}; D.PART_CATS.forEach(c => S.inv[c.id] = []);
    if (old.motors) P.add(S, 'motor', 'motor' + (old.motors >= 2 ? 'A' : 'B') + '1', 14, 0.85);
    if (old.swerve) P.add(S, 'swerve', 'swerve' + (old.swerve >= 2 ? 'A' : 'B') + '1', 4, 0.85);
    if (old.sensors) P.add(S, 'enc', 'encB1', 6, 0.85);
    if (old.vision) P.add(S, 'camera', 'cameraC', old.vision, 0.9);
    if (old.pneu) P.add(S, 'pneu', 'pneuC', 1, 0.9);
    S.elem = {}; S.elemPre = {}; S.elemKop = {};
    if (S.robot) S.elemKop[S.robot.year] = true;
    if (S.equip && S.equip.field === S.year) S.elem[S.year] = [{ id: U.uid('e'), s: 1, h: 0.9 }];
    else if (S.equip && S.equip.field === 'pending' && P.nextYear(S)) S.elemPre[P.nextYear(S)] = [{ s: 1 }];
    if (S.equip) S.equip.field = null;
    // a robot built before parts existed keeps working: fill what it needs with Lumen parts
    if (S.robot) P.shortage(S).forEach(m => P.add(S, m.cat, D.PART_CAT[m.cat].elec ? m.cat + 'B1' : m.cat + 'C', m.n, 0.8));
    P.planReleases(S, rng);
    P.rollStock(S);
  };
})();
