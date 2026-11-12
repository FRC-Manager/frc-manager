'use strict';
/* FRC Manager — the World page's map and season scouting table (v3.0 careers), and the sortable scouting table at events */
(function () {
  const U = G.U, D = G.Data, h = U.esc, UI = G.UI;

  // ---------- colours ----------
  // Team strength: one blue ramp, light (weaker) to dark (stronger), stepped for the dark page. Events are violet
  // diamonds, your team and your events gold.
  const RAMP = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95'], RAMP_AT = [35, 41, 47, 53, 59, 65];
  const rgb = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  UI.strColor = function (s) {
    if (s <= RAMP_AT[0]) return RAMP[0];
    if (s >= RAMP_AT[5]) return RAMP[5];
    let i = 1; while (s > RAMP_AT[i]) i++;
    const f = (s - RAMP_AT[i - 1]) / (RAMP_AT[i] - RAMP_AT[i - 1]), a = rgb(RAMP[i - 1]), b = rgb(RAMP[i]);
    return '#' + a.map((v, j) => Math.round(v + (b[j] - v) * f).toString(16).padStart(2, '0')).join('');
  };
  const inkOn = c => { const x = rgb(c); return 0.299 * x[0] + 0.587 * x[1] + 0.114 * x[2] > 140 ? '#0b0b0b' : '#ffffff'; };
  const EV_COL = '#9085e9', ME_COL = '#f5b800', LAND = '#1d242c', WATER = '#0b141c', EDGE = '#34404c';
  const f1 = v => (v == null ? '—' : v.toFixed(1));
  const iconBody = name => UI.icon(name, 24).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');

  // a sortable table header: click to sort, click again to turn the order round
  UI.sortTh = (label, key, st, act, cls, title) => '<th class="' + (cls || '') + ' srt' + (st.key === key ? ' on' : '') + '" data-act="' + act + '" data-arg="' + key + '"' + (title ? ' title="' + h(title) + '"' : '') + '>' + label + (st.key === key ? (st.dir < 0 ? ' ▼' : ' ▲') : '') + '</th>';
  // sort rows by a value; rows without one go last whatever the order
  const flab = (label, ctl) => '<label class="fl"><span>' + label + '</span>' + ctl + '</label>';
  const sortBy = (rows, val, dir) => rows.sort((a, b) => {
    const x = val(a), y = val(b);
    if (x == null || y == null) return x == null && y == null ? a.num - b.num : x == null ? 1 : -1;
    return x === y ? a.num - b.num : (x < y ? -dir : dir);
  });

  // =====================================================================
  // MAP
  // =====================================================================
  const MS = () => (UI.st.map = UI.st.map || { k: 1, cx: 500, cy: 311, show: 'both', reg: true, dist: true, cmp: true, type: 'all', smin: 0, smax: 100, wk: 'all' });
  const clampView = st => {
    st.k = U.clamp(st.k, 1, 12);
    const vw = G.Geo.W / st.k, vh = G.Geo.H / st.k;
    st.cx = U.clamp(st.cx, vw / 2, G.Geo.W - vw / 2); st.cy = U.clamp(st.cy, vh / 2, G.Geo.H - vh / 2);
  };
  // an event is yours if you registered for it, played it or were invited to it
  const mine = (S, e) => S.registered.includes(e.id) || e.teams.includes(S.team.num) || !!S.eventsDone[e.id] || (e.kind === 'dcmp' && e.dist === S.team.home && !!S.season.dcmpQualified);
  const played = (S, e) => !!S.eventsDone[e.id] || e.teams.includes(S.team.num) && e.done;
  function mapTeams(S, st) {
    const ws = S.wseason, cy = ws.cy, out = [];
    Object.values(S.teams).forEach(t => {
      if (st.type === 'district' && !t.home) return;
      if (st.type === 'regional' && t.home) return;
      if (st.type === 'rookie' && t.ry !== cy) return;
      if (st.type === 'qual' && !ws.q[t.num]) return;
      if (t.str < st.smin || t.str > st.smax) return;
      const p = G.Geo.teamPos(t.num, t.region, t.home, cy);
      out.push({ num: t.num, x: p.xy[0], y: p.xy[1], str: t.str, rookie: t.ry === cy, area: t.home ? D.DISTRICT[t.home].short + ' District' : t.region, hub: p.hub });
    });
    return out;
  }
  // group what sits close together on screen: a grid first, then neighbours that still overlap are merged
  function cluster(items, cell) {
    const bins = {};
    items.forEach(it => { const key = Math.floor(it.x / cell) + ',' + Math.floor(it.y / cell); (bins[key] = bins[key] || []).push(it); });
    let cl = Object.values(bins).map(list => ({ list, x: U.avg(list.map(i => i.x)), y: U.avg(list.map(i => i.y)) })).sort((a, b) => b.list.length - a.list.length);
    const out = [];
    cl.forEach(c => {
      const near = out.find(o => Math.hypot(o.x - c.x, o.y - c.y) < cell * 0.7);
      if (!near) { out.push(c); return; }
      const n1 = near.list.length, n2 = c.list.length;
      near.x = (near.x * n1 + c.x * n2) / (n1 + n2); near.y = (near.y * n1 + c.y * n2) / (n1 + n2); near.list = near.list.concat(c.list);
    });
    return out;
  }
  const topAreas = list => { const c = {}; list.forEach(i => { c[i.area] = (c[i.area] || 0) + 1; }); return Object.keys(c).sort((a, b) => c[b] - c[a]).slice(0, 3).map(a => a + ' ' + c[a]).join(' · '); };
  const evShort = e => e.name.replace(/ (Regional|District Event)$/, '');
  const evLine = (S, e) => {
    const me = S.team.num, nm = n => (n === me ? 'you' : n);
    return 'Week ' + e.week + ' · ' + e.name + ' · ' + e.teams.length + ' teams' +
      (e.done && e.res ? (e.res.winners && e.res.winners.length ? ' · won by ' + e.res.winners.map(nm).join(', ') : '') : ' · not played yet');
  };

  UI.worldMap = function (S) {
    const st = MS(), ws = S.wseason, cy = ws.cy, k = st.k, me = S.team.num, Geo = G.Geo;
    clampView(st);
    const vw = Geo.W / k, vh = Geo.H / k, vx = st.cx - vw / 2, vy = st.cy - vh / 2, px = v => (v / k).toFixed(2);
    const dists = G.World.districtsAt(cy), myPos = Geo.teamPos(me, S.team.region, S.team.home, cy).xy;
    // ---- filters (one row above the map)
    const opt = (v, cur, label) => '<option value="' + v + '"' + (String(cur) === String(v) ? ' selected' : '') + '>' + label + '</option>';
    let o = '<div class="row wrap wm-f mb">' +
      flab('Show', '<div class="segs">' + [['both', 'Teams and events'], ['teams', 'Teams'], ['events', 'Events']].map(x => '<button class="btn sm ' + (st.show === x[0] ? 'sel' : '') + '" data-act="wmShow" data-arg="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>') +
      flab('Layers', '<div class="segs">' + [['reg', 'Areas'], ['dist', 'Districts'], ['cmp', 'Championships']].map(x => '<button class="btn sm ' + (st[x[0]] ? 'sel' : '') + '" data-act="wmLayer" data-arg="' + x[0] + '" title="Show or hide this layer">' + x[1] + '</button>').join('') + '</div>') +
      flab('Filter by team type', '<select class="inp fsel" data-chg="wmType">' + opt('all', st.type, 'All types') + opt('district', st.type, 'District teams') + opt('regional', st.type, 'Regional teams') + opt('rookie', st.type, 'Rookies') + opt('qual', st.type, 'Championship qualified') + '</select>') +
      flab('Filter by strength', '<select class="inp fsel" data-chg="wmSmin" title="Weakest team shown">' + [0, 20, 30, 40, 50, 60, 70, 80].map(v => opt(v, st.smin, v)).join('') + '</select><span class="xs muted">to</span>' +
      '<select class="inp fsel" data-chg="wmSmax" title="Strongest team shown">' + [30, 40, 50, 60, 70, 80, 90, 100].map(v => opt(v, st.smax, v)).join('') + '</select>') +
      flab('Filter events by week', '<select class="inp fsel" data-chg="wmWeek">' + opt('all', st.wk, 'All weeks') + [1, 2, 3, 4, 5, 6, 7].map(w => opt(w, st.wk, 'Week ' + w)).join('') + opt('mine', st.wk, 'Your events') + '</select>') +
      '<span class="sp"></span><button class="btn sm" data-act="wmMe" title="Center the map on your team">' + UI.icon('star', 13) + ' Your team</button></div>';
    // ---- the map
    let svg = '<svg id="wmsvg" class="wm-svg" viewBox="' + vx.toFixed(1) + ' ' + vy.toFixed(1) + ' ' + vw.toFixed(1) + ' ' + vh.toFixed(1) + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Map of the teams and events of ' + cy + '">' +
      '<defs><clipPath id="wm-us"><path d="' + Geo.path(Geo.US) + '"/></clipPath></defs>' +
      '<rect x="-200" y="-200" width="1400" height="1100" fill="' + WATER + '"/>' +
      '<path d="' + Geo.path(Geo.CA) + '" fill="' + LAND + '" stroke="' + EDGE + '" stroke-width="1" vector-effect="non-scaling-stroke"/>' +
      '<path d="' + Geo.path(Geo.US) + '" fill="' + LAND + '" stroke="' + EDGE + '" stroke-width="1" vector-effect="non-scaling-stroke"/>';
    if (st.reg) svg += '<g clip-path="url(#wm-us)" fill="none" stroke="#4a5868" stroke-width="1.2" stroke-dasharray="5 4" vector-effect="non-scaling-stroke">' + ['West', 'Southwest', 'Midwest', 'Northeast', 'Southeast'].map(r => '<path d="' + Geo.path(Geo.REGION[r]) + '" vector-effect="non-scaling-stroke"/>').join('') + '</g>';
    if (st.dist) svg += '<g clip-path="url(#wm-us)">' + dists.map(d => '<path d="' + Geo.path(Geo.DIST[d.id]) + '" fill="' + d.color + '" fill-opacity="' + (d.id === S.team.home ? 0.2 : 0.11) + '" stroke="' + d.color + '" stroke-width="' + (d.id === S.team.home ? 2 : 1.4) + '" vector-effect="non-scaling-stroke"/>').join('') + '</g>';
    svg += Geo.WATER.map(p => '<path d="' + Geo.path(p) + '" fill="' + WATER + '" stroke="' + EDGE + '" stroke-width="1" vector-effect="non-scaling-stroke"/>').join('');
    const label = (key, text, size, fill, extra) => { const p = Geo.xy(Geo.LABEL[key][0], Geo.LABEL[key][1]); return '<text x="' + p[0].toFixed(1) + '" y="' + p[1].toFixed(1) + '" font-size="' + px(size) + '" fill="' + fill + '" text-anchor="' + (Geo.LABEL[key][2] || 'middle') + '" class="wm-lbl wm-halo" stroke-width="' + px(3) + '"' + (extra || '') + '>' + h(text) + '</text>'; };
    if (st.reg) svg += D.REGIONS.map(r => label(r, r.toUpperCase(), 13, '#6c7884', ' letter-spacing="' + px(2.5) + '"')).join('');
    // ---- the Championship cities (drawn after the teams and events, so nothing covers them)
    let champs = '';
    if (st.cmp) {
      const CH = G.Era.champs(cy), inCh = !!S.season.champsQualified, side = CH.n > 1 ? G.Era.champsSide(S.team.region) : 0;
      CH.cities.forEach((c, i) => {
        const ll = Geo.CITY[c]; if (!ll) return;
        const p = Geo.xy(ll[0], ll[1]), r = 11 / k, yours = inCh && i === side;
        champs += '<g data-tip="' + h('Championship' + (CH.n > 1 ? ' (one of two)' : '') + ' · ' + c + (yours ? '\nYour team is going' : '')) + '"><circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + r.toFixed(2) + '" fill="#2a2410" stroke="' + (yours ? ME_COL : '#f5c542') + '" stroke-width="' + (yours ? 2.5 : 1.5) + '" vector-effect="non-scaling-stroke"/>' +
          '<g transform="translate(' + (p[0] - 7 / k).toFixed(2) + ' ' + (p[1] - 7 / k).toFixed(2) + ') scale(' + (14 / 24 / k).toFixed(4) + ')" fill="none" stroke="#f5c542" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + iconBody('trophy') + '</g>' +
          '<text x="' + (p[0] + 14 / k).toFixed(1) + '" y="' + (p[1] + 4 / k).toFixed(1) + '" font-size="' + px(11) + '" fill="#f5c542" font-weight="700" class="wm-lbl wm-halo" stroke-width="' + px(3) + '">' + h('Championship · ' + c) + '</text></g>';
      });
    }
    // ---- teams: clusters sized by how many, coloured by average strength
    const cell = 40 / k, R = n => (n > 1 ? Math.min(30, 7 + 3.3 * Math.sqrt(n)) : 4.5) / k;
    if (st.show !== 'events') {
      cluster(mapTeams(S, st), cell).forEach(c => {
        const n = c.list.length, s = U.avg(c.list.map(i => i.str)), col = UI.strColor(s), r = R(n), rk = c.list.filter(i => i.rookie).length, one = c.list[0];
        const tip = n > 1 ? n + ' teams · average strength ' + Math.round(s) + (rk ? ' · ' + rk + ' rookie' + (rk > 1 ? 's' : '') : '') + '\n' + topAreas(c.list) + (k < 12 ? '\nClick to zoom in' : '')
          : 'Team ' + one.num + (one.rookie ? ' (rookie)' : '') + ' · ' + one.area + '\nStrength ' + one.str + ' · near ' + one.hub + '\nClick for its season';
        svg += '<g class="wm-hit" data-act="wmTeam" data-arg="' + (n > 1 && k < 12 ? 'z:' + c.x.toFixed(1) + ',' + c.y.toFixed(1) : 'l:' + c.list.map(i => i.num).join(',')) + '" data-tip="' + h(tip) + '">' +
          '<circle cx="' + c.x.toFixed(1) + '" cy="' + c.y.toFixed(1) + '" r="' + r.toFixed(2) + '" fill="' + col + '" stroke="rgba(255,255,255,.55)" stroke-width="1.2" vector-effect="non-scaling-stroke"/>' +
          (n > 1 ? '<text x="' + c.x.toFixed(1) + '" y="' + c.y.toFixed(1) + '" font-size="' + px(n > 99 ? 10 : 11) + '" fill="' + inkOn(col) + '" text-anchor="middle" dominant-baseline="central" font-weight="700" class="wm-lbl">' + n + '</text>' : '') + '</g>';
      });
    }
    // ---- events: violet diamonds; yours on their own, ringed in gold, with a dashed line from home
    const evs = ws.events.filter(e => (st.wk === 'all' || (st.wk === 'mine' ? mine(S, e) : e.week === Number(st.wk)))).map(e => { const p = Geo.eventPos(ws, e); return { e, x: p.xy[0] + 11 / k, y: p.xy[1] - 11 / k, hub: p.hub, mine: mine(S, e) }; });
    if (st.show !== 'teams') {
      const dia = (x, y, r) => 'M' + x.toFixed(1) + ' ' + (y - r).toFixed(2) + 'L' + (x + r).toFixed(2) + ' ' + y.toFixed(1) + 'L' + x.toFixed(1) + ' ' + (y + r).toFixed(2) + 'L' + (x - r).toFixed(2) + ' ' + y.toFixed(1) + 'Z';
      cluster(evs.filter(x => !x.mine), cell).forEach(c => {
        const n = c.list.length, r = (n > 1 ? Math.min(20, 7 + 2.6 * Math.sqrt(n)) : 6.5) / k;
        const tip = (n > 1 ? n + ' events\n' : '') + c.list.slice(0, 8).map(x => evLine(S, x.e)).join('\n') + (n > 8 ? '\n…and ' + (n - 8) + ' more' : '') + (n > 1 && k < 12 ? '\nClick to zoom in' : '');
        svg += '<g class="wm-hit" data-act="wmEvent" data-arg="' + (n > 1 && k < 12 ? 'z:' + c.x.toFixed(1) + ',' + c.y.toFixed(1) : 'l:' + c.list.map(x => x.e.id).join(',')) + '" data-tip="' + h(tip) + '"><path d="' + dia(c.x, c.y, r) + '" fill="' + EV_COL + '" stroke="#0b0b0b" stroke-width="1" vector-effect="non-scaling-stroke"/>' +
          (n > 1 ? '<text x="' + c.x.toFixed(1) + '" y="' + c.y.toFixed(1) + '" font-size="' + px(10) + '" fill="#0b0b0b" text-anchor="middle" dominant-baseline="central" font-weight="700" class="wm-lbl">' + n + '</text>' : '') + '</g>';
      });
      const my = evs.filter(x => x.mine);
      svg += my.map(x => '<line x1="' + myPos[0].toFixed(1) + '" y1="' + myPos[1].toFixed(1) + '" x2="' + x.x.toFixed(1) + '" y2="' + x.y.toFixed(1) + '" stroke="' + ME_COL + '" stroke-opacity=".75" stroke-width="1.5" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/>').join('');
      my.forEach(x => {
        const r = 8 / k, done = played(S, x.e), tip = (done ? 'You played here' : 'You are registered') + '\n' + evLine(S, x.e);
        svg += '<g class="wm-hit" data-act="wmEvent" data-arg="l:' + x.e.id + '" data-tip="' + h(tip) + '"><circle cx="' + x.x.toFixed(1) + '" cy="' + x.y.toFixed(1) + '" r="' + (r * 1.45).toFixed(2) + '" fill="none" stroke="' + ME_COL + '" stroke-width="2.2" vector-effect="non-scaling-stroke"/>' +
          '<path d="' + dia(x.x, x.y, r) + '" fill="' + (done ? ME_COL : EV_COL) + '" stroke="#0b0b0b" stroke-width="1" vector-effect="non-scaling-stroke"/>' +
          (k < 2 ? '' : '<text x="' + (x.x + r * 1.9).toFixed(1) + '" y="' + (x.y + 4 / k).toFixed(1) + '" font-size="' + px(11) + '" fill="' + ME_COL + '" font-weight="700" class="wm-lbl wm-halo" stroke-width="' + px(3) + '">' + h(evShort(x.e) + ' · W' + x.e.week) + '</text>') + '</g>';
      });
    }
    if (st.dist) svg += dists.map(d => label(d.id, d.short + ' District', 11, '#c3c2b7', ' font-weight="700"')).join(''); // district names above the circles
    svg += champs;
    // ---- your team, on top of everything
    { const x = myPos[0], y = myPos[1], r = 10 / k, pts = [];
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; pts.push((x + rr * Math.cos(a)).toFixed(2) + ' ' + (y + rr * Math.sin(a)).toFixed(2)); }
      svg += '<g data-tip="' + h('Your team: ' + me + ' ' + S.team.name + '\n' + G.Geo.areaName(S.team.region, S.team.home)) + '"><path d="M' + pts.join('L') + 'Z" fill="' + ME_COL + '" stroke="#0b0b0b" stroke-width="1.2" vector-effect="non-scaling-stroke"/>' +
        '<text x="' + (x - r * 1.1).toFixed(1) + '" y="' + (y - r * 0.5).toFixed(1) + '" font-size="' + px(12) + '" fill="' + ME_COL + '" font-weight="800" text-anchor="end" class="wm-lbl wm-halo" stroke-width="' + px(3) + '">You</text></g>'; }
    svg += '</svg>';
    const leg = '<div class="wm-leg"><div class="xs b">Team strength</div><div class="wm-grad" style="background:linear-gradient(90deg,' + RAMP.join(',') + ')"></div><div class="row xs muted"><span>' + RAMP_AT[0] + '</span><span class="sp"></span><span>50</span><span class="sp"></span><span>' + RAMP_AT[5] + '+</span></div>' +
      '<div class="xs muted">Circle size: how many teams</div><div class="wm-keys xs"><span><i class="k-ev"></i>Events</span><span><i class="k-myev"></i>Your events</span><span><i class="k-me">★</i>Your team</span>' + (st.cmp ? '<span><i class="k-cmp"></i>Championship</span>' : '') + '</div></div>';
    o += '<div class="wmap" id="wmap">' + svg + leg +
      '<div class="wm-zoom"><button class="btn sm" data-act="wmZoom" data-arg="in" title="Zoom in">+</button><button class="btn sm" data-act="wmZoom" data-arg="out" title="Zoom out">−</button><button class="btn sm" data-act="wmZoom" data-arg="reset" title="The whole map">⟲</button></div>' +
      '<div class="wm-tip" id="wmtip"></div></div>';
    o += '<div class="xs muted mt mb">Drag to move, scroll or + to zoom, click a circle to zoom in. Team strength is the world simulation\'s rating. ' + UI.q('world', 'The map') + '</div>';
    // ---- the same numbers as a table: one row per area and district
    const areas = [];
    D.REGIONS.forEach(r => areas.push({ key: 'r:' + r, name: r, kind: 'Regional teams', f: t => !t.home && t.region === r, ev: e => !e.dist && e.region === r }));
    dists.forEach(d => areas.push({ key: 'd:' + d.id, name: d.name, kind: 'District', f: t => t.home === d.id, ev: e => e.dist === d.id, d }));
    const all = Object.values(S.teams), mineA = S.team.home ? 'd:' + S.team.home : 'r:' + S.team.region;
    o += UI.card('Areas and districts ' + UI.tag(cy + '', ''), '<div style="overflow-x:auto"><table class="t tight"><tr><th>Area</th><th>Kind</th><th class="num">Teams</th><th class="num" title="Average strength (the world simulation\'s rating)">Avg strength</th><th class="num">Rookies</th><th class="num">Events</th><th class="num" title="Teams that have qualified for the Championship so far">Qualified</th></tr>' +
      areas.map(a => {
        const ts = all.filter(a.f), s = ts.length ? U.avg(ts.map(t => t.str)) : 0, col = UI.strColor(s), q = ts.filter(t => ws.q[t.num]).length + (a.key === mineA && S.season.champsQualified ? 1 : 0);
        return '<tr class="click ' + (a.key === mineA ? 'me' : '') + '" data-act="wmArea" data-arg="' + a.key + '" title="Show on the map"><td>' + (a.d ? '<i class="wm-sw" style="border-color:' + a.d.color + '"></i>' : '') + h(a.name) + '</td><td class="xs muted">' + a.kind + '</td><td class="num">' + (ts.length + (a.key === mineA ? 1 : 0)) + '</td>' +
          '<td class="num"><i class="wm-dot" style="background:' + col + '"></i> ' + Math.round(s) + '</td><td class="num">' + ts.filter(t => t.ry === cy).length + '</td><td class="num">' + ws.events.filter(a.ev).length + '</td><td class="num">' + (q || '') + '</td></tr>';
      }).join('') + '</table></div>', '', 'mb');
    return o;
  };

  // ---- map actions
  const redraw = () => { if (UI.wmRaf) return; UI.wmRaf = requestAnimationFrame(() => { UI.wmRaf = 0; UI.render(); }); };
  const zoomAt = (x, y, f) => { const st = MS(), k0 = st.k; st.k = U.clamp(k0 * f, 1, 12); st.cx = x + (st.cx - x) * k0 / st.k; st.cy = y + (st.cy - y) * k0 / st.k; clampView(st); redraw(); };
  const dragged = () => Date.now() - (UI.wmDragAt || 0) < 350;
  UI.A.wmShow = v => { MS().show = v; UI.render(); };
  UI.A.wmLayer = v => { const st = MS(); st[v] = !st[v]; UI.render(); };
  UI.A.wmType = v => { MS().type = v; UI.render(); };
  UI.A.wmSmin = v => { const st = MS(); st.smin = Number(v); if (st.smax < st.smin) st.smax = Math.min(100, st.smin + 10); UI.render(); };
  UI.A.wmSmax = v => { const st = MS(); st.smax = Number(v); if (st.smin > st.smax) st.smin = Math.max(0, st.smax - 10); UI.render(); };
  UI.A.wmWeek = v => { MS().wk = v === 'all' || v === 'mine' ? v : Number(v); UI.render(); };
  UI.A.wmZoom = a => { const st = MS(); if (a === 'reset') { st.k = 1; st.cx = 500; st.cy = 311; clampView(st); UI.render(); } else zoomAt(st.cx, st.cy, a === 'in' ? 2 : 0.5); };
  UI.A.wmMe = () => { const S = G.S, st = MS(), p = G.Geo.teamPos(S.team.num, S.team.region, S.team.home, S.wseason.cy).xy; st.k = Math.max(st.k, 4); st.cx = p[0]; st.cy = p[1]; clampView(st); UI.render(); };
  UI.A.wmArea = key => {
    const S = G.S, st = MS(), cy = S.wseason.cy, [kind, id] = key.split(':');
    const ts = Object.values(S.teams).filter(t => (kind === 'd' ? t.home === id : !t.home && t.region === id)).map(t => G.Geo.teamPos(t.num, t.region, t.home, cy).xy);
    if (!ts.length) return;
    st.cx = U.avg(ts.map(p => p[0])); st.cy = U.avg(ts.map(p => p[1])); st.k = kind === 'd' ? 3.5 : 2.2; clampView(st);
    UI.render(); const m = document.getElementById('wmap'); if (m) m.scrollIntoView({ block: 'nearest' });
  };
  UI.A.wmTeam = arg => {
    if (dragged()) return;
    const S = G.S;
    if (arg.startsWith('z:')) { const p = arg.slice(2).split(',').map(Number); return zoomAt(p[0], p[1], 2.5); }
    const nums = arg.slice(2).split(',').map(Number), rows = G.Scout.rows(S).filter(r => nums.includes(r.num)).sort((a, b) => b.str - a.str);
    UI.modal('<h2>' + (rows.length > 1 ? rows.length + ' teams here' : 'Team ' + rows[0].num) + '</h2><div class="sub">' + h(rows.length > 1 ? 'Too close together to pull apart on the map' : rows[0].area + (rows[0].rookie ? ' · rookie team' : '')) + '</div>' +
      '<table class="t tight mt"><tr><th>Team</th><th>Area</th><th class="num">Strength</th><th class="num">Events</th><th>W-L-T</th><th class="num">OPR</th><th>Best finish</th><th></th></tr>' + rows.map(r =>
        '<tr><td class="b">' + r.num + '</td><td class="xs">' + h(r.area) + '</td><td class="num">' + r.str + '</td><td class="num">' + r.ev + '</td><td>' + (r.opr == null ? '—' : r.w + '-' + r.l + '-' + r.t) + '</td><td class="num">' + f1(r.opr) + '</td><td class="xs">' + h(r.bestTxt || '—') + '</td>' +
        '<td><button class="btn sm" data-act="scFindTeam" data-arg="' + r.num + '">Scouting</button></td></tr>').join('') + '</table>' +
      '<div class="row mt"><span class="sp"></span><button class="btn" data-act="closeModal">Close</button></div>');
  };
  UI.A.wmEvent = arg => {
    if (dragged()) return;
    if (arg.startsWith('z:')) { const p = arg.slice(2).split(',').map(Number); return zoomAt(p[0], p[1], 2.5); }
    const S = G.S, ws = S.wseason, ids = arg.slice(2).split(','), me = S.team.num, nm = n => (n === me ? '<b class="acc">' + n + '</b>' : n);
    const list = ws.events.filter(e => ids.includes(e.id)).sort((a, b) => a.week - b.week);
    UI.modal('<h2>' + (list.length > 1 ? list.length + ' events here' : h(list[0].name)) + '</h2>' + list.map(e =>
      '<div class="card flat mb"' + (mine(S, e) ? ' style="border-color:' + ME_COL + '"' : '') + '><div class="row"><b>' + h(e.name) + '</b>' + (mine(S, e) ? ' ' + UI.tag(played(S, e) ? 'You played here' : 'Registered', 'acc') : '') + '<span class="sp"></span><span class="xs muted">Week ' + e.week + ' · ' + h(e.dist ? D.DISTRICT[e.dist].short + ' District' : e.region) + ' · ' + e.teams.length + ' teams</span></div>' +
        (e.done && e.res ? '<div class="sm mt">Winners: ' + (e.res.winners || []).map(nm).join(', ') + (e.res.impact ? ' · Impact Award: ' + nm(e.res.impact) : '') + '</div>' : '<div class="sm muted mt">Not played yet.</div>') + '</div>').join('') +
      '<div class="row mt"><span class="sp"></span><button class="btn" data-act="closeModal">Close</button></div>');
  };
  // dragging, wheel zoom and the hover card (installed once; they look up the map on each event)
  UI.wmBind = function () {
    const svg = document.getElementById('wmsvg'), tip = document.getElementById('wmtip'), box = document.getElementById('wmap');
    if (!svg || svg._bound) return; svg._bound = true;
    const toMap = (cx, cy) => {
      const r = svg.getBoundingClientRect(), v = svg.viewBox.baseVal, s = Math.min(r.width / v.width, r.height / v.height);
      return { x: v.x + (cx - r.left - (r.width - v.width * s) / 2) / s, y: v.y + (cy - r.top - (r.height - v.height * s) / 2) / s, s };
    };
    svg.addEventListener('wheel', e => { e.preventDefault(); const p = toMap(e.clientX, e.clientY); zoomAt(p.x, p.y, e.deltaY < 0 ? 1.5 : 1 / 1.5); }, { passive: false });
    svg.addEventListener('pointerdown', e => { if (e.button) return; const v = svg.viewBox.baseVal; UI.wmDrag = { x: e.clientX, y: e.clientY, vx: v.x, vy: v.y, s: toMap(e.clientX, e.clientY).s, moved: false }; });
    svg.addEventListener('mousemove', e => {
      const el = e.target.closest('[data-tip]');
      if (!el || (UI.wmDrag && UI.wmDrag.moved)) { tip.style.display = 'none'; return; }
      tip.innerHTML = h(el.getAttribute('data-tip')).replace(/\n/g, '<br>'); tip.style.display = 'block';
      const b = box.getBoundingClientRect(), w = tip.offsetWidth, ht = tip.offsetHeight;
      let x = e.clientX - b.left + 14, y = e.clientY - b.top + 14;
      if (x + w > b.width - 4) x = e.clientX - b.left - w - 14; if (y + ht > b.height - 4) y = e.clientY - b.top - ht - 14;
      tip.style.left = Math.max(4, x) + 'px'; tip.style.top = Math.max(4, y) + 'px';
    });
    svg.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
  };
  window.addEventListener('pointermove', e => {
    const d = UI.wmDrag, svg = document.getElementById('wmsvg'); if (!d || !svg) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    d.moved = true; const v = svg.viewBox.baseVal;
    svg.setAttribute('viewBox', (d.vx - dx / d.s).toFixed(1) + ' ' + (d.vy - dy / d.s).toFixed(1) + ' ' + v.width + ' ' + v.height);
  });
  window.addEventListener('pointerup', () => {
    const d = UI.wmDrag, svg = document.getElementById('wmsvg'); UI.wmDrag = null;
    if (!d || !d.moved || !svg) return;
    const v = svg.viewBox.baseVal, st = MS(); st.cx = v.x + v.width / 2; st.cy = v.y + v.height / 2; clampView(st);
    UI.wmDragAt = Date.now(); UI.render();
  });

  // =====================================================================
  // SEASON SCOUTING
  // =====================================================================
  const SC = () => (UI.st.sc = UI.st.sc || { area: 'mine', type: 'all', played: true, key: 'opr', dir: -1, page: 0, hi: null });
  const PAGE = 50;
  const SCOLS = { num: r => r.num, area: r => r.area, ev: r => r.ev, wl: r => r.wp, rs: r => r.rs, opr: r => r.opr, au: r => r.au, te: r => r.te, en: r => r.en, best: r => (r.ev ? -r.best : null), aw: r => r.aw };
  const ASC = ['num', 'area'];
  function scList(S) {
    const st = SC(), ws = S.wseason;
    let rows = G.Scout.rows(S);
    const myArea = S.team.home ? 'd:' + S.team.home : 'r:' + S.team.region, area = st.area === 'mine' ? myArea : st.area;
    if (area !== 'all') { const [kd, id] = area.split(':'); rows = rows.filter(r => (kd === 'd' ? r.dist === id : r.region === id)); }
    if (st.type === 'district') rows = rows.filter(r => r.dist);
    if (st.type === 'regional') rows = rows.filter(r => !r.dist);
    if (st.type === 'rookie') rows = rows.filter(r => r.rookie);
    if (st.type === 'qual') rows = rows.filter(r => r.q);
    if (st.played) rows = rows.filter(r => r.ev > 0);
    sortBy(rows, SCOLS[st.key] || SCOLS.opr, st.dir);
    return { rows, area, ws };
  }
  UI.worldScout = function (S) {
    const st = SC(), { rows, area } = scList(S), wk = G.Scout.week(S), me = S.team.num, cy = S.wseason.cy;
    const opt = (v, label) => '<option value="' + v + '"' + (st.area === v ? ' selected' : '') + '>' + h(label) + '</option>';
    let o = '<div class="row wrap wm-f mb">' +
      flab('Filter by area', '<select class="inp fsel" data-chg="scArea">' + opt('mine', 'Your ' + (S.team.home ? 'district' : 'area') + ' (' + (S.team.home ? D.DISTRICT[S.team.home].short : S.team.region) + ')') + opt('all', 'All areas') +
      '<optgroup label="Areas (every team)">' + D.REGIONS.map(r => opt('r:' + r, r)).join('') + '</optgroup><optgroup label="Districts">' + G.World.districtsAt(cy).map(d => opt('d:' + d.id, d.name)).join('') + '</optgroup></select>') +
      flab('Filter by team type', '<select class="inp fsel" data-chg="scType">' + [['all', 'All types'], ['district', 'District teams'], ['regional', 'Regional teams'], ['rookie', 'Rookies'], ['qual', 'Championship qualified']].map(x => '<option value="' + x[0] + '"' + (st.type === x[0] ? ' selected' : '') + '>' + x[1] + '</option>').join('') + '</select>') +
      '<label class="row xs" style="gap:5px"><input type="checkbox" data-chg="scPlayed"' + (st.played ? ' checked' : '') + '> Played only</label>' +
      flab('Find team', '<input class="inp fsel" type="number" min="1" max="99999" placeholder="Team #" data-chg="scFind" title="Type a team number and press Enter" style="width:96px">') +
      '<span class="sp"></span><button class="btn sm primary" data-act="scMe">' + UI.icon('star', 13) + ' Your team</button></div>';
    if (!wk) return o + '<div class="card"><p class="muted">No results yet this season. The table fills in from the first competition week, and again after every week.</p></div>';
    // where you stand in this list
    const meRow = rows.find(r => r.me), withS = rows.filter(r => r.opr != null);
    if (meRow && meRow.opr != null && withS.length > 1) {
      const place = (k, f) => 1 + withS.filter(r => f(r) > f(meRow)).length;
      o += '<div class="sc-me mb">' + UI.icon('star', 14) + ' <b>Your team in this list</b> (' + withS.length + ' teams): OPR <b>' + U.ord(place('opr', r => r.opr)) + '</b> · Auto <b>' + U.ord(place('au', r => r.au)) + '</b> · Teleop <b>' + U.ord(place('te', r => r.te)) + '</b> · Endgame <b>' + U.ord(place('en', r => r.en)) + '</b> · Win rate <b>' + U.ord(place('wp', r => r.wp)) + '</b></div>';
    } else if (!meRow) o += '<div class="xs muted mb">Your team is not in this list.</div>';
    const pages = Math.max(1, Math.ceil(rows.length / PAGE)); st.page = U.clamp(st.page, 0, pages - 1);
    const th = (l, k, cls, t) => UI.sortTh(l, k, st, 'scSort', cls, t);
    o += '<div class="card"><div class="row mb"><span class="sm"><b>' + rows.length + '</b> teams · results through week ' + wk + ', updated every week</span><span class="sp"></span>' + UI.q('world', 'Scouting') + '</div>' +
      '<div style="overflow-x:auto"><table class="t tight sc-t"><tr><th class="num" title="Place in this list, in the current order">#</th>' + th('Team', 'num') + th('Area', 'area') + th('Events', 'ev', 'num', 'Events played this season') +
      th('W-L-T', 'wl', '', 'Qualification record, sorted by win rate') + th('RS', 'rs', 'num', 'Ranking score: average ranking points per qualification match') + th('OPR', 'opr', 'num', 'Offensive power rating: points the robot adds to its alliance per match (season average, fouls left out)') +
      th('Auto', 'au', 'num', 'OPR in the autonomous period') + th('Teleop', 'te', 'num', 'OPR in the teleoperated period, endgame left out') + th('Endgame', 'en', 'num', 'OPR in the endgame (climbing, parking, balancing)') +
      th('Best finish', 'best', '', 'Best playoff finish this season') + th('Awards', 'aw', 'num', 'Judged awards this season') + '</tr>' +
      rows.slice(st.page * PAGE, st.page * PAGE + PAGE).map((r, i) => {
        const pos = st.page * PAGE + i + 1;
        return '<tr class="' + (r.me ? 'me ' : '') + (st.hi === r.num ? 'hi' : '') + '" id="sc-' + r.num + '"><td class="num muted">' + pos + '</td><td class="b nowrap">' + (r.me ? '<span class="acc">' + r.num + '</span> ' + UI.tag('you', 'acc') : r.num) + (r.rookie ? ' <span class="xs muted" title="Rookie team">R</span>' : '') + (r.q ? ' <span class="xs good" title="Qualified for the Championship">CMP</span>' : '') + '</td>' +
          '<td class="xs">' + h(r.area) + '</td><td class="num">' + r.ev + '</td><td class="nowrap">' + (r.opr == null ? '—' : r.w + '-' + r.l + '-' + r.t) + '</td><td class="num">' + (r.rs == null ? '—' : r.rs.toFixed(2)) + '</td>' +
          '<td class="num b">' + f1(r.opr) + '</td><td class="num">' + f1(r.au) + '</td><td class="num">' + f1(r.te) + '</td><td class="num">' + f1(r.en) + '</td>' +
          '<td class="xs nowrap">' + h(r.bestTxt || '—') + (r.wins > 1 ? ' ×' + r.wins : '') + '</td><td class="num">' + (r.aw || '') + '</td></tr>';
      }).join('') + '</table></div>' +
      (pages > 1 ? '<div class="row mt"><span class="sp"></span><button class="btn sm" data-act="scPage" data-arg="0"' + (st.page ? '' : ' disabled') + '>« First</button><button class="btn sm" data-act="scPage" data-arg="' + (st.page - 1) + '"' + (st.page ? '' : ' disabled') + '>‹ Previous</button>' +
        '<span class="sm">Page ' + (st.page + 1) + ' of ' + pages + '</span><button class="btn sm" data-act="scPage" data-arg="' + (st.page + 1) + '"' + (st.page < pages - 1 ? '' : ' disabled') + '>Next ›</button><button class="btn sm" data-act="scPage" data-arg="' + (pages - 1) + '"' + (st.page < pages - 1 ? '' : ' disabled') + '>Last »</button><span class="sp"></span></div>' : '') + '</div>';
    return o;
  };
  const scGo = num => {
    const S = G.S, st = SC(), list = scList(S).rows, i = list.findIndex(r => r.num === num);
    if (i < 0) return false;
    st.page = Math.floor(i / PAGE); st.hi = num; st.scroll = num; return true;
  };
  UI.A.scSort = k => { const st = SC(); if (st.key === k) st.dir = -st.dir; else { st.key = k; st.dir = ASC.includes(k) ? 1 : -1; } st.page = 0; UI.render(); };
  UI.A.scArea = v => { const st = SC(); st.area = v; st.page = 0; UI.render(); };
  UI.A.scType = v => { const st = SC(); st.type = v; st.page = 0; UI.render(); };
  UI.A.scPlayed = v => { const st = SC(); st.played = !!v; st.page = 0; UI.render(); };
  UI.A.scPage = p => { SC().page = Number(p); UI.render(); };
  UI.A.scMe = () => { if (!scGo(G.S.team.num)) { const st = SC(); st.area = 'mine'; st.type = 'all'; st.played = false; scGo(G.S.team.num); } UI.render(); };
  UI.A.scFind = v => {
    const num = Number(v); if (!num) return;
    const S = G.S; if (num !== S.team.num && !S.teams[num]) return UI.toast('There is no team ' + num + ' this season.', 'bad');
    if (!scGo(num)) { const st = SC(); st.area = 'all'; st.type = 'all'; st.played = false; scGo(num); }
    UI.render();
  };
  // from the map: open the team in the scouting table
  UI.A.scFindTeam = v => { UI.closeModal(); UI.st.worldTab = 'scout'; UI.A.scFind(v); };
  // after drawing: bring a team you jumped to into view
  UI.scAfter = function () {
    const st = SC(); if (!st.scroll) return;
    const el = document.getElementById('sc-' + st.scroll); st.scroll = null;
    if (el) el.scrollIntoView({ block: 'center' });
  };

  // =====================================================================
  // EVENT SCOUTING (the Scouting tab at an event): sortable, filtered by area, with the OPR split
  // =====================================================================
  const ES = () => (UI.st.esc = UI.st.esc || { key: 'opr', dir: -1, area: 'all' });
  UI.eventScout = function (ev, ctx) {
    const S = G.S, st = ES(), me = S.team.num, opr = G.Ev.opr(ev), au = G.Ev.oprPart(ev, 'auto'), te = G.Ev.oprPart(ev, 'tele'), en = G.Ev.oprPart(ev, 'end'), rk = G.Ev.rankings(ev);
    const areaOf = n => { if (n === me) return S.team.home ? D.DISTRICT[S.team.home].short + ' District' : S.team.region; const T = S.teams[n]; return T ? (T.home && D.DISTRICT[T.home] ? D.DISTRICT[T.home].short + ' District' : T.region) : ''; };
    let rows = ev.teams.map(n => {
      const sc = G.Ev.scout(ev, n), e = sc.est || sc.cap, ob = G.Ev.obsShown(ev, n);
      return { num: n, sc, e, ob, area: areaOf(n), rank: rk.indexOf(n) + 1, opr: opr[n] || 0, au: Math.max(0, au[n] || 0), te: Math.max(0, te[n] || 0), en: Math.max(0, en[n] || 0) };
    });
    const areas = Array.from(new Set(rows.map(r => r.area))).filter(Boolean).sort();
    if (st.area !== 'all' && !areas.includes(st.area)) st.area = 'all';
    if (st.area !== 'all') rows = rows.filter(r => r.area === st.area);
    const ob = (k, d) => r => (r.ob ? (r.ob[k] == null ? d : r.ob[k]) : null);
    const V = { rank: r => r.rank, num: r => r.num, area: r => r.area, opr: r => r.opr, au: r => r.au, te: r => r.te, en: r => r.en, pts: ob('pts', 0), auto: ob('auto', 0), climb: ob('climb', 0), rel: ob('rel', 0), fouls: ob('fouls', 0), def: ob('def', 0),
      speed: r => r.e.speed, scoring: r => r.e.scoreSpd, acc: r => r.e.accuracy, erel: r => r.e.rel };
    sortBy(rows, V[st.key] || V.opr, st.dir);
    const th = (l, k, cls, t) => UI.sortTh(l, k, st, 'escSort', cls, t);
    return '<div class="row wrap wm-f mb">' + flab('Filter by area', '<select class="inp fsel" data-chg="escArea"><option value="all">All areas (' + ev.teams.length + ')</option>' + areas.map(a => '<option value="' + h(a) + '"' + (st.area === a ? ' selected' : '') + '>' + h(a) + ' (' + ev.teams.filter(n => areaOf(n) === a).length + ')</option>').join('') + '</select>') +
      '<span class="xs muted">Click a column to sort by it.</span><span class="sp"></span><button class="btn sm primary" data-act="escMe">' + UI.icon('star', 13) + ' Your team</button></div>' +
      '<div class="card"><div class="sm muted mb"><b>Observed</b> columns show what your scouts recorded in qualification matches. <b>Estimated</b> ratings (last four columns) sharpen with a Strategy mentor, Scouting Focus practice and more matches watched. ' + UI.q('events', 'Scouting credibility') + '</div><div style="overflow-x:auto"><table class="t tight sc-t"><tr>' +
      th('#', 'rank', 'num', 'Qualification rank') + th('Team', 'num') + th('Area', 'area') + '<th>Robot</th>' + th('OPR', 'opr', 'num', 'Points the robot adds to its alliance per match (fouls left out)') + th('Auto', 'au', 'num', 'OPR in the autonomous period') + th('Teleop', 'te', 'num', 'OPR in the teleoperated period, endgame left out') + th('Endgame', 'en', 'num', 'OPR in the endgame') +
      th('Pts/m', 'pts', 'num', 'Points this robot scored itself, per match') + th('Auto ok', 'auto', 'num', 'Matches where its autonomous routine ran as planned') + th('Climb', 'climb', '', 'Successful endgame climbs out of attempts, and the usual level') + th('Fault-free', 'rel', 'num', 'Matches without a breakdown, brownout, jam or comms loss (✕ = times disabled)') + th('Fouls', 'fouls', 'num', 'Fouls per match') + th('Def', 'def', 'num', 'Matches spent playing defense') +
      th('Speed', 'speed', 'num', 'Estimated') + th('Scoring', 'scoring', 'num', 'Estimated') + th('Acc', 'acc', 'num', 'Estimated') + th('Rel', 'erel', 'num', 'Estimated reliability') + '</tr>' +
      rows.map(r => {
        const nd = r.sc.noise ? '<span class="xs dim">±' + r.sc.noise + '</span>' : '';
        return '<tr class="' + (r.num === me ? 'me' : '') + '" id="esc-' + r.num + '"><td class="num muted">' + (r.rank || '') + '</td><td class="nowrap">' + ctx.tlink(r.num) + (r.num === me ? ' ' + UI.tag('you', 'acc') : '') + '</td><td class="xs">' + h(r.area) + '</td><td class="xs">' + h(r.sc.arch) + '</td>' +
          '<td class="num b">' + r.opr.toFixed(1) + '</td><td class="num">' + r.au.toFixed(1) + '</td><td class="num">' + r.te.toFixed(1) + '</td><td class="num">' + r.en.toFixed(1) + '</td>' + ctx.obsCells(ev, r.num) +
          '<td class="num">' + Math.round(r.e.speed) + '</td><td class="num">' + Math.round(r.e.scoreSpd) + nd + '</td><td class="num">' + Math.round(r.e.accuracy) + '</td><td class="num">' + Math.round(r.e.rel) + '</td></tr>';
      }).join('') + '</table></div></div>';
  };
  UI.A.escSort = k => { const st = ES(); if (st.key === k) st.dir = -st.dir; else { st.key = k; st.dir = ['rank', 'num', 'area', 'fouls'].includes(k) ? 1 : -1; } UI.render(); };
  UI.A.escArea = v => { ES().area = v; UI.render(); };
  UI.A.escMe = () => {
    const st = ES(), S = G.S; let el = document.getElementById('esc-' + S.team.num);
    if (!el && st.area !== 'all') { st.area = 'all'; UI.render(); el = document.getElementById('esc-' + S.team.num); }
    if (el) { el.scrollIntoView({ block: 'center' }); el.classList.remove('hi'); void el.offsetWidth; el.classList.add('hi'); }
  };
})();
