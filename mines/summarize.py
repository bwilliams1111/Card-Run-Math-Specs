# MINES 20× lab pack: merges the simulation chunks (out/sim/*.json), puts each run next to its exact value (out/exact.json),
# and writes results.json (all headline numbers) and par.txt (the PAR tables, plain text).
#   cd labpack/mines && python3 -I exact.py && ./run_sims.sh && python3 -I summarize.py
import glob, json, math, os, hashlib
from fractions import Fraction as F
HERE = os.path.dirname(os.path.abspath(__file__))
EX = json.load(open(os.path.join(HERE, 'out', 'exact.json')))
BUILD = os.path.join(HERE, '..', 'builds-final', 'card-run-mines-classic-launch.html')
SHA = hashlib.sha256(open(BUILD, 'rb').read()).hexdigest()
assert SHA == EX['build_sha256'], 'exact.json was made on another build'

def merge(mode, bet):
    fs = sorted(glob.glob(os.path.join(HERE, 'out', 'sim', f'{mode}_{bet}_*.json')))
    if not fs: return None
    n = 0; s = 0; s2 = 0; hits = 0; mx = 0; ends = {}; acts = {}; hist = {}; seeds = []
    for f in fs:
        r = json.load(open(f)); assert r['bet'] == bet and r['mode'] == mode
        n += r['rounds']; s += int(r['sumCents']); s2 += int(r['sumsqCents2']); hits += r['hits']; mx = max(mx, r['maxCents']); seeds.append(r['seed'])
        for k, v in r['ends'].items(): ends[k] = ends.get(k, 0) + v
        for k, v in r['barActions'].items(): acts[k] = acts.get(k, 0) + v
        for k, v in r['hist'].items(): hist[int(k)] = hist.get(int(k), 0) + v
    unit = round(bet * 100)
    mean = F(s, n * unit); var = F(s2, n * unit * unit) - mean * mean
    sd = math.sqrt(float(var) * n / (n - 1)); se = sd / math.sqrt(n)
    return dict(rounds=n, seeds=seeds, rtp=float(mean), ci95=[float(mean) - 1.96 * se, float(mean) + 1.96 * se], half_width=1.96 * se, sd=sd,
                hit=hits / n, max_pay=mx / 100, max_x=mx / unit, ends=ends, bar_actions=acts, hist=hist)

out = dict(build=os.path.relpath(BUILD, HERE), build_sha256=SHA, runs={})
rows = []
def check(name, sim, exact):
    if sim is None: return
    inside = None if exact is None else sim['ci95'][0] <= exact <= sim['ci95'][1]
    z = None if exact is None else (sim['rtp'] - exact) / (sim['half_width'] / 1.96)
    sim['exact'] = exact; sim['exact_inside_ci'] = inside; sim['z'] = z
    sim.pop('hist', None)
    out['runs'][name] = sim
    rows.append((name, sim, exact, inside, z))
mixN = 100000
# the base mix's exact value for the actual chunk sizes: every chunk restarts r at 0, so each chunk has the same 100,000-round mix
check('base mix, $10', merge('base', 10), EX['sim_mix_exact']['10_100000']['rtp'])
check('top, $10', merge('top', 10), EX['sim_mix_exact']['top_10_100000']['rtp'])
check('top, $1.10', merge('top', 1.1), EX['sim_mix_exact']['top_1.1_100000']['rtp'])
for pol in ('P0', 'P2', 'P3', 'P4', 'P5'):
    for bet in (1, 10, 100):                       # $1: P4, P5 simulated (small held amounts; minimum run $0.02); P0 / P2 / P3 at $1 are exact only
        e = EX['policies'].get(f'{pol}_{bet}')     # P4: the derived exact value (= P0, optional stopping); the other policies: the enumerated exact value
        check(f'{pol}, ${bet}', merge(pol, bet), e['rtp'] if e else None)
def chi2_sf(x, k):                                 # survival function of the chi-square distribution with k df (regularised upper incomplete gamma, series / continued fraction)
    a = k / 2.0; x = x / 2.0
    if x <= 0: return 1.0
    if x < a + 1:
        term = tot = 1.0 / a; n = a
        for _ in range(1000):
            n += 1; term *= x / n; tot += term
            if abs(term) < abs(tot) * 1e-16: break
        return 1.0 - tot * math.exp(-x + a * math.log(x) - math.lgamma(a))
    b = x + 1 - a; c = 1e300; d = 1 / b; h_ = d
    for i in range(1, 1000):
        an = -i * (i - a); b += 2; d = an * d + b; d = 1 / (d if abs(d) > 1e-300 else 1e-300); c = b + an / c; c = c if abs(c) > 1e-300 else 1e-300; h_ *= d * c
        if abs(d * c - 1) < 1e-16: break
    return math.exp(-x + a * math.log(x) - math.lgamma(a)) * h_
