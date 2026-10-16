#!/bin/sh
# Simulation of the final shipped code (../builds-final/card-run-blackjack-classic-launch.html) through harness.js, best play
# (exact masks from exact_board.js) on the board and in DOUBLE OR NOTHING. Jobs in parallel: first argument (default 2; use 1 on a shared box).
# Crypto seeds (seedcrypto.js, xoshiro128** from splitmix32(seed)) and policy seeds (sfc32, P4's random picks) are fixed below. They are the SAME seeds as the v170
# run (dealer hit soft 17 in the double): base and P0 chunks reproduce it exactly (they never play a double), P2 P3 P4 P5 change (compare_prev.js).
#   base:     P0, $10, 8 x 250,000 rounds, crypto seeds 1001-1008                     -> out/sim_base_<seed>.json
#   policies: P0 P2 P3 P4 P5, $10, 2 x 100,000 rounds, crypto seeds 2<i>01, 2<i>02 (i = 0 2 3 4 5) -> out/sim_P<i>_10_<seed>.json
#             P0 P2 P3 P4 P5, $100, 1 x 100,000 rounds, crypto seed 3<i>01              (P1 was RUN IT AGAIN once: retired, its seeds 2101 2102 3101 are not used)
#   policy seed (P4 only uses it): 4<i><j> per job
#   extra P4 $10 (the v168 pack's extra seeds): 4 x 100,000 rounds, crypto 2403-2406, policy seeds 4401-4404
#   small amounts (minimum $0.02): P4 $1, 2 x 100,000 rounds, crypto 1401 1402, policy seeds 4411 4412 -> out/sim_P4_1_<seed>.json
#             NEW (run-bar v170): P5 $1 (DOUBLE HALF once, halves of $0.15 and up), 2 x 100,000 rounds, crypto 1501 1502, policy seeds 4511 4512
#   follow-up P4 (the v169 run's follow-up seeds; run as an independent replication whatever the first pass shows, reported apart):
#             $10 4 x 100,000 rounds, crypto 2407-2410, policy seeds 4405-4408; $100 5 x 100,000 rounds, crypto 3402-3406, policy seeds 4431-4435
#   follow-up P4 $1 (added AFTER the first pass: P4 $1 on crypto 1401 1402 put the exact value below its CI, see README; chosen once, run once):
#             4 x 100,000 rounds, crypto 1403-1406, policy seeds 4413-4416 (reported apart, never pooled into the first pass)
#   follow-up P2 $100 (added AFTER the first pass of the S17-double run: the exact P2 hit rate at $100 was 2.1 SE below the first-pass sample, see README; chosen once, run once):
#             4 x 100,000 rounds, crypto 3202-3205 (P2 uses no policy seed) -> out/sim_P2_100_3202.json ... (reported apart, never pooled into the first pass)
# Usage (from labpack/blackjack): ./run_sims.sh [jobs]     (then: node aggregate.js)
cd "$(dirname "$0")"
JOBS=${1:-2}
{
for s in 1001 1002 1003 1004 1005 1006 1007 1008; do echo "base P0 250000 10 $s 1"; done
for i in 0 2 3 4 5; do
  echo "P$i P$i 100000 10 2${i}01 4${i}1"; echo "P$i P$i 100000 10 2${i}02 4${i}2"; echo "P$i P$i 100000 100 3${i}01 4${i}3"
done
for j in 3 4 5 6; do echo "P4 P4 100000 10 240$j 440$((j-2))"; done
echo "P4 P4 100000 1 1401 4411"; echo "P4 P4 100000 1 1402 4412"
echo "P5 P5 100000 1 1501 4511"; echo "P5 P5 100000 1 1502 4512"
for j in 7 8 9 10; do echo "P4 P4 100000 10 $((2400+j)) $((4398+j))"; done
for j in 2 3 4 5 6; do echo "P4 P4 100000 100 340$j 443$((j-1))"; done
for j in 3 4 5 6; do echo "P4 P4 100000 1 140$j 441$((j+10))"; done
for j in 2 3 4 5; do echo "P2 P2 100000 100 320$j 4204"; done
} | xargs -P "$JOBS" -L 1 sh -c 'name=$0; pol=$1; n=$2; bet=$3; seed=$4; ps=$5; f=out/sim_${name}_${bet}_${seed}.json; [ "$name" = base ] && f=out/sim_base_${seed}.json;
  if [ -s "$f" ]; then echo "skip $f"; else SEED_CRYPTO=$seed node -r ./seedcrypto.js policy.js $pol $n $bet $f $ps opt > /dev/null && echo "done $f"; fi'
