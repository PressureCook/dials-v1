// Dials engine v2: speech. The grammar, raw-word sentences, per-agent lexicons with coined words, concept words,
// hearing (threats, promises, offers, requests, teaching, reports, word questions), requests and trials, and the speech candidates.
// Mixed into World.prototype. Sentences travel as raw words; each listener reads them with its own lexicon.
import { P } from "./params.mjs";
import { World, ACT, ACT_NAME, REL, NSIT, sitKey, rnd, rint, dist } from "./engine.mjs";

export const COINED = new Map();   // every coined word -> what its coiner meant (the engine's record; agents only ever learn it)
const FIXED_ACTS = ["take", "give", "hurt", "stash", "go", "signal", "die", "drink"];
export const PERSON = w => w === "me" || w === "you" || w === "us" || w === "anyone" || w === "everyone" || /^A\d+$/.test(w);
export const ACTION = w => FIXED_ACTS.includes(w) || (w.length === 4 && w.charCodeAt(0) === 120 && w.charCodeAt(1) > 96 && w.charCodeAt(1) < 123 && w.charCodeAt(2) > 96 && w.charCodeAt(2) < 123 && w.charCodeAt(3) > 96 && w.charCodeAt(3) < 123);
export const VALENCE = w => w === "help" || w === "wrong";
export const CONCEPT = w => w.length === 4 && w.charCodeAt(0) === 107 && w.charCodeAt(1) > 96 && w.charCodeAt(1) < 123 && w.charCodeAt(2) > 96 && w.charCodeAt(2) < 123 && w.charCodeAt(3) > 96 && w.charCodeAt(3) < 123;
const ACT_OF = { take: ACT.take, give: ACT.give, hurt: ACT.hurt, stash: ACT.stash, go: ACT.go, drink: ACT.drink };
const resolve = (ref, sp, addr) => ref === "me" ? sp : ref === "you" ? addr : ref;   // "us", "anyone", "everyone" stay symbolic

export function parseClause(words) { const s = { who: null, whom: null, act: null, time: null, neg: false, amt: 0, q: false, place: null, teach: false, valence: 0, concept: null, conceptWord: null }; let actionFirst = false, seenPerson = false;
  for (const w of words) {
    if (PERSON(w)) { const v = /^A\d+$/.test(w) ? +w.slice(1) : w; if (s.who === null) s.who = v; else if (s.whom === null) s.whom = v; seenPerson = true; }
    else if (ACTION(w)) { if (!seenPerson && s.act === null) actionFirst = true; if (s.act === null) s.act = w; }
    else if (VALENCE(w)) s.valence = w === "help" ? 1 : -1;
    else if (w.startsWith("K:")) { if (s.concept === null) s.concept = +w.slice(2); }
    else if (CONCEPT(w)) { if (s.conceptWord === null) s.conceptWord = w; }
    else if (w === "will" || w === "did") s.time = w; else if (w === "not") s.neg = true; else if (w === "?") s.q = true;
    else if (w === "here") s.place = "here"; else if (w === "there") s.place = "there"; else if (/^\d+$/.test(w)) s.amt = +w; }
  if (s.valence && s.act) { s.teach = true; if (s.who !== null && s.whom === null) s.whom = s.who; s.who = "anyone"; s.time = "did"; if (s.whom === null) s.whom = "anyone"; }
  if (!s.valence && actionFirst && s.act && s.who !== null && s.whom === null && s.time !== "will" && !s.q) { s.teach = true; s.valence = s.act === "give" ? 1 : -1; s.whom = s.who; s.who = "anyone"; s.time = "did"; }
  if (s.q && !seenPerson && (s.act || s.concept !== null || s.conceptWord)) s.wordQ = true;
  if (s.who === null) s.who = "me"; if (s.whom === null) s.whom = s.who === "me" ? "you" : "me"; if (s.time === null) s.time = "did"; if (!s.act) s.act = "signal"; return s; }
export function wordsOf(s) { const per = v => typeof v === "number" ? "A" + v : v; const w = [];
  if (s.who === "anyone" && s.time === "did" && s.valence) { w.push(s.act, s.valence > 0 ? "help" : "wrong", per(s.whom)); if (s.amt > 0) w.push(String(Math.round(s.amt))); return w; }
  w.push(per(s.who)); if (s.time) w.push(s.time); if (s.neg) w.push("not"); w.push(s.act); if (s.amt > 0 && (s.act === "give" || s.act === "take" || s.act === "stash")) w.push(String(Math.round(s.amt)));
  if (s.act !== "stash" && !(s.act === "go" && s.place)) w.push(per(s.whom)); if (s.place) w.push(s.placeWord || "there"); if (s.q) w.push("?");
  if (s.cond) w.push("if", ...wordsOf(s.cond)); return w; }
function parseWords(words, there) { const i = words.indexOf("if"); const main = parseClause(i < 0 ? words : words.slice(0, i)); if (i >= 0) main.cond = parseClause(words.slice(i + 1));
  for (const c of [main, main.cond].filter(Boolean)) { if (c.place === "here") c.place = { here: true }; else if (c.place === "there") c.place = there || null; } return main; }

