# Card Run Crash 20× — Math Pack for Certification

Oct 16, 2026 · @Bob

Card Run Crash 20× returns **93.0000% before rounding at every stop**, its DOUBLE OR NOTHING is exactly fair (100.0000%) when played out, and no way of playing the run bar can return more than the base game. This is the math pack for the certification lab; every figure is exact (fractions) or checked against a simulation of the shipped game.

## Summary

Build `card-run-crash-classic-launch.html`, sha256 `123d6bced443c4c42038569cbc107af207b3dc49ed6bef05fcb621bf6adaa075`, 137,528 bytes, run bar v170. RUN IT AGAIN and RUN HALF are not in this build. The base game, pays, bet grid and RNG are unchanged since the earlier runs, and the whole pack was re-run on this exact build on 16 Oct 2026.

| Item | Value |
| --- | --- |
| Base game RTP, every stop | **93.0000%** before rounding to the cent (0.93 × 1.2^(j−1) × (5/6)^(j−1)) |
| After rounding to the cent | $10 and $100: lowest stop 92.9677% / 92.9977%; AUTO (never lock in) 92.9996%; $1: lowest stop 92.3611% |
| Lowest anywhere on the $0.10 bet grid | **92.3077%** ($1.30, lock in at red #1) |
| Top pay, paid in full | Red #18 = 20.6331× (20.63× at $1), 1 in 22.186 builds |
| DOUBLE OR NOTHING, played out | First to three red or black cards, exactly 1/2: **100.0000%** |
| DOUBLE OR NOTHING with LOCK IN | The LOCK IN offer is the fair value rounded down, so it can only be at or under fair: lowest 99.50% at $1.00 and up; lowest 75.00% at a $0.02 hold |
| Whole round, any run-bar policy | Never above the base RTP (exactly equal unless a LOCK IN offer is taken) |
| MAX WIN | 20,000× the bet (an operator may lower it, never raise it) |
| Run cap | 1,000× the first win; the step that crosses it pays in full |
| Bets | $1.00 to $100.00 in $0.10 steps; minimum run $0.02 |
| Simulation, shipped code | 105 checks: 104 inside the 95% interval, 1 at z = −1.96, resolved with independent follow-up seeds |

**Three things the lab should know.**

1. **Crash has one decision, and it does not move the return.** The player chooses when to lock in. Every stop returns 93% before rounding, so the choice changes the volatility only.
2. **The base game never exceeds 93.0000%.** The best a player can do is red #1 at an amount where 0.93× is exact; no stop and no run-bar policy returns more.
3. **The double has a LOCK IN offer that can be below fair, and at very small holds it can be $0.00.** Played out, the double is exactly fair. The offer shown mid-hand is floor(2 × amount × chance of winning), so it is at or under fair; at a held $0.02 or $0.03 the offer at a 0–2 score is $0.00. This is listed as an open item for a decision.

## Rules as built

Cards are dealt one at a time; every red card climbs a pay ladder, and a club straight after a club or a spade straight after a spade crashes the build. The player locks in at any red, and after any win the run bar opens.

- **Cards.** Every card is a fresh uniform draw from a full 8-deck shoe (416 cards, replaced after each draw), so cards are independent. Half the cards are red (hearts, diamonds), a quarter are clubs and a quarter are spades.
- **Ladder.** The first red pays 0.93× the bet and each red after it pays 1.2× the one before: red #j pays floor(0.93 × 1.2^(j−1) × bet), in exact integer arithmetic. Locking in at red #1 pays less than the bet.
- **Crash.** Nothing can crash before the first red. After it, a club straight after a club, or a spade straight after a spade, crashes the build and it pays nothing. The chance that the next red comes before a crash is exactly 5/6 at every step.
- **LOCK IN and AUTO DEAL.** LOCK IN takes the current red's pay. Cards deal by themselves; with AUTO DEAL off the player deals each card.
- **Top red.** Red #18 is the top of the build: it pays its full 20.6331× and ends the build. The "20×" in the name is a target, not a cap: the step that reaches it pays in full.
- **After any win** (including a return of the bet or less) the run bar opens: CASH OUT, DOUBLE OR NOTHING or DOUBLE HALF, with a RUN BANK (see Run phase).

**The DOUBLE OR NOTHING hand.** A race to three: three red cards before three black cards doubles the amount, three black before three red loses it. Every card is red or black with probability exactly 1/2. After every card the player may LOCK IN the offer shown, which is the fair value of the position rounded down, or deal the next card.

## Pays and ladder math

**Every stop on the ladder returns exactly 93% before rounding.** The player reaches red j with probability (5/6)^(j−1) and red j pays 0.93 × 1.2^(j−1), so the expected return of stopping at red j is 0.93 × (1.2 × 5/6)^(j−1) = 0.93 exactly, because 1.2 × 5/6 = 1. The solver (`exact.py`) holds every pay as an exact integer number of cents and every probability as a fraction.

**Rounding.** Each pay is floored to the cent once, so the RTP columns below are the exact return of that stop after rounding. They are under 93% only by the floor, and the loss shrinks as the bet grows: at $100 every stop is within 0.0023 points of 93%.

| Red | × bet | Chance of reaching it | 1 in | RTP at $1 | RTP at $10 | RTP at $100 | Pays at $1 | Pays at $10 | Pays at $100 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 0.9300× | 100.0000% | 1.000 | 93.0000% | 93.0000% | 93.0000% | $0.93 | $9.30 | $93.00 |
| 2 | 1.1160× | 83.3333% | 1.200 | 92.5000% | 93.0000% | 93.0000% | $1.11 | $11.16 | $111.60 |
| 3 | 1.3392× | 69.4444% | 1.440 | 92.3611% | 92.9861% | 93.0000% | $1.33 | $13.39 | $133.92 |
| 4 | 1.6070× | 57.8704% | 1.728 | 92.5926% | 92.9977% | 92.9977% | $1.60 | $16.07 | $160.70 |
| 5 | 1.9284× | 48.2253% | 2.074 | 92.5926% | 92.9784% | 92.9977% | $1.92 | $19.28 | $192.84 |
| 6 | 2.3141× | 40.1878% | 2.488 | 92.8337% | 92.9945% | 92.9985% | $2.31 | $23.14 | $231.41 |
| 7 | 2.7770× | 33.4898% | 2.986 | 92.7667% | 92.9677% | 92.9978% | $2.77 | $27.76 | $277.69 |
| 8 | 3.3324× | 27.9082% | 3.583 | 92.9342% | 92.9900% | 92.9984% | $3.33 | $33.32 | $333.23 |
| 9 | 3.9988× | 23.2568% | 4.300 | 92.7946% | 92.9807% | 92.9993% | $3.99 | $39.98 | $399.88 |
| 10 | 4.7986× | 19.3807% | 5.160 | 92.8334% | 92.9885% | 92.9981% | $4.79 | $47.98 | $479.85 |
| 11 | 5.7583× | 16.1506% | 6.192 | 92.8657% | 92.9949% | 92.9998% | $5.75 | $57.58 | $575.83 |
| 12 | 6.9100× | 13.4588% | 7.430 | 92.8657% | 92.9868% | 92.9990% | $6.90 | $69.09 | $690.99 |
| 13 | 8.2920× | 11.2157% | 8.916 | 92.9779% | 92.9891% | 92.9992% | $8.29 | $82.91 | $829.19 |
| 14 | 9.9504× | 9.3464% | 10.699 | 92.9966% | 92.9966% | 92.9994% | $9.95 | $99.50 | $995.03 |
| 15 | 11.9404× | 7.7887% | 12.839 | 92.9966% | 92.9966% | 92.9997% | $11.94 | $119.40 | $1,194.04 |
| 16 | 14.3285× | 6.4905% | 15.407 | 92.9446% | 92.9966% | 92.9998% | $14.32 | $143.28 | $1,432.85 |
| 17 | 17.1942× | 5.4088% | 18.488 | 92.9771% | 92.9987% | 92.9998% | $17.19 | $171.94 | $1,719.42 |
| 18 | 20.6331× | 4.5073% | 22.186 | 92.9861% | 92.9996% | 92.9996% | $20.63 | $206.33 | $2,063.30 |

The × bet column is the nominal multiplier; the pays are the cent amounts the build pays (for example, at $10 red #3 pays $13.39, which is 1.3390×). The top pay is red #18 at 20.6331×, 1 in 22.186 builds.

## Player choices

**The player decides one thing in the base game: which red to lock in at. It changes the spread of results, not the return.** Because every stop is exactly 93% before rounding, there is no best or worst strategy beyond the cent: the table shows the exact return of the main ways to play, including rounding.

| Way of playing | RTP at $1 | RTP at $10 | RTP at $100 | SD at $10 (× bet) | Hit rate at $10 |
| --- | --- | --- | --- | --- | --- |
| Best stop (red #1 at every bet) | **93.0000%** | **93.0000%** | **93.0000%** | 0.0000 | 100.0000% |
| AUTO: never lock in (red #18 or a crash) | 92.9861% | 92.9996% | 92.9996% | 4.2806 | 4.5073% |
| Uniformly random stop (red #1 to #18) | 92.8233% | 92.9912% | 92.9991% | 2.3001 | 32.0813% |
| Worst stop at that bet | 92.3611% (red #3) | 92.9677% (red #7) | 92.9977% (red #4) |  |  |

Hit rate is the share of builds that pay more than 0. Red #1 is always reached, so locking in there pays 0.93× every time.

**The whole bet grid.** Over all 991 bets from $1.00 to $100.00 in $0.10 steps, the lowest return of any stop is **92.3077%** ($1.30, lock in at red #1: the pay is floor(1.209) = $1.20), the highest is 93.0000%, and AUTO lies between 92.9636% and 93.0000%. No stop on any bet returns more than 93.0000%.

The rules sheet shows the lowest at small bets as 92.3% (the exact 92.3077% cut to one decimal).

## Run phase: DOUBLE OR NOTHING and the run bar

**Played out, DOUBLE OR NOTHING returns exactly 100.0000% of the amount run; the LOCK IN offers inside it are at or under fair.** Each card is red or black with probability exactly 1/2, so a first-to-three race is won by reds with probability exactly 1/2 (no ties). The chance that reds win from each score (reds–blacks) is:

| Score | 0–0 | 0–1 | 0–2 | 1–0 | 1–1 | 1–2 | 2–0 | 2–1 | 2–2 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Reds win | 1/2 | 5/16 | 1/8 | 11/16 | 1/2 | 1/4 | 7/8 | 3/4 | 1/2 |

### The LOCK IN offer

After every card the race offers LOCK IN at floor(2 × amount × chance of reds winning from that score), in cents. That is the fair value rounded down, so an offer is never above fair. It is the only place in Crash where a player can take less than fair value. The table shows the exact return of three ways of using it: play the race out; LOCK IN after the first card; LOCK IN the first time reds are ahead.

| Amount run | Played out | LOCK IN after the first card | LOCK IN when ahead |
| --- | --- | --- | --- |
| $0.02 | 100.0000% | 75.0000% | 81.2500% |
| $0.03 | 100.0000% | 83.3333% | 95.8333% |
| $0.10 | 100.0000% | 95.0000% | 96.2500% |
| $0.46 | 100.0000% | 98.9130% | 99.7283% |
| $0.93 | 100.0000% | 99.4624% | 99.4624% |
| $1.00 | 100.0000% | 99.5000% | 99.7500% |
| $9.30 | 100.0000% | 99.9462% | 99.9597% |
| $20.63 | 100.0000% | 99.9758% | 99.9818% |
| $93.00 | 100.0000% | 99.9946% | 99.9973% |
| $206.33 | 100.0000% | 99.9976% | 99.9988% |
| $2,063.30 | 100.0000% | 99.9998% | 99.9998% |

**Amounts of $1.00 and up.** The lowest return of locking in after the first card is 99.50% at $1.00 (offers $1.37 after a red, $0.62 after a black). The single offer furthest below its fair value is 97.09% of fair ($1.03 at 0–2 offers $0.25 against $0.2575). No offer at $1.00 or more is $0.00.

**Small amounts ($0.02 to $0.99).** These holds arise after DOUBLE HALF (the $0.93 first stop halves to $0.46, and so on). The lowest return of locking in after the first card is 75.0000% at $0.02 (offers $0.02 after a red, $0.01 after a black). At a held $0.02 or $0.03 the offer at a 0–2 score is **$0.00** (fair value $0.005 and $0.0075), and no other amount up to $30.00 has a $0.00 offer. The lowest offer at every small amount is always at 0–2 (chance 1/8): $0.04 to $0.07 offers $0.01; $0.08 to $0.11 offers $0.02; $0.12 to $0.15 offers $0.03; $0.50 offers $0.12; $0.99 offers $0.24. The full table for every amount from $0.02 to $0.99 is in `par.txt` section 3.

### The bar

After any win, including a return of the bet or less, the bar offers **CASH OUT**, **DOUBLE OR NOTHING** and **DOUBLE HALF**, with a **RUN BANK** escrow. The bar is the shared module `run-bar.js` v170, embedded byte for byte in the build.

- CASH OUT pays the RUN BANK plus the held amount.
- DOUBLE OR NOTHING plays the race with all of the held amount; a win makes the held amount 2×.
- DOUBLE HALF stakes half the held amount (rounded down to the cent), puts the rest, with any odd cent, in the RUN BANK, and plays the race with the half. A lost double returns the RUN BANK as the held amount (the banked-bust rule); with an empty RUN BANK the round ends at 0.
- After every result, in cents: clip the held amount to MAX WIN minus the RUN BANK; end at MAX WIN; end at the **1,000× run cap** (1,000× the first win; the step that crosses it pays in full); otherwise show the bar.
- DOUBLE needs a held amount of at least $0.02 and RUN BANK + 2 × held within MAX WIN. DOUBLE HALF needs half of at least $0.02 (a hold of $0.04 or more) and RUN BANK + the kept half + 2 × half within MAX WIN. A bar with neither shows CASH OUT alone.
- A played-out double is an exact whole-cent doubling: no rounding. Only the LOCK IN offers round down.

**Checked against the build's own text and code.** `exact.py` parses the money constants from the build with patterns that must match exactly once (the ladder recurrence, the race to three and its offer floor, the 8-deck shoe, the suit and bust rules, MIN_RUN 2, CAP_X 1000, the show rules, version 170, and the three bar actions) and stops if any differs; it also asserts that no ride, RUN IT AGAIN or RUN HALF code is left. The exact policy model follows the shipped flow (enter the bar, compute it, start the run, banked bust, pay or settle), and the simulations play the shipped bar.

## Round-level RTP: no policy can exceed the base RTP

**However a player uses the run bar, a round returns at most what the base stop returns, and exactly that unless a LOCK IN offer is taken.** Playing the doubles out or halving them leaves the return unchanged; only a LOCK IN offer below fair can lower it. The bar can therefore never raise a round above 93.0000%.

### The argument

Held amount plus RUN BANK changes only through three kinds of action. A played-out DOUBLE or DOUBLE HALF is a bet that wins with probability exactly 1/2 for exactly 2× (no tie, whole-cent doubling, never clipped because it is shown only when it cannot pass MAX WIN), so its expected change is zero. A LOCK IN offer is floor(fair value), so its expected change is zero or negative. CASH OUT ends the round. The total is therefore a supermartingale, it is bounded by MAX WIN, and the round ends with probability 1, so by optional stopping the expected final pay of any policy is at most the expected pay of cashing out at once. A policy that never takes a LOCK IN offer equals it exactly.

### Named policies (exact except P4)

Two ways of playing the base game are combined with the bar: **lock1** locks in at red #1 (0.93×, always reached), **auto** never locks in (AUTO DEAL runs to red #18 or a crash). Policies then act at the bar.

| Policy | Rule at the bar |
| --- | --- |
| P0 | CASH OUT |
| P2 | DOUBLE OR NOTHING once, played out (no LOCK IN), then CASH OUT |
| P3 | DOUBLE OR NOTHING while shown (to the 1,000× cap, MAX WIN or a loss), played out, then CASH OUT |
| P4 | Random: CASH OUT 1/3, otherwise a random shown button (DOUBLE OR NOTHING or DOUBLE HALF); LOCK IN with probability 1/3 at each race card |
| P5 | DOUBLE HALF once, played out, then CASH OUT |

Exact results (the same at $10 and $100 except where shown):

| Build | Policy | RTP | SD (× bet) | Hit rate |
| --- | --- | --- | --- | --- |
| lock1 | P0 | 93.0000% | 0.0000 | 100% |
| lock1 | P2 | 93.0000% | 0.930 | 50.0000% |
| lock1 | P3 | 93.0000% | 29.745 (max 952.32×) | 0.0977% |
| lock1 | P5 | 93.0000% | 0.465 (0.460 at $1) | 100% |
| auto | P0, P2, P3, P5 | 92.9996% at $10 and $100; 92.9861% at $1 | 4.281, 6.125, 99.115, 4.808 | 4.5073%, 2.2537%, 0.0088%, 4.5073% |
| both | P4 | at most the P0 figure (simulation only) |  |  |

Hit rate is the share of rounds that pay more than 0. P2 pays 0 when its double loses, while a lost DOUBLE HALF still returns the RUN BANK, so P5 always pays. P0, P2, P3 and P5 are exact fractions (for example auto at $10: 125933837890625/135413275557888), and the solver asserts that P2 = P3 = P5 = P0.

**P5 closed form.** At a held H of $0.04 or more the round pays H − half or H + half with probability 1/2 each (half = floor(H/2)), a mean of exactly H. At $1 with lock1 (H = $0.93) it pays $1.39 or $0.47. `exact.py` asserts that this equals the flow model.

**P4 has no exact value.** Without the ride its reachable (held, RUN BANK) graph still passes 10^6 states (counted to 3 × 10^6), so its mean is bounded by P0 through the supermartingale argument and checked by simulation.

## Rounding, limits and RNG

**The only rounding is one floor on each base pay and one floor on each LOCK IN offer; the played-out doubles add none.** At a $1 bet the floor costs up to 0.64 points on a stop (0.69 at the worst bet on the grid, $1.30); at $100 it costs under 0.01.

- **Rounding.** Every ladder pay is floor(0.93 × 1.2^(j−1) × bet cents), computed in integer arithmetic (BigInt floor), once. DOUBLE OR NOTHING and DOUBLE HALF are exact whole-cent doublings; DOUBLE HALF stakes the floor of half the cents and banks the rest. LOCK IN offers in the race are floor(2 × amount × chance).
- **Bets.** $1.00 to $100.00 in $0.10 steps.
- **MAX WIN.** 20,000× the bet. An operator may set it lower, never higher. Every payout is clipped to it, and a double that could pass it is not offered. The ladder's top is 20.6331×, far under it.
- **Run cap.** 1,000× the first win. The step that crosses it pays in full, so a run can pay more than 1,000× the first win (never more than MAX WIN).
- **Minimums.** $0.02 for DOUBLE OR NOTHING; $0.04 for DOUBLE HALF (half of at least $0.02).
- **RNG.** Every card is drawn with `crypto.getRandomValues` and rejection sampling over the 416-card shoe (values above the largest multiple of 416 that fits in 32 bits are discarded), so each card is exactly uniform with no modulo bias. There is no `Math.random` anywhere in the game. Production replaces the RNG with the platform RNG (open item).

## Simulation evidence

**104 of 105 checks sit inside their 95% interval, and the one that did not was resolved with independent seeds.** The simulations run the shipped game script and run-bar module in Node, whole rounds through the game's own flow (deal, LOCK IN, the bar buttons, settle). Every card comes from the build's own crypto RNG, replaced by a seeded xoshiro128** stream. Each round is checked for exactly one settle, wallet change = pay − bet, nothing above MAX WIN and no timers left.

**Base game** (every stop is also scored on the same cards; the table shows the two summary plays):

| Bet | Rounds | AUTO: simulated RTP (95% CI) | AUTO exact | Uniform random stop: simulated (95% CI) | Uniform exact | Step chance (5/6 = 0.833333) |
| --- | --- | --- | --- | --- | --- | --- |
| $1 | 2,000,000 | 92.5121% (91.9204% to 93.1039%) | 92.9861% | 92.7833% (92.4650% to 93.1016%) | 92.8233% | 0.833282 |
| $10 | 4,000,000 | 93.2550% (92.8349% to 93.6750%) | 92.9996% | 93.1769% (92.9511% to 93.4028%) | 92.9912% | 0.833414 |
| $100 | 2,000,000 | 93.0383% (92.4450% to 93.6317%) | 92.9996% | 92.9659% (92.6471% to 93.2846%) | 92.9991% | 0.833365 |

**Whole rounds through the run bar** (lock1 = lock in at red #1; auto = never lock in). z is the simulated RTP minus the exact value, in standard errors; P4 has no exact value, only the upper bound.

| Bet | Build | Policy | Rounds | Simulated RTP | 95% CI | Exact RTP | z | Simulated hit | Exact hit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| $1 | lock1 | P0 | 200,000 | 93.0000% | 93.0000% to 93.0000% | 93.0000% | 0.00 | 100.0000% | 100.0000% |
| $1 | lock1 | P2 | 200,000 | 92.8745% | 92.4669% to 93.2820% | 93.0000% | -0.60 | 49.9325% | 50.0000% |
| $1 | lock1 | P3 | 200,000 | 84.2803% | 71.8696% to 96.6910% | 93.0000% | -1.38 | 0.0885% | 0.0977% |
| $1 | lock1 | P4 | 200,000 | 92.3431% | 92.0609% to 92.6254% | at most 93.0000% |  | 91.6790% |  |
| $1 | lock1 | P5 | 200,000 | 93.0557% | 92.8541% to 93.2573% | 93.0000% | +0.54 | 100.0000% | 100.0000% |
| $10 | lock1 | P0 | 1,000,000 | 93.0000% | 93.0000% to 93.0000% | 93.0000% | 0.00 | 100.0000% | 100.0000% |
| $10 | lock1 | P2 | 1,000,000 | 92.9704% | 92.7881% to 93.1527% | 93.0000% | -0.32 | 49.9841% | 50.0000% |
| $10 | lock1 | P3 | 1,000,000 | 90.0895% | 84.3513% to 95.8276% | 93.0000% | -0.99 | 0.0946% | 0.0977% |
| $10 | lock1 | P4 | 1,000,000 | 93.0532% | 92.9237% to 93.1827% | at most 93.0000% |  | 91.7788% |  |
| $10 | lock1 | P5 | 1,000,000 | 93.0056% | 92.9144% to 93.0967% | 93.0000% | +0.12 | 100.0000% | 100.0000% |
| $10 | auto | P0 | 1,000,000 | 93.3746% | 92.5340% to 94.2152% | 92.9996% | +0.87 | 4.5255% | 4.5073% |
| $10 | auto | P2 | 1,000,000 | 92.8072% | 91.6080% to 94.0064% | 92.9996% | -0.31 | 2.2490% | 2.2537% |
| $10 | auto | P3 | 1,000,000 | 97.1897% | 77.3308% to 117.0485% | 92.9996% | +0.41 | 0.0092% | 0.0088% |
| $10 | auto | P4 | 1,000,000 | 93.2867% | 92.2443% to 94.3291% | at most 92.9996% |  | 4.1465% |  |
| $10 | auto | P5 | 1,000,000 | 92.3358% | 91.3966% to 93.2749% | 92.9996% | -1.39 | 4.4753% | 4.5073% |
| $100 | lock1 | P0 | 500,000 | 93.0000% | 93.0000% to 93.0000% | 93.0000% | 0.00 | 100.0000% | 100.0000% |
| $100 | lock1 | P2 | 500,000 | 93.0777% | 92.8200% to 93.3355% | 93.0000% | +0.59 | 50.0418% | 50.0000% |
| $100 | lock1 | P3 | 500,000 | 91.8036% | 83.6119% to 99.9954% | 93.0000% | -0.29 | 0.0964% | 0.0977% |
| $100 | lock1 | P4 | 500,000 | 93.0609% | 92.8794% to 93.2425% | at most 93.0000% |  | 91.7360% |  |
| $100 | lock1 | P5 | 500,000 | 92.9438% | 92.8149% to 93.0727% | 93.0000% | -0.85 | 100.0000% | 100.0000% |
| $100 | auto | P0 | 500,000 | 93.1621% | 91.9746% to 94.3496% | 92.9996% | +0.27 | 4.5152% | 4.5073% |
| $100 | auto | P2 | 500,000 | 93.1704% | 91.4712% to 94.8696% | 92.9996% | +0.20 | 2.2578% | 2.2537% |
| $100 | auto | P3 | 500,000 | 92.9640% | 65.4966% to 120.4315% | 92.9996% | 0.00 | 0.0088% | 0.0088% |
| $100 | auto | P4 | 500,000 | 92.5471% | 91.0963% to 93.9979% | at most 92.9996% |  | 4.1398% |  |
| $100 | auto | P5 | 500,000 | 92.9599% | 91.6286% to 94.2912% | 92.9996% | -0.06 | 4.5184% | 4.5073% |

P3 is too heavy-tailed to test its mean tightly, so its exact value rests on the enumeration. Every P4 interval either lies below its upper bound or contains it; the three point estimates above the bound (93.05%, 93.29%, 93.06%) are each within one standard error of it.

**The one miss.** Base game at $100, LOCK IN at red #2: simulated 92.9422% against the exact 93.0000% (z = −1.96). These are the same seeds and the same cards as every earlier run, so it is the same miss. Independent follow-up seeds (2,000,000 rounds, seeds 1501–1504, reported apart and never pooled into the tables) give 93.0115% (z +0.39); the main run plus the follow-up gives 92.9769% (z −1.11), exact inside both. With 105 checks at the 95% level about five misses are expected by chance.

**Seeds.** Base game seeds 1001–1008 at $10, 1101–1104 at $1, 1201–1204 at $100 (500,000 rounds each). Policy runs use seed = 30000 + 1000 × bet index (0 = $10, 1 = $100, 2 = $1) + 100 × build index (0 = lock1, 1 = auto) + 10 × policy slot + part; P5 uses slot 6, so no earlier seed is reused for it. The $1 runs use seeds 32001–32062. The player's own choices use a second stream seeded with the seed XOR 0x5bd1e995.

**Same seeds as the previous run.** 58 runs are identical round for round (all 16 base runs, all 12 follow-up runs, and every P0, P2 and P3 run), so the base game is bit-identical to the build before RUN IT AGAIN and RUN HALF were removed. The 10 that changed are all P4 (the random player now chooses between two buttons instead of four). The 10 P5 runs are new, and the 20 runs of the retired P1 and the old P5 are retired.

## Reproduce, files and open items

The pack folder `crash/` reproduces every number here with Python 3 (standard library only) and Node 18 or later. `exact.py` parses every money constant from the build text with patterns that must match exactly once and stops if one differs; it also asserts that no ride, RUN IT AGAIN or RUN HALF code is left. Every output records the build's sha256.

```
cd crash
./run_all.sh     # build hash, exact math, every simulation chunk, the same-seed comparison, results.json and par.txt (commands, seeds and timing in README.txt)
```

| File | What it does |
| --- | --- |
| `exact.py` | Exact math in fractions: every stop, strategies, the bet grid, the race, LOCK IN offers at every amount, policies P0, P2, P3, P5 (P5 also by closed form), the P4 bound |
| `engine.js` | Loads the build's own scripts into Node with a seeded crypto RNG and virtual-time timers |
| `sim_base.js`, `sim_policy.js` | Base game and whole rounds through the shipped flow |
| `compare_prev.py` | Same-seed comparison with the previous run |
| `summarize.py` | Pools the seeds, checks every exact value against its 95% interval, writes `results.json` and `par.txt` |
| `par.txt`, `results.json`, `README.txt` | PAR tables, every headline number as data, every command and seed |

**Open items for the lab and for the team.**

1. **A LOCK IN offer of $0.00.** At a held $0.02 or $0.03 the race shows a LOCK IN that pays nothing when the score is 0–2, because the offer is floor(fair value) and the fair value is under one cent. Taking it loses the whole amount. It is reachable only after repeated DOUBLE HALF, and it cannot raise any return, but a player-facing button that pays $0.00 is worth a decision: hide LOCK IN when the offer would be under $0.01, or offer at least $0.01. Say which you want.
2. **The sheet's "DOUBLE OR NOTHING 100.0%" is the played-out figure.** The sheet also says, in the paragraph above it, that the LOCK IN offer is the fair value rounded down, so it is disclosed. Taking offers returns slightly less (99.50% at the worst amount of $1.00 and up). Say if you want "played out" added to that row.
3. **RNG.** Production replaces `rand32` with the platform RNG and decides outcomes server-side; that is certified separately.
4. **The §12 tests (1–17)** from the original hand-off notes need definitions, or to be declared out of scope.
5. **P4 has no exact value.** Its reachable state graph passes 10^6 states without the ride. Its mean is bounded by P0 and checked by simulation; every other policy is exact.
