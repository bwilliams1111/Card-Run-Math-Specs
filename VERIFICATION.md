# Card Run 20× — Verification Guide

**Games:** Blackjack 20× · Crash 20× · Kicks 20× · Mines 20×
**Date:** 16 Oct 2026 (run-bar v170: RUN IT AGAIN and RUN HALF removed; Blackjack's DOUBLE OR NOTHING dealer stands on all 17s)
**Companion files:** `card-run-20x-lab-pack.zip` (exact solvers, simulators, raw outputs, PAR sheets) and the four final builds.

This guide tells a verifier what is being submitted, the rules and math each game implements, the figures we claim, and how to reproduce every one of them from the files. Section 7 is a checklist with pass criteria.

---

## 1. Scope

**In scope**
- The game math of the four client builds: rules, pay tables, rounding, caps, RTP at every documented strategy, and the run phase.
- The exact solvers and simulations in the lab pack, and their agreement.
- The player rules screen in each game.

**Out of scope for this submission**
- **The production RNG and server-side outcome determination.** The builds draw outcomes in the client with `crypto.getRandomValues` (section 3). Production replaces them with the platform RNG, which is certified separately.
- **The §12 tests (1–17)** named in the original hand-off notes. Their definitions were never supplied.

---

## 2. Files and hashes

Check every file against these hashes before testing: `sha256sum <file>`.

| File | Game / role | sha256 |
|---|---|---|
| `card-run-blackjack-classic-launch.html` | Blackjack 20× | `381595b2ec0103398f92886e7429afc9624c3a53d6e68ebcd7e86fde01f2708c` |
| `card-run-crash-classic-launch.html` | Crash 20× | `123d6bced443c4c42038569cbc107af207b3dc49ed6bef05fcb621bf6adaa075` |
| `card-run-kicks-classic-launch.html` | Kicks 20× | `f4592849c5f06a8f3b9c63d495caa02fb7fdebe13a645bce0c609cc819654e26` |
| `card-run-mines-classic-launch.html` | Mines 20× | `2f73b626f7889810d499dbb863632ff42645ff6c6300f3b8f3b47a0b24974426` |
| `shared/run-bar.js` | Run phase money logic, v170 | `7b61be1a3c0908761e953d0f43ba434f488104d914cb859f1465d87e47d11dbc` |
| `shared/run-bar.test.js` | Run-bar unit tests (18) | `52772163967a06ee763d9b4a02643c922440d2888372b00fe36d3caec211dc7b` |
| `shared/rules-sheet.js` | Rules screen, v1 (presentation only) | `d3593fa85b6b57629807bb476a741a16d8ac6e8449d48bbd88793358289306bb` |

The four builds are in `builds-final/` in the lab pack.
- `run-bar.js` is embedded byte for byte in Crash, Kicks and Mines.
- Blackjack weaves the run deck into its own code; its bar logic equals `run-bar.js` `compute()` on 1,594,400 states (`blackjack/runbar_diff.js`, 0 differences).
- `rules-sheet.js` is embedded byte for byte in all four.

**Note on the packs.** All four packs were run, in full, on the final builds in the table above. Their READMEs name the same hashes.

Build history for the reader of earlier drafts:
- **v168 (14 Oct)** had a $1.00 minimum run; **v169 (15 Oct)** returned it to $0.02.
- **v170 (16 Oct)** removes RUN IT AGAIN and RUN HALF from all four games for certification. The run bar is now CASH OUT, DOUBLE OR NOTHING and DOUBLE HALF, with the RUN BANK. The base game of every title is unchanged, and the base simulation chunks (same seeds) reproduce the v169 outputs round for round.
- Each pack's README lists, against the v169 run, which simulated chunks are identical and which changed (P4 chunks change because the random player now has fewer buttons; P5 is redefined, section 7).

---

## 3. RNG (client builds)

Every outcome-affecting random number comes from `crypto.getRandomValues` with rejection sampling. Blackjack and Mines use the function pair below, byte-identical in both:

```js
const RNG_VERSION = 'crypto-rejection-v1';
function rngU32(){ const c = globalThis.crypto; if(!c || typeof c.getRandomValues !== 'function') throw new Error('Certified RNG unavailable'); const a = new Uint32Array(1); c.getRandomValues(a); return a[0]; }
function rngInt(n){ if(!Number.isInteger(n) || n < 1 || n > 4294967296) throw new RangeError('rngInt: bad range ' + n); const lim = 4294967296 - (4294967296 % n); let x; do x = rngU32(); while(x >= lim); return x % n; }
```

Crash and Kicks use their own equivalent rejection loops:
- **Crash:** `rand32()` + `drawCard()`, rejecting x ≥ LIM = ⌊2³²/416⌋ × 416 and taking (x mod 416) mod 52.
- **Kicks:** `rnd(n)` with lim = 2³² − (2³² mod n).

These are the functions production replaces with the platform RNG: `rngU32` in Blackjack and Mines, `rand32` in Crash, `rnd` in Kicks.

- **Uniform:** rejection sampling, so every draw is exactly uniform with no modulo bias.
- **Fails closed:** with no `crypto`, every game throws (Blackjack and Mines explicitly, Crash and Kicks on the missing global). There is no `Math.random` fallback.
- **Cosmetic only:** `Math.random` remains only for animation (deal tilt and sparks); it never touches an outcome. A headless browser count of every random call by its calling function confirms this.
- **Draw models the server must preserve:**

  | Game | Draw model |
  |---|---|
  | Blackjack | Infinite deck: every card drawn from 13 ranks. |
  | Crash | Every card a fresh, independent draw from an 8-deck shoe (with replacement). **The server must keep draws independent.** Dealing a single deck without replacement changes the math: red #18 returns about 54%. |
  | Kicks | 112-card shoe (2 decks), shuffled every game, dealt without replacement. The Run Game draws fresh from 56 cards. |
  | Mines | Fisher–Yates shuffle of the 25 tiles before the first pick; which bomb tiles are shielded is part of the shuffle. |

- **All test hooks removed.** This includes `window.__kicks`, `window.__crash`, `minesProto`, every `#dev` switch and Blackjack's rigged deals.

---

## 4. Platform rules (all four games)

| Rule | Value |
|---|---|
| Bets | $1.00–$100.00 in $0.10 steps; typed amounts snap down to the grid and are clamped |
| Rounding | Every pay rounded **down** to the cent, in integer arithmetic |
| MAX WIN | 20,000× the round's bet (`MAX_WIN_X`). `OPERATOR_MAX_WIN_X` may lower it, never raise it. Every payout is clipped to it |
| Build target | 20×. The step that reaches 20× pays its full multiplier and ends the build. Crash (20.63×) and Mines (up to 27.90×) can pay over 20×; Blackjack and Kicks top out at exactly 20× |
| Run target | 1,000× the round's first win (the ammo). The run that crosses it pays in full |
| Minimum double | **$0.02**. DOUBLE OR NOTHING needs a held amount of at least $0.02; DOUBLE HALF needs a half of at least $0.02 (a held amount of $0.04 or more). Doubles are exact in whole cents, so nothing is lost to rounding (section 5.5) |
| Settlement | One debit (the bet) and one credit (RUN BANK + held) per round |

### Run phase (run-bar.js v170)

The run bar opens after any win, including a return of the bet or less. Its options:

- **CASH OUT** pays RUN BANK + held.
- **DOUBLE OR NOTHING** plays the game's own double, which pays exactly 2× the stake.
- **DOUBLE HALF** doubles half of what is held. The other half, plus any odd cent, goes to the **RUN BANK** escrow. If the double loses, the RUN BANK comes back as the held amount (the banked-bust rule).

RUN IT AGAIN (one more base board with every pay × k) and RUN HALF were removed in v170, with their multipliers. Nothing in the builds, solvers or rules sheets refers to them except the module's own version note and the retirement notes in the pack READMEs.

Order of checks after every result, in integer cents:
1. Clip held to MAX WIN − RUN BANK.
2. End at MAX WIN.
3. End at the 1,000× run cap (1,000 × the first win; the double that crosses it pays in full).
4. Otherwise show the bar.

DOUBLE is offered only when RUN BANK + 2 × stake ≤ MAX WIN; DOUBLE HALF only when RUN BANK + keep + 2 × half ≤ MAX WIN. A bar with neither shows CASH OUT alone.

| Game | DOUBLE OR NOTHING game |
|---|---|
| Blackjack | One hand v dealer (stands on all 17s); ties on 19/20 win, other ties re-dealt; win pays 2×. Win chance 50.0455%, so it returns **100.0910%** (not a fair-or-worse double: section 5.1, 5.5) |
| Crash | First to three reds v three blacks; a LOCK IN offer after every card = floor(2 × stake × P(win from the score)). Played out, exactly 100% |
| Kicks | Run Game: first to 2 right calls in at most 3 shots, each a fresh draw from 56 cards; posts kicked again. Win chance exactly 1/2 |
| Mines | 25 tiles: 19 gems, 2 live bombs, 4 duds; 6 gems before a live bomb wins. Win chance C(19,6)/C(21,6) = exactly 1/2 |

---

## 5. The four games

### 5.1 Blackjack 20×

**Rules**
- Infinite deck; four player hands v one dealer.
- The dealer has one card up, draws after the hands, and stands on all 17s.
- Player choices are on hard 12–16 and soft 17; other totals are auto-hit or auto-stand.
- Ties win; a blackjack v a dealer blackjack ties, and the BJ column pays. A dealer blackjack beats every other hand.

**Pays** (× bet; all three columns add):

| Column | Pays |
|---|---|
| WINS 2/3/4 | 0.3 / 1.2 / 2 |
| MADE 21 1/2/3/4 | 0.4 / 1 / 2 / 4 |
| BJ 1/2/3/4 | 0.5 / 2 / 10 / 18 |

**Top pay:** four blackjacks and four wins = 20×, 1 in 209,049 rounds. Four blackjacks v a dealer blackjack pays 18×.

**Board RTP** (exact):

| Play | RTP | SD | Hit rate |
|---|---|---|---|
| Best play (uses every card on the table) | **94.368%** (94.3679%) | 0.942 | 69.53% |
| Standard blackjack chart | 93.651% | | |
| Basic play (as written in the rules sheet) | 93.448% | | |
| Always hit | 89.842% | | |
| Random 50/50 | 87.516% | | |
| Always stand | 87.455% | | |
| Worst play | **81.950%** | | |

Board pays are whole cents at every legal bet, so the base game has no rounding effect.

**Run phase**

| | Best play | Notes |
|---|---|---|
| DOUBLE OR NOTHING | **100.0910%** | Dealer stands on all 17s (it hit soft 17 before 16 Oct, when the figure was 99.908%). Win chance 50.0455% (p = 0.50045487064506489); push 4.052% per deal; basic strategy (the conventional chart) 100.0721%; worst play 92.0888%, always stand 94.7814%, always hit 97.3050%; a win pays exactly 2×, so there is no rounding at any stake. Declared range 100.07% (basic) to 100.09% (best). The rules sheet shows 100.1% |
| DOUBLE HALF | 100.0910% | Same double on half the held amount; the other half is banked |

**Skill disclosure.** The rules sheet lists best, basic and worst play, describes best play ("uses every card on the table"), and spells out the basic strategy. The best-play table the simulation uses is `blackjack/out/optmasks.bin`, produced by `exact_board.js`.

### 5.2 Crash 20×

**Rules**
- Cards are dealt one at a time, each an independent draw.
- Red #j pays floor(0.93 × 1.2^(j−1) × bet) in exact integer arithmetic.
- Nothing busts before the first red. After it, a club straight after a club, or a spade straight after a spade, busts.
- P(next red before a bust) = 5/6 exactly.
- Red #18 is the top: it pays 20.633× in full and ends the build.
- LOCK IN takes the current red; AUTO DEAL plays to red #18 or a bust.

**RTP:** every stop returns 0.93 × 1.2^(j−1) × (5/6)^(j−1) = **93.0000%** before rounding.

| Measure | Value |
|---|---|
| AUTO (never tap) at $10 | 92.9996%, SD 4.2806, hit 4.5073% |
| Worst stop: $10 / $1 | 92.9677% (red #7) / 92.3611% (red #3) |
| Lowest on the whole $0.10 grid | **92.3077%** ($1.30, red #1) |
| Top pay | 20.633×, 1 in 22.186 builds |
| DOUBLE OR NOTHING | 100.0000% played out; the LOCK IN offer is worst at 99.50% |

### 5.3 Kicks 20×

**Rules**
- Shoe of 112 cards (2 decks: 48 GOAL cards 6–J, 48 WIDE cards, 16 POST cards 5/Q), shuffled every game and dealt without replacement.
- Six kicks; the player calls GOAL or WIDE each time; a post counts as a miss.
- The first post starts the Posts Bonus (once per game, same shoe).

**Pays** (× bet):

| Right calls | 0 | 1–3 | 4 | 5 | 6 |
|---|---|---|---|---|---|
| Pays | 1 | 0 | 1.5 | 4 | 20 |

Posts Bonus ladder: 2 in a row pays 1×, 3 in a row pays 3×.

**Board RTP** (exact):

| Play | RTP | SD | Hit rate | Top pay (20×) |
|---|---|---|---|---|
| Best play | **92.9666%** (200943920392331/216146392994805) | 1.9606 | 38.77% | 1 in 159.9 |
| Call the side with more cards left | 92.5067% | | | |
| Random calls | 90.5795% | | | |
| Worst play | **84.8069%** | | | |

No rounding effect: every base pay is whole cents on the grid.

**Run phase**

| | RTP |
|---|---|
| DOUBLE OR NOTHING | P(double) = 1/2 exactly, so 100.0000% |

**Skill disclosure.** The rules sheet lists best, shoe-count, random and worst play, and describes best play: follow the shoe count, except after a miss with no right calls yet, when you call the side with fewer cards left.

### 5.4 Mines 20× (changed 14 Oct — re-run in full)

**Rules**
- 25 tiles: 21 gems and 4 bombs. Before the first pick the player sets 1–4 bombs live; the rest are shielded and count as safe picks.
- M(k) = C(25,k)/C(25−B,k) × 0.93, held as an exact fraction.
- **Pay = floor(bet cents × M(k))**, rounded once (`Classic.payC`). The display is floor4(M).
- LOCK IN is available once the display reaches 1.01×.
- **The top pick** is the first pick with M ≥ 20. It pays in full and the board stops there.

| Live bombs | Top pick | Pays | Chance |
|---|---|---|---|
| 1 | 24 | 23.25× | 1 in 25 |
| 2 | 20 | 27.90× | 1 in 30 |
| 3 | 16 | 25.4643× | 1 in 27.38 |
| 4 | 13 | 23.7667× | 1 in 25.56 |

**RTP:** every stop, every bomb count and the top pick all return **93.0000%** before rounding.

| Measure | Value |
|---|---|
| Lowest stop after rounding: $1 / $10 / $100 | 92.40% / 92.92% / 92.993% |
| Lowest on the whole grid | **92.3636%** ($1.10, 1 live bomb, pick 5) |
| Typical (4 live, LOCK IN after 3) at $10 | 92.9843% |
| DOUBLE OR NOTHING | C(19,6)/C(21,6) = 1/2 exactly, so 100.0000% |

**Stop rule.** With the build's own `payC`, the board stops at the top pick, and not before, on:
- all 991 grid bets × 1–4 bombs;
- every cent stake from $0.02 to $1,000.00.

There are 0 failures. The previous float code missed 79 grid bets.

**Changes from the provisional build** (`958eb023…f61c`):
- The top pick was clipped to 20×, returning 66.67–80.00% at that pick. It is now paid in full.
- Pays were computed in floating point. They are now integer cents.
- MAX BUILD in play now shows the top pick's pay for the bomb count chosen.

### 5.5 The double-only bar: policy results and small amounts

With RUN IT AGAIN gone, the only bar actions that change the money are DOUBLE OR NOTHING and DOUBLE HALF, both whole-cent doubles. They can be offered from $0.02 (DOUBLE) and $0.04 (DOUBLE HALF). No rounding is involved in a double, so nothing is lost at small amounts. The only small-amount loss is Crash's LOCK IN offer (below).

**Exact policy RTP** (best-play base board, then the policy at the bar). The policies are listed under the simulation summary in section 7.

| Game | Bar-policy result | $1 / $10 / $100 |
|---|---|---|
| Kicks | Every policy, P4 included, returns the base RTP exactly | 92.9666% at every bet |
| Crash, LOCK IN at red #1 | P0, P2, P3, P5 | 93.0000% at every bet (P4 ≤ P0, simulation) |
| Crash, AUTO | P0, P2, P3, P5 | 92.9861% / 92.9996% / 92.9996% |
| Mines (4 live bombs, LOCK IN after 3 picks) | P0, P2, P3, P4, P5 | 92.5217% / 92.9843% / 92.9959% |
| Blackjack | P0 / P2 / P3 | 94.3679% / 94.4538% / 95.2299% at every bet |
| Blackjack | P4 (random button) | 94.4825% at every bet (full recursion, converged to 0.00003 points) |
| Blackjack | P5 (DOUBLE HALF once) | 94.4108% at every bet (P0 + 0.0429 points: its double wins 50.0455%) |
| **Blackjack** | **Best of every possible bar policy (exact optimum)** | **≈ 97.49%** per round, upper bound 97.489% (below) |

Kicks, Crash and Mines doubles are fair and never clipped, so a held amount plus its RUN BANK is a martingale and every policy returns the same RTP as cashing out. **Blackjack is different.** Its double wins 50.0455% (since 16 Oct the dealer stands on all 17s), so each double is a +0.091% bet and cashing out no longer bounds the other policies: every policy that doubles beats P0. The most any player can get is found exactly by dynamic programming over every (held, RUN BANK) state (`blackjack/bar_optimum.cpp`): V*/A = 1.0311 at a first win of 5 cents rising to 1.03302 at 300 cents and **1.03304 ± 0.00004** in the limit, so a whole round returns at most **94.368% × 1.03308 = 97.489%** (estimate 97.48–97.49% at $1, $10 and $100). The optimal player never cashes out before the cap and opens with DOUBLE HALF. This is the worst case for the house; it stays under 100% with 2.5 points to spare. The figure 94.4% in the change request is the always-double case on a 93.5% board; on the shipped board it is 95.23%. The optimum is solved exactly for first wins up to 300 cents; larger first wins use a fitted curve and the upper bound assumes λ(A) ≤ 1.03308 for every A (`blackjack/BLACKJACK-MATH.md` section 6).

**Crash LOCK IN offers at small amounts** (floored to the cent). Lowest first-card offer: 75.00% of fair at $0.02, against 99.50% from $1.00. At $0.02 and $0.03 the offer at 0–2 is $0.00: the player may lock in for nothing (the bar then shows CASH OUT). From $1.00 the offer furthest below fair is 97.09% of fair ($1.03 at 0–2 offers $0.25 against $0.2575). The offers for every amount from $0.02 to $0.99 are in `crash/par.txt`. Blackjack, Kicks and Mines double at their game's chance and have no offers.

**Checks that exercise small amounts** (through the shipped code):
- **Blackjack:** the bar logic equals `run-bar.js` compute() on 1,594,400 states; P4 at $1, $10 and $100; every simulated P4 round replayed through the exact bar model (2.2M rounds, 2,184,075 transitions, 0 mismatches); the exact bar optimum's offers equal `compute()` on 1,351,200 states (0 differences) and the 10M-hand double simulations (best play and basic strategy) contain the exact RTP.
- **Crash:** $1 lock-in runs for P0, P2, P3, P4, P5 (held $0.93, so DOUBLE HALF runs $0.46 and banks $0.47).
- **Kicks:** P4 at $1.
- **Mines:** P4 at $1 (pays down to $0.03), P5 at $1 pay by pay against the exact distribution; `xcheck.js` compares `RunBar.compute` on 3,078 states, including the minimum-double edge.

---

## 6. Reproducing the results

**Requirements:** Node ≥ 18 and Python 3 (standard library only); no network. Unzip `card-run-20x-lab-pack.zip`. Each game folder reads only `../builds-final/` and its own files.

| Folder | Commands (in order, from inside the folder) | Time |
|---|---|---|
| `shared/` | `node run-bar.test.js` → all passed (18 checks) | seconds |
| `blackjack/` | `node consts.js` · `node exact_board.js > out/exact_board.log` · `node rungame.js > out/rungame.log` · `node exact_runs.js > out/exact_runs.log` · `node runbar_diff.js` · `./run_sims.sh 1` · `./run_double_sims.sh 1` · `./run_bar_optimum.sh` (the exact bar optimum; about 1.5 h, plus 23 min for the 300-cent case) · `node mc_model.js …` · `trace_check.js …` · `./trace_replay.sh` · `node round_worst.js` · `node aggregate.js` (exact lines in the pack README) | ~4 h on a shared 2-core box |
| `crash/` | `./run_all.sh` (sha check, `exact.py`, all simulations, `summarize.py`) | ~6 min |
| `kicks/` | `python3 -I exact_kicks.py` · `./run_sims.sh 1` · `./run_small_p4.sh 1` · `python3 -I compare_prev.py <v169 folder>` (optional) · `python3 -I merge.py` | ~1 h; `exact_kicks.py` needs ~1 GB RAM (P4 cut 1e-15) |
| `mines/` | `python3 -I exact.py > out/exact.txt` · `node -r ./seedcrypto.js xcheck.js > out/xcheck.log` · `./run_sims.sh 1` · `python3 -I summarize.py > out/summary.txt` | ~1.5 h on a shared 2-core box |

**How each part works**
- **The exact solvers read the build.** They parse every constant and rule fragment they depend on from the build text: pay tables, caps, MAX WIN, minimum run, bet grid, rounding code, deck model. They stop if any differs from the value the math uses, so the math cannot drift from the code.
- **The simulators run the shipped code.** They load each build's own scripts into Node with a minimal DOM stub and play through the game's own handlers. The only change is `crypto.getRandomValues`, replaced by a seeded xoshiro128** stream (splitmix32 init, `SEED_CRYPTO`). Every seed is listed in the game's README and recorded in each output file.
- **Each game folder holds its outputs.** `results.json` has every headline number and every CI check; `par.txt` has the PAR tables; `out/` has the raw outputs.

---

## 7. Verification checklist

| # | Check | Pass criterion |
|---|---|---|
| 1 | Hashes of the 4 builds and 3 shared files | Equal to section 2 |
| 2 | `shared/run-bar.test.js` | All passed (18 checks; minimum-double boundaries at $0.01, $0.02, $0.03, $0.04, $0.05; the bar has no RUN IT AGAIN / RUN HALF) |
| 3 | Each exact solver's constant and rule parse | Runs to completion with no assertion failure |
| 4 | Exact headline figures | Equal to section 5 (to the digits shown) |
| 5 | Mines `xcheck.js` | `XCHECK PASSED`: top picks, displays and pays equal the build's own `Classic.setMines` / `payC`; stop rule on every bet and stake; `RunBar.compute` on 3,000 states |
| 6 | Simulations v exact | Every exact value inside its simulation's 95% CI, except the documented chance misses in item 7 |
| 7 | Misses outside a 95% CI, each followed up with independent seeds (reported apart, never pooled silently) | **Crash:** 1 of 105 checks, base $100, LOCK IN at red #2, z −1.96 (the same seeds miss the same way in every build); 2,000,000 follow-up rounds give z +0.39. **Blackjack:** 1 of 37, P2 hit rate at $100 on its first-pass seeds, exact 34.796% against [34.825%, 35.417%] (2.15 SE); an independent follow-up (4 seeds, 400,000 rounds) gives [34.513%, 34.807%], inside; P4 follow-ups at $1, $10 and $100 (400,000 to 500,000 rounds each) also contain the exact value. **Kicks:** 0 of 27. **Mines:** 0 of 15 |
| 8 | Same seed, same result | Re-running any recorded batch with its seed reproduces its output file field for field |
| 9 | One credit per round | Every simulated round settles once; wallet change = pay − bet; nothing above MAX WIN |
| 10 | MAX WIN clip | A round settles at exactly $20,000.00 on a $1 bet and $2,000,000.00 on $100 (edge tests in each game) |
| 11 | Minimum return at any documented play | ≥ 75% (GLI-19 §4.7) and ≥ 80% (Missouri 11 CSR 45-5.190): the lowest is Blackjack worst play, 81.95%. The only amounts below that are Crash LOCK IN offers on held amounts of a few cents (75.00% of fair at $0.02, $0.00 offers at $0.02 and $0.03; section 5.5); an offer may be declined. Lab to confirm, or to set a floor |
| 12 | Rules screen | Opens in the lobby and in play (ⓘ, top left); its pays table equals what LOCK IN / the game pays at the current bet; RTP rows match section 5 |
| 13 | RNG | Section 3: no outcome uses `Math.random`; with `crypto` missing the game throws |
| 14 | Small amounts | A held $0.02 shows DOUBLE OR NOTHING in all four games and a held $0.04 shows DOUBLE HALF; $0.01 shows CASH OUT only; section 5.5 figures reproduce |

### Simulation summary (shipped code)

| Game / run | Rounds | Simulated RTP [95% CI] | Exact | Inside |
|---|---|---|---|---|
| Blackjack base, best play, $10 | 2,000,000 | 94.344% [94.213, 94.475] | 94.368% | yes |
| Blackjack P0, P2, P3, P4, P5, $1, $10 and $100; double hand in the shipped code (2 × 10,000,000 hands); optimal bar policy | 100,000–10,000,000 each | 37 checks | | 36 inside; P2 hit rate at $100, first pass, outside; follow-up inside (item 7) |
| Crash base AUTO, $10 | 4,000,000 | 93.2550% [92.8349, 93.6750] | 92.9996% | yes |
| Crash base and policies, all bets, with the $1 runs | | 105 checks | | 104 inside, 1 chance miss (item 7) |
| Kicks base, best play, $10 | 2,000,000 | 92.8282% [92.5576, 93.0988] | 92.9666% | yes |
| Kicks base and policies, with P4 at $1 | | 27 checks | | all inside |
| Mines base mix (1–4 bombs, LOCK IN after 1–6), $10 | 2,000,000 | 93.0338% [92.9361, 93.1315] | 92.9583% | yes |
| Mines play to the top pick, $10 | 1,000,000 | 93.8011% [92.8680, 94.7341] | 92.9991% | yes |
| Mines play to the top pick, $1.10 | 1,000,000 | 92.8438% [91.9155, 93.7721] | 92.9919% | yes |
| Mines mixes and policies P0, P2, P3, P4, P5, $1, $10 and $100 | 100,000–200,000 each | 15 checks | | all inside |

Policies:
- **P0:** cash out.
- **P0:** cash out.
- **P1:** retired with RUN IT AGAIN.
- **P2:** DOUBLE once.
- **P3:** double while offered.
- **P4:** random button among those shown (CASH OUT, DOUBLE OR NOTHING, DOUBLE HALF). Exact in Kicks and Mines (a martingale: it returns the P0 RTP) and a bounded recursion in Blackjack; simulation only in Crash (bounded above by P0). In Blackjack P4 is 94.4825%, above P0 (section 5.5).
- **P5:** DOUBLE HALF once (it was RUN HALF once before v170).

**Blackjack P4 history.** Under v169 (RUN IT AGAIN in the random mix) Blackjack P4 at $10 missed its 95% CI and stayed outside after 1,000,000 follow-up rounds; the cause was a tail excess of the largest pays in the sample, and the shipped code matched the exact bar model on every replayed round. Under the 16 Oct build (dealer stands on all 17s in the double) the P4 exact value is 94.4825% at every bet; P4 at $10 over 600,000 rounds gives 94.069% [93.291, 94.848], inside, and independent follow-ups at $1, $10 and $100 are inside. All 22 P4 jobs replayed through the exact bar model show 0 mismatches over 2,184,075 transitions, and the model Monte Carlo (25–50 million rounds) agrees with the exact value at all three bets. The old bracket for the cut paths (a cut path is worth at most its total) is withdrawn: with an edge in the double it is no longer an upper bound, and the pack uses the bar optimum instead (`blackjack/README.txt`).

---

## 8. Decisions a verifier should know about

1. **The 20× name is a target, not a cap.** Crash's top red pays 20.63× and Mines' top pick up to 27.90×, each paid in full and disclosed in the rules sheet. Blackjack and Kicks top out at exactly 20×. The lobby button reads "BUILD 20× · $N" with N = 20 × the bet.
2. **1,000× runs.** The run that crosses 1,000× the first win pays in full, so a run can exceed 1,000×. MAX WIN (20,000× the bet) is the only hard limit, and the lobby strip's "WIN UP TO 20,000×" is therefore exact.
3. **Blackjack is a skill game.** Its displayed RTP is for best play, which uses every card on the table. The rules sheet also shows basic and worst play and spells out basic play. DOUBLE OR NOTHING returns 100.0910% at best play and 100.0721% at basic strategy (the dealer stands on all 17s); a whole round returns at most about 97.49% under any bar play.
4. **Kicks keeps the 112-card shoe** (no continuous shuffle), so card counting is part of best play. The rules sheet discloses the shoe and best play.
5. **RUN IT AGAIN and RUN HALF were removed for certification (16 Oct).** Every game's bar is CASH OUT, DOUBLE OR NOTHING and DOUBLE HALF, so no multiplier k exists and every double is a whole-cent 2×. The lobby wording "take it on a 1,000× run" and the RUN BANK name are unchanged.
6. **Bets start at $1.00.** A $0.10 minimum bet would drop Crash's worst stop to about 90%.
7. **Displayed RTPs are rounded to one decimal** on the rules sheets.
8. **The minimum double is $0.02** (15 Oct; kept in v170). v168 had $1.00, which stopped every win under $1 from doubling or halving. A $1 player can double half small wins again. The Crash LOCK IN offer is the only place a few cents costs something (section 5.5). If the lab wants a floor, the option is a minimum below which Crash hides the $0.00 offer.
9. **Blackjack's double returns more than 100% (16 Oct).** The dealer stands on all 17s in DOUBLE OR NOTHING (change request "DOUBLE OR NOTHING returns just over 100%"), so the double returns 100.07% (basic strategy) to 100.09% (best play). The earlier contract "each game's double returns at most 100%" no longer holds for Blackjack; Crash, Kicks and Mines are unchanged at exactly 100%. The whole round stays below 100% under every possible bar play: the exact optimum is about 97.49% (section 5.5). A separate Blackjack math pack (`blackjack/BLACKJACK-MATH.md`, and a PDF) carries the full working.

---

## 9. Open items outside this pack

| Ref | Item | Owner |
|---|---|---|
| #3 | Platform RNG and server-side outcome determination (replace `rngU32` / `rand32` / `rnd`) | Production |
| #24 | Crash server spec: every card an independent draw (with replacement), as in section 3 | Production |
| #17 | §12 tests 1–17: definitions to be supplied, or declared out of scope | Product |
