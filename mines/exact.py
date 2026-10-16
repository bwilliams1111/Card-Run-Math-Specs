# MINES 20× lab pack: exact math for the final build (v170: RUN IT AGAIN and RUN HALF are gone; the run bar is CASH OUT /
# DOUBLE OR NOTHING / DOUBLE HALF).
# Reads ../builds-final/card-run-mines-classic-launch.html, PARSES every constant the math depends on (ladder size and target,
# 20× target and the top-pick rule, unlock, run cap, MAX WIN, minimum run, the double board, the pay helpers) and asserts
# each equals the value used below, and that no RUN IT AGAIN / RUN HALF code is left in the build. Probabilities are exact
# fractions; pays are the build's integer cents (floor(bet cents × the exact multiplier), one rounding, as Classic.payC), sums
# follow round2 / RunBar.compute's cents.
#   cd labpack/mines && python3 -I exact.py          -> out/exact.json, out/exact.txt (and par.txt is built from out/exact.json)
import json, math, os, re, sys, hashlib
from fractions import Fraction as F
from math import comb, floor

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, '..', 'builds-final', 'card-run-mines-classic-launch.html')
src = open(BUILD, encoding='utf-8').read()
SHA = hashlib.sha256(src.encode()).hexdigest()

# ------------------------------------------------------------------ constants used here
T, GEMS, BOMB_TILES, OPTIONS = 25, 21, 4, [1, 2, 3, 4]
H = F(93, 100)                 # ladder target: M_B(k) = Fair_B(k) × 0.93 exactly; Display(k) = floor4(M_B(k))
CAP_X = 20                     # the build target: the board stops at the first pick with M >= 20 (the top pick) and pays it in full
UNLOCK = 10100                 # LOCK IN once Display >= 1.0100
RUN_X = 1000                   # the run cap: 1,000 × the build's win
MAX_WIN_X = 20000              # MAX WIN = 20,000 × the bet
MIN_RUN_CENTS = 2              # run-bar v170: minimum run $0.02 (DOUBLE OR NOTHING / DOUBLE HALF)
DBL_GEMS, DBL_LIVE, DBL_DUDS, DBL_NEED = 19, 2, 4, 6

# ------------------------------------------------------------------ parse the build and assert
def one(pattern, what):
    m = re.findall(pattern, src)
    assert len(m) == 1, f'{what}: {len(m)} matches for {pattern}'
    return m[0]
assert one(r'\n  const T = (\d+);', 'T') == str(T)
assert one(r'\n  const TARGET = \[(\d+)n, (\d+)n\];', 'TARGET') == (str(H.numerator), str(H.denominator))
assert one(r"id: 'classic', title: '[^']*', noun: 'GEMS', options: \[([\d, ]+)\], B: 4, S: 21, M: \[\], base: \[\], top: 21, capX: (\d+),", 'Classic options/capX') == (', '.join(map(str, OPTIONS)), str(CAP_X))
assert one(r'\n  const UNLOCK = (\d+);', 'UNLOCK') == str(UNLOCK)
assert one(r'\n  const RUN_X = (\d+);', 'RUN_X') == str(RUN_X)
assert one(r'\n  const MAX_WIN_X = (\d+);', 'MAX_WIN_X') == str(MAX_WIN_X)
assert one(r'\n  const OPERATOR_MAX_WIN_X = (\w+);', 'OPERATOR_MAX_WIN_X') == 'MAX_WIN_X'
assert one(r'\n  var MIN_RUN = (\d+), CAP_X = (\d+);', 'run-bar MIN_RUN/CAP_X') == (str(MIN_RUN_CENTS), str(RUN_X))
assert one(r'\n  const MIN_RUN = ([\d.]+);', 'game MIN_RUN') == '0.02'   # the game's own copy (rules-sheet text only)
assert one(r"money: function \(x\) \{ return money\(c\(x\)\); \}, version: '(\d+)' \};", 'run-bar version') == '170'
# RUN IT AGAIN / RUN HALF are gone: no ride / run-half identifier, event, class or CSS rule anywhere in the build. The only words left are
# the v170 run-bar module's own header comment ("RUN IT AGAIN and RUN HALF removed") and the logo alt text / slogan comments (BUILD IT. RUN IT.)
code = re.sub(r'data:[^"\')]+', '', src)           # the build without its embedded logo images (base64 text)
for tok in ('rideK', 'rideKMil', 'kMil', 'kNum', 'kDen', 'K_RIDE', 'setRide', 'startRide', 'barRide', 'st.ride', 'runHalf', 'runIt', 'rides:', 'riding', 'RIDE', "'ride'", 'data-act="runIt"', 'DI:', '.DI[', 'g.DI', 'mwLab', 'st.buy'):
    assert tok not in code, 'dead ride code still in the build: ' + tok
