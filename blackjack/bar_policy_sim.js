// The OPTIMAL bar policy (bar_optimum.cpp's policy table) played through the SHIPPED code at a fixed small ammo: the shipped showControls() draws the bar from
// (RUN BANK, held, ammo), the policy table picks the button (CASH OUT / DOUBLE OR NOTHING / DOUBLE HALF), the shipped runGame() plays the double (best play, rungame.js).
// The sample mean of (final pay / ammo) is compared with V*(A)/A. The bet is chosen so that MAX WIN (20,000 x bet) is above the 1,000 x ammo run cap (bet $0.20: MAX WIN $4,000
// v the cap $400 at ammo $0.40), so the bar-only model of bar_optimum applies.
// Usage (from labpack/blackjack): SEED_CRYPTO=<n> node -r ./seedcrypto.js bar_policy_sim.js <ammoCents> <rounds> <policy.bin> <out.json>
'use strict';
const fs = require('fs');
const H = require('./harness'), RG = require('./rungame').make();
const [AM, NR, POLFILE, OUT] = process.argv.slice(2); const A = +AM, N = +NR;
RG.solve();
const buf = fs.readFileSync(POLFILE), TABLE = new Map(); for (let o = 0; o + 9 <= buf.length; o += 9) TABLE.set(buf.readInt32LE(o) * 67108864 + buf.readInt32LE(o + 4), buf[o + 8]);
const bet = 0.2, game = H.makeGame({ seed: 1, bet, bot: { runChoice: (cards, up) => RG.choose(up.r, cards) } }), G = game.G, reg = game.reg, st = game.st;
const BAL0 = 1e7, ID = ['cashOut', 'doubleBtn', 'doubleHalfBtn']; let sum = 0, sum2 = 0, max = 0, hits = 0, bars = 0, doubles = 0; const t0 = Date.now(); const act = [0, 0, 0];
for (let n = 0; n < N; n++) {
  G.BUY = { original: bet, banked: 0, held: A / 100, ammo: A / 100 }; G.balance = BAL0; st.bar = null; st.toast = null;
  G.showControls();
  let guard = 0;
  for (;;) {
    if (++guard > 10000) throw new Error('stuck');
    const bar = st.bar; if (!bar) throw new Error('no bar');
    if (bar.ids.includes('again2')) break;            // the round ended (a lost double with nothing banked, or the run cap)
    const b = Math.round(G.BUY.banked * 100), h = Math.round(G.BUY.held * 100);
    const code = TABLE.get(h * 67108864 + b); if (code === undefined) throw new Error('state not in the policy table: ' + h + ',' + b);
    if (!bar.ids.includes(ID[code])) throw new Error('policy button not shown: ' + ID[code] + ' at ' + h + ',' + b + ' shown ' + bar.ids);
    bars++; act[code]++; if (code) doubles++;
    reg.get(ID[code]).onclick();
    if (code === 0) break;
  }
  const paid = Math.round((G.balance - BAL0) * 100); sum += paid; sum2 += paid * paid; if (paid > max) max = paid; if (paid > 0) hits++;
}
const mean = sum / N, sd = Math.sqrt(sum2 / N - mean * mean), se = sd / Math.sqrt(N);
const res = { build: H.BUILD, sha: game.P.build.sha, seedCrypto: process.env.SEED_CRYPTO, ammoCents: A, rounds: N, policyFile: POLFILE, rtpOverAmmo: mean / A, ci95: [(mean - 1.96 * se) / A, (mean + 1.96 * se) / A], sdX: sd / A, hitRate: hits / N, maxX: max / A,
  barsPerRound: bars / N, doublesPerRound: doubles / N, actionCounts: { cashOut: act[0], double: act[1], doubleHalf: act[2] }, cryptoU32: globalThis.__cryptoU32, sec: (Date.now() - t0) / 1000 };
console.log(JSON.stringify(res)); if (OUT && OUT !== '-') fs.writeFileSync(OUT, JSON.stringify(res));
