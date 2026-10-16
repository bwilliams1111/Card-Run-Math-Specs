// MINES 20× lab pack: simulation of the FINAL SHIPPED CODE (../builds-final/card-run-mines-classic-launch.html) through harness.js
// (fake DOM; the game's own handlers: lobby bet field, PLAY, bomb selector, tiles, LOCK IN, run bar, PLAY AGAIN). Outcomes come from
// the build's crypto RNG, replaced by a seeded xoshiro128** stream (seedcrypto.js, seed = $SEED_CRYPTO).
//   SEED_CRYPTO=<seed> node -r ./seedcrypto.js sim.js <mode> <bet> <rounds> <out.json>
//   mode: base  = round r plays bombs 1+((r>>2)%4) and LOCK IN after 1+(r%6) safe picks (when shown), CASH OUT at the bar
//         top   = round r plays bombs 1+(r%4) and never LOCKs IN: the board runs to its top pick (paid in full) or a live bomb; CASH OUT
//         P0 P2 P3 P4 P5 = bombs 4, LOCK IN after 3 safe picks, then at the run bar:
//         P0 cash out · P2 DOUBLE OR NOTHING once · P3 DOUBLE whenever shown · P4 a uniformly random shown button (CASH OUT /
//         DOUBLE OR NOTHING / DOUBLE HALF) at every bar (choice PRNG seed $CHOICE_SEED, default = SEED_CRYPTO + 7) ·
//         P5 DOUBLE HALF once; then CASH OUT.   (P1, RUN IT AGAIN once, was retired with RUN IT AGAIN in v170.)
'use strict';
const fs = require('fs'), path = require('path'); const H = require('./harness');
const FILE = path.join(__dirname, '..', 'builds-final', 'card-run-mines-classic-launch.html');
(async () => {
  const [mode, bet, N, out] = [process.argv[2], +process.argv[3], +process.argv[4], process.argv[5]];
  const T = await H.load(FILE); const st = T.st, ev = globalThis.__events;
  const choose = H.xoshiro128ss(+(process.env.CHOICE_SEED || (+process.env.SEED_CRYPTO + 7)));
  st.balance = 1e12;
  const inp = H.$('lAmtIn'); inp.value = String(bet); inp.dispatch('input'); await H.flush();
  if (st.nextStake !== bet) throw new Error('stake not ' + bet);
  H.$('lPlay').click(); await H.flush();
  let n = 0, sum = 0n, sumsq = 0n, hits = 0, max = 0; const hist = {}, ends = {}, acts = {};
  const t0 = Date.now();
  for (let r = 0; r < N; r++) {
    if (st.R.stage !== 'build' || st.R.bet !== bet) throw new Error('round ' + r + ' did not start at the bet');
    const bombs = mode === 'base' ? 1 + ((r >> 2) % 4) : mode === 'top' ? 1 + (r % 4) : 4, target = mode === 'base' ? 1 + (r % 6) : mode === 'top' ? 99 : 3;
    if (T.Classic.B !== bombs) { H.$('bopt' + bombs).click(); await H.flush(); }
    let bars = 0;
    for (let g = 0; g < 100000 && st.R.stage !== 'over'; g++) {
      const stage = st.R.stage;
      if (stage === 'bar') {
        const shown = ['cashOut', 'double', 'doubleHalf'].filter(a => H.barShown(a));
        let a = 'cashOut';
        if (mode === 'P2' && bars === 0 && shown.includes('double')) a = 'double';
        if (mode === 'P3' && shown.includes('double')) a = 'double';
        if (mode === 'P4') a = shown[Math.floor(choose() * shown.length)];
        if (mode === 'P5' && bars === 0 && shown.includes('doubleHalf')) a = 'doubleHalf';
        acts[a] = (acts[a] || 0) + 1; bars++;
        H.clickAct(a); await H.flush(); continue;
      }
      if (stage === 'build' && st.k >= target && H.lockShown()) { H.clickLock(); await H.flush(); continue; }
      const i = st.tiles.findIndex(t => !t.rev);
      if (i < 0 || stage === 'bust') { await H.flush(); continue; }
      H.clickTile(i); await H.flush();
    }
    const s = ev.filter(e => e[0] === 'round_settle'); if (s.length !== 1) throw new Error('round ' + r + ': ' + s.length + ' settles');
    const c = Math.round(s[0][1].amount * 100), e = s[0][1].end;
    n++; sum += BigInt(c); sumsq += BigInt(c) * BigInt(c); if (c > 0) hits++; if (c > max) max = c;
    hist[c] = (hist[c] || 0) + 1; ends[e] = (ends[e] || 0) + 1;
    ev.length = 0;
    H.clickEnd(); await H.flush();                            // PLAY AGAIN at the same bet
  }
  const res = { file: path.relative(__dirname, FILE), mode, bet, rounds: n, seed: +process.env.SEED_CRYPTO, choiceSeed: mode === 'P4' ? +(process.env.CHOICE_SEED || (+process.env.SEED_CRYPTO + 7)) : null,
    sumCents: sum.toString(), sumsqCents2: sumsq.toString(), hits, maxCents: max, ends, barActions: acts, hist, cryptoU32: globalThis.__cryptoU32, seconds: (Date.now() - t0) / 1000 };
  fs.writeFileSync(out, JSON.stringify(res));
  console.log(JSON.stringify({ mode, bet, rounds: n, seed: res.seed, rtp: Number(sum) / (n * bet * 100), max: max / 100, hits, ends, seconds: res.seconds }));
})().catch(e => { console.error(e); process.exit(1); });
