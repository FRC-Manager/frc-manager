'use strict';
/* FRC Manager — the classic games (2016–2020): season definitions. Same shape as seasons.js. */
(function () {
  const S = G.Seasons, K = S._K, DRIVE = K.DRIVE, SOFT = K.SOFT, NONE_END = K.NONE_END;

  // =====================================================================
  S[2020] = {
    year: 2020, name: 'INFINITE RECHARGE', pieceName: 'Power Cells', sym: 'rotate',
    tagline: 'Shoot power cells into the Power Port, spin the Control Panel and hang from the Shield Generator.',
    brief: [
      'Robots carry up to five Power Cells (yellow foam balls) and shoot them into the POWER PORT at the far end of the field: 1 point in the Bottom Port, 2 in the Outer Port, 3 when the shot drops through to the Inner Port. Everything counts double in auto.',
      'Scored cells charge three STAGES of 9, 20 and 20 cells. Stage 2 ends with ROTATION CONTROL (spin the Control Panel three to five turns, 10 points) and Stage 3 with POSITION CONTROL (stop it on the right colour, 20 points).',
      'In the last 30 seconds robots park under the Shield Generator (5) or HANG from its switch (25); a level switch adds 15. Bonus RPs: Shield Operational (65 endgame points) and Shield Energized (Stage 3 completed).'
    ],
    timing: { auto: 15, tele: 135, end: 30 }, rpWin: 2, foul: { minor: 3, major: 15 },
    relevance: { swerve: 2, shooter: 3, turret: 3, elevator: 0, arm: 0, intake: 3, index: 3, climb: 3, vision: 3, autoPath: 2, elec: 2 },
    autoTiers: ['Line + 3 preloads', 'Preloads + 2 from the trench', '6-cell auto', '8-cell auto'], autoPieces: [3, 5, 6, 8],
    coachTargets: [{ id: 'auto', name: 'Best option' }, { id: 'upper', name: 'High ports' }, { id: 'lower', name: 'Bottom port' }],
    endNames: ['Park', 'Hang'],
    news: {
      prot: 'The Target Zone and the Loading Zone are protected all match, every alliance is safe in its own Trench Run, and the Rendezvous Point belongs to the climbers in the last 30 seconds.',
      updates: ['Team Update: a Power Cell stuck in the Power Port counts once it has passed the sensor. Poking it out with a robot does not count twice.', 'Team Update: the Control Panel must rest on the colour for five seconds. Four and a half is not five.', 'Team Update: robots may not reach above 45 inches outside the Rendezvous Point. Tall climbers, mind the Trench.', 'Team Update: a robot carrying six Power Cells is carrying one too many, however it got there.'],
      chatter: [['Yellow ball census', 'Power Cells found so far: under the couch (3), in the drill-press chip tray (1), in the principal\'s car (1). Nobody is asking how.'], ['Colour wheel', 'The practice Control Panel has been spun so often that the bearing sings. {student} says it is a C sharp.'], ['Trench limbo', 'The robot is 27.9 inches tall and the Control Panel is 28. {driver} holds their breath every time.']]
    },
    subs: [
      { id: 'drive', name: 'Drivetrain', concepts: DRIVE },
      { id: 'frame', name: 'Frame Height', minor: true, concepts: [
        { id: 'std', name: 'Tall frame', desc: 'Room for a big shooter and climber. Must cross mid-field over the Shield Generator\'s floor rails, which slows it down.', cost: 0, hours: 30, w: 4, cx: 1, areas: ['elec'],
          base: { traverse: 45 }, ceil: { traverse: 80 }, caps: { lowProfile: false }, look: { frame: 'std' } },
        { id: 'low', name: 'Trench-height frame', desc: 'Under 28 inches: drives under the Control Panel through the protected Trench Run, the fastest and safest way across the field.', cost: 300, hours: 70, w: 2, cx: 3, areas: ['elec'],
          base: { traverse: 60 }, ceil: { traverse: 95 }, caps: { lowProfile: true }, look: { frame: 'low' } }
      ] },
      { id: 'intake', name: 'Intake & Indexer', concepts: [
        { id: 'bay', name: 'Loading-bay only (3 cells)', desc: 'The human player drops cells in at the Loading Bay. No ground pickup, three cells at a time.', cost: 200, hours: 50, w: 6, cx: 1, areas: ['intake'],
          base: { intake: 40 }, ceil: { intake: 66 }, caps: { ground: false, station: true, storage: 3 }, look: { intake: 'none' } },
        { id: 'over', name: 'Over-bumper intake + 5-cell indexer', desc: 'Picks cells off the carpet and lines up five in a belt indexer.', cost: 800, hours: 150, w: 15, cx: 3, areas: ['intake', 'index'],
          base: { intake: 45 }, ceil: { intake: 87 }, caps: { ground: true, station: true, storage: 5 }, look: { intake: 'over' } },
        { id: 'wide', name: 'Full-width intake + fast indexer', desc: 'A frame-wide intake that never has to line up on a cell, feeding a five-cell indexer that does not jam.', cost: 1200, hours: 210, w: 18, cx: 4, areas: ['intake', 'index'],
          base: { intake: 50 }, ceil: { intake: 95 }, caps: { ground: true, station: true, storage: 5, wide: 1.3 }, look: { intake: 'wide' } }
      ] },
      { id: 'scorer', name: 'Shooter', concepts: [
        { id: 'dump', name: 'Bottom-port dumper', desc: 'Drives up to the wall and rolls cells into the Bottom Port. One point each, hard to miss.', cost: 200, hours: 60, w: 8, cx: 1, areas: ['shooter'],
          base: { scoreSpd: 50, accuracy: 62 }, ceil: { scoreSpd: 82, accuracy: 96 }, caps: { lower: true, upper: false, rmin: 0.7, rmax: 1.2 }, look: { shooter: 'dump' } },
        { id: 'fixed', name: 'Fixed wall shooter', desc: 'A fixed-angle shooter for the Outer Port from the Target Zone, right in front of the wall.', cost: 800, hours: 120, w: 14, cx: 2, areas: ['shooter'],
          base: { scoreSpd: 40, accuracy: 45, range: 0 }, ceil: { scoreSpd: 78, accuracy: 90, range: 30 }, caps: { lower: true, upper: true, rmin: 1.2, rmax: 3.6 }, look: { shooter: 'fixed' } },
        { id: 'hood', name: 'Adjustable hood shooter', desc: 'Shoots from the Initiation Line and beyond. Straight-on shots can drop through to the Inner Port.', cost: 1300, hours: 180, w: 17, cx: 3, areas: ['shooter', 'vision'],
          base: { scoreSpd: 40, accuracy: 42, range: 30 }, ceil: { scoreSpd: 86, accuracy: 92, range: 82 }, caps: { lower: true, upper: true, rmin: 1.4, rmax: 7.2 }, look: { shooter: 'hood' } },
        { id: 'turret', name: 'Turret + hood', desc: 'Aims by itself and shoots from the Trench Run, the full length of the field away from its own Loading Bay.', cost: 1900, hours: 240, w: 22, cx: 5, areas: ['turret', 'shooter', 'vision'],
          base: { scoreSpd: 38, accuracy: 40, range: 40 }, ceil: { scoreSpd: 92, accuracy: 95, range: 95 }, caps: { lower: true, upper: true, rmin: 1.4, rmax: 9.5, turret: true }, look: { shooter: 'turret' } }
      ] },
      { id: 'panel', name: 'Control Panel', optional: true, minor: true, concepts: [
        { id: 'none', name: 'No panel mechanism', desc: 'Leave the Control Panel to a partner. Saves weight, hours and money.', cost: 0, hours: 0, w: 0, cx: 0, areas: [], base: {}, ceil: {}, caps: { panel: 0 }, look: {} },
        { id: 'spin', name: 'Panel spinner', desc: 'A wheel on an arm that spins the Control Panel: Rotation Control, 10 points and Stage 2.', cost: 250, hours: 50, w: 4, cx: 1, areas: ['arm'],
          base: {}, ceil: {}, caps: { panel: 1 }, look: { manip: 'low' } },
        { id: 'color', name: 'Spinner + colour sensor', desc: 'Reads the colours under the wheel and stops on the right one: Position Control too, 20 points and the Shield Energized bonus.', cost: 500, hours: 90, w: 5, cx: 2, areas: ['arm', 'vision'],
          base: {}, ceil: {}, caps: { panel: 2 }, look: { manip: 'low' } }
      ] },
      { id: 'endgame', name: 'Climber', concepts: [
        NONE_END,
        { id: 'hook', name: 'Hook and winch', desc: 'A telescoping hook and a winch to hang from the Generator Switch.', cost: 600, hours: 110, w: 11, cx: 2, areas: ['climb'],
          base: { endgame: 40 }, ceil: { endgame: 85 }, caps: { endLevel: 1 }, look: { climber: 'hook' } },
        { id: 'level', name: 'Climber with a sliding carriage', desc: 'Hangs, then slides along the bar to bring the switch level: 15 more points and most of the Shield Operational bonus.', cost: 1100, hours: 180, w: 15, cx: 4, areas: ['climb'],
          base: { endgame: 35 }, ceil: { endgame: 93 }, caps: { endLevel: 1, leveler: true }, look: { climber: 'hook2' } }
      ] },
      { id: 'soft', name: 'Software', concepts: [SOFT()] }
    ],
    archetypes: [
      { name: 'Turret + trench runner', min: 76, pick: { drive: ['swerve', 'wcd'], frame: 'low', intake: ['wide', 'over'], scorer: 'turret', panel: ['color', 'spin'], endgame: ['level', 'hook'] } },
      { name: 'Hood shooter + hang', min: 56, pick: { drive: ['swerve', 'wcd'], frame: ['low', 'std'], intake: 'over', scorer: 'hood', panel: ['spin', 'none'], endgame: 'hook' } },
      { name: 'Wall shooter + hang', min: 36, pick: { drive: ['wcd', 'kit'], frame: 'std', intake: 'over', scorer: 'fixed', panel: 'none', endgame: ['hook', 'none'] } },
      { name: 'Bottom-port dumper', min: 16, pick: { drive: 'kit', frame: 'std', intake: ['bay', 'over'], scorer: 'dump', panel: ['none', 'spin'], endgame: ['hook', 'none'] } },
      { name: 'Kitbot dumper', min: 0, pick: { drive: 'kit', frame: 'std', intake: 'bay', scorer: 'dump', panel: 'none', endgame: 'none' } },
      { name: 'Defense bot', min: 20, defense: true, pick: { drive: 'wcd', frame: 'std', intake: 'bay', scorer: 'dump', panel: 'none', endgame: 'hook' } }
    ]
  };

  // =====================================================================
  S[2019] = {
    year: 2019, name: 'DESTINATION: DEEP SPACE', pieceName: 'Hatch Panels & Cargo', sym: 'mirror',
    tagline: 'Seal the rockets and the cargo ship with hatch panels, load them with cargo, and climb back onto the HAB.',
    brief: [
      'Robots start on the HAB platform. For the first 15 seconds a SANDSTORM hides the field from the drivers: robots run autonomously or are driven through an on-board camera. Leaving the HAB is worth 3 points, or 6 from Level 2.',
      'Each alliance has a CARGO SHIP with 8 bays and two ROCKETS with 3 levels of 2 bays. A HATCH PANEL (2 points) seals a bay; only then can CARGO (3 points) be loaded into it. The six side bays of the cargo ship start with a blank panel, so cargo can go straight in.',
      'In the last 30 seconds robots climb back onto the HAB: Level 1 (3), Level 2 (6) or Level 3 (12). Bonus RPs: one complete Rocket (6 hatches and 6 cargo) and HAB Docking (15 climb points).'
    ],
    timing: { auto: 15, tele: 135, end: 30 }, rpWin: 2, foul: { minor: 3, major: 10 },
    relevance: { swerve: 3, shooter: 0, turret: 0, elevator: 3, arm: 2, intake: 3, index: 0, climb: 3, vision: 2, autoPath: 1, elec: 2 },
    autoTiers: ['Drive off the HAB', '1 hatch', '2 hatches', '2 hatches + cargo'], autoPieces: [0, 1, 2, 3],
    coachTargets: [{ id: 'auto', name: 'Best option' }, { id: 'rocket', name: 'Finish a rocket' }, { id: 'ship', name: 'Cargo ship first' }],
    endNames: ['—', 'HAB 1', 'HAB 2', 'HAB 3'],
    news: {
      prot: 'Nobody may touch a robot on its own HAB platform in the last 30 seconds. Everywhere else is open, and one robot per alliance may cross the field to play defense.',
      updates: ['Team Update: a hatch panel held on by hope and one strip of hook-and-loop counts as attached. Barely.', 'Team Update: only one robot per alliance may be on the opponents\' side of the field. Count before you cross.', 'Team Update: a robot is on HAB Level 3 when its bumpers are fully above it. The suction cup is not a bumper.', 'Team Update: cargo that rolls out of an unsealed bay scores nothing, and no, you may not hold it in with the robot.'],
      chatter: [['Sandstorm practice', '{driver} has been driving the practice robot with a cardboard box over their head "for realism". Sandstorm scores are up. Shin injuries too.'], ['Hatch frisbee', 'The hatch panels fly surprisingly well. {mentor} has confiscated four.'], ['Level 3', 'The Level 3 climber lifted the robot nineteen inches, paused, and set it down again very gently on {student}\'s lunch.']]
    },
    subs: [
      { id: 'drive', name: 'Drivetrain', concepts: DRIVE },
      { id: 'intake', name: 'Game-Piece Intake', concepts: [
        { id: 'station', name: 'Loading-station pickup', desc: 'Takes hatch panels and cargo from the human player at the Loading Station. Nothing off the floor.', cost: 200, hours: 50, w: 5, cx: 1, areas: ['intake'],
          base: { intake: 40 }, ceil: { intake: 68 }, caps: { ground: false, station: true }, look: { intake: 'none' } },
        { id: 'ground', name: 'Ground cargo intake', desc: 'A roller intake that takes cargo from the depot and the floor. Hatch panels still come from the Loading Station.', cost: 700, hours: 130, w: 12, cx: 3, areas: ['intake'],
          base: { intake: 45 }, ceil: { intake: 88 }, caps: { ground: true, station: true }, look: { intake: 'over' } },
        { id: 'floor', name: 'Floor hatch pickup + cargo intake', desc: 'Picks hatch panels off the carpet too: a dropped panel is no longer lost, and loading is quicker.', cost: 1100, hours: 190, w: 15, cx: 4, areas: ['intake', 'arm'],
          base: { intake: 48 }, ceil: { intake: 95 }, caps: { ground: true, station: true, hatchFloor: true }, look: { intake: 'under' } }
      ] },
      { id: 'scorer', name: 'Manipulator & Lift', pneu: true, concepts: [
        { id: 'low', name: 'Fixed hatch plate + cargo roller', desc: 'A hook-and-loop plate for hatches and a roller for cargo at bumper height: the cargo ship and the lowest rocket level.', cost: 300, hours: 70, w: 9, cx: 1, areas: ['arm'],
          base: { scoreSpd: 50, accuracy: 62 }, ceil: { scoreSpd: 84, accuracy: 95 }, caps: { reach: 1, hatch: true, cargo: true }, look: { manip: 'low' } },
        { id: 'arm', name: 'Two-level arm', desc: 'A pivoting arm that reaches the second rocket level.', cost: 800, hours: 140, w: 14, cx: 3, areas: ['arm'],
          base: { scoreSpd: 42, accuracy: 48 }, ceil: { scoreSpd: 82, accuracy: 92 }, caps: { reach: 2, hatch: true, cargo: true, tall: 0.2 }, look: { manip: 'arm' } },
        { id: 'elev', name: 'Three-level elevator', desc: 'An elevator to all three rocket levels: the only way to complete a rocket.', cost: 1400, hours: 210, w: 19, cx: 4, areas: ['elevator', 'arm'],
          base: { scoreSpd: 38, accuracy: 45 }, ceil: { scoreSpd: 86, accuracy: 93 }, caps: { reach: 3, hatch: true, cargo: true, tall: 0.5 }, look: { manip: 'elevator' } },
        { id: 'elevfast', name: 'Fast elevator + active hatch claw', desc: 'A quick cascade elevator with a claw that grabs and releases hatches: the fastest cycles on every level.', cost: 1900, hours: 260, w: 22, cx: 5, areas: ['elevator', 'arm', 'intake'],
          base: { scoreSpd: 40, accuracy: 45 }, ceil: { scoreSpd: 95, accuracy: 96 }, caps: { reach: 3, hatch: true, cargo: true, tall: 0.6 }, look: { manip: 'elevwrist' } }
      ] },
      { id: 'endgame', name: 'HAB Climber', concepts: [
        Object.assign({}, NONE_END, { name: 'No climber (drive onto Level 1)', desc: 'Every robot can drive up the ramp to HAB Level 1 for 3 points. Saves weight, hours and money.' }),
        { id: 'l2', name: 'Level 2 lift', desc: 'Pistons or a folding ramp to step up onto HAB Level 2.', cost: 400, hours: 80, w: 8, cx: 2, areas: ['climb'],
          base: { endgame: 45 }, ceil: { endgame: 88 }, caps: { endLevel: 2 }, look: { climber: 'hook' } },
        { id: 'l3', name: 'Level 3 stilts', desc: 'Lifts the whole robot nineteen inches and drives it onto HAB Level 3: 12 points, most of the HAB Docking bonus.', cost: 1100, hours: 190, w: 16, cx: 4, areas: ['climb'],
          base: { endgame: 35 }, ceil: { endgame: 90 }, caps: { endLevel: 3 }, look: { climber: 'hook2' } },
        { id: 'l3buddy', name: 'Level 3 lift with partner ramps', desc: 'Climbs to Level 3 and carries a partner up with it: 24 points from one mechanism.', cost: 1700, hours: 260, w: 21, cx: 5, areas: ['climb'],
          base: { endgame: 30 }, ceil: { endgame: 92 }, caps: { endLevel: 3, buddy: true }, look: { climber: 'arms' } }
      ] },
      { id: 'soft', name: 'Software', concepts: [SOFT()] }
    ],
    archetypes: [
      { name: 'Fast elevator + Level 3', min: 76, pick: { drive: ['swerve', 'wcd'], intake: ['floor', 'ground'], scorer: 'elevfast', endgame: ['l3', 'l3buddy'] } },
      { name: 'Elevator + Level 3', min: 58, pick: { drive: ['wcd', 'swerve'], intake: 'ground', scorer: 'elev', endgame: ['l3', 'l2'] } },
      { name: 'Two-level arm + Level 2', min: 38, pick: { drive: ['wcd', 'kit'], intake: ['ground', 'station'], scorer: 'arm', endgame: ['l2', 'none'] } },
      { name: 'Cargo-ship cycler', min: 16, pick: { drive: ['kit', 'wcd'], intake: ['station', 'ground'], scorer: 'low', endgame: ['l2', 'none'] } },
      { name: 'Kitbot hatch plate', min: 0, pick: { drive: 'kit', intake: 'station', scorer: 'low', endgame: 'none' } },
      { name: 'Defense bot', min: 20, defense: true, pick: { drive: 'wcd', intake: 'station', scorer: 'low', endgame: 'l2' } }
    ]
  };

  // =====================================================================
  S[2018] = {
    year: 2018, name: 'FIRST POWER UP', pieceName: 'Power Cubes', sym: 'mirror',
    tagline: 'Tip the Switch and the Scale your way with power cubes, feed the Vault for power-ups, and climb to face the boss.',
    brief: [
      'Each alliance has a SWITCH on its own side and shares the tall SCALE at mid-field. They are balances: put more Power Cubes on your plate than the opponents have on theirs and you OWN it. Every second of ownership scores 1 point (2 in auto). Which plate is yours changes every match and is only announced at the start.',
      'Cubes pushed through the EXCHANGE go to the VAULT: 5 points each, and they buy three POWER-UPS, played by the drive coach. FORCE gives ownership for 10 seconds, BOOST doubles ownership points for 10 seconds, LEVITATE is a free climb.',
      'In the last 30 seconds robots CLIMB the rung on the Scale tower (30) or park on the platform (5). Bonus RPs: Auto Quest (all three robots cross the auto line and you own your Switch when auto ends) and Face the Boss (three climbs; Levitate counts as one).'
    ],
    timing: { auto: 15, tele: 135, end: 30 }, rpWin: 2, foul: { minor: 5, major: 25 },
    relevance: { swerve: 2, shooter: 0, turret: 0, elevator: 3, arm: 2, intake: 3, index: 0, climb: 3, vision: 1, autoPath: 3, elec: 2 },
    autoTiers: ['Auto-run', 'Switch auto', 'Scale auto', 'Multi-cube scale auto'], autoPieces: [0, 1, 1, 3],
    coachTargets: [{ id: 'auto', name: 'Best option' }, { id: 'scale', name: 'Hold the Scale' }, { id: 'switch', name: 'Hold our Switch' }, { id: 'vault', name: 'Feed the Vault' }],
    endNames: ['Park', 'Climb'],
    news: {
      prot: 'A robot at its own end of the Scale (the null territory) may not be touched, and neither may one feeding the Exchange. The platform belongs to the climbers in the last 30 seconds.',
      updates: ['Team Update: a Power Cube counts on a plate when it is fully supported by it. Leaning on the fence is not supported.', 'Team Update: throwing a cube onto the Scale from across the field is legal. Hitting a referee with it is not.', 'Team Update: Levitate may be played at any time, but it only helps if somebody has not climbed.', 'Team Update: robots may not pull opponents off the rung. Yes, somebody tried.'],
      chatter: [['Milk crates', 'The practice cubes are milk crates in yellow covers. The cafeteria has asked, politely, for the crates back.'], ['Game data', '{student} wrote the plate assignment on their hand so the autonomous would "definitely know". The robot went left anyway.'], ['Vault duty', '{driver} has fed the practice Exchange 300 cubes this week and now calls the human player "the bank".']]
    },
    subs: [
      { id: 'drive', name: 'Drivetrain', concepts: DRIVE },
      { id: 'intake', name: 'Cube Intake', pneu: true, concepts: [
        { id: 'claw', name: 'Pinch claw', desc: 'Two arms that squeeze a cube. The robot has to line up on it exactly.', cost: 250, hours: 60, w: 7, cx: 1, areas: ['intake'],
          base: { intake: 40 }, ceil: { intake: 68 }, caps: { ground: true, station: true }, look: { intake: 'claw' } },
        { id: 'wheeled', name: 'Wheeled intake', desc: 'Compliant wheels pull a cube in from any angle.', cost: 700, hours: 130, w: 12, cx: 3, areas: ['intake'],
          base: { intake: 45 }, ceil: { intake: 88 }, caps: { ground: true, station: true }, look: { intake: 'over' } },
        { id: 'wide', name: 'Wide intake with centring wheels', desc: 'Touch it, own it: grabs a cube off the pile at full speed and squares it up by itself.', cost: 1100, hours: 190, w: 15, cx: 4, areas: ['intake'],
          base: { intake: 50 }, ceil: { intake: 95 }, caps: { ground: true, station: true, wide: 1.25 }, look: { intake: 'wide' } }
      ] },
      { id: 'scorer', name: 'Lift', concepts: [
        { id: 'low', name: 'Switch-height arm', desc: 'Lifts a cube over the Switch fence and pushes cubes through the Exchange. Cannot reach the Scale.', cost: 400, hours: 80, w: 10, cx: 2, areas: ['arm'],
          base: { scoreSpd: 48, accuracy: 60 }, ceil: { scoreSpd: 84, accuracy: 95 }, caps: { reach: 1 }, look: { manip: 'arm' } },
        { id: 'elev', name: 'Scale elevator', desc: 'A two-stage elevator that puts cubes on the Scale, even when it is tipped against you.', cost: 1300, hours: 200, w: 19, cx: 4, areas: ['elevator', 'arm'],
          base: { scoreSpd: 38, accuracy: 45 }, ceil: { scoreSpd: 85, accuracy: 93 }, caps: { reach: 2, tall: 0.5 }, look: { manip: 'elevator' } },
        { id: 'elevfast', name: 'Fast elevator + wrist', desc: 'A quick continuous elevator with a wrist that shoots cubes onto the plate. The robots that owned the Scale had one.', cost: 1900, hours: 260, w: 22, cx: 5, areas: ['elevator', 'arm', 'intake'],
          base: { scoreSpd: 40, accuracy: 45 }, ceil: { scoreSpd: 95, accuracy: 96 }, caps: { reach: 2, tall: 0.6 }, look: { manip: 'elevwrist' } }
      ] },
      { id: 'endgame', name: 'Climber', concepts: [
        NONE_END,
        { id: 'hook', name: 'Hook and winch', desc: 'Hooks the rung seven feet up and winches the robot off the ground.', cost: 700, hours: 120, w: 12, cx: 3, areas: ['climb'],
          base: { endgame: 40 }, ceil: { endgame: 88 }, caps: { endLevel: 1 }, look: { climber: 'hook2' } },
        { id: 'buddy', name: 'Climber with partner forks', desc: 'Climbs and carries a partner up with it: two climbs from one mechanism, and with Levitate the Face the Boss bonus.', cost: 1500, hours: 240, w: 20, cx: 5, areas: ['climb'],
          base: { endgame: 32 }, ceil: { endgame: 92 }, caps: { endLevel: 1, buddy: true }, look: { climber: 'arms' } }
      ] },
      { id: 'soft', name: 'Software', concepts: [SOFT()] }
    ],
    archetypes: [
      { name: 'Fast elevator + partner climb', min: 76, pick: { drive: ['swerve', 'wcd'], intake: 'wide', scorer: 'elevfast', endgame: ['buddy', 'hook'] } },
      { name: 'Scale elevator + climb', min: 56, pick: { drive: ['wcd', 'swerve'], intake: 'wheeled', scorer: 'elev', endgame: 'hook' } },
      { name: 'Switch and vault bot', min: 34, pick: { drive: ['wcd', 'kit'], intake: 'wheeled', scorer: 'low', endgame: ['hook', 'none'] } },
      { name: 'Claw switch bot', min: 14, pick: { drive: 'kit', intake: 'claw', scorer: 'low', endgame: 'none' } },
      { name: 'Kitbot cube pusher', min: 0, pick: { drive: 'kit', intake: 'claw', scorer: 'low', endgame: 'none' } },
      { name: 'Defense bot', min: 20, defense: true, pick: { drive: 'wcd', intake: 'claw', scorer: 'low', endgame: 'hook' } }
    ]
  };

  // =====================================================================
  G.Data.STAT.fuel = 'Fuel Shooting';
  S[2017] = {
    year: 2017, name: 'FIRST STEAMWORKS', pieceName: 'Gears & Fuel', sym: 'mirror',
    tagline: 'Deliver gears to start the airship\'s rotors, fire fuel into the boiler, and climb the rope before take-off.',
    brief: [
      'Robots carry GEARS from the Loading Station at the far end of the field to the pegs of their AIRSHIP, where the human-player pilots haul them up. The four ROTORS need 1, 2, 4 and 6 gears (one spare gear is already on board). Each turning rotor is worth 40 points, or 60 if it turns in auto.',
      'FUEL (small balls, hundreds of them) goes into the BOILER: three balls in the high goal make 1 kPa of pressure, nine in the low goal. In auto every high-goal ball is a whole kPa. Each kPa is 1 point.',
      'In the last 30 seconds robots climb their ROPE: 50 points each. Bonus RPs: 40 kPa of pressure, and all four rotors turning. In playoffs these are worth 20 and 100 points instead.'
    ],
    timing: { auto: 15, tele: 135, end: 30 }, rpWin: 2, foul: { minor: 5, major: 25 },
    relevance: { swerve: 2, shooter: 2, turret: 1, elevator: 0, arm: 1, intake: 3, index: 2, climb: 3, vision: 2, autoPath: 2, elec: 2 },
    autoTiers: ['Cross the base line', 'Gear on a peg', 'Gear + preloaded fuel', 'Gear + hopper of fuel'], autoPieces: [0, 1, 1, 1],
    coachTargets: [{ id: 'auto', name: 'Best option' }, { id: 'gears', name: 'Gears only' }, { id: 'fuel', name: 'Fuel when possible' }],
    endNames: ['—', 'Climb'],
    news: {
      prot: 'Nobody may touch a robot in its own Retrieval Zone or in the Key in front of its Boiler, and the ropes belong to the climbers in the last 30 seconds.',
      updates: ['Team Update: a gear counts when the pilot has it on the airship. A gear on the floor of the airship is still on the airship.', 'Team Update: pilots may not lean out past the railing. This is a safety rule and also a physics rule.', 'Team Update: ropes are supplied by the teams. Yes, the knot matters. No, we will not tie it for you.', 'Team Update: fuel that bounces out of the high goal does not count, even if it was very close.'],
      chatter: [['Fuel everywhere', 'Fuel balls found this week: the gym (41), the band room (6), a tuba (1).'], ['Rope committee', 'The rope committee has tested nine ropes and four knots. {student} now ties a bowline faster than their shoelaces.'], ['Pilot school', '{driver} dropped a gear on the practice airship and the whole shop went quiet. The human player has asked for gloves with more grip.']]
    },
    subs: [
      { id: 'drive', name: 'Drivetrain', concepts: DRIVE },
      { id: 'scorer', name: 'Gear Mechanism', pneu: true, concepts: [
        { id: 'slot', name: 'Passive gear slot', desc: 'An open pocket: the human player drops a gear in at the Loading Station and the peg pulls it out. The driver has to line up exactly.', cost: 150, hours: 40, w: 4, cx: 1, areas: ['intake'],
          base: { scoreSpd: 42, accuracy: 50, intake: 40 }, ceil: { scoreSpd: 76, accuracy: 86, intake: 66 }, caps: { gear: true, gearFloor: false }, look: { intake: 'none' } },
        { id: 'active', name: 'Active gear gripper', desc: 'Holds the gear and lets go on the peg, so it can back away at once. Loads at the Loading Station only.', cost: 500, hours: 100, w: 7, cx: 2, areas: ['intake', 'arm'],
          base: { scoreSpd: 46, accuracy: 52, intake: 44 }, ceil: { scoreSpd: 88, accuracy: 94, intake: 80 }, caps: { gear: true, gearFloor: false }, look: { intake: 'claw' } },
        { id: 'floor', name: 'Floor gear pickup', desc: 'Scoops gears off the carpet: no lining up at the Loading Station, and a dropped gear is not lost. What the fastest gear cyclers ran.', cost: 1000, hours: 180, w: 11, cx: 4, areas: ['intake', 'arm'],
          base: { scoreSpd: 48, accuracy: 52, intake: 48 }, ceil: { scoreSpd: 95, accuracy: 96, intake: 95 }, caps: { gear: true, gearFloor: true }, look: { intake: 'under' } }
      ] },
      { id: 'fuel', name: 'Fuel System', optional: true, minor: true, concepts: [
        { id: 'none', name: 'No fuel system', desc: 'Gears and the rope only. Most robots did exactly this.', cost: 0, hours: 0, w: 0, cx: 0, areas: [], base: {}, ceil: {}, caps: { fuelHigh: false, fuelLow: false, storage: 0 }, look: {} },
        { id: 'dump', name: 'Low-goal dumper (40 balls)', desc: 'Catches a hopper of fuel and tips it into the low goal. Nine balls make one kPa, so it is slow pressure, but it cannot miss.', cost: 400, hours: 80, w: 10, cx: 2, areas: ['index'],
          base: { fuel: 45 }, ceil: { fuel: 82 }, caps: { fuelHigh: false, fuelLow: true, storage: 40 }, look: { shooter: 'dump', hopper: 20 } },
        { id: 'shoot', name: 'High-goal shooter (30 balls)', desc: 'A flywheel shooter for the high goal from the Key. Enough for the preloaded fuel in auto and a few kPa more.', cost: 1100, hours: 170, w: 16, cx: 3, areas: ['shooter', 'index'],
          base: { fuel: 38 }, ceil: { fuel: 86 }, caps: { fuelHigh: true, fuelLow: false, storage: 30 }, look: { shooter: 'fixed', hopper: 20 } },
        { id: 'mega', name: 'High-volume shooter + big hopper (70 balls)', desc: 'Several flywheels, an agitator and a hopper as big as the rules allow: a whole field hopper of fuel in a few seconds. The only way to 40 kPa.', cost: 1900, hours: 260, w: 24, cx: 5, areas: ['shooter', 'index', 'vision'],
          base: { fuel: 36 }, ceil: { fuel: 95 }, caps: { fuelHigh: true, fuelLow: false, storage: 70 }, look: { shooter: 'wide', hopper: 45 } }
      ] },
      { id: 'endgame', name: 'Rope Climber', concepts: [
        NONE_END,
        { id: 'winch', name: 'Winch drum', desc: 'A drum that catches the rope and winds the robot up. Slow, and the catch takes a few tries.', cost: 350, hours: 70, w: 8, cx: 2, areas: ['climb'],
          base: { endgame: 42 }, ceil: { endgame: 82 }, caps: { endLevel: 1 }, look: { climber: 'hook' } },
        { id: 'fast', name: 'Fast rope grabber', desc: 'A hook-and-loop roller that grabs the rope at the first touch and a geared motor that lifts the robot in a few seconds.', cost: 900, hours: 150, w: 10, cx: 3, areas: ['climb'],
          base: { endgame: 45 }, ceil: { endgame: 96 }, caps: { endLevel: 1 }, look: { climber: 'hook2' } }
      ] },
      { id: 'soft', name: 'Software', concepts: [SOFT()] }
    ],
    archetypes: [
      { name: 'Floor gears + shooter + fast climb', min: 78, pick: { drive: ['swerve', 'mec', 'wcd'], scorer: 'floor', fuel: ['mega', 'shoot'], endgame: 'fast' } },
      { name: 'Floor gears + fast climb', min: 58, pick: { drive: ['mec', 'wcd', 'swerve'], scorer: ['floor', 'active'], fuel: ['none', 'shoot'], endgame: 'fast' } },
      { name: 'Gear gripper + climb', min: 36, pick: { drive: ['wcd', 'mec', 'kit'], scorer: ['active', 'slot'], fuel: 'none', endgame: ['winch', 'fast'] } },
      { name: 'Gear slot + low-goal dumper', min: 16, pick: { drive: 'kit', scorer: 'slot', fuel: ['dump', 'none'], endgame: ['winch', 'none'] } },
      { name: 'Kitbot gear slot', min: 0, pick: { drive: 'kit', scorer: 'slot', fuel: 'none', endgame: 'none' } },
      { name: 'Defense bot', min: 20, defense: true, pick: { drive: 'wcd', scorer: 'slot', fuel: 'none', endgame: 'winch' } }
    ]
  };

  // =====================================================================
  // 2016: the field is rough, so every drivetrain is a tank on big pneumatic wheels (no mecanum, no swerve)
  const DRIVE16 = [
    { id: 'kit', name: 'Kitbot on pneumatic wheels', desc: 'The kit chassis with the biggest wheels that fit. It gets over the easy defenses, slowly, and sometimes sits down on the hard ones.', cost: 150, hours: 70, w: 40, cx: 1, areas: ['elec'],
      base: { speed: 38, agility: 25, push: 45, traverse: 40 }, ceil: { speed: 60, agility: 42, push: 62, traverse: 66 }, look: { drive: 'tank' } },
    { id: 'wcd', name: '6-wheel pneumatic drive', desc: 'Six 8-inch pneumatic tyres on a custom frame. Fast in the open and good on most defenses.', cost: 1300, hours: 130, w: 44, cx: 2, areas: ['elec'],
      base: { speed: 50, agility: 32, push: 60, traverse: 52 }, ceil: { speed: 82, agility: 52, push: 86, traverse: 84 }, look: { drive: 'wcd' } },
    { id: 'wcd8', name: '8-wheel pneumatic drive', desc: 'Eight wheels, so some rubber is always on the next obstacle. The drivetrain of the robots that crossed everything without slowing down.', cost: 1700, hours: 170, w: 48, cx: 3, areas: ['elec'],
      base: { speed: 48, agility: 30, push: 62, traverse: 60 }, ceil: { speed: 80, agility: 50, push: 88, traverse: 96 }, look: { drive: 'wcd' } },
    { id: 'tread', name: 'Tank treads', desc: 'Belts instead of wheels: nothing stops it and nothing pushes it, but it is slow and the treads wear.', cost: 1500, hours: 160, w: 50, cx: 3, areas: ['elec'],
      base: { speed: 40, agility: 26, push: 68, traverse: 58 }, ceil: { speed: 68, agility: 44, push: 95, traverse: 93 }, look: { drive: 'tank' } }
  ];
  Object.assign(G.Data.DRIVE_FAMILY = G.Data.DRIVE_FAMILY || {}, { wcd8: 'tank', tread: 'tank' });
  S[2016] = {
    year: 2016, name: 'FIRST STRONGHOLD', pieceName: 'Boulders', sym: 'rotate',
    tagline: 'Cross the enemy defenses, weaken their tower with boulders, and scale it before time runs out.',
    brief: [
      'Between your robots and the enemy TOWER stand five DEFENSES: the low bar, and four chosen by the opponents from the portcullis, cheval de frise, moat, ramparts, drawbridge, sally port, rock wall and rough terrain. Crossing one scores 5 points (10 in auto), twice per defense, after which it is DAMAGED.',
      'Robots carry one BOULDER at a time into the courtyard and score it in the tower: 2 points in a low goal, 5 in a high goal (5 and 10 in auto). Eight boulders WEAKEN the tower.',
      'In the last 20 seconds robots drive onto the tower\'s base to CHALLENGE it (5) or climb it to SCALE (15). Bonus RPs: BREACH (four of the five defenses damaged) and CAPTURE (the tower weakened and all three robots on it). In playoffs these are worth 20 and 25 points instead.'
    ],
    timing: { auto: 15, tele: 135, end: 20 }, rpWin: 2, foul: { minor: 5, major: 5 },
    relevance: { swerve: 0, shooter: 3, turret: 0, elevator: 0, arm: 2, intake: 2, index: 0, climb: 2, vision: 3, autoPath: 2, elec: 2 },
    autoTiers: ['Reach a defense', 'Cross a defense', 'Cross + low goal', 'Cross + high goal'], autoPieces: [0, 0, 1, 1],
    coachTargets: [{ id: 'auto', name: 'Best option' }, { id: 'breach', name: 'Breach first' }, { id: 'tower', name: 'Boulders first' }],
    endNames: ['Challenge', 'Scale'],
    news: {
      prot: 'A robot may not be touched while it is crossing a defense or collecting in its own Secret Passage. In the courtyard everything goes, and one defender may wait there.',
      updates: ['Team Update: a defense is crossed when the whole robot has gone from the neutral zone into the courtyard. Halfway and back is a nice try.', 'Team Update: a boulder that bounces out of the high goal does not weaken the tower, however loudly the crowd cheers.', 'Team Update: robots taller than 4 ft 6 in may not exist in the courtyard. Blockers, measure twice.', 'Team Update: the audience picks one defense per match. The audience likes the drawbridge. Sorry.'],
      chatter: [['Low bar', 'The robot is 14.9 inches tall and the low bar is 15. {driver} ducks every time it goes under.'], ['Defense carpentry', 'The parents built all nine practice defenses in one weekend. The moat is now a permanent feature of the shop, and of {student}\'s shins.'], ['Boulder dust', 'The foam boulders shed grey dust on everything. {mentor} has started calling it "castle weather".']]
    },
    subs: [
      { id: 'drive', name: 'Drivetrain', concepts: DRIVE16 },
      { id: 'frame', name: 'Frame Height', minor: true, concepts: [
        { id: 'std', name: 'Tall frame', desc: 'Room for a big shooter. Cannot use the low bar, the one defense that is always there and always quick.', cost: 0, hours: 30, w: 4, cx: 1, areas: ['elec'],
          base: {}, ceil: {}, caps: { lowProfile: false }, look: { frame: 'std' } },
        { id: 'low', name: 'Low-bar frame', desc: 'Under 15 inches with everything folded: goes under the low bar every cycle, right next to where the boulders come out.', cost: 300, hours: 80, w: 2, cx: 3, areas: ['elec'],
          base: {}, ceil: {}, caps: { lowProfile: true }, look: { frame: 'low' } }
      ] },
      { id: 'intake', name: 'Intake & Defense Tools', pneu: true, concepts: [
        { id: 'fixed', name: 'Fixed roller intake', desc: 'A roller at the front that pulls a boulder in. Does nothing for the defenses.', cost: 300, hours: 70, w: 8, cx: 1, areas: ['intake'],
          base: { intake: 40 }, ceil: { intake: 72 }, caps: { ground: true, toolA: false, toolC: false }, look: { intake: 'over' } },
        { id: 'pivot', name: 'Pivoting intake arm', desc: 'The intake swings up and down: it also lifts the portcullis and pushes the cheval de frise flat.', cost: 800, hours: 140, w: 12, cx: 3, areas: ['intake', 'arm'],
          base: { intake: 45 }, ceil: { intake: 90 }, caps: { ground: true, toolA: true, toolC: false }, look: { intake: 'under' } },
        { id: 'hook', name: 'Intake arm + door hook', desc: 'Adds a hook that pulls the drawbridge down and the sally port open: every defense on the field, alone.', cost: 1300, hours: 210, w: 15, cx: 4, areas: ['intake', 'arm'],
          base: { intake: 47 }, ceil: { intake: 94 }, caps: { ground: true, toolA: true, toolC: true }, look: { intake: 'claw' } }
      ] },
      { id: 'scorer', name: 'Boulder Scorer', concepts: [
        { id: 'low', name: 'Low-goal roller', desc: 'Rolls the boulder into a low goal at the foot of the tower. 2 points, hard to miss, and it still weakens the tower.', cost: 150, hours: 50, w: 5, cx: 1, areas: ['shooter'],
          base: { scoreSpd: 50, accuracy: 64 }, ceil: { scoreSpd: 84, accuracy: 96 }, caps: { lower: true, upper: false, rmin: 0.8, rmax: 1.3 }, look: { shooter: 'dump' } },
        { id: 'batter', name: 'Fixed high-goal shooter', desc: 'A fixed-angle shooter for the high goal from the tower\'s base, where a defender can lean on it.', cost: 800, hours: 130, w: 13, cx: 2, areas: ['shooter'],
          base: { scoreSpd: 40, accuracy: 44, range: 0 }, ceil: { scoreSpd: 80, accuracy: 90, range: 30 }, caps: { lower: true, upper: true, rmin: 1.0, rmax: 2.4 }, look: { shooter: 'fixed' } },
        { id: 'hood', name: 'Adjustable shooter', desc: 'Shoots the high goal from just inside the defenses, out of a blocker\'s reach. With vision alignment it rarely misses.', cost: 1400, hours: 200, w: 17, cx: 4, areas: ['shooter', 'vision'],
          base: { scoreSpd: 40, accuracy: 42, range: 30 }, ceil: { scoreSpd: 90, accuracy: 94, range: 90 }, caps: { lower: true, upper: true, rmin: 1.0, rmax: 5.4 }, look: { shooter: 'hood' } }
      ] },
      { id: 'endgame', name: 'Scaling Mechanism', concepts: [
        Object.assign({}, NONE_END, { name: 'No scaling mechanism (challenge only)', desc: 'Every robot can drive onto the tower\'s base for 5 points. Saves weight, hours and money.' }),
        { id: 'scale', name: 'Scaling hook and winch', desc: 'Reaches the rung six feet up and pulls the robot off the ground: 15 points.', cost: 900, hours: 160, w: 14, cx: 4, areas: ['climb'],
          base: { endgame: 38 }, ceil: { endgame: 90 }, caps: { endLevel: 1 }, look: { climber: 'hook2' } }
      ] },
      { id: 'soft', name: 'Software', concepts: [SOFT()] }
    ],
    archetypes: [
      { name: 'Low-bar shooter + scale', min: 76, pick: { drive: ['wcd8', 'wcd'], frame: 'low', intake: ['hook', 'pivot'], scorer: 'hood', endgame: 'scale' } },
      { name: 'Outer-works shooter', min: 56, pick: { drive: ['wcd8', 'wcd', 'tread'], frame: ['low', 'std'], intake: 'pivot', scorer: ['hood', 'batter'], endgame: ['scale', 'none'] } },
      { name: 'Batter shooter + breacher', min: 36, pick: { drive: ['wcd', 'tread', 'kit'], frame: ['std', 'low'], intake: 'pivot', scorer: 'batter', endgame: 'none' } },
      { name: 'Low-goal breacher', min: 14, pick: { drive: ['kit', 'wcd'], frame: ['low', 'std'], intake: ['pivot', 'fixed'], scorer: 'low', endgame: 'none' } },
      { name: 'Kitbot breacher', min: 0, pick: { drive: 'kit', frame: 'std', intake: 'fixed', scorer: 'low', endgame: 'none' } },
      { name: 'Courtyard blocker', min: 20, defense: true, pick: { drive: 'tread', frame: 'std', intake: 'fixed', scorer: 'low', endgame: 'none' } }
    ]
  };

  // the games that exist, in order (the career calendar offers a start year once its game is here)
  G.SEASON_YEARS = Object.keys(S).filter(k => /^\d{4}$/.test(k)).map(Number).sort((a, b) => a - b);
})();
