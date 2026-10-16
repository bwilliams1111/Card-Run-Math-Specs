#!/bin/sh
# Card Run CRASH 20x lab pack: rebuilds every output in out/ from ../builds-final/card-run-crash-classic-launch.html.
# Run from anywhere: the script cds into its own folder. One core; each node run takes well under 4 minutes (about 15 min in all).
# (build 123d6bce...: run-bar v170, RUN IT AGAIN and RUN HALF removed; the bar is CASH OUT / DOUBLE OR NOTHING / DOUBLE HALF; minimum run $0.02;
#  the $1 lock1 policy runs below exercise held amounts under $1.00.)
set -e
cd "$(dirname "$0")"
mkdir -p out
sha256sum ../builds-final/card-run-crash-classic-launch.html | tee out/build.sha256
python3 -I exact.py > out/exact.log                                   # -> out/exact.json, out/exact.txt
# base game: 4,000,000 rounds at $10 (8 seeds x 500,000), 2,000,000 at $1 and at $100 (4 seeds x 500,000)
for i in 1 2 3 4 5 6 7 8; do node sim_base.js 500000 $((1000+i)) 1000  out/base_1000_s$((1000+i)).json; done > out/sim_base.log
for i in 1 2 3 4; do node sim_base.js 500000 $((1100+i)) 100   out/base_100_s$((1100+i)).json;  done >> out/sim_base.log
for i in 1 2 3 4; do node sim_base.js 500000 $((1200+i)) 10000 out/base_10000_s$((1200+i)).json; done >> out/sim_base.log
# run-bar policies P0 P2 P3 P4 P5 x build lock1/auto: 1,000,000 rounds at $10 (2 seeds x 500,000) and 500,000 at $100 (2 x 250,000)
# (P1 = RUN IT AGAIN once is retired.) seed = 30000 + 1000*stake_index(0=$10,1=$100) + 100*build_index(0=lock1,1=auto) + 10*slot + part,
# slot = the policy number, except P5 (now DOUBLE HALF once, not RUN HALF once) which takes slot 6 so no v169 seed is reused for a different policy
for s in 0 1; do
  if [ $s = 0 ]; then S=1000; N=500000; else S=10000; N=250000; fi
  b=0; for B in lock1 auto; do
    for p in 0 2 3 4 5; do slot=$p; [ $p = 5 ] && slot=6; for part in 1 2; do
      seed=$((30000 + 1000*s + 100*b + 10*slot + part))
      node sim_policy.js P$p $B $N $seed $S out/pol_${S}_${B}_P${p}_s$seed.json
    done; done; b=$((b+1))
  done
done > out/sim_policy.log
# small amounts (run-bar v169, minimum run $0.02): $1 bet, build lock1 = LOCK IN at red #1 -> $0.93 held, below the old $1.00 minimum;
# P0 P2 P3 P4 P5, 200,000 rounds each (2 seeds x 100,000); seed = 32000 + 10*slot + part (stake_index 2 = $1, build_index 0 = lock1; slot as above)
for p in 0 2 3 4 5; do slot=$p; [ $p = 5 ] && slot=6; for part in 1 2; do
  seed=$((32000 + 10*slot + part))
  node sim_policy.js P$p lock1 100000 $seed 100 out/pol_100_lock1_P${p}_s$seed.json
done; done > out/sim_policy_small.log
# follow-up rounds, used ONLY to investigate a value outside its 95% CI (independent seeds; never pooled into the main tables):
# 2,000,000 more rounds at each bet (4 seeds x 500,000; $1: 1301..1304, $10: 1401..1404, $100: 1501..1504)
for i in 1 2 3 4; do node sim_base.js 500000 $((1300+i)) 100   out/inv_base_100_s$((1300+i)).json;   done >  out/sim_followup.log
for i in 1 2 3 4; do node sim_base.js 500000 $((1400+i)) 1000  out/inv_base_1000_s$((1400+i)).json;  done >> out/sim_followup.log
for i in 1 2 3 4; do node sim_base.js 500000 $((1500+i)) 10000 out/inv_base_10000_s$((1500+i)).json; done >> out/sim_followup.log
# same-seed comparison with the previous run (v169, with the ride; kept outside the pack; skipped when that folder is absent)
if [ -d ../../minrun/v169_crash_out ]; then python3 -I compare_prev.py ../../minrun/v169_crash_out > out/compare_prev.log; fi
python3 -I summarize.py > out/summarize.log                           # -> results.json, par.txt, out/ci_checks.txt
tail -3 out/summarize.log
