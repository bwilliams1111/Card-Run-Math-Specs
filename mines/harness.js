// labpack copy of (working copy) batch3/mines/harness.js (unchanged since the v169 pack; v170 needs no change): loads the build file it is given, with a fake DOM
// harness.js (batch 3, Mines; copied from (working copy) batch2/mines/harness.js, load() finds the scripts by content)
// harness.js (batch 2, Mines) - loads the SHIPPED build's inline scripts into node with a minimal fake DOM (copied from
// (working copy) verify/mines/harness.js) and drives the game only through its own handlers (tiles, LOCK IN, run bar, PLAY AGAIN,
// lobby bet field / MAX / BUILD UP TO). Outcomes come from the build's crypto RNG; run node with -r ./seedcrypto.js and
// SEED_CRYPTO=<n> so both builds see the same random stream.
// DOCUMENTED TRANSFORM (in memory only, never written to any build): one line is inserted into the game script just before its
// closing "})();" so the harness can read state and set up edge states:
//   globalThis.__T = { st, G(), Classic, Run, MW, toBar, endRound, lockInValue, cashValue, barState, maxWinFor?, parseBet? }
// Nothing else in any script is changed; the run-bar module and the CloverMatch module run byte-for-byte as shipped.
// The fake DOM's Math.random is irrelevant to outcomes (the build draws every outcome from crypto.getRandomValues).
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
function xoshiro128ss(seed) {
  let x = seed >>> 0; const sm = () => { x = (x + 0x9e3779b9) >>> 0; let z = x; z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0; z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0; return (z ^ (z >>> 16)) >>> 0; };
  let a = sm(), b = sm(), c = sm(), d = sm();
  const next = () => { const r = Math.imul(((Math.imul(b, 5) << 7) | (Math.imul(b, 5) >>> 25)), 9) >>> 0; const t = (b << 9) >>> 0;
    c ^= a; d ^= b; b ^= c; a ^= d; c ^= t; d = ((d << 11) | (d >>> 21)) >>> 0; a >>>= 0; b >>>= 0; c >>>= 0; return r; };
  return () => ((next() >>> 5) * 67108864 + (next() >>> 6)) / 9007199254740992;
}

// ---------------- fake DOM ----------------
const registry = new Map();
let queue = [], now = 0, seq = 0;
class ClassList { constructor() { this.s = new Set(); } add(...a) { a.forEach(x => this.s.add(x)); } remove(...a) { a.forEach(x => this.s.delete(x)); }
  toggle(x, f) { const on = f === undefined ? !this.s.has(x) : !!f; on ? this.s.add(x) : this.s.delete(x); return on; } contains(x) { return this.s.has(x); } }
