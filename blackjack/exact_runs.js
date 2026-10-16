// Lab pack: exact DOUBLE OR NOTHING return and the run-bar policies P0, P2, P3, P4, P5 (run-bar v170: CASH OUT, DOUBLE OR NOTHING, DOUBLE HALF;
// RUN IT AGAIN and RUN HALF are removed), in integer cents with the build's own rules:
//   board pays   floor(stake_cents x tenths / 10)                  (payCents)
//   bar          MAX WIN clip at bet x MAX_WIN_X; the round ends at the max win or at RUN_CAP_X x the first win (the ammo);
//                DOUBLE OR NOTHING needs held >= MIN_RUN ($0.02) and banked + 2 x held <= max win; DOUBLE HALF needs half >= MIN_RUN and
//                banked + keep + 2 x half <= max win; half = floor(held / 2), the odd cent (keep) goes to the RUN BANK;
//                a lost double with a RUN BANK brings the bank back to the bar as the held amount.
// Inputs: out/exact_board.json (exact board pay distributions, exact_board.js) and rungame.js (exact DOUBLE OR NOTHING win chance).
// Every constant is read from the build (consts.js) and asserted equal to the values used here; the build must not name RIDE / RUN IT AGAIN /
// RUN HALF any more (consts.js absent()).
// Policies: P0 cash out - P2 DOUBLE OR NOTHING once - P3 DOUBLE OR NOTHING while offered (to the cap) - P4 a uniform random pick among
// the buttons shown (CASH OUT / DOUBLE OR NOTHING / DOUBLE HALF) at every bar - P5 DOUBLE HALF once. (P1 was RUN IT AGAIN once: retired.)
// Board play: exact best play. P5 also has an independent closed form (below), asserted equal to the bar-model value.
// P4 has no end in principle (a lost double with a RUN BANK returns to the bar, and the state graph has cycles: DOUBLE HALF won, a double
// lost, a double won returns to the same amount). It is evaluated by full recursion with every rule above, cut where a path's probability
// falls under eps (EPS4, default 1e-12; about 75 s per bet, 750 million nodes); a cut path is valued with a linear tail model (no rounding, every
// button shown, no run cap: an ESTIMATE), and the result is bracketed:
//   LOWER values cut paths at 0 (rigorous);
//   UPPER values a cut path at lambdaHat x its total, where lambdaHat >= V*(S, B) / (S + B) for every state: V* is the optimum over ALL bar policies
//   (bar_optimum.cpp). NEW since the dealer stands on all 17s (a double wins with p = 0.50045 > 1/2, +0.091% per double): cashing out no longer bounds
//   every bar policy, so the old bound "no path can be worth more than its total" is GONE. The state-wise maximum of V*/T is larger than V*(A)/A (it
//   is attained at the smallest states, which still have the whole run cap above them) and grows slowly with the room under the cap; lambdaHat is taken
//   by aggregate.js from out/bar_optimum_exact.json (the maximum over every state of every solved ammo, then extended by the fitted power law to the
//   room of the largest ammo here). exact_runs.js writes the pieces: rtpLower and cutTotalX (= the cut paths' total / bet), so upper = lower + lambdaHat x cutTotalX.
// The cut mass and the pieces are reported; convergence is checked by running several eps (out/exact_runs_convergence.log, P4_CONVERGENCE).
// Closed forms, independent of barState (asserted equal to the bar-model values to 1e-12): P2 (double once), P3 (double to the cap), P5 (DOUBLE HALF once).
// Usage (from labpack/blackjack): node exact_runs.js        -> out/exact_runs.json
'use strict';
const fs = require('fs'), path = require('path');
const C = require('./consts').check({
  WINS: { 2: 0.3, 3: 1.2, 4: 2 }, BJ_C: { 1: 0.5, 2: 2, 3: 10, 4: 18 }, M21: { 1: 0.4, 2: 1, 3: 2, 4: 4 },
  MAX_WIN_X: 20000, OPERATOR_MAX_WIN_X: 20000, MIN_RUN: 0.02, RUN_CAP_X: 1000, BET_MIN: 1, BET_MAX: 100,
});
if (!Object.values(C.rules).every(Boolean)) throw new Error('rule fragments');
const E = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', 'exact_board.json'), 'utf8'));
if (E.build.sha !== C.sha) throw new Error('exact_board.json was made from another build');
const RG = require('./rungame');
const DBL = { best: RG.make({ mode: 'max' }).solve(), worst: RG.make({ mode: 'min' }).solve(), stand: RG.make({ mode: 'stand' }).solve(), hit: RG.make({ mode: 'hit' }).solve() };
const VW = DBL.best.V;                                   // chance a DOUBLE OR NOTHING run wins (pushes dealt again), best play
const MIN = Math.round(C.MIN_RUN * 100);
// board outcome distributions as [tenths, p]
const dist = tab => { const m = new Map(); for (const e of tab) { const t = Math.round(Math.min(e.pay, 1000) * 10); m.set(t, (m.get(t) || 0) + e.p); } return [...m.entries()].sort((a, b) => a[0] - b[0]); };
const D = { best: dist(E.payTableOptimal), basic: dist(E.payTableBasic), standard: dist(E.payTableConventional), worst: dist(E.payTableWorst) };
const boardPay = (s, t) => Math.floor(s * t / 10);
const mean = d => d.reduce((a, [x, p]) => a + x * p, 0);

