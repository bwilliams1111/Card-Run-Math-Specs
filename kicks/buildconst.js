// Reads the game's constants straight from the final build text (../builds-final/...) so the bots use the shipped values.
'use strict';
const fs = require('fs'), path = require('path');
const FILE = path.join(__dirname, '..', 'builds-final', 'card-run-kicks-classic-launch.html');
const html = fs.readFileSync(FILE, 'utf8');
const game = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(t => t.includes('function offerState'));
const one = (re, what) => { const m = game.match(re); if (!m) throw new Error('constant not found: ' + what); return m[1]; };
const arr = t => t.split(',').map(Number);
const strs = t => [...t.matchAll(/'([^']*)'/g)].map(m => m[1]);
const C = {
  PAY_CLASSIC: arr(one(/const PAY_CLASSIC=\[([^\]]*)\]/, 'PAY_CLASSIC')),
  LADDER_CLASSIC: arr(one(/const LADDER_CLASSIC=\[([^\]]*)\]/, 'LADDER_CLASSIC')),
  CL_KICKS: +one(/[ ,]CL_KICKS=(\d+)/, 'CL_KICKS'),
  RANKS: strs(one(/const RANKS=\[([^\]]*)\]/, 'RANKS')),
  SUITS: strs(one(/const SUITS=\[([^\]]*)\]/, 'SUITS')),
  GOAL: strs(one(/const GOAL=new Set\(\[([^\]]*)\]\)/, 'GOAL')),
  POST: strs(one(/const POST=new Set\(\[([^\]]*)\]\)/, 'POST')),
};
module.exports = C;
if (require.main === module) console.log(JSON.stringify(C));
