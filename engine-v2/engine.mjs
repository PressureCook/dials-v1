// Dials engine v2: a headless core with the same rules as game.html, laid out for scale.
// Physical state lives in typed arrays; sparse social memory (tallies, promises, lexicons) in small per-agent objects.
// Agents only ever look at their neighbourhood (spatial grid). Lessons are a dense table indexed by agent x situation x need.
import { P, NEEDS } from "./params.mjs";
export { P };

let seed = 12345;
export function srand(s) { seed = s >>> 0; }
export function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
export const rint = n => Math.floor(rnd() * n);
export const dist = (x1, y1, x2, y2) => Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));

// ---- acts and situations (integer keys)
export const ACT = { idle: 0, go: 1, forage: 2, eat: 3, drink: 4, stash: 5, unstash: 6, take: 7, raid: 8, give: 9, hurt: 10, breed: 11, say: 12, work: 13, flee: 14, drop: 15,
  // events that happen to me (passive)
  hitToMe: 16, takeToMe: 17, heard: 18,
  // kinds of sentence (a say's situation is the sentence kind, who it is to, and how far the thing asked for is)
  sayGive: 19, sayHurt: 20, sayHurtIf: 21, sayGo: 22, sayStash: 23, sayTake: 24, saySignal: 25, sayDie: 26, sayWords: 27, work2: 28, build: 29, build2: 30 };
export const ACT_NAME = Object.fromEntries(Object.entries(ACT).map(([k, v]) => [v, k]));
export const REL = { none: 0, stranger: 1, thief: 2, friend: 3, known: 4, child: 5, parent: 6 };
export const REL_NAME = Object.fromEntries(Object.entries(REL).map(([k, v]) => [v, k]));
const NACT = 32, NREL = 8, NCTX = 8;          // situation = act x relation x ctx(8): hungry/weak/etc packed
export const NSIT = NACT * NREL * NCTX;
export const sitKey = (act, rel, ctx) => (act * NREL + rel) * NCTX + ctx;
export const sitName = k => { const ctx = k % NCTX, rel = Math.floor(k / NCTX) % NREL, act = Math.floor(k / (NCTX * NREL)); return `${ACT_NAME[act] || act}:${REL_NAME[rel] || rel}:${ctx}`; };

// per-pair record (sparse): what b has done as seen by a
class Tally { constructor() { this.take = 0; this.give = 0; this.hurt = 0; this.kept = 0; this.broke = 0; this.seen = 0; this.dmg = 0; this.hits = 0; }
  decay(k) { this.take *= k; this.give *= k; this.hurt *= k; this.kept *= k; this.broke *= k; this.seen *= k; this.dmg *= k; this.hits *= k; }
  rate(f, prior) { const w = Math.min(this.seen, P.impression) / P.impression; const v = this.seen > 0 ? this[f] / this.seen : prior; return w * v + (1 - w) * prior; }
  cred() { return (this.kept + 0.5) / (this.kept + this.broke + 1); } }

