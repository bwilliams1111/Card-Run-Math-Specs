// DOUBLE OR NOTHING hands through the SHIPPED code (harness.js: runGame(stake) of the final build, its own dealing, dealer rule, ties and re-deals), one
// hand per call: the player's HIT / STAND is asked of a bot (rungame.js: 'opt' = exact best play, 'conv' = the conventional chart = the CR's "basic strategy",
// 'stand' / 'hit' = always). A hand ends WON or LOST (a tie on 17, 18, 21 or blackjack is dealt again inside the same call: RUN.deal counts the deals).
// RTP of the double = 2 x (wins / resolved hands); pushes per deal = (deals - hands) / deals. Writes a JSON summary (no histogram: pays are 0 or 2 x stake).
// Usage (from labpack/blackjack): SEED_CRYPTO=<n> node -r ./seedcrypto.js double_sim.js <opt|conv|stand|hit> <hands> <out.json>
'use strict';
const fs = require('fs');
const H = require('./harness'), RG = require('./rungame').make({ mode: { opt: 'max', conv: 'conv', stand: 'stand', hit: 'hit' }[process.argv[2]] });
const [STRAT, NH, OUT] = process.argv.slice(2); const N = +NH;
RG.solve();
const game = H.makeGame({ seed: 1, bet: 10, bot: { runChoice: (cards, up) => RG.choose(up.r, cards) } }); const G = game.G, st = game.st;
let wins = 0, deals = 0, firstDealPush = 0; const dealHist = {}; const t0 = Date.now();
for (let n = 0; n < N; n++) {
  G.BUY = { original: 10, banked: 0, held: 0, ammo: 10 }; G.balance = 1e7; st.bar = null; st.toast = null;
  G.runGame(10);
  const r = G.RUN; if (r.res === 'won') wins++; else if (r.res !== 'lost') throw new Error('hand not resolved: ' + r.res);
  deals += r.deal; if (r.deal > 1) firstDealPush++; dealHist[r.deal] = (dealHist[r.deal] || 0) + 1;
}
const w = wins / N, rtp = 2 * w, se = 2 * Math.sqrt(w * (1 - w) / N);
const res = { build: H.BUILD, sha: game.P.build.sha, seedCrypto: process.env.SEED_CRYPTO, strategy: STRAT, hands: N, wins, deals, pushes: deals - N, winChance: w, rtp, rtpSE: se, rtpCI95: [rtp - 1.96 * se, rtp + 1.96 * se],
  pushPerDeal: (deals - N) / deals, dealsPerHand: deals / N, dealHist, cryptoU32: globalThis.__cryptoU32, sec: (Date.now() - t0) / 1000 };
console.log(JSON.stringify(res));
if (OUT && OUT !== '-') fs.writeFileSync(OUT, JSON.stringify(res));
