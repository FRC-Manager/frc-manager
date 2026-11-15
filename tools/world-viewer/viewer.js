'use strict';
/* FRC Manager world viewer: plays a career season by season with the game's own code and keeps a picture of the world
   every year: where the teams and events are, and each area's teams, team numbers, strength and elite teams against
   the real figures they follow. A test tool: nothing is saved, and the script team plays from the Midwest. */
(function () {
  const D = G.Data, W = G.World, Geo = G.Geo, U = G.U, $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  G.Save.write = () => {}; G.Save.remove = () => {}; // a viewer never touches the player's saves
  const YEARS = G.CAL_YEARS, ZONES = Object.keys(D.NUMS);
  const V = { snaps: [], i: -1, zone: null, tab: 'areas', view: { k: 1, cx: Geo.W / 2, cy: Geo.H / 2 }, running: false, diff: 'normal' };
  const ACC = '#f5b800', GREY = '#8d97a1', EV = '#9085e9', ELITE = '#ff4f8b', LAND = '#1d242c', WATER = '#0b141c', EDGE = '#34404c';
  const zoneName = z => (D.DISTRICT[z] ? D.DISTRICT[z].name : z);
  const zoneKind = (z, cy) => (D.DISTRICT[z] ? (D.DISTRICT[z].from <= cy ? 'District' : 'Regional, district from ' + D.DISTRICT[z].from) : 'Regional');
  const sum = a => a.reduce((s, x) => s + x, 0), avg = a => (a.length ? sum(a) / a.length : 0), f1 = v => (Math.round(v * 10) / 10).toFixed(1);
  const cur = () => V.snaps[V.i] || null;
  const diffN = () => Object.assign({ n: 1 }, D.ELITE_DIFF[V.diff] || {}).n;
  const status = t => { $('status').textContent = t; };

  // ---------------- a season's picture ----------------
  function snap(S) {
    const ws = S.wseason, cy = ws.cy;
    const teams = Object.values(S.teams).map(t => { const p = Geo.posOf(S, t, cy); return { n: t.num, name: t.name, z: W.zoneOf(t, cy), s: t.str, e: !!t.elite, rk: t.ry === cy, x: p.xy[0], y: p.xy[1], hub: p.hub, q: !!ws.q[t.num] }; });
    const events = ws.events.map(e => { const p = Geo.eventPos(ws, e), ts = e.teams.map(n => S.teams[n]).filter(Boolean);
      return { name: e.name, kind: e.kind, z: e.dist || e.region, hub: p.hub, week: e.week, size: e.size, n: e.teams.length, avg: avg(ts.map(t => t.str)), star: e.str, el: ts.filter(t => t.elite).length, win: (e.res && e.res.winners) || [], x: p.xy[0], y: p.xy[1] }; });
    return { cy, game: G.Seasons[ws.gy].name, log: S.world.last || {}, teams, events, me: S.team.num };
  }
  // what the real seasons ask of a zone that year (known without playing)
  const target = (z, cy) => ({ teams: W.zoneSizes(cy)[z] || 0, mean: W.zoneMean(z, cy), elite: D.eliteTargets(cy, W.total(cy), diffN())[z] || 0, real: D.realTeams(z, cy), top100: D.TOP100[z][D.dataYear(cy)] });
  const worldTarget = cy => ({ teams: W.total(cy), mean: D.WORLD_STR, elite: sum(Object.values(D.eliteTargets(cy, W.total(cy), diffN()))), real: D.REAL_TEAMS[D.dataYear(cy)], top100: 100 });

  function run() {
    if (V.running) return;
    V.running = true; V.snaps = []; V.i = -1; V.diff = $('diff').value; render();
    const start = Number($('start').value), seed = Number($('seed').value) || 1; let last = 0, first = true;
    const step = () => {
      try {
        G.Dev.autoplay({ resume: !first, mode: 'career', start, seed, diff: V.diff, profile: 'established', region: 'Midwest', settings: { noFail: true },
          until: s => (s.history || []).length > V.snaps.length && s.wseason && s.wseason.cy !== last }); // a season has just ended (its events still stand)
      } catch (e) { console.error(e); status('Stopped: ' + e.message); V.running = false; return; }
      first = false;
      const S = G.S, fresh = S.wseason && S.wseason.cy !== last;
      if (fresh) { last = S.wseason.cy; V.snaps.push(snap(S)); V.i = V.snaps.length - 1; render(); }
      if (S.phase === 'end' || !fresh) { V.running = false; status('Done: ' + V.snaps.length + ' seasons from ' + start + ', seed ' + seed + ', ' + V.diff + '. Click a year, an area or a circle.'); render(); if (V.onDone) { const f = V.onDone; V.onDone = null; f(); } return; }
      status('Simulated ' + last + '…'); setTimeout(step, 20);
    };
    status('Simulating ' + start + '…'); setTimeout(step, 20);
  }

  // ---------------- the map ----------------
  const clamp = () => { const v = V.view; v.k = U.clamp(v.k, 1, 80); const vw = Geo.W / v.k, vh = Geo.VH / v.k; v.cx = U.clamp(v.cx, vw / 2, Geo.W - vw / 2); v.cy = vh >= Geo.H ? Geo.H / 2 : U.clamp(v.cy, vh / 2, Geo.H - vh / 2); };
  const fit = (pts, pad, kmax) => {
    if (!pts.length) return;
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), v = V.view;
    v.cx = (x0 + x1) / 2; v.cy = (y0 + y1) / 2; v.k = Math.min(Geo.W / ((x1 - x0) * (pad || 1.3) + 14), Geo.VH / ((y1 - y0) * (pad || 1.3) + 14), kmax || 30); clamp();
  };
  const VIEWS = [['World', null], ['North America', 'NA'], ['South America', 'SA'], ['Europe, Anatolia, Middle East', 'EME'], ['East Asia', 'EA'], ['Asia Pacific', 'AP']];
  const viewGroup = g => { if (!g) { V.view = { k: 1, cx: Geo.W / 2, cy: Geo.H / 2 }; clamp(); } else fit(Geo.HUBS.filter(x => D.GROUP[x.r] === g && x.n !== 'Honolulu').map(x => Geo.xy(x.lon, x.lat)), 1.15, 12); };
  function drawMap() {
    clamp();
    const sn = cur(), v = V.view, k = v.k, vw = Geo.W / k, vh = Geo.VH / k, px = n => (n / k).toFixed(2), P = Geo.path;
    const land = p => '<path d="' + P(p) + '" fill="' + LAND + '" stroke="' + EDGE + '" stroke-width="1" vector-effect="non-scaling-stroke"/>';
    let s = '<svg id="svg" viewBox="' + (v.cx - vw / 2).toFixed(1) + ' ' + (v.cy - vh / 2).toFixed(1) + ' ' + vw.toFixed(1) + ' ' + vh.toFixed(1) + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Map of the world' + (sn ? ' in ' + sn.cy : '') + '">' +
      '<defs><clipPath id="c-us"><path d="' + P(Geo.US) + '"/></clipPath><clipPath id="c-ca"><path d="' + P(Geo.CA) + '"/></clipPath></defs><rect x="-400" y="-400" width="1800" height="1500" fill="' + WATER + '"/>' +
      Object.keys(Geo.LAND).map(n => land(Geo.LAND[n])).join('') + land(Geo.CA) + land(Geo.US);
    const cy = sn ? sn.cy : Number($('start').value) || 2016;
    if (k >= 2.5) s += '<g clip-path="url(#c-us)" fill="none" stroke="#4a5868" stroke-width="1.1" stroke-dasharray="5 4">' + D.US_REGIONS.map(r => '<path d="' + P(Geo.REGION[r]) + '" vector-effect="non-scaling-stroke"/>').join('') + '</g>';
    s += W.districtsAt(cy).map(d => { const clip = Geo.DCLIP[d.id] === undefined ? 'us' : Geo.DCLIP[d.id];
      return '<g' + (clip ? ' clip-path="url(#c-' + clip + ')"' : '') + '><path d="' + P(Geo.DIST[d.id]) + '" fill="' + d.color + '" fill-opacity="' + (V.zone === d.id ? 0.25 : 0.11) + '" stroke="' + d.color + '" stroke-width="1.3" vector-effect="non-scaling-stroke"/></g>'; }).join('');
    s += Geo.WATER.map(p => '<path d="' + P(p) + '" fill="' + WATER + '" stroke="' + EDGE + '" stroke-width="1" vector-effect="non-scaling-stroke"/>').join('');
    const text = (x, y, t, size, fill, extra) => '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="' + px(size) + '" fill="' + fill + '" class="halo" stroke-width="' + px(3) + '" text-anchor="middle"' + (extra || '') + '>' + esc(t) + '</text>';
    Object.keys(Geo.LABEL).forEach(key => { const L = Geo.LABEL[key], d = D.DISTRICT[key]; if (k < (L[2] || 1) || (d && d.from > cy)) return; const p = Geo.xy(L[0], L[1]);
      s += text(p[0], p[1], d ? d.short + ' District' : key.toUpperCase(), d ? 11 : 12, d ? '#c3c2b7' : '#6c7884', d ? ' font-weight="700"' : ' letter-spacing="' + px(2) + '"'); });
    if (sn) {
      const circle = (x, y, r, fill, tip, z, label, ring) => '<g data-z="' + esc(z) + '" style="cursor:pointer"><title>' + esc(tip) + '</title><circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r.toFixed(2) + '" fill="' + fill + '" stroke="' + (ring ? ACC : 'rgba(255,255,255,.55)') + '" stroke-width="' + (ring ? 2.4 : 1.1) + '" vector-effect="non-scaling-stroke"/>' +
        (label ? '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="' + px(10.5) + '" fill="' + (label.dark ? '#0b0b0b' : '#fff') + '" text-anchor="middle" dominant-baseline="central" font-weight="700">' + label.t + '</text>' : '') + '</g>';
      const group = (key, at) => { const by = {}; sn.teams.forEach(t => { (by[key(t)] = by[key(t)] || []).push(t); });
        Object.keys(by).forEach(g => { const ts = by[g], a = avg(ts.map(t => t.s)), p = at(g, ts), n = ts.length, z = ts[0].z, el = ts.filter(t => t.e).length;
          s += circle(p[0], p[1], Math.min(26, 5 + 2.3 * Math.sqrt(n)) / k, G.UI.strColor(a), g + ': ' + n + ' teams, average strength ' + Math.round(a) + (el ? ', ' + el + ' elite' : '') + (key === hubKey ? ' (' + zoneName(z) + ')' : ''), z, { t: n, dark: a < 50 }, V.zone === z); }); };
      const hubKey = t => t.hub;
      // one circle an area, on the city most of its teams come from
      if (k < 3) group(t => zoneName(t.z), (g, ts) => { const c = {}; ts.forEach(t => { c[t.hub] = (c[t.hub] || 0) + 1; }); const hb = Geo.hub(Object.keys(c).sort((a, b) => c[b] - c[a])[0]); return hb ? Geo.xy(hb.lon, hb.lat) : [ts[0].x, ts[0].y]; });
      else if (k < 10) group(hubKey, (g, ts) => { const hb = Geo.hub(g); return hb ? Geo.xy(hb.lon, hb.lat) : [ts[0].x, ts[0].y]; }); // one a city
      else sn.teams.filter(t => !t.e).forEach(t => { s += circle(t.x, t.y, 3.4 / k, G.UI.strColor(t.s), t.n + ' ' + t.name + ' · ' + zoneName(t.z) + ' · strength ' + t.s + (t.rk ? ' · rookie' : '') + ' · near ' + t.hub, t.z, null, false); }); // every team
      sn.teams.filter(t => t.e).forEach(t => { s += '<g data-z="' + esc(t.z) + '"><title>' + esc('Elite: ' + t.n + ' ' + t.name + ' · ' + zoneName(t.z) + ' · strength ' + t.s + ' · near ' + t.hub) + '</title><circle cx="' + t.x.toFixed(1) + '" cy="' + t.y.toFixed(1) + '" r="' + (4.2 / k).toFixed(2) + '" fill="' + ELITE + '" stroke="#fff" stroke-width="1.2" vector-effect="non-scaling-stroke"/></g>'; });
      sn.events.forEach(e => { const r = (e.kind === 'dcmp' ? 7 : e.z in D.DISTRICT ? 4.5 : 6) / k, x = e.x + 9 / k, y = e.y - 9 / k;
        s += '<g><title>' + esc(e.name + ' · ' + e.hub + ' · week ' + e.week + ' · ' + e.n + ' teams' + (e.win.length ? ' · won by ' + e.win.join(', ') : '')) + '</title><path d="M' + x.toFixed(1) + ' ' + (y - r).toFixed(2) + 'L' + (x + r).toFixed(2) + ' ' + y.toFixed(1) + 'L' + x.toFixed(1) + ' ' + (y + r).toFixed(2) + 'L' + (x - r).toFixed(2) + ' ' + y.toFixed(1) + 'Z" fill="' + EV + '" fill-opacity="' + (e.z in D.DISTRICT && e.kind !== 'dcmp' ? 0.75 : 1) + '" stroke="#0b0b0b" stroke-width="1" vector-effect="non-scaling-stroke"/></g>'; });
    }
    $('map').innerHTML = s + '</svg>';
  }
  function bindMap() {
    const box = $('map'); let drag = null;
    const at = (cx, cy) => { const svg = $('svg'), r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, sc = Math.min(r.width / vb.width, r.height / vb.height); return { x: vb.x + (cx - r.left - (r.width - vb.width * sc) / 2) / sc, y: vb.y + (cy - r.top - (r.height - vb.height * sc) / 2) / sc, sc }; };
    box.addEventListener('wheel', e => { e.preventDefault(); const p = at(e.clientX, e.clientY), v = V.view, k0 = v.k; v.k = U.clamp(k0 * (e.deltaY < 0 ? 1.4 : 1 / 1.4), 1, 80); v.cx = p.x + (v.cx - p.x) * k0 / v.k; v.cy = p.y + (v.cy - p.y) * k0 / v.k; drawMap(); }, { passive: false });
    box.addEventListener('pointerdown', e => { if (e.button) return; drag = { x: e.clientX, y: e.clientY, cx: V.view.cx, cy: V.view.cy, sc: at(e.clientX, e.clientY).sc, moved: false, z: (e.target.closest('[data-z]') || {}).dataset }; });
    window.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (!drag.moved && Math.hypot(dx, dy) < 4) return; drag.moved = true; V.view.cx = drag.cx - dx / drag.sc; V.view.cy = drag.cy - dy / drag.sc; drawMap(); });
    window.addEventListener('pointerup', () => { if (!drag) return; const d = drag; drag = null; if (!d.moved && d.z && d.z.z) pick(d.z.z); });
  }
  const zoneOfName = z => ZONES.find(x => x === z) || null;
  function pick(z) { V.zone = V.zone === z ? null : zoneOfName(z); render(); }

  // ---------------- small line charts: a zone (or the world) through the decade, the game against its real target ----------------
  function line(title, real, sim, unit, zero) {
    const Wd = 300, H = 150, L = 34, R = 12, T = 22, B = 22, n = YEARS.length, all = real.concat(sim.filter(v => v != null));
    let lo = zero ? 0 : Math.min(...all), hi = Math.max(...all); if (hi - lo < 1) { hi += 1; lo -= zero ? 0 : 1; } if (!zero) { const pad = (hi - lo) * 0.15; lo -= pad; hi += pad; } else hi *= 1.12;
    const x = i => L + (Wd - L - R) * i / (n - 1), y = v => T + (H - T - B) * (1 - (v - lo) / (hi - lo)), fmt = v => (unit === 'f' ? f1(v) : Math.round(v));
    const path = (a, col, w, dash) => { let d = '', pen = false; a.forEach((v, i) => { if (v == null) { pen = false; return; } d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); pen = true; }); return '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + w + '"' + (dash ? ' stroke-dasharray="4 3"' : '') + '/>'; };
    let s = '<svg viewBox="0 0 ' + Wd + ' ' + H + '" style="width:100%;height:auto;display:block" role="img" aria-label="' + esc(title) + '"><text x="' + L + '" y="13" font-size="11.5" font-weight="700" fill="#dfe5ea">' + esc(title) + '</text>';
    [lo, (lo + hi) / 2, hi].forEach(v => { s += '<line x1="' + L + '" x2="' + (Wd - R) + '" y1="' + y(v).toFixed(1) + '" y2="' + y(v).toFixed(1) + '" stroke="rgba(255,255,255,.07)"/><text x="' + (L - 5) + '" y="' + (y(v) + 3.5).toFixed(1) + '" font-size="9.5" fill="' + GREY + '" text-anchor="end">' + fmt(v) + '</text>'; });
    YEARS.forEach((yr, i) => { if (i % 2 === 0 || i === n - 1) s += '<text x="' + x(i).toFixed(1) + '" y="' + (H - 7) + '" font-size="9.5" fill="' + GREY + '" text-anchor="middle">' + ("'" + String(yr).slice(2)) + '</text>'; });
    s += path(real, GREY, 2, true) + path(sim, ACC, 2);
    real.forEach((v, i) => { s += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="2.2" fill="' + GREY + '"><title>' + YEARS[i] + ': real target ' + fmt(v) + '</title></circle>'; });
    sim.forEach((v, i) => { if (v != null) s += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="' + (i === YEARS.indexOf((cur() || {}).cy) ? 4.5 : 2.8) + '" fill="' + ACC + '" stroke="#0b141c" stroke-width="1"><title>' + YEARS[i] + ': game ' + fmt(v) + ' (target ' + fmt(real[i]) + ')</title></circle>'; });
    return s + '</svg>';
  }
  function drawCharts() {
    const z = V.zone, tg = cy => (z ? target(z, cy) : worldTarget(cy)), snapOf = cy => V.snaps.find(s => s.cy === cy), ts = sn => (z ? sn.teams.filter(t => t.z === z) : sn.teams);
    const sim = f => YEARS.map(cy => { const sn = snapOf(cy); return sn ? f(ts(sn), sn) : null; });
    $('chart').innerHTML = '<div class="row"><b>' + esc(z ? zoneName(z) : 'The world') + ' through the decade</b><span class="sp"></span><span class="wv-leg" style="margin:0"><span><i style="background:' + ACC + '"></i>Game</span><span><i style="background:' + GREY + '"></i>Real target</span></span></div>' +
      '<div class="grid g3" style="gap:10px;margin-top:6px"><div>' + line('Teams', YEARS.map(cy => tg(cy).teams), sim(a => a.length + (z ? 0 : 1)), 'i', true) + '</div><div>' + line('Average strength', YEARS.map(cy => tg(cy).mean), sim(a => (a.length ? avg(a.map(t => t.s)) : null)), 'f', false) +
      '</div><div>' + line('Elite teams', YEARS.map(cy => tg(cy).elite), sim(a => a.filter(t => t.e).length), 'i', true) + '</div></div>' +
      '<div class="xs muted mt">Real target: the real teams scaled to the game (one in 2.2 outside the United States), the real average rating, and the area\'s share of the real top 100. After the first season the game\'s strength sits a little under its target while each new class of rookies grows up.</div>';
  }

  // ---------------- the panels ----------------
  const TABS = [['areas', 'Areas'], ['nums', 'Team numbers'], ['events', 'Events'], ['top', 'Top teams'], ['log', 'Changes']];
  function panel() {
    const sn = cur(); if (!sn) return '<div class="muted sm">No season yet.</div>';
    const cy = sn.cy, z = V.zone, inZ = t => !z || t.z === z, dot = s => '<i class="wv-dot" style="background:' + G.UI.strColor(s) + '"></i>';
    if (V.tab === 'areas') {
      const row = (key, name, kind, ts, tg, evs, cls) => { const a = avg(ts.map(t => t.s)), el = ts.filter(t => t.e).length, n = ts.length + (key ? 0 : 1);
        return '<tr class="' + cls + (key && V.zone === key ? ' on' : '') + '"' + (key ? ' data-pick="' + esc(key) + '"' : '') + ' title="' + esc(kind) + '"><td>' + esc(name) + (/from/.test(kind) ? ' <span class="dim">(' + kind.replace('Regional, district from ', 'district ') + ')</span>' : '') + '</td><td class="' + (Math.abs(n - tg.teams) > Math.max(2, tg.teams * 0.08) ? 'off' : '') + '">' + n + '</td><td class="dim">' + tg.teams + '</td><td class="dim">' + tg.real + '</td>' +
          '<td class="' + (ts.length && Math.abs(a - tg.mean) > 3 ? 'off' : '') + '">' + (ts.length ? dot(a) + f1(a) : '—') + '</td><td class="dim">' + f1(tg.mean) + '</td><td class="' + (el !== tg.elite ? 'off' : '') + '">' + el + '</td><td class="dim" title="' + f1(tg.top100) + ' real teams in the top 100">' + tg.elite + '</td>' +
          '<td>' + ts.filter(t => t.rk).length + '</td><td>' + evs.length + '</td><td>' + ts.filter(t => t.q).length + '</td></tr>'; };
      return '<div class="wv-scroll"><table class="wv"><tr><th>Area</th><th title="Teams in the game">Teams</th><th title="The real teams, scaled to the game">Target</th><th title="Real teams that played that season">Real</th><th title="Average strength in the game">Strength</th><th title="The real average rating, on the game\'s scale">Target</th>' +
        '<th title="Elite teams in the game">Elite</th><th title="The area\'s share of the real top 100, scaled to the game (hover a cell for the real count)">Target</th><th>Rookies</th><th>Events</th><th title="Qualified for the Championship">Qual.</th></tr>' +
        ZONES.map(k => row(k, zoneName(k), zoneKind(k, cy), sn.teams.filter(t => t.z === k), target(k, cy), sn.events.filter(e => e.z === k), 'click')).join('') +
        row(null, 'The world', '', sn.teams, worldTarget(cy), sn.events, 'b') + '</table></div><div class="xs muted mt">Click an area to follow it on the map, the charts and the other tabs. Orange: the game is off its target (teams by more than 8%, strength by more than 3, or a different number of elite teams).</div>';
    }
    if (V.tab === 'nums') {
      const ts = sn.teams.filter(inZ), game = new Array(12).fill(0); ts.forEach(t => { game[Math.min(11, Math.floor(t.n / 1000))]++; });
      const realH = new Array(12).fill(0); (z ? [z] : ZONES).forEach(k => D.NUMS[k][D.dataYear(cy)].forEach((v, b) => { realH[b] += v; }));
      const k = sum(game) / Math.max(1, sum(realH)), real = realH.map(v => v * k), mx = Math.max(1, ...game, ...real), Wd = 520, H = 210, L = 30, B = 26, T = 14, bw = (Wd - L - 8) / 12;
      let s = '<svg viewBox="0 0 ' + Wd + ' ' + H + '" style="width:100%;height:auto;display:block" role="img" aria-label="Team numbers by the thousand">';
      [0, 0.5, 1].forEach(q => { const y = T + (H - T - B) * (1 - q); s += '<line x1="' + L + '" x2="' + (Wd - 8) + '" y1="' + y + '" y2="' + y + '" stroke="rgba(255,255,255,.07)"/><text x="' + (L - 5) + '" y="' + (y + 3.5) + '" font-size="10" fill="' + GREY + '" text-anchor="end">' + Math.round(mx * q) + '</text>'; });
      for (let b = 0; b < 12; b++) { const x = L + b * bw, hg = (H - T - B) * game[b] / mx, hr = (H - T - B) * real[b] / mx, w = bw * 0.36;
        s += '<rect x="' + (x + bw * 0.12).toFixed(1) + '" y="' + (H - B - hg).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + hg.toFixed(1) + '" rx="2" fill="' + ACC + '"><title>' + b + 'xxx: ' + game[b] + ' teams in the game</title></rect>' +
          '<rect x="' + (x + bw * 0.12 + w + 2).toFixed(1) + '" y="' + (H - B - hr).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + hr.toFixed(1) + '" rx="2" fill="' + GREY + '"><title>' + b + 'xxx: ' + realH[b] + ' real teams (' + f1(real[b]) + ' at the game\'s scale)</title></rect>' +
          (game[b] ? '<text x="' + (x + bw * 0.12 + w / 2).toFixed(1) + '" y="' + (H - B - hg - 3).toFixed(1) + '" font-size="9.5" fill="#dfe5ea" text-anchor="middle">' + game[b] + '</text>' : '') +
          '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 9) + '" font-size="10" fill="' + GREY + '" text-anchor="middle">' + (b ? b + 'k' : '0') + '</text>'; }
      const mins = ts.map(t => t.n).sort((a, b) => a - b);
      return '<div class="row"><b>' + esc(z ? zoneName(z) : 'The world') + ' in ' + cy + ': team numbers by the thousand</b></div>' + s + '</svg><div class="wv-leg"><span><i style="background:' + ACC + '"></i>Game (' + ts.length + ' teams)</span><span><i style="background:' + GREY + '"></i>Real, at the game\'s scale (' + sum(realH) + ' real teams)</span></div>' +
        '<div class="sm mt">Lowest numbers in the game: <b>' + (mins.slice(0, 6).join(', ') || '—') + '</b>' + (z ? ' · the area\'s oldest real team: <b>' + D.NUM_MIN[z] + '</b>' : '') + '</div>';
    }
    if (V.tab === 'events') {
      const evs = sn.events.filter(e => !z || e.z === z).sort((a, b) => a.week - b.week || a.name.localeCompare(b.name));
      return '<div class="wv-scroll"><table class="wv"><tr><th>Event</th><th class="l">Area</th><th class="l">City</th><th>Wk</th><th>Teams</th><th>Size</th><th>Avg</th><th>Elite</th><th class="l">Winners</th></tr>' + evs.map(e => '<tr><td>' + esc(e.name) + '</td><td class="l dim">' + esc(zoneName(e.z)) + '</td><td class="l">' + esc(e.hub) + '</td><td>' + e.week + '</td><td>' + e.n + '</td><td class="dim">' + e.size + '</td><td>' + (e.n ? dot(e.avg) + Math.round(e.avg) : '—') + '</td><td>' + (e.el || '') + '</td><td class="l">' + (e.win.join(', ') || '—') + '</td></tr>').join('') + '</table></div>' +
        '<div class="xs muted mt">' + evs.length + ' events' + (z ? ' in ' + esc(zoneName(z)) : '') + '. Regionals outside the United States stand in the cities that really hosted one that season, about one for every two real ones.</div>';
    }
    if (V.tab === 'top') {
      const ts = sn.teams.filter(inZ).sort((a, b) => b.s - a.s).slice(0, 40);
      return '<div class="wv-scroll"><table class="wv"><tr><th>#</th><th class="l">Team</th><th class="l">Area</th><th class="l">Near</th><th>Strength</th><th class="l"></th></tr>' + ts.map((t, i) => '<tr><td>' + (i + 1) + '</td><td class="l"><b>' + t.n + '</b> ' + esc(t.name) + '</td><td class="l dim">' + esc(zoneName(t.z)) + '</td><td class="l dim">' + esc(t.hub) + '</td><td>' + dot(t.s) + t.s + '</td><td class="l">' + (t.e ? '<span style="color:' + ELITE + '">elite</span> ' : '') + (t.rk ? 'rookie ' : '') + (t.q ? '<span class="dim">Championship</span>' : '') + '</td></tr>').join('') + '</table></div>';
    }
    const l = sn.log, prev = V.snaps[V.i - 1], nm = n => { const t = sn.teams.find(x => x.n === n); return t ? n + ' ' + t.name + ' (' + zoneName(t.z) + ')' : String(n); };
    let o = '<div class="sm"><b>' + cy + '</b>: ' + (l.rookies || 0) + ' rookies arrived, ' + (l.folded || 0) + ' teams folded' + (l.back ? ', ' + l.back + ' returned after seasons away' : '') + '.' + ((l.formed || []).length ? ' New district: ' + l.formed.map(zoneName).join(', ') + '.' : '') + '</div>' +
      '<div class="sm mt">Elite teams that rose: ' + ((l.rose || []).map(nm).join('; ') || 'none') + '</div><div class="sm mt">Elite teams that faded: ' + ((l.faded || []).length || 'none') + '</div>';
    if (prev) o += '<div class="wv-scroll mt"><table class="wv"><tr><th>Area</th><th>Teams ' + prev.cy + '</th><th>Teams ' + cy + '</th><th>Change</th><th>Elite ' + prev.cy + '</th><th>Elite ' + cy + '</th></tr>' + ZONES.map(k => { const a = prev.teams.filter(t => t.z === k), b = sn.teams.filter(t => t.z === k), dlt = b.length - a.length;
      return '<tr class="click' + (V.zone === k ? ' on' : '') + '" data-pick="' + esc(k) + '"><td>' + esc(zoneName(k)) + '</td><td class="dim">' + a.length + '</td><td>' + b.length + '</td><td class="' + (dlt ? '' : 'dim') + '">' + (dlt > 0 ? '+' : '') + dlt + '</td><td class="dim">' + a.filter(t => t.e).length + '</td><td>' + b.filter(t => t.e).length + '</td></tr>'; }).join('') + '</table></div>';
    else o += '<div class="xs muted mt">The first season of the run: the world as it was set up.</div>';
    return o;
  }

  function render() {
    const sn = cur();
    $('years').innerHTML = '<button class="btn sm" data-yr="prev"' + (V.i > 0 ? '' : ' disabled') + '>◀</button>' + YEARS.map(y => { const i = V.snaps.findIndex(s => s.cy === y); return '<button class="btn sm' + (sn && sn.cy === y ? ' sel' : '') + '" data-yr="' + i + '"' + (i < 0 ? ' disabled' : '') + '>' + y + '</button>'; }).join('') +
      '<button class="btn sm" data-yr="next"' + (V.i >= 0 && V.i < V.snaps.length - 1 ? '' : ' disabled') + '>▶</button>';
    $('sum').innerHTML = sn ? '<b>' + sn.cy + '</b> · ' + esc(sn.game) + ' · ' + (sn.teams.length + 1) + ' teams (' + D.REAL_TEAMS[D.dataYear(sn.cy)] + ' real) · ' + sn.teams.filter(t => t.e).length + ' elite · ' + sn.teams.filter(t => t.rk).length + ' rookies · ' + sn.events.filter(e => e.kind === 'regional' && !(e.z in D.DISTRICT)).length + ' regionals · ' +
      sn.events.filter(e => e.z in D.DISTRICT).length + ' district events in ' + W.districtsAt(sn.cy).length + ' districts' + (V.zone ? ' · showing <b>' + esc(zoneName(V.zone)) + '</b> <button class="btn sm" id="unpick">All areas</button>' : '') : '';
    $('views').innerHTML = '<span class="xs muted">View:</span>' + VIEWS.map((x, i) => '<button class="btn sm" data-view="' + i + '">' + x[0] + '</button>').join('') + (V.zone ? '<button class="btn sm" data-view="zone">' + esc(zoneName(V.zone)) + '</button>' : '');
    $('leg').innerHTML = '<span>Strength</span><span style="display:inline-block;width:120px;height:9px;border-radius:5px;background:linear-gradient(90deg,' + [35, 41, 47, 53, 59, 65].map(s => G.UI.strColor(s)).join(',') + ')"></span><span>35 to 65+</span>' +
      '<span><i style="background:' + ELITE + ';border-radius:50%"></i>Elite team</span><span><i style="background:' + EV + ';transform:rotate(45deg);border-radius:1px"></i>Event</span><span>Zoom in for cities, then single teams. Hover for details.</span>';
    $('tabs').innerHTML = TABS.map(t => '<button class="btn sm' + (V.tab === t[0] ? ' sel' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>').join('');
    $('panel').innerHTML = panel();
    drawMap(); drawCharts();
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-yr],[data-tab],[data-view],[data-pick],#unpick,#run'); if (!b) return;
    if (b.id === 'run') return run();
    if (b.id === 'unpick') { V.zone = null; return render(); }
    if (b.dataset.yr != null) { const v = b.dataset.yr; V.i = v === 'prev' ? Math.max(0, V.i - 1) : v === 'next' ? Math.min(V.snaps.length - 1, V.i + 1) : Number(v); return render(); }
    if (b.dataset.tab) { V.tab = b.dataset.tab; return render(); }
    if (b.dataset.view != null) { const sn = cur(); if (b.dataset.view === 'zone') { if (sn) fit(sn.teams.filter(t => t.z === V.zone).map(t => [t.x, t.y]), 1.3, 40); } else viewGroup(VIEWS[Number(b.dataset.view)][1]); return drawMap(); }
    if (b.dataset.pick) pick(b.dataset.pick);
  });
  document.addEventListener('keydown', e => { if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return; if (e.key === 'ArrowLeft' && V.i > 0) { V.i--; render(); } if (e.key === 'ArrowRight' && V.i < V.snaps.length - 1) { V.i++; render(); } });
  $('start').innerHTML = YEARS.map(y => '<option value="' + y + '">' + y + '</option>').join('');
  { const m = /^#(\d{4})-(\d+)(?:-(easy|normal|hard))?/.exec(location.hash || ''); if (m) { $('start').value = m[1]; $('seed').value = m[2]; if (m[3]) $('diff').value = m[3]; } }
  bindMap(); render();
  // #2016-7-normal-auto simulates at once; ?y=2019&z=East Asia&t=nums&v=EA after it opens a year, an area, a tab and a view
  const openHash = () => { const q = {}; decodeURIComponent((location.hash.split('?')[1] || '')).split('&').forEach(p => { const i = p.indexOf('='); if (i > 0) q[p.slice(0, i)] = p.slice(i + 1); });
    if (q.y) { const i = V.snaps.findIndex(s => s.cy === Number(q.y)); if (i >= 0) V.i = i; } if (q.z && ZONES.includes(q.z)) V.zone = q.z; if (q.t && TABS.some(t => t[0] === q.t)) V.tab = q.t;
    if (q.v === 'zone' && V.zone && cur()) fit(cur().teams.filter(t => t.z === V.zone).map(t => [t.x, t.y]), 1.3, 40); else if (q.v) viewGroup(q.v === 'world' ? null : q.v); render(); };
  V.onDone = openHash;
  if (/auto/.test(location.hash || '')) run();
  window.WV = V;
})();
