// Run-bar equality proof (run-bar v170): Blackjack weaves its run deck into its own code (showControls). This script compares the SHIPPED build's
// bar with the shared module's pure RunBar.compute() (/home/claude/fix/runbar/run-bar.js, copied to out/ and never run in place) on >= 1.59 million states
// (held, RUN BANK, ammo, MAX WIN), in two ways:
//   (1) the money lines of showControls, sliced VERBATIM from the build's game script and run as a function: mode (bar / max win / run cap), held,
//       total, half, keep, canDbl (= show.double), canDblH (= show.doubleHalf), cashOnly (= show.cashOutOnly), doubles-in-a-row nD (= nMax);
//   (2) the REAL showControls() run in the harness (stub DOM): the buttons the bar shows (ids), and the amounts printed on them (CASH OUT,
//       RUN BANK chip, DOUBLE OR NOTHING, the DOUBLE HALF stake) against compute().copy; at MAX WIN / the run cap the round is paid at once and the
//       amount paid equals compute().total.
// Usage (from labpack/blackjack): node runbar_diff.js [randomStates=1000000]     -> prints JSON, writes out/runbar_diff.json; exit 1 on any difference
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const H = require('./harness');
const RB_SRC = fs.existsSync(path.join(__dirname, '..', 'shared', 'run-bar.js')) ? path.join(__dirname, '..', 'shared', 'run-bar.js') : '/home/claude/fix/runbar/run-bar.js';   // the pack's own copy first
const local = path.join(__dirname, 'out', 'run-bar-v170.copy.js'); fs.copyFileSync(RB_SRC, local);
const RunBar = require(local);
if (RunBar.version !== '170') throw new Error('not run-bar v170');
const s2 = H.loadBuild().game;
const a = s2.indexOf('    let held=BUY.held; const banked=BUY.banked, MW=maxWin();'), b = s2.indexOf('    const box=barSwap(', a);
if (a < 0 || b < 0) throw new Error('slice markers not found');
const sliceSrc = s2.slice(a, b);
const minRun = +(/const MIN_RUN = ([0-9.]+)[,;]/.exec(s2)[1]);
if (minRun !== 0.02) throw new Error('MIN_RUN differs from the module (0.02)');
const fn = new Function('BUY', 'maxWin', 'capRun', 'cents', 'credit', 'endToast', '$', 'money', 'MIN_RUN',
  `let __mode='bar'; endToast=(t)=>{ __mode = t==='MAX WIN' ? 'max_win' : 'run_cap'; };
   const __r = (()=>{ ${sliceSrc}
   return {held, banked, total, half, keep, canDbl, canDblH, nD}; })();
   return Object.assign({mode:__mode}, __r || {});`);
