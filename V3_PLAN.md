# FRC Manager v3.0 plan

**Decisions confirmed on 2026-11-10:** every recommended option, except decision 6 (the final championship is played in 2017 only, as in reality). Building is under way on the `v3-dev` branch; section 14 tracks progress.

v3.0 has two headline features: a ten-season career (2016 to 2026) and the FRC district model. Everything else in this plan supports those two.

Contents: 1 Career timeline · 2 The five new games · 3 Technology eras · 4 Vendors, parts and prices · 5 Stop Build Day · 6 The pandemic · 7 Championships by year · 8 Districts · 9 The world and AI teams · 10 History · 11 Code, saves and build order · 12 Decisions · 13 Sources · 14 Build status

---

## 1. Career timeline

| Calendar year | Game | Notes |
|---|---|---|
| 2016 | FIRST STRONGHOLD | new |
| 2017 | FIRST STEAMWORKS | new · two Championships |
| 2018 | FIRST POWER UP | new · two Championships |
| 2019 | DESTINATION: DEEP SPACE | new · two Championships |
| 2020 | INFINITE RECHARGE | new · played in full, Championship included (fiction) |
| 2021 | none | season cancelled by the pandemic; offseason events replay the 2020 game |
| 2022 to 2026 | RAPID REACT to REBUILT | as in v2.5 |

- **Start year.** A new career can start in any of the ten playable seasons and runs through 2026. Starting in 2016 gives ten seasons; starting in 2022 gives today's five-season career.
- **Starting kit follows the year.** A powerhouse that starts in 2016 owns brushed motors and no swerve modules; one that starts in 2024 owns what it owns today.
- **Random order (confirmed).** Only the games are shuffled. Everything else follows the calendar year: technology, vendors, playoff format, two Championships, the pandemic, districts. A modern game drawn in 2016 is played with 2016 technology.
- **Single-season scenarios** offer all ten games, each in its own year's technology.
- **Mid-career start.** A career that starts after 2016 opens with a short "FRC in <year>" briefing: what motors exist, whether swerve and vision are sold, the playoff format.

---

## 2. The five new games

Each game gets the same treatment as the existing five: its own field, scoring rules, bonus ranking points, robot concepts, six AI robot types (kitbot to elite), Kickoff briefing, coach calls, and a balance run. Point values below are the real ones.

### 2016 FIRST STRONGHOLD

- **Scoring.** Auto: reach a defense 2, cross 10, low goal 5, high goal 10. Teleop: cross a defense 5 (each defense scores twice, then it is "damaged"), low goal 2, high goal 5. End: challenge (park on the tower base) 5, scale (climb) 15. One boulder at a time.
- **Bonus ranking points.** Breach: damage 4 of the 5 defenses. Capture: 8 boulders scored (10 at the Championship) and all three robots on the tower at the end. In playoffs they are worth 20 and 25 points.
- **Defenses.** Low bar (always there) plus four chosen from: portcullis, cheval de frise, moat, ramparts, drawbridge, sally port, rock wall, rough terrain. The opposing alliance picks what you face.
- **Real meta.** Low, wide tank drives on 8 to 10 inch pneumatic tires. The dominant robot went under the low bar and shot high goals with camera alignment. Breach was routine; capture decided rankings. The two "doors" were mostly avoided. Defenders blocked shots in the courtyard. Top autos crossed and scored a high goal.
- **In the game.**
  - Drivetrain: kitbot on pneumatic wheels, 6-wheel pneumatic, 8-wheel pneumatic, tank treads. No mecanum or swerve (terrain). Uses the existing Traverse stat.
  - Frame: tall, or low-bar height (easiest crossing, limits the shooter and climber).
  - Defense tool: none, arm/wedge (portcullis and cheval de frise), door arm (drawbridge and sally port).
  - Intake, scorer (low-goal roller, fixed high shooter, adjustable shooter), scaler, software.
- **New for the match engine.** Defenses as obstacles with crossing time and failure chance by drivetrain and tool; damage state; tower strength; capture check.

### 2017 FIRST STEAMWORKS

- **Scoring.** Auto: cross the line 5, a rotor turning 60, high-goal fuel 1 kPa each, low-goal fuel 1/3 kPa. Teleop: rotor 40, high goal 3 fuel per kPa, low goal 9 fuel per kPa, 1 point per kPa. End: rope climb 50 per robot. Rotors need 1, 2, 4 and 6 gears (13 in all, one is a free reserve gear).
- **Bonus ranking points.** 40 kPa; all four rotors. In playoffs: 20 and 100 points.
- **Real meta.** Gears and climbs won almost everything. Fuel only mattered for elite teams. Floor gear pickups became standard for top teams during the season. Mecanum and swerve were valued for lining up on the pegs. Human players (pilots) on the airship lifted the gears.
- **In the game.**
  - Drivetrain: kitbot, West Coast, mecanum, team-built swerve.
  - Gear mechanism: passive slot (loading station only), active gripper, floor pickup.
  - Fuel system: none, low-goal dumper, high-goal shooter, high-volume shooter with a big hopper.
  - Climber: none, slow winch, fast winch. Software.
