#!/bin/bash
# MINES 20× lab pack: every simulation of the final shipped code, split into chunks of <= 4 minutes (seeds documented here).
#   cd labpack/mines && ./run_sims.sh [jobs]        (default 2 parallel jobs; v169 used 1; each chunk skipped if its out/sim/*.json exists)
#   base: 20 x 100,000 rounds at $10, seeds 1001-1020                                      = 2,000,000 rounds
#   top: 10 x 100,000 rounds at $10, seeds 4001-4010, and 10 x 100,000 at $1.10, seeds 4101-4110  = 1,000,000 rounds each
#   P0 P2 P3 P4 at $10: 4 x 50,000 rounds each, seeds 2<p>01-2<p>04 (p = policy number)      = 200,000 rounds per policy
#   P0 P2 P3 P4 at $100: 2 x 50,000 rounds each, seeds 3<p>01-3<p>02                         = 100,000 rounds per policy
#   P5 (DOUBLE HALF once; NEW in v170, not the old RUN HALF P5): at $10 4 x 50,000, seeds 2511-2514; at $100 2 x 50,000, seeds 3511-3512
#       (new seeds, so no chunk is mistaken for an old RUN HALF chunk of the same name)
#   $1 small-amount runs (minimum run $0.02): P4 at $1: 2 x 100,000 rounds, seeds 5401-5402; P5 at $1: 2 x 100,000, seeds 5511-5512
#   P1 (RUN IT AGAIN once) is retired. P4 choice PRNG seed = crypto seed + 7
set -u
cd "$(dirname "$0")"
mkdir -p out/sim
JOBS=${1:-2}
jobs_list() {
  for s in $(seq 1001 1020); do echo "base 10 100000 $s"; done
  for s in $(seq 4001 4010); do echo "top 10 100000 $s"; done
  for s in $(seq 4101 4110); do echo "top 1.1 100000 $s"; done
  for p in 0 2 3 4; do
    for c in 1 2 3 4; do echo "P$p 10 50000 2${p}0$c"; done
    for c in 1 2; do echo "P$p 100 50000 3${p}0$c"; done
  done
  for c in 1 2 3 4; do echo "P5 10 50000 251$c"; done
  for c in 1 2; do echo "P5 100 50000 351$c"; done
  for c in 1 2; do echo "P4 1 100000 540$c"; done
  for c in 1 2; do echo "P5 1 100000 551$c"; done
}
run_one() {
  set -- $1
  f="out/sim/$1_$2_$4.json"
  [ -s "$f" ] && { echo "skip $f"; return; }
  SEED_CRYPTO=$4 node -r ./seedcrypto.js sim.js $1 $2 $3 "$f.tmp" >> out/sim/run.log 2>&1 && mv "$f.tmp" "$f" && echo "done $f"
}
export -f run_one
jobs_list | xargs -P "$JOBS" -I{} bash -c 'run_one "{}"'
