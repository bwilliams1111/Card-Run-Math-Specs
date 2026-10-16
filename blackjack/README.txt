CARD RUN BLACKJACK 20x - LAB PACK (16 Oct 2026, run-bar v170, DOUBLE OR NOTHING: THE DEALER STANDS ON ALL 17s)
================================================================================
Built on the FINAL build:
  ../builds-final/card-run-blackjack-classic-launch.html
  sha256 381595b2ec0103398f92886e7429afc9624c3a53d6e68ebcd7e86fde01f2708c   131,176 bytes
  (= /home/claude/fix/builds/card-run-blackjack-classic-launch.html)
  Previous build (v170, RIDE-free; the dealer HITS soft 17 in DOUBLE OR NOTHING), sha256 a7fa9e8f33b0deabd6f64ab5acf050cc21f83ac8624dddaa9adbb8d4c72dbfd8,
  kept at /home/claude/fix/minrun/v170/; its pack run (out/ + results.json, par.txt, README.txt) is at /home/claude/fix/minrun/v170_blackjack_out/.
  Change request: "CR: DOUBLE OR NOTHING returns just over 100% (Blackjack)", 2026-10-16 (reference prototype v179), file 2775c482-CR-DOUBLE-OR-NOTHING-RTP-OVER-100.md.

WHAT CHANGED IN THE BUILD (diff against v170: 8 changed lines, nothing else)
  The dealer in the DOUBLE OR NOTHING hand now STANDS on all 17s:   const drawsOn = c => { const t=totals(c); return t.best<17; };   (was: t.best<17 || (t.best===17 && t.soft))
  Copy: felt line 'DEALER STANDS ON 17' (was 'DEALER HITS SOFT 17'); rules sheet "the dealer hits 16 or less and stands on all 17s" (was "the dealer hits soft 17");
  rules table row "DOUBLE OR NOTHING, best play 100.1%" (was 99.9%); the in-game double panel "WIN PAYS 2X · RETURNS 100.1%" (was 99.9%); three code comments.
  Everything else (base game, pays, RNG, run bar v170, DOUBLE HALF, RUN BANK, run cap, MAX WIN, minimum $0.02) is byte for byte the v170 build.
  The CR also lists Clover and Vault rules sentences: those games are not in this build (the pack covers Classic only).

