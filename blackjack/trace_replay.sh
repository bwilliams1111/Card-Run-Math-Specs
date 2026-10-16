#!/bin/sh
# P4 investigation (run-bar v170 build): replays EVERY P4 simulation job (out/sim_P4_*.json) through trace_check.js with the job's own crypto
# seed, policy seed, bet and round count. trace_check.js draws its P4 picks from the same sfc32 stream and the buttons come in the same
# order, so it plays exactly the same rounds as policy.js did (aggregate.js checks that the replay's RTP and hit rate equal the job's)
# and checks every bar-to-bar transition of every simulated P4 round, the largest pays included, against the exact bar model.
# One job at a time (about 1 minute of CPU per 100,000 rounds). Output: out/trace_replay_P4_<bet>_<crypto seed>.json; existing ones are skipped.
# Usage (from labpack/blackjack): ./trace_replay.sh > out/trace_replay.log
cd "$(dirname "$0")"
for f in out/sim_P4_*.json; do
  set -- $(node -e "const j=require('./$f');console.log(j.bet,j.seedCrypto,j.policySeed,j.rounds)")
  o=out/trace_replay_P4_$1_$2.json
  [ -s "$o" ] && { echo "skip $o"; continue; }
  SEED_CRYPTO=$2 node -r ./seedcrypto.js trace_check.js P4 $4 $1 $3 > $o && echo "done $o"
done
echo ALLDONE