# every pay the simulation saw against the exact pay distribution (P0 / P2 / P5 have 2-5 outcomes): counts, z, chi-square
for pol, bet in [(p, b) for p in ('P0', 'P2', 'P5') for b in (1, 10, 100)]:
    sim = out['runs'].get(f'{pol}, ${bet}'); e = EX['policies'].get(f'{pol}_{bet}')
    if not sim or not e or 'dist_cents' not in e: continue
    h = {}
    for f in glob.glob(os.path.join(HERE, 'out', 'sim', f'{pol}_{bet}_*.json')):
        for k, v in json.load(open(f))['hist'].items(): h[int(k)] = h.get(int(k), 0) + v
    n = sim['rounds']; rows_ = []; chi = 0.0
    for c, p in e['dist_cents'].items():
        p = float(F(p)); o = h.get(int(c), 0); ex_ = p * n; chi += (o - ex_) ** 2 / ex_
        rows_.append(dict(pay=int(c) / 100, sim=o, expected=round(ex_, 1), z=round((o - ex_) / math.sqrt(ex_ * (1 - p)), 2)))
    sim['pay_distribution_check'] = dict(rows=rows_, pays_not_in_exact=sorted(k / 100 for k in h if str(k) not in e['dist_cents']), chi2=round(chi, 3), df=len(rows_) - 1,
                                         p_value=round(chi2_sf(chi, len(rows_) - 1), 4))
out['exact'] = EX
json.dump(out, open(os.path.join(HERE, 'out', 'summary.json'), 'w'), indent=1, default=str)
for name, sim, exact, inside, z in rows:
    print(f"{name:14} n={sim['rounds']:>9,}  sim {sim['rtp']*100:8.4f}%  CI [{sim['ci95'][0]*100:.4f}, {sim['ci95'][1]*100:.4f}]  SD {sim['sd']:.4f}  hit {sim['hit']*100:.3f}%  max ${sim['max_pay']:,.2f}"
          + ('' if exact is None else f"  exact {exact*100:.4f}%  {'inside' if inside else 'OUTSIDE'} (z {z:+.2f})"))

# ------------------------------------------------------------------ results.json: the headline numbers
S = EX['strategies']; L = EX['ladders']
def strat(name_start):
    k = [n for n in S if n.startswith(name_start)][0]; return k, S[k]
pct = lambda x: round(x * 100, 4)
res = dict(build=out['build'], build_sha256=SHA, game='MINES 20×', min_run=f"${EX['constants']['min_run']:.2f} (run-bar v170: DOUBLE OR NOTHING needs a held amount >= $0.02, DOUBLE HALF a half >= $0.02)",
  run_bar='CASH OUT / DOUBLE OR NOTHING / DOUBLE HALF (RUN IT AGAIN and RUN HALF removed in v170)',
  base_rtp_exact={}, top_pick={}, rounding_effect={}, double=dict(p_win=EX['double']['p_win'], rtp_pct=pct(EX['double']['rtp'])),
  top_pay={}, policies={}, simulation={}, grid=EX['grid'])
for n, v in S.items():
    res['base_rtp_exact'][n] = {f'${b}': dict(rtp_pct=pct(s['rtp']), sd=round(s['sd'], 4), hit_pct=pct(s['hit']), top_x=s['top_x'], top_one_in=round(s['top_one_in'], 3)) for b, s in v.items()}
res['base_rtp_exact']['any stop'] = '93.0000% exactly before rounding (pay = floor(bet cents × Fair × 0.93)); lowest after rounding to the cent: ' + \
    ', '.join(f"${b}: {pct(v['rtp'])}% ({v['bombs']} live, pick {v['stop']})" for b, v in EX['lowest_any_stop'].items()) + \
    f"; lowest on the whole $0.10 grid: {pct(EX['grid']['lowest_stop']['rtp'])}% (${EX['grid']['lowest_stop']['bet']:.2f}, {EX['grid']['lowest_stop']['bombs']} live, pick {EX['grid']['lowest_stop']['pick']})"
for b, v in EX['top_pick'].items():
    res['top_pick'][f'{b} live'] = dict(pick=v['pick'], x=round(v['x'], 6), one_in=round(v['one_in'], 3), rtp_exact_pct=pct(v['rtp_exact']),
                                         rtp_1_pct=pct(v['rtp_1']), rtp_10_pct=pct(v['rtp_10']), rtp_100_pct=pct(v['rtp_100']), unlock_pick=L[b]['unlock_k'])
