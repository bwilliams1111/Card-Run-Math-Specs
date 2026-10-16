#!/usr/bin/env python3
"""Card Run CRASH 20x -- exact math (rational arithmetic, no simulation), read from the FINAL build (run-bar v170: no RUN IT AGAIN, no RUN HALF).

usage (from inside labpack/crash/):  python3 -I exact.py            -> out/exact.json + out/exact.txt

1. Parses the money constants out of ../builds-final/card-run-crash-classic-launch.html (CFG.classic, the ladder recurrence,
   TABDEFS cap, MAX WIN, run cap, the race, the shoe and suit rules, the bet grid, the run bar's minimum run and version) and asserts
   they are the values this solver uses (run-bar v170: MIN_RUN 2 = $0.02, the smallest held amount DOUBLE OR NOTHING / DOUBLE HALF take).
   It also asserts the ride is GONE from the build text: no kMil / RIDE / rideK / startRide / bar-run / bar-runhalf / runIt / runHalf /
   leg.ride / P.ride / capC / runBase, no 'RUN IT AGAIN' or 'RUN HALF', and the ladder is the plain integer recurrence.
2. Base game: every LOCK IN stop at $1 / $10 / $100 (RTP, SD, hit rate, pay distribution), AUTO (no tap: the top red), a uniformly
   random stop, the whole $0.10 bet grid (best / worst), top pay and odds.
3. DOUBLE OR NOTHING (first to three, LOCK IN offers = floor(2 x amount x P(win)) per card), rounding to the cent at $1 / $10 / $100;
   the lowest LOCK IN offers and returns over SMALL amounts ($0.02-$0.99, reported apart from $1.00 and up), with a per-amount table
   of the lowest offer relative to fair (the DOUBLE OR NOTHING rows of the small-amount tables).
4. Run-bar policies P0, P2, P3, P5 after two build rules (lock1 = LOCK IN at red #1, auto = no tap, top red), at $1 / $10 / $100, by an
   exact model of the shipped flow (barEnter -> RunBar.compute -> startRun -> bankedBust -> endPaid / settle). P5 = DOUBLE HALF once
   (played out) has a closed form, derived independently below and asserted equal to the flow model. P4 (random choices) has no exact
   value: its reachable (held, RUN BANK) state graph exceeds 10^6 (counted to 3 x 10^6 with the ride gone); it is simulated only,
   with the proven bound P4 <= P0 (each run returns at most what it stakes on average, so the round's value is a supermartingale).
   P1 (RUN IT AGAIN once) was retired together with the ride.
"""
import json, os, re, sys, math, hashlib
from fractions import Fraction as F
from functools import lru_cache

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, '..', 'builds-final', 'card-run-crash-classic-launch.html')
html = open(BUILD, encoding='utf-8').read()
BUILD_SHA = hashlib.sha256(html.encode()).hexdigest()


# ------------------------------------------------------------------ 1. constants from the build text
def one(pattern, what, flags=0):
    m = re.findall(pattern, html, flags)
    assert len(m) == 1, f'{what}: expected exactly one match of {pattern!r}, got {len(m)}'
    return m[0]

