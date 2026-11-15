'use strict';
/* FRC Manager — the world (v3.0 careers): every AI team has a home (a regional area or a district) and a season.
   Every event in the world is played: the ones you attend by the match engine, the others by a fast statistical
   simulation. District teams earn district points at two district events, the best go to their District Championship,
   and each district sends its share of teams to the Championship. Regional teams qualify as before. */
(function () {
  const U = G.U, D = G.Data;
  const W = G.World = {};

  // ---------- data ----------
  // The United States: team numbers follow the real curve of the decade (teams relative to 2026): growth to 2020, a
  // fifth lost in the pandemic, recovery by 2025. The game has about one team for every four real ones there. Every
  // area outside the United States follows its own real numbers, season by season (world-areas.js), about one team
  // for every 2.2 real ones, so that a small area can fill its own events.
  D.WORLD_TEAMS = 800;
  D.TEAM_CURVE = { 2016: 0.825, 2017: 0.886, 2018: 0.965, 2019: 1.0, 2020: 1.033, 2021: 0.812, 2022: 0.851, 2023: 0.877, 2024: 0.915, 2025: 0.984, 2026: 1 };
  // Fictional districts. from: the first season they play as a district (0 = before the career calendar begins);
  // teams: size in 2026 (earlier years follow the curve); dcmp: District Championship field; str: how deep the field is.
  // real: a district outside the United States, whose teams follow the real numbers (no `teams`).
  D.DISTRICTS = [
    { id: 'lakeshore', name: 'Lakeshore District', short: 'Lakeshore', region: 'Midwest', from: 0, teams: 128, dcmp: 48, str: 4, color: '#3e8cff',
      desc: 'The oldest and biggest district: deep fields, many events, and the most Championship places.', towns: ['Bay Harbor', 'Cedar Point', 'Grand Haven', 'Iron Creek', 'Kettle Lake', 'Marlow', 'North Pier', 'Sault Ridge', 'Three Rivers', 'Windmill Bay'] },
    { id: 'harbor', name: 'Harbor District', short: 'Harbor', region: 'Northeast', from: 0, teams: 88, dcmp: 36, str: 3, color: '#22b8c8',
      desc: 'A balanced district of old programs and short drives between events.', towns: ['Ashford', 'Briar Cove', 'Kingsport', 'Old Mill', 'Salt Marsh', 'Tidewater', 'Whaler\'s Point', 'Winthrop'] },
    { id: 'evergreen', name: 'Evergreen District', short: 'Evergreen', region: 'West', from: 0, teams: 60, dcmp: 28, str: 3, color: '#30c27a',
      desc: 'Small and close-knit: three events, everybody knows everybody, and few Championship places.', towns: ['Alder Falls', 'Cedar Grove', 'Fir Hollow', 'Mossy Creek', 'Rain Valley', 'Timberline'] },
    { id: 'mesa', name: 'Mesa District', short: 'Mesa', region: 'Southwest', from: 2019, teams: 72, dcmp: 32, str: 3, color: '#ff8a3d',
      desc: 'Formed in 2019 when the Southwest\'s biggest state left the regional system.', towns: ['Agave Flats', 'Dry Creek', 'High Mesa', 'Painted Rock', 'Sagebrush', 'Sunspot', 'Yucca Wells'] },
    { id: 'sierra', name: 'Sierra District', short: 'Sierra', region: 'West', from: 2026, teams: 90, dcmp: 36, str: 4, take: 0.9, color: '#f5c542',
      desc: 'Formed in 2026: the largest regional area of all turns district overnight.', towns: ['Almond Grove', 'Bay Terrace', 'Canyon View', 'Gold Run', 'Orchard Hill', 'Palm Court', 'Redwood Flat', 'Surf City'] },
    { id: 'trillium', name: 'Trillium District', short: 'Trillium', region: 'North', from: 2017, real: true, dcmp: 28, str: 4, color: '#e879f9',
      desc: 'Formed in 2017 on the northern shores of the great lakes: a deep district of old programs that sends elite teams to the Championship every year.', towns: ['Maple Creek', 'Lakeview Heights', 'Queensbridge', 'Grand Bend', 'Bayfield', 'Northgate', 'Escarpment Ridge', 'Thousand Isles'] },
    { id: 'levant', name: 'Levant District', short: 'Levant', region: 'Middle East', from: 2017, real: true, dcmp: 16, str: 3, color: '#a3e635',
      desc: 'Formed in 2017: a small coastal district where every team is an hour from every other, and the level is high.', towns: ['Olive Grove', 'Carmel Ridge', 'Citrus Coast', 'Desert Gate', 'Upper Valley', 'Old Harbor'] }
  ];
  D.DISTRICT = {}; D.DISTRICTS.forEach(d => D.DISTRICT[d.id] = d);
  // the story of a district that forms during a career ({cy}, {n} teams and {ev} events are filled in)
  D.DISTRICT_NEWS = {
    mesa: { title: 'The Southwest goes district', body: [
      'For years the Southwest\'s biggest state ran more regionals than anywhere else, and its teams still sat on waiting lists or drove six hours to find an open one. A group of volunteers spent two seasons counting gymnasiums, scorekeepers and trailers. The numbers worked.',
      'From {cy} the state plays as the Mesa District: about {n} teams and {ev} two-day events in high-school gyms. One registration fee buys two events, and a District Championship in week 7 sends the best of the points list to the Championship.'] },
    sierra: { title: 'The largest regional area turns district', body: [
      'The West has more teams than any other regional area, and since the lost season of 2021 every one of its regionals has filled within an hour of opening. The planning committee voted last winter, and the venues were signed by spring.',
      'From {cy} most of those teams play as the Sierra District: about {n} teams and {ev} two-day events. One registration fee buys two events, and a District Championship in week 7 sends the best of the points list to the Championship. Only a handful of regionals remain in the West.'] },
    trillium: { title: 'The first district outside the United States', body: [
      'The province on the northern shores of the great lakes has more teams than most states, and for years five regionals have not been enough for them. Its volunteers have watched the district across the lake for a long time, and this winter they signed the last venue.',
      'From {cy} those teams play as the Trillium District: about {n} teams and {ev} two-day events in gyms and college halls. One registration fee buys two events, and a provincial championship in week 7 sends the best of the points list to the Championship. The rest of the North keeps its regionals.'] },
    levant: { title: 'A district on the eastern shore', body: [
      'One regional a year for sixty teams: on the eastern shore of the Mediterranean, most students have played a single event a season, however good the robot. The organisers have now booked the same two arenas four times over.',
      'From {cy} those teams play as the Levant District: about {n} teams and {ev} two-day events, none of them more than an hour or two from home. One registration fee buys two events, and a District Championship in week 7 sends the best of the points list to the Championship. The other teams of the Middle East are left without a regional of their own for now.'] }
  };
  D.DISTRICT_TALK = [['Two events for one fee, and both within a two-hour drive. Our travel budget just doubled.', 'a coach in the new district'], ['I will miss the big arena. I will not miss the hotel bill.', 'a mentor in the new district'],
    ['Twelve qualification matches an event. The drivers will finally get enough field time.', 'a drive coach'], ['Fewer regionals out there means fuller ones here. Register early.', 'a regional team next door'], ['Every match is worth points now. No more coasting through Friday.', '{t}']];
  D.REGION_W = { West: 1.4 }; // the West has the most regional teams of all (until most of them form the Sierra District)
  D.FEES.dcmp = 4000; D.FEES.extraDistrict = 1000;
  // District points (the real system): alliance selection and playoffs by position, judged awards, team age;
  // qualification rank by the inverse error function. The District Championship counts three times.
  D.DP = { awards: { impact: 10, ei: 8, ras: 8, other: 5 }, rookie: 10, second: 5, dcmpMult: 3, de: { Winner: 30, Finalist: 20, '3rd place': 13, '4th place': 7 }, se: { Winner: 30, Finalist: 20, Semifinalist: 10 } };
  D.WORLD_STR = 48.5;      // the average team strength the world holds (rookies start far below it and grow up in three seasons)
  D.STR_SD = 18;           // one standard deviation of team strength: an area's real strength (D.zStr) is counted in these
  D.CHAMPS_SHARE = 0.16;   // share of all teams that reach the Championship (one Championship); x1.5 with two
  D.FATIGUE_DISTRICT = 7;  // a two-day district event tires the team a little less than a three-day regional

  const curve = cy => D.TEAM_CURVE[cy] || 1;
  const cyOf = S => G.Career.cy(S);
  const sumOf = (a, f) => a.reduce((s, x) => s + f(x), 0);
  W.on = S => !!(S && S.cal && S.world);
  // a world from before 3.5 (North America only) plays its season out as it was; it grows when the next one is planned
  W.legacy = S => !!(S && S.world && (S.world.v || 1) < 2);
  W.districtsAt = cy => D.DISTRICTS.filter(d => d.from <= cy);
  W.districtsOf = (S, cy) => D.DISTRICTS.filter(d => d.from <= cy && !(d.real && W.legacy(S)));
  W.sizeOf = (d, cy) => (d.real ? D.areaTeams(d.id, cy) : Math.round(d.teams * curve(cy)));
  // the District Championship field: a small district plays a smaller one
  W.dcmpSize = (d, cy) => (d.real ? Math.min(d.dcmp, Math.max(12, Math.round(W.sizeOf(d, cy) * 0.55))) : d.dcmp);
  W.usTotal = cy => Math.round(D.WORLD_TEAMS * curve(cy));
  W.total = cy => W.usTotal(cy) + sumOf(D.EXPLICIT, z => D.areaTeams(z, cy));
  W.homeName = S => (S.team.home ? D.DISTRICT[S.team.home].name : S.team.region);
  W.myDistrict = S => (S && S.team && S.team.home ? D.DISTRICT[S.team.home] : null);

  // ---------- qualification points by rank (inverse error function, alpha 1.07) ----------
  const ierf = x => { const a = 0.147, l = Math.log(1 - x * x), t = 2 / (Math.PI * a) + l / 2; return (x < 0 ? -1 : 1) * Math.sqrt(Math.sqrt(t * t - l / a) - t); };
  W.qualPts = (rank, n) => Math.ceil(ierf((n - 2 * rank + 2) / (1.07 * n)) * (10 / ierf(1 / 1.07)) + 12);
  // district points of one event record: { r: rank, n, a: alliance 1-8 (0 none), p: 0 captain / 1 first pick / 2 second pick, f: finish, aw: [award ids] }
  W.points = function (rec, fmt) {
    const tab = fmt === 'se' ? D.DP.se : D.DP.de, out = { qual: W.qualPts(rec.r, rec.n), sel: 0, po: 0, aw: 0 };
    if (rec.a) { out.sel = rec.p <= 1 ? 17 - rec.a : rec.a; out.po = tab[rec.f] || 0; }
    (rec.aw || []).forEach(a => { out.aw += D.DP.awards[a] || D.DP.awards.other; });
    out.total = out.qual + out.sel + out.po + out.aw;
    return out;
  };

  // ---------- zones ----------
  // A zone is where a team's numbers, strength and elite places are counted: a district's cities (even before the
  // district forms: such a team carries z, the district it will join) or an area's cities outside its districts.
  W.zoneOf = function (t, cy) {
    if (t.home || t.z) return t.home || t.z;
    if (!W.legacy(G.S)) return t.region;
    const hb = G.Geo.hub(G.Geo.teamPos(t.num, t.region, t.home, cy, null, true).hub); return hb ? hb.d || hb.r : t.region; // before 3.5: by the team's city
  };
  W.areaOf = t => t.home || t.region;
  // the zones the regional teams of an area come from that season, with their real sizes: [{ z, n }]
  W.zonesOf = (region, cy) => [{ z: region, n: D.realTeams(region, cy) }].concat(D.DISTRICTS.filter(d => d.region === region && d.from > cy).map(d => ({ z: d.id, n: D.realTeams(d.id, cy) })));
  // how many regional teams each area should have (areas that host districts have fewer). The United States shares
  // its total by weight; the other areas have their real numbers, with the teams of a district still to form.
  function regionalTargets(cy) {
    const us = D.US_REGIONS, ds = W.districtsAt(cy).filter(d => !d.real), regTotal = W.usTotal(cy) - sumOf(ds, d => W.sizeOf(d, cy)), w = {}, out = {};
    us.forEach(r => { w[r] = Math.max(0.1, (D.REGION_W[r] || 1) - sumOf(ds.filter(d => d.region === r), d => d.take || 0.3)); });
    const sum = sumOf(us, r => w[r]);
    us.forEach(r => { out[r] = Math.round(regTotal * w[r] / sum); });
    D.REGIONS.filter(r => !us.includes(r)).forEach(r => { out[r] = D.areaTeams(r, cy) + sumOf(D.DISTRICTS.filter(d => d.real && d.region === r && d.from > cy), d => D.areaTeams(d.id, cy)); });
    return out;
  }
  W.regionalTargets = regionalTargets;
  // every zone's nominal size that season (the New Career page, and the world's mean strength)
  W.zoneSizes = function (cy) {
    const out = {}, rt = regionalTargets(cy);
    W.districtsAt(cy).forEach(d => { out[d.id] = W.sizeOf(d, cy); });
    D.REGIONS.forEach(r => { const zs = W.zonesOf(r, cy), tot = sumOf(zs, x => x.n) || 1;
      if (D.US_REGIONS.includes(r)) zs.forEach(x => { out[x.z] = Math.round(rt[r] * x.n / tot); }); else zs.forEach(x => { out[x.z] = D.areaTeams(x.z, cy); }); });
    return out;
  };
  // the strength a zone's teams average that season: the real figure (D.zStr), around the world's own mean
  const zmCache = {};
  W.zoneMean = function (zone, cy) {
    const y = D.dataYear(cy);
    if (zmCache[y] == null) { const sz = W.zoneSizes(cy), zs = Object.keys(sz); zmCache[y] = sumOf(zs, z => sz[z] * D.zStr(z, cy)) / Math.max(1, sumOf(zs, z => sz[z])); }
    return D.WORLD_STR + D.STR_SD * (D.zStr(zone, cy) - zmCache[y]);
  };

  // ---------- setup ----------
  const usedNum = (S, n) => !!S.teams[n] || n === S.team.num;
  // a free team number: an established team's from its zone's real spread, below the start year's first rookie; a
  // rookie's in its season's block (D.NUM_FROM); in one block of a thousand when the caller names it
  function freeNum(S, rng, o) {
    const cy0 = S.cal[0], top = D.numTop(cy0);
    let num, tries = 0;
    if (o.range) { do { num = rng.int(o.range[0], o.range[1] + 50 * Math.floor(tries++ / 200)); } while (usedNum(S, num)); return num; }
    if (o.rookie) { const b = D.numBlock(o.cy); do { num = rng.int(b[0], b[1] + 200 * Math.floor(tries++ / 300)); } while (usedNum(S, num)); return num; } // a full block spills over
    do { num = tries++ < 400 ? D.zoneNum(rng, o.zone, cy0, top) : rng.int(1, top); } while (usedNum(S, num));
    return num;
  }
  // o: region, home (a formed district), zone (a district still to form), rookie + cy, range ([lo, hi] numbers), back
  // (a team that returns after seasons away), cy0 (the season its strength is drawn for)
  function addTeam(S, rng, o) {
    const zone = o.home || o.zone || o.region, cy = o.cy0 || S.cal[0];
    const num = freeNum(S, rng, { zone, rookie: o.rookie, cy: o.cy, range: o.range });
    const base = W.zoneMean(zone, cy) - 0.5, sd = D.STR_SD * D.zSd(zone);
    const str = o.rookie ? Math.round(U.clamp(rng.norm(26, 10), 5, 60))
      : o.back ? Math.round(U.clamp(rng.norm(base - 8, sd * 0.7), 6, 80))
      : Math.round(U.clamp(rng.norm(base, sd) + (num < D.numTop(S.cal[0]) * D.OLD_NUM ? 6 : 0), 6, 96));
    S.teams[num] = { num, name: D.teamName(rng), region: o.region, home: o.home || null, str, traj: o.rookie ? 1 : rng.pick([-1, 0, 0, 1]),
      impact: o.rookie ? Math.round(U.clamp(rng.norm(30, 12), 5, 80)) : G.AI.impactRoll(rng, str), rookie: o.rookie ? S.year : false, ry: o.rookie ? o.cy : null, rb: null };
    if (!o.home && o.zone && o.zone !== o.region) S.teams[num].z = o.zone;
    return S.teams[num];
  }
  const count = (S, f) => Object.values(S.teams).filter(f).length;
  const isReal = t => D.isExplicit(t.home || t.z || t.region); // a team of an area that follows the real numbers
  // which of an area's zones a new regional team of the United States comes from (by their real sizes)
  const pickZone = (rng, region, cy) => rng.wpick(W.zonesOf(region, cy), x => x.n + 0.01).z;
  // Every zone's teams sit at its real strength: the whole zone shifts toward its mean (all of the way in a new world,
  // a few points a season after that), which leaves the best teams alone when the level rises and the weakest when it
  // falls. Elite teams keep their own level.
  function level(S, rng, cy, full) {
    const by = {}, all = Object.values(S.teams);
    all.forEach(t => { (by[W.zoneOf(t, cy)] = by[W.zoneOf(t, cy)] || []).push(t); });
    // the world as a whole climbs back to its level by at most 2.5 a season (a big rookie class holds it under for a
    // while, as it always did); around that, a zone moves up to 5 a season toward its own real place
    const world = sumOf(all, t => t.str) / Math.max(1, all.length), base = world + U.clamp(D.WORLD_STR - world, -2.5, 2.5) - D.WORLD_STR;
    Object.keys(by).forEach(z => {
      const ts = by[z], mean = sumOf(ts, t => t.str) / ts.length, gap = full ? W.zoneMean(z, cy) - mean : U.clamp(W.zoneMean(z, cy) + base - mean, -5, 5);
      ts.forEach(t => { if (t.elite) return; const k = full ? 1 : gap > 0 ? U.clamp((85 - t.str) / 30, 0, 1) : U.clamp((t.str - 15) / 30, 0, 1); t.str = Math.round(U.clamp(t.str + gap * k + (full ? 0 : rng.range(-0.5, 0.5)), 5, t.rookie && full ? 60 : 97)); });
    });
  }
  // An area outside the United States follows the real numbers: every season each block of a thousand team numbers
  // gains or loses teams until it holds its real share. Where a block shrinks its weakest teams fold (never an elite
  // one); where it grows, this season's rookies arrive in the newest numbers and teams that sat out return in the
  // older ones. In a new world (first) every block is filled the same way, as established teams.
  function reconcile(S, rng, cy, log, first) {
    const rk = D.numBlock(cy);
    D.EXPLICIT.forEach(z => {
      const d = D.DISTRICT[z], formed = !!d && d.from <= cy, region = d ? d.region : z, want = D.blockTargets(z, cy);
      const inZone = t => (d ? (formed ? t.home === z : !t.home && t.z === z) : !t.home && !t.z && t.region === z);
      const have = want.map(() => []), me = S.team, mine = d ? formed && me.home === z : !me.home && me.region === z;
      Object.values(S.teams).forEach(t => { if (inZone(t)) have[Math.min(11, Math.floor(t.num / 1000))].push(t); });
      want.forEach((w, b) => {
        let n = have[b].length + (mine && Math.min(11, Math.floor(me.num / 1000)) === b ? 1 : 0);
        for (; n > w; n--) { // fold
          const pool = have[b].filter(t => !t.elite); if (!pool.length) break;
          const x = rng.wpick(pool, t => Math.pow(Math.max(0.05, 1.5 - t.str / 60), 2)); delete S.teams[x.num]; have[b].splice(have[b].indexOf(x), 1); log.folded++;
        }
        for (; n < w; n++) { // arrive
          const lo = Math.max(b * 1000, D.NUM_MIN[z] || 1), hi = b * 1000 + 999, o = { region, home: formed ? z : null, zone: z, cy0: cy };
          if (first) o.range = [lo, Math.min(hi, rk[1])]; // a new world: anywhere in the block, up to this season's last number
          else if (hi >= rk[0] && lo <= rk[1]) { o.range = [Math.max(lo, rk[0]), Math.min(hi, rk[1])]; o.rookie = true; o.cy = cy; log.rookies++; } // this season's numbers: a rookie
          else { o.range = [lo, Math.min(hi, rk[0] - 1)]; o.back = true; log.back = (log.back || 0) + 1; } // an older number: a team that sat out returns
          if (o.range[1] < o.range[0]) o.range[1] = o.range[0] + 200;
          const t = addTeam(S, rng, o);
          if (first && t.num >= rk[0]) { t.rookie = S.order[Math.max(0, S.cal.indexOf(cy))]; t.ry = cy; t.str = Math.round(U.clamp(rng.norm(26, 10), 5, 60)); t.traj = 1; t.impact = Math.round(U.clamp(rng.norm(30, 12), 5, 80)); }
        }
      });
    });
  }
  W.setup = function (S, rng) {
    const cy = S.cal[0];
    S.teams = {}; S.world = { v: 2 };
    // the United States: its districts, then every area's regional teams from the area's own cities and from the
    // cities of a district still to form
    W.districtsAt(cy).filter(d => !d.real).forEach(d => { const n = W.sizeOf(d, cy) - (S.team.home === d.id ? 1 : 0); for (let i = 0; i < n; i++) addTeam(S, rng, { region: d.region, home: d.id }); });
    const rt = regionalTargets(cy);
    D.US_REGIONS.forEach(r => { const n = rt[r] - (!S.team.home && S.team.region === r ? 1 : 0); for (let i = 0; i < n; i++) addTeam(S, rng, { region: r, zone: pickZone(rng, r, cy) }); });
    // a first class of rookies, so the Rookie All-Star award has candidates (numbered in the start year's block)
    Object.values(S.teams).forEach(t => {
      if (!rng.chance(0.06)) return;
      t.rookie = S.order[0]; t.ry = cy; t.str = Math.round(U.clamp(rng.norm(26, 10), 5, 60)); t.traj = 1;
      const n = freeNum(S, rng, { rookie: true, cy }); delete S.teams[t.num]; t.num = n; S.teams[n] = t;
    });
    // the rest of the world, block by block of its real team numbers (its rookies are the teams with this year's numbers)
    reconcile(S, rng, cy, { folded: 0, rookies: 0 }, true);
    level(S, rng, cy, true);
    W.eliteSetup(S, rng);
    W.plan(S, rng);
  };
  // a district that forms in season cy takes over the teams of its cities
  function form(S, rng, cy) {
    D.DISTRICTS.filter(d => d.from === cy && !count(S, t => t.home === d.id)).forEach(d => {
      const reg = Object.values(S.teams).filter(t => !t.home && t.region === d.region), own = reg.filter(t => W.zoneOf(t, cy - 1) === d.id);
      own.forEach(t => { t.home = d.id; delete t.z; });
      // a district of the United States has a set size: more of the area's regional teams join until it is reached
      if (!d.real) rng.shuffle(reg.filter(t => !t.home)).slice(0, Math.max(0, W.sizeOf(d, cy) - (S.team.home === d.id ? 1 : 0) - own.length)).forEach(t => { t.home = d.id; delete t.z; });
    });
  }
  // what a forming district will look like, with its story
  W.formInfo = function (S, d, cy) {
    const N = D.DISTRICT_NEWS[d.id] || { title: 'A new district: ' + d.name, body: [d.desc] }, n = W.sizeOf(d, cy), ev = Math.max(2, Math.round(n * 2 / 36));
    const fill = t => t.replace('{cy}', cy).replace('{n}', n).replace('{ev}', ev);
    return { title: N.title, body: N.body.map(fill), n, ev, slots: W.slots(S, d, cy) };
  };
  // A world from before 3.5 held North America only. When its next season is planned the rest of the world arrives:
  // every team gets its zone, the northern province's teams form their district if its year has come, and the areas
  // outside the United States are filled to their real numbers.
  function upgrade(S, rng, cy) {
    const zone = {}; Object.values(S.teams).forEach(t => { zone[t.num] = W.zoneOf(t, cy); }); // by the old cities, while the world still counts as old
    S.world.v = 2;
    Object.values(S.teams).forEach(t => {
      const d = D.DISTRICT[zone[t.num]]; if (t.home || !d) return;
      if (d.from <= cy) { if (d.real) t.home = d.id; } else t.z = d.id;
    });
    const log = { folded: 0, rookies: 0 }; reconcile(S, rng, cy, log, true); level(S, rng, cy, false);
    S.world.grew = cy;
    G.Career.inbox(S, 'The world is bigger now', 'From the ' + cy + ' season the world simulation covers every part of the world with teams in it: ' + D.REGIONS.filter(r => !D.US_REGIONS.includes(r)).join(', ') + '. Their teams, team numbers, strength and events follow the real seasons.\n\n' +
      'The province on the northern shores of the great lakes plays as the Trillium District, and the rest of the old northern area is now the North. An event in another part of the world is a flight overseas: dearer than an ordinary flight, harder on the robot, and never a trip for the team trailer. The World page has the new map.', 'world', { plot: true });
  }

  // ---------- a new season: teams fold, rookies arrive, new districts form ----------
  W.newSeason = function (S, first) {
    const rng = G.R, cy = cyOf(S), log = { folded: 0, rookies: 0, formed: [] };
    if (!first) {
      // about 4% of the teams of the United States fold every year (weaker programs first); the rest of the world
      // follows its real numbers below
      const all = Object.values(S.teams).filter(t => !isReal(t) || W.legacy(S)), nFold = Math.round(all.length * 0.04), pool = all.map(t => ({ t, w: 1.7 - t.str / 100 }));
      for (let i = 0; i < nFold && pool.length; i++) { const x = rng.wpick(pool, p => (p.t.elite || p.t.wasElite ? 0 : p.w)); if (x.t.elite || x.t.wasElite) break; delete S.teams[x.t.num]; pool.splice(pool.indexOf(x), 1); log.folded++; } // elite teams do not fold
      // a district that forms this season (normally done already, when the season was planned in October)
      form(S, rng, cy);
      log.formed = D.DISTRICTS.filter(d => d.from === cy && !(d.real && W.legacy(S))).map(d => d.id);
    }
    if (!first) {
      // young teams grow up fast, and every zone keeps its real level although each rookie class starts at the bottom
      // (after the lost season it takes a couple of years to get back there)
      const all = Object.values(S.teams), i = S.cal.indexOf(cy);
      all.forEach(t => { const age = t.ry == null ? 9 : i - S.cal.indexOf(t.ry); if (age >= 1 && age <= 3 && t.str < 56) t.str = Math.min(60, t.str + rng.int(3, 7)); });
      level(S, rng, cy, false);
      W.eliteSeason(S, rng, cy, log); // the elite: each zone to the places the real top 100 gives it this season
    }
    // rookies bring every district and every area of the United States to this year's size
    if (!W.legacy(S) || first) {
      W.districtsAt(cy).filter(d => !d.real).forEach(d => { const have = count(S, t => t.home === d.id) + (S.team.home === d.id ? 1 : 0), want = W.sizeOf(d, cy); for (let i = have; i < want; i++) { addTeam(S, rng, first ? { region: d.region, home: d.id } : { region: d.region, home: d.id, rookie: true, cy }); log.rookies++; } });
      const rt = regionalTargets(cy);
      D.US_REGIONS.forEach(r => { const have = count(S, t => !t.home && t.region === r) + (!S.team.home && S.team.region === r ? 1 : 0); for (let i = have; i < rt[r]; i++) { addTeam(S, rng, first ? { region: r, zone: pickZone(rng, r, cy) } : { region: r, zone: pickZone(rng, r, cy), rookie: true, cy }); log.rookies++; } });
      if (!first) reconcile(S, rng, cy, log, false);
    } else legacySeason(S, rng, cy, log);
    S.world.last = log;
    if (!S.wseason || S.wseason.cy !== cy) W.plan(S, rng);
    W.schedule(S, rng);
    return log;
  };
  // a world from before 3.5 whose season was planned before the update: its old areas grow as they did
  function legacySeason(S, rng, cy, log) {
    const old = D.US_REGIONS.concat(['North']), ds = W.districtsOf(S, cy), tot = Math.round(900 * curve(cy)), regTotal = tot - sumOf(ds, d => W.sizeOf(d, cy)), w = {};
    old.forEach(r => { w[r] = Math.max(0.1, (D.REGION_W[r] || 1) - sumOf(ds.filter(d => d.region === r), d => d.take || 0.3)); });
    const sum = sumOf(old, r => w[r]);
    ds.forEach(d => { const have = count(S, t => t.home === d.id) + (S.team.home === d.id ? 1 : 0), want = W.sizeOf(d, cy); for (let i = have; i < want; i++) { addTeam(S, rng, { region: d.region, home: d.id, rookie: true, cy }); log.rookies++; } });
    old.forEach(r => { const have = count(S, t => !t.home && t.region === r) + (!S.team.home && S.team.region === r ? 1 : 0), want = Math.round(regTotal * w[r] / sum); for (let i = have; i < want; i++) { addTeam(S, rng, { region: r, rookie: true, cy }); log.rookies++; } });
  }

  // ---------- elite teams (D.ELITE, by difficulty D.ELITE_DIFF, places by the real top 100: D.TOP100) ----------
  W.eliteCfg = S => Object.assign({ n: 1 }, D.ELITE, D.ELITE_DIFF[(S && S.diff) || 'normal'] || {});
  // the elite places of every zone that season: { zone: n }
  W.eliteTargets = (S, cy) => D.eliteTargets(cy, W.legacy(S) ? Object.keys(S.teams || {}).length + 1 : W.total(cy), W.eliteCfg(S).n);
  W.eliteTarget = S => { const T = W.eliteTargets(S, cyOf(S)); return sumOf(Object.keys(T), z => T[z]); }; // the elite places of the world this season
  const ageOf = (S, t, cy) => (t.ry == null ? 99 : S.cal.indexOf(cy) - S.cal.indexOf(t.ry));
  function makeElite(S, t, rng, cy, fresh) {
    const E = W.eliteCfg(S), r = fresh ? E.fresh : E.b;
    t.elite = { since: cy, b: rng.int(r[0], r[1]), dyn: !fresh && rng.chance(E.dyn) };
    t.str = t.elite.b; t.traj = 0; t.impact = Math.max(t.impact || 0, 55);
  }
  // downgraded to a local powerhouse: still one of the best teams around, and it does not fold either
  function fade(t, rng, cy, log) { t.wasElite = cy; t.elite = null; t.str = rng.int(78, 86); t.traj = -1; if (log) (log.faded = log.faded || []).push(t.num); }
  // the best established team of a list (old programs a little ahead: team numbers follow the founding year)
  const veteran = (S, t) => t.str + (t.num < D.numTop(S.cal[0]) * D.OLD_NUM ? 6 : 0);
  const capTop = (S, rng) => Object.values(S.teams).forEach(t => { if (!t.elite && t.str > 90) t.str = 90 - rng.int(0, 2); }); // the very top of the strength scale is the elite's
  W.eliteSetup = function (S, rng, cy0) { // a new world, or a save from before 3.1 (cy0: its season)
    if (D.ELITE.off) return;
    const cy = cy0 || S.cal[0], T = W.eliteTargets(S, cy), all = Object.values(S.teams).filter(t => t.ry == null || ageOf(S, t, cy) >= D.ELITE.minAge);
    Object.keys(T).forEach(z => all.filter(t => !t.elite && W.zoneOf(t, cy) === z).sort((p, q) => veteran(S, q) - veteran(S, p)).slice(0, T[z]).forEach(t => makeElite(S, t, rng, cy)));
    capTop(S, rng);
  };
  // a new season: the elite drift a little and a few fade by themselves; then every zone goes to the places the real
  // top 100 gives it this season: its weakest elite teams fade where it has too many (a dynasty last), and its best
  // established teams rise where it has too few
  W.eliteSeason = function (S, rng, cy, log) {
    if (D.ELITE.off) return;
    const E = W.eliteCfg(S), all = Object.values(S.teams), T = W.eliteTargets(S, cy);
    all.filter(t => t.elite).forEach(t => {
      if (!t.elite.dyn && cy - t.elite.since >= 3 && rng.chance(E.fade)) return fade(t, rng, cy, log);
      t.elite.b = U.clamp(t.elite.b + rng.norm(0, 0.8), E.lo, E.hi); t.str = Math.round(U.clamp(t.elite.b + rng.norm(0, 1.2), E.lo - 1, E.hi + 1));
    });
    const zones = {}; all.forEach(t => { (zones[W.zoneOf(t, cy)] = zones[W.zoneOf(t, cy)] || []).push(t); });
    Object.keys(zones).forEach(z => {
      const inZ = zones[z], el = inZ.filter(t => t.elite), want = T[z] || 0;
      if (el.length > want) el.sort((p, q) => (p.elite.dyn ? 1 : 0) - (q.elite.dyn ? 1 : 0) || p.elite.b - q.elite.b).slice(0, el.length - want).forEach(t => fade(t, rng, cy, log));
      else if (el.length < want) inZ.filter(t => !t.elite && t.wasElite !== cy && ageOf(S, t, cy) >= E.minAge).sort((p, q) => q.str - p.str).slice(0, want - el.length).forEach(t => { makeElite(S, t, rng, cy, true); (log.rose = log.rose || []).push(t.num); });
    });
    capTop(S, rng);
  };
  W.elites = S => Object.values(S.teams || {}).filter(t => t.elite);
  // what a home area looks like before the world exists (New Career page): its elite teams, average strength and size
  W.preview = function (cy, region, home, diff) {
    const E = Object.assign({ n: 1 }, D.ELITE_DIFF[diff || 'normal'] || {}), T = D.eliteTargets(cy, W.total(cy), E.n), sz = W.zoneSizes(cy);
    const zs = home ? [home] : W.zonesOf(region, cy).map(x => x.z), n = sumOf(zs, z => sz[z] || 0) || 1;
    return { elite: sumOf(zs, z => T[z] || 0), avg: Math.round(sumOf(zs, z => (sz[z] || 0) * W.zoneMean(z, cy)) / n), teams: sumOf(zs, z => sz[z] || 0), events: home ? null : W.regionalsIn(region, cy) };
  };
  // the regionals an area holds that season (the United States: about; the rest of the world: its list)
  W.regionalsIn = function (region, cy) {
    if (!D.US_REGIONS.includes(region)) return D.sitesOf(region, cy).length;
    const rt = regionalTargets(cy), tot = sumOf(D.US_REGIONS, r => rt[r]), nReg = Math.max(10, Math.round(tot * 1.8 / 47));
    return Math.max(1, Math.min(6, Math.round(nReg * rt[region] / tot)));
  };

  // ---------- the season's events (planned in October, when registration opens) ----------
  W.plan = function (S, rng) {
    const i = S.phase === 'off' ? Math.min(S.cal.length - 1, S.upcoming) : Math.max(0, S.si), cy = S.cal[i], gy = S.order[i], ev = [];
    if (W.legacy(S)) upgrade(S, rng, cy);
    form(S, rng, cy);
    // regionals of the United States: 36 to 64 teams as in v2.5 (the size decides how hard the playoffs are to reach),
    // enough of them for the regional teams to play about 1.8 events each, spread over six weeks and the areas
    const us = D.US_REGIONS, rt = regionalTargets(cy), tot = sumOf(us, r => rt[r]), nReg = Math.max(10, Math.round(tot * 1.8 / 47));
    const names = []; us.forEach(r => rng.shuffle(D.REGIONAL_NAMES[r].slice()).forEach((n, k) => names.push({ name: n + ' Regional', region: r, k })));
    const quota = {}; us.forEach(r => { quota[r] = Math.max(1, Math.min(6, Math.round(nReg * rt[r] / tot))); });
    const picked = names.filter(x => x.k < quota[x.region]); rng.shuffle(picked);
    picked.forEach((b, k) => ev.push({ id: 'r' + cy + '_' + k, name: b.name, kind: 'regional', region: b.region, week: 1 + (k % 6), size: rng.int(9, 16) * 4, str: rng.int(1, 5), local: rng.chance(0.5), full: false, year: gy, dist: null, teams: [], done: false }));
    // regionals of the rest of the world: in the cities that really host one that season (about one for every two
    // real ones), sized for the area's teams. Local to you when the city is near your team.
    const me = G.Geo.posOf(S, S.team, cy).xy;
    D.REGIONS.filter(r => !us.includes(r)).forEach((r, ri) => {
      const sites = D.sitesOf(r, cy), A = D.WORLD_AREAS[r] || {}, used = {}, wk = rng.shuffle([1, 2, 3, 4, 5, 6]);
      sites.forEach((hub, k) => {
        const pool = (A.names || {})[hub] || [hub], u = used[hub] = (used[hub] || 0) + 1, hb = G.Geo.hub(hub), at = hb ? G.Geo.xy(hb.lon, hb.lat) : me;
        ev.push({ id: 'x' + cy + '_' + ri + '_' + k, name: (pool[u - 1] || pool[0] + ' ' + u) + ' Regional', kind: 'regional', region: r, hub, week: wk[k % 6], size: U.clamp(Math.round(rt[r] * 1.35 / sites.length / 4) * 4, 24, 40), str: 3,
          local: G.Geo.miles(me, at) < 250, full: false, year: gy, dist: null, teams: [], done: false });
      });
    });
    // district events: two plays per team at events of about 32 (some smaller, some bigger), weeks 1 to 5, so a small
    // district holds enough events that the same teams do not meet at every one; the District Championship in week 7.
    // An event's strength is a guess from the district until the season's schedule names its teams (W.schedule).
    W.districtsOf(S, cy).forEach(d => {
      const size = W.sizeOf(d, cy), slots = size * 2, n = Math.max(3, Math.round(slots / 32)), towns = rng.shuffle(d.towns.slice());
      const w = []; for (let k = 0; k < n; k++) w.push(rng.range(0.75, 1.25)); const ws0 = w.reduce((s, x) => s + x, 0), wk = rng.shuffle([1, 2, 3, 4, 5]);
      for (let k = 0; k < n; k++) ev.push({ id: 'd' + cy + '_' + d.id + k, name: towns[k % towns.length] + ' District Event', kind: 'regional', region: d.region, week: wk[k % 5], size: Math.max(16, Math.round(slots * w[k] / ws0)), str: U.clamp(d.str + rng.int(-1, 1), 1, 5), local: true, full: false, year: gy, dist: d.id, teams: [], done: false });
      ev.push({ id: 'dcmp' + cy + '_' + d.id, name: d.short + ' District Championship', kind: 'dcmp', region: d.region, week: 7, size: W.dcmpSize(d, cy), str: 5, local: false, full: false, year: gy, dist: d.id, teams: [], done: false });
    });
    S.wseason = { cy, gy, events: ev, rec: {}, dq: {}, q: {}, impactWon: {}, scheduled: false };
    // what the player can register for: the regionals (regional teams), or the events of their own district
    S.regionals = ev.filter(e => e.kind === 'regional' && (S.team.home ? e.dist === S.team.home : !e.dist));
    return S.wseason;
  };
  // Hall of Fame teams (FIRST Impact Award winners at the Championship during the career) are invited to every
  // Championship: they qualify at Kickoff (the player's own Hall of Fame place is handled with its season)
  W.hofQualify = function (S) {
    const ws = S.wseason; if (!ws) return;
    (S.hof || []).forEach(n => { if (n !== S.team.num && S.teams[n] && !ws.q[n]) ws.q[n] = 'Hall of Fame'; });
  };
  // who plays where: district teams two events of their district, regional teams one to three regionals. A team
  // enters regionals near home first (D.goW): in its own area, a drive away, or where its part of the world usually
  // travels; far overseas only when nothing else is left.
  W.schedule = function (S, rng) {
    const ws = S.wseason; if (!ws || ws.scheduled) return;
    ws.events.forEach(e => { e.teams = []; });
    const byDist = {}; ws.events.filter(e => e.dist && e.kind === 'regional').forEach(e => (byDist[e.dist] = byDist[e.dist] || []).push(e));
    const regs = ws.events.filter(e => !e.dist && e.kind === 'regional'), atHome = {}; regs.forEach(e => { atHome[e.region] = (atHome[e.region] || 0) + 1; });
    rng.shuffle(Object.values(S.teams)).forEach(t => {
      if (t.home) {
        const es = byDist[t.home] || [], a = es.slice().sort((p, q) => p.teams.length / p.size - q.teams.length / q.size || rng.next() - 0.5)[0];
        if (!a) return;
        a.teams.push(t.num);
        const b = es.filter(e => e.week !== a.week).sort((p, q) => p.teams.length / p.size - q.teams.length / q.size || rng.next() - 0.5)[0];
        if (b) b.teams.push(t.num);
      } else {
        let n = rng.chance(U.clamp(0.85 - t.str / 80, 0.1, 0.8)) ? 1 : (t.str > 60 && rng.chance(0.25) ? 3 : 2); const weeks = {};
        // outside the United States a team plays what its own area holds; a strong one sometimes adds a trip abroad
        if (!D.US_REGIONS.includes(t.region)) n = Math.max(1, Math.min(n, (atHome[t.region] || 0) + (t.str > 62 && rng.chance(0.3) ? 1 : 0)));
        const lvl = e => { const z = (t.str - (28 + e.str * 9)) / 24; return Math.exp(-z * z) + 0.15; };
        for (let k = 0; k < n; k++) {
          const cand = regs.filter(e => !weeks[e.week] && e.teams.length < e.size).map(e => ({ e, w: D.goW(t.region, e.region) * (1.2 - e.teams.length / e.size) * lvl(e) }));
          if (!cand.length) break;
          const x = rng.wpick(cand, c => c.w); x.e.teams.push(t.num); weeks[x.e.week] = 1;
        }
      }
    });
    // nobody stays home: a regional team that found no room goes to the emptiest regional it can reach
    Object.values(S.teams).forEach(t => { if (!t.home && !regs.some(e => e.teams.includes(t.num)) && regs.length) regs.slice().sort((p, q) => D.goW(t.region, q.region) - D.goW(t.region, p.region) || p.teams.length / p.size - q.teams.length / q.size)[0].teams.push(t.num); });
    // no regional plays half empty: teams from the area with that week free fill the gaps
    regs.forEach(e => {
      const want = Math.max(Math.min(28, e.size), Math.round(e.size * 0.92));
      if (e.teams.length >= want) return;
      const cand = Object.values(S.teams).filter(t => !t.home && !e.teams.includes(t.num) && !regs.some(x => x.week === e.week && x.teams.includes(t.num)))
        .map(t => { const z = (t.str - (28 + e.str * 9)) / 24; return { t, w: D.goW(t.region, e.region) * (Math.exp(-z * z) + 0.15) / (1 + regs.filter(x => x.teams.includes(t.num)).length) }; });
      while (e.teams.length < want && cand.length) { const x = rng.wpick(cand, c => c.w); e.teams.push(x.t.num); cand.splice(cand.indexOf(x), 1); }
    });
    // now that every event has its teams, its strength (★1–5) is its field's against the season's other events: the
    // average team (the weakest sixth ★, the strongest tenth ★★★★★), one more when two or more elite teams are there.
    // The District Championships and the Championship keep theirs.
    { const es = ws.events.filter(e => e.kind === 'regional' && e.teams.length >= 6), val = e => U.avg(e.teams.map(n => (S.teams[n] ? S.teams[n].str : 40)));
      const sorted = es.map(val).sort((a, b) => a - b), at = q => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
      es.forEach(e => { const v = val(e), el = e.teams.filter(n => S.teams[n] && S.teams[n].elite).length;
        e.str = Math.min(5, (v < at(0.16) ? 1 : v < at(0.42) ? 2 : v < at(0.72) ? 3 : v < at(0.9) ? 4 : 5) + (el >= 2 ? 1 : 0)); }); }
    ws.scheduled = true;
  };
  // the AI teams at an event the player attends
  W.attendees = function (S, def) {
    const e = S.wseason && S.wseason.events.find(x => x.id === def.id);
    return e ? e.teams.filter(n => S.teams[n] && n !== S.team.num) : null;
  };

  // ---------- recording results ----------
  const fmtOf = S => G.Era.playoffs(cyOf(S));
  function put(S, e, num, rec) {
    const ws = S.wseason; rec.e = e.id; rec.w = e.week; rec.k = e.kind === 'dcmp' ? 'c' : e.dist ? 'd' : 'r';
    rec.dp = W.points(rec, fmtOf(S)).total;
    (ws.rec[num] = ws.rec[num] || []).push(rec);
  }
  function close(S, e, res) {
    e.done = true; e.res = res;
    if (res.impact) S.wseason.impactWon[res.impact] = (S.wseason.impactWon[res.impact] || 0) + 1;
    // regional teams qualify for the Championship by winning, or with the Impact, Engineering Inspiration or Rookie All-Star award
    if (!e.dist && e.kind === 'regional') {
      const q = S.wseason.q, me = S.team.num, isIn = n => (n === me ? !!S.season.champsQualified : !!q[n]), here = {}, slots = [];
      (res.winners || []).forEach(n => slots.push([n, 'Winner, ' + e.name]));
      [['impact', 'Impact Award'], ['ei', 'Engineering Inspiration'], ['ras', 'Rookie All-Star']].forEach(([k, nm]) => { if (res[k]) slots.push([res[k], nm + ', ' + e.name]); });
      // a place earned by a team that is already in (from an earlier event, or twice at this one) is a wildcard
      let cards = 0;
      slots.forEach(([n, why]) => { if (isIn(n) || here[n]) cards++; here[n] = 1; if (n !== me && !q[n]) q[n] = why; });
      res.cards = 0; res.wild = [];
      if (W.wildEra(S) && cards) {
        // wildcards go to the finalist alliance: captain, first pick, second pick (the ones not in yet)
        res.cards = cards;
        (res.finalists || []).forEach(n => { if (cards < 1 || isIn(n) || here[n]) return; cards--; res.wild.push(n); if (n !== me) q[n] = 'Wildcard (finalist), ' + e.name; });
      }
    }
  }
  // through 2024 there is no Regional Pool: wildcards instead
  W.wildEra = S => G.Era.wildcards(cyOf(S));
  // finalists in the order wildcards reach them: captain, first pick, second pick
  const byPick = list => list.sort((x, y) => x.p - y.p).map(x => x.n);
  // an event the player played, taken from the match engine's results
  W.record = function (S, ev) {
    if (!W.on(S)) return;
    const e = S.wseason.events.find(x => x.id === ev.id); if (!e || e.done) return;
    const order = G.Ev.rankings(ev), n = order.length, res = { winners: [], finalists: [] };
    order.forEach((num, i) => {
      const a = ev.alliances ? ev.alliances.findIndex(al => al.includes(num)) : -1, p = a >= 0 ? Math.min(2, ev.alliances[a].indexOf(num)) : 0;
      const f = a >= 0 && ev.po && ev.po.finish ? ev.po.finish[a] : '', aw = (ev.awards || []).filter(x => x.team === num).map(x => (['impact', 'ei', 'ras'].includes(x.id) ? x.id : 'other'));
      put(S, e, num, Object.assign({ r: i + 1, n, a: a >= 0 ? a + 1 : 0, p, f, aw }, G.Scout ? G.Scout.evStats(ev, num) : {}));
      if (f === 'Winner') res.winners.push(num); if (f === 'Finalist') res.finalists.push({ n: num, p });
    });
    res.finalists = byPick(res.finalists);
    ['impact', 'ei', 'ras'].forEach(k => { const x = (ev.awards || []).find(y => y.id === k); if (x) res[k] = x.team; });
    if (!e.teams.includes(S.team.num)) e.teams.push(S.team.num);
    close(S, e, res);
  };

  // ---------- the fast simulation of an event nobody watches ----------
  const BR = () => G.Ev.BR;
  function simPlayoffs(rng, A, fmt) {
    // A: alliance strengths (index 0 = alliance 1). Returns the finish of each alliance.
    const n = A.length, win = (i, j) => rng.chance(1 / (1 + Math.exp(-(A[i] - A[j]) / 30))), fin = A.map(() => 'Quarterfinalist');
    const series = (i, j) => { let a = 0, b = 0; while (a < 2 && b < 2) { if (win(i, j)) a++; else b++; } return a > b ? [i, j] : [j, i]; };
    if (n < 2) { if (n) fin[0] = 'Winner'; return fin; }
    if (fmt === 'se' || n < 8) {
      let alive = []; for (let i = 0; i < n; i++) alive.push(i);
      const seedPairs = n >= 8 ? [[0, 7], [3, 4], [1, 6], [2, 5]] : null;
      let round = seedPairs ? seedPairs.map(p => series(p[0], p[1])[0]) : alive.slice(0, 4);
      if (round.length >= 4) { const s1 = series(round[0], round[1]), s2 = series(round[2], round[3]); fin[s1[1]] = 'Semifinalist'; fin[s2[1]] = 'Semifinalist'; round = [s1[0], s2[0]]; }
      const f = series(round[0], round[1] != null ? round[1] : round[0]); fin[f[0]] = 'Winner'; if (f[1] !== f[0]) fin[f[1]] = 'Finalist';
      return fin;
    }
    const W_ = {}, L_ = {}, val = s => (s.s ? s.s - 1 : s.W ? W_[s.W] : L_[s.L]);
    BR().forEach(b => {
      const r = val(b.red), bl = val(b.blue);
      const res = b.bo3 ? series(r, bl) : (win(r, bl) ? [r, bl] : [bl, r]);
      W_[b.id] = res[0]; L_[b.id] = res[1];
    });
    ['M5', 'M6'].forEach(id => { fin[L_[id]] = 'Lower R1'; }); ['M9', 'M10'].forEach(id => { fin[L_[id]] = 'Lower R2'; });
    fin[L_.M12] = '4th place'; fin[L_.M13] = '3rd place'; fin[L_.F] = 'Finalist'; fin[W_.F] = 'Winner';
    return fin;
  }
  W.simEvent = function (S, e, rng) {
    const teams = e.teams.filter(n => S.teams[n]), n = teams.length, fmt = fmtOf(S), res = { winners: [], finalists: [] };
    if (n < 6) { close(S, e, res); return; }
    const st = {}, rp = {}, pl = {}, wl = {};
    teams.forEach(t => { st[t] = S.teams[t].str + rng.norm(0, 6); rp[t] = 0; pl[t] = 0; wl[t] = [0, 0, 0]; });
    const per = e.dist || e.kind === 'dcmp' ? 12 : n <= 44 ? 11 : n <= 54 ? 10 : 9;
    for (let r = 0; r < per; r++) {
      const o = rng.shuffle(teams.slice());
      for (let i = 0; i < o.length; i += 6) {
        const six = o.slice(i, i + 6), real = six.length; while (six.length < 6) six.push(o[rng.int(0, Math.max(0, i - 1))]); // surrogates fill the last match
        const sa = st[six[0]] + st[six[1]] + st[six[2]], sb = st[six[3]] + st[six[4]] + st[six[5]], da = sa + rng.norm(0, 24), db = sb + rng.norm(0, 24);
        const bonus = s => (rng.chance(U.clamp((s - 105) / 150, 0.03, 0.9)) ? 1 : 0) + (rng.chance(U.clamp((s - 150) / 170, 0.01, 0.75)) ? 1 : 0);
        const ba = bonus(sa), bb = bonus(sb);
        six.forEach((t, k) => { if (k >= real) return; const red = k < 3, m = red ? da - db : db - da; rp[t] += (m > 0 ? 2 : 0) + (red ? ba : bb); pl[t]++; wl[t][m > 0 ? 0 : m < 0 ? 1 : 2]++; });
      }
    }
    const order = teams.slice().sort((p, q) => rp[q] / Math.max(1, pl[q]) - rp[p] / Math.max(1, pl[p]) || st[q] - st[p]);
    // alliance selection: captains in rank order pick the strongest team left, then back the other way
    const nA = Math.min(8, Math.floor(n / 3)), al = [], taken = {}, val = t => st[t] + rng.norm(0, 5);
    const best = () => order.filter(t => !taken[t]).map(t => ({ t, v: val(t) })).sort((p, q) => q.v - p.v)[0];
    for (let k = 0; k < nA; k++) { const cap = order.find(t => !taken[t]); taken[cap] = 1; const p = best(); taken[p.t] = 1; al.push([cap, p.t]); }
    for (let k = nA - 1; k >= 0; k--) { const p = best(); if (p) { taken[p.t] = 1; al[k].push(p.t); } }
    const fin = simPlayoffs(rng, al.map(a => a.reduce((s, t) => s + st[t], 0)), fmt);
    // judged awards: Impact (a team wins it once a season), Engineering Inspiration, Rookie All-Star, and a few others
    const aw = {}, give = (t, id) => { (aw[t] = aw[t] || []).push(id); };
    const byImp = teams.map(t => ({ t, v: S.teams[t].impact + rng.norm(0, 10) })).sort((p, q) => q.v - p.v);
    const imp = byImp.find(x => !S.wseason.impactWon[x.t] || e.kind === 'dcmp'), ei = byImp.find(x => !imp || x.t !== imp.t);
    if (imp) { res.impact = imp.t; give(imp.t, 'impact'); } if (ei) { res.ei = ei.t; give(ei.t, 'ei'); }
    const rk = teams.filter(t => S.teams[t].ry === S.wseason.cy).map(t => ({ t, v: S.teams[t].impact + S.teams[t].str * 0.5 + rng.norm(0, 8) })).sort((p, q) => q.v - p.v)[0];
    if (rk) { res.ras = rk.t; give(rk.t, 'ras'); }
    rng.shuffle(order.slice(0, Math.ceil(n * 0.6))).slice(0, 5).forEach(t => { if (!aw[t]) give(t, 'other'); });
    const sx = G.Scout ? G.Scout.simStats(S, e, teams, st) : {}; // scouting numbers (OPR and its split), from their own random numbers
    order.forEach((t, i) => {
      const a = al.findIndex(x => x.includes(t)), f = a >= 0 ? fin[a] : '';
      put(S, e, t, { r: i + 1, n, a: a >= 0 ? a + 1 : 0, p: a >= 0 ? Math.min(2, al[a].indexOf(t)) : 0, f, aw: aw[t] || [], s: sx[t], wl: wl[t], rs: pl[t] ? Math.round(rp[t] / pl[t] * 100) / 100 : 0 });
      if (f === 'Winner') res.winners.push(t); if (f === 'Finalist') res.finalists.push({ n: t, p: Math.min(2, al[a].indexOf(t)) });
    });
    res.finalists = byPick(res.finalists);
    close(S, e, res);
    // the Woodie Flowers Finalist Award(s) of a regional or a District Championship (judged with their own random numbers)
    if (G.Career.wffaJudge) G.Career.wffaJudge(S, e, teams, false);
  };

  // ---------- standings and advancement ----------
  W.ageOf = function (S, num) {
    const cy = S.wseason.cy, ry = num === S.team.num ? (S.profile === 'rookie' ? S.cal[0] : null) : (S.teams[num] || {}).ry;
    if (ry == null) return 0;
    if (ry === cy) return D.DP.rookie;
    const i = S.cal.indexOf(ry); return i >= 0 && S.cal[i + 1] === cy ? D.DP.second : 0;
  };
  // every team of a district: its two district events, age points, the District Championship (x3), the total
  W.standings = function (S, distId) {
    const ws = S.wseason, nums = Object.values(S.teams).filter(t => t.home === distId).map(t => t.num).concat(S.team.home === distId ? [S.team.num] : []);
    const rows = nums.map(num => {
      const recs = (ws.rec[num] || []), de = recs.filter(r => r.k === 'd').sort((p, q) => p.w - q.w).slice(0, 2), dc = recs.find(r => r.k === 'c');
      const age = W.ageOf(S, num), ev = de.reduce((s, r) => s + r.dp, 0), cmp = dc ? dc.dp * D.DP.dcmpMult : 0;
      return { num, name: num === S.team.num ? S.team.name : S.teams[num].name, e1: de[0] ? de[0].dp : null, e2: de[1] ? de[1].dp : null, played: de.length, age, cmp: dc ? cmp : null, pre: ev + age, total: ev + age + cmp,
        po: de.reduce((s, r) => s + (W.points(r, fmtOf(S)).po), 0), str: num === S.team.num ? 50 : S.teams[num].str };
    });
    rows.sort((p, q) => q.total - p.total || q.po - p.po || q.str - p.str);
    rows.forEach((r, i) => { r.rank = i + 1; });
    return rows;
  };
  W.slots = function (S, d, cy0) { const cy = cy0 || cyOf(S), two = G.Era.champs(cy).n > 1; return Math.max(3, Math.round(W.sizeOf(d, cy) * D.CHAMPS_SHARE * (two ? 1.5 : 1))); };
  W.dcmpEvent = (S, distId) => S.wseason.events.find(e => e.kind === 'dcmp' && e.dist === distId);
  // after the last district events: the District Championship field (the top of the points list, plus every district
  // Impact Award winner)
  function decideDcmp(S) {
    const ws = S.wseason;
    W.districtsOf(S, ws.cy).forEach(d => {
      const nd = W.dcmpSize(d, ws.cy), st = W.standings(S, d.id), e = W.dcmpEvent(S, d.id); if (!e) return;
      const field = st.slice(0, nd).map(r => r.num);
      ws.events.filter(x => x.dist === d.id && x.kind === 'regional' && x.res && x.res.impact).forEach(x => { if (!field.includes(x.res.impact)) field.push(x.res.impact); });
      ws.dq[d.id] = { dcmp: field.slice(), cut: st[Math.min(st.length, nd) - 1] ? st[Math.min(st.length, nd) - 1].pre : 0, champs: null };
      e.teams = field.filter(n => n !== S.team.num);
      if (S.team.home === d.id) {
        const me = st.find(r => r.num === S.team.num), in_ = field.includes(S.team.num);
        S.season.dcmpQualified = in_; S.season.dRank = me ? me.rank : null; S.season.dPts = me ? me.pre : 0;
        G.Career.inbox(S, in_ ? 'Qualified for the District Championship!' : 'District season over', in_
          ? 'You finished ' + U.ord(me.rank) + ' of ' + st.length + ' in the ' + d.name + ' with ' + me.pre + ' district points. The top ' + nd + ' play the ' + e.name + ' in week 7, where every point counts three times. Registration is ' + U.money(D.FEES.dcmp) + '. Attend from the HQ screen.'
          : 'You finished ' + U.ord(me ? me.rank : st.length) + ' of ' + st.length + ' in the ' + d.name + ' with ' + (me ? me.pre : 0) + ' district points. The District Championship cut-off was ' + ws.dq[d.id].cut + '. Your season ends here.', 'event');
      }
    });
  }
  // after the District Championships: each district fills its Championship slots
  function decideChamps(S) {
    const ws = S.wseason;
    W.districtsOf(S, ws.cy).forEach(d => {
      if (!ws.dq[d.id]) return;
      const e = W.dcmpEvent(S, d.id), st = W.standings(S, d.id), n = W.slots(S, d), list = [], add = (num, why) => { if (num != null && !list.some(x => x.num === num)) list.push({ num, why }); };
      if (e && e.res) { add(e.res.impact, 'District Championship Impact Award'); add(e.res.ei, 'District Championship Engineering Inspiration'); add(e.res.ras, 'District Championship Rookie All-Star'); (e.res.winners || []).forEach(x => add(x, 'District Championship winner')); }
      for (const r of st) { if (list.length >= n) break; add(r.num, U.ord(r.rank) + ' in the ' + d.name + ' (' + r.total + ' points)'); }
      ws.dq[d.id].champs = list.map(x => x.num); ws.dq[d.id].slots = n;
      list.forEach(x => { if (x.num !== S.team.num) ws.q[x.num] = x.why; });
      if (S.team.home === d.id) {
        const me = list.find(x => x.num === S.team.num), row = st.find(r => r.num === S.team.num);
        S.season.dRank = row ? row.rank : S.season.dRank; S.season.dTotal = row ? row.total : 0;
        if (me && !S.season.champsQualified) { S.season.champsQualified = true; S.season.champsReason = me.why; }
        G.Career.inbox(S, me ? 'Qualified for the Championship!' : 'No Championship place', me
          ? me.why + '. The ' + d.name + ' sends ' + n + ' teams to the Championship this year.'
          : 'The ' + d.name + ' sends ' + n + ' teams to the Championship. You finished ' + U.ord(row ? row.rank : st.length) + ' with ' + (row ? row.total : 0) + ' points.', 'event');
      }
    });
    // regional teams, from 2025: beyond the winners and award teams, the Regional Pool takes the best of the rest by
    // their event points (before that, the wildcards at each regional were the only other way in)
    const cy = ws.cy, two = G.Era.champs(cy).n > 1, regN = count(S, t => !t.home), want = Math.round(regN * D.CHAMPS_SHARE * (two ? 1.5 : 1));
    const have = Object.keys(ws.q).filter(n => S.teams[n] && !S.teams[n].home).length;
    if (have < want && !G.Era.wildcards(cy)) {
      Object.values(S.teams).filter(t => !t.home && !ws.q[t.num]).map(t => ({ t, p: (ws.rec[t.num] || []).map(r => r.dp).sort((a, b) => b - a).slice(0, 2).reduce((s, x) => s + x, 0) }))
        .sort((p, q) => q.p - p.p).slice(0, want - have).forEach(x => { ws.q[x.t.num] = 'Regional Pool (' + x.p + ' points)'; });
    }
  }
  // a competition week is over: play every event of that week that nobody watched, then settle what it decides
  W.weekDone = function (S, week) {
    if (!W.on(S) || !S.wseason) return;
    const ws = S.wseason, rng = G.R;
    if (!ws.scheduled) W.schedule(S, rng);
    ws.events.filter(e => e.week === week && !e.done).forEach(e => W.simEvent(S, e, rng));
    if (week === 5 && !ws.dcmpSet) { ws.dcmpSet = true; decideDcmp(S); }
    if (week === 7 && !ws.champsSet) { ws.champsSet = true; decideChamps(S); }
    // a short line for the inbox: who won near home this week
    const near = ws.events.filter(e => e.week === week && e.done && e.res && e.res.winners.length && (S.team.home ? e.dist === S.team.home : (!e.dist && (e.region === S.team.region))) && !e.teams.includes(S.team.num));
    if (near.length) {
      const nm = n => n + ' ' + ((S.teams[n] || {}).name || '');
      G.Career.inbox(S, 'Results: week ' + week, near.map(e => e.name + ': won by ' + e.res.winners.map(nm).join(', ') + (e.res.impact ? '. Impact Award: ' + nm(e.res.impact) : '') + '.').join('\n') +
        (S.team.home && week <= 5 ? '\n\n' + W.myLine(S) : ''), 'event');
    }
  };
  W.myLine = function (S) {
    const d = W.myDistrict(S); if (!d) return '';
    const st = W.standings(S, d.id), me = st.find(r => r.num === S.team.num);
    return me ? 'District standings: ' + U.ord(me.rank) + ' of ' + st.length + ' with ' + me.pre + ' points after ' + me.played + ' of 2 events (the top ' + W.dcmpSize(d, S.wseason.cy) + ' reach the District Championship).' : '';
  };
  // the player's division at the Championship: teams that really qualified (from the player's half of the world in
  // the two-Championship years), topped up with the strongest of the rest
  // Your Championship division: the qualified elite teams are spread over the divisions (yours gets its share, and at least
  // one), the rest drawn from the qualified teams. Decided once (ws.cmp): the other divisions' elite teams lead their
  // alliances on Einstein.
  W.champsField = function (S, n) {
    const ws = S.wseason, CH = G.Career.champs(S), side = t => G.Era.champsSide(t.region), rng = G.R;
    if (ws.cmp && ws.cmp.n === n) return ws.cmp.list;
    let q = Object.keys(ws.q).map(Number).filter(x => S.teams[x] && x !== S.team.num && (CH.n < 2 || side(S.teams[x]) === CH.side));
    const nd = Math.max(2, CH.divs || 6), el = rng.shuffle(q.filter(x => S.teams[x].elite)), divs = [];
    for (let i = 0; i < nd; i++) divs.push([]);
    el.forEach((x, i) => divs[i % nd].push(x));
    // your division is sure to have its share (none sure on easy, at least one on normal, two on hard)
    for (let k = el.length - 1; divs[0].length < W.eliteCfg(S).div && k >= 0; k--) if (!divs[0].includes(el[k])) divs[0].push(el[k]);
    const mine = divs[0].slice();
    { const pool = q.filter(x => !S.teams[x].elite).map(x => { const st = S.teams[x].str, z = (st - 73) / 14; return { x, w: (Math.exp(-z * z) + 0.08) * (st > 90 ? 0.5 : 1) }; }), out = mine.slice();
      while (out.length < n && pool.length) { const p = rng.wpick(pool, c => c.w); out.push(p.x); pool.splice(pool.indexOf(p), 1); }
      q = out; }
    if (q.length < n) { const rest = Object.values(S.teams).filter(t => !q.includes(t.num) && !t.elite && (CH.n < 2 || side(t) === CH.side)).sort((a, b) => b.str - a.str).slice(0, n - q.length).map(t => t.num); q = q.concat(rest); }
    if (S.phase === 'champs') ws.cmp = { n, list: q, divs: divs.slice(1).map(d => d.filter(x => !q.includes(x))) };
    return q;
  };
  W.qualifiedCount = S => (S.wseason ? Object.keys(S.wseason.q).length : 0);
  // numbers for the World screen
  W.summary = function (S) {
    const ws = S.wseason, cy = ws.cy, ds = W.districtsOf(S, cy), all = Object.keys(S.teams).length + 1, inD = count(S, t => !!t.home) + (S.team.home ? 1 : 0);
    return { cy, teams: all, district: inD, regional: all - inD, regionals: ws.events.filter(e => !e.dist && e.kind === 'regional').length, dEvents: ws.events.filter(e => e.dist && e.kind === 'regional').length, districts: ds.length,
      rookies: count(S, t => t.ry === cy), last: S.world.last || null };
  };
})();
