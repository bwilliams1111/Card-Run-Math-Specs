// Round-level worst case of the lab: the best any run-bar policy can do over a whole round (base round + bar), from the exact optimum over ALL bar policies
// (bar_optimum.cpp, out/bar_optimum_exact.json) and the exact ammo distribution of the board at best play (out/exact_board.json).
//
// The bar is a favourable betting game since the dealer stands on all 17s (p = 0.50045 per resolved double, +0.091%); the optimum from an ammo of A cents is V*(A) = lambda(A) x A, lambda about 1.033.
//   (a) EXACT SUM  sum over the ammo values a of P(a) x V*(a) / bet, for the a whose V* was solved exactly (the rest of the mass is shown);
//   (b) UPPER BOUND  E[ammo] / bet x lambdaHat, lambdaHat = max over the solved A of V*(A)/A, extended by the extrapolated limit plus its error (assumes lambda(A) is nondecreasing in A
//       up to lattice noise: checked numerically below, with the exceptions listed). E[ammo] is the base game's best-play return: no base policy has a larger E[ammo], and for ANY base
//       policy E[V*(ammo)] <= lambdaHat x E[ammo] <= lambdaHat x 94.368%, so the joint optimum over base play and bar play is below (b) as well;
//   (c) ESTIMATE  the exact sum where V* is solved, lambda(A) from the fitted curve lambda_inf - c / A elsewhere (labelled an estimate: the fit's error is part of the report).
// Usage (from labpack/blackjack): node round_worst.js      -> prints, writes out/round_worst.json
'use strict';
const fs = require('fs'), path = require('path');
const O = f => path.join(__dirname, 'out', f);
const rd = f => { try { return JSON.parse(fs.readFileSync(O(f), 'utf8')); } catch (e) { return null; } };
const C = require('./consts').parse();
const EB = rd('exact_board.json'), ER = rd('exact_runs.json'), BX = rd('bar_optimum_exact.json'), BB = rd('bar_optimum_basic.json');
if (!EB || !ER || !BX) throw new Error('needs out/exact_board.json, out/exact_runs.json, out/bar_optimum_exact.json');
for (const [n, x] of [['exact_board', EB.build.sha], ['exact_runs', ER.build.sha], ['bar_optimum_exact', BX.build.sha]]) if (x !== C.sha) throw new Error(n + ' is from another build');
const Rres = BX.results, As = Object.keys(Rres).map(Number).sort((a, b) => a - b), lam = A => Rres[A].VoverA;
const out = { build: { sha: C.sha }, p: BX.p, pDigits17: BX.pDigits17, ammoSolved: As };
// ---- table ----
out.table = As.map(A => { const r = Rres[A]; return { A, states: r.states, iterations: r.iterations, lambda: r.VoverA, startAction: ['CASH OUT', 'DOUBLE OR NOTHING', 'DOUBLE HALF'][r.startAction], alwaysDoubleP3: r.P3VoverA, alwaysDoubleHalf: r.alwaysHalfVoverA,
  maxVoverTotalAnyState: r.maxVoverTotal, maxAt: r.maxVoverTotalAt, cashOutNeverOptimalBeforeCap: r.actionCounts.cashOut === 0, seconds: r.seconds }; });
out.firstStates = Object.fromEntries([10, 100, As[As.length - 1]].filter((a, i, arr) => Rres[a] && arr.indexOf(a) === i).map(A => [A, Rres[A].first.slice(0, 10).map(x => ({ held: x.S, bank: x.B, valueOverTotal: x.ratio, action: x.term ? 'round ends' : ['CASH OUT', 'DOUBLE OR NOTHING', 'DOUBLE HALF'][x.action] }))]));
// ---- monotonicity of lambda(A) ----
{ const ex = []; for (let i = 0; i < As.length; i++) for (let j = i + 1; j < As.length; j++) if (lam(As[i]) > lam(As[j]) + 1e-12) ex.push({ smallerA: As[i], largerA: As[j], lambdaSmaller: lam(As[i]), lambdaLarger: lam(As[j]), excess: lam(As[i]) - lam(As[j]) });
  out.monotone = { nondecreasingEverywhere: ex.length === 0, exceptions: ex, largestExcess: ex.reduce((a, e) => Math.max(a, e.excess), 0),
    note: 'lambda(A) rises with A on the whole (1/A law) but is not strictly monotone: lattice effects of the whole-cent halves and the 2-cent minimum move it by a few 1e-5' }; }