// ---------- DOUBLE OR NOTHING ----------
const row = r => ({ winChance: r.V, rtp: r.rtp, pushChancePerDeal: r.P, dealsPerRun: r.expDeals, winChancePerDeal: r.W });
const DBLX = { basicConventional: RG.make({ mode: 'conv' }).solve(), basicRulesSheetBoard: RG.make({ mode: 'basic' }).solve(),
  bestHitsSoft17: RG.make({ mode: 'max', h17: true }).solve(), basicConventionalHitsSoft17: RG.make({ mode: 'conv', h17: true }).solve(), worstHitsSoft17: RG.make({ mode: 'min', h17: true }).solve(),
  standHitsSoft17: RG.make({ mode: 'stand', h17: true }).solve(), hitHitsSoft17: RG.make({ mode: 'hit', h17: true }).solve() };
const double = { winChance: VW, rtpBest: DBL.best.rtp, rtpWorst: DBL.worst.rtp, rtpAlwaysStand: DBL.stand.rtp, rtpAlwaysHit: DBL.hit.rtp, pushChancePerDeal: DBL.best.P, dealsPerRun: DBL.best.expDeals,
  winChancePerDeal: DBL.best.W, rtpBasic: DBLX.basicConventional.rtp, winChanceBasic: DBLX.basicConventional.V,
  table: { best: row(DBL.best), basic: row(DBLX.basicConventional), worst: row(DBL.worst), alwaysStand: row(DBL.stand), alwaysHit: row(DBL.hit) },
  basicDefinition: 'the CR\'s "ordinary blackjack basic strategy" = the conventional no-doubling chart (strategy.js convMask: hard 12 stand against 4-6 else hit; hard 13-16 stand against 2-6 else hit; soft 17 hit; soft 18 stand against 2-8, hit against 9, 10, A); it reproduces the CR\'s 99.8981% (dealer hits soft 17) and 100.0721% (stands)',
  otherBasic: { rulesSheetBoardBasicOnTheDoubleHand: row(DBLX.basicRulesSheetBoard), note: 'the rules sheet\'s basic play is a BOARD strategy (hard 12-16, soft 17); applied to this hand with soft 18 = stand it returns less' },
  previousRuleHitsSoft17: { best: row(DBLX.bestHitsSoft17), basic: row(DBLX.basicConventionalHitsSoft17), worst: row(DBLX.worstHitsSoft17), alwaysStand: row(DBLX.standHitsSoft17), alwaysHit: row(DBLX.hitHitsSoft17) },
  note: 'a win pays exactly 2 x the stake (whole cents), so there is no rounding at any stake. The dealer STANDS on all 17s (build of 16 Oct 2026); win chance per resolved hand p = ' + VW.toPrecision(17) };

