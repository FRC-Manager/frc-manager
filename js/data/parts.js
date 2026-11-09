'use strict';
/* FRC Manager — parts library: two electronics vendors, mechanical COTS, the kit of parts and game elements.
   Counts follow typical FRC robots: a swerve drive uses 4 modules, 8 brushless motors and 4 absolute encoders;
   most mechanisms use 1–3 motors; every robot needs one control/power hub. */
(function () {
  const D = G.Data = G.Data || {};

  D.VENDORS = {
    A: { id: 'A', name: 'Apex Motion', short: 'Apex', tag: 'Premium', color: '#ff9f43', desc: 'Top-performance electronics at premium prices.' },
    B: { id: 'B', name: 'Lumen Robotics', short: 'Lumen', tag: 'Value', color: '#35c9d6', desc: 'Dependable, economical electronics.' },
    K: { id: 'K', name: 'Kit of Parts', short: 'KOP', tag: 'Basic', color: '#8d97a1', desc: 'Basic, low-performance parts: some free at every Kickoff, more for very little, always in stock.' },
    C: { id: 'C', name: 'COTS suppliers', short: 'COTS', tag: 'Mechanical', color: '#b39dff', desc: 'Mechanical components from many suppliers. Always compatible.' }
  };

  // Part categories. elec: sold by vendor A or B and part of the robot's control system (mixing vendors costs a bit).
  // max: inventory slots (enough for two full robots, with a few to spare).
  D.PART_CATS = [
    { id: 'motor', name: 'Brushless motor + controller', short: 'Motors', icon: 'motor', elec: true, max: 44, desc: 'Drivetrains use 4–8, most mechanisms 1–3.' },
    { id: 'enc', name: 'Absolute encoder', short: 'Encoders', icon: 'sensor', elec: true, max: 18, desc: 'One per swerve module, plus arms, elevators, hoods and turrets.' },
    { id: 'ctrl', name: 'Control & power hub', short: 'Control hubs', icon: 'chip', elec: true, max: 3, desc: 'Power distribution, CAN network and IMU. One per robot.' },
    { id: 'swerve', name: 'Swerve module', short: 'Swerve modules', icon: 'swerve', elec: true, max: 10, desc: 'Four per swerve drivetrain (motors not included).' },
    { id: 'gearbox', name: 'Drive gearbox', short: 'Gearboxes', icon: 'gear', max: 10, desc: 'Tank and West Coast drives use 2, mecanum 4.' },
    { id: 'camera', name: 'Vision camera + coprocessor', short: 'Cameras', icon: 'camera', max: 4, desc: 'Vision Level 1 needs one, Level 2 needs two.' },
    { id: 'pneu', name: 'Pneumatics kit', short: 'Pneumatics', icon: 'air', max: 2, desc: 'Intake and manipulator builds take 15% fewer hours.' },
    { id: 'kElev', kit: 'elevator', name: 'Elevator stage kit', short: 'Elevator kits', icon: 'elevator', max: 6, desc: 'Bearing blocks, tubes and rigging for one elevator stage. Tall elevators use 2.' },
    { id: 'kArm', kit: 'arm', name: 'Arm & pivot kit', short: 'Arm kits', icon: 'arm', max: 6, desc: 'Pivot gearbox, bearings and arm tube for one joint.' },
    { id: 'kShoot', kit: 'shooter', name: 'Flywheel shooter kit', short: 'Shooter kits', icon: 'shooter', max: 6, desc: 'Flywheels, shafts and side plates. Wide dumpers use 2.' },
    { id: 'kTurret', kit: 'turret', name: 'Turret bearing kit', short: 'Turret kits', icon: 'turret', max: 4, desc: 'Large turret bearing, ring gear and mounts.' },
    { id: 'kIntake', kit: 'intake', name: 'Intake roller kit', short: 'Intake kits', icon: 'intake', max: 6, desc: 'Rollers, belts and a deploy pivot. Dual and full-width intakes use 2.' },
    { id: 'kIndex', kit: 'index', name: 'Indexer & hopper kit', short: 'Indexer kits', icon: 'parts', max: 4, desc: 'Belts, rollers and walls for storing game pieces.' },
    { id: 'kClimb', kit: 'climb', name: 'Climber kit', short: 'Climber kits', icon: 'climb', max: 10, desc: 'One telescoping stage with a winch and hooks. Higher climbs use 2 to 4.' }
  ];
  D.PART_CAT = {}; D.PART_CATS.forEach(c => D.PART_CAT[c.id] = c);
  D.KIT_FOR_AREA = { elevator: 'kElev', arm: 'kArm', shooter: 'kShoot', turret: 'kTurret', intake: 'kIntake', index: 'kIndex', climb: 'kClimb' };
  D.KIT_HOURS = 0.72;   // a full set of mechanical COTS kits cuts a build's hours by 28% and removes first-build penalties
  D.KIT_COST = 0.75;    // ... and a quarter of the materials (a partial set gives part of both)
  D.COPY_HOURS = 0.25;  // building another copy of a finished design: a quarter of the first build's hours (no design work)
  D.COPY_COST = 0.6;    // ... and 60% of its materials (electronics and kits on top)
  D.STORE_MAX = 2;      // built subsystems of each kind you can keep in storage (besides the ones on the two robots)
  D.PROTO_COST = 1.1;   // the first one of a new concept or version is a prototype: 10% more in materials
  D.MIX_HOURS = 1.1;    // mixing Apex and Lumen electronics: integration costs 10% more hardware and software hours

  // Products: perf 0 (kit brushed motor) … 1 (best); gen 1 is on sale at the start of every career.
  const ELEC_NAMES = { motor: { A: 'Apex Torque', B: 'Lumen Ion' }, enc: { A: 'Apex TrueAngle', B: 'Lumen SpinSense' }, ctrl: { A: 'Apex Core Hub', B: 'Lumen PowerGrid' }, swerve: { A: 'Apex Vector module', B: 'Lumen Pivot module' } };
  const ELEC_PRICE = { motor: { A: 230, B: 150 }, enc: { A: 65, B: 40 }, ctrl: { A: 700, B: 440 }, swerve: { A: 460, B: 330 } };
  const ELEC_PERF = { A: 0.72, B: 0.5 };
  D.ROMAN = ['', '', ' II', ' III', ' IV'];
  D.makeProduct = function (cat, v, gen) {
    if (v === 'K') return { id: cat + 'K', cat, v, gen: 0, name: { motor: 'Kit brushed motor + controller', enc: 'Kit low-profile encoder', ctrl: 'Kit control hub', gearbox: 'Kitbot gearbox' }[cat] || 'Kit part', price: D.KOP_PRICE[cat] || 0, perf: D.KOP_PERF[cat] || 0.05, kop: true };
    if (v === 'C') {
      const c = D.PART_CAT[cat];
      return { id: cat + 'C', cat, v, gen: 1, name: c.name, price: D.COTS_PRICE[cat], perf: 0.6 };
    }
    const p = ELEC_PRICE[cat][v] * (1 + 0.12 * (gen - 1));
    return { id: cat + v + gen, cat, v, gen, name: ELEC_NAMES[cat][v] + D.ROMAN[gen], price: Math.round(p / 5) * 5, perf: Math.min(1, ELEC_PERF[v] + 0.15 * (gen - 1)) };
  };
  D.COTS_PRICE = { gearbox: 120, camera: 260, pneu: 500, kElev: 480, kArm: 320, kShoot: 420, kTurret: 650, kIntake: 260, kIndex: 220, kClimb: 210 };
  D.ELEC_CATS = ['motor', 'enc', 'ctrl', 'swerve'];
  D.COTS_CATS = ['gearbox', 'camera', 'pneu', 'kElev', 'kArm', 'kShoot', 'kTurret', 'kIntake', 'kIndex', 'kClimb'];

  // Kit of Parts electronics can also be bought any time, even in season: very cheap and always in stock, but slow
  // (brushed motors, low-profile encoders). Mixing them with Apex or Lumen electronics costs a little integration time.
  D.KOP_PRICE = { motor: 45, enc: 18, ctrl: 220, gearbox: 60 };
  D.KOP_PERF = { motor: 0.08, enc: 0.15, ctrl: 0.2, gearbox: 0.3 };
  D.KOP_CATS = ['motor', 'enc', 'ctrl', 'gearbox'];
  D.KOP_MIX_HOURS = 1.05; // KOP electronics next to vendor electronics: 5% more hardware and software hours
  // Kit of parts: limited and basic, free at every Kickoff (rookies get a bigger kit in their first season)
  D.KOP = { motor: 4, enc: 2, gearbox: 2 }; // veterans: no control hub (like FRC, only rookies get the control system)
  D.KOP_ROOKIE = { motor: 8, enc: 4, gearbox: 4, ctrl: 1 };

  // How likely an item is in stock in a given week during the season (the offseason is almost always fine)
  D.STOCK = { elec: 0.42, cots: 0.62, elem: 0.35, off: 0.97, newRelease: -0.12, diff: { easy: 0.15, normal: 0, hard: -0.1 } };
  D.PART_PRICE_DIFF = { easy: 0.9, normal: 1, hard: 1.05 };

  // Wear: parts lose health in matches and practice. Health only nudges performance, but worn parts fail more often.
  D.PART_WEAR_MATCH = [0.004, 0.009];   // per match, each part on the competition robot
  D.PART_WEAR_PRACTICE = 0.0007;        // per driver-practice hour, each part on the robot that practices
  D.PART_MIN_HEALTH = 0.25;
  // Selling: parts above SELL_MIN health sell for RESALE × list price × health (kit parts can't be sold)
  D.SELL_MIN = 0.6;
  D.RESALE = 0.55;

  // Starting inventories by team level: [category, vendor, count, health]
  D.START_PARTS = {
    rookie: [],
    // established: last few seasons' parts at different wear levels (enough for a test chassis once the competition robot
    // takes the best ones), plus leftovers from earlier kits
    established: [['motor', 'B', 10, 0.75], ['motor', 'B', 4, 0.55], ['motor', 'B', 2, 0.4], ['enc', 'B', 3, 0.75], ['enc', 'B', 2, 0.5],
      ['ctrl', 'B', 1, 0.8], ['gearbox', 'C', 2, 0.8], ['gearbox', 'C', 2, 0.55], ['camera', 'C', 1, 0.85],
      ['ctrl', 'K', 1, 0.7], ['motor', 'K', 4, 0.6], ['gearbox', 'K', 2, 0.7]],
    powerhouse: [['motor', 'A', 20, 0.8], ['enc', 'A', 6, 0.8], ['ctrl', 'A', 2, 0.85], ['swerve', 'A', 4, 0.8], ['gearbox', 'C', 2, 0.8], ['camera', 'C', 2, 0.85], ['kShoot', 'C', 1, 0.85], ['kIntake', 'C', 1, 0.85],
      ['ctrl', 'K', 1, 0.7], ['motor', 'K', 4, 0.6]]
  };

  // ---------- Game elements: practice-field sets for one season's game ----------
  // KOP game pieces come free each season: without a Practice Field they are all a team needs. With one, sets give
  // drivers a real field to practice on, up to its size (Level 1 = a quarter field). Coverage is in fields
  // (0.25 = a quarter field); you can hold up to ELEM_MAX fields' worth.
  D.ELEM_SETS = [
    { id: 'q', name: 'Quarter-field set', size: 0.25, price: 900 },
    { id: 'h', name: 'Half-field set', size: 0.5, price: 1700 },
    { id: 'f', name: 'Full-field set', size: 1, price: 3200 }
  ];
  D.ELEM_MAX = 2;               // fields' worth of elements you can store
  D.ELEM_KOP_Q = 0.3;           // driver-practice quality with only the kit game pieces
  D.ELEM_WEAR = 0.0035;         // health lost per driver-practice hour, shared across the sets in use
  D.FIELD_SIZE = [0, 0.25, 0.5, 1];    // practice-field size by Practice Field level (0: the kit game pieces are enough)
})();
