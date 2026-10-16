KICKS 20× — LAB PACK (Card Run)                                                         16 Oct 2026
==========================================================================================================

Build analysed: ../builds-final/card-run-kicks-classic-launch.html
  sha256 f4592849c5f06a8f3b9c63d495caa02fb7fdebe13a645bce0c609cc819654e26   147,720 bytes
  (= /home/claude/fix/builds/card-run-kicks-classic-launch.html; every script below reads only this copy and files inside labpack/kicks/.)
  History: first run 14 Oct on the batch-3 build 72f0513c… ($1.00 minimum run, run-bar v168); 15 Oct on feab7531… (minimum run back to
  $0.02, run-bar v169). This is the v170 build: RUN IT AGAIN (the "ride", every pay x 1.075) and RUN HALF are REMOVED for certification.
  The run bar is CASH OUT / DOUBLE OR NOTHING / DOUBLE HALF (+ the RUN BANK). The base game, the build target (20x, top pay in full), MAX
  WIN, the bet grid, the pays, the RNG and the Run Game are unchanged. The embedded run-bar module is v170 byte for byte (the shared
  /home/claude/fix/runbar/run-bar.js). The whole pack was re-run on this build, the unchanged chunks with the same seeds; see SAME-SEED
  COMPARISON below. The v169 run is kept outside the pack in /home/claude/fix/minrun/v169_kicks_out/ (with its results.json, par.txt, README).

Everything runs from inside labpack/kicks/ with relative paths; nothing outside labpack/ is read or written (except by compare_prev.py,
which reads only the previous-run directory named on its command line).
Needs: python3 (standard library only), node (no packages).

WHAT WAS REMOVED FROM THE PACK (with the ride): the exact ride solvers and tables (ride RTP by stake, the lowest ride RTP over every stake
from $0.02 to $2,000, the P4 bounds built on it), the k = 1.075 constant and its asserts, policy P1 (RUN IT AGAIN once, retired — there is no
P1 any more) and the old P5 (RUN HALF once, replaced by the new P5 = DOUBLE HALF once), the ride branches of the bots and counters, the
README / par text about them. exact_kicks.py now also ASSERTS that the build has no ride / RUN IT / RUN HALF code left.

FILES
  README.txt        this file
  results.json      all headline numbers (exact + simulation, with every CI check)        <- written by merge.py
  par.txt           the PAR tables as plain text, ready to paste                          <- written by merge.py
  exact_kicks.py    EXACT math. Parses every constant it depends on from the build text (PAY_CLASSIC, LADDER_CLASSIC, CL_KICKS,
                    RUN_SHOTS, RUN_TO, TRIGGER, MINRUN, MAX_WIN_X / OPERATOR_MAX_WIN_X / MW_X, the 1,000x cap in capNow, HEAD, RANKS /
                    SUITS / GOAL / POST, MIN_BET / MAX_BET / BET_STEP_C, run-bar.js MIN_RUN, CAP_X and version 170, and the exact code
                    shapes of freshShoe (2 decks), draw (with replacement), amt (integer-cent floor: stake in cents x pay in hundredths
                    / 100), the board total, the 2x Run Game prize, the run bar's half split and its DOUBLE / DOUBLE HALF show rules, the
                    DOUBLE and DOUBLE HALF handlers, the banked-bust rule, ammo = the base win) and ASSERTS they equal the values it
                    uses (MINRUN 1/50 = $0.02, run-bar MIN_RUN 2 cents), and that no ride / RUN IT / RUN HALF / kMil / K_RIDE text is
                    left in the game script, the run-bar code or the page. Then computes, in fractions: base RTP for best play / shoe-count
                    caller / random / worst play with SD, hit rate, pay distribution, right-call distribution, Posts Bonus stats, top
                    pay and odds; DOUBLE OR NOTHING P(win) and RTP; base rounding (none); run-bar policies P0, P2, P3, P5 at $1 / $10 /
                    $100 (P5 also by a closed form, asserted equal); and P4 by a bounded forward propagation (see P4 below).
                    -> out/exact.json, log out/exact.log (719 s here on the shared box; P4 peak RSS 0.96-0.97 GB, out/exact.mem).
                    Option --p4-eps <cut> (default 1e-15; the run here used 1e-15).
  sheet_strategy.js evaluates the rules sheet's description of best play (more cards left; fewer after a miss with no right calls yet, main game only)
                    by an exact expectation over every shoe state and compares it with the best-play RTP in out/exact.json (equal to 1e-12:
                    92.9666%); also the variants without / with a wider exception (92.5067% = the shoe-count caller, 92.4431%, 92.7051%).
                    -> out/sheet_strategy.txt (added 16 Oct with the math pack; reads only the build constants and out/exact.json).
  buildconst.js     reads PAY / ladder / kicks / card kinds from the build for the bots (policy.js).
  policy.js         the bots' calls: 'opt' = exact best-play DP over the remaining shoe (same DP as exact_kicks.py, in double
                    precision; GOAL when the two values are equal). exact_kicks.py decides its exact distribution with the very
                    same float comparisons, so simulation and exact math play identical strategies.
  harness.js        loads the SHIPPED scripts (run-bar.js, rules-sheet.js, the game script — sliced verbatim from the build)
                    into a node vm with a small DOM stub and a SEEDED crypto.getRandomValues (xoshiro128**, seeded through
                    splitmix32 — the same generator as verify/seedcrypto.js). A test-only accessor (window.__kicks) is added
                    to the in-memory copy only; the build file is never changed.
  sim.js            simulation of the final shipped code: clicks the game's own buttons (PLAY AGAIN, GOAL / WIDE, the run
                    bar's actions); money is read from the game's round_settle events and ledger-checked every round.
  run_sims.sh       runs every simulation job (70 jobs of 50,000 rounds, N at a time, default 2, run here with 1; ~45 min wall; re-runnable).
  run_small_p4.sh   small-amount check: P4 at a $1.00 bet, 4 chunks -> out/small/.
  run_extra_p4.sh, run_followup_p4_10.sh   the follow-up procedures of the earlier runs (4 extra P4 $100 chunks; 20 independent P4 $10
                    chunks). NOT needed this time: no planned check missed (see CHECKS), so they were not run and out/ has no extra/ or
                    followup/. Kept so that a future miss can be investigated the same way.
  compare_prev.py   same-seed comparison with a previous run's out/ (the only script that reads outside labpack/kicks/, and only the
                    directory named on its command line) -> out/compare_prev.json / .txt; merge.py adds it to results.json / par.txt.
  merge.py          pools the chunks, checks every exact value against its simulation 95% CI, writes results.json + par.txt.
  out/              raw outputs: exact.json / exact.log / exact.mem, base_<bet>_<seed>.json, pol_<P>_<bet>_<seed>.json, small/,
                    compare_prev.*, jobs.txt, sim.log, merge.log.