class El {
  constructor(tag = 'div') { this.tagName = tag.toUpperCase(); this.classList = new ClassList(); this.style = { setProperty() {}, removeProperty() {} };
    this.dataset = {}; this.attrs = {}; this.children = []; this.parentNode = null; this.listeners = {}; this._html = ''; this._qs = new Map();
    this.textContent = ''; this.hidden = false; this.disabled = false; this.value = ''; this.title = ''; this.tabIndex = 0; this._id = '';
    this.scrollWidth = 0; this.clientWidth = 400; this.clientHeight = 600; this.offsetWidth = 400; }
  get id() { return this._id; } set id(v) { this._id = v; registry.set(v, this); }
  get className() { return [...this.classList.s].join(' '); } set className(v) { this.classList.s = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get innerHTML() { return this._html; } set innerHTML(v) { this._html = String(v); this._qs = new Map(); this.children = []; }
  get firstChild() { return this.children[0] || null; } get lastChild() { return this.children[this.children.length - 1] || null; }
  setAttribute(k, v) { this.attrs[k] = String(v); } getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; } removeAttribute(k) { delete this.attrs[k]; }
  appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
  append(...cs) { cs.forEach(c => typeof c === 'object' && this.appendChild(c)); }
  remove() { if (this.parentNode) { const p = this.parentNode.children, i = p.indexOf(this); if (i >= 0) p.splice(i, 1); } this.parentNode = null; }
  addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); } removeEventListener(t, f) { const l = this.listeners[t] || []; const i = l.indexOf(f); if (i >= 0) l.splice(i, 1); }
  dispatch(t, ev) { (this.listeners[t] || []).slice().forEach(f => f(ev || { target: this, preventDefault() {}, stopPropagation() {} })); }
  click() { this.dispatch('click'); }
  querySelector(sel) {
    if (this._html) { const tok = sel.replace(/^[.#]/, '').replace(/^\[data-act="(.*)"\]$/, 'data-act="$1"'); if (sel !== 'button' && !this._html.includes(tok)) return null; }
    if (!this._qs.has(sel)) { const e = new El(); e.parentNode = this; this._qs.set(sel, e); } return this._qs.get(sel); }
  querySelectorAll() { return []; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 }; }
  animate() { return { finished: Promise.resolve(), set onfinish(f) {} }; }
  closest() { return null; } matches() { return false; } contains() { return false; } focus() {} blur() {}
}
function installDom(seed) {
  const g = globalThis;
  g.window = g; g.self = g;
  g.document = { body: new El('body'), head: new El('head'), documentElement: new El('html'), title: '', activeElement: null, listeners: {},
    getElementById(id) { if (!registry.has(id)) { const e = new El(); e.id = id; e.parentNode = new El(); } return registry.get(id); },
    createElement(t) { return new El(t); }, querySelector() { return new El(); }, querySelectorAll() { return []; },
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }, removeEventListener() {} };
  g.location = { hash: '', href: 'file:///x.html' };
  g.history = { replaceState(_, __, h) { /* replaceState does not fire hashchange (as in a browser) */ g.location.hash = h; } };
  g.matchMedia = () => ({ matches: true, addEventListener() {} });            // prefers-reduced-motion: no animation delays
  g.getComputedStyle = () => ({ paddingLeft: '0', paddingRight: '0', paddingTop: '0', paddingBottom: '0', fontSize: '14px' });
  g.ResizeObserver = class { observe() {} disconnect() {} };
  g.MutationObserver = class { observe() {} disconnect() {} };
  g.wlisteners = {}; g.addEventListener = (t, f) => { (g.wlisteners[t] = g.wlisteners[t] || []).push(f); };
  g.setTimeout = (fn, ms) => { const id = ++seq; queue.push({ t: now + (+ms || 0), id, fn }); return id; };
  g.clearTimeout = id => { queue = queue.filter(q => q.id !== id); };
  g.setInterval = () => 0; g.clearInterval = () => {};
  g.requestAnimationFrame = fn => g.setTimeout(() => fn(now), 16);
  g.cancelAnimationFrame = g.clearTimeout;
  g.__events = [];
  const keep = new Set(['round_settle',  'cap_reached', 'lock_in', 'run_choice', 'run_result', 'banked_continue', 'wallet_credit', 'run_offer']);
  console.info = (name, obj) => { if (keep.has(name)) g.__events.push([name, obj]); };
  const prng = xoshiro128ss(seed); g.__forced = [];
  Math.random = () => g.__forced.length ? g.__forced.shift() : prng();   // tests may queue exact draws (forceBoard); otherwise the seeded PRNG
  // display-only speed-up: Node's per-call ICU toLocaleString dominates run time; reuse one Intl.NumberFormat per option set (identical output)
  const fmts = new Map(), orig = Number.prototype.toLocaleString;
  Number.prototype.toLocaleString = function (loc, opt) { const k = loc + JSON.stringify(opt || {}); let f = fmts.get(k);
    if (!f) { f = new Intl.NumberFormat(loc, opt); fmts.set(k, f); } return f.format(this); };
}
const tick = async () => { for (let i = 0; i < 8; i++) await null; };
async function flush() {
  for (let guard = 0; guard < 100000; guard++) {
    await tick();
    if (!queue.length) { await tick(); if (!queue.length) return; }
    queue.sort((a, b) => a.t - b.t || a.id - b.id);
    const q = queue.shift(); now = Math.max(now, q.t); q.fn();
  }
  throw new Error('flush: runaway timers');
}

