// Lab pack: combines the exact results (out/exact_board.json, out/exact_runs.json) and the simulations (out/sim_*.json) into
// results.json (every headline number) and par.txt (the PAR tables as plain text). Checks that every exact value sits inside the
// simulation's 95% confidence interval, and that every input was made from the same build (sha256).
// Run-bar v170 bar (CASH OUT / DOUBLE OR NOTHING / DOUBLE HALF), build of 16 Oct 2026: the dealer STANDS ON ALL 17s in DOUBLE OR NOTHING, so a double returns 100.09% at best play
// and cash out (P0) no longer bounds the bar policies: policies P0 P2 P3 P4 P5 (P1 retired), the DOUBLE OR NOTHING hands through the shipped code (out/dbl_*.json), the exact optimum
// over ALL bar policies (out/bar_optimum_*.json, out/round_worst.json) and the fixed-ammo optimal-policy checks. Needs round_worst.js to have run (P4's bracket uses its state-wise bound).
// The P4 CI checks use the FIRST-PASS seeds only (the pack's seeds: $10 crypto 2401-2406, $100 3401, $1 1401 1402); the follow-up seeds
// (2407-2410, 3402-3406) are an independent replication, checked and reported apart, never pooled into the first pass.
// Usage (from labpack/blackjack): node aggregate.js
'use strict';
const fs = require('fs'), path = require('path');
const C = require('./consts').parse();
const O = f => path.join(__dirname, 'out', f);
const EB = JSON.parse(fs.readFileSync(O('exact_board.json'), 'utf8'));
const ER = JSON.parse(fs.readFileSync(O('exact_runs.json'), 'utf8'));
for (const [n, x] of [['exact_board.json', EB.build.sha], ['exact_runs.json', ER.build.sha]]) if (x !== C.sha) throw new Error(n + ' is from another build');
const sims = fs.readdirSync(O('')).filter(f => /^sim_.*\.json$/.test(f)).map(f => ({ f, ...JSON.parse(fs.readFileSync(O(f), 'utf8')) }));
for (const s of sims) if (s.sha !== C.sha) throw new Error(s.f + ' is from another build');
function pool(list) {
  const N = list.reduce((a, s) => a + s.rounds, 0), B = Math.round(list[0].bet * 100);
  const sum = list.reduce((a, s) => a + s.sumCents, 0), sum2 = list.reduce((a, s) => a + s.sum2Cents, 0), hits = list.reduce((a, s) => a + Math.round(s.hitRate * s.rounds), 0);
  const mean = sum / N, sd = Math.sqrt(sum2 / N - mean * mean), se = sd / Math.sqrt(N), hr = hits / N, hse = Math.sqrt(hr * (1 - hr) / N);
  return { rounds: N, bet: list[0].bet, seeds: list.map(s => +s.seedCrypto), policySeeds: list.map(s => s.policySeed), board: list[0].board, rtp: mean / B, ci95: [(mean - 1.96 * se) / B, (mean + 1.96 * se) / B],
    sdX: sd / B, hitRate: hr, hitCi95: [hr - 1.96 * hse, hr + 1.96 * hse], maxX: Math.max(...list.map(s => s.maxCents)) / B, files: list.map(s => s.f), cpuSec: +list.reduce((a, s) => a + s.sec, 0).toFixed(1) };
}
const inCI = (x, ci) => x >= ci[0] && x <= ci[1];
const erfc = x => { const t = 1 / (1 + 0.3275911 * x), y = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))); return y * Math.exp(-x * x); };   // |error| < 1.5e-7
const zOf = (x, est, ci) => { const se = (ci[1] - ci[0]) / 2 / 1.96, z = (est - x) / se; return { z, p: erfc(Math.abs(z) / Math.SQRT2) }; };
const rng = (a, z) => Array.from({ length: z - a + 1 }, (_, i) => a + i);
const P4FIRST = { 10: rng(2401, 2406), 100: [3401], 1: [1401, 1402] }, P4FOLLOW = { 10: rng(2407, 2410), 100: rng(3402, 3406), 1: rng(1403, 1406) };   // $1: added after the first pass missed (run_sims.sh)
const P2FIRST = { 10: [2201, 2202], 100: [3201] }, P2FOLLOW = { 100: [3202, 3203, 3204, 3205] };   // P2 $100 follow-up: added after the first pass missed on the hit rate (run_sims.sh)
const R = { build: { file: C.file, sha256: C.sha, bytes: fs.statSync(C.file).size }, constants: ER.constants };
const RW = (() => { try { return JSON.parse(fs.readFileSync(O('round_worst.json'), 'utf8')); } catch (e) { return null; } })();
if (RW && RW.build.sha !== C.sha) throw new Error('round_worst.json is from another build');
// P4's rigorous upper bound: cut paths valued at Lambda x their total, Lambda >= V*/(S+B) over every state (bar optimum; the maximum grows slowly with the room under the cap: power law fitted to the solved ammo, extended to the room of the
// largest ammo at the bet). The old bound "a path is worth at most its total" is gone (a double returns more than 100%).
for (const r of ER.policies) if (r.policy === 'P4') { const aMax = Math.max(...EB.payTableOptimal.map(e => Math.floor(r.bet * 100 * Math.round(Math.min(e.pay, 1000) * 10) / 10)));
  if (RW) { const pl = RW.stateMax.powerLaw; r.lambdaState = Math.exp(pl.intercept) * Math.pow(500 * aMax, pl.slope); r.rtpUpper = r.rtpLower + r.lambdaState * r.cutTotalX; r.upperRule = 'rtpLower + Lambda x cutTotalX, Lambda = ' + r.lambdaState.toFixed(4) + ' (state-wise max of V*/(S+B), power law in the room 500 x largest ammo = ' + (500 * aMax).toExponential(2) + ')'; } else { r.rtpUpper = null; } }
const pol = (p, b) => ER.policies.find(r => r.policy === p && r.bet === b);
// ---------------- board ----------------
const P = EB.policies;
R.board = {
  rtp: { best: P.optimal.rtp, basic_rulesSheet: P.basic_stated.rtp, standardChart: P.conventional_bj_basic.rtp, worst: P.worst.rtp, random: P.random.rtp, alwaysStand: P.always_stand.rtp, alwaysHit: P.always_hit.rtp },
  sdX: { best: P.optimal.sd, basic_rulesSheet: P.basic_stated.sd, standardChart: P.conventional_bj_basic.sd, worst: P.worst.sd },
  hitRate: { best: P.optimal.hit, basic_rulesSheet: P.basic_stated.hit, standardChart: P.conventional_bj_basic.hit, worst: P.worst.hit },
  columnsBest: EB.columnContribOptimal,
  top: { pay: EB.top.top4BJ4Wins.pay, p: EB.top.top4BJ4Wins.p, oneIn: EB.top.top4BJ4Wins.oneIn, fourBJvsDealerBJ: EB.top.fourBJvsDealerBJ },
  payDistributionBest: EB.payValuesOptimal.map(e => ({ payX: e.pay, p: e.p, oneIn: 1 / e.p })),
  tailsBest: EB.tailsOptimal, pBJperHand: EB.pBJperHand, dealerNatural: EB.dealer.pNatural,
  rounding: ER.boardRounding,
};
// ---------------- runs ----------------
R.doubleOrNothing = ER.double;
// ---------------- policies (exact) ----------------
R.policiesExact = ER.policies;
// ---------------- simulations ----------------
const base = pool(sims.filter(s => /^sim_base_/.test(s.f)));
R.simulation = { method: 'the shipped game script of the final build run in node through harness.js (documented, outcome-neutral transforms: no sleeps, no async; the Run Game HIT/STAND asked of a bot); crypto.getRandomValues replaced by a seeded xoshiro128** stream (seedcrypto.js, seed per job); board and DOUBLE OR NOTHING played with exact best play',
  base: { ...base, exact: P.optimal.rtp, exactInCI: inCI(P.optimal.rtp, base.ci95), exactHit: P.optimal.hit, hitInCI: inCI(P.optimal.hit, base.hitCi95), exactSd: P.optimal.sd }, policies: [] };