- **New for the match engine.** Gear delivery whose speed and drop chance use the Human Player's skill (this finally makes that role matter); rotor thresholds; kPa accounting on top of the fuel and hopper code written for REBUILT; rope climbs.

### 2018 FIRST POWER UP

- **Scoring.** Auto: auto-run 5; owning your switch or the scale 2 + 2 per second. Teleop: ownership 1 + 1 per second; each cube in the vault 5. End: park 5, climb 30.
- **Power-ups** (bought with vault cubes, 10 seconds each): Force (take ownership), Boost (double ownership points), Levitate (a free climb).
- **Bonus ranking points.** Auto Quest: three auto-runs and own your switch at the end of auto. Face the Boss: three climbs (Levitate counts as one).
- **Real meta.** Scale ownership decided matches: tall, fast elevators with wheeled cube intakes. Switch and vault specialists played third robot. Plate sides were randomised each match, so autos had to handle both. Elite scale autos placed three or four cubes. Levitate plus real climbs gave Face the Boss; a few robots lifted partners.
- **In the game.**
  - Drivetrain: kitbot, West Coast, mecanum, team-built swerve (now competitive).
  - Cube intake: claw, wheeled intake, wide wheeled intake.
  - Lift: none (vault and exchange only), switch-height arm, scale elevator, fast scale elevator.
  - Climber: none, hook and winch, climber that carries a partner. Software.
- **New for the match engine.** Ownership scored every second; cube counts on each plate; random plate sides; vault and power-ups; four cube sources.

### 2019 DESTINATION: DEEP SPACE

- **Scoring.** Sandstorm (first 15 seconds, drivers may use a camera): leaving the platform 3 (from level 1) or 6 (from level 2). Hatch panel 2, cargo 3. End: climb to platform level 1, 2 or 3 for 3, 6 or 12.
- **Bonus ranking points.** One complete rocket (6 hatches and 6 cargo); 15 climb points.
- **Real meta.** Cycle speed. Cargo ship first, then one rocket for the ranking point. Level 3 climbers. Defense was strong (one defender allowed across the field), so strong drivetrains rose, and swerve robots such as 1323 were on a winning Championship alliance. Many teams drove the sandstorm through a camera instead of writing an auto.
- **In the game.**
  - Drivetrain: kitbot, West Coast, mecanum, team-built swerve.
  - Hatch mechanism: passive, active, floor pickup. Cargo intake: none, ground roller.
  - Lift: fixed (cargo ship and rocket level 1), two-level, three-level.
  - Climber: none, level 2, level 3, level 3 that lifts a partner. Software.
- **New for the match engine.** Bays that need a hatch before cargo (built on the CHARGED UP grid and REEFSCAPE levels code); sandstorm that uses driver skill plus a camera, or the auto routine, whichever is better; start-level bonus; one-defender rule.

### 2020 INFINITE RECHARGE

- **Scoring.** Auto: leave the line 5; power cells 2 / 4 / 6 (bottom / outer / inner port). Teleop: 1 / 2 / 3. Control panel: rotation 10, position 20. End: park 5, hang 25, level bar 15.
- **Bonus ranking points.** 65 endgame points; Stage 3 (9 + 20 + 20 cells, with both control panel tasks).
- **Real meta.** Five-cell cycles. Turret shooters with an off-the-shelf vision camera. Low robots drove under the control panel through the trench. Climb and level for the endgame point. Stage 3 was rare. In reality the season stopped after three weeks; in the game it is played to the end.
- **In the game.**
  - Drivetrain: kitbot, West Coast, mecanum, swerve (modules now sold).
  - Frame: tall or trench height. Intake and indexer (3 or 5 cells).
  - Shooter: low-port dumper, fixed, hood, turret and hood.
  - Control panel: none, spinner, spinner with colour sensor.
  - Climber: none, hook and winch, climber that levels the bar. Software.
- **New for the match engine.** Close to RAPID REACT, plus inner/outer port accuracy, stages, control panel tasks and bar levelling.

### Small items for all five

- The existing mid-season "meta shift" gets one line per game (2017: floor gear pickups spread; 2019: defense spreads; and so on).
- Real World Champions for the Einstein pop-up: 2016: 330, 2481, 120, 1086. 2017: 973, 1011, 2928, 5499 (Houston) and 2767, 254, 862, 1676 (St. Louis, also Festival of Champions winners). 2018: 254, 148, 2976, 3075 and 2767, 27, 2708, 4027. 2019: 973, 1323, 5026, 4201 and 3707, 217, 4481, 1218. 2020: none.
- The award is called the Chairman's Award through 2022 and the FIRST Impact Award from 2023.

---

## 3. Technology eras

The state of the art follows the calendar year. Each change arrives with a pop-up (same style as the offseason tech-change window) and a few news and chatter items. AI teams follow the same eras, so the player and the field stay level.

