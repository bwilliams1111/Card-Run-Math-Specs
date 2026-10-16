CARD RUN CRASH 20× — LAB PACK (batch 3; re-run 16 Oct 2026 on run-bar v170: RUN IT AGAIN and RUN HALF removed)
=============================================================================================================
Build under test: ../builds-final/card-run-crash-classic-launch.html
  sha256 123d6bced443c4c42038569cbc107af207b3dc49ed6bef05fcb621bf6adaa075  (137,528 bytes). Every script here reads only that file and
  files inside labpack/crash/ (compare_prev.py also reads the previous outputs, see below).
  The bar after any win is CASH OUT / DOUBLE OR NOTHING / DOUBLE HALF (with the RUN BANK escrow, the banked-bust rule, the 1,000× run cap and
  MAX WIN 20,000×). The minimum run is $0.02: DOUBLE OR NOTHING is offered from a held $0.02, DOUBLE HALF from a held $0.04 (half >= $0.02).
  A double is exact (no rounding); only the LOCK IN offers of DOUBLE OR NOTHING round down to the cent. The embedded run-bar module is v170
  (`var MIN_RUN = 2, CAP_X = 1000;`, version '170'). Base game, build target (20×, top pay in full), MAX WIN, bet grid $1.00–$100.00 in
  $0.10 steps, integer-cent floor rounding and the RNG are unchanged.
  History: batch-3 build b013bbc0… (v168, minimum run $1.00) -> 5713b1f7… (text/CSS) -> 06fbbbcc… (v169, minimum run $0.02, with RUN IT AGAIN /
  RUN HALF) -> this build 123d6bce… (v170: the ride and RUN HALF are stripped; the bar is double-only). Removed in the build: startRide,
  rideKMil / rideK / rideBase / RIDE_CFG, the kMil branch of ladder(), leg.ride / P.ride / pending.ride, the bar-run / bar-runhalf actions,
  the RUN IT / RUNNING badges and labels, the ride run_result events, leg.capC / buy.runBase, the rules-sheet RUN IT AGAIN paragraph and
  99.9% row, the RUN HALF text and the v169 small-run rounding note. The v169 pack output is kept, unchanged, in
  /home/claude/fix/minrun/v169_crash_out/ (with its README, par.txt, results.json and scripts) for the same-seed comparison.

HOW TO RUN (from anywhere; the script cds into this folder; node >= 18 and python3; about 6 minutes on an idle core)
  ./run_all.sh
which runs, in order:
  sha256sum ../builds-final/card-run-crash-classic-launch.html                   -> out/build.sha256
  python3 -I exact.py                                                              -> out/exact.json, out/exact.txt (log out/exact.log)
  node sim_base.js 500000 <seed> <bet cents> out/base_<bet>_s<seed>.json          base game, 16 runs (seeds below)
  node sim_policy.js <P0|P2|P3|P4|P5> <lock1|auto> <rounds> <seed> <bet cents> out/pol_<bet>_<build>_<P>_s<seed>.json   40 runs (out/sim_policy.log)
  node sim_policy.js <P0|P2|P3|P4|P5> lock1 100000 <seed> 100 out/pol_100_lock1_<P>_s<seed>.json   small amounts at $1, 10 runs (out/sim_policy_small.log)
  node sim_base.js 500000 <seed> <bet cents> out/inv_base_<bet>_s<seed>.json      follow-up rounds (investigation only), 12 runs
  python3 -I compare_prev.py ../../minrun/v169_crash_out                           -> out/compare_prev.json/.txt (skipped if that folder is absent)
  python3 -I summarize.py                                                          -> results.json, par.txt, out/ci_checks.txt
Single runs can be repeated with the same command lines (out/sim_base.log, out/sim_policy.log, out/sim_policy_small.log, out/sim_followup.log).

