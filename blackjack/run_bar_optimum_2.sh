#!/bin/sh
# After run_bar_optimum.sh: (1) the MAX WIN clip at its tightest, an ammo of 20 x the bet, i.e. MAX WIN = the run cap = 1,000 x A cents (BAR_MW = 1000 A): the offers that would pass
# MAX WIN disappear, the value can only fall (bar_optimum_exact_mw.json); (2) one larger ammo, A = 300c (27 million states; the smallest win of a $10 bet) to test the 1/A extrapolation.
# Usage (from labpack/blackjack): ./run_bar_optimum_2.sh > out/bar_optimum_2.log
cd "$(dirname "$0")"
while ! grep -q ALLDONE out/bar_optimum.log; do sleep 30; done
ulimit -v 5500000
for A in 20 40 60 100; do BAR_MW=$((1000 * A)) BAR_TAG=mw node bar_optimum_run.js solve exact $A; done
node bar_optimum_run.js solve exact 300
echo ALLDONE