C = {}
C['rBp'], C['opening'] = one(r"classic:\{id:'classic',rBp:(\d+),opening:(true|false)\}", 'CFG.classic'); C['rBp'] = int(C['rBp']); C['opening'] = C['opening'] == 'true'
C['ladder_base_den'] = int(one(r"let num=BigInt\(cfg\.rBp\)\*BigInt\(S\), den=(\d+)n;", 'ladder base'))
C['step_num'], C['step_den'] = map(int, one(r"for\(let k=1;k<j;k\+\+\)\{ num\*=(\d+)n;den\*=(\d+)n; \}", 'ladder step'))
C['ladder_floor'] = one(r"const v=(Number\(num/den\)); ladderCache\.set", 'ladder floor (BigInt division)') == 'Number(num/den)'
C['cap_x'], C['build_x'] = None, None
x, cap = one(r"\{id:'classic',name:'[^']*',x:(\d+),cap:(\d+),defStake:\d+\}", 'TABDEFS classic'); C['build_x'], C['cap_x'] = int(x), int(cap)
C['MAX_WIN_X'] = int(one(r"const MAX_WIN_X = (\d+);", 'MAX_WIN_X'))
C['OPERATOR_MAX_WIN_X'] = one(r"const OPERATOR_MAX_WIN_X = (\w+);", 'OPERATOR_MAX_WIN_X')
C['RUN_CAP_X'] = int(one(r"const RUN_CAP_X=(\d+);", 'RUN_CAP_X'))
C['race_to'] = int(one(r"const raceP=\(r,b\)=> r>=(\d)\?1 : b>=\d\?0 : \(raceP\(r\+1,b\)\+raceP\(r,b\+1\)\)/2;", 'raceP'))
C['race_offer'] = one(r"R\.offer=(Math\.floor\(2\*R\.amount\*raceP\(R\.reds,R\.blacks\)\));", 'race offer') != ''
C['race_win'] = one(r"if\(R\.reds===3\)\{ R\.state='won'; R\.holding=(2)\*R\.amount;", 'race win')
C['decks'] = int(one(r"const D=(\d+), SHOE=52\*D,", 'decks'))
C['draw'] = one(r"const s=\(x%SHOE\)%52;return \{id:\+\+CID,suit:(Math\.floor\(s/13\)),rank:s%13\}", 'drawCard')
C['red'] = one(r"const isRed=c=>c\.suit(>=2);", 'isRed')
C['cat'] = one(r"const cat=c=>(c\.suit===0\?'C':c\.suit===1\?'S':'R');", 'cat')
C['bust'] = one(r"function isBust\(leg,c\)\{\n  if\(cat\(c\)==='R'\|\|!leg\.prev\)return false;\n  if\(leg\.cfg\.opening&&!leg\.seenRed\)return false;\n  return (cat\(c\)===cat\(leg\.prev\));\n\}", 'isBust')
C['TABLE_MIN'], C['TABLE_MAX'], C['BET_STEP'] = map(int, one(r"const TABLE_MIN=(\d+), TABLE_MAX=(\d+), BET_STEP=(\d+);", 'bet grid'))
C['MIN_RUN'], C['bar_cap_x'] = map(int, one(r"var MIN_RUN = (\d+), CAP_X = (\d+);", 'run bar MIN_RUN / CAP_X'))
C['run_bar_version'] = one(r"money: function \(x\) \{ return money\(c\(x\)\); \}, version: '(\d+)' \};", 'run-bar module version')
C['capped_rule'] = one(r"if\((leg\.buy\.paid\+\(leg\.buy\.kept\|\|0\)\+\(leg\.buy\.runBanked\|\|0\)\+riding\(leg\)>=leg\.buy\.cap)\)\{ leg\.state='capped'; \}", 'legDeal top-red rule') != ''
C['bar_double_only'] = one(r"(\{cashOut:\(\)=>act\('bar-cash'\),double:\(\)=>act\('bar-double'\),doubleHalf:\(\)=>act\('bar-doublehalf'\),)", 'run bar handlers: cashOut / double / doubleHalf only') != ''
C['bar_acts'] = sorted(re.findall(r"case '(bar-[a-z]+)'", html))
C['runbar_show_keys'] = one(r"var show = \{\n      double: (S >= MIN_RUN && B \+ 2 \* S <= MW),\n      doubleHalf: (half >= MIN_RUN && B \+ keep \+ 2 \* half <= MW)\n    \};", 'RunBar.compute show.double / show.doubleHalf')
C['runbar_cash_only'] = one(r"(show\.cashOutOnly = !show\.double && !show\.doubleHalf;)", 'RunBar.compute cashOutOnly')
# the ride is gone: none of these may appear anywhere in the build text (the logo alt text 'BUILD IT. RUN IT.' is the one 'RUN IT' allowed)
GONE = ['kMil', 'RIDE', 'rideK', 'rideBase', 'startRide', 'bar-runhalf', "act('bar-run')", 'runIt', 'runHalf', 'leg.ride', 'P.ride', 'pending.ride', 'ride:', 'capC=', 'leg.capC', 'runBase',
        'RUN IT AGAIN', 'RUN HALF', 'PAYS ×', "kind:'ride'", 'K_RIDE', 'kNum', 'kDen']
