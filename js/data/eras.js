'use strict';
/* FRC Manager — the calendar: what each year of the career looked like. Prices, playoff formats, the technology eras
   and the stories that go with them follow the calendar year, whatever game a random-order career happens to play. */
(function () {
  const D = G.Data = G.Data || {};

  // Price index by calendar year, from US consumer prices (2026 = 1). Every amount in the game is kept in 2026 dollars
  // and shown in the dollars of the career's current year (U.money). 2021 has no season but the pandemic year uses it.
  D.PRICE_IDX = { 2015: 0.72, 2016: 0.73, 2017: 0.74, 2018: 0.76, 2019: 0.77, 2020: 0.78, 2021: 0.82, 2022: 0.88, 2023: 0.92, 2024: 0.95, 2025: 0.97, 2026: 1 };

  // ---------- Technology by calendar year (each row changes what it names, from that season on) ----------
  // swerve: cots = modules are sold; else team-built: hours x, reliability +rel, stat ceilings x ceil, extra materials,
  //         and it needs a CNC Router or a Lathe.
  // vision: cam = a vision camera is sold and needed; max level; hours x; ceiling of the Vision stat; tags = AprilTags
  //         (vision also helps autonomous). pneu: share of intake/manipulator build hours a pneumatics kit saves.
  // aiSwerve: share of the strong AI teams whose archetype allows swerve that actually run it. aiMotor: what the motors
  //         of the day do to AI drive speed and scoring speed (x9 and x7, like the player's parts). bag: Stop Build Day.
  D.ERA = [
    { y: 2016, swerve: { cots: false, hours: 2, rel: -12, ceil: 0.9, mat: 1000 }, vision: { cam: false, max: 1, hours: 2, ceil: 55, tags: false }, pneu: 0.25, aiSwerve: 0.02, aiMotor: -0.38, bag: true },
    { y: 2018, swerve: { cots: false, hours: 1.5, rel: -6, ceil: 1, mat: 1000 }, vision: { cam: true, max: 2, hours: 1, ceil: 75, tags: false }, aiSwerve: 0.06, aiMotor: -0.33 },
    { y: 2019, aiSwerve: 0.1, aiMotor: -0.2 },
    { y: 2020, swerve: { cots: true, hours: 1, rel: 0, ceil: 1, mat: 0 }, pneu: 0.2, aiSwerve: 0.3, aiMotor: -0.09, bag: false },
    { y: 2022, aiSwerve: 0.5, aiMotor: 0 },
    { y: 2023, vision: { cam: true, max: 2, hours: 1, ceil: 92, tags: true }, pneu: 0.1, aiSwerve: 0.65 },
    { y: 2024, pneu: 0.05, aiSwerve: 0.75 }
  ];

  const Era = G.Era = {};
  // Careers from before v3.0 have no calendar: they keep the v2.5 rules exactly.
  Era.LEGACY = { y: 0, legacy: true, swerve: { cots: true, hours: 1, rel: 0, ceil: 1, mat: 0 }, vision: { cam: true, max: 2, hours: 1, ceil: 99, tags: false }, pneu: 0.15, aiSwerve: null, aiMotor: 0, bag: false };
  const cache = {};
  Era.at = function (cy) {
    if (cache[cy]) return cache[cy];
    const out = { y: cy };
    D.ERA.forEach(r => { if (r.y <= cy) Object.keys(r).forEach(k => { if (k !== 'y') out[k] = r[k]; }); });
    if (!out.swerve) Object.assign(out, Era.LEGACY, { y: cy, legacy: false });
    return (cache[cy] = out);
  };
  // Calendar year of a career state (old saves without a calendar: the modern era)
  Era.cy = S => (S && S.cal && G.Career ? G.Career.cy(S) : null) || 2026;
  Era.of = S => (S && S.cal ? Era.at(G.Career.cy(S)) : Era.LEGACY);
  // Playoff format at every event: single elimination with best-of-three series through 2022, double elimination
  // with a best-of-three final from 2023.
  Era.playoffs = cy => (cy && cy < 2023 ? 'se' : 'de');
  // ---------- The Championship by calendar year ----------
  // n: how many Championships; divs: divisions (alliances on Einstein) at each; fmt: how Einstein is played
  // ('se' bracket of best-of-three series, 'rr' round robin then a best-of-three final, 'de' double elimination);
  // final: the two Championship winners meet at the Festival of Champions in July (2017 only, as in reality).
  const DIV8_16 = ['Archimedes', 'Carson', 'Carver', 'Curie', 'Galileo', 'Hopper', 'Newton', 'Tesla'], DIV_H = ['Carver', 'Galileo', 'Hopper', 'Newton', 'Roebling', 'Turing'], DIV_N = ['Archimedes', 'Carson', 'Curie', 'Daly', 'Darwin', 'Tesla'];
  const DIV8 = ['Archimedes', 'Curie', 'Daly', 'Galileo', 'Hopper', 'Johnson', 'Milstein', 'Newton'];
  Era.champs = function (cy) {
    if (cy <= 2016) return { n: 1, divs: 8, fmt: 'se', cities: ['St. Louis'], names: [DIV8_16] };
    if (cy <= 2020) return { n: 2, divs: 6, fmt: 'rr', cities: ['Houston', cy === 2017 ? 'St. Louis' : 'Detroit'], names: [DIV_H, DIV_N], final: cy === 2017 };
    if (cy === 2022) return { n: 1, divs: 6, fmt: 'rr', cities: ['Houston'], names: [DIV_H] };
    return { n: 1, divs: 8, fmt: 'de', cities: ['Houston'], names: [DIV8] };
  };
  // in the two-Championship years the west and south play in Houston, the north and east in St. Louis / Detroit
  Era.champsSide = region => (['Midwest', 'Northeast', 'Canada'].includes(region) ? 1 : 0);
  // Regional teams and the Championship. Through 2024 there is no Regional Pool: a place earned by a team that has
  // already qualified becomes a wildcard for the finalist alliance. The pool (points from a team's best two regionals)
  // starts in 2025. The real rules changed a little from year to year; the game uses one wildcard rule and one pool rule.
  Era.POOL_FROM = 2025;
  Era.wildcards = cy => !!cy && cy < Era.POOL_FROM;
  Era.POOL_TWO = 12; // Regional Pool points the cut-off drops by when there are two Championships (twice the places)

  // The premium electronics vendor: Sterling Motion until it closed in 2019, Apex Motion from the 2020 season
  Era.STERLING_LAST = 2019;   // last season Sterling parts are sold for
  Era.CLEAR_MONTHS = 2;       // clearance: the first months of the offseason after that season (May, June)
  Era.CLEAR_PRICE = 0.6;
  Era.STERLING_RESALE = 0.5;  // second-hand value of Sterling parts once the company is gone

  // ---------- The pandemic: the 2021 season is never played ----------
  // Right after the 2020 season the calendar jumps to June 2021. Losses below; each "year at home" program softens one.
  D.PANDEMIC = { know: 0.4, skill: 0.2, mentor: 0.25, sponsor: 0.3, support: 5, rep: 0.1, cond: 15, batt: 0.3, fold: 0.21, picks: 2,
    programs: [
      { id: 'remote', name: 'Remote training', icon: 'laptops', desc: 'Weekly CAD and code sessions by video call. Know-how fades half as fast.' },
      { id: 'skills', name: 'Skills challenge at home', icon: 'team', desc: 'The drive team takes turns with the robot in a car park and everyone films their part. Students lose half as much skill, and the drivers keep their feel for the robot.' },
      { id: 'community', name: 'Community response', icon: 'printer', need: 'printer', desc: 'Print face shields and mask straps for the local hospital (needs a 3D printer). Reputation and sponsor satisfaction rise, and it counts as outreach for next season.' },
      { id: 'sponsors', name: 'Keep the sponsors close', icon: 'finance', desc: 'A video update every month and a thank-you campaign. No sponsor leaves, and they pay half their usual amount for the lost season.' }
    ] };
  D.STORY_PANDEMIC = { id: 'pandemic', at: 'pandemic', tag: 'WORLD NEWS · SPRING 2020', color: 'var(--bad)', title: 'Everything stops',
    body: ['Two weeks after the Championship a new virus is spreading faster than anyone can follow. The schools close "for a fortnight". The fortnight does not end.',
      'The workshop is locked with the robot still on its cart. The summer events are cancelled one by one, then Kickoff, then the whole 2021 season. For the first time since the program began, a year will pass without a competition.',
      'What the team does with a year at home is up to you.'],
    means: ['There is no 2021 season. The calendar moves on to June 2021.', 'Students still graduate on time: two senior classes leave before the team meets again.', 'Know-how fades, skills rust, and mentors and sponsors drift away. Choose two programs to hold on to what matters most to you.',
      'This is the game\'s own timeline. In reality the 2020 season was stopped in March 2020, part-way through its competition weeks, and its Championships were never held; 2021 was played from home, as remote challenges.'],
    talk: [['We left the robot charging. I keep thinking about that.', 'a student on Team {t}'], ['See everyone in two weeks.', 'every lead mentor, in March'], ['I have a garage, a 3D printer and nowhere to be.', 'a mentor on Team {t}'], ['Our seniors never got their last match.', 'a drive coach']] };
  D.STORY_RETURN = { id: 'return2021', at: 'pandemic', tag: 'JUNE 2021', color: 'var(--good)', title: 'Back in the shop',
    body: ['Fifteen months after the doors were locked, they open again. The robot is where you left it. The batteries are flat, the whiteboard still says "Championship packing list", and half the faces in the room are new.',
      'Offseason events are back this summer and autumn. They play last season\'s game with last season\'s robots, because nobody has built anything else. Kickoff is in January 2022.'],
    talk: [['Is this the new kid or the old kid? I cannot tell with the mask.', 'a lead mentor'], ['The robot started on the first try. I may cry.', 'a student on Team {t}'], ['A fifth of the teams we used to play are gone.', 'a regional volunteer'], ['Nobody here has ever been to a competition. We start from the beginning.', 'a mentor on Team {t}']] };

  // Told the first time a career's robot is bagged (2016 to 2019)
  D.STORY_BAG = { id: 'bagday', at: 'bag', tag: 'ROBOT RULES', color: 'var(--warn)', title: 'Stop Build Day',
    body: ['Tonight at midnight the competition robot goes into a plastic bag, and a mentor signs a form to say it stayed there. That is the rule in these years: six weeks to build, and after that the robot may only be touched at events.',
      'It is meant to keep the season fair and the students rested. In practice the teams that can afford it build a second robot, and never stop.'],
    means: ['You can still develop: a new mechanism or an upgrade finished after tonight is packed and fitted in the pits on practice day (Install Upgrade), as every team does.', 'Until the season ends, that hardware work runs at half speed: the team builds from drawings, without the robot to try things on.', 'A second robot carries the work: with one running, hardware projects keep their full speed.', 'The drive team can only practise at home on a second robot.', 'Software and research carry on as usual.'],
    talk: [['It is in the bag. Nobody look at it. Nobody THINK about it.', 'a lead mentor'], ['Our practice robot has more hours on it than our real one.', 'a driver on Team {t}'], ['Bag day is the only night all season that I sleep.', 'a parent'], ['We weighed the bag. For the form. It weighs one bag.', 'a student on Team {t}']] };

  // ---------- Stories (pop-ups) ----------
  // cy: the season a story belongs to. at: 'off:N' = month N (0 = May … 7 = Dec) of the offseason BEFORE that season;
  // 'recap' = the start of the offseason AFTER that season. hit: tech knowledge that the change dates.
  // {t} in a quote is replaced by a team number.
  const VC = { T: '#c8b273', A: '#ff9f43', B: '#35c9d6' };
  // The Festival story for a team that played in it: the same pop-up, ending the way this career's series ended
  function festivalStory(S) {
    const d = S.festival && S.festival.cele, r = S.festStream && S.festStream.result;
    if (!d && r) { // a team that was not in it: the series as the stream showed it (or as it was played without them)
      const n = r.games.length, how = n >= 5 ? 'It went the distance: five matches, and the last one settled it.' : n === 3 ? 'It was over in three matches.' : 'It took four matches.';
      return {
        body: ['Two Championships made two winning alliances, and nobody could leave it there. In July the two alliances met for a best-of-five on a single field: the Festival of Champions.',
          how + ' The ' + r.winner + ' champions beat the ' + r.loser + ' champions ' + r.w + '–' + r.l + ', in front of a crowd that had driven across the country to see the question settled.' + (S.festStream.stage === 'watched' ? ' Your team watched it on the stream.' : '')],
        // the result as a block of its own, with the six teams as the world simulation has them (a line of text for a save without it)
        series: r.series || null, mine: r.series ? null : r.games.map((g, i) => 'Match ' + (i + 1) + ' ' + (g.won ? r.winner : r.loser) + ' ' + Math.max(g.a, g.b) + '–' + Math.min(g.a, g.b)).join(' · ') + '. Champions: ' + r.teams.map(t => t.num + ' ' + t.name).join(', ') + '.', mineTag: 'THE SERIES'
      };
    }
    if (!d) return null;
    const won = d.kind === 'winner', n = d.games.length, hi = Math.max(d.w, d.l), lo = Math.min(d.w, d.l);
    const how = n >= 5 ? 'It went the distance: five matches, and the last one settled it.' : n === 3 ? 'It was over in three matches.' : 'It took four matches.';
    return {
      body: ['Two Championships made two winning alliances, and nobody could leave it there. In July the two alliances met for a best-of-five on a single field: the Festival of Champions.',
        how + ' ' + (won ? 'The ' + d.city + ' champions, your alliance, beat the ' + d.otherCity + ' champions ' : 'The ' + d.otherCity + ' champions beat your alliance, the ' + d.city + ' champions, ') + hi + '–' + lo + ', in front of a crowd that had driven across the country to see the question settled.'],
      means: [won ? '2017 has one champion alliance after all, and it is yours.' : '2017 has one champion alliance after all. Yours is still the World Champions of ' + d.city + '.', 'The Festival is not held again: from next season the two Championships each crown their own winners.'],
      series: d.series || null, mine: d.series ? null : d.games.map((g, i) => 'Match ' + (i + 1) + ' ' + (g.won ? 'won ' : 'lost ') + g.mine + '–' + g.theirs).join(' · '), mineTag: 'YOUR FESTIVAL'
    };
  }
  D.STORIES = [
    // ---- 2016 ----
    { id: 'recap2016', cy: 2016, at: 'recap', tag: 'SEASON RECAP · 2016', color: 'var(--accent)', title: 'Six wheels, brushed motors and one big room',
      body: ['This is what the sport looked like in 2016. Almost every robot rolled on six or eight wheels and turned by skidding. Every motor had brushes. Vision was a webcam, a single-board computer in a printed case and one programmer who had not slept since February.',
        'About 3,100 teams played, and 600 of them met under one roof for a single Championship. It was the last time everyone fit in one building.'],
      means: ['From next season there are two Championships. Twice as many teams are invited, so qualifying gets easier.', 'The robots do not change yet: brushed motors, no vision camera for sale, swerve only if you machine it yourself.'],
      talk: [['Six wheels, a drop centre and a driver who trusts it. What else is there?', 'a drive coach'], ['One Championship felt like the whole world in one hall. I will miss it.', 'a mentor on Team {t}'], ['Our vision system is a student holding a flashlight.', 'a programmer on Team {t}']] },
    // ---- 2017 ----
    { id: 'recap2017', cy: 2017, at: 'recap', tag: 'SEASON RECAP · 2017', color: 'var(--accent)', title: 'Two Championships, one long argument',
      body: ['The Championship split in two this year, in two cities a week apart. More teams than ever got to go. And for the first time the season ended with two winning alliances, each sure it was the best in the world.',
        'The forums argued about it from April to July. The number of teams grew by seven percent anyway.'],
      means: ['Two Championships stay for the coming seasons.', 'A camera that does vision out of the box is rumoured for the autumn.'],
      talk: [['Two champions is one too many. Or one too few, depending on who you ask.', 'a forum regular'], ['Half our district had never seen a Championship. This year they went.', 'a district volunteer'], ['Somebody should make them play each other.', 'everyone, all summer']] },
    // a team that plays in the Festival gets this pop-up when its series is over (hold), with the series in it (vary)
    { id: 'festival', cy: 2018, at: 'off:2', hold: S => !!((S.festival && S.festival.pending) || (S.festStream && S.festStream.stage === 'open')), vary: S => festivalStory(S), tag: 'FESTIVAL OF CHAMPIONS · 2017', color: '#f5c542', title: 'One champion after all',
      body: ['Two Championships made two winning alliances, and nobody could leave it there. In July the eight teams met for a best-of-five on a single field: the Festival of Champions.',
        'It went the distance. Five matches, the last one decided in the final seconds, in front of a crowd that had driven across the country to see the question settled.'],
      means: ['2017 has one champion alliance after all.', 'The Festival is not held again: from next season the two Championships each crown their own winners.'],
      talk: [['Best robot match I have ever watched, and it was in July.', 'a forum regular'], ['We watched the stream in the shop with the whole team. Nobody sat down.', 'a mentor on Team {t}'], ['Do it every year. Please.', 'everyone']] },
    { id: 'visionbox', cy: 2018, at: 'off:4', tag: 'NEW TECHNOLOGY', color: 'var(--info)', title: 'Vision in a box', btn: 'parts',
      body: ['Until now robot vision was a science project. This autumn two former drive-team programmers started selling a camera with the computer, the lights and the software already inside. You bolt it on, plug it in, and it tells the robot where the target is.',
        'They built the first fifty in an apartment. The waiting list passed a thousand in a week.'],
      means: ['Vision cameras are now sold in the Inventory, under Subsystem COTS.', 'Vision Level 1 takes half the hours it used to, and Level 2 is possible for the first time.', 'Expect more robots with auto-aim next season.'],
      talk: [['We spent three seasons on our vision code. It is now a checkbox.', 'a programming mentor'], ['I am not crying. It is the green light ring.', 'a student on Team {t}'], ['Calibrated in ten minutes. I do not know what to do with the rest of January.', 'a programmer on Team {t}']] },
    // ---- 2018 ----
    { id: 'recap2018', cy: 2018, at: 'recap', tag: 'SEASON RECAP · 2018', color: 'var(--accent)', title: 'Swerve\'s first light',
      body: ['The story of 2018 was not on the scoreboard. A handful of teams arrived with swerve drives they had machined themselves: every wheel steering on its own, the robot sliding sideways around defenders as if the carpet were ice.',
        'Most of them broke at least once. A few of them were still playing on the last day of the Championship. It is a gamble: a hundred hours at the mill, and modules that can shed a gear at the worst moment. But the videos are everywhere, and every drive team spent the summer asking the same question.'],
      means: ['Team-built swerve is competitive now, for teams with a CNC Router or a Lathe and the hours to spare.', 'A few more strong teams will try it next season.', 'Nobody sells a swerve module. Yet.'],
      talk: [['Could we build one?', 'every driver, to every mentor, all summer'], ['It strafes. It STRAFES.', 'a student on Team {t}'], ['We lost a module in a semifinal and still nearly won on three wheels.', 'a mentor on Team {t}'], ['Tank drive is fine. Tank drive has always been fine.', 'a drive coach, unconvinced']] },
    { id: 'brushless', cy: 2019, at: 'off:4', tag: 'VENDOR NEWS · LUMEN ROBOTICS', color: VC.B, title: 'The motor nobody saw coming', btn: 'parts', hit: { area: 'elec', pct: 0.2 },
      body: ['Lumen Robotics was three people in a rented unit when it started, selling replacement gearbox parts at prices that made the big catalogue look silly. Two years ago its founder stopped taking a salary and put everything into one project: a brushless motor made for these robots, with its controller designed alongside it.',
        'It nearly sank the company twice. At a trade show last spring a sales director from Sterling Motion called it "a toy for hobbyists". This month Lumen put the Ion on sale for about what Sterling charges for its best brushed motor. It is lighter, it runs cooler, and on the test bench it is not close.'],
      means: ['The Lumen Ion is on sale: far more performance than any brushed motor, at about Sterling\'s price.', 'Brushless control is new to everybody, so part of your Electrical know-how is out of date.', 'Sterling Motion has no brushless motor to answer with.'],
      talk: [['We put one on the dyno and thought the dyno was broken.', 'an electrical mentor'], ['A toy for hobbyists, they said. I would like eight toys, please.', 'Team {t}'], ['Sterling will have an answer by Kickoff. Surely.', 'a forum regular']] },
    // ---- 2019 ----
    { id: 'recap2019', cy: 2019, at: 'recap', tag: 'SEASON RECAP · 2019', color: 'var(--accent)', title: 'The brushless year',
      body: ['In January the Ion was a curiosity. By the Championship most of the robots on the last field ran them, and the teams that did not could hear the difference from the stands.',
        'Swerve kept spreading among the teams that could machine it, and defense got faster and meaner because the drivetrains did. The old premium catalogue sold fewer motors every week.'],
      means: ['Brushless is the standard from here on. Brushed motors are for the kit and the museum.', 'Something is about to give in the vendor market.'],
      talk: [['We changed motors mid-season. Same robot, a second faster per cycle.', 'a mentor on Team {t}'], ['My pit smells less like burnt brushes. I miss it a little.', 'an electrical lead'], ['Every fast robot this year had the same blue motors.', 'a scout on Team {t}']] },
    { id: 'sterling', cy: 2020, at: 'off:0', tag: 'VENDOR NEWS · STERLING MOTION', color: VC.T, title: 'Sterling Motion closes its doors', btn: 'parts',
      body: ['Sterling Motion sold motors to robot builders for thirty years. Its catalogue came in the mail, its booth had carpet, and its parts were on most of the robots that ever won a Championship.',
        'One season of brushless was enough. Orders fell by half before the first regional, and the company never showed a motor of its own. The doors close at the end of June. Everything left in the warehouse is on clearance until then.'],
      means: ['Sterling parts are 40% off in the Inventory through June, then gone for good.', 'The Sterling parts you own keep working, but they sell for much less second-hand.', 'Until someone fills the gap, there is no premium vendor.'],
      talk: [['My first robot ran on Sterling motors. So did my mentor\'s.', 'a lead mentor'], ['Buying a crate of spares at 40% off. For sentimental reasons.', 'Team {t}'], ['Six of their engineers were seen having lunch together. Twice.', 'a forum regular']] },
    { id: 'sbdretired', cy: 2020, at: 'off:1', tag: 'RULE CHANGE', color: 'var(--warn)', title: 'Stop Build Day is retired',
      body: ['From next season there is no bag. Teams may work on their robots right up to the moment they load into each event.',
        'The rule was meant to level the field. Over the years about half of all teams ended up building a second robot to get around it, at a cost many of the others could not meet. The announcement split the forums: some see more time for everyone, others see the best-funded teams pulling further ahead.'],
      means: ['From 2020 there are no half-speed weeks: hardware work and driver practice on the competition robot continue between events.', 'A second robot is still worth having for testing and practice, but it is no longer the way around a rule.'],
      talk: [['I have signed that bag form eleven times. I am framing the last one.', 'a lead mentor'], ['More time is not the same as more rest.', 'a mentor on Team {t}'], ['We are keeping the bag. It is a good bag.', 'Team {t}']] },
    { id: 'apex', cy: 2020, at: 'off:4', tag: 'VENDOR NEWS · APEX MOTION', color: VC.A, title: 'Apex Motion: founded by someone the parts let down', btn: 'parts',
      body: ['Ten years ago a student driver stood behind the glass in a regional final and watched her robot stop moving. A connector on a motor controller had worked loose. The match ended there, and so did her last season.',
        'She studied electrical engineering, took a job at Sterling Motion, and kept a list of every part that had ever failed her or anyone she knew. When Sterling closed, she and five of her colleagues (the six engineers of those famous lunches) rented a corner of the old warehouse. Apex Motion\'s first catalogue has four products and one promise: parts that last a season. They kept Sterling\'s bolt pattern and connectors on purpose, so nobody has to throw away a working robot.',
        'The fourth product is the surprise: a swerve module you can simply buy.'],
      means: ['Apex Motion is the new premium vendor: a brushless motor, an encoder and a control hub.', 'Apex and Sterling parts work together with no mixing penalty.', 'The Apex Vector is the first swerve module for sale. A swerve drive no longer needs a machine shop, the extra hours or the luck.', 'Lumen answers by cutting the price of the Ion.'],
      talk: [['Every connector latches. Every single one. I counted.', 'an electrical mentor'], ['She put the list of failed parts on the first page of the catalogue.', 'a forum regular'], ['We machined our own swerve for two years. I am ordering four modules and taking a nap.', 'a mentor on Team {t}'], ['Premium prices again. At least this time the motor spins both ways.', 'a team treasurer']] },
    // ---- 2022 ---- (the 2020 recap and the lost year belong to the pandemic)
    { id: 'cots', cy: 2022, at: 'off:3', tag: 'NEW PRODUCTS · THE LOST YEAR', color: '#b39dff', title: 'Mechanisms in a box', btn: 'parts',
      body: ['For fifteen months nobody could get into a machine shop. Students built in garages and on kitchen tables, with a hand drill, a hacksaw and whatever came in the mail. The suppliers noticed, and spent the lockdown designing for exactly that.',
        'This summer the catalogues are twice as thick. Arm and pivot joints, intake rollers, indexers, climbers and grippers now come as kits that bolt together. And there is GridTube: box tube and gussets drilled on one hole pattern, so that everything from every supplier lines up with everything else. A mechanism that used to need a mill now needs a wrench.'],
      means: ['New in the Inventory: arm & pivot kits, intake kits, indexer kits, climber kits and gripper kits. Until now only elevator, shooter and turret kits were sold.', 'GridTube frame stock is new too: every mechanical build can use some, drivetrain included, and it saves hours on top of the kits. You can keep a lot of it.', 'A team with few machines loses less to a team with many than it used to.'],
      talk: [['We built an intake on a kitchen table. The cat helped.', 'a student on Team {t}'], ['One hole pattern. I have waited twenty years for one hole pattern.', 'a design mentor'], ['My mill is feeling a little nervous.', 'a fabrication mentor on Team {t}'], ['It is basically a construction set for adults. I mean students.', 'a forum regular']] },
    { id: 'pivot', cy: 2022, at: 'off:4', tag: 'VENDOR NEWS · LUMEN ROBOTICS', color: VC.B, title: 'Swerve for the rest of us', btn: 'parts',
      body: ['Apex showed that a swerve module could come in a box. Lumen spent the lost year working out how to make one that a team without a title sponsor can afford.',
        'The Pivot is heavier than the Vector and a little slower to steer. It also costs about a third less, and Lumen says it shipped the first batch to rookie teams at cost.'],
      means: ['Lumen now sells a swerve module too.', 'Lumen has stopped making West Coast drive sets. What is in stock stays on sale through the 2022 season. After that a new West Coast drive runs on COTS Drive gearboxes, at lower performance, or on sets you already own.', 'With two vendors and falling prices, swerve is about to be everywhere.'],
      talk: [['Four modules for what we used to spend on gearboxes and regret.', 'a team treasurer'], ['The instructions fit on one page. I read them twice out of habit.', 'a student on Team {t}'], ['Tank drive had a good run.', 'a drive coach, converted']] },
    { id: 'cylinders', cy: 2023, at: 'off:0', tag: 'SPOTTED ONLINE', color: 'var(--info)', title: 'The compressor stays home',
      body: ['Scroll through the build threads of the season that just ended and count the air tanks. There are not many.',
        'Brushless motors are now so strong and so cheap that a small motor on a gearbox does what a cylinder used to do, without a compressor, a tank, forty fittings and the leak that nobody can find. Teams that swore by pneumatics for a decade are leaving the whole system in the cupboard.'],
      means: ['From the 2023 season a pneumatics kit still speeds up intake, manipulator and end effector builds, but by 10% instead of 20%.', 'The gap keeps closing: 5% from 2024.', 'A used pneumatics kit is worth less every year.'],
      talk: [['I can finally hear myself think in the pit.', 'a mentor on Team {t}'], ['Found the leak. It only took four seasons. We are removing the system on Monday.', 'a student on Team {t}'], ['A cylinder is still the fastest way to move something two inches. Fight me.', 'a forum regular']] },
    // the last recap before everything stops: told first, then the pandemic window follows it
    { id: 'recap2020', cy: 2020, at: 'recap', tag: 'SEASON RECAP · 2020', color: 'var(--accent)', title: 'No bag, and swerve in a box',
      body: ['The first season without Stop Build Day changed the rhythm of everything. Teams worked on their robots until the night before load-in, and the robots at the last events barely resembled the ones that had played the first.',
        'Apex\'s Vector module did the rest. Teams that had never owned a mill drove sideways in Week 1, and the old six-wheel drive began to look like a choice that needed explaining. The season ended the way it always does: two Championships, two winning alliances, and a room full of people making plans for the summer.'],
      means: ['Bought swerve is the standard among the strong teams now, and it spreads further every season.', 'Without the bag, upgrades go straight onto the robot: the teams that keep developing pull away in the late weeks.'],
      talk: [['We never stopped building. I am not sure that is better. I am sure it is faster.', 'a lead mentor'], ['Four modules, a weekend, and we had a swerve drive. Two years ago that was a whole season.', 'a mentor on Team {t}'], ['See you at the offseason events.', 'everyone, in April']] },
    { id: 'recap2022', cy: 2022, at: 'recap', tag: 'SEASON RECAP · 2022', color: 'var(--accent)', title: 'Back, and sideways',
      body: ['The first full season after the lost year. Teams were smaller, the students who joined in 2020 were suddenly captains, and a fifth of the old names were missing from the schedule.',
        'On the field the change was just as plain. At the top, nearly every robot drove on swerve modules that came out of a box, and the tank drives on the last day could be counted on one hand. There was one Championship again.'],
      means: ['Swerve is the standard at the top. Most strong teams run it from now on.', 'Two big changes are announced for next season: a new playoff format and a new kind of vision target.'],
      talk: [['Half my team had never been to an event. By April they were running the pit.', 'a lead mentor'], ['We were the only tank drive in our division. People took photos.', 'Team {t}'], ['It was loud, it was crowded, and I have never been so glad to be tired.', 'a volunteer']] },
    { id: 'doubleelim', cy: 2023, at: 'off:2', tag: 'RULE CHANGE', color: 'var(--warn)', title: 'Two losses and you are out',
      body: ['For as long as anyone can remember, playoffs meant quarterfinals, semifinals and finals, each a best-of-three series. Lose one series on a bad afternoon and the event was over. Win one and you might play the same alliance three times in an hour.',
        'From next season every event runs a double-elimination bracket: eight alliances, one match at a time, and nobody goes home before losing twice. Only the final stays best of three.'],
      means: ['From 2023: an upper bracket and a lower bracket, single matches, finals best of three.', 'One bad match no longer ends your event, but it sends you the long way round.', 'Pit time between matches now depends on where you are in the bracket.'],
      talk: [['So we can lose the first match and still win the event? I have notes for the drive team.', 'a drive coach'], ['The lower bracket is going to be a fistfight every time.', 'a scout on Team {t}'], ['I just learned the old bracket. Typical.', 'a rookie mentor']] },
    { id: 'impactname', cy: 2023, at: 'off:3', tag: 'AWARDS', color: '#f5c542', title: 'The highest award gets a new name',
      body: ['Since the program began, its highest honour has been the Chairman\'s Award: not for the best robot, but for the team that does the most to change the place it comes from. Winning it at an event has always been a ticket to the Championship.',
        'From next season it is called the FIRST Im⁠pact Award. The judges, the essay, the presentation and the ticket to the Championship stay exactly as they were. Only the name on the banner changes.'],
      means: ['From 2023 every screen says Im⁠pact Award where it said Chairman\'s Award.', 'Nothing else changes: outreach, presentation and track record count as before.', 'The banners you already won keep their place in History.'],
      talk: [['Thirty years of "Chairman\'s" on our wall. The new banners will look odd beside them for a while.', 'a mentor on Team {t}'], ['The name finally says what the award is for.', 'a judge advisor'], ['I just finished memorising the presentation. At least that stays the same.', 'a student on Team {t}']] },
    { id: 'apriltags', cy: 2023, at: 'off:5', tag: 'NEW TECHNOLOGY', color: 'var(--info)', title: 'The field starts talking back', btn: 'know', hit: { area: 'vision', pct: 0.25 },
      body: ['The glowing green tape is on its way out. In its place: square black-and-white tags printed on paper and stuck all around the field. Each tag has a number and a known position.',
        'The difference is large. The old tape told a robot where the goal was. A camera that sees a tag knows where the robot is, anywhere on the field. Shots, alignment and autonomous paths can all be corrected on the move.'],
      means: ['Vision can reach much higher than before, and each vision level now also helps autonomous.', 'Everything you tuned for reflective tape is history: part of your Vision know-how is out of date.', 'Vision becomes one of the most valuable areas to research.'],
      talk: [['The robot knows where it is. I do not always know where I am.', 'a programming mentor'], ['Three seasons of tape-tracking code, deleted in one commit. It felt great.', 'a programmer on Team {t}'], ['Paper targets. We print them on the school copier.', 'a student on Team {t}']] },
    // ---- 2023 to 2025 ----
    { id: 'recap2023', cy: 2023, at: 'recap', tag: 'SEASON RECAP · 2023', color: 'var(--accent)', title: 'A new bracket and a talking field',
      body: ['Double elimination arrived and the playoffs changed character overnight: fewer rematches, more comebacks, and lower-bracket runs that people will talk about for years.',
        'The paper tags changed the robots just as much. The best ones lined themselves up before the driver had finished the thought, and autonomous routines stopped missing.'],
      means: ['Both changes are here to stay.', 'The next motor generation is expected within a year or two.'],
      talk: [['We lost our first playoff match and won the event. I have watched the video nine times.', 'Team {t}'], ['Auto-align is cheating. We are adding it Tuesday.', 'a drive coach'], ['Seven matches in the lower bracket. My voice is gone.', 'a human player']] },
    { id: 'recap2024', cy: 2024, at: 'recap', tag: 'SEASON RECAP · 2024', color: 'var(--accent)', title: 'Faster than the eye',
      body: ['A cycle that would have won a Championship five years ago lost quarterfinals this year. New motors, mature swerve and robots that aim themselves have pushed the pace past what a casual spectator can follow.',
        'The teams at the top now separate themselves in software and in practice hours, because everybody can buy the same hardware.'],
      means: ['Hardware alone no longer wins: testing hours, driver practice and code matter more every season.', 'More teams are registering than at any time since 2020.'],
      talk: [['I blinked and they had scored twice.', 'a referee'], ['Same parts as the champions. Not the same practice field.', 'a mentor on Team {t}'], ['Our rookies think this speed is normal.', 'a lead mentor']] },
    { id: 'recap2025', cy: 2025, at: 'recap', tag: 'SEASON RECAP · 2025', color: 'var(--accent)', title: 'Nearly everyone is back',
      body: ['Four seasons after the lost year, the number of teams has almost returned to where it was. Many of the teams that folded in 2021 never came back; the new ones are led by people who learned the game on swerve and paper tags and have never bagged a robot.',
        'The biggest change is off the field. More than half of all teams will soon play in districts instead of regionals.'],
      means: ['Next season is the last of this career.', 'Districts keep growing: another one forms next season.'],
      talk: [['Our first-year mentor asked what a bag was. I felt old.', 'a lead mentor'], ['Two events, a district championship and Worlds. My calendar has no weekends.', 'a district team captain'], ['Every year I say it cannot get bigger.', 'a volunteer coordinator']] },
    // the last season of every calendar career: told before the career summary
    { id: 'recap2026', cy: 2026, at: 'recap', tag: 'SEASON RECAP · 2026', color: 'var(--accent)', title: 'What a decade did',
      body: ['Set a robot from 2016 beside one from this spring. One skids around on six wheels, runs on brushed motors and finds the goal because a student is pointing at it. The other slides in any direction on modules that came in a box, knows where it is from paper tags on the wall, and was largely bolted together from kits.',
        'The game changed every January and the sport changed with it: one Championship became two and then one again, the bag came and went, a vendor closed and another was founded in its warehouse, a whole season was lost, and most of the country now plays in districts. Through all of it, the teams that lasted were the ones that kept teaching the next class.'],
      means: ['This was the last season of your career.', 'Your career summary is next: the banners, the records and the legacy score.'],
      talk: [['My first drive coach is a judge now. My first driver is my lead mentor.', 'a student on Team {t}'], ['Ten years ago we were three kids and a kit chassis. Look at this pit.', 'a mentor on Team {t}'], ['Same time next January?', 'everyone']] }
  ];
})();
