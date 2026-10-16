// KICKS 20x - does the rules sheet's description of best play really give the best-play RTP?
// The sheet says: "Best play follows the shoe count, with one exception: after a miss with no right calls yet, calling the side
// with FEWER cards left gives the best chance of the 0-right pay (your bet back)."
// This evaluates that description, followed literally, by an exact expectation over every shoe state (doubles, same recursion as the
// bots' DP in policy.js, but with a fixed rule instead of a maximum) and compares it with the exact best-play RTP in out/exact.json.
// Constants (pays, Posts Bonus ladder, kicks) come from the build text via buildconst.js. Run:  node sheet_strategy.js > out/sheet_strategy.txt
'use strict';
const fs = require('fs');
const C = require('./buildconst.js');
const PAY = C.PAY_CLASSIC, LAD = C.LADDER_CLASSIC, NK = C.CL_KICKS;
const GOALR = new Set(C.GOAL), POSTR = new Set(C.POST);
let g0 = 0, w0 = 0, p0 = 0;
for (const r of C.RANKS) for (let d = 0; d < 2; d++) for (const s of C.SUITS) { if (POSTR.has(r)) p0++; else if (GOALR.has(r)) g0++; else w0++; }
function value(rule) {                         // expected round pay (x bet) when every call is made by rule(kind, g, w, shots, correct)
  const mm = new Map(), bm = new Map();
  const mainV = (g, w, p, shots, cor, bp) => {
    if (shots === NK) return PAY[cor];
    const key = [g, w, p, shots, cor, bp ? 1 : 0].join(); let v = mm.get(key); if (v !== undefined) return v;
    const n = g + w + p, goal = rule('main', g, w, shots, cor) === 'goal';
    const right = goal ? g : w, wrong = goal ? w : g; v = 0;
    if (right) v += right / n * mainV(goal ? g - 1 : g, goal ? w : w - 1, p, shots + 1, cor + 1, bp);
    if (wrong) v += wrong / n * mainV(goal ? g : g - 1, goal ? w - 1 : w, p, shots + 1, cor, bp);
    if (p) v += p / n * (bp ? mainV(g, w, p - 1, shots + 1, cor, true) : bonusV(g, w, p - 1, 0, shots + 1, cor));
    mm.set(key, v); return v;
  };
  const bonusV = (g, w, p, s, shots, cor) => {
    if (s === 3) return LAD[3] + mainV(g, w, p, shots, cor, true);
    const key = [g, w, p, s, shots, cor].join(); let v = bm.get(key); if (v !== undefined) return v;
    const n = g + w + p, goal = rule('bonus', g, w, shots, cor) === 'goal';
    const right = goal ? g : w, wrong = goal ? w : g; v = 0;
    if (right) v += right / n * bonusV(goal ? g - 1 : g, goal ? w : w - 1, p, s + 1, shots, cor);
    if (wrong) v += wrong / n * (LAD[s] + mainV(goal ? g : g - 1, goal ? w - 1 : w, p, shots, cor, true));
    if (p) v += p / n * bonusV(g, w, p - 1, s, shots, cor);
    bm.set(key, v); return v;
  };
  return mainV(g0, w0, p0, 0, 0, false);
}
const more = (g, w) => (g >= w ? 'goal' : 'wide'), fewer = (g, w) => (g > w ? 'wide' : 'goal');
const exact = JSON.parse(fs.readFileSync('out/exact.json', 'utf8')).base;
const rows = [
  ['sheet wording: more cards, except fewer after a miss with no right calls yet (main game kicks; Posts Bonus kicks follow the count)',
    (k, g, w, sh, cor) => (k === 'main' && sh > 0 && cor === 0 ? fewer(g, w) : more(g, w))],
  ['same exception also applied to Posts Bonus kicks', (k, g, w, sh, cor) => (sh > 0 && cor === 0 ? fewer(g, w) : more(g, w))],
  ['exception on the first kick after a miss only', (k, g, w, sh, cor) => (k === 'main' && sh === 1 && cor === 0 ? fewer(g, w) : more(g, w))],
  ['no exception (call the side with more cards left, tie GOAL)', (k, g, w) => more(g, w)],
];
console.log('Shoe: GOAL ' + g0 + ' WIDE ' + w0 + ' POST ' + p0 + '   kicks ' + NK + '   pays ' + JSON.stringify(PAY) + '   Posts Bonus ladder ' + JSON.stringify(LAD));
console.log('exact best play (out/exact.json): ' + exact.opt.rtp + '   shoe-count caller: ' + exact.counter.rtp + '\n');
let first = null;
for (const [name, r] of rows) { const v = value(r); if (first === null) first = v; console.log(v.toFixed(13) + '  ' + (100 * v).toFixed(4) + '%  ' + name); }
const ok = Math.abs(first - exact.opt.rtp) < 1e-12, ok2 = Math.abs(value(rows[3][1]) - exact.counter.rtp) < 1e-12;
console.log('\n' + (ok ? 'ok' : 'FAIL') + '   the sheet description equals the exact best-play RTP to 1e-12 (difference ' + (first - exact.opt.rtp).toExponential(2) + ')');
console.log((ok2 ? 'ok' : 'FAIL') + '   the no-exception row equals the exact shoe-count caller to 1e-12');
if (!ok || !ok2) process.exit(1);