const cents = x => Math.round(x * 100) / 100;
function sliced(heldC, bankedC, ammoC, mwC) {
  const BUY = { original: 10, banked: bankedC / 100, held: heldC / 100, ammo: ammoC / 100 };
  let paid = null; const credit = x => { paid = x; };
  const r = fn(BUY, () => mwC / 100, () => 1000 * (BUY.ammo || BUY.original), cents, credit, () => {}, () => ({}), x => String(x), minRun);
  if (r.mode !== 'bar') return { mode: r.mode, total: Math.round(paid * 100) };
  return { mode: 'bar', held: Math.round(r.held * 100), total: Math.round(r.total * 100), half: Math.round(r.half * 100), keep: Math.round(r.keep * 100),
    show: { double: r.canDbl, doubleHalf: r.canDblH, cashOutOnly: !r.canDbl && !r.canDblH }, nMax: r.nD };
}
function ref(heldC, bankedC, ammoC, mwC) {
  const r = RunBar.compute({ held: heldC / 100, banked: bankedC / 100, ammo: ammoC / 100, maxWin: mwC / 100 });
  if (r.mode !== 'bar') return { mode: r.mode, total: r.total };
  return { mode: 'bar', held: r.held, total: r.total, half: r.half, keep: r.keep, show: { double: r.show.double, doubleHalf: r.show.doubleHalf, cashOutOnly: r.show.cashOutOnly }, nMax: r.nMax };
}
// (2) the real showControls through the harness. The game's MAX WIN is 20,000 x the round's bet (BUY.original, whole cents): the real function is run on
// the states whose MAX WIN is a whole number of cents x 20,000 (bet = mwC / 20000 cents; the slice test (1) covers every MAX WIN, legal or not).
const g = H.makeGame({ seed: 1 }), G = g.G, st = g.st;
const money = c => (c / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const amt = (html, re) => { const m = re.exec(html); return m ? m[1] : null; };
function real(heldC, bankedC, ammoC, mwC) {
  G.BUY = { original: mwC / 100 / G.MAX_WIN_X, banked: bankedC / 100, held: heldC / 100, ammo: ammoC / 100 }; G.balance = 0; st.bar = null; st.toast = null;
  G.showControls();
  const bar = st.bar; if (!bar) throw new Error('no bar');
  if (bar.ids.includes('again2')) return { paidC: Math.round(G.balance * 100), toast: st.toast || '' };
  const h = bar.html;
  return { ids: bar.ids, cash: amt(h, /CASH OUT<\/span><span class="a">\$([\d,.]+)</), runBank: amt(h, /RUN BANK<\/i><b>\$([\d,.]+)</), dbl: amt(h, /DOUBLE OR NOTHING<\/span><span class="a">\$([\d,.]+)</), halfStake: amt(h, /<span class="ha">\$([\d,.]+)</) };
}
const rng = H.sfc32(170170);
const R = n => Math.floor(rng() * n);
const N = +(process.argv[2] || 1e6);
let diffs = 0, diffsReal = 0, n = 0, nReal = 0, nRandom = 0; const ex = [], exReal = []; const modes = {}; const vis = { cashOutOnly: 0, doubleOnly: 0, doubleHalfOnly: 0, both: 0 };
function check(h, bk, am, mw) {
  n++; const gs = sliced(h, bk, am, mw), r = ref(h, bk, am, mw); modes[r.mode] = (modes[r.mode] || 0) + 1;
  if (r.mode === 'bar') { const s = r.show; if (s.cashOutOnly) vis.cashOutOnly++; else if (s.double && s.doubleHalf) vis.both++; else if (s.double) vis.doubleOnly++; else vis.doubleHalfOnly++; }
  if (JSON.stringify(gs) !== JSON.stringify(r)) { diffs++; if (ex.length < 20) ex.push({ held: h, banked: bk, ammo: am, mw, game: gs, ref: r }); }
  // (2) the real showControls against compute().copy
  if (mw % 20000 !== 0) return;
  nReal++; const x = real(h, bk, am, mw); let bad = null;
  const c = RunBar.compute({ held: h / 100, banked: bk / 100, ammo: am / 100, maxWin: mw / 100 });
  if (c.mode !== 'bar') { if (x.paidC === undefined || x.paidC !== c.total || !x.toast.includes(c.mode === 'max_win' ? 'MAX WIN' : '1,000× RUN')) bad = 'paid'; }
  else {
    const want = ['cashOut']; if (c.show.double) want.push('doubleBtn'); if (c.show.doubleHalf) want.push('doubleHalfBtn');
    if (!x.ids || JSON.stringify(x.ids) !== JSON.stringify(want)) bad = 'buttons';
    else if (x.cash !== c.copy.cashOut.slice(1) || (x.runBank || null) !== (c.copy.runBank ? c.copy.runBank.slice(1) : null)
      || (c.show.double && x.dbl !== c.copy.double.slice(1)) || (c.show.doubleHalf && x.halfStake !== c.copy.halfStake.slice(1))) bad = 'amounts';
  }
  if (bad) { diffsReal++; if (exReal.length < 20) exReal.push({ what: bad, held: h, banked: bk, ammo: am, mw, real: x, copy: c.copy, show: c.show }); }
}
// exhaustive edge region around the minimum: held 1..450 cents, banked 0..120 step 7, ammo 1..5 + 100, several MW
for (let h = 1; h <= 450; h++) for (let bk = 0; bk <= 120; bk += 7) for (const am of [1, 2, 5, 100]) for (const mw of [150, 200, 300, 2000, 20000, 2000000]) check(h, bk, am, mw);
const nEdge = n;
// boundaries around MW and the run cap at the real MW = 20,000 x bet (bet $1.00..$100.00 on the $0.10 grid)
for (let i = 0; i < 200000; i++) {
  const bet = 100 + 10 * R(991), mw = 20000 * bet;
  const am = 1 + R(20 * bet + 1); const cap = 1000 * am; const bk = R(4) ? 0 : R(mw);
  const target = R(2) ? mw : cap; const h = Math.max(1, target - bk + R(5) - 2 + (R(2) ? 0 : -R(3) * Math.floor((target - bk) / 2)));
  check(h, bk, am, mw);
  const h2 = Math.max(1, Math.floor((mw - bk) / 2) + R(5) - 2); check(h2, bk, am, mw);   // B + 2S around MW (double offer edge)
}
// random states (>= 1M)
for (let i = 0; i < N; i++) { const bet = 100 + 10 * R(991); const mw = R(2) ? 20000 * bet : 100 * (1 + R(1e7)); const am = 1 + R(R(2) ? 2000 : 1e6); const bk = R(3) ? 0 : R(mw); const h = 1 + R(R(2) ? 1000 : R(2) ? 5000 : 1e8); check(h, bk, am, mw); nRandom++; }
const out = { gameMinRun: minRun, runBarVersion: RunBar.version, runBarSha256: crypto.createHash('sha256').update(fs.readFileSync(RB_SRC)).digest('hex'), states: n, realShowControlsStates: nReal, edgeStates: nEdge, randomStates: nRandom,
  differencesSlice: diffs, differencesRealShowControls: diffsReal, examples: ex, examplesReal: exReal, modes, barVisibility: vis,
  compared: 'mode, held, total, half, keep, show.double, show.doubleHalf, show.cashOutOnly, nMax (slice); buttons shown + CASH OUT / RUN BANK / DOUBLE OR NOTHING / DOUBLE HALF amounts and the amount paid at MAX WIN / run cap (real showControls)',
  sliceSha: crypto.createHash('sha256').update(sliceSrc).digest('hex').slice(0, 16), build: H.BUILD, buildSha256: crypto.createHash('sha256').update(fs.readFileSync(H.BUILD)).digest('hex') };
console.log(JSON.stringify(out, null, 1).slice(0, 4000));
fs.writeFileSync(path.join(__dirname, 'out', 'runbar_diff.json'), JSON.stringify(out, null, 1));
process.exit(diffs || diffsReal ? 1 : 0);
