#!/bin/bash
# Follow-up run (kept from the v169 run on build feab7531, where the planned P4 $10 RTP check came out OUT because P4's payout is heavy-tailed:
# no payout above 693x in 200,000 rounds). Independent P4 $10 chunks, seeds 10405..10424 x 50,000 rounds = 1,000,000 rounds -> out/followup/
# (kept apart from the pre-registered pool; merge.py reports them separately). Run it only if a planned check misses.
# Usage: ./run_followup_p4_10.sh [parallel=1]   (skips finished chunks)
cd "$(dirname "$0")"; PAR=${1:-1}; mkdir -p out/followup
seq 10405 10424 | xargs -P "$PAR" -I{} sh -c '[ -s out/followup/pol_P4_10_{}.json ] || { node sim.js pol P4 50000 {} 10 >> out/sim.log 2>&1 && mv out/pol_P4_10_{}.json out/followup/; }'
