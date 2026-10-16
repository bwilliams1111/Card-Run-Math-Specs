CARD RUN CRASH 20x - MATH PACK FOR THE CERTIFICATION LAB   (16 Oct 2026)
=======================================================================
Build: builds-final/card-run-crash-classic-launch.html
       sha256 123d6bced443c4c42038569cbc107af207b3dc49ed6bef05fcb621bf6adaa075   137,528 bytes   (run-bar v170)

START HERE
  CRASH-MATH.pdf         the math document, formatted (14 pages; the same content as the Docs version)
  CRASH-MATH.md          the same document in markdown (CRASH-MATH.docx = the same text for Word)
  crash/par.txt          plain-text PAR sheet (every table, including the LOCK IN offer at every small amount)
  crash/results.json     every number as data
  crash/README.txt       every script, command and seed

HEADLINE
  Every stop returns exactly 93.0000% before rounding (0.93 x 1.2^(j-1) x (5/6)^(j-1)); after the cent floor the lowest is 92.3077% ($1.30, red #1).
  Top pay red #18 = 20.6331x, 1 in 22.186 builds. No stop and no run-bar policy returns more than 93.0000%.
  DOUBLE OR NOTHING played out is exactly 1/2 (100.0000%). Its LOCK IN offers are floor(fair value): lowest 99.50% at $1.00 and up,
  75.00% at a held $0.02; at a held $0.02 or $0.03 the offer at a 0-2 score is $0.00 (open item for a decision in the document).
  There is no rule change in this build; the pack was re-run on this exact build (105 checks, 104 inside, the one miss resolved with follow-up seeds).

REPRODUCE (from crash/; Python 3 standard library and Node 18+; scripts read ../builds-final/ and ../shared/)
  ./run_all.sh     (exact math, every simulation chunk, the comparison, results.json and par.txt; details and seeds in crash/README.txt)
  The same-seed comparison needs the previous run's outputs, which are not in this zip; run_all.sh skips it when they are absent.
