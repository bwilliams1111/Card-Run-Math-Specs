#!/usr/bin/env python3
"""KICKS 20× lab pack — EXACT math, read from the final build.

Reads ../builds-final/card-run-kicks-classic-launch.html, PARSES every constant the math depends on (paytable, Posts Bonus ladder,
kicks per game, shoe / deck composition, Run Game shots, minimum run, 1,000× run cap, MAX WIN, bet grid, the amt() rounding
formula, the run bar's DOUBLE / DOUBLE HALF rules) and ASSERTS they equal the values used below; it also asserts that the
RUN IT AGAIN / RUN HALF code is gone from the build (v170: the bar is CASH OUT, DOUBLE OR NOTHING, DOUBLE HALF). Then, in exact
rational arithmetic (fractions.Fraction):
  * base game RTP for best play (opt), the shoe-count caller (counter: the side with more cards left, tie GOAL), random calls, worst
    play; SD, hit rate, the full pay distribution (total multiple, probability, 1 in N, contribution), right-call distribution,
    Posts Bonus statistics, top pay and its odds;
  * DOUBLE OR NOTHING: P(win) from the Run Game deck and shot rules (exactly 1/2) -> RTP 100%;
  * rounding effect at $1 / $10 / $100 on the base game (none: every pay is a whole number of cents on the $0.10 bet grid);
  * run-bar policies P0, P2, P3, P4, P5 at $1 / $10 / $100 (mean, SD, hit rate of the round payout): P0 cash out, P2 DOUBLE once,
    P3 double while offered (to the cap / MAX WIN), P5 DOUBLE HALF once: exact fractions; P4 (cash out 1/3, else uniform over the
    DOUBLE / DOUBLE HALF buttons shown): forward propagation over bar states in double precision, cut at a per-state probability
    (default 1e-15, --p4-eps). P1 (RUN IT AGAIN once) is retired with the mechanic.
  Every bar action is exactly fair in whole cents (DOUBLE and DOUBLE HALF win 1/2 for 2x the amount run, offered only when they cannot
  be clipped by MAX WIN; the 1,000x cap pays in full), so a bar state worth W = RUN BANK + held is worth exactly W (a bounded martingale
  with a certain stop): the RTP of EVERY policy equals the base RTP exactly, P4 included (asserted against the P4 propagation to 1e-10,
  whose dropped tail is valued at W). Only the SD and hit rate differ; P4's are computed with rigorous bounds for the dropped tail.
Board play in policies = best play (ties -> GOAL, as the simulation bot). Writes out/exact.json.
Usage (from inside labpack/kicks):  python3 -I exact_kicks.py [--p4-eps 1e-15]
"""
import re, os, sys, json, math, time, resource, bisect
from fractions import Fraction as F
from functools import lru_cache
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, '..', 'builds-final', 'card-run-kicks-classic-launch.html')
T0 = time.time()
P4_EPS = float(sys.argv[sys.argv.index('--p4-eps') + 1]) if '--p4-eps' in sys.argv else 1e-15   # P4 per-state probability cut (default 1e-15)

# ------------------------------------------------------------------------------------------------ 1. parse the build
html = open(BUILD, encoding='utf-8').read()
scripts = re.findall(r'<script>([\s\S]*?)</script>', html)
game = [t for t in scripts if 'function offerState' in t][0]
runbar = [t for t in scripts if 'root.RunBar = factory()' in t][0]
def one(src, rx, what):
    m = re.findall(rx, src)
    if len(m) != 1: sys.exit(f'PARSE FAIL {what}: {len(m)} matches')
    return m[0]
