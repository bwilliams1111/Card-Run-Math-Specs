// DOUBLE OR NOTHING (the one-hand Run Game): exact best play, written from the rules (not from the build's code):
// infinite deck (rank 1/13, ten 4/13); the dealer gets one card, the player plays, then the dealer draws to 16 and STANDS ON ALL 17s
// (build of 16 Oct 2026, change request DOUBLE OR NOTHING RTP over 100). opts.h17 = true gives the previous rule (dealer hits soft 17,
// v170 and earlier; kept only so the pack can print both rules for comparison).
// Player: forced hit hard <= 11 / soft <= 16; HIT or STAND on hard 12-16 and soft 17-18; stands hard >= 17 / soft >= 19; a bust loses at once.
// Compare: blackjack > 21 of 3+ cards; ties on 19 and 20 win; other ties push and the hand is dealt again (a push is worth V).
// Lab pack: rule constants asserted against the final build (consts.js): ties on 19/20 (RUN1 TIE_WIN ranks [4,5]) and the dealer rule S17.
// opts.mode: 'max' (best play, default) | 'min' (worst play) | 'stand' | 'hit' (at every choice) | 'basic' (the rules-sheet basic play of the board,
// strategy.js basicMask, applied to the choices of this hand; the rules sheet is silent on soft 18, so basic STANDS on it) | 'conv' (the conventional
// blackjack chart without doubling, strategy.js convMask, soft 18 by the chart) ; opts.soft18 = 'stand' | 'hit' | 'chart' overrides the soft 18 rule.
// Exports: solve() -> {V, W, P, rtp}, choose(upRank, cards) -> 'hit' | 'stand' (best play), TIE_WIN, policy tables.
'use strict';
const PR = [0]; for (let r = 1; r <= 10; r++) PR[r] = r === 10 ? 4 / 13 : 1 / 13;
function make(opts = {}) {
  const TIE_WIN = opts.tieWin || [19, 20];
  { const C = require('./consts').parse(); if (JSON.stringify(TIE_WIN.map(t => t - 15)) !== JSON.stringify(C.TIE_WIN_RANKS) || !C.rules.runDealerS17 || !C.rules.runChoices || !C.rules.runPushRedeal) throw new Error('Run Game rules differ from the build'); }
  const H17 = opts.h17 === true;   // default: the dealer STANDS on all 17s (the build); h17: true = the retired rule, for comparison only
  // dealer final category: 0 bust, 17..21 (3+), 22 = blackjack
  const DF = {};
  for (let up = 1; up <= 10; up++) { const out = new Map();
    const rec = (low, ace, n, p) => { if (low > 21) { out.set(0, (out.get(0) || 0) + p); return; } const soft = ace && low + 10 <= 21, t = soft ? low + 10 : low;
      const stands = t > 17 || (t === 17 && (!soft || !H17));
      if (stands) { const k = t === 21 && n === 2 ? 22 : t; out.set(k, (out.get(k) || 0) + p); return; }
      for (let r = 1; r <= 10; r++) rec(low + r, ace || r === 1, n + 1, p * PR[r]); };
    rec(up, up === 1, 1, 1); DF[up] = out; }
  const cmp = (p, d) => { // p: 0 bust, <17 stood, 17..21, 22 BJ; d: 0 bust, 17..21, 22
    if (p === 0) return -1; if (d === 0) return 1; if (p < 17) return -1; if (p > d) return 1; if (p < d) return -1; return TIE_WIN.includes(p) ? 1 : 0; };
  // fixed charts for the choices of this hand. 'basic' = the rules-sheet basic play (strategy.js basicMask: bits 0..4 = hard 12..16, bit 5 = soft 17);
  // 'conv' = the conventional blackjack chart without doubling (strategy.js convMask: hard 12 stand against 4-6, hard 13-16 stand against 2-6, soft 17 hit).
  // Soft 18 is a choice only in this hand (the board auto-stands it): opts.soft18 = 'stand' (default for basic) | 'hit' | 'chart' (conventional S17 chart:
  // stand against 2-8, hit against 9, 10, A; default for conv).
  const chartHit = (kind, up, low, soft, t) => { const ST = require('./strategy'), mask = kind === 'conv' ? ST.convMask(up) : ST.basicMask(up);
    if (soft) { if (t === 17) return !!((mask >> 5) & 1); const v = opts.soft18 || (kind === 'conv' ? 'chart' : 'stand'); return v === 'hit' ? true : v === 'chart' ? (up >= 9 || up === 1) : false; }
    return !!((mask >> (low - 12)) & 1); };
  let V = 0.5;
  const memoAll = new Map();
  function tables(Vv) {
    const T = {};
    for (let up = 1; up <= 10; up++) {
      const memo = new Map();
      const stand = (low, ace, n) => { const soft = ace && low + 10 <= 21, t = soft ? low + 10 : low; const pc = low > 21 ? 0 : (t === 21 && n === 2) ? 22 : t;
        let w = 0, ps = 0; for (const [d, q] of DF[up]) { const o = cmp(pc, d); if (o > 0) w += q; else if (o === 0) ps += q; } return [w, ps]; };
      const play = (low, ace, n) => {
        if (low > 21) return [0, 0];
        const key = low * 4 + (ace ? 2 : 0) + (n === 2 ? 1 : 0); if (memo.has(key)) return memo.get(key).v;
        const soft = ace && low + 10 <= 21, t = soft ? low + 10 : low; let v, choice = null;
        const hit = () => { let w = 0, p = 0; for (let r = 1; r <= 10; r++) { const x = play(low + r, ace || r === 1, 3); w += PR[r] * x[0]; p += PR[r] * x[1]; } return [w, p]; };
        if (t >= 21) v = stand(low, ace, n);
        else if (soft ? t <= 16 : low <= 11) v = hit();
        else if (soft ? t >= 19 : low >= 17) v = stand(low, ace, n);
        else { const A = stand(low, ace, n), B = hit(); const hv = B[0] + B[1] * Vv, sv = A[0] + A[1] * Vv; const M = opts.mode || 'max';
          choice = (M === 'basic' || M === 'conv') ? (chartHit(M, up, low, soft, t) ? 'hit' : 'stand') : M === 'max' ? (hv > sv + 1e-13 ? 'hit' : 'stand') : M === 'min' ? (hv < sv - 1e-13 ? 'hit' : 'stand') : M; v = choice === 'hit' ? B : A; }
        memo.set(key, { v, choice }); return v; };
      let W = 0, P = 0; for (let a = 1; a <= 10; a++) for (let b = 1; b <= 10; b++) { const x = play(a + b, a === 1 || b === 1, 2); W += PR[a] * PR[b] * x[0]; P += PR[a] * PR[b] * x[1]; }
      T[up] = { W, P, memo, play };
    }
    return T;
  }
  function solve() {
    let T;
    for (let it = 0; it < 200; it++) { T = tables(V); let W = 0, P = 0; for (let up = 1; up <= 10; up++) { W += PR[up] * T[up].W; P += PR[up] * T[up].P; }
      const nv = W / (1 - P); if (Math.abs(nv - V) < 1e-15) { V = nv; break; } V = nv; }
    T = tables(V); let W = 0, P = 0; for (let up = 1; up <= 10; up++) { W += PR[up] * T[up].W; P += PR[up] * T[up].P; }
    memoAll.clear(); for (let up = 1; up <= 10; up++) memoAll.set(up, T[up]);
    return { V, W, P, rtp: 2 * V, expDeals: 1 / (1 - P) };
  }
  const val = r => r === 'A' ? 1 : (['J', 'Q', 'K', '10'].includes(r) ? 10 : +r);
  function choose(upRank, cards) {
    if (!memoAll.size) solve();
    const up = val(upRank); let low = 0, ace = false; for (const c of cards) { low += val(c.r); if (c.r === 'A') ace = true; }
    const n = cards.length === 2 ? 2 : 3; const T = memoAll.get(up); T.play(low, ace, n);
    const e = T.memo.get(low * 4 + (ace ? 2 : 0) + (n === 2 ? 1 : 0));
    if (!e || !e.choice) throw new Error('not a choice: ' + JSON.stringify(cards) + ' vs ' + upRank);
    return e.choice;
  }
  return { solve, choose, DF, get V() { return V; } };
}
module.exports = { make, PR };
if (require.main === module) { for (const mode of ['max', 'min', 'stand', 'hit', 'basic', 'conv']) console.log(mode, JSON.stringify(make({ mode }).solve()));
  console.log('--- previous rule (dealer hits soft 17), for comparison only');
  for (const mode of ['max', 'min', 'stand', 'hit', 'basic', 'conv']) console.log('H17', mode, JSON.stringify(make({ mode, h17: true }).solve()));
  console.log('--- fixed-chart variants');
  for (const [mode, soft18] of [['basic', 'hit'], ['basic', 'chart'], ['conv', 'chart'], ['conv', 'stand'], ['conv', 'hit']]) for (const h17 of [false, true]) console.log(h17 ? 'H17' : 'S17', mode, 'soft18=' + soft18, JSON.stringify(make({ mode, soft18, h17 }).solve().rtp)); }