BANNER = ' * Card Run · RUN BAR reference module · v170 (v170: RUN IT AGAIN and RUN HALF removed for certification'   # the embedded run-bar v170 banner (verbatim module text) says so once
assert html.count(BANNER) == 1 and html.count('RUN IT AGAIN') == 1 and html.count('RUN HALF') == 1
html_chk = html.replace(BANNER, ' * (banner)')
C['ride_gone'] = [g for g in GONE if g in html_chk]
html_no_logo = re.sub(r'BUILD IT\. RUN IT\. logo', 'logo', re.sub(r'alt="BUILD IT\. RUN IT\."', 'alt="LOGO"', re.sub(r"data:image/webp;base64,[A-Za-z0-9+/=]+", 'data:IMG', html_chk)))   # the logo alt text and the logo code comment are the only allowed 'RUN IT's
C['run_it_hits_outside_logo_alt'] = sorted(set(m.group(0) for m in re.finditer(r"run it[^<>\n]{0,24}", html_no_logo, re.I)))
C['buy_cap'] = one(r"(cap:Math\.min\(tdef\(tid\)\.cap\*S,maxWinC\(S\)\))", 'round cap') != ''
EXPECT = {'rBp': 9300, 'opening': True, 'ladder_base_den': 10000, 'step_num': 6, 'step_den': 5, 'ladder_floor': True, 'build_x': 20, 'cap_x': 20,
          'MAX_WIN_X': 20000, 'OPERATOR_MAX_WIN_X': 'MAX_WIN_X', 'RUN_CAP_X': 1000, 'race_to': 3, 'race_offer': True,
          'race_win': '2', 'decks': 8, 'draw': 'Math.floor(s/13)', 'red': '>=2', 'cat': "c.suit===0?'C':c.suit===1?'S':'R'", 'bust': 'cat(c)===cat(leg.prev)',
          'TABLE_MIN': 100, 'TABLE_MAX': 10000, 'BET_STEP': 10, 'MIN_RUN': 2, 'bar_cap_x': 1000, 'run_bar_version': '170', 'capped_rule': True, 'bar_double_only': True, 'bar_acts': ['bar-cash', 'bar-double', 'bar-doublehalf'],
          'runbar_show_keys': ('S >= MIN_RUN && B + 2 * S <= MW', 'half >= MIN_RUN && B + keep + 2 * half <= MW'), 'runbar_cash_only': 'show.cashOutOnly = !show.double && !show.doubleHalf;', 'ride_gone': [],
          'run_it_hits_outside_logo_alt': ['Run it'], 'buy_cap': True}
for k, v in EXPECT.items():
    assert C[k] == v, f'constant {k}: build has {C[k]!r}, solver uses {v!r}'
assert C['bar_cap_x'] == C['RUN_CAP_X']
assert re.search(r"let num=BigInt\(cfg\.rBp\)\*BigInt\(S\), den=10000n;\n  for\(let k=1;k<j;k\+\+\)\{ num\*=6n;den\*=5n; \}\n  const v=Number\(num/den\)", html), 'ladder is the plain integer recurrence'
RBP, STEP = C['rBp'], F(C['step_num'], C['step_den'])
MIN_RUN, CAPX, MWX, BUILDCAP = C['MIN_RUN'], C['RUN_CAP_X'], C['MAX_WIN_X'], C['cap_x']

