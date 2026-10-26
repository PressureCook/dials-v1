"""Dials v1. See SPEC.md.

Minimal ingredients: need, actions (idle/take/give/hurt/signal + move), three dials,
memory with promises, recognition. One decision equation. Hot states from prediction
error. Everything else must emerge.

Run:  python3 dials.py [--turns N] [--agents N] [--seed S] [--render] [--log]
"""
from __future__ import annotations
import argparse, math, random
from dataclasses import dataclass, field
from typing import Optional

# ---------------------------------------------------------------- parameters
P = dict(
    W=24, H=24,
    food_tiles=30, food_max=10.0, food_regrow=0.07,   # per tile per turn
    eat_value=3.0,          # energy per food unit
    base_drain=1.0,
    act_cost=0.6,           # energy cost of any non idle action
    hurt_cost=1.0, hurt_damage=12.0,
    carry_cap=8.0,
    view_range=4,
    memory_decay=0.97,
    hot_gain=0.08, hot_decay=0.80,
    guilt_drain=0.5,        # energy drained per unit of unexpected harm caused * guilt
    promise_window=6,
    horizon=10,             # turns ahead that "future energy" is valued over
    stranger_prior=dict(take=0.15, give=0.05, hurt=0.05),
)

# ---------------------------------------------------------------- data
@dataclass
class Tally:
    """What one individual has done, as decaying rates (per observed turn)."""
    take: float = 0.0
    give: float = 0.0
    hurt: float = 0.0
    kept: float = 0.0
    broke: float = 0.0
    seen: float = 0.0       # weight of evidence
    last_seen: int = 0

    def decay(self, k: float):
        for f in ("take", "give", "hurt", "kept", "broke", "seen"):
            setattr(self, f, getattr(self, f) * k)

    def rate(self, f: str, prior: float) -> float:
        w = min(self.seen, 10.0) / 10.0
        v = getattr(self, f) / self.seen if self.seen > 0 else prior
        return w * v + (1 - w) * prior

    def credibility(self) -> float:
        n = self.kept + self.broke
        return 0.5 if n == 0 else (self.kept + 0.5) / (n + 1.0)


@dataclass
class Promise:
    speaker: int
    target: int
    amount: float
    due: int


@dataclass
class Sentence:
    """WHO ACTION WHOM AMOUNT TIME [cond] [neg]. v1 uses three shapes."""
    kind: str               # promise | threat | gossip
    who: int
    action: str
    whom: int               # agent id, or -1 for 'you'
    amount: float = 0.0
    about: int = -1         # gossip subject


@dataclass
class Agent:
    id: int
    x: int
    y: int
    reward: float
    fear: float
    guilt: float
    energy: float = 70.0
    carried: float = 0.0
    alive: bool = True
    born: int = 0
    died: int = -1
    # memory
    tally: dict = field(default_factory=dict)        # id -> Tally
    promises_out: list = field(default_factory=list)
    promises_in: list = field(default_factory=list)
    known_food: dict = field(default_factory=dict)   # (x,y) -> last seen amount
    known_stash: dict = field(default_factory=dict)  # (x,y) -> (owner, amount)
    seen_tiles: set = field(default_factory=set)
    threats: dict = field(default_factory=dict)      # id -> credibility-weighted threat
    # hot state (multipliers on dials)
    hot_r: float = 0.0
    hot_f: float = 0.0
    hot_g: float = 0.0
    predicted_delta: float = 0.0
    last_action: str = "idle"
    said: dict = field(default_factory=dict)         # listener id -> {kind: turn}
    counts: dict = field(default_factory=lambda: dict(
        idle=0, forage=0, explore=0, eat=0, stash=0, unstash=0,
        take=0, give=0, hurt=0, promise=0, threat=0, gossip=0))

    # effective dials for this turn
    def R(self): return min(1.0, self.reward * (1 + self.hot_r))
    def F(self): return min(1.0, self.fear * (1 + self.hot_f))
    def G(self): return min(1.0, self.guilt * (1 + self.hot_g))

    def t(self, other: int) -> Tally:
        return self.tally.setdefault(other, Tally())

    def label(self):
        return f"A{self.id}(r{self.reward:.1f} f{self.fear:.1f} g{self.guilt:.1f})"


