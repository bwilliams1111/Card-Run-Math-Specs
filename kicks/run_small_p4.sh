#!/bin/bash
# Small-amount check (kept from the $0.02 minimum run, run-bar v169/v170): P4 (random) at a $1.00 bet through the shipped code, where held
# amounts under $1.00 show the DOUBLE / DOUBLE HALF buttons and DOUBLE HALF can halve down to 2 cents. Seeds 30401..30404 x 50,000 rounds = 200,000 rounds
# -> out/small/ (kept apart; merge.py compares them with the exact P4 at $1).  Usage: ./run_small_p4.sh [parallel=1]   (skips finished chunks)
cd "$(dirname "$0")"; PAR=${1:-1}; mkdir -p out/small
for s in 30401 30402 30403 30404; do echo $s; done | xargs -P "$PAR" -I{} sh -c '[ -s out/small/pol_P4_1_{}.json ] || { node sim.js pol P4 50000 {} 1 >> out/sim.log 2>&1 && mv out/pol_P4_1_{}.json out/small/; }'
