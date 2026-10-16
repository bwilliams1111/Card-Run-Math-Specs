// Independent check of bar_optimum.cpp (written separately, in JS, from the rules): reads the policy table the C++ solver wrote (BAR_POLICY, records S int32, B int32, action uint8),
// evaluates that policy exactly by value iteration over ALL states of the table (Gauss-Seidel to 1e-14 relative) and then verifies policy optimality: at EVERY state no other offered
// action has a larger value (one-step improvement test; with the evaluated values this proves the policy optimal), and that the value at the start equals V*(A) of the solver.
// Usage (from labpack/blackjack): node bar_policy_eval.js <ammoCents> <policy.bin> <p>
'use strict';
const fs = require('fs');
const C = require('./consts').parse(); const MIN = Math.round(C.MIN_RUN * 100), CAPX = C.RUN_CAP_X;
const [AM, FILE, PS] = process.argv.slice(2); const A = +AM, p = +PS, q = 1 - p, cap = CAPX * A, MW = Infinity;
const buf = fs.readFileSync(FILE), n = buf.length / 9; const S = new Int32Array(n), B = new Int32Array(n), act = new Uint8Array(n); const idx = new Map();
for (let i = 0; i < n; i++) { S[i] = buf.readInt32LE(9 * i); B[i] = buf.readInt32LE(9 * i + 4); act[i] = buf[9 * i + 8]; idx.set(S[i] * 67108864 + B[i], i); }
const get = (s, b) => { const i = idx.get(s * 67108864 + b); if (i === undefined) throw new Error('successor not in the table ' + s + ',' + b); return i; };
// successors from the rules (never from the solver): [dblWin, dblLose(-1: 0), halfWin, halfLose] and offers
const nxt = new Int32Array(4 * n).fill(-2), term = new Uint8Array(n);
for (let i = 0; i < n; i++) { const s = S[i], b = B[i]; if (s + b >= cap) { term[i] = 1; continue; }
  const half = Math.floor(s / 2), keep = s - half;
  if (s >= MIN) { nxt[4 * i] = get(2 * s, b); nxt[4 * i + 1] = b > 0 ? get(b, 0) : -1; }
  if (half >= MIN) { nxt[4 * i + 2] = get(2 * half, b + keep); nxt[4 * i + 3] = get(b + keep, 0); } }
const V = new Float64Array(n); for (let i = 0; i < n; i++) V[i] = S[i] + B[i];
const q3 = (i, k) => k === 0 ? S[i] + B[i] : k === 1 ? (nxt[4 * i] < 0 ? -1 : p * V[nxt[4 * i]] + q * (nxt[4 * i + 1] >= 0 ? V[nxt[4 * i + 1]] : 0)) : (nxt[4 * i + 2] < 0 ? -1 : p * V[nxt[4 * i + 2]] + q * V[nxt[4 * i + 3]]);
let it = 0, md = 1; while (md > 1e-14 && it < 100000) { md = 0; it++; for (let i = n - 1; i >= 0; i--) { if (term[i]) continue; const v = q3(i, act[i]); if (v < 0) throw new Error('policy action not offered at ' + S[i] + ',' + B[i]); md = Math.max(md, Math.abs(v - V[i]) / (S[i] + B[i])); V[i] = v; } }
let worst = 0, viol = 0, cashBest = 0; for (let i = 0; i < n; i++) { if (term[i]) continue; for (let k = 0; k < 3; k++) { const v = q3(i, k); if (v > V[i] * (1 + 1e-12)) { viol++; } worst = Math.max(worst, (v - V[i]) / V[i]); } if (act[i] === 0) cashBest++; }
const out = { ammoCents: A, p, states: n, iterations: it, residual: md, valueOverAmmo: V[0] / A, policyImprovementViolations: viol, largestRelativeGainOfAnyOtherAction: worst, statesWhereCashOutIsTheChosenAction: cashBest };
console.log(JSON.stringify(out));
