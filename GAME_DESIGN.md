# FRC Manager — Game Design Plan (v0.1, for approval)

> Unofficial fan-made game. Not affiliated with or endorsed by *FIRST*®, Formula 1®, or Frontier Developments.
> Season names and point values reference the real 2022–2026 FRC games; every sponsor, regional, offseason event, and opponent team in the game is fictional or randomly generated.

> **Status of this document.** This is the original design plan (v0.1), kept as it was written before the game was built. The game is now at **v2.9** (the beta of 3.0, with ten seasons from 2016 to 2026) and has grown well beyond it: two robots, a parts inventory, testing hours, fatigue, feeder programs, the Championship FIRST Impact Award, offseason tech changes, workshop space and more. Where the plan and the game differ, the game is right. For the game as it is, read [README.md](README.md) (see "Differences from the design plan"), the in-game **How to play** guide and the **What's new** notes on the main menu.

---

## 1. The pitch

You are the **Lead Mentor (team manager)** of an FRC team. You don't drive the robot. You decide what to build, which parts and equipment to buy, which mentors to bring in, which sponsors to sign, and which regionals to attend. During matches you can give your drive team a few **Coach Calls**. Over five seasons you build a program that carries its know-how from one game to the next. A turret your team learned to build for a shooting game makes the next shooting game easier.

**Core loop (borrowed from F1 Manager 2024):**

```
 Offseason ──► Kickoff ──► Build Season ──► Competition Weeks 1–6 ──► Championship ──► Season Review ─┐
 (research,    (game       (weekly dev       (regionals: practice →    (if qualified:                   │
  sponsors,     reveal,     turns)            quals → alliance          division +                      │
  recruit)      concepts)                     selection → playoffs)     Einstein)                       │
     ▲                          ▲                    │                                                  │
     │                          └── keep developing between events ◄─┘                                  │
     └──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. What we take from F1 Manager 2024

| F1 Manager 2024 | FRC Manager equivalent |
|---|---|
| Team Principal | **Lead Mentor**: you |
| Two race drivers | **Drive Team**: Driver, Operator, Human Player, and a Coach (a student or mentor). They are students who improve, then graduate. |
| Staff (Technical Chief, Race Engineer, Head of Aero, Sporting Director) | **Mentors**: Design, Fabrication, Programming, Strategy & Scouting, Drive Coach, Business & Outreach |
| Facilities (wind tunnel, CFD, factory) | **Workshop equipment**: 3D printers, CNC router, machine shop, practice field, practice robot, battery fleet |
| Part design projects with a design focus | **Subsystem upgrade projects** with a *focus* and an *effort level* |
| Research for next year's car / regulation changes | **Tech Knowledge** that carries across seasons. Each new FRC game works like a regulation reset. |
| Cost cap | **125 lb weight limit**, plus a hard budget |
| Title + secondary sponsors, sponsor engagements and goals | **Title + Partner sponsor packs**, each with obligations (activities), performance goals, and perks |
| Board objectives & confidence | **Program Support** (school/organisation) and season goals |
| Marketability | **Team Reputation** |
| Mentality system | **Team Morale** |
| Affiliates (F2/F3 juniors) | **Feeder Programs**: you support junior robotics teams and get better recruits |
| Mechanical failures (new in 2024) | **Robot faults**: brownouts, jams, comms loss, tip-overs, failed climbs |
| Practice sessions → setup confidence | Practice matches → **Robot Tuning %** and **Driver Confidence %** |
| Qualifying + Race | Qualification matches → **Alliance Selection** → **Playoffs** |
| Race instructions (pace, ERS, pit) | **Coach Calls**: pace, role, target priority, endgame timing (a limited number per match) |
| Watch at speed / simulate session | Watch live (1×–8×) or simulate instantly |
| Part wear & condition | Subsystem condition, spare parts, pit repairs, batteries |
| Create a Team | Create your team: number, name, colours, home region, starting profile |

---

## 3. Platform & technical approach

- **Browser game**: HTML, CSS, and vanilla JavaScript, with Canvas 2D for fields and robots. There is no install and no build step: you double-click `index.html` and it works offline. Your PC has no Node or Python, so this avoids any setup.
- **All graphics are drawn in code** (shapes, Canvas, inline SVG icons) with no image files, which keeps the game lightweight.
- **Game data lives in plain data files** (scoring tables, costs, regionals, sponsors, mentors, parts), so numbers are easy to tweak.
- **Saves** go to browser storage (autosave + 3 slots). You can also export and import a save file (`.json`).
- **Target screen size** is 1280×720 or larger.

Planned folder layout:

```
FRC Manager 2026/
  index.html
  css/style.css
  js/
    core/      rng, state, save, utils, router
    data/      seasons (2022–2026), regionals, sponsors, mentors, parts, equipment, techtree, names
    sim/       match engine, season rules, AI teams, schedule, rankings, alliance selection, playoffs, awards, OPR
    systems/   calendar, development, knowledge, finance, sponsors, staff, events, offseason, career, challenge
    render/    field drawing (per season), robot drawing, charts
    ui/        screens + shared components
  GAME_DESIGN.md (this file)
