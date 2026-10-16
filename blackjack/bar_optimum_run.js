// Driver for bar_optimum.cpp: the exact optimum over ALL run-bar policies (see the header of bar_optimum.cpp).
//   node bar_optimum_run.js check                      offers of the C++ model vs RunBar.compute() of run-bar v170 on ~1.3 million states (edge + random); asserts the build's bar fragments
//   node bar_optimum_run.js solve <exact|basic> A,A,..  value iteration for each ammo A (cents) with the double's win chance p taken from rungame.js
//                                                      (exact = optimal play in DOUBLE OR NOTHING, basic = the conventional chart, the CR's "basic strategy"; 17 digits are printed)
//                                                      optional env: BAR_MW=<cents> (MAX WIN), BAR_MIN=<cents>, BAR_POLICY=<file prefix> (dump the policy table), BAR_TAG=<suffix> for the output name
// Constants (MIN_RUN, RUN_CAP_X, MAX_WIN_X) are read from the build (consts.js) and the build's offer / half / cap / lost-double fragments are asserted present (consts.js rules).
// Writes out/bar_optimum_<tag>.json (merging by A) and appends to out/bar_optimum_<tag>.log. Run one process at a time:  ulimit -v 5500000
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const C = require('./consts').check({ MAX_WIN_X: 20000, MIN_RUN: 0.02, RUN_CAP_X: 1000 });
if (!Object.values(C.rules).every(Boolean)) throw new Error('rule fragments');
const MIN = Math.round(C.MIN_RUN * 100);
const BIN = path.join(__dirname, 'bar_optimum');
const RG = require('./rungame');
const P = { exact: RG.make({ mode: 'max' }).solve().V, basic: RG.make({ mode: 'conv' }).solve().V };
const env = { ...process.env, BAR_CAPX: String(C.RUN_CAP_X) };
const O = f => path.join(__dirname, 'out', f);
const cmd = process.argv[2];
if (cmd === 'check') {
  const local = O('run-bar-v170.copy.js'); if (!fs.existsSync(local)) fs.copyFileSync(fs.existsSync(path.join(__dirname, '..', 'shared', 'run-bar.js')) ? path.join(__dirname, '..', 'shared', 'run-bar.js') : '/home/claude/fix/runbar/run-bar.js', local);
  const RunBar = require(local); if (RunBar.version !== '170') throw new Error('not run-bar v170');
  const H = require('./harness'); const rng = H.sfc32(1717);
  const R = n => Math.floor(rng() * n);
  const states = [];
  for (let h = 1; h <= 300; h++) for (let bk = 0; bk <= 60; bk += 3) for (const am of [1, 2, 5, 40]) for (const mw of [100, 150, 300, 2000, 40000, 2e7]) states.push([h, bk, am, mw]);
  for (let i = 0; i < 400000; i++) { const am = 1 + R(R(2) ? 400 : 100000), mw = R(3) ? 20000 * (10 + R(10000)) : 50 + R(100000), cap = 1000 * am;
    const bk = R(3) ? 0 : R(Math.min(mw, 3 * cap)), target = R(2) ? mw : cap, h = Math.max(1, target - bk + R(7) - 3 - (R(2) ? 0 : R(3) * Math.floor((target - bk) / 2)));
    states.push([h, bk, am, mw]); states.push([Math.max(1, Math.floor((mw - bk) / 2) + R(5) - 2), bk, am, mw]); states.push([1 + R(R(2) ? 20 : 20000), bk, am, mw]); }
  const res = cp.execFileSync(BIN, ['check'], { input: states.map(s => s.join(' ')).join('\n') + '\n', env, maxBuffer: 1 << 28 }).toString().trim().split('\n');
  if (res.length !== states.length) throw new Error('check output length');
  let diffs = 0, bar = 0, term = 0; const ex = [];
  for (let i = 0; i < states.length; i++) {
    const [h, bk, am, mw] = states[i]; const [t, d, hf, half, keep] = res[i].split(' ').map(Number);
    const r = RunBar.compute({ held: h / 100, banked: bk / 100, ammo: am / 100, maxWin: mw / 100 });
    const ok = r.mode !== 'bar' ? t === 1 : (t === 0 && !!d === r.show.double && !!hf === r.show.doubleHalf && half === r.half && keep === r.keep);
    if (r.mode === 'bar') bar++; else term++;
    if (!ok) { diffs++; if (ex.length < 10) ex.push({ h, bk, am, mw, cpp: res[i], runbar: r.mode === 'bar' ? { double: r.show.double, doubleHalf: r.show.doubleHalf, half: r.half, keep: r.keep } : r.mode }); }
  }
  const out = { build: { file: C.file, sha: C.sha }, runBarVersion: RunBar.version, states: states.length, barStates: bar, terminalStates: term, differences: diffs, examples: ex,
    compared: 'round ends (MAX WIN clip, run cap) / DOUBLE OR NOTHING offered / DOUBLE HALF offered / half / keep: bar_optimum.cpp offers() vs RunBar.compute() of run-bar v170' };
  // a mutated offer rule (minimum 3 cents instead of 2) must be caught by the same comparison
  const mres = cp.execFileSync(BIN, ['check'], { input: states.map(s => s.join(' ')).join('\n') + '\n', env: { ...env, BAR_MIN: '3' }, maxBuffer: 1 << 28 }).toString().trim().split('\n'); let mdiff = 0;
  for (let i = 0; i < states.length; i++) { const [h, bk, am, mw] = states[i]; const [t, d, hf, half, keep] = mres[i].split(' ').map(Number); const r = RunBar.compute({ held: h / 100, banked: bk / 100, ammo: am / 100, maxWin: mw / 100 });
    if (r.mode === 'bar' && !(t === 0 && !!d === r.show.double && !!hf === r.show.doubleHalf && half === r.half && keep === r.keep)) mdiff++; }
  out.mutantMinimum3Differences = mdiff; out.mutantCaught = mdiff > 0;
  console.log(JSON.stringify(out, null, 1)); fs.writeFileSync(O('bar_optimum_check.json'), JSON.stringify(out, null, 1)); process.exit(diffs || !mdiff ? 1 : 0);
}
if (cmd === 'solve') {
  const tag = process.argv[3]; if (!(tag in P)) throw new Error('p tag exact | basic'); const As = process.argv[4].split(',').map(Number);
  const p = P[tag]; const mw = +(process.env.BAR_MW || 0), mn = +(process.env.BAR_MIN || MIN), name = 'bar_optimum_' + tag + (process.env.BAR_TAG ? '_' + process.env.BAR_TAG : '');
  console.log(`p (${tag}) = ${p.toPrecision(17)}   MIN ${mn}c   RUN_CAP_X ${C.RUN_CAP_X}   MAX WIN ${mw ? mw + 'c' : 'none'}   build ${C.sha.slice(0, 12)}`);
  let J = { build: { file: C.file, sha: C.sha }, p, pTag: tag, pDigits17: p.toPrecision(17), MIN: mn, RUN_CAP_X: C.RUN_CAP_X, MW: mw, results: {} };
  if (fs.existsSync(O(name + '.json'))) { const old = JSON.parse(fs.readFileSync(O(name + '.json'), 'utf8')); if (old.build.sha !== C.sha || old.p !== p) throw new Error('existing ' + name + '.json is from another build / p'); J = old; }
  for (const A of As) {
    if (J.results[A]) { console.log('skip A=' + A); continue; }
    const t0 = Date.now(); const args = ['solve', String(A), p.toPrecision(17), String(mn), String(mw), process.env.BAR_POLICY ? process.env.BAR_POLICY + '_' + tag + '_' + A + '.bin' : '-', '1'];
    const out = cp.execFileSync(BIN, args, { env, maxBuffer: 1 << 28 }).toString().trim();
    const r = JSON.parse(out); r.seconds = (Date.now() - t0) / 1000; J.results[A] = r;
    const line = `A=${A}c states=${r.states} iters=${r.iterations} V*/A=${r.VoverA.toFixed(9)} start=${['CASH OUT', 'DOUBLE', 'DOUBLE HALF'][r.startAction]} P3/A=${r.P3VoverA.toFixed(9)} halfOnly/A=${r.alwaysHalfVoverA.toFixed(9)} maxV/T=${r.maxVoverTotal.toFixed(6)} ${r.seconds.toFixed(0)}s`;
    console.log(line); fs.appendFileSync(O(name + '.log'), line + '\n'); fs.writeFileSync(O(name + '.json'), JSON.stringify(J, null, 1));
  }
  process.exit(0);
}
throw new Error('usage: node bar_optimum_run.js check | solve <exact|basic> A,A,..');