const W = World.prototype;
// ---- lexicon
W.learnWords = function (L, words, act) { const m = this.mind[L]; m.lexV++; const sign = act === "give" || act === "stash" ? "help" : act === "hurt" || act === "take" || act === "die" ? "wrong" : null;
  for (const w of new Set(words)) { if (!ACTION(w) && !VALENCE(w)) continue; let e = m.lexicon.get(w); if (!e) { e = new Map(); m.lexicon.set(w, e); }
    if (VALENCE(w)) { if (sign) e.set(sign, (e.get(sign) || 0) + 1); continue; } e.set(act, (e.get(act) || 0) + 1); if (sign && /^x/.test(w)) e.set(sign, (e.get(sign) || 0) + 1); } };
W.learnConcept = function (L, words, key) { const m = this.mind[L]; m.lexV++; for (const w of new Set(words)) { if (!CONCEPT(w)) continue; let e = m.lexicon.get(w); if (!e) { e = new Map(); m.lexicon.set(w, e); } e.set(key, (e.get(key) || 0) + 1); } };
W.meaning = function (L, w) { if (!P.learn_words) return w; const m = this.mind[L]; const e = m.lexicon.get(w); if (!e) return null; const base = CONCEPT(w) ? m.keyBase : m.actBase; let best = null, bl = 0; for (const [k, n] of e) { if (n < P.word_known) continue; const lift = n / ((base.get(k) || 0) + 1); if (lift > bl) { bl = lift; best = k; } } return best; };
W.understand = function (L, words, sp) { if (!P.learn_words) return words; if (this.isPlayer[L]) return words.map(w => CONCEPT(w) ? (COINED.has(w) ? "K:" + COINED.get(w) : w) : (COINED.get(w) || w)); const out = []; let noise = false; const m = this.mind[L];
  for (const w of words) { if (CONCEPT(w)) { const k = this.meaning(L, w); if (k === null) { noise = true; m.unknown.set(w, { from: sp, t: this.turn }); } else out.push("K:" + k); continue; }
    if (ACTION(w) || VALENCE(w)) { const k = this.meaning(L, w); if (k === null) { noise = true; m.unknown.set(w, { from: sp, t: this.turn }); } else out.push(k); } else out.push(w); } return noise ? null : out; };
W.wordFor = function (i, meaning) { if (!P.learn_words || this.isPlayer[i]) return meaning; const m = this.mind[i]; const cw = m.wordCache.get(meaning); if (cw && cw.v === m.lexV) return cw.w; const w = this.wordFor0(i, meaning); m.wordCache.set(meaning, { w, v: m.lexV }); return w; };
W.wordFor0 = function (i, meaning) { const m = this.mind[i]; let best = null, bn = 0; for (const [w, e] of m.lexicon) { if (this.meaning(i, w) === meaning) { const n = e.get(meaning) || 0; if (n > bn) { bn = n; best = w; } } } if (best) return best;
  if (!m.coined.has(meaning)) { let w; do { w = "x" + String.fromCharCode(97 + rint(26), 97 + rint(26), 97 + rint(26)); } while (COINED.has(w)); COINED.set(w, meaning); m.coined.set(meaning, w); const e = new Map(); e.set(meaning, P.word_known); m.lexicon.set(w, e); } return m.coined.get(meaning); };
W.wordForKey = function (i, key) { const m = this.mind[i]; const ck = "K" + key; const cw = m.wordCache.get(ck); if (cw && cw.v === m.lexV) return cw.w; const w = this.wordForKey0(i, key); m.wordCache.set(ck, { w, v: m.lexV }); return w; };
W.wordForKey0 = function (i, key) { const m = this.mind[i]; let best = null, bn = 0; for (const [w, e] of m.lexicon) { if (CONCEPT(w) && this.meaning(i, w) === key) { const n = e.get(key) || 0; if (n > bn) { bn = n; best = w; } } } if (best) return best;
  const ck = "K" + key; if (!m.coined.has(ck)) { let w; do { w = "k" + String.fromCharCode(97 + rint(26), 97 + rint(26), 97 + rint(26)); } while (COINED.has(w)); COINED.set(w, key); m.coined.set(ck, w); const e = new Map(); e.set(key, P.word_known); m.lexicon.set(w, e); } return m.coined.get(ck); };
W.creditConcept = function (actor, skey) { for (const w of this.near(actor, P.view_range)) { const m = this.mind[w]; const aid = "A" + actor;
    for (const h of m.heardWords) if (this.turn - h.t <= 10 && (h.from === actor || h.to === actor || h.words.includes(aid))) this.learnConcept(w, h.words, skey);
    m.seenActs.push({ who: actor, to: -1, kind: null, key: skey, t: this.turn }); m.keyBase.set(skey, (m.keyBase.get(skey) || 0) + 1); } };
