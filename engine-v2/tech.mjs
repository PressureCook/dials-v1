// Dials engine v2: technology from properties. Materials are property vectors; a thing is the set of materials in it (a mask) and a level;
// its properties follow from its materials by one rule, and every game rate reads the properties by a fixed law, the same in every world.
// Worlds differ in which materials exist, their values and where they lie. Four mechanics: materials; things; make (in hand) and build
// (where I stand), one bundle of what I hold at a time; wear. Nobody knows a recipe: a bundle is tried by curiosity, what it did is
// learned by the ledger like any act, and spread by the concept words that already exist. Terrain: heights, springs, water flowing down.
import { P } from "./params.mjs";
import { World, ACT, REL, NSIT, sitKey, rnd, rint, dist } from "./engine.mjs";

// properties: hardness, flexibility, mass, porosity (holds water, holds things)
export const PROPS = ["hard", "flex", "mass", "por"];
const ARCHETYPES = { food: [0.1, 0.2, 0.3, 0.6], wood: [0.5, 0.7, 0.4, 0.3], stone: [0.9, 0.1, 0.9, 0.0], fibre: [0.1, 1.0, 0.1, 0.6], clay: [0.3, 0.2, 0.6, 0.9], bone: [0.7, 0.3, 0.5, 0.2] };
const REGROWS = { food: true, wood: true, fibre: true, clay: false, stone: false, bone: false };
// the laws: what a property vector does, for a tool in the hand and for a thing built on a tile (score in 0..1; multiplier (1 + k score)^level)
export const HAND_LAWS = { strength: p => p[0] * p[2], work_rate: p => p[0] * (1 - p[2]), carry_cap: p => p[1] * p[3], act_cost: p => p[1] * (1 - p[2]), eat_value: p => p[3] * p[0] };
export const TILE_LAWS = { base_drain: p => p[2] * p[0], stash_cap: p => p[3] * p[0], drink: p => p[3] * p[3], food_regrow: (p, hasFood) => hasFood ? 0.5 + 0.5 * p[3] : 0 };
const LESS_IS_MORE = new Set(["base_drain", "act_cost"]);
export const popcount = m => { let n = 0; while (m) { n += m & 1; m >>= 1; } return n; };

const W = World.prototype;
// ---- terrain: heights, springs on high ground, water running down to pools
W.initTerrain = function () { const T = this.W * this.H; const h = this.height = new Float32Array(T);
  const bumps = []; for (let k = 0; k < 6; k++) bumps.push([rnd() * this.W, rnd() * this.H, 6 + rnd() * 12, rnd() < 0.5 ? 1 : -1]);
  for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) { let v = 0; for (const [bx, by, r, s] of bumps) { const d = Math.hypot(x - bx, y - by); v += s * Math.exp(-(d * d) / (2 * r * r)); } h[this.idx(x, y)] = v + 0.05 * rnd(); }
  this.wet = new Float32Array(T); this.spring.fill(0); const order = [...Array(T).keys()].sort((a, b) => h[b] - h[a]); const top = order.slice(0, Math.floor(T * 0.3));
  for (let k = 0; k < P.springs; k++) { const t = top[rint(top.length)]; if (this.spring[t]) { k--; continue; } this.spring[t] = 1; }
  // each spring's water follows the lowest neighbour down until it can go no lower (a pool); the stream and its banks are wet
  for (let t = 0; t < T; t++) if (this.spring[t]) { let cur = t; for (let steps = 0; steps < T; steps++) { this.wet[cur] = 1; const x = cur % this.W, y = Math.floor(cur / this.W); let best = cur, bh = h[cur];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if ((!dx && !dy) || nx < 0 || ny < 0 || nx >= this.W || ny >= this.H) continue; const n = this.idx(nx, ny); if (h[n] < bh) { bh = h[n]; best = n; } }
      if (best === cur) { this.wet[cur] = 1; break; } cur = best; } }
  const banks = new Float32Array(T); for (let t = 0; t < T; t++) if (this.wet[t] >= 1) { const x = t % this.W, y = Math.floor(t / this.W); for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= this.W || ny >= this.H) continue; const n = this.idx(nx, ny); banks[n] = Math.max(banks[n], Math.max(Math.abs(dx), Math.abs(dy)) <= 1 ? 0.6 : 0.3); } }
  for (let t = 0; t < T; t++) if (this.wet[t] < 1) this.wet[t] = banks[t]; };
