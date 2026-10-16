// Lab pack: BLACKJACK 20x board (the four-hand round), exact. From (working copy) bj18/exact18.js (independent re-implementation of
// the rules); the pay constants are READ from the final build (consts.js) and asserted equal to the values used here.
// Outputs out/exact_board.json (RTP / SD / hit rate per play, pay distributions, top pay and odds) and out/optmasks.bin(.json)
// (the exact best-play decision table, used by the simulation's best-play bot). About 3 minutes of CPU.
// Infinite deck (the build's newShoe draws every card independently: rank 1/13, tens 4/13).
// Four hands vs one dealer (no hole card, dealer stands on all 17 = S17), hands played left to right.
// Forced: hit hard <=11 / soft <=16; stand hard >=17 / soft >=18. Choice (HIT/STAND) on hard 12-16 and soft 17.
// Pay = BJ_C[#BJ] + M21[#made21] + WINS[#wins] (x bet). Ties win, except BJ vs dealer BJ (tie, not a win). Dealer BJ beats everything else.
// Usage (from labpack/blackjack): node exact_board.js
'use strict';
const fs = require('fs');
const args = process.argv.slice(2);
const argv = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };

const path = require('path');
const BJ_C = {4:18, 3:10, 2:2, 1:0.5}, M21 = {1:0.4, 2:1, 3:2, 4:4}, WINS = {4:2, 3:1.2, 2:0.3};
const BUILD = require('./consts').check({ BJ_C, M21, WINS, CAP: 1000 });   // throws unless the build ships exactly these (and the rule fragments are present)
if (!Object.values(BUILD.rules).every(Boolean)) throw new Error('rule fragments');
const PR = [0]; for (let r = 1; r <= 10; r++) PR[r] = r === 10 ? 4/13 : 1/13;

// ---- categories of a finished hand ----
// 0 bust, 1 stood <=16, 2..5 = 17..20, 6 = made 21 (3+ cards), 7 = blackjack
const NC = 8, CAT = ['BUST','<=16','17','18','19','20','M21','BJ'];
// ---- dealer outcomes (S17, starts from the upcard alone) ----
// 0 bust, 1..4 = 17..20, 5 = 21 (3+ cards), 6 = natural (2-card 21)
const DLR = [];
for (let up = 1; up <= 10; up++) {
  const out = new Array(7).fill(0);
  const rec = (low, ace, n, p) => {
    const soft = ace && low + 10 <= 21, t = soft ? low + 10 : low;
    if (low > 21) { out[0] += p; return; }
    if (t >= 17) { out[t === 21 ? (n === 2 ? 6 : 5) : t - 16] += p; return; }
    for (let r = 1; r <= 10; r++) rec(low + r, ace || r === 1, n + 1, p * PR[r]);
  };
  rec(up, up === 1, 1, 1); DLR[up] = out;
}
const handWins = (c, D) => {
  if (c === 0) return 0;
  if (c === 7) return D === 6 ? 0 : 1;
  if (D === 6) return 0;
  if (D === 0) return 1;
  if (c === 1) return 0;
  if (c === 6) return 1;
  const t = 15 + c, dt = 16 + D; return t >= dt ? 1 : 0;   // tie wins
};
// payout exactly as currentPay() adds it (float): (BJ_C[bj]||0) + (M21[made]||0), then += WINS[wins]||0
const payOf = (bj, made, w) => { let p = (BJ_C[bj] || 0) + (M21[made] || 0); p += (WINS[w] || 0); return p; };

