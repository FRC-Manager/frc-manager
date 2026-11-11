# FRC Manager

A lightweight 2D management game about running a *FIRST* Robotics Competition team across the 2016–2026 seasons, inspired by the F1 Manager series. You don't drive the robot: you build the program behind it.

**▶ [Play in your browser](https://txtaylor2997.github.io/frc-manager/)** — no download needed. Your saves stay in your browser.

> Unofficial fan-made game. Not affiliated with or endorsed by *FIRST*®, Formula 1® or Frontier Developments. Sponsors, regionals, offseason events and opponent teams are fictional or randomly generated.

## How to play

1. Play [online](https://txtaylor2997.github.io/frc-manager/), or download the project and open `index.html` in Chrome, Edge or Firefox (double-click it). There is nothing to install, and the downloaded copy works offline.
2. Pick **New Career** (up to ten seasons, 2016 to 2026: start in any year, in real or random order, as a regional or a district team) or **Single Season Challenge** (one game plus a scenario, graded S–D).
3. Each turn is a month in the offseason and a week during the season. Make decisions, then press **Continue**.

Current version: **2.9.2**, a preview of 3.0 that is not published yet (the public site still runs 2.5). The main menu's **What's new** page has the version notes.

The original design is in [GAME_DESIGN.md](GAME_DESIGN.md), and the plan for the ten-season career and the district model in [V3_PLAN.md](V3_PLAN.md). In the game, a short guided tour runs once per game, at your first Kickoff, first event and first match (switch it off any time), every screen has a **?** button, and **How to play** (main menu) has the full guide by topic.

### The loop

| Phase | What you do |
|---|---|
| Pre-season / offseason | Sign sponsors (Finance), hire mentors, buy facilities (Workshop), stock up on parts and preorder field elements (Inventory), run research (Design Office), register for regionals or district events (Calendar), attend offseason events, do outreach (Team) |
| Kickoff | The game is revealed. Pick a concept (development direction) for every subsystem in the Design Office |
| Build season | Weekly turns: projects share team hours, sponsor activities pop up, optional overtime |
| Competition weeks 1–7 | Regionals (or district events) in weeks 1–6: practice day → qualification matches → alliance selection → playoffs (single elimination through 2022, double elimination from 2023) → awards. Week 7 is a rest week, or the District Championship for district teams that made the cut |
| Championship | Regional teams qualify by winning a regional or winning Impact / Engineering Inspiration / Rookie All-Star; beyond that, through 2024 a finalist can get in on a wildcard (created when a team that has already qualified earns another place at that regional), and from 2025 through the Regional Pool; district teams through their district's points list and District Championship. Last season's World Champions and Einstein finalists, and Hall of Fame teams, are invited. Then play a division and, if you win it, Einstein. A regional Impact winner that is knocked out still watches Einstein from the stands |
| Season review | Program goals, Program Support, finances, the school board's decisions on workshop space and gifts, graduation, knowledge decay |

### Things worth knowing

- **Ten seasons, 2016 to 2026.** A career starts in the year you choose and runs to 2026, one game a year: FIRST STRONGHOLD, FIRST STEAMWORKS, FIRST POWER UP, DESTINATION: DEEP SPACE, INFINITE RECHARGE, then RAPID REACT to REBUILT. There is no 2021 season. In random order the games are shuffled, but vendors, rules, prices and events still follow the calendar year. Money is shown in that year's dollars (about 27% less in 2016 than in 2026). Careers saved in v2.5 keep playing by the v2.5 rules.
- **The era matters.** Motors are brushed until Lumen's first brushless motor arrives for 2019; Sterling Motion, the premium vendor of 2016–2019, closes and Apex Motion replaces it in 2020. Swerve is team-built (a CNC Router or a Lathe, far more hours, fragile) until modules go on sale in 2020. Vision cameras are sold from 2018 and AprilTags make vision much stronger from 2023. Pneumatics kits save fewer hours every few years. From 2016 to 2019 the competition robot is bagged after build season (Stop Build Day): new mechanisms and upgrades can still be developed, but they are packed and fitted in the pits on practice day (Install Upgrade), hardware work runs at half speed, and drivers cannot practise at home unless a second robot carries the work. Playoffs are single elimination through 2022. Each change arrives as a pop-up with its story.
- **The lost season.** Right after the 2020 Championship a pandemic shuts everything down. The 2021 season is cancelled, know-how and skills fade, two senior classes graduate, mentors, sponsors and a fifth of all teams are lost, and you choose two programs for the year at home. The 2021 offseason events are played with the 2020 robot.
- **Districts.** Choose a fictional district as your home (Lakeshore, Harbor, Evergreen; Mesa from 2019; Sierra from 2026) or stay a regional team. District teams play two local two-day events for one fee, earn district points with the real formula, and qualify for the Championship through a District Championship in week 7. When a district forms in your area, a pop-up the July before lets you join or stay regional.
- **A living world.** Every team and event of the season is simulated: about 740 teams in 2016, 930 in 2020, 760 after the lost season and 900 in 2026, with rookies arriving and teams folding. The World page (District page for district teams) shows standings, results and who has qualified. There are two Championships from 2017 to 2020, and a Festival of Champions in 2017.
- **Vendor loyalty.** Each electronics vendor keeps a loyalty level for your team: 100 points for a season in which the competition robot runs on its electronics (90% of them is enough), up to 15 more for that year's orders. Levels come at 280, 580, 880 and 1,180 points, so a team that stays with one vendor reaches three in a ten-season career. Each new level brings a loyalty sponsorship in September, shown as a pop-up: choose free parts delivered at Kickoff, a voucher that lasts through the next season, or a sale on everything from that vendor until Kickoff. Loyal teams also find that vendor's parts in stock more often in season. The premium catalogue's level carries over from Sterling to Apex.
- **Robots in History.** History shows a picture of every season's robot, and you can name each one in the Garage.
- **Tech Knowledge carries over.** A turret built for one shooting game makes the next shooting game cheaper, faster to build and more reliable. Research projects build knowledge directly.
- **Weight limit is 125 lb.** An overweight robot must burn a practice block on emergency lightening.
- **Coach Calls.** You get 3–6 per match: pace, role (score / defend / feed), target priority, endgame timing and level, chase bonus RPs, avoid contact, and reset after a fault.
- **Matches.** You can watch at 1×–8×, skip to the end, or simulate instantly.
- **Two robots.** The Garage holds Robot 1 and Robot 2. Either can be the competition robot (it gets the best electronics and goes to events), and you choose which one the drivers practice on each week. In the Design Office, a subsystem's first build or new version is a prototype (+10% materials) that goes on the competition robot; **Build copy** makes more units of a finished design (about a quarter of the hours and 60% of the materials, plus their own electronics and kits). Copies and full robot copies are fabrication: they use team hours but no project slot. Fit units to either robot in the Garage; up to 2 of each kind wait in storage, and old ones can be taken apart for spare parts and their kits. At events, a spare identical to the competition robot's (in storage or on the other robot) can be swapped in to restore that subsystem to 100%. A second robot adds up to 6 testing hours a week, makes driver practice on it up to 25% more effective and helps event tuning (all scaled by how much of the competition robot it copies), but a full second set of electronics and copies is expensive: worth it for well-funded teams, rarely in a first season.
- **Driver familiarity.** The drive team knows each subsystem they have driven. New mechanisms start around 35%, a new version costs a few percent, a different concept 20–65%. Shop driving, practice, event practice blocks and matches win it back; in matches a subsystem gives 85–100% of its stats depending on familiarity.
- **Inventory (the parts shop).** Every build uses parts from the Inventory tab: motors, encoders, control hubs and swerve modules from two electronics vendors (a premium one, Sterling Motion until 2019 and Apex Motion from 2020; and Lumen Robotics, value), plus gearboxes, cameras, pneumatics and optional mechanism kits. Each concept can use a set of kits (a turret shooter: a turret and a shooter kit; a traversal climber: up to 4 climber kits); a full set makes the build 28% faster and 25% cheaper in materials and removes the first-build penalty. Concepts need knowledge in all their core areas (a turret shooter needs both turret and shooter know-how). Mixing the two vendors' electronics costs 10% more project hours and a little performance. Parts are reusable but wear; the best ones go on the competition robot. Every team gets a free Kit of Parts at every Kickoff (4 brushed motors, 2 low-profile encoders, 2 kitbot gearboxes; only rookies get a control hub, in a bigger first-season kit, and veteran teams start with one leftover kit hub), and in season parts often sell out, so stock up before Kickoff. More Kit of Parts electronics (brushed motors, low-profile encoders, a basic hub, kitbot gearboxes) can be bought any time: very cheap and always in stock, but much slower, and mixing them with vendor electronics costs 5% more project hours and a little performance. Every fall, 1–4 months before Kickoff (September to December), each vendor holds one launch event with at least one new product, announced with a pop-up and an inbox post; an inbox rumor at the start of the offseason says when. The previous version stays on sale through the next season, and no product line goes past version III in a career. Parts you no longer need can be sold (Inventory → Sell) for part of their price if they are above 60% condition.
- **Game elements.** Without a Practice Field the free kit game pieces are enough. With one, quarter, half and full-field sets fill it up to its size (Level 1 quarter, Level 2 half, Level 3 full) and wear with driver practice. Preorder next season's set in the offseason: it shows as pending and arrives at Kickoff.
- **Extra hours and fatigue.** Put spare hours into any project to raise its quality (diminishing returns). In season, leave about 10% of the week's hours idle to keep fatigue steady; overtime (which never lets the team recover) and competitions raise it. At events, fatigue causes incidents (Incidents tab) and lowers scouting credibility.
- **Defense follows the real rules.** Pins are limited to 5 seconds (through 2024) or 3 seconds (2025–2026), after which the defender backs off six feet, and each game's protected zones are off limits (Launch Pad, Community and Loading Zone, Source/Amp/Podium/Stage, Reef and Barge Zones, Tower). Turret shooters aim on the move and are hard to defend. Robots don't overlap each other or drive through field elements.
- **Strategy follows the real games.** In the shooting games (2022, 2024, 2026) one defender is the strongest alliance strategy; in 2023 and 2025 three scorers win. Of the classic games, 2016, 2017 and 2019 reward a defender, while 2018 and 2020 protect too much of the field for it. AI teams catch on as the season goes. In playoffs, an alliance captain can call partners to score or defend.
- **Team hours.** The Design Office shows exactly where each week's hours go. A project can absorb up to 80 h a week, so run several in parallel or hours go idle.
- **Season strategies.** In 2024 every shooter can score the Amp (fixed shooters slowly and unreliably, pivot and turret shooters moderately; amp mechanisms are far better). In 2025 the Reef has six faces with their own branches, so the last coral means driving around to the far side. In 2026 fuel is tracked across the field and alliances learn to hoard: while their hub is inactive they lob fuel from the neutral zone back into their own zone for the next scoring shift. 2022 cargo bounces out of the Hub across the whole field. 2024 alliances learn to feed notes across the field and stockpile them for Amplify (a Source defender cancels it); your alliance picks it up through its strategy read (Strategy mentor, drive coach, driver practice, events scouted), never by a button. 2025 alliances split two Coral Stations. 2026 adds a wide dumper shooter (out-scores most turrets, worse under defense), and climbs are slow and risky, so strong teams rarely bother.
- **Falls.** A failed high climb can drop the robot (most often 2022 High/Traversal and 2026 L2/L3): it is out for the match, badly damaged, and scraps spare parts.
- **Test chassis.** Early each season, build a simple drivetrain (Kitbot Tank, Mecanum or West Coast Drive) on the second robot from parts on the shelf: about 20–45 team hours, no project slot. Even without a Practice Field it gives 6 testing hours a week for code, autos, vision and drivetrain projects and for driver practice, so programmers and drivers start before the competition robot drives. Established teams start with enough older, worn parts for one.
- **Testing hours.** Weekly testing hours come from a test chassis or second robot (6 h a week on a chassis alone) and from a Practice Field (8/12/16 h by level, up to +6 with a second robot), like wind-tunnel time. Split them in the Design Office between development testing ($40/h: projects finish faster and come out better) and driver practice (cheap: a few spare parts; builds drive-team skills and confidence). Small teams get the most from driving; big programs should split once their drivers are fully practiced.
- **Robot condition at events.** Repairs use spare parts, so the robot arrives at 100% unless you're short on spares, the event is a flight away, or you did a sponsor demo with the robot that week. HQ previews the arrival condition. A Systems Shakedown on practice day rebuilds worn parts back to 100%.
- **Blue banners.** Event wins and Impact Awards hang on your banner wall (History). Winning Einstein opens a World Champions celebration (back-to-back titles get their own headline), with an easter egg at the bottom: the alliance that won Einstein in that game's real season. In random-order careers the games are shuffled over the calendar years, so dates, banners and headlines still read in order.
- **FIRST Impact Award (Championship).** A team that wins a regional Impact Award is judged again at the Championship against the strongest Impact programs in the world. Six Finalists are named before Einstein Final 1 and the winner after it; both hang a blue banner, and the winner joins the Hall of Fame (invited to every future Championship) with its own celebration. A candidate that is knocked out before Einstein still goes there, watches the finals from the stands and hears the announcement. History lists Championship honours separately and can replay the celebrations.
- **The state of the art moves on.** From the second season, each offseason starts with two rule or vendor changes (−25% XP in the area they touch) and one summer month brings three new designs spotted online (−15% each). The loss counts from at most 125% of the top level, and a mentor who specializes in the area halves it, so no area stays maxed without upkeep.
- **Second robot drills.** Two running robots add defense drills to driver practice (up to 35% less lost to a defender), and a second robot that drives like the competition robot (tank or holonomic) speeds auto routines up by 20%. Any second robot that runs in season (a test chassis is enough) also builds an electrical shakedown: up to 40% fewer brownouts and comms dropouts at the first event, 25% at the second, 10% after that.
- **Workshop space.** Every facility level takes floor space in square feet, and the school decides how much room the team has: the robotics classroom (2,550 sq ft, where a rookie starts), the technology wing (3,850, where established and powerhouse teams start) or a robotics center (5,100, which fits everything). The school moves the team up at a season review when Program Support has reached 80 or 90, and never takes room back. Strong seasons also earn free renovations and an upgrade grant from the board, and satisfied sponsors donate facility levels: about one a year with every sponsor slot filled and no sponsor activity skipped.
- **More facilities.** Electronics Workbench (fewer electrical faults, slower part wear), Welding Station (better hardening and lightweighting), Team Meeting Room (outreach and Impact presentation) and FTC Team Space (your own FTC teams as cheap, strong feeder programs).
- **Five on the drive team.** Driver, Operator, Human Player, Coach and an optional Technician (pit repairs and pre-match checks). Awareness matters on the field; student table headers explain every skill.
- **Official bracket and Championship look.** From 2023 the playoff bracket uses the official double-elimination layout (before that, a quarterfinal-semifinal-final bracket of best-of-three series), pit time in the playoffs follows the bracket order, and Championship and Einstein pages have their own design.
- **Reputation and team size.** Reputation is earned slowly: a gain counts for less the higher it already is, and losses count in full. The school's goals get harder at 35, 55 and 75 reputation. A team is full at 100 students.
- **Sponsor funding at a glance.** The Finance page shows this season's base money, bonuses reached and bonuses still possible, and next season's expected base and possible max bonus (deals up for renewal count by their renewal chance).
- **Finals game by game.** The playoff bracket shows Final 1, Final 2 and Final 3 (if needed) as separate matches with the state of the series.
- **The Impact Award is hard.** You need a submission (Design Office) and a high Impact rating: this season's outreach, a three-season track record, your presentation (Business mentor + best communicators), feeder programs and reputation. Regional winners usually rate 80+, so it takes a few seasons of steady outreach. HQ shows your odds at every registered regional; the Team page breaks down the rating.
- **Scouting data matters.** The Scouting tab and the pick list show what each robot actually did in qualifications: points per match, auto success, climb success, fault-free matches, fouls and defense. Pick value (used by you and by AI captains) discounts robots that break down.
- **Each game breaks differently.** Tip-overs are common in 2023 (and 2025), brownouts in 2026. Brief comms drops happen to everyone; poor electronics and heavy contact make them more frequent, longer and sometimes match-ending.
- **In-season debt.** From Kickoff to the Championship you can spend into the red (down to −$50,000). The school clears the debt at the season review, but Program Support and reputation drop with its size, and by 50% more for each consecutive season that ends in debt. In the offseason you can only spend cash you have; fundraisers always work. Below $1,000 you can apply to the STEM support fund (costs reputation).
- **Sponsors.** Offers sit at a similar level for each difficulty and grow a little with reputation and results; a title sponsor pays about three times a partner. Top programs get sponsors who expect wins. Finance shows the title, partner and grant slots; a signing can be undone until you press Continue, and **Auto-pick best** fills the open slots.
- **Feeder programs.** Up to 6 on the Team page ($1,000 a year each), each with a focus (Balanced, Drive team, Technical, Strategy, Outreach). They grow over three school years and shape each September's recruits: more students, better overall talent, and the skills their focus trains. Outreach programs bring the most students and help Impact the most.
- **Playoff ties.** Playoffs are single elimination with best-of-3 series through 2022, and double elimination with best-of-3 Finals from 2023. A tied game is decided by the FRC tiebreakers (foul points, then auto and endgame points in the season's order); only a game tied on all of them is replayed.
- **Events.** Skip any event on its week; withdraw in the Calendar at least a month ahead for half the fee back. Spare parts reset each season. Auto-restock keeps enough spares for practice and home repairs every week and tops up before each event, with a margin for falls and breakages; it says so when money runs short. The team trailer turns far events into a long drive (no air-freight damage).
- **Calendar and inbox.** The Calendar shows the whole program year (events, results, project finish dates, sponsor duties, milestones) with filters. Outreach and fundraising repeats within a month pay less; facilities, sponsors, mentors and the trailer unlock more activities. The inbox gets news and team chatter every turn, and some messages take an optional reply with a small effect (reputation, spare parts, extra practice, and so on). A reply is open only during the turn the message arrives (a week in season, a month in the offseason).
- **Facilities and money.** Upgraded 3D Printing, CNC, Machine Shop and Programming Station each add a project slot (6 permanent slots at most; temporary slots from boosts and guest mentors come on top). A facility below 35% condition loses its slot until renovated. Upgrades are expensive and fundraisers pay less each time you repeat one in a program year, so a full shop takes several seasons.
- **Saves.** The game autosaves every turn and has 3 manual slots, all in your browser's local storage (same browser, same computer). Use **☰ → Export save** to copy a save code, and paste it on the Load screen to continue elsewhere.

## Sharing the game

Send **`dist/FRC-Manager.html`**. It is the whole game in one file (about 1.3 MB): the recipient double-clicks it and it opens in their browser, with no install and no internet needed.

- **Email:** some email services block or warn about `.html` attachments. If that happens, right-click the file → **Send to → Compressed (zipped) folder** and send the `.zip`.
- **Saves:** each person's saves stay in their own browser. To hand someone your career, use **☰ → Export save** and send them the save code or the downloaded save file. They import it on **Load / import**.
- **After changing the game:** rebuild the file so it includes your changes:

  ```
  powershell -NoProfile -ExecutionPolicy Bypass -File tools\build-single-file.ps1
  ```

You can also zip the whole project folder (`index.html`, `css`, `js`); it plays the same way from `index.html`.

## Files

```
index.html            entry point
css/style.css         UI styling
js/core.js            RNG, utilities, save system
js/data/seasons.js    the 2022–2026 games: subsystems, concepts, AI robot archetypes
js/data/seasons-classic.js   the 2016–2020 games
js/data/eras.js       the calendar: price index, technology by year, Championship formats, the lost season, stories
js/data/world.js      regions, regionals, sponsors, mentors, equipment, activities, research, scenarios
js/data/parts.js      parts library: vendors, part categories, kit of parts, game elements
js/sim/engine.js      match engine (10 ticks/s), shared by live view, quick sim and AI matches
js/sim/rules.js       per-season scoring, ranking points and robot behaviour (2022–2026)
js/sim/rules-classic.js   the same for 2016–2020
js/sim/ai.js          capability builder + persistent AI team pool
js/sim/event.js       schedule, rankings, OPR, alliance selection, playoffs, awards
js/systems/robot.js   the two robots, development projects, knowledge, driver familiarity, wear and repairs
js/systems/career.js  calendar, finance, sponsors and donations, staff and drive team, fatigue, offseason and tech changes,
                      feeder programs, Impact Award, season reviews and the school board, qualification
js/systems/world.js   the simulated world: every team and event, districts, district points, Championship places
js/systems/shop.js    facilities and workshop space, batteries, shop incidents, opportunities
js/systems/parts.js   parts inventory, vendor releases, stock, allocation, wear, game elements
js/systems/news.js    news, team chatter and inbox replies
js/render/draw.js     2D fields, robots (top-down and side profile), effects
js/render/draw-classic.js   the 2016–2020 fields and game pieces
js/ui/ui.js           main screens (HQ, Garage, Design Office, Team, Workshop, Finance, Calendar, History) and pop-ups
js/ui/screens-event.js   events: practice, matches, bracket, Championship pages, celebrations
js/ui/screens-menu.js    main menu, new game, settings, version notes, season review
js/ui/screens-parts.js   the Inventory tab
js/ui/tutorial.js     guided tours and the How to play guide
js/ui/icons.js        icons, team colours, confetti
js/local.js           extras for the downloaded copy (save a career to a file)
js/dev.js             balance tools (see below)
tools/build-single-file.ps1   builds dist/FRC-Manager.html
tools/trailer/        60-second reveal trailer generator (open index.html, press Render MP4; index.html?vertical for 9:16)
```

## Tuning

- **Match pace per season**: `tempo` in each season block of `js/sim/rules.js` and `js/sim/rules-classic.js`. Higher values mean slower collecting (`c`) and scoring (`s`).
- **Costs and fees**: `js/data/world.js` (`FEES`, `EQUIP`, `SPONSOR_TYPES`, `MENTOR_COST`). Parts, vendors and the Kit of Parts are in `js/data/parts.js`.
- **Workshop space and gifts**: `EQUIP_SIZE` (square feet per facility level), `SPACE_TIERS` and `SPACE_START` (the three room sizes, the Program Support each needs, and where each profile starts), `BOARD` (school board renovation and grant thresholds) and `DONATION` (sponsor donations: the satisfaction where the chance starts, the chance per turn, which facilities each sponsor type gives), all in `js/data/world.js`.
- **Knowledge and reputation pace**: `TECH_RULE_PCT`, `TECH_DESIGN_PCT` and `TECH_CAP` (offseason tech changes), `REP_GAIN` and `REP_SOFT` (how fast reputation grows), `STUDENT_CAP`.
- **Second robot and drive team**: `DEF_DRILL_HOURS`, `DEF_DRILL_EFFECT`, `ELEC_SHAKE_HOURS`, `ELEC_SHAKE_EFFECT`, `CHASSIS_PATH`, `TECH_ROLE`, `FTC_OWN`.
- **Concept stats, ceilings, hours and weights**: `js/data/seasons.js` and `js/data/seasons-classic.js`.
- **The calendar**: `PRICE_IDX` (prices by year), `ERA` (swerve, vision, pneumatics, AI swerve share and motor strength, Stop Build Day), `PANDEMIC` and `STORIES` in `js/data/eras.js`; product ladders and vendors in `js/data/parts.js`.
- **Vendor loyalty**: `LOYALTY` in `js/data/parts.js` (points per season, level thresholds, the three rewards by level, the in-season stock bonus).
- **The world and districts**: `WORLD_TEAMS`, `TEAM_CURVE` (team numbers by year), `DISTRICTS`, `REGION_W`, `DP` (district points) and `CHAMPS_SHARE` in `js/systems/world.js`.
- **Balance check**: open the browser console on the game page and run `G.Dev.balTest(100)`. It reports average, elite and percentile scores, bonus-RP rates, faults and climb rates for every season. `G.Dev.faultTest(150)` reports per-season failure rates (comms, brownouts, tips) by robot reliability and with or without a defender. `G.Dev.autoplay({ profile: 'established' })` plays a whole career with a simple bot; add `grind: true` for a bot that maxes outreach, fundraising and facility spending (economy and Impact checks), or `split: 0…1, probe: true, seed: n` to compare testing-hour splits (it logs a fixed-opponent performance probe at each regional).

Current balance at regional level on v2.9.0 (100 matches between random alliances):

| Season | Avg alliance score | Bonus RP rates (average alliances) |
|---|---|---|
| 2016 | ~93 | Breach ~70%, Capture ~44% |
| 2017 | ~247 | 40 kPa ~2% (elite alliances ~40%), four rotors ~28% |
| 2018 | ~328 | Auto Quest ~74%, Face the Boss ~20% |
| 2019 | ~68 | Complete Rocket ~9%, HAB Docking ~34% |
| 2020 | ~114 | Shield Operational ~22%, Shield Energized ~0% (as in the real season) |
| 2022 | ~54 | Cargo ~47%, Hangar ~38% |
| 2023 | ~77 | Sustainability ~26%, Activation ~12% |
| 2024 | ~47 | Melody ~33%, Ensemble ~18% |
| 2025 | ~94 | Auto ~84%, Coral ~1%, Barge ~53% |
| 2026 | ~152 | Energized ~78%, Supercharged ~0% (elite alliances reach it), Traversal ~0% (strong teams keep shooting) |

Event fields in a new career come from the simulated world. It holds its level over the decade (`WORLD_STR` in `js/systems/world.js`): rookies start far below the average and grow up in three seasons, strong teams enter more events and gather at the events with more stars, and the lost season sets everybody back for a couple of years.

## Differences from the design plan

[GAME_DESIGN.md](GAME_DESIGN.md) is the original v0.1 proposal and is kept as written. This README, the in-game **How to play** guide and the **What's new** notes describe the game as it is. Details that changed from the plan:

- 2022 storage (1- or 2-ball) is part of the Intake concept rather than its own subsystem.
- 2026 low-profile vs standard height is its own "Frame Profile" subsystem. Hoppers hold 8 / 20 / 45 fuel.
- Spare parts are bought in the Inventory tab (with auto-restock); there is no spare-parts project.
- In-season build hours are 7 per student per week (5 in the offseason).

Systems added after the plan, which it does not describe:

- Two robots per season and the test chassis, with driver familiarity, defense drills, path planning help and the electrical shakedown.
- The parts inventory: two electronics vendors, stock that sells out in season, wear, mechanism kits, the Kit of Parts and game elements.
- Testing hours, team fatigue and event incidents.
- Feeder programs (including your own FTC teams) and the detailed Impact rating; the FIRST Impact Award at the Championship with Finalists, the Hall of Fame and watching Einstein from the stands.
- Offseason rule changes and new designs that date tech knowledge.
- Workshop space in three levels, the school board's renovations and upgrade grants, sponsor donations, and four more facilities (Electronics Workbench, Welding Station, Team Meeting Room, FTC Team Space).
- A fifth drive-team role (Technician), a team size cap of 100 and slower reputation growth.
- The official double-elimination bracket with best-of-three finals and FRC tiebreakers, and the Championship page designs.
- Version 3.0, planned in [V3_PLAN.md](V3_PLAN.md): the 2016–2020 games and a ten-season career on a real calendar, prices by year, a third vendor and technology eras, Stop Build Day, single-elimination playoffs and the older Championship formats, the lost 2021 season, story pop-ups, robots in History, and the district model with a simulated world of teams and events.