const checks = [{ what: 'base RTP $10 (2,000,000+ rounds)', exact: P.optimal.rtp, ci95: base.ci95, ok: inCI(P.optimal.rtp, base.ci95) }, { what: 'base hit rate $10', exact: P.optimal.hit, ci95: base.hitCi95, ok: inCI(P.optimal.hit, base.hitCi95) }];
for (const p of ['P0', 'P2', 'P3', 'P4', 'P5']) for (const b of [10, 100]) {
  const list = sims.filter(s => s.policy === p && s.bet === b && !/^sim_base_/.test(s.f) && (p === 'P4' ? P4FIRST[b].includes(+s.seedCrypto) : p === 'P2' ? P2FIRST[b].includes(+s.seedCrypto) : true)); if (!list.length) continue;   // P4 and P2: the first-pass seeds
  const s = pool(list), e = pol(p, b);
  const row = { policy: p, ...s, exact: e.rtp, exactInCI: inCI(e.rtp, s.ci95), exactHit: e.hitRate, hitInCI: p === 'P4' ? (s.hitCi95[0] <= e.hitRate && s.hitCi95[1] >= e.hitRate - e.cutMass) : inCI(e.hitRate, s.hitCi95), exactSd: e.sdX, exactLower: e.rtpLower, exactUpper: e.rtpUpper };
  R.simulation.policies.push(row);
  checks.push({ what: `${p} RTP $${b}`, exact: e.rtp, ci95: s.ci95, ok: row.exactInCI }, { what: `${p} hit rate $${b}`, exact: e.hitRate, ci95: s.hitCi95, ok: row.hitInCI });
}
// small amounts (minimum $0.02): P4 and P5 at a $1.00 bet, where the first win is $0.30 and up, so halves and later bars are under $1.00
for (const [pl, b] of [['P4', 1], ['P5', 1]]) { const list = sims.filter(s => s.policy === pl && s.bet === b && !/^sim_base_/.test(s.f) && (pl !== 'P4' || P4FIRST[b].includes(+s.seedCrypto))); if (!list.length) continue;   // P4: the first-pass seeds
  const s = pool(list), e = pol(pl, b);
  const row = { policy: pl, ...s, exact: e.rtp, exactInCI: inCI(e.rtp, s.ci95), exactHit: e.hitRate, hitInCI: pl === 'P4' ? (s.hitCi95[0] <= e.hitRate && s.hitCi95[1] >= e.hitRate - e.cutMass) : inCI(e.hitRate, s.hitCi95), exactSd: e.sdX, exactCutMass: e.cutMass };
  R.simulation.policies.push(row);
  checks.push({ what: `${pl} RTP $${b} (small amounts)`, exact: e.rtp, ci95: s.ci95, ok: row.exactInCI }, { what: `${pl} hit rate $${b} (small amounts${pl === 'P4' ? '; exact minus cut mass allowed' : ''})`, exact: e.hitRate, ci95: s.hitCi95, ok: row.hitInCI }); }
// follow-up P4 seeds: an independent replication of the first pass, checked and reported apart (never pooled into the first-pass checks above)
const followChecks = [];
for (const b of [1, 10, 100]) { const list = sims.filter(s => s.policy === 'P4' && s.bet === b && P4FOLLOW[b].includes(+s.seedCrypto)); if (!list.length) continue; const s = pool(list), e = pol('P4', b);
  followChecks.push({ what: `P4 RTP $${b}, follow-up seeds ${P4FOLLOW[b][0]}-${P4FOLLOW[b][P4FOLLOW[b].length - 1]} alone (${s.rounds.toLocaleString('en-US')} rounds)`, exact: e.rtp, ci95: s.ci95, ok: inCI(e.rtp, s.ci95), rtp: s.rtp },
    { what: `P4 hit rate $${b}, follow-up seeds alone`, exact: e.hitRate, ci95: s.hitCi95, ok: s.hitCi95[0] <= e.hitRate && s.hitCi95[1] >= e.hitRate - e.cutMass }); }
for (const b of [100]) { const list = sims.filter(s => s.policy === 'P2' && s.bet === b && P2FOLLOW[b].includes(+s.seedCrypto)); if (!list.length) continue; const s = pool(list), e = pol('P2', b);
  followChecks.push({ what: `P2 RTP $${b}, follow-up seeds ${P2FOLLOW[b][0]}-${P2FOLLOW[b][P2FOLLOW[b].length - 1]} alone (${s.rounds.toLocaleString('en-US')} rounds)`, exact: e.rtp, ci95: s.ci95, ok: inCI(e.rtp, s.ci95), rtp: s.rtp },
    { what: `P2 hit rate $${b}, follow-up seeds alone`, exact: e.hitRate, ci95: s.hitCi95, ok: inCI(e.hitRate, s.hitCi95), rtp: s.hitRate }); }