n, v = strat('typical')
res['rounding_effect'] = {f'typical (4 live, LOCK IN after 3) at ${b}': pct(s['rtp']) for b, s in v.items()}
res['rounding_effect'].update({f'lowest stop at ${b}': pct(x['rtp']) for b, x in EX['lowest_any_stop'].items()})
res['rounding_effect']['lowest stop on the $0.10 grid'] = pct(EX['grid']['lowest_stop']['rtp'])
ex = [r['rtp_exact'] for v in L.values() for r in v['rows']]
res['rounding_effect']['before rounding to the cent'] = f'every pick, every bomb count, the top pick included: {min(ex)*100:.4f}%-{max(ex)*100:.4f}%'
tp = EX['top_pick']
res['top_pay'] = dict(base='the top pick, paid in full: ' + ', '.join(f"{tp[b]['x']:.4f}× with {b} live (pick {tp[b]['pick']}, 1 in {tp[b]['one_in']:.2f})" for b in ('1', '2', '3', '4')),
                      round='20,000× the bet (MAX WIN) through the run bar')
for name, sim in out['runs'].items():
    res['simulation'][name] = dict(rounds=sim['rounds'], seeds=sim['seeds'], rtp_pct=pct(sim['rtp']), ci95_pct=[pct(x) for x in sim['ci95']], sd=round(sim['sd'], 4),
                                   hit_pct=pct(sim['hit']), max_pay=sim['max_pay'], exact_pct=None if sim['exact'] is None else pct(sim['exact']),
                                   exact_inside_ci=sim['exact_inside_ci'], z=None if sim['z'] is None else round(sim['z'], 2), ends=sim['ends'])
    if 'pay_distribution_check' in sim: res['simulation'][name]['pay_distribution_check'] = sim['pay_distribution_check']
for k, v in EX['policies'].items():
    if 'sd' not in v: continue                       # P4: set below (derived mean)
    res['policies'][k] = dict(rtp_pct=pct(v['rtp']), sd=round(v['sd'], 4), hit_pct=pct(v['hit']), top_pay=v['top_pay'], top_one_in=round(v['top_one_in'], 3))
for b_ in (1, 10, 100):
    res['policies'][f'P4_{b_}'] = dict(rtp_pct=pct(EX['policies'][f'P4_{b_}']['rtp']), note='simulation only for the distribution (random choices: the state graph cycles through the RUN BANK); the mean is derived = P0 (every bar action is fair and unclipped: optional stopping)')
json.dump(res, open(os.path.join(HERE, 'results.json'), 'w'), indent=1, ensure_ascii=False)

# ------------------------------------------------------------------ par.txt
W = []
w = W.append
w('CARD RUN MINES 20× — PAR SHEET (final launch build)')
w(f'build {out["build"]}  sha256 {SHA}')
w('All exact values from exact.py (fractions; pays in the build\'s own integer cents). Simulations: sim.js through the shipped code.')
w('')
w('GAME: 25 tiles = 21 gems + 4 bombs; the player sets 1-4 bombs live (the rest shielded = safe picks). M(k) = Fair(k) × 0.93 exactly,')
w('Fair(k) = C(25,k)/C(25-B,k). Pay = floor(bet cents × M(k)), one rounding. 20× is the build target: the TOP PICK is the first pick with')
w('M >= 20; it pays in full and the board stops there. Display = floor4(M) (2 decimals on the board). LOCK IN from Display >= 1.01.')
w('Run bar after any win: CASH OUT / DOUBLE OR NOTHING / DOUBLE HALF (+ the RUN BANK). DOUBLE OR NOTHING: 19 gems / 2 live / 4 duds, 6 gems first = exactly 1/2.')
w('DOUBLE HALF doubles half of the held amount and puts the other half (plus an odd cent) in the RUN BANK. (RUN IT AGAIN and RUN HALF were removed in v170.)')
w('Run cap 1,000× the build win (the run that crosses it pays in full). MAX WIN 20,000× the bet. Bets $1.00-$100.00 in $0.10 steps.')
w(f'Minimum run ${EX["constants"]["min_run"]:.2f} (run-bar v170): DOUBLE OR NOTHING needs a held amount >= $0.02, DOUBLE HALF a half >= $0.02.')
w('')
for b in ('1', '2', '3', '4'):
    v = L[b]
    w(f'LADDER — {b} live bomb{"s" if b != "1" else ""} ({v["safe"]} safe tiles; LOCK IN from pick {v["unlock_k"]}; top pick {v["cap_k"]} = {v["top_x"]:.4f}×, paid in full)')
    w(f'{"pick":>4} {"x bet":>10} {"1 in":>9} {"RTP exact":>9} {"$1 pay":>8} {"RTP $1":>8} {"$10 pay":>9} {"RTP $10":>8} {"$100 pay":>10} {"RTP $100":>9}')
    for r in v['rows']:
        w(f'{r["k"]:>4} {r["display"]:>9.4f}{" " if r["lock"] else "*"} {r["one_in"]:>9.3f} {r["rtp_exact"]*100:>8.4f}% {r["pay_1"]:>8.2f} {r["rtp_1"]*100:>7.3f}% {r["pay_10"]:>9.2f} {r["rtp_10"]*100:>7.3f}% {r["pay_100"]:>10.2f} {r["rtp_100"]*100:>8.4f}%')
    w('')