assert not re.search(r'\bride\b|\brides\b|Ride', code), 'the word ride is still in the build'
assert code.count('RUN IT AGAIN') == 1 and code.count('RUN HALF') == 1 and 'RUN IT AGAIN and RUN HALF removed for certification' in code   # the run-bar header comment only
assert len(re.findall(r'RUN IT', code)) == 5 and len(re.findall(r'BUILD IT\. RUN IT\.', code)) == 4   # 5 = module header + 3 slogan comments + the logo's alt text
assert one(r'shuffle\(Array\(g\.B\)\.fill\(BOMB\)\.concat\(Array\((\d+) - g\.B\)\.fill\(SHIELD\), Array\((\d+)\)\.fill\(GEM\)\)\)', 'Classic board') == (str(BOMB_TILES), str(GEMS))
assert one(r'shuffle\(Array\((\d+)\)\.fill\(GEM\)\.concat\(\[LIVE, LIVE\], Array\((\d+)\)\.fill\(DUD\)\)\)', 'double board') == (str(DBL_GEMS), str(DBL_DUDS))
assert one(r'if \(r\.gems === (\d+)\) \{', 'double gems needed') == str(DBL_NEED)
# the board helpers, verbatim
V = lambda t: re.escape(t)      # a verbatim line of the build
assert one('(' + V('const toC = v => Math.round(v * 100);') + ')', 'toC')
assert one(r'\n  (const round2 = x => Math\.round\(x \* 100 \+ 1e-9\) / 100;)', 'round2')
assert one('(' + V('fair = fmul(fair, fr(BigInt(T - (k - 1)), BigInt(T - b - (k - 1))));\n      out[k] = fmul(fair, H);') + ')', 'ladder: exact fractions')
assert one('(' + V('g.B = n; g.S = T - n; g.M = ladder(n, TARGET);') + ')', 'setMines: M')
assert one('(' + V('g.top = g.M.findIndex((m, k) => k > 0 && m[0] >= BigInt(g.capX) * m[1]); if (g.top < 0) g.top = g.S;') + ')', 'setMines: top pick')
assert one('(' + V('g.base = g.M.slice(0, g.top + 1).map(m => Number(m[0] * 10000n / m[1]));') + ')', 'setMines: display')
assert one('(' + V('payC(cents, k) { const m = g.M[k]; return Number(BigInt(cents) * m[0] / m[1]); },') + ')', 'payC')
assert one('(' + V('const cashValue = () => st.k ? G.payC(toC(st.R.bet), st.k) / 100 : 0;') + ')', 'cashValue')
assert one('(' + V('const unlocked = () => st.k >= 1 && G.base[st.k] >= UNLOCK;') + ')', 'unlocked')
assert one(r"(if \(cleared \|\| capped \|\| tot >= MW\(\)\) \{ boardDone)", 'afterSafePick stop rule')
assert one('(' + V('const capped = st.k >= G.top || toC(v) >= capX() * toC(st.R.bet);') + ')', 'capped')
assert one('(' + V('const capX = () => G.capX || THRESHOLD_X;') + ')', 'capX')
assert one('(' + V('afterSafePick(st.k === G.S);') + ')', 'cleared = every safe tile picked')
assert one(r'(st\.R\.ammo = v; st\.R\.limit = round2\(RUN_X \* v\);)', 'run cap')
assert one(r'(R\.held = round2\(2 \* stake\);)', 'double pays 2 × stake')
assert one(r'(const maxWinFor = bet => Math\.round\(bet \* 100\) \* Math\.min\(MAX_WIN_X, OPERATOR_MAX_WIN_X\) / 100;)', 'maxWinFor')
assert one(r'(if \(B \+ S > MW\) S = MW - B;)', 'run bar MAX WIN clip')
assert one(r'(double: S >= MIN_RUN && B \+ 2 \* S <= MW,)', 'run bar double rule')
assert one(r'(doubleHalf: half >= MIN_RUN && B \+ keep \+ 2 \* half <= MW)', 'run bar double-half rule')
assert one('(' + V('show.halfPill = show.doubleHalf;\n    show.cashOutOnly = !show.double && !show.doubleHalf;') + ')', 'run bar halfPill / cashOutOnly')
assert one('(' + V('var nCap = Math.max(1, Math.ceil(Math.log2(Math.max(1, (cap - B) / S)) - 1e-9));\n    var nMW = Math.max(1, Math.floor(Math.log2((MW - B) / S) + 1e-9));') + ')', 'run bar nMax')
assert one('(' + V('nMax: Math.min(nCap, nMW), cap: cap, maxWin: MW,') + ')', 'run bar nMax result')
assert one('(' + V('var half = Math.floor(S / 2), keep = S - half;') + ')', 'run bar half / keep')