W.canDrink = function (t) { return this.spring[t] === 1 || this.wet[t] >= 1 || (this.tileMask && this.tileMask[t] > 0 && this.wet[t] >= 0.3 && TILE_LAWS.drink(this.propsOf(this.tileMask[t])) > 0.3); };   /* a stream, a spring, or a well dug where the ground is damp */
// ---- materials and things
W.initTech = function () { const T = this.W * this.H; this.initTerrain();
  const names = Object.keys(ARCHETYPES).filter(n => n !== "food"); for (let k = names.length - 1; k > 0; k--) { const r = rint(k + 1); [names[k], names[r]] = [names[r], names[k]]; }
  this.MAT = ["food", ...names.slice(0, P.n_materials)]; this.NMAT = this.MAT.length; this.props = this.MAT.map(n => ARCHETYPES[n].map(v => Math.max(0, Math.min(1, v + (rnd() - 0.5) * P.material_spread))));
  this.regrows = this.MAT.map(n => REGROWS[n]); this.res = []; this.resTiles = []; for (let k = 0; k < this.NMAT; k++) { this.res.push(new Float32Array(T)); this.resTiles.push([]); }
  for (let k = 1; k < this.NMAT; k++) while (this.resTiles[k].length < P.material_tiles) { const t = rint(T); if (this.food[t] > 0 || this.spring[t] || this.res.some(r => r[t] > 0)) continue; this.res[k][t] = 2 + rnd() * (P.res_max - 2); this.resTiles[k].push(t); }
  this.tileMask = new Uint8Array(T); this.tileLevel = new Float32Array(T); this.mat = new Float32Array(this.N * this.NMAT); this.discovered = new Map(); this.built = new Map(); this.propCache = new Map(); };
W.propsOf = function (mask) { let p = this.propCache.get(mask); if (p) return p; p = [0, 0, 0, 0]; let n = 0; for (let k = 0; k < this.NMAT; k++) if (mask & (1 << k)) { const q = this.props[k]; p[0] = Math.max(p[0], q[0]); p[1] = Math.max(p[1], q[1]); p[2] += q[2]; p[3] = Math.max(p[3], q[3]); n++; } if (n) p[2] /= n; this.propCache.set(mask, p); return p; };   /* the hardest part gives the edge, the most flexible the handle, the most porous the hollow; mass adds up */
W.maskName = function (mask) { const out = []; for (let k = 0; k < this.NMAT; k++) if (mask & (1 << k)) out.push(this.MAT[k]); return out.join("+"); };
W.held = function (i) { let s = 0; for (let k = 1; k < this.NMAT; k++) s += this.mat[i * this.NMAT + k]; return s; };   /* materials in hand count against the carry cap (food is carried) */
W.things = function (i) { const m = this.mind[i]; if (!m.things) m.things = new Map(); return m.things; };   /* mask -> {level} */
W.mult = function (score, level) { return score > 0.1 ? Math.pow(1 + P.law_k * score, level) : 1; };
W.rate = function (i, key) { const law = HAND_LAWS[key]; if (!law) return 1; const th = this.mind[i] && this.mind[i].things; if (!th || !th.size) return 1; let r = 1; for (const [mask, h] of th) if (h.level > 0) r *= this.mult(law(this.propsOf(mask)), h.level); return LESS_IS_MORE.has(key) ? 1 / r : r; };
W.tileRate = function (t, key) { const law = TILE_LAWS[key]; if (!law || !this.tileMask[t] || this.tileLevel[t] <= 0) return 1; const r = this.mult(law(this.propsOf(this.tileMask[t]), (this.tileMask[t] & 1) !== 0), this.tileLevel[t]); return LESS_IS_MORE.has(key) ? 1 / r : r; };
W.view = function (i) { return P.view_range; };
// what a material is worth to me: the best learned lesson of making or building with it, per unit (nothing until something is learned)
W.price = function (i, k) { const m = this.mind[i]; if (m.priceT !== this.turn) { m.priceT = this.turn; m.price = new Float32Array(this.NMAT);
    for (let mask = 1; mask < (1 << this.NMAT); mask++) { if (popcount(mask) > 2) continue; let best = 0; for (const act of [ACT.work, ACT.build]) { const o = this.lesson(i, this.bundleSit(act, mask)); const n = this.L[o]; if (n < 1) continue; let v = 0; for (let q = 0; q < 4; q++) v += this.L[o + 1 + q]; v = v / n * this.unitsOf(mask); if (v > best) best = v; }
      if (best > 0) for (let kk = 0; kk < this.NMAT; kk++) if (mask & (1 << kk)) m.price[kk] = Math.max(m.price[kk], Math.min(P.eat_value, best)); } }
  return m.price[k]; };