// ---- initial two-card states ----
// state = (low, ace); BJ separate. Enumerate ordered rank pairs.
const INIT = new Map();
for (let a = 1; a <= 10; a++) for (let b = 1; b <= 10; b++) {
  const low = a + b, ace = a === 1 || b === 1, bj = ace && low === 11;
  const key = bj ? 'BJ' : low + (ace ? 'a' : 'h');
  if (!INIT.has(key)) INIT.set(key, { key, low, ace, bj, p: 0 });
  INIT.get(key).p += PR[a] * PR[b];
}
const S0 = [...INIT.values()]; const NS = S0.length;  // 27
// decision slots: hard 12..16 -> 0..4, soft 17 -> 5
function slotOf(low, ace) {
  const soft = ace && low + 10 <= 21;
  if (soft) return low + 10 === 17 ? 5 : -1;
  return (low >= 12 && low <= 16) ? low - 12 : -1;
}
// hand play given continuation values C[8]; mode: 'max' | 'min' | {mask} (bit=1 hit) | 'rand'
// returns value per initial state + the mask actually used (for max/min)
function playHand(C, mode, maskIn) {
  const memo = new Float64Array(64).fill(NaN); let mask = 0;
  const V = (low, ace) => {
    if (low > 21) return C[0];
    const k = low * 2 + (ace ? 1 : 0); if (!Number.isNaN(memo[k])) return memo[k];
    const soft = ace && low + 10 <= 21, t = soft ? low + 10 : low; let v;
    const hit = () => { let s = 0; for (let r = 1; r <= 10; r++) s += PR[r] * V(low + r, ace || r === 1); return s; };
    if (t === 21) v = C[6];
    else if (soft ? t <= 16 : t <= 11) v = hit();
    else if (t >= 17 && !(soft && t === 17)) v = C[t - 15];
    else {   // choice
      const st = soft ? C[2] : C[1], h = hit(), sl = slotOf(low, ace);
      if (mode === 'max') { if (h > st) { v = h; mask |= 1 << sl; } else v = st; }
      else if (mode === 'min') { if (h < st) { v = h; mask |= 1 << sl; } else v = st; }
      else if (mode === 'rand') v = 0.5 * (h + st);
      else v = (maskIn >> sl) & 1 ? h : st;
    }
    memo[k] = v; return v;
  };
  const out = new Float64Array(NS);
  for (let s = 0; s < NS; s++) out[s] = S0[s].bj ? C[7] : V(S0[s].low, S0[s].ace);
  // make sure every slot is evaluated (mask completeness) for max/min
  if (mode === 'max' || mode === 'min') { for (let l = 12; l <= 16; l++) V(l, false); V(7, true); }
  return { out, mask };
}
// category distribution per initial state under a fixed mask (or 'rand')
function catDist(maskOrRand) {
  const res = [];
  const memo = new Map();
  const D = (low, ace) => {
    const z = new Float64Array(NC);
    if (low > 21) { z[0] = 1; return z; }
    const k = low * 2 + (ace ? 1 : 0); if (memo.has(k)) return memo.get(k);
    const soft = ace && low + 10 <= 21, t = soft ? low + 10 : low;
    const hit = () => { const s = new Float64Array(NC); for (let r = 1; r <= 10; r++) { const d = D(low + r, ace || r === 1); for (let c = 0; c < NC; c++) s[c] += PR[r] * d[c]; } return s; };
    let v;
    if (t === 21) { v = new Float64Array(NC); v[6] = 1; }
    else if (soft ? t <= 16 : t <= 11) v = hit();
    else if (t >= 17 && !(soft && t === 17)) { v = new Float64Array(NC); v[t - 15] = 1; }
    else {
      const st = new Float64Array(NC); st[soft ? 2 : 1] = 1; const h = hit(), sl = slotOf(low, ace);
      if (maskOrRand === 'rand') { v = new Float64Array(NC); for (let c = 0; c < NC; c++) v[c] = 0.5 * (st[c] + h[c]); }
      else v = (maskOrRand >> sl) & 1 ? h : st;
    }
    memo.set(k, v); return v;
  };
  for (let s = 0; s < NS; s++) { if (S0[s].bj) { const z = new Float64Array(NC); z[7] = 1; res.push(z); } else res.push(D(S0[s].low, S0[s].ace)); }
  return res;
}

// ---- multisets of categories ----
const MS = [[], [], [], [], []], MSI = [new Map(), new Map(), new Map(), new Map(), new Map()];
(function gen(k, start, cur) { const key = cur.join(','); MSI[cur.length].set(key, MS[cur.length].length); MS[cur.length].push(cur.slice()); if (k === 4) return; for (let c = start; c < NC; c++) { cur.push(c); gen(k + 1, c, cur); cur.pop(); } })(0, 0, []);
const addC = (k, idx, c) => { const a = MS[k][idx].concat([c]).sort((x, y) => x - y); return MSI[k + 1].get(a.join(',')); };
const ADD = [0, 1, 2, 3].map(k => MS[k].map((_, idx) => Array.from({ length: NC }, (_, c) => addC(k, idx, c))));

