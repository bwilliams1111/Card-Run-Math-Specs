# Card Run Kicks 20× — Math Pack for Certification

Oct 16, 2026 · @Bob

Card Run Kicks 20× returns **92.9666% at best play** (92.5067% calling the side with more cards, 90.5795% at random, 84.8069% at worst), its DOUBLE OR NOTHING is exactly fair (100.0000%), and no run-bar policy can change the return. This is the math pack for the certification lab; every figure is exact (fractions) or checked against a simulation of the shipped game.

## Summary

Build `card-run-kicks-classic-launch.html`, sha256 `f4592849c5f06a8f3b9c63d495caa02fb7fdebe13a645bce0c609cc819654e26`, 147,720 bytes, run bar v170. RUN IT AGAIN and RUN HALF are not in this build. The base game, pays, bet grid and RNG are unchanged since the earlier runs, and the whole pack was re-run on this exact build on 16 Oct 2026.

| Item | Value |
| --- | --- |
| Base game RTP, best play | **92.9666%** (200943920392331/216146392994805), SD 1.9606× the bet, hit rate 38.7665% |
| Other ways to call the kicks | 92.5067% (the side with more cards left), 90.5795% (random), 84.8069% (worst play) |
| Rounding | None at any bet: every base pay is whole cents on the $0.10 grid, and the doubles are exact |
| Top pay, paid in full | 20× (six right calls), 1 in 159.9 games |
| DOUBLE OR NOTHING | Win chance 1/2 exactly, **100.0000%** |
| Whole round, any run-bar policy | Same as the base game (every bar action is a fair bet) |
| MAX WIN | 20,000× the bet (an operator may lower it, never raise it) |
| Run cap | 1,000× the first win; the double that crosses it pays in full |
| Bets | $1.00 to $100.00 in $0.10 steps; minimum run $0.02 |
| Simulation, shipped code | 27 of 27 checks inside their 95% interval, none needed a follow-up run |

**Two things the lab should know.**

1. **Kicks has a skill element, and the certified figure is best play.** The player calls GOAL or WIDE before each kick. The four ways of calling span 84.8069% to 92.9666%, and the rules sheet shows all four. Even worst play stays above 80%. The run bar adds no skill: every bar choice changes the volatility, not the return.
2. **Nothing exceeds 100% and nothing is ever clipped.** The only sub-game at 100% is the double, and it is exactly 1/2. A held amount plus its RUN BANK is a fair bet at every step, so every way of playing the bar returns what cashing out returns.

## Rules as built

Each game deals six kicks from a freshly shuffled 112-card shoe; before every kick the player calls GOAL or WIDE, a post is always a miss, and the first post starts the Posts Bonus. After any win the run bar opens.

- **Shoe.** Two decks of 56 cards (ranks 2–10, J, Q, K, A and 14, in 4 suits), shuffled for every game and dealt without replacement. GOAL (6, 7, 8, 9, 10, J) is 48 cards, WIDE (2, 3, 4, K, A, 14) is 48 cards, POST (5, Q) is 16 cards. The buttons show how many cards of each kind are left.
- **Main game.** Six kicks. A call is right when the card is in the called group; a post counts as a miss. The game stops a board early once no pay is reachable (the payout cannot change).
- **Main pays.** By number of right calls: 0 right pays 1× (the bet back), 1, 2 or 3 right pay 0, 4 right pays 1.5×, 5 right pay 4×, 6 right pay 20×.
- **Posts Bonus.** The first post of a game starts it, once per game, from the same shoe. A post kicks again, each right call in a row adds to the streak, the first miss ends it, and 3 in a row is the top. It pays by streak: 0 or 1 right 0, 2 right 1×, 3 right 3×. It is paid on top of the main pay, then the six kicks carry on.
- **Top pay.** Six right calls pay 20×. A six-right game has no post, so it has no Posts Bonus. The "20×" in the name is a target, not a cap: the run bar can take a win past it (see Run phase).
- **After any win** (including a return of the bet or less) the run bar opens: CASH OUT, DOUBLE OR NOTHING or DOUBLE HALF, with a RUN BANK (see Run phase).