FILES
  exact.py        Exact solver (Python fractions). Parses the money constants from the build text with regexes that must match exactly once —
                  CFG.classic (rBp 9300, opening), the plain ladder recurrence (num*=6n; den*=5n; base den 10000; BigInt floor), TABDEFS cap 20,
                  MAX_WIN_X 20000 (operator = platform), RUN_CAP_X 1000, raceP first to 3 and its floor offer, 8 decks and the suit / red /
                  bust rules, the bet grid 100/10000/10, the legDeal top-red rule (leg.buy.cap), the run bar's MIN_RUN 2 ($0.02), CAP_X 1000,
                  show.double / show.doubleHalf / cashOutOnly and version '170', the bar actions (exactly bar-cash, bar-double,
                  bar-doublehalf) — and asserts each equals the value it uses. It also asserts the ride is absent from the build text (no kMil,
                  RIDE, rideK, startRide, bar-run, bar-runhalf, runIt, runHalf, leg.ride, P.ride, capC, runBase, RUN IT AGAIN, RUN HALF except
                  the run-bar banner comment, and no 'RUN IT' other than the logo alt text, its code comment and the rules heading "Run it").
                  Outputs: every stop's pay / reach / RTP / SD / hit at $1, $10, $100; best / worst / AUTO / uniformly random stop; the whole
                  $0.10 bet grid; top pay and odds; DOUBLE OR NOTHING (played out, LOCK IN offers, rounding at $1/$10/$100); the lowest LOCK IN
                  offers over SMALL amounts ($0.02–$0.99, reported apart from $1.00 and up) with a per-amount table; policies P0, P2, P3, P5 exact at
                  $1, $10 and $100 (an exact model of the shipped flow: barEnter -> RunBar.compute -> startRun -> bankedBust -> endPaid / settle),
                  with their pay distributions. P5 also has an independent closed form that the script asserts equal to the flow model.
                  P4 has no exact value (its reachable (held, RUN BANK) graph still exceeds 10^6 states without the ride; counted to 3 × 10^6);
                  bound P4 <= P0 (every run returns at most what it stakes on average).
  engine.js       Loads the build's own scripts (run-bar module + game, verbatim) into node: seeded crypto.getRandomValues (xoshiro128**
                  seeded by splitmix32(seed)), virtual-time timers, a DOM stub, a CardRunRules stub (the rules sheet is DOM-only); prints / returns
                  the sha256 of the build and of each script.
  sim_base.js     Base game through the shipped newBuy / newLeg / legDeal / riding / ladder: deals each round to a bust or the top red;
                  scores all 18 stops on the same cards and a uniformly random stop (player stream seed+1).
  sim_policy.js   Whole rounds through the shipped flow (act('again') ... act('bar-*') ... settle) with a player who presses what the policy says,
                  only among the buttons RunBar.compute shows (player stream xoshiro128**(splitmix32(seed ^ 0x5bd1e995)));
                  checks one settle per round, wallet = pay - bet, nothing above MAX WIN, no timers left.
  compare_prev.py Same-seed comparison with the v169 run: every base_/inv_base_/pol_ output present in both folders compared field by field
                  (ignoring wall-clock 'secs' and the build/script hashes) -> IDENTICAL / CHANGED; files only in the old folder -> RETIRED
                  (P1, old P5) or MISSING; files only in the new one -> NEW; every exact value that differs.
  summarize.py    Pools the seeds, puts every exact value against its 95% CI (out/ci_checks.txt), investigates misses with the follow-up seeds,
                  writes results.json (headline numbers, headline.small_amounts, comparison_with_previous_run) and par.txt (the PAR tables,
                  ready to paste; section 6 = the comparison).
  out/            raw outputs: exact.json/txt, base_*.json, pol_*.json, inv_base_*.json, compare_prev.*, *.log, ci_checks.txt, build.sha256.

