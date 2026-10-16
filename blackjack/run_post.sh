#!/bin/sh
# The jobs after run_sims.sh / run_double_sims.sh (README order), one at a time:
#   model Monte Carlo of P4 (same seeds as v170), trace_check (same seeds), trace_replay of every P4 job, the P4 convergence runs, then the NEW checks of the optimal bar policy:
#   the policy table of A = 40c (bar_optimum.cpp) played through the SHIPPED code (bar_policy_sim.js, crypto 6001 6002, 500,000 rounds each) and through the bar-only model
#   (mc_model.js OPT, seeds 7001 7002, 100,000,000 rounds each), and the independent evaluation of the policy tables (bar_policy_eval.js).
# Usage (from labpack/blackjack): ./run_post.sh > out/run_post.log
cd "$(dirname "$0")"
node mc_model.js P4 10 25000000 11 > out/mc_model_P4_10_11.json ; node mc_model.js P4 10 25000000 12 > out/mc_model_P4_10_12.json
node mc_model.js P4 1 25000000 13 > out/mc_model_P4_1_13.json ; node mc_model.js P4 100 25000000 14 > out/mc_model_P4_100_14.json
echo mc_model done
SEED_CRYPTO=78 node -r ./seedcrypto.js trace_check.js P4 25000 10 81 > out/trace_check_P4_10.json
SEED_CRYPTO=79 node -r ./seedcrypto.js trace_check.js P4 25000 100 82 > out/trace_check_P4_100.json
SEED_CRYPTO=77 node -r ./seedcrypto.js trace_check.js P4 25000 1 80 > out/trace_check_P4_1.json
echo trace_check done
./trace_replay.sh > out/trace_replay.log
echo trace_replay done
{ P4_BET=10 P4_CONVERGENCE=1e-7,1e-8,1e-9,1e-10,1e-11,1e-12 node exact_runs.js; P4_BET=1 P4_CONVERGENCE=1e-8,1e-10,1e-12 node exact_runs.js;
  P4_BET=100 P4_CONVERGENCE=1e-8,1e-10,1e-12 node exact_runs.js; } > out/exact_runs_convergence.log
echo convergence done
for s in 6001 6002; do [ -s out/ship_opt_40_$s.json ] || SEED_CRYPTO=$s node -r ./seedcrypto.js bar_policy_sim.js 40 500000 out/bar_policy_exact_40.bin out/ship_opt_40_$s.json > /dev/null; done
echo ship_opt done
for s in 7001 7002; do [ -s out/mc_opt_40_$s.json ] || node mc_model.js OPT 1 100000000 $s 40 out/bar_policy_exact_40.bin > out/mc_opt_40_$s.json; done
echo mc_opt done
node bar_policy_eval.js 40 out/bar_policy_exact_40.bin 0.5004548706450649 >> out/bar_policy_eval.log
echo ALLDONE
