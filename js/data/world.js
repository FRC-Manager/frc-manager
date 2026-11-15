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
  D.INBOX_MAX = 220; D.INBOX_RECENT = 60; // messages the Inbox keeps, and the newest that always stay (career.js C.inbox)
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
    { id: 'os_summit', name: 'Summit Champs', month: 'Oct', size: 40, fee: 3000, invite: true }, // (3.1.3) invitation only: see D.SUMMIT
    { id: 'os_oct', name: 'Fall Classic', month: 'Oct', size: 30, fee: 1000 },
    { id: 'os_nov', name: 'Robot Rumble Showcase', month: 'Nov', size: 24, fee: 700 }
  ];
  D.MONTHS = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // (3.1.3) Summit Champs: the invitation-only October event of the best teams of the season, hosted every year by an
  // elite team in California. Invited: the teams that won an official event as captain or first pick (world simulation),
  // the strongest of them and the host. A field like a Championship division's playoffs, a mentor conference before
  // practice (pick talks for a little know-how), more reward, and full travel (a flight unless you are in the West).
  D.SUMMIT = { id: 'os_summit', region: 'West', str: 5, weekMult: 1.08, xp: 3, inviteMonth: 'Aug', talks: 4, listen: 2, confXP: 25, elites: 8, pull: -10,
    rep: 5, repWin: 6, morale: 5, moraleWin: 10, sat: 6 };
  // (3.1.3) Vendor challenges: each vendor runs one online contest a year, always in the same offseason month, from its
  // first year on (not in a career's opening pre-season). A team enters with a program project that month (Design
  // Office); the results come the next month. The odds follow one station (fac) and the students' average mechanism
  // skill, plus extra hours on the entry; no mentor helps. Prizes work like a loyalty sponsorship: free parts at Kickoff,
  // a voucher or a sale, one to choose.
  D.CHALLENGES = [
    { id: 'code', v: 'B', name: 'Lumen Code Cup', from: 2023, month: 'Jun', res: 'Jul', fac: 'laptops', area: 'autoPath', hours: 80,
      what: 'a week to write the autonomous code for a robot in Lumen\'s simulator, scored on a public leaderboard',
      made: ['a five-piece auto that never touched a wall', 'a path planner that re-plans when a simulated partner gets in the way', 'an auto that scored the most in the last ten seconds of the week', 'a routine the judges called "boring, in the best way"'],
      merch: ['a teal Lumen hoodie for every student who entered', 'a sheet of "I beat the leaderboard (once)" stickers', 'a USB stick with next year\'s simulator on it, a month early'],
      // the invitation window: its first year, then every year after ({n}: second, third…; {x}: this year's twist)
      first: ['Lumen Robotics announced something new this morning, and it is not a part: the Lumen Code Cup, a contest for FRC students. For one week in June, teams write the autonomous code for a robot in Lumen\'s simulator, and a public leaderboard scores every run.', 'The founder said it in the announcement video, from the warehouse floor between two pallets: "Half the teams we sell to never get past a two-piece auto. We want to see what students write when the robot cannot break."'],
      later: ['The Lumen Code Cup is back for its {n} year: a week in June, Lumen\'s simulator, and a leaderboard that never sleeps.', 'This year\'s robot: {x}.'],
      twist: ['a swerve drive with a slow turret', 'a tank drive that shares the field with two simulated partners', 'a robot whose camera fails halfway through every run', 'last year\'s winner, with one motor fewer'] },
    { id: 'elec', v: 'L', name: 'Lanternworks Circuit Jam', from: 2024, month: 'Sep', res: 'Oct', fac: 'ebench', area: 'elec', hours: 60,
      what: 'one weekend to lay out and wire the electrical board of a robot the organisers describe, from the battery to the camera, judged on the photos and the wiring diagram',
      made: ['a board where every wire is labelled at both ends', 'a camera mount with its own little power board', 'a wiring diagram the judges printed and pinned to their wall', 'a board that comes off the robot with four bolts and one plug'],
      merch: ['green Lanternworks T-shirts that glow faintly under a ring light', 'a roll of wire labels and a sheet of lantern stickers', 'a keychain made from a retired Lantern 1 lens'],
      first: ['Lanternworks, the vision company behind the green ring light on half the robots at every event, is running a contest of its own: the Lanternworks Circuit Jam. One weekend in September, one robot described on paper, and every team lays out and wires its electrical board, from the battery to the camera.', 'The two founders were drive-team programmers once. "Most of the robots we watched die on the field died of a loose wire," one of them wrote. "This contest is our revenge."'],
      later: ['The Lanternworks Circuit Jam is back for its {n} year: one weekend, one robot on paper, every wire on the board.', 'This year\'s robot: {x}. The judges look at the photos and the wiring diagram, and they look closely.'],
      twist: ['two cameras, a coprocessor and a CAN bus that runs the length of the frame', 'a robot that has to survive a simulated brownout', 'a board that must come off the robot in under a minute', 'six motors on one side of the frame and no room to route their wires'] },
    { id: 'cad', v: 'A', name: 'Apex CAD Sprint', from: 2022, month: 'Nov', res: 'Dec', fac: 'cad', area: ['elevator', 'swerve', 'turret', 'intake'], hours: 80,
      what: 'forty-eight hours to design a complete robot for a game from the past, in CAD, judged by Apex engineers',
      made: ['a robot with a two-stage elevator that folds inside the frame', 'a full robot under 110 lb on paper, every bolt drawn, on a swerve drive', 'a turret that the judges said they would build themselves', 'a full-width intake the judges called "touch it, own it" in CAD'],
      merch: ['orange Apex T-shirts, one per student who entered', 'a strip of Apex stickers for the robot', 'a keychain cut from a motor shaft, engraved with the founder\'s "nothing fails twice"'],
      first: ['Apex Motion has a new launch, and for once it is not a part: the Apex CAD Sprint. Forty-eight hours in November to design a complete robot, in CAD, for a game from the past. Apex engineers judge every entry.', 'The founder kept a list of failed parts for years, and the contest has one rule that comes straight from it: "Nothing goes on the robot that you could not buy this afternoon."'],
      later: ['The Apex CAD Sprint is back for its {n} year: forty-eight hours, one complete robot in CAD, judged by Apex engineers.', 'This year\'s game from the past is {x}.'],
      twist: null } // the CAD Sprint's twist is a past game (G.Seasons)
  ];
  // full: station level that counts in full; mech: average mechanism skill from no help to full; w: weights of the
  // station, the students and the entry's quality; p1/p2: first and second prize odds at a perfect score (first prize
  // falls off faster: s^3 against s^2); entries: about how many teams enter (first year, then more each year)
  D.CHAL = { full: 3, mech: [25, 65], w: { fac: 0.5, mech: 0.35, q: 0.15 }, p1: 0.05, p2: 0.2, entries: [240, 45], xp: 15, rep: [3, 1], morale: [4, 2], merchMorale: 1,
    prize: {
      A: [{ pack: { motor: 6, enc: 4 }, voucher: 2000, sale: 0.35 }, { pack: { motor: 2, enc: 2 }, voucher: 750, sale: 0.2 }],
      B: [{ pack: { motor: 6, enc: 4 }, voucher: 2000, sale: 0.35 }, { pack: { motor: 2, enc: 2 }, voucher: 750, sale: 0.2 }],
      L: [{ pack: { camera: 2, accel: 1, nswitch: 1 }, voucher: 800, sale: 0.4 }, { pack: { camera: 1, nswitch: 1 }, voucher: 300, sale: 0.25 }]
    } };

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
  // Experience by field strength: an event's stars (★ to ★★★★★) say how strong its field is. Each star above three adds
  // 15% to what the team learns there (drive-team skills, know-how from competing, strategy read), each star below takes
  // 15% off: ×0.7 at ★, ×1.3 at ★★★★★. Regionals, district events and the District Championship (the Championship has
  // its own bonus).
  D.EVENT_EXP = 0.15;

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
  D.SPARES_EVENT_PRINT = 1.15; // with a print farm (Prototyping Lab level 4) the pit prints many of them: a little more than at home
  D.SPARE_COND_PER_UNIT = 30; // condition points one spare part restores

  // ---------- Workshop facilities ----------
  // Each facility has levels (buy = level 1, then upgrades) and a condition that wears down over time.
  // Effects scale with level and with efficiency (40% at 0 condition → 100% at full condition).
  // fx values are per level. wear = condition lost per in-season week / offseason month / event attended.
  D.EQUIP = [
    { id: 'printer', name: 'Prototyping Lab', upkeep: 250, wear: { season: 2.5, off: 1.2, event: 0 },
      levels: [{ name: 'Desktop 3D printer', cost: 1000 }, { name: 'Printer bench + laser cutter', cost: 4500 }, { name: 'Industrial printer + laser cutter', cost: 10000 }, { name: 'Print farm + laser cutter', cost: 7500, from: 2023, fromMonth: 4 }],
      fx: { hours: [0.08, 0.15, 0.2, 0.25], slot: [0, 1, 1, 1] }, desc: '3D printers, and from level 2 a laser cutter for plates and gussets: faster prototypes and custom parts, fewer hours on hardware projects. The print farm (from the autumn of 2022) is a shelf of fast desktop printers that print carbon-fiber parts overnight, and in the pit between matches.' },
    { id: 'cnc', name: 'CNC Machining', upkeep: 700, wear: { season: 2.5, off: 1.2, event: 0 },
      levels: [{ name: 'CNC router', cost: 11000 }, { name: 'CNC mill and CNC lathe', cost: 20000 }],
      fx: { hours: [0.15, 0.22], gain: [0.1, 0.16], rel: [5, 8], stat: [2, 3], slot: [1, 1] }, desc: 'Computer-controlled machines (a router, then a CNC mill and a CNC lathe): precise parts, fewer hardware hours, stronger upgrades, more reliable new builds.' },
    { id: 'lathe', name: 'Manual Machine Shop', upkeep: 450, wear: { season: 2, off: 0.8, event: 0 },
      levels: [{ name: 'Manual mill & lathe', cost: 7500 }, { name: 'Full machine shop', cost: 15000 }],
      fx: { spare: [0.3, 0.45], rel: [3, 5], slot: [0, 1] }, desc: 'A manual mill and lathe, then a drill press, a band saw and the rest of a real shop: make your own spare parts (cheaper spares) and more reliable new builds.' },
    // a parts room: without one the shop holds about one robot's worth of each part
    { id: 'shelf', name: 'Parts Shelf', upkeep: 50, wornUpkeep: 4, noDown: true, wear: { season: 1, off: 0.4, event: 0 },
      levels: [{ name: 'Shelving units', cost: 600 }, { name: 'Parts room with labelled bins', cost: 1800 }, { name: 'Parts store + inventory system', cost: 4000 }],
      fx: { shelf: [0.67, 0.83, 1] }, desc: 'Somewhere for motors, encoders, gearboxes and kits to live. Without one the shop holds about one robot\'s worth of each (half the most); the top level holds two robots\' worth.' },
    { id: 'laptops', name: 'Programming Station', upkeep: 250, wear: { season: 1.5, off: 0.8, event: 0 },
      levels: [{ name: 'Laptops + sim software', cost: 2000 }, { name: 'Dev workstations', cost: 6000 }, { name: 'Hardware-in-the-loop bench', cost: 11000 }, { name: 'AI coding lab', cost: 15000, from: 2025, fromMonth: 4 }],
      fx: { soft: [0.2, 0.3, 0.38, 0.46], slot: [0, 1, 1, 1] }, desc: 'Fewer hours on software, auto and vision projects. The AI coding lab (from the autumn of 2024) pairs every programmer with an AI assistant.' },
    // a CAD room: every part drawn and checked before anything is cut
    { id: 'cad', name: 'CAD Workstations', upkeep: 200, wear: { season: 1.5, off: 0.6, event: 0 },
      levels: [{ name: 'CAD laptops', cost: 1500 }, { name: 'CAD workstations + part library', cost: 4500 }, { name: 'Simulation workstations + PDM server', cost: 9000 }],
      fx: { design: [0.05, 0.1, 0.14] }, desc: 'Every part drawn and checked before it is cut, from a shared library of parts that worked: new mechanisms and upgrades take fewer hours.' },
    { id: 'charger', name: 'Battery Station', upkeep: 100, wear: { season: 0.5, off: 0.2, event: 4 },
      levels: [{ name: 'Charger cart', cost: 500 }, { name: 'Smart charging station', cost: 1800 }],
      fx: { charge: [0.15, 0.3] }, desc: 'Batteries recharge faster between matches.' },
    { id: 'pitcart', name: 'Pit Setup', upkeep: 100, wear: { season: 0, off: 0.2, event: 6 },
      levels: [{ name: 'Pit cart & tool kit', cost: 1000 }, { name: 'Full pit setup', cost: 3500 }, { name: 'Super pit', cost: 9000, from: 2018 }],
      fx: { repair: [0.25, 0.45, 0.6], superPit: [0, 0, 1], scout: [0, 0, 1] }, desc: 'Faster pit repairs between matches. The Super pit (road cases, from 2018) also fully repairs one subsystem of your choice before any match, with spare parts, and its screens help the strategy team scout.' },
    { id: 'trailer', name: 'Team Trailer', upkeep: 1500, wear: { season: 0, off: 0.2, event: 5 },
      levels: [{ name: 'Team trailer', cost: 18000 }],
      fx: { travel: [0.3] }, desc: 'Cheaper travel to Local and Drive events.' },
    { id: 'pfield', name: 'Practice Field', upkeep: 300, wear: { season: 2, off: 0.6, event: 0 },
      levels: [{ name: 'Basic practice area', cost: 2500 }, { name: 'Half field', cost: 6500 }, { name: 'Full field', cost: 12000 }],
      fx: { tune: [0.08, 0.14, 0.2], test: [8, 12, 16] }, desc: 'Weekly testing hours on a real field, for development testing and driver practice. Driver practice needs this season\'s game elements for full value.' },
    { id: 'ebench', name: 'Electronics Workbench', upkeep: 150, wear: { season: 1.5, off: 0.6, event: 0 },
      levels: [{ name: 'Soldering bench', cost: 900 }, { name: 'Electronics lab', cost: 3500 }, { name: 'PCB fabrication', cost: 9000 }],
      fx: { elec: [0.06, 0.12, 0.18], partWear: [0.1, 0.2, 0.3] }, desc: 'Clean wiring, proper crimps and, at the top level, your own circuit boards: fewer brownouts and comms dropouts in matches, and motors and electronics wear more slowly.' },
    { id: 'weld', name: 'Welding Station', upkeep: 300, wear: { season: 2, off: 0.8, event: 0 },
      levels: [{ name: 'MIG welder and table', cost: 3000 }, { name: 'TIG welding bay', cost: 8500 }],
      fx: { weld: [0.25, 0.4], weldRel: [2, 4] }, desc: 'Welded frames, gussets and repairs: hardening and lightweighting projects take fewer hours and do more, and new builds come out more reliable.' },
    { id: 'meeting', name: 'Team Meeting Room', upkeep: 100, wear: { season: 1, off: 0.4, event: 0 },
      levels: [{ name: 'Meeting corner', cost: 600 }, { name: 'Team classroom', cost: 2500 }, { name: 'Presentation room', cost: 6000 }],
      fx: { outreach: [0.1, 0.18, 0.25], pitch: [6, 10, 14] }, desc: 'A place to plan, rehearse and host visitors: outreach activities count for more, and your Impact Award presenters practice here.' },
    // somewhere to stop for ten minutes: the team can work a little more of the week without wearing out
    { id: 'lounge', name: 'Break Room', upkeep: 150, wear: { season: 1.5, off: 0.6, event: 0 },
      levels: [{ name: 'Break corner (couch and a fridge)', cost: 500 }, { name: 'Break room', cost: 1800 }, { name: 'Student lounge', cost: 4500 }],
      fx: { rest: [0.02, 0.035, 0.05] }, desc: 'Somewhere to eat, sit down and stop for ten minutes: fatigue drops a little every week in season, so the same hours wear the team out less (and auto-filled extra hours can use a little more of the week).' },
    // the wall the banners hang on and the trophy shelf, where every visitor sees them
    { id: 'honors', name: 'Honors Wall', upkeep: 50, wear: { season: 0.5, off: 0.2, event: 0 },
      levels: [{ name: 'Banner wall', cost: 400 }, { name: 'Honors wall + trophy shelf', cost: 2000 }],
      fx: { honors: [1, 2], pride: [2, 4], rep: [2, 4] }, desc: 'Blue banners, trophies and plaques where every visitor sees them (History shows them): the program\'s reputation grows a little every year. The banner wall shows this season\'s and last season\'s; the trophy shelf shows everything.' },
    { id: 'ftc', name: 'FTC Team Space', upkeep: 200, wear: { season: 1.5, off: 0.6, event: 0 },
      levels: [{ name: 'One FTC field', cost: 2500 }, { name: 'Two FTC fields', cost: 5000 }, { name: 'FTC lab with three fields', cost: 8000 }],
      fx: { ftc: [1, 2, 3] }, desc: 'Run your own FTC teams in the building. Each one takes a feeder program slot, costs far less than an outside program and sends you much stronger recruits.' }
  ];
  // ---------- Workshop space ----------
  // Floor space per facility level in square feet: rough real-world footprints including working room. The trailer parks outside.
  // the Workshop's second tab: the facilities that serve the team and the program rather than the robot
  D.EQUIP_TEAM = ['meeting', 'lounge', 'honors', 'ftc', 'trailer'];
  D.EQUIP_SIZE = { printer: [40, 100, 180, 200], cnc: [160, 280], lathe: [150, 240], shelf: [40, 80, 120], laptops: [80, 140, 200, 220], cad: [60, 120, 180], charger: [20, 40], pitcart: [40, 80, 80], trailer: [0],
    pfield: [600, 1200, 2200], ebench: [50, 100, 170], weld: [120, 220], meeting: [250, 450, 700], lounge: [80, 150, 250], honors: [20, 40], ftc: [300, 500, 720] };
  // The biggest room holds every facility at its top level
  D.SPACE_MAX = Math.ceil(D.EQUIP.reduce((s, e) => s + (D.EQUIP_SIZE[e.id] || [0])[(D.EQUIP_SIZE[e.id] || [0]).length - 1], 0) / 100) * 100;
  // The school gives the team more room as Program Support rises. Checked once a year at the season review; room is never taken back.
  D.SPACE_TIERS = [
    { pct: 0.5, sup: 0, title: 'Robotics classroom', name: 'the robotics classroom' },
    { pct: 0.75, sup: 80, title: 'Technology wing', name: 'the technology wing' },
    { pct: 1, sup: 90, title: 'Robotics center', name: 'your own robotics center' }];
  D.SPACE_START = { rookie: 0, established: 1, powerhouse: 1 }; // a rookie starts in the classroom, an existing program in the technology wing
  D.SHELF_START = { rookie: 0, established: 1, powerhouse: 2 }; // Parts Shelf level a program starts with
  // School board gifts at the season review, when Program Support went up: a free full renovation, and after a strong year one upgrade of your choice
  D.BOARD = { reno: 6, grant: 12, grantSup: 60, cap: 12000, cash: 3000 }; // cash: when no upgrade fits, in 2026 dollars (shown in the year's dollars)
  // Your own FTC teams (FTC Team Space): cheap to run, much stronger recruits
  D.FTC_OWN = { cost: 300, power: 1.8, impact: 1.3 };
  // FIRST Tech Challenge games, by the year their season ends (the FTC season runs from a September kickoff to the
  // Championship in April or May). News only: the kickoff, the season, the World Championship, and your own FTC teams.
  // In a random-order career the FTC games are shuffled on their own (news.js ftcGame), never paired with the FRC game.
  // theme: from the 2018–19 season FTC and FRC share a season theme (space, a city, …), so the FTC game is a fair hint.
  D.FTC_GAMES = [
    { y: 2016, name: 'RES-Q', bits: 'debris', desc: 'A rescue mission: robots gather debris (blocks and balls) into bins on the mountain, drive up its ramps, drop rescue climber figures into the shelter and, in the last thirty seconds, hang from the high bar.' },
    { y: 2017, name: 'VELOCITY VORTEX', bits: 'particles', desc: 'Robots shoot wiffle-ball particles into the centre and corner vortexes, press beacon buttons to claim them for their alliance, and finish by lifting a huge cap ball onto the centre vortex.' },
    { y: 2018, name: 'RELIC RECOVERY', bits: 'glyphs', desc: 'Robots stack foam glyphs into cryptoboxes to build ciphers, knock the right jewel off in autonomous, carry relics over the wall into recovery zones, and balance on their balancing stones at the end.' },
    { y: 2019, name: 'ROVER RUCKUS', bits: 'minerals', theme: 'space', desc: 'Robots land from the lander in autonomous and sample the gold mineral, collect gold cubes and silver balls from the crater into the lander\'s cargo hold, and latch back onto the lander to finish.' },
    { y: 2020, name: 'SKYSTONE', bits: 'stones', theme: 'building a city', desc: 'Robots stack studded stones on their foundation, find the Skystones in autonomous, drag the foundation into place, top the tallest tower with a capstone and park under the skybridge.' },
    { y: 2021, name: 'ULTIMATE GOAL', bits: 'rings', desc: 'Robots shoot foam rings into tower goals and at power shot targets, and carry wobble goals over the line at the end.', remote: true },
    { y: 2022, name: 'FREIGHT FRENZY', bits: 'freight', theme: 'moving cargo', desc: 'Robots carry freight (boxes, balls and rubber ducks) from the warehouse to the shipping hubs, spin ducks off the carousel, and cap a hub with their own team shipping element.' },
    { y: 2023, name: 'POWERPLAY', bits: 'cones', theme: 'energy', desc: 'Robots place cones on junctions of four heights to own them; an alliance that links its junctions into a circuit scores a bonus, and a team beacon tops it off in the endgame.' },
    { y: 2024, name: 'CENTERSTAGE', bits: 'pixels', theme: 'the stage and the arts', desc: 'Robots place hexagonal pixels on the backdrop to build mosaics, launch paper-airplane drones in the endgame, and hang from the rigging to finish.' },
    { y: 2025, name: 'INTO THE DEEP', bits: 'samples', theme: 'the ocean', desc: 'Robots pull samples out of the submersible and score them in the high baskets or hang them on its bars as specimens, then climb its rungs at the end.' },
    { y: 2026, name: 'DECODE', bits: 'artifacts', theme: 'history and archaeology', desc: 'Robots collect purple and green artifacts and shoot them into their goal, sorted to match the motif the obelisk shows, and return to base at the end.' }
  ];
  D.FTC_AWARDS = ['Think', 'Connect', 'Innovate', 'Control', 'Design', 'Motivate'];
  // FTC's competition rules that changed, by the year a season ends (checked against FTC event results: through 2023–24
  // best-of-three semifinals and finals with alliances of two or three, two ranking points for a win)
  D.FTC_RULES = [
    { y: 2025, id: 'de', text: 'Playoffs become double elimination: an upper and a lower bracket replace the best-of-three semifinals and finals, so one loss no longer ends an alliance\'s event.' },
    { y: 2026, id: 'ap', text: 'Ranking points work like FRC\'s now: on top of a win, bonus ranking points for scoring achievements, up to six a match (a win used to be worth two). And advancement points decide who moves on: 2 to 16 for the qualification ranking, 40, 20 and 10 for the playoff winners, finalists and third place, plus points for awards.' }
  ];
  // FTC's technology eras, by the year a season ends (they follow the calendar, as FRC's do, whatever the game): what
  // the September kickoff calls new, what your own FTC teams make of it, and the vendor launches that go with them.
  D.FTC_ERAS = [
    { y: 2016, id: 'android', name: 'Android phones', text: 'FTC runs on Android now: one phone rides on the robot as its controller, another is the drivers\' station, and the robot is programmed in Java or in blocks.', ours: 'Our FTC teams spent the first week finding a phone mount that survives a collision.' },
    { y: 2018, id: 'exphub', name: 'the expansion hub', text: 'A new expansion hub is in the kit: motors, servos and sensors on one small board, where a stack of separate modules and a nest of cables used to be.', ours: 'The FTC kids held a small ceremony for the old wiring harness.' },
    { y: 2019, id: 'detect', name: 'object detection', text: 'Machine learning comes to FTC: object detection is built into the software, so an autonomous routine can tell one game piece from another with the phone\'s camera.', ours: 'Our FTC programmers want to know why the FRC team still aims by hand.' },
    { y: 2021, id: 'controlhub', name: 'the control hub', text: 'The control hub arrives: the Android computer is built into the hub itself, so the robot no longer carries a phone.', ours: 'The FTC teams retired their robot phones to the parts drawer, still in their tape.' },
    { y: 2022, id: 'driverhub', name: 'the driver hub', text: 'A purpose-built driver hub replaces the phone in the drivers\' hands: no more matches lost to a phone that took a call or an update.', ours: 'The drivers say the new driver hub "feels like cheating".' },
    { y: 2023, id: 'apriltag', name: 'AprilTags', text: 'AprilTags reach FTC: teams print the black-and-white square tags on their signal sleeves and read them with an outside library, far more reliably than shapes or colours.', ours: 'Our FTC programmers printed their first AprilTag on the shop printer and have been pointing a camera at it ever since.' },
    { y: 2024, id: 'visionportal', name: 'AprilTags on the field', text: 'AprilTags are on the field and built into the FTC software (VisionPortal): a robot can now work out where it is from the tags, the way FRC robots do.', ours: 'Our FTC teams and our FRC programmers are sharing an AprilTag whiteboard now.' },
    { y: 2025, id: 'odometry', name: 'odometry computers and smart cameras', text: 'A wave of ready-made sensors: odometry computers that track the robot\'s position from two small dead wheels, and smart cameras that find tags and game pieces on their own.', ours: 'The FTC teams\' autonomous routines got twice as accurate in a month, and nobody will say which sensor did it.' }
  ];
  // A satisfied sponsor donates equipment (one facility level) if the workshop has the room for it. Each turn every sponsor has
  // chance x (satisfaction - sat) / (100 - sat); at most one donation per season and one per offseason. Tuned by simulation so
  // that a team with every sponsor slot filled that never skips a sponsor activity averages about one donation a year
  // (measured over 60 automated careers: 1.0 a year overall, about 0.45 in the first year while the partnerships are new,
  // 1.0 to 1.4 from the third year; lower for teams whose sponsors expect wins they do not get).
  D.DONATION = { sat: 60, chance: 0.033, cap: { title: 20000, partner: 9000, grant: 9000 },
    types: { tech: ['laptops', 'ebench', 'printer', 'cad'], eng: ['cnc', 'printer', 'ebench', 'cad'], mfg: ['cnc', 'lathe', 'weld', 'shelf'], soft: ['laptops', 'ebench', 'cad'], uni: ['meeting', 'pfield', 'laptops', 'cad'], local: ['pitcart', 'charger', 'meeting', 'lounge', 'shelf', 'honors'], found: ['ftc', 'meeting', 'lounge'] },
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
    { id: 'rs_eff', name: 'End Effector R&D', area: 'effector', cost: 900, hours: 170, xp: 160 },
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
    { id: 'camp', name: 'STEM summer camp', icon: 'team', kind: 'outreach', cost: 300, impact: 14, rep: 4, recruits: 1, req: S => !G.Career.inSeason(S), reqText: 'Offseason only: a summer camp needs the summer.', desc: 'Run a week-long camp for middle schoolers.' },
    { id: 'fll', name: 'Mentor a junior robotics team', icon: 'mentors', kind: 'outreach', cost: 200, impact: 10, rep: 3, recruits: 1, desc: 'Coach a local junior team for a season.' },
    { id: 'openhouse', name: 'Weekend shop open house', icon: 'lathe', kind: 'outreach', cost: 150, impact: 9, rep: 2, recruits: 1, money: [150, 450], req: S => lvl(S, 'lathe') > 0 || lvl(S, 'cnc') > 0, reqText: 'Needs a Manual Machine Shop or CNC Machining', desc: 'Families tour the machine shop; a donation box by the door.' },
    { id: 'workshop', name: 'Machining workshop for local teams', icon: 'cnc', kind: 'outreach', cost: 200, impact: 11, rep: 3, req: S => lvl(S, 'lathe') > 0 || lvl(S, 'cnc') > 0, reqText: 'Needs a Manual Machine Shop or CNC Machining', desc: 'Teach other teams to make their own parts.' },
    { id: 'cadclass', name: 'CAD & coding night', icon: 'laptops', kind: 'outreach', cost: 80, impact: 7, rep: 2, req: S => lvl(S, 'laptops') > 0, reqText: 'Needs a Programming Station', desc: 'Open lab night on the team\'s workstations.' },
    { id: 'printkits', name: '3D-printed kits for schools', icon: 'printer', kind: 'outreach', cost: 150, impact: 8, rep: 2, req: S => lvl(S, 'printer') >= 2, reqText: 'Needs a Prototyping Lab at level 2', desc: 'Print simple robot kits for elementary classrooms.' },
    { id: 'fieldday', name: 'Practice-field scrimmage day', icon: 'pfield', kind: 'outreach', cost: 250, impact: 10, rep: 3, money: [300, 800], robot: true, req: S => lvl(S, 'pfield') >= 2, reqText: 'Needs a half or full practice field', desc: 'Host local teams on your field; small entry fees.' },
    { id: 'roadshow', name: 'Trailer roadshow', icon: 'trailer', kind: 'outreach', cost: 300, impact: 13, rep: 3, robot: true, req: S => lvl(S, 'trailer') > 0, reqText: 'Needs the Team Trailer', desc: 'Take the robot on tour to schools across the region.' },
    { id: 'industry', name: 'Industry night with a mentor', icon: 'mentors', kind: 'outreach', cost: 0, impact: 6, rep: 2, req: S => S.mentors.some(m => m.role === 'biz' || m.role === 'design'), reqText: 'Needs a Business or Design mentor', desc: 'A mentor hosts a careers talk.' },
    { id: 'pizza', name: 'Team pizza & movie night', icon: 'team', kind: 'rest', cost: 150, fatigue: -6, morale: 2, req: S => G.Career.inSeason(S), reqText: 'In season only: in the offseason nobody is tired.', desc: 'No outreach at all, but a tired team gets some rest (fatigue −6 in season).' },
    { id: 'bake', name: 'Bake sale', icon: 'fund', kind: 'fund', cost: 50, money: [300, 600], desc: 'Classic.' },
    { id: 'carwash', name: 'Car wash', icon: 'fund', kind: 'fund', cost: 80, money: [400, 900], desc: 'Weekend car wash.' },
    { id: 'crowd', name: 'Crowdfunding campaign', icon: 'money', kind: 'fund', cost: 0, money: [600, 2000], repScale: true, desc: 'Online campaign. Pays more with a good reputation.' },
    { id: 'grant', name: 'Write a grant application', icon: 'design', kind: 'fund', cost: 0, money: [1500, 4000], grant: true, get desc() { return 'Roughly 35% chance of a ' + G.U.money(1500) + '–' + G.U.money(4000) + ' grant (better with strong outreach).'; } },
    { id: 'showcase', name: 'Sponsor showcase night', icon: 'sponsor', kind: 'fund', cost: 200, money: [600, 1600], sponsorSat: 4, req: S => S.sponsors.length >= 2, reqText: 'Needs two or more sponsors', desc: 'Show sponsors the robot; satisfaction +4 for every sponsor.' },
    { id: 'gala', name: 'Alumni fundraising dinner', icon: 'trophy', kind: 'fund', cost: 400, money: [1500, 3800], req: S => S.history.length > 0 || S.profile !== 'rookie', reqText: 'Rookie teams have no alumni yet: after your first season', desc: 'Former members and parents, one big night.' },
    { id: 'parts', name: 'Sell old parts and stock', icon: 'parts', kind: 'fund', cost: 0, money: [300, 900], req: S => lvl(S, 'lathe') > 0, reqText: 'Needs a Manual Machine Shop', desc: 'Machine and sell spare stock to rookie teams.' }
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
  D.SPEC_FOR = { design: ['shooter', 'turret', 'elevator', 'arm', 'effector', 'intake', 'index', 'climb', 'swerve'], fab: ['swerve', 'elevator', 'arm', 'effector', 'climb', 'elec', 'intake'], prog: ['vision', 'autoPath', 'turret', 'swerve', 'elec'] };
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

  // ---------- Woodie Flowers Award ----------
  // A mentor's profession: [title, area of profession, where they work: a sponsor type, 'school' or 'uni']
  D.PROFESSIONS = {
    design: [['Mechanical engineer', 'mechanical engineering', 'eng'], ['Aerospace engineer', 'aerospace engineering', 'eng'], ['Product designer', 'industrial design', 'mfg'], ['Engineering professor', 'engineering education', 'uni']],
    fab: [['Machinist', 'precision machining', 'mfg'], ['Manufacturing engineer', 'manufacturing', 'mfg'], ['Welder and fabricator', 'metal fabrication', 'mfg'], ['Technology teacher', 'technical education', 'school']],
    prog: [['Software engineer', 'software engineering', 'soft'], ['Controls engineer', 'control systems', 'tech'], ['Computer science teacher', 'computer science education', 'school'], ['Robotics engineer', 'robotics', 'tech']],
    strat: [['Data scientist', 'data science', 'tech'], ['Mathematics teacher', 'mathematics education', 'school'], ['Systems engineer', 'systems engineering', 'eng'], ['Operations analyst', 'operations research', 'eng']],
    coach: [['Physics teacher', 'physics education', 'school'], ['Electrical engineer', 'electrical engineering', 'eng'], ['Engineering teacher', 'engineering education', 'school'], ['Flight test engineer', 'flight testing', 'eng']],
    biz: [['Marketing director', 'marketing', 'local'], ['Small-business owner', 'small business', 'local'], ['Nonprofit director', 'nonprofit leadership', 'found'], ['Science teacher', 'science education', 'school']]
  };
  // The real rules (2016 Admin Manual, section 6.8): every season the students may nominate one mentor in an essay. A
  // regional team's nominee is judged at one regional it attends and a district team's at its District Championship
  // (district events give none); each regional names one Woodie Flowers Finalist, each District Championship one (from
  // 2022 two or three at the bigger districts). A mentor who has received the Finalist award cannot receive it again.
  // At the Championship there are no Finalists: one Woodie Flowers Award goes to one mentor among the season's Finalists
  // and past Finalists their teams re-nominate with a new essay, and nobody receives it twice. It is presented on Einstein.
  // The game's essay: w weights what goes into it (skill, seasons with the team, years in FIRST, students reached, the
  // two best student writers, the hours put into the essay) and teacher adds for a mentor who teaches for a living.
  // nom: share of teams at an event that send an essay; ai: mean and spread of their essays; noise: the judges' day;
  // renom: share of past Finalists re-nominated in a season; past: past Finalists in the world when a career begins.
  D.WFA = { hours: 30, cost: 0, q0: 0.55, w: { skill: 0.30, ten: 0.15, exp: 0.10, reach: 0.10, writing: 0.20, essay: 0.15 }, teacher: 4,
    nom: 0.45, ai: [52, 12], noise: 4, wfaNoise: 5, renom: 0.5, past: 150, pastMax: 400, rep: { wffa: 5, wfa: 15 }, legacy: { wffa: 40, wfa: 200 } };
  // Real Woodie Flowers Award winners (FRC Events award pages; FIRST's own posts for 1996, 1997, 2020 and 2021)
  D.REAL_WFA = {
    1996: { name: 'Woodie Flowers', note: 'MIT professor of mechanical engineering who taught the design course 2.70 and brought the words Gracious Professionalism to FIRST. The award founded that year by Dr. William Murphy carries his name, and he was its first recipient.' },
    1997: { name: 'Liz Calef', note: 'The first mentor to receive it after Woodie Flowers himself.' },
    2016: { name: 'Eric Stokely', team: 360, tname: 'The Revolution' },
    2017: { name: 'Glenn Lee', team: 359, tname: 'Hawaiian Kids', note: 'Of Waialua High & Intermediate School in Hawaii. Presented on Einstein in Houston: one award for both Championships.' },
    2018: { name: 'Gail Drake', team: 1885, tname: 'ILITE Robotics', note: 'One award for both Championships, listed at Houston and at Detroit.' },
    2019: { name: 'Allen Gregory IV', team: 3847, tname: 'Spectrum' },
    2020: { name: 'Lucien Junkin', team: 118, tname: 'Robonauts', note: 'A NASA chief engineer and head coach of the Robonauts, whose students come from seven high schools in Texas. He was a Finalist in 2005; fifteen years later his students re-nominated him, and he was chosen from more than 200 Finalists in the season whose Championship was cancelled.' },
    2021: { name: 'Matt Fagen', team: 4253, tname: 'Raid Zero', note: 'Of Taipei, in the season played from home.' },
    2022: { name: 'Christine Sapio', team: 2486, tname: 'CocoNuts' },
    2023: { name: 'Mark Buckner', team: 4265, tname: 'Secret City Wildbots', note: 'An Oak Ridge National Laboratory mentor in Oak Ridge, Tennessee.' },
    2024: { name: 'Norman Morgan', team: 2468, tname: 'Team Appreciate', note: 'Of Austin, Texas.' },
    2025: { name: 'Francisco Guerra', team: 4635, tname: 'PrepaTec - Botbusters' },
    2026: { name: 'Debbie English', team: 4499, tname: 'The Highlanders' }
  };

  // ---------- Team numbers by year ----------
  // The first number given to each season's rookies, from FRC Events (Team 5800 is a 2016 rookie, 6300 a 2017 one, and
  // so on; rounded to 50). A career's teams at the start are numbered below the start year's first rookie, and every
  // season's rookies take that season's block. The 2021 rookies, who never played a 2021 season, join the 2022 class.
  D.NUM_FROM = { 2015: 5350, 2016: 5750, 2017: 6250, 2018: 6750, 2019: 7300, 2020: 8000, 2021: 8450, 2022: 8650, 2023: 8900, 2024: 9350, 2025: 9800, 2026: 10800, 2027: 11400 };
  D.numTop = cy => (D.NUM_FROM[cy] ? D.NUM_FROM[cy] - 1 : 10999);                 // established teams: 1 to this
  D.numBlock = cy => (D.NUM_FROM[cy] && D.NUM_FROM[cy + 1] ? [D.NUM_FROM[cy === 2022 ? 2021 : cy], D.NUM_FROM[cy + 1] - 1] : [1, 11999]);
  // older programs are a little stronger: the oldest 18% of the numbers (below 2000 of 11,000 before numbers followed the year)
  D.OLD_NUM = 2000 / 10999;

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
  // Know-how at Level TECH_DEEP_LVL or above is tuned to the old way: it loses TECH_DEEP × as much and always drops a level.
  D.TECH_RULE_PCT = 0.25; D.TECH_DESIGN_PCT = 0.15; D.TECH_CAP = 1.25; D.TECH_RULES_N = 2; D.TECH_DESIGNS_N = 3;
  D.TECH_DEEP = 1.5; D.TECH_DEEP_LVL = 4;
  D.KB_UPKEEP_HOURS = 25; // the Knowledge Base's yearly update (the first build takes 60 hours)
  // (3.1.3) The code library: the team's drive, auto and vision code in one place, ported every offseason to next season's
  // control system release (its beta is out in the autumn). Built once (hours), then a yearly port (upkeep), offseason only;
  // both scale with the Programming Station and the programming mentor. Ported for the season: the robot code starts +stat
  // on each stat, and the first code upgrade, the first auto routine and the first vision level take `first` fewer hours.
  D.CODELIB = { hours: 80, upkeep: 40, stat: 3, first: 0.4 };
  // hardening tops out near reliability 96 (it still clears hidden faults and restores condition): from HARD_MAX it shows as
  // maxed; lightweighting stops at 40% of the concept's weight
  D.HARD_MAX = 95;
  // In-season program projects (once a season, no project slot): pit crew training makes repairs between matches at events
  // faster (×fast, plus up to polish with extra hours); bumper standards rules out the bumper incident at events
  D.PIT_TRAIN = { hours: 40, cost: 120, fast: 1.3, polish: 0.15 };
  D.BUMPER_STD = { hours: 30, cost: 280 };
  // Elite teams (world simulation, 3.1): the programs at the very top of the sport, close to maxed out in robot, drive team
  // and strategy. They are placed where the real ones are, by the cities teams come from (G.Geo.HUBS): a zone is a
  // district's cities (even before the district forms) or an area's cities outside its districts. California has the most.
  // They last: strength drifts a point or two a year (b), a few fade (fade, never the dynasties), and an established team
  // (minAge seasons in the world, strength promoteAt or more) can rise to fill its zone. Every area keeps at least one.
  D.ELITE_ZONES = [
    { z: 'sierra', n: 5, name: 'California' }, { z: 'lakeshore', n: 3, name: 'Michigan' }, { z: 'mesa', n: 2, name: 'Texas' },
    { z: 'harbor', n: 2, name: 'New England' }, { z: 'evergreen', n: 2, name: 'the Pacific Northwest' }, { z: 'Canada', n: 2, name: 'Canada' },
    { z: 'Midwest', n: 2, name: 'the Midwest' }, { z: 'Northeast', n: 2, name: 'the Northeast' }, { z: 'Southeast', n: 2, name: 'the Southeast' },
    { z: 'Southwest', n: 1, name: 'the Southwest' }, { z: 'West', n: 1, name: 'the Mountain West' }
  ];
  D.ELITE = { b: [92, 97], fresh: [90, 93], lo: 89, hi: 98, fade: 0.03, dyn: 0.45, minAge: 5, promoteAt: 82, q: [0.95, 0.99], bonus: 6, drv: [93, 98], div: 1, ein: 2 }; // off: tests only (no elite teams)
  // by difficulty: how many (n: share of each zone's count, at least one per area always; plus: extra places in the
  // biggest zones), how good, how many your Championship division is sure to have (div) and how many lead each of the
  // other alliances on Einstein (ein). 3.1.5: normal and hard got a few more elite teams (normal had 24 with the
  // defaults, now 28; hard 38 → 44), stronger: drv is the driver's (and composure's) range, hp the human player's, and rel
  // the reliability their robots run at (extremely high; without it, the robot's quality decides as for everyone else)
  D.ELITE_DIFF = {
    easy: { n: 0.5, b: [89, 93], fresh: [88, 91], q: [0.9, 0.95], bonus: 0, drv: [88, 93], div: 0, ein: 1 },
    normal: { plus: { sierra: 1, lakeshore: 1, mesa: 1, harbor: 1 }, b: [93, 97], fresh: [91, 94], q: [0.96, 0.99], bonus: 7, drv: [95, 99], hp: [94, 98], rel: 97 },
    hard: { n: 1.5, plus: { sierra: 1, lakeshore: 1, mesa: 1, harbor: 1, evergreen: 1, Canada: 1 }, b: [94, 98], fresh: [92, 95], q: [0.975, 0.995], bonus: 10, drv: [97, 99], hp: [96, 99], rel: 98, div: 2, ein: 2 }
  };
  D.REF_AI = { anyFloor: 0.2, bpShare: 0.35, bpBoost: 0.04 }; // AI teams copy too: the weakest that would fall below the floor build the Anybot (quality raised to it); a share of the lower middle build the Blueprint (its concepts, +0.04 quality)
  D.REF_STEP = 0.25; // a copied published design starts as a version 2: its stats this share of the way from a first build to the ceiling
  D.REF_FIT0 = 0.3; // copying part of a published design: the drivers' familiarity and the reliability bonus scale from this share (one subsystem of many) up to the whole (every subsystem in it)
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
    { id: 'gamepiece', area: 'effector', tag: 'Robot rules', title: 'Game pieces may not be grabbed from inside', body: 'A new rule bans holding a game piece by anything that reaches inside it or pins it against the frame, and caps how far a piece may stick out beyond the bumpers. Claws and grippers that were tuned to last season\'s grip are back on the drawing board.',
      talk: [['Our gripper was legal for three seasons. It is now a paperweight with rollers.', 'a design mentor'], ['Rule Q: "may not grab it like that". We grabbed it exactly like that.', 'a student on Team {t}']] },
    { id: 'height', area: 'climb', tag: 'Robot rules', title: 'New height and extension limits', body: 'A lower height limit, and no reaching above the robot before the endgame. Tall telescoping climbers need a rethink, and so do the hooks that go with them.',
      talk: [['Our climber is now four inches too proud of itself.', 'a mentor on Team {t}'], ['Measure twice, read the rule three times, cut once.', 'a fabrication mentor']] }
  ];
  D.TECH_DESIGNS = [
    { id: 'pivot', area: 'arm', title: 'A new pivot design', body: 'A top team posted the CAD of a pivot driven through a dead-axle chain stage, with the encoder on the output shaft: half the backlash and a third of the parts. Every arm built the old way suddenly looks a season old.' },
    { id: 'gripper', area: 'effector', title: 'A new roller end effector', body: 'An offseason robot showed a printed roller end effector with compliant wheels on a spring-loaded side plate: it takes a game piece from any angle, centres it and lets go in a tenth of a second. Pinch claws looked old by the next morning.' },
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
  D.DRIVE_FAMILY = Object.assign(D.DRIVE_FAMILY || {}, { kit: 'tank', wcd: 'tank', mec: 'holonomic', swerve: 'holonomic' }); // seasons-classic.js (loaded first) adds the 2016 drives

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
  // contract terms by slot (3.1.5): len, the seasons an offer runs; renew, the seasons a renewal adds; keep, the share of
  // satisfaction that is the renewal chance. Titles and grants sign for two to four seasons; partners prefer shorter deals
  // (one to three), renew a season at a time and a little less readily, so they change more often.
  D.SPONSOR_TERMS = { title: { len: [2, 4], renew: [2, 3], keep: 1 }, partner: { len: [1, 3], renew: [1, 1], keep: 0.85 }, grant: { len: [2, 4], renew: [2, 3], keep: 1 } };
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
    win: { text: 'Win a regional', bonus: 6000 },
    champs: { text: 'Qualify for Championship', bonus: 5000 }, // easier than a win: an event win qualifies, and so do awards and wildcards
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
    powerhouse: { name: 'Powerhouse', money: 90000, students: 40, mentors: [[3, 4], [3, 4], [3, 4], [3, 4], [3, 3], [3, 3], [3, 3]], know: 2, equip: ['printer', 'cnc', 'field', 'pfield', 'cad', 'honors'], parts: {}, rep: 85, support: 72, school: 22000,
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