# ------------------------------------------------------------------ JS float helpers (IEEE-754 doubles, as in the build)
def js_round(x): return math.floor(x + 0.5)
def round2(x): return js_round(x * 100 + 1e-9) / 100
def cents(x): return js_round(x * 100)               # RunBar's c(), and the build's toC()

# ------------------------------------------------------------------ the ladders: exact multipliers M, the top pick, the displays
def ladder(b):
    out, fair = [F(1)], F(1)
    for k in range(1, T - b + 1):
        fair *= F(T - (k - 1), T - b - (k - 1)); out.append(fair * H)
    return out
def payC(cents_, M, k):                               # Classic.payC: floor(cents × M_B(k)), one rounding
    m = M[k]
    return (cents_ * m.numerator) // m.denominator
LAD = {}
for b in OPTIONS:
    M = ladder(b); S = T - b
    top = next((k for k in range(1, S + 1) if M[k] >= CAP_X), S)     # the first pick at or over 20×: paid in full, the board stops
    base = [floor(m * 10000) for m in M[:top + 1]]
    surv = [F(comb(S, k), comb(T, k)) for k in range(S + 1)]        # P(the first k picks are all safe)
    LAD[b] = dict(M=M, base=base, S=S, surv=surv, fair=[1 / p for p in surv], cap=top,
                  unlock=next(k for k in range(1, top + 1) if base[k] >= UNLOCK))

# ------------------------------------------------------------------ one board, exactly as the shell plays it
def board(b, unit, target, bank=0.0, mw=math.inf):
    """distribution of the board: list of (prob, v, end) with v the amount the board hands to the bar (0 = bust).
    target: LOCK IN as soon as k >= target and LOCK IN is shown (99 = never lock in: play until the board stops itself)."""
    L = LAD[b]; DI = L['base']; S = L['S']; uc = cents(unit)
    cv = lambda k: payC(uc, L['M'], k) / 100 if k else 0
    out, k, p = [], 0, F(1)
    while True:
        if k >= target and k >= 1 and DI[k] >= UNLOCK and cv(k) > 0:
            out.append((p, cv(k), 'lock')); return out
        q = F(S - k, T - k)                                   # next pick safe
        out.append((p * (1 - q), 0.0, 'bust')); p *= q; k += 1
        v = cv(k); tot = round2(bank + v); capped = k >= L['cap'] or cents(v) >= CAP_X * uc
        if k == S or capped or tot >= mw:
            out.append((p, v, 'clear' if k == S else 'cap' if capped else 'limit')); return out

def stats(dist, bet):
    """dist: {cents: prob}; returns RTP, SD (× bet), hit rate, top pay and its chance"""
    bet = F(round(bet * 100), 100)
    m = sum(F(c, 100) * p for c, p in dist.items()) / bet
    m2 = sum((F(c, 100) / bet) ** 2 * p for c, p in dist.items())
    hit = sum(p for c, p in dist.items() if c > 0)
    top = max(c for c, p in dist.items() if p > 0)
    return dict(rtp=float(m), rtp_exact=str(m) if m.denominator < 10**40 else None, sd=math.sqrt(float(m2 - m * m)), hit=float(hit),
                top_pay=top / 100, top_x=float(F(top, 100) / bet), top_one_in=float(1 / dist[top]), total_prob=str(sum(dist.values())))

def base_dist(b, bet, target):
    dist = {}
    for p, v, e in board(b, bet, target, mw=bet * MAX_WIN_X):
        dist[cents(v)] = dist.get(cents(v), 0) + p
    return dist

