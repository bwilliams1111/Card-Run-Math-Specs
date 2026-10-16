// Investigation tool (P4 CI): plays the shipped code with a policy and checks EVERY bar-to-bar transition against the exact bar model
// used by exact_runs.js / mc_model.js (integer cents): the buttons shown for (RUN BANK, held), and the next bar's (RUN BANK, held) after
// each pick, recomputed from the DOUBLE OR NOTHING result (run-bar v170: the bar is CASH OUT / DOUBLE OR NOTHING / DOUBLE HALF; the dealer stands on all 17s in the double, p = 0.50045). The first bar's
// held amount is the board's pay (the base game is checked by its own exact tables). Any mismatch is printed. Also counts how rounds end.
// Usage (from labpack/blackjack): SEED_CRYPTO=<n> node -r ./seedcrypto.js trace_check.js <P4 | doubleBtn | doubleHalfBtn | cashOut> <rounds> <bet> <policySeed>
// (P4 = a uniform random pick among the buttons shown; a button id = that button whenever it is shown, else CASH OUT)
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./harness'), STRAT = require('./strategy'), RG = require('./rungame').make();
const C = require('./consts').parse(); const MIN = Math.round(C.MIN_RUN * 100);   // minimum run in cents, from the build
const [POL, NR, BET, PSEED] = process.argv.slice(2); const N = +NR, bet = +BET, B = Math.round(bet * 100), MW = B * C.MAX_WIN_X;
const bin = path.join(__dirname, 'out', 'optmasks.bin'); STRAT.loadOpt(JSON.parse(fs.readFileSync(bin + '.json', 'utf8')), fs.readFileSync(bin));
RG.solve(); const prng = H.sfc32((+PSEED || 1) >>> 0);
const game = H.makeGame({ seed: 1, bet, bot: { runChoice: (cards, up) => RG.choose(up.r, cards) } }); const G = game.G, reg = game.reg, st = game.st;
function model(b, h, a) { if (b + h > MW) h = MW - b; const tot = b + h; if (tot >= MW || tot >= C.RUN_CAP_X * a) return { end: tot };
  const half = Math.floor(h / 2), keep = h - half; const ids = ['cashOut']; if (h >= MIN && b + 2 * h <= MW) ids.push('doubleBtn'); if (half >= MIN && b + keep + 2 * half <= MW) ids.push('doubleHalfBtn');
  return { b, h, half, keep, ids }; }
let bad = 0, bars = 0, trans = 0; const ends = {}; const BAL0 = 1e7; let hits = 0, sum = 0;
const say = (...x) => { if (bad < 20) console.log(...x); bad++; };
for (let n = 0; n < N; n++) {
  G.balance = BAL0; st.toast = null; st.bar = null; G.startRound();
  let ammo = 0, prev = null, guard = 0;
  for (;;) {
    if (++guard > 100000) throw new Error('stuck');
    const bar = st.bar;
    if (bar && (bar.ids.includes('cashOut') || bar.ids.includes('again2'))) {
      const b = Math.round(G.BUY.banked * 100), h = Math.round(G.BUY.held * 100);
      if (!ammo) ammo = Math.round(G.BUY.ammo * 100);
      // check the transition that led here
      if (prev) { trans++;
        let eb, eh, end = false;
        { const s = prev.act === 'doubleBtn' ? prev.h : prev.half, bank = prev.act === 'doubleBtn' ? prev.b : prev.b + prev.keep, won = prev.res === 'won';
          if (won) { eb = bank; eh = 2 * s; } else if (bank > 0) { eb = 0; eh = bank; } else end = 0; }
        if (bar.ids.includes('again2')) { const paid = Math.round((G.balance - (BAL0 - bet)) * 100); const m = end === 0 ? { end: 0 } : model(eb, eh, ammo);
          if (m.end === undefined || m.end !== paid) say('end mismatch', JSON.stringify({ n, prev, eb, eh, paid, m })); }
        else { const m = model(eb, eh, ammo); if (end === 0 || m.end !== undefined || m.b !== b || m.h !== h) say('state mismatch', JSON.stringify({ n, prev, eb, eh, b, h, m })); }
      }
      if (bar.ids.includes('again2')) { const paid = Math.round((G.balance - (BAL0 - bet)) * 100); sum += paid; if (paid > 0) hits++; ends[prev ? prev.act : 'base'] = (ends[prev ? prev.act : 'base'] || 0) + 1; break; }
      bars++;
      const m = model(b, h, ammo); const shown = bar.ids.filter(i => ['cashOut', 'doubleBtn', 'doubleHalfBtn'].includes(i));
      if (m.end !== undefined || JSON.stringify(m.ids) !== JSON.stringify(shown)) say('buttons mismatch', JSON.stringify({ n, b, h, ammo, shown, m }));
      let act;
      if (POL === 'P4') act = shown[Math.floor(prng() * shown.length)]; else act = shown.includes(POL) ? POL : 'cashOut';
      if (act === 'cashOut') { prev = null; reg.get('cashOut').onclick(); const paid = Math.round((G.balance - (BAL0 - bet)) * 100); if (paid !== b + h) say('cash mismatch', JSON.stringify({ n, b, h, paid })); sum += paid; if (paid > 0) hits++; ends.cash = (ends.cash || 0) + 1; break; }
      prev = { act, b, h, half: m.half, keep: m.keep };
      reg.get(act).onclick();
      // the run that followed: read its result
      prev.res = G.RUN ? G.RUN.res : '?';
      continue;
    }
    const S = G.S;
    if (S && S.phase === 'player' && reg.get('hitBtn').disabled === false && S.active >= 0) { const d = STRAT.decide('opt', S.hands.map(x => x.cards), S.active, S.dealer[0].r); d === 'hit' ? G.onHit() : G.onStand(); continue; }
    if (bar && bar.ids.includes('again2')) { const paid = Math.round((G.balance - (BAL0 - bet)) * 100); sum += paid; if (paid > 0) hits++; ends.bust = (ends.bust || 0) + 1; break; }
    throw new Error('stuck ' + JSON.stringify({ n, phase: S && S.phase, bar: bar && bar.ids }));
  }
}
console.log(JSON.stringify({ policy: POL, rounds: N, bet, bars, transitionsChecked: trans, mismatches: bad, rtp: sum / (N * B), hitRate: hits / N, ends }));
