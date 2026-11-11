'use strict';
/* FRC Manager — parts library: two electronics vendors, subsystem COTS, the kit of parts and game elements.
   Counts follow typical FRC robots: a swerve drive uses 4 modules, 8 brushless motors and 4 absolute encoders;
   most mechanisms use 1–3 motors; every robot needs one control/power hub. */
(function () {
  const D = G.Data = G.Data || {};

  D.VENDORS = {
    A: { id: 'A', name: 'Apex Motion', short: 'Apex', tag: 'Premium', color: '#ff9f43', desc: 'Top-performance electronics at premium prices.' },
    T: { id: 'T', name: 'Sterling Motion', short: 'Sterling', tag: 'Premium', color: '#c8b273', desc: 'The old premium catalogue: thirty years of brushed motors, and the parts most champions ran.' },
    B: { id: 'B', name: 'Lumen Robotics', short: 'Lumen', tag: 'Value', color: '#35c9d6', desc: 'Dependable, economical electronics.' },
    K: { id: 'K', name: 'Kit of Parts', short: 'KOP', tag: 'Basic', color: '#8d97a1', desc: 'Basic, low-performance parts: some free at every Kickoff, more for very little, always in stock.' },
    C: { id: 'C', name: 'COTS suppliers', short: 'COTS', tag: 'Subsystem', color: '#b39dff', desc: 'Subsystem parts and kits from many suppliers. Always compatible.' }
  };

  // Part categories. elec: sold by vendor A or B and part of the robot's control system (mixing vendors costs a bit).
  // max: inventory slots (enough for two full robots, with a few to spare).
  D.PART_CATS = [
    { id: 'motor', name: 'Motor + controller', short: 'Motors', icon: 'motor', elec: true, max: 44, desc: 'Drivetrains use 4–8, most mechanisms 1–3.' },
    { id: 'enc', name: 'Absolute encoder', short: 'Encoders', icon: 'sensor', elec: true, max: 18, desc: 'One per swerve module, plus arms, elevators, hoods and turrets.' },
    { id: 'ctrl', name: 'Control & power hub', short: 'Control hubs', icon: 'chip', elec: true, max: 3, desc: 'Power distribution, CAN network and IMU. One per robot.' },
    { id: 'wcd', name: 'West Coast drive set', short: 'Drive sets', icon: 'gear', vend: true, group: 'drive', max: 6, desc: 'Gearbox, wheels, belts and bearing blocks for one side of a West Coast drive. A drivetrain uses 2 (motors not included). The best a West Coast drive can run on.' },
    { id: 'swerve', name: 'Swerve module', short: 'Swerve modules', icon: 'swerve', elec: true, group: 'drive', max: 10, desc: 'Four per swerve drivetrain (motors not included).' },
    { id: 'kdrive', name: 'Kit drivetrain', short: 'Kit drivetrain sets', icon: 'gear', max: 6, desc: 'One side of the kit chassis: gearbox, wheels and frame rails. A kitbot tank drive uses 2, and nothing else can use them. Two come free at every Kickoff. The slowest way to drive.' },
    { id: 'gearbox', name: 'Drive gearbox', short: 'Drive gearboxes', icon: 'gear', max: 10, desc: 'A sturdy two-stage gearbox with its wheel shafts, for any drive but swerve. Mecanum uses 4. Two of them also drive a kit chassis (faster and stronger than the kit drivetrain) or a West Coast drive (slower and weaker than a vendor drive set).' },
    { id: 'camera', name: 'Vision camera + coprocessor', short: 'Cameras', icon: 'camera', max: 4, desc: 'Vision Level 1 needs one, Level 2 needs two.' },
    { id: 'pneu', name: 'Pneumatics kit', short: 'Pneumatics', icon: 'air', max: 2, desc: 'Compressor, tank, valves and cylinders. Speeds up intake, manipulator and end effector builds: a lot in the brushed-motor years, less every year after brushless motors arrive.' },
    { id: 'kElev', kit: 'elevator', name: 'Elevator stage kit', short: 'Elevator kits', icon: 'elevator', max: 6, desc: 'Bearing blocks, tubes and rigging for one elevator stage. Tall elevators use 2.' },
    { id: 'kArm', kit: 'arm', name: 'Arm & pivot kit', short: 'Arm kits', icon: 'arm', max: 6, desc: 'Pivot gearbox, bearings and arm tube for one joint.' },
    { id: 'kShoot', kit: 'shooter', name: 'Flywheel shooter kit', short: 'Shooter kits', icon: 'shooter', max: 6, desc: 'Flywheels, shafts and side plates. Wide dumpers use 2.' },
    { id: 'kTurret', kit: 'turret', name: 'Turret bearing kit', short: 'Turret kits', icon: 'turret', max: 4, desc: 'Large turret bearing, ring gear and mounts.' },
    { id: 'kIntake', kit: 'intake', name: 'Intake roller kit', short: 'Intake kits', icon: 'intake', max: 6, desc: 'Rollers, belts and a deploy pivot. Dual and full-width intakes use 2.' },
    { id: 'kIndex', kit: 'index', name: 'Indexer & hopper kit', short: 'Indexer kits', icon: 'parts', max: 4, desc: 'Belts, rollers and walls for storing game pieces.' },
    { id: 'kClimb', kit: 'climb', name: 'Climber kit', short: 'Climber kits', icon: 'climb', max: 10, desc: 'One telescoping stage with a winch and hooks. Higher climbs use 2 to 4.' },
    { id: 'kGrip', kit: 'grip', name: 'Gripper kit', short: 'Gripper kits', icon: 'arm', max: 4, desc: 'Compliant wheels, side plates and a small gearbox for a claw or a roller gripper. Helps end effector builds; the largest use 2.' },
    // Kit of Parts subsystem kits: cheap, basic, always in stock, and only good for the simplest concept of a subsystem
    { id: 'kopGrip', kit: 'kop', kop: true, name: 'KOP gripper', short: 'KOP grippers', icon: 'arm', max: 4, desc: 'Two jaw plates, a small cylinder and a bag of fasteners.', helps: 'the simplest end effector of a game' },
    { id: 'kopIntake', kit: 'kop', kop: true, name: 'KOP intake', short: 'KOP intakes', icon: 'intake', max: 4, desc: 'One roller, two side plates and a belt.', helps: 'the simplest intake of a game' },
    { id: 'kopShoot', kit: 'kop', kop: true, name: 'KOP shooter', short: 'KOP shooters', icon: 'shooter', max: 4, desc: 'One flywheel, a shaft and a fixed hood.', helps: 'the simplest shooter of a game' },
    { id: 'kopLift', kit: 'kop', kop: true, name: 'KOP lift', short: 'KOP lifts', icon: 'elevator', max: 4, desc: 'A short arm tube, a pivot and a gas spring.', helps: 'the simplest arm or lift of a game' },
    { id: 'kFrame', kit: 'frame', name: 'GridTube frame stock', short: 'GridTube bundles', icon: 'parts', max: 24, desc: 'Box tube and gussets drilled on one hole pattern, so everything lines up without a mill. Every mechanical build can use 1 to 3 bundles (drivetrain included), on top of any kit.' }
  ];
  D.PART_CAT = {}; D.PART_CATS.forEach(c => D.PART_CAT[c.id] = c);
  D.KIT_FOR_AREA = { elevator: 'kElev', arm: 'kArm', shooter: 'kShoot', turret: 'kTurret', intake: 'kIntake', index: 'kIndex', climb: 'kClimb' };
  // The lost year (2021): suppliers spent it designing bolt-together mechanisms. In calendar careers these are first sold
  // in August 2021 (month COTS_MONTH of the offseason before the 2022 season). Before that only elevator, shooter
  // and turret kits exist.
  D.COTS_FROM = { kArm: 2022, kIntake: 2022, kIndex: 2022, kClimb: 2022, kGrip: 2022, kFrame: 2022 };
  D.COTS_MONTH = 3;
  // GridTube frame stock: a build that gets all the bundles it can use takes FRAME_HOURS fewer hours and FRAME_COST less
  // material, on top of what the mechanism kits do. Bundles by size: 1 (simple), 2 (complexity 3 or 4), 3 (complexity 5).
  D.FRAME_HOURS = 0.1; D.FRAME_COST = 0.15;
  D.frameWant = c => (!c || c.id === 'none' || (!c.cost && !c.hours) ? 0 : c.cx >= 5 ? 3 : c.cx >= 3 ? 2 : 1);
  D.KIT_HOURS = 0.72;   // a full set of subsystem COTS kits cuts a build's hours by 28% and removes first-build penalties
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
    if (v === 'K') return { id: cat + 'K', cat, v, gen: 0, name: { motor: 'Kit brushed motor + controller', enc: 'Kit low-profile encoder', ctrl: 'Kit control hub', kdrive: 'Kit drivetrain', gearbox: 'Kitbot gearbox' }[cat] || (D.PART_CAT[cat] && D.PART_CAT[cat].kop ? D.PART_CAT[cat].name : 'Kit part'), price: D.KOP_PRICE[cat] || 0, perf: D.KOP_PERF[cat] || 0.05, kop: true };
    if (v === 'C') {
      const c = D.PART_CAT[cat];
      return { id: cat + 'C', cat, v, gen: 1, name: c.name, price: D.COTS_PRICE[cat], perf: 0.6 };
    }
    const p = ELEC_PRICE[cat][v] * (1 + 0.12 * (gen - 1));
    return { id: cat + v + gen, cat, v, gen, name: ELEC_NAMES[cat][v] + D.ROMAN[gen], price: Math.round(p / 5) * 5, perf: Math.min(1, ELEC_PERF[v] + 0.15 * (gen - 1)) };
  };
  // ---------- v3.0 careers: the era catalogue ----------
  // Product ladders by calendar year. Slot A is the premium vendor: Sterling Motion (brand T) through the 2019 season,
  // Apex Motion from 2020. Apex kept Sterling's bolt pattern and connectors, so the two never count as mixed. Slot B is
  // Lumen. y: the season a product is launched for (the launch event is in the autumn before). fix: a story date that
  // never moves; the others land up to a year early or late in each career. Performance and prices from 2022 on match
  // the v2.5 catalogue (prices in 2026 dollars; the price index does the rest). launchPrice: asked through the launch season.
  const T = 'T', BL = 'brushless', BR = 'brushed';
  D.LADDER = {
    motor: {
      A: [{ y: 2016, brand: T, kind: BR, name: 'Sterling Pro', perf: 0.26, price: 230, fix: 1 }, { y: 2017, brand: T, kind: BR, name: 'Sterling Pro II', perf: 0.32, price: 240 },
        { y: 2020, brand: 'A', kind: BL, name: 'Apex Torque', perf: 0.6, price: 215, fix: 1, quiet: 1 }, { y: 2022, brand: 'A', kind: BL, name: 'Apex Torque II', perf: 0.72, price: 230 },
        { y: 2024, brand: 'A', kind: BL, name: 'Apex Torque III', perf: 0.87, price: 258 }, { y: 2026, brand: 'A', kind: BL, name: 'Apex Torque IV', perf: 1, price: 285 }],
      B: [{ y: 2016, kind: BR, name: 'Lumen Volt', perf: 0.16, price: 150, fix: 1 }, { y: 2018, kind: BR, name: 'Lumen Volt II', perf: 0.22, price: 158 },
        { y: 2019, kind: BL, name: 'Lumen Ion', perf: 0.42, price: 150, launchPrice: 215, fix: 1, story: 'brushless' }, { y: 2022, kind: BL, name: 'Lumen Ion II', perf: 0.5, price: 150 },
        { y: 2024, kind: BL, name: 'Lumen Ion III', perf: 0.65, price: 168 }, { y: 2026, kind: BL, name: 'Lumen Ion IV', perf: 0.8, price: 186 }]
    },
    enc: {
      A: [{ y: 2016, brand: T, name: 'Sterling TrueTrack', perf: 0.4, price: 65, fix: 1 }, { y: 2018, brand: T, name: 'Sterling TrueTrack II', perf: 0.5, price: 68 },
        { y: 2020, brand: 'A', name: 'Apex TrueAngle', perf: 0.62, price: 62, fix: 1, quiet: 1 }, { y: 2022, brand: 'A', name: 'Apex TrueAngle II', perf: 0.72, price: 65 },
        { y: 2024, brand: 'A', name: 'Apex TrueAngle III', perf: 0.87, price: 73 }, { y: 2026, brand: 'A', name: 'Apex TrueAngle IV', perf: 1, price: 81 }],
      B: [{ y: 2016, name: 'Lumen SpinSense', perf: 0.25, price: 40, fix: 1 }, { y: 2019, name: 'Lumen SpinSense II', perf: 0.38, price: 40 }, { y: 2022, name: 'Lumen SpinSense III', perf: 0.5, price: 40 },
        { y: 2024, name: 'Lumen SpinSense IV', perf: 0.65, price: 45 }, { y: 2026, name: 'Lumen SpinSense V', perf: 0.8, price: 50 }]
    },
    ctrl: {
      A: [{ y: 2016, brand: T, name: 'Sterling Command Hub', perf: 0.45, price: 700, fix: 1 }, { y: 2018, brand: T, name: 'Sterling Command Hub II', perf: 0.55, price: 720 },
        { y: 2020, brand: 'A', name: 'Apex Core Hub', perf: 0.62, price: 680, fix: 1, quiet: 1 }, { y: 2022, brand: 'A', name: 'Apex Core Hub II', perf: 0.72, price: 700 },
        { y: 2024, brand: 'A', name: 'Apex Core Hub III', perf: 0.87, price: 785 }, { y: 2026, brand: 'A', name: 'Apex Core Hub IV', perf: 1, price: 870 }],
      B: [{ y: 2016, name: 'Lumen PowerGrid', perf: 0.28, price: 440, fix: 1 }, { y: 2019, name: 'Lumen PowerGrid II', perf: 0.4, price: 440 }, { y: 2022, name: 'Lumen PowerGrid III', perf: 0.5, price: 440 },
        { y: 2024, name: 'Lumen PowerGrid IV', perf: 0.65, price: 495 }, { y: 2026, name: 'Lumen PowerGrid V', perf: 0.8, price: 545 }]
    },
    // West Coast drive sets: what the strong teams drove on before modules came in a box. Apex never made one, and
    // Lumen stops making them once it sells a swerve module of its own (D.LINE_ENDS).
    wcd: {
      A: [{ y: 2016, brand: T, name: 'Sterling Ridgeline drive set', perf: 0.55, price: 310, fix: 1 }, { y: 2018, brand: T, name: 'Sterling Ridgeline II drive set', perf: 0.7, price: 325 }],
      B: [{ y: 2016, name: 'Lumen Trailhead drive set', perf: 0.36, price: 205, fix: 1 }, { y: 2018, name: 'Lumen Trailhead II drive set', perf: 0.5, price: 210 }, { y: 2020, name: 'Lumen Trailhead III drive set', perf: 0.64, price: 215, fix: 1 }]
    },
    swerve: {
      A: [{ y: 2020, brand: 'A', name: 'Apex Vector module', perf: 0.64, price: 460, fix: 1, quiet: 1 }, { y: 2023, brand: 'A', name: 'Apex Vector II module', perf: 0.78, price: 490 }, { y: 2025, brand: 'A', name: 'Apex Vector III module', perf: 0.92, price: 550 }],
      B: [{ y: 2022, name: 'Lumen Pivot module', perf: 0.5, price: 330, fix: 1, story: 'pivot' }, { y: 2024, name: 'Lumen Pivot II module', perf: 0.65, price: 370 }, { y: 2026, name: 'Lumen Pivot III module', perf: 0.8, price: 410 }]
    }
  };
  Object.keys(D.LADDER).forEach(c => ['A', 'B'].forEach(v => D.LADDER[c][v].forEach(L => { if (!L.brand) L.brand = v; })));
  D.COTS_PRICE = { gearbox: 120, camera: 260, pneu: 500, kElev: 480, kArm: 320, kShoot: 420, kTurret: 650, kIntake: 260, kIndex: 220, kClimb: 210, kGrip: 190, kFrame: 70 };
  D.ELEC_CATS = ['motor', 'enc', 'ctrl', 'swerve'];
  D.VEND_CATS = ['motor', 'enc', 'ctrl', 'wcd', 'swerve']; // everything the two vendors sell (calendar careers): electronics and drivetrain parts
  D.DRIVE_CATS = ['wcd', 'swerve'];
  // What a drive runs on (calendar careers), from the lowest performance to the best:
  //  - the kit drivetrain (Kit of Parts): the kit chassis only;
  //  - COTS Drive gearboxes: a kit chassis (2, DRIVE_UP on its speed and push ceilings), mecanum (4, nothing else fits)
  //    or a West Coast drive (2, counted as a drive set of quality WCD_GEARBOX_Q);
  //  - vendor drive sets: a West Coast drive (2; their quality is the product's performance, 0.36 to 0.7).
  // West Coast ceilings: speed +10q − 4, push +6q − 2. The better part is used whenever the shelf has it (D.DRIVE_ALT:
  // what may stand in for what), the competition robot first.
  D.DRIVE_ALT = { kdrive: 'gearbox', wcd: 'gearbox' };
  D.DRIVE_UP = { speed: 4, push: 3 };
  D.WCD_GEARBOX_Q = 0.15;
  // A product line that its own vendor replaces. { category: { vendor slot: the category whose first launch ends it } }.
  // What is in stock stays on sale through the season the replacement was launched for (one more year), then it is gone.
  D.LINE_ENDS = { wcd: { B: 'swerve' } };
  D.COTS_CATS = ['gearbox', 'camera', 'pneu', 'kElev', 'kArm', 'kShoot', 'kTurret', 'kIntake', 'kIndex', 'kClimb', 'kGrip', 'kFrame'];
  // ---------- The second-hand market ----------
  // What a used part fetches follows the news: a technology that has been overtaken is worth less from the day its
  // replacement goes on sale. (A closed vendor's parts: Era.STERLING_RESALE.)
  D.USED = {
    brushed: 0.5,            // brushed motors, once a brushless motor is on sale
    behind: [1, 0.85, 0.65], // a vendor product that is the current version, one behind, two or more behind
    wcd: [1, 0.8, 0.6],      // West Coast drive sets: nobody sells swerve modules, one vendor does, both do
    pneuRef: 0.25, pneuMin: 0.3 // a pneumatics kit: in step with the build hours it still saves (25% at its best)
  };

  // Kit of Parts electronics can also be bought any time, even in season: very cheap and always in stock, but slow
  // (brushed motors, low-profile encoders). Mixing them with Apex or Lumen electronics costs a little integration time.
  D.KOP_PRICE = { motor: 45, enc: 18, ctrl: 220, kdrive: 60, gearbox: 60, kopGrip: 45, kopIntake: 60, kopShoot: 90, kopLift: 80 };
  D.KOP_PERF = { motor: 0.08, enc: 0.15, ctrl: 0.2, kdrive: 0.3, gearbox: 0.3 };
  D.KOP_KITS = ['kopGrip', 'kopIntake', 'kopShoot', 'kopLift'];
  D.KOP_CATS = ['motor', 'enc', 'ctrl', 'kdrive'].concat(D.KOP_KITS);
  // A Kit of Parts subsystem kit helps the simplest concept of a subsystem only (complexity 1, or the first concept on
  // the list when that is complexity 2): KOP_KIT_HOURS fewer hours and KOP_KIT_COST less material. A build that uses a
  // COTS mechanism kit does not take one as well.
  D.KOP_KIT_HOURS = 0.2; D.KOP_KIT_COST = 0.2;
  D.KOP_MIX_HOURS = 1.05; // KOP electronics next to vendor electronics: 5% more hardware and software hours
  // Kit of parts: limited and basic, free at every Kickoff (rookies get a bigger kit in their first season)
  D.KOP = { motor: 4, enc: 2, kdrive: 2 }; // veterans: no control hub (like FRC, only rookies get the control system)
  D.KOP_ROOKIE = { motor: 8, enc: 4, kdrive: 4, ctrl: 1 };

  // How likely an item is in stock in a given week during the season (the offseason is almost always fine)
  D.STOCK = { elec: 0.42, cots: 0.62, elem: 0.35, off: 0.97, newRelease: -0.12, diff: { easy: 0.15, normal: 0, hard: -0.1 } };
  D.PART_PRICE_DIFF = { easy: 0.9, normal: 1, hard: 1.05 };

  // ---------- Vendor loyalty ----------
  // A vendor notices the teams that run and buy its electronics. A season on the competition robot is worth 100 loyalty
  // points with that catalogue, and that year's orders up to 15 more (the premium catalogue's points carry over from
  // Sterling to Apex). Each level reached brings a loyalty
  // sponsorship, the team's choice of three: free parts, a voucher, or a sale until Kickoff. A team that runs one vendor
  // only reaches three levels in a ten-season career.
  D.LOYALTY = {
    levels: [280, 580, 880, 1180],                            // a little under three seasons each, so one mixed season does not cost a level
    full: 0.9,                                                // a robot with 90% of its electronics from one vendor counts as all of it (a kit hub does not spoil a season)
    robot: 100, buy: 15, buyFull: 1500,                       // a season's points: the competition robot's electronics, plus a bonus for that year's orders (in full at $1,500)
    names: ['Customer', 'Loyal Team', 'Preferred Team', 'Partner Team', 'Flagship Team'],
    start: { rookie: 0, established: 100, powerhouse: 150 },  // standing with the vendor whose parts are on the starting shelf
    month: 4,                                                 // the letter arrives in September
    pack: [null, { motor: 4, enc: 2 }, { motor: 6, enc: 2 }, { motor: 8, enc: 4, ctrl: 1 }, { motor: 8, enc: 4, ctrl: 1, swerve: 4 }],
    voucher: [0, 1000, 1500, 2500, 3500],                     // store credit, valid through the coming season
    sale: [0, 0.25, 0.3, 0.4, 0.45],                          // off everything from that vendor until Kickoff
    stock: 0.1                                                // a loyal team's orders ship first: in-season stock chance per level
  };

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
      ['ctrl', 'B', 1, 0.8], ['gearbox', 'C', 2, 0.8], ['gearbox', 'C', 2, 0.55], ['wcd', 'B', 2, 0.75], ['camera', 'C', 1, 0.85],
      ['ctrl', 'K', 1, 0.7], ['motor', 'K', 4, 0.6], ['kdrive', 'K', 2, 0.7]],
    powerhouse: [['motor', 'A', 20, 0.8], ['enc', 'A', 6, 0.8], ['ctrl', 'A', 2, 0.85], ['swerve', 'A', 4, 0.8], ['wcd', 'A', 2, 0.8], ['gearbox', 'C', 2, 0.8], ['camera', 'C', 2, 0.85], ['kShoot', 'C', 1, 0.85], ['kIntake', 'C', 1, 0.85],
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