W.matWorth = function (i) { let s = 0; for (let k = 1; k < this.NMAT; k++) { const q = this.mat[i * this.NMAT + k]; if (q > 0) s += q * this.price(i, k); } return s; };
W.unitsOf = function (mask) { return P.steps_per_level + 2 * (popcount(mask) - 1); };
W.bundleSit = function (act, mask) { return sitKey(mask >= 64 ? (act === ACT.work ? ACT.work2 : ACT.build2) : act, (mask >> 3) & 7, mask & 7); };
// what I can try: every single ingredient and pair I hold at least one of (food, materials, tools); the bundle is the union of their materials
W.bundles = function (i) { const ing = []; if (this.carried[i] >= 1) ing.push(1); for (let k = 1; k < this.NMAT; k++) if (this.mat[i * this.NMAT + k] >= 1) ing.push(1 << k); const th = this.mind[i].things; if (th) for (const [mask, h] of th) if (h.level >= 0.5) ing.push(mask);
  const out = new Set(); for (let a = 0; a < ing.length; a++) { out.add(ing[a]); for (let b = a + 1; b < ing.length; b++) out.add(ing[a] | ing[b]); } return [...out]; };
W.techCandidates = function (i, near, adj, threatHere, starve) { const C = this.C; const m = this.mind[i]; const here = this.idx(this.x[i], this.y[i]); const room = this.cap(i) - this.carried[i] - this.held(i); const NM = this.NMAT;
  if (room >= 1) { let best = -1, bd = 1e9; for (const [t, k] of m.knownRes) { if (!(this.res[k][t] > 0.5)) { m.knownRes.delete(t); continue; } const d = dist(this.x[i], this.y[i], t % this.W, Math.floor(t / this.W)); if (d > 0 && d < bd) { bd = d; best = t; } }
    if (best >= 0) this.push(ACT.forage, -1, best % this.W, Math.floor(best / this.W), 0, 0, 0, P.act_cost, threatHere * 0.3, 0, 7); }
  const bs = this.bundles(i); const wr = this.rate(i, "work_rate");
  for (const b of bs) { if (this.push(ACT.work, -1, 0, 0, 0, 0, 0, P.work_cost / wr, threatHere * 0.5, 0, b) < 0) break; if (!this.tileMask[here] || this.tileMask[here] === b) if (this.push(ACT.build, -1, 0, 0, 0, 0, 0, P.work_cost / wr, threatHere * 0.5, 0, b) < 0) break; }
  if (this.held(i) >= 1) this.push(ACT.drop, -1, 0, 0, 0, 0, 0, P.act_cost * 0.2, 0, 0);
  for (const j of adj) for (let k = 1; k < NM; k++) { const mine = this.mat[i * NM + k], theirs = this.mat[j * NM + k];
    if (mine >= 1) { this.push(ACT.give, j, 0, 0, 1, 0, 0, P.act_cost, 0, 0, 16 + k); if (mine >= 2) this.push(ACT.give, j, 0, 0, Math.floor(mine), 0, 0, P.act_cost, 0, 0, 16 + k); }
    if (theirs >= 1 && room >= 1) { const pr = Math.min(1, this.pHurt(i, j) + (m.threats.get(j) || 0)); let standing = 0; for (const o of near) if (o !== j) standing += this.pGive(i, o); this.push(ACT.take, j, 0, 0, Math.floor(theirs), 0, 0, P.act_cost, pr * this.dmgOf(i, j) + standing * 2, 0, 16 + k); } } };
