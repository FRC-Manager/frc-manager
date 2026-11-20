/* FRC Manager — robot viewer (3.5.5): build any robot of any season and see it as the game draws it.
   State lives in `st` and in the address; nothing is saved, no career is touched. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id), Rd = G.Render, esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const years = Object.keys(G.Seasons).filter(k => /^\d+$/.test(k)).map(Number).sort((a, b) => a - b), fantasy = y => y > 2100;
  const subsOf = y => G.Seasons[y].subs.filter(sd => sd.id !== 'soft' && (sd.concepts || []).length);
  // what a robot can hold in each game: [label, the game's piece type]
  const HOLD = { 2016: [['a boulder', 'boulder']], 2017: [['a gear', 'gear']], 2018: [['a cube', 'pcube']], 2019: [['a hatch panel', 'hatch'], ['cargo', 'cargo19']], 2020: [['power cells', 'cell']], 2022: [['cargo', '']],
    2023: [['a cone', 'cone'], ['a cube', 'cube']], 2024: [['a note', '']], 2025: [['coral', 'coral'], ['algae', 'algae']], 2026: [['fuel', '']], 2101: [['pinballs', 'pinball']], 2102: [['drums', 'drum']], 2103: [['discs', 'disc']],
    2104: [['a girder', 'girder']], 2105: [['cells', 'gcell']], 2106: [['a stone', 'stoneB']], 2107: [['a container', 'cont']], 2108: [['ore', '']], 2109: [['a ring', '']], 2110: [['a crate', 'crate']] };
  const st = { y: 2025, sub: {}, ver: 2, vis: 1, team: 5432, a: 'blue', c1: '#2f6fd0', c2: '#ffcf4a', only: '', me: 1, vi: 1, vx: 0, vc: 0, aim: 0, hd: 0, hold: 0, gl: 0, numAt: '', led: 'off' };   // gl: the green ring light a robot with cameras aims with, before AprilTags
  let playT = null;

  // ---------------- builds
  const pick = (y, how) => { const o = {}; subsOf(y).forEach(sd => { const cs = sd.concepts, n = cs.length; let c;
    if (how === 'none') c = null; else if (how === 'rnd') c = cs[Math.floor(Math.random() * n)]; else if (how === 'best') c = cs[n - 1]; else c = cs[sd.id === 'drive' || sd.id === 'frame' ? n - 1 : Math.min(1, n - 1)];
    o[sd.id] = c && c.id !== 'none' ? c.id : ''; }); return o; };
  const lookOf = s => { const subs = {}; subsOf(s.y).forEach(sd => { const id = s.sub[sd.id]; if (id) subs[sd.id] = { concept: id, ver: id === 'none' ? 0 : s.ver, stats: {} }; });
    const lk = G.Cap.look(s.y, subs, { visionLvl: s.vis }); lk.c1 = s.c1; lk.c2 = s.c2; if (s.numAt === 'side') lk.numAt = 'side'; return lk; };

  // ---------------- drawing
  function drawSide() {
    const cv = $('side'), lk = lookOf(st);
    Rd.robotSide(cv.getContext('2d'), cv.width, cv.height, lk, st.a, st.team, st.only ? { only: [st.only, 'floor'] } : null);
    $('build').textContent = G.Seasons[st.y].name + ': ' + (subsOf(st.y).filter(sd => st.sub[sd.id] && st.sub[sd.id] !== 'none').map(sd => sd.name + ' = ' + sd.concepts.find(c => c.id === st.sub[sd.id]).name).join(' · ') || 'an empty chassis');
  }
  function drawTop() {
    const cv = $('top'), ctx = cv.getContext('2d'), W = cv.width, H = cv.height, s = 410, lk = lookOf(st), hl = HOLD[st.y] || [], h = st.hold ? hl[st.hold - 1] : null;
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#272d34'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1; for (let x = (W / 2) % (s / 2); x < W; x += s / 2) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); } for (let y = (H / 2) % (s / 2); y < H; y += s / 2) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    const store = lk.hopper || (st.y === 2020 || st.y === 2105 ? 5 : st.y === 2022 ? 2 : st.y === 2101 ? 4 : 1), hd = st.hd * Math.PI / 180;
    const r = { x: W / 2 / s, y: H / 2 / s, hd, look: lk, a: st.a, team: st.team, isPlayer: !!st.me, held: h ? (lk.hopper ? Math.round(lk.hopper * 0.6) : store > 1 ? store - 1 : 1) : 0, heldType: h && h[1] ? h[1] : undefined, year: st.y, cap: { storage: store }, vi: st.vi, vx: st.vx, vc: st.vc, led: st.led };
    Rd.robot(ctx, s, r, { year: st.y, aim: hd + st.aim * Math.PI / 180, noLabel: true, aimLight: !!st.gl && st.vis > 0, rsl: playT ? 'blink' : 'on', rslLit: Math.floor(performance.now() / 450) % 2 === 0 });
  }
  const draw = () => { drawSide(); drawTop(); };

  // ---------------- the address keeps the robot
  let hashT = 0;
  const toHash = () => { clearTimeout(hashT); hashT = setTimeout(writeHash, 200); };   // (a browser ignores the address being changed many times a second)
  function writeHash() { const p = ['y=' + st.y]; subsOf(st.y).forEach(sd => { if (st.sub[sd.id]) p.push(sd.id + '=' + st.sub[sd.id]); });
    p.push('ver=' + st.ver, 'vis=' + st.vis, 'team=' + st.team, 'a=' + st.a, 'c1=' + st.c1.slice(1), 'c2=' + st.c2.slice(1)); if (st.only) p.push('only=' + st.only); if (!st.me) p.push('me=0'); if (st.numAt) p.push('num=side');
    ['vi', 'vx', 'vc'].forEach(k => { if (st[k] !== (k === 'vi' ? 1 : 0)) p.push(k + '=' + Math.round(st[k] * 100)); }); if (st.aim) p.push('aim=' + st.aim); if (st.hd) p.push('hd=' + st.hd); if (st.hold) p.push('hold=' + st.hold); if (st.gl) p.push('gl=1'); if (st.led && st.led !== 'off') p.push('led=' + st.led);
    try { history.replaceState(null, '', '#' + p.join('&')); } catch (e) { location.hash = p.join('&'); } }
  function fromHash() { const q = {}; decodeURIComponent(location.hash.slice(1)).split('&').forEach(kv => { const i = kv.indexOf('='); if (i > 0) q[kv.slice(0, i)] = kv.slice(i + 1); });
    const y = Number(q.y); if (!G.Seasons[y]) return false;
    st.y = y; st.sub = {}; subsOf(y).forEach(sd => { st.sub[sd.id] = sd.concepts.some(c => c.id === q[sd.id]) ? q[sd.id] : ''; });
    st.ver = Math.min(3, Math.max(1, Number(q.ver) || 2)); st.vis = Math.min(2, Math.max(0, Number(q.vis) || 0)); st.team = Number(q.team) || 5432; st.a = q.a === 'red' ? 'red' : 'blue';
    if (/^[0-9a-f]{6}$/i.test(q.c1 || '')) st.c1 = '#' + q.c1; if (/^[0-9a-f]{6}$/i.test(q.c2 || '')) st.c2 = '#' + q.c2;
    st.only = subsOf(y).some(sd => sd.id === q.only) ? q.only : ''; st.me = q.me === '0' ? 0 : 1; st.numAt = q.num === 'side' ? 'side' : '';
    st.vi = q.vi == null ? 1 : Math.min(1, Math.max(0, Number(q.vi) / 100)); st.vx = Math.min(1, Math.max(0, (Number(q.vx) || 0) / 100)); st.vc = Math.min(1, Math.max(0, (Number(q.vc) || 0) / 100));
    st.led = Rd.LED_NAMES[q.led] ? q.led : 'off'; st.gl = q.gl === '1' ? 1 : 0; st.aim = Number(q.aim) || 0; st.hd = Number(q.hd) || 0; st.hold = Math.min((HOLD[y] || []).length, Math.max(0, Number(q.hold) || 0)); return true; }

  // ---------------- controls
  function fillSeason() {
    $('subs').innerHTML = subsOf(st.y).map(sd => '<label>' + esc(sd.name) + ' <select data-sub="' + sd.id + '"><option value="">(not built)</option>' + sd.concepts.filter(c => c.id !== 'none').map(c => '<option value="' + c.id + '">' + esc(c.name) + '</option>').join('') + '</select></label>').join('');
    $('only').innerHTML = '<option value="">the whole robot</option>' + subsOf(st.y).map(sd => '<option value="' + sd.id + '">only: ' + esc(sd.name) + '</option>').join('');
    $('hold').innerHTML = '<option value="0">nothing</option>' + (HOLD[st.y] || []).map((h, i) => '<option value="' + (i + 1) + '">' + esc(h[0]) + '</option>').join('');
    $('cards').innerHTML = '';
  }
  function sync() {                                                                    // the state, written into the controls
    $('year').value = st.y; document.querySelectorAll('#subs select').forEach(s => { s.value = st.sub[s.dataset.sub] && st.sub[s.dataset.sub] !== 'none' ? st.sub[s.dataset.sub] : ''; });
    $('lver').value = st.ver; $('vis').value = st.vis; $('team').value = st.team; $('c1').value = st.c1; $('c2').value = st.c2; $('only').value = st.only; $('numAt').value = st.numAt; $('me').value = st.me; $('hold').value = st.hold; $('gl').value = st.gl; $('led').value = st.led;
    $('aB').className = st.a === 'blue' ? 'on' : ''; $('aR').className = st.a === 'red' ? 'on' : '';
    [['vi', 100, '%'], ['vx', 100, '%'], ['vc', 100, '%'], ['aim', 1, '°'], ['hd', 1, '°']].forEach(([k, m, u]) => { $(k).value = Math.round(st[k] * m); $(k + 'V').textContent = Math.round(st[k] * m) + u; });
  }
  const refresh = () => { sync(); draw(); toHash(); };
  const setSeason = (y, how) => { st.y = y; st.sub = pick(y, how || 'typ'); st.only = ''; st.hold = 0; fillSeason(); refresh(); };

  $('led').innerHTML = Object.keys(Rd.LED_NAMES).map(k => '<option value="' + k + '">' + esc(Rd.LED_NAMES[k]) + '</option>').join('');   // (3.5.8) what the status lights say
  $('led').onchange = e => { stop(); st.led = e.target.value; refresh(); };
  setInterval(() => { if (!playT && st.led !== 'off' && Rd.LEDS[st.led] && Rd.LEDS[st.led][1] !== 1) drawTop(); }, 50);                 // a pattern that moves keeps moving while nothing plays
  $('year').innerHTML = '<optgroup label="Real seasons">' + years.filter(y => !fantasy(y)).map(y => '<option value="' + y + '">' + y + ' ' + esc(G.Seasons[y].name) + '</option>').join('') + '</optgroup><optgroup label="Fantasy seasons">' + years.filter(fantasy).map(y => '<option value="' + y + '">' + esc(G.Seasons[y].name) + '</option>').join('') + '</optgroup>';
  $('ver').textContent = G.VERSION;
  $('year').onchange = e => setSeason(Number(e.target.value));
  $('subs').onchange = e => { const s = e.target.closest('select'); if (!s) return; st.sub[s.dataset.sub] = s.value; refresh(); };
  $('bTyp').onclick = () => { st.sub = pick(st.y, 'typ'); refresh(); }; $('bRnd').onclick = () => { st.sub = pick(st.y, 'rnd'); refresh(); };
  $('bBest').onclick = () => { st.sub = pick(st.y, 'best'); refresh(); }; $('bNone').onclick = () => { st.sub = pick(st.y, 'none'); refresh(); };
  $('lver').onchange = e => { st.ver = Number(e.target.value); refresh(); }; $('vis').onchange = e => { st.vis = Number(e.target.value); refresh(); };
  $('team').oninput = e => { st.team = Math.max(1, Math.min(99999, Number(e.target.value) || 1)); draw(); toHash(); };
  $('aB').onclick = () => { st.a = 'blue'; refresh(); }; $('aR').onclick = () => { st.a = 'red'; refresh(); }; $('numAt').onchange = e => { st.numAt = e.target.value; refresh(); };
  $('c1').oninput = e => { st.c1 = e.target.value; draw(); toHash(); }; $('c2').oninput = e => { st.c2 = e.target.value; draw(); toHash(); };
  $('only').onchange = e => { st.only = e.target.value; refresh(); }; $('me').onchange = e => { st.me = Number(e.target.value); refresh(); }; $('hold').onchange = e => { st.hold = Number(e.target.value); refresh(); }; $('gl').onchange = e => { st.gl = Number(e.target.value); refresh(); };
  [['vi', 100], ['vx', 100], ['vc', 100], ['aim', 1], ['hd', 1]].forEach(([k, m]) => { $(k).oninput = e => { stop(); st[k] = Number(e.target.value) / m; sync(); drawTop(); toHash(); }; });

  // ---------------- a match cycle: collect, carry, score, collect again, climb
  function stop() { if (playT) { cancelAnimationFrame(playT); playT = null; $('play').textContent = 'Play a cycle'; } }
  $('play').onclick = function () {
    if (playT) { stop(); refresh(); return; }
    let last = performance.now(); cycT = 0; this.textContent = 'Stop';
    const step = now => { cycle(Math.min(0.1, (now - last) / 1000)); last = now; playT = requestAnimationFrame(step); };
    playT = requestAnimationFrame(step);
  };
  // twelve seconds: collect (intake out), carry (intake in, holding), score (reach out), collect again, climb
  let cycT = 0;
  function cycle(dt) {
    cycT = (cycT + dt) % 12; const ph = Rd.demoPhase(cycT), score = ph.score, carry = ph.carry, climb = ph.climb, ease = (v, to, rate) => v + (to - v) * (1 - Math.exp(-rate * dt));
    st.vi = ease(st.vi, !carry && !climb ? 1 : 0, 8); st.vx = ease(st.vx, score ? 1 : 0, 9); st.vc = ease(st.vc, climb ? 1 : 0, 3); st.hold = carry && (HOLD[st.y] || []).length ? 1 : 0; st.led = Rd.demoLed(cycT); st.gl = score && st.vis > 0 && st.y < 2023 ? 1 : 0;   // the green ring: only in the years of reflective tape
    sync(); drawTop();
  }
  window.RobotViewer = { st, cycle, refresh: () => refresh() };

  // ---------------- pictures and links
  const save = (cv, name) => cv.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); });
  const fname = kind => 'robot-' + st.y + '-' + st.team + '-' + kind + '.png';
  $('sSide').onclick = () => save($('side'), fname('side')); $('sTop').onclick = () => save($('top'), fname('match'));
  $('copy').onclick = () => { const say = t => { $('msg').textContent = t; setTimeout(() => { $('msg').textContent = ''; }, 2500); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(location.href).then(() => say('Link copied.'), () => say('Copy it from the address bar.')); else say('Copy it from the address bar.'); };

  // ---------------- every design of the season, on this robot
  $('bAlbum').onclick = function () {
    const box = $('cards'); box.innerHTML = '';
    subsOf(st.y).forEach(sd => {
      const h3 = document.createElement('h3'); h3.textContent = sd.name; const grid = document.createElement('div'); grid.className = 'cards'; box.appendChild(h3); box.appendChild(grid);
      sd.concepts.filter(c => c.id !== 'none').forEach(c => {
        const s2 = Object.assign({}, st, { sub: Object.assign({}, st.sub, { [sd.id]: c.id }) }), b = document.createElement('button'), cv = document.createElement('canvas'), cap = document.createElement('div');
        b.className = 'cardx'; cv.width = 760; cv.height = 430; cap.textContent = c.name; b.appendChild(cv); b.appendChild(cap); grid.appendChild(b);
        Rd.robotSide(cv.getContext('2d'), cv.width, cv.height, lookOf(s2), st.a, st.team);
        b.onclick = () => { st.sub[sd.id] = c.id; refresh(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
      });
    });
  };

  if (!fromHash()) st.sub = pick(st.y, 'typ');
  fillSeason(); refresh();
  window.addEventListener('hashchange', () => { if (fromHash()) { fillSeason(); sync(); draw(); } });
})();