# ---------------------------------------------------------------- world
class World:
    def __init__(self, n_agents: int, seed: int = 0, dial_sampler=None):
        self.rng = random.Random(seed)
        self.turn = 0
        self.W, self.H = P["W"], P["H"]
        self.food: dict = {}
        self.stash: dict = {}      # (x,y) -> {owner: amount}
        while len(self.food) < P["food_tiles"]:
            pos = (self.rng.randrange(self.W), self.rng.randrange(self.H))
            self.food[pos] = self.rng.uniform(2, P["food_max"])
        self.agents: list[Agent] = []
        for i in range(n_agents):
            d = dial_sampler(self.rng) if dial_sampler else (
                self.rng.random(), self.rng.random(), self.rng.random())
            self.agents.append(Agent(i, self.rng.randrange(self.W),
                                     self.rng.randrange(self.H), *d))
        self.events: list[str] = []
        self.log_enabled = False

    # ---- helpers
    def dist(self, a, b) -> int:
        return max(abs(a[0] - b[0]), abs(a[1] - b[1]))

    def in_range(self, a: Agent, pos) -> bool:
        return self.dist((a.x, a.y), pos) <= P["view_range"]

    def nearby_agents(self, a: Agent, r=None):
        r = P["view_range"] if r is None else r
        return [b for b in self.agents if b.alive and b is not a
                and self.dist((a.x, a.y), (b.x, b.y)) <= r]

    def adjacent(self, a: Agent):
        return self.nearby_agents(a, 1)

    def log(self, s: str):
        if self.log_enabled:
            self.events.append(f"t{self.turn:04d} {s}")

    # ---- perception (this is the only thing a first-person view may use)
    def agent_view(self, a: Agent) -> dict:
        tiles = {}
        for dx in range(-P["view_range"], P["view_range"] + 1):
            for dy in range(-P["view_range"], P["view_range"] + 1):
                p = (a.x + dx, a.y + dy)
                if 0 <= p[0] < self.W and 0 <= p[1] < self.H:
                    tiles[p] = self.food.get(p, 0.0)
        others = [(b.id, b.x, b.y, b.carried, b.energy < 25) for b in self.nearby_agents(a)]
        return dict(me=(a.x, a.y, a.energy, a.carried), tiles=tiles, agents=others)

    def perceive(self, a: Agent):
        v = self.agent_view(a)
        for p, amt in v["tiles"].items():
            a.seen_tiles.add(p)
            if amt > 0:
                a.known_food[p] = amt
            elif p in a.known_food:
                a.known_food[p] = 0.0
        for (bid, *_rest) in v["agents"]:
            a.t(bid).last_seen = self.turn

    # ---- other minds: predict what b would do to a
    def p_take(self, a: Agent, b: Agent) -> float:
        return a.t(b.id).rate("take", P["stranger_prior"]["take"]) if a.t(b.id).seen > 0 \
            else self.stranger_rate(a, "take")

    def p_hurt(self, a: Agent, b: Agent) -> float:
        base = a.t(b.id).rate("hurt", P["stranger_prior"]["hurt"]) if a.t(b.id).seen > 0 \
            else self.stranger_rate(a, "hurt")
        return min(1.0, base + a.threats.get(b.id, 0.0))

    def p_give(self, a: Agent, b: Agent) -> float:
        return a.t(b.id).rate("give", P["stranger_prior"]["give"]) if a.t(b.id).seen > 0 \
            else self.stranger_rate(a, "give")

    def stranger_rate(self, a: Agent, f: str) -> float:
        """A stranger is the average of everyone met so far (out-group effects live here)."""
        ts = [t for t in a.tally.values() if t.seen > 0]
        if not ts:
            return P["stranger_prior"][f]
        return sum(t.rate(f, P["stranger_prior"][f]) for t in ts) / len(ts)

    def future_value(self, a: Agent, food: float) -> float:
        """Energy that a quantity of food is worth over the horizon, with diminishing use."""
        need = max(0.0, 100.0 - a.energy) + P["base_drain"] * P["horizon"]
        return min(food * P["eat_value"], need)

    # ---- candidate actions: (name, gain, cost, loss, harm, payload)
    def candidates(self, a: Agent):
        C = []
        near = self.nearby_agents(a)
        adj = self.adjacent(a)
        threat_here = sum(self.p_take(a, b) * a.carried + self.p_hurt(a, b) * P["hurt_damage"]
                          for b in adj)
        # omission harm: adjacent agents who will starve if nobody gives
        starving = [b for b in adj if b.energy < 20]
        omission = sum(min(a.carried, 20 - b.energy) for b in starving) if a.carried > 0 else 0.0

        # starvation risk: a loss that attaches to every action that does not feed me
        starve = max(0.0, (30.0 - a.energy - a.carried * P["eat_value"])) * 0.5
        C.append(("idle", 0.0, 0.0, threat_here + starve, omission, None))

        if a.carried > 0 and a.energy < 95:
            amt = min(a.carried, 100 - a.energy)
            urgency = 1.0 + 2.0 * (1.0 - a.energy / 100.0)   # food matters more when low
            C.append(("eat", amt * P["eat_value"] * urgency, P["act_cost"] * 0.3, threat_here * 0.5, omission, amt))

        # forage: nearest known food (incl. own stash)
        best = None
        for p, amt in list(a.known_food.items()) + [
                (p, s.get(a.id, 0.0)) for p, s in self.stash.items() if a.id in s]:
            if amt <= 0.1:
                continue
            d = self.dist((a.x, a.y), p)
            room = P["carry_cap"] - a.carried
            if room < 0.2:
                continue
            val = self.future_value(a, min(amt, room)) * 0.8 * (0.92 ** d)
            # contested: others nearer to that tile may take it first
            rivals = sum(1 for b in near if self.dist((b.x, b.y), p) < d)
            val *= 0.75 ** rivals
            if best is None or val > best[0]:
                best = (val, p, d)
        if best and best[0] > 0.05:
            val, p, d = best
            loss = sum(self.p_hurt(a, b) * P["hurt_damage"] * 0.5 for b in near
                       if self.dist((b.x, b.y), p) <= 1)
            name = "unstash" if (p in self.stash and a.id in self.stash[p] and p not in self.food) else "forage"
            C.append((name, val, P["act_cost"], loss, omission, p))

        # explore: unseen tile at the edge of view
        unseen = [(a.x + dx, a.y + dy) for dx in range(-P["view_range"] - 1, P["view_range"] + 2)
                  for dy in range(-P["view_range"] - 1, P["view_range"] + 2)
                  if 0 <= a.x + dx < self.W and 0 <= a.y + dy < self.H
                  and (a.x + dx, a.y + dy) not in a.seen_tiles]
        if unseen:
            seen_food = sum(1 for p in a.seen_tiles if a.known_food.get(p, 0) > 0.1)
            prior = max(0.3, P["food_tiles"] / (self.W * self.H)) if not a.seen_tiles \
                else max(0.05, seen_food / len(a.seen_tiles))
            expect = prior * P["food_max"] * 0.5 * 0.85 ** 2
            tgt = self.rng.choice(unseen)
            C.append(("explore", self.future_value(a, expect), P["act_cost"], threat_here * 0.3 + starve * 0.5 + 1.0, omission, tgt))

        # stash: carrying full and standing on a tile
        if a.carried >= P["carry_cap"] - 0.01:
            watchers = len(near)
            risk = sum(self.p_take(a, b) for b in near) * a.carried * 0.5
            C.append(("stash", a.carried * 0.6, P["act_cost"] * 0.5, risk, 0.0, (a.x, a.y)))

        for b in adj:
            tb = a.t(b.id)
            # take from b
            if b.carried > 0.1 and P["carry_cap"] - a.carried > 0.2:
                amt = min(b.carried, P["carry_cap"] - a.carried)
                if amt > 0.1:
                    retaliation = self.p_hurt(a, b) * P["hurt_damage"] + a.threats.get(b.id, 0) * P["hurt_damage"]
                    # standing: others who see me take will trust me less (future gives lost)
                    standing = sum(self.p_give(a, c) for c in near if c is not b) * 2.0
                    harm = min(amt, b.energy)  # what b loses, as they would feel it
                    if tb.rate("take", 0) > 0.3 or tb.rate("hurt", 0) > 0.2:
                        harm *= 0.3           # they did it to me: guilt discounted
                    C.append(("take", self.future_value(a, amt), P["act_cost"], retaliation + standing, harm, (b, amt)))
            # give to b
            if a.carried > 0.5:
                amt = min(a.carried, 3.0)
                expected_return = self.p_give(a, b) * amt * 1.5 + tb.credibility() * 0.5
                prevented = min(amt, max(0.0, 25 - b.energy)) if b.energy < 25 else 0.0
                owed = sum(pr.amount for pr in a.promises_out if pr.target == b.id)
                harm_prevented = prevented + (owed * 0.5)
                C.append(("give", expected_return, P["act_cost"], 0.0, omission - harm_prevented, (b, amt)))
            # hurt b
            gain_h = 0.0
            if tb.rate("take", 0) > 0.2 or tb.rate("hurt", 0) > 0.1:
                gain_h += 6.0            # deterring a known predator protects future food
            gain_h += b.carried * 0.4    # they drop food
            retaliation = self.p_hurt(a, b) * P["hurt_damage"] * 1.5
            harm = P["hurt_damage"]
            if tb.rate("hurt", 0) > 0.1 or tb.rate("take", 0) > 0.3:
                harm *= 0.3
            C.append(("hurt", gain_h, P["hurt_cost"], retaliation, harm, b))

        # signals (cheap, aimed at agents in range)
        if near:
            b = self.rng.choice(near)
            tb = a.t(b.id)
            # a sentence the listener heard recently moves their tally less, so repeating is worth less
            def fresh(kind):
                last = a.said.get(b.id, {}).get(kind)
                return 1.0 if last is None else min(1.0, (self.turn - last) / 12)
            if a.carried > 1.0:
                C.append(("threat", self.p_take(a, b) * a.carried * 0.6 * fresh("threat"), P["act_cost"] * 0.2, starve, 0.0, b))
            if a.carried > 1.0 and not any(pr.target == b.id for pr in a.promises_out):
                C.append(("promise", (self.p_give(a, b) * 2.0 + 0.3) * fresh("promise"), P["act_cost"] * 0.2, starve, 0.0, (b, 2.0)))
            wrong = [cid for cid, t in a.tally.items() if t.rate("take", 0) > 0.3 or t.rate("hurt", 0) > 0.2]
            if wrong:
                C.append(("gossip", 0.8 * fresh("gossip"), P["act_cost"] * 0.2, starve, 0.0, (b, self.rng.choice(wrong))))
        return C

    def choose(self, a: Agent):
        best, best_s = None, -1e9
        for (name, gain, cost, loss, harm, payload) in self.candidates(a):
            s = a.R() * gain - cost - a.F() * loss - a.G() * harm
            s += self.rng.uniform(-0.05, 0.05)  # tie breaking noise only
            if s > best_s:
                best, best_s = (name, gain, cost, loss, harm, payload), s
        return best

    # ---- execution
    def step_toward(self, a: Agent, p):
        a.x += (p[0] > a.x) - (p[0] < a.x)
        a.y += (p[1] > a.y) - (p[1] < a.y)

    def execute(self, a: Agent, act):
        name, gain, cost, loss, harm, payload = act
        a.last_action = name
        a.counts[name] += 1
        a.energy -= cost
        caused = 0.0
        if name == "idle":
            pass
        elif name == "eat":
            amt = max(0.0, min(payload, a.carried, 100.0 - a.energy))
            a.carried -= amt; a.energy = min(100.0, a.energy + amt * P["eat_value"])
        elif name in ("forage", "unstash"):
            if (a.x, a.y) == payload:
                room = P["carry_cap"] - a.carried
                if payload in self.food and self.food[payload] > 0:
                    amt = min(self.food[payload], room)
                    self.food[payload] -= amt; a.carried += amt
                    a.known_food[payload] = self.food[payload]
                if payload in self.stash and a.id in self.stash[payload]:
                    amt = min(self.stash[payload][a.id], P["carry_cap"] - a.carried)
                    self.stash[payload][a.id] -= amt; a.carried += amt
                    if self.stash[payload][a.id] <= 0.01:
                        del self.stash[payload][a.id]
            else:
                self.step_toward(a, payload)
        elif name == "explore":
            self.step_toward(a, payload)
        elif name == "stash":
            self.stash.setdefault(payload, {})
            self.stash[payload][a.id] = self.stash[payload].get(a.id, 0.0) + a.carried
            for w in self.nearby_agents(a):
                w.known_stash[payload] = (a.id, self.stash[payload][a.id])
            a.carried = 0.0
        elif name == "take":
            b, amt = payload
            amt = max(0.0, min(amt, b.carried, P["carry_cap"] - a.carried))
            if amt > 0.05:
                b.carried -= amt; a.carried += amt
                caused = amt
                self.witness(a, b, "take", amt)
                self.log(f"{a.label()} TOOK {amt:.1f} from {b.label()}")
        elif name == "give":
            b, amt = payload
            amt = max(0.0, min(amt, a.carried, P["carry_cap"] - b.carried))
            if amt > 0.05:
                a.carried -= amt; b.carried += amt
                self.witness(a, b, "give", amt)
                for pr in list(a.promises_out):
                    if pr.target == b.id:
                        a.promises_out.remove(pr)
                        b.promises_in = [q for q in b.promises_in if q.speaker != a.id]
                        b.t(a.id).kept += 1
                        self.log(f"{a.label()} KEPT promise to {b.label()}")
                self.log(f"{a.label()} GAVE {amt:.1f} to {b.label()}")
        elif name == "hurt":
            b = payload
            b.energy -= P["hurt_damage"]
            drop = b.carried * 0.5
            b.carried -= drop
            self.food[(b.x, b.y)] = self.food.get((b.x, b.y), 0.0) + drop
            caused = P["hurt_damage"]
            self.witness(a, b, "hurt", P["hurt_damage"])
            self.log(f"{a.label()} HURT {b.label()}")
        elif name == "threat":
            b = payload
            a.said.setdefault(b.id, {})["threat"] = self.turn
            cred = b.t(a.id).credibility()
            b.threats[a.id] = min(1.0, b.threats.get(a.id, 0) + 0.3 * cred)
            self.log(f"{a.label()} THREATENED {b.label()}")
        elif name == "promise":
            b, amt = payload
            a.said.setdefault(b.id, {})["promise"] = self.turn
            pr = Promise(a.id, b.id, amt, self.turn + P["promise_window"])
            a.promises_out.append(pr); b.promises_in.append(pr)
            self.log(f"{a.label()} PROMISED {amt:.0f} to {b.label()}")
        elif name == "gossip":
            b, about = payload
            a.said.setdefault(b.id, {})["gossip"] = self.turn
            cred = b.t(a.id).credibility()
            ta, tb = a.t(about), b.t(about)
            tb.seen += cred; tb.take += cred * ta.rate("take", 0); tb.hurt += cred * ta.rate("hurt", 0)
            self.log(f"{a.label()} GOSSIPED to {b.label()} about A{about}")
        return caused, harm

    def witness(self, actor: Agent, target: Agent, kind: str, amt: float):
        """Everyone in range of the actor records the act. Target records it most."""
        for w in self.agents:
            if not w.alive or w is actor:
                continue
            if self.dist((w.x, w.y), (actor.x, actor.y)) <= P["view_range"]:
                t = w.t(actor.id)
                weight = 1.0 if w is target else 0.5
                t.seen += weight
                setattr(t, kind, getattr(t, kind) + weight)
                if w is target and kind in ("take", "hurt"):
                    w.predicted_delta -= amt   # unexpected loss registers in hot state

    # ---- turn
    def tick(self):
        self.turn += 1
        order = [a for a in self.agents if a.alive]
        self.rng.shuffle(order)
        snapshot = {a.id: a.energy for a in order}
        acts = {}
        for a in order:
            self.perceive(a)
            # decay memory
            for t in a.tally.values():
                t.decay(P["memory_decay"])
            for k in list(a.threats):
                a.threats[k] *= 0.95
            act = self.choose(a)
            acts[a.id] = act
            a.predicted_delta = (a.R() * act[1] - act[2] - P["base_drain"]) * 0.3
        for a in order:
            if not a.alive:
                continue
            caused, expected_harm = self.execute(a, acts[a.id])
            # unexpected harm caused: guilt spikes and drains
            surprise_h = max(0.0, caused - expected_harm * 0.5)
            if surprise_h > 0:
                a.hot_g += P["hot_gain"] * surprise_h / 10
                a.energy -= P["guilt_drain"] * a.G() * surprise_h / 10
        for a in order:
            a.energy -= P["base_drain"]
            # broken promises
            for pr in list(a.promises_out):
                if self.turn > pr.due:
                    a.promises_out.remove(pr)
                    b = self.agents[pr.target]
                    b.promises_in = [q for q in b.promises_in if q.speaker != a.id]
                    b.t(a.id).broke += 1
                    self.log(f"{a.label()} BROKE promise to {b.label()}")
            # hot state from prediction error
            actual = a.energy - snapshot[a.id]
            err = actual - a.predicted_delta
            if err < -1.0:
                a.hot_f += P["hot_gain"] * min(3.0, -err / 5)
            elif err > 1.0:
                a.hot_r += P["hot_gain"] * min(3.0, err / 5)
            a.hot_r *= P["hot_decay"]; a.hot_f *= P["hot_decay"]; a.hot_g *= P["hot_decay"]
            if a.energy <= 0:
                a.alive = False; a.died = self.turn
                self.food[(a.x, a.y)] = self.food.get((a.x, a.y), 0.0) + a.carried
                self.log(f"{a.label()} DIED")
        for p in list(self.food):
            self.food[p] = min(P["food_max"], self.food[p] + P["food_regrow"] * P["food_max"] * (0.3 + 0.7 * self.rng.random()))

    # ---- observer render (not available to agents)
    def world_view(self) -> str:
        grid = [["." for _ in range(self.W)] for _ in range(self.H)]
        for (x, y), amt in self.food.items():
            if amt > 0.5:
                grid[y][x] = "," if amt < 4 else ":" if amt < 8 else "#"
        for (x, y) in self.stash:
            if self.stash[(x, y)]:
                grid[y][x] = "$"
        for a in self.agents:
            if a.alive:
                grid[a.y][a.x] = chr(ord("a") + a.id % 26) if a.energy > 30 else chr(ord("A") + a.id % 26)
        return "\n".join("".join(r) for r in grid)

    def summary(self) -> str:
        lines = [f"turn {self.turn}: alive {sum(a.alive for a in self.agents)}/{len(self.agents)}"]
        for a in sorted(self.agents, key=lambda a: (-a.alive, -a.energy)):
            c = a.counts
            lines.append(f"  {a.label():22s} {'alive' if a.alive else f'died t{a.died}':10s} "
                         f"E{a.energy:5.1f} C{a.carried:4.1f} | idle {c['idle']:3d} eat {c['eat']:3d} forage {c['forage']:3d} "
                         f"explore {c['explore']:3d} take {c['take']:3d} give {c['give']:3d} hurt {c['hurt']:3d} "
                         f"thr {c['threat']:2d} prom {c['promise']:2d} gos {c['gossip']:2d}")
        return "\n".join(lines)