// words mean what follows them: any act seen credits sentences heard around it (from the actor, to the actor, naming the actor)
W.creditAct = function (actor, target, kind) { if (!P.learn_words) return; const skey = this.passiveSit(ACT_OF[kind] !== undefined ? ACT_OF[kind] : ACT.say, actor, target);
  for (const w of this.near(actor, P.view_range)) { const m = this.mind[w]; const aid = "A" + actor;
    for (const h of m.heardWords) { if (this.turn - h.t <= 10 && (h.from === actor || h.to === actor || h.words.includes(aid))) { if (FIXED_ACTS.includes(kind)) this.learnWords(w, h.words, kind); this.learnConcept(w, h.words, skey); } }
    m.seenActs.push({ who: actor, to: target, kind: FIXED_ACTS.includes(kind) ? kind : null, key: skey, t: this.turn });
    if (FIXED_ACTS.includes(kind)) { m.actBase.set(kind, (m.actBase.get(kind) || 0) + 1); const sg = kind === "give" || kind === "stash" ? "help" : kind === "hurt" || kind === "take" || kind === "die" ? "wrong" : null; if (sg) m.actBase.set(sg, (m.actBase.get(sg) || 0) + 1); }
    m.keyBase.set(skey, (m.keyBase.get(skey) || 0) + 1); } };
// ---- groups ("us")
W.inGroup = function (a, b) { if (b === a) return true; if (this.isChildOf(a, b) || this.parent1[a] === b || this.parent2[a] === b) return true; const d = this.mind[a].did.get(b); return !!(d && d.give >= 2); };
W.groupSize = function (a) { let n = 1; for (const [b, d] of this.mind[a].did) if (this.alive[b] && d.give >= 2) n++; for (let k = 0; k < this.count; k++) if (this.alive[k] && (this.isChildOf(a, k) || this.parent1[a] === k || this.parent2[a] === k)) n++; return n; };
// ---- trials: learning whether gifts, hits and requests work, by circumstance
W.ask = function (a, id, kind, ctx) { const m = this.mind[a]; let L = m.lessons; if (!L) { L = new Map(); m.lessons = L; } let sub = L.get(id); if (!sub) { sub = new Map(); L.set(id, sub); } const k = ctx || kind; let l = sub.get(k); if (!l) { l = { n: 0, ok: 0 }; sub.set(k, l); } return l; };
W.askContext = function (a, b, s) { if (!s) return ""; let px = -1, py = -1; if ((s.act === "hurt" || s.act === "go") && typeof s.whom === "number") { const t = s.whom; if (this.alive[t]) { px = this.x[t]; py = this.y[t]; } } else if (s.place && s.place.x !== undefined) { px = s.place.x; py = s.place.y; }
  const kind = s.act + (s.cond ? "+if" : ""); if (px < 0) return kind; const d = dist(this.x[b], this.y[b], px, py); return kind + ":" + (d <= 1 ? "near" : d <= 3 ? "mid" : "far"); };
W.openTrial = function (a, b, kind, ctx) { const m = this.mind[a]; if (!m.trials) m.trials = []; m.trials.push({ b, kind, ctx: ctx || "", t: this.turn, due: this.turn + 10 }); };
W.closeTrial = function (a, tr, ok) { const m = this.mind[a]; m.trials.splice(m.trials.indexOf(tr), 1); for (const id of [tr.b, "all"]) { const l = this.ask(a, id, tr.kind); l.n++; if (ok) l.ok++; if (tr.ctx) { const lc = this.ask(a, id, tr.kind, tr.ctx); lc.n++; if (ok) lc.ok++; } } };
W.resolve = function (a, b, event) { const m = this.mind[a]; if (!m.trials) return; for (const tr of [...m.trials]) { if (tr.b !== b) continue; if (tr.kind === "hurt" && event === "take") this.closeTrial(a, tr, false); if (tr.kind === "give" && event === "give") this.closeTrial(a, tr, true); if (tr.kind === "ask" && event === "comply") this.closeTrial(a, tr, true); } };
W.expireTrials = function (a) { const m = this.mind[a]; if (!m.trials) return; for (const tr of [...m.trials]) if (this.turn > tr.due) this.closeTrial(a, tr, tr.kind === "hurt"); };
W.learned = function (a, b, kind, projection, ctx) { const lp = this.ask(a, b, kind), la = this.ask(a, "all", kind); const wp = Math.min(lp.n, P.impression) / P.impression, wa = Math.min(la.n, P.impression * 2) / (P.impression * 2);
  const personal = lp.n ? lp.ok / lp.n : 0, general = la.n ? la.ok / la.n : 0; let est = wp * personal + (1 - wp) * (wa * general + (1 - wa) * projection);
  if (ctx) { const lc = this.ask(a, "all", kind, ctx); const wc = Math.min(lc.n, P.impression) / P.impression; est = wc * (lc.ok / Math.max(1, lc.n)) + (1 - wc) * (wp * personal + (1 - wp) * projection); } return est; };