// ---- extrapolation A -> infinity ----
const fit = (Amin, order) => { const pts = As.filter(a => a >= Amin); const X = pts.map(a => Array.from({ length: order + 1 }, (_, k) => k === 0 ? 1 : Math.pow(1 / a, k))), y = pts.map(lam);
  // normal equations
  const n = order + 1, M = Array.from({ length: n }, () => new Array(n + 1).fill(0));
  for (let r = 0; r < pts.length; r++) for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) M[i][j] += X[r][i] * X[r][j]; M[i][n] += X[r][i] * y[r]; }
  for (let i = 0; i < n; i++) { let piv = i; for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[piv][i])) piv = r; [M[i], M[piv]] = [M[piv], M[i]]; for (let r = 0; r < n; r++) if (r !== i) { const f = M[r][i] / M[i][i]; for (let c = i; c <= n; c++) M[r][c] -= f * M[i][c]; } }
  const coef = M.map((row, i) => row[n] / row[i]); const res = pts.map((a, r) => y[r] - X[r].reduce((s, x, k) => s + x * coef[k], 0)); const rms = Math.sqrt(res.reduce((s, e) => s + e * e, 0) / Math.max(1, pts.length - n));
  return { Amin, order, points: pts.length, lambdaInf: coef[0], c1: coef[1], c2: coef[2], rmsResidual: rms }; };
const rich = [], pairs = As.filter(a => As.includes(2 * a)).map(a => [a, 2 * a]);
for (const [a, b] of pairs) rich.push({ A: a, twoA: b, lambdaInf: 2 * lam(b) - lam(a) });
const triples = As.filter(a => As.includes(2 * a) && As.includes(4 * a)); const rich2 = triples.map(a => { const r1 = 2 * lam(2 * a) - lam(a), r2 = 2 * lam(4 * a) - lam(2 * a); return { A: a, lambdaInf: (4 * r2 - r1) / 3 }; });
const fits = []; for (const Amin of [20, 40, 60]) for (const order of [1, 2]) if (As.filter(a => a >= Amin).length > order + 1) fits.push(fit(Amin, order));
const good = fits.filter(f => f.Amin >= 40);
const infs = good.map(f => f.lambdaInf).concat(rich.filter(r => r.A >= 40).map(r => r.lambdaInf));
const lamInf = infs.reduce((a, b) => a + b, 0) / infs.length, spread = Math.max(...infs) - Math.min(...infs), rmsMax = Math.max(...good.map(f => f.rmsResidual));
const lamInfErr = Math.max(spread, 2 * rmsMax, 3e-5);
out.extrapolation = { richardson1overA: rich, richardsonSecondOrder: rich2, leastSquares: fits, lambdaInfinity: lamInf, error: lamInfErr, errorRule: 'max(spread of the A >= 40 fits and Richardson pairs, 2 x the largest fit RMS residual, 3e-5)', range: [lamInf - lamInfErr, lamInf + lamInfErr],
  assumption: 'the error of lambda(A) is a smooth 1/A law plus lattice noise of about the size of the fit residual; the continuum limit has no analytic check here' };
const fitMain = good.find(f => f.order === 1 && f.Amin === 40) || good[0], lamFit = a => fitMain.lambdaInf + fitMain.c1 / a + (fitMain.c2 ? fitMain.c2 / (a * a) : 0);
const lamMaxSolved = Math.max(...As.map(lam)), lamHat = Math.max(lamMaxSolved, lamInf + lamInfErr);
out.lambdaHat = { maxSolved: lamMaxSolved, atA: As.find(a => lam(a) === lamMaxSolved), extrapolatedTop: lamInf + lamInfErr, used: lamHat, note: 'lambdaHat = max(largest V*(A)/A solved, extrapolated limit + error)' };
// state-wise maximum of V*/(S+B) over all states (used for P4's cut paths): grows slowly with the room under the cap
{ const pts = As.map(a => ({ A: a, max: Rres[a].maxVoverTotal, room: 1000 * a / Math.max(1, Rres[a].maxVoverTotalAt[0] + Rres[a].maxVoverTotalAt[1]) })); out.stateMax = { points: pts };
  // log(max) vs log(room): slope
  const xs = pts.filter(p => p.A >= 20).map(p => Math.log(p.room)), ys = pts.filter(p => p.A >= 20).map(p => Math.log(p.max)); const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  const slope = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0), icpt = my - slope * mx; out.stateMax.powerLaw = { slope, intercept: icpt, rule: 'max over all states of V*/(S+B) = exp(intercept) x room^slope, room = cap / (S + B) at the maximising state (S + B = 2 cents)' };
  out.stateMax.lambdaState = room => Math.exp(icpt) * Math.pow(room, slope); }
