'use strict';
/* FRC Manager — 60-second reveal trailer.
   Scenes are drawn on a 1920×1080 canvas (or 1080×1920 with ?vertical, for short-video apps) with the game's own
   renderer and match engine. Both versions share the timeline, the matches and the soundtrack.
   The soundtrack is synthesized with an OfflineAudioContext (120 BPM, 2-second bars; scene cuts sit on bar lines).
   Render MP4: WebCodecs (H.264 + AAC) → mp4-muxer → POST /__save (dev server) or a browser download. */
(function () {
  const VERT = /[?&]vertical\b/.test(location.search);
  const W = VERT ? 1080 : 1920, H = VERT ? 1920 : 1080, FPS = 30, DUR = 60, NF = FPS * DUR;
  const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  cv.width = W; cv.height = H;
  if (VERT) cv.style.maxWidth = '420px';
  const U = G.U, Rd = G.Render, E = G.Engine;
  const C = { bg: '#0b0e12', panel: '#141920', panel2: '#1b222b', line: '#2a333d', text: '#e6ebf0', muted: '#94a1ae', dim: '#6c7884',
    acc: '#f5b800', acc2: '#ffd24d', red: '#e5484d', blue: '#3e8cff', good: '#3ecf8e', warn: '#ffb020', bad: '#ff5c5c', info: '#4aa3ff' };
  const FD = 'Rajdhani, "Arial Narrow", sans-serif', FB = 'Inter, system-ui, sans-serif';
  const TEAM = 4321, TC1 = '#f5b800', TC2 = '#ffffff';
  const URL_TXT = 'txtaylor2997.github.io/frc-manager';

  // ---------------------------------------------------------------- helpers
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, k) => a + (b - a) * k;
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const eo = k => 1 - Math.pow(1 - clamp(k, 0, 1), 3);              // ease out cubic
  const eio = k => { k = clamp(k, 0, 1); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
  const back = k => { k = clamp(k, 0, 1); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
  // visibility window: fades in over fi from a, out over fo before b
  const vis = (t, a, b, fi, fo) => Math.min(eo(seg(t, a, a + (fi || 0.3))), 1 - seg(t, b - (fo || 0.3), b));

  function txt(s, x, y, o) {
    o = o || {};
    ctx.save();
    ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    ctx.font = (o.weight || 700) + ' ' + (o.size || 40) + 'px ' + (o.font || FD);
    ctx.fillStyle = o.color || C.text; ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic';
    if (o.spacing != null) ctx.letterSpacing = o.spacing + 'px';
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.blur || 30; }
    if (o.stroke) { ctx.lineWidth = o.lw || 6; ctx.strokeStyle = o.stroke; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
    ctx.fillText(s, x, y);
    const w = ctx.measureText(s).width;
    ctx.restore();
    return w;
  }
  // slide-up reveal
  function rtxt(s, x, y, t, a, b, o) {
    const v = vis(t, a, b, o && o.fi || 0.35, o && o.fo || 0.3);
    if (v <= 0) return;
    txt(s, x, y + (1 - v) * 28, Object.assign({}, o, { alpha: (o && o.alpha != null ? o.alpha : 1) * v }));
  }
  function rr(x, y, w, h, r, fill, stroke, lw) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = lw || 2; ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  function panel(x, y, w, h, alpha, title) {
    ctx.save(); ctx.globalAlpha *= alpha == null ? 1 : alpha;
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
    rr(x, y, w, h, 18, C.panel); ctx.shadowColor = 'transparent';
    rr(x, y, w, h, 18, null, C.line, 2);
    if (title) txt(title.toUpperCase(), x + 28, y + 46, { font: FB, weight: 800, size: 22, color: C.muted, spacing: 2 });
    ctx.restore();
  }
  function bar(x, y, w, h, v, col, track) {
    rr(x, y, w, h, h / 2, track || '#0c0f13');
    if (v > 0.002) rr(x, y, Math.max(h, w * clamp(v, 0, 1)), h, h / 2, col || C.acc);
  }
  function wrap(s, maxW, font) {
    ctx.save(); ctx.font = font; const words = s.split(' '), lines = []; let cur = '';
    words.forEach(w => { const tryL = cur ? cur + ' ' + w : w; if (ctx.measureText(tryL).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tryL; });
    if (cur) lines.push(cur); ctx.restore(); return lines;
  }
  const money = v => '$' + Math.round(v).toLocaleString('en-US');

  // background: dark, drifting grid, vignette
  function bg(t, o) {
    o = o || {};
    ctx.fillStyle = o.color || C.bg; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = o.grid == null ? 0.07 : o.grid; ctx.strokeStyle = '#8fa3b8'; ctx.lineWidth = 1;
    const off = (t * 18) % 60;
    for (let x = -60 + off; x < W + 60; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = -60 + off * 0.5; y < H + 60; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore();
    if (o.glow) { const g = ctx.createRadialGradient(o.glow.x, o.glow.y, 10, o.glow.x, o.glow.y, o.glow.r); g.addColorStop(0, o.glow.c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  }
  function vignette(k) {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,' + (k == null ? 0.65 : k) + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function kicker(s, x, y, alpha) {
    if (alpha <= 0) return;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = C.acc; ctx.fillRect(x, y - 22, 6, 28);
    txt(s.toUpperCase(), x + 20, y, { font: FB, weight: 800, size: 24, color: C.acc, spacing: 4 });
    ctx.restore();
  }
  // floating game pieces (seeded)
  const PARTS = (function () { const r = G.makeRng(31), out = []; for (let i = 0; i < 70; i++) out.push({ x: r.next() * W, y: r.next() * H, s: 6 + r.next() * 16, v: 20 + r.next() * 60, k: r.int(0, 4), p: r.next() * 6.28 }); return out; })();
  function particles(t, alpha) {
    const cols = ['#ffd84a', '#ff9a3c', '#3fd0b0', '#9b6bff', '#ffd23f'];
    ctx.save();
    PARTS.forEach(p => {
      const y = ((p.y - t * p.v) % (H + 80) + H + 80) % (H + 80) - 40, x = p.x + Math.sin(t * 0.7 + p.p) * 18;
      ctx.globalAlpha = alpha * (0.25 + 0.35 * (p.s / 22));
      ctx.fillStyle = cols[p.k];
      if (p.k === 1) { ctx.beginPath(); ctx.arc(x, y, p.s, 0, 7); ctx.lineWidth = p.s * 0.45; ctx.strokeStyle = cols[1]; ctx.stroke(); }
      else if (p.k === 3) ctx.fillRect(x - p.s * 0.8, y - p.s * 0.8, p.s * 1.6, p.s * 1.6);
      else { ctx.beginPath(); ctx.arc(x, y, p.s, 0, 7); ctx.fill(); }
    });
    ctx.restore();
  }

  // ---------------------------------------------------------------- matches (real game engine)
  function aimFor(m, r) { if (m.year === 2022) return m.hub; if (m.year === 2024) return m.spk[r.a]; if (m.year === 2026) return m.hub[r.a]; return null; }
  function makeMatch(year, seed, o) {
    o = o || {};
    const rng = G.makeRng(seed);
    const pool = Object.values(G.AI.makePool(rng, 90, TEAM, year)).filter(t => t.str >= 50).sort((a, b) => b.str - a.str);
    const pick = i => { const e = G.AI.entry(pool[i % pool.length], year, 1.08, 1, rng); e.plan = { role: 'score' }; return e; };
    const red = o.strongRed ? [pick(0), pick(1), pick(2)] : [pick(0), pick(3), pick(4)], blue = o.strongRed ? [pick(3), pick(4), pick(5)] : [pick(1), pick(2), pick(5)];
    if (o.player) { red[0].isPlayer = true; red[0].team = TEAM; red[0].look = Object.assign({}, red[0].look, { c1: TC1, c2: TC2, ver: 3 }); red[0].conf = 0.85; }
    if (o.defense) blue[2].plan = { role: 'defend' };
    const m = E.create({ year, red, blue, seed, headless: false, calls: 8, coachSkill: 80, playerTeam: o.player ? TEAM : null });
    const M = { m, acc: 0, speed: o.speed || 1, follow: o.follow === 'lead' ? red[0].team : o.follow || 'all' };
    while (!m.done && m.t < (o.from || 0)) E.step(m);
    const c = camTarget(M); M.cam = c.x; M.camY = c.y;
    return M;
  }
  // follow camera: the player's robot / a chosen robot, or the middle of the action
  function camTarget(M) {
    const rs = M.m.robots, me = rs.find(r => r.team === M.follow);
    return me ? { x: me.x, y: me.y } : { x: rs.reduce((s, r) => s + r.x, 0) / rs.length, y: rs.reduce((s, r) => s + r.y, 0) / rs.length };
  }
  function tickMatch(M, dt) {
    if (M.m.done) return;
    M.acc += dt * M.speed;
    let n = 0;
    while (M.acc >= 0.1 && !M.m.done && n++ < 50) { E.step(M.m); M.acc -= 0.1; }
    const c = camTarget(M), k = 1 - Math.exp(-dt * 2.2);
    M.cam += (c.x - M.cam) * k; M.camY += (c.y - M.camY) * k;
  }
  // draw a match at scale s (px per metre) centred on the camera, clamped so the field covers the view
  // fx, fy: where in the view the followed point should sit (0..1, default centre)
  function drawMatchCam(M, vx, vy, vw, vh, s, fx, fy) {
    const fw = E.FW * s, fh = E.FH * s;
    let ox = vx + vw * (fx == null ? 0.5 : fx) - M.cam * s, oy = vy + vh * (fy == null ? 0.5 : fy) - M.camY * s;
    ox = fw >= vw ? clamp(ox, vx + vw - fw, vx) : vx + (vw - fw) / 2;
    oy = fh >= vh ? clamp(oy, vy + vh - fh, vy) : vy + (vh - fh) / 2;
    ctx.save(); ctx.beginPath(); ctx.rect(vx, vy, vw, vh); ctx.clip();
    drawMatch(M, ox, oy, fw);
    ctx.restore();
  }
  // championship montage background: one live match per phrase, camera on a scoring robot
  const CHAMP_AT = [0, 1.33, 2.66];
  const champIdx = lt => lt >= CHAMP_AT[2] ? 2 : lt >= CHAMP_AT[1] ? 1 : 0;
  function champBg(lt) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const i = champIdx(lt), l = lt - CHAMP_AT[i], M = MS.champs[i];
    const push = 1.0 + l * 0.04;
    if (VERT) {
      // vertical: blurred, enlarged copy fills the frame; a sharp, wider band of the field sits in the middle
      ctx.save(); ctx.filter = 'blur(18px)'; ctx.globalAlpha = 0.55;
      drawMatchCam(M, 0, 0, W, H, H * 1.05 / E.FH * push);
      ctx.restore();
      const s2 = H * 0.62 / E.FH * push, bh = E.FH * s2, by = 690 - (bh - H * 0.62) / 2; // band below the words
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 40; ctx.fillStyle = '#000'; ctx.fillRect(0, by, W, bh); ctx.restore();
      ctx.save(); ctx.globalAlpha = 0.9;
      drawMatchCam(M, 0, by, W, bh, s2);
      ctx.restore();
    } else {
      ctx.save(); ctx.globalAlpha = 0.85;
      drawMatchCam(M, 0, 0, W, H, W * 1.12 / E.FW * push, 0.5, 0.76); // the followed robot sits below the words
      ctx.restore();
    }
    // alliance-colour wash that pulses on each cut, plus a dark pool behind the words
    const pulse = 1 - eo(seg(l, 0, 0.5));
    ctx.fillStyle = (i === 1 ? 'rgba(62,140,255,' : 'rgba(229,72,77,') + (0.06 + 0.16 * pulse) + ')'; ctx.fillRect(0, 0, W, H);
    vignette(0.5);
    // dark band only behind the words, so the robots around them stay bright
    const cy = VERT ? 450 : H / 2 - 10;
    ctx.save(); ctx.translate(W / 2, cy); ctx.scale(VERT ? 1.15 : 1.9, VERT ? 0.62 : 0.5);
    const g = ctx.createRadialGradient(0, 0, 20, 0, 0, 520);
    g.addColorStop(0, 'rgba(0,0,0,0.8)'); g.addColorStop(0.55, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(-560, -560, 1120, 1120);
    ctx.restore();
  }
  // draw a match cropped into a view rectangle (field scaled to fieldH tall), centred on the camera
  function drawMatchCrop(M, vx, vy, vw, vh, fieldH, camOff) {
    const s = fieldH / E.FH, w = E.FW * s, half = vw / 2 / s;
    const cam = clamp(M.cam + (camOff || 0), Math.min(half, E.FW / 2), Math.max(E.FW - half, E.FW / 2));
    ctx.save(); ctx.beginPath(); ctx.rect(vx, vy, vw, vh); ctx.clip();
    drawMatch(M, vx + vw / 2 - cam * s, vy + (vh - fieldH) / 2, w);
    ctx.restore();
  }
  // shrink a font size until the text fits maxW
  function fitSize(s, maxW, size, o) {
    o = o || {};
    ctx.save(); ctx.font = (o.weight || 700) + ' ' + size + 'px ' + (o.font || FD); ctx.letterSpacing = (o.spacing || 0) + 'px';
    const w = ctx.measureText(s).width; ctx.restore();
    return w > maxW ? Math.floor(size * maxW / w) : size;
  }
  function drawMatch(M, x, y, w) {
    const m = M.m, s = w / E.FW;
    ctx.save(); ctx.translate(x, y);
    Rd.field(ctx, m.year, s, m);
    const al = m.done ? 1 : clamp(M.acc / 0.1, 0, 1);
    m.robots.forEach(r => {
      const q = Object.create(r);
      q.x = r.px + (r.x - r.px) * al; q.y = r.py + (r.y - r.py) * al;
      const g = aimFor(m, r);
      Rd.robot(ctx, s, q, { aim: g ? Math.atan2(g.y - q.y, g.x - q.x) : null, year: m.year });
    });
    Rd.fx(ctx, s, m);
    ctx.restore();
    return { s, h: E.FH * s };
  }
  const tot = sc => sc.auto + sc.tele + sc.end + sc.foul;
  function clock(m) { const tl = Math.max(0, Math.ceil(m.total - m.t)); return Math.floor(tl / 60) + ':' + String(tl % 60).padStart(2, '0'); }

  // side-profile robot (offscreen; the game's renderer clears its canvas)
  const side = document.createElement('canvas'); side.width = 900; side.height = 640;
  function drawSide(look, x, y, w, team) {
    const sc = side.getContext('2d');
    Rd.robotSide(sc, side.width, side.height, look, 'red', team || TEAM);
    ctx.drawImage(side, x, y, w, w * side.height / side.width);
  }

  // blue banner (canvas version of the in-game banner)
  function banner(x, y, w, h, award, year, event, gold) {
    ctx.save(); ctx.translate(x, y);
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0a74c7'); g.addColorStop(0.6, '#0066b3'); g.addColorStop(1, '#00539a');
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(w, h); ctx.lineTo(w / 2, h * 0.86); ctx.lineTo(0, h); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, 0, w, 10);
    const ec = gold ? '#f5c542' : 'rgba(255,255,255,0.92)';
    ctx.lineWidth = 4; ctx.strokeStyle = ec; ctx.beginPath(); ctx.arc(w / 2, 78, 34, 0, 7); ctx.stroke();
    txt(gold ? '★' : award.indexOf('Impact') === 0 ? '✦' : '⚙', w / 2, 80, { font: FB, size: 36, weight: 800, color: ec, align: 'center', base: 'middle' });
    let yy = 152;
    wrap(award.toUpperCase(), w - 36, '900 25px ' + FB).forEach(l => { txt(l, w / 2, yy, { font: FB, size: 25, weight: 900, color: gold ? '#ffe08a' : '#fff', align: 'center', spacing: 1 }); yy += 30; });
    txt(String(year), w / 2, yy + 34, { font: FB, size: 46, weight: 800, color: '#fff', align: 'center' });
    yy += 78;
    wrap(event, w - 40, '400 20px ' + FB).forEach(l => { txt(l, w / 2, yy, { font: FB, size: 20, weight: 400, color: 'rgba(255,255,255,0.92)', align: 'center' }); yy += 25; });
    ctx.restore();
  }

  // ---------------------------------------------------------------- scenes
  const SEASONS = [
    { y: 2022, seed: 2201, from: 62, tag: 'Shoot cargo into the Hub. Climb the Hangar.' },
    { y: 2023, seed: 2302, from: 58, tag: 'Cones and cubes on the Grid. Balance the Charge Station.' },
    { y: 2024, seed: 2403, from: 60, tag: 'Notes in the Speaker and Amp. Get onstage.' },
    { y: 2025, seed: 2504, from: 64, tag: 'Coral on the Reef. Algae in the Barge.' },
    { y: 2026, seed: 2605, from: 66, tag: 'Fuel into an active Hub. Climb the Tower.' }
  ];
  const LOOKS = [
    { t: 0.0, look: { drive: 'tank', ver: 1, c1: TC1, c2: TC2 }, chip: 'Kitbot chassis' },
    { t: 0.75, look: { intake: 'under' }, chip: '+ Under-bumper intake' },
    { t: 1.5, look: { shooter: 'pivot' }, chip: '+ Pivot shooter' },
    { t: 2.25, look: { manip: 'ampbar', climber: 'hook' }, chip: '+ Amp bar & climber' },
    { t: 3.1, look: { drive: 'swerve', ver: 2, vision: 1 }, chip: '+ Swerve drive · v2' },
    { t: 3.95, look: { ver: 3, vision: 2, climber: 'arms' }, chip: '+ Vision & LEDs · v3' }
  ];
  const STATS = [['Speed', [35, 35, 38, 40, 74, 80]], ['Scoring', [10, 18, 55, 60, 66, 82]], ['Intake', [20, 62, 64, 66, 70, 78]], ['Endgame', [0, 0, 0, 52, 58, 76]], ['Reliability', [70, 66, 61, 63, 74, 88]]];
  const SCOUT = [
    { t: 2337, opr: 48.2, auto: 0.73, climb: '5/10', ff: 0.64, dead: 2, v: 38.4 },
    { t: 1576, opr: 45.9, auto: 0.91, climb: '9/11', ff: 0.91, dead: 0, v: 45.8 },
    { t: 6613, opr: 33.6, auto: 0.91, climb: '6/8', ff: 0.82, dead: 0, v: 30.1 },
    { t: 8962, opr: 32.5, auto: 1.0, climb: '7/10', ff: 0.91, dead: 0, v: 31.2 },
    { t: 4329, opr: 30.5, auto: 0.64, climb: '6/6', ff: 0.82, dead: 0, v: 27.2 },
    { t: 10513, opr: 30.1, auto: 0.91, climb: '6/9', ff: 0.82, dead: 1, v: 26.9 }
  ];
  const pc = v => v >= 0.85 ? C.good : v >= 0.7 ? C.acc : v >= 0.6 ? C.warn : C.bad;

  let MS = {}; // live matches
  function prep() {
    MS = {
      cold: makeMatch(2024, 911, { from: 34, speed: 1.1, player: true, follow: TEAM }),
      seasons: SEASONS.map(s => makeMatch(s.y, s.seed, { from: s.from, speed: 2.4 })),
      compete: makeMatch(2026, 4242, { from: 98, speed: 3, player: true, strongRed: true, follow: TEAM }),
      champs: [
        makeMatch(2022, 5101, { from: 70, speed: 2.6, follow: 'lead', strongRed: true }),
        makeMatch(2025, 5202, { from: 64, speed: 2.6, follow: 'lead', strongRed: true }),
        makeMatch(2026, 5303, { from: 84, speed: 2.6, follow: 'lead', strongRed: true })
      ]
    };
    MS.compete.calls = {};
  }

  const SCENES = [
    // 0–4 cold open
    { t0: 0, t1: 4, tick(lt, dt) { tickMatch(MS.cold, dt); },
      draw(lt) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        const z = 1.35 + lt * 0.03, w = W * z;
        ctx.save(); ctx.globalAlpha = 0.25 + 0.3 * eo(seg(lt, 0, 1.5));
        drawMatch(MS.cold, (W - w) / 2 - 120, (H - E.FH * w / E.FW) / 2 + 40, w);
        ctx.restore();
        // light sweep
        const sx = lerp(-600, W + 600, seg(lt, 0.2, 3.6));
        const g = ctx.createLinearGradient(sx - 300, 0, sx + 300, 0); g.addColorStop(0, 'rgba(245,184,0,0)'); g.addColorStop(0.5, 'rgba(245,184,0,0.10)'); g.addColorStop(1, 'rgba(245,184,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        vignette(0.85);
        { const bd = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 900); bd.addColorStop(0, 'rgba(0,0,0,0.78)'); bd.addColorStop(0.55, 'rgba(0,0,0,0.5)'); bd.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = bd; ctx.fillRect(0, H / 2 - 260, W, 520); }
        rtxt('A new game every season.', W / 2, H / 2 + 10, lt, 0.3, 1.9, { size: 92, align: 'center', weight: 700 });
        rtxt('Six weeks to build. One season to prove it.', W / 2, H / 2 + 10, lt, 2.0, 3.85, { size: 92, align: 'center', weight: 700 });
        const lw = 520 * eo(seg(lt, 2.1, 3.0)) * (1 - seg(lt, 3.6, 3.85));
        ctx.fillStyle = C.acc; ctx.fillRect(W / 2 - lw / 2, H / 2 + 50, lw, 5);
      } },
    // 4–8 title
    { t0: 4, t1: 8, draw(lt) {
        bg(lt + 4, { glow: { x: W / 2, y: H / 2, r: 900, c: 'rgba(245,184,0,0.16)' } });
        particles(lt + 4, eo(seg(lt, 0, 0.6)));
        const k = eo(seg(lt, 0, 0.9)), sc = lerp(1.18, 1, k), out = 1 - seg(lt, 3.7, 4);
        ctx.save(); ctx.globalAlpha = out; ctx.translate(W / 2, H / 2 - 40); ctx.scale(sc, sc);
        const sp = lerp(60, 14, k);
        ctx.font = '700 230px ' + FD; ctx.letterSpacing = sp + 'px';
        const w1 = ctx.measureText('FRC ').width, w2 = ctx.measureText('MANAGER').width, x0 = -(w1 + w2) / 2;
        txt('FRC ', x0, 70, { size: 230, spacing: sp, color: C.acc, glow: 'rgba(245,184,0,0.55)', blur: 50, alpha: k });
        txt('MANAGER', x0 + w1, 70, { size: 230, spacing: sp, color: '#fff', glow: 'rgba(255,255,255,0.25)', blur: 30, alpha: k });
        ctx.restore();
        ctx.save(); ctx.globalAlpha = out;
        const lw = 900 * eo(seg(lt, 0.3, 1.1)); ctx.fillStyle = C.acc; ctx.fillRect(W / 2 - lw / 2, H / 2 + 70, lw, 4);
        rtxt('Run a FIRST® Robotics Competition team.', W / 2, H / 2 + 150, lt, 0.6, 4.2, { font: FB, size: 46, weight: 600, align: 'center', color: C.text });
        rtxt('2022  ·  2023  ·  2024  ·  2025  ·  2026', W / 2, H / 2 + 228, lt, 1.1, 4.2, { size: 44, weight: 700, align: 'center', color: C.acc2, spacing: 6 });
        ctx.restore();
        vignette(0.6);
      } },
    // 8–18 five seasons
    { t0: 8, t1: 18, tick(lt, dt) { const i = Math.min(4, Math.floor(lt / 2)); tickMatch(MS.seasons[i], dt); },
      draw(lt) {
        const i = Math.min(4, Math.floor(lt / 2)), l2 = lt - i * 2, S = SEASONS[i], Sz = G.Seasons[S.y];
        bg(lt, { grid: 0.04 });
        const z = 1.02 + l2 * 0.035, w = 1760 * z, h = E.FH * w / E.FW;
        drawMatch(MS.seasons[i], (W - w) / 2, (H - h) / 2 - 30, w);
        // bottom gradient + labels
        const g = ctx.createLinearGradient(0, H - 470, 0, H); g.addColorStop(0, 'rgba(8,10,13,0)'); g.addColorStop(0.55, 'rgba(8,10,13,0.86)'); g.addColorStop(1, 'rgba(8,10,13,0.97)');
        ctx.fillStyle = g; ctx.fillRect(0, H - 470, W, 470);
        const tg = ctx.createLinearGradient(0, 0, 0, 170); tg.addColorStop(0, 'rgba(8,10,13,0.9)'); tg.addColorStop(1, 'rgba(8,10,13,0)'); ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 170);
        kicker('Five real seasons · ' + (i + 1) + ' / 5', 90, 92, eo(seg(lt, 0, 0.4)));
        const a = eo(seg(l2, 0.05, 0.4));
        txt(String(S.y), 96, H - 250 + (1 - a) * 30, { size: 64, color: C.acc, alpha: a, spacing: 4 });
        txt(Sz.name, 90, H - 110 + (1 - a) * 40, { size: 150, color: '#fff', alpha: a, spacing: 4, glow: 'rgba(0,0,0,0.6)', blur: 20 });
        rtxt(S.tag, 98, H - 52, l2, 0.25, 2.2, { font: FB, size: 34, weight: 600, color: C.muted });
        // progress pips
        for (let k = 0; k < 5; k++) rr(W - 90 - (5 - k) * 46, 70, 36, 8, 4, k <= i ? C.acc : 'rgba(255,255,255,0.18)');
        vignette(0.45);
      } },
    // 18–24 design your robot
    { t0: 18, t1: 24, draw(lt) {
        bg(lt + 18, { glow: { x: 520, y: 600, r: 700, c: 'rgba(62,140,255,0.13)' } });
        const inA = eo(seg(lt, 0, 0.5));
        // blueprint panel
        ctx.save(); ctx.globalAlpha = inA;
        rr(80, 150, 940, 800, 22, 'rgba(10,30,52,0.75)', 'rgba(74,163,255,0.35)', 2);
        ctx.strokeStyle = 'rgba(74,163,255,0.12)'; ctx.lineWidth = 1;
        for (let x = 100; x < 1000; x += 40) { ctx.beginPath(); ctx.moveTo(x, 170); ctx.lineTo(x, 930); ctx.stroke(); }
        for (let y = 170; y < 930; y += 40) { ctx.beginPath(); ctx.moveTo(100, y); ctx.lineTo(1000, y); ctx.stroke(); }
        // evolving robot
        let look = {}, step = 0;
        LOOKS.forEach((L, k) => { if (lt >= L.t) { Object.assign(look, L.look); step = k; } });
        const pop = 1 + 0.04 * (1 - eo(seg(lt, LOOKS[step].t, LOOKS[step].t + 0.3)));
        const rw = 1240 * pop, rh = rw * side.height / side.width;
        ctx.save(); ctx.beginPath(); ctx.roundRect(80, 150, 940, 800, 22); ctx.clip();
        drawSide(look, 550 - rw / 2, 925 - rh * (616 / 640), rw);
        ctx.restore();
        // version tag + chips
        const ver = look.ver || 1;
        rr(120, 190, 120, 56, 12, 'rgba(245,184,0,0.15)', C.acc, 2);
        txt('v' + ver, 180, 232, { size: 46, color: C.acc, align: 'center' });
        let cy = 210;
        LOOKS.forEach((L, k) => {
          if (k === 0 || lt < L.t) return;
          const a = eo(seg(lt, L.t, L.t + 0.3));
          ctx.save(); ctx.globalAlpha *= a;
          ctx.font = '600 24px ' + FB; const cw = ctx.measureText(L.chip).width + 36;
          rr(990 - cw + (1 - a) * 40, cy - 30, cw, 44, 22, 'rgba(62,140,255,0.18)', 'rgba(74,163,255,0.6)', 2);
          txt(L.chip, 990 - cw + 18 + (1 - a) * 40, cy, { font: FB, size: 24, weight: 600, color: '#cfe4ff' });
          ctx.restore();
          cy += 56;
        });
        ctx.restore();
        // right column
        kicker('Design Office', 1110, 200, inA);
        rtxt('Design your robot.', 1104, 300, lt, 0.1, 6.2, { size: 104, color: '#fff' });
        rtxt('Pick a concept for every subsystem,', 1110, 370, lt, 0.35, 6.2, { font: FB, size: 34, weight: 600, color: C.muted });
        rtxt('run upgrades and watch it evolve.', 1110, 416, lt, 0.45, 6.2, { font: FB, size: 34, weight: 600, color: C.muted });
        STATS.forEach((S, k) => {
          const y = 520 + k * 84, a = eo(seg(lt, 0.4 + k * 0.08, 0.8 + k * 0.08));
          if (a <= 0) return;
          let v = S[1][0];
          for (let j = 1; j < LOOKS.length; j++) v = lerp(v, S[1][j], eo(seg(lt, LOOKS[j].t, LOOKS[j].t + 0.6)));
          ctx.save(); ctx.globalAlpha = a;
          txt(S[0], 1110, y + 22, { font: FB, size: 28, weight: 600, color: C.muted });
          bar(1330, y, 430, 20, v / 100, k === 4 ? C.good : C.acc);
          txt(String(Math.round(v)), 1820, y + 22, { font: FB, size: 30, weight: 800, align: 'right' });
          ctx.restore();
        });
        vignette(0.5);
      } },
    // 24–30 run the program
    { t0: 24, t1: 30, draw(lt) {
        bg(lt + 24);
        kicker('Your program', 100, 120, eo(seg(lt, 0, 0.4)));
        rtxt('Run the whole program.', 94, 228, lt, 0.05, 6.2, { size: 104, color: '#fff' });
        rtxt('Sponsors, mentors, facilities, testing time and the budget behind it all.', 100, 290, lt, 0.3, 6.2, { font: FB, size: 34, weight: 600, color: C.muted });
        const cards = [[100, 350], [990, 350], [100, 690], [990, 690]], cw = 830, ch = 310;
        const ca = k => eo(seg(lt, 0.35 + k * 0.25, 0.85 + k * 0.25));
        const slide = k => (1 - ca(k)) * 60;
        // budget
        let a = ca(0);
        if (a > 0) {
          const [x, y] = cards[0]; ctx.save(); ctx.translate(0, slide(0));
          panel(x, y, cw, ch, a, 'Finances');
          ctx.globalAlpha = a;
          const v = lerp(45000, 82400, eio(seg(lt, 0.6, 3.6)));
          txt(money(v), x + 28, y + 130, { font: FB, size: 76, weight: 800, color: '#fff' });
          [['+ $12,000', 'Vantage Systems · title sponsor', C.good, 1.0], ['+ $14,000', 'School funding', C.good, 1.5], ['− $6,000', 'Regional registration', C.bad, 2.0], ['− $11,000', 'CNC router', C.bad, 2.5]].forEach((L, k) => {
            const la = eo(seg(lt, L[3], L[3] + 0.3)); if (la <= 0) return;
            ctx.save(); ctx.globalAlpha *= la;
            txt(L[0], x + 28, y + 182 + k * 32, { font: FB, size: 24, weight: 800, color: L[2] });
            txt(L[1], x + 170, y + 182 + k * 32, { font: FB, size: 24, weight: 400, color: C.muted });
            ctx.restore();
          });
          ctx.restore();
        }
        // facilities
        a = ca(1);
        if (a > 0) {
          const [x, y] = cards[1]; ctx.save(); ctx.translate(0, slide(1));
          panel(x, y, cw, ch, a, 'Workshop facilities');
          ctx.globalAlpha = a;
          [['3D Printing', 3, 3, 0.92], ['CNC Machining', 2, 2, 0.78], ['Practice Field', 3, 3, 0.86], ['Programming Station', 2, 3, 0.64]].forEach((F, k) => {
            const y2 = y + 100 + k * 50;
            txt(F[0], x + 28, y2 + 10, { font: FB, size: 26, weight: 600, color: C.text });
            for (let p = 0; p < F[2]; p++) { const on = lt > 1.0 + k * 0.2 + p * 0.25; ctx.beginPath(); ctx.arc(x + 360 + p * 30, y2 + 2, 10, 0, 7); ctx.fillStyle = p < F[1] && on ? C.acc : 'rgba(255,255,255,0.14)'; ctx.fill(); }
            bar(x + 480, y2 - 6, 230, 14, F[3] * eo(seg(lt, 1.0 + k * 0.2, 1.8 + k * 0.2)), F[3] > 0.75 ? C.good : C.warn);
            txt(Math.round(F[3] * 100) + '%', x + 800, y2 + 10, { font: FB, size: 22, weight: 800, align: 'right', color: C.muted });
          });
          ctx.restore();
        }
        // testing hours
        a = ca(2);
        if (a > 0) {
          const [x, y] = cards[2]; ctx.save(); ctx.translate(0, slide(2));
          panel(x, y, cw, ch, a, 'Testing hours · practice field');
          ctx.globalAlpha = a;
          const sp = lerp(0.5, 0.75, eio(seg(lt, 2.0, 3.2))), tot = 16, drv = Math.round(tot * sp), dev = tot - drv;
          txt(tot + ' h', x + 28, y + 118, { font: FB, size: 58, weight: 800 });
          txt('this week', x + 160, y + 116, { font: FB, size: 24, weight: 400, color: C.muted });
          const bx = x + 28, bw = cw - 56;
          rr(bx, y + 150, bw, 34, 8, '#0c0f13');
          rr(bx, y + 150, bw * (1 - sp), 34, 8, C.info); rr(bx + bw * (1 - sp), y + 150, bw * sp, 34, 8, C.acc);
          txt('Development testing  ' + dev + ' h', x + 28, y + 228, { font: FB, size: 26, weight: 800, color: C.info });
          txt('Driver practice  ' + drv + ' h', x + cw - 28, y + 228, { font: FB, size: 26, weight: 800, color: C.acc, align: 'right' });
          txt('Faster, better upgrades', x + 28, y + 264, { font: FB, size: 22, weight: 400, color: C.muted });
          txt('Drive-team skill & confidence', x + cw - 28, y + 264, { font: FB, size: 22, weight: 400, color: C.muted, align: 'right' });
          ctx.restore();
        }
        // team & impact
        a = ca(3);
        if (a > 0) {
          const [x, y] = cards[3]; ctx.save(); ctx.translate(0, slide(3));
          panel(x, y, cw, ch, a, 'Team & outreach');
          ctx.globalAlpha = a;
          txt('28 students · 6 mentors · morale 74', x + 28, y + 108, { font: FB, size: 28, weight: 600 });
          const ir = lerp(41, 82, eio(seg(lt, 1.6, 3.8)));
          txt('Impact rating', x + 28, y + 172, { font: FB, size: 26, weight: 600, color: C.muted });
          bar(x + 250, y + 152, 440, 22, ir / 100, ir >= 75 ? C.good : C.acc);
          txt(String(Math.round(ir)), x + cw - 28, y + 174, { font: FB, size: 30, weight: 800, align: 'right' });
          const od = Math.round(lerp(2, 47, eio(seg(lt, 2.0, 4.0))));
          txt('Impact Award odds at Heartland Regional', x + 28, y + 236, { font: FB, size: 24, weight: 400, color: C.muted });
          txt(od + '%', x + cw - 28, y + 238, { font: FB, size: 34, weight: 800, align: 'right', color: od > 30 ? C.good : C.acc });
          ctx.restore();
        }
        vignette(0.45);
      } },
    // 30–38 compete (the drop)
    { t0: 30, t1: 38, tick(lt, dt) {
        const M = MS.compete, m = M.m, cs = M.calls;
        if (lt >= 1.9 && !cs.a) { cs.a = 1; E.call(m, TEAM, { kind: 'role', value: { role: 'defend' }, text: 'Play defense' }); }
        if (lt >= 5.4 && !cs.c) { cs.c = 1; E.call(m, TEAM, { kind: 'endNow', text: 'Climb now' }); }
        tickMatch(M, dt);
      },
      draw(lt) {
        const M = MS.compete, m = M.m;
        ctx.fillStyle = '#07090c'; ctx.fillRect(0, 0, W, H);
        const z = 1 + 0.03 * eio(seg(lt, 0, 8)), w = 1640 * z, h = E.FH * w / E.FW;
        drawMatch(M, (W - w) / 2, 148 + (814 - h) / 2, w);
        // scoreboard
        const sr = tot(m.score.red), sb = tot(m.score.blue);
        const sbx = W / 2;
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 24;
        rr(sbx - 380, 26, 760, 104, 18, 'rgba(14,17,21,0.94)'); ctx.restore();
        rr(sbx - 370, 36, 250, 84, 12, C.red); rr(sbx + 120, 36, 250, 84, 12, C.blue);
        txt(String(sr), sbx - 245, 98, { font: FB, size: 62, weight: 900, align: 'center' });
        txt(String(sb), sbx + 245, 98, { font: FB, size: 62, weight: 900, align: 'center' });
        txt(clock(m), sbx, 88, { font: FB, size: 50, weight: 800, align: 'center' });
        { const R26 = G.Rules[2026], ra = R26.active(m, 'red'), ba = R26.active(m, 'blue');
          const lab = m.done ? 'FINAL' : ra && ba ? 'BOTH HUBS ACTIVE' : ra ? 'RED HUB ACTIVE' : 'BLUE HUB ACTIVE';
          txt(lab, sbx, 118, { font: FB, size: 16, weight: 800, align: 'center', color: ra && !ba ? '#ff8a8e' : ba && !ra ? '#8fbaff' : C.acc, spacing: 2 }); }
        // coach call toasts
        const CALLS = [['Play defense', 1.9], ['Climb now', 5.4]];
        CALLS.forEach(([s, at], k) => {
          const end = k < CALLS.length - 1 ? Math.min(at + 1.9, CALLS[k + 1][1] - 0.02) : at + 2.2;
          const v = vis(lt, at, end, 0.25, 0.3); if (v <= 0) return;
          ctx.save(); ctx.globalAlpha = v; const x = W - 560 + (1 - v) * 80, y = 190;
          ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 24; rr(x, y, 480, 120, 16, 'rgba(14,17,21,0.95)'); ctx.shadowColor = 'transparent';
          rr(x, y, 480, 120, 16, null, C.acc, 3);
          txt('COACH CALL ' + (k + 1) + ' / 4', x + 28, y + 44, { font: FB, size: 22, weight: 800, color: C.acc, spacing: 3 });
          txt(s, x + 26, y + 98, { size: 56, color: '#fff' });
          ctx.restore();
        });
        // caption under the field
        rtxt('Make the calls that win matches.', 140, H - 54, lt, 0.2, 7.8, { size: 58, color: '#fff' });
        rtxt('Live 2D matches · coach calls · or simulate instantly', W - 140, H - 58, lt, 0.45, 7.8, { font: FB, size: 24, weight: 600, color: C.muted, align: 'right' });
        vignette(0.4);
      } },
    // 38–44 scout & pick
    { t0: 38, t1: 44, draw(lt) {
        bg(lt + 38);
        kicker('Scouting & alliance selection', 100, 120, eo(seg(lt, 0, 0.4)));
        rtxt('Scout every robot.', 94, 226, lt, 0.05, 6.2, { size: 100, color: '#fff' });
        rtxt('Pick partners that won’t break down in the playoffs.', 100, 288, lt, 0.3, 6.2, { font: FB, size: 34, weight: 600, color: C.muted });
        const x = 100, y = 350, tw = 1110, th = 640, a = eo(seg(lt, 0.3, 0.8)); // th: panel height
        panel(x, y, tw, th, a, 'Pick list · observed in qualifications');
        if (a > 0) {
          ctx.save(); ctx.globalAlpha = a;
          const cols = [['TEAM', 40], ['OPR', 250], ['AUTO', 400], ['CLIMB', 560], ['FAULT-FREE', 720], ['VALUE', 960]];
          cols.forEach(c => txt(c[0], x + c[1], y + 104, { font: FB, size: 20, weight: 800, color: C.dim, spacing: 2 }));
          ctx.fillStyle = C.line; ctx.fillRect(x + 28, y + 120, tw - 56, 2);
          const sortK = eio(seg(lt, 2.1, 2.8));
          const byOpr = SCOUT.slice().sort((p, q) => q.opr - p.opr), byVal = SCOUT.slice().sort((p, q) => q.v - p.v);
          SCOUT.forEach(r => {
            const i0 = byOpr.indexOf(r), i1 = byVal.indexOf(r), ry = y + 170 + lerp(i0, i1, sortK) * 76;
            const ra = eo(seg(lt, 0.6 + i0 * 0.1, 0.9 + i0 * 0.1)); if (ra <= 0) return;
            const best = r.t === 1576 && lt > 2.9;
            ctx.save(); ctx.globalAlpha *= ra;
            if (best) { const pa = 0.5 + 0.5 * Math.sin((lt - 2.9) * 8); rr(x + 20, ry - 46, tw - 40, 68, 12, 'rgba(245,184,0,0.12)', 'rgba(245,184,0,' + (0.6 + 0.4 * pa) + ')', 3); }
            txt(String(r.t), x + 40, ry, { font: FB, size: 32, weight: 800, color: best ? C.acc : C.text });
            txt(r.opr.toFixed(1), x + 250, ry, { font: FB, size: 30, weight: 600 });
            txt(Math.round(r.auto * 100) + '%', x + 400, ry, { font: FB, size: 30, weight: 600, color: pc(r.auto) });
            txt(r.climb, x + 560, ry, { font: FB, size: 30, weight: 600 });
            txt(Math.round(r.ff * 100) + '%' + (r.dead ? '  ' + r.dead + '✕' : ''), x + 720, ry, { font: FB, size: 30, weight: 600, color: pc(r.ff) });
            txt(r.v.toFixed(1), x + 960, ry, { font: FB, size: 32, weight: 900, color: best ? C.acc : C.text });
            ctx.restore();
          });
          const sa = vis(lt, 2.1, 6, 0.3, 0.2);
          if (sa > 0) txt('↓ Re-sorted by pick value: OPR discounted for breakdowns, plus auto and climb consistency', x + 28, y + th - 32, { font: FB, size: 22, weight: 600, color: C.acc, alpha: sa });
          ctx.restore();
        }
        // alliance card
        const ax = 1270, ay = 350, aw = 560, ah = 640, aa = eo(seg(lt, 0.9, 1.4));
        panel(ax, ay, aw, ah, aa, 'Alliance selection');
        if (aa > 0) {
          ctx.save(); ctx.globalAlpha = aa;
          txt('ALLIANCE 1', ax + 28, ay + 120, { size: 54, color: C.acc, spacing: 3 });
          const slots = [['Captain', TEAM, 0.9], ['1st pick', 1576, 3.3], ['2nd pick', 8962, 4.4]];
          slots.forEach((s, k) => {
            const y2 = ay + 190 + k * 130, on = lt >= s[2], pa = eo(seg(lt, s[2], s[2] + 0.35));
            rr(ax + 28, y2, aw - 56, 104, 14, on ? 'rgba(229,72,77,0.18)' : 'rgba(255,255,255,0.04)', on ? 'rgba(229,72,77,0.7)' : C.line, 2);
            txt(s[0].toUpperCase(), ax + 52, y2 + 38, { font: FB, size: 20, weight: 800, color: C.muted, spacing: 2 });
            if (on) txt(String(s[1]), ax + 52 + (1 - pa) * 30, y2 + 86, { font: FB, size: 46, weight: 900, alpha: pa });
            else txt('—', ax + 52, y2 + 86, { font: FB, size: 40, weight: 400, color: C.dim });
          });
          const st = eo(seg(lt, 3.5, 3.8)) * (1 - seg(lt, 5.8, 6));
          if (st > 0) {
            ctx.save(); ctx.translate(ax + aw - 150, ay + 330); ctx.rotate(-0.18); ctx.scale(lerp(1.6, 1, st), lerp(1.6, 1, st)); ctx.globalAlpha *= st;
            rr(-120, -38, 240, 76, 10, null, C.good, 5);
            txt('ACCEPTED', 0, 16, { font: FB, size: 38, weight: 900, color: C.good, align: 'center', spacing: 2 });
            ctx.restore();
          }
          ctx.restore();
        }
        vignette(0.45);
      } },
    // 44–50 playoffs → banners
    { t0: 44, t1: 50, draw(lt) {
        bg(lt + 44, { glow: { x: W / 2, y: 420, r: 800, c: 'rgba(0,102,179,' + (0.22 * eo(seg(lt, 2.6, 3.4))) + ')' } });
        // finals scoreboard (0–2.8)
        const fa = vis(lt, 0, 2.9, 0.3, 0.35);
        if (fa > 0) {
          ctx.save(); ctx.globalAlpha = fa;
          kicker('Double-elimination playoffs', 100, 120, 1);
          txt('FINALS · MATCH 3', W / 2, 330, { size: 70, align: 'center', color: C.muted, spacing: 6 });
          const rs = Math.round(lerp(96, 142, eio(seg(lt, 0.3, 1.9)))), bs = Math.round(lerp(101, 128, eio(seg(lt, 0.3, 1.9))));
          rr(W / 2 - 620, 400, 560, 260, 22, C.red); rr(W / 2 + 60, 400, 560, 260, 22, C.blue);
          txt('ALLIANCE 1', W / 2 - 340, 470, { font: FB, size: 30, weight: 800, align: 'center', spacing: 3, color: 'rgba(255,255,255,0.85)' });
          txt('ALLIANCE 2', W / 2 + 340, 470, { font: FB, size: 30, weight: 800, align: 'center', spacing: 3, color: 'rgba(255,255,255,0.85)' });
          txt(String(rs), W / 2 - 340, 610, { font: FB, size: 150, weight: 900, align: 'center' });
          txt(String(bs), W / 2 + 340, 610, { font: FB, size: 150, weight: 900, align: 'center' });
          const wa = eo(seg(lt, 1.95, 2.3));
          if (wa > 0) {
            ctx.save(); ctx.translate(W / 2, 780); ctx.scale(lerp(1.4, 1, wa), lerp(1.4, 1, wa)); ctx.globalAlpha *= wa;
            txt('REGIONAL CHAMPIONS', 0, 0, { size: 84, align: 'center', color: C.acc, glow: 'rgba(245,184,0,0.6)', blur: 30, spacing: 4 });
            ctx.restore();
          }
          ctx.restore();
        }
        // banners (2.9–6)
        const ba = vis(lt, 2.85, 6.2, 0.2, 0.2);
        if (ba > 0) {
          ctx.save(); ctx.globalAlpha = ba;
          rtxt('Hang your banners.', W / 2, 190, lt, 2.95, 6.2, { size: 104, align: 'center', color: '#fff' });
          rtxt('Event wins and Impact Awards go up on your banner wall.', W / 2, 252, lt, 3.15, 6.2, { font: FB, size: 34, weight: 600, align: 'center', color: C.muted });
          const B = [['Regional Winners', 2024, 'Heartland Regional', true, 3.2], ['Impact Award', 2025, 'Great Lakes Regional', false, 3.55], ['Regional Winners', 2026, 'Peach Hills Regional', true, 3.9], ['Championship Division Winners', 2026, 'Newton Division', true, 4.25]];
          const bw = 300, bh = 520, gap = 60, x0 = W / 2 - (B.length * bw + (B.length - 1) * gap) / 2;
          B.forEach((b, k) => {
            const d = seg(lt, b[4], b[4] + 0.55); if (d <= 0) return;
            const yy = 330 + (1 - back(d)) * -520;
            ctx.save(); ctx.globalAlpha *= Math.min(1, d * 3);
            ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x0 + k * (bw + gap) + bw / 2 - 1, 300, 2, Math.max(0, yy - 300));
            banner(x0 + k * (bw + gap), yy, bw, bh, b[0], b[1], b[2], b[3]);
            ctx.restore();
          });
          ctx.restore();
        }
        vignette(0.5);
      } },
    // 50–54 championship / einstein
    { t0: 50, t1: 54, tick(lt, dt) { tickMatch(MS.champs[champIdx(lt)], dt); },
      draw(lt) {
        champBg(lt);
        const WORDS = [['QUALIFY FOR', 'CHAMPIONSHIP', 0], ['WIN YOUR', 'DIVISION', 1.33], ['REACH', 'EINSTEIN', 2.66]];
        WORDS.forEach(([a, b, at]) => {
          if (lt < at || lt >= at + 1.33) return;
          const l = lt - at, pk = 1 + 0.12 * (1 - eo(seg(l, 0, 0.25))), o = 1 - seg(l, 1.15, 1.33);
          ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(pk, pk); ctx.globalAlpha = o;
          txt(a, 0, -90, { size: 70, align: 'center', color: C.muted, spacing: 10 });
          txt(b, 0, 80, { size: 210, align: 'center', color: b === 'EINSTEIN' ? C.acc : '#fff', glow: b === 'EINSTEIN' ? 'rgba(245,184,0,0.7)' : 'rgba(255,255,255,0.3)', blur: 40, spacing: 12 });
          ctx.restore();
        });
      } },
    // 54–60 end card
    { t0: 54, t1: 60, draw(lt) {
        bg(lt + 54, { glow: { x: W / 2, y: 420, r: 900, c: 'rgba(245,184,0,0.14)' } });
        particles(lt + 54, 0.5);
        const a = eo(seg(lt, 0, 0.6));
        // final robot
        ctx.save(); ctx.globalAlpha = a * 0.95;
        const look = { drive: 'swerve', ver: 3, vision: 2, c1: TC1, c2: TC2, intake: 'under', shooter: 'pivot', manip: 'ampbar', climber: 'arms' };
        drawSide(look, W / 2 - 280, 60 + (1 - a) * 40, 560);
        ctx.restore();
        ctx.save(); ctx.translate(W / 2, 640); const sc = lerp(1.08, 1, a); ctx.scale(sc, sc);
        ctx.font = '700 170px ' + FD; ctx.letterSpacing = '12px';
        const w1 = ctx.measureText('FRC ').width, w2 = ctx.measureText('MANAGER').width, x0 = -(w1 + w2) / 2;
        txt('FRC ', x0, 0, { size: 170, spacing: 12, color: C.acc, glow: 'rgba(245,184,0,0.5)', blur: 40, alpha: a });
        txt('MANAGER', x0 + w1, 0, { size: 170, spacing: 12, color: '#fff', alpha: a });
        ctx.restore();
        rtxt('Play free in your browser', W / 2, 740, lt, 0.4, 6.5, { font: FB, size: 50, weight: 800, align: 'center' });
        const ua = eo(seg(lt, 0.7, 1.1));
        if (ua > 0) {
          ctx.save(); ctx.globalAlpha = ua;
          ctx.font = '800 40px ' + FB; const uw = ctx.measureText(URL_TXT).width + 80;
          rr(W / 2 - uw / 2, 790, uw, 84, 42, 'rgba(245,184,0,0.14)', C.acc, 3);
          txt(URL_TXT, W / 2, 846, { font: FB, size: 40, weight: 800, align: 'center', color: C.acc2 });
          ctx.restore();
        }
        rtxt('Career mode · five seasons · no install, saves in your browser', W / 2, 940, lt, 1.0, 6.5, { font: FB, size: 28, weight: 600, align: 'center', color: C.muted });
        rtxt('Unofficial fan-made game. Not affiliated with or endorsed by FIRST®.', W / 2, 1020, lt, 1.2, 6.5, { font: FB, size: 22, weight: 400, align: 'center', color: C.dim });
        vignette(0.5);
        // fade to black
        const f = seg(lt, 5.2, 6);
        if (f > 0) { ctx.fillStyle = 'rgba(0,0,0,' + f + ')'; ctx.fillRect(0, 0, W, H); }
      } }
  ];

  // ---------------------------------------------------------------- vertical (9:16) scenes
  // Same timeline as SCENES. Key text stays between y≈200 and y≈1500 and away from the right edge,
  // where short-video apps put their own buttons and captions. Matches use a crop that follows the action.
  const CX = 540, L0 = 70; // centre / left margin
  function lines(arr, x, y0, lh, t, a, b, o) { arr.forEach((s, k) => rtxt(s, x, y0 + k * lh, t, a + k * 0.08, b, o)); }
  function bottomFade(y0) { const g = ctx.createLinearGradient(0, y0, 0, H); g.addColorStop(0, 'rgba(8,10,13,0)'); g.addColorStop(0.35, 'rgba(8,10,13,0.92)'); g.addColorStop(1, 'rgba(8,10,13,1)'); ctx.fillStyle = g; ctx.fillRect(0, y0, W, H - y0); }
  const SCENES_V = [
    // 0–4 cold open
    { t0: 0, t1: 4, draw(lt) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.globalAlpha = 0.25 + 0.3 * eo(seg(lt, 0, 1.5));
        drawMatchCrop(MS.cold, 0, 0, W, H, 2000 + lt * 40, -0.6);
        ctx.restore();
        const sy = lerp(-500, H + 500, seg(lt, 0.2, 3.6));
        const g = ctx.createLinearGradient(0, sy - 300, 0, sy + 300); g.addColorStop(0, 'rgba(245,184,0,0)'); g.addColorStop(0.5, 'rgba(245,184,0,0.10)'); g.addColorStop(1, 'rgba(245,184,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        vignette(0.85);
        { const bd = ctx.createLinearGradient(0, 700, 0, 1240); bd.addColorStop(0, 'rgba(0,0,0,0)'); bd.addColorStop(0.5, 'rgba(0,0,0,0.75)'); bd.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = bd; ctx.fillRect(0, 700, W, 540); }
        lines(['A new game', 'every season.'], CX, 930, 120, lt, 0.3, 1.9, { size: 116, align: 'center' });
        lines(['Six weeks to build.', 'One season', 'to prove it.'], CX, 880, 108, lt, 2.0, 3.85, { size: 100, align: 'center' });
        const lw = 460 * eo(seg(lt, 2.2, 3.0)) * (1 - seg(lt, 3.6, 3.85));
        ctx.fillStyle = C.acc; ctx.fillRect(CX - lw / 2, 1140, lw, 6);
      } },
    // 4–8 title
    { t0: 4, t1: 8, draw(lt) {
        bg(lt + 4, { glow: { x: CX, y: 860, r: 800, c: 'rgba(245,184,0,0.16)' } });
        particles(lt + 4, eo(seg(lt, 0, 0.6)));
        const k = eo(seg(lt, 0, 0.9)), sc = lerp(1.18, 1, k), out = 1 - seg(lt, 3.7, 4), sp = lerp(50, 12, k);
        ctx.save(); ctx.globalAlpha = out; ctx.translate(CX, 860); ctx.scale(sc, sc);
        txt('FRC', 0, -40, { size: 330, spacing: sp, color: C.acc, glow: 'rgba(245,184,0,0.55)', blur: 50, alpha: k, align: 'center' });
        txt('MANAGER', 0, 150, { size: fitSize('MANAGER', 980, 200, { spacing: sp }), spacing: sp, color: '#fff', glow: 'rgba(255,255,255,0.25)', blur: 30, alpha: k, align: 'center' });
        ctx.restore();
        ctx.save(); ctx.globalAlpha = out;
        const lw = 720 * eo(seg(lt, 0.3, 1.1)); ctx.fillStyle = C.acc; ctx.fillRect(CX - lw / 2, 1050, lw, 5);
        lines(['Run a FIRST® Robotics', 'Competition team.'], CX, 1150, 64, lt, 0.6, 4.2, { font: FB, size: 50, weight: 600, align: 'center' });
        rtxt('2022 · 2023 · 2024 · 2025 · 2026', CX, 1320, lt, 1.1, 4.2, { size: 46, weight: 700, align: 'center', color: C.acc2, spacing: 3 });
        ctx.restore();
        vignette(0.6);
      } },
    // 8–18 five seasons
    { t0: 8, t1: 18, draw(lt) {
        const i = Math.min(4, Math.floor(lt / 2)), l2 = lt - i * 2, S = SEASONS[i], Sz = G.Seasons[S.y];
        bg(lt, { grid: 0.04 });
        drawMatchCrop(MS.seasons[i], 0, 700, W, 840, 840 * (1.02 + l2 * 0.03));
        const tg = ctx.createLinearGradient(0, 660, 0, 760); tg.addColorStop(0, 'rgba(11,14,18,1)'); tg.addColorStop(1, 'rgba(11,14,18,0)'); ctx.fillStyle = tg; ctx.fillRect(0, 660, W, 100);
        bottomFade(1460);
        kicker('Five real seasons · ' + (i + 1) + ' / 5', L0, 250, eo(seg(lt, 0, 0.4)));
        for (let k = 0; k < 5; k++) rr(L0 + 6 + k * 46, 290, 36, 8, 4, k <= i ? C.acc : 'rgba(255,255,255,0.18)');
        const a = eo(seg(l2, 0.05, 0.4));
        txt(String(S.y), L0 + 4, 400 + (1 - a) * 30, { size: 66, color: C.acc, alpha: a, spacing: 4 });
        txt(Sz.name, L0, 520 + (1 - a) * 40, { size: fitSize(Sz.name, 940, 140, { spacing: 4 }), color: '#fff', alpha: a, spacing: 4 });
        lines(wrap(S.tag, 920, '600 34px ' + FB), L0 + 4, 590, 44, l2, 0.25, 2.2, { font: FB, size: 34, weight: 600, color: C.muted });
        vignette(0.4);
      } },
    // 18–24 design your robot
    { t0: 18, t1: 24, draw(lt) {
        bg(lt + 18, { glow: { x: CX, y: 860, r: 700, c: 'rgba(62,140,255,0.13)' } });
        const inA = eo(seg(lt, 0, 0.5));
        kicker('Design Office', L0, 250, inA);
        rtxt('Design your robot.', L0 - 4, 360, lt, 0.1, 6.2, { size: fitSize('Design your robot.', 940, 110), color: '#fff' });
        lines(['Pick a concept for every subsystem,', 'run upgrades and watch it evolve.'], L0, 430, 46, lt, 0.35, 6.2, { font: FB, size: 34, weight: 600, color: C.muted });
        const px = 60, py = 520, pw = 960, ph = 660;
        ctx.save(); ctx.globalAlpha = inA;
        rr(px, py, pw, ph, 22, 'rgba(10,30,52,0.75)', 'rgba(74,163,255,0.35)', 2);
        ctx.strokeStyle = 'rgba(74,163,255,0.12)'; ctx.lineWidth = 1;
        for (let x = px + 20; x < px + pw; x += 40) { ctx.beginPath(); ctx.moveTo(x, py + 20); ctx.lineTo(x, py + ph - 20); ctx.stroke(); }
        for (let y = py + 20; y < py + ph; y += 40) { ctx.beginPath(); ctx.moveTo(px + 20, y); ctx.lineTo(px + pw - 20, y); ctx.stroke(); }
        let look = {}, step = 0;
        LOOKS.forEach((L, k) => { if (lt >= L.t) { Object.assign(look, L.look); step = k; } });
        const pop = 1 + 0.04 * (1 - eo(seg(lt, LOOKS[step].t, LOOKS[step].t + 0.3)));
        const rw = 1180 * pop, rh = rw * side.height / side.width;
        ctx.save(); ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 22); ctx.clip();
        drawSide(look, px + pw / 2 - rw / 2, py + ph - 25 - rh * (616 / 640), rw);
        ctx.restore();
        rr(px + 30, py + 30, 120, 56, 12, 'rgba(245,184,0,0.15)', C.acc, 2);
        txt('v' + (look.ver || 1), px + 90, py + 72, { size: 46, color: C.acc, align: 'center' });
        let cy = py + 64;
        LOOKS.forEach((L, k) => {
          if (k === 0 || lt < L.t) return;
          const a = eo(seg(lt, L.t, L.t + 0.3));
          ctx.save(); ctx.globalAlpha *= a;
          ctx.font = '600 26px ' + FB; const cw = ctx.measureText(L.chip).width + 36;
          rr(px + pw - 30 - cw + (1 - a) * 40, cy - 32, cw, 46, 23, 'rgba(62,140,255,0.18)', 'rgba(74,163,255,0.6)', 2);
          txt(L.chip, px + pw - 30 - cw + 18 + (1 - a) * 40, cy, { font: FB, size: 26, weight: 600, color: '#cfe4ff' });
          ctx.restore();
          cy += 58;
        });
        ctx.restore();
        STATS.forEach((S, k) => {
          const y = 1250 + k * 62, a = eo(seg(lt, 0.4 + k * 0.08, 0.8 + k * 0.08));
          if (a <= 0) return;
          let v = S[1][0];
          for (let j = 1; j < LOOKS.length; j++) v = lerp(v, S[1][j], eo(seg(lt, LOOKS[j].t, LOOKS[j].t + 0.6)));
          ctx.save(); ctx.globalAlpha = a;
          txt(S[0], L0, y + 22, { font: FB, size: 30, weight: 600, color: C.muted });
          bar(300, y, 560, 22, v / 100, k === 4 ? C.good : C.acc);
          txt(String(Math.round(v)), 1000, y + 24, { font: FB, size: 32, weight: 800, align: 'right' });
          ctx.restore();
        });
        vignette(0.45);
      } },
    // 24–30 run the program (four stacked cards)
    { t0: 24, t1: 30, draw(lt) {
        bg(lt + 24);
        kicker('Your program', L0, 250, eo(seg(lt, 0, 0.4)));
        rtxt('Run the whole program.', L0 - 4, 350, lt, 0.05, 6.2, { size: fitSize('Run the whole program.', 940, 100), color: '#fff' });
        lines(['Sponsors, mentors, facilities, testing', 'time and the budget behind it all.'], L0, 418, 44, lt, 0.3, 6.2, { font: FB, size: 32, weight: 600, color: C.muted });
        const x = 60, cw = 960, ch = 236, ys = [490, 742, 994, 1246];
        const ca = k => eo(seg(lt, 0.35 + k * 0.25, 0.85 + k * 0.25)), slide = k => (1 - ca(k)) * 60;
        let a = ca(0);
        if (a > 0) {
          const y = ys[0]; ctx.save(); ctx.translate(0, slide(0)); panel(x, y, cw, ch, a, 'Finances'); ctx.globalAlpha = a;
          txt(money(lerp(45000, 82400, eio(seg(lt, 0.6, 3.6)))), x + 28, y + 118, { font: FB, size: 66, weight: 800 });
          [['+ $12,000', 'Title sponsor', C.good, 1.0], ['+ $14,000', 'School funding', C.good, 1.6], ['− $11,000', 'CNC router', C.bad, 2.3]].forEach((L, k) => {
            const la = eo(seg(lt, L[3], L[3] + 0.3)); if (la <= 0) return;
            ctx.save(); ctx.globalAlpha *= la;
            txt(L[0], x + 500, y + 98 + k * 40, { font: FB, size: 25, weight: 800, color: L[2] });
            txt(L[1], x + 650, y + 98 + k * 40, { font: FB, size: 25, weight: 400, color: C.muted });
            ctx.restore();
          });
          ctx.restore();
        }
        a = ca(1);
        if (a > 0) {
          const y = ys[1]; ctx.save(); ctx.translate(0, slide(1)); panel(x, y, cw, ch, a, 'Workshop facilities'); ctx.globalAlpha = a;
          [['3D Printing', 3, 3, 0.92], ['CNC Machining', 2, 2, 0.78], ['Practice Field', 3, 3, 0.86], ['Programming Station', 2, 3, 0.64]].forEach((F, k) => {
            const y2 = y + 90 + k * 38;
            txt(F[0], x + 28, y2 + 9, { font: FB, size: 25, weight: 600 });
            for (let p = 0; p < F[2]; p++) { const on = lt > 1.0 + k * 0.2 + p * 0.25; ctx.beginPath(); ctx.arc(x + 380 + p * 30, y2, 10, 0, 7); ctx.fillStyle = p < F[1] && on ? C.acc : 'rgba(255,255,255,0.14)'; ctx.fill(); }
            bar(x + 500, y2 - 7, 330, 14, F[3] * eo(seg(lt, 1.0 + k * 0.2, 1.8 + k * 0.2)), F[3] > 0.75 ? C.good : C.warn);
            txt(Math.round(F[3] * 100) + '%', x + cw - 28, y2 + 9, { font: FB, size: 22, weight: 800, align: 'right', color: C.muted });
          });
          ctx.restore();
        }
        a = ca(2);
        if (a > 0) {
          const y = ys[2]; ctx.save(); ctx.translate(0, slide(2)); panel(x, y, cw, ch, a, 'Testing hours · practice field'); ctx.globalAlpha = a;
          const sp = lerp(0.5, 0.75, eio(seg(lt, 2.0, 3.2))), total = 16, drv = Math.round(total * sp), dev = total - drv;
          txt(total + ' h', x + 28, y + 112, { font: FB, size: 54, weight: 800 });
          txt('this week', x + 150, y + 110, { font: FB, size: 24, weight: 400, color: C.muted });
          const bx = x + 28, bw = cw - 56;
          rr(bx, y + 134, bw, 32, 8, '#0c0f13'); rr(bx, y + 134, bw * (1 - sp), 32, 8, C.info); rr(bx + bw * (1 - sp), y + 134, bw * sp, 32, 8, C.acc);
          txt('Development testing  ' + dev + ' h', x + 28, y + 206, { font: FB, size: 25, weight: 800, color: C.info });
          txt('Driver practice  ' + drv + ' h', x + cw - 28, y + 206, { font: FB, size: 25, weight: 800, color: C.acc, align: 'right' });
          ctx.restore();
        }
        a = ca(3);
        if (a > 0) {
          const y = ys[3]; ctx.save(); ctx.translate(0, slide(3)); panel(x, y, cw, ch, a, 'Team & outreach'); ctx.globalAlpha = a;
          txt('28 students · 6 mentors · morale 74', x + 28, y + 100, { font: FB, size: 28, weight: 600 });
          const ir = lerp(41, 82, eio(seg(lt, 1.6, 3.8)));
          txt('Impact rating', x + 28, y + 156, { font: FB, size: 26, weight: 600, color: C.muted });
          bar(x + 250, y + 137, 560, 22, ir / 100, ir >= 75 ? C.good : C.acc);
          txt(String(Math.round(ir)), x + cw - 28, y + 159, { font: FB, size: 30, weight: 800, align: 'right' });
          const od = Math.round(lerp(2, 47, eio(seg(lt, 2.0, 4.0))));
          txt('Impact Award odds at Heartland Regional', x + 28, y + 206, { font: FB, size: 24, weight: 400, color: C.muted });
          txt(od + '%', x + cw - 28, y + 208, { font: FB, size: 34, weight: 800, align: 'right', color: od > 30 ? C.good : C.acc });
          ctx.restore();
        }
        vignette(0.4);
      } },
    // 30–38 compete (the drop) — camera follows your robot
    { t0: 30, t1: 38, draw(lt) {
        const M = MS.compete, m = M.m;
        ctx.fillStyle = '#07090c'; ctx.fillRect(0, 0, W, H);
        drawMatchCrop(M, 0, 320, W, 1040, 1040 * (1 + 0.04 * eio(seg(lt, 0, 8))));
        const tg = ctx.createLinearGradient(0, 280, 0, 380); tg.addColorStop(0, 'rgba(7,9,12,1)'); tg.addColorStop(1, 'rgba(7,9,12,0)'); ctx.fillStyle = tg; ctx.fillRect(0, 280, W, 100);
        bottomFade(1290);
        // scoreboard
        const sr = tot(m.score.red), sb = tot(m.score.blue);
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 24; rr(60, 170, 960, 130, 20, 'rgba(14,17,21,0.95)'); ctx.restore();
        rr(72, 182, 300, 106, 14, C.red); rr(708, 182, 300, 106, 14, C.blue);
        txt(String(sr), 222, 260, { font: FB, size: 72, weight: 900, align: 'center' });
        txt(String(sb), 858, 260, { font: FB, size: 72, weight: 900, align: 'center' });
        txt(clock(m), CX, 250, { font: FB, size: 56, weight: 800, align: 'center' });
        { const R26 = G.Rules[2026], ra = R26.active(m, 'red'), ba = R26.active(m, 'blue');
          const lab = m.done ? 'FINAL' : ra && ba ? 'BOTH HUBS' : ra ? 'RED HUB ACTIVE' : 'BLUE HUB ACTIVE';
          txt(lab, CX, 286, { font: FB, size: 17, weight: 800, align: 'center', color: ra && !ba ? '#ff8a8e' : ba && !ra ? '#8fbaff' : C.acc, spacing: 2 }); }
        const CALLS = [['Play defense', 1.9], ['Climb now', 5.4]];
        CALLS.forEach(([s, at], k) => {
          const end = k < CALLS.length - 1 ? Math.min(at + 1.9, CALLS[k + 1][1] - 0.02) : at + 2.2;
          const v = vis(lt, at, end, 0.25, 0.3); if (v <= 0) return;
          ctx.save(); ctx.globalAlpha = v; const x = 60 - (1 - v) * 80, y = 350;
          ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 24; rr(x, y, 560, 130, 16, 'rgba(14,17,21,0.95)'); ctx.shadowColor = 'transparent';
          rr(x, y, 560, 130, 16, null, C.acc, 3);
          txt('COACH CALL ' + (k + 1) + ' / 4', x + 28, y + 46, { font: FB, size: 24, weight: 800, color: C.acc, spacing: 3 });
          txt(s, x + 26, y + 108, { size: 64, color: '#fff' });
          ctx.restore();
        });
        lines(['Make the calls', 'that win matches.'], L0, 1450, 96, lt, 0.2, 7.8, { size: 98, color: '#fff' });
        vignette(0.35);
      } },
    // 38–44 scout & pick
    { t0: 38, t1: 44, draw(lt) {
        bg(lt + 38);
        kicker('Scouting & alliance selection', L0, 250, eo(seg(lt, 0, 0.4)));
        rtxt('Scout every robot.', L0 - 4, 356, lt, 0.05, 6.2, { size: fitSize('Scout every robot.', 940, 110), color: '#fff' });
        lines(['Pick partners that won’t break', 'down in the playoffs.'], L0, 424, 44, lt, 0.3, 6.2, { font: FB, size: 32, weight: 600, color: C.muted });
        const x = 60, y = 500, tw = 960, th = 600, a = eo(seg(lt, 0.3, 0.8));
        panel(x, y, tw, th, a, 'Pick list · observed in quals');
        if (a > 0) {
          ctx.save(); ctx.globalAlpha = a;
          const cols = [['TEAM', 28], ['OPR', 210], ['AUTO', 360], ['FAULT-FREE', 520], ['VALUE', 800]];
          cols.forEach(c => txt(c[0], x + c[1], y + 98, { font: FB, size: 20, weight: 800, color: C.dim, spacing: 2 }));
          ctx.fillStyle = C.line; ctx.fillRect(x + 24, y + 114, tw - 48, 2);
          const sortK = eio(seg(lt, 2.1, 2.8));
          const byOpr = SCOUT.slice().sort((p, q) => q.opr - p.opr), byVal = SCOUT.slice().sort((p, q) => q.v - p.v);
          SCOUT.forEach(r => {
            const i0 = byOpr.indexOf(r), i1 = byVal.indexOf(r), ry = y + 166 + lerp(i0, i1, sortK) * 66;
            const ra = eo(seg(lt, 0.6 + i0 * 0.1, 0.9 + i0 * 0.1)); if (ra <= 0) return;
            const best = r.t === 1576 && lt > 2.9;
            ctx.save(); ctx.globalAlpha *= ra;
            if (best) { const pa = 0.5 + 0.5 * Math.sin((lt - 2.9) * 8); rr(x + 14, ry - 44, tw - 28, 62, 12, 'rgba(245,184,0,0.12)', 'rgba(245,184,0,' + (0.6 + 0.4 * pa) + ')', 3); }
            txt(String(r.t), x + 28, ry, { font: FB, size: 32, weight: 800, color: best ? C.acc : C.text });
            txt(r.opr.toFixed(1), x + 210, ry, { font: FB, size: 30, weight: 600 });
            txt(Math.round(r.auto * 100) + '%', x + 360, ry, { font: FB, size: 30, weight: 600, color: pc(r.auto) });
            txt(Math.round(r.ff * 100) + '%' + (r.dead ? ' ' + r.dead + '✕' : ''), x + 520, ry, { font: FB, size: 30, weight: 600, color: pc(r.ff) });
            txt(r.v.toFixed(1), x + 800, ry, { font: FB, size: 32, weight: 900, color: best ? C.acc : C.text });
            ctx.restore();
          });
          const sa = vis(lt, 2.1, 6, 0.3, 0.2);
          if (sa > 0) txt('↓ Re-sorted by pick value: OPR minus breakdowns', x + 28, y + th - 30, { font: FB, size: 24, weight: 600, color: C.acc, alpha: sa });
          ctx.restore();
        }
        const ay = 1130, ah = 330, aa = eo(seg(lt, 0.9, 1.4));
        panel(x, ay, tw, ah, aa, 'Alliance selection');
        if (aa > 0) {
          ctx.save(); ctx.globalAlpha = aa;
          txt('ALLIANCE 1', x + tw - 28, ay + 48, { size: 40, color: C.acc, spacing: 3, align: 'right' });
          [['Captain', TEAM, 0.9], ['1st pick', 1576, 3.3], ['2nd pick', 8962, 4.4]].forEach((s, k) => {
            const bx = x + 28 + k * 306, on = lt >= s[2], pa = eo(seg(lt, s[2], s[2] + 0.35));
            rr(bx, ay + 90, 292, 200, 14, on ? 'rgba(229,72,77,0.18)' : 'rgba(255,255,255,0.04)', on ? 'rgba(229,72,77,0.7)' : C.line, 2);
            txt(s[0].toUpperCase(), bx + 24, ay + 136, { font: FB, size: 22, weight: 800, color: C.muted, spacing: 2 });
            if (on) txt(String(s[1]), bx + 24 + (1 - pa) * 30, ay + 220, { font: FB, size: 60, weight: 900, alpha: pa });
            else txt('—', bx + 24, ay + 216, { font: FB, size: 50, weight: 400, color: C.dim });
          });
          const st = eo(seg(lt, 3.5, 3.8)) * (1 - seg(lt, 5.8, 6));
          if (st > 0) {
            ctx.save(); ctx.translate(x + 28 + 306 + 146, ay + 250); ctx.rotate(-0.16); ctx.scale(lerp(1.6, 1, st), lerp(1.6, 1, st)); ctx.globalAlpha *= st;
            rr(-125, -36, 250, 72, 10, 'rgba(14,17,21,0.85)', C.good, 5);
            txt('ACCEPTED', 0, 15, { font: FB, size: 38, weight: 900, color: C.good, align: 'center', spacing: 2 });
            ctx.restore();
          }
          ctx.restore();
        }
        vignette(0.4);
      } },
    // 44–50 playoffs → banners
    { t0: 44, t1: 50, draw(lt) {
        bg(lt + 44, { glow: { x: CX, y: 900, r: 800, c: 'rgba(0,102,179,' + (0.22 * eo(seg(lt, 2.6, 3.4))) + ')' } });
        const fa = vis(lt, 0, 2.9, 0.3, 0.35);
        if (fa > 0) {
          ctx.save(); ctx.globalAlpha = fa;
          kicker('Double-elimination playoffs', L0, 250, 1);
          txt('FINALS · MATCH 3', CX, 560, { size: 70, align: 'center', color: C.muted, spacing: 6 });
          const rs = Math.round(lerp(96, 142, eio(seg(lt, 0.3, 1.9)))), bs = Math.round(lerp(101, 128, eio(seg(lt, 0.3, 1.9))));
          rr(60, 640, 460, 320, 24, C.red); rr(560, 640, 460, 320, 24, C.blue);
          txt('ALLIANCE 1', 290, 712, { font: FB, size: 30, weight: 800, align: 'center', spacing: 3, color: 'rgba(255,255,255,0.85)' });
          txt('ALLIANCE 2', 790, 712, { font: FB, size: 30, weight: 800, align: 'center', spacing: 3, color: 'rgba(255,255,255,0.85)' });
          txt(String(rs), 290, 890, { font: FB, size: 160, weight: 900, align: 'center' });
          txt(String(bs), 790, 890, { font: FB, size: 160, weight: 900, align: 'center' });
          const wa = eo(seg(lt, 1.95, 2.3));
          if (wa > 0) {
            ctx.save(); ctx.translate(CX, 1130); ctx.scale(lerp(1.4, 1, wa), lerp(1.4, 1, wa)); ctx.globalAlpha *= wa;
            txt('REGIONAL', 0, 0, { size: 120, align: 'center', color: C.acc, glow: 'rgba(245,184,0,0.6)', blur: 30, spacing: 6 });
            txt('CHAMPIONS', 0, 120, { size: 120, align: 'center', color: C.acc, glow: 'rgba(245,184,0,0.6)', blur: 30, spacing: 6 });
            ctx.restore();
          }
          ctx.restore();
        }
        const ba = vis(lt, 2.85, 6.2, 0.2, 0.2);
        if (ba > 0) {
          ctx.save(); ctx.globalAlpha = ba;
          rtxt('Hang your banners.', CX, 330, lt, 2.95, 6.2, { size: fitSize('Hang your banners.', 940, 110), align: 'center', color: '#fff' });
          lines(['Event wins and Impact Awards go', 'up on your banner wall.'], CX, 400, 44, lt, 3.15, 6.2, { font: FB, size: 32, weight: 600, align: 'center', color: C.muted });
          const B = [['Regional Winners', 2024, 'Heartland Regional', true, 3.2], ['Impact Award', 2025, 'Great Lakes Regional', false, 3.55], ['Regional Winners', 2026, 'Peach Hills Regional', true, 3.9], ['Championship Division Winners', 2026, 'Newton Division', true, 4.25]];
          const bw = 340, bh = 470, pos = [[150, 500], [590, 500], [150, 1010], [590, 1010]];
          B.forEach((b, k) => {
            const d = seg(lt, b[4], b[4] + 0.55); if (d <= 0) return;
            const [bx, by] = pos[k], yy = by + (1 - back(d)) * -600;
            ctx.save(); ctx.globalAlpha *= Math.min(1, d * 3);
            ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(bx + bw / 2 - 1, by - 40, 2, Math.max(0, yy - by + 40));
            banner(bx, yy, bw, bh, b[0], b[1], b[2], b[3]);
            ctx.restore();
          });
          ctx.restore();
        }
        vignette(0.45);
      } },
    // 50–54 championship / einstein
    { t0: 50, t1: 54, draw(lt) {
        champBg(lt);
        const WORDS = [['QUALIFY FOR', 'CHAMPIONSHIP', 0], ['WIN YOUR', 'DIVISION', 1.33], ['REACH', 'EINSTEIN', 2.66]];
        WORDS.forEach(([a, b, at]) => {
          if (lt < at || lt >= at + 1.33) return;
          const l = lt - at, pk = 1 + 0.12 * (1 - eo(seg(l, 0, 0.25))), o = 1 - seg(l, 1.15, 1.33);
          ctx.save(); ctx.translate(CX, 460); ctx.scale(pk, pk); ctx.globalAlpha = o;
          txt(a, 0, -110, { size: 76, align: 'center', color: C.muted, spacing: 10 });
          txt(b, 0, 70, { size: fitSize(b, 960, 230, { spacing: 10 }), align: 'center', color: b === 'EINSTEIN' ? C.acc : '#fff', glow: b === 'EINSTEIN' ? 'rgba(245,184,0,0.7)' : 'rgba(255,255,255,0.3)', blur: 40, spacing: 10 });
          ctx.restore();
        });
      } },
    // 54–60 end card
    { t0: 54, t1: 60, draw(lt) {
        bg(lt + 54, { glow: { x: CX, y: 820, r: 800, c: 'rgba(245,184,0,0.14)' } });
        particles(lt + 54, 0.5);
        const a = eo(seg(lt, 0, 0.6));
        ctx.save(); ctx.globalAlpha = a * 0.95;
        drawSide({ drive: 'swerve', ver: 3, vision: 2, c1: TC1, c2: TC2, intake: 'under', shooter: 'pivot', manip: 'ampbar', climber: 'arms' }, CX - 300, 150 + (1 - a) * 40, 600);
        ctx.restore();
        ctx.save(); ctx.translate(CX, 0); const sc = lerp(1.08, 1, a);
        ctx.translate(0, 900); ctx.scale(sc, sc);
        txt('FRC', 0, -20, { size: 280, spacing: 10, color: C.acc, glow: 'rgba(245,184,0,0.5)', blur: 40, alpha: a, align: 'center' });
        txt('MANAGER', 0, 150, { size: fitSize('MANAGER', 960, 190, { spacing: 10 }), spacing: 10, color: '#fff', alpha: a, align: 'center' });
        ctx.restore();
        rtxt('Play free in your browser', CX, 1180, lt, 0.4, 6.5, { font: FB, size: 52, weight: 800, align: 'center' });
        const ua = eo(seg(lt, 0.7, 1.1));
        if (ua > 0) {
          ctx.save(); ctx.globalAlpha = ua;
          const fs = fitSize(URL_TXT, 860, 40, { font: FB, weight: 800 });
          ctx.font = '800 ' + fs + 'px ' + FB; const uw = ctx.measureText(URL_TXT).width + 70;
          rr(CX - uw / 2, 1225, uw, 86, 43, 'rgba(245,184,0,0.14)', C.acc, 3);
          txt(URL_TXT, CX, 1282, { font: FB, size: fs, weight: 800, align: 'center', color: C.acc2 });
          ctx.restore();
        }
        lines(['Career mode · five seasons', 'No install · saves in your browser'], CX, 1390, 44, lt, 1.0, 6.5, { font: FB, size: 32, weight: 600, align: 'center', color: C.muted });
        lines(['Unofficial fan-made game.', 'Not affiliated with or endorsed by FIRST®.'], CX, 1510, 32, lt, 1.2, 6.5, { font: FB, size: 24, weight: 400, align: 'center', color: C.dim });
        vignette(0.45);
        const f = seg(lt, 5.2, 6);
        if (f > 0) { ctx.fillStyle = 'rgba(0,0,0,' + f + ')'; ctx.fillRect(0, 0, W, H); }
      } }
  ];
  SCENES_V.forEach((s, i) => { s.tick = SCENES[i].tick; });
  const SC = VERT ? SCENES_V : SCENES;

  // cuts: white flashes on the big hits, quick dips elsewhere
  const FLASH = [[4, 0.5, 0.95], [30, 0.45, 0.85], [54, 0.5, 0.8], [8, 0.2, 0.35], [18, 0.2, 0.3], [24, 0.2, 0.3], [38, 0.2, 0.3], [44, 0.2, 0.3], [50, 0.25, 0.5], [51.33, 0.15, 0.35], [52.66, 0.15, 0.35]];
  const CUTS = [10, 12, 14, 16];
  function overlays(t) {
    FLASH.forEach(([at, d, k]) => { if (t >= at && t < at + d) { ctx.fillStyle = 'rgba(255,255,255,' + (k * (1 - (t - at) / d)) + ')'; ctx.fillRect(0, 0, W, H); } });
    CUTS.forEach(at => {
      // yellow whip bar across the cut
      const k = (t - (at - 0.12)) / 0.3; if (k < 0 || k > 1) return;
      const x = lerp(-700, W + 200, eio(k));
      ctx.save(); ctx.transform(1, 0, -0.35, 1, 0, 0); ctx.fillStyle = 'rgba(245,184,0,0.85)'; ctx.fillRect(x, 0, 160, H); ctx.fillStyle = 'rgba(245,184,0,0.3)'; ctx.fillRect(x - 140, 0, 110, H); ctx.restore();
    });
  }

  // ---------------------------------------------------------------- timeline
  let cur = -1;
  function reset() { prep(); cur = -1; }
  function stepTo(fi) { // advance simulation state frame by frame
    if (fi < cur) reset();
    while (cur < fi) {
      cur++;
      const t = cur / FPS;
      SC.forEach(s => { if (s.tick && t >= s.t0 && t < s.t1) s.tick(t - s.t0, 1 / FPS); });
    }
  }
  function drawFrame(fi) {
    stepTo(fi);
    const t = fi / FPS;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.letterSpacing = '0px';
    const s = SC.find(x => t >= x.t0 && t < x.t1) || SC[SC.length - 1];
    s.draw(t - s.t0);
    overlays(t);
    ctx.restore();
  }

  // ---------------------------------------------------------------- soundtrack
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  async function renderMusic() {
    const SR = 48000, ac = new OfflineAudioContext(2, SR * DUR, SR);
    const R = G.makeRng(808);
    const noise = ac.createBuffer(1, SR * 2, SR); { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = R.next() * 2 - 1; }
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.18;
    const master = ac.createGain(); master.gain.value = 0.62; master.connect(comp); comp.connect(ac.destination);
    master.gain.setValueAtTime(0.62, 58.2); master.gain.linearRampToValueAtTime(0.0001, 59.95);
    // reverb
    const rev = ac.createConvolver(); { const len = SR * 2.6, ib = ac.createBuffer(2, len, SR); for (let c = 0; c < 2; c++) { const d = ib.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (R.next() * 2 - 1) * Math.pow(1 - i / len, 3.2); } rev.buffer = ib; }
    const revOut = ac.createGain(); revOut.gain.value = 0.22; rev.connect(revOut); revOut.connect(master);
    // buses: drums dry; music ducked by the kick
    const drums = ac.createGain(); drums.gain.value = 0.9; drums.connect(master);
    const duck = ac.createGain(); duck.gain.value = 1; duck.connect(master);
    const send = (node, amt) => { const g = ac.createGain(); g.gain.value = amt; node.connect(g); g.connect(rev); };
    const ns = (t, dur, off) => { const s = ac.createBufferSource(); s.buffer = noise; s.start(t, (off || R.next() * 1.5), dur); return s; };
    const env = (g, t, a, peak, d, end) => { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(Math.max(0.0001, end || 0.0001), t + a + d); };

    function kick(t, v) {
      v = v == null ? 1 : v;
      const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(44, t + 0.12);
      env(g, t, 0.003, 0.95 * v, 0.4); o.connect(g); g.connect(drums); o.start(t); o.stop(t + 0.5);
      const c = ns(t, 0.02), hp = ac.createBiquadFilter(), cg = ac.createGain(); hp.type = 'highpass'; hp.frequency.value = 2500; env(cg, t, 0.001, 0.25 * v, 0.02); c.connect(hp); hp.connect(cg); cg.connect(drums);
      duck.gain.setValueAtTime(1, t); duck.gain.linearRampToValueAtTime(0.42, t + 0.012); duck.gain.linearRampToValueAtTime(1, t + 0.22);
    }
    function clap(t, v) {
      v = v == null ? 1 : v;
      const s = ns(t, 0.3), bp = ac.createBiquadFilter(), g = ac.createGain(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 0.9;
      g.gain.setValueAtTime(0.0001, t);
      [0, 0.011, 0.022].forEach(d => { g.gain.linearRampToValueAtTime(0.55 * v, t + d + 0.002); g.gain.linearRampToValueAtTime(0.12 * v, t + d + 0.009); });
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      s.connect(bp); bp.connect(g); g.connect(drums); send(g, 0.35);
      const o = ac.createOscillator(), og = ac.createGain(); o.type = 'triangle'; o.frequency.value = 190; env(og, t, 0.002, 0.18 * v, 0.09); o.connect(og); og.connect(drums); o.start(t); o.stop(t + 0.15);
    }
    function hat(t, open, v) {
      v = v == null ? 1 : v;
      const s = ns(t, open ? 0.35 : 0.08), hp = ac.createBiquadFilter(), g = ac.createGain(); hp.type = 'highpass'; hp.frequency.value = 7600;
      env(g, t, 0.001, (open ? 0.16 : 0.12) * v, open ? 0.3 : 0.045); s.connect(hp); hp.connect(g); g.connect(drums);
    }
    function crash(t, v) {
      const s = ns(t, 2.5), hp = ac.createBiquadFilter(), g = ac.createGain(); hp.type = 'highpass'; hp.frequency.value = 4200;
      env(g, t, 0.002, 0.2 * (v || 1), 2.2); s.connect(hp); hp.connect(g); g.connect(drums); send(g, 0.4);
    }
    function bass(t, dur, n, v) {
      v = v == null ? 1 : v;
      const o = ac.createOscillator(), o2 = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain();
      o.type = 'sawtooth'; o.frequency.value = midi(n); o2.type = 'square'; o2.frequency.value = midi(n - 12);
      lp.type = 'lowpass'; lp.Q.value = 6; lp.frequency.setValueAtTime(1100 * v, t); lp.frequency.exponentialRampToValueAtTime(260, t + Math.min(dur, 0.2));
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.32 * v, t + 0.006); g.gain.setValueAtTime(0.26 * v, t + dur - 0.03); g.gain.linearRampToValueAtTime(0.0001, t + dur);
      const sg = ac.createGain(); sg.gain.value = 0.5; o2.connect(sg); sg.connect(lp); o.connect(lp); lp.connect(g); g.connect(duck);
      o.start(t); o2.start(t); o.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
    }
    function pad(t, dur, notes, v) {
      v = v == null ? 1 : v;
      const lp = ac.createBiquadFilter(), g = ac.createGain(); lp.type = 'lowpass'; lp.frequency.value = 1500; lp.Q.value = 0.4;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05 * v, t + Math.min(0.5, dur * 0.3)); g.gain.setValueAtTime(0.05 * v, t + dur - 0.15); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.35);
      lp.connect(g); g.connect(duck); send(g, 0.6);
      notes.forEach(n => [-7, 7].forEach(dt => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midi(n); o.detune.value = dt; o.connect(lp); o.start(t); o.stop(t + dur + 0.4); }));
    }
    function pluck(t, n, v) {
      v = v == null ? 1 : v;
      const o = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain(); o.type = 'square'; o.frequency.value = midi(n);
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(4200, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.16);
      env(g, t, 0.002, 0.075 * v, 0.24); o.connect(lp); lp.connect(g); g.connect(duck); send(g, 0.3); o.start(t); o.stop(t + 0.3);
    }
    function lead(t, dur, n, v) {
      v = v == null ? 1 : v;
      const lp = ac.createBiquadFilter(), g = ac.createGain(); lp.type = 'lowpass'; lp.frequency.value = 3200; lp.Q.value = 1.5;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.085 * v, t + 0.012); g.gain.setValueAtTime(0.07 * v, t + Math.max(0.02, dur - 0.04)); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.06);
      lp.connect(g); g.connect(duck); send(g, 0.35);
      [[ 'sawtooth', 0 ], [ 'sawtooth', 9 ], [ 'square', -6 ]].forEach(([ty, de]) => { const o = ac.createOscillator(); o.type = ty; o.frequency.value = midi(n); o.detune.value = de; o.connect(lp); o.start(t); o.stop(t + dur + 0.1); });
    }
    function riser(t0, t1, v) {
      const s = ns(t0, t1 - t0 + 0.05, 0), bp = ac.createBiquadFilter(), g = ac.createGain(); bp.type = 'bandpass'; bp.Q.value = 3;
      bp.frequency.setValueAtTime(300, t0); bp.frequency.exponentialRampToValueAtTime(7500, t1);
      g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.32 * (v || 1), t1); g.gain.linearRampToValueAtTime(0.0001, t1 + 0.05);
      s.connect(bp); bp.connect(g); g.connect(master); send(g, 0.3);
    }
    function whoosh(t) {
      const s = ns(t - 0.25, 0.6), bp = ac.createBiquadFilter(), g = ac.createGain(); bp.type = 'bandpass'; bp.Q.value = 1.4;
      bp.frequency.setValueAtTime(6000, t - 0.25); bp.frequency.exponentialRampToValueAtTime(400, t + 0.3);
      g.gain.setValueAtTime(0.0001, t - 0.25); g.gain.linearRampToValueAtTime(0.17, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      s.connect(bp); bp.connect(g); g.connect(master); send(g, 0.25);
    }
    function impact(t, v) {
      v = v || 1;
      const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(38, t + 1.4);
      env(g, t, 0.004, 0.95 * v, 2.2); o.connect(g); g.connect(drums); o.start(t); o.stop(t + 2.4);
      const s = ns(t, 1.2), lp = ac.createBiquadFilter(), ng = ac.createGain(); lp.type = 'lowpass'; lp.frequency.value = 700; env(ng, t, 0.002, 0.5 * v, 0.9); s.connect(lp); lp.connect(ng); ng.connect(drums); send(ng, 0.5);
      crash(t, 1.2 * v);
    }

    // harmony (A minor: Am F C G), one chord per 2-second bar
    const CH = [
      { b: 45, pad: [57, 60, 64, 69], arp: [57, 60, 64, 69, 72, 69, 64, 60], lead: [76, -1, 81, -1, 79, 76, 74, 76] },
      { b: 41, pad: [53, 57, 60, 65], arp: [53, 57, 60, 65, 69, 65, 60, 57], lead: [72, -1, 77, -1, 76, 72, 69, 72] },
      { b: 48, pad: [55, 60, 64, 67], arp: [48, 52, 55, 60, 64, 60, 55, 52], lead: [76, -1, 79, -1, 84, 79, 76, 79] },
      { b: 43, pad: [55, 59, 62, 67], arp: [55, 59, 62, 67, 71, 67, 62, 59], lead: [74, -1, 79, -1, 83, 81, 79, 74] }
    ];
    const sect = b => b < 2 ? 'intro' : b < 4 ? 'title' : b < 9 ? 'montage' : b < 12 ? 'design' : b < 15 ? 'program' : b < 19 ? 'drop' : b < 22 ? 'scout' : b < 25 ? 'playoff' : b < 27 ? 'champs' : 'end';
    for (let b = 0; b < 30; b++) {
      const t = b * 2, c = CH[b % 4], s = sect(b), E8 = 0.25;
      const full = s === 'drop' || s === 'playoff' || s === 'champs';
      const groove = s === 'montage' || s === 'design' || s === 'program' || s === 'scout' || full;
      // pads
      if (s !== 'end') pad(t, 2, c.pad, s === 'intro' ? 0.8 : full ? 1.1 : 1);
      // drums
      if (groove) {
        const lastHalfBuild = (b === 14 || b === 26) ;
        for (let q = 0; q < 4; q++) { if (lastHalfBuild && q >= 2) continue; kick(t + q * 0.5, full ? 1 : 0.85); }
        if (b >= 6) { clap(t + 0.5, full ? 1 : 0.8); clap(t + 1.5, full ? 1 : 0.8); }
        for (let e = 0; e < 8; e++) hat(t + e * E8 + (full ? 0 : 0), e % 2 === 1, e % 2 ? 0.9 : 0.6);
        if (full || s === 'scout') for (let e = 0; e < 8; e++) hat(t + e * E8 + 0.125, false, 0.35);
      } else if (s === 'intro' && b === 1) { for (let e = 0; e < 16; e++) hat(t + e * 0.125, false, 0.12 + e * 0.012); }
      // bass
      if (groove) { for (let e = 0; e < 8; e++) bass(t + e * E8, 0.21, c.b + (e % 4 === 3 ? 12 : 0), full ? 1 : 0.85); }
      else if (s === 'title') bass(t, 1.9, c.b - 12, 0.7);
      // arp / pluck
      if (s === 'montage' || s === 'scout') for (let e = 0; e < 8; e++) pluck(t + e * E8, c.arp[e] + 12, 0.9);
      if (s === 'design' || s === 'program' || s === 'champs') for (let e = 0; e < 16; e++) pluck(t + e * 0.125, c.arp[e % 8] + 12, 0.75);
      // lead melody
      if (s === 'drop' || s === 'playoff' || s === 'champs') {
        const L = c.lead, up = s === 'champs' ? 12 : 0;
        for (let e = 0; e < 8; e++) { if (L[e] < 0) continue; let d = 1; while (e + d < 8 && L[e + d] === -1) d++; lead(t + e * E8, d * E8 - 0.03, L[e] + up, 1); }
      }
      // fills
      if (b === 14 || b === 24 || b === 26) for (let e = 0; e < 8; e++) clap(t + 1 + e * 0.125, 0.25 + e * 0.09);
    }
    // events
    riser(1.0, 4.0, 1); impact(4.0, 1);
    [8, 10, 12, 14, 16, 18, 24, 38, 44, 47, 50, 51.33, 52.66].forEach(whoosh);
    riser(26.0, 30.0, 1.1); impact(30.0, 1.1);
    crash(44, 1); crash(47, 0.8); crash(50, 1);
    riser(51.0, 54.0, 1.2); impact(54.0, 1.2);
    // end: held chord + slow motif
    pad(54, 5.4, [57, 60, 64, 69, 76], 1.1);
    bass(54, 5.0, 33, 0.5);
    [[54.5, 76], [55.0, 81], [55.5, 79], [56.0, 76], [56.75, 74], [57.25, 76], [58.0, 81]].forEach(([t, n]) => pluck(t, n, 1));
    return ac.startRendering();
  }

  // ---------------------------------------------------------------- render & encode
  const status = s => { document.getElementById('st').textContent = s; window.TR.status = s; };
  async function render(opts) {
    opts = opts || {};
    const TR = window.TR;
    if (TR.busy) return 'busy';
    TR.busy = true; TR.error = null; TR.progress = 0;
    try {
      await document.fonts.ready;
      status('Composing soundtrack…');
      const audio = await renderMusic();
      TR.peak = (function () { let p = 0; for (let c = 0; c < 2; c++) { const d = audio.getChannelData(c); for (let i = 0; i < d.length; i += 7) p = Math.max(p, Math.abs(d[i])); } return p; })();
      const target = new Mp4Muxer.ArrayBufferTarget();
      const muxer = new Mp4Muxer.Muxer({ target, video: { codec: 'avc', width: W, height: H, frameRate: FPS }, audio: { codec: 'aac', numberOfChannels: 2, sampleRate: 48000 }, fastStart: 'in-memory', firstTimestampBehavior: 'offset' });
      // audio
      status('Encoding audio…');
      const aenc = new AudioEncoder({ output: (ch, meta) => muxer.addAudioChunk(ch, meta), error: e => { TR.error = 'audio: ' + e.message; } });
      aenc.configure({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 });
      const L = audio.getChannelData(0), Rr = audio.getChannelData(1), N = 1024;
      for (let off = 0; off < L.length; off += N) {
        const n = Math.min(N, L.length - off), buf = new Float32Array(n * 2);
        buf.set(L.subarray(off, off + n), 0); buf.set(Rr.subarray(off, off + n), n);
        const ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(off / 48000 * 1e6), data: buf });
        aenc.encode(ad); ad.close();
      }
      await aenc.flush(); aenc.close();
      // video
      const venc = new VideoEncoder({ output: (ch, meta) => muxer.addVideoChunk(ch, meta), error: e => { TR.error = 'video: ' + e.message; } });
      venc.configure({ codec: 'avc1.640028', width: W, height: H, bitrate: opts.bitrate || 14e6, framerate: FPS, latencyMode: 'quality', avc: { format: 'avc' } });
      reset();
      const yieldNow = () => new Promise(r => { const ch = new MessageChannel(); ch.port1.onmessage = () => r(); ch.port2.postMessage(0); });
      for (let i = 0; i < NF; i++) {
        drawFrame(i);
        const vf = new VideoFrame(cv, { timestamp: Math.round(i * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
        venc.encode(vf, { keyFrame: i % (FPS * 2) === 0 }); vf.close();
        while (venc.encodeQueueSize > 6) await new Promise(r => setTimeout(r, 2));
        if (i % 15 === 0) { TR.progress = i / NF; status('Rendering video… ' + Math.round(100 * i / NF) + '%'); await yieldNow(); }
        if (TR.error) throw new Error(TR.error);
      }
      await venc.flush(); venc.close();
      muxer.finalize();
      const buf = target.buffer;
      TR.bytes = buf.byteLength;
      status('Saving ' + (buf.byteLength / 1048576).toFixed(1) + ' MB…');
      const name = opts.name || (VERT ? 'FRC-Manager-Reveal-Vertical.mp4' : 'FRC-Manager-Reveal.mp4');
      let saved = '';
      try { saved = await fetch('/__save?name=' + encodeURIComponent(name), { method: 'POST', body: buf }).then(r => r.ok ? r.text() : ''); } catch (e) { saved = ''; }
      if (!saved) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([buf], { type: 'video/mp4' })); a.download = name; a.click(); saved = 'downloaded'; }
      TR.saved = saved; TR.progress = 1;
      status('Done: ' + saved);
      return saved;
    } catch (e) { TR.error = e.message; status('Error: ' + e.message); throw e; }
    finally { TR.busy = false; }
  }

  // ---------------------------------------------------------------- preview UI
  const seek = document.getElementById('seek'), tm = document.getElementById('tm');
  let playing = false, raf = 0, pf = 0;
  function show(t) { const fi = clamp(Math.round(t * FPS), 0, NF - 1); drawFrame(fi); tm.textContent = (fi / FPS).toFixed(2) + ' s'; seek.value = fi / FPS; }
  seek.addEventListener('input', () => { playing = false; show(Number(seek.value)); });
  document.getElementById('play').addEventListener('click', () => {
    playing = !playing; if (!playing) return;
    let last = performance.now(); pf = Math.round(Number(seek.value) * FPS);
    const loop = now => { if (!playing) return; const adv = Math.round((now - last) * FPS / 1000); if (adv > 0) { pf = Math.min(NF - 1, pf + adv); last = now; show(pf / FPS); } if (pf < NF - 1) raf = requestAnimationFrame(loop); else playing = false; };
    raf = requestAnimationFrame(loop);
  });
  document.getElementById('render').addEventListener('click', () => { window.TR.render().catch(() => {}); });
  { const alt = document.getElementById('alt'); if (alt && VERT) { alt.href = '?'; alt.textContent = 'Landscape 16:9 version'; } }
  // web fonts load lazily on first use; load every weight up front so no frame falls back to a system font
  const fontsReady = Promise.all(['400', '600', '800', '900'].map(w => document.fonts.load(w + ' 40px Inter')).concat(['600', '700'].map(w => document.fonts.load(w + ' 40px Rajdhani')))).catch(() => null).then(() => document.fonts.ready);
  window.TR = { show, render: o => fontsReady.then(() => render(o)), renderMusic, drawFrame, reset, fontsReady, status: '', progress: 0, NF, FPS };
  fontsReady.then(() => { reset(); show(5.5); });
})();