W.myCredIn = function (a, b) { const d = this.mind[b].tally.get(a); return d ? d.cred() : 0.5; };
W.pComply0 = function (a, b) { const tb = this.mind[b].tally.get(a); const myGiveRate = tb ? tb.rate("give", 0) : 0; const v = this.myCredIn(a, b) * (0.5 + myGiveRate) * 20 * 1.5 + (this.mind[b].threats.get(a) || 0) * this.mystrength(a); return Math.max(0, Math.min(1, (v - 5) / 15)); };
W.pComply = function (a, b, s) { return this.learned(a, b, "ask", this.pComply0(a, b), this.askContext(a, b, s)); };
W.obligations = function (a) { const m = this.mind[a]; const out = []; for (const o of m.offersIn) { const th = m.threats.get(o.from) || 0; if (th > 0.05) out.push({ o, loss: th * this.dmgOf(a, o.from) }); } return out; };
W.complies = function (c, ob) { const C = this.C; const w = ob.o.want; const pl = C.payload[c]; if (w.place || w.act === "go") return !!(pl && pl.req === ob.o); if (w.act === "hurt") return (C.act[c] === ACT.hurt && C.target[c] === w.target) || (pl && pl.req === ob.o); if (w.act === "give") return C.act[c] === ACT.give && C.flag[c] < 16 && C.target[c] === ob.o.from; return false; };
// ---- speaking
W.speak = function (i, j, payload) { const m = this.mind[i]; let words = payload.words ? payload.words.map(w => VALENCE(w) && !this.isPlayer[i] && payload.words.some(CONCEPT) ? this.wordFor(i, w) : w) : wordsOf(payload.s).map(w => (ACTION(w) || VALENCE(w)) && !this.isPlayer[i] ? this.wordFor(i, w) : w);
  if (j >= 0 && this.alive[j]) { const d0 = Math.min(100 - this.mood[j], this.attention[j]); this.mood[j] += d0; this.stat && (this.stat.attention += d0); }   // attention: being spoken to, whatever is said
  for (const L of this.near(i, P.view_range)) { const ml = this.mind[L]; ml.heardWords.push({ from: i, to: j, words, t: this.turn });
    if (P.learn_words) for (const e of ml.seenActs) { if (this.turn - e.t <= 10 && (e.who === i || e.to === i || words.includes("A" + e.who) || (j >= 0 && (e.who === j || e.to === j)))) { if (e.kind) this.learnWords(L, words, e.kind); if (e.key >= 0) this.learnConcept(L, words, e.key); } }
    const got = this.understand(L, words, i); if (got === null) continue; const heard = parseWords(got, payload.there || null); this.hear(L, i, j, heard); }
  if (this.logEvents) this.log(`A${i} to A${j}: "${words.join(" ")}"`); m.sayT = this.turn; };
