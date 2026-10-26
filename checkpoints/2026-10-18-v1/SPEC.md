# Dials v1: specification

Restart of the dial simulation from scratch. Goal: the smallest set of ingredients
(rules and mechanics) that can produce any human behaviour, the way a few ingredients
make any dish. Nothing from the old Dial Society is carried over.

Design rule: every ingredient earns its place only if there is a behaviour that cannot
exist without it. Rule changes may only change what agents are *capable* of. Anything
that changes a *decision* must go through the three dials.

## Ingredients

1. **Need.** One stat, energy, 0 to 100. Base drain every turn. Death at 0.
   Food tiles in the world replenish slowly; there is never enough for everyone.
2. **Actions.** idle, take, give, hurt, signal. (Move is a physical primitive needed
   on a grid, not a behaviour; it is how take reaches a target.)
   Every action except idle costs energy above the base drain.
3. **Dials.** reward, fear, guilt, each 0 to 1, fixed for life. The only personality.
4. **Memory.** Per known individual: a decaying tally of what they did (took, gave,
   hurt, kept promises, broke promises), plus open promises made and received.
5. **Recognition.** Every agent has an identity; agents remember identities seen in range.

Two rules:
- Agents assume everyone else runs the same equation, and estimate others from their tally.
- Agents perceive actions and *carried* holdings within a range. Stashed holdings are
  known only to agents who saw the stash happen.

## The decision

For each candidate action:

    score = reward * predicted_gain
          - action_cost
          - fear   * predicted_loss
          - guilt  * predicted_harm

Highest score wins. Nothing else decides.

- **gain** = predicted improvement to my future energy (food now, food held, a return
  from an ally, information about unseen tiles, standing that makes others give or
  not take).
- **loss** = predicted drop in my future energy (retaliation, being taken from, running
  out).
- **harm** = guilt is my equation run for the other agent: the drop in their predicted
  future energy that my action causes *or that my idling allows* (omission counts;
  this is where empathy lives).
- Reward is **willingness to spend energy for predicted gain**. Because every action
  costs energy, high reward is not strictly better: in a poor world high reward agents
  starve chasing thin margins while low reward agents sit still and survive.

## What the dials are (restated after the from scratch runs)

Reward, fear and guilt are coefficients on experienced outcomes. Gain and loss are what
happened to me after I acted, learned per situation. Harm is what I know an act feels
like from having had it done to me: being hurt teaches what hurting does, being robbed
what robbing does, going hungry what leaving someone hungry does. Nothing is known in
advance. Guilt without that experience is inert; empathy is memory projected onto
another. Measured: high guilt agents hit at 0.6 per 100 turns until first hurt, then
never; low guilt agents 3.0 before and 1.2 after (fear learning the loss).

## Hot states

Each turn the agent compares what it predicted would happen to what did.
- Unexpected loss: fear temporarily scaled up (panic / flinch).
- Unexpected gain: reward temporarily scaled up (running hot).
- Unexpected harm caused: guilt scaled up and energy drained (feeling bad costs).
Scaling decays back to base over a few turns. Anger falls out: being hurt is an
unexpected loss, the attacker's tally drops hard, and whether the agent hits back or
flees depends on its base fear.

## Signal grammar

Words, in any order: me, you, A#, anyone, everyone, will, did, not, if, ?, take, give,
hurt, stash, go, signal, here, there, numbers. The listener reads roles by convention
(first person word is the subject, second the object; an action before any person is a
statement about the action, so "hurt me" means hurt wrongs me). The structure below is
what the listener extracts, not what the speaker must say.

A sentence is: WHO ACTION WHOM AMOUNT TIME [if SENTENCE] [not] [?]
- WHO / WHOM: me, you, named agent, anyone, everyone
- ACTION: take, give, hurt, signal
- TIME: did, will
Eight parts. Produces promises, threats, gossip, rules, offers, teaching, flattery,
and plenty of meaningless babble (which is allowed; cheap meaningless signals may
become small talk). Any sentence can be false.

The grammar also has an optional PLACE slot (here, or a tile the speaker points at),
so sentences can refer to locations: "you will stash 4 here", "you will take from
there". Two sentences make "get food there and stash here".

