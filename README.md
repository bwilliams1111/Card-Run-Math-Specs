# Card Run — Math Specifications

Math specifications, exact solvers, simulation evidence and PAR sheets for the **Card Run 20×** game family, prepared for EvenBet and the certification lab.

| Game | Status | Folder |
|---|---|---|
| **Blackjack 20×** | **Delivered** (16 Oct 2026, run-bar v170) · **updated 28 Oct 2026** (rule R50: DOUBLE HALF limited to 50 presses a round) | [`blackjack/`](blackjack/) |
| **Mines 20×** | **Delivered** (16 Oct 2026, run-bar v170) | [`mines/`](mines/) |
| **Kicks 20×** | **Delivered** (16 Oct 2026, run-bar v170) | [`kicks/`](kicks/) |
| **Crash 20×** | **Delivered** (16 Oct 2026, run-bar v170) | [`crash/`](crash/) |

All four packs are complete. The platform rules shared by all four games (bets, rounding, MAX WIN, the run bar, RNG), the cross-game checklist and the open items are in [`VERIFICATION.md`](VERIFICATION.md); every file hash it lists in §2 is reproduced by the files in `builds-final/` and `shared/`.

### The four games at a glance

| Game | Base RTP | Skill | Double | Whole round, any bar play |
|---|---|---|---|---|
| Blackjack | 94.368% best play (81.950% worst) | Yes — hit/stand | 100.0910% best play (+edge) | ≤ 96.81% with rule R50 (97.49% with no limit; exact optimum) |
| Mines | 93.0000% every stop (92.3636% grid low after rounding) | No — volatility only | 100.0000% exactly | = base RTP |
| Kicks | 92.9666% best play (84.8069% worst) | Yes — GOAL/WIDE calls, shoe count | 100.0000% exactly | = base RTP |
| Crash | 93.0000% every stop (92.3077% grid low after rounding) | No — volatility only | 100.0000% played out; LOCK IN offers ≤ fair | ≤ base RTP |

---

## Blackjack 20× — start here

| File | What it is |
|---|---|
| [`blackjack/BLACKJACK-MATH.pdf`](blackjack/BLACKJACK-MATH.pdf) | The math document, formatted |
| [`blackjack/BLACKJACK-MATH.md`](blackjack/BLACKJACK-MATH.md) | The same document in Markdown (`.docx` also provided) |
| [`blackjack/par.txt`](blackjack/par.txt) | Plain-text PAR sheet (every table) |
| [`blackjack/results.json`](blackjack/results.json) | Every headline number and CI check as data |
| [`blackjack/README.txt`](blackjack/README.txt) | Every script, command and seed |
| [`blackjack/PACK-README.txt`](blackjack/PACK-README.txt) | The math pack's cover note |
| [`blackjack/out/CAP50_report.txt`](blackjack/out/CAP50_report.txt) | The 50-press DOUBLE HALF limit (rule R50): λ_N for every solved first win and limit |
| [`blackjack/out/`](blackjack/out/) | Raw solver and simulation outputs, screenshots |

### Headline figures (exact)

| Item | Value |
|---|---|
| Base game RTP, best play | **94.368%** |
| Base game RTP, rules-sheet basic play | 93.448% |
| Base game RTP, worst play | 81.950% |
| Base game top pay | 20× the bet, 1 in 209,049 rounds |
| DOUBLE OR NOTHING, best play / basic strategy | **100.0910% / 100.0721%** (dealer stands on all 17s) |
| DOUBLE HALF limit (rule R50, 28 Oct) | **At most 50 presses in a round**; DOUBLE OR NOTHING and CASH OUT never limited |
| Whole round, best possible bar play **with rule R50** (exact optimum) | **≈ 96.81%** (upper bound 96.812%) |
| Whole round, best possible bar play with no limit (reference) | ≈ 97.49% (upper bound 97.489%) |
| MAX WIN | 20,000× the bet |
| Bets | $1.00 – $100.00 in $0.10 steps; all pays whole cents, rounded down |

### Build under test