W.hear = function (L, sp, addr, s) { if (L === sp) return; const m = this.mind[L]; const c = this.t(L, sp).cred(); let who = resolve(s.who, sp, addr), whom = resolve(s.whom, sp, addr);
  const member = this.inGroup(sp, L); const gsize = Math.min(4, this.groupSize(sp)); if (whom === "us") whom = member ? L : sp; if (who === "us") { who = sp; s = { ...s, groupWeight: gsize }; }
  const ct = Math.max(c, Math.min(1, this.pHurt(L, sp) * 2));
  if (addr === L) { m.heard.push({ from: sp, s, turn: this.turn });
    if (P.tabula_rasa) { const kind = s.act === "hurt" ? 0 : s.act === "give" ? 1 : s.act === "take" ? 2 : 3; const hk = sitKey(ACT.heard, this.relation(L, sp), kind + (s.cond || s.q ? 4 : 0));
      /* learned expectation: what sentences like this have been followed by, felt now; surprise at the outcome closes the ledger like any passive event */
      const o = this.lesson(L, hk); const n = this.L[o]; if (n > 0) { let mean = 0; for (let k = 0; k < 4; k++) mean += this.L[o + 1 + k] / n; const d0 = Math.max(-this.mood[L], Math.min(100 - this.mood[L], Math.max(-20, Math.min(20, mean)))); this.mood[L] += d0; this.stat && (this.stat.expect += d0); }
      this.openPassive(L, hk, this.needs(L), -1); } }
  if (s.q) return;
  if (s.concept !== null && s.valence) { let e = m.toldKey.get(s.concept); if (!e) { e = [0, 0]; m.toldKey.set(s.concept, e); } e[0] += c; e[1] += c * s.valence * (s.amt || 5); return; }
  if (s.act === "die") { if (s.time === "did" && typeof who === "number" && who !== L && c > 0.5 && !this.alive[who]) { m.promOut = m.promOut.filter(p => p.target !== who); m.offersIn = m.offersIn.filter(o => o.from !== who); if (m.trials) m.trials = m.trials.filter(tr => tr.b !== who); } return; }
  if (who === sp && s.time === "will" && !s.neg && s.cond && resolve(s.cond.who, sp, addr) === L && s.act === "give" && whom === L) { m.offersIn = m.offersIn.filter(o => o.from !== sp); m.offersIn.push({ from: sp, give: s.amt || 1, want: s.cond, due: this.turn + P.promise_window }); return; }
  if (who === L && s.time === "will" && !s.neg && s.act === "go") { let place = s.place && s.place.x !== undefined ? { x: s.place.x, y: s.place.y } : (s.place && s.place.here ? { x: this.x[sp], y: this.y[sp] } : null), target = -1;
    if (!place && typeof whom === "number" && whom !== L && this.alive[whom]) { target = whom; place = { x: this.x[whom], y: this.y[whom] }; }
    if (place) { m.offersIn = m.offersIn.filter(o => !(o.from === sp && o.want.act === "go")); m.offersIn.push({ from: sp, give: 0, want: { act: "go", place, target }, due: this.turn + P.promise_window * 3 }); } return; }
  if (who === L && s.time === "will" && !s.neg && s.place && (s.act === "stash" || s.act === "take")) { const place = s.place.x !== undefined ? { x: s.place.x, y: s.place.y } : { x: this.x[sp], y: this.y[sp] }; m.offersIn = m.offersIn.filter(o => !(o.from === sp && o.want.place)); m.offersIn.push({ from: sp, give: 0, want: { act: s.act === "stash" ? "stash" : "forage", place, amt: s.amt || 0 }, due: this.turn + P.promise_window * 2 }); return; }
  if (who === L && s.time === "will" && s.act === "take" && whom === sp && !s.place) { if (s.neg) this.mind[sp].permitted.delete(L); else this.mind[sp].permitted.set(L, this.turn + 200); return; }
  if (who === L && s.time === "will" && !s.neg && s.act === "hurt" && typeof whom === "number" && whom !== L) { m.offersIn = m.offersIn.filter(o => !(o.from === sp && o.want.act === "hurt")); m.offersIn.push({ from: sp, give: 0, want: { act: "hurt", target: whom }, due: this.turn + P.promise_window }); return; }
  if (who === L && s.time === "will" && !s.neg && s.act === "give" && whom === sp) { m.offersIn = m.offersIn.filter(o => o.from !== sp); m.offersIn.push({ from: sp, give: 0, want: { act: "give", amt: s.amt || 1 }, due: this.turn + P.promise_window }); return; }
  if (s.time === "did" && who === "anyone" && ["hurt", "take", "give", "stash", "go", "signal"].includes(s.act) && !s.cond) { const amt = s.amt > 0 ? s.amt : (s.act === "hurt" ? P.hurt_damage : 2 * P.eat_value * 0.5); const bad = s.valence ? s.valence < 0 : s.act !== "give";
    if (bad) { if (m.told[s.act]) this.tell(L, s.act, s.neg ? 0 : amt, c); } else { let g = m.toldGood.get(s.act); if (!g) { g = [0, 0]; m.toldGood.set(s.act, g); } g[0] += c; g[1] += c * (s.neg ? 0 : amt); } return; }
  if (s.time === "did") { if (typeof who === "number" && who !== L && ["take", "give", "hurt"].includes(s.act)) { const t = this.t(L, who); const w = c * (s.neg ? -0.5 : 1) * (whom === L ? 1 : 0.6); t.seen += Math.abs(w); t[s.act] = Math.max(0, t[s.act] + w); } return; }
  if (who === sp) { const aimed = whom === L || whom === "anyone" || whom === "everyone";
    if (s.act === "hurt" && aimed) { const cond = s.cond && resolve(s.cond.who, sp, addr) === L; m.threats.set(sp, Math.max(0, (m.threats.get(sp) || 0) + (s.neg ? -0.3 : 0.3) * ct * (cond ? 1 : 1.3) * (s.groupWeight ? 0.6 + 0.4 * s.groupWeight : 1))); }
    if (s.act === "give" && aimed && !s.neg && whom === L && !this.mind[sp].promOut.some(p => p.target === L)) { const pr = { speaker: sp, target: L, amount: s.amt || 1, due: this.turn + P.promise_window }; this.mind[sp].promOut.push(pr); m.promIn.push(pr); const t = this.t(L, sp); t.give += 0.3 * c; t.seen += 0.3 * c; }
    if (s.act === "take" && aimed) { const t = this.t(L, sp); t.take += 0.3 * c * (s.neg ? -1 : 1); t.seen += 0.3 * c; } return; }
  if (who === "everyone" || who === "anyone") { if (s.act === "hurt" && (whom === L || whom === "anyone")) m.threats.set(sp, Math.max(0, (m.threats.get(sp) || 0) + 0.15 * c * (s.neg ? -1 : 1))); } };
