# Card Run — Math Specifications

Math specifications, exact solvers, simulation evidence and PAR sheets for the **Card Run 20×** game family, prepared for EvenBet and the certification lab.

| Game | Status | Folder |
|---|---|---|
| **Blackjack 20×** | **Delivered** (16 Oct 2026, run-bar v170) | [`blackjack/`](blackjack/) |
| **Mines 20×** | **Delivered** (16 Oct 2026, run-bar v170) | [`mines/`](mines/) |
| Crash 20× | Pending | — |
| Kicks 20× | Pending | — |

The remaining two games will be added to this repository as their math packs are completed. The platform rules shared by all four games (bets, rounding, MAX WIN, the run bar, RNG) are already described in [`VERIFICATION.md`](VERIFICATION.md).

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
| [`blackjack/out/`](blackjack/out/) | Raw solver and simulation outputs, screenshots |

### Headline figures (exact)

| Item | Value |
|---|---|
| Base game RTP, best play | **94.368%** |
| Base game RTP, rules-sheet basic play | 93.448% |
| Base game RTP, worst play | 81.950% |
| Base game top pay | 20× the bet, 1 in 209,049 rounds |
| DOUBLE OR NOTHING, best play / basic strategy | **100.0910% / 100.0721%** (dealer stands on all 17s) |
| Whole round, best possible bar play (exact optimum) | **≈ 97.49%** (upper bound 97.489%) |
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
./run_post.sh
node round_worst.js ; node aggregate.js ; node cr_report.js
```

Full command list, timings and every seed: `blackjack/README.txt`. The compiled solver (`blackjack/bar_optimum`) and the 44 MB optimal-policy tables (`blackjack/out/bar_policy_exact_*.bin`) are regenerated locally and are not committed (see `.gitignore`).

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

## Repository layout

```
README.md            this file
VERIFICATION.md      verification guide: scope, platform rules, RNG, run bar, checklist (covers all four games)
blackjack/           Blackjack 20× math pack: document, PAR sheet, solvers, simulators, raw outputs
mines/               Mines 20× math pack: document, PAR sheet, solver, simulators, raw outputs
builds-final/        the client build(s) under test, by hash
shared/              run-bar.js, run-bar.test.js, rules-sheet.js (embedded in every build)
```

## Out of scope

- The production RNG and server-side outcome determination. The builds draw outcomes in the client with `crypto.getRandomValues` (rejection sampling, no `Math.random` fallback); production replaces `rngU32` (Blackjack and Mines) with the platform RNG, certified separately.
- See `VERIFICATION.md` §9 for the open items and their owners.