COMMANDS (from inside labpack/kicks/)
  python3 -I exact_kicks.py          # exact math            -> out/exact.json   (run here under ulimit -v 3,500,000 KB)
  node sheet_strategy.js > out/sheet_strategy.txt   # the rules-sheet description of best play, evaluated exactly (needs out/exact.json)
  ./run_sims.sh 1                    # all simulations       -> out/*.json       (1 job at a time on the shared box)
  ./run_small_p4.sh 1                # small-amount chunks   -> out/small/
  python3 -I compare_prev.py ../../minrun/v169_kicks_out   # same-seed comparison with the v169 run (kept outside labpack/)
  python3 -I merge.py                # results.json, par.txt
  single jobs:  node sim.js base 50000 1001 10        node sim.js pol P4 50000 10401 10

SEEDS (game RNG seed = crypto seed; the bot's own choices — Run Game calls, P4 picks — use a second xoshiro128** stream seeded
with seed XOR 0x5bd1e995; each output file records both)
  base game, $10, best play, CASH OUT at the first bar: seeds 1001..1040, 50,000 rounds each      = 2,000,000 rounds  (the v169 seeds)
  policy Pp (p = 0, 2, 3, 4), $10:  seeds 10000 + 100p + i, i = 1..4, 50,000 rounds each          =   200,000 rounds per policy (v169 seeds)
  policy Pp (p = 0, 2, 3, 4), $100: seeds 20000 + 100p + i, i = 1..2, 50,000 rounds each          =   100,000 rounds per policy (v169 seeds)
  policy P5 (NEW: DOUBLE HALF once), $10: seeds 10601..10604; $100: seeds 20601..20602 (50,000 each) — new seeds, because the old P5
    seeds 10501.. / 20501.. were RUN HALF chunks and are retired (P1's 101xx / 201xx chunks are retired too)
  small-amount check, P4 $1:  seeds 30401..30404, 50,000 rounds each (out/small/, reported apart)  =   200,000 rounds (v169 seeds)

POLICIES
  P0 CASH OUT at the first bar · P2 DOUBLE OR NOTHING once, then cash out · P3 DOUBLE OR NOTHING every time it is offered (stops at the
  1,000x run cap or when MAX WIN hides it) · P4 random: at every bar cash out with probability 1/3, otherwise a uniform pick among the
  buttons the bar shows (DOUBLE OR NOTHING, DOUBLE HALF; when both show this is a uniform pick among the three buttons) · P5 DOUBLE HALF
  once, then cash out (if the half run loses, the RUN BANK comes back and is cashed out). P1 was RUN IT AGAIN once: it is removed with
  that button. The base board is played with the best-play calls; Run Game calls are 50/50 (every call is exactly 1/2 there).

NOTES
  * EVERY policy has the base RTP exactly. Each bar action is fair in whole cents: DOUBLE OR NOTHING and DOUBLE HALF win 1/2 for exactly
    2x the amount run (r2(stake x 2), no rounding), the bar only offers them when they cannot be clipped by MAX WIN, the 1,000x cap pays
    in full, and a lost run with a RUN BANK hands the bank back as the held amount (banked bust). So a bar state worth W = RUN BANK + held
    is worth exactly W in expectation, and the round (a bounded martingale that stops with certainty: cash out is picked or the cap / MAX
    WIN pays) pays on average exactly the first win: P0 = P2 = P3 = P4 = P5 = 92.96659% (200943920392331/216146392994805). They differ
    only in SD and hit rate. P0, P2, P3, P5 are exact fractions (P2 = P3 = P5 = P0 asserted); P5 has a closed form from the base pay
    distribution (a win x with half = floor(x/2), keep = x - half pays keep + 2 half or keep, 1/2 each, when DOUBLE HALF is on the bar,
    else x) that exact_kicks.py asserts equal to the bar recursion. P5: SD 2.2408, hit rate 38.7665% (= P0's: a lost half still returns
    the other half).
  * P4 (RTP exact, hit rate and SD bounded): P4's bar states can repeat (a DOUBLE HALF that loses hands the bank back as the held
    amount) and their number runs into the millions. exact_kicks.py propagates the probability of every live bar state (h, B, A) forward
    bar by bar, expands every P4 action exactly (Run Game 1/2, caps, MAX WIN) and drops a state only below a probability of 1e-15 (v169
    needed 1e-9 and 2.2 GB because every ride branched over the whole pay table; with a double-only bar the state count is small and
    the cut could go six orders of magnitude lower). Peak live states 3.65M / 3.80M / 2.98M at $1 / $10 / $100, 48 / 47 / 46 bars deep,
    peak RSS 0.96-0.97 GB, 264 / 256 / 190 s; DROPPED MASS 6.79e-9 / 7.44e-9 / 6.04e-9 of the rounds (v169: 0.12-0.17%). Dropped states
    are valued at W (exact by the martingale argument; the propagation reproduces the base RTP to 8e-14 / 3e-13 / 2e-12, asserted < 1e-10)
    and rigorous bounds are reported as before: RTP in [expanded part, expanded + sum(p W)] = [92.9661, 92.9666] / [92.9662, 92.9666] /
    [92.9663, 92.9666] % (a dropped state is worth between 0 and W without the martingale argument); hit rate in [expanded, expanded +
    dropped mass] (27.6899 / 27.6904 / 27.6904%, intervals narrower than 1e-8); SD in [4.6817, 4.6911] / [4.6819, 4.6884] / [4.6820,
    4.6865] (a dropped state worth W has W^2 <= E[X^2] <= MW x W: Jensen and X <= MW). The cut stays a cut, not zero: a chain of
    "double / double half" bars is unbounded in length (2/3 chance to continue at each bar), so an exact fraction would need the full
    infinite chain.
  * Small amounts: the minimum run is $0.02 (game MINRUN = run-bar MIN_RUN 2 cents). Doubles are exact, so a held amount of a few cents
    loses nothing to rounding (the v169 note that small runs return much less applied to the ride and is gone). DOUBLE HALF needs half
    >= 2 cents (a 4-cent hold or more); a lone cent or a 3-cent hold shows CASH OUT / DOUBLE only (3c) or CASH OUT only (1c). The
    1,000x cap and MAX WIN hide the bar (the game pays at once): checked in the harness (holdWin at MAX WIN and at the run cap pay
    out and show no bar; a hold just under shows it).
  * The best-play distribution has exact ties (both calls of equal value — mostly boards that can no longer pay; 3.46 per game).
    exact_kicks.py decides every call of its exact distribution with the bot's own double-precision comparison, so the exact numbers
    describe exactly the strategy the simulation plays (the board RTP is the exact optimum either way: asserted).
  * Right-call counts 1-3 are compared pooled: the game stops a board early once no pay is reachable (the payout cannot change), so
    a bust board's count is where it stopped. 0, 4, 5 and 6 right are always final.
  * Results: see par.txt section 7 and results.json "checks" / "issues" (any exact value outside its CI is listed there).