nums = lambda t: [F(x) for x in t.split(',')]
strs = lambda t: re.findall(r"'([^']*)'", t)
P = {
    'PAY_CLASSIC': nums(one(game, r'const PAY_CLASSIC=\[([^\]]*)\]', 'PAY_CLASSIC')),
    'LADDER_CLASSIC': nums(one(game, r'const LADDER_CLASSIC=\[([^\]]*)\]', 'LADDER_CLASSIC')),
    'CL_KICKS': int(one(game, r'[ ,]CL_KICKS=(\d+)', 'CL_KICKS')),
    'RUN_SHOTS': int(one(game, r'[ ,]RUN_SHOTS=(\d+)', 'RUN_SHOTS')),
    'RUN_TO': int(one(game, r'[ ,]RUN_TO=(\d+)', 'RUN_TO')),
    'TRIGGER': int(one(game, r'[ ,]TRIGGER=(\d+)', 'TRIGGER')),
    'MINRUN': F(one(game, r'[ ,]MINRUN=([\d.]+)', 'MINRUN')),
    'MAX_WIN_X': int(one(game, r'const MAX_WIN_X = (\d+);', 'MAX_WIN_X')),
    'OPERATOR_MAX_WIN_X': one(game, r'const OPERATOR_MAX_WIN_X = (\w+);', 'OPERATOR_MAX_WIN_X'),
    'MW_X': one(game, r'const MW_X=(Math\.min\(MAX_WIN_X,OPERATOR_MAX_WIN_X\));', 'MW_X'),
    'CAP_X_game': int(one(game, r'const capNow=\(\)=>(\d+)\*\(S\.ammo\|\|BET\);', 'capNow')),
    'HEAD': int(one(game, r'const HEAD=\{classic:(\d+)\};', 'HEAD')),
    'RANKS': strs(one(game, r'const RANKS=\[([^\]]*)\]', 'RANKS')),
    'SUITS': strs(one(game, r'const SUITS=\[([^\]]*)\]', 'SUITS')),
    'GOAL': strs(one(game, r'const GOAL=new Set\(\[([^\]]*)\]\)', 'GOAL')),
    'POST': strs(one(game, r'const POST=new Set\(\[([^\]]*)\]\)', 'POST')),
    'MIN_BET': F(one(game, r'const MIN_BET=([\d.]+),', 'MIN_BET')),
    'MAX_BET': F(one(game, r'[ ,]MAX_BET=([\d.]+);', 'MAX_BET')),
    'BET_STEP_C': int(one(game, r'const BET_STEP_C=(\d+);', 'BET_STEP_C')),
    'MIN_RUN_runbar_c': int(one(runbar, r'MIN_RUN = (\d+)', 'run-bar MIN_RUN')),
    'CAP_X_runbar': int(one(runbar, r'CAP_X = (\d+)', 'run-bar CAP_X')),
    # code shapes the math below relies on (exact text)
    'shoe': one(game, r'function freshShoe\(\)\{const a=(\[\.\.\.DECK,\.\.\.DECK\]);', 'freshShoe 2 decks'),
    'runGameDraw': one(game, r'function draw\(\)\{return (DECK\[rnd\(DECK\.length\)\]);\}', 'draw with replacement'),
    'amt': one(game, r'(const amt=\(mult,v\)=>\{const sc=Math\.round\(v\.stake\*100\),m=Math\.round\(mult\*100\),n=sc\*m;)', 'amt integer-cent formula'),
    'amtFloor': one(game, r'(return \(n-n%100\)/100/100;\};)', 'amt floor'),
    'total': one(game, r'(total=r2\(main\+S\.bonusWin\));', 'finish total = main + bonus'),
    'doublePrize': one(game, r'const prize=won\?(r2\(S\.stake\*2\)):0;', 'Run Game prize 2x'),
    # the run bar (embedded run-bar.js, v170): which buttons show, and the half split (integer cents)
    'rbHalf': one(runbar, r'(var half = Math\.floor\(S / 2\), keep = S - half;)', 'run-bar half split'),
    'rbDouble': one(runbar, r'(double: S >= MIN_RUN && B \+ 2 \* S <= MW,)', 'run-bar DOUBLE rule'),
    'rbDoubleHalf': one(runbar, r'(doubleHalf: half >= MIN_RUN && B \+ keep \+ 2 \* half <= MW)', 'run-bar DOUBLE HALF rule'),
    'rbVersion': one(runbar, r"version: '(\d+)' \}", 'run-bar version'),
    # the game's handlers and settlement
    'dhHandler': one(game, r"(doubleHalf:\(half,keep\)=>\{track\('run_choice',\{choice:'double_half',stake:half,banked_amount:keep\}\);S\.banked=r2\(\(S\.banked\|\|0\)\+keep\);newGame\(half,'run'\);\})", 'DOUBLE HALF handler'),
    'dblHandler': one(game, r"(double:\(\)=>\{track\('run_choice',\{choice:'double_it',stake:S\.offer,banked_amount:S\.banked\|\|0\}\);newGame\(S\.offer,'run'\);\})", 'DOUBLE OR NOTHING handler'),
    'bankedBust': one(game, r'(S\.banked=0;S\.offer=B;S\.bankedBack=B;)', 'banked bust: the RUN BANK becomes the held amount'),
    'ammo': one(game, r'(if\(total\)S\.ammo=total;)', 'ammo = the base win'),
}
# RUN IT AGAIN / RUN HALF are gone: no ride code, constants, copy or hotkeys anywhere in the game script, and none in the run bar's code
# (the module's header comment names what v170 removed, so it is cut off before the check)
rb_hdr = re.match(r'/\*![\s\S]*?\*/', runbar.lstrip()).group(0); rb_code = runbar.replace(rb_hdr, '')
page = re.sub(r'data:[A-Za-z/+.-]+;base64,[A-Za-z0-9+/=]+', 'data:', html.replace(rb_hdr, '')).replace('BUILD IT. RUN IT.', '')   # the lobby logo's alt text is allowed
GONE = r'ride|run it|run half|runhalf|runit|k_ride|kmil|knum|kden|canrh'
for what, src in (('game script', game), ('run-bar code', rb_code), ('whole page', page)):
    m = re.search(GONE, src, re.I)
    if m: sys.exit(f'RIDE / RUN HALF still in the {what}: ...{src[max(0, m.start() - 40):m.end() + 40]!r}')
