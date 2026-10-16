// Lab pack (KICKS 20×) -- harness that loads the SHIPPED scripts (run-bar.js = s2 (v170; the version is not checked), game = s3, sliced verbatim from the build)
// into a node vm with a minimal DOM stub, and replaces crypto.getRandomValues with a seeded xoshiro128** PRNG.
// Usage: const H = require('./harness.js'); const g = H.load({seed: 1}); ... (see sim.js)
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const BUILD = path.join(__dirname, '..', 'builds-final', 'card-run-kicks-classic-launch.html');   // the final build (lab pack copy)

// ---- seeded PRNG: splitmix32 seeding -> xoshiro128** (32-bit outputs)
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

// ---- minimal DOM stub
let lastBar = null;           // the run bar's click handler (RunBar.render -> box.addEventListener('click', ...))
const CAP_CHILDREN = 8;
class ClassList { constructor() { this.s = new Set(); } add(...c) { c.forEach(x => this.s.add(x)); } remove(...c) { c.forEach(x => this.s.delete(x)); }
  toggle(c, f) { const on = f === undefined ? !this.s.has(c) : !!f; if (on) this.s.add(c); else this.s.delete(c); return on; } contains(c) { return this.s.has(c); } }
class El {
  constructor(tag, id) { this.tagName = (tag || 'div').toUpperCase(); this.id = id || ''; this.style = { setProperty() {}, removeProperty() {} }; this.classList = new ClassList();
    this.dataset = {}; this.hidden = false; this.textContent = ''; this._html = ''; this.children = []; this.value = ''; this.parentNode = null; this.className = ''; this._ls = {}; }
  set innerHTML(v) { this._html = String(v); this.children = []; } get innerHTML() { return this._html; }
  appendChild(c) { this.children.push(c); c.parentNode = this; if (this.children.length > CAP_CHILDREN) this.children.shift(); return c; }
  remove() {} focus() {} blur() {} scrollIntoView() {} setAttribute() {} getAttribute() { return null; } removeAttribute() {} insertAdjacentHTML() {}
  closest() { return null; } get parentElement() { return this.parentNode || new El('div'); } get lastElementChild() { return new El('div'); }
  querySelector(sel) { if (sel.startsWith(':scope > .')) { const c = sel.slice(10); return this.children.find(x => x.className === c) || null; } return new El('div'); }
  querySelectorAll() { return []; }
  addEventListener(t, f) { if (t === 'click' && /crk-bar/.test(this.className)) lastBar = f; }
  removeEventListener() {}
  animate() { return { finished: Promise.resolve(), set onfinish(f) { Promise.resolve().then(f); } }; }
  getBoundingClientRect() { return { top: 0, left: 0, width: 100, height: 100, right: 100, bottom: 100 }; }
  get offsetWidth() { return 0; } get offsetHeight() { return 0; } get offsetLeft() { return 0; } get offsetTop() { return 0; } get offsetParent() { return null; }
  get scrollWidth() { return 0; } get clientWidth() { return 100; }
}

function load(opts) {
  opts = opts || {};
  const rng = xoshiro128ss(opts.seed >>> 0);
  let rngCalls = 0;
  const els = new Map();
  const getEl = id => { if (!els.has(id)) els.set(id, new El('div', id)); return els.get(id); };
  const document = {
    getElementById: getEl, createElement: t => new El(t), body: new El('body'), documentElement: new El('html'), head: new El('head'),
    querySelector: () => new El('div'), querySelectorAll: () => [], addEventListener() {}, get activeElement() { return getEl('__active'); }
  };
  const events = { counts: {}, cap: [], settle: [] };
  const ctx = {
    document, location: { hash: opts.dev ? '#dev' : '' }, console: { info: (ev, o) => { events.counts[ev] = (events.counts[ev] || 0) + 1; if (ev === 'cap_reached' && events.cap.length < 50) events.cap.push(o); if (opts.trackSettle && ev === 'round_settle') events.settle.push(o); }, log: console.log, warn() {}, error: console.error },
    setTimeout: (f) => { setImmediate(f); return 0; }, clearTimeout() {}, requestAnimationFrame() { return 0; },
    matchMedia: () => ({ matches: true }), getComputedStyle: () => ({ fontSize: '10px' }), performance: { now: () => 0 },
    MutationObserver: class { observe() {} disconnect() {} }, addEventListener() {},
    crypto: { getRandomValues(u) { for (let i = 0; i < u.length; i++) u[i] = rng(); rngCalls++; return u; } },
  };
  vm.createContext(ctx);
  ctx.window = vm.runInContext('this', ctx); ctx.self = ctx.window;
  // TEST COPY: slice run-bar.js, rules-sheet.js and the game script straight from the final build, then add a test-only
  // accessor IN MEMORY (never written to the build). The patched build has no window.__kicks, so it is injected here.
  const html = fs.readFileSync(BUILD, 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const s2 = scripts.find(t => t.includes('root.RunBar = factory()'));
  let s3 = scripts.find(t => t.includes('function offerState'));
  const tail = '\n})();\n';
  if (!s3.endsWith(tail)) throw new Error('unexpected game script tail');
  s3 = s3.slice(0, -tail.length) + "\nwindow.__kicks={S:()=>S,set:o=>{Object.assign(S,o);if('tab'in o||'bets'in o)BET=S.bets[S.tab]||10;render();},offer:offerState,amt:(m,v)=>amt(m,v),setBet:v=>setBet(v),parseBet:typeof parseBet==='function'?parseBet:null,maxWin:b=>maxWin(b),holdWin:t=>holdWin(t)};" + tail;
  // cosmetic speed stub: Intl-based toLocaleString is ~5 ms/round in node; it only formats on-screen text (money(), tnum()).
  if (opts.fastLocale !== false) vm.runInContext("Number.prototype.toLocaleString=function(){return this.toFixed(2)};", ctx);
  vm.runInContext(s2, ctx, { filename: 's2.js' });
  // batch 3: the build also carries rules-sheet.js (CardRunRules, mounted by start()); stage4 has none
  const sR = scripts.find(t => t.includes('root.CardRunRules = {'));
  if (sR) vm.runInContext(sR, ctx, { filename: 'rules-sheet.js' });
  // test-only spies on the module's public API (in memory): last RunBar.render result and last RunBar.toast options
  const spy = { render: null, toast: null }; { const RB = ctx.window.RunBar, r0 = RB.render, t0 = RB.toast;
    RB.render = function (...a) { const r = r0.apply(this, a); spy.render = r; return r; };
    RB.toast = function (...a) { spy.toast = a[1]; return t0.apply(this, a); }; }
  vm.runInContext(s3, ctx, { filename: 's3.js' });
  const K = ctx.window.__kicks;
  return {
    K, ctx, els: getEl, spy, RunBar: ctx.window.RunBar, events, rngCalls: () => rngCalls,
    bar: () => lastBar,
    click: act => { const f = lastBar; lastBar = null; f({ target: { closest: () => ({ getAttribute: () => act }) } }); },
  };
}
const tick = () => new Promise(r => setImmediate(r));
module.exports = { load, xoshiro128ss, tick };
