#!/usr/bin/env python3
"""Collects out/exact.json and the simulation outputs (out/base_*.json, out/pol_*.json) into results.json, par.txt and
out/ci_checks.txt (every exact value against its simulation's 95% CI).   usage (inside labpack/crash/): python3 -I summarize.py"""
import json, glob, os, math, re
HERE = os.path.dirname(os.path.abspath(__file__)); O = lambda *p: os.path.join(HERE, *p)
ex = json.load(open(O('out', 'exact.json'))); Z = 1.959964
SHA = ex['build_sha256']
checks = []
def chk(name, exact, mean, se, n, note=''):
    TOL = 1e-9   # float summation of 10^6 equal pays leaves ~1e-12 of noise; a zero-variance statistic must match to 1e-9
    lo, hi = mean - Z * se, mean + Z * se; z = (mean - exact) / se if se > 0 else (0.0 if abs(mean - exact) < TOL else float('inf'))
    checks.append({'check': name, 'exact': exact, 'sim': mean, 'ci95': [lo, hi], 'z': z, 'inside': lo - TOL <= exact <= hi + TOL, 'rounds': n, 'note': note})

# ------------------------------------------------------------------ base
base = {}
for S in [100, 1000, 10000]:
    fs = sorted(glob.glob(O('out', f'base_{S}_s*.json'))); ds = [json.load(open(f)) for f in fs]
    for d in ds: assert d['sha']['build'] == SHA, f'{d} ran on another build'
    N = sum(d['rounds'] for d in ds); T = ds[0]['top_red']; reached = [sum(d['reached_counts'][j] for d in ds) for j in range(T)]
    e = ex['base'][str(S)]; stops = []
    for j in range(1, T + 1):
        p = reached[j - 1] / N; m = e['stops'][j - 1]['pays_cents'] / S; mean = p * m; sd = math.sqrt(max(0, p * m * m - mean * mean)); se = sd / math.sqrt(N)
        stops.append({'red': j, 'rtp': mean, 'ci95': [mean - Z * se, mean + Z * se], 'sd': sd, 'hit': p, 'exact_rtp': e['stops'][j - 1]['rtp'], 'exact_hit': e['stops'][j - 1]['hit']})
        chk(f'base ${S/100:.2f} LOCK IN at red #{j}', e['stops'][j - 1]['rtp'], mean, se, N)
    # uniform random stop: pool means and second moments
    s1 = sum(d['rounds'] * d['uniform_random_stop']['rtp'] for d in ds) / N
    s2 = sum(d['rounds'] * (d['uniform_random_stop']['sd'] ** 2 + d['uniform_random_stop']['rtp'] ** 2) for d in ds) / N
    usd = math.sqrt(s2 - s1 * s1); uh = sum(d['rounds'] * d['uniform_random_stop']['hit'] for d in ds) / N
    chk(f'base ${S/100:.2f} uniform random stop', e['uniform_random_stop']['rtp'], s1, usd / math.sqrt(N), N)
    # the step probability red j -> red j+1 (pooled over j = 1..T-1): exact 5/6
    tr = sum(reached[:T - 1]); sc = sum(reached[1:T]); pst = sc / tr
    chk(f'base ${S/100:.2f} P(next red before a bust) pooled', 5 / 6, pst, math.sqrt(pst * (1 - pst) / tr), N, 'binomial SE over red->red transitions')
    base[S] = {'rounds': N, 'seeds': [d['seed'] for d in ds], 'stops': stops, 'auto': stops[-1], 'uniform': {'rtp': s1, 'sd': usd, 'ci95': [s1 - Z * usd / math.sqrt(N), s1 + Z * usd / math.sqrt(N)], 'hit': uh},
               'max_observed_x': max(d['max_observed_x'] for d in ds), 'cards_per_round': sum(d['rounds'] * d['cards_per_round'] for d in ds) / N, 'p_step': pst}