| File | sha256 |
|---|---|
| `builds-final/card-run-blackjack-classic-launch.html` | `381595b2ec0103398f92886e7429afc9624c3a53d6e68ebcd7e86fde01f2708c` |
| `shared/run-bar.js` (run phase money logic, v170) | `7b61be1a3c0908761e953d0f43ba434f488104d914cb859f1465d87e47d11dbc` |
| `shared/run-bar.test.js` (18 unit tests) | `52772163967a06ee763d9b4a02643c922440d2888372b00fe36d3caec211dc7b` |
| `shared/rules-sheet.js` (rules screen, presentation only) | `d3593fa85b6b57629807bb476a741a16d8ac6e8449d48bbd88793358289306bb` |

Verify with `sha256sum <file>` before testing.

> **Rule R50 is not in this build.** Build `381595b2…` has no DOUBLE HALF press counter. The pack states the rule and solves its maths exactly; the build and `run-bar.js` need the change described in `BLACKJACK-MATH.md` section 5 (per-round press count stored with the round state, never reset; DOUBLE HALF offered only while it is below 50), then `consts.js` and `runbar_diff.js` extended and the pack regenerated for the new hash. See `VERIFICATION.md` §8 item 10 and `BLACKJACK-MATH.md` section 10.

### Reproducing the results

Requirements: Node ≥ 18, `g++` for the exact bar optimum, no network. Every script in `blackjack/` reads the build from `../builds-final/` and asserts every constant and rule fragment it depends on against the build text, so the math cannot drift from the code.

```sh
cd blackjack
node consts.js                         # parse + assert every constant against the build
node exact_board.js > out/exact_board.log
node rungame.js > out/rungame.log      # the DOUBLE OR NOTHING hand
node exact_runs.js > out/exact_runs.log
node runbar_diff.js > out/runbar_diff.log
./run_sims.sh 1 ; ./run_double_sims.sh 1
./run_bar_optimum.sh ; ./run_bar_optimum_2.sh   # ~1.5 h + 23 min
./run_bar_cap.sh > out/bar_cap.log ; node cap_report.js 50   # the DOUBLE HALF limit, ~25 min
./run_post.sh
node round_worst.js ; node aggregate.js ; node cr_report.js
```

Full command list, timings and every seed: `blackjack/README.txt`. The compiled solvers (`blackjack/bar_optimum`, `blackjack/bar_optimum_cap`) and the 44 MB optimal-policy tables (`blackjack/out/bar_policy_exact_*.bin`) are regenerated locally and are not committed (see `.gitignore`).

---

## Mines 20× — start here

| File | What it is |
|---|---|
| [`mines/MINES-MATH.pdf`](mines/MINES-MATH.pdf) | The math document, formatted (14 pages) |
| [`mines/MINES-MATH.md`](mines/MINES-MATH.md) | The same document in Markdown (`.docx` also provided) |
| [`mines/par.txt`](mines/par.txt) | Plain-text PAR sheet (every table) |
| [`mines/results.json`](mines/results.json) | Every headline number and CI check as data |
| [`mines/README.txt`](mines/README.txt) | Every script, command and seed |
| [`mines/PACK-README.txt`](mines/PACK-README.txt) | The math pack's cover note |
| [`mines/out/`](mines/out/) | Raw solver and simulation outputs |

### Headline figures (exact)

| Item | Value |
|---|---|
| Base game RTP, every stop and every bomb count | **93.0000%** before rounding to the cent |
| Lowest stop after cent rounding: $1 / $10 / $100 | 92.40% / 92.92% / 92.993% |
| Lowest anywhere on the $0.10 bet grid | **92.3636%** ($1.10, 1 live bomb, pick 5) |
| Top picks, paid in full (1 / 2 / 3 / 4 live bombs) | 23.25× / 27.90× / 25.4643× / 23.7667× |
| DOUBLE OR NOTHING | C(19,6) / C(21,6) = 1/2 exactly, **100.0000%** |
| Whole round, any bar policy | Same as the base game (every bar action is a fair bet; nothing is clipped) |
| MAX WIN | 20,000× the bet |
| Bets | $1.00 – $100.00 in $0.10 steps; pay = floor(bet cents × multiplier), once |

