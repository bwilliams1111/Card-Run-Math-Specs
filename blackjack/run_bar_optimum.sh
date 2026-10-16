#!/bin/sh
# The exact optimum over all bar policies (bar_optimum.cpp via bar_optimum_run.js), one process at a time, memory capped (A = 200c needs about 18 million states).
# exact p = the win chance of DOUBLE OR NOTHING at best play; basic p = the conventional chart (the CR's "basic strategy"). Existing results are skipped.
# Usage (from labpack/blackjack): ./run_bar_optimum.sh > out/bar_optimum.log
cd "$(dirname "$0")"
g++ -O2 -march=native -o bar_optimum bar_optimum.cpp || exit 1
ulimit -v 5500000
node bar_optimum_run.js check > out/bar_optimum_check.log || exit 1
node bar_optimum_run.js solve exact 5,10,20,30,40,50,60,70,80,90,100
node bar_optimum_run.js solve basic 5,10,20,40,100
node bar_optimum_run.js solve exact 120,130,150,160,170,200
node bar_optimum_run.js solve basic 200
echo ALLDONE