| When | Change | Effect in the game |
|---|---|---|
| 2016 to 2017 | Brushed era | Brushed motors only. No vision camera for sale: Vision Level 1 is a do-it-yourself project (double hours, low ceiling). Swerve only as a team-built gamble. Pneumatics strong. Single-elimination playoffs. |
| 2018 | Vision in a box | A vision camera goes on sale: Level 1 at normal hours, Level 2 possible. Team-built swerve becomes competitive (penalties ease); a few top AI teams run it. |
| 2019 | Brushless arrives | Lumen launches the first brushless motor at about the premium brand's price, with far better performance. Electrical know-how partly dated. |
| 2019 offseason | The old premium vendor closes, Apex is founded | See section 4. |
| 2020 | Swerve off the shelf | Apex sells the first swerve module. Top AI teams switch within two seasons. Stop Build Day is retired (section 5). |
| 2020 to 2021 | Pandemic | Section 6. |
| 2022 | Motors over air | The pneumatics bonus shrinks and keeps shrinking. Swerve is the meta: most strong AI teams run it. Lumen's value swerve module arrives. One Championship again. |
| 2023 | Double elimination, AprilTags | Playoffs change format. Vision ceilings rise and vision helps autonomous and alignment more. Old vision know-how partly dated. |
| 2024 to 2026 | Refinement | New motor and module generations. |
| 2019 and 2026 | New districts | The Mesa District (2019) and Sierra District (2026) form; regionals there become district events (sections 8 and 9). |

Proposed numbers (to be tuned in balance runs):

| | 2016–17 | 2018–19 | 2020 | 2022 | 2023 | 2024+ |
|---|---|---|---|---|---|---|
| Team-built swerve | 2× hours, needs CNC Router or Lathe, reliability −12, ceilings −10% | 1.5× hours, reliability −6 | modules sold | modules sold | modules sold | modules sold |
| Strong AI teams on swerve | 2% | 6–10% | 25% | 60% | 80% | 90% |
| Vision | DIY, Level 1 only, ceiling 55 | camera sold, ceiling 75 | 75 | 75 | AprilTags, ceiling 92 | 92 |
| Pneumatics: fewer hours on intakes and manipulators | 25% | 25% | 20% | 10% | 10% | 5% |
| Playoffs | single elimination | single elimination | single elimination | single elimination | double elimination | double elimination |

The existing random offseason rule changes and new designs keep happening every year on top of this.

---

## 4. Vendors, parts and prices

### Vendors by year

| | 2016 to 2018 | 2019 | 2020 onward |
|---|---|---|---|
| Premium | Third vendor (working name **Sterling Motion**), brushed | Sterling, brushed, now outclassed | **Apex Motion**, brushless |
| Value | **Lumen Robotics**, brushed | Lumen, first brushless | Lumen, brushless |
| Always | Kit of Parts (brushed) and mechanical COTS suppliers | | |

### The story

1. **2016 to 2018.** Sterling is the premium brand, Lumen the value brand. Both sell brushed motors, encoders and control hubs.
2. **2018 offseason.** Lumen launches its first brushless motor at about Sterling's price. It clearly outperforms Sterling's best.
3. **2019 season.** Sterling has no brushless motor and loses the market.
4. **2019 offseason.** Sterling closes. Its catalogue is sold off in a one-month clearance, then disappears. Apex Motion opens with a premium brushless line and the first swerve module. Lumen cuts its brushless price back to the value band.
5. **2022.** Lumen's swerve module arrives.

### Product lines

Performance is on the game's 0 to 100 scale. The 2022 values equal today's starting values, so the modern seasons keep their balance.

| Line | Type | Marks and years (launch can land a year early or late) | Performance |
|---|---|---|---|
| Kit motor | brushed | all years | 8 |
| Lumen Volt | brushed | I 2016, II 2018 | 16, 22 |
| Sterling Pro | brushed | I 2016, II 2017 | 26, 32 |
| Lumen Ion | brushless | I 2019, II 2022, III 2024, IV 2026 | 42, 50, 65, 80 |
| Apex Torque | brushless | I 2020, II 2022, III 2024, IV 2026 | 60, 72, 87, 100 |
| Apex Vector | swerve module | I 2020, II 2023, III 2025 | |
| Lumen Pivot | swerve module | I 2022, II 2024, III 2026 | |
| Vision camera | COTS | I 2018, II 2020, III 2023 (AprilTags) | |

- **Version cap.** Today a career sees at most three generations of a product. In v3.0 each line has a fixed ladder tied to the calendar: four marks for brushless motors, two for brushed, three for swerve modules and cameras. A career that starts in 2024 finds Mark III on the shelf.
- Encoders and control hubs follow the same vendor pattern.
- **Sterling parts after the closure** keep working and count as Apex-compatible (Apex is its successor), so there is no forced control-system swap. Their resale value drops.

### Prices and inflation

- **Price index.** Every dollar amount in the game is multiplied by a yearly index from US consumer prices: 2016 0.73 · 2017 0.74 · 2018 0.76 · 2019 0.77 · 2020 0.78 · 2021 0.82 · 2022 0.88 · 2023 0.92 · 2024 0.95 · 2025 0.97 · 2026 1.00. Sponsors, school funding, fundraising, fees, travel, facilities and parts all move together.
- **Era pricing.** The premium tier costs the same share of a budget in every era, and so does the value tier. A 2016 team cannot buy twice the motors with the same sponsors.

| Motor + controller | 2016 | 2019 | 2020 | 2022 | 2026 |
|---|---|---|---|---|---|
| Premium | Sterling Pro $170 | Sterling Pro II $175 | Apex Torque I $180 | Apex Torque II $200 | Apex Torque IV about $310 |
| Value | Lumen Volt $110 | Lumen Ion I $165 (launch) | Lumen Ion I $120 | Lumen Ion II $130 | Lumen Ion IV about $200 |