// P4 under run-bar v170: re-test with the same procedure as the v169 run. P4 never ends by itself and its pays are heavy-tailed, so its sample SD
// and its normal CI can be too narrow. The previous runs: run-bar v168 (first 200,000 rounds at $10 above the exact value) and run-bar v169
// ($10 600,000 rounds below the CI, $100 100,000 above it; follow-up seeds added; $10 on all 1,000,000 rounds still below). Here the first pass
// (the pack's seeds) is the CI check; the follow-up seeds are run as an independent replication and reported apart; the pooled "all rounds" line
// is informational only and is not one of the checks.
{ const rd = f => { try { return JSON.parse(fs.readFileSync(O(f), 'utf8')); } catch (e) { return null; } };
  const P4 = (b, seeds) => pool(sims.filter(s => s.policy === 'P4' && s.bet === b && (!seeds || seeds.includes(+s.seedCrypto))));
  const passes = Object.fromEntries([1, 10, 100].map(b => [b, { first: P4FIRST[b], followUp: P4FOLLOW[b] }]));
  const passRow = (b, seeds) => { const l = sims.filter(s => s.policy === 'P4' && s.bet === b && seeds.includes(+s.seedCrypto)); if (!l.length) return null; const x = pool(l), e = pol('P4', b).rtp;
    return { rounds: x.rounds, seeds: x.seeds, policySeeds: x.policySeeds, rtp: x.rtp, ci95: x.ci95, sdX: x.sdX, hitRate: x.hitRate, exact: e, exactInCI: inCI(e, x.ci95), zScore: zOf(e, x.rtp, x.ci95).z, pTwoSided: zOf(e, x.rtp, x.ci95).p, exactSide: inCI(e, x.ci95) ? 'inside' : e < x.ci95[0] ? 'below the CI' : 'above the CI' }; };
  const mcFiles = { 1: ['mc_model_P4_1_13.json'], 10: ['mc_model_P4_10_11.json', 'mc_model_P4_10_12.json'], 100: ['mc_model_P4_100_14.json'] };
  const mcPool = b => { const mc = mcFiles[b].map(rd).filter(Boolean); if (!mc.length) return null;
    const N = mc.reduce((a, x) => a + x.rounds, 0), m = mc.reduce((a, x) => a + x.rtp * x.rounds, 0) / N, hit = mc.reduce((a, x) => a + x.hitRate * x.rounds, 0) / N;
    const se = Math.sqrt(mc.reduce((a, x) => a + (x.sdX ** 2) * x.rounds, 0) / N / N), ci = [m - 1.96 * se, m + 1.96 * se], e = pol('P4', b);
    const g = R.simulation.policies.find(x => x.policy === 'P4' && x.bet === b), gSe = g ? Math.sqrt(g.hitRate * (1 - g.hitRate) / g.rounds) : NaN;
    return { bet: b, rounds: N, seeds: mc.map(x => x.seed), rtp: m, ci95: ci, sdX: Math.sqrt(mc.reduce((a, x) => a + (x.sdX ** 2) * x.rounds, 0) / N), exact: e.rtp, exactInCI: inCI(e.rtp, ci), hitRate: hit,
      pAtLeast: mc[0].pAtLeast, maxX: Math.max(...mc.map(x => x.maxX)),
      gameHitRate: g ? g.hitRate : null, gameRounds: g ? g.rounds : null, gameHitCi95: g ? g.hitCi95 : null, modelHitInGameCI: g ? inCI(hit, g.hitCi95) : null, hitGapSE: g ? (g.hitRate - hit) / gSe : null }; };
  const tr = ['trace_check_P4_1.json', 'trace_check_P4_10.json', 'trace_check_P4_100.json'].map(rd).filter(Boolean);
  // share of P4's simulated return carried by pays of 50x or more (from the jobs' payout histograms)
  const share50 = b => { let hs = 0, h50 = 0; for (const s of sims.filter(s => s.policy === 'P4' && s.bet === b && P4FIRST[b].includes(+s.seedCrypto))) for (const [c, n] of s.histogramCents) { hs += c * n; if (c >= 50 * b * 100) h50 += c * n; } return h50 / hs; };
  R.p4Investigation = {
    previousRuns: 'run-bar v168 (RUN IT AGAIN and RUN HALF in the bar, minimum $1.00): the first 200,000 rounds at $10 (crypto 2401, 2402) gave 96.38% [94.53%, 98.23%], above the exact 94.235%; 600,000 rounds 95.57% [94.18%, 96.95%], exact inside. Run-bar v169 (same bar, minimum $0.02): $10 600,000 rounds 96.516% [94.328%, 98.704%], exact 94.233% below the CI; $100 100,000 rounds 91.605% [89.444%, 93.766%], exact 94.259% above the CI; follow-up seeds: $10 400,000 rounds 95.241% [93.119%, 97.364%] inside, $100 500,000 rounds 93.986% [92.535%, 95.437%] inside; $10 on all 1,000,000 rounds 96.006% [94.443%, 97.569%], exact 94.233% still below (the one failed check of that run; source: minrun/v169_blackjack_out)',
    passes: Object.fromEntries([1, 10, 100].map(b => [b, { first: passRow(b, passes[b].first), followUp: passes[b].followUp.length ? passRow(b, passes[b].followUp) : null, all: passRow(b, passes[b].first.concat(passes[b].followUp)) }])),
    bound: 'NOT any more "no run-bar policy can beat P0": a double returns ' + (ER.double.rtpBest * 100).toFixed(3) + '% (p = ' + ER.double.winChance.toFixed(6) + ' per resolved hand), so cashing out (P0 ' + (pol('P0', 10).rtp * 100).toFixed(3) + '%) bounds nothing; P4 itself returns ' + (pol('P4', 10).rtp * 100).toFixed(3) + '%, P3 ' + (pol('P3', 10).rtp * 100).toFixed(3) + '%. The best any bar policy can return is the exact optimum over all policies (bar_optimum.cpp): ' + (RW ? (RW.rounds[10].upperBound * 100).toFixed(2) + '% at most for the whole round (lambdaHat x the base return)' : '(round_worst.json not found)') + '. A P4 sample is judged against its exact value and against that ceiling',
    heavyTail: { share50xOfReturn: { 1: share50(1), 10: share50(10), 100: share50(100) }, note: 'P4 pays still reach hundreds of x (model Monte Carlo max ' + (mcPool(10) ? mcPool(10).maxX.toFixed(0) : '?') + 'x at $10, model SD ' + (mcPool(10) ? mcPool(10).sdX.toFixed(2) : '?') + 'x v the recursion\'s ' + pol('P4', 10).sdX.toFixed(2) + 'x with its cut paths valued by the tail model): a sample holds few of the largest pays' },
    modelMonteCarlo: Object.fromEntries([1, 10, 100].map(b => [b, mcPool(b)])),
    transitionCheck: tr.map(x => ({ bet: x.bet, rounds: x.rounds, transitionsChecked: x.transitionsChecked, mismatches: x.mismatches })),
  };
  // below the tail: the game's truncated pays min(pay, T x bet) against the model Monte Carlo's (both well estimated), and the counts of
  // the largest pays against the model's rate (Poisson). If the truncated means agree, an RTP gap is carried by the few largest pays.
  const tailFor = (b, seeds) => { const mc = mcFiles[b].map(rd).filter(x => x && x.truncated); if (!mc.length) return null;
    const N = mc.reduce((a, x) => a + x.rounds, 0), list = sims.filter(s => s.policy === 'P4' && s.bet === b && seeds.includes(+s.seedCrypto)), G = list.reduce((a, s) => a + s.rounds, 0), Bc = b * 100;
    const trunc = Object.keys(mc[0].truncated).map(k => { const T = parseFloat(k); let s1 = 0, s2 = 0; for (const s of list) for (const [c, n] of s.histogramCents) { const x = Math.min(c, T * Bc); s1 += x * n; s2 += x * x * n; }
      const gm = s1 / G / Bc, gsd = Math.sqrt(s2 / G - (s1 / G) ** 2) / Bc; const mm = mc.reduce((a, x) => a + x.truncated[k].mean * x.rounds, 0) / N, msd = Math.sqrt(mc.reduce((a, x) => a + x.truncated[k].sdX ** 2 * x.rounds, 0) / N);
      const se = Math.sqrt(gsd ** 2 / G + msd ** 2 / N); return { cap: k, game: gm, model: mm, diffPts: (gm - mm) * 100, z: (gm - mm) / se }; });
    const counts = Object.keys(mc[0].pAtLeast).map(k => { const T = parseFloat(k); let n = 0; for (const s of list) for (const [c, m] of s.histogramCents) if (c >= T * Bc) n += m;
      const p = mc.reduce((a, x) => a + x.pAtLeast[k] * x.rounds, 0) / N, lam = p * G; let cdf = 0, term = Math.exp(-lam); for (let i = 0; i < n; i++) { cdf += term; term *= lam / (i + 1); }
      return { atLeast: k, game: n, modelExpected: lam, pGameAtLeastThis: 1 - cdf }; });
    let over = 0; for (const s of list) for (const [c, n] of s.histogramCents) if (c > 1000 * Bc) over += (c - 1000 * Bc) * n;
    return { gameRounds: G, modelRounds: N, truncated: trunc, counts, gameReturnAbove1000xPts: over / G / Bc * 100 }; };
  R.p4Investigation.tailComparison = Object.fromEntries([1, 10, 100].map(b => [b, tailFor(b, P4FIRST[b])]));
  R.p4Investigation.tailComparisonFollowUp = Object.fromEntries([1, 10, 100].map(b => [b, tailFor(b, P4FOLLOW[b])]));
  // every P4 simulation job replayed through trace_check.js (trace_replay.sh): same rounds (RTP and hit rate equal the job's), every transition checked
  { const jobs = sims.filter(s => s.policy === 'P4'); const rows = jobs.map(s => { const r = rd(`trace_replay_P4_${s.bet}_${s.seedCrypto}.json`);
      return r ? { job: s.f, bet: s.bet, rounds: r.rounds, sameRounds: r.rounds === s.rounds && Math.abs(r.rtp - s.rtp) < 1e-12 && Math.abs(r.hitRate - s.hitRate) < 1e-12, transitionsChecked: r.transitionsChecked, mismatches: r.mismatches } : { job: s.f, bet: s.bet, missing: true }; });
    R.p4Investigation.replay = { jobs: rows.length, replayed: rows.filter(r => !r.missing).length, allSameRounds: rows.every(r => r.sameRounds), rounds: rows.reduce((a, r) => a + (r.rounds || 0), 0),
      transitionsChecked: rows.reduce((a, r) => a + (r.transitionsChecked || 0), 0), mismatches: rows.reduce((a, r) => a + (r.mismatches || 0), 0), list: rows }; }
  // the v168-style fields, kept for readers of results.json
  const I = R.p4Investigation;
  I.firstPass = I.passes[10].first; I.final = I.passes[10].all;
  I.hitVsGame = [1, 10, 100].map(b => I.modelMonteCarlo[b]).filter(Boolean).map(m => `$${m.bet}: model ${(m.hitRate * 100).toFixed(3)}% v game ${(m.gameHitRate * 100).toFixed(3)}% (${m.gameRounds.toLocaleString('en-US')} rounds), ${Math.abs(m.hitGapSE).toFixed(1)} SE apart`).join('; ');
}
// P4's exact hit rate is only an upper bound (the recursion counts cut paths as hits), so its check above allows the cut mass and is weak;
// the model Monte Carlo's hit rate (no cut) is checked against the game simulation's 95% CI as well
for (const b of [10, 100, 1]) { const m = R.p4Investigation.modelMonteCarlo[b]; if (m && m.gameHitCi95) checks.push({ what: `P4 hit rate $${b}: model Monte Carlo ${(m.rounds / 1e6).toFixed(0)}M rounds v game`, exact: m.hitRate, ci95: m.gameHitCi95, ok: m.modelHitInGameCI }); }
// ---------------- DOUBLE OR NOTHING hands through the shipped code (double_sim.js: out/dbl_<opt|conv>_<seed>.json) ----------------
const rdj = f => { try { return JSON.parse(fs.readFileSync(O(f), 'utf8')); } catch (e) { return null; } };
const dblJobs = fs.readdirSync(O('')).filter(f => /^dbl_(opt|conv)_\d+\.json$/.test(f)).map(f => ({ f, ...rdj(f) }));
for (const j of dblJobs) if (j.sha !== C.sha) throw new Error(j.f + ' is from another build');
R.doubleSim = { method: 'runGame(stake) of the shipped build through harness.js, one resolved hand per call (pushes are dealt again inside the call: RUN.deal counts the deals); HIT / STAND asked of a bot: opt = exact best play (rungame.js), conv = the conventional chart (the CR\'s basic strategy)', strategies: {} };
for (const [st, key, label] of [['opt', 'best', 'best play'], ['conv', 'basic', 'basic strategy (conventional chart)']]) { const l = dblJobs.filter(j => j.strategy === st); if (!l.length) continue;
  const N = l.reduce((a, j) => a + j.hands, 0), W = l.reduce((a, j) => a + j.wins, 0), D = l.reduce((a, j) => a + j.deals, 0), w = W / N, rtp = 2 * w, se = 2 * Math.sqrt(w * (1 - w) / N), ci = [rtp - 1.96 * se, rtp + 1.96 * se];
  const q = (D - N) / D, qse = Math.sqrt(q * (1 - q) / D), qci = [q - 1.96 * qse, q + 1.96 * qse]; const ex = ER.double.table[key];
  const row = { label, jobs: l.length, seeds: l.map(j => +j.seedCrypto), hands: N, wins: W, deals: D, pushes: D - N, winChance: w, rtp, rtpSE: se, rtpCi95: ci, exactRtp: ex.rtp, exactWinChance: ex.winChance, rtpInCI: inCI(ex.rtp, ci), zScore: (rtp - ex.rtp) / se,
    pushPerDeal: q, pushCi95: qci, exactPushPerDeal: ex.pushChancePerDeal, pushInCI: inCI(ex.pushChancePerDeal, qci), dealsPerHand: D / N, exactDealsPerHand: ex.dealsPerRun, cpuSec: +l.reduce((a, j) => a + j.sec, 0).toFixed(0),
    aboveOnePointEstimate: rtp > 1, rtpMinusOneInSE: (rtp - 1) / se };
  R.doubleSim.strategies[st] = row;
  checks.push({ what: `DOUBLE OR NOTHING RTP, ${label}, shipped code ${(N / 1e6).toFixed(0)}M hands`, exact: ex.rtp, ci95: ci, ok: row.rtpInCI }, { what: `DOUBLE OR NOTHING pushes per deal, ${label}, shipped code`, exact: ex.pushChancePerDeal, ci95: qci, ok: row.pushInCI }); }
