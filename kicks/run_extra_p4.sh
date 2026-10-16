#!/bin/bash
# Investigation run (first made after the 72f0513c run's merge flagged the P4 $100 hit rate at 2.2 SE above the exact upper bound; re-run on
# every build since with the SAME seeds): 4 more independent P4 $100 chunks, seeds 20405..20408 x 50,000 rounds -> out/extra/ (kept apart
# from the pre-registered pool; merge.py reports them separately).  Usage: ./run_extra_p4.sh [parallel=1]   (skips finished chunks)
cd "$(dirname "$0")"; PAR=${1:-1}; mkdir -p out/extra
for s in 20405 20406 20407 20408; do echo $s; done | xargs -P "$PAR" -I{} sh -c '[ -s out/extra/pol_P4_100_{}.json ] || { node sim.js pol P4 50000 {} 100 >> out/sim.log 2>&1 && mv out/pol_P4_100_{}.json out/extra/; }'
