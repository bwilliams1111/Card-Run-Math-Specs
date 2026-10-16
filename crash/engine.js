// engine.js (lab pack copy: reads ../builds-final/card-run-crash-classic-launch.html only; v170 build: RUN IT AGAIN / RUN HALF removed, so no ride exports)
// (batch 3: copied from batch2/crash/engine.js; scripts found by content (the build now has the rules-sheet script too),
//   CardRunRules stub, export block guarded for the identifiers batch 3 removed) (orig: (working copy) hooks/crash/rtp/engine.js) — loads the SHIPPED Card Run Crash Classic code (launch build) into node, unmodified, with
//   * a seeded PRNG in place of crypto.getRandomValues (xoshiro128**, seeded by splitmix32(seed))
//   * a virtual-time setTimeout/clearTimeout/performance.now (the game's own timer-driven flow runs as shipped)
//   * a minimal DOM stub (render() output is discarded; the money logic never reads the DOM)
// The game script and the RunBar script are sliced verbatim out of builds/card-run-crash-classic-launch.html
// (<script> #3 = RunBar module, <script> #4 = game). Their SHA-256 is printed so the lab can match it.
'use strict';
const fs = require('fs'), crypto = require('crypto'), path = require('path');
const BUILD = path.join(__dirname, '..', 'builds-final', 'card-run-crash-classic-launch.html');   // the lab pack reads only inside labpack/

function splitmix32(a) { return function () { a |= 0; a = a + 0x9e3779b9 | 0; let t = a ^ a >>> 16; t = Math.imul(t, 0x21f0aaad); t = t ^ t >>> 15; t = Math.imul(t, 0x735a2d97); return (t ^ t >>> 15) >>> 0; }; }
function xoshiro128ss(seed) {
  const sm = splitmix32(seed); let a = sm(), b = sm(), c = sm(), d = sm();
  return function () {
    const r = Math.imul(rotl(Math.imul(b, 5), 7), 9) >>> 0;
    const t = b << 9; c ^= a; d ^= b; b ^= c; a ^= d; c ^= t; d = rotl(d, 11);
    return r;
  };
  function rotl(x, k) { return (x << k) | (x >>> (32 - k)); }
}

