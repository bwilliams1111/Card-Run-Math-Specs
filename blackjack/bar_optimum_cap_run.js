// Driver for bar_optimum_cap.cpp: the exact optimum over ALL run-bar policies when DOUBLE HALF may be pressed at most N times per run (see the header of the .cpp).
//   node bar_optimum_cap_run.js solve <exact|basic> Nmax A,A,..   for each ammo A (cents): V_N(A) / A for N = 0..Nmax, p taken from rungame.js
//                                                                (exact = optimal play in DOUBLE OR NOTHING, basic = the conventional chart)
//   optional env: BAR_MW=<cents> (MAX WIN), BAR_MIN=<cents>, BAR_TAG=<suffix> for the output name
// Constants (MIN_RUN, RUN_CAP_X, MAX_WIN_X) are read from the build (consts.js) and the build's offer / half / cap / lost-double fragments are asserted present.
// Writes out/bar_cap_<tag>.json (merging by A) and appends to out/bar_cap_<tag>.log. Run one process at a time:  ulimit -v 5500000
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const C = require('./consts').check({ MAX_WIN_X: 20000, MIN_RUN: 0.02, RUN_CAP_X: 1000 });
if (!Object.values(C.rules).every(Boolean)) throw new Error('rule fragments');
const MIN = Math.round(C.MIN_RUN * 100);
const BIN = path.join(__dirname, 'bar_optimum_cap');
const RG = require('./rungame');
const P = { exact: RG.make({ mode: 'max' }).solve().V, basic: RG.make({ mode: 'conv' }).solve().V };
const env = { ...process.env, BAR_CAPX: String(C.RUN_CAP_X) };
const O = f => path.join(__dirname, 'out', f);
if (process.argv[2] !== 'solve') throw new Error('usage: node bar_optimum_cap_run.js solve <exact|basic> Nmax A,A,..');
const tag = process.argv[3]; if (!(tag in P)) throw new Error('p tag exact | basic');
const Nmax = +process.argv[4], As = process.argv[5].split(',').map(Number), p = P[tag];
const mw = +(process.env.BAR_MW || 0), mn = +(process.env.BAR_MIN || MIN), name = 'bar_cap_' + tag + (process.env.BAR_TAG ? '_' + process.env.BAR_TAG : '');
console.log(`p (${tag}) = ${p.toPrecision(17)}   MIN ${mn}c   RUN_CAP_X ${C.RUN_CAP_X}   MAX WIN ${mw ? mw + 'c' : 'none'}   Nmax ${Nmax}   build ${C.sha.slice(0, 12)}`);
let J = { build: { file: C.file, sha: C.sha }, p, pTag: tag, pDigits17: p.toPrecision(17), MIN: mn, RUN_CAP_X: C.RUN_CAP_X, MW: mw, results: {} };
if (fs.existsSync(O(name + '.json'))) { const old = JSON.parse(fs.readFileSync(O(name + '.json'), 'utf8')); if (old.build.sha !== C.sha || old.p !== p) throw new Error('existing ' + name + '.json is from another build / p'); J = old; }
for (const A of As) {
  if (J.results[A] && J.results[A].Nmax >= Nmax) { console.log('skip A=' + A); continue; }
  const out = cp.execFileSync(BIN, ['solve', String(A), p.toPrecision(17), String(Nmax), String(mn), String(mw)], { env, maxBuffer: 1 << 28 }).toString().trim();
  const r = JSON.parse(out); J.results[A] = r;
  const L = r.VoverA, line = `A=${A}c states=${r.states} N=0 ${L[0].toFixed(6)}  N=10 ${L[Math.min(10, Nmax)].toFixed(6)}  N=50 ${L[Math.min(50, Nmax)].toFixed(6)}  N=${Nmax} ${L[Nmax].toFixed(6)}  ${r.seconds}s`;
  console.log(line); fs.appendFileSync(O(name + '.log'), line + '\n'); fs.writeFileSync(O(name + '.json'), JSON.stringify(J));
}