W.answer = function (a, asker, q) { const m = this.mind[a]; const flip = r => r === "me" ? "you" : r === "you" ? "me" : r;
  if (q.wordQ && q.concept !== null) { m.demoKey = { key: q.concept, asker, until: this.turn + 30 }; return null; }
  if (q.wordQ) { m.demo = { word: q.act, asker, until: this.turn + 10, gain: 1 + this.pGive(a, asker) * this.fv(a, 3) * 2 + this.t(a, asker).cred() * 2 }; return { words: [q.act] }; }
  const who = resolve(q.who, asker, a); let truth = null;
  if (q.time === "did" && typeof who === "number") { const t = this.t(a, who); truth = who === a ? null : t.rate(q.act === "signal" ? "give" : q.act, 0) > 0.2; }
  if (truth === null) return null; return { s: { who: flip(q.who), time: q.time, act: q.act, amt: q.amt, whom: flip(q.whom), neg: !truth, q: false } }; };
// ---- request and speech candidates (called from candidates())
W.requestCandidates = function (i, near, adj, H, starve, threatHere) { const m = this.mind[i]; const C = this.C;
  for (const req of m.offersIn) { const w = req.want; const asker = req.from; if (!this.alive[asker]) continue; const g = this.t(i, asker).cred() * (0.5 + this.pGive(i, asker)) * this.fv(i, 3) * 1.5;
    if (w.act === "go") { let px, py; if (w.target >= 0 && near.includes(w.target)) { px = this.x[w.target]; py = this.y[w.target]; } else if (w.place) { px = w.place.x; py = w.place.y; } else continue; const d = dist(this.x[i], this.y[i], px, py);
      if ((w.target >= 0 && d <= 1) || (w.target < 0 && d === 0)) { const c = this.push(ACT.idle, -1, 0, 0, 0, 0, g, 0, 0, 0); if (c >= 0) C.payload[c] = { req, arrived: true }; } else { const c = this.push(ACT.go, -1, px, py, 0, 0, g * Math.pow(0.95, d), P.act_cost, threatHere * 0.3, 0, 6); if (c >= 0) C.payload[c] = { req }; } }
    else if (w.place) { const d = dist(this.x[i], this.y[i], w.place.x, w.place.y);
      if (w.act === "stash") { if (this.carried[i] < 1) continue; const c = d === 0 ? this.push(ACT.stash, -1, 0, 0, this.carried[i], 0, g, P.act_cost * 0.5, 0, 0) : this.push(ACT.go, -1, w.place.x, w.place.y, 0, 0, g * Math.pow(0.9, d), P.act_cost, 0, 0, 6); if (c >= 0) C.payload[c] = { req }; }
      else { if (this.cap(i) - this.carried[i] < 0.2) continue; const amt = this.food[this.idx(w.place.x, w.place.y)]; const c = d === 0 ? this.push(ACT.idle, -1, 0, 0, 0, 0, g + this.fv(i, amt) * 0.8, 0, 0, 0) : this.push(ACT.go, -1, w.place.x, w.place.y, 0, 0, (g + this.fv(i, amt) * 0.8) * Math.pow(0.9, d), P.act_cost, 0, 0, 2); if (c >= 0) C.payload[c] = { req }; } }
    else if (w.act === "hurt") { const t = w.target; if (!near.includes(t) || dist(this.x[i], this.y[i], this.x[t], this.y[t]) <= 1) continue; const c = this.push(ACT.go, t, this.x[t], this.y[t], 0, 0, g * Math.pow(0.85, dist(this.x[i], this.y[i], this.x[t], this.y[t])), P.act_cost, this.pHurt(i, t) * this.dmgOf(i, t) * 0.5, 0); if (c >= 0) C.payload[c] = { req }; } }
  // requests to give and to hurt, weighed on the adjacent candidates already pushed
  for (let c = 0; c < C.n; c++) { const j = C.target[c]; if (j < 0) continue;
    if (C.act[c] === ACT.give && C.flag[c] < 16) { const offer = m.offersIn.find(o => o.from === j && o.want.act === "give"); if (offer) { const tb = this.t(i, j); const amtW = Math.min(this.carried[i], offer.want.amt || 1); if (Math.abs(C.amt[c] - amtW) < 0.5) { C.gain[c] += tb.cred() * (offer.give > 0 ? this.fv(i, offer.give) * 0.8 : (0.5 + this.pGive(i, j)) * this.fv(i, amtW) * 1.5); C.payload[c] = { accept: offer }; } } }
    if (C.act[c] === ACT.hurt) { const req = m.offersIn.find(o => o.want.act === "hurt" && o.want.target === j); if (req && this.alive[req.from]) { const asker = req.from; const allyGain = this.t(i, asker).cred() * (0.5 + this.pGive(i, asker)) * this.fv(i, 3) * 1.5; C.gain[c] += allyGain * C.force[c]; C.harm[c] *= 0.3; C.payload[c] = { req }; } } } };
