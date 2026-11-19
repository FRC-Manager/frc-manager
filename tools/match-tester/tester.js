'use strict';
/* FRC Manager match tester: any game, six random robots on random strategies, drawn with the game's own renderer.
   A match is reproduced by its game, parts setting and seed, plus the changes made while it ran (breaking or
   disabling a robot, dropping a disabled one somewhere), which Replay applies again at the same moments. */
(function () {
  const E = G.Engine, U = G.U, $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const T = { year: G.SEASON_YEARS[G.SEASON_YEARS.length - 1], era: 'own', seed: 1, m: null, speed: 1, acc: 0, last: 0, domT: 0, setup: [], acts: [], todo: [], placing: -1, paths: true, labels: true, strR: 'random', strB: 'random' };
  // (3.5.7) how strong each alliance's three robots are: random (any strength, as it always was), a band of strengths, or three elite teams
  const STR = { random: [10, 95], low: [10, 35], avg: [40, 62], high: [72, 92], elite: [93, 98] }, STR_N = { random: 'random', low: 'low', avg: 'average', high: 'high', elite: 'all elite' };
  const strTag = () => (T.strR !== 'random' ? '-r' + T.strR : '') + (T.strB !== 'random' ? '-b' + T.strB : '');
  const PACE_N = { push: 'Push', bal: 'Balanced', cons: 'Conserve' };
  const COLS = [['#e8b400', '#ffcf4a'], ['#2f80ed', '#9cc4ff'], ['#27ae60', '#9be7b4'], ['#c0392b', '#ff9b8a'], ['#8e44ad', '#d2a8ff'], ['#16a085', '#7fe3d0'], ['#d35400', '#ffbf8a'], ['#7f8c8d', '#d5dbdb'], ['#e84393', '#ffb3d9'], ['#2d3436', '#b2bec3']];

  // ---------------- the robots ----------------
  // The parts of the day: the game's own year (motors, swerve modules, cameras) or today's parts for every game
  const eraOf = G.Era.of;
  function setEra() { G.Era.of = T.era === 'own' ? () => G.Era.at(G.singleCy(T.year)) : eraOf; } // a fantasy game's own year is 2027
  // Six teams of any strength, each with a random strategy (role, pace, target, endgame), not the season's meta
  function makeSetup(year, seed) {
    const rng = G.makeRng(seed), Sz = G.Seasons[year];
    const pool = Object.values(G.AI.makePool(rng, 40, 0, 2022)), teams = [];
    while (teams.length < 6) { const t = rng.pick(pool); if (!teams.includes(t)) teams.push(t); }
    const roles = ['score', 'score', 'score', 'score', 'defend'].concat(year === 2024 || year === 2026 ? ['feed'] : []);
    return teams.map((t, i) => {
      const lvl = i < 3 ? T.strR : T.strB, band = STR[lvl] || STR.random, base = rng.int(10, 95); // one draw whatever the setting, so a seed keeps its strategies at every strength
      t.str = lvl === 'random' ? base : Math.round(band[0] + (band[1] - band[0]) * (base - 10) / 85); if (lvl !== 'random') t.elite = lvl === 'elite'; t.rb = null;
      const e = G.AI.entry(t, year, rng.range(0.85, 1.05), 1, rng), col = rng.pick(COLS);
      e.look = Object.assign({}, e.look, { c1: col[0], c2: col[1] });
      e.plan = { role: rng.pick(roles), pace: rng.pick(['push', 'bal', 'bal', 'cons']), target: rng.pick(Sz.coachTargets).id, endTiming: rng.pick(['early', 'std', 'std', 'late']),
        endLevel: rng.chance(0.25) ? rng.int(0, Sz.endNames.length - 1) : 9, avoid: rng.chance(0.2), rpHunt: rng.chance(0.5) };
      e.a = i < 3 ? 'red' : 'blue'; e.str = t.str; e.name = t.name;
      return e;
    });
  }
  function start(newSeed, keepActs) {
    if (newSeed) T.seed = Math.floor(Math.random() * 999999) + 1;
    setEra();
    T.setup = makeSetup(T.year, T.seed);
    const ent = a => T.setup.filter(e => e.a === a).map(e => Object.assign({}, e, { plan: Object.assign({}, e.plan) }));
    T.m = E.create({ year: T.year, red: ent('red'), blue: ent('blue'), seed: T.seed, headless: false, calls: 0 });
    T.acts = keepActs ? T.acts : []; T.todo = T.acts.slice(); T.acc = 0; T.placing = -1;
    $('seed').value = T.seed; $('year').value = T.year;
    try { history.replaceState(null, '', '#' + T.year + '-' + T.seed + (T.era === 'modern' ? '-modern' : '') + strTag()); } catch (e) { /* file:// may refuse */ }
    renderBots(); dom(); report();
  }

  // ---------------- changes made while it runs ----------------
  const slot = r => (r.a === 'red' ? 'R' : 'B') + (r.slot + 1);
  function apply(a) {
    const r = T.m.robots[a.i]; if (!r) return;
    const say = msg => T.m.log.push({ t: T.m.t, a: r.a, msg: 'Tester: ' + r.team + ' ' + msg, kind: 'tester' });
    if (a.what === 'disable') { r.dead = true; r.st = 'dead'; r.path = []; r.stats.faults.push('Disabled (tester)'); say('disabled'); }
    if (a.what === 'intake') { r.perm.intake = true; r.stats.faults.push('Intake broke (tester)'); say('intake broken'); }
    if (a.what === 'scorer') { r.perm.scorer = true; r.stats.faults.push('Scorer broke (tester)'); say('scorer broken'); }
    if (a.what === 'place') { r.x = r.px = a.x; r.y = r.py = a.y; say('moved to (' + a.x.toFixed(1) + ', ' + a.y.toFixed(1) + ')'); }
  }
  function act(i, what, x, y) {
    const a = { t: Math.round(T.m.t * 10) / 10, i, what };
    if (x != null) { a.x = Math.round(x * 100) / 100; a.y = Math.round(y * 100) / 100; }
    T.acts.push(a); apply(a);
    if (what === 'disable') { T.placing = i; }
    renderBots(); report();
  }

  // ---------------- drawing ----------------
  function aimFor(m, r) {
    if (m.R.aimAt) return m.R.aimAt(m, r);
    if (m.year === 2022) return m.hub; if (m.year === 2024) return m.spk[r.a]; if (m.year === 2026) return m.hub[r.a]; return null;
  }
  function draw() {
    const m = T.m, cv = $('cv'), ctx = cv.getContext('2d'), s = cv.width / E.FW;
    G.Render.field(ctx, m.year, s, m);
    const al = m.done || T.speed === 0 ? 1 : U.clamp(T.acc / 0.1, 0, 1);
    const pos = r => ({ x: (r.px + (r.x - r.px) * al) * s, y: (r.py + (r.y - r.py) * al) * s });
    if (T.paths) m.robots.forEach(r => {
      if (r.dead || r.st !== 'move' || !r.path.length) return;
      const p = pos(r), col = r.a === 'red' ? 'rgba(255,120,120,0.75)' : 'rgba(130,175,255,0.75)';
      ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); r.path.forEach(q => ctx.lineTo(q.x * s, q.y * s)); ctx.stroke();
      ctx.setLineDash([]); const g = r.goal || r.path[r.path.length - 1];
      ctx.beginPath(); ctx.arc(g.x * s, g.y * s, 9, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    });
    m.robots.forEach(r => {
      const aiming = G.Render.animate(m, r); // the reach, the intake and the climber, as in the game
      const rr = Object.create(r), P = G.Render.pose(r, al); rr.x = P.x; rr.y = P.y; rr.hd = P.hd;
      const g = aimFor(m, r);
      G.Render.robot(ctx, s, rr, { aim: g ? Math.atan2(g.y - rr.y, g.x - rr.x) : null, year: m.year, aimLight: aiming && m.year < 2023 && (r.cap.visionLvl || 0) >= 1 }); // (no career here: the green light goes by the game's own year)
    });
    G.Render.fx(ctx, s, m);
    if (T.labels) m.robots.forEach(r => {
      const p = pos(r), txt = slot(r) + ' ' + (r.dead ? (r.tipped ? 'TIPPED' : 'DISABLED') : r.label || r.st);
      ctx.save(); ctx.font = '600 12px Inter, system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      const w = ctx.measureText(txt).width + 10, x = U.clamp(p.x - w / 2, 2, ctx.canvas.width - w - 2), y = Math.max(2, p.y - 0.62 * s - 18);
      ctx.fillStyle = 'rgba(8,10,14,0.78)'; ctx.fillRect(x, y, w, 17);
      ctx.fillStyle = r.mem && r.mem.broken ? '#ffb0b0' : r.mem && r.mem.tmpDef > m.t ? '#d6c4ff' : r.a === 'red' ? '#ffc2c2' : '#c8dcff';
      ctx.fillText(txt, x + 5, y + 13); ctx.restore();
    });
  }
  function renderBots() {
    const m = T.m;
    $('bots').innerHTML = '<tr><th>Robot</th><th>Strategy</th><th>Now</th><th>Pts</th><th></th></tr>' + m.robots.map((r, i) => {
      const e = T.setup.find(x => x.team === r.team) || {};
      return '<tr class="' + r.a + (r.dead ? ' dead' : '') + '"><td><b>' + slot(r) + ' · ' + r.team + '</b><div class="xs muted">' + esc(e.arch || '') + ' · strength ' + (e.str || '?') + '</div></td>' +
        '<td class="xs">' + esc(r.plan.role) + ' · ' + esc(PACE_N[r.plan.pace] || r.plan.pace) + ' · target ' + esc(r.plan.target) + '<div class="muted">endgame ' + esc(r.plan.endTiming) + (r.plan.endLevel < 9 ? ' (level ' + r.plan.endLevel + ')' : '') + (r.plan.avoid ? ' · avoids contact' : '') + '</div></td>' +
        '<td class="xs" id="now' + i + '"></td><td class="num" id="pts' + i + '"></td>' +
        '<td class="nowrap">' + (r.dead ? '' : '<button class="btn sm" data-act="intake" data-i="' + i + '" title="Break its intake for good">Break intake</button> <button class="btn sm" data-act="scorer" data-i="' + i + '" title="Break its scorer for good">Break scorer</button> <button class="btn sm bad" data-act="disable" data-i="' + i + '" title="Disable it, then click the field to drop it somewhere">Disable</button>') + '</td></tr>';
    }).join('');
  }
  // (3.5.7) as in the game: a part of the page is written only when its text has changed
  const put = (el, html) => { if (el && el.liveHtml !== html) { el.liveHtml = html; el.innerHTML = html; return true; } return false; };
  function dom() {
    const m = T.m, tot = s => s.auto + s.tele + s.end + s.foul;
    $('scR').textContent = tot(m.score.red); $('scB').textContent = tot(m.score.blue);
    $('clk').textContent = U.fmtTime(m.phase === 'auto' ? m.T.auto - m.t : m.total - m.t);
    $('phs').textContent = m.done ? 'FINAL' + (m.result ? ' · RP ' + m.result.red.rp + ' : ' + m.result.blue.rp : '') : m.phase === 'auto' ? 'AUTONOMOUS' : m.inEnd ? 'ENDGAME' : 'TELEOP';
    m.robots.forEach((r, i) => {
      const fl = [];
      if (r.mem && r.mem.broken) fl.push('<span class="mt-flag bad">' + esc(r.mem.broken) + '</span>');
      if (r.mem && r.mem.tmpDef > m.t) fl.push('<span class="mt-flag ai">defending for a while</span>');
      if (r.stats.gaveUp) fl.push('<span class="mt-flag warn">gave up ' + r.stats.gaveUp + '×</span>');
      if (r.prog && r.prog.n >= 2) fl.push('<span class="mt-flag warn">stuck</span>');
      if (r.stats.faults.length) fl.push('<span class="mt-flag">' + esc(r.stats.faults.slice(-2).join(', ')) + '</span>');
      const nw = $('now' + i), nwHtml = esc(r.dead ? (r.tipped ? 'TIPPED' : 'DISABLED') : r.label || r.st) + (r.held ? ' <span class="muted">(holding ' + r.held + ')</span>' : '') + (r.plan.role !== (T.setup.find(x => x.team === r.team) || {}).plan.role ? ' <span class="mt-flag ai">now ' + esc(r.plan.role) + '</span>' : '') + '<div>' + fl.join('') + '</div>'; put(nw, nwHtml);
      const pt = $('pts' + i); if (pt && pt.textContent !== String(r.stats.pts)) pt.textContent = r.stats.pts;
    });
    const lg = $('log'), atEnd = lg.scrollTop + lg.clientHeight >= lg.scrollHeight - 8;
    if (put(lg, m.log.slice(-160).map(l => '<div class="' + (l.kind === 'fault' || l.kind === 'foul' ? 'fault' : l.kind === 'ai' ? 'ai' : l.kind === 'tester' ? 'tester' : l.a || '') + '">' + U.fmtTime(Math.max(0, l.t)) + ' ' + esc(l.msg) + '</div>').join('')) && atEnd) lg.scrollTop = lg.scrollHeight;
    // (3.5.7) the ranking point bars, as the game shows them beside a match
    { const bar = (v, max, col) => '<div class="bar"><i style="width:' + U.clamp(100 * v / (max || 100), 0, 100) + '%;background:' + col + '"></i></div>';
      const bon = a => m.R.bonus(m, a).map(b => '<div class="rp-item"><div class="row"><span>' + esc(b.name) + '</span><span class="sp"></span><span class="' + (b.ok ? 'good b' : 'muted') + '">' + b.val + '/' + b.thr + (b.ok ? ' ✔' : '') + '</span></div>' + bar(b.val, b.thr, a === 'red' ? 'var(--red)' : 'var(--blue)') + '</div>').join('');
      const hud = a => (m.R.hud ? m.R.hud(m, a) : []).map(x => '<span class="tag ' + (a === 'red' ? 'bad' : 'info') + '">' + esc(x) + '</span>').join(' ');
      put($('rp'), '<div class="xs red b mb">RED ' + hud('red') + '</div>' + bon('red') + '<div class="hr"></div><div class="xs blue b mb">BLUE ' + hud('blue') + '</div>' + bon('blue')); }
    { const p = T.perf; if (p && p.n) { const now = performance.now(), fps = p.n * 1000 / Math.max(1, now - p.t0); $('perf').textContent = Math.round(fps) + ' pictures a second · ' + (p.ms / p.n).toFixed(1) + ' ms each'; if (now - p.t0 > 2000) T.perf = null; } }
  }
  function report() {
    const m = T.m, Sz = G.Seasons[T.year], tot = s => s.auto + s.tele + s.end + s.foul;
    const lines = ['FRC Manager match tester · v' + G.VERSION, 'Game ' + T.year + ' ' + Sz.name + ' · seed ' + T.seed + ' · parts ' + (T.era === 'own' ? "of the game's year" : 'of today') + (strTag() ? ' · strength: red ' + STR_N[T.strR] + ', blue ' + STR_N[T.strB] : ''),
      'At ' + U.fmtTime(m.phase === 'auto' ? m.T.auto - m.t : m.total - m.t) + ' (' + m.t.toFixed(1) + ' s in) · Red ' + tot(m.score.red) + ' : ' + tot(m.score.blue) + ' Blue'];
    m.robots.forEach(r => lines.push(slot(r) + ' ' + r.team + ': ' + r.plan.role + ', ' + r.plan.pace + ', target ' + r.plan.target + ' · ' + (r.dead ? 'disabled' : r.label || r.st) + ' at (' + r.x.toFixed(1) + ', ' + r.y.toFixed(1) + ')'));
    if (T.acts.length) lines.push('Changes: ' + T.acts.map(a => a.t.toFixed(1) + ' s ' + slot(m.robots[a.i]) + ' ' + a.what + (a.x != null ? ' (' + a.x + ', ' + a.y + ')' : '')).join('; '));
    lines.push('Open at this moment: index.html#' + T.year + '-' + T.seed + (T.era === 'modern' ? '-modern' : '') + strTag() + '@' + m.t.toFixed(1) + (T.acts.length ? ' (then apply the changes above)' : ''));
    lines.push('What looked off: ');
    const el = $('report'), keep = el.value.split('What looked off: ')[1];
    el.value = lines.join('\n') + (keep && T.reportSeed === T.seed + ':' + T.year ? keep : '');
    T.reportSeed = T.seed + ':' + T.year;
  }

  // ---------------- the loop ----------------
  function stepOnce() {
    E.step(T.m);
    while (T.todo.length && T.todo[0].t <= T.m.t + 1e-6) apply(T.todo.shift());
  }
  function loop(ts) {
    if (!T.last) T.last = ts;
    const dt = Math.min(0.1, (ts - T.last) / 1000); T.last = ts;
    const m = T.m;
    if (m && T.speed > 0 && !m.done) {
      T.acc += dt * T.speed;
      let n = 0;
      while (T.acc >= 0.1 && !m.done && n < 400) { stepOnce(); T.acc -= 0.1; n++; }
      if (m.done) { renderBots(); report(); }
    }
    // (3.5.7) as in the game: a picture when 13 ms have passed since the last (about 72 a second on a fast screen), the tables five times a second
    if (m) { if (ts - (T.drawT || 0) >= 13) { const t0 = performance.now(); draw(); const p = T.perf || (T.perf = { n: 0, ms: 0, t0 }); p.n++; p.ms += performance.now() - t0; T.drawT = ts; } if (ts - T.domT > 200) { dom(); T.domT = ts; } }
    requestAnimationFrame(loop);
  }
  function setSpeed(v) { T.speed = v; document.querySelectorAll('[data-spd]').forEach(b => b.classList.toggle('sel', Number(b.dataset.spd) === v)); if (!v) report(); }

  // ---------------- controls ----------------
  function init() {
    $('ver').textContent = 'v' + G.VERSION;
    $('year').innerHTML = G.allGames().map(y => '<option value="' + y + '">' + (G.isFantasy(y) ? 'Fantasy: ' : y + ' ') + esc(G.Seasons[y].name) + '</option>').join('');
    // #2017-4242 plays that match; -modern for today's parts; -rhigh -belite for the alliances' strength; @67 jumps straight to 67 s in (paused there)
    const hm = /^#(\d{4})-(\d+)(-modern)?(?:-r([a-z]+))?(?:-b([a-z]+))?(?:@([\d.]+))?$/.exec(location.hash);
    if (hm && G.Seasons[Number(hm[1])]) { T.year = Number(hm[1]); T.seed = Number(hm[2]); T.era = hm[3] ? 'modern' : 'own'; T.strR = STR[hm[4]] ? hm[4] : 'random'; T.strB = STR[hm[5]] ? hm[5] : 'random'; T.jump = hm[6] ? Number(hm[6]) : 0; } else T.seed = Math.floor(Math.random() * 999999) + 1;
    $('era').value = T.era; $('strR').value = T.strR; $('strB').value = T.strB;
    $('strR').onchange = () => { T.strR = $('strR').value; start(false); }; $('strB').onchange = () => { T.strB = $('strB').value; start(false); };
    $('year').onchange = () => { T.year = Number($('year').value); start(true); };
    $('era').onchange = () => { T.era = $('era').value; start(false); };
    $('go').onclick = () => { const v = parseInt($('seed').value, 10); if (v > 0) { T.seed = v; start(false); } };
    $('seed').onkeydown = e => { if (e.key === 'Enter') $('go').click(); };
    $('new').onclick = () => start(true);
    $('restart').onclick = () => start(false, true);
    $('step').onclick = () => { setSpeed(0); if (!T.m.done) { stepOnce(); dom(); report(); } };
    document.querySelectorAll('[data-spd]').forEach(b => { b.onclick = () => setSpeed(Number(b.dataset.spd)); });
    $('paths').onchange = e => { T.paths = e.target.checked; };
    $('labels').onchange = e => { T.labels = e.target.checked; };
    $('bots').onclick = e => { const b = e.target.closest('[data-act]'); if (b) act(Number(b.dataset.i), b.dataset.act); };
    $('cv').onclick = e => {
      if (T.placing < 0) return;
      const cv = $('cv'), rc = cv.getBoundingClientRect(), s = cv.width / E.FW;
      const x = U.clamp((e.clientX - rc.left) * cv.width / rc.width / s, E.RR, E.FW - E.RR), y = U.clamp((e.clientY - rc.top) * cv.height / rc.height / s, E.RR, E.FH - E.RR);
      const i = T.placing; T.placing = -1; act(i, 'place', x, y);
    };
    $('copy').onclick = () => {
      report(); const el = $('report'); el.select();
      const done = ok => { $('copied').textContent = ok ? 'Copied' : 'Select the text and copy it'; setTimeout(() => { $('copied').textContent = ''; }, 2500); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(el.value).then(() => done(true), () => done(document.execCommand && document.execCommand('copy')));
      else done(document.execCommand && document.execCommand('copy'));
    };
    setInterval(() => { const c = $('cv'); c.classList.toggle('placing', T.placing >= 0); $('placeHint').textContent = T.placing >= 0 ? 'Click the field to drop the disabled robot there (or leave it where it is)' : ''; }, 200);
    setSpeed(1);
    start(false);
    if (T.jump > 0) { while (!T.m.done && T.m.t < T.jump - 1e-6) stepOnce(); setSpeed(0); renderBots(); dom(); report(); draw(); }
    requestAnimationFrame(loop);
  }
  // for scripted checks (and a curious console): the state, a change, a tick
  window.MatchTester = { T, act, start, step: stepOnce, refresh() { renderBots(); dom(); report(); draw(); } };
  init();
})();