# ------------------------------------------------------------------ 2. card model (from the parsed rules)
# drawCard: x uniform on [0, LIM) with LIM a multiple of 416 -> s=(x%416)%52 uniform on 0..51 -> suit=floor(s/13) uniform on 0..3;
# suits 2,3 red (p=1/2), 0 clubs (1/4), 1 spades (1/4). Bust: a black card whose suit equals the previous card's suit, once a red has
# been seen. From a red, the chance the next red comes before a bust: a(R)=1/2+1/4 a(C)+1/4 a(S), a(C)=1/2+1/4 a(S), a(S)=1/2+1/4 a(C).
aC = F(2, 3); aR = F(1, 2) + F(1, 4) * aC * 2
assert aC == F(1, 2) + F(1, 4) * aC and aR == F(5, 6)
P_NEXT = aR                                   # red j -> red j+1
def reach(j): return P_NEXT ** (j - 1)        # red #1 is always reached (nothing busts before the first red)

def L(S, j):                                  # ladder(cfg,S,j): floor(rBp*S*6^(j-1)/(10000*5^(j-1)))
    num, den = RBP * S, C['ladder_base_den']
    num *= C['step_num'] ** (j - 1); den *= C['step_den'] ** (j - 1)
    return num // den

def maxwin(S): return MWX * S
def top_rung(S): # capRung(cfg,S,buy.cap): first red whose pay reaches the round cap min(20 x bet, MAX WIN)
    cap = min(BUILDCAP * S, maxwin(S)); j = 1
    while L(S, j) < cap and j < 400: j += 1
    return j

STAKES = [100, 1000, 10000]
GRID = list(range(C['TABLE_MIN'], C['TABLE_MAX'] + 1, C['BET_STEP']))
out = {'build': os.path.relpath(BUILD, HERE), 'build_sha256': BUILD_SHA, 'constants_parsed': C, 'p_next_red': str(P_NEXT)}

def dist_stats(pays, S):
    """pays: {cents: prob} -> rtp, sd, hit (pay>0), win (pay>bet), in x bet"""
    m = sum(p * F(v, S) for v, p in pays.items()); m2 = sum(p * F(v, S) ** 2 for v, p in pays.items())
    return {'rtp': float(m), 'rtp_exact': str(m), 'sd': math.sqrt(float(m2 - m * m)), 'hit': float(sum(p for v, p in pays.items() if v > 0)),
            'win_freq': float(sum(p for v, p in pays.items() if v > S))}

# ------------------------------------------------------------------ base game
base = {}
for S in STAKES:
    T = top_rung(S); rows = []
    for j in range(1, T + 1):
        p = reach(j); d = {L(S, j): p, 0: 1 - p}; st = dist_stats(d, S)
        rows.append({'red': j, 'pays_cents': L(S, j), 'x_bet': L(S, j) / S, 'nominal_x': float(F(RBP, 10000) * STEP ** (j - 1)), 'p_reach': float(p), 'one_in': float(1 / p), **st})
    uni = {}
    for j in range(1, T + 1):
        uni[L(S, j)] = uni.get(L(S, j), 0) + F(1, T) * reach(j)
    uni[0] = 1 - sum(uni.values())
    best = max(rows, key=lambda r: r['rtp']); worst = min(rows, key=lambda r: r['rtp'])
    base[S] = {'top_red': T, 'stops': rows, 'best_stop': {'red': best['red'], 'rtp': best['rtp']}, 'worst_stop': {'red': worst['red'], 'rtp': worst['rtp']},
               'auto_no_tap': rows[-1], 'uniform_random_stop': {**dist_stats(uni, S), 'pay_distribution_x': {str(v / S): float(p) for v, p in sorted(uni.items())}},
               'top_pay_x': rows[-1]['x_bet'], 'top_pay_one_in': rows[-1]['one_in'], 'nominal_rtp_every_stop': RBP / 10000}
