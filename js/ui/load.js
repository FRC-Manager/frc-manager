'use strict';
/* FRC Manager — which interface this page runs (3.6).
   The game has two interfaces, each a set of whole files: the new one (ui.js with kit.js) and the classic one
   (ui-classic.js). The other interface files are shared. This script loads one set, in order, before anything that
   follows it in the page: G.uiBoot() (core.js) says which, G.UIKIND records it, and <html data-ui="..."> lets the
   stylesheet tell them apart where a rule of the new interface would otherwise reach a classic page.
   As a web page the files are fetched (document.write keeps them in order, ahead of the scripts after this one). In the
   single-file build they are already in the page as inert blocks (script type="text/plain" data-ui="new | classic |
   both"), and the ones that belong are run in the order they stand. */
(function () {
  const kind = G.UIKIND = G.uiBoot();
  document.documentElement.setAttribute('data-ui', kind);
  const SETS = G.UI_FILES = {
    'new': ['ui.js', 'icons.js', 'kit.js', 'menu-stage.js', 'screens-event.js', 'screens-menu.js', 'screens-parts.js', 'screens-world.js', 'tutorial.js'],
    classic: ['ui-classic.js', 'icons.js', 'menu-stage.js', 'screens-event.js', 'screens-menu.js', 'screens-parts.js', 'screens-world.js', 'tutorial.js']
  };
  const blocks = document.querySelectorAll('script[type="text/plain"][data-ui]');
  if (blocks.length) {
    blocks.forEach(b => { const u = b.getAttribute('data-ui'); if (u !== 'both' && u !== kind) return; const s = document.createElement('script'); s.textContent = b.textContent; document.head.appendChild(s); });
  } else {
    const me = document.currentScript, base = me && me.src ? me.src.replace(/load\.js(\?.*)?$/, '') : 'js/ui/';
    SETS[kind].forEach(f => document.write('<script src="' + base + f + '"><\/script>'));
  }
})();
