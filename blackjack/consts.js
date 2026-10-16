// Reads the game constants and rule fragments from the FINAL build's text (../builds-final/<file>), so every script in this pack
// works from what ships. parse() returns the values; check(USE) asserts that a script's own values equal them (deep equality).
// Usage: node consts.js   (prints the parsed constants and the build's sha256)
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const FILE = path.join(__dirname, '..', 'builds-final', 'card-run-blackjack-classic-launch.html');
function gameScript() {
  const raw = fs.readFileSync(FILE); const h = raw.toString('utf8');
  const game = [...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.includes("const RNG_VERSION = 'crypto-rejection-v1'"));
  if (!game) throw new Error('game script not found');
  return { raw, game, sha: crypto.createHash('sha256').update(raw).digest('hex') };
}
const obj = s => { const o = {}; for (const m of s.matchAll(/(\d+)\s*:\s*([\d.]+)/g)) o[+m[1]] = +m[2]; return o; };
function one(src, re, label) { const m = src.match(re); if (!m) throw new Error('constant not found in the build: ' + label); return m; }
function has(src, frag, label) { const n = src.split(frag).length - 1; if (n !== 1) throw new Error(`rule fragment "${label}" found ${n} times`); return true; }
// the previous Run Game dealer rule (hits soft 17, v170 and earlier) must be gone from the whole file: its code line, its felt line and its rules-sheet wording
function absentH17(text) {
  const bad = ["t.best<17 || (t.best===17 && t.soft)", "DEALER HITS SOFT 17", "the dealer hits soft 17", "dealer hits soft 17", "hits soft 17", "RETURNS 99.9%", "<td>99.9%</td>"].filter(f => text.includes(f));
  if (bad.length) throw new Error('the previous H17 dealer rule / 99.9% copy is still in the build: ' + bad.join(' | '));
  return true;
}
// the RUN IT AGAIN / RUN HALF mechanics were removed from the build (v170): none of their names may remain in the file (the lobby artwork's
// "BUILD IT. RUN IT." is the only allowed 'RUN IT'). Checked on the whole file text with the embedded images removed.
function absent(text) {
  const t = text.replace(/data:[a-z\/+\-]+;base64,[A-Za-z0-9+\/=]+/g, 'DATAURI').replace(/BUILD IT\. RUN IT\./g, 'LOBBY ARTWORK');
  const bad = [/\bride/i, /run it/i, /run half/i, /runHalf/, /runIt\b/, /rideK/, /kMil/, /kNum/, /kDen/, /K_RIDE/, /RIDE/, /canRide/, /pillonly/, /atRisk/, /\bk:\s*1\.0/].filter(re => re.test(t));
  if (bad.length) throw new Error('removed mechanics still named in the build: ' + bad.join(' '));
  return true;
}
function parse() {
  const { game: g, sha, raw } = gameScript();
  absent(raw.toString('utf8')); absentH17(raw.toString('utf8'));
  const C = { file: FILE, sha };
  C.WINS = obj(one(g, /WINS: \{([^}]*)\}/, 'PAY.WINS')[1]);
  C.BJ_C = obj(one(g, /BJ_C: \{([^}]*)\}/, 'PAY.BJ_C')[1]);
  C.M21 = obj(one(g, /const M21 = \{([^}]*)\}/, 'M21')[1]);
  C.CAP = +one(g, /const CAP = (\d+);/, 'CAP')[1];
  C.MAX_WIN_X = +one(g, /const MAX_WIN_X = (\d+);/, 'MAX_WIN_X')[1];
  C.OPERATOR_MAX_WIN_X = one(g, /const OPERATOR_MAX_WIN_X = (\w+);/, 'OPERATOR_MAX_WIN_X')[1] === 'MAX_WIN_X' ? C.MAX_WIN_X : NaN;
  C.MIN_RUN = +one(g, /const MIN_RUN = ([\d.]+);/, 'MIN_RUN')[1];
  C.RUN_CAP_X = +one(g, /const capRun = \(\) => (\d+)\*\(BUY\.ammo \|\| BUY\.original\);/, 'capRun')[1];
  const bt = one(g, /const BET_MIN_T = (\d+), BET_MAX_T = (\d+);/, 'BET_MIN_T / BET_MAX_T'); C.BET_MIN = +bt[1] / 10; C.BET_MAX = +bt[2] / 10; C.BET_STEP = 0.1;
  C.TIE_WIN_RANKS = JSON.parse(one(g, /const TIE_WIN=(\[[\d,]+\]);/, 'RUN1 TIE_WIN')[1]);   // RUN1 rank codes: 2..5 = 17..20, so [4,5] = ties on 19 and 20
  // rule fragments (exact source text that the models below assume)
  C.rules = {
    infiniteDeck: has(g, "pop(){ return {r:RANKS[rngInt(13)], s:SUITS[rngInt(4)]}; },", 'newShoe: every card drawn from 13 ranks'),
    runDrawInfinite: has(g, "const runDraw = () => ({r:RANKS[rngInt(13)], s:SUITS[rngInt(4)]});", 'runDraw'),
    boardDealerS17: has(g, "while(totals(S.dealer).best<17);", 'board dealer stands on all 17s'),
    boardAutoHit: has(g, "const autoHit = h => { const t=totals(h.cards); return t.soft ? t.best<=16 : t.best<=11; };", 'auto-hit hard <= 11 / soft <= 16'),
    boardAutoStand: has(g, "const autoStand = h => { const t=totals(h.cards); return t.soft ? t.best>=18 : t.best>=17; };", 'auto-stand hard >= 17 / soft >= 18'),
    boardTieWins: has(g, "else if(t===dt){ h.result='win'; wins++; }", 'tie = win'),
    boardBJvsBJ: has(g, "else h.bjTie=true;", 'BJ vs dealer BJ = tie (no win)'),
    boardDealerBJ: has(g, "if(dnat){ h.result='loss'; return; }", 'dealer BJ beats every other hand'),
    boardPay: has(g, "let p=(PAY.BJ_C[c.bj]||0) + (M21[c.made]||0);\n    if(S.phase==='done') p += (PAY.WINS[S.wins]||0);\n    return payCents(Math.min(p, CAP), rStake())/100;", 'currentPay'),
    payCentsFloor: has(g, "function payCents(x, stake){\n    const sc = BigInt(Math.round(stake*100)), t = BigInt(Math.round(x*10));\n    return Number(sc * t / 10n);\n  }", 'payCents: exact integer floor of stake x tenths / 10 (no ride parameter)'),
    runDealerS17: has(g, "const drawsOn = c => { const t=totals(c); return t.best<17; };", 'Run Game dealer stands on all 17s (draws only below 17)'),
    runFeltLine: has(g, "$('tieTxt').textContent='DEALER STANDS ON 17';", 'Run Game felt line DEALER STANDS ON 17'),
    runPanelReturn: has(g, "WIN PAYS 2X <i>·</i> RETURNS 100.1%", 'Run Game panel RETURNS 100.1%'),
    runChoices: has(g, "if(soft) return t<=16?'hit':t<=18?'choice':'stand'; return hard<=11?'hit':hard<=16?'choice':'stand';", 'Run Game choices hard 12-16, soft 17-18'),
    runPushRedeal: has(g, "RUN.deal++;\n    return runDeal();", 'Run Game push deals again'),
    runWinDoubles: has(g, "const prize=cents(RUN.stake*2);", 'Run Game win = 2 x stake'),
    barMaxWinClip: has(g, "if(banked+held > MW){ held=cents(MW-banked); BUY.held=held; }", 'MAX WIN clip'),
    barDoubleOffer: has(g, "const canDbl = held>=MIN_RUN && banked+2*held <= MW+1e-9;", 'DOUBLE offered only if banked + 2 x held <= MW'),
    barHalf: has(g, "const hc=Math.round(held*100), half=Math.floor(hc/2)/100, keep=(hc-Math.floor(hc/2))/100;", 'half / keep in cents (odd cent kept)'),
    barRunCap: has(g, "if(total >= capRun()-0.005){ credit(total);", '1,000x run cap ends the round'),
    ammoFirstWin: has(g, "BUY.ammo=p;", 'ammo = the first win'),
    barDoubleHalfOffer: has(g, "const canDblH = half>=MIN_RUN && banked+keep+2*half <= MW+1e-9;", 'DOUBLE HALF offered only if half >= minimum and banked + keep + 2 x half <= MW'),
    barDoubleClick: has(g, "$('doubleBtn').onclick=()=>{ BUY.held=0; runGame(held); };", 'DOUBLE OR NOTHING runs all of held'),
    barDoubleHalfClick: has(g, "$('doubleHalfBtn').onclick=()=>{ BUY.banked=cents(banked+keep); BUY.held=0; runGame(half); };", 'DOUBLE HALF banks keep, runs half'),
    bankedBustReturn: has(g, "BUY.banked=0; BUY.held=amt;", 'a lost run brings the RUN BANK back as the held amount'),
    cashOutPaysAll: has(g, "$('cashOut').onclick=()=>{ credit(total); BUY.held=0; endToast('CASHED OUT'", 'CASH OUT pays banked + held in one credit'),
  };
  return C;
}
function deq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function check(USE, C = parse()) {
  const bad = Object.keys(USE).filter(k => !deq(USE[k], C[k]));
  if (bad.length) throw new Error('script constants differ from the build: ' + bad.map(k => `${k}: uses ${JSON.stringify(USE[k])}, build ${JSON.stringify(C[k])}`).join('; '));
  return C;
}
module.exports = { parse, check, FILE, gameScript };
if (require.main === module) console.log(JSON.stringify(parse(), null, 1));