---

## 5. Stop Build Day, 2016 to 2019 (suggested addition)

Not on your list, but it was the biggest structural difference of those years, and it fits the two-robot system the game already has. FIRST retired it for 2020 and said about half of all teams had been building a second robot because of it.

Proposed simple version:

- After Week 0 the competition robot goes "in the bag".
- During competition weeks at home: no build or upgrade work and no driver practice on the competition robot. Work continues on the second robot or test chassis. Software and research are unaffected.
- At each event you may bring one finished upgrade or replacement subsystem and install it in the pits (it costs practice time).
- District teams get a six-hour access window before each event: one repair or tune-up, or some driver practice.
- 2020: pop-up "Stop Build Day is retired", and the rules become today's.

---

## 6. The pandemic

1. **The 2020 season is played in full**, including the Championship and the season review.
2. **Pop-up 1, "Everything stops".** Schools close, the 2021 season is cancelled, and the calendar jumps to June 2021.
3. **Pop-up 2, "A year at home".** Pick two programs for the lockdown year:

| Program | Effect |
|---|---|
| Remote training (CAD and code online) | Knowledge loss halved |
| At-home skills challenge | Student skill loss halved; the drive team keeps its familiarity |
| Community response (print face shields; needs a 3D printer) | Reputation up, sponsor satisfaction up, outreach counts toward the award track record |
| Keep the sponsors close | No sponsor leaves; they pay half for 2021 |

4. **Pop-up 3, "Back in the shop"** (June 2021) lists what was lost and kept.

| What | Proposed loss |
|---|---|
| Knowledge | every area −40% |
| Students | the classes of 2020 and 2021 have both graduated on time; the autumn 2020 intake is half size; remaining students lose about 20% of trained skill |
| Mentors | each has a 25% chance of having moved on |
| Sponsors | no payments in 2021; each has a 30% chance of leaving; satisfaction drifts toward 50 |
| School | no funding in 2021; Program Support −5; reputation −10% |
| Money | no income and no fees; half a year of shop upkeep |
| Shop | facility condition −15; battery health −30% |
| AI teams | about 21% fold, as in reality (3,914 teams in 2020, 3,079 in 2021); every team's strength drops; few rookies in 2022 |

5. **Offseason 2021.** June to December. Offseason events run the 2020 game with the 2020 robot, as in reality. Autumn recruiting and sponsor offers are normal. Kickoff 2022 follows.

- In random order, the game replayed in 2021 is whichever game the career played in 2020.
- History shows a "2021: season cancelled" card.
- Careers that start in 2022 or later never see the pandemic.

---

## 7. Championships by year

| Years | Championships | Einstein | Final |
|---|---|---|---|
| 2016 | one, 8 divisions | bracket of 8 division champions, best of 3 | none |
| 2017 | two (Houston and St. Louis), 6 divisions each | round robin of 6 division champions, top two play a best-of-3 final | **Festival of Champions**: the two winning alliances play best of 5 in July |
| 2018 to 2020 | two (Houston and Detroit), 6 divisions each | as above | none |
| 2022 | one, 6 divisions | round robin of 6, then final | none |
| 2023 onward | one, 8 divisions | double-elimination bracket of 8 (as now) | none |

- **Fact check.** Two Championships ran in 2017, 2018 and 2019 (2020 and 2021 were planned and cancelled). The final between the two winning alliances, the Festival of Champions, was held only in 2017 (St. Louis won 3 to 2). **Confirmed: the game plays it in 2017 only.**
- **Which Championship.** West, Southwest and Southeast go to Houston; Midwest, Northeast and Canada go to St. Louis or Detroit. Districts follow the area they sit in.
- **Easier to qualify in two-Championship years.** Twice the places: the Regional Pool cut-off drops and district slots rise.
- **Banners.** Winning your Championship makes you World Champions (as in reality, both alliances were). Winning the Festival adds its own banner and celebration.
- **If you did not win your Championship**, the Festival is a news item with the option to watch.

---

## 8. Districts

### The real model, in short

- A district team's registration covers **two district events** of about 40 teams with 12 qualification matches each.
- Each event earns **district points**: qualification rank (22 down to 4), alliance selection (captains and first picks 16 down to 9, second picks 8 down to 1), playoff results, judged awards (Impact 10, Engineering Inspiration 8, Rookie All-Star 8, others 5). Rookies add 10 once, second-year teams 5.
- The top teams by points go to the **District Championship**, where points count **three times**.
- Each district gets **Championship slots in proportion to its size**. They go to the District Championship's Impact, Engineering Inspiration and Rookie All-Star winners and its winning alliance, then down the points list.
- Regional teams cannot play district events. District teams may play regionals but cannot qualify there.
- In 2026, 2,095 of 3,696 teams (57%) are in districts and hold 342 of the 591 allocated Championship slots.

### In the game

**Team origin.** New game offers the six regional areas (as now) or a district.

