// node run-bar.test.js   — checks RunBar.compute against the v152 prototype's check values (GR-RUN §4–§5, kick-off §2)
// v170: RUN IT AGAIN and RUN HALF removed; CASH OUT, DOUBLE OR NOTHING, DOUBLE HALF remain. Minimum $0.02: the boundary cases sit at 1-5 cents
'use strict';
const R=require('./run-bar.js'); let fail=0;
const T=(name,st,exp)=>{ const r=R.compute(st); const got={mode:r.mode};
  if(r.mode==='bar'){ Object.assign(got,{N:r.nMax, half:r.half/100, keep:r.keep/100, cash:r.total/100, double:r.show.double, doubleHalf:r.show.doubleHalf, halfPill:r.show.halfPill, cashOutOnly:r.show.cashOutOnly, line:r.copy.doubleLine}); }
  else got.total=r.total/100;
  const bad=Object.keys(exp).filter(k=>JSON.stringify(got[k])!==JSON.stringify(exp[k]));
  console.log((bad.length?'FAIL ':'ok   ')+name+(bad.length?'  expected '+JSON.stringify(exp)+' got '+JSON.stringify(got):'')); if(bad.length) fail++; };
const MW=100000;
T('fresh $20',            {held:20,banked:0,ammo:20,maxWin:MW},        {mode:'bar',N:10,half:10,keep:10,double:true,doubleHalf:true,cash:20,line:'10 DOUBLES MAX'});
T('odd cent $11.23',      {held:11.23,banked:0,ammo:11.23,maxWin:MW},  {N:10,half:5.61,keep:5.62,cash:11.23});
T('RUN BANK 50 + 100',    {held:100,banked:50,ammo:100,maxWin:MW},     {N:9,half:50,keep:50,cash:150});
T('1,000x vault, MW 5k×', {held:10000,banked:0,ammo:10000,maxWin:50000},{N:2,double:true,doubleHalf:true});
T('DOUBLE hidden by MW',  {held:60000,banked:0,ammo:100,maxWin:MW},    {N:1,double:false,doubleHalf:true,cash:60000});
T('$7 → 10 doubles',      {held:7,banked:0,ammo:7,maxWin:MW},          {N:10,half:3.5,keep:3.5});
T('DOUBLE HALF won',      {held:21.34,banked:10,ammo:20,maxWin:MW},    {N:10,half:10.67,keep:10.67,cash:31.34});
T('$0.03: no half pill',  {held:0.03,banked:0,ammo:1,maxWin:MW},       {halfPill:false,double:true,cashOutOnly:false});
T('$0.01: CASH OUT only', {held:0.01,banked:0,ammo:1,maxWin:MW},       {cashOutOnly:true,halfPill:false});
T('$0.02: doubles, no half',{held:0.02,banked:0,ammo:1,maxWin:MW},     {cashOutOnly:false,double:true,halfPill:false});
T('CASH OUT only at MAX',  {held:99999,banked:0,ammo:20000,maxWin:MW},  {cashOutOnly:true,double:false,doubleHalf:false});
{ const r=R.compute({held:20,banked:0,ammo:20,maxWin:MW}); const bad=['runIt','runHalf'].filter(k=>k in r.show||k in r.copy); console.log((bad.length?'FAIL ':'ok   ')+'no RUN IT AGAIN / RUN HALF in the bar'+(bad.length?' '+bad:'')); if(bad.length) fail++; }
T('$0.04: half pill on',  {held:0.04,banked:0,ammo:1,maxWin:MW},       {half:0.02,keep:0.02,halfPill:true,doubleHalf:true});
T('$0.05: odd cent kept', {held:0.05,banked:0,ammo:1,maxWin:MW},       {half:0.02,keep:0.03,halfPill:true});
T('last double',          {held:10240,banked:0,ammo:20,maxWin:MW},     {N:1,line:'1 DOUBLE MAX'});
T('MAX WIN clips + pays', {held:40,banked:20,ammo:20,maxWin:50},       {mode:'max_win',total:50});
T('1,000× run cap',       {held:20480,banked:0,ammo:20,maxWin:MW},     {mode:'run_cap',total:20480});
T('cap crossing w/ bank', {held:20000,banked:10,ammo:20,maxWin:MW},    {mode:'run_cap',total:20010});
console.log(fail?fail+' FAILED':'all passed'); process.exit(fail?1:0);