**The DOUBLE OR NOTHING hand (the Run Game).** The player plays a short hand from one 56-card deck: up to three shots, each a fresh draw (with replacement), posts kicked again. The first to 2 right wins and the stake pays exactly 2×; 2 wrong loses it. Of the 56 cards 24 are GOAL, 24 are WIDE and 8 are posts, so with posts kicked again every call is exactly 1/2.

## Pays and shoe math

**At best play a round pays one of 11 amounts, and the expected pay is 92.9666% of the bet.** The table is exact (fractions, every shoe state); the last two columns are the 2,000,000-round simulation of the shipped game at $10. A round total is the main pay plus any Posts Bonus, before the run bar.

| Pay (× bet) | Probability | 1 in | Share of RTP | Simulated | z |
| --- | --- | --- | --- | --- | --- |
| 0× | 0.6123350215 | 1.6 | 0.0000% | 0.61221600 | -0.35 |
| 1× | 0.0906704247 | 11.0 | 9.0670% | 0.09079850 | +0.63 |
| 1.5× | 0.1501255445 | 6.7 | 22.5188% | 0.15025900 | +0.53 |
| 2× | 0.0036667989 | 272.7 | 0.7334% | 0.00372250 | +1.30 |
| 2.5× | 0.0096134515 | 104.0 | 2.4034% | 0.00958250 | -0.45 |
| 3× | 0.0634376137 | 15.8 | 19.0313% | 0.06315450 | -1.64 |
| 4× | 0.0509198453 | 19.6 | 20.3679% | 0.05107400 | +0.99 |
| 4.5× | 0.0096505056 | 103.6 | 4.3427% | 0.00968800 | +0.54 |
| 5× | 0.0016612577 | 602.0 | 0.8306% | 0.00162200 | -1.36 |
| 7× | 0.0016674334 | 599.7 | 1.1672% | 0.00172550 | +2.01 |
| 20× | 0.0062521032 | 159.9 | 12.5042% | 0.00615750 | -1.70 |

One of the 11 z-scores (7×, +2.01) is just past 2, which 11 independent tiers show by chance about 4 times in 10; the other ten are all inside ±1.7.

**Where the return comes from.** The main game pays 61.6819% of the bet and the Posts Bonus 31.2846%. The Posts Bonus starts in 61.2504% of games, pays (2 or more right in a row) in 15.5988%, and reaches the top 3× in 1 game in 12.8.

**Right calls in the main game at best play** (all six kicks played): 0 right 3.5393%, 1 right 15.3890%, 2 right 29.1333%, 3 right 29.3167%, 4 right 16.9390%, 5 right 5.0575%, 6 right 0.6252%.

In the simulation the game stops a board early once no pay is reachable, so a bust board's count is where it stopped. The counts of 1–3 right are therefore compared together (73.7986%, z −1.30); 0, 4, 5 and 6 right are always final (3.5564% z +1.31; 16.9530% z +0.53; 5.0762% z +1.21; 0.6158% z −1.70). The Posts Bonus rates agree too: starts 61.2062% (z −1.28), pays 15.5770% (z −0.85), top 7.8228% (z −1.06).

## Player choices and strategies

**The player decides one thing in the base game: which side to call before each kick.** Calling well is worth 8.2 points of RTP between worst and best play; the run bar adds no skill (next sections). The rules sheet lists all four ways of calling.

| Way of calling | RTP | SD (× bet) | Hit rate | 20× odds |
| --- | --- | --- | --- | --- |
| Best play (exact DP over every shoe state) | **92.9666%** | 1.9606 | 38.7665% | 1 in 159.9 |
| The side with more cards left (tie GOAL) | 92.5067% | 1.9611 | 38.3656% | 1 in 159.9 |
| Random calls (50/50) | 90.5795% | 1.9363 | 37.8924% | 1 in 165.2 |
| Worst play | 84.8069% | 1.8247 | 36.6319% | 1 in 195.0 |

Exact fractions:

```
best    200943920392331 / 216146392994805
counter 6598347887567848 / 7132830968828565
random  17336258081 / 19139262912
worst   128328992263287440986067471 / 151319132000977106167351350
```

