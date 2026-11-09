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
  // Product releases: 2–3 updates over a career, by season index. The old generation stays on sale for one more year.
  P.planReleases = function (S, rng) {
    S.vendorPlan = [];
    if (S.mode !== 'career' || S.order.length < 3) return;
    const pairs = rng.shuffle(D.ELEC_CATS.reduce((a, c) => a.concat([[c, 'A'], [c, 'B']]), []));
    const n = rng.int(2, 3);
    for (let i = 0; i < n; i++) S.vendorPlan.push({ idx: rng.int(1, S.order.length - 1), cat: pairs[i][0], v: pairs[i][1] });
    S.vendorPlan.sort((a, b) => a.idx - b.idx);
  };
  P.genAt = (S, cat, v, idx) => 1 + (S.vendorPlan || []).filter(r => r.cat === cat && r.v === v && r.idx <= idx).length;
  // Everything you can buy right now: [{ prod, isNew, ending }]
  P.forSale = function (S) {
    const idx = P.buyIdx(S), out = [];
    D.ELEC_CATS.forEach(cat => ['A', 'B'].forEach(v => {
      const g = P.genAt(S, cat, v, idx), justOut = (S.vendorPlan || []).some(r => r.cat === cat && r.v === v && r.idx === idx);
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
  P.inStock = (S, id) => !S.stock || S.stock[id] !== false;

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
    if (cat.kit || cat.id === 'pneu' || cat.id === 'camera') { n = Math.min(n, cat.max - P.count(S, prod.cat)); if (n <= 0) return 'Storage is full (' + cat.max + ' ' + cat.short.toLowerCase() + ')'; }
    // a full shelf only takes parts better than its worst ones (otherwise the new ones would be thrown straight out)
    { const nv = prod.perf * 0.65 + 0.35, room = cat.max - P.count(S, prod.cat) + P.items(S, prod.cat).filter(it => value(it) < nv).length;
      if (room <= 0) return 'No room: all ' + cat.max + ' ' + cat.short.toLowerCase() + ' slots hold parts at least as good as this. Sell some first.';
      n = Math.min(n, room); }
    const cost = n * P.price(S, prod);
    { const e = G.Career.afford(S, cost); if (e) return e; }
    G.Career.spend(S, cost, n + '× ' + prod.name);
    const dropped = P.add(S, prod.cat, prodId, n, 1);
    return { bought: n, replaced: dropped };
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
  P.shortText = miss => 'Needs ' + miss.map(m => m.n + ' more ' + (m.n > 1 ? D.PART_CAT[m.cat].short.toLowerCase() : D.PART_CAT[m.cat].short.toLowerCase().replace(/s$/, ''))).join(', ') + ' (Shop)';
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

  // ======================= season hooks =======================
  P.kickoff = function (S, first) {
    const kit = S.profile === 'rookie' && first ? D.KOP_ROOKIE : D.KOP;
    Object.keys(kit).forEach(cat => P.add(S, cat, cat + 'K', kit[cat], 1));
    S.elemKop = S.elemKop || {}; S.elemKop[S.year] = true;
    const pre = S.elemPre && S.elemPre[S.year];
    if (pre && pre.length) { S.elem = S.elem || {}; S.elem[S.year] = (S.elem[S.year] || []).concat(pre.map(e => ({ id: U.uid('e'), s: e.s, h: 1 }))); delete S.elemPre[S.year]; }
    G.Career.inbox(S, 'Kit of Parts', 'This season\'s kit is in: ' + kit.motor + ' brushed motors, ' + kit.gearbox + ' kitbot gearboxes, a basic control hub and a few ' + G.Seasons[S.year].pieceName.toLowerCase() + '.' +
      (pre && pre.length ? ' Your preordered field elements arrived too.' : '') + ' Anything else comes from the Shop, and in season it often sells out.', 'dev');
  };
  // New products are announced at the start of the offseason they go on sale
  P.announce = function (S) {
    const idx = P.buyIdx(S);
    (S.vendorPlan || []).filter(r => r.idx === idx).forEach(r => {
      const g = P.genAt(S, r.cat, r.v, idx), np = PROD[r.cat + r.v + g], op = PROD[r.cat + r.v + (g - 1)];
      G.Career.inbox(S, 'New from ' + D.VENDORS[r.v].name + ': ' + np.name, np.name + ' is on sale now: performance ' + Math.round(np.perf * 100) + ' (was ' + Math.round(op.perf * 100) + '), ' + U.money(np.price) + ' each. ' + op.name + ' stays on sale until the end of next season, then it is discontinued. Parts you own keep working.', 'dev');
    });
  };

  // ======================= setup & migration =======================
  P.setup = function (S, rng) {
    S.inv = {}; D.PART_CATS.forEach(c => S.inv[c.id] = []);
    (D.START_PARTS[S.profile] || []).forEach(([cat, v, n, h]) => P.add(S, cat, v === 'C' ? cat + 'C' : cat + v + 1, n, h));
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
  P.migrate = function (S) {
    if (S && S.inv) { fixElemSizes(S); return; }
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