# ------------------------------------------------------------------ the run bar (RunBar.compute v170) and the round
def compute(held, banked, ammo, mw):
    S, B, A, MW = cents(held), cents(banked), cents(ammo), cents(mw); cap = RUN_X * A
    if B + S > MW: S = MW - B
    total = B + S
    if total >= MW: return dict(mode='max_win', S=S, B=B, total=total)
    if total >= cap: return dict(mode='run_cap', S=S, B=B, total=total)
    half = S // 2; keep = S - half
    show = dict(cashOut=True, double=S >= MIN_RUN_CENTS and B + 2 * S <= MW, doubleHalf=half >= MIN_RUN_CENTS and B + keep + 2 * half <= MW)
    show['halfPill'] = show['doubleHalf']; show['cashOutOnly'] = not show['double'] and not show['doubleHalf']
    # nMax = min(nCap, nMW): the most doubles the cap / MAX WIN allow, exact integers (the build's Math.log2 form, with its 1e-9 slack, agrees; xcheck.js proves it)
    if S == 0: n_max = None                                   # the build: (cap - B) / 0 = Infinity -> nMax Infinity
    else:
        n_cap = 1
        while S << n_cap < cap - B: n_cap += 1                # ceil(log2((cap - B) / S)), at least 1
        n_mw = 1
        while S << (n_mw + 1) <= MW - B: n_mw += 1            # floor(log2((MW - B) / S)), at least 1
        n_max = min(n_cap, n_mw)
    return dict(mode='bar', S=S, B=B, total=total, half=half, keep=keep, show=show, n_max=n_max)

def round_dist(bet, b, target, policy, mw_x=MAX_WIN_X):
    """exact distribution of a full round (build, run bar, doubles, RUN BANK) for a deterministic run-bar policy"""
    mw = bet * MAX_WIN_X if mw_x == MAX_WIN_X else bet * mw_x
    dist = {}
    def add(c, p): dist[c] = dist.get(c, 0) + p
    def to_bar(R, p):
        if round2(R['bank'] + R['held']) > mw: R = dict(R, held=max(0, round2(mw - R['bank'])))
        tot = round2(R['bank'] + R['held'])
        if tot >= mw: return add(cents(round2(max(0, round2(mw - R['bank'])) + R['bank'])), p)
        if tot >= R['limit']: return add(cents(round2(R['held'] + R['bank'])), p)
        bar(R, p)
    def bust(R, p):
        if R['bank'] > 0: return to_bar(dict(R, held=R['bank'], bank=0.0), p)
        add(0, p)
    def bar(R, p):
        c = compute(R['held'], R['bank'], R['ammo'], mw); sh = c['show']; n = R['n']
        act = 'cashOut'
        if policy == 'P2' and n == 0 and sh['double']: act = 'double'
        if policy == 'P3' and sh['double']: act = 'double'
        if policy == 'P5' and n == 0 and sh['doubleHalf']: act = 'doubleHalf'
        if act == 'cashOut': return add(cents(round2(R['held'] + R['bank'])), p)
        stake = c['S'] / 100 if act == 'double' else c['half'] / 100
        bank = R['bank'] if act == 'double' else round2(R['bank'] + c['keep'] / 100)
        R2 = dict(R, n=n + 1, bank=bank, held=0.0)
        to_bar(dict(R2, held=round2(2 * stake)), p * F(1, 2)); bust(R2, p * F(1, 2))
    for q, v, e in board(b, bet, target, mw=mw):
        if e == 'bust': add(0, q)
        else: to_bar(dict(held=v, bank=0.0, ammo=v, limit=round2(RUN_X * v), n=0), q)
    assert sum(dist.values()) == 1
    return dist

