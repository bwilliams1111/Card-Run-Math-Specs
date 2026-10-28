#!/bin/sh
# The exact optimum over all bar policies with DOUBLE HALF capped at N presses per run (bar_optimum_cap.cpp via bar_optimum_cap_run.js). One process per line group, memory capped.
# Existing results are skipped. Usage (from labpack/blackjack):  ./run_bar_cap.sh > out/bar_cap.log
cd "$(dirname "$0")"
g++ -O2 -march=native -o bar_optimum_cap bar_optimum_cap.cpp || exit 1
ulimit -v 6000000
node bar_cap_check.js || exit 1
# convergence of the capped optimum to the uncapped one (N -> infinity) at the three smallest ammo
BAR_TAG=conv node bar_optimum_cap_run.js solve exact 1500 5,10,20
node bar_optimum_cap_run.js solve exact 100 5,10,20,30,40,50,60,80,100,150,200,300
node bar_optimum_cap_run.js solve basic 100 5,10,20,40,100,200
echo ALLDONE
