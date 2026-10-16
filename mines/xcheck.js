// MINES 20× lab pack: cross-checks the Python solver (out/exact.json) against the build's OWN code (v170: no RUN IT AGAIN / RUN HALF).
//  * ladders: the build's Classic.setMines (loaded through harness.js) gives the same Display(k) for 1-4 bombs, every pick to the top pick
//  * top pick: the build's Classic.top = the solver's (the first pick at or over 20×) for 1-4 bombs
//  * pays: the build's own Classic.payC gives the same pays at $1 / $10 / $100 for every row
//  * stop rule: with the build's own Classic.payC the top pick pays >= 20× the stake and the pick before it < 20×, on every bet of the
//    $0.10 grid (991 bets) and on every cent stake $0.02-$1,000.00 (any amount the run bar can run), 1-4 live bombs
//  * the ride / run-half code is gone: no Classic.setRide / rideK / DI, payC takes (cents, k) only, RunBar v170 shows no runIt / runHalf
//  * run bar: the build's RunBar.compute gives the same mode / held / bank / half / keep / buttons (double, doubleHalf, halfPill,
//    cashOutOnly) / nMax on the solver's 3,078 test states (3,000 random + 78 at the $0.02 minimum-run edge)
//   cd labpack/mines && node -r ./seedcrypto.js xcheck.js        (SEED_CRYPTO unset = 0; outcomes are not used)
'use strict';
const fs = require('fs'), path = require('path'); const H = require('./harness');
const FILE = path.join(__dirname, '..', 'builds-final', 'card-run-mines-classic-launch.html');
const EX = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', 'exact.json'), 'utf8'));
let fails = 0; const ok = (c, w) => { console.log((c ? 'ok    ' : 'FAIL  ') + w); if (!c) fails++; };
(async () => {
  const src = fs.readFileSync(FILE, 'utf8');
  const line = re => { const m = src.match(re); if (!m) throw new Error('not found ' + re); return m[1]; };
  ok(require('crypto').createHash('sha256').update(src).digest('hex') === EX.build_sha256, 'exact.json was made on this build ' + EX.build_sha256);
  const T = await H.load(FILE);
  let ladderBad = [], payBad = [], topBad = [], gridBad = [], nStakes = 0;
  const C = T.Classic, M = b => EX.ladders[b];
  ok(C.setRide === undefined && C.rideK === undefined && C.rideKMil === undefined && C.DI === undefined && C.payC.length === 2 && RunBar.version === '170', 'no ride API left: Classic.setRide / rideK / DI undefined, payC(cents, k), RunBar.version 170');
  for (const b of [1, 2, 3, 4]) {
    C.setMines(b); const base = C.base.slice();
    if (C.top !== M(b).cap_k || base.length !== M(b).cap_k + 1) topBad.push([b, C.top, M(b).cap_k]);
    for (const r of M(b).rows) {
      if (Math.abs(base[r.k] / 1e4 - r.display) > 1e-12) ladderBad.push([b, r.k]);
      for (const bet of [1, 10, 100]) if (C.payC(bet * 100, r.k) / 100 !== r['pay_' + bet]) payBad.push([b, r.k, bet]);
    }
    // the stop rule with the build's own payC: the top pick pays >= 20× the stake and the pick before it < 20×, every bet / stake
    const top = C.top;
    for (let d = 10; d <= 1000; d++) { const c = d * 10; if (!(C.payC(c, top) >= 20 * c && C.payC(c, top - 1) < 20 * c)) gridBad.push([b, c / 100]); }
    for (let c = 2; c <= 100000; c++) { nStakes++; if (!(C.payC(c, top) >= 20 * c && C.payC(c, top - 1) < 20 * c)) gridBad.push([b, c / 100, 'cent']); }
  }
  C.setMines(4);
  ok(!topBad.length, 'top pick (first at or over 20×) = the build\'s Classic.top for 1-4 bombs: ' + [1, 2, 3, 4].map(b => b + ' live pick ' + M(b).cap_k).join(', ') + ' ' + JSON.stringify(topBad));
  ok(!ladderBad.length, 'base displays (bombs 1-4, every pick to the top pick) = the build\'s Classic.setMines ' + JSON.stringify(ladderBad.slice(0, 5)));
  ok(!payBad.length, 'pays at $1 / $10 / $100 = the build\'s Classic.payC on every row ' + JSON.stringify(payBad.slice(0, 5)));
  ok(!gridBad.length, 'with the build\'s Classic.payC the board stops at the top pick and not before on all 991 grid bets and on every cent stake $0.02-$1,000.00 (' + nStakes.toLocaleString() + ' bet / bomb pairs) ' + JSON.stringify(gridBad.slice(0, 5)));
  let rbBad = [];
  for (const v of EX.runbar_vectors) {
    const c = RunBar.compute(v.st);
    const same = c.mode === v.mode && c.held === v.S && c.banked === v.B && (c.mode !== 'bar' || (c.half === v.half && c.keep === v.keep
      && ['double', 'doubleHalf', 'halfPill', 'cashOutOnly'].every(k => !!c.show[k] === !!v.show[k]) && !('runIt' in c.show) && !('runHalf' in c.show)
      && (v.n_max === null ? c.nMax === Infinity : c.nMax === v.n_max)));
    if (!same) rbBad.push([v, c]);
  }
  ok(!rbBad.length, `RunBar.compute = the solver's run-bar rules on ${EX.runbar_vectors.length} states (${EX.runbar_vectors.filter(v => v.mode === 'bar').length} bars, ${EX.runbar_vectors.filter(v => v.mode === 'max_win').length} MAX WIN, ${EX.runbar_vectors.filter(v => v.mode === 'run_cap').length} run cap) ` + JSON.stringify(rbBad.slice(0, 2)));
  console.log(fails ? fails + ' FAILED' : 'XCHECK PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