Receivers weight a speaker's words by that speaker's kept/broke record and, for
threats, by the speaker's seen violence. The game implements the full grammar; the
AIs compose threats, promises, reports, complaints, answers and permissions from it.

## Holdings

Carry limit on the person. Food above the limit must be stashed on a tile. Carried
food is visible to everyone in range; a stash is known only to those who saw it made.
This gives property, caches, raids, secrecy, trust (letting someone see your stash)
and humility (stashing more than you carry).

## Deferred, deliberately

- Reproduction and children (structure is ready: dials and tallies are per agent, a new
  agent can be created mid game near a parent's dials).
- Separate emotional and physical energy (guilt drain is the first toe in; split when
  more resources are added).
- Art, humour, religion, addiction, suicide, boredom: the equation cannot want anything
  that does not predict energy. Known boundary.

## Views

`world_view()` is the observer render used in v1. `agent_view(a)` is what agent `a`
actually perceives: tiles and agents within range, nothing about board size. The final
version is first person and uses only `agent_view`, so the player cannot see how big
the board is.

## Mechanics ledger

Every mechanic in the game, filed under the ingredient it belongs to, with the
behaviour that justifies it. The test for a new line: name a behaviour that cannot
exist without it. If it files under none of the five ingredients or two rules, it is
a new ingredient and needs a case made for it.

| Mechanic | Ingredient | Justifying behaviour | Added |
|---|---|---|---|
| Energy, base drain, death at 0 | Need | anything at all | v1 |
| Food tiles, regrowth, scarcity | Need | foraging, competition | v1 |
| Carry limit, eat | Need / Actions | hoarding vs eating now | v1 |
| Move, forage, explore | Actions (take from world) | foraging, curiosity | v1 |
| Take from agent | Actions | theft | v1 |
| Give | Actions | gift, trade, charity | v1 |
| Hurt (damage, victim drops half) | Actions | violence, deterrence | v1 |
| Stash, unstash | Actions | property, secrecy, humility | v1 |
| Raid a known stash | Actions (take) | burglary | v1 |
| Flee from adjacent threats | Actions (move) | fear as flight, not only freezing | v1 |
| Signal: full grammar WHO will/did [not] ACT [amt] WHOM [if S] [?] | Actions (signal) | promise, threat, gossip, rule, offer, question | v1 |
| Reward, fear, guilt as the only weights | Dials | personality | v1 |
| Reward = willingness to spend energy for predicted gain | Dials | laziness vs drive; stops reward being strictly better | v1 |
| Guilt covers harm I cause and harm I let happen (omission) | Dials | charity, heroism, empathy | v1 |
| Hot states from prediction error (temporary dial scaling) | Dials | panic, running hot, feeling bad | v1 |
| Per individual tally: take, give, hurt, kept, broke; decays | Memory | trust, grudges, loyalty, forgiveness | v1 |
| Stranger = average of everyone met | Memory | out-group hatred, generalising | v1 |
| Open promises with deadline; kept or broken | Memory | honour, betrayal, credibility | v1 |
| Known food, seen tiles | Memory | exploration | v1 |
| Known stashes of others, fading after 40 turns | Memory | burglary, forgetting | v1 |
| Threat level per agent (from heard threats, decays) | Memory | deterrence, obedience | v1 |
| Recent sentences addressed to me (6 turns) | Memory | answering, reacting to the last speaker | v1 conversation |
| Open offers and requests received (deadline) | Memory | deals, asking | v1 conversation |
| Identity visible; carried food visible; stash seen only when buried | Recognition / Perception rule | reputation, status, secrecy | v1 |
| Witnessing: everyone in view records an act (target weights it double) | Perception rule | reputation, bystanders | v1 |
| Hearing: everyone in view hears, weighs by speaker's kept/broke record | Perception rule + Other minds rule | gossip, credibility, lies that stop working | v1 |
| Predicting others from their tally (pTake, pGive, pHurt) | Other minds rule | trust, caution, picking victims | v1 |
| Answering a question truthfully, valued by asker's reciprocity | Actions (signal) + Other minds | conversation, information trade | v1 conversation |
| Request raises the give prediction for a credible asker | Other minds | asking, favours | v1 conversation |
| Offer accepted by doing one's half; binds the other's promise | Memory (promise) | trade, bargaining | v1 conversation |
| Speech aimed at whoever last spoke to me | Memory (heard) | reply, counter threat, appeasement | v1 conversation |
| Attack strength varies per agent; tally records damage seen per hit; own strength learned the same way | Memory + Other minds | sizing up, bluffs, picking fights | v1 play test |
| Request to hurt ("you will hurt A9") counts as expected return from a credible ally | Other minds | coalition violence, enforcement, bodyguards | v1 play test |
| Predicting retaliation includes dropping half the loot | Other minds | theft deterred by violence rather than only by guilt | v1 play test |
| Memory half life about 140 turns (was 23) | Memory | reputation that lasts | v1 play test |
| Expected return from giving valued in energy units (what they are likely to give back, at food's worth) | Other minds | reciprocity, friendship that pays | v1 play test |
| An ally walks toward someone it was asked to hurt | Actions (move) | coalition violence being physically possible | v1 play test |
| Obedience: a credible threat behind a request puts the predicted punishment as a loss on every action except compliance, so it runs through fear | Memory (threats) + Other minds | gangs, coercion, hierarchy | v1 play test |
| A threat is as believable as the speaker's seen violence, not only their promise record | Other minds | credible deterrence, bluffs failing | v1 play test |
| PLACE slot in the grammar (here / pointed tile) | Actions (signal) | coordination over space, pooling, directions | v1 vocab |
| Place requests: "you will stash N here", "you will take from there" complied with like other requests | Other minds + Memory (offers) | pooling, sending allies to gather | v1 vocab |
| Permission: "you will take from me" lets the listener take from my stash without it counting as theft; stashing on request grants it to the asker | Memory | shared property, pooling, trust made explicit | v1 vocab |
| Own stash valued only against real hunger | Other minds (prediction of own need) | none new; stops stash/unstash flapping | v1 vocab |
| The food given is the cost of a gift (its worth to me, in the cost column) | Need / Dials (cost) | gifts only from surplus; ends gift loops | v1 horizon |
| Impressions form in 4 observations (was 10) | Memory | first gifts and first hits being meaningful signals | v1 horizon |
| Memory of what I did to each person | Memory | predicting how others see me (other minds applied to myself) | v1 horizon |
| Social horizon (world parameter, 0 = one step): a gift valued by the predicted rise in the other's giving over H turns; a hit on a thief by projected deterrence (I assume they fear as I do) | Other minds | investment, foresight, deterrence; leadership at all | v1 horizon |
| Requests generated from the grammar: for each act and target in view, "you will ACT …", valued by learned compliance in these circumstances times what the outcome is worth to me (replaces the scripted leader moves) | Actions (signal) + Other minds | leadership discovered, not issued | v1 timing |
| Lessons filed by circumstance (kind of request and distance of the listener from what is asked about) | Memory (outcomes) | learning when to ask, not only whether | v1 timing |
| Value of finding out: an untried circumstance is worth its uncertainty times what is at stake times the horizon, shrinking with trials | Dials (gain includes information) + Memory | curiosity, experiment, discovering what works; reward weighted by construction | v1 timing |
| Learning what works: each gift, hit and request opens a trial closed by the outcome within 10 turns (gave back / stole again / complied); predictions blend personal experience, general experience and projection by evidence | Memory (outcomes) + Other minds | conditioning on others; giving up on punishment that fails; trust that is earned | v1 learning |
| "Go" in the grammar: "you will go to A9" / "you will go there"; the sentence carries the destination, arrival consumes it; chain with another sentence for "go then act" | Actions (signal + move) | sending people, directions, coordinated action out of view | v1 vocab |
| Tabula rasa (switch): every action starts worth nothing; gain, loss and harm are the learned averages of what followed, filed by situation (kind of act, hunger, relation to the target, adjacency), plus the value of finding out | Memory (outcomes) + Dials | learning what actions do from scratch; omission learned as the harm of idling next to the weak | v1 scratch |
| Outcomes credited as the difference from the agent's own baseline drift (prediction error) | Memory (outcomes) | cheap talk not mistaken for the fruits of foraging | v1 scratch |
| Food in hand counted at half the worth of food eaten | Need | eating learnable as a gain | v1 scratch |
| Harm known only from experience: what being hurt, robbed or hungry felt like to me is the harm I predict for doing it to others (tabula rasa) | Memory + Dials (guilt) | conscience that develops; empathy as projected memory | v1 scratch |
| Imitation: a witness opens a trial on the actor's visible fortune (peak food in hand, hits taken) and files it under the same situation at half weight | Memory (outcomes) + Perception rule | learning without paying for every lesson; copying what works | v1 culture |
| Teaching: "anyone did hurt you" renders as "hurt wrongs you (by N)"; a listener takes it as told experience weighted by the speaker's credibility and blends it with felt experience | Actions (signal) + Memory | knowledge of harm before harm; the first culture | v1 culture |
| Free word order: a sentence is vocabulary words in any order; the listener takes the first person word as subject, the second as object, will/did as time (did if absent), an action before any person as a statement about the action; "if" splits clauses | Actions (signal) | speakers shape sentences; "hurt me" as teaching without a special form | v1 words |
| Waiting on a tile picks up what is there | Actions (take from world) | none; fixes a trap where you could not take food you spawned on | v1 play test |

### Deliberately not in

| Candidate | Why not |
|---|---|
| Lying in answers | Promising and not delivering already gives deception; a second lie mechanism adds nothing new |
| Repetition discount on speech | Repeating a sentence instead of eating is a decision the dials made; let it show |
| Predicting a thief will take it straight back | Would stop the theft ping pong; left so agents can be seen learning it (or not) |
| Reproduction, children | Deferred; structure is ready |
| Emotional vs physical energy | Deferred until more resources exist |
| Conditional promises enforced by condition | Offers cover the give-for-give case; general conditions wait |

## Play test findings (18 Oct 2026)

Twelve hours of play from the inside, about forty games across hermit, friend maker,
psycho, balanced and boss strategies. In order of confidence:

1. Survival comes first; food scarcity sets everything else. Nobody does politics hungry.
2. Reciprocity works once a friend's future gift is valued in energy units like food.
   Gifts plus kept promises reliably make allies; broken promises are remembered.
3. Violence deters only the fearful. Fear 0 agents are immune to everything but death.
4. A gang is low guilt agents bought with food and held by a credible threat from a
   boss who has been seen to hit. High guilt allies feed you and will not fight for
   you at any price tried.
5. Timing is most of leadership: a request is only worth making when the enforcer is
   next to the target, and requests expire in six turns.

### Control vs contested (18 Oct 2026, lord strategy, 5 games each, 800 turns)

Same rules, same strategy. Control: 40 scattered food tiles. Contested: 14 tiles in
three clusters.

| World | Fiefdoms formed | Allies (typical) | Tribute | Enforcement on request | Pooled deposits | Outsiders' share of patch | Deaths of 18 |
|---|---|---|---|---|---|---|---|
| Control | 1 of 5 | 0 to 2 | 0 to 3 | 0 (12 in the one fiefdom) | 0 | 0 to 22% | 0 to 1 |
| Contested | 5 of 5 | 3 to 6 | 7 to 29 | 2 to 61 | 5 to 17 | 0 | 3 to 5 |

Scarcity makes politics: with food somewhere specific, the lord's law gets tested and
holds, a gang of hired low guilt agents enforces it, the decent pay tribute and pool,
and the excluded starve. In the scattered world the same law is never tested because
nobody needs to break it. No engine changes were made for this run.

### Emergent leadership: one step vs horizon (18 Oct 2026, contested world, no human, 800 turns)

Everyone gets the leader's moves. Agent 0 has the human lord's perceived dials (r1.0 f0.1 g0.2).

| | One step | Horizon 10 |
|---|---|---|
| Gifts per game | 0 | 75 to 126 |
| Thefts | 5000 to 7000 | 1000 to 3000 |
| Hits | 26 to 318 | 440 to 1640 |
| Alive of 18 | 13 to 15 | 8 to 11 |
| Leaders (3+ subjects with enforcers) | none | every game |
| Agent 0 rank | n/a | 8th to 15th |

Findings: without foresight nobody gives and nothing social forms. With foresight,
giving appears, theft falls, hierarchies form every game, and leaders have no single
dial signature beyond middling to high fear; the psychopath profile never led. Leaders
die often. The horizon world is too violent (enforcement cadence and value): left
visible as tuning, not hidden. A scripted human lord beats one step agents outright
and loses to horizon agents socially while out-hoarding them; hoarding is useless
until surplus has a use, which is reproduction (deferred, now due).

### Projection vs learning (18 Oct 2026, 14 games each, 252 agents, contested, horizon 10)

Correlation of dial with leadership / hits dealt:
- Projection only: reward 0.34 / 0.40, fear 0.30 / 0.30, guilt 0.22 / 0.03. Leaders high on all three.
- With learning from outcomes: reward 0.21 / 0.27, fear 0.14 / 0.07, guilt 0.13 / -0.21. Leaders average.

The fear-leader link was a projection artefact: fearful agents believed punishment
works, hit thieves, learned it did not, and stopped. With learning, reward drives social
life and guilt restrains violence; fear makes survivors. Violence halves, gifts rise,
theft rises (nothing stops the fearless once punishment is known not to work; one game
collapsed to 4 survivors). Open question for the theory: exclusion and killing as the
society's answer to the unpunishable.

### Learning timing (18 Oct 2026, 5 games, contested, horizon 10)

With requests generated from the grammar, lessons filed by circumstance and the value
of finding out, agents learn when asking works: enforcement requests succeed 39% when
the enforcer is within 1 of the target, 20% at 2 to 3; stash requests 45% near, 31% mid,
14% far; tribute demands 14%. They act on it (tribute demands fall 60 to 100% over a
game, near requests retained, far requests tried only as experiments). Leaders then run
protection states on their own: 27 to 76 enforcements, pooling up to 39, sends. Violence
rises to 1100 to 1500 hits per game, 7 to 8 of 18 survive, and leaders skew low guilt,
the first time the ruthless profile has come out ahead, by learning rather than by
projection.

### Learning what actions do from scratch (18 Oct 2026, tabula rasa, contested, 4 games)

Physics is learned correctly within a life (eat when hungry 45, go to food 10, idle 1,
talk about 0 once credited by prediction error; hitting a thief about break even).
Society never starts: zero gifts, no tribute, no leaders, 3 to 5 of 18 survive. The
first gift is a certain loss and pays only if the other has already learned to
reciprocate; each agent tries once or twice and files giving as bad. A lone learner
cannot invent cooperation inside one life. Next: imitation (learning from what happens
to others) and reproduction (children starting with parents' lessons), the two deferred
ingredients, now shown to be necessary rather than optional. Switch is tabula_rasa in P;
default off so the playable game stays the hand valued world.

### Imitation and teaching (18 Oct 2026, from scratch, 4 games)

With imitation and teaching, the from scratch world moves: survivors 5 to 10 (was 3 to
5), gifts up to 18 (was 0 to 2), first subjects (2 to 3), 729 teaching sentences, and
25 of 72 agents knew what a hit does only from being told. Not a society yet. Next:
reproduction, so lessons pass between lives.

### From scratch with imitation and teaching, tested (18 Oct 2026, 4 + 5 games)

AIs alone: survivors 5 to 8, gifts 0 to 10, pooling up to 30 deposits into one agent's
home, some enforcement. The shared store is the first institution to emerge from
nothing: a stash request is learnable alone in one life (the asker sees compliance, the
complier loses only half value food). Gift exchange still does not start; nobody
succeeds at it for others to imitate or teach. A scripted lord now survives all games
(the taught know what hitting costs) but gains no subjects, because the strategy runs
on reciprocity. Next: reproduction, so a gift economy can be inherited rather than
discovered.

### Optimal scripted strategy in the from scratch world (18 Oct 2026, 10 games)

Teach everyone what hurting and robbing cost, return any gift at 1.5x within a turn,
ask everyone to pool, violence seen early then threats and timed enforcement requests,
never break a promise. Result: rank 2nd to 10th, no takeover; first reciprocal pairs in
the from scratch world appeared in 2 of 10 games (2 subjects, 3 tribute) when an AI's
experimental gift was returned. Ceiling of one life without inheritance: agents learn
what acts do, the shared store, and that one person returns gifts; not the general rule
that giving comes back. Leadership needs that rule to exist in the population before
anyone has personally found it, which is reproduction.
