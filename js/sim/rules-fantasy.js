'use strict';
/* FRC Manager — season rules for the fantasy games (seasons-fantasy.js). Field coordinates are authored for BLUE (its
   wall at x = 0) in metres, like every other game. */
(function () {
  const U = G.U, E = G.Engine, FW = E.FW, FH = E.FH, H = E.H, Rules = G.Rules, S = G.Seasons, RR = E.RR;
  const CX = FW / 2, CY = FH / 2, opp = E.opp;
  const loc = (m, r) => E.P(m, r.a, r.x, r.y);
  const isAuto = m => m.phase === 'auto';
  // an alliance puts its two best human players where the game pieces are handled: their average is its human-player skill
  const setHp = m => { m.hp = {}; ['red', 'blue'].forEach(a => { const h = m.robots.filter(r => r.a === a).map(r => r.drv.hp || 40).sort((p, q) => q - p); m.hp[a] = Math.max(40, Math.round(((h[0] || 40) + (h[1] == null ? h[0] || 40 : h[1])) / 2)); }); };
  const hpK = (m, a) => ((m.hp && m.hp[a]) || 50) / 100;
  // the event: 0 a regional or district event, 1 a District Championship, 2 the Championship (some bonus thresholds rise)
  const lvlOf = m => (m.level === 'cmp' ? 2 : m.level === 'dcmp' ? 1 : 0);
  const mates = (m, a) => m.robots.filter(r => r.a === a);

  // ---------- loose game pieces on the carpet ----------
  // m.loose = [{ x, y, t, c }]: t = in play from that moment, c = a colour or kind in the games that have one
  function drop(m, x, y, o) {
    const q = H.clearOf(m, { x: U.clamp(x, 0.4, FW - 0.4), y: U.clamp(y, 0.4, FH - 0.4) }, false, false, null);
    const p = Object.assign({ x: q.x, y: q.y, t: m.t }, o || {}); m.loose.push(p); return p;
  }
  function nearLoose(m, r, ok, maxD) {
    let best = null, bd = maxD || 1e9;
    for (const p of m.loose) {
      if (p.t > m.t || (p.claim && p.claim !== r.team && p.claimT > m.t) || (ok && !ok(p))) continue;
      const d = E.dist(r, p); if (d < bd) { bd = d; best = p; }
    }
    return best;
  }
  // drive to a loose piece and take it: then(p) once it is on board
  function grab(m, r, p, base, label, then, toLabel) {
    p.claim = r.team; p.claimT = m.t + 6;
    H.moveTo(m, r, { x: p.x, y: p.y }, () => {
      if (!H.canCollect(m, r) || !m.loose.includes(p)) return;
      H.act(r, H.collectTime(m, r, 'ground', base) / (r.cap.wide || 1), () => { const i = m.loose.indexOf(p); if (i < 0) return; m.loose.splice(i, 1); then(p); }, label);
    }, toLabel || 'To a game piece');
  }
  // an endgame with room for n robots: the alliance's n best climbers go up, the rest park
  const bestClimbers = (m, a, n) => m.robots.filter(x => x.a === a && !x.dead && !x.perm.endgame && (x.cap.endLevel || 0) > 0)
    .sort((p, q) => (q.cap.endLevel || 0) - (p.cap.endLevel || 0) || (q.cap.endgame || 0) - (p.cap.endgame || 0) || p.slot - q.slot).slice(0, n);
  // an autonomous routine that is not working: creep over the line once, then stop
  const struggle = (m, r, x) => { if (!r.left && !r.mem.tx) { r.mem.tx = 1; H.moveTo(m, r, E.P(m, r.a, x, loc(m, r).y), null, 'Auto (struggling)'); } else r.label = 'Auto stalled'; };
  const leave = (m, r, x) => { if (!r.left) H.moveTo(m, r, E.P(m, r.a, x, loc(m, r).y), null, 'Leave'); else r.label = 'Auto done'; };
  // points for the endgame level each robot reached, added to its own tally too
  const endPts = (m, a, table, park) => {
    let sum = 0;
    mates(m, a).forEach(r => { if (!r.end || r.dead) return; const p = r.end.lvl > 0 ? table[r.end.lvl - 1] : (r.end.park && !r.end.drop ? park || 0 : 0); if (p) { sum += p; r.stats.pts += p; } });
    return sum;
  };
  const hangs = (m, a) => mates(m, a).filter(r => r.end && r.end.lvl > 0 && !r.dead).length;

  // =====================================================================
  // FULL TILT (2101)
  // The field is a pinball table, turned copies of each other for the two alliances. An alliance shoots at the TARGET
  // BANK on the far end wall: five drop targets (4 points, 8 in auto). All five down = a BANK (+10): the targets stand
  // up again after 3 s, the JACKPOT ring above them lights for 15 s (10 a ball lit or in auto, 5 otherwise), and the
  // first three banks each release six pinballs from the alliance's Multiball Rack. The DRAIN under the bank scores 1
  // (2 in auto), and so does a ball through a target that is already down.
  // Pinballs: 12 staged in mid-field, 12 with each alliance's human players, three preloads a robot. A scored ball goes
  // to the human players at that end, which is the OTHER alliance's Plunger: it fires them one at a time down that
  // alliance's Shooter Lane (protected).
  // Endgame: two FLIPPERS per alliance in front of its own wall (12 each, +8 for both), park under them 3.
  // =====================================================================
  const T01 = { line: 3.05, tdy: 0.56, laneW: 1.22, laneY: FH - 0.61, plunger: { x: 0.45, y: FH - 0.61 }, rack: { x: 0.6, y: 0.75 },
    flip: [{ x: 2.35, y: CY - 1.75 }, { x: 2.35, y: CY + 1.75 }], bump: [[CX, CY], [CX - 1.85, CY - 1.65], [CX + 1.85, CY + 1.65]], rp: [4, 5, 6] };
  Rules.T01 = T01;
  const REB01 = 0.55; // a rebound net takes this share of its own misses straight back
  const bank01 = (m, a) => E.P(m, a, FW, CY);                         // an alliance's own bank, on the far wall
  const tgt01 = (m, a, i) => E.P(m, a, FW - 0.05, CY + (i - 2) * T01.tdy);
  const standing01 = ss => (ss.resetAt ? [] : [0, 1, 2, 3, 4].filter(i => !ss.down[i]));
  const lit01 = (m, a) => m.ss[a].jackUntil > m.t;
  const cap01 = r => Math.max(1, r.cap.storage || 1);
  const back01 = (m, a, n) => { m.ss[opp(a)].hp += n; };              // scored: to the other alliance's Plunger
  function miss01(m, r) {
    if (r.cap.rebound && r.held < cap01(r) && m.rng.chance(REB01)) { r.held++; return; }
    const p = E.P(m, r.a, FW - m.rng.range(0.9, 3.6), CY + m.rng.range(-2.7, 2.7));
    drop(m, p.x, p.y, { t: m.t + 0.8 });
  }
  function bankDone01(m, r) {
    const a = r.a, ss = m.ss[a];
    ss.banks++; ss.resetAt = m.t + 3; ss.jackUntil = m.t + 18; // lit for 15 s once the targets are back up
    H.addPts(m, r, 10, 'BANK +10', bank01(m, a));
    H.log(m, a, a.toUpperCase() + ' completes bank ' + ss.banks + (ss.banks <= 3 && ss.rack >= 6 ? ': MULTIBALL' : ''), 'rp');
    if (ss.banks <= 3 && ss.rack >= 6) ss.multiAt = m.t + 2.6 - 2.0 * hpK(m, a); // the human player has to see it and pull the release
  }
  function volley01(m, r) {
    const a = r.a, ss = m.ss[a], c = r.cap;
    if (r.held <= 0 || !H.canScore(m, r) || H.endDue(m, r)) return;
    const st = standing01(ss), lit = lit01(m, a), canJ = !!c.jackpot, bank = bank01(m, a), au = isAuto(m);
    const pen = H.rangePen(m, r, bank), pT = H.hit(m, r, 0.82, pen), pJ = canJ ? H.hit(m, r, 0.52 + (c.turret ? 0.05 : 0), pen) : 0;
    let jack = false;
    if (canJ) {
      // a standing target is worth its points and its share of the bank
      const jv = (au || lit ? 10 : 5) * pJ, tv = st.length ? (au ? 10 : 6) * pT : 0, want = r.plan.target;
      jack = !st.length ? true : want === 'bank' ? false : want === 'jackpot' ? lit || jv > tv : lit && jv > tv * 1.05;
    }
    // the bank is standing back up: wait for it
    if (!st.length && !jack) return H.waitUntil(r, () => !m.ss[a].resetAt, () => volley01(m, r), 'Waiting for the bank', 3.5);
    // targets are claimed for a moment, so partners do not spend their pinballs on the same one
    const free = st.filter(i => !(ss.claim[i] && ss.claim[i].team !== r.team && ss.claim[i].until > m.t)), pool = free.length ? free : st;
    const near = i => Math.abs(i - (r.mem.lastT == null ? 2 : r.mem.lastT));
    const picks = jack ? [] : pool.slice().sort((p, q) => near(p) - near(q)).slice(0, c.twin && r.held >= 2 ? 2 : 1);
    picks.forEach(i => { ss.claim[i] = { team: r.team, until: m.t + 2 }; });
    const k = jack ? 1 : picks.length;
    // a fixed or hooded shooter turns the whole robot to each new target; a turret does not
    const turn = c.turret ? 0.1 : jack ? 0.25 : picks[0] === r.mem.lastT ? 0.1 : 0.75 - 0.45 * (c.agility || 30) / 100;
    if (!c.turret) H.face(r, jack ? bank : tgt01(m, a, picks[0]));
    r.mem.aim01 = jack ? bank : tgt01(m, a, picks[0]);
    H.act(r, H.scoreTime(m, r, 0.5) + turn, () => {
      const s2 = m.ss[a]; let pts = 0;
      r.held -= k; r.stats.shots += k;
      (jack ? [-1] : picks).forEach(i => {
        if (i < 0) {
          const hit = m.rng.chance(pJ); H.shotFx(m, r, bank, hit);
          if (hit) { pts += isAuto(m) || lit01(m, a) ? 10 : 5; s2.jack++; r.stats.hits++; back01(m, a, 1); } else miss01(m, r);
          return;
        }
        const hit = m.rng.chance(pT); H.shotFx(m, r, tgt01(m, a, i), hit);
        if (hit && !s2.down[i] && !s2.resetAt) {
          s2.down[i] = 1; s2.targets++; if (isAuto(m)) s2.autoT++; r.stats.hits++; pts += isAuto(m) ? 8 : 4; back01(m, a, 1); r.mem.lastT = i;
        } else if (hit || (s2.down.some(d => d) && m.rng.chance(0.3))) {
          pts += isAuto(m) ? 2 : 1; s2.drain++; back01(m, a, 1); if (hit) r.stats.hits++; // through a target that is already down: a drain
        } else miss01(m, r);
      });
      if (pts) H.addPts(m, r, pts, '+' + pts, bank);
      if (!s2.resetAt && s2.down.every(d => d)) bankDone01(m, r);
      if (r.held > 0) volley01(m, r); else r.stats.cycles++;
    }, jack ? 'Shooting the Jackpot' : 'Shooting targets');
  }
  function shoot01(m, r) {
    const a = r.a, bank = bank01(m, a);
    if (r.cap.drainOnly || r.plan.target === 'drain') {
      return H.moveTo(m, r, E.P(m, a, FW - 0.5 - RR, CY + (r.slot - 1) * 1.0), () => {
        if (!H.canScore(m, r)) return;
        const n = r.held;
        H.act(r, 0.4 + n * H.scoreTime(m, r, 0.4), () => {
          const pts = n * (isAuto(m) ? 2 : 1); m.ss[a].drain += n; back01(m, a, n);
          r.stats.shots += n; r.stats.hits += n; r.held = 0; r.stats.cycles++; H.addPts(m, r, pts, 'DRAIN +' + pts, bank);
        }, 'Feeding the drain');
      }, 'To the drain');
    }
    H.moveTo(m, r, H.clearOf(m, H.shootSpot(m, r, bank, null), false, false, r), () => { if (H.canScore(m, r)) H.act(r, H.aimTime(m, r), () => volley01(m, r), 'Aiming'); }, 'To shoot');
  }
  function laneLoad01(m, r) {
    const ss = m.ss[r.a];
    if (!H.canCollect(m, r) || r.held >= cap01(r) || H.endDue(m, r)) return;
    if (ss.lane <= 0) { if (ss.hp > 0) H.waitUntil(r, () => m.ss[r.a].lane > 0, () => laneLoad01(m, r), 'Waiting for the Plunger', 4); return; }
    H.act(r, H.collectTime(m, r, 'station', 0.8), () => {
      if (ss.lane <= 0) return;
      ss.lane--; r.held++; r.heldType = 'pinball';
      if (r.held < cap01(r) && (ss.lane > 0 || ss.hp > 0)) laneLoad01(m, r);
    }, 'Catching pinballs');
  }
  function collect01(m, r) {
    const a = r.a, ss = m.ss[a], c = r.cap, need = cap01(r) - r.held, opts = [];
    if (need <= 0 || !H.canCollect(m, r)) return false;
    if (c.ground) { const p = nearLoose(m, r); if (p) opts.push({ k: 'g', p, t: H.travelEst(m, r, p) + 1.3 }); }
    if (ss.lane > 0 || ss.hp > 0) {
      const lp = E.P(m, a, 2.0 + r.slot * 1.5, T01.laneY), n = Math.min(need, Math.max(1, ss.lane));
      opts.push({ k: 'l', p: lp, t: (H.travelEst(m, r, lp) + (ss.lane > 0 ? 0 : 1.5) + n * 1.0) / n });
    }
    if (!opts.length) return false;
    const best = opts.sort((p, q) => p.t - q.t)[0];
    if (best.k === 'g') grab(m, r, best.p, 1.0, 'Intaking a pinball', () => { r.held++; r.heldType = 'pinball'; }, 'To a pinball');
    else H.moveTo(m, r, best.p, () => laneLoad01(m, r), 'To the Shooter Lane');
    return true;
  }
  Rules[2101] = {
    leavePts: 3, tempo: { c: 2.9, s: 2.6 },
    endgame: { levels: [{ name: 'Flipper', pts: 12, time: 5.5, risk: 0.06, drop: 0.12 }], park: 3 },
    leftCheck: (m, r) => loc(m, r).x > T01.line + 0.35,
    aimAt: (m, r) => (r.held > 0 ? r.mem.aim01 || bank01(m, r.a) : null),
    // two flippers: the alliance's two best climbers hang, the third robot parks under them
    endLevel(m, r) { return bestClimbers(m, r.a, 2).includes(r) ? 1 : 0; },
    init(m) {
      setHp(m);
      m.loose = [];
      m.obs = T01.bump.map(b => ({ x: b[0], y: b[1], r: 0.62, h: 0.46 }));
      // the flippers are solid bars at bumper height: only their own alliance's climbers go under them
      ['red', 'blue'].forEach(a => T01.flip.forEach((f, i) => [-0.36, 0.36].forEach(k => { const p = E.P(m, a, f.x + k, f.y + k * (i ? -1 : 1)); m.obs.push({ x: p.x, y: p.y, r: 0.5, h: 0.24, end: true, a }); })));
      ['red', 'blue'].forEach(a => {
        m.ss[a] = { down: [0, 0, 0, 0, 0], claim: {}, banks: 0, targets: 0, autoT: 0, drain: 0, jack: 0, resetAt: 0, jackUntil: 0, multiAt: 0, hp: 12, lane: 0, plT: 0, rack: 18, runs: 0, skill: false };
        [[5.7, 1.0], [6.0, 3.7], [5.7, 6.2], [7.4, 2.0], [7.4, 5.2], [7.9, 7.3]].forEach(q => { const p = E.P(m, a, q[0], q[1]); drop(m, p.x, p.y); });
      });
      m.robots.forEach(r => { r.held = Math.min(3, cap01(r)); r.heldType = 'pinball'; });
    },
    start(m, r) { return E.P(m, r.a, 1.0, [1.5, CY, FH - 2.3][r.slot]); },
    guard(m, a) { return E.P(m, a, FW - 3.0, CY); },
    protect(m, r) {
      const q = loc(m, r);
      if (q.y > FH - T01.laneW - 0.1 && q.x < CX) return 'Shooter Lane';
      if (m.total - m.t <= 30 && T01.flip.some(f => Math.hypot(q.x - f.x, q.y - f.y) < 0.95)) return 'Flipper';
      return '';
    },
    onTeleop(m) {
      ['red', 'blue'].forEach(a => {
        const ss = m.ss[a]; ss.runs = mates(m, a).filter(r => r.left).length; ss.skill = ss.runs >= 3 && ss.autoT >= 5;
        if (ss.skill) H.log(m, a, 'SKILL SHOT: five targets down in auto', 'rp');
      });
    },
    tick(m) {
      ['red', 'blue'].forEach(a => {
        const ss = m.ss[a];
        if (ss.resetAt && m.t >= ss.resetAt) { ss.resetAt = 0; ss.down = [0, 0, 0, 0, 0]; }
        if (ss.multiAt && m.t >= ss.multiAt) {
          ss.multiAt = 0; ss.rack -= 6;
          for (let i = 0; i < 6; i++) { const p = E.P(m, a, m.rng.range(1.3, 4.6), m.rng.range(0.6, 2.9)); drop(m, p.x, p.y, { t: m.t + m.rng.range(0.4, 1.6) }); }
        }
        // the Plunger: one pinball at a time down the Shooter Lane, as fast as the human player can load it
        if (m.phase === 'tele' && ss.hp > 0 && ss.lane < 5 && m.t >= ss.plT) { ss.hp--; ss.lane++; ss.plT = m.t + 3.4 - 1.8 * hpK(m, a); }
      });
    },
    autoDecide(m, r) {
      const tier = r.cap.autoTier || 0, max = m.S.autoPieces[tier], left = m.T.auto - m.t;
      if (!r.autoOK) return struggle(m, r, T01.line + 0.9);
      if (tier >= 1 && H.canScore(m, r)) {
        if (r.held > 0 && left > 2.5 && r.stats.shots < max) return shoot01(m, r);
        if (r.held === 0 && r.stats.shots < max && left > 6 && r.cap.ground && H.canCollect(m, r)) {
          const p = nearLoose(m, r, null, 7);
          if (p) return grab(m, r, p, 1.0, 'Auto: intaking', () => { r.held++; r.heldType = 'pinball'; }, 'Auto: to a pinball');
        }
      }
      leave(m, r, T01.line + 0.9);
    },
    decide(m, r) {
      const capN = cap01(r), canS = H.canScore(m, r), canC = H.canCollect(m, r);
      if (r.held >= capN && canS) return shoot01(m, r);
      if (r.held > 0 && canS) {
        // part-loaded: top up only when another pinball is close by, or it is standing in the lane with balls waiting
        const q = loc(m, r), near = r.cap.ground && canC ? nearLoose(m, r, null, 2.6) : null;
        if (!near && !(q.y > FH - T01.laneW - 0.4 && q.x < CX && m.ss[r.a].lane > 0)) return shoot01(m, r);
      }
      if (canC && collect01(m, r)) return;
      if (r.held > 0 && canS) return shoot01(m, r);
      r.label = r.jam.intake > m.t ? 'Intake jammed' : 'Waiting for pinballs';
    },
    endSpot(m, r, lvl) {
      if (!lvl) return E.P(m, r.a, 1.25, CY + (r.slot - 1) * 0.9);
      const i = Math.max(0, bestClimbers(m, r.a, 2).indexOf(r)), f = T01.flip[i % 2];
      return E.P(m, r.a, f.x, f.y);
    },
    finishEnd(m) {
      ['red', 'blue'].forEach(a => {
        const ss = m.ss[a], n = hangs(m, a);
        ss.hangs = n; m.score[a].end += endPts(m, a, [12], 3) + (n >= 2 ? 8 : 0);
      });
    },
    bonus(m, a) {
      const ss = m.ss[a], thr = T01.rp[lvlOf(m)], n = m.done ? ss.hangs || 0 : hangs(m, a);
      return [
        { key: 'skill', name: 'Skill Shot', val: Math.min(5, ss.autoT), thr: 5, ok: !!ss.skill, unit: 'targets' },
        { key: 'multi', name: 'Multiball', val: ss.banks, thr, ok: ss.banks >= thr, unit: 'banks' },
        { key: 'wizard', name: 'Wizard Mode', val: n, thr: 2, ok: n >= 2, unit: 'flippers' }
      ];
    },
    hud(m, a) {
      const ss = m.ss[a], out = ['BANK ' + (ss.resetAt ? 'RESET' : ss.down.filter(d => d).length + '/5'), 'BANKS ' + ss.banks];
      if (lit01(m, a)) out.push('JACKPOT LIT');
      out.push('LANE ' + ss.lane);
      return out;
    }
  };
  Rules[2101].defense = { eff: 1.7, foul: 0.9, range: 1.7, zone: 0.35, pin: 3, reset: 3, protMajor: true, credit: { Flipper: 1 } };
  Rules[2101].faults = { brown: 1.3, tip: 0.8, tipAll: 0.1, comms: 1.1 };
  S[2101].meta = { defense: true, note: 'Defense wins in FULL TILT: every shot is taken in front of the other alliance\'s wall, so a defender waiting at home can shove a fixed shooter off each target in turn. Turrets shrug it off, and the Shooter Lane is the one safe place to load.',
    faults: 'Common failures: brownouts from big flywheels, pinballs jammed in the indexer, and robots sliding down a flipper they had only half hooked.' };
  S[2101].tiebreak = 'Flipper';

  // =====================================================================
  // MAINLINE (2102)
  // A rail runs along one guardrail (the field is mirrored, so both alliances see it on the same side). The ENGINE on
  // it starts at the Junction (m.eng = 0) and is counted in steps of 6 in: + toward red's terminus (blue is pushing),
  // - toward blue's. A drum through an alliance's low door is one step its way, through the high door two, doubled in
  // auto; 14 steps (7 ft) is a DELIVERY (20 points) and the Engine runs back to the Junction. At the final buzzer the
  // Engine standing on the other alliance's side is worth 5, or 10 from half way to their terminus.
  // BRAKE PAD: while a robot stands on its alliance's pad the Engine moves only half as far toward that alliance's
  // terminus (the other alliance's drums still score). The pad is not protected: a defender with the stronger drivetrain shoves the
  // robot off, and defenders go for a braking robot first.
  // Drums: 12 on the centre line, 15 with each alliance's human players, a preload each. The CRANK HOUSES in the far
  // corners deliver them by hand crank, two ready at a chute at most; a scored drum goes to the other alliance's cranks.
  // Endgame: the Signal Gantry at each end: low bar 8, high bar 15, park 3.
  // =====================================================================
  const T02 = { line: 3.05, house: { x: 0.35, y: CY }, apronX: 1.85, apronH: 1.25, pad: { x: CX - 1.5, y: 1.6 }, yards: [{ x: FW - 0.95, y: 1.62 }, { x: FW - 0.95, y: FH - 0.95 }],
    gantry: { x: 2.9, y0: FH - 3.3, y1: FH - 0.45 }, term: 14, span: 2.13, rpD: [2, 2, 3], rpL: [30, 34, 40] };
  Rules.T02 = T02;
  const ROLL02 = 0.6; // a roll-through magazine loads at the chute in this share of the time
  const dir02 = a => (a === 'blue' ? 1 : -1);
  const pad02 = (m, a) => E.P(m, a, T02.pad.x, T02.pad.y);
  const onPad02 = (m, r) => !r.dead && r.mem.brake && r.st !== 'move' && E.dist(r, pad02(m, r.a)) < 0.5;
  const braked02 = (m, a) => m.robots.some(r => r.a === a && onPad02(m, r));
  const cap02 = r => Math.max(1, r.cap.storage || 1);
  function push02(m, r, steps) {
    const a = r.a, ss = m.ss[a], d = dir02(a);
    const k = braked02(m, opp(a)) ? 0.5 : 1; // their brake is on: the drums score, the Engine moves half as far
    if (k < 1) ss.blocked += steps * 0.5;
    m.eng += d * steps * k * (isAuto(m) ? 2 : 1);
    if (m.eng * d >= T02.term) {
      m.eng = 0; ss.deliv++;
      H.addPts(m, r, 20, 'DELIVERY +20', { x: CX + d * T02.span, y: 0.9 });
      H.log(m, a, 'DELIVERY: the Engine reaches the ' + opp(a) + ' terminus (' + ss.deliv + ')', 'rp');
    }
  }
  function place02(m, r) {
    const a = r.a, c = r.cap, ss = m.ss[a], house = E.P(m, a, T02.house.x, T02.house.y);
    const high = (c.reach || 1) >= 2 && r.plan.target !== 'low';
    let spot;
    if (c.lob && high) spot = H.shootSpot(m, r, house, null);
    else { const l = [-0.55, 0.55].map(dy => E.P(m, a, 0.62 + RR, CY + dy)).map(p => ({ p, u: H.spotUse(m, r, p) })).sort((p, q) => p.u - q.u || E.dist(r, p.p) - E.dist(r, q.p)); spot = l[0].p; }
    H.moveTo(m, r, spot, () => {
      if (!H.canScore(m, r)) return;
      const n = r.held, per = high ? (c.lob ? 0.7 : c.stream ? 0.75 : 1.15) : 0.6;
      H.act(r, 0.3 + (c.tipAll && high ? H.scoreTime(m, r, 1.3) : n * H.scoreTime(m, r, per)), () => {
        const p = high ? H.hit(m, r, c.lob ? 0.9 : 1.08, c.lob ? H.rangePen(m, r, house) : 0) : 0.99;
        let made = 0;
        for (let i = 0; i < n; i++) { r.stats.shots++; if (m.rng.chance(p)) made++; else { const q = E.P(m, a, m.rng.range(0.9, 2.2), CY + m.rng.range(-1.6, 1.6)); drop(m, q.x, q.y, { t: m.t + 0.6 }); } }
        if (c.lob && high) H.shotFx(m, r, house, made > 0);
        r.held = 0; r.heldType = null; r.stats.cycles++;
        if (!made) return;
        r.stats.hits += made; ss.drums += made; if (high) ss.high += made; else ss.low += made;
        m.ss[opp(a)].hp += made;
        const pts = made * (high ? 4 : 2) * (isAuto(m) ? 2 : 1);
        H.addPts(m, r, pts, '+' + pts, house);
        push02(m, r, made * (high ? 2 : 1));
      }, high ? 'Loading the high door' : 'Loading the low door');
    }, 'To the Freight House');
  }
  function yardLoad02(m, r, i) {
    const ss = m.ss[r.a];
    if (!H.canCollect(m, r) || r.held >= cap02(r) || H.endDue(m, r)) return;
    if (ss.q[i] <= 0) { if (ss.hp > 0) H.waitUntil(r, () => m.ss[r.a].q[i] > 0, () => yardLoad02(m, r, i), 'Waiting for the crank', 5); return; }
    H.act(r, H.collectTime(m, r, 'station', 1.0) * (r.cap.rollIn ? ROLL02 : 1), () => {
      if (ss.q[i] <= 0) return;
      ss.q[i]--; r.held++; r.heldType = 'drum';
      if (r.held < cap02(r) && (ss.q[i] > 0 || ss.hp > 0)) yardLoad02(m, r, i);
    }, 'Loading at the Crank House');
  }
  function collect02(m, r) {
    const a = r.a, ss = m.ss[a], need = cap02(r) - r.held, opts = [];
    if (need <= 0 || !H.canCollect(m, r)) return false;
    if (r.cap.ground) { const p = nearLoose(m, r); if (p) opts.push({ k: 'g', p, t: H.travelEst(m, r, p) + 1.6 }); }
    T02.yards.forEach((y, i) => {
      if (ss.q[i] <= 0 && ss.hp <= 0) return;
      const p = E.P(m, a, y.x - 0.35, y.y), n = Math.min(need, Math.max(1, ss.q[i]));
      opts.push({ k: 'y', i, p, t: (H.travelEst(m, r, p) + (ss.q[i] > 0 ? 0 : 2.5) + n * 1.2 + (H.spotUse(m, r, p) ? 2.5 : 0)) / n });
    });
    if (!opts.length) return false;
    const best = opts.sort((p, q) => p.t - q.t)[0];
    if (best.k === 'g') grab(m, r, best.p, 1.3 * (r.cap.rollIn ? 0.8 : 1), 'Picking up a drum', () => { r.held++; r.heldType = 'drum'; }, 'To a drum');
    else H.moveTo(m, r, best.p, () => yardLoad02(m, r, best.i), 'To the Yard');
    return true;
  }
  // the alliance's weakest scorer takes the pad when the Engine is well on its way to their terminus, and stays until it
  // is back near the Junction or the gantry calls. A coach's "Hold the brake" stands all match.
  function wantBrake02(m, r) {
    const a = r.a, ss = m.ss[a], danger = -m.eng * dir02(a), tl = m.total - m.t;
    if (r.plan.target === 'brake') return tl > m.T.end + 4;
    if (ss.braker != null && ss.braker !== r.team) return false;
    if (ss.braker === r.team) { if (danger > 0.3 * T02.term && tl > m.T.end + 6) return true; ss.braker = null; return false; }
    if (danger < 0.6 * T02.term || tl < m.T.end + 14) return false;
    const pw = x => (x.cap.scoreSpd + x.cap.accuracy + x.cap.intake + x.cap.speed) * ((x.cap.reach || 1) >= 2 ? 1.3 : 1);
    const cand = mates(m, a).filter(x => !x.dead && !x.endBusy && !x.mem.broken).sort((p, q) => pw(p) - pw(q))[0];
    if (cand !== r) return false;
    ss.braker = r.team; H.log(m, a, r.team + ' goes to hold the brake', 'call');
    return true;
  }
  function brake02(m, r) {
    r.mem.brake = true;
    H.moveTo(m, r, pad02(m, r.a), () => H.waitUntil(r, () => !wantBrake02(m, r), () => { r.mem.brake = false; }, 'Holding the brake', 25), 'To the Brake Pad');
  }
  Rules[2102] = {
    leavePts: 3, tempo: { c: 2.4, s: 2.0 },
    endgame: { levels: [{ name: 'Low bar', pts: 8, time: 4.5, risk: 0.03 }, { name: 'High bar', pts: 15, time: 7.5, risk: 0.1, drop: 0.25 }], park: 3 },
    leftCheck: (m, r) => loc(m, r).x > T02.line + 0.35,
    aimAt: (m, r) => (r.cap.lob && r.held > 0 ? E.P(m, r.a, T02.house.x, T02.house.y) : null),
    init(m) {
      setHp(m);
      m.loose = []; m.obs = []; m.eng = 0;
      for (let i = 0; i < 12; i++) drop(m, CX, 0.9 + i * (FH - 1.8) / 11);
      ['red', 'blue'].forEach(a => { m.ss[a] = { drums: 0, high: 0, low: 0, deliv: 0, blocked: 0, hp: 13, q: [1, 1], cT: [0, 0], braker: null, autoLead: false }; });
      m.robots.forEach(r => { r.held = 1; r.heldType = 'drum'; });
    },
    start(m, r) { return E.P(m, r.a, 2.3, [1.6, CY - 2.1, CY + 2.1][r.slot]); },
    guard(m, a) { return E.P(m, a, 2.7, CY); },
    // defenders go for a robot that is holding the brake against them
    defTarget(m, r) { return m.robots.find(x => x.a !== r.a && onPad02(m, x)) || null; },
    protect(m, r) {
      const q = loc(m, r);
      if (T02.yards.some(y => Math.hypot(q.x - y.x, q.y - y.y) < 1.7)) return 'Yard';
      if (q.x < T02.apronX + 0.2 && Math.abs(q.y - CY) < T02.apronH + 0.2) return 'Apron';
      if (m.total - m.t <= 30 && Math.abs(q.x - T02.gantry.x) < 0.9 && q.y > T02.gantry.y0 - 0.5) return 'Signal Gantry';
      return '';
    },
    onTeleop(m) {
      ['red', 'blue'].forEach(a => { if (m.eng * dir02(a) > 0) { m.ss[a].autoLead = true; m.score[a].auto += 10; H.log(m, a, 'The Engine is on the ' + opp(a) + ' side when auto ends: +10', 'rp'); } });
    },
    tick(m) {
      ['red', 'blue'].forEach(a => {
        const ss = m.ss[a], gap = 4.4 - 2.4 * hpK(m, a);
        [0, 1].forEach(i => { if (ss.hp > 0 && ss.q[i] < 2 && m.t >= ss.cT[i]) { ss.hp--; ss.q[i]++; ss.cT[i] = m.t + gap; } });
      });
      // a robot on its Brake Pad with a stronger defender against it gets shoved off now and then, and has to come back
      for (const r of m.robots) {
        if (!onPad02(m, r) || !r.defBy) continue;
        const d = r.defBy, k = U.clamp((d.cap.push - 0.75 * r.cap.push) / 40, 0.08, 1);
        if (m.rng.next() < 0.3 * k * E.DT) {
          const p = pad02(m, r.a), dx = r.x - d.x, dy = r.y - d.y, dl = Math.hypot(dx, dy) || 1;
          r.x = U.clamp(p.x + dx / dl * 1.2, 0.5, FW - 0.5); r.y = U.clamp(p.y + dy / dl * 1.2, 0.5, FH - 0.5);
          r.st = 'idle'; r.onWait = null; r.waitFn = null; r.mem.brake = false;
          H.log(m, d.a, d.team + ' shoves ' + r.team + ' off the Brake Pad', 'ai');
        }
      }
    },
    autoDecide(m, r) {
      const tier = r.cap.autoTier || 0, max = m.S.autoPieces[tier], left = m.T.auto - m.t;
      if (r.mem.got == null) r.mem.got = 0;
      if (!r.autoOK) return struggle(m, r, T02.line + 0.9);
      if (tier >= 1 && r.mem.got < max && H.canScore(m, r)) {
        if (r.held > 0 && left > 3) { r.mem.got += r.held; return place02(m, r); }
        if (r.held === 0 && left > 8 && r.cap.ground && H.canCollect(m, r)) {
          const p = nearLoose(m, r, null, 9);
          if (p) return grab(m, r, p, 1.3, 'Auto: picking up a drum', () => { r.held++; r.heldType = 'drum'; }, 'Auto: to a drum');
        }
      }
      leave(m, r, T02.line + 0.9);
    },
    decide(m, r) {
      const capN = cap02(r), canS = H.canScore(m, r), canC = H.canCollect(m, r);
      if (r.held === 0 && wantBrake02(m, r)) return brake02(m, r);
      r.mem.brake = false;
      if (r.held >= capN && canS) return place02(m, r);
      if (r.held > 0 && canS && !(canC && r.cap.ground && nearLoose(m, r, null, 2.4))) {
        // part-loaded and nothing close by: go on to the Freight House unless it is standing in the Yard with drums coming
        const q = loc(m, r), inYard = T02.yards.some((y, i) => Math.hypot(q.x - y.x, q.y - y.y) < 1.5 && (m.ss[r.a].q[i] > 0 || m.ss[r.a].hp > 0));
        if (!inYard || !canC) return place02(m, r);
      }
      if (canC && collect02(m, r)) return;
      if (r.held > 0 && canS) return place02(m, r);
      r.label = r.jam.intake > m.t ? 'Intake jammed' : 'Waiting for drums';
    },
    endSpot(m, r, lvl) { return lvl ? E.P(m, r.a, T02.gantry.x, T02.gantry.y1 - 0.5 - r.slot * 0.95) : E.P(m, r.a, T02.gantry.x - 0.9, T02.gantry.y1 - 0.5 - r.slot * 0.95); },
    finishEnd(m) {
      ['red', 'blue'].forEach(a => {
        const ss = m.ss[a], e = endPts(m, a, [8, 15], 3), ep = m.eng * dir02(a), side = ep >= T02.term / 2 ? 10 : ep > 0 ? 5 : 0; // the Engine on their side at the buzzer
        ss.endPts = e; ss.side = side; m.score[a].end += e; m.score[a].tele += side;
      });
    },
    bonus(m, a) {
      const ss = m.ss[a], L = lvlOf(m);
      const e = m.done ? ss.endPts || 0 : mates(m, a).reduce((s, r) => s + (r.end && !r.dead ? (r.end.lvl > 0 ? [8, 15][r.end.lvl - 1] : r.end.park ? 3 : 0) : 0), 0);
      return [
        { key: 'express', name: 'Express', val: ss.deliv, thr: T02.rpD[L], ok: ss.deliv >= T02.rpD[L], unit: 'deliveries' },
        { key: 'load', name: 'Full Load', val: ss.drums, thr: T02.rpL[L], ok: ss.drums >= T02.rpL[L], unit: 'drums' },
        { key: 'aboard', name: 'All Aboard', val: e, thr: 30, ok: e >= 30, unit: 'gantry pts' }
      ];
    },
    hud(m, a) {
      const ss = m.ss[a], e = Math.round(m.eng * dir02(a)), out = ['ENGINE ' + (e > 0 ? '+' : '') + e + '/' + T02.term, 'DELIVERIES ' + ss.deliv, 'DRUMS ' + ss.drums];
      if (braked02(m, a)) out.push('BRAKE ON');
      return out;
    }
  };
  Rules[2102].defense = { eff: 1.5, foul: 1.0, range: 1.7, zone: 0.4, pin: 3, reset: 3, protMajor: true, credit: { 'Signal Gantry': 2 } };
  Rules[2102].faults = { brown: 1.0, tip: 1.7, tipAll: 0.25, comms: 1.0, tipDrv: true };
  S[2102].meta = { defense: true, note: 'MAINLINE is a tug of war: only the difference in drums moves the Engine, so slowing the other alliance is worth as much as scoring. One robot in their mid-field lanes, or parked on your own Brake Pad when the Engine is close, decides more matches than a third scorer.',
    faults: 'Common failures: tip-overs with the lift up at the high door, drums jammed across the magazine, and falls from the high bar.' };
  S[2102].tiebreak = 'Signal Gantry';

  // =====================================================================
  // STATION KEEPING (2103)
  // The STATION stands at the centre of the field: locked in auto, one turn every 40 s in teleop (clockwise on screen).
  // Its four faces each have a High Port over a Low Airlock; faces 1 and 3 are blue's, 0 and 2 red's, so in auto each
  // alliance has one port turned toward its own half. A disc scores for the port it enters: high 4 (8 in auto), low 2 (4).
  // A shooter must be inside its launcher's cone about the port's axis, and loses accuracy toward the edge of it: a
  // fixed shooter sits square on the axis and has to move as the port sweeps on; a turret tracks from well off it; a
  // shoot-on-the-move turret orbits with the port and never stops. Low-airlock feeders drive round with the station.
  // Discs: 16 on the carpet, 13 at each alliance's Depots (the corners of its own wall), three preloads a robot; scored
  // discs come back down to the scorers' Depots. Launch Pads (two per alliance) are protected.
  // Endgame: each alliance's two docking arms turn with the station; a docked robot rides round with it (15, +10 for
  // both; parked in the Orbit Lane 3). Human players throw four Supply Drop discs at the roof hatch (6 each).
  // =====================================================================
  const T03 = { line: 2.75, rad: 0.76, arm: 1.95, lane: [1.07, 2.29], pads: [{ x: CX - 4.0, y: CY - 1.6 }, { x: CX - 4.0, y: CY + 1.6 }], depots: [{ x: 0.75, y: 0.9 }, { x: 0.75, y: FH - 0.9 }], w: 2 * Math.PI / 40, rp: [40, 50, 60] };
  Rules.T03 = T03;
  const ST03 = { x: CX, y: CY };
  const ang03 = (m, k, dt) => Math.PI / 4 + T03.w * Math.max(0, m.t + (dt || 0) - m.T.auto) + k * Math.PI / 2; // the way face k points
  const own03 = a => (a === 'blue' ? [1, 3] : [0, 2]);
  const adiff = (p, q) => { let d = (p - q) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d); };
  const off03 = (m, r, k) => adiff(Math.atan2(r.y - CY, r.x - CX), ang03(m, k, 0));
  const cap03 = r => Math.max(1, r.cap.storage || 1);
  const low03 = r => !!r.cap.lowOnly || r.plan.target === 'low';
  Rules.ang03 = ang03;
  // where a robot stands on face k's axis, r metres out, kept inside the field
  function axis03(m, k, rad, dt) {
    const f = ang03(m, k, dt), cx = Math.cos(f), sy = Math.sin(f);
    const lim = Math.min(Math.abs(cx) > 1e-3 ? (cx > 0 ? FW - 0.7 - CX : CX - 0.7) / Math.abs(cx) : 99, Math.abs(sy) > 1e-3 ? (sy > 0 ? FH - 0.7 - CY : CY - 0.7) / Math.abs(sy) : 99);
    const d = Math.min(rad, lim);
    return { x: CX + cx * d, y: CY + sy * d };
  }
  function volley03(m, r, k) {
    const a = r.a, c = r.cap, ss = m.ss[a], low = low03(r), cone = low ? 0.45 : c.cone || 0.5;
    if (r.held <= 0 || !H.canScore(m, r) || H.endDue(m, r)) return;
    if (!c.onMove && off03(m, r, k) > cone) { // the port has swept on: move with it (a moment's pause if it keeps happening)
      r.mem.chase = (r.mem.chase || 0) + 1;
      if (r.mem.chase > 3) { r.mem.chase = 0; return H.waitUntil(r, () => false, () => shoot03(m, r), 'Waiting for its port', 1.2); }
      return shoot03(m, r);
    }
    H.act(r, H.scoreTime(m, r, 0.55) * (c.onMove ? 0.85 : 1), () => {
      const off = c.onMove ? 0 : off03(m, r, k), port = { x: CX + Math.cos(ang03(m, k, 0)) * T03.rad, y: CY + Math.sin(ang03(m, k, 0)) * T03.rad };
      const edge = off > cone ? 0.25 : 1 - 0.45 * (off / cone) * (off / cone);
      const p = low ? 0.97 * (off > cone ? 0.3 : 1) : H.hit(m, r, 0.92, H.rangePen(m, r, ST03)) * edge;
      r.held--; r.stats.shots++; r.mem.chase = 0;
      const hit = m.rng.chance(p); if (!low) H.shotFx(m, r, port, hit);
      if (hit) {
        const pts = (low ? 2 : 4) * (isAuto(m) ? 2 : 1);
        r.stats.hits++; ss.discs++; ss.hp++; if (low) ss.low++; else { ss.high++; if (isAuto(m)) ss.autoHigh++; }
        H.addPts(m, r, pts, '+' + pts, port);
      } else { const g = ang03(m, k, 0) + m.rng.range(-1.1, 1.1), d = m.rng.range(1.5, 3.4); drop(m, CX + Math.cos(g) * d, CY + Math.sin(g) * d, { t: m.t + 0.7 }); }
      if (r.held > 0) volley03(m, r, k); else r.stats.cycles++;
    }, low ? 'Feeding the airlock' : 'Shooting at its port');
  }
  function shoot03(m, r) {
    const a = r.a, c = r.cap, low = low03(r), cone = low ? 0.45 : c.cone || 0.5;
    const rad = low ? T03.rad + RR + 0.14 : Math.max(c.rmin || 1.6, (c.rangeM || 2) * 0.9), dr = E.dist(r, ST03);
    // a turret that is already inside its cone and its range shoots from where it stands
    if (!low && c.turret && dr >= (c.rmin || 1.6) && dr <= (c.rangeM || 2)) {
      const k = own03(a).find(x => off03(m, r, x) < cone * 0.7);
      if (k != null) { r.mem.port = k; return H.act(r, c.onMove ? 0.15 : H.aimTime(m, r), () => volley03(m, r, k), 'Aiming'); }
    }
    let best = null, bd = 1e9;
    own03(a).forEach(k => {
      // where the axis will be when the robot gets there, a little ahead so that the port sweeps through its cone while it shoots
      let sp = null, tau = 0;
      for (let it = 0; it < 2; it++) { sp = axis03(m, k, rad, tau + (m.phase === 'auto' ? 0 : 0.9)); tau = E.dist(r, sp) / H.speedOf(m, r) + 0.6; }
      const d = E.dist(r, sp); if (d < bd) { bd = d; best = { k, sp }; }
    });
    r.mem.port = best.k;
    H.moveTo(m, r, H.clearOf(m, best.sp, false, false, r), () => { if (H.canScore(m, r)) H.act(r, c.onMove ? 0.15 : H.aimTime(m, r) * (low ? 0.5 : 1), () => volley03(m, r, best.k), 'Aiming'); }, low ? 'To its airlock' : 'To its port');
  }
  function depotLoad03(m, r) {
    const ss = m.ss[r.a];
    if (!H.canCollect(m, r) || r.held >= cap03(r) || ss.hp <= 0 || H.endDue(m, r)) return;
    H.act(r, H.collectTime(m, r, 'station', 0.8) * (r.cap.touchGo ? 0.6 : 1), () => { if (ss.hp <= 0) return; ss.hp--; r.held++; r.heldType = 'disc'; depotLoad03(m, r); }, 'Loading at the Depot');
  }
  function collect03(m, r) {
    const a = r.a, ss = m.ss[a], need = cap03(r) - r.held, opts = [];
    if (need <= 0 || !H.canCollect(m, r)) return false;
    if (r.cap.ground) { const p = nearLoose(m, r); if (p) opts.push({ k: 'g', p, t: H.travelEst(m, r, p) + 1.3 }); }
    if (ss.hp > 0) T03.depots.forEach(d => { const p = E.P(m, a, d.x, d.y), n = Math.min(need, ss.hp); opts.push({ k: 'd', p, t: (H.travelEst(m, r, p) + n * 1.0 + (H.spotUse(m, r, p) ? 2 : 0)) / n }); });
    if (!opts.length) return false;
    const best = opts.sort((p, q) => p.t - q.t)[0];
    if (best.k === 'g') grab(m, r, best.p, 1.0 * (r.cap.touchGo ? 0.7 : 1), 'Picking up a disc', () => { r.held++; r.heldType = 'disc'; }, 'To a disc');
    else H.moveTo(m, r, best.p, () => depotLoad03(m, r), 'To the Depot');
    return true;
  }
  // the tip of docking arm k, where a docked robot hangs
  const tip03 = (m, k, dt) => ({ x: CX + Math.cos(ang03(m, k, dt)) * T03.arm, y: CY + Math.sin(ang03(m, k, dt)) * T03.arm });
  const armOf03 = (m, r) => own03(r.a)[Math.max(0, bestClimbers(m, r.a, 2).indexOf(r)) % 2];
  Rules[2103] = {
    leavePts: 3, tempo: { c: 2.6, s: 2.3 },
    endgame: { levels: [{ name: 'Docked', pts: 15, time: 6, risk: 0.1, drop: 0.12 }], park: 3 },
    leftCheck: (m, r) => loc(m, r).x > T03.line + 0.35,
    aimAt: (m, r) => (r.held > 0 && r.mem.port != null ? { x: CX + Math.cos(ang03(m, r.mem.port, 0)) * T03.rad, y: CY + Math.sin(ang03(m, r.mem.port, 0)) * T03.rad } : null),
    endLevel(m, r) { return bestClimbers(m, r.a, 2).includes(r) ? 1 : 0; },
    init(m) {
      setHp(m);
      m.loose = []; m.obs = [{ x: CX, y: CY, r: 1.0, h: T03.rad }];
      ['red', 'blue'].forEach(a => {
        m.ss[a] = { discs: 0, high: 0, low: 0, autoHigh: 0, hp: 13, drops: 4, dropT: 0, dropPts: 0, docked: 0 };
        [[4.4, 1.2], [4.4, CY], [4.4, FH - 1.2], [6.2, 0.9], [6.2, FH - 0.9], [5.6, 2.6], [5.6, FH - 2.6], [7.3, 1.9]].forEach(q => { const p = E.P(m, a, q[0], q[1]); drop(m, p.x, p.y); });
      });
      m.robots.forEach(r => { r.held = Math.min(3, cap03(r)); r.heldType = 'disc'; });
    },
    start(m, r) { return E.P(m, r.a, 1.9, [1.7, CY, FH - 1.7][r.slot]); },
    guard(m, a) { return E.P(m, a, CX - 2.6, CY); },
    protect(m, r) {
      const q = loc(m, r);
      if (T03.pads.some(p => Math.abs(q.x - p.x) < 0.61 + 0.2 && Math.abs(q.y - p.y) < 0.61 + 0.2)) return 'Launch Pad';
      if (m.total - m.t <= 30 && r.endBusy && r.endLvl > 0 && E.dist(r, ST03) < T03.arm + 1.0) return 'Docking Arm';
      return '';
    },
    tick(m) {
      // robots on their way to a docking arm chase it; docking and docked robots ride round with it
      for (const r of m.robots) {
        if (r.dead || !r.endBusy || !(r.endLvl > 0)) continue;
        const t = tip03(m, armOf03(m, r), 0);
        if (r.climbing || (r.end && r.end.lvl > 0)) { r.x = t.x; r.y = t.y; r.hd = Math.atan2(CY - t.y, CX - t.x); }
        else if (r.st === 'move' && r.goal && m.inEnd) { const g = tip03(m, armOf03(m, r), 0.6); r.goal.x = g.x; r.goal.y = g.y; }
      }
      if (!m.inEnd) return;
      ['red', 'blue'].forEach(a => {
        const ss = m.ss[a];
        if (ss.drops <= 0 || m.t < ss.dropT) return;
        ss.drops--; ss.dropT = m.t + 6;
        const hit = m.rng.chance(0.04 + 0.3 * hpK(m, a));
        if (!m.headless) { const w = E.P(m, a, 0.2, CY); m.fx.push({ k: 'shot', x0: w.x, y0: w.y, x1: CX, y1: CY, t: m.t, hit, a }); }
        if (hit) { ss.dropPts += 6; m.score[a].tele += 6; H.log(m, a, a.toUpperCase() + ' Supply Drop lands in the hatch: +6', 'end'); if (!m.headless) m.fx.push({ k: 'pop', x: CX, y: CY, text: 'SUPPLY DROP +6', t: m.t, a }); }
      });
    },
    autoDecide(m, r) {
      const tier = r.cap.autoTier || 0, max = m.S.autoPieces[tier], left = m.T.auto - m.t;
      if (!r.autoOK) return struggle(m, r, T03.line + 0.9);
      if (tier >= 1 && H.canScore(m, r)) {
        if (r.held > 0 && left > 2.5 && r.stats.shots < max) return shoot03(m, r);
        if (r.held === 0 && r.stats.shots < max && left > 6 && r.cap.ground && H.canCollect(m, r)) {
          const p = nearLoose(m, r, null, 6);
          if (p) return grab(m, r, p, 1.0, 'Auto: picking up a disc', () => { r.held++; r.heldType = 'disc'; }, 'Auto: to a disc');
        }
      }
      leave(m, r, T03.line + 0.9);
    },
    decide(m, r) {
      const capN = cap03(r), canS = H.canScore(m, r), canC = H.canCollect(m, r);
      if (r.held >= capN && canS) return shoot03(m, r);
      if (r.held > 0 && canS && !(canC && r.cap.ground && nearLoose(m, r, null, 2.4))) {
        const q = loc(m, r);
        if (!(canC && q.x < 1.8 && m.ss[r.a].hp > 0)) return shoot03(m, r);
      }
      if (canC && collect03(m, r)) return;
      if (r.held > 0 && canS) return shoot03(m, r);
      r.label = r.jam.intake > m.t ? 'Intake jammed' : 'Waiting for discs';
    },
    endSpot(m, r, lvl) {
      if (!lvl) { const g = Math.atan2(r.y - CY, r.x - CX) + (r.slot - 1) * 0.5; return H.clearOf(m, { x: CX + Math.cos(g) * 1.75, y: CY + Math.sin(g) * 1.75 }, true, false, r); }
      return tip03(m, armOf03(m, r), E.dist(r, ST03) / 3 + 1);
    },
    finishEnd(m) {
      ['red', 'blue'].forEach(a => { const ss = m.ss[a], n = hangs(m, a); ss.docked = n; m.score[a].end += endPts(m, a, [15], 3) + (n >= 2 ? 10 : 0); });
    },
    bonus(m, a) {
      const ss = m.ss[a], thr = T03.rp[lvlOf(m)], n = m.done ? ss.docked : hangs(m, a);
      return [
        { key: 'window', name: 'Launch Window', val: ss.autoHigh, thr: 6, ok: ss.autoHigh >= 6, unit: 'discs' },
        { key: 'resupply', name: 'Resupply', val: ss.discs, thr, ok: ss.discs >= thr, unit: 'discs' },
        { key: 'crew', name: 'Crew Complete', val: n, thr: 2, ok: n >= 2, unit: 'arms' }
      ];
    },
    hud(m, a) { const ss = m.ss[a]; return ['DISCS ' + ss.discs, 'HIGH ' + ss.high + ' · LOW ' + ss.low, 'DEPOT ' + ss.hp].concat(m.inEnd && ss.drops ? ['SUPPLY DROPS ' + ss.drops] : []); }
  };
  Rules[2103].defense = { eff: 1.9, foul: 0.9, range: 1.7, zone: 0.45, pin: 3, reset: 3, protMajor: true, credit: { 'Docking Arm': 1 } };
  Rules[2103].faults = { brown: 1.2, tip: 0.9, tipAll: 0.1, comms: 1.15 };
  S[2103].meta = { defense: true, note: 'Defense wins in STATION KEEPING: all six robots work round one station, and a shooter that has to sit on its port\'s axis is easy to shove off it. A defender in the Orbit Lane costs a fixed shooter most of its shots and a tracking turret hardly any.',
    faults: 'Common failures: comms drops from the scrum round the station, brownouts from flywheels and drive motors running together, and robots that latch on to a docking arm and are dragged off it again.' };
  S[2103].tiebreak = 'docking';

  // =====================================================================
  // HIGH RISE (2104)
  // Each alliance builds a TOWER in front of its own wall: three bays by four floors, two girders to a bay
  // (m.ss[a].grid[floor][bay] = 0, 1 or 2). A girder scores 2, 3, 5 or 7 by floor (auto 4, 6, 8, 10). A floor is
  // TOPPED OUT (+6) when its three bays are full
  // (rungs: floor 1 topped out opens rung 1, floor 2 rung 2, and the whole tower rung 3)
  // and every floor below it is topped out; the number of floors topped out opens the rungs: floor 2 opens rung 1 (6),
  // floor 3 rung 2 (12), floor 4 rung 3 (20). Parked in the Site 3.
  // Girders are scarce: 10 on the carpet at mid-field, 22 at each alliance's Supply Yard racks (far corners, two ready
  // at a rack), one preload a robot. They stay where they are laid. Once the tower is full, a girder on the Site's
  // STOCKPILE scores 1.
  // FOOTBRIDGE: a neutral frame at the centre of the field with two cradles per alliance (3 points a girder). When
  // both alliances have laid both of theirs, Topping Out needs three floors instead of four.
  // The Site is closed to opponents; a robot touched there while climbing is credited with the rung.
  // =====================================================================
  const T04 = { line: 3.05, tx: 1.32, bayDy: 1.02, siteX: 2.75, siteH: 2.35, racks: [{ x: FW - 0.8, y: 1.0 }, { x: FW - 0.8, y: FH - 1.0 }],
    pts: [2, 3, 5, 7], apts: [4, 6, 8, 10], rung: [6, 12, 20], sky: [24, 30, 36], floor: [[CX - 1.7, 0.9], [CX - 1.7, 2.3], [CX - 1.7, CY], [CX - 1.7, FH - 2.3], [CX - 1.7, FH - 0.9]] };
  Rules.T04 = T04;
  const floors04 = ss => { let n = 0; while (n < 4 && ss.grid[n].every(b => b >= 2)) n++; return n; };
  Rules.floors04 = floors04;
  const full04 = ss => ss.grid.every(f => f.every(b => b >= 2));
  const cap04 = r => Math.max(1, r.cap.storage || 1);
  const free04 = (m, r, f) => [0, 1, 2].filter(b => { const ss = m.ss[r.a], c = ss.claim[f * 3 + b]; return ss.grid[f][b] < 2 && !(c && c.team !== r.team && c.until > m.t); });
  // which slot next: floor by floor from the bottom, but a taller lift leaves the low floors to partners that can only
  // reach those (until the last 45 seconds, when everybody closes the lowest gaps)
  function slot04(m, r) {
    const reach = r.cap.reach || 1, fl = [0, 1, 2, 3].filter(f => f < reach && free04(m, r, f).length);
    if (!fl.length) return null;
    let f = fl[0];
    if (r.plan.target === 'high' && !isAuto(m)) f = fl[fl.length - 1];
    else if (!isAuto(m) && m.total - m.t > 45) {
      const ms = mates(m, r.a).filter(x => x !== r && !x.dead && !x.mem.broken && !x.perm.scorer);
      const g = fl.find(k => !ms.some(x => (x.cap.reach || 1) > k && (x.cap.reach || 1) < reach)); if (g != null) f = g;
    }
    const q = loc(m, r), bs = free04(m, r, f).sort((p, s) => Math.abs(CY + (p - 1) * T04.bayDy - q.y) - Math.abs(CY + (s - 1) * T04.bayDy - q.y));
    return { f, b: bs[0] };
  }
  function topCheck04(m, r) {
    const ss = m.ss[r.a], n = floors04(ss);
    while (ss.topped < n) {
      ss.topped++;
      H.addPts(m, r, 6, 'FLOOR ' + ss.topped + ' TOPPED OUT +6', E.P(m, r.a, T04.tx, CY));
      H.log(m, r.a, r.a.toUpperCase() + ' tops out floor ' + ss.topped + (ss.topped !== 3 ? ': rung ' + Math.min(3, ss.topped) + ' is open' : ''), 'rp');
    }
  }
  function place04(m, r) {
    const a = r.a, ss = m.ss[a], c = r.cap, sl = slot04(m, r);
    if (!sl) return false;
    ss.claim[sl.f * 3 + sl.b] = { team: r.team, until: m.t + 9 };
    H.moveTo(m, r, E.P(m, a, T04.tx + 0.36 + RR, CY + (sl.b - 1) * T04.bayDy), () => {
      if (!H.canScore(m, r)) return;
      const n = Math.min(r.held, 2), t1 = H.scoreTime(m, r, [1.0, 1.25, 1.6, 2.0][sl.f]) * (c.wrist ? 0.68 : 1);
      H.act(r, n > 1 ? t1 * 1.55 : t1, () => {
        for (let i = 0; i < n; i++) {
          // the second girder of a twin gripper goes one floor up in the same bay if that is free, or wherever the next gap is
          let s2 = i === 0 ? sl : (ss.grid[sl.f][sl.b] < 2 ? sl : slot04(m, r));
          r.held--; r.stats.shots++;
          if (!s2 || ss.grid[s2.f][s2.b] >= 2) s2 = slot04(m, r);
          if (s2 && m.rng.chance(Math.min(0.99, H.hit(m, r, [1.08, 1.0, 0.92, 0.84][s2.f])))) {
            ss.grid[s2.f][s2.b]++; ss.girders++; r.stats.hits++;
            const pts = (isAuto(m) ? T04.apts : T04.pts)[s2.f]; H.addPts(m, r, pts, '+' + pts, E.P(m, a, T04.tx, CY + (s2.b - 1) * T04.bayDy));
            topCheck04(m, r);
          } else { const q = E.P(m, a, m.rng.range(2.0, 2.6), CY + m.rng.range(-1.9, 1.9)); drop(m, q.x, q.y, { t: m.t + 1 }); r.label = 'Girder fell'; }
        }
        if (r.held <= 0) { r.held = 0; r.heldType = null; }
        r.stats.cycles++;
      }, 'Placing on floor ' + (sl.f + 1));
    }, 'To the tower');
    return true;
  }
  // somewhere else for a girder: the Footbridge (an alliance that goes for it, its lowest lift first), or the stockpile
  function bridge04(m, r) {
    const a = r.a, ss = m.ss[a];
    if (ss.bridge + ss.bridgeClaim >= 2 || isAuto(m)) return false;
    if (r.plan.target !== 'bridge') {
      if (!ss.coopPlan || floors04(ss) < 1) return false;
      const low = mates(m, a).filter(x => !x.dead && !x.mem.broken).sort((p, q) => (p.cap.reach || 1) - (q.cap.reach || 1) || p.slot - q.slot)[0];
      if (low !== r) return false;
    }
    ss.bridgeClaim++;
    H.moveTo(m, r, E.P(m, a, CX - 0.55 - RR - 0.25, CY + (ss.bridge ? 0.5 : -0.5)), () => {
      ss.bridgeClaim = Math.max(0, ss.bridgeClaim - 1);
      if (!H.canScore(m, r) || ss.bridge >= 2) return;
      H.act(r, H.scoreTime(m, r, 1.1), () => {
        r.held--; if (r.held <= 0) { r.held = 0; r.heldType = null; } r.stats.shots++; r.stats.hits++; r.stats.cycles++; ss.bridge++;
        H.addPts(m, r, 3, 'FOOTBRIDGE +3', { x: CX, y: CY });
        if (!m.coop && m.ss.red.bridge >= 2 && m.ss.blue.bridge >= 2) { m.coop = true; H.log(m, null, 'The Footbridge is complete: Topping Out needs three floors', 'rp'); }
      }, 'Laying a Footbridge girder');
    }, 'To the Footbridge');
    return true;
  }
  function stock04(m, r) {
    const a = r.a, ss = m.ss[a];
    H.moveTo(m, r, E.P(m, a, 2.1, CY + 1.95 * (r.slot % 2 ? 1 : -1)), () => {
      H.act(r, H.scoreTime(m, r, 0.6), () => { const n = r.held; r.held = 0; r.heldType = null; ss.stock += n; r.stats.cycles++; H.addPts(m, r, n, 'STOCKPILE +' + n); }, 'Stockpiling');
    }, 'To the stockpile');
  }
  function score04(m, r) {
    if (r.plan.target === 'bridge' && bridge04(m, r)) return;
    if (!full04(m.ss[r.a]) && bridge04(m, r)) return;
    if (place04(m, r)) return;
    if (bridge04(m, r)) return;
    stock04(m, r);
  }
  function rackLoad04(m, r, i) {
    const ss = m.ss[r.a];
    if (!H.canCollect(m, r) || r.held >= cap04(r) || H.endDue(m, r)) return;
    if (ss.q[i] <= 0) { if (ss.hp > 0) H.waitUntil(r, () => m.ss[r.a].q[i] > 0, () => rackLoad04(m, r, i), 'Waiting at the rack', 5); return; }
    H.act(r, H.collectTime(m, r, 'station', 1.3), () => { if (ss.q[i] <= 0) return; ss.q[i]--; r.held++; r.heldType = 'girder'; if (r.held < cap04(r) && (ss.q[i] > 0 || ss.hp > 0)) rackLoad04(m, r, i); }, 'Loading at the rack');
  }
  function collect04(m, r) {
    const a = r.a, ss = m.ss[a], need = cap04(r) - r.held, opts = [];
    if (need <= 0 || !H.canCollect(m, r)) return false;
    if (r.cap.ground) { const p = nearLoose(m, r); if (p) opts.push({ k: 'g', p, t: H.travelEst(m, r, p) + 2.0 }); }
    T04.racks.forEach((y, i) => {
      if (ss.q[i] <= 0 && ss.hp <= 0) return;
      const p = E.P(m, a, y.x - 0.45, y.y);
      opts.push({ k: 'y', i, p, t: H.travelEst(m, r, p) + (ss.q[i] > 0 ? 0 : 2.5) + 1.6 + (H.spotUse(m, r, p) ? 2.5 : 0) });
    });
    if (!opts.length) return false;
    const best = opts.sort((p, q) => p.t - q.t)[0];
    if (best.k === 'g') grab(m, r, best.p, 1.5, 'Picking up a girder', () => { r.held++; r.heldType = 'girder'; }, 'To a girder');
    else H.moveTo(m, r, best.p, () => rackLoad04(m, r, best.i), 'To the Supply Yard');
    return true;
  }
  const rungs04 = n => (n >= 4 ? 3 : Math.min(n, 2)); // floors topped out → the highest rung that is open
  Rules.rungs04 = rungs04;
  const open04 = (m, a) => rungs04(floors04(m.ss[a]));
  Rules[2104] = {
    leavePts: 3, tempo: { c: 2.8, s: 2.5 },
    endgame: { levels: [{ name: 'Rung 1', pts: 6, time: 4, risk: 0.03 }, { name: 'Rung 2', pts: 12, time: 6.5, risk: 0.08, drop: 0.2 }, { name: 'Rung 3', pts: 20, time: 9.5, risk: 0.14, drop: 0.35 }], park: 3 },
    leftCheck: (m, r) => loc(m, r).x > T04.line + 0.35,
    endLevel(m, r) { return Math.min(r.cap.endLevel || 0, open04(m, r.a)); },
    canWork: (m, r, part) => part === 'intake' && r.held > 0,
    init(m) {
      setHp(m);
      m.loose = []; m.coop = false;
      m.obs = [{ x: CX, y: CY, r: 0.8, h: 0.5 }];
      ['red', 'blue'].forEach(a => {
        [-1, 0, 1].forEach(k => { const p = E.P(m, a, T04.tx - 0.55, CY + k * T04.bayDy); m.obs.push({ x: p.x, y: p.y, r: 0.75, h: 0.6 }); });
        m.ss[a] = { grid: [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]], claim: {}, topped: 0, girders: 0, bridge: 0, bridgeClaim: 0, stock: 0, hp: 22, q: [1, 1], qT: [0, 0], found: false, coopPlan: m.rng.chance(0.5) };
        T04.floor.forEach(q => { const p = E.P(m, a, q[0], q[1]); drop(m, p.x, p.y); });
      });
      m.robots.forEach(r => { r.held = 1; r.heldType = 'girder'; });
    },
    start(m, r) { return E.P(m, r.a, 2.45, [1.25, CY, FH - 1.25][r.slot]); },
    guard(m, a) { return E.P(m, a, 3.5, CY); },
    protect(m, r) {
      const q = loc(m, r);
      if (q.x < T04.siteX + 0.15 && Math.abs(q.y - CY) < T04.siteH + 0.15) return 'Site';
      if (T04.racks.some(y => Math.hypot(q.x - y.x, q.y - y.y) < 1.6)) return 'Supply Yard';
      return '';
    },
    // touching a robot in its Site is a major foul; a robot on its way up a rung is credited with it
    onProtect(m, d, t, pz, H2) {
      if (pz !== 'Site') return false;
      H.foul(m, d, true, 'Site');
      if (m.inEnd && t.endBusy && t.endLvl > 0 && !(t.endCredit >= t.endLvl)) { t.endCredit = t.endLvl; H.log(m, d.a, d.team + ' touched ' + t.team + ' at its tower: the rung is awarded', 'foul'); }
      return true;
    },
    onTeleop(m) { ['red', 'blue'].forEach(a => { const ss = m.ss[a]; ss.found = ss.grid[0].reduce((s, b) => s + b, 0) >= 3; if (ss.found) H.log(m, a, 'FOUNDATION: three girders on floor 1 in auto', 'rp'); }); },
    tick(m) {
      ['red', 'blue'].forEach(a => {
        const ss = m.ss[a], gap = 3.6 - 1.9 * hpK(m, a);
        [0, 1].forEach(i => { if (ss.hp > 0 && ss.q[i] < 2 && m.t >= ss.qT[i]) { ss.hp--; ss.q[i]++; ss.qT[i] = m.t + gap; } });
      });
    },
    autoDecide(m, r) {
      const tier = r.cap.autoTier || 0, max = m.S.autoPieces[tier], left = m.T.auto - m.t;
      if (r.mem.got == null) r.mem.got = 0;
      if (!r.autoOK) return struggle(m, r, T04.line + 0.9);
      if (tier >= 1 && r.mem.got < max && H.canScore(m, r)) {
        if (r.held > 0 && left > 3 && slot04(m, r)) { r.mem.got += r.held; place04(m, r); return; }
        if (r.held === 0 && left > 8 && r.cap.ground && H.canCollect(m, r)) {
          const p = nearLoose(m, r, null, 8);
          if (p) return grab(m, r, p, 1.5, 'Auto: picking up a girder', () => { r.held++; r.heldType = 'girder'; }, 'Auto: to a girder');
        }
      }
      leave(m, r, T04.line + 0.9);
    },
    decide(m, r) {
      const canS = H.canScore(m, r), canC = H.canCollect(m, r);
      if (r.held >= cap04(r) && canS) return score04(m, r);
      if (r.held > 0 && canS && !(canC && r.cap.ground && nearLoose(m, r, null, 2.5))) return score04(m, r);
      if (canC && collect04(m, r)) return;
      if (r.held > 0 && canS) return score04(m, r);
      r.label = r.jam.intake > m.t ? 'Intake jammed' : 'No girders left';
    },
    endSpot(m, r, lvl) {
      const p = [[T04.tx - 0.1, CY - 2.05], [T04.tx - 0.1, CY + 2.05], [T04.tx + 0.85, CY - 2.05]][r.slot];
      return lvl ? E.P(m, r.a, p[0], p[1]) : E.P(m, r.a, 2.3, CY + (r.slot - 1) * 1.5);
    },
    finishEnd(m) { ['red', 'blue'].forEach(a => { const e = endPts(m, a, T04.rung, 3); m.ss[a].endPts = e; m.score[a].end += e; }); },
    bonus(m, a) {
      const ss = m.ss[a], need = m.coop ? 3 : 4, n = floors04(ss);
      const e = m.done ? ss.endPts || 0 : mates(m, a).reduce((s, r) => s + (r.end && !r.dead ? (r.end.lvl > 0 ? T04.rung[r.end.lvl - 1] : r.end.park ? 3 : 0) : 0), 0);
      return [
        { key: 'found', name: 'Foundation', val: m.phase === 'auto' ? Math.min(3, ss.grid[0].reduce((s, b) => s + b, 0)) : ss.found ? 3 : 0, thr: 3, ok: !!ss.found, unit: 'girders in auto' },
        { key: 'topout', name: 'Topping Out', val: n, thr: need, ok: n >= need, unit: 'floors' },
        { key: 'skyline', name: 'Skyline', val: e, thr: T04.sky[lvlOf(m)], ok: e >= T04.sky[lvlOf(m)], unit: 'endgame pts' }
      ];
    },
    hud(m, a) { const ss = m.ss[a]; return ['FLOORS ' + floors04(ss) + '/4', 'GIRDERS ' + ss.girders + '/24', 'BRIDGE ' + ss.bridge + '/2'].concat(m.coop ? ['CO-OP'] : []).concat(ss.stock ? ['STOCK ' + ss.stock] : []); }
  };
  Rules[2104].defense = { eff: 0.9, foul: 1.3, range: 1.6, zone: 0.3, pin: 3, reset: 3, protMajor: true };
  Rules[2104].faults = { brown: 0.9, tip: 2.3, tipAll: 0.4, comms: 1.0, tipDrv: true };
  S[2104].meta = { defense: false, note: 'Building wins in HIGH RISE: the Site is closed to opponents, girders are scarce, and the rungs only open as the floors are topped out, so nearly every alliance runs three builders. The tall lifts take the upper floors and leave the low ones to partners that can reach nothing else.',
    faults: 'Common failures: tip-overs with a tall lift up at floor 4, girders dropped across the cradles, and falls from the top rung.' };
  S[2104].tiebreak = 'tower climb';

  // =====================================================================
  // GALE FORCE (2105)
  // Three TURBINES per alliance (m.ss[a].t: home, field, off = speed 0 to 1): Home beside its own wall inside the
  // protected Home Pad, Field on its side of mid-field, Offshore in the other alliance's half. A robot with a spinner
  // winds one up to full speed in 6 s (3 s with a high-torque spinner); it runs down to the generating line (T05.gen)
  // in about 25 s. A cell is worth its base value (low 1, high 2; 2 and 4 in auto) plus 1 for each of the alliance's
  // turbines generating as it scores. Opponents brake an Offshore turbine by touching its drum; the human player's
  // hand crank keeps the Home turbine generating, at the cost of slower loading.
  // Cells: 20 on the carpet, 17 with each alliance's human players (chute at its own wall), three preloads a robot;
  // a scored cell goes to the human players at that end, the other alliance's.
  // Endgame: one robot per tower: first hold 8, second hold 16, +6 on the Offshore tower. A turbine generating when
  // auto ends or at the final buzzer scores 5.
  // =====================================================================
  const T05 = { line: 3.05, pad: 2.15, turb: { home: { x: 1.1, y: 1.15 }, field: { x: 6.1, y: FH - 1.0 }, off: { x: FW - 3.0, y: 1.15 } }, chute: { x: 0.65, y: FH - 1.3 }, gen: 0.35, run: 25, rp: [40, 55, 70], keys: ['home', 'field', 'off'] };
  Rules.T05 = T05;
  const turb05 = (m, a, k) => E.P(m, a, T05.turb[k].x, T05.turb[k].y);
  const gen05 = (m, a) => T05.keys.filter(k => m.ss[a].t[k] >= T05.gen).length;
  const grid05 = (m, a) => E.P(m, a, FW, CY);
  const cap05 = r => Math.max(1, r.cap.storage || 1);
  // where a robot stands to work a turbine's drum: on the side toward the middle of the field
  function drum05(m, a, k) { const p = turb05(m, a, k), dx = CX - p.x, dy = CY - p.y, dl = Math.hypot(dx, dy) || 1; return { x: p.x + dx / dl * (0.3 + RR + 0.12), y: p.y + dy / dl * (0.3 + RR + 0.12) }; }
  function spin05(m, r, k) {
    const a = r.a, ss = m.ss[a];
    ss.spinClaim[k] = { team: r.team, until: m.t + 12 };
    H.moveTo(m, r, drum05(m, a, k), () => {
      if (r.perm.scorer && r.perm.intake) return;
      H.act(r, (r.cap.spin >= 2 ? 3 : 6) * (1.25 - 0.45 * r.drv.mech / 100), () => {
        ss.t[k] = 1; ss.spinClaim[k] = null; ss.spins++;
        if (!m.headless) m.fx.push({ k: 'pop', x: r.x, y: r.y, text: 'SPUN UP', t: m.t, a });
      }, 'Spinning up the ' + (k === 'off' ? 'Offshore' : k === 'home' ? 'Home' : 'Field') + ' turbine');
    }, 'To the ' + (k === 'off' ? 'Offshore' : k === 'home' ? 'Home' : 'Field') + ' turbine');
  }
  // the turbine most worth a visit now: running low, nobody else on it, and not far out of this robot's way
  function spinPick05(m, r, maxD) {
    const a = r.a, ss = m.ss[a], keen = r.plan.target === 'spin';
    if (!r.cap.spin || r.plan.target === 'shoot' || H.endDue(m, r) || m.total - m.t < m.T.end + 3) return null;
    let best = null, bd = maxD;
    T05.keys.forEach(k => {
      const c = ss.spinClaim[k];
      if (ss.t[k] > (keen ? 0.7 : 0.5) || (c && c.team !== r.team && c.until > m.t)) return;
      const d = E.dist(r, turb05(m, a, k)) * (k === 'home' && ss.crank ? 1.5 : 1); // the crank is holding Home for now
      if (d < bd) { bd = d; best = k; }
    });
    return best;
  }
  function volley05(m, r) {
    const a = r.a, ss = m.ss[a], grid = grid05(m, a);
    if (r.held <= 0 || !H.canScore(m, r) || H.endDue(m, r)) return;
    const low = !!r.cap.lowOnly;
    H.act(r, H.scoreTime(m, r, low ? 0.4 : 0.5), () => {
      const hit = m.rng.chance(low ? 0.99 : H.hit(m, r, 0.95, H.rangePen(m, r, grid)));
      r.held--; r.stats.shots++; if (!low) H.shotFx(m, r, grid, hit);
      if (hit) {
        const pts = (low ? 1 : 2) * (isAuto(m) ? 2 : 1) + gen05(m, a);
        r.stats.hits++; ss.cells++; if (isAuto(m)) ss.autoCells++; m.ss[opp(a)].hp++;
        H.addPts(m, r, pts, '+' + pts, grid);
      } else { const p = E.P(m, a, FW - m.rng.range(0.9, 3.4), CY + m.rng.range(-2.4, 2.4)); drop(m, p.x, p.y, { t: m.t + 0.8 }); }
      if (r.held > 0) volley05(m, r); else r.stats.cycles++;
    }, low ? 'Feeding the low inlet' : 'Shooting at the Grid');
  }
  function shoot05(m, r) {
    const a = r.a, c = r.cap, grid = grid05(m, a);
    let spot;
    if (c.lowOnly) spot = E.P(m, a, FW - 0.5 - RR, CY + (r.slot - 1) * 0.95);
    else {
      spot = H.shootSpot(m, r, grid, null);
      // a side roller shoots from beside the Offshore turbine and keeps it turning (if the Grid is in range from there)
      if (c.spinShoot) { const d = drum05(m, a, 'off'); if (E.dist(d, grid) <= (c.rangeM || 2) && E.dist(d, grid) >= (c.rmin || 1)) spot = d; }
    }
    H.moveTo(m, r, H.clearOf(m, spot, false, false, r), () => { if (H.canScore(m, r)) H.act(r, c.lowOnly ? 0.3 : H.aimTime(m, r), () => volley05(m, r), 'Aiming'); }, c.lowOnly ? 'To the Grid' : 'To shoot');
  }
  function chuteLoad05(m, r) {
    const ss = m.ss[r.a];
    if (!H.canCollect(m, r) || r.held >= cap05(r) || ss.hp <= 0 || H.endDue(m, r)) return;
    H.act(r, H.collectTime(m, r, 'station', 0.75) * (ss.crank ? 1.7 : 1), () => { if (ss.hp <= 0) return; ss.hp--; r.held++; r.heldType = 'gcell'; chuteLoad05(m, r); }, 'Loading at the chute');
  }
  function collect05(m, r) {
    const a = r.a, ss = m.ss[a], need = cap05(r) - r.held, opts = [];
    if (need <= 0 || !H.canCollect(m, r)) return false;
    if (r.cap.ground) { const p = nearLoose(m, r); if (p) opts.push({ k: 'g', p, t: H.travelEst(m, r, p) + 1.2 }); }
    if (ss.hp > 0) { const p = E.P(m, a, T05.chute.x + 0.35, T05.chute.y), n = Math.min(need, ss.hp); opts.push({ k: 'c', p, t: (H.travelEst(m, r, p) + n * (ss.crank ? 1.5 : 0.9) + (H.spotUse(m, r, p) ? 2 : 0)) / n }); }
    if (!opts.length) return false;
    const best = opts.sort((p, q) => p.t - q.t)[0];
    if (best.k === 'g') grab(m, r, best.p, 1.0, 'Intaking a cell', () => { r.held++; r.heldType = 'gcell'; }, 'To a cell');
    else H.moveTo(m, r, best.p, () => chuteLoad05(m, r), 'To the chute');
    return true;
  }
  // the other alliance's Offshore turbine stands in this robot's half: touch its drum for three seconds and it stops
  function brake05(m, r) {
    const o = opp(r.a), ss = m.ss[o];
    if (r.held > 0 || ss.t.off < T05.gen || (r.mem.brakeT || 0) > m.t || H.endDue(m, r)) return false;
    const want = r.plan.target === 'brake', near = E.dist(r, turb05(m, o, 'off')) < 3.2;
    if (!want && !(near && m.rng.chance(0.3))) { r.mem.brakeT = m.t + 4; return false; }
    r.mem.brakeT = m.t + 14;
    H.moveTo(m, r, drum05(m, o, 'off'), () => H.act(r, 3, () => { ss.t.off = Math.min(ss.t.off, 0.08); ss.braked++; H.log(m, r.a, r.team + ' brakes the ' + o + ' Offshore turbine', 'ai'); }, 'Braking their Offshore turbine'), 'To their Offshore turbine');
    return true;
  }
  const tower05 = (m, r) => { const i = bestClimbers(m, r.a, 3).indexOf(r); return ['off', 'field', 'home'][i < 0 ? 2 : i]; };
  Rules[2105] = {
    leavePts: 3, tempo: { c: 2.5, s: 2.2 },
    endgame: { levels: [{ name: 'First hold', pts: 8, time: 4.5, risk: 0.04 }, { name: 'Second hold', pts: 16, time: 8, risk: 0.11, drop: 0.25 }], park: 0 },
    leftCheck: (m, r) => loc(m, r).x > T05.line + 0.35,
    aimAt: (m, r) => (r.held > 0 && !r.cap.lowOnly ? grid05(m, r.a) : null),
    init(m) {
      setHp(m);
      m.loose = []; m.obs = [];
      ['red', 'blue'].forEach(a => {
        T05.keys.forEach(k => { const p = turb05(m, a, k); m.obs.push({ x: p.x, y: p.y, r: 0.6, h: 0.3, end: true, a }); });
        m.ss[a] = { t: { home: 0, field: 0, off: 0 }, spinClaim: {}, spins: 0, braked: 0, fullT: 0, cells: 0, autoCells: 0, hp: 17, crank: false, light: false, autoGen: 0, endGen: 0 };
        [[4.3, 2.2], [4.3, CY], [4.3, FH - 2.4], [5.6, 1.0], [5.6, 3.2], [5.6, 5.2], [6.9, 2.1], [6.9, CY], [7.6, 6.0], [7.6, 0.9]].forEach(q => { const p = E.P(m, a, q[0], q[1]); drop(m, p.x, p.y); });
      });
      m.robots.forEach(r => { r.held = Math.min(3, cap05(r)); r.heldType = 'gcell'; });
    },
    start(m, r) { return E.P(m, r.a, 2.5, [1.9, CY, FH - 2.3][r.slot]); },
    guard(m, a) { return E.P(m, a, FW - 3.0, CY); },
    protect(m, r) {
      const q = loc(m, r);
      if (q.x < T05.pad + 0.1 && q.y < T05.pad + 0.1) return 'Home Pad';
      if (m.total - m.t <= 30 && r.endBusy && r.endLvl > 0 && T05.keys.some(k => E.dist(r, turb05(m, r.a, k)) < 1.25)) return 'Turbine Tower';
      return '';
    },
    onTeleop(m) {
      ['red', 'blue'].forEach(a => {
        const ss = m.ss[a], n = gen05(m, a);
        ss.autoGen = n; if (n) m.score[a].auto += 5 * n;
        ss.light = ss.t.home >= T05.gen && ss.autoCells >= 5;
        if (ss.light) H.log(m, a, 'FIRST LIGHT: the Home turbine is generating and five cells are in', 'rp');
      });
    },
    tick(m) {
      const dec = (1 - T05.gen) / T05.run * E.DT;
      ['red', 'blue'].forEach(a => {
        const ss = m.ss[a], o = opp(a);
        T05.keys.forEach(k => { ss.t[k] = Math.max(0, ss.t[k] - dec); });
        // a side roller keeps the drum it is standing beside at full speed
        for (const r of m.robots) if (r.a === a && !r.dead && r.cap.spinShoot && (r.st === 'act' || r.st === 'wait')) T05.keys.forEach(k => { if (E.dist(r, turb05(m, a, k)) < 1.35) ss.t[k] = 1; });
        // a defender working beside the Offshore turbine slows it
        const tp = turb05(m, a, 'off');
        for (const r of m.robots) if (r.a === o && !r.dead && r.st === 'defend' && E.dist(r, tp) < 1.4) ss.t.off = Math.max(0, ss.t.off - 3 * dec);
        // the Home crank: a human player takes it when the turbine is about to stop and no robot is coming for it, and
        // lets go once a robot has wound it up again
        const cl = ss.spinClaim.home, coming = cl && cl.until > m.t;
        if (!ss.crank && ss.t.home < 0.45 && !coming) ss.crank = true;
        if (ss.crank) { if (ss.t.home > 0.9 || (m.inEnd && m.total - m.t < 3 && false)) ss.crank = false; else ss.t.home = Math.max(ss.t.home, Math.min(0.5, ss.t.home + 0.12 * E.DT * (0.6 + hpK(m, a)))); }
        if (gen05(m, a) === 3) ss.fullT += E.DT;
      });
    },
    autoDecide(m, r) {
      const tier = r.cap.autoTier || 0, max = m.S.autoPieces[tier], left = m.T.auto - m.t, ss = m.ss[r.a];
      if (!r.autoOK) return struggle(m, r, T05.line + 0.9);
      if (tier >= 1) {
        // the robot nearest the Home turbine winds it up first
        if (r.cap.spin && r.slot === 0 && !r.mem.spun && ss.t.home < 0.6 && left > 12) { r.mem.spun = 1; return spin05(m, r, 'home'); }
        if (H.canScore(m, r)) {
          if (r.held > 0 && left > 2.5 && r.stats.shots < max) return shoot05(m, r);
          if (r.held === 0 && r.stats.shots < max && left > 6 && r.cap.ground && H.canCollect(m, r)) {
            const p = nearLoose(m, r, null, 7);
            if (p) return grab(m, r, p, 1.0, 'Auto: intaking', () => { r.held++; r.heldType = 'gcell'; }, 'Auto: to a cell');
          }
        }
      }
      leave(m, r, T05.line + 0.9);
    },
    decide(m, r) {
      const capN = cap05(r), canS = H.canScore(m, r), canC = H.canCollect(m, r);
      if (r.held >= capN && canS) {
        const k = spinPick05(m, r, 4.5); if (k) return spin05(m, r, k); // a turbine on the way is worth more than the detour costs
        return shoot05(m, r);
      }
      if (r.held > 0 && canS && !(canC && r.cap.ground && nearLoose(m, r, null, 2.4))) {
        const q = loc(m, r);
        if (!(canC && q.x < 2.2 && q.y > FH - 2.6 && m.ss[r.a].hp > 0)) { const k = spinPick05(m, r, 4.5); if (k) return spin05(m, r, k); return shoot05(m, r); }
      }
      if (r.held === 0) { const k = spinPick05(m, r, r.plan.target === 'spin' ? 99 : 7); if (k) return spin05(m, r, k); if (brake05(m, r)) return; }
      if (canC && collect05(m, r)) return;
      if (r.held > 0 && canS) return shoot05(m, r);
      { const k = spinPick05(m, r, 99); if (k) return spin05(m, r, k); }
      r.label = r.jam.intake > m.t ? 'Intake jammed' : 'Waiting for cells';
    },
    endSpot(m, r) { return drum05(m, r.a, tower05(m, r)); },
    finishEnd(m) {
      ['red', 'blue'].forEach(a => {
        const ss = m.ss[a]; let e = endPts(m, a, [8, 16], 0);
        mates(m, a).forEach(r => { if (r.end && r.end.lvl > 0 && !r.dead && tower05(m, r) === 'off') { e += 6; r.stats.pts += 6; } });
        ss.endGen = gen05(m, a); ss.endPts = e; m.score[a].end += e + 5 * ss.endGen;
      });
    },
    bonus(m, a) {
      const ss = m.ss[a], thr = T05.rp[lvlOf(m)];
      const e = m.done ? ss.endPts || 0 : mates(m, a).reduce((s, r) => s + (r.end && r.end.lvl > 0 && !r.dead ? [8, 16][r.end.lvl - 1] + (tower05(m, r) === 'off' ? 6 : 0) : 0), 0);
      return [
        { key: 'light', name: 'First Light', val: Math.min(5, ss.autoCells), thr: 5, ok: !!ss.light, unit: 'cells in auto' },
        { key: 'power', name: 'Full Power', val: Math.round(ss.fullT), thr, ok: ss.fullT >= thr, unit: 's at full power' },
        { key: 'storm', name: 'Storm Watch', val: e, thr: 30, ok: e >= 30, unit: 'endgame pts' }
      ];
    },
    hud(m, a) { const ss = m.ss[a], n = gen05(m, a); return ['TURBINES ' + n + '/3', 'CELL +' + n, 'FULL POWER ' + Math.round(ss.fullT) + ' s'].concat(ss.crank ? ['CRANKING'] : []); }
  };
  Rules[2105].defense = { eff: 1.7, foul: 0.9, range: 1.7, zone: 0.35, pin: 3, reset: 3, protMajor: true, credit: { 'Turbine Tower': 2 } };
  Rules[2105].faults = { brown: 1.6, tip: 0.8, tipAll: 0.1, comms: 1.1 };
  S[2105].meta = { defense: true, note: 'Upkeep wins in GALE FORCE: a cell is worth two points with nothing turning and five with everything turning, so the alliances that keep three turbines generating out-score better shooters that do not. A defender near your Offshore turbine costs you twice: it slows the turbine and the shooter beside it.',
    faults: 'Common failures: brownouts (a spinner, a shooter and the drivetrain all pulling at once), cells jammed in the indexer, and robots that slide back down a turbine tower.' };
  S[2105].tiebreak = 'turbine tower';

  // =====================================================================
  // DEEP FREEZE (2106)
  // Curling. The ICE is a circle at the centre of the field (robots keep off it) with the HOUSE painted on it. Stones
  // are tracked one by one (m.stones = [{ a, x, y, by }]). A robot at the edge of the ice plans a slide: a DRAW (to the
  // nearest free spot to the button), a TAKE-OUT (at the other alliance's best stone) or a GUARD (in front of its own
  // best stone). How close it comes follows its slider, its accuracy and its vision. A stone on the way stops a draw
  // (unless the slider curls round it) and takes the hit meant for the stone behind it.
  // The score is FROZEN four times: when auto ends, at 1:40 and 0:50 to go, and at the final buzzer. Each stone on the
  // ice scores for its ring (Outer 2, Middle 3, Inner 5, Button 8) and the closest stone of all adds 6 for SHOT ROCK;
  // the first and last freezes count double. After each of the first three the House is swept: every stone goes back
  // to its alliance's Sled Chutes, so the match is four ends, as in curling.
  // A stone knocked off the ice lies on the carpet for its own alliance to pick up; after 12 s the field crew hands it
  // to that alliance's human players. Each alliance has eight stones: a preload a robot, the rest at its Sled Chutes.
  // Endgame: the LODGE in each alliance's corner: ramp 4, deck 10; the human players slide three stones by hand.
  // =====================================================================
  const T06 = { line: 2.75, ice: 2.44, rings: [0.265, 0.495, 0.875, 1.335], val: [8, 5, 3, 2], rock: 6, chutes: [{ x: 0.65, y: 0.95 }, { x: 0.65, y: 2.2 }], lodge: { x: 2.44, y: FH - 1.83 }, freeze: [60, 110], stones: 8, rpH: [8, 8, 8] };
  Rules.T06 = T06;
  const dC06 = p => Math.hypot(p.x - CX, p.y - CY);
  const ring06 = p => { const d = dC06(p); for (let i = 0; i < 4; i++) if (d <= T06.rings[i]) return i; return -1; };
  const best06 = (m, a) => { let b = null; for (const st of m.stones) if (st.a === a && (!b || dC06(st) < dC06(b))) b = st; return b; };
  const cap06 = r => Math.max(1, r.cap.storage || 1);
  // how far off a slide lands (metres, one standard deviation), by the slider, its accuracy, vision and whoever is leaning on the robot
  const sig06 = (m, r) => Math.max(0.07, ((r.cap.slide || 1) >= 2 ? 0.85 - 0.75 * r.cap.accuracy / 100 : 1.3 - 0.6 * r.cap.accuracy / 100) * (1 - 0.12 * (r.cap.visionLvl || 0)) * (r.defBy ? 1.5 : 1) * (1.1 - 0.1 * r.tune));
  // a stone leaves the ice: onto the carpet just outside, for its own alliance to pick up
  function off06(m, st) {
    const i = m.stones.indexOf(st); if (i >= 0) m.stones.splice(i, 1);
    const g = Math.atan2(st.y - CY, st.x - CX), d = T06.ice + 0.75;
    drop(m, CX + Math.cos(g) * d, CY + Math.sin(g) * d, { c: st.a, t: m.t + 1, until: m.t + 13 });
  }
  function settle06(m) {
    for (let it = 0; it < 3; it++) for (let i = 0; i < m.stones.length; i++) for (let j = i + 1; j < m.stones.length; j++) {
      const p = m.stones[i], q = m.stones[j], dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
      if (d < 0.23) { const k = (0.23 - d) / 2 + 0.005, ux = d > 1e-4 ? dx / d : 1, uy = d > 1e-4 ? dy / d : 0; p.x -= ux * k; p.y -= uy * k; q.x += ux * k; q.y += uy * k; }
    }
    m.stones.filter(st => dC06(st) > T06.ice).forEach(st => off06(m, st));
  }
  // the first stone standing in the way of a slide from `from` to `to` (within a stone's width of the line), or null
  function block06(m, from, to, skip) {
    const dx = to.x - from.x, dy = to.y - from.y, L = Math.hypot(dx, dy) || 1e-6; let hit = null, bt = 1e9;
    for (const st of m.stones) {
      if (st === skip) continue;
      const t = ((st.x - from.x) * dx + (st.y - from.y) * dy) / L;
      if (t < 0.15 || t > L - 0.2) continue;
      if (Math.abs((st.x - from.x) * dy - (st.y - from.y) * dx) / L < 0.22 && t < bt) { bt = t; hit = st; }
    }
    return hit ? { st: hit, t: bt } : null;
  }
  // one slide. from: where it is let go; kind: 'draw' | 'takeout' | 'guard'; who: { a, by, sig, power, curl }
  function slide06(m, from, kind, who) {
    const a = who.a, own = best06(m, a), their = best06(m, opp(a)), rn = (s) => m.rng.norm(0, s);
    let tgt;
    if (kind === 'takeout' && their) tgt = { x: their.x, y: their.y };
    else if (kind === 'guard' && own) { const w = E.P(m, opp(a), 0, CY), dx = w.x - own.x, dy = w.y - own.y, dl = Math.hypot(dx, dy) || 1; tgt = { x: own.x + dx / dl * 0.75, y: own.y + dy / dl * 0.75 }; }
    else {
      // the free spot nearest the button
      tgt = { x: CX, y: CY };
      const cands = [[0, 0]]; for (let k = 0; k < 7; k++) cands.push([Math.cos(k * 0.9) * 0.3, Math.sin(k * 0.9) * 0.3]); for (let k = 0; k < 10; k++) cands.push([Math.cos(k * 0.628 + 0.3) * 0.58, Math.sin(k * 0.628 + 0.3) * 0.58]);
      const free = cands.map(c => ({ x: CX + c[0], y: CY + c[1] })).filter(p => !m.stones.some(st => Math.hypot(st.x - p.x, st.y - p.y) < 0.26));
      if (free.length) tgt = free.sort((p, q) => dC06(p) - dC06(q) || E.dist(from, p) - E.dist(from, q))[0];
      kind = 'draw';
    }
    const dx = tgt.x - from.x, dy = tgt.y - from.y, L = Math.hypot(dx, dy) || 1e-6, ux = dx / L, uy = dy / L, lat = rn(who.sig * 0.6), lon = rn(who.sig);
    const st = { a, by: who.by, x: 0, y: 0 };
    if (kind === 'takeout') {
      const guard = who.curl ? null : block06(m, from, tgt, their), victim = guard ? guard.st : their, hit = Math.abs(lat) < 0.2;
      if (hit) {
        const pw = who.power >= 3 ? m.rng.range(1.7, 3.3) : m.rng.range(0.5, 1.3), vx = victim.x, vy = victim.y;
        victim.x += ux * pw + rn(0.15); victim.y += uy * pw + rn(0.15);
        const roll = who.power >= 3 ? m.rng.range(0, 0.3) : m.rng.range(0.2, 0.9);
        st.x = vx + ux * roll; st.y = vy + uy * roll;
        if (!m.headless) m.fx.push({ k: 'pop', x: vx, y: vy, text: 'TAKE-OUT', t: m.t, a });
      } else { const over = m.rng.range(0.6, 2.2); st.x = tgt.x + ux * over - uy * lat; st.y = tgt.y + uy * over + ux * lat; }
    } else {
      st.x = tgt.x + ux * lon - uy * lat; st.y = tgt.y + uy * lon + ux * lat;
      const b = who.curl ? null : block06(m, from, st, null);
      if (b) { st.x = from.x + ux * (b.t - 0.24); st.y = from.y + uy * (b.t - 0.24); const nd = m.rng.range(0.15, 0.5); b.st.x += ux * nd; b.st.y += uy * nd; } // it runs into a stone on the way and nudges it on
    }
    if (!m.headless) m.fx.push({ k: 'shot', x0: from.x, y0: from.y, x1: st.x, y1: st.y, t: m.t, hit: true, a });
    m.stones.push(st); settle06(m);
    return st;
  }
  function plan06(m, r) {
    const a = r.a, c = r.cap, want = r.plan.target, own = best06(m, a), their = best06(m, opp(a));
    const dO = own ? dC06(own) : 9, dT = their ? dC06(their) : 9, can = (c.slide || 1) >= 2;
    if (want === 'draw' || !can) return 'draw';
    if (want === 'takeout') return their && dT < T06.rings[3] ? 'takeout' : 'draw';
    if (want === 'guard' && own && dO < T06.rings[1] && m.stones.filter(st => st.a === a && Math.hypot(st.x - own.x, st.y - own.y) < 1.0 && st !== own).length < 1) return 'guard';
    // their stone is the shot rock, or sits in the Inner ring: take it out (a plain launcher only when it is close to worth it)
    if (their && dT < dO && dT < (c.takeout ? T06.rings[2] : T06.rings[1])) return 'takeout';
    if (their && c.takeout && dT < T06.rings[1] && m.rng.chance(0.5)) return 'takeout';
    return 'draw';
  }
  function throw06(m, r) {
    const a = r.a, g = Math.atan2(r.y - CY, r.x - CX), d = T06.ice + RR + 0.14;
    H.moveTo(m, r, { x: CX + Math.cos(g) * d, y: CY + Math.sin(g) * d }, () => {
      const go = () => {
        if (r.held <= 0 || !H.canScore(m, r) || H.endDue(m, r)) return;
        const kind = plan06(m, r);
        H.face(r, { x: CX, y: CY });
        H.act(r, 0.5 + 0.9 * (1 - (r.cap.vision || 0) / 100) + H.scoreTime(m, r, 0.6), () => {
          const g2 = Math.atan2(r.y - CY, r.x - CX), from = { x: CX + Math.cos(g2) * T06.ice, y: CY + Math.sin(g2) * T06.ice };
          r.held--; if (r.held <= 0) { r.held = 0; r.heldType = null; } r.stats.shots++; m.ss[a].slid++;
          const st = slide06(m, from, kind, { a, by: r.team, sig: sig06(m, r), power: r.cap.slide || 1, curl: !!r.cap.curl });
          if (ring06(st) >= 0 && m.stones.includes(st)) r.stats.hits++;
          if (r.held > 0) go(); else r.stats.cycles++;
        }, kind === 'takeout' ? 'Sliding a take-out' : kind === 'guard' ? 'Sliding a guard' : 'Drawing to the button');
      };
      go();
    }, 'To the ice');
  }
  function chuteLoad06(m, r, i) {
    const ss = m.ss[r.a];
    if (!H.canCollect(m, r) || r.held >= cap06(r) || H.endDue(m, r)) return;
    if (ss.q[i] <= 0) { if (ss.hp > 0) H.waitUntil(r, () => m.ss[r.a].q[i] > 0, () => chuteLoad06(m, r, i), 'Waiting at the chute', 5); return; }
    H.act(r, H.collectTime(m, r, 'station', 1.0), () => { if (ss.q[i] <= 0) return; ss.q[i]--; r.held++; r.heldType = r.a === 'red' ? 'stoneR' : 'stoneB'; if (r.held < cap06(r) && (ss.q[i] > 0 || ss.hp > 0)) chuteLoad06(m, r, i); }, 'Loading a stone');
  }
  function collect06(m, r) {
    const a = r.a, ss = m.ss[a], opts = [];
    if (r.held >= cap06(r) || !H.canCollect(m, r)) return false;
    if (r.cap.ground) { const p = nearLoose(m, r, x => x.c === a); if (p) opts.push({ k: 'g', p, t: H.travelEst(m, r, p) + 1.4 }); }
    T06.chutes.forEach((y, i) => {
      if (ss.q[i] <= 0 && ss.hp <= 0) return;
      const p = E.P(m, a, y.x + 0.4, y.y);
      opts.push({ k: 'c', i, p, t: H.travelEst(m, r, p) + (ss.q[i] > 0 ? 0 : 2.5) + 1.2 + (H.spotUse(m, r, p) ? 2.5 : 0) });
    });
    if (!opts.length) return false;
    const best = opts.sort((p, q) => p.t - q.t)[0];
    if (best.k === 'g') grab(m, r, best.p, 1.2, 'Picking up a stone', () => { r.held++; r.heldType = a === 'red' ? 'stoneR' : 'stoneB'; }, 'To a stone');
    else H.moveTo(m, r, best.p, () => chuteLoad06(m, r, best.i), 'To the Sled Chute');
    return true;
  }
  // freeze k (0 to 3): every stone scores for its ring, the closest of all adds shot rock; the first and last count double
  function freeze06(m, k) {
    const mult = k === 0 || k === 3 ? 2 : 1, key = k === 0 ? 'auto' : 'tele', sum = { red: 0, blue: 0 };
    let shot = null;
    for (const st of m.stones) { const i = ring06(st); if (i < 0) continue; const v = T06.val[i] * mult; sum[st.a] += v; const rb = m.robots.find(x => x.team === st.by); if (rb) rb.stats.pts += v; if (!shot || dC06(st) < dC06(shot)) shot = st; }
    if (shot) { sum[shot.a] += T06.rock * mult; m.ss[shot.a].hammer++; }
    ['red', 'blue'].forEach(a => { m.score[a][key] += sum[a]; m.ss[a].frz.push(sum[a]); m.ss[a].house = m.stones.filter(st => st.a === a && ring06(st) >= 0).length; });
    m.lastFreeze = { k, t: m.t, red: sum.red, blue: sum.blue, shot: shot ? shot.a : null };
    H.log(m, null, 'FREEZE ' + (k + 1) + (mult > 1 ? ' (double)' : '') + ': Red ' + sum.red + ', Blue ' + sum.blue + (shot ? ' · shot rock ' + shot.a : ''), 'rp');
    if (!m.headless) m.fx.push({ k: 'pop', x: CX, y: CY - 2.9, text: 'FREEZE ' + (k + 1), t: m.t, a: shot ? shot.a : 'blue' });
    // the House is swept for the next end (not after the last freeze: those stones stay for the photographs)
    if (k < 3) {
      m.stones.forEach(st => { m.ss[st.a].hp++; }); m.stones = [];
      for (let i = m.loose.length - 1; i >= 0; i--) { m.ss[m.loose[i].c].hp++; m.loose.splice(i, 1); }
    }
  }
  Rules[2106] = {
    leavePts: 3, tempo: { c: 2.2, s: 2.0 },
    endgame: { levels: [{ name: 'Lodge ramp', pts: 4, time: 1.5, sure: true }, { name: 'Lodge deck', pts: 10, time: 4, risk: 0.08 }], park: 0 },
    leftCheck: (m, r) => loc(m, r).x > T06.line + 0.35,
    // without an ice kit a drivetrain with real grip still gets onto the ramp
    endLevel(m, r) { return (r.cap.endLevel || 0) || ((r.cap.push || 0) >= 55 && !r.cap.noGrip ? 1 : 0); },
    init(m) {
      setHp(m);
      m.loose = []; m.stones = []; m.frozen = 0; m.lastFreeze = null;
      m.obs = [{ x: CX, y: CY, r: T06.ice + 0.25, h: T06.ice - RR + 0.05 }];
      ['red', 'blue'].forEach(a => { m.ss[a] = { hp: T06.stones - 5, q: [1, 1], qT: [0, 0], slid: 0, hammer: 0, frz: [], house: 0, hand: 3, handT: 0, deck: 0 }; });
      m.robots.forEach(r => { r.held = 1; r.heldType = r.a === 'red' ? 'stoneR' : 'stoneB'; });
    },
    start(m, r) { return E.P(m, r.a, 2.2, [3.2, CY + 0.9, FH - 2.6][r.slot]); },
    guard(m, a) { return E.P(m, a, CX - T06.ice - 1.0, CY); },
    protect(m, r) {
      const q = loc(m, r);
      if (m.total - m.t <= 20 && q.x < T06.lodge.x + 1.3 && q.y > T06.lodge.y - 0.2) return 'Lodge';
      return '';
    },
    onTeleop(m) { freeze06(m, 0); m.frozen = 1; },
    tick(m) {
      if (m.phase === 'tele' && m.frozen < 3 && m.t >= T06.freeze[m.frozen - 1]) { freeze06(m, m.frozen); m.frozen++; }
      // a stone left on the carpet goes to its alliance's human players
      for (let i = m.loose.length - 1; i >= 0; i--) { const p = m.loose[i]; if (p.until && m.t > p.until && !(p.claim && p.claimT > m.t)) { m.loose.splice(i, 1); m.ss[p.c].hp++; } }
      ['red', 'blue'].forEach(a => {
        const ss = m.ss[a], gap = 2.8 - 1.5 * hpK(m, a);
        [0, 1].forEach(i => { if (ss.hp > 0 && ss.q[i] < 2 && m.t >= ss.qT[i]) { ss.hp--; ss.q[i]++; ss.qT[i] = m.t + gap; } });
        // the last 30 seconds: three stones by hand down the lane, from behind the alliance wall
        if (m.inEnd && ss.hand > 0 && ss.hp > 0 && m.t >= ss.handT && m.total - m.t > 1.5) {
          ss.hand--; ss.hp--; ss.handT = m.t + 7;
          const w = E.P(m, a, 0, CY), g = Math.atan2(w.y - CY, w.x - CX), their = best06(m, opp(a)), own = best06(m, a);
          slide06(m, { x: CX + Math.cos(g) * T06.ice, y: CY + Math.sin(g) * T06.ice }, their && (!own || dC06(their) < dC06(own)) && hpK(m, a) > 0.7 ? 'takeout' : 'draw', { a, by: 0, sig: 1.25 - 0.95 * hpK(m, a), power: 2, curl: false });
          H.log(m, a, a.toUpperCase() + ' human player slides a stone down the lane', 'end');
        }
      });
    },
    autoDecide(m, r) {
      const tier = r.cap.autoTier || 0, max = m.S.autoPieces[tier], left = m.T.auto - m.t;
      if (!r.autoOK) return struggle(m, r, T06.line + 0.9);
      if (tier >= 1 && r.stats.shots < max && H.canScore(m, r)) {
        if (r.held > 0 && left > 3.5) return throw06(m, r);
        if (r.held === 0 && left > 9 && H.canCollect(m, r) && collect06(m, r)) return;
      }
      leave(m, r, T06.line + 0.9);
    },
    decide(m, r) {
      const canS = H.canScore(m, r), canC = H.canCollect(m, r);
      if (r.held >= cap06(r) && canS) return throw06(m, r);
      if (r.held > 0 && canS && !(canC && loc(m, r).x < 2.0)) return throw06(m, r);
      if (canC && collect06(m, r)) return;
      if (r.held > 0 && canS) return throw06(m, r);
      r.label = r.jam.intake > m.t ? 'Pickup jammed' : 'No stones left';
    },
    endSpot(m, r, lvl) {
      const d = [[0.6, FH - 0.55], [1.6, FH - 0.55], [1.1, FH - 1.4]][r.slot];
      return lvl >= 2 ? E.P(m, r.a, d[0], d[1]) : E.P(m, r.a, T06.lodge.x + 0.6, FH - 0.55 - r.slot * 0.6);
    },
    finishEnd(m) {
      freeze06(m, 3);
      ['red', 'blue'].forEach(a => { const ss = m.ss[a]; ss.deck = mates(m, a).filter(r => r.end && r.end.lvl >= 2 && !r.dead).length; m.score[a].end += endPts(m, a, [4, 10], 0); });
    },
    bonus(m, a) {
      const ss = m.ss[a], house = m.done ? ss.house : m.stones.filter(st => st.a === a && ring06(st) >= 0).length, deck = m.done ? ss.deck : mates(m, a).filter(r => r.end && r.end.lvl >= 2 && !r.dead).length;
      return [
        { key: 'house', name: 'Full House', val: house, thr: T06.rpH[lvlOf(m)], ok: m.done && house >= T06.rpH[lvlOf(m)], unit: 'stones' },
        { key: 'hammer', name: 'The Hammer', val: ss.hammer, thr: 3, ok: ss.hammer >= 3, unit: 'freezes' },
        { key: 'orders', name: 'Last Orders', val: deck, thr: 3, ok: deck >= 3, unit: 'on the deck' }
      ];
    },
    hud(m, a) {
      const ss = m.ss[a], own = best06(m, a), their = best06(m, opp(a)), mine = own && (!their || dC06(own) < dC06(their));
      const nx = m.phase === 'auto' ? m.T.auto - m.t : m.frozen < 3 ? T06.freeze[m.frozen - 1] - m.t : m.total - m.t;
      return ['HOUSE ' + m.stones.filter(st => st.a === a && ring06(st) >= 0).length, mine ? 'SHOT ROCK' : 'no shot rock', 'FREEZE IN ' + Math.max(0, Math.ceil(nx)) + ' s', 'STONES ' + (ss.hp + ss.q[0] + ss.q[1])];
    }
  };
  Rules[2106].defense = { eff: 1.2, foul: 1.0, range: 1.6, zone: 0.3, pin: 3, reset: 3, protMajor: true, credit: { Lodge: 2 } };
  Rules[2106].faults = { brown: 0.8, tip: 0.6, tipAll: 0.05, comms: 1.0 };
  S[2106].meta = { defense: false, note: 'The stones do the defending in DEEP FREEZE: a robot that can take out the other alliance\'s best stone before each freeze is worth more than one that bumps their sliders. Draw early (the first freeze counts double), keep a take-out for their shot rock, and save a stone for the last seconds.',
    faults: 'Common failures: launchers that drift out of calibration, stones dropped short of the ice, and robots spinning their wheels on the Lodge ramp.' };
  S[2106].tiebreak = 'Lodge';

  // =====================================================================
  // EVEN KEEL (2107)
  // Each alliance's SHIP stands stern to its own wall and rolls on its keel. Eight stack spots (m.ss[a].st: 0 to 3 along
  // the port rail, 4 to 7 along starboard), three containers high: tier 1 scores 2, tier 2 3, tier 3 5 (auto 4, 5, 7).
  // The ship's trim is counted in containers (mom07: + = port heavy): containers aboard, the Bosun's six ballast bags
  // (one bag = one container, moved one at a time between the two trays) and robots on the davits (four each).
  // Three or more out of trim and the ship LISTS: nothing placed scores until it is level again. At six the top
  // container of every stack on the heavy side slides off onto the carpet.
  // A well-run alliance (its drive teams' strategy) loads the light side; a poorly run one loads the side each robot
  // happens to be on. Containers: 12 in a row at mid-field, 13 at each alliance's Quay chutes (far corners), a preload
  // a robot. The Harbour is closed to opponents.
  // Endgame: a davit on each side of the bow (12 each), park 3; level at the buzzer with 12 or more aboard: +15.
  // =====================================================================
  const T07 = { line: 5.2, half: 0.76, sx: [0.75, 1.5, 2.25, 3.0], bow: 3.85, hx: 4.9, hh: 2.3, davit: { x: 3.5 }, quay: [{ x: FW - 0.8, y: 1.0 }, { x: FW - 0.8, y: FH - 1.0 }], pts: [2, 3, 5], apts: [4, 5, 7], rpL: [20, 21, 22] };
  Rules.T07 = T07;
  const aboard07 = ss => ss.st.reduce((n, s) => n + s.length, 0);
  const sideN07 = (ss, sd) => ss.st.slice(sd * 4, sd * 4 + 4).reduce((n, s) => n + s.length, 0);
  // out of trim, in containers: + port heavy, - starboard heavy
  function mom07(m, a) {
    const ss = m.ss[a]; let M = sideN07(ss, 0) - sideN07(ss, 1) + (2 * ss.bal - 6);
    mates(m, a).forEach(r => { if (r.end && r.end.lvl > 0 && !r.dead && r.mem.davit != null) M += r.mem.davit === 0 ? 4 : -4; });
    return M;
  }
  Rules.mom07 = mom07;
  const cap07 = r => Math.max(1, r.cap.storage || 1);
  // too far over: the top container of every stack on the heavy side goes overboard
  function slide07(m, a) {
    const ss = m.ss[a], M = mom07(m, a); if (Math.abs(M) < 6) return;
    const sd = M > 0 ? 0 : 1; let n = 0;
    for (let i = sd * 4; i < sd * 4 + 4; i++) if (ss.st[i].length) { ss.st[i].pop(); n++; const q = E.P(m, a, T07.sx[i % 4] + m.rng.range(-0.3, 0.3), CY + (sd ? 1 : -1) * m.rng.range(1.5, 2.1)); drop(m, q.x, q.y, { t: m.t + 1.5 }); }
    if (n) { ss.lost += n; H.log(m, a, a.toUpperCase() + ' ship lists too far: ' + n + ' container' + (n > 1 ? 's slide' : ' slides') + ' off', 'fault'); if (!m.headless) m.fx.push({ k: 'pop', x: E.P(m, a, 2, CY).x, y: CY, text: 'OVERBOARD!', t: m.t, a }); }
  }
  // which side this robot loads: the coach's call, the light side (a well-run alliance, or any alliance once the lights
  // flash), or the side the robot is on
  function side07(m, r) {
    const a = r.a, ss = m.ss[a], M = mom07(m, a), want = r.plan.target;
    if (want === 'port') return 0; if (want === 'star') return 1;
    const light = M > 0 ? 1 : M < 0 ? 0 : (loc(m, r).y < CY ? 0 : 1);
    return Math.abs(M) >= 3 || m.rng.chance(ss.coord) ? light : (loc(m, r).y < CY ? 0 : 1);
  }
  // the stack on that side for this robot: the tallest it can still add to if a partner can only do the low tiers (or
  // the coach says stack high), otherwise the lowest
  function stack07(m, r, sd) {
    const ss = m.ss[r.a], reach = Math.min(3, r.cap.reach || 1), free = i => ss.st[i].length < reach && !(ss.claim[i] && ss.claim[i].team !== r.team && ss.claim[i].until > m.t);
    const l = [0, 1, 2, 3].map(k => sd * 4 + k).filter(free); if (!l.length) return -1;
    const lowMate = mates(m, r.a).some(x => x !== r && !x.dead && !x.mem.broken && (x.cap.reach || 1) < reach);
    const tall = !isAuto(m) && (r.plan.target === 'high' || (lowMate && reach >= 2));
    return l.sort((p, q) => (tall ? ss.st[q].length - ss.st[p].length : ss.st[p].length - ss.st[q].length) || E.dist(r, E.P(m, r.a, T07.sx[p % 4], CY)) - E.dist(r, E.P(m, r.a, T07.sx[q % 4], CY)))[0];
  }
  function place07(m, r) {
    const a = r.a, ss = m.ss[a]; let sd = side07(m, r), i = stack07(m, r, sd);
    if (i < 0) { sd = 1 - sd; i = stack07(m, r, sd); }
    if (i < 0) return false;
    ss.claim[i] = { team: r.team, until: m.t + 9 };
    const sp = E.P(m, a, T07.sx[i % 4], CY + (sd ? 1 : -1) * (T07.half + RR + 0.12));
    H.moveTo(m, r, sp, () => {
      const put = () => {
        if (!H.canScore(m, r) || r.held <= 0) return;
        const h0 = ss.st[i].length, n = Math.min(r.held, 3 - h0, Math.max(1, (r.cap.reach || 1) - h0));
        if (n <= 0) return;
        H.act(r, H.scoreTime(m, r, [1.0, 1.25, 1.6][Math.min(2, h0 + n - 1)]) * (r.cap.wrist ? 0.68 : 1) * (n > 1 ? 1.3 : 1), () => {
          for (let k = 0; k < n; k++) {
            const tier = ss.st[i].length; r.held--; r.stats.shots++;
            if (tier >= 3) break;
            if (m.rng.chance(Math.min(0.99, H.hit(m, r, [1.08, 1.0, 0.9][tier])))) {
              const level = Math.abs(mom07(m, a)) < 3; // placed while the ship lists: aboard, but it scores nothing
              ss.st[i].push(level ? 1 : 0); r.stats.hits++;
              if (level) { const pts = (isAuto(m) ? T07.apts : T07.pts)[tier]; H.addPts(m, r, pts, '+' + pts, sp); } else if (!m.headless) m.fx.push({ k: 'pop', x: sp.x, y: sp.y, text: 'LISTING: 0', t: m.t, a });
              slide07(m, a);
            } else { const q = E.P(m, a, T07.sx[i % 4] + m.rng.range(-0.4, 0.4), CY + (sd ? 1 : -1) * m.rng.range(1.5, 2.1)); drop(m, q.x, q.y, { t: m.t + 1 }); r.label = 'Container fell'; }
          }
          if (r.held <= 0) { r.held = 0; r.heldType = null; }
          r.stats.cycles++;
        }, 'Stacking tier ' + (h0 + 1));
      };
      // the lights are flashing: hold a moment for the Bosun to level her before placing
      if (Math.abs(mom07(m, a)) >= 3 && !isAuto(m)) H.waitUntil(r, () => Math.abs(mom07(m, a)) < 3, put, 'Waiting for the ship to level', 3.5); else put();
    }, 'To the ship');
    return true;
  }
  function quayLoad07(m, r, i) {
    const ss = m.ss[r.a];
    if (!H.canCollect(m, r) || r.held >= cap07(r) || H.endDue(m, r)) return;
    if (ss.q[i] <= 0) { if (ss.hp > 0) H.waitUntil(r, () => m.ss[r.a].q[i] > 0, () => quayLoad07(m, r, i), 'Waiting at the Quay', 5); return; }
    H.act(r, H.collectTime(m, r, 'station', 1.1), () => { if (ss.q[i] <= 0) return; ss.q[i]--; r.held++; r.heldType = 'cont'; if (r.held < cap07(r) && (ss.q[i] > 0 || ss.hp > 0)) quayLoad07(m, r, i); }, 'Loading at the Quay');
  }
  function collect07(m, r) {
    const a = r.a, ss = m.ss[a], opts = [];
    if (r.held >= cap07(r) || !H.canCollect(m, r)) return false;
    if (r.cap.ground) { const p = nearLoose(m, r); if (p) opts.push({ k: 'g', p, t: H.travelEst(m, r, p) + 1.5 }); }
    T07.quay.forEach((y, i) => {
      if (ss.q[i] <= 0 && ss.hp <= 0) return;
      const p = E.P(m, a, y.x - 0.45, y.y);
      opts.push({ k: 'q', i, p, t: H.travelEst(m, r, p) + (ss.q[i] > 0 ? 0 : 2.5) + 1.4 + (H.spotUse(m, r, p) ? 2.5 : 0) });
    });
    if (!opts.length) return false;
    const best = opts.sort((p, q) => p.t - q.t)[0];
    if (best.k === 'g') grab(m, r, best.p, 1.25, 'Picking up a container', () => { r.held++; r.heldType = 'cont'; }, 'To a container');
    else H.moveTo(m, r, best.p, () => quayLoad07(m, r, best.i), 'To the Quay');
    return true;
  }
  Rules[2107] = {
    leavePts: 3, tempo: { c: 2.5, s: 2.2 },
    endgame: { levels: [{ name: 'Davit', pts: 12, time: 5.5, risk: 0.07, drop: 0.15 }], park: 3 },
    leftCheck: (m, r) => loc(m, r).x > T07.line + 0.35,
    endLevel(m, r) { return bestClimbers(m, r.a, 2).includes(r) ? 1 : 0; },
    init(m) {
      setHp(m);
      m.loose = []; m.obs = [];
      for (let i = 0; i < 12; i++) drop(m, CX, 0.75 + i * (FH - 1.5) / 11);
      ['red', 'blue'].forEach(a => {
        [0.75, 1.75, 2.75, 3.7].forEach(x => { const p = E.P(m, a, x, CY); m.obs.push({ x: p.x, y: p.y, r: 0.95, h: 0.72 }); });
        const st = mates(m, a).map(r => r.drv.strat == null ? 50 : r.drv.strat);
        m.ss[a] = { st: [[], [], [], [], [], [], [], []], claim: {}, bal: 3, balT: 0, lost: 0, hp: 13, q: [1, 1], qT: [0, 0], cast: false, coord: U.clamp(0.25 + 0.7 * (st.length ? U.avg(st) : 50) / 100, 0.3, 0.95), level: true, hangs: 0, aboard: 0 };
      });
      m.robots.forEach(r => { r.held = 1; r.heldType = 'cont'; });
    },
    start(m, r) { const p = [[1.6, 1.15], [T07.line - 0.5, CY], [1.6, FH - 1.15]][r.slot]; return E.P(m, r.a, p[0], p[1]); },
    guard(m, a) { return E.P(m, a, T07.hx + 0.8, CY); },
    protect(m, r) {
      const q = loc(m, r);
      if (q.x < T07.hx + 0.15 && Math.abs(q.y - CY) < T07.hh + 0.15) return 'Harbour';
      if (T07.quay.some(y => Math.hypot(q.x - y.x, q.y - y.y) < 1.6)) return 'Quay';
      return '';
    },
    onProtect(m, d, t, pz) {
      if (pz !== 'Harbour') return false;
      H.foul(m, d, true, 'Harbour');
      if (m.inEnd && t.endBusy && t.endLvl > 0 && !t.endCredit) { t.endCredit = 1; H.log(m, d.a, d.team + ' touched ' + t.team + ' at its davit: the hang is awarded', 'foul'); }
      return true;
    },
    onTeleop(m) { ['red', 'blue'].forEach(a => { const ss = m.ss[a]; ss.cast = aboard07(ss) >= 4 && Math.abs(mom07(m, a)) <= 1; if (ss.cast) H.log(m, a, 'CAST OFF: four containers aboard and the ship level', 'rp'); }); },
    tick(m) {
      ['red', 'blue'].forEach(a => {
        const ss = m.ss[a], gap = 3.4 - 1.8 * hpK(m, a);
        [0, 1].forEach(i => { if (ss.hp > 0 && ss.q[i] < 2 && m.t >= ss.qT[i]) { ss.hp--; ss.q[i]++; ss.qT[i] = m.t + gap; } });
        // the Bosun: one ballast bag at a time toward the light side, when the ship is two or more out of trim
        if (m.t >= ss.balT) {
          const M = mom07(m, a);
          if (M >= 2 && ss.bal > 0) { ss.bal--; ss.balT = m.t + 3.0 - 1.6 * hpK(m, a); } else if (M <= -2 && ss.bal < 6) { ss.bal++; ss.balT = m.t + 3.0 - 1.6 * hpK(m, a); }
        }
      });
    },
    autoDecide(m, r) {
      const tier = r.cap.autoTier || 0, max = m.S.autoPieces[tier], left = m.T.auto - m.t;
      if (r.mem.got == null) r.mem.got = 0;
      if (!r.autoOK) return struggle(m, r, T07.line + 0.9);
      if (tier >= 1 && r.mem.got < max && H.canScore(m, r)) {
        if (r.held > 0 && left > 3 && place07(m, r)) { r.mem.got += r.held; return; }
        if (r.held === 0 && left > 8 && r.cap.ground && H.canCollect(m, r)) {
          const p = nearLoose(m, r, null, 8);
          if (p) return grab(m, r, p, 1.25, 'Auto: picking up a container', () => { r.held++; r.heldType = 'cont'; }, 'Auto: to a container');
        }
      }
      leave(m, r, T07.line + 0.9);
    },
    decide(m, r) {
      const canS = H.canScore(m, r), canC = H.canCollect(m, r);
      if (r.held >= cap07(r) && canS && place07(m, r)) return;
      if (r.held > 0 && canS && !(canC && r.cap.ground && nearLoose(m, r, null, 2.4)) && place07(m, r)) return;
      if (r.held < cap07(r) && canC && aboard07(m.ss[r.a]) < 24 && collect07(m, r)) return;
      if (r.held > 0 && canS && place07(m, r)) return;
      r.label = r.jam.intake > m.t ? 'Intake jammed' : 'Nothing left to load';
    },
    endSpot(m, r, lvl) {
      if (!lvl) return E.P(m, r.a, T07.hx - 0.6, CY + (r.slot - 1) * 1.6);
      const i = Math.max(0, bestClimbers(m, r.a, 2).indexOf(r)) % 2; r.mem.davit = i;
      return E.P(m, r.a, T07.davit.x, CY + (i ? 1 : -1) * (T07.half + RR + 0.12));
    },
    finishEnd(m) {
      ['red', 'blue'].forEach(a => {
        const ss = m.ss[a]; ss.hangs = hangs(m, a); ss.aboard = aboard07(ss); ss.level = Math.abs(mom07(m, a)) <= 1;
        m.score[a].end += endPts(m, a, [12], 3) + (ss.level && ss.aboard >= 12 ? 15 : 0);
      });
    },
    bonus(m, a) {
      const ss = m.ss[a], thr = T07.rpL[lvlOf(m)], n = aboard07(ss), hg = m.done ? ss.hangs : hangs(m, a), lv = m.done ? ss.level : Math.abs(mom07(m, a)) <= 1;
      return [
        { key: 'cast', name: 'Cast Off', val: m.phase === 'auto' ? Math.min(4, n) : ss.cast ? 4 : 0, thr: 4, ok: !!ss.cast, unit: 'aboard in auto' },
        { key: 'laden', name: 'Laden', val: n, thr, ok: n >= thr, unit: 'containers' },
        { key: 'keel', name: 'Even Keel', val: hg, thr: 2, ok: hg >= 2 && lv, unit: 'hangs, level' }
      ];
    },
    hud(m, a) { const ss = m.ss[a], M = mom07(m, a); return ['ABOARD ' + aboard07(ss), Math.abs(M) >= 3 ? 'LISTING ' + (M > 0 ? 'PORT ' : 'STARBOARD ') + Math.abs(M) : Math.abs(M) <= 1 ? 'LEVEL' : (M > 0 ? 'port +' : 'starboard +') + Math.abs(M), 'BALLAST ' + ss.bal + '/' + (6 - ss.bal)]; }
  };
  Rules[2107].defense = { eff: 0.8, foul: 1.3, range: 1.6, zone: 0.3, pin: 3, reset: 3, protMajor: true };
  Rules[2107].faults = { brown: 0.9, tip: 2.0, tipAll: 0.3, comms: 1.0, tipDrv: true };
  S[2107].meta = { defense: false, note: 'Balance wins in EVEN KEEL: the Harbour is closed to opponents, so the only thing that stops a ship loading is its own list. Alliances that give each robot a side, and a Bosun who is quick with the ballast, load far more than faster robots that all pile onto the near rail.',
    faults: 'Common failures: tip-overs with the lift up beside the rail, containers dropped overboard, and a top tier sliding off a ship nobody was watching.' };
  S[2107].tiebreak = 'davit';

  // =====================================================================
  // MOTHERLODE (2108)
  // Ore lies loose on the carpet in three kinds (m.loose[].c): 'red' (copper), 'blue' (cobalt) and 'gold'. 20 of each
  // colour and two gold at the start; each of the two VEINS on the side walls holds 15 + 15 and four gold, and dumps
  // them (an avalanche) when a robot drives into its detonator in teleop (+5).
  // SKIP (own end): own ore 3 (6 in auto), gold 6 (9), the other colour -2. The ORE PASS under it: 1 a piece (2 in
  // auto), any colour; the human player sends the alliance's own colour back down the chute and the other colour back
  // onto the field. Ore in the Skip stays there.
  // A narrow intake takes the piece it is aimed at. A wide one takes its neighbours too: the wrong colour comes aboard
  // unless the driver notices and spits it out (awareness), or the intake sorts. A sweeper takes a whole pile in a pass.
  // Endgame: the alliance's best hoister pulls the chain: Halfway 10, Surface 25 + 1 per own ore aboard (30 at most).
  // A tow hook reaches the Surface only on a drivetrain with grip. The others park in the Claim (4).
  // =====================================================================
  const T08 = { line: 3.05, skip: { x: 0.95, y: CY }, cx: 2.75, ch: 1.85, ring: { x: 1.95, y: CY + 1.45 }, chute: { x: 0.6, y: 1.1 }, veins: [{ x: CX, y: 0.45 }, { x: CX, y: FH - 0.45 }], rpP: [40, 45, 50] };
  Rules.T08 = T08;
  const skip08 = (m, a) => E.P(m, a, T08.skip.x, T08.skip.y);
  const cap08 = r => Math.max(1, r.cap.storage || 1);
  const mine08 = (a, p) => p.c === a || p.c === 'gold';
  const type08 = r => (r.a === 'red' ? 'oreR' : 'oreB');
  function avalanche08(m, i) {
    const v = T08.veins[i], dn = v.y < CY ? 1 : -1;
    const put = c => drop(m, v.x + m.rng.range(-3.6, 3.6), v.y + dn * m.rng.range(0.5, 3.4), { c, t: m.t + m.rng.range(0.3, 1.5) });
    for (let k = 0; k < 15; k++) { put('red'); put('blue'); } for (let k = 0; k < 4; k++) put('gold');
    m.vein[i] = 0;
  }
  function fire08(m, r) {
    const a = r.a, ss = m.ss[a], open = [0, 1].filter(i => m.vein[i] && !(m.veinClaim[i] && m.veinClaim[i].team !== r.team && m.veinClaim[i].until > m.t));
    if (!open.length || isAuto(m) || r.plan.target === 'hold' || H.endDue(m, r) || m.total - m.t < m.T.end + 8) return false;
    const left = m.loose.filter(p => p.c === a && p.t <= m.t + 1).length;
    if (r.plan.target !== 'fire' && (left >= 7 || ss.fireT > m.t)) return false; // plenty of its colour still lying about, or a partner is on its way
    ss.fireT = m.t + 14;
    const i = open.sort((p, q) => E.dist(r, T08.veins[p]) - E.dist(r, T08.veins[q]))[0], v = T08.veins[i];
    m.veinClaim[i] = { team: r.team, until: m.t + 10 };
    H.moveTo(m, r, { x: v.x + (r.x < CX ? -0.5 : 0.5), y: v.y + (v.y < CY ? 1 : -1) * (0.55 + RR) }, () => {
      if (!m.vein[i]) return;
      H.act(r, 0.6, () => { if (!m.vein[i]) return; avalanche08(m, i); ss.fired++; H.addPts(m, r, 5, 'AVALANCHE +5'); H.log(m, a, r.team + ' fires a vein: avalanche', 'rp'); }, 'Firing the vein');
    }, 'To a detonator');
    return true;
  }
  // take one piece on board (colour counted); a hopper that is full takes no more
  function take08(m, r, p) {
    const i = m.loose.indexOf(p); if (i < 0 || r.held >= cap08(r)) return false;
    m.loose.splice(i, 1); r.held++; r.heldType = type08(r);
    if (p.c === 'gold') r.mem.gold = (r.mem.gold || 0) + 1; else if (p.c !== r.a) r.mem.bad = (r.mem.bad || 0) + 1;
    return true;
  }
  function collect08(m, r) {
    const a = r.a, c = r.cap, ss = m.ss[a];
    if (r.held >= cap08(r) || !H.canCollect(m, r)) return false;
    const gold = r.plan.target === 'gold' ? nearLoose(m, r, p => p.c === 'gold', 9) : null, p = gold || nearLoose(m, r, x => mine08(a, x));
    if (!p) {
      if (ss.hp > 0) { H.moveTo(m, r, E.P(m, a, T08.chute.x + 0.45, T08.chute.y), () => { if (!H.canCollect(m, r) || ss.hp <= 0) return; const n = Math.min(ss.hp, cap08(r) - r.held); H.act(r, n * H.collectTime(m, r, 'station', 0.55), () => { const k = Math.min(n, ss.hp, cap08(r) - r.held); ss.hp -= k; r.held += k; r.heldType = type08(r); }, 'Loading at the chute'); }, 'To the chute'); return true; }
      return false;
    }
    p.claim = r.team; p.claimT = m.t + 6;
    H.moveTo(m, r, { x: p.x, y: p.y }, () => {
      if (!H.canCollect(m, r) || !m.loose.includes(p)) return;
      const reach = c.sweep ? 2.1 : c.wide > 1 ? 1.15 : 0, room = cap08(r) - r.held;
      const more = reach ? m.loose.filter(x => x !== p && x.t <= m.t && mine08(a, x) && Math.hypot(x.x - p.x, x.y - p.y) < reach && !(x.claim && x.claim !== r.team && x.claimT > m.t)).slice(0, room - 1) : [];
      H.act(r, (H.collectTime(m, r, 'ground', 0.9) + more.length * H.collectTime(m, r, 'ground', c.sweep ? 0.22 : 0.4)) / (c.wide || 1), () => {
        if (!take08(m, r, p)) return;
        more.forEach(x => take08(m, r, x));
        if (m.phase === 'auto') r.mem.got = (r.mem.got || 0) + 1 + more.length;
        // the other colour lying among them: a sorting intake kicks it out, a wide one swallows some of it, a narrow one now and then
        if (!c.sort) {
          const near = m.loose.filter(x => x.t <= m.t && x.c !== a && x.c !== 'gold' && Math.hypot(x.x - p.x, x.y - p.y) < (c.sloppy ? 0.85 : 0.4));
          near.forEach(x => { if (r.held < cap08(r) && m.rng.chance(c.sloppy ? 0.5 : 0.12)) take08(m, r, x); });
          // the driver may see it and spit it out before it reaches the Skip
          let bad = r.mem.bad || 0;
          for (let k = bad; k > 0; k--) if (m.rng.chance(0.3 + 0.6 * (r.drv.aware == null ? 50 : r.drv.aware) / 100)) { r.mem.bad--; r.held--; drop(m, r.x + m.rng.range(-0.8, 0.8), r.y + m.rng.range(-0.8, 0.8), { c: opp(a), t: m.t + 0.5 }); }
        }
      }, more.length ? 'Sweeping up ore' : 'Intaking ore');
    }, p.c === 'gold' ? 'To a gold nugget' : 'To ore');
    return true;
  }
  function score08(m, r) {
    const a = r.a, c = r.cap, ss = m.ss[a], skip = skip08(m, a);
    if (c.lowOnly) {
      return H.moveTo(m, r, E.P(m, a, T08.skip.x + 0.62 + RR, CY + (r.slot - 1) * 0.5), () => {
        if (!H.canScore(m, r)) return;
        const n = r.held;
        H.act(r, 0.4 + n * H.scoreTime(m, r, 0.3), () => {
          const bad = r.mem.bad || 0, pts = n * (isAuto(m) ? 2 : 1);
          ss.pass += n; ss.hp += n - bad; for (let k = 0; k < bad; k++) drop(m, CX + m.rng.range(-2, 2), CY + m.rng.range(-3, 3), { c: opp(a), t: m.t + m.rng.range(3, 9) });
          r.stats.shots += n; r.stats.hits += n; r.held = 0; r.heldType = null; r.mem.bad = 0; r.mem.gold = 0; r.stats.cycles++;
          H.addPts(m, r, pts, 'ORE PASS +' + pts, skip);
        }, 'Feeding the Ore Pass');
      }, 'To the Ore Pass');
    }
    H.moveTo(m, r, H.clearOf(m, H.shootSpot(m, r, skip, null), false, false, r), () => {
      if (!H.canScore(m, r)) return;
      H.act(r, H.aimTime(m, r), () => {
        const go = () => {
          if (r.held <= 0 || !H.canScore(m, r) || H.endDue(m, r)) return;
          H.act(r, H.scoreTime(m, r, 0.4), () => {
            // what comes out first: gold, then the right colour, and whatever is wrong with the rest
            const kind = (r.mem.gold || 0) > 0 ? 'gold' : r.held - (r.mem.bad || 0) > 0 ? 'own' : 'bad';
            const hit = m.rng.chance(H.hit(m, r, 0.95, H.rangePen(m, r, skip)));
            r.held--; r.stats.shots++; if (kind === 'gold') r.mem.gold--; else if (kind === 'bad') r.mem.bad--;
            H.shotFx(m, r, skip, hit);
            if (hit) {
              const pts = kind === 'gold' ? (isAuto(m) ? 9 : 6) : kind === 'own' ? (isAuto(m) ? 6 : 3) : -2;
              if (kind === 'gold') ss.gold++; else if (kind === 'own') { ss.ore++; if (isAuto(m)) ss.autoOre++; } else ss.bad++;
              if (kind !== 'bad') r.stats.hits++;
              H.addPts(m, r, pts, (pts > 0 ? '+' : '') + pts, skip);
            } else { const q = E.P(m, a, m.rng.range(1.7, 2.9), CY + m.rng.range(-1.9, 1.9)); drop(m, q.x, q.y, { c: kind === 'gold' ? 'gold' : kind === 'own' ? a : opp(a), t: m.t + 0.8 }); }
            if (r.held > 0) go(); else { r.heldType = null; r.stats.cycles++; }
          }, 'Shooting into the Skip');
        };
        go();
      }, 'Aiming');
    }, 'To shoot');
  }
  const hoister08 = (m, a) => bestClimbers(m, a, 1)[0] || null;
  Rules[2108] = {
    leavePts: 3, tempo: { c: 2.4, s: 2.1 },
    endgame: { levels: [{ name: 'Halfway', pts: 10, time: 4, risk: 0.03 }, { name: 'Surface', pts: 25, time: 8, risk: 0.08 }], park: 4 },
    leftCheck: (m, r) => loc(m, r).x > T08.line + 0.35,
    aimAt: (m, r) => (r.held > 0 && !r.cap.lowOnly ? skip08(m, r.a) : null),
    // one hoister per alliance; a tow hook needs a drivetrain with grip to reach the Surface
    endLevel(m, r) {
      if (hoister08(m, r.a) !== r) return 0;
      return r.cap.tow && ((r.cap.push || 0) < 58 || r.cap.noGrip) ? 1 : (r.cap.endLevel || 0);
    },
    init(m) {
      setHp(m);
      m.loose = []; m.obs = []; m.vein = [1, 1]; m.veinClaim = {};
      ['red', 'blue'].forEach(a => { const p = skip08(m, a); m.obs.push({ x: p.x, y: p.y, r: 0.9, h: 0.6 }); m.ss[a] = { ore: 0, autoOre: 0, gold: 0, bad: 0, pass: 0, hp: 0, fired: 0, fireT: 0, surface: false, half: false }; });
      for (let k = 0; k < 20; k++) ['red', 'blue'].forEach(c => drop(m, m.rng.range(3.4, FW - 3.4), m.rng.range(0.8, FH - 0.8), { c }));
      drop(m, CX - 1.2, CY - 1.0, { c: 'gold' }); drop(m, CX + 1.2, CY + 1.0, { c: 'gold' });
      m.robots.forEach(r => { r.held = Math.min(3, cap08(r)); r.heldType = type08(r); r.mem.bad = 0; r.mem.gold = 0; });
    },
    start(m, r) { return E.P(m, r.a, 2.4, [1.2, CY - 2.4, FH - 1.2][r.slot]); },
    guard(m, a) { return E.P(m, a, T08.cx + 0.9, CY); },
    protect(m, r) { const q = loc(m, r); return q.x < T08.cx + 0.15 && Math.abs(q.y - CY) < T08.ch + 0.15 ? 'Claim' : ''; },
    onProtect(m, d, t, pz) {
      H.foul(m, d, true, 'Claim');
      if (m.inEnd && t.endBusy && t.endLvl > 0 && !(t.endCredit >= 2)) { t.endCredit = 2; H.log(m, d.a, d.team + ' touched ' + t.team + ' on its Hoist Chain: the Surface is awarded', 'foul'); }
      return true;
    },
    autoDecide(m, r) {
      const tier = r.cap.autoTier || 0, max = m.S.autoPieces[tier], left = m.T.auto - m.t;
      if (r.mem.got == null) r.mem.got = Math.min(3, r.held);
      if (!r.autoOK) return struggle(m, r, T08.line + 0.9);
      if (tier >= 1 && H.canScore(m, r)) {
        if (r.held > 0 && left > 3 && (r.held >= cap08(r) || r.mem.got >= max || left < 9 || !r.left)) return score08(m, r);
        if (r.held < cap08(r) && r.mem.got < max && left > 7 && H.canCollect(m, r) && collect08(m, r)) return;
        if (r.held > 0 && left > 3) return score08(m, r);
      }
      leave(m, r, T08.line + 0.9);
    },
    decide(m, r) {
      const capN = cap08(r), canS = H.canScore(m, r), canC = H.canCollect(m, r);
      if (r.held >= capN && canS) return score08(m, r);
      if (r.held === 0 && fire08(m, r)) return; // out of ore (or the coach says so): somebody goes to a detonator
      if (r.held > 0 && canS && !(canC && nearLoose(m, r, x => mine08(r.a, x), 3.2))) return score08(m, r);
      if (canC && collect08(m, r)) return;
      if (r.held > 0 && canS) return score08(m, r);
      if (fire08(m, r)) return;
      r.label = r.jam.intake > m.t ? 'Intake jammed' : 'No ore of its colour left';
    },
    tick(m) {
      // an alliance short of ore sends its nearest idle robot to a detonator (the decide step does it); ore the human
      // player holds for too long is the referee's business, not the simulation's
    },
    endSpot(m, r, lvl) { return lvl ? E.P(m, r.a, T08.ring.x, T08.ring.y) : E.P(m, r.a, T08.cx - 0.7, CY - 0.4 - r.slot * 0.75); },
    finishEnd(m) {
      ['red', 'blue'].forEach(a => {
        const ss = m.ss[a], h = hoister08(m, a); let e = 0;
        mates(m, a).forEach(r => {
          if (!r.end || r.dead) return;
          // a pull for the Surface that stalls still leaves the Skip on the Halfway catch
          const lvl = r.end.lvl > 0 ? r.end.lvl : (r === h && r.end.failed && r.endLvl === 2 ? 1 : 0);
          const p = lvl === 2 ? 25 + Math.min(30, ss.ore) : lvl === 1 ? 10 : r.end.park ? 4 : 0;
          if (lvl === 2) ss.surface = true; if (lvl >= 1) ss.half = true;
          e += p; r.stats.pts += p;
        });
        ss.endPts = e; m.score[a].end += e;
      });
    },
    bonus(m, a) {
      const ss = m.ss[a], thr = T08.rpP[lvlOf(m)], up = m.done ? ss.surface : mates(m, a).some(r => r.end && r.end.lvl === 2 && !r.dead);
      return [
        { key: 'prospect', name: 'Prospect', val: ss.autoOre, thr: 8, ok: ss.autoOre >= 8, unit: 'ore in auto' },
        { key: 'payload', name: 'Payload', val: ss.ore, thr, ok: ss.ore >= thr && up, unit: 'ore, at the Surface' },
        { key: 'gold', name: 'Gold Rush', val: ss.gold, thr: 5, ok: ss.gold >= 5, unit: 'gold' }
      ];
    },
    hud(m, a) { const ss = m.ss[a]; return ['SKIP ' + ss.ore + ' ore · ' + ss.gold + ' gold' + (ss.bad ? ' · ' + ss.bad + ' wrong' : ''), 'VEINS ' + (m.vein[0] + m.vein[1]), 'LOOSE ' + m.loose.filter(p => p.c === a).length]; }
  };
  Rules[2108].defense = { eff: 1.6, foul: 0.9, range: 1.7, zone: 0.4, pin: 3, reset: 3, protMajor: true };
  Rules[2108].faults = { brown: 1.5, tip: 0.8, tipAll: 0.1, comms: 1.1 };
  S[2108].meta = { defense: true, note: 'Sorting wins in MOTHERLODE: the field holds as much of their ore as yours, and theirs costs you two points a piece. A defender in the mixed piles at mid-field spoils the careful pickups of a robot without a sorter, and a vein fired at the right moment feeds your alliance while theirs is at the far end.',
    faults: 'Common failures: brownouts from wide intakes and shooters running together, ore jammed in the sorter, and a tow hook that slips off the ring half way up.' };
  S[2108].tiebreak = 'hoist';

  // =====================================================================
  // SIGNAL FIRE (2109)
  // Seven BEACON POSTS (m.posts): a Home post in front of each alliance wall, four Field posts and the tall Centre post.
  // Each holds nine rings (the Centre post eleven), kept in the order they went on. A post is OWNED by the colour with
  // more rings on it, or the colour of the top ring when they are level. A ring scores 1 (3 in auto). Every 10 s of
  // teleop the field PULSES: 1 point per post owned, 2 for the Centre post (14 pulses). Posts owned when auto ends
  // score 4 (Centre 8), at the final buzzer 6 (Centre 12).
  // Rings: 30 per alliance: six on the carpet in its half, a preload a robot, the rest at the chutes on its wall. The
  // Keeper (a human player) tosses rings at the Home post when it needs them. Rings never come off a post.
  // Where a robot takes its next ring: the post where it changes or secures the most ownership for the time left,
  // for the drive it costs (value09).
  // Endgame: the Lighthouse bar in each alliance's corner: 12 a hang (room for two), park 3.
  // =====================================================================
  const T09 = { line: 3.05, posts: [{ k: 'HOME', x: 1.83, y: CY, cap: 9, base: 1, home: 'blue' }, { k: 'F1', x: CX - 3.05, y: CY - 2.13, cap: 9, base: 1 }, { k: 'F2', x: CX - 3.05, y: CY + 2.13, cap: 9, base: 1 },
    { k: 'CENTRE', x: CX, y: CY, cap: 11, base: 2, tall: true }, { k: 'F3', x: CX + 3.05, y: CY - 2.13, cap: 9, base: 1 }, { k: 'F4', x: CX + 3.05, y: CY + 2.13, cap: 9, base: 1 }, { k: 'HOME', x: FW - 1.83, y: CY, cap: 9, base: 1, home: 'red' }],
    chutes: [{ x: 0.6, y: CY - 2.3 }, { x: 0.6, y: CY + 2.3 }], bar: { x0: 0.9, x1: 2.45, y: 0.7 }, floor: [[3.4, 1.5], [3.4, FH - 1.5], [4.6, CY], [5.9, 0.9], [5.9, FH - 0.9], [6.8, CY - 1.0]], rpW: [60, 66, 72] };
  Rules.T09 = T09;
  const cnt09 = (p, a) => p.rings.reduce((n, c) => n + (c === a ? 1 : 0), 0);
  const owner09 = p => { const r = cnt09(p, 'red'), b = p.rings.length - r; return r > b ? 'red' : b > r ? 'blue' : p.rings.length ? p.rings[p.rings.length - 1] : null; };
  Rules.owner09 = owner09;
  const owned09 = (m, a) => m.posts.filter(p => owner09(p) === a);
  const cap09 = r => Math.max(1, r.cap.storage || 1);
  const type09 = r => (r.a === 'red' ? 'ringR' : 'ringB');
  // what a ring (or two) on post p is worth to robot r, in points to the end of the match
  function value09(m, r, p) {
    if (p.rings.length >= p.cap || (p.tall && (r.cap.reach || 1) < 2)) return 0;
    const a = r.a, o = opp(a), mine = cnt09(p, a), theirs = cnt09(p, o), room = p.cap - p.rings.length, own = owner09(p);
    const n = Math.min(room, r.cap.both && r.held >= 2 ? 2 : 1), after = mine + n, half = p.cap / 2;
    const hold = p.base * (Math.max(0, m.total - m.t - 6) / 10 + 6); // owning it from here to the buzzer
    let v;
    if (mine > half) v = 0;                                           // already ours for good
    else if (own === a) { const lead = mine - theirs; v = (after > half ? 0.5 : lead <= 0 ? 0.55 : lead === 1 ? 0.3 : 0.1) * hold; }
    else if (after >= theirs) v = (own === o ? 2 : 1) * hold * (after > half ? 1.15 : 1); // our ring on top wins a level count
    else v = theirs > half ? 0 : theirs - after <= Math.min(room - n, 2) ? 0.25 * hold : 0; // a first step toward taking it
    const far = a === 'blue' ? p.x > CX + 0.5 : p.x < CX - 0.5, near = a === 'blue' ? p.x < CX - 0.5 : p.x > CX + 0.5, t = r.plan.target;
    if (t === 'near' && near) v *= 1.6; if (t === 'centre' && p.tall) v *= 1.9; if (t === 'raid' && far) v *= 1.7;
    if (p.home === o) v *= 0.7; // their Keeper answers every ring there
    if (p.go && p.go.a === a && p.go.team !== r.team && p.go.until > m.t) v *= 0.45; // a partner is already on its way to it
    return v + n;
  }
  function place09(m, r) {
    const a = r.a, ss = m.ss[a];
    let best = null, bv = 0;
    m.posts.forEach(p => { const v = value09(m, r, p); if (v <= 0) return; const sc = v / (H.travelEst(m, r, p) + 3.5); if (sc > bv) { bv = sc; best = p; } });
    if (!best) return false;
    best.go = { a, team: r.team, until: m.t + 8 };
    const dx = r.x - best.x, dy = r.y - best.y, dl = Math.hypot(dx, dy) || 1, d = 0.2 + RR + 0.1;
    H.moveTo(m, r, H.clearOf(m, { x: best.x + dx / dl * d, y: best.y + dy / dl * d }, false, false, r), () => {
      if (!H.canScore(m, r) || best.rings.length >= best.cap) return;
      const n = Math.min(r.held, best.cap - best.rings.length, r.cap.both ? 2 : 1);
      H.act(r, H.scoreTime(m, r, best.tall ? 1.45 : 1.05) * (r.cap.wrist ? 0.7 : 1) * (n > 1 ? 1.2 : 1), () => {
        for (let k = 0; k < n; k++) {
          r.held--; r.stats.shots++;
          if (best.rings.length >= best.cap) { drop(m, best.x + m.rng.range(-0.8, 0.8), best.y + m.rng.range(-0.8, 0.8), { c: a, t: m.t + 0.6 }); continue; }
          if (m.rng.chance(Math.min(0.99, H.hit(m, r, best.tall ? 0.95 : 1.06)))) {
            best.rings.push(a); best.by[r.team] = (best.by[r.team] || 0) + 1; ss.rings++; r.stats.hits++;
            H.addPts(m, r, isAuto(m) ? 3 : 1, '+' + (isAuto(m) ? 3 : 1), best);
          } else { drop(m, best.x + m.rng.range(-0.9, 0.9), best.y + m.rng.range(-0.9, 0.9), { c: a, t: m.t + 0.6 }); r.label = 'Ring missed the post'; }
        }
        if (r.held <= 0) { r.held = 0; r.heldType = null; }
        r.stats.cycles++;
      }, 'Dropping a ring on the ' + (best.tall ? 'Centre' : best.home ? 'Home' : 'Field') + ' post');
    }, 'To a post');
    return true;
  }
  function chuteLoad09(m, r, i) {
    const ss = m.ss[r.a];
    if (!H.canCollect(m, r) || r.held >= cap09(r) || H.endDue(m, r)) return;
    if (ss.q[i] <= 0) { if (ss.hp > 0) H.waitUntil(r, () => m.ss[r.a].q[i] > 0, () => chuteLoad09(m, r, i), 'Waiting at the chute', 5); return; }
    H.act(r, H.collectTime(m, r, 'station', 0.9), () => { if (ss.q[i] <= 0) return; ss.q[i]--; r.held++; r.heldType = type09(r); if (r.held < cap09(r) && (ss.q[i] > 0 || ss.hp > 0)) chuteLoad09(m, r, i); }, 'Loading rings');
  }
  function collect09(m, r) {
    const a = r.a, ss = m.ss[a], opts = [];
    if (r.held >= cap09(r) || !H.canCollect(m, r)) return false;
    if (r.cap.ground) { const p = nearLoose(m, r, x => x.c === a); if (p) opts.push({ k: 'g', p, t: H.travelEst(m, r, p) + 1.3 }); }
    T09.chutes.forEach((y, i) => {
      if (ss.q[i] <= 0 && ss.hp <= 0) return;
      const p = E.P(m, a, y.x + 0.45, y.y);
      opts.push({ k: 'c', i, p, t: H.travelEst(m, r, p) + (ss.q[i] > 0 ? 0 : 2.5) + 1.2 + (H.spotUse(m, r, p) ? 2.5 : 0) });
    });
    if (!opts.length) return false;
    const best = opts.sort((p, q) => p.t - q.t)[0];
    if (best.k === 'g') grab(m, r, best.p, 1.1, 'Picking up a ring', () => { r.held++; r.heldType = type09(r); }, 'To a ring');
    else H.moveTo(m, r, best.p, () => chuteLoad09(m, r, best.i), 'To the chute');
    return true;
  }
  // one pulse: a point for every post owned (the Centre post two), shared among the robots whose rings are on it
  function pulse09(m) {
    m.pulses++;
    m.posts.forEach(p => {
      const a = owner09(p); if (!a) return;
      m.score[a].tele += p.base; m.ss[a].pulse += p.base;
      const rs = mates(m, a).filter(r => p.by[r.team]), tot = rs.reduce((n, r) => n + p.by[r.team], 0);
      rs.forEach(r => { r.mem.pf = (r.mem.pf || 0) + p.base * p.by[r.team] / tot; const w = Math.floor(r.mem.pf); if (w > 0) { r.stats.pts += w; r.mem.pf -= w; } });
    });
    if (!m.headless) m.fx.push({ k: 'pop', x: CX, y: 0.6, text: 'PULSE  R ' + owned09(m, 'red').reduce((n, p) => n + p.base, 0) + '  B ' + owned09(m, 'blue').reduce((n, p) => n + p.base, 0), t: m.t, a: owned09(m, 'red').length > owned09(m, 'blue').length ? 'red' : 'blue' });
  }
  Rules[2109] = {
    leavePts: 3, tempo: { c: 2.4, s: 2.1 },
    endgame: { levels: [{ name: 'Lighthouse', pts: 12, time: 5.5, risk: 0.06, drop: 0.15 }], park: 3 },
    leftCheck: (m, r) => loc(m, r).x > T09.line + 0.35,
    endLevel(m, r) { return bestClimbers(m, r.a, 2).includes(r) ? 1 : 0; },
    init(m) {
      setHp(m);
      m.loose = []; m.pulses = 0;
      m.posts = T09.posts.map(p => Object.assign({}, p, { rings: [], by: {}, go: null }));
      m.obs = m.posts.map(p => ({ x: p.x, y: p.y, r: 0.42, h: 0.14 }));
      ['red', 'blue'].forEach(a => {
        m.ss[a] = { rings: 0, pulse: 0, hp: 19, q: [1, 1], qT: [0, 0], keepT: 0, tosses: 0, autoOwn: 0, endOwn: 0, hangs: 0, centre: false };
        T09.floor.forEach(q => { const p = E.P(m, a, q[0], q[1]); drop(m, p.x, p.y, { c: a }); });
      });
      m.robots.forEach(r => { r.held = 1; r.heldType = type09(r); });
    },
    start(m, r) { return E.P(m, r.a, 2.6, [CY - 2.6, CY + 1.3, FH - 1.2][r.slot]); },
    guard(m, a) { return E.P(m, a, CX - 1.4, CY); },
    protect(m, r) {
      const hp = m.posts.find(p => p.home === r.a);
      if (hp && E.dist(r, hp) < 0.9 + RR + 0.1) return 'Home Ring';
      const q = loc(m, r);
      if (m.total - m.t <= 30 && q.x < T09.bar.x1 + 0.8 && q.y < T09.bar.y + 1.5) return 'Lighthouse';
      return '';
    },
    onTeleop(m) {
      ['red', 'blue'].forEach(a => { const ow = owned09(m, a), pts = ow.reduce((n, p) => n + 4 * p.base, 0); m.ss[a].autoOwn = ow.length; if (pts) m.score[a].auto += pts; });
    },
    tick(m) {
      if (m.phase === 'tele' && m.pulses < 13 && m.t >= m.T.auto + 10 * (m.pulses + 1) - 1e-6) pulse09(m);
      ['red', 'blue'].forEach(a => {
        const ss = m.ss[a], gap = 2.6 - 1.3 * hpK(m, a);
        [0, 1].forEach(i => { if (ss.hp > 0 && ss.q[i] < 2 && m.t >= ss.qT[i]) { ss.hp--; ss.q[i]++; ss.qT[i] = m.t + gap; } });
        // the Keeper: a ring tossed at the Home post when it is not safely the alliance's own
        const hp = m.posts.find(p => p.home === a);
        if (m.phase === 'tele' && ss.hp > 0 && m.t >= ss.keepT && hp.rings.length < hp.cap && cnt09(hp, a) <= hp.cap / 2 && cnt09(hp, a) - cnt09(hp, opp(a)) < 2) {
          ss.keepT = m.t + 8 - 3.5 * hpK(m, a); ss.hp--; ss.tosses++;
          const hit = m.rng.chance(0.2 + 0.55 * hpK(m, a));
          if (!m.headless) { const w = E.P(m, a, 0.2, CY); m.fx.push({ k: 'shot', x0: w.x, y0: w.y, x1: hp.x, y1: hp.y, t: m.t, hit, a }); }
          if (hit) { hp.rings.push(a); ss.rings++; m.score[a].tele += 1; } else drop(m, hp.x + m.rng.range(-1, 1), hp.y + m.rng.range(-1, 1), { c: a, t: m.t + 0.8 });
        }
      });
    },
    autoDecide(m, r) {
      const tier = r.cap.autoTier || 0, max = m.S.autoPieces[tier], left = m.T.auto - m.t;
      if (r.mem.got == null) r.mem.got = 0;
      if (!r.autoOK) return struggle(m, r, T09.line + 0.9);
      if (tier >= 1 && r.mem.got < max && H.canScore(m, r)) {
        if (r.held > 0 && left > 3 && place09(m, r)) { r.mem.got += r.held; return; }
        if (r.held === 0 && left > 7 && r.cap.ground && H.canCollect(m, r)) {
          const p = nearLoose(m, r, x => x.c === r.a, 8);
          if (p) return grab(m, r, p, 1.1, 'Auto: picking up a ring', () => { r.held++; r.heldType = type09(r); }, 'Auto: to a ring');
        }
      }
      leave(m, r, T09.line + 0.9);
    },
    decide(m, r) {
      const canS = H.canScore(m, r), canC = H.canCollect(m, r);
      if (r.held >= cap09(r) && canS && place09(m, r)) return;
      if (r.held > 0 && canS && !(canC && ((r.cap.ground && nearLoose(m, r, x => x.c === r.a, 2.4)) || loc(m, r).x < 1.6)) && place09(m, r)) return;
      if (r.held < cap09(r) && canC && collect09(m, r)) return;
      if (r.held > 0 && canS && place09(m, r)) return;
      r.label = r.jam.intake > m.t ? 'Intake jammed' : r.held ? 'No post worth a ring' : 'No rings left';
    },
    endSpot(m, r, lvl) {
      if (!lvl) return E.P(m, r.a, T09.bar.x0 + 0.4 + r.slot * 0.9, T09.bar.y + 1.3);
      const i = Math.max(0, bestClimbers(m, r.a, 2).indexOf(r)) % 2;
      return E.P(m, r.a, T09.bar.x0 + 0.38 + i * 0.86, T09.bar.y + RR + 0.1);
    },
    finishEnd(m) {
      while (m.pulses < 14) pulse09(m);
      ['red', 'blue'].forEach(a => {
        const ss = m.ss[a], ow = owned09(m, a);
        ss.endOwn = ow.length; ss.centre = ow.some(p => p.tall); ss.hangs = hangs(m, a);
        m.score[a].tele += ow.reduce((n, p) => n + 6 * p.base, 0);
        m.score[a].end += endPts(m, a, [12], 3);
      });
    },
    bonus(m, a) {
      const ss = m.ss[a], thr = T09.rpW[lvlOf(m)], ow = owned09(m, a), hg = m.done ? ss.hangs : hangs(m, a), ctr = ow.some(p => p.tall);
      return [
        { key: 'coast', name: 'Coastline', val: ow.length, thr: 5, ok: m.done && ow.length >= 5, unit: 'posts' },
        { key: 'watch', name: 'Long Watch', val: ss.pulse, thr, ok: ss.pulse >= thr, unit: 'pulse pts' },
        { key: 'lamp', name: 'Lamplighter', val: hg, thr: 2, ok: m.done && hg >= 2 && ctr, unit: 'hangs, Centre' }
      ];
    },
    hud(m, a) { const ss = m.ss[a], ow = owned09(m, a); return ['POSTS ' + ow.length + '/7' + (ow.some(p => p.tall) ? ' + CENTRE' : ''), 'PULSE ' + ss.pulse, 'NEXT PULSE ' + Math.max(0, Math.ceil(m.T.auto + 10 * (m.pulses + 1) - m.t)) + ' s', 'RINGS LEFT ' + (ss.hp + ss.q[0] + ss.q[1])]; }
  };
  Rules[2109].defense = { eff: 1.3, foul: 1.0, range: 1.7, zone: 0.4, pin: 3, reset: 3, protMajor: true, credit: { Lighthouse: 1 } };
  Rules[2109].faults = { brown: 0.9, tip: 1.6, tipAll: 0.25, comms: 1.0, tipDrv: true };
  S[2109].meta = { defense: true, note: 'Ground wins in SIGNAL FIRE: points come from holding posts over time, so an early lead compounds and every ring is a choice between locking a near post and contesting a far one. A defender on the road to the Centre post is worth a ring every time it makes a carrier late for a pulse.',
    faults: 'Common failures: tip-overs with the arm out over the Centre post, rings dropped beside a post, and falls from the Lighthouse bar.' };
  S[2109].tiebreak = 'Lighthouse';

  // =====================================================================
  // BRIDGEWORK (2110)
  // A RIVER across the middle of the field: no robot crosses it except over an OPEN Crossing. Three Crossings
  // (m.cross: north, centre, south), each of five deck panels laid from either bank by either alliance; the fifth
  // opens it for everybody (10 points to the alliance that laid three or more; 15 in auto), a panel is 2 (4 in auto).
  // Crates: 20 on each bank (10 on the carpet, 10 at that alliance's chute). HOME DOCK on the alliance's own wall:
  // low 2, high 3 (auto 4, 5); they stay there. EXPORT DOCK in a far corner, on the other bank: low 6, high 8; exported
  // crates go to the other alliance's human players. A robot with no panel handler cannot build.
  // An alliance that builds (most do, if it has a handler) sends its weakest scorers with a handler to open the
  // Crossing nearest its Export Dock; some go on to open all three for the Linked RP, which both alliances earn.
  // Endgame: standing on an open Crossing 8 (one robot a Crossing), +10 for two; the Arch over the centre Crossing 15
  // (one robot per alliance, from its own bank).
  // =====================================================================
  const T10 = { line: 3.05, rx: 0.61, cross: [1.5, CY, FH - 1.5], cw: 0.76, home: { x: 0.35, y: CY }, exp: { x: FW - 0.45, y: 1.15 }, chute: { x: 0.6, y: 1.0 }, rack: { x: 0.6, y: 2.45 },
    floor: [[3.3, 1.6], [3.3, FH - 1.2], [4.4, 3.0], [4.4, 5.4], [5.4, 1.0], [5.4, 4.2], [5.4, 7.2], [6.4, 2.4], [6.4, 5.8], [7.0, 4.0]], rpT: [12, 14, 16] };
  Rules.T10 = T10;
  const bank10 = x => (x < CX ? -1 : 1);
  const openX10 = m => m.cross.map((c, i) => i).filter(i => m.cross[i].open);
  const cap10 = r => Math.max(1, r.cap.storage || 1);
  // the way from one bank to the other: over the open Crossing that makes the shortest trip
  function via10(m, from, to) {
    const op = openX10(m); if (!op.length) return -1;
    const len = i => Math.hypot(from.x - CX, from.y - T10.cross[i]) + Math.hypot(to.x - CX, to.y - T10.cross[i]);
    return op.sort((p, q) => len(p) - len(q))[0];
  }
  const trip10 = (m, r, to) => { if (bank10(r.x) === bank10(to.x)) return E.dist(r, to); const i = via10(m, r, to); return i < 0 ? 1e6 : Math.hypot(r.x - CX, r.y - T10.cross[i]) + Math.hypot(to.x - CX, to.y - T10.cross[i]); };
  const reach10 = (m, r, p) => bank10(p.x) === bank10(r.x) || openX10(m).length > 0;
  function lay10(m, r) {
    const a = r.a, ss = m.ss[a], side = bank10(r.x);
    // finish the Crossing that is furthest along; otherwise the one on the way to the alliance's Export Dock
    const pref = a === 'blue' ? [0, 1, 2] : [2, 1, 0];
    const closed = pref.filter(i => !m.cross[i].open);
    if (!closed.length) { r.mem.panel = 0; return; } // nothing left to build: the panel is put down
    const i = closed.sort((p, q) => m.cross[q].n - m.cross[p].n)[0], c = m.cross[i];
    H.moveTo(m, r, { x: CX + side * (T10.rx + RR + 0.14), y: T10.cross[i] + (r.slot - 1) * 0.3 }, () => {
      if (c.open) return;
      H.act(r, H.scoreTime(m, r, 1.5) * (r.cap.panel >= 2 ? 0.5 : 1), () => {
        r.mem.panel = 0;
        if (c.open) return;
        c.n++; c.by[a]++; ss.laid++; H.addPts(m, r, isAuto(m) ? 4 : 2, 'PANEL +' + (isAuto(m) ? 4 : 2), { x: CX, y: T10.cross[i] });
        if (c.n >= 5) {
          c.open = true;
          const w = c.by.red >= 3 ? 'red' : 'blue', bonus = isAuto(m) ? 15 : 10;
          m.score[w][isAuto(m) ? 'auto' : 'tele'] += bonus; m.ss[w].opened++;
          H.log(m, w, 'The ' + ['north', 'centre', 'south'][i] + ' Crossing is OPEN (' + c.by.red + ' red panels, ' + c.by.blue + ' blue): +' + bonus + ' ' + w, 'rp');
          if (!m.headless) m.fx.push({ k: 'pop', x: CX, y: T10.cross[i], text: 'CROSSING OPEN', t: m.t, a: w });
          m.robots.forEach(x => { x.replan = true; });
        }
      }, 'Laying a deck panel');
    }, 'To the ' + ['north', 'centre', 'south'][i] + ' Crossing');
  }
  function fetchPanel10(m, r) {
    const a = r.a, ss = m.ss[a];
    H.moveTo(m, r, E.P(m, a, T10.rack.x + 0.45, T10.rack.y), () => {
      const take = () => {
        if (r.mem.panel || H.endDue(m, r)) return;
        if (ss.pq <= 0) { if (ss.panels > 0) H.waitUntil(r, () => m.ss[a].pq > 0, take, 'Waiting for a panel', 5); return; }
        H.act(r, H.collectTime(m, r, 'station', 1.2), () => { if (ss.pq <= 0) return; ss.pq--; r.mem.panel = 1; }, 'Taking a deck panel');
      };
      take();
    }, 'To the panel rack');
  }
  // who builds: the coach's call; otherwise, in an alliance that builds, its weakest scorers that have a handler (two
  // until the first Crossing opens, then one if the alliance is going for all three)
  function wantBuild10(m, r) {
    const a = r.a, ss = m.ss[a], t = r.plan.target, nOpen = openX10(m).length;
    if (!r.cap.panel || t === 'home' || nOpen >= 3 || ss.panels + ss.pq <= 0 || m.total - m.t < m.T.end + 12 || bank10(r.x) !== (a === 'blue' ? -1 : 1)) return false;
    if (t === 'build') return true;
    if (!ss.build || (nOpen >= 1 && !ss.link)) return false;
    const pw = x => x.cap.scoreSpd + x.cap.accuracy + x.cap.intake + x.cap.speed + ((x.cap.reach || 1) >= 2 ? 40 : 0);
    const hs = mates(m, a).filter(x => x.cap.panel && !x.dead && !x.mem.broken).sort((p, q) => pw(p) - pw(q));
    return hs.indexOf(r) < (nOpen ? 1 : 2);
  }
  function score10(m, r) {
    const a = r.a, ss = m.ss[a], hi = (r.cap.reach || 1) >= 2, n = r.held, t = r.plan.target;
    const home = E.P(m, a, 0.62 + RR, CY + (r.slot % 2 ? 0.55 : -0.55)), ex = E.P(m, a, FW - 0.72 - RR, T10.exp.y + (r.slot % 2 ? 0.4 : -0.3));
    let exp = false;
    if (openX10(m).length && t !== 'home' && !isAuto(m)) {
      const vE = (hi ? 8 : 6) * n / (trip10(m, r, ex) * 2 / 2.6 + 3), vH = (hi ? 3 : 2) * n / (trip10(m, r, home) * 2 / 2.6 + 3);
      exp = t === 'export' || vE > vH;
    } else if (bank10(r.x) !== bank10(home.x) && !openX10(m).length) return; // stranded: cannot happen, Crossings never close
    const sp = exp ? ex : home, dock = exp ? E.P(m, a, T10.exp.x, T10.exp.y) : E.P(m, a, T10.home.x, T10.home.y);
    H.moveTo(m, r, sp, () => {
      if (!H.canScore(m, r)) return;
      H.act(r, 0.3 + n * H.scoreTime(m, r, hi ? 1.05 : 0.7) * (r.cap.wrist ? 0.7 : 1), () => {
        let made = 0;
        for (let k = 0; k < n; k++) { r.stats.shots++; if (m.rng.chance(Math.min(0.99, H.hit(m, r, hi ? 1.0 : 1.1)))) made++; else drop(m, sp.x + m.rng.range(-0.7, 0.7), sp.y + m.rng.range(-0.7, 0.7), { t: m.t + 0.6 }); }
        r.held = 0; r.heldType = null; r.stats.cycles++;
        if (!made) return;
        r.stats.hits += made;
        const each = exp ? (hi ? 8 : 6) : (hi ? 3 : 2) + (isAuto(m) ? 2 : 0), pts = made * each;
        if (exp) { ss.exp += made; m.ss[opp(a)].hp += made; } else ss.home += made;
        H.addPts(m, r, pts, (exp ? 'EXPORT +' : '+') + pts, dock);
      }, exp ? 'Loading the Export Dock' : 'Loading the Home Dock');
    }, exp ? 'To the Export Dock' : 'To the Home Dock');
  }
  function collect10(m, r) {
    const a = r.a, ss = m.ss[a], opts = [];
    if (r.held >= cap10(r) || !H.canCollect(m, r)) return false;
    if (r.cap.ground) { const p = nearLoose(m, r, x => bank10(x.x) === bank10(r.x)) || (openX10(m).length ? nearLoose(m, r) : null); if (p) opts.push({ k: 'g', p, t: trip10(m, r, p) / 2.6 + 1.4 }); }
    const cp = E.P(m, a, T10.chute.x + 0.45, T10.chute.y);
    if ((ss.q > 0 || ss.hp > 0) && reach10(m, r, cp)) opts.push({ k: 'c', p: cp, t: trip10(m, r, cp) / 2.6 + (ss.q > 0 ? 0 : 2.5) + 1.3 + (H.spotUse(m, r, cp) ? 2.5 : 0) });
    if (!opts.length) return false;
    const best = opts.sort((p, q) => p.t - q.t)[0];
    if (best.k === 'g') grab(m, r, best.p, 1.2, 'Picking up a crate', () => { r.held++; r.heldType = 'crate'; }, 'To a crate');
    else H.moveTo(m, r, best.p, () => {
      const take = () => {
        if (!H.canCollect(m, r) || r.held >= cap10(r) || H.endDue(m, r)) return;
        if (ss.q <= 0) { if (ss.hp > 0) H.waitUntil(r, () => m.ss[a].q > 0, take, 'Waiting at the chute', 5); return; }
        H.act(r, H.collectTime(m, r, 'station', 1.0), () => { if (ss.q <= 0) return; ss.q--; r.held++; r.heldType = 'crate'; if (r.held < cap10(r) && (ss.q > 0 || ss.hp > 0)) take(); }, 'Loading crates');
      };
      take();
    }, 'To the chute');
    return true;
  }
  // endgame places: the Arch for the alliance's best climber; an open Crossing for the others, one robot each, first to ask
  function end10(m, r) {
    if (r.mem.end10) return r.mem.end10;
    const a = r.a, arch = bestClimbers(m, a, 1)[0];
    if (arch === r && (r.cap.endLevel || 0) >= 2) return (r.mem.end10 = { lvl: 2 });
    if (m.total - m.t > m.T.end + 26) return { lvl: 0 }; // not yet time to claim a deck
    const free = openX10(m).filter(i => !m.cross[i].hold || m.cross[i].hold === r.team).sort((p, q) => Math.abs(r.y - T10.cross[p]) - Math.abs(r.y - T10.cross[q]));
    if (!free.length) return { lvl: 0 };
    m.cross[free[0]].hold = r.team;
    return (r.mem.end10 = { lvl: 1, i: free[0] });
  }
  Rules[2110] = {
    leavePts: 3, tempo: { c: 2.5, s: 2.2 },
    endgame: { levels: [{ name: 'On a Crossing', pts: 8, time: 1.2, sure: true }, { name: 'Arch', pts: 15, time: 6, risk: 0.08, drop: 0.15 }], park: 0 },
    leftCheck: (m, r) => loc(m, r).x > T10.line + 0.35,
    endLevel(m, r) { return end10(m, r).lvl; },
    route(m, r, from, to) {
      if (bank10(from.x) === bank10(to.x) || Math.abs(from.x - CX) < T10.rx || Math.abs(to.x - CX) < T10.rx + RR) return null;
      const i = via10(m, from, to), sf = bank10(from.x), d = T10.rx + RR + 0.22;
      if (i < 0) return [{ x: CX + sf * d, y: U.clamp(from.y, 0.6, FH - 0.6) }]; // no way over: up to the bank and no further
      return [{ x: CX + sf * d, y: T10.cross[i] }, { x: CX - sf * d, y: T10.cross[i] }, to];
    },
    init(m) {
      setHp(m);
      m.loose = []; m.obs = [];
      m.cross = T10.cross.map(() => ({ n: 0, by: { red: 0, blue: 0 }, open: false, hold: null }));
      ['red', 'blue'].forEach(a => {
        const hs = mates(m, a).filter(r => r.cap.panel);
        m.ss[a] = { home: 0, exp: 0, laid: 0, opened: 0, panels: 13, pq: 1, pT: 0, hp: 9, q: 1, qT: 0, build: hs.length > 0 && m.rng.chance(0.8), link: m.rng.chance(0.4), endPts: 0, held: 0 };
        T10.floor.forEach(q => { const p = E.P(m, a, q[0], q[1]); drop(m, p.x, p.y); });
      });
      m.robots.forEach(r => { r.held = 1; r.heldType = 'crate'; r.mem.panel = 0; });
    },
    start(m, r) { return E.P(m, r.a, 2.4, [3.0, CY + 1.5, FH - 1.3][r.slot]); },
    guard(m, a) { return openX10(m).length ? E.P(m, a, FW - 2.6, T10.exp.y + 0.6) : E.P(m, a, 2.6, CY); },
    protect(m, r) {
      if (Math.abs(r.x - CX) < T10.rx + RR && T10.cross.some(y => Math.abs(r.y - y) < T10.cw + 0.2)) return 'Crossing';
      const q = loc(m, r);
      if (q.x < 1.6 && q.y < 3.3) return 'Loading Zone';
      if (m.total - m.t <= 30 && r.endBusy && r.endLvl === 2 && Math.abs(q.y - CY) < 1.1 && q.x > CX - 2.0) return 'Arch';
      return '';
    },
    tick(m) {
      ['red', 'blue'].forEach(a => {
        const ss = m.ss[a], g = hpK(m, a);
        if (ss.hp > 0 && ss.q < 2 && m.t >= ss.qT) { ss.hp--; ss.q++; ss.qT = m.t + 3.2 - 1.7 * g; }
        if (ss.panels > 0 && ss.pq < 2 && m.t >= ss.pT) { ss.panels--; ss.pq++; ss.pT = m.t + 3.6 - 1.8 * g; }
      });
    },
    autoDecide(m, r) {
      const tier = r.cap.autoTier || 0, max = m.S.autoPieces[tier], left = m.T.auto - m.t;
      if (r.mem.got == null) r.mem.got = 0;
      if (!r.autoOK) return struggle(m, r, T10.line + 0.9);
      if (tier >= 1 && r.mem.got < max && H.canScore(m, r)) {
        if (r.held > 0 && left > 3) { r.mem.got += r.held; return score10(m, r); }
        if (r.held === 0 && left > 8 && r.cap.ground && H.canCollect(m, r)) {
          const p = nearLoose(m, r, x => bank10(x.x) === bank10(r.x), 7);
          if (p) return grab(m, r, p, 1.2, 'Auto: picking up a crate', () => { r.held++; r.heldType = 'crate'; }, 'Auto: to a crate');
        }
      }
      leave(m, r, T10.line + 0.9);
    },
    decide(m, r) {
      const canS = H.canScore(m, r), canC = H.canCollect(m, r);
      if (r.mem.panel) return lay10(m, r);
      if (r.held >= cap10(r) && canS && r.cap.panel < 2) return score10(m, r);
      if (wantBuild10(m, r) && (r.held === 0 || r.cap.panel >= 2)) return fetchPanel10(m, r);
      if (r.held >= cap10(r) && canS) return score10(m, r);
      if (r.held > 0 && canS && !(canC && r.cap.ground && nearLoose(m, r, x => bank10(x.x) === bank10(r.x), 2.5))) return score10(m, r);
      if (canC && collect10(m, r)) return;
      if (r.held > 0 && canS) return score10(m, r);
      r.label = r.jam.intake > m.t ? 'Intake jammed' : 'No crates within reach';
    },
    endSpot(m, r, lvl) {
      const e = end10(m, r), side = bank10(E.P(m, r.a, 1, CY).x);
      if (lvl >= 2) return { x: CX + side * (T10.rx + RR + 0.16), y: CY };
      if (lvl === 1 && e.i != null) return { x: CX, y: T10.cross[e.i] };
      return E.P(m, r.a, 3.2, CY + (r.slot - 1) * 1.2);
    },
    finishEnd(m) {
      ['red', 'blue'].forEach(a => {
        const ss = m.ss[a], on = mates(m, a).filter(r => r.end && r.end.lvl === 1 && !r.dead).length;
        ss.held = on; ss.endPts = endPts(m, a, [8, 15], 0) + (on >= 2 ? 10 : 0); m.score[a].end += ss.endPts;
      });
    },
    bonus(m, a) {
      const ss = m.ss[a], thr = T10.rpT[lvlOf(m)], nOpen = openX10(m).length;
      return [
        { key: 'linked', name: 'Linked', val: nOpen, thr: 3, ok: m.done && nOpen >= 3, unit: 'Crossings' },
        { key: 'trade', name: 'Trade', val: ss.exp, thr, ok: ss.exp >= thr, unit: 'exports' },
        { key: 'market', name: 'Home Market', val: ss.home, thr: 20, ok: ss.home >= 20, unit: 'crates at home' }
      ];
    },
    hud(m, a) { const ss = m.ss[a]; return ['CROSSINGS ' + openX10(m).length + '/3', 'HOME ' + ss.home, 'EXPORT ' + ss.exp, 'PANELS ' + (ss.panels + ss.pq)]; }
  };
  Rules[2110].defense = { eff: 1.4, foul: 1.0, range: 1.7, zone: 0.4, pin: 3, reset: 3, protMajor: true, credit: { Arch: 2 } };
  Rules[2110].faults = { brown: 0.9, tip: 1.2, tipAll: 0.15, comms: 1.0 };
  S[2110].meta = { defense: true, note: 'BRIDGEWORK starts as two separate fields with no defense at all. The Export Dock pays three times the Home Dock, so most alliances with a panel handler open the Crossing nearest it, and from that moment a defender waiting on the far bank, in front of that dock, earns its place. Whoever builds pays for a road both alliances use.',
    faults: 'Common failures: crates dropped short of a shelf, panels laid crooked and laid again, and robots that drive onto a Crossing and stop there.' };
  S[2110].tiebreak = 'Crossing';
})();