w('* below 1.01×: no LOCK IN at that pick (the player must pick on). x bet = floor4(M); RTP exact = M × P(reach) before rounding to the cent.')
w('')
w('BASE GAME BY STRATEGY (exact)')
w(f'{"strategy":<74} {"bet":>5} {"RTP":>9} {"SD":>8} {"hit":>8} {"top":>8} {"top 1 in":>9}')
for n, v in S.items():
    for b, s in v.items():
        w(f'{n:<74} {"$"+str(b):>5} {s["rtp"]*100:>8.4f}% {s["sd"]:>8.4f} {s["hit"]*100:>7.3f}% {s["top_x"]:>7.3f}× {s["top_one_in"]:>9.3f}')
w('Every stop, the top pick included, returns exactly 93% before rounding to the cent; lowest after rounding: ' +
  ', '.join(f"${b} {x['rtp']*100:.4f}% ({x['bombs']} live, pick {x['stop']})" for b, x in EX['lowest_any_stop'].items()) +
  f"; lowest on the whole $0.10 grid {EX['grid']['lowest_stop']['rtp']*100:.4f}% (${EX['grid']['lowest_stop']['bet']:.2f}, {EX['grid']['lowest_stop']['bombs']} live, pick {EX['grid']['lowest_stop']['pick']}).")
w('')
n, v = strat('typical')
w('PAY DISTRIBUTION — typical play (4 live bombs, LOCK IN after 3 picks), $10:  ' + ', '.join(f'{x:.3f}× p={p:.6f}' for x, p in v['10']['dist'] if True))
n, v = strat('best')
w('PAY DISTRIBUTION — ' + n + ', $10:  ' + ', '.join(f'{x:.3f}× p={p:.6f}' for x, p in v['10']['dist']))
w('')
w(f'DOUBLE OR NOTHING: P(6 gems before a live bomb) = C(19,6)/C(21,6) = {EX["double"]["p_win"]}; return {EX["double"]["rtp"]*100:.4f}% of the amount run.')
w('')
w('RUN-BAR POLICIES (base: 4 live bombs, LOCK IN after 3 picks; MAX WIN 20,000×)')
w('P0 cash out · P2 double once · P3 double whenever shown (to the cap) · P4 random shown button (CASH OUT / DOUBLE OR NOTHING / DOUBLE HALF) every bar · P5 DOUBLE HALF once, then cash out · (P1, RUN IT AGAIN once, retired in v170)')
w(f'{"policy":<8} {"bet":>5} {"exact RTP":>10} {"SD":>9} {"hit":>8} {"top pay":>12}   {"sim RTP":>9} {"95% CI":>21} {"rounds":>9} {"sim SD":>8} {"sim hit":>8} {"sim max":>12}  in CI')
for p_ in ('P0', 'P2', 'P3', 'P4', 'P5'):
    for b in (1, 10, 100):
        e = EX['policies'].get(f'{p_}_{b}'); sim = out['runs'].get(f'{p_}, ${b}')
        es = (f'{e["rtp"]*100:>9.4f}% {e["sd"]:>9.4f} {e["hit"]*100:>7.3f}% {e["top_pay"]:>12,.2f}' if 'sd' in e else f'{e["rtp"]*100:>9.4f}%* {"":>9} {"":>8} {"":>12}') if e else f'{"sim only":>10} {"":>9} {"":>8} {"":>12}'
        ss = f'{sim["rtp"]*100:>8.4f}% [{sim["ci95"][0]*100:.4f}, {sim["ci95"][1]*100:.4f}]% {sim["rounds"]:>9,} {sim["sd"]:>8.4f} {sim["hit"]*100:>7.3f}% {sim["max_pay"]:>12,.2f}  {"n/a" if sim["exact_inside_ci"] is None else "yes" if sim["exact_inside_ci"] else "NO"}' if sim else '(not run)'
        w(f'{p_:<8} {"$"+str(b):>5} {es}   {ss}')