// a step of making or building: the bundle's materials are spent a little, its tools (if any) are used up when a new thing starts, and the thing grows
W.doWork = function (i, build) { const t = this.idx(this.x[i], this.y[i]); const C = this.C; const mask = C.flag[this.chosen]; const NM = this.NMAT; const units = this.unitsOf(mask); const th = this.things(i);
  const parts = []; let matMask = 0; for (const [pm, h] of th) if ((pm & mask) === pm && h.level >= 0.5) parts.push(pm); for (const pm of parts) matMask |= pm;   /* tools in hand cover their materials; the rest must be raw */
  const need = mask & ~matMask; for (let k = 0; k < NM; k++) if (need & (1 << k)) { const have = k === 0 ? this.carried[i] : this.mat[i * NM + k]; if (have < 1 / units) return; }
  if (build) { if (this.tileMask[t] && this.tileMask[t] !== mask) return; if (this.tileLevel[t] >= P.max_level) return; } else { const h = th.get(mask); if (h && h.level >= P.max_level) return; }
  for (let k = 0; k < NM; k++) if (need & (1 << k)) { if (k === 0) this.carried[i] -= 1 / units; else this.mat[i * NM + k] -= 1 / units; }
  const step = this.rate(i, "work_rate") / units;
  if (build) { if (!this.tileMask[t]) { this.tileMask[t] = mask; this.tileLevel[t] = 0; this.noteBuilt("tile", mask, i); } this.tileLevel[t] = Math.min(P.max_level, this.tileLevel[t] + step); }
  else { let h = th.get(mask); if (!h) { h = { level: 0 }; th.set(mask, h); for (const pm of parts) if (pm !== mask) th.delete(pm); this.noteBuilt("hand", mask, i); } h.level = Math.min(P.max_level, h.level + step); } };
W.noteBuilt = function (scope, mask, i) { const key = scope + ":" + mask; if (!this.discovered.has(key)) this.discovered.set(key, { t: this.turn, by: i }); this.built.set(key, (this.built.get(key) || 0) + 1); if (this.logEvents) this.log(`A${i} ${scope === "tile" ? "built" : "made"} ${this.maskName(mask)}`); };
W.techTurn = function () { for (let i = 0; i < this.count; i++) { if (!this.alive[i]) continue; const th = this.mind[i].things; if (th) for (const [mask, h] of th) { h.level -= P.wear_hand; if (h.level <= 0) th.delete(mask); } }
  for (let t = 0; t < this.tileMask.length; t++) if (this.tileMask[t]) { this.tileLevel[t] -= P.wear_tile; if (this.tileLevel[t] <= 0) { this.tileMask[t] = 0; this.tileLevel[t] = 0; } }
  for (let k = 1; k < this.NMAT; k++) if (this.regrows[k]) for (const t of this.resTiles[k]) this.res[k][t] = Math.min(P.res_max, this.res[k][t] + P.material_regrow * P.res_max * (0.3 + 0.7 * rnd()) * (0.15 + 0.85 * this.wet[t])); };
W.techDeath = function (i) { const t = this.idx(this.x[i], this.y[i]); for (let k = 1; k < this.NMAT; k++) { this.res[k][t] += this.mat[i * this.NMAT + k]; this.mat[i * this.NMAT + k] = 0; } if (this.mind[i].things) this.mind[i].things.clear(); };
W.techReport = function () { const hand = {}, tile = {}; let holders = 0; const name = m => this.maskName(m);
  for (let i = 0; i < this.count; i++) { if (!this.alive[i]) continue; const th = this.mind[i].things; if (th && th.size) { holders++; for (const [mask, h] of th) { const b = hand[name(mask)] = hand[name(mask)] || { n: 0, lv: 0 }; b.n++; b.lv += h.level; } } }
  for (let t = 0; t < this.tileMask.length; t++) if (this.tileMask[t]) { const b = tile[name(this.tileMask[t])] = tile[name(this.tileMask[t])] || { n: 0, lv: 0 }; b.n++; b.lv += this.tileLevel[t]; }
  const fmt = o => Object.fromEntries(Object.entries(o).sort((a, b) => b[1].n - a[1].n).map(([k, v]) => [k, `${v.n} @ ${(v.lv / v.n).toFixed(2)}`]));
  const found = [...this.discovered.entries()].map(([key, d]) => { const [scope, mask] = key.split(":"); return `${scope === "tile" ? "built" : "made"} ${name(+mask)} @${d.t} x${this.built.get(key)}`; });
  return { materials: this.MAT.slice(1).map((n, k) => `${n} (${this.props[k + 1].map(v => v.toFixed(2)).join(",")})`), holders, hand: fmt(hand), tile: fmt(tile), found }; };