// terminal value per (multiset of 4, upcard)
const TERM = MS[4].map(m => {
  const bj = m.filter(c => c === 7).length, made = m.filter(c => c === 6).length; const v = new Float64Array(11);
  for (let up = 1; up <= 10; up++) { let s = 0; for (let D = 0; D < 7; D++) { const q = DLR[up][D]; if (!q) continue; let w = 0; for (const c of m) w += handWins(c, D); s += q * payOf(bj, made, w); } v[up] = s; }
  return v;
});

// ---- backward DP for context-dependent policies ('max' / 'min') ----
// level i (0..3): hand i is played; P = multiset of i finished hands; F' = initial states of hands i+1..3 (ordered); u = upcard
function solve(mode) {
  const nF = k => NS ** k;           // number of ordered tuples of length k
  // G[i] holds values at the start of hand i for (Pidx, F = (s_i, ..., s_3), u): size |MS[i]| * NS^(4-i) * 10
  const G = [], MASK = [];
  G[4] = null;
  for (let i = 3; i >= 0; i--) {
    const nP = MS[i].length, lenF = 3 - i, nFp = nF(lenF);
    const Gi = new Float64Array(nP * NS * nFp * 10), Mi = new Uint8Array(nP * nFp * 10);
    const C = new Float64Array(NC);
    for (let P = 0; P < nP; P++) for (let f = 0; f < nFp; f++) for (let u = 1; u <= 10; u++) {
      for (let c = 0; c < NC; c++) {
        const P2 = ADD[i][P][c];
        C[c] = i === 3 ? TERM[P2][u] : G[i + 1][((P2 * nFp) + f) * 10 + (u - 1)];   // next level's F = f (s_{i+1} leads)
      }
      const r = playHand(C, mode);
      Mi[(P * nFp + f) * 10 + (u - 1)] = r.mask;
      for (let s = 0; s < NS; s++) Gi[((P * (NS * nFp)) + s * nFp + f) * 10 + (u - 1)] = r.out[s];
    }
    G[i] = Gi; MASK[i] = Mi;
  }
  // F index convention: at level i, F=(s_i, rest) has index s_i*nFp + f(rest); this matches next level's f because rest index is the same base-NS number.
  let rtp = 0; const nFp0 = NS ** 3;
  for (let u = 1; u <= 10; u++) for (let s = 0; s < NS; s++) for (let f = 0; f < nFp0; f++) {
    const f1 = Math.floor(f / (NS * NS)), f2 = Math.floor(f / NS) % NS, f3 = f % NS;
    rtp += PR[u] * S0[s].p * S0[f1].p * S0[f2].p * S0[f3].p * G[0][(s * nFp0 + f) * 10 + (u - 1)];
  }
  return { rtp, MASK };
}

// forward pass: distribution of (terminal multiset, upcard) under a policy given by maskAt(i, P, f, u) or iid catDist per u
function forward(maskAt, cdCache) {
  const R = new Float64Array(MS[4].length * 11);
  // level 0 mass over (F full, u). Process level by level with maps keyed (P, Frest, u)
  let cur = new Map();   // key: P|frest(index)|u  -> mass ; frest = initial states of hands i..3 as base-NS index
  for (let u = 1; u <= 10; u++) for (let f = 0; f < NS ** 4; f++) {
    let p = PR[u], x = f; for (let j = 0; j < 4; j++) { p *= S0[x % NS].p; x = Math.floor(x / NS); }
    cur.set(0 * 1e9 + f * 16 + u, p);   // P=0 (empty)
  }
  for (let i = 0; i < 4; i++) {
    const nxt = new Map(), lenRest = 3 - i, nFp = NS ** lenRest;
    for (const [key, mass] of cur) {
      const u = key % 16, f = Math.floor(key / 16) % 1e9 / 1, P = Math.floor(key / 1e9);
      const ff = Math.floor((key % 1e9) / 16);
      const s = Math.floor(ff / nFp), rest = ff % nFp;
      const cd = cdCache(maskAt(i, P, rest, u), u)[s];
      for (let c = 0; c < NC; c++) { if (!cd[c]) continue; const P2 = ADD[i][P][c];
        if (i === 3) R[P2 * 11 + u] += mass * cd[c];
        else { const k2 = P2 * 1e9 + rest * 16 + u; nxt.set(k2, (nxt.get(k2) || 0) + mass * cd[c]); } }
    }
    cur = nxt;
  }
  return R;
}
// payout distribution from terminal masses
function payoutDist(R) {
  const dist = new Map();
  for (let m = 0; m < MS[4].length; m++) for (let u = 1; u <= 10; u++) {
    const mass = R[m * 11 + u]; if (!mass) continue; const ms = MS[4][m];
    const bj = ms.filter(c => c === 7).length, made = ms.filter(c => c === 6).length;
    for (let D = 0; D < 7; D++) { const q = DLR[u][D]; if (!q) continue; let w = 0; for (const c of ms) w += handWins(c, D);
      const key = bj + '|' + made + '|' + w; const e = dist.get(key) || { bj, made, w, pay: payOf(bj, made, w), p: 0 }; e.p += mass * q; dist.set(key, e); }
  }
  return [...dist.values()];
}
function summarize(name, dist) {
  let m1 = 0, m2 = 0, hit = 0, tot = 0;
  for (const e of dist) { tot += e.p; m1 += e.p * e.pay; m2 += e.p * e.pay * e.pay; if (e.pay > 0) hit += e.p; }
  const sd = Math.sqrt(m2 - m1 * m1);
  return { name, rtp: m1, sd, hit, totalProb: tot };
}