export class World {
  constructor(n, opts = {}) {
    Object.assign(P, opts.params || {});
    const N = this.N = opts.capacity || Math.max(Math.round(P.max_pop * 1.25), n * 2);
    this.W = P.W; this.H = P.H; this.turn = 0; this.count = 0; this.events = []; this.logEvents = !!opts.log;
    // ---- tiles
    const T = this.W * this.H;
    this.food = new Float32Array(T); this.spring = new Uint8Array(T);
    this.stash = new Map();   // tileIdx -> Map(owner -> amount)
    this.foodTiles = []; while (this.foodTiles.length < P.food_tiles) { const t = rint(T); if (this.food[t] > 0) continue; this.food[t] = 2 + rnd() * (P.food_max - 2); this.foodTiles.push(t); }
    if (this.initTech) this.initTech(); else { let placed = 0; while (placed < P.springs) { const t = rint(T); if (this.food[t] > 0 || this.spring[t]) continue; this.spring[t] = 1; placed++; } }   /* materials and things exist whether or not anyone may work (P.tech) */
    // ---- agents (typed arrays)
    const F = () => new Float32Array(N), I = () => new Int32Array(N), U = () => new Uint8Array(N);
    this.alive = U(); this.x = new Int16Array(N); this.y = new Int16Array(N);
    this.energy = F(); this.water = F(); this.mood = F(); this.carried = F();
    this.reward0 = F(); this.fear0 = F(); this.guilt0 = F();           // set points
    this.reward = F(); this.fear = F(); this.guilt = F();              // current (plastic) values
    this.kin = F(); this.moodDrain = F(); this.attention = F(); this.surprise = F(); this.strength = F(); this.plasticity = F();
    this.born = I(); this.died = I().fill(-1); this.parent1 = I().fill(-1); this.parent2 = I().fill(-1); this.bredAt = I().fill(-1e9);
    this.hitsTaken = F(); this.actN = new Float32Array(N * NACT); this.lastSit = I().fill(-1);
    this.isPlayer = U();
    // ---- lessons: per agent x situation: n, dEnergy, dFood, dMood, dWater, loss (6 floats)
    this.L = new Float32Array(N * NSIT * 6);
    // ---- sparse social memory
    this.mind = new Array(N);
    // ---- spatial grid
    this.cell = P.view_range; this.gw = Math.ceil(this.W / this.cell); this.gh = Math.ceil(this.H / this.cell);
    this.grid = new Array(this.gw * this.gh); for (let i = 0; i < this.grid.length; i++) this.grid[i] = [];
    // ---- candidate buffer (per agent, reused)
    const C = this.C = {}; const MAXC = this.MAXC = 2048; C.payload = new Array(MAXC).fill(null);
    C.act = new Uint8Array(MAXC); C.target = new Int32Array(MAXC); C.tx = new Int16Array(MAXC); C.ty = new Int16Array(MAXC);
    C.amt = new Float32Array(MAXC); C.force = new Float32Array(MAXC); C.gain = new Float32Array(MAXC); C.cost = new Float32Array(MAXC);
    C.loss = new Float32Array(MAXC); C.harm = new Float32Array(MAXC); C.info = new Float32Array(MAXC); C.ecost = new Float32Array(MAXC);
    C.sit = new Int32Array(MAXC); C.flag = new Uint8Array(MAXC); C.n = 0;
    for (let i = 0; i < n; i++) this.spawn(rint(this.W), rint(this.H), -1, -1);
    this.rebuildGrid();
  }
  // ---- agents
  spawn(x, y, p1, p2) {
    let i = this.count; if (i >= this.N) { i = this.alive.indexOf(0); if (i < 0) return -1; } else this.count++;
    this.alive[i] = 1; this.x[i] = x; this.y[i] = y; this.isPlayer[i] = 0;
    const d = () => Math.max(0.1, Math.round(rnd() * 10) / 10);
    this.reward0[i] = this.reward[i] = d(); this.fear0[i] = this.fear[i] = d(); this.guilt0[i] = this.guilt[i] = d();
    this.kin[i] = rnd() * P.kin_max; this.moodDrain[i] = P.mood_drain * 2 * rnd(); this.attention[i] = P.attention * 2 * rnd(); this.surprise[i] = P.surprise * 2 * rnd(); this.plasticity[i] = P.dial_rate * 2 * rnd();
    this.strength[i] = P.hurt_damage * (1 - P.hurt_spread / 2 + rnd() * P.hurt_spread);
    const child = p1 >= 0;
    this.energy[i] = child ? P.child_energy : 70; this.water[i] = 70; this.mood[i] = 70; this.carried[i] = child ? 4 : 0;
    this.born[i] = child ? this.turn : -P.grow_turns; this.died[i] = -1; this.parent1[i] = p1; this.parent2[i] = p2; this.bredAt[i] = -1e9; this.hitsTaken[i] = 0;
    this.L.fill(0, i * NSIT * 6, (i + 1) * NSIT * 6); if (this.mat) this.mat.fill(0, i * this.NMAT, (i + 1) * this.NMAT); this.actN.fill(0, i * NACT, (i + 1) * NACT); this.lastSit[i] = -1;
    this.mind[i] = { tally: new Map(), did: new Map(), care: new Map(), knownFood: new Map(), knownSpring: new Set(), knownStash: new Map(), knownRes: new Map(), home: -1, seen: new Uint8Array(this.W * this.H), seenN: 0,
      promOut: [], promIn: [], offersIn: [], heard: [], threats: new Map(), permitted: new Map(), asked: new Map(),
      felt: { hurt: [0, 0], take: [0, 0], hunger: [0, 0], thirst: [0, 0] }, told: { hurt: [0, 0], take: [0, 0] }, toldGood: new Map(), toldKey: new Map(),
      pending: [], events: [], doneToMe: new Map(), answered: new Map(), breedWant: null, lastNeeds: null,
      lexicon: new Map(), coined: new Map(), heardWords: [], seenActs: [], actBase: new Map(), keyBase: new Map(), unknown: new Map(), wordCache: new Map(), lexV: 0, demo: null, demoKey: null, wait: null };
    return i;
  }
  kill(i) { if (!this.alive[i]) return; this.alive[i] = 0; this.died[i] = this.turn; const t = this.idx(this.x[i], this.y[i]); this.food[t] += this.carried[i]; this.carried[i] = 0; if (this.techDeath) this.techDeath(i);
    // no plan with the dead can exist
    for (const j of this.near(i, P.view_range)) { const m = this.mind[j]; m.promOut = m.promOut.filter(p => p.target !== i); m.promIn = m.promIn.filter(p => p.speaker !== i); m.offersIn = m.offersIn.filter(o => o.from !== i); m.heard = m.heard.filter(h => h.from !== i);
      if (m.breedWant && m.breedWant.who === i) m.breedWant = null; if (m.demo && m.demo.asker === i) m.demo = null; if (m.wait && m.wait.who === i) m.wait = null;
      if (P.tabula_rasa && this.lastSit[i] >= 0) { const o = (j * NSIT + this.lastSit[i]) * 6; this.L[o] += 0.5; this.L[o + 1] -= 0.5 * P.death_worth; this.L[o + 5] += 0.5 * P.death_worth; } }
    this.creditAct(i, -1, "die"); this.log(`A${i} died`); }
  age(i) { return this.turn - this.born[i]; }
  grown(i) { const a = this.age(i); const up = Math.min(1, 0.5 + 0.5 * a / P.grow_turns); const down = a > P.old_age ? Math.max(0.5, 1 - 0.5 * (a - P.old_age) / P.old_span) : 1; return Math.min(up, down); }
  frailty(i) { const a = this.age(i); return a > P.old_age ? P.mortality * Math.min(1, (a - P.old_age) / P.old_span) : 0; }
  horizonOf(i) { const g = this.grown(i); return this.born[i] > 0 && this.age(i) < P.grow_turns ? Math.max(1, Math.round(P.social_horizon * g * g)) : P.social_horizon; }
  cap(i) { return P.carry_cap * this.grown(i) * (this.rate ? this.rate(i, "carry_cap") : 1); }
  isChildOf(p, c) { return this.parent1[c] === p || this.parent2[c] === p; }
  fertile(i) { return this.alive[i] && this.age(i) >= P.grow_turns && this.age(i) < P.old_age + P.old_span / 2; }
  canBreed(i) { return this.fertile(i) && this.turn - this.bredAt[i] >= P.grow_turns / 2; }
  mystrength(i) { return this.strength[i] * this.grown(i) * (this.rate ? this.rate(i, "strength") : 1); }
  gainRate(i) { return 0.9 + 0.2 * this.mood[i] / 100; } lossRate(i) { return 1.1 - 0.2 * this.mood[i] / 100; } drainRate(i) { return 1 + 0.5 * (1 - this.mood[i] / 100); }
  wealth(i) { return this.energy[i] + this.carried[i] * P.eat_value * 0.5 + (this.matWorth ? this.matWorth(i) : 0) + this.mood[i] + this.water[i]; }
  needs(i) { return [this.energy[i], this.carried[i] * P.eat_value * 0.5 + (this.matWorth ? this.matWorth(i) : 0), this.mood[i], this.water[i]]; }   /* what I carry counts at what I have learned it is worth */
  needW(i) { const e = 0.5 + (100 - this.energy[i]) / 100; return [e, 0.5 * e, 0.5 + (100 - this.mood[i]) / 100, 0.5 + (100 - this.water[i]) / 100]; }
  fv(i, food) { const need = Math.max(0, 100 - this.energy[i]) + P.base_drain * P.horizon; return Math.min(food * P.eat_value, need); }
  fvLoss(i, amt) { return Math.max(0, this.fv(i, this.carried[i]) - this.fv(i, Math.max(0, this.carried[i] - amt))) + amt * P.eat_value * 0.2; }
  idx(x, y) { return y * this.W + x; }
  // ---- grid
  rebuildGrid() { for (const g of this.grid) g.length = 0; for (let i = 0; i < this.count; i++) if (this.alive[i]) this.grid[Math.floor(this.y[i] / this.cell) * this.gw + Math.floor(this.x[i] / this.cell)].push(i); }
  near(i, r) { const out = []; const cx = Math.floor(this.x[i] / this.cell), cy = Math.floor(this.y[i] / this.cell); const cr = Math.ceil(r / this.cell);
    for (let gy = Math.max(0, cy - cr); gy <= Math.min(this.gh - 1, cy + cr); gy++) for (let gx = Math.max(0, cx - cr); gx <= Math.min(this.gw - 1, cx + cr); gx++) for (const j of this.grid[gy * this.gw + gx]) { if (j === i || !this.alive[j]) continue; if (dist(this.x[i], this.y[i], this.x[j], this.y[j]) <= r) out.push(j); } return out; }
  adj(i) { const m = this.mind[i]; if (m.adjT !== this.turn) { m.adjT = this.turn; m.adj = this.near(i, 1); } return m.adj; }
  needWT(i) { const m = this.mind[i]; if (m.nwT !== this.turn) { m.nwT = this.turn; m.nw = this.needW(i); } return m.nw; }
  // ---- memory of others
  t(i, j) { const m = this.mind[i]; let t = m.tally.get(j); if (!t) { t = new Tally(); m.tally.set(j, t); } return t; }
  did(i, j) { const m = this.mind[i]; let d = m.did.get(j); if (!d) { d = { take: 0, give: 0, hurt: 0, n: 0 }; m.did.set(j, d); } return d; }
  strangerRate(i, f) { const m = this.mind[i]; if (m.srT !== this.turn) { m.srT = this.turn; let st = 0, sg = 0, sh = 0, n = 0; for (const t of m.tally.values()) if (t.seen > 0) { st += t.rate("take", P.stranger_prior.take); sg += t.rate("give", P.stranger_prior.give); sh += t.rate("hurt", P.stranger_prior.hurt); n++; } m.sr = n ? { take: st / n, give: sg / n, hurt: sh / n } : P.stranger_prior; } return m.sr[f]; }
  pTake(i, j) { const t = this.mind[i].tally.get(j); return t && t.seen > 0 ? t.rate("take", P.stranger_prior.take) : this.strangerRate(i, "take"); }
  pGive(i, j) { const t = this.mind[i].tally.get(j); return t && t.seen > 0 ? t.rate("give", P.stranger_prior.give) : this.strangerRate(i, "give"); }
  pHurt(i, j) { const t = this.mind[i].tally.get(j); const base = t && t.seen > 0 ? t.rate("hurt", P.stranger_prior.hurt) : this.strangerRate(i, "hurt"); return Math.min(1, base + (this.mind[i].threats.get(j) || 0)); }
  dmgOf(i, j) { const t = this.mind[i].tally.get(j); if (t && t.hits > 0.2) return t.dmg / t.hits; let s = 0, n = 0; for (const u of this.mind[i].tally.values()) if (u.hits > 0.2) { s += u.dmg / u.hits; n++; } return n ? s / n : P.hurt_damage; }
  grievance(i, j) { const t = this.mind[i].tally.get(j); return t ? t.rate("take", 0) + t.rate("hurt", 0) * 1.5 : 0; }
  relation(i, j) { if (j < 0) return REL.none; if (this.isChildOf(i, j)) return REL.child; if (this.parent1[i] === j || this.parent2[i] === j) return REL.parent; const t = this.mind[i].tally.get(j); if (!t || t.seen < 0.5) return REL.stranger; if (this.grievance(i, j) > 0.3) return REL.thief; if (t.rate("give", 0) > 0.2) return REL.friend; return REL.known; }
  care(i, j) { const m = this.mind[i]; let c = m.care.get(j); if (c === undefined) { c = this.isChildOf(i, j) ? this.kin[i] : 0; m.care.set(j, c); } return c; }
  learnCare(i, j, dm, db) { if (Math.abs(db) < 1 || Math.abs(dm) < 1) return; const w = this.care(i, j); this.mind[i].care.set(j, Math.max(0, Math.min(1, w + 0.1 * Math.sign(dm) * Math.sign(db)))); }
  myHurtRate(i) { let n = 0, h = 0; for (const d of this.mind[i].did.values()) { n += d.n; h += d.hurt; } return n ? h / n : 0.3; }
  myReturnRate(i) { let got = 0, back = 0; const m = this.mind[i]; for (const [j, t] of m.tally) if (t.give > 0.2) { got += t.give; const d = m.did.get(j); if (d) back += Math.min(d.give, t.give); } return got > 0.5 ? back / got : 0.3; }
  feel(i, kind, amount) { const f = this.mind[i].felt[kind]; f[0]++; f[1] += amount; }
  known(i, kind) { const m = this.mind[i]; const f = m.felt[kind], t = m.told[kind]; const own = f && f[0] ? f[1] / f[0] : null, heard = t && t[0] ? t[1] / t[0] : null; if (own === null && heard === null) return 0; if (own === null) return heard; if (heard === null) return own; const w = Math.min(f[0], P.impression) / P.impression; return w * own + (1 - w) * heard; }
  tell(i, kind, amount, cred) { const t = this.mind[i].told[kind]; if (!t) return; t[0] += cred; t[1] += cred * amount; }
  // ---- perception
  perceive(i) { const m = this.mind[i]; const R = this.view ? this.view(i) : P.view_range; for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const x = this.x[i] + dx, y = this.y[i] + dy; if (x < 0 || y < 0 || x >= this.W || y >= this.H) continue; const t = this.idx(x, y); if (!m.seen[t]) { m.seen[t] = 1; m.seenN++; } if (this.food[t] > 0) m.knownFood.set(t, this.food[t]); else if (m.knownFood.has(t)) m.knownFood.delete(t); if (this.canDrink ? this.canDrink(t) : this.spring[t]) m.knownSpring.add(t); if (this.res) for (let k = 1; k < this.NMAT; k++) if (this.res[k][t] > 0.5) m.knownRes.set(t, k); const st = this.stash.get(t); if (st) for (const [o, amt] of st) if (o !== i && amt > 0.05) m.knownStash.set(t, this.turn); } }
  // ---- situation of a candidate (integer key)
  ctxOf(i, j) { const hungry = this.energy[i] < 40 ? 1 : 0; const weak = j >= 0 && this.energy[j] < 25 ? 2 : 0; return hungry + weak; }
  situation(i, c) { const C = this.C; const act = C.act[c], j = C.target[c]; const hungry = this.energy[i] < 40 ? 1 : 0;
    if (act === ACT.go) { const f = C.flag[c]; return sitKey(ACT.go, j >= 0 ? this.relation(i, j) : REL.none, hungry + (f & 6)); }   // flag: 2 tofood, 4 tospring, 6 toplace/wander
    if (act === ACT.say) return sitKey(ACT.sayGive + (C.flag[c] >> 3), this.relation(i, j), C.flag[c] & 7);
    if (act === ACT.work || act === ACT.build) return this.bundleSit(act, C.flag[c]); if (act === ACT.drop) return sitKey(ACT.drop, REL.none, this.energy[i] < 40 ? 1 : 0);
    if ((act === ACT.give || act === ACT.take) && C.flag[c] >= 16) return sitKey(act, this.relation(i, j), 4 + (C.flag[c] - 16));
    if (act === ACT.take || act === ACT.give || act === ACT.hurt || act === ACT.breed) return sitKey(act, this.relation(i, j), this.ctxOf(i, j));
    if (act === ACT.raid) return sitKey(ACT.raid, this.relation(i, j), hungry);
    if (act === ACT.idle) { let weak = 0; for (const o of this.adj(i)) if (this.energy[o] < 25) { weak = 2; break; } return sitKey(ACT.idle, REL.none, hungry + weak); }
    return sitKey(act, REL.none, hungry + (act === ACT.drink ? (this.water[i] < 40 ? 2 : 0) : 0)); }
  passiveSit(act, i, j) { return sitKey(act, this.relation(i, j), this.ctxOf(i, j)); }
  lesson(i, sit) { return (i * NSIT + sit) * 6; }
  // ---- candidates (into the shared buffer)
  push(act, target, tx, ty, amt, force, gain, cost, loss, harm, flag = 0, ecost = -1) { const C = this.C; if (C.n >= this.MAXC) { this.dropped = (this.dropped || 0) + 1; return -1; } const c = C.n++; C.act[c] = act; C.target[c] = target; C.tx[c] = tx; C.ty[c] = ty; C.amt[c] = amt; C.force[c] = force; C.gain[c] = gain; C.cost[c] = cost; C.loss[c] = loss; C.harm[c] = harm; C.flag[c] = flag; C.ecost[c] = ecost < 0 ? cost : ecost; C.info[c] = 0; C.payload[c] = null; return c; }
  candidates(i) { const C = this.C; C.n = 0; const m = this.mind[i]; const near = this.near(i, this.view ? this.view(i) : P.view_range); const adj = near.filter(j => dist(this.x[i], this.y[i], this.x[j], this.y[j]) <= 1); const H = this.horizonOf(i);
    const starve = Math.max(0, 30 - this.energy[i] - this.carried[i] * P.eat_value) * 0.5; let threatHere = 0; for (const j of adj) threatHere += this.pTake(i, j) * this.carried[i] + this.pHurt(i, j) * this.dmgOf(i, j);
    const here = this.idx(this.x[i], this.y[i]); const room = this.cap(i) - this.carried[i];
    // idle (picks up what is here)
    this.push(ACT.idle, -1, 0, 0, 0, 0, 0, 0, threatHere + starve, 0);
    // a step away from whoever is a threat here (only when there is one)
    if (adj.length && threatHere > 0.5) { let bx = -1, by = -1, bs = -1; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const x = this.x[i] + dx, y = this.y[i] + dy; if (x < 0 || y < 0 || x >= this.W || y >= this.H) continue; let sc = 0; for (const j of adj) sc += dist(x, y, this.x[j], this.y[j]) * (this.pHurt(i, j) + this.pTake(i, j)); if (sc > bs) { bs = sc; bx = x; by = y; } }
      if (bx >= 0) this.push(ACT.flee, -1, bx, by, 0, 0, 0, P.act_cost, threatHere * 0.25 + starve, 0); }
    // eat (felt)
    if (this.carried[i] > 0 && this.energy[i] < 95) { const amt = Math.min(this.carried[i], 100 - this.energy[i]); const urg = 1 + 2 * (1 - this.energy[i] / 100); this.push(ACT.eat, -1, 0, 0, amt, 0, amt * P.eat_value * urg, P.act_cost * 0.3, threatHere * 0.5, 0); }
    // drink (felt) and go to a known spring
    if ((this.canDrink ? this.canDrink(here) : this.spring[here]) && this.water[i] < 95) { const amt = Math.min(P.drink, 100 - this.water[i]); this.push(ACT.drink, -1, 0, 0, amt, 0, amt * (1 + 2 * (1 - this.water[i] / 100)), P.act_cost * 0.3, threatHere * 0.5, 0); }
    { let best = -1, bd = 1e9; for (const t of m.knownSpring) { const sx = t % this.W, sy = Math.floor(t / this.W); const d = dist(this.x[i], this.y[i], sx, sy); if (d === 0) continue; if (d < bd) { bd = d; best = t; } }
      if (best >= 0) { const need = Math.min(P.drink, 100 - this.water[i]); const val = this.water[i] < 60 ? need * (1 + 2 * (1 - this.water[i] / 100)) * Math.pow(0.9, bd) : 0; this.push(ACT.go, -1, best % this.W, Math.floor(best / this.W), 0, 0, val, P.act_cost, threatHere * 0.3, 0, 4); } }
    // forage: best known food, or my own stash against a real deficit; worth over distance, discounted by whoever is closer to it
    if (room >= 0.2) { let best = -1, bv = 0, bown = false;
      const consider = (t, amt, own) => { if (amt <= 0.1) return; const sx = t % this.W, sy = Math.floor(t / this.W); const d = dist(this.x[i], this.y[i], sx, sy); if (d === 0) return; let val = (own ? Math.min(Math.min(amt, room) * P.eat_value, Math.max(0, 45 - this.energy[i])) : this.fv(i, Math.min(amt, room))) * 0.8 * Math.pow(0.92, d); let closer = 0; for (const j of near) if (dist(this.x[j], this.y[j], sx, sy) < d) closer++; val *= Math.pow(0.75, closer); if (val > bv) { bv = val; best = t; bown = own; } };
      for (const [t, f] of m.knownFood) consider(t, f, false); for (const [t, st] of this.stash) { const mine = st.get(i); if (mine) consider(t, mine, true); }
      if (best >= 0 && bv > 0.05) { let loss = 0; const sx = best % this.W, sy = Math.floor(best / this.W); for (const j of near) if (dist(this.x[j], this.y[j], sx, sy) <= 1) loss += this.pHurt(i, j) * this.dmgOf(i, j) * 0.5; this.push(ACT.forage, -1, sx, sy, 0, 0, bv, P.act_cost, loss, 0, bown ? 3 : 2); } }
    // explore what I have not seen, worth the food I expect there from what I have seen so far
    { const R = this.view ? this.view(i) : P.view_range; let n = 0, px = -1, py = -1; for (let dy = -R - 1; dy <= R + 1; dy++) for (let dx = -R - 1; dx <= R + 1; dx++) { const x = this.x[i] + dx, y = this.y[i] + dy; if (x < 0 || y < 0 || x >= this.W || y >= this.H) continue; if (m.seen[this.idx(x, y)]) continue; n++; if (rint(n) === 0) { px = x; py = y; } }
      if (n) { let sf = 0; for (const f of m.knownFood.values()) if (f > 0.1) sf++; const prior = m.seenN ? Math.max(0.05, sf / m.seenN) : Math.max(0.3, P.food_tiles / (this.W * this.H)); this.push(ACT.go, -1, px, py, 0, 0, this.fv(i, prior * P.food_max * 0.36), P.act_cost, threatHere * 0.3 + starve * 0.5 + 1, 0, 6); } }
    // stash / unstash here; raid others' stashes I know of, here or over there
    { const st = this.stash.get(here); if (st) { const mine = st.get(i) || 0; if (mine > 0.2 && this.energy[i] < 60 && room >= 0.2) this.push(ACT.unstash, -1, 0, 0, mine, 0, this.fv(i, Math.min(mine, room)), P.act_cost * 0.5, 0, 0); } }
    if (this.carried[i] >= this.cap(i) - 0.01) { let risk = 0; for (const j of near) risk += this.pTake(i, j); this.push(ACT.stash, -1, 0, 0, this.carried[i], 0, this.carried[i] * 0.6, P.act_cost * 0.5, risk * this.carried[i] * 0.5, 0); }
    if (room >= 0.2) for (const [t, seenAt] of m.knownStash) { if (this.turn - seenAt > P.stash_memory) { m.knownStash.delete(t); continue; } const st = this.stash.get(t); if (!st) continue; const px = t % this.W, py = Math.floor(t / this.W); const d = dist(this.x[i], this.y[i], px, py);
      for (const [o, have] of st) { if (o === i || !(have > 0.05) || !this.alive[o]) continue; const amt = Math.min(have, room); const ownerNear = dist(this.x[o], this.y[o], px, py) <= P.view_range; const retal = this.pHurt(i, o) * (this.dmgOf(i, o) + (this.carried[i] + amt) * 0.5 * P.eat_value) * (ownerNear ? 1 : 0.3); let witnesses = 0; for (const j of near) if (dist(this.x[j], this.y[j], px, py) <= P.view_range) witnesses += this.pGive(i, j); witnesses *= 2;
        let harm = amt; if (this.grievance(i, o) > 0.3) harm *= 0.3; const ok = (this.mind[o].permitted.get(i) || 0) >= this.turn;
        if (d === 0) this.push(ACT.raid, o, 0, 0, amt, 0, this.fv(i, amt) * 0.8, P.act_cost, ok ? 0 : retal + witnesses, ok ? 0 : harm); else this.push(ACT.forage, o, px, py, 0, 0, this.fv(i, amt) * 0.8 * Math.pow(0.92, d), P.act_cost, ok ? 0 : retal + witnesses, ok ? 0 : harm, 5); } }
    // go to someone in view (a move like any other; the pull to a mate is felt)
    for (const j of near) { const d = dist(this.x[i], this.y[i], this.x[j], this.y[j]); if (d <= 1) continue; const mate = this.canBreed(i) && this.canBreed(j) && this.pop < P.max_pop; const pull = mate ? P.breed_drive * (0.5 + 0.5 * this.pGive(i, j)) * Math.pow(0.85, d - 1) : 0; this.push(ACT.go, j, this.x[j], this.y[j], 0, 0, pull, P.act_cost, threatHere * 0.3, 0, mate ? 1 : 0); }
    // adjacent: take, give, hurt, breed
    for (const j of adj) { const gr = this.grievance(i, j);
      if (this.carried[j] > 0.1 && this.cap(i) - this.carried[i] > 0.2) { const amt = Math.min(this.carried[j], this.cap(i) - this.carried[i]); const pr = Math.min(1, this.pHurt(i, j) + (m.threats.get(j) || 0)); const retal = pr * this.dmgOf(i, j); let standing = 0; for (const k of near) if (k !== j) standing += this.pGive(i, k); let harm = Math.min(amt, this.energy[j]); if (gr > 0.3) harm *= 0.3; this.push(ACT.take, j, 0, 0, amt, 0, this.fv(i, amt), P.act_cost, retal + standing * 2, harm); }
      if (this.canBreed(i) && this.canBreed(j) && this.pop < P.max_pop) { const bw = this.mind[j].breedWant; const wants = bw && bw.who === i && this.turn - bw.t <= P.breed_window; const pAgree = wants ? 1 : 0.5 + 0.5 * this.pGive(i, j); this.push(ACT.breed, j, 0, 0, 0, 0, P.breed_drive * pAgree, P.act_cost * 0.2 + (P.birth_cost / 2 * (this.energy[i] <= P.birth_cost ? 4 : 1) + this.fv(i, Math.min(this.carried[i], P.birth_food / 2))) * pAgree, 0, 0, 0, P.act_cost * 0.2); }
      if (this.carried[i] > 0.5) { const tb = this.t(i, j); const owed = m.promOut.filter(p => p.target === j).reduce((s, p) => s + p.amount, 0); const prevented = this.energy[j] < 25 ? Math.min(this.carried[i], Math.max(0, 25 - this.energy[j])) : 0;
        for (let amt = 1; amt <= Math.floor(this.carried[i]); amt++) { const ret = this.pGive(i, j) * this.fv(i, amt) * 1.2 + tb.cred() * 0.5; const kinGain = this.isChildOf(i, j) ? this.kin[i] * this.fv(j, amt) : 0; this.push(ACT.give, j, 0, 0, amt, 0, ret + kinGain, P.act_cost + this.fvLoss(i, amt) * 0.9, 0, -(prevented + owed * 0.5), 0, P.act_cost); } }
      { let harmBase = this.mystrength(i); if (gr > 0.3) harmBase *= 0.3; for (const force of [0.25, 0.5, 1]) { let gh = gr > 0.2 ? 6 * force : 0; this.push(ACT.hurt, j, 0, 0, 0, force, gh, P.hurt_cost * force, this.pHurt(i, j) * this.dmgOf(i, j) * 1.5, harmBase * force, 0, P.hurt_cost * force); } }
    }
    if (P.tech && this.techCandidates) this.techCandidates(i, near, adj, threatHere, starve);
    // requests heard (go, place, hurt, give) and speech
    if (this.requestCandidates) { this.requestCandidates(i, near, adj, H, starve, threatHere); this.speechCandidates(i, near, adj, H, starve, threatHere); }
    // hand valued projections (deterrence, investment) only when not learning from scratch
    if (!P.tabula_rasa && H > 0) for (let c = 0; c < C.n; c++) { const j = C.target[c]; if (j < 0) continue;
      if (C.act[c] === ACT.give) { const t = this.t(i, j); const shift = this.pGive(i, j) < 0.6 ? C.amt[c] / P.impression * 0.5 : 0; C.gain[c] += shift * this.fv(i, 1) * H * 0.3; }
      if (C.act[c] === ACT.hurt) { const pt = this.pTake(i, j); if (pt > 0.1) { const shift = this.mystrength(i) / P.impression; const stake = Math.max(1, this.carried[i] * P.eat_value * 0.5); const projected = Math.min(1, this.fear[i] * shift / stake); C.gain[c] += projected * pt * this.carried[i] * P.eat_value * 0.5 * H * 0.3; } } }
    return C.n; }
  // ---- learning from outcomes (from scratch)
  learnValue(i, c) { const C = this.C; const act = C.act[c]; if (act === ACT.breed || act === ACT.eat || act === ACT.drink || (act === ACT.go && (C.flag[c] === 4 || C.flag[c] === 1))) { C.sit[c] = this.situation(i, c); return; }
    const sit = C.sit[c] = this.situation(i, c); const o = this.lesson(i, sit); const n = this.L[o]; const H = Math.max(1, this.horizonOf(i));
    const nAct = this.actN[i * NACT + act]; const gamble = P.explore * P.act_cost / Math.max(C.cost[c], P.act_cost); const info = gamble * Math.min(H, 10) / 10 / (1 + n + 0.5 * nAct);
    const tk = this.mind[i].toldKey.get(sit); const tg = this.mind[i].toldGood.get(ACT_NAME[act]); const prior = tk && tk[0] ? tk[1] / tk[0] : tg && tg[0] && C.flag[c] < 16 ? tg[1] / tg[0] : 0; const wn = Math.min(n, P.impression) / P.impression;
    const units = act === ACT.give && C.flag[c] < 16 ? Math.max(1, C.amt[c]) : act === ACT.hurt ? C.force[c] : 1;
    const w = this.needWT(i); let g = 0, l = 0; for (let k = 0; k < 4; k++) { const mean = n ? this.L[o + 1 + k] / n : 0; g += mean * w[k]; l += Math.max(0, -mean) * w[k]; }
    C.gain[c] = (wn * g + (1 - wn) * prior) * units + info; C.loss[c] = l * units; C.info[c] = info;
    const j = C.target[c];
    // gift projection by rule A: it comes back as I would return it
    if (act === ACT.give && j >= 0 && C.flag[c] < 16 && !this.isChildOf(i, j)) { const t = this.mind[i].tally.get(j); const back = t && t.seen > 0.5 ? Math.min(1, this.pGive(i, j) * 2) : this.myReturnRate(i); C.gain[c] += back * C.amt[c] * P.eat_value * 0.5 * Math.min(H, 10) / 10; }
    // staying within reach of someone violent
    if (act !== ACT.go && act !== ACT.forage && act !== ACT.flee) { let threat = 0; for (const o2 of this.adj(i)) threat += this.pHurt(i, o2) * this.known(i, "hurt"); C.loss[c] += threat; }
    // harm is what I know it feels like, projected by how much they count as me
    let harm = act === ACT.hurt ? this.known(i, "hurt") * C.force[c] : (act === ACT.take || act === ACT.raid) ? this.known(i, "take") : 0;
    if (act === ACT.idle) { for (const o2 of this.adj(i)) if (this.energy[o2] < 25) { harm = this.known(i, "hunger") * this.care(i, o2); if (this.isChildOf(i, o2)) C.loss[c] += this.kin[i] * harm; break; } }
    else if (j >= 0) { harm *= this.care(i, j); if (this.isChildOf(i, j)) C.loss[c] += this.kin[i] * harm; }
    C.harm[c] = harm;
    // fear of the blow I know of: if I hit them they may hit back, as I would
    if (act === ACT.hurt && j >= 0) { const t = this.mind[i].tally.get(j); const pBack = t && t.seen > 0.5 ? this.pHurt(i, j) : this.myHurtRate(i); C.loss[c] = Math.max(C.loss[c], pBack * this.known(i, "hurt")); } }
  // what my answer teaches the one who just did something to me
  teaches(i, c) { const m = this.mind[i]; if (!m.doneToMe.size) return 0; const C = this.C; const H = Math.max(1, this.horizonOf(i)); const j = C.target[c]; let g = 0;
    for (const [o, d] of m.doneToMe) { if (this.turn - d.t > 10 || !this.alive[o]) continue; const toMe = d.kind === "hurt" ? -d.amt : d.kind === "take" ? -d.amt * P.eat_value * 0.5 : d.kind === "give" ? d.amt * P.eat_value * 0.5 : 0; if (!toMe) continue;
      const t = this.mind[i].tally.get(o); const again = t ? (t[d.kind] || 0) / ((t.seen || 0) + P.impression) : 0; const ans = m.answered.get(o); const prior = ans && this.turn - ans.t <= 10 ? ans.sum : 0;
      const resp = j === o ? (C.act[c] === ACT.hurt ? -this.mystrength(i) * C.force[c] : C.act[c] === ACT.give && C.flag[c] < 16 ? C.amt[c] * P.eat_value * 0.5 : 0) : 0; const f = x => Math.max(-1, Math.min(1, x / 20));
      g += H * again * toMe * (f(prior + resp) - f(prior)); } return g; }
  choose(i) { const C = this.C; const n = this.candidates(i); if (P.tabula_rasa) for (let c = 0; c < n; c++) this.learnValue(i, c); else for (let c = 0; c < n; c++) C.sit[c] = this.situation(i, c);
    for (let c = 0; c < n; c++) C.gain[c] += this.teaches(i, c);
    if (P.tabula_rasa) { const panic = Math.min(1, this.hitsTaken[i] / 15) * this.fear[i]; if (panic > 0) { let known = 0; for (let c = 0; c < n; c++) if (this.L[this.lesson(i, C.sit[c])] >= 1) known = Math.max(known, C.gain[c] - C.info[c]); for (let c = 0; c < n; c++) if (C.info[c]) C.gain[c] -= Math.min(C.info[c], Math.max(0, known)) * panic; } }
    // demo: the act I promised to show is worth what answering is worth
    const dm = this.mind[i].demo; if (dm && this.turn <= dm.until) for (let c = 0; c < n; c++) if (ACT_NAME[C.act[c]] === dm.word || (dm.word === "take" && C.act[c] === ACT.raid)) C.gain[c] += dm.gain;
    if (dm && this.turn <= dm.until && this.alive[dm.asker]) { const ak = dm.asker; if (dm.word === "give" && this.carried[i] >= 1 && dist(this.x[i], this.y[i], this.x[ak], this.y[ak]) <= 1) { let has = false; for (let c = 0; c < n; c++) if (C.act[c] === ACT.give && C.target[c] === ak) has = true; if (!has) { const c = this.push(ACT.give, ak, 0, 0, 1, 0, dm.gain, P.act_cost + this.fv(i, 1), 0, 0); if (c >= 0) { C.sit[c] = this.situation(i, c); } } }
      if (dm.word === "stash" && this.carried[i] >= 1) { let has = false; for (let c = 0; c < n; c++) if (C.act[c] === ACT.stash) has = true; if (!has) { const c = this.push(ACT.stash, -1, 0, 0, this.carried[i], 0, dm.gain, P.act_cost * 0.5, 0, 0); if (c >= 0) C.sit[c] = this.situation(i, c); } } }
    const n2 = C.n; const obs = this.obligations ? this.obligations(i) : [];
    let best = -1, bs = -1e9; const R = this.reward[i], F = this.fear[i], G = this.guilt[i];
    for (let c = 0; c < n2; c++) { for (const ob of obs) if (!this.complies(c, ob)) C.loss[c] += ob.loss; let s = R * C.gain[c] - C.cost[c] - F * C.loss[c] - G * C.harm[c] + (rnd() - 0.5) * 0.1;
      let brings = 0; if (C.act[c] === ACT.eat) brings = C.amt[c] * P.eat_value * this.gainRate(i); else if ((C.act[c] === ACT.forage || C.act[c] === ACT.go) && C.flag[c] === 2) { const f = this.food[this.idx(C.tx[c], C.ty[c])]; const d = dist(this.x[i], this.y[i], C.tx[c], C.ty[c]); if (f > 0.3 && d < this.energy[i]) brings = Math.max(0, Math.min(f, this.cap(i) - this.carried[i] + 0.01) * P.eat_value * this.gainRate(i) - d * P.base_drain); }
      const left = this.energy[i] - C.cost[c] - C.loss[c] + brings; const risk = Math.max(0, Math.min(1, (P.death_zone - left) / P.death_zone)); s -= risk * P.death_worth * 4;
      if (s > bs) { bs = s; best = c; } }
    // showing a concept word: when what I am about to do is the situation asked about, I name it first
    const dk = this.mind[i].demoKey; if (dk && P.tabula_rasa && best >= 0 && this.turn <= dk.until && C.act[best] !== ACT.say && C.sit[best] === dk.key) { this.mind[i].demoKey = null; if (this.alive[dk.asker]) { const w = this.wordForKey(i, dk.key); const c = this.push(ACT.say, dk.asker, 0, 0, 0, 0, 0, P.act_cost * 0.2, 0, 0); if (c >= 0) { C.sit[c] = this.situation(i, c); C.payload[c] = { words: [w] }; return c; } } }
    return best; }
  // ---- outcomes ledger
  openEffect(i, c) { const C = this.C; const act = C.act[c]; const j = C.target[c]; const m = this.mind[i]; const kids = []; for (const k of this.near(i, P.view_range)) if (this.isChildOf(i, k)) kids.push([k, this.wealth(k)]);
    const units = act === ACT.give && C.flag[c] < 16 ? Math.max(1, C.amt[c]) : act === ACT.hurt ? C.force[c] : 1;
    m.pending.push({ sit: C.sit[c], t: this.turn, win: Math.max(1, this.horizonOf(i)), n0: this.needs(i), b: j, b0: j >= 0 ? this.wealth(j) : 0, units, kids, passive: false }); m.events.push({ sit: C.sit[c], t: this.turn, passive: false }); }
  openPassive(i, sit, n0, b) { const m = this.mind[i]; m.pending.push({ sit, t: this.turn, win: Math.max(1, this.horizonOf(i)), n0, b, b0: b >= 0 ? this.wealth(b) : 0, units: 1, kids: [], passive: true }); m.events.push({ sit, t: this.turn, passive: true }); }
  explained(i, e) { const out = [0, 0, 0, 0]; if (e.passive) return out; for (const ev of this.mind[i].events) { if (!ev.passive) continue; const gap = Math.abs(ev.t - e.t); if (gap >= e.win) continue; const o = this.lesson(i, ev.sit); const n = this.L[o]; if (n < 1) continue; const f = 1 - gap / e.win; for (let k = 0; k < 4; k++) out[k] += f * this.L[o + 1 + k] / n; } return out; }
  closeEffects(i) { const m = this.mind[i]; if (!m.pending.length) return; const keep = []; const now = this.needs(i); const base = [-P.base_drain * this.drainRate(i), 0, -this.moodDrain[i], -P.water_drain];
    for (const e of m.pending) { if (this.turn - e.t < e.win) { keep.push(e); continue; }
      const ex = this.explained(i, e); let share = 1; if (P.share_credit && !e.passive) { share = 0; for (const ev of m.events) if (!ev.passive && ev.t >= e.t && ev.t < e.t + e.win) share++; share = Math.max(1, share); }   /* my own acts in the same stretch share the credit for what happened in it */
      const d = [0, 0, 0, 0]; for (let k = 0; k < 4; k++) d[k] = (now[k] - e.n0[k] - base[k] * e.win - ex[k]) / e.units / share;
      const db = e.b >= 0 ? this.wealth(e.b) - e.b0 : 0; for (const [k, w0] of e.kids) d[0] += this.kin[i] * ((this.alive[k] ? this.wealth(k) : 0) - w0) / e.units;
      let dm = 0; for (let k = 0; k < 4; k++) dm += d[k]; if (e.b >= 0 && this.alive[e.b]) this.learnCare(i, e.b, dm, db);
      const o = this.lesson(i, e.sit); const n = this.L[o]; if (n >= P.impression) { let err = 0; for (let k = 0; k < 4; k++) err += Math.abs(d[k] - this.L[o + 1 + k] / n); { const dm0 = Math.min(this.mood[i], this.surprise[i] * err); this.mood[i] -= dm0; this.stat && (this.stat.surprise += dm0); }
        if (P.plastic_dials && !e.passive) { const pr = this.plasticity[i]; this.reward[i] += pr * Math.sign(dm); if (dm < 0) this.fear[i] += pr; } }
      this.L[o] += 1; for (let k = 0; k < 4; k++) this.L[o + 1 + k] += d[k]; this.L[o + 5] += Math.max(0, -dm); }
    m.pending = keep; }
  // ---- acting
  doAct(i, c) { const C = this.C; const act = C.act[c]; const j = C.target[c]; const m = this.mind[i]; this.lastSit[i] = C.sit[c];
    if (P.tabula_rasa && !this.isPlayer[i]) { this.openEffect(i, c); this.actN[i * NACT + act] += 1; }
    if (j >= 0 && (act === ACT.give || act === ACT.hurt || act === ACT.take)) { const d = this.did(i, j); d[ACT_NAME[act]] += 1; d.n += 1; }
    this.energy[i] -= C.ecost[c] * (act === ACT.work || act === ACT.build ? 1 : this.rate(i, "act_cost")); let caused = 0;
    switch (act) {
      case ACT.idle: this.pickup(i); break;
      case ACT.go: case ACT.forage: case ACT.flee: this.stepToward(i, C.tx[c], C.ty[c]); this.pickup(i); if (C.flag[c] === 1 && j >= 0 && this.alive[j] && dist(this.x[i], this.y[i], this.x[j], this.y[j]) <= 1) {} break;
      case ACT.eat: { const amt = Math.max(0, Math.min(C.amt[c], this.carried[i], 100 - this.energy[i])); this.carried[i] -= amt; this.energy[i] = Math.min(100, this.energy[i] + amt * P.eat_value * this.gainRate(i) * this.rate(i, "eat_value")); break; }
      case ACT.drink: { const here = this.idx(this.x[i], this.y[i]); if (this.canDrink ? this.canDrink(here) : this.spring[here]) this.water[i] = Math.min(100, this.water[i] + P.drink * this.tileRate(here, "drink")); break; }
      case ACT.stash: { const here = this.idx(this.x[i], this.y[i]); let st = this.stash.get(here); if (!st) { st = new Map(); this.stash.set(here, st); } const capS = P.store_cap * this.tileRate(here, "stash_cap"); const put = Math.max(0, Math.min(this.carried[i], capS - (st.get(i) || 0))); st.set(i, (st.get(i) || 0) + put); this.carried[i] -= put; if (m.home < 0) m.home = here; this.creditAct(i, -1, "stash"); break; }
      case ACT.unstash: { const st = this.stash.get(this.idx(this.x[i], this.y[i])); if (st) { const mine = st.get(i) || 0; const amt = Math.min(mine, this.cap(i) - this.carried[i]); st.set(i, mine - amt); this.carried[i] += amt; } break; }
      case ACT.raid: { const st = this.stash.get(this.idx(this.x[i], this.y[i])); if (st && this.alive[j]) { const have = st.get(j) || 0; const amt = Math.min(have, this.cap(i) - this.carried[i]); st.set(j, have - amt); this.carried[i] += amt; if (!((m.permitted.get(j) || 0) >= this.turn)) { caused = amt; this.witness(i, j, "take", amt); } } break; }
      case ACT.take: { if (C.flag[c] >= 16) { const k = C.flag[c] - 16, NM = this.NMAT; const amt = Math.max(0, Math.min(C.amt[c], this.mat[j * NM + k], this.cap(i) - this.carried[i] - this.held(i))); this.mat[j * NM + k] -= amt; this.mat[i * NM + k] += amt; caused = amt * 0.5; this.mind[j].lastTookFromMe = i; this.witness(i, j, "take", amt * 0.5); break; }
        const amt = Math.max(0, Math.min(C.amt[c], this.carried[j], this.cap(i) - this.carried[i])); this.carried[j] -= amt; this.carried[i] += amt; caused = amt; this.mind[j].lastTookFromMe = i; this.witness(i, j, "take", amt); break; }
      case ACT.give: { if (C.flag[c] >= 16) { const k = C.flag[c] - 16, NM = this.NMAT; const amt = Math.max(0, Math.min(C.amt[c], this.mat[i * NM + k], this.cap(j) - this.carried[j] - this.held(j))); this.mat[i * NM + k] -= amt; this.mat[j * NM + k] += amt; this.witness(i, j, "give", amt * 0.5); break; }
        const amt = Math.max(0, Math.min(C.amt[c], this.carried[i], this.cap(j) - this.carried[j])); this.carried[i] -= amt; this.carried[j] += amt; const r = m.answered.get(j); m.answered.set(j, { sum: (r && this.turn - r.t <= 10 ? r.sum : 0) + amt * P.eat_value * 0.5, t: this.turn }); this.witness(i, j, "give", amt);
        const pr = m.promOut.find(p => p.target === j); if (pr) { m.promOut.splice(m.promOut.indexOf(pr), 1); this.t(j, i).kept += 1; } break; }
      case ACT.hurt: { const force = C.force[c]; const dmg = this.mystrength(i) * force * this.lossRate(j); this.energy[j] -= dmg; const r = m.answered.get(j); m.answered.set(j, { sum: (r && this.turn - r.t <= 10 ? r.sum : 0) - this.mystrength(i) * force, t: this.turn }); this.witness(i, j, "hurt", dmg); const ts = this.t(i, i); ts.dmg += dmg; ts.hits += 1; caused = dmg; break; }   /* the victim is not dead until the turn ends: struck below zero before their own move, they may still eat */
      case ACT.breed: this.breed(i, j); break;
      case ACT.work: this.chosen = c; this.doWork(i, false); break;
      case ACT.build: this.chosen = c; this.doWork(i, true); break;
      case ACT.drop: { const t = this.idx(this.x[i], this.y[i]); for (let k = 1; k < this.NMAT; k++) { this.res[k][t] += this.mat[i * this.NMAT + k]; this.mat[i * this.NMAT + k] = 0; } break; }
      case ACT.say: { const pl = C.payload[c]; if (pl) this.speak(i, j, pl); break; }
    }
    if (P.learn_words && act !== ACT.give && act !== ACT.take && act !== ACT.raid && act !== ACT.hurt && act !== ACT.stash && !(act === ACT.go && C.payload[c] && C.payload[c].req)) this.creditConcept(i, C.sit[c]);   /* any act seen is a situation seen */
    const sh = Math.max(0, caused - C.harm[c] * 0.5); if (sh > 0) this.energy[i] -= P.guilt_drain * this.guilt[i] * sh / 10;   /* harm done beyond what I expected costs me, by my guilt */
    this.afterAct(i, c);
    if (this.energy[i] <= 0 || this.water[i] <= 0) this.kill(i); }
  // requests fulfilled, trials opened and closed (speech bookkeeping around an act)
  afterAct(i, c) { const C = this.C; const act = C.act[c]; const j = C.target[c]; const m = this.mind[i]; const pl = C.payload[c]; if (!this.resolve) return;
    if (act === ACT.give && j >= 0) { this.resolve(j, i, "give"); if (!this.isChildOf(i, j)) this.openTrial(i, j, "give"); }
    if (act === ACT.take && j >= 0) this.resolve(j, i, "take");
    if (!pl) return;
    if (pl.ask) { let a = m.asked.get(j); if (!a) { a = new Map(); m.asked.set(j, a); } a.set(pl.ask, this.turn); if (pl.ask.startsWith("word")) a.set(pl.ask + "n", (a.get(pl.ask + "n") || 0) + 1);
      if (["tribute", "enforce", "send", "pool", "permit"].includes(pl.ask)) this.openTrial(i, j, "ask", this.askContext(i, j, pl.s)); if (pl.ask === "threat") this.openTrial(i, j, "hurt"); }
    if (pl.wait) m.wait = pl.wait;
    if (pl.req && act === ACT.go && this.x[i] === C.tx[c] && this.y[i] === C.ty[c] && !pl.req.credited) { pl.req.credited = true; this.creditAct(i, -1, "go"); }
    const done = pl.accept || (pl.req && (pl.arrived || act === ACT.hurt || act === ACT.stash || (act === ACT.idle && pl.req.want.act === "forage"))); if (done) { const o = pl.accept || pl.req; const idx = m.offersIn.indexOf(o); if (idx >= 0) m.offersIn.splice(idx, 1); if (this.alive[o.from]) this.resolve(o.from, i, "comply"); } }
  stepToward(i, tx, ty) { const dx = Math.sign(tx - this.x[i]), dy = Math.sign(ty - this.y[i]); this.x[i] = Math.max(0, Math.min(this.W - 1, this.x[i] + dx)); this.y[i] = Math.max(0, Math.min(this.H - 1, this.y[i] + dy)); }
  pickup(i) { const t = this.idx(this.x[i], this.y[i]); if (this.food[t] > 0) { const amt = Math.min(this.food[t], this.cap(i) - this.carried[i]); this.food[t] -= amt; this.carried[i] += amt; }
    if (this.res) for (let k = 1; k < this.NMAT; k++) if (this.res[k][t] > 0) { const amt = Math.max(0, Math.min(this.res[k][t], this.cap(i) - this.carried[i] - this.held(i))); this.res[k][t] -= amt; this.mat[i * this.NMAT + k] += amt; } }
  witness(actor, target, kind, amt) { if (kind === "hurt") this.hitsTaken[target] += amt;
    if (target >= 0 && this.alive[target] && this.isChildOf(actor, target) && (kind === "take" || kind === "hurt")) this.feel(actor, kind, (kind === "hurt" ? amt : amt * P.eat_value * 0.5) * this.kin[actor]);
    if (P.tabula_rasa && target >= 0 && this.alive[target] && !this.isPlayer[target] && (kind === "hurt" || kind === "take")) { const n0 = this.needs(target); if (kind === "hurt") n0[0] += amt; else n0[1] += amt * P.eat_value * 0.5; this.openPassive(target, this.passiveSit(kind === "hurt" ? ACT.hitToMe : ACT.takeToMe, target, actor), n0, actor); }
    if (target >= 0) { this.mind[target].doneToMe.set(actor, { kind, amt, t: this.turn }); }
    for (const w of this.near(actor, P.view_range)) { const t = this.t(w, actor); const isT = w === target; const kinW = target >= 0 && this.isChildOf(w, target); const wt = isT || kinW ? 1 : 0.5; t.seen += wt; t[kind] += wt; if (kind === "hurt") { t.dmg += amt; t.hits += 1; }
      if (!isT) this.observe(w, actor, kind, target);
      if (isT && (kind === "take" || kind === "hurt")) this.feel(w, kind, kind === "hurt" ? amt : amt * P.eat_value * 0.5);
      if (kinW && (kind === "take" || kind === "hurt")) this.feel(w, kind, (kind === "hurt" ? amt : amt * P.eat_value * 0.5) * this.kin[w]); }
    if (target >= 0 && this.alive[target]) { const t = this.t(target, actor); if (t.seen === 0) { t.seen = 1; t[kind] = 1; } }   // the target saw it even if out of grid order
    this.creditAct(actor, target, kind);
    if (this.logEvents) this.log(`A${actor} ${kind} ${amt.toFixed(1)} A${target}`); }
  observe(w, actor, kind, target) { if (!P.tabula_rasa || w === actor) return; const act = kind === "give" ? ACT.give : kind === "hurt" ? ACT.hurt : ACT.take; const sit = sitKey(act, this.relation(w, target), this.ctxOf(w, target)); const m = this.mind[w]; m.pending.push({ sit, t: this.turn, win: Math.max(1, this.horizonOf(w)), vicarious: actor, v0: this.carried[actor], peak: this.carried[actor], weight: 0.5, passive: false, n0: null }); }
  breed(i, j) { const m = this.mind[i]; m.breedWant = { who: j, t: this.turn }; const bw = this.mind[j].breedWant; if (bw && bw.who === i && this.turn - bw.t <= P.breed_window && this.canBreed(i) && this.canBreed(j) && dist(this.x[i], this.y[i], this.x[j], this.y[j]) <= 1 && this.pop < P.max_pop) this.birth(i, j); }
  birth(i, j) { const c = this.spawn(Math.max(0, Math.min(this.W - 1, this.x[i] + rint(3) - 1)), Math.max(0, Math.min(this.H - 1, this.y[i] + rint(3) - 1)), i, j); if (c < 0) return; for (const p of [i, j]) { this.energy[p] -= P.birth_cost / 2; this.carried[p] = Math.max(0, this.carried[p] - P.birth_food / 2); this.bredAt[p] = this.turn; this.mind[p].breedWant = null; for (const e of this.mind[p].pending) if (e.sit >= 0 && Math.floor(e.sit / (NREL * NCTX)) === ACT.breed && !e.child) { e.child = true; e.kids.push([c, 0]); } } this.births = (this.births || 0) + 1; this.log(`A${i} and A${j} had A${c}`); }
  attach(c) { if (this.born[c] <= 0 || this.grown(c) >= 1 || this.isPlayer[c]) return; if (rnd() < (this.grown(c) - 0.5) / 0.5) return; let best = -1, bd = 1e9; for (const p of [this.parent1[c], this.parent2[c]]) { if (p < 0 || !this.alive[p]) continue; const d = dist(this.x[c], this.y[c], this.x[p], this.y[p]); if (d <= P.view_range && d < bd) { bd = d; best = p; } } if (best >= 0 && bd > 1) this.stepToward(c, this.x[best], this.y[best]); }
  work(i) {}
  // ---- speech (minimal port for now: words as raw tokens; full grammar in the next milestone)
  /* speak, creditAct, hear, answer and the speech candidates live in speech.mjs (mixed into the prototype; import index.mjs) */
  creditAct(actor, target, kind) {} creditConcept(actor, skey) {}
  // ---- the turn
  get pop() { let n = 0; for (let i = 0; i < this.count; i++) n += this.alive[i]; return n; }
  log(s) { if (this.logEvents) this.events.push({ t: this.turn, s }); }
  turnStep() { this.turn++; this.rebuildGrid();
    const order = []; for (let i = 0; i < this.count; i++) if (this.alive[i] && !this.isPlayer[i]) order.push(i); for (let k = order.length - 1; k > 0; k--) { const r = rint(k + 1); [order[k], order[r]] = [order[r], order[k]]; }
    for (const i of order) { if (!this.alive[i]) continue; this.perceive(i); const c = this.choose(i); if (c >= 0) this.doAct(i, c); }
    // the world drains
    for (let i = 0; i < this.count; i++) { if (!this.alive[i]) continue; this.energy[i] -= P.base_drain * this.drainRate(i) * this.tileRate(this.idx(this.x[i], this.y[i]), "base_drain"); this.water[i] -= P.water_drain; this.mood[i] = Math.max(0, this.mood[i] - this.moodDrain[i]); if (this.water[i] < 25) this.feel(i, "thirst", P.water_drain * P.horizon); if (this.energy[i] < 25) this.feel(i, "hunger", P.base_drain * P.horizon);
      const m = this.mind[i]; for (const t of m.tally.values()) t.decay(P.memory_decay); for (const [k, v] of m.threats) m.threats.set(k, v * 0.95); this.hitsTaken[i] *= 0.7; if (this.speechTurn) this.speechTurn(i);
      m.events = m.events.filter(ev => this.turn - ev.t <= 2 * P.social_horizon); m.pending = m.pending.filter(e => !(e.vicarious !== undefined) || this.turn - e.t < e.win || this.closeVicarious(i, e));
      if (P.tabula_rasa) this.closeEffects(i);
      if (P.plastic_dials) { const r = this.plasticity[i]; this.reward[i] += (this.reward0[i] - this.reward[i]) * r; this.fear[i] += (this.fear0[i] - this.fear[i]) * r; this.guilt[i] += (this.guilt0[i] - this.guilt[i]) * r; this.reward[i] = Math.max(0.05, Math.min(1, this.reward[i])); this.fear[i] = Math.max(0.05, Math.min(1, this.fear[i])); this.guilt[i] = Math.max(0.05, Math.min(1, this.guilt[i])); }
      this.attach(i); if (rnd() < this.frailty(i)) { this.kill(i); continue; } if (this.energy[i] <= 0 || this.water[i] <= 0) this.kill(i); }
    for (const t of this.foodTiles) this.food[t] = Math.min(P.food_max, this.food[t] + P.food_regrow * P.food_max * (0.3 + 0.7 * rnd()) * this.tileRate(t, "food_regrow") * (this.wet ? 0.15 + 0.85 * this.wet[t] : 1));
    if (this.techTurn) this.techTurn(); }
  closeVicarious(i, e) { const v = e.vicarious; if (this.alive[v]) e.peak = Math.max(e.peak, this.carried[v]); const o = this.lesson(i, e.sit); if (!this.alive[v]) { this.L[o] += 0.5; this.L[o + 1] -= 0.5 * P.death_worth; this.L[o + 5] += 0.5 * P.death_worth; return false; } const dv = (e.peak - e.v0) * P.eat_value * 0.5 - this.hitsTaken[v]; this.L[o] += e.weight; this.L[o + 2] += e.weight * dv; this.L[o + 5] += e.weight * Math.max(0, -dv); return false; }
}