Mines has no skill element that moves the return: bomb count (1–4) and stop point change the volatility only.

### Build under test

| File | sha256 |
|---|---|
| `builds-final/card-run-mines-classic-launch.html` | `2f73b626f7889810d499dbb863632ff42645ff6c6300f3b8f3b47a0b24974426` |

The `shared/` modules are the same as for Blackjack (hashes above); `run-bar.js` v170 is embedded byte for byte in the Mines build.

### Reproducing the results

Requirements: Python 3 (standard library only) and Node ≥ 18, no network. `exact.py` parses every constant and rule fragment from the build text and stops if one differs.

```sh
cd mines
python3 -I exact.py > out/exact.txt                   # exact ladders, strategies, policies, run-bar vectors
node -r ./seedcrypto.js xcheck.js > out/xcheck.log    # solver v the build's own code (7 checks)
./run_sims.sh 1                                       # 74 simulation chunks, ~1 h 30 min
python3 -I summarize.py > out/summary.txt             # CI checks, chi-square, results.json, par.txt
```

---

## Kicks 20× — start here

| File | What it is |
|---|---|
| [`kicks/KICKS-MATH.pdf`](kicks/KICKS-MATH.pdf) | The math document, formatted (12 pages) |
| [`kicks/KICKS-MATH.md`](kicks/KICKS-MATH.md) | The same document in Markdown (`.docx` also provided) |
| [`kicks/par.txt`](kicks/par.txt) | Plain-text PAR sheet (every table) |
| [`kicks/results.json`](kicks/results.json) | Every headline number and CI check as data |
| [`kicks/README.txt`](kicks/README.txt) | Every script, command and seed |
| [`kicks/PACK-README.txt`](kicks/PACK-README.txt) | The math pack's cover note |
| [`kicks/out/sheet_strategy.txt`](kicks/out/sheet_strategy.txt) | The rules sheet's description of best play, evaluated exactly |
| [`kicks/out/`](kicks/out/) | Raw solver and simulation outputs |

### Headline figures (exact)

| Item | Value |
|---|---|
| Base game RTP, best play | **92.9666%** (200943920392331 / 216146392994805), SD 1.9606×, hit rate 38.7665% |
| Other ways to call | 92.5067% (side with more cards left) · 90.5795% (random) · **84.8069%** (worst play) |
| Top pay | 20× (six right calls), 1 in 159.9 games |
| Rounding | None at any bet: every base pay is whole cents on the $0.10 grid; doubles are exact |
| DOUBLE OR NOTHING | Win chance 1/2 exactly, **100.0000%** |
| Whole round, any bar policy | Same as the base game (every bar action is a fair bet; nothing is clipped) |
| MAX WIN | 20,000× the bet |
| Bets | $1.00 – $100.00 in $0.10 steps |

Kicks is a skill game: the certified figure is best play, and the rules sheet shows all four ways of calling. The shoe (112 cards, 2 decks) is dealt without replacement and shuffled every game, so card counting is part of best play. The rules sheet's one-sentence description of best play, played literally, returns the exact best-play RTP.

### Build under test

| File | sha256 |
|---|---|
| `builds-final/card-run-kicks-classic-launch.html` | `f4592849c5f06a8f3b9c63d495caa02fb7fdebe13a645bce0c609cc819654e26` |

`run-bar.js` v170 is embedded byte for byte in the Kicks build (hashes under Blackjack above).

### Reproducing the results

Requirements: Python 3 (standard library only) and Node ≥ 18, no network. `exact_kicks.py` parses every constant and code shape from the build text and stops if one differs; it needs about 1 GB of RAM.

```sh
cd kicks
python3 -I exact_kicks.py                        # exact math -> out/exact.json (~12 min; run under ulimit -v 3500000)
node sheet_strategy.js > out/sheet_strategy.txt  # the rules-sheet description of best play, evaluated exactly
./run_sims.sh 1                                  # 70 simulation jobs of 50,000 rounds, ~45 min
./run_small_p4.sh 1                              # the $1 check for P4 -> out/small/
python3 -I merge.py                              # CI checks, results.json, par.txt
```

---

## Crash 20× — start here