SEEDS (all documented in the json outputs too)
  base   $10: 1001..1008 (8 x 500,000 = 4,000,000)   $1: 1101..1104 (2,000,000)   $100: 1201..1204 (2,000,000)       (same as v169)
  policies: seed = 30000 + 1000*bet_index (0 = $10, 1 = $100, 2 = $1) + 100*build_index (0 = lock1, 1 = auto) + 10*slot + part (1, 2),
            slot = the policy number for P0, P2, P3, P4 (same seeds as v169) and 6 for P5, so no v169 seed is reused for the new P5:
            $10: 2 x 500,000 = 1,000,000 rounds per policy and build;  $100: 2 x 250,000 = 500,000
            $1 (small amounts, build lock1 only): 2 x 100,000 = 200,000 per policy, seeds 32001/32002 (P0), 32021/32022 (P2), 32031/32032 (P3),
            32041/32042 (P4), 32061/32062 (P5)
            P5 seeds: 30061/30062 ($10 lock1), 30161/30162 ($10 auto), 31061/31062 ($100 lock1), 31161/31162 ($100 auto), 32061/32062 ($1 lock1)
  follow-up (investigation only, never pooled into the tables): $1 1301..1304, $10 1401..1404, $100 1501..1504 (2,000,000 each)

DEFINITIONS
  build lock1 = LOCK IN at red #1 (0.93×, always reached); build auto = never tap (AUTO DEAL to the top red #18 = 20.63×, or a bust).
  P0 CASH OUT · P2 DOUBLE OR NOTHING once, played out (no LOCK IN), then CASH OUT · P3 DOUBLE OR NOTHING while shown (to the 1,000× run cap /
  MAX WIN / a bust) · P4 random: CASH OUT 1/3, else a random shown button (DOUBLE OR NOTHING / DOUBLE HALF); LOCK IN 1/3 at each race card ·
  P5 DOUBLE HALF once, played out, then CASH OUT (half doubles; the other half and any odd cent go to the RUN BANK; a lost double brings the
  RUN BANK back as the bar). P1 was RUN IT AGAIN once: it is retired together with the ride, and the old P5 (RUN HALF once) is replaced.
  Small amount = a held amount of $0.02–$0.99.

