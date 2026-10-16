// Lab pack copy of the batch-3 harness ((working copy) batch3/blackjack/verify/harness.js), reading ../builds-final/. Batch 3 copy of (working copy) batch2/blackjack/harness.js (itself from verify/bj/harness.js). Batch-3 changes: the game script is
// found by its content (the RNG block), not by position (the build now has: shell script, rules-sheet.js, game); a CardRunRules stub is
// passed in (the game mounts the rules sheet at the end of its IIFE); the exposure hook reads every name through typeof, so the same
// harness runs stage4 and the stripped build.
// Node harness that runs the SHIPPED Blackjack game script (script #2 of the launch build) against a stub DOM.
// The game code is executed as shipped except for these documented, outcome-neutral source transforms:
//   T1  const sleep = ms => new Promise(...)  ->  const sleep = ms => undefined          (no animation delays)
//   T2  every `await ` and `async ` keyword removed                                       (the flow runs synchronously)
//   T3  `const pick=await runChoice();` (DOUBLE OR NOTHING HIT/STAND wait) -> `const pick=__BOT.runChoice(cards, up);`
//   T4  an exposure hook appended inside the IIFE: globalThis.__G = { S, BUY, balance, bet, startRound, onHit, onStand, ... }
// Math.random inside the game is replaced by a seeded PRNG: sfc32 (this variant increments the counter d before adding it, i.e. it is
// standard sfc32 started at d+1), state seeded from splitmix32(seed), 12 warm-up outputs, 53-bit floats built from 2 outputs.
// Usage: const H = require('./harness'); const g = H.makeGame({seed, bot}); ...
'use strict';
const fs = require('fs'), vm = require('vm'), crypto = require('crypto'), path = require('path');
const BUILD = process.env.BJ_BUILD || path.join(__dirname, '..', 'builds-final', 'card-run-blackjack-classic-launch.html');   // the final build, relative to labpack/blackjack
const EXPECT_SHA = null;   // informational: the sha is reported, not enforced

