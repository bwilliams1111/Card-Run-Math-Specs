CARD RUN MINES 20x - MATH PACK FOR THE CERTIFICATION LAB   (16 Oct 2026)
=======================================================================
Build: builds-final/card-run-mines-classic-launch.html
       sha256 2f73b626f7889810d499dbb863632ff42645ff6c6300f3b8f3b47a0b24974426   152,362 bytes   (run-bar v170)

START HERE
  MINES-MATH.pdf         the math document, formatted (CARD-RUN-MINES-20X-MATH-PACK.pdf, 14 pages; same content as the Docs version)
  MINES-MATH.md          the same document in markdown (MINES-MATH.docx = the same text for Word)
  mines/par.txt          plain-text PAR sheet (every table)
  mines/results.json     every number as data
  mines/README.txt       every script, command and seed

HEADLINE
  Base game returns exactly 93.0000% before rounding at every stop and every bomb count (lowest after cent rounding on the $0.10 grid: 92.3636%).
  DOUBLE OR NOTHING wins with probability C(19,6)/C(21,6) = 1/2 exactly, so it returns 100.0000%.
  Every bar action is a fair bet and nothing is ever clipped, so every bar policy returns what cashing out returns: there is no worst case above the base RTP.
  There is no rule change in this build; the pack was re-run on this exact build.

REPRODUCE (from mines/; Python 3 standard library and Node 18+; scripts read ../builds-final/ and ../shared/)
  python3 -I exact.py > out/exact.txt
  node -r ./seedcrypto.js xcheck.js > out/xcheck.log
  ./run_sims.sh 1            (74 chunks, about 1 h 30 min)
  python3 -I summarize.py > out/summary.txt
