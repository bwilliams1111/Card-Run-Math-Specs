// KICKS 20× lab pack — simulation of the FINAL SHIPPED CODE (../builds-final/card-run-kicks-classic-launch.html: run-bar.js, rules
// sheet and game script sliced verbatim into a node vm by harness.js) with a seeded crypto.getRandomValues (xoshiro128**, splitmix32
// seeding; the seed is the game RNG seed). The bot's own random choices (Run Game calls, P4 choices) use a SEPARATE stream seeded
// with seed ^ 0x5bd1e995. The base board is played with the exact best-play calls (policy.js 'opt'); Run Game calls are 50/50.
//   node sim.js base <rounds> <seed> [bet=10]          base game: CASH OUT at the first bar        -> out/base_<bet>_<seed>.json
//   node sim.js pol <P0|P2|P3|P4|P5> <rounds> <seed> [bet=10]  full round with a run-bar policy       -> out/pol_<P>_<bet>_<seed>.json
// Policies: P0 cash out · P2 DOUBLE OR NOTHING once, then cash out · P3 double while DOUBLE is offered (to the 1,000× run cap / MAX WIN) ·
// P4 random: cash out with prob 1/3, else a uniform pick of the options shown (DOUBLE, DOUBLE HALF) · P5 DOUBLE HALF once, then cash out.
// (P1 was RUN IT AGAIN once; it is retired with the mechanic, v170.)
// Money is read from the game's own round_settle events (integer cents); every round is ledger-checked against the balance.
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./harness.js'), { decide } = require('./policy.js');
const [, , what, a1, a2, a3, a4] = process.argv;
const POLICY = what === 'pol' ? a1 : null, N = +(what === 'pol' ? a2 : a1), SEED = +(what === 'pol' ? a3 : a2), BET = +((what === 'pol' ? a4 : a3) || 10);
if (!(N > 0) || !(SEED >= 0) || (what !== 'base' && what !== 'pol')) { console.error('usage: node sim.js base <rounds> <seed> [bet] | node sim.js pol <P0|P2|P3|P4|P5> <rounds> <seed> [bet]'); process.exit(2); }
const g = H.load({ seed: SEED, trackSettle: true }); const K = g.K, S = () => K.S();
const botRand = H.xoshiro128ss(SEED ^ 0x5bd1e995), rand = () => botRand() / 4294967296;
const credit = () => { let c = 0; for (const o of g.events.settle) c += Math.round(o.credit * 100); g.events.settle.length = 0; return c; };   // cents credited since the last call
async function settle() { let n = 0; while (S().busy || S().bbust) { await H.tick(); if (++n > 1e6) throw new Error('stuck'); } }
async function playBoard() { while (S().phase === 'play') { await settle(); const c = decide('opt', S(), rand); await g.els(c === 'goal' ? 'bGoal' : 'bWide').onclick(); await settle(); } await settle(); }
const POL = {
  P0: () => 'cashOut',
  P2: (sh, k) => k === 0 && sh.double ? 'double' : 'cashOut',
  P3: sh => sh.double ? 'double' : 'cashOut',
  P4: sh => { if (rand() < 1 / 3) return 'cashOut'; const o = ['double', 'doubleHalf'].filter(a => sh[a]); return o.length ? o[Math.floor(rand() * o.length)] : 'cashOut'; },
  P5: (sh, k) => k === 0 && sh.doubleHalf ? 'doubleHalf' : 'cashOut',
};
(async () => {
  K.set({ balance: 1e9, bets: { classic: BET } }); g.els('bPlay').onclick(); credit();
  const betC = Math.round(BET * 100), mwC = Math.round(K.maxWin(BET) * 100);
  const R = { mode: what, policy: POLICY || 'base', rounds: N, seed: SEED, bot_seed: (SEED ^ 0x5bd1e995) >>> 0, bet: BET, sum: 0, sumsq: 0, hits: 0, max_x: 0, tiers: {}, ledger_errors: 0,
    choices: { cashOut: 0, double: 0, doubleHalf: 0 }, bars: 0, max_win_rounds: 0, run_cap_rounds: 0, bonus_start: 0, bonus_pays: 0, bonus_top: 0, by_correct: {}, hash: 0 };
  const t0 = Date.now(); const f = POLICY ? POL[POLICY] : POL.P0; if (!f) throw new Error('policy ' + POLICY);
  for (let i = 0; i < N; i++) {
    const bal0 = Math.round(S().balance * 100), cap0 = g.events.cap.length;
    g.els('bAgain').onclick();                            // PLAY AGAIN (first round too): buildAgain -> newGame(BET,'buy') debits the bet
    await playBoard();
    if (!POLICY) { const s = S(); R.by_correct[s.correct] = (R.by_correct[s.correct] || 0) + 1;
      if (s.bonusPlayed) { R.bonus_start++; if (s.bonus.streak >= 2) R.bonus_pays++; if (s.bonus.streak === 3) R.bonus_top++; } }
    let k = 0;
    while (K.offer().offer) {
      const sh = g.spy.render && g.spy.render.show || {}; const a = f(sh, k++); R.choices[a]++; R.bars++;
      g.click(a); await settle(); await playBoard();
    }
    if (!S().ended || S().phase === 'play') throw new Error('round not over at ' + i);
    const paid = credit(); const x = paid / betC;
    if (Math.round(S().balance * 100) !== bal0 - betC + paid) R.ledger_errors++;
    for (const c of g.events.cap.splice(cap0)) { if (c.source === 'max_win') R.max_win_rounds++; else R.run_cap_rounds++; }
    if (paid > mwC) R.ledger_errors++;
    R.sum += x; R.sumsq += x * x; if (paid > 0) R.hits++; if (x > R.max_x) R.max_x = x;
    if (!POLICY) R.tiers[x] = (R.tiers[x] || 0) + 1;
    R.hash = (Math.imul(R.hash, 31) + paid) >>> 0;
  }
  const mean = R.sum / N, sd = Math.sqrt(Math.max(0, R.sumsq / N - mean * mean)), se = sd / Math.sqrt(N);
  Object.assign(R, { rtp: mean, sd, ci95: [mean - 1.96 * se, mean + 1.96 * se], hit: R.hits / N, rng_calls: g.rngCalls(), events: g.events.counts, secs: (Date.now() - t0) / 1000 });
  if (!POLICY) delete R.choices;
  const out = path.join(__dirname, 'out', (POLICY ? `pol_${POLICY}_${BET}_${SEED}` : `base_${BET}_${SEED}`) + '.json');
  fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(R) + '\n');
  console.log(path.basename(out), 'rtp', mean.toFixed(5), 'n', N, 'secs', R.secs, 'ledger_errors', R.ledger_errors);
})().catch(e => { console.error(e); process.exit(1); });