| District (fictional) | Sits in | Exists from | Teams, first year → 2026 | District events, first year → 2026 | District Championship | Championship slots in 2026 | Character |
|---|---|---|---|---|---|---|---|
| Lakeshore | Midwest | before 2016 | 105 → 128 | 6 → 7 | 48 teams | 18 | the biggest and deepest |
| Harbor | Northeast | before 2016 | 72 → 88 | 4 → 5 | 36 teams | 12 | balanced |
| Evergreen | West | before 2016 | 50 → 60 | 3 → 3 | 28 teams | 8 | small, short trips |
| Mesa | Southwest | 2019 | 64 → 72 | 4 → 4 | 32 teams | 10 | forms in 2019, as Texas did |
| Sierra | West | 2026 | 90 | 5 | 36 teams | 13 | forms in 2026, as California did |

**New districts form during the career**, as they did in reality (section 9, growth). When one forms, part of that area's regional teams move into it and the area runs fewer regionals. If your team is in that area, a pop-up one season ahead tells you, and you choose whether to join the district or stay a regional team. A career that starts after the year a district formed can pick it as an origin from the start.

**A district season.**

1. **Registration.** One fee covers two district events, picked from your district's list (weeks 1 to 5). Travel is always local or a drive. A third event is optional, costs extra and earns no points.
2. **District events.** Two days, 12 qualification matches, 8 alliances, the playoff format of that year. Less practice time and a little less fatigue than a three-day regional.
3. **Points.** The real formula and tables. Playoff points follow the year: 10 per round won under single elimination; 30 / 20 / 13 / 7 by finish under double elimination.
4. **Standings.** A new District screen: every team's points, the District Championship cut line, the Championship line, and what you need at your next event.
5. **District Championship.** Week 7, so qualifiers get no rest week before the Championship. Extra fee. Points count three times.
6. **Championship.** By the district's slots, in the real order.
7. **Impact Award.** Win it at a district event to compete for it at the District Championship; win there to compete at the Championship (the existing Championship Impact flow).

**Also changes for district teams.** School and sponsor goals get district versions ("Reach the District Championship", "Finish in the district's top ten"). In 2016 to 2019 they get the robot access window from section 5.

**Regional teams** play as they do now: win a regional, win the Impact, Engineering Inspiration or Rookie All-Star award, or reach the Regional Pool cut-off.

**Costs.**

| | Regional team | District team |
|---|---|---|
| Registration | $6,000 first regional | $6,000 for two district events |
| More events | $4,000 per extra regional | third district event (no points) about $1,000 |
| Next level | none | District Championship $4,000 |
| Championship | $5,000 | $5,000 |
| Travel | local, drive or fly | local or drive |

(All before the price index.)

---

## 9. The world and AI teams

**Today.** 620 AI teams (plus 12 rookies a year). Only your own events are simulated; each event draws its field at random by area and strength, and the Championship field is drawn by strength. No AI team has a season record.

**Why that has to change.** District standings need every district team's result at every district event, including the ones you are not at.

**Proposal: simulate every event in the world.**

- A **fast event simulation** (statistics, no match animation, a few milliseconds per event) runs each week for every event you are not at. The events you attend still use the full match engine.
- Every AI team has a home (an area or a district), a schedule (district teams two events; regional teams one or two, strong programs up to three), a record, awards and a qualification status.
- The Championship field is made of teams that really qualified. Your division is filled from them.
- New views: weekly results (who won where), district standings, the list of qualified teams.

**Team count.** Yes, more are needed, because teams stop being reused across events: about 900 in 2026 instead of 620. Save size grows by roughly 0.2 MB, which is fine.

### Growth of teams and events over the decade

What happened in reality:

| Season | Teams | Regionals | District events (with championships) | Districts |
|---|---|---|---|---|
| 2016 | 3,128 | 53 | 73 | 8 |
| 2019 | 3,790 | 62 | 110 | 11 |
| 2020, as planned | 3,914 | 66 | 116 | 11 |
| 2021 | 3,079 | cancelled | cancelled | 11 |
| 2023 | 3,324 | 61 | 105 | 11 |
| 2026 | 3,791 | 56 | 144 | 14 |

- Teams grew 25% from 2016 to 2020, fell 21% in the pandemic, and took until 2025 to recover.
- District events doubled. Most of that came from new districts: Ontario and Israel in 2017, Texas in 2019, California and Wisconsin in 2026.
- Regionals grew with the team count until 2020, then fell in 2026 when California's regionals became district events.
- Districts held about a quarter of all teams in 2016 and 57% in 2026.

In the game (about one team for every four real ones; all numbers approximate):

| Year | Real teams | Game teams | Regionals | Districts | District events | District share of teams |
|---|---|---|---|---|---|---|
| 2016 | 3,128 | 745 | 22 | 3 | 13 | 30% |
| 2017 | 3,357 | 800 | 24 | 3 | 14 | 30% |
| 2018 | 3,660 | 870 | 26 | 3 | 14 | 29% |
| 2019 | 3,790 | 900 | 24 | 4 (Mesa forms) | 18 | 37% |
| 2020 | 3,914 | 930 | 25 | 4 | 19 | 37% |
| 2021 | 3,079 | 730 | none | 4 | none | |
| 2022 | 3,225 | 765 | 21 | 4 | 16 | 37% |
| 2023 | 3,324 | 790 | 21 | 4 | 16 | 37% |
| 2024 | 3,468 | 825 | 22 | 4 | 17 | 37% |
| 2025 | 3,731 | 885 | 24 | 4 | 18 | 37% |
| 2026 | 3,791 | 900 | 20 | 5 (Sierra forms) | 24 | 49% |