HEADLINE RESULTS on f4592849… (full tables in par.txt; every number in results.json)
  Base RTP, exact: best play 92.96659% (200943920392331/216146392994805) · shoe-count caller 92.50672% · random 90.57955% ·
  worst 84.80685%. Best play: SD 1.9606× bet, hit rate 38.7665%, top pay 20× (six right) 1 in 159.9 games; no rounding at any bet.
  Simulation, shipped code, 2,000,000 rounds at $10: 92.8282%, 95% CI [92.5576%, 93.0988%], SD 1.9524, hit 38.7784% — exact inside
  (identical to the v169 run, round for round).
  DOUBLE OR NOTHING: P(right call) = 1/2, P(double) = 1/2 exactly -> 100.0000%; 2.5 decided shots, 2.917 kicks (posts re-kicked) per hand.
  Policies, exact (RTP the same for every policy: 92.9666%) — SD x bet / hit rate, at $1 = $10 = $100 except P4:
    P0 SD 1.9606, hit 38.7665% · P2 SD 2.9245, hit 19.3832% · P3 SD 59.4984, hit 0.0385% (1 in 2,600) ·
    P4 SD [4.6817, 4.6911] / [4.6819, 4.6884] / [4.6820, 4.6865], hit 27.6899% / 27.6904% / 27.6904% ($1 / $10 / $100) · P5 SD 2.2408, hit 38.7665%.
  Small-amount check, P4 at $1 through the shipped code, 200,000 rounds: 93.2129% [91.4612%, 94.9646%], SD 3.997, hit 27.5875%
    [27.3916%, 27.7834%], max 560x -> exact RTP, bounds and hit interval all inside / overlapping.