```

---

## 4. Game modes

### 4.1 Career mode (5 seasons)
- **Season order**: *Real* (2022 → 2023 → 2024 → 2025 → 2026) or *Random* (each game once, shuffled). In Random mode the next game stays secret until Kickoff.
- **Start**: October before Season 1. A short 3-turn pre-season lets you sign sponsors, hire mentors, buy equipment, and register for regionals before the first game is revealed.
- **End**: after the Season 5 review you get a **Career Summary** with a legacy score, banner wall, and records.
- **Failure state**: if *Program Support* hits 0 at a season review, the school cuts the program and the career ends. A setting can turn this off ("No-fail mode").

### 4.2 Single Season Challenge
- Pick any season (2022–2026) and either a **preset scenario** or a **custom setup**. You start at Kickoff and register for events right after the reveal.
- The challenge ends after the Championship, or after your last event if you don't qualify. You get a **grade (S/A/B/C/D)** and a score.
- Preset scenarios:

| Scenario | Start | Goal |
|---|---|---|
| Rookie Year | Rookie team, $20k, no knowledge | Win Rookie All-Star *or* reach playoffs |
| Shoestring | Established team, $12k | Qualify for Championship |
| Dynasty | Powerhouse | Win Einstein (World Champion) |
| One Shot | Any profile, only 1 regional allowed | Win that regional |
| Comeback | Low morale, 2 mentors quit, $30k | Win a regional |
| Tech Debt | Strong budget, all knowledge at 0 | Average 2.5+ RP per qualification match |
| Custom | You set budget, students, mentors, knowledge | Free play, scored by legacy points |

### 4.3 Create your team
Fields: team number (choose, or random), team name, school/organisation, primary and secondary colour, **home region**, **starting profile**, and **difficulty**.

The home region is one of West, Southwest, Midwest, Northeast, Southeast, or Canada. It sets the travel-cost tier for every regional.

| Starting profile | Budget | Students | Mentors | Knowledge | Equipment | Expectations |
|---|---|---|---|---|---|---|
| Rookie | $25,000 | 15 | 2 (1★–2★) | all 0 | hand tools | Low (finish an event, learn). Eligible for rookie awards |
| Established | $45,000 | 25 | 4 (2★–3★) | 3 areas at Lv1–2 | + 3D printer | Medium (playoffs, an award) |
| Powerhouse | $90,000 | 40 | 7 (3★–4★) | 6 areas at Lv2–3 | + CNC, practice field, swerve modules | High (win regionals, Einstein) |

### 4.4 Difficulty
| | Easy | Normal | Hard |
|---|---|---|---|
| AI team strength | −10% | 0 | +10% |
| Robot fault rate | ×0.6 | ×1.0 | ×1.3 |
| Sponsor money | ×1.25 | ×1.0 | ×0.85 |
| Program Support losses | ×0.5 | ×1.0 | ×1.5 |

---

## 5. Calendar & turn structure

| Phase | Real-world time | Turns | What happens |
|---|---|---|---|
| Pre-season *(career start only)* | Oct–Dec | 3 monthly turns | Sponsors, mentors, equipment, regional registration |
| **Kickoff** | early Jan | 1 turn | Game reveal, *Game Brief*, choose subsystem concepts |
| **Build Season** | Jan–Feb | 7 weekly turns | Projects, purchases, sponsor activities, driver practice |
| Week 0 *(optional)* | late Feb | 1 weekly turn | Cheap scrimmage: practice matches only, no awards or quals |
| **Competition Weeks 1–6** | Mar–early Apr | 6 weekly turns | Your registered regionals. In other weeks you keep developing. |
| **Championship** | mid/late Apr | 1 event | Only if qualified |
| **Offseason** | May–Dec | 8 monthly turns | Offseason events, research, graduation, recruitment, sponsors, mentor market, next season's registration |

- A big **Continue** button advances one turn. **Inbox messages** (sponsor offers, project done, mentor requests, faults found) can stop the clock for a decision, as in F1 Manager.
- Turns where you have nothing to decide can be fast-forwarded.

---

## 6. The five seasons (game rules used by the simulation)

Point values follow the real games. Ranking-point thresholds are the regional-level values. The way the match plays out is abstracted (see §12).

### 6.1 2022 — RAPID REACT
- **Game piece**: Cargo (balls in alliance colours). A robot can hold 2.
- **Match**: Auto 15 s · Teleop 2:15 · Endgame = last 30 s.
- **Field sketch**: a central Hub with an upper and lower goal, Tarmacs around it, a Hangar with 4 rungs in each alliance corner, and Terminals with a human player.

| Action | Auto | Teleop |
|---|---|---|
| Taxi (leave tarmac) | 2 | — |
| Cargo, lower hub | 2 | 1 |
| Cargo, upper hub | 4 | 2 |
| Hangar: Low / Mid / High / Traversal | — | 4 / 6 / 10 / 15 |

- **Ranking points**: Win 2 · Tie 1 · **Cargo Bonus** at 20 cargo (18 if the alliance scores 5+ in auto, the "Quintet") · **Hangar Bonus** at 16 hangar points.
- **Key decisions**: shooter type (upper-hub accuracy & range), 2-ball storage, climb height (Traversal is the big ranking-point lever), auto 2–5 balls.

### 6.2 2023 — CHARGED UP
- **Game pieces**: Cones and Cubes. A robot holds 1.
- **Match**: Auto 15 s · Teleop 2:15 · Endgame = last 30 s.
- **Field sketch**: a Grid at each alliance wall (3 rows × 9 nodes), a Charge Station in front of each grid, and loading zones / double substations on the far side.

| Action | Auto | Teleop |
|---|---|---|
| Mobility | 3 | — |
| Game piece: Bottom / Mid / Top row | 3 / 4 / 6 | 2 / 3 / 5 |
| Link (3 adjacent scored nodes) | 5 | 5 |
| Charge Station: Docked / Engaged (auto, 1 robot) | 8 / 12 | — |
| Endgame: Park / Docked / Engaged | — | 2 / 6 / 10 |

- **Ranking points**: Win 2 · Tie 1 · **Sustainability** at 5 links (4 if both alliances earn Coopertition by scoring 3+ pieces in the co-op grid) · **Activation** at 26 charge-station points.
- **Key decisions**: arm vs elevator vs both, cone *and* cube handling, ground intake vs substation, auto-balance software. Tall robots risk tipping over.

### 6.3 2024 — CRESCENDO
- **Game piece**: Notes (foam rings). A robot holds 1.
- **Match**: Auto 15 s · Teleop 2:15 · Endgame = last 20 s.
- **Field sketch**: a Speaker and an Amp at each alliance end, a Source on the far side, and a Stage (triangle with 3 chains) in the middle.

| Action | Auto | Teleop |
|---|---|---|
| Leave | 2 | — |
| Amp | 2 | 1 |
| Speaker (normal / amplified) | 5 | 2 / 5 |
| Park / Onstage / Onstage + Spotlit | — | 1 / 3 / 4 |
| Harmony (2 robots, same chain) / Trap | — | +2 / 5 |

- **Amplification**: 2 Amp notes let your human player amplify the Speaker for 10 s (or until 4 notes are scored).
- **Ranking points**: Win 2 · Tie 1 · **Melody** at 18 notes (15 with Coopertition: each alliance puts 1 note in the amp co-op slot during the first 45 s of teleop) · **Ensemble** at 10 stage points with ≥2 robots onstage.
- **Key decisions**: under-bumper intake ("touch it, own it"), pivot vs turret shooter, amp & trap mechanism, chain climber, 4–6 note autos, shooting on the move.

### 6.4 2025 — REEFSCAPE
- **Game pieces**: Coral (PVC tubes) and Algae (balls).
- **Match**: Auto 15 s · Teleop 2:15 · Endgame = last 20 s.
- **Field sketch**: a hexagonal Reef for each alliance with 4 coral levels, coral stations in the corners, a Processor, and the Barge across the middle with Net and Cages.

| Action | Auto | Teleop |
|---|---|---|
| Leave | 3 | — |
| Coral L1 / L2 / L3 / L4 | 3 / 4 / 6 / 7 | 2 / 3 / 4 / 5 |
| Algae: Processor / Net | 6 / 4 | 6 / 4 |
| Barge: Park / Shallow cage / Deep cage | — | 2 / 6 / 12 |

- **Ranking points**: Win 3 · Tie 1 · **Auto RP** when all 3 robots leave and ≥1 coral is scored in auto · **Coral RP** at 5 coral on each of the 4 levels (only 3 levels needed if both alliances process ≥2 algae, the Coopertition rule) · **Barge RP** at 14 barge points.
- **Key decisions**: elevator reach to L4, ground coral intake, algae net shooter, deep-cage climber. Tall elevators under defense risk tipping.

### 6.5 2026 — REBUILT
- **Game piece**: Fuel (foam balls), scored into a Hub. Robots carry many at once in a hopper.
- **Match**: Auto 20 s · Teleop 2:20, split into a Transition (10 s, both hubs active), **4 alternating Shifts of 25 s** where only one alliance's hub is active, and an Endgame (last 30 s, both hubs active).
- **Hub shifts**: the alliance that scored more fuel in auto has its hub **inactive first**. Fuel in an inactive hub scores 0. During your inactive shifts you can collect and stockpile, feed fuel to your zone, or play defense.
- **Field sketch**: Alliance zones at each end with a Hub, a Tower, a Depot, and an Outpost (human player). The neutral zone in the middle is full of fuel. **Bumps** (drive over: slower) and **Trenches** (drive under: only low-profile robots fit) connect the zones.

| Action | Auto | Teleop |
|---|---|---|
| Fuel into *active* hub | 1 | 1 |
| Tower Level 1 | 15 | 10 |
| Tower Level 2 / Level 3 | — | 20 / 30 |
| Minor / Major foul (to opponent) | 5 / 15 | 5 / 15 |

- **Ranking points**: Win 3 · Tie 1 · **Energized** at 100 fuel · **Supercharged** at 360 fuel · **Traversal** at 50 tower points.
- **Key decisions**: low-profile vs standard height (trench vs bump routes), hopper capacity, turret with shoot-on-the-move, tower climb level, stockpiling strategy across hub shifts.

---

## 7. The robot

### 7.1 Robot stats (0–100)

| Stat | Used in the match for |
|---|---|
| Drive Speed | Travel time between zones |
| Agility | Escaping defense, traffic, fine alignment |
| Pushing Power | Defense strength and resisting defense (rises with weight & drivetrain) |
| Intake | Time to pick up pieces (ground vs station speed differs) |
| Scoring Speed | Time to aim and release / place |
| Accuracy | Chance each shot or placement succeeds |
| Reach / Range | *Which* targets you can score (L4, top row, shooting distance) |
| Storage | Pieces carried (season-specific: 1, 2, or up to ~45 fuel) |
| Endgame | Climb or balance level you can reach, its speed, and its success chance |
| Autonomous | Pieces and points scored in auto, and the auto success rate |
| Vision & Assist | Auto-aim, shoot-on-the-move, less dependence on driver skill |
| Reliability | Base fault chance |

Plus **Weight (lb)** and, in 2026, a **Height class** (standard / low-profile).

### 7.2 Subsystems
Every season's robot is made of subsystems. Each subsystem has:
- **Concept** (your *development direction*), which sets its stat ceilings, capabilities, weight, and complexity (1–5).
- **Version** (v0 = not built → v1 → v2 → …). A subsystem at v0 does nothing in matches.
- **Stats**, **condition %**, and any **hidden faults**.

Subsystems: **Drivetrain · Intake · Scorer(s) · Endgame · Software (Auto + Vision) · Electrical**. Storage is part of the intake or scorer in most seasons; in 2026 it is its own hopper choice.

### 7.3 Concepts (development directions)

**Drivetrain (all seasons)**

| Concept | Speed cap | Agility cap | Push cap | Extra cost | Complexity | Weight | Knowledge used |
|---|---|---|---|---|---|---|---|
| Kitbot Tank | 60 | 40 | 60 | $0 | 1 | 30 lb | — |
| West Coast Drive | 80 | 50 | 85 | $1,200 | 2 | 34 lb | Electrical |
| Mecanum | 70 | 80 | 35 | $900 | 2 | 30 lb | — |
| Swerve | 95 | 95 | 75 | swerve modules (store) | 4 | 32 lb | Swerve, Electrical, Autonomous |

In 2026 you also pick a **Profile**: *Standard* or *Low-profile*. Low-profile robots fit under the Trench (about 20% faster crossings, no bump risk), but get about 40% less hopper capacity and −5 range.

**Season-specific concepts** (ceilings shown for the key stats; full numbers live in the data files):

| Season | Subsystem | Concepts (simple → advanced) |
|---|---|---|
| 2022 | Intake | Terminal-only (human player feed) · Over-bumper ground intake · Dual-side ground intake |
| | Storage | 1-ball · 2-ball indexer |
| | Shooter | Low-goal dumper (lower hub only) · Fixed fender shooter (upper hub from the fender) · Adjustable hood (upper hub from the tarmac line) · **Turret + hood** (anywhere, shoot on the move with vision) |
| | Climber | None · Mid rung · High rung · Traversal |
| | Auto | Taxi · 2-ball · 3-ball · 5-ball |
| 2023 | Intake | Substation-only · Ground cube · Ground cone + cube |
| | Manipulator | Hybrid-only (bottom row) · Single-jointed arm (mid + top cubes) · Elevator (all rows) · Elevator + wrist (all rows, fast) · Double-jointed arm (fastest, highest tip risk) |
| | Endgame | No mechanism. Balance quality comes from the drivetrain plus an *Auto-balance* software project |
| | Auto | Mobility · 1 piece + engage · 2-piece · 3-piece |
| 2024 | Intake | Source-only · Over-bumper · **Under-bumper** (fastest) |
| | Shooter | Subwoofer fixed · Pivot shooter · **Turret shooter** |
| | Amp / Trap | None · Amp bar · Amp + Trap elevator |
| | Climber | None (park) · Chain climber (Harmony possible) · Climber + Trap (needs Amp + Trap) |
| | Auto | Leave · 2-note · 4-note · 6-note centerline |
| 2025 | Coral intake | Station-only · Ground coral intake |
| | Manipulator | Trough (L1) · Arm (L1–L3) · **Elevator (L1–L4)** · Elevator + wrist (L1–L4, fast, removes algae) |
| | Algae | None · Dislodger + processor · Net shooter |
| | Climber | None (park) · Shallow cage · Deep cage |
| | Auto | Leave · 1-coral · 3-coral · 4-coral |
| 2026 | Intake | Outpost/Depot-only · Ground intake · Wide full-width ground intake |
| | Hopper | Small (10) · Medium (25) · Large (45) |
| | Shooter | Fixed (near the hub) · Adjustable hood (anywhere in your zone) · **Turret** (shoot on the move with vision) |
| | Climber | None · Level 1 · Level 2 · Level 3 |
| | Auto | Leave · Preload + depot · Neutral-zone sweep · Sweep + auto Level 1 climb |

Each concept card in the game shows: cost, build hours, weight, complexity, stat ceilings, what it unlocks, and **how much your current Tech Knowledge helps it** (see §7.7).

### 7.4 Development projects (design office)

| Project type | What it does |
|---|---|
| **Build v1** | Makes a subsystem functional (v0 → v1) |
| **Upgrade** | Raises stats toward the concept's ceiling. You pick a **focus**, e.g. Shooter: *Accuracy / Rate / Range*; Drivetrain: *Speed / Agility / Pushing*; Climber: *Speed / Level / Reliability* |
| **Hardening** | +Reliability, removes hidden faults, raises max condition |
| **Lightweighting** | −Weight (2–6 lb), small reliability risk |
| **Software: Auto routine** | Moves the auto tier up one step (e.g., 2-ball → 3-ball) |
| **Software: Vision / Assist** | Auto-aim, auto-align, shoot-on-the-move (needs a camera from the parts store) |
| **Spare parts batch** | Adds spares for pit repairs |
| **Concept change** | Switch direction mid-season. You restart at v0, but 25% of the hours you spent become knowledge XP |
| **Practice robot** | A second robot (~50% of your robot's development cost). Drivers can practice while the competition robot is being upgraded, and it supplies spares |

**Project parameters**
- **Effort**: *Rush* (60% hours, 0.75× gain, −3 reliability, chance of a hidden fault) · *Standard* · *Thorough* (140% hours, 1.2× gain, +2 reliability).
- **Priority**: High / Normal / Low. This decides how weekly build hours are shared between active projects.
- **Max active projects** = 2 + 1 per Design or Fabrication mentor (cap 6). These are your "sub-teams".

**Weekly build hours**
```
Hours = (Students × 5 h × PhaseMult + Σ Mentor hours) × MoraleMult × EquipmentMult
PhaseMult:     Build season 1.0 (Overtime week 1.3) · Competition week with an event 0.3 ·
               Competition week, no event 0.8 · Summer 0.4 · Fall 0.6