USED = {
    'PAY_CLASSIC': [F(1), F(0), F(0), F(0), F(3, 2), F(4), F(20)], 'LADDER_CLASSIC': [F(0), F(0), F(1), F(3)],
    'CL_KICKS': 6, 'RUN_SHOTS': 3, 'RUN_TO': 2, 'TRIGGER': 1, 'MINRUN': F(1, 50), 'MAX_WIN_X': 20000, 'OPERATOR_MAX_WIN_X': 'MAX_WIN_X',
    'MW_X': 'Math.min(MAX_WIN_X,OPERATOR_MAX_WIN_X)', 'CAP_X_game': 1000, 'HEAD': 20,
    'RANKS': ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '14'], 'SUITS': ['♠', '♥', '♦', '♣'],
    'GOAL': ['6', '7', '8', '9', '10', 'J'], 'POST': ['5', 'Q'], 'MIN_BET': F(1), 'MAX_BET': F(100), 'BET_STEP_C': 10,
    'MIN_RUN_runbar_c': 2, 'CAP_X_runbar': 1000, 'shoe': '[...DECK,...DECK]', 'runGameDraw': 'DECK[rnd(DECK.length)]',
    'amt': P['amt'], 'amtFloor': P['amtFloor'], 'total': P['total'], 'doublePrize': 'r2(S.stake*2)',
    'rbHalf': P['rbHalf'], 'rbDouble': P['rbDouble'], 'rbDoubleHalf': P['rbDoubleHalf'], 'rbVersion': '170', 'dhHandler': P['dhHandler'], 'dblHandler': P['dblHandler'],
    'bankedBust': P['bankedBust'], 'ammo': P['ammo'],
}
for k, v in USED.items():
    if P[k] != v: sys.exit(f'BUILD CONSTANT MISMATCH {k}: build {P[k]!r} != used {v!r}')
PAY, LAD, NK = USED['PAY_CLASSIC'], USED['LADDER_CLASSIC'], USED['CL_KICKS']
MW_X = USED['MAX_WIN_X']; CAP_X = USED['CAP_X_game']; MINRUN_C = 2   # $0.02 (run-bar MIN_RUN)
assert USED['MINRUN'] * 100 == MINRUN_C == USED['MIN_RUN_runbar_c']
assert USED['TRIGGER'] == 1 and len(LAD) == 4   # the DP below: the 1st post starts the bonus; top = 3 in a row
NS = len(USED['SUITS'])
G1 = len(USED['GOAL']) * NS; P1_ = len(USED['POST']) * NS; W1 = len(USED['RANKS']) * NS - G1 - P1_   # one deck: 24 / 24 / 8
G0, W0, P0 = 2 * G1, 2 * W1, 2 * P1_                                                                   # the 112-card shoe
assert (G0, W0, P0) == (48, 48, 16)
parsed = {k: (str(v) if isinstance(v, F) else [str(x) for x in v] if isinstance(v, list) and v and isinstance(v[0], F) else v) for k, v in P.items()}

# ------------------------------------------------------------------------------------------------ 2. base game DP (exact)
def make(policy, one=F(1)):
    def choose(vg, vw, g, w):
        if policy == 'opt': return max(vg, vw)
        if policy == 'worst': return min(vg, vw)
        if policy == 'random': return (vg + vw) / 2
        if policy == 'counter': return vg if g >= w else vw
    @lru_cache(maxsize=None)
    def main(g, w, p, shots, cor, bp):
        if shots == NK: return PAY[cor] * one
        vg, vw = mainEV(g, w, p, shots, cor, bp); n = g + w + p
        post = (one * p / n) * (main(g, w, p - 1, shots + 1, cor, True) if bp else bonus(g, w, p - 1, 0, shots + 1, cor)) if p else 0 * one
        return choose(vg, vw, g, w) + post
    def mainEV(g, w, p, shots, cor, bp):
        n = g + w + p; vg = vw = 0 * one
        if g: vg += one * g / n * main(g - 1, w, p, shots + 1, cor + 1, bp); vw += one * g / n * main(g - 1, w, p, shots + 1, cor, bp)
        if w: vg += one * w / n * main(g, w - 1, p, shots + 1, cor, bp); vw += one * w / n * main(g, w - 1, p, shots + 1, cor + 1, bp)
        return vg, vw
    @lru_cache(maxsize=None)
    def bonus(g, w, p, s, shots, cor):
        if s == 3: return LAD[3] * one + main(g, w, p, shots, cor, True)
        vg, vw = bonusEV(g, w, p, s, shots, cor); n = g + w + p
        return choose(vg, vw, g, w) + ((one * p / n) * bonus(g, w, p - 1, s, shots, cor) if p else 0 * one)
    def bonusEV(g, w, p, s, shots, cor):
        n = g + w + p; vg = vw = 0 * one
        if g: vg += one * g / n * bonus(g - 1, w, p, s + 1, shots, cor); vw += one * g / n * (LAD[s] * one + main(g - 1, w, p, shots, cor, True))
        if w: vw += one * w / n * bonus(g, w - 1, p, s + 1, shots, cor); vg += one * w / n * (LAD[s] * one + main(g, w - 1, p, shots, cor, True))
        return vg, vw
    return main, bonus, mainEV, bonusEV