CHECKS
  27 checks (RTP and hit rate of the base game and of P0, P2, P3, P4, P5 at $10 and $100; base pay tiers, right calls and Posts Bonus
  rates by z-score; P4 at $1, 3 checks, from the small-amount run): 27 inside, 0 OUT. No follow-up run was needed. (v169 had three
  misses: P4 $100 hit rate and P4 $10 RTP, the latter from P4's heavy-tailed payout. They did not recur on this build with the same
  seeds. P4 is still a little heavy-tailed: the exact SD is 4.68 against 4.46 / 3.63 / 4.00 in the $10 / $100 / $1 samples, whose
  largest payouts are 776x / 266x / 560x, so a sample that misses its rare big wins reads a few % low; the CIs above are still
  wide enough to hold the exact value.)
SAME-SEED COMPARISON with the v169 run (feab7531…, minimum $0.02 with RUN IT AGAIN / RUN HALF; old outputs kept in
/home/claude/fix/minrun/v169_kicks_out/, with its results.json, par.txt and README; compare_prev.py -> out/compare_prev.txt):
  every field except the wall-clock 'secs' compared, chunk by chunk (the 'choices' counter of the retired buttons has count 0 in v169 and
  no key now: compared without zero entries).
  * IDENTICAL 58 of the 68 chunks present in both runs: all 40 base chunks (1001..1040: identical sums, histogram of pays, hit counts,
    RNG-draw counts, bonus counters), every P0 chunk (6), every P2 chunk (6) and every P3 chunk (6) — $10 and $100. Base game behaviour
    is bit-identical.
  * CHANGED 10: P4 $10 10401-10404 (RTP 87.64 / 89.95 / 85.64 / 89.22% -> 93.94 / 93.31 / 95.93 / 91.21%), P4 $100 20401-20402
    (91.67 / 90.53% -> 93.83 / 93.62%), P4 $1 small 30401-30404 (90.59 / 105.25 / 94.90 / 94.38% -> 93.74 / 93.83 / 92.91 / 92.37%).
    Different buttons mean different picks, so the bot's choice stream and the game RNG diverge from the first bar.
  * Only in the v169 run (retired): P1 (6 chunks), old P5 = RUN HALF (6 chunks), extra/ P4 $100 20405..20408, followup/ P4 $10
    10405..10424 (24 chunks). Only in this run: P5 = DOUBLE HALF once, 10601..10604 and 20601..20602.
  * Exact values before -> after: P0, P2, P3 identical at $1 / $10 / $100 (same fractions); P4 92.8679% / 92.9155% / 92.9188% ->
    92.9666% (all three: now exactly the base RTP; the old values were the ride's rounding loss plus the old tail model), hit
    26.4581 / 26.4331 / 26.4252% -> 27.6899 / 27.6904 / 27.6904%; P5 (RUN HALF once 92.8447 / 92.9329 / 92.9378%) -> DOUBLE HALF once
    92.9666% (a different policy, not comparable); P1 (RUN IT AGAIN once 92.8438 / 92.9050 / 92.9098%) is retired.