out['base'] = base
# the whole bet grid ($1.00 .. $100.00 in $0.10 steps)
g_best = g_worst = None; g_tops = set(); g_auto = []
for S in GRID:
    T = top_rung(S); g_tops.add(T)
    for j in range(1, T + 1):
        r = reach(j) * F(L(S, j), S)
        if g_worst is None or r < g_worst[0]: g_worst = (r, S, j)
        if g_best is None or r > g_best[0]: g_best = (r, S, j)
    g_auto.append(reach(T) * F(L(S, T), S))
out['bet_grid'] = {'bets': f'{GRID[0]}..{GRID[-1]} cents step {C["BET_STEP"]} ({len(GRID)} bets)', 'top_red_values': sorted(g_tops),
                   'worst': {'rtp': float(g_worst[0]), 'bet_cents': g_worst[1], 'red': g_worst[2]}, 'best': {'rtp': float(g_best[0]), 'bet_cents': g_best[1], 'red': g_best[2]},
                   'auto_min': float(min(g_auto)), 'auto_max': float(max(g_auto)), 'auto_mean_over_grid': float(sum(g_auto) / len(g_auto)),
                   'mean_over_grid_and_stops': float(sum(reach(j) * F(L(S, j), S) for S in GRID for j in range(1, top_rung(S) + 1)) / sum(top_rung(S) for S in GRID))}

# ------------------------------------------------------------------ DOUBLE OR NOTHING (first to three)
@lru_cache(None)
def rP(r, b):
    if r >= C['race_to']: return F(1)
    if b >= C['race_to']: return F(0)
    return (rP(r + 1, b) + rP(r, b + 1)) / 2
def offer(R, r, b): p = rP(r, b); return (2 * R * p.numerator) // p.denominator
def race_ev(R, lockfn):
    @lru_cache(None)
    def V(r, b, n):
        if r >= 3: return F(2 * R)
        if b >= 3: return F(0)
        if n > 0 and lockfn(r, b): return F(offer(R, r, b))
        return (V(r + 1, b, n + 1) + V(r, b + 1, n + 1)) / 2
    return V(0, 0, 0) / R
dbl = {'P_three_reds_first': {f'{r}-{b}': str(rP(r, b)) for r in range(3) for b in range(3)}, 'played_out_rtp': float(2 * rP(0, 0)), 'by_amount': {}}
for R in [2, 3, 10, 46, 93, 100, 930, 2063, 9300, 20633, 206330]:
    dbl['by_amount'][R] = {'lock_first_card': float(race_ev(R, lambda r, b: True)), 'lock_when_ahead': float(race_ev(R, lambda r, b: r > b)), 'played_out': float(race_ev(R, lambda r, b: False))}
def dbl_worst(lo, hi):
    wd = min((race_ev(R, lambda r, b: True), R) for R in range(lo, hi + 1))
    return {'rtp': float(wd[0]), 'rtp_exact': str(wd[0]), 'amount_cents': wd[1], 'offers_cents': {'1-0': offer(wd[1], 1, 0), '0-1': offer(wd[1], 0, 1)}}
def offer_worst(lo, hi):   # the single LOCK IN offer furthest below its fair value 2 x amount x P(win), over every score a LOCK IN is shown at
    o = min((F(offer(R, r, b)) / (2 * R * rP(r, b)), R, f'{r}-{b}', offer(R, r, b)) for R in range(lo, hi + 1) for r in range(3) for b in range(3) if r + b > 0)
    return {'offer_over_fair': float(o[0]), 'amount_cents': o[1], 'score_r_b': o[2], 'offer_cents': o[3], 'fair_cents': float(2 * o[1] * rP(*map(int, o[2].split('-'))))}