**Best play.** `exact_kicks.py` solves the game exactly: a dynamic programme over the cards left in the shoe, the kicks played, the right calls so far and the Posts Bonus state, choosing the better call at every state. The value of the optimum is the figure above. About 3.46 calls per game are exact ties (mostly boards that can no longer pay); the exact distribution and the simulation both break a tie with the same double-precision comparison, so they play the identical strategy.

**The sentence on the rules sheet is true.** The sheet says: follow the shoe count, except after a miss with no right calls yet, when calling the side with fewer cards left gives the best chance of the 0-right pay (the bet back). `sheet_strategy.js` plays that description literally (the exception applies to main-game kicks; Posts Bonus kicks follow the count) and takes the exact expectation: it returns 92.9666%, equal to the best-play RTP to 1e-12. Without the exception it returns 92.5067%, equal to the shoe-count caller. The exception matters only in that scope: applied to bonus kicks too it would lose 0.52 points (92.4431%), and applied only to the first kick after a miss it would lose 0.26 (92.7051%).

**Worst play** is the same dynamic programme with the minimum. At 84.8069% it is above 80%, so there is no way to play the base game below that.

## Run phase: DOUBLE OR NOTHING and the run bar

**DOUBLE OR NOTHING wins with probability exactly 1/2, so it returns exactly 100.0000% of the amount run.** Every call in the hand is a fair 1/2 (24 GOAL, 24 WIDE, posts kicked again), and the hand is first to 2 right in at most 3 shots: it is decided in 2.5 shots on average (2 shots in half the hands, 3 in the other half) and takes 2.917 kicks per hand once the posts are kicked again. There are no ties, and a win pays exactly 2× in whole cents.

### The bar

After any win, including a return of the bet or less, the bar offers **CASH OUT**, **DOUBLE OR NOTHING** and **DOUBLE HALF**, with a **RUN BANK** escrow. The bar is the shared module `run-bar.js` v170, embedded byte for byte in the build.

- CASH OUT pays the RUN BANK plus the held amount.
- DOUBLE OR NOTHING plays the Run Game with all of the held amount.
- DOUBLE HALF stakes half the held amount (rounded down to the cent) and puts the rest, with any odd cent, in the RUN BANK.
- A won double makes the held amount 2× the stake; the RUN BANK stays. A lost double returns the RUN BANK as the held amount (the banked-bust rule); with an empty RUN BANK the round ends at 0.
- After every result, in cents: clip the held amount to MAX WIN minus the RUN BANK; end at MAX WIN; end at the **1,000× run cap** (1,000× the first win; the double that crosses it pays in full); otherwise show the bar.
- DOUBLE needs a held amount of at least $0.02 and RUN BANK + 2 × held within MAX WIN. DOUBLE HALF needs half of at least $0.02 (a hold of $0.04 or more) and RUN BANK + the kept half + 2 × half within MAX WIN. A bar with neither shows CASH OUT alone: a hold of 3 cents shows CASH OUT and DOUBLE; a hold of 1 cent shows CASH OUT only.
- Doubles are exact whole-cent doublings: no rounding at small amounts. RUN IT AGAIN and RUN HALF are not in this build.

**Checked against the build's own text and code.** `exact_kicks.py` parses the run-bar constants and code shapes (MIN_RUN 2 cents, the cap, version 170, the half split, the DOUBLE and DOUBLE HALF show rules, the banked-bust rule) from the build and stops if one differs; it also asserts that no ride, RUN IT or RUN HALF code is left in the page. The shared module has its own tests (`run-bar.test.js`, all pass), and the shipped bar is played by the simulations below, with MAX WIN and the run cap exercised in the harness (a hold at MAX WIN or at the cap pays at once and shows no bar; a hold just under shows it).

**Why the bar is fair.** Every action is a fair bet on the money at stake, and DOUBLE or DOUBLE HALF is shown only when the doubled amount cannot pass MAX WIN, so nothing is ever clipped. The next section turns that into the exact round-level result.

## Round-level RTP: every bar policy returns the base RTP

