'use strict';
/* FRC Manager — UI kit (3.6): navigation in groups, hover cards, a side window that stays open while the page redraws,
   "more" menus, tiles, the Garage's exploded robot, and small animations (none when the player asks for reduced motion) */
(function () {
  const U = G.U, D = G.Data, h = U.esc, UI = G.UI;

  // ---------------- navigation: groups of pages ----------------
  // The sidebar shows the groups; the group you are in lists its pages beneath it, and every group shows its pages in a
  // flyout on hover. A page of a group with more than one page has the group's pages as tabs at its top.
  UI.NAV = [
    { id: 'home', icon: 'hq', name: 'Home', pages: [['hq', 'hq', 'Headquarters'], ['inbox', 'inbox', 'Inbox']] },
    { id: 'robot', icon: 'garage', name: 'Robot', pages: [['garage', 'garage', 'Garage'], ['design', 'design', 'Design Office'], ['parts', 'parts', 'Inventory'], ['know', 'know', 'Tech Knowledge']] },
    { id: 'people', icon: 'team', name: 'Team', pages: [['team', 'team', 'Team'], ['mentors', 'mentors', 'Mentors']] },
    { id: 'program', icon: 'finance', name: 'Program', pages: [['finance', 'finance', 'Finance'], ['workshop', 'workshop', 'Workshop']] },
    { id: 'season', icon: 'calendar', name: 'Season', pages: [['calendar', 'calendar', 'Calendar'], ['world', 'map', 'World'], ['history', 'history', 'History']] }
  ];
  UI.navPages = (S, g) => g.pages.filter(p => p[0] !== 'world' || (G.World.on(S) && S.wseason));
  UI.navGroup = page => UI.NAV.find(g => g.pages.some(p => p[0] === page)) || null;
  UI.lastIn = UI.lastIn || {}; // the page last open in each group: a group opens where you left it
  UI.sidebarGroups = function (S, cur, badge) {
    const g0 = UI.navGroup(cur);
    return '<div class="side">' + UI.NAV.map(g => {
      const pages = UI.navPages(S, g), on = g0 && g0.id === g.id, b = g.id === 'home' && badge ? '<span class="badge">' + badge + '</span>' : '';
      const item = p => '<div class="nav nsub' + (cur === p[0] ? ' on' : '') + '" data-act="nav" data-arg="' + p[0] + '"><span class="ic">' + UI.icon(p[1], 16) + '</span><span class="t">' + p[2] + '</span>' + (p[0] === 'inbox' && badge ? '<span class="badge">' + badge + '</span>' : '') + '</div>';
      return '<div class="ngrp' + (on ? ' open' : '') + '" data-grp="' + g.id + '">' +
        '<div class="nav grp' + (on ? ' on' : '') + '" data-act="navGrp" data-arg="' + g.id + '"><span class="ic">' + UI.icon(g.icon, 18) + '</span><span class="t">' + g.name + '</span>' + (on ? '' : b) + '</div>' +
        (on ? '<div class="nsubs">' + pages.map(item).join('') + '</div>' : '<div class="flyout"><div class="fly-h">' + g.name + '</div>' + pages.map(item).join('') + '</div>') + '</div>';
    }).join('') + '</div>';
  };
  UI.A.navGrp = id => { const g = UI.NAV.find(x => x.id === id); if (!g) return; const pages = UI.navPages(G.S, g), last = UI.lastIn[id]; UI.go(pages.some(p => p[0] === last) ? last : pages[0][0]); };
  // the group's pages as tabs at the top of a page
  UI.subnav = function (S, cur) {
    const g = UI.navGroup(cur); if (!g) return '';
    const pages = UI.navPages(S, g); if (pages.length < 2) return '';
    UI.lastIn[g.id] = cur;
    return '<div class="subnav">' + pages.map(p => '<button class="snav' + (cur === p[0] ? ' on' : '') + '" data-act="nav" data-arg="' + p[0] + '">' + UI.icon(p[1], 14) + '<span>' + p[2] + '</span></button>').join('') + '</div>';
  };

  // ---------------- hover cards ----------------
  // UI.hov(trigger, content, cls): the trigger, with its card beside it in the page, hidden. Hovering (or focusing, or on a
  // touch screen tapping) shows the card next to it. For reading only: actions stay on the page or in the side window.
  UI.hov = (trigger, content, cls) => '<span class="hov' + (cls ? ' ' + cls : '') + '" tabindex="0">' + trigger + '<span class="hov-c" hidden>' + content + '</span></span>';
  // a block (a tile, a row) with a card: the content goes last inside it
  UI.hovIn = content => '<span class="hov-c" hidden>' + content + '</span>';
  let popEl = null, popFor = null, popT = 0;
  const popBox = () => { if (!popEl) { popEl = document.createElement('div'); popEl.className = 'popcard'; document.body.appendChild(popEl); } return popEl; };
  UI.hidePop = () => { if (popEl) { popEl.classList.remove('on'); } popFor = null; };
  function showPop(el) {
    const src = el.querySelector(':scope > .hov-c'); if (!src) return;
    const box = popBox(); box.innerHTML = src.innerHTML; box.classList.remove('on'); popFor = el;
    const r = el.getBoundingClientRect(), bw = Math.min(360, window.innerWidth - 16); box.style.maxWidth = bw + 'px'; box.style.left = '0px'; box.style.top = '0px';
    const bh = box.offsetHeight, bwid = box.offsetWidth;
    let top = r.bottom + 8; if (top + bh > window.innerHeight - 8 && r.top - bh - 8 > 8) top = r.top - bh - 8;
    let left = Math.min(Math.max(8, r.left + r.width / 2 - bwid / 2), window.innerWidth - bwid - 8);
    box.style.left = Math.round(left) + 'px'; box.style.top = Math.round(Math.max(8, top)) + 'px';
    requestAnimationFrame(() => box.classList.add('on'));
  }
  document.addEventListener('mouseover', e => {
    const el = e.target.closest && e.target.closest('.hov');
    if (el === popFor) return;
    clearTimeout(popT);
    if (!el) { popT = setTimeout(UI.hidePop, 60); return; }
    popT = setTimeout(() => showPop(el), 140);
  });
  document.addEventListener('focusin', e => { const el = e.target.closest && e.target.closest('.hov'); if (el && el !== popFor) showPop(el); });
  document.addEventListener('focusout', () => UI.hidePop());
  // touch: a tap on a card's trigger (not on a button inside it) toggles the card
  document.addEventListener('click', e => {
    if (!(window.matchMedia && matchMedia('(hover: none)').matches)) return;
    const el = e.target.closest && e.target.closest('.hov');
    if (!el) { UI.hidePop(); return; }
    if (el.hasAttribute('data-act') || (e.target.closest('[data-act]') && el.contains(e.target.closest('[data-act]')))) return; // it opens something: no card
    if (popFor === el) UI.hidePop(); else showPop(el);
  });
  window.addEventListener('scroll', UI.hidePop, true);

  // ---------------- the side window ----------------
  // UI.openWin(kind, arg) opens a window from the right; UI.W[kind](S, arg) returns { title, html } (or null to close it).
  // It is drawn again with the page on every render, so actions inside it update both. Esc, the × or a click outside closes it.
  UI.W = UI.W || {};
  UI.openWin = (kind, arg) => { UI.st.win = { kind, arg, fresh: true }; UI.hidePop(); UI.render(); };
  UI.closeWin = () => { if (UI.st.win) { UI.st.win = null; UI.render(); } };
  UI.A.openWin = (arg) => { const i = String(arg).indexOf(':'); UI.openWin(i < 0 ? arg : arg.slice(0, i), i < 0 ? null : arg.slice(i + 1)); };
  UI.A.closeWin = () => UI.closeWin();
  UI.winHtml = function (S) {
    const w = UI.st.win; if (!w || !UI.W[w.kind]) return '';
    let r = null;
    try { r = UI.W[w.kind](S, w.arg); } catch (e) { console.error(e); r = { title: 'Something went wrong', html: '<pre class="xs muted">' + h(e.stack || e) + '</pre>' }; }
    if (!r) { UI.st.win = null; return ''; }
    const fresh = w.fresh; w.fresh = false;
    return '<div class="win-bg' + (fresh ? ' in' : '') + '" data-act="closeWin"></div><aside class="win' + (fresh ? ' in' : '') + (r.wide ? ' wide' : '') + '" role="dialog" aria-label="' + h(String(r.title).replace(/<[^>]*>/g, '')) + '">' +
      '<div class="win-h">' + (r.icon ? '<span class="hico">' + UI.icon(r.icon, 20) + '</span>' : '') + '<div class="win-t">' + r.title + (r.sub ? '<div class="xs muted">' + r.sub + '</div>' : '') + '</div><span class="sp"></span><button class="btn ghost sm" data-act="closeWin" aria-label="Close">✕</button></div>' +
      '<div class="win-b">' + r.html + '</div></aside>';
  };
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (document.getElementById('modal')) return; // a window over it closes first (its own handler)
    if (UI.st.win) { UI.closeWin(); e.preventDefault(); }
  });

  // ---------------- "more" menus ----------------
  // UI.more([[act, arg, label, disabled], ...]): a ⋯ button with a small menu of the actions a page needs now and then
  UI.more = (items, label) => { const list = items.filter(Boolean); if (!list.length) return '';
    return '<span class="more"><button class="btn sm more-b" data-act="moreToggle" aria-haspopup="true">' + (label ? h(label) + ' ' : '') + '⋯</button><span class="more-m" hidden>' +
      list.map(it => '<button class="more-i" data-act="' + it[0] + '"' + (it[1] != null ? ' data-arg="' + h(String(it[1])) + '"' : '') + (it[3] ? ' disabled title="' + h(typeof it[3] === 'string' ? it[3] : '') + '"' : '') + '>' + it[2] + '</button>').join('') + '</span></span>'; };
  UI.A.moreToggle = (a, el) => { const m = el.parentElement.querySelector('.more-m'); const open = m.hidden; document.querySelectorAll('.more-m').forEach(x => { x.hidden = true; }); m.hidden = !open; };
  document.addEventListener('click', e => { if (!e.target.closest || !e.target.closest('.more-b')) document.querySelectorAll('.more-m').forEach(x => { x.hidden = true; }); }, true);

  // ---------------- tiles ----------------
  // A summary tile: a title, the main content and an optional hover card; clicking it opens what `act`/`arg` say.
  UI.tile = function (o) {
    const click = o.act ? ' data-act="' + o.act + '"' + (o.arg != null ? ' data-arg="' + h(String(o.arg)) + '"' : '') : '';
    return '<div class="card tile' + (o.act ? ' click' : '') + (o.hov ? ' hov' : '') + (o.cls ? ' ' + o.cls : '') + '"' + click + (o.hov ? ' tabindex="0"' : '') + '>' +
      '<div class="ct">' + (o.icon ? UI.icon(o.icon, 16) : '') + '<span>' + o.title + '</span><span class="sp"></span>' + (o.extra || '') + '</div>' + o.body + (o.hov ? UI.hovIn(o.hov) : '') + '</div>';
  };

  // ---------------- animations ----------------
  // A page that is newly opened rises in (UI.render marks it); numbers in the top bar count to their new value.
  UI.reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  UI.countUp = function () {
    if (UI.reduced()) return;
    document.querySelectorAll('[data-count]').forEach(el => {
      const key = el.dataset.count, to = Number(el.dataset.to), prev = UI.st.counts && UI.st.counts[key];
      UI.st.counts = UI.st.counts || {}; UI.st.counts[key] = to;
      if (prev == null || prev === to || !isFinite(prev)) return;
      const fmt = el.dataset.fmt === 'money' ? v => U.money(Math.round(v)) : v => String(Math.round(v)), t0 = performance.now(), dur = 450;
      const step = t => { const k = Math.min(1, (t - t0) / dur), e2 = 1 - Math.pow(1 - k, 3); el.textContent = fmt(prev + (to - prev) * e2); if (k < 1) requestAnimationFrame(step); };
      el.textContent = fmt(prev); requestAnimationFrame(step);
      el.classList.add(to > prev ? 'up' : 'down'); setTimeout(() => el.classList.remove('up', 'down'), 700);
    });
  };

  // ---------------- the exploded robot (Garage) ----------------
  // One transparent layer per unit, drawn by the side view with only that unit's sections; the layers spread upward so
  // nothing overlaps (with a short animation), each with a label. Hovering a layer shows its card, clicking it opens the
  // unit's window (UI.W.unit). The drivetrain is the base; the robot code is the camera (with vision).
  // (3.5.5b) the side view draws by subsystem, so a unit's layer is its own subsystem; the robot code is its cameras
  UI.unitSections = function (S, bi, k) {
    const R = S.robot, u = R.bots[bi].subs[k];
    if (k === 'soft') return R.visionLvl ? ['soft'] : [];
    return u && u.ver ? [k] : [];
  };
  UI.exploded = function (S, bi, opts) {
    const R = S.robot, year = R.year, look = G.Robot.lookOf(S, bi), id = 'xp' + Math.floor(Math.random() * 1e9), W = 520, H = 300;
    const subs = G.Seasons[year].subs.map(sd => sd.id), taken = {};
    const layers = [];
    subs.forEach(k => { const secs = UI.unitSections(S, bi, k).filter(x => !taken[x]); secs.forEach(x => { taken[x] = 1; }); if (secs.length) layers.push({ k, secs }); });
    // (3.5.5b) the base is the last layer, so it lies on top: the bumpers cover the feet of what stands behind them
    { const i = layers.findIndex(l => l.k === 'drive'), base = i >= 0 ? layers.splice(i, 1)[0] : { k: 'drive', secs: ['drive'], empty: true }; layers.push(base); }
    const name = k => (k === 'soft' ? 'Robot code' : G.Seasons.sub(year, k).name);
    UI.job(() => {
      const box = document.getElementById(id); if (!box) return;
      const cvs = [...box.querySelectorAll('canvas.xl')];
      // draw each layer, then find what it covers
      const boxes = cvs.map((cv, i) => {
        const L = layers[i], ctx = cv.getContext('2d');
        G.Render.robotSide(ctx, W, H, look, S.team.bump || 'blue', S.team.num, { only: L.secs });
        const d = ctx.getImageData(0, 0, W, H).data; let x0 = W, y0 = H, x1 = -1, y1 = -1;
        for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (d[(y * W + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        return x1 < 0 ? null : { x0, y0, x1, y1 };
      });
      // spread: the base stays, the others rise in order of how low they sit, each clear of the one below it
      const order = layers.map((L, i) => i).filter(i => boxes[i] && layers[i].k !== 'drive').sort((a, b) => boxes[b].y1 - boxes[a].y1);
      const b0 = boxes[layers.length - 1]; let ceiling = b0 ? b0.y0 : H; const lift = layers.map(() => 0);
      order.forEach(i => { const b = boxes[i], gap = 8; lift[i] = Math.max(0, b.y1 - (ceiling - gap)); ceiling = b.y0 - lift[i]; });
      const extra = Math.max(0, -Math.min(0, ceiling - 10)), fit = Math.min(1, (opts && opts.maxH || 620) / (H + extra)); // (3.5.5b) the new drawings stand taller: more room, so the robot stays large
      box.style.setProperty('--xh', H + extra); box.style.setProperty('--xtop', extra); box.style.setProperty('--xw', Math.round(W * fit)); // a tall robot is drawn smaller
      cvs.forEach((cv, i) => { cv.style.setProperty('--lift', -lift[i]); });
      // labels at the right of each layer, with a line to it (in drawing pixels; --xs scales them with the drawing)
      box.querySelectorAll('.xlab').forEach((lb, i) => {
        const b = boxes[i]; if (!b) { lb.remove(); return; }
        lb.style.setProperty('--ly', extra + (b.y0 + b.y1) / 2 - lift[i]); lb.style.setProperty('--ly0', extra + (b.y0 + b.y1) / 2);
        lb.style.setProperty('--lx', Math.min(W - 4, b.x1 + 10));
      });
      const scale = () => { const w = cvs[0] ? cvs[0].getBoundingClientRect().width : W; if (w > 0) box.style.setProperty('--xs', (w / W).toFixed(4)); };
      scale(); if (window.ResizeObserver) new ResizeObserver(scale).observe(box);
      // (3.5.6b) the robot stands assembled and comes apart while the pointer is over it; "Keep exploded" (UI.st.xpPin) holds it open
      let over = false; const open = on => { over = on; on = on || !!UI.st.xpPin; box.classList.toggle('exp', on); box.classList.toggle('asm', !on); };
      requestAnimationFrame(() => requestAnimationFrame(() => open(over)));
      box.addEventListener('mouseenter', () => open(true)); box.addEventListener('focusin', () => open(true)); box.addEventListener('touchstart', () => open(true), { passive: true });
      // hover and click on the drawn parts: the topmost layer with paint under the pointer
      const hit = e => { for (let i = cvs.length - 1; i >= 0; i--) { const cv = cvs[i], r = cv.getBoundingClientRect(); const x = Math.floor((e.clientX - r.left) * W / r.width), y = Math.floor((e.clientY - r.top) * H / r.height); if (x < 0 || y < 0 || x >= W || y >= H) continue; if (cv.getContext('2d').getImageData(x, y, 1, 1).data[3] > 24) return i; } return -1; };
      let last = -1;
      box.addEventListener('mousemove', e => { const i = hit(e); if (i === last) return; last = i; cvs.forEach((cv, j) => cv.classList.toggle('hl', j === i)); box.querySelectorAll('.xlab').forEach((lb, j) => lb.classList.toggle('hl', j === i)); box.style.cursor = i >= 0 ? 'pointer' : ''; });
      box.addEventListener('mouseleave', () => { last = -1; cvs.forEach(cv => cv.classList.remove('hl')); box.querySelectorAll('.xlab').forEach(lb => lb.classList.remove('hl')); open(false); });
      box.addEventListener('click', e => { if (e.target.closest('.xlab')) return; const i = hit(e); if (i >= 0) UI.openWin('unit', bi + ':' + layers[i].k); });
    });
    const lab = L => { const u = L.k === 'soft' ? null : R.bots[bi].subs[L.k], c = u && u.ver ? G.Seasons.concept(year, L.k, u.concept) : null;
      return '<button class="xlab" data-act="openWin" data-arg="unit:' + bi + ':' + L.k + '"><b>' + h(name(L.k)) + '</b><span class="xs muted">' + (L.k === 'soft' ? 'Vision Level ' + R.visionLvl : c ? h(c.name) + ' v' + u.ver : 'empty') + '</span></button>'; };
    return '<div class="xplode" id="' + id + '" style="--xw:' + W + '">' + layers.map((L, i) => '<canvas class="xl" width="' + W + '" height="' + H + '" style="z-index:' + (i + 1) + '"></canvas>').join('') + layers.map(lab).join('') +
      '<div class="xfloor"></div></div>';
  };
  UI.A.xpToggle = () => { UI.st.xpPin = !UI.st.xpPin; document.querySelectorAll('.xplode').forEach(b => { b.classList.toggle('asm', !UI.st.xpPin); b.classList.toggle('exp', !!UI.st.xpPin); }); document.querySelectorAll('[data-act="xpToggle"]').forEach(b => { b.textContent = UI.st.xpPin ? 'Explode on hover' : 'Keep exploded'; }); };
})();
// (3.6) the tabs of pages split up in 3.6
G.UI.A.desTab = t => { G.UI.st.desTab = t; G.UI.render(); };
G.UI.A.teamTab = t => { G.UI.st.teamTab = t; G.UI.render(); };
G.UI.A.finTab = t => { G.UI.st.finTab = t; G.UI.render(); };
G.UI.A.calTab = t => { G.UI.st.calTab = t; G.UI.render(); };
