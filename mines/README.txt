CARD RUN MINES 20× — LAB PACK (v170 launch build: RUN IT AGAIN and RUN HALF removed; run 16 Oct 2026)
====================================================================
Build under test: ../builds-final/card-run-mines-classic-launch.html
  sha256 2f73b626f7889810d499dbb863632ff42645ff6c6300f3b8f3b47a0b24974426   (16 Oct, 152,362 bytes; v169 was 97dbb75e…dba5, 157,760 bytes)
Everything runs from inside labpack/mines/ with paths relative to it and reads nothing outside labpack/.
Needs: python3 (standard library only), node (no packages).

WHAT CHANGED IN THIS BUILD (16 Oct, vs 97dbb75ee75a8ff41a8f7248cdeb2e67cee5e70e0abe42828b6fa9c8a3b0dba5)
  Certification decision: the RUN IT AGAIN ("ride") and RUN HALF mechanics are removed. The run bar after any win is now
  CASH OUT / DOUBLE OR NOTHING / DOUBLE HALF, with the RUN BANK, the banked-bust rule, the 1,000× run cap, MAX WIN (20,000×) and the
  $0.02 minimum run as before. The base game (ladder, top pick paid in full, integer-cent floor pays, RNG, bets) is untouched.
  REMOVED from the game script: Classic.rideK / rideKMil / setRide / DI (the ride ladder; DI was only a copy of Classic.base, now every
  reader uses Classic.base), the ride parameter and the ×1074/1000 factor of payC (pay = floor(bet cents × M_B(k)) as a BigInt, bit for
  bit the old base pay: floor(a×1000/(b×1000)) = floor(a/b)), st.ride, st.buy (it only existed to carry the ride stake; the board's money
  unit is st.R.bet), R.stage 'ride', R.rides, startRide, barRide, rideK(), the ride flags of barOffer, the RUN IT / RUN HALF handlers of
  the run bar, the 'run_choice' kinds run_it / run_half, the 'run_result' kind 'ride', the 'RUNNING' header label (mwLab), the .riding
  phone class and its CSS, the TOP OF THE BOARD result, the rules-sheet RUN IT AGAIN paragraph, the RUN HALF clause, the top-pick-of-the-ride
  sentence, the RUN IT AGAIN row of the return table and the v169 small-run rounding sentence. About 60 lines of game code / CSS / text
  (file 1,524 -> 1,464 lines; the run-bar module is 25,037 -> 23,541 characters).
  CHANGED: the embedded run-bar module is run-bar.js v170 byte for byte (v170 bar: CASH OUT pill, RUN BANK chip above it when banked,
  full-width gold DOUBLE OR NOTHING, DOUBLE HALF link under it); the game's two CSS overrides for .crk-run are now .crk-dbl only; the
  rules sheet explains the bar as CASH OUT, DOUBLE OR NOTHING, DOUBLE HALF (doubles half, the other half plus an odd cent goes to the RUN
  BANK), the RUN BANK, the minimum run $0.02, the 1,000× run cap, MAX WIN; its section heading is now "The run bar" (was "Run it").
  KEPT: the double game (19 gems / 2 live / 4 duds, 6 gems first: C(19,6)/C(21,6) = 1/2 exactly -> 100.0000%), the rest of the rules sheet.
  The word "RUN IT" is left only in the logo's alt text and three comments about the lobby slogan "BUILD IT. RUN IT." and in the run-bar
  module's own header comment ("RUN IT AGAIN and RUN HALF removed"); exact.py asserts there is no ride / run-half code (see below).
  Not changed (found, left for the owner): the NEXT strip shows "×NaN" for the cells past the top pick when 2, 3 or 4 live bombs are
  chosen and the player is within 3 picks of the top pick (render() reads Classic.base[k] for k > top; v169 and v168 do the same).
  Cosmetic, no effect on any pay; the one-line fix is `if (k > G.top) break;` in the NEXT loop.

WHAT CHANGED IN THE PACK
  Retired: every ride solver and table (ride RTP by stake / stop, stop rule on ride stakes, the small-stake ride minima, ride k asserts),
  policy P1 (RUN IT AGAIN once), old P5 (RUN HALF once), the ride board in sim.js, the P1 chunks (8) and old P5 chunks (8).
  P1 is retired and its number is not reused. P5 is NEW: DOUBLE HALF once, then CASH OUT.
  Still parsed and asserted from the build text by exact.py (every constant and every rule fragment: ladder as fractions, 93/100, 20×
  target and the top-pick rule, display, payC, cashValue, unlocked, the stop rule, capped, the cleared board, the run cap, the double pay,
  maxWinFor, MAX WIN clip, double / double-half / halfPill / cashOutOnly / half / keep / nMax rules of RunBar, RunBar version 170,
  minimum run 2 cents in the module and 0.02 in the game, the double board 19 / 2 / 4 / 6) PLUS: no 'rideK', 'rideKMil', 'kMil', 'kNum',
  'kDen', 'K_RIDE', 'setRide', 'startRide', 'barRide', 'st.ride', 'st.buy', 'runHalf', 'runIt', 'riding', 'RIDE', 'DI:', '.DI[', 'mwLab' anywhere
  in the build (embedded logo images excluded), no word "ride", and exactly 5 occurrences of "RUN IT" (module header, 3 slogan comments, the
  logo alt text).

