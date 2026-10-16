#!/bin/bash
# Runs every simulation of the lab pack from inside labpack/kicks (relative paths only). Each job is <= 50,000 rounds (~1-2 min).
# Seeds (game RNG seed; the bot stream is seed ^ 0x5bd1e995):
#   base  $10 : 1001..1040                      x 50,000 = 2,000,000 rounds
#   P0, P2, P3, P4 $10 : 10000+100*p+i, i=1..4  x 50,000 =   200,000 rounds per policy   (p = 0, 2, 3, 4 — the v169 seeds)
#   P0, P2, P3, P4 $100: 20000+100*p+i, i=1..2  x 50,000 =   100,000 rounds per policy
#   P5 (DOUBLE HALF once; new in v170) $10: 10600+i, i=1..4;  $100: 20600+i, i=1..2   (the old P5 seeds 105xx belonged to RUN HALF)
# P1 (RUN IT AGAIN once) is retired. Usage: ./run_sims.sh [parallel=2]     (skips jobs whose out/*.json already exists, so it can be re-run after a restart)
cd "$(dirname "$0")"; PAR=${1:-2}; mkdir -p out
{
  for i in $(seq 1001 1040); do echo "base 50000 $i 10"; done
  for p in 0 2 3 4; do
    for i in 1 2 3 4; do echo "pol P$p 50000 $((10000+100*p+i)) 10"; done
    for i in 1 2; do echo "pol P$p 50000 $((20000+100*p+i)) 100"; done
  done
  for i in 1 2 3 4; do echo "pol P5 50000 $((10600+i)) 10"; done
  for i in 1 2; do echo "pol P5 50000 $((20600+i)) 100"; done
} > out/jobs.txt
run() { set -- $1; if [ "$1" = base ]; then f="out/base_$4_$3.json"; else f="out/pol_$2_$5_$4.json"; fi
  [ -s "$f" ] && { echo "skip $f"; return; }; node sim.js "$@" >> out/sim.log 2>&1 || echo "FAILED $*" >> out/sim.log; }
export -f run
xargs -P "$PAR" -I{} bash -c 'run "{}"' < out/jobs.txt
echo "all jobs done $(date -u +%FT%TZ)" >> out/sim.log