function extractScripts(html) {
  const out = []; const re = /<script[^>]*>([\s\S]*?)<\/script>/g; let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

function makeDom() {
  const els = new Map();
  function el(id) {
    return {
      id, innerHTML: '', textContent: '', className: '', hidden: false, clientWidth: 400, scrollWidth: 0,
      style: { setProperty() {}, fontSize: '' }, dataset: {},
      classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
      querySelector() { return null; }, querySelectorAll() { return []; }, scrollIntoView() {}, appendChild() {}, addEventListener() {},
      cloneNode() { return el(id + '-clone'); }, removeAttribute() {}, setAttribute() {}
    };
  }
  const document = {
    documentElement: el('html'), body: el('body'), head: el('head'),
    getElementById(id) { if (!els.has(id)) els.set(id, el(id)); return els.get(id); },
    querySelector() { return null; }, querySelectorAll() { return []; },
    addEventListener() {}, createElement(t) { return el(t); }
  };
  return { document, els };
}

function loadEngine(opts = {}) {
  const seed = opts.seed >>> 0;
  const html = fs.readFileSync(BUILD, 'utf8');
  const sc = extractScripts(html);
  const pick = (f, what) => { const r = sc.filter(f); if (r.length !== 1) throw new Error('expected 1 ' + what + ' script, got ' + r.length); return r[0]; };
  const runBarSrc = pick(s => s.includes('RUN BAR reference module'), 'run-bar');
  const gameSrc = pick(s => s.startsWith('\n"use strict";\n/* ================= constants & helpers'), 'game');
  const sha = s => crypto.createHash('sha256').update(s).digest('hex');

  // ---- RNG: every crypto.getRandomValues call is served by xoshiro128** ----
  const next = xoshiro128ss(seed); let draws = 0; const forced = [];   // forced[] (edge-case tests only): raw uint32 values served before the PRNG
  const cryptoStub = { getRandomValues(a) { for (let i = 0; i < a.length; i++) { a[i] = forced.length ? forced.shift() : next(); draws++; } return a; } };

  // ---- virtual timers ----
  let now = 0, tid = 0; const q = [];   // small queue: linear min-scan is fine (<=3 live timers)
  const setTimeout_ = (fn, ms) => { const id = ++tid; q.push({ id, t: now + (+ms || 0), fn }); return id; };
  const clearTimeout_ = id => { const i = q.findIndex(x => x.id === id); if (i >= 0) q.splice(i, 1); };
  const performance_ = { now: () => now };
  function step() {
    if (!q.length) return false;
    let bi = 0; for (let i = 1; i < q.length; i++) if (q[i].t < q[bi].t || (q[i].t === q[bi].t && q[i].id < q[bi].id)) bi = i;
    const ev = q.splice(bi, 1)[0]; now = Math.max(now, ev.t); ev.fn(); return true;
  }

  const { document } = makeDom();
  const window_ = {};
  const events = [];
  // ---- RunBar module (UMD): evaluated as CommonJS ----
  const mod = { exports: {} };
  new Function('module', 'exports', 'self', 'document', 'performance', 'setTimeout', runBarSrc)(mod, mod.exports, undefined, undefined, performance_, setTimeout_);
  const RunBar = mod.exports;

  // ---- game script, verbatim, plus an export block appended at the end of the same scope ----
  const exportBlock = `
;return { app, act, startTab, CFG, TABDEFS, ladder, reach, capRung, newBuy, newLeg, legDeal, riding, drawCard, isBust, isRed, cat,
  raceP, barState, settle, startRun, barEnter, endPaid, toChoice, maxPayout, buildUpTo,
  setStake, renderLobby, renderCrash, renderRun, renderResult, renderChoice, doorOut, resumeRound, raceLock, raceDeal, TABLE_MAX, RUN_CAP_X,
  doDeal, legBusted, mountRibbons, rulesHTML: typeof rulesHTML!=='undefined'?rulesHTML:undefined,
  rulesPause: typeof rulesPause!=='undefined'?rulesPause:undefined, rulesResume: typeof rulesResume!=='undefined'?rulesResume:undefined,
  maxWinC: typeof maxWinC!=='undefined'?maxWinC:undefined, parseBetCents: typeof parseBetCents!=='undefined'?parseBetCents:undefined,
  snapBet: typeof snapBet!=='undefined'?snapBet:undefined, MAX_WIN_X: typeof MAX_WIN_X!=='undefined'?MAX_WIN_X:undefined,
  setRender(f){ render=f; }, setTrack(f){ track=f; }, setBoardSnap(f){ boardSnap=f; } };`;
  const CardRunRules = { mount() { return {}; }, isOpen() { return false; }, open() {}, close() {} };   // the sheet is DOM-only; money never reads it
  const factory = new Function('RunBar', 'CardRunRules', 'document', 'window', 'crypto', 'setTimeout', 'clearTimeout', 'performance', 'addEventListener', 'getComputedStyle', 'location',
    gameSrc + exportBlock);
  const G = factory(RunBar, CardRunRules, document, window_, cryptoStub, setTimeout_, clearTimeout_, performance_, () => {}, () => ({ fontSize: '16px' }), { hash: '' });
  G.setRender(() => {});                       // drawing is irrelevant to money; skip it for speed
  G.setBoardSnap(() => null);
  G.setTrack((ev, f) => { if (opts.trackEvents) events.push([ev, f]); });
  return {
    G, RunBar, document, window: window_, step, queue: q, events, forced,
    get now() { return now; }, get draws() { return draws; },
    sha: { runBar: sha(runBarSrc), game: sha(gameSrc), build: sha(html) }, runBarSrc, gameSrc
  };
}
module.exports = { loadEngine, xoshiro128ss, extractScripts, BUILD };
