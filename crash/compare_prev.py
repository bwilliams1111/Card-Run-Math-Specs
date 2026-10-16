#!/usr/bin/env python3
"""Same-seed comparison with the previous run of this pack (build 06fbbbcc..., run-bar v169 with RUN IT AGAIN / RUN HALF, MIN_RUN $0.02), kept outside
the pack in /home/claude/fix/minrun/v169_crash_out/ (the old out/ folder, moved there unchanged before the v170 re-run).

usage (inside labpack/crash/):  python3 -I compare_prev.py <previous out/ folder>     -> out/compare_prev.json, out/compare_prev.txt

For every simulation output present in both folders (base_*, inv_base_*, pol_*) it compares the whole JSON after dropping the fields
that cannot match between two builds or two machines: wall-clock seconds ('secs') and the build / script hashes ('sha', 'build_sha256').
A run is IDENTICAL when everything else (every count, every RTP, CI, SD, hit, max) is equal; otherwise CHANGED, with its RTP before/after.
It also lists every exact value (out/exact.json) that differs, policies first.
Reads only out/ here and the folder given; writes only out/compare_prev.*"""
import json, os, sys, glob
HERE = os.path.dirname(os.path.abspath(__file__)); O = lambda *p: os.path.join(HERE, *p)
PREV = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.abspath(O('..', '..', 'minrun', 'v169_crash_out'))
VOLATILE = {'secs', 'sha', 'build_sha256'}
def strip(d): return {k: v for k, v in d.items() if k not in VOLATILE}

runs = []
cur = {os.path.basename(f) for f in glob.glob(O('out', '*.json')) if not os.path.basename(f).startswith(('exact', 'compare'))}
old = {os.path.basename(f) for f in glob.glob(os.path.join(PREV, '*.json')) if os.path.basename(f).startswith(('base_', 'inv_base_', 'pol_'))}
for name in sorted(cur | old):
    if name not in old: runs.append({'file': name, 'status': 'NEW (no previous run on this seed)'}); continue
    if name not in cur:
        pol_ = name.split('_')[3] if name.startswith('pol_') else None
        runs.append({'file': name, 'status': 'RETIRED (policy removed with the ride: P1 RUN IT AGAIN once / old P5 RUN HALF once; new P5 = DOUBLE HALF once runs on new seeds)' if pol_ in ('P1', 'P5') else 'MISSING (not re-run)'}); continue
    a, b = json.load(open(os.path.join(PREV, name))), json.load(open(O('out', name)))
    same = strip(a) == strip(b)
    r = {'file': name, 'status': 'IDENTICAL' if same else 'CHANGED', 'seed': b.get('seed'), 'rounds': b.get('rounds')}
    if 'rtp' in b: r.update(rtp_before=a['rtp'], rtp_after=b['rtp'])
    else: r.update(auto_before=a['auto_no_tap']['rtp'], auto_after=b['auto_no_tap']['rtp'])
    if not same: r['fields_changed'] = sorted(k for k in set(strip(a)) | set(strip(b)) if strip(a).get(k) != strip(b).get(k))
    r['build_before'] = (a.get('build_sha256') or a['sha']['build'])[:16]; r['build_after'] = (b.get('build_sha256') or b['sha']['build'])[:16]
    runs.append(r)

ea, eb = json.load(open(os.path.join(PREV, 'exact.json'))), json.load(open(O('out', 'exact.json')))
pol = []
for k in sorted(set(ea['policies']) | set(eb['policies']), key=lambda k: (int(k.split('_')[0]), k)):
    x, y = ea['policies'].get(k, {}), eb['policies'].get(k, {})
    keys = ['rtp', 'sd', 'hit', 'max_pay_x', 'p_max_pay', 'n_outcomes', 'upper_bound_rtp']
    pol.append({'policy': k, 'changed': any(x.get(q) != y.get(q) for q in keys), **{f'{q}_before': x.get(q) for q in keys if q in x or q in y}, **{f'{q}_after': y.get(q) for q in keys if q in x or q in y}})
def leaves(d, p=''):
    if isinstance(d, dict):
        for k, v in d.items(): yield from leaves(v, f'{p}.{k}' if p else str(k))
    else: yield p, d
la, lb = dict(leaves(ea)), dict(leaves(eb))
exact_diff = [{'path': k, 'before': la.get(k, '(absent)'), 'after': lb.get(k, '(absent)')} for k in sorted(set(la) | set(lb))
              if la.get(k, '(absent)') != lb.get(k, '(absent)') and not k.startswith(('policies.', 'build_sha256'))]
res = {'previous_folder': PREV, 'previous_build_sha256': ea['build_sha256'], 'current_build_sha256': eb['build_sha256'],
       'volatile_fields_ignored': sorted(VOLATILE), 'runs': runs,
       'summary': {s: sum(1 for r in runs if r['status'].startswith(s)) for s in ('IDENTICAL', 'CHANGED', 'NEW', 'RETIRED', 'MISSING')},
       'exact_policies': pol, 'exact_policies_changed': [p['policy'] for p in pol if p['changed']], 'exact_other_changes': exact_diff}
json.dump(res, open(O('out', 'compare_prev.json'), 'w'), indent=1)
with open(O('out', 'compare_prev.txt'), 'w') as f:
    def pr(s=''): print(s); f.write(s + '\n')
    pr(f'previous: {PREV} (build {ea["build_sha256"][:16]}..., MIN_RUN {ea["constants_parsed"]["MIN_RUN"]})')
    pr(f'current : out/ (build {eb["build_sha256"][:16]}..., MIN_RUN {eb["constants_parsed"]["MIN_RUN"]});  ignored fields: {", ".join(sorted(VOLATILE))}')
    pr(f'runs: {json.dumps(res["summary"])}')
    for r in runs:
        v = (f"rtp {r['rtp_before']:.9f} -> {r['rtp_after']:.9f}" if 'rtp_before' in r else f"AUTO {r['auto_before']:.9f} -> {r['auto_after']:.9f}") if 'build_before' in r else ''
        pr(f"  {r['status'][:9]:9s} {r['file']:36s} {v}" + (f"  changed: {', '.join(r['fields_changed'])}" if r.get('fields_changed') else ''))
    pr('\nexact policy values (RTP / SD / hit / max x), before -> after:')
    for p in pol:
        def side(w):
            if p.get('rtp_' + w) is not None: return f"{p['rtp_' + w]*100:.5f}%"
            return f"<= {p['upper_bound_rtp_' + w]*100:.5f}%" if p.get('upper_bound_rtp_' + w) is not None else '(retired)' if w == 'after' else '(new)'
        b4, af = side('before'), side('after')
        ex = f"  sd {p['sd_before']:.4f} -> {p['sd_after']:.4f}  hit {p['hit_before']:.6f} -> {p['hit_after']:.6f}  max {p['max_pay_x_before']:.3f}x -> {p['max_pay_x_after']:.3f}x" if p.get('sd_before') is not None and p.get('sd_after') is not None else ''
        pr(f"  {'CHANGED' if p['changed'] else 'same   '} {p['policy']:16s} {b4} -> {af}{ex}")
    pr(f'\nother exact values that differ ({len(exact_diff)}; new keys show before = (absent)):')
    for d in exact_diff: pr(f"  {d['path']}: {json.dumps(d['before'])} -> {json.dumps(d['after'])}"[:400])
