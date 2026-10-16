// KICKS 20× call policies for the bots (lab pack copy; constants read from the build by buildconst.js). 'opt'/'worst' use an exact DP over the remaining shoe (port of exact_classic.py);
// 'counter' = call the side with more cards left (tie -> GOAL); 'random' = 50/50 from a separate seeded stream.
'use strict';
const C = require('./buildconst.js');   // PAY / ladder / kicks / card kinds read from the final build
const PAY = C.PAY_CLASSIC, LAD = C.LADDER_CLASSIC, NK = C.CL_KICKS, GOALR = new Set(C.GOAL), POSTR = new Set(C.POST);
if (JSON.stringify(PAY) !== '[1,0,0,0,1.5,4,20]' || JSON.stringify(LAD) !== '[0,0,1,3]' || NK !== 6) throw new Error('build constants differ from the bot DP layout');
function makeDP(mode) {
  const pick = mode === 'opt' ? Math.max : Math.min;
  const mm = new Map(), bm = new Map();
  function main(g, w, p, shots, cor, bp) {
    if (shots === NK) return PAY[cor];
    const key = ((((g * 64 + w) * 32 + p) * 8 + shots) * 8 + cor) * 2 + (bp ? 1 : 0);
    let v = mm.get(key); if (v !== undefined) return v;
    const [vg, vw] = mainEV(g, w, p, shots, cor, bp); const n = g + w + p;
    let post = 0; if (p) post = p / n * (bp ? main(g, w, p - 1, shots + 1, cor, true) : bonus(g, w, p - 1, 0, shots + 1, cor));
    v = pick(vg, vw) + post; mm.set(key, v); return v;
  }
  function mainEV(g, w, p, shots, cor, bp) {
    const n = g + w + p; let vg = 0, vw = 0;
    if (g) { vg += g / n * main(g - 1, w, p, shots + 1, cor + 1, bp); vw += g / n * main(g - 1, w, p, shots + 1, cor, bp); }
    if (w) { vg += w / n * main(g, w - 1, p, shots + 1, cor, bp); vw += w / n * main(g, w - 1, p, shots + 1, cor + 1, bp); }
    return [vg, vw];
  }
  function bonus(g, w, p, s, shots, cor) {
    if (s === 3) return LAD[3] + main(g, w, p, shots, cor, true);
    const key = ((((g * 64 + w) * 32 + p) * 4 + s) * 8 + shots) * 8 + cor;
    let v = bm.get(key); if (v !== undefined) return v;
    const [vg, vw] = bonusEV(g, w, p, s, shots, cor); const n = g + w + p;
    v = pick(vg, vw) + (p ? p / n * bonus(g, w, p - 1, s, shots, cor) : 0); bm.set(key, v); return v;
  }
  function bonusEV(g, w, p, s, shots, cor) {
    const n = g + w + p; let vg = 0, vw = 0;
    if (g) { vg += g / n * bonus(g - 1, w, p, s + 1, shots, cor); vw += g / n * (LAD[s] + main(g - 1, w, p, shots, cor, true)); }
    if (w) { vw += w / n * bonus(g, w - 1, p, s + 1, shots, cor); vg += w / n * (LAD[s] + main(g, w - 1, p, shots, cor, true)); }
    return [vg, vw];
  }
  return { main, bonus, mainEV, bonusEV };
}
const DP = { opt: makeDP('opt'), worst: makeDP('worst') };
// state from the game's S: counts in S.shoe (cards still to be dealt), shots, correct, bonus
function counts(shoe) { let g = 0, w = 0, p = 0; for (const c of shoe) { const r = c.r; if (POSTR.has(r)) p++; else if (GOALR.has(r)) g++; else w++; } return [g, w, p]; }
function decide(policy, S, rand) {
  if (S.run) return rand() < 0.5 ? 'goal' : 'wide';          // Run Game: every call is 1/2
  const [g, w, p] = S._cnt || counts(S.shoe);   // core.js keeps S._cnt in step with the shoe; the full harness recounts
  if (policy === 'random') return rand() < 0.5 ? 'goal' : 'wide';
  if (policy === 'counter') return g >= w ? 'goal' : 'wide';
  const D = DP[policy];
  let vg, vw;
  if (S.mode === 'bonus') [vg, vw] = D.bonusEV(g, w, p, S.bonus.streak, S.shots, S.correct);
  else [vg, vw] = D.mainEV(g, w, p, S.shots, S.correct, !!S.bonusPlayed);
  if (policy === 'opt') return vg >= vw ? 'goal' : 'wide';
  return vg <= vw ? 'goal' : 'wide';
}
module.exports = { decide, DP, counts };