W.speechCandidates = function (i, near, adj, H, starve, threatHere) { const m = this.mind[i]; const C = this.C; if (!near.length) return;
  /* a sentence's situation is what it asks for (the act named, with or without a condition) and how far that is, as in game.html: a tribute and a promise of a gift share a lesson */
  const sayFlag = (b, s, extra) => { let kind = 8; if (s) kind = s.act === "hurt" ? (s.cond ? 2 : 1) : ({ give: 0, go: 3, stash: 4, take: 5, signal: 6, die: 7 })[s.act] ?? 8;
      let ctx = 3; if (s) { let px = -1, py = -1; if ((s.act === "hurt" || s.act === "go") && typeof s.whom === "number" && this.alive[s.whom]) { px = this.x[s.whom]; py = this.y[s.whom]; } else if (s.place && s.place.x !== undefined) { px = s.place.x; py = s.place.y; } if (px >= 0) { const d = dist(this.x[b], this.y[b], px, py); ctx = d <= 1 ? 0 : d <= 3 ? 1 : 2; } }
      return (kind << 3) | ctx; };
  const say = (b, s, gain, tag, extra) => { const c = this.push(ACT.say, b, 0, 0, 0, 0, gain, P.act_cost * 0.2, starve, 0, sayFlag(b, s, extra)); if (c >= 0) C.payload[c] = Object.assign({ s, ask: tag }, extra || {}); return c; };
  const hz = H > 0 ? H * 0.3 : 1; const askedT = b => { let a = m.asked.get(b); if (!a) { a = new Map(); m.asked.set(b, a); } return a; };
  const infoValue = (b, s, benefit, ctx) => { if (H <= 0) return 0; const lc = this.ask(i, "all", "ask", ctx); const p = this.learned(i, b, "ask", this.pComply0(i, b), ctx); return p * (1 - p) * benefit * H * 0.2 / (1 + lc.n); };
  const propose = (b, s, benefit, tag) => { if (benefit <= 0) return; const at = askedT(b); const cool = { give: 20, hurt: 4, go: 10, stash: 20, take: 20 }[s.act] || 10; if (at.has(tag) && this.turn - at.get(tag) < cool) return; const ctx = this.askContext(i, b, s); const pc = this.learned(i, b, "ask", this.pComply0(i, b), ctx); say(b, s, pc * benefit * hz + infoValue(b, s, benefit, ctx), tag); };
  const lore = this.lore(i);
  for (const b of near) {
    propose(b, { who: "you", time: "will", act: "give", amt: 2, whom: "me" }, this.fv(i, 2), "tribute");
    if (this.carried[i] > 1) propose(b, { who: this.groupSize(i) >= 3 ? "us" : "me", time: "will", act: "hurt", amt: 0, whom: "you", cond: { who: "you", time: "will", act: "give", amt: 2, whom: "me", neg: true } }, this.fv(i, 2) * 0.5, "threat");
    for (const t of near) { if (t === b) continue; const gr = this.grievance(i, t); if (gr <= 0.3) continue; const benefit = 6 + this.carried[i] * 0.4; if (dist(this.x[b], this.y[b], this.x[t], this.y[t]) <= 3) propose(b, { who: "you", time: "will", act: "hurt", amt: 0, whom: t }, benefit, "enforce"); else propose(b, { who: "you", time: "will", act: "go", amt: 0, whom: t }, benefit * 0.6, "send"); }
    if (m.home >= 0 && this.carried[b] >= 3) propose(b, { who: "you", time: "will", act: "stash", amt: 4, whom: "me", place: { x: m.home % this.W, y: Math.floor(m.home / this.W) }, placeWord: "there" }, this.fv(i, Math.min(4, this.carried[b])) * 0.8, "pool");
    for (const k of ["hurt", "take"]) { const kn = this.known(i, k); if (kn <= 0) continue; const at = askedT(b); if (at.has("teach" + k) && this.turn - at.get("teach" + k) < 60) continue; const prob = k === "hurt" ? this.pHurt(i, b) : this.pTake(i, b); say(b, { who: "anyone", time: "did", act: k, amt: Math.round(kn), whom: "you", valence: -1 }, prob * kn * Math.max(1, H) * 0.3, "teach" + k); }
    if (P.tabula_rasa && P.learn_words) { const at = askedT(b); for (const [s, v] of lore.concepts) { if (at.has("concept" + s) && this.turn - at.get("concept" + s) < 100) continue; say(b, null, 1, "concept" + s, { words: [this.wordForKey(i, s), v > 0 ? "help" : "wrong", String(Math.round(Math.abs(v)))], concept: s }); } }
    for (const [k, best] of lore.good) { const at = askedT(b); if (at.has("teachgood" + k) && this.turn - at.get("teachgood" + k) < 60) continue; say(b, { who: "anyone", time: "did", act: k, amt: Math.round(best), whom: "anyone", valence: 1 }, this.pGive(i, b) * best * Math.max(1, H) * 0.2 + (this.isChildOf(i, b) ? 1 : 0), "teachgood" + k); }
    if (H > 0 && !((m.permitted.get(b) || 0) >= this.turn) && this.t(i, b).rate("give", 0) > 0.4) { const at = askedT(b); if (!(at.has("permit") && this.turn - at.get("permit") < 50)) say(b, { who: "you", time: "will", act: "take", amt: 0, whom: "me" }, this.fv(i, 2) * 0.5, "permit"); } }
  const recent = m.heard.filter(h => this.turn - h.turn <= 3); const last = recent.length ? recent[recent.length - 1] : null; const spk = last && near.includes(last.from) ? last.from : -1; const b = spk >= 0 ? spk : near[rint(near.length)];
  if (P.learn_words) for (const [w, u] of m.unknown) { if (this.turn - u.t > 3 || !near.includes(u.from)) continue; const at = askedT(u.from); const n = at.get("word" + w + "n") || 0; if (at.has("word" + w) && this.turn - at.get("word" + w) < 20) continue; const g = 0.25 * this.fv(i, 3) * this.horizonOf(i) / (1 + n); say(u.from, null, g, "word" + w, { words: [w, "?"], wait: { who: u.from, until: this.turn + 10, gain: g } }); }
  if (m.wait && this.turn <= m.wait.until && near.includes(m.wait.who)) { const c = this.push(ACT.idle, -1, 0, 0, 0, 0, m.wait.gain * 0.3, 0, threatHere * 0.3, 0); if (c >= 0) C.payload[c] = { wait: true }; }
  if (last && last.s.q && spk >= 0) { const ans = this.answer(i, spk, last.s); if (ans) { const c = say(spk, ans.s || null, 1 + this.pGive(i, spk) * this.fv(i, 3) * 2 + this.t(i, spk).cred() * 2, null, ans.words ? { words: ans.words, answers: last } : { answers: last }); } }
  if (this.carried[i] > 1) say(b, { who: "me", time: "will", act: "hurt", amt: 0, whom: "you", cond: { who: "you", time: "did", act: "take", amt: 0, whom: "me" } }, this.pTake(i, b) * this.carried[i] * 0.6, null);
  if (this.carried[i] > 1 && !m.promOut.some(p => p.target === b)) say(b, { who: "me", time: "will", act: "give", amt: 2, whom: "you" }, this.pGive(i, b) * 2 + 0.3, null);
  let worst = -1, wg = 0.3; for (const [id, t] of m.tally) { if (id === b || !this.alive[id]) continue; const g = this.grievance(i, id); if (g > wg) { wg = g; worst = id; } }
  if (worst >= 0) say(b, { who: worst, time: "did", act: this.t(i, worst).rate("hurt", 0) > 0.2 ? "hurt" : "take", amt: 0, whom: "me" }, 0.8, null);
  if (this.grievance(i, b) > 0.3) say(b, { who: "you", time: "did", act: this.t(i, b).rate("hurt", 0) > 0.2 ? "hurt" : "take", amt: 0, whom: "me" }, 0.6, null); };
