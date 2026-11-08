'use strict';
/* FRC Manager — season definitions: games, subsystems, concepts (development directions), AI archetypes */
(function () {
  const D = G.Data = G.Data || {};

  D.AREAS = [
    { id: 'swerve', name: 'Swerve Drive', desc: 'Swerve module integration, odometry, field-centric driving.' },
    { id: 'shooter', name: 'Flywheel Shooters', desc: 'Flywheels, hoods, shot tuning and consistency.' },
    { id: 'turret', name: 'Turrets & Auto-Aim', desc: 'Rotating turrets, target tracking, shoot-on-the-move.' },
    { id: 'elevator', name: 'Elevators', desc: 'Cascading / continuous elevators, rigging, fast safe motion.' },
    { id: 'arm', name: 'Arms & Wrists', desc: 'Pivoting arms, wrists, claws and pivot shooters.' },
    { id: 'intake', name: 'Ground Intakes', desc: 'Roller intakes, deploy mechanisms, "touch it, own it".' },
    { id: 'index', name: 'Indexers & Hoppers', desc: 'Storing and feeding many game pieces reliably.' },
    { id: 'climb', name: 'Climbers', desc: 'Winches, hooks, multi-stage climbs.' },
    { id: 'vision', name: 'Vision & Localization', desc: 'Cameras, AprilTags, pose estimation, auto-align.' },
    { id: 'autoPath', name: 'Autonomous Pathing', desc: 'Path planning, multi-piece autos, auto-balance.' },
    { id: 'elec', name: 'Electrical & Reliability', desc: 'Wiring standards, brownout prevention, robustness.' }
  ];
  D.AREA = {}; D.AREAS.forEach(a => D.AREA[a.id] = a);

  D.STAT = {
    speed: 'Speed', agility: 'Agility', push: 'Pushing', intake: 'Intake', scoreSpd: 'Scoring Speed',
    accuracy: 'Accuracy', range: 'Range', endgame: 'Endgame', auto: 'Autonomous', vision: 'Vision',
    amp: 'Amp Skill', algae: 'Algae Skill', balance: 'Auto-Balance', traverse: 'Traverse', feed: 'Feed Rate', rel: 'Reliability'
  };
  // software stats get knowledge from specific areas
  D.STAT_AREA = { auto: 'autoPath', vision: 'vision', balance: 'autoPath' };

  // ---------- Shared drivetrain concepts ----------
  const DRIVE = [
    { id: 'kit', name: 'Kitbot Tank', desc: 'Kit-of-parts chassis. Cheap, quick, robust, but slow to turn.', cost: 0, hours: 60, w: 38, cx: 1, areas: ['elec'],
      base: { speed: 40, agility: 25, push: 45 }, ceil: { speed: 62, agility: 42, push: 62 }, look: { drive: 'tank' } },
    { id: 'wcd', name: 'West Coast Drive', desc: '6-wheel drop-center tank. Fast and a strong pusher.', cost: 1200, hours: 120, w: 42, cx: 2, areas: ['elec'],
      base: { speed: 50, agility: 32, push: 60 }, ceil: { speed: 82, agility: 52, push: 86 }, look: { drive: 'wcd' } },
    { id: 'mec', name: 'Mecanum', desc: 'Strafes in any direction. Agile but easily pushed.', cost: 900, hours: 100, w: 36, cx: 2, areas: ['elec'],
      base: { speed: 45, agility: 55, push: 22 }, ceil: { speed: 72, agility: 80, push: 38 }, look: { drive: 'mecanum' } },
    { id: 'swerve', name: 'Swerve', desc: 'Independent steering modules. The best drivetrain if you can make it reliable. Needs swerve modules from the parts store.', cost: 600, hours: 180, w: 40, cx: 4, areas: ['swerve', 'elec', 'autoPath'],
      base: { speed: 58, agility: 60, push: 50 }, ceil: { speed: 95, agility: 95, push: 76 }, look: { drive: 'swerve' }, req: { part: 'swerve' } }
  ];
  const SOFT = (extra) => ({
    id: 'code', name: 'Robot Code', desc: 'Your software stack. Upgrade autos and vision with software projects.', cost: 0, hours: 0, w: 0, cx: 2, areas: ['autoPath', 'vision'],
    base: Object.assign({ auto: 30, vision: 12 }, extra ? extra.base : {}), ceil: Object.assign({ auto: 92, vision: 92 }, extra ? extra.ceil : {}), look: {}
  });
  const NONE_END = { id: 'none', name: 'No endgame mechanism', desc: 'Skip the climber. Saves weight, hours and money.', cost: 0, hours: 0, w: 0, cx: 0, areas: [], base: {}, ceil: {}, caps: { endLevel: 0 }, look: { climber: 'none' } };

  const S = G.Seasons = {};

  // =====================================================================
  S[2022] = {
    year: 2022, name: 'RAPID REACT', pieceName: 'Cargo', sym: 'rotate',
    tagline: 'Shoot cargo into the central Hub and climb the Hangar.',
    brief: [
      'Robots collect Cargo (balls in alliance colours) and score them in the central HUB: the lower goal is easy, the upper goal is worth double.',
      'In the last 30 seconds robots climb the HANGAR: Low (4), Mid (6), High (10) and Traversal (15) rungs.',
      'Bonus RPs: Cargo Bonus at 20 cargo (18 with a 5-cargo auto "Quintet") and Hangar Bonus at 16 hangar points.'
    ],
    timing: { auto: 15, tele: 135, end: 30 }, rpWin: 2, foul: { minor: 4, major: 8 },
    relevance: { swerve: 2, shooter: 3, turret: 3, elevator: 0, arm: 1, intake: 2, index: 2, climb: 3, vision: 2, autoPath: 2, elec: 2 },
    autoTiers: ['Taxi + preload', '2-ball', '3-ball', '5-ball'], autoPieces: [1, 2, 3, 5],
    coachTargets: [{ id: 'auto', name: 'Best option' }, { id: 'upper', name: 'Upper Hub' }, { id: 'lower', name: 'Lower Hub' }],
    endNames: ['—', 'Low', 'Mid', 'High', 'Traversal'],
    subs: [
      { id: 'drive', name: 'Drivetrain', concepts: DRIVE },
      { id: 'intake', name: 'Intake & Storage', concepts: [
        { id: 'term', name: 'Terminal-only (1 ball)', desc: 'Human player feeds cargo at the Terminal. No ground pickup.', cost: 200, hours: 50, w: 6, cx: 1, areas: ['intake'],
          base: { intake: 40 }, ceil: { intake: 65 }, caps: { ground: false, station: true, storage: 1 }, look: { intake: 'none' } },
        { id: 'over', name: 'Over-bumper + 2-ball indexer', desc: 'Deployable ground intake feeding a two-ball indexer.', cost: 700, hours: 140, w: 14, cx: 3, areas: ['intake', 'index'],
          base: { intake: 45 }, ceil: { intake: 86 }, caps: { ground: true, station: true, storage: 2 }, look: { intake: 'over' } },
        { id: 'dual', name: 'Dual-side intake + 2-ball indexer', desc: 'Intakes on both ends: grab cargo without turning around.', cost: 1100, hours: 200, w: 18, cx: 4, areas: ['intake', 'index'],
          base: { intake: 50 }, ceil: { intake: 95 }, caps: { ground: true, station: true, storage: 2 }, look: { intake: 'dual' } }
      ] },
      { id: 'scorer', name: 'Shooter', concepts: [
        { id: 'dump', name: 'Low-goal dumper', desc: 'Drops cargo into the lower hub from the fender. Simple and accurate.', cost: 200, hours: 60, w: 8, cx: 1, areas: ['shooter'],
          base: { scoreSpd: 50, accuracy: 62 }, ceil: { scoreSpd: 82, accuracy: 96 }, caps: { lower: true, upper: false, rmin: 0.9, rmax: 1.4 }, look: { shooter: 'dump' } },
        { id: 'fender', name: 'Fixed fender shooter', desc: 'Upper hub shots, but only pressed against the fender.', cost: 800, hours: 120, w: 14, cx: 2, areas: ['shooter'],
          base: { scoreSpd: 40, accuracy: 45, range: 0 }, ceil: { scoreSpd: 78, accuracy: 90, range: 30 }, caps: { lower: true, upper: true, rmin: 1.3, rmax: 1.9 }, look: { shooter: 'fixed' } },
        { id: 'hood', name: 'Adjustable hood shooter', desc: 'Variable-angle hood: upper hub from the tarmac line and beyond.', cost: 1300, hours: 180, w: 17, cx: 3, areas: ['shooter', 'vision'],
          base: { scoreSpd: 40, accuracy: 42, range: 30 }, ceil: { scoreSpd: 86, accuracy: 92, range: 82 }, caps: { lower: true, upper: true, rmin: 1.3, rmax: 4.2 }, look: { shooter: 'hood' } },
        { id: 'turret', name: 'Turret + hood', desc: 'Shoot from anywhere. With vision upgrades it can shoot while moving.', cost: 1900, hours: 240, w: 22, cx: 5, areas: ['turret', 'shooter', 'vision'],
          base: { scoreSpd: 38, accuracy: 40, range: 40 }, ceil: { scoreSpd: 92, accuracy: 95, range: 95 }, caps: { lower: true, upper: true, rmin: 1.3, rmax: 5.8, turret: true }, look: { shooter: 'turret' } }
      ] },
      { id: 'endgame', name: 'Climber', concepts: [
        NONE_END,
        { id: 'mid', name: 'Mid-rung climber', desc: 'Telescoping hooks reach the Low and Mid rungs.', cost: 500, hours: 90, w: 10, cx: 2, areas: ['climb'],
          base: { endgame: 40 }, ceil: { endgame: 82 }, caps: { endLevel: 2 }, look: { climber: 'hook' } },
        { id: 'high', name: 'High-rung climber', desc: 'Two-stage climb to the High rung.', cost: 900, hours: 150, w: 14, cx: 3, areas: ['climb'],
          base: { endgame: 35 }, ceil: { endgame: 88 }, caps: { endLevel: 3 }, look: { climber: 'hook2' } },
        { id: 'trav', name: 'Traversal climber', desc: 'Rung-to-rung swinging climb to Traversal. Huge points, hard to make reliable.', cost: 1500, hours: 240, w: 18, cx: 5, areas: ['climb'],
          base: { endgame: 30 }, ceil: { endgame: 95 }, caps: { endLevel: 4 }, look: { climber: 'arms' } }
      ] },
      { id: 'soft', name: 'Software', concepts: [SOFT()] }
    ],
    archetypes: [
      { name: 'Turret + Traversal', min: 76, pick: { drive: ['swerve', 'wcd'], intake: ['dual', 'over'], scorer: 'turret', endgame: 'trav' } },
      { name: 'Hood shooter + High climb', min: 56, pick: { drive: ['swerve', 'wcd'], intake: 'over', scorer: 'hood', endgame: ['high', 'trav'] } },
      { name: 'Fender shooter + Mid climb', min: 36, pick: { drive: ['wcd', 'kit'], intake: 'over', scorer: 'fender', endgame: 'mid' } },
      { name: 'Low-goal + Mid climb', min: 16, pick: { drive: 'kit', intake: ['term', 'over'], scorer: 'dump', endgame: ['mid', 'none'] } },
      { name: 'Kitbot dumper', min: 0, pick: { drive: 'kit', intake: 'term', scorer: 'dump', endgame: 'none' } },
      { name: 'Defense bot', min: 20, defense: true, pick: { drive: 'wcd', intake: 'term', scorer: 'dump', endgame: 'mid' } }
    ]
  };

  // =====================================================================
  S[2023] = {
    year: 2023, name: 'CHARGED UP', pieceName: 'Cones & Cubes', sym: 'mirror',
    tagline: 'Place cones and cubes on the Grid, then balance on the Charge Station.',
    brief: [
      'Robots pick up Cones and Cubes from the Loading Zone and place them on the GRID: bottom (any piece), mid and top rows (cone or cube nodes).',
      'Three pieces in a row form a LINK worth 5 points. The CHARGE STATION is worth 8/12 in auto (docked/engaged) and 6/10 per robot at the end.',
      'Bonus RPs: Sustainability at 5 links (4 with Coopertition) and Activation at 26 charge-station points.'
    ],
    timing: { auto: 15, tele: 135, end: 30 }, rpWin: 2, foul: { minor: 5, major: 12 },
    relevance: { swerve: 2, shooter: 0, turret: 0, elevator: 2, arm: 3, intake: 2, index: 0, climb: 0, vision: 2, autoPath: 3, elec: 2 },
    autoTiers: ['Mobility + preload', 'Preload + balance', '2-piece', '3-piece'], autoPieces: [1, 1, 2, 3],
    coachTargets: [{ id: 'auto', name: 'Best option' }, { id: 'top', name: 'Top row' }, { id: 'links', name: 'Complete links' }, { id: 'fast', name: 'Fast low cycles' }],
    endNames: ['Park', 'Dock'],
    subs: [
      { id: 'drive', name: 'Drivetrain', concepts: DRIVE },
      { id: 'intake', name: 'Intake', concepts: [
        { id: 'sub', name: 'Substation-only claw', desc: 'Grabs pieces from the double substation shelf only.', cost: 300, hours: 70, w: 6, cx: 1, areas: ['arm'],
          base: { intake: 40 }, ceil: { intake: 72 }, caps: { ground: false, groundCone: false, station: true, cones: true, cubes: true }, look: { intake: 'claw' } },
        { id: 'gcube', name: 'Ground cube intake + claw', desc: 'Picks cubes off the floor; cones from the shelf.', cost: 800, hours: 140, w: 12, cx: 3, areas: ['intake'],
          base: { intake: 45 }, ceil: { intake: 86 }, caps: { ground: true, groundCone: false, station: true, cones: true, cubes: true }, look: { intake: 'over' } },
        { id: 'gall', name: 'Ground cone + cube intake', desc: 'Grabs anything off the floor, even tipped cones.', cost: 1300, hours: 220, w: 15, cx: 4, areas: ['intake', 'arm'],
          base: { intake: 45 }, ceil: { intake: 93 }, caps: { ground: true, groundCone: true, station: true, cones: true, cubes: true }, look: { intake: 'wide' } }
      ] },
      { id: 'scorer', name: 'Manipulator', concepts: [
        { id: 'hyb', name: 'Hybrid-only (bottom row)', desc: 'Pushes pieces into the bottom row only. Simple and fast.', cost: 200, hours: 50, w: 6, cx: 1, areas: ['arm'],
          base: { scoreSpd: 50, accuracy: 70 }, ceil: { scoreSpd: 86, accuracy: 97 }, caps: { reach: 1, coneReach: 1 }, look: { manip: 'low' } },
        { id: 'sja', name: 'Single-jointed arm', desc: 'Reaches mid and top for cubes, mid for cones.', cost: 700, hours: 130, w: 16, cx: 2, areas: ['arm'],
          base: { scoreSpd: 40, accuracy: 45 }, ceil: { scoreSpd: 80, accuracy: 88 }, caps: { reach: 3, coneReach: 2, tall: 0.3 }, look: { manip: 'arm' } },
        { id: 'elev', name: 'Elevator', desc: 'Angled elevator reaching every row. Steady but slower.', cost: 1000, hours: 180, w: 22, cx: 3, areas: ['elevator'],
          base: { scoreSpd: 35, accuracy: 48 }, ceil: { scoreSpd: 80, accuracy: 93 }, caps: { reach: 3, coneReach: 3, tall: 0.5 }, look: { manip: 'elevator' } },
        { id: 'elevw', name: 'Elevator + wrist', desc: 'Elevator with a wrist: all rows, fast cone placement.', cost: 1500, hours: 240, w: 26, cx: 4, areas: ['elevator', 'arm'],
          base: { scoreSpd: 40, accuracy: 48 }, ceil: { scoreSpd: 90, accuracy: 95 }, caps: { reach: 3, coneReach: 3, tall: 0.6 }, look: { manip: 'elevwrist' } },
        { id: 'dja', name: 'Double-jointed arm', desc: 'The fastest all-row scorer — and the most likely to tip.', cost: 1700, hours: 260, w: 24, cx: 5, areas: ['arm'],
          base: { scoreSpd: 45, accuracy: 40 }, ceil: { scoreSpd: 95, accuracy: 90 }, caps: { reach: 3, coneReach: 3, tall: 1.0 }, look: { manip: 'dja' } }
      ] },
      { id: 'soft', name: 'Software', concepts: [SOFT({ base: { balance: 22 }, ceil: { balance: 95 } })] }
    ],
    archetypes: [
      { name: 'Elevator + wrist, ground intake', min: 76, pick: { drive: 'swerve', intake: 'gall', scorer: ['elevw', 'dja'] } },
      { name: 'Elevator scorer', min: 56, pick: { drive: ['swerve', 'wcd'], intake: ['gcube', 'sub'], scorer: ['elev', 'elevw'] } },
      { name: 'Arm scorer', min: 36, pick: { drive: ['wcd', 'swerve', 'kit'], intake: 'sub', scorer: 'sja' } },
      { name: 'Hybrid pusher', min: 0, pick: { drive: 'kit', intake: 'sub', scorer: 'hyb' } },
      { name: 'Defense / balancer', min: 20, defense: true, pick: { drive: 'wcd', intake: 'sub', scorer: 'hyb' } }
    ]
  };

  // =====================================================================
  S[2024] = {
    year: 2024, name: 'CRESCENDO', pieceName: 'Notes', sym: 'mirror',
    tagline: 'Score notes in the Speaker and Amp, then get onstage. Top alliances learn to feed notes across the field.',
    brief: [
      'Robots collect Notes (foam rings) and score them in the SPEAKER (2 pts, 5 when AMPLIFIED) or the AMP (1 pt).',
      'Two Amp notes let the human player amplify the Speaker for 10 seconds. In the last 20 seconds robots climb the STAGE chains (3), share a chain for Harmony (+2) and score in the Trap (5).',
      'Bonus RPs: Melody at 18 notes (15 with Coopertition) and Ensemble at 10 stage points with 2 robots onstage.'
    ],
    timing: { auto: 15, tele: 135, end: 20 }, rpWin: 2, foul: { minor: 2, major: 5 },
    relevance: { swerve: 2, shooter: 3, turret: 2, elevator: 1, arm: 2, intake: 3, index: 1, climb: 2, vision: 3, autoPath: 3, elec: 2 },
    autoTiers: ['Leave + preload', '2-note', '4-note', '6-note centerline'], autoPieces: [1, 2, 4, 6],
    coachTargets: [{ id: 'auto', name: 'Best option' }, { id: 'speaker', name: 'Speaker' }, { id: 'amp', name: 'Amp (charge amplify)' }],
    endNames: ['Park', 'Onstage'],
    subs: [
      { id: 'drive', name: 'Drivetrain', concepts: DRIVE },
      { id: 'intake', name: 'Intake', concepts: [
        { id: 'src', name: 'Source-only feeder', desc: 'Human player drops notes in from the Source.', cost: 200, hours: 50, w: 5, cx: 1, areas: ['intake'],
          base: { intake: 45 }, ceil: { intake: 75 }, caps: { ground: false, station: true, storage: 1 }, look: { intake: 'none' } },
        { id: 'otb', name: 'Over-bumper intake', desc: 'Deploys over the bumper to grab notes from the floor.', cost: 700, hours: 130, w: 12, cx: 3, areas: ['intake'],
          base: { intake: 45 }, ceil: { intake: 86 }, caps: { ground: true, station: true, storage: 1 }, look: { intake: 'over' } },
        { id: 'utb', name: 'Under-bumper intake', desc: '"Touch it, own it." The fastest ground pickup.', cost: 900, hours: 160, w: 9, cx: 3, areas: ['intake'],
          base: { intake: 50 }, ceil: { intake: 96 }, caps: { ground: true, station: true, storage: 1 }, look: { intake: 'under' } }
      ] },
      { id: 'scorer', name: 'Shooter', concepts: [
        { id: 'sub', name: 'Subwoofer fixed shooter', desc: 'Scores only pressed against the subwoofer.', cost: 600, hours: 100, w: 12, cx: 2, areas: ['shooter'],
          base: { scoreSpd: 45, accuracy: 55, range: 0 }, ceil: { scoreSpd: 80, accuracy: 95, range: 25 }, caps: { speaker: true, rmin: 1.0, rmax: 1.6 }, look: { shooter: 'fixed' } },
        { id: 'pivot', name: 'Pivot shooter', desc: 'Variable-angle shooter: speaker from the wing, can also feed the Amp.', cost: 1300, hours: 190, w: 18, cx: 3, areas: ['shooter', 'arm'],
          base: { scoreSpd: 40, accuracy: 42, range: 30 }, ceil: { scoreSpd: 88, accuracy: 93, range: 85 }, caps: { speaker: true, ampViaShooter: true, rmin: 1.0, rmax: 5.0 }, look: { shooter: 'pivot' } },
        { id: 'turret', name: 'Turret shooter', desc: 'Aims without turning the robot; shoot-on-the-move with vision.', cost: 2000, hours: 260, w: 22, cx: 5, areas: ['turret', 'shooter', 'vision'],
          base: { scoreSpd: 38, accuracy: 40, range: 40 }, ceil: { scoreSpd: 92, accuracy: 95, range: 95 }, caps: { speaker: true, turret: true, rmin: 1.0, rmax: 6.5 }, look: { shooter: 'turret' } }
      ] },
      { id: 'amp', name: 'Amp / Trap', concepts: [
        { id: 'none', name: 'No amp mechanism', desc: 'Speaker only.', cost: 0, hours: 0, w: 0, cx: 0, areas: [], base: {}, ceil: {}, caps: {}, look: {} },
        { id: 'ampbar', name: 'Amp bar', desc: 'A flip-out bar that guides notes into the Amp.', cost: 400, hours: 80, w: 5, cx: 2, areas: ['arm'],
          base: { amp: 45 }, ceil: { amp: 90 }, caps: { amp: true }, look: { manip: 'ampbar' } },
        { id: 'amptrap', name: 'Amp + Trap elevator', desc: 'Small elevator that scores the Amp and the Trap.', cost: 1000, hours: 180, w: 12, cx: 4, areas: ['elevator', 'arm'],
          base: { amp: 42 }, ceil: { amp: 92 }, caps: { amp: true, trapMech: true, tall: 0.2 }, look: { manip: 'elevator' } }
      ] },
      { id: 'endgame', name: 'Climber', concepts: [
        NONE_END,
        { id: 'chain', name: 'Chain climber', desc: 'Hooks the stage chain and lifts the robot onstage.', cost: 500, hours: 100, w: 10, cx: 2, areas: ['climb'],
          base: { endgame: 40 }, ceil: { endgame: 90 }, caps: { endLevel: 1 }, look: { climber: 'hook' } },
        { id: 'chaintrap', name: 'Climber + Trap', desc: 'Climbs and scores a note in the Trap (needs the Amp + Trap mechanism).', cost: 900, hours: 160, w: 13, cx: 4, areas: ['climb', 'elevator'],
          base: { endgame: 38 }, ceil: { endgame: 94 }, caps: { endLevel: 1, trap: true }, look: { climber: 'hook2' } }
      ] },
      { id: 'soft', name: 'Software', concepts: [SOFT()] }
    ],
    archetypes: [
      { name: 'Turret/pivot + Trap', min: 76, pick: { drive: 'swerve', intake: 'utb', scorer: ['pivot', 'turret'], amp: 'amptrap', endgame: 'chaintrap' } },
      { name: 'Pivot shooter + climb', min: 56, pick: { drive: 'swerve', intake: ['utb', 'otb'], scorer: 'pivot', amp: ['none', 'ampbar'], endgame: 'chain' } },
      { name: 'Subwoofer + amp bar', min: 36, pick: { drive: ['wcd', 'swerve'], intake: 'otb', scorer: 'sub', amp: 'ampbar', endgame: ['chain', 'none'] } },
      { name: 'Subwoofer shooter', min: 14, pick: { drive: ['kit', 'wcd'], intake: ['src', 'otb'], scorer: 'sub', amp: 'none', endgame: ['chain', 'none'] } },
      { name: 'Kitbot amp-er', min: 0, pick: { drive: 'kit', intake: 'src', scorer: 'sub', amp: 'ampbar', endgame: 'none' } },
      { name: 'Defense bot', min: 20, defense: true, pick: { drive: 'wcd', intake: 'src', scorer: 'sub', amp: 'none', endgame: 'chain' } }
    ]
  };

  // =====================================================================
  S[2025] = {
    year: 2025, name: 'REEFSCAPE', pieceName: 'Coral & Algae', sym: 'rotate', // rotationally symmetric: cages on your left, processor on your right
    tagline: 'Fill the Reef with coral, process algae and climb the Barge cages.',
    brief: [
      'Robots place Coral (PVC tubes) on the REEF: L1 trough (2), L2 (3), L3 (4) and L4 (5), worth more in auto. Algae (balls) sit on the reef blocking branches.',
      'Algae can be removed and scored in the PROCESSOR (6) or thrown into the NET (4). In the last 20 seconds robots park (2) or climb a Shallow (6) or Deep (12) cage.',
      'Win = 3 RP. Bonus RPs: Auto (all robots leave + coral in auto), Coral (5 on every level, 3 levels with Coopertition), Barge (14 barge points).'
    ],
    timing: { auto: 15, tele: 135, end: 20 }, rpWin: 3, foul: { minor: 2, major: 6 },
    relevance: { swerve: 2, shooter: 1, turret: 0, elevator: 3, arm: 2, intake: 2, index: 0, climb: 2, vision: 2, autoPath: 3, elec: 2 },
    autoTiers: ['Leave', '1-coral', '3-coral', '4-coral'], autoPieces: [0, 1, 3, 4],
    coachTargets: [{ id: 'auto', name: 'Best option' }, { id: 'L4', name: 'L4 coral' }, { id: 'mid', name: 'L2–L3 coral' }, { id: 'L1', name: 'L1 trough' }, { id: 'algae', name: 'Algae' }],
    endNames: ['Park', 'Shallow', 'Deep'],
    subs: [
      { id: 'drive', name: 'Drivetrain', concepts: DRIVE },
      { id: 'intake', name: 'Coral Intake', concepts: [
        { id: 'station', name: 'Coral station funnel', desc: 'Receives coral from the coral station chute.', cost: 250, hours: 60, w: 4, cx: 1, areas: ['intake'],
          base: { intake: 45 }, ceil: { intake: 82 }, caps: { ground: false, station: true }, look: { intake: 'funnel' } },
        { id: 'ground', name: 'Ground coral intake', desc: 'Picks coral off the carpet anywhere.', cost: 1000, hours: 180, w: 13, cx: 4, areas: ['intake', 'arm'],
          base: { intake: 45 }, ceil: { intake: 93 }, caps: { ground: true, station: true }, look: { intake: 'over' } }
      ] },
      { id: 'scorer', name: 'Coral Manipulator', concepts: [
        { id: 'trough', name: 'Trough dropper (L1)', desc: 'Drops coral into the L1 trough only.', cost: 200, hours: 50, w: 5, cx: 1, areas: ['arm'],
          base: { scoreSpd: 55, accuracy: 75 }, ceil: { scoreSpd: 88, accuracy: 98 }, caps: { reach: 1 }, look: { manip: 'low' } },
        { id: 'arm', name: 'Pivot arm (L1–L3)', desc: 'Arm reaching L1 to L3.', cost: 800, hours: 140, w: 15, cx: 3, areas: ['arm'],
          base: { scoreSpd: 40, accuracy: 45 }, ceil: { scoreSpd: 82, accuracy: 90 }, caps: { reach: 3, tall: 0.4 }, look: { manip: 'arm' } },
        { id: 'elev', name: 'Elevator (L1–L4)', desc: 'Tall elevator reaching the top branches.', cost: 1300, hours: 210, w: 24, cx: 4, areas: ['elevator'],
          base: { scoreSpd: 38, accuracy: 45 }, ceil: { scoreSpd: 88, accuracy: 94 }, caps: { reach: 4, tall: 0.8 }, look: { manip: 'elevator' } },
        { id: 'elevw', name: 'Elevator + wrist (L1–L4)', desc: 'Fast elevator with a wrist; can knock algae off the reef.', cost: 1800, hours: 270, w: 28, cx: 5, areas: ['elevator', 'arm'],
          base: { scoreSpd: 42, accuracy: 46 }, ceil: { scoreSpd: 95, accuracy: 96 }, caps: { reach: 4, tall: 0.9, algaeRemove: true }, look: { manip: 'elevwrist' } }
      ] },
      { id: 'algae', name: 'Algae', concepts: [
        { id: 'none', name: 'No algae mechanism', desc: 'Ignore algae.', cost: 0, hours: 0, w: 0, cx: 0, areas: [], base: {}, ceil: {}, caps: {}, look: {} },
        { id: 'proc', name: 'Dislodger + processor', desc: 'Removes algae from the reef and scores it in the processor.', cost: 400, hours: 90, w: 6, cx: 2, areas: ['arm'],
          base: { algae: 45 }, ceil: { algae: 88 }, caps: { algaeRemove: true, processor: true }, look: { algae: 'proc' } },
        { id: 'net', name: 'Algae net shooter', desc: 'Removes algae and launches it into the Net from the barge zone.', cost: 1000, hours: 180, w: 12, cx: 4, areas: ['shooter', 'arm'],
          base: { algae: 40 }, ceil: { algae: 93 }, caps: { algaeRemove: true, processor: true, net: true }, look: { algae: 'net' } }
      ] },
      { id: 'endgame', name: 'Cage Climber', concepts: [
        NONE_END,
        { id: 'shallow', name: 'Shallow cage climber', desc: 'Hangs from a shallow cage.', cost: 400, hours: 80, w: 8, cx: 2, areas: ['climb'],
          base: { endgame: 45 }, ceil: { endgame: 88 }, caps: { endLevel: 1 }, look: { climber: 'hook' } },
        { id: 'deep', name: 'Deep cage climber', desc: 'Lifts the robot fully off the floor on a deep cage.', cost: 900, hours: 160, w: 13, cx: 4, areas: ['climb'],
          base: { endgame: 38 }, ceil: { endgame: 94 }, caps: { endLevel: 2 }, look: { climber: 'arms' } }
      ] },
      { id: 'soft', name: 'Software', concepts: [SOFT()] }
    ],
    archetypes: [
      { name: 'L4 elevator + net + deep', min: 76, pick: { drive: 'swerve', intake: ['ground', 'station'], scorer: 'elevw', algae: ['net', 'proc'], endgame: 'deep' } },
      { name: 'L4 elevator + deep', min: 56, pick: { drive: 'swerve', intake: 'station', scorer: ['elev', 'elevw'], algae: ['proc', 'none'], endgame: ['deep', 'shallow'] } },
      { name: 'Arm scorer', min: 34, pick: { drive: ['swerve', 'wcd'], intake: 'station', scorer: 'arm', algae: ['none', 'proc'], endgame: ['shallow', 'none'] } },
      { name: 'Trough bot', min: 0, pick: { drive: 'kit', intake: 'station', scorer: 'trough', algae: 'none', endgame: 'none' } },
      { name: 'Algae specialist', min: 30, pick: { drive: 'wcd', intake: 'station', scorer: 'trough', algae: 'net', endgame: 'shallow' } },
      { name: 'Defense bot', min: 20, defense: true, pick: { drive: 'wcd', intake: 'station', scorer: 'trough', algae: 'none', endgame: 'shallow' } }
    ]
  };

  // =====================================================================
  S[2026] = {
    year: 2026, name: 'REBUILT', pieceName: 'Fuel', sym: 'rotate',
    tagline: 'Shoot fuel into your Hub while it is active, then climb the Tower.',
    brief: [
      'Robots collect Fuel (foam balls) — lots of it — and shoot it into their HUB for 1 point each, but only while the hub is ACTIVE.',
      'After a 10 s transition, hubs alternate in four 25 s SHIFTS (the alliance that won auto goes inactive first), then both are active for the last 30 s. Robots can climb the TOWER: L1 (10, or 15 in auto), L2 (20), L3 (30) — but climbs are slow and risky, and both hubs are active in the endgame, so strong teams usually keep shooting instead.',
      'Crossing to the neutral zone means driving over a BUMP or, for low-profile robots, under a TRENCH. Win = 3 RP. Bonus RPs: Energized (100 fuel), Supercharged (360 fuel), Traversal (50 tower points).'
    ],
    timing: { auto: 20, tele: 140, end: 30 }, rpWin: 3, foul: { minor: 5, major: 15 },
    relevance: { swerve: 3, shooter: 3, turret: 3, elevator: 0, arm: 0, intake: 3, index: 3, climb: 2, vision: 3, autoPath: 2, elec: 2 },
    autoTiers: ['Leave + preload', 'Preload + depot', 'Neutral-zone sweep', 'Sweep + L1 climb'], autoPieces: [1, 2, 2, 2],
    coachTargets: [{ id: 'auto', name: 'Hold for active hub' }, { id: 'shoot', name: 'Shoot on sight' }],
    endNames: ['—', 'L1', 'L2', 'L3'],
    subs: [
      { id: 'drive', name: 'Drivetrain', concepts: DRIVE },
      { id: 'frame', name: 'Frame Profile', concepts: [
        { id: 'std', name: 'Standard height', desc: 'Normal frame. Crosses zones over the BUMP (slower).', cost: 0, hours: 30, w: 4, cx: 1, areas: ['elec'],
          base: { traverse: 50 }, ceil: { traverse: 86 }, caps: { lowProfile: false }, look: { frame: 'std' } },
        { id: 'low', name: 'Low-profile', desc: 'Fits under the TRENCH for quick crossings, but hopper capacity is cut by 40%.', cost: 300, hours: 70, w: 2, cx: 3, areas: ['elec'],
          base: { traverse: 55 }, ceil: { traverse: 95 }, caps: { lowProfile: true }, look: { frame: 'low' } }
      ] },
      { id: 'intake', name: 'Intake', concepts: [
        { id: 'outpost', name: 'Outpost/Depot-only', desc: 'Loads fuel from the human player Outpost and the Depot only.', cost: 200, hours: 50, w: 4, cx: 1, areas: ['intake'],
          base: { intake: 40 }, ceil: { intake: 72 }, caps: { ground: false, station: true, wide: 1 }, look: { intake: 'none' } },
        { id: 'ground', name: 'Ground intake', desc: 'Roller intake that sweeps fuel off the carpet.', cost: 700, hours: 130, w: 10, cx: 3, areas: ['intake'],
          base: { intake: 45 }, ceil: { intake: 88 }, caps: { ground: true, station: true, wide: 1 }, look: { intake: 'over' } },
        { id: 'wide', name: 'Wide full-width intake', desc: 'Full-frame-width intake: vacuums fuel 30% faster.', cost: 1000, hours: 180, w: 13, cx: 4, areas: ['intake', 'index'],
          base: { intake: 48 }, ceil: { intake: 95 }, caps: { ground: true, station: true, wide: 1.3 }, look: { intake: 'wide' } }
      ] },
      { id: 'hopper', name: 'Hopper', concepts: [
        { id: 'small', name: 'Small hopper (8)', desc: 'Holds 8 fuel. Light and simple.', cost: 200, hours: 40, w: 5, cx: 1, areas: ['index'],
          base: { feed: 45 }, ceil: { feed: 82 }, caps: { storage: 8 }, look: { hopper: 8 } },
        { id: 'med', name: 'Medium hopper (20)', desc: 'Holds 20 fuel.', cost: 500, hours: 90, w: 9, cx: 2, areas: ['index'],
          base: { feed: 42 }, ceil: { feed: 88 }, caps: { storage: 20 }, look: { hopper: 20 } },
        { id: 'large', name: 'Large hopper (45)', desc: 'Holds 45 fuel — stockpile through an inactive shift.', cost: 900, hours: 150, w: 14, cx: 4, areas: ['index'],
          base: { feed: 40 }, ceil: { feed: 95 }, caps: { storage: 45 }, look: { hopper: 45 } }
      ] },
      { id: 'scorer', name: 'Shooter', concepts: [
        { id: 'fixed', name: 'Fixed shooter', desc: 'Shoots from a set distance near the hub.', cost: 700, hours: 110, w: 12, cx: 2, areas: ['shooter'],
          base: { scoreSpd: 42, accuracy: 50, range: 0 }, ceil: { scoreSpd: 80, accuracy: 90, range: 30 }, caps: { rmin: 1.2, rmax: 2.0 }, look: { shooter: 'fixed' } },
        { id: 'hood', name: 'Adjustable hood shooter', desc: 'Shoots from anywhere in your alliance zone.', cost: 1300, hours: 180, w: 16, cx: 3, areas: ['shooter', 'vision'],
          base: { scoreSpd: 40, accuracy: 42, range: 30 }, ceil: { scoreSpd: 88, accuracy: 93, range: 85 }, caps: { rmin: 1.2, rmax: 4.0 }, look: { shooter: 'hood' } },
        { id: 'turret', name: 'Turret shooter', desc: 'Aims independently of the drivetrain. With vision it shoots on the move and is very hard to defend.', cost: 2000, hours: 250, w: 21, cx: 5, areas: ['turret', 'shooter', 'vision'],
          base: { scoreSpd: 38, accuracy: 40, range: 40 }, ceil: { scoreSpd: 94, accuracy: 95, range: 95 }, caps: { rmin: 1.2, rmax: 5.0, turret: true }, look: { shooter: 'turret' } },
        { id: 'dumper', name: 'Wide dumper', desc: 'A full-width bank of fixed flywheels that empties the hopper in seconds. Huge throughput and simpler than a turret, but it must line up close to the hub and suffers more under defense.', cost: 1500, hours: 190, w: 19, cx: 3, areas: ['shooter', 'index'],
          base: { scoreSpd: 50, accuracy: 46, range: 0 }, ceil: { scoreSpd: 99, accuracy: 91, range: 25 }, caps: { rmin: 1.0, rmax: 2.4, dumper: true }, look: { shooter: 'dump' } }
      ] },
      { id: 'endgame', name: 'Tower Climber', concepts: [
        NONE_END,
        { id: 'l1', name: 'Level 1 climber', desc: 'Low climb, quick. Also usable in auto (15 pts).', cost: 300, hours: 60, w: 6, cx: 1, areas: ['climb'],
          base: { endgame: 50 }, ceil: { endgame: 90 }, caps: { endLevel: 1 }, look: { climber: 'hook' } },
        { id: 'l2', name: 'Level 2 climber', desc: 'Two-stage climb.', cost: 700, hours: 130, w: 10, cx: 3, areas: ['climb'],
          base: { endgame: 42 }, ceil: { endgame: 92 }, caps: { endLevel: 2 }, look: { climber: 'hook2' } },
        { id: 'l3', name: 'Level 3 climber', desc: 'Full traversal to the top level.', cost: 1200, hours: 200, w: 14, cx: 4, areas: ['climb'],
          base: { endgame: 36 }, ceil: { endgame: 95 }, caps: { endLevel: 3 }, look: { climber: 'arms' } }
      ] },
      { id: 'soft', name: 'Software', concepts: [SOFT()] }
    ],
    archetypes: [
      { name: 'Turret + big hopper', min: 76, pick: { drive: 'swerve', frame: ['low', 'std'], intake: 'wide', hopper: 'large', scorer: 'turret', endgame: ['l1', 'l3', 'none'] } },
      { name: 'Big dumper', min: 66, pick: { drive: 'swerve', frame: 'std', intake: 'wide', hopper: 'large', scorer: 'dumper', endgame: ['none', 'l1'] } },
      { name: 'Hood shooter + L2', min: 56, pick: { drive: 'swerve', frame: 'std', intake: ['ground', 'wide'], hopper: ['large', 'med'], scorer: 'hood', endgame: 'l2' } },
      { name: 'Hood shooter', min: 36, pick: { drive: ['wcd', 'swerve'], frame: 'std', intake: 'ground', hopper: 'med', scorer: ['hood', 'fixed'], endgame: ['l1', 'l2'] } },
      { name: 'Fixed shooter', min: 14, pick: { drive: ['kit', 'wcd'], frame: 'std', intake: ['ground', 'outpost'], hopper: ['small', 'med'], scorer: 'fixed', endgame: ['l1', 'none'] } },
      { name: 'Kitbot', min: 0, pick: { drive: 'kit', frame: 'std', intake: 'outpost', hopper: 'small', scorer: 'fixed', endgame: 'none' } },
      { name: 'Low-profile feeder', min: 40, feed: true, pick: { drive: 'swerve', frame: 'low', intake: 'wide', hopper: 'med', scorer: 'fixed', endgame: 'l1' } }
    ]
  };

  G.SEASON_YEARS = [2022, 2023, 2024, 2025, 2026];
  // quick lookups
  G.Seasons.sub = (year, subId) => G.Seasons[year].subs.find(s => s.id === subId);
  G.Seasons.concept = (year, subId, cid) => { const s = G.Seasons.sub(year, subId); return s ? s.concepts.find(c => c.id === cid) : null; };
})();
