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
  // v3.0 careers: the era catalogue. Ids: category + slot + 'e' + position on the ladder (motorAe3 = Apex Torque).
  const ladId = (cat, v, n) => cat + v + 'e' + n;
  D.VEND_CATS.forEach(c => ['A', 'B'].forEach(v => D.LADDER[c][v].forEach((L, i) => reg(Object.assign({ id: ladId(c, v, i + 1), cat: c, v, gen: i + 1 }, L)))));
  D.KOP_CATS.forEach(c => reg(D.makeProduct(c, 'K', 0)));
  D.COTS_CATS.forEach(c => reg(D.makeProduct(c, 'C', 1)));
  reg(D.makeProduct('gearbox', 'K', 0)); // the old kitbot gearbox: saves from before v2.9.3 hold some until they are moved to the kit drivetrain shelf
  P.prod = id => PROD[id];

  // Career season index the shop is selling for: during the offseason you buy for the coming season
  P.buyIdx = S => S.si + (['off', 'review', 'end'].includes(S.phase) ? 1 : 0);
  P.inSeason = S => ['kickoff', 'build', 'comp', 'champs'].includes(S.phase);
  // Product launches. Before a season a vendor holds at most one launch event, 1–4 months before Kickoff (Sep–Dec),
  // and puts its new products on sale at once. Careers from before v3.0 (no calendar): one launch per vendor every year
  // and no product line past version III. Calendar careers follow the ladders in D.LADDER (planEra).
  // Plan entries: { idx: season index the product is for, cat, v, mo: launch month (D.MONTHS index) }.
  // The previous version stays on sale until the end of that season.
  P.MAX_GEN = 3; P.LAUNCH_MONTHS = [4, 5, 6, 7];
  // v3.0: every product on the ladders gets its launch season in this career (story dates fixed, the rest a year
  // early or late), and a launch month in the autumn before. Products launched before the career began have idx -1.
  // Entries: { idx, cat, v, n: position on the ladder, mo }.
  function planEra(S, rng) {
    const cal = S.cal, first = cal[0], months = {};
    S.vendorPlan = [];
    D.VEND_CATS.forEach(cat => ['A', 'B'].forEach(v => {
      const lad = D.LADDER[cat][v]; let prev = -1e9;
      lad.forEach((L, i) => {
        let y = L.y;
        if (!L.fix) {
          const nextFix = lad.slice(i + 1).find(x => x.fix), hi = nextFix ? nextFix.y - 1 : 1e9;
          y = Math.max(prev + 1, Math.min(hi, L.y + rng.pick([-1, 0, 0, 0, 1])));
        }
        prev = y;
        const idx = y <= first ? (y === first && !L.fix && S.mode === 'career' ? 0 : -1) : cal.findIndex(c => c >= y);
        if (y > first && idx < 0) return; // after the career ends
        // one launch event per vendor per season; story launches are in September, a career's first autumn starts in October
        const key = (L.brand || v) + ':' + idx;
        if (L.fix) months[key] = 4;
        else if (months[key] == null) months[key] = idx === 0 ? rng.pick([6, 7]) : rng.pick(P.LAUNCH_MONTHS);
        S.vendorPlan.push({ idx, cat, v, n: i + 1, mo: idx < 0 ? 0 : months[key] });
      });
    }));
    // every product of one vendor in one season shares the launch month (a fixed one wins)
    S.vendorPlan.forEach(r => { if (r.idx >= 0) r.mo = months[P.brand(PROD[ladId(r.cat, r.v, r.n)]) + ':' + r.idx]; });
    S.vendorPlan.sort((a, b) => a.idx - b.idx || a.mo - b.mo);
  }
  P.era = S => !!(S && S.cal);
  P.brand = p => (p ? p.brand || p.v : null);
  // Calendar year of the season the shop is selling for
  P.buyCy = S => { if (!S.cal) return null; const i = P.buyIdx(S); return S.cal[i] != null ? S.cal[i] : S.cal[S.cal.length - 1] + 1; };
  // Sterling Motion (brand T): sold through the 2019 season, on clearance in the first months after it, then gone
  P.clearance = S => !!(S.cal && S.phase === 'off' && S.si >= 0 && G.Career.cy(S) === G.Era.STERLING_LAST && S.month < G.Era.CLEAR_MONTHS);
  P.gone = (S, p) => !!(S.cal && p && p.brand === 'T' && P.buyCy(S) > G.Era.STERLING_LAST && !P.clearance(S));
  P.planReleases = function (S, rng, from) {
    if (S.cal) return planEra(S, rng);
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
  // Generation on sale: v2.5 careers start every line at 1; an era career counts the ladder (0 = nothing sold yet)
  P.genAt = (S, cat, v) => (S.cal ? 0 : 1) + (S.vendorPlan || []).filter(r => r.cat === cat && r.v === v && P.released(S, r)).length;
  P.prodAt = (S, cat, v, g) => PROD[S.cal ? ladId(cat, v, g) : cat + v + g] || null;
  P.cur = (S, cat, v) => P.prodAt(S, cat, v, P.genAt(S, cat, v));
  // the brand selling in the premium slot right now ('T' Sterling, 'A' Apex), or null in the gap between them
  P.premium = function (S) { if (!S.cal) return 'A'; const p = P.cur(S, 'motor', 'A'); return p && !P.gone(S, p) ? P.brand(p) : null; };
  // Everything you can buy right now: [{ prod, isNew, ending }]
  // A line its own vendor replaces (D.LINE_ENDS): 0 = made as usual, 1 = discontinued, the last stock is on sale through
  // the season the replacement was launched for, 2 = gone.
  P.lineEnd = function (S, cat, v) {
    const by = S && S.cal && D.LINE_ENDS[cat] && D.LINE_ENDS[cat][v];
    if (!by) return 0;
    const r = (S.vendorPlan || []).find(x => x.cat === by && x.v === v && x.n === 1);
    if (!r || !P.released(S, r)) return 0;
    const y = r.idx >= 0 ? S.cal[r.idx] : PROD[ladId(by, v, 1)].y; // the season the replacement was launched for
    return P.buyCy(S) > y ? 2 : 1;
  };
  // Mechanism kits that only exist from the summer of 2021 (calendar careers): see D.COTS_FROM
  P.cotsOut = function (S, cat) {
    const y = D.COTS_FROM[cat];
    if (!y || !S || !S.cal) return true;
    const cy = P.buyCy(S);
    return cy > y || (cy === y && (P.inSeason(S) || (S.phase === 'off' && S.month >= D.COTS_MONTH)));
  };
  P.forSale = function (S) {
    const idx = P.buyIdx(S), out = [];
    (S.cal ? D.VEND_CATS : D.ELEC_CATS).forEach(cat => ['A', 'B'].forEach(v => {
      const g = P.genAt(S, cat, v), justOut = (S.vendorPlan || []).some(r => r.cat === cat && r.v === v && r.idx === idx && P.released(S, r));
      if (g < 1) return; // nothing of this kind is sold yet (swerve modules before 2020)
      const end = P.lineEnd(S, cat, v);
      if (end === 2) return; // the vendor has stopped making these and the last stock is sold
      const cur = P.prodAt(S, cat, v, g), prev = g > 1 ? P.prodAt(S, cat, v, g - 1) : null;
      if (cur && !P.gone(S, cur)) out.push({ prod: cur, isNew: justOut && (g > 1 || !!S.cal), clear: cur.brand === 'T' && P.clearance(S), closing: end === 1 });
      if (justOut && prev && !P.gone(S, prev)) out.push({ prod: prev, ending: true });
    }));
    const noCam = S.cal && !G.Era.at(P.buyCy(S)).vision.cam; // before 2018 nobody sells a vision camera
    D.COTS_CATS.forEach(cat => { if (!(noCam && cat === 'camera') && P.cotsOut(S, cat)) out.push({ prod: PROD[cat + 'C'] }); });
    D.KOP_CATS.forEach(cat => out.push({ prod: PROD[cat + 'K'], kop: true }));
    return out;
  };
  P.price = function (S, prod) {
    if (!prod.price) return 0;
    let base = prod.price;
    // the first brushless motor: premium money through its launch season, and until Apex arrives to compete
    if (S.cal && prod.launchPrice && (P.buyCy(S) <= prod.y || (P.buyCy(S) === prod.y + 1 && P.premium(S) !== 'A'))) base = prod.launchPrice;
    if (S.cal && prod.brand === 'T' && P.clearance(S)) base *= G.Era.CLEAR_PRICE;       // Sterling's closing sale
    { const off = P.saleFor(S, prod); if (off) base *= 1 - off; }                          // a loyalty sale, until Kickoff
    return Math.round(base * (D.PART_PRICE_DIFF[S.diff] || 1) * (G.Career.hasPerk(S, 'partsDiscount') ? 0.85 : 1));
  };

  // ======================= stock =======================
  // Rolled every turn. In season, COTS parts (electronics especially) are often sold out — stock up before Kickoff.
  P.rollStock = function (S) {
    const rng = R(), st = {}, d = D.STOCK.diff[S.diff] || 0, season = P.inSeason(S);
    P.forSale(S).forEach(x => {
      const e = D.PART_CAT[x.prod.cat].elec;
      const ly = season && e && !x.kop && P.loyalOn(S) && S.loyal && S.loyal[x.prod.v] ? D.LOYALTY.stock * S.loyal[x.prod.v].lvl : 0;
      const p = season ? (e ? D.STOCK.elec : D.STOCK.cots) + d + (x.isNew ? D.STOCK.newRelease : 0) + ly : D.STOCK.off;
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
    // a loyalty voucher from this vendor pays first
    const vch = P.loyalOn(S) && S.voucher && S.voucher[prod.v] && S.voucher[prod.v].amt > 0 ? S.voucher[prod.v] : null, use = vch ? Math.min(vch.amt, cost) : 0;
    { const e = G.Career.afford(S, cost - use); if (e) return e; }
    if (cost - use > 0) G.Career.spend(S, cost - use, n + '× ' + prod.name + (use ? ' (voucher paid ' + U.money(use) + ')' : ''));
    else S.ledger.unshift({ d: G.Career.dateLabel(S), desc: n + '× ' + prod.name + ' (paid with your ' + D.VENDORS[P.brand(prod)].short + ' voucher)', amt: 0, px: G.Career.px(S) });
    if (use) { vch.amt -= use; if (vch.amt <= 0) delete S.voucher[prod.v]; }
    if (P.loyalOn(S) && (prod.v === 'A' || prod.v === 'B')) { const vb = S.vendBought = S.vendBought || { A: 0, B: 0 }; vb[prod.v] += cost; } // this year's orders count for loyalty
    const had = P.items(S, prod.cat).slice();
    const dropped = P.add(S, prod.cat, prodId, n, 1);
    let sold = 0, got = 0;
    if (dropped) {
      const keep = new Set(P.items(S, prod.cat));
      had.filter(it => !keep.has(it)).forEach(it => { const v = it.h > D.SELL_MIN ? P.resale(S, it) : 0; if (v > 0) { sold++; got += v; } });
      if (got) G.Career.earn(S, got, 'Sold ' + sold + ' replaced ' + cat.short.toLowerCase());
    }
    return { bought: n, replaced: dropped, sold, got, voucher: use };
  };

  // The product to buy for a category from a vendor (electronics) or the COTS suppliers
  P.pick = function (S, cat, v) {
    const list = P.forSale(S).filter(x => x.prod.cat === cat && !x.ending && (v === 'K' || x.prod.v !== 'K'));
    const e = list.find(x => x.prod.v === v) || list[0] || P.forSale(S).find(x => x.prod.cat === cat && x.prod.v === 'K'); // Kit of Parts only (the kit drivetrain)
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
  // The second-hand market. An overtaken technology fetches less from the day its replacement is on sale:
  // returns [{ k: factor, why }] for a product (empty = the usual share of list price).
  P.usedWhy = function (S, pr) {
    const out = [], UM = D.USED;
    if (!pr || !S.cal || pr.v === 'K') return out;
    const cy = P.buyCy(S);
    if (pr.brand === 'T' && cy > G.Era.STERLING_LAST) out.push({ k: G.Era.STERLING_RESALE, why: 'Sterling Motion has closed: nobody services these' });
    if (pr.cat === 'motor' && pr.kind === 'brushed' && ['A', 'B'].some(v => { const c = P.cur(S, 'motor', v); return c && c.kind === 'brushless'; })) out.push({ k: UM.brushed, why: 'brushless motors are on sale: few buyers want brushed ones' });
    if ((pr.v === 'A' || pr.v === 'B') && pr.gen) { const b = Math.min(2, Math.max(0, P.genAt(S, pr.cat, pr.v) - pr.gen)); if (b) out.push({ k: UM.behind[b], why: b > 1 ? 'two or more versions old' : 'a newer version is on sale' }); }
    if (pr.cat === 'wcd') { const n = ['A', 'B'].filter(v => P.genAt(S, 'swerve', v) >= 1).length; if (n) out.push({ k: UM.wcd[n], why: n > 1 ? 'both vendors sell swerve modules now' : 'swerve modules are on sale' }); }
    if (pr.cat === 'pneu') { const k = U.clamp(G.Era.at(cy).pneu / UM.pneuRef, UM.pneuMin, 1); if (k < 0.99) out.push({ k, why: 'motors do more of what cylinders did' }); }
    return out;
  };
  P.usedFactor = (S, pr) => P.usedWhy(S, pr).reduce((t, x) => t * x.k, 1);
  // Resale value: a share of today's list price, scaled by the part's health and by what the second-hand market thinks of it
  P.resale = (S, it) => { const pr = PROD[it.p]; return pr && pr.price && pr.v !== 'K' ? Math.round(P.price(S, pr) * D.RESALE * it.h * P.usedFactor(S, pr)) : 0; };
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
    if (subId === 'drive') {
      const west = G.S && G.S.cal ? { motor: 6, wcd: 2 } : { motor: 6, gearbox: 2 }; // careers from before v3.0 keep generic gearboxes
      return ({ kit: { motor: 4, kdrive: 2 }, wcd: west, wcd8: west, mec: { motor: 4, gearbox: 4 }, swerve: G.Era.of(G.S).swerve.cots ? { motor: 8, swerve: 4, enc: 4 } : { motor: 8, enc: 4 } })[c.id] || { motor: 4, gearbox: 2 }; // before 2020 a team machines its own modules
    }
    let motor = c.cx <= 1 ? 1 : c.cx <= 3 ? 2 : 3;
    if (c.look && c.look.shooter === 'wide') motor = 4;
    let enc = 0;
    (c.areas || []).forEach(a => { if (a === 'turret' || a === 'arm' || a === 'elevator') enc++; });
    if (c.id === 'hood' || (c.look && c.look.shooter === 'pivot')) enc++;
    const out = { motor };
    if (enc) out.enc = enc;
    return out;
  };
  // Subsystem COTS kits a concept can use: its main mechanism scales with size (a traversal climber takes 4 climber
  // kits, a tall elevator 2 stages), each other mechanism area adds one (a turret shooter: 1 turret + 1 shooter kit).
  const NOKIT = { vision: 1, autoPath: 1, elec: 1, swerve: 1 };
  P.kits = function (year, subId, c) {
    if (!c || c.id === 'none' || subId === 'soft' || subId === 'drive' || subId === 'frame' || (!c.cost && !c.hours)) return {};
    const out = {}, sold = cat => !G.S || P.cotsOut(G.S, cat);
    if (subId === 'effector') return sold('kGrip') ? { kGrip: c.cx >= 4 ? 2 : 1 } : out;
    (c.areas || []).filter(a => !NOKIT[a]).forEach((a, i) => {
      const cat = D.KIT_FOR_AREA[a]; if (!cat || !sold(cat)) return;
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
  // The Kit of Parts subsystem kit a concept can use, or null: only the simplest concept of a subsystem takes one.
  P.kopKit = function (year, subId, c) {
    if (!c || c.id === 'none' || subId === 'soft' || subId === 'drive' || subId === 'frame' || (!c.cost && !c.hours)) return null;
    const sd = G.Seasons.sub(year, subId), first = sd && sd.concepts.find(x => x.id !== 'none' && (x.cost || x.hours));
    if (!(c.cx <= 1 || (first && first.id === c.id && c.cx <= 2))) return null;
    if (subId === 'effector') return 'kopGrip';
    const a = (c.areas || [])[0];
    return a === 'intake' ? 'kopIntake' : a === 'shooter' ? 'kopShoot' : a === 'arm' || a === 'elevator' ? 'kopLift' : null;
  };
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
    if (cams && G.Era.of(S).vision.cam) comp.camera = cams; // before 2018: home-made vision, no camera product
    return { comp, prac, sub: resolveDrive(S, comp, prac) };
  };
  // Drivetrain parts that stand in for each other (D.DRIVE_ALT), decided for the competition robot first. A West Coast
  // drive takes vendor drive sets when the shelf has them, else Drive gearboxes if it has those. A kit chassis takes Drive
  // gearboxes when two are to spare (after mecanum and the like), else the kit drivetrain. Returns what was swapped.
  function resolveDrive(S, comp, prac) {
    const left = { wcd: P.count(S, 'wcd'), gearbox: P.count(S, 'gearbox') }, sub = { comp: {}, prac: {} };
    [comp, prac].forEach(n => { left.gearbox -= Math.min(left.gearbox, n.gearbox || 0); });
    [['comp', comp], ['prac', prac]].forEach(([side, n]) => {
      if (n.wcd) {
        if (left.wcd >= n.wcd) left.wcd -= n.wcd;
        else if (left.gearbox >= n.wcd) { left.gearbox -= n.wcd; n.gearbox = (n.gearbox || 0) + n.wcd; delete n.wcd; sub[side].wcd = true; }
      }
      if (n.kdrive && left.gearbox >= n.kdrive) { left.gearbox -= n.kdrive; n.gearbox = (n.gearbox || 0) + n.kdrive; delete n.kdrive; sub[side].kdrive = true; }
    });
    return sub;
  }
  // What a drive concept's speed and push ceilings get from the parts it runs on: { speed, push, on }, with on =
  // 'kdrive' (kit drivetrain), 'gearbox' (Drive gearboxes) or 'wcd' (vendor drive sets). For the drive that is on the
  // competition robot it is what is fitted; for a concept not built yet, what the shelf would give it.
  P.driveQ = function (S, cid) {
    const z = { speed: 0, push: 0, on: null }, west = cid === 'wcd' || cid === 'wcd8';
    if (!S || !S.cal || !S.inv || (!west && cid !== 'kit')) return z;
    const R = S.robot, cur = R && R.bots ? R.bots[R.comp || 0].subs.drive : null;
    let on = null, q = 0;
    if (cur && cur.ver && cur.concept === cid) { const pp = P.profile(S); on = pp.driveOn; q = pp.wcd; }
    else if (west) { const l = order(S, 'wcd'); if (l.length >= 2) { on = 'wcd'; q = (PROD[l[0].p].perf + PROD[l[1].p].perf) / 2; } else if (P.count(S, 'gearbox') >= 2) on = 'gearbox'; }
    else on = P.count(S, 'gearbox') >= 2 ? 'gearbox' : 'kdrive';
    if (!on) return z;
    if (west) { const k = on === 'gearbox' ? D.WCD_GEARBOX_Q : q; return { speed: 10 * k - 4, push: 6 * k - 2, on }; }
    return on === 'gearbox' ? { speed: D.DRIVE_UP.speed, push: D.DRIVE_UP.push, on } : { speed: 0, push: 0, on };
  };
  // one line for the concept list: what this drive can run on, and what yours would run on today
  P.driveNote = function (S, cid) {
    if (!S || !S.cal) return '';
    const west = cid === 'wcd' || cid === 'wcd8', d = P.driveQ(S, cid), f = v => (v >= 0 ? '+' : '−') + Math.abs(Math.round(v));
    if (west) return 'Runs on 2 vendor drive sets (best), or on 2 COTS Drive gearboxes when there are no sets for it (slower and weaker). ' + (d.on === 'wcd' ? 'Yours would run on drive sets' : d.on === 'gearbox' ? 'Yours would run on Drive gearboxes' : 'You have neither on the shelf') + (d.on ? ': Speed ' + f(d.speed) + ', Pushing ' + f(d.push) + ' (counted in the ceilings above).' : '.');
    if (cid === 'kit') return 'Runs on 2 kit drivetrain sets, or on 2 COTS Drive gearboxes when you have them to spare (faster and stronger). ' + (d.on === 'gearbox' ? 'Yours would run on Drive gearboxes: Speed +' + D.DRIVE_UP.speed + ', Pushing +' + D.DRIVE_UP.push + ' (counted in the ceilings above).' : 'Yours would run on the kit drivetrain.');
    if (cid === 'mec') return 'Runs on 4 COTS Drive gearboxes. The kit drivetrain only fits the kit chassis.';
    return '';
  };
  // a bill of materials as the shelf resolves it for one side: Drive gearboxes where they stand in for sets or kit parts
  P.shownBom = function (S, side, subId, bom) {
    if (subId !== 'drive') return bom;
    const sb = (P.need(S).sub || {})[side] || {}, out = {};
    Object.keys(bom).forEach(k => { const to = sb[k] ? D.DRIVE_ALT[k] : k; out[to] = (out[to] || 0) + bom[k]; });
    return out;
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
    { const nd = need.wcd || 0, got = lists.wcd || []; out.wcd = nd ? got.reduce((s, it) => s + PROD[it.p].perf, 0) / nd : 0; out.short += short.wcd || 0; } // drive sets: no part of the control system
    { const sb = (a.need.sub && a.need.sub[side]) || {}; out.driveOn = sb.wcd || sb.kdrive ? 'gearbox' : need.wcd ? 'wcd' : need.kdrive ? 'kdrive' : need.gearbox ? 'gearbox' : null; }
    Object.keys(lists).forEach(cat => lists[cat].forEach(it => { hs += it.h; hn++; }));
    if (hn) out.health = hs / hn;
    out.mixed = !!(out.vendors.A && out.vendors.B);
    out.kopMix = !!(out.vendors.K && (out.vendors.A || out.vendors.B)); // kit electronics next to vendor ones
    return out;
  }
  P.devMult = S => { if (!S.robot) return 1; const pp = P.profile(S); return pp.mixed ? D.MIX_HOURS : pp.kopMix ? D.KOP_MIX_HOURS : 1; };

  // ======================= wear =======================
  const DRIVE_CATS = { swerve: 1, gearbox: 1, wcd: 1, kdrive: 1 };
  P.wearMatch = function (S, rr) {
    if (!S.inv) return;
    const a = P.alloc(S), rng = R(), bumps = (rr && rr.bumps) || 0, hit = 1 + Math.min(1.5, ((rr && rr.defTime) || 0) / 40);
    // bars and bumps (counted for swerve and mecanum drives only): swerve modules take the worst of it; a mecanum drive
    // has no modules, so its gearboxes carry the damage
    const rough = { swerve: 1 + Math.min(2, bumps * 0.035), gearbox: G.Robot.compDrive(S) === 'mec' ? 1 + Math.min(2, bumps * 0.035) : 1 };
    S.wearTick = (S.wearTick || 0) + 1;
    Object.keys(a.comp).forEach(cat => a.comp[cat].forEach(it => {
      it.h = Math.max(D.PART_MIN_HEALTH, it.h - rng.range(D.PART_WEAR_MATCH[0], D.PART_WEAR_MATCH[1]) * (DRIVE_CATS[cat] ? hit * (rough[cat] || 1) : 1) * (1 - G.Shop.fx(S, 'ebench', 'partWear')));
    }));
  };
  P.wearPractice = function (S, hours, bi) {
    if (!S.inv || !hours) return;
    const a = P.alloc(S), use = S.robot && bi != null && bi !== (S.robot.comp || 0) ? a.prac : a.comp;
    S.wearTick = (S.wearTick || 0) + 1;
    Object.keys(use).forEach(cat => use[cat].forEach(it => { it.h = Math.max(D.PART_MIN_HEALTH, it.h - hours * D.PART_WEAR_PRACTICE * R().range(0.6, 1.4) * (1 - G.Shop.fx(S, 'ebench', 'partWear'))); }));
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

  P.kopText = kit => [kit.motor ? kit.motor + ' brushed motors' : '', kit.enc ? kit.enc + ' low-profile encoders' : '', kit.kdrive || kit.gearbox ? (kit.kdrive || kit.gearbox) + ' kit drivetrain sets' : '', kit.ctrl ? (kit.ctrl > 1 ? kit.ctrl + ' control hubs' : 'a basic control hub') : ''].filter(Boolean).join(', ');
  // ======================= season hooks =======================
  P.kickoff = function (S, first) {
    const rookie = S.profile === 'rookie' && first, kit = rookie ? D.KOP_ROOKIE : D.KOP, full = [];
    Object.keys(kit).forEach(cat => {
      // the kit is always handed out; only if a shelf is already full does the weakest part (often the kit one) get recycled
      const drop = P.add(S, cat, cat + 'K', kit[cat], 1);
      if (drop) full.push(drop + ' ' + D.PART_CAT[cat].short.toLowerCase());
    });
    S.lastKop = { kit, rookie, full, year: S.year };
    P.loyalDeliver(S);
    S.elemKop = S.elemKop || {}; S.elemKop[S.year] = true;
    const pre = S.elemPre && S.elemPre[S.year];
    if (pre && pre.length) { S.elem = S.elem || {}; S.elem[S.year] = (S.elem[S.year] || []).concat(pre.map(e => ({ id: U.uid('e'), s: e.s, h: 1 }))); delete S.elemPre[S.year]; }
    G.Career.inbox(S, rookie ? 'Rookie Kit of Parts' : 'Kit of Parts', 'This season\'s ' + (rookie ? 'rookie kit (bigger than the yearly kit every team gets)' : 'kit') + ' is in: ' + P.kopText(kit) + ' and a few ' + G.Seasons[S.year].pieceName.toLowerCase() + '.' +
      (full.length ? ' Some shelves were already full, so the weakest parts were recycled (' + full.join(', ') + ').' : '') +
      (pre && pre.length ? ' Your preordered field elements arrived too.' : '') + ' Anything else comes from the Inventory tab, and in season it often sells out.', 'dev');
  };
  // ======================= vendor loyalty =======================
  // Loyalty is kept per catalogue: 'A' the premium one (Sterling Motion, then Apex Motion, which honours Sterling's
  // customer list) and 'B' Lumen Robotics. New careers only: a career from before v3.0 plays on without it.
  P.loyalOn = S => !!(S && S.cal && S.mode === 'career');
  const lyState = S => (S.loyal = S.loyal || { A: { pts: 0, lvl: 0 }, B: { pts: 0, lvl: 0 } });
  // the brand selling in a catalogue right now ('T', 'A' or 'B'), or null while the premium one is between owners
  P.slotBrand = (S, slot) => (slot === 'A' ? P.premium(S) : 'B');
  P.loyal = function (S, slot) {
    const st = lyState(S)[slot], L = D.LOYALTY, lvl = st.lvl, brand = P.slotBrand(S, slot) || (slot === 'A' ? (P.buyCy(S) > G.Era.STERLING_LAST ? 'A' : 'T') : 'B');
    return { slot, pts: st.pts, lvl, name: L.names[lvl], next: L.levels[lvl] != null ? L.levels[lvl] : null, prev: lvl ? L.levels[lvl - 1] : 0, brand, vendor: D.VENDORS[brand],
      voucher: S.voucher && S.voucher[slot] && S.voucher[slot].amt > 0 ? S.voucher[slot] : null, sale: P.saleOf(S, slot), stock: L.stock * lvl };
  };
  // a loyalty sale runs from the letter until Kickoff
  P.saleOf = (S, slot) => { const s = S.vendSale && S.vendSale[slot]; return s && S.phase === 'off' && S.upcoming === s.up ? s.pct : 0; };
  P.saleFor = (S, prod) => (prod && (prod.v === 'A' || prod.v === 'B') && S.vendSale ? P.saleOf(S, prod.v) : 0);
  // how much of the competition robot's electronics each catalogue supplies (kit parts count for nobody)
  P.vendorShare = function (S) {
    const v = S.robot ? P.profile(S).vendors : {}, tot = (v.A || 0) + (v.B || 0) + (v.K || 0);
    return { A: tot ? (v.A || 0) / tot : 0, B: tot ? (v.B || 0) / tot : 0 };
  };
  // at every official event the vendors see what is on the robot
  P.loyalSample = function (S) {
    if (!P.loyalOn(S) || !S.season) return;
    const sh = P.vendorShare(S), sv = S.season.vend = S.season.vend || { n: 0, A: 0, B: 0 };
    sv.n++; sv.A += sh.A; sv.B += sh.B;
  };
  // season review: 100 points for a competition robot that ran on this catalogue alone, up to 15 more for the year's
  // orders; a new level means a letter in the autumn
  P.loyalSeason = function (S) {
    if (!P.loyalOn(S)) return null;
    const sv = S.season && S.season.vend, st = lyState(S), L = D.LOYALTY, out = [];
    ['A', 'B'].forEach(slot => {
      // (a season without an official event: what is on the robot at the review)
      const robot = Math.round(L.robot * Math.min(1, (sv && sv.n ? sv[slot] / sv.n : P.vendorShare(S)[slot]) / L.full)), buy = Math.round(L.buy * Math.min(1, ((S.vendBought || {})[slot] || 0) / L.buyFull)), gain = robot + buy, s = st[slot];
      if (!gain) return;
      s.pts += gain;
      let up = 0;
      while (L.levels[s.lvl] != null && s.pts >= L.levels[s.lvl]) { s.lvl++; up++; (S.loyalDue = S.loyalDue || []).push({ slot, lvl: s.lvl }); }
      out.push({ slot, brand: P.loyal(S, slot).brand, gain, robot, buy, pts: s.pts, lvl: s.lvl, up, next: L.levels[s.lvl] != null ? L.levels[s.lvl] : null });
    });
    S.vendBought = { A: 0, B: 0 };
    // a voucher is good through the season after it was given
    Object.keys(S.voucher || {}).forEach(slot => { const v = S.voucher[slot]; if (v && S.si >= v.until) { if (v.amt > 0) G.Career.inbox(S, 'Voucher expired', 'The ' + U.money(v.amt) + ' left on your ' + P.loyal(S, slot).vendor.name + ' voucher expired with the season.', 'money'); delete S.voucher[slot]; } });
    return out;
  };
  const LOYAL_INTRO = {
    T: 'A heavy envelope arrives from Sterling Motion: a letter on thick paper, signed in ink by the regional sales director, and a brass plate for the robot cart.',
    A: 'A box arrives from Apex Motion. Inside: a letter from the founder, a strip of orange stickers for the robot, and a page torn from her list of failed parts with a line through every entry.',
    B: 'A padded envelope arrives from Lumen Robotics, addressed by hand. Inside: a note from the founder, a roll of teal stickers, and a photo of your robot pinned up on their warehouse wall.'
  };
  const LOYAL_TALK = [
    ['Their stickers are on our robot anyway. Now they are paying for the space.', 'a lead mentor'],
    ['The vendor rep knew our drive coach by name. That felt strange and good.', 'a student on Team {t}'],
    ['We switched vendors last year to save two hundred dollars. I am doing the maths again.', 'a treasurer on Team {t}'],
    ['Free motors are the best motors.', 'every electrical lead, ever'],
    ['They asked for a photo of the robot for the catalogue. The students argued for an hour about which side is its good side.', 'a mentor on Team {t}'],
    ['Loyalty goes both ways: when we were short in Week 3 they found us four motors in a day.', 'a team in its ninth season with the same vendor']
  ];
  // the letter: the team has reached a new level with a vendor and chooses its loyalty sponsorship
  P.loyalOffer = function (S, slot, lvl) {
    const L = D.LOYALTY, brand = P.slotBrand(S, slot), V = D.VENDORS[brand], rng = R();
    const pack = Object.keys(L.pack[lvl] || {}).filter(cat => { const pr = P.cur(S, cat, slot); return pr && !P.gone(S, pr); }).map(cat => ({ cat, n: L.pack[lvl][cat] }));
    const O = S.loyalOffer = { slot, brand, lvl, stage: 'choose', pack, packValue: pack.reduce((t, x) => t + x.n * P.cur(S, x.cat, slot).price, 0), voucher: L.voucher[lvl], sale: L.sale[lvl],
      month: D.MONTHS[S.month], intro: LOYAL_INTRO[brand] || LOYAL_INTRO.B, talk: rng.shuffle(LOYAL_TALK.slice()).slice(0, 3).map(q => [q[0], q[1].replace('{t}', someTeam(S, rng))]) };
    G.Career.inbox(S, V.name + ' names you a ' + L.names[lvl], O.intro + '\n\nYour team has reached loyalty level ' + lvl + ' with ' + V.name + ' (' + L.names[lvl] + '). Choose your loyalty sponsorship (Headquarters):\n• Free parts at Kickoff: ' + P.packText(S, O) +
      '\n• A voucher of ' + U.money(O.voucher) + ', good through next season\n• ' + Math.round(O.sale * 100) + '% off everything from ' + V.short + ' until Kickoff\n\nFrom now on your in-season orders with ' + V.short + ' ship first: +' + Math.round(L.stock * lvl * 100) + '% chance that a part is in stock.', 'money');
    (S.launchQueue = S.launchQueue || []).push({ kind: 'loyalty' });
    return O;
  };
  P.packText = (S, O) => O.pack.map(x => x.n + ' ' + (x.n > 1 ? CAT_WORD[x.cat] : CAT_WORD[x.cat].replace(/s$/, ''))).join(', ') + ' (the newest ' + D.VENDORS[O.brand].short + ' version on sale by then)';
  // each offseason month from September: one letter at a time
  P.loyalMonth = function (S) {
    if (!P.loyalOn(S) || S.loyalOffer || !(S.loyalDue || []).length || S.month < D.LOYALTY.month) return;
    const i = S.loyalDue.findIndex(d => !!P.slotBrand(S, d.slot)); // the premium catalogue may be between owners
    if (i < 0) return;
    const d = S.loyalDue.splice(i, 1)[0];
    P.loyalOffer(S, d.slot, d.lvl);
  };
  // pick: 'pack' (free parts at Kickoff), 'voucher' or 'sale'
  P.loyalChoose = function (S, pick) {
    const O = S.loyalOffer;
    if (!O || O.stage !== 'choose') return 'Nothing to choose';
    if (!['pack', 'voucher', 'sale'].includes(pick)) return 'Choose one of the three';
    const V = D.VENDORS[O.brand];
    let text;
    if (pick === 'pack') { (S.loyalShip = S.loyalShip || []).push({ slot: O.slot, lvl: O.lvl, list: O.pack }); text = 'Your free parts arrive with the Kit of Parts at Kickoff: ' + P.packText(S, O) + '.'; }
    else if (pick === 'voucher') { const v = S.voucher = S.voucher || {}; v[O.slot] = { amt: ((v[O.slot] || {}).amt || 0) + O.voucher, until: S.upcoming }; text = 'A voucher of ' + U.money(O.voucher) + ' is on your account. It pays first whenever you buy ' + V.short + ' parts, and it is good through next season.'; }
    else { (S.vendSale = S.vendSale || {})[O.slot] = { pct: O.sale, up: S.upcoming }; text = 'Everything from ' + V.short + ' is ' + Math.round(O.sale * 100) + '% off for your team until Kickoff, new products included.'; }
    (S.loyalLog = S.loyalLog || []).push({ slot: O.slot, brand: O.brand, lvl: O.lvl, pick, cy: P.buyCy(S) });
    G.Career.inbox(S, 'Loyalty sponsorship: ' + V.name, text, 'money');
    S.loyalOffer = null;
    return null;
  };
  // Kickoff: free parts chosen in the autumn arrive with the kit, in the newest version on sale
  P.loyalDeliver = function (S) {
    (S.loyalShip || []).forEach(sh => {
      const got = [];
      sh.list.forEach(x => { const pr = P.cur(S, x.cat, sh.slot); if (pr && !P.gone(S, pr)) { P.add(S, x.cat, pr.id, x.n, 1); got.push(x.n + '× ' + pr.name); } });
      if (got.length) G.Career.inbox(S, 'Loyalty parts have arrived', 'In the box next to the Kit of Parts: ' + got.join(', ') + '. With thanks from ' + P.loyal(S, sh.slot).vendor.name + '.', 'dev');
    });
    S.loyalShip = [];
  };

  // ======================= product launch events =======================
  // ======================= product launch events =======================
  const CAT_WORD = { motor: 'motors', enc: 'encoders', ctrl: 'control hubs', swerve: 'swerve modules', wcd: 'West Coast drive sets' };
  const LAUNCH_INTRO = {
    T: [
      'Sterling Motion announced it the way it always has: a printed catalogue in the mail, a full-page advertisement, and a booth with carpet at the trade show.',
      'The Sterling Motion sales team toured the bigger regionals with a demonstration case and a stack of order forms. The engineers stayed home.',
      'Sterling Motion sent every team a glossy brochure and a letter signed in ink. The new part number is one digit higher than the old one.'
    ],
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
    swerveB: 'A bigger bearing, a stiffer plate and, finally, a module that survives curbs and bumps.',
    wcdT: 'Hardened gears, a second speed and bearing blocks that slide to tension the belts. It is what the fast six-wheel drives are built on.',
    wcdB: 'Lighter side plates, sealed bearings and belts instead of chain. A whole drive side out of one box, for the price of a premium gearbox.',
    motorT: 'More copper, better brushes and the same bolt pattern as the last fifteen years. "Proven", says the brochure, four times.',
    encT: 'A sealed housing and a cable that finally locks. Sterling calls it "field-hardened".',
    ctrlT: 'More channels and a metal case. The manual is forty pages and worth reading.',
    ion: 'No brushes to wear out, twice the power for the weight, and the controller reads the rotor position by itself.',
    apex: 'Every connector latches. Built by people who kept a list of what fails.',
    apexmotor: 'Brushless, with a connector that locks with a click. The first entry on the founder\'s list of failed parts was a motor lead.',
    apexenc: 'An absolute encoder in a sealed case with a latching plug. It reads the same after a hard hit as before it.',
    apexctrl: 'Every port latches and every channel has its own fault light. Built by people who kept a list of what fails.',
    vector: 'The first swerve module you can simply buy: bolt on four, add motors and encoders, and drive sideways.',
    pivot: 'Heavier and a little slower than the premium module, at about two thirds of the price.'
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
    T: [
      ['Sterling does not do surprises. Sterling does catalogues.', 'a lead mentor'],
      ['Same motor, new sticker, higher price. I ordered twenty.', 'a mentor on Team {t}'],
      ['It will outlive the robot. They always do.', 'a fabrication mentor'],
      ['The order form is a fax number. In this decade.', 'a student on Team {t}']
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
      const era = !!S.cal, first = era ? PROD[ladId(rs[0].cat, v, rs[0].n)] : null, bv = era ? P.brand(first) : v;
      const V = D.VENDORS[bv], year = era ? S.cal[idx] : (S.order[idx] || S.year + 1), toKick = 8 - S.month;
      const prods = rs.map(r => {
        const g = era ? r.n : P.genAt(S, r.cat, v), np = P.prodAt(S, r.cat, v, g), op0 = g > 1 ? P.prodAt(S, r.cat, v, g - 1) : null, op = op0 && !(era && P.gone(S, op0) && op0.brand !== np.brand) ? op0 : null;
        const own = P.items(S, r.cat).reduce((m, it) => Math.max(m, (PROD[it.p] || {}).perf || 0), 0);
        const tag = era ? (np.kind === 'brushless' && op0 && op0.kind === 'brushed' && bv === 'B' ? LAUNCH_TAG.ion : bv === 'A' && (!op0 || op0.brand === 'T') ? (r.cat === 'swerve' ? LAUNCH_TAG.vector : LAUNCH_TAG['apex' + r.cat] || LAUNCH_TAG.apex) : r.cat === 'swerve' && g === 1 ? LAUNCH_TAG.pivot : LAUNCH_TAG[r.cat + bv] || '') : LAUNCH_TAG[r.cat + v] || '';
        return { id: np.id, cat: r.cat, name: np.name, oldName: op ? op.name : null, perf: np.perf, oldPerf: op ? op.perf : (op0 ? op0.perf : 0), price: P.price(S, np), oldPrice: op ? P.price(S, op) : 0, tag, own, vs: !op && op0 ? op0.name : null };
      });
      const talk = rng.shuffle(LAUNCH_TALK[bv].slice()).slice(0, rng.int(1, 2)).concat(rng.shuffle(LAUNCH_TALK.any.slice())).slice(0, 3)
        .map(([t, w]) => [t.replace('{k}', toKick + ' month' + (toKick > 1 ? 's' : '')), w.replace('{t}', someTeam(S, rng))]);
      const best = prods.slice().sort((a, b) => (b.perf - b.own) - (a.perf - a.own))[0];
      const take = !best.own ? 'Your electrical lead: "We have never run ' + CAT_WORD[best.cat] + ' like these. Worth a look before Kickoff."'
        : best.perf - best.own >= 0.1 ? 'Your electrical lead wants the ' + best.name + ' on the competition robot: a clear step up from what is on the shelf.'
          : 'Your electrical lead: "What we have is close enough. No need to rush."';
      const L = { id: U.uid('L'), v: bv, vendor: V.name, month: D.MONTHS[S.month], year, toKick, intro: rng.pick(LAUNCH_INTRO[bv]), prods, talk, take };
      L.title = V.name + ' launch: ' + prods.map(p => p.name).join(' & ');
      const olds = prods.filter(p => p.oldName).map(p => p.oldName);
      const text = L.intro + '\n\n' + prods.map(p => p.name + ' — performance ' + (p.oldPerf ? Math.round(p.oldPerf * 100) + ' → ' : '') + Math.round(p.perf * 100) + ', ' + U.money(p.price) + ' each. ' + p.tag).join('\n') +
        '\n\nWhat people are saying:\n' + talk.map(([t, w]) => '“' + t + '” — ' + w).join('\n') + '\n\n' + take +
        '\n\nOn sale now in the Inventory tab.' + (olds.length ? ' ' + olds.join(' and ') + (olds.length > 1 ? ' stay' : ' stays') + ' on sale through the ' + year + ' season, then ' + (olds.length > 1 ? 'they are' : 'it is') + ' discontinued.' : '') + ' Parts you own keep working.';
      G.Career.inbox(S, L.title, text, 'dev', { launch: L.id });
      (S.launchQueue = S.launchQueue || []).push(L);
    });
  };
  // Rumors at the start of each offseason (and at the start of a career): when each vendor will launch, and roughly what
  P.teaser = function (S) {
    const idx = P.buyIdx(S), rs = (S.vendorPlan || []).filter(r => r.idx === idx && !P.released(S, r));
    if (!rs.length) return;
    const lines = ['A', 'B'].map(v => { const x = rs.filter(r => r.v === v && !(S.cal && PROD[ladId(r.cat, v, r.n)].quiet)); return x.length ? D.VENDORS[S.cal ? P.brand(PROD[ladId(x[0].cat, v, x[0].n)]) : v].name + ': launch event in ' + D.MONTHS[x[0].mo] + '. The rumor is new ' + x.map(r => CAT_WORD[r.cat]).join(' and ') + '.' : null; }).filter(Boolean);
    if (!lines.length) return;
    G.Career.inbox(S, 'Vendor launch season', 'The electronics vendors launch new products in the fall, 1–4 months before Kickoff.\n\n' + lines.join('\n') + '\n\nIf you are about to stock up on those parts, it may be worth waiting. New products cost a little more; the older ones stay on sale through next season.', 'dev');
  };
  P.announce = P.teaser; // older callers

  // ======================= setup & migration =======================
  P.setup = function (S, rng) {
    S.inv = {}; D.PART_CATS.forEach(c => S.inv[c.id] = []);
    if (S.cal) {
      P.planReleases(S, rng);
      const noCam = !G.Era.at(S.cal[0]).vision.cam;
      (D.START_PARTS[S.profile] || []).forEach(([cat, v, n, h]) => {
        if (v === 'C' || v === 'K') { if (!(noCam && cat === 'camera') && P.cotsOut(S, cat)) P.add(S, cat, cat + v, n, h); return; }
        // what was on the shelves when the career starts; the well-worn parts are a generation older
        const g = (S.vendorPlan || []).filter(r => r.cat === cat && r.v === v && r.idx < 0).length, pr = P.prodAt(S, cat, v, Math.max(1, h < 0.7 ? g - 1 : g));
        if (g >= 1 && pr) P.add(S, cat, pr.id, n, h);
      });
    } else (D.START_PARTS[S.profile] || []).forEach(([cat, v, n, h]) => { if (cat !== 'wcd') P.add(S, cat, v === 'C' || v === 'K' ? cat + v : cat + v + 1, n, h); });
    S.elem = {}; S.elemPre = {}; S.elemKop = {}; S.vendorPref = null; S.partsV = 293; S.partsK = 1;
    if (P.loyalOn(S)) {
      // the vendor whose parts are on the starting shelf already knows the team
      const cnt = { A: 0, B: 0 }; D.ELEC_CATS.forEach(cat => P.items(S, cat).forEach(it => { const v = PROD[it.p].v; if (cnt[v] != null) cnt[v]++; }));
      const fav = cnt.A > cnt.B ? 'A' : cnt.B > cnt.A ? 'B' : null;
      S.loyal = { A: { pts: 0, lvl: 0 }, B: { pts: 0, lvl: 0 } };
      if (fav) S.loyal[fav].pts = D.LOYALTY.start[S.profile] || 0;
    }
    if (!S.cal) P.planReleases(S, rng);
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
  // v2.9.3: new shelves (drive sets, gripper kits, GridTube); the drive sets get their place in the launch plan; a robot
  // that already has a West Coast drive receives the sets it now runs on.
  function migrate293(S) {
    D.PART_CATS.forEach(c => { if (!S.inv[c.id]) S.inv[c.id] = []; });
    if (!S.cal || S.partsV >= 293) { S.partsV = 293; return; }
    S.partsV = 293;
    if (S.vendorPlan && !S.vendorPlan.some(r => r.cat === 'wcd')) {
      const cal = S.cal, first = cal[0];
      ['A', 'B'].forEach(v => D.LADDER.wcd[v].forEach((L, i) => {
        const idx = L.y <= first ? -1 : cal.findIndex(c => c >= L.y);
        if (L.y > first && idx < 0) return;
        const same = S.vendorPlan.find(r => r.v === v && r.idx === idx && r.idx >= 0); // join that vendor's launch that autumn
        S.vendorPlan.push({ idx, cat: 'wcd', v, n: i + 1, mo: idx < 0 ? 0 : same ? same.mo : 5 });
      }));
      S.vendorPlan.sort((a, b) => a.idx - b.idx || a.mo - b.mo);
    }
    const R = S.robot;
    if (R && R.bots) {
      const west = id => id === 'wcd' || id === 'wcd8';
      let n = R.bots.filter(b => b.subs.drive && b.subs.drive.ver && west(b.subs.drive.concept)).length;
      if (S.projects.some(p => (p.type === 'build' || p.type === 'copy' || p.type === 'testChassis') && (p.sub === 'drive' || p.type === 'testChassis') && west(p.concept))) n++;
      const pr = P.cur(S, 'wcd', 'B') || P.cur(S, 'wcd', 'A');
      if (n && pr) P.add(S, 'wcd', pr.id, 2 * n, 0.8);
    }
  }
  // v2.9.3: the kit drivetrain has its own shelf, because it only fits the kit chassis. Kit gearboxes move there. If a
  // mecanum, tread or old West Coast drive was running on them, enough become Drive gearboxes to keep it running.
  function migrateKitDrive(S) {
    if (S.partsK) return;
    S.partsK = 1;
    const gb = S.inv.gearbox || [], kit = gb.filter(it => it.p === 'gearboxK');
    if (!kit.length) return;
    S.inv.gearbox = gb.filter(it => it.p !== 'gearboxK');
    S.inv.kdrive = (S.inv.kdrive || []).concat(kit.map(it => Object.assign(it, { p: 'kdriveK' })));
    const n = P.need(S), want = (n.comp.gearbox || 0) + (n.prac.gearbox || 0), spare = () => S.inv.kdrive.length - ((n.comp.kdrive || 0) + (n.prac.kdrive || 0));
    while (S.inv.gearbox.length < want && spare() > 0) { const it = S.inv.kdrive.sort((a, b) => a.h - b.h).pop(); it.p = 'gearboxC'; S.inv.gearbox.push(it); }
    S.wearTick = (S.wearTick || 0) + 1;
  }
  P.migrate = function (S) {
    if (S && S.inv) { fixElemSizes(S); migrateLaunches(S); migrate293(S); migrateKitDrive(S); return; }
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