dbl['worst_lock_first_card_small_amount_2_to_99_cents'] = dbl_worst(MIN_RUN, 99)
dbl['worst_lock_first_card_100_to_3000_cents'] = dbl_worst(100, 3000)
dbl['worst_single_offer_small_amount_2_to_99_cents'] = offer_worst(MIN_RUN, 99)
dbl['worst_single_offer_100_to_3000_cents'] = offer_worst(100, 3000)
def offer_worst_at(R):   # the single offer furthest below fair at ONE amount (over the scores a LOCK IN is shown at), and the lowest offer in cents
    cand = [(F(offer(R, r, b)) / (2 * R * rP(r, b)), f'{r}-{b}') for r in range(3) for b in range(3) if r + b > 0]
    w = min(cand)
    offs = {f'{r}-{b}': offer(R, r, b) for r in range(3) for b in range(3) if r + b > 0}
    return {'worst_offer_over_fair': float(w[0]), 'worst_score': w[1], 'worst_offer_cents': offs[w[1]], 'lowest_offer_cents': min(offs.values()), 'lowest_offer_at': sorted(k for k, v in offs.items() if v == min(offs.values())),
            'lock_first_card_rtp': float(race_ev(R, lambda r, b: True)), 'offers_cents': offs}
dbl['small_amounts_per_amount'] = {R: offer_worst_at(R) for R in range(MIN_RUN, 100)}          # $0.02 .. $0.99, every amount
dbl['small_amounts_lowest_offer_table'] = {R: dbl['small_amounts_per_amount'][R] for R in [2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 46, 50, 93, 99]}
dbl['amounts_with_a_zero_offer'] = sorted(R for R in range(MIN_RUN, 3001) if any(offer(R, r, b) == 0 for r in range(3) for b in range(3) if r + b > 0))
dbl['zero_offers_small_amounts'] = [f'{R}c at {r}-{b}' for R in range(MIN_RUN, 100) for r in range(3) for b in range(3) if r + b > 0 and offer(R, r, b) == 0]
out['double'] = dbl

# ------------------------------------------------------------------ rounding effect
out['rounding'] = {str(S): {'base_stops_rtp_min': base[S]['worst_stop']['rtp'], 'base_stops_rtp_max': base[S]['best_stop']['rtp'], 'base_auto': base[S]['auto_no_tap']['rtp'],
                            'base_nominal': RBP / 10000, 'double_lock_first_card_on_lock1_win': dbl['by_amount'].get(L(S, 1), {}).get('lock_first_card')} for S in STAKES}

# ------------------------------------------------------------------ 4. run-bar policies (exact model of the shipped flow)
def policy_value(S, build, pol):
    """exact pay distribution (cents -> probability) for build rule `build` and run-bar policy pol in P0, P2, P3, P5"""
    MW = maxwin(S)
    if build == 'lock1': starts = [(L(S, 1), F(1))]
    else: T = top_rung(S); starts = [(L(S, T), reach(T))]
    dist = {}
    def add(v, p): dist[v] = dist.get(v, 0) + p
    def bar(H, B, A0, used, p):                              # barEnter -> RunBar.compute (clip to MAX WIN, MAX WIN, 1,000x run cap, show.double / show.doubleHalf)
        Sx = H
        if B + Sx > MW: Sx = MW - B                         # MAX WIN clips
        total = B + Sx
        if total >= MW or total >= CAPX * A0: return add(total, p)   # MAX WIN / 1,000x run: paid at once
        half = Sx // 2; keep = Sx - half
        show = {'double': Sx >= MIN_RUN and B + 2 * Sx <= MW, 'doublehalf': half >= MIN_RUN and B + keep + 2 * half <= MW}
        a = 'cash'
        if pol == 'P2' and not used and show['double']: a = 'double'
        elif pol == 'P3' and show['double']: a = 'double'
        elif pol == 'P5' and not used and show['doublehalf']: a = 'doublehalf'
        if a == 'cash': return add(total, p)
        if a == 'double': return race_(Sx, B, A0, p)
        return race_(half, B + keep, A0, p)                 # DOUBLE HALF: half runs, the other half (and an odd cent) goes to the RUN BANK
    def lost(B, A0, p):
        if B > 0: bar(B, 0, A0, True, p)                    # bankedBust: the RUN BANK comes back as held
        else: add(0, p)
    def race_(R, B, A0, p):                                 # played out: three reds first doubles (exactly 1/2)
        bar(2 * R, B, A0, True, p * rP(0, 0)); lost(B, A0, p * (1 - rP(0, 0)))
    for A, pA in starts:
        bar(A, 0, A, False, pA)
        if pA != 1: add(0, 1 - pA)
    tot = sum(dist.values()); assert tot == 1, tot
    return dist
