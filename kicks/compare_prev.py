#!/usr/bin/env python3
"""KICKS 20× lab pack — same-seed comparison with a previous run of this pack.
Usage (from inside labpack/kicks):  python3 -I compare_prev.py <previous out/ directory>
  e.g. python3 -I compare_prev.py ../../minrun/v169_kicks_out      (the v169 run on build feab7531…: $0.02 minimum run WITH RUN IT AGAIN / RUN HALF)
Policies P0, P2, P3, P4, P5 are compared (P1, RUN IT AGAIN once, no longer exists; P5 is redefined: it was RUN HALF once, it is DOUBLE HALF once).
This is the only script of the pack that reads outside labpack/kicks/, and only the directory given on the command line.
For every simulation chunk present in both runs (same file name = same mode, policy, bet and seed) it reports whether the chunk is
IDENTICAL (every field equal except the wall-clock 'secs') or CHANGED (with RTP / hit rate / choices before and after); and the exact
policy values (out/exact.json) before and after at $1 / $10 / $100. Writes out/compare_prev.json and out/compare_prev.txt.
"""
import json, os, sys, glob
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'out')
if len(sys.argv) != 2: sys.exit(__doc__)
PREV = os.path.abspath(sys.argv[1])
def chunks(d):
    r = {}
    for sub in ('', 'extra', 'small', 'followup'):
        for f in glob.glob(os.path.join(d, sub, '*.json')):
            b = os.path.basename(f)
            if b.startswith(('base_', 'pol_')): r[os.path.join(sub, b) if sub else b] = json.load(open(f))
    return r
new, old = chunks(OUT), chunks(PREV)
rows = []; L = []; w = L.append
for k in sorted(set(new) | set(old)):
    a, b = old.get(k), new.get(k)
    if a is None or b is None: rows.append({'chunk': k, 'status': 'only in ' + ('new' if a is None else 'previous')}); continue
    nz = lambda r, f: {k: v for k, v in r[f].items() if v} if isinstance(r.get(f), dict) and f == 'choices' else r.get(f)   # 'choices': the retired buttons (runIt, runHalf) have count 0 in v169 and no key now
    diff = sorted(f for f in set(a) | set(b) if f != 'secs' and nz(a, f) != nz(b, f))
    row = {'chunk': k, 'status': 'identical' if not diff else 'changed'}
    if diff:
        row.update({'fields_differing': diff, 'rtp': [a['rtp'], b['rtp']], 'hit': [a['hit'], b['hit']], 'bars': [a.get('bars'), b.get('bars')]})
        if 'choices' in a: row['choices'] = [a['choices'], b['choices']]
    rows.append(row)
X1 = json.load(open(os.path.join(PREV, 'exact.json'))); X2 = json.load(open(os.path.join(OUT, 'exact.json')))
pol = {}
for P in ('P0', 'P2', 'P3', 'P4', 'P5'):
    for bet in ('$1', '$10', '$100'):
        e1, e2 = X1['policies'][P][bet], X2['policies'][P][bet]
        d = {k: [e1.get(k), e2.get(k)] for k in ('rtp', 'rtp_fraction', 'sd', 'hit_rate', 'rtp_bounds', 'hit_interval', 'dropped_probability', 'bar_states')}
        d['same'] = (e1.get('rtp_fraction') == e2.get('rtp_fraction') and e1['rtp_fraction'] is not None) or (e1['rtp'] == e2['rtp'] and e1['hit_rate'] == e2['hit_rate'])
        if P == 'P5': d['same'] = False; d['note'] = 'P5 redefined: RUN HALF once -> DOUBLE HALF once'
        pol[f'{P} {bet}'] = d
res = {'previous_dir': PREV, 'chunks': rows,
       'summary': {s: sum(1 for r in rows if r['status'] == s) for s in sorted({r['status'] for r in rows})},
       'changed_chunks': [r['chunk'] for r in rows if r['status'] == 'changed'], 'exact_policies_before_after': pol}
json.dump(res, open(os.path.join(OUT, 'compare_prev.json'), 'w'), indent=1)
w(f'Same-seed comparison with {PREV}')
w('  chunks: ' + ', '.join(f'{v} {k}' for k, v in res['summary'].items()))
for r in rows:
    if r['status'] == 'changed':
        w(f"  CHANGED {r['chunk']:28s} RTP {r['rtp'][0]:.5f} -> {r['rtp'][1]:.5f}  hit {r['hit'][0]:.5f} -> {r['hit'][1]:.5f}  bars {r['bars'][0]} -> {r['bars'][1]}"
          + (f"  choices {r['choices'][0]} -> {r['choices'][1]}" if 'choices' in r else ''))
    elif r['status'] != 'identical': w(f"  {r['status']}: {r['chunk']}")
w('  identical: ' + ' '.join(r['chunk'] for r in rows if r['status'] == 'identical'))
w('Exact policy values before -> after (RTP, hit rate):')
for k, d in pol.items():
    w(f"  {k:8s} {'same   ' if d['same'] else 'CHANGED'} RTP {d['rtp'][0]:.8f} -> {d['rtp'][1]:.8f}  hit {d['hit_rate'][0]:.6f} -> {d['hit_rate'][1]:.6f}"
      + (f"  bounds {d['rtp_bounds'][0]} -> {d['rtp_bounds'][1]}" if d['rtp_bounds'][0] else ''))
open(os.path.join(OUT, 'compare_prev.txt'), 'w').write('\n'.join(L) + '\n'); print('\n'.join(L))