# ------------------------------------------------------------------ policies
pol = {}
for f in sorted(glob.glob(O('out', 'pol_*.json'))):
    d = json.load(open(f)); assert d['build_sha256'] == SHA
    k = (d['stake'], d['build'], d['policy']); pol.setdefault(k, []).append(d)
polres = {}
for (S, B, P), ds in sorted(pol.items()):
    N = sum(d['rounds'] for d in ds); m = sum(d['rounds'] * d['rtp'] for d in ds) / N
    s2 = sum(d['rounds'] * (d['sd'] ** 2 + d['rtp'] ** 2) for d in ds) / N; sd = math.sqrt(max(0, s2 - m * m)); se = sd / math.sqrt(N)
    e = ex['policies'][f'{S}_{B}_{P}']
    r = {'stake': S, 'build': B, 'policy': P, 'rounds': N, 'seeds': [d['seed'] for d in ds], 'rtp': m, 'ci95': [m - Z * se, m + Z * se], 'sd': sd,
         'hit': sum(d['rounds'] * d['hit'] for d in ds) / N, 'max_paid_x': max(d['max_paid_x'] for d in ds), 'run_cap_rounds': sum(d['run_cap_rounds'] for d in ds),
         'max_win_rounds': sum(d['max_win_rounds'] for d in ds), 'exact_rtp': e.get('rtp'), 'exact_sd': e.get('sd'), 'exact_hit': e.get('hit'), 'exact_max_x': e.get('max_pay_x')}
    if e.get('rtp') is not None:
        chk(f'policy ${S/100:.2f} {B} {P}', e['rtp'], m, se, N)
        h = r['hit']; chk(f'policy ${S/100:.2f} {B} {P} hit rate', e['hit'], h, math.sqrt(max(0, h * (1 - h)) / N), N, 'binomial SE')
    else:
        ok = r['ci95'][0] <= e['upper_bound_rtp']
        checks.append({'check': f'policy ${S/100:.2f} {B} {P} (no exact value; bound P4 <= P0 = {e["upper_bound_rtp"]:.6f})', 'exact': None, 'sim': m, 'ci95': r['ci95'],
                       'z': (m - e['upper_bound_rtp']) / se if se else 0, 'inside': ok, 'rounds': N, 'note': 'consistent with the bound when CI low <= P0'})
    polres[f'{S}_{B}_{P}'] = r

# ------------------------------------------------------------------ investigate CI misses: per-seed spread of the same statistic
misses = [c for c in checks if not c['inside']]
with open(O('out', 'ci_checks.txt'), 'w') as f:
    f.write(f'build sha256 {SHA}\n95% CI checks: {len(checks)} ({len(checks) - len(misses)} inside, {len(misses)} outside)\n'
            'With this many checks, about 5% are expected outside by chance; base stops share the same rounds (correlated).\n\n')
    for c in checks:
        f.write(f"{'ok  ' if c['inside'] else 'OUT '} {c['check']:62s} exact {('%.6f' % c['exact']) if c['exact'] is not None else '   -    '}  sim {c['sim']:.6f}  "
                f"CI [{c['ci95'][0]:.6f}, {c['ci95'][1]:.6f}]  z {c['z']:+.2f}  n {c['rounds']:,}  {c['note']}\n")
    if misses:
        f.write('\nINVESTIGATION of the values outside their CI (per-seed results of the same statistic):\n')
        for c in misses:
            mm = re.match(r'base \$(\d+\.\d+) LOCK IN at red #(\d+)', c['check'])
            if mm:
                S = int(round(float(mm.group(1)) * 100)); j = int(mm.group(2))
                for fpath in sorted(glob.glob(O('out', f'base_{S}_s*.json'))):
                    d = json.load(open(fpath)); s = d['stops'][j - 1]; f.write(f"   seed {d['seed']}: {s['rtp']:.6f}  CI [{s['ci95'][0]:.6f}, {s['ci95'][1]:.6f}]\n")
                # independent follow-up rounds (run_all.sh: out/inv_base_<bet>_s*.json, seeds not used above): the same stop alone and pooled
                inv = [json.load(open(x)) for x in sorted(glob.glob(O('out', f'inv_base_{S}_s*.json')))]
                if inv:
                    allr = [json.load(open(x)) for x in sorted(glob.glob(O('out', f'base_{S}_s*.json')))]
                    for label, ds in (('follow-up only', inv), ('main + follow-up', allr + inv)):
                        N = sum(d['rounds'] for d in ds); p = sum(d['reached_counts'][j - 1] for d in ds) / N; m = ex['base'][str(S)]['stops'][j - 1]['pays_cents'] / S
                        mean = p * m; se = math.sqrt(max(0, p * m * m - mean * mean)) / math.sqrt(N); zz = (mean - c['exact']) / se
                        f.write(f"   {label}: {N:,} rounds (seeds {', '.join(str(d['seed']) for d in ds)}): {mean:.6f} CI [{mean - Z*se:.6f}, {mean + Z*se:.6f}] z {zz:+.2f} -> exact {'inside' if abs(zz) <= Z else 'OUTSIDE'}\n")
                        c.setdefault('followup', {})[label] = {'rounds': N, 'sim': mean, 'z': zz}
            f.write(f"   {c['check']}: |z| = {abs(c['z']):.2f}; P(|z| >= that) = {math.erfc(abs(c['z']) / math.sqrt(2)):.4f}\n")

