CARD RUN BLACKJACK 20x - MATH PACK FOR THE CERTIFICATION LAB   (16 Oct 2026, updated 28 Oct 2026: DOUBLE HALF limit)
==========================================================================
Build: builds-final/card-run-blackjack-classic-launch.html
       sha256 381595b2ec0103398f92886e7429afc9624c3a53d6e68ebcd7e86fde01f2708c   131,176 bytes   (run-bar v170)

UPDATE 28 OCT 2026 - DOUBLE HALF LIMITED TO 50 PRESSES A ROUND (rule R50)
  The math document (BLACKJACK-MATH.pdf / .md / .docx, new section 6.5) now carries the limit: DOUBLE HALF is offered only while fewer than 50 DOUBLE HALF presses have been made in the round (a press counts
  when made, win or lose; the count never resets; DOUBLE OR NOTHING and CASH OUT are never limited). With the limit the best possible bar play returns 1.02586 x the first win for every first win from 50 cents up,
  and the whole round at most 96.81% (upper bound 96.812%), against 97.49% with no limit; both under 100%. The board, the double hand and the named policies are unchanged.
  THE BUILD IN THIS PACK (sha256 381595b2...) DOES NOT CONTAIN THE LIMIT: it describes the rule and its exact maths, not a shipped game. Open items 7-10 of the Docs version (8-11 in the md) say what the build needs.
  New files: blackjack/bar_optimum_cap.cpp, bar_optimum_cap_run.js, bar_cap_check.js, run_bar_cap.sh, cap_report.js; results in blackjack/out/bar_cap_*.json, cap50.json, CAP50_report.txt.

START HERE
  BLACKJACK-MATH.pdf     the math document, formatted (the same content as the Docs version)
  BLACKJACK-MATH.md      the same document in markdown (BLACKJACK-MATH.docx = the same text for Word)
  blackjack/par.txt      plain-text PAR sheet (every table)
  blackjack/results.json every number as data
  blackjack/README.txt   every script, command and seed
  blackjack/out/CR_report.txt   the change request's report-back block, filled in

WHAT IS NEW IN THIS BUILD
  In DOUBLE OR NOTHING the dealer now stands on all 17s. The double returns 100.0910% at best play and 100.0721% at basic strategy
  (it returned 99.9077% / 99.8981% when the dealer hit soft 17). The base game is unchanged (94.368% best play, 93.448% rules-sheet basic,
  81.95% worst play). Because the double now has an edge, cashing out no longer bounds the run bar: the exact optimum over every possible
  bar policy returns about 97.49% per round (upper bound 97.489%), still under 100%. The change request's 94.4% worst case covers only
  the always-double policy.

REPRODUCE (from blackjack/; Node 18+, g++ for the optimum; every script reads ../builds-final/ and ../shared/)
  node consts.js ; node exact_board.js ; node rungame.js ; node exact_runs.js ; node runbar_diff.js
  ./run_sims.sh 1 ; ./run_double_sims.sh 1 ; ./run_bar_optimum.sh ; ./run_post.sh ; node round_worst.js ; node aggregate.js
  ./run_bar_cap.sh > out/bar_cap.log ; node cap_report.js 50      (the DOUBLE HALF limit, about 25 minutes)
  (full list with timings and seeds in blackjack/README.txt)
The compiled optimum solver and the three optimal-policy tables (out/bar_policy_exact_*.bin, 44 MB) are left out of the zip; blackjack/README.txt says how to regenerate them.