def p5_closed_form(S, build):
    """P5 = DOUBLE HALF once: at a held amount H (>= 4 cents, so half >= 2) the round pays keep + 2 half = H + half w.p. 1/2 (the double wins) and keep = H - half w.p. 1/2
    (the double loses and the RUN BANK comes back, then CASH OUT): mean exactly H, nothing rounds (a double is exact), nothing caps at these sizes. Below 4 cents: CASH OUT H."""
    H, pH = (L(S, 1), F(1)) if build == 'lock1' else (L(S, top_rung(S)), reach(top_rung(S)))
    assert pH * 2 * H < maxwin(S) and 2 * H < CAPX * H
    d = {0: 1 - pH} if pH != 1 else {}
    if H // 2 >= MIN_RUN:
        half = H // 2; keep = H - half
        for v in (keep + 2 * half, keep): d[v] = d.get(v, 0) + pH * F(1, 2)
    else: d[H] = d.get(H, 0) + pH
    return d
pols = {}
for S in STAKES:
    for build in ['lock1', 'auto']:
        P0 = None
        for pol in ['P0', 'P2', 'P3', 'P5']:
            d = policy_value(S, build, pol); st = dist_stats(d, S); mx = max(v for v in d if d[v] > 0)
            pols[f'{S}_{build}_{pol}'] = {**st, 'max_pay_x': mx / S, 'p_max_pay': float(d[mx]), 'n_outcomes': len(d),
                                          'pay_distribution_cents': {str(v): str(p) for v, p in sorted(d.items())} if len(d) <= 6 else None}
            if pol == 'P0': P0 = st['rtp']; P0_exact = st['rtp_exact']
            if pol == 'P5':
                cf = p5_closed_form(S, build); assert {v: p for v, p in d.items() if p} == {v: p for v, p in cf.items() if p}, (S, build, d, cf)
                assert st['rtp_exact'] == P0_exact          # DOUBLE HALF once keeps the mean exactly: P5 == P0
                pols[f'{S}_{build}_P5']['closed_form_equals_model'] = True
        pols[f'{S}_{build}_P4'] = {'rtp': None, 'exact': 'not computed (state graph > 10^6 states)', 'upper_bound_rtp': P0}
out['policies'] = pols
out['policy_definitions'] = {
    'build lock1': 'LOCK IN at red #1 (pays 0.93x bet, always reached)', 'build auto': 'never tap LOCK IN: AUTO DEAL runs to the top red (#18, 20.63x) or a bust',
    'P0': 'CASH OUT at the first run bar', 'P1': 'RETIRED (was RUN IT AGAIN once; removed with the ride in v170)',
    'P2': 'DOUBLE OR NOTHING once, played out (no LOCK IN), then CASH OUT', 'P3': 'DOUBLE OR NOTHING while it is shown (until the 1,000x run cap, MAX WIN, or a bust), then CASH OUT',
    'P4': 'random: at every bar CASH OUT w.p. 1/3, else a uniformly random shown run button (DOUBLE OR NOTHING / DOUBLE HALF); LOCK IN w.p. 1/3 at each race card',
    'P5': 'DOUBLE HALF once (half doubles, played out; the other half and any odd cent go to the RUN BANK; a lost double brings the RUN BANK back as the bar: CASH OUT), then CASH OUT. NEW definition (v169: RUN HALF once)'}

