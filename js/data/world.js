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
      fx: { tune: [0.08, 0.14, 0.2], test: [8, 12, 16] }, desc: 'Unlocks weekly testing hours for development testing and driver practice. Driver practice needs this season\'s game elements for full value.' }
  ];
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
    { id: 'grant', name: 'Write a grant application', icon: 'design', kind: 'fund', cost: 0, money: [1500, 4000], grant: true, desc: 'Roughly 35% chance of a $1,500–$4,000 grant (better with strong outreach).' },
    { id: 'showcase', name: 'Sponsor showcase night', icon: 'sponsor', kind: 'fund', cost: 200, money: [600, 1600], sponsorSat: 4, req: S => S.sponsors.length >= 2, reqText: 'Needs two or more sponsors', desc: 'Show sponsors the robot; satisfaction +4 for every sponsor.' },
    { id: 'gala', name: 'Alumni fundraising dinner', icon: 'trophy', kind: 'fund', cost: 400, money: [1500, 3800], req: S => S.history.length > 0 || S.profile !== 'rookie', reqText: 'Rookie teams have no alumni yet: after your first season', desc: 'Former members and parents, one big night.' },
    { id: 'parts', name: 'Sell old parts and stock', icon: 'parts', kind: 'fund', cost: 0, money: [300, 900], req: S => lvl(S, 'lathe') > 0, reqText: 'Needs a Machine Shop', desc: 'Machine and sell spare stock to rookie teams.' }
  ];

  // ---------- Mentors ----------
  D.MENTOR_ROLES = [
    { id: 'design', name: 'Design Mentor', desc: 'Upgrade quality, +1 project slot, specialty knowledge.', hours: [8, 15], spec: true },
    { id: 'fab', name: 'Fabrication Mentor', desc: 'Fewer project hours, more reliability, faster pit repairs, +1 project slot.', hours: [8, 15], spec: true },
    { id: 'prog', name: 'Programming Mentor', desc: 'Faster software projects, better autos and vision.', hours: [8, 15], spec: true },
    { id: 'strat', name: 'Strategy & Scouting Mentor', desc: 'Sharper scouting, pick-list advice, partners follow your plan more often.', hours: [4, 8] },
    { id: 'coach', name: 'Drive Coach', desc: 'Faster driver growth, composure, +1/+2 Coach Calls per match.', hours: [4, 8] },
    { id: 'biz', name: 'Business & Outreach Mentor', desc: '+1 sponsor slot, +10% sponsor money, Impact Award chances, fundraising.', hours: [4, 8] }
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
    2022: { div: 'Galileo', teams: [[1619, 'Up-A-Creek Robotics'], [254, 'The Cheesy Poofs'], [3175, 'Knight Vision'], [6672, 'Fusion Corps']] },
    2023: { div: 'Hopper', teams: [[1323, 'MadTown Robotics'], [4414, 'HighTide'], [4096, 'Ctrl-Z'], [2609, 'BeaverworX']] },
    2024: { div: 'Daly', teams: [[1690, 'Orbit'], [4522, 'Team SCREAM'], [9432, 'Team 8-Bit'], [321, 'RoboLancers']] },
    2025: { div: 'Newton', teams: [[1323, 'MadTown Robotics'], [2910, 'Jack in the Bot'], [4272, 'Maverick Robotics'], [5026, 'Iron Panthers']] },
    2026: { div: 'Daly', teams: [[4414, 'HighTide'], [1323, 'MadTown Robotics'], [4065, 'Nerds of Prey'], [1538, 'The Holy Cows']] }
  };

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
    events2: { text: 'Attend 2 regionals', bonus: 1000 }
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
      desc: 'Brand-new team. Small budget, no experience — but eligible for rookie awards.' },
    established: { name: 'Established', money: 45000, students: 25, mentors: [[2, 3], [2, 3], [2, 3], [2, 2]], know: 1, equip: ['printer'], parts: {}, rep: 45, support: 60, school: 14000,
      desc: 'A solid program with some experience and a 3D printer.' },
    powerhouse: { name: 'Powerhouse', money: 90000, students: 40, mentors: [[3, 4], [3, 4], [3, 4], [3, 4], [3, 3], [3, 3], [3, 3]], know: 2, equip: ['printer', 'cnc', 'field', 'pfield'], parts: {}, rep: 75, support: 65, school: 22000,
      desc: 'A perennial contender with deep knowledge, a CNC router and Apex swerve parts — and sponsors who expect wins.' }
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
    divPlayoffs: { text: 'Reach the Championship division playoffs', check: s => !!s.champsPlayoffs },
    einstein: { text: 'Reach Einstein', check: s => !!s.einstein },
    topHalf: { text: 'Rank in the top half at every regional', check: s => s.events.length > 0 && s.events.every(e => e.rank <= e.size / 2) }
  };
})();