**However a player uses the bar, a round returns exactly what cashing out returns: 92.9666% at every bet.** Each double is exactly fair, so the money at stake plus the RUN BANK is a martingale and no policy can raise or lower its mean. The policies below differ only in how widely the result is spread.

### The argument

Held amount plus RUN BANK changes only through DOUBLE and DOUBLE HALF. Each is a bet that wins with probability exactly 1/2 and pays exactly 2×, with no tie, no rounding (whole-cent doubling) and no clipping (a double is shown only when it cannot pass MAX WIN; the 1,000× cap pays in full). The total therefore has an expected change of zero at every step. It is bounded by MAX WIN and the round ends with probability 1 (a cash out is picked, or the cap or MAX WIN pays), so by optional stopping the expected final pay of any policy equals the expected pay of cashing out at once. That includes the best possible policy: there is no worst case to find above the base RTP.

### Named policies (best-play base game, exact)

Every policy plays the board at best play and the Run Game at 50/50 calls, then acts at the bar as described.

| Policy | Rule at the bar | RTP at $1 / $10 / $100 | SD (× bet) | Hit rate |
| --- | --- | --- | --- | --- |
| P0 | Cash out | 92.9666% at all three | 1.9606 | 38.7665% |
| P2 | DOUBLE OR NOTHING once, then cash out | same | 2.9245 | 19.3832% |
| P3 | DOUBLE while shown, to the cap or MAX WIN | same | 59.4984 | 0.0385% (1 in 2,600) |
| P4 | Random: cash out with probability 1/3, otherwise a uniform pick among the double buttons shown | same (bounded, see below) | 4.6817 to 4.6911 | 27.6899% to 27.6904% |
| P5 | DOUBLE HALF once, then cash out | same | 2.2408 | 38.7665% |

Hit rate is the share of rounds that return more than 0. A lost half still returns the RUN BANK, so P5 keeps P0's hit rate. P0, P2, P3 and P5 are exact fractions, and P2 = P3 = P5 = P0 is asserted in the solver.

**P5 closed form.** A base win of x, with half = ⌊x/2⌋ and keep = x − half, pays keep + 2 × half or keep with probability 1/2 each when DOUBLE HALF is on the bar, and x otherwise. The mean is x. `exact_kicks.py` asserts that this equals the bar recursion, fraction for fraction.

**P4 (RTP exact, hit rate and SD bounded).** P4's bar states can repeat (a lost DOUBLE HALF hands the bank back as the held amount) and run into the millions, and a chain of double bars has no fixed length. The solver propagates the probability of every live bar state (held, bank, ammo) forward bar by bar, expands every P4 action exactly (Run Game 1/2, the cap, MAX WIN) and drops a state only below probability 1e-15.

|  | $1 | $10 | $100 |
| --- | --- | --- | --- |
| Peak live states | 3,650,150 | 3,797,738 | 2,983,843 |
| Bars deep | 48 | 47 | 46 |
| Dropped mass (share of rounds) | 6.79e-9 | 7.44e-9 | 6.04e-9 |
| RTP bounds | 92.9661% to 92.9666% | 92.9662% to 92.9666% | 92.9663% to 92.9666% |
| Hit rate | 27.6899% | 27.6904% | 27.6904% |
| SD bounds | 4.6817 to 4.6911 | 4.6819 to 4.6884 | 4.6820 to 4.6865 |

Dropped states are valued at their held-plus-bank amount W, which is exact by the martingale argument; the propagation reproduces the base RTP to 8e-14, 3e-13 and 2e-12, and the solver stops if that is not under 1e-10. The RTP bounds above do not use the martingale argument (a dropped state is worth between 0 and W). The SD bound uses W² ≤ E[X²] ≤ MAX WIN × W for a dropped state worth W. The cut stays a cut and not zero because an exact fraction would need the whole infinite chain.

## Rounding, limits and RNG

**Nothing is rounded anywhere in Kicks.** Bets are whole multiples of $0.10 from $1.00, every base pay is a multiple of 0.5× the bet, so it is a whole number of cents at every bet, and the doubles are exact whole-cent doublings. The exact rounding loss is 0 at $1, $10 and $100.