def distribution(policy):
    """exact {(right calls, bonus streak or -1): probability} under the policy. opt / worst: every call is decided exactly as the
    simulation bot decides it (policy.js: the same DP in double precision, same operation order, GOAL when vg >= vw / vg <= vw);
    the probabilities are exact fractions. `ties` = expected number of calls per game where the two calls have EXACTLY equal value."""
    _, _, mainEVx, bonusEVx = make(policy)            # exact values (only to count exact ties)
    _, _, mainEV, bonusEV = make(policy, 1.0)         # the bot's float DP
    ties = [F(0)]
    def pick(vg, vw, g, w, pr, xv=None):
        if policy in ('opt', 'worst'):
            if xv and xv[0] == xv[1]: ties[0] += pr
            return 'g' if (vg >= vw if policy == 'opt' else vg <= vw) else 'w'
        if policy == 'counter': return 'g' if g >= w else 'w'
        return 'r'
    out = defaultdict(F); frontier = {('M', G0, W0, P0, 0, 0, -1): F(1)}
    while frontier:
        nxt = defaultdict(F)
        for st, pr in frontier.items():
            if st[0] == 'M':
                _, g, w, p, shots, cor, bs = st
                if shots == NK: out[(cor, bs)] += pr; continue
                n = g + w + p; bp = bs >= 0
                c = pick(*mainEV(g, w, p, shots, cor, bp), g, w, pr, mainEVx(g, w, p, shots, cor, bp) if policy in ('opt', 'worst') else None); pg = F(1) if c == 'g' else F(0) if c == 'w' else F(1, 2)
                if g: nxt[('M', g - 1, w, p, shots + 1, cor + 1, bs)] += pr * g / n * pg; nxt[('M', g - 1, w, p, shots + 1, cor, bs)] += pr * g / n * (1 - pg)
                if w: nxt[('M', g, w - 1, p, shots + 1, cor, bs)] += pr * w / n * pg; nxt[('M', g, w - 1, p, shots + 1, cor + 1, bs)] += pr * w / n * (1 - pg)
                if p:
                    if bp: nxt[('M', g, w, p - 1, shots + 1, cor, bs)] += pr * p / n
                    else: nxt[('B', g, w, p - 1, 0, shots + 1, cor)] += pr * p / n
            else:
                _, g, w, p, s, shots, cor = st
                if s == 3: nxt[('M', g, w, p, shots, cor, 3)] += pr; continue
                n = g + w + p
                c = pick(*bonusEV(g, w, p, s, shots, cor), g, w, pr, bonusEVx(g, w, p, s, shots, cor) if policy in ('opt', 'worst') else None); pg = F(1) if c == 'g' else F(0) if c == 'w' else F(1, 2)
                if g: nxt[('B', g - 1, w, p, s + 1, shots, cor)] += pr * g / n * pg; nxt[('M', g - 1, w, p, shots, cor, s)] += pr * g / n * (1 - pg)
                if w: nxt[('B', g, w - 1, p, s + 1, shots, cor)] += pr * w / n * (1 - pg); nxt[('M', g, w - 1, p, shots, cor, s)] += pr * w / n * pg
                if p: nxt[('B', g, w, p - 1, s, shots, cor)] += pr * p / n
        frontier = nxt
    return dict(out), ties[0]

R = {'build': os.path.relpath(BUILD, HERE), 'parsed_constants': parsed, 'shoe': {'cards': G0 + W0 + P0, 'goal': G0, 'wide': W0, 'post': P0},
     'run_game_deck': {'cards': G1 + W1 + P1_, 'goal': G1, 'wide': W1, 'post': P1_}}