// ---------------- the exact optimum over all bar policies ----------------
R.barOptimum = RW ? { ...RW, offersCheckVsRunBarV170: rdj('bar_optimum_check.json'), independentPolicyEvaluation: (() => { try { return fs.readFileSync(O('bar_policy_eval.log'), 'utf8').trim().split('\n').map(x => JSON.parse(x)); } catch (e) { return null; } })() } : null;
R.fixedAmmoChecks = [];
if (RW) for (const f of fs.readdirSync(O('')).filter(f => /^(ship_opt|mc_opt)_\d+_\d+\.json$/.test(f)).sort()) { const j = rdj(f); if (!j) continue; const A = j.ammoCents || j.fixedAmmoCents, v = BXr(A); if (!v) continue;
  if (j.sha && j.sha !== C.sha) throw new Error(f + ' is from another build');
  const ci = j.ci95, row = { file: f, kind: f.startsWith('ship') ? 'shipped code (showControls + runGame, best play in the double)' : 'bar model Monte Carlo (mc_model.js OPT)', ammoCents: A, rounds: j.rounds, sampleMeanOverAmmo: j.rtpOverAmmo !== undefined ? j.rtpOverAmmo : j.rtp, ci95: ci, sdX: j.sdX, exactLambda: v.VoverA, exactAlwaysDouble: v.P3VoverA, inCI: inCI(v.VoverA, ci), excludesAlwaysDouble: !inCI(v.P3VoverA, ci) };
  R.fixedAmmoChecks.push(row); checks.push({ what: `optimal bar policy at ammo ${A}c, ${row.kind}, ${j.rounds.toLocaleString('en-US')} rounds: mean final/A v V*(A)/A`, exact: v.VoverA, ci95: ci, ok: row.inCI }); }
function BXr(A) { return RW && RW.table.find(t => t.A === A) ? { VoverA: RW.table.find(t => t.A === A).lambda, P3VoverA: RW.table.find(t => t.A === A).alwaysDoubleP3 } : null; }
R.ciChecks = { all: checks.every(c => c.ok), failed: checks.filter(c => !c.ok), count: checks.length, list: checks };
R.followUpChecks = { note: 'P4 follow-up seeds: an independent replication of the first pass, checked apart and never pooled into ciChecks', all: followChecks.every(c => c.ok), failed: followChecks.filter(c => !c.ok), count: followChecks.length, list: followChecks };
{ const g = (pl) => R.simulation.policies.find(x => x.policy === pl && x.bet === 1), t1 = R.p4Investigation.transitionCheck.find(t => t.bet === 1);
  const row = x => x ? { rounds: x.rounds, seeds: x.seeds, policySeeds: x.policySeeds, rtp: x.rtp, ci95: x.ci95, exact: x.exact, exactInCI: x.exactInCI, hitRate: x.hitRate, hitCi95: x.hitCi95, exactHit: x.exactHit, exactCutMass: x.exactCutMass, hitInCI: x.hitInCI, sdX: x.sdX } : null;
  R.smallAmounts = { minRun: C.MIN_RUN, note: 'the minimum for DOUBLE OR NOTHING / DOUBLE HALF is $0.02 (a half link needs half >= $0.02). Doubles are exact (a win pays exactly 2 x the stake), so small amounts have no rounding effect; the only small-amount rule is the minimum itself',
    p4At1: row(g('P4')), p5At1: row(g('P5')), transitionCheckAt1: t1 || null }; }