# ------------------------------------------------------------------ results.json
MINRUN = ex['constants_parsed']['MIN_RUN']; RBV = ex['constants_parsed']['run_bar_version']
CMP = json.load(open(O('out', 'compare_prev.json'))) if os.path.exists(O('out', 'compare_prev.json')) else None
small_sims = {P: polres.get(f'100_lock1_{P}') for P in ['P0', 'P2', 'P3', 'P4', 'P5']}
R = {'game': f'Card Run CRASH 20× (launch build, batch 3; run-bar v{RBV}: CASH OUT / DOUBLE OR NOTHING / DOUBLE HALF; minimum run ${MINRUN/100:.2f}; RUN IT AGAIN and RUN HALF removed)', 'build': ex['build'], 'build_sha256': SHA, 'constants': ex['constants_parsed'],
     'headline': {
         'base_rtp_nominal_any_stop': ex['base']['1000']['nominal_rtp_every_stop'],
         'base_rtp_exact_by_bet': {S: {'best_stop': ex['base'][str(S)]['best_stop'], 'worst_stop': ex['base'][str(S)]['worst_stop'], 'auto_no_tap': ex['base'][str(S)]['auto_no_tap']['rtp'],
                                       'uniform_random_stop': ex['base'][str(S)]['uniform_random_stop']['rtp']} for S in [100, 1000, 10000]},
         'base_rtp_bet_grid_worst': ex['bet_grid']['worst'], 'base_sim_10': {'auto_rtp': base[1000]['auto']['rtp'], 'auto_ci95': base[1000]['auto']['ci95'], 'rounds': base[1000]['rounds'],
                                                                             'uniform_rtp': base[1000]['uniform']['rtp'], 'uniform_ci95': base[1000]['uniform']['ci95']},
         'top_pay': {'x_bet_at_10': ex['base']['1000']['top_pay_x'], 'one_in': ex['base']['1000']['top_pay_one_in'], 'red': ex['base']['1000']['top_red']},
         'auto_sd': ex['base']['1000']['auto_no_tap']['sd'], 'auto_hit': ex['base']['1000']['auto_no_tap']['hit'],
         'double_rtp_played_out': ex['double']['played_out_rtp'], 'double_worst_lock_first_card': ex['double']['worst_lock_first_card_100_to_3000_cents'],
         'max_win_x': ex['constants_parsed']['MAX_WIN_X'], 'run_bar_version': RBV, 'min_run_cents': MINRUN,
         'small_amounts': {
             'note': 'run-bar v170: the minimum run is $0.02 (DOUBLE OR NOTHING from a held $0.02, DOUBLE HALF from $0.04). A double is exact (no rounding); only the LOCK IN offers of DOUBLE OR NOTHING round down to the cent. Small = held $0.02-$0.99, reported apart from $1.00 and up.',
             'double_lowest_offer_table_small_amounts': ex['double']['small_amounts_lowest_offer_table'], 'double_amounts_with_a_zero_offer_cents': ex['double']['amounts_with_a_zero_offer'],
             'double_lock_first_card_lowest_small_2_to_99_cents': ex['double']['worst_lock_first_card_small_amount_2_to_99_cents'],
             'double_lock_first_card_lowest_100_to_3000_cents': ex['double']['worst_lock_first_card_100_to_3000_cents'],
             'double_single_offer_lowest_small_2_to_99_cents': ex['double']['worst_single_offer_small_amount_2_to_99_cents'],
             'double_single_offer_lowest_100_to_3000_cents': ex['double']['worst_single_offer_100_to_3000_cents'],
             'double_zero_offers': ex['double']['zero_offers_small_amounts'],
             'bet_1_lock1_policies': {P: {'exact_rtp': ex['policies'][f'100_lock1_{P}'].get('rtp'), 'exact_sd': ex['policies'][f'100_lock1_{P}'].get('sd'),
                                          'upper_bound_rtp': ex['policies'][f'100_lock1_{P}'].get('upper_bound_rtp'),
                                          'sim_rtp': v and v['rtp'], 'sim_ci95': v and v['ci95'], 'sim_rounds': v and v['rounds'], 'sim_seeds': v and v['seeds']} for P, v in small_sims.items()}}},
     'exact': {'base': ex['base'], 'bet_grid': ex['bet_grid'], 'double': ex['double'], 'rounding': ex['rounding'], 'policies': ex['policies'], 'policy_definitions': ex['policy_definitions']},
     'simulation': {'base': {str(S): v for S, v in base.items()}, 'policies': polres},
     'ci_checks': {'total': len(checks), 'outside': len(misses), 'outside_list': [{'check': c['check'], 'exact': c['exact'], 'sim': c['sim'], 'ci95': c['ci95'], 'z': c['z'],
                                                                                  'followup': c.get('followup')} for c in misses]},
     'comparison_with_previous_run': CMP and {'previous_build_sha256': CMP['previous_build_sha256'], 'previous_folder': CMP['previous_folder'], 'runs_summary': CMP['summary'],
                                             'runs_changed': [r for r in CMP['runs'] if r['status'] == 'CHANGED'], 'runs_identical': [r['file'] for r in CMP['runs'] if r['status'] == 'IDENTICAL'],
                                             'runs_new': [r['file'] for r in CMP['runs'] if r['status'].startswith('NEW')], 'exact_policies': CMP['exact_policies'],
                                             'exact_policies_changed': CMP['exact_policies_changed'], 'ignored_fields': CMP['volatile_fields_ignored']}}
