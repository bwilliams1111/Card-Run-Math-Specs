// Report of the DOUBLE HALF cap: the exact optimum over all bar policies when DOUBLE HALF may be pressed at most N times in a run (bar_optimum_cap.cpp), and what it means for the
// whole round. Reads out/bar_cap_exact.json, out/bar_cap_basic.json, out/bar_cap_exact_conv.json, out/bar_cap_check.json (bar_optimum_cap_run.js, bar_cap_check.js) and the uncapped
// results (out/bar_optimum_exact.json, out/round_worst.json, out/exact_board.json); writes out/cap50.json and out/CAP50_report.txt.
// Usage (from labpack/blackjack): node cap_report.js [N=50]
'use strict';
const fs = require('fs'), path = require('path');
const O = f => path.join(__dirname, 'out', f);
const rd = f => { try { return JSON.parse(fs.readFileSync(O(f), 'utf8')); } catch (e) { return null; } };
const NCAP = +(process.argv[2] || 50);
const C = require('./consts').parse();
const CX = rd('bar_cap_exact.json'), CB = rd('bar_cap_basic.json'), CV = rd('bar_cap_exact_conv.json'), CK = rd('bar_cap_check.json');
const UX = rd('bar_optimum_exact.json'), UB = rd('bar_optimum_basic.json'), RW = rd('round_worst.json'), EB = rd('exact_board.json');
if (!CX || !UX || !RW || !EB || !CK) throw new Error('needs out/bar_cap_exact.json, bar_cap_check.json, bar_optimum_exact.json, round_worst.json, exact_board.json');
for (const [n, x] of [['bar_cap_exact', CX.build.sha], ['bar_optimum_exact', UX.build.sha], ['round_worst', RW.build.sha], ['exact_board', EB.build.sha]]) if (x !== C.sha) throw new Error(n + ' is from another build');
if (CX.p !== UX.p) throw new Error('different win chance');
const pc = (x, d = 3) => (x * 100).toFixed(d) + '%', f6 = x => x.toFixed(6), f9 = x => x.toFixed(9);
const p = CX.p, edge = 2 * p - 1;
const As = Object.keys(CX.results).map(Number).sort((a, b) => a - b), lam = (A, N) => CX.results[A].VoverA[N];
const out = { build: { sha: C.sha }, N: NCAP, p, pDigits17: CX.pDigits17, edgePerDouble: edge, ammoSolved: As, check: { cases: CK.cases, largestDifference: CK.largestDifference, ok: CK.ok } };
// ---- table: lambda_N(A) ----
const Ns = [0, 1, 2, 3, 5, 10, 20, 30, 40, 50, 60, 75, 100].filter(n => n <= CX.results[As[0]].Nmax);
out.table = Ns.map(N => ({ N, byA: Object.fromEntries(As.map(A => [A, lam(A, N)])) }));
out.uncapped = Object.fromEntries(As.filter(A => UX.results[A]).map(A => [A, UX.results[A].VoverA]));
out.shortfallAtCap = Object.fromEntries(As.filter(A => UX.results[A]).map(A => [A, UX.results[A].VoverA - lam(A, NCAP)]));
out.marginalPress = Object.fromEntries(As.map(A => [A, { lambdaNplus1MinusN: lam(A, NCAP + 1) - lam(A, NCAP), lambdaNminusNminus1: lam(A, NCAP) - lam(A, NCAP - 1) }]));
// ---- convergence of the capped optimum to the uncapped one ----
if (CV) out.convergence = Object.keys(CV.results).map(Number).sort((a, b) => a - b).map(A => { const L = CV.results[A].VoverA, N = CV.results[A].Nmax; return { A, Nmax: N, lambdaNmax: L[N], uncapped: UX.results[A].VoverA, difference: L[N] - UX.results[A].VoverA, firstNWithin1e9: L.findIndex(x => UX.results[A].VoverA - x < 1e-9) }; });
// ---- lambda_N(A) at the cap: saturation in A, limit, lambda-hat ----
const v = As.map(A => lam(A, NCAP));
const fit = (Amin) => { const pts = As.filter(a => a >= Amin), y = pts.map(a => lam(a, NCAP)); const n = pts.length, xs = pts.map(a => 1 / a), mx = xs.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n;
  const c1 = xs.reduce((s, x, i) => s + (x - mx) * (y[i] - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0), L = my - c1 * mx, rms = Math.sqrt(y.reduce((s, yy, i) => s + (yy - L - c1 * xs[i]) ** 2, 0) / Math.max(1, n - 2)); return { Amin, points: n, lambdaInf: L, c1, rmsResidual: rms }; };
const fits = [20, 40, 50].filter(a => As.filter(x => x >= a).length >= 3).map(fit);
const rich = As.filter(a => As.includes(2 * a)).map(a => ({ A: a, twoA: 2 * a, lambdaInf: 2 * lam(2 * a, NCAP) - lam(a, NCAP) }));
const infs = fits.filter(f => f.Amin >= 40).map(f => f.lambdaInf).concat(rich.filter(r => r.A >= 40).map(r => r.lambdaInf));
const lamInf = infs.reduce((a, b) => a + b, 0) / infs.length, spread = Math.max(...infs) - Math.min(...infs), rmsMax = Math.max(...fits.filter(f => f.Amin >= 40).map(f => f.rmsResidual)), err = Math.max(spread, 2 * rmsMax, 3e-5);
const maxSolved = Math.max(...v), lamHat = Math.max(maxSolved, lamInf + err);
const big = As.filter(a => a >= 50).map(a => lam(a, NCAP));
out.atCap = { N: NCAP, values: Object.fromEntries(As.map(A => [A, lam(A, NCAP)])), min50plus: Math.min(...big), max50plus: Math.max(...big), spread50plus: Math.max(...big) - Math.min(...big), fits, richardson: rich, lambdaInfinity: lamInf, error: err, maxSolved, atA: As.find(a => lam(a, NCAP) === maxSolved), lambdaHat: lamHat,
  uncappedLambdaHat: RW.lambdaHat.used, note: 'lambdaHat_N = max(largest V_N(A)/A solved, extrapolated limit + error); error = max(spread of the A >= 40 fits and Richardson pairs, 2 x the largest fit RMS residual, 3e-5)' };
const lamFit = a => Math.max(1, (fits.find(f => f.Amin === 40) || fits[0]).lambdaInf + (fits.find(f => f.Amin === 40) || fits[0]).c1 / a);
// ---- whole round ----
const ammoDist = bet => { const B = Math.round(bet * 100), m = new Map(); for (const e of EB.payTableOptimal) { const t = Math.round(Math.min(e.pay, 1000) * 10), a = Math.floor(B * t / 10); if (a > 0) m.set(a, (m.get(a) || 0) + e.p); } return m; };
const EAm = EB.policies.optimal.rtp;
out.rounds = {};
for (const bet of [1, 10, 100]) { const B = bet * 100, m = ammoDist(bet); let EA = 0, est = 0, exact = 0, massKnown = 0; const solvedHere = [];
  for (const [a, pr] of m) { EA += pr * a; if (CX.results[a]) { est += pr * a * lam(a, NCAP); exact += pr * a * lam(a, NCAP); massKnown += pr; solvedHere.push(a); } else est += pr * a * lamFit(a); }
  const r = RW.rounds[bet]; out.rounds[bet] = { bet, expectedAmmoOverBet: EA / B, estimate: est / B, exactPart: exact / B, massWithExact: massKnown, upperBound: EA / B * lamHat, cashOutP0: r.cashOut_P0, alwaysDoubleP3: r.alwaysDouble_P3, uncappedEstimate: r.estimate, uncappedUpperBound: r.upperBound, solvedAmmo: solvedHere.sort((x, y) => x - y) }; }
out.bestPlayBase = EAm;
// ---- the proposed accounting ----
out.linearFigure = { baseBestPlay: EAm, edgePointsPerPress: edge * 100, presses: NCAP, sum: EAm + NCAP * edge, rule: 'base best-play RTP + N x (2V - 1): adds the edge as if every press staked exactly one bet' };
// ---- ceiling by cap ----
out.ceilingByN = Ns.map(N => { const A = As.includes(200) ? 200 : As[As.length - 1]; return { N, lambdaAtA: lam(A, N), A, wholeRound: EAm * lam(A, N) }; });
out.basic = CB ? { p: CB.p, pDigits17: CB.pDigits17, ammoSolved: Object.keys(CB.results).map(Number).sort((a, b) => a - b), N0: Object.fromEntries(Object.keys(CB.results).map(A => [A, CB.results[A].VoverA[0]])), atCap: Object.fromEntries(Object.keys(CB.results).map(A => [A, CB.results[A].VoverA[Math.min(NCAP, CB.results[A].Nmax)]])),
  uncapped: UB ? Object.fromEntries(Object.keys(CB.results).filter(A => UB.results[A]).map(A => [A, UB.results[A].VoverA])) : null } : null;
fs.writeFileSync(O('cap50.json'), JSON.stringify(out, null, 1));
// ---- text ----
const L = [];
L.push(`CARD RUN BLACKJACK 20x - DOUBLE HALF CAP (at most ${NCAP} presses per run)    build ${C.sha.slice(0, 12)}...   p = ${CX.pDigits17}   edge per double 2p-1 = ${(edge * 100).toFixed(5)}%`);
L.push(`Solver check: bar_optimum_cap.cpp v an independent recursion over (held, bank, presses left) using RunBar.compute() of run-bar v170: ${CK.cases} cases, largest difference ${CK.largestDifference.toExponential(1)} (${CK.ok ? 'pass' : 'FAIL'}).`);
L.push('');
L.push('lambda_N(A) = best expected final payout / first win A, with at most N DOUBLE HALF presses (rows N, columns A in cents)');
L.push('N'.padEnd(6) + As.map(a => String(a).padStart(10)).join(''));
for (const r of out.table) L.push(String(r.N).padEnd(6) + As.map(a => f6(r.byA[a]).padStart(10)).join(''));
L.push('inf'.padEnd(6) + As.map(a => (UX.results[a] ? f6(UX.results[a].VoverA) : '?').padStart(10)) .join(''));
L.push('');
L.push(`At the cap N = ${NCAP}: ` + As.map(a => `${a}c ${f6(lam(a, NCAP))}`).join(' · '));
L.push(`Saturation in A: for A >= 50c the value stays within ${out.atCap.spread50plus.toExponential(1)} (min ${f6(out.atCap.min50plus)}, max ${f6(out.atCap.max50plus)}); the press count, not the room under the 1,000x cap or the 2-cent minimum, is what limits the run.`);
L.push(`Extrapolation A -> infinity at N = ${NCAP}: ` + fits.map(f => `fit A>=${f.Amin}: ${f6(f.lambdaInf)} (c1 ${f.c1.toFixed(4)}, rms ${f.rmsResidual.toExponential(1)})`).join('; ') + `; Richardson ` + rich.filter(r => r.A >= 40).map(r => `(${r.A},${r.twoA}) ${f6(r.lambdaInf)}`).join(', ') + `. lambda_${NCAP}(infinity) = ${lamInf.toFixed(5)} +- ${err.toFixed(5)}; lambdaHat_${NCAP} = ${lamHat.toFixed(5)} (uncapped lambdaHat ${RW.lambdaHat.used.toFixed(5)}).`);
L.push(`Marginal value of the next press at N = ${NCAP}: ` + As.filter(a => a >= 50).map(a => `${a}c +${out.marginalPress[a].lambdaNplus1MinusN.toExponential(2)}`).join(' · ') + ' (lambda_51 - lambda_50).');
if (out.convergence) { L.push(''); L.push('Convergence N -> infinity (this solver against the uncapped value iteration of bar_optimum.cpp, an independent algorithm):'); for (const c of out.convergence) L.push(`  A ${String(c.A).padEnd(3)}c  N = ${c.Nmax}: ${f9(c.lambdaNmax)}  uncapped ${f9(c.uncapped)}  difference ${c.difference.toExponential(1)}  within 1e-9 from N = ${c.firstNWithin1e9}`); }
L.push(''); L.push('Whole round, best play on the board (base ' + pc(EAm, 3) + '):');
L.push('Bet'.padEnd(7) + 'Cash out'.padStart(11) + 'Always DOUBLE'.padStart(15) + `Optimum, cap ${NCAP}`.padStart(18) + `Upper bound, cap ${NCAP}`.padStart(25) + 'No cap: estimate'.padStart(19) + 'No cap: bound'.padStart(15));
for (const b of [1, 10, 100]) { const r = out.rounds[b]; L.push(('$' + b).padEnd(7) + pc(r.cashOutP0, 4).padStart(11) + pc(r.alwaysDoubleP3, 4).padStart(15) + pc(r.estimate, 3).padStart(18) + pc(r.upperBound, 3).padStart(25) + pc(r.uncappedEstimate, 3).padStart(19) + pc(r.uncappedUpperBound, 3).padStart(15)); }
L.push(`estimate = exact V_${NCAP}(A) where A was solved (${out.rounds[1].solvedAmmo.length} of the ammo values at $1; ${pc(out.rounds[1].massWithExact, 1)} of rounds) and lambda_fit(A) elsewhere; upper bound = base best-play return x lambdaHat_${NCAP}.`);
L.push(`The proposed accounting: base ${pc(EAm, 3)} + ${NCAP} x ${(edge * 100).toFixed(4)} = ${pc(out.linearFigure.sum, 3)} (adds the edge as if each press staked exactly one bet; a ceiling here, not the exact figure). Exact ceiling ${pc(out.rounds[10].upperBound, 3)}.`);
L.push(''); L.push(`Whole-round ceiling v cap N (best board play, ceiling = base x lambda_N at A = ${out.ceilingByN[0].A}c):`);
L.push(out.ceilingByN.map(r => `N ${r.N}: ${pc(r.wholeRound, 3)}`).join(' · ') + ` · no cap: ${pc(EAm * RW.lambdaHat.used, 3)} (bound), ${pc(RW.rounds[10].estimate, 3)} (estimate)`);
if (out.basic) { L.push(''); L.push(`Conventional chart in the double (p = ${CB.pDigits17}): lambda_N(A) at N = 0 / ${NCAP}` + (out.basic.uncapped ? ' / no cap' : '') + ': ' + out.basic.ammoSolved.map(A => `${A}c ${f6(out.basic.N0[A])} / ${f6(out.basic.atCap[A])}` + (out.basic.uncapped && out.basic.uncapped[A] ? ' / ' + f6(out.basic.uncapped[A]) : '')).join(' · ')); }
fs.writeFileSync(O('CAP50_report.txt'), L.join('\n') + '\n'); console.log(L.join('\n'));
