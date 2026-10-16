// sim_policy.js — full rounds through the SHIPPED flow of the final build (engine.js: the build's own scripts, virtual timers,
// seeded crypto): act('again') -> startTab -> autoLoop -> LOCK IN (act 'cashout') -> toChoice -> barEnter -> RunBar.compute ->
// act('bar-cash' | 'bar-double' | 'bar-doublehalf') -> startRun -> ... -> bankedBust / settle.
// Nothing is re-implemented; the player only presses what the policy says when a choice is on screen.
// usage: node sim_policy.js <P0|P2|P3|P4|P5> <lock1|auto> <rounds> <seed> <stakeCents> <out.json>
//   build lock1: LOCK IN at red #1 · build auto: never LOCK IN in the build (AUTO DEAL to the top red or a bust)
//   P0 CASH OUT · (P1 = RUN IT AGAIN once: retired with the ride) · P2 DOUBLE OR NOTHING once (played out) then CASH OUT ·
//   P3 DOUBLE OR NOTHING while shown, then CASH OUT · P4 every bar: CASH OUT w.p. 1/3 else a uniformly random shown button
//   (DOUBLE OR NOTHING / DOUBLE HALF); race: LOCK IN w.p. 1/3 at each card · P5 DOUBLE HALF once (played out) then CASH OUT.
// RNG: cards xoshiro128**(splitmix32(seed)); player xoshiro128**(splitmix32(seed ^ 0x5bd1e995)).
'use strict';
const fs = require('fs'); const { loadEngine, xoshiro128ss } = require('./engine.js');
const [policy, build, Nstr, seedStr, Sstr, outp] = process.argv.slice(2);
if (!['P0', 'P2', 'P3', 'P4', 'P5'].includes(policy)) throw new Error('policy must be P0, P2, P3, P4 or P5 (P1 was RUN IT AGAIN once: retired)');
const N = +Nstr, seed = +seedStr, S = +Sstr;
const E = loadEngine({ seed, trackEvents: true }); const G = E.G, RB = E.RunBar;
const pr = xoshiro128ss(seed ^ 0x5bd1e995); const u = () => pr() / 4294967296;
const app = G.app, st = app.S.classic; st.stake = S; app.wallet = 1e15;
function round() {
  E.events.length = 0; const w0 = app.wallet; G.act('again');
  if (!st.buy || st.screen !== 'crash') throw new Error('round did not start');
  let lastBar = null, lastLock = '', lastRace = '', guard = 0, used = false;
  while (true) {
    if (++guard > 1e6) throw new Error('stuck');
    if (st.screen === 'result' || st.ended) break;
    if (st.bar && st.bar !== lastBar) {
      lastBar = st.bar; const r = RB.compute(G.barState(st)); if (r.mode !== 'bar') throw new Error('bar shown in mode ' + r.mode);
      const s = r.show; let a = 'bar-cash';
      if (policy === 'P2' && !used && s.double) a = 'bar-double';
      else if (policy === 'P3' && s.double) a = 'bar-double';
      else if (policy === 'P5' && !used && s.doubleHalf) a = 'bar-doublehalf';
      else if (policy === 'P4' && u() >= 1 / 3) { const o = []; if (s.double) o.push('bar-double'); if (s.doubleHalf) o.push('bar-doublehalf');
        if (o.length) a = o[Math.floor(u() * o.length)]; }
      if (a !== 'bar-cash') used = true;
      G.act(a); continue;
    }
    const leg = st.leg;
    if (st.screen === 'crash' && leg && leg.state === 'play' && leg.live) { const k = leg.uid + ':' + leg.j;
      if (k !== lastLock) { lastLock = k; if (build === 'lock1') { G.act('cashout'); continue; } } }
    if (st.screen === 'run' && st.run && st.run.state === 'play' && st.run.cards.length) { const R = st.run, k = R.id + ':' + R.cards.length;
      if (k !== lastRace) { lastRace = k; G.act(policy === 'P4' && u() < 1 / 3 ? 'racelock' : 'racenext'); continue; } }
    if (!E.step()) throw new Error('no timers and no decision: ' + st.screen);
  }
  if (E.events.filter(e => e[0] === 'round_settle').length !== 1) throw new Error('settle count');
  if (E.queue.length) throw new Error('timers left');
  const paid = st.buy.paid; if (app.wallet - w0 !== paid - S) throw new Error('wallet mismatch'); if (paid > st.buy.mw) throw new Error('above MAX WIN');
  const cap = E.events.find(e => e[0] === 'cap_reached'); return { paid, cap: cap ? cap[1].source : null };
}
const t0 = Date.now(); let sum = 0, sum2 = 0, hit = 0, win = 0, maxPaid = 0, nCap = 0, nMW = 0; const z = 1.959964;
for (let n = 0; n < N; n++) { const r = round(), x = r.paid / S; sum += x; sum2 += x * x; if (r.paid > 0) hit++; if (r.paid > S) win++; if (r.paid > maxPaid) maxPaid = r.paid;
  if (r.cap === 'run_cap') nCap++; if (r.cap === 'max_win') nMW++; }
const m = sum / N, sd = Math.sqrt(Math.max(0, sum2 / N - m * m)), se = sd / Math.sqrt(N);
const res = { policy, build, rounds: N, seed, stake: S, rtp: m, ci95: [m - z * se, m + z * se], se, sd, hit: hit / N, win_freq: win / N, max_paid_x: maxPaid / S,
  run_cap_rounds: nCap, max_win_rounds: nMW, secs: (Date.now() - t0) / 1000, rng: 'cards xoshiro128**(splitmix32(seed)); player xoshiro128**(splitmix32(seed^0x5bd1e995))', build_sha256: E.sha.build };
fs.writeFileSync(outp, JSON.stringify(res, null, 1));
console.log(JSON.stringify({ policy, build, N, seed, S, rtp: m, ci95: res.ci95, secs: res.secs }));