# ---------------------------------------------------------------- run
def archetypes(rng):
    """Mixed population for v1 tests: random dials with a few extremes guaranteed."""
    return (round(rng.random(), 1), round(rng.random(), 1), round(rng.random(), 1))


def stats(seeds=20, turns=300, agents=16):
    """Does each dial do what the theory says? Pearson r of dial vs behaviour across agents."""
    rows = []
    for sd in range(seeds):
        w = World(agents, sd, archetypes)
        for _ in range(turns):
            w.tick()
        for a in w.agents:
            c = a.counts
            acts = sum(c.values()) or 1
            rows.append(dict(reward=a.reward, fear=a.fear, guilt=a.guilt,
                             survived=float(a.alive), lifespan=(a.died if a.died > 0 else turns),
                             idle=c["idle"] / acts, take=c["take"] / acts, hurt=c["hurt"] / acts,
                             give=c["give"] / acts, explore=c["explore"] / acts,
                             signal=(c["threat"] + c["promise"] + c["gossip"]) / acts))

    def r(x, y):
        n = len(x); mx, my = sum(x) / n, sum(y) / n
        sx = math.sqrt(sum((v - mx) ** 2 for v in x)); sy = math.sqrt(sum((v - my) ** 2 for v in y))
        return 0.0 if sx == 0 or sy == 0 else sum((p - mx) * (q - my) for p, q in zip(x, y)) / (sx * sy)
    print(f"{seeds} seeds x {agents} agents, {turns} turns. correlation (dial vs behaviour):")
    print(f"{'':10s}" + "".join(f"{k:>10s}" for k in ("survived", "lifespan", "idle", "take", "hurt", "give", "explore", "signal")))
    for d in ("reward", "fear", "guilt"):
        print(f"{d:10s}" + "".join(f"{r([q[d] for q in rows], [q[k] for q in rows]):10.2f}"
                                   for k in ("survived", "lifespan", "idle", "take", "hurt", "give", "explore", "signal")))
    print(f"overall survival {sum(q['survived'] for q in rows)/len(rows):.2f}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--turns", type=int, default=300)
    ap.add_argument("--agents", type=int, default=16)
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--render", action="store_true")
    ap.add_argument("--log", action="store_true")
    ap.add_argument("--stats", action="store_true")
    args = ap.parse_args()
    if args.stats:
        stats(turns=args.turns, agents=args.agents)
        return
    w = World(args.agents, args.seed, archetypes)
    w.log_enabled = args.log
    for _ in range(args.turns):
        w.tick()
        if args.render and w.turn % 50 == 0:
            print(f"--- turn {w.turn}\n{w.world_view()}")
    if args.log:
        print("\n".join(w.events[-60:]))
    print(w.summary())


if __name__ == "__main__":
    main()
