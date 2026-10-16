// sim_base.js — base game through the SHIPPED engine of the final build (engine.js: the build's own scripts, seeded crypto):
// newBuy / newLeg / legDeal / riding / ladder deal every round to a bust or to the top red (red #18 caps the board: the AUTO, no-tap
// round). The payout of every fixed stop "LOCK IN at red #j" is 1{reds reached >= j} x ladder(j) on the same cards, so one pass scores
// all 18 stops; a uniformly random stop (player stream seed+1) is scored too.
// usage: node sim_base.js <rounds> <seed> <stakeCents> <out.json>
'use strict';
const fs = require('fs'); const { loadEngine, xoshiro128ss } = require('./engine.js');
const N = +process.argv[2], seed = +process.argv[3], S = +process.argv[4], outp = process.argv[5];
const E = loadEngine({ seed }); const G = E.G; const pr = xoshiro128ss(seed + 1);
const st = G.app.S.classic; st.stake = S; G.app.wallet = 1e15;
const T = G.capRung(G.CFG.classic, S, Math.min(20 * S, G.maxWinC(S)));
const Lj = []; for (let j = 1; j <= T; j++) Lj[j] = G.ladder(G.CFG.classic, S, j);
const cntJ = new Float64Array(T + 1); let capped = 0, cards = 0, sumU = 0, sumU2 = 0, hitU = 0, maxObs = 0; const t0 = Date.now();
for (let n = 0; n < N; n++) {
  G.newBuy(st, 'classic'); const leg = G.newLeg(G.CFG.classic, S, st.buy);
  const U = 1 + Math.floor(pr() / 4294967296 * T);          // uniform random stop 1..T
  while (leg.state === 'play') G.legDeal(leg);
  if (leg.state === 'capped') { capped++; const v = G.riding(leg); if (v !== Lj[T] || leg.j !== T) throw new Error('top pay mismatch'); if (v > maxObs) maxObs = v; }
  cards += leg.cards.length; cntJ[leg.j]++;
  const pu = leg.j >= U ? Lj[U] : 0, x = pu / S; sumU += x; sumU2 += x * x; if (pu > 0) hitU++;
}
const reached = new Float64Array(T + 2); for (let j = T; j >= 0; j--) reached[j] = reached[j + 1] + cntJ[j];
const z = 1.959964, rows = [];
for (let j = 1; j <= T; j++) { const p = reached[j] / N, m = Lj[j] / S, mean = p * m, sd = Math.sqrt(p * m * m - mean * mean), se = sd / Math.sqrt(N);
  rows.push({ red: j, pays: Lj[j], p_reach: p, rtp: mean, ci95: [mean - z * se, mean + z * se], sd, hit: p, max_x: reached[j] ? m : 0 }); }
const mU = sumU / N, sdU = Math.sqrt(sumU2 / N - mU * mU);
const res = { rounds: N, seed, stake: S, rng: 'cards: xoshiro128** seeded by splitmix32(seed); random stop: xoshiro128**(splitmix32(seed+1))', secs: (Date.now() - t0) / 1000,
  cards_per_round: cards / N, rng_draws: E.draws, top_red: T, capped_rounds: capped, max_observed_x: maxObs / S, reached_counts: Array.from(reached.slice(1, T + 1)),
  stops: rows, auto_no_tap: rows[T - 1], uniform_random_stop: { rtp: mU, sd: sdU, ci95: [mU - z * sdU / Math.sqrt(N), mU + z * sdU / Math.sqrt(N)], hit: hitU / N }, sha: E.sha };
fs.writeFileSync(outp, JSON.stringify(res, null, 1));
console.log(JSON.stringify({ rounds: N, seed, stake: S, secs: res.secs, auto: rows[T - 1].rtp, lock1: rows[0].rtp, uniform: mU, build: E.sha.build.slice(0, 16) }));
