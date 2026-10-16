#!/bin/sh
# DOUBLE OR NOTHING hands through the shipped code (double_sim.js), 10 x 1,000,000 resolved hands at best play (crypto seeds 5101-5110) and 10 x 1,000,000 at the
# conventional basic strategy (5201-5210): 10 million hands each (the CR's check 2 asks for 10M at basic). One process per job; first argument = jobs in parallel (default 1).
# Output out/dbl_<opt|conv>_<seed>.json (existing ones are skipped).
cd "$(dirname "$0")"; JOBS=${1:-1}
{ for s in 1 2 3 4 5 6 7 8 9 10; do echo "opt 51$(printf %02d $s)"; done; for s in 1 2 3 4 5 6 7 8 9 10; do echo "conv 52$(printf %02d $s)"; done; } |
 xargs -P "$JOBS" -L 1 sh -c 'f=out/dbl_$0_$1.json; if [ -s "$f" ]; then echo "skip $f"; else SEED_CRYPTO=$1 node -r ./seedcrypto.js double_sim.js $0 1000000 $f > /dev/null && echo "done $f"; fi'