function loadBuild() {
  const raw = fs.readFileSync(BUILD);
  const sha = crypto.createHash('sha256').update(raw).digest('hex');
  const h = raw.toString('utf8').replace(/data:[a-z/+\-]+;base64,[A-Za-z0-9+/=]+/g, 'DATAURI');
  const scripts = [...h.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const game = scripts.find(s => s.includes("const RNG_VERSION = 'crypto-rejection-v1'"));
  return { sha, scripts, game };
}
function replaceOnce(src, a, b, label) {
  const n = src.split(a).length - 1; if (n !== 1) throw new Error(`transform ${label}: expected 1 match, got ${n}`);
  return src.replace(a, b);
}
function transformGame(src) {
  src = replaceOnce(src, 'const sleep = ms => new Promise(r => setTimeout(r, ms));', 'const sleep = ms => undefined;', 'T1');
  src = replaceOnce(src, 'const pick=await runChoice();', 'const pick=__BOT.runChoice(cards, up);', 'T3');
  const nAwait = (src.match(/\bawait\s+/g) || []).length, nAsync = (src.match(/\basync\s+(?=function\b|\(|[A-Za-z_$][\w$]*\s*=>)/g) || []).length;
  src = src.replace(/\bawait\s+/g, '').replace(/\basync\s+(?=function\b|\(|[A-Za-z_$][\w$]*\s*=>)/g, '');
  const hook = `\n  __OUT.G = { get S(){ return typeof S!=='undefined' ? S : undefined; }, set S(v){ S=v; }, get BUY(){ return typeof BUY!=='undefined' ? BUY : undefined; }, set BUY(v){ BUY=v; }, get balance(){ return typeof balance!=='undefined' ? balance : undefined; }, set balance(v){ balance=v; }, get bet(){ return typeof bet!=='undefined' ? bet : undefined; }, get baseBet(){ return typeof baseBet!=='undefined' ? baseBet : undefined; }, get suspended(){ return typeof suspended!=='undefined' ? suspended : undefined; }, get RUN(){ return typeof RUN!=='undefined' ? RUN : undefined; }, get MODE(){ return typeof MODE!=='undefined' ? MODE : undefined; }, get startRound(){ return typeof startRound!=='undefined' ? startRound : undefined; }, get onHit(){ return typeof onHit!=='undefined' ? onHit : undefined; }, get onStand(){ return typeof onStand!=='undefined' ? onStand : undefined; }, get syncBet(){ return typeof syncBet!=='undefined' ? syncBet : undefined; }, get currentPay(){ return typeof currentPay!=='undefined' ? currentPay : undefined; }, get showControls(){ return typeof showControls!=='undefined' ? showControls : undefined; }, get goLobby(){ return typeof goLobby!=='undefined' ? goLobby : undefined; }, get resumeRound(){ return typeof resumeRound!=='undefined' ? resumeRound : undefined; }, get dealBoard(){ return typeof dealBoard!=='undefined' ? dealBoard : undefined; }, get RUN1(){ return typeof RUN1!=='undefined' ? RUN1 : undefined; }, get PAY(){ return typeof PAY!=='undefined' ? PAY : undefined; }, get M21(){ return typeof M21!=='undefined' ? M21 : undefined; }, get CAP(){ return typeof CAP!=='undefined' ? CAP : undefined; }, get MIN_RUN(){ return typeof MIN_RUN!=='undefined' ? MIN_RUN : undefined; }, get CAP_X(){ return typeof CAP_X!=='undefined' ? CAP_X : undefined; }, get maxWin(){ return typeof maxWin!=='undefined' ? maxWin : undefined; }, get capRun(){ return typeof capRun!=='undefined' ? capRun : undefined; }, get cents(){ return typeof cents!=='undefined' ? cents : undefined; }, get totals(){ return typeof totals!=='undefined' ? totals : undefined; }, get newShoe(){ return typeof newShoe!=='undefined' ? newShoe : undefined; }, get autoHit(){ return typeof autoHit!=='undefined' ? autoHit : undefined; }, get autoStand(){ return typeof autoStand!=='undefined' ? autoStand : undefined; }, get payCents(){ return typeof payCents!=='undefined' ? payCents : undefined; }, get rulesHtml(){ return typeof rulesHtml!=='undefined' ? rulesHtml : undefined; }, get MAX_WIN_X(){ return typeof MAX_WIN_X!=='undefined' ? MAX_WIN_X : undefined; }, get OPERATOR_MAX_WIN_X(){ return typeof OPERATOR_MAX_WIN_X!=='undefined' ? OPERATOR_MAX_WIN_X : undefined; }, get rStake(){ return typeof rStake!=='undefined' ? rStake : undefined; }, get runGame(){ return typeof runGame!=='undefined' ? runGame : undefined; }, get counts(){ return typeof counts!=='undefined' ? counts : undefined; }, get maxWinX(){ return typeof MAX_WIN_X!=='undefined' ? Math.min(MAX_WIN_X, OPERATOR_MAX_WIN_X) : MAXWIN_X; } };\n`;
  const end = src.lastIndexOf('})();'); if (end < 0) throw new Error('IIFE end not found');
  src = src.slice(0, end) + hook + src.slice(end);
  return { src, nAwait, nAsync };
}
// ---- seeded PRNG ----
function splitmix32(a) { return function () { a |= 0; a = a + 0x9e3779b9 | 0; let t = a ^ a >>> 16; t = Math.imul(t, 0x21f0aaad); t = t ^ t >>> 15; t = Math.imul(t, 0x735a2d97); return ((t = t ^ t >>> 15) >>> 0); }; }
function sfc32(seed) {
  const sm = splitmix32(seed); let a = sm(), b = sm(), c = sm(), d = sm();
  const next = () => { a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; let t = (a + b) | 0; a = b ^ b >>> 9; b = c + (c << 3) | 0; c = (c << 21 | c >>> 11); d = d + 1 | 0; t = t + d | 0; c = c + t | 0; return t >>> 0; };
  for (let i = 0; i < 12; i++) next();
  const f = () => ((next() >>> 5) * 67108864 + (next() >>> 6)) / 9007199254740992;
  f.calls = 0; const g = () => { g.calls++; return f(); }; g.calls = 0; return g;
}
// ---- stub DOM (plain objects; only what the game touches) ----
function makeDom() {
  const reg = new Map();   // id -> element
  const st = { bar: null, toast: null, bust: 0, toastLog: [] };
  class CL { constructor() { this.s = new Set(); } add(...c) { for (const x of c) this.s.add(x); } remove(...c) { for (const x of c) this.s.delete(x); }
    toggle(c, on) { const v = on === undefined ? !this.s.has(c) : !!on; v ? this.s.add(c) : this.s.delete(c); return v; } contains(c) { return this.s.has(c); } }
  class Style { setProperty(k, v) { this[k] = v; } removeProperty() {} }
  const RECT = { left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 };
  class El {
    constructor(id) { this._id = id || ''; this.classList = new CL(); this.style = new Style(); this.dataset = {}; this.children = []; this.hidden = false; this.disabled = false;
      this.textContent = ''; this._html = ''; this.className = ''; this.value = ''; this.tabIndex = 0; this.onclick = null; this.onkeydown = null; }
    get id() { return this._id; } set id(v) { this._id = v; if (v) reg.set(v, this); }
    get innerHTML() { return this._html; }
    set innerHTML(v) { this._html = v; v = String(v);
      if (v.indexOf('id="') >= 0) { const ids = [...v.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]); for (const i of ids) reg.set(i, new El(i));
        if (/\brunbox\b/.test(this.className)) st.bar = { el: this, ids, html: v }; }
      else if (/\brunbox\b/.test(this.className)) st.bar = { el: this, ids: [], html: v };
      if (this.className === 'etoast') { st.toast = v; st.toastLog.push(v); }
      if (this.className === 'runbust') st.bust++; }
    get clientWidth() { return 100; } get clientHeight() { return 100; } get scrollWidth() { return 100; } get offsetWidth() { return 100; } get offsetHeight() { return 100; }
    get offsetParent() { return this.hidden ? null : DOC.body; } get parentNode() { return DOC.body; } get parentElement() { return DOC.body; }
    get lastElementChild() { return null; } get firstElementChild() { return null; }
    querySelector(sel) { return /\.runbox$/.test(sel) ? (st.bar ? st.bar.el : null) : new El(); }
    querySelectorAll() { return []; }
    click() { if (typeof this.onclick === 'function') this.onclick(); }
    closest() { return null; } getBoundingClientRect() { return RECT; } appendChild(c) { return c; }
    remove() { if (st.bar && st.bar.el === this) st.bar = null; }
    focus() {} setAttribute() {} removeAttribute() {} addEventListener(t, f) { (this._ls = this._ls || {})[t] = (this._ls[t] || []).concat(f); } fire(t) { for (const f of (this._ls && this._ls[t]) || []) f({ target: this }); } removeEventListener() {} animate() {} insertBefore() {} blur() {} scrollIntoView() {} toggleAttribute() {}
  }
  const el = id => new El(id);
  const DOC = {
    body: null, documentElement: el(), head: el(),
    getElementById(id) { let e = reg.get(id); if (!e) { e = new El(id); reg.set(id, e); } return e; },
    createElement: () => el(),
    querySelector: sel => (/\.runbox$/.test(sel) ? (st.bar ? st.bar.el : null) : el()),
    querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, fonts: undefined,
  };
  DOC.body = el();
  return { DOC, reg, st, el };
}

let CACHED = null;
const PARAMS = ['document', 'location', 'Math', 'setTimeout', 'clearTimeout', 'requestAnimationFrame', 'performance', 'getComputedStyle', 'matchMedia',
  'innerHeight', 'innerWidth', 'MutationObserver', 'window', '__BOT', '__OUT', 'CardRunRules'];
function prepared() {
  if (CACHED) return CACHED;
  const b = loadBuild(); const tr = transformGame(b.game);
  // T4 writes to globalThis.__G; route it to the per-game __OUT object instead
  const src = tr.src;
  CACHED = { build: b, tr, fn: new Function(...PARAMS, src) };
  return CACHED;
}
// T5 (display only): money() formats with toLocaleString('en-US',{2 decimals}), which is very slow in node/ICU. The game's Math/Number
// objects are the host's, so the harness swaps in a fast en-US formatter for Number.prototype.toLocaleString. money() output is only ever
// written to text/HTML; no outcome or payment reads it back (verified by grep: money( appears only in DOM text / aria labels).
const _tls = Number.prototype.toLocaleString;
function fastLocale(loc, o) {
  const x = Number(this);
  if (o && o.minimumFractionDigits === 2 && o.maximumFractionDigits === 2) { const s = Math.abs(x).toFixed(2).split('.'); return (x < 0 ? '-' : '') + s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + s[1]; }
  if (!o) { return Number.isInteger(x) ? String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : _tls.call(x, loc, o); }
  return _tls.call(x, loc, o);
}
function makeGame(opts = {}) {
  const P = prepared();
  const dom = makeDom();
  const rng = sfc32(opts.seed >>> 0);
  const M = Object.create(Math, { random: { value: rng, writable: true } });
  const OUT = {}; const RULES = {};
  const win = { addEventListener() {}, removeEventListener() {}, innerHeight: 800, innerWidth: 430 };
  if (!opts.slowLocale) Number.prototype.toLocaleString = fastLocale;
  dom.DOC.getElementById('game').hidden = true; dom.DOC.getElementById('betInput').value = String(opts.bet ?? 10);
  P.fn(dom.DOC, { hash: opts.hash || '' }, M, () => 0, () => {}, () => 0, { now: () => 0 }, () => ({ fontSize: '12px' }), () => ({ matches: false }),
    800, 430, class { observe() {} disconnect() {} }, win, opts.bot || { runChoice: () => 'stand' }, OUT,
    { mount(c) { RULES.cfg = c; return {}; } });
  // stub fidelity: in the page, the run-bar / end-bar buttons exist only while their bar is up (barSwap replaces the box). The stub's
  // getElementById creates any id on demand, so for these ids it returns null unless the current bar holds them (goLobby/roundFinished read them).
  const BAR_IDS = new Set(['cashOut', 'doubleBtn', 'doubleHalfBtn', 'again2']);
  const gid = dom.DOC.getElementById.bind(dom.DOC);
  dom.DOC.getElementById = id => (BAR_IDS.has(id) && !(dom.st.bar && dom.st.bar.ids.includes(id))) ? null : gid(id);
  const G = OUT.G; G.syncBet();
  return { G, dom, rng, reg: dom.reg, st: dom.st, P, RULES };
}
module.exports = { makeGame, loadBuild, transformGame, sfc32, prepared, BUILD, EXPECT_SHA };