// ---------- the bar, as showControls runs it (cents) ----------
function barState(banked, held, B, ammo) {
  const MW = B * C.MAX_WIN_X;
  if (banked + held > MW) held = MW - banked;
  const total = banked + held;
  if (total >= MW) return { end: total, why: 'max win' };
  if (total >= C.RUN_CAP_X * ammo) return { end: total, why: 'run cap' };
  const half = Math.floor(held / 2), keep = held - half;
  return { banked, held, total, half, keep, dbl: held >= MIN && banked + 2 * held <= MW, dblH: half >= MIN && banked + keep + 2 * half <= MW };
}
// exact value (E[pay], E[pay^2], P[pay > 0]) of a policy from a first bar with `a` cents (banked 0, ammo a), bet B cents
function policyFrom(pol, a, B) {
  const out = (x) => ({ m: x, m2: x * x, hit: x > 0 ? 1 : 0 });
  const mix = (parts) => { let m = 0, m2 = 0, hit = 0; for (const [p, r] of parts) { m += p * r.m; m2 += p * r.m2; hit += p * r.hit; } return { m, m2, hit }; };
  const st = barState(0, a, B, a); if (st.end !== undefined) return out(st.end);
  const cashAfter = (banked, held) => { const s2 = barState(banked, held, B, a); return out(s2.end !== undefined ? s2.end : s2.total); };   // the bar after the run: cash out
  if (pol === 'P0') return out(st.total);
  if (pol === 'P2') { if (!st.dbl) return out(st.total); return mix([[VW, cashAfter(0, 2 * a)], [1 - VW, out(0)]]); }
  if (pol === 'P5') { if (!st.dblH) return out(st.total); const { half, keep } = st;       // DOUBLE HALF once: won -> bar (RUN BANK keep, held 2 x half): cash out; lost -> the RUN BANK comes back (held keep): cash out
    return mix([[VW, cashAfter(keep, 2 * half)], [1 - VW, cashAfter(0, keep)]]); }
  if (pol === 'P3') { let held = a, pr = 1; const parts = [];
    for (;;) { const s = barState(0, held, B, a); if (s.end !== undefined) { parts.push([pr, out(s.end)]); break; }
      if (!s.dbl) { parts.push([pr, out(s.total)]); break; }
      parts.push([pr * (1 - VW), out(0)]); pr *= VW; held = 2 * held; }
    return mix(parts); }
  throw new Error(pol);
}
// P5 closed form, derived on paper and independent of barState: a first win of `a` cents (a > 0), half = floor(a / 2), keep = a - half.
//   half >= 2 cents: DOUBLE HALF is offered (the max win and the 1,000x cap are never near: a <= 20 x bet) and the pay is
//     keep + 2 x half with chance w, keep with chance 1 - w:  E = keep + 2 w half = a + (2 w - 1) half;  E[pay^2] = w (keep + 2 half)^2 + (1 - w) keep^2;  every round with a > 0 pays > 0 (hit rate = the board's)
//   half < 2 cents (a = 1, 2 or 3): only CASH OUT: pay a.
// So  RTP(P5) = RTP(P0) + (2 w - 1) E[half x 1(half >= 2 cents)] / bet,  with 2 w - 1 = RTP of DOUBLE OR NOTHING - 1 = +0.000910 (it was -0.000923 with H17: DOUBLE HALF now has an edge).
function p5Closed(Bdollars) {
  const B = Math.round(Bdollars * 100); let m = 0, m2 = 0, hit = 0, dm = 0;
  for (const [t, p] of D.best) { const a = boardPay(B, t); if (a <= 0) continue; const half = Math.floor(a / 2), keep = a - half;
    if (half >= MIN) { m += p * (keep + 2 * VW * half); m2 += p * (VW * (keep + 2 * half) ** 2 + (1 - VW) * keep * keep); dm += p * half; } else { m += p * a; m2 += p * a * a; }
    hit += p; }
  return { rtp: m / B, sdX: Math.sqrt(m2 - m * m) / B, hitRate: hit, rtpMinusP0: (2 * VW - 1) * dm / B };
}
// P2 and P3 closed forms (independent of barState). P2: a first win of a cents >= MIN doubles once: E = 2 w a, else a. P3: doubles while the total is under the run cap
// (1,000 x a: always 10 doubles from a, 1,024 a >= 1,000 a) and while 2 x held <= max win: E = a (2 w)^k, k = the number of doubles offered in a row.
function p2p3Closed(Bdollars) {
  const B = Math.round(Bdollars * 100), MWc = B * C.MAX_WIN_X; let m2 = 0, m3 = 0, d2 = 0;
  for (const [t, p] of D.best) { const a = boardPay(B, t); if (a <= 0) continue;
    if (a >= MIN && 2 * a <= MWc) { m2 += p * 2 * VW * a; d2 += p * a; } else m2 += p * a;
    let k = 0, h = a; while (h < C.RUN_CAP_X * a && h >= MIN && 2 * h <= MWc) { h *= 2; k++; }
    m3 += p * a * Math.pow(2 * VW, k); }
  return { P2: m2 / B, P3: m3 / B };
}
// P4: uniform random pick among the buttons shown, at every bar
let P4cut = 0, P4nodes = 0, P4cutTotal = 0, P4cutTail = 0;
// Tail model for a cut P4 path: with every button shown and no rounding, the value of a bar is linear, alpha x banked + beta x held, where
// (from the three equally likely picks CASH OUT / DOUBLE OR NOTHING / DOUBLE HALF; w = the DOUBLE win chance; a lost double returns the bank)
//   cash out: banked + held
//   double:   w (alpha banked + 2 beta held) + (1-w) beta banked
//   half:     w (alpha (banked + held/2) + beta held) + (1-w) beta (banked + held/2)
//   banked:  3 alpha = 1 + 2 w alpha + 2 (1-w) beta            held:  3 beta = 1 + 2 w beta + w alpha / 2 + w beta + (1-w) beta / 2
const TAIL = (() => { const w = VW;
  // a1 alpha + b1 beta = 1 ; a2 alpha + b2 beta = 1
  const a1 = 3 - 2 * w, b1 = -2 * (1 - w), a2 = -w / 2, b2 = 2.5 * (1 - w);
  const det = a1 * b2 - a2 * b1; return { alpha: (b2 - b1) / det, beta: (a1 - a2) / det, w }; })();