base = {}; DIST = {}
for pol in ['opt', 'counter', 'random', 'worst']:
    main = make(pol)[0]; v = main(G0, W0, P0, 0, 0, False)
    d, ties = distribution(pol); DIST[pol] = d
    tot = sum(d.values()); assert tot == 1, (pol, tot)
    ev = sum(p * (PAY[c] + LAD[max(s, 0)]) for (c, s), p in d.items()); assert ev == v, (pol, ev, v)   # the bot's calls reach the exact optimum / minimum
    ev2 = sum(p * (PAY[c] + LAD[max(s, 0)]) ** 2 for (c, s), p in d.items())
    tiers = defaultdict(F); byc = defaultdict(F)
    for (c, s), p in d.items(): tiers[PAY[c] + LAD[max(s, 0)]] += p; byc[c] += p
    bstart = sum(p for (c, s), p in d.items() if s >= 0); bpays = sum(p for (c, s), p in d.items() if s >= 2); btop = sum(p for (c, s), p in d.items() if s == 3)
    base[pol] = {'rtp_fraction': f'{v.numerator}/{v.denominator}', 'rtp': float(v), 'sd': math.sqrt(float(ev2 - v * v)), 'hit_rate': float(sum(p for t, p in tiers.items() if t > 0)),
                 'main_rtp': float(sum(p * PAY[c] for (c, s), p in d.items())), 'bonus_rtp': float(sum(p * LAD[max(s, 0)] for (c, s), p in d.items())),
                 'p_by_right_calls': {str(c): float(byc[c]) for c in sorted(byc)}, 'p_bonus_start': float(bstart), 'p_bonus_pays': float(bpays), 'p_bonus_top': float(btop),
                 'p_top_20x': float(byc[NK]), 'one_in_top_20x': float(1 / byc[NK]),
                 'tiers': [{'x': float(t), 'p': float(p), 'one_in': float(1 / p) if p else None, 'contrib': float(p * t)} for t, p in sorted(tiers.items())],
                 'exact_ties_per_game': float(ties), 'calls_decided_as': 'the simulation bot (float DP, GOAL on >= / <=)'}
    print(f'{pol:8s} RTP {float(v):.10f} = {v.numerator}/{v.denominator}  SD {base[pol]["sd"]:.6f} hit {base[pol]["hit_rate"]:.6f}  20x 1 in {float(1/byc[NK]):.2f}  exact ties/game {float(ties):.3g}  [{time.time()-T0:.0f}s]', flush=True)
R['base'] = base
RTP_OPT = make('opt')[0](G0, W0, P0, 0, 0, False)
top = max(t['x'] for t in base['opt']['tiers'])
R['top_pay'] = {'x': top, 'p': [t['p'] for t in base['opt']['tiers'] if t['x'] == top][0], 'one_in': [t['one_in'] for t in base['opt']['tiers'] if t['x'] == top][0],
                'how': f'{NK} right calls (no post, so no Posts Bonus)'}

# ------------------------------------------------------------------------------------------------ 3. boards in cents (best play)
OPT_T = defaultdict(F)                                  # (main pay x100, bonus pay x100) -> probability
for (c, s), p in DIST['opt'].items(): OPT_T[(int(PAY[c] * 100), int(LAD[max(s, 0)] * 100))] += p
OPT_T = sorted(OPT_T.items())
def amt_c(stake_c, m100):                               # the game's amt(): floor(cents x pay(hundredths) / 100)
    n = stake_c * m100; return (n - n % 100) // 100
@lru_cache(maxsize=None)
def board_c(stake_c):                                   # [(payout cents, prob)] of one base board at this stake
    out = defaultdict(F)
    for (m, b), p in OPT_T: out[(amt_c(stake_c, m) if m else 0) + (amt_c(stake_c, b) if b else 0)] += p
    return tuple(sorted(out.items()))
@lru_cache(maxsize=None)
def board_f(stake_c): return tuple((float(p), x) for x, p in board_c(stake_c))
def ev_c(stake_c): return sum(p * x for x, p in board_c(stake_c))

# ------------------------------------------------------------------------------------------------ 4. DOUBLE OR NOTHING (Run Game)
p_right = F(G1, G1 + W1)                                # posts are kicked again: a call is right with prob goal/(goal+wide) either way
assert p_right == F(W1, G1 + W1)
p_dbl = sum(F(math.comb(USED['RUN_TO'] - 1 + j, j)) * p_right ** USED['RUN_TO'] * (1 - p_right) ** j for j in range(USED['RUN_SHOTS'] - USED['RUN_TO'] + 1))
shots = F(0)   # expected decided shots and kicks per hand
for seq in range(1 << USED['RUN_SHOTS']):
    r = w = n = 0; pr = F(1)
    for i in range(USED['RUN_SHOTS']):
        hit = seq >> i & 1; pr *= p_right if hit else 1 - p_right; n += 1; r += hit; w += 1 - hit
        if r == USED['RUN_TO'] or w == USED['RUN_TO']: break
    if all(((seq >> i) & 1) == 0 for i in range(n, USED['RUN_SHOTS'])): shots += pr * n
R['double'] = {'p_right_per_call': str(p_right), 'p_win': str(p_dbl), 'rtp': float(2 * p_dbl), 'expected_decided_shots': float(shots),
               'expected_kicks_incl_posts': float(shots * F(G1 + W1 + P1_, G1 + W1)), 'prize': '2 x the amount run, whole cents (r2(stake*2))'}
assert p_dbl == F(1, 2)

# ------------------------------------------------------------------------------------------------ 5. rounding
R['rounding'] = {}
for bet in (1, 10, 100):
    bc = bet * 100
    b_rtp = ev_c(bc) / bc
    R['rounding'][f'${bet}'] = {'base_rtp': float(b_rtp), 'base_rounding_loss': float(RTP_OPT - b_rtp)}
    assert b_rtp == RTP_OPT   # every base pay is a whole number of cents on the $0.10 bet grid
