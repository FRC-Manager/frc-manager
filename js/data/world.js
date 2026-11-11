'use strict';
/* FRC Manager — world data: names, regions, regionals, sponsors, mentors, parts, equipment, research, scenarios */
(function () {
  const D = G.Data = G.Data || {};

  // ---------- Names ----------
  D.FIRST = ['Ava', 'Liam', 'Maya', 'Noah', 'Priya', 'Ethan', 'Sofia', 'Lucas', 'Aiden', 'Chloe', 'Mateo', 'Zara', 'Kai', 'Elena', 'Omar', 'Hana', 'Diego', 'Grace',
    'Arjun', 'Ivy', 'Leo', 'Nora', 'Ravi', 'Mia', 'Jonah', 'Amara', 'Felix', 'Lena', 'Theo', 'Yuki', 'Samir', 'Ruby', 'Owen', 'Aisha', 'Caleb', 'Mei', 'Isaac', 'Layla',
    'Ezra', 'Freya', 'Hugo', 'Imani', 'Jasper', 'Keira', 'Milo', 'Nadia', 'Oscar', 'Paloma', 'Quinn', 'Rosa', 'Silas', 'Tara', 'Uma', 'Victor', 'Wren', 'Xavier', 'Yara', 'Zane',
    'Andre', 'Bea', 'Cyrus', 'Dalia', 'Emil', 'Fatima', 'Gabe', 'Hiro', 'Ines', 'Jules', 'Kofi', 'Lucia', 'Marco', 'Nina', 'Ola', 'Pedro', 'Rania', 'Sven', 'Tomas', 'Vera'];
  D.LAST = ['Chen', 'Patel', 'Garcia', 'Okafor', 'Nguyen', 'Kowalski', 'Haddad', 'Silva', 'Novak', 'Tanaka', 'Rivera', 'Johansson', 'Mensah', 'Kim', 'Brennan', 'Rossi',
    'Ahmed', 'Dubois', 'Schmidt', 'Moreno', 'Ivanova', 'Park', 'Lindqvist', 'Mwangi', 'Fischer', 'Costa', 'Yilmaz', 'Walsh', 'Reyes', 'Sato', 'Bauer', 'Osei',
    'Lopez', 'Murphy', 'Singh', 'Larsen', 'Petrov', 'Alvarez', 'Hughes', 'Nakamura', 'Okonkwo', 'Varga', 'Castillo', 'Morgan', 'Dalton', 'Ferreira', 'Kaur', 'Bianchi'];
  D.TEAM_A = ['Iron', 'Steel', 'Thunder', 'Cyber', 'Quantum', 'Atomic', 'Solar', 'Rocket', 'Phoenix', 'Titan', 'Volt', 'Circuit', 'Gear', 'Nova', 'Polar', 'Granite',
    'Crimson', 'Cobalt', 'Golden', 'Silver', 'Electric', 'Neon', 'Kinetic', 'Vector', 'Binary', 'Fusion', 'Turbo', 'Torque', 'Pixel', 'Orbit', 'Static', 'Ember', 'Frost', 'Storm'];
  D.TEAM_B = ['Hawks', 'Wolves', 'Panthers', 'Knights', 'Raptors', 'Owls', 'Foxes', 'Bears', 'Falcons', 'Sharks', 'Dragons', 'Vipers', 'Bots', 'Mechs', 'Gears', 'Sparks',
    'Engineers', 'Builders', 'Pioneers', 'Rangers', 'Pirates', 'Bulldogs', 'Stingers', 'Ravens', 'Comets', 'Lynx', 'Otters', 'Tigers', 'Hornets', 'Mustangs', 'Coyotes', 'Wrenches'];
  D.SCHOOLS = ['Northview', 'Lakeside', 'Westbrook', 'Riverside', 'Hillcrest', 'Oakridge', 'Pinewood', 'Eastfield', 'Summit', 'Brookhaven', 'Clearwater', 'Fairmont', 'Maplewood', 'Ridgeline'];

  D.personName = rng => rng.pick(D.FIRST) + ' ' + rng.pick(D.LAST);
  D.teamName = rng => rng.pick(D.TEAM_A) + ' ' + rng.pick(D.TEAM_B);

  // ---------- Regions & travel ----------
  D.REGIONS = ['West', 'Southwest', 'Midwest', 'Northeast', 'Southeast', 'Canada'];
  D.ADJ = {
    West: ['Southwest'], Southwest: ['West', 'Midwest', 'Southeast'], Midwest: ['Southwest', 'Northeast', 'Southeast', 'Canada'],
    Northeast: ['Midwest', 'Southeast', 'Canada'], Southeast: ['Southwest', 'Midwest', 'Northeast'], Canada: ['Midwest', 'Northeast']
  };
  D.TRAVEL = { local: { name: 'Local', cost: 800 }, drive: { name: 'Drive', cost: 3500 }, fly: { name: 'Fly', cost: 9000 } };
  D.travelTier = (home, region, localFlag) => home === region ? (localFlag ? 'local' : 'drive') : (D.ADJ[home].includes(region) ? 'drive' : 'fly');

  D.REGIONAL_NAMES = {
    West: ['Cascade Peaks', 'Redwood Valley', 'Pacific Harbor', 'Sierra Foothills', 'Golden Coast', 'Silver Lake'],
    Southwest: ['Mesa Sun', 'Red Rock', 'Desert Bloom', 'Lone Prairie', 'Canyon Ridge', 'Copper Basin'],
    Midwest: ['Great Lakes', 'Prairie Wind', 'River Bend', 'Heartland', 'Iron Range', 'Twin Rivers'],
    Northeast: ['Harbor Lights', 'Maple Ridge', 'Liberty Bay', 'Pine Hollow', 'Atlantic Shores', 'Granite Falls'],
    Southeast: ['Magnolia', 'Bayou Country', 'Peach Hills', 'Gulf Breeze', 'Blue Ridge', 'Palmetto Coast'],
    Canada: ['Northern Lights', 'Maple Leaf', 'Lakehead', 'Prairie North', 'Laurentian', 'Rocky Summit']
  };

  // Build a season's regional catalogue: 5 events per week x 6 weeks
  D.makeRegionals = function (year, rng) {
    const all = [];
    D.REGIONS.forEach(r => D.REGIONAL_NAMES[r].forEach(n => all.push({ name: n + ' Regional', region: r })));
    rng.shuffle(all);
    const list = [];
    for (let w = 1; w <= 6; w++) {
      for (let k = 0; k < 5; k++) {
        const b = all[(w - 1) * 5 + k];
        list.push({
          id: 'r' + year + '_' + w + '_' + k, name: b.name, region: b.region, week: w,
          size: rng.int(9, 16) * 4, str: rng.int(1, 5), local: rng.chance(0.5), full: false, year
        });
      }
    }
    return list;
  };

  D.OFFSEASON_EVENTS = [
    { id: 'os_jun', name: 'Summer Heat Invitational', month: 'Jun', size: 24, fee: 800 },
    { id: 'os_jul', name: 'River City Rumble', month: 'Jul', size: 28, fee: 1000 },
    { id: 'os_sep', name: 'Harvest Brawl', month: 'Sep', size: 32, fee: 1200 },
    { id: 'os_oct', name: 'Fall Classic', month: 'Oct', size: 30, fee: 1000 },
    { id: 'os_nov', name: 'Robot Rumble Showcase', month: 'Nov', size: 24, fee: 700 }
  ];
  D.MONTHS = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // ---------- Fees ----------
  D.FEES = { firstRegional: 6000, addRegional: 4000, late: 1000, champs: 5000, scrimmage: 500, shopOps: 2000 };
  D.DEBT_LIMIT = 50000; // in-season debt the school board will tolerate; settled at the season review (support and reputation penalty)
  D.STEM_FUND = { below: 1000, max: 6000, uses: 2, rep: 4 }; // emergency fund when the balance is under $1,000: up to $6k, twice a program year, −4 reputation each

  // ---------- Fatigue (in season) ----------
  D.FATIGUE_BASE = 30;      // the normal level a team settles at
  D.FATIGUE_IDLE = 0.10;    // leaving about 10% of the week's hours idle holds fatigue steady
  D.FATIGUE_SLOPE = 40;     // fatigue change per week per unit of idle share below/above that
  D.FATIGUE_OVERTIME = 10;  // an overtime week
  D.FATIGUE_EVENT = 9;      // a competition week
  D.INCIDENT_FREE = 35;     // at or below this fatigue, at most one incident per event

  // ---------- Team trailer ----------
  D.TRAILER_LONG = 0.85;    // long drives instead of flying: 15% cheaper than flights and no air-freight damage
  D.TRAILER_OUTREACH = 1.2; // robot shows on the road: +20% outreach from robot activities
  D.STUDENT_CAP = 100;      // a school club only gets so big: more applicants go on a waiting list
  // Reputation is earned slowly, and the last points are the hardest: a gain counts REP_GAIN x (1 - reputation / REP_SOFT). Losses count in full.
  D.REP_GAIN = 0.7; D.REP_SOFT = 125;
  D.TECH_ROLE = { repair: 250, check: 250 }; // Technician: Mechanism / 250 faster pit repairs, Composure / 250 fewer pre-match mistakes

  // Parts, vendors and game elements live in js/data/parts.js
  D.BATTERY_COST = 150; D.SPARES_COST = 120; // per spare unit
  D.SPARES_EVENT_MULT = 2;    // spare parts bought at an event cost double
  D.SPARE_COND_PER_UNIT = 30; // condition points one spare part restores

  // ---------- Workshop facilities ----------
  // Each facility has levels (buy = level 1, then upgrades) and a condition that wears down over time.
  // Effects scale with level and with efficiency (40% at 0 condition → 100% at full condition).
  // fx values are per level. wear = condition lost per in-season week / offseason month / event attended.
  D.EQUIP = [
    { id: 'printer', name: '3D Printing', upkeep: 250, wear: { season: 2.5, off: 3, event: 0 },
      levels: [{ name: 'Desktop 3D printer', cost: 1000 }, { name: 'Print farm', cost: 4500 }, { name: 'Industrial printer', cost: 10000 }],
      fx: { hours: [0.08, 0.15, 0.2], slot: [0, 1, 1] }, desc: 'Faster prototypes and custom parts: fewer hours on hardware projects.' },
    { id: 'cnc', name: 'CNC Machining', upkeep: 700, wear: { season: 2.5, off: 3, event: 0 },
      levels: [{ name: 'CNC router', cost: 11000 }, { name: 'CNC router + vertical mill', cost: 20000 }],
      fx: { hours: [0.15, 0.22], gain: [0.1, 0.16], rel: [5, 8], stat: [2, 3], slot: [1, 1] }, desc: 'Precise parts: fewer hardware hours, stronger upgrades, more reliable new builds.' },
    { id: 'lathe', name: 'Machine Shop', upkeep: 450, wear: { season: 2, off: 2, event: 0 },
      levels: [{ name: 'Lathe & mill', cost: 7500 }, { name: 'CNC lathe', cost: 15000 }],
      fx: { spare: [0.3, 0.45], rel: [3, 5], slot: [0, 1] }, desc: 'Make your own spare parts (cheaper spares) and more reliable new builds.' },
    { id: 'laptops', name: 'Programming Station', upkeep: 250, wear: { season: 1.5, off: 2, event: 0 },
      levels: [{ name: 'Laptops + sim software', cost: 2000 }, { name: 'Dev workstations', cost: 6000 }, { name: 'Hardware-in-the-loop bench', cost: 11000 }],
      fx: { soft: [0.2, 0.3, 0.38], slot: [0, 1, 1] }, desc: 'Fewer hours on software, auto and vision projects.' },
    { id: 'charger', name: 'Battery Station', upkeep: 100, wear: { season: 0.5, off: 0.5, event: 4 },
      levels: [{ name: 'Charger cart', cost: 500 }, { name: 'Smart charging station', cost: 1800 }],
      fx: { charge: [0.15, 0.3] }, desc: 'Batteries recharge faster between matches.' },
    { id: 'pitcart', name: 'Pit Setup', upkeep: 100, wear: { season: 0, off: 0.5, event: 6 },
      levels: [{ name: 'Pit cart & tool kit', cost: 1000 }, { name: 'Full pit setup', cost: 3500 }],
      fx: { repair: [0.25, 0.45] }, desc: 'Faster pit repairs between matches.' },
    { id: 'trailer', name: 'Team Trailer', upkeep: 1500, wear: { season: 0, off: 0.5, event: 5 },
      levels: [{ name: 'Team trailer', cost: 18000 }],
      fx: { travel: [0.3] }, desc: 'Cheaper travel to Local and Drive events.' },
    { id: 'pfield', name: 'Practice Field', upkeep: 300, wear: { season: 2, off: 1.5, event: 0 },
      levels: [{ name: 'Basic practice area', cost: 2500 }, { name: 'Half field', cost: 6500 }, { name: 'Full field', cost: 12000 }],
      fx: { tune: [0.08, 0.14, 0.2], test: [8, 12, 16] }, desc: 'Weekly testing hours on a real field, for development testing of any project and for driver practice (a test chassis or second robot gives testing hours too, and adds to these). Driver practice needs this season\'s game elements for full value.' },
    { id: 'ebench', name: 'Electronics Workbench', upkeep: 150, wear: { season: 1.5, off: 1.5, event: 0 },
      levels: [{ name: 'Soldering bench', cost: 900 }, { name: 'Electronics lab', cost: 3500 }, { name: 'PCB fabrication', cost: 9000 }],
      fx: { elec: [0.06, 0.12, 0.18], partWear: [0.1, 0.2, 0.3] }, desc: 'Clean wiring, proper crimps and, at the top level, your own circuit boards: fewer brownouts and comms dropouts in matches, and motors and electronics wear more slowly.' },
    { id: 'weld', name: 'Welding Station', upkeep: 300, wear: { season: 2, off: 2, event: 0 },
      levels: [{ name: 'MIG welder and table', cost: 3000 }, { name: 'TIG welding bay', cost: 8500 }],
      fx: { weld: [0.25, 0.4], weldRel: [2, 4] }, desc: 'Welded frames, gussets and repairs: hardening and lightweighting projects take fewer hours and do more, and new builds come out more reliable.' },
    { id: 'meeting', name: 'Team Meeting Room', upkeep: 100, wear: { season: 1, off: 1, event: 0 },
      levels: [{ name: 'Meeting corner', cost: 600 }, { name: 'Team classroom', cost: 2500 }, { name: 'Presentation room', cost: 6000 }],
      fx: { outreach: [0.1, 0.18, 0.25], pitch: [6, 10, 14] }, desc: 'A place to plan, rehearse and host visitors: outreach activities count for more, and your Impact Award presenters practice here.' },
    { id: 'ftc', name: 'FTC Team Space', upkeep: 200, wear: { season: 1.5, off: 1.5, event: 0 },
      levels: [{ name: 'One FTC field', cost: 2500 }, { name: 'Two FTC fields', cost: 5000 }, { name: 'FTC lab with three fields', cost: 8000 }],
      fx: { ftc: [1, 2, 3] }, desc: 'Run your own FTC teams in the building. Each one takes a feeder program slot, costs far less than an outside program and sends you much stronger recruits.' }
  ];
  // ---------- Workshop space ----------
  // Floor space per facility level in square feet: rough real-world footprints including working room. The trailer parks outside.
  D.EQUIP_SIZE = { printer: [40, 100, 180], cnc: [160, 280], lathe: [150, 240], laptops: [80, 140, 200], charger: [20, 40], pitcart: [40, 80], trailer: [0],
    pfield: [600, 1200, 2200], ebench: [50, 100, 170], weld: [120, 220], meeting: [250, 450, 700], ftc: [300, 500, 720] };
  // The biggest room holds every facility at its top level
  D.SPACE_MAX = Math.ceil(D.EQUIP.reduce((s, e) => s + (D.EQUIP_SIZE[e.id] || [0])[(D.EQUIP_SIZE[e.id] || [0]).length - 1], 0) / 100) * 100;
  // The school gives the team more room as Program Support rises. Checked once a year at the season review; room is never taken back.
  D.SPACE_TIERS = [
    { pct: 0.5, sup: 0, title: 'Robotics classroom', name: 'the robotics classroom' },
    { pct: 0.75, sup: 80, title: 'Technology wing', name: 'the technology wing' },
    { pct: 1, sup: 90, title: 'Robotics center', name: 'your own robotics center' }];
  D.SPACE_START = { rookie: 0, established: 1, powerhouse: 1 }; // a rookie starts in the classroom, an existing program in the technology wing
  // School board gifts at the season review, when Program Support went up: a free full renovation, and after a strong year one upgrade of your choice
  D.BOARD = { reno: 6, grant: 12, grantSup: 60, cap: 12000 };
  // Your own FTC teams (FTC Team Space): cheap to run, much stronger recruits
  D.FTC_OWN = { cost: 300, power: 1.8, impact: 1.3 };
  // A satisfied sponsor donates equipment (one facility level) if the workshop has the room for it. Each turn every sponsor has
  // chance x (satisfaction - sat) / (100 - sat); at most one donation per season and one per offseason. Tuned by simulation so
  // that a team with every sponsor slot filled that never skips a sponsor activity averages about one donation a year
  // (measured over 60 automated careers: 1.0 a year overall, about 0.45 in the first year while the partnerships are new,
  // 1.0 to 1.4 from the third year; lower for teams whose sponsors expect wins they do not get).
  D.DONATION = { sat: 60, chance: 0.033, cap: { title: 20000, partner: 9000, grant: 9000 },
    types: { tech: ['laptops', 'ebench', 'printer'], eng: ['cnc', 'printer', 'ebench'], mfg: ['cnc', 'lathe', 'weld'], soft: ['laptops', 'ebench'], uni: ['meeting', 'pfield', 'laptops'], local: ['pitcart', 'charger', 'meeting'], found: ['ftc', 'meeting'] },
    intro: ['A truck backed up to the shop door this morning. Nobody had ordered anything.', 'The email subject was "Clearing out a lab. Interested?" It took the team four seconds to answer.', 'Their engineers visited last month, looked around the shop and went very quiet. Now we know why.', 'It arrived on a pallet with a bow on it. An actual bow.'],
    talk: [['We upgraded ours and could not stand the thought of it sitting in a warehouse.', '{s}'], ['Consider it an investment. We hire from teams like yours.', 'a manager at {s}'], ['Do we need to write a thank-you card? We are writing forty.', 'your team captain'],
      ['Somebody measure the door. Twice.', 'your lead mentor'], ['I have already put the logo on it. Larger than last year.', 'your business lead'], ['It still has the plastic film on the screen. Nobody is allowed to peel it without a ceremony.', 'a student']] };
  D.BATT_LIMIT = [10, 10, 20]; // max batteries by Battery Station level (0, 1, 2)
  D.PROJ_CAP = 80;             // hours one project can absorb per week (×4 per offseason month, ±25% by priority)
  // Testing hours (practice field time, like a wind tunnel): split between development testing and driver practice
  D.TEST_BOT_HOURS = 6;     // a second runnable robot adds testing hours per week
  // Test chassis: a simple drivetrain on the second robot, built early in the season so programmers and drivers can start
  // before the competition robot drives. Without a Practice Field it gives "parking-lot" testing hours: code and drivetrain
  // projects only, plus driver practice (no real field: lower quality). With a field it counts as half a second robot.
  D.CHASSIS_CONCEPTS = ['kit', 'mec', 'wcd'];
  D.CHASSIS_HOURS_MULT = 0.4; // build hours vs a full design build of that drivetrain (no design work)
  D.CHASSIS_TEST_HOURS = 6;   // testing hours a week from a test chassis without a Practice Field
  D.CHASSIS_SHARE = 0.5;      // with a Practice Field, any runnable second robot counts as at least half a copy
  D.CHASSIS_ELEM = 0.6;       // driver-practice quality in the shop or parking lot (no field)
  D.CHASSIS_TEST_COST = 0.5;  // chassis testing costs half as much per hour as field testing
  D.BOT2_PRACTICE = 1.25;   // driver practice on the second robot is 25% more effective (no waiting while the competition robot is worked on)
  // Driver familiarity (0–1) with each subsystem the drive team has driven. A new mechanism starts at NEW; a new
  // version of the same one costs VER per step; a different concept costs 0.2–0.65 (more for very different ones).
  // Weekly shop driving, driver practice, event practice and matches win it back. In matches each subsystem's
  // stats are multiplied by 1 − EFFECT × (1 − familiarity).
  D.FAM = { NEW: 0.35, VER: 0.04, WEEK: 0.18, OFF: 0.25, PRACTICE: 12, MATCH: 0.06, BLOCK: 0.12, EFFECT: 0.15 };
  D.TEST_COST = 40;         // $ per development-testing hour (prototype parts and materials)
  D.TEST_PER_PROJ = 5;      // test hours one project can absorb per week (×4 per offseason month)
  D.TEST_GAIN = 0.025;      // each test hour on a project adds 2.5% to that project's progress this week
  D.TEST_SHARE = 0.06;      // a project can absorb test hours up to 6% of the build hours it gets that turn
  D.TEST_Q = 0.05;          // test hours ≈ 5% of a project's hours fully validate it (best upgrade quality)
  D.DRILL_PER = 6;          // driver-practice hours per point of practice (confidence); capped at D.DRILL_CAP
  D.DRILL_CAP = 10;
  D.DRILL_SPARES = 0.05;    // spare parts used per driver-practice hour
  D.DRILL_WEAR = 0.8;       // robot condition lost per driver-practice hour when there are no spares
  D.DRILL_BATT = 0.004;     // battery health used per driver-practice hour, shared across the fleet
  D.NO_SPARE_COND = 75;     // without spare parts, home repairs can only patch a subsystem up to this condition
  D.FUND_FATIGUE = 0.8;         // each repeat of the same activity within a month pays ×0.8 (grants: chance ×0.8); resets every month
  D.ACT_LIMIT = 3;             // team activities (outreach + fundraising) per week; each type once per week; offseason month ×4
  D.RENO_RATE = 0.35;  // renovation cost = level cost × RENO_RATE × (missing condition / 100) → ~17% of the price at 50% condition
  D.DEV_CATS = { fab: 'Fabrication', soft: 'Software', research: 'Research' };

  // ---------- Research (pre-season development) ----------
  D.RESEARCH = [
    { id: 'rs_swerve', name: 'Swerve Prototype', area: 'swerve', cost: 2500, hours: 300, xp: 220 },
    { id: 'rs_turret', name: 'Turret Prototype', area: 'turret', cost: 1800, hours: 260, xp: 200 },
    { id: 'rs_shooter', name: 'Shooter R&D', area: 'shooter', cost: 1200, hours: 200, xp: 170 },
    { id: 'rs_elev', name: 'Elevator Prototype', area: 'elevator', cost: 1500, hours: 240, xp: 190 },
    { id: 'rs_arm', name: 'Arm & Wrist R&D', area: 'arm', cost: 1200, hours: 200, xp: 170 },
    { id: 'rs_intake', name: 'Ground Intake R&D', area: 'intake', cost: 900, hours: 180, xp: 160 },
    { id: 'rs_index', name: 'Hopper / Indexer R&D', area: 'index', cost: 800, hours: 160, xp: 150 },
    { id: 'rs_climb', name: 'Climber R&D', area: 'climb', cost: 1000, hours: 180, xp: 160 },
    { id: 'rs_vision', name: 'Vision Localization', area: 'vision', cost: 900, hours: 220, xp: 190 },
    { id: 'rs_path', name: 'Path-planning Library', area: 'autoPath', cost: 300, hours: 200, xp: 180 },
    { id: 'rs_elec', name: 'Electrical Standards', area: 'elec', cost: 600, hours: 150, xp: 160 }
  ];
  D.KNOW_THRESH = [0, 100, 250, 450, 700, 1000];
  D.knowLevel = xp => { let l = 0; for (let i = 1; i < D.KNOW_THRESH.length; i++) if (xp >= D.KNOW_THRESH[i]) l = i; return l; };

  // ---------- Outreach & fundraising ----------
  // req: unlocked by facilities, staff, sponsors or reputation. robot: a robot show (the trailer adds +20% outreach).
  const lvl = (S, id) => G.Shop.lvl(S, id);
  D.ACTIVITIES = [
    { id: 'demo', name: 'Community robot demo', icon: 'garage', kind: 'outreach', cost: 100, impact: 6, rep: 2, robot: true, desc: 'Show the robot at a library or fair.' },
    { id: 'camp', name: 'STEM summer camp', icon: 'team', kind: 'outreach', cost: 300, impact: 14, rep: 4, recruits: 1, desc: 'Run a week-long camp for middle schoolers.' },
    { id: 'fll', name: 'Mentor a junior robotics team', icon: 'mentors', kind: 'outreach', cost: 200, impact: 10, rep: 3, recruits: 1, desc: 'Coach a local junior team for a season.' },
    { id: 'openhouse', name: 'Weekend shop open house', icon: 'lathe', kind: 'outreach', cost: 150, impact: 9, rep: 2, recruits: 1, money: [150, 450], req: S => lvl(S, 'lathe') > 0 || lvl(S, 'cnc') > 0, reqText: 'Needs a Machine Shop or CNC', desc: 'Families tour the machine shop; a donation box by the door.' },
    { id: 'workshop', name: 'Machining workshop for local teams', icon: 'cnc', kind: 'outreach', cost: 200, impact: 11, rep: 3, req: S => lvl(S, 'lathe') > 0 || lvl(S, 'cnc') > 0, reqText: 'Needs a Machine Shop or CNC', desc: 'Teach other teams to make their own parts.' },
    { id: 'cadclass', name: 'CAD & coding night', icon: 'laptops', kind: 'outreach', cost: 80, impact: 7, rep: 2, req: S => lvl(S, 'laptops') > 0, reqText: 'Needs a Programming Station', desc: 'Open lab night on the team\'s workstations.' },
    { id: 'printkits', name: '3D-printed kits for schools', icon: 'printer', kind: 'outreach', cost: 150, impact: 8, rep: 2, req: S => lvl(S, 'printer') >= 2, reqText: 'Needs a Print farm (3D Printing level 2)', desc: 'Print simple robot kits for elementary classrooms.' },
    { id: 'fieldday', name: 'Practice-field scrimmage day', icon: 'pfield', kind: 'outreach', cost: 250, impact: 10, rep: 3, money: [300, 800], robot: true, req: S => lvl(S, 'pfield') >= 2, reqText: 'Needs a half or full practice field', desc: 'Host local teams on your field; small entry fees.' },
    { id: 'roadshow', name: 'Trailer roadshow', icon: 'trailer', kind: 'outreach', cost: 300, impact: 13, rep: 3, robot: true, req: S => lvl(S, 'trailer') > 0, reqText: 'Needs the Team Trailer', desc: 'Take the robot on tour to schools across the region.' },
    { id: 'industry', name: 'Industry night with a mentor', icon: 'mentors', kind: 'outreach', cost: 0, impact: 6, rep: 2, req: S => S.mentors.some(m => m.role === 'biz' || m.role === 'design'), reqText: 'Needs a Business or Design mentor', desc: 'A mentor hosts a careers talk.' },
    { id: 'pizza', name: 'Team pizza & movie night', icon: 'team', kind: 'rest', cost: 150, fatigue: -6, morale: 2, desc: 'No outreach at all, but a tired team gets some rest (fatigue −6 in season).' },
    { id: 'bake', name: 'Bake sale', icon: 'fund', kind: 'fund', cost: 50, money: [300, 600], desc: 'Classic.' },
    { id: 'carwash', name: 'Car wash', icon: 'fund', kind: 'fund', cost: 80, money: [400, 900], desc: 'Weekend car wash.' },
    { id: 'crowd', name: 'Crowdfunding campaign', icon: 'money', kind: 'fund', cost: 0, money: [600, 2000], repScale: true, desc: 'Online campaign. Pays more with a good reputation.' },
    { id: 'grant', name: 'Write a grant application', icon: 'design', kind: 'fund', cost: 0, money: [1500, 4000], grant: true, get desc() { return 'Roughly 35% chance of a ' + G.U.money(1500) + '–' + G.U.money(4000) + ' grant (better with strong outreach).'; } },
    { id: 'showcase', name: 'Sponsor showcase night', icon: 'sponsor', kind: 'fund', cost: 200, money: [600, 1600], sponsorSat: 4, req: S => S.sponsors.length >= 2, reqText: 'Needs two or more sponsors', desc: 'Show sponsors the robot; satisfaction +4 for every sponsor.' },
    { id: 'gala', name: 'Alumni fundraising dinner', icon: 'trophy', kind: 'fund', cost: 400, money: [1500, 3800], req: S => S.history.length > 0 || S.profile !== 'rookie', reqText: 'Rookie teams have no alumni yet: after your first season', desc: 'Former members and parents, one big night.' },
    { id: 'parts', name: 'Sell old parts and stock', icon: 'parts', kind: 'fund', cost: 0, money: [300, 900], req: S => lvl(S, 'lathe') > 0, reqText: 'Needs a Machine Shop', desc: 'Machine and sell spare stock to rookie teams.' }
  ];

  // ---------- Mentors ----------
  D.MENTOR_ROLES = [
    { id: 'design', name: 'Design Mentor', desc: 'Upgrade quality, +1 project slot. Has a specialty: that knowledge area does not fade and loses half as much to tech changes.', hours: [8, 15], spec: true },
    { id: 'fab', name: 'Fabrication Mentor', desc: 'Fewer project hours, more reliability, faster pit repairs, +1 project slot. Has a specialty that protects one knowledge area.', hours: [8, 15], spec: true },
    { id: 'prog', name: 'Programming Mentor', desc: 'Faster software projects, better autos and vision. Has a specialty that protects one knowledge area.', hours: [8, 15], spec: true },
    { id: 'strat', name: 'Strategy & Scouting Mentor', desc: 'Sharper scouting, pick-list advice, partners follow your plan more often, a better read of each season\'s strategies. Can fill in as drive coach at 80% of their skill.', hours: [4, 8] },
    { id: 'coach', name: 'Drive Coach', desc: 'Faster driver growth, composure, +1/+2 Coach Calls per match. Coaches from behind the glass unless a student strategist is better.', hours: [4, 8] },
    { id: 'biz', name: 'Business & Outreach Mentor', desc: '+1 sponsor slot, +10% sponsor money, fundraising, and the core of your Impact presentation (60% of their skill).', hours: [4, 8] }
  ];
  D.MENTOR_COST = [0, 0, 1000, 2500, 5000, 9000]; // by stars
  D.SPEC_FOR = { design: ['shooter', 'turret', 'elevator', 'arm', 'intake', 'index', 'climb', 'swerve'], fab: ['swerve', 'elevator', 'arm', 'climb', 'elec', 'intake'], prog: ['vision', 'autoPath', 'turret', 'swerve', 'elec'] };
  D.makeMentor = function (rng, role, stars) {
    const r = D.MENTOR_ROLES.find(x => x.id === role) || rng.pick(D.MENTOR_ROLES);
    stars = stars || rng.wpick([1, 2, 3, 4, 5], s => [0, 3, 4, 3, 2, 1][s]);
    const skill = Math.round(Math.min(98, stars * 17 + rng.int(0, 14)));
    return {
      id: G.U.uid('m'), name: D.personName(rng), role: r.id, stars, skill,
      spec: r.spec ? rng.pick(D.SPEC_FOR[r.id]) : null,
      hours: rng.int(r.hours[0], r.hours[1]) + (stars >= 4 ? 2 : 0),
      cost: D.MENTOR_COST[stars] + rng.int(0, 4) * 100 * (stars > 1 ? 1 : 0),
      contract: rng.int(1, 3), morale: 70
    };
  };

  // ---------- Students ----------
  D.makeStudent = function (rng, grade, talent) {
    talent = talent == null ? 0 : talent;
    const a = () => Math.round(G.U.clamp(rng.norm(32 + talent * 0.4, 10), 10, 75));
    return {
      id: G.U.uid('s'), name: D.personName(rng), grade: grade || rng.int(9, 12),
      pot: Math.round(G.U.clamp(rng.norm(62 + talent * 0.5, 15), 25, 100)),
      attr: { drive: a(), aware: a(), comp: a(), mech: a(), hp: a(), strat: a() }, matches: 0
    };
  };

  // ---------- Real-world World Champions (easter egg in the World Championship pop-up) ----------
  // The alliance that won Einstein each season, from each game's Wikipedia article (Champions section).
  D.REAL_CHAMPS = {
    2016: { div: 'Carver', teams: [[330, 'The Beach Bots'], [2481, 'Roboteers'], [120, 'Cleveland\'s Team'], [1086, 'Blue Cheese']] },
    // two Championships: the Houston alliance, and the other one
    2017: { div: 'Roebling', city: 'Houston', teams: [[973, 'Greybots'], [1011, 'CRUSH'], [2928, 'Viking Robotics'], [5499, 'The Bay Orangutans']],
      also: { div: 'Daly', city: 'St. Louis', teams: [[2767, 'Stryke Force'], [254, 'The Cheesy Poofs'], [862, 'Lightning Robotics'], [1676, 'The Pascack PI-oneers']], note: 'The St. Louis alliance then won the Festival of Champions three matches to two.' } },
    2018: { div: 'Hopper', city: 'Houston', teams: [[254, 'The Cheesy Poofs'], [148, 'The Robowranglers'], [2976, 'Spartabots'], [3075, 'Ha-Dream Team']],
      also: { div: 'Daly', city: 'Detroit', teams: [[2767, 'Stryke Force'], [27, 'Team RUSH'], [2708, 'Lake Effect Robotics'], [4027, 'Centre County 4-H Robotics']] } },
    2019: { div: 'Newton', city: 'Houston', teams: [[973, 'Greybots'], [1323, 'MadTown Robotics'], [5026, 'Iron Panthers'], [4201, 'The Vitruvian Bots']],
      also: { div: 'Darwin', city: 'Detroit', teams: [[3707, 'Brighton TechnoDogs'], [217, 'ThunderChickens'], [4481, 'Team Rembrandts'], [1218, 'SCH Vulcan Robotics']] } },
    2020: { none: 'In the real 2020 season there was no champion: play stopped in March, three weeks in, and both Championships were cancelled.' },
    2022: { div: 'Galileo', teams: [[1619, 'Up-A-Creek Robotics'], [254, 'The Cheesy Poofs'], [3175, 'Knight Vision'], [6672, 'Fusion Corps']] },
    2023: { div: 'Hopper', teams: [[1323, 'MadTown Robotics'], [4414, 'HighTide'], [4096, 'Ctrl-Z'], [2609, 'BeaverworX']] },
    2024: { div: 'Daly', teams: [[1690, 'Orbit'], [4522, 'Team SCREAM'], [9432, 'Team 8-Bit'], [321, 'RoboLancers']] },
    2025: { div: 'Newton', teams: [[1323, 'MadTown Robotics'], [2910, 'Jack in the Bot'], [4272, 'Maverick Robotics'], [5026, 'Iron Panthers']] },
    2026: { div: 'Daly', teams: [[4414, 'HighTide'], [1323, 'MadTown Robotics'], [4065, 'Nerds of Prey'], [1538, 'The Holy Cows']] }
  };

  // ---------- The state of the art moves on (offseason, from the second season) ----------
  // Rule and vendor changes arrive at the start of each offseason and hit next season; new designs spread online in one
  // month between July and September. Each one makes part of the team's know-how outdated: the area loses a share of
  // its XP (counted from at most TECH_CAP × the top level, so banked XP is no shield). A specialist mentor halves the loss.
  D.TECH_RULE_PCT = 0.25; D.TECH_DESIGN_PCT = 0.15; D.TECH_CAP = 1.25; D.TECH_RULES_N = 2; D.TECH_DESIGNS_N = 3;
  D.TECH_RULES = [
    { id: 'wiring', area: 'elec', tag: 'Robot rules', title: 'New wiring rules', body: 'Next season\'s robot rules rewrite the electrical section: new wire-gauge tables, every branch circuit protected on its own, and the main breaker has to sit where a referee can reach it. Half of your wiring standard is now a history lesson.',
      talk: [['Our inspection checklist just became a collector\'s item.', 'an electrical mentor'], ['So the zip-tie budget goes up. Again.', 'a team treasurer']] },
    { id: 'codearch', area: 'autoPath', tag: 'Vendor update', title: 'New code architecture', body: 'The control-system library was rebuilt around a new command framework and a new path-following interface. Last season\'s autonomous code no longer compiles, and the migration guide runs to forty pages.',
      talk: [['Deprecated. Deprecated. Deprecated. Removed.', 'your lead programmer, reading the changelog'], ['I liked the old trajectory follower. It knew me.', 'a student on Team {t}']] },
    { id: 'vissoft', area: 'vision', tag: 'Vendor update', title: 'New vision software', body: 'The vision coprocessor software everyone runs got a full rewrite: new pipelines, a new calibration tool and a new coordinate convention. Your tuned settings do not carry over.',
      talk: [['The new coordinate system is "more intuitive". Our robot now aims at the ceiling.', 'a programmer on Team {t}'], ['Calibration takes ten minutes now. Finding the calibration board took two hours.', 'a vision lead']] },
    { id: 'swervefw', area: 'swerve', tag: 'Vendor update', title: 'Swerve firmware overhaul', body: 'Both module vendors moved to new motor-controller firmware with a different control mode and odometry timing. Your drive constants need tuning again from scratch.',
      talk: [['Every gain we tuned last year is now a suggestion.', 'a controls mentor'], ['It drives great. Sideways. Only sideways.', 'a driver on Team {t}']] },
    { id: 'bumper', area: 'intake', tag: 'Robot rules', title: 'Bumper and frame rule change', body: 'Bumpers sit in a different height zone next season and robots may reach less far beyond the frame. Last year\'s intake geometry no longer fits inside the rules.',
      talk: [['We spent two seasons perfecting that intake. The new rules moved the bumper two inches.', 'a design mentor'], ['On the bright side, bumpers are still red and blue.', 'a forum comment']] },
    { id: 'height', area: 'climb', tag: 'Robot rules', title: 'New height and extension limits', body: 'A lower height limit, and no reaching above the robot before the endgame. Tall telescoping climbers need a rethink, and so do the hooks that go with them.',
      talk: [['Our climber is now four inches too proud of itself.', 'a mentor on Team {t}'], ['Measure twice, read the rule three times, cut once.', 'a fabrication mentor']] }
  ];
  D.TECH_DESIGNS = [
    { id: 'pivot', area: 'arm', title: 'A new pivot design', body: 'A top team posted the CAD of a pivot driven through a dead-axle chain stage, with the encoder on the output shaft: half the backlash and a third of the parts. Every arm built the old way suddenly looks a season old.' },
    { id: 'rigging', area: 'elevator', title: 'New elevator rigging', body: 'An offseason reveal showed a continuous-rigged elevator with a spring tensioner that never needs re-tying. The build thread has 900 replies and counting.' },
    { id: 'visalg', area: 'vision', title: 'A new vision algorithm', body: 'An open-source pose estimator that fuses several tags with the gyro landed over the summer. Teams report localization twice as steady as last season\'s best.' },
    { id: 'intake', area: 'intake', title: 'A new intake geometry', body: 'Somebody worked out a compliant-wheel intake that centers the game piece by itself. Slow-motion videos of it are everywhere.' },
    { id: 'hood', area: 'shooter', title: 'A new shooter layout', body: 'A twin-flywheel shooter with a motorized hood and a feeder that pre-spins the piece: tighter groups from farther out, and the drawings are public.' },
    { id: 'turret', area: 'turret', title: 'A new turret build', body: 'A printed-ring turret with an internal cable chain and 540 degrees of travel, published with full drawings. Slip rings are suddenly old news.' },
    { id: 'indexer', area: 'index', title: 'A new indexer', body: 'A serializer built around a star wheel that makes jams close to impossible went viral after an offseason event.' },
    { id: 'climber', area: 'climb', title: 'A new climber', body: 'A spring-driven climber with latching hooks: up in under two seconds, and it stays up when the power is cut.' },
    { id: 'swervemod', area: 'swerve', title: 'A new swerve module layout', body: 'An inverted module with smaller wheels and the motors tucked inside the frame rail. Lower, lighter, and it corners like it is on rails.' },
    { id: 'planner', area: 'autoPath', title: 'A new path planner', body: 'A trajectory optimizer that replans around other robots on the fly was released as a free library. Hand-drawn paths look quaint now.' }
  ];
  D.TECH_TALK = {
    rules: [['Reading the manual front to back this year. I say that every year.', 'a mentor on Team {t}'], ['Whoever wrote that rule has clearly met our robot.', 'a student on Team {t}'], ['Update the checklist, update the wiki, update the students. In that order.', 'a lead mentor'], ['Good news: everyone else has to relearn it too.', 'a forum regular']],
    designs: [['Saved the CAD. Told nobody. Everybody had already saved the CAD.', 'a design student on Team {t}'], ['We are not copying it. We are being inspired by it. Precisely.', 'a mentor on Team {t}'], ['Open build threads are the best and worst thing to happen to my sleep.', 'a lead mentor'], ['Our version is the same, but with more zip ties.', 'Team {t}'], ['I gave it a week before somebody printed it in team colors. It took two days.', 'a forum regular']]
  };
  D.TECH_INTRO = {
    rules: ['The season is barely over and next year\'s paperwork is already here. Two changes will reach your shop before Kickoff:', 'Summer homework arrived early. The robot rules and the vendors both moved, and your notes did not move with them:', 'Every offseason somebody changes the ground under the robot. This year it is these two:'],
    designs: ['Offseason reveal threads are in full swing, and a few ideas are spreading faster than anyone can build them:', 'It was a busy month online. Three designs showed up that everybody will be running by Kickoff:', 'The best teams published their homework, and it raises the bar for everyone else:']
  };
  // ---------- Second robot drills ----------
  D.DEF_DRILL_HOURS = 18;   // driver-practice hours with two running robots for full "playing through defense" skill (resets each season)
  D.DEF_DRILL_EFFECT = 0.35; // a fully drilled drive team loses this much less to a defender (speed, cycle time, accuracy)
  D.CHASSIS_PATH = 0.2;     // a second robot on the same drivetrain family (tank / holonomic) speeds up auto and path projects by 20%
  D.CHASSIS_PATH_XP = 3;    // ... and adds Autonomous Pathing XP every week it runs
  D.ELEC_SHAKE_HOURS = 30;  // testing hours with a second robot running until the electrical shakedown is complete (resets each season)
  D.ELEC_SHAKE_XP = 3;      // Electrical & Reliability XP every week a second robot runs
  D.ELEC_SHAKE_EFFECT = [0.4, 0.25, 0.1]; // fewer brownouts and comms dropouts at 100%: first event of the season, second event, later events
  D.DRIVE_FAMILY = { kit: 'tank', wcd: 'tank', mec: 'holonomic', swerve: 'holonomic' };

  // ---------- Feeder programs ----------
  // attr: skill bonus for a recruit who comes from a fully grown program with this focus; size: extra recruits per year;
  // impact: weight in the Impact rating's "feeder programs" part (3 established balanced programs = full marks)
  D.FEEDER_MAX = 6; D.FEEDER_COST = 1000;
  D.FEEDER_FOCUS = {
    balanced: { name: 'Balanced', desc: 'A bit of everything, a little more potential', attr: { drive: 5, aware: 5, comp: 5, mech: 5, hp: 5, strat: 5 }, pot: 6, size: 1.2, impact: 1 },
    drive: { name: 'Drive team', desc: 'Driving, awareness and human-player skill', attr: { drive: 10, aware: 6, hp: 6, comp: 3 }, pot: 2, size: 0.8, impact: 0.8 },
    tech: { name: 'Technical', desc: 'Mechanism skill (operators) and composure', attr: { mech: 11, comp: 5, aware: 2 }, pot: 2, size: 1.2, impact: 0.8 },
    strat: { name: 'Strategy', desc: 'Strategy and awareness: coaches, scouts and presenters', attr: { strat: 11, aware: 6 }, pot: 2, size: 0.8, impact: 0.9 },
    outreach: { name: 'Outreach', desc: 'Community-first: more recruits and a stronger Impact story', attr: { aware: 3, strat: 3, comp: 3 }, pot: 1, size: 2, impact: 1.6 }
  };
  D.FEEDER_SCHOOLS = ['Lincoln', 'Westside', 'Oak Hill', 'Riverside', 'Maple Grove', 'Cedar Park', 'Northview', 'Pine Ridge', 'Lakeshore', 'Hillcrest', 'Brookfield', 'Fairview', 'Eastwood', 'Summit'];
  D.FEEDER_KINDS = ['Elementary FLL Explore', 'Middle School FLL', 'Middle School FTC', 'STEM Club', 'Library Maker Club', 'Summer Robotics Camp', 'Girls in STEM Club'];

  // ---------- Sponsors ----------
  D.SPONSOR_NAMES = {
    tech: ['Vantage Systems', 'Nimbus Data', 'Quantix Labs', 'Helios Microdevices', 'Aurora Networks', 'Stratos Cloud'],
    local: ['Riverside Credit Union', 'Maple Street Pizza', 'Lakeside Hardware', 'Bluebird Diner', 'Corner Book Co.', 'Hometown Auto Repair'],
    eng: ['Arcwell Engineering', 'Stonebridge Consulting', 'Meridian Structures', 'Clearpath Civil'],
    mfg: ['Kestrel Machine Works', 'Ironclad Fabrication', 'Precision Plate Co.', 'Northstar Tooling'],
    uni: ['Northbridge University', 'Lakeview Technical College', 'Eastgate Polytechnic'],
    soft: ['Helix Software', 'Bytewise Labs', 'Cobalt Code', 'Pinecone Apps'],
    found: ['Bright Futures Foundation', 'STEM Forward Fund', 'Next Generation Trust']
  };
  D.SPONSOR_TYPES = {
    tech: { name: 'Tech corporation', title: true, f: 1.08, money: [8000, 16000], exp: 'High', goals: ['champs', 'win', 'playoffs2', 'avgRP'], perks: ['bonusBoost'], oblig: [2, 3] },
    local: { name: 'Local business', title: false, f: 0.8, money: [800, 3000], exp: 'Low', goals: ['events2', 'outreach', 'playoffs1'], perks: [], oblig: [0, 1] },
    eng: { name: 'Engineering firm', title: true, f: 1, money: [4000, 10000], exp: 'Medium', goals: ['techAward', 'playoffs1', 'award'], perks: ['tempMentor'], oblig: [1, 2] },
    mfg: { name: 'Manufacturing company', title: true, f: 0.95, money: [3000, 8000], exp: 'Medium', goals: ['quality', 'playoffs1', 'award'], perks: ['fabSpeed', 'partsDiscount'], oblig: [1, 2] },
    uni: { name: 'University', title: false, f: 0.9, money: [1000, 3500], exp: 'Low', goals: ['outreach', 'impactAward'], perks: ['xpBonus'], oblig: [1, 1] },
    soft: { name: 'Software company', title: false, f: 1.1, money: [1500, 5000], exp: 'Medium', goals: ['autoAward', 'avgRP', 'playoffs1'], perks: ['progSpeed'], oblig: [1, 1] },
    found: { name: 'Foundation grant', title: false, grant: true, f: 1, money: [2500, 5000], exp: 'Low', goals: ['outreach'], perks: [], oblig: [0, 0] }
  };
  D.SPONSOR_BASE = { title: 12500, partner: 3800, grant: 3500 }; // per season, before type, performance and difficulty
  D.SPONSOR_DIFF = { easy: 1.2, normal: 1, hard: 0.88 };
  D.PERKS = {
    bonusBoost: { name: 'Performance bonuses +50%' },
    tempMentor: { name: 'Engineering volunteers: +1 temporary 3★ Design Mentor' },
    fabSpeed: { name: 'Free CNC machining: −10% project hours' },
    partsDiscount: { name: '−15% on parts store purchases' },
    xpBonus: { name: '+10% knowledge XP' },
    progSpeed: { name: '−15% software project hours' },
    travelDiscount: { name: '−25% travel costs' }
  };
  D.GOALS = {
    playoffs1: { text: 'Reach playoffs at an event', bonus: 2000 },
    playoffs2: { text: 'Reach playoffs at 2 events', bonus: 3000 },
    win: { text: 'Win a regional', bonus: 5000 },
    champs: { text: 'Qualify for Championship', bonus: 6000 },
    award: { text: 'Win any award', bonus: 1500 },
    techAward: { text: 'Win a technical award', bonus: 2000 },
    quality: { text: 'Win the Quality or Excellence in Engineering award', bonus: 2500 },
    autoAward: { text: 'Win the Autonomous or Innovation in Control award', bonus: 2500 },
    impactAward: { text: 'Win Impact or Engineering Inspiration', bonus: 3000 },
    avgRP: { text: 'Average 2+ RP per qualification match', bonus: 2500 },
    outreach: { text: 'Run 2 outreach activities this season', bonus: 1000 },
    events2: { text: 'Attend 2 regionals', bonus: 1000 },
    dcmp: { text: 'Reach the District Championship', bonus: 2500 }
  };
  D.OBLIGATIONS = [
    { id: 'demo', text: 'Robot demo at the {s} headquarters' },
    { id: 'visit', text: '{s} executives visit your shop' },
    { id: 'stem', text: 'STEM night for {s} employees\' families' },
    { id: 'talk', text: 'A student speaks at the {s} community event' }
  ];

  // ---------- Awards ----------
  D.AWARDS = [
    { id: 'impact', name: 'Impact Award', champs: true, pool: 10 },
    { id: 'ei', name: 'Engineering Inspiration Award', champs: true, pool: 8 },
    { id: 'ras', name: 'Rookie All-Star Award', champs: true, pool: 8, rookie: true },
    { id: 'eie', name: 'Excellence in Engineering Award', tech: true, pool: 5 },
    { id: 'id', name: 'Industrial Design Award', tech: true, pool: 5 },
    { id: 'ic', name: 'Innovation in Control Award', tech: true, pool: 5 },
    { id: 'quality', name: 'Quality Award', tech: true, pool: 5 },
    { id: 'creativity', name: 'Creativity Award', tech: true, pool: 5 },
    { id: 'auto', name: 'Autonomous Award', tech: true, pool: 5 },
    { id: 'gp', name: 'Gracious Professionalism Award', pool: 5 },
    { id: 'spirit', name: 'Team Spirit Award', pool: 5 },
    { id: 'judges', name: 'Judges\' Award', pool: 5 }
  ];

  // ---------- Starting profiles ----------
  D.PROFILES = {
    rookie: { name: 'Rookie', money: 25000, students: 15, mentors: [[1, 2], [2, 2]], know: 0, equip: [], parts: {}, rep: 20, support: 60, school: 8000,
      desc: 'Brand-new team. Small budget, no experience and a single robotics classroom — but eligible for rookie awards.' },
    established: { name: 'Established', money: 45000, students: 25, mentors: [[2, 3], [2, 3], [2, 3], [2, 2]], know: 1, equip: ['printer'], parts: {}, rep: 45, support: 60, school: 14000,
      desc: 'A solid program with some experience, a 3D printer and room in the technology wing.' },
    powerhouse: { name: 'Powerhouse', money: 90000, students: 40, mentors: [[3, 4], [3, 4], [3, 4], [3, 4], [3, 3], [3, 3], [3, 3]], know: 2, equip: ['printer', 'cnc', 'field', 'pfield'], parts: {}, rep: 85, support: 72, school: 22000,
      desc: 'A perennial contender with deep knowledge, a high reputation, a CNC router, a practice area and the premium vendor\'s parts — and a school and sponsors who expect wins.' }
  };

  // ---------- Single-season scenarios ----------
  D.SCENARIOS = [
    { id: 'rookie', name: 'Rookie Year', profile: 'rookie', money: 20000, goal: 'rookieWin', goalText: 'Win the Rookie All-Star award or reach playoffs.' },
    { id: 'shoestring', name: 'Shoestring', profile: 'established', money: 12000, goal: 'champs', goalText: 'Qualify for the Championship on a $12k budget.' },
    { id: 'dynasty', name: 'Dynasty', profile: 'powerhouse', goal: 'einstein', goalText: 'Win Einstein — become World Champions.' },
    { id: 'oneshot', name: 'One Shot', profile: 'established', maxEvents: 1, goal: 'win', goalText: 'You may attend only one regional. Win it.' },
    { id: 'comeback', name: 'Comeback', profile: 'established', money: 30000, morale: 30, dropMentors: 2, goal: 'win', goalText: 'Morale is low and two mentors quit. Win a regional.' },
    { id: 'techdebt', name: 'Tech Debt', profile: 'powerhouse', resetKnow: true, goal: 'avgRP25', goalText: 'All knowledge reset to zero. Average 2.5+ RP per qualification match.' },
    { id: 'custom', name: 'Custom', profile: 'established', custom: true, goal: 'legacy', goalText: 'Free play — graded on legacy points.' }
  ];

  // ---------- Program (school) season goals ----------
  D.PROGRAM_GOALS = {
    finish: { text: 'Compete at a regional', check: s => s.events.length >= 1 },
    playoffs1: { text: 'Reach playoffs at a regional', check: s => s.events.some(e => e.playoffs) },
    playoffs2: { text: 'Reach playoffs at two regionals', check: s => s.events.filter(e => e.playoffs).length >= 2 },
    award: { text: 'Win an award', check: s => s.awards.length > 0 },
    winEvent: { text: 'Win a regional', check: s => s.events.some(e => e.won) },
    champs: { text: 'Qualify for the Championship', check: s => s.champsQualified },
    dcmp: { text: 'Reach the District Championship', check: s => !!s.dcmpQualified },
    dTop10: { text: 'Finish in the district\'s top ten', check: s => s.dRank != null && s.dRank <= 10 },
    divPlayoffs: { text: 'Reach the Championship division playoffs', check: s => !!s.champsPlayoffs },
    einstein: { text: 'Reach Einstein', check: s => !!s.einstein },
    topHalf: { text: 'Rank in the top half at every regional', check: s => s.events.length > 0 && s.events.every(e => e.rank <= e.size / 2) }
  };
})();