json.dump(R, open(O('results.json'), 'w'), indent=1)

# ------------------------------------------------------------------ par.txt
L = []; w = L.append
b10 = ex['base']['1000']
w(f'CARD RUN  CRASH 20×  —  PAR SHEET (launch build, batch 3; run-bar v{RBV}, minimum run ${MINRUN/100:.2f})'); w('=' * 100)
w(f'Build: builds-final/card-run-crash-classic-launch.html   sha256 {SHA}')
w('Bets $1.00 to $100.00 in $0.10 steps · max win 20,000× the bet per round · pays rounded down to the cent · every card a fresh draw (8-deck shoe, replaced)')
w('Ladder: red #j pays floor(0.93 × 1.2^(j−1) × bet) (exact integer arithmetic); red #18 is the top (pays in full, ends the build).')
w('Bust: after the first red, a club straight after a club or a spade straight after a spade. P(next red before a bust) = 5/6 exactly.')
w(''); w('1. PAY TABLE (build)'); w('-' * 100)
w(f"{'red':>4} {'× bet':>9} {'P(reach)':>10} {'1 in':>8} {'RTP $1':>9} {'RTP $10':>9} {'RTP $100':>9} {'pays $1':>9} {'pays $10':>10} {'pays $100':>11}")
for j in range(1, b10['top_red'] + 1):
    r1, r10, r100 = (ex['base'][s]['stops'][j - 1] for s in ('100', '1000', '10000'))
    w(f"{j:>4} {r10['nominal_x']:>9.4f} {r10['p_reach']:>10.6f} {r10['one_in']:>8.3f} {r1['rtp']*100:>8.4f}% {r10['rtp']*100:>8.4f}% {r100['rtp']*100:>8.4f}% "
      f"{r1['pays_cents']/100:>9.2f} {r10['pays_cents']/100:>10.2f} {r100['pays_cents']/100:>11.2f}")
