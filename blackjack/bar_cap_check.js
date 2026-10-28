// Independent check of bar_optimum_cap.cpp: a memoised recursion over (held, bank, presses left) that takes every offer, every amount and every round end from
// RunBar.compute() of the shipped run-bar v170 (not from the C++ offers), for small ammo and small caps; compares V_N(A) to the C++ result to 1e-10.
// Usage (from labpack/blackjack, after bar_optimum_cap is built):  node bar_cap_check.js   -> out/bar_cap_check.json
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const O = f => path.join(__dirname, 'out', f);
const RunBar = require(O('run-bar-v170.copy.js')); if (RunBar.version !== '170') throw new Error('not run-bar v170');
const RG = require('./rungame'); const p = RG.make({ mode: 'max' }).solve().V, q = 1 - p;
const rows = []; let worst = 0;
for (const A of [2, 3, 4, 5, 6, 7, 8, 10, 13]) {
  const memo = new Map(), MW = 1e9;
  const V = (S, B, r) => { const key = S + ',' + B + ',' + r; if (memo.has(key)) return memo.get(key);
    const st = RunBar.compute({ held: S / 100, banked: B / 100, ammo: A / 100, maxWin: MW / 100 }); let v;
    if (st.mode !== 'bar') v = st.total;   // RunBar.compute() works in whole cents
    else { v = S + B;   // CASH OUT
      if (st.show.double) { const d = p * V(2 * S, B, r) + q * (B > 0 ? V(B, 0, r) : 0); if (d > v) v = d; }
      if (st.show.doubleHalf && r > 0) { const h = p * V(2 * st.half, B + st.keep, r - 1) + q * V(B + st.keep, 0, r - 1); if (h > v) v = h; } }
    memo.set(key, v); return v; };
  const Ns = [0, 1, 2, 3, 4, 6, 9], Nmax = Ns[Ns.length - 1];
  const res = JSON.parse(cp.execFileSync(path.join(__dirname, 'bar_optimum_cap'), ['solve', String(A), p.toPrecision(17), String(Nmax), '2', '0'], { env: { ...process.env, BAR_CAPX: '1000' }, maxBuffer: 1 << 26 }).toString());
  for (const N of Ns) { const js = V(A, 0, N) / A, cpp = res.VoverA[N], d = Math.abs(js - cpp); worst = Math.max(worst, d); rows.push({ A, N, recursion: js, solver: cpp, diff: d }); }
}
const out = { runBar: RunBar.version, p, cases: rows.length, largestDifference: worst, ok: worst < 1e-10, rows };
fs.writeFileSync(O('bar_cap_check.json'), JSON.stringify(out, null, 1)); console.log(JSON.stringify({ cases: out.cases, largestDifference: worst, ok: out.ok }));
process.exit(out.ok ? 0 : 1);
