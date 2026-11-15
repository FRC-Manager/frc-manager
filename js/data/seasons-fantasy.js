'use strict';
/* FRC Manager — the fantasy games (3.5): ten fictional games in the 2026 match format. Same shape as seasons.js.
   A fantasy game has no year of its own: its key (2101 to 2110) only names it. In a career it is played in whatever
   calendar year it is drawn for or placed in; as a Single Season Challenge it is the 2027 game. */
(function () {
  const S = G.Seasons, K = S._K, DRIVE = K.DRIVE, SOFT = K.SOFT, NONE_END = K.NONE_END, NO_INTAKE = K.NO_INTAKE;
  // every fantasy game: 20 s of auto, 2:20 of teleop, endgame in the last 30 s, 3 RP for a win
  const FMT = () => ({ fantasy: true, timing: { auto: 20, tele: 140, end: 30 }, rpWin: 3 });

  // =====================================================================
  // FULL TILT: the field is a pinball table
  // =====================================================================
  S[2101] = Object.assign(FMT(), {
    year: 2101, hpLoad: 1, name: 'FULL TILT', pieceName: 'Pinballs', sym: 'rotate',
    tagline: 'Knock down drop targets to finish banks, set off multiball and hang from the flippers.',
    brief: [
      'The field is a pinball table. Robots carry up to four Pinballs (silver foam balls) and shoot them at their TARGET BANK on the far end wall: five drop targets in a row. Knocking a standing target down scores 4 points (8 in auto). When all five are down the BANK is complete: 10 more points, and the targets stand up again three seconds later. A ball dumped in the DRAIN under the bank scores 1 (2 in auto).',
      'Each of an alliance\'s first three banks sets off MULTIBALL: its human player releases six extra pinballs from the rack. A completed bank also lights the JACKPOT ring above the middle target for 15 seconds: 10 points a ball while it is lit, 5 when it is not (10 in auto). Pinballs come from the PLUNGER, which fires them down your protected Shooter Lane, and every ball you score goes to the other alliance\'s Plunger.',
      'In the last 30 seconds robots hang from the two FLIPPERS, sloping bars in front of their own wall (12 each, 8 more when both are taken), or park under them (3). Win = 3 RP. Bonus RPs: Skill Shot (five targets down in auto and all three robots leave), Multiball (four banks; five at a District Championship, six at the Championship) and Wizard Mode (both flippers taken).'
    ],
    foul: { minor: 3, major: 10 },
    relevance: { swerve: 3, shooter: 3, turret: 3, elevator: 0, arm: 0, effector: 0, intake: 3, index: 2, climb: 2, vision: 3, autoPath: 2, elec: 2 },
    autoTiers: ['Leave the start zone', 'Preloads at the bank', 'Preloads + 2 from the floor', 'Seven-ball auto'], autoPieces: [0, 3, 5, 7],
    coachTargets: [{ id: 'auto', name: 'Best option' }, { id: 'bank', name: 'Finish banks' }, { id: 'jackpot', name: 'Hunt the jackpot' }, { id: 'drain', name: 'Feed the drain' }],
    endNames: ['Park', 'Flipper'],
    news: {
      prot: 'A robot in its own Shooter Lane may not be touched, and neither may a robot on a flipper in the last 30 seconds: the referees award the hang.',
      updates: ['Team Update: a target counts as down when its lamp is lit. Wobbling does not count, however hopeful the drive team looks.', 'Team Update: TILT is a real foul. Leaning on the target bank costs a major and a yellow card.', 'Team Update: the multiball release must be pulled by a human player. Tying a string to it is not a human player.', 'Team Update: a pinball resting in the Jackpot ring has scored. Three of them resting there is a field fault.'],
      chatter: [['Extra ball', '{student} now shouts "MULTIBALL!" whenever more than one thing happens at once. It has spread to the cafeteria.'], ['Flipper practice', 'The practice flipper is a fence rail at twenty degrees. The robot slid down it four times before {mentor} suggested "hooks that hook".'], ['Lane manners', '{driver} sat in the Shooter Lane for a whole practice match "because nobody may touch us there". The coach has explained the idea of scoring.']]
    },
    subs: [
      { id: 'drive', name: 'Drivetrain', concepts: DRIVE },
      { id: 'intake', name: 'Intake & Indexer', concepts: [
        { id: 'lane', name: 'Lane catcher (2 pinballs)', desc: 'A funnel that catches pinballs as the Plunger fires them down the Shooter Lane. No pickup off the carpet, two balls at a time.', cost: 200, hours: 50, w: 5, cx: 1, areas: ['intake'],
          base: { intake: 40 }, ceil: { intake: 72 }, caps: { ground: false, station: true, storage: 2, wide: 1 }, look: { intake: 'none' } },
        { id: 'over', name: 'Over-bumper intake + 4-ball indexer', desc: 'Picks pinballs off the carpet and lines up four in a belt indexer.', cost: 800, hours: 140, w: 13, cx: 3, areas: ['intake', 'index'],
          base: { intake: 45 }, ceil: { intake: 88 }, caps: { ground: true, station: true, storage: 4, wide: 1 }, look: { intake: 'over' } },
        { id: 'wide', name: 'Full-width intake + fast indexer', desc: 'A frame-wide intake that never has to line up on a ball, and an indexer that does not jam.', cost: 1200, hours: 200, w: 16, cx: 4, areas: ['intake', 'index'],
          base: { intake: 48 }, ceil: { intake: 95 }, caps: { ground: true, station: true, storage: 4, wide: 1.3 }, look: { intake: 'wide' } },
        // takes the rebounds off the bank before they roll away (rules: REB01)
        { id: 'catch', name: 'Full-width intake + rebound net', elite: true, desc: 'A frame-wide intake under a net that catches its own misses as they come back off the target bank: a missed shot is back in the indexer a second later. The hardest intake of the year.', cost: 1700, hours: 260, w: 19, cx: 5, areas: ['intake', 'index'],
          base: { intake: 48 }, ceil: { intake: 96 }, caps: { ground: true, station: true, storage: 4, wide: 1.3, rebound: true }, look: { intake: 'wide' } }
      ] },
      { id: 'scorer', name: 'Shooter', concepts: [
        { id: 'dump', name: 'Drain dumper', desc: 'Drives up to the wall and rolls pinballs into the Drain. One point each, hard to miss.', cost: 200, hours: 60, w: 8, cx: 1, areas: ['shooter'],
          base: { scoreSpd: 45, accuracy: 60 }, ceil: { scoreSpd: 78, accuracy: 90 }, caps: { drainOnly: true }, look: { shooter: 'dump' } },
        { id: 'fixed', name: 'Fixed shooter', desc: 'One shot from one distance: the whole robot turns to face each target, so every new target costs time. Cannot reach the Jackpot.', cost: 800, hours: 120, w: 14, cx: 2, areas: ['shooter'],
          base: { scoreSpd: 42, accuracy: 46, range: 0 }, ceil: { scoreSpd: 80, accuracy: 88, range: 30 }, caps: { rmin: 1.5, rmax: 2.6 }, look: { shooter: 'fixed' } },
        { id: 'hood', name: 'Adjustable hood shooter', desc: 'Shoots from mid-field and reaches the Jackpot ring. The robot still has to turn to each target.', cost: 1300, hours: 180, w: 17, cx: 3, areas: ['shooter', 'vision'],
          base: { scoreSpd: 40, accuracy: 42, range: 30 }, ceil: { scoreSpd: 88, accuracy: 93, range: 85 }, caps: { rmin: 1.5, rmax: 4.5, jackpot: true }, look: { shooter: 'hood' } },
        { id: 'turret', name: 'Turret + hood', desc: 'Picks out the standing targets by itself while the robot keeps driving: no time lost between targets, and a defender hardly bothers it.', cost: 2000, hours: 250, w: 22, cx: 4, areas: ['turret', 'shooter', 'vision'],
          base: { scoreSpd: 38, accuracy: 40, range: 40 }, ceil: { scoreSpd: 94, accuracy: 95, range: 95 }, caps: { rmin: 1.5, rmax: 5.5, jackpot: true, turret: true }, look: { shooter: 'turret' } },
        // two targets a volley (rules: volley01)
        { id: 'twin', name: 'Twin-barrel turret', elite: true, desc: 'Two barrels on one turret, each aimed at its own target: two targets down in one volley. The hardest shooter of the year, and only worth it with an indexer that keeps up.', cost: 2500, hours: 300, w: 24, cx: 5, areas: ['turret', 'shooter', 'vision'],
          base: { scoreSpd: 38, accuracy: 40, range: 40 }, ceil: { scoreSpd: 94, accuracy: 95, range: 95 }, caps: { rmin: 1.5, rmax: 5.5, jackpot: true, turret: true, twin: true }, look: { shooter: 'rotor' } }
      ] },
      { id: 'endgame', name: 'Flipper Climber', concepts: [
        NONE_END,
        { id: 'hook', name: 'Hook and winch', desc: 'A hook over the flipper and a winch. The bar slopes, so the robot hangs crooked and sometimes slides.', cost: 500, hours: 100, w: 10, cx: 2, areas: ['climb'],
          base: { endgame: 40 }, ceil: { endgame: 88 }, caps: { endLevel: 1 }, look: { climber: 'hook' } },
        { id: 'level', name: 'Self-levelling hooks', desc: 'Two hooks that grip the sloping bar and square the robot up as it lifts: quicker, and it does not slide off.', cost: 1000, hours: 170, w: 13, cx: 3, areas: ['climb'],
          base: { endgame: 46 }, ceil: { endgame: 95 }, caps: { endLevel: 1, climbK: 0.75, climbAdd: 0.06 }, look: { climber: 'hook2' } }
      ] },
      { id: 'soft', name: 'Software', concepts: [SOFT()] }
    ],
    archetypes: [
      { name: 'Twin turret + rebound net', min: 90, pick: { drive: 'swerve', intake: ['catch', 'wide'], scorer: ['twin', 'turret'], endgame: 'level' } },
      { name: 'Turret + wide intake', min: 74, pick: { drive: 'swerve', intake: 'wide', scorer: 'turret', endgame: ['level', 'hook'] } },
      { name: 'Hood shooter', min: 54, pick: { drive: 'swerve', intake: ['over', 'wide'], scorer: 'hood', endgame: ['hook', 'level'] } },
      { name: 'Fixed shooter', min: 34, pick: { drive: ['wcd', 'swerve'], intake: 'over', scorer: ['fixed', 'hood'], endgame: ['hook', 'none'] } },
      { name: 'Drain dumper', min: 14, pick: { drive: ['kit', 'wcd'], intake: ['over', 'lane'], scorer: 'dump', endgame: ['hook', 'none'] } },
      { name: 'Kitbot', min: 0, pick: { drive: 'kit', intake: 'lane', scorer: 'dump', endgame: 'none' } }
    ]
  });

  // =====================================================================
  // MAINLINE: a tug of war on rails
  // =====================================================================
  S[2102] = Object.assign(FMT(), {
    year: 2102, hpLoad: 1, name: 'MAINLINE', pieceName: 'Drums', sym: 'mirror',
    tagline: 'Load freight drums to push the Engine into the other alliance\'s terminus, and hold the brake when it comes for yours.',
    brief: [
      'A rail runs the length of the field with the ENGINE on it, starting at the Junction in the middle. Robots carry up to three Drums (foam cylinders) from their Yards in the far corners to their FREIGHT HOUSE on their own wall: 2 points through the low door, 4 through the high door (double in auto). Every drum moves the Engine one step toward the other alliance\'s TERMINUS, two steps for the high door, and the other alliance\'s drums move it back.',
      'When the Engine reaches a terminus that is a DELIVERY: 20 points to the alliance that pushed it there, and the Engine runs back to the Junction. Each alliance has a BRAKE PAD at mid-field: while one of its robots stands on it, the Engine moves only half as far toward its terminus. The pad is not protected, so opponents may shove that robot off. Drums are fed by hand crank at the CRANK HOUSES, and a drum you score rolls out to the other alliance\'s human players.',
      'In the last 30 seconds robots hang from the SIGNAL GANTRY: low bar 8, high bar 15, parked under it 3. Win = 3 RP. Bonus RPs: Express (two Deliveries; three at the Championship), Full Load (30 drums; 34 at a District Championship, 40 at the Championship) and All Aboard (30 gantry points).'
    ],
    foul: { minor: 3, major: 10 },
    relevance: { swerve: 2, shooter: 1, turret: 0, elevator: 3, arm: 2, effector: 0, intake: 3, index: 1, climb: 3, vision: 1, autoPath: 2, elec: 2 },
    autoTiers: ['Leave the start zone', 'Preload through a door', 'Preload + 1 from the centre line', 'Three-drum auto'], autoPieces: [0, 1, 2, 3],
    coachTargets: [{ id: 'auto', name: 'Best option' }, { id: 'high', name: 'High door only' }, { id: 'low', name: 'Low door, short cycles' }, { id: 'brake', name: 'Hold the brake' }],
    endNames: ['Park', 'Low bar', 'High bar'],
    news: {
      prot: 'Nobody may touch a robot in its own Yard or enter the other alliance\'s Apron, and a robot on the gantry in the last 30 seconds is credited with the high bar. The Brake Pad is not protected: pushing a robot off it is the game.',
      updates: ['Team Update: the Engine moves on the field\'s count, not on how loudly the drive team shouts at it.', 'Team Update: a robot is on its Brake Pad when its bumpers are fully over the plate. One wheel is not a brake.', 'Team Update: human players may not crank with a cordless drill. Yes, somebody brought one.', 'Team Update: a drum counts when it is through the door. A drum balanced on the sill counts for the audience only.'],
      chatter: [['Arm day', '{student} has cranked the practice lift four hundred times this week and now opens doors with the other hand.'], ['The brake', '{driver} parked on the practice Brake Pad and announced that the robot was "contributing". The scoreboard agreed, a little.'], ['All aboard', 'The team has a train whistle now. {mentor} has hidden it twice. It keeps coming back.']]
    },
    subs: [
      { id: 'drive', name: 'Drivetrain', concepts: DRIVE },
      { id: 'intake', name: 'Drum Intake', concepts: [
        { id: 'chute', name: 'Chute catcher (1 drum)', desc: 'A cradle that takes a drum from the Crank House chute. No pickup off the carpet, one drum at a time.', cost: 200, hours: 50, w: 5, cx: 1, areas: ['intake'],
          base: { intake: 40 }, ceil: { intake: 72 }, caps: { ground: false, station: true, storage: 1, wide: 1 }, look: { intake: 'none' } },
        { id: 'floor', name: 'Floor pickup (2 drums)', desc: 'Rollers that stand a drum up off the carpet and pass it back. Holds two.', cost: 700, hours: 130, w: 11, cx: 3, areas: ['intake'],
          base: { intake: 45 }, ceil: { intake: 88 }, caps: { ground: true, station: true, storage: 2, wide: 1 }, look: { intake: 'over' } },
        { id: 'wide', name: 'Wide pickup + 3-drum magazine', desc: 'Takes a drum lying any way round and stores three in a magazine: a full load every trip.', cost: 1150, hours: 190, w: 15, cx: 4, areas: ['intake', 'index'],
          base: { intake: 48 }, ceil: { intake: 95 }, caps: { ground: true, station: true, storage: 3, wide: 1.3 }, look: { intake: 'wide' } },
        // loads at the chute without stopping (rules: ROLL02)
        { id: 'roll', name: 'Roll-through magazine', elite: true, desc: 'A three-drum magazine open at both ends: the robot rolls under the chute and the drums drop in as it passes, and it never has to turn round for one on the carpet. The hardest intake of the year.', cost: 1650, hours: 250, w: 18, cx: 5, areas: ['intake', 'index'],
          base: { intake: 48 }, ceil: { intake: 96 }, caps: { ground: true, station: true, storage: 3, wide: 1.3, rollIn: true }, look: { intake: 'dual' } }
      ] },
      { id: 'scorer', name: 'Lift', pneu: true, concepts: [
        { id: 'low', name: 'Low-door roller', desc: 'Rolls drums out at bumper height, through the low door. One step of the Engine each.', cost: 200, hours: 50, w: 6, cx: 1, areas: ['arm'],
          base: { scoreSpd: 45, accuracy: 60 }, ceil: { scoreSpd: 80, accuracy: 92 }, caps: { reach: 1 }, look: { manip: 'low' } },
        { id: 'arm', name: 'High-door arm', desc: 'A pivoting arm that lifts one drum at a time to the high door, six feet up: two steps of the Engine each.', cost: 800, hours: 130, w: 12, cx: 2, areas: ['arm'],
          base: { scoreSpd: 40, accuracy: 50 }, ceil: { scoreSpd: 82, accuracy: 92 }, caps: { reach: 2, tall: 1 }, look: { manip: 'arm' } },
        { id: 'elev', name: 'Fast elevator', desc: 'A quick elevator that feeds the high door from the magazine without lowering between drums.', cost: 1300, hours: 190, w: 17, cx: 3, areas: ['elevator', 'arm'],
          base: { scoreSpd: 42, accuracy: 50 }, ceil: { scoreSpd: 92, accuracy: 94 }, caps: { reach: 2, tall: 1.3, stream: true }, look: { manip: 'elevator' } },
        { id: 'lob', name: 'Drum lobber', desc: 'Flywheels that throw drums through the high door from six feet out: no lift to raise and no queue at the doors, but a drum is a clumsy thing to throw.', cost: 1400, hours: 200, w: 16, cx: 4, areas: ['shooter', 'vision'],
          base: { scoreSpd: 44, accuracy: 38, range: 20 }, ceil: { scoreSpd: 90, accuracy: 86, range: 80 }, caps: { reach: 2, lob: true, rmin: 1.3, rmax: 2.6 }, look: { shooter: 'hood' } },
        // the whole magazine in one go (rules: place02)
        { id: 'tip', name: 'Elevator + tipping magazine', elite: true, desc: 'The whole magazine rides up the elevator and tips all three drums through the high door at once. The hardest lift of the year: tall, heavy and top-heavy.', cost: 2200, hours: 290, w: 23, cx: 5, areas: ['elevator', 'arm', 'index'],
          base: { scoreSpd: 42, accuracy: 50 }, ceil: { scoreSpd: 94, accuracy: 95 }, caps: { reach: 2, tall: 1.6, stream: true, tipAll: true }, look: { manip: 'elevwrist' } }
      ] },
      { id: 'endgame', name: 'Gantry Climber', concepts: [
        NONE_END,
        { id: 'low', name: 'Low-bar hook', desc: 'A short hook for the four-foot bar. Quick and safe.', cost: 350, hours: 70, w: 7, cx: 1, areas: ['climb'],
          base: { endgame: 50 }, ceil: { endgame: 90 }, caps: { endLevel: 1 }, look: { climber: 'hook' } },
        { id: 'high', name: 'Telescoping climber', desc: 'Telescoping hooks for the high bar, six and a half feet up.', cost: 950, hours: 160, w: 12, cx: 3, areas: ['climb'],
          base: { endgame: 40 }, ceil: { endgame: 93 }, caps: { endLevel: 2 }, look: { climber: 'arms' } }
      ] },
      { id: 'soft', name: 'Software', concepts: [SOFT()] }
    ],
    archetypes: [
      { name: 'Tipping magazine + roll-through', min: 90, pick: { drive: 'swerve', intake: ['roll', 'wide'], scorer: ['tip', 'elev'], endgame: 'high' } },
      { name: 'Fast elevator + magazine', min: 72, pick: { drive: 'swerve', intake: 'wide', scorer: 'elev', endgame: 'high' } },
      { name: 'Drum lobber', min: 60, pick: { drive: 'swerve', intake: ['wide', 'floor'], scorer: 'lob', endgame: ['high', 'low'] } },
      { name: 'High-door arm', min: 38, pick: { drive: ['wcd', 'swerve'], intake: 'floor', scorer: 'arm', endgame: ['low', 'high'] } },
      { name: 'Low-door runner', min: 14, pick: { drive: ['kit', 'wcd'], intake: ['floor', 'chute'], scorer: 'low', endgame: ['low', 'none'] } },
      { name: 'Kitbot', min: 0, pick: { drive: 'kit', intake: 'chute', scorer: 'low', endgame: 'none' } }
    ]
  });

  // =====================================================================
  // STATION KEEPING: a goal that turns
  // =====================================================================
  S[2103] = Object.assign(FMT(), {
    year: 2103, name: 'STATION KEEPING', pieceName: 'Discs', sym: 'rotate',
    tagline: 'Fly discs into the ports of a station that turns at mid-field, then latch on to a docking arm and ride it round.',
    brief: [
      'A space STATION stands at the centre of the field. It is locked in auto and turns once every 40 seconds in teleop. Each of its four faces has a HIGH PORT (4 points a disc, 8 in auto) above a LOW AIRLOCK (2, or 4 in auto): two faces are lit red and two blue, and a disc scores for the colour of the port it enters. Robots carry up to four Discs.',
      'Your ports face a different part of the field every few seconds, so a shooter has to move with them or lead them: the further off a port\'s axis, the more shots miss. The ORBIT LANE around the station is one-way, the way the station turns. Each alliance has two LAUNCH PADS where its robots may not be touched. Discs are loaded at the Depots in the corners of your own wall, and scored discs come back down to them.',
      'In the last 30 seconds robots DOCK: they hang from one of their alliance\'s two docking arms, which keep turning with the station (15 each, 10 more for both; parked in the Orbit Lane 3), and the human players may throw four Supply Drop discs at the hatch on the station\'s roof (6 each). Win = 3 RP. Bonus RPs: Launch Window (six discs in high ports in auto), Resupply (40 discs; 50 at a District Championship, 60 at the Championship) and Crew Complete (both arms docked).'
    ],
    foul: { minor: 3, major: 10 },
    relevance: { swerve: 3, shooter: 3, turret: 3, elevator: 0, arm: 0, effector: 0, intake: 3, index: 2, climb: 2, vision: 3, autoPath: 3, elec: 2 },
    autoTiers: ['Leave the start zone', 'Preloads in a port', 'Preloads + 2 from the floor', 'Seven-disc auto'], autoPieces: [0, 3, 5, 7],
    coachTargets: [{ id: 'auto', name: 'Best option' }, { id: 'high', name: 'High ports only' }, { id: 'low', name: 'Orbit and feed the airlocks' }],
    endNames: ['Park', 'Docked'],
    news: {
      prot: 'A robot on its own Launch Pad may not be touched, and neither may one on or reaching for its docking arm in the last 30 seconds: the referees award the dock.',
      updates: ['Team Update: the Orbit Lane is one-way. A robot driving against the turn gets a foul and a very sad look from the head referee.', 'Team Update: a disc that enters the wrong colour of port scores for that colour. Please stop testing this.', 'Team Update: the station turns once every 40 seconds. Timing it with a phone taped to the robot is legal. Asking the field crew to stop it is not.', 'Team Update: a robot is Docked when no part of it touches the carpet at the final buzzer. A wheel on a partner counts as carpet.'],
      chatter: [['Dizzy', '{driver} has practised orbiting the mock station for an hour and now walks to lunch in a slow curve.'], ['Lead the target', '{student} wrote the port\'s position on the whiteboard as a function of time. The robot still shot where the port used to be.'], ['Supply Drop', 'The human players have been throwing discs at a bin on the shop roof. Two discs are still up there. So is one shoe.']]
    },
    subs: [
      { id: 'drive', name: 'Drivetrain', concepts: DRIVE },
      { id: 'intake', name: 'Disc Intake', concepts: [
        { id: 'slot', name: 'Depot slot loader (2 discs)', desc: 'A tray that takes discs from the Depot slot. No pickup off the carpet, two discs at a time.', cost: 200, hours: 50, w: 5, cx: 1, areas: ['intake'],
          base: { intake: 40 }, ceil: { intake: 72 }, caps: { ground: false, station: true, storage: 2, wide: 1 }, look: { intake: 'none' } },
        { id: 'floor', name: 'Floor pickup + 4-disc stack', desc: 'A roller that slides discs off the carpet into a stack of four. An upside-down disc has to be nudged over first.', cost: 750, hours: 130, w: 11, cx: 3, areas: ['intake', 'index'],
          base: { intake: 45 }, ceil: { intake: 88 }, caps: { ground: true, station: true, storage: 4, wide: 1 }, look: { intake: 'over' } },
        { id: 'wide', name: 'Wide pickup + disc flipper', desc: 'Frame-wide, and it rights upside-down discs on the way in: every disc on the carpet is a disc it can take at once.', cost: 1150, hours: 190, w: 14, cx: 4, areas: ['intake', 'index'],
          base: { intake: 48 }, ceil: { intake: 95 }, caps: { ground: true, station: true, storage: 4, wide: 1.3 }, look: { intake: 'wide' } },
        // loads while it drives past the slot (rules: collect03)
        { id: 'touch', name: 'Touch-and-go pickup', elite: true, desc: 'A wide pickup with a spring-loaded stack: discs go in at driving speed, off the carpet or out of the Depot slot, without the robot ever stopping square. The hardest intake of the year.', cost: 1650, hours: 250, w: 17, cx: 5, areas: ['intake', 'index'],
          base: { intake: 48 }, ceil: { intake: 96 }, caps: { ground: true, station: true, storage: 4, wide: 1.3, touchGo: true }, look: { intake: 'wide' } }
      ] },
      { id: 'scorer', name: 'Launcher', concepts: [
        { id: 'push', name: 'Airlock pusher', desc: 'Slides discs into a Low Airlock. The robot has to drive round with the station while it feeds.', cost: 200, hours: 60, w: 7, cx: 1, areas: ['shooter'],
          base: { scoreSpd: 45, accuracy: 58 }, ceil: { scoreSpd: 80, accuracy: 90 }, caps: { lowOnly: true }, look: { shooter: 'dump' } },
        { id: 'fixed', name: 'Fixed linear shooter', desc: 'One wheel, one rail, one distance. It has to sit square on its port\'s axis, close to the station, and move every time the port does.', cost: 800, hours: 120, w: 13, cx: 2, areas: ['shooter'],
          base: { scoreSpd: 42, accuracy: 46, range: 0 }, ceil: { scoreSpd: 80, accuracy: 88, range: 30 }, caps: { rmin: 1.6, rmax: 2.8, cone: 0.45 }, look: { shooter: 'fixed' } },
        { id: 'adj', name: 'Adjustable shooter', desc: 'Changes its angle and speed for the distance: shoots from further out, where the port sweeps past more slowly.', cost: 1300, hours: 180, w: 16, cx: 3, areas: ['shooter', 'vision'],
          base: { scoreSpd: 40, accuracy: 42, range: 30 }, ceil: { scoreSpd: 88, accuracy: 93, range: 85 }, caps: { rmin: 1.6, rmax: 4.6, cone: 0.6 }, look: { shooter: 'hood' } },
        { id: 'turret', name: 'Port-tracking turret', desc: 'Follows its port by itself and leads the shot, so the robot can stand still, well off the axis, while everyone else chases the station round.', cost: 2000, hours: 250, w: 21, cx: 4, areas: ['turret', 'shooter', 'vision'],
          base: { scoreSpd: 38, accuracy: 40, range: 40 }, ceil: { scoreSpd: 94, accuracy: 95, range: 95 }, caps: { rmin: 1.6, rmax: 5.6, cone: 0.95, turret: true }, look: { shooter: 'turret' } },
        // shoots while the robot orbits (rules: volley03)
        { id: 'orbit', name: 'Shoot-on-the-move turret', elite: true, desc: 'A turret whose software takes the robot\'s own speed out of the shot: it scores while it orbits with its port, never stopping to aim. The hardest launcher of the year, and it needs the vision to match.', cost: 2500, hours: 300, w: 23, cx: 5, areas: ['turret', 'shooter', 'vision'],
          base: { scoreSpd: 38, accuracy: 40, range: 40 }, ceil: { scoreSpd: 94, accuracy: 95, range: 95 }, caps: { rmin: 1.6, rmax: 5.6, cone: 1.2, turret: true, onMove: true }, look: { shooter: 'rotor' } }
      ] },
      { id: 'endgame', name: 'Docking Latch', concepts: [
        NONE_END,
        { id: 'hook', name: 'Hook and winch', desc: 'A hook thrown over the docking arm as it comes past, then a winch. The arm does not wait.', cost: 500, hours: 100, w: 10, cx: 2, areas: ['climb'],
          base: { endgame: 38 }, ceil: { endgame: 86 }, caps: { endLevel: 1 }, look: { climber: 'hook' } },
        { id: 'latch', name: 'Speed-matching latch', desc: 'The robot drives alongside the arm at its speed, a latch closes by itself and the lift is over in seconds: quicker and much surer.', cost: 1050, hours: 180, w: 13, cx: 4, areas: ['climb', 'autoPath'],
          base: { endgame: 46 }, ceil: { endgame: 95 }, caps: { endLevel: 1, climbK: 0.7, climbAdd: 0.07 }, look: { climber: 'hook2' } }
      ] },
      { id: 'soft', name: 'Software', concepts: [SOFT()] }
    ],
    archetypes: [
      { name: 'Shoot-on-the-move turret', min: 90, pick: { drive: 'swerve', intake: ['touch', 'wide'], scorer: ['orbit', 'turret'], endgame: 'latch' } },
      { name: 'Tracking turret', min: 74, pick: { drive: 'swerve', intake: 'wide', scorer: 'turret', endgame: ['latch', 'hook'] } },
      { name: 'Adjustable shooter', min: 54, pick: { drive: 'swerve', intake: ['floor', 'wide'], scorer: 'adj', endgame: ['hook', 'latch'] } },
      { name: 'Fixed shooter', min: 34, pick: { drive: ['wcd', 'swerve'], intake: 'floor', scorer: ['fixed', 'adj'], endgame: ['hook', 'none'] } },
      { name: 'Airlock runner', min: 14, pick: { drive: ['kit', 'wcd'], intake: ['floor', 'slot'], scorer: 'push', endgame: ['hook', 'none'] } },
      { name: 'Kitbot', min: 0, pick: { drive: 'kit', intake: 'slot', scorer: 'push', endgame: 'none' } }
    ]
  });

  // =====================================================================
  // HIGH RISE: build the tower you climb
  // =====================================================================
  S[2104] = Object.assign(FMT(), {
    year: 2104, hpLoad: 1, name: 'HIGH RISE', pieceName: 'Girders', sym: 'rotate',
    tagline: 'Build your tower floor by floor out of long girders: the higher you build, the higher you may climb.',
    brief: [
      'Each alliance builds a TOWER in front of its own wall: three bays wide and four floors high, two girders to a bay. Robots carry Girders (40 in foam-covered tubes) from the Supply Yard racks in the far corners and lay them across a bay: 2 points on floor 1, 3 on floor 2, 5 on floor 3 and 7 on floor 4 (auto: 4, 6, 8, 10). A floor is TOPPED OUT, for 6 more points, when all three of its bays are full and every floor below it is topped out.',
      'The SITE around your tower is closed to opponents, so defense happens in mid-field and at the racks. Each alliance may also lay two girders on the neutral FOOTBRIDGE (3 points each): when both alliances have laid theirs, the Topping Out bonus needs one floor fewer.',
      'The climbing RUNGS on the tower are gated: rung 1 (6 points) opens when floor 1 is topped out, rung 2 (12) with floor 2, and rung 3 (20) only when the whole tower is; a robot parked in the Site scores 3. Win = 3 RP. Bonus RPs: Foundation (three girders on floor 1 when auto ends), Topping Out (all four floors; three with a complete Footbridge) and Skyline (24 endgame points; 30 at a District Championship, 36 at the Championship).'
    ],
    foul: { minor: 4, major: 12 },
    relevance: { swerve: 2, shooter: 0, turret: 0, elevator: 3, arm: 3, effector: 2, intake: 3, index: 0, climb: 3, vision: 2, autoPath: 3, elec: 2 },
    autoTiers: ['Leave the start zone', 'Preload on the tower', 'Preload + 1 from mid-field', 'Three-girder auto'], autoPieces: [0, 1, 2, 3],
    coachTargets: [{ id: 'auto', name: 'Top out floor by floor' }, { id: 'high', name: 'Fill the highest floor we reach' }, { id: 'bridge', name: 'Footbridge first' }],
    endNames: ['Park', 'Rung 1', 'Rung 2', 'Rung 3'],
    news: {
      prot: 'The Site around a tower is closed to the other alliance, and so are the Supply Yard racks while a robot is loading. Touch a climbing robot in the last 30 seconds and the referees award the rung.',
      updates: ['Team Update: a bay is full with two girders in it. A third one balanced on top is a hazard, and a foul.', 'Team Update: a girder is laid when both cradles hold it. One cradle and a hopeful angle is not a girder.', 'Team Update: floors are topped out from the bottom. A full fourth floor over an empty first one is a sculpture.', 'Team Update: girders on the Footbridge may be laid by either alliance in its own cradles only. Sharing is encouraged, trespassing is not.', 'Team Update: the rung gates open by themselves when a floor is topped out. Please stop prying at them.'],
      chatter: [['Mind your head', 'A forty-inch girder does not fit through the shop door sideways. {student} has now established this three times.'], ['Topping out', 'The team hung a small tree on the practice tower when the fourth floor went on. {mentor} says that is tradition. The tree is a broccoli.'], ['Scaffold', '{driver} placed a girder on floor 4 in practice and nobody breathed for six seconds.']]
    },
    subs: [
      { id: 'drive', name: 'Drivetrain', concepts: DRIVE },
      { id: 'intake', name: 'Girder Intake', concepts: [
        { id: 'rack', name: 'Rack loader', desc: 'Forks that take a girder end-on from the Supply Yard rack. No pickup off the carpet.', cost: 250, hours: 60, w: 6, cx: 1, areas: ['intake'],
          base: { intake: 40 }, ceil: { intake: 74 }, caps: { ground: false, station: true, wide: 1 }, look: { intake: 'claw' } },
        { id: 'floor', name: 'Floor pickup with turner', desc: 'Picks a girder off the carpet and turns it to lie across the robot. It has to come at the girder nearly square.', cost: 800, hours: 140, w: 12, cx: 3, areas: ['intake', 'arm'],
          base: { intake: 44 }, ceil: { intake: 88 }, caps: { ground: true, station: true, wide: 1 }, look: { intake: 'over' } },
        { id: 'wide', name: 'Self-aligning pickup', desc: 'Angled rollers that pull a girder in from any direction and line it up: touch it and it is yours.', cost: 1250, hours: 200, w: 15, cx: 4, areas: ['intake', 'arm'],
          base: { intake: 48 }, ceil: { intake: 95 }, caps: { ground: true, station: true, wide: 1.3 }, look: { intake: 'wide' } }
      ] },
      { id: 'scorer', name: 'Lift', pneu: true, concepts: [
        { id: 'arm2', name: 'Two-floor arm', desc: 'A pivoting arm for floors 1 and 2. Cheap and quick, and somebody has to lay the low floors.', cost: 500, hours: 90, w: 9, cx: 2, areas: ['arm', 'effector'],
          base: { scoreSpd: 44, accuracy: 52 }, ceil: { scoreSpd: 84, accuracy: 93 }, caps: { reach: 2, tall: 0.6 }, look: { manip: 'arm' } },
        { id: 'elev3', name: 'Three-floor elevator', desc: 'A two-stage elevator to floor 3.', cost: 1100, hours: 170, w: 15, cx: 3, areas: ['elevator', 'effector'],
          base: { scoreSpd: 42, accuracy: 50 }, ceil: { scoreSpd: 86, accuracy: 93 }, caps: { reach: 3, tall: 1.2 }, look: { manip: 'elevator' } },
        { id: 'elev4', name: 'Tall elevator', desc: 'Three stages, to floor 4 at seven and a half feet: the only way to top the tower out and open the highest rung.', cost: 1600, hours: 230, w: 19, cx: 4, areas: ['elevator', 'effector'],
          base: { scoreSpd: 40, accuracy: 48 }, ceil: { scoreSpd: 88, accuracy: 93 }, caps: { reach: 4, tall: 1.7 }, look: { manip: 'elevator' } },
        { id: 'fast4', name: 'Fast elevator + wrist', desc: 'A quick continuous elevator with a wrist that swings the girder level over the cradles: every floor, in about two thirds of the time.', cost: 2000, hours: 270, w: 21, cx: 5, areas: ['elevator', 'arm', 'effector'],
          base: { scoreSpd: 44, accuracy: 50 }, ceil: { scoreSpd: 96, accuracy: 95 }, caps: { reach: 4, tall: 1.6, wrist: true }, look: { manip: 'elevwrist' } },
        // two girders a trip (rules: place04)
        { id: 'twin', name: 'Fast elevator + twin gripper', elite: true, desc: 'A wrist with two grippers: it carries two girders a trip and lays them one above the other. The hardest lift of the year: tall, heavy, and a full load swings.', cost: 2500, hours: 320, w: 24, cx: 5, areas: ['elevator', 'arm', 'effector'],
          base: { scoreSpd: 44, accuracy: 50 }, ceil: { scoreSpd: 96, accuracy: 95 }, caps: { reach: 4, tall: 1.9, wrist: true, storage: 2 }, look: { manip: 'elevwrist' } }
      ] },
      { id: 'endgame', name: 'Climber', concepts: [
        NONE_END,
        { id: 'r1', name: 'Rung 1 hook', desc: 'A hook and a short winch for the lowest rung.', cost: 350, hours: 70, w: 7, cx: 1, areas: ['climb'],
          base: { endgame: 50 }, ceil: { endgame: 90 }, caps: { endLevel: 1 }, look: { climber: 'hook' } },
        { id: 'r2', name: 'Two-stage climber', desc: 'Reaches rung 2, five and a half feet up.', cost: 750, hours: 130, w: 10, cx: 3, areas: ['climb'],
          base: { endgame: 42 }, ceil: { endgame: 92 }, caps: { endLevel: 2 }, look: { climber: 'hook2' } },
        { id: 'r3', name: 'Telescoping climber', desc: 'Telescoping hooks for the top rung. It is only any use if the alliance tops out the fourth floor.', cost: 1250, hours: 200, w: 14, cx: 4, areas: ['climb'],
          base: { endgame: 36 }, ceil: { endgame: 95 }, caps: { endLevel: 3 }, look: { climber: 'arms' } }
      ] },
      { id: 'soft', name: 'Software', concepts: [SOFT()] }
    ],
    archetypes: [
      { name: 'Twin gripper + top rung', min: 90, pick: { drive: 'swerve', intake: 'wide', scorer: ['twin', 'fast4'], endgame: 'r3' } },
      { name: 'Fast elevator + wrist', min: 74, pick: { drive: 'swerve', intake: 'wide', scorer: 'fast4', endgame: ['r3', 'r2'] } },
      { name: 'Tall elevator', min: 56, pick: { drive: 'swerve', intake: ['floor', 'wide'], scorer: 'elev4', endgame: ['r2', 'r3'] } },
      { name: 'Three-floor elevator', min: 36, pick: { drive: ['wcd', 'swerve'], intake: 'floor', scorer: 'elev3', endgame: ['r2', 'r1'] } },
      { name: 'Two-floor arm', min: 14, pick: { drive: ['kit', 'wcd'], intake: ['floor', 'rack'], scorer: 'arm2', endgame: ['r1', 'none'] } },
      { name: 'Kitbot', min: 0, pick: { drive: 'kit', intake: 'rack', scorer: 'arm2', endgame: 'none' } }
    ]
  });

  // =====================================================================
  // GALE FORCE: turbines that run down
  // =====================================================================
  S[2105] = Object.assign(FMT(), {
    year: 2105, hpLoad: 1, name: 'GALE FORCE', pieceName: 'Cells', sym: 'rotate',
    tagline: 'Spin up your three wind turbines and keep them turning: every cell you score is worth more for each one still generating.',
    brief: [
      'Each alliance has three wind TURBINES: Home, beside its own wall; Field, on its side of mid-field; and Offshore, in the other alliance\'s half. A robot presses a spinning roller against a turbine\'s drive drum to wind it up, and it runs down again in about 25 seconds. While it is above the line it is GENERATING.',
      'Robots carry up to five Cells (foam balls) and shoot them into their GRID on the far end wall: 1 point in the low inlet and 2 in the high inlet (2 and 4 in auto), PLUS 1 for each of their turbines generating at that moment. The other alliance may brake your Offshore turbine by touching its drum. A human player can keep the Home turbine going with a hand crank, but cannot feed cells while cranking.',
      'In the last 30 seconds a robot may climb each of its alliance\'s turbine towers: 8 points to the first hold, 16 to the second, 6 more on the Offshore tower. Each turbine generating when auto ends or at the final buzzer scores 5. Win = 3 RP. Bonus RPs: First Light (Home turbine generating and five cells scored when auto ends), Full Power (all three generating together for 40 seconds in total; 55 at a District Championship, 70 at the Championship) and Storm Watch (30 endgame points).'
    ],
    foul: { minor: 3, major: 10 },
    relevance: { swerve: 3, shooter: 3, turret: 3, elevator: 0, arm: 1, effector: 0, intake: 3, index: 3, climb: 2, vision: 3, autoPath: 2, elec: 2 },
    autoTiers: ['Leave the start zone', 'Spin Home + preloads', 'Preloads + 2 from the floor', 'Eight-cell auto'], autoPieces: [0, 3, 5, 8],
    coachTargets: [{ id: 'auto', name: 'Best option' }, { id: 'spin', name: 'Keep the turbines spinning' }, { id: 'shoot', name: 'Just shoot' }, { id: 'brake', name: 'Brake their Offshore' }],
    endNames: ['—', 'First hold', 'Second hold'],
    news: {
      prot: 'A robot on its Home Pad may not be touched, and neither may one on a turbine tower in the last 30 seconds. Only your Offshore turbine may be braked, and only for three seconds at a time.',
      updates: ['Team Update: a turbine is generating while its lamp is lit. Blowing on it does not count as a robot action.', 'Team Update: the Home crank is for human players. Robots may not operate it, admire it or lean on it.', 'Team Update: braking an Offshore turbine means touching its drum, not climbing its tower. Three seconds, then six feet away.', 'Team Update: a cell is worth what the turbines say at the moment it enters the Grid, not when it left the robot.'],
      chatter: [['Wind check', '{student} now announces "TWO TURBINES!" before every shot in practice, whether or not anything is turning.'], ['Crank arm', 'The human players arm-wrestled for the Home crank. {driver} lost and has been reassigned to feeding cells.'], ['Becalmed', 'The practice turbine ran down during lunch. {mentor} called it "a learning opportunity" and spun it back up with a broom.']]
    },
    subs: [
      { id: 'drive', name: 'Drivetrain', concepts: DRIVE },
      { id: 'intake', name: 'Intake & Indexer', concepts: [
        { id: 'bay', name: 'Chute loader (3 cells)', desc: 'The human player drops cells in at the chute. No pickup off the carpet, three cells at a time.', cost: 200, hours: 50, w: 6, cx: 1, areas: ['intake'],
          base: { intake: 40 }, ceil: { intake: 72 }, caps: { ground: false, station: true, storage: 3, wide: 1 }, look: { intake: 'none' } },
        { id: 'over', name: 'Over-bumper intake + 5-cell indexer', desc: 'Picks cells off the carpet and lines up five in a belt indexer.', cost: 800, hours: 150, w: 15, cx: 3, areas: ['intake', 'index'],
          base: { intake: 45 }, ceil: { intake: 88 }, caps: { ground: true, station: true, storage: 5, wide: 1 }, look: { intake: 'over' } },
        { id: 'wide', name: 'Full-width intake + fast indexer', desc: 'A frame-wide intake that never has to line up on a cell, and a five-cell indexer that does not jam.', cost: 1200, hours: 210, w: 18, cx: 4, areas: ['intake', 'index'],
          base: { intake: 48 }, ceil: { intake: 95 }, caps: { ground: true, station: true, storage: 5, wide: 1.3 }, look: { intake: 'wide' } }
      ] },
      { id: 'scorer', name: 'Shooter', concepts: [
        { id: 'dump', name: 'Low-inlet dumper', desc: 'Drives up to the wall and rolls cells into the low inlet. It cannot miss, and with three turbines turning that is still four points a cell.', cost: 200, hours: 60, w: 8, cx: 1, areas: ['shooter'],
          base: { scoreSpd: 45, accuracy: 60 }, ceil: { scoreSpd: 78, accuracy: 90 }, caps: { lowOnly: true }, look: { shooter: 'dump' } },
        { id: 'fixed', name: 'Fixed wall shooter', desc: 'A fixed-angle shooter for the high inlet from right in front of the wall.', cost: 800, hours: 120, w: 14, cx: 2, areas: ['shooter'],
          base: { scoreSpd: 42, accuracy: 48, range: 0 }, ceil: { scoreSpd: 80, accuracy: 90, range: 30 }, caps: { rmin: 1.2, rmax: 2.4 }, look: { shooter: 'fixed' } },
        { id: 'hood', name: 'Adjustable hood shooter', desc: 'Shoots from mid-range: far enough out to stand beside the Offshore turbine while it works.', cost: 1300, hours: 180, w: 17, cx: 3, areas: ['shooter', 'vision'],
          base: { scoreSpd: 40, accuracy: 42, range: 30 }, ceil: { scoreSpd: 88, accuracy: 93, range: 85 }, caps: { rmin: 1.2, rmax: 4.6 }, look: { shooter: 'hood' } },
        { id: 'turret', name: 'Turret + hood', desc: 'Aims by itself, shoots from almost anywhere in the far half and shrugs off a defender.', cost: 2000, hours: 250, w: 22, cx: 4, areas: ['turret', 'shooter', 'vision'],
          base: { scoreSpd: 38, accuracy: 40, range: 40 }, ceil: { scoreSpd: 94, accuracy: 95, range: 95 }, caps: { rmin: 1.2, rmax: 5.6, turret: true }, look: { shooter: 'turret' } }
      ] },
      { id: 'spinner', name: 'Drum Spinner', optional: true, minor: true, concepts: [
        { id: 'none', name: 'No spinner', desc: 'Leave the turbines to partners and the Home crank. Saves weight, hours and money.', cost: 0, hours: 0, w: 0, cx: 0, areas: [], base: {}, ceil: {}, caps: { spin: 0 }, look: {} },
        { id: 'roller', name: 'Spinner roller', desc: 'A powered wheel on an arm, pressed against a drive drum: about six seconds to wind a turbine up.', cost: 250, hours: 50, w: 4, cx: 1, areas: ['arm'],
          base: {}, ceil: {}, caps: { spin: 1 }, look: {} },
        { id: 'torque', name: 'High-torque spinner', desc: 'Two motors and a wide grippy wheel: a turbine is at full speed in three seconds.', cost: 550, hours: 95, w: 6, cx: 2, areas: ['arm', 'elec'],
          base: {}, ceil: {}, caps: { spin: 2 }, look: {} },
        // keeps a drum turning while the robot shoots beside it (rules: tick05)
        { id: 'side', name: 'Side roller', elite: true, desc: 'A spinner on the robot\'s flank: it keeps a drum turning while the robot stands beside the turbine and shoots, so the Offshore turbine never costs a trip. The hardest spinner of the year to package.', cost: 950, hours: 150, w: 8, cx: 4, areas: ['arm', 'elec'],
          base: {}, ceil: {}, caps: { spin: 2, spinShoot: true }, look: {} }
      ] },
      { id: 'endgame', name: 'Tower Climber', concepts: [
        { id: 'none', name: 'No endgame mechanism', desc: 'Skip the tower. Saves weight, hours and money.', cost: 0, hours: 0, w: 0, cx: 0, areas: [], base: {}, ceil: {}, caps: { endLevel: 0 }, look: { climber: 'none' } },
        { id: 'clamp', name: 'Pole clamp', desc: 'Clamps the tower and lifts the bumpers past the first hold.', cost: 500, hours: 100, w: 9, cx: 2, areas: ['climb'],
          base: { endgame: 44 }, ceil: { endgame: 90 }, caps: { endLevel: 1 }, look: { climber: 'hook' } },
        { id: 'climb', name: 'Climbing clamps', desc: 'Two clamps that walk up the tower to the second hold, four feet up.', cost: 1100, hours: 190, w: 14, cx: 4, areas: ['climb'],
          base: { endgame: 38 }, ceil: { endgame: 94 }, caps: { endLevel: 2 }, look: { climber: 'arms' } }
      ] },
      { id: 'soft', name: 'Software', concepts: [SOFT()] }
    ],
    archetypes: [
      { name: 'Turret + side roller', min: 90, pick: { drive: 'swerve', intake: 'wide', scorer: 'turret', spinner: ['side', 'torque'], endgame: 'climb' } },
      { name: 'Turret + spinner', min: 74, pick: { drive: 'swerve', intake: 'wide', scorer: 'turret', spinner: ['torque', 'roller'], endgame: ['climb', 'clamp'] } },
      { name: 'Hood shooter + spinner', min: 54, pick: { drive: 'swerve', intake: ['over', 'wide'], scorer: 'hood', spinner: ['torque', 'roller', 'none'], endgame: ['clamp', 'climb'] } },
      { name: 'Fixed shooter', min: 34, pick: { drive: ['wcd', 'swerve'], intake: 'over', scorer: ['fixed', 'hood'], spinner: ['roller', 'none'], endgame: ['clamp', 'none'] } },
      { name: 'Dumper + spinner', min: 14, pick: { drive: ['kit', 'wcd'], intake: ['over', 'bay'], scorer: 'dump', spinner: ['roller', 'none'], endgame: ['clamp', 'none'] } },
      { name: 'Kitbot', min: 0, pick: { drive: 'kit', intake: 'bay', scorer: 'dump', spinner: 'none', endgame: 'none' } }
    ]
  });

  // =====================================================================
  // DEEP FREEZE: curling with robots
  // =====================================================================
  S[2106] = Object.assign(FMT(), {
    year: 2106, hpLoad: 1, name: 'DEEP FREEZE', pieceName: 'Stones', sym: 'rotate',
    tagline: 'Slide stones onto the ice and into the rings, knock theirs out, and be closest to the button every time the score is frozen.',
    brief: [
      'A circle of ICE lies at the centre of the field with the HOUSE painted on it: an Outer ring, a Middle ring, an Inner ring and the Button. Robots keep off the ice. Each alliance has eight Stones (sliding pucks in its colour): robots carry up to two from the Sled Chutes on their own wall and slide them in from the edge. A stone may hit any other stone, and one knocked off the ice goes back to its own alliance.',
      'Four times a match the score is FROZEN: when auto ends, with 1:40 left, with 0:50 left and at the final buzzer. Every stone on the ice scores for the ring it lies in: Outer 2, Middle 3, Inner 5, Button 8, and the alliance with the stone closest to the centre adds 6 for SHOT ROCK. The first and last freezes count double. After each of the first three the House is swept and every stone goes back to its alliance\'s chutes, so a match is four ends, as in curling: what counts is where the stones lie at the moment of the freeze.',
      'In the last 30 seconds each alliance\'s human players may slide three stones by hand down their lane, and robots drive up an icy ramp to the LODGE: 4 points on the ramp, 10 on the deck. Win = 3 RP. Bonus RPs: Full House (all eight of your stones in the House at the final freeze), The Hammer (shot rock at three of the four freezes) and Last Orders (all three robots on the Lodge deck).'
    ],
    foul: { minor: 4, major: 12 },
    relevance: { swerve: 2, shooter: 3, turret: 1, elevator: 0, arm: 1, effector: 1, intake: 2, index: 1, climb: 1, vision: 3, autoPath: 2, elec: 2 },
    autoTiers: ['Leave the start zone', 'Slide the preload', 'Preload + 1 from the chute', 'Three-stone auto'], autoPieces: [0, 1, 2, 3],
    coachTargets: [{ id: 'auto', name: 'Best option' }, { id: 'draw', name: 'Draw to the button' }, { id: 'takeout', name: 'Take out their best stone' }, { id: 'guard', name: 'Guard our shot rock' }],
    endNames: ['—', 'Lodge ramp', 'Lodge deck'],
    news: {
      prot: 'No part of a robot may touch the ice, and nobody may touch a robot on its Lodge ramp or deck in the last 20 seconds. Stones, on the other hand, may be hit as hard as you like.',
      updates: ['Team Update: a stone is in a ring when any part of it is over the line. Bring your own measuring stick; the head referee already has one.', 'Team Update: sweeping is not a robot action. Neither is blowing on the ice, however many fans the robot has.', 'Team Update: a stone knocked off the ice goes back to its own alliance. Returning it "by accident" to your own chute is a major foul.', 'Team Update: human players slide stones in the last 30 seconds only, one hand, one stone at a time, both feet behind the wall.'],
      chatter: [['Hurry hard', '{student} has started shouting "HURRY HARD!" at the robot. The robot has not changed speed.'], ['The hammer', '{driver} drew to the button with the last stone in practice and has asked to be called "the skip". Requests are being considered.'], ['Ice time', 'The practice ice is a sheet of plastic and a can of furniture polish. {mentor} has banned socks-only sliding after the second incident.']]
    },
    subs: [
      { id: 'drive', name: 'Drivetrain', concepts: DRIVE },
      { id: 'intake', name: 'Stone Pickup', concepts: [
        { id: 'chute', name: 'Chute catcher (1 stone)', desc: 'A tray under the Sled Chute. No pickup off the carpet, one stone at a time.', cost: 200, hours: 50, w: 5, cx: 1, areas: ['intake'],
          base: { intake: 40 }, ceil: { intake: 72 }, caps: { ground: false, station: true, storage: 1, wide: 1 }, look: { intake: 'none' } },
        { id: 'floor', name: 'Floor pickup (1 stone)', desc: 'Scoops a stone off the carpet: a stone knocked off the ice is back in play before the chute has delivered another.', cost: 650, hours: 120, w: 10, cx: 3, areas: ['intake'],
          base: { intake: 45 }, ceil: { intake: 88 }, caps: { ground: true, station: true, storage: 1, wide: 1 }, look: { intake: 'over' } },
        { id: 'two', name: 'Two-stone pickup', desc: 'A wide scoop and a second berth: two stones a trip, and two slides before anyone can answer the first.', cost: 1150, hours: 190, w: 14, cx: 4, areas: ['intake', 'index'],
          base: { intake: 48 }, ceil: { intake: 95 }, caps: { ground: true, station: true, storage: 2, wide: 1.3 }, look: { intake: 'wide' } }
      ] },
      { id: 'scorer', name: 'Slider', concepts: [
        { id: 'push', name: 'Plain pusher', desc: 'Drives the stone at the ice and lets go. It reaches the outer rings, more or less.', cost: 200, hours: 50, w: 6, cx: 1, areas: ['shooter'],
          base: { scoreSpd: 46, accuracy: 30 }, ceil: { scoreSpd: 80, accuracy: 62 }, caps: { slide: 1 }, look: { shooter: 'dump' } },
        { id: 'launch', name: 'Speed-controlled launcher', desc: 'A belt that releases the stone at a chosen speed: it can stop one on the button, and hit another stone hard enough to move it.', cost: 900, hours: 140, w: 12, cx: 3, areas: ['shooter', 'vision'],
          base: { scoreSpd: 42, accuracy: 42 }, ceil: { scoreSpd: 86, accuracy: 90 }, caps: { slide: 2 }, look: { shooter: 'fixed' } },
        { id: 'hammer', name: 'Take-out launcher', desc: 'Twin belts with the power to drive a stone clean out of the House and the control to stop its own stone where the other one was.', cost: 1500, hours: 210, w: 16, cx: 4, areas: ['shooter', 'vision'],
          base: { scoreSpd: 40, accuracy: 42 }, ceil: { scoreSpd: 90, accuracy: 94 }, caps: { slide: 3, takeout: true }, look: { shooter: 'hood' } },
        // curls round a guard (rules: slide06)
        { id: 'curl', name: 'Curling launcher', elite: true, desc: 'A take-out launcher that also spins the stone as it lets go, so it curls round a guard on the way in. The hardest slider of the year, and nothing in front of a stone is safe from it.', cost: 2100, hours: 280, w: 18, cx: 5, areas: ['shooter', 'turret', 'vision'],
          base: { scoreSpd: 40, accuracy: 42 }, ceil: { scoreSpd: 90, accuracy: 96 }, caps: { slide: 3, takeout: true, curl: true }, look: { shooter: 'turret' } }
      ] },
      { id: 'endgame', name: 'Ice Kit', concepts: [
        { id: 'none', name: 'No ice kit', desc: 'A drivetrain with good grip can still get onto the ramp. Saves weight, hours and money.', cost: 0, hours: 0, w: 0, cx: 0, areas: [], base: {}, ceil: {}, caps: { endLevel: 0 }, look: { climber: 'none' } },
        { id: 'grip', name: 'Grip wheels', desc: 'Studded wheels that drop down for the icy ramp and drive the robot onto the Lodge deck.', cost: 400, hours: 80, w: 7, cx: 2, areas: ['climb'],
          base: { endgame: 46 }, ceil: { endgame: 90 }, caps: { endLevel: 2 }, look: { climber: 'hook' } },
        { id: 'winch', name: 'Lodge winch', desc: 'A hook for the Lodge post and a winch: slower, but the ice has no say in it.', cost: 800, hours: 140, w: 10, cx: 3, areas: ['climb'],
          base: { endgame: 50 }, ceil: { endgame: 96 }, caps: { endLevel: 2, climbAdd: 0.1, climbK: 1.25 }, look: { climber: 'hook2' } }
      ] },
      { id: 'soft', name: 'Software', concepts: [SOFT()] }
    ],
    archetypes: [
      { name: 'Curling launcher + two stones', min: 90, pick: { drive: 'swerve', intake: 'two', scorer: ['curl', 'hammer'], endgame: 'winch' } },
      { name: 'Take-out launcher', min: 70, pick: { drive: 'swerve', intake: ['two', 'floor'], scorer: 'hammer', endgame: ['winch', 'grip'] } },
      { name: 'Draw specialist', min: 46, pick: { drive: ['swerve', 'wcd'], intake: ['floor', 'two'], scorer: 'launch', endgame: ['grip', 'winch'] } },
      { name: 'Launcher on a kit chassis', min: 28, pick: { drive: ['wcd', 'kit'], intake: ['floor', 'chute'], scorer: 'launch', endgame: ['grip', 'none'] } },
      { name: 'Pusher', min: 12, pick: { drive: ['kit', 'wcd'], intake: ['chute', 'floor'], scorer: 'push', endgame: ['grip', 'none'] } },
      { name: 'Kitbot', min: 0, pick: { drive: 'kit', intake: 'chute', scorer: 'push', endgame: 'none' } }
    ]
  });

  // =====================================================================
  // EVEN KEEL: load the ship without tipping it
  // =====================================================================
  S[2107] = Object.assign(FMT(), {
    year: 2107, hpLoad: 1, name: 'EVEN KEEL', pieceName: 'Containers', sym: 'rotate',
    tagline: 'Stack containers on your ship without tipping it: too much on one side and nothing more scores until it is level again.',
    brief: [
      'Each alliance loads a SHIP that stands with its stern against its own wall and rolls on its keel. Robots carry Containers (foam cubes) from the Quay chutes in the far corners and stack them on eight spots, four along the PORT rail and four along STARBOARD, up to three high: 2 points on tier 1, 3 on tier 2, 5 on tier 3 (auto: 4, 5, 7).',
      'The ship LISTS when one side carries three containers more than the other: its lights flash and nothing placed scores until it is level again. At six too many the top tier of the heavy side slides off. Robots may take containers off their own ship, and the BOSUN, a human player at the stern, trims it by moving six ballast bags between two trays, one at a time. The Harbour around your ship is closed to opponents.',
      'In the last 30 seconds robots hang from the two DAVITS at the bow, one on each side (12 each; parked in the Harbour 3). A hanging robot weighs as much as four containers on its side, and a ship that is level at the final buzzer with 12 or more containers aboard scores 15 more. Win = 3 RP. Bonus RPs: Cast Off (four containers aboard and the ship level when auto ends), Laden (20 containers aboard at the end; 22 at a District Championship, 24 at the Championship) and Even Keel (two davit hangs and a level ship).'
    ],
    foul: { minor: 3, major: 10 },
    relevance: { swerve: 2, shooter: 0, turret: 0, elevator: 3, arm: 2, effector: 3, intake: 3, index: 0, climb: 3, vision: 2, autoPath: 3, elec: 2 },
    autoTiers: ['Leave the start zone', 'Preload aboard', 'Preload + 1 from mid-field', 'Three-container auto'], autoPieces: [0, 1, 2, 3],
    coachTargets: [{ id: 'auto', name: 'Load the light side' }, { id: 'port', name: 'Our robot loads port' }, { id: 'star', name: 'Our robot loads starboard' }, { id: 'high', name: 'Stack high' }],
    endNames: ['Park', 'Davit'],
    news: {
      prot: 'The Harbour around a ship is closed to the other alliance, and so is a Quay chute while a robot is loading. Touch a robot on a davit in the last 30 seconds and the referees award the hang.',
      updates: ['Team Update: a ship is level inside two degrees. The field measures it; the drive coach squinting at it does not count.', 'Team Update: robots may take containers off their own ship to level it. They may not take the ballast bags, which belong to the Bosun.', 'Team Update: a container thrown onto the deck from more than two feet is Dropped Cargo, and usually overboard as well.', 'Team Update: a robot on a davit weighs what four containers weigh. Yes, the field crew weighed one.'],
      chatter: [['Trim', '{student} keeps a running count of port and starboard on a clicker in each hand. Nobody is allowed to talk to {student} during matches.'], ['The Bosun', 'The Bosun has started saying "steady as she goes" when moving ballast bags. {mentor} has asked for it to stop. It has not stopped.'], ['List', 'The practice ship listed, three containers slid off, and one of them is still under the vending machine.']]
    },
    subs: [
      { id: 'drive', name: 'Drivetrain', concepts: DRIVE },
      { id: 'intake', name: 'Container Intake', concepts: [
        { id: 'chute', name: 'Chute catcher', desc: 'A tray that takes a container from the Quay chute. No pickup off the carpet.', cost: 200, hours: 50, w: 5, cx: 1, areas: ['intake'],
          base: { intake: 40 }, ceil: { intake: 72 }, caps: { ground: false, station: true, wide: 1 }, look: { intake: 'none' } },
        { id: 'floor', name: 'Wheeled floor intake', desc: 'Compliant wheels on the frame pull a container in off the carpet and pass it to the gripper.', cost: 650, hours: 120, w: 10, cx: 3, areas: ['intake'],
          base: { intake: 45 }, ceil: { intake: 88 }, caps: { ground: true, station: true, wide: 1 }, look: { intake: 'over' } },
        { id: 'wide', name: 'Wide intake with centring wheels', desc: 'Touch it, own it: takes a container at full speed from any angle and squares it up by itself.', cost: 1050, hours: 180, w: 13, cx: 4, areas: ['intake'],
          base: { intake: 48 }, ceil: { intake: 95 }, caps: { ground: true, station: true, wide: 1.3 }, look: { intake: 'wide' } }
      ] },
      { id: 'scorer', name: 'Lift', pneu: true, concepts: [
        { id: 't1', name: 'Deck-height arm', desc: 'Lifts a container onto the deck: tier 1 only. Somebody has to lay the bottom tier.', cost: 350, hours: 70, w: 8, cx: 1, areas: ['arm', 'effector'],
          base: { scoreSpd: 46, accuracy: 54 }, ceil: { scoreSpd: 84, accuracy: 93 }, caps: { reach: 1, tall: 0.4 }, look: { manip: 'low' } },
        { id: 't2', name: 'Two-tier arm', desc: 'A longer arm that sets a container on top of another.', cost: 750, hours: 125, w: 11, cx: 2, areas: ['arm', 'effector'],
          base: { scoreSpd: 43, accuracy: 52 }, ceil: { scoreSpd: 85, accuracy: 93 }, caps: { reach: 2, tall: 0.9 }, look: { manip: 'arm' } },
        { id: 't3', name: 'Three-tier elevator', desc: 'An elevator to the top tier, four and a half feet up on a deck that moves.', cost: 1250, hours: 190, w: 16, cx: 3, areas: ['elevator', 'effector'],
          base: { scoreSpd: 41, accuracy: 50 }, ceil: { scoreSpd: 88, accuracy: 93 }, caps: { reach: 3, tall: 1.4 }, look: { manip: 'elevator' } },
        { id: 'fast', name: 'Fast elevator + wrist', desc: 'A quick elevator with a wrist that reaches over the rail: every tier in about two thirds of the time.', cost: 1750, hours: 240, w: 19, cx: 4, areas: ['elevator', 'arm', 'effector'],
          base: { scoreSpd: 44, accuracy: 50 }, ceil: { scoreSpd: 96, accuracy: 95 }, caps: { reach: 3, tall: 1.4, wrist: true }, look: { manip: 'elevwrist' } },
        // two containers a trip, set down as a stack (rules: place07)
        { id: 'double', name: 'Fast elevator + double gripper', elite: true, desc: 'A gripper two containers tall: it carries a stack of two and sets it down in one move. The hardest lift of the year, and two at once on the wrong side lists the ship twice as fast.', cost: 2300, hours: 300, w: 23, cx: 5, areas: ['elevator', 'arm', 'effector'],
          base: { scoreSpd: 44, accuracy: 50 }, ceil: { scoreSpd: 96, accuracy: 95 }, caps: { reach: 3, tall: 1.7, wrist: true, storage: 2 }, look: { manip: 'elevwrist' } }
      ] },
      { id: 'endgame', name: 'Davit Climber', concepts: [
        NONE_END,
        { id: 'hook', name: 'Hook and winch', desc: 'A hook over the davit bar and a winch. The ship moves as the robot comes off the ground.', cost: 550, hours: 100, w: 10, cx: 2, areas: ['climb'],
          base: { endgame: 40 }, ceil: { endgame: 88 }, caps: { endLevel: 1 }, look: { climber: 'hook' } },
        { id: 'fast', name: 'Fast two-hook climber', desc: 'Two hooks and a geared winch: up in a few seconds, and steady while the deck rolls.', cost: 1050, hours: 170, w: 13, cx: 3, areas: ['climb'],
          base: { endgame: 46 }, ceil: { endgame: 95 }, caps: { endLevel: 1, climbK: 0.75, climbAdd: 0.06 }, look: { climber: 'hook2' } }
      ] },
      { id: 'soft', name: 'Software', concepts: [SOFT()] }
    ],
    archetypes: [
      { name: 'Double gripper', min: 90, pick: { drive: 'swerve', intake: 'wide', scorer: ['double', 'fast'], endgame: 'fast' } },
      { name: 'Fast elevator + wrist', min: 74, pick: { drive: 'swerve', intake: 'wide', scorer: 'fast', endgame: ['fast', 'hook'] } },
      { name: 'Three-tier elevator', min: 54, pick: { drive: 'swerve', intake: ['floor', 'wide'], scorer: 't3', endgame: ['hook', 'fast'] } },
      { name: 'Two-tier arm', min: 34, pick: { drive: ['wcd', 'swerve'], intake: 'floor', scorer: 't2', endgame: ['hook', 'none'] } },
      { name: 'Deck loader', min: 14, pick: { drive: ['kit', 'wcd'], intake: ['floor', 'chute'], scorer: 't1', endgame: ['hook', 'none'] } },
      { name: 'Kitbot', min: 0, pick: { drive: 'kit', intake: 'chute', scorer: 't1', endgame: 'none' } }
    ]
  });

  // =====================================================================
  // MOTHERLODE: two colours of ore, and the wrong one costs points
  // =====================================================================
  S[2108] = Object.assign(FMT(), {
    year: 2108, name: 'MOTHERLODE', pieceName: 'Ore', sym: 'rotate',
    tagline: 'Fill your skip with your own colour of ore, keep theirs out of it, and haul the load to the surface.',
    brief: [
      'Two colours of Ore (small foam balls) lie mixed all over the field: copper for red, cobalt for blue, and a few GOLD nuggets that count for either. Robots carry up to six and shoot them into their SKIP, an open bucket under the headframe at their own end: 3 points for their own ore and 6 for gold (6 and 9 in auto), but MINUS 2 for every piece of the other colour. The Ore Pass under the Skip takes any colour for 1 point (2 in auto).',
      'Most of the ore starts in two VEINS above the side walls at mid-field. A vein dumps its load, an avalanche of 30 mixed ore and four gold, when a robot drives into its detonator in teleop (5 points). Firing one feeds both alliances, so when to do it is the big call. The Claim around your Skip is closed to opponents, and shooting ore at their Skip is a major foul.',
      'In the last 30 seconds one robot pulls the HOIST CHAIN to raise the Skip: Halfway is 10 points; the Surface is 25, plus 1 for each of your ore aboard (up to 30). The others park in the Claim (4). Win = 3 RP. Bonus RPs: Prospect (eight of your ore in the Skip in auto), Payload (40 of your 50 ore in the Skip and the Skip at the Surface; 45 at a District Championship, all 50 at the Championship) and Gold Rush (five gold nuggets).'
    ],
    foul: { minor: 3, major: 10 },
    relevance: { swerve: 2, shooter: 3, turret: 2, elevator: 0, arm: 0, effector: 0, intake: 3, index: 3, climb: 2, vision: 3, autoPath: 2, elec: 2 },
    autoTiers: ['Leave the start zone', 'Preloads in the Skip', 'Preloads + a sweep of ore', 'Eight-ore auto'], autoPieces: [0, 3, 6, 8],
    coachTargets: [{ id: 'auto', name: 'Best option' }, { id: 'fire', name: 'Fire a vein now' }, { id: 'hold', name: 'Leave the veins alone' }, { id: 'gold', name: 'Gold first' }],
    endNames: ['Park', 'Halfway', 'Surface'],
    news: {
      prot: 'The Claim around a Skip is closed to the other alliance, and shooting ore at their Skip is a major foul for every piece. A robot holding its Hoist Chain in the last 30 seconds may not be touched: the referees award the Surface.',
      updates: ['Team Update: gold counts for whoever\'s Skip it lands in. It does not count twice, however shiny it is.', 'Team Update: the gate at the Skip\'s rim counts colours. Arguing with the gate is not a recognised appeal.', 'Team Update: a robot may hold the other alliance\'s ore for five seconds. Hoarding their copper to "keep it safe" is still hoarding.', 'Team Update: detonators are pushed, not rammed. The plunger is rated for a robot, not for a robot at full speed.'],
      chatter: [['Colour-blind', 'The sorter rejected every piece of ore for an hour. {student} had the sensor looking at the carpet.'], ['Gold fever', '{driver} drove the length of the practice field for one gold nugget and past eleven pieces of perfectly good ore.'], ['Fire in the hole', 'The team shouts "FIRE IN THE HOLE" before every avalanche. The custodian has asked, twice, what exactly is being fired.']]
    },
    subs: [
      { id: 'drive', name: 'Drivetrain', concepts: DRIVE },
      { id: 'intake', name: 'Intake & Sorter', concepts: [
        { id: 'narrow', name: 'Narrow intake (3 ore)', desc: 'A roller a ball and a half wide: the driver has to pick out each piece of the right colour and line up on it.', cost: 300, hours: 70, w: 7, cx: 2, areas: ['intake'],
          base: { intake: 42 }, ceil: { intake: 78 }, caps: { ground: true, storage: 3, wide: 1 }, look: { intake: 'over' } },
        { id: 'wide', name: 'Wide intake + 6-ore hopper', desc: 'Frame-wide: it takes whatever it drives over, which is the trouble. The wrong colour comes aboard too, and the driver has to notice and spit it out.', cost: 850, hours: 150, w: 14, cx: 3, areas: ['intake', 'index'],
          base: { intake: 46 }, ceil: { intake: 90 }, caps: { ground: true, storage: 6, wide: 1.3, sloppy: true }, look: { intake: 'wide', hopper: 6 } },
        { id: 'sort', name: 'Colour-sorting intake', desc: 'A sensor and a kicker behind the rollers: the wrong colour never reaches the hopper, so the robot can sweep straight through a mixed pile.', cost: 1400, hours: 220, w: 17, cx: 4, areas: ['intake', 'index', 'vision'],
          base: { intake: 48 }, ceil: { intake: 95 }, caps: { ground: true, storage: 6, wide: 1.3, sort: true }, look: { intake: 'wide', hopper: 6 } },
        // sweeps a whole pile in one pass (rules: collect08)
        { id: 'sweep', name: 'Sorting intake + sweeper arms', elite: true, desc: 'A colour-sorting intake between two folding arms that funnel a whole pile into it: after an avalanche it fills its hopper in one pass. The hardest intake of the year.', cost: 1950, hours: 280, w: 20, cx: 5, areas: ['intake', 'index', 'vision'],
          base: { intake: 48 }, ceil: { intake: 96 }, caps: { ground: true, storage: 6, wide: 1.3, sort: true, sweep: true }, look: { intake: 'wide', hopper: 6 } }
      ] },
      { id: 'scorer', name: 'Shooter', concepts: [
        { id: 'dump', name: 'Ore Pass dumper', desc: 'Rolls ore into the Ore Pass at carpet level. One point each, any colour, hard to miss.', cost: 200, hours: 60, w: 8, cx: 1, areas: ['shooter'],
          base: { scoreSpd: 45, accuracy: 60 }, ceil: { scoreSpd: 78, accuracy: 90 }, caps: { lowOnly: true }, look: { shooter: 'dump' } },
        { id: 'lob', name: 'Lob shooter', desc: 'A fixed arc into the Skip from just outside its rim.', cost: 750, hours: 115, w: 13, cx: 2, areas: ['shooter'],
          base: { scoreSpd: 42, accuracy: 48, range: 0 }, ceil: { scoreSpd: 80, accuracy: 90, range: 30 }, caps: { rmin: 1.0, rmax: 2.2 }, look: { shooter: 'fixed' } },
        { id: 'hood', name: 'Adjustable hood shooter', desc: 'Drops ore into the Skip from anywhere in your half.', cost: 1300, hours: 180, w: 17, cx: 3, areas: ['shooter', 'vision'],
          base: { scoreSpd: 40, accuracy: 42, range: 30 }, ceil: { scoreSpd: 88, accuracy: 93, range: 85 }, caps: { rmin: 1.0, rmax: 4.6 }, look: { shooter: 'hood' } },
        { id: 'turret', name: 'Turret + hood', desc: 'Aims by itself and shoots while the robot is still sweeping up ore, from mid-field if it has to.', cost: 2000, hours: 250, w: 22, cx: 4, areas: ['turret', 'shooter', 'vision'],
          base: { scoreSpd: 38, accuracy: 40, range: 40 }, ceil: { scoreSpd: 94, accuracy: 95, range: 95 }, caps: { rmin: 1.0, rmax: 6.0, turret: true }, look: { shooter: 'turret' } }
      ] },
      { id: 'endgame', name: 'Hoist', concepts: [
        NONE_END,
        { id: 'hook', name: 'Tow hook', desc: 'Hooks the tow ring and drives away with the chain. How far the Skip rises is a question of grip: tank treads and West Coast drives pull best.', cost: 250, hours: 50, w: 4, cx: 1, areas: ['climb'],
          base: { endgame: 44 }, ceil: { endgame: 84 }, caps: { endLevel: 2, tow: true }, look: { climber: 'hook' } },
        { id: 'winch', name: 'Chain winch', desc: 'Parks against the headframe and reels the chain in on a sprocket: the Skip goes up whatever the drivetrain.', cost: 900, hours: 150, w: 12, cx: 3, areas: ['climb'],
          base: { endgame: 46 }, ceil: { endgame: 95 }, caps: { endLevel: 2, climbAdd: 0.05 }, look: { climber: 'hook2' } }
      ] },
      { id: 'soft', name: 'Software', concepts: [SOFT()] }
    ],
    archetypes: [
      { name: 'Turret + sweeper sorter', min: 90, pick: { drive: 'swerve', intake: ['sweep', 'sort'], scorer: 'turret', endgame: 'winch' } },
      { name: 'Turret + sorter', min: 74, pick: { drive: 'swerve', intake: 'sort', scorer: 'turret', endgame: ['winch', 'hook'] } },
      { name: 'Hood shooter + sorter', min: 56, pick: { drive: 'swerve', intake: ['sort', 'wide'], scorer: 'hood', endgame: ['hook', 'winch'] } },
      { name: 'Lob shooter', min: 34, pick: { drive: ['wcd', 'swerve'], intake: ['wide', 'narrow'], scorer: ['lob', 'hood'], endgame: ['hook', 'none'] } },
      { name: 'Ore Pass runner', min: 14, pick: { drive: ['kit', 'wcd'], intake: ['wide', 'narrow'], scorer: 'dump', endgame: ['hook', 'none'] } },
      { name: 'Kitbot', min: 0, pick: { drive: 'kit', intake: 'narrow', scorer: 'dump', endgame: 'none' } }
    ]
  });

  // =====================================================================
  // SIGNAL FIRE: a map of seven posts to hold
  // =====================================================================
  S[2109] = Object.assign(FMT(), {
    year: 2109, hpLoad: 1, name: 'SIGNAL FIRE', pieceName: 'Rings', sym: 'rotate',
    tagline: 'Drop your rings on seven beacon posts to own them: the field pays out for every post you hold, every ten seconds.',
    brief: [
      'Seven BEACON POSTS stand across the field: a Home post in front of each alliance wall, four Field posts and the tall Centre post. Robots carry up to two Rings in their alliance\'s colour and drop them over a post (1 point; 3 in auto). A post is OWNED by the colour with more rings on it; if the count is level, by the colour of the top ring. A post holds nine rings (the Centre post eleven): once one colour has more than half of them, the post can never change hands.',
      'Every ten seconds of teleop the field PULSES: each alliance scores 1 point for every post it owns, 2 for the Centre post. Posts owned when auto ends score 4 (Centre 8) and posts owned at the final buzzer 6 (Centre 12). Rings come from the chutes on your own wall, and a human player, the Keeper, may toss rings onto your Home post by hand. A robot touching its own Home Ring may not be hit.',
      'In the last 30 seconds robots hang from the LIGHTHOUSE bar in their own corner (12 each; parked under it 3). Win = 3 RP. Bonus RPs: Coastline (five posts owned at the end), Long Watch (60 Pulse points; 66 at a District Championship, 72 at the Championship) and Lamplighter (two hangs and the Centre post owned at the end).'
    ],
    foul: { minor: 3, major: 10 },
    relevance: { swerve: 3, shooter: 0, turret: 0, elevator: 2, arm: 3, effector: 3, intake: 2, index: 0, climb: 3, vision: 2, autoPath: 3, elec: 2 },
    autoTiers: ['Leave the start zone', 'Preload on the Home post', 'Preload + 1 on a Field post', 'Three-ring auto'], autoPieces: [0, 1, 2, 3],
    coachTargets: [{ id: 'auto', name: 'Best option' }, { id: 'near', name: 'Lock the near posts' }, { id: 'centre', name: 'Fight for the Centre' }, { id: 'raid', name: 'Raid their side' }],
    endNames: ['Park', 'Lighthouse'],
    news: {
      prot: 'A robot touching its own Home Ring may not be hit, though anybody may drop rings on any post. A robot on the Lighthouse in the last 30 seconds may not be touched: the referees award the hang.',
      updates: ['Team Update: rings never come off a post. A robot that takes one off takes a major foul and a yellow card with it.', 'Team Update: the top ring breaks a tie. The field reads it; a human player pointing at it does not count.', 'Team Update: a full post is locked. Balancing one more ring on top is a foul, and it falls off anyway.', 'Team Update: the Keeper tosses one ring at a time, from inside the box. A running start is outside the box.'],
      chatter: [['Ring toss', 'The Keeper has landed eleven in a row on the practice post and has been asked to stop offering to do it blindfolded.'], ['Pulse', '{student} set a ten-second timer that goes "PULSE!" all through practice. It also went off in the library.'], ['Top ring', '{driver} dropped the tie-breaking ring on the Centre post with two seconds left in a practice match and did a lap of the shop.']]
    },
    subs: [
      { id: 'drive', name: 'Drivetrain', concepts: DRIVE },
      { id: 'intake', name: 'Ring Intake', concepts: [
        { id: 'chute', name: 'Chute catcher (1 ring)', desc: 'A peg that takes a ring from the chute. No pickup off the carpet, one ring at a time.', cost: 200, hours: 50, w: 4, cx: 1, areas: ['intake'],
          base: { intake: 40 }, ceil: { intake: 72 }, caps: { ground: false, station: true, storage: 1, wide: 1 }, look: { intake: 'none' } },
        { id: 'floor', name: 'Floor pickup (1 ring)', desc: 'A roller that slides a ring off the carpet onto the arm.', cost: 600, hours: 110, w: 9, cx: 3, areas: ['intake'],
          base: { intake: 45 }, ceil: { intake: 88 }, caps: { ground: true, station: true, storage: 1, wide: 1 }, look: { intake: 'over' } },
        { id: 'two', name: 'Two-ring pickup', desc: 'A wide roller and a second peg: two rings a trip, off the carpet or from the chute.', cost: 1050, hours: 180, w: 13, cx: 4, areas: ['intake', 'index'],
          base: { intake: 48 }, ceil: { intake: 95 }, caps: { ground: true, station: true, storage: 2, wide: 1.3 }, look: { intake: 'wide' } }
      ] },
      { id: 'scorer', name: 'Lift', pneu: true, concepts: [
        { id: 'drop', name: 'Post dropper', desc: 'A short arm that lowers a ring over a four-foot post. It cannot reach the Centre post.', cost: 400, hours: 80, w: 8, cx: 1, areas: ['arm', 'effector'],
          base: { scoreSpd: 46, accuracy: 54 }, ceil: { scoreSpd: 84, accuracy: 93 }, caps: { reach: 1, tall: 0.5 }, look: { manip: 'arm' } },
        { id: 'tall', name: 'Centre-post arm', desc: 'A longer arm that reaches over the six-foot Centre post, the one that pays double.', cost: 900, hours: 150, w: 12, cx: 3, areas: ['arm', 'effector'],
          base: { scoreSpd: 42, accuracy: 50 }, ceil: { scoreSpd: 86, accuracy: 93 }, caps: { reach: 2, tall: 1.2 }, look: { manip: 'arm' } },
        { id: 'fast', name: 'Fast elevator + wrist', desc: 'An elevator with a wrist that drops a ring over any post without squaring up to it first.', cost: 1500, hours: 220, w: 17, cx: 4, areas: ['elevator', 'arm', 'effector'],
          base: { scoreSpd: 44, accuracy: 50 }, ceil: { scoreSpd: 96, accuracy: 95 }, caps: { reach: 2, tall: 1.4, wrist: true }, look: { manip: 'elevwrist' } },
        // both rings in one move (rules: place09)
        { id: 'stack', name: 'Elevator + two-ring stacker', elite: true, desc: 'Drops both rings in one move: two rings on a post before anybody can answer the first. The hardest lift of the year, and it decides who owns the Centre.', cost: 2100, hours: 290, w: 21, cx: 5, areas: ['elevator', 'arm', 'effector'],
          base: { scoreSpd: 44, accuracy: 50 }, ceil: { scoreSpd: 96, accuracy: 95 }, caps: { reach: 2, tall: 1.6, wrist: true, both: true }, look: { manip: 'elevwrist' } }
      ] },
      { id: 'endgame', name: 'Lighthouse Climber', concepts: [
        NONE_END,
        { id: 'hook', name: 'Hook and winch', desc: 'A hook over the Lighthouse bar and a winch.', cost: 500, hours: 100, w: 10, cx: 2, areas: ['climb'],
          base: { endgame: 42 }, ceil: { endgame: 90 }, caps: { endLevel: 1 }, look: { climber: 'hook' } },
        { id: 'fast', name: 'Fast two-hook climber', desc: 'Up in a few seconds, so the robot can stay out placing rings until the last pulse.', cost: 1000, hours: 170, w: 13, cx: 3, areas: ['climb'],
          base: { endgame: 46 }, ceil: { endgame: 95 }, caps: { endLevel: 1, climbK: 0.6, climbAdd: 0.05 }, look: { climber: 'hook2' } }
      ] },
      { id: 'soft', name: 'Software', concepts: [SOFT()] }
    ],
    archetypes: [
      { name: 'Two-ring stacker', min: 90, pick: { drive: 'swerve', intake: 'two', scorer: ['stack', 'fast'], endgame: 'fast' } },
      { name: 'Fast elevator + two rings', min: 72, pick: { drive: 'swerve', intake: 'two', scorer: 'fast', endgame: ['fast', 'hook'] } },
      { name: 'Centre-post arm', min: 50, pick: { drive: 'swerve', intake: ['floor', 'two'], scorer: 'tall', endgame: ['hook', 'fast'] } },
      { name: 'Post dropper', min: 28, pick: { drive: ['wcd', 'swerve'], intake: 'floor', scorer: ['drop', 'tall'], endgame: ['hook', 'none'] } },
      { name: 'Home-post runner', min: 12, pick: { drive: ['kit', 'wcd'], intake: ['chute', 'floor'], scorer: 'drop', endgame: ['hook', 'none'] } },
      { name: 'Kitbot', min: 0, pick: { drive: 'kit', intake: 'chute', scorer: 'drop', endgame: 'none' } }
    ]
  });

  // =====================================================================
  // BRIDGEWORK: a field that opens up mid-match
  // =====================================================================
  S[2110] = Object.assign(FMT(), {
    year: 2110, hpLoad: 1, name: 'BRIDGEWORK', pieceName: 'Crates & Deck Panels', sym: 'rotate',
    tagline: 'A river cuts the field in two. Lay deck panels to open a crossing, then carry crates to the dock on the far bank.',
    brief: [
      'A RIVER runs across the middle of the field and no robot can cross it. Each alliance starts with 20 Crates on its own bank and scores them in its HOME DOCK on its own wall: 2 points on the low shelf, 3 on the high shelf (4 and 5 in auto). Its second dock, the EXPORT DOCK, stands in a corner of the other alliance\'s half and pays three times as much: 6 low, 8 high.',
      'Three CROSSINGS span the River. Each needs five Deck Panels, laid from either bank by either alliance (2 points a panel, 4 in auto). When the fifth goes in the Crossing OPENS, for both alliances: 10 points to the alliance that laid three or more of its panels (15 in auto). From then on your robots can reach your Export Dock, and theirs can reach your half. Crates scored in an Export Dock go to the other alliance\'s human players.',
      'In the last 30 seconds a robot standing on a Crossing scores 8 (one robot a Crossing), with 10 more for an alliance that holds two of them, and one robot per alliance may hang from the ARCH over the centre Crossing for 15. Win = 3 RP. Bonus RPs: Linked (all three Crossings open at the end: both alliances earn it), Trade (12 crates in your Export Dock; 14 at a District Championship, 16 at the Championship) and Home Market (20 crates in your Home Dock).'
    ],
    foul: { minor: 3, major: 10 },
    relevance: { swerve: 2, shooter: 0, turret: 0, elevator: 1, arm: 3, effector: 3, intake: 3, index: 1, climb: 2, vision: 2, autoPath: 3, elec: 2 },
    autoTiers: ['Leave the start zone', 'Preload in the Home Dock', 'Preload + 1 crate', 'Three-piece auto'], autoPieces: [0, 1, 2, 3],
    coachTargets: [{ id: 'auto', name: 'Best option' }, { id: 'build', name: 'Build a Crossing first' }, { id: 'home', name: 'Stay home' }, { id: 'export', name: 'Export everything' }],
    endNames: ['—', 'On a Crossing', 'Arch'],
    news: {
      prot: 'No part of a robot may enter the River, a robot on a Crossing may not be hit, and nobody may stop on one for more than three seconds before the last 30. Touch a robot on the Arch in the last 30 seconds and the referees award the hang.',
      updates: ['Team Update: a Crossing is open when its fifth panel is seated and the barriers lift. Driving at the barriers does not hurry them.', 'Team Update: deck panels are laid, not thrown. A panel that lands in the River stays there, and so does the foul.', 'Team Update: crates scored in an Export Dock go to the other alliance\'s human players. Yes, you are feeding them. That is why it pays three times as much.', 'Team Update: lifting a panel out of a Crossing is a red card. Do not ask whether it was "only a little".'],
      chatter: [['Toll', '{student} proposed charging the other alliance a toll for the Crossing your team built. The rules do not provide for tolls.'], ['Plank walk', '{driver} laid the fifth panel in practice, the barriers lifted, and the robot drove straight across into the wall on the far bank.'], ['Customs', 'The human players stamp every crate that comes out of the Export Dock with "INSPECTED". {mentor} has asked where the stamp came from.']]
    },
    subs: [
      { id: 'drive', name: 'Drivetrain', concepts: DRIVE },
      { id: 'intake', name: 'Crate Intake', concepts: [
        { id: 'chute', name: 'Chute catcher (1 crate)', desc: 'A tray that takes a crate from the chute. No pickup off the carpet.', cost: 200, hours: 50, w: 5, cx: 1, areas: ['intake'],
          base: { intake: 40 }, ceil: { intake: 72 }, caps: { ground: false, station: true, storage: 1, wide: 1 }, look: { intake: 'none' } },
        { id: 'floor', name: 'Wheeled floor intake (1 crate)', desc: 'Compliant wheels pull a crate in off the carpet.', cost: 600, hours: 110, w: 10, cx: 3, areas: ['intake'],
          base: { intake: 45 }, ceil: { intake: 88 }, caps: { ground: true, station: true, storage: 1, wide: 1 }, look: { intake: 'over' } },
        { id: 'wide', name: 'Wide intake + second berth', desc: 'Takes a crate at any angle and holds two: twice the load on the long haul to the Export Dock.', cost: 1050, hours: 180, w: 14, cx: 4, areas: ['intake', 'index'],
          base: { intake: 48 }, ceil: { intake: 95 }, caps: { ground: true, station: true, storage: 2, wide: 1.3 }, look: { intake: 'wide' } }
      ] },
      { id: 'panel', name: 'Panel Handler', optional: true, minor: true, concepts: [
        { id: 'none', name: 'No panel handler', desc: 'Leave the Crossings to somebody else. Saves weight, hours and money.', cost: 0, hours: 0, w: 0, cx: 0, areas: [], base: {}, ceil: {}, caps: { panel: 0 }, look: {} },
        { id: 'fork', name: 'Panel fork', desc: 'A fork that takes a deck panel at the rack and lowers it into a Crossing. The robot carries nothing else while it has one.', cost: 300, hours: 60, w: 5, cx: 1, areas: ['arm'],
          base: {}, ceil: {}, caps: { panel: 1 }, look: { manip: 'low' } },
        // a panel on top and crates below (rules: build10)
        { id: 'mag', name: 'Panel magazine', elite: true, desc: 'Carries a panel flat on top and still holds its crates below, and lays the panel in half the time: it builds on the way to the Export Dock. The hardest handler of the year to package.', cost: 900, hours: 150, w: 9, cx: 4, areas: ['arm', 'index'],
          base: {}, ceil: {}, caps: { panel: 2 }, look: { manip: 'ampbar' } }
      ] },
      { id: 'scorer', name: 'Lift', pneu: true, concepts: [
        { id: 'low', name: 'Low-shelf pusher', desc: 'Slides crates onto the low shelf of a dock.', cost: 250, hours: 55, w: 6, cx: 1, areas: ['arm', 'effector'],
          base: { scoreSpd: 46, accuracy: 56 }, ceil: { scoreSpd: 84, accuracy: 93 }, caps: { reach: 1 }, look: { manip: 'low' } },
        { id: 'arm', name: 'High-shelf arm', desc: 'A pivoting arm to the high shelf: one more point at home, two more on the far bank.', cost: 750, hours: 125, w: 11, cx: 2, areas: ['arm', 'effector'],
          base: { scoreSpd: 42, accuracy: 50 }, ceil: { scoreSpd: 86, accuracy: 93 }, caps: { reach: 2, tall: 0.8 }, look: { manip: 'arm' } },
        { id: 'fast', name: 'Fast arm + wrist', desc: 'A quick arm with a wrist that sets a crate on either shelf without squaring up to the dock.', cost: 1350, hours: 200, w: 15, cx: 4, areas: ['arm', 'elevator', 'effector'],
          base: { scoreSpd: 44, accuracy: 50 }, ceil: { scoreSpd: 96, accuracy: 95 }, caps: { reach: 2, tall: 0.9, wrist: true }, look: { manip: 'tele' } }
      ] },
      { id: 'endgame', name: 'Arch Climber', concepts: [
        { id: 'none', name: 'No endgame mechanism', desc: 'Any robot can still stand on an open Crossing. Saves weight, hours and money.', cost: 0, hours: 0, w: 0, cx: 0, areas: [], base: {}, ceil: {}, caps: { endLevel: 0 }, look: { climber: 'none' } },
        { id: 'hook', name: 'Arch hook and winch', desc: 'Hangs from the Arch over the centre Crossing: 15 points, and it leaves the deck below free for a partner.', cost: 650, hours: 120, w: 11, cx: 3, areas: ['climb'],
          base: { endgame: 42 }, ceil: { endgame: 93 }, caps: { endLevel: 2 }, look: { climber: 'hook2' } }
      ] },
      { id: 'soft', name: 'Software', concepts: [SOFT()] }
    ],
    archetypes: [
      { name: 'Exporter with a panel magazine', min: 90, pick: { drive: 'swerve', intake: 'wide', panel: ['mag', 'fork'], scorer: 'fast', endgame: 'hook' } },
      { name: 'Fast exporter', min: 72, pick: { drive: 'swerve', intake: 'wide', panel: ['fork', 'none'], scorer: 'fast', endgame: ['hook', 'none'] } },
      { name: 'Bridge builder', min: 52, pick: { drive: ['swerve', 'wcd'], intake: ['floor', 'wide'], panel: 'fork', scorer: 'arm', endgame: ['hook', 'none'] } },
      { name: 'High-shelf arm', min: 32, pick: { drive: ['wcd', 'swerve'], intake: 'floor', panel: ['none', 'fork'], scorer: 'arm', endgame: 'none' } },
      { name: 'Low-shelf runner', min: 12, pick: { drive: ['kit', 'wcd'], intake: ['floor', 'chute'], panel: ['none', 'fork'], scorer: 'low', endgame: 'none' } },
      { name: 'Kitbot', min: 0, pick: { drive: 'kit', intake: 'chute', panel: 'none', scorer: 'low', endgame: 'none' } }
    ]
  });

  // =====================================================================
  // What the rest of the game asks of every season: the most endgame points one robot can earn (scouting), and the
  // published designs for it (eras.js D.REFBOTS: the Anybot on a kit chassis, the Apex Blueprint on swerve).
  // =====================================================================
  const EXTRA = {
    2101: { endMax: 16, ref: { any: { drive: 'kit', intake: 'over', scorer: 'dump', endgame: 'hook' }, bp: { drive: 'swerve', intake: 'wide', scorer: 'hood', endgame: 'hook' } } },
    2102: { endMax: 15, ref: { any: { drive: 'kit', intake: 'floor', scorer: 'low', endgame: 'low' }, bp: { drive: 'swerve', intake: 'wide', scorer: 'arm', endgame: 'high' } } },
    2103: { endMax: 20, ref: { any: { drive: 'kit', intake: 'floor', scorer: 'push', endgame: 'hook' }, bp: { drive: 'swerve', intake: 'floor', scorer: 'adj', endgame: 'hook' } } },
    2104: { endMax: 20, ref: { any: { drive: 'kit', intake: 'floor', scorer: 'arm2', endgame: 'r1' }, bp: { drive: 'swerve', intake: 'floor', scorer: 'elev3', endgame: 'r2' } } },
    2105: { endMax: 22, ref: { any: { drive: 'kit', intake: 'over', scorer: 'dump', spinner: 'roller', endgame: 'clamp' }, bp: { drive: 'swerve', intake: 'over', scorer: 'hood', spinner: 'roller', endgame: 'clamp' } } },
    2106: { endMax: 10, ref: { any: { drive: 'kit', intake: 'floor', scorer: 'push', endgame: 'grip' }, bp: { drive: 'swerve', intake: 'floor', scorer: 'launch', endgame: 'grip' } } },
    2107: { endMax: 17, ref: { any: { drive: 'kit', intake: 'floor', scorer: 't1', endgame: 'hook' }, bp: { drive: 'swerve', intake: 'floor', scorer: 't3', endgame: 'hook' } } },
    2108: { endMax: 55, ref: { any: { drive: 'kit', intake: 'wide', scorer: 'dump', endgame: 'hook' }, bp: { drive: 'swerve', intake: 'sort', scorer: 'lob', endgame: 'hook' } } },
    2109: { endMax: 12, ref: { any: { drive: 'kit', intake: 'floor', scorer: 'drop', endgame: 'hook' }, bp: { drive: 'swerve', intake: 'floor', scorer: 'tall', endgame: 'hook' } } },
    2110: { endMax: 15, ref: { any: { drive: 'kit', intake: 'floor', panel: 'fork', scorer: 'low' }, bp: { drive: 'swerve', intake: 'wide', panel: 'fork', scorer: 'arm' } } }
  };
  Object.keys(EXTRA).forEach(y => Object.assign(S[y], EXTRA[y]));

  // ---------------------------------------------------------------------
  // the registry: the ten keys in menu order, and what the rest of the game asks about them
  G.FANTASY_YEARS = Object.keys(S).filter(k => /^\d{4}$/.test(k) && S[k].fantasy).map(Number).sort((a, b) => a - b);
  G.FANTASY_CY = 2027;                                   // as a Single Season Challenge a fantasy game is the 2027 game
  G.isFantasy = y => !!(S[y] && S[y].fantasy);
  G.allGames = () => G.SEASON_YEARS.concat(G.FANTASY_YEARS);
  G.singleCy = y => (G.isFantasy(y) ? G.FANTASY_CY : y);  // the calendar year a single season of game y is played in
  G.gameYearLabel = y => (G.isFantasy(y) ? 'Fantasy' : String(y));
})();
