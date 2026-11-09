'use strict';
/* FRC Manager — Shop screen: what the robots use, the electronics store (two vendors), mechanical COTS,
   game elements (with next season's preorders), spare parts and batteries */
(function () {
  const U = G.U, D = G.Data, h = U.esc, UI = G.UI, P = () => G.Parts;
  const pct = v => Math.round(v * 100) + '%';
  const vtag = v => '<span class="vtag" style="--vc:' + D.VENDORS[v].color + '">' + h(D.VENDORS[v].short) + '</span>';
  const healthBar = v => '<span class="mini">' + UI.bar(v * 100, 100, UI.colorFor(v * 100)) + '</span>';
  const stockTag = (S, id) => P().inSeason(S) ? (P().inStock(S, id) ? UI.tag('in stock', 'good') : UI.tag('sold out this week', 'bad')) : UI.tag('in stock', 'good');

  UI.S.parts = { html() {
    const S = G.S, tab = UI.st.partsTab || 'robot';
    const season = P().inSeason(S);
    let o = UI.head('Shop', 'parts', 'Motors, electronics and mechanisms for your robots. Parts last for years but wear with use.' + (season ? ' <span class="warn">In season, parts often sell out: check back each week.</span>' : ' <span class="good">Offseason: everything is in stock. Stock up before Kickoff.</span>'), 'parts');
    const ny = P().nextYear(S);
    o += UI.tabs(tab, [['robot', 'Your robots', 'garage'], ['elec', 'Electronics', 'chip'], ['cots', 'Mechanical COTS', 'gear'], ['elem', 'Game elements', 'elements']].concat(ny != null ? [['pre', 'Preorder', 'truck']] : []).concat([['sell', 'Sell', 'money'], ['spares', 'Spares & batteries', 'battery']]), 'partsTab');
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
        (pr.mixed ? '<div class="warnbox mt">Mixed control systems: hardware and software projects take 10% longer, and the robot loses a little reliability and speed.</div>' : pr.kopMix ? '<div class="warnbox mt">Kit of Parts electronics next to vendor ones: hardware and software projects take 5% longer, and the robot loses a little reliability and speed.</div>' : '<div class="xs good mt">' + UI.icon('check', 13) + ' One control system</div>') + '</div>' +
        '<div class="card flat"><div class="ct">' + UI.it('motor', 'Performance') + '</div>' + UI.stat('Motors', pr.motor * 100) + UI.stat('Sensors', pr.enc * 100) + (a.need.comp.swerve ? UI.stat('Swerve', pr.swerve * 100) : '') + '</div>' +
        '<div class="card flat"><div class="ct">' + UI.it('spare', 'Wear') + '</div>' + UI.stat('Average health', pr.health * 100, null, UI.colorFor(pr.health * 100)) + '<div class="xs muted">Worn parts barely slow the robot, but they fail more often. New parts automatically go on the competition robot.</div></div></div>';
      if (pr.short) o += '<div class="warnbox mb">The competition robot is short of ' + pr.short + ' part' + (pr.short > 1 ? 's' : '') + ' (kit parts fill in at low performance). Buy them in the Electronics tab.</div>';
    } else o += '<div class="hint mb">No robot this season yet. At Kickoff you get the Kit of Parts; everything else comes from here. Every build needs motors (and more), so stock up now: in season, parts often sell out.</div>';
    // preferred control system
    o += '<div class="row wrap mb"><span class="sm muted">Competition robot uses:</span>' + [[null, 'Best parts (may mix)'], ['A', 'Apex first'], ['B', 'Lumen first']].map(x => '<button class="btn sm ' + ((S.vendorPref || null) === x[0] ? 'sel' : '') + '" data-act="vendorPref" data-arg="' + (x[0] || '') + '">' + h(x[1]) + '</button>').join('') + '</div>';
    // inventory table
    o += '<table class="t"><tr><th>Part</th><th class="num">On shelf</th><th class="num">' + (R0 ? h(R0.bots[ci].name) + ' (competes)' : 'Competition') + '</th>' + (pb ? '<th class="num">' + h(R0.bots[1 - ci].name) + '</th>' : '') + '<th>Health</th><th>Mix</th></tr>' + D.PART_CATS.map(c => {
      const list = P().items(S, c.id); if (!list.length && !(a.need.comp[c.id])) return '';
      const nc = c.kit ? (a.comp[c.id] || []).length : (a.need.comp[c.id] || 0), np = c.kit ? (a.prac[c.id] || []).length : (a.need.prac[c.id] || 0);
      const hAvg = list.length ? U.avg(list.map(x => x.h)) : 1;
      const mix = {}; list.forEach(x => { const p = P().prod(x.p); const k = p.v === 'C' ? p.name : p.name; mix[k] = (mix[k] || 0) + 1; });
      const short = !c.kit && nc > list.length;
      return '<tr><td>' + UI.it(c.icon, h(c.short)) + '</td><td class="num">' + list.length + '<span class="dim">/' + c.max + '</span></td><td class="num ' + (short ? 'bad' : '') + '">' + (c.kit ? (nc ? nc + ' built in' : '—') : nc || '—') + '</td>' + (pb ? '<td class="num">' + (np || '—') + '</td>' : '') +
        '<td>' + (list.length ? healthBar(hAvg) + ' <span class="xs muted">' + pct(hAvg) + '</span>' : '') + '</td><td class="xs muted">' + Object.keys(mix).map(k => mix[k] + '× ' + h(k)).join(', ') + '</td></tr>';
    }).join('') + '</table>';
    // per-subsystem bill of materials
    if (S.robot) {
      const R = S.robot, year = R.year;
      const rows = G.Seasons[year].subs.filter(sd => sd.id !== 'soft' && R.subs[sd.id].ver).map(sd => {
        const s = R.subs[sd.id], c = G.Seasons.concept(year, sd.id, s.concept), b = P().bom(year, sd.id, c);
        return '<div class="row sm"><span class="b">' + h(sd.name) + '</span><span class="muted">' + h(c.name) + '</span><span class="sp"></span>' + Object.keys(b).map(k => b[k] + ' ' + h(D.PART_CAT[k].short.toLowerCase())).join(' · ') + (s.kits ? ' ' + Object.keys(s.kits).map(k => UI.tag(s.kits[k] + ' ' + D.PART_CAT[k].short.toLowerCase().replace(/s$/, s.kits[k] > 1 ? 's' : ''), 'info')).join(' ') : '') + '</div>';
      });
      if (rows.length) o += '<div class="mt">' + UI.card(UI.it('garage', 'What each subsystem uses'), rows.join('') + '<div class="xs muted mt">Plus one control hub per robot' + (R.visionLvl ? ' and ' + R.visionLvl + ' camera' + (R.visionLvl > 1 ? 's' : '') : '') + '. A second robot needs its own set of electronics.</div>') + '</div>';
    }
    return o;
  }
  UI.A.vendorPref = v => { G.S.vendorPref = v || null; UI.render(); };

  // ---------- selling parts ----------
  // Each part is a chip: its condition and resale value. Parts above 60% the robots don't need can be sold.
  function sellTab(S) {
    let o = '<div class="hint mb">' + UI.icon('money', 14) + ' Sell parts you no longer need for part of their price: about ' + Math.round(D.RESALE * 100) + '% of today\'s list price at full condition, less as they wear. Only parts above ' + Math.round(D.SELL_MIN * 100) + '% condition can be sold, Kit of Parts items can\'t, and you can\'t sell below what your robots need.</div>';
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
          return '<div class="sellrow"><div class="row sm"><b>' + h(pr.name) + '</b>' + (pr.v === 'A' || pr.v === 'B' ? vtag(pr.v) : '') + '<span class="sp"></span>' +
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
    const qty = p.cat === 'motor' ? [1, 4, 8] : p.cat === 'swerve' ? [1, 4] : p.cat === 'enc' ? [1, 4] : p.cat === 'gearbox' ? [1, 2] : [1];
    return '<div class="pcard ' + (x.ending ? 'old' : '') + '" style="--vc:' + D.VENDORS[p.v].color + '"><div class="row wrap gap4"><b>' + h(p.name) + '</b>' + (x.isNew ? UI.tag('NEW', 'acc') : '') + (x.ending ? UI.tag('last year on sale', 'warn') : '') + '<span class="sp"></span>' + vtag(p.v) + '</div>' +
      '<div class="statrow"><span class="n">Performance</span>' + UI.bar(p.perf * 100, 100, D.VENDORS[p.v].color) + '<span class="v">' + Math.round(p.perf * 100) + '</span></div>' +
      '<div class="row sm wrap"><span class="b">' + U.money(price) + '</span><span class="muted">each · owned ' + owned + '</span><span class="sp"></span>' + (p.v === 'K' ? UI.tag('always in stock', 'good') : stockTag(S, p.id)) + '</div>' +
      '<div class="row wrap gap4 mt">' + qty.map(n => '<button class="btn sm" data-act="buyProd" data-arg="' + p.id + '|' + n + '" ' + (ok ? '' : 'disabled') + '>+' + n + ' · ' + U.money(n * price) + '</button>').join('') + '</div></div>';
  }
  function elecTab(S) {
    const sale = P().forSale(S);
    let o = '<div class="grid g3 vcols vhead mb">' + ['A', 'B', 'K'].map(v => '<div class="card flat vendor" style="--vc:' + D.VENDORS[v].color + '"><div class="row">' + UI.icon('bolt', 20) + '<b class="lg">' + h(D.VENDORS[v].name) + '</b>' + UI.tag(D.VENDORS[v].tag) + '</div><div class="sm muted">' + h(D.VENDORS[v].desc) + '</div></div>').join('') + '</div>';
    o += '<div class="hint mb">' + UI.icon('info', 14) + ' Pick one control system if you can: mixing Apex and Lumen electronics on the competition robot costs 10% more hours on hardware and software projects and a little performance. <b>Kit of Parts</b> electronics (brushed motors, low-profile encoders, a basic hub) are very cheap and never sell out, which helps rookies and teams caught short in season, but they are much slower, and using them next to Apex or Lumen parts costs 5% more hours and a little performance. Each vendor holds a launch event every fall (September to December, before Kickoff) with at least one new product; the previous version stays on sale through the next season, and no product line goes past version III.</div>';
    // one column per vendor (Apex | Lumen | Kit of Parts), lined up under the vendor cards; newest version first
    D.ELEC_CATS.forEach(cat => {
      const c = D.PART_CAT[cat];
      o += '<h2 class="sect">' + UI.it(c.icon, h(c.name)) + ' <span class="xs muted">' + h(c.desc) + ' · you have ' + P().count(S, cat) + '/' + c.max + '</span></h2>';
      o += '<div class="grid g3 vcols">' + ['A', 'B', 'K'].map(v => {
        const list = sale.filter(x => x.prod.cat === cat && x.prod.v === v).sort((a, b) => (a.ending ? 1 : 0) - (b.ending ? 1 : 0));
        return '<div class="col">' + (list.length ? list.map(x => prodCard(S, x)).join('') : '<div class="pcard empty xs muted">No ' + h(D.VENDORS[v].name) + ' version of this part.</div>') + '</div>';
      }).join('') + '</div>';
    });
    return o;
  }
  UI.A.buyProd = arg => {
    const [id, n] = arg.split('|'), r = G.Parts.buy(G.S, id, Number(n));
    if (typeof r === 'string') return UI.err(r);
    UI.toast('Bought ' + ((r && r.bought) || n) + '× ' + G.Parts.prod(id).name + (r && r.replaced ? ' (replaced ' + r.replaced + ' worn part' + (r.replaced > 1 ? 's' : '') + ')' : ''), 'good');
    UI.render();
  };

  // ---------- mechanical COTS ----------
  function cotsTab(S) {
    let o = '<div class="hint mb">' + UI.icon('info', 14) + ' Mechanical parts come from many suppliers and always fit. Drive gearboxes, cameras and pneumatics are used like electronics. <b>Mechanism kits are optional:</b> each concept can use a set (a turret shooter: a turret kit and a shooter kit; a traversal climber: up to 4 climber kits). A full set makes the build ' + Math.round((1 - D.KIT_HOURS) * 100) + '% faster, uses ' + Math.round((1 - D.KIT_COST) * 100) + '% less material and removes first-build penalties; a partial set gives part of that. Kits stay in the subsystem they were built into (on either robot or in storage); take a stored subsystem apart in the Garage to free them. Kits wear with use, and worn kits help less (down to half). Without kits, the team fabricates its own.</div>';
    o += '<div class="grid g3">' + D.COTS_CATS.map(cat => {
      const c = D.PART_CAT[cat], p = P().prod(cat + 'C'), price = P().price(S, p), have = P().count(S, cat), ok = P().inStock(S, p.id) || !P().inSeason(S);
      const free = c.kit ? P().kitsFree(S, cat) : null, full = have >= c.max;
      return '<div class="pcard" style="--vc:' + D.VENDORS.C.color + '"><div class="row">' + UI.icon(c.icon, 18) + '<b>' + h(c.name) + '</b><span class="sp"></span>' + stockTag(S, p.id) + '</div><div class="xs muted">' + h(c.desc) + (c.kit ? ' Helps ' + h(Object.keys(D.KIT_FOR_AREA).filter(k => D.KIT_FOR_AREA[k] === cat).map(k => D.AREA[k].name.toLowerCase()).join(' and ')) + ' builds.' : '') + '</div>' +
        '<div class="row sm mt"><span class="b">' + U.money(price) + '</span><span class="muted">owned ' + have + '/' + c.max + (c.kit ? ' · ' + free + ' free' + (have - free > 0 ? ' · ' + (have - free) + ' in subsystems' : '') : '') + '</span><span class="sp"></span><button class="btn sm" data-act="buyProd" data-arg="' + p.id + '|1" ' + (ok && !full ? '' : 'disabled') + '>' + (full ? 'Full' : 'Buy') + '</button></div></div>';
    }).join('') + '</div>';
    o += '<h2 class="mt">' + UI.it('box', 'Kit of Parts') + ' <span class="xs muted">cheap, basic, always in stock</span></h2><div class="grid g3">' + P().forSale(S).filter(x => x.prod.v === 'K' && !D.PART_CAT[x.prod.cat].elec).map(x => prodCard(S, x)).join('') + '</div>';
    return o;
  }

  // ---------- game elements ----------
  function elemTab(S) {
    const y = P().elemYear(S), ny = P().nextYear(S), fs = P().fieldSize(S), season = P().inSeason(S);
    let o = '<div class="hint mb">' + UI.icon('pfield', 14) + ' ' + (fs ? 'Your Practice Field (Level ' + G.Shop.lvl(S, 'pfield') + ') fits a ' + P().setName(fs).toLowerCase() + ' set of elements' : 'No Practice Field yet: the kit game pieces are all you need, so only buy sets as spares for later') + '. Bigger sets than the field add nothing; worn sets count for less. Driver practice wears them like parts. You can store up to ' + D.ELEM_MAX + ' fields\' worth, so stocking a spare set before the season protects you from in-season shortages.</div>';
    if (y != null) {
      const sets = P().elemSets(S, y), fill = P().elemFill(S, y), q = P().elemQ(S, y);
      o += UI.card(UI.it('elements', (season ? 'This season' : 'Last season') + ': ' + y + ' ' + h(G.Seasons[y].name)),
        '<div class="grid g2"><div>' + UI.stat('Field filled', fill * 100, null, UI.colorFor(fill * 100)) + UI.stat('Driver-practice quality', q * 100, null, UI.colorFor(q * 100)) +
        '<div class="row wrap gap4 mt">' + (S.elemKop && S.elemKop[y] ? '<span class="tag">Kit game pieces</span>' : '') + sets.map(e => '<span class="tag">' + P().setName(e.s) + ' set ' + pct(e.h) + '</span>').join('') + P().elemPending(S, y).map(e => '<span class="tag info">' + P().setName(e.s) + ' set · pending</span>').join('') + (sets.length ? '' : '<span class="xs muted">no sets</span>') + '</div></div>' +
        '<div class="col">' + D.ELEM_SETS.map(e => elemBtn(S, e, false, season)).join('') + '</div></div>');
    }
    if (ny != null) {
      const pend = P().elemPending(S, ny);
      o += '<div class="mt">' + UI.card(UI.it('truck', 'Next season (' + ny + ')'), '<div class="row wrap gap4">' + (pend.length ? pend.map(e => '<span class="tag info">' + P().setName(e.s) + ' set · pending</span>').join('') + '<span class="xs muted">arrives with the Kit of Parts at Kickoff</span>' : '<span class="sm muted">Nothing on order yet.</span>') + '<span class="sp"></span><button class="btn sm" data-act="partsTab" data-arg="pre">Preorder</button></div>') + '</div>';
    }
    if (y == null && ny == null) o += '<p class="muted">No game to buy elements for right now.</p>';
    return o;
  }
  // ---------- preorders: next season's game elements, delivered at Kickoff ----------
  function preTab(S) {
    const ny = P().nextYear(S);
    if (ny == null) return '<p class="muted">Preorders open after the season review.</p>';
    const pre = (S.elemPre && S.elemPre[ny]) || [];
    return UI.card(UI.it('truck', 'Preorder next season\'s field elements'), '<div class="sm muted mb">The game is revealed at Kickoff. Preordered elements arrive with the Kit of Parts and never sell out, while in-season orders often do. Match the size to your practice field (' + (P().fieldSize(S) ? P().setName(P().fieldSize(S)).toLowerCase() + ' set now' : 'none yet: the kit pieces are enough') + '); a spare set guards against wear.</div>' +
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
      '<div class="sm muted mb">Spare parts are specific to this season\'s robot: repairs at home and in the pits use them, and they are cleared out at each Kickoff (none before your first season). One spare restores about ' + D.SPARE_COND_PER_UNIT + ' condition points. ' + U.money(up) + ' each here, ' + U.money(C.spareUnitPrice(S, true)) + ' at events.</div>' +
      '<div class="row wrap gap4">' + [2, 5, 10].map(n => '<button class="btn sm" data-act="buySpares" data-arg="' + n + '">+' + n + ' · ' + U.money(n * up) + '</button>').join('') + '</div>' +
      '<label class="row sm mt"><input type="checkbox" data-chg="autoSpares" ' + (S.autoSpares ? 'checked' : '') + '> Auto-restock</label><div class="xs muted">Every ' + (S.phase === 'off' ? 'month' : 'week') + ' it keeps enough spares for driver practice and home repairs on both robots (cash only), and before each event it buys what the event needs' + (est != null ? ' (next event: about ' + est + ', you have ' + S.parts.spares + ')' : '') + '.' + (S.lastRestock && S.lastRestock.bought ? ' Last turn: bought ' + S.lastRestock.bought + '.' : '') + (S.lastRestock && S.lastRestock.short ? ' <span class="warn">Not enough cash for all ' + S.lastRestock.want + ' last turn.</span>' : '') + '</div>');
    o += '<div class="mt">' + UI.card(UI.it('battery', 'Batteries'), UI.batteryRow(S)) + '</div>';
    return o;
  }
  UI.A.autoSpares = v => { G.S.autoSpares = !!v; UI.render(); };
})();