- **Rounding.** Base pays are computed in integer cents (stake in cents × pay in hundredths ÷ 100, floored); on the bet grid the floor never removes a cent. DOUBLE OR NOTHING and DOUBLE HALF are exact; DOUBLE HALF stakes the floor of half the cents and banks the rest.
- **Bets.** $1.00 to $100.00 in $0.10 steps; typed amounts snap down to the grid and are clamped.
- **MAX WIN.** 20,000× the bet that started the round; an operator may set it lower, never higher. Every payout is clipped to it, and a double that could pass it is not offered.
- **Run cap.** 1,000× the first win. The double that crosses it pays in full, so a run can pay more than 1,000× the first win (but never more than MAX WIN).
- **Minimums.** $0.02 for DOUBLE OR NOTHING (game MINRUN = run-bar MIN_RUN, 2 cents); $0.04 for DOUBLE HALF (half of at least $0.02).
- **RNG.** Every outcome comes from `crypto.getRandomValues`: the shoe shuffle is a Fisher–Yates shuffle and the Run Game draw is a single draw, both through `rnd(n)`, which rejects values in the biased top range of the 32-bit word, so each result is exactly uniform with no modulo bias. There is no `Math.random` fallback; `Math.random` appears only in the card-landing animation, not in any result. Production replaces the RNG with the platform RNG (open item).

## Simulation evidence

**All 27 checks sit inside their 95% interval, so no follow-up seeds were needed.** The simulations run the shipped game script in Node, playing only through the game's own handlers (PLAY AGAIN, GOAL and WIDE, the run bar's buttons). Every outcome comes from the build's own crypto RNG, replaced by a seeded xoshiro128** stream. Money is read from the game's settle events and checked against a ledger every round (0 errors).

| Run | Rounds | Simulated RTP | 95% CI | z | Simulated hit rate | Exact hit rate | Largest pay |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Base game, $10, best play | 2,000,000 | 92.8282% | 92.5576% to 93.0988% | -1.00 | 38.778% | 38.766% | 20× |
| P0 cash out, $10 | 200,000 | 93.3310% | 92.4712% to 94.1908% | +0.83 | 38.859% | 38.766% | 20× |
| P0 cash out, $100 | 100,000 | 92.2880% | 91.0772% to 93.4988% | -1.10 | 38.526% | 38.766% | 20× |
| P2 double once, $10 | 200,000 | 93.3850% | 92.1049% to 94.6651% | +0.64 | 19.509% | 19.383% | 40× |
| P2 double once, $100 | 100,000 | 94.7750% | 92.9240% to 96.6260% | +1.91 | 19.512% | 19.383% | 40× |
| P3 double to the cap, $10 | 200,000 | 104.7040% | 78.1526% to 131.2554% | +0.87 | 0.044% | 0.038% | 10,240× |
| P3 double to the cap, $100 | 100,000 | 114.6880% | 68.6408% to 160.7352% | +0.92 | 0.041% | 0.038% | 10,240× |
| P4 random button, $10 | 200,000 | 93.5957% | 91.6391% to 95.5524% | +0.63 | 27.666% | 27.690% | 776× |
| P4 random button, $100 | 100,000 | 93.7222% | 91.4730% to 95.9714% | +0.66 | 27.786% | 27.690% | 266× |
| P5 DOUBLE HALF once, $10 | 200,000 | 92.6273% | 91.6538% to 93.6007% | -0.68 | 38.691% | 38.766% | 30× |
| P5 DOUBLE HALF once, $100 | 100,000 | 92.5725% | 91.1890% to 93.9560% | -0.56 | 38.759% | 38.766% | 30× |
| P4 random button, $1 | 200,000 | 93.2129% | 91.4612% to 94.9646% | +0.28 | 27.587% | 27.690% | 560× |

The exact RTP in every row is 92.9666%. z is the simulated RTP minus the exact value, in standard errors. P3 is too heavy-tailed to test its mean tightly (hit rate 0.038%: about 77 winning rounds at $10, 38 at $100); its exact value rests on the enumeration. P4 is also a little heavy-tailed (exact SD 4.68 against 4.46, 3.63 and 4.00 in the samples, whose largest payouts are 776×, 266× and 560×), so a sample that misses its rare big wins reads a few percent low.

