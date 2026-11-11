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
    const same = UI.shown === screen; // an action that reopens the page you are on keeps your place
    UI.stopLive && UI.stopLive(); UI.screen = screen; UI.p = p || {}; UI.render();
    if (!same) { const mn = document.getElementById('main'); if (mn) mn.scrollTop = 0; window.scrollTo(0, 0); }
  };
  UI.render = function () {
    const app = document.getElementById('app');
    const scr = UI.S[UI.screen] || UI.S.menu;
    const was = document.getElementById('main'), keep = UI.shown === UI.screen ? { m: was ? was.scrollTop : 0, w: window.scrollY || 0 } : null;
    UI.jobs = [];
    if (UI.applyTheme) UI.applyTheme(G.S && G.S.team && UI.screen !== 'menu' && UI.screen !== 'newgame' ? G.S.team : UI.screen === 'newgame' && UI.st.ng ? UI.st.ng : null);
    let body;
    try { body = scr.html(); }
    catch (e) { console.error(e); body = '<div class="card"><b>Something went wrong rendering this screen.</b><pre class="sm muted">' + h(e.stack || e) + '</pre><button class="btn" data-act="nav" data-arg="hq">Back to HQ</button></div>'; }
    if (scr.full) app.innerHTML = UI.era(body);
    else app.innerHTML = UI.era(topbar() + '<div class="shell">' + sidebar(scr.nav || UI.screen) + '<div class="main" id="main">' + body + '</div></div>');
    UI.shown = UI.screen;
    if (keep) { const mn = document.getElementById('main'); if (mn && keep.m) mn.scrollTop = keep.m; if (keep.w) window.scrollTo(0, keep.w); }
    UI.jobs.forEach(f => { try { f(); } catch (e) { console.error(e); } });
    if (scr.after) scr.after();
    if (!UI.verChecked && UI.versionCheck) { UI.verChecked = true; setTimeout(UI.versionCheck, 350); } // "Updated to vX" once per new version
  };
  UI.job = f => UI.jobs.push(f);
  // Before 2023 the Impact Award was the Chairman's Award. It is the same award, so the game keeps one set of texts and
  // shows the old name by calendar year (a word joiner inside "Impact" keeps a text as written).
  UI.era = function (html) {
    const S = G.S;
    if (!S || !S.cal || !G.Era || G.Era.cy(S) >= 2023 || !/impact/i.test(html)) return html;
    return html.replace(/\b(an |An )?(FIRST )?Impact( Award)?\b/g, (m, an, first, aw) => (an ? (an === 'An ' ? 'A ' : 'a ') : '') + 'Chairman\'s' + (aw || (first ? ' Award' : '')))
      .replace(/\b(FIRST )?IMPACT( AWARD)?\b/g, (m, first, aw) => 'CHAIRMAN\'S' + (aw || (first ? ' AWARD' : '')));
  };
  UI.modal = function (html, opts) {
    UI.closeModal();
    const bg = document.createElement('div');
    bg.className = 'modal-bg'; bg.id = 'modal';
    bg.innerHTML = '<div class="modal ' + (opts && opts.wide ? 'wide' : '') + (opts && opts.cls ? ' ' + opts.cls : '') + '">' + UI.era(html) + '</div>';
    if (!(opts && opts.lock)) bg.addEventListener('click', e => { if (e.target === bg) UI.closeModal(); });
    document.body.appendChild(bg);
    if (opts && opts.after) opts.after();
  };
  UI.closeModal = function () { const m = document.getElementById('modal'); if (m) m.remove(); };
  UI.toast = function (msg, kind) {
    let box = document.querySelector('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.appendChild(box); }
    const t = document.createElement('div'); t.className = 'toast ' + (kind || ''); t.textContent = UI.era(String(msg));
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
  UI.bar = (v, max, col, mark) => '<div class="bar"><i style="width:' + U.clamp(100 * v / (max || 100), 0, 100) + '%;background:' + (col || 'var(--data)') + '"></i>' + (mark != null ? '<b style="left:' + U.clamp(100 * mark / (max || 100), 0, 100) + '%"></b>' : '') + '</div>';
  UI.stat = (n, v, ceil, col) => '<div class="statrow"><span class="n">' + h(n) + '</span>' + UI.bar(v, 100, col, ceil) + '<span class="v">' + Math.round(v) + '</span></div>';
  UI.card = (title, body, extra, cls) => '<div class="card ' + (cls || '') + '"><div class="ct">' + title + '<span class="sp"></span>' + (extra || '') + '</div>' + body + '</div>';
  UI.tag = (t, k) => '<span class="tag ' + (k || '') + '">' + h(t) + '</span>';
  // Blue banner (simplified FRC style): emblem, award, year, event
  UI.banner = (b, isNew) => '<div class="banner ' + (b.gold ? 'gold ' : '') + (isNew ? 'new' : '') + '"><div class="emb">' + (/Impact/.test(b.award) ? '✦' : b.gold ? '★' : '⚙') + '</div><div class="aw">' + h(b.award) + '</div><div class="yr">' + h(b.year) + '</div><div class="ev">' + h(b.event) + '</div></div>';
  // rows of banners; a long career's wall uses smaller banners (15 or more, and again from 31)
  UI.bannerWall = (list, isNew) => '<div class="banners' + (list.length > 30 ? ' lots' : list.length > 14 ? ' many' : '') + '">' + list.map(b => UI.banner(b, isNew)).join('') + '</div>';
  UI.colorFor = v => v >= 75 ? 'var(--good)' : v >= 50 ? 'var(--data)' : v >= 30 ? 'var(--warn)' : 'var(--bad)';
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
      '<div class="teamchip">' + UI.avatar(t, 34) + '<div><div><b>' + h(String(t.num)) + '</b> ' + h(t.name) + '</div><div class="xs muted">' + (S.si < 0 ? 'Pre-season' : h(G.Career.seasonName(S))) + (S.mode === 'career' ? ' · Season ' + (Math.max(0, S.si) + 1) + '/' + S.order.length : ' · Single Season') + '</div></div></div>' +
      '<div class="sp"></div><div class="datelbl">' + h(G.Career.dateLabel(S)) + '</div><div class="sp"></div>' +
      kpi(U.money(S.money), 'Budget', S.money < 0 ? 'bad' : '') + kpi(Math.round(S.morale), 'Morale', S.morale < 40 ? 'bad' : '') + kpi(Math.round(S.support), 'Support', S.support < 30 ? 'bad' : '') + kpi(Math.round(S.rep), 'Reputation') +
      (G.Career.inSeason(S) ? '<div class="kpi" title="Team fatigue ' + Math.round(S.fatigue) + ' (' + G.Career.fatigueLabel(S.fatigue) + ')"><span class="v">' + UI.fatigueBar(S.fatigue) + '</span><span class="l">Fatigue ' + Math.round(S.fatigue) + '</span></div>' : '') +
      '<button class="btn ghost" data-act="menuModal">☰</button>' +
      (S.event ? '<span class="tag acc">Event in progress</span>' : '<button class="btn primary" data-act="continue">' + contLbl + '</button>') + '</div>';
  }
  // Fatigue as a bar (0–100) with a tick at the normal level
  UI.fatigueBar = function (f, wide) {
    const col = f > 60 ? 'var(--bad)' : f > 40 ? 'var(--warn)' : f < 22 ? 'var(--good)' : 'var(--info)';
    return '<span class="fbar' + (wide ? ' wide' : '') + '"><i style="width:' + U.clamp(Math.round(f), 0, 100) + '%;background:' + col + '"></i><em style="left:' + D.FATIGUE_BASE + '%"></em></span>';
  };
  function kpi(v, l, cls) { return '<div class="kpi"><span class="v ' + (cls || '') + '">' + h(v) + '</span><span class="l">' + l + '</span></div>'; }
  // Inbox items that wait for you: messages with a reply still open, a shop incident, sponsor activities due
  UI.actionable = S => S.inbox.filter(m => G.News.replyOptions(S, m).length).length + (S.incident ? 1 : 0) + G.Career.dueActivities(S).length;
  function sidebar(cur) {
    const S = G.S;
    if (S.event) {
      return '<div class="side"><div class="nav on" data-act="nav" data-arg="event"><span class="ic">' + UI.icon('event', 18) + '</span><span class="t">Event</span></div>' +
        '<div class="xs muted" style="padding:8px 10px"><span class="t">Other screens open again after you leave the event from its results page.</span></div></div>';
    }
    const actOnly = !!(S.settings && S.settings.badgeAct);
    const unread = actOnly ? UI.actionable(S) : S.inbox.filter(m => !m.read).length;
    const items = [['hq', 'hq', 'Headquarters'], ['inbox', 'inbox', 'Inbox', unread], ['garage', 'garage', 'Garage'], ['design', 'design', 'Design Office'], ['parts', 'parts', 'Inventory'], ['know', 'know', 'Tech Knowledge'],
      ['team', 'team', 'Team'], ['mentors', 'mentors', 'Mentors'], ['workshop', 'workshop', 'Workshop'], ['finance', 'finance', 'Finance'], ['calendar', 'calendar', 'Calendar']];
    if (G.World.on(S) && S.wseason) items.push(['world', 'event', S.team.home ? 'District' : 'World']);
    if (S.history.length || G.Career.banners(S).length) items.push(['history', 'history', 'History']);
    return '<div class="side">' + items.map(i => '<div class="nav ' + (cur === i[0] ? 'on' : '') + '" data-act="nav" data-arg="' + i[0] + '"><span class="ic">' + UI.icon(i[1], 18) + '</span><span class="t">' + i[2] + '</span>' + (i[3] ? '<span class="badge">' + i[3] + '</span>' : '') + '</div>').join('') + '</div>';
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
      else if (ev && ev.def) btns += '<button class="btn primary" data-act="goEvent">Go to ' + h(ev.def.name) + '</button>' + (ev.def.kind !== 'einstein' ? '<button class="btn" data-act="skipEvent">Skip this event</button>' : '');
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
    if (S.phase === 'end') { UI.go('end'); if (S.launchQueue && S.launchQueue.length) UI.launchModal(); return; }
    UI.render();
    if (G.Career.dueActivities(S).length) UI.A.activities();
    else if (S.incident) UI.A.incident();
    else if (S.launchQueue && S.launchQueue.length) UI.launchModal();
    else UI.regReminder();
  };
  // ---------------- vendor product launch events ----------------
  UI.launchModal = function () {
    const S = G.S, L = S.launchQueue && S.launchQueue[0];
    if (!L) return UI.regReminder();
    if (L.kind === 'donation') return UI.donationModal(L, S.launchQueue.length - 1);
    if (L.kind === 'story') return UI.storyModal(L, S.launchQueue.length - 1);
    if (L.kind === 'pandemic') { S.launchQueue.shift(); return UI.pandemicModal(); }
    if (L.kind === 'district') { S.launchQueue.shift(); return UI.districtModal(); }
    if (L.kind === 'loyalty') { S.launchQueue.shift(); return UI.loyaltyModal(); }
    if (L.kind) return UI.techModal(L, S.launchQueue.length - 1);
    const V = D.VENDORS[L.v], more = S.launchQueue.length - 1;
    const prod = p => '<div class="card flat mb" style="border-left:3px solid ' + V.color + '"><div class="row"><b>' + h(p.name) + '</b> ' + UI.tag('NEW', 'acc') + '<span class="sp"></span><b>' + U.money(p.price) + '</b><span class="xs muted">each</span></div>' +
      '<div class="sm muted mt">' + h(p.tag) + '</div>' +
      '<div class="statrow wide mt" style="grid-template-columns:110px 1fr auto"><span class="n">Performance</span>' + UI.bar(p.perf * 100, 100, V.color) + '<span class="v nowrap" style="width:auto">' + (p.oldPerf ? Math.round(p.oldPerf * 100) + ' → ' : '') + '<b>' + Math.round(p.perf * 100) + '</b></span></div>' +
      '<div class="xs muted">' + (p.oldName ? 'Replaces the ' + h(p.oldName) + ' (' + U.money(p.oldPrice) + '), on sale through the ' + L.year + ' season.' : p.vs ? 'Takes the place of the ' + h(p.vs) + ', which is no longer made.' : 'A new kind of product: nothing like it was sold before.') + '</div></div>';
    UI.modal('<div class="xs b" style="color:' + V.color + '">PRODUCT LAUNCH · ' + h(L.month.toUpperCase()) + ' · ' + L.toKick + ' MONTH' + (L.toKick > 1 ? 'S' : '') + ' TO KICKOFF</div><h2>' + h(V.name) + ' unveils ' + h(L.prods.map(p => p.name).join(' & ')) + '</h2>' +
      '<p class="muted">' + h(L.intro) + '</p>' + L.prods.map(prod).join('') +
      '<div class="xs muted b mt">WHAT PEOPLE ARE SAYING</div>' + L.talk.map(([t, w]) => '<div class="sm mt">“' + h(t) + '” <span class="xs muted">— ' + h(w) + '</span></div>').join('') +
      '<div class="hint mt">' + h(L.take) + '</div>' +
      '<div class="row mt"><span class="xs muted">Also in your inbox.</span><span class="sp"></span>' + (more ? '<button class="btn" data-act="launchNext">Next launch (' + more + ' more)</button>' : '<button class="btn" data-act="launchNext">Close</button>') + '<button class="btn primary" data-act="launchShop">Open the Inventory</button></div>');
  };
  // The year at home: choose two programs (the lost 2021 season)
  UI.pandemicModal = function () {
    const S = G.S, L = S.lostYear;
    if (!L || L.stage !== 'choose') return;
    const sel = UI.st.pandemic = UI.st.pandemic || [], PD = D.PANDEMIC, progs = G.Career.pandemicPrograms(S), need = Math.min(PD.picks, progs.filter(p => p.ok).length);
    UI.modal('<div class="xs b" style="color:var(--bad);letter-spacing:.08em">2020 TO 2021 · NO SEASON</div><h2>A year at home</h2>' +
      '<p class="story-p">Fifteen months without a workshop. Know-how fades by ' + Math.round(PD.know * 100) + '%, students lose ' + Math.round(PD.skill * 100) + '% of their skills, and every mentor and sponsor may drift away. The team has the energy for <b>' + need + ' programs</b>. Choose them.</p>' +
      '<div class="grid g2">' + progs.map(p => '<div class="choice ' + (sel.includes(p.id) ? 'on' : '') + '" ' + (p.ok ? 'data-act="pandemicPick" data-arg="' + p.id + '"' : 'style="opacity:.45"') + '><div class="b">' + UI.icon(p.icon, 16) + ' ' + h(p.name) + '</div><div class="xs muted">' + h(p.desc) + (p.ok ? '' : ' <b>You have no 3D printer.</b>') + '</div></div>').join('') + '</div>' +
      '<div class="row mt"><span class="xs muted">' + sel.length + ' of ' + need + ' chosen. This cannot be changed afterwards.</span><span class="sp"></span><button class="btn primary" data-act="pandemicGo" ' + (sel.length === need ? '' : 'disabled') + '>Begin the year at home ▶</button></div>', { wide: true, lock: true });
  };
  UI.A.pandemicPick = id => { const sel = UI.st.pandemic = UI.st.pandemic || [], i = sel.indexOf(id); if (i >= 0) sel.splice(i, 1); else { sel.push(id); if (sel.length > D.PANDEMIC.picks) sel.shift(); } UI.pandemicModal(); };
  UI.A.pandemicGo = () => { const S = G.S, e = G.Career.pandemicChoose(S, UI.st.pandemic || []); if (e) return UI.err(e); UI.st.pandemic = []; UI.closeModal(); G.Save.write('auto'); UI.go('hq'); if (S.launchQueue && S.launchQueue.length) UI.launchModal(); };
  UI.A.pandemicOpen = () => UI.pandemicModal();
  // A new district forms in your area: join it, or stay a regional team
  UI.districtModal = function () {
    const S = G.S, O = S.districtOffer;
    if (!O || O.stage !== 'choose') return;
    const d = D.DISTRICT[O.id], I = G.World.formInfo(S, d, O.cy), bag = G.Era.at(O.cy).bag;
    const li = a => '<ul class="story-ul">' + a.filter(x => x).map(x => '<li>' + x + '</li>').join('') + '</ul>';
    UI.modal('<div class="xs b" style="color:' + d.color + ';letter-spacing:.08em">DISTRICT NEWS · ' + h(String(D.MONTHS[S.month]).toUpperCase()) + '</div><h2>' + h(I.title) + '</h2>' +
      I.body.map(p => '<p class="story-p">' + h(p) + '</p>').join('') +
      '<p class="story-p">Your school is inside the new district\'s borders, but a team this close to the edge may stay with the regionals. <b>Decide now:</b> registration for ' + O.cy + ' opens in October.</p>' +
      '<div class="grid g2"><div class="card flat" style="border-left:3px solid ' + d.color + '"><div class="b">Join the ' + h(d.name) + '</div>' + li([
        'One registration fee (' + U.money(D.FEES.firstRegional) + ') covers <b>two district events</b>. A third costs ' + U.money(D.FEES.extraDistrict) + ' and earns no points; three events a season at most.',
        'Events are local and two days long: about 36 teams and 12 qualification matches each.',
        'The top ' + d.dcmp + ' of about ' + I.n + ' teams on the points list play the <b>District Championship</b> in week 7 (' + U.money(D.FEES.dcmp) + '). About ' + I.slots + ' go on to the Championship.',
        bag ? 'Six hours with the bagged robot before every event.' : '',
        (G.Era.wildcards(O.cy) ? 'No wildcards: only district points count.' : 'No Regional Pool: only district points count.')]) + '</div>' +
      '<div class="card flat" style="border-left:3px solid #8d97a1"><div class="b">Stay a regional team</div>' + li([
        'Regionals as before: three days, 40 teams or more, up to four events a season (' + U.money(D.FEES.firstRegional) + ' for the first, ' + U.money(D.FEES.addRegional) + ' for each more).',
        'Qualify for the Championship by winning a regional, with an Impact, Engineering Inspiration or Rookie All-Star award, or ' + (G.Era.wildcards(O.cy) ? 'on a wildcard as a finalist.' : 'through the Regional Pool.'),
        'The ' + h(d.region) + ' runs fewer regionals from ' + O.cy + ': expect more travel and fuller events.']) + '</div></div>' +
      '<div class="row mt"><span class="xs muted">This cannot be changed afterwards.</span><span class="sp"></span><button class="btn" data-act="districtStay">Stay a regional team</button><button class="btn primary" data-act="districtJoin">Join the ' + h(d.short) + ' District ▶</button></div>', { wide: true, lock: true });
  };
  UI.districtPick = join => { const S = G.S, e = G.Career.districtChoose(S, join); if (e) return UI.err(e); UI.closeModal(); G.Save.write('auto'); UI.render(); UI.toast(join ? 'Joining the ' + D.DISTRICT[S.districtOffer.id].name : 'Staying a regional team', 'good'); if (S.launchQueue && S.launchQueue.length) UI.launchModal(); };
  UI.A.districtJoin = () => UI.districtPick(true);
  UI.A.districtStay = () => UI.districtPick(false);
  UI.A.districtOpen = () => UI.districtModal();
  // A vendor's loyalty sponsorship: the team has reached a new loyalty level and chooses one of three rewards
  UI.loyaltyBar = function (S, slot) {
    const y = G.Parts.loyal(S, slot), L = D.LOYALTY, col = y.vendor.color;
    return '<div class="row sm"><b style="color:' + col + '">' + h(y.vendor.short) + '</b>' + UI.tag('Level ' + y.lvl + ' · ' + y.name, y.lvl ? 'acc' : '') + '<span class="sp"></span><span class="xs muted">' + (y.next != null ? y.pts + ' / ' + y.next + ' loyalty points' : y.pts + ' loyalty points · top level') + '</span></div>' +
      UI.bar(y.next != null ? y.pts - y.prev : 1, y.next != null ? y.next - y.prev : 1, col);
  };
  UI.loyaltyModal = function () {
    const S = G.S, O = S.loyalOffer;
    if (!O || O.stage !== 'choose') return;
    const V = D.VENDORS[O.brand], L = D.LOYALTY, Pt = G.Parts, y = Pt.loyal(S, O.slot);
    const card = (id, icon, title, big, lines) => '<div class="card flat" style="border-top:3px solid ' + V.color + ';display:flex;flex-direction:column"><div class="b">' + UI.icon(icon, 16) + ' ' + title + '</div><div class="lg b mt" style="color:' + V.color + '">' + big + '</div>' +
      '<ul class="story-ul" style="flex:1">' + lines.map(x => '<li>' + x + '</li>').join('') + '</ul><button class="btn primary" data-act="loyaltyPick" data-arg="' + id + '">Choose</button></div>';
    UI.modal('<div class="xs b" style="color:' + V.color + ';letter-spacing:.08em">VENDOR LOYALTY · ' + h(V.name.toUpperCase()) + ' · ' + h(String(O.month).toUpperCase()) + '</div><h2>' + h(V.name) + ' names you a ' + h(L.names[O.lvl]) + '</h2>' +
      '<p class="story-p">' + h(O.intro) + '</p>' +
      '<p class="story-p">Season after season your competition robot has run on ' + h(V.short) + ' electronics, and it shows where other teams can see it. ' + h(V.short) + ' would like to keep it that way, and offers a <b>loyalty sponsorship</b>. Choose one.</p>' +
      '<div class="card flat mb">' + UI.loyaltyBar(S, O.slot) + '<div class="xs muted mt">A season is worth ' + L.robot + ' points when your competition robot runs on their electronics alone, and up to ' + L.buy + ' more for ordering their parts that year (' + U.money(L.buyFull) + ' for all of it). From this level on, your in-season orders with ' + h(V.short) + ' ship first: +' + Math.round(y.stock * 100) + '% chance that a part is in stock.</div></div>' +
      '<div class="grid g3">' +
      card('pack', 'box', 'Free parts', O.pack.map(x => x.n + ' ' + h((x.n > 1 ? D.PART_CAT[x.cat].short : D.PART_CAT[x.cat].short.replace(/s$/, '')).toLowerCase())).join(' + '), ['Delivered with the Kit of Parts at Kickoff.', 'The newest ' + h(V.short) + ' version on sale by then.', 'Worth about ' + U.money(O.packValue) + ' at today\'s prices, and it costs you nothing.']) +
      card('voucher', 'money', 'Voucher', U.money(O.voucher), ['Store credit with ' + h(V.short) + ': it pays first whenever you buy their parts.', 'Good through next season, so it also covers a part that breaks in Week 4.', 'What is left at the season review expires.']) +
      card('sale', 'bolt', 'Limited-time offer', '−' + Math.round(O.sale * 100) + '% until Kickoff', ['Everything from ' + h(V.short) + ', this autumn\'s new products included.', 'The best deal if you are about to refit a whole robot: it beats the voucher from about ' + U.money(O.voucher / O.sale) + ' of orders.', 'Ends when the Kickoff broadcast starts.']) +
      '</div>' +
      '<div class="xs muted b mt">WHAT PEOPLE ARE SAYING</div>' + O.talk.map(q => '<div class="sm mt">“' + h(q[0]) + '” <span class="xs muted">— ' + h(q[1]) + '</span></div>').join('') +
      '<div class="row mt"><span class="xs muted">Also in your inbox. One choice per level; it cannot be changed afterwards.</span></div>', { wide: true, lock: true });
  };
  UI.A.loyaltyPick = pick => { const S = G.S, O = S.loyalOffer, name = O ? D.VENDORS[O.brand].short : '', e = G.Parts.loyalChoose(S, pick); if (e) return UI.err(e); UI.closeModal(); G.Save.write('auto'); UI.render();
    UI.toast(pick === 'pack' ? name + ' ships your free parts at Kickoff' : pick === 'voucher' ? name + ' voucher added' : name + ' sale is on until Kickoff', 'good'); if (S.launchQueue && S.launchQueue.length) UI.launchModal(); };
  UI.A.loyaltyOpen = () => UI.loyaltyModal();

  // A story: one of the calendar's big changes (a vendor rises or falls, a rule changes, the year in review)
  UI.storyModal = function (L, more) {
    const col = L.color || 'var(--accent)', hit = L.hit;
    const go = L.btn === 'parts' ? '<button class="btn primary" data-act="launchShop">Open the Inventory</button>' : L.btn === 'know' || hit ? '<button class="btn primary" data-act="launchKnow">Tech Knowledge</button>' : '';
    UI.modal('<div class="xs b" style="color:' + col + ';letter-spacing:.08em">' + h(L.tag) + (L.month ? ' · ' + h(String(L.month).toUpperCase()) : '') + '</div><h2>' + h(L.title) + '</h2>' +
      L.body.map(p => '<p class="story-p">' + h(p) + '</p>').join('') +
      (L.mine ? '<div class="card flat mb" style="border-left:3px solid ' + col + '"><div class="xs muted b">YOUR SEASON</div><div class="sm mt">' + h(L.mine) + '</div></div>' : '') +
      (L.means && L.means.length ? '<div class="card flat mb" style="border-left:3px solid ' + col + '"><div class="xs muted b">WHAT IT MEANS FOR YOU</div><ul class="story-ul">' + L.means.map(x => '<li>' + h(x) + '</li>').join('') + '</ul>' +
        (hit ? '<div class="row mt"><div class="sp">' + UI.bar(hit.xp1, Math.max(hit.xp0, 1), hit.l1 < hit.l0 ? 'var(--bad)' : 'var(--warn)') + '</div><span class="sm b nowrap">' + h(hit.name) + ': ' + (hit.l1 < hit.l0 ? 'Level ' + hit.l0 + ' → <span class="bad">' + hit.l1 + '</span>' : 'Level ' + hit.l0 + ' (kept)') + '</span></div><div class="xs muted">Know-how −' + hit.pct + '%: ' + hit.xp0 + ' → ' + hit.xp1 + ' XP' + (hit.guard ? ' · <span class="good">your specialist mentor halved the loss</span>' : '') + (hit.deep ? ' · <span class="warn">Level ' + hit.l0 + ' know-how was tuned to the old way: it loses more and always drops a level</span>' : '') + (hit.xp0 === 0 ? ' · nothing to lose here yet' : '') + '</div>' : '') + '</div>' : '') +
      (L.talk && L.talk.length ? '<div class="xs muted b mt">WHAT PEOPLE ARE SAYING</div>' + L.talk.map(q => '<div class="sm mt">“' + h(q[0]) + '” <span class="xs muted">— ' + h(q[1]) + '</span></div>').join('') : '') +
      '<div class="row mt"><span class="xs muted">Also in your inbox.</span><span class="sp"></span>' + (more ? '<button class="btn' + (go ? '' : ' primary') + '" data-act="launchNext">Next (' + more + ' more)</button>' : '<button class="btn' + (go ? '' : ' primary') + '" data-act="launchNext">Close</button>') + go + '</div>', { wide: true });
  };

  // Offseason: the state of the art moves (rule and vendor changes in May, new designs in July-September)
  UI.techModal = function (L, more) {
    const rules = L.kind === 'rules', col = rules ? 'var(--warn)' : 'var(--info)';
    const item = i => '<div class="card flat mb" style="border-left:3px solid ' + col + '"><div class="row wrap"><b>' + h(i.title) + '</b> ' + UI.tag(i.tag, rules ? 'warn' : 'info') + '<span class="sp"></span>' + UI.tag(i.name) + '</div>' +
      '<div class="sm muted mt">' + h(i.body) + '</div>' +
      '<div class="row mt"><div class="sp">' + UI.bar(i.xp1, Math.max(i.xp0, 1), i.l1 < i.l0 ? 'var(--bad)' : 'var(--warn)') + '</div><span class="sm b nowrap">' + (i.l1 < i.l0 ? 'Level ' + i.l0 + ' → <span class="bad">' + i.l1 + '</span>' : 'Level ' + i.l0 + ' (kept)') + '</span></div>' +
      '<div class="xs muted">' + (i.capped ? 'Know-how ' + i.xp0 + ' → ' + i.xp1 + ' XP: only ' + i.base + ' XP still counted as current (XP banked above that was already outdated), then −' + i.pct + '%' : 'Know-how −' + i.pct + '%: ' + i.xp0 + ' → ' + i.xp1 + ' XP') + (i.guard ? ' · <span class="good">your specialist mentor halved the loss</span>' : '') + (i.deep ? ' · <span class="warn">Level ' + i.l0 + ' know-how was tuned to the old way: it loses more and always drops a level</span>' : '') + (i.xp0 === 0 ? ' · nothing to lose here yet' : '') + '</div></div>';
    UI.modal('<div class="xs b" style="color:' + col + '">' + (rules ? 'NEXT SEASON · ROBOT RULES AND VENDOR UPDATES' : 'SPOTTED ONLINE · ' + h(String(L.month).toUpperCase())) + '</div><h2>' + h(L.title) + '</h2>' +
      '<p class="muted">' + h(L.intro) + '</p>' + L.items.map(item).join('') +
      '<div class="xs muted b mt">WHAT PEOPLE ARE SAYING</div>' + L.talk.map(q => '<div class="sm mt">“' + h(q[0]) + '” <span class="xs muted">— ' + h(q[1]) + '</span></div>').join('') +
      '<div class="hint mt">' + h(L.take) + '</div>' +
      '<div class="row mt"><span class="xs muted">Also in your inbox.</span><span class="sp"></span>' + (more ? '<button class="btn" data-act="launchNext">Next (' + more + ' more)</button>' : '<button class="btn" data-act="launchNext">Close</button>') + '<button class="btn primary" data-act="launchKnow">Tech Knowledge</button></div>');
  };
  // A very satisfied sponsor donated a facility level
  UI.donationModal = function (L, more) {
    UI.modal('<div class="xs b good">DONATION · ' + h(String(L.month).toUpperCase()) + '</div><h2>' + h(L.sponsor) + ' donates a ' + h(L.level) + '</h2>' +
      '<p class="muted">' + h(L.intro) + '</p>' +
      '<div class="card flat mb" style="border-left:3px solid var(--good)"><div class="row wrap"><span class="fico">' + UI.icon(L.id, 22) + '</span><b>' + h(L.name) + '</b> ' + UI.tag('now level ' + L.lvl, 'acc') + '<span class="sp"></span><b>' + U.money(L.value) + '</b><span class="xs muted">value</span></div>' +
      '<div class="sm good mt">' + h(L.fx) + '</div><div class="xs muted mt">A gift from ' + h(L.sponsor) + ' (' + h(L.type) + ') · takes ' + L.sqft + ' sq ft of your workshop · upkeep applies as usual</div></div>' +
      '<div class="xs muted b mt">WHAT PEOPLE ARE SAYING</div>' + L.talk.map(q => '<div class="sm mt">“' + h(q[0]) + '” <span class="xs muted">— ' + h(q[1]) + '</span></div>').join('') +
      '<div class="hint mt">Sponsors donate equipment when they are satisfied and your workshop has room for it: the higher their satisfaction above ' + D.DONATION.sat + ', the likelier. With every sponsor slot filled and no sponsor activity skipped, expect about one donation a year.</div>' +
      '<div class="row mt"><span class="xs muted">Also in your inbox.</span><span class="sp"></span>' + (more ? '<button class="btn" data-act="launchNext">Next (' + more + ' more)</button>' : '<button class="btn" data-act="launchNext">Close</button>') + '<button class="btn primary" data-act="launchWork">Open the Workshop</button></div>');
    UI.confetti(2500);
  };
  UI.A.launchWork = () => { const S = G.S; if (S.launchQueue) S.launchQueue.shift(); UI.closeModal(); UI.go('workshop'); if (S.launchQueue && S.launchQueue.length) UI.launchModal(); };
  UI.A.launchKnow = () => { const S = G.S; if (S.launchQueue) S.launchQueue.shift(); UI.closeModal(); UI.go('know'); if (S.launchQueue && S.launchQueue.length) UI.launchModal(); };
  UI.A.launchNext = () => { const S = G.S; if (S.launchQueue) S.launchQueue.shift(); if (S.launchQueue && S.launchQueue.length) UI.launchModal(); else { UI.closeModal(); UI.regReminder(); } };
  UI.A.launchShop = () => { const S = G.S; if (S.launchQueue) S.launchQueue.shift(); UI.closeModal(); UI.go('parts'); if (S.launchQueue && S.launchQueue.length) UI.launchModal(); };
  // October: regional registration opens for next season
  UI.regReminder = function () {
    const S = G.S, key = 'up' + S.upcoming;
    if (S.mode !== 'career' || S.phase !== 'off' || D.MONTHS[S.month] !== 'Oct' || S.regReminded[key]) return;
    S.regReminded[key] = true;
    const dist = G.World.on(S) ? G.World.myDistrict(S) : null;
    if (dist) return UI.modal('<div class="xs acc b">OCTOBER</div><h2>District event registration is open</h2><p class="muted">Sign up for next season\'s ' + h(dist.name) + ' events now, while every event still has spots. After Kickoff, some events fill up and late registration costs ' + U.money(D.FEES.late) + ' extra.</p>' +
      '<div class="kv"><span class="k">Two district events</span><span>' + U.money(D.FEES.firstRegional) + '</span><span class="k">A third (no points)</span><span>' + U.money(D.FEES.extraDistrict) + '</span><span class="k">District Championship, if you qualify</span><span>' + U.money(D.FEES.dcmp) + '</span><span class="k">Registered so far</span><span>' + S.registered.length + ' / ' + S.maxEvents + '</span></div>' +
      '<p class="sm muted">New sponsor offers also arrived this month (Finance).</p><div class="row mt"><span class="sp"></span><button class="btn" data-act="closeModal">Later</button><button class="btn primary" data-act="closeAndGo" data-arg="calendar">Open Calendar</button></div>');
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
  UI.A.skipEvent = () => {
    const ev = G.Career.eventThisTurn(G.S); if (!ev || !ev.def) return;
    UI.confirm('Skip ' + ev.def.name + '?', 'The team stays home. Fees for an event this close are not refunded (you get half back only if you withdraw at least a month ahead, in the Calendar).', 'Skip it', () => { if (!UI.err(G.Career.skipEvent(G.S))) { UI.toast('Skipped ' + ev.def.name); UI.render(); } });
  };
  UI.A.goEvent = function () {
    const S = G.S, ev = G.Career.eventThisTurn(S);
    UI.closeModal();
    if (!ev) return;
    if (ev.active) return UI.go('event');
    const def = ev.def;
    if (def.kind === 'champs') { const e = G.Career.registerChamps(S); if (UI.err(e)) return; }
    if (def.kind !== 'einstein') {
      const tc = G.Career.travelCost(S, def);
      { const e = G.Career.afford(S, tc); if (e) return UI.toast(e + ' You can skip this event instead.', 'bad'); }
    }
    G.Career.startEvent(S, def);
    G.Save.write('auto');
    UI.go('event');
  };
  // the game as Kickoff presents it: field, rules in three paragraphs, the strategy note
  UI.gameBrief = function (year) {
    const Sz = G.Seasons[year];
    return '<canvas id="kfield" width="900" height="447" style="width:100%;border-radius:8px"></canvas>' +
      Sz.brief.map(p => '<p class="muted">' + h(p) + '</p>').join('') +
      (Sz.meta ? '<div class="hint">' + h(Sz.meta.note) + ' Opponents figure this out over the season, so expect it more in later weeks and in playoffs.</div>' : '');
  };
  // from the main menu: any game's Kickoff briefing, and a button that starts a Single Season Challenge of it
  UI.gameBriefModal = function (year) {
    const Sz = G.Seasons[year]; if (!Sz) return;
    const rel = Object.keys(Sz.relevance).filter(k => Sz.relevance[k] > 0).sort((a, b) => Sz.relevance[b] - Sz.relevance[a]);
    UI.modal('<div class="xs muted">KICKOFF BRIEFING · ' + year + '</div><h2 style="font-size:28px">' + year + ' ' + h(Sz.name) + '</h2><p class="acc b">' + h(Sz.tagline) + '</p>' + UI.gameBrief(year) +
      '<h3 class="mt">The robot</h3><div class="row wrap gap4">' + Sz.subs.map(sd => UI.tag(sd.name + (sd.optional ? ' (optional)' : ''))).join(' ') + '</div>' +
      '<h3 class="mt">What this game rewards</h3><div class="row wrap gap4">' + rel.map(k => '<span class="tag">' + h(D.AREA[k].name) + ' <span class="acc">' + '★'.repeat(Sz.relevance[k]) + '</span></span>').join(' ') + '</div>' +
      '<div class="row mt"><span class="xs muted">In a career this game is played in ' + year + ' (real order) or in any year (random order).</span><span class="sp"></span><button class="btn" data-act="closeModal">Close</button><button class="btn primary" data-act="playSeason" data-arg="' + year + '">Play this season ▶</button></div>',
      { wide: true, after: () => { const c = document.getElementById('kfield'); G.Render.preview(c, year); } });
  };
  UI.kickoffModal = function () {
    const S = G.S, Sz = G.Seasons[S.year];
    const rel = Object.keys(Sz.relevance).filter(k => Sz.relevance[k] > 0).sort((a, b) => Sz.relevance[b] - Sz.relevance[a]);
    UI.modal('<div class="xs muted">KICKOFF · SEASON ' + (S.si + 1) + '</div><h2 style="font-size:28px">' + h(G.Career.seasonName(S)) + '</h2><p class="acc b">' + h(Sz.tagline) + '</p>' + UI.gameBrief(S.year) +
      '<h3 class="mt">Your knowledge vs this game</h3><table class="t"><tr><th>Area</th><th>Relevance</th><th>Your level</th></tr>' +
      rel.map(k => '<tr><td>' + h(D.AREA[k].name) + '</td><td class="acc">' + '★'.repeat(Sz.relevance[k]) + '</td><td>Lv ' + G.Robot.know(S, k) + '</td></tr>').join('') + '</table>' +
      (S.lastKop && S.lastKop.year === S.year ? '<div class="hint mt">' + UI.icon('box', 14) + ' <b>' + (S.lastKop.rookie ? 'Rookie Kit of Parts' : 'Kit of Parts') + '</b>: ' + h(G.Parts.kopText(S.lastKop.kit)) + ' are on your shelves' + (S.lastKop.rookie ? ' (rookies get a bigger kit)' : '') + '.' + (S.lastKop.full.length ? ' Full shelves recycled their weakest parts: ' + h(S.lastKop.full.join(', ')) + '.' : '') + '</div>' : '') +
      '<div class="row mt"><span class="sp"></span><button class="btn primary" data-act="kickoffDone">Start the season ▶</button></div>', { wide: true, after: () => { const c = document.getElementById('kfield'); G.Render.preview(c, S.year); } });
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
    let o = UI.head('Headquarters', 'hq', h(C.dateLabel(S)) + (S.year && S.phase !== 'off' ? ' — ' + h(G.Seasons[S.year].name) : ''), 'basics');
    o += cta(S);
    if (S.lostYear && S.lostYear.stage === 'choose') o += '<div class="warnbox mt"><b>The 2021 season is cancelled.</b> Before anything else, decide what the team does with its year at home. <button class="btn primary sm" data-act="pandemicOpen">Choose two programs</button></div>';
    if (S.loyalOffer && S.loyalOffer.stage === 'choose') o += '<div class="warnbox mt"><b>' + h(D.VENDORS[S.loyalOffer.brand].name) + ' offers a loyalty sponsorship.</b> Free parts, a voucher or a sale: choose one. <button class="btn primary sm" data-act="loyaltyOpen">Choose</button></div>';
    if (S.districtOffer && S.districtOffer.stage === 'choose') o += '<div class="warnbox mt"><b>The ' + h(D.DISTRICT[S.districtOffer.id].name) + ' forms in ' + S.districtOffer.cy + '.</b> Your school is in its area: join the district or stay a regional team. <button class="btn primary sm" data-act="districtOpen">Decide</button></div>';
    else if (S.team.homeNext && G.World.on(S)) o += '<div class="hint mt">' + UI.icon('info', 14) + ' Your team joins the <b>' + h(D.DISTRICT[S.team.homeNext].name) + '</b> next season. District event registration opens in October.</div>';
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
    o += UI.card(UI.it('design', 'Projects ') + UI.tag(G.Robot.slotUsed(S) + '/' + G.Robot.slots(S) + ' slots'), UI.hoursPanel(S, true) + UI.fatigueLine(S) + UI.testPanel(S, true) + '<div class="hr"></div>' + (S.projects.length ? S.projects.map(p => '<div class="mb"><div class="row sm"><span>' + h(p.name) + '</span><span class="sp"></span><span class="muted">' + Math.round(p.done) + '/' + p.need + ' h · +' + Math.round(hplan.give[p.id] || 0) + ' h now</span></div>' + UI.bar(p.done, p.need) + '</div>').join('') : '<p class="muted">No active projects. Idle hours are wasted!</p>') +
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
    o += UI.card('Program goals', (s.goals.length ? s.goals.map(g => '<div class="row sm mb"><span class="tag ' + (D.PROGRAM_GOALS[g.id].check(s) ? 'good' : '') + '">' + g.tier + '</span><span>' + h(G.Career.goalText(G.S, D.PROGRAM_GOALS[g.id].text)) + '</span></div>').join('') : '<p class="muted">Goals are set at Kickoff.</p>') +
      '<div class="mt"><div class="row sm mb"><span class="muted">Program support</span><span class="sp"></span><b>' + Math.round(S.support) + '</b></div>' + UI.bar(S.support, 100, UI.colorFor(S.support)) + '</div>', '');
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
      const ap = d.watch ? null : C.arrivalPreview(S, d);
      const arr = ap ? ' · Robot arrives at ' + (ap.notes.length ? '<span class="warn">about ' + ap.cond + '%</span> (' + h(ap.notes.join(', ')) + ')' + (ap.spares > 0 ? ' — buy ' + ap.spares + ' spare part' + (ap.spares > 1 ? 's' : '') + ' in the Inventory tab first' : '') : '<span class="good">100%</span>') : '';
      const fat = d.kind !== 'einstein' && C.inSeason(S) ? ' · Team fatigue <b class="' + (S.fatigue > 40 ? 'warn' : '') + '">' + Math.round(S.fatigue) + ' (' + C.fatigueLabel(S.fatigue) + ')</b>' : '';
      return box('This week: ' + h(d.name), (d.watch ? 'Your matches are over, but your team is in the running for the FIRST Impact Award, presented on Einstein. Watch the finals from the stands.' : cost + arr + fat), '<button class="btn primary lg" data-act="goEvent">Go to event ▶</button>' + (d.kind !== 'einstein' ? '<button class="btn" data-act="skipEvent">Skip</button>' : ''));
    }
    const tips = {
      off: S.preseason ? 'Pre-season: sign sponsors (Finance), hire mentors, stock up on parts (Inventory), register for events (Calendar), start research (Design Office).' : 'Offseason: research, offseason events (Calendar), outreach (Team), sponsors in October, parts before Kickoff. Rule changes arrive in May and new designs in summer: both date your tech knowledge.',
      kickoff: 'Kickoff! Choose a concept for every subsystem in the Design Office, then press Continue.',
      build: S.week === 7 ? 'Week 0 — last week before competitions start.' : 'Build season: keep project slots busy. Consider overtime in the Design Office' + (S.week <= 3 ? ', and a test chassis in the Garage for early testing hours.' : '.'),
      comp: S.week === 7 ? (S.team.home && G.World.on(S) ? 'Week 7 — District Championship week. The district\'s Championship places are settled when it ends.' : 'Week 7 — no regionals. Lighten the load and let the team recover before the Championship.') : 'Competition season — no event this week. Keep upgrading between events.',
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
    // messages can carry optional replies with small effects: shown inline when the message is open, never as a popup
    let openReplies = 0;
    const list = S.inbox.map(m => {
      const opts = G.News.replyOptions(S, m), open = UI.st.openMsg === m.id;
      if (opts.length) openReplies++;
      const rt = opts.length ? ' ' + UI.tag('reply', 'acc') : m.replied != null ? ' ' + UI.tag('replied', 'good') : m.reply ? ' ' + UI.tag('expired') : '';
      let body = '';
      if (open) {
        body = '<div class="mb">' + h(m.body) + '</div>';
        if (opts.length) body += '<div class="row wrap gap4 mt">' + opts.map(o => '<button class="btn sm' + (o.i === 0 ? ' primary' : '') + '" data-act="replyMsg" data-arg="' + m.id + '|' + o.i + '"' + (o.ok ? '' : ' disabled') + '>' + h(o.text) + '</button>').join('') + '</div><div class="xs muted mt">Optional. Reply this ' + (S.phase === 'off' ? 'month' : 'week') + ' or ignore it: the offer lapses when you press Continue.</div>';
        else if (m.reply && m.replied == null) body += '<div class="xs muted mt">No reply was sent; the offer lapsed at the end of its ' + (S.phase === 'off' ? 'month' : 'week') + '.</div>';
        if (m.outcome) body += '<div class="mb good">↳ ' + h(m.outcome) + '</div>';
      }
      return '<div class="msg ' + (m.read ? '' : 'unread') + '" data-act="readMsg" data-arg="' + m.id + '"><div class="row">' + kt(m) + '<span class="mt">' + h(m.title) + '</span>' + rt + '<span class="sp"></span><span class="md">' + h(m.date) + '</span></div>' + body + '</div>';
    }).join('');
    const due = G.Career.dueActivities(S);
    return UI.head('Inbox', 'inbox', 'News, results and decisions. Not everything gets a pop-up: talk of what the vendors, the rule makers and the market are about to do turns up here first, as ordinary messages among the news and the chatter.' + (openReplies ? ' ' + openReplies + ' message' + (openReplies > 1 ? 's' : '') + ' you can reply to (optional).' : ''), 'basics') + '<div class="row wrap mb"><button class="btn sm" data-act="readAll">Mark all read</button><button class="btn sm' + (S.settings && S.settings.badgeAct ? ' sel' : '') + '" data-act="badgeAct" title="What the number next to Inbox in the sidebar counts: every unread message, or only the items that wait for you (open replies, a shop incident, sponsor activities)">Sidebar count: ' + (S.settings && S.settings.badgeAct ? 'actionable only (' + UI.actionable(S) + ')' : 'all unread') + '</button>' + (S.incident ? '<button class="btn sm primary" data-act="incident">Resolve shop incident</button>' : '') + (due.length ? '<button class="btn sm primary" data-act="activities">' + due.length + ' sponsor activit' + (due.length > 1 ? 'ies' : 'y') + ' to resolve</button>' : '') + '</div>' + (list || '<p class="muted">Empty.</p>');
  } };
  UI.A.badgeAct = () => { const S = G.S; S.settings = S.settings || {}; S.settings.badgeAct = !S.settings.badgeAct; G.Save.write('auto'); UI.render(); };
  UI.A.readMsg = id => { const m = G.S.inbox.find(x => x.id === id); if (m) m.read = true; UI.st.openMsg = UI.st.openMsg === id ? null : id; UI.render(); };
  UI.A.replyMsg = arg => { const [id, i] = String(arg).split('|'); if (G.News.reply(G.S, id, Number(i)) == null) return; UI.st.openMsg = id; UI.render(); };
  UI.A.readAll = () => { G.S.inbox.forEach(m => m.read = true); UI.render(); };

  // =====================================================================
  // GARAGE
  // =====================================================================
  UI.S.garage = { html() {
    const S = G.S;
    if (!S.robot) return UI.head('Garage', 'garage', '', 'garage') + '<p class="muted">No robot yet — wait for Kickoff.</p>';
    const R = S.robot, year = R.year, ci = R.comp || 0, lock = G.Robot.garageLock(S);
    let o = UI.head('Garage', 'garage', h(G.Career.seasonName(S, year)) + (S.phase === 'off' ? ' — last season\'s robots (used at offseason events)' : '') + '. Two robots: choose which one competes and which one the drivers practice on.', 'garage');
    if (lock) o += '<div class="warnbox mb">' + h(lock) + ' Spares identical to the competition robot\'s subsystems can still be swapped in from the event screen.</div>';
    if (G.Career.bagged(S)) { const k = G.Career.bagK(S); o += '<div class="warnbox mb">' + UI.icon('garage', 14) + ' <b>Stop Build Day:</b> the competition robot is in the bag until the season ends and may only be touched at events. ' + (G.Robot.secondRuns(S) ? 'Your second robot carries the work: hardware projects keep their full speed and the drivers practise on it.' : 'With no second robot, hardware projects run at ' + (k > 0.5 ? Math.round(k * 100) + '% speed' : 'half speed') + ' and the drive team cannot practise at home.') + ' Whatever you finish for it now is packed and fitted on practice day at your next event.</div>';
      const held = G.Robot.held(S), names = G.Robot.heldNames(S), dist = S.team.home && G.World.on(S);
      if (held.length) o += '<div class="card mb" style="border-left:3px solid var(--warn)"><div class="ct">' + UI.icon('box', 16) + ' Packed for the next event ' + UI.tag(held.length + (held.length === 1 ? ' item' : ' items'), 'warn') + '</div><div class="sm muted mb">Made while the competition robot was in the bag. ' + (dist ? 'Your team fits them in the robot access window before its next district event.' : 'Use <b>Install Upgrade</b> on practice day to fit them; until then the robot competes as it was bagged.') + '</div>' +
        names.map((nm, i) => '<div class="row sm mb"><span>' + h(nm) + '</span><span class="sp"></span>' + (held[i].u ? '<button class="btn sm" data-act="garageUnpack" data-arg="' + i + '" title="Back to storage">Unpack</button>' : '<span class="xs muted">new parts for the mechanism on the robot</span>') + '</div>').join('') + '</div>'; }
    o += '<div class="row mb"><label class="row sm" title="Teams name their robots. The name goes into your History with the robot\'s drawing.">' + UI.icon('garage', 14) + ' This season\'s robot is called <input class="inp sm" style="width:220px" maxlength="28" placeholder="give it a name" value="' + h(R.nick || '') + '" data-chg="robotNick"></label></div>';
    o += '<div class="grid g2 mb">' + [0, 1].map(bi => botCard(S, bi, lock)).join('') + '</div>';
    o += storageCard(S, lock);
    // the competition robot in detail
    const cap = G.Robot.cap(S), w = G.Robot.weight(S);
    o += '<h2 class="mt">' + h(R.bots[ci].name) + ' (competition robot)</h2><div class="grid g3">';
    o += UI.card('Overall', UI.stat('Speed', cap.speed) + UI.stat('Agility', cap.agility) + UI.stat('Pushing', cap.push) + UI.stat('Intake', cap.intake) + UI.stat('Scoring speed', cap.scoreSpd) + UI.stat('Accuracy', cap.accuracy) +
      (cap.rmax ? UI.stat('Range', cap.range) : '') + UI.stat('Endgame', cap.endgame) + UI.stat('Autonomous', cap.auto) + UI.stat('Vision', cap.vision) + UI.stat('Reliability', cap.rel, null, UI.colorFor(cap.rel)) +
      '<div class="hr"></div><div class="kv"><span class="k">Weight</span><span class="' + (w > 125 ? 'bad b' : '') + '">' + w + ' / 125 lb</span><span class="k">Auto</span><span>' + h(G.Seasons[year].autoTiers[R.autoTier]) + '</span><span class="k">Vision</span><span>Level ' + R.visionLvl + '</span><span class="k">Condition</span><span>' + Math.round(G.Robot.condAvg(S)) + '%</span><span class="k">Power rating</span><span>' + G.Cap.power(year, cap) + '</span></div>');
    G.Robot.describe(S).forEach(d => {
      const s = d.sub, c = s && s.ver ? G.Seasons.concept(year, d.id, s.concept) : null;
      if (!c) return;
      o += UI.card(h(d.name) + ' ' + UI.tag('v' + s.ver, 'acc'), '<div class="b mb">' + h(c.name) + '</div>' + Object.keys(s.stats).map(k => UI.stat(D.STAT[k] || k, s.stats[k], G.Robot.ceil(S, year, d.id, c, k))).join('') +
        (d.id !== 'soft' ? UI.stat('Reliability', s.rel, null, UI.colorFor(s.rel)) + UI.stat('Condition', s.cond, null, UI.colorFor(s.cond)) + '<div class="sm muted">' + s.w.toFixed(1) + ' lb · complexity ' + c.cx + (R.pending.includes(d.id) ? ' · <span class="warn">upgrade waiting for install</span>' : '') + '</div>' : ''));
    });
    o += '</div><p class="sm muted mt">White marks show each stat\'s current ceiling (concept + knowledge + parts). Upgrades close part of the gap each time.</p>';
    o += '<div class="hint mt">' + UI.icon('team', 14) + ' <b>Driver familiarity</b>: the drive team knows each subsystem they have driven. A brand-new mechanism starts around ' + Math.round(D.FAM.NEW * 100) + '%, a new version of the same one costs about ' + Math.round(D.FAM.VER * 100) + '% per version, and switching concept costs 20–65% (a dumper to a turret, or tank to swerve, is a big change). Weekly shop driving, driver practice, practice blocks at events and every match win it back. In matches each subsystem delivers ' + Math.round(100 - D.FAM.EFFECT * 100) + '–100% of its stats depending on familiarity, so let the drivers practice on the robot they will compete with.</div>';
    return o;
  } };
  // One robot: its subsystems (installed units), familiarity, and the actions to change them
  function botCard(S, bi, lock) {
    const R = S.robot, year = R.year, b = R.bots[bi], ci = R.comp || 0, di = G.Robot.driveBot(S), run = G.Robot.runnable(R, bi);
    const any = Object.keys(b.subs).some(k => k !== 'soft' && b.subs[k] && b.subs[k].ver);
    let o = '<div class="card botcard' + (bi === ci ? ' comp' : '') + '"><div class="ct">' + UI.icon('garage', 18) + '<b class="lg">' + h(b.name) + '</b>' + (bi === ci ? UI.tag('Competition robot', 'acc') : '') + (bi === di ? UI.tag('Drivers practice here', 'info') : '') + '</div>';
    if (any) {
      const cap = G.Robot.capOf(S, bi), fam = G.Robot.famAvg(R, bi), w = G.Robot.weightOf(R, bi), pp = G.Parts.profile(S, bi === ci ? 'comp' : 'prac');
      o += '<div class="botimg">' + UI.sideCanvas(G.Robot.lookOf(S, bi), 'blue', S.team.num, 340, 160) + '</div>' +
        '<div class="kv"><span class="k">Power</span><span>' + G.Cap.power(year, cap) + '</span><span class="k">Weight</span><span class="' + (w > 125 ? 'bad b' : '') + '">' + w + ' / 125 lb</span><span class="k">Condition</span><span>' + Math.round(G.Robot.condOf(R, bi)) + '%</span></div>' +
        (fam != null ? '<div class="statrow wide mt"><span class="n">Driver familiarity</span>' + UI.bar(fam * 100, 100, UI.colorFor(fam * 100)) + '<span class="v">' + Math.round(fam * 100) + '%</span></div>' : '') +
        (pp.short ? '<div class="xs bad">Short of ' + pp.short + ' electronic part' + (pp.short > 1 ? 's' : '') + ': kit parts fill in (Inventory).</div>' : '');
    } else o += '<div class="botimg empty">' + UI.icon('garage', 36) + '<div class="sm muted">Empty chassis. Build subsystems (Design Office: Build copy) or fit stored ones.</div></div>';
    o += '<table class="t slots mt">' + G.Seasons[year].subs.filter(sd => sd.id !== 'soft').map(sd => {
      const k = sd.id, u = b.subs[k], d = R.design[k], c = u && u.ver ? G.Seasons.concept(year, k, u.concept) : null, f = G.Robot.famOf(R, k, u);
      const tag = !c || G.Robot.isLatest(R, k, u) ? '' : u.concept === d.concept ? UI.tag('v' + d.ver + ' designed', 'warn') : UI.tag('old concept', 'warn');
      const other = R.bots[1 - bi].subs[k], opts = R.store.filter(x => x.sub === k).map(x => ['s', x]).concat(other && other.ver ? [['o', other]] : []);
      const optHtml = opts.map(([wh, x]) => { const xc = G.Seasons.concept(year, k, x.concept); return '<option value="' + x.uid + '">' + (wh === 'o' ? 'Swap with ' + h(R.bots[1 - bi].name) + ': ' : 'From storage: ') + h(xc ? xc.name : String(x.concept)) + ' v' + x.ver + ' (' + Math.round(x.cond) + '%)</option>'; }).join('');
      const act = lock || (!opts.length && !c) ? '' : '<select class="inp sm" data-chg="garagePlace" data-bot="' + bi + '" data-sub="' + k + '"><option value="">' + (c ? 'Change…' : 'Fit…') + '</option>' + optHtml + (c ? '<option value="off">Take it off (to storage)</option>' : '') + '</select>';
      return '<tr><td><div class="b sm">' + h(sd.name) + '</div><div class="xs">' + (c ? h(c.name) + ' <span class="acc">v' + u.ver + '</span> ' + tag : '<span class="dim">empty</span>') + '</div></td>' +
        '<td class="xs">' + (c ? '<div class="row gap4" title="Condition ' + Math.round(u.cond) + '%"><span class="muted">cond</span><span class="mini">' + UI.bar(u.cond, 100, UI.colorFor(u.cond)) + '</span></div>' +
          (f != null ? '<div title="Driver familiarity"><span class="muted">fam</span> <b class="' + (f < 0.6 ? 'warn' : f >= 0.85 ? 'good' : '') + '">' + Math.round(f * 100) + '%</b></div>' : '') : '') + '</td>' +
        '<td class="num">' + act + '</td></tr>';
    }).join('') + '</table>';
    o += '<div class="row wrap gap4 mt">' + (bi !== ci ? '<button class="btn sm" data-act="setComp" data-arg="' + bi + '" ' + (run && !lock ? '' : 'disabled') + '>Make it the competition robot</button>' : '') +
      (bi !== di ? '<button class="btn sm" data-act="setDrive" data-arg="' + bi + '" ' + (run ? '' : 'disabled title="Needs a drivetrain"') + '>Drivers practice on it</button>' : '') + '</div>';
    // the second robot: build every missing subsystem in one batch (the old practice robot project)
    if (bi !== ci && R.year === S.year && S.phase !== 'off') {
      const tc = S.projects.find(p => p.type === 'testChassis');
      if (tc) o += '<div class="copyrow mt">' + UI.icon('clock', 14) + '<span class="sm">Test chassis being built: ' + Math.round(tc.done) + '/' + tc.need + ' h</span></div>';
      else if (!(b.subs.drive && b.subs.drive.ver) && !S.projects.some(p => p.type === 'practiceBot')) {
        o += '<div class="copyrow mt"><div class="sp"><b class="sm">Test chassis</b><div class="xs muted">A simple drivetrain from parts on the shelf, built in a few days without a project slot. Programmers and drivers can start before the competition robot drives: ' +
          (G.Shop.lvl(S, 'pfield') ? 'counts as half a second robot on your Practice Field.' : D.CHASSIS_TEST_HOURS + ' testing hours a week even without a Practice Field (code, autos, vision and drivetrain projects, and driver practice).') + '</div><div class="row wrap gap4 mt">' +
          D.CHASSIS_CONCEPTS.map(cid => { const c = G.Seasons.concept(R.year, 'drive', cid); if (!c) return ''; const q = G.Robot.quote(S, { type: 'testChassis', concept: cid }); return '<button class="btn sm" data-act="startChassis" data-arg="' + cid + '"' + (q.err ? ' disabled title="' + h(q.err) + '"' : '') + '>' + h(c.name) + ' · ' + q.hours + ' h · ' + U.money(q.cost) + '</button>'; }).join('') + '</div>' +
          (function () { const cd = G.Robot.compDrive(S); if (!cd) return '<div class="xs muted mt">Pick the same drive family as the competition robot (tank: Kitbot, West Coast; holonomic: Mecanum, Swerve) and auto routines develop ' + Math.round(D.CHASSIS_PATH * 100) + '% faster.</div>'; const f = D.DRIVE_FAMILY[cd], ok = D.CHASSIS_CONCEPTS.filter(k => D.DRIVE_FAMILY[k] === f).map(k => G.Seasons.concept(R.year, 'drive', k).name); return '<div class="xs muted mt">Your competition drivetrain is ' + f + ': a <b>' + h(ok.join(' or ')) + '</b> chassis also speeds up auto routines by ' + Math.round(D.CHASSIS_PATH * 100) + '% (same way of driving). Any chassis adds defense drills for the drivers and an electrical shakedown (fewer brownouts and comms dropouts at your first events).</div>'; })() +
          (G.Robot.quote(S, { type: 'testChassis', concept: 'kit' }).err ? '<div class="xs warn mt">' + h(G.Robot.quote(S, { type: 'testChassis', concept: 'kit' }).err) + '</div>' : '') + '</div></div>';
      }
      const run2 = S.projects.find(p => p.type === 'practiceBot');
      if (run2) o += '<div class="copyrow mt">' + UI.icon('clock', 14) + '<span class="sm">Full copy being built: ' + Math.round(run2.done) + '/' + run2.need + ' h</span></div>';
      else if (G.Robot.fullCopySubs(R).length) {
        const q = G.Robot.quote(S, { type: 'practiceBot' });
        o += '<div class="copyrow mt"><div class="sp"><b class="sm">Build a full copy</b><div class="xs muted">Every finished subsystem this robot lacks, in one batch. Needs a second set of electronics. The more of the competition robot it copies, the more it gives: up to +' + D.TEST_BOT_HOURS + ' testing hours a week (with a Practice Field), driver practice on it up to ' + Math.round((D.BOT2_PRACTICE - 1) * 100) + '% more effective, better tuning at events, and its identical subsystems are spares at events. Any running second robot also adds defense drills, an electrical shakedown and, on the same drive family, faster auto development.</div></div><span class="xs muted">' + q.hours + ' h · ' + U.money(q.cost) + '</span><button class="btn sm" data-act="startSimple" data-arg="practiceBot" ' + (q.err ? 'disabled' : '') + '>Start</button></div>' + (q.err ? '<div class="xs bad">' + h(q.err) + '</div>' : '');
      }
    }
    return o + '</div>';
  }
  // Built subsystems not on a robot: event spares, old versions, old concepts
  function storageCard(S, lock) {
    const R = S.robot, year = R.year, order = G.Seasons[year].subs.map(sd => sd.id);
    const list = R.store.slice().sort((a, b) => order.indexOf(a.sub) - order.indexOf(b.sub) || b.ver - a.ver);
    let body = '<div class="sm muted mb">Built subsystems that are not on a robot: up to ' + D.STORE_MAX + ' of each kind. A spare identical to the competition robot\'s (same concept and version) goes to events: swap it in between matches to bring that subsystem back to 100%. Take old ones apart for spare parts; their mechanism kits go back on the shelf.</div>';
    if (!list.length) body += '<p class="muted">Empty. Build copies in the Design Office.</p>';
    else body += '<table class="t"><tr><th>Subsystem</th><th>Unit</th><th>Condition</th><th></th></tr>' + list.map(u => {
      const c = G.Seasons.concept(year, u.sub, u.concept), cu = R.subs[u.sub], spare = cu && cu.ver && cu.concept === u.concept && cu.ver === u.ver, n = G.Robot.harvestValue(R, u);
      return '<tr><td class="sm b">' + h(G.Seasons.sub(year, u.sub).name) + '</td><td class="sm">' + h(c ? c.name : String(u.concept)) + ' <span class="acc">v' + u.ver + '</span> ' + (spare ? UI.tag('event spare', 'good') : '') + (u.kits ? ' ' + UI.tag('COTS kits', 'info') : '') + '</td>' +
        '<td><span class="mini">' + UI.bar(u.cond, 100, UI.colorFor(u.cond)) + '</span> <span class="xs muted">' + Math.round(u.cond) + '%</span></td><td class="num">' +
        [0, 1].map(bi => '<button class="btn sm" data-act="garageFit" data-arg="' + u.uid + '|' + bi + '" ' + (lock ? 'disabled' : '') + '>Fit to ' + h(R.bots[bi].name) + '</button>').join(' ') +
        ' <button class="btn sm bad" data-act="garageHarvest" data-arg="' + u.uid + '">Take apart' + (n ? ' · +' + n + ' spare' + (n > 1 ? 's' : '') : u.kits ? ' · kits back' : '') + '</button></td></tr>';
    }).join('') + '</table>';
    return UI.card(UI.it('box', 'Storage ') + UI.tag(R.store.length + ' unit' + (R.store.length === 1 ? '' : 's')), body);
  }
  UI.A.garagePlace = (v, el) => {
    if (!v) return;
    if (v === 'off') { UI.err(G.Robot.unmount(G.S, Number(el.dataset.bot), el.dataset.sub)); return UI.render(); }
    { const bagged = !!G.Robot.bagLock(G.S) && Number(el.dataset.bot) === (G.S.robot.comp || 0); if (!UI.err(G.Robot.place(G.S, v, Number(el.dataset.bot)))) UI.toast(bagged ? 'Packed for the next event' : 'Fitted', 'good'); }
    UI.render();
  };
  UI.A.garageFit = arg => { const [uid, bi] = arg.split('|'), bagged = !!G.Robot.bagLock(G.S) && Number(bi) === (G.S.robot.comp || 0); if (!UI.err(G.Robot.place(G.S, uid, Number(bi)))) { UI.toast(bagged ? 'Packed for the next event: fit it on practice day' : 'Fitted to ' + G.S.robot.bots[Number(bi)].name, 'good'); UI.render(); } };
  UI.A.garageUnpack = i => { if (!UI.err(G.Robot.unpack(G.S, Number(i)))) { UI.toast('Back in storage', 'good'); UI.render(); } };
  UI.A.garageOff = arg => { const [bi, k] = arg.split('|'); if (!UI.err(G.Robot.unmount(G.S, Number(bi), k))) UI.render(); };
  UI.A.garageHarvest = uid => {
    const S = G.S, u = S.robot.store.find(x => x.uid === uid); if (!u) return;
    const n = G.Robot.harvestValue(S.robot, u);
    UI.confirm('Take it apart?', (n ? 'You get ' + n + ' spare part' + (n > 1 ? 's' : '') : 'It is too simple to yield spare parts') + (u.kits ? ', and its mechanism kits go back on the shelf' : '') + '. The unit is gone for good.', 'Take apart', () => {
      const r = G.Robot.harvest(S, uid); if (typeof r === 'string') return UI.err(r);
      UI.toast(r.spares ? '+' + r.spares + ' spare part' + (r.spares > 1 ? 's' : '') : 'Taken apart' + (r.kits ? ': kits back on the shelf' : ''), 'good'); UI.render();
    });
  };
  UI.A.setComp = bi => { if (!UI.err(G.Robot.setComp(G.S, Number(bi)))) { UI.toast(G.S.robot.bots[Number(bi)].name + ' is now the competition robot. The best electronics move to it.', 'good'); UI.render(); } };
  UI.A.setDrive = bi => { if (!UI.err(G.Robot.setDrive(G.S, Number(bi)))) { UI.toast('The drivers will practice on ' + G.S.robot.bots[Number(bi)].name, 'good'); UI.render(); } };

  // =====================================================================
  // DESIGN OFFICE
  // =====================================================================
  UI.S.design = { html() {
    const S = G.S, R = S.robot, C = G.Career, inSeason = R && R.year === S.year && S.phase !== 'off';
    let o = UI.head('Design Office', 'design', 'Choose development directions, run projects, research for the future.', 'design');
    o += UI.devBanner(S);
    if (G.Career.bagged(S)) o += '<div class="warnbox mb"><b>Stop Build Day:</b> the competition robot is in the bag. ' + (G.Career.bagK(S) < 1 ? 'Fabrication projects run at ' + Math.round(G.Career.bagK(S) * 100) + '% speed (a second robot removes the penalty)' : 'Your second robot keeps fabrication projects at full speed') + '. New mechanisms and upgrades are packed when they are finished and fitted on practice day at your next event (Install Upgrade)' + (G.Robot.held(S).length ? ': <b>' + G.Robot.held(S).length + ' packed now</b>' : '') + '. Software and research are not affected.</div>';
    if (S.phase === 'build' || S.phase === 'kickoff') o += '<div class="row wrap mb"><label class="row sm"><input type="checkbox" data-chg="overtime" ' + (S.overtime ? 'checked' : '') + '> Overtime this week (+30% hours, −6 morale, ' + U.money(200) + ')</label></div>';
    o += UI.card(UI.it('clock', 'Team hours this ' + (S.phase === 'off' ? 'month' : 'week')), UI.hoursPanel(S) + UI.fatigueLine(S));
    o += '<div class="mt">' + UI.card('Testing hours ' + (function () { const th = C.testHours(S), pf = G.Shop.lvl(S, 'pfield') > 0, r2 = G.Robot.secondRuns(S); return th.unlocked ? UI.tag('from ' + [pf ? 'the practice field' : '', r2 ? (G.Robot.secondShare(S) > 0 ? 'the second robot' : 'the test chassis') : ''].filter(Boolean).join(' and '), 'info') : UI.tag('from a test or second robot and a practice field'); })(), UI.testPanel(S)) + '</div>';
    // weekly suggestion
    const sg = G.Robot.suggest(S);
    if (sg) o += '<div class="card hl mt"><div class="ct">Suggested this week<span class="sp"></span>' + UI.tag(sg.quote.hours + ' h · ' + U.money(sg.quote.cost)) + '</div><div class="b">' + h(sg.title) + '</div><div class="sm muted">' + h(sg.reason) + '</div><div class="row mt"><button class="btn sm primary" data-act="startSuggest">Start it</button></div></div>';
    // active projects
    const plan = C.hoursPlan(S);
    const slotUsed = G.Robot.slotUsed(S), slotMax = G.Robot.slots(S);
    o += '<div class="mt">' + UI.card('Active projects ' + UI.tag(slotUsed + '/' + slotMax + ' slots', slotUsed >= slotMax ? 'warn' : ''), S.projects.length ? '<table class="t"><tr><th>Project</th><th style="width:24%">Progress</th><th>This ' + (S.phase === 'off' ? 'month' : 'week') + '</th><th title="Extra hours beyond the plan raise the result\'s quality, with diminishing returns">Extra hours</th><th>Priority</th><th></th></tr>' + S.projects.slice().sort((a, b) => G.Robot.isFab(a) - G.Robot.isFab(b)).map((p, i, arr) => (G.Robot.isFab(p) && (i === 0 || !G.Robot.isFab(arr[i - 1])) ? '<tr><td colspan="6" class="xs muted b">' + UI.icon('garage', 12) + ' FABRICATION · copies of finished designs: team hours, but no project slot</td></tr>' : '') + '<tr><td>' + h(p.name) + (p.kits ? ' ' + UI.tag('COTS kits', 'info') : '') + (G.Robot.testable(p) && p.test ? ' <span class="xs info" title="Validated on the practice field: better upgrade quality">tested ' + Math.round(G.Robot.testQ(p) * 100) + '%</span>' : '') + (p.effort && p.effort !== 'std' ? ' ' + UI.tag(G.Robot.EFFORT[p.effort].name) : '') + '</td><td>' + UI.bar(p.done + (p.polish || 0), p.need + (p.extra || 0), null, p.extra ? p.need : null) + '<span class="xs muted">' + Math.round(p.done) + '/' + p.need + ' h' + (p.extra ? ' + ' + Math.round(p.polish || 0) + '/' + p.extra + ' extra' : '') + '</span></td><td class="sm">' + UI.projEta(S, p, plan) + '</td><td>' + (G.Robot.isFab(p) ? '<span class="xs dim" title="Copies follow the design: extra hours would change nothing">—</span>' : '<input class="inp num" type="number" min="0" step="1" max="' + p.need + '" value="' + (p.extra || 0) + '" data-chg="projExtra" data-id="' + p.id + '" style="width:64px"><div class="xs muted">' + (p.extra ? 'quality +' + Math.round(G.Robot.polishQFor(p, p.extra) * 100) + '%' : 'none') + '</div>') + '</td><td><select class="inp" data-chg="prio" data-id="' + p.id + '">' + ['high', 'normal', 'low'].map(x => '<option ' + (p.prio === x ? 'selected' : '') + '>' + x + '</option>').join('') + '</select></td><td><button class="btn sm bad" data-act="cancelProj" data-arg="' + p.id + '">Cancel</button></td></tr>').join('') + '</table>' : '<p class="muted">Nothing running — all team hours this turn would be wasted.</p>', '<span class="xs muted">' + h(G.Robot.slotText(S)) + '</span>') + '</div>';
    if (inSeason) {
      const year = R.year;
      o += '<h2 class="mt">' + h(G.Career.seasonName(S, year)) + ' robot</h2><div class="grid g3">';
      G.Robot.describe(S).forEach(d => {
        const s = d.design, c = d.concept;
        const busy = S.projects.some(p => p.sub === d.id && p.type !== 'copy'), copying = S.projects.some(p => p.sub === d.id && p.type === 'copy');
        let body = s.ver ? '<div class="b">' + h(c.name) + ' ' + UI.tag('v' + s.ver, 'acc') + '</div><div class="sm muted">' + Object.keys(s.stats).map(k => (D.STAT[k] || k) + ' ' + s.stats[k]).join(' · ') + (d.id !== 'soft' ? ' · Rel ' + s.rel : '') + '</div>' + (d.id !== 'soft' ? copiesLine(S, d.id) : '<div class="mb"></div>') : s.concept === 'none' ? '<div class="muted mb">' + (d.id === 'intake' && G.Seasons.sub(year, 'effector') ? 'None: the end effector collects the pieces' : 'No mechanism') + '</div>' : (G.Seasons.sub(year, d.id) || {}).optional ? '<div class="muted mb">' + (d.id === 'intake' && G.Seasons.sub(year, 'effector') ? 'Optional: without one, the end effector collects the pieces itself' : 'Optional: most robots do without it') + '</div>' : '<div class="warn mb">Not built yet</div>';
        let btns = '';
        if (d.id === 'soft') {
          btns = '<button class="btn sm" data-act="upgradeModal" data-arg="soft" ' + (busy ? 'disabled' : '') + '>Upgrade code</button><button class="btn sm" data-act="startSimple" data-arg="auto">New auto routine</button><button class="btn sm" data-act="startSimple" data-arg="vision">Vision upgrade</button>';
          body += '<div class="sm">Auto: <b>' + h(G.Seasons[year].autoTiers[R.autoTier]) + '</b> · Vision Lv <b>' + R.visionLvl + '</b></div>';
        } else {
          btns = '<button class="btn sm ' + (s.ver || (G.Seasons.sub(year, d.id) || {}).optional ? '' : 'primary') + '" data-act="conceptModal" data-arg="' + d.id + '" ' + (busy ? 'disabled' : '') + '>' + (s.ver ? 'Switch concept' : 'Choose concept') + '</button>' +
            (s.ver ? '<button class="btn sm" data-act="upgradeModal" data-arg="' + d.id + '" ' + (busy ? 'disabled' : '') + '>Upgrade</button>' + copyBtn(S, d.id, copying) + '<button class="btn sm" data-act="startSimpleSub" data-arg="harden|' + d.id + '" ' + (busy ? 'disabled' : '') + '>Harden</button><button class="btn sm" data-act="startSimpleSub" data-arg="light|' + d.id + '" ' + (busy ? 'disabled' : '') + '>Lighten</button>' : '');
        }
        o += UI.card(h(d.name) + (busy ? ' ' + UI.tag('in progress', 'info') : '') + (copying ? ' ' + UI.tag('copy being built', 'info') : ''), body + '<div class="row wrap gap4 mt">' + btns + '</div>');
      });
      o += UI.card('Program projects', '<div class="col">' +
        '<div class="row"><div class="sp"><b>Second robot</b><div class="xs muted">Build copies of subsystems here ("Build copy"), or in the Garage a quick test chassis (a simple drivetrain for early code and driver testing) or a full copy of the robot. Pick which robot competes and which one the drivers practice on there.</div></div><button class="btn sm" data-act="nav" data-arg="garage">Garage</button></div>' +
        simpleRow('impact', 'Impact Award submission', 'Write your Impact story. Required to compete for the Impact Award this season (see HQ for your odds).') +
        kbRow() + '</div>');
      o += '</div>';
      const w = G.Robot.weight(S);
      o += '<div class="row mt sm"><span>Robot weight: <b class="' + (w > 125 ? 'bad' : '') + '">' + w + ' lb</b> / 125 lb</span></div>';
    } else {
      o += '<div class="hint mt">' + (S.phase === 'off' ? 'Robot development begins at Kickoff when the game is revealed. In the offseason, research builds Tech Knowledge that carries into future games.' : 'No robot yet.') + '</div>';
      o += '<div class="mt">' + UI.card('Program projects', kbRow()) + '</div>';
    }
    // research
    o += '<h2 class="mt">Research (pre-season development)</h2><div class="sub">Builds Tech Knowledge directly. Useful any time — essential in the offseason.</div>';
    o += '<table class="t"><tr><th>Project</th><th>Area</th><th>Level</th><th class="num">Hours</th><th class="num">Cost</th><th class="num">XP</th><th></th></tr>' + D.RESEARCH.map(r => {
      const q = G.Robot.quote(S, { type: 'research', rid: r.id });
      return '<tr><td>' + h(r.name) + '</td><td>' + h(D.AREA[r.area].name) + '</td><td>Lv ' + G.Robot.know(S, r.area) + '</td><td class="num">' + q.hours + '</td><td class="num">' + U.money(q.cost) + '</td><td class="num">+' + r.xp + '</td><td><button class="btn sm" data-act="startResearch" data-arg="' + r.id + '" ' + (q.err ? 'disabled title="' + h(q.err) + '"' : '') + '>Start</button></td></tr>';
    }).join('') + '</table>';
    return o;
  } };
  // Where the built copies of a subsystem are: on each robot, and how many in storage
  function copiesLine(S, k) {
    const R = S.robot, d = R.design[k];
    const where = R.bots.map(b => { const u = b.subs[k]; return h(b.name) + ' ' + (u && u.ver ? (u.concept === d.concept ? '<b class="' + (u.ver >= d.ver ? 'good' : 'warn') + '">v' + u.ver + '</b>' : '<span class="warn">old concept</span>') : '<span class="dim">—</span>'); });
    const st = G.Robot.storeCount(R, k);
    return '<div class="xs muted mb">' + UI.icon('garage', 12) + ' ' + where.join(' · ') + (st ? ' · ' + st + ' in storage' : '') + '</div>';
  }
  function copyBtn(S, k, copying) {
    const q = G.Robot.quote(S, { type: 'copy', sub: k });
    const tip = q.err ? q.err : q.name + ': ' + q.hours + ' h · ' + U.money(q.cost) + (q.note ? '. ' + q.note : '');
    return '<button class="btn sm" data-act="startSimpleSub" data-arg="copy|' + k + '" ' + (q.err || copying ? 'disabled ' : '') + 'title="' + h(tip) + '">Build copy</button>';
  }
  function simpleRow(type, name, desc) {
    const q = G.Robot.quote(G.S, { type });
    return '<div class="row"><div class="sp"><b>' + h(name) + '</b><div class="xs muted">' + h(desc) + '</div></div><span class="xs muted">' + q.hours + ' h · ' + U.money(q.cost) + '</span><button class="btn sm" data-act="startSimple" data-arg="' + type + '" ' + (q.err ? 'disabled title="' + h(q.err) + '"' : '') + '>Start</button></div>';
  }
  // the Knowledge Base: built once, then brought up to date every year
  function kbRow() {
    const S = G.S;
    if (!S.equip.kb) return simpleRow('kb', 'Knowledge Base', 'Team wiki + CAD library: halves the know-how lost in unused areas at the end of a season. It needs a short update every year after that.');
    if (G.Career.kbCurrent(S) || S.projects.some(p => p.type === 'kb')) return '<div class="row"><div class="sp"><b>Knowledge Base</b><div class="xs muted">' + (G.Career.kbCurrent(S) ? 'Up to date for this season: unused areas lose half as much know-how. The next yearly update is due after the season.' : 'The yearly update is under way.') + '</div></div>' + UI.tag(G.Career.kbCurrent(S) ? 'up to date' : 'updating', G.Career.kbCurrent(S) ? 'good' : 'info') + '</div>';
    return simpleRow('kb', 'Knowledge Base: yearly update', 'The wiki and the CAD library are a year old. Until they are updated they do not slow the loss of know-how.');
  }
  UI.A.overtime = v => { G.S.overtime = v; UI.render(); };
  UI.A.robotNick = v => { if (G.S.robot) { G.S.robot.nick = String(v || '').trim().slice(0, 28); G.Save.write('auto'); } };
  UI.A.startSuggest = () => { const sg = G.Robot.suggest(G.S); if (!sg) return; if (!UI.err(G.Robot.startProject(G.S, sg.spec))) { UI.toast('Started: ' + sg.title, 'good'); UI.render(); } };
  // ---------------- team hours: where this turn's hours go ----------------
  const PCOL = ['#f5b800', '#3ecf8e', '#4aa3ff', '#c77dff', '#ff8a5c', '#5ce1e6', '#ffd24d', '#9be15d'];
  UI.projEta = function (S, p, plan) {
    const hrs = (plan.give[p.id] || 0) + ((plan.pol && plan.pol[p.id]) || 0), k = plan.mult(p), rate = hrs * k;
    if (rate < 0.5) return p.done >= p.need - 0.01 ? '<span class="xs muted">waiting for spare hours to polish</span>' : '<span class="warn">no hours</span>';
    const turns = Math.ceil((p.need + (p.extra || 0) - p.done - (p.polish || 0)) / rate - 1e-6), unit = S.phase === 'off' ? 'month' : 'week';
    return '<b>+' + Math.round(hrs) + ' h</b>' + (plan.pol && plan.pol[p.id] > 0.5 ? ' <span class="xs info" title="Extra hours on quality">(' + Math.round(plan.pol[p.id]) + ' extra)</span>' : '') + (k !== 1 ? ' <span class="xs warn">×' + k.toFixed(2) + '</span>' : '') + '<div class="xs muted">' + (turns <= 1 ? 'finishes this ' + unit : '~' + turns + ' ' + unit + 's left') + '</div>';
  };
  // Testing hours (practice-field time, like wind-tunnel hours): split between development testing and driver practice
  UI.testPanel = function (S, compact) {
    const C = G.Career, th = C.testHours(S);
    if (!th.unlocked) return compact ? '' : '<div class="sm muted">No testing hours yet. They come from a <b>test chassis or second robot</b> (Garage: ' + D.CHASSIS_TEST_HOURS + ' h a week from a chassis built in a day or two, once the season has started) and from a <b>Practice Field</b> (Workshop: ' + D.EQUIP.find(e => e.id === 'pfield').fx.test.join(' / ') + ' h a week by level). Use them to test upgrades or to let the drive team practice.</div><div class="row mt"><button class="btn sm" data-act="nav" data-arg="garage">Garage</button><button class="btn sm" data-act="nav" data-arg="workshop">Workshop</button></div>';
    if (!th.total) return compact ? '' : '<div class="sm muted">No testing time this turn.</div>';
    const unit = th.unit, conf = G.Robot.eventStart(S, { year: S.year }).conf, pw = S.practiceWeeks || 0;
    const devN = S.projects.filter(th.limited ? G.Robot.chassisTestable : G.Robot.testable).length, cap = G.Robot.testCap(S), devUse = Math.round(th.dev - G.Robot.testPlan(S, th.dev, C.hoursPlan(S).give, th.limited).idle);
    if (compact) return '<div class="sm mt"><span class="muted">Testing ' + th.total + ' h:</span> <span class="info">' + th.dev + ' h dev</span> · <span class="dat">' + th.drive + ' h driving</span> · confidence ' + Math.round(conf * 100) + '%</div>';
    const pct = v => Math.round(100 * v / Math.max(1, th.total));
    let o = (th.limited ? '<div class="hint mb">' + UI.icon('garage', 14) + ' <b>Test chassis</b>: no Practice Field, so these hours are in the shop or parking lot. Development testing works on robot code, autos, vision and drivetrain projects only, at half the cost; driver practice counts ' + Math.round(D.CHASSIS_ELEM * 100) + '%. A Practice Field (Workshop) unlocks full testing.</div>' : '') +
      '<div class="row wrap mb"><div><span class="hnum">' + th.total + ' h</span> <span class="xs muted">testing this ' + unit + '</span></div><span class="sp"></span>' +
      '<div class="row wrap gap4">' + C.TEST_SPLITS.map(v => '<button class="btn sm ' + (Math.abs((S.testSplit == null ? 0.5 : S.testSplit) - v) < 0.01 ? 'sel' : '') + '" data-act="testSplit" data-arg="' + v + '"' + (th.canDrive ? '' : ' disabled') + '>' + (v === 0 ? 'All dev' : v === 1 ? 'All driving' : Math.round((1 - v) * 100) + ' / ' + Math.round(v * 100)) + '</button>').join('') + '</div></div>' +
      '<div class="hbar"><span style="width:' + pct(th.dev) + '%;background:var(--info)" title="Development testing ' + th.dev + ' h"></span><span style="width:' + pct(th.drive) + '%;background:var(--data)" title="Driver practice ' + th.drive + ' h"></span></div>' +
      '<div class="row xs muted mt"><span class="cdot" style="background:var(--info)"></span>Development testing<span class="cdot" style="background:var(--data);margin-left:12px"></span>Driver practice</div>';
    // development testing
    let dv = '<b class="info">Development testing · ' + th.dev + ' h</b><div class="xs muted">Test upgrades on the field: projects finish faster (up to +' + Math.round(D.TEST_GAIN * D.TEST_PER_PROJ * 100) + '% a ' + unit + ') and come out better (bigger gains, more reliable). Each project can use up to ' + cap + ' h a ' + unit + ', and only about ' + Math.round(D.TEST_SHARE * 100) + '% of the build hours it gets, so bigger programs can use more. ' + U.money(D.TEST_COST) + ' per hour in parts.</div>';
    if (th.dev) {
      if (!devN) dv += '<div class="xs warn mt">No projects to test' + (th.limited ? ' on a chassis (code, autos, vision or drivetrain)' : '') + ': these hours will go unused.</div>';
      else dv += '<div class="xs mt">' + devN + ' project' + (devN > 1 ? 's' : '') + ' can use ' + devUse + ' h · about ' + U.money(devUse * D.TEST_COST * (th.limited ? D.CHASSIS_TEST_COST : 1)) + '</div>' + (devUse < th.dev ? '<div class="xs warn">' + (th.dev - devUse) + ' h can\'t be used: your projects aren\'t getting enough build hours to test that much. Shift time to driving or run more projects.</div>' : '');
    }
    // driver practice
    let dr = '<b class="dat">Driver practice · ' + th.drive + ' h</b><div class="xs muted">Builds drive-team skills and confidence (faster cycles, cleaner alignment, fewer fouls, surer climbs). Cheap: about ' + D.DRILL_SPARES + ' spare parts per hour and a little battery wear.</div>';
    if (!th.canDrive) dr += '<div class="xs warn mt">No robot to drive yet. All testing time goes to development.</div>';
    else {
      dr += '<div class="statrow wide mt"><span class="n">Practice ' + pw.toFixed(1) + '/' + D.DRILL_CAP + '</span>' + UI.bar(pw, D.DRILL_CAP, 'var(--data)') + '<span class="v">' + Math.round(conf * 100) + '%</span></div><div class="xs muted">Event-start confidence ' + Math.round(conf * 100) + '% (resets at Kickoff; a typical team sits around 60%).' + (pw >= D.DRILL_CAP - 0.05 ? ' <span class="good">Fully practiced: extra hours now only build skills.</span>' : '') + '</div>';
      if (th.elem < 0.99) dr += '<div class="xs warn">Game elements fill ' + Math.round(G.Parts.elemFill(S, G.Parts.elemYear(S)) * 100) + '% of your practice field: driver practice is ' + Math.round(th.elem * 100) + '% effective (<a href="#" data-act="partsElem">Inventory → Game elements</a>).</div>';
      { const bi = G.Robot.driveBot(S), R = S.robot, fam = bi >= 0 ? G.Robot.famAvg(R, bi) : null;
        if (bi >= 0) dr += '<div class="xs mt">Drivers practice on <b>' + h(R.bots[bi].name) + '</b>' + (bi === (R.comp || 0) ? ' (the competition robot)' : ' <span class="warn">(not the competition robot)</span>') + (fam != null ? ' · familiarity ' + Math.round(fam * 100) + '%' : '') + ' · <a href="#" data-act="nav" data-arg="garage">Garage</a></div>';
        if (th.drive && S.parts.spares <= 0 && bi >= 0) dr += '<div class="xs bad">Out of spare parts: practice will wear ' + h(R.bots[bi].name) + '.</div>';
        if (R && R.year === S.year) {
          const dd = S.defDrill || 0, two = G.Robot.twoBots(S);
          if (two || dd > 0) dr += '<div class="statrow wide mt"><span class="n">Defense drills</span>' + UI.bar(dd * 100, 100, 'var(--info)') + '<span class="v">' + Math.round(dd * 100) + '%</span></div><div class="xs muted">' + (two ? 'With two robots running, one plays defender in practice' : 'Needs a second running robot (a test chassis is enough)') + ': at 100% your drivers lose ' + Math.round(D.DEF_DRILL_EFFECT * 100) + '% less speed, cycle time and accuracy to a defender. Resets at Kickoff.</div>';
          else dr += '<div class="xs muted mt">A second running robot (a test chassis is enough) adds <b>defense drills</b>: drivers learn to keep cycling against a defender.</div>';
        } }
    }
    if (S.robot && S.robot.year === S.year && S.phase !== 'off' && G.Robot.runnable(S.robot, G.Robot.other(S.robot))) {
      const R = S.robot, cd = G.Robot.compDrive(S), od = R.bots[G.Robot.other(R)].subs.drive, fam = k => D.DRIVE_FAMILY[k];
      dv += G.Robot.chassisMatch(S) ? '<div class="xs good mt">' + UI.icon('check', 12) + ' Path planning: ' + h(R.bots[G.Robot.other(R)].name) + ' drives like the competition robot (' + fam(od.concept) + '), so auto routines and auto upgrades develop ' + Math.round(D.CHASSIS_PATH * 100) + '% faster, and the team gains Autonomous Pathing XP every week.</div>'
        : cd ? '<div class="xs muted mt">Path planning: ' + h(R.bots[G.Robot.other(R)].name) + ' is a ' + fam(od.concept) + ' drive and the competition robot is ' + fam(cd) + ', so paths tested on it don\'t carry over. (Tank: Kitbot and West Coast. Holonomic: Mecanum and Swerve.)</div>' : '';
    }
    if (S.robot && S.robot.year === S.year && S.phase !== 'off' && (G.Robot.secondRuns(S) || S.elecShake > 0)) {
      const es = S.elecShake || 0, E = D.ELEC_SHAKE_EFFECT, on = G.Robot.secondRuns(S);
      dv += '<div class="statrow wide mt"><span class="n">Electrical shakedown</span>' + UI.bar(es * 100, 100, 'var(--info)') + '<span class="v">' + Math.round(es * 100) + '%</span></div><div class="xs muted">' + (on ? 'The second robot is a full control system to wire, power up and debug early' : 'Needs a second running robot (a test chassis is enough) to grow') +
        ': at 100% the competition robot has ' + Math.round(E[0] * 100) + '% fewer brownouts and comms dropouts at its first event, ' + Math.round(E[1] * 100) + '% at the second and ' + Math.round(E[2] * 100) + '% after that. It grows with the testing hours you run (' + D.ELEC_SHAKE_HOURS + ' h for 100%) and adds Electrical & Reliability XP every week. Resets at Kickoff.</div>';
    }
    o += '<div class="grid g2 mt">' + '<div>' + dv + '</div><div>' + dr + '</div></div>';
    const lt = S.lastTest;
    if (lt) o += '<div class="xs dim mt">Last ' + unit + ': ' + lt.devUsed + ' h testing (+' + lt.bonus + ' h of progress)' + (lt.devIdle ? ', ' + lt.devIdle + ' h unused' : '') + ' · ' + lt.drive + ' h driving' + (lt.spares ? ', ' + lt.spares + ' spare' + (lt.spares > 1 ? 's' : '') + ' used' : '') + (lt.wear ? ', robot wore ' + lt.wear + '%' : '') + '.</div>';
    o += '<div class="hint mt">Small teams: driver practice is the cheapest performance you can buy. Once the drive team is fully practiced, extra hours do more as development testing, especially with many projects running.</div>';
    return o;
  };
  UI.A.partsElem = () => { UI.st.partsTab = 'elem'; UI.go('parts'); };
  UI.A.testSplit = v => { G.Career.setTestSplit(G.S, v); UI.render(); };
  UI.hoursPanel = function (S, compact) {
    const C = G.Career, plan = C.hoursPlan(S), bd = C.turnHours(S, C.isEventTurn(S), true);
    const total = bd.total, act = Math.min(S.actHours, total), used = U.sum(Object.values(plan.give)) + U.sum(Object.values(plan.pol || {})), idle = plan.idle;
    const unit = S.phase === 'off' ? 'month' : 'week', pct = v => (total > 0 ? 100 * v / total : 0);
    const segs = S.projects.map((p, i) => ({ p, h: (plan.give[p.id] || 0) + ((plan.pol && plan.pol[p.id]) || 0), c: PCOL[i % PCOL.length] }));
    const bar = '<div class="hbar">' + segs.filter(s => s.h > 0.5).map(s => '<span style="width:' + pct(s.h) + '%;background:' + s.c + '" title="' + h(s.p.name) + ': ' + Math.round(s.h) + ' h"></span>').join('') +
      (act ? '<span class="act" style="width:' + pct(act) + '%" title="Sponsor obligations: ' + act + ' h"></span>' : '') + (idle > 0.5 ? '<span class="idle" style="width:' + pct(idle) + '%" title="Idle: ' + Math.round(idle) + ' h"></span>' : '') + '</div>';
    let o = '<div class="hnums"><div><div class="hnum">' + total + ' h</div><div class="l">Team hours</div></div><div><div class="hnum good">' + Math.round(used) + ' h</div><div class="l">On projects</div></div>' +
      (act ? '<div><div class="hnum">' + act + ' h</div><div class="l">Sponsor duties</div></div>' : '') + '<div><div class="hnum ' + (idle > 1 ? 'warn' : 'dim') + '">' + Math.round(idle) + ' h</div><div class="l">Idle</div></div></div>' + bar;
    if (compact) return o + (idle > 10 ? '<div class="xs warn mt">' + Math.round(idle) + ' h will go unused this ' + unit + '.</div>' : '');
    o += '<div class="hlegend mt">' + segs.map(s => '<span><i style="background:' + s.c + '"></i>' + h(s.p.name) + ': +' + Math.round(s.h) + ' h</span>').join('') + (act ? '<span><i style="background:#6c7884"></i>Sponsor duties: ' + act + ' h</span>' : '') + (idle > 0.5 ? '<span><i style="background:#2a323b"></i>Idle: ' + Math.round(idle) + ' h</span>' : '') + '</div>';
    o += '<div class="xs muted mt">' + bd.students + ' students × ' + bd.perStudent + ' h + ' + Math.round(bd.ment) + ' mentor h · ' + h(bd.why) + ' · morale ×' + bd.moraleM.toFixed(2) + (bd.boost > 1 ? ' · boost ×' + bd.boost.toFixed(2) : '') +
      '. One project can absorb up to ' + Math.round(G.Robot.capFor(S, { prio: 'normal' })) + ' h per ' + unit + ' (high priority +25%, low −25%). Hours are spent when you press Continue.</div>';
    if (idle > 10) {
      const free = G.Robot.slots(S) - G.Robot.slotUsed(S);
      const inSeason = ['kickoff', 'build', 'comp'].includes(S.phase), share = total ? idle / total : 0;
      o += '<div class="' + (inSeason && share <= 0.2 ? 'hint' : 'warnbox') + ' mt">' + Math.round(idle) + ' h idle this ' + unit + '. ' + (inSeason && share <= 0.2 ? 'Some idle time is good: about 10% keeps the team\'s fatigue steady. ' : '') + (free > 0 ? 'Start another project (' + free + ' free slot' + (free > 1 ? 's' : '') + ')' : 'All slots are busy') + ', or give a project <b>extra hours</b> to raise its quality.</div>';
    }
    return o;
  };
  UI.fatigueLine = function (S) {
    const fp = G.Career.fatiguePreview(S);
    if (!fp) return '';
    const d = fp.next - fp.now, col = fp.next > 60 ? 'bad' : fp.next > 40 ? 'warn' : 'good';
    return '<div class="row sm mt">' + UI.icon('fatigue', 15) + '<span>Fatigue</span>' + UI.fatigueBar(fp.now, true) + '<span><b>' + fp.now + '</b> → <b class="' + col + '">' + fp.next + '</b> (' + G.Career.fatigueLabel(fp.next) + ')' + (S.overtime ? ' <span class="warn">overtime: no recovery</span>' : '') + '</span><span class="sp"></span><span class="xs muted">' + fp.idlePct + '% idle' + (d > 0 ? ' · keep about 10% idle to hold steady' : '') + '</span></div>';
  };
  UI.A.projExtra = (v, el) => { const p = G.S.projects.find(x => x.id === el.dataset.id); if (p && !G.Robot.isFab(p)) { p.extra = U.clamp(Math.round(Number(v) || 0), 0, p.need); UI.render(); } };
  UI.A.prio = (v, el) => { const p = G.S.projects.find(x => x.id === el.dataset.id); if (p) p.prio = v; };
  UI.A.cancelProj = id => UI.confirm('Cancel project?', 'Progress is lost; you get a partial refund of materials.', 'Cancel project', () => { G.Robot.cancelProject(G.S, id); UI.render(); });
  UI.A.startChassis = cid => { if (!UI.err(G.Robot.startProject(G.S, { type: 'testChassis', concept: cid }))) { UI.toast('Test chassis started (Fabrication)', 'good'); UI.render(); } };
  UI.A.startSimple = type => { if (!UI.err(G.Robot.startProject(G.S, { type }))) { UI.toast('Project started', 'good'); UI.render(); } };
  UI.A.startSimpleSub = arg => { const [type, sub] = arg.split('|'); if (!UI.err(G.Robot.startProject(G.S, { type, sub }))) { UI.toast('Project started', 'good'); UI.render(); } };
  UI.A.startResearch = rid => { if (!UI.err(G.Robot.startProject(G.S, { type: 'research', rid }))) { UI.toast('Research started', 'good'); UI.render(); } };
  UI.st.effort = 'std';
  function effortPicker() {
    return '<div class="row mb"><span class="sm muted">Effort:</span>' + Object.keys(G.Robot.EFFORT).map(k => '<button class="btn sm ' + (UI.st.effort === k ? 'sel' : '') + '" data-act="setEffort" data-arg="' + k + '">' + G.Robot.EFFORT[k].name + '</button>').join('') + '<span class="xs muted">Rush: 60% hours, weaker result, fault risk · Thorough: 140% hours, better result</span></div>';
  }
  UI.A.setEffort = k => { UI.st.effort = k; if (UI.st.modalFn) UI.st.modalFn(); };
  UI.A.conceptModal = function (subId) {
    const S = G.S, year = S.robot.year, sd = G.Seasons.sub(year, subId), cur = G.Robot.des(S.robot, subId);
    UI.st.modalFn = () => UI.A.conceptModal(subId);
    let o = '<div class="xs muted">DEVELOPMENT DIRECTION</div><h2>' + h(sd.name) + '</h2>' + effortPicker();
    if (cur.ver) o += '<div class="warnbox mb">Switching concept restarts this subsystem at v1 on the competition robot (25% of the old work turns into knowledge XP). The old one goes to storage, and the drivers will need time to get used to the new one.</div>';
    o += '<div class="xs muted mb">The first one of any concept or version is a prototype (+' + Math.round((D.PROTO_COST - 1) * 100) + '% materials). More copies are cheaper: use Build copy afterwards.</div>';
    o += '<div class="col">' + sd.concepts.map(c => {
      if (c.id === cur.concept && cur.ver) return '';
      if (c.id === 'none') return '<div class="choice"><div class="row"><b>' + h(c.name) + '</b><span class="sp"></span><button class="btn sm" data-act="noneConcept" data-arg="' + subId + '">Choose</button></div><div class="sm muted">' + h(c.desc) + '</div></div>';
      const q = G.Robot.quote(S, { type: 'build', sub: subId, concept: c.id, effort: UI.st.effort });
      const first = G.Robot.firstTime(S, c), core = G.Robot.coreAreas(c);
      const ceil = Object.keys(c.ceil).map(k => (D.STAT[k] || k) + ' ' + c.base[k] + '→<b>' + G.Robot.ceil(S, year, subId, c, k) + '</b>').join(' · ');
      const areas = c.areas.map(a => '<span class="tag ' + (G.Robot.know(S, a) > 0 ? 'good' : core.includes(a) ? 'warn' : '') + '" title="' + (core.includes(a) ? 'Core area: needed for the first-time penalty, build hours and ceilings' : 'Supporting area') + '">' + h(D.AREA[a].name) + ' Lv' + G.Robot.know(S, a) + (core.includes(a) ? ' ★' : '') + '</span>').join(' ');
      const bom = G.Parts.bom(year, subId, c), bomTxt = Object.keys(bom).map(k => bom[k] + ' ' + D.PART_CAT[k].short.toLowerCase()).join(' · ');
      const want = G.Parts.kits(year, subId, c), wantTxt = Object.keys(want).map(k => want[k] + ' ' + D.PART_CAT[k].short.toLowerCase().replace(/s$/, want[k] > 1 ? 's' : '') + ' (' + Math.min(want[k], G.Parts.kitsFree(S, k)) + ' free)').join(' + ');
      const kitTag = (Object.keys(want).length ? UI.tag('COTS kits ' + Math.round(q.kitCov * 100) + '%' + (q.kitCov ? ': −' + Math.round((1 - D.KIT_HOURS) * q.kitCov * 100) + '% hours' : ''), q.kitCov > 0.99 ? 'good' : q.kitCov ? 'info' : '') : '') +
        (q.kop ? UI.tag(D.PART_CAT[q.kop].name + (q.kopUse ? ': −' + Math.round(D.KOP_KIT_HOURS * 100) + '% hours' : q.kitCov ? ' not needed' : ' 0/1'), q.kopUse ? 'good' : '') : '') +
        (q.frameWant ? UI.tag('GridTube ' + q.frame + '/' + q.frameWant + (q.frame ? ': −' + Math.round(D.FRAME_HOURS * q.frame / q.frameWant * 100) + '% hours' : ''), q.frame >= q.frameWant ? 'good' : q.frame ? 'info' : '') : '');
      return '<div class="choice"><div class="row"><b>' + h(c.name) + '</b>' + UI.tag('complexity ' + c.cx) + (first && q.kitCov < 0.99 ? UI.tag('first time!', 'warn') : '') + kitTag + '<span class="sp"></span><span class="sm muted">' + q.hours + ' h · ' + U.money(q.cost) + ' · ' + c.w + ' lb</span><button class="btn sm primary" data-act="buildConcept" data-arg="' + subId + '|' + c.id + '" ' + (q.err ? 'disabled' : '') + '>Build</button></div>' +
        '<div class="sm muted">' + h(c.desc) + '</div><div class="sm mt">' + ceil + '</div>' + (bomTxt ? '<div class="xs muted mt">' + UI.icon('parts', 12) + ' Uses ' + h(bomTxt) + '</div>' : '') + (subId === 'drive' && G.Parts.driveNote(S, c.id) ? '<div class="xs muted">' + UI.icon('gear', 12) + ' ' + h(G.Parts.driveNote(S, c.id)) + '</div>' : '') + (wantTxt ? '<div class="xs muted">' + UI.icon('gear', 12) + ' Mechanism kits it can use: ' + h(wantTxt) + '. Each one cuts hours and materials; a full set removes the first-build penalty.</div>' : '') +
        (q.kop ? '<div class="xs muted">' + UI.icon('box', 12) + ' Kit of Parts: a ' + h(D.PART_CAT[q.kop].name) + ' (' + G.Parts.kitsFree(S, q.kop) + ' free) saves ' + Math.round(D.KOP_KIT_HOURS * 100) + '% of the hours and ' + Math.round(D.KOP_KIT_COST * 100) + '% of the materials. Only the simplest concept of a subsystem can use one, and not together with a COTS kit.</div>' : '') +
        (q.frameWant ? '<div class="xs muted">' + UI.icon('parts', 12) + ' GridTube frame stock: can use ' + q.frameWant + ' bundle' + (q.frameWant > 1 ? 's' : '') + ' (' + Math.min(q.frameWant, G.Parts.kitsFree(S, 'kFrame')) + ' free). With all of them: −' + Math.round(D.FRAME_HOURS * 100) + '% hours and −' + Math.round(D.FRAME_COST * 100) + '% materials, on top of the kits.</div>' : '') + (q.note ? '<div class="xs warn">' + h(q.note) + '</div>' : '') + '<div class="row wrap gap4 mt">' + areas + '</div>' + (q.err ? '<div class="sm bad mt">' + h(q.err) + ' <a href="#" data-act="closeAndGo" data-arg="parts">Open the Inventory</a></div>' : '') + '</div>';
    }).join('') + '</div>';
    UI.modal(o, { wide: true });
  };
  UI.A.noneConcept = function (subId) {
    const S = G.S;
    G.Robot.setNone(S, subId);
    UI.closeModal(); UI.toast('No mechanism for this subsystem.'); UI.render();
  };
  UI.A.buildConcept = function (arg) {
    const [sub, concept] = arg.split('|');
    if (!UI.err(G.Robot.startProject(G.S, { type: 'build', sub, concept, effort: UI.st.effort }))) { UI.closeModal(); UI.toast('Build project started', 'good'); UI.render(); }
  };
  UI.A.upgradeModal = function (subId) {
    const S = G.S, year = S.robot.year, sd = G.Seasons.sub(year, subId), s = G.Robot.des(S.robot, subId), c = G.Seasons.concept(year, subId, s.concept);
    UI.st.modalFn = () => UI.A.upgradeModal(subId);
    let o = '<div class="xs muted">UPGRADE</div><h2>' + h(sd.name) + ' — ' + h(c.name) + ' v' + s.ver + '</h2>' + effortPicker() + '<p class="sm muted">Pick a focus. The focus stat closes about 25% of its gap to the ceiling; other stats improve a little. The upgraded part goes on the competition robot (the first of a new version is a prototype: +' + Math.round((D.PROTO_COST - 1) * 100) + '% materials). The second robot keeps its version until you build it a copy.</p><div class="col">';
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
    if (!UI.err(G.Robot.startProject(S, { type: 'upgrade', sub, focus, effort: UI.st.effort, forConcept: G.Robot.des(S.robot, sub).concept }))) { UI.closeModal(); UI.toast('Upgrade started', 'good'); UI.render(); }
  };

  // =====================================================================
  // KNOWLEDGE
  // =====================================================================
  UI.S.know = { html() {
    const S = G.S, rel = S.year && S.phase !== 'off' ? G.Seasons[S.year].relevance : null;
    let o = UI.head('Tech Knowledge', 'know', 'What your program knows how to build. It carries over between seasons — a turret built for one shooting game makes the next one easier. It also dates: unused areas fade, and each offseason rule changes and new designs make part of it outdated.', 'design');
    o += '<div class="hint mb">Each level: +3 to stat ceilings, −6% build hours, +4 starting reliability, +5% upgrade quality for concepts that use the area. Level 0 on a complex concept means a first-time penalty. Areas not used during a season lose 20% XP (students graduate) unless a mentor specializes in it' + (S.equip.kb ? (G.Career.kbCurrent(S) ? ' — your Knowledge Base halves this' : ' — your Knowledge Base would halve this, but it needs its yearly update (Design Office)') : '') + '. From your second season, rule and vendor changes in May (−' + Math.round(D.TECH_RULE_PCT * 100) + '% XP in two areas) and new designs in summer (−' + Math.round(D.TECH_DESIGN_PCT * 100) + '% in three) also date what you know; a specialist mentor halves that loss, and XP banked beyond ' + Math.round(D.KNOW_THRESH[D.KNOW_THRESH.length - 1] * D.TECH_CAP) + ' does not count. <b>Level ' + D.TECH_DEEP_LVL + ' and 5 know-how is tuned to the way things were</b>: a change costs it half as much again and always takes a level, with or without a mentor.</div>';
    o += '<table class="t"><tr><th>Area</th><th>Level</th><th style="width:30%">Progress</th>' + (rel ? '<th>' + h(G.Seasons[S.year].name) + ' relevance</th>' : '') + '<th>Mentor</th><th>Used this season</th></tr>';
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
    let o = UI.head('Team', 'team', S.studentsCount + (S.studentsCount >= D.STUDENT_CAP ? ' students (full: the cap is ' + D.STUDENT_CAP + ')' : ' students') + ' · morale ' + Math.round(S.morale) + (G.Career.inSeason(S) ? ' · fatigue ' + UI.fatigueBar(S.fatigue) + ' ' + Math.round(S.fatigue) + ' (' + G.Career.fatigueLabel(S.fatigue) + ')' : '') + ' · ' + S.feeders + ' feeder program(s)', 'team');
    const mc = G.Career.mentorCoach(S), mcName = G.Career.mentorSkill(S, 'coach') ? 'Drive Coach mentor' : G.Career.mentorSkill(S, 'strat') * 0.8 >= 30 ? 'Strategy mentor fills in' : 'A mentor fills in';
    const opts = (sel, inclMentor, none) => (none ? '<option value=""' + (!sel ? ' selected' : '') + '>Nobody</option>' : '') + (inclMentor ? '<option value="mentor" ' + (sel === 'mentor' ? 'selected' : '') + '>' + mcName + ' (Strategy ' + mc + ')</option>' : '') + S.students.map(s => '<option value="' + s.id + '" ' + (sel === s.id ? 'selected' : '') + '>' + h(s.name) + ' (gr ' + s.grade + ')</option>').join('');
    o += '<div class="grid g2 top"><div class="col">' + UI.card(UI.it('team', 'Drive team'), '<div class="grid g2 tight">' +
      '<label class="f">Driver<select class="inp" data-chg="dt" data-k="driver">' + opts(S.driveTeam.driver) + '</select></label>' +
      '<label class="f">Operator<select class="inp" data-chg="dt" data-k="operator">' + opts(S.driveTeam.operator) + '</select></label>' +
      '<label class="f">Human player<select class="inp" data-chg="dt" data-k="hp">' + opts(S.driveTeam.hp) + '</select></label>' +
      '<label class="f">Coach<select class="inp" data-chg="dt" data-k="coach">' + opts(S.driveTeam.coach, true) + '</select></label>' +
      '<label class="f" title="Optional. In the pits before every match: Mechanism speeds up repairs, Composure catches mistakes such as wrong code, a loose bumper or a flat battery">Technician<select class="inp" data-chg="dt" data-k="tech">' + opts(S.driveTeam.tech, false, true) + '</select></label></div>' +
      '<div class="row mt"><span class="xs muted sp">Driver: Driving, Awareness, Composure · Operator: Mechanism, Composure · HP: HP skill (' + (G.Seasons[S.year] && G.Seasons[S.year].hpLoad ? 'loads the robot all match in this game: it sets the cycle speed' : 'a small part in this game') + ') · Coach: Strategy · Technician: Mechanism (pit repairs up to +' + Math.round(100 * 85 / D.TECH_ROLE.repair) + '%), Composure (fewer pre-match mistakes) · ' + G.Career.coachCalls(S, false) + ' Coach Calls per match (playoffs +1)</span><button class="btn sm" data-act="autoDT">Auto-pick best</button></div>');
    // activities
    const lim = G.Career.actLimits(S), C = G.Career, ir = C.impactRating(S);
    o += UI.card(UI.it('trophy', 'Impact Award ') + UI.tag(Math.round(ir.score) + '/100', ir.score >= 80 ? 'good' : ir.score >= 65 ? 'acc' : ''),
        '<div class="sm muted mb">Judges reward sustained, multi-season impact: a one-season push rarely beats long-running Impact programs, and a team can win it once per season. ' +
        (ir.submitted ? '<span class="good">Submission done.</span>' : '<span class="warn">No submission yet: start "Impact Award submission" in the Design Office or you can\'t win it.</span>') + '</div>' +
        Object.keys(C.IMPACT_W).map(k => '<div class="statrow wide"><span class="n" title="' + h(IMPACT_TIP[k]) + '">' + h(C.IMPACT_LABEL[k]) + ' <span class="dim">' + Math.round(C.IMPACT_W[k] * 100) + '%</span></span>' + UI.bar(ir.parts[k], 100, UI.colorFor(ir.parts[k])) + '<span class="v">' + Math.round(ir.parts[k]) + '</span></div>').join('') +
        (function () { const pb = ir.pitchBy; return '<div class="hint mt"><b>Presentation ' + Math.round(ir.parts.pitch) + '</b> = Business mentor <b>' + pb.biz + '</b>' + (pb.bizSkill ? ' (60% of skill ' + pb.bizSkill + ')' : ' (none hired: a Business & Outreach mentor adds up to 60)') +
          ' + presenters <b>' + pb.stu + '</b> (60% of ' + (pb.names.length ? pb.names.map(x => h(x.name) + ' ' + x.v).join(' and ') : 'an untrained pair, 25') + ': the average of Strategy and Awareness)' +
          ' + meeting room <b>' + pb.room + '</b>' + (pb.room ? '' : ' (a Team Meeting Room adds up to ' + D.EQUIP.find(e => e.id === 'meeting').fx.pitch.slice(-1)[0] + ')') + '.' +
          '<div class="xs mt">To raise it: hire a better Business mentor, grow two students\' Strategy and Awareness (drive coach and driver roles, driver practice, Strategy-focus feeder programs) and build a meeting room in the Workshop.</div></div>'; })() +
        '<div class="xs muted mt">Hover a line for what moves it. Outreach has diminishing returns; track record averages your last three seasons. Typical regional winners rate 80+, and the FIRST Impact Award at the Championship takes about 90. Per-event odds are on HQ.</div>') + feederCard(S) + '</div>';
    o += UI.card(UI.it('outreach', 'Outreach & fundraising ') + UI.tag(lim.used + '/' + lim.max + ' this ' + lim.unit, lim.used >= lim.max ? 'warn' : ''), '<div class="sm muted mb">Up to ' + lim.max + ' activities per ' + lim.unit + ', each type ' + (lim.perType > 1 ? 'up to ' + lim.perType + ' times' : 'once') + '. Repeating an activity in the same month pays less; it resets every month. Outreach this season: <b>' + Math.round(S.season.impact) + '</b> points from ' + S.season.outreach + ' events.</div><div class="col">' +
      ['outreach', 'fund', 'rest'].map(kind => '<div class="xs muted b mt">' + { outreach: 'OUTREACH', fund: 'FUNDRAISING', rest: 'TEAM' }[kind] + '</div>' + D.ACTIVITIES.filter(a => a.kind === kind).map(a => {
        const ok = C.actAvailable(S, a), n = lim.counts[a.id] || 0, blocked = !ok || n >= lim.perType || lim.used >= lim.max, fat = C.fundFatigue(S, a.id);
        const why = !ok ? 'Locked' : n >= lim.perType ? 'Done' + (lim.perType > 1 ? ' ' + n + '×' : '') : lim.used >= lim.max ? 'Limit reached' : 'Do it' + (lim.perType > 1 && n ? ' (' + n + '/' + lim.perType + ')' : '');
        const gain = a.kind === 'outreach' ? '+' + Math.round(a.impact * fat * (a.robot && G.Shop.lvl(S, 'trailer') ? D.TRAILER_OUTREACH : 1) * (1 + G.Shop.fx(S, 'meeting', 'outreach'))) + ' outreach' + (a.money ? ' · +$' : '') : a.kind === 'rest' ? 'fatigue −' + (-a.fatigue) : 'raises money';
        return '<div class="row act ' + (ok ? '' : 'locked') + '"><span class="aico">' + UI.icon(ok ? a.icon || 'outreach' : 'lock', 18) + '</span><div class="sp"><b>' + h(a.name) + '</b> <span class="xs muted">' + h(ok ? a.desc : a.reqText || '') + '</span></div><span class="xs muted">' + gain + (fat < 1 && ok ? ' · <span class="warn">×' + fat.toFixed(2) + ' this month</span>' : '') + ' · ' + (a.cost ? U.money(a.cost) : 'free') + '</span><button class="btn sm" data-act="doAct" data-arg="' + a.id + '" ' + (blocked ? 'disabled' : '') + '>' + why + '</button></div>';
      }).join('')).join('') + '</div>') + '</div>';
    // roster
    const th = (t, tip, cls) => '<th' + (cls ? ' class="' + cls + '"' : '') + ' title="' + h(tip) + '">' + t + '</th>';
    o += '<h2 class="mt">Core students</h2><table class="t"><tr><th>Name</th>' + th('Grade', 'School grade. Grade 12 students graduate in June.') +
      th('Drive', 'Driving. Driver: how fast the robot moves and lines up to score.', 'num') + th('Aware', 'Awareness. Driver: reads the field, so defenders cost less time and fewer fouls happen. Also one half of an Impact Award presenter.', 'num') +
      th('Comp', 'Composure. Driver and Operator (their average): holding up against defense, fewer tips and fouls, following Coach Calls. Technician: fewer pre-match mistakes.', 'num') +
      th('Mech', 'Mechanism skill. Operator: faster intake and scoring actions. Technician: faster pit repairs between matches.', 'num') +
      th('HP', 'Human Player skill: how fast the robot is loaded. It counts for a lot in the games where the human player feeds the robot all match (2017, 2019, 2020, 2023, 2024, 2025) and for little in the others.', 'num') +
      th('Strat', 'Strategy. Drive Coach: better Coach Calls and a better read of the season\'s strategies. Also the other half of an Impact Award presenter.', 'num') +
      th('Potential', 'How far this student can still grow. Skills grow by playing matches in a role and by driver practice.') + th('Matches', 'Official matches played on the drive team, in any role.', 'num') + th('Role', 'Current drive team role (set above).') + '</tr>' +
      S.students.slice().sort((a, b) => b.grade - a.grade).map(s => {
        const role = s.id === S.driveTeam.driver ? 'Driver' : s.id === S.driveTeam.operator ? 'Operator' : s.id === S.driveTeam.hp ? 'Human Player' : s.id === S.driveTeam.coach ? 'Coach' : s.id === S.driveTeam.tech ? 'Technician' : '';
        const a = s.attr, f = v => '<td class="num" style="color:' + UI.colorFor(v) + '">' + Math.round(v) + '</td>';
        return '<tr><td>' + h(s.name) + (s.from ? '<div class="xs muted">via ' + h(s.from) + '</div>' : '') + '</td><td>' + s.grade + '</td>' + f(a.drive) + f(a.aware) + f(a.comp) + f(a.mech) + f(a.hp) + f(a.strat) + '<td class="acc">' + '★'.repeat(Math.max(1, Math.round(s.pot / 20))) + '</td><td class="num">' + s.matches + '</td><td>' + (role ? UI.tag(role, 'acc') : '') + '</td></tr>';
      }).join('') + '</table><p class="sm muted">Seniors (grade 12) graduate in June. New students join in September — more with good reputation, outreach and feeder programs.</p>';
    return o;
  } };
  UI.A.dt = (v, el) => { G.S.driveTeam[el.dataset.k] = v; UI.render(); };
  UI.A.autoDT = () => { G.Career.autoDriveTeam(G.S); UI.render(); };
  UI.A.doAct = id => { const r = G.Career.doActivity(G.S, id); if (typeof r === 'string') return UI.err(r); UI.toast(r.msg, 'good'); UI.render(); };
  const IMPACT_TIP = {
    outreach: 'Outreach points earned this season, with diminishing returns: about 190 points give 50, about 450 give 80.',
    record: 'The average outreach of your last three seasons on the same scale. It only moves with time, which is why a one-season push rarely wins.',
    pitch: 'Business mentor (60% of their skill) + your two best presenters (60% of their average Strategy and Awareness) + a Team Meeting Room.',
    programs: 'Feeder programs: three established balanced programs give 100. Outreach-focus programs and your own FTC teams count for more.',
    rep: 'Your reputation, as shown in the top bar.' };
  function feederCard(S) {
    const C = G.Career, list = S.programs || [], fo = C.feederOutlook(S), full = list.length >= D.FEEDER_MAX;
    const AT = { drive: 'Drive', aware: 'Aware', comp: 'Comp', mech: 'Mech', hp: 'HP', strat: 'Strat' };
    const sel = pg => '<select class="inp" style="width:auto;flex:none" data-chg="progFocus" data-id="' + pg.id + '" title="Changing the focus costs a year of growth (free while the program is new)">' + Object.keys(D.FEEDER_FOCUS).map(k => '<option value="' + k + '"' + (pg.focus === k ? ' selected' : '') + '>' + h(D.FEEDER_FOCUS[k].name) + '</option>').join('') + '</select>';
    const rows = list.map(pg => {
      const st = C.programStage(pg), F = D.FEEDER_FOCUS[pg.focus] || D.FEEDER_FOCUS.balanced;
      return '<div class="card flat mb"><div class="row"><b>' + h(pg.name) + '</b>' + (pg.own ? ' ' + UI.tag('own FTC team · ' + U.money(D.FTC_OWN.cost) + '/yr', 'acc') : '') + '<span class="sp"></span>' + UI.tag(st, st === 'Established' ? 'good' : st === 'Growing' ? 'info' : '') + '<span class="xs muted">' + Math.round(C.programMaturity(pg) * 100) + '%</span></div>' +
        '<div class="row mt">' + sel(pg) + '<span class="xs muted sp">' + h(F.desc) + '</span><button class="btn sm bad" data-act="closeProg" data-arg="' + pg.id + '">Close</button></div></div>';
    }).join('');
    const look = fo.n ? Object.keys(AT).map(k => AT[k] + ' <b>+' + Math.round(fo.attr[k]) + '</b>').join(' · ') : '';
    const body = '<div class="sm muted mb">FLL, FTC, camps and clubs that grow your next generation. Each costs ' + U.money(D.FEEDER_COST) + ' a year (paid in September) and grows over three school years (60% → 85% → 100% strength). Every September they add students to the team, and the core recruits who come from a program bring the skills its focus trains. ' +
      (C.ownMax(S) ? 'Your FTC Team Space runs ' + C.ownTeams(S) + ' of ' + C.ownMax(S) + ' own FTC team' + (C.ownMax(S) > 1 ? 's' : '') + ': each takes a program slot, costs ' + U.money(D.FTC_OWN.cost) + ' a year and counts ' + D.FTC_OWN.power + '× for recruit quality.' : 'An <b>FTC Team Space</b> (Workshop) lets you run your own FTC teams: ' + U.money(D.FTC_OWN.cost) + ' a year each and ' + D.FTC_OWN.power + '× the recruit quality.') + '</div>' +
      (list.length ? rows : '<p class="muted">No feeder programs yet. Start one: it pays off next September and keeps growing after that.</p>') +
      (fo.n ? '<div class="hint mt"><b>Next September</b>: about +' + fo.size.toFixed(1) + ' extra recruits, and ' + Math.round(fo.share * 100) + '% of core recruits come through your programs. Average recruit skill bonus: ' + look + '. Impact "Feeder programs": <b>' + Math.round(Math.min(100, fo.impact / 3 * 100)) + '</b>/100. Cost ' + U.money(C.programCost(S)) + '/yr.</div>' : '');
    return '<div class="mt">' + UI.card(UI.it('sprout', 'Feeder programs ') + UI.tag(list.length + '/' + D.FEEDER_MAX, full ? 'warn' : ''), body,
      (C.ownMax(S) ? '<button class="btn sm" data-act="addOwnProg" ' + (full || C.ownTeams(S) >= C.ownMax(S) ? 'disabled' : '') + ' title="Your own FTC team in the FTC Team Space: ' + U.money(D.FTC_OWN.cost) + ' a year, much stronger recruits. ' + C.ownTeams(S) + ' of ' + C.ownMax(S) + ' running.">+ Own FTC team</button>' : '') +
      '<button class="btn sm primary" data-act="addProg" ' + (full ? 'disabled' : '') + ' title="' + U.money(D.FEEDER_COST) + ' a year, paid in September">+ Start a program</button>') + '</div>';
  }
  UI.A.addOwnProg = () => { const e = G.Career.addProgram(G.S, 'balanced', true); if (e) return UI.err(e); const pg = G.S.programs[G.S.programs.length - 1]; UI.toast(pg.name + ' founded. Pick its focus (free while it is new).', 'good'); UI.render(); };
  UI.A.addProg = () => { const e = G.Career.addProgram(G.S, 'balanced'); if (e) return UI.err(e); const pg = G.S.programs[G.S.programs.length - 1]; UI.toast(pg.name + ' started. Pick its focus (free while it is new).', 'good'); UI.render(); };
  UI.A.closeProg = id => { const pg = (G.S.programs || []).find(p => p.id === id); if (!pg) return; UI.confirm('Close ' + pg.name + '?', 'It stops costing money, but its ' + G.Career.programStage(pg).toLowerCase() + ' community is gone: a new program starts from scratch.', 'Close program', () => { G.Career.closeProgram(G.S, id); UI.render(); }); };
  UI.A.progFocus = (v, el) => { const pg = (G.S.programs || []).find(p => p.id === el.dataset.id); if (!pg) return; const was = pg.years || 0; G.Career.setProgramFocus(G.S, pg.id, v); UI.toast(pg.name + ': ' + G.Data.FEEDER_FOCUS[v].name + ' focus' + (was ? ' (now ' + G.Career.programStage(pg).toLowerCase() + ')' : ''), 'good'); UI.render(); };

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
    let o = '<h1>Mentors</h1><div class="sub">Costs cover recruiting, travel and training; charged at hire and each Kickoff.</div>';
    o += '<div class="grid g3 mb">' + D.MENTOR_ROLES.map(r => '<div class="card flat"><b>' + h(r.name) + '</b><div class="xs muted">' + h(r.desc) + '</div></div>').join('') + '</div>';
    o += UI.card('Your mentors ' + UI.tag(S.mentors.length + '/8', S.mentors.length >= 8 ? 'warn' : ''), S.mentors.length ? '<table class="t">' + hd + S.mentors.map(m => mentorRow(m, '<button class="btn sm bad" data-act="releaseM" data-arg="' + m.id + '">Release</button>')).join('') + '</table>' : '<p class="muted">No mentors.</p>');
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
    let o = UI.head('Workshop', 'workshop', 'Facilities make every project faster and better. They wear down: renovate to restore them, upgrade for more. Each level takes floor space, and the school decides how much room you have. Upkeep is charged per level at Kickoff.', 'workshop');
    { const Sh = G.Shop, used = Sh.spaceUsed(S), sp = Sh.space(S), nx = Sh.nextSpace(S), n = v => v.toLocaleString('en-US'), PAL = ['#4aa3ff', '#3ecf8e', '#f5b800', '#9b6bff', '#ff8a3d', '#22b8c8', '#ff5fa2', '#aab4bf', '#9ad53a', '#e5484d', '#7c8cff', '#c9a227'];
      const seg = D.EQUIP.map((e, i) => { const z = Sh.sizeOf(e.id, Sh.lvl(S, e.id)); return z ? '<span style="width:' + (100 * z / D.SPACE_MAX).toFixed(2) + '%;background:' + PAL[i % PAL.length] + '" title="' + h(e.name) + ': ' + n(z) + ' sq ft"></span>' : ''; }).join('');
      o += '<div class="card mb"><div class="ct">Workshop space ' + UI.tag(D.SPACE_TIERS[S.spaceTier || 0].title + ' · level ' + ((S.spaceTier || 0) + 1) + ' of ' + D.SPACE_TIERS.length, 'acc') + ' ' + UI.tag(n(used) + ' / ' + n(sp) + ' sq ft', sp - used < 40 ? 'warn' : '') + ' ' + UI.tag(n(sp - used) + ' sq ft free', sp - used < 40 ? 'warn' : 'good') + '<span class="sp"></span>' +
        (S.schoolGrant ? UI.tag('School grant: ' + S.schoolGrant + ' free upgrade' + (S.schoolGrant > 1 ? 's' : '') + ' (up to ' + U.money(D.BOARD.cap) + ')', 'good') : '') + '</div>' +
        '<div class="hbar spacebar">' + seg + '<span class="free" style="width:' + (100 * Math.max(0, sp - used) / D.SPACE_MAX).toFixed(2) + '%" title="Free: ' + n(Math.max(0, sp - used)) + ' sq ft"></span><span class="idle" style="flex:1" title="Not yours yet: ' + n(D.SPACE_MAX - sp) + ' sq ft"></span></div>' +
        '<div class="row wrap xs muted mt" style="gap:4px 12px">' + D.EQUIP.map((e, i) => { const z = Sh.sizeOf(e.id, Sh.lvl(S, e.id)); return z ? '<span><span class="cdot" style="background:' + PAL[i % PAL.length] + '"></span>' + h(e.name) + ' ' + n(z) + '</span>' : ''; }).join('') + '</div>' +
        '<div class="xs muted mt">The team works in ' + h(D.SPACE_TIERS[S.spaceTier || 0].name) + '. Every facility level takes floor space, so a small room forces choices. ' +
        (nx ? 'The school hands over ' + h(nx.name) + ' (' + n(nx.sqft) + ' sq ft) when Program Support is <b>' + nx.sup + '</b> or higher at a season review (it is ' + Math.round(S.support) + ' now). Room is never taken back.' : 'That is all the room there is: it fits every facility at its top level.') + ' The trailer parks outside.</div></div>'; }
    o += '<div class="card mb"><div class="ct">Facilities<span class="sp"></span>' + UI.tag('+' + G.Shop.facilitySlots(S) + ' project slots', G.Shop.facilitySlots(S) ? 'acc' : '') + ' ' + UI.tag('Upkeep ' + U.money(G.Shop.upkeep(S)) + '/season') + '</div><div class="grid g2">' + D.EQUIP.map(e => facilityBox(S, e)).join('') + '</div></div>';
    o += '<div class="row mt">' + UI.icon('parts', 16) + '<span class="sm muted">Motors, electronics, mechanism kits, game elements, spare parts and batteries are in the </span><button class="btn sm" data-act="nav" data-arg="parts">Inventory</button></div>';
    return o;
  } };
  function facilityBox(S, e) {
    const Sh = G.Shop, l = Sh.lvl(S, e.id), max = e.levels.length;
    const up = Sh.upgradeCost(S, e.id), reno = Sh.renoCost(S, e.id);
    let o = '<div class="card flat"><div class="row wrap"><span class="fico">' + UI.icon(e.id, 22) + '</span><b>' + h(e.name) + '</b>' + UI.tag('Lv ' + l + '/' + max, l ? 'acc' : '') + ' ' + UI.tag(e.id === 'trailer' ? 'parks outside' : Sh.sizeOf(e.id, Math.max(1, l)).toLocaleString('en-US') + ' sq ft') + '<span class="sp"></span>' + (l ? '<span class="xs muted">' + h(e.levels[l - 1].name) + '</span>' : '<span class="xs dim">not owned</span>') + '</div>';
    const need = Sh.spaceNeed(S, e.id), blk = up != null ? Sh.spaceBlock(S, e.id) : null;
    o += '<div class="xs muted mb">' + h(e.desc) + (e.id === 'trailer' ? ' Far events become a long drive instead of a flight (15% cheaper, no air-freight damage), robot demos wear the robot less and robot outreach counts 20% more.' : '') + '</div>';
    if (l) {
      const c = Sh.cond(S, e.id), eff = Sh.eff(S, e.id);
      o += '<div class="statrow"><span class="n">Condition</span>' + UI.bar(c, 100, UI.colorFor(c)) + '<span class="v">' + Math.round(c) + '%</span></div>' +
        '<div class="sm">Now (' + Math.round(eff * 100) + '% efficiency): <span class="good">' + h(Sh.effectText(S, e.id)) + '</span></div>' +
        (eff < 0.99 ? '<div class="xs muted">At full condition: ' + h(Sh.effectText(S, e.id, l, 1)) + '</div>' : '') +
        (Sh.fx(S, e.id, 'slot', l, 1) && !Sh.slotOf(S, e.id) ? '<div class="xs bad">Below ' + Sh.SLOT_COND + '% condition: its project slot is out of action until you renovate.</div>' : '');
    }
    if (e.id === 'pfield') o += UI.elemStatus(S);
    if (up != null) o += '<div class="xs muted mt">' + (l ? 'Level ' + (l + 1) + ' — ' + h(e.levels[l].name) : 'Level 1 — ' + h(e.levels[0].name)) + ': ' + h(Sh.effectText(S, e.id, l + 1, 1)) + (e.id === 'trailer' ? '' : ' · ' + (need ? '+' + need + ' sq ft' : 'no extra room')) + '</div>' +
      (blk ? '<div class="xs bad">Not enough room: needs ' + need + ' sq ft, ' + Math.max(0, Sh.spaceFree(S)) + ' sq ft free.</div>' : '');
    o += '<div class="row wrap gap4 mt">';
    if (l) o += '<button class="btn sm" data-act="renoEq" data-arg="' + e.id + '" ' + (reno ? '' : 'disabled') + '>' + (reno ? 'Renovate · ' + U.money(reno) : 'Like new') + '</button>';
    if (up != null) o += '<button class="btn sm ' + (l ? '' : 'primary') + '" data-act="buyEq" data-arg="' + e.id + '"' + (blk ? ' disabled title="' + h(blk) + '"' : '') + '>' + (l ? 'Upgrade to Lv ' + (l + 1) : 'Buy') + ' · ' + U.money(up) + '</button>' +
      (Sh.grantOk(S, e.id) ? '<button class="btn sm" style="border-color:var(--good);color:var(--good)" data-act="grantEq" data-arg="' + e.id + '" title="Paid by the school board\'s equipment grant">Use school grant</button>' : '');
    else o += UI.tag('top level', 'good');
    o += '</div><div class="xs dim mt">Upkeep ' + U.money(e.upkeep) + '/season per level · wears ' + [e.wear.season ? e.wear.season + '%/build week' : '', e.wear.off ? e.wear.off + '%/offseason month' : '', e.wear.event ? e.wear.event + '%/event' : ''].filter(Boolean).join(', ') + '</div></div>';
    return o;
  }
  // Game elements on the practice field: this game's sets, preorders on the way, how full the field is
  UI.elemStatus = function (S) {
    const P = G.Parts, y = P.elemYear(S), ny = P.nextYear(S), fs = P.fieldSize(S);
    const line = (yr, label) => {
      const sets = P.elemSets(S, yr), pend = P.elemPending(S, yr), fill = P.elemFill(S, yr);
      const chips = sets.map(e => '<span class="tag">' + P.setName(e.s) + ' ' + Math.round(e.h * 100) + '%</span>').concat(pend.map(e => '<span class="tag info">' + P.setName(e.s) + ' · pending</span>')).join(' ');
      return '<div class="row sm wrap gap4">' + UI.icon('elements', 14) + '<span>' + label + ' (' + yr + ')</span>' + (S.elemKop && S.elemKop[yr] ? '<span class="tag">KOP pieces</span>' : '') + chips +
        (yr === y ? '<span class="sp"></span><span class="xs ' + (fill >= 0.99 ? 'good' : 'warn') + '">' + (fs ? 'field ' + Math.round(fill * 100) + '% filled' : 'kit pieces are enough') + '</span>' : '') + '</div>';
    };
    let o = '<div class="hr"></div><div class="xs muted mb">Game elements · ' + (fs ? 'this field fits a ' + P.setName(fs).toLowerCase() + ' set' : 'no practice field: the kit game pieces cover it') + '</div>';
    if (y != null) o += line(y, P.inSeason(S) ? 'This season' : 'Last season');
    if (ny != null && (P.elemPending(S, ny).length || P.elemSets(S, ny).length)) o += line(ny, 'Next season');
    if (y == null && (ny == null || !P.elemPending(S, ny).length)) o += '<div class="xs muted">No game elements yet.</div>';
    return o + '<div class="row mt"><button class="btn sm" data-act="partsElem">Game elements in the Inventory</button></div>';
  };
  UI.A.buyEq = id => { if (!UI.err(G.Career.buyEquip(G.S, id))) { UI.toast('Done — ' + G.Shop.item(id).levels[G.Shop.lvl(G.S, id) - 1].name + ' ready', 'good'); UI.render(); } };
  UI.A.grantEq = id => { if (!UI.err(G.Career.buyEquip(G.S, id, { grant: true }))) { UI.toast('The school board paid for your ' + G.Shop.item(id).levels[G.Shop.lvl(G.S, id) - 1].name, 'good'); G.Save.write('auto'); UI.render(); } };
  UI.A.renoEq = id => { const cost = G.Shop.renoCost(G.S, id); if (!UI.err(G.Shop.renovate(G.S, id))) { UI.toast('Renovated for ' + U.money(cost) + ' — back to 100%', 'good'); UI.render(); } };
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
  // Sponsor money at a glance: this season (base paid, bonuses reached and still possible) and next season (expected base, bonus ceiling)
  UI.sponsorSummary = function (S) {
    const C = G.Career, nx = C.sponsorNext(S), inS = C.inSeason(S), now = inS ? Object.assign({ year: S.year }, C.sponsorSeason(S)) : S.lastSponsor || null;
    const num = (v, lbl) => '<div><div class="hnum">' + v + '</div><div class="l">' + lbl + '</div></div>', pl = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
    let a = '<div class="xs b muted">' + (inS ? 'THIS SEASON' : 'LAST SEASON') + (now && now.n ? ' · ' + C.calYear(S, now.year) : '') + '</div>';
    if (!now || !now.n) a += '<p class="sm muted mt">' + (inS ? 'No sponsor has paid this season.' : S.history.length ? 'No sponsors were on board last season.' : 'No season played yet. Sponsors pay their base at Kickoff and a bonus the moment a goal is met.') + '</p>';
    else {
      const left = now.possible - now.reached;
      a += '<div class="hnums mt">' + num(U.money(now.base), 'base paid · ' + pl(now.n, 'sponsor')) + num('<span class="good">' + U.money(now.reached) + '</span>', 'bonus reached · ' + now.met + ' of ' + pl(now.goals, 'goal')) + num(U.money(inS ? left : now.possible), inS ? 'bonus still possible' : 'bonus was possible') + '</div>' +
        '<div class="row"><div class="sp">' + UI.bar(now.reached, Math.max(1, now.possible), 'var(--good)') + '</div><span class="xs nowrap">' + U.money(now.reached) + ' of ' + U.money(now.possible) + '</span></div>' +
        '<div class="xs muted mt">' + (!inS ? 'Bonus goals start again at Kickoff.' : !now.goals ? 'Your sponsors set no bonus goals.' : left > 0 ? 'Open goals are marked • under each sponsor below. A bonus is paid the moment its goal is met.' : 'Every bonus goal is met.') + '</div>';
    }
    let b = '<div class="xs b muted">NEXT SEASON' + (nx ? ' · ' + nx.year : '') + '</div>';
    if (!nx) b += '<p class="sm muted mt">' + (S.mode === 'career' ? 'This is the last season of the career.' : 'Single season: there is no next season.') + '</p>';
    else {
      b += '<div class="hnums mt">' + num(U.money(nx.settled ? nx.contract : nx.expected), nx.settled ? 'base at Kickoff · ' + pl(nx.contractN, 'sponsor') : 'expected base') + num('<span class="good">' + U.money(nx.bonus + nx.renewBonus) + '</span>', 'possible max bonus') + '</div>';
      const li = [];
      if (!nx.settled) {
        li.push('Under contract: <b>' + U.money(nx.contract) + '</b> from ' + pl(nx.contractN, 'sponsor') + (nx.bonus ? ', bonuses up to ' + U.money(nx.bonus) : '') + '.');
        if (nx.renew.length) li.push('Up for renewal after this season: ' + nx.renew.map(r => h(r.name) + ' (<b class="' + (r.chance >= 0.6 ? 'good' : r.chance >= 0.4 ? 'warn' : 'bad') + '">' + Math.round(r.chance * 100) + '%</b> chance, then ' + U.money(r.base) + ')').join(', ') + '. The chance is their satisfaction at the season review (every missed goal costs 8 points), and satisfied sponsors also pay more.');
        if (nx.ending.length) li.push('Ends after this season: ' + nx.ending.map(h).join(', ') + ' (grants run for one season).');
        li.push('New offers for open slots arrive in October.');
      } else li.push(nx.open.length ? 'Open slots: ' + nx.open.map(x => pl(x.n, x.k === 'partner' ? 'partner' : x.k)).join(', ') + (S.offers.length ? '. Offers are waiting below.' : '. New offers arrive in October.') : 'Every sponsor slot is filled.');
      if (nx.biz) li.push('Base amounts include +10% from your business mentor.');
      b += '<div class="xs muted">' + li.join('<br>') + '</div>';
    }
    return '<div class="mb">' + UI.card('Sponsor funding', '<div class="grid g2"><div>' + a + '</div><div>' + b + '</div></div>') + '</div>';
  };
  function goalsTxt(sp) { return sp.goals.map(g => '<div class="xs">' + (g.met ? '✔ ' : '• ') + h(G.Career.goalText(G.S, D.GOALS[g.id].text)) + ' <span class="good">+' + U.money(G.Career.goalPay(sp, g)) + '</span></div>').join(''); }
  UI.S.finance = { html() {
    const S = G.S, C = G.Career;
    let o = UI.head('Finance', 'finance', 'Budget ' + U.money(S.money) + ' · sponsors pay at Kickoff each season · bonuses when goals are met.', 'money');
    const sf = C.stemFundInfo(S);
    if (S.money < D.STEM_FUND.below) o += '<div class="card hl mb"><div class="row">' + UI.icon('fund', 22) + '<div class="sp"><b>STEM support fund</b><div class="sm muted">Emergency money for teams running low (under ' + U.money(D.STEM_FUND.below) + '): ' + U.money(sf.amt) + ' now, but people hear about it (reputation −' + sf.rep + '). ' + sf.left + ' of ' + D.STEM_FUND.uses + ' applications left this program year.</div></div><button class="btn primary" data-act="stemFund" ' + (sf.ok ? '' : 'disabled') + '>Apply · +' + U.money(sf.amt) + '</button></div></div>';
    if (C.highExpect(S)) o += '<div class="hint mb">' + UI.icon('trophy', 14) + ' Top program: sponsors offer a little more, but they expect wins. Sponsors with <b>High</b> expectations lose a lot of satisfaction in seasons without a regional win or a Championship spot.</div>';
    // in-season debt: allowed, settled by the school at the season review
    if (C.inSeason(S)) {
      const debt = Math.max(0, -S.money), pen = C.debtPenalty(debt, S.debtRun);
      o += '<div class="' + (debt ? 'warnbox' : 'hint') + ' mb">' + (debt ? 'You are <b>' + U.money(debt) + '</b> in debt. ' : '') + 'During the season you can spend into debt (up to ' + U.money(D.DEBT_LIMIT) + '). The school clears it at the season review, but the board docks program support and reputation' + (debt ? ': right now that would be <b>support −' + pen.support + ', reputation −' + pen.rep + '</b>' : ' — the bigger the debt, the bigger the hit') + '.' + (S.debtRun ? ' Last season also ended in debt, so penalties are ×' + C.debtPenalty(0, S.debtRun).mult.toFixed(1) + '.' : ' Repeat overdrafts in consecutive seasons cost more.') + ' Strong results can make it worth the risk.</div>';
    } else if (S.money < 0) o += '<div class="warnbox mb">In the offseason you can only spend cash you have. Fundraisers still work while you are in the red.</div>';
    o += UI.sponsorSummary(S);
    o += '<div class="grid g2">';
    const sl = C.sponsorSlots(S), slTag = (k, label) => UI.tag(label + ' ' + sl[k].n + '/' + sl[k].max, sl[k].n >= sl[k].max ? 'good' : '');
    const anyOpen = ['title', 'partner', 'grant'].some(k => sl[k].n < sl[k].max && S.offers.some(of => of.slot === k));
    o += UI.card('Sponsors ' + slTag('title', 'Title') + ' ' + slTag('partner', 'Partners') + ' ' + slTag('grant', 'Grant'), S.sponsors.length ? S.sponsors.map(sp =>
      '<div class="card flat mb"><div class="row wrap">' + UI.icon('sponsor', 18) + '<b>' + h(sp.name) + '</b>' + UI.tag(sp.slot === 'title' ? 'TITLE' : sp.slot === 'grant' ? 'GRANT' : 'Partner', sp.slot === 'title' ? 'acc' : '') + '<span class="sp"></span><b>' + U.money(sp.base) + '</b><span class="xs muted">/season · ' + sp.seasonsLeft + ' left</span></div>' +
      '<div class="xs muted">' + h(sp.typeName) + ' · expectations ' + sp.exp + (sp.perk ? ' · Perk: <span class="info">' + h(D.PERKS[sp.perk].name) + '</span>' : '') + '</div>' + goalsTxt(sp) +
      '<div class="row mt"><span class="xs muted">Satisfaction</span><div class="sp">' + UI.bar(sp.sat, 100, UI.colorFor(sp.sat)) + '</div><span class="xs">' + Math.round(sp.sat) + '</span></div>' +
      (C.canUnsign(S, sp) ? '<div class="row mt"><span class="xs info">Signed this turn: you can take it back until you press Continue.</span><span class="sp"></span><button class="btn sm" data-act="unsignSp" data-arg="' + sp.id + '">Undo signing</button></div>' : '') + '</div>').join('') : '<p class="muted">No sponsors. Offers arrive in October.</p>');
    // offers
    o += UI.card('Sponsor offers', S.offers.length ? S.offers.slice().sort((a, b) => ['title', 'partner', 'grant'].indexOf(a.slot) - ['title', 'partner', 'grant'].indexOf(b.slot)).map(of =>
      '<div class="card flat mb"><div class="row wrap">' + UI.icon('sponsor', 18) + '<b>' + h(of.name) + '</b>' + UI.tag(of.slot === 'title' ? 'TITLE' : of.slot === 'grant' ? 'GRANT' : 'Partner', of.slot === 'title' ? 'acc' : '') + '<span class="sp"></span><b>' + U.money(of.base) + '</b><span class="xs muted">/season × ' + of.length + '</span></div>' +
      '<div class="xs muted">' + h(of.typeName) + ' · expectations ' + of.exp + (of.perk ? ' · Perk: <span class="info">' + h(D.PERKS[of.perk].name) + '</span>' : '') + '</div>' + goalsTxt(of) +
      (of.obligations.length ? '<div class="xs warn">Obligations: ' + of.obligations.map(h).join('; ') + '</div>' : '') +
      '<div class="row mt"><span class="sp"></span>' + (sl[of.slot].n >= sl[of.slot].max ? '<span class="xs muted">' + (of.slot === 'partner' ? 'Partner slots full' : 'You already have a ' + (of.slot === 'title' ? 'title sponsor' : 'grant')) + '</span>' : '<button class="btn sm primary" data-act="signSp" data-arg="' + of.id + '">Sign</button>') + '</div></div>').join('') : '<p class="muted">No open offers. New offers arrive each October.</p>',
      '<button class="btn sm" data-act="autoSp" ' + (anyOpen ? '' : 'disabled') + ' title="Signs the best-value offer for every open slot. You can undo any of them until you press Continue.">Auto-pick best</button>');
    o += '</div>';
    // activities
    const acts = S.activities.filter(a => a.year === S.year);
    if (acts.length) o += '<div class="mt">' + UI.card('Sponsor activities ' + G.Career.calYear(S), '<table class="t"><tr><th>Week</th><th>Activity</th><th>Status</th></tr>' + acts.map(a => '<tr><td>Build wk ' + a.week + '</td><td>' + h(a.text) + '</td><td>' + UI.tag(a.status, a.status === 'done' ? 'good' : a.status === 'skipped' ? 'bad' : 'warn') + '</td></tr>').join('') + '</table>') + '</div>';
    // ledger
    o += '<div class="mt">' + UI.card('Ledger', '<table class="t"><tr><th>Date</th><th>Item</th><th class="num">Amount</th></tr>' + S.ledger.slice(0, 40).map(l => '<tr><td class="xs muted">' + h(l.d) + '</td><td>' + h(l.desc) + '</td><td class="num ' + (l.amt < 0 ? 'bad' : 'good') + '">' + U.money(l.amt, l.px) + '</td></tr>').join('') + '</table>') + '</div>';
    return o;
  } };
  UI.A.stemFund = () => { const f = G.Career.stemFundInfo(G.S); UI.confirm('Apply for the STEM support fund?', 'You receive ' + U.money(f.amt) + '. Reputation −' + f.rep + '.', 'Apply', () => { if (!UI.err(G.Career.applyStemFund(G.S))) { UI.toast('STEM support fund: +' + U.money(f.amt), 'good'); UI.render(); } }); };
  UI.A.unsignSp = id => { if (!UI.err(G.Career.unsignSponsor(G.S, id))) { UI.toast('Signing undone: the offer is back on the list', 'good'); UI.render(); } };
  UI.A.autoSp = () => { const r = G.Career.autoSponsors(G.S); UI.toast(r.length ? 'Signed: ' + r.join(', ') : 'No open slots to fill', r.length ? 'good' : ''); UI.render(); };
  UI.A.signSp = id => { if (!UI.err(G.Career.signSponsor(G.S, id))) { UI.toast('Sponsor signed', 'good'); UI.render(); } };

  // =====================================================================
  // CALENDAR
  // =====================================================================
  // Program-year calendar: every turn from May to the season review, with filters
  const CAL_CATS = [['event', 'Events', 'var(--data)'], ['dev', 'Development', 'var(--info)'], ['sponsor', 'Sponsors', 'var(--warn)'], ['program', 'Program', 'var(--good)'], ['money', 'Money', '#c9a7ff']];
  UI.programCalendar = function (S) {
    const f = UI.st.calF = UI.st.calF || { event: true, dev: true, sponsor: true, program: true, money: true };
    const slots = G.Career.calendar(S), months = [];
    slots.forEach(x => { let mo = months.find(m => m.name === x.month && !m.closed); if (!mo) { months.forEach(m => m.closed = true); mo = { name: x.month, slots: [] }; months.push(mo); } mo.slots.push(x); });
    const col = Object.fromEntries(CAL_CATS.map(c => [c[0], c[2]]));
    let o = '<div class="row wrap gap4 mb"><span class="xs muted">Show:</span>' + CAL_CATS.map(c => '<button class="btn sm ' + (f[c[0]] ? 'sel' : '') + '" data-act="calFilter" data-arg="' + c[0] + '"><span class="cdot" style="background:' + c[2] + '"></span>' + c[1] + '</button>').join('') +
      '<span class="sp"></span><span class="xs muted">Today: ' + h(G.Career.dateLabel(S)) + '</span></div>';
    o += '<div class="calgrid">' + months.map(mo => '<div class="calmonth"><div class="calmh">' + mo.name + '</div>' + (mo.slots.some(x => x.cur || x.label !== x.month || x.items.some(it => f[it.cat])) ? '' : '<div class="xs dim calempty">Nothing scheduled</div>') + mo.slots.filter(x => x.cur || x.label !== x.month || x.items.some(it => f[it.cat])).map(x => {
      const items = x.items.filter(it => f[it.cat]);
      return '<div class="calslot' + (x.cur ? ' cur' : x.past ? ' past' : '') + '">' + (x.label !== x.month || x.cur ? '<div class="calsl">' + (x.label !== x.month ? h(x.label) : '') + (x.cur ? ' <span class="tag acc">now</span>' : '') + '</div>' : '') +
        items.map(it => '<div class="calit ' + it.cls + '"><span class="cdot" style="background:' + col[it.cat] + '"></span>' + h(it.text) + '</div>').join('') + '</div>';
    }).join('') + '</div>').join('') + '</div>';
    return UI.card('Program calendar ' + UI.tag(S.phase === 'off' ? 'offseason ' + (S.preseason ? 'pre-season' : '') : String(S.year), 'acc'), o);
  };
  UI.A.calFilter = k => { const f = UI.st.calF = UI.st.calF || { event: true, dev: true, sponsor: true, program: true, money: true }; f[k] = !f[k]; UI.render(); };
  // Month cards scroll on their own: start each one at the current week
  UI.calScroll = () => document.querySelectorAll('.calmonth').forEach(m => { const c = m.querySelector('.calslot.cur'); if (c) m.scrollTop = Math.max(0, c.offsetTop - 40); });
  UI.S.calendar = { after() { UI.calScroll(); }, html() {
    const S = G.S, C = G.Career;
    const nextYear = S.phase === 'off' ? (S.cal ? (S.cal[S.upcoming] || '') : S.orderMode === 'random' && S.mode === 'career' ? 'next season (game revealed at Kickoff)' : (S.order[S.upcoming] || '')) : G.Career.calYear(S);
    const dist = G.World.on(S) ? G.World.myDistrict(S) : null;
    const undoBtn = key => '<button class="btn sm" data-act="undoReg" data-arg="' + key + '" title="Registered this ' + (S.phase === 'off' ? 'month' : 'week') + ': take it back for everything it cost. Once you press Continue it is final.">Undo</button>';
    let o = UI.head('Calendar', 'calendar', '', 'calendar') + UI.programCalendar(S) + '<h2 class="mt">' + (dist ? 'District event registration' : 'Regional registration') + '</h2><div class="sub">' + (dist ? h(dist.name) + ' events' : 'Regionals') + ' for ' + h(String(nextYear)) + ' · registered ' + S.registered.length + '/' + S.maxEvents + ' · next fee ' + U.money(C.regFee(S)) + (C.isLate(S) ? ' + ' + U.money(D.FEES.late) + ' late fee' : '') + '</div>';
    o += dist ? '<div class="hint mb">One registration fee covers <b>two district events</b>: your first two count for district points. A third is extra (' + U.money(D.FEES.extraDistrict) + ') and earns no points. District events are local, two days long, with about 36 teams and 12 qualification matches each. After week 5 the top ' + dist.dcmp + ' teams on the points list go to the <b>' + h(dist.short) + ' District Championship</b> in week 7 (' + U.money(D.FEES.dcmp) + ', points count three times), and the district sends about ' + G.World.slots(S, dist) + ' teams to the Championship. See the District page for the standings.</div>'
      : '<div class="hint mb">Each regional week costs registration + travel and uses most of that week\'s build hours. Early weeks: weaker opponents but a less developed robot. ' + (C.wildEra(S) ? 'Win a regional or an Impact, Engineering Inspiration or Rookie All-Star award to qualify for the Championship. <b>Wildcards:</b> when a team that has already qualified earns another place at a regional, that place goes to the finalist alliance (captain, then first pick, then second pick), so later weeks hand out more of them.' : 'Win a regional, an Impact/EI award, or enough Regional Pool points (best two events, cut-off ' + C.poolThreshold(S) + ') to qualify for the Championship.') + '</div>';
    // the Week 0 scrimmage comes first, then the regional weeks
    const canScrim = (S.phase === 'kickoff' || (S.phase === 'build' && S.week < 7) || S.phase === 'off');
    o += UI.card('Week 0 scrimmage', '<div class="row"><div class="sp sm muted">Cheap practice event before Week 1: real matches, no rankings at stake. Boosts tuning and driver confidence for your first regional. ' + U.money(D.FEES.scrimmage) + ' + local travel.</div>' + (S.scrimmage ? (S.eventsDone['scrim' + S.year] ? UI.tag('done', 'good') : UI.tag('registered', 'good') + ' ' + (C.regUndoable(S, 'scrim') ? undoBtn('scrim') : '<button class="btn sm bad" data-act="withdrawScrim">Withdraw</button>')) : '<button class="btn sm" data-act="regScrim" ' + (canScrim ? '' : 'disabled') + '>Register</button>') + '</div>', '', 'mb');
    for (let w = 1; w <= 6; w++) {
      const list = S.regionals.filter(r => r.week === w);
      o += '<div class="card mb"><div class="ct">Week ' + w + (S.phase === 'comp' && S.week === w ? ' ' + UI.tag('this week', 'acc') : '') + '</div><table class="t"><tr><th>' + (dist ? 'District event' : 'Regional') + '</th><th>Region</th><th>Travel</th><th class="num">Teams</th><th>Strength</th><th></th></tr>' +
        list.map(r => {
          const tier = D.travelTier(S.team.region, r.region, r.local), reg = S.registered.includes(r.id), why = C.canRegister(S, r);
          return '<tr class="' + (reg ? 'me' : '') + '"><td><b>' + h(r.name) + '</b></td><td>' + h(r.region) + '</td><td>' + h(D.TRAVEL[tier].name) + ' ' + U.money(C.travelCost(S, Object.assign({ kind: 'regional' }, r))) + '</td><td class="num">' + r.size + '</td><td class="acc">' + '★'.repeat(r.str) + '</td><td>' +
            (reg ? (S.eventsDone[r.id] ? UI.tag('done', 'good') : C.regUndoable(S, r.id) ? undoBtn(r.id) : '<button class="btn sm bad" data-act="withdraw" data-arg="' + r.id + '" title="' + (C.refundable(S, 'c' + r.week) ? 'Half the fee back' : 'Less than a month away: no refund') + '">Withdraw</button>') : why ? '<span class="xs muted">' + h(why) + '</span>' : '<button class="btn sm primary" data-act="register" data-arg="' + r.id + '">Register</button>') + '</td></tr>';
        }).join('') + '</table></div>';
    }
    // offseason events
    if (S.phase === 'off') {
      o += '<div class="mt">' + UI.card('Offseason events', S.robot ? '<table class="t"><tr><th>Month</th><th>Event</th><th class="num">Teams</th><th class="num">Fee</th><th></th></tr>' + D.OFFSEASON_EVENTS.map(e => '<tr><td>' + e.month + '</td><td>' + h(e.name) + '</td><td class="num">' + e.size + '</td><td class="num">' + U.money(e.fee) + '</td><td>' + (S.offReg.includes(e.id) ? (S.eventsDone[e.id + S.year] ? UI.tag('done', 'good') : UI.tag('registered', 'good') + ' ' + (C.regUndoable(S, 'off:' + e.id) ? undoBtn('off:' + e.id) : '<button class="btn sm bad" data-act="withdrawOff" data-arg="' + e.id + '">Withdraw</button>')) : D.MONTHS.indexOf(e.month) < S.month ? '<span class="xs muted">past</span>' : '<button class="btn sm" data-act="regOff" data-arg="' + e.id + '">Register</button>') + '</td></tr>').join('') + '</table><p class="xs muted">Played with last season\'s robot and game. Double XP for students, reputation and sponsor goodwill.</p>' : '<p class="muted">You need a robot from a completed season to attend offseason events.</p>') + '</div>';
    }
    if (S.phase !== 'off' && S.season.events.length && !dist && !C.wildEra(S)) o += '<div class="mt">' + UI.card('Regional Pool', '<div>Pool total (best two events): <b>' + C.poolTotal(S) + '</b> / cut-off ' + C.poolThreshold(S) + '</div>' + (S.season.champsQualified ? '<div class="good mt">Qualified: ' + h(S.season.champsReason) + '</div>' : '')) + '</div>';
    return o;
  } };
  UI.A.register = id => { if (!UI.err(G.Career.register(G.S, id))) { UI.toast('Registered', 'good'); UI.render(); } };
  const wdText = key => G.Career.refundable(G.S, key) ? 'It is at least a month away, so you get half the fee back.' : 'It is less than a month away: no refund.';
  UI.A.withdraw = id => { const r = G.S.regionals.find(x => x.id === id); UI.confirm('Withdraw from ' + r.name + '?', wdText('c' + r.week), 'Withdraw', () => { G.Career.withdraw(G.S, id); UI.render(); }); };
  UI.A.withdrawOff = id => { const o = D.OFFSEASON_EVENTS.find(x => x.id === id); UI.confirm('Withdraw from ' + o.name + '?', wdText('off' + D.MONTHS.indexOf(o.month)), 'Withdraw', () => { G.Career.withdrawOffseason(G.S, id); UI.render(); }); };
  UI.A.withdrawScrim = () => UI.confirm('Withdraw from the Week 0 scrimmage?', wdText('b7'), 'Withdraw', () => { G.Career.withdrawScrimmage(G.S); UI.render(); });
  UI.A.regScrim = () => { const S = G.S; { const e = G.Career.afford(S, D.FEES.scrimmage); if (e) return UI.err(e); } G.Career.spend(S, D.FEES.scrimmage, 'Week 0 scrimmage'); S.scrimmage = true; (S.regUndo = S.regUndo || {}).scrim = D.FEES.scrimmage; UI.render(); };
  UI.A.undoReg = key => { if (!UI.err(G.Career.undoRegister(G.S, key))) { UI.toast('Registration undone: fee returned', 'good'); UI.render(); } };
  UI.A.regOff = id => { if (!UI.err(G.Career.registerOffseason(G.S, id))) UI.render(); };

  // =====================================================================
  // HISTORY
  // =====================================================================
  UI.S.world = { html() {
    const S = G.S, C = G.Career, W = G.World, ws = S.wseason, su = W.summary(S), d = W.myDistrict(S), me = S.team.num, tab = UI.st.worldTab || (d ? 'standings' : 'results');
    const nm = n => (n === me ? '<b class="acc">' + n + ' ' + h(S.team.name) + '</b>' : n + ' ' + h((S.teams[n] || {}).name || ''));
    let o = UI.head(d ? d.name : 'The world of ' + su.cy, 'event', su.teams + ' teams this season: ' + su.regional + ' play regionals, ' + su.district + ' play in ' + su.districts + ' districts · ' + su.regionals + ' regionals and ' + su.dEvents + ' district events · ' + su.rookies + ' rookie teams', 'basics');
    const tabs = (d ? [['standings', 'District standings']] : []).concat([['results', 'Results'], ['champs', 'Championship places'], ['all', 'All districts']]);
    o += '<div class="row wrap mb">' + tabs.map(t => '<button class="btn sm ' + (tab === t[0] ? 'sel' : '') + '" data-act="worldTab" data-arg="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>';
    const table = (dd, limit) => {
      const st = W.standings(S, dd.id), dq = ws.dq[dd.id], slots = W.slots(S, dd), mine = st.findIndex(r => r.num === me);
      const shown = limit ? st.filter((r, i) => i < limit || Math.abs(i - mine) <= 2 || (i >= dd.dcmp - 2 && i <= dd.dcmp + 1)) : st;
      let last = 0;
      return '<table class="t"><tr><th class="num" title="Place on the district points list">#</th><th>Team</th><th class="num" title="District points from the first district event">Event 1</th><th class="num" title="District points from the second district event">Event 2</th><th class="num" title="10 points for a rookie team, 5 in its second year">Age</th><th class="num" title="District Championship points, counted three times">Champ. ×3</th><th class="num">Total</th><th></th></tr>' +
        shown.map(r => { const gap = r.rank > last + 1 ? '<tr><td colspan="8" class="xs dim" style="text-align:center">…</td></tr>' : ''; last = r.rank;
          const tag = dq && dq.champs ? (dq.champs.includes(r.num) ? UI.tag('Championship', 'acc') : dq.dcmp.includes(r.num) ? UI.tag('District Champ.', 'good') : '') : dq ? (dq.dcmp.includes(r.num) ? UI.tag('District Champ.', 'good') : '') : (r.rank <= dd.dcmp ? '<span class="xs muted">in</span>' : '');
          return gap + '<tr class="' + (r.num === me ? 'me' : '') + '"' + (r.rank === dd.dcmp ? ' style="border-bottom:2px dashed var(--accent)"' : '') + '><td class="num">' + r.rank + '</td><td>' + nm(r.num) + '</td><td class="num">' + (r.e1 == null ? '—' : r.e1) + '</td><td class="num">' + (r.e2 == null ? '—' : r.e2) + '</td><td class="num">' + (r.age || '') + '</td><td class="num">' + (r.cmp == null ? '' : r.cmp) + '</td><td class="num b">' + r.total + '</td><td>' + tag + '</td></tr>'; }).join('') + '</table>' +
        '<div class="xs muted mt">The dashed line is the District Championship cut (top ' + dd.dcmp + '). The district sends ' + slots + ' teams to the Championship: its District Championship Impact, Engineering Inspiration and Rookie All-Star winners, the winning alliance, then the points list.</div>';
    };
    if (tab === 'standings' && d) {
      const mine = (ws.rec[me] || []);
      o += UI.card(h(d.name) + ' ' + UI.tag(W.sizeOf(d, su.cy) + ' teams', 'acc'), '<div class="sm mb">' + h(W.myLine(S) || 'No district event played yet.') + '</div>' +
        (mine.length ? '<div class="kv mb">' + mine.map(r => { const p = W.points(r, G.Era.playoffs(su.cy)), e = ws.events.find(x => x.id === r.e) || {}; return '<span class="k">' + h(e.name || '') + (r.k === 'c' ? ' (×3)' : '') + '</span><span>rank ' + r.r + ' of ' + r.n + ': ' + p.qual + ' · alliance ' + p.sel + ' · playoffs ' + p.po + ' · awards ' + p.aw + ' = <b>' + p.total + '</b></span>'; }).join('') + '</div>' : '') + table(d, 12), '', 'mb');
      o += '<div class="hint">' + UI.icon('info', 14) + ' <b>District points per event:</b> qualification rank (22 for first place down to 4), alliance selection (captains and first picks 16 down to 9, second picks 8 down to 1), playoffs (' + (G.Era.playoffs(su.cy) === 'se' ? '10 for every round won' : 'winner 30, finalist 20, third 13, fourth 7') + '), judged awards (Impact 10, Engineering Inspiration and Rookie All-Star 8, others 5). Rookies add 10 once, second-year teams 5.</div>';
    }
    if (tab === 'results') {
      const mineFirst = e => (d ? (e.dist === d.id ? 0 : 1) : (!e.dist && e.region === S.team.region ? 0 : 1));
      for (let w = 1; w <= 7; w++) {
        const list = ws.events.filter(e => e.week === w).sort((a, b) => mineFirst(a) - mineFirst(b) || (a.dist ? 1 : 0) - (b.dist ? 1 : 0));
        if (!list.length) continue;
        o += UI.card('Week ' + w + (w === 7 ? ' · District Championships' : ''), '<table class="t"><tr><th>Event</th><th>Area</th><th class="num">Teams</th><th>Winners</th><th>Impact Award</th></tr>' + list.map(e =>
          '<tr class="' + (e.teams.includes(me) ? 'me' : '') + '"><td>' + h(e.name) + '</td><td class="xs muted">' + h(e.dist ? D.DISTRICT[e.dist].short + ' District' : e.region) + '</td><td class="num">' + (e.teams.length || '') + '</td><td class="sm">' + (e.done && e.res ? e.res.winners.map(nm).join(', ') : '<span class="dim">not played yet</span>') + '</td><td class="sm">' + (e.done && e.res && e.res.impact ? nm(e.res.impact) : '') + '</td></tr>').join('') + '</table>', '', 'mb');
      }
    }
    if (tab === 'champs') {
      const q = Object.keys(ws.q).map(Number).filter(n => S.teams[n]), CH = C.champs(S), byHome = {};
      q.forEach(n => { const k = S.teams[n].home ? D.DISTRICT[S.teams[n].home].name : S.teams[n].region + ' (regional)'; (byHome[k] = byHome[k] || []).push(n); });
      o += UI.card('Qualified for the ' + (CH.n > 1 ? 'two Championships' : 'Championship') + ' ' + UI.tag(q.length + (S.season.champsQualified ? 1 : 0) + ' teams so far', 'acc'),
        (S.season.champsQualified ? '<div class="sm good mb">Your team is in: ' + h(S.season.champsReason || '') + '</div>' : '') +
        (Object.keys(byHome).length ? Object.keys(byHome).sort().map(k => '<div class="mb"><div class="xs muted b">' + h(k.toUpperCase()) + ' · ' + byHome[k].length + '</div><div class="sm">' + byHome[k].sort((a, b) => a - b).map(n => '<span title="' + h(ws.q[n]) + '">' + n + '</span>').join(' · ') + '</div></div>').join('') : '<p class="muted">Nobody has qualified yet. Regional winners and award teams qualify as the weeks go by; the districts fill their places after the District Championships in week 7.</p>'), '', 'mb');
    }
    if (tab === 'all') W.districtsAt(su.cy).forEach(dd => { o += UI.card(h(dd.name) + ' ' + UI.tag(W.sizeOf(dd, su.cy) + ' teams · ' + dd.region, dd === d ? 'acc' : ''), '<div class="xs muted mb">' + h(dd.desc) + '</div>' + table(dd, 5), '', 'mb'); });
    return o;
  } };
  UI.A.worldTab = t => { UI.st.worldTab = t; UI.render(); };

  UI.S.history = { html() {
    const S = G.S, C = G.Career, s = S.season || {};
    let o = UI.head('History', 'history', 'Legacy points: ' + S.legacy, 'basics');
    const evRow = e => '<tr><td>' + h(e.name) + '</td><td>' + (e.rank ? e.rank + '/' + e.size : '—') + '</td><td>' + h(e.record) + '</td><td>' + h(e.finish) + '</td><td class="sm">' + h((e.awardNames || []).join(', ')) + '</td></tr>';
    const evHead = '<tr><th>Event</th><th>Rank</th><th>Record</th><th>Playoffs</th><th>Awards</th></tr>';
    // ---- this season so far (finished regionals and the Championship), with what is still to come
    if (C.inSeason(S) && s.year === S.year && !S.history.some(x => x.year === S.year)) {
      const up = S.regionals.filter(r => S.registered.includes(r.id) && !S.eventsDone[r.id]).sort((a, b) => a.week - b.week);
      const avg = s.qualMatches ? (s.rpSum / s.qualMatches).toFixed(2) : '—', pool = C.poolTotal(S);
      const wins = (s.events || []).filter(e => e.won).length;
      o += UI.card(h(C.seasonName(S)) + ' ' + UI.tag('this season', 'acc') + (s.worldChamp ? ' ' + UI.tag('WORLD CHAMPIONS', 'acc') : s.divWin ? ' ' + UI.tag('Division winner', 'acc') : s.champsQualified ? ' ' + UI.tag('Championship: qualified', 'good') : ''),
        ((s.events || []).length ? '<table class="t">' + evHead + s.events.map(evRow).join('') + '</table>' : '<p class="muted">No event played yet this season.</p>') +
        (up.length ? '<div class="sm muted mt">Still to come: ' + up.map(r => 'Week ' + r.week + ' ' + h(r.name)).join(' · ') + '</div>' : '') +
        '<div class="kv mt"><span class="k">Events played</span><span>' + (s.events || []).length + (wins ? ' · ' + wins + ' won' : '') + '</span><span class="k">Average ranking points</span><span>' + avg + '</span>' +
        (S.team.home && G.World.on(S) ? '<span class="k">District points</span><span>' + h(G.World.myLine(S) || '—') + '</span>' : C.wildEra(S) ? '<span class="k">Wildcards</span><span>A finalist gets in when a team that has already qualified earns another place at that regional</span>' : '<span class="k">Regional Pool</span><span>' + pool + ' / ' + C.poolThreshold(S) + ' pts (best two events)</span>') +
        '<span class="k">Championship</span><span>' + (s.champsQualified ? '<span class="good">Qualified</span> · ' + h(s.champsReason || '') : (S.team.home && G.World.on(S) ? 'Not qualified yet: your district fills its places after the District Championship in week 7 (award winners and the winning alliance, then the points list)' : 'Not qualified yet: win a regional, an Impact, Engineering Inspiration or Rookie All-Star award, or ' + (C.wildEra(S) ? 'reach a final where a wildcard is on offer' : 'reach the pool cut-off'))) + '</span></div>', '', 'mb');
    }
    // ---- Championship honours: World Champions and the FIRST Impact Award, each with its celebration
    const bn = C.banners(S), world = bn.filter(b => b.world), rest = bn.filter(b => !b.world);
    const seasonOf = gy => (S.season && S.season.year === gy && !S.history.some(x => x.year === gy) ? S.season : S.history.find(x => x.year === gy));
    if (world.length) {
      o += UI.card(UI.it('trophy', 'Championship honours ') + UI.tag(world.length + ' banner' + (world.length === 1 ? '' : 's'), 'acc'),
        '<div class="wbanners">' + world.map(b => {
          const hs = seasonOf(b.gy) || {}, has = b.key === 'wc' ? !!hs.wc : !!(hs.cmpImpact && hs.cmpImpact.cele);
          return '<div class="wbn">' + UI.banner(b) + (has ? '<button class="btn sm" data-act="replayCele" data-arg="' + b.key + '|' + b.gy + '">' + UI.icon('play', 12) + ' Celebration</button>' : '<span class="xs dim">from an older save</span>') + '</div>';
        }).join('') + '</div>' +
        (S.hallOfFame != null ? '<div class="hint mt">' + UI.icon('trophy', 14) + ' <b>Hall of Fame</b>: as a FIRST Impact Award winner your team is invited to every Championship.</div>' : ''), '', 'mb');
    }
    o += UI.card('Banner wall ' + UI.tag(rest.length + ' banner' + (rest.length === 1 ? '' : 's'), rest.length ? 'acc' : ''), rest.length ? UI.bannerWall(rest) : '<p class="muted">' + (world.length ? 'No regional or division banners yet.' : 'No banners yet. Win an event or the Impact Award to hang your first blue banner.') + '</p>', '', 'mb');
    // every season's robot, side by side
    { const bots = S.history.filter(x => x.robot && x.robot.look);
      if (bots.length > 1) o += UI.card(UI.it('garage', 'Robots through the years ') + UI.tag(bots.length + ' robots', 'acc'),
        '<div class="botgal">' + bots.map(x => '<div class="bg-i">' + UI.sideCanvas(x.robot.look, 'blue', S.team.num, 250, 135) + '<div class="b sm">' + (x.cy || C.calYear(S, x.year)) + (x.robot.name ? ' · ' + h(x.robot.name) : '') + '</div><div class="xs muted">' + h(G.Seasons[x.year].name) + (x.robot.power != null ? ' · power ' + x.robot.power : '') + '</div></div>').join('') + '</div>', '', 'mb'); }
    const botBox = hs => { const rb = hs.robot; if (!rb || !rb.look) return '';
      return '<div class="histbot"><div>' + UI.sideCanvas(rb.look, 'blue', S.team.num, 300, 160) + '</div><div class="hb-t"><div class="b">' + (rb.name ? h(rb.name) : 'The ' + (hs.cy || C.calYear(S, hs.year)) + ' robot') + '</div>' +
        '<div class="xs muted mb">' + [rb.power != null ? 'Power ' + rb.power : '', rb.rel != null ? 'reliability ' + rb.rel : '', rb.weight ? rb.weight + ' lb' : '', rb.auto ? 'auto: ' + h(rb.auto) : '', rb.vision ? 'vision level ' + rb.vision : ''].filter(Boolean).join(' · ') + '</div>' +
        rb.parts.map(p => '<div class="xs"><span class="muted">' + h(p.sub) + ':</span> ' + h(p.name) + ' <span class="dim">v' + p.ver + '</span></div>').join('') + '</div></div>'; };
    const lostCard = () => { const L = S.lostYear; return L && L.stage === 'done' ? UI.card('2021 ' + UI.tag('season cancelled', 'bad'), '<p class="muted">The pandemic: no Kickoff, no events, fifteen months away from the workshop. The team spent the year on: <b>' + L.picks.map(p => h((D.PANDEMIC.programs.find(x => x.id === p) || {}).name || p)).join('</b> and <b>') + '</b>.</p><ul class="story-ul">' + (L.summary || []).map(x => '<li>' + h(x) + '</li>').join('') + '</ul>', '', 'mb') : ''; };
    if (S.lostYear && !S.history.some(x => (x.cy || 0) > 2021)) o += lostCard();
    S.history.slice().reverse().forEach(hs => {
      if (hs.cy === 2020 && S.history.some(x => (x.cy || 0) > 2021)) o += lostCard();
      const ci = hs.cmpImpact && hs.cmpImpact.result;
      o += UI.card(h(C.seasonName(S, hs.year)) + (hs.worldChamp ? ' ' + UI.tag('WORLD CHAMPIONS', 'acc') : hs.worldFinalist ? ' ' + UI.tag('World finalists', 'acc') : hs.divWin ? ' ' + UI.tag('Division winner', 'acc') : hs.champs ? ' ' + UI.tag('Championship', 'good') : '') +
        (ci ? ' ' + UI.tag(ci === 'winner' ? 'FIRST Impact Award' : 'FIRST Impact Finalist', 'info') : ''),
        botBox(hs) + '<table class="t">' + evHead + hs.events.map(evRow).join('') + '</table><div class="sm muted mt">Legacy +' + hs.legacy + ' · avg RP ' + hs.avgRP.toFixed(2) + ' · ended with ' + U.money(hs.money, hs.px) + '</div>', '', 'mb');
    });
    return o;
  } };
  UI.A.replayCele = arg => {
    const S = G.S, parts = String(arg).split('|'), gy = Number(parts[1]);
    const hs = (S.season && S.season.year === gy && !S.history.some(x => x.year === gy) ? S.season : S.history.find(x => x.year === gy)) || {};
    if (parts[0] === 'wc') UI.worldChampModal(hs.wc, true);
    else UI.impactCele(hs.cmpImpact && hs.cmpImpact.cele, true);
  };
})();