MoraleMult:    0.80 – 1.10
EquipmentMult: 1.00 – ~1.35 (3D printers, CNC, laptops…)
```
A typical Established team gets about 25 × 5 + 40 = **~165 h/week** in build season. An upgrade costs 60–250 h and $300–$3,000.

**Upgrade result (diminishing returns + randomness)**
```
Ceiling   = ConceptCeiling + 3 × KnowledgeLevel + PartsTierBonus
Fraction  = 0.25 × EffortMult × (0.6 + 0.4 × DesignMentorSkill/100) × (1 + 0.05 × KnowledgeLevel) × Random(0.85–1.15)
NewStat   = Stat + (Ceiling − Stat) × Fraction
```
The closer you are to the ceiling, the smaller each upgrade gets, just like late-season F1 parts.

**Installing**: finished upgrades install right away at home. At an event they install in the pits, which uses a practice block or a long turnaround. A non-Thorough upgrade installed at an event adds a small hidden-fault risk.

### 7.5 Weight & inspection
- The limit is **125 lb** (excluding bumpers and battery). Each concept and upgrade adds or removes weight.
- At an overweight event you **fail inspection**. You must spend practice blocks on emergency lightening, and you take −5% on a subsystem's stats for that event until a proper Lightweighting project is done.
- Heavier robots get +Pushing Power and −acceleration. Tall and heavy robots (2023 arms, 2025 elevators) have a tip-over risk under defense.

### 7.6 Parts store (COTS purchases)
Parts are **owned and carried into the next season**. Swerve modules bought in 2022 still help in 2026.

| Category | Tiers & price | Effect |
|---|---|---|
| Motors | Brushed (included) · Brushless Gen 1 $900 · Brushless Gen 2 $2,000 | Raises speed and scoring-speed ceilings, lowers brownout risk |
| Swerve modules | Basic $2,400 · Premium $3,600 | Required for the Swerve concept. Premium adds +speed and +reliability |
| Sensors & control | Basic (included) · Upgraded encoders + gyro $600 | +Autonomous, +Reliability |
| Vision | None · Camera $400 · Dual camera + coprocessor $1,200 | Unlocks the Vision/Assist software projects |
| Pneumatics kit | $500 | Some intake and claw concepts build 20% faster |
| Batteries | $150 each (start with 4) | More batteries = fully charged batteries more often |
| Spare parts kits | $200–$600 per subsystem | Used by pit repairs |

### 7.7 Tech Knowledge — the carry-over system
This is how your robot's history shapes your future seasons. **11 knowledge areas**, each at Level 0–5:

| Knowledge area | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|:-:|:-:|:-:|:-:|:-:|
| Swerve Drive | ★★ | ★★ | ★★ | ★★ | ★★★ |
| Flywheel Shooters | ★★★ | – | ★★★ | ★ (algae net) | ★★★ |
| Turrets & Auto-Aim | ★★★ | – | ★★ | – | ★★★ |
| Elevators | – | ★★ | ★ (amp/trap) | ★★★ | – |
| Arms & Wrists | ★ | ★★★ | ★★ (pivot) | ★★ | – |
| Ground Intakes | ★★ | ★★ | ★★★ | ★★ | ★★★ |
| Indexers & Hoppers | ★★ | – | ★ | – | ★★★ |
| Climbers | ★★★ | – | ★★ | ★★ | ★★ |
| Vision & Localization | ★★ | ★★ | ★★★ | ★★ | ★★★ |
| Autonomous Pathing | ★★ | ★★★ | ★★★ | ★★★ | ★★ |
| Electrical & Reliability | ★★ | ★★ | ★★ | ★★ | ★★ |

**What each level gives** (for every concept that uses that area):
- +3 to the concept's stat ceilings
- −6% build hours on its projects
- +4 starting reliability
- +5% upgrade quality

**First-time penalty**: a concept with complexity ≥3 and Level 0 in its main area gets −15 reliability, +30% hours, and twice the hidden-fault chance.

**Gaining XP** (Level thresholds: 100 / 250 / 450 / 700 / 1000):
- Each completed project in a concept: +30 XP to its areas (scaled by effort)
- Each match played with a working concept: +2 XP
- Offseason research projects: +100 to +250 XP
- Testing a prototype at an offseason event: +50 XP
- A mentor with that area as their **specialty**: ×1.5 XP

**Decay**: at each season rollover, areas you didn't use lose 20% of their XP (the students who knew it graduated). A mentor with that specialty prevents decay. The *Knowledge Base* workshop project (team wiki + CAD library) halves decay.

**Example**: In 2022 you build a Turret + hood and play 30 matches. Turrets & Auto-Aim reaches Level 2. When 2024 or 2026 arrives, your turret concept starts with +6 ceilings, 12% fewer hours, and +8 reliability. A rival at Level 0 pays the first-time penalty.

### 7.8 Condition, wear, repairs & batteries
- Each subsystem has **condition 0–100%**. Every match wears it down by 3–6 points, multiplied by your pace, the defense you receive, and collisions.
  - Below 50%, fault chance climbs. Below 20%, it is severe.
- **Pit repairs** happen between matches. The repair amount depends on turnaround time, your pit crew (Fabrication mentor + students), and the *Pit Cart* equipment, and each point repaired uses spare parts. Without spares, repairs cap at 60%.
- **Back home**, a full repair costs parts money.
- **Batteries**: each loses 2% health per match. Back-to-back matches with a small fleet mean partly charged batteries. A weak battery doubles brownout chance.

### 7.9 Faults (the F1 Manager 2024 "mechanical failures" equivalent)
| Fault | Effect |
|---|---|
| Brownout | Robot stalls 2–5 s |
| Intake jam | No intake for 5–20 s |
| Scorer jam | No scoring for 5–20 s |
| Mechanism failure | That subsystem is dead for the rest of the match |
| Comms loss | Disabled for 5 s, or (rare) the rest of the match |
| Tip-over | Out for the match (tall robots, heavy defense) |
| Climb failure | No endgame points |

```
Fault hazard per second = Base × (1 + (100 − Reliability)/25) × (1 + (100 − Condition)/40) × PaceMult × BatteryMult × Difficulty
```
Target: a reliable robot sees a fault in about 1 of 25 matches; a rushed robot in about 1 of 4.

**Hidden faults** come from Rush projects and first-time concepts. The *Systems Shakedown* practice program can find them before they strike. AI robots fault too.

### 7.10 How the robot looks
Robots are drawn in simple flat 2D and **change with your development**:
- **Top-down (match view)**: bumpers in red or blue with the team number.
  - Swerve shows 4 corner modules that rotate; tank shows side wheels; mecanum shows diagonal rollers.
  - The intake is a front bar whose width depends on the concept.
  - A turret is a circle whose barrel tracks the target. A hood or pivot shooter is a block with an angle marker.
  - An elevator or arm extends when scoring. Climber hooks sit at the back. In 2026 the hopper shows its fill level.
- **Side profile (Garage screen)**: shows height, elevator stages, arm joints, shooter angle, climber, and wheels.
- **Version cosmetics**: v1 is raw aluminium grey, v2 adds your team colour, and v3+ adds polish and LED strips (green when holding a piece).
- **AI robots** use the same renderer with their own archetypes, so every field looks varied.

---

## 8. People

### 8.1 Students & drive team
- **Team size** (10–60 students) drives your build hours.
- **Core students** are up to 12 named students. Each has a grade (9–12), a hidden **Potential**, and these attributes (0–100):
  - Driving, Awareness, Composure, Mechanism Control, Human Player skill, Strategy
- **Drive team per event**: Driver (Driving, Awareness, Composure), Operator (Mechanism Control, Composure), Human Player (HP skill), and Coach (Strategy, or a Drive Coach mentor).
- **Growth**: students gain XP from matches (practice ×1, quals ×2, playoffs ×3, Championship ×1.5 bonus), offseason events, and weekly *Driver Practice* (needs practice field elements). Gains scale with Potential.
- **Graduation (June)**: seniors leave. A great driver leaves after senior year, so train the next one at offseason events.
- **Recruitment (September)**: new students = 6 + Reputation/10 + outreach bonus + feeder bonus ± random.
- **Feeder programs** (F1M24 Affiliates equivalent): fund up to 3 junior teams at $1,000/year each. Each gives +1 recruit/year, higher recruit potential, and +Impact score.

### 8.2 Mentors (hiring)
| Role | Affects | Hours/week |
|---|---|---|
| Design Mentor | Upgrade quality, +1 project slot, specialty knowledge | 8–15 |
| Fabrication Mentor | −hours on projects, +reliability, faster pit repairs, +1 project slot | 8–15 |
| Programming Mentor | Software projects, Auto, Vision, Innovation in Control award | 8–15 |
| Strategy & Scouting Mentor | Scouting accuracy, alliance pick advice, partners accept your plan more often | 4–8 |
| Drive Coach | Driver growth, +Composure, +1/+2 Coach Calls per match | 4–8 |
| Business & Outreach Mentor | +1 sponsor slot, +10% sponsor money, Impact Award chance, fundraising | 4–8 |

- **Rating 1★–5★**, two sub-attributes, and (for Design/Fabrication/Programming) a **specialty knowledge area**.
- **Cost per season** (recruiting, travel & training expenses): 1★ $0 (volunteer) · 2★ $1,000 · 3★ $2,500 · 4★ $5,000 · 5★ $9,000.
- **Market**: 6–10 candidates refresh every offseason month and at Kickoff. Contracts run 1–3 seasons. Mentors may leave if morale is low or results disappoint (mentality). Max 8 mentors.

### 8.3 Team morale (mentality)
Morale (0–100) rises with wins, awards, new equipment, and reasonable workload. It falls with overtime weeks, losses, budget cuts, too many sponsor activities, and firing mentors.

It affects build hours (×0.8–1.1), student growth, recruitment, mentor retention, and slightly the fault chance (carelessness).

---

## 9. Workshop & equipment

| Item | Cost | Upkeep / season | Effect |
|---|---|---|---|
| Hand tools & drill press | start | — | Baseline |
| 3D Printer → Print Farm | $800 → $3,000 | $200 | −8% / −15% project hours, faster prototypes |
| CNC Router | $7,500 | $500 | +10% upgrade gain, +5 reliability, −15% fabrication hours |
| Lathe & Mill | $5,000 | $300 | Spare parts −30% cost, +3 reliability |
| Practice Field Elements | $2,500 *each season* (new game = new elements) | — | Weekly Driver Practice, +20% starting Tuning at events, auto validation |
| Programming laptops + sim software | $1,500 | $200 | −20% software project hours |
| Battery charger cart | $400 | — | Batteries charge faster between matches |
| Pit cart & tool kit | $800 | — | +25% pit repair speed |
| Team trailer | $12,000 | $800 | −30% travel cost to drive-distance events |
| Knowledge Base (project, 60 h) | $0 | — | Halves knowledge decay |

Equipment persists across seasons, except practice field elements.

---

## 10. Finance & sponsors

### 10.1 Income
| Source | Typical amount | Notes |
|---|---|---|
| School / organisation funding | $8k–$25k per season | Scales with Program Support |
| Title sponsor | $10k–$30k | 1 slot |
| Partner sponsors | $1k–$10k each | 4 slots (+1 with a Business mentor) |
| Sponsor goal bonuses | $500–$5k | Paid when goals are met |
| Grants | $2k–$5k one-time | Usually require outreach |
| Fundraising activities | $500–$3k | Cost team hours |

### 10.2 Expenses (game values, simplified)
| Expense | Amount |
|---|---|
| First regional registration | $6,000 |
| Each additional regional | $4,000 |
| Late registration (after Kickoff) | +$1,000 |
| Championship registration | $5,000 |
| Week 0 scrimmage | $500 |
| Offseason event | $500–$1,500 |
| Travel per event | Local $800 · Drive $3,500 · Fly $9,000 (Championship is Fly unless your home region is close) |
| Development projects | $300–$3,000 each |
| Parts & equipment | see §7.6 and §9 |
| Mentor costs | see §8.2 |
| Shop operations | $2,000 / season |

- You can't start a purchase or project you can't afford. Registration needs the full fee up front.
- Debt can only happen through sponsor clawbacks or penalties. Ending a season in debt hurts Program Support badly.

### 10.3 Sponsor packs (F1 Manager 2024 style)
Offers arrive in the offseason, plus occasional mid-season offers. Each **sponsor pack card** shows:
- **Name & type** (fictional companies)
- **Base payment** per season and **contract length** (1–3 seasons)
- **Performance goals** with bonuses, e.g. "Reach playoffs at 2 events: +$2,000", "Qualify for Championship: +$5,000", "Win any technical award: +$1,000"
- **Obligations (activities)** that cost time or people, e.g. "2 robot demos during build season (−30 h each)", "Your driver attends the company STEM day"
- **Perks**, e.g. "−15% parts cost", "Free CNC machining: +10% fabrication speed", "Engineering volunteers: +1 temporary 3★ mentor", "−25% travel cost", "+10% knowledge XP"
- **Expectation level** (Low / Medium / High)

| Sponsor type | Money | Typical goals | Typical obligations | Typical perk |
|---|---|---|---|---|
| Tech corporation | High | Championship, wins | Demos, logo events | Big bonuses |
| Local business | Low–Med | Attend events, outreach | Community day | Low expectations |
| Engineering firm | Med | Technical awards | Mentor nights | Temporary mentor |
| Manufacturing company | Med | Reliability, quality award | Shop tour | Machining perks, parts discount |
| University | Low | Outreach, Impact | Workshops | Knowledge XP bonus |
| Software company | Med | Autonomous / Control awards | Hackathon | Programming hours |
| Foundation grant | One-time | Outreach count | Report | — |

- **Activities** go on your calendar. For each one you choose who attends:
  - a Core Student (they miss practice: −Driver Confidence at the next event)
  - the robot (−10% condition)
  - team hours
  
  Skipping an activity costs −15 satisfaction.
- **Satisfaction** (0–100) sets the renewal chance. Below 20 mid-season, the sponsor may pull out and claw back part of the money.
- **Offer quality** depends on **Reputation** and recent results.

### 10.4 Program Support & season goals (board confidence)
- Each season the Program Director sets **3 goals** (Minimum / Target / Stretch) based on your profile and history, for example "Finish a regional", "Reach playoffs twice", "Win an award", "Qualify for Championship". There is also an implicit rule: **finish the season at ≥ $0**.
- At the season review: +15 Support per goal met, −10 per goal missed, −20 if in debt.
- Next season's school funding = Base × (0.6 + 0.8 × Support/100).
- Support at 0 ends the career (unless No-fail mode is on).

### 10.5 Reputation (0–100)
Reputation rises with wins, awards, Championship appearances, and outreach, and falls with poor results and unhappy sponsors. It improves sponsor offers and recruitment.

---

## 11. Competition — the regional model

### 11.1 Regional catalogue
- Each season has **30 regionals** (5 per week, Weeks 1–6) with fictional names. Each has a region, team count (36–64), strength rating (★1–5), and a travel tier from your home (Local / Drive / Fly).
- The ~600 AI teams each attend 1–3 regionals.

### 11.2 Choosing your schedule
- Register for **1–4 regionals** (max one per week), plus an optional **Week 0 scrimmage**.
- **Career**: registration opens in October, *before* the next game is known. After Kickoff you can add events that still have spots, for +$1,000 each.
- **Single Season**: registration happens right after Kickoff.

**Trade-offs**

| | Early events (Weeks 1–2) | Late events (Weeks 5–6) |
|---|---|---|
| Your robot | Less build time, less polished | More developed |
| Competition | AI teams weaker (×0.85) | AI teams stronger (×1.0) |
| Time left after | Lots of time to improve before Championship | Little time to recover |
| Championship spot | Win early and relax | Last chance, high pressure |

- **More events** means more chances to qualify, more student XP, and more sponsor exposure. It also costs more money, fewer build hours (event weeks run at ×0.3 hours), and more wear.
- **Back-to-back weeks**: −5 morale, and the robot gets no home repair in between (pit repairs only).

### 11.3 Event weekend flow (the F1 "race weekend")
**Day 1: Load-in & Practice**
1. **Inspection**: weight and bumper check (§7.5).
2. **3 practice blocks**. For each one, pick a **practice program**:
   - *Driver Reps*: +Driver Confidence % (faster, cleaner cycles)
   - *Mechanism Calibration*: +Robot Tuning % (accuracy)
   - *Auto Validation*: +auto success rate
   - *Systems Shakedown*: finds hidden faults and lowers the fault chance at this event
   - *Scouting Focus*: sharper scouting data on other teams
   - *Install Upgrade*: installs a package finished during the event week

   Tuning and Confidence partly carry over from your previous event and from practice field time.

**Days 2–3: Qualification matches**
- Each team plays about 10–12 matches with randomly assigned partners.
- Before each of your matches you see a **pre-match screen**: partners, opponents, scouting data, your strategy plan, and partner suggestions (§12.7).
- You then **Watch** or **Simulate** the match. Between matches, pit repairs happen automatically based on turnaround time. All other matches simulate in the background and rankings update live.

**Alliance Selection**
- The top 8 seeds are captains. Picks go in serpentine order (Round 1: seed 1→8, Round 2: seed 8→1), 3 robots per alliance.
- **If you are a captain**, you pick from a scouting board you can sort by OPR, estimated stats, and tags like "Turret", "L4", "Deep climb". Your Strategy mentor gives a recommended pick list.
- **If you are invited**, you accept or decline. As in FRC, a team that declines can't be picked later but can still become a captain.
- **AI captains** pick using their own (noisy) scouting, with a preference for complementing their robot.

**Playoffs**
- 8-alliance **double elimination**, with best-of-3 Finals.
- Each alliance has **1 timeout**, which gives extra repair time.

**Awards ceremony** (§11.6), then a **post-event summary**: results, sponsor bonuses, XP, pool points, and Championship qualification status.

### 11.4 Rankings
Teams are ranked by Ranking Score (average RP per match). Tiebreakers: average match points, then average auto points, then random.

### 11.5 Scouting & OPR
- Other teams' true stats are hidden. Scouting shows estimates with error bars, which shrink with your Strategy mentor, Scouting Focus practice, and matches observed.
- **OPR** (offensive power rating) is calculated live from the event's real simulated match results, the same way FRC scouts do it.

### 11.6 Awards
| Award | Decided by | Championship spot? |
|---|---|---|
| Impact Award | Impact score (outreach, feeder programs, sponsor activities, Impact submission project) | **Yes** |
| Engineering Inspiration | Impact score + design quality | **Yes** |
| Rookie All-Star | Rookie teams only: Impact + robot | **Yes** |
| Excellence in Engineering | Overall robot stats | No |
| Industrial Design | Design quality, weight margin, versions | No |
| Innovation in Control | Software, Vision & Assist | No |
| Quality | Reliability, few faults | No |
| Creativity | Rare or first-time concepts used well | No |
| Autonomous Award | Best average auto points | No |
| Gracious Professionalism / Team Spirit / Judges' | Morale, outreach, random | No |

Awards add Reputation and Program Support, and can trigger sponsor bonuses.

### 11.7 Championship qualification (simplified)
You qualify for Championship if any of these is true:
1. You are on a **regional-winning alliance** (captain, 1st pick, or 2nd pick).
2. You win a **regional Impact Award** or **Engineering Inspiration Award**.
3. You win **Rookie All-Star** (rookie season only).
4. **Regional Pool wildcard**: each event awards pool points, similar to district points:
   - qualification rank: 2–22
   - alliance captain or pick: up to 16
   - playoff advancement: up to 30
   - awards: 5–10

   Your best two events count. After Week 6, the top teams in the pool that haven't already qualified get the remaining spots.
5. **Career only**: last season's World Champions and Einstein finalists qualify automatically.

### 11.8 Championship
- You play one **division** of about 68 strong teams: 10 qualification matches, alliance selection, and division playoffs.
- **Einstein**: the 8 division-winning alliances play a double-elimination bracket with best-of-3 Finals. Win it and you are **World Champion**.
- Other divisions are simulated in the background.

---

## 12. Match simulation

### 12.1 Engine
- One headless engine runs **every** match: the ones you watch, the ones you simulate, and all AI-vs-AI matches. It runs at 10 ticks per second of match time with 6 robot agents.
- **Seeded randomness** keeps results reproducible and makes saves consistent.
- Running about 100 matches per event takes well under a second in a browser.

### 12.2 Robot agent behaviour
Each robot follows a state machine:
```
AUTO_ROUTINE → [ GO_COLLECT → COLLECT → GO_SCORE → AIM → SCORE ]* → GO_ENDGAME → CLIMB/BALANCE/PARK
                 ↘ DEFEND(target) / FEED (2024, 2026) / STOCKPILE (2026 inactive shifts)
