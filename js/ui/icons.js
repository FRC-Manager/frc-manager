'use strict';
/* FRC Manager — small line icons (24×24, stroke = currentColor) and the team avatar emblems */
(function () {
  const I = {
    hq: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><rect x="10" y="14" width="4" height="6"/>',
    inbox: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    garage: '<rect x="5" y="8" width="14" height="10" rx="2"/><circle cx="9" cy="13" r="1.5"/><circle cx="15" cy="13" r="1.5"/><path d="M12 8V4M9 4h6M3 12h2M19 12h2"/>',
    design: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 7l3 3"/>',
    know: '<path d="M12 3l8 5v8l-8 5-8-5V8z"/><path d="M12 3v18M4 8l8 5 8-5"/>',
    team: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M14.5 14.4c3 0 5.5 2.3 5.5 5.6"/>',
    mentors: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
    workshop: '<path d="M14 6a4 4 0 0 0 5 5l-9 9-3-3 9-9"/><path d="M4 4l6 6M3 7l4-4"/>',
    parts: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
    finance: '<circle cx="12" cy="12" r="9"/><path d="M15 9c0-1.1-1.3-2-3-2s-3 .9-3 2 1.3 2 3 2 3 .9 3 2-1.3 2-3 2-3-.9-3-2M12 5v2M12 17v2"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><rect x="7" y="13" width="3" height="3"/>',
    history: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>',
    event: '<path d="M5 21V4"/><path d="M5 4h12l-2 4 2 4H5"/>',
    motor: '<circle cx="10" cy="12" r="6"/><circle cx="10" cy="12" r="2"/><path d="M16 12h5M18 9v6"/>',
    sensor: '<circle cx="12" cy="12" r="8"/><path d="M12 12l5-3"/><circle cx="12" cy="12" r="1.5"/>',
    chip: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>',
    swerve: '<circle cx="12" cy="12" r="8"/><rect x="9" y="6" width="6" height="12" rx="2"/><path d="M12 2v2M12 20v2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/><circle cx="12" cy="12" r="7"/>',
    camera: '<rect x="3" y="7" width="18" height="12" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 7l1.5-3h5L16 7"/>',
    air: '<path d="M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3M3 12h8"/>',
    elevator: '<rect x="6" y="3" width="12" height="18" rx="1"/><path d="M12 3v18M9 9l3-3 3 3M9 15l3 3 3-3"/>',
    arm: '<circle cx="6" cy="18" r="2.5"/><path d="M7.5 16.5L15 7M15 7l5 2M15 7l1-4"/>',
    shooter: '<circle cx="8" cy="15" r="4"/><circle cx="8" cy="15" r="1"/><path d="M12 13l8-6M14 18l7-2"/><circle cx="20" cy="5" r="1.5"/>',
    turret: '<circle cx="12" cy="15" r="6"/><path d="M12 15l7-9"/><path d="M6 21h12"/>',
    intake: '<circle cx="7" cy="16" r="3"/><circle cx="17" cy="16" r="3"/><path d="M4 9h16M10 16h4M12 9v4"/>',
    climb: '<path d="M8 21V3M16 21V3M8 7h8M8 12h8M8 17h8"/>',
    printer: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><rect x="7" y="14" width="10" height="7"/>',
    cnc: '<rect x="3" y="15" width="18" height="5" rx="1"/><path d="M6 15V4h12v11M12 4v7M10 11h4l-2 3z"/>',
    lathe: '<rect x="2" y="9" width="5" height="8"/><path d="M7 13h12M19 10v6M21 11v4"/><circle cx="7" cy="13" r="2"/>',
    laptops: '<rect x="4" y="5" width="16" height="11" rx="1"/><path d="M2 19h20M9 9l-2 2 2 2M15 9l2 2-2 2"/>',
    charger: '<rect x="4" y="6" width="14" height="14" rx="2"/><path d="M9 3v3M13 3v3M12 10l-2 4h4l-2 4"/>',
    pitcart: '<rect x="3" y="6" width="16" height="10" rx="1"/><circle cx="7" cy="19" r="2"/><circle cx="16" cy="19" r="2"/><path d="M19 9h2"/>',
    trailer: '<rect x="2" y="6" width="15" height="10" rx="1"/><path d="M17 12h5"/><circle cx="7" cy="18" r="2"/><circle cx="12" cy="18" r="2"/>',
    pfield: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M12 5v14"/><circle cx="12" cy="12" r="3"/>',
    ebench: '<rect x="7" y="7" width="10" height="10" rx="1"/><path d="M10 7V4M14 7V4M10 20v-3M14 20v-3M7 10H4M7 14H4M20 10h-3M20 14h-3"/>',
    weld: '<path d="M3 21l8-8"/><path d="M11 13l3-3 4 4-3 3z"/><path d="M19 3v3M22 6h-3M15.5 4.5l1.5 1.5M20.5 9.5l-1.5-1.5"/>',
    meeting: '<rect x="3" y="4" width="18" height="11" rx="1"/><path d="M12 15v5M8 20h8"/><path d="M7 11l3-3 3 2 4-4"/>',
    cad: '<rect x="3" y="4" width="18" height="12" rx="1"/><path d="M8 20h8M12 16v4"/><path d="M7 13l4-6 3 4 2-2 2 4z"/>',
    shelf: '<path d="M4 3v18M20 3v18M4 8h16M4 14h16M4 20h16"/><rect x="6" y="10" width="4" height="4"/><rect x="12" y="4" width="5" height="4"/>',
    lounge: '<path d="M4 12V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3"/><path d="M3 12h18v5H3zM5 17v3M19 17v3"/>',
    honors: '<path d="M5 3h6v13l-3-2-3 2zM13 3h6v13l-3-2-3 2z"/><path d="M3 21h18"/>',
    ftc: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 12h5M15 12h5M12 4v5M12 15v5"/><rect x="9" y="9" width="6" height="6" rx="1"/>',
    battery: '<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 10v4M7 12h4M9 10v4"/>',
    spare: '<path d="M14 6a4 4 0 0 0 5 5l-9 9-3-3 9-9"/><circle cx="17" cy="7" r="1"/>',
    elements: '<path d="M8 20l4-15 4 15z"/><path d="M6 20h12"/><circle cx="18" cy="8" r="2.5"/>',
    sponsor: '<path d="M3 12l4-4 4 2 3-2 7 5-4 4-4-3-3 2z"/><path d="M7 8v6M17 13v4"/>',
    money: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 9v6M18 9v6"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.3 2.4c-.5.2-.8.7-.8 1.2V14"/><circle cx="12" cy="17.2" r=".6"/>',
    fatigue: '<path d="M20 15A8 8 0 0 1 9 4a8 8 0 1 0 11 11z"/><path d="M15 4h3l-3 3h3"/>',
    incident: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
    map: '<path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
    scout: '<circle cx="7" cy="15" r="4"/><circle cx="17" cy="15" r="4"/><path d="M11 15h2M5 11l2-6h3M19 11l-2-6h-3"/>',
    sprout: '<path d="M12 21v-9"/><path d="M12 12c0-4 3-6.5 7.5-6.5 0 4.2-3 6.5-7.5 6.5z"/><path d="M12 14.5c0-3.2-2.6-5.5-6.5-5.5 0 3.3 2.6 5.5 6.5 5.5z"/>',
    outreach: '<path d="M3 10v4l11 5V5z"/><path d="M14 9h2a3 3 0 0 1 0 6h-2M6 14l1 5h3"/>',
    fund: '<circle cx="12" cy="13" r="7"/><path d="M12 9v8M9.5 11.5c0-1 1-1.5 2.5-1.5s2.5.6 2.5 1.5-1 1.5-2.5 1.5-2.5.6-2.5 1.5 1 1.5 2.5 1.5 2.5-.5 2.5-1.5M10 3h4"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/>',
    check: '<path d="M4 12l5 5L20 6"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    box: '<rect x="3" y="7" width="18" height="13" rx="1"/><path d="M3 11h18M10 7V4h4v3"/>',
    truck: '<rect x="2" y="7" width="12" height="9"/><path d="M14 10h4l3 3v3h-7"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    play: '<path d="M7 4l13 8-13 8z"/>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9.5C7.4 20.3 4 16.5 4 12V6z"/>'
  };
  const U = G.U;
  G.UI = G.UI || {};
  // icon(name, size, cls): inline SVG that inherits the text colour
  G.UI.icon = function (name, size, cls) {
    const body = I[name] || I.info, s = size || 16;
    return '<svg class="ico ' + (cls || '') + '" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  };
  G.UI.ICONS = Object.keys(I);

  // ---------- team avatars: filled emblems drawn on the team colour ----------
  const star = (n, r1, r2) => { const p = []; for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, r = i % 2 ? r2 : r1; p.push((12 + Math.cos(a) * r).toFixed(1) + ',' + (12 + Math.sin(a) * r).toFixed(1)); } return '<polygon points="' + p.join(' ') + '"/>'; };
  const gear = () => { const p = []; for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, r = i % 2 ? 6.5 : 9; const a2 = a + Math.PI / 8 * 0.5; p.push((12 + Math.cos(a) * r).toFixed(1) + ',' + (12 + Math.sin(a) * r).toFixed(1), (12 + Math.cos(a2) * r).toFixed(1) + ',' + (12 + Math.sin(a2) * r).toFixed(1)); } return '<polygon points="' + p.join(' ') + '"/><circle cx="12" cy="12" r="3" class="cut"/>'; };
  const AV = {
    gear: gear(),
    bolt: '<path d="M13.5 2L5 13.5h6L9.5 22 19 9.5h-6.5z"/>',
    star: star(5, 9.5, 4.2),
    shield: '<path d="M12 2l8 3v6c0 5-3.4 9.3-8 11-4.6-1.7-8-6-8-11V5z"/>',
    rocket: '<path d="M12 2c3.5 2.5 5 6.5 5 10l-2 4H9l-2-4c0-3.5 1.5-7.5 5-10z"/><path d="M9 16l-3 3 1-5M15 16l3 3-1-5"/><circle cx="12" cy="9" r="1.8" class="cut"/>',
    paw: '<ellipse cx="12" cy="15.5" rx="4.5" ry="4"/><circle cx="6" cy="10" r="2"/><circle cx="9.5" cy="6.5" r="2"/><circle cx="14.5" cy="6.5" r="2"/><circle cx="18" cy="10" r="2"/>',
    flame: '<path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4-1-6 1-9z"/>',
    mountain: '<path d="M2 20l7-12 4 6 2-3 7 9z"/>',
    atom: '<circle cx="12" cy="12" r="2.5"/><ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke-width="1.8"/><ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke-width="1.8" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke-width="1.8" transform="rotate(-60 12 12)"/>',
    crown: '<path d="M3 18l1-11 5 5 3-7 3 7 5-5 1 11z"/>',
    hex: '<polygon points="12,2 20.7,7 20.7,17 12,22 3.3,17 3.3,7"/><circle cx="12" cy="12" r="4" class="cut"/>',
    wave: '<path d="M2 15c3-5 6-5 9 0s6 5 11-2v9H2z"/>'
  };
  G.UI.AVATARS = Object.keys(AV);
  // avatar(team, size): the emblem in the secondary colour on a badge in the primary colour, with the team number
  G.UI.avatar = function (t, size) {
    const s = size || 36, a = AV[t.avatar] || AV.gear, bg = t.c1 || '#f5b800', fg = t.c2 || '#111';
    return '<svg class="avatar" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" aria-hidden="true"><rect x="0" y="0" width="24" height="24" rx="6" fill="' + U.esc(bg) + '"/>' +
      '<g transform="translate(3 3) scale(0.75)" fill="' + U.esc(fg) + '" stroke="' + U.esc(fg) + '">' + a.replace(/class="cut"/g, 'fill="' + U.esc(bg) + '" stroke="none"') + '</g></svg>';
  };
  // Team colours: a limited palette that reads well on the dark UI; the UI accent follows the primary colour
  G.UI.TEAM_COLORS = [
    { id: 'gold', name: 'Gold', hex: '#f5b800' }, { id: 'red', name: 'Red', hex: '#e5484d' }, { id: 'blue', name: 'Blue', hex: '#3e8cff' },
    { id: 'green', name: 'Green', hex: '#30c27a' }, { id: 'orange', name: 'Orange', hex: '#ff8a3d' }, { id: 'purple', name: 'Purple', hex: '#9b6bff' },
    { id: 'teal', name: 'Teal', hex: '#22b8c8' }, { id: 'pink', name: 'Pink', hex: '#ff5fa2' }, { id: 'silver', name: 'Silver', hex: '#aab4bf' }, { id: 'lime', name: 'Lime', hex: '#9ad53a' }
  ];
  G.UI.TEAM_COLORS2 = [{ id: 'black', name: 'Black', hex: '#14171b' }, { id: 'white', name: 'White', hex: '#f4f6f8' }, { id: 'navy', name: 'Navy', hex: '#1d2a4d' }, { id: 'maroon', name: 'Maroon', hex: '#5a1a22' }, { id: 'forest', name: 'Forest', hex: '#183d2a' }];
  // Confetti burst in the team colours (plus gold) for event wins
  G.UI.confetti = function (ms) {
    const t = (G.S && G.S.team) || {}, cols = [t.c1 || '#f5b800', t.c2 || '#ffffff', '#ffd24d', '#ffffff', '#3ecf8e', '#4aa3ff', '#ff5c5c'];
    const cv = document.createElement('canvas'), W = window.innerWidth, H = window.innerHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:80';
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    const N = Math.min(220, Math.round(W / 5)), P = [];
    for (let i = 0; i < N; i++) P.push({ x: Math.random() * W, y: -20 - Math.random() * H * 0.6, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3, w: 6 + Math.random() * 6, h: 3 + Math.random() * 5, c: cols[i % cols.length] });
    const end = performance.now() + (ms || 4200);
    (function frame(now) {
      ctx.clearRect(0, 0, W, H);
      const fade = Math.max(0, Math.min(1, (end - now) / 900));
      ctx.globalAlpha = fade;
      P.forEach(p => { p.vy += 0.05; p.vx *= 0.995; p.x += p.vx + Math.sin((now / 300) + p.r) * 0.6; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); });
      if (now < end) requestAnimationFrame(frame); else cv.remove();
    })(performance.now());
  };
  // Apply the team colour to the UI accent (hover/secondary accent is a lighter mix)
  G.UI.applyTheme = function (t) {
    const root = document.documentElement;
    if (!t || !t.c1) { root.style.removeProperty('--accent'); root.style.removeProperty('--accent2'); root.style.removeProperty('--accent-ink'); return; }
    const hex = t.c1.replace('#', ''), n = parseInt(hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex, 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    // keep the accent bright enough on a dark background
    if (lum < 0.45) { const k = 0.45 / Math.max(0.05, lum); r = Math.min(255, Math.round(r * k)); g = Math.min(255, Math.round(g * k)); b = Math.min(255, Math.round(b * k)); }
    const mix = (c, w) => Math.round(c + (255 - c) * w);
    root.style.setProperty('--accent', 'rgb(' + r + ',' + g + ',' + b + ')');
    root.style.setProperty('--accent2', 'rgb(' + mix(r, 0.3) + ',' + mix(g, 0.3) + ',' + mix(b, 0.3) + ')');
    root.style.setProperty('--accent-ink', (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#14171b' : '#ffffff');
  };
})();
(function () {
  const UI = G.UI, h = G.U.esc;
  // "?" button on each screen that opens the matching tutorial topic
  UI.helpBtn = topic => '<button class="btn ghost sm helpq" data-act="helpTopic" data-arg="' + topic + '" title="How this works">' + UI.icon('help', 18) + '</button>';
  // a small "?" beside a text that is explained at length in the guide: opens How to play at that section
  UI.q = (topic, sec) => '<button class="qm" data-act="helpTopic" data-arg="' + topic + (sec ? '#' + h(sec) : '') + '" title="How this works: opens the guide' + (sec ? ' at “' + h(sec) + '”' : '') + '">?</button>';
  // Screen header: icon, title, help button, one-line subtitle
  UI.head = (title, icon, sub, topic) => '<div class="row head">' + (icon ? '<span class="hico">' + UI.icon(icon, 22) + '</span>' : '') + '<h1>' + h(title) + '</h1><span class="sp"></span>' + (topic ? UI.helpBtn(topic) : '') + '</div>' + (sub ? '<div class="sub">' + sub + '</div>' : '');
  // Title with a leading icon for cards
  UI.it = (icon, text) => '<span class="it">' + UI.icon(icon, 16) + '<span>' + text + '</span></span>';
  // Small tabs row: [[id, label, icon]]
  UI.tabs = (cur, list, act) => '<div class="tabs">' + list.map(x => '<button class="tab ' + (cur === x[0] ? 'on' : '') + '" data-act="' + act + '" data-arg="' + x[0] + '">' + (x[2] ? UI.icon(x[2], 15) : '') + '<span>' + h(x[1]) + '</span>' + (x[3] ? '<span class="badge">' + x[3] + '</span>' : '') + '</button>').join('') + '</div>';
})();
