'use strict';
/* FRC Manager — main menu, new game setup, load, help, settings, season review, career summary */
(function () {
  const U = G.U, D = G.Data, h = U.esc, UI = G.UI;

  // =====================================================================
  // MAIN MENU
  // =====================================================================
  UI.S.menu = { full: true, html() {
    const auto = G.Save.meta('auto');
    return '<div class="menu-wrap"><div class="menu-box"><div class="logo">FRC <span>MANAGER</span></div><div class="muted mb">Run a FIRST Robotics Competition team through ten seasons, from 2016 to 2026. Unofficial fan game.</div>' +
      (G.BETA ? '<div class="hint mb">' + UI.tag(G.BETA.toUpperCase(), 'acc') + ' Version ' + h(G.VERSION) + '. The beta keeps its own saves and never touches the stable game\'s. To bring a career over, use <b>☰ → Export save</b> there and <b>Load / import</b> here.</div>' : '') +
      '<div class="grid g3 mt">' +
      '<div class="choice" data-act="newGame" data-arg="career"><div class="lg b">New Career</div><div class="sm muted">Start in any year from 2016 and play through 2026: up to ten seasons, in real or random order, or a career of your own from the real games and ten fantasy ones. Build a program that learns from every robot.</div></div>' +
      '<div class="choice" data-act="newGame" data-arg="single"><div class="lg b">Single Season Challenge</div><div class="sm muted">Pick one of the ten real games or the ten fantasy games, and a scenario. Graded S to D.</div></div>' +
      '<div class="choice" data-act="continueGame" ' + (auto ? '' : 'style="opacity:.5"') + '><div class="lg b">Continue</div><div class="sm muted">' + (auto ? h(auto.team.num + ' ' + auto.team.name + ' · ' + (auto.cy || auto.year) + ' · ' + new Date(auto.savedAt).toLocaleString()) : 'No autosave yet') + '</div></div>' +
      '</div><div class="row mt wrap"><button class="btn" data-act="nav" data-arg="load">Load / import</button><button class="btn" data-act="nav" data-arg="help">How to play</button><button class="btn" data-act="nav" data-arg="notes">What\'s new in v' + h(G.VERSION) + '</button></div>' +
      '<div class="grid g5 mt">' + G.SEASON_YEARS.map(y => '<div class="card flat seasoncard" data-act="seasonCard" data-arg="' + y + '" title="Open this game\'s Kickoff briefing"><div class="xs muted">' + y + '</div><div class="b">' + h(G.Seasons[y].name) + '</div><canvas data-prev="' + y + '" width="330" height="164" style="width:100%;border-radius:6px;margin-top:6px"></canvas><div class="xs muted mt">' + h(G.Seasons[y].tagline) + '</div></div>').join('') + '</div>' +
      '<h3 class="mt">Fantasy games <span class="sm muted" style="font-weight:400">· ten fictional games in the 2026 match format: a single season (as the ' + G.FANTASY_CY + ' game), a random-order career or a custom career</span></h3>' +
      '<div class="grid g5">' + G.FANTASY_YEARS.map(y => '<div class="card flat seasoncard" data-act="seasonCard" data-arg="' + y + '" title="Open this game\'s Kickoff briefing"><div class="xs muted">FANTASY</div><div class="b">' + h(G.Seasons[y].name) + '</div><canvas data-prev="' + y + '" width="330" height="164" style="width:100%;border-radius:6px;margin-top:6px"></canvas><div class="xs muted mt">' + h(G.Seasons[y].tagline) + '</div></div>').join('') + '</div>' +
      '<p class="xs dim mt">Version ' + h(G.VERSION) + (G.BETA ? ' (' + h(G.BETA) + ')' : '') + ' · Not affiliated with or endorsed by FIRST®, Formula 1® or Frontier Developments. Sponsors, regionals and teams are fictional; team numbers are random.</p></div></div>';
  }, after() { document.querySelectorAll('canvas[data-prev]').forEach(c => G.Render.preview(c, Number(c.dataset.prev))); } };
  // a season card opens that game's Kickoff briefing, with a way straight into a Single Season Challenge of it
  UI.A.seasonCard = y => UI.gameBriefModal(Number(y));
  UI.A.playSeason = y => { UI.closeModal(); UI.A.newGame('single'); UI.st.ng.year = Number(y); UI.render(); };
  UI.A.continueGame = () => { if (G.Save.load('auto')) { UI.go(G.S.phase === 'end' ? 'end' : G.S.event ? 'event' : 'hq'); } else UI.toast('No autosave found', 'bad'); };

  // =====================================================================
  // NEW GAME
  // =====================================================================
  // the suggested team number for the start year: a rookie gets a number from that year's rookie block, an established or
  // powerhouse team one at least a year older. It follows the start year and profile until the player types a number.
  // (3.5) An established team's number is one its home really has that season (D.NUMS: every area's real team numbers
  // by the thousand); a powerhouse carries one of the home's oldest.
  UI.ngAutoNum = function (n) {
    const cy = n.mode === 'single' ? G.singleCy(n.year) : n.start, rng = G.makeRng((Date.now() ^ (cy * 7919)) & 0xffffff);
    if (n.profile === 'rookie') { const b = D.numBlock(cy); return rng.int(b[0], b[1]); }
    const top = (D.NUM_FROM[cy - 1] || D.NUM_FROM[cy] || 11000) - 1; // at least a season older than this year's rookies
    const zone = (n.mode === 'career' && n.home) || n.region, draw = () => D.zoneNum(rng, D.NUMS[zone] ? zone : 'Midwest', cy, top);
    if (n.profile !== 'powerhouse') return draw();
    let best = draw(); for (let i = 0; i < 9; i++) best = Math.min(best, draw()); // the lowest of ten: one of the old programs
    return best;
  };
  // a default school name with the flavour of the home (until the player types one)
  // the page's season, and its home (a district, in a career only: a single season has no districts)
  UI.ngCy = n => (n.mode === 'single' ? G.singleCy(n.year) : n.start);
  UI.ngHome = n => (n.mode === 'career' ? n.home || null : null);
  UI.ngSchool = n => D.schoolName(G.makeRng((Date.now() ^ 0x5f3759) & 0xffffff), UI.ngHome(n), n.region, UI.ngCy(n), n.mode !== 'career');
  // A school of the list is picked (at random, or the next one with the button beside the field): the team will
  // stand where that school points, and the name can still be edited without moving it.
  UI.ngPick = (n, name) => { n.school = name; n.schoolPick = name; n.schoolAuto = true; n.place = D.schoolAt(name); };
  // the schools of the home: an area's list has those of its districts still to form (their cities are the area's until then)
  UI.ngSchools = n => D.schoolList(UI.ngHome(n), n.region, UI.ngCy(n), n.mode !== 'career');
  // the district still to form whose cities the team will stand in (null: the area's own cities), as C.newGame will have it
  UI.ngZone = function (n) {
    if (UI.ngHome(n)) return null;
    const cy = UI.ngCy(n), single = n.mode !== 'career', dz = single ? null : G.World.soleDistrict(n.region, cy);
    return dz ? dz.id : D.startZone(n.num, n.region, cy, single, n.schoolPick, n.place);
  };
  // the city the team will stand in (as C.newGame and the map will have it)
  UI.ngHub = n => G.Geo.teamPos(Number(n.num) || 1, n.region, UI.ngHome(n), UI.ngCy(n), UI.ngZone(n), false, n.place || null).hub;
  // (3.5.1) how far the Championship of the first season is from the city the team will stand in (travel goes by miles)
  UI.ngChamps = function (n) {
    try { const ch = G.Era.champs(n.start), city = ch.cities[ch.n > 1 ? G.Era.champsSide(n.region) : 0], t = D.tripTier(UI.ngHub(n), city);
      return t === 'local' ? 'The Championship is in your own city. ' : t === 'drive' ? 'The Championship is a drive away. ' : 'The Championship is an ordinary flight away. '; } catch (e) { return 'The Championship is an ordinary flight away. '; }
  };
  // a district that will form in part of this area: will the team be asked to join? (it is, where it stands inside)
  UI.ngFut = function (n) {
    if (n.mode !== 'career' || n.home) return '';
    const fut = D.DISTRICTS.filter(x => x.region === n.region && x.from > n.start && x.from <= 2026).sort((p, q) => p.from - q.from)[0]; if (!fut) return '';
    return G.World.wholeArea(fut) ? 'In ' + fut.from + ' the whole area becomes the <b>' + h(fut.name) + '</b>, and your team with it. '
      : UI.ngZone(n) === fut.id ? 'In ' + fut.from + ' your part of it forms the ' + h(fut.name) + ': you choose then whether to join. '
      : 'In ' + fut.from + ' another part of it forms the ' + h(fut.name) + '; your team stays with the regionals. ';
  };
  // the line under the team's name in the preview: its school, the city it stands near, its home
  UI.ngWhere = n => n.school + ' · near ' + UI.ngHub(n) + ' · ' + (n.home ? D.DISTRICT[n.home].name : n.region);
  // ... and a default name for you, the lead mentor, as people of that city are called (until the player types one).
  // true if the name changed.
  UI.ngSync = function (n) {
    if (!n.leadAuto) return false;
    const hub = UI.ngHub(n), L = D.namesFor({ hub });
    if (n.leadList === L && n.lead) return false;
    n.leadList = L; n.lead = D.personName(G.makeRng((Date.now() ^ 0x2f6e2b) & 0xffffff), { hub }); return true;
  };
  UI.A.ngSchoolNext = function () {
    const n = UI.st.ng, l = UI.ngSchools(n); if (!l.length) return;
    UI.ngPick(n, l[(l.indexOf(n.schoolPick) + 1) % l.length]); UI.ngSync(n); UI.render();
  };
  UI.A.newGame = function (mode) {
    const rng = G.makeRng(Date.now() & 0xffffff);
    UI.st.ng = { mode, num: 0, numAuto: true, schoolAuto: true, leadAuto: true, name: D.teamName(rng), lead: '', school: '', c1: UI.TEAM_COLORS[0].hex, c2: UI.TEAM_COLORS2[0].hex, avatar: rng.pick(UI.AVATARS), region: 'Midwest',
      profile: mode === 'single' ? 'established' : 'established', diff: 'normal', order: 'real', year: 2026, scenario: 'custom', start: G.startYears('real')[0] };
    UI.ngPick(UI.st.ng, UI.ngSchool(UI.st.ng));
    UI.st.ng.num = UI.ngAutoNum(UI.st.ng); UI.ngSync(UI.st.ng);
    UI.go('newgame');
  };
  UI.S.newgame = { full: true, html() {
    const n = UI.st.ng;
    const inp = (k, lbl, type) => '<label class="f">' + lbl + '<input class="inp" type="' + (type || 'text') + '" value="' + h(n[k]) + '" data-chg="ng" data-k="' + k + '"></label>';
    const choice = (k, v, title, desc) => '<div class="choice ' + (n[k] === v ? 'on' : '') + '" data-act="ngSet" data-arg="' + k + '|' + v + '"><div class="b">' + title + '</div>' + (desc ? '<div class="xs muted">' + desc + '</div>' : '') + '</div>';
    const starts = n.order === 'custom' ? G.CAL_YEARS.slice() : G.startYears(n.order); if (!starts.includes(n.start)) n.start = starts[0];
    if (n.home && (n.mode !== 'career' || !(D.DISTRICT[n.home] && D.DISTRICT[n.home].from <= n.start))) { // that district does not exist yet in the start year
      n.home = null; if (n.schoolAuto) UI.ngPick(n, UI.ngSchool(n)); else { n.schoolPick = null; n.place = null; } UI.ngSync(n);
    }
    // the school that was picked is not one of this home's any more (another start year: a district has formed)
    if (n.schoolPick && !UI.ngSchools(n).includes(n.schoolPick)) { if (n.schoolAuto) UI.ngPick(n, UI.ngSchool(n)); else { n.schoolPick = null; n.place = null; } UI.ngSync(n); }
    const ngPx = U.pxOf(n.mode === 'single' ? G.singleCy(n.year) : n.start); // amounts on this page: in the first season's dollars
    let o = '<div class="menu-wrap"><div class="menu-box"><div class="row"><div class="logo" style="font-size:28px">' + (n.mode === 'career' ? 'New Career' : 'Single Season Challenge') + '</div><span class="sp"></span><button class="btn" data-act="nav" data-arg="menu">Back</button></div>';
    if (n.mode === 'single') {
      o += '<h3 class="mt">Season</h3><div class="grid g4" style="grid-template-columns:repeat(5,minmax(0,1fr))">' + G.SEASON_YEARS.map(y => choice('year', y, y + ' ' + G.Seasons[y].name, G.Seasons[y].tagline)).join('') + '</div>';
      o += '<h3 class="mt">Fantasy games <span class="sm muted" style="font-weight:400">· fictional games in the 2026 match format, played as the ' + G.FANTASY_CY + ' season</span></h3><div class="grid g4" style="grid-template-columns:repeat(5,minmax(0,1fr))">' + G.FANTASY_YEARS.map(y => choice('year', y, G.Seasons[y].name, G.Seasons[y].tagline)).join('') + '</div>';
      o += '<h3 class="mt">Scenario</h3><div class="grid g4">' + D.SCENARIOS.map(s => choice('scenario', s.id, s.name, U.infl(s.goalText, ngPx) + ' (' + D.PROFILES[s.profile].name + ')')).join('') + '</div>';
    }
    // (3.5) the home list: the areas of North America, the rest of the world, and the districts of the start year
    // (3.4.4) an area that is all one formed district is not a home for a regional team: its district is
    const ngOpen = r => n.mode !== 'career' || G.World.regionOpen(r, n.start);
    if (!n.home && !ngOpen(n.region)) { n.home = D.DISTRICTS.find(x => x.region === n.region && x.from <= n.start && G.World.wholeArea(x)).id; if (n.schoolAuto) UI.ngPick(n, UI.ngSchool(n)); else { n.schoolPick = null; n.place = null; } UI.ngSync(n); }
    const ngOpt = r => '<option value="r:' + r + '" ' + (!n.home && n.region === r ? 'selected' : '') + '>' + r + (n.mode === 'career' ? ' · ' + G.World.preview(n.start, r, null, n.diff).elite + ' elite' : '') + '</option>';
    o += '<h3 class="mt">Your team</h3><div class="grid g4">' + inp('num', 'Team number', 'number') + inp('name', 'Team name') +
      '<label class="f">School / organisation<span class="row gap4"><input class="inp sp" type="text" value="' + h(n.school) + '" data-chg="ng" data-k="school"><button type="button" class="btn sm" data-act="ngSchoolNext" aria-label="Another school">↻</button></span></label>' +
      inp('lead', 'Lead mentor (your name)') +
      '<label class="f">' + (n.mode === 'career' ? 'Home: a regional area or a district' : 'Home region') + '<select class="inp" data-chg="ng" data-k="homeSel"><optgroup label="North America">' + D.REGIONS.filter(r => D.GROUP[r] === 'NA' && ngOpen(r)).map(ngOpt).join('') + '</optgroup>' +
        '<optgroup label="The rest of the world">' + D.REGIONS.filter(r => D.GROUP[r] !== 'NA' && ngOpen(r)).map(ngOpt).join('') + '</optgroup>' +
        (n.mode === 'career' ? '<optgroup label="Districts">' + G.World.districtsAt(n.start).map(d => '<option value="d:' + d.id + '" ' + (n.home === d.id ? 'selected' : '') + '>' + h(d.name) + ' (' + d.region + ') · ' + G.World.preview(n.start, d.region, d.id, n.diff).elite + ' elite</option>').join('') + '</optgroup>' : '') + '</select></label>' +
      '</div>';
    if (n.mode === 'career') {
      const d = n.home ? D.DISTRICT[n.home] : null, pv = G.World.preview(n.start, n.region, n.home, n.diff), A = D.WORLD_AREAS[n.region], sites = D.sitesOf(n.region, n.start), far = D.overseas(n.region, 'Midwest');
      // a district still to form in this area: all of it (your team joins), or part of it (a team inside it chooses then)
      const futTxt = '<span id="ng-fut">' + UI.ngFut(n) + '</span>';
      o += '<div class="hint mt"><b>Competition:</b> about ' + pv.teams + ' teams in ' + n.start + ', average strength about ' + pv.avg + ', and ' + (pv.elite ? pv.elite + ' ' + UI.eliteTag() + ' team' + (pv.elite > 1 ? 's' : '') + ' call' + (pv.elite > 1 ? '' : 's') + ' this area home: among the best programs in the world.' : 'no ' + UI.eliteTag() + ' team calls this area home this season.') +
        ' The numbers follow the real season. ' + UI.q('world', 'Elite teams') + '</div>';
      o += '<div class="hint mt">' + (d ? '<b>' + h(d.name) + '</b> · ' + h(d.desc) + ' In ' + n.start + ': ' + G.World.sizeOf(d, n.start) + ' teams, ' + Math.max(3, Math.round(G.World.sizeOf(d, n.start) * 2 / 32)) + ' district events, a District Championship of ' + G.World.dcmpSize(d, n.start) + '. <b>District play:</b> one fee covers two local district events with 12 qualification matches each. Every result earns district points; the best teams go to the District Championship, and the district sends its share of teams to the Championship from the top of the points list.'
        : '<b>Regional team in ' + h(D.regionThe(n.region)) + '.</b> ' + (A ? h(A.about) + ' ' : '') + futTxt + 'Register for one to four regionals. Qualify for the Championship by winning a regional, with the Impact, Engineering Inspiration or Rookie All-Star award, or ' + (G.Era.wildcards(Number(n.start) || 0) ? 'on a wildcard as a finalist (the Regional Pool begins in 2025).' : 'through the Regional Pool.')) + '</div>';
      // travel from an area outside North America: its own regionals this first season, and what is overseas
      // every home's own events of the first season, with their cities; then what is far
      const nReg = d ? Math.max(3, Math.round(G.World.sizeOf(d, n.start) * 2 / 32)) : A ? sites.length : G.World.regionalsIn(n.region, n.start);
      const where = d ? G.Geo.districtCities(d.id, nReg) : A ? sites.filter((x, i, a) => a.indexOf(x) === i) : G.Geo.regionalCities(n.region, n.start, nReg);
      o += '<div class="hint mt"><b>Travel:</b> ' + (d ? 'your ' + nReg + ' district events are close to home (' + h(where.join(', ')) + '). '
        : nReg ? 'in ' + n.start + ' ' + h(D.regionThe(n.region)) + ' holds ' + (A ? '' : 'about ') + nReg + ' regional' + (nReg > 1 ? 's' : '') + ' (' + h(where.join(', ')) + '). ' : '<span class="warn">no regional at home in ' + n.start + '.</span> ') +
        (far ? 'Every event in another part of the world is a <b>flight overseas</b>, the Championship included: dearer than an ordinary flight (' + U.money(D.TRAVEL.intl.cost, ngPx) + ' for a team of 25), harder on the robot, and never a trip for the team trailer. ' : UI.ngChamps(n)) + UI.q('world', 'Flying overseas') + '</div>';
    }
    // avatar and colours (the whole UI picks up the primary colour)
    o += '<div class="grid g3 mt"><div><div class="sm muted mb">Team colour</div><div class="swatches">' + UI.TEAM_COLORS.map(c => '<button class="swatch ' + (n.c1 === c.hex ? 'on' : '') + '" style="background:' + c.hex + '" title="' + c.name + '" data-act="ngSet" data-arg="c1|' + c.hex + '"></button>').join('') + '</div>' +
      '<div class="sm muted mb mt">Second colour</div><div class="swatches">' + UI.TEAM_COLORS2.map(c => '<button class="swatch ' + (n.c2 === c.hex ? 'on' : '') + '" style="background:' + c.hex + '" title="' + c.name + '" data-act="ngSet" data-arg="c2|' + c.hex + '"></button>').join('') + '</div></div>' +
      '<div class="span2"><div class="sm muted mb">Team emblem</div><div class="avpick">' + UI.AVATARS.map(a => '<button class="' + (n.avatar === a ? 'on' : '') + '" data-act="ngSet" data-arg="avatar|' + a + '" title="' + a + '">' + UI.avatar({ avatar: a, c1: n.c1, c2: n.c2 }, 40) + '</button>').join('') + '</div>' +
      '<div class="row mt">' + UI.avatar(n, 56) + '<div><div class="lg b" id="ng-who">' + h(String(n.num)) + ' ' + h(n.name) + '</div><div class="sm muted" id="ng-where">' + h(UI.ngWhere(n)) + '</div></div></div></div></div>';
    if (n.mode === 'career' || n.scenario === 'custom') {
      o += '<h3 class="mt">Starting profile</h3><div class="grid g3">' + Object.keys(D.PROFILES).map(k => { const P = D.PROFILES[k]; return choice('profile', k, P.name + ' — ' + U.money(P.money, ngPx), P.desc + ' ' + P.students + ' students, ' + P.mentors.length + ' mentors.'); }).join('') + '</div>';
    }
    o += '<h3 class="mt">Difficulty</h3><div class="grid g3">' + choice('diff', 'easy', 'Easy', 'Weaker opponents and fewer, weaker elite teams, fewer faults, more sponsor money.') + choice('diff', 'normal', 'Normal', 'The intended experience: a title takes an elite-level robot and drive team.') + choice('diff', 'hard', 'Hard', 'Stronger opponents and more, stronger elite teams, more faults, stingy sponsors.') + '</div>';
    if (n.mode === 'career') o += '<label class="row mt"><input type="checkbox" data-chg="ngNoFail" ' + (n.noFail ? 'checked' : '') + '> No-fail mode <span class="sm muted">(the program can\'t be cut when Program Support hits 0; you can change it later in Settings)</span></label>';
    if (n.mode === 'career') {
      const cal = G.calFrom(n.start), nS = cal.length, cust = n.order === 'custom', g5 = '<div class="grid g4" style="grid-template-columns:repeat(5,minmax(0,1fr))">';
      o += '<h3 class="mt">Season order</h3><div class="grid g3">' + choice('order', 'real', 'Real order', 'Every year plays its own game.') + choice('order', 'random', 'Random order', 'The games are shuffled: the next one is a surprise at each Kickoff. Technology, vendors, prices and events still follow the calendar year.') +
        choice('order', 'custom', 'Custom career', 'Choose the games yourself, from the ten real ones and the ten fantasy ones, and play them as listed or shuffled.') + '</div>';
      o += '<h3 class="mt">Start year <span class="sm muted" style="font-weight:400">· ' + (cust ? 'your games are played one a year from here' : 'the career runs through 2026') + (cal.includes(2020) && cal.includes(2022) ? ' (no 2021 season)' : '') + '</span></h3>' + g5 +
        starts.map(y => choice('start', y, String(y), (n.order === 'real' && G.Seasons[y] ? G.Seasons[y].name + ' · ' : '') + (cust ? 'up to ' : '') + G.calFrom(y).length + ' season' + (G.calFrom(y).length === 1 ? '' : 's'))).join('') + '</div>';
      if (n.order === 'random') {
        // (3.5) how many of the seasons are fantasy games
        const mx = Math.min(nS, G.FANTASY_YEARS.length); n.fantasy = Math.min(Number(n.fantasy) || 0, mx);
        o += '<h3 class="mt">Fantasy seasons <span class="sm muted" style="font-weight:400">· how many of the ' + nS + ' season' + (nS === 1 ? ' is a fantasy game' : 's are fantasy games') + '</span></h3><div class="row wrap gap4">' +
          Array.from({ length: mx + 1 }, (x, k) => '<button class="btn ' + (n.fantasy === k ? 'primary' : '') + '" data-act="ngSet" data-arg="fantasy|' + k + '">' + (k ? k : 'None') + '</button>').join('') + '</div>' +
          '<div class="hint mt">' + (n.fantasy ? n.fantasy + ' of the ' + nS + ' season' + (nS === 1 ? '' : 's') + ' will be fantasy game' + (n.fantasy === 1 ? '' : 's') + ', drawn from the ten and shuffled in with the real ones. Which, and when, you find out at each Kickoff.' : 'Real games only. Fantasy games are fictional games in the 2026 match format: you can look at them on the main menu.') + '</div>';
      }
      if (cust) {
        // (3.5) the custom career: pick the games, see the years they fall in, then play them as listed or shuffled
        n.games = (n.games || []).filter(g => G.Seasons[g]).slice(0, nS);
        if (n.shuffle !== 'yes') n.shuffle = 'no'; // "As listed" is the default, and shows as chosen
        const pk = n.games, shuf = n.shuffle === 'yes', fitMsg = pk.length ? G.Career.gamesFit(pk, cal, !shuf) : '';
        const gcard = y => { const i = pk.indexOf(y); return '<div class="choice ' + (i >= 0 ? 'on' : '') + '" data-act="ngGame" data-arg="' + y + '"><div class="xs muted">' + (G.isFantasy(y) ? 'FANTASY' : y) + (i >= 0 ? ' · ' + (shuf ? 'picked' : 'season ' + (i + 1)) : '') + '</div><div class="b">' + h(G.Seasons[y].name) + '</div></div>'; };
        o += '<h3 class="mt">Games <span class="sm muted" style="font-weight:400">· pick up to ' + nS + ', one for each year from ' + n.start + ' to 2026. The career ends after your last game.</span></h3>' +
          g5 + G.SEASON_YEARS.map(gcard).join('') + '</div><div class="xs muted mt mb">Fantasy games</div>' + g5 + G.FANTASY_YEARS.map(gcard).join('') + '</div>';
        o += '<h3 class="mt">Play them</h3><div class="grid g2">' + choice('shuffle', 'no', 'As listed', 'In the order below. You know what is coming every year.') + choice('shuffle', 'yes', 'Random order', 'Your games are shuffled: the next one is a surprise at each Kickoff.') + '</div>';
        if (pk.length) o += '<table class="t mt"><tr><th style="width:90px">' + (shuf ? '' : 'Year') + '</th><th>Game</th><th></th></tr>' + pk.map((y, i) => '<tr><td class="b">' + (shuf ? '' : cal[i]) + '</td><td>' + h(G.Seasons[y].name) + ' <span class="xs muted">' + (G.isFantasy(y) ? 'fantasy' : y) + '</span></td><td class="num">' +
          (shuf ? '' : '<button class="btn sm" data-act="ngGameMove" data-arg="' + i + '|-1" ' + (i ? '' : 'disabled') + ' title="Play it a year earlier">▲</button> <button class="btn sm" data-act="ngGameMove" data-arg="' + i + '|1" ' + (i < pk.length - 1 ? '' : 'disabled') + ' title="Play it a year later">▼</button> ') +
          '<button class="btn sm" data-act="ngGame" data-arg="' + y + '" title="Take it out">✕</button></td></tr>').join('') + '</table>';
        o += '<div class="hint mt">' + (pk.length ? pk.length + ' season' + (pk.length === 1 ? '' : 's') + ': ' + cal[0] + (pk.length > 1 ? ' to ' + cal[pk.length - 1] : '') + (shuf ? ', in random order' : '') + '. ' : 'Pick at least one game. ') + 'STRONGHOLD allows tank drives only, so it can be played in 2016 or 2017 and in no other year.' + (fitMsg ? ' <b class="warn">' + h(fitMsg) + '</b>' : '') + '</div>';
      } else o += '<div class="hint mt">' + nS + ' season' + (nS === 1 ? '' : 's') + ': ' + cal[0] + (nS > 1 ? ' to ' + cal[nS - 1] : '') + '. Money is shown in each year\'s own dollars: prices and budgets rise a little every year.</div>';
    }
    o += '<div class="row mt"><span class="sp"></span><button class="btn primary lg" data-act="startGame">Start ▶</button></div></div></div>';
    return o;
  } };
  UI.A.ng = (v, el) => {
    const n = UI.st.ng, k = el.dataset.k;
    if (k === 'homeSel') {
      if (String(v).indexOf('d:') === 0) { n.home = String(v).slice(2); n.region = D.DISTRICT[n.home].region; } else { n.home = null; n.region = String(v).slice(2); }
      // the suggested number, school and lead mentor's name follow the home (a school name of your own stays, with no place of its own in the new home)
      if (n.numAuto) n.num = UI.ngAutoNum(n); if (n.schoolAuto) UI.ngPick(n, UI.ngSchool(n)); else { n.schoolPick = null; n.place = null; }
      UI.ngSync(n); UI.render(); return;
    }
    n[k] = k === 'num' ? Math.max(1, Math.min(99999, Number(v) || 1)) : v;
    if (k === 'num') n.numAuto = false; // the player's own number stays
    if (k === 'school') n.schoolAuto = false; // a name of your own: the team stays where the school you picked stands (n.place)
    if (k === 'lead') n.leadAuto = false;
    // Another number can mean another city of the home, and other names there. The preview line and the default name
    // follow at once, in place: the page is not drawn again while somebody is typing in it.
    if (k === 'num' && UI.ngSync(n)) { const li = document.querySelector('input[data-chg="ng"][data-k="lead"]'); if (li) li.value = n.lead; }
    { const who = document.getElementById('ng-who'), wh = document.getElementById('ng-where'), fu = document.getElementById('ng-fut'); if (who) who.textContent = n.num + ' ' + n.name; if (wh) wh.textContent = UI.ngWhere(n); if (fu) fu.innerHTML = UI.ngFut(n); }
  };
  // (3.5) the custom career's list: a click adds a game at the end or takes it out; the arrows move it a year
  UI.A.ngGame = y => {
    const n = UI.st.ng, g = Number(y), l = n.games = n.games || [], i = l.indexOf(g), room = G.calFrom(n.start).length;
    if (i >= 0) l.splice(i, 1);
    else if (l.length >= room) return UI.toast('From ' + n.start + ' to 2026 there is room for ' + room + ' season' + (room === 1 ? '' : 's') + '. Take a game out, or start earlier.', 'bad');
    else l.push(g);
    UI.render();
  };
  UI.A.ngGameMove = arg => { const [i, d] = arg.split('|').map(Number), l = UI.st.ng.games || [], j = i + d; if (j < 0 || j >= l.length) return; const t = l[i]; l[i] = l[j]; l[j] = t; UI.render(); };
  UI.A.ngSet = arg => { const [k, v] = arg.split('|'), was = k === 'start' ? UI.ngSchools(UI.st.ng).join('|') : ''; UI.st.ng[k] = k === 'year' || k === 'start' || k === 'fantasy' ? Number(v) : v;
    // another start year can mean another list of schools (a district has formed, or has not yet): a suggested school is drawn again
    if (k === 'start' && UI.st.ng.schoolAuto && UI.ngSchools(UI.st.ng).join('|') !== was) UI.ngPick(UI.st.ng, UI.ngSchool(UI.st.ng));
    if (k === 'c1') UI.applyTheme(UI.st.ng); if (k === 'scenario') { const s = D.SCENARIOS.find(x => x.id === v); UI.st.ng.profile = s.profile; } if (UI.st.ng.numAuto && ['profile', 'start', 'year', 'scenario', 'order'].includes(k)) UI.st.ng.num = UI.ngAutoNum(UI.st.ng); if (['profile', 'start', 'year', 'scenario', 'order'].includes(k)) UI.ngSync(UI.st.ng); UI.render(); };
  UI.A.ngNoFail = v => { UI.st.ng.noFail = !!v; };
  UI.A.startGame = function () {
    const n = UI.st.ng;
    if (!String(n.name).trim()) return UI.toast('Give your team a name', 'bad');
    const scen = n.mode === 'single' ? D.SCENARIOS.find(s => s.id === n.scenario) : null;
    const cust = n.mode === 'career' && n.order === 'custom';
    if (cust) {
      if (!(n.games && n.games.length)) return UI.toast('Pick at least one game for your custom career', 'bad');
      const bad = G.Career.gamesFit(n.games, G.calFrom(n.start), n.shuffle !== 'yes'); if (bad) return UI.toast(bad, 'bad');
    }
    G.Career.newGame({ mode: n.mode, team: { num: Number(n.num), name: String(n.name).trim(), school: n.school, lead: String(n.lead || '').trim().slice(0, 40), c1: n.c1, c2: n.c2, avatar: n.avatar, region: n.region, home: n.mode === 'career' ? n.home || null : null, place: n.place || null, z: UI.ngZone(n) },
      profile: scen && !scen.custom ? scen.profile : n.profile, diff: n.diff, order: n.order, year: n.year, start: n.start, fantasy: n.mode === 'career' && n.order === 'random' ? Number(n.fantasy) || 0 : 0, games: cust ? n.games.slice() : undefined, shuffle: cust && n.shuffle === 'yes', scenario: scen ? scen.id : null, settings: n.mode === 'career' && n.noFail ? { noFail: true } : undefined });
    G.Save.write('auto');
    UI.go('hq');
    if (G.S.phase === 'kickoff') UI.kickoffModal();
    else if (!UI.Tut.start('season')) UI.modal('<h2>Welcome, ' + h(G.Career.leadFirst(G.S)) + '</h2><p class="muted">It\'s October. The first game will be revealed at Kickoff in January. Sign sponsors (Finance), hire mentors, look at facilities (Workshop), stock up on parts (Inventory), register for regionals (Calendar) and start research (Design Office), then press <b>Continue</b>.</p><p class="sm muted">Research, the Knowledge Base and the code library are offseason jobs: start them before Kickoff. Research still running at Kickoff ends there with partial credit.</p>' + (function () { const eb = G.Career.eraBrief(G.S); return eb ? '<div class="card flat mb"><div class="xs muted b">' + h(eb.title.toUpperCase()) + '</div><ul class="story-ul">' + eb.lines.map(x => '<li>' + h(x) + '</li>').join('') + '</ul></div>' : ''; })() + '<div class="row"><span class="sp"></span><button class="btn primary" data-act="closeModal">Let\'s go</button></div>');
  };

  // =====================================================================
  // LOAD
  // =====================================================================
  UI.S.load = { full: true, html() {
    const rows = G.Save.slots.map(s => {
      const m = G.Save.meta(s);
      return '<div class="card mb"><div class="row"><div class="sp"><b>' + (s === 'auto' ? 'Autosave' : 'Slot ' + s) + '</b><div class="sm muted">' + (m ? h(m.team.num + ' ' + m.team.name + ' · ' + (m.cy || m.year) + ' · ' + (m.mode === 'career' ? 'Career' : 'Single season') + ' · ' + U.money(m.money, m.px || 1) + ' · ' + new Date(m.savedAt).toLocaleString()) : 'Empty') + '</div></div>' +
        (m ? '<button class="btn primary" data-act="loadSlot" data-arg="' + s + '">Load</button><button class="btn bad" data-act="delSlot" data-arg="' + s + '">Delete</button>' : '') + '</div></div>';
    }).join('');
    return '<div class="menu-wrap"><div class="menu-box" style="max-width:720px"><div class="row"><div class="logo" style="font-size:28px">Load game</div><span class="sp"></span><button class="btn" data-act="nav" data-arg="menu">Back</button></div><div class="mt">' + rows + '</div>' +
      '<div class="card"><b>Import a save</b><p class="sm muted">Paste a save code from <b>☰ → Export save</b>, or choose a save file.</p>' +
      '<label class="f" for="impText">Save code<textarea id="impText" class="inp mono" rows="4" style="resize:vertical;font-size:11px" placeholder="Paste your save code here"></textarea></label>' +
      '<div class="row wrap mt"><input type="file" accept=".json,application/json" id="impFile" class="inp" style="flex:1;min-width:0"><button class="btn primary" data-act="importSave">Import</button></div></div></div></div>';
  } };
  UI.A.loadSlot = s => { if (G.Save.load(s)) UI.go(G.S.phase === 'end' ? 'end' : G.S.event ? 'event' : 'hq'); else UI.toast('Could not load', 'bad'); };
  UI.A.delSlot = s => UI.confirm('Delete save?', 'This cannot be undone.', 'Delete', () => { G.Save.remove(s); UI.render(); });
  UI.A.importSave = () => {
    const done = (ok, msg) => { if (ok) { G.Save.write('auto'); UI.go(G.S.phase === 'end' ? 'end' : G.S.event ? 'event' : 'hq'); } else UI.toast('Import failed: ' + msg + '.', 'bad'); };
    const txt = (document.getElementById('impText') || {}).value || '';
    if (txt.trim()) return G.Save.importText(txt, done);
    const f = document.getElementById('impFile').files[0];
    if (!f) return UI.toast('Paste a save code or choose a save file first.', 'bad');
    G.Save.importFile(f, done);
  };

  // =====================================================================
  // HELP / SETTINGS
  // =====================================================================
  // =====================================================================
  // VERSION NOTES ("What's new")
  // =====================================================================
  // Newest first. Keep G.VERSION (core.js) equal to the first entry.
  G.RELEASES = [
    { v: '3.5.5', title: 'Robots that look the part', notes: [
      'Every robot picture is redrawn. A robot is now put together from what a real one is made of: box tube with its hole pattern, pocketed plate, polycarbonate, belts, compliant wheels, gas springs and hooks, in the proportions of a real robot. The pictures are drawn twice as sharp.',
      'Every season has its own designs: each concept has its own drawing for that game. A 2018 climber is a hook on a strap with forks for a partner, a 2019 one is a pair of stilts with ramps, a 2022 one is a telescoping arm. A low-bar or trench robot stands at its real height, and the low seasons are drawn larger.',
      'In a match the robots show the same designs from above, and they move: the intake folds out while a robot is collecting, lifts and arms reach out to place, and climbers, forks and ramps come out in the endgame. The wheels sit inside the frame, and the signal light is a smaller bulb with the same glow.',
      'In the seasons before AprilTags, a robot with vision switches on its green ring light while it aims.',
      'A robot without a turret turns its whole chassis to face what it shoots at, and a shot leaves from the shooter, wherever that sits on the robot.',
      'Your robot can wear any colour: the Garage has a Robot look card with the robot\'s colour and its accent, red or blue bumpers for your pictures with the number in the middle or at the side, and the robot from above playing its moves. The team\'s colour on the pages stays as it is.',
      'Some rivals paint their robots, most of the elite teams among them, and a team keeps its colour from season to season: in matches, in scouting and in the reveals. The others run bare aluminium.',
      'Fixed: the 2025 Coral and Barge bonuses asked for the Championship\'s numbers at every event (7 coral on a level, 16 Barge points). Regionals and districts now ask for 5 and 14, which is what robots chasing the bonus already aimed for. The same in 2023: 5 links (4 with Coopertition) until the Championship, 6 (5) there.',
      'Hoppers hold what real ones did: 20, 45 or 75 fuel in 2026 (a low-profile frame keeps 70% of that, not 60%) and 50, 45 or 90 balls in 2017. The fields already held the real numbers of balls. Scores in 2026 are about a quarter higher, and the Energized bonus comes a little more often.',
      'The fantasy seasons borrow these parts.'
    ] },
    { v: '3.5.4', title: 'Testing at home, strategy read, 2026 shots', notes: [
      'Development at home counts less on a robot whose CAN bus is overloaded (85%) or that carries cameras without a network switch (90%), on the competition robot as well as the second one. With only one robot all testing is on it. The Design Office and the Garage say when either applies.',
      'Strategy read is shown as a number from 0 to 100 at Headquarters, on the Team page (with what it is made of) and at events, with what it does in this season\'s game.',
      '2026: a turret fires fuel single file, fixed and hood shooters two abreast, and only the wide dumper four abreast.'
    ] },
    { v: '3.5.3', title: 'Robot parts that matter, two robots, cleaner drawings', notes: [
      'Robot parts now count on the unit they are fitted to, while it runs on them: a drivetrain on better motors is faster, a scorer on better motors scores faster, an intake takes in faster, worn parts make that unit fail more often and planetary gearboxes make it fail less. Ceilings no longer depend on parts. The Garage shows what each unit\'s parts add. Saves from before are converted when they load.',
      'A new guide topic, How a robot is made, draws the whole chain: subsystem, concept, version, unit and robot, with build parts going into units and robot parts going onto robots. The game says unit for a built one everywhere, and the glossary has the new terms.',
      'The Inventory sorts parts the same way: Control system and Drive & add-ons for robot parts, Build parts for kits, GridTube, pneumatics and servo kits.',
      'The drive gearbox is Lumen\'s now: the Lumen standard drive gearbox, in the Lumen column of Drive & add-ons. Lumen makes one design and never upgrades it, and buying it counts towards your Lumen loyalty like any Lumen order. Gearboxes already on the shelf carry over.',
      'Stop Build Day: the bagged robot keeps the robot parts it went into the bag with, and they can\'t be sold meanwhile. At each event the team fits the best parts there are, with no practice-day work.',
      'Drivers know each unit by its concept, version and robot parts: other parts on a unit cost a little familiarity, another version a little more.',
      'The second robot can carry vision cameras and a CAN FD hub of its own. A Vision Level is tested on it only with the cameras for that level, and from 2023 an overloaded CAN bus on it makes development there count 85%. The Design Office and the Garage say when either applies.',
      'A part that a vendor warns is about to sell out is still on the shelf the week the warning arrives, so its Order button works.',
      'The second robot can run another control system than the competition robot (Inventory: Second robot uses), at a cost: practice on it teaches the drivers less about the competition robot, and code tried on it has to be ported.',
      'Before every event, a unit the competition robot lacks goes along from storage or from the other robot. In the Stop Build Day years it travels in the crate and goes on at practice day, so a bagged test chassis gets the units of the robot at home. The Garage says what will go, and the window that picks the robot for the bag says what each one lacks.',
      'Bagged: a unit can be packed from the other robot as well as from storage, and anything the bagged robot lacks can be packed.',
      'The Garage lists the robot parts on every unit of both robots, the optional ones too (planetary gearboxes, network switch, cameras, ML accelerator, CAN FD hub), and each unit or robot can take another vendor\'s parts first. At events the competition robot always takes the best parts. Stored units carry none.',
      'Install Upgrade: a unit for a subsystem the robot does not have yet takes twice as long to fit as a newer version; three practice blocks fit a whole robot.',
      'Robot drawings show game pieces only when the robot holds them: the revolver\'s pockets, the algae mechanisms, the hopper and the flywheels no longer come with pieces drawn in, and a held piece sits in the mechanism that holds it.'
    ] },
    { v: '3.5.2', title: 'Stop Build Day fixes', notes: [
      'In a season with Stop Build Day, the window that asks which of your two robots goes in the bag now always opens. It was lost when a shop incident or a team dispute came up the same week, and so were the other pop-ups of that week (a first-time story, a vendor launch).',
      'Headquarters, the Design Office and the Garage count down the weeks to Stop Build Day. Until the choice is made, Headquarters asks for it and Continue waits.',
      'A robot reveal that is as long as the team number now reads as the team number (47:56 for team 4756). A number that cannot be written as a time is counted in seconds.',
      'The Week 0 scrimmage and the offseason events at home draw the nearest teams first: the event\'s own city, then the teams within a drive. The scrimmage is held in your own city and is only as big as the teams within a drive make it, so an island scrimmage stays on the island.',
      'A line of team chatter that names the same student twice now fills in both.'
    ] },
    { v: '3.5.1', title: 'Renewals by choice, travel by miles, and more letters', notes: [
      'Sponsors: a sponsor whose deal has ended no longer renews by itself. If it wants to stay, its offer joins the list marked Renewal, and signing it is your choice. Leaving it unsigned costs nothing.',
      'International partners write when they sign and when they offer to renew, from their branch near you or from their head office, and so does the printer maker. A head office in your own area always writes itself.',
      'Reach a bonus target and a title sponsor or an international partner sends one short email for everything reached that day. The school does the same for a program goal.',
      'Travel is counted in miles from your city to the event\'s: the same city or up to 60 miles is local, up to 450 miles by road is a drive, more is a flight. The Championship and Summit Champs follow the same rule, a team on an island flies to everything off it, and a district\'s own events are never a flight.',
      'Students can pay their own way to an event (Headquarters): about a third of the travel bill, at a cost in morale and reputation, with weaker scouting and slower pit repairs at that event.',
      'The Super pit crew repairs the subsystem in the worst shape before every match by itself. On the pre-match page you can have it repair another one instead.',
      'The school board: once a season the school\'s assistant asks whether the board may watch an event. What it sees moves Program Support, and a second email tells you what it thought.',
      'A small grant from the education office of your city and a company near you, in about six offseasons of ten: an email in the Inbox with one reply, Apply, which lapses like any other reply when you press Continue.',
      'Letters from FIRST: every December a preview of the season to come (events, districts, the Championship, what changes in the rules), a letter when you qualify for the District Championship or the Championship, and one when your area has no regional, with the nearest areas that do and half the registration fee of your first event paid. A regional that is new or back is announced too. FIRST Tech Challenge writes when you found your first own FTC team.',
      'In matches a battery connector can work loose (rare, more often with poor electrics and under hits), and every robot shows its Robot Signal Light: blinking when enabled, steady when disabled, dark with no power.',
      'The World map marks your signed sponsors, each in its city (the Sponsors layer).',
      'Feeder programs: the cap now counts your own FTC teams with the outside programs (it still starts at 3), and outside programs are named after schools of your part of the world.',
      'Nobody joins your team under a name somebody on it already has.',
      'Wording follows the part of the world: a bake sale is a sausage sizzle in one place and a charity bazaar in another, and doughnuts are not the Friday treat everywhere.'
    ] },
    { v: '3.5', title: 'FRC Manager 3.5: the whole world, and ten games that never were', notes: [
      'Ten fantasy games: FULL TILT, MAINLINE, STATION KEEPING, HIGH RISE, GALE FORCE, DEEP FREEZE, EVEN KEEL, MOTHERLODE, SIGNAL FIRE and BRIDGEWORK. Fictional games in the 2026 match format, each with its own field, rules, Design Office, coach calls, published designs and news. Their Kickoff briefings are on the main menu.',
      'Three ways to play them: a Single Season Challenge (as the 2027 season), a random-order career with as many fantasy seasons as you choose, or a custom career with your own start year and list of games, real and fantasy, as listed or shuffled. STRONGHOLD stays in 2016 or 2017.',
      'The whole world: thirteen areas with teams in them, from the West to Asia Pacific, each following the real seasons of 2016 to 2026 (how many teams it has, the numbers they carry, how strong they are, the cities that host its regionals). Two districts outside the United States from 2017: Trillium in the North and Levant in the Middle East. Elite teams follow the real top 100 by rating, area by area, so not every area has one every year.',
      'Flying overseas: an event in another part of the world costs more than an ordinary flight, is harder on the robot and more tiring, and the team trailer cannot make the trip. The Championship is overseas for every team outside North America.',
      'Home: your default team number and school follow your home, every event names its city, and every home has its own offseason events with local fields. Outside North America nothing is held in October, so an invited team is free to fly to Summit Champs.',
      'You are the lead mentor, under a name of your own. Letters are addressed to you, and some are copied to one of your mentors. People are named as people of their part of the world usually are, first name and family name together.',
      'Sponsors: more than a thousand of them, each with a line that says what it does and the city it is in. Most offers come from companies close to your team, some from the rest of its country and now and then one from a neighbouring country. A local business only sponsors teams near one of its shops, and a foundation stays inside its borders.',
      'No company is on a list twice, and one that leaves stays away for a year. A title sponsor writes you a letter when it signs and when it renews.',
      'International companies make partner offers to teams everywhere, about one partner offer in ten and more where a team has few companies of its own around it, and each adds 1 reputation at every season review. From the autumn of 2022 the printer maker Corvane Labs is one of them: it writes letters too, and what it donates is printers and electronics benches.',
      'Team disputes: once or twice a season the team falls out with itself and waits for your decision. There are more shop incidents, the same one seldom comes round twice, and the result of a decision shows in the window as soon as you make it.',
      'Hiring a mentor can be undone until you press Continue, like signing a sponsor. The Inbox hears of a signing or a hire on the next turn.',
      'Your own Elite tag: at every season review your season\'s OPR is ranked against every team in the world. Inside the top places, in a year you qualified for the Championship, your team carries the Elite tag through the next season.',
      'Rarer rewards: vendor loyalty levels come about four seasons apart (400, 800, 1200 and 1600 points, with the order bonus full at $4,000 a year), and only a very satisfied sponsor donates equipment, never twice within two years.',
      'Your school or organisation is on the Headquarters page, in the letters from FIRST and in the celebration windows. Menu pages keep their place when you click a choice, and the Inventory names who made each control system part.',
      'A career saved in an earlier version loads as it is. It plays its season out as it was and grows into the whole world the next October; everybody on your team keeps their name, and the old northern area is now the North.',
      'For testing: tools/world-viewer plays a decade and shows the map and every area\'s numbers against the real ones, year by year.'
    ] },
    { v: '3.1.5', title: 'Suggestions at any effort, stronger elites, sponsor terms', notes: [
      'The Design Office\'s suggested build or upgrade can be started thorough or rush too, with the hours each takes on its button.',
      'Normal and Hard: a few more elite teams (at the start of a career 28 instead of 24 on Normal, 44 instead of 38 on Hard), and stronger ones: better drivers and human players, slightly better robots, and extremely high reliability (about 95, where it was about 88). Easy is unchanged.',
      'Sponsors: title sponsors and grants sign for two to four seasons, and grants can now be renewed too. Partners prefer shorter deals (one to three seasons), renew one season at a time and move on a little more often.'
    ] },
    { v: '3.1.4', title: 'Fixes', notes: [
      'Fixed a crash on practice day at events when packed parts or an upgrade waiting to be installed met full storage. Working out the robot\'s strength with the packed parts fitted no longer takes stored units apart either: only fitting them for real does.',
      'In a random-order career the Apex CAD Sprint picks its game from the past among the games this career has already played, with the year it played them, so it never names a game still to come.'
    ] },
    { v: '3.1.3', title: 'Summit Champs, vendor contests and offseason R&D', notes: [
      'Code library: a new program project for the programmers, like the Knowledge Base. Built once and ported every offseason to next season\'s control system release, it starts the robot code a little further on and makes the first code upgrade, auto routine and vision level of the season 40% faster.',
      'The Knowledge Base is an offseason job now too: built and updated before Kickoff. The robot code shows its auto routine version and vision level, the buttons name the next one, and hardened or lightened subsystems say how often (with the pounds taken off), and when they are maxed.',
      'Each vendor contest opens with an invitation window in its month. Its first year tells how the contest started; later years recall last year\'s winners and how your entry did.',
      'Research is offseason R&D now: it opens after the Championship, with a pop-up, and closes at Kickoff. Research still running at Kickoff ends there with partial credit, know-how for the share that was done, and a December note warns about research that will not finish in time.',
      'Summit Champs: an invitation-only offseason event in October, hosted every year by an elite team in California. The teams that won an event that season as captain or first pick are invited (the world simulation picks the rest of the field): 40 teams, about 8 of them elite, as strong as a Championship division\'s playoffs.',
      'Invited, you get an email and a pop-up in August and sign up in the Calendar; it takes the place of the Fall Classic that month, unless you had already signed up for the Fall Classic: then you play both. It costs more (a higher fee and full travel to California) and pays more than any other offseason event: reputation, morale, sponsor goodwill and triple experience. Not invited, you hear who went and, in November, who won.',
      'A mentor conference before practice day: choose 2 of 4 talks by the mentors of the teams there, each a little know-how in its area.',
      'The event has its own look: a sunset over the California hills, and a welcome on the way in.',
      'Vendor contests for your students, one a year each, in a fixed month: the Lumen Code Cup in June (from 2023), the Lanternworks Circuit Jam in September (from 2024) and the Apex CAD Sprint in November (from 2022). Enter in the Design Office as a program project of 60 to 80 hours; extra hours make a better entry. The results come the next month.',
      'The odds follow the CAD Workstations, the Programming Station or the Electronics Workbench and your students\' mechanism skill; no mentor helps, and first prize is rare. A prize works like a loyalty sponsorship (free parts, a voucher or a sale), and first prize has its own gold pop-up. With no prize, every entrant still gets a box of merch and stickers.'
    ] },
    { v: '3.1.2', title: 'Letters, priorities and a print farm', notes: [
      'The finalists\' email after a World Championship tells the finals as they were played: how many games, the scores, which ones were close, a game they won or a tie. It used to call every three-game final close and every two-game one one-sided.',
      'Letters from outside the team come in as emails: the school board (your workshop, an overdraft, a grant used), sponsors (a bonus, a donation), a vendor\'s loyalty reward, the Festival of Champions and Woodie Flowers Award invitations, the support fund, and requests from other teams, the press, the school board, parents and alumni (their reply buttons stay). What a letter means in the game is in a short note under it.',
      'High priority: a tag on messages that can change what you do soon: the vendors\' launch dates and new products, stock alerts, registration and deadlines, an upgrade ready at an event, facilities that need attention, a decision a shop incident needs. Hide background never hides them; before, it hid the vendors\' launch dates. An offer that lapsed unanswered now counts as background.',
      'The Inbox puts this turn\'s messages first, with a divider before the older ones.',
      'September 2022: a new story about the fast desktop printers that print carbon-fiber parts (on sale since January, and in every top team\'s shop after one season), and the Prototyping Lab gets a fourth level, the print farm: fewer hardware hours, a second Finish now card a season, and spares bought at an event cost little more than at home. Its second level is now Printer bench + laser cutter. From then on every Prototyping Lab level saves 15% more hardware hours, and the reliability the Manual Machine Shop adds to new builds is 15% smaller, since more parts are printed (its cheaper spares stay).',
      'From the autumn of 2024 the AI coding assistant can go down, for any team: a new shop incident with four ways to handle it.',
      'Fixed: the Garage would not open during a season played with the 2016 game (FIRST STRONGHOLD has no mecanum chassis) while the second robot had no drivetrain yet. The test chassis row now skips a chassis the game does not have.'
    ] },
    { v: '3.1.1', title: 'FTC beside you, emails, and an Inbox you can quiet', notes: [
      'Alliance selection: a team that declines an invitation is marked "declined" on the board, in your scouting list and under your pick list, and nobody can pick it again (it can still captain an alliance). Watching, you see each decline and the captain picking again ("picks … instead").',
      'Invited and thinking of saying no? The invitation says what declining leaves you: sure to captain an alliance later in the first round, a captain only if enough teams ranked above you are picked first, or out of the playoffs (the second round, or ranked too low). Declining into a seat on the sidelines asks once more.',
      'Skip to your turn now stops on the final alliance board if no decision of yours came, instead of going straight into the playoffs.',
      'Travel grows with the team: the base prices are for 25 students, about 30% less for 15 and 40% more for 40 (the robot\'s freight costs everybody the same).',
      'More kinds of robot reveal: besides the long render, the film, the teaser, raw practice footage and the live stream, one picture on the forum with no words, and for teams that never post one, a photo someone took at a scrimmage that leaks. Three or four reveals from famous elite teams elsewhere every season, your local rival is a nearby team about as strong as you, and your own reveal arrives in the same weeks with a picture of your robot.',
      'The FIRST Tech Challenge runs beside your season: its kickoff in September (the real games, RES-Q to DECODE; shuffled on their own in a random-order career, so nothing gives your next FRC game away), a midseason look, the World Championship in May, and a vendor\'s FTC launch every October. FTC\'s technology follows the calendar (Android phones, the expansion hub, the control and driver hubs, AprilTags, odometry computers): the kickoff says what is new, and the vendors launch what goes with it. Its rule changes too: double-elimination playoffs from 2024–25, ranking and advancement points from 2025–26. Every October the team argues whether the FTC game hints at your next game; Kickoff settles it (shared season themes from 2018–19 make it a fair hint in real order, never in a random one). Your own FTC teams report five times a season (kickoff, league, qualifier, state, and a season review after the Championship), with their program year; a run to state or Worlds lifts next September\'s recruits from that program.',
      'Emails: when you win the World Championship the finalists\' lead mentor writes to congratulate you (and wonders if you can be as lucky next year); FIRST writes when you join the Hall of Fame; and a mentor who wins the Woodie Flowers Award or a Woodie Flowers Finalist Award writes to the whole team.',
      'Feeder programs: outside programs are capped at 3, plus up to 2 for a Business & Outreach Mentor (2★ and 4★) and 2 for reputation (50 and 80), at most 6. Your own FTC teams don\'t count. A program over the cap keeps running.',
      'Hide background: one button in the Inbox hides the messages you can skip (development reports, chatter and general news). Anything that names a team, shows a robot, takes a reply or changes something stays.',
      'The Inbox keeps 220 messages (it was 120). The newest 60 always stay; older than that, chatter and lapsed replies go first, so results, emails and decisions last much longer. Before, replies that had lapsed were never cleared and pushed the newest chatter out at once.'
    ] },
    { v: '3.1', title: 'Elite teams, and a Parts Shelf that costs to keep', notes: [
      'Elite teams: a few programs at the very top of the sport, close to maxed out in robot, drive team and strategy. At least one in every area and district, the most in California; they last for years, now and then one drops back to a local powerhouse and a long-time strong team joins them. Every Championship division has them, and they lead the other alliances on Einstein: titles are hard to win, and harder to win twice. A rose Elite tag at events and in scouting, rose dots and a filter on the map, and their number for each home on the New Career page.',
      'Watch alliance selection pick by pick, whether or not you are picked, or skip to your turn or to the end. While others pick you see only your own scouting data.',
      'District events vary: about 24 to 40 teams, more and smaller events in a small district, so you do not meet the same teams at every one. Every event\'s stars now come from the teams actually scheduled there.',
      'Season goals put qualifying for the Championship before winning an event (an event win qualifies you, and so do awards and wildcards); sponsors pay more for a win than for qualifying.',
      'Stop Build Day years: one Install Upgrade block fits what is packed for a few subsystems (the biggest gain in strength first), and a full practice day fits everything. The practice page shows the robot\'s strength, now and with everything fitted.',
      'Easy and Hard change the elite teams too: about half as many and a little weaker on Easy, half again as many and stronger on Hard.',
      'Robot reveals around Week 0 (Build Week 5 to Competition Week 2): every elite team near you, a few famous ones from elsewhere and a local rival post one, each with a picture of the robot and what people make of it. The Inbox has an Elite watch note when the list of elite teams changes.',
      'Team-built swerve before modules are sold is much harder: before 2018 it needs CNC Machining, takes three times the hours and much more material, tops out lower and breaks down often; in 2018 and 2019 it takes twice the hours and is still fragile.',
      'A worn Parts Shelf still holds as many parts, but its upkeep at Kickoff rises as it wears, slowly at first and faster the more worn it is: up to five times at 0% condition. The Workshop card shows what it costs now and after a renovation, and the Inbox warns at 60% and 35%.',
      'When renovating the shelf would cost less than the extra upkeep its wear adds over the Kickoffs left in your career, a pop-up says so once, with a Renovate button.',
      'No-fail mode can be switched on from the New Career page (it was only in Settings).',
      'Renovate all: one button at the top of the Workshop brings every worn facility back to 100% for one bill (the facilities and their prices are in its tooltip).',
      'Published designs come out at the start of Build Week 2: their makers spend Week 1 building them. Until then the Design Office says so, with what copying would save against a week of your team\'s hours. Start your own design at Kickoff, or wait and use Week 1 for a test chassis, code, program projects or a rest before an overtime week.',
      'The team argues about it in the Inbox: wait or build our own at the start of Week 1 (or, if you started at Kickoff, whether you should have waited), a first look when the designs are out (the parts check, or theirs against ours), and a follow-up in Week 3 that depends on what you did. The forum has the oldest joke in the sport every year: a good team recommending the Anybot to everybody else, being far too good for it themselves. Meet them at an event with a copy and you hear about it.',
      'The copy estimate in the published designs window now counts mechanism kits and GridTube that two subsystems would share (it used to count every free kit for each of them).',
      'Copying a whole published robot checks the shelf first. A subsystem it can\'t cover (the Blueprint\'s swerve drivetrain without 4 swerve modules, or too few motors or encoders) shows what it is short of, with Buy buttons, and the build button says how many subsystems will start. Before, the copy left those subsystems out without saying so.',
      'The Apex Blueprint\'s story says how many swerve modules you have and takes you straight to them in the Inventory.',
      'Local teams are local on the world map. A scrimmage invitation, a team that drops off spare parts, a rookie team asking for help, a rival\'s reveal video and the weekly "locally" line now name a team near you and say how far away it is (they used to pick any team in your area, often hundreds of miles off). The "locally" line names a real winner from last week when there is one, and a pit request (a team short of a part at an event) comes only in a competition week when you play a regional or district event, from a team at that event.',
      'Show this team on the map: Inbox messages that name another team, and every row of the Scouting list, have a button that opens the World map centred on that team, ringed in gold with its distance from you. It does not make a message one that waits for you.',
      'World map: the box for a spot with several teams lists yours first, with a dash for strength (it said "null").',
      'The Parts Shelf can no longer be downgraded or removed: the parts on it would have nowhere to go.',
      'The guide gives the real size of each workshop room (2,850, 4,300 and 5,700 sq ft); the robotics center fits every facility at its top level, the new ones included.'
    ] },
    { v: '3.0', title: 'FRC Manager 3.0: the official release', notes: [
      'The ten-season career from 2016 to 2026 is out of preview: everything from the 2.9 versions below (the calendar, districts, the simulated world, ten real games and the stories in between), plus a bigger workshop, vendor booths, a pit crew that drills and two published robots a year.',
      'Fixed: in the World scouting table the best teams owed nearly all their OPR to the endgame (in 2020, 90 endgame points against a 25-point hang). A team\'s style still moves points between auto, teleop and the endgame, but never past what one robot can score in the endgame, and never more than 40% of its teleop. Scores from events you play were right all along. Seasons already in a save keep their old numbers until the next events.',
      'New facilities. CAD Workstations: fewer hours on new mechanisms and upgrades. Parts Shelf: how many of each bulky part the shop holds (half the most without one, two robots\' worth at the top level; control hubs, cameras and actuator kits always fit). Break Room: a little less fatigue every week in season, and auto-filled extra hours can use a little more of the week. Honors Wall: banners and trophies on display in History, morale a little higher, and a little more reputation every year.',
      'History: with an Honors Wall, a trophy shelf shows every finalist place, judges\' award and offseason win or final; the banner wall alone shows this season\'s and last season\'s honours together. Without one, everything stays in boxes (the celebrations can still be replayed). History is in the menu from the first season.',
      'Renamed: 3D Printing is the Prototyping Lab (a laser cutter from level 2), the Machine Shop is the Manual Machine Shop (mill, lathe, drill press, band saw), and CNC Machining\'s top level is a CNC mill and lathe. Nothing else changes.',
      'The AI coding lab: in September 2024 AI coding assistants arrive, and the Programming Station gets a fourth level. Its third level still gives one Finish now card a season; the fourth gives two.',
      'Two program projects for the season, without a project slot: Pit crew training (repairs between matches at events about 30% faster) and Bumper standards (quick-latch bumpers: no bumper incidents at events, however tired the crew).',
      'Vendor booths: at regionals and district events a control system vendor and a vision / COTS one set up on practice day, with the parts that sell out in season, 10% off (no shipping): up to 8 motors, encoders or planetary gearboxes per team, 4 of each kit and 2 of anything else.',
      'Published designs. From the 2018 season a veteran team, the Gearwrights, publishes the Anybot (a simple robot on the kit chassis) in Build Week 1, and from 2022 Apex Motion publishes the Apex Blueprint (a competitive robot on swerve; any vendor\'s parts fit). Two stories tell how they started. In Build Week 1 a window shows this year\'s robots. Copy a whole robot or single subsystems: the first build is cheaper (Anybot −50% hours, Blueprint −35%), has no first-build penalty, starts as version 2, is more reliable, and the drivers already know it (each design comes with build videos, practice drills and a simulator model, so they practise while it is built; copy only part of it and you get part of that). It teaches half the know-how, and upgrades are your own work at the usual cost. Copy only part of a design and the drivers start lower and the reliability bonus is smaller: the simulator model and the drills are of the whole robot. The other teams copy them too (the weakest build the Anybot, some of the lower middle the Blueprint, with its concepts), and the season recaps, the History page, the news and the chatter follow the published robots: what yours started from and how many copies played at your events.',
      'CAN FD hubs. In June 2022 both vendors launch a hub that gives the robot a second, faster CAN bus (story: "The bus is full"). From the 2023 season a competition robot with more than 14 motors and encoders and no hub is a little less reliable and now and then freezes for a few seconds in a match (a new failure: CAN bus overload). The Apex FD Bridge carries 48, the Lumen BusFD 40. Optional, and only for the competition robot. The Inventory and the Garage show how full the bus is.',
      'Established teams start with a few leftover planetary gearboxes, vendor and kit (once they exist, from 2017). The KOP low-profile gearbox is now the Kit low-profile gearbox, like the other kit parts.',
      'Starting facilities: established programs get shelving units, powerhouses a parts room, CAD workstations and a banner wall. Saves from before 3.0 get the Parts Shelf that holds what they own, so nothing is lost.',
      'The Workshop has two tabs: Technical (machines, programming, CAD, parts, practice field, pit) and Team & program (meeting room, break room, honors wall, FTC teams, trailer).',
      'Shop incidents, sponsor donations, the Inbox and the guide cover the new facilities.'
    ] },
    { v: '2.9.9', title: 'Preview of 3.0: CRESCENDO by the book, a Championship with ceremonies, and End Effectors of their own', notes: [
      'CRESCENDO (2024). No full-court shots (G414): a feeder at the Source drives out until its bumpers are clear of the opponents\' Wing before it lobs a note home, and a feeder with a defender on it lobs into the Neutral Zone instead, where its partners collect the notes and the opponents may take them first. Feeding is still worth a few points to a good alliance, no longer twenty.',
      'Amplify is the human player\'s button. Two Amp notes arm it, and a good human player holds it until two scorers are lined up at the Speaker with notes (the scorers wait for it); a beginner presses at once. Notes shot inside the ten seconds count. Partners with an amp mechanism or a pivot or turret shooter help charge the Amp, so alliances amplify two or three times a match.',
      'Spotlight. In the last 20 seconds the human player at the Amp throws three HIGH NOTES at the microphones above the chains; each one that lands adds a point for every robot onstage below it. Only the best human players land them often. Lit microphones show on the field.',
      'Fixed: the Finish now card had no button. A project at least half done now shows Finish now when a card is left, and Active projects shows the cards left this season, e.g. "hardware 2/3 · software 1/1".',
      'Packing for the next event (the bag years): only the newest version, or a unit identical to the one in the bag, can be packed; older units stay in storage, where they can be taken apart. Install Upgrade fits the newest packed unit of each subsystem (it fitted all of them in turn, so an older one could end up on the robot), and every upgrade fitted at an event brings that subsystem back to full condition.',
      'The practice-day Readiness card shows Auto success: the real chance the autonomous routine runs, from the Autonomous stat plus auto tuning, with a marker for the most practice can reach. It used to show only the tuning bonus, from 0.',
      'A tip-over knocks the parts up high: elevators, arms, shooters, climbers and end effectors each lose some condition (the lift or shooter most), and the event log says so.',
      'Field pictures: the 2018 Scale and Switches show which way they tilt (the lower plate shaded, chevrons along the arm in its colour). 2026 wide dumpers square the whole robot up to the hub when they shoot, are drawn four balls wide, and are now an adjustable-hood concept with a little more range.',
      'Mentors: after the August refresh, Search for more mentors brings a new list of candidates for a small fee, twice at most before Kickoff.',
      'End Effectors are a knowledge area of their own: every end effector concept (2018, 2019, 2023, 2025) builds on it instead of Arms & Wrists and Ground Intakes. It has its own research project, mentor specialty, a rule change and a new design that can make it go out of date, and Gripper kits count for it. Saved careers start it from half of the better of those two areas.',
      'Pneumatics and servo kits also speed up climbers and shooters with an adjustable hood or a pivot (not fixed shooters or turrets).',
      'Alliance selection: your pick list comes from your own scouting. It blends the OPR with the points your scouts saw each robot score, and a mixed-up scouting sheet now misleads the recommendations too; the pit scouts\' estimate of a robot\'s pushing replaces the truth.',
      'DEEP SPACE (2019): HAB Levels 2 and 3 are solid in teleop for every robot that is not climbing, so defenders waiting by the HAB stay on the carpet.',
      'REEFSCAPE (2025) defense meets a robot halfway between its coral station and the Reef and never follows it into the Reef Zone. Contact fouls are fewer and rarely major. Touching an opponent\'s Cage is a MAJOR FOUL even when a robot was pushed there, and robots climbing at the end no longer pass through the other alliance\'s Cages.',
      'The Championship opens with a ceremony after practice day: host city, divisions, how many teams, the season so far and your road there. Einstein opens with the emcee, the commentators and the livestream chat.'
    ] },
    { v: '2.9.8', title: 'Preview of 3.0: one way to build a second robot, and smarter robots on the field', notes: [
      'Second robot. The test chassis and the full copy are no longer projects of their own: they are shortcuts that start Build copy projects, the same ones the Design Office starts. A test chassis is a copy of your drivetrain for the second robot, or a basic Kitbot Tank, Mecanum or West Coast Drive before the drivetrain is designed; a full copy starts one copy for each subsystem the second robot lacks, all at once or none. A running one in a save is split into copies with its progress.',
      'Fixed: a second robot or test chassis was put in storage "for want of control system parts" with full shelves. Optional parts counted as missing (a network switch, which nobody sells before 2018, or planetary gearboxes), so in 2016 and 2017 no test chassis could run, and a full copy built without one left the second robot without a drivetrain (and the defense drill bar disappeared).',
      'Parts messages say exactly what is missing and how many: what each robot uses and what is on the shelf, e.g. "Needs 2 more motors (Robot 1 uses 22, Robot 2 would use 24: 46 in all, 44 on the shelf)". The shelves now hold two full robots of any game: 50 motors, 20 encoders and 32 planetary gearboxes (were 44, 18 and 24). A 2025 robot on every top option needs 23 motors, so its full copy asked for 46 and could never be built.',
      'Alliance selection. A team declines an invitation only if it would captain an alliance itself and could build a stronger one as a captain (it weighs the inviting captain and itself against itself and the best team likely left at its turn, by OPR). The best robot at an event is no longer turned down three times running: before, any future captain declined one invitation in five, whoever asked. The pick list marks teams that may decline, and a decline says why.',
      'Defense drills are always shown in season. In the bag years they stop once the competition robot is bagged (only one robot drives at home) and keep what the drivers learned before.',
      'Spares. The Design Office shows each subsystem\'s storage (2 at most) and event spares (3 at most: 2 in storage and the other robot\'s), the Garage the event spares of every subsystem, and the event pit how many identical spares are left. Build copy is refused once storage holds 2 copies of the latest version and both robots have it.',
      'Storage: a new setting takes apart old versions automatically (anything that is neither the latest design nor identical to the competition robot\'s), when a project finishes and at the end of each turn.',
      'Smarter robots in matches, in every game. Routes go round robots standing still and never aim at a spot inside a field element (2018 robots no longer shuffle on the spot beside the Switch). A robot that cannot reach a spot gives it up and tries another (a disabled partner in front of a 2017 peg no longer blocks a robot all match); partners keep a gap and give way to each other, and work a plate side by side (2018 Scale robots no longer push each other at the Scale). A robot whose intake or scorer breaks plays defense, and a partner that was defending goes back to scoring; robots with nothing left to do defend instead of waiting; defenders pick robots that are scoring. Scores, cycles and bonuses stay close to before; partners touch about 70–90% less.',
      'Defense. One defender per opponent in every game (two on one robot was common and is rare in real matches, a foul in some); in 2025 and 2026 an alliance defends with one robot at a time (2025: one robot on the opposing side; 2026: two could block both bumps or both trenches). Defenders no longer shake when they push: they hold their ground bumper to bumper, face the robot they guard and stop re-planning their route every tick, and robots turn at a real robot\'s pace instead of snapping round at every bump.',
      'REEFSCAPE robots can cross the field. The Cages hang where the manual puts them, 19 cm wide, and robots drive under the Barge through the gaps between two of their own alliance\'s Cages. Before, the Cages were drawn and built so wide that the Barge was a wall: a defender sent to the other side pressed against it and shook all match. Defenders now reach their targets on the other side. Robots crossing a 2025 gap or a 2026 bump take another way when a stopped robot blocks it, and keep to it when they replan. A defender that finds no way round a field element for a few seconds leaves that robot alone for a while, and one guarding a robot right by the Hub no longer flicks from one side of it to the other.',
      '2024: the Stage was drawn and played the wrong way round. It now points at the alliance wall, with the Podium under the leg nearest the wall, the chains along its three sides and parked robots under it.',
      'The 2022 field is turned as in the manual: the centre line crosses at about 66°, the Hub\'s arms run along it, each alliance\'s two Tarmacs sit in front of the fenders on its side, and the Hangar rungs go Traversal, High, Mid, Low out from the alliance wall. Robots start in the Tarmacs, Taxi means leaving them, lower-hub scorers drive right up to a fender, and in autonomous nobody takes staged cargo across the centre line.',
      'Rules checked against the 2022–2026 game manuals. 2022: scored cargo comes back out of the Hub after about 5 s (lower) or 7 s (upper), and touching a robot in its Hangar Zone late gives it Traversal points instead of a foul. 2023: the Community and Loading Zone have their real L shapes, Sustainability needs 6 links (5 with Coopertition), a complete grid can be Supercharged (3 points a piece), and touching a robot on its Charge Station in the endgame makes its alliance Docked and Engaged. 2024: Melody needs more notes at District Championships (21) and the Championship (25), and contact in the Stage Zone late is 2 tech fouls plus the Ensemble RP. 2025: Coral RP needs 7 coral on every level, Barge RP 16 points, and contact at a Cage late gives the Barge RP. 2026: the Tower is its real size, a little off centre; two robots at most climb in autonomous; contact at the Tower late gives a robot off the ground Level 3; Energized and Supercharged need more fuel at the championships.',
      'Match tester (tools/match-tester): plays any game with six random robots on random strategies, shows each robot\'s route and task, lets you break or disable a robot and drop it anywhere, and gives a report that replays the same match.'
    ] },
    { v: '2.9.7', title: 'Preview of 3.0: a vision company, planetary gearboxes, the Super pit and a busier Inventory', notes: [
      'Control system. The Inventory\'s Electronics tab is now the Control system tab, and the game calls the motors, encoders and hubs your control system everywhere.',
      'Lanternworks, the vision company. The "Vision in a box" story of 2017 now has a name: Lanternworks sells the Lantern 1 camera and the Lantern Link network switch (fewer comms dropouts, a little better vision) in its own catalogue under Subsystem COTS. After AprilTags are announced it launches the Lantern 2 camera (it replaces Lantern 1, which aims less well with tags) and the Spark ML accelerator (object detection on the robot). Stories, rumours and news follow the company.',
      'Planetary gearboxes. After a 2016 of broken home-made gearboxes, Sterling and Lumen launch planetary gearboxes for mechanism motors in the autumn of 2016; Apex keeps the line. One per motor, optional, fewer breakdowns, and they mix freely with either control system. The Kit of Parts adds a low-profile one for KOP motors, two in every kit.',
      'Servo actuator kits arrive with the story of the compressor that stays home (2022): they do the job of small cylinders and save more build hours than pneumatics from 2023. With both kits, the better counts.',
      'The Super pit: a third Pit Setup level from 2018 (a story in the summer of 2017 shows it first), in the same space. Before any match it fully repairs one subsystem of your choice with spare parts, and in simulated qualifications it repairs the worst one before every match. Its screens sharpen scouting.',
      'Finish now cards. Each top-level CNC Machining, 3D Printing and Machine Shop gives one card a season to finish a hardware project that is at least half done, and a top-level Programming Station one for a software project. No cost, no penalty.',
      'Stock that follows demand. In season the parts everybody wants sell out (the first brushless motor in 2019, the first swerve modules, kits this game uses a lot) and outclassed or unused parts stay on the shelf. The stock alert in the Inbox now names a control system or COTS part that really will be out next week, in season only, and lets you order it from the message.',
      'Stop Build Day. With two running robots you choose which one goes in the bag; the bagged robot is greyed out in the Garage and neither robot can change role. A scrimmage while the robot is bagged needs a real second robot (not a test chassis), and a team with one does its sponsor demos and shows with it, sparing the competition robot.',
      'Hall of Fame. A new World tab lists every team that won the FIRST Impact Award at the Championship during your career; they qualify for every Championship from Kickoff. Championship places now include your own team, highlighted, and marks Hall of Fame teams.',
      'Einstein. The Impact Finalists are announced before Final 1 and the Impact and Woodie Flowers winners after it on the pre-match and match pages too, not only on the event page. The Einstein results page shows the Woodie Flowers Award winner. The Woodie Flowers banners no longer carry the mentor\'s name, and a season\'s Woodie Flowers banner no longer shows twice in History during the offseason.',
      'Every turn activities (Team page): all fundraising, all outreach or mixed, run on their own when you press Continue. The STEM summer camp is offseason only, and the pizza and movie night is for the season.',
      'Smaller things. Program projects (the two award essays and the Knowledge Base) take no project slot. Install Upgrade with nothing to install no longer uses a practice block. The default team number fits the start year (a rookie gets that year\'s number, other teams an older one). A November pop-up reminds you to preorder field elements. With nothing left to upgrade, the school\'s grant comes as cash. Knowledge levels are coloured. The swerve concept no longer talks of buying modules before anyone sells them. Driver practice shows its weeks plainly, and defense drills have their own colour. Mecanum drives show four wheels from the side, the 2016 eight-wheel drive eight and tank treads a tread; the 2020 revolver is drawn at its real size.',
      'A "?" inside a window now puts the window away while you read the guide, and Back brings it back. How to play has been rebuilt for this version.'
    ] },
    { v: '2.9.6', title: 'Preview of 3.0: the world on a map, scouting for every team, the Woodie Flowers Award and more', notes: [
      'Woodie Flowers Award. Your students can nominate one mentor a season in an essay (Design Office, Program projects). The strongest nomination is picked for you, and you can choose another; extra hours make a better essay. Mentors now have a profession, seasons with the team and years in FIRST.',
      'As in the real rules: a regional team\'s nominee is judged at its next regional, a district team\'s at the District Championship. Each regional names one Woodie Flowers Finalist, each District Championship one (two or three from 2022). A mentor is a Finalist once.',
      'At the Championship one mentor in the world receives the Woodie Flowers Award, chosen from the season\'s Finalists and re-nominated past Finalists, and nobody receives it twice. It is presented on Einstein right after the FIRST Impact Award, with a celebration that names the winner\'s profession and introduces past real winners. A team whose mentor wins goes to Einstein to watch, qualified or not.',
      'Both bring reputation, a blue banner with the mentor\'s name (the Award\'s is in its celebration too) and a mark on the mentor\'s row; History keeps them under Mentor honours. A mentor who has received either never leaves the team on their own.',
      'A map of the world (World page, the first tab). Every team of the season sits near a real city of its area: circles group the teams close together, sized by how many and coloured by their average strength. Events are violet diamonds; your team is a gold star, and the events you registered for or played are ringed in gold with a line from home. The areas, the districts and the Championship cities are layers you can switch off. Filter by kind of team, strength and week; drag, scroll and click to zoom. A table under the map gives the same numbers for every area and district.',
      'Season scouting (World page, Scouting tab). Every team\'s season so far, updated after each competition week: events, W-L-T, ranking score, OPR and its auto, teleop and endgame split, best finish and awards. Filter by area, district and kind of team, sort by any column, see where your team ranks in the list, and jump to your row or any team number. Your events are measured from their matches; the rest of the world is simulated in the same points.',
      'The Scouting tab at events works the same way now: sort by any column, filter by area, jump to your team, and an Auto, Teleop and Endgame split of the OPR. The sidebar\'s District page is now the World page for every team.',
      'Stronger fields teach more. An event\'s stars now decide how much the team learns there: drive-team skills, know-how from competing and strategy read grow ×0.7 at ★ up to ×1.3 at ★★★★★ (regionals, district events, the District Championship). The Calendar shows each event\'s multiplier, and the October pop-up and Inbox say so.',
      'Registration before Kickoff. October now has its own Inbox message for registration (fees, late fee, withdrawals), apart from the sponsor news. A career team must be registered for at least one event to leave December: an Inbox reminder arrives at the start of the month, and Continue opens a pop-up with the fees and a link to the Calendar until it is. A team without the cash for a fee is only warned, and can register after Kickoff.',
      'KOP mechanism vouchers. Every Kickoff brings vouchers for the Kit of Parts subsystem kits (gripper, intake, shooter, lift): 2 in a rookie\'s first season, 1 in every other. Each pays for one kit in Subsystem COTS until the next Kickoff.',
      'Six more elite designs. 2019 Triple Level 3 climber: both partners onto HAB Level 3, 36 points, but only with both partners there in time, and a failed lift can drop them and the climber. 2020 Full-width four-bar intake + revolver indexer: fires its cells much faster and rarely jams. 2022 Direct traversal climber: quicker and surer, Traversal only. 2026 Linear slide intake: feeds the shooter faster and shrugs off hits. 2026 Dye-rotor turret: more fuel a second and steadier shots. The 2022 Dual-side intake is now the elite intake of its year, with a new Motorized pivot intake (complexity 4) below it that takes cargo still bouncing.',
      'Random order, checked against the calendar. FIRST STRONGHOLD allows tank drives only, so it is now drawn only in 2016 or 2017 (in the first two seasons of a career from 2016, never in one from 2018 on): later it contradicted the swerve-era season recaps and found no drive sets on sale. The next game no longer shows through its year before Kickoff (Inventory, preorders, Headquarters, the ledger), and the Kickoff Inbox title, the robot-naming news, the Program calendar and save slots show the calendar year. The 2016 recap has its own text when the season played another game (no eight-wheel defense crossers), and the Championships, Einstein and the Festival of Champions play whatever game the year drew.',
      'Two Championships, two champions. From 2017 to 2020 the World Champions celebration names its Championship: "2018 World Champions of Detroit", as the Festival already did.',
      'Mechanism kits at Kickoff. The Kickoff pop-up names the kits this game could use that are not sold yet (before the summer of 2021: arm, intake, indexer, climber and gripper kits), since kits follow the calendar and not the game.',
      'Team numbers follow the year, as in FRC. A career from 2016 starts with teams numbered up to about 5,750, and each season\'s rookies take the next block (about 10,800 to 11,400 in 2026), from the real numbers on FRC Events. Older programs keep their small edge in strength.',
      'Complexity. To keep one design at complexity 5 per subsystem, the 2019 Level 3 stilts and buddy climber, the 2022 traversal climber and the 2026 turret moved down one step. As with the first elite designs, each beats the next best by a few percent for elite teams and leaves season averages where they were.'
    ] },
    { v: '2.9.5', title: 'Preview of 3.0: five small things', notes: [
      'Auto-fill extra hours (Design Office). One button puts the turn\'s idle hours into extra hours on the projects already running. In season it fills the week to 90%, leaving the idle time that holds fatigue steady, and does nothing if the week is already that full; in the offseason it fills the whole month. It never starts a project. Tick "every turn" to have it done when you press Continue.',
      'End a sponsorship. From October to Kickoff, while the new offers are open, a contract can be ended to free its slot for a better offer. It costs reputation: 6 for a title sponsor, 3 for a partner, 2 for a grant, plus 1 for each further season it had to run.',
      'Downgrade a facility. Every owned facility has a Downgrade (or Remove) button that gives one level back to make room. Half that level\'s price comes back at full condition, less as it wears, and nothing for a level that was donated or paid by a grant.',
      'Undo a project. Any project started this turn can be taken back for everything it cost until you press Continue: builds, upgrades, research, copies, a test chassis or a full robot copy. After that it can only be cancelled, as before.',
      'The Festival of Champions winners\' banner now says THE ONE CHAMPION.'
    ] },
    { v: '2.9.4', title: 'Preview of 3.0: the Festival of Champions, a livestream, and brackets you can follow', notes: [
      'The Festival of Champions (July 2017). A team that wins Einstein in 2017 now gets the whole event. A pop-up on arrival tells what the real Festival was and why it was held only once. Both champion alliances are expected, so the event cannot be skipped, and the trip is paid for. The series ends with a celebration of its own (the winners are the one champion of 2017; the finalists remain World Champions of their city), a banner under Championship honours whose celebration can be replayed from the History page, and its own result page. On leaving you still get the story every team gets, "One champion after all", told about your series.',
      'A livestream for everyone else. Teams that are not in the Festival get an announcement in July (a pop-up, the inbox, the Calendar and a button on Headquarters). Watching is optional and free, takes none of the team\'s hours, and nothing is at stake. The series is played on the field in the match viewer: you watch as a spectator, with no coach calls, and can watch each match, skip to its result, skip to the end or close the stream. The pop-up about the real event is shown to anyone who opens the stream. If you do not watch, the result arrives the next month.',
      'The result, up front. The story everybody gets after the Festival ("One champion after all", pop-up and Inbox) now shows the series as a block of its own: the score, every match with its winner, and the six teams that played. Each team is listed with its season in your world: its finish, rank and alliance at every event, judged awards, how it earned its Championship place, and what its robot scored in the series. The champion alliances you did not see win are now drawn from the teams that really qualified for that Championship, from its half of the world.',
      'Brackets. A best-of-three series now shows every game it took (two or three), each with its score and its winner, and where the series stands. In every bracket your alliance is easy to follow: its rows are marked, its path through the bracket is drawn in gold (dashed where it drops to the lower bracket), and a line above the bracket says where you stand and which match is next.',
      'Elite designs. Four games get one more mechanism, the hardest of its season, marked "elite design": the 2016 Turret + hood shooter (aims while driving, hard to defend), the 2019 Turreted elevator + wrist (places without turning the chassis: a tank drive gains the most, a swerve or mecanum drive little), and the 2023 and 2025 Pivoting telescope (scores like the best lift of its year, never tips, and is a little better on the Charge Station and the cage). Each beats the next best by a few percent for much more work, and only the strongest teams in the world field them. The other lifts of 2019, 2025 and the 2023 double-jointed arm moved down one step of complexity to make room.',
      'Things that go wrong. A failed high climb in 2016 to 2020 now ends in a fall about a quarter of the time (it was one in twenty). Tipping in 2018 and 2019 depends much more on the driver. In 2020 and 2026 a robot can beach itself on a ball for a few seconds: in 2020 most of all on the generator bars, in 2026 less often and mostly on the bumps. A beached robot that another robot runs into is freed at once seven times in ten and tips over three times in ten. A buddy climb that fails can drop the partner and damage it: tick "Don\'t let a partner carry us" in the match plan to stay on the ground. For all of these a skilled driver has fewer, Push pace causes more and Conserve fewer.',
      'Effort. Rush now costs 15% more materials and Thorough 10% less; hours and results are as they were. Thorough used to cost more money for about what free extra hours give.',
      'Shorter pages, a glossary. Long explanations on the pages are now a line or two with a small "?" that opens the guide at the right section. How to play has a Glossary. The lost season is marked as the game\'s own timeline: the real 2020 season was stopped part-way through and its Championships were never held.',
      'Fix. The Festival\'s result page showed a World Champions banner that belonged to another event.'
    ] },
    { v: '2.9.3', title: 'Preview of 3.0: end effectors, drive sets, mechanisms in a box and an inbox worth reading', notes: [
      'End Effector. 2018, 2019, 2023 and 2025 have a new subsystem: the claw or gripper at the end of the lift, with its own Grip stat. A poor one costs placements and a little time on every score. In those games the ground intake is now optional: without one, the end effector collects the pieces itself. Each game offers three (a claw that throws cubes in 2018, one that keeps hold of a missed hatch in 2019, a wristed gripper in 2023, a pivoting coral head in 2025). A robot from an older save gets its end effector automatically.',
      'Drivetrain parts. The two vendors now sell West Coast drive sets, the standard before swerve: a West Coast drive runs on two of them, and better sets raise its speed and pushing power. Sterling sells them until it closes; Lumen stops making them when it launches its own swerve module and sells the last stock through the 2022 season. A West Coast drive also runs on two COTS Drive gearboxes, at lower performance, so it can always be built. The same gearboxes drive a mecanum (4) or make a kit chassis faster (2). The Kit drivetrain (the old kitbot gearbox) fits the kit chassis only and is the slowest of the three. In the Inventory the drive sets share a Drivetrain section with the swerve modules. Mecanum is slower than it was and nearly helpless against a defender: with the same robots, a West Coast drive scores 1 to 12% more, and keeps that lead when defended.',
      'Mechanisms in a box. A new story for the lost year: arm, intake, indexer, climber and gripper kits are first sold in August 2021, together with GridTube frame stock that every mechanical build can use (10% fewer hours and 15% less material, on top of the kits). Before that only elevator, shooter and turret kits exist. The catalogue is now called Subsystem COTS. Its Kit of Parts shelf holds four basic subsystem kits (KOP gripper, intake, shooter and lift), sold in every year: each helps only the simplest concept of a subsystem, by 20% of the hours and materials. The Kit drivetrain is listed in the Drivetrain section under Electronics.',
      'An inbox worth reading. About eighty new messages: mid-season arguments about every game (is a shooter worth it in 2017?), trends in mechanisms, what the two vendors say about each other, and rumours ahead of the calendar\'s big changes. None of them pops up. They sit in the Inbox among the other news, and some are worth acting on.',
      'Second-hand prices follow the news. A part that has been overtaken sells for less from the day its replacement is on sale: an older version, a brushed motor once brushless ones exist, Sterling parts, West Coast drive sets once swerve modules are sold, a pneumatics kit as motors take over. The Sell tab shows each markdown and the reason.',
      'Rules. A registration made this turn can be undone for everything it cost, until you press Continue. A team wins the FIRST Impact Award once: Hall of Fame teams are not judged again. Know-how at Level 4 or 5 is tuned to the way things were: a rule, technology or design change costs it half as much again and always takes one level, with or without a specialist mentor. The Knowledge Base needs a 25-hour update every year, or it protects nothing. Facilities wear less than half as fast in the offseason. Pneumatics fade a year later (10% from the 2023 season).',
      'Also. The 2026 season gets its recap before the career summary, and the season review\'s own button now shows the pop-ups of the new offseason (they were queued but never shown). The season cards on the main menu open that game\'s Kickoff briefing, with a button to play it as a Single Season Challenge. Texts brought up to date: ten seasons on the main menu, how often vendors launch, the Apex founding story (the founder is one of the six engineers), the 2025 recap (four seasons after the lost year).'
    ] },
    { v: '2.9.2', title: 'Preview of 3.0: the 2016–2020 games checked against the official manuals', notes: [
      'Fields. The five classic fields now follow the zone and element drawings in the game manuals. 2016: the Low Bar stands at the guardrail, straight across from the attackers\' own Secret Passage; the audience picks the defense in position 3 and you pick the other three. 2017: the airship is its real size, with one rope on the face toward the alliance wall and two toward the neutral zone, and the Retrieval Zone is the band in front of the angled Loading Station. 2018: the Scale plates sit where they should and the Exchange is left of centre for each alliance. 2019: the cargo depots are against the wall, the two ships stand apart at the centre line and the rockets are 8 ft from it. 2020: the Shield Generator has its floor bars and its legs at the trench edges, and the Control Panel sits on a tunnel.',
      'Limited game pieces. 2016 has 18 boulders, 2018 has 30 cubes for each alliance and 2020 has 48 Power Cells. A boulder or cell you score comes back out on the other alliance\'s side (their Secret Passage, their Loading Bay). In 2020 that makes two shooters and a defender the strong line-up.',
      '2020 in detail. Robots slow down over the steel bars under the Shield Generator, and the bars wear swerve modules and mecanum wheels (a tank drive is not affected). A trench-height robot crosses under the Control Panel instead, where nobody may touch it. The tunnel is one robot wide, so two trench runners hold each other up, and defenders wait at its mouth and outside the Loading Zone. A low frame climbs more slowly and a defender can block some of its shots.',
      'Rules from the manuals. Contact in a protected zone is a tech foul where the manual says so, and touching a robot in its endgame zone awards it the climb. 2016: the tower has strength 10 at District Championships and the Championship, a tech foul makes it one stronger, and attackers in the courtyard may not be touched in the last 20 seconds. 2017: the boiler counts five balls a second and stops at the buzzer. 2018: taking ownership scores a point at once. 2019: the HAB Zone is protected all match and includes the Loading Stations, and the two bays in the ship\'s nose start with cargo that a sandstorm hatch keeps.',
      'Human players. In 2017, 2019, 2020, 2023, 2024 and 2025 the human player feeds the robot all match, and their skill now sets the loading speed: 5 to 10% of an alliance\'s score between a beginner and an expert crew. In 2016, 2018, 2022 and 2026 it hardly matters. An alliance uses its two best human players.',
      '2017 fuel and buddy climbs. Most 2017 teams now run gears and a rope and nothing else: a fuel shooter misses most of what it fires until it is well developed, so it only pays on strong robots. Each of the five hoppers is tipped once, on its own: by a shooter catching its fuel, or by an opposing gear robot sent to tip it first so that nothing is caught (your coach can order that with "Tip their hoppers first"). The fuel then lies all over the carpet and has to be swept up, slowly. A buddy climber, which lifts a partner that parked underneath, is on offer in 2018, 2019 and now 2020, the games whose rules allowed it.'
    ] },
    { v: '2.9.1', title: 'Preview of 3.0: vendor loyalty, a longer banner wall and the 2020 recap', notes: [
      'Vendor loyalty. Each vendor keeps a loyalty level for your team, built from the seasons your competition robot runs on its electronics and from what you order. Every new level brings a loyalty sponsorship as a pop-up in September, with a choice of free parts at Kickoff, a voucher, or a sale until Kickoff; a team that stays with one vendor gets three in a ten-season career. Loyal teams also find parts in stock more often in season. The Electronics tab shows your level with each vendor.',
      'History: the banner wall uses smaller banners once a long career has hung many of them, a District Championship win now earns a banner, and the robots of past seasons wrap into rows. The 2020 season has its recap, shown before the season that never came.',
      'Pop-ups: the month in a window\'s header now appears only on offseason news (Stop Build Day no longer says December in March), each product in Apex\'s first launch has its own description, and the performance figures on launch cards stay inside the card.'
    ] },
    { v: '2.9.0', title: 'Preview of 3.0: ten seasons (2016–2026) and the district model', notes: [
      'A career now covers ten seasons. Start in any year from 2016 to 2026 (there is no 2021 season) and play through to 2026. Five games are new: 2016 FIRST STRONGHOLD, 2017 FIRST STEAMWORKS, 2018 FIRST POWER UP, 2019 DESTINATION: DEEP SPACE and 2020 INFINITE RECHARGE, each with its own field, robot concepts, six AI robot types, strategies, news and chatter. In random order the games are shuffled, but everything below still follows the calendar year.',
      'Careers saved in v2.5 load and finish exactly as before. New features apply to careers started in this version or later.',
      'Money follows the year. Every price, fee and budget is shown in the dollars of the current season, about 27% lower in 2016 than in 2026, so a 2016 budget buys what it bought then.',
      'A third vendor. From 2016 to 2019 the premium catalogue is Sterling Motion, with brushed motors under their own names. In the 2018 offseason Lumen launches the first brushless motor at about the same price; Sterling has no answer, holds a clearance sale and closes, and Apex Motion opens for the 2020 season. Sterling parts fit Apex parts, and old stock can be resold at a discount.',
      'Technology by year. Swerve is team-built before 2020 (a CNC Router or a Lathe, far more hours, fragile) and sold as modules afterwards. Vision cameras go on sale for 2018, and AprilTags arrive in 2023, when vision also starts helping autonomous. Pneumatics kits save fewer hours every few years. AI teams follow the same curve: almost no swerve in 2016, most strong teams by 2024.',
      'Stop Build Day (2016–2019): after build season the competition robot is bagged. You can still develop new mechanisms and upgrades: they are packed when finished and fitted in the pits on practice day (Install Upgrade), or in the robot access window for district teams. Hardware projects run at half speed and drivers cannot practise at home, unless a second robot carries the work.',
      'Playoffs by year: single elimination with best-of-three series through 2022, double elimination from 2023. The Championship changes too: one in 2016, two from 2017 to 2020 with a round robin on Einstein, one again from 2022. In 2017 the two winning alliances meet at the Festival of Champions, a best of five in July.',
      'The lost season. Right after the 2020 Championship a pandemic shuts everything down. The 2021 season is cancelled, the calendar jumps to June 2021, and you choose two programs for the year at home. Know-how, student skills, mentors, sponsors and a fifth of all teams are lost. The 2021 offseason events are played with the 2020 robot.',
      'Districts. Choose a district as your home (Lakeshore, Harbor, Evergreen; Mesa from 2019; Sierra from 2026) or stay a regional team. District teams play two local two-day events for one fee, earn district points with the real formula, and qualify through a District Championship in week 7. When a district forms in your area, a pop-up the July before lets you join or stay regional.',
      'Wildcards before the Regional Pool. Through 2024 a regional team qualifies by winning, with the Chairman\'s (Impact), Engineering Inspiration or Rookie All-Star award, or on a wildcard: when a team that has already qualified earns another place at a regional, that place goes to the finalist alliance, captain first. The Regional Pool takes over in 2025, as it really did.',
      'A living world. Every team and every event of the season is simulated: about 740 teams in 2016, 930 in 2020, 760 after the lost season and 900 in 2026, with rookies arriving and teams folding every year. The new World page (District page for district teams) shows standings, every event\'s winners and who has qualified for the Championship. Your Championship division is made of the teams that really qualified.',
      'Stories. Big changes arrive as pop-ups with their background: a season recap every year, the first vision camera, the brushless motor, the fall of Sterling and the alumnus who founded Apex, the first competitive swerve drives, the end of bag day, double elimination, AprilTags, new districts, and the Chairman\'s Award becoming the Impact Award in 2023. A career that starts later gets one letter with the state of the art.',
      'History shows every season\'s robot, drawn as it competed, and you can name each robot in the Garage. The lost year has its own card.',
      'Two optional pre-match choices: in 2016 your alliance picks the defenses the opponents must cross, and in 2018 the order in which the Vault buys Levitate, Boost and Force.',
      'How to play has a new guide, The decade, and the other guides cover the classic games, districts and the older playoff formats.'
    ] },
    { v: '2.5', title: 'Finals game by game, sponsor outlook and the electrical shakedown', notes: [
      'Playoff bracket: the finals show every game. Final 1, Final 2 and Final 3 each get their own box with both alliances and the score (Final 3 is marked "if needed" until the series stands at one win each), and a line above them gives the state of the series ("A2 leads 1–0"). The Next strip names the game too: "Next: Final 2 against Alliance 2".',
      'Finance has a Sponsor funding card. This season: base money paid, bonuses reached and bonuses still possible. Next season: the expected base (contracts that continue, plus deals up for renewal weighted by their renewal chance) and the possible max bonus. In the offseason it shows how last season ended and what is already signed for Kickoff. Bonus amounts under each sponsor now include that sponsor\'s +50% bonus perk, so they add up to the totals.',
      'A second robot helps the electrical team too. Every week a second robot runs in season (a test chassis is enough, even before the competition robot drives) builds an electrical shakedown from the testing hours you run. At 100% (30 hours) the competition robot has 40% fewer brownouts and comms dropouts at its first event, 25% at the second and 10% after that, and the team gains Electrical & Reliability XP every week. Build the chassis early in build season to have it ready for your first event. The bar is in the Design Office under Testing hours.',
      'Offseason tech changes: when an area held XP far above the top level, the pop-up and the inbox post now say what happened ("2403 → 938 XP: only 1250 XP still counted as current, then −25%") instead of showing only the percentage.',
      'FIRST Impact Award without playing on Einstein: a regional Impact Award winner that is knocked out in its division (or not picked) now goes to Einstein anyway and watches from the stands. The other alliances play the bracket, the six Finalists are named before Final 1 and the winner after it with the same ceremony and celebration, and the finishing page shows your new banner, the award list and the whole Einstein bracket.',
      'Workshop space. Every facility level now takes floor space in square feet (a full practice field 2,200, a CNC router 160, the trailer none), and the school decides how much room the team has, in three levels: the robotics classroom (2,550 sq ft), the technology wing (3,850) and a robotics center (5,100, which fits everything at its top level). A rookie starts in the classroom; established and powerhouse teams start in the technology wing. At a season review the school moves you up when Program Support has reached 80 (technology wing) or 90 (robotics center), and room is never taken back. The Workshop shows the floor plan as a bar, and an upgrade that does not fit is greyed out.',
      'Four new facilities: an Electronics Workbench (fewer brownouts and comms dropouts, motors and electronics wear more slowly), a Welding Station (hardening and lightweighting take fewer hours and do more, more reliable new builds), a Team Meeting Room (outreach counts for more, Impact presenters rehearse here) and an FTC Team Space (run one to three FTC teams of your own: each takes a feeder program slot, costs $300 a year instead of $1,000 and counts 1.8 times for recruit quality).',
      'The school board and your sponsors give back. When Program Support rises by 6 or more in a season the board renovates every worn facility for free; at +12 it adds a grant for one upgrade of your choice (up to $12,000). The season review and a board letter list what you got. Satisfied sponsors donate equipment: a facility level that matches their business, if your workshop has room, announced with a pop-up. The higher a sponsor\'s satisfaction above 60, the likelier. With every sponsor slot filled and no sponsor activity skipped it averages about one donation a year (fewer in the first year, at most one per season and one per offseason).',
      'Drive team: a fifth, optional role, the Technician (Mechanism speeds up pit repairs, Composure catches pre-match mistakes). "Auto-pick best" now gives the coach seat to your best student strategist unless the adult behind the glass is better, and the list says what that adult is worth. Matches count for every role. Awareness now matters on the field: a driver who reads the game loses less time to defenders and fouls less. Column headers in the student table explain each skill on hover.',
      'Playoff bracket in the official layout: rounds left to right, the upper bracket on top, the lower bracket below, lines showing where each winner goes, and open slots that say "Winner of M7". Pit time in the playoffs now follows the bracket: the matches other alliances play between two of yours (an upper-bracket winner rests longer than a lower-bracket alliance on back-to-back matches), plus the break before and between finals. Qualification matches already used the gap in the schedule.',
      'The Championship has its own look: division colours on your division\'s pages, and gold, stars and the eight division champions (crossed out as they fall) on Einstein. The match viewer joins in: the field is framed in the division colour or in gold, and the scoreboard names the alliances and their divisions.',
      'After a match, the buttons to prepare or simulate the next one are at the top of the result page, where they are on the event page, so you can play through a schedule without moving the mouse across the screen. Pages also keep their scroll position when a button redraws them.',
      'Reputation is earned more slowly, and the last points are the hardest: a gain counts for less the higher your reputation is, while losses count in full. A powerhouse now starts at 85 reputation and 72 Program Support. A team is full at 100 students: further applicants go on a waiting list.',
      'Impact Award: the Team page now shows exactly what your Presentation score is made of (Business mentor, your two best presenters by name, meeting room) and what raises it; hover any line of the rating for what moves it.',
      'Inbox: a "Sidebar count" switch makes the number next to Inbox count only what waits for you (open replies, a shop incident, sponsor activities). Table headers line up with their columns. A rookie World Champion gets its own line in the celebration. News and team chatter talk about the new seasons\' strategies, tech changes, workshop space and the new facilities.'
    ] },
    { v: '2.4', title: 'The Championship stage, a moving state of the art and deeper games', notes: [
      'FIRST Impact Award at the Championship. Win a regional Impact Award and your team is judged again against the world\'s best programs: six Finalists are named before Einstein Final 1 and the winner after it. Both hang a blue banner. The winner gets its own celebration, joins the Hall of Fame and is invited to every future Championship. Division events no longer hand out Impact, Engineering Inspiration or Rookie All-Star awards.',
      'World Champions celebration, refined: the driver and the drive coach are named and highlighted, and the message knows your history (finalists last year, champions again after a gap, back-to-back: "only a few teams have done it before in FRC history", three or more in a row: "no one has done it in the past decades"). History lists Championship honours on their own and can replay each celebration, and shows this season\'s finished events while the season runs.',
      'Event pages show where you stand at a glance: a "Next" strip on the event page and beside the match buttons with the match number (Q12 of 60), and in playoffs your alliance number, the alliance you face and your last playoff result (for example "Next M10 against Alliance 1 · last: M7 W 95–80"). Einstein shows each alliance\'s division, and its OPR now starts from the division numbers instead of zero.',
      'The state of the art moves on. From your second season, each offseason starts with two rule or vendor changes for next season (new wiring rules, a new code architecture, new vision software…), and one month between July and September brings three new designs spotted online. Each makes part of your know-how outdated: the area loses 25% (rules) or 15% (designs) of its XP, counted from at most a little over the top level, so no area stays maxed for free. A mentor who specializes in the area halves the loss. Each arrives as a pop-up and an inbox post.',
      '2024 CRESCENDO: every shooter can score the Amp without an amp mechanism. Fixed subwoofer shooters do it slowly with a low success rate, pivot and turret shooters at a moderate rate; an amp bar or amp elevator is still far better. Concept cards say so.',
      '2025 REEFSCAPE: the Reef has six faces with their own branches (two coral per face at L2, L3 and L4, an L1 trough, one algae each). Robots fill the faces nearest their stations first and then drive around to the far side, so the last branches cost longer cycles. The field shows the coral on each face.',
      '2026 REBUILT: fuel is tracked on the field (neutral zone, each alliance zone, depots), scored fuel returns to the neutral zone and a thin neutral zone is slower to sweep. The hoarding meta is in: while their hub is inactive, alliances sweep the neutral zone and lob fuel back into their own zone, then refill a few steps from the hub when it lights up (about 10–15% more fuel for alliances that run it well). AI alliances pick it up over the season; yours follows your strategy read, as with note feeding in 2024.',
      'A second robot now teaches more. With two robots running (a test chassis is enough), driver practice includes defense drills: at 100% your drivers lose 35% less speed, cycle time and accuracy to a defender. If the second robot drives like the competition robot (tank: Kitbot or West Coast; holonomic: Mecanum or Swerve), auto routines and auto upgrades develop 20% faster and the team gains Autonomous Pathing XP every week.',
      'New event incidents: a loose bumper that falls off mid-match (the referee disables the robot; this replaces the old bumper-swap incident), vision not calibrated (only with vision on the robot), wrong code on the robot, a tool left inside that blocks a mechanism, and a joystick left unplugged that costs the first 20 seconds of teleop.',
      'Shop is now called Inventory. Buying mechanical COTS on a full shelf replaces the most worn one, like electronics; replaced parts are sold automatically when they are still sellable. Fixed: in the offseason a part could show "in stock" and still refuse the purchase.',
      'Tutorial tours run once per game instead of every season. Bars, scales and scouting highlights use fixed colours instead of the team colour (the testing-hours bar has a legend now).'
    ] },
    { v: '2.3', title: 'Layout polish, smarter spare parts and a bigger Kickoff kit', notes: [
      'Shop → Electronics: products line up in three columns under their vendor (Apex Motion, Lumen Robotics, Kit of Parts), newest version first. A vendor without a version of a part shows an empty slot instead of shifting the others.',
      'Calendar: every month card is the same size and scrolls inside, empty months say so, and the Week 0 scrimmage card now sits above Week 1 in Regional registration.',
      'Auto-restock for spare parts now works all year. Every week (every month in the offseason) it keeps enough spares for driver practice and home repairs on both robots, using cash on hand. Before each event it buys what the event needs with a safety margin (falls and breakages can double the usual need). If money runs short it buys what it can and says so, instead of buying nothing.',
      'Every team gets a Kit of Parts at every Kickoff: 4 brushed motors, 2 low-profile encoders and 2 kitbot gearboxes. As in FRC, only rookies get a control hub, in a bigger first-season kit (8 motors, 4 encoders, 4 gearboxes and the hub). Established and powerhouse teams start with one leftover kit hub on the shelf (a powerhouse fills its third hub slot with it). The Kickoff pop-up lists the kit, and the inbox says if a full shelf recycled anything.',
      'The Alumni fundraising dinner is available from the first season for established and powerhouse teams (rookie teams still wait a season).',
      'Test chassis (Garage → Robot 2): a simple Kitbot Tank, Mecanum or West Coast Drive built from parts on the shelf early in the season, with no project slot (about 20–45 team hours). Even without a Practice Field it gives 6 testing hours a week: development testing for robot code, autos, vision and drivetrain projects at half the cost, and driver practice. With a Practice Field it counts as half a second robot. Driving a different drivetrain only partly carries over to the competition robot\'s familiarity.',
      'Winning the World Championship now opens a celebration: an animated trophy, rotating gold rays, shimmering "YOU ARE THE 20XX WORLD CHAMPIONS" (or "2023–2024 BACK-TO-BACK…", THREE-PEAT…), your new gold banner, your alliance, the story of the final, and what people are saying. There is an easter egg at the bottom too: the alliance that won that game\'s real Einstein, with the game named.',
      'Random-order careers now have their own timeline: seasons count up from 2022 in career order (2022, 2023, …) while the games are shuffled, so dates, banners, season titles and back-to-back headlines read in order. The real game\'s year only appears where it identifies the game (the easter egg).',
      'Established teams start with more older parts at different wear levels (extra Lumen motors, encoders and gearboxes): enough for a test chassis once the competition robot takes the best ones.',
      'More breathing room: section titles sit further from the cards above them, labels no longer touch their bars, and a few cards and pop-ups got more padding.'
    ] },
    { v: '2.2', title: 'Feeder programs, vendor launch events and FRC playoff tiebreakers', notes: [
      'Feeder programs have their own card on the Team page, under the Impact Award. Run up to 6 (FLL, FTC, camps, clubs), each with a focus: Balanced, Drive team, Technical, Strategy or Outreach. Programs grow over three school years (60% → 85% → 100% strength). Every September they add students to the team, and core recruits who come from a program bring the skills its focus trains (the roster shows where each one came from). Outreach programs add the most students and count most for Impact. Changing a focus costs a year of growth, except while a program is new. Older saves keep their programs as established, balanced ones.',
      'Finance shows title, partner and grant slots (for example Title 0/1, Partners 2/4, Grant 0/1). A deal signed this turn has an Undo button until you press Continue, and "Auto-pick best" fills every open slot with the best-value offers. Offers whose slot is full say so instead of showing Sign.',
      'Project slots now show on the Active projects card (Design Office) and the mentor count on the Your mentors card, instead of at the top of the page.',
      'Events: after the last practice block (or Auto-pick), the practice day stays on screen with what each block did and the readiness numbers. Press Continue to start qualifications.',
      'Fixed: a tied playoff game no longer leads to a "Finals 4". Ties follow the FRC tiebreakers: foul points first, then auto points and endgame points (2022 Hangar and 2023 Charge Station points come before auto). Only a game tied on all of them is replayed, and it shows as a replay (for example "Finals · Game 3 (replay)"). The result screen says which tiebreaker decided it, and the bracket marks the winner with *.',
      'Inbox replies are open only for the turn they arrive in: a week in season, a month in the offseason. Unanswered offers show as expired.',
      'Vendor launch events: every fall, 1–4 months before Kickoff, Apex Motion and Lumen Robotics each hold one launch with at least one new product (a launch before the first season too). Each launch gets a pop-up and an inbox post with the presentation, what the community says and your electrical lead\'s take. A rumor at the start of each offseason says when each vendor will launch, and the Calendar shows the launch months. No product line goes past version III in a career; the previous version stays on sale through the next season. Saves in progress keep the products already out and plan the rest under the new rules.'
    ] },
    { v: '2.1', title: 'Two robots, driver familiarity and mechanism kits', notes: [
      'Robot 1 and Robot 2 in the Garage. Either can be the competition robot (it gets the best electronics and goes to events); choose which one the drivers practice on each week. The practice robot project became "Build a full copy" in the Garage. A second robot adds up to 6 testing hours a week, makes practice on it up to 25% more effective and helps event tuning (more the closer it matches the competition robot), but a second set of electronics and copies is expensive.',
      'Build copy: make more of a finished subsystem design for the second robot or as a spare. Copies take about a quarter of the first build\'s hours, use team hours but no project slot (they sit under Fabrication), and need their own electronics and kits. The first one of a new concept or version is a prototype and costs 10% more.',
      'Driver familiarity for each subsystem: new mechanisms start low, new versions cost a little, very different concepts (a dumper to a turret, tank to swerve) cost a lot. Shop driving, practice and matches win it back; in matches a subsystem gives 85–100% of its stats.',
      'Storage holds up to 2 built units of each subsystem. Take old ones apart for spare parts and to get their mechanism kits back. At events, a spare identical to the competition robot\'s (in storage or on the other robot) can be swapped in to restore that subsystem to 100%.',
      'Mechanism kits per concept: a turret shooter uses a turret kit and a shooter kit, a traversal climber up to 4 climber kits. Partial sets help partly. New indexer & hopper kit; kit prices and slot limits adjusted, and motor and encoder slots raised for two robots.',
      'Kit of Parts electronics can now be bought any time (brushed motors, low-profile encoders, a basic control hub, kitbot gearboxes): very cheap and always in stock, for rookies and for teams caught short in season. They are much slower than Apex or Lumen parts, and mixing them with vendor electronics costs 5% more project hours and a little performance. A full shelf no longer accepts parts that would be thrown straight out.',
      'A turret shooter builds on fixed-shooter know-how: concepts now need knowledge in all their core areas (marked ★).',
      'Game elements: fixed preordered and bought sets showing 0% (they now count), preorders show as pending right away, and the practice field card shows element status. Without a Practice Field the kit game pieces are enough; Level 1 fits a quarter set, Level 2 a half, Level 3 a full set.',
      'Loophole fixes: taking a subsystem apart returns at most half its materials in spare parts, a bare second chassis no longer unlocks the second-robot bonuses, a Practice Field without game elements is never worse than none, copies can\'t soak up testing or extra hours, worn mechanism kits help less, and overdrafts in consecutive seasons cost more each time.',
      'Parts is now the Shop. Overtime weeks never lower fatigue, and fatigue is shown as a bar. Calendar months scroll on their own. The Team page is tidier, with the Impact Award under the drive team.'
    ] },
    { v: '2.0', title: 'Parts, fatigue and a new look', notes: [
      'New Parts screen with a real parts library: motors, encoders, control hubs and swerve modules from two electronics vendors (Apex Motion: premium; Lumen Robotics: value), plus drive gearboxes, cameras, pneumatics and optional mechanism kits.',
      'Sell parts you no longer need (Shop → Sell) for part of their price: the better their condition, the more you get. Only parts above 60% condition can be sold.',
      'Every build, including the practice robot, now uses parts. Parts are reusable but wear in matches and practice (slightly slower, more failures). The newest parts go on the competition robot, the rest on the practice robot. Each part type has slot limits; new parts replace the most worn.',
      'Mixing Apex and Lumen electronics costs 10% more hours on hardware and software projects and a little performance. Vendors release 2–3 new generations over a career; the old one stays on sale for a year.',
      'A free Kit of Parts at every Kickoff (bigger for rookies). In season, parts and field elements often sell out, so stock up before Kickoff. Mechanism kits make builds faster and remove first-build penalties.',
      'Game elements: quarter, half and full-field sets that wear down, only help up to your practice field\'s size, and can be preordered for next season.',
      'Extra hours: put spare hours into any project (in 1-hour steps) to raise its quality, with diminishing returns.',
      'Fatigue: leaving about 10% of a week\'s hours idle keeps it steady; overtime and competitions raise it. At events it causes incidents (wrong auto, flat battery, mixed-up scouting) and lowers scouting credibility. New Incidents tab at events, and a Week 7 rest week before the Championship.',
      'Skip any event on its week, and withdraw from any event in the Calendar (half refund only a month or more ahead). Fixed: the game could get stuck in the offseason with a negative balance.',
      'Outreach and fundraising: repeats within a month pay less (resets monthly). New activities unlocked by facilities, sponsors, mentors and the trailer, plus a team night that lowers fatigue.',
      'Team trailer: drive to far events instead of flying (cheaper, no air-freight damage), gentler sponsor demos and +20% robot outreach.',
      'Spare parts reset every season (none before the first), with an auto-restock toggle that buys what the next event needs.',
      'Sponsors: offers sit at a similar level for each difficulty, title sponsors pay about three times a partner, and offers grow a little with reputation and results. Top programs face sponsors who expect wins.',
      'STEM support fund when the balance is under $1,000: emergency money at a cost in reputation.',
      'Team emblem and team colours: the whole interface takes on your team colour. New icons throughout.',
      'Guided tours each season and at your first event and match (switch them off any time), "?" help on every screen, and a new How to play guide organized by topic.'
    ] },
    { v: '1.5', title: 'Debt, calendar & inbox update', notes: [
      'In-season debt: from Kickoff to the Championship you can spend into the red (down to −$50,000). The school clears it at the season review, with a hit to Program Support and reputation that grows with the debt, and the school board writes to you about it. Offseason spending still needs cash, and fundraisers now work even when the balance is negative.',
      'New program calendar: every turn from May to the season review, with events and results, project finish dates, sponsor duties, program milestones and money dates. Filter by category.',
      'Inbox: at least one news item and one to three chatter posts every turn, many about your own team (results, awards, mentors, school, reputation), with far fewer repeats.',
      'Inbox replies: some messages (rookie teams asking for help, interviews, scrimmage invitations, pit requests, school board meetings) let you reply for a small effect. Optional, no popups.',
      'Defense follows the real rules: pin limits (5 s in 2022–2024, 3 s in 2025–2026, then back off six feet) and each game\'s protected zones. No more robots stuck for long stretches.',
      'Turret shooters are much harder to defend: they aim and shoot on the move.',
      'Robots no longer overlap each other or drive through hubs, the Reef, Stage legs, the Barge leg, cages or Towers; stuck robots now steer around traffic.',
      'Systems Shakedown at an event now also rebuilds worn parts, bringing robot condition back to 100%.',
      'Graphics: 2022 shots use red and blue cargo, and 2022 low-goal robots show a bucket instead of the 2026 dumper.'
    ] },
    { v: '1.4', title: 'Season realism update', notes: [
      'REEFSCAPE (2025): the Barge now spans the whole midline, with each alliance\'s three cages and Net on its own half; Processors sit on each alliance\'s right.',
      'REEFSCAPE: alliances share two Coral Stations — the best scorer takes one and the others share the second, queueing at the chute.',
      'RAPID REACT (2022): cargo bounces out of the Hub all over the field, and robots chase their own color anywhere.',
      'CRESCENDO (2024): alliances learn to feed notes across the field and stockpile them for Amplify. A Source-lane defender cancels most of it. Your alliance picks it up through your new strategy read — Strategy mentor, drive coach, driver practice and events scouted — never a button.',
      'REBUILT (2026): new wide dumper shooter — huge throughput, worse under defense. Turrets now shrug off defense.',
      'REBUILT: Tower climbs are slow and risky, so most strong teams keep shooting instead. The default endgame plan is now "Only if worth it".',
      'New failure: a failed high climb can end in a fall — the robot is out for the match, badly damaged, and spare parts are scrapped.',
      'All five fields and the robots got a detail pass: real field elements, bumpers with team numbers, frames, electronics and intake rollers.'
    ] },
    { v: '1.3', title: 'Testing hours', notes: [
      'A Practice Field now gives weekly testing hours (8/12/16 h, +4 with a practice robot), like wind-tunnel time.',
      'Split them between development testing (faster, better upgrades; $40/h) and driver practice (drive-team skills and confidence; costs a few spare parts).',
      'Driver confidence matters more in matches: faster cycles, quicker alignment, fewer fouls and surer climbs.',
      'Repairs use spare parts. The robot arrives at events at 100% unless you\'re short on spares, flying, or did a sponsor demo that week; HQ previews the arrival condition.'
    ] },
    { v: '1.2', title: 'Awards, money and scouting', notes: [
      'The Impact Award is much harder: a multi-season Impact rating plus a submission. HQ shows your odds at each registered regional.',
      'Outreach and fundraising no longer use team hours; repeated fundraisers pay less within a program year.',
      'Facilities cost more, and upgraded 3D Printing, CNC, Machine Shop and Programming Station add project slots (6 permanent at most).',
      'Scouting shows what each robot actually did in qualifications — auto, climbs, fault-free matches, fouls, defense — and AI captains pick by it.',
      'Each season has its own weak spots (tip-overs in 2023, brownouts in 2026), and brief comms drops are now common.'
    ] },
    { v: '1.1', title: 'Program depth', notes: [
      'Battery fleet: up to 10 batteries (20 with a Smart Charging Station); new ones replace the most worn.',
      'Blue banners for event wins and Impact Awards, and a banner wall in History.',
      'Strategy follows the real games: one defender in 2022, 2024 and 2026; three scorers in 2023 and 2025. AI teams catch on during the season.',
      'Alliance captains can call partners to score or defend in the playoffs.',
      'Upgradable Practice Field, sponsor and school opportunities, weekly activity limits, an October registration reminder, a weekly suggested upgrade and a visual team-hours planner.'
    ] },
    { v: '1.0', title: 'First release', notes: [
      'Career mode (five seasons, real or random order) and the Single Season Challenge across 2022–2026.',
      'Budget, sponsors, mentors, facilities with wear, shop incidents and a lively inbox.',
      'Regionals, Championship qualification, live 2D matches with coach calls, alliance selection and double-elimination playoffs.'
    ] }
  ];
  const SEEN_KEY = G.BETA ? 'frcm_beta_seen_version' : 'frcm_seen_version';
  UI.S.notes = { full: true, html() {
    return '<div class="menu-wrap"><div class="menu-box" style="max-width:820px"><div class="row"><div class="logo" style="font-size:28px">What\'s new</div><span class="tag acc" style="margin-left:10px">v' + h(G.VERSION) + '</span><span class="sp"></span><button class="btn" data-act="back">Back</button></div>' +
      '<p class="muted">Version notes for FRC Manager. Saves from earlier versions keep working.</p>' +
      G.RELEASES.map((r, i) => '<div class="card mb' + (i === 0 ? ' hl' : '') + '"><div class="ct"><span class="tag ' + (i === 0 ? 'acc' : '') + '">v' + h(r.v) + '</span>&nbsp; ' + h(r.title) + (i === 0 ? ' <span class="xs good" style="margin-left:6px">Latest</span>' : '') + '</div>' +
        '<ul class="vnotes">' + r.notes.map(n => '<li>' + h(n) + '</li>').join('') + '</ul></div>').join('') +
      '</div></div>';
  } };
  // One-time popup when a player opens a newer version than they last saw (first-time players just get the menu).
  UI.versionCheck = function () {
    let seen = null;
    try { seen = localStorage.getItem(SEEN_KEY); localStorage.setItem(SEEN_KEY, G.VERSION); } catch (e) { return; }
    const hadSaves = (function () { try { return G.Save.slots.some(s => !!G.Save.meta(s)); } catch (e) { return false; } })();
    if (seen === G.VERSION || (!seen && !hadSaves)) return;
    const r = G.RELEASES[0];
    UI.modal('<h2>Updated to v' + h(r.v) + '</h2><div class="sub">' + h(r.title) + '</div><ul class="vnotes">' + r.notes.slice(0, 5).map(n => '<li>' + h(n) + '</li>').join('') + '</ul>' +
      '<div class="row mt"><button class="btn primary" data-act="nav2" data-arg="notes">See all version notes</button><span class="sp"></span><button class="btn" data-act="closeModal">Close</button></div>');
  };
  // How to play: see tutorial.js (guide by topic)
  UI.A.back = () => UI.go(G.S && G.S.team ? 'hq' : 'menu');
  UI.S.settings = { full: true, html() {
    const S = G.S;
    return '<div class="menu-wrap"><div class="menu-box" style="max-width:720px"><div class="row"><div class="logo" style="font-size:28px">Settings</div><span class="sp"></span><button class="btn" data-act="back">Back</button></div>' +
      '<div class="card mt"><label class="f">Default match speed<select class="inp" data-chg="prefSpeed">' + [1, 2, 4, 8].map(s => '<option value="' + s + '" ' + (UI.prefs.speed === s ? 'selected' : '') + '>' + s + '×</option>').join('') + '</select></label>' +
      '<label class="row mt"><input type="checkbox" data-chg="tutToggle" ' + (UI.Tut.enabled() ? 'checked' : '') + '> Show tutorials (a short tour once per game: at your first Kickoff, first event and first match)</label>' +
      (S ? '<label class="row mt"><input type="checkbox" data-chg="badgeActSet" ' + (S.settings && S.settings.badgeAct ? 'checked' : '') + '> Inbox count in the sidebar shows only items that wait for you (open replies, a shop incident, sponsor activities)</label>' : '') +
      (S && S.mode === 'career' ? '<label class="row mt"><input type="checkbox" data-chg="noFail" ' + (S.settings.noFail ? 'checked' : '') + '> No-fail mode (the program can\'t be cut when Program Support hits 0)</label>' : '') + '</div></div></div>';
  } };
  UI.A.badgeActSet = v => { const S = G.S; if (!S) return; S.settings = S.settings || {}; S.settings.badgeAct = !!v; G.Save.write('auto'); };
  UI.A.prefSpeed = v => { UI.prefs.speed = Number(v); G.Save.saveSettings(UI.prefs); };
  UI.A.noFail = v => { G.S.settings.noFail = v; };

  // =====================================================================
  // SEASON REVIEW
  // =====================================================================
  UI.S.review = { nav: 'hq', html() {
    const S = G.S, hs = S.history[S.history.length - 1];
    if (!hs) return '<p>No review.</p>';
    let o = '<div class="xs muted">SEASON REVIEW</div><h1>' + h(G.Career.seasonName(G.S, hs.year)) + '</h1>';
    const head = hs.worldChamp ? 'WORLD CHAMPIONS' : hs.divWin ? 'Championship division winners' : hs.champs ? 'Championship qualifiers' : hs.events.some(e => e.won) ? 'Regional winners' : hs.events.some(e => e.playoffs) ? 'Playoff team' : 'Building season';
    o += '<div class="sub lg acc b">' + head + (hs.elite && hs.elite.met ? ' ' + UI.eliteMine(S) : '') + '</div>';
    // (3.5) the elite standard: where the season's OPR ranks in the world, and what that means for next season
    if (hs.elite) { const E = hs.elite; o += '<div class="sm muted mb">World ranking by OPR: <b>' + U.ord(E.rank) + '</b> of ' + E.of + ' teams (' + E.opr + '). The top ' + E.n + ' are elite' + (E.met ? ': <b class="good">your team carries the Elite tag next season</b>.' : (E.rank <= E.n ? ', but an elite team also plays the Championship' : ' (from ' + E.cut + ')') + (E.lost ? ': <b class="bad">the Elite tag comes off</b>.' : '.')) + ' ' + UI.q('world', 'Elite teams') + '</div>'; }
    o += '<div class="grid g3">';
    o += UI.card('Events', hs.events.length ? '<table class="t"><tr><th>Event</th><th>Rank</th><th>Result</th></tr>' + hs.events.map(e => '<tr><td>' + h(e.name) + '</td><td>' + (e.rank ? e.rank + '/' + e.size : '') + '</td><td>' + h(e.finish) + (e.awardNames.length ? '<div class="xs acc">' + h(e.awardNames.join(', ')) + '</div>' : '') + '</td></tr>').join('') + '</table>' : '<p class="muted">No events attended.</p>');
    if (hs.loyal && hs.loyal.length) o += UI.card('Vendor loyalty', hs.loyal.map(y => '<div class="mb"><div class="row sm"><b style="color:' + D.VENDORS[y.brand].color + '">' + h(D.VENDORS[y.brand].name) + '</b><span class="sp"></span><span class="muted nowrap">' + y.pts + (y.next != null ? ' / ' + y.next : '') + ' points</span></div>' +
      '<div class="sm">' + h(D.LOYALTY.names[y.lvl]) + (y.up ? ' ' + UI.tag('new level', 'acc') : '') + '</div>' +
      '<div class="xs muted">+' + y.gain + ' this season: ' + (y.robot || 0) + ' for the competition robot, ' + (y.buy || 0) + ' for your orders.' + (y.up ? ' A letter from ' + h(D.VENDORS[y.brand].short) + ' arrives in September.' : '') + '</div></div>').join(''), '', 'mb');
    o += UI.card('Program goals', hs.goals.map(g => '<div class="row sm mb"><span class="' + (g.met ? 'good' : 'bad') + '">' + (g.met ? '✔' : '✘') + '</span><span class="tag">' + g.tier + '</span><span>' + h(G.Career.goalText(G.S, D.PROGRAM_GOALS[g.id].text, hs.home || null)) + '</span></div>').join('') +
      '<div class="hr"></div><div class="kv"><span class="k">Program support</span><span>' + Math.round(S.support) + ' (' + (S.season.supportDelta >= 0 ? '+' : '') + (S.season.supportDelta || 0) + ')</span><span class="k">Reputation</span><span>' + Math.round(S.rep) + (S.season.intlRep ? ' <span class="xs muted">(+' + S.season.intlRep + ' for your international partner' + (S.season.intlRep > D.SPONSOR_INTL.rep ? 's' : '') + ')</span>' : '') + '</span><span class="k">Legacy this season</span><span class="acc b">+' + hs.legacy + '</span></div>');
    o += UI.card('Finances', '<div class="kv"><span class="k">Earned</span><span class="good">' + U.money(hs.earned, hs.px) + '</span><span class="k">Spent</span><span class="bad">' + U.money(hs.spent, hs.px) + '</span><span class="k">Balance</span><span class="' + (hs.money < 0 ? 'bad' : '') + ' b">' + U.money(hs.money, hs.px) + '</span><span class="k">Avg RP / qual match</span><span>' + hs.avgRP.toFixed(2) + '</span>' +
      (S.season && S.season.debt ? '<span class="k">Debt covered by school</span><span class="bad">' + U.money(S.season.debt) + ' (support −' + S.season.debtPen.support + ', reputation −' + S.season.debtPen.rep + ')</span>' : '') + '</div>');
    o += '</div>';
    { const bd = (S.season && S.season.board) || hs.board, Sh = G.Shop, nx = Sh.nextSpace(S), n = v => v.toLocaleString('en-US');
      if (bd) o += '<div class="card ' + (bd.space || bd.reno || bd.grant ? 'hl ' : '') + 'mt"><div class="ct">' + UI.icon('workshop', 18) + ' From the school board<span class="sp"></span>' + UI.tag(D.SPACE_TIERS[S.spaceTier || 0].title + ' · ' + n(Sh.space(S)) + ' sq ft') + '</div>' +
        (bd.space ? '<div class="row sm mb"><span class="good">✔</span><span><b>More room.</b> The team moves into ' + h(bd.space.name) + ': ' + n(bd.space.from) + ' → <b>' + n(bd.space.to) + ' sq ft</b>.</span></div>' : '') +
        (bd.reno ? '<div class="row sm mb"><span class="good">✔</span><span><b>Free renovation.</b> The district\'s crew brought ' + (bd.reno === 1 ? 'your worn facility' : 'all ' + bd.reno + ' worn facilities') + ' back to 100% condition.</span></div>' : '') +
        (bd.grant ? '<div class="row sm mb"><span class="good">✔</span><span><b>Equipment grant.</b> One facility upgrade of your choice, up to ' + U.money(D.BOARD.cap) + ', paid by the board. Use it in the Workshop.</span></div>' : '') +
        (!bd.space && !bd.reno && !bd.grant ? '<div class="sm muted mb">No changes to your workshop this year.</div>' : '') +
        '<div class="xs muted">' + (nx ? 'Next room: ' + h(nx.name) + ' (' + n(nx.sqft) + ' sq ft) at Program Support ' + nx.sup + '. ' : 'You have all the room there is. ') + 'When support rises by ' + D.BOARD.reno + ' or more in a season the board renovates your facilities for free; at +' + D.BOARD.grant + ' (and support ' + D.BOARD.grantSup + '+) it adds an upgrade grant. Room is never taken back.</div></div>'; }
    const last = S.upcoming >= S.order.length || S.mode === 'single';
    o += '<div class="hint mt">' + (last ? 'This was your final season.' : S.support <= 0 && !S.settings.noFail ? 'Program Support has collapsed — the school is ending the program.' : 'Next: the offseason. Rule and vendor changes in May, graduation in June, new designs over the summer, recruiting in September, vendor launches in the fall, sponsors and registration in October, Kickoff in January.') + '</div>';
    o += '<div class="row mt"><span class="sp"></span><button class="btn primary lg" data-act="reviewNext">' + (last ? 'Final summary ▶' : 'Continue to offseason ▶') + '</button></div>';
    return o;
  } };
  UI.A.reviewNext = function () {
    const S = G.S; G.Career.advance(S); UI.go(S.phase === 'end' ? 'end' : 'hq');
    if (S.phase !== 'end' && G.Career.dueActivities(S).length) UI.A.activities();
    else if (S.phase !== 'end' && S.incident) UI.A.incident();
    else if (S.phase !== 'end' && S.dispute) UI.A.dispute();
    else if (S.launchQueue && S.launchQueue.length) UI.launchModal();
  };

  // =====================================================================
  // END / SUMMARY
  // =====================================================================
  UI.S.end = { nav: 'hq', html() {
    const S = G.S;
    let o = '';
    if (S.mode === 'single') {
      const g = G.Career.grade(S);
      o += '<div class="xs muted">SINGLE SEASON CHALLENGE</div><h1>Grade: <span class="acc" style="font-size:44px">' + g.grade + '</span></h1><div class="sub">' + h(U.infl(g.goalText)) + ' — ' + (g.met ? '<span class="good">achieved</span>' : '<span class="bad">not achieved</span>') + ' · legacy ' + g.legacy + '</div>';
    } else {
      const L = S.legacy;
      const title = S.endReason === 'fired' ? 'Program cut' : L >= 1500 ? 'Hall of Fame Program' : L >= 900 ? 'Dynasty' : L >= 500 ? 'Regional Powerhouse' : L >= 200 ? 'Rising Program' : 'Building Program';
      o += '<div class="xs muted">CAREER COMPLETE</div><h1>' + h(title) + '</h1><div class="sub">' + S.team.num + ' ' + h(S.team.name) + ' · Legacy points <b class="acc">' + L + '</b>' + (S.worldChamps ? ' · ' + S.worldChamps + '× World Champions' : '') + '</div>';
    }
    o += '<div class="card"><table class="t"><tr><th>Season</th><th>Events</th><th>Best result</th><th>Awards</th><th>Champs</th><th class="num">Legacy</th></tr>' + S.history.map(hs => {
      const best = hs.worldChamp ? 'World Champion' : hs.divWin ? 'Division winner' : hs.events.some(e => e.won) ? 'Regional winner' : hs.events.some(e => e.finalist) ? 'Finalist' : hs.events.some(e => e.playoffs) ? 'Playoffs' : '—';
      return '<tr><td>' + h(G.Career.seasonName(G.S, hs.year)) + '</td><td>' + hs.events.length + '</td><td>' + best + '</td><td>' + hs.awards.length + '</td><td>' + (hs.champs ? '✔' : '') + '</td><td class="num">' + hs.legacy + '</td></tr>';
    }).join('') + '</table></div>';
    const bn = G.Career.banners(S);
    if (bn.length) o += '<div class="card mt"><div class="ct">Banner wall ' + UI.tag(bn.length + ' banner' + (bn.length > 1 ? 's' : ''), 'acc') + '</div>' + UI.bannerWall(bn) + '</div>';
    const k = D.AREAS.map(a => ({ a, l: G.Robot.know(S, a.id) })).filter(x => x.l > 0).sort((p, q) => q.l - p.l);
    o += '<div class="card mt"><div class="ct">Knowledge legacy</div>' + (k.length ? k.map(x => UI.tag(x.a.name + ' Lv' + x.l, 'acc')).join(' ') : '<span class="muted">—</span>') + '</div>';
    o += '<div class="row mt"><button class="btn" data-act="nav" data-arg="history">Season details</button><span class="sp"></span><button class="btn primary" data-act="quitMenu">Main menu</button></div>';
    return o;
  } };
})();
