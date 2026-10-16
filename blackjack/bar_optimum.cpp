// Exact optimum over ALL run-bar policies (CASH OUT / DOUBLE OR NOTHING / DOUBLE HALF) for an ammo of A cents (integrates minrun/bar_optimum_draft.cpp).
//
// Why: since the dealer stands on all 17s in DOUBLE OR NOTHING, a double wins with p = 0.50045487... > 1/2, so each double is a +0.091% bet and cashing
// out no longer bounds every bar policy. The bar is a slightly favourable betting game with a cap; this program solves it as an MDP.
//
// State (S held, B bank) in whole cents, ammo A (the base round's first win), run cap CAP = RUN_CAP_X * A, MAX WIN MW (cents, default none):
//   the round ends, paying B + S in full, when B + S >= CAP (or >= MW; the pay is min(B + S, MW));
//   CASH OUT (any time): pays B + S;
//   DOUBLE OR NOTHING offered iff S >= MIN (2c) and B + 2S <= MW:     win (p): held 2S, bank B      lose (1-p): bank returns as the held amount (held B, bank 0); B = 0: the round ends with 0
//   DOUBLE HALF offered iff half = floor(S/2) >= MIN and B + keep + 2 half <= MW, keep = S - half goes to the bank:
//                                                                      win: held 2 half, bank B + keep;   lose: held B + keep, bank 0 (always > 0: keep >= 1)
// The program asserts none of the build's text itself: bar_optimum_run.js reads MIN, RUN_CAP_X, MAX_WIN_X and p from the build / rungame.js, asserts the
// build's offer fragments (consts.js) and compares this program's offers (mode "check") with RunBar.compute() of run-bar v170 on random and edge states.
//
// Usage:
//   ./bar_optimum solve A_cents p [MIN=2] [MW=0 (none)] [policyOut=-] [verbose=0]    value iteration (Gauss-Seidel, relative 1e-13) over the reachable states
//   ./bar_optimum check < "S B A MW" lines                                          offers and transitions for each line (for the run-bar comparison)
// solve prints one JSON line: A, p, states, iterations, V*(A) (cents) and V*/A, the optimal action at the start, the values of the policies
// "always DOUBLE while offered" (P3), "always DOUBLE HALF while offered" and CASH OUT, the largest V*/(S+B) over all states (bound for cut paths),
// and the first states of the search with their values and optimal actions. policyOut = a binary file of (S int32, B int32, action uint8) records
// (action 0 CASH OUT, 1 DOUBLE, 2 DOUBLE HALF) for the simulation checks.
#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
typedef unsigned long long ull;

static ll CAPX = 1000;   // RUN_CAP_X: set from the build by bar_optimum_run.js (environment BAR_CAPX)

struct Offers { bool term; bool dbl; bool half; ll halfAmt, keep; };
static Offers offers(ll S, ll B, ll cap, ll MW, ll MIN) {
  Offers o{false, false, false, S / 2, S - S / 2};
  ll T = S + B;
  if (T >= cap || T >= MW) { o.term = true; return o; }
  o.dbl = (S >= MIN && B + 2 * S <= MW);
  o.half = (o.halfAmt >= MIN && B + o.keep + 2 * o.halfAmt <= MW);
  return o;
}

struct Table {   // open addressing, int32 slots into the state arrays
  vector<int> slot; ull mask = 0; size_t n = 0;
  vector<int> *SS, *BB;
  static ull h(ull k) { k ^= k >> 33; k *= 0xff51afd7ed558ccdULL; k ^= k >> 33; k *= 0xc4ceb9fe1a85ec53ULL; k ^= k >> 33; return k; }
  void init(size_t cap) { size_t c = 1; while (c < cap) c <<= 1; slot.assign(c, -1); mask = c - 1; }
  void grow() { size_t c = slot.size() * 2; slot.assign(c, -1); mask = c - 1; for (size_t i = 0; i < n; i++) { ull k = ((ull)(*SS)[i] << 32) | (ull)(*BB)[i]; ull j = h(k) & mask; while (slot[j] >= 0) j = (j + 1) & mask; slot[j] = (int)i; } }
  int get(int S, int B) {   // returns the index, adding the state when new
    ull k = ((ull)S << 32) | (ull)B; ull j = h(k) & mask;
    while (slot[j] >= 0) { int i = slot[j]; if ((*SS)[i] == S && (*BB)[i] == B) return i; j = (j + 1) & mask; }
    int i = (int)n; slot[j] = i; SS->push_back(S); BB->push_back(B); n++;
    if (n * 2 > slot.size()) grow();
    return i;
  }
};