w('Nominal RTP of every stop: 0.93 × 1.2^(j−1) × (5/6)^(j−1) = 93.0000% (when you lock in does not change the return).')
w(''); w('2. BASE RTP BY STRATEGY (exact; rounding to the cent included)'); w('-' * 100)
w(f"{'strategy':44s} {'$1':>10} {'$10':>10} {'$100':>10}   {'SD ($10)':>9} {'hit ($10)':>10}")
def row(name, f, sd=None, hit=None): w(f"{name:44s} {f('100')*100:>9.4f}% {f('1000')*100:>9.4f}% {f('10000')*100:>9.4f}%   {(sd if sd is not None else float('nan')):>9.4f} {(hit if hit is not None else float('nan')):>10.6f}")
row('best stop (red #1 at every bet)', lambda s: ex['base'][s]['best_stop']['rtp'], b10['stops'][0]['sd'], b10['stops'][0]['hit'])
row('AUTO, never tap (red #18 or bust)', lambda s: ex['base'][s]['auto_no_tap']['rtp'], b10['auto_no_tap']['sd'], b10['auto_no_tap']['hit'])
row('uniformly random stop (#1..#18)', lambda s: ex['base'][s]['uniform_random_stop']['rtp'], b10['uniform_random_stop']['sd'], b10['uniform_random_stop']['hit'])
w(f"{'worst stop at that bet':44s} " + ' '.join(f"{ex['base'][s]['worst_stop']['rtp']*100:>9.4f}%" for s in ('100', '1000', '10000')))
w('worst stops: ' + ', '.join(f"${int(s)/100:.2f} red #{ex['base'][s]['worst_stop']['red']}" for s in ('100', '1000', '10000')))
g = ex['bet_grid']; w(f"Whole bet grid (991 bets): lowest {g['worst']['rtp']*100:.4f}% (bet ${g['worst']['bet_cents']/100:.2f}, LOCK IN at red #{g['worst']['red']}); highest {g['best']['rtp']*100:.4f}%; "
                      f"AUTO between {g['auto_min']*100:.4f}% and {g['auto_max']*100:.4f}%.")
