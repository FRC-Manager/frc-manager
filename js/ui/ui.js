'use strict';
/* FRC Manager — UI framework + headquarters screens */
(function () {
  const U = G.U, D = G.Data, h = U.esc;
  const UI = G.UI = { screen: 'menu', p: {}, st: {}, A: {}, S: {}, jobs: [] };
  UI.prefs = Object.assign({ speed: 2 }, G.Save.settings());

  // ---------------- core ----------------
  // While an event is open, only event screens (and the full-screen menus) are reachable.
  UI.EVENT_SCREENS = ['event', 'prematch', 'live', 'mresult', 'menu', 'help', 'notes', 'settings', 'load', 'newgame'];
  UI.go = function (screen, p) {
    if (G.S && G.S.event && UI.EVENT_SCREENS.indexOf(screen) < 0) screen = 'event';
    UI.stopLive && UI.stopLive(); UI.screen = screen; UI.p = p || {}; UI.render();
    const mn = document.getElementById('main'); if (mn) mn.scrollTop = 0;
  };
  UI.render = function () {
    const app = document.getElementById('app');
    const scr = UI.S[UI.screen] || UI.S.menu;
    UI.jobs = [];
    let body;
    try { body = scr.html(); }
    catch (e) { console.error(e); body = '<div class="card"><b>Something went wrong rendering this screen.</b><pre class="sm muted">' + h(e.stack || e) + '</pre><button class="btn" data-act="nav" data-arg="hq">Back to HQ</button></div>'; }
    if (scr.full) app.innerHTML = body;
    else app.innerHTML = topbar() + '<div class="shell">' + sidebar(scr.nav || UI.screen) + '<div class="main" id="main">' + body + '</div></div>';
    UI.jobs.forEach(f => { try { f(); } catch (e) { console.error(e); } });
    if (scr.after) scr.after();
    if (!UI.verChecked && UI.versionCheck) { UI.verChecked = true; setTimeout(UI.versionCheck, 350); } // "Updated to vX" once per new version
  };
  UI.job = f => UI.jobs.push(f);
  UI.modal = function (html, opts) {
    UI.closeModal();
    const bg = document.createElement('div');
    bg.className = 'modal-bg'; bg.id = 'modal';
    bg.innerHTML = '<div class="modal ' + (opts && opts.wide ? 'wide' : '') + '">' + html + '</div>';
    if (!(opts && opts.lock)) bg.addEventListener('click', e => { if (e.target === bg) UI.closeModal(); });
    document.body.appendChild(bg);
    if (opts && opts.after) opts.after();
  };
  UI.closeModal = function () { const m = document.getElementById('modal'); if (m) m.remove(); };
  UI.toast = function (msg, kind) {
    let box = document.querySelector('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.appendChild(box); }
    const t = document.createElement('div'); t.className = 'toast ' + (kind || ''); t.textContent = msg;
    box.appendChild(t); setTimeout(() => t.remove(), 3800);
  };
  UI.confirm = function (title, text, yes, onYes) {
    UI._yes = onYes;
    UI.modal('<h2>' + h(title) + '</h2><p class="muted" style="white-space:pre-wrap">' + h(text) + '</p><div class="row mt"><span class="sp"></span><button class="btn" data-act="closeModal">Cancel</button><button class="btn primary" data-act="confirmYes">' + h(yes || 'OK') + '</button></div>');
  };
  UI.A.closeModal = () => UI.closeModal();
  UI.A.confirmYes = () => { const f = UI._yes; UI.closeModal(); if (f) f(); };
  UI.err = function (e) { if (e) { UI.toast(typeof e === 'string' ? e : (e.join ? e.join(' ') : String(e)), 'bad'); return true; } return false; };
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = UI.A[el.dataset.act];
    if (fn) { e.preventDefault(); fn(el.dataset.arg, el, e); }
  });
  document.addEventListener('change', e => {
    const el = e.target.closest('[data-chg]');
    if (!el) return;
    const fn = UI.A[el.dataset.chg];
    if (fn) fn(el.type === 'checkbox' ? el.checked : el.value, el, e);
  });

  // ---------------- components ----------------
  UI.bar = (v, max, col, mark) => '<div class="bar"><i style="width:' + U.clamp(100 * v / (max || 100), 0, 100) + '%;background:' + (col || 'var(--accent)') + '"></i>' + (mark != null ? '<b style="left:' + U.clamp(100 * mark / (max || 100), 0, 100) + '%"></b>' : '') + '</div>';
  UI.stat = (n, v, ceil, col) => '<div class="statrow"><span class="n">' + h(n) + '</span>' + UI.bar(v, 100, col, ceil) + '<span class="v">' + Math.round(v) + '</span></div>';
  UI.card = (title, body, extra, cls) => '<div class="card ' + (cls || '') + '"><div class="ct">' + title + '<span class="sp"></span>' + (extra || '') + '</div>' + body + '</div>';
  UI.tag = (t, k) => '<span class="tag ' + (k || '') + '">' + h(t) + '</span>';
  // Blue banner (simplified FRC style): emblem, award, year, event
  UI.banner = (b, isNew) => '<div class="banner ' + (b.gold ? 'gold ' : '') + (isNew ? 'new' : '') + '"><div class="emb">' + (b.gold ? '★' : b.award === 'Impact Award' ? '✦' : '⚙') + '</div><div class="aw">' + h(b.award) + '</div><div class="yr">' + h(b.year) + '</div><div class="ev">' + h(b.event) + '</div></div>';
  UI.bannerWall = (list, isNew) => '<div class="banners">' + list.map(b => UI.banner(b, isNew)).join('') + '</div>';
  UI.colorFor = v => v >= 75 ? 'var(--good)' : v >= 50 ? 'var(--accent)' : v >= 30 ? 'var(--warn)' : 'var(--bad)';
  UI.sideCanvas = function (look, a, team, w, hgt) {
    const id = 'cv' + Math.floor(Math.random() * 1e9);
    UI.job(() => { const c = document.getElementById(id); if (c) G.Render.robotSide(c.getContext('2d'), c.width, c.height, look, a, team); });
    return '<canvas id="' + id + '" class="side" width="' + (w || 360) + '" height="' + (hgt || 220) + '"></canvas>';
  };
  UI.topCanvas = function (look, a, team, held, year, size) {
    const id = 'tv' + Math.floor(Math.random() * 1e9), sz = size || 120;
    UI.job(() => {
      const c = document.getElementById(id); if (!c) return;
      const ctx = c.getContext('2d'); ctx.fillStyle = '#12161b'; ctx.fillRect(0, 0, sz, sz);
      G.Render.robot(ctx, sz / 2.2, { x: 1.1, y: 1.0, hd: -Math.PI / 2, look, a, team, isPlayer: false, held: held || 0, cap: { storage: look.hopper } }, { year });
    });
    return '<canvas id="' + id + '" width="' + sz + '" height="' + sz + '" style="border-radius:8px;border:1px solid var(--line)"></canvas>';
  };

  // ---------------- chrome ----------------
  function topbar() {
    const S = G.S; if (!S) return '';
    const t = S.team;
    const contLbl = S.phase === 'end' ? 'Summary' : 'Continue ▶';
    return '<div class="topbar">' +
      '<div class="teamchip"><div class="sw" style="background:' + h(t.c1) + ';color:' + h(t.c2) + '">' + h(String(t.num).slice(0, 5)) + '</div><div><div>' + h(t.name) + '</div><div class="xs muted">' + (S.si < 0 ? 'Pre-season' : h(G.Career.seasonName(S))) + (S.mode === 'career' ? ' · Season ' + (Math.max(0, S.si) + 1) + '/' + S.order.length : ' · Single Season') + '</div></div></div>' +
      '<div class="sp"></div><div class="datelbl">' + h(G.Career.dateLabel(S)) + '</div><div class="sp"></div>' +
      kpi(U.money(S.money), 'Budget', S.money < 0 ? 'bad' : '') + kpi(Math.round(S.morale), 'Morale', S.morale < 40 ? 'bad' : '') + kpi(Math.round(S.support), 'Support', S.support < 30 ? 'bad' : '') + kpi(Math.round(S.rep), 'Reputation') +
      '<button class="btn ghost" data-act="menuModal">☰</button>' +
      (S.event ? '<span class="tag acc">Event in progress</span>' : '<button class="btn primary" data-act="continue">' + contLbl + '</button>') + '</div>';
  }
  function kpi(v, l, cls) { return '<div class="kpi"><span class="v ' + (cls || '') + '">' + h(v) + '</span><span class="l">' + l + '</span></div>'; }
  function sidebar(cur) {
    const S = G.S;
    if (S.event) {
      return '<div class="side"><div class="nav on" data-act="nav" data-arg="event"><span class="ic">⚑</span><span class="t">Event</span></div>' +
        '<div class="xs muted" style="padding:8px 10px"><span class="t">Other screens open again after you leave the event from its results page.</span></div></div>';
    }
    const unread = S.inbox.filter(m => !m.read).length;
    const items = [['hq', '⌂', 'Headquarters'], ['inbox', '✉', 'Inbox', unread], ['garage', '⚙', 'Garage'], ['design', '✎', 'Design Office'], ['know', '◆', 'Tech Knowledge'],
      ['team', '☺', 'Team'], ['mentors', '★', 'Mentors'], ['workshop', '⚒', 'Workshop'], ['finance', '$', 'Finance'], ['calendar', '▦', 'Calendar']];
    if (S.history.length || G.Career.banners(S).length) items.push(['history', '☰', 'History']);
    return '<div class="side">' + items.map(i => '<div class="nav ' + (cur === i[0] ? 'on' : '') + '" data-act="nav" data-arg="' + i[0] + '"><span class="ic">' + i[1] + '</span><span class="t">' + i[2] + '</span>' + (i[3] ? '<span class="badge">' + i[3] + '</span>' : '') + '</div>').join('') + '</div>';
  }
  UI.A.nav = a => UI.go(a);
  UI.A.continue = function () {
    const S = G.S;
    if (S.phase === 'end') return UI.go('end');
    if (S.phase === 'review') { if (UI.screen !== 'review') return UI.go('review'); }
    const b = G.Career.blockers(S);
    if (b.length) {
      const ev = G.Career.eventThisTurn(S);
      let btns = '';
      if (ev && ev.active) btns += '<button class="btn primary" data-act="nav" data-arg="event">Return to event</button>';
      else if (ev && ev.def) btns += '<button class="btn primary" data-act="goEvent">Go to ' + h(ev.def.name) + '</button>' + (ev.def.kind === 'champs' ? '<button class="btn" data-act="skipChamps">Skip Championship</button>' : '');
      if (G.Career.dueActivities(S).length) btns += '<button class="btn" data-act="activities">Resolve sponsor activities</button>';
      if (S.incident) btns += '<button class="btn" data-act="incident">Resolve shop incident</button>';
      UI.modal('<h2>Before you continue</h2>' + b.map(x => '<p>' + h(x) + '</p>').join('') + '<div class="row mt">' + btns + '<span class="sp"></span><button class="btn" data-act="closeModal">Close</button></div>');
      return;
    }
    const before = { phase: S.phase, year: S.year };
    const err = G.Career.advance(S);
    if (UI.err(err)) return;
    if (S.lastWork && S.lastWork.done.length) UI.toast('Completed: ' + S.lastWork.done.join(', '), 'good');
    if (S.phase === 'kickoff' && before.phase !== 'kickoff') { UI.go('hq'); return UI.kickoffModal(); }
    if (S.phase === 'review') return UI.go('review');
    if (S.phase === 'end') return UI.go('end');
    UI.render();
    if (G.Career.dueActivities(S).length) UI.A.activities();
    else if (S.incident) UI.A.incident();
    else UI.regReminder();
  };
  // October: regional registration opens for next season
  UI.regReminder = function () {
    const S = G.S, key = 'up' + S.upcoming;
    if (S.mode !== 'career' || S.phase !== 'off' || D.MONTHS[S.month] !== 'Oct' || S.regReminded[key]) return;
    S.regReminded[key] = true;
    UI.modal('<div class="xs acc b">OCTOBER</div><h2>Regional registration is open</h2><p class="muted">Sign up for next season\'s regionals now, while every event still has spots. After Kickoff, some events fill up and late registration costs ' + U.money(D.FEES.late) + ' extra.</p>' +
      '<div class="kv"><span class="k">First regional</span><span>' + U.money(D.FEES.firstRegional) + '</span><span class="k">Each additional</span><span>' + U.money(D.FEES.addRegional) + '</span><span class="k">Registered so far</span><span>' + S.registered.length + ' / ' + S.maxEvents + '</span></div>' +
      '<p class="sm muted">New sponsor offers also arrived this month (Finance).</p><div class="row mt"><span class="sp"></span><button class="btn" data-act="closeModal">Later</button><button class="btn primary" data-act="closeAndGo" data-arg="calendar">Open Calendar</button></div>');
  };
  // ---------------- shop incidents ----------------
  UI.A.incident = function () {
    const S = G.S, inc = S.incident;
    if (!inc) { UI.closeModal(); return; }
    UI.modal('<div class="xs warn b">SHOP INCIDENT</div><h2>' + h(inc.title) + '</h2><p class="muted">' + h(inc.body) + '</p><div class="col">' +
      inc.opts.map((o, i) => '<button class="btn" data-act="resolveInc" data-arg="' + i + '" style="text-align:left;white-space:normal"><b>' + h(o.label) + (o.cost ? ' · ' + U.money(o.cost) : '') + '</b><div class="xs muted">' + h(o.desc) + '</div></button>').join('') +
      '</div><p class="xs dim mt">Incident effects last one turn at most (about one week of work).</p>', { lock: true });
  };
  UI.A.resolveInc = function (i) {
    if (UI.err(G.Shop.resolve(G.S, Number(i)))) return;
    UI.closeModal(); UI.render();
    if (G.Career.dueActivities(G.S).length) UI.A.activities();
  };
  UI.devBanner = function (S) {
    let o = '';
    if (S.devMods && G.Shop.modsText(S.devMods.mods)) o += '<div class="warnbox mb">This turn: ' + h(G.Shop.modsText(S.devMods.mods)) + ' (' + h(S.devMods.notes.join(', ')) + ')' + (S.phase === 'off' ? ', for about one week of the month' : '') + '.</div>';
    if (S.pendingRisk) o += '<div class="warnbox mb">Risk this turn: ' + h(S.pendingRisk.title) + ' — ' + h(S.pendingRisk.desc || '') + '.</div>';
    if (S.incident) o += '<div class="warnbox mb"><b>Shop incident:</b> ' + h(S.incident.title) + ' <button class="btn sm" data-act="incident">Decide</button></div>';
    const unit = S.phase === 'off' ? 'month' : 'week';
    const boosts = (S.boosts || []).map(b => G.Shop.boostText(b) + ' (' + h(b.title) + ', ' + b.turns + ' ' + unit + (b.turns > 1 ? 's' : '') + ' left)')
      .concat((S.guests || []).map(g => 'guest mentor ' + h(g.m.name) + ' from ' + h(g.m.guest) + ' (' + g.turns + ' ' + unit + (g.turns > 1 ? 's' : '') + ' left)'));
    if (boosts.length) o += '<div class="hint mb"><b>Active boosts:</b> ' + boosts.join(' · ') + '</div>';
    return o;
  };
  UI.A.skipChamps = () => { G.S.champsDeclined = true; UI.closeModal(); UI.toast('Championship skipped.'); UI.render(); };
  UI.A.goEvent = function () {
    const S = G.S, ev = G.Career.eventThisTurn(S);
    UI.closeModal();
    if (!ev) return;
    if (ev.active) return UI.go('event');
    const def = ev.def;
    if (def.kind === 'champs') { const e = G.Career.registerChamps(S); if (UI.err(e)) return; }
    if (def.kind !== 'einstein') {
      const tc = G.Career.travelCost(S, def);
      if (S.money < tc - 20000) return UI.toast('You cannot afford the trip.', 'bad');
    }
    G.Career.startEvent(S, def);
    G.Save.write('auto');
    UI.go('event');
  };
  UI.kickoffModal = function () {
    const S = G.S, Sz = G.Seasons[S.year];
    const rel = Object.keys(Sz.relevance).filter(k => Sz.relevance[k] > 0).sort((a, b) => Sz.relevance[b] - Sz.relevance[a]);
    UI.modal('<div class="xs muted">KICKOFF · SEASON ' + (S.si + 1) + '</div><h2 style="font-size:28px">' + S.year + ' ' + h(Sz.name) + '</h2><p class="acc b">' + h(Sz.tagline) + '</p>' +
      '<canvas id="kfield" width="900" height="447" style="width:100%;border-radius:8px"></canvas>' +
      Sz.brief.map(p => '<p class="muted">' + h(p) + '</p>').join('') +
      (Sz.meta ? '<div class="hint">' + h(Sz.meta.note) + ' Opponents figure this out over the season, so expect it more in later weeks and in playoffs.</div>' : '') +
      '<h3 class="mt">Your knowledge vs this game</h3><table class="t"><tr><th>Area</th><th>Relevance</th><th>Your level</th></tr>' +
      rel.map(k => '<tr><td>' + h(D.AREA[k].name) + '</td><td class="acc">' + '★'.repeat(Sz.relevance[k]) + '</td><td>Lv ' + G.Robot.know(S, k) + '</td></tr>').join('') + '</table>' +
      '<div class="row mt"><span class="sp"></span><button class="btn primary" data-act="closeAndGo" data-arg="design">Open Design Office</button></div>', { wide: true, after: () => { const c = document.getElementById('kfield'); G.Render.preview(c, S.year); } });
  };
  UI.A.closeAndGo = a => { UI.closeModal(); UI.go(a); };
  UI.A.menuModal = function () {
    const slots = ['1', '2', '3'].map(s => { const m = G.Save.meta(s); return '<button class="btn" data-act="saveSlot" data-arg="' + s + '">Save slot ' + s + (m ? ' <span class="xs muted">(' + h(m.team.num + ' · ' + m.year) + ')</span>' : '') + '</button>'; }).join('');
    UI.modal('<h2>Menu</h2><div class="col">' + slots + '<button class="btn" data-act="exportSave">Export save</button><button class="btn" data-act="nav2" data-arg="settings">Settings</button><button class="btn" data-act="nav2" data-arg="help">How to play</button><button class="btn" data-act="nav2" data-arg="notes">What\'s new (v' + h(G.VERSION) + ')</button><button class="btn bad" data-act="quitMenu">Quit to main menu</button></div>');
  };
  UI.A.saveSlot = s => { if (G.Save.write(s)) UI.toast('Saved to slot ' + s, 'good'); UI.closeModal(); };
  UI.A.exportSave = () => {
    const txt = G.Save.exportText();
    UI.modal('<h2>Export save</h2><p class="muted">Copy this save code and keep it somewhere safe. Paste it on the Load screen to continue on another browser or computer.</p>' +
      '<textarea id="saveText" class="inp mono" readonly rows="6" style="resize:vertical;font-size:11px">' + h(txt) + '</textarea>' +
      '<div class="row mt"><button class="btn primary" data-act="copySave">Copy save code</button>' + (G.Save.exportFile ? '<button class="btn" data-act="downloadSave">Download as file</button>' : '') +
      '<span class="sp"></span><button class="btn" data-act="closeModal">Close</button></div>');
  };
  UI.A.copySave = () => {
    const ta = document.getElementById('saveText'); if (!ta) return;
    const fallback = () => { ta.focus(); ta.select(); UI.toast('Save code selected — press Ctrl+C (or ⌘C) to copy it.'); };
    try { navigator.clipboard.writeText(ta.value).then(() => UI.toast('Save code copied', 'good'), fallback); } catch (e) { fallback(); }
  };
  UI.A.downloadSave = () => { G.Save.exportFile(); };
  UI.A.nav2 = a => { UI.closeModal(); UI.go(a); };
  UI.A.quitMenu = () => { G.Save.write('auto'); UI.closeModal(); UI.go('menu'); };

  // ---------------- activities (sponsor obligations) ----------------
  UI.A.activities = function () {
    const S = G.S, due = G.Career.dueActivities(S);
    if (!due.length) { UI.closeModal(); return; }
    const a = due[0];
    UI.modal('<div class="xs muted">SPONSOR ACTIVITY</div><h2>' + h(a.text) + '</h2><p class="muted">' + h(a.sponsor) + ' expects your team to take part this week. How do you handle it?</p><div class="col">' +
      '<button class="btn" data-act="resAct" data-arg="' + a.id + '|student">Send a drive-team student <span class="xs muted">(+sponsor satisfaction, they miss practice: −driver confidence)</span></button>' +
      '<button class="btn" data-act="resAct" data-arg="' + a.id + '|robot">Bring the robot for a demo <span class="xs muted">(+satisfaction, +reputation, −10% robot condition; in a competition week the robot arrives at that week\'s event worn)</span></button>' +
      '<button class="btn" data-act="resAct" data-arg="' + a.id + '|hours">Send a team group <span class="xs muted">(+satisfaction, −30 build hours this turn)</span></button>' +
      '<button class="btn bad" data-act="resAct" data-arg="' + a.id + '|skip">Skip it <span class="xs muted">(−15 sponsor satisfaction)</span></button></div>', { lock: true });
  };
  UI.A.resAct = function (arg) { const [id, how] = arg.split('|'); G.Career.resolveActivity(G.S, id, how); UI.closeModal(); if (G.Career.dueActivities(G.S).length) UI.A.activities(); else { UI.render(); if (G.S.incident) UI.A.incident(); } };

  // =====================================================================
  // HQ
  // =====================================================================
  UI.S.hq = { html() {
    const S = G.S, C = G.Career;
    let o = '<h1>Headquarters</h1><div class="sub">' + h(C.dateLabel(S)) + (S.year && S.phase !== 'off' ? ' — ' + h(G.Seasons[S.year].name) : '') + '</div>';
    o += cta(S);
    const banner = UI.devBanner(S);
    if (banner) o += '<div class="mt">' + banner + '</div>';
    o += '<div class="grid g3 mt">';
    // robot
    if (S.robot) {
      const cap = G.Robot.cap(S), w = G.Robot.weight(S), off = S.phase === 'off';
      o += UI.card('Robot ' + UI.tag(S.robot.year + (off ? ' (last season)' : ''), off ? '' : 'acc'), UI.sideCanvas(G.Robot.look(S), 'blue', S.team.num, 360, 190) +
        '<div class="mt">' + UI.stat('Speed', cap.speed) + UI.stat('Scoring', (cap.scoreSpd + cap.accuracy) / 2) + UI.stat('Intake', cap.intake) + UI.stat('Endgame', cap.endgame) + UI.stat('Reliability', cap.rel, null, UI.colorFor(cap.rel)) + '</div>' +
        '<div class="row sm muted mt"><span>Weight <b class="' + (w > 125 ? 'bad' : '') + '">' + w + ' lb</b> / 125</span><span class="sp"></span><span>Auto: ' + h(G.Seasons[S.robot.year].autoTiers[S.robot.autoTier]) + '</span></div>', '<button class="btn sm" data-act="nav" data-arg="garage">Garage</button>');
    } else o += UI.card('Robot', '<p class="muted">No robot yet. The game is revealed at Kickoff in January. Until then, start pre-season research in the Design Office to build knowledge.</p>', '<button class="btn sm" data-act="nav" data-arg="design">Design Office</button>');
    // projects
    const hplan = C.hoursPlan(S);
    o += UI.card('Projects ' + UI.tag(S.projects.length + '/' + G.Robot.slots(S) + ' slots'), UI.hoursPanel(S, true) + UI.testPanel(S, true) + '<div class="hr"></div>' + (S.projects.length ? S.projects.map(p => '<div class="mb"><div class="row sm"><span>' + h(p.name) + '</span><span class="sp"></span><span class="muted">' + Math.round(p.done) + '/' + p.need + ' h · +' + Math.round(hplan.give[p.id] || 0) + ' h now</span></div>' + UI.bar(p.done, p.need) + '</div>').join('') : '<p class="muted">No active projects. Idle hours are wasted!</p>') +
      (function () { const sg = G.Robot.suggest(S); return sg ? '<div class="sm"><span class="muted">Suggested:</span> ' + h(sg.title) + ' <button class="btn sm" data-act="startSuggest">Start</button></div>' : ''; })(), '<button class="btn sm" data-act="nav" data-arg="design">Design</button>');
    // money
    const s = S.season;
    o += UI.card('Finances', '<div class="xl b ' + (S.money < 0 ? 'bad' : '') + '">' + U.money(S.money) + '</div><div class="kv mt"><span class="k">Earned this season</span><span class="good">' + U.money(s.earned) + '</span><span class="k">Spent this season</span><span class="bad">' + U.money(s.spent) + '</span><span class="k">Sponsors</span><span>' + S.sponsors.length + '</span></div>', '<button class="btn sm" data-act="nav" data-arg="finance">Finance</button>');
    // events
    const regs = S.regionals.filter(r => S.registered.includes(r.id)).sort((a, b) => a.week - b.week);
    const ir = C.impactRating(S);
    const impLine = r => {
      if (S.eventsDone[r.id]) { const res = s.events.find(x => x.id === r.id); return '<div class="imp xs">' + (res && res.awards.includes('impact') ? '<span class="good">✦ Won the Impact Award</span>' : '<span class="dim">Impact Award went to another team</span>') + '</div>'; }
      if (ir.won) return '<div class="imp xs dim">Impact Award already won this season (one per season)</div>';
      const p = C.impactOdds(S, r, ir), pct = p * 100, txt = pct > 0 && pct < 1 ? '<1%' : Math.round(pct) + '%';
      return '<div class="imp xs"><span class="muted">Impact</span>' + UI.bar(pct, 100, ir.submitted ? UI.colorFor(Math.min(100, pct * 1.6)) : 'var(--dim)') + '<b' + (ir.submitted ? '' : ' class="dim" title="Odds once your Impact submission is done"') + '>' + txt + '</b></div>';
    };
    o += UI.card('Your schedule', (regs.length ? '<div class="xs muted mb">Impact rating <b>' + Math.round(ir.score) + '</b>/100 · ' + (ir.submitted ? '<span class="good">submitted</span>' : '<span class="warn">no submission yet (Design Office) — odds shown are what you\'d have with one</span>') + '</div>' +
      regs.map(r => '<div class="row sm"><span class="tag">Wk ' + r.week + '</span><span>' + h(r.name) + '</span><span class="sp"></span>' + (S.eventsDone[r.id] ? UI.tag('done', 'good') : '') + '</div>' + impLine(r)).join('') : '<p class="muted">No regionals registered.</p>') +
      (S.scrimmage ? '<div class="sm muted">+ Week 0 scrimmage</div>' : '') + (s.champsQualified ? '<div class="mt">' + UI.tag('Championship qualified', 'good') + '</div>' : ''), '<button class="btn sm" data-act="nav" data-arg="calendar">Calendar</button>');
    // goals
    o += UI.card('Program goals', (s.goals.length ? s.goals.map(g => '<div class="row sm mb"><span class="tag ' + (D.PROGRAM_GOALS[g.id].check(s) ? 'good' : '') + '">' + g.tier + '</span><span>' + h(D.PROGRAM_GOALS[g.id].text) + '</span></div>').join('') : '<p class="muted">Goals are set at Kickoff.</p>') +
      '<div class="mt">' + '<div class="sm muted">Program support</div>' + UI.bar(S.support, 100, UI.colorFor(S.support)) + '</div>', '');
    // inbox
    o += UI.card('Latest news', S.inbox.slice(0, 4).map(m => '<div class="sm mb"><b>' + h(m.title) + '</b><div class="xs dim">' + h(m.date) + '</div></div>').join('') || '<p class="muted">Nothing yet.</p>', '<button class="btn sm" data-act="nav" data-arg="inbox">Inbox</button>');
    o += '</div>';
    return o;
  } };
  function cta(S) {
    const C = G.Career, ev = C.eventThisTurn(S);
    const box = (t, d, btn) => '<div class="big-cta"><div class="sp"><div class="lg b">' + t + '</div><div class="sm muted">' + d + '</div></div>' + btn + '</div>';
    if (S.phase === 'end') return box('Career complete', 'See your final summary.', '<button class="btn primary" data-act="nav" data-arg="end">Summary</button>');
    if (S.phase === 'review') return box('Season review', 'See how the season went.', '<button class="btn primary" data-act="nav" data-arg="review">Open review</button>');
    if (ev && ev.active) return box('Event in progress: ' + h(S.event.name), 'Return to the event.', '<button class="btn primary" data-act="nav" data-arg="event">Return to event</button>');
    if (ev && ev.def) {
      const d = ev.def;
      const cost = d.kind === 'champs' ? 'Registration ' + U.money(D.FEES.champs) + ' + travel ' + U.money(C.travelCost(S, d)) : d.kind === 'einstein' ? '' : 'Travel ' + U.money(C.travelCost(S, d));
      const ap = C.arrivalPreview(S, d);
      const arr = ap ? ' · Robot arrives at ' + (ap.notes.length ? '<span class="warn">about ' + ap.cond + '%</span> (' + h(ap.notes.join(', ')) + ')' + (ap.spares > 0 ? ' — buy ' + ap.spares + ' spare part' + (ap.spares > 1 ? 's' : '') + ' in the Workshop first' : '') : '<span class="good">100%</span>') : '';
      return box('This week: ' + h(d.name), cost + arr, '<button class="btn primary lg" data-act="goEvent">Go to event ▶</button>' + (d.kind === 'champs' ? '<button class="btn" data-act="skipChamps">Skip</button>' : ''));
    }
    const tips = {
      off: S.preseason ? 'Pre-season: sign sponsors (Finance), hire mentors, register regionals (Calendar), start research (Design Office).' : 'Offseason: research, offseason events (Calendar), outreach (Team) and sponsors in October.',
      kickoff: 'Kickoff! Choose a concept for every subsystem in the Design Office, then press Continue.',
      build: S.week === 7 ? 'Week 0 — last week before competitions start.' : 'Build season: keep project slots busy. Consider overtime in the Design Office.',
      comp: 'Competition season — no event this week. Keep upgrading between events.',
      champs: 'The season is wrapping up.'
    };
    return '<div class="hint">' + h(tips[S.phase] || '') + '</div>';
  }

  // =====================================================================
  // INBOX
  // =====================================================================
  UI.S.inbox = { html() {
    const S = G.S;
    const KIND = { boost: ['Opportunity', 'good'], incident: ['Shop incident', 'warn'], shop: ['Facilities', 'warn'], fun: ['Team chatter', 'info'], news: ['News', ''], money: ['Finance', 'good'], event: ['Event', 'acc'], dev: ['Development', ''], know: ['Knowledge', ''], staff: ['Team', ''], kickoff: ['Kickoff', 'acc'], goal: ['Goals', ''] };
    const kt = m => KIND[m.kind] ? UI.tag(KIND[m.kind][0], KIND[m.kind][1]) + ' ' : '';
    const list = S.inbox.map(m => '<div class="msg ' + (m.read ? '' : 'unread') + '" data-act="readMsg" data-arg="' + m.id + '"><div class="row">' + kt(m) + '<span class="mt">' + h(m.title) + '</span><span class="sp"></span><span class="md">' + h(m.date) + '</span></div>' + (UI.st.openMsg === m.id ? '<div class="mb">' + h(m.body) + '</div>' : '') + '</div>').join('');
    const due = G.Career.dueActivities(S);
    return '<h1>Inbox</h1><div class="sub">News, results and decisions.</div><div class="row mb"><button class="btn sm" data-act="readAll">Mark all read</button>' + (S.incident ? '<button class="btn sm primary" data-act="incident">Resolve shop incident</button>' : '') + (due.length ? '<button class="btn sm primary" data-act="activities">' + due.length + ' sponsor activit' + (due.length > 1 ? 'ies' : 'y') + ' to resolve</button>' : '') + '</div>' + (list || '<p class="muted">Empty.</p>');
  } };
  UI.A.readMsg = id => { const m = G.S.inbox.find(x => x.id === id); if (m) m.read = true; UI.st.openMsg = UI.st.openMsg === id ? null : id; UI.render(); };
  UI.A.readAll = () => { G.S.inbox.forEach(m => m.read = true); UI.render(); };

  // =====================================================================
  // GARAGE
  // =====================================================================
  UI.S.garage = { html() {
    const S = G.S;
    if (!S.robot) return '<h1>Garage</h1><p class="muted">No robot yet — wait for Kickoff.</p>';
    const R = S.robot, year = R.year, cap = G.Robot.cap(S), look = G.Robot.look(S), w = G.Robot.weight(S);
    let o = '<h1>Garage</h1><div class="sub">' + year + ' ' + h(G.Seasons[year].name) + (S.phase === 'off' ? ' — last season\'s robot (used at offseason events)' : '') + '</div>';
    o += '<div class="grid g3"><div class="card span2"><div class="row" style="align-items:stretch">' + '<div style="flex:2">' + UI.sideCanvas(look, 'blue', S.team.num, 560, 300) + '</div><div style="flex:1;display:flex;align-items:center;justify-content:center">' + UI.topCanvas(look, 'blue', S.team.num, 0, year, 200) + '</div></div></div>';
    o += UI.card('Overall', UI.stat('Speed', cap.speed) + UI.stat('Agility', cap.agility) + UI.stat('Pushing', cap.push) + UI.stat('Intake', cap.intake) + UI.stat('Scoring speed', cap.scoreSpd) + UI.stat('Accuracy', cap.accuracy) +
      (cap.rmax ? UI.stat('Range', cap.range) : '') + UI.stat('Endgame', cap.endgame) + UI.stat('Autonomous', cap.auto) + UI.stat('Vision', cap.vision) + UI.stat('Reliability', cap.rel, null, UI.colorFor(cap.rel)) +
      '<div class="hr"></div><div class="kv"><span class="k">Weight</span><span class="' + (w > 125 ? 'bad b' : '') + '">' + w + ' / 125 lb</span><span class="k">Auto</span><span>' + h(G.Seasons[year].autoTiers[R.autoTier]) + '</span><span class="k">Vision</span><span>Level ' + R.visionLvl + '</span><span class="k">Condition</span><span>' + Math.round(G.Robot.condAvg(S)) + '%</span><span class="k">Practice robot</span><span>' + (R.practiceBot ? 'Yes' : 'No') + '</span><span class="k">Power rating</span><span>' + G.Cap.power(year, cap) + '</span></div>');
    o += '</div><h2 class="mt">Subsystems</h2><div class="grid g3">';
    G.Robot.describe(S).forEach(d => {
      const s = d.sub, c = d.concept;
      if (!s.ver) { o += UI.card(h(d.name), '<p class="muted">Not built.</p>', '<button class="btn sm" data-act="nav" data-arg="design">Design</button>'); return; }
      o += UI.card(h(d.name) + ' ' + UI.tag('v' + s.ver, 'acc'), '<div class="b mb">' + h(c.name) + '</div>' + Object.keys(s.stats).map(k => UI.stat(D.STAT[k] || k, s.stats[k], G.Robot.ceil(S, year, d.id, c, k))).join('') +
        (d.id !== 'soft' ? UI.stat('Reliability', s.rel, null, UI.colorFor(s.rel)) + UI.stat('Condition', s.cond, null, UI.colorFor(s.cond)) + '<div class="sm muted">' + s.w.toFixed(1) + ' lb · complexity ' + c.cx + (S.robot.pending.includes(d.id) ? ' · <span class="warn">upgrade waiting for install</span>' : '') + '</div>' : ''));
    });
    o += '</div><p class="sm muted mt">White marks show each stat\'s current ceiling (concept + knowledge + parts). Upgrades close part of the gap each time.</p>';
    return o;
  } };

  // =====================================================================
  // DESIGN OFFICE
  // =====================================================================
  UI.S.design = { html() {
    const S = G.S, R = S.robot, C = G.Career, inSeason = R && R.year === S.year && S.phase !== 'off';
    let o = '<h1>Design Office</h1><div class="sub">Choose development directions, run projects, research for the future.</div>';
    o += UI.devBanner(S);
    o += '<div class="row wrap mb"><span class="tag">' + S.projects.length + '/' + G.Robot.slots(S) + ' project slots</span><span class="xs muted">' + h(G.Robot.slotText(S)) + '</span>' +
      (S.phase === 'build' || S.phase === 'kickoff' ? '<label class="row sm"><input type="checkbox" data-chg="overtime" ' + (S.overtime ? 'checked' : '') + '> Overtime this week (+30% hours, −6 morale, $200)</label>' : '') + '</div>';
    o += UI.card('Team hours this ' + (S.phase === 'off' ? 'month' : 'week'), UI.hoursPanel(S));
    o += '<div class="mt">' + UI.card('Testing hours ' + UI.tag('practice field', 'info'), UI.testPanel(S)) + '</div>';
    // weekly suggestion
    const sg = G.Robot.suggest(S);
    if (sg) o += '<div class="card hl mt"><div class="ct">Suggested this week<span class="sp"></span>' + UI.tag(sg.quote.hours + ' h · ' + U.money(sg.quote.cost)) + '</div><div class="b">' + h(sg.title) + '</div><div class="sm muted">' + h(sg.reason) + '</div><div class="row mt"><button class="btn sm primary" data-act="startSuggest">Start it</button></div></div>';
    // active projects
    const plan = C.hoursPlan(S);
    o += '<div class="mt">' + UI.card('Active projects', S.projects.length ? '<table class="t"><tr><th>Project</th><th style="width:26%">Progress</th><th>This ' + (S.phase === 'off' ? 'month' : 'week') + '</th><th>Priority</th><th></th></tr>' + S.projects.map(p => '<tr><td>' + h(p.name) + (G.Robot.testable(p) && p.test ? ' <span class="xs info" title="Validated on the practice field: better upgrade quality">tested ' + Math.round(G.Robot.testQ(p) * 100) + '%</span>' : '') + (p.effort && p.effort !== 'std' ? ' ' + UI.tag(G.Robot.EFFORT[p.effort].name) : '') + '</td><td>' + UI.bar(p.done, p.need) + '<span class="xs muted">' + Math.round(p.done) + '/' + p.need + ' h</span></td><td class="sm">' + UI.projEta(S, p, plan) + '</td><td><select class="inp" data-chg="prio" data-id="' + p.id + '">' + ['high', 'normal', 'low'].map(x => '<option ' + (p.prio === x ? 'selected' : '') + '>' + x + '</option>').join('') + '</select></td><td><button class="btn sm bad" data-act="cancelProj" data-arg="' + p.id + '">Cancel</button></td></tr>').join('') + '</table>' : '<p class="muted">Nothing running — all team hours this turn would be wasted.</p>') + '</div>';
    if (inSeason) {
      const year = R.year;
      o += '<h2 class="mt">' + year + ' ' + h(G.Seasons[year].name) + ' robot</h2><div class="grid g3">';
      G.Robot.describe(S).forEach(d => {
        const s = d.sub, c = d.concept;
        const busy = S.projects.some(p => p.sub === d.id);
        let body = s.ver ? '<div class="b">' + h(c.name) + ' ' + UI.tag('v' + s.ver, 'acc') + '</div><div class="sm muted mb">' + Object.keys(s.stats).map(k => (D.STAT[k] || k) + ' ' + s.stats[k]).join(' · ') + (d.id !== 'soft' ? ' · Rel ' + s.rel : '') + '</div>' : '<div class="warn mb">Not built yet</div>';
        let btns = '';
        if (d.id === 'soft') {
          btns = '<button class="btn sm" data-act="upgradeModal" data-arg="soft" ' + (busy ? 'disabled' : '') + '>Upgrade code</button><button class="btn sm" data-act="startSimple" data-arg="auto">New auto routine</button><button class="btn sm" data-act="startSimple" data-arg="vision">Vision upgrade</button>';
          body += '<div class="sm">Auto: <b>' + h(G.Seasons[year].autoTiers[R.autoTier]) + '</b> · Vision Lv <b>' + R.visionLvl + '</b></div>';
        } else {
          btns = '<button class="btn sm ' + (s.ver ? '' : 'primary') + '" data-act="conceptModal" data-arg="' + d.id + '" ' + (busy ? 'disabled' : '') + '>' + (s.ver ? 'Switch concept' : 'Choose concept') + '</button>' +
            (s.ver ? '<button class="btn sm" data-act="upgradeModal" data-arg="' + d.id + '" ' + (busy ? 'disabled' : '') + '>Upgrade</button><button class="btn sm" data-act="startSimpleSub" data-arg="harden|' + d.id + '" ' + (busy ? 'disabled' : '') + '>Harden</button><button class="btn sm" data-act="startSimpleSub" data-arg="light|' + d.id + '" ' + (busy ? 'disabled' : '') + '>Lighten</button>' : '');
        }
        o += UI.card(h(d.name) + (busy ? ' ' + UI.tag('in progress', 'info') : ''), body + '<div class="row wrap gap4 mt">' + btns + '</div>');
      });
      o += UI.card('Program projects', '<div class="col">' +
        simpleRow('practiceBot', 'Practice robot', '+' + D.TEST_BOT_HOURS + ' testing hours a week (with a practice field); out of spares, practice wears it instead of the competition robot; +tuning, +6 spares.') +
        simpleRow('impact', 'Impact Award submission', 'Write your Impact story. Required to compete for the Impact Award this season (see HQ for your odds).') +
        (S.equip.kb ? '' : simpleRow('kb', 'Knowledge Base', 'Team wiki + CAD library: halves knowledge decay between seasons.')) + '</div>');
      o += '</div>';
      const w = G.Robot.weight(S);
      o += '<div class="row mt sm"><span>Robot weight: <b class="' + (w > 125 ? 'bad' : '') + '">' + w + ' lb</b> / 125 lb</span></div>';
    } else {
      o += '<div class="hint mt">' + (S.phase === 'off' ? 'Robot development begins at Kickoff when the game is revealed. In the offseason, research builds Tech Knowledge that carries into future games.' : 'No robot yet.') + '</div>';
      if (!S.equip.kb) o += '<div class="mt">' + UI.card('Program projects', simpleRow('kb', 'Knowledge Base', 'Team wiki + CAD library: halves knowledge decay between seasons.')) + '</div>';
    }
    // research
    o += '<h2 class="mt">Research (pre-season development)</h2><div class="sub">Builds Tech Knowledge directly. Useful any time — essential in the offseason.</div>';
    o += '<table class="t"><tr><th>Project</th><th>Area</th><th>Level</th><th class="num">Hours</th><th class="num">Cost</th><th class="num">XP</th><th></th></tr>' + D.RESEARCH.map(r => {
      const q = G.Robot.quote(S, { type: 'research', rid: r.id });
      return '<tr><td>' + h(r.name) + '</td><td>' + h(D.AREA[r.area].name) + '</td><td>Lv ' + G.Robot.know(S, r.area) + '</td><td class="num">' + q.hours + '</td><td class="num">' + U.money(q.cost) + '</td><td class="num">+' + r.xp + '</td><td><button class="btn sm" data-act="startResearch" data-arg="' + r.id + '" ' + (q.err ? 'disabled title="' + h(q.err) + '"' : '') + '>Start</button></td></tr>';
    }).join('') + '</table>';
    return o;
  } };
  function simpleRow(type, name, desc) {
    const q = G.Robot.quote(G.S, { type });
    return '<div class="row"><div class="sp"><b>' + h(name) + '</b><div class="xs muted">' + h(desc) + '</div></div><span class="xs muted">' + q.hours + ' h · ' + U.money(q.cost) + '</span><button class="btn sm" data-act="startSimple" data-arg="' + type + '" ' + (q.err ? 'disabled title="' + h(q.err) + '"' : '') + '>Start</button></div>';
  }
  UI.A.overtime = v => { G.S.overtime = v; UI.render(); };
  UI.A.startSuggest = () => { const sg = G.Robot.suggest(G.S); if (!sg) return; if (!UI.err(G.Robot.startProject(G.S, sg.spec))) { UI.toast('Started: ' + sg.title, 'good'); UI.render(); } };
  // ---------------- team hours: where this turn's hours go ----------------
  const PCOL = ['#f5b800', '#3ecf8e', '#4aa3ff', '#c77dff', '#ff8a5c', '#5ce1e6', '#ffd24d', '#9be15d'];
  UI.projEta = function (S, p, plan) {
    const hrs = plan.give[p.id] || 0, k = plan.mult(p), rate = hrs * k;
    if (rate < 0.5) return '<span class="warn">no hours</span>';
    const turns = Math.ceil((p.need - p.done) / rate - 1e-6), unit = S.phase === 'off' ? 'month' : 'week';
    return '<b>+' + Math.round(hrs) + ' h</b>' + (k !== 1 ? ' <span class="xs warn">×' + k.toFixed(2) + '</span>' : '') + '<div class="xs muted">' + (turns <= 1 ? 'finishes this ' + unit : '~' + turns + ' ' + unit + 's left') + '</div>';
  };
  // Testing hours (practice-field time, like wind-tunnel hours): split between development testing and driver practice
  UI.testPanel = function (S, compact) {
    const C = G.Career, th = C.testHours(S);
    if (!th.unlocked) return compact ? '' : '<div class="sm muted">No practice field yet. Buy one in the Workshop to unlock weekly <b>testing hours</b>, like wind-tunnel time: test upgrades on the field or let the drive team practice.</div><div class="row mt"><button class="btn sm" data-act="nav" data-arg="workshop">Workshop</button></div>';
    if (!th.total) return compact ? '' : '<div class="sm muted">No testing time this turn.</div>';
    const unit = th.unit, conf = G.Robot.eventStart(S, { year: S.year }).conf, pw = S.practiceWeeks || 0;
    const devN = S.projects.filter(G.Robot.testable).length, cap = G.Robot.testCap(S), devUse = Math.round(th.dev - G.Robot.testPlan(S, th.dev, C.hoursPlan(S).give).idle);
    if (compact) return '<div class="sm mt"><span class="muted">Testing ' + th.total + ' h:</span> <span class="info">' + th.dev + ' h dev</span> · <span class="acc">' + th.drive + ' h driving</span> · confidence ' + Math.round(conf * 100) + '%</div>';
    const pct = v => Math.round(100 * v / Math.max(1, th.total));
    let o = '<div class="row wrap mb"><div><span class="hnum">' + th.total + ' h</span> <span class="xs muted">testing this ' + unit + '</span></div><span class="sp"></span>' +
      '<div class="row wrap gap4">' + C.TEST_SPLITS.map(v => '<button class="btn sm ' + (Math.abs((S.testSplit == null ? 0.5 : S.testSplit) - v) < 0.01 ? 'sel' : '') + '" data-act="testSplit" data-arg="' + v + '"' + (th.canDrive ? '' : ' disabled') + '>' + (v === 0 ? 'All dev' : v === 1 ? 'All driving' : Math.round((1 - v) * 100) + ' / ' + Math.round(v * 100)) + '</button>').join('') + '</div></div>' +
      '<div class="hbar"><span style="width:' + pct(th.dev) + '%;background:var(--info)" title="Development testing ' + th.dev + ' h"></span><span style="width:' + pct(th.drive) + '%;background:var(--accent)" title="Driver practice ' + th.drive + ' h"></span></div>';
    // development testing
    let dv = '<b class="info">Development testing · ' + th.dev + ' h</b><div class="xs muted">Test upgrades on the field: projects finish faster (up to +' + Math.round(D.TEST_GAIN * D.TEST_PER_PROJ * 100) + '% a ' + unit + ') and come out better (bigger gains, more reliable). Each project can use up to ' + cap + ' h a ' + unit + ', and only about ' + Math.round(D.TEST_SHARE * 100) + '% of the build hours it gets, so bigger programs can use more. ' + U.money(D.TEST_COST) + ' per hour in parts.</div>';
    if (th.dev) {
      if (!devN) dv += '<div class="xs warn mt">No projects to test: these hours will go unused.</div>';
      else dv += '<div class="xs mt">' + devN + ' project' + (devN > 1 ? 's' : '') + ' can use ' + devUse + ' h · about ' + U.money(devUse * D.TEST_COST) + '</div>' + (devUse < th.dev ? '<div class="xs warn">' + (th.dev - devUse) + ' h can\'t be used: your projects aren\'t getting enough build hours to test that much. Shift time to driving or run more projects.</div>' : '');
    }
    // driver practice
    let dr = '<b class="acc">Driver practice · ' + th.drive + ' h</b><div class="xs muted">Builds drive-team skills and confidence (faster cycles, cleaner alignment, fewer fouls, surer climbs). Cheap: about ' + D.DRILL_SPARES + ' spare parts per hour and a little battery wear.</div>';
    if (!th.canDrive) dr += '<div class="xs warn mt">No robot to drive yet. All testing time goes to development.</div>';
    else {
      dr += '<div class="statrow wide mt"><span class="n">Practice ' + pw.toFixed(1) + '/' + D.DRILL_CAP + '</span>' + UI.bar(pw, D.DRILL_CAP, 'var(--accent)') + '<span class="v">' + Math.round(conf * 100) + '%</span></div><div class="xs muted">Event-start confidence ' + Math.round(conf * 100) + '% (resets at Kickoff; a typical team sits around 60%).' + (pw >= D.DRILL_CAP - 0.05 ? ' <span class="good">Fully practiced: extra hours now only build skills.</span>' : '') + '</div>';
      if (th.elem < 1) dr += '<div class="xs warn">' + (S.phase === 'off' ? 'Offseason practice uses last season\'s game: 60% effective.' : 'No game elements this season: driver practice is only 50% effective (Workshop).') + '</div>';
      if (th.drive && S.parts.spares <= 0) dr += '<div class="xs bad">Out of spare parts: practice will wear the ' + (S.robot.practiceBot ? 'practice robot' : 'competition robot') + '.</div>';
    }
    o += '<div class="grid g2 mt">' + '<div>' + dv + '</div><div>' + dr + '</div></div>';
    const lt = S.lastTest;
    if (lt) o += '<div class="xs dim mt">Last ' + unit + ': ' + lt.devUsed + ' h testing (+' + lt.bonus + ' h of progress)' + (lt.devIdle ? ', ' + lt.devIdle + ' h unused' : '') + ' · ' + lt.drive + ' h driving' + (lt.spares ? ', ' + lt.spares + ' spare' + (lt.spares > 1 ? 's' : '') + ' used' : '') + (lt.wear ? ', robot wore ' + lt.wear + '%' : '') + '.</div>';
    o += '<div class="hint mt">Small teams: driver practice is the cheapest performance you can buy. Once the drive team is fully practiced, extra hours do more as development testing, especially with many projects running.</div>';
    return o;
  };
  UI.A.testSplit = v => { G.Career.setTestSplit(G.S, v); UI.render(); };
  UI.hoursPanel = function (S, compact) {
    const C = G.Career, plan = C.hoursPlan(S), bd = C.turnHours(S, C.isEventTurn(S), true);
    const total = bd.total, act = Math.min(S.actHours, total), used = U.sum(Object.values(plan.give)), idle = plan.idle;
    const unit = S.phase === 'off' ? 'month' : 'week', pct = v => (total > 0 ? 100 * v / total : 0);
    const segs = S.projects.map((p, i) => ({ p, h: plan.give[p.id] || 0, c: PCOL[i % PCOL.length] }));
    const bar = '<div class="hbar">' + segs.filter(s => s.h > 0.5).map(s => '<span style="width:' + pct(s.h) + '%;background:' + s.c + '" title="' + h(s.p.name) + ': ' + Math.round(s.h) + ' h"></span>').join('') +
      (act ? '<span class="act" style="width:' + pct(act) + '%" title="Sponsor obligations: ' + act + ' h"></span>' : '') + (idle > 0.5 ? '<span class="idle" style="width:' + pct(idle) + '%" title="Idle: ' + Math.round(idle) + ' h"></span>' : '') + '</div>';
    let o = '<div class="hnums"><div><div class="hnum">' + total + ' h</div><div class="l">Team hours</div></div><div><div class="hnum good">' + Math.round(used) + ' h</div><div class="l">On projects</div></div>' +
      (act ? '<div><div class="hnum">' + act + ' h</div><div class="l">Sponsor duties</div></div>' : '') + '<div><div class="hnum ' + (idle > 1 ? 'warn' : 'dim') + '">' + Math.round(idle) + ' h</div><div class="l">Idle</div></div></div>' + bar;
    if (compact) return o + (idle > 10 ? '<div class="xs warn mt">' + Math.round(idle) + ' h will go unused this ' + unit + '.</div>' : '');
    o += '<div class="hlegend mt">' + segs.map(s => '<span><i style="background:' + s.c + '"></i>' + h(s.p.name) + ': +' + Math.round(s.h) + ' h</span>').join('') + (act ? '<span><i style="background:#6c7884"></i>Sponsor duties: ' + act + ' h</span>' : '') + (idle > 0.5 ? '<span><i style="background:#2a323b"></i>Idle: ' + Math.round(idle) + ' h</span>' : '') + '</div>';
    o += '<div class="xs muted mt">' + bd.students + ' students × ' + bd.perStudent + ' h + ' + Math.round(bd.ment) + ' mentor h · ' + h(bd.why) + ' · morale ×' + bd.moraleM.toFixed(2) + (bd.boost > 1 ? ' · boost ×' + bd.boost.toFixed(2) : '') +
      '. One project can absorb up to ' + Math.round(G.Robot.capFor(S, { prio: 'normal' })) + ' h per ' + unit + ' (high priority +25%, low −25%). Hours are spent when you press Continue.</div>';
    if (idle > 10) {
      const free = G.Robot.slots(S) - S.projects.length;
      o += '<div class="warnbox mt">' + Math.round(idle) + ' h will go unused this ' + unit + '. ' + (free > 0 ? 'Start another project (' + free + ' free slot' + (free > 1 ? 's' : '') + ').' : 'All slots are busy — each project is at its weekly limit. More Design/Fabrication mentors add slots.') + '</div>';
    }
    return o;
  };
  UI.A.prio = (v, el) => { const p = G.S.projects.find(x => x.id === el.dataset.id); if (p) p.prio = v; };
  UI.A.cancelProj = id => UI.confirm('Cancel project?', 'Progress is lost; you get a partial refund of materials.', 'Cancel project', () => { G.Robot.cancelProject(G.S, id); UI.render(); });
  UI.A.startSimple = type => { if (!UI.err(G.Robot.startProject(G.S, { type }))) { UI.toast('Project started', 'good'); UI.render(); } };
  UI.A.startSimpleSub = arg => { const [type, sub] = arg.split('|'); if (!UI.err(G.Robot.startProject(G.S, { type, sub }))) { UI.toast('Project started', 'good'); UI.render(); } };
  UI.A.startResearch = rid => { if (!UI.err(G.Robot.startProject(G.S, { type: 'research', rid }))) { UI.toast('Research started', 'good'); UI.render(); } };
  UI.st.effort = 'std';
  function effortPicker() {
    return '<div class="row mb"><span class="sm muted">Effort:</span>' + Object.keys(G.Robot.EFFORT).map(k => '<button class="btn sm ' + (UI.st.effort === k ? 'sel' : '') + '" data-act="setEffort" data-arg="' + k + '">' + G.Robot.EFFORT[k].name + '</button>').join('') + '<span class="xs muted">Rush: 60% hours, weaker result, fault risk · Thorough: 140% hours, better result</span></div>';
  }
  UI.A.setEffort = k => { UI.st.effort = k; if (UI.st.modalFn) UI.st.modalFn(); };
  UI.A.conceptModal = function (subId) {
    const S = G.S, year = S.robot.year, sd = G.Seasons.sub(year, subId), cur = S.robot.subs[subId];
    UI.st.modalFn = () => UI.A.conceptModal(subId);
    let o = '<div class="xs muted">DEVELOPMENT DIRECTION</div><h2>' + h(sd.name) + '</h2>' + effortPicker();
    if (cur.ver) o += '<div class="warnbox mb">Switching concept restarts this subsystem at v0 (25% of the old work turns into knowledge XP).</div>';
    o += '<div class="col">' + sd.concepts.map(c => {
      if (c.id === cur.concept && cur.ver) return '';
      if (c.id === 'none') return '<div class="choice"><div class="row"><b>' + h(c.name) + '</b><span class="sp"></span><button class="btn sm" data-act="noneConcept" data-arg="' + subId + '">Choose</button></div><div class="sm muted">' + h(c.desc) + '</div></div>';
      const q = G.Robot.quote(S, { type: 'build', sub: subId, concept: c.id, effort: UI.st.effort });
      const first = G.Robot.firstTime(S, c);
      const ceil = Object.keys(c.ceil).map(k => (D.STAT[k] || k) + ' ' + c.base[k] + '→<b>' + G.Robot.ceil(S, year, subId, c, k) + '</b>').join(' · ');
      const areas = c.areas.map((a, i) => '<span class="tag ' + (G.Robot.know(S, a) > 0 ? 'good' : '') + '">' + h(D.AREA[a].name) + ' Lv' + G.Robot.know(S, a) + (i === 0 ? ' ★' : '') + '</span>').join(' ');
      return '<div class="choice"><div class="row"><b>' + h(c.name) + '</b>' + UI.tag('complexity ' + c.cx) + (first ? UI.tag('first time!', 'warn') : '') + '<span class="sp"></span><span class="sm muted">' + q.hours + ' h · ' + U.money(q.cost) + ' · ' + c.w + ' lb</span><button class="btn sm primary" data-act="buildConcept" data-arg="' + subId + '|' + c.id + '" ' + (q.err ? 'disabled' : '') + '>Build</button></div>' +
        '<div class="sm muted">' + h(c.desc) + '</div><div class="sm mt">' + ceil + '</div><div class="row wrap gap4 mt">' + areas + '</div>' + (q.err ? '<div class="sm bad mt">' + h(q.err) + '</div>' : '') + '</div>';
    }).join('') + '</div>';
    UI.modal(o, { wide: true });
  };
  UI.A.noneConcept = function (subId) {
    const S = G.S, s = S.robot.subs[subId];
    Object.assign(s, { concept: 'none', ver: 0, stats: {}, rel: 0, w: 0, hidden: 0 });
    UI.closeModal(); UI.toast('No mechanism for this subsystem.'); UI.render();
  };
  UI.A.buildConcept = function (arg) {
    const [sub, concept] = arg.split('|');
    if (!UI.err(G.Robot.startProject(G.S, { type: 'build', sub, concept, effort: UI.st.effort }))) { UI.closeModal(); UI.toast('Build project started', 'good'); UI.render(); }
  };
  UI.A.upgradeModal = function (subId) {
    const S = G.S, year = S.robot.year, sd = G.Seasons.sub(year, subId), s = S.robot.subs[subId], c = G.Seasons.concept(year, subId, s.concept);
    UI.st.modalFn = () => UI.A.upgradeModal(subId);
    let o = '<div class="xs muted">UPGRADE</div><h2>' + h(sd.name) + ' — ' + h(c.name) + ' v' + s.ver + '</h2>' + effortPicker() + '<p class="sm muted">Pick a focus. The focus stat closes ~25% of its gap to the ceiling; other stats improve a little.</p><div class="col">';
    Object.keys(c.ceil).forEach(k => {
      const q = G.Robot.quote(S, { type: 'upgrade', sub: subId, focus: k, effort: UI.st.effort });
      const cl = G.Robot.ceil(S, year, subId, c, k);
      o += '<div class="choice"><div class="row"><b>' + h(D.STAT[k] || k) + '</b><span class="sm muted">' + (s.stats[k] || 0) + ' / ceiling ' + cl + '</span><span class="sp"></span><span class="sm muted">' + q.hours + ' h · ' + U.money(q.cost) + '</span><button class="btn sm primary" data-act="startUpgrade" data-arg="' + subId + '|' + k + '" ' + (q.err ? 'disabled' : '') + '>Start</button></div>' + UI.bar(s.stats[k] || 0, 100, null, cl) + (q.err ? '<div class="sm bad">' + h(q.err) + '</div>' : '') + '</div>';
    });
    o += '</div>';
    UI.modal(o, { wide: true });
  };
  UI.A.startUpgrade = function (arg) {
    const [sub, focus] = arg.split('|');
    const S = G.S;
    if (!UI.err(G.Robot.startProject(S, { type: 'upgrade', sub, focus, effort: UI.st.effort, forConcept: S.robot.subs[sub].concept }))) { UI.closeModal(); UI.toast('Upgrade started', 'good'); UI.render(); }
  };

  // =====================================================================
  // KNOWLEDGE
  // =====================================================================
  UI.S.know = { html() {
    const S = G.S, rel = S.year && S.phase !== 'off' ? G.Seasons[S.year].relevance : null;
    let o = '<h1>Tech Knowledge</h1><div class="sub">What your program knows how to build. It carries over between seasons — a turret built for one shooting game makes the next one easier.</div>';
    o += '<div class="hint mb">Each level: +3 to stat ceilings, −6% build hours, +4 starting reliability, +5% upgrade quality for concepts that use the area. Level 0 on a complex concept means a first-time penalty. Areas not used during a season lose 20% XP (students graduate) unless a mentor specializes in it' + (S.equip.kb ? ' — your Knowledge Base halves this' : '') + '.</div>';
    o += '<table class="t"><tr><th>Area</th><th>Level</th><th style="width:30%">Progress</th>' + (rel ? '<th>' + S.year + ' relevance</th>' : '') + '<th>Mentor</th><th>Used this season</th></tr>';
    D.AREAS.forEach(a => {
      const xp = S.know[a.id] || 0, l = D.knowLevel(xp), nxt = D.KNOW_THRESH[Math.min(5, l + 1)], prev = D.KNOW_THRESH[l];
      const ment = S.mentors.find(m => m.spec === a.id);
      o += '<tr><td><b>' + h(a.name) + '</b><div class="xs muted">' + h(a.desc) + '</div></td><td class="lg b">' + l + '</td><td>' + (l >= 5 ? UI.bar(1, 1, 'var(--good)') : UI.bar(xp - prev, nxt - prev)) + '<span class="xs muted">' + xp + ' XP' + (l < 5 ? ' / ' + nxt : '') + '</span></td>' +
        (rel ? '<td class="acc">' + ('★'.repeat(rel[a.id] || 0) || '<span class="dim">—</span>') + '</td>' : '') + '<td class="sm">' + (ment ? h(ment.name) : '<span class="dim">—</span>') + '</td><td>' + (S.usedAreas[a.id] ? UI.tag('yes', 'good') : '<span class="dim">no</span>') + '</td></tr>';
    });
    return o + '</table>';
  } };

  // =====================================================================
  // TEAM
  // =====================================================================
  UI.S.team = { html() {
    const S = G.S, dt = G.Career.driveTeam(S);
    let o = '<h1>Team</h1><div class="sub">' + S.studentsCount + ' students · morale ' + Math.round(S.morale) + ' · ' + S.feeders + ' feeder program(s)</div>';
    const opts = (sel, inclMentor) => (inclMentor ? '<option value="mentor" ' + (sel === 'mentor' ? 'selected' : '') + '>Drive Coach mentor</option>' : '') + S.students.map(s => '<option value="' + s.id + '" ' + (sel === s.id ? 'selected' : '') + '>' + h(s.name) + ' (gr ' + s.grade + ')</option>').join('');
    o += '<div class="grid g2">' + UI.card('Drive team', '<div class="grid g2">' +
      '<label class="f">Driver<select class="inp" data-chg="dt" data-k="driver">' + opts(S.driveTeam.driver) + '</select></label>' +
      '<label class="f">Operator<select class="inp" data-chg="dt" data-k="operator">' + opts(S.driveTeam.operator) + '</select></label>' +
      '<label class="f">Human player<select class="inp" data-chg="dt" data-k="hp">' + opts(S.driveTeam.hp) + '</select></label>' +
      '<label class="f">Coach<select class="inp" data-chg="dt" data-k="coach">' + opts(S.driveTeam.coach, true) + '</select></label></div>' +
      '<p class="sm muted mt">Driver uses Driving/Awareness/Composure, Operator uses Mechanism/Composure, Human Player uses HP skill, Coach uses Strategy. Coach Calls per match: ' + G.Career.coachCalls(S, false) + ' (playoffs +1).</p><button class="btn sm" data-act="autoDT">Auto-pick best</button>');
    // activities
    const lim = G.Career.actLimits(S), C = G.Career, ir = C.impactRating(S);
    o += UI.card('Outreach & fundraising ' + UI.tag(lim.used + '/' + lim.max + ' this ' + lim.unit, lim.used >= lim.max ? 'warn' : ''), '<div class="sm muted mb">Up to ' + lim.max + ' activities per ' + lim.unit + ', each type ' + (lim.perType > 1 ? 'up to ' + lim.perType + ' times' : 'once') + '. Repeating a fundraiser in the same program year (June–May) pays less. Outreach this season: <b>' + Math.round(S.season.impact) + '</b> points from ' + S.season.outreach + ' events.</div><div class="col">' +
      D.ACTIVITIES.map(a => {
        const n = lim.counts[a.id] || 0, blocked = n >= lim.perType || lim.used >= lim.max;
        const why = n >= lim.perType ? 'Done' + (lim.perType > 1 ? ' ' + n + '×' : '') : lim.used >= lim.max ? 'Limit reached' : 'Do it' + (lim.perType > 1 && n ? ' (' + n + '/' + lim.perType + ')' : '');
        return '<div class="row"><div class="sp"><b>' + h(a.name) + '</b> <span class="xs muted">' + h(a.desc) + '</span></div><span class="xs muted">' + (a.kind === 'outreach' ? '+' + a.impact + ' outreach · ' : C.fundFatigue(S, a.id) < 1 ? '<span class="warn">pays ×' + C.fundFatigue(S, a.id).toFixed(2) + '</span> · ' : '') + (a.cost ? U.money(a.cost) : 'free') + '</span><button class="btn sm" data-act="doAct" data-arg="' + a.id + '" ' + (blocked ? 'disabled' : '') + '>' + why + '</button></div>';
      }).join('') +
      '<div class="hr"></div><div class="row"><div class="sp"><b>Feeder programs</b> <span class="xs muted">$1,000/yr each (paid in September): +recruits, better recruits, +Impact</span></div><button class="btn sm" data-act="feeder" data-arg="-1">−</button><b>' + S.feeders + '</b><button class="btn sm" data-act="feeder" data-arg="1">+</button></div></div>') +
      UI.card('Impact Award ' + UI.tag(Math.round(ir.score) + '/100', ir.score >= 80 ? 'good' : ir.score >= 65 ? 'acc' : ''),
        '<div class="sm muted mb">Judges reward sustained, multi-season impact: a one-season push rarely beats long-running Impact programs, and a team can win it once per season. ' +
        (ir.submitted ? '<span class="good">Submission done.</span>' : '<span class="warn">No submission yet: start "Impact Award submission" in the Design Office or you can\'t win it.</span>') + '</div>' +
        Object.keys(C.IMPACT_W).map(k => '<div class="statrow wide"><span class="n">' + h(C.IMPACT_LABEL[k]) + ' <span class="dim">' + Math.round(C.IMPACT_W[k] * 100) + '%</span></span>' + UI.bar(ir.parts[k], 100, UI.colorFor(ir.parts[k])) + '<span class="v">' + Math.round(ir.parts[k]) + '</span></div>').join('') +
        '<div class="xs muted mt">Outreach has diminishing returns. Track record averages your last three seasons. Presentation comes from your Business mentor and your best communicators (Strategy + Awareness). Typical regional winners rate 80+. Per-event odds are on HQ.</div>') + '</div>';
    // roster
    o += '<h2 class="mt">Core students</h2><table class="t"><tr><th>Name</th><th>Grade</th><th class="num">Drive</th><th class="num">Aware</th><th class="num">Comp</th><th class="num">Mech</th><th class="num">HP</th><th class="num">Strat</th><th>Potential</th><th class="num">Matches</th><th>Role</th></tr>' +
      S.students.slice().sort((a, b) => b.grade - a.grade).map(s => {
        const role = s.id === S.driveTeam.driver ? 'Driver' : s.id === S.driveTeam.operator ? 'Operator' : s.id === S.driveTeam.hp ? 'Human Player' : s.id === S.driveTeam.coach ? 'Coach' : '';
        const a = s.attr, f = v => '<td class="num" style="color:' + UI.colorFor(v) + '">' + Math.round(v) + '</td>';
        return '<tr><td>' + h(s.name) + '</td><td>' + s.grade + '</td>' + f(a.drive) + f(a.aware) + f(a.comp) + f(a.mech) + f(a.hp) + f(a.strat) + '<td class="acc">' + '★'.repeat(Math.max(1, Math.round(s.pot / 20))) + '</td><td class="num">' + s.matches + '</td><td>' + (role ? UI.tag(role, 'acc') : '') + '</td></tr>';
      }).join('') + '</table><p class="sm muted">Seniors (grade 12) graduate in June. New students join in September — more with good reputation, outreach and feeder programs.</p>';
    return o;
  } };
  UI.A.dt = (v, el) => { G.S.driveTeam[el.dataset.k] = v; UI.render(); };
  UI.A.autoDT = () => { G.Career.autoDriveTeam(G.S); UI.render(); };
  UI.A.doAct = id => { const r = G.Career.doActivity(G.S, id); if (typeof r === 'string') return UI.err(r); UI.toast(r.msg, 'good'); UI.render(); };
  UI.A.feeder = d => { G.Career.setFeeders(G.S, G.S.feeders + Number(d)); UI.render(); };

  // =====================================================================
  // MENTORS
  // =====================================================================
  function mentorRow(m, act) {
    const role = D.MENTOR_ROLES.find(r => r.id === m.role);
    return '<tr><td><b>' + h(m.name) + '</b></td><td>' + h(role.name) + '</td><td class="acc">' + U.stars(m.stars) + '</td><td class="num">' + m.skill + '</td><td>' + (m.spec ? h(D.AREA[m.spec].name) : '<span class="dim">—</span>') + '</td><td class="num">' + m.hours + ' h/wk</td><td class="num">' + (m.cost ? U.money(m.cost) : 'volunteer') + '</td><td class="num">' + m.contract + '</td><td>' + act + '</td></tr>';
  }
  UI.S.mentors = { html() {
    const S = G.S;
    const hd = '<tr><th>Name</th><th>Role</th><th>Rating</th><th class="num">Skill</th><th>Specialty</th><th class="num">Hours</th><th class="num">Cost/season</th><th class="num">Seasons</th><th></th></tr>';
    let o = '<h1>Mentors</h1><div class="sub">' + S.mentors.length + '/8 mentors. Costs cover recruiting, travel and training; charged at hire and each Kickoff.</div>';
    o += '<div class="grid g3 mb">' + D.MENTOR_ROLES.map(r => '<div class="card flat"><b>' + h(r.name) + '</b><div class="xs muted">' + h(r.desc) + '</div></div>').join('') + '</div>';
    o += UI.card('Your mentors', S.mentors.length ? '<table class="t">' + hd + S.mentors.map(m => mentorRow(m, '<button class="btn sm bad" data-act="releaseM" data-arg="' + m.id + '">Release</button>')).join('') + '</table>' : '<p class="muted">No mentors.</p>');
    if (S.guests && S.guests.length) o += '<div class="mt">' + UI.card('Guest mentors ' + UI.tag('temporary · extra slots', 'good'), '<table class="t">' + hd + S.guests.map(g => mentorRow(Object.assign({}, g.m, { contract: '—' }), UI.tag(g.turns + (S.phase === 'off' ? ' mo' : ' wk') + ' left · ' + g.m.guest, 'info'))).join('') + '</table>') + '</div>';
    o += '<div class="mt">' + UI.card('Mentor market', S.market.length ? '<table class="t">' + hd + S.market.map(m => mentorRow(m, '<button class="btn sm primary" data-act="hireM" data-arg="' + m.id + '">Hire</button>')).join('') + '</table>' : '<p class="muted">No candidates right now. The market refreshes in August.</p>', '<span class="xs muted">Refreshes each August</span>') + '</div>';
    return o;
  } };
  UI.A.hireM = id => { if (!UI.err(G.Career.hireMentor(G.S, id))) UI.render(); };
  UI.A.releaseM = id => UI.confirm('Release mentor?', 'Morale −5. No refund.', 'Release', () => { G.Career.releaseMentor(G.S, id); UI.render(); });

  // =====================================================================
  // WORKSHOP
  // =====================================================================
  UI.S.workshop = { html() {
    const S = G.S;
    let o = '<h1>Workshop</h1><div class="sub">Facilities make every project faster and better. Parts carry over between seasons.</div>';
    o += '<div class="hint mb">Facilities wear down with use. Lower condition means lower efficiency, down to 40% at 0% condition. <b>Renovate</b> restores condition for a fraction of the price. <b>Upgrade</b> adds a level and also restores condition. Upkeep is charged per level at each Kickoff.</div>';
    o += '<div class="card mb"><div class="ct">Facilities<span class="sp"></span>' + UI.tag('+' + G.Shop.facilitySlots(S) + ' project slots', G.Shop.facilitySlots(S) ? 'acc' : '') + ' ' + UI.tag('Upkeep ' + U.money(G.Shop.upkeep(S)) + '/season') + '</div><div class="grid g2">' + D.EQUIP.map(e => facilityBox(S, e)).join('') + '</div></div>';
    o += '<div class="grid g2">';
    const fieldOwned = (S.equip.field === S.year && S.phase !== 'off') || S.equip.field === 'pending';
    o += UI.card('Game elements', '<div class="row"><div class="sp"><b>' + h(D.FIELD.name) + (S.year && S.phase !== 'off' ? ' (' + S.year + ')' : ' (next season)') + '</b><div class="xs muted">' + h(D.FIELD.desc) + '</div></div>' +
      (fieldOwned ? UI.tag('owned', 'good') : '<button class="btn sm" data-act="buyEq" data-arg="field">Buy · ' + U.money(D.FIELD.cost) + '</button>') + '</div>');
    o += UI.card('Parts store', '<div class="col">' + D.PARTS.map(p => {
      const cur = S.parts[p.id] || 0;
      return '<div><b>' + h(p.name) + '</b> <span class="xs muted">— owned: ' + h(p.tiers[cur].name) + '</span><div class="row wrap gap4 mt">' + p.tiers.map((t, i) => i === 0 ? '' : '<button class="btn sm ' + (i <= cur ? 'sel' : '') + '" data-act="buyPart" data-arg="' + p.id + '|' + i + '" ' + (i <= cur ? 'disabled' : '') + ' title="' + h(t.desc) + '">' + h(t.name) + ' ' + U.money(t.cost) + '</button>').join('') + '</div><div class="xs muted">' + h(p.tiers[Math.min(p.tiers.length - 1, cur + 1)].desc) + '</div></div>';
    }).join('') + '<div class="hr"></div>' + UI.batteryRow(S) +
      (function () {
        const up = G.Career.spareUnitPrice(S, false);
        return '<div class="row"><div class="sp"><b>Spare parts</b> <span class="xs muted">' + S.parts.spares + ' units — used by repairs at home and in the pits, and by driver practice · ' + U.money(up) + ' each here, ' + U.money(G.Career.spareUnitPrice(S, true)) + ' each at events</span></div>' +
          '<button class="btn sm" data-act="buySpares" data-arg="5">+5 · ' + U.money(5 * up) + '</button><button class="btn sm" data-act="buySpares" data-arg="10">+10 · ' + U.money(10 * up) + '</button></div>';
      })() + '</div>');
    return o + '</div>';
  } };
  function facilityBox(S, e) {
    const Sh = G.Shop, l = Sh.lvl(S, e.id), max = e.levels.length;
    const up = Sh.upgradeCost(S, e.id), reno = Sh.renoCost(S, e.id);
    let o = '<div class="card flat"><div class="row"><b>' + h(e.name) + '</b>' + UI.tag('Lv ' + l + '/' + max, l ? 'acc' : '') + '<span class="sp"></span>' + (l ? '<span class="xs muted">' + h(e.levels[l - 1].name) + '</span>' : '<span class="xs dim">not owned</span>') + '</div>';
    o += '<div class="xs muted mb">' + h(e.desc) + '</div>';
    if (l) {
      const c = Sh.cond(S, e.id), eff = Sh.eff(S, e.id);
      o += '<div class="statrow"><span class="n">Condition</span>' + UI.bar(c, 100, UI.colorFor(c)) + '<span class="v">' + Math.round(c) + '%</span></div>' +
        '<div class="sm">Now (' + Math.round(eff * 100) + '% efficiency): <span class="good">' + h(Sh.effectText(S, e.id)) + '</span></div>' +
        (eff < 0.99 ? '<div class="xs muted">At full condition: ' + h(Sh.effectText(S, e.id, l, 1)) + '</div>' : '') +
        (Sh.fx(S, e.id, 'slot', l, 1) && !Sh.slotOf(S, e.id) ? '<div class="xs bad">Below ' + Sh.SLOT_COND + '% condition: its project slot is out of action until you renovate.</div>' : '');
    }
    if (up != null) o += '<div class="xs muted mt">' + (l ? 'Level ' + (l + 1) + ' — ' + h(e.levels[l].name) : 'Level 1 — ' + h(e.levels[0].name)) + ': ' + h(Sh.effectText(S, e.id, l + 1, 1)) + '</div>';
    o += '<div class="row wrap gap4 mt">';
    if (l) o += '<button class="btn sm" data-act="renoEq" data-arg="' + e.id + '" ' + (reno ? '' : 'disabled') + '>' + (reno ? 'Renovate · ' + U.money(reno) : 'Like new') + '</button>';
    if (up != null) o += '<button class="btn sm ' + (l ? '' : 'primary') + '" data-act="buyEq" data-arg="' + e.id + '">' + (l ? 'Upgrade to Lv ' + (l + 1) : 'Buy') + ' · ' + U.money(up) + '</button>';
    else o += UI.tag('top level', 'good');
    o += '</div><div class="xs dim mt">Upkeep ' + U.money(e.upkeep) + '/season per level · wears ' + [e.wear.season ? e.wear.season + '%/build week' : '', e.wear.off ? e.wear.off + '%/offseason month' : '', e.wear.event ? e.wear.event + '%/event' : ''].filter(Boolean).join(', ') + '</div></div>';
    return o;
  }
  UI.A.buyEq = id => { if (!UI.err(G.Career.buyEquip(G.S, id))) { UI.toast(id === 'field' ? 'Purchased' : 'Done — ' + G.Shop.item(id).levels[G.Shop.lvl(G.S, id) - 1].name + ' ready', 'good'); UI.render(); } };
  UI.A.renoEq = id => { const cost = G.Shop.renoCost(G.S, id); if (!UI.err(G.Shop.renovate(G.S, id))) { UI.toast('Renovated for ' + U.money(cost) + ' — back to 100%', 'good'); UI.render(); } };
  UI.A.buyPart = arg => { const [id, t] = arg.split('|'); if (!UI.err(G.Career.buyPart(G.S, id, Number(t)))) { UI.toast('Purchased', 'good'); UI.render(); } };
  UI.A.buyBatt = n => { const before = G.Shop.fleetHealth(G.S); if (!UI.err(G.Career.buyBatteries(G.S, Number(n)))) { UI.toast('Fleet health ' + Math.round(before * 100) + '% → ' + Math.round(G.Shop.fleetHealth(G.S) * 100) + '%', 'good'); UI.render(); } };
  UI.batteryRow = function (S) {
    const Sh = G.Shop, lim = Sh.battLimit(S), fl = S.parts.batts, room = Sh.battRoom(S), free = lim - fl.length;
    const unit = D.BATTERY_COST * (G.Career.hasPerk(S, 'partsDiscount') ? 0.85 : 1);
    const cells = fl.slice().sort((a, b) => b.h - a.h).map(b => '<span class="batt" title="' + Math.round(b.h * 100) + '% health"><i style="height:' + Math.max(2, Math.round(b.h * 22)) + 'px;background:' + UI.colorFor(b.h * 100) + '"></i></span>').join('') +
      Array.from({ length: Math.max(0, free) }, () => '<span class="batt" style="opacity:.25" title="empty slot"></span>').join('');
    const btn = n => { const k = Math.min(n, room); if (k <= 0) return ''; const fill = Math.min(k, Math.max(0, free)); const rep = k - fill; return '<button class="btn sm" data-act="buyBatt" data-arg="' + k + '">' + (fill ? '+' + fill + ' new' : '') + (fill && rep ? ', ' : '') + (rep ? 'replace ' + rep + ' worn' : '') + ' · ' + U.money(k * unit) + '</button>'; };
    return '<div><div class="row wrap"><div class="sp"><b>Batteries</b> <span class="xs muted">' + fl.length + '/' + lim + ' slots · fleet health ' + Math.round(Sh.fleetHealth(S) * 100) + '%</span></div>' + (room > 0 ? btn(2) + btn(4) : UI.tag('all healthy', 'good')) + '</div>' +
      '<div class="mt">' + cells + '</div><div class="xs muted mt">Only the battery used in a match wears (about 1% per match), and batteries age slowly on the shelf. New batteries fill empty slots first, then automatically replace your most worn ones. ' + (lim < 20 ? 'The smart charging station (Battery Station level 2) holds 20.' : '') + '</div></div>';
  };
  UI.A.buySpares = n => { if (!UI.err(G.Career.buySpares(G.S, Number(n)))) UI.render(); };

  // =====================================================================
  // FINANCE
  // =====================================================================
  function goalsTxt(sp) { return sp.goals.map(g => '<div class="xs">' + (g.met ? '✔ ' : '• ') + h(D.GOALS[g.id].text) + ' <span class="good">+' + U.money(g.bonus) + '</span></div>').join(''); }
  UI.S.finance = { html() {
    const S = G.S, C = G.Career;
    let o = '<h1>Finance</h1><div class="sub">Budget ' + U.money(S.money) + ' · sponsors pay at Kickoff each season · bonuses when goals are met.</div><div class="grid g2">';
    o += UI.card('Sponsors (' + S.sponsors.filter(s => s.slot === 'partner').length + '/' + C.partnerSlots(S) + ' partner slots)', S.sponsors.length ? S.sponsors.map(sp =>
      '<div class="card flat mb"><div class="row"><b>' + h(sp.name) + '</b>' + UI.tag(sp.slot === 'title' ? 'TITLE' : sp.slot === 'grant' ? 'GRANT' : 'Partner', sp.slot === 'title' ? 'acc' : '') + '<span class="sp"></span><b>' + U.money(sp.base) + '</b><span class="xs muted">/season · ' + sp.seasonsLeft + ' left</span></div>' +
      '<div class="xs muted">' + h(sp.typeName) + ' · expectations ' + sp.exp + (sp.perk ? ' · Perk: <span class="info">' + h(D.PERKS[sp.perk].name) + '</span>' : '') + '</div>' + goalsTxt(sp) +
      '<div class="row mt"><span class="xs muted">Satisfaction</span><div class="sp">' + UI.bar(sp.sat, 100, UI.colorFor(sp.sat)) + '</div><span class="xs">' + Math.round(sp.sat) + '</span></div></div>').join('') : '<p class="muted">No sponsors. Offers arrive in October.</p>');
    // offers
    o += UI.card('Sponsor offers', S.offers.length ? S.offers.map(of =>
      '<div class="card flat mb"><div class="row"><b>' + h(of.name) + '</b>' + UI.tag(of.slot === 'title' ? 'TITLE' : of.slot === 'grant' ? 'GRANT' : 'Partner', of.slot === 'title' ? 'acc' : '') + '<span class="sp"></span><b>' + U.money(of.base) + '</b><span class="xs muted">/season × ' + of.length + '</span></div>' +
      '<div class="xs muted">' + h(of.typeName) + ' · expectations ' + of.exp + (of.perk ? ' · Perk: <span class="info">' + h(D.PERKS[of.perk].name) + '</span>' : '') + '</div>' + goalsTxt(of) +
      (of.obligations.length ? '<div class="xs warn">Obligations: ' + of.obligations.map(h).join('; ') + '</div>' : '') +
      '<div class="row mt"><span class="sp"></span><button class="btn sm primary" data-act="signSp" data-arg="' + of.id + '">Sign</button></div></div>').join('') : '<p class="muted">No open offers. New offers arrive each October.</p>');
    o += '</div>';
    // activities
    const acts = S.activities.filter(a => a.year === S.year);
    if (acts.length) o += '<div class="mt">' + UI.card('Sponsor activities ' + S.year, '<table class="t"><tr><th>Week</th><th>Activity</th><th>Status</th></tr>' + acts.map(a => '<tr><td>Build wk ' + a.week + '</td><td>' + h(a.text) + '</td><td>' + UI.tag(a.status, a.status === 'done' ? 'good' : a.status === 'skipped' ? 'bad' : 'warn') + '</td></tr>').join('') + '</table>') + '</div>';
    // ledger
    o += '<div class="mt">' + UI.card('Ledger', '<table class="t"><tr><th>Date</th><th>Item</th><th class="num">Amount</th></tr>' + S.ledger.slice(0, 40).map(l => '<tr><td class="xs muted">' + h(l.d) + '</td><td>' + h(l.desc) + '</td><td class="num ' + (l.amt < 0 ? 'bad' : 'good') + '">' + U.money(l.amt) + '</td></tr>').join('') + '</table>') + '</div>';
    return o;
  } };
  UI.A.signSp = id => { if (!UI.err(G.Career.signSponsor(G.S, id))) { UI.toast('Sponsor signed', 'good'); UI.render(); } };

  // =====================================================================
  // CALENDAR
  // =====================================================================
  UI.S.calendar = { html() {
    const S = G.S, C = G.Career;
    const nextYear = S.phase === 'off' ? (S.orderMode === 'random' && S.mode === 'career' ? 'next season (game revealed at Kickoff)' : (S.order[S.upcoming] || '')) : S.year;
    let o = '<h1>Calendar</h1><div class="sub">Regionals for ' + h(String(nextYear)) + ' · registered ' + S.registered.length + '/' + S.maxEvents + ' · next fee ' + U.money(C.regFee(S)) + (C.isLate(S) ? ' + ' + U.money(D.FEES.late) + ' late fee' : '') + '</div>';
    o += '<div class="hint mb">Each regional week costs registration + travel and uses most of that week\'s build hours. Early weeks: weaker opponents but a less developed robot. Win a regional, an Impact/EI award, or enough Regional Pool points (best two events, cut-off ' + C.poolThreshold(S) + ') to qualify for the Championship.</div>';
    for (let w = 1; w <= 6; w++) {
      const list = S.regionals.filter(r => r.week === w);
      o += '<div class="card mb"><div class="ct">Week ' + w + (S.phase === 'comp' && S.week === w ? ' ' + UI.tag('this week', 'acc') : '') + '</div><table class="t"><tr><th>Regional</th><th>Region</th><th>Travel</th><th class="num">Teams</th><th>Strength</th><th></th></tr>' +
        list.map(r => {
          const tier = D.travelTier(S.team.region, r.region, r.local), reg = S.registered.includes(r.id), why = C.canRegister(S, r);
          return '<tr class="' + (reg ? 'me' : '') + '"><td><b>' + h(r.name) + '</b></td><td>' + h(r.region) + '</td><td>' + h(D.TRAVEL[tier].name) + ' ' + U.money(C.travelCost(S, Object.assign({ kind: 'regional' }, r))) + '</td><td class="num">' + r.size + '</td><td class="acc">' + '★'.repeat(r.str) + '</td><td>' +
            (reg ? (S.eventsDone[r.id] ? UI.tag('done', 'good') : '<button class="btn sm bad" data-act="withdraw" data-arg="' + r.id + '">Withdraw</button>') : why ? '<span class="xs muted">' + h(why) + '</span>' : '<button class="btn sm primary" data-act="register" data-arg="' + r.id + '">Register</button>') + '</td></tr>';
        }).join('') + '</table></div>';
    }
    // scrimmage & offseason
    const canScrim = (S.phase === 'kickoff' || (S.phase === 'build' && S.week < 7) || S.phase === 'off');
    o += UI.card('Week 0 scrimmage', '<div class="row"><div class="sp sm muted">Cheap practice event before Week 1: real matches, no rankings at stake. Boosts tuning and driver confidence for your first regional. ' + U.money(D.FEES.scrimmage) + ' + local travel.</div>' + (S.scrimmage ? UI.tag('registered', 'good') : '<button class="btn sm" data-act="regScrim" ' + (canScrim ? '' : 'disabled') + '>Register</button>') + '</div>');
    if (S.phase === 'off') {
      o += '<div class="mt">' + UI.card('Offseason events', S.robot ? '<table class="t"><tr><th>Month</th><th>Event</th><th class="num">Teams</th><th class="num">Fee</th><th></th></tr>' + D.OFFSEASON_EVENTS.map(e => '<tr><td>' + e.month + '</td><td>' + h(e.name) + '</td><td class="num">' + e.size + '</td><td class="num">' + U.money(e.fee) + '</td><td>' + (S.offReg.includes(e.id) ? UI.tag(S.eventsDone[e.id + S.year] ? 'done' : 'registered', 'good') : D.MONTHS.indexOf(e.month) < S.month ? '<span class="xs muted">past</span>' : '<button class="btn sm" data-act="regOff" data-arg="' + e.id + '">Register</button>') + '</td></tr>').join('') + '</table><p class="xs muted">Played with last season\'s robot and game. Double XP for students, reputation and sponsor goodwill.</p>' : '<p class="muted">You need a robot from a completed season to attend offseason events.</p>') + '</div>';
    }
    if (S.phase !== 'off' && S.season.events.length) o += '<div class="mt">' + UI.card('Regional Pool', '<div>Pool total (best two events): <b>' + C.poolTotal(S) + '</b> / cut-off ' + C.poolThreshold(S) + '</div>' + (S.season.champsQualified ? '<div class="good mt">Qualified: ' + h(S.season.champsReason) + '</div>' : '')) + '</div>';
    return o;
  } };
  UI.A.register = id => { if (!UI.err(G.Career.register(G.S, id))) { UI.toast('Registered', 'good'); UI.render(); } };
  UI.A.withdraw = id => UI.confirm('Withdraw?', 'You get 50% of the fee back.', 'Withdraw', () => { G.Career.withdraw(G.S, id); UI.render(); });
  UI.A.regScrim = () => { const S = G.S; if (S.money < D.FEES.scrimmage) return UI.err('Not enough money'); G.Career.spend(S, D.FEES.scrimmage, 'Week 0 scrimmage'); S.scrimmage = true; UI.render(); };
  UI.A.regOff = id => { if (!UI.err(G.Career.registerOffseason(G.S, id))) UI.render(); };

  // =====================================================================
  // HISTORY
  // =====================================================================
  UI.S.history = { html() {
    const S = G.S;
    let o = '<h1>History</h1><div class="sub">Legacy points: ' + S.legacy + '</div>';
    const bn = G.Career.banners(S);
    o += UI.card('Banner wall ' + UI.tag(bn.length + ' banner' + (bn.length === 1 ? '' : 's'), bn.length ? 'acc' : ''), bn.length ? UI.bannerWall(bn) : '<p class="muted">No banners yet. Win an event or the Impact Award to hang your first blue banner.</p>', '', 'mb');
    S.history.slice().reverse().forEach(hs => {
      o += UI.card(hs.year + ' ' + h(G.Seasons[hs.year].name) + (hs.worldChamp ? ' ' + UI.tag('WORLD CHAMPIONS', 'acc') : hs.divWin ? ' ' + UI.tag('Division winner', 'acc') : hs.champs ? ' ' + UI.tag('Championship', 'good') : ''),
        '<table class="t"><tr><th>Event</th><th>Rank</th><th>Record</th><th>Playoffs</th><th>Awards</th></tr>' + hs.events.map(e => '<tr><td>' + h(e.name) + '</td><td>' + (e.rank ? e.rank + '/' + e.size : '—') + '</td><td>' + h(e.record) + '</td><td>' + h(e.finish) + '</td><td class="sm">' + h(e.awardNames.join(', ')) + '</td></tr>').join('') + '</table><div class="sm muted mt">Legacy +' + hs.legacy + ' · avg RP ' + hs.avgRP.toFixed(2) + ' · ended with ' + U.money(hs.money) + '</div>', '', 'mb');
    });
    return o;
  } };
})();