// ---- the ammo distribution of the board at best play ----
const ammoDist = bet => { const B = Math.round(bet * 100), m = new Map(); for (const e of EB.payTableOptimal) { const t = Math.round(Math.min(e.pay, 1000) * 10), a = Math.floor(B * t / 10); if (a > 0) m.set(a, (m.get(a) || 0) + e.p); } return m; };
out.rounds = {};
for (const bet of [1, 10, 100]) { const B = bet * 100, m = ammoDist(bet); let EA = 0, mass = 0, exact = 0, massKnown = 0, EAknown = 0, est = 0, bound = 0, mixedBound = 0;
  for (const [a, p] of m) { EA += p * a; mass += p; if (Rres[a]) { massKnown += p; EAknown += p * a; exact += p * Rres[a].V; est += p * Rres[a].V; mixedBound += p * Rres[a].V; } else { est += p * a * Math.max(lamFit(a), 1); mixedBound += p * a * lamHat; } }
  const P3 = ER.policies.find(r => r.policy === 'P3' && r.bet === bet).rtp, P0 = ER.policies.find(r => r.policy === 'P0' && r.bet === bet).rtp;
  out.rounds[bet] = { bet, ammoValues: m.size, ammoMass: mass, expectedAmmoOverBet: EA / B, massWithExactV: massKnown, shareOfExpectedAmmoWithExactV: EAknown / EA,
    exactSumKnownPartOverBet: exact / B, restMass: mass - massKnown, restExpectedAmmoOverBet: (EA - EAknown) / B,
    upperBound: EA / B * lamHat, mixedUpperBound: mixedBound / B, estimate: est / B, estimateWithLambdaInfOnly: EA / B * lamInf,
    cashOut_P0: P0, alwaysDouble_P3: P3, solvedAmmo: [...m.keys()].filter(a => Rres[a]).sort((x, y) => x - y), unsolvedAmmoCount: [...m.keys()].filter(a => !Rres[a]).length, smallestAmmoCents: Math.min(...m.keys()), largestAmmoCents: Math.max(...m.keys()) }; }
out.bestPlayEAmmo = EB.policies.optimal.rtp;
out.jointOptimisation = { statement: 'E[V*(ammo)] <= lambdaHat x E[ammo] for ANY base policy, and E[ammo] = the base RTP, maximal (94.368%) at best play; so the optimum over base play AND bar play lies between the best-play exact sum and lambdaHat x 94.368%',
  baseOptimalSumToUpperGap: Object.fromEntries([1, 10, 100].map(b => [b, out.rounds[b].upperBound - out.rounds[b].estimate])) };
if (BB) { out.basicP = { p: BB.p, pDigits17: BB.pDigits17, ammoSolved: Object.keys(BB.results).map(Number).sort((a, b) => a - b), table: Object.keys(BB.results).map(Number).sort((a, b) => a - b).map(A => ({ A, lambda: BB.results[A].VoverA, startAction: ['CASH OUT', 'DOUBLE OR NOTHING', 'DOUBLE HALF'][BB.results[A].startAction], alwaysDoubleP3: BB.results[A].P3VoverA, states: BB.results[A].states })) }; }
const MWr = rd('bar_optimum_exact_mw.json'); if (MWr) out.maxWinClip = { note: 'MAX WIN = the run cap (an ammo of 20 x the bet: MAX WIN 20,000 x bet = 1,000 x ammo): the offers that would pass MAX WIN disappear', rows: Object.keys(MWr.results).map(Number).sort((a, b) => a - b).map(A => ({ A, lambdaWithMaxWin: MWr.results[A].VoverA, lambdaWithout: Rres[A] ? Rres[A].VoverA : null, change: Rres[A] ? MWr.results[A].VoverA - Rres[A].VoverA : null })) };
delete out.stateMax.lambdaState;
fs.writeFileSync(O('round_worst.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ lambdaInfinity: out.extrapolation.lambdaInfinity, error: out.extrapolation.error, lambdaHat: out.lambdaHat, monotone: out.monotone.nondecreasingEverywhere, exceptions: out.monotone.exceptions.length, largestExcess: out.monotone.largestExcess, rounds: out.rounds, powerLaw: out.stateMax.powerLaw }, null, 1));