R.p5ClosedForm = { text: 'DOUBLE HALF once: a first win of a cents (half = floor(a/2), keep = a - half; half >= 2 cents): pay keep + 2 x half with chance w, keep with chance 1 - w; E = a + (2w - 1) half; RTP(P5) = RTP(P0) + (2w - 1) E[half x 1(half >= 2c)] / bet; every round that wins pays something (hit rate = the board hit rate); w = the DOUBLE OR NOTHING win chance',
  w: ER.double.winChance, twoWMinusOne: 2 * ER.double.winChance - 1, byBet: Object.fromEntries([1, 10, 100].map(b => [b, { closedForm: pol('P5', b).closedForm, barModel: { rtp: pol('P5', b).rtp, sdX: pol('P5', b).sdX, hitRate: pol('P5', b).hitRate } }])) };
R.headline = {
  baseRtpBestExact: P.optimal.rtp, baseRtpBestSim: base.rtp, baseRtpBestSimCi95: base.ci95, baseRtpBasic: P.basic_rulesSheet ? P.basic_rulesSheet.rtp : P.basic_stated.rtp, baseRtpStandardChart: P.conventional_bj_basic.rtp, baseRtpWorst: P.worst.rtp,
  baseSdX: P.optimal.sd, baseHitRate: P.optimal.hit, topPayX: EB.top.top4BJ4Wins.pay, topPayOneIn: EB.top.top4BJ4Wins.oneIn, minRun: C.MIN_RUN,
  doubleRtpBest: ER.double.rtpBest, doubleWinChance: ER.double.winChance, doubleRtpBasic: ER.double.rtpBasic, maxWinX: C.MAX_WIN_X,
  roundWorstCase: RW ? { estimate: Object.fromEntries([1, 10, 100].map(b => [b, RW.rounds[b].estimate])), upperBound: Object.fromEntries([1, 10, 100].map(b => [b, RW.rounds[b].upperBound])), lambdaInfinity: RW.extrapolation.lambdaInfinity, lambdaHat: RW.lambdaHat.used, alwaysDoubleToCap: pol('P3', 10).rtp } : null,
  policiesExact: Object.fromEntries(['P0', 'P2', 'P3', 'P4', 'P5'].map(p => [p, Object.fromEntries([1, 10, 100].map(b => [b, pol(p, b).rtp]))])),
};
fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(R, null, 1));
// ---------------- par.txt ----------------
const pc = (x, d = 3) => (x * 100).toFixed(d) + '%', fx = (x, d = 4) => x.toFixed(d), n0 = x => Math.round(x).toLocaleString('en-US');
const pad = (s, n) => String(s).padEnd(n), lp = (s, n) => String(s).padStart(n);
const L = [];
L.push('CARD RUN BLACKJACK 20x - PAR SHEET (lab pack)');
L.push(`Build: ${path.basename(C.file)}  sha256 ${C.sha}  ${R.build.bytes.toLocaleString('en-US')} bytes`);
L.push('Model: infinite deck (every card drawn from 13 ranks, the build\'s newShoe), four hands v one dealer (one card up, draws after the');
L.push('hands, stands on all 17s). Choices on hard 12-16 and soft 17. Ties win; BJ v dealer BJ ties (BJ column pays); dealer BJ beats the rest.');
L.push('Pays (x bet, all three columns add): WINS 2/3/4 = 0.3/1.2/2 · MADE 21 1/2/3/4 = 0.4/1/2/4 · BJ 1/2/3/4 = 0.5/2/10/18. Rounded down to the cent.');
L.push(`Bets $${C.BET_MIN.toFixed(2)}-$${C.BET_MAX.toFixed(2)} in $0.10 steps · max win ${C.MAX_WIN_X.toLocaleString('en-US')}x the bet · minimum $${C.MIN_RUN.toFixed(2)} for DOUBLE OR NOTHING / DOUBLE HALF · run cap ${C.RUN_CAP_X.toLocaleString('en-US')}x the first win`);
L.push('');
L.push('1. BASE GAME (one board, exact)');
L.push(pad('Play', 34) + lp('RTP', 10) + lp('SD (x bet)', 12) + lp('Hit rate', 10));
for (const [n, k] of [['Best play (all cards on the table)', 'optimal'], ['Basic play (rules sheet)', 'basic_stated'], ['Standard blackjack chart', 'conventional_bj_basic'], ['Random 50/50 at choices', 'random'], ['Always stand at choices', 'always_stand'], ['Always hit at choices', 'always_hit'], ['Worst play', 'worst']])
  L.push(pad(n, 34) + lp(pc(P[k].rtp), 10) + lp(fx(P[k].sd), 12) + lp(pc(P[k].hit, 2), 10));
L.push(`Board pays are whole cents at every bet on the $0.10 grid (no rounding effect). Return by column (best play): WINS ${pc(EB.columnContribOptimal.WINS)}, MADE 21 ${pc(EB.columnContribOptimal.MADE21)}, BJ ${pc(EB.columnContribOptimal.BJ)}.`);
L.push('');
L.push('2. PAY DISTRIBUTION (best play, one board)');
L.push(pad('Pay (x bet)', 14) + lp('Probability', 16) + lp('1 in', 14));
for (const e of EB.payValuesOptimal) L.push(pad(fx(e.pay, 1), 14) + lp(e.p.toExponential(6), 16) + lp(n0(1 / e.p), 14));
L.push(`Top pay: four blackjacks and four wins = ${EB.top.top4BJ4Wins.pay}x, 1 in ${n0(EB.top.top4BJ4Wins.oneIn)} rounds (four blackjacks v a dealer blackjack = ${EB.top.fourBJvsDealerBJ.pay}x, 1 in ${n0(EB.top.fourBJvsDealerBJ.oneIn)}).`);
L.push('');
L.push('3. DOUBLE OR NOTHING (one hand, the dealer STANDS ON ALL 17s, ties on 19/20 win, other ties dealt again; win pays exactly 2x)');
L.push(`Win chance per resolved hand p = ${ER.double.winChance.toPrecision(17)} (best play) · RTP best play ${pc(ER.double.rtpBest, 4)} (= 2p) · basic strategy ${pc(ER.double.rtpBasic, 4)} · worst play ${pc(ER.double.rtpWorst, 4)} · always stand ${pc(ER.double.rtpAlwaysStand, 4)} · always hit ${pc(ER.double.rtpAlwaysHit, 4)} · ${fx(ER.double.dealsPerRun, 4)} deals per resolved hand.`);
L.push(pad('Play', 26) + lp('RTP', 11) + lp('Win chance', 12) + lp('Push / deal', 13) + lp('Deals / hand', 14) + lp('RTP, dealer hits S17', 22));
for (const [n, k, o] of [['Best play', 'best', 'best'], ['Basic strategy (conv. chart)', 'basic', 'basic'], ['Worst play', 'worst', 'worst'], ['Always stand', 'alwaysStand', 'alwaysStand'], ['Always hit', 'alwaysHit', 'alwaysHit']]) { const x = ER.double.table[k], y = ER.double.previousRuleHitsSoft17[o];
  L.push(pad(n, 26) + lp(pc(x.rtp, 4), 11) + lp(pc(x.winChance, 4), 12) + lp(pc(x.pushChancePerDeal, 3), 13) + lp(fx(x.dealsPerRun, 5), 14) + lp(pc(y.rtp, 4), 22)); }