# every amount a base round can hold on the $0.10 bet grid is a whole number of cents (pays 1, 1.5, 4, 20 and bonus 1, 3 times the bet)
assert all(amt_c(sc, m) * 100 == sc * m for sc in range(100, 10001, 10) for m in (100, 150, 400, 2000, 300))
print(f'base rounding: none at $1 / $10 / $100 (asserted on the whole $0.10 grid)  [{time.time()-T0:.0f}s]', flush=True)

# ------------------------------------------------------------------------------------------------ 6. run-bar policies P0, P2, P3, P4, P5
def show(h, B, A, MW):                                  # run-bar.js compute(): which buttons are on the bar (all cents; CASH OUT always)
    half = h // 2; keep = h - half
    return {'double': h >= MINRUN_C and B + 2 * h <= MW, 'doubleHalf': half >= MINRUN_C and B + keep + 2 * half <= MW}
def policy_actions(P, sh, k, one):
    if P == 'P0': return [(one, 'cashOut')]
    if P == 'P2': return [(one, 'double' if k == 0 and sh['double'] else 'cashOut')]
    if P == 'P3': return [(one, 'double' if sh['double'] else 'cashOut')]
    if P == 'P5': return [(one, 'doubleHalf' if k == 0 and sh['doubleHalf'] else 'cashOut')]
    if P == 'P4':
        o = [a for a in ('double', 'doubleHalf') if sh[a]]
        if not o: return [(one, 'cashOut')]
        return [(one / 3, 'cashOut')] + [(one * 2 / 3 / len(o), a) for a in o]
def solve_policy(P, bet, exact):
    one = F(1) if exact else 1.0; bc = bet * 100; MW = MW_X * bc
    BRD = board_c if exact else board_f
    half_ = one / 2
    def fin(v): return (one if v > 0 else 0 * one, v * one, v * v * one)
    memo = {}
    def bar(h, B, A, k):                               # k matters only as 0 / >0 for P2 and P5 (first bar of the round)
        kk = min(k, 1) if P in ('P2', 'P5') else 0
        key = (h, B, A, kk); r = memo.get(key)
        if r is None: r = memo[key] = bar2(h, B, A, kk)
        return r
    def bar2(h, B, A, k):
        acc = [0 * one, 0 * one, 0 * one]
        for pr, a in policy_actions(P, show(h, B, A, MW), k, one):
            if a == 'cashOut': r = fin(B + h)
            elif a == 'double': r = dbl(h, B, A, k)
            else:
                half = h // 2; keep = h - half
                r = dbl(half, B + keep, A, k)
            for i in range(3): acc[i] += pr * r[i]
        return tuple(acc)
    def won(t, B, A, k):                               # holdWin(): MAX WIN clips and pays, the 1,000x cap pays, else the bar
        if B + t >= MW: return fin(MW)
        if B + t >= CAP_X * A: return fin(B + t)
        return bar(t, B, A, k + 1)
    def lost(B, A, k):                                 # a run that pays nothing: the RUN BANK comes back as held (banked bust)
        return bar(B, 0, A, k + 1) if B > 0 else fin(0)
    def dbl(s, B, A, k):
        a, b = won(2 * s, B, A, k), lost(B, A, k)
        return tuple(half_ * a[i] + half_ * b[i] for i in range(3))
    acc = [0 * one, 0 * one, 0 * one]
    for item in BRD(bc):
        (pr, x) = (item[1], item[0]) if exact else item
        r = won(x, 0, x, -1) if x > 0 else fin(0)       # the base win opens the bar (k = 0) with ammo = the win
        for i in range(3): acc[i] += pr * r[i]
    hit, m1, m2 = acc
    mean = m1 / bc; var = m2 / (bc * bc) - mean * mean
    return {'rtp': float(mean), 'rtp_fraction': f'{mean.numerator}/{mean.denominator}' if exact else None, 'sd': math.sqrt(float(var)), 'hit_rate': float(hit),
            'method': 'exact (fractions)' if exact else 'exact recursion in double precision', 'bar_states': len(memo)}
