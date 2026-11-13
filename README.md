# FRC Manager

A lightweight 2D management game about running a *FIRST* Robotics Competition team across the 2016–2026 seasons, inspired by the F1 Manager series. You don't drive the robot: you build the program behind it.

**▶ [Play the 3.0 beta in your browser](https://frc-manager.github.io/frc-manager/)** — no download needed. Your saves stay in your browser.

> Unofficial fan-made game. Not affiliated with or endorsed by *FIRST*®, Formula 1® or Frontier Developments. Sponsors, regionals, offseason events and opponent teams are fictional or randomly generated.

## How to play

1. Play [online](https://frc-manager.github.io/frc-manager/), or download the project and open `index.html` in Chrome, Edge or Firefox (double-click it). There is nothing to install, and the downloaded copy works offline.
2. Pick **New Career** (up to ten seasons, 2016 to 2026: start in any year, in real or random order, as a regional or a district team) or **Single Season Challenge** (one game plus a scenario, graded S–D).
3. Each turn is a month in the offseason and a week during the season. Make decisions, then press **Continue**.

Current version: **2.9.8**, the beta of 3.0. The main menu's **What's new** page has the version notes. The last finished release, 2.5, is still playable at [txtaylor2997.github.io/frc-manager](https://txtaylor2997.github.io/frc-manager/). Saves are kept per site: to bring a career over from 2.5, use **☰ → Export save** there and **Load / import** here.

The original design is in [GAME_DESIGN.md](GAME_DESIGN.md), and the plan for the ten-season career and the district model in [V3_PLAN.md](V3_PLAN.md). In the game, a short guided tour runs once per game, at your first Kickoff, first event and first match (switch it off any time), every screen has a **?** button, and **How to play** (main menu) has the full guide by topic and a glossary.

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

**The career**

- **Ten seasons, 2016 to 2026**, one real game a year. Start in any year, in real or shuffled order, as a regional or a district team. Shuffled games still play in the year's technology; FIRST STRONGHOLD, a tank-drive game, is only drawn in 2016 or 2017.
- **The calendar matters.** Motors, swerve, vision, vendors, prices, Stop Build Day (2016 to 2019) and the playoff and Championship formats all change with the year. Big changes arrive as pop-ups; rumours of them reach the Inbox first.
- **The lost season is the game's own timeline.** In the game the 2020 season is played to the end and 2021 is skipped. In reality the 2020 season was stopped part-way through, its Championships were never held, and 2021 was played from home.
- **The world is simulated.** Between 740 and 930 teams, numbered as in that year of FRC, play every event of the season, so standings, district points and Championship places are real results, not dice. The World page puts every team and event on a map and keeps a scouting table of every team's season (OPR with its auto, teleop and endgame split), updated every week.

**The robot**

- **Concepts, then upgrades.** Pick a design for every subsystem at Kickoff and develop it. Projects share the team's weekly hours; effort (Rush, Standard, Thorough) and extra hours trade time for quality.
- **Knowledge carries over.** A turret built for one game makes the next one cheaper, faster and more reliable. Unused know-how fades, and rule changes date it.
- **Two robots.** A second robot, or just a test chassis, gives testing hours, driver practice and spares at events. Build it a copy at a time, or with one shortcut.
- **Parts are real.** Control system parts (motors, encoders, hubs), drivetrain parts and kits come from the Inventory, wear out, and sell out in season. What everybody wants sells out first. Stock up before Kickoff. A vision company, planetary gearboxes and servo kits arrive over the decade.
- **Elite designs.** Seven games offer mechanisms only the best teams build: a little better than the next best, and much harder.

**Matches**

- **You don't drive.** Set a match plan, then use a few Coach Calls. Watch at 1× to 8×, skip to the end, or simulate.
- **Every game plays by its own rules**: protected zones, pin limits, and the strategies that won that season (defense, feeding, hoarding).
- **Things go wrong**: brownouts, jams, tip-overs, falls from a high climb, a partner dropping you in a buddy climb, a robot beached on a ball. Skilled, careful drivers have fewer; pushing causes more.

**The program**

- **Program Support** from the school keeps the team alive; **reputation** brings sponsors, recruits and harder goals.
- **Outreach over several seasons** wins the Impact Award. Feeder programs shape who joins.
- **One mentor a season** can be nominated by the students for the Woodie Flowers Award: a Finalist at a regional or District Championship, then one winner in the world on Einstein.
- **Fatigue**: leave about a tenth of the week idle in season, or tired students make mistakes at events.
- **Debt** is allowed from Kickoff to the Championship and settled by the school at the season review, at a price.

**Help and saves**

- Every screen has a **?**, long explanations sit behind small **?** links, and **How to play** has the full guide by topic, with a **glossary**.
- The game autosaves every turn and has three manual slots, in your browser. **☰ → Export save** moves a career to another browser or computer.

## Sharing the game

Send **`dist/FRC-Manager.html`**. It is the whole game in one file (about 1.5 MB): the recipient double-clicks it and it opens in their browser, with no install and no internet needed.

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
js/systems/scouting.js the world map (areas, districts, cities, where teams and events are) and season scouting numbers
js/systems/shop.js    facilities and workshop space, batteries, shop incidents, opportunities
js/systems/parts.js   parts inventory, vendor releases, stock, allocation, wear, game elements
js/systems/news.js    news, team chatter and inbox replies
js/render/draw.js     2D fields, robots (top-down and side profile), effects
js/render/draw-classic.js   the 2016–2020 fields and game pieces
js/ui/ui.js           main screens (HQ, Garage, Design Office, Team, Workshop, Finance, Calendar, History) and pop-ups
js/ui/screens-event.js   events: practice, matches, bracket, Championship pages, celebrations
js/ui/screens-menu.js    main menu, new game, settings, version notes, season review
js/ui/screens-parts.js   the Inventory tab
js/ui/screens-world.js   the World page: the map and the season scouting table
js/ui/tutorial.js     guided tours and the How to play guide
js/ui/icons.js        icons, team colours, confetti
js/local.js           extras for the downloaded copy (save a career to a file)
js/dev.js             balance tools (see below)
tools/build-single-file.ps1   builds dist/FRC-Manager.html
tools/trailer/        60-second reveal trailer generator (open index.html, press Render MP4; index.html?vertical for 9:16)
tools/match-tester/   match tester: any game, six random robots on random strategies, routes and tasks drawn (open index.html)
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
- The parts inventory: two control system vendors, Lanternworks for vision hardware, planetary gearboxes and servo kits, stock that follows demand in season, wear, mechanism kits, the Kit of Parts and game elements.
- Testing hours, team fatigue and event incidents.
- Feeder programs (including your own FTC teams) and the detailed Impact rating; the FIRST Impact Award at the Championship with Finalists, the Hall of Fame and watching Einstein from the stands. The Woodie Flowers Finalist Award at regionals and District Championships and the Woodie Flowers Award on Einstein, with mentors who have professions, seasons with the team and years in FIRST.
- Offseason rule changes and new designs that date tech knowledge.
- The Super pit (a full repair of one subsystem before every match) and the top-level facilities' Finish now cards.
- Workshop space in three levels, the school board's renovations and upgrade grants, sponsor donations, and four more facilities (Electronics Workbench, Welding Station, Team Meeting Room, FTC Team Space).
- A fifth drive-team role (Technician), a team size cap of 100 and slower reputation growth.
- The official double-elimination bracket with best-of-three finals and FRC tiebreakers, and the Championship page designs.
- Version 3.0, planned in [V3_PLAN.md](V3_PLAN.md): the 2016–2020 games and a ten-season career on a real calendar, prices by year, a third vendor and technology eras, Stop Build Day, single-elimination playoffs and the older Championship formats, the lost 2021 season, story pop-ups, robots in History, and the district model with a simulated world of teams and events.