os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
json.dump(out, open(os.path.join(HERE, 'out', 'exact.json'), 'w'), indent=1, default=str)
with open(os.path.join(HERE, 'out', 'exact.txt'), 'w') as f:
    def pr(*a): print(*a); print(*a, file=f)
    pr('build', out['build'], 'sha256', BUILD_SHA); pr('constants parsed and asserted:', json.dumps(C))
    for S in STAKES:
        b = base[S]; pr(f"\nBASE ${S/100:.2f}: top red #{b['top_red']} {b['top_pay_x']:.4f}x 1 in {b['top_pay_one_in']:.3f} | best stop #{b['best_stop']['red']} {b['best_stop']['rtp']*100:.4f}% | worst #{b['worst_stop']['red']} {b['worst_stop']['rtp']*100:.4f}% | uniform random {b['uniform_random_stop']['rtp']*100:.4f}% sd {b['uniform_random_stop']['sd']:.4f}")
        for r in b['stops']: pr(f"   red #{r['red']:2d} pays {r['pays_cents']:7d}c {r['x_bet']:8.4f}x reach {r['p_reach']:.6f} (1 in {r['one_in']:7.3f})  RTP {r['rtp']*100:8.4f}%  SD {r['sd']:7.4f}  hit {r['hit']:.6f}  win {r['win_freq']:.6f}")
    pr('\nBET GRID', json.dumps(out['bet_grid']))
    pr('\nDOUBLE', json.dumps(dbl['P_three_reds_first']), 'played out', dbl['played_out_rtp'])
    for k, v in dbl['by_amount'].items(): pr('  ', k, json.dumps(v))
    pr('  worst lock-first $0.02-$0.99', json.dumps(dbl['worst_lock_first_card_small_amount_2_to_99_cents']), '| $1.00-$30.00', json.dumps(dbl['worst_lock_first_card_100_to_3000_cents']))
    pr('  worst single offer $0.02-$0.99', json.dumps(dbl['worst_single_offer_small_amount_2_to_99_cents']), '| $1.00-$30.00', json.dumps(dbl['worst_single_offer_100_to_3000_cents']))
    pr('  zero offers', json.dumps(dbl['zero_offers_small_amounts']), '| amounts $0.02-$30.00 with a $0.00 offer (cents):', json.dumps(dbl['amounts_with_a_zero_offer']))
    pr('  per amount, $0.02-$0.99: lowest offer / worst offer relative to fair / DOUBLE OR NOTHING LOCK IN at the first card')
    for R, v in dbl['small_amounts_per_amount'].items(): pr(f"   {R:3d}c  lowest offer {v['lowest_offer_cents']:3d}c at {','.join(v['lowest_offer_at'])}  worst vs fair {v['worst_offer_over_fair']*100:7.2f}% ({v['worst_score']}: {v['worst_offer_cents']}c)  lock-first RTP {v['lock_first_card_rtp']*100:7.3f}%")
    pr('\nROUNDING', json.dumps(out['rounding'], indent=1))
    pr('\nrun bar: acts', json.dumps(C['bar_acts']), '| ride gone:', json.dumps(C['ride_gone']), '| remaining case-insensitive run it hits:', json.dumps(C['run_it_hits_outside_logo_alt']))
    pr('\nPOLICIES (exact; P5 closed form asserted equal to the flow model)')
    for k, v in pols.items(): pr(f"  {k:16s} " + (f"RTP {v['rtp']*100:9.5f}%  SD {v['sd']:9.4f}  hit {v['hit']:.6f}  max {v['max_pay_x']:.3f}x (p {v['p_max_pay']:.3e})" if v.get('rtp') is not None else json.dumps(v)))
