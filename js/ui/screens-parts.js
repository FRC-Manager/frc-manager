'use strict';
/* FRC Manager — Inventory screen (parts shop): what the robots use, the control system store (two vendors), subsystem COTS,
   game elements (with next season's preorders), spare parts and batteries */
(function () {
  const U = G.U, D = G.Data, h = U.esc, UI = G.UI, P = () => G.Parts;
  const pct = v => Math.round(v * 100) + '%';
  const vtag = v => '<span class="vtag" style="--vc:' + D.VENDORS[v].color + '">' + h(D.VENDORS[v].short) + '</span>';
  const brand = p => P().brand(p); // who made it: Sterling parts sit in Apex's slot but keep their own name and colour
  const healthBar = v => '<span class="mini">' + UI.bar(v * 100, 100, UI.colorFor(v * 100)) + '</span>';
  const stockTag = (S, id) => P().inSeason(S) ? (P().inStock(S, id) ? UI.tag('in stock', 'good') : UI.tag('sold out this week', 'bad')) : UI.tag('in stock', 'good');

  UI.S.parts = { html() {
    const S = G.S, tab = UI.st.partsTab || 'robot';
    const season = P().inSeason(S);
    let o = UI.head('Inventory', 'parts', 'Motors, control systems and mechanisms for your robots. Parts last for years but wear with use.' + (season ? ' <span class="warn">In season, parts often sell out: check back each week.</span>' : ' <span class="good">Offseason: everything is in stock. Stock up before Kickoff.</span>'), 'parts');
    const ny = P().nextYear(S);
    o += UI.tabs(tab, [['robot', 'Your robots', 'garage'], ['elec', 'Control system', 'chip'], ['cots', 'Subsystem COTS', 'gear'], ['elem', 'Game elements', 'elements']].concat(ny != null ? [['pre', 'Preorder', 'truck']] : []).concat([['sell', 'Sell', 'money'], ['spares', 'Spares & batteries', 'battery']]), 'partsTab');
    if (tab === 'robot') o += robotTab(S);
    else if (tab === 'sell') o += sellTab(S);
    else if (tab === 'pre') o += preTab(S);
    else if (tab === 'elec') o += elecTab(S);
    else if (tab === 'cots') o += cotsTab(S);
    else if (tab === 'elem') o += elemTab(S);
    else o += sparesTab(S);
    return o;
  } };
  UI.A.partsTab = t => { UI.st.partsTab = t; UI.render(); };

  // ---------- your robots: allocation, health, vendor mix ----------
  function robotTab(S) {
    const a = P().alloc(S), pr = S.robot ? P().profile(S) : null, R0 = S.robot, ci = R0 ? R0.comp || 0 : 0, pb = !!(R0 && R0.bots && (Object.keys(a.need.prac).length || D.PART_CATS.some(c => (a.prac[c.id] || []).length)));
    let o = '';
    if (pr) {
      const vs = Object.keys(pr.vendors);
      o += '<div class="grid g3 mb">' +
        '<div class="card flat"><div class="ct">' + UI.it('chip', 'Control system') + '</div>' + (vs.length ? vs.map(v => vtag(v) + ' ' + pr.vendors[v]).join(' ') : '<span class="muted">Kit parts only</span>') +
        (pr.mixed ? '<div class="warnbox mt">Mixed control systems: hardware and software projects take 10% longer, and the robot loses a little reliability and speed.</div>' : pr.kopMix ? '<div class="warnbox mt">Kit of Parts control system parts next to vendor ones: hardware and software projects take 5% longer, and the robot loses a little reliability and speed.</div>' : '<div class="xs good mt">' + UI.icon('check', 13) + ' One control system</div>') + '</div>' +
        '<div class="card flat"><div class="ct">' + UI.it('motor', 'Performance') + '</div>' + UI.stat('Motors', pr.motor * 100) + UI.stat('Sensors', pr.enc * 100) + (a.need.comp.swerve ? UI.stat('Swerve', pr.swerve * 100) : '') + (a.need.comp.wcd ? UI.stat('Drive sets', pr.wcd * 100) : '') + (a.need.comp.pgear ? UI.stat('Planetary gearboxes', pr.pgear * 100) + '<div class="xs muted">' + (pr.pgearN || 0) + ' of ' + pr.pgearM + ' mechanism motors have one: mechanisms break down less.</div>' : '') + (pr.cam != null ? UI.stat('Vision camera', pr.cam * 100) : '') + (S.cal && a.need.comp.nswitch ? '<div class="xs ' + (pr.nsw ? 'good' : 'muted') + '">' + UI.icon(pr.nsw ? 'check' : 'info', 12) + ' Network switch: ' + (pr.nsw ? 'fitted (fewer comms dropouts)' : 'none') + '</div>' : '') + (a.need.comp.accel ? '<div class="xs ' + (pr.accel ? 'good' : 'muted') + '">' + UI.icon(pr.accel ? 'check' : 'info', 12) + ' ML accelerator: ' + (pr.accel ? 'fitted (sees game pieces)' : 'none') + '</div>' : '') + '</div>' +
        '<div class="card flat"><div class="ct">' + UI.it('spare', 'Wear') + '</div>' + UI.stat('Average health', pr.health * 100, null, UI.colorFor(pr.health * 100)) + '<div class="xs muted">Worn parts barely slow the robot, but they fail more often. New parts automatically go on the competition robot.</div></div></div>';
      if (pr.short) o += '<div class="warnbox mb">The competition robot is short of ' + pr.short + ' part' + (pr.short > 1 ? 's' : '') + ' (kit parts fill in at low performance). Buy them in the Control system tab.</div>';
    } else o += '<div class="hint mb">No robot this season yet. At Kickoff you get the Kit of Parts; everything else comes from here. Every build needs motors (and more), so stock up now: in season, parts often sell out.</div>';
    // preferred control system
    o += '<div class="row wrap mb"><span class="sm muted">Competition robot uses:</span>' + [[null, 'Best parts (may mix)'], ['A', S.cal ? 'Premium first' : 'Apex first'], ['B', 'Lumen first']].map(x => '<button class="btn sm ' + ((S.vendorPref || null) === x[0] ? 'sel' : '') + '" data-act="vendorPref" data-arg="' + (x[0] || '') + '">' + h(x[1]) + '</button>').join('') + '</div>';
    // inventory table
    o += '<table class="t"><tr><th>Part</th><th class="num">On shelf</th><th class="num">' + (R0 ? h(R0.bots[ci].name) + ' (competes)' : 'Competition') + '</th>' + (pb ? '<th class="num">' + h(R0.bots[1 - ci].name) + '</th>' : '') + '<th>Health</th><th>Mix</th></tr>' + D.PART_CATS.map(c => {
      const list = P().items(S, c.id); if (!list.length && !(a.need.comp[c.id])) return '';
      const nc = c.kit ? (a.comp[c.id] || []).length : (a.need.comp[c.id] || 0), np = c.kit ? (a.prac[c.id] || []).length : (a.need.prac[c.id] || 0);
      const hAvg = list.length ? U.avg(list.map(x => x.h)) : 1;
      const mix = {}; list.forEach(x => { const p = P().prod(x.p); const k = p.v === 'C' ? p.name : p.name; mix[k] = (mix[k] || 0) + 1; });
      const short = !c.kit && !c.opt && nc > list.length;
      return '<tr><td>' + UI.it(c.icon, h(c.short)) + '</td><td class="num">' + list.length + '<span class="dim">/' + c.max + '</span></td><td class="num ' + (short ? 'bad' : '') + '">' + (c.kit ? (nc ? nc + ' built in' : '—') : nc || '—') + '</td>' + (pb ? '<td class="num">' + (np || '—') + '</td>' : '') +
        '<td>' + (list.length ? healthBar(hAvg) + ' <span class="xs muted">' + pct(hAvg) + '</span>' : '') + '</td><td class="xs muted">' + Object.keys(mix).map(k => mix[k] + '× ' + h(k)).join(', ') + '</td></tr>';
    }).join('') + '</table>';
    // per-subsystem bill of materials
    if (S.robot) {
      const R = S.robot, year = R.year;
      const rows = G.Seasons[year].subs.filter(sd => sd.id !== 'soft' && R.subs[sd.id].ver).map(sd => {
        const s = R.subs[sd.id], c = G.Seasons.concept(year, sd.id, s.concept), b = P().shownBom(S, 'comp', sd.id, P().bom(year, sd.id, c));
        return '<div class="row sm"><span class="b">' + h(sd.name) + '</span><span class="muted">' + h(c.name) + '</span><span class="sp"></span>' + Object.keys(b).map(k => b[k] + ' ' + h(D.PART_CAT[k].short.toLowerCase())).join(' · ') + (s.kits ? ' ' + Object.keys(s.kits).map(k => UI.tag(s.kits[k] + ' ' + D.PART_CAT[k].short.toLowerCase().replace(/s$/, s.kits[k] > 1 ? 's' : ''), 'info')).join(' ') : '') + '</div>';
      });
      if (rows.length) o += '<div class="mt">' + UI.card(UI.it('garage', 'What each subsystem uses'), rows.join('') + '<div class="xs muted mt">Plus one control hub per robot' + (R.visionLvl ? ' and ' + R.visionLvl + ' camera' + (R.visionLvl > 1 ? 's' : '') : '') + '. A second robot needs its own control system.</div>') + '</div>';
    }
    return o;
  }
  UI.A.vendorPref = v => { G.S.vendorPref = v || null; UI.render(); };

  // ---------- selling parts ----------
  // Each part is a chip: its condition and resale value. Parts above 60% the robots don't need can be sold.
  function sellTab(S) {
    let o = '<div class="hint mb">' + UI.icon('money', 14) + ' Sell parts you no longer need: about ' + Math.round(D.RESALE * 100) + '% of today\'s list price at full condition, less as they wear and once something newer is on sale. Above ' + Math.round(D.SELL_MIN * 100) + '% condition only. ' + UI.q('parts', 'Selling parts') + '</div>';
    let any = false;
    D.PART_CATS.forEach(c => {
      const list = P().items(S, c.id).filter(it => P().prod(it.p) && P().prod(it.p).price && P().prod(it.p).v !== 'K');
      if (!list.length) return;
      any = true;
      const groups = {};
      list.forEach(it => { (groups[it.p] = groups[it.p] || []).push(it); });
      const room = P().sellRoom(S, c.id);
      o += '<div class="card mb"><div class="ct">' + UI.it(c.icon, h(c.short)) + '<span class="sp"></span><span class="xs muted">' + list.length + ' owned · ' + (room ? 'up to ' + room + ' can go' : 'all in use by your robots') + '</span></div>' +
        Object.keys(groups).map(pid => {
          const pr = P().prod(pid), its = groups[pid].slice().sort((a, b) => b.h - a.h);
          const sellable = its.filter(it => !P().sellBlock(S, c.id, it)).sort((a, b) => a.h - b.h).slice(0, room); // most worn go first
          const total = sellable.reduce((t, it) => t + P().resale(S, it), 0);
          const used = P().usedWhy(S, pr), uk = used.reduce((t, x) => t * x.k, 1);
          return '<div class="sellrow"><div class="row sm"><b>' + h(pr.name) + '</b>' + (pr.v === 'A' || pr.v === 'B' ? vtag(brand(pr)) : '') + (used.length ? '<span class="tag warn" title="' + h(used.map(x => x.why + ' (×' + x.k.toFixed(2) + ')').join('; ')) + '">second-hand −' + Math.round((1 - uk) * 100) + '%</span><span class="xs muted">' + h(used.map(x => x.why).join('; ')) + '</span>' : '') + '<span class="sp"></span>' +
            (sellable.length > 1 ? '<button class="btn sm" data-act="sellAll" data-arg="' + c.id + '|' + pid + '">Sell all ' + sellable.length + ' · +' + U.money(total) + '</button>' : '') + '</div>' +
            '<div class="row wrap gap4 mt">' + its.map(it => {
              const why = P().sellBlock(S, c.id, it), v = P().resale(S, it);
              return '<button class="pchip" data-act="sellPart" data-arg="' + c.id + '|' + it.id + '" ' + (why ? 'disabled title="' + h(why) + '"' : 'title="Sell for ' + U.money(v) + '"') + '><i style="background:' + UI.colorFor(it.h * 100) + '"></i>' + Math.round(it.h * 100) + '%' + (why ? '' : ' · ' + U.money(v)) + '</button>';
            }).join('') + '</div></div>';
        }).join('') + '</div>';
    });
    if (!any) o += '<p class="muted">Nothing to sell: Kit of Parts items can\'t be resold.</p>';
    return o;
  }
  UI.A.sellPart = arg => {
    const [cat, id] = arg.split('|'), r = G.Parts.sell(G.S, cat, id);
    if (typeof r === 'string') return UI.err(r);
    UI.toast('Sold ' + r.name + ' for ' + U.money(r.amount), 'good'); UI.render();
  };
  UI.A.sellAll = arg => {
    const [cat, pid] = arg.split('|'), S = G.S;
    const its = G.Parts.items(S, cat).filter(it => it.p === pid && !G.Parts.sellBlock(S, cat, it));
    UI.confirm('Sell ' + its.length + '× ' + G.Parts.prod(pid).name + '?', 'You get ' + U.money(its.reduce((t, it) => t + G.Parts.resale(S, it), 0)) + '. Parts your robots need are kept.', 'Sell', () => {
      let got = 0, n = 0;
      G.Parts.items(S, cat).filter(it => it.p === pid).sort((a, b) => a.h - b.h).forEach(it => { const r = G.Parts.sell(S, cat, it.id); if (r && typeof r === 'object') { got += r.amount; n++; } });
      UI.toast('Sold ' + n + ' for ' + U.money(got), 'good'); UI.render();
    });
  };

  // ---------- electronics store ----------
  function prodCard(S, x) {
    const p = x.prod, owned = P().items(S, p.cat).filter(i => i.p === p.id).length, price = P().price(S, p), ok = P().inStock(S, p.id) || !P().inSeason(S);
    const qty = p.cat === 'motor' || p.cat === 'pgear' ? [1, 4, 8] : p.cat === 'swerve' ? [1, 4] : p.cat === 'enc' ? [1, 4] : p.cat === 'gearbox' || p.cat === 'wcd' || p.cat === 'kdrive' ? [1, 2] : [1];
    const bv = brand(p);
    return '<div class="pcard ' + (x.ending ? 'old' : '') + '" style="--vc:' + D.VENDORS[bv].color + '"><div class="row wrap gap4"><b>' + h(p.name) + '</b>' + (p.kind ? '<span class="xs muted">' + p.kind + '</span>' : '') + (x.isNew ? UI.tag('NEW', 'acc') : '') + (x.ending ? UI.tag('last year on sale', 'warn') : '') + (x.closing ? UI.tag('discontinued: last stock', 'warn') : '') + (x.clear ? UI.tag('closing sale −' + Math.round((1 - G.Era.CLEAR_PRICE) * 100) + '%', 'warn') : '') + (P().saleFor(S, p) ? UI.tag('loyalty −' + Math.round(P().saleFor(S, p) * 100) + '%', 'good') : '') + '<span class="sp"></span>' + vtag(bv) + '</div>' +
      '<div class="statrow"><span class="n">Performance</span>' + UI.bar(p.perf * 100, 100, D.VENDORS[bv].color) + '<span class="v">' + Math.round(p.perf * 100) + '</span></div>' +
      '<div class="row sm wrap"><span class="b">' + U.money(price) + '</span><span class="muted">each · owned ' + owned + '</span><span class="sp"></span>' + (p.v === 'K' ? UI.tag('always in stock', 'good') : stockTag(S, p.id)) + '</div>' +
      '<div class="row wrap gap4 mt">' + qty.map(n => '<button class="btn sm" data-act="buyProd" data-arg="' + p.id + '|' + n + '" ' + (ok ? '' : 'disabled') + '>+' + n + ' · ' + U.money(n * price) + '</button>').join('') + '</div></div>';
  }
  // a vendor's loyalty level with the team, and what it currently gives
  function loyalBox(S, slot) {
    const y = P().loyal(S, slot), sh = P().vendorShare(S)[slot];
    return '<div class="mt" style="border-top:1px solid var(--line);padding-top:8px">' + UI.loyaltyBar(S, slot) +
      '<div class="xs muted mt">Points per season. On your competition robot now: <b>' + pct(sh) + '</b> of the control system (' + Math.round(D.LOYALTY.robot * Math.min(1, sh / D.LOYALTY.full)) + ' of ' + D.LOYALTY.robot + '; ' + pct(D.LOYALTY.full) + ' counts in full). Ordered since the last review: <b>' + U.money((S.vendBought || {})[slot] || 0) + '</b> of ' + U.money(D.LOYALTY.buyFull) + ' (' + Math.round(D.LOYALTY.buy * Math.min(1, ((S.vendBought || {})[slot] || 0) / D.LOYALTY.buyFull)) + ' of ' + D.LOYALTY.buy + ').' + (y.stock ? ' Your orders ship first: +' + pct(y.stock) + ' in-season stock.' : '') + '</div>' +
      (y.voucher ? '<div class="sm good mt">' + UI.icon('money', 14) + ' Voucher: <b>' + U.money(y.voucher.amt) + '</b> left, good through the ' + (S.cal[y.voucher.until] || '') + ' season. It pays first.</div>' : '') +
      (y.sale ? '<div class="sm good mt">' + UI.icon('bolt', 14) + ' Loyalty sale: <b>−' + pct(y.sale) + '</b> on everything until Kickoff.</div>' : '') +
      ((S.loyalShip || []).some(x => x.slot === slot) ? '<div class="sm good mt">' + UI.icon('box', 14) + ' Free parts arrive at Kickoff.</div>' : '') + '</div>';
  }
  function elecTab(S) {
    const sale = P().forSale(S);
    // the premium column: Sterling Motion until it closes in 2019 (then a short gap), Apex Motion from the autumn after
    const prem = P().premium(S), closed = S.cal && !prem, slotV = v => (v === 'A' ? (prem || 'T') : v);
    let o = '<div class="grid g3 vcols vhead mb">' + ['A', 'B', 'K'].map(v => { const V = D.VENDORS[slotV(v)], gone = v === 'A' && closed; return '<div class="card flat vendor" style="--vc:' + V.color + (gone ? ';opacity:.6' : '') + '"><div class="row">' + UI.icon('bolt', 20) + '<b class="lg">' + h(V.name) + '</b>' + UI.tag(gone ? 'Closed' : V.tag, gone ? 'bad' : '') + (v === 'A' && P().clearance(S) ? UI.tag('closing sale', 'warn') : '') + '</div><div class="sm muted">' + h(gone ? 'Sterling Motion closed in 2019. The parts you own keep working. There is no premium vendor at the moment.' : V.desc) + '</div>' + (v !== 'K' && !gone && P().loyalOn(S) ? loyalBox(S, v) : '') + '</div>'; }).join('') + '</div>';
    o += '<div class="hint mb">' + UI.icon('info', 14) + ' Pick one control system if you can: mixing vendors costs project hours and a little performance. <b>Kit of Parts</b> control system parts are cheap and never sell out, but much slower. ' + UI.q('parts', 'Two control system vendors') + '</div>';
    // one column per vendor (Apex | Lumen | Kit of Parts), lined up under the vendor cards; newest version first
    D.ELEC_CATS.filter(cat => !(S.cal && D.PART_CAT[cat].group === 'drive')).forEach(cat => {
      const c = D.PART_CAT[cat];
      o += '<h2 class="sect">' + UI.it(c.icon, h(c.name)) + ' <span class="xs muted">' + h(c.desc) + ' · you have ' + P().count(S, cat) + '/' + c.max + '</span></h2>';
      o += '<div class="grid g3 vcols">' + ['A', 'B', 'K'].map(v => {
        const list = sale.filter(x => x.prod.cat === cat && x.prod.v === v).sort((a, b) => (a.ending ? 1 : 0) - (b.ending ? 1 : 0));
        const none = cat === 'swerve' && v !== 'K' && S.cal && !sale.some(x => x.prod.cat === 'swerve') ? (v === 'A' ? 'Nobody sells swerve modules yet. A swerve drive means machining your own: a CNC Router or a Lathe, extra hours, and less reliability.' : '') : v === 'A' && closed ? 'Sterling Motion has closed.' : 'No ' + h(D.VENDORS[slotV(v)].name) + ' version of this part' + (S.cal && v !== 'K' ? ' yet.' : '.');
        return '<div class="col">' + (list.length ? list.map(x => prodCard(S, x)).join('') : none ? '<div class="pcard empty xs muted">' + none + '</div>' : '') + '</div>';
      }).join('') + '</div>';
    });
    // Planetary gearboxes for mechanisms: both vendors from the 2017 season (Apex from 2020), the KOP low-profile one too
    if (S.cal) {
      const c = D.PART_CAT.pgear, any = sale.some(x => x.prod.cat === 'pgear');
      o += '<h2 class="sect">' + UI.it('gear', h(c.short)) + ' <span class="xs muted">one per mechanism motor, optional: mechanisms break down less · not part of the control system, so brands mix freely · you have ' + P().count(S, 'pgear') + '/' + c.max + '</span></h2>';
      o += '<div class="grid g3 vcols">' + ['A', 'B', 'K'].map(v => {
        const list = sale.filter(x => x.prod.cat === 'pgear' && x.prod.v === v).sort((a, b) => (a.ending ? 1 : 0) - (b.ending ? 1 : 0));
        const note = !any ? (v === 'A' ? 'Nobody sells a planetary gearbox yet: mechanisms run on the gearboxes teams make themselves.' : '') : v === 'K' ? '' : v === 'A' && closed ? 'Sterling Motion has closed.' : list.length ? '' : 'No ' + h(D.VENDORS[slotV(v)].name) + ' gearbox.';
        return '<div class="col">' + list.map(x => prodCard(S, x)).join('') + (v === 'K' && list.length ? '<div class="pcard empty xs muted">Fits KOP motors only.</div>' : '') + (note ? '<div class="pcard empty xs muted">' + note + '</div>' : '') + '</div>';
      }).join('') + '</div>';
    }
    // Drivetrain: what the vendors sell to drive on. West Coast drive sets first (the standard before swerve), then
    // swerve modules once somebody makes them.
    if (S.cal) {
      const swOut = sale.some(x => x.prod.cat === 'swerve');
      o += '<h2 class="sect">' + UI.it('swerve', 'Drivetrain') + ' <span class="xs muted">West Coast drive sets (2 per drive), swerve modules (4 per drive) and the kit drivetrain (2 per kit chassis), motors not included · you have ' + P().count(S, 'wcd') + '/' + D.PART_CAT.wcd.max + ' drive sets, ' + P().count(S, 'swerve') + '/' + D.PART_CAT.swerve.max + ' modules, ' + P().count(S, 'kdrive') + '/' + D.PART_CAT.kdrive.max + ' kit drivetrain sets and ' + P().count(S, 'gearbox') + '/' + D.PART_CAT.gearbox.max + ' Drive gearboxes</span></h2>';
      o += '<div class="grid g3 vcols">' + ['A', 'B', 'K'].map(v => {
        const list = sale.filter(x => (D.PART_CAT[x.prod.cat].group === 'drive' || (v === 'K' && x.prod.id === 'kdriveK')) && x.prod.v === v).sort((a, b) => (a.prod.cat === 'swerve' ? 1 : 0) - (b.prod.cat === 'swerve' ? 1 : 0) || (a.ending ? 1 : 0) - (b.ending ? 1 : 0));
        const notes = [];
        if (v === 'K') notes.push('Kit chassis only, and the slowest way to drive. COTS Drive gearboxes are the step up.');
        else {
          if (!swOut && v === 'A') notes.push('Nobody sells swerve modules yet. A swerve drive means machining your own: a CNC Router or a Lathe, extra hours, and less reliability.');
          if (v === 'A' && closed) notes.push('Sterling Motion has closed.');
          else if (v === 'A' && prem === 'A') notes.push('Apex Motion makes no West Coast drive set: its drivetrain is the swerve module.');
          if (swOut && v === 'B' && !list.some(x => x.prod.cat === 'swerve')) notes.push('No Lumen swerve module yet.');
          if (v === 'B' && P().lineEnd(S, 'wcd', 'B') === 1) notes.push('Lumen has stopped making West Coast drive sets now that it sells a swerve module. What is in stock is sold through the ' + P().buyCy(S) + ' season. After that a new West Coast drive runs on COTS Drive gearboxes, at lower performance.');
          if (v === 'B' && P().lineEnd(S, 'wcd', 'B') === 2) notes.push('Lumen no longer sells West Coast drive sets: its drivetrain is the swerve module now. A West Coast drive runs on sets you already own, or on COTS Drive gearboxes at lower performance.');
        }
        return '<div class="col">' + list.map(x => prodCard(S, x)).join('') + notes.map(t => '<div class="pcard empty xs muted">' + h(t) + (/^Kit chassis only/.test(t) ? ' ' + UI.q('parts', 'What a drive runs on') : '') + '</div>').join('') + '</div>';
      }).join('') + '</div>';
    }
    return o;
  }
  UI.A.buyProd = arg => {
    const [id, n] = arg.split('|'), r = G.Parts.buy(G.S, id, Number(n));
    if (typeof r === 'string') return UI.err(r);
    UI.toast('Bought ' + ((r && r.bought) || n) + '× ' + G.Parts.prod(id).name + (r && r.voucher ? ' (voucher paid ' + U.money(r.voucher) + ')' : '') + (r && r.replaced ? ' (replaced ' + r.replaced + ' older part' + (r.replaced > 1 ? 's' : '') + (r.got ? ', sold for ' + U.money(r.got) : ', recycled') + ')' : ''), 'good');
    UI.render();
  };

  // ---------- subsystem COTS ----------
  function cotsTab(S) {
    let o = '<div class="hint mb">' + UI.icon('info', 14) + ' Gearboxes, cameras and pneumatics are used like control system parts. <b>Mechanism kits are optional:</b> a full set makes a build ' + Math.round((1 - D.KIT_HOURS) * 100) + '% faster and ' + Math.round((1 - D.KIT_COST) * 100) + '% cheaper in materials. ' + (S.cal && !P().cotsOut(S, 'kFrame') ? 'For now only elevator, shooter and turret kits exist. ' : '') + UI.q('parts', 'Mechanism kits (optional)') + '</div>';
    const onSale = P().forSale(S);
    o += '<div class="grid g3">' + D.COTS_CATS.map(cat => {
      if (S.cal && cat === 'camera') return ''; // Lanternworks sells the cameras (below)
      if (!onSale.some(x => x.prod.id === cat + 'C') && D.COTS_FROM[cat]) return ''; // the kits of 2021 are not on the shelf before they exist
      if (!onSale.some(x => x.prod.id === cat + 'C')) return '<div class="pcard empty" style="--vc:' + D.VENDORS.C.color + '"><div class="row">' + UI.icon(D.PART_CAT[cat].icon, 18) + '<b>' + h(D.PART_CAT[cat].name) + '</b><span class="sp"></span>' + UI.tag('not sold yet') + '</div><div class="xs muted">' + 'Nobody sells one yet. Vision is home-made for now: Vision Level 1 needs no camera but takes twice the hours, and Level 2 is out of reach.' + '</div></div>';
      const c = D.PART_CAT[cat], p = P().prod(cat + 'C'), price = P().price(S, p), have = P().count(S, cat), ok = P().inStock(S, p.id) || !P().inSeason(S);
      const free = c.kit ? P().kitsFree(S, cat) : null, room = P().buyRoom(S, p.id), full = room <= 0, swap = !full && have >= c.max;
      return '<div class="pcard" style="--vc:' + D.VENDORS.C.color + '"><div class="row">' + UI.icon(c.icon, 18) + '<b>' + h(c.name) + '</b><span class="sp"></span>' + stockTag(S, p.id) + '</div><div class="xs muted">' + h(c.desc) + (c.kit && Object.keys(D.KIT_FOR_AREA).some(k => D.KIT_FOR_AREA[k] === cat) ? ' Helps ' + h(Object.keys(D.KIT_FOR_AREA).filter(k => D.KIT_FOR_AREA[k] === cat).map(k => D.AREA[k].name.toLowerCase()).join(' and ')) + ' builds.' : '') + '</div>' +
        '<div class="row sm mt"><span class="b">' + U.money(price) + '</span><span class="muted">owned ' + have + '/' + c.max + (c.kit ? ' · ' + free + ' free' + (have - free > 0 ? ' · ' + (have - free) + ' in subsystems' : '') : '') + '</span><span class="sp"></span><button class="btn sm" data-act="buyProd" data-arg="' + p.id + '|1" ' + (ok && !full ? '' : 'disabled') + (swap ? ' title="The shelf is full: the most worn one is sold (or recycled if too worn) to make room"' : '') + '>' + (full ? 'Full' : swap ? 'Replace worn' : 'Buy') + '</button>' + (cat === 'kFrame' && !full && !swap ? '<button class="btn sm" data-act="buyProd" data-arg="' + p.id + '|6" ' + (ok ? '' : 'disabled') + '>+6 · ' + U.money(6 * price) + '</button>' : '') + '</div></div>';
    }).join('') + '</div>';
    // Lanternworks: the vision company (calendar careers), its own catalogue
    if (S.cal) {
      const V = D.VENDORS.L, lis = onSale.filter(x => x.prod.v === 'L');
      o += '<h2 class="mt">' + UI.it('camera', V.name) + ' ' + UI.tag(V.tag) + ' <span class="xs muted">' + h(V.desc) + '</span></h2><div class="grid g3">' +
        (lis.length ? lis.map(x => prodCard(S, x)).join('') : '<div class="pcard empty xs muted" style="--vc:' + V.color + '">Nobody sells a vision camera yet. Vision is home-made for now: Vision Level 1 needs no camera but takes twice the hours, and Level 2 is out of reach.</div>') +
        (lis.some(x => x.prod.id === 'cameraL2') && P().count(S, 'camera') && P().items(S, 'camera').some(it => it.p === 'cameraL1') ? '<div class="pcard empty xs muted">Your Lantern 1 cameras still work, but they were made for reflective tape: with AprilTags on the field they aim less well than a Lantern 2.</div>' : '') + '</div>';
    }
    // Kit of Parts: basic subsystem kits for the simplest concepts (the kit drivetrain is under Control system, Drivetrain;
    // careers from before v3.0 have no Drivetrain section, so theirs stays here)
    const vch = P().kopVch(S);
    const kopKit = x => {
      const p = x.prod, c = D.PART_CAT[p.cat], price = P().price(S, p), have = P().count(S, p.cat), free = P().kitsFree(S, p.cat), full = P().buyRoom(S, p.id) <= 0;
      return '<div class="pcard" style="--vc:' + D.VENDORS.K.color + '"><div class="row">' + UI.icon(c.icon, 18) + '<b>' + h(c.name) + '</b><span class="sp"></span>' + UI.tag('always in stock', 'good') + '</div><div class="xs muted">' + h(c.desc) + ' Helps ' + h(c.helps) + ': ' + Math.round(D.KOP_KIT_HOURS * 100) + '% fewer hours, ' + Math.round(D.KOP_KIT_COST * 100) + '% less material.</div>' +
        '<div class="row sm mt"><span class="b">' + U.money(price) + '</span><span class="muted">owned ' + have + '/' + c.max + ' · ' + free + ' free' + (have - free > 0 ? ' · ' + (have - free) + ' in subsystems' : '') + '</span><span class="sp"></span><button class="btn sm' + (vch && !full ? ' primary' : '') + '" data-act="buyProd" data-arg="' + p.id + '|1" ' + (full ? 'disabled' : '') + '>' + (full ? 'Full' : vch ? 'Get it free (voucher)' : 'Buy') + '</button></div></div>';
    };
    const kops = P().forSale(S).filter(x => x.prod.v === 'K' && !D.PART_CAT[x.prod.cat].elec);
    o += '<h2 class="mt">' + UI.it('box', 'Kit of Parts') + (vch ? ' ' + UI.tag(vch + ' KOP voucher' + (vch > 1 ? 's' : '') + ' to use', 'good') : '') + ' <span class="xs muted">basic subsystem kits: cheap, always in stock, and only for the simplest concept of a subsystem (a build that uses a COTS kit does not need one)</span></h2><div class="grid g3">' +
      kops.filter(x => D.PART_CAT[x.prod.cat].kop).map(kopKit).join('') + (S.cal ? '' : kops.filter(x => x.prod.id === 'kdriveK').map(x => prodCard(S, x)).join('')) + '</div>';
    return o;
  }

  // ---------- game elements ----------
  function elemTab(S) {
    const y = P().elemYear(S), ny = P().nextYear(S), fs = P().fieldSize(S), season = P().inSeason(S);
    let o = '<div class="hint mb">' + UI.icon('pfield', 14) + ' ' + (fs ? 'Your Practice Field (Level ' + G.Shop.lvl(S, 'pfield') + ') fits a ' + P().setName(fs).toLowerCase() + ' set of elements' : 'No Practice Field yet: the kit game pieces are all you need, so only buy sets as spares for later') + '. Bigger sets than the field add nothing, and they wear with driver practice. ' + UI.q('parts', 'Game elements') + '</div>';
    if (y != null) {
      const sets = P().elemSets(S, y), fill = P().elemFill(S, y), q = P().elemQ(S, y);
      o += UI.card(UI.it('elements', (season ? 'This season' : 'Last season') + ': ' + h(G.Career.seasonName(S, y))),
        '<div class="grid g2"><div>' + UI.stat('Field filled', fill * 100, null, UI.colorFor(fill * 100)) + UI.stat('Driver-practice quality', q * 100, null, UI.colorFor(q * 100)) +
        '<div class="row wrap gap4 mt">' + (S.elemKop && S.elemKop[y] ? '<span class="tag">Kit game pieces</span>' : '') + sets.map(e => '<span class="tag">' + P().setName(e.s) + ' set ' + pct(e.h) + '</span>').join('') + P().elemPending(S, y).map(e => '<span class="tag info">' + P().setName(e.s) + ' set · pending</span>').join('') + (sets.length ? '' : '<span class="xs muted">no sets</span>') + '</div></div>' +
        '<div class="col">' + D.ELEM_SETS.map(e => elemBtn(S, e, false, season)).join('') + '</div></div>');
    }
    if (ny != null) {
      const pend = P().elemPending(S, ny);
      o += '<div class="mt">' + UI.card(UI.it('truck', 'Next season (' + G.Career.calYear(S, ny) + ')'), '<div class="row wrap gap4">' + (pend.length ? pend.map(e => '<span class="tag info">' + P().setName(e.s) + ' set · pending</span>').join('') + '<span class="xs muted">arrives with the Kit of Parts at Kickoff</span>' : '<span class="sm muted">Nothing on order yet.</span>') + '<span class="sp"></span><button class="btn sm" data-act="partsTab" data-arg="pre">Preorder</button></div>') + '</div>';
    }
    if (y == null && ny == null) o += '<p class="muted">No game to buy elements for right now.</p>';
    return o;
  }
  // ---------- preorders: next season's game elements, delivered at Kickoff ----------
  function preTab(S) {
    const ny = P().nextYear(S);
    if (ny == null) return '<p class="muted">Preorders open after the season review.</p>';
    const pre = (S.elemPre && S.elemPre[ny]) || [];
    return UI.card(UI.it('truck', 'Preorder next season\'s field elements'), '<div class="sm muted mb">Preordered elements arrive with the Kit of Parts and never sell out; in-season orders often do. Your field: ' + (P().fieldSize(S) ? P().setName(P().fieldSize(S)).toLowerCase() + ' set' : 'none yet, the kit pieces are enough') + '. ' + UI.q('parts', 'Game elements') + '</div>' +
      '<div class="grid g2"><div class="sm">' + (pre.length ? '<div class="mb">' + UI.icon('check', 14) + ' On order (pending until Kickoff):</div><div class="row wrap gap4">' + pre.map(e => '<span class="tag info">' + P().setName(e.s) + ' set · pending</span>').join('') + '</div>' : '<span class="muted">Nothing on order yet.</span>') + '</div><div class="col">' + D.ELEM_SETS.map(e => elemBtn(S, e, true)).join('') + '</div></div>');
  }
  function elemBtn(S, e, pre, season) {
    const price = Math.round(e.price * (D.PART_PRICE_DIFF[S.diff] || 1)), ok = pre || !season || P().inStock(S, 'elem' + e.id);
    return '<div class="row sm"><span>' + h(e.name) + '</span><span class="sp"></span>' + (pre ? '' : season ? stockTag(S, 'elem' + e.id) : '') + '<button class="btn sm" data-act="buyElem" data-arg="' + e.id + '|' + (pre ? 1 : 0) + '" ' + (ok ? '' : 'disabled') + '>' + (pre ? 'Preorder' : 'Buy') + ' · ' + U.money(price) + '</button></div>';
  }
  UI.A.buyElem = arg => { const [id, pre] = arg.split('|'); if (!UI.err(G.Parts.buyElem(G.S, id, pre === '1'))) { UI.toast(pre === '1' ? 'Preordered: arrives at Kickoff' : 'Field elements bought', 'good'); UI.render(); } };

  // ---------- spares and batteries ----------
  function sparesTab(S) {
    const C = G.Career, up = C.spareUnitPrice(S, false), next = (function () { const regs = S.regionals.filter(r => S.registered.includes(r.id) && !S.eventsDone[r.id]).sort((a, b) => a.week - b.week); return regs[0] ? Object.assign({ kind: 'regional' }, regs[0]) : null; })();
    const est = next && S.robot ? C.spareEstimate(S, 'regional') : null;
    let o = UI.card(UI.it('spare', 'Spare parts ' + UI.tag(S.parts.spares + ' on hand', S.parts.spares ? '' : 'warn')),
      '<div class="sm muted mb">For repairs at home and in the pits; cleared out at each Kickoff. One spare restores about ' + D.SPARE_COND_PER_UNIT + ' condition points. ' + U.money(up) + ' each here, ' + U.money(C.spareUnitPrice(S, true)) + ' at events. ' + UI.q('parts', 'Spare parts and batteries') + '</div>' +
      '<div class="row wrap gap4">' + [2, 5, 10].map(n => '<button class="btn sm" data-act="buySpares" data-arg="' + n + '">+' + n + ' · ' + U.money(n * up) + '</button>').join('') + '</div>' +
      '<label class="row sm mt"><input type="checkbox" data-chg="autoSpares" ' + (S.autoSpares ? 'checked' : '') + '> Auto-restock</label><div class="xs muted">Every ' + (S.phase === 'off' ? 'month' : 'week') + ' it keeps enough spares for driver practice and home repairs on both robots (cash only), and before each event it buys what the event needs' + (est != null ? ' (next event: about ' + est + ', you have ' + S.parts.spares + ')' : '') + '.' + (S.lastRestock && S.lastRestock.bought ? ' Last turn: bought ' + S.lastRestock.bought + '.' : '') + (S.lastRestock && S.lastRestock.short ? ' <span class="warn">Not enough cash for all ' + S.lastRestock.want + ' last turn.</span>' : '') + '</div>');
    o += '<div class="mt">' + UI.card(UI.it('battery', 'Batteries'), UI.batteryRow(S)) + '</div>';
    return o;
  }
  UI.A.autoSpares = v => { G.S.autoSpares = !!v; UI.render(); };
})();