// what I have strong lessons about, refreshed every 10 turns: up to three situations worth |5|, and the best give/stash/go lesson
W.lore = function (i) { const m = this.mind[i]; if (m.loreT !== undefined && this.turn - m.loreT < 10) return m.lore; m.loreT = this.turn; const base = i * NSIT * 6; const concepts = [], good = [];
  for (let s = 0; s < NSIT && concepts.length < 3; s++) { const o = base + s * 6; const n = this.L[o]; if (n < 3) continue; let v = 0; for (let k = 0; k < 4; k++) v += this.L[o + 1 + k]; v /= n; if (Math.abs(v) >= 5) concepts.push([s, v]); }
  for (const k of ["give", "stash", "go"]) { const act = ACT_OF[k]; let best = -Infinity; for (let rel = 0; rel < 8; rel++) for (let ctx = 0; ctx < 8; ctx++) { const o = base + sitKey(act, rel, ctx) * 6; const n = this.L[o]; if (n < 2) continue; let v = 0; for (let q = 0; q < 4; q++) v += this.L[o + 1 + q]; v = v / n - this.L[o + 5] / n; if (v > best) best = v; } if (best > 2) good.push([k, best]); }
  return m.lore = { concepts, good }; };
// per-turn speech bookkeeping
W.speechTurn = function (i) { const m = this.mind[i]; m.heard = m.heard.filter(h => this.turn - h.turn <= 6); m.offersIn = m.offersIn.filter(o => this.turn <= o.due); m.heardWords = m.heardWords.filter(h => this.turn - h.t <= 10); m.seenActs = m.seenActs.filter(e => this.turn - e.t <= 10);
  for (const [w, u] of m.unknown) if (this.turn - u.t > 10) m.unknown.delete(w); this.expireTrials(i);
  for (const pr of [...m.promOut]) if (this.turn > pr.due) { m.promOut.splice(m.promOut.indexOf(pr), 1); if (this.alive[pr.target]) { this.t(pr.target, i).broke += 1; const mt = this.mind[pr.target]; mt.promIn = mt.promIn.filter(p => p !== pr); } }
  if (m.demo && this.turn > m.demo.until) m.demo = null; if (m.demoKey && this.turn > m.demoKey.until) m.demoKey = null; if (m.wait && this.turn > m.wait.until) m.wait = null; };
