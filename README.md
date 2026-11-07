# FRC Manager

A lightweight 2D management game about running a *FIRST* Robotics Competition team across the 2022–2026 seasons, inspired by the F1 Manager series. You don't drive the robot: you build the program behind it.

> Unofficial fan-made game. Not affiliated with or endorsed by *FIRST*®, Formula 1® or Frontier Developments. Sponsors, regionals, offseason events and opponent teams are fictional or randomly generated.

## How to play

1. Open `index.html` in Chrome, Edge or Firefox (double-click it). There is nothing to install, and it works offline.
2. Pick **New Career** (5 seasons, real or random order) or **Single Season Challenge** (one game plus a scenario, graded S–D).
3. Each turn is a month in the offseason and a week during the season. Make decisions, then press **Continue**.

The full design is in [GAME_DESIGN.md](GAME_DESIGN.md). The in-game **How to play** page (main menu) has a short guide.

### The loop

| Phase | What you do |
|---|---|
| Pre-season / offseason | Sign sponsors (Finance), hire mentors, buy equipment and parts (Workshop), run research (Design Office), register for regionals (Calendar), attend offseason events, do outreach (Team) |
| Kickoff | The game is revealed. Pick a concept (development direction) for every subsystem in the Design Office |
| Build season | Weekly turns: projects share team hours, sponsor activities pop up, optional overtime |
| Competition weeks 1–6 | Regionals: practice day → qualification matches → alliance selection → double-elimination playoffs → awards |
| Championship | Qualify by winning a regional, winning Impact / Engineering Inspiration, or through the Regional Pool wildcard. Then play a division and, if you win it, Einstein |
| Season review | Program goals, Program Support, finances, graduation, knowledge decay |

### Things worth knowing

- **Tech Knowledge carries over.** A turret built for one shooting game makes the next shooting game cheaper, faster to build and more reliable. Research projects build knowledge directly.
- **Weight limit is 125 lb.** An overweight robot must burn a practice block on emergency lightening.
- **Coach Calls.** You get 3–6 per match: pace, role (score / defend / feed), target priority, endgame timing and level, chase bonus RPs, avoid contact, and reset after a fault.
- **Matches.** You can watch at 1×–8×, skip to the end, or simulate instantly.
- **Saves.** The game autosaves every turn and has 3 manual slots, all in your browser's local storage (same browser, same computer). Use **☰ → Export save** to copy a save code, and paste it on the Load screen to continue elsewhere.

## Sharing the game

Send **`dist/FRC-Manager.html`**. It is the whole game in one file (about 390 KB): the recipient double-clicks it and it opens in their browser, with no install and no internet needed.

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
js/data/world.js      regions, regionals, sponsors, mentors, parts, equipment, research, scenarios
js/sim/engine.js      match engine (10 ticks/s), shared by live view, quick sim and AI matches
js/sim/rules.js       per-season scoring, ranking points and robot behaviour (2022–2026)
js/sim/ai.js          capability builder + persistent AI team pool
js/sim/event.js       schedule, rankings, OPR, alliance selection, playoffs, awards
js/systems/robot.js   development projects, knowledge, wear and repairs
js/systems/career.js  calendar, finance, sponsors, staff, offseason, reviews, qualification
js/render/draw.js     2D fields, robots (top-down and side profile), effects
js/ui/*.js            screens
js/dev.js             balance tools (see below)
```

## Tuning

- **Match pace per season**: `tempo` in each season block of `js/sim/rules.js`. Higher values mean slower collecting (`c`) and scoring (`s`).
- **Costs and fees**: `js/data/world.js` (`FEES`, `PARTS`, `EQUIP`, `SPONSOR_TYPES`, `MENTOR_COST`).
- **Concept stats, ceilings, hours and weights**: `js/data/seasons.js`.
- **Balance check**: open the browser console on the game page and run `G.Dev.balTest(100)`. It reports average, elite and percentile scores, bonus-RP rates, faults and climb rates for every season. `G.Dev.autoplay({ profile: 'established' })` plays a whole career with a simple bot.

Current balance at regional level, from `G.Dev.balTest`:

| Season | Avg alliance score | Bonus RP rates (average alliances) |
|---|---|---|
| 2022 | ~55 | Cargo ~45%, Hangar ~38% |
| 2023 | ~75 | Sustainability ~17%, Activation ~15% |
| 2024 | ~50 | Melody ~38%, Ensemble ~25% |
| 2025 | ~97 | Auto ~85%, Coral ~7%, Barge ~57% |
| 2026 | ~160 | Energized ~80%, Supercharged ~0% (≈45% for elite alliances), Traversal ~10% |

## Differences from the design plan

- 2022 storage (1- or 2-ball) is part of the Intake concept rather than its own subsystem.
- 2026 low-profile vs standard height is its own "Frame Profile" subsystem. Hoppers hold 8 / 20 / 45 fuel.
- Spare parts are bought in the Workshop; there is no spare-parts project.
- In-season build hours are 7 per student per week (5 in the offseason).
