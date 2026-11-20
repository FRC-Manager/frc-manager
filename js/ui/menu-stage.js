'use strict';
/* FRC Manager — the main menu's stage (3.5.8; made for the new interface, and in the main game too).
   Behind the menu's text lies one canvas with a scene that changes every quarter of a minute or so:
     robot  a robot of one season, built from its highest designs, standing on its field; it comes apart, unit by unit,
            while the pointer is on it (the Garage's exploded view, drawn on one canvas)
     match  six such robots playing a match of a season, on the game's own engine
     world  the map with its cities, teams travelling to their events
   Everything is drawn by the game's renderer and played by its engine, as the reveal video was (tools/trailer): nothing is
   a picture. UI.Stage.start(canvas, caption) runs it; it stops by itself when its canvas leaves the page. UI.Stage.next()
   changes the scene, UI.Stage.show(year) holds the field of that game and a robot of it on stage (the menu's list of games), and
   UI.Stage.release() lets the scenes run again. Nothing here touches a career: the matches are thrown away. */
(function () {
  const U = G.U, UI = G.UI, Rd = G.Render, E = G.Engine, Geo = G.Geo, h = U.esc, ST = UI.Stage = {};
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v), lerp = (a, b, k) => a + (b - a) * k, eo = k => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
  const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const PAINT = [['#e8b400', '#15181c'], ['#2f6fd0', '#ffcf4a'], ['#c2412f', '#f2f4f6'], ['#2e9e5b', '#15181c'], ['#8a4fc0', '#ffd24d'], ['#17a0a0', '#f2f4f6'], ['#d1478c', '#15181c'], ['#3a3f47', '#f5b800'], ['#e08a1e', '#1f4fa3']];
  const rnd = n => Math.floor(Math.random() * n), pick = a => a[rnd(a.length)];
  // the player asked their system for less movement (the new interface has its own word for it: UI.reduced)
  const reduced = () => (UI.reduced ? !!UI.reduced() : !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches));
  // a match is played with the parts of its own year, as in a career (there is no career on the menu to ask)
  const withEra = (year, fn) => { const of0 = G.Era.of; G.Era.of = () => G.Era.at(G.singleCy ? G.singleCy(year) : year); try { return fn(); } finally { G.Era.of = of0; } };

  // ---------------------------------------------------------------- the highest designs of a season
  // In every subsystem one of its elite or complex concepts (complexity 4 and 5), or the most complex it has; the frame is
  // either; the drivetrain its last. A design that needs another one (a suction climber its elevator) gets it.
  function highPicks(year) {
    const Sz = G.Seasons[year], out = {};
    Sz.subs.forEach(sd => {
      const cs = (sd.concepts || []).filter(c => c.id !== 'none'); if (!cs.length || sd.id === 'soft') return;
      const top = Math.max.apply(null, cs.map(c => c.cx || 0)), hi = cs.filter(c => c.elite || (c.cx || 0) >= Math.min(4, top));
      out[sd.id] = (sd.id === 'drive' ? cs[cs.length - 1] : sd.id === 'frame' ? pick(cs) : pick(hi.length ? hi : cs)).id;
    });
    Sz.subs.forEach(sd => { const c = (sd.concepts || []).find(x => x.id === out[sd.id]), n = c && c.needs; if (n && out[n.sub] && !n.concepts.includes(out[n.sub])) out[n.sub] = n.concepts[n.concepts.length - 1]; });
    return out;
  }
  function highLook(year) {
    const picks = highPicks(year), subs = {}, col = pick(PAINT);
    Object.keys(picks).forEach(k => { subs[k] = { concept: picks[k], ver: 3, stats: {} }; });
    const lk = G.Cap.look(year, subs, { visionLvl: 2 }); lk.c1 = col[0]; lk.c2 = col[1];
    return lk;
  }
  const seasonLine = year => (year < 2100 ? String(year) : 'FANTASY');

  // ---------------------------------------------------------------- scene: a robot
  const LW = 900, LH = 660, GY = LH - Math.max(12, Math.round(LH * 0.11));              // a layer's drawing, and its floor line (as Rd.robotSide lays it out)
  // o.field (3.6, the menu's list of games): the game's field lies above the robot as a plan, the whole of it, with the
  // pieces where a match starts; the robot stands smaller under it. Pointing at the robot still takes it apart, and the
  // plan steps back while it is apart
  function fieldPlan(year) {
    const cv = document.createElement('canvas'); cv.width = 1400; cv.height = Math.round(1400 * E.FH / E.FW); const c = cv.getContext('2d'), s = cv.width / E.FW;
    let m = null; try { m = startMatch(year); } catch (e) { m = null; }                  // (no match: the bare field)
    Rd.field(c, year, s, m); if (m) { try { Rd.fx(c, s, m); } catch (e) { /* the field alone will do */ } }
    // its edge fades over a few pixels and its corners are round: a plan lying in the page, not a picture set on it
    const f = 12; c.save(); c.globalCompositeOperation = 'destination-in'; c.shadowColor = '#000'; c.shadowBlur = f; c.fillStyle = '#000'; c.beginPath();
    if (c.roundRect) c.roundRect(f, f, cv.width - 2 * f, cv.height - 2 * f, 16); else c.rect(f, f, cv.width - 2 * f, cv.height - 2 * f); c.fill(); c.restore();
    // with its soft shadow, made once here (a blurred shadow at every picture is costly where the canvas has no graphics card behind it)
    const pad = 100, out = document.createElement('canvas'); out.width = cv.width + pad * 2; out.height = cv.height + pad * 2; const oc = out.getContext('2d');
    oc.shadowColor = 'rgba(0,0,0,0.55)'; oc.shadowBlur = 64; oc.shadowOffsetY = 30; oc.drawImage(cv, pad, pad);
    out.pad = pad / cv.width;                                                          // the margin round the plan, as a share of the plan's width
    return out;
  }
  function robotScene(year, o) {
    const plan = o && o.field ? o.plan || fieldPlan(year) : null;                       // o.plan: the plan of the scene before, when only the robot changes
    // o.not: the robot on stage now ("Next scene" in the list of games asks for another one of the same game)
    const sigOf = l => Object.keys(l.sub).sort().map(k => k + ':' + l.sub[k]).join(',');
    let lk = highLook(year); for (let i = 0; i < 12 && o && o.not && sigOf(lk) === o.not; i++) lk = highLook(year);
    const Sz = G.Seasons[year], a = Math.random() < 0.5 ? 'red' : 'blue', team = 100 + rnd(9800);
    // one layer a unit, as in the Garage: the base last, so the bumpers lie over the feet of what stands behind them
    const ids = Sz.subs.map(sd => sd.id).filter(k => k !== 'drive' && k !== 'soft' && lk.sub[k]).concat(['soft', 'drive']);
    const layers = ids.map(k => {
      const cv = document.createElement('canvas'); cv.width = LW; cv.height = LH; const c = cv.getContext('2d');
      Rd.robotSide(c, LW, LH, lk, a, team, { only: [k] });
      const d = c.getImageData(0, 0, LW, LH).data; let x0 = LW, y0 = LH, x1 = -1, y1 = -1;
      for (let y = 0; y < LH; y += 3) for (let x = 0; x < LW; x += 3) if (d[(y * LW + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < 0) return null;
      const sd = G.Seasons.sub(year, k), cc = sd && lk.sub[k] ? G.Seasons.concept(year, k, lk.sub[k]) : null;
      return { k, cv, box: { x0, y0, x1, y1 }, lift: 0, name: k === 'soft' ? 'Cameras' : sd ? sd.name : k, what: k === 'soft' ? 'Vision, two cameras' : cc ? cc.name : '', elite: !!(cc && cc.elite) };
    }).filter(Boolean);
    // spread: the base stays, the others rise in order of how low they sit, each clear of the one below it
    const base = layers[layers.length - 1]; let ceiling = base.box.y0;
    layers.filter(L => L !== base).sort((p, q) => q.box.y1 - p.box.y1).forEach(L => { L.lift = Math.max(0, L.box.y1 - (ceiling - 12)); ceiling = L.box.y0 - L.lift; });
    const topX = Math.min.apply(null, layers.map(L => L.box.y0 - L.lift));               // the top of the highest unit once they are apart
    const all = layers.reduce((b, L) => ({ x0: Math.min(b.x0, L.box.x0), y0: Math.min(b.y0, L.box.y0), x1: Math.max(b.x1, L.box.x1), y1: Math.max(b.y1, L.box.y1) }), { x0: LW, y0: LH, x1: 0, y1: 0 });
    // the floor: the game's field, fading out all round so that it lies in the page and not on it
    const fcv = document.createElement('canvas'); fcv.width = 1200; fcv.height = Math.round(1200 * E.FH / E.FW);
    { Rd.preview(fcv, year); const c = fcv.getContext('2d'), g = c.createRadialGradient(600, fcv.height / 2, 60, 600, fcv.height / 2, 620);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.55, 'rgba(0,0,0,0.75)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.globalCompositeOperation = 'destination-in'; c.fillStyle = g; c.fillRect(0, 0, 1200, fcv.height); }
    const pc = Rd.PIECES && Rd.demoPiece && Rd.PIECES[Rd.demoPiece[year]], pcol = (pc && pc.col) || (Rd.COL && (year === 2024 ? Rd.COL.note : year === 2022 ? Rd.COL.cargoR : Rd.COL.fuel)) || '#ffd84a';
    const bits = []; for (let i = 0; i < 26; i++) bits.push({ x: Math.random(), y: Math.random(), v: 0.012 + Math.random() * 0.03, s: 3 + Math.random() * 7, p: Math.random() * 6.28, c: i % 5 ? pcol : '#aeb9c5', sq: !!(pc && pc.shape === 'box') });
    const top = layers.filter(L => L.elite).map(L => L.what)[0] || layers.filter(L => L.k !== 'drive' && L.k !== 'soft').map(L => L.what).pop() || '';
    const sc = { kind: 'robot', year, field: !!plan, plan, sig: sigOf(lk), dur: 17, x: 0, pin: false, over: false, hl: -1, t: 0, edge: (o && o.edge) || 0, edgeT: 0,
      cap: [seasonLine(year), Sz.name, top + ' · point at the robot to take it apart'],
      // as large as the page allows while it stands whole; it draws back as it comes apart, so that every unit stays in view
      geo(W, H) { const fy = H * 0.77, room = fy - Math.max(70, H * 0.1); let cx = W * 0.66, room0 = room, wide = W * 0.62, pl = null;
        if (plan) {                                                                    // the plan takes the top of what the list leaves free, the robot stands under it
          const xl = Math.max(W * 0.4, this.edge + 18), xr = W - Math.max(18, W * 0.032), y0 = Math.max(46, H * 0.085), pw = Math.max(120, Math.min(xr - xl, H * 0.36 * E.FW / E.FH)), ph = pw * E.FH / E.FW;
          cx = Math.max(xl + pw / 2, (xl + xr) / 2); pl = { x: cx - pw / 2, y: y0, w: pw, h: ph }; room0 = Math.max(60, fy - (y0 + ph + Math.max(14, H * 0.03))); wide = Math.min(wide, Math.max(pw, xr - xl) * 1.5); }
        const q0 = Math.min(wide / LW, room0 / (GY - all.y0)), q1 = Math.max(q0 * 0.68, Math.min(q0, room / (GY - topX))), x = eo(this.x), q = lerp(q0, q1, x);
        let ls = 1; layers.forEach(L => { if (L.lift > 0) ls = Math.min(ls, (room / q1 - (GY - L.box.y0)) / L.lift); });
        return { q, cx, fy, ox: cx - (all.x0 + all.x1) / 2 * q - 60 * x, oy: fy - GY * q, ls: clamp(ls, 0.25, 1), dw: LW * q0, pl }; },
      busy() { return this.over || this.pin; },
      update(dt, P, W, H) { this.t += dt;
        // where the list of games ends, measured now and then (the page may be resized); kept once the list is closed, so that nothing jumps
        if (plan) { this.edgeT -= dt; if (this.edgeT <= 0) { this.edgeT = 0.5; const S = ST.s, el = document.querySelector('#mm.games .mm-glist'), r = el && el.getBoundingClientRect(), c = S && S.cv.getBoundingClientRect(); if (r && c && r.width) this.edge = r.right - c.left; } }
        const g = this.geo(W, H), x = eo(this.x), topY = Math.min.apply(null, layers.map(L => g.oy + (L.box.y0 - L.lift * g.ls * x) * g.q));
        this.over = P.in && P.x > g.ox + all.x0 * g.q - 36 && P.x < g.ox + all.x1 * g.q + 36 + 190 * x && P.y > topY - 30 && P.y < g.oy + all.y1 * g.q + 30;
        const auto = !plan && !P.in && this.t > 5.5 && this.t < 10.5 && !(reduced());   // left alone, it shows once by itself what the pointer does (not under a field: that is there to be looked at)
        const to = this.over || this.pin || auto ? 1 : 0; this.x = reduced() ? to : clamp(this.x + (to - this.x) * Math.min(1, dt * 5.5), 0, 1); if (Math.abs(to - this.x) < 0.004) this.x = to;
        this.hl = -1; if (this.x > 0.5 && P.in) layers.forEach((L, i) => { const y0 = g.oy + (L.box.y0 - L.lift * g.ls * x) * g.q, y1 = g.oy + (L.box.y1 - L.lift * g.ls * x) * g.q; if (P.y >= y0 - 4 && P.y <= y1 + 4 && P.x > g.ox + L.box.x0 * g.q - 20) this.hl = i; }); },
      draw(ctx, W, H) { const g = this.geo(W, H), x = eo(this.x), t = this.t;
        // the year, very large and very faint, behind everything
        if (!plan) { ctx.save(); ctx.font = '900 ' + Math.round(H * 0.34) + 'px ' + FONT; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'; ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.055)';
          ctx.strokeText(year < 2100 ? String(year) : Sz.name.split(' ')[0], W - 28 + Math.sin(t * 0.13) * 14, H * 0.42); ctx.restore(); }
        // game pieces drifting up behind it, in the colour of the game's own
        ctx.save(); bits.forEach(b => { const yy = ((b.y - t * b.v) % 1 + 1) % 1, px = g.cx + (b.x - 0.5) * W * 0.62 + Math.sin(t * 0.6 + b.p) * 12, py = H * (0.08 + yy * 0.72); ctx.globalAlpha = 0.16 * Math.sin(yy * Math.PI) * (1 - 0.6 * x); ctx.fillStyle = b.c;
          if (b.sq) ctx.fillRect(px - b.s, py - b.s, b.s * 2, b.s * 2); else { ctx.beginPath(); ctx.arc(px, py, b.s, 0, 7); ctx.fill(); } }); ctx.restore();
        // the field as the floor: laid flat, seen at a low angle
        ctx.save(); ctx.translate(g.cx + Math.sin(t * 0.21) * 10, g.fy + g.dw * 0.03); ctx.transform(1, 0, -0.55, 0.34, 0, 0); ctx.globalAlpha = (0.62 - 0.26 * x) * (plan ? 0.55 : 1);
        const fw = g.dw * 1.9, fh = fw * fcv.height / fcv.width; ctx.drawImage(fcv, -fw * 0.5, -fh * 0.52, fw, fh); ctx.restore();
        // the field as a plan, over the robot: it floats a little, casts a soft shadow, and steps back while the robot is apart
        if (g.pl) { const p = g.pl, dy = Math.sin(t * 0.5) * 3, mg = plan.pad * p.w; ctx.save(); ctx.globalAlpha = 0.96 - 0.84 * x; ctx.drawImage(plan, p.x - mg, p.y - mg + dy, p.w + 2 * mg, p.h + 2 * mg); ctx.restore(); }
        // its shadow on the floor
        ctx.save(); ctx.translate(g.ox + (all.x0 + all.x1) / 2 * g.q, g.fy + 4); ctx.scale(1, 0.16); const sh = ctx.createRadialGradient(0, 0, 4, 0, 0, g.dw * 0.34); sh.addColorStop(0, 'rgba(0,0,0,0.55)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(0, 0, g.dw * 0.34, 0, 7); ctx.fill(); ctx.restore();
        // the units, apart by x
        layers.forEach((L, i) => { const dy = -L.lift * g.ls * x * g.q; ctx.save(); if (this.hl >= 0 && this.hl !== i) ctx.globalAlpha = 0.55; ctx.drawImage(L.cv, g.ox, g.oy + dy, LW * g.q, LH * g.q); ctx.restore(); });
        // their names, once apart: plain text beside each, with a thin line to it
        if (x > 0.25) { const al = clamp((x - 0.25) / 0.5, 0, 1), fs = clamp(Math.round(g.dw * 0.021), 11, 16), lx = g.ox + all.x1 * g.q + 34; let lastY = 1e9;
          layers.slice().sort((p, q) => (q.box.y0 + q.box.y1 - 2 * q.lift * g.ls) - (p.box.y0 + p.box.y1 - 2 * p.lift * g.ls)).forEach(L => { const i = layers.indexOf(L);
            let y = g.oy + ((L.box.y0 + L.box.y1) / 2 - L.lift * g.ls * x) * g.q; if (y > lastY - fs * 2.5) y = lastY - fs * 2.5; lastY = y;
            const on = this.hl === i, ex = g.ox + L.box.x1 * g.q + 8;
            ctx.save(); ctx.globalAlpha = al * (this.hl >= 0 && !on ? 0.45 : 1); ctx.strokeStyle = on ? '#f5b800' : 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ex, g.oy + ((L.box.y0 + L.box.y1) / 2 - L.lift * g.ls * x) * g.q); ctx.lineTo(lx - 8, y); ctx.stroke();
            ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.font = '800 ' + fs + 'px ' + FONT; ctx.fillStyle = on ? '#ffd24d' : '#e6ebf0'; ctx.fillText(L.name.toUpperCase(), lx, y - 1);
            ctx.font = '500 ' + Math.round(fs * 0.92) + 'px ' + FONT; ctx.fillStyle = L.elite ? '#ffd24d' : '#94a1ae'; ctx.fillText(L.what + (L.elite ? '  ★ elite design' : ''), lx, y + fs * 1.15); ctx.restore(); }); }
      },
      click() { if (this.over) { this.pin = !this.pin; return true; } return false; } };
    return sc;
  }

  // ---------------------------------------------------------------- scene: a match
  // a match of a season about to start: six robots of its highest designs, the pieces in their places
  function startMatch(year) {
    return withEra(year, () => {
      const seed = 1 + rnd(1e6), rng = G.makeRng(seed), pool = Object.values(G.AI.makePool(rng, 40, 0, year < 2100 ? year : 2026)).sort((p, q) => q.str - p.str);
      const ent = i => { const t = pool[i]; t.str = 90 + rng.int(0, 7); t.elite = true; t.rb = null; G.AI.seasonRobot(t, year, rng); Object.assign(t.rb.choice, highPicks(year)); const e = G.AI.entry(t, year, 1.08, 1, rng); e.plan = { role: 'score' }; t.rb = null; return e; };
      return E.create({ year, red: [ent(0), ent(3), ent(4)], blue: [ent(1), ent(2), ent(5)], seed, headless: false, calls: 0 });
    });
  }
  function matchScene(year) {
    return withEra(year, () => {
      const m = startMatch(year);
      const from = 2 + rnd(20); while (!m.done && m.t < from) E.step(m);
      const Sz = G.Seasons[year], tot = s => s.auto + s.tele + s.end + s.foul;
      const aim = r => (m.R.aimAt ? m.R.aimAt(m, r) : year === 2022 ? m.hub : year === 2024 ? m.spk && m.spk[r.a] : year === 2026 ? m.hub && m.hub[r.a] : null);
      const sc = { kind: 'match', year, dur: 26, acc: 0, t: 0, cx: E.FW / 2, cy: E.FH / 2, hot: null, capT: 0, side: Math.random() < 0.5 ? 'red' : 'blue', sideT: 0,
        cap: [seasonLine(year), Sz.name, ''],
        // the field covers the right of the page and runs off its edge; the view drifts with the play
        geo(W, H) { const s = Math.max(W * 0.8 / E.FW, H * 1.06 / E.FH), fw = E.FW * s, ox = clamp(W * 0.66 - this.cx * s, W - fw + 0.02 * W, W * 0.3); return { s, ox, oy: H * 0.5 - E.FH / 2 * s }; },
        busy() { return !!this.hot; },
        done() { return m.done; },
        update(dt, P, W, H) { this.t += dt;
          withEra(year, () => { this.acc += dt * 1.5; let n = 0; while (this.acc >= 0.1 && !m.done && n++ < 20) { E.step(m); this.acc -= 0.1; } });
          // the view follows one alliance's three robots along the field, and changes sides now and then (not while the pointer is on a robot)
          this.sideT += dt; if (this.sideT > 9 && !this.hot) { this.sideT = 0; this.side = this.side === 'red' ? 'blue' : 'red'; }
          let sx = 0, k = 0; m.robots.forEach(r => { if (!r.dead && r.a === this.side) { sx += r.x; k++; } }); if (k) this.cx += (sx / k - this.cx) * Math.min(1, dt * 0.6);
          const g = this.geo(W, H); this.hot = null; if (P.in) { const fx = (P.x - g.ox) / g.s, fy = (P.y - g.oy) / g.s; let bd = 0.75; m.robots.forEach(r => { const d = Math.hypot(r.x - fx, r.y - fy); if (d < bd) { bd = d; this.hot = r; } }); }
          this.capT -= dt; if (this.capT <= 0) { this.capT = 0.4; const tl = Math.max(0, Math.ceil((m.phase === 'auto' ? m.T.auto : m.total) - m.t)); this.cap[2] = 'Red ' + tot(m.score.red) + ' · ' + tot(m.score.blue) + ' Blue · ' + (m.done ? 'final' : (m.phase === 'auto' ? 'auto ' : '') + Math.floor(tl / 60) + ':' + String(tl % 60).padStart(2, '0')); this.capNew = true; } },
        draw(ctx, W, H) { const g = this.geo(W, H), s = g.s, al = m.done ? 1 : clamp(this.acc / 0.1, 0, 1), now = performance.now();
          ctx.save(); ctx.translate(g.ox, g.oy); ctx.globalAlpha = 0.92; Rd.field(ctx, year, s, m);
          m.robots.forEach(r => { const aiming = Rd.animate(m, r), q = Object.create(r), p = Rd.pose(r, al); q.x = p.x; q.y = p.y; q.hd = p.hd; const tg = aim(r);
            Rd.robot(ctx, s, q, { aim: tg ? Math.atan2(tg.y - q.y, tg.x - q.x) : null, year, aimLight: aiming && year < 2023 && (r.cap.visionLvl || 0) >= 1, rsl: Rd.rslOf(m, r), rslLit: Math.floor(now / 450) % 2 === 0, ledT: now / 1000 }); });
          Rd.fx(ctx, s, m);
          if (this.hot) { const r = this.hot, p = Rd.pose(r, al); ctx.strokeStyle = '#ffd24d'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -this.t * 18; ctx.beginPath(); ctx.arc(p.x * s, p.y * s, s * 0.72, 0, 7); ctx.stroke(); ctx.setLineDash([]);
            const tx = String(r.team) + (r.label ? '  ' + r.label : ''), fs = 13; ctx.font = '700 ' + fs + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(8,10,14,0.85)'; ctx.strokeText(tx, p.x * s, p.y * s - s * 0.86); ctx.fillStyle = '#fff'; ctx.fillText(tx, p.x * s, p.y * s - s * 0.86); }
          ctx.restore(); },
        click() { return false; } };
      return sc;
    });
  }

  // ---------------------------------------------------------------- scene: the world
  let MAP = null;
  function mapData() {
    if (MAP) return MAP;
    const P = poly => new Path2D(Geo.path(poly)), cols = ['#f5b800', '#4aa3ff', '#3ecf8e', '#ff7a59', '#b79bff', '#3fd0e0', '#ff5c8a', '#c6d24a', '#ffb020', '#7fb2ff', '#9be7b4', '#ffa3d1', '#d6c4ff'], regs = [];
    const hubs = Geo.HUBS.map(x => { const p = Geo.xy(x.lon, x.lat); if (!regs.includes(x.r)) regs.push(x.r); return { x: p[0], y: p[1], w: x.w || 0.5, n: x.n, r: x.r, c: cols[regs.indexOf(x.r) % cols.length], ph: Math.random() * 6.28 }; });
    MAP = { land: Object.keys(Geo.LAND).map(k => P(Geo.LAND[k])).concat([P(Geo.US), P(Geo.CA)]), water: Geo.WATER.map(P), hubs, regs, big: hubs.filter(x => x.w >= 1.5) };
    return MAP;
  }
  function worldScene() {
    const Wd = mapData(), f0 = pick(Wd.big.length ? Wd.big : Wd.hubs);
    const sc = { kind: 'world', dur: 20, t: 0, cx: f0.x, cy: f0.y, to: f0, toT: 0, z: 0, hot: null, arcs: [], arcT: 0, pulses: [],
      cap: ['THE WORLD', f0.r, Wd.hubs.length + ' cities in ' + Wd.regs.length + ' areas · every team simulated, every week'],
      geo(W, H) { const z = Math.max(W, H * 1.5) / 300; return { z, ox: W * 0.66 - this.cx * z, oy: H * 0.5 - this.cy * z }; },   // about 300 map units across the page
      busy() { return !!this.hot; },
      fly() { const far = Wd.big.filter(x => x.r !== this.to.r); this.to = pick(far.length ? far : Wd.hubs); this.toT = 0; this.cap[1] = this.to.r; this.capNew = true; },
      update(dt, P, W, H) { this.t += dt; this.toT += dt; if (this.toT > 7 && !this.hot) this.fly();
        const k = Math.min(1, dt * 0.55); this.cx += (this.to.x - this.cx) * k; this.cy += (this.to.y - this.cy) * k;
        const g = this.geo(W, H); this.hot = null; if (P.in) { let bd = 18; Wd.hubs.forEach(x => { const d = Math.hypot(g.ox + x.x * g.z - P.x, g.oy + x.y * g.z - P.y); if (d < bd) { bd = d; this.hot = x; } }); }
        // teams on their way to an event: an arc from a city to a larger one near it
        this.arcT -= dt; if (this.arcT <= 0) { this.arcT = 0.22; const near = Wd.hubs.filter(x => Math.abs(x.x - this.cx) < 170 && Math.abs(x.y - this.cy) < 110); if (near.length > 2) { const a = pick(near), bs = near.filter(x => x !== a && x.r === a.r && x.w >= a.w * 0.8); if (bs.length) { const b = pick(bs); this.arcs.push({ a, b, t: 0, d: 1.4 + Math.random() }); } } }
        this.arcs.forEach(a => { a.t += dt / a.d; if (a.t >= 1 && !a.hit) { a.hit = true; this.pulses.push({ x: a.b.x, y: a.b.y, t: 0, c: a.b.c }); } }); this.arcs = this.arcs.filter(a => a.t < 1.25);
        this.pulses.forEach(p => { p.t += dt * 1.3; }); this.pulses = this.pulses.filter(p => p.t < 1); },
      draw(ctx, W, H) { const g = this.geo(W, H), z = g.z, t = this.t;
        ctx.save(); ctx.translate(g.ox, g.oy); ctx.scale(z, z);
        ctx.lineWidth = 1 / z; ctx.strokeStyle = 'rgba(120,140,160,0.10)'; ctx.beginPath(); for (let x = 0; x <= 1000; x += 20) { ctx.moveTo(x, 0); ctx.lineTo(x, Geo.H); } for (let y = 0; y <= Geo.H; y += 20) { ctx.moveTo(0, y); ctx.lineTo(1000, y); } ctx.stroke();
        ctx.fillStyle = '#161d25'; ctx.strokeStyle = '#34424f'; ctx.lineWidth = 1.2 / z; Wd.land.forEach(p => { ctx.fill(p); ctx.stroke(p); });
        ctx.fillStyle = '#0f1216'; Wd.water.forEach(p => { ctx.fill(p); ctx.stroke(p); });
        this.arcs.forEach(a => { const k = clamp(a.t, 0, 1), mx = (a.a.x + a.b.x) / 2, my = Math.min(a.a.y, a.b.y) - Math.hypot(a.b.x - a.a.x, a.b.y - a.a.y) * 0.28, B = q => { const u = 1 - q; return [u * u * a.a.x + 2 * u * q * mx + q * q * a.b.x, u * u * a.a.y + 2 * u * q * my + q * q * a.b.y]; };
          ctx.strokeStyle = 'rgba(245,184,0,' + (0.55 * (1 - Math.max(0, a.t - 1) * 4)).toFixed(3) + ')'; ctx.lineWidth = 1.3 / z; ctx.beginPath(); for (let j = 0; j <= 14; j++) { const q = Math.max(0, k - 0.4) + j / 14 * Math.min(0.4, k), p = B(q); j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke();
          if (a.t < 1) { const p = B(k); ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.arc(p[0], p[1], 2.2 / z, 0, 7); ctx.fill(); } });
        this.pulses.forEach(p => { ctx.strokeStyle = p.c; ctx.globalAlpha = (1 - p.t) * 0.8; ctx.lineWidth = 1.6 / z; ctx.beginPath(); ctx.arc(p.x, p.y, (4 + 20 * eo(p.t)) / z, 0, 7); ctx.stroke(); }); ctx.globalAlpha = 1;
        Wd.hubs.forEach(x => { const r = (1.6 + Math.sqrt(x.w) * 1.5) * (1 + 0.18 * Math.sin(t * 2 + x.ph)) / z; ctx.globalAlpha = 0.22; ctx.fillStyle = x.c; ctx.beginPath(); ctx.arc(x.x, x.y, r * 2.4, 0, 7); ctx.fill(); ctx.globalAlpha = 0.95; ctx.beginPath(); ctx.arc(x.x, x.y, r, 0, 7); ctx.fill(); });
        ctx.globalAlpha = 1; ctx.restore();
        if (this.hot) { const x = this.hot, px = g.ox + x.x * z, py = g.oy + x.y * z; ctx.strokeStyle = '#ffd24d'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(px, py, 11, 0, 7); ctx.stroke();
          ctx.font = '800 14px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(8,10,14,0.85)'; ctx.strokeText(x.n, px + 18, py - 7); ctx.fillStyle = '#fff'; ctx.fillText(x.n, px + 18, py - 7);
          ctx.font = '500 12px ' + FONT; ctx.strokeText(x.r, px + 18, py + 10); ctx.fillStyle = '#94a1ae'; ctx.fillText(x.r, px + 18, py + 10); } },
      click() { if (this.hot) return true; this.fly(); return true; } };
    return sc;
  }

  // ---------------------------------------------------------------- the stage
  const YEARS = () => (G.SEASON_YEARS || []).concat(G.FANTASY_YEARS || []);
  function make(S, kind, year, o) {
    const kinds = kind ? [kind] : ['robot', 'match', 'world', 'robot', 'match'].filter(k => k !== S.lastKind);
    for (let i = 0; i < 6; i++) { const k = kind || pick(kinds), y = year || pick(Math.random() < 0.75 ? G.SEASON_YEARS : YEARS());
      try { const sc = k === 'robot' ? robotScene(y, o) : k === 'match' ? matchScene(y) : worldScene(); S.lastKind = sc.kind; return sc; } catch (e) { if (window.console) console.warn('menu stage: a ' + k + ' scene of ' + y + ' failed', e); if (kind && i > 1) kind = null; } }
    return null;
  }
  function caption(S) { const c = S.cur && S.cur.cap; if (!S.cap || !c) return; S.cap.innerHTML = '<div class="k">' + h(c[0]) + '</div><div class="t">' + h(c[1]) + '</div><div class="d">' + h(c[2] || '') + '</div>'; }
  function swap(S, sc) {
    if (!sc) return;
    if (S.cur && S.w && !S.still) { S.snap = S.snap || document.createElement('canvas'); S.snap.width = S.cv.width; S.snap.height = S.cv.height; S.snap.getContext('2d').drawImage(S.cv, 0, 0); S.fade = 0; }
    S.cur = sc; S.age = 0; caption(S); if (S.cap) { S.cap.classList.remove('in'); void S.cap.offsetWidth; S.cap.classList.add('in'); }
  }
  function size(S) {
    const r = S.cv.getBoundingClientRect(), k = Math.min(window.devicePixelRatio || 1, 1.5, 1800 / Math.max(1, r.width));
    S.w = Math.round(r.width); S.h = Math.round(r.height); S.k = k; const bw = Math.max(2, Math.round(r.width * k)), bh = Math.max(2, Math.round(r.height * k));
    if (S.cv.width !== bw || S.cv.height !== bh) { S.cv.width = bw; S.cv.height = bh; }
  }
  function frame(S, dt) {
    const sc = S.cur, ctx = S.ctx, W = S.w, H = S.h; if (!sc || W < 40 || H < 40) return;
    sc.update(dt, S.P, W, H); if (sc.capNew) { sc.capNew = false; caption(S); }
    ctx.setTransform(S.k, 0, 0, S.k, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.save(); sc.draw(ctx, W, H); ctx.restore();
    if (S.fade < 1 && S.snap) { S.fade = Math.min(1, S.fade + dt / 0.8); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1 - eo(S.fade); ctx.fillStyle = '#0f1216'; ctx.fillRect(0, 0, S.cv.width, S.cv.height); ctx.drawImage(S.snap, 0, 0, S.cv.width, S.cv.height); ctx.restore(); }
    S.cv.style.cursor = sc.busy() ? 'pointer' : '';
  }
  function loop(ts) {
    const S = ST.s; if (!S) return;
    if (!document.body.contains(S.cv)) { ST.stop(); return; }
    S.raf = requestAnimationFrame(loop);
    if (document.hidden || ts - S.last < 22) return;                                     // about 45 pictures a second: a menu need not run the fans
    const dt = Math.min(0.1, (ts - (S.last || ts)) / 1000); S.last = ts;
    S.age += dt;
    if (!S.hold && !S.still && S.cur && ((S.age > S.cur.dur && !S.cur.busy()) || S.age > S.cur.dur + 40 || (S.cur.done && S.cur.done() && S.age > 4))) swap(S, make(S));
    frame(S, dt);
  }
  ST.stop = function () { const S = ST.s; if (!S) return; cancelAnimationFrame(S.raf); if (S.ro) S.ro.disconnect(); clearTimeout(S.showT); ST.s = null; };
  ST.start = function (cv, cap, o) {
    ST.stop(); if (!cv || !cv.getContext) return;
    const S = ST.s = { cv, ctx: cv.getContext('2d'), cap, P: { x: -1, y: -1, in: false }, cur: null, fade: 1, age: 0, last: 0, hold: false, still: !!(reduced()), lastKind: null };
    size(S); if (window.ResizeObserver) { S.ro = new ResizeObserver(() => { size(S); if (S.still) frame(S, 0); }); S.ro.observe(cv); }
    const at = e => { const r = cv.getBoundingClientRect(); S.P.x = e.clientX - r.left; S.P.y = e.clientY - r.top; S.P.in = true; if (S.still) { frame(S, 0.2); frame(S, 0.2); } };
    cv.addEventListener('pointermove', at); cv.addEventListener('pointerdown', at);
    cv.addEventListener('pointerleave', () => { S.P.in = false; if (S.still) { frame(S, 0.2); frame(S, 0.2); } });
    cv.addEventListener('click', e => { at(e); if (!S.cur) return; S.cur.update(0, S.P, S.w, S.h); if (!S.cur.click()) ST.next(); else if (S.still) frame(S, 0.2); });
    swap(S, make(S, (o && o.kind) || 'robot', o && o.year));
    if (S.still) { frame(S, 0); return; }                                               // reduced motion: one picture, redrawn only when the pointer does something
    S.raf = requestAnimationFrame(loop);
  };
  // another scene. In the list of games, with a game's field on stage: another robot of that game, under the same field
  ST.next = function () { const S = ST.s; if (!S) return; const c = S.cur, same = S.hold && c && c.kind === 'robot' && c.field;
    swap(S, same ? make(S, 'robot', c.year, { field: true, plan: c.plan, not: c.sig, edge: c.edge }) : make(S)); if (S.still) frame(S, 0); };
  // the list of games: the field of the game pointed at, and a robot of that game under it, stay on stage until the list is left
  ST.show = function (year) { const S = ST.s; if (!S || !G.Seasons[year]) return; S.hold = true; clearTimeout(S.showT); S.showT = setTimeout(() => { if (ST.s !== S || (S.cur && S.cur.kind === 'robot' && S.cur.field && S.cur.year === year)) return; swap(S, make(S, 'robot', year, { field: true })); if (S.still) frame(S, 0); }, 160); };
  ST.release = function () { const S = ST.s; if (!S) return; S.hold = false; clearTimeout(S.showT); S.age = Math.min(S.age, 6); };
  ST.highPicks = highPicks; ST.highLook = highLook; ST.reduced = reduced; ST.scenes = { robot: robotScene, match: matchScene, world: worldScene };   // (scenes: for tests)

  // ---------------------------------------------------------------- moving between the menu's pages
  // The menu and the pages it opens (new game, load, guide, version notes, settings) are whole pages. Going from one to
  // another, the page that is left stays for a moment as a picture of itself, sliding away and fading, while the new one
  // comes in from the other side (the stylesheet: .mm-ghost, #app.mm-enter). The change itself happens at once, as it
  // always did, so nothing that follows a UI.go has to wait: only the picture lingers. Arriving on a menu page from
  // anywhere (the start of the game, a career) plays the arrival alone.
  const MENU = { menu: 1, newgame: 1, load: 1, help: 1, notes: 1, settings: 1 }, go0 = UI.go;
  UI.go = function (screen, p) {
    const from = UI.shown, app = document.getElementById('app'), root = app && app.firstElementChild;
    let ghost = null, top = 0;
    if (MENU[from] && root && !reduced() && !UI.noMenuAnim && !document.hidden) {
      try { ghost = document.createElement('div'); const c = root.cloneNode(true); top = root.scrollTop; ghost.appendChild(c);
        const a = root.querySelectorAll('canvas'), b = c.querySelectorAll('canvas'); a.forEach((cv, i) => { try { if (b[i] && cv.width && cv.height) b[i].getContext('2d').drawImage(cv, 0, 0); } catch (e) { /* a canvas that cannot be copied stays empty */ } });
        c.removeAttribute('id'); c.querySelectorAll('[id]').forEach(e => e.removeAttribute('id')); c.querySelectorAll('[data-act]').forEach(e => e.removeAttribute('data-act')); } catch (e) { ghost = null; }
    }
    const r = go0.apply(UI, arguments), to = UI.shown;
    if (app && MENU[to] && to !== from) {
      app.classList.remove('mm-enter', 'mm-back'); void app.offsetWidth; app.classList.add('mm-enter'); if (to === 'menu') app.classList.add('mm-back');
      clearTimeout(UI.mmEnterT); UI.mmEnterT = setTimeout(() => app.classList.remove('mm-enter', 'mm-back'), 800);
      if (ghost && !reduced()) { ghost.className = 'mm-ghost' + (to === 'menu' ? ' back' : ''); ghost.setAttribute('aria-hidden', 'true'); document.body.appendChild(ghost); if (top && ghost.firstElementChild) ghost.firstElementChild.scrollTop = top; setTimeout(() => ghost.remove(), 320); }
    }
    return r;
  };
})();
