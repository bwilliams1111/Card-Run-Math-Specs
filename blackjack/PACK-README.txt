CARD RUN BLACKJACK 20x - MATH PACK FOR THE CERTIFICATION LAB   (16 Oct 2026)
==========================================================================
Build: builds-final/card-run-blackjack-classic-launch.html
       sha256 381595b2ec0103398f92886e7429afc9624c3a53d6e68ebcd7e86fde01f2708c   131,176 bytes   (run-bar v170)

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
  (full list with timings and seeds in blackjack/README.txt)
The compiled optimum solver and the three optimal-policy tables (out/bar_policy_exact_*.bin, 44 MB) are left out of the zip; blackjack/README.txt says how to regenerate them.
