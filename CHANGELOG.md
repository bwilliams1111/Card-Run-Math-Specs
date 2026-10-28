# Changelog

All notable changes to the Card Run math specifications in this repository. Dates are the date of the math pack, not the commit. Every pack in a given entry was run in full on the build whose hash it names.

## 2026-10-28 — Blackjack: DOUBLE HALF limited to 50 presses a round (rule R50)

Replacement files from `blackjack-cap-update.zip`. The Blackjack build, `shared/`, and the Crash, Kicks and Mines packs are unchanged.

### Changed

- **Blackjack 20×** (`blackjack/`) — `BLACKJACK-MATH.pdf/.md/.docx` gain section 6.5 and an updated section 5, summary and open items; `README.txt` and `PACK-README.txt` updated.
  **Rule R50:** DOUBLE HALF is offered only while fewer than 50 DOUBLE HALF presses have been made in the round. A press counts when made, win or lose; the count starts at 0 with the first win, never resets (not on a lost double, a RUN BANK return, a reload or a reconnect) and is part of the stored round state. DOUBLE OR NOTHING and CASH OUT are never limited.
  **Result:** the best possible bar play returns 1.02586 × the first win for every first win from 50 cents up (λ₅₀(∞) = 1.02586 ± 0.00003), so a whole round returns at most **96.81%** (upper bound 96.812%), against 97.49% with no limit. Margin to 100% rises from 2.5 to 3.2 points. Board, double hand and policies P0, P2, P3, P5 are unchanged; P4 changes by less than 2⁻⁵⁰. Sections 6.3–6.4 (no limit) stay as the reference the limited optimum converges to.
- `VERIFICATION.md` — update note at the top; §5.5 policy table now leads with the R50 optimum (96.81%) and keeps the unlimited 97.49% as reference; §8 items 3 and 9 updated; new §8 item 10.
- `README.md` — Blackjack headline figures, four-game table and reproduce commands updated; `.gitignore` adds the compiled `bar_optimum_cap`.

### Added

- `blackjack/bar_optimum_cap.cpp`, `bar_optimum_cap_run.js`, `bar_cap_check.js`, `run_bar_cap.sh`, `cap_report.js` — exact layer-by-layer solver over the number of presses left (each layer acyclic, solved in one pass with no tolerance); it equals an independent recursion on run-bar v170 to 5e-13 and converges to the unlimited optimum to 1e-12.
- `blackjack/out/bar_cap_*.json/.log`, `cap50.json`, `CAP50_report.txt` — results for every limit N = 0…100 at twelve first-win sizes (5c–300c).

### Open items added

| Ref | Item | Owner |
|---|---|---|
| — | **Rule R50 is not in build `381595b2…`.** Add the per-round DOUBLE HALF press counter to the Blackjack build and `run-bar.js`, extend `consts.js` and `runbar_diff.js`, regenerate the Blackjack pack for the new hash (`BLACKJACK-MATH.md` §10, `VERIFICATION.md` §8 item 10) | Production |

---

## 2026-10-16 — run-bar v170: initial delivery, all four games

Four commits, one per game, in the order the packs were completed.

### Added

- **Blackjack 20×** (`blackjack/`, commit `081a8c9`) — build `card-run-blackjack-classic-launch.html` sha256 `381595b2…2708c`.
  Base game 94.368% best play / 93.448% rules-sheet basic / 81.950% worst. DOUBLE OR NOTHING 100.0910% (best play) to 100.0721% (basic strategy). Exact optimum over every bar policy ≈ 97.49% per round (upper bound 97.489%).
- **Mines 20×** (`mines/`, commit `88f4d9b`) — build `card-run-mines-classic-launch.html` sha256 `2f73b626…4426`.
  93.0000% at every stop and bomb count before rounding; lowest on the grid 92.3636%. Double exactly 1/2. Every bar policy returns the base RTP.