// --- iid policies ---
const cdMaskCache = new Map();
const cdOf = mask => { if (!cdMaskCache.has(mask)) cdMaskCache.set(mask, catDist(mask)); return cdMaskCache.get(mask); };
// Stated "basic play" (rules sheet): always hit hard 12; hit hard 13 vs 2,3; stand 13-16 vs 4-6; stand 14-16 vs 2,3; hit 13-16 vs 7+ (incl. A); hit soft 17 except vs 7.
function basicMask(u) { // bits: 0..4 = hard 12..16, 5 = soft 17
  let m = 1;            // hard 12 always hit
  const hi = (u >= 7 || u === 1);
  if (u === 2 || u === 3 || hi) m |= 1 << 1;  // hard 13
  if (hi) m |= (1 << 2) | (1 << 3) | (1 << 4); // hard 14-16
  if (u !== 7) m |= 1 << 5;                     // soft 17
  return m;
}
// Conventional blackjack basic (S17, no double): hard 12 stand vs 4-6; 13-16 stand vs 2-6; soft 17 always hit
function convMask(u) { let m = 0; const lo = u >= 2 && u <= 6; if (!(u >= 4 && u <= 6)) m |= 1; if (!lo) m |= (1<<1)|(1<<2)|(1<<3)|(1<<4); m |= 1 << 5; return m; }

