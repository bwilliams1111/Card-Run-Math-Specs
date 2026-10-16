/*!
 * Card Run · RUN BAR reference module · v170 (v170: RUN IT AGAIN and RUN HALF removed for certification — the bar is CASH OUT, DOUBLE OR NOTHING and DOUBLE HALF (+ the RUN BANK); minimum $0.02 as v169; run deck style: calm amounts, half-bet links, whole-screen dim; CASHED OUT toast; GRP 1.2 with the LOCK IN, PLAY AGAIN, RUN BANK and run-bar-copy amendments)
 * One file, no dependencies. The same mechanic, numbers, copy and design as Card Run Blackjack prototype v152.
 *
 *   RunBar.compute(state)                → the numbers and which controls show (pure; unit-tested in run-bar.test.js)
 *   RunBar.render(el, state, on)         → draws the run bar into el (the action ribbon)
 *   RunBar.renderEnd(el, {bet,balance}, on)        → PLAY AGAIN $bet  /  CHANGE BET · BALANCE $n
 *   RunBar.renderHandoff(el, {label,amount,badge}, on)  → one gold label-over-amount button
 *   RunBar.renderLockIn(el, {amount,maxWin,banked,half}, on) → LOCK IN $N (+ LOCK IN HALF $keep); returns {set(amount)} for a live board (crash)
 *   RunBar.toast(host, {variant,title,paid,runBank,plain})  → end toast: CASHED OUT / MAX WIN / 1,000× RUN · PAID $total · INCLUDES RUN BANK $B
 *       v165: CASH OUT shows it too (title 'CASHED OUT'); plain:true when the total is at or below the stake (shown, not celebrated)
 *   RunBar.bustStamp(host, {runBank})               → BUSTED stamp (+ RUN BANK $B chip)
 *   RunBar.setScreenDim(rootEl, barEl, on, opacity) → v167 whole-screen dim, default 65%, fades in with the bar
 *   RunBar.setDim([boardEl, ribbonEl], on, opacity) → the old per-element dim (pre-v167 hosts only)
 *
 * state = { held, banked, ammo, maxWin, variant }   all money in dollars (handled internally as integer cents)
 *   held    S: what the round holds and can run now
 *   banked  B: the RUN BANK (round escrow; never in the wallet until the round ends)
 *   ammo    A: what the build produced (the base round's win, the LOCK IN amount, or the P2 prize). Run cap = 1,000 × A
 *   maxWin  MW: the operator MAX WIN in dollars (multiple × bet)
 *   variant the variant name, e.g. 'CLASSIC' (accepted, not used since v170)
 * on = { cashOut(total), double(stake), doubleHalf(stake, bank), paidOut(kind,total) }
 *   The module never moves money. The host credits RUN BANK + held in ONE payment when the round ends.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RunBar = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var MIN_RUN = 2, CAP_X = 1000;                       // $0.02, in cents: the smallest amount DOUBLE OR NOTHING / DOUBLE HALF will take
  var c = function (x) { return Math.round(Number(x) * 100); };        // dollars -> cents
  var d = function (n) { return n / 100; };                             // cents -> dollars
  var money = function (n) {                                            // cents -> "1,234.56"
    var s = (Math.abs(n) / 100).toFixed(2).split('.');
    return (n < 0 ? '-' : '') + s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + s[1];
  };

  /* ------------------------------------------------------------------ the numbers ------------------------------------------------------------------ */
  function compute(st) {
    var S = c(st.held), B = c(st.banked || 0), A = c(st.ammo), MW = c(st.maxWin), cap = CAP_X * A;
    if (B + S > MW) S = MW - B;                                     // MAX WIN clips every payout
    var total = B + S;
    if (total >= MW) return { mode: 'max_win', held: S, banked: B, total: total };
    if (total >= cap) return { mode: 'run_cap', held: S, banked: B, total: total };
    var half = Math.floor(S / 2), keep = S - half;                  // integer cents: an odd cent is kept (banked)
    var show = {
      double: S >= MIN_RUN && B + 2 * S <= MW,
      doubleHalf: half >= MIN_RUN && B + keep + 2 * half <= MW
    };
    show.halfPill = show.doubleHalf;
    show.cashOutOnly = !show.double && !show.doubleHalf;
    var nCap = Math.max(1, Math.ceil(Math.log2(Math.max(1, (cap - B) / S)) - 1e-9));
    var nMW = Math.max(1, Math.floor(Math.log2((MW - B) / S) + 1e-9));
    return {
      mode: 'bar', held: S, banked: B, total: total, half: half, keep: keep, show: show,
      nMax: Math.min(nCap, nMW), cap: cap, maxWin: MW,
      copy: {
        cashOut: '$' + money(total),
        runBank: B > 0 ? '$' + money(B) : null,
        double: '$' + money(2 * S),
        doubleLine: Math.min(nCap, nMW) + (Math.min(nCap, nMW) === 1 ? ' DOUBLE MAX' : ' DOUBLES MAX'),
        half: '$' + money(keep),
        halfStake: '$' + money(half)      // the half link shows the stake (what doubles); the odd cent is banked
      }
    };
  }

  /* ------------------------------------------------------------------ styles ------------------------------------------------------------------ */
  var CSS = [
    '.crk-bar{position:relative;display:grid;grid-template-columns:minmax(0,1fr);gap:8px 10px;font-family:"Chakra Petch",Montserrat,system-ui,sans-serif;animation:crkIn .35s cubic-bezier(.2,1.5,.4,1) both}',
    '@keyframes crkIn{from{transform:translateY(14px) scale(.96);opacity:.3}}',
    '.crk-btn{all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:999px;font-family:"Chakra Petch",Montserrat,system-ui,sans-serif;font-weight:700;-webkit-tap-highlight-color:transparent;transition:transform .08s,filter .15s}',
    '.crk-btn:active{transform:scale(.97)}.crk-btn:hover{filter:brightness(1.07)}.crk-btn:focus-visible{outline:2px solid #e9bc57;outline-offset:3px}',
    '.crk-c{justify-self:center;position:relative;display:flex;align-items:center;transform-origin:center;white-space:nowrap}',
    '.crk-cash{flex:none;height:44px;padding:0 22px;gap:12px;background:rgba(9,16,38,.94);border:1.5px solid #4f5d8c;color:#c9d1ea;box-shadow:0 4px 14px rgba(0,0,0,.35)}',
    '.crk-cash .t{font-size:14px;letter-spacing:.16em}.crk-cash .a{font-size:21px;color:#fff}',
    '.crk-rb{position:absolute;left:50%;bottom:calc(100% - 9px);transform:translateX(-50%);z-index:2;display:flex;align-items:baseline;gap:7px;line-height:1;padding:4px 12px;border-radius:999px;background:#163a2a;border:1px solid #2f6b4b;box-shadow:0 2px 8px rgba(0,0,0,.35);font-family:Montserrat,system-ui,sans-serif;white-space:nowrap;pointer-events:none}',
    '.crk-rb i{font-style:normal;font-size:10.5px;letter-spacing:.14em;font-weight:800;color:#7fd8a4}.crk-rb b{font-family:"Chakra Petch",Montserrat,sans-serif;font-weight:700;font-size:14px;color:#9ff0bf}',
    '.crk-dbl{height:66px;padding:4px 10px;flex-direction:column;line-height:1.05;text-align:center;min-width:0;overflow:hidden}',
    '.crk-dbl .t{line-height:16px}.crk-dbl .a{line-height:26px}.crk-dbl .s{line-height:13px}',   /* fixed line boxes: shrinking a big amount never changes the bar height (v152.2) */
    '.crk-dbl{background:#e9bc57;color:#1c1a12;box-shadow:0 0 0 3px rgba(233,188,87,.18),0 0 18px rgba(233,188,87,.35)}',
    '.crk-dbl .t{font-size:clamp(12px,3.6vw,15px);letter-spacing:.05em;white-space:nowrap}',
    '.crk-dbl .a{font-size:clamp(19px,6vw,26px);letter-spacing:.01em;white-space:nowrap}',
    '.crk-dbl .s{font-family:Montserrat,system-ui,sans-serif;font-weight:800;white-space:nowrap;margin:2px 0 1px;font-size:11px;letter-spacing:.12em;opacity:.95}',
    /* v167 run deck: the half bet is a text link under DOUBLE OR NOTHING: the stake (half-tone) over DOUBLE HALF + /BANK HALF, underlined; one 44px tap target */
    '.crk-hl{all:unset;box-sizing:border-box;cursor:pointer;justify-self:center;align-self:start;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-height:44px;padding:2px 8px;font-family:"Chakra Petch",Montserrat,sans-serif;font-weight:700;white-space:nowrap;-webkit-tap-highlight-color:transparent;transition:transform .08s;animation:crkIn .35s cubic-bezier(.2,1.5,.4,1) both}',
    '.crk-hl:active{transform:scale(.96)}.crk-hl:focus-visible{outline:2px solid #e9bc57;outline-offset:2px;border-radius:8px}',
    '.crk-hl .ha{font-size:15px;line-height:1;color:#fff;opacity:.5;letter-spacing:.02em}',
    '.crk-hl .hlt{font-size:12px;line-height:1;letter-spacing:.08em;color:#8a94b8;padding-bottom:4px;border-bottom:1.5px solid rgba(138,148,184,.75)}',
    '.crk-hl .hlt b{font-weight:700;color:#e9bc57}',
    /* v167 run deck: calm amounts. CASH OUT and RUN BANK amounts half-tone; the big buttons' amounts smaller at full strength; DOUBLE OR NOTHING in pure black */
    '.crk-cash .a,.crk-rb b{opacity:.5}',
    '.crk-dbl .a{font-size:clamp(16px,4.8vw,20px);line-height:24px;margin-top:2px}',
    '.crk-dbl,.crk-dbl .t,.crk-dbl .a{color:#000}',
    /* v167 run deck: ONE whole-screen dim (a scrim over the screen root), fading in with the bar; only the bar sits above it */
    '.crk-scrim{position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:900;transition:opacity .2s ease}',
    '.crk-scrim.on{opacity:var(--crk-dim,.65);transition:opacity .35s cubic-bezier(.2,.8,.3,1)}',
    '.crk-lift>*{position:relative;z-index:901}',   /* only the bar\'s buttons sit above the scrim; its ribbon dims with the screen */
    /* gold full-width buttons: the end bar (PLAY AGAIN), the phase hand-off and LOCK IN. Anton, label over amount */
    '.crk-one{display:grid;grid-template-columns:1fr}',
    '.crk-gold{all:unset;box-sizing:border-box;cursor:pointer;min-height:76px;border-radius:9px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:8px 4px;background:#e9bc57;color:#1c1a12;box-shadow:0 0 0 3px rgba(233,188,87,.18);font-family:Anton,Impact,"Arial Narrow",sans-serif;line-height:1.05;text-align:center;transition:transform .08s,filter .15s;animation:crkIn .35s cubic-bezier(.2,1.5,.4,1) both}',
    '.crk-gold:active{transform:scale(.97)}.crk-gold:hover{filter:brightness(1.07)}.crk-gold:focus-visible{outline:2px solid #fff;outline-offset:3px}',
    '.crk-gold .t{font-size:clamp(15px,4.9vw,21px);letter-spacing:.03em;white-space:nowrap}.crk-gold .a{font-size:clamp(18px,6vw,26px);letter-spacing:.03em;white-space:nowrap}',
    '.crk-lock{gap:10px}.crk-lc{grid-area:auto;justify-self:stretch}.crk-lc .crk-gold{width:100%}.crk-lc .crk-rb{bottom:calc(100% - 9px)}',
    '.crk-lh{justify-self:center;min-height:44px;padding:0 22px;gap:10px;background:#0f1a34;border:1.5px solid #8a7440;color:#e9e3d0}.crk-lh .t{font-size:11px;letter-spacing:.08em}.crk-lh .a{font-size:17px;color:#fff}.crk-lh[hidden]{display:none}',
    '.crk-badge{margin-left:16px;font-family:Montserrat,system-ui,sans-serif;font-size:.5em;font-weight:900;letter-spacing:.08em;vertical-align:.22em;padding:3px 8px;border-radius:6px}',
    '.crk-badge.on{background:#1f6b3f;color:#fff}.crk-badge.off{background:rgba(28,26,18,.18);color:rgba(28,26,18,.6)}',
    /* toast and bust stamp (place host on the board, position:relative) */
    '.crk-toast{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);z-index:46;min-width:62%;max-width:88%;padding:12px 22px 15px;border-radius:14px;text-align:center;pointer-events:none;background:rgba(6,12,32,.86);border:1px solid rgba(255,255,255,.12);font-family:Montserrat,system-ui,sans-serif}',
    '.crk-toast .eh{font-size:10.5px;font-weight:800;letter-spacing:.24em;color:#c3c9de;opacity:.85}.crk-toast .et{margin-top:6px;font-size:28px;font-weight:900;letter-spacing:.04em;color:#f5c84b;line-height:1.05}',
    '.crk-toast{width:max-content}.crk-toast .et,.crk-toast .es,.crk-toast .crk-chip{white-space:nowrap}.crk-toast .et.plain{color:#e6ebfa;font-size:24px}',   /* v165: one line each; plain = at or below the stake, never celebrated */
    '.crk-toast .es{margin-top:6px;font-size:11px;font-weight:800;letter-spacing:.1em;color:#d5dcf2}',
    '.crk-chip{margin-top:9px;display:inline-block;padding:4px 12px;border-radius:9px;background:rgba(53,107,65,.55);border:1px solid rgba(157,245,207,.5);font-size:14px;font-weight:900;letter-spacing:.08em;color:#fff;font-style:normal}',
    '.crk-bust{position:absolute;left:0;right:0;top:38%;z-index:45;display:flex;flex-direction:column;align-items:center;gap:16px;pointer-events:none;font-family:Montserrat,system-ui,sans-serif}',
    '.crk-bust span{font-family:Anton,Impact,sans-serif;font-size:clamp(54px,17vw,76px);letter-spacing:.04em;color:#ff4d5e;padding:0 18px;border:4px solid #ff4d5e;border-radius:10px;transform:rotate(-8deg);background:rgba(20,4,8,.55)}',
    /* the board dim, "double cover": board and ribbon take the same black overlay at the same opacity and timing */
    '.crk-dimmable{position:relative}.crk-dimmable::after{content:"";position:absolute;inset:0;border-radius:inherit;background:#000;opacity:0;pointer-events:none;z-index:40;transition:opacity .2s ease}',
    '.crk-dimmable.crk-dim::after{opacity:var(--crk-dim,.36);transition:opacity .45s ease 1.2s}',
    '.crk-ribbon.crk-dimmable::after{z-index:0}.crk-ribbon.crk-dimmable>*{position:relative;z-index:1}',   /* the bar sits above its ribbon's overlay; the buttons are never dimmed */
    '@media (prefers-reduced-motion: reduce){.crk-bar,.crk-gold,.crk-hl{animation:none}.crk-dimmable::after,.crk-scrim{transition:none!important}}'
  ].join('\n');
  var injected = false;
  function injectCSS() {
    if (injected || typeof document === 'undefined') return; injected = true;
    var s = document.createElement('style'); s.id = 'crk-run-bar-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  /* ------------------------------------------------------------------ helpers ------------------------------------------------------------------ */
  var lockUntil = 0;
  if (typeof document !== 'undefined') {
    ['keydown', 'keyup'].forEach(function (t) {
      document.addEventListener(t, function (e) {
        if ((e.key === 'Enter' || e.key === ' ') && performance.now() < lockUntil && e.target.closest && e.target.closest('.crk-bar,.crk-one')) { e.preventDefault(); e.stopPropagation(); }
      }, true);
    });
  }
  function mount(el, html, cls) {                       // swaps the ribbon's content; 350 ms input lock so a double tap can't land on the new buttons
    injectCSS(); el.innerHTML = ''; var box = document.createElement('div'); box.className = cls; box.innerHTML = html; el.appendChild(box);
    box.style.pointerEvents = 'none'; setTimeout(function () { box.style.pointerEvents = ''; }, 350); lockUntil = performance.now() + 350;
    return box;
  }
  function fit(box) {
    var cw = box.querySelector('.crk-c');               // CASH OUT (+ RUN BANK pill) never wraps: the row scales if it must
    if (cw) { var avail = box.clientWidth - 8, w = cw.scrollWidth; if (w > avail) cw.style.transform = 'scale(' + (avail / w).toFixed(3) + ')'; }
    box.querySelectorAll('.crk-dbl').forEach(function (b) {   // big amounts shrink a line rather than wrap or clip
      var avail = b.clientWidth - 22;
      b.querySelectorAll('.t,.a,.s').forEach(function (e) { e.style.fontSize = ''; var w = e.scrollWidth; if (w > avail) { var f = parseFloat(getComputedStyle(e).fontSize); e.style.fontSize = (f * avail / w).toFixed(2) + 'px'; } });
    });
    box.querySelectorAll('.crk-hl').forEach(function (h) { var cell = box.clientWidth - 12; h.querySelectorAll('.hlt,.ha').forEach(function (e) { e.style.fontSize = ''; var w = e.scrollWidth; if (w > cell) { var f = parseFloat(getComputedStyle(e).fontSize); e.style.fontSize = (f * cell / w).toFixed(2) + 'px'; } }); });   // a half link shrinks rather than wrap or clip
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); }

  /* ------------------------------------------------------------------ the run bar ------------------------------------------------------------------ */
  function render(el, st, on) {
    on = on || {}; var r = compute(st);
    if (r.mode !== 'bar') { if (on.paidOut) on.paidOut(r.mode, d(r.total)); return r; }   // MAX WIN or the 1,000× run cap: pay at once, no bar
    var s = r.show, k = r.copy, nD = r.nMax;
    var html =
      '<div class="crk-c">' + (k.runBank ? '<div class="crk-rb" aria-hidden="true"><i>RUN BANK</i><b>' + k.runBank + '</b></div>' : '') +
        '<button class="crk-btn crk-cash" data-act="cashOut" aria-label="Cash out ' + k.cashOut + (k.runBank ? ', including run bank ' + k.runBank : '') + '"><span class="t">CASH OUT</span><span class="a">' + k.cashOut + '</span></button></div>' +
      (s.double ? '<button class="crk-btn crk-dbl" data-act="double" aria-label="Double or nothing, ' + k.double + '"><span class="t">DOUBLE OR NOTHING</span><span class="a">' + k.double + '</span></button>' : '') +
      (s.doubleHalf ? '<button class="crk-hl dh" data-act="doubleHalf" aria-label="Double half: ' + k.halfStake + ' doubles, ' + k.half + ' to the run bank"><span class="ha">' + k.halfStake + '</span><span class="hlt"><b>DOUBLE HALF</b>/BANK HALF</span></button>' : '');
    var box = mount(el, html, 'crk-bar');
    fit(box);
    var S = d(r.held), half = d(r.half), keep = d(r.keep);
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return; var a = b.getAttribute('data-act');
      if (a === 'cashOut' && on.cashOut) on.cashOut(d(r.total));
      if (a === 'double' && on.double) on.double(S);
      if (a === 'doubleHalf' && on.doubleHalf) on.doubleHalf(half, keep);
    });
    var f = box.querySelector('[data-act="cashOut"]'); if (f) f.focus({ preventScroll: true });   // focus on the safe default
    return r;
  }

  function renderEnd(el, st, on) {
    on = on || {}; var bet = c(st.bet), bal = c(st.balance), can = bal >= bet;
    var html = can ? '<button class="crk-gold" data-act="again" aria-label="Play again, bet $' + money(bet) + '"><span class="t">PLAY AGAIN</span><span class="a">$' + money(bet) + '</span></button>'
                   : '<button class="crk-gold" data-act="change" aria-label="Change bet"><span class="t">CHANGE BET</span><span class="a">BALANCE $' + money(bal) + '</span></button>';
    var box = mount(el, html, 'crk-one'); var b = box.querySelector('button');
    b.addEventListener('click', function () { if (can) { if (on.playAgain) on.playAgain(d(bet)); } else if (on.changeBet) on.changeBet(); });
    b.focus({ preventScroll: true }); return can;
  }

  function renderHandoff(el, st, on) {
    on = on || {}; var badge = st.badge ? ' <span class="crk-badge ' + (st.badge.on ? 'on' : 'off') + '">' + esc(st.badge.label) + ' ' + (st.badge.on ? 'ON' : 'OFF') + '</span>' : '';
    var html = '<button class="crk-gold" data-act="go"><span class="t">' + esc(st.label) + '</span><span class="a">' + (st.amount != null ? '$' + money(c(st.amount)) : esc(st.sub || '')) + badge + '</span></button>';
    var box = mount(el, html, 'crk-one'); var b = box.querySelector('button');
    b.addEventListener('click', function () { if (on.go) on.go(); }); b.focus({ preventScroll: true });
  }

  function renderLockIn(el, st, on) {                 // LOCK IN $N: the stop that leads to the run bar (a build that can be stopped early, or a crash board's own stop)
    // st = { amount, maxWin, banked, half }   on = { lockIn(amount), lockInHalf(keep, flying), paidOut('max_win', total) }
    // Returns { set(amount), amount() }: a live board (crash) calls set() every tick; the button updates in place (no remount, no new input lock).
    on = on || {}; var B = c(st.banked || 0), MW = st.maxWin != null ? c(st.maxWin) : Infinity, amt = 0, done = false;
    var html = '<div class="crk-c crk-lc">' + (B > 0 ? '<div class="crk-rb" aria-hidden="true"><i>RUN BANK</i><b>$' + money(B) + '</b></div>' : '') +
      '<button class="crk-gold" data-act="lock"><span class="t">LOCK IN</span><span class="a"></span></button></div>' +
      (st.half ? '<button class="crk-btn crk-lh" data-act="lockHalf"><span class="t">LOCK IN HALF</span><span class="a"></span></button>' : '');
    var box = mount(el, html, 'crk-one crk-lock'), b = box.querySelector('[data-act="lock"]'), h = box.querySelector('[data-act="lockHalf"]');
    function set(x) {
      if (done) return; amt = c(x); if (B + amt > MW) amt = MW - B;             // clipped to MAX WIN
      b.querySelector('.a').textContent = '$' + money(amt); b.setAttribute('aria-label', 'Lock in $' + money(amt));
      if (h) { var keep = amt - Math.floor(amt / 2); h.hidden = Math.floor(amt / 2) < MIN_RUN; h.querySelector('.a').textContent = '$' + money(keep); h.setAttribute('aria-label', 'Lock in half: $' + money(keep) + ' to the run bank'); }
      if (B + amt >= MW) { done = true; if (on.paidOut) on.paidOut('max_win', d(B + amt)); }   // reaching MAX WIN pays at once
    }
    b.addEventListener('click', function () { if (done) return; done = true; if (on.lockIn) on.lockIn(d(amt)); });
    if (h) h.addEventListener('click', function () { if (done) return; var fly = Math.floor(amt / 2), keep = amt - fly; if (fly < MIN_RUN) return; done = true; if (on.lockInHalf) on.lockInHalf(d(keep), d(fly)); });
    set(st.amount || 0);
    return { set: set, amount: function () { return d(amt); } };
  }

  function toast(host, st) {
    injectCSS(); var t = document.createElement('div'); t.className = 'crk-toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite');
    t.innerHTML = '<div class="eh">' + esc(st.variant || '') + '</div><div class="et' + (st.plain ? ' plain' : '') + '">' + esc(st.title) + '</div>' + (st.paid != null ? '<div class="es">PAID $' + money(c(st.paid)) + '</div>' : '') +
      (st.runBank > 0 ? '<i class="crk-chip">INCLUDES RUN BANK $' + money(c(st.runBank)) + '</i>' : '');
    host.appendChild(t); return t;
  }
  function bustStamp(host, st) {
    injectCSS(); var t = document.createElement('div'); t.className = 'crk-bust'; t.setAttribute('role', 'status');
    t.innerHTML = '<span>BUSTED</span>' + (st && st.runBank > 0 ? '<i class="crk-chip">RUN BANK $' + money(c(st.runBank)) + '</i>' : '');
    host.appendChild(t); return t;
  }
  // v167: the run deck dims the WHOLE screen: one scrim inside the screen root (must be position:relative/absolute), fading in with the bar (0.35 s).
  // The bar (barEl: the element holding the run bar, e.g. the ribbon) is lifted above the scrim. Default 65%.
  // barEl must not sit inside an ancestor that makes its own stacking context below the scrim (z-index/transform/filter/opacity on an ancestor).
  function setScreenDim(root, barEl, on, opacity) {
    injectCSS(); if (!root) return; var sc = root.querySelector(':scope > .crk-scrim');
    if (!sc) { sc = document.createElement('div'); sc.className = 'crk-scrim'; sc.setAttribute('aria-hidden', 'true'); root.appendChild(sc); }
    if (opacity != null) sc.style.setProperty('--crk-dim', opacity);
    if (barEl) barEl.classList.toggle('crk-lift', !!on);
    sc.classList.toggle('on', !!on);
  }
  function setDim(els, on, opacity) {   // v129-v165 per-element dim (kept for old hosts; v167 uses setScreenDim)
    injectCSS(); (Array.isArray(els) ? els : [els]).forEach(function (e) { if (!e) return; e.classList.add('crk-dimmable'); if (opacity != null) e.style.setProperty('--crk-dim', opacity); e.classList.toggle('crk-dim', !!on); });
  }

  return { compute: compute, render: render, renderEnd: renderEnd, renderHandoff: renderHandoff, renderLockIn: renderLockIn, toast: toast, bustStamp: bustStamp, setDim: setDim, setScreenDim: setScreenDim, CSS: CSS, money: function (x) { return money(c(x)); }, version: '170' };
});