w(f"Top pay: red #18 = {b10['top_pay_x']:.4f}× at $10 ({ex['base']['100']['top_pay_x']:.2f}× at $1), 1 in {b10['top_pay_one_in']:.3f} builds. Max win per round (with runs): 20,000× the bet.")
w(f"AUTO pay distribution ($10): 20.633× with p {b10['auto_no_tap']['p_reach']:.6f}, 0 otherwise. Uniform random stop distribution: see results.json exact.base.1000.uniform_random_stop.")
w(''); w('3. DOUBLE OR NOTHING (exact); RUN IT AGAIN and RUN HALF are removed in this build'); w('-' * 100)
db = ex['double']; w(f"DOUBLE OR NOTHING: first to three, every card red or black 1/2 → played out exactly {db['played_out_rtp']*100:.4f}%; LOCK IN offers = floor(2 × amount × P(win)) ≤ fair.")
w('   P(three reds first) by score r–b: ' + ', '.join(f'{k} {v}' for k, v in db['P_three_reds_first'].items()))
for R, v in db['by_amount'].items(): w(f"   amount ${int(R)/100:,.2f}: lock at first card {v['lock_first_card']*100:.4f}% · lock when ahead {v['lock_when_ahead']*100:.4f}% · played out {v['played_out']*100:.4f}%")
w(f"   lowest (lock at the first card, amounts $1.00–$30.00): {db['worst_lock_first_card_100_to_3000_cents']['rtp']*100:.4f}% at ${db['worst_lock_first_card_100_to_3000_cents']['amount_cents']/100:.2f}")
ds_, do_, dl_ = db['worst_lock_first_card_small_amount_2_to_99_cents'], db['worst_single_offer_small_amount_2_to_99_cents'], db['worst_single_offer_100_to_3000_cents']
w(f"   SMALL AMOUNTS $0.02–$0.99: lock at the first card lowest {ds_['rtp']*100:.4f}% at ${ds_['amount_cents']/100:.2f} (offers ${ds_['offers_cents']['1-0']/100:.2f} at 1–0, ${ds_['offers_cents']['0-1']/100:.2f} at 0–1)")
w(f"   single LOCK IN offer furthest below fair: ${do_['amount_cents']/100:.2f} at {do_['score_r_b']}: offer ${do_['offer_cents']/100:.2f} vs fair ${do_['fair_cents']/100:.4f} ({do_['offer_over_fair']*100:.2f}% of fair); "
  f"$1.00–$30.00: {dl_['offer_over_fair']*100:.2f}% of fair (${dl_['amount_cents']/100:.2f} at {dl_['score_r_b']}: ${dl_['offer_cents']/100:.2f} vs ${dl_['fair_cents']/100:.4f})")
w(f"   $0.00 offers (LOCK IN shown, pays nothing): {', '.join(db['zero_offers_small_amounts']) or 'none'} (amounts $0.02-$30.00 with any $0.00 offer: {', '.join('$%.2f' % (x/100) for x in db['amounts_with_a_zero_offer'])})")
w('   LOWEST LOCK IN OFFER at every small amount (the shipped floor(2 × amount × P(win from the score)); lowest offer is always at 0–2 [P = 1/8]); worst offer relative to its fair value; lock-at-first-card return:')
w(f"      {'amount':>7} {'lowest offer':>13} {'at':>5} {'worst vs fair':>14} {'(score: offer)':>16} {'lock at card 1':>15}")
for R, v in db['small_amounts_per_amount'].items():
    w(f"      ${int(R)/100:>6.2f} {'$%.2f' % (v['lowest_offer_cents']/100):>13} {','.join(v['lowest_offer_at']):>5} {v['worst_offer_over_fair']*100:>13.2f}% {v['worst_score'] + ': $%.2f' % (v['worst_offer_cents']/100):>16} {v['lock_first_card_rtp']*100:>14.3f}%")
w(''); w('4. RUN-BAR POLICIES (whole round, RTP of the bet; exact model and simulation of the shipped code)'); w('-' * 100)
for k, v in ex['policy_definitions'].items(): w(f'   {k}: {v}')
w('   P5 closed form: at a held H of $0.04 or more the round pays H - half or H + half with probability 1/2 each (half = floor(H/2)): mean exactly H, so P5 = P0 for every build and bet; the SD is half / bet higher.')
w(f"{'bet':>5} {'build':6} {'pol':4} {'exact RTP':>11} {'sim RTP':>10} {'95% CI':>23} {'rounds':>10} {'SD exact':>9} {'SD sim':>8} {'hit exact':>10} {'hit sim':>9} {'max pay ×':>11}")
for k, r in polres.items():
    e = r['exact_rtp']
    w(f"${r['stake']//100:>4} {r['build']:6} {r['policy']:4} {(('%10.4f%%' % (e*100)) if e is not None else '   ≤ P0 (*)'):>11} {r['rtp']*100:>9.4f}% [{r['ci95'][0]*100:>9.4f}%, {r['ci95'][1]*100:>9.4f}%] {r['rounds']:>10,} "
      f"{(('%9.3f' % r['exact_sd']) if r['exact_sd'] is not None else '        -')} {r['sd']:>8.3f} {(('%10.6f' % r['exact_hit']) if r['exact_hit'] is not None else '         -')} {r['hit']:>9.6f} "
      f"{(r['exact_max_x'] if r['exact_max_x'] is not None else r['max_paid_x']):>11.3f}{'' if r['exact_max_x'] is not None else ' (sim)'}")