- **How it shows in play.** The Calendar lists more regionals in a growing year and fewer after the pandemic. Districts add an event when they outgrow the ones they have. Event fields get deeper as the pool grows.
- **Rookies and folding.** Each year about 4% of teams fold and rookies replace them, plus that year's growth. 2017 and 2018 bring large rookie classes (more competition for Rookie All-Star); 2022 brings few.
- **Championship places** follow the same curve: more in the two-Championship years, and each district's slots follow its share of all teams.

**Cheaper alternative.** Simulate only your own district; leave everything else as it is today. Less work, but regional players see no change and the world has no results outside your events.

---

## 10. History: each year's robot

- At each season review the game stores the robot: its side-view drawing (drivetrain, mechanisms, team colours), concept names and versions, power, reliability, weight and parts brand.
- Each season card in History shows the robot next to the results. A gallery strip at the top shows the whole career's robots side by side.
- Optional: name your robot (shown in History and at events).
- Seasons played before v3.0 show no drawing (the data was not stored).

---

## 11. Code, saves and build order

**Saves.** v2.5 careers keep loading and stay as they are: 2022 to 2026, regional, current prices, their own product plan. New features apply to new careers only.

**Branching.** Work happens on a `v3-dev` branch. `main` stays at v2.5, so the live site is untouched and patches go out as v2.5.x and are merged into `v3-dev`. The `v2.5` tag and the backup folder are the fallback.

**Preview builds.** The current artifact stays on v2.5. v3 previews go to a separate artifact when you ask for one.

**Build order.** Each milestone ends in a build you can play.

| # | Milestone | Contents |
|---|---|---|
| 1 | Framework | Ten-year calendar, start-year picker, era table, price index, single-elimination playoffs, History robots |
| 2 | Vendors and eras | Sterling, Lumen and Apex timeline, brushed and brushless, vision, swerve and pneumatics rules, era pop-ups, Stop Build Day |
| 3 | Games | 2020, 2019, 2018, 2017, 2016 (closest to existing code first), each with a balance run |
| 4 | Championship and pandemic | Two Championships, round-robin Einstein, Festival of Champions, the pandemic |
| 5 | World and districts | Fast event simulation, team homes and schedules, district events, points, standings, District Championship |
| 6 | Balance and text | Ten-year automated careers (regional and district, every profile), How to play, tours, news, README, version notes |

**Risks.**

- The five games are the largest part of the work.
- Balance has to hold across ten games and five eras.
- A ten-year career may leave teams with everything bought by year six; the balance runs will show whether income needs adjusting.
- The single-file build grows from about 1 MB to about 1.5 MB.

---

## 12. Decisions to confirm

**R** marks the recommendation. **All confirmed as recommended on 2026-11-10, except decision 6.**

### Larger decisions

