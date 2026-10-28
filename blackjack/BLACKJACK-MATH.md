# Card Run Blackjack 20× — Math Pack for Certification

**Build:** `card-run-blackjack-classic-launch.html` · sha256 `381595b2ec0103398f92886e7429afc9624c3a53d6e68ebcd7e86fde01f2708c` · 131,176 bytes
**Date:** 16 October 2026, updated 28 October 2026 (DOUBLE HALF limited to 50 presses a round, section 6.5) · **Run bar:** v170 · **Change in this build:** the dealer stands on all 17s in the DOUBLE OR NOTHING hand (change request "DOUBLE OR NOTHING returns just over 100% (Blackjack)", 2026-10-16)
**Companion files:** `par.txt` (plain-text PAR sheet), `results.json` (every number below), `README.txt` (every script, command and seed), `out/CR_report.txt` (the change request's report-back block), `out/CAP50_report.txt` and `out/cap50.json` (the 50-press cap, section 6.5).
**Status of the cap:** the cap is a rule of this pack. Build `381595b2…` (run bar v170) does **not** enforce it yet; the build and the run-bar module need the change in section 5 before the pack describes a shipped game (section 10, item 8).

---

## 0. Summary for the lab

| Item | Value |
|---|---|
| Base game RTP, best play (all cards on the table) | **94.368%** (exact) |
| Base game RTP, rules-sheet basic play | 93.448% |
| Base game RTP, conventional blackjack chart | 93.651% |
| Base game RTP, worst play (lowest documented) | **81.950%** |
| Base game top pay | 20× the bet, 1 in 209,049 rounds |
| MAX WIN | 20,000× the bet (an operator may lower it, never raise it) |
| DOUBLE OR NOTHING, best play | **100.0910%** (win chance 50.0455%) |
| DOUBLE OR NOTHING, basic strategy | **100.0721%** (win chance 50.0360%) |
| DOUBLE OR NOTHING, worst play | 92.0888% |
| Whole round, cash out at once (best play) | 94.3679% |
| Whole round, double to the 1,000× cap | 95.2299% |
| DOUBLE HALF limit (rule R50) | **at most 50 presses in a round**; DOUBLE OR NOTHING and CASH OUT are never limited |
| **Whole round, the best possible bar play with the 50-press limit (exact optimum)** | **≈ 96.81%** (upper bound 96.812%) — below 100% |
| Whole round, the best possible bar play with no limit (reference only) | ≈ 97.49% (upper bound 97.489%) |
| Bets | $1.00 – $100.00 in $0.10 steps |
| Rounding | Whole cents, rounded down; no rounding occurs on the base game or on any double |

**What changed in this build.** In the DOUBLE OR NOTHING hand the dealer now stands on all 17s (it hit soft 17 before). The base game was already standing on all 17s, so one dealer rule now covers the whole game. Nothing else changed: 8 lines differ from the previous build (the dealer line, the felt line, two pieces of rules-sheet text, the in-game panel and comments).

**Contract change.** The shared rule "each game's double returns at most 100%" no longer holds for Blackjack: its double returns **100.07%–100.09%**, depending on play. The whole round still returns well under 100% (below).

**A correction to the change request.** The request states that the worst case for a whole round is about 94.4% (a player who doubles every time). That is the *double-every-time* case only. A player who uses DOUBLE HALF as well can do better; the exact optimum over every possible sequence of button presses is **97.49%** per round with no limit on DOUBLE HALF, and **96.81%** with it limited to 50 presses a round. Both are under 100%; the limit raises the margin from 2.5 to 3.2 points. Section 6 has the working.

**What changed in this update.** DOUBLE HALF may be pressed at most 50 times in a round (rule R50). Nothing on the board or in the double hand changes, so every figure in sections 2 to 4 stands. The best-play ceiling for the whole round falls from 97.49% to 96.81%. The first-win size hardly matters once the limit is in force: for every solved first win from 50 cents to $3.00 the best bar play returns 1.02586 × the first win to within 3e-5 (section 6.5). The 100% question was not open before the limit and is not open after it; the limit narrows the worst case and bounds the length of a run.

---

## 1. Rules as built

- **Deck.** Infinite deck: every card is an independent draw from 13 ranks (ten-valued cards 4 in 13).
- **Board.** Four player hands against one dealer. The dealer shows one card, draws after the player hands, and **stands on all 17s**.
- **Player choices.** Hit or stand on hard 12–16 and soft 17. Every other total is played automatically (hard 11 or less and soft 16 or less hit; hard 17+ and soft 18+ stand).
- **Ties win.** A player blackjack against a dealer blackjack ties, and the BJ column pays. A dealer blackjack beats every other hand.
- **Pays** (× bet; the three columns add): **WINS** (hands won) 2 / 3 / 4 = 0.3× / 1.2× / 2×; **MADE 21** (hands that make 21) 1 / 2 / 3 / 4 = 0.4× / 1× / 2× / 4×; **BJ** (blackjacks) 1 / 2 / 3 / 4 = 0.5× / 2× / 10× / 18×. Four blackjacks and four wins together make the top pay of 20×; four blackjacks against a dealer blackjack pay 18× (the BJ column only).
- **The 20× name is a target, not a cap.** Top pay is 20× and nothing on the board pays more.
- **After any win** the run bar opens (section 5). **DOUBLE HALF may be pressed at most 50 times in a round** (rule R50, section 5).

---

## 2. Base game maths (exact)

The base game is one board. Its outcome space is computed exactly by backward induction over the player's decisions and forward propagation of the pay distribution (`exact_board.js` → `out/exact_board.json`). Constants (pays, columns, rule fragments) are parsed from the build text and asserted, so the solver cannot drift from the build.

### 2.1 Return by play

| Play | RTP | SD (× bet) | Hit rate |
|---|---|---|---|
| Best play (all cards on the table) | 94.368% | 0.9421 | 69.53% |
| Basic play (rules sheet) | 93.448% | 0.9246 | 72.48% |
| Standard blackjack chart | 93.651% | 0.9362 | 71.44% |
| Random 50/50 at choices | 87.516% | 0.9118 | 69.04% |
| Always stand at choices | 87.455% | 0.9796 | 61.54% |
| Always hit at choices | 89.842% | 0.8859 | 74.98% |
| Worst play | 81.950% | 0.8978 | 69.14% |

Return by pay column at best play: WINS 74.179%, MADE 21 9.149%, BJ 11.039% (sum 94.368%).

### 2.2 Pay distribution (best play)

| Pay (× bet) | Probability | 1 in |
|---|---|---|
| 20.0 | 4.783572e-6 | 209,049 |
| 18.0 | 2.376930e-7 | 4,207,107 |
| 12.4 | 2.638982e-5 | 37,893 |
| 12.0 | 1.740311e-4 | 5,746 |
| 11.2 | 1.846567e-4 | 5,415 |
| 10.4 | 1.501169e-6 | 666,148 |
| 10.0 | 1.763312e-5 | 56,711 |
| 6.0 | 1.897964e-5 | 52,688 |
| 5.0 | 5.918093e-5 | 16,897 |
| 4.5 | 5.793764e-5 | 17,260 |
| 4.4 | 7.171135e-4 | 1,394 |
| 4.0 | 3.463308e-3 | 289 |
| 3.6 | 7.874848e-4 | 1,270 |
| 3.5 | 9.921355e-4 | 1,008 |
| 3.2 | 4.149416e-3 | 241 |
| 3.0 | 4.785027e-3 | 209 |
| 2.9 | 7.599878e-3 | 132 |
| 2.7 | 1.090777e-3 | 917 |
| 2.5 | 3.017378e-2 | 33 |
| 2.4 | 3.106563e-2 | 32 |
| 2.3 | 3.339452e-3 | 299 |
| 2.2 | 6.214395e-3 | 161 |
| 2.1 | 9.838970e-3 | 102 |
| 2.0 | 1.445421e-1 | 7 |
| 1.7 | 3.268098e-2 | 31 |
| 1.6 | 3.949601e-2 | 25 |
| 1.5 | 1.318092e-4 | 7,587 |
| 1.3 | 4.799431e-3 | 208 |
| 1.2 | 1.129953e-1 | 9 |
| 1.0 | 1.114324e-3 | 897 |
| 0.9 | 1.542079e-3 | 648 |
| 0.8 | 3.146611e-2 | 32 |
| 0.7 | 3.565791e-2 | 28 |
| 0.5 | 3.966236e-2 | 25 |
| 0.4 | 4.027935e-2 | 25 |
| 0.3 | 1.061586e-1 | 9 |
| 0.0 | 3.047110e-1 | 3 |

Board pays are whole cents at every bet on the $0.10 grid (every pay is a multiple of 0.1× and every bet a multiple of 10 cents), so the base game has no rounding effect.

### 2.3 Skill

Blackjack is a skill game. The displayed RTP is for best play, which uses every card on the table. The rules sheet lists best, basic and worst play, describes best play ("uses every card on the table"), and spells out the basic play in words: always hit hard 12; hit hard 13 against 2 and 3; stand on hard 13–16 against 4–6 and on 14–16 against 2 and 3; hit 13–16 against 7 or higher; hit soft 17 except against 7. The exact best-play table the simulations use is `out/optmasks.bin`, produced by `exact_board.js`.

The skill gap on the board is 94.368% − 81.950% = 12.4 points between best and worst play, and 0.92 points between best and basic.

---

## 3. DOUBLE OR NOTHING (the Run Game): dealer stands on all 17s

### 3.1 The hand

- One player hand against the dealer, infinite deck, **the dealer hits 16 or less and stands on all 17s**.
- The player is forced to hit hard 11 or less and soft 16 or less; chooses hit or stand on hard 12–16 and soft 17–18; stands on hard 17+ and soft 19+. A bust loses at once.
- **Ties on 19 and 20 win.** Any other tie is a push and **the hand is dealt again.**
- A blackjack (two cards) beats a 21 made with three or more cards.
- **A win pays exactly 2× the stake;** a loss pays 0. The stake can be doubled from $0.02; every double is a whole-cent 2×, so there is no rounding.

### 3.2 Exact solution

Let V be the win chance of one *resolved* hand (pushes dealt again). V satisfies a fixed point V = W + P·V, where W is the win chance and P the push chance of a single deal. `rungame.js` solves it exactly, with the player's hit/stand choice re-optimised against V. The return is RTP = 2V.

| Play | RTP | Win chance (V) | Push per deal | Deals per resolved hand | RTP, dealer hits S17 (previous build) |
|---|---|---|---|---|---|
| **Best play** | **100.0910%** | 50.0455% | 4.052% | 1.04223 | 99.9077% |
| **Basic strategy (conventional chart)** | **100.0721%** | 50.0360% | 4.000% | 1.04166 | 99.8981% |
| Worst play | 92.0888% | 46.0444% | 3.683% | 1.03824 | 91.9174% |
| Always stand | 94.7814% | 47.3907% | 3.145% | 1.03247 | 94.8811% |
| Always hit | 97.3050% | 48.6525% | 4.541% | 1.04757 | 96.8500% |

- Best play: V = 0.50045487064506489; 2V = 1.000910 (change request check 1).
- **"Basic strategy" means the conventional no-doubling blackjack chart**: hard 12 stand against 4–6, else hit; hard 13–16 stand against 2–6, else hit; soft 17 hit; soft 18 stand against 2–8, hit against 9, 10 and ace. This reproduces the change request's 99.8981% (dealer hits soft 17) and 100.0721% (dealer stands) to four decimals, so the "before" column of the change request is reproduced too.
- The rules sheet's own "basic play" is a *board* strategy and has no rule for soft 18. Applied to this hand with soft 18 = stand it returns 99.9579% (soft 18 hit 99.9630%; soft 18 by the chart 100.0378%). It is shown here for information; the declared range uses the conventional chart.
- **Declared range for the double hand: 100.07% (basic) to 100.09% (best).** Worst play is 92.09%.
- The edge per double is +0.091% at best play (2V − 1 = 0.000910) and +0.072% at basic strategy.

### 3.3 Effect of the rule change

Standing on soft 17 helps the player by 0.183 points at best play (99.9077% → 100.0910%) and by 0.174 points at basic strategy. It is the smallest single-rule change that takes the hand over 100%.

---

## 4. Pushes and the deal count

A push (a tie other than 19 or 20) deals the hand again. At best play 4.052% of deals push, so a resolved hand takes 1.04223 deals on average. The ratio W / (1 − P) = 0.48018 / 0.95948 = 0.50045 gives the win chance per resolved hand.

---

## 5. The run bar (v170)

After any win the bar offers: **CASH OUT** · **DOUBLE OR NOTHING** · **DOUBLE HALF**, with a **RUN BANK** escrow.

- **CASH OUT** pays the RUN BANK plus the held amount.
- **DOUBLE OR NOTHING** plays the double hand with the whole held amount as the stake.
- **DOUBLE HALF** doubles half of what is held: half = ⌊held ÷ 2⌋ (in cents) is the stake, and the rest (held − half, including any odd cent) goes to the RUN BANK.
- If a double wins, the held amount becomes 2 × the stake (the RUN BANK is kept). If it loses, **the RUN BANK comes back as the held amount** (the banked-bust rule); a lost double with an empty RUN BANK ends the round with nothing.
- **Order of checks after every result, in cents:** clip the held amount to MAX WIN − RUN BANK; end at MAX WIN; end at the **1,000× run cap** (1,000 × the first win; the double that crosses it pays in full); otherwise show the bar.
- **DOUBLE** is offered only when the held amount is at least $0.02 and RUN BANK + 2 × held ≤ MAX WIN. **DOUBLE HALF** only when ⌊held ÷ 2⌋ ≥ $0.02 (so held ≥ $0.04) and RUN BANK + (held − half) + 2 × half ≤ MAX WIN. A bar with neither shows CASH OUT alone.
- Doubles are exact whole-cent doubles: no rounding at small amounts.
- **DOUBLE HALF limit (rule R50).** DOUBLE HALF is offered only while fewer than 50 DOUBLE HALF presses have been made in the round, on top of the conditions above. A press counts when it is made, whether the double then wins or loses. The count starts at 0 with the first win of the round and only goes up: a lost double, the RUN BANK coming back as the held amount, a reload or a reconnect do not reset it, and it is part of the stored round state. At 50 presses the DOUBLE HALF control is not shown and the bar offers CASH OUT and DOUBLE OR NOTHING (and CASH OUT alone when the held amount is under $0.02, as before). DOUBLE OR NOTHING and CASH OUT are never limited. Order of checks: the MAX WIN and run-cap checks come first, as above; the limit only removes the DOUBLE HALF offer.
- RUN IT AGAIN and RUN HALF do not exist in this build.

The shipped bar code equals the shared module `run-bar.js` v170: `runbar_diff.js` compares the offers and amounts on 1,594,400 states with 0 differences.

---

## 6. Whole-round RTP

### 6.1 Why the double changes the round maths

With the dealer standing on soft 17, each double wins with probability V = 0.500455, an edge of +0.091% per double. The bar is then a slightly *favourable* betting game, capped at 1,000× the first win and at MAX WIN. Previously every double returned under 100%, so cashing out at the first bar was the best policy and every other policy returned less. That is no longer true: **every policy that doubles beats cash out**, and the question for certification is how much the best one can win in total.

### 6.2 Named policies (best play on the board and in the double)

Policies are played after the first win of a round; the amount at stake is the round's own winnings.

| Policy | Rule | RTP (exact; the same at $1, $10 and $100) |
|---|---|---|
| P0 | Cash out at the first bar | 94.3679% |
| P2 | DOUBLE OR NOTHING once, then cash out | 94.4538% |
| P3 | DOUBLE OR NOTHING while offered, to the cap | 95.2299% |
| P4 | A uniformly random button among those shown at every bar | 94.4825% |
| P5 | DOUBLE HALF once, then cash out | 94.4108% |

(P1, RUN IT AGAIN once, was retired with that mechanic.) Previous build: P2 94.2809%, P3 93.5010%, P4 94.2520%, P5 94.3244%, all below P0 94.3679%.

Closed forms (each asserted equal to the bar model to 1e-12):

- **P2** = P0 + (2V − 1) × E[ammo doubled], where *ammo* is the first win.
- **P5** = P0 + (2V − 1) × E[half], where half = ⌊a ÷ 2⌋ for a first win of *a* cents: 94.36791% + 0.04293 points.
- **P3** = E[ammo × (2V)¹⁰]: ten doublings make 1,024 × the ammo, which crosses the 1,000× cap, so every run that can double stops after exactly ten wins. 94.368% × 1.000910¹⁰ = 94.368% × 1.009135 = 95.230%.
- **P4** (random button) has no closed form. It is solved by a full recursion over every state, cut at path probability 1e-12 (cut mass 0.0188%); the value converges to 94.48248 (94.482503 at cut 1e-7, 94.482480 at 1e-12), good to 0.00003 points.

Standard deviations (× bet): P2 1.633, P3 42.84 (hit rate 1 in 1,460), P4 2.692 (a lower bound), P5 1.154.

### 6.3 The exact optimum over every possible bar policy (no limit on DOUBLE HALF; reference)

Sections 6.3 and 6.4 solve the bar with DOUBLE HALF unlimited, which is the case before rule R50. They stay in the pack because the limited optimum (6.5) is measured against them and converges to them as the limit grows.

The most the bar can ever return is found exactly by dynamic programming (`bar_optimum.cpp`): the state is (held, RUN BANK) in whole cents; the actions at each state are the ones the build offers; the value of a state is the expected final payout under the best continuation. Value iteration (Gauss-Seidel) runs until the relative residual is 1e-13. For an ammo of A cents let **λ(A) = V\*(A) ÷ A**.

Rules of the model are the build's: cap at 1,000 × A (the round ends paying everything when bank + held ≥ cap); MAX WIN = 20,000 × bet; minimum $0.02; DOUBLE and DOUBLE HALF offers as in section 5; banked-bust return; win chance V = 0.50045487064506489. The solver's offers equal run-bar v170 on 1,351,200 states (edge cases and random), 0 differences; a deliberately broken version (minimum 3 cents) is caught. An independent evaluator in JavaScript recomputes V\*/A from the solver's policy table to 1e-12 at A = 10, 20 and 40 cents and finds no state where another offered action is better.

| A (cents) | States | V\*/A | Always DOUBLE | Always DOUBLE HALF | Optimal first button |
|---|---|---|---|---|---|
| 5 | 241,575 | 1.031066 | 1.009135 | 1.012794 | DOUBLE HALF |
| 10 | 567,875 | 1.032151 | 1.009135 | 1.021982 | DOUBLE HALF |
| 20 | 1,319,328 | 1.032639 | 1.009135 | 1.026800 | DOUBLE HALF |
| 30 | 2,149,167 | 1.032821 | 1.009135 | 1.028665 | DOUBLE HALF |
| 40 | 3,033,454 | 1.032859 | 1.009135 | 1.029350 | DOUBLE HALF |
| 50 | 3,957,541 | 1.032950 | 1.009135 | 1.030016 | DOUBLE HALF |
| 60 | 4,914,833 | 1.032942 | 1.009135 | 1.030304 | DOUBLE HALF |
| 80 | 6,911,729 | 1.032956 | 1.009135 | 1.030705 | DOUBLE HALF |
| 100 | 8,993,268 | 1.032996 | 1.009135 | 1.031040 | DOUBLE HALF |
| 150 | 14,485,841 | 1.033014 | 1.009135 | 1.031394 | DOUBLE HALF |
| 200 | 20,282,073 | 1.033015 | 1.009135 | 1.031597 | DOUBLE HALF |
| 300 | 32,536,195 | 1.033024 | 1.009135 | 1.031792 | DOUBLE HALF |

Also solved: A = 70, 90, 120, 130, 160, 170 (`par.txt` section 7). At basic-strategy play (V = 0.50036044049423456) the optimum is 1.024541 (A = 5), 1.025395 (10), 1.025779 (20), 1.025951 (40), 1.026059 (100), 1.026074 (200); always DOUBLE gives 1.007232.

**What the optimal policy does.** It never cashes out before the cap (CASH OUT is the best action in no state, at any A solved), and it opens with DOUBLE HALF. From the A = 40c policy table: at the start and whenever the held amount is more than about 45% of everything at stake (held + RUN BANK) it plays DOUBLE HALF in every state; when the held amount is under about 25% of the total it plays DOUBLE in most states (about 75–85% of them); between 25% and 45% the choice depends on the share and the size. DOUBLE is the only bet when half would fall under the 2-cent minimum, and near the cap. Always DOUBLE gives 1.009135 (= 1.000910¹⁰) and always DOUBLE HALF gives 1.0316 at A = 200c; the optimum, 1.0330, is the mix. (Interpretation, not a proof: the edge is earned on the amount staked, and DOUBLE HALF lets the player stake repeatedly while part of the winnings sits safe in the RUN BANK. The table above is the evidence.)

**The limit.** λ(A) rises slowly with A and settles near 1.0330. Richardson extrapolation on pairs (A, 2A) gives 1.033236 (5, 10), 1.033126 (10, 20), 1.033079 (20, 40), 1.033053 (40, 80), 1.033034 (100, 200), 1.033034 (150, 300); least-squares fits on A ≥ 40 give 1.033055 and 1.033022. **λ(∞) = 1.03304 ± 0.00004.** λ(A) is not strictly monotone in A (whole-cent halves add small lattice effects; the largest excess of a smaller A over a larger one is 3.6e-5), so the upper bound uses λ̂ = 1.03308, the larger of the biggest solved value and the extrapolated limit plus its error.

**MAX WIN.** MAX WIN removes offers and never adds any, so it can only lower the value. In the tightest case (MAX WIN equal to the run cap, an ammo of 20× the bet) the value falls by 1.6e-3 at every size tested (A = 20, 40, 60, 100).

### 6.4 The round-level worst case

The base game gives the ammo distribution of the first win (section 2.2); each ammo is then worth at most λ × A. The worst case for the house is best board play followed by the best bar policy.

| Bet | Cash out (P0) | Always DOUBLE (P3) | Estimate of the optimum | Upper bound |
|---|---|---|---|---|
| $1 | 94.3679% | 95.2299% | 97.482% | 97.489% |
| $10 | 94.3679% | 95.2299% | 97.487% | 97.489% |
| $100 | 94.3679% | 95.2299% | 97.487% | 97.489% |

- **Estimate** = the exact value where V\* is solved, and the fitted λ(A) = 1.033055 − 0.0067 ÷ A elsewhere. At $1 the solved sizes cover 86% of winning rounds (the exact part is worth 70.723 points in 59.5% of rounds); at $10 only A = 300c is solved; at $100 none of the base ammo (3,000 cents and up) is solved, so the estimate rests on the fitted curve.
- **Upper bound** = the board's best-play return 94.368% × λ̂ 1.03308 = 97.489%. It assumes λ(A) ≤ λ̂ at every A, which is supported by all solved sizes and the fitted curve but not proved for unsolved A.
- **Joint optimisation of board and bar play.** For any board policy, E[V\*(ammo)] ≤ λ̂ × E[ammo], and E[ammo] is largest (94.368% of the bet) at best play. So no combination of board and bar play exceeds 97.489%; the best-play estimate sits within 0.007 points of that bound.
- **The change request's 94.4% is the always-double case on a 93.5% board** (93.5% × 1.0009¹⁰). On the shipped board's best-play 94.368% the always-double figure is **95.23%**, and the true worst case is **97.49%**.

**Conclusion:** the claim "every round strategy stays below 100%" holds, with a margin of 2.5 points with no limit on DOUBLE HALF. The figure 94.4% should be replaced by **97.49%** where the worst case with no limit is quoted, and by **96.81%** with the 50-press limit (section 6.5).

### 6.5 DOUBLE HALF limited to 50 presses a round (rule R50)

**The rule.** DOUBLE HALF is offered only while fewer than 50 DOUBLE HALF presses have been made in the round (section 5). DOUBLE OR NOTHING and CASH OUT are never limited.

**Why it matters.** Each double is a favourable bet (+0.091% of the amount staked). DOUBLE HALF lets the player stake again and again while the rest of the winnings sits safe in the RUN BANK, so with no limit the number of favourable bets in a round is bounded only by the 1,000× cap. The limit bounds the number of repeats. It changes no board figure, no double-hand figure and none of the named policies P0, P2, P3 or P5 (none of them presses DOUBLE HALF more than once). P4 (a random button each time) presses DOUBLE HALF with probability at most ½ at each bar, so a path with 50 presses has probability below 2⁻⁵⁰ = 8.9e-16, far under the 1e-12 cut of section 6.2; P4 is unchanged to the stated accuracy.

**Method.** Let V\_r(held, RUN BANK) be the best expected final payout with *r* DOUBLE HALF presses still allowed (`bar_optimum_cap.cpp`). DOUBLE OR NOTHING stays in layer *r*; DOUBLE HALF moves to layer *r* − 1. Inside one layer the states have no cycle (a full double either raises the held amount with the bank fixed or lands on an empty bank, from which it only raises the held amount or ends the round), so each layer is solved exactly in one pass, with no iteration and no tolerance. Layer 0 is the bar with DOUBLE OR NOTHING and CASH OUT only. The value of the start state in layer *N* is the optimum with the limit *N*, so one run gives every limit from 0 to 100 (1,500 for the three smallest first wins). The offers, the banked-bust return, the 2-cent minimum, the 1,000× run cap and MAX WIN are those of section 5 and 6.3. For a first win of *A* cents let **λ\_N(A) = V\_N(A) ÷ A**.

| N (limit) | A = 5c | A = 20c | A = 50c | A = 100c | A = 200c | A = 300c |
|---|---|---|---|---|---|---|
| 0 | 1.009135 | 1.009135 | 1.009135 | 1.009135 | 1.009135 | 1.009135 |
| 10 | 1.015969 | 1.016101 | 1.016101 | 1.016089 | 1.016085 | 1.016087 |
| 20 | 1.019298 | 1.019589 | 1.019635 | 1.019633 | 1.019631 | 1.019631 |
| 30 | 1.021658 | 1.022087 | 1.022158 | 1.022159 | 1.022159 | 1.022160 |
| 40 | 1.023543 | 1.024089 | 1.024196 | 1.024196 | 1.024197 | 1.024198 |
| **50** | **1.025132** | **1.025738** | **1.025863** | **1.025860** | **1.025860** | **1.025863** |
| 75 | 1.027877 | 1.028730 | 1.028859 | 1.028868 | 1.028870 | 1.028871 |
| 100 | 1.029453 | 1.030492 | 1.030664 | 1.030668 | 1.030671 | 1.030674 |
| no limit | 1.031066 | 1.032639 | 1.032950 | 1.032996 | 1.033015 | 1.033024 |

(N = 0 is 1.000910¹⁰ = 1.009135: ten doubles reach the 1,000× cap. λ\_N(A) has small lattice wobbles at small N and small A from whole-cent halves, up to 4e-4 at N ≤ 5.) The same table for every solved first win (5, 10, 20, 30, 40, 50, 60, 80, 100, 150, 200 and 300 cents) is in `out/CAP50_report.txt`.

**The limit makes the first-win size irrelevant.** Without a limit λ(A) keeps rising with A (1.0311 at 5c to 1.0330 at 300c, section 6.3). With 50 presses it is flat once A reaches 50 cents: for A = 50, 60, 80, 100, 150, 200 and 300 it lies between 1.025838 and 1.025867 (spread 2.9e-5). The number of presses, not the room under the 1,000× cap or the 2-cent minimum, is what limits the run. Extrapolating the solved sizes to large A (fits on A ≥ 20, 40 and 50 and four Richardson pairs, 1.025858 to 1.025881): **λ\_50(∞) = 1.02586 ± 0.00003**; λ̂\_50 = 1.02590 (the larger of the largest solved value and the extrapolated limit plus its error, the rule of section 6.3). Without the limit λ̂ = 1.03308. The 51st press would add +1.49e-4 × the first win (+0.014 points of round return); the 100th adds +5.5e-5.

**Whole round, best board play (94.368%).**

| Bet | Cash out (P0) | Always DOUBLE (P3) | Optimum with the limit (estimate) | Upper bound with the limit | No limit: estimate | No limit: upper bound |
|---|---|---|---|---|---|---|
| $1 | 94.3679% | 95.2299% | 96.808% | 96.812% | 97.482% | 97.489% |
| $10 | 94.3679% | 95.2299% | 96.810% | 96.812% | 97.487% | 97.489% |
| $100 | 94.3679% | 95.2299% | 96.810% | 96.812% | 97.487% | 97.489% |

- **Estimate** = the exact V\_50(A) where A was solved (8 of the 36 first-win sizes at a $1 bet, 36.8% of rounds) and the fitted λ\_50(A) = 1.025875 − 0.0021 ÷ A elsewhere. With λ\_50 flat from 50 cents up, the fit matters only for first wins under 50 cents.
- **Upper bound** = the board's best-play return 94.368% × λ̂\_50 1.02590 = 96.812%. As in 6.4, for any board policy E[V\_50(ammo)] ≤ λ̂\_50 × E[ammo] ≤ λ̂\_50 × 94.368%, so no combination of board and bar play exceeds 96.812% (under the assumption that λ\_50(A) ≤ λ̂\_50 at every A, which every solved size supports).
- **Margin to 100%:** 3.19 points (2.51 points with no limit).

**What the limit costs at other settings** (best board play, λ\_N at A = 200c; ceiling = 94.368% × λ\_N):

| N (limit) | Whole-round ceiling |
|---|---|
| 0 | 95.230% |
| 1 | 95.316% |
| 2 | 95.397% |
| 3 | 95.474% |
| 5 | 95.622% |
| 10 | 95.886% |
| 20 | 96.220% |
| 30 | 96.459% |
| 40 | 96.651% |
| **50** | **96.808%** |
| 60 | 96.938% |
| 75 | 97.092% |
| 100 | 97.262% |
| no limit | 97.489% |

A lower limit lowers the ceiling; a higher one raises it towards 97.49%. The ceiling is a worst case over every possible player; no player reaches it without playing the bar perfectly.

**The proposed accounting, checked.** The change was proposed on the reasoning that 50 presses at the double's edge of 0.0910 points each add 4.55 points to the base return, 94.368% + 4.55% = 98.92%, still under 100%. That figure is a valid ceiling (the exact one, 96.812%, is below it) but it is not how the exact ceiling arises: the edge is earned on the amount staked, which is a share of the running winnings and not one bet, and DOUBLE OR NOTHING presses are not limited, so the sum of 50 edges is not a derivation. The exact solution above is the proof; the linear figure is only a cross-check on the size.

**With the conventional chart in the double** (win chance 0.50036044049423456), λ\_50 is 1.019867 (5c), 1.020220 (10c), 1.020345 (20c), 1.020397 (40c) and 1.020441 (100c and 200c), against 1.026074 with no limit at 200c and 1.007232 at N = 0.

**Checks.** (1) The layered solver equals an independent memoised recursion over (held, RUN BANK, presses left) that takes every offer, amount and round end from `RunBar.compute()` of the shipped run-bar v170 (not from the solver's own offers): 63 cases, A = 2 to 13 cents and N = 0 to 9, largest difference 4.8e-13. (2) For N → ∞ the solver converges to the value iteration of 6.3, a different algorithm: at A = 5, 10 and 20 cents, N = 1,500 differs from the no-limit value by 1.0e-12, and the two agree to 1e-9 from N = 582, 613 and 638. (3) N = 0 equals the closed form 1.000910¹⁰ = 1.009135 at every A. The shipped bar code does not contain the counter yet, so the shipped build is not played under the limit (section 10, item 8).

---

## 7. Rounding, limits, RNG

- **Rounding.** All pays are whole cents rounded down. Board pays are exact at every legal bet on the $0.10 grid; doubles are exact; no rounding occurs anywhere in Blackjack. DOUBLE HALF uses the floor of half the cents and banks the rest.
- **Limits.** Bets $1.00–$100.00 in $0.10 steps; MAX WIN 20,000× the bet; run cap 1,000× the first win (the double that crosses it pays in full); minimum $0.02 for DOUBLE OR NOTHING and $0.04 for DOUBLE HALF; DOUBLE HALF at most 50 presses a round (rule R50).
- **RNG.** Every card is drawn with rejection sampling from `crypto.getRandomValues`; no outcome uses `Math.random`, and with `crypto` missing the game throws. Platform RNG replaces the browser source in production (open item, section 10).
- **Lowest documented return:** 81.95% (worst play on the board), above 75% (GLI-19 §4.7) and 80% (Missouri 11 CSR 45-5.190).

---

## 8. Simulation evidence

All simulations run the **shipped game scripts** in Node with a seeded generator (xoshiro128\*\* behind `crypto.getRandomValues`), so the outcome code is the build's own. Every exact value is checked against the 95% confidence interval of its simulation.

### 8.1 Base game and policies

| Run | Rounds | Result |
|---|---|---|
| Base, best play, $10 (8 seeds, 1001–1008) | 2,000,000 | RTP 94.344% [94.213%, 94.475%], exact 94.368% inside; SD 0.9437×; hit rate 69.51% |
| P0, P2, P3, P4, P5 at $10 and $100; P4, P5 at $1 | 100,000–600,000 each | all within CI except one chance miss (below) |

Policy simulations at $10: P0 94.302% [93.890%, 94.714%]; P2 95.019% [94.302%, 95.735%]; P3 86.170% [68.700%, 103.639%] (hit rate 0.07%: too heavy-tailed to test the mean by simulation, so P3 relies on its closed form); P4 94.069% [93.291%, 94.848%]; P5 94.213% [93.708%, 94.718%].

**Counts.** 37 checks (RTP and hit rate for the base game and P0–P5 at $10 and $100, P4 and P5 at $1, P4 model against game, the double hand in the shipped code, the optimal bar policy at A = 40c). 36 inside. One miss: the P2 hit rate at $100, exact 34.796% against a sample interval [34.825%, 35.417%] (2.15 standard errors, two-sided p = 0.031; about 1.9 misses are expected by chance in 37 checks). An independent follow-up (4 new seeds, 400,000 rounds, chosen once after the miss, run once) gives 34.660% [34.513%, 34.807%]: inside. Follow-ups are reported apart and never pooled into the checks. P4 follow-ups at $1, $10 and $100 (400,000–500,000 rounds each) are also all inside.

**P4 checks.** The shipped code follows the exact bar model on every transition: `trace_check.js` 75k transitions, and `trace_replay.sh` over all 22 P4 simulation jobs (2,200,000 rounds, 2,184,075 transitions), 0 mismatches. A Monte Carlo of the bar model itself (25–50M rounds) is inside at all three bets: $1 94.423% [94.311%, 94.536%], $10 94.477% [94.396%, 94.557%], $100 94.447% [94.338%, 94.557%].

### 8.2 DOUBLE OR NOTHING through the shipped code (change request check 2)

One resolved hand per call of `runGame` from the build:

| Play | Hands | Win chance | RTP [95% CI] | Exact | Pushes per deal | Exact |
|---|---|---|---|---|---|---|
| Best play (seeds 5101–5110) | 10,000,000 | 50.0673% | 100.135% [100.073%, 100.197%] | 100.0910% | 4.050% [4.038%, 4.062%] | 4.052% |
| Basic strategy (5201–5210) | 10,000,000 | 50.0494% | 100.099% [100.037%, 100.161%] | 100.0721% | 3.998% [3.986%, 4.010%] | 4.000% |

All four exact values are inside. One resolved hand pays 0 or 2×, so its standard deviation is 1.00: 10 million hands fix the RTP only to ±0.06 points, while the edge is 0.09. These runs show consistency with the exact value; the exact value itself comes from the evaluator (`rungame.js`) and the rig tests.

### 8.3 The optimal bar policy

- Bar-only model, A = 40c, 2 × 100,000,000 rounds playing the optimal policy table: final ÷ A = 1.03718 [1.02971, 1.04466] and 1.03355 [1.02609, 1.04102]; both contain V\*/A = 1.032859, and neither contains always-DOUBLE (1.009135). Pooled, the result is 9.7 standard errors above always-DOUBLE.
- Shipped code, A = 40c, 2 × 500,000 rounds: 0.971 [0.869, 1.074] and 1.048 [0.942, 1.154]; both contain V\*/A, and also contain always-DOUBLE (the standard deviation is 37–41 × A, so this run cannot tell the two apart). It is a consistency check of the code path only.

### 8.4 Same-seed comparison with the previous build

Re-running every chunk with the same seeds: **11 are identical round for round** (all 8 base chunks and all 3 P0 chunks: sums, sums of squares, hit rate, maximum pay, RNG draws, full payout histogram), and **33 changed** (P2, P3, P4, P5), as they must, because only the double's dealer changed. `exact_board.json` equals the previous build's apart from the build hash, and `optmasks.bin` is byte-identical: the board never meets the double's dealer.

### 8.5 Browser tests of the rule change (change request checks 3–6)

Headless Chromium, 14 checks, all pass (`browser_smoke.js`, screenshots in `out/shots/`):

- Dealer soft 17 (A, 6) stands, no third card is drawn.
- Dealer hard 16 (10, 6) hits.
- The felt reads "DEALER STANDS ON 17".
- The in-game double panel reads "WIN PAYS 2X · RETURNS 100.1%".
- The rules sheet reads "the dealer hits 16 or less and stands on all 17s" and shows "DOUBLE OR NOTHING, best play 100.1%"; no "hits soft 17" remains.
- A round played through DOUBLE OR NOTHING, DOUBLE HALF and CASH OUT pays correctly.

(The rules sheet shows RTPs to one decimal, so it reads 100.1% for the double. The change request's 100.09% / 100.07% pair is in this document and in `par.txt`.)

### 8.6 Change request checks 1–7

| # | Check | Result |
|---|---|---|
| 1 | Evaluator: win chance × 2 | 1.000910 — pass |
| 2 | 10M double hands at basic strategy | 100.099% [100.037, 100.161], exact 100.0721%; pushes 4.00% — pass |
| 3 | Rig dealer soft 17 (A, 6) | Dealer stands, no third card — pass |
| 4 | Rig dealer hard 16 | Dealer hits — pass |
| 5 | Felt line | "DEALER STANDS ON 17" — pass |
| 6 | Rules text | New dealer line and return row (Classic sheet; Clover and Vault are not in this build) — pass |
| 7 | Base game unchanged | 94.368% best play / 93.448% rules-sheet basic; board outputs identical — pass |

### 8.7 The DOUBLE HALF limit (rule R50)

The limit is solved exactly, not simulated, and the shipped build does not contain it, so there are no simulation rounds for it. The evidence is in section 6.5: 63 cases of the solver against an independent recursion on the shipped run-bar v170 (largest difference 4.8e-13) and convergence to the no-limit optimum (1.0e-12 at N = 1,500). Files: `bar_optimum_cap.cpp`, `bar_optimum_cap_run.js`, `bar_cap_check.js`, `cap_report.js`; outputs `out/bar_cap_exact.json`, `out/bar_cap_basic.json`, `out/bar_cap_exact_conv.json`, `out/bar_cap_check.json`, `out/cap50.json`, `out/CAP50_report.txt`.

---

## 9. How to reproduce

Everything runs from `blackjack/` (Node 18+; `g++` for the optimum). The build is read from `../builds-final/`.

```
node consts.js                         # parse + assert every constant and rule fragment against the build
node exact_board.js > out/exact_board.log
node rungame.js > out/rungame.log      # the double hand: best/basic/worst/stand/hit, both dealer rules
node exact_runs.js > out/exact_runs.log
node runbar_diff.js > out/runbar_diff.log
./run_sims.sh 1 ; ./run_double_sims.sh 1
./run_bar_optimum.sh ; ./run_bar_optimum_2.sh
./run_bar_cap.sh > out/bar_cap.log      # the DOUBLE HALF limit: solver check, convergence, ladder (about 25 minutes)
./run_post.sh
NODE_PATH=/opt/npm-tools/node_modules node browser_smoke.js
node round_worst.js ; node aggregate.js ; node cr_report.js
node cap_report.js 50                  # out/CAP50_report.txt, out/cap50.json
```

| File | What it is |
|---|---|
| `consts.js` | Parses pays, columns, limits and rule fragments from the build and asserts them (including that the old hit-soft-17 rule is gone) |
| `exact_board.js` | Exact board maths: RTP by play, pay distribution, best-play table |
| `rungame.js` | Exact double hand (fixed point for pushes) |
| `exact_runs.js` | Exact policy values P0, P2–P5 at $1/$10/$100 |
| `bar_optimum.cpp`, `bar_optimum_run.js` | Exact optimum over all bar policies, with a check against run-bar v170 |
| `bar_policy_eval.js`, `bar_policy_sim.js` | Independent check of the optimum; the optimal policy played through the shipped code |
| `bar_optimum_cap.cpp`, `bar_optimum_cap_run.js`, `bar_cap_check.js`, `run_bar_cap.sh` | Exact optimum with DOUBLE HALF limited to N presses (layered, exact); independent recursion check on run-bar v170; the ladder of first wins |
| `cap_report.js` | The 50-press report (`out/CAP50_report.txt`, `out/cap50.json`) |
| `round_worst.js` | Round-level worst case and extrapolation |
| `harness.js`, `policy.js`, `strategy.js`, `seedcrypto.js` | Run the shipped scripts with a seeded RNG and a bot |
| `mc_model.js`, `trace_check.js`, `trace_replay.sh`, `runbar_diff.js` | Model Monte Carlo and equality proofs between the shipped bar and the model |
| `double_sim.js`, `browser_smoke.js` | The double hand through the shipped code; headless browser rig tests |
| `aggregate.js`, `compare_prev.js`, `cr_report.js` | Pooling and CI checks; same-seed comparison; change-request report |
| `par.txt`, `results.json` | Every number in this document except section 6.5 (those are in `out/CAP50_report.txt` and `out/cap50.json`) |

Seeds for every chunk are listed in `README.txt`.

---

## 10. Items for the lab and open points

1. **Declare the double hand as a range, 100.07% (basic) to 100.09% (best),** and the round as: base 94.368% (best play) / 93.448% (rules-sheet basic) with a worst case over all bar play of **96.81%** (DOUBLE HALF limited to 50 presses a round, section 6.5; 97.49% with no limit). The previous statement that every bar action returns under 100% is withdrawn for Blackjack.
2. **The 94.4% worst case in the change request is superseded** by 96.81% with the 50-press limit (97.49% with no limit; section 6). It is the always-double case on a 93.5% board; the build's board returns 94.368% at best play.
3. **The optimum is proven for sizes A ≤ 300 cents.** For the larger first wins at $10 and $100 bets the figure uses the fitted curve, and the upper bound assumes λ(A) ≤ 1.03308 for every A. The solved sizes and the fit support it; it is not a proof for unsolved A. With the 50-press limit the same assumption is much better supported: λ\_50(A) is flat (spread 2.9e-5) over every solved A from 50 to 300 cents, so λ̂\_50 = 1.02590 does not rest on a rising curve. If the lab wants the larger sizes solved exactly, A = 300c took 23 minutes and 32.5 million states; $10 bets start at A = 300c and $100 bets at 3,000c.
4. **"Basic strategy" for the double hand** is the conventional chart, as in the change request. The rules sheet's own basic play is a board strategy and returns 99.9579% when applied to the double; the sheet does not show a basic figure for the double hand.
5. **The rules sheet shows one decimal (100.1%).** The change request asks for 100.09% / 100.07% in the rules text; the build shows 100.1% under the one-decimal convention used for every RTP on the sheet. Say if the lab wants two decimals for this line.
6. **Clover and Vault** appear in the change request's rules table; they are not in this build.
7. **RNG:** the production platform RNG and server-side outcome determination replace the browser `crypto` source.
8. **The build does not contain rule R50.** Build `381595b2…` (run bar v170) has no DOUBLE HALF counter. The change is: a per-round counter of DOUBLE HALF presses, starting at 0 at the first win and stored with the round state; the press increments it before the double is played; the DOUBLE HALF offer in `RunBar.compute()` additionally requires the counter to be below 50; nothing resets it. Once the build is changed, `consts.js` must assert the constant and the offer fragment, `runbar_diff.js` and the solver's offer check must include the counter, and the pack must be regenerated for the new build hash. Until then section 6.5 describes the rule and its maths, not a shipped game.
9. **Tests for the limit** (to add to the build's tests): after 49 presses DOUBLE HALF is shown and after the 50th it is not; the 50th press is counted whether it wins or loses; a lost double that returns the RUN BANK does not reset the count; a reload or reconnect keeps the count; at 50 presses the bar shows CASH OUT and DOUBLE OR NOTHING; DOUBLE OR NOTHING is still offered after 50 presses until the 1,000× cap or MAX WIN; the count restarts at 0 in the next round.
10. **Player-facing text.** The rules sheet and the bar copy should state the limit (for example "DOUBLE HALF can be used up to 50 times in a round"). The sheet shows one decimal for every RTP, so no new RTP line is needed: the limit changes only the worst-case ceiling, which the sheet does not show.
11. **An operator who lowers the limit** lowers the ceiling (table in section 6.5); a limit above 50 is not covered by the 50-press figures (the table gives 60, 75 and 100, and the no-limit figure is the reference).
