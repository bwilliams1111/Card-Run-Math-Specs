// Headless Chromium smoke test of the SHIPPED build (../builds-final/...), 430 px wide: rigs crypto.getRandomValues (the page reads rngInt(13) rank draws and rngInt(4) suit
// draws with rejection sampling: one u32 each, a value below the rejection limit is used as is) to
//   1. a board round with four 20s against a dealer 17 (a 2x win) -> the run bar
//   2. DOUBLE OR NOTHING with a dealer soft 17 (A, 6): the dealer STANDS, no third card; felt line, panel text
//   3. DOUBLE HALF with a dealer hard 16 (10, 6): the dealer HITS (third card), then CASH OUT
//   4. the rules sheet: the dealer sentence, the double return row.
// Screenshots go to out/shots/. Usage: NODE_PATH=/opt/npm-tools/node_modules node browser_smoke.js     -> prints a JSON summary, exit 1 on any failed expectation
'use strict';
const path = require('path'), fs = require('fs');
const puppeteer = require('puppeteer');
const BUILD = path.join(__dirname, '..', 'builds-final', 'card-run-blackjack-classic-launch.html');
const SHOTS = path.join(__dirname, 'out', 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'], headless: true });
  const page = await browser.newPage(); await page.setViewport({ width: 430, height: 932, deviceScaleFactor: 2 });
  const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|net::ERR|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.evaluateOnNewDocument(() => {
    // rank index: A=0 2..9 -> 1..8, 10=9, J=10, Q=11, K=12 ; suit index 0..3. window.__q holds the queued [rank, suit] cards (each = two u32 draws); empty = real randomness
    window.__q = []; window.__drawn = 0;
    const real = crypto.getRandomValues.bind(crypto); let phase = 0;
    crypto.getRandomValues = a => { if (window.__q.length && a instanceof Uint32Array && a.length === 1) { const c = window.__q[0]; a[0] = c[phase]; if (phase === 1) { window.__q.shift(); } phase ^= 1; window.__drawn++; return a; } return real(a); };
  });
  await page.goto('file://' + BUILD); await sleep(800);
  const R = { build: BUILD, steps: [], ok: true };
  const note = (name, ok, detail) => { R.steps.push({ name, ok: !!ok, detail }); if (!ok) R.ok = false; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  ' + JSON.stringify(detail) : '')); };
  const q = cards => page.evaluate(c => { window.__q.push(...c); }, cards);
  const rank = { A: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 10: 9, J: 10, Q: 11, K: 12 };
  const cards = (...rs) => rs.map(r => [rank[r], 0]);
  const shot = n => page.screenshot({ path: path.join(SHOTS, n + '.png') });
  const txt = sel => page.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);
  const has = id => page.evaluate(i => !!document.getElementById(i), id);
  const waitId = async (id, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await has(id)) return true; await sleep(100); } return false; };
  const waitGone = async (id, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (!(await has(id))) return true; await sleep(50); } return false; };
  const dealer = () => page.evaluate(() => ({ cards: [...document.querySelectorAll('#dcards .card .cc')].map(e => e.textContent), total: document.getElementById('dtot').textContent }));
  await shot('00_lobby');
  // 1. board: hands 1-4 first cards 10, dealer 10, second cards J (four 20s), dealer draws 7 -> 17
  await q(cards('10', '10', '10', '10', '10', 'J', 'J', 'J', 'J', '7'));
  await page.click('#playBtn');
  const gotBar = await waitId('cashOut', 40000); note('base round reaches the run bar (four 20s v dealer 17)', gotBar); await sleep(800);
  await shot('01_run_bar');
  R.bar1 = { cash: await txt('#cashOut'), dbl: await txt('#doubleBtn'), half: await txt('#doubleHalfBtn') }; console.log(JSON.stringify(R.bar1));
  // 2. DOUBLE OR NOTHING vs dealer A,6 (soft 17): player 10, dealer A, player 10 (20, auto-stands); dealer draws 6 and must stand; a sentinel 2 would be a (wrong) third card
  await q(cards('10', 'A', 'J', '6', '2'));
  await page.click('#doubleBtn'); await waitGone('cashOut'); await sleep(900);
  const felt = await txt('#tieTxt'); const panel = await txt('#pt .runpanel'); await shot('02_double_dealing');
  note('felt line reads DEALER STANDS ON 17', felt === 'DEALER STANDS ON 17', felt);
  note('double panel reads WIN PAYS 2X · RETURNS 100.1%', /WIN PAYS 2X\s*·\s*RETURNS 100\.1%/.test(panel || ''), panel);
  const gotBar2 = await waitId('cashOut', 40000); await sleep(1800);
  const d2 = await dealer(); await shot('03_double_won_soft17');
  note('dealer soft 17 (A,6): stands, no third card', gotBar2 && d2.cards.length === 2 && d2.cards[0] === 'A' && d2.cards[1] === '6' && d2.total === '17', d2);
  const left2 = await page.evaluate(() => window.__q.length); note('the sentinel card queued behind the dealer\'s 6 was never drawn', left2 === 1, left2); await page.evaluate(() => { window.__q.length = 0; });
  R.bar2 = { cash: await txt('#cashOut'), dbl: await txt('#doubleBtn'), half: await txt('#doubleHalfBtn'), bar: await txt('.runbox') };
  note('double won: the bar offers $40.00', /\$40\.00/.test(R.bar2.cash || ''), R.bar2);
  // 3. DOUBLE HALF vs dealer 10,6 (hard 16): the dealer hits (sentinel 2 -> 18); player 20 wins
  await q(cards('10', '10', 'J', '6', '2'));
  await page.click('#doubleHalfBtn'); await waitGone('cashOut'); const gotBar3 = await waitId('cashOut', 60000); await sleep(1800);
  const d3 = await dealer(); await shot('04_doublehalf_won_hard16');
  note('dealer hard 16 (10,6): hits (third card)', gotBar3 && d3.cards.length === 3 && d3.cards.join() === '10,6,2' && d3.total === '18', d3);
  R.bar3 = { cash: await txt('#cashOut'), dbl: await txt('#doubleBtn'), half: await txt('#doubleHalfBtn'), bar: await txt('.runbox') };
  note('DOUBLE HALF won: RUN BANK $20.00 chip, CASH OUT $60.00, DOUBLE OR NOTHING $80.00', /RUN BANK\s*\$20\.00/.test(R.bar3.bar || '') && /\$60\.00/.test(R.bar3.cash || '') && /\$80\.00/.test(R.bar3.dbl || ''), R.bar3);
  { const left3 = await page.evaluate(() => window.__q.length); note('hard 16: every queued card (incl. the sentinel) was drawn', left3 === 0, left3); }
  // 4. CASH OUT
  await page.click('#cashOut'); await sleep(900); await shot('05_cashed_out');
  R.afterCash = await txt('.etoast'); note('CASH OUT toast', /CASHED OUT/.test(R.afterCash || ''), R.afterCash);
  // 5. a lost double with the bank: lost DOUBLE OR NOTHING ends the round (new round, rigged win again)
  // 6. rules sheet
  await sleep(1200);
  await page.evaluate(() => { const b = document.getElementById('rulesInfo'); if (b) b.click(); }); await sleep(800);
  const rules = await page.evaluate(() => { const w = [...document.querySelectorAll('*')].find(e => /How to play/.test(e.textContent) && e.children.length > 3 && e.scrollHeight > 300); return w ? w.innerText : document.body.innerText; });
  fs.writeFileSync(path.join(SHOTS, 'rules_text.txt'), rules);
  const para = (rules.match(/DOUBLE OR NOTHING is one hand[^\n]*/) || [''])[0];
  note('rules: dealer sentence', /the dealer hits 16 or less and stands on all 17s/.test(para), para);
  note('rules: no mention of the dealer hitting soft 17', !/hits soft 17/i.test(rules));
  note('rules: DOUBLE OR NOTHING best play row 100.1%', /DOUBLE OR NOTHING, best play\s*100\.1%/.test(rules), (rules.match(/DOUBLE OR NOTHING, best play[^\n]*/) || [''])[0]);
  await shot('06_rules_top');
  await page.evaluate(() => { const s = [...document.querySelectorAll('*')].find(e => /Return to player/.test(e.textContent) && e.scrollHeight > e.clientHeight + 50 && /auto|scroll/.test(getComputedStyle(e).overflowY)); if (s) { const h = [...s.querySelectorAll('h3')].find(x => /Return to player/.test(x.textContent)); if (h) h.scrollIntoView(); } }); await sleep(500);
  await shot('07_rules_return_table');
  note('no page errors', errors.length === 0, errors);
  console.log(JSON.stringify(R)); fs.writeFileSync(path.join(__dirname, 'out', 'browser_smoke.json'), JSON.stringify(R, null, 1));
  await browser.close(); process.exit(R.ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
