# FRC Manager

A lightweight 2D management game about running a *FIRST* Robotics Competition team across the 2022–2026 seasons, inspired by the F1 Manager series. You don't drive the robot: you build the program behind it.

**▶ [Play in your browser](https://txtaylor2997.github.io/frc-manager/)** — no download needed. Your saves stay in your browser.

> Unofficial fan-made game. Not affiliated with or endorsed by *FIRST*®, Formula 1® or Frontier Developments. Sponsors, regionals, offseason events and opponent teams are fictional or randomly generated.

## How to play

1. Play [online](https://txtaylor2997.github.io/frc-manager/), or download the project and open `index.html` in Chrome, Edge or Firefox (double-click it). There is nothing to install, and the downloaded copy works offline.
2. Pick **New Career** (5 seasons, real or random order) or **Single Season Challenge** (one game plus a scenario, graded S–D).
3. Each turn is a month in the offseason and a week during the season. Make decisions, then press **Continue**.

Current version: **2.1**. The main menu's **What's new** page has the version notes.

The full design is in [GAME_DESIGN.md](GAME_DESIGN.md). In the game, a short guided tour runs each season and at your first event and match (switch it off any time), every screen has a **?** button, and **How to play** (main menu) has the full guide by topic.

### The loop

| Phase | What you do |
|---|---|
| Pre-season / offseason | Sign sponsors (Finance), hire mentors, buy facilities (Workshop), stock up on parts and preorder field elements (Shop), run research (Design Office), register for regionals (Calendar), attend offseason events, do outreach (Team) |
| Kickoff | The game is revealed. Pick a concept (development direction) for every subsystem in the Design Office |
| Build season | Weekly turns: projects share team hours, sponsor activities pop up, optional overtime |
| Competition weeks 1–7 | Regionals in weeks 1–6: practice day → qualification matches → alliance selection → double-elimination playoffs → awards. Week 7 is a rest week |
| Championship | Qualify by winning a regional, winning Impact / Engineering Inspiration, or through the Regional Pool wildcard. Then play a division and, if you win it, Einstein |
| Season review | Program goals, Program Support, finances, graduation, knowledge decay |

### Things worth knowing

- **Tech Knowledge carries over.** A turret built for one shooting game makes the next shooting game cheaper, faster to build and more reliable. Research projects build knowledge directly.
- **Weight limit is 125 lb.** An overweight robot must burn a practice block on emergency lightening.
- **Coach Calls.** You get 3–6 per match: pace, role (score / defend / feed), target priority, endgame timing and level, chase bonus RPs, avoid contact, and reset after a fault.
- **Matches.** You can watch at 1×–8×, skip to the end, or simulate instantly.
- **Two robots.** The Garage holds Robot 1 and Robot 2. Either can be the competition robot (it gets the best electronics and goes to events), and you choose which one the drivers practice on each week. In the Design Office, a subsystem's first build or new version is a prototype (+10% materials) that goes on the competition robot; **Build copy** makes more units of a finished design (about a quarter of the hours and 60% of the materials, plus their own electronics and kits). Copies and full robot copies are fabrication: they use team hours but no project slot. Fit units to either robot in the Garage; up to 2 of each kind wait in storage, and old ones can be taken apart for spare parts and their kits. At events, a spare identical to the competition robot's (in storage or on the other robot) can be swapped in to restore that subsystem to 100%. A second robot adds up to 6 testing hours a week, makes driver practice on it up to 25% more effective and helps event tuning (all scaled by how much of the competition robot it copies), but a full second set of electronics and copies is expensive: worth it for well-funded teams, rarely in a first season.
- **Driver familiarity.** The drive team knows each subsystem they have driven. New mechanisms start around 35%, a new version costs a few percent, a different concept 20–65%. Shop driving, practice, event practice blocks and matches win it back; in matches a subsystem gives 85–100% of its stats depending on familiarity.
- **Shop.** Every build uses parts from the Shop: motors, encoders, control hubs and swerve modules from two electronics vendors (Apex Motion, premium; Lumen Robotics, value), plus gearboxes, cameras, pneumatics and optional mechanism kits. Each concept can use a set of kits (a turret shooter: a turret and a shooter kit; a traversal climber: up to 4 climber kits); a full set makes the build 28% faster and 25% cheaper in materials and removes the first-build penalty. Concepts need knowledge in all their core areas (a turret shooter needs both turret and shooter know-how). Mixing the two vendors' electronics costs 10% more project hours and a little performance. Parts are reusable but wear; the best ones go on the competition robot. Kickoff brings a small free Kit of Parts, and in season parts often sell out, so stock up before Kickoff. More Kit of Parts electronics (brushed motors, low-profile encoders, a basic hub, kitbot gearboxes) can be bought any time: very cheap and always in stock, but much slower, and mixing them with vendor electronics costs 5% more project hours and a little performance. Vendors release 2–3 new generations over a career. Parts you no longer need can be sold (Shop → Sell) for part of their price if they are above 60% condition.
- **Game elements.** Without a Practice Field the free kit game pieces are enough. With one, quarter, half and full-field sets fill it up to its size (Level 1 quarter, Level 2 half, Level 3 full) and wear with driver practice. Preorder next season's set in the offseason: it shows as pending and arrives at Kickoff.
- **Extra hours and fatigue.** Put spare hours into any project to raise its quality (diminishing returns). In season, leave about 10% of the week's hours idle to keep fatigue steady; overtime (which never lets the team recover) and competitions raise it. At events, fatigue causes incidents (Incidents tab) and lowers scouting credibility.
- **Defense follows the real rules.** Pins are limited to 5 seconds (2022–2024) or 3 seconds (2025–2026), after which the defender backs off six feet, and each game's protected zones are off limits (Launch Pad, Community and Loading Zone, Source/Amp/Podium/Stage, Reef and Barge Zones, Tower). Turret shooters aim on the move and are hard to defend. Robots don't overlap each other or drive through field elements.
- **Strategy follows the real games.** In the shooting games (2022, 2024, 2026) one defender is the strongest alliance strategy; in 2023 and 2025 three scorers win. AI teams catch on as the season goes. In playoffs, an alliance captain can call partners to score or defend.
- **Team hours.** The Design Office shows exactly where each week's hours go. A project can absorb up to 80 h a week, so run several in parallel or hours go idle.
- **Season strategies.** 2022 cargo bounces out of the Hub across the whole field. 2024 alliances learn to feed notes across the field and stockpile them for Amplify (a Source defender cancels it); your alliance picks it up through its strategy read (Strategy mentor, drive coach, driver practice, events scouted), never by a button. 2025 alliances split two Coral Stations. 2026 adds a wide dumper shooter (out-scores most turrets, worse under defense), and climbs are slow and risky, so strong teams rarely bother.
- **Falls.** A failed high climb can drop the robot (most often 2022 High/Traversal and 2026 L2/L3): it is out for the match, badly damaged, and scraps spare parts.
- **Testing hours.** A Practice Field unlocks weekly testing hours (8/12/16 h by level, up to +6 with a second robot), like wind-tunnel time. Split them in the Design Office between development testing ($40/h: projects finish faster and come out better) and driver practice (cheap: a few spare parts; builds drive-team skills and confidence). Small teams get the most from driving; big programs should split once their drivers are fully practiced.
- **Robot condition at events.** Repairs use spare parts, so the robot arrives at 100% unless you're short on spares, the event is a flight away, or you did a sponsor demo with the robot that week. HQ previews the arrival condition. A Systems Shakedown on practice day rebuilds worn parts back to 100%.
- **Blue banners.** Event wins and Impact Awards hang on your banner wall (History).
- **The Impact Award is hard.** You need a submission (Design Office) and a high Impact rating: this season's outreach, a three-season track record, your presentation (Business mentor + best communicators), feeder programs and reputation. Regional winners usually rate 80+, so it takes a few seasons of steady outreach. HQ shows your odds at every registered regional; the Team page breaks down the rating.
- **Scouting data matters.** The Scouting tab and the pick list show what each robot actually did in qualifications: points per match, auto success, climb success, fault-free matches, fouls and defense. Pick value (used by you and by AI captains) discounts robots that break down.
- **Each game breaks differently.** Tip-overs are common in 2023 (and 2025), brownouts in 2026. Brief comms drops happen to everyone; poor electronics and heavy contact make them more frequent, longer and sometimes match-ending.
- **In-season debt.** From Kickoff to the Championship you can spend into the red (down to −$50,000). The school clears the debt at the season review, but Program Support and reputation drop with its size, and by 50% more for each consecutive season that ends in debt. In the offseason you can only spend cash you have; fundraisers always work. Below $1,000 you can apply to the STEM support fund (costs reputation).
- **Sponsors.** Offers sit at a similar level for each difficulty and grow a little with reputation and results; a title sponsor pays about three times a partner. Top programs get sponsors who expect wins.
- **Events.** Skip any event on its week; withdraw in the Calendar at least a month ahead for half the fee back. Spare parts reset each season (turn on auto-restock). The team trailer turns far events into a long drive (no air-freight damage).
- **Calendar and inbox.** The Calendar shows the whole program year (events, results, project finish dates, sponsor duties, milestones) with filters. Outreach and fundraising repeats within a month pay less; facilities, sponsors, mentors and the trailer unlock more activities. The inbox gets news and team chatter every turn, and some messages take an optional reply with a small effect (reputation, spare parts, extra practice, and so on).
- **Facilities and money.** Upgraded 3D Printing, CNC, Machine Shop and Programming Station each add a project slot (6 permanent slots at most; temporary slots from boosts and guest mentors come on top). A facility below 35% condition loses its slot until renovated. Upgrades are expensive and fundraisers pay less each time you repeat one in a program year, so a full shop takes several seasons.
- **Saves.** The game autosaves every turn and has 3 manual slots, all in your browser's local storage (same browser, same computer). Use **☰ → Export save** to copy a save code, and paste it on the Load screen to continue elsewhere.

## Sharing the game

Send **`dist/FRC-Manager.html`**. It is the whole game in one file (about 700 KB): the recipient double-clicks it and it opens in their browser, with no install and no internet needed.

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
js/data/seasons.js    the five games: subsystems, concepts, AI robot archetypes
js/data/world.js      regions, regionals, sponsors, mentors, equipment, activities, research, scenarios
js/data/parts.js      parts library: vendors, part categories, kit of parts, game elements
js/sim/engine.js      match engine (10 ticks/s), shared by live view, quick sim and AI matches
js/sim/rules.js       per-season scoring, ranking points and robot behaviour (2022–2026)
js/sim/ai.js          capability builder + persistent AI team pool
js/sim/event.js       schedule, rankings, OPR, alliance selection, playoffs, awards
js/systems/robot.js   development projects, knowledge, wear and repairs
js/systems/career.js  calendar, finance, sponsors, staff, fatigue, offseason, reviews, qualification
js/systems/parts.js   parts inventory, vendor releases, stock, allocation, wear, game elements
js/render/draw.js     2D fields, robots (top-down and side profile), effects
js/ui/*.js            screens, icons, Shop screen, tours and the How to play guide
js/dev.js             balance tools (see below)
tools/build-single-file.ps1   builds dist/FRC-Manager.html
tools/trailer/        60-second reveal trailer generator (open index.html, press Render MP4; index.html?vertical for 9:16)
```

## Tuning

- **Match pace per season**: `tempo` in each season block of `js/sim/rules.js`. Higher values mean slower collecting (`c`) and scoring (`s`).
- **Costs and fees**: `js/data/world.js` (`FEES`, `PARTS`, `EQUIP`, `SPONSOR_TYPES`, `MENTOR_COST`).
- **Concept stats, ceilings, hours and weights**: `js/data/seasons.js`.
- **Balance check**: open the browser console on the game page and run `G.Dev.balTest(100)`. It reports average, elite and percentile scores, bonus-RP rates, faults and climb rates for every season. `G.Dev.faultTest(150)` reports per-season failure rates (comms, brownouts, tips) by robot reliability and with or without a defender. `G.Dev.autoplay({ profile: 'established' })` plays a whole career with a simple bot; add `grind: true` for a bot that maxes outreach, fundraising and facility spending (economy and Impact checks), or `split: 0…1, probe: true, seed: n` to compare testing-hour splits (it logs a fixed-opponent performance probe at each regional).

Current balance at regional level, from `G.Dev.balTest`:

| Season | Avg alliance score | Bonus RP rates (average alliances) |
|---|---|---|
| 2022 | ~55 | Cargo ~45%, Hangar ~38% |
| 2023 | ~75 | Sustainability ~17%, Activation ~15% |
| 2024 | ~48 | Melody ~38%, Ensemble ~25% |
| 2025 | ~97 | Auto ~85%, Coral ~7%, Barge ~57% |
| 2026 | ~150 | Energized ~80%, Supercharged ~0% (≈45% for elite alliances), Traversal ~10% |

## Differences from the design plan

- 2022 storage (1- or 2-ball) is part of the Intake concept rather than its own subsystem.
- 2026 low-profile vs standard height is its own "Frame Profile" subsystem. Hoppers hold 8 / 20 / 45 fuel.
- Spare parts are bought in the Workshop; there is no spare-parts project.
- In-season build hours are 7 per student per week (5 in the offseason).
