// One-off comparison with the previous pack run (the v170 build, a7fa9e8f...: dealer HITS soft 17 in DOUBLE OR NOTHING; minrun/v170_blackjack_out/out) on the SAME seeds.
// The only change in the build is that the dealer now stands on all 17s in DOUBLE OR NOTHING (and the copy that says so): every chunk that never plays a double (the base
// chunks and P0) must be IDENTICAL round for round; every chunk that plays a double (P2 P3 P4 P5) CHANGES.
// For every out/sim_*.json present in both runs: identical if every summary field the job writes is equal (rounds, sum and sum of
// squares of the pays in cents, hit rate, max pay, the number of crypto u32 values the game drew, and the full payout histogram).
// Any change in a pick or a pay changes the crypto draws or the histogram, so "identical" here means identical round for round in practice.
// Jobs only in the previous run are listed as retired. Also lists the exact policy values before and after at $1 / $10 / $100.
// Usage (from labpack/blackjack): node compare_prev.js <previous out/ folder>   -> prints text (saved as out/compare_prev.txt)
'use strict';
const fs = require('fs'), path = require('path');
const PREV = process.argv[2]; if (!PREV) throw new Error('usage: node compare_prev.js <previous out/ folder>');
const NOW = path.join(__dirname, 'out');
const rd = (d, f) => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'));
const L = [];
const pa = rd(PREV, 'exact_runs.json'), pb = rd(NOW, 'exact_runs.json');
L.push(`Previous: ${PREV}  build ${pa.build.sha}  DOUBLE OR NOTHING: dealer HITS soft 17 (${(pa.double.rtpBest * 100).toFixed(4)}% best play)`);
L.push(`Now:      ${NOW}  build ${pb.build.sha}  DOUBLE OR NOTHING: dealer STANDS on all 17s (${(pb.double.rtpBest * 100).toFixed(4)}% best play)`);
L.push('');
L.push('SIMULATIONS (same seeds)');
const fields = ['rounds', 'sumCents', 'sum2Cents', 'hitRate', 'maxCents', 'cryptoU32'];
const files = fs.readdirSync(NOW).filter(f => /^sim_.*\.json$/.test(f)).sort();
const retired = fs.readdirSync(PREV).filter(f => /^sim_.*\.json$/.test(f) && !files.includes(f)).sort();
const tally = { IDENTICAL: 0, CHANGED: 0, new: 0 }, byPolicy = {};
for (const f of files) {
  const b = rd(NOW, f); let a; try { a = rd(PREV, f); } catch (e) { tally.new++; L.push(`${f.padEnd(26)} new (no previous run)   rtp ${(b.rtp * 100).toFixed(3)}%`); continue; }
  const diff = fields.filter(k => a[k] !== b[k]); const hsame = JSON.stringify(a.histogramCents) === JSON.stringify(b.histogramCents);
  const same = !diff.length && hsame && a.seedCrypto === b.seedCrypto && a.policySeed === b.policySeed;
  tally[same ? 'IDENTICAL' : 'CHANGED']++; { const k = f.startsWith('sim_base') ? 'base' : b.policy + ' $' + b.bet; (byPolicy[k] = byPolicy[k] || { IDENTICAL: 0, CHANGED: 0 })[same ? 'IDENTICAL' : 'CHANGED']++; }
  L.push(`${f.padEnd(26)} ${same ? 'IDENTICAL' : 'CHANGED  '}  rtp ${(a.rtp * 100).toFixed(3)}% -> ${(b.rtp * 100).toFixed(3)}%  hit ${(a.hitRate * 100).toFixed(3)}% -> ${(b.hitRate * 100).toFixed(3)}%  crypto u32 ${a.cryptoU32} -> ${b.cryptoU32}${same ? '' : '  (differs: ' + [...diff, ...(hsame ? [] : ['histogram'])].join(', ') + ')'}`);
}
for (const f of retired) { const a = rd(PREV, f); L.push(`${f.padEnd(26)} RETIRED (previous ${a.policy}, ${a.rounds.toLocaleString('en-US')} rounds, rtp ${(a.rtp * 100).toFixed(3)}%)`); }
L.push('');
L.push(`Summary: ${tally.IDENTICAL} identical, ${tally.CHANGED} changed, ${tally.new} new, ${retired.length} retired.`);
L.push('By policy: ' + Object.entries(byPolicy).map(([k, v]) => `${k}: ${v.IDENTICAL} identical / ${v.CHANGED} changed`).join('; '));
L.push('');
L.push('EXACT POLICY VALUES (best play; P4 cut at eps ' + pb.policies.find(r => r.policy === 'P4').eps + ')');
L.push('Policy  Bet      before (v170, dealer hits soft 17)   after (S17 double)   change (pts)   hit before -> after');
for (const p of ['P0', 'P2', 'P3', 'P4', 'P5']) for (const B of [1, 10, 100]) {
  const x = pa.policies.find(r => r.policy === p && r.bet === B), y = pb.policies.find(r => r.policy === p && r.bet === B);
  if (!y || !x) continue;
  L.push(`${p.padEnd(8)}$${String(B).padEnd(7)} ${(x.rtp * 100).toFixed(5).padStart(10)}%          ${(y.rtp * 100).toFixed(5).padStart(10)}%        ${((y.rtp - x.rtp) * 100).toFixed(5).padStart(9)}    ${(x.hitRate * 100).toFixed(3)}% -> ${(y.hitRate * 100).toFixed(3)}%${p === 'P4' ? `  (cut mass ${(x.cutMass * 100).toFixed(3)}% -> ${(y.cutMass * 100).toFixed(4)}%)` : ''}`);
}
console.log(L.join('\n'));