HEADLINE (exact unless marked sim; full tables in par.txt, every number in results.json)
  Base (unchanged): every stop 93.0000% before rounding (0.93 × 1.2^(j−1) × (5/6)^(j−1)); with cents: $10 AUTO 92.9996%, best 93.0000%
        (red #1), worst 92.9677% (red #7), uniformly random stop 92.9912%; $1 worst 92.3611% (red #3); whole bet grid lowest 92.3077% ($1.30,
        red #1). AUTO SD 4.2806, hit rate 4.5073%; top pay red #18 = 20.633× (20.63× at $1), 1 in 22.186 builds.
        sim $10 (4,000,000): AUTO 93.2550% CI [92.8349, 93.6750]; uniform stop 93.1769% CI [92.9511, 93.4028].
  DOUBLE OR NOTHING: 100.0000% played out (three reds before three blacks, exactly 1/2). LOCK IN offer = floor(2 × stake × P(win from the score)).
        LOCK IN at the first card: lowest 99.50% at $1.00 and up ($1.00: offers $1.37 at 1–0, $0.62 at 0–1); SMALL amounts lowest 75.00% at
        $0.02 (offers $0.02 at 1–0, $0.01 at 0–1). Single offer furthest below fair: $1.00 and up 97.09% of fair ($1.03 at 0–2: $0.25 vs
        $0.2575); small amounts 0%: at $0.02 and $0.03 the LOCK IN shown at 0–2 offers $0.00 (fair $0.005 / $0.0075); no other amount up to
        $30.00 has a $0.00 offer. Lowest offer by amount (always at 0–2, P = 1/8): $0.04–$0.07 $0.01; $0.08–$0.11 $0.02; $0.12–$0.15 $0.03;
        $0.20 $0.05; $0.50 $0.12; $0.93 $0.23; $0.99 $0.24 (the whole $0.02–$0.99 table is in par.txt section 3 and out/exact.txt).
  DOUBLE HALF / P5: at a held H >= $0.04 the round pays H − floor(H/2) or H + floor(H/2) with probability 1/2 each: mean exactly H (a double is
        exact), so P5 = P0 at every bet and build; only the spread differs.
  Policies, exact ($10 / $100 identical): lock1 P0 93.0000% · P2 93.0000% (SD 0.930) · P3 93.0000% (SD 29.745, max 952.32×) · P5 93.0000% (SD 0.465);
        auto P0 = P2 = P3 = P5 92.9996% (SD 4.281 / 6.125 / 99.115 / 4.808); $1 auto 92.9861%. P4 sim ($10 auto) 93.2867% CI [92.2443,
        94.3291] (consistent with ≤ P0: the CI reaches down to it); see par.txt section 4 for every row.
  Policies ($1, lock1; held $0.93, a small amount): P0 93.0000% · P2 93.0000% (SD 0.930) · P3 93.0000% (SD 29.745) · P5 93.0000% (pays $1.39 or
        $0.47, SD 0.460) · sim (200,000 each): P2 92.8745% CI [92.4669, 93.2820], P3 84.2803% CI [71.8696, 96.6910], P5 93.0557% CI [92.8541,
        93.2573], P4 92.3431% CI [92.0609, 92.6254] (≤ P0 = 93%).
  95% CI checks: 105; 104 inside; 1 outside at |z| = 1.96 (base $100 LOCK IN at red #2: sim 92.9422% vs 93.0000% — the same seeds and the same
  cards as every earlier run, so the same miss). Investigated with the independent follow-up seeds, reported apart and not pooled into the
  tables: 2,000,000 rounds (seeds 1501..1504) give 93.0115% (z +0.39, exact inside); main + follow-up 92.9769% (z −1.11, exact inside): a chance
  miss (P = 0.0497; 1 in 105 at the 5% level). Every $1 small-amount check and every P2, P3, P5 policy check is inside.

SAME-SEED COMPARISON WITH THE v169 RUN (out/compare_prev.txt; par.txt section 6)
  Runs: 58 IDENTICAL, 10 CHANGED, 10 NEW, 20 RETIRED, 0 MISSING.
  IDENTICAL (round for round: every count, RTP, CI, SD, hit, max and RNG-draw count): all 16 base runs, all 12 follow-up runs, and every P0, P2 and P3
  run (10 each, at $10 lock1/auto, $100 lock1/auto and the $1 small-amount runs).
  CHANGED: the 10 P4 runs ($10 lock1 30041 92.8874% -> 92.9581%, 30042 92.9860% -> 93.1484%; $10 auto 30141 93.3768% -> 94.2477%, 30142 91.4865% ->
  92.3257%; $100 lock1 31041 92.7936% -> 93.0446%, 31042 93.0637% -> 93.0773%; $100 auto 31141 91.1985% -> 91.0137%, 31142 94.4495% -> 94.0806%;
  $1 lock1 32041 92.3784% -> 92.3832%, 32042 92.6251% -> 92.3031%): the random player now chooses between two buttons instead of four.
  NEW: the 10 P5 runs (DOUBLE HALF once) on the new seeds listed above. RETIRED: the 10 P1 runs (RUN IT AGAIN once) and the 10 old P5 runs (RUN
  HALF once). Exact policy values: P0, P2, P3 and the P4 bounds are unchanged; P1 is retired; P5 changed
  definition (v169 RUN HALF once: $1 lock1 92.00%, $10 lock1 92.90%, $100 lock1 92.94%, auto 92.93–92.94%, SD up to 10.94; now DOUBLE HALF once: 93.0000%
  lock1 / 92.9861–92.9996% auto, the same as P0, SD 0.46 (lock1) and 4.81 (auto)).
