// Cross-check of exact_runs.js's P4 (and P0, P2, P3, P5): a Monte Carlo of the SAME bar model in cents (exact board distribution, exact
// DOUBLE OR NOTHING win chance, payCents floor, MAX WIN clip, run cap, MIN_RUN minimum (C.MIN_RUN, $0.02), half/keep), not of the game code.
// The bar is CASH OUT / DOUBLE OR NOTHING / DOUBLE HALF (run-bar v170). The double wins with p = 0.50045 (the dealer stands on all 17s): each double is a
// +0.091% bet, so a policy can return MORE than the cash-out figure (the old "no policy can beat P0" no longer holds).
// Fixed-ammo mode (NEW): a 5th argument A (cents) plays the bar alone from ammo A (no board; RTP is final / A) and a 6th argument is a policy table written by
// bar_optimum (BAR_POLICY, records S int32, B int32, action uint8: 0 CASH OUT, 1 DOUBLE, 2 DOUBLE HALF): policy OPT follows the exact optimum, so its sample
// mean can be compared with V*(A)/A (bar_optimum_run.js solve ...).
// It shows whether the game simulation and the exact recursion agree on the bulk of the P4 distribution (hit rate, P(pay >= x))
// and gives a tighter estimate of the model's mean than the game simulation can.
// Usage (from labpack/blackjack): node mc_model.js <policy> <bet> <rounds> <seed>      -> prints JSON (out/mc_model_*.json via run line)
'use strict';
const fs = require('fs'), path = require('path');
const C = require('./consts').check({ MAX_WIN_X: 20000, MIN_RUN: 0.02, RUN_CAP_X: 1000 });
const MIN = Math.round(C.MIN_RUN * 100);   // minimum run in cents
const E = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', 'exact_board.json'), 'utf8'));
const VW = require('./rungame').make({ mode: 'max' }).solve().V;
const H = require('./harness');
const [POL, BET, NR, SEED, AMMO, POLFILE] = process.argv.slice(2); const B = Math.round(+BET * 100), N = +NR, MW = B * C.MAX_WIN_X;
const m = new Map(); for (const e of E.payTableOptimal) { const t = Math.round(e.pay * 10); m.set(t, (m.get(t) || 0) + e.p); }
const D = [...m.entries()].sort((a, b) => a[0] - b[0]); const cum = []; let c = 0; for (const [, p] of D) { c += p; cum.push(c); }
const rng = H.sfc32(+SEED >>> 0);
const FIXA = +(AMMO || 0); let TABLE = null;
if (POLFILE) { const buf = fs.readFileSync(POLFILE); TABLE = new Map(); for (let o = 0; o + 9 <= buf.length; o += 9) TABLE.set(buf.readInt32LE(o) * 67108864 + buf.readInt32LE(o + 4), buf[o + 8]); }
const pickT = () => { const u = rng() * c; let lo = 0, hi = cum.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < u) lo = mid + 1; else hi = mid; } return D[lo][0]; };
let sum = 0, sum2 = 0, hits = 0, max = 0; const ge = { 20: 0, 50: 0, 100: 0, 500: 0, 1000: 0, 2000: 0, 5000: 0 };
// truncated pays min(pay, T x bet): their means are well estimated (finite, small SD), so the game simulation can be compared with the model
// below the heavy tail (aggregate.js); the RTP difference is then carried by the pays over T x bet
const TR = [20, 100, 500, 1000], trS = TR.map(() => 0), trS2 = TR.map(() => 0);
for (let n = 0; n < N; n++) {
  const a = FIXA || Math.floor(B * pickT() / 10); let pay = 0;
  if (a > 0) { let b = 0, h = a, bars = 0;
    for (;;) {
      if (b + h > MW) h = MW - b; const tot = b + h;
      if (tot >= MW || tot >= C.RUN_CAP_X * a) { pay = tot; break; }
      bars++;
      const half = Math.floor(h / 2), keep = h - half;
      const opts = ['cash']; if (h >= MIN && b + 2 * h <= MW) opts.push('dbl'); if (half >= MIN && b + keep + 2 * half <= MW) opts.push('dblH');
      let o;
      if (POL === 'P4') o = opts[Math.floor(rng() * opts.length)];
      else if (POL === 'P0') o = 'cash';
      else if (POL === 'P2') o = bars === 1 && opts.includes('dbl') ? 'dbl' : 'cash';
      else if (POL === 'P3') o = opts.includes('dbl') ? 'dbl' : 'cash';
      else if (POL === 'P5') o = bars === 1 && opts.includes('dblH') ? 'dblH' : 'cash';
      else if (POL === 'OPT') { const code = TABLE.get(h * 67108864 + b); if (code === undefined) throw new Error('state not in the policy table: ' + h + ',' + b); o = ['cash', 'dbl', 'dblH'][code]; if (!opts.includes(o)) throw new Error('policy action not offered'); }
      else throw new Error('policy ' + POL);
      if (o === 'cash') { pay = tot; break; }
      let stake = h, bank = b; if (o === 'dblH') { stake = half; bank = b + keep; }
      const win = rng() < VW ? 2 * stake : 0;
      if (win > 0) { b = bank; h = win; } else if (bank > 0) { b = 0; h = bank; } else { pay = 0; break; }
    } }
  sum += pay; sum2 += pay * pay; if (pay > 0) hits++; if (pay > max) max = pay; for (const k in ge) if (pay >= +k * B) ge[k]++; for (let i = 0; i < TR.length; i++) { const x = Math.min(pay, TR[i] * B); trS[i] += x; trS2[i] += x * x; }
}
const mean = sum / N, sd = Math.sqrt(sum2 / N - mean * mean);
console.log(JSON.stringify({ model: 'bar model Monte Carlo', policy: POL, bet: +BET, fixedAmmoCents: FIXA || undefined, rtpIsFinalOverAmmo: FIXA ? true : undefined, policyFile: POLFILE || undefined, rounds: N, seed: +SEED, rtp: mean / (FIXA || B), ci95: [(mean - 1.96 * sd / Math.sqrt(N)) / (FIXA || B), (mean + 1.96 * sd / Math.sqrt(N)) / (FIXA || B)], sdX: sd / (FIXA || B), hitRate: hits / N, maxX: max / (FIXA || B),
  pAtLeast: Object.fromEntries(Object.entries(ge).map(([k, v]) => [k + 'x', v / N])),
  truncated: Object.fromEntries(TR.map((t, i) => { const m = trS[i] / N; return [t + 'x', { mean: m / B, sdX: Math.sqrt(trS2[i] / N - m * m) / B }]; })) }));