const t0 = Date.now();
const out = { model: 'infinite deck, S17, no hole card, 4 hands, choices on hard 12-16 & soft 17', policies: {} };
const opt = solve('max');
const worst = solve('min');
const nP = i => MS[i].length;
const maskAtCtx = MASK => (i, P, rest, u) => MASK[i][(P * NS ** (3 - i) + rest) * 10 + (u - 1)];
const cdCtx = (mask) => cdOf(mask);
const distOpt = payoutDist(forward(maskAtCtx(opt.MASK), m => cdOf(m)));
const distWorst = payoutDist(forward(maskAtCtx(worst.MASK), m => cdOf(m)));
const iid = f => payoutDist(forward((i, P, rest, u) => f(u), (m, u) => (m === 'rand' ? cdOf('rand') : cdOf(m))));
const distBasic = iid(basicMask), distConv = iid(convMask), distStand = iid(() => 0), distHit = iid(() => 63), distRand = iid(() => 'rand');
const S = {
  optimal: summarize('optimal', distOpt), basic_stated: summarize('basic (rules-sheet table)', distBasic), conventional_bj_basic: summarize('conventional BJ basic', distConv),
  always_stand: summarize('always stand at choices', distStand), always_hit: summarize('always hit at choices', distHit), random: summarize('random 50/50', distRand), worst: summarize('worst', distWorst)
};
console.log('backward optimal RTP', opt.rtp, ' worst', worst.rtp, ' (', (Date.now() - t0) / 1000, 's)');
for (const k in S) console.log(k.padEnd(22), 'RTP', (S[k].rtp * 100).toFixed(4) + '%', ' SD', S[k].sd.toFixed(4), ' hit', (S[k].hit * 100).toFixed(3) + '%', ' sumP', S[k].totalProb.toFixed(12));
out.policies = S;
// pay-tier table (optimal)
const tiers = distOpt.slice().sort((a, b) => b.pay - a.pay);
out.payTableOptimal = tiers.map(e => ({ bj: e.bj, made21: e.made, wins: e.w, pay: +e.pay.toFixed(10), p: e.p, oneIn: 1 / e.p, rtpContribution: e.p * e.pay }));
out.payTableBasic = distBasic.slice().sort((a, b) => b.pay - a.pay).map(e => ({ bj: e.bj, made21: e.made, wins: e.w, pay: +e.pay.toFixed(10), p: e.p }));
out.payTableConventional = distConv.slice().sort((a, b) => b.pay - a.pay).map(e => ({ bj: e.bj, made21: e.made, wins: e.w, pay: +e.pay.toFixed(10), p: e.p }));
out.payTableWorst = distWorst.slice().sort((a, b) => b.pay - a.pay).map(e => ({ bj: e.bj, made21: e.made, wins: e.w, pay: +e.pay.toFixed(10), p: e.p }));
out.build = { file: BUILD.file, sha: BUILD.sha };
// grouped by pay value
const byPay = new Map(); for (const e of distOpt) { const k = e.pay.toFixed(4); byPay.set(k, (byPay.get(k) || 0) + e.p); }
out.payValuesOptimal = [...byPay.entries()].map(([k, p]) => ({ pay: +k, p })).sort((a, b) => b.pay - a.pay);
// column contributions (optimal)
let cBJ = 0, cM = 0, cW = 0; for (const e of distOpt) { cBJ += e.p * (BJ_C[e.bj] || 0); cM += e.p * (M21[e.made] || 0); cW += e.p * (WINS[e.w] || 0); }
out.columnContribOptimal = { BJ: cBJ, MADE21: cM, WINS: cW };
let bBJ = 0, bM = 0, bW = 0; for (const e of distBasic) { bBJ += e.p * (BJ_C[e.bj] || 0); bM += e.p * (M21[e.made] || 0); bW += e.p * (WINS[e.w] || 0); }
out.columnContribBasic = { BJ: bBJ, MADE21: bM, WINS: bW };
const pDN = DLR[1][6] * PR[1] + DLR[10][6] * PR[10];
out.dealer = { pNatural: pDN, S17: DLR.slice(1).map((d, i) => ({ up: i + 1, bust: d[0], d17: d[1], d18: d[2], d19: d[3], d20: d[4], d21: d[5], nat: d[6] })) };
const pBJ = S0.find(s => s.bj).p; out.pBJperHand = pBJ;
out.top = { top4BJ4Wins: { pay: BJ_C[4] + WINS[4], p: pBJ ** 4 * (1 - pDN), oneIn: 1 / (pBJ ** 4 * (1 - pDN)) }, fourBJvsDealerBJ: { pay: BJ_C[4], p: pBJ ** 4 * pDN, oneIn: 1 / (pBJ ** 4 * pDN) }, p4BJ: pBJ ** 4 };
// payout >= thresholds (optimal)
out.tailsOptimal = [1, 2, 3, 5, 10, 12, 18, 20].map(x => ({ atLeast: x, p: distOpt.filter(e => e.pay >= x - 1e-9).reduce((a, e) => a + e.p, 0) }));
// optimal strategy, summarized: share of contexts where each slot hits, per upcard
const share = []; for (let u = 1; u <= 10; u++) { const cnt = new Array(6).fill(0); let n = 0; for (let i = 0; i < 4; i++) { const M = opt.MASK[i]; for (let j = 0; j < M.length; j++) if ((j % 10) === u - 1) { n++; for (let b = 0; b < 6; b++) if ((M[j] >> b) & 1) cnt[b]++; } } share.push({ up: u, hitShare: cnt.map(c => +(c / n).toFixed(3)), basicMask: basicMask(u) }); }
out.optimalHitShareByUpcard = share;   // unweighted over contexts; slots = hard12..16, soft17
fs.writeFileSync(path.join(__dirname, 'out', 'exact_board.json'), JSON.stringify(out, null, 1));
{ const mk = path.join(__dirname, 'out', 'optmasks.bin');   // levels concatenated; header lengths in the .json
  const bufs = opt.MASK.map(m => Buffer.from(m.buffer)); fs.writeFileSync(mk, Buffer.concat(bufs));
  fs.writeFileSync(mk + '.json', JSON.stringify({ NS, lens: opt.MASK.map(m => m.length), S0: S0.map(s => s.key), MS: MS.slice(0, 4) })); }
console.log('done', (Date.now() - t0) / 1000, 's');
