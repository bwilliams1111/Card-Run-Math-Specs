// Player strategies for the Classic board (shared by the node harness and the Chrome driver).
// decide(name, hands, i, upRank) -> 'hit' | 'stand'
//   hands: array of 4 card arrays [{r:'A'|'2'..'10'|'J'|'Q'|'K'}], with status info {status, made21} where available
//   i: the hand to decide; upRank: dealer upcard rank string
// 'opt' needs the optimal mask table produced by exact.js (--dump-masks): context-aware optimal play (exact).
(function (root) {
  'use strict';
  const val = r => r === 'A' ? 1 : (['J', 'Q', 'K', '10'].includes(r) ? 10 : +r);
  const tot = cards => { let t = 0, ace = false; for (const c of cards) { t += val(c.r); if (c.r === 'A') ace = true; } const soft = ace && t + 10 <= 21; return { low: t, best: soft ? t + 10 : t, soft, ace }; };
  function slot(cards) { const t = tot(cards); if (t.soft) return t.best === 17 ? 5 : -1; return (t.low >= 12 && t.low <= 16) ? t.low - 12 : -1; }
  // category of a finished hand: 0 bust, 1 stood <=16, 2..5 = 17..20, 6 made 21 (3+), 7 blackjack
  function cat(cards) { const t = tot(cards); if (t.low > 21) return 0; if (t.best === 21) return cards.length === 2 ? 7 : 6; if (t.best <= 16) return 1; return t.best - 15; }
  function initKey(cards) { const t = tot(cards.slice(0, 2)); if (t.ace && t.low === 11) return 'BJ'; return t.low + (t.ace ? 'a' : 'h'); }
  function basicMask(u) { let m = 1; const hi = (u >= 7 || u === 1); if (u === 2 || u === 3 || hi) m |= 2; if (hi) m |= 4 | 8 | 16; if (u !== 7) m |= 32; return m; }
  function convMask(u) { let m = 0; const lo = u >= 2 && u <= 6; if (!(u >= 4 && u <= 6)) m |= 1; if (!lo) m |= 2 | 4 | 8 | 16; m |= 32; return m; }
  let OPT = null;   // {NS, lens, S0, MS, levels:[Uint8Array x4], sIdx:Map, msIdx:[Map]}
  function loadOpt(meta, buf) {
    const levels = []; let off = 0; for (const L of meta.lens) { levels.push(buf.subarray(off, off + L)); off += L; }
    const sIdx = new Map(meta.S0.map((k, i) => [k, i]));
    const msIdx = meta.MS.map(list => new Map(list.map((m, i) => [m.join(','), i])));
    OPT = { NS: meta.NS, levels, sIdx, msIdx };
  }
  function optMask(hands, i, u) {
    const prev = []; for (let j = 0; j < i; j++) prev.push(cat(hands[j])); prev.sort((a, b) => a - b);
    const P = OPT.msIdx[i].get(prev.join(','));
    let rest = 0; for (let j = i + 1; j < 4; j++) rest = rest * OPT.NS + OPT.sIdx.get(initKey(hands[j]));
    const nFp = OPT.NS ** (3 - i);
    return OPT.levels[i][(P * nFp + rest) * 10 + (u - 1)];
  }
  function decide(name, hands, i, upRank) {
    const u = val(upRank), sl = slot(hands[i]);
    if (sl < 0) throw new Error('decide() called on a non-choice hand ' + JSON.stringify(hands[i]));
    let m;
    if (name === 'opt') m = optMask(hands, i, u);
    else if (name === 'basic') m = basicMask(u);
    else if (name === 'conv') m = convMask(u);
    else if (name === 'h1') {   // simple human rule: conventional basic, but once WINS can no longer reach 2 wins, hit every stiff (chase MADE 21)
      let alive = 0; for (let j = 0; j < i; j++) if (cat(hands[j]) !== 0) alive++;
      m = (alive + 1 + (3 - i) < 2) ? 63 : convMask(u);
    }
    else if (name === 'stand') m = 0;
    else if (name === 'hit') m = 63;
    else if (name === 'worst') throw new Error('worst: not tabulated');
    else throw new Error('strategy ' + name);
    return (m >> sl) & 1 ? 'hit' : 'stand';
  }
  const api = { decide, loadOpt, cat, initKey, slot, tot, basicMask, convMask };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.BJStrategy = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