if __name__ == '__main__':
    R = {'build': os.path.relpath(BUILD, HERE), 'build_sha256': SHA, 'constants_checked': True,
         'constants': dict(T=T, gems=GEMS, bomb_tiles=BOMB_TILES, live_bomb_options=OPTIONS, H='93/100', cap_x=CAP_X, unlock=UNLOCK / 1e4,
                           run_x=RUN_X, max_win_x=MAX_WIN_X, min_run=MIN_RUN_CENTS / 100, double=dict(gems=DBL_GEMS, live=DBL_LIVE, duds=DBL_DUDS, need=DBL_NEED))}
    txt = []
    P = lambda *a: txt.append(' '.join(str(x) for x in a))
    # ---- ladders
    R['ladders'] = {}
    for b in OPTIONS:
        L = LAD[b]; M = L['M']
        rows = []
        for k in range(1, L['cap'] + 1):
            r = dict(k=k, one_in=float(L['fair'][k]), fair=float(L['fair'][k]), multiplier=float(M[k]), display=L['base'][k] / 1e4,
                     rtp_exact=float(M[k] * L['surv'][k]), lock=L['base'][k] >= UNLOCK)
            for bet in (1, 10, 100): r[f'pay_{bet}'] = payC(100 * bet, M, k) / 100; r[f'rtp_{bet}'] = float(F(cents(r[f'pay_{bet}']), 100 * bet) * L['surv'][k])
            rows.append(r)
        R['ladders'][b] = dict(safe=L['S'], unlock_k=L['unlock'], cap_k=L['cap'], top_x=float(M[L['cap']]), rows=rows,
                              cap_rtp=float(M[L['cap']] * L['surv'][L['cap']]), cap_one_in=float(L['fair'][L['cap']]))
    # ---- double: P(6 gems before a live bomb); duds only cost a pick
    p_dbl = F(comb(DBL_GEMS, DBL_NEED), comb(DBL_GEMS + DBL_LIVE, DBL_NEED))
    R['double'] = dict(p_win=str(p_dbl), rtp=float(2 * p_dbl))
    assert p_dbl == F(1, 2)
    # ---- base strategies at $1 / $10 / $100
    strat = {}
    def st_(name, b, target):
        strat[name] = {}
        for bet in (1, 10, 100):
            d = base_dist(b, bet, target); s = stats(d, bet)
            s['dist'] = sorted(((c / 100 / bet, float(p)) for c, p in d.items()), key=lambda x: x[0])
            strat[name][bet] = s
    # every (bombs, stop) pair: stop = LOCK IN as soon as k >= stop and LOCK IN is shown; stop = the top pick = play until the board stops
    allstops = {}
    for b in OPTIONS:
        for k in range(1, LAD[b]['cap'] + 1):
            for bet in (1, 10, 100):
                d = base_dist(b, bet, k); allstops[(b, k, bet)] = stats(d, bet)['rtp']
    anystop = {bet: [(allstops[(b, k, bet)], b, k) for b in OPTIONS for k in range(LAD[b]['unlock'], LAD[b]['cap'] + 1)] for bet in (1, 10, 100)}
    best = {bet: max(anystop[bet]) for bet in anystop}; lowest = {bet: min(anystop[bet]) for bet in anystop}
    R['stops'] = {f'{b}_{k}_{bet}': v for (b, k, bet), v in allstops.items()}
    R['best'] = {bet: dict(rtp=v[0], bombs=v[1], stop=v[2]) for bet, v in best.items()}
    R['lowest_any_stop'] = {bet: dict(rtp=v[0], bombs=v[1], stop=v[2]) for bet, v in lowest.items()}
    R['top_pick'] = {b: dict(pick=LAD[b]['cap'], x=float(LAD[b]['M'][LAD[b]['cap']]), rtp_exact=float(LAD[b]['M'][LAD[b]['cap']] * LAD[b]['surv'][LAD[b]['cap']]),
                             one_in=float(LAD[b]['fair'][LAD[b]['cap']]), **{f'rtp_{bet}': allstops[(b, LAD[b]['cap'], bet)] for bet in (1, 10, 100)}) for b in OPTIONS}
    bb, bk = best[10][1], best[10][2]
    ties = sum(1 for x in anystop[10] if x[0] == best[10][0])
    st_('best (%d stops tie at the $10 maximum; shown: %d live, LOCK IN at pick %d)' % (ties, bb, bk), bb, bk)
    R['best_ties_at_10'] = sorted([(x[1], x[2]) for x in anystop[10] if x[0] == best[10][0]])
    st_('typical (4 live bombs, LOCK IN after 3 picks)', 4, 3)
    for b in OPTIONS:
        st_('play to the top pick, %d live bomb%s (pick %d pays %.4f×)' % (b, 's' if b > 1 else '', LAD[b]['cap'], float(LAD[b]['M'][LAD[b]['cap']])), b, 99)
    # random player: bombs uniform 1-4, stop uniform over the picks where LOCK IN is possible up to the top pick (that pick = play to the stop)
    for bet in (1, 10, 100):
        d = {}
        for b in OPTIONS:
            ks = list(range(LAD[b]['unlock'], LAD[b]['cap'] + 1))
            for k in ks:
                for c, p in base_dist(b, bet, k if k < LAD[b]['cap'] else 99).items(): d[c] = d.get(c, 0) + p * F(1, 4 * len(ks))
        s = stats(d, bet); s['dist'] = None
        strat.setdefault('random player (bombs 1-4, stop uniform up to the top pick)', {})[bet] = s
    # the simulation's base mix: round r plays bombs 1+((r>>2)%4), LOCK IN after 1+(r%6) picks (as sim.js), weights for N rounds
    def mix(bet, N, rule):
        d = {}
        cnt = {}
        for r in range(N): k_ = rule(r); cnt[k_] = cnt.get(k_, 0) + 1   # the exact count of each (bombs, stop) in N rounds
        for (b, k), n in cnt.items():
            for c, p in base_dist(b, bet, k).items(): d[c] = d.get(c, 0) + p * F(n, N)
        return d
    R['sim_mix_exact'] = {}
    s = stats(mix(10, 100000, lambda r: (1 + ((r >> 2) % 4), 1 + (r % 6))), 10); s.pop('rtp_exact', None); R['sim_mix_exact']['10_100000'] = s
    # the 'top' simulation: round r plays bombs 1+(r%4) and never locks in (the board runs to its top pick or a live bomb)
    for bet in (1.1, 10):
        s = stats(mix(bet, 100000, lambda r: (1 + (r % 4), 99)), bet); s.pop('rtp_exact', None); s.pop('dist', None); R['sim_mix_exact'][f'top_{bet}_100000'] = s
    R['strategies'] = strat
    # ---- every bet on the grid: the lowest stop after rounding to the cent, and the top-pick stop rule
    grid_low, stop_bad = (9, None), []
    for dimes in range(10, 1001):
        uc = dimes * 10
        for b in OPTIONS:
            L = LAD[b]; top = L['cap']
            for k in range(L['unlock'], top + 1):
                r = F(payC(uc, L['M'], k), uc) * L['surv'][k]
                if r < grid_low[0]: grid_low = (r, (uc / 100, b, k))
            if not (payC(uc, L['M'], top) >= CAP_X * uc and payC(uc, L['M'], top - 1) < CAP_X * uc): stop_bad.append((uc / 100, b))
    # the same stop rule on EVERY cent stake $0.02-$10,000.00 (any held amount the run bar can run), with the build's base pays
    cent_bad = []
    for b in OPTIONS:
        L = LAD[b]; top = L['cap']; n_, d_ = L['M'][top].numerator, L['M'][top].denominator; n2, d2 = L['M'][top - 1].numerator, L['M'][top - 1].denominator
        for uc in range(MIN_RUN_CENTS, 1000001):
            if not (uc * n_ // d_ >= CAP_X * uc and uc * n2 // d2 < CAP_X * uc): cent_bad.append((uc / 100, b))
    R['grid'] = dict(bets='$1.00-$100.00 in $0.10 steps (991 bets) × 1-4 live bombs',
                     top_pick_stop_rule='the board stops at the top pick (first pay >= 20× the bet) and not before, for every bet and bomb count',
                     top_pick_stop_failures=stop_bad, lowest_stop=dict(rtp=float(grid_low[0]), bet=grid_low[1][0], bombs=grid_low[1][1], pick=grid_low[1][2]),
                     cent_stakes='every cent $0.02-$10,000.00 × 1-4 live bombs', cent_stake_stop_failure_count=len(cent_bad), cent_stake_stop_failures=cent_bad[:20])
    assert not stop_bad and not cent_bad
    # ---- run-bar policies (base: 4 live bombs, LOCK IN after 3 picks), $1, $10 and $100, MAX WIN 20,000×
    #      ($1: the base pays $1.60, so DOUBLE HALF runs a $0.80 half and DOUBLE OR NOTHING $1.60)
    pol = {}
    def closed_form(bet, kind):
        """P2 / P5 in closed form from the base pay distribution alone: every base pay c (cents) is held at the first bar.
        P2 (DOUBLE OR NOTHING once): 2c with probability 1/2, 0 with 1/2.   P5 (DOUBLE HALF once): half = c // 2, keep = c - half;
        win (1/2): the bar holds 2 half with keep in the RUN BANK, CASH OUT pays keep + 2 half = c + half; lose (1/2): the RUN BANK
        returns keep, CASH OUT pays keep.  Mean c in both (fair), P5's mean is exactly P0's."""
        mw = cents(bet * MAX_WIN_X); out = {}
        def add(c, p): out[c] = out.get(c, 0) + p
        for c, p in base_dist(4, bet, 3).items():
            if c == 0: add(0, p); continue
            half, keep = c // 2, c - c // 2
            if kind == 'P2' and c >= MIN_RUN_CENTS and 2 * c <= mw: add(2 * c, p / 2); add(0, p / 2)
            elif kind == 'P5' and half >= MIN_RUN_CENTS and keep + 2 * half <= mw: add(keep + 2 * half, p / 2); add(keep, p / 2)
            else: add(c, p)
        return out
    for bet in (1, 10, 100):
        for p_ in ('P0', 'P2', 'P3', 'P5'):
            d = round_dist(bet, 4, 3, p_); s = stats(d, bet); s.pop('rtp_exact', None); s['outcomes'] = len(d)
            s['max_win_rounds'] = float(sum(p for c, p in d.items() if c >= bet * MAX_WIN_X * 100))
            if p_ in ('P2', 'P5'):                                         # the closed form must equal the enumeration, fraction for fraction
                cf = closed_form(bet, p_); assert cf == d, (p_, bet)
                s['closed_form_equals_enumeration'] = True
            if bet == 1 or p_ in ('P0', 'P2', 'P5'): s['dist_cents'] = {str(c): str(p) for c, p in sorted(d.items())}   # every pay (cents) and its exact probability
            pol[f'{p_}_{bet}'] = s
        # every action of the bar is a fair bet (a double is exactly 1/2; DOUBLE HALF doubles half, the odd cent is banked, a lost half returns the
        # RUN BANK), nothing is ever clipped (DOUBLE is shown only when B + 2 S <= MAX WIN), so the amount in play (held + RUN BANK) is a bounded
        # martingale that ends with probability 1: ANY policy over CASH OUT / DOUBLE / DOUBLE HALF returns exactly what P0 returns (optional stopping).
        assert pol[f'P2_{bet}']['rtp'] == pol[f'P0_{bet}']['rtp'] == pol[f'P3_{bet}']['rtp'] == pol[f'P5_{bet}']['rtp'], bet
        pol[f'P4_{bet}'] = dict(rtp=pol[f'P0_{bet}']['rtp'], derived='optional stopping: every bar action is fair and unclipped, so P4 = P0 exactly (simulation only for the distribution)')
    R['policies'] = pol
    # test vectors for xcheck.js: the solver's run-bar rules on 3,000 states, compared there with the build's own RunBar.compute
    import random
    rnd = random.Random(20261014); vec = []
    for i in range(3000):
        mwx = rnd.choice([20000, 20000, 500]); bet = rnd.choice([1, 2.3, 10, 37.5, 100]); mw = bet * mwx
        ammo = round(rnd.uniform(0.5, 20) * bet, 2); held = round(rnd.choice([rnd.uniform(0, 3), rnd.uniform(0, 50) * bet, rnd.uniform(0, mw * 1.1)]), 2)
        bank = round(rnd.choice([0, 0, rnd.uniform(0, 10), rnd.uniform(0, mw)]), 2)
        c = compute(held, bank, ammo, mw)
        vec.append(dict(st=dict(held=held, banked=bank, ammo=ammo, maxWin=mw), mode=c['mode'], S=c['S'], B=c['B'], half=c.get('half'), keep=c.get('keep'), show=c.get('show'), n_max=c.get('n_max')))
    # + the minimum-run edge ($0.02, run-bar v170): held 0-6 cents and around $1.00 / $2.00, with and without a RUN BANK, $1 and $10 bets
    for held in (0.0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.99, 1.0, 1.01, 1.99, 2.0, 2.01):
        for bank in (0.0, 0.8, 5.0):
            for bet in (1, 10):
                mw = bet * MAX_WIN_X; ammo = 1.6 * bet; c = compute(held, bank, ammo, mw)
                vec.append(dict(st=dict(held=held, banked=bank, ammo=ammo, maxWin=mw), mode=c['mode'], S=c['S'], B=c['B'], half=c.get('half'), keep=c.get('keep'), show=c.get('show'), n_max=c.get('n_max')))
    R['runbar_vectors'] = vec
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    json.dump(R, open(os.path.join(HERE, 'out', 'exact.json'), 'w'), indent=1, default=str)
    print(json.dumps({k: v for k, v in R.items() if k not in ('ladders', 'stops', 'strategies', 'runbar_vectors')}, indent=1, default=str)[:6000])