int main(int argc, char** argv) {
  string mode = argc > 1 ? argv[1] : "";
  if (getenv("BAR_CAPX")) CAPX = atoll(getenv("BAR_CAPX"));
  if (mode == "check") {
    ll S, B, A, MW; ll MIN = getenv("BAR_MIN") ? atoll(getenv("BAR_MIN")) : 2;   // BAR_MIN is only set to test a mutated offer rule
    while (scanf("%lld %lld %lld %lld", &S, &B, &A, &MW) == 4) {
      ll cap = CAPX * A; if (B + S > MW) S = MW - B;   // MAX WIN clips the held amount (showControls)
      Offers o = offers(S, B, cap, MW, MIN);
      printf("%d %d %d %lld %lld\n", o.term ? 1 : 0, o.dbl ? 1 : 0, o.half ? 1 : 0, o.halfAmt, o.keep);
    }
    return 0;
  }
  if (mode != "solve" || argc < 4) { fprintf(stderr, "usage: bar_optimum solve A_cents p [MIN=2] [MW=0] [policyOut=-] [verbose=0]\n"); return 2; }
  ll A = atoll(argv[2]); double p = strtod(argv[3], nullptr); ll MIN = argc > 4 ? atoll(argv[4]) : 2; ll MWarg = argc > 5 ? atoll(argv[5]) : 0;
  const char* polOut = argc > 6 ? argv[6] : "-"; int verbose = argc > 7 ? atoi(argv[7]) : 0;
  ll MW = MWarg > 0 ? MWarg : (ll)4e18; double q = 1 - p; ll cap = CAPX * A;
  vector<int> SS, BB; Table tb; tb.SS = &SS; tb.BB = &BB; tb.init(1 << 16);
  vector<array<int, 4>> nx;   // fullWin, fullLose (-1 = the round ends with 0), halfWin, halfLose; -2 = not offered
  vector<char> term;
  tb.get((int)A, 0);
  for (size_t i = 0; i < SS.size(); i++) {
    ll S = SS[i], B = BB[i]; array<int, 4> a = {-2, -2, -2, -2};
    Offers o = offers(S, B, cap, MW, MIN);
    if (o.term) { term.push_back(1); nx.push_back(a); continue; }
    term.push_back(0);
    if (o.dbl) { a[0] = tb.get((int)(2 * S), (int)B); a[1] = B > 0 ? tb.get((int)B, 0) : -1; }
    if (o.half) { a[2] = tb.get((int)(2 * o.halfAmt), (int)(B + o.keep)); a[3] = tb.get((int)(B + o.keep), 0); }
    nx.push_back(a);
  }
  size_t N = SS.size(); { vector<int>().swap(tb.slot); }
  vector<double> V(N);
  for (size_t i = 0; i < N; i++) V[i] = (double)min<ll>((ll)SS[i] + BB[i], MW);   // terminal value min(S + B, MW); start every state at its cash-out value (a lower bound)
  auto sweep = [&](vector<double>& W, int policy) {   // one Gauss-Seidel sweep (reverse discovery order: fastest of the orders tried; alternating directions needed 45% more sweeps), returns the largest relative change. policy -1 optimal, 0 cash out, 1 always DOUBLE, 2 always DOUBLE HALF
    double maxd = 0;
    for (size_t ii = 0; ii < N; ii++) { size_t i = N - 1 - ii; if (term[i]) continue;
      auto& a = nx[i]; double T = (double)SS[i] + BB[i], best = T;
      double vd = a[0] != -2 ? p * W[a[0]] + q * (a[1] >= 0 ? W[a[1]] : 0.0) : -1;
      double vh = a[2] != -2 ? p * W[a[2]] + q * W[a[3]] : -1;
      double nv;
      if (policy < 0) { nv = max(best, max(vd, vh)); }
      else if (policy == 0) nv = best;
      else if (policy == 1) nv = a[0] != -2 ? vd : best;
      else nv = a[2] != -2 ? vh : best;
      maxd = max(maxd, fabs(nv - W[i]) / T); W[i] = nv; }
    return maxd; };
  double maxd = 1; int it = 0;
  while (maxd > 1e-13 && it < 200000) { maxd = sweep(V, -1); it++; }
  // policy extraction (an action is CASH OUT only if it is strictly better by 1e-12 relative; ties go to DOUBLE, then DOUBLE HALF)
  vector<unsigned char> act(N, 0);
  size_t nAct[3] = {0, 0, 0}, nTerm = 0;
  for (size_t i = 0; i < N; i++) { if (term[i]) { nTerm++; continue; } auto& a = nx[i]; double T = (double)SS[i] + BB[i];
    double vd = a[0] != -2 ? p * V[a[0]] + q * (a[1] >= 0 ? V[a[1]] : 0.0) : -1, vh = a[2] != -2 ? p * V[a[2]] + q * V[a[3]] : -1;
    double best = T; int ac = 0; double tol = 1e-12 * T;
    if (vd > best + tol) { best = vd; ac = 1; }
    if (vh > best + tol) { best = vh; ac = 2; }
    // finer tie rule between the two bets
    if (ac == 2 && vd >= vh - tol) ac = 1;
    act[i] = (unsigned char)ac; nAct[ac]++; }
  // values of fixed policies on the same graph
  double v3 = 0, vh = 0; int i3 = 0, ih = 0;
  { vector<double> W(N); for (size_t i = 0; i < N; i++) W[i] = (double)min<ll>((ll)SS[i] + BB[i], MW);
    double m = 1; while (m > 1e-13 && i3 < 200000) { m = sweep(W, 1); i3++; } v3 = W[0];
    for (size_t i = 0; i < N; i++) W[i] = (double)min<ll>((ll)SS[i] + BB[i], MW);
    m = 1; while (m > 1e-13 && ih < 200000) { m = sweep(W, 2); ih++; } vh = W[0]; }
  // largest ratio over all states and the first-level policy picture
  double maxRatio = 0, minRatio = 1e9; size_t argmax = 0;
  for (size_t i = 0; i < N; i++) { double T = (double)SS[i] + BB[i]; double r = V[i] / T; if (r > maxRatio) { maxRatio = r; argmax = i; } if (r < minRatio) minRatio = r; }
  // how often the start-reachable policy uses each button, weighted by the probability of visiting under the optimal policy (forward mass, a few sweeps are not needed:
  // reported instead as state counts by action)
  printf("{\"A\":%lld,\"p\":%.17g,\"MIN\":%lld,\"MW\":%lld,\"states\":%zu,\"terminal\":%zu,\"iterations\":%d,\"residual\":%.3g,\"V\":%.12f,\"VoverA\":%.12f,"
         "\"startAction\":%d,\"P3VoverA\":%.12f,\"P3iterations\":%d,\"alwaysHalfVoverA\":%.12f,\"alwaysHalfIterations\":%d,\"maxVoverTotal\":%.12f,\"maxVoverTotalAt\":[%d,%d],\"minVoverTotal\":%.12f,"
         "\"actionCounts\":{\"cashOut\":%zu,\"double\":%zu,\"doubleHalf\":%zu},\"first\":[",
         A, p, MIN, MWarg, N, nTerm, it, maxd, V[0], V[0] / A, (int)act[0], v3 / A, i3, vh / A, ih, maxRatio, SS[argmax], BB[argmax], minRatio, nAct[0], nAct[1], nAct[2]);
  size_t K = min<size_t>(N, verbose ? 40 : 12);
  for (size_t i = 0; i < K; i++) { printf("%s{\"S\":%d,\"B\":%d,\"V\":%.9f,\"ratio\":%.9f,\"action\":%d,\"term\":%d}", i ? "," : "", SS[i], BB[i], V[i], V[i] / ((double)SS[i] + BB[i]), (int)act[i], (int)term[i]); }
  printf("]}\n");
  if (strcmp(polOut, "-") != 0) { FILE* f = fopen(polOut, "wb"); for (size_t i = 0; i < N; i++) { int32_t s = SS[i], b = BB[i]; fwrite(&s, 4, 1, f); fwrite(&b, 4, 1, f); fwrite(&act[i], 1, 1, f); } fclose(f); }
  return 0;
}
