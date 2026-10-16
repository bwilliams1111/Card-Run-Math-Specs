/*!
 * Card Run · RULES SHEET (shared by all four 20× games) · v1 · 14 Oct 2026
 * One ⓘ button that opens a full-height rules & pays sheet over the game. No dependencies, no globals except CardRunRules.
 *
 *   CardRunRules.mount({ button: el, title: 'BLACKJACK 20×', content: () => html, onOpen(), onClose() })
 *     button   an element to turn into the ⓘ (the game places it; 44×44 tap target, aria-label "Rules and pays")
 *     content  a FUNCTION returning the sheet's HTML each time it opens (so tables show pays at the current bet)
 *     onOpen / onClose  optional: a game that deals on its own (Crash auto-deal) pauses while the sheet is open
 *   CardRunRules.open() / close() / isOpen()
 * Building blocks for content (classes styled here): <h3>, <p>, <table class="crr-t"> (first column left, others right),
 *   <p class="crr-note"> small print, <div class="crr-key"> a highlighted line (e.g. the 20× / 1,000× rule).
 */
(function (root) {
  'use strict';
  var CSS = [
    '.crr-btn{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;flex:none;border-radius:50%;cursor:pointer;color:#c9d1ea;-webkit-tap-highlight-color:transparent}',
    '.crr-btn svg{width:24px;height:24px}.crr-btn:hover{color:#fff}.crr-btn:focus-visible{outline:2px solid #e9bc57;outline-offset:2px}',
    '.crr-wrap{position:fixed;inset:0;z-index:2000;display:flex;align-items:stretch;justify-content:center;background:rgba(0,0,0,.6);animation:crrIn .2s ease both}',
    '@keyframes crrIn{from{opacity:0}}',
    '.crr-sheet{position:relative;box-sizing:border-box;width:100%;max-width:460px;height:100%;display:flex;flex-direction:column;background:#0b1430;color:#dfe5f6;font:400 14px/1.5 Montserrat,system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 0 40px rgba(0,0,0,.5)}',
    '.crr-head{flex:none;display:flex;align-items:center;gap:8px;padding:6px 6px 6px 18px;border-bottom:1px solid #24305a}',
    '.crr-head h2{flex:1;margin:0;font:800 15px/1.2 Montserrat,system-ui,sans-serif;letter-spacing:.12em;color:#fff}',
    '.crr-x{all:unset;box-sizing:border-box;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:50%;cursor:pointer;color:#c9d1ea}',
    '.crr-x:focus-visible{outline:2px solid #e9bc57;outline-offset:2px}.crr-x svg{width:22px;height:22px}',
    '.crr-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:6px 18px 28px}',
    '.crr-body h3{margin:18px 0 6px;font:800 12px/1.3 Montserrat,system-ui,sans-serif;letter-spacing:.16em;color:#e9bc57;text-transform:uppercase}',
    '.crr-body p{margin:6px 0}.crr-body b{color:#fff}',
    '.crr-t{width:100%;border-collapse:collapse;margin:6px 0 4px;font-variant-numeric:tabular-nums;font-size:13px}',
    '.crr-t th,.crr-t td{padding:5px 6px;border-bottom:1px solid #1e2a50;text-align:right;vertical-align:top}',
    '.crr-t th:first-child,.crr-t td:first-child{text-align:left}',
    '.crr-t th{font-weight:700;font-size:11px;letter-spacing:.06em;color:#9aa6c9;text-transform:uppercase}',
    '.crr-key{margin:10px 0;padding:10px 12px;border-radius:10px;background:#121e44;border:1px solid #2c3a6b;color:#fff}',
    '.crr-note{font-size:12px;color:#9aa6c9}',
    '@media (prefers-reduced-motion: reduce){.crr-wrap{animation:none}}'
  ].join('\n');
  var ICON_I = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 11v6" stroke-linecap="round"/><circle cx="12" cy="7.5" r="1.2" fill="currentColor" stroke="none"/></svg>';
  var ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var cfg = null, wrap = null, lastFocus = null, injected = false;
  function inject() { if (injected) return; injected = true; var s = document.createElement('style'); s.id = 'crr-css'; s.textContent = CSS; document.head.appendChild(s); }
  function onKey(e) {
    if (!wrap) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key === 'Tab') {                                     // keep focus inside the sheet
      var f = wrap.querySelectorAll('button,[href],[tabindex]:not([tabindex="-1"])'); if (!f.length) return;
      var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
    e.stopPropagation();                                       // game shortcuts (e.g. H / S) don't fire behind the sheet
  }
  function open() {
    if (!cfg || wrap) return; inject(); lastFocus = document.activeElement;
    wrap = document.createElement('div'); wrap.className = 'crr-wrap'; wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-label', cfg.title + ' rules and pays');
    wrap.innerHTML = '<div class="crr-sheet"><div class="crr-head"><h2></h2><button type="button" class="crr-x" aria-label="Close rules">' + ICON_X + '</button></div><div class="crr-body" tabindex="0"></div></div>';
    wrap.querySelector('h2').textContent = cfg.title;
    wrap.querySelector('.crr-body').innerHTML = cfg.content();
    wrap.querySelector('.crr-x').addEventListener('click', close);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(wrap);
    if (cfg.onOpen) try { cfg.onOpen(); } catch (e) {}
    wrap.querySelector('.crr-x').focus({ preventScroll: true });
  }
  function close() {
    if (!wrap) return; document.removeEventListener('keydown', onKey, true); wrap.remove(); wrap = null;
    if (cfg && cfg.onClose) try { cfg.onClose(); } catch (e) {}
    if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (e) {}
  }
  function mount(c) {
    inject(); cfg = c; var b = c.button;
    b.classList.add('crr-btn'); b.setAttribute('type', 'button'); b.setAttribute('aria-label', 'Rules and pays'); b.setAttribute('title', 'Rules and pays'); b.innerHTML = ICON_I;
    b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); open(); });
    return { open: open, close: close };
  }
  root.CardRunRules = { mount: mount, open: open, close: close, isOpen: function () { return !!wrap; }, version: '1' };
})(typeof self !== 'undefined' ? self : this);