FILES
  exact.py       Exact math (fractions; pays are the build's integer cents). Output: out/exact.json (ladders, every stop at $1/$10/$100, top
                 picks, strategies with SD / hit / pay distribution, the whole-grid scan, the stop rule on every cent stake $0.02-$10,000.00,
                 DOUBLE OR NOTHING, run-bar policies P0 P2 P3 P5 at $1, $10, $100 by full enumeration, P4's derived mean, 3,078 run-bar test
                 vectors incl. nMax) and out/exact.txt.
  xcheck.js      Cross-checks exact.py against the build's OWN code: Classic.setMines (display and top pick for 1-4 bombs), every Classic.payC pay
                 at $1/$10/$100, the stop rule with Classic.payC on all 991 grid bets and on every cent stake $0.02-$1,000.00 (399,996 bet /
                 bomb pairs, 0 failures), no ride API left (Classic.setRide / rideK / DI undefined, payC(cents, k), RunBar.version 170), and
                 RunBar.compute (v170) on the 3,078 solver states: mode, held, banked, half, keep, double, doubleHalf, halfPill, cashOutOnly,
                 nMax, and no runIt / runHalf key. Output: out/xcheck.log (7 checks, all ok).
  sim.js         Simulation of the shipped code: harness.js loads the build's inline scripts into node with a minimal fake DOM and plays only
                 through the game's own handlers (lobby bet field, PLAY, bomb selector, tiles, LOCK IN, run bar, PLAY AGAIN); every outcome comes
                 from the build's crypto RNG, replaced by a seeded xoshiro128** stream (seedcrypto.js). The one in-memory change: a line before the
                 game script's closing "})();" exposing its state to the driver. harness.js and seedcrypto.js work unchanged on v170.
  run_sims.sh    Every simulation chunk (74), skipping chunks already done.
  summarize.py   Merges out/sim/*.json, compares every simulated RTP with its exact value (95% CI), chi-square on the pay distributions of
                 P0 / P2 / P5, writes results.json, par.txt, out/summary.json.
  results.json   All headline numbers.   par.txt   The PAR tables, plain text.   out/   raw outputs and logs.

COMMANDS (in this order)
  cd labpack/mines
  python3 -I exact.py                    > out/exact.txt
  node -r ./seedcrypto.js xcheck.js      > out/xcheck.log
  ./run_sims.sh 1                        (out/sim/<mode>_<bet>_<seed>.json; progress in out/sim/run.log; 74 chunks; the 16 Oct run used
                                          1 job on a 2-core box shared with other jobs: 00:46-02:16, about 1 h 30 min)
  python3 -I summarize.py                > out/summary.txt
  One chunk by hand:  SEED_CRYPTO=<seed> node -r ./seedcrypto.js sim.js <mode> <bet> <rounds> <out.json>

SEEDS (crypto stream = xoshiro128** seeded by splitmix32(SEED_CRYPTO)) — every chunk that still exists keeps its v169 seed
  base  $10:   20 × 100,000 rounds, seeds 1001-1020. Round r plays 1+((r>>2)%4) live bombs and LOCKs IN after 1+(r%6) safe picks
               (when LOCK IN is shown), then CASH OUT. Exact value: the same mix (exact.py sim_mix_exact).
  top   $10:   10 × 100,000 rounds, seeds 4001-4010; top $1.10: 10 × 100,000, seeds 4101-4110. Round r plays 1+(r%4) live bombs and never
               LOCKs IN: the board runs to its top pick or a live bomb.
  P0 P2 P3 P4 $10:  4 × 50,000 rounds per policy, seeds 2<p>01-2<p>04 (p = 0, 2, 3, 4).   $100: 2 × 50,000, seeds 3<p>01-3<p>02.
  P5 (new) $10: 4 × 50,000, seeds 2511-2514;  $100: 2 × 50,000, seeds 3511-3512;  $1: 2 × 100,000, seeds 5511-5512.
               The old RUN HALF P5 used 2501-2504 / 3501-3502 / 5501-5502; the new seeds are different so no chunk is mistaken for an old one.
  P4 $1:       2 × 100,000 rounds, seeds 5401-5402 (the small-amount check: at $1 the LOCK IN pays $1.60, so halves and RUN BANK returns go
               down to $0.02). P0 / P2 / P3 at $1 are exact only.
  Policies all play 4 live bombs and LOCK IN after 3 safe picks. P0 cash out; P2 DOUBLE OR NOTHING once; P3 DOUBLE whenever it is shown
  (to the 1,000× run cap / MAX WIN); P4 a uniformly random shown button (CASH OUT / DOUBLE OR NOTHING / DOUBLE HALF, whichever are shown) at
  every bar until the round ends (choice PRNG seed = crypto seed + 7); P5 DOUBLE HALF once, then CASH OUT. P1 (RUN IT AGAIN once) was
  removed with RUN IT AGAIN.

HEADLINES  (details: results.json, par.txt)
  Base game, exact, unchanged: every stop, every bomb count, the top pick included, returns 93.0000% before rounding to the cent.
    After rounding: lowest stop 92.40% at $1, 92.92% at $10, 92.993% at $100; lowest anywhere on the $0.10 grid 92.3636%
    ($1.10, 1 live bomb, pick 5). Best 93.0000% (13 stops at $10). Typical (4 live, LOCK IN after 3): 92.5217% $1 / 92.9843% $10 /
    92.9959% $100, SD 0.794, hit 57.83%. Random player (bombs 1-4, stop uniform up to the top pick): 92.98% at $10.
  Top pick (paid in full; 93.0% exact, 92.97%-93.00% after rounding at $1-$100):
    1 live: pick 24, 23.2500×, 1 in 25.00 · 2 live: pick 20, 27.9000×, 1 in 30.00 · 3 live: pick 16, 25.4643×, 1 in 27.38 ·
    4 live: pick 13, 23.7667×, 1 in 25.56. Top pay for a round: 20,000× the bet (MAX WIN) through the run bar.
  Stop rule, every bet: with the build's Classic.payC the board stops at the top pick and not before on all 991 grid bets × 1-4 bombs and on
    every cent stake $0.02-$10,000.00 (exact.py, 0 failures) / $0.02-$1,000.00 (xcheck.js through the build's own code, 0 failures).
  DOUBLE OR NOTHING: C(19,6)/C(21,6) = 1/2 exactly -> 100.0000%. DOUBLE HALF doubles half of the held amount (the odd cent is banked), the
    other half sits in the RUN BANK and comes back if the half loses: also exactly fair.
  Policies (4 live, LOCK IN after 3), exact:
        P0 = P2 = P3 = P4 = P5 in RTP:  $1 92.5217%   $10 92.9843%   $100 92.9959%   (every bar action is a fair, unclipped bet)
        SD   P0 0.7901 / 0.7941 / 0.7942    P2 1.4507 / 1.4580 / 1.4582    P3 38.92 / 39.12 / 39.12    P5 0.9972 / 1.0022 / 1.0023 ($1/$10/$100)
        hit  P0 = P5 57.826% (a lost half returns the RUN BANK), P2 28.913%, P3 0.056%
        top pay  P0 $1.60 / $16.08 / $160.82   P2 $3.20 / $32.16 / $321.64   P3 $1,638.40 / $16,465.92 / $164,679.68   P5 $2.40 / $24.12 / $241.23
    P5 closed form (derived, asserted equal to the full enumeration): a base pay c cents held at the first bar becomes c + floor(c/2) with
    probability 1/2 (the half doubled + the banked half) and ceil(c/2) with probability 1/2 (the half lost, the RUN BANK returned), whenever
    floor(c/2) >= 2 cents; mean c, so RTP = P0 exactly. At $1 the base pays $1.60, so P5 pays $0 (97/230), $0.80 (133/460), $2.40 (133/460).
    P4: no closed form for the distribution (the state graph cycles through the RUN BANK) -> simulation. Its MEAN is derived exactly
    (optional stopping: held + RUN BANK is a bounded martingale that ends with probability 1, nothing is ever clipped because DOUBLE is only
    shown when RUN BANK + 2 × held <= MAX WIN) and equals P0's. The 15 Oct pack had no exact value for P4; the simulation is now checked
    against the derived value like the others.
  v169 -> v170 (exact): P0 / P2 / P3 identical at every bet to the last digit. P5 changes meaning (RUN HALF once -> DOUBLE HALF once):
    $1 92.4061% -> 92.5217%, $10 92.9049% -> 92.9843%, $100 92.9408% -> 92.9959%. P1 (RUN IT AGAIN once: 92.2904% / 92.8589% / 92.8856%) is gone.

SIMULATIONS OF THE SHIPPED CODE (every exact value inside its simulation's 95% CI: 15 of 15)
  base mix $10   2,000,000 rounds  93.0338% [92.9361, 93.1315]  exact 92.9583%  (z +1.51); SD 0.7048, hit 69.42%
  top $10        1,000,000 rounds  93.8011% [92.8680, 94.7341]  exact 92.9991%  (z +1.68)
  top $1.10      1,000,000 rounds  92.8438% [91.9155, 93.7721]  exact 92.9919%  (z -0.31)
  P0 $10 / $100  93.1458% [92.7979, 93.4937] (z +0.91) / 92.8398% [92.3474, 93.3322] (z -0.62)
  P2 $10 / $100  93.2351% [92.5955, 93.8746] (z +0.77) / 93.7291% [92.8232, 94.6350] (z +1.59)
  P3 $10 / $100  93.0324% [75.8838, 110.1811] (z +0.01) / 97.1610% [72.3756, 121.9464] (z +0.33)   (hit 0.056%: only ~110 / ~59 winning rounds)
  P4 $1 / $10 / $100   92.5173% [91.5538, 93.4808] (z -0.01) / 93.6734% [92.4736, 94.8732] (z +1.13) / 92.1074% [90.8816, 93.3332] (z -1.42)
                 against the derived mean 92.5217% / 92.9843% / 92.9959%. P4 $1: 12,396 rounds end on a pay of $0.03-$0.99, 35 under $0.10,
                 the smallest $0.03; max $205.60; every round ends by CASH OUT or a bust, none at the run cap or MAX WIN. P4 $10 max $4,534.56,
                 P4 $100 max $12,865.60.
  P5 $1 / $10 / $100   92.2244% [91.7874, 92.6614] (z -1.33) / 92.8089% [92.3698, 93.2481] (z -0.78) / 92.9869% [92.3654, 93.6085] (z -0.03)
  Pay distributions (chi-square, p): P5 $1 pays $0 / $0.80 / $2.40 only, 84,729 / 57,626 / 57,645 vs exact 84,347.8 / 57,826.1 / 57,826.1,
    chi2 2.982 on 2 df (p 0.225); P5 $10 0.908 (p 0.635); P5 $100 0.317 (p 0.853); P0 $10 0.827 and $100 0.387 (1 df); P2 $10 0.591 and
    $100 2.528 (1 df). No pay outside the exact support was ever seen. DOUBLE HALF was shown at every one of the 115,271 P5 $1 bars.
  There was no miss, so no follow-up seeds were needed (the 15 Oct P4 $100 value, 91.10 ± 1.88, would have missed 92.9959%: its random
  choices included the ride buttons; with the v170 bar P4 $100 is 92.11 ± 1.23).

COMPARISON WITH THE v169 RUN (same seeds; v169 outputs in /home/claude/fix/minrun/v169_mines_out/; out/compare_v169.txt)
  66 chunks exist in both runs. 58 are identical round for round (sum, sum of squares, hits, max, ends, bar actions, pay histogram, crypto
  draws): all 20 base (seeds 1001-1020), all 20 top, and P0 / P2 / P3 at $10 and $100 (18). The base game is bit-identical.
  8 differ, all P4 (the random policy: $1 5401-5402, $10 2401-2404, $100 3401-3402): the random pick now chooses among CASH OUT / DOUBLE
  OR NOTHING / DOUBLE HALF only, so every bar after the first differs and the streams do not fall back into step (v170 draws about 24% fewer
  crypto numbers: no ride boards). P4 RTP v169 -> v170: $1 88.89% / 94.79% -> 92.40% / 92.64%; $10 91.96 / 91.30 / 92.92 / 95.54 ->
  95.29 / 94.37 / 91.28 / 93.75; $100 89.70 / 92.50 -> 91.86 / 92.36 (per seed; the pooled values are in the table above).
  New chunks without a v169 counterpart: P5 (DOUBLE HALF once) at $1, $10 and $100 on the new seeds (8 chunks).
  Retired v169 chunks: P1 (8) and the old P5 RUN HALF chunks (8).

OUT/
  exact.json / exact.txt (solver), xcheck.log, sim/<mode>_<bet>_<seed>.json (one per chunk: sums, histogram, ends, bar choices),
  sim/run.log (one line per chunk), summary.json / summary.txt (every run next to its exact value),
  compare_v169.py / compare_v169.txt (the one-off same-seed comparison with the v169 outputs; reads outside labpack/, not part of the pipeline).