WHY THIS NEEDED MORE THAN A RE-RUN
  Until now every double returned under 100% (99.908%), so CASH OUT (P0, 94.368%) bounded every bar policy; the pack said so in several places (exact_runs.js P4 bracket "UPPER = cut
  paths at their total", the P4 investigation "no policy can beat P0", trace_replay / README / par.txt wording). THAT IS NO LONGER TRUE. The double now wins with
  p = 0.50045487064506489 (best play), a +0.091% bet, so the bar is a slightly favourable betting game with a 1,000x cap. Every policy that doubles beats cash out
  (P2 94.454%, P3 95.230%, P4 94.482%, P5 94.411% against P0 94.368%), and the best policy, found exactly by bar_optimum.cpp (all bar policies, value iteration), returns
  about 97.49% over a whole round (lambda = V*(A)/A = 1.03304 +- 0.00004). The CR's "94.4% worst case" is the ALWAYS-DOUBLE-to-the-cap case on a 93.5% board
  (93.5% x 1.0009^10); on the shipped board's 94.368% best play, always-double is 95.230%; the TRUE worst case is 97.49% (below). The claim "every round strategy stays below
  100%" still holds with a margin of 2.5 points; the figure does not.

Every script runs from inside this folder (labpack/blackjack/), reads the build from ../builds-final/ and nothing else outside labpack/ (except runbar_diff.js and bar_optimum_run.js,
which read /home/claude/fix/runbar/run-bar.js (v170) and copy it to out/, and compare_prev.js, which is given the previous out/ folder). Every exact script READS the pay table,
MADE 21 / BJ columns, max win, minimum, run cap and bets from the build text (consts.js) and the rule fragments its model assumes (infinite deck, S17 board, auto-hit/stand limits,
tie rules, payCents floor, Run Game dealer S17 / felt line / panel text / choices / push re-deal / 2x win, bar MAX WIN clip, DOUBLE and DOUBLE HALF offers, half/keep cents, the DOUBLE
and DOUBLE HALF click handlers, the banked-bust return, CASH OUT's single credit, run cap, ammo), asserts that the build names none of RIDE / RUN IT AGAIN / RUN HALF / kNum ... any
more AND that the previous H17 fragments are gone (the old drawsOn line, DEALER HITS SOFT 17, "hits soft 17", RETURNS 99.9%, the 99.9% table row; consts.js absentH17), and stops if
anything differs. Every output records the build sha256; aggregate.js refuses mixed builds.

FILES
  consts.js        parse the build's constants and rule fragments; check() asserts a script's values equal them; absent() / absentH17() assert the removed mechanics / the old dealer rule
                   are gone.  node consts.js
  exact_board.js   the four-hand board, exact (backward DP, forward pass for the pay distribution; fixed tables for basic / standard chart / random / always stand / always hit).
                   Writes out/exact_board.json and out/optmasks.bin(.json) (the exact best-play table the simulation's bot uses).  ~1 min CPU. Rerun on this build: exact_board.json
                   identical to v170's except the build sha, optmasks.bin byte-identical (the board never meets the double's dealer).
  rungame.js       DOUBLE OR NOTHING exact (fixed point for the push re-deal): win chance, RTP for best / worst / always stand / hit, and (NEW) the fixed charts 'basic' (the rules sheet's
                   board basic play applied to the choices; soft 18 stand) and 'conv' (the conventional blackjack chart, the CR's "basic strategy"). Default dealer rule S17; opts.h17 = true
                   gives the retired rule (v170) so the pack can print both.  node rungame.js prints both rules and the chart variants.
  exact_runs.js    DOUBLE OR NOTHING; the run-bar policies P0 P2 P3 P4 P5 exact at $1 / $10 / $100 (bar rules of showControls in cents). P2, P3 and P5 by closed forms too (asserted equal
                   to 1e-12); P4 by full recursion cut at EPS4 (default 1e-12) with a tail model; the P4 bracket's upper bound is NEW (see the P4 line in RESULTS).  Writes out/exact_runs.json.
                   ~6 minutes (P4 about 105-120 s per bet).
  bar_optimum.cpp  NEW. The exact optimum over ALL bar policies (CASH OUT / DOUBLE OR NOTHING / DOUBLE HALF at every bar) for an ammo of A cents: state (held S, RUN BANK B) in whole cents,
                   value iteration (Gauss-Seidel, reverse discovery order, relative residual 1e-13), optimal action per state, and the values of "always DOUBLE" (= P3) and "always DOUBLE HALF"
                   on the same graph. Rules written from the build / run-bar v170: the round ends paying B + S in full when B + S >= 1,000 A (or MAX WIN); DOUBLE offered iff S >= 2c and
                   B + 2S <= MW; DOUBLE HALF iff half = floor(S/2) >= 2c and B + keep + 2 half <= MW (keep = S - half goes to the RUN BANK); a won double: held 2 x stake (bank kept); a lost
                   double: the bank (plus keep) comes back as the held amount, a lost double with no bank ends the round with 0. Modes: solve, check.
  bar_optimum_run.js  NEW. Driver: reads MIN_RUN, RUN_CAP_X, MAX_WIN_X and p (17 digits, rungame.js) from the build, asserts the build's offer / half / cap / lost-double fragments, solves a list of
                   ammo values (exact p = best play in the double; basic p = the conventional chart), and 'check': the C++ offers against RunBar.compute() of run-bar v170 on 1,351,200
                   states (edge + random), 0 differences, a mutant (minimum 3 cents) caught.  Writes out/bar_optimum_{exact,basic,exact_mw,exact_policy}.json/.log, out/bar_optimum_check.json.
  run_bar_optimum.sh, run_bar_optimum_2.sh   the solve lists (memory capped at 5.5 GB, one process at a time; A = 200c is 20.3 million states, 6.5 minutes; A = 300c 32.5 million states, 23 minutes).
  bar_policy_eval.js  NEW. Independent JS check of the C++ result: evaluates the policy table the solver wrote by value iteration over all its states and proves it optimal (no state where another
                   offered action is better), and reproduces V*(A).  A = 10, 20, 40: out/bar_policy_eval.log.
  bar_policy_sim.js   NEW. The optimal policy table of A = 40c played through the SHIPPED code (showControls + runGame, best play in the double), fixed ammo; sample mean of final / A v V*/A.
  round_worst.js   NEW. The round-level worst case: exact sum, extrapolation A -> infinity (Richardson pairs and least squares, error rule), lambda-hat, the upper bound; out/round_worst.json.
  double_sim.js, run_double_sims.sh   NEW. DOUBLE OR NOTHING hands through the shipped runGame(), one resolved hand per call (best play 'opt' and the conventional chart 'conv').
  browser_smoke.js NEW. Headless Chromium (puppeteer) rig tests of the build: dealer soft 17 (A,6) stands with no third card, dealer hard 16 hits, felt line, panel, rules sheet, a round through
                   CASH OUT / DOUBLE OR NOTHING / DOUBLE HALF; screenshots in out/shots/.  NODE_PATH=/opt/npm-tools/node_modules node browser_smoke.js
  harness.js       runs the SHIPPED game script of the build in node with documented, outcome-neutral transforms (no sleeps, no async, the Run Game HIT/STAND asked of a bot, an exposure
                   object appended in memory); stub DOM; nothing added to the build.
  strategy.js      board HIT/STAND for the bot: 'opt' (exact best play from out/optmasks.bin), 'basic' (rules sheet), 'conv' (chart).
  seedcrypto.js    preload: replaces crypto.getRandomValues with a seeded xoshiro128** stream (seed = SEED_CRYPTO, splitmix32 init).
  policy.js        plays N rounds of the shipped code with a policy P0 P2 P3 P4 P5, best play on the board (opt) and in DOUBLE OR NOTHING; writes out/sim_*.json with the payout histogram.
  run_sims.sh      all round simulation jobs with their seeds (below). First argument: jobs in parallel (default 2; this run used 1).
  mc_model.js      cross-check: a Monte Carlo of the exact bar model itself (not the game code), 25,000,000 P4 rounds in about a minute; also P(pay >= x) and truncated means. NEW: fixed-ammo
                   mode with a policy table (policy OPT).
  trace_check.js   plays the shipped code with a policy and checks every bar-to-bar transition against the exact bar model.
  trace_replay.sh  replays every P4 simulation job through trace_check.js on the job's own seeds (the same rounds), every transition of every simulated P4 round is checked.
  runbar_diff.js   the run-bar equality proof (unchanged logic): shipped showControls v run-bar v170 compute(), 1,594,400 states.
  compare_prev.js  same-seed comparison with the previous pack run (minrun/v170_blackjack_out/out), and exact policy values before / after.
  run_post.sh      model Monte Carlo, trace_check, trace_replay, P4 convergence, optimal-policy checks (the order they ran in).
  aggregate.js     pools the simulations, checks every exact value against its 95% CI, writes results.json and par.txt.      cr_report.js  writes out/CR_report.txt (the CR's section 9 block).
  BLACKJACK-MATH.md / .pdf / .docx   the separate Blackjack math document for the lab (rules, pays, board maths, the double hand, the bar, the exact optimum, simulations, how to reproduce). The .md
                   and .docx are the same text; the .pdf is the formatted version. Every number in them is in par.txt / results.json.
  results.json     every headline number (exact + simulation + CI checks + build sha).      par.txt   the PAR tables as plain text (sections 1-8).
  out/             raw outputs (the v170 out/ is at minrun/v170_blackjack_out/out/).

COMMANDS (in order, from labpack/blackjack)
  node consts.js
  node exact_board.js > out/exact_board.log
  node rungame.js > out/rungame.log
  node exact_runs.js > out/exact_runs.log                       (~6 minutes)
  node runbar_diff.js > out/runbar_diff.log                     (~25 s)
  ./run_sims.sh 1 > out/run_sims.log                            (about 25 minutes of CPU; jobs whose output exists are skipped. The four P2 $100 follow-up jobs, crypto 3202-3205, were added after
                                                                the first pass and run with ./run_sims.sh 1 > out/run_sims_followup2.log; run_sims.log ends with a shell error because the script's
                                                                comment block was edited while it was running: all 44 first-pass jobs had finished, run_sims_rerun.log shows every one skipped)
  ./run_double_sims.sh 1 > out/run_double_sims.log              (20 jobs x 1,000,000 hands, about 70 s each)
  ./run_bar_optimum.sh > out/bar_optimum.log ; ./run_bar_optimum_2.sh > out/bar_optimum_2.log      (about 1.5 hours + the A = 300c run)
  ./run_post.sh > out/run_post.log                              (mc_model, trace_check, trace_replay, convergence, optimal-policy checks)
  for A in 10 20 40: BAR_TAG=policy BAR_POLICY=out/bar_policy node bar_optimum_run.js solve exact $A ; node bar_policy_eval.js $A out/bar_policy_exact_$A.bin 0.5004548706450649 >> out/bar_policy_eval.log
  NODE_PATH=/opt/npm-tools/node_modules node browser_smoke.js
  node compare_prev.js ../../minrun/v170_blackjack_out/out > out/compare_prev.txt
  node round_worst.js ; node aggregate.js ; node cr_report.js   -> out/round_worst.json, results.json, par.txt, out/CR_report.txt

POLICIES (one bet per round; runs are funded by the round's own winnings; best play on the board and in DOUBLE OR NOTHING)
  P0 CASH OUT at the first bar            P2 DOUBLE OR NOTHING once, then cash out
  P3 DOUBLE OR NOTHING while offered (to the 1,000x cap / MAX WIN), else cash out
  P4 a uniform random pick among the buttons shown (CASH OUT / DOUBLE OR NOTHING / DOUBLE HALF) at every bar
  P5 DOUBLE HALF once (if offered), then cash out        P1 retired with RUN IT AGAIN (number not reused)
  OPT  (new) the optimum over all bar policies (bar_optimum.cpp)

SEEDS (seedcrypto.js: SEED_CRYPTO; policy.js 5th argument: the P4 pick stream, sfc32) - the same seeds as the v170 run for every chunk that still exists
  base      P0 $10, 8 x 250,000 rounds = 2,000,000: crypto 1001-1008
  policies  Pi at $10, 2 x 100,000 rounds: crypto 2i01, 2i02 (i = 0 2 3 4 5), policy seeds 4i1, 4i2;  Pi at $100, 1 x 100,000 rounds: crypto 3i01, policy seed 4i3
  extra P4 $10: 4 x 100,000 rounds crypto 2403-2406, policy seeds 4401-4404;  small amounts: P4 $1 2 x 100,000 crypto 1401 1402 (policy 4411 4412); P5 $1 2 x 100,000 crypto 1501 1502 (4511 4512)
  P4 follow-up (independent replication, reported apart): $10 4 x 100,000 crypto 2407-2410 (4405-4408); $100 5 x 100,000 crypto 3402-3406 (4431-4435); $1 4 x 100,000 crypto 1403-1406 (4413-4416)
  NEW  P2 $100 follow-up (the first pass missed on the hit rate; chosen once after seeing the miss, run once): 4 x 100,000 crypto 3202-3205
  NEW  double hands through the shipped runGame (double_sim.js): best play 10 x 1,000,000 crypto 5101-5110; basic strategy (conventional chart) 10 x 1,000,000 crypto 5201-5210
  NEW  optimal bar policy at A = 40c, shipped code (bar_policy_sim.js): 2 x 500,000 rounds crypto 6001 6002;  bar-only model (mc_model.js OPT, sfc32): 2 x 100,000,000 rounds seeds 7001 7002
  model Monte Carlo of P4 (mc_model.js, sfc32): $10 seeds 11, 12; $1 seed 13, $100 seed 14 (25,000,000 rounds each).   trace_check.js: crypto 78 / 79 / 77, policy 81 / 82 / 80 ($10 / $100 / $1).
  runbar_diff.js: sfc32 170170.   bar_optimum_run.js check: sfc32 1717.   trace_replay.sh: each P4 job's own seeds.
  The first-pass P4 pools (the CI checks) are: $10 crypto 2401-2406 (600,000 rounds), $100 crypto 3401 (100,000), $1 crypto 1401 1402 (200,000); P2: $10 2201 2202, $100 3201.

RESULTS (this run; every number is in results.json / par.txt)
  Base game: 94.368% best play (exact, unchanged); 8 x 250,000 simulated rounds 94.344% [94.213%, 94.475%], exact inside. Rules-sheet basic play 93.448%, worst 81.95%.
  DOUBLE OR NOTHING (exact, rungame.js; dealer stands on all 17s): win chance per resolved hand p = 0.50045487064506489 (50.0455%), RTP 100.0910% at best play = 2p (CR 1: 1.000910);
    basic strategy (the conventional no-doubling chart, soft 18 by the chart) 100.0721% (win chance 50.0360%); worst 92.0888%, always stand 94.7814%, always hit 97.3050%;
    pushes 4.052% per deal at best play (4.000% at basic), 1.04223 deals per resolved hand. A win pays exactly 2x the stake: no rounding at any stake.
    Same figures with the dealer hitting soft 17 (opts.h17): best 99.9077%, basic 99.8981%, worst 91.917%, stand 94.881%, hit 96.850%: the CR's "before" column is reproduced to 4 decimals.
    'Basic' is the CR's: ordinary blackjack basic strategy = strategy.js convMask (hard 12 stand against 4-6, hard 13-16 stand against 2-6, soft 17 hit, soft 18 stand against 2-8 and hit against
    9, 10, A); the CR's 100.0721 (and 99.8981 under H17) is reproduced exactly. The rules sheet's own "basic play" is a BOARD strategy (soft 18 does not exist there); applied to this hand with soft 18
    = stand it returns 99.9579% (soft 18 hit 99.9630%, by the chart 100.0378%): not the CR's figure, listed in out/rungame.log for information.
  Exact policy values, best play (before = v170, dealer hits soft 17; after = S17 double; P4 at eps 1e-12; all independent of the bet to 1e-5):
            before           after            change
    P0      94.36791%        94.36791%        0           (cash out: the board only)
    P2      94.28086%        94.45376%        +0.17291    P2 = P0 + (2w-1) x E[ammo doubled]: closed form asserted equal to 1e-12
    P3      93.50097%        95.22993%        +1.72897    P3 = E[ammo x (2w)^10], 1,024 A >= 1,000 A: closed form asserted equal to 1e-12 (= 94.368% x 1.0009^10 x ...)
    P4      94.25199%        94.48248%        +0.23049    full recursion; cut mass 0.0188%; convergence 94.482503 (eps 1e-7) ... 94.482480 (1e-12): good to 0.00003 points
    P5      94.32439%        94.41084%        +0.08645    closed form: RTP(P0) + (2w-1) E[half] / bet = 94.36791% + 0.04293 points; 2w - 1 = +0.000910 (was -0.000923)
    (all three bets $1 / $10 / $100 give the same values; P3 differs by < 1e-7 at $100 where the MAX WIN equals the run cap for a 20x ammo)
    SDs: P2 1.633x, P3 42.84x (hit rate 1 in 1,460), P4 2.692x (a lower bound), P5 1.154x.
  P4's bracket. The old rigorous upper bound (a cut path is worth at most its total) is INVALID now. New: lower = cut paths at 0 (rigorous); upper = lower + Lambda x cutTotalX where Lambda
    >= V*(S,B)/(S+B) over all states (from bar_optimum: the state-wise maximum is attained at the smallest states (S + B = 2c) and grows as a power law of the room under the cap,
    max = exp(-0.00365) x room^0.00457, fitted on the solved ammo (maximum V*/T 1.0326 at A = 5c ... 1.0502 at A = 200c) and extended to the largest ammo at each bet: Lambda 1.073 at $10).
    $10 [94.1888%, 94.5034%] (the tail-model value 94.48248% lies inside, near the top); $1 [94.1887%, 94.5001%]; $100 [94.1888%, 94.5068%]. The upper end is only as good as the power-law
    extension; the answer is the convergence (above), not the bracket.
  Same seeds as v170 (compare_prev.js -> out/compare_prev.txt): every base (8) and P0 (3) job is IDENTICAL (rounds, sum and sum of squares of the pays, hit rate, max pay, crypto values
    drawn, full payout histogram): 11 identical. P2 (3), P3 (3), P4 (18) and P5 (5 incl. $1) jobs CHANGED, as they must (the double's dealer changed): 33 changed, 0 new, 0 retired.
  RUN-BAR EQUALITY (runbar_diff.js -> out/runbar_diff.json): 1,594,400 states, 0 + 0 differences (shipped showControls v run-bar v170 compute(); buttons, amounts, MAX WIN / cap pays).
  CI checks: 37 first-pass checks (RTP and hit rate: base; P0 P2 P3 P4 P5 at $10 and $100; P4 and P5 at $1; the model Monte Carlo's P4 hit rate against the game CI at $1 / $10 / $100;
    DOUBLE OR NOTHING through the shipped code: RTP and pushes per deal at best and at basic; the optimal bar policy at ammo 40c). 36 inside; 1 outside: P2 hit rate at $100 on the
    first-pass seed (exact 34.796%, sample 35.121% [34.825%, 35.417%], 2.15 SE, p = 0.031; 37 checks at 5% show about 1.9 misses by chance). Independent follow-up seeds 3202-3205 (400,000
    rounds, chosen once after the miss, run once, reported apart, never pooled): P2 hit rate 34.660% [34.513%, 34.807%], exact 34.796% inside; P2 RTP inside. P4 follow-ups ($1, $10, $100): all inside.
  DOUBLE OR NOTHING THROUGH THE SHIPPED CODE (double_sim.js, runGame of the build, one resolved hand per call, pushes dealt again inside the call):
    best play      10,000,000 hands: win chance 50.0673%, RTP 100.135% [100.073%, 100.196%] (exact 100.0910%: inside, z 1.4); pushes 4.050% per deal [exact 4.052%: inside]
    basic strategy 10,000,000 hands: RTP 100.099% [100.037%, 100.161%] (exact 100.0721%: inside, z 0.8); pushes 3.998% per deal [exact 4.000%: inside; the CR's "about 4.0%"]
    A resolved hand pays 0 or 2x, so 10 million hands fix the RTP only to +-0.06 points: the shipped-code runs show consistency with the exact value (and the sign, 2 SE for best play), not the
    third decimal; the third decimal is the exact evaluator, checked by 5 independent figures (it reproduces the CR's before and after columns).
  RIG TESTS (browser_smoke.js, headless Chromium 430 px, 14 checks, all pass, screenshots out/shots/): the felt reads DEALER STANDS ON 17; the double panel reads WIN PAYS 2X · RETURNS 100.1%;
    dealer A,6 (soft 17): stands, two cards, total 17, the queued sentinel card was never drawn; dealer 10,6 (hard 16): hits, third card drawn (10,6,2 = 18); DOUBLE OR NOTHING won -> CASH OUT
    $40.00 / DOUBLE OR NOTHING $80.00; DOUBLE HALF won -> RUN BANK $20.00 chip, CASH OUT $60.00, DOUBLE OR NOTHING $80.00; CASH OUT -> CASHED OUT PAID $60.00; the rules sheet reads "the dealer
    hits 16 or less and stands on all 17s" and "DOUBLE OR NOTHING, best play 100.1%", no "hits soft 17" left; no page errors.
  trace_check.js (shipped bar v the exact bar model): $1 25,296 / $10 25,043 / $100 25,093 transitions, 0 mismatches; trace_replay.sh: all 22 P4 jobs replayed on their own seeds (same rounds),
    2,200,000 rounds, 2,184,075 transitions, 0 mismatches.   Model Monte Carlo of P4 (25-50 million rounds): $1 94.423% [94.311%, 94.536%], $10 94.477% [94.396%, 94.557%], $100 94.447%
    [94.338%, 94.557%]: the exact 94.482% inside all three.

THE OPTIMUM OVER ALL BAR POLICIES (bar_optimum.cpp; out/bar_optimum_exact.json; par.txt section 7)
  p = 0.50045487064506489 (the double at best play). A = the first win (cents). lambda(A) = V*(A)/A. All values by value iteration to a relative residual of 1e-13 (about 350 sweeps).
    A (c)   states        V*/A          always DOUBLE   always DOUBLE HALF   start action
      5        241,575   1.031066        1.009135        1.012794          DOUBLE HALF
     10        567,875   1.032151        1.009135        1.021982          DOUBLE HALF
     20      1,319,328   1.032639        1.009135        1.026800          DOUBLE HALF
     30      2,149,167   1.032821        1.009135        1.028665          DOUBLE HALF
     40      3,033,454   1.032859        1.009135        1.029350          DOUBLE HALF
     50      3,957,541   1.032950        1.009135        1.030016          DOUBLE HALF
     60      4,914,833   1.032942        1.009135        1.030304          DOUBLE HALF
     70      5,900,442   1.032980        1.009135        1.030543          DOUBLE HALF
     80      6,911,729   1.032956        1.009135        1.030705          DOUBLE HALF
     90      7,943,561   1.032992        1.009135        1.030861          DOUBLE HALF
    100      8,993,268   1.032996        1.009135        1.031040          DOUBLE HALF
    120     11,145,561   1.032993        1.009135        1.031201          DOUBLE HALF
    130     12,241,991   1.033032        1.009135        1.031301          DOUBLE HALF
    150     14,485,841   1.033014        1.009135        1.031394          DOUBLE HALF
    160     15,624,481   1.032997        1.009135        1.031425          DOUBLE HALF
    170     16,774,051   1.033007        1.009135        1.031468          DOUBLE HALF
    200     20,282,073   1.033015        1.009135        1.031597          DOUBLE HALF
    300     32,536,195   1.033024        1.009135        1.031792          DOUBLE HALF   (23 minutes)
  Basic strategy p = 0.50036044049423456 (+0.0721% per double): A 5 1.024541, 10 1.025395, 20 1.025779, 40 1.025951, 100 1.026059, 200 1.026074 (always DOUBLE 1.007232); the exact-p figures
    are above (the optimum depends on the edge: +0.091% gives 1.0330, +0.072% gives 1.0261).
  The optimal policy NEVER cashes out before the cap (CASH OUT is the optimal action in no state, A = 5 ... 300): it keeps betting until it is broke or reaches the 1,000x cap. It mixes the two bets by the share of the held amount in everything at stake (A = 40c policy table, states with both offered,
    away from the cap): at the start (held = everything) and whenever the held amount is more than about 45% of held + bank it plays DOUBLE HALF in every state; when the share is under about 25% it
    plays DOUBLE in most states (about 75-85%, the rest depend on the size of the amounts); between 25% and 45% the choice changes with the share and the size. DOUBLE is also the only bet when
    half < 2c, and near the cap. Always DOUBLE gives 1.009135 = (2p)^10; always DOUBLE HALF 1.0316 at A = 200c: the optimum 1.0330 is the mix.
  A -> infinity: lambda(A) rises as 1/A: Richardson pairs (A, 2A): (5,10) 1.033236, (10,20) 1.033126, (20,40) 1.033079, (40,80) 1.033053, (100,200) 1.033034; second order (A, 2A, 4A): 1.033090 (5),
    1.033063 (10), 1.033044 (20), 1.033032 (40); least squares on A >= 40: 1.033055 (1/A) / 1.033022 (1/A and 1/A^2); with A = 300c added: (150,300) 1.033034. lambda(infinity) = 1.033039 +- 0.000036 (1.03304 +- 0.00004). The error is the lattice noise of whole-cent
    halves and the 2c minimum (about 2e-5, the residual of every fit); there is no analytic check of the continuum limit here.
  lambda(A) is NOT monotone: A = 130 (1.033032) is higher than A = 150, 160, 170, 200, 300 (1.033024), A = 50 > 60, A = 70 > 80, A = 100 > 120 (largest excess 3.6e-5; 10 pairs in all). The round-level upper bound therefore takes
    lambdaHat = max(largest solved, lambda(infinity) + error) = 1.03308 and ASSUMES lambda(A) <= lambdaHat for every A: the solved values and the fitted law support it (every solved A is below
    1.03304 + 0.00004 + lattice noise), it is not proved for the unsolved A (between the solved sizes, and A > 300c).
  MAX WIN clip at its tightest (an ammo of 20 x the bet: MAX WIN = the run cap = 1,000 A; bar_optimum_exact_mw.json): A = 20c 1.031059 v 1.032639, 40c 1.031279 v 1.032859, 60c 1.031362 v 1.032942, 100c 1.031416 v 1.032996 (MAX WIN on v off): -1.58e-3 at every size, always DOUBLE 1.008218 v 1.009135; offers that would pass MAX WIN disappear, the value only falls.
  Checks of the solver: (1) offers v run-bar v170 compute(): 1,351,200 states, 0 differences, mutant caught (37,943); (2) independent JS evaluation + optimality proof of the policy table at
    A = 10, 20, 40: V*/A equal to 1e-12, 0 one-step improvements, cash out chosen nowhere (out/bar_policy_eval.log); (3) the A = 40c policy table played through the SHIPPED code, 2 x 500,000 rounds
    (crypto 6001, 6002): mean final/A 0.971 and 1.048, both CIs (+-0.10) contain V*/A = 1.03286 (and also 1.009: SD per round is 37-41 x A, the shipped-code run is a consistency check); (4) the same
    policy in the bar-only model, 2 x 100,000,000 rounds: mean final/A 1.03718 [1.02971, 1.04466] (seed 7001) and 1.03355 [1.02609, 1.04102] (seed 7002), both contain V*/A = 1.032859; pooled 1.03537 [1.0301, 1.0407], 9.7 SE above always DOUBLE (1.009135) - the bar-only model tells the optimum from always-double, the shipped-code run (3) cannot; (5) P3 on the graph = the closed form (2p)^10 at every A; (6) the P4 / P5 / P2 / P3 exact values come from
    exact_runs.js (own code); P2, P3, P5 equal their closed forms.
  ROUND-LEVEL WORST CASE (best base play, then the best bar policy; expected pay / bet; par.txt section 8):
                  cash out P0   always DOUBLE P3   exact sum (solved A)   estimate   upper bound
      $1           94.3679%      95.2299%         70.723% in 59.5% of rounds   97.482%    97.489%
      $10          94.3679%      95.2299%         3.290% in 10.6% of rounds    97.487%    97.489%
      $100         94.3679%      95.2299%         (none solved)         97.487%    97.489%
    exact sum = sum over the ammo values with a solved V*(A) of P(A) x V*(A) / bet: at $1 the ammo values 30c, 40c, 50c, 70c ... 200c, 300c (14 values) cover 86% of the winning rounds and 73% of the
    expected ammo; at $10 only 300c is solved (15% of the winning rounds, 3% of the expected ammo) and at $100 the smallest ammo (3,000c) is beyond the solved sizes. estimate = the exact values where solved and lambda_fit(A) = 1.033055 - 0.0067/A elsewhere.
    upper bound = (best-play board return 94.368%) x lambdaHat 1.03308 = 97.489%, assuming lambda(A) <= lambdaHat for every ammo (above). Gap between estimate and bound: 0.007 points at $1, 0.002 at $10 and $100.
    Joint optimisation of base and bar play: for ANY base policy E[V*(ammo)] <= lambdaHat x E[ammo], and E[ammo] is the base RTP, largest (94.368%) at best play (the exact DP), so the optimum over
    base play AND bar play is below 97.489% as well and above the best-play exact sum; the two differ by <= 0.007 points: base play is not worth re-optimising for the bar. The true worst case of
    the lab is therefore 97.49% (+- 0.01; estimates 97.482 / 97.487 / 97.487%, bound 97.489%), not 94.4%.

SMALL AMOUNTS
  The minimum for DOUBLE OR NOTHING / DOUBLE HALF is $0.02 (a half link needs half >= $0.02); doubles are exact, so there is no rounding at any stake. P5 at $1: 200,000 rounds of the shipped code
  94.222% [93.712%, 94.733%], exact 94.411% inside; hit rate 69.38% [69.18%, 69.58%], exact 69.53% inside. P4 at $1: 200,000 rounds 95.163% [93.777%, 96.550%], exact 94.482% inside.
  In the bar optimum the 2c minimum is part of the lattice noise of lambda(A) (A = 5c: 1.0311, A = 200c: 1.0330).

P4 (CI history, v170 -> now)
  v170 had one first-pass miss (P4 at $1) which the follow-up seeds did not repeat; v169 one at $10. This run: every P4 first-pass check inside ($10 600,000 rounds 94.069% [93.291%, 94.848%],
  $100 100,000 rounds 93.775%, $1 200,000 rounds 95.163%; follow-ups $1 94.074%, $10 94.129%, $100 94.160%, all inside; pooled informational: $1 94.437%, $10 94.093%, $100 94.096%), replay and
  transition checks clean, model Monte Carlo inside. P4's heavy tail (model SD 2.8-2.9x, pays of 50x and more carry 2% of the return) is unchanged by the S17 double.

NOTES
  - Board pays are whole cents at every legal bet (bets on the $0.10 grid, every pay a whole number of tenths), so the base game and DOUBLE OR NOTHING (2x) have no rounding at all.
  - "Best play" on the board uses every card on the table (exact DP); DOUBLE OR NOTHING best play is exact.
  - P3 (double to the cap) has SD about 42.8x and a hit rate of 1 in 1,460: its simulated CI is wide by nature.
  - Simulation CIs: mean +- 1.96 SD / sqrt(N) of the pooled jobs; hit rate CIs binomial. P4's hit-rate check allows the cut mass (0.019 points).
  - The CR's rules-sheet wording gives two figures (100.09% and 100.07%) and names Clover and Vault; the Classic sheet of this build prints one row, "DOUBLE OR NOTHING, best play 100.1%", and the
    double panel "RETURNS 100.1%" (the figures the brief specified); the 100.07% basic figure is in par.txt / results.json.
  - results.json: "doubleOrNothing" (exact table incl. basic and the H17 comparison), "doubleSim", "barOptimum" (solver table, extrapolation, monotonicity, round-level), "fixedAmmoChecks", "headline.roundWorstCase",
    "followUpChecks", "p5ClosedForm", "smallAmounts", "p4Investigation".

ZIP NOTE: the zips omit out/bar_policy_exact_{10,20,40}.bin (the optimal policy tables, 44 MB; regenerate with the BAR_POLICY line under COMMANDS) and the compiled ./bar_optimum (g++ -O2 -o bar_optimum bar_optimum.cpp).
         runbar_diff.js and bar_optimum_run.js read ../shared/run-bar.js (v170) when it is there.