| # | Decision | Options |
|---|---|---|
| 1 | Stop Build Day 2016 to 2019 (section 5) | **R: simple version** · flavour text only · leave out |
| 2 | Third vendor's name | **R: Sterling Motion** · Keystone Dynamics · Vanguard Controls · your own |
| 3 | Inflation | **R: visible yearly price index on all money** · constant dollars (no index; early parts priced to the same budget share) |
| 4 | Pandemic severity (section 6 table) | **R: as listed** · milder · harsher |
| 5 | "A year at home" choice of two programs | **R: yes** · fixed losses, no choice |
| 6 | Final championship (Festival of Champions) | **Chosen: 2017 only, as in reality** (the recommendation was 2017 to 2019) |
| 7 | Einstein before 2023 | **R: as in reality (2016 bracket; 2017 to 2022 round robin of six, then a final)** · a simple bracket every year |
| 8 | Founding districts | **R: three (Lakeshore, Harbor, Evergreen)** · other names or sizes |
| 9 | New districts forming mid-career | **R: two, as in reality (Mesa in 2019, Sierra in 2026); a team in that area chooses to join or stay regional** · same, but joining is forced · one (2019 only) · none (growth only inside the three founding districts) |
| 10 | World simulation | **R: every event in the world, team and event counts following the real curve (about 745 in 2016, 930 in 2020, 900 in 2026)** · only your own district |
| 11 | Build order | **R: as in section 11** · districts first (playable on today's five games) |

### Smaller decisions (the default applies unless you object)

| # | Decision | Default | Alternative |
|---|---|---|---|
| 12 | Career end | always after 2026 | fixed number of seasons |
| 13 | Random order with a late start | shuffle draws from all ten games | only games from the start year on |
| 14 | Motor names | Sterling Pro, Lumen Volt (brushed), Lumen Ion and Apex Torque (brushless) | your own |
| 15 | Sterling parts after closure | keep working, Apex-compatible, lower resale | become incompatible |
| 16 | Swerve before 2020 | team-built gamble from 2016, competitive from 2018 | locked until 2018 |
| 17 | Era changes date knowledge | brushless: Electrical −20%; AprilTags: Vision −25% | no knowledge loss |
| 18 | Pandemic and AI teams | 21% fold (the real drop), all weaken | AI unaffected |
| 19 | Championship names | real cities (Houston, St. Louis, Detroit) | neutral (North, South) |
| 20 | Award name | Chairman's Award through 2022, FIRST Impact Award after | Impact Award every year |
| 21 | 2016 defenses | you pick what the opponents face before a match (auto-pick by default) | always random |
| 22 | 2018 power-ups | played by your Drive Coach's skill, with a preference setting | buttons during the match |
| 23 | District Championship | one field, 28 to 48 teams | two divisions for Lakeshore |
| 24 | District cross-play | optional third district event without points; no regionals | also allow regionals |
| 25 | Regional qualification | today's pool system in every year | era-accurate wildcards before 2025 |
| 26 | Robot names | yes | no |
| 27 | v2.5 saves | keep working unchanged | no guarantee |
| 28 | Development branch | `v3-dev`, `main` stays v2.5 | work on `main` |

---

## 13. Sources

- Game rules and champions: Wikipedia articles for [FIRST Stronghold](https://en.wikipedia.org/wiki/FIRST_Stronghold), [FIRST Steamworks](https://en.wikipedia.org/wiki/FIRST_Steamworks), [FIRST Power Up](https://en.wikipedia.org/wiki/FIRST_Power_Up), [Destination: Deep Space](https://en.wikipedia.org/wiki/Destination:_Deep_Space), [Infinite Recharge](https://en.wikipedia.org/wiki/Infinite_Recharge).
- District rules and points: [2020 game manual, section 11 (Tournaments)](https://frc-game-manual-rst.readthedocs.io/en/latest/gen/section_11.html).
- 2026 district sizes and slots: [FIRST blog, advancement to the 2026 Championship](https://www.firstinspires.org/community-blog/2025-advancement-to-the-2026-first-championship); [California districts in 2026](https://www.firstinspires.org/community-blog/california-districts-in-2026).
- District list, team counts by year: [Wikipedia, FIRST Robotics Competition](https://en.wikipedia.org/wiki/FIRST_Robotics_Competition).
- Event counts by season: the season articles above, plus [Charged Up](https://en.wikipedia.org/wiki/Charged_Up_(FIRST)) (2023) and [Rebuilt](https://en.wikipedia.org/wiki/Rebuilt_(FIRST)) (2026). Team counts differ by a few teams between articles.
- Stop Build Day: [FIRST blog, Stop Build Day in 2019 and 2020](https://www.firstinspires.org/community-blog/2019-sbd-2020).
- Double elimination: [FIRST blog, 2023 data and updates](https://www.firstinspires.org/community-blog/2023-double-elimination-2023-data-and-updates).
- Festival of Champions: [NASA Robotics Alliance, 2017 FIRST Festival of Champions](https://robotics.nasa.gov/2017-first-festival-of-champions).

**Not confirmed from a source.** The season "meta" summaries in section 2 and the product years in section 3 (vision camera 2018, brushless 2019, off-the-shelf swerve 2020) come from general knowledge of those seasons and match your list; my searches did not turn up a page that states them. Please correct anything that does not match your memory of those years.

---

## 14. Build status

Branch `v3-dev`. Nothing is committed unless you ask.

| # | Milestone | Status |
|---|---|---|
| 1 | Framework | **Done and tested**: calendar years with a start-year picker, price index on all money, single-elimination playoffs before 2023, each year's robot in History (with a name field in the Garage). Real v2.5 saves load unchanged and play to the end. |
| 2 | Vendors and eras | **Done and tested**: Sterling, Lumen and Apex timeline with the era catalogue; brushed and brushless; team-built swerve, home-made vision, pneumatics and AprilTags by year; AI teams follow the same eras; story pop-ups (vendor stories, a recap after every season, the state of the art at career start); Stop Build Day 2016 to 2019. |
| 3 | Games (2020, 2019, 2018, 2017, 2016) | **Done and tested**: all five play full matches, seasons and careers (field, rules, robot concepts, six AI robot types each, news and chatter). An established test team ranks about mid-field in each, as in the modern games. The five fields are drawn to the official layouts (2016 is a rotated field with each alliance's Secret Passage on its own half; 2020 has the trench runs on the official sides). The two optional pre-match choices are on the pre-match page: the opponents' defenses in 2016 and the Vault's power-up order in 2018. |
| 4 | Championship and pandemic | **Done and tested**: the pandemic (2021 cancelled, the "year at home" choice of two programs, a fifth of all teams folding, the 2020 game replayed at 2021 offseason events); one or two Championships by year with their real cities and divisions; Einstein as a bracket (2016), a round robin of six (2017 to 2022) or double elimination (2023 on); the Festival of Champions in July 2017; the real 2016 to 2019 champions in the celebration note. The award is called the Chairman's Award until 2022 (one set of texts, renamed at display by calendar year), with a story pop-up when it becomes the Impact Award. |
| 5 | World and districts | **Done and tested**: every team and event of the season is simulated (`js/systems/world.js`): about 740 teams in 2016, 930 in 2020, 760 after the lost season, 900 in 2026, within two teams of the plan's curve every year. Five fictional districts (three from the start, Mesa from 2019, Sierra from 2026) with real district points, a District Championship in week 7 and Championship places per district. A team in the area of a forming district gets a pop-up the July before and chooses to join or stay regional. District wording in goals, sponsor goals, registration and results; a World page (District page for district teams). The player's Championship division is made of teams that qualified. |
| 6 | Balance and text | **Done**: the world holds its strength level over the decade (rookies grow up in three seasons, strong teams enter more events and gather at the events with more stars, the lost season sets everybody back for two years), so event fields match v2.5's by star rating; How to play has a new guide, "The decade", and the other guides, the README, the version notes (3.0) and the tours cover the new features. `dist/FRC-Manager.html` is rebuilt. Not published: the GitHub Pages site and the artifact are still v2.5 until you ask. |

Notes for whoever continues the build:

- A career can start in any year from 2016 to 2026. `G.Dev.autoplay({ start: 2016, profile: 'established' })` plays a whole ten-season career; `home: 'lakeshore'` makes it a district team, `region: 'Southwest', join: true` joins the Mesa District when it forms, `noWorld: true` plays without the simulated world (the v2.5 way of filling events).
- Money is kept in 2026 dollars inside the game and converted when it is shown (`U.money`), so the price index needed no change to any price or income table.
- 2022 now uses single elimination, as it did in reality.
- The classic games live in three files of their own: `js/data/seasons-classic.js`, `js/sim/rules-classic.js`, `js/render/draw-classic.js`.
- Test harness (scratchpad `v3/`): `run.sh <test file> <test:args>`; game tests are `g.js` (`bal:<year>`, `match:<year>`, `pic:<year>`, `season:<year>`), district tests `m5.js` and `m5b.js`, era naming, pre-match choices and field-strength measurements `m6.js`, career statistics `st.js`.
- Asked for during the build (2026-11-11), and done:
  - **Stop Build Day keeps development open.** A new mechanism, an upgrade, hardening or lightweighting finished while the competition robot is in the bag is packed (the withholding allowance) and fitted in the pits with Install Upgrade on practice day; district teams fit it in their robot access window. Nothing comes off the bagged robot at home and the other robot cannot take its place. Without a second robot, hardware projects run at half speed after bag day; with one running (a test chassis is enough) there is no slowdown at all. `Robot.bagLock`, `Robot.held`, `Robot.installHeld` in `js/systems/robot.js`.
  - **Wildcards before the Regional Pool.** Through 2024 a regional team qualifies by winning, with the Chairman's (Impact), Engineering Inspiration or Rookie All-Star award, or on a wildcard: a place earned at a regional by a team that has already qualified (or twice by one team) goes to the finalist alliance, captain, then first pick, then second pick. The Regional Pool starts in 2025. One wildcard rule and one pool rule for all their years (`Era.wildcards`, `close()` in `js/systems/world.js`, `C.wildcard`). Careers from v2.5 keep the pool.
  - **Field graphics** of the five classic games redrawn from the official layouts. 2020 after review: the Shield Generator fills the gap between the two Trench Runs with its pillars at the trench edges, and the Power Port and Loading Bay sit about 2.4 m from their side rails (3.3 m apart on the wall).
  - **A second robot removes the Stop Build Day slowdown** completely (a test chassis counts).
  - **Vendor loyalty sponsorship** (asked for on 2026-11-11). Loyalty levels per catalogue (`D.LOYALTY` in `js/data/parts.js`, `P.loyal*` in `js/systems/parts.js`): 100 points for a season with the competition robot on that vendor's electronics (sampled at every official event; 90% counts in full), up to 15 more for the year's orders; levels at 280, 580, 880 and 1,180. Each new level sends a pop-up in September with a choice of free parts at Kickoff, a voucher through the next season, or a sale until Kickoff. Measured with a one-vendor test team over ten seasons: three sponsorships (established and powerhouse), two to three for a rookie whose early robots carry kit parts.
  - **Banner wall and recap**: the wall already wrapped into rows; it now also shrinks its banners from 15 and from 31 banners, District Championship wins earn a banner, and the missing 2020 season recap is shown before the pandemic window.
- Final balance check (2026-11-11, ten careers of ten seasons each, played by the test bot): regional team, established: 2 of 10 careers ended by the school, 16 Championship trips, 8 event wins; powerhouse: 5 of 10, 24 trips, 15 wins; rookie: 3 of 10, 12 trips, 5 wins. The same established team without the simulated world (events filled the v2.5 way): 3 of 10, 10 trips, 4 wins. District team, established (Lakeshore): 2 of 10, 29 trips, 14 wins; powerhouse (Harbor): 3 of 10, 49 trips, 24 wins. District teams reach the Championship more often because points reward steady results; their goals at high reputation were raised (top ten, a district event win) so that the school is as demanding as it is with regional teams.
- World balance: an event's field is whoever the world scheduled there, so the level of the world is the difficulty of the game. `D.WORLD_STR` is the average it holds; `W.schedule` decides who enters which regional; `W.champsField` picks the player's division from the qualified teams.
- Background stories requested on 2026-11-10 are in `D.STORIES` (`js/data/eras.js`): add new ones there.