| File | What it is |
|---|---|
| [`crash/CRASH-MATH.pdf`](crash/CRASH-MATH.pdf) | The math document, formatted (14 pages) |
| [`crash/CRASH-MATH.md`](crash/CRASH-MATH.md) | The same document in Markdown (`.docx` also provided) |
| [`crash/par.txt`](crash/par.txt) | Plain-text PAR sheet (every table, including the LOCK IN offer at every small amount) |
| [`crash/results.json`](crash/results.json) | Every headline number and CI check as data |
| [`crash/README.txt`](crash/README.txt) | Every script, command and seed |
| [`crash/PACK-README.txt`](crash/PACK-README.txt) | The math pack's cover note |
| [`crash/out/`](crash/out/) | Raw solver and simulation outputs |

### Headline figures (exact)

| Item | Value |
|---|---|
| Base game RTP, every stop | **93.0000%** before rounding (0.93 × 1.2^(j−1) × (5/6)^(j−1)) |
| Lowest stop after cent rounding: $1 / $10 / $100 | 92.3611% / 92.9677% / 92.9977% |
| Lowest anywhere on the $0.10 bet grid | **92.3077%** ($1.30, lock in at red #1) |
| Top pay, paid in full | Red #18 = 20.6331×, 1 in 22.186 builds |
| DOUBLE OR NOTHING, played out | First to three reds v three blacks, exactly 1/2, **100.0000%** |
| DOUBLE OR NOTHING with LOCK IN | Offer = floor(fair value), so ≤ fair: lowest 99.50% at $1.00 and up; 75.00% at a $0.02 hold |
| Whole round, any bar policy | Never above the base RTP (equal unless a LOCK IN offer is taken) |
| MAX WIN | 20,000× the bet |
| Bets | $1.00 – $100.00 in $0.10 steps |

Crash has one decision (when to lock in) and it changes the volatility only. **Server note:** every card must be an independent draw from the 8-deck shoe (with replacement); dealing without replacement changes the math (`VERIFICATION.md` §3, open item #24). **Open item for a decision:** at a held $0.02 or $0.03 the race's LOCK IN offer at a 0–2 score is $0.00 (`CRASH-MATH.md`, open item 1).

### Build under test

| File | sha256 |
|---|---|
| `builds-final/card-run-crash-classic-launch.html` | `123d6bced443c4c42038569cbc107af207b3dc49ed6bef05fcb621bf6adaa075` |

`run-bar.js` v170 is embedded byte for byte in the Crash build (hashes under Blackjack above).

### Reproducing the results

Requirements: Python 3 (standard library only) and Node ≥ 18, no network. `exact.py` parses every money constant from the build text with patterns that must match exactly once and stops if one differs.

```sh
cd crash
./run_all.sh     # build hash, exact math, every simulation chunk, results.json and par.txt (~6 min)
```

The same-seed comparison with the previous run (`compare_prev.py`) needs that run's outputs, which are not in this repository; `run_all.sh` skips it when they are absent.

---

## Repository layout

```
README.md            this file
CHANGELOG.md         what each delivery contains, rule changes carried, open items, pre-repo build history
VERIFICATION.md      verification guide: scope, platform rules, RNG, run bar, checklist (covers all four games)
blackjack/           Blackjack 20× math pack: document, PAR sheet, solvers, simulators, raw outputs
mines/               Mines 20× math pack: document, PAR sheet, solver, simulators, raw outputs
kicks/               Kicks 20× math pack: document, PAR sheet, solver, simulators, raw outputs
crash/               Crash 20× math pack: document, PAR sheet, solver, simulators, raw outputs
builds-final/        the four client builds under test, by hash
shared/              run-bar.js, run-bar.test.js, rules-sheet.js (embedded in every build)
```

## Out of scope

- The production RNG and server-side outcome determination. The builds draw outcomes in the client with `crypto.getRandomValues` (rejection sampling, no `Math.random` fallback); production replaces `rngU32` (Blackjack and Mines), `rnd` (Kicks) and `rand32` (Crash) with the platform RNG, certified separately.
- See `VERIFICATION.md` §9 for the open items and their owners.