function scriptsOf(file) { return [...fs.readFileSync(file, 'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]); }
const EXPOSE = "globalThis.__T = { st, G: () => G, Classic, Run, MW, toBar, endRound, lockInValue, cashValue, barState, maxWinFor: typeof maxWinFor === 'function' ? maxWinFor : null, parseBet: typeof parseBet === 'function' ? parseBet : null };\n";
function exposeGame(js) {                                       // the line goes just before the game script's closing "})();"
  const i = js.lastIndexOf('\n})();'); if (i < 0 || !js.includes('const Classic = (() => {')) throw new Error('exposure anchor not found');
  return js.slice(0, i + 1) + EXPOSE + js.slice(i + 1);
}
async function load(file, seed = 1) {
  installDom(seed);
  const sc = scriptsOf(file);
  // by content, so stage4 (strip, run bar, CloverMatch, game) and the batch-3 build (strip, run bar, rules sheet, game) both load
  const runbar = sc.filter(x => x.includes('Card Run · RUN BAR reference module')), game = sc.filter(x => x.includes('const Classic = (() => {'));
  const rules = sc.filter(x => x.includes('Card Run · RULES SHEET')), clover = sc.filter(x => x.includes('window.CloverMatch'));
  if (runbar.length !== 1 || game.length !== 1) throw new Error("run-bar or game script not found");
  if (sc.length !== 1 + runbar.length + game.length + rules.length + clover.length) throw new Error('unexpected inline scripts: ' + sc.length);
  // script 0 (EBG RUN BANK strip: a MutationObserver, display only) is not run (no observer in the fake DOM)
  vm.runInThisContext(runbar[0], { filename: 'runbar.js' });
  if (clover.length) vm.runInThisContext(clover[0], { filename: 'clovermatch.js' });
  if (rules.length) vm.runInThisContext(rules[0], { filename: 'rules-sheet.js' });
  vm.runInThisContext(exposeGame(game[0]), { filename: "game.js" });
  await flush();                                                // rAF -> the game's start (setGame('classic', true) in stage4)
  return globalThis.__T;
}

// ---------------- driver: acts only through the build's own handlers ----------------
const $ = id => document.getElementById(id);
function ribbonBox() { const rb = $('crk'); return rb.children[rb.children.length - 1]; }
function clickAct(act) {                                        // a run-bar button (delegated click on the bar box)
  const box = ribbonBox(); if (!box || !box.innerHTML.includes(`data-act="${act}"`)) throw new Error('button not shown: ' + act);
  box.dispatch('click', { target: { closest: () => ({ getAttribute: () => act }) } });
}
function barShown(act) { const box = ribbonBox(); return !!box && box.innerHTML.includes(`data-act="${act}"`) && box.classList.contains('crk-bar'); }
function lockShown() { const box = ribbonBox(); return !!box && box.innerHTML.includes('data-act="lock"'); }
function clickLock() { ribbonBox().querySelector('[data-act="lock"]').click(); }
function clickEnd() { ribbonBox().querySelector('button').click(); }
function clickTile(i) { $('grid').children[i].click(); }

// queue the Math.random draws that make the build's Fisher–Yates shuffle (s3:139) produce `want` (array of type tags) from `init`
function forceBoard(init, want) {
  const a = init.slice(), n = a.length, rs = [];
  for (let i = n - 1; i > 0; i--) { let j = -1; for (let x = 0; x <= i; x++) if (a[x] === want[i]) { j = x; break; } if (j < 0) throw new Error('cannot force');
    [a[i], a[j]] = [a[j], a[i]]; rs.push((j + 0.5) / (i + 1)); }
  if (a[0] !== want[0]) throw new Error('force mismatch'); globalThis.__forced.push(...rs);
}
module.exports = { forceBoard, load, flush, xoshiro128ss, clickAct, barShown, lockShown, clickLock, clickEnd, clickTile, ribbonBox, $, registry };