w('* P4: the mean is derived, not enumerated: every action on the bar is a fair, unclipped bet (DOUBLE is shown only when RUN BANK + 2 × held <= MAX WIN), so held + RUN BANK is a bounded')
w('  martingale that ends with probability 1 and ANY policy over CASH OUT / DOUBLE / DOUBLE HALF returns exactly what P0 returns (optional stopping). P4 is simulation only for the distribution.')
w('P5 closed form: every base pay c (cents) held at the first bar becomes (c + floor(c/2)) with probability 1/2 (win: 2 halves + the RUN BANK keep) and ceil(c/2) with 1/2 (lost half: the RUN BANK returns),')
w('  when floor(c/2) >= $0.02; exact.py asserts this equals the full enumeration fraction for fraction. Same mean as P0 (so the same RTP), larger SD; the hit rate is P0\'s (a lost half still returns the RUN BANK).')
for pol, bet in [(p, b) for p in ('P0', 'P2', 'P5') for b in (1, 10, 100)]:
    sim = out['runs'].get(f'{pol}, ${bet}')
    if sim and 'pay_distribution_check' in sim:
        pc = sim['pay_distribution_check']
        w(f'{pol} ${bet}, every pay vs the exact distribution: ' + ', '.join(f"${r['pay']:.2f} {r['sim']:,} (exact {r['expected']:,.1f}, z {r['z']:+.2f})" for r in pc['rows'])
          + f"; other pays seen: {pc['pays_not_in_exact'] or 'none'}; chi-square {pc['chi2']} on {pc['df']} df (p = {pc['p_value']})")
w('$1: the base pays $1.60, so P5 doubles a $0.80 half (P5 pays $0 / $0.80 / $2.40) and P4\'s halves and RUN BANK returns go down to $0.02.')
w('P4 $1 is the small-amount check through the shipped code: its rounds end on pays down to $0.02 (pays of $0.01-$0.99 in ' +
  f"{sum(v for f in glob.glob(os.path.join(HERE, 'out', 'sim', 'P4_1_*.json')) for k, v in json.load(open(f))['hist'].items() if 0 < int(k) < 100):,} rounds).")
sim = out['runs'].get('base mix, $10')
if sim:
    w('')
    w(f'BASE SIMULATION ($10; round r: bombs 1+((r>>2)%4), LOCK IN after 1+(r%6) picks): {sim["rounds"]:,} rounds, seeds {sim["seeds"][0]}-{sim["seeds"][-1]}: '
      f'{sim["rtp"]*100:.4f}% [{sim["ci95"][0]*100:.4f}, {sim["ci95"][1]*100:.4f}] vs exact {sim["exact"]*100:.4f}% ({"inside" if sim["exact_inside_ci"] else "OUTSIDE"}); '
      f'SD {sim["sd"]:.4f}, hit {sim["hit"]*100:.3f}%, max ${sim["max_pay"]:.2f}')
for nm, lab in (('top, $10', '$10'), ('top, $1.10', '$1.10')):
    sim = out['runs'].get(nm)
    if sim:
        w(f'TOP-PICK SIMULATION ({lab}; round r: bombs 1+(r%4), never LOCK IN: the board runs to its top pick or a live bomb): {sim["rounds"]:,} rounds, seeds {sim["seeds"][0]}-{sim["seeds"][-1]}: '
          f'{sim["rtp"]*100:.4f}% [{sim["ci95"][0]*100:.4f}, {sim["ci95"][1]*100:.4f}] vs exact {sim["exact"]*100:.4f}% ({"inside" if sim["exact_inside_ci"] else "OUTSIDE"}); '
          f'SD {sim["sd"]:.4f}, hit {sim["hit"]*100:.3f}%, max ${sim["max_pay"]:.2f}, ends {sim["ends"]}')
w('')
g = EX['grid']
w(f'STOP RULE, every bet: with the build\'s Classic.payC the board stops at the top pick, and not before, on all 991 bets of the $0.10 grid')
w(f'and 1-4 live bombs ({len(g["top_pick_stop_failures"])} failures), and on every cent stake $0.02-$10,000.00 ({g["cent_stake_stop_failure_count"]} failures).')
w('(The previous build worked the pay out in floating point: 79 of the 991 bets missed the 20× stop. Fixed: pays are integer cents.)')
open(os.path.join(HERE, 'par.txt'), 'w').write('\n'.join(W) + '\n')
print('wrote results.json, par.txt, out/summary.json')