def p5_closed_form(bet):
    """P5 = DOUBLE HALF once, then cash out, in closed form from the base pay distribution (exact fractions). A base win of x cents with
    half = x // 2, keep = x - half: if DOUBLE HALF is on the bar (half >= 2 cents and keep + 2 half <= MAX WIN) the round pays keep + 2 half
    = x + half (the half wins, prob 1/2) or keep (it loses and the RUN BANK comes back, cashed out), else x. (When the win itself reaches
    MAX WIN or the 1,000x cap the game pays it at once and no bar opens; the cap needs 1,000 times the first win, MAX WIN needs x >= MW.)"""
    bc = bet * 100; MW = MW_X * bc; m1 = m2 = hit = F(0)
    for x, p in board_c(bc):
        if x <= 0: continue
        if x >= MW: outs = [(F(MW), F(1))]                      # (cannot happen: the base top is 20x)
        else:
            half = x // 2; keep = x - half
            outs = [(F(keep + 2 * half), F(1, 2)), (F(keep), F(1, 2))] if (half >= MINRUN_C and keep + 2 * half <= MW) else [(F(x), F(1))]
        for v, q in outs: m1 += p * q * v; m2 += p * q * v * v; hit += p * q * (v > 0)
    mean = m1 / bc; var = m2 / (bc * bc) - mean * mean
    return {'rtp': float(mean), 'rtp_fraction': f'{mean.numerator}/{mean.denominator}', 'sd': math.sqrt(float(var)), 'hit_rate': float(hit)}
def solve_p4(bet, eps=P4_EPS, rtp_exact=None):
    """P4 can revisit a bar state (a DOUBLE HALF that loses brings the RUN BANK back as the held amount, a double that wins restores
    amounts) and its reachable state space is large, so it is propagated FORWARD bar by bar: the probability of every live bar state
    (h, B, A) is carried, every action of P4 is expanded exactly (Run Game 1/2, caps), finished rounds add their payout to hit / E[X] /
    E[X^2]. A live state whose probability is below eps is dropped (mass `dropped_probability`, reported). Every action is exactly fair
    in whole cents, so a dropped state worth W = B + h is worth exactly W in expectation (and between 0 and MW x W-ish for X^2):
      RTP:  mean_expanded + sum(p W)/bet is the exact RTP (equals the base RTP; asserted by the caller); rigorous bounds
            [mean_expanded, mean_expanded + sum(p W)/bet] hold without that argument (a state is worth between 0 and W)
      hit:  [hit_expanded, hit_expanded + dropped probability]
      SD:   E[X^2] of a dropped state is >= W^2 (Jensen) and <= MW x W (X <= MW) -> an interval for the SD.
    Double precision."""
    bc = bet * 100; MW = MW_X * bc; M = MW + 1          # a bar state (h, B, A) is stored as ONE int (h*M + B)*M + A
    acc = [0.0, 0.0, 0.0]; drop_p = 0.0; drop_v = 0.0; drop_w2 = 0.0; drop_wmw = 0.0; live = defaultdict(float); steps = 0; peak = 0
    EDGES = [0, 1e-9, 1, 2, 5, 10, 20, 50, 100, 200, 300, 500, 700, 1000, 2000, 5000, 10000, 20000]   # x bet (payout profile, P4 tail)
    prof = defaultdict(lambda: [0.0, 0.0]); dprof = defaultdict(lambda: [0.0, 0.0])
    def fin(pr, v):
        acc[0] += pr * (v > 0); acc[1] += pr * v; acc[2] += pr * v * v
        pf = prof[bisect.bisect_right(EDGES, v / bc) - 1]; pf[0] += pr; pf[1] += pr * v / bc
    def won(pr, t, B, A, nxt):
        if B + t >= MW: fin(pr, MW)
        elif B + t >= CAP_X * A: fin(pr, B + t)
        else: nxt[(t * M + B) * M + A] += pr
    def lost(pr, B, A, nxt):
        if B > 0: nxt[B * M * M + A] += pr
        else: fin(pr, 0)
    for pr, x in board_f(bc):
        if x > 0: won(pr, x, 0, x, live)
        else: fin(pr, 0)
    while live:
        steps += 1; peak = max(peak, len(live)); nxt = defaultdict(float)
        for key, pr in live.items():
            hB, A = divmod(key, M); h, B = divmod(hB, M)
            if pr < eps:
                W = B + h; drop_p += pr; drop_v += pr * W; drop_w2 += pr * W * W; drop_wmw += pr * W * MW
                dp = dprof[bisect.bisect_right(EDGES, W / bc) - 1]; dp[0] += pr; dp[1] += pr * W / bc; continue
            for pa, a in policy_actions('P4', show(h, B, A, MW), 0, 1.0):
                q = pr * pa
                if a == 'cashOut': fin(q, B + h); continue
                stake, Bn = (h, B) if a == 'double' else (h // 2, B + h - h // 2)
                won(q * 0.5, 2 * stake, Bn, A, nxt); lost(q * 0.5, Bn, A, nxt)
        live = nxt
    hit, m1, m2 = acc; mean = m1 / bc
    est = mean + drop_v / bc
    mu = rtp_exact if rtp_exact is not None else est
    var_lo = (m2 + drop_w2) / bc / bc - mu * mu; var_hi = (m2 + drop_wmw) / bc / bc - mu * mu
    return {'rtp': est, 'rtp_fraction': None, 'rtp_expanded_part': mean, 'rtp_tail_at_W': drop_v / bc, 'rtp_bounds': [mean, mean + drop_v / bc],
            'bounds_note': 'rigorous without the martingale argument: a dropped state worth W = RUN BANK + held is worth between 0 and W; with it (every action exactly fair) the tail is worth exactly W',
            'sd': math.sqrt(var_lo), 'sd_bounds': [math.sqrt(var_lo), math.sqrt(var_hi)], 'sd_expanded_part_only': math.sqrt(m2 / bc / bc - mu * mu),
            'hit_rate': hit, 'hit_interval': [hit, hit + drop_p], 'dropped_probability': drop_p,
            'method': f'forward propagation over bar states (every P4 action expanded exactly, caps included) to probability {eps:g} per state ({steps} bars deep, peak {peak:,} live states); dropped mass {drop_p:.3e}; RTP = expanded + tail at W (exact); SD and hit rate with rigorous bounds',
            'bar_states': peak, 'eps': eps,
            'payout_profile_expanded': [{'x_from': EDGES[i], 'x_to': EDGES[i + 1] if i + 1 < len(EDGES) else None, 'p': prof[i][0], 'rtp_share': prof[i][1]} for i in sorted(prof)],
            'dropped_profile_by_W': [{'W_from': EDGES[i], 'W_to': EDGES[i + 1] if i + 1 < len(EDGES) else None, 'p': dprof[i][0], 'W_x_bet': dprof[i][1]} for i in sorted(dprof)], 'bars_deep': steps, 'dropped_value_x_bet': drop_v / bc,
            'peak_rss_mb_so_far': round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024), 'secs': None}