Any state → FAULT (temporary or permanent)
```
- The **field** is a graph of zones (loading, scoring, endgame, obstacles) with travel distances. Robots move along straight paths between zone points, with obstacle costs:
  - 2026: bump vs trench
  - 2024: stage legs
  - 2025: reef and barge
- **Game pieces are counted, not physically simulated**. Scoring structures show what has been scored (reef levels filled, grid nodes, hub counter).

### 12.3 Core formulas
```
DriverFactor  = 0.75 + 0.25 × DriverSkill/100 + 0.10 × DriverConfidence%
Travel time   = Distance / (Vmax × (0.5 + 0.5 × Speed/100)) × TrafficMult × DefenseMult
Collect time  = BaseCollect[season][source] × (1.6 − 0.9 × Intake/100)
Score time    = BaseScore[target] × (1.5 − 0.8 × ScoringSpeed/100)       (turret + vision ≈ no aim time)
Hit chance    = clamp(Accuracy/100 × (0.85 + 0.15 × Tuning%) − RangePenalty − 0.15 × DefensePressure, 0.20, 0.99)
DefenseMult   = clamp(1 + 0.6 × (DefenderPush − 0.5 × TargetAgility − 0.3 × TargetPush)/100, 1.0, 1.8)
Foul chance   = per contact, × pace, × defense role, × (1 − Composure/200)
Climb chance  = f(Endgame stat, Condition, Composure, Pressure); climb time = BaseClimb[level] × (1.6 − Endgame/100)
```
Defenders also risk fouls and take more wear.

### 12.4 Season-specific rules engine
| Season | Special logic |
|---|---|
| 2022 | Quintet threshold, upper vs lower hub, sequential rung climbing (Traversal takes longest) |
| 2023 | Node grid with links, cone vs cube placement, co-op grid, multi-robot charge-station balancing (more robots = harder to engage) |
| 2024 | Amp charging → amplification windows (human player), Coopertition, Harmony, Trap, chain occupancy |
| 2025 | Coral levels fill per side (Coral RP tracking), algae removal unlocks coral slots, processor vs net, Coopertition |
| 2026 | Hub shift timeline (auto winner goes inactive first), stockpiling in hoppers, bump vs trench routing, tower levels |

### 12.5 Coach Calls (limited in-match instructions)
You get **3 Coach Calls per match**:
- +1 with a 3★ Drive Coach, +1 more with a 5★ Drive Coach
- +1 in playoffs

A call takes effect after a short delay (1–3 s, shorter with a better Coach). Drivers with low Composure sometimes execute it badly.

| Call | Options | Effect |
|---|---|---|
| **Pace** | Push / Balanced / Conserve | Push: +10% speed, −8% cycle time, −6% accuracy, ×1.8 fouls, ×1.6 wear, ×2 brownouts. Conserve: the opposite, milder. |
| **Role** | Score / Defend *[pick a robot]* / Feed / Stockpile | Switches the robot's job |
| **Target priority** | Season-specific: 2022 Upper / Lower hub · 2023 Top row / Complete links / Fast low cycles · 2024 Speaker / Amp (enable amplify) · 2025 L4 / L2–L3 / L1 / Algae net / Processor (co-op) · 2026 Shoot now / Hold for active shift | Changes what it scores |
| **Endgame timing** | Go now / Standard / Last-second, and target level | Earlier is safer but loses cycles |
| **RP Hunt** | Bonus-RP focus / Win focus | Shifts priorities toward thresholds |
| **Avoid Contact** | On / Off | Fewer fouls and less damage, slower cycles |
| **Reset!** | Use after a jam or brownout | 50% chance to recover sooner |

### 12.6 Watching a match
- **Center**: the 2D field, with a top bar showing the score, timer, and phase (AUTO / TELEOP / ENDGAME, plus the 2026 hub-shift indicator).
- **Left**: your robot's task, pieces held, subsystem condition bars, battery, and pace, plus partner cards.
- **Right**: live ranking-point progress bars (e.g., coral levels, melody notes, fuel toward 100/360) and an event log ("4321 scored L4", "Brownout on 2468!").
- **Bottom**: Coach Call buttons with remaining count, and speed controls (Pause · 1× · 2× · 4× · 8× · Skip to result).

### 12.7 Pre-match plan (free, before every match)
- Set your own role, target priority, endgame plan, and starting pace.
- **Suggest partner roles**. A partner accepts with 40% + 10% per Strategy mentor star + Reputation/5 %.
- Pick the battery. In playoffs, choose whether to use your **timeout**.

### 12.8 Simulate & results
- **Simulate** resolves the match instantly and shows the result screen with key moments.
- **Result screen**: score breakdown (auto / teleop / endgame / fouls), RP earned, your robot's cycles, accuracy and faults, condition changes, and XP.

### 12.9 Balance targets (checked with automated test runs)
- Average and elite alliance scores roughly match the real era's feel at regional level.
- Bonus RPs are rare for average alliances and common for elite ones.
- Fault rates match §7.9.
- An Established team can stay at ≥ $0 attending 2 regionals.

---

## 13. AI teams
- **Persistent pool of ~600 teams** for the whole career:
  - random unique numbers (never yours) and generated names
  - a home region and a **Program Strength** (10–95)
  - a trajectory: rising, stable, or declining
  
  New rookie teams join each year and some teams fold.
- **Each season**, every AI team chooses an archetype based on its strength and the game. Stats = archetype template × strength + noise, plus reliability and driver skill.
  - Example archetypes for 2026: Turret Shooter, Fixed Shooter, Low-profile Feeder, Climber Specialist, Kitbot.
- AI teams **improve during the season**: about ×0.85 in Week 1, ×1.0 in Week 6, ×1.08 at Championship. Teams attending more events improve faster.
- **AI match strategy**: role by capability (weak scorers defend or feed), and they chase bonus RPs when close. AI captains use their own noisy scouting for alliance selection.
- Powerhouse AI teams stay strong across seasons, so you'll meet familiar rivals.

---

## 14. Offseason (May–December, monthly turns)

| Month | Fixed events | Typical choices |
|---|---|---|
| May | Season review, mentor contract decisions | Feeder programs, equipment |
| June | **Graduation** (seniors leave), summer starts (hours ×0.4) | Summer offseason event, research |
| July | — | Offseason event, research, outreach camp |
| August | Mentor market refresh | Hire mentors |
| September | **Recruitment** (new students), school starts (hours ×0.6) | Fall offseason event, training |
| October | **Sponsor offers & renewals**, **regional registration opens** | Sign sponsors, register events |
| November | Drive team **tryouts** | Fall event, research |
| December | Final prep | Equipment, last research → **Kickoff** |

Activities available each month:
- **Offseason events** (fictional, $500–$1,500, one day: 6 quals, alliance selection, playoffs). You play last season's game with last season's robot. Benefits:
  - double XP for younger drivers
  - Reputation, recruits, and sponsor satisfaction
  - prototype testing, which gives knowledge XP
  
  You can choose a "Rookie Drive Team" to train next year's drivers: lower performance, more growth.
- **Pre-season research projects** ($800–$3,000, 150–400 h, +100–250 XP): Swerve Prototype, Turret Prototype, Shooter R&D, Elevator Prototype, Arm & Wrist R&D, Ground Intake R&D, Hopper/Indexer R&D, Climber R&D, Vision Localization, Path-planning Library, Electrical Standards.
- **Outreach**: demos, STEM camps, mentoring junior teams. Gives Impact score, Reputation, and recruits.
- **Fundraising**: car wash, bake sale, crowdfunding. Trades hours for money.
- **Training**: Driver training (needs an old robot), CAD workshop (+upgrade quality), fabrication workshop (+hours).

---

## 15. Season review & career end
- **Season review** covers:
  - results per event, awards, and Championship result
  - finances
  - goal evaluation, with Program Support and Reputation changes
  - knowledge level changes and graduates
  - the **Banner Wall** (event wins, awards)
- **Career summary** after Season 5: legacy score and a final title, e.g. "Rising Program", "Regional Powerhouse", "Hall of Fame Program".

| Achievement | Legacy points |
|---|---|
| Regional win | 100 |
| Championship qualification | 50 |
| Division win | 150 |
| World Champion | 400 |
| Impact Award | 120 |
| Engineering Inspiration | 80 |
| Other awards | 30 |
| Seasons ending ≥ $0 | 20 each |

---

## 16. Screens

1. **Main Menu**: New Career · Single Season Challenge · Continue · Load · Settings · How to Play
2. **Create Team** / **Choose Scenario**
3. **HQ Dashboard**: date and phase, next event countdown, budget, morale, alerts, robot summary, big **Continue** button
4. **Inbox**: decisions and news
5. **Garage**: robot drawing (top + side), stats radar/bars, subsystems with version, condition, and weight
6. **Design Office**: concepts, project queue and hours, parts store
7. **Tech Knowledge**: 11 areas, levels, and relevance to the current game
8. **Team**: core students, drive team, recruitment, morale
9. **Mentors**: your mentors, market, contracts
10. **Workshop**: equipment
11. **Finance**: budget, income/expense chart, sponsors, activities calendar
12. **Calendar**: season weeks, regional catalogue, registration, offseason events
13. **Event Hub**: schedule, rankings, pit (repairs, upgrades, batteries), scouting board
14. **Pre-match** · **Live Match** · **Match Result**
15. **Alliance Selection**
16. **Playoff Bracket**
17. **Awards** / **Event Summary**
18. **Season Review** / **Career Summary**
19. **Game Brief** (shown at Kickoff: what the game is, scoring, which knowledge areas matter)
20. **Settings**: default sim speed, auto-sim other matches, colour-blind patterns for red/blue, No-fail mode, reset tutorial tips

---

## 17. Art direction
- Flat, simplified 2D with a dark UI. Your team colour is the accent; alliances are red and blue.
- **Fields**: a simplified top-down plan for each season, with the hub, grid, stage, reef, or tower drawn as clean shapes, zone lines, and piece icons.
- **Robots**: flat shapes as described in §7.10, all generated in code.
- Small animations: shot arcs, scoring pops, fault warning icons, and the climb animation.

---

## 18. Saves & settings
- Autosave every turn, plus 3 manual slots. Export and import a save file.
- The settings are the ones listed in §16, item 20.

---

## 19. Build plan (milestones)

| # | Milestone | Playable result |
|---|---|---|
| M1 | App shell, UI framework, main menu, team creation, data files for all 5 seasons | Navigate menus, create a team |
| M2 | Headless match engine + scoring rules for all 5 seasons + AI team pool; balance test runs | Matches resolve with sensible scores |
| M3 | Event flow: practice, quals schedule, rankings, alliance selection, playoffs, awards, OPR (simulate-only) | **Play a full simulated regional** |
| M4 | Live match viewer: field and robot rendering for all seasons, Coach Calls, speed controls | Watch and coach matches |
| M5 | Development: concepts, projects, hours, parts store, weight, Tech Knowledge, Garage visuals | Build → compete loop |
| M6 | Team & money: students, mentors, equipment, finance, sponsors and activities, Program Support | Full single-season economy |
| M7 | Season calendar: Kickoff → build → Weeks 1–6 → Championship qualification → Championship + Einstein | **Complete single season** |
| M8 | Offseason & Career: offseason turns and events, research, graduation, recruitment, 5-season career (real/random order), reviews | **Full career** |
| M9 | Single Season Challenge scenarios + grading | All modes |
| M10 | Polish: How to Play and tooltips, balancing pass, settings, save export/import | Release candidate |

**Testing**: I'll open the game in a browser after each milestone, play through it, and run automated season simulations to check balance targets (§12.9).

---

## 20. Simplifications vs real FRC (intentional)
- Real point values, but **abstract match play**: robots move between zones, pieces are counted, there is no physics.
- Many detailed rules (G-rules, staging, cards) are reduced to foul and fault probabilities.
- **Double elimination for all seasons.** 2022 actually used a best-of-3 bracket.
- **3-robot alliances** with no backup robot.
- **Championship** is one division plus Einstein. **Qualification** uses simplified rules (§11.7).
- **Costs** are approximate game values, not official fees.
- **Fictional** sponsors, regionals, offseason events, and team names, with random team numbers.
- **RP thresholds** use the regional-level values.
- **2026 hub shifts** are modelled as described in §6.5. Finer rule details are skipped.

---

## 21. Decisions to confirm before building
1. **Platform**: browser game (HTML/JS, opens from `index.html`). *Recommended.*
2. **Names**: fictional sponsors, regionals, and teams with random numbers. *Recommended*, to avoid using real companies or teams.
3. **Turn length**: weekly in season, monthly in offseason.
4. **Playoffs**: double elimination for every season (simplified).
5. **Coach Calls**: 3 per match base (up to 6).
6. **Scope**: follow milestones M1–M10, with a playable checkpoint at M3 (a simulated regional) before the bigger systems.