**Seeds.** Base game seeds 1001–1040 (50,000 rounds each); policy Pp at $10 seeds 10000 + 100p + i (i = 1–4) and at $100 seeds 20000 + 100p + i (i = 1–2); the new P5 uses seeds 10601–10604 and 20601–20602; the $1 check for P4 uses 30401–30404. The bot's own choices (Run Game calls, P4 picks) use a second stream seeded with the seed XOR 0x5bd1e995.

**Small amounts.** The $1 runs go through the shipped code with P4: halves and RUN BANK returns at a $1 bet go down to a few cents, DOUBLE HALF needs a hold of $0.04 or more, and all 200,000 rounds settled with a clean ledger (0 errors). The simulated mean (93.2129%), hit rate (27.587%) and the exact bounds agree.

**Same seeds as the previous run.** 68 chunks exist in both runs; 58 are identical round for round (all 40 base chunks, and P0, P2 and P3 at $10 and $100), so the base game is bit-identical to the build before RUN IT AGAIN and RUN HALF were removed. The 10 that differ are all P4 (a random player's choices change with the buttons offered). New chunks: P5 at $10 and $100.

## Reproduce, files and open items

The pack folder `kicks/` reproduces every number here with Python 3 (standard library only) and Node (no packages). `exact_kicks.py` parses every constant and code shape it depends on from the build text and stops if one differs, and it asserts that no RUN IT AGAIN or RUN HALF code remains. Every output records the build's sha256.

```
cd kicks
python3 -I exact_kicks.py                        # exact math -> out/exact.json (about 12 min, under 1 GB for P4; run under ulimit -v 3500000)
node sheet_strategy.js > out/sheet_strategy.txt  # the rules-sheet description of best play, evaluated exactly
./run_sims.sh 1                                  # 70 simulation jobs of 50,000 rounds, seeds in README.txt (about 45 min)
./run_small_p4.sh 1                              # the $1 check for P4 -> out/small/
python3 -I merge.py                              # CI checks, results.json, par.txt
```

| File | What it does |
| --- | --- |
| `exact_kicks.py` | Exact math in fractions: strategies, pay distribution, Posts Bonus, DOUBLE OR NOTHING, rounding, policies P0, P2, P3, P5 (P5 also by closed form), P4 by bounded propagation |
| `sheet_strategy.js` | Evaluates the rules sheet's description of best play exactly and compares it with the best-play RTP |
| `buildconst.js`, `policy.js` | Read the build's constants; the bots' calls (exact DP) |
| `harness.js`, `sim.js` | Play the shipped code through its own handlers with a seeded RNG |
| `run_sims.sh`, `run_small_p4.sh`, `merge.py` | Run every job; pool, check each exact value against its 95% interval, write `results.json` and `par.txt` |
| `compare_prev.py` | Same-seed comparison with the previous run |
| `par.txt`, `results.json`, `README.txt` | PAR tables, every headline number as data, every command and seed |

**Open items for the lab and for the team.**

1. **Nothing in the maths needs a decision.** Kicks has no rule change in this submission; the return is 92.9666% at best play and the same for every bar policy.
2. **The rules sheet shows best play as "93.0%".** The exact figure is 92.9666%, which rounds to 93.0% at one decimal; the sheet rounds up by 0.03 points. Say if you want 92.97%. The other rows (92.5%, 90.6%, 84.8%, 100.0%) are correctly rounded.
3. **A stale comment in the source.** The comment under the pay table says "main pays 25.7%"; the pack's right-call table gives a main-game pay (0 right, or 4 or more) in 26.16% of games. The bonus figures in the same comment (starts 61.3%, pays 15.6%) match. It is a comment only and nothing in the game reads it.
4. **RNG.** Production replaces `rnd` with the platform RNG and decides outcomes server-side; that is certified separately.
5. **The §12 tests (1–17)** from the original hand-off notes need definitions, or to be declared out of scope.