def run_deep(f, *a):                                     # deep recursion (long chains): a thread with a 1 GB stack
    import threading
    sys.setrecursionlimit(1000000); threading.stack_size(1 << 30); box = {}
    t = threading.Thread(target=lambda: box.update(r=f(*a))); t.start(); t.join()
    if 'r' not in box: sys.exit('policy recursion failed')
    return box['r']
R['policies'] = {}
for bet in (1, 10, 100):
    for Pn in ('P0', 'P2', 'P3', 'P4', 'P5'):
        t1 = time.time()
        r = solve_p4(bet, rtp_exact=float(RTP_OPT)) if Pn == 'P4' else run_deep(solve_policy, Pn, bet, True)
        if Pn == 'P4': r['secs'] = round(time.time() - t1, 1)
        R['policies'].setdefault(Pn, {})[f'${bet}'] = r
        sdtxt = f'{r["sd"]:9.4f}' + (f' [{r["sd_bounds"][0]:.4f}, {r["sd_bounds"][1]:.4f}]' if 'sd_bounds' in r else '')
        print(f'{Pn} ${bet:<3d} RTP {r["rtp"]:.12f} SD {sdtxt} hit {r["hit_rate"]:.6f} states {r["bar_states"]:>8,} ({r["method"][:40]}){" bounds " + str(r["rtp_bounds"]) + " dropped " + format(r["dropped_probability"], ".3e") + f" peak RSS {r['peak_rss_mb_so_far']} MB" if "rtp_bounds" in r else ""}  [{time.time()-T0:.0f}s]', flush=True)
# cross-checks. Every bar action is exactly fair, so P2, P3 and P5 equal P0 exactly (fractions) and P4 equals it to the cut:
for bet in ('$1', '$10', '$100'):
    for Pn in ('P2', 'P3', 'P5'):
        assert R['policies'][Pn][bet]['rtp_fraction'] == R['policies']['P0'][bet]['rtp_fraction'], (Pn, bet)
    assert R['policies']['P0'][bet]['rtp_fraction'] == f'{RTP_OPT.numerator}/{RTP_OPT.denominator}'
    r4 = R['policies']['P4'][bet]; assert abs(r4['rtp'] - float(RTP_OPT)) < 1e-10, (bet, r4['rtp'], float(RTP_OPT))
    assert r4['rtp_bounds'][0] <= float(RTP_OPT) <= r4['rtp_bounds'][1] + 1e-9   # (double-precision sums over millions of states: ~1e-12 of rounding noise)
    r4['rtp_exact_fraction'] = f'{RTP_OPT.numerator}/{RTP_OPT.denominator}'; r4['rtp_exact'] = float(RTP_OPT)
    r4['rtp_check_est_minus_exact'] = r4['rtp'] - float(RTP_OPT)
    # P5 closed form (independent of the bar recursion) must equal the recursion exactly
    bet_n = int(bet[1:]); cf = p5_closed_form(bet_n); rp = R['policies']['P5'][bet]
    assert cf['rtp_fraction'] == rp['rtp_fraction'] and abs(cf['sd'] - rp['sd']) < 1e-12 and abs(cf['hit_rate'] - rp['hit_rate']) < 1e-12, (bet, cf, rp)
    rp['closed_form_check'] = 'equal to p5_closed_form()'
R['secs'] = round(time.time() - T0, 1)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
json.dump(R, open(os.path.join(HERE, 'out', 'exact.json'), 'w'), indent=1)
print('wrote out/exact.json', R['secs'], 's')
