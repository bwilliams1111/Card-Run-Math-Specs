CARD RUN KICKS 20x - MATH PACK FOR THE CERTIFICATION LAB   (16 Oct 2026)
=======================================================================
Build: builds-final/card-run-kicks-classic-launch.html
       sha256 f4592849c5f06a8f3b9c63d495caa02fb7fdebe13a645bce0c609cc819654e26   147,720 bytes   (run-bar v170)

START HERE
  KICKS-MATH.pdf         the math document, formatted (12 pages; the same content as the Docs version)
  KICKS-MATH.md          the same document in markdown (KICKS-MATH.docx = the same text for Word)
  kicks/par.txt          plain-text PAR sheet (every table)
  kicks/results.json     every number as data
  kicks/README.txt       every script, command and seed
  kicks/out/sheet_strategy.txt   the rules sheet's description of best play, evaluated exactly (new with this pack)

HEADLINE
  Base game returns 92.9666% at best play (92.5067% calling the side with more cards left, 90.5795% random, 84.8069% worst play);
  no rounding at any bet. DOUBLE OR NOTHING wins with probability exactly 1/2, so it returns 100.0000%.
  Every bar action is a fair bet and nothing is ever clipped, so every bar policy returns the base RTP (there is no worst case above it).
  The rules sheet's sentence on how to play best is true: followed literally it returns the exact best-play RTP (92.9666%).
  There is no rule change in this build; the pack was re-run on this exact build (27 of 27 checks inside their 95% interval).

REPRODUCE (from kicks/; Python 3 standard library and Node 18+; scripts read ../builds-final/ and ../shared/)
  python3 -I exact_kicks.py                        (about 12 min; under 1 GB; run under ulimit -v 3500000)
  node sheet_strategy.js > out/sheet_strategy.txt
  ./run_sims.sh 1                                  (70 jobs of 50,000 rounds, about 45 min)
  ./run_small_p4.sh 1
  python3 -I merge.py
  (full list with seeds in kicks/README.txt)