- **Kicks 20×** (`kicks/`, commit `b325c27`) — build `card-run-kicks-classic-launch.html` sha256 `f4592849…54e26`.
  92.9666% best play / 92.5067% shoe count / 90.5795% random / 84.8069% worst; no rounding at any bet. Double exactly 1/2. Every bar policy returns the base RTP. New in this pack: `sheet_strategy.js`, which plays the rules sheet's description of best play literally and reproduces the best-play RTP to 1e-12.
- **Crash 20×** (`crash/`, commit `75acfd5`) — build `card-run-crash-classic-launch.html` sha256 `123d6bce…a075`.
  93.0000% at every stop before rounding; lowest on the grid 92.3077%. Double exactly 1/2 played out; LOCK IN offers are floor(fair value), so ≤ fair. No bar policy exceeds the base RTP.
- `VERIFICATION.md` — the cross-game verification guide (scope, hashes, RNG, platform rules, run bar, checklist, open items).
- `builds-final/` — the four client builds under test; `shared/` — `run-bar.js` v170, `run-bar.test.js` (18 checks), `rules-sheet.js`. All seven hashes equal `VERIFICATION.md` §2.
- `README.md` — index, headline figures and reproduce commands for every game.

### Game-rule changes carried by this delivery (relative to the v169 builds of 15 Oct)

- **All games:** RUN IT AGAIN and RUN HALF removed from the run bar for certification. The bar is CASH OUT, DOUBLE OR NOTHING and DOUBLE HALF, with the RUN BANK. No multiplier k exists any more and every double is a whole-cent 2×. Base games are unchanged; the base simulation chunks reproduce the v169 outputs round for round on the same seeds.
- **Blackjack:** the dealer stands on all 17s in the DOUBLE OR NOTHING hand (it hit soft 17 before). The double moves from 99.9077% to 100.0910% at best play. The earlier contract "each game's double returns at most 100%" is withdrawn for Blackjack; the whole round stays under 100% under every possible bar play (exact optimum ≈ 97.49%). The change request's 94.4% worst case is superseded by 97.49%.
- **Simulation policies:** P1 (RUN IT AGAIN once) retired; P5 redefined as DOUBLE HALF once (it was RUN HALF once). P4 (random button) re-run everywhere because the random player now has fewer buttons.

### Open items carried into this delivery

| Ref | Item | Owner |
|---|---|---|
| #3 | Platform RNG and server-side outcome determination (replace `rngU32` / `rand32` / `rnd`) | Production |
| #24 | Crash server spec: every card an independent draw from the 8-deck shoe (with replacement) | Production |
| #17 | §12 tests 1–17: definitions to be supplied, or declared out of scope | Product |
| — | Crash: LOCK IN offer of $0.00 at a held $0.02 or $0.03 at a 0–2 score — hide the button or floor the offer at $0.01 | Product |
| — | Mines: "×NaN" in the NEXT strip past the top pick with 2–4 live bombs (display only, no effect on any pay); fix `if (k > G.top) break;` not applied | Product |
| — | Kicks: stale source comment "main pays 25.7%" (exact 26.16%); comment only | Product |
| — | Rules sheets: one-decimal RTPs (Blackjack double reads 100.1%; Kicks best play reads 93.0% for 92.9666%; Mines/Crash grid lows cut to 92.3%) — confirm or request two decimals | Product |

---

## Build history before this repository (for readers of earlier drafts)

These versions were never committed here; they are recorded so the figures in older documents can be placed.

- **v169 — 2026-10-15.** Minimum run returned to $0.02 (v168 had $1.00, which stopped every win under $1 from doubling or halving). Blackjack's double still had the dealer hitting soft 17: 99.9077% best play, 99.8981% basic strategy. Bar included RUN IT AGAIN and RUN HALF.
- **v168 — 2026-10-14.** Minimum run $1.00. Mines re-worked in full on this date: the top pick is now paid in full (it had been clipped to 20×, returning 66.67–80.00% at that pick); pays moved from floating point to integer cents (the float code missed the 20× stop on 79 of the 991 grid bets); MAX BUILD now shows the top pick's pay for the chosen bomb count. Provisional Mines build `958eb023…f61c` superseded.