w('(*) P4 has no exact value (its state graph exceeds 10^6 states); P4 ≤ P0 because every run returns at most what it stakes on average. (P1 = RUN IT AGAIN once is retired.)')
w(f"$1 lock1 rows (small amounts): the build LOCKs IN at red #1 and holds $0.93, under $1.00; the run bar offers DOUBLE OR NOTHING ($1.86) and DOUBLE HALF ($0.46 runs, $0.47 to the RUN BANK) on it (minimum ${MINRUN/100:.2f}).")
w("   P5 (DOUBLE HALF once) at $1 lock1: pays $1.39 (double wins, $0.92 + $0.47 RUN BANK) or $0.47 (double loses, the RUN BANK comes back), 1/2 each: exactly 93.0000% like P0, SD 0.460 (×bet), hit 100%, 50% of rounds above the bet. Seeds 32001..32062 (2 x 100,000 rounds per policy).")
w(''); w('5. SIMULATION (shipped code of this build, seeded crypto)'); w('-' * 100)
for S, v in base.items():
    w(f"base ${S/100:.2f}: {v['rounds']:,} rounds (seeds {v['seeds'][0]}..{v['seeds'][-1]}): AUTO {v['auto']['rtp']*100:.4f}% CI [{v['auto']['ci95'][0]*100:.4f}, {v['auto']['ci95'][1]*100:.4f}] "
      f"(exact {ex['base'][str(S)]['auto_no_tap']['rtp']*100:.4f}%), uniform stop {v['uniform']['rtp']*100:.4f}% CI [{v['uniform']['ci95'][0]*100:.4f}, {v['uniform']['ci95'][1]*100:.4f}], "
      f"P(step) {v['p_step']:.6f} (5/6 = 0.833333), max {v['max_observed_x']:.3f}×")
w(f"95% CI checks: {len(checks)} values, {len(checks) - len(misses)} inside, {len(misses)} outside" + (': ' + '; '.join(c['check'] + f" (z {c['z']:+.2f})" for c in misses) if misses else '') + ' — see out/ci_checks.txt')
if CMP:
    w(''); w('6. SAME-SEED COMPARISON WITH THE PREVIOUS RUN (run-bar v169 with RUN IT AGAIN / RUN HALF; out/compare_prev.txt)'); w('-' * 100)
    w(f"previous build {CMP['previous_build_sha256'][:16]}… -> this build {SHA[:16]}…; runs: " + ', '.join(f'{k} {v}' for k, v in CMP['summary'].items()) + ' (ignoring wall-clock secs and build hashes)')
    for r in CMP['runs']:
        if r['status'] == 'CHANGED': w(f"   CHANGED {r['file']}: RTP {r['rtp_before']*100:.4f}% -> {r['rtp_after']*100:.4f}%")
        elif r['status'].startswith(('RETIRED', 'NEW')): w(f"   {r['status'].split(' (')[0]:7s} {r['file']}")
    w('   exact policy values changed: ' + (', '.join(f"{p['policy']} {(p['rtp_before'] or 0)*100:.4f}% -> {(p['rtp_after'] or 0)*100:.4f}% (SD {p['sd_before']:.4f} -> {p['sd_after']:.4f})" for p in CMP['exact_policies'] if p['changed'] and p.get('rtp_after') is not None and p.get('rtp_before') is not None and p.get('sd_before') is not None) or 'none'))
    w('   (P0, P2, P3 exact values and P4 bounds: see out/compare_prev.txt; P1 retired; P5 is a different policy now)')
open(O('par.txt'), 'w').write('\n'.join(L) + '\n')
print('\n'.join(L[-8:])); print(f'checks {len(checks)} outside {len(misses)}')
