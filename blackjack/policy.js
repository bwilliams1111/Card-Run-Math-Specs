// Lab pack simulation: plays full rounds of the SHIPPED game code of ../builds-final/<file> (harness.js) with a run-bar policy and writes
// a JSON summary with the payout histogram (cents -> rounds) to <out.json>.
// Usage (from labpack/blackjack): SEED_CRYPTO=<n> node -r ./seedcrypto.js policy.js <policy P0 P2 P3 P4 P5> <rounds> <bet> <out.json> [policySeed] [board=opt|basic|conv]
// Policies (one round = one bet; runs are funded by the round's own winnings):
//   P0 cash out at the first bar              P2 DOUBLE OR NOTHING once, then cash out
//   P3 DOUBLE OR NOTHING while offered (to the 1,000x run cap / MAX WIN), else cash out
//   P4 random: at every bar a uniform pick among the buttons shown (CASH OUT, DOUBLE OR NOTHING, DOUBLE HALF)
//   P5 DOUBLE HALF once (if offered), then cash out (a lost half brings the RUN BANK back to the bar: cash out)
//   (P1, RUN IT AGAIN once, was retired with RUN IT AGAIN and RUN HALF in run-bar v170; its number is not reused.)
// The double wins with p = 0.50045 (the dealer stands on all 17s): P2 P3 P4 P5 are no longer bounded by P0 (cash out).
// Board HIT/STAND: strategy.js ('basic' = the rules-sheet basic play, 'opt' = exact best play from the solver's masks, OPT_MASKS=<bin>).
// DOUBLE OR NOTHING HIT/STAND: exact best play (rungame.js). Policy choices use their own sfc32 stream (policySeed), never the game RNG.
'use strict';
const fs = require('fs');
const H = require('./harness'), STRAT = require('./strategy'), RG = require('./rungame').make();
const [POL, NR, BET, OUT, PSEED, BOARD] = process.argv.slice(2);
const N = +NR, bet = +BET, board = BOARD || 'opt';
if (board === 'opt') { const bin = process.env.OPT_MASKS || require('path').join(__dirname, 'out', 'optmasks.bin'); STRAT.loadOpt(JSON.parse(fs.readFileSync(bin + '.json', 'utf8')), fs.readFileSync(bin)); }
RG.solve();
const prng = H.sfc32((+PSEED || 1) >>> 0);
const bot = { runChoice: (cards, up) => RG.choose(up.r, cards) };
const game = H.makeGame({ seed: 1, bet, bot });
const G = game.G, reg = game.reg, st = game.st;
const BAL0 = 1e7, lines = [];
let sum = 0, sum2 = 0, hits = 0, max = 0, n0 = 0; const hist = new Map();
const t0 = Date.now();
const pick = (ids, want) => ids.includes(want) ? want : 'cashOut';
function decide(ids, bars) {
  switch (POL) {
    case 'P0': return 'cashOut';
    case 'P2': return bars === 1 ? pick(ids, 'doubleBtn') : 'cashOut';
    case 'P3': return pick(ids, 'doubleBtn');
    case 'P4': { const opts = ['cashOut', 'doubleBtn', 'doubleHalfBtn'].filter(i => ids.includes(i)); return opts[Math.floor(prng() * opts.length)]; }
    case 'P5': return bars === 1 ? pick(ids, 'doubleHalfBtn') : 'cashOut';
  }
  throw new Error('policy ' + POL);
}
for (let n = 0; n < N; n++) {
  G.balance = BAL0; st.toast = null; st.bar = null;
  G.startRound();
  let guard = 0, bars = 0, bj0 = -1;
  for (;;) {
    if (++guard > 100000) throw new Error('stuck at round ' + n);
    const bar = st.bar;
    if (bar && bar.ids.includes('again2')) break;
    if (bar && bar.ids.includes('cashOut')) {
      if (bj0 < 0 && G.S && G.S.hands) bj0 = G.S.hands.filter(h => h.status === 'nat').length;
      bars++; const id = decide(bar.ids, bars); reg.get(id).onclick(); continue;
    }
    const S = G.S;
    if (S && S.phase === 'player' && reg.get('hitBtn').disabled === false && S.active >= 0) {
      const d = STRAT.decide(board, S.hands.map(h => h.cards), S.active, S.dealer[0].r);
      d === 'hit' ? G.onHit() : G.onStand(); continue;
    }
    throw new Error('stuck: ' + JSON.stringify({ n, phase: S && S.phase, bar: bar && bar.ids }));
  }
  if (bj0 < 0 && G.S && G.S.hands) bj0 = G.S.hands.filter(h => h.status === 'nat').length;
  const ret = Math.round((G.balance - (BAL0 - bet)) * 100);
  sum += ret; sum2 += ret * ret; if (ret > 0) hits++; if (ret > max) max = ret; if (ret === 0) n0++;
  hist.set(ret, (hist.get(ret) || 0) + 1);
}
const B = Math.round(bet * 100), mean = sum / N, sd = Math.sqrt(Math.max(0, sum2 / N - mean * mean));
const res = { build: H.BUILD, sha: game.P.build.sha, seedCrypto: process.env.SEED_CRYPTO, policySeed: +PSEED || 1, policy: POL, board, bet, rounds: N,
  sumCents: sum, sum2Cents: sum2, rtp: mean / B, sdX: sd / B, hitRate: hits / N, maxCents: max, cryptoU32: globalThis.__cryptoU32, sec: (Date.now() - t0) / 1000 };
console.log(JSON.stringify(res));
res.histogramCents = [...hist.entries()].sort((a, b) => a[0] - b[0]);
if (OUT && OUT !== '-') fs.writeFileSync(OUT, JSON.stringify(res));
