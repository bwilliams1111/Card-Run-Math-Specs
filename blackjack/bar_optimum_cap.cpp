// Exact optimum over ALL run-bar policies when DOUBLE HALF may be pressed at most N times in a run (the "partial double cap").
// Companion of bar_optimum.cpp (same state space, same offers, same transitions); this program adds the counter and solves it exactly, layer by layer.
//
// Rule being solved (the cap): DOUBLE HALF is offered only while fewer than N DOUBLE HALF presses have been made in the run; a press counts whether the double wins or loses.
//   DOUBLE OR NOTHING and CASH OUT are never limited. N = 0 is "no DOUBLE HALF at all". The counter restarts at 0 with every round (the run starts at the first win).
//
// Why layers: write V_r(S, B) for the best expected final payout with r DOUBLE HALF presses still allowed.
//   DOUBLE OR NOTHING stays in layer r:   win (p) -> (2S, B)           lose (1-p) -> (B, 0)  (the RUN BANK comes back as the held amount; B = 0: the round ends with nothing)
//   DOUBLE HALF goes down one layer:      win (p) -> (2 half, B + keep) lose      -> (B + keep, 0), both in layer r-1
//   Inside one layer the state graph has no cycle (a full double either raises S with B fixed, or lands on a state with an empty bank, and from an empty bank
//   it only ever raises S or ends), so each layer is ONE pass in the order (empty-bank states first, larger S first): no iteration, no tolerance, the value is exact up to
//   floating point. Layer 0 is the bar with DOUBLE OR NOTHING and CASH OUT only; V_r(start) for r = 0..Nmax is the optimum with the cap r, so one run gives the whole curve.
//   (The uncapped optimum of bar_optimum.cpp is the limit r -> infinity; the program prints the change from layer to layer so the convergence is visible.)
//
// State (S held, B bank) in whole cents, ammo A (the base round's first win), run cap CAP = RUN_CAP_X * A, MAX WIN MW (cents, default none): as in bar_optimum.cpp.
//
// Usage:  ./bar_optimum_cap solve A_cents p Nmax [MIN=2] [MW=0 (none)]      prints one JSON line: A, p, states, V_r(start) and V_r/A for r = 0..Nmax
#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
typedef unsigned long long ull;

static ll CAPX = 1000;   // RUN_CAP_X: set from the build by bar_optimum_cap_run.js (environment BAR_CAPX)

struct Offers { bool term; bool dbl; bool half; ll halfAmt, keep; };
static Offers offers(ll S, ll B, ll cap, ll MW, ll MIN) {
  Offers o{false, false, false, S / 2, S - S / 2};
  ll T = S + B;
  if (T >= cap || T >= MW) { o.term = true; return o; }
  o.dbl = (S >= MIN && B + 2 * S <= MW);
  o.half = (o.halfAmt >= MIN && B + o.keep + 2 * o.halfAmt <= MW);
  return o;
}

struct Table {
  vector<int> slot; ull mask = 0; size_t n = 0;
  vector<int> *SS, *BB;
  static ull h(ull k) { k ^= k >> 33; k *= 0xff51afd7ed558ccdULL; k ^= k >> 33; k *= 0xc4ceb9fe1a85ec53ULL; k ^= k >> 33; return k; }
  void init(size_t cap) { size_t c = 1; while (c < cap) c <<= 1; slot.assign(c, -1); mask = c - 1; }
  void grow() { size_t c = slot.size() * 2; slot.assign(c, -1); mask = c - 1; for (size_t i = 0; i < n; i++) { ull k = ((ull)(*SS)[i] << 32) | (ull)(*BB)[i]; ull j = h(k) & mask; while (slot[j] >= 0) j = (j + 1) & mask; slot[j] = (int)i; } }
  int get(int S, int B) {
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
  if (mode != "solve" || argc < 5) { fprintf(stderr, "usage: bar_optimum_cap solve A_cents p Nmax [MIN=2] [MW=0]\n"); return 2; }
  ll A = atoll(argv[2]); double p = strtod(argv[3], nullptr); int Nmax = atoi(argv[4]);
  ll MIN = argc > 5 ? atoll(argv[5]) : 2; ll MWarg = argc > 6 ? atoll(argv[6]) : 0;
  ll MW = MWarg > 0 ? MWarg : (ll)4e18; double q = 1 - p; ll cap = CAPX * A;
  auto t0 = chrono::steady_clock::now();
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
  // evaluation order: empty-bank states first, then the others; larger S first inside each group
  vector<unsigned> order(N); for (size_t i = 0; i < N; i++) order[i] = (unsigned)i;
  sort(order.begin(), order.end(), [&](unsigned x, unsigned y) { bool bx = BB[x] > 0, by = BB[y] > 0; if (bx != by) return !bx; return SS[x] > SS[y]; });
  // order check: every full-double target of a state comes earlier in the order
  { vector<unsigned> pos(N); for (size_t k = 0; k < N; k++) pos[order[k]] = (unsigned)k;
    for (size_t i = 0; i < N; i++) { if (term[i]) continue; auto& a = nx[i]; if (a[0] != -2 && pos[a[0]] >= pos[i]) { fprintf(stderr, "order violated (win)\n"); return 3; } if (a[1] >= 0 && pos[a[1]] >= pos[i]) { fprintf(stderr, "order violated (lose)\n"); return 3; } } }
  vector<double> Vp(N), Vc(N);   // previous layer (r-1), current layer (r)
  vector<double> lam, val;
  for (int r = 0; r <= Nmax; r++) {
    for (size_t k = 0; k < N; k++) { unsigned i = order[k];
      double T = (double)SS[i] + BB[i];
      if (term[i]) { Vc[i] = (double)min<ll>((ll)SS[i] + BB[i], MW); continue; }
      auto& a = nx[i]; double best = T;
      if (a[0] != -2) { double vd = p * Vc[a[0]] + q * (a[1] >= 0 ? Vc[a[1]] : 0.0); if (vd > best) best = vd; }
      if (r > 0 && a[2] != -2) { double vh = p * Vp[a[2]] + q * Vp[a[3]]; if (vh > best) best = vh; }
      Vc[i] = best; }
    lam.push_back(Vc[0] / (double)A); val.push_back(Vc[0]);
    Vp.swap(Vc);
  }
  double secs = chrono::duration<double>(chrono::steady_clock::now() - t0).count();
  printf("{\"A\":%lld,\"p\":%.17g,\"MIN\":%lld,\"MW\":%lld,\"Nmax\":%d,\"states\":%zu,\"seconds\":%.1f,\"V\":[", A, p, MIN, MWarg, Nmax, N, secs);
  for (size_t r = 0; r < val.size(); r++) printf("%s%.12f", r ? "," : "", val[r]);
  printf("],\"VoverA\":["); for (size_t r = 0; r < lam.size(); r++) printf("%s%.12f", r ? "," : "", lam[r]);
  printf("]}\n");
  return 0;
}