function p4(banked, held, B, a, prob, EPS) {
  P4nodes++;
  const s = barState(banked, held, B, a);
  const res = x => ({ m: x, m2: x * x, hit: x > 0 ? 1 : 0 });
  if (s.end !== undefined) return res(s.end);
  if (prob < EPS) { const v = TAIL.alpha * s.banked + TAIL.beta * s.held; P4cut += prob; P4cutTotal += prob * s.total; P4cutTail += prob * v; return res(v); }   // tail: the linear model above
  const opts = [0]; if (s.dbl) opts.push(1); if (s.dblH) opts.push(2);          // 0 CASH OUT, 1 DOUBLE OR NOTHING, 2 DOUBLE HALF, in the order the buttons appear
  const w = 1 / opts.length; let m = 0, m2 = 0, hit = 0;
  const add = (p, r) => { m += p * r.m; m2 += p * r.m2; hit += p * r.hit; };
  const lost = (bank, p) => bank > 0 ? p4(0, bank, B, a, p, EPS) : res(0);   // a lost double: the RUN BANK comes back to the bar, or the round ends
  for (const o of opts) {
    const q = prob * w;
    if (o === 0) add(w, res(s.total));
    else if (o === 1) { add(w * VW, p4(s.banked, 2 * s.held, B, a, q * VW, EPS)); add(w * (1 - VW), lost(s.banked, q * (1 - VW))); }
    else { add(w * VW, p4(s.banked + s.keep, 2 * s.half, B, a, q * VW, EPS)); add(w * (1 - VW), lost(s.banked + s.keep, q * (1 - VW))); }
  }
  return { m, m2, hit };
}
function policy(pol, Bdollars, playKey = 'best', EPS = 1e-12) {
  const B = Math.round(Bdollars * 100), d = D[playKey]; let m = 0, m2 = 0, hit = 0; P4cut = 0; P4nodes = 0; P4cutTotal = 0; P4cutTail = 0;
  const t0 = Date.now();
  for (const [t, p] of d) {
    const a = boardPay(B, t);
    let r;
    if (a <= 0) r = { m: 0, m2: 0, hit: 0 };
    else if (pol === 'P4') r = p4(0, a, B, a, p, EPS);
    else r = policyFrom(pol, a, B);
    m += p * r.m; m2 += p * r.m2; hit += p * r.hit;
  }
  const rtp = m / B, sd = Math.sqrt(m2 - m * m) / B;
  const o = { policy: pol, bet: Bdollars, play: playKey, rtp, sdX: sd, hitRate: hit };
  if (pol === 'P4') Object.assign(o, { cutMass: P4cut, nodes: P4nodes, eps: EPS, tail: TAIL, rtpLower: (m - P4cutTail) / B, cutTotalX: P4cutTotal / B, cutTailX: P4cutTail / B, hitRateLower: hit - P4cut,
    note: 'paths cut below eps are valued with the linear tail model (alpha x banked + beta x held, an estimate); rtpLower values cut paths at 0 (rigorous); the upper bound is rtpLower + lambdaHat x cutTotalX with lambdaHat >= V*/(S+B) over all states (bar_optimum.cpp; aggregate.js), because a double now returns more than 100% and cashing out no longer bounds every policy' });
  o.sec = (Date.now() - t0) / 1000;
  return o;
}
const out = { build: { file: C.file, sha: C.sha }, constants: { WINS: C.WINS, BJ_C: C.BJ_C, M21: C.M21, MAX_WIN_X: C.MAX_WIN_X, MIN_RUN: C.MIN_RUN, RUN_CAP_X: C.RUN_CAP_X, BETS: [C.BET_MIN, C.BET_MAX, C.BET_STEP] } };
out.board = Object.fromEntries(Object.entries(D).map(([k, d]) => [k, { rtp: mean(d) / 10 }]));
// base rounding: a board pay at bet B (cents) is B x tenths / 10, a whole number of cents whenever B is a multiple of 10 cents, i.e. at every bet on the $0.10 grid
let gridLoss = 0; for (let B = 100; B <= 10000; B += 10) for (const [t] of D.best) if ((B * t) % 10) gridLoss++;
out.boardRounding = { betsChecked: '$1.00-$100.00 step $0.10 (991 bets)', paysWithAFraction: gridLoss, note: 'board pays are exact at every legal bet: no rounding effect on the base game' };
out.double = double;
out.policies = [];
const EPS4 = +(process.env.EPS4 || 1e-12);
if (process.env.P4_CONVERGENCE) {   // convergence of the P4 cut: P4_CONVERGENCE=1e-7,1e-8,1e-9 [P4_BET=10] node exact_runs.js  (prints only; writes nothing)
  for (const e of process.env.P4_CONVERGENCE.split(',').map(Number)) console.log(JSON.stringify(policy('P4', +(process.env.P4_BET || 10), 'best', e)));
  process.exit(0);
}
for (const B of [1, 10, 100]) for (const pol of ['P0', 'P2', 'P3', 'P4', 'P5']) { const r = policy(pol, B, 'best', EPS4);
  if (pol === 'P5') { const c = p5Closed(B); r.closedForm = c; const bad = ['rtp', 'sdX', 'hitRate'].filter(k => Math.abs(c[k] - r[k]) > 1e-12); if (bad.length) throw new Error('P5 closed form differs from the bar model: ' + bad.join(',')); }
  if (pol === 'P2' || pol === 'P3') { const c = p2p3Closed(B); r.closedForm = { rtp: c[pol] }; if (Math.abs(c[pol] - r.rtp) > 1e-12) throw new Error(pol + ' closed form differs from the bar model: ' + c[pol] + ' v ' + r.rtp); }
  out.policies.push(r); console.log(JSON.stringify(r)); }
fs.writeFileSync(path.join(__dirname, 'out', 'exact_runs.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ double: out.double, boardRounding: out.boardRounding }, null, 1));