L.push(`Basic strategy = ${ER.double.basicDefinition}. The rules sheet's own basic play (a board strategy; soft 18 = stand) applied to this hand returns ${pc(ER.double.otherBasic.rulesSheetBoardBasicOnTheDoubleHand.rtp, 4)}.`);
L.push('Base game and DOUBLE OR NOTHING: no rounding (exact cents at every legal bet). Minimum $0.02 for DOUBLE OR NOTHING / DOUBLE HALF; DOUBLE HALF doubles half (floor of the cents) and banks the rest.');
L.push('');
L.push('4. RUN-BAR POLICIES (one bet per round, runs funded by the round\'s winnings; best play on the board and in DOUBLE OR NOTHING)');
L.push('P0 cash out · P2 DOUBLE OR NOTHING once · P3 DOUBLE OR NOTHING while offered (to the 1,000x cap / max win) · P4 uniform random pick among the buttons shown (CASH OUT / DOUBLE OR NOTHING / DOUBLE HALF) at every bar · P5 DOUBLE HALF once');
L.push('(P1, RUN IT AGAIN once, is retired. Since the dealer stands on all 17s a double returns MORE than 100%, so cashing out (P0) no longer bounds the policies: P2 P3 P4 P5 all beat P0. The best any policy can do is section 7.) P4 simulation rows are the first-pass seeds.');
L.push(pad('Policy', 8) + lp('Exact $1', 10) + lp('Exact $10', 11) + lp('Exact $100', 11) + lp('SD $10', 9) + lp('Hit $10', 9) + '   Simulation $10 (95% CI)              Simulation $100 (95% CI)');
for (const p of ['P0', 'P2', 'P3', 'P4', 'P5']) {
  const s10 = R.simulation.policies.find(r => r.policy === p && r.bet === 10), s100 = R.simulation.policies.find(r => r.policy === p && r.bet === 100);
  const sim = s => s ? `${pc(s.rtp)} [${pc(s.ci95[0])}, ${pc(s.ci95[1])}]` : '(not run)';
  L.push(pad(p, 8) + lp(pc(pol(p, 1).rtp, 4), 10) + lp(pc(pol(p, 10).rtp, 4), 11) + lp(pc(pol(p, 100).rtp, 4), 11) + lp(fx(pol(p, 10).sdX, 3) + (p === 'P4' ? '*' : ''), 9) + lp(pc(pol(p, 10).hitRate, 2) + (p === 'P4' ? '*' : ''), 9) + '   ' + pad(sim(s10), 37) + sim(s100));
}
L.push('* P4: the exact SD and hit rate use the cut paths valued by the tail model (SD a lower bound, hit rate an upper bound, both by the cut mass below).');
L.push('P5 closed form (DOUBLE HALF once): E[pay] = a + (2w - 1) x half for a first win of a cents (half = floor(a/2) >= 2 cents), w = ' + fx(ER.double.winChance, 6) + ', 2w - 1 = ' + fx(2 * ER.double.winChance - 1, 6) + '; RTP(P5) - RTP(P0) = ' + [1, 10, 100].map(b => '$' + b + ' ' + ((pol('P5', b).closedForm.rtpMinusP0) * 100).toFixed(5) + ' pts').join(', ') + '; the bar model equals the closed form to 1e-12 at every bet; hit rate = the board hit rate.');
for (const pl of ['P4', 'P5']) { const s1 = R.simulation.policies.find(r => r.policy === pl && r.bet === 1);
  if (s1) L.push(`${pl} at $1 (small amounts, minimum $${C.MIN_RUN.toFixed(2)}): exact ${pc(s1.exact, 4)}${pl === 'P4' ? ` (cut mass ${pc(s1.exactCutMass, 4)})` : ''}; simulation ${s1.rounds.toLocaleString('en-US')} rounds ${pc(s1.rtp)} [${pc(s1.ci95[0])}, ${pc(s1.ci95[1])}] (crypto ${s1.seeds.join(', ')}${pl === 'P4' ? '; picks ' + s1.policySeeds.join(', ') : ''}): exact ${s1.exactInCI ? 'inside' : 'OUTSIDE'}; hit rate ${pc(s1.hitRate, 2)} [${pc(s1.hitCi95[0], 2)}, ${pc(s1.hitCi95[1], 2)}] v exact ${pc(s1.exactHit, 2)}: ${s1.hitInCI ? 'inside' : 'OUTSIDE'}.`); }
{ const e = pol('P4', 10); L.push(`P4 exact: full recursion of every rule, cut at path probability ${e.eps}; cut mass ${pc(pol('P4', 1).cutMass, 4)} at $1, ${pc(e.cutMass, 4)} at $10, ${pc(pol('P4', 100).cutMass, 4)} at $100; cut paths valued by a linear tail model (alpha ${fx(e.tail.alpha, 6)} x RUN BANK + beta ${fx(e.tail.beta, 6)} x held; an estimate). Bracket at $10 (cut paths at 0 / at Lambda x their total, Lambda = the bound on V*/(S+B) over all states from the bar optimum, ${e.lambdaState ? e.lambdaState.toFixed(3) : '?'}): [${pc(e.rtpLower, 4)}, ${e.rtpUpper ? pc(e.rtpUpper, 4) : '?'}]; at $1 [${pc(pol('P4', 1).rtpLower, 4)}, ${pol('P4', 1).rtpUpper ? pc(pol('P4', 1).rtpUpper, 4) : '?'}]; at $100 [${pc(pol('P4', 100).rtpLower, 4)}, ${pol('P4', 100).rtpUpper ? pc(pol('P4', 100).rtpUpper, 4) : '?'}]. The old upper bound (a cut path is worth at most its total) is invalid now that a double returns more than 100%; the upper end is only as good as the power-law extension of the solved ammo. Convergence of the cut: out/exact_runs_convergence.log.`); }
L.push('');
L.push('5. SIMULATION OF THE SHIPPED CODE');
L.push(`Base: ${base.rounds.toLocaleString('en-US')} rounds at $10, best play, crypto seeds ${base.seeds.join(', ')}: RTP ${pc(base.rtp)} (95% CI ${pc(base.ci95[0])} to ${pc(base.ci95[1])}), SD ${fx(base.sdX, 4)}x, hit rate ${pc(base.hitRate, 2)}, max ${base.maxX}x. Exact ${pc(P.optimal.rtp)}: ${R.simulation.base.exactInCI ? 'inside' : 'OUTSIDE'} the CI.`);
L.push(`Every exact value inside its 95% CI: ${R.ciChecks.all ? 'yes' : 'NO'} (${checks.length} checks: RTP and hit rate, base and P0 P2 P3 P4 P5 at $10 and $100 [P4 and P2: first-pass seeds], P4 and P5 at $1, P4 hit rate model v game at $1 / $10 / $100; DOUBLE OR NOTHING in the shipped code, RTP and pushes per deal at best play and at basic strategy; the optimal bar policy at ammo 40c)${R.ciChecks.all ? '' : '; outside: ' + R.ciChecks.failed.map(c => c.what).join(', ') + ' (see below)'}.`);
L.push(`Follow-up seeds, checked apart as independent replications and never pooled into the checks above (${followChecks.length} checks: P4 at $1 / $10 / $100, P2 at $100): ${followChecks.every(c => c.ok) ? 'all inside' : 'outside: ' + followChecks.filter(c => !c.ok).map(c => c.what).join(', ')}.`);
for (const c of R.ciChecks.failed) { const z = zOf(c.exact, (c.ci95[0] + c.ci95[1]) / 2, c.ci95); const f = followChecks.filter(x => x.what.startsWith(c.what.replace(/ \(.*$/, '')));
  L.push(`  MISS (first pass): ${c.what}: exact ${pc(c.exact, 3)} outside the sample's 95% CI [${pc(c.ci95[0], 3)}, ${pc(c.ci95[1], 3)}] (${Math.abs(z.z).toFixed(2)} SE, two-sided p = ${z.p.toFixed(3)}); follow-up (independent seeds, chosen once after seeing the miss, run once): ` + (f.length ? f.map(x => `${x.what} -> exact ${pc(x.exact, 3)} ${x.ok ? 'inside' : 'OUTSIDE'} [${pc(x.ci95[0], 3)}, ${pc(x.ci95[1], 3)}]`).join('; ') : 'none run') + `. ${checks.length} checks at 5% would show about ${(checks.length * 0.05).toFixed(1)} misses by chance.`); }
{ const I = R.p4Investigation, f = x => `${pc(x.rtp)} [${pc(x.ci95[0])}, ${pc(x.ci95[1])}]`;
  L.push(`P4 (heavy-tailed) - first pass on the pack's seeds (the CI check): $10 ${I.passes[10].first.rounds.toLocaleString('en-US')} rounds ${f(I.passes[10].first)}, exact ${pc(I.passes[10].first.exact)} ${I.passes[10].first.exactSide};`);
  L.push(`  $100 ${I.passes[100].first.rounds.toLocaleString('en-US')} rounds ${f(I.passes[100].first)}, exact ${pc(I.passes[100].first.exact)} ${I.passes[100].first.exactSide}.`);
  L.push(`  All rounds pooled (first pass + follow-up; informational only, not a check): $10 ${I.passes[10].all.rounds.toLocaleString('en-US')} ${f(I.passes[10].all)} exact ${I.passes[10].all.exactSide}; $100 ${I.passes[100].all.rounds.toLocaleString('en-US')} ${f(I.passes[100].all)} exact ${I.passes[100].all.exactSide}; $1 ${I.passes[1].all.rounds.toLocaleString('en-US')} ${f(I.passes[1].all)} exact ${I.passes[1].all.exactSide}.`);
  L.push(`  Checked: the shipped code follows the exact bar model on every transition (${I.transitionCheck.map(t => t.transitionsChecked.toLocaleString('en-US') + ' at $' + t.bet).join(', ')}; ${I.transitionCheck.reduce((a, t) => a + t.mismatches, 0)} mismatches).`);
  for (const b of [1, 10, 100]) { const x = I.passes[b].first; if (x && !x.exactInCI) L.push(`  $${b} first pass: the exact value is ${x.exactSide} (sample ${pc(x.rtp)}, exact ${pc(x.exact)}: ${Math.abs(x.zScore).toFixed(2)} SE, two-sided p = ${x.pTwoSided.toFixed(3)}); the CI is ${RW && x.ci95[0] > RW.rounds[b].upperBound ? 'above even the best any bar policy can return (' + pc(RW.rounds[b].upperBound) + '): a model difference?' : 'not above the ceiling of any bar policy' + (RW ? ' (' + pc(RW.rounds[b].upperBound) + ')' : '') + ': a sampling miss unless the follow-up says otherwise'}.`); }
  for (const b of [1, 10, 100]) { const x = I.passes[b].followUp; if (x) L.push(`  Follow-up seeds alone, $${b}: ${x.rounds.toLocaleString('en-US')} rounds (crypto ${x.seeds.join(', ')}), ${pc(x.rtp)} [${pc(x.ci95[0])}, ${pc(x.ci95[1])}], exact ${pc(x.exact)} ${x.exactSide} (${Math.abs(x.zScore).toFixed(2)} SE).`); }
  { const r = I.replay; L.push(`  Replay (trace_replay.sh): all ${r.jobs} P4 simulation jobs played again through trace_check.js, ${r.replayed === r.jobs && r.allSameRounds ? 'the same rounds (RTP and hit rate equal to the job\'s)' : 'NOT ALL THE SAME ROUNDS'}: ${r.rounds.toLocaleString('en-US')} rounds, ${r.transitionsChecked.toLocaleString('en-US')} transitions, ${r.mismatches} mismatches.`); }
  L.push(`  Model Monte Carlo (the bar model, not the game): ` + [1, 10, 100].map(b => I.modelMonteCarlo[b]).filter(Boolean).map(m => `$${m.bet} ${(m.rounds / 1e6).toFixed(0)}M rounds ${f(m)} exact ${m.exactInCI ? 'inside' : 'OUTSIDE'}`).join('; ') + '.');
  L.push(`  Hit rate, model v game: ${I.hitVsGame}. P0 (${pc(pol('P0', 10).rtp)}) is NOT a bound any more (a double returns ${pc(ER.double.rtpBest, 3)}): P4 itself returns ${pc(pol('P4', 10).rtp, 3)}.`);
  for (const [lab, TC] of [['first pass', I.tailComparison], ['follow-up seeds', I.tailComparisonFollowUp]]) for (const b of [1, 10, 100]) { const t = TC[b]; if (!t || !t.gameRounds) continue;
    L.push(`  Below the tail, $${b}, ${lab} (${t.gameRounds.toLocaleString('en-US')} rounds): game v model mean of min(pay, T x bet): ` + t.truncated.map(x => `T ${x.cap} ${(x.game * 100).toFixed(3)}% v ${(x.model * 100).toFixed(3)}% (z ${x.z.toFixed(1)})`).join(', ') + '.');
    L.push(`    Pays of at least 50x / 100x / 500x / 1,000x: game ` + t.counts.filter(c => ['50x', '100x', '500x', '1000x'].includes(c.atLeast)).map(c => `${c.game} v ${c.modelExpected.toFixed(1)} expected (P = ${c.pGameAtLeastThis.toFixed(3)})`).join(' / ') + `; the part of each pay over 1,000x adds ${t.gameReturnAbove1000xPts.toFixed(2)} pts to the game's sample.`); }
  L.push(`  Pays of 50x or more carry ${pc(I.heavyTail.share50xOfReturn[10], 1)} of P4's simulated return at $10 (${pc(I.heavyTail.share50xOfReturn[100], 1)} at $100): the sample SD and normal CI understate the spread.`); }
// ---- 6. DOUBLE OR NOTHING hands, shipped code ----
L.push(''); L.push('6. DOUBLE OR NOTHING THROUGH THE SHIPPED CODE (runGame of the final build, one resolved hand per call)');
for (const st of ['opt', 'conv']) { const x = R.doubleSim.strategies[st]; if (!x) continue;
  L.push(`${pad(x.label, 36)} ${x.hands.toLocaleString('en-US')} hands (${x.jobs} jobs, crypto ${x.seeds[0]}-${x.seeds[x.seeds.length - 1]}): win chance ${pc(x.winChance, 4)}, RTP ${pc(x.rtp, 3)} [${pc(x.rtpCi95[0], 3)}, ${pc(x.rtpCi95[1], 3)}], exact ${pc(x.exactRtp, 4)} ${x.rtpInCI ? 'inside' : 'OUTSIDE'} (z ${x.zScore.toFixed(2)}); pushes ${(x.pushes).toLocaleString('en-US')} in ${x.deals.toLocaleString('en-US')} deals = ${pc(x.pushPerDeal, 3)} [${pc(x.pushCi95[0], 3)}, ${pc(x.pushCi95[1], 3)}], exact ${pc(x.exactPushPerDeal, 3)} ${x.pushInCI ? 'inside' : 'OUTSIDE'}.`); }
L.push('One resolved hand pays 0 or 2x the stake, so its sample SD is 1.00: 10 million hands put the RTP only to +-0.06 points (the edge is 0.09): the shipped-code test shows consistency with the exact value, not the sign of the edge by itself. The exact value is the evaluator (rungame.js) and the rig tests (browser_smoke.js).');
// ---- 7. the exact optimum ----
if (RW) { const E = RW.extrapolation;
  L.push(''); L.push('7. EXACT OPTIMUM OVER ALL BAR POLICIES (bar_optimum.cpp: value iteration over (held, RUN BANK) in whole cents; cap 1,000 x A; minimum 2c; offers and halves as showControls; checked against run-bar v170 compute() on ' + (R.barOptimum.offersCheckVsRunBarV170 ? R.barOptimum.offersCheckVsRunBarV170.states.toLocaleString('en-US') + ' states, ' + R.barOptimum.offersCheckVsRunBarV170.differences + ' differences' : '?') + ')');
  L.push(`Win chance p = ${RW.pDigits17} (best play in the double). A = the first win in cents; lambda(A) = V*(A) / A. The optimal policy never cashes out before the cap (CASH OUT is chosen in no state); it mixes DOUBLE and DOUBLE HALF, starting with ${[...new Set(RW.table.map(t => t.startAction))].join(' / ')}.`);
  L.push(pad('A (cents)', 10) + lp('states', 12) + lp('iters', 7) + lp('V*/A', 14) + lp('start', 16) + lp('always DOUBLE', 15) + lp('always HALF', 13) + lp('max V*/T', 11) + lp('sec', 6));
  for (const t of RW.table) L.push(pad(t.A, 10) + lp(t.states.toLocaleString('en-US'), 12) + lp(t.iterations, 7) + lp(t.lambda.toFixed(8), 14) + lp(t.startAction, 16) + lp(t.alwaysDoubleP3.toFixed(8), 15) + lp(t.alwaysDoubleHalf.toFixed(6), 13) + lp(t.maxVoverTotalAnyState.toFixed(5), 11) + lp(Math.round(t.seconds), 6));
  if (RW.basicP) { L.push(`Basic strategy p = ${RW.basicP.pDigits17}:`); for (const t of RW.basicP.table) L.push(`  A ${String(t.A).padEnd(5)}c  V*/A ${t.lambda.toFixed(8)}  start ${t.startAction}  always DOUBLE ${t.alwaysDoubleP3.toFixed(8)}`); }
  for (const [A, list] of Object.entries(RW.firstStates)) L.push(`First states of the search at A = ${A}c (held / RUN BANK in cents: value / (held + bank), optimal button): ` + list.map(x => `(${x.held}/${x.bank}: ${x.valueOverTotal.toFixed(5)} ${x.action})`).join(' '));
  L.push(`Extrapolation A -> infinity (1/A law): Richardson pairs ` + E.richardson1overA.map(r => `(${r.A},${r.twoA}) ${r.lambdaInf.toFixed(6)}`).join(', ') + `; least squares ` + E.leastSquares.map(f => `A>=${f.Amin} order ${f.order}: ${f.lambdaInf.toFixed(6)} (rms ${f.rmsResidual.toExponential(1)})`).join('; ') + `. lambda(infinity) = ${E.lambdaInfinity.toFixed(5)} +- ${E.error.toFixed(5)} (${E.errorRule}).`);
  L.push(`lambda(A) nondecreasing in A: ${RW.monotone.nondecreasingEverywhere ? 'yes, at every solved A' : 'NO, not strictly: ' + RW.monotone.exceptions.map(e => `A ${e.smallerA} (${e.lambdaSmaller.toFixed(7)}) > A ${e.largerA} (${e.lambdaLarger.toFixed(7)})`).join('; ') + ' (largest excess ' + RW.monotone.largestExcess.toExponential(1) + '); lattice effects of whole-cent halves'}. lambdaHat = ${RW.lambdaHat.used.toFixed(5)} (${RW.lambdaHat.note}).`);
  if (RW.maxWinClip) L.push('MAX WIN clip (MAX WIN = the run cap, an ammo of 20 x the bet): ' + RW.maxWinClip.rows.map(r => `A ${r.A}: ${r.lambdaWithMaxWin.toFixed(6)} v ${r.lambdaWithout === null ? '?' : r.lambdaWithout.toFixed(6)} (${r.change === null ? '' : (r.change >= 0 ? '+' : '') + r.change.toExponential(1)})`).join('; ') + ' - offers that would pass MAX WIN disappear, which can only lower the value.');
  for (const f of R.fixedAmmoChecks) L.push(`Optimal policy at ammo ${f.ammoCents}c, ${f.kind}: ${f.rounds.toLocaleString('en-US')} rounds, mean final/A ${f.sampleMeanOverAmmo.toFixed(5)} [${f.ci95[0].toFixed(5)}, ${f.ci95[1].toFixed(5)}], exact V*/A ${f.exactLambda.toFixed(6)} ${f.inCI ? 'inside' : 'OUTSIDE'}; always DOUBLE would give ${f.exactAlwaysDouble.toFixed(6)} (${f.excludesAlwaysDouble ? 'outside the CI' : 'inside the CI: not told apart'}).`);
  // ---- 8. round-level worst case ----
  L.push(''); L.push('8. ROUND-LEVEL WORST CASE (best base play, then the best bar policy; every figure = expected pay / bet)');
  L.push(pad('Bet', 7) + lp('cash out P0', 12) + lp('always DOUBLE P3', 18) + lp('exact sum (solved A)', 30) + lp('estimate', 11) + lp('upper bound', 13) + lp('solved mass', 13));
  for (const b of [1, 10, 100]) { const r = RW.rounds[b]; L.push(pad('$' + b, 7) + lp(pc(r.cashOut_P0, 4), 12) + lp(pc(r.alwaysDouble_P3, 4), 18) + lp(r.massWithExactV ? pc(r.exactSumKnownPartOverBet, 3) + ' in ' + pc(r.massWithExactV, 1) + ' of rounds' : '(none solved)', 30) + lp(pc(r.estimate, 3), 11) + lp(pc(r.upperBound, 3), 13) + lp(pc(r.massWithExactV / r.ammoMass, 0) + ' of wins', 13)); }
  L.push(`exact sum = sum of P(A) x V*(A) / bet over the ammo values A whose V* is solved (the other ammo is not in it); estimate = exact where solved and lambda_fit(A) = ${fitMainText()} elsewhere; upper bound = (base best-play return ${pc(RW.bestPlayEAmmo, 3)}) x lambdaHat ${RW.lambdaHat.used.toFixed(5)} (assumes lambda(A) <= lambdaHat for every A, see the monotonicity note).`);
  L.push(`Joint optimisation of base and bar play: E[V*(ammo)] <= lambdaHat x E[ammo] for any base policy and E[ammo] is largest (${pc(RW.bestPlayEAmmo, 3)}) at best play, so the true worst case of the whole round lies between the estimate and the upper bound (gap ${((RW.rounds[10].upperBound - RW.rounds[10].estimate) * 100).toFixed(4)} points at $10); it is about ${pc(RW.rounds[10].estimate, 2)}, not the 94.4% of the change request (that figure is the full-double case only, 95.23% here at the shipped board's 94.368%).`); }
function fitMainText() { const f = RW.extrapolation.leastSquares.find(x => x.order === 1 && x.Amin === 40) || RW.extrapolation.leastSquares[0]; return f.lambdaInf.toFixed(6) + ' ' + (f.c1 >= 0 ? '+ ' : '- ') + Math.abs(f.c1).toFixed(4) + ' / A'; }
fs.writeFileSync(path.join(__dirname, 'par.txt'), L.join('\n') + '\n');
console.log(L.join('\n'));
console.log('\nCI checks:', R.ciChecks.all ? 'all inside' : JSON.stringify(R.ciChecks.failed));
