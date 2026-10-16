# One-off (v170 re-run, not part of the pack pipeline): reads the v169 outputs moved to /home/claude/fix/minrun/v169_mines_out/.
#   python3 -I out/compare_v169.py > out/compare_v169.txt
# same-seed comparison of the v170 re-run (labpack/mines/out/sim) with the v169 chunks (minimum run $0.02, WITH RUN IT AGAIN / RUN HALF)
import glob, json, os
NEW = '/home/claude/fix/labpack/mines/out/sim'; OLD = '/home/claude/fix/minrun/v169_mines_out/sim'
same, diff, new_only = [], [], []
for f in sorted(glob.glob(NEW + '/*.json')):
    b = os.path.basename(f); o = os.path.join(OLD, b); n = json.load(open(f))
    if not os.path.exists(o): new_only.append(b); continue
    o = json.load(open(o))
    keys = ('rounds', 'sumCents', 'sumsqCents2', 'hits', 'maxCents', 'ends', 'barActions', 'hist', 'cryptoU32')
    d = [k for k in keys if n[k] != o[k]]
    if not d: same.append(b)
    else:
        u = n['bet'] * 100 * n['rounds']
        hk = set(n['hist']) | set(o['hist']); hd = sum(abs(n['hist'].get(k, 0) - o['hist'].get(k, 0)) for k in hk)
        diff.append((b, d, int(o['sumCents']) / u, int(n['sumCents']) / u, o['barActions'], n['barActions'], o['cryptoU32'], n['cryptoU32'], hd))
retired = sorted(os.path.basename(f) for f in glob.glob(OLD + '/*.json') if not os.path.exists(os.path.join(NEW, os.path.basename(f))))
L = []
L.append('SAME-SEED COMPARISON with the v169 pack (build 97dbb75e…dba5, minimum run $0.02, run-bar v169, WITH RUN IT AGAIN / RUN HALF)')
L.append(f'{len(same) + len(diff)} chunks exist in both: {len(same)} identical round for round (sum, sum of squares, hits, max, ends, bar actions, pay histogram, crypto draws), {len(diff)} differ.')
L.append('identical: ' + ', '.join(x[:-5] for x in same))
for b, d, ro, rn, ao, an, co, cn, hd in diff:
    L.append(f'DIFFERS {b[:-5]}: fields {",".join(d)}; RTP {ro*100:.4f}% -> {rn*100:.4f}%; crypto draws {co} -> {cn}; histogram L1 change {hd}')
    L.append(f'    bar actions v169 {json.dumps(ao, sort_keys=True)}')
    L.append(f'    bar actions v170 {json.dumps(an, sort_keys=True)}')
L.append('new chunks (no v169 counterpart; P5 is now DOUBLE HALF once, on new seeds): ' + ', '.join(x[:-5] for x in new_only))
L.append('v169 chunks retired (P1 = RUN IT AGAIN once, P5 = RUN HALF once): ' + ', '.join(x[:-5] for x in retired))
print('\n'.join(L))
