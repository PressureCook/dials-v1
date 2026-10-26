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
| Outcomes credited as the difference from the agent's own baseline drift (prediction error); the learned expected outcome keeps its sign (weighed by reward), and its downside is also filed as loss (weighed by fear). Before this, negative outcomes went only to the fear column, so a fearless agent could learn that an act cost it and not care | Memory (outcomes) | cheap talk not mistaken for the fruits of foraging; learning from bad outcomes without needing fear | v1 scratch |
| Food in hand counted at half the worth of food eaten | Need | eating learnable as a gain | v1 scratch |
| Harm known only from experience: what being hurt, robbed or hungry felt like to me is the harm I predict for doing it to others (tabula rasa) | Memory + Dials (guilt) | conscience that develops; empathy as projected memory | v1 scratch |
| Imitation: a witness opens a trial on the actor's visible fortune (peak food in hand, hits taken) and files it under the same situation at half weight | Memory (outcomes) + Perception rule | learning without paying for every lesson; copying what works | v1 culture |
| Teaching: "anyone did hurt you" renders as "hurt wrongs you (by N)"; a listener takes it as told experience weighted by the speaker's credibility and blends it with felt experience | Actions (signal) + Memory | knowledge of harm before harm; the first culture | v1 culture |
| Free word order: a sentence is vocabulary words in any order; the listener takes the first person word as subject, the second as object, will/did as time (did if absent), an action before any person as a statement about the action; "if" splits clauses | Actions (signal) | speakers shape sentences; "hurt me" as teaching without a special form | v1 words |
| Birth as a choice: any grown agent not yet old (and 50 turns since the last child) may choose "breed" with an adjacent agent who also can; the child is born when both have chosen each other within 20 turns; each pays 15 energy and 2 food; population capped at 100. Having a child is felt as a fixed gain (breed_drive, 300, the largest felt gain of any single act) weighed by reward against the expected cost; going toward a possible mate in view is felt at the same drive discounted by distance; the drive is biology and is not learned (replaces automatic birth) | Need + Dials (reward) | reproduction as a decision; who has children depends on reward and on having surplus | v1 breed |
| Parents feel their children: what is done to my child counts against the doer as if done to me, is felt as harm at the kin weight, and my children's fortunes (in view) count in the outcome of every act I take, not only acts aimed at them; in the hand valued world hitting someone violent is also valued for protecting my children in view | Dials (what counts as self) + Memory | grievance on a child's behalf, defence of children, conscience learned through a child's pain | v1 breed |
| Value of finding out scaled by stake (from scratch): what a person has lately done to me or mine (fading) is the stake of any untried act aimed at them (hit, speak to, give to); untried acts aimed elsewhere keep the base constant. A first version that inflated every untried act in distress made distressed agents wander and drove a parent hitting its child to hit it more, and was removed | Dials (gain includes information) + Memory | responding to the one who harms you, by whatever untried means | v1 breed |
| Empathy by relation (from scratch): the harm I project onto someone is what I know the act feels like, scaled up for my child (1 + kin) and down by my grievance against them (for what they did to me or mine) | Dials (guilt) | avenging without the guilt of aggression; empathy that switches off for an enemy | v1 breed |
| Going to someone in view is a plain move candidate, worth nothing until something is learned to follow it (an approach-to-hurt candidate valued as the hit was tried and removed as the engine thinking for them) | Actions (move) | approaching people for learned reasons | v1 breed |
| The actor of a hit or theft on its own child feels it at the kin weight, as witnesses already did | Dials (what counts as self) | a parent learns what a hit is from hitting its child; guilt after the first time | v1 breed |
| Care weight (from scratch, replaces the grievance switch, which was removed): the harm I project onto someone is what the act is known to feel like times how much they count as me; my child starts at my kin weight, anyone else at 0; learned from outcomes (rises when their fortune moved with mine, falls when their gain was my loss) | Dials (guilt, what counts as self) + Memory | empathy that is earned; strangers as nothing until known; a child as part of oneself | v1 care |
| Kin weight per agent, drawn at birth in [0, 1] | Dials | parents who differ in how much a child counts | v1 care |
| Death: no plan with the dead can exist (promises, offers, requests, trials, proposals purged everywhere); a death seen is filed by witnesses as the loss of a life (100) under what the dead was last doing; "A3 did die" from a credible speaker purges plans too; the word "die" | Need + Memory + Actions (signal) | mortality as a fact in every head; learning what kills by watching | v1 care |
| Coined words: a speaker uses the word it has most often seen mean a thing, or coins one (x and three letters) that others learn as they learn any word; raw sentences (a question about a word, a demonstration) go as written | Actions (signal) | language from nothing; dialects; convergence as a social process | v1 care |
| One credit window, the agent's horizon, for every act (the 3 turn physical / 10 turn social split removed); the drift baseline starts from the first turn seen; novelty counts the act as well as the situation key | Memory (outcomes) | investments that pay later; no starving on cheap sentence variants with food in hand | v1 care |
| Hit strength is a choice: a quarter, half or full; damage, energy cost, food dropped and the harm felt scale with it; from scratch the lesson is filed per unit of force | Actions (hurt) | restraint, warning blows, measured punishment | v1 force |
| Concept words: an agent may coin a word (k and three letters) for one of its own situation keys and teach it ("kabc help 12" / "kabc wrong 9"); listeners learn the word from which situations the speaker or addressee is in when it is said (every act is witnessable for this, filed as the listener would file it); a listener knowing both the concept word and the speaker's word for help or wrong takes the number as a told value for that situation, its prior until it has experience; "kabc ?" is answered by saying the word when next in that situation; coined words may come to mean a sign rather than an act | Actions (signal) + Memory (outcomes) + Other minds | concepts of their own; lessons about situations passed between heads; misunderstanding; opinions about language itself | v1 concepts |
| Mood (emotional energy), 0 to 100: drains each turn; refilled by attention (any sentence addressed to me, whatever it says); moved by expectation (what I have learned follows hearing this kind of sentence from this kind of person, a situation like any other); drained by surprise (a fraction of each closing prediction error). No death; mood sets the rate of energy: food gives 0.5x to 1.5x, drain and hits take 1.5x to 0.5x. Each agent draws its own mood drain, attention refill and surprise cost in [0, 2x the base] | Need + Memory (outcomes) + Dials (temperament) | company worth something in itself; morale; despair as a spiral; emotional harm as something felt, known and projected | v1 mood |
| Water, 0 to 100: drains each turn, death at 0; springs never run dry, cannot be carried or stashed; drinking at one restores 30; the act "drink" and its word; thirst is felt like the breeding drive: drinking and going to a known spring are worth what the thirst is in every world, not learned | Need + Actions + Dials | places that matter; thirst as a second scarcity; gathering | v1 water |
| Wealth is energy + food in hand + mood + water, so every learned outcome covers all of it | Memory (outcomes) | none new | v1 mood |
| A hit costs the victim energy and nothing else; what they hand over, and how much, is their own decision (give, any amount) | Actions (hurt) | extortion as a choice on both sides; robbery needs a robber, not physics | v1 ledger |
| Lessons in four columns (energy, food, mood, water); an act valued by the needs it moves weighted by how empty each is; things done to me (sentences, blows, thefts) are events with lessons of their own, learned raw against my felt metabolism and explained away one way from my acts; two way explaining away diverged, estimated drift baselines were circular | Memory (outcomes) | lessons that separate needs; a blow learned as a blow; the first step toward complex lessons | v1 ledger |
| Attachment: a child not yet grown ends each turn within reach of the nearest parent it can see; biology, not a decision | Need | infants stay where feeding and protection can be learned; survival of children | v1 breed |
| Energy spent on an act is the act's own cost; what else it costs (food given, a child's price) is paid in kind, not charged again as energy (fixes gifts double charging) | Need (units) | none | v1 breed |
| Child: random dials, half strength and carry capacity, growing to adult over 100 turns; inherits nothing | Dials + Need | weakness, growing up; a clean test of what must be inherited | v1 children |
| Valence words "help" and "wrong": "give help you" = give helps you, "take wrong you" = take wrongs you; a statement about any act carries a sign | Actions (signal) | praise, warning, moral teaching of either sign | v1 children 2 |
| Told benefits: what a trusted speaker says an act brings is the prior gain for untried situations of that act (from scratch mode) | Memory | learning what is good before trying it | v1 children 2 |
| Teaching of good acts: an agent that has found an act pays tells others; whether that pays is learned, with own children filed as a separate situation | Actions (signal) + Memory (outcomes) | culture of both signs; parenting that can be learned | v1 children 2 |
| Children's foresight starts low and grows with age (social horizon scaled by growth squared) | Other minds | impulsive young; investment as a grown capacity | v1 children 2 |
| "Us": the speaker and whoever they count as their own (kin, and anyone they have given to twice); a listener is inside it by the same test; "we will hurt" carries the group's weight, "to us" means to me if I am one of them | Actions (signal) + Memory | in-group, speaking for a family or gang, collective threat and grievance | v1 children 2 |
| Kin as relatedness weight: a child's gain and loss count as the parent's own at weight 0.5, in the parent's learned outcomes and in the harm of acts toward the child; nothing else about kin is written | Dials (what counts as self) + Memory | parental care, kin preference, and the seed of reciprocity; a claim about psychopathy and parenting (low guilt parents barely register a child's suffering) | v1 kin |
| Aging: after 600 turns strength and capacity decline back toward a child's over 600 more; a rising chance of natural death (to 2% a turn); fertility ends in old age | Need | mortality, generations turning over, institutions outliving their makers | v1 aging |
| Status (switch, default off): a change in my share of the wealth I can see counts as gain or loss, learned from outcomes | Dials (gain) | ambition, rivalry; tested and found to depress births without producing leaders | v1 status |
| Sentences travel as raw words; each listener reads them for itself with its own convention (shared today, learnable later); nothing is interpreted at the point of speaking and the speaker gets no preview | Actions (signal) + Perception rule | misunderstanding possible in principle; language as something agents do, not the engine | v1 words 2 |
| Learned words: each agent keeps its own lexicon; every content word (take, give, hurt, stash, go, help, wrong) in a sentence is credited with any act seen within 10 turns of it involving the speaker or the addressee, before or after; a word means the act it is followed by more often than that act happens anyway (lift over the listener's own baseline, after 3 credits); a sentence with a word the listener has not learned is noise. Grammar words (who is subject, will, did, not, if) remain shared. Adults and children start with nothing | Memory (outcomes) + Actions (signal) | language as acquired, not installed; children without words; the unseen act has no word | v1 words 3 |
| Word questions and showing: "hurt ?" (an action word and ? with no person) asks what the word means; a listener who knows it answers by saying the word and then doing the act within 10 turns (the act it names is worth what answering is worth); the asker waits and watches; hearing an unknown word is worth asking about by the value of finding out; a teaching sentence also sets its speaker to show the act | Actions (signal) + Memory (outcomes) | asking what words mean, demonstration, language passed on deliberately | v1 words 3 |
| Population cap 100 (was 40) | Need | room for generations | v1 words 3 |
| Gift cost is the marginal worth of the food given (what I lose over the horizon, plus a fifth of its eaten worth as food in hand); a gift candidate for every whole amount carried, with the learned outcome filed per unit given so size matters | Need (units) + Memory (outcomes) | surplus can be given; the first gift becomes affordable; gifts of any size | v1 words 3 |
| More food: 60 tiles (was 40), regrowth 0.10 (was 0.07) | Need (world) | room for children | v1 words 3 |
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

### Children (18 Oct 2026, two parents, random dials, nothing inherited, 1500 turns, 3 games each)

From scratch: populations persist across generations (up to 63 born, 16 children alive
at 1500 where before children the world ended with 3 to 5 survivors); the shared store
is inherited through the ground (pooled deposits climb to 51); the gift economy does not
appear (0 to 11 gifts per 300 turns against 86 to 113 with reciprocity written in),
confirming C7: bodies passing is not enough, lessons must. Children lead by the end in
both worlds, outliving founders. Hand valued world: 3000 to 6000 hits per game, weak
children being easy targets. Next: what children inherit.

### Teaching across generations (19 Oct 2026, from scratch, 1500 turns, 3 games)

Every child in every game (139 of 142) knew what a hit costs before ever being hit,
from being told; nearly all had been told of a good act. Teaching aimed at own children
rose with the number of children. Populations the healthiest of any from scratch run
(15 to 27 alive, mostly born there). Not shown: that parents prefer teaching their
children over others (teaching to children runs at about the share of children in
view). Gift economy still absent; shared store compounding. Next test: rate of teaching
per child in view against parental experience.

### Dynasty (19 Oct 2026, from scratch, children, teaching, "us", 5 games of 1500)

Scripted lord teaching four lessons (hurt wrongs you, take wrongs you, give helps you,
stash is good) with own children first, reciprocating gifts at 1.5x, pooling with
everyone, group threats once the household reaches three: ranks 1st to 4th (was 10th to
25th), one death in five (was three), subjects in every game; game two a dynasty of 109
born, household of 7, 5 subjects, 5 gifts from own children. World gifts 29 to 95 per
game against 0 to 11 in every earlier from scratch run: the gift economy starts once a
word for good exists and someone teaches "give helps you" widely. Amends C7: teaching
with told benefits can create the first instance of reciprocity; inheritance is not the
only route.

### Kin weight (19 Oct 2026, from scratch, 1500 turns, 3 games per setting)

Relatedness 0 / 0.5 / 1.0: child lifespan 101 / 227 / 220 turns; gifts to own
children per 1000 turns together 0.00 / 0.18 / 1.26 against 0.08 / 0.09 / 0.74 to
others; gifts in the world 2 / 11 / 210. Parental care emerges from the weight alone,
kin preference with it, and at weight 1.0 the gift economy starts with no teacher:
giving to a child is the first gift that is never a loss, so "give" gets its first
positive lesson in a parent and told benefits and imitation carry it outward. Parental
care is the seed of reciprocity. Children are taught less than others at every weight,
because teaching is valued by the listener's threat and children threaten nobody; a
child's learning does not yet count as the parent's gain. Weight left at 0.5.

### Aging (19 Oct 2026, from scratch, kin 0.5, 2000 turns, 3 games)

Every founder dead by 2000 in all games; worlds carried by 6 to 14 people born in them.
Pooled deposits keep climbing through complete turnover (37, 47, 69): the shared store
is the first institution to outlive everyone who built it.

### Ambition as a drive (19 Oct 2026, from scratch, aging on, 2000 turns)

Status (share of visible wealth as gain) produced no leaders among the AIs and fewer
births (1, 28, 5 against 32, 27, 23); with a human lord competing it made no visible
difference to rank. Share of visible wealth is local and zero sum, and the acts that
take a world over (teaching, reciprocating, pooling, raising children) all lower it in
the short run. Left as a switch, default off. Aging ends every dynasty: the human lord
died of old age in all six games around turn 1200 to 1800; what a founder leaves is the
shared store and taught children. Untaught from scratch worlds with aging mostly went
extinct by 2000; taught ones carried 8 to 14 people past the founder's death.

### Learned words (19 Oct 2026, from scratch, aging on, 2000 turns, 3 games per condition)

Words are now acquired, not installed. Each agent keeps a lexicon: a content word is credited
with any act seen within 10 turns of hearing it, by the speaker or the one spoken to, and
means the act it is followed by more often than that act happens anyway (the same baseline
credit as everything else). Grammar words stay shared. Nobody starts with words.

Acquisition alone (no human): by turn 300 about half the living agents know "take", "hurt",
"stash" and "wrong"; "give" is never learned because in the from scratch world nobody gives,
so the word has nothing to attach to. Two earlier learners failed: crediting only acts the
speaker did after speaking taught nothing (threats are rarely carried out), and raw
co-occurrence taught "hurt" as take (threats name both, and takes are common).

Society, AIs alone, status off: extinct in 3 of 3 (born 4, 3, 29; gifts 0, 0, 1; hits 230,
172, 1480). Status on (30): extinct in 3 of 3 (born 6, 16, 3; gifts 0). The shared word
baseline on the same build was alive 13, 0, 7 with gifts 34, 2, 5. With words that do not
land, promises, threats, requests and teaching all fail, nobody learns what harm is from
being told, and the population is gone before it has a language.

Me competing (I understand every word; they must learn mine): status off ranks 1, 2, 10
(one game went inert: 15 alive, no births, no gifts, nothing stashed); status on ranks 8, 6,
4; world gifts 0 to 26 against 43, 47, 23 with shared words. Status on versus off is
indistinguishable under either condition; it changes nothing when no one can be understood.

Reading: language cannot be bootstrapped from nothing inside one generation here. The act
has to be seen for the word to mean anything, and the acts worth naming (gifts) are the ones
a wordless population never performs. This is the same shape as C7 (the first gift) one
level up: culture spreads what exists. The next step is the one reality takes: adults start
with the lexicon and children acquire it from the people around them.

### Sharing words and generations (19 Oct 2026, learned words, cap 100, 4000 turns)

Added: "hurt ?" asks what a word means; a knower who thinks the asker worth answering says
the word and then does the act, the asker waits and watches; hearing an unknown word is worth
asking about by the value of finding out; teachers follow their teaching sentence with the act.
Population cap raised to 100.

From scratch (2 games scattered, 2 contested): questions 157 to 520 a game, demonstrations 9
to 47, teaching sentences 105 to 308. Words do pass to the second generation: where children
existed, 40 to 100 percent of them knew take, hurt, stash and wrong by turn 1000, learned from
their elders' sentences and demonstrations. But every population was extinct by turn 1500 to
2500: births 31, 6, 8, 14 against founders who age out from turn 600, peak population 20, the
cap never approached. The from scratch world without gifts cannot raise enough children to
replace its founders, so there is no third generation to measure.

Hand valued world (1 game, scattered, 4000 turns): founders all gone by turn 1000, 106 births,
population held at 10 to 15 for the whole run (food limited, cap irrelevant). At turn 4000 a
population entirely born in the world, four to five generations from the founders, knew give
(64%), take (45%), hurt (36%) and wrong (36%); at its peak around turn 2000 to 2500, 87 to 100
percent. 774 word questions, 29 demonstrations. "stash" was never learned because nobody in
that world stashes. Language, once there is a society to carry it, persists through complete
generational turnover without any inheritance, by the same credit that teaches it to a
founder. The limit on culture here is demography, not transmission.

### More food, gifts from scratch, and why the children die (19 Oct 2026, from scratch, 4000 turns)

More food alone (60 tiles, regrowth 0.10) changed nothing: extinct by 1500 in both games, no
gifts. The block on giving was units, not scarcity: a gift cost the full worth of the food to
me, which has a floor of ten turns of drain even when full and carrying eight, so a three food
gift cost 9.6 against an information value of 6 and was never tried. With the cost made
marginal (what I lose over the horizon plus a fifth of eaten worth as insurance) and one unit
gifts allowed, gifts appear from scratch for the first time: in one game 20 to 50 percent of
agents learned the word "give", which requires having seen gifts. Populations still die by
turn 1000 to 1500. Deaths in one game: of 11 children, 7 died before age 40, half starved and
half killed by hits (a hit takes 25 of a newborn's 40); of 18 founders, 7 were killed and 8
died of age. Children wander from their parents at birth, so the parents who would feed them
(the kin weight makes that worth learning) are rarely adjacent, and the adults who never
learned that hurting is wrong hit the weakest thing in view to find out what it does.

Gifts of any amount (19 Oct 2026): with a candidate per whole amount carried and outcomes filed
per unit, 1500 turns gave 2443 gifts in the hand valued world (2095 of one, 340 of two, eight of
three to five) and 180 from scratch, spread across one to eight. Extinction from scratch
unchanged.

### Birth as a choice, attachment, parents who feel (19 Oct 2026)

Hand valued world, 4000 turns, cap 100, birth needing energy 70 and 3 food: the first growing
population. 71 alive at 4000 from 18 founders, 194 births, founders gone by 1000, four to five
generations; the lexicon carried across all of them (96% hurt, 96% wrong, 80% take, 30% give at
4000; 959 word questions, 249 demonstrations). Children died of old age. From scratch still
ended by 1500 (19 and 9 births); of 29 children in one game 17 were hit to death.

With the energy and food conditions removed (anyone grown may choose) and parents feeling their
children, 1500 turns: hand valued hits the cap of 100 (318 births, 100 alive) but with 3346 hits,
1495 of them on children, 176 children killed, 62 defensive hits by parents on their child's
attacker. From scratch: 21 and 9 births, extinct, 11 and 6 children killed, no defence at all.
Why parents do not defend from scratch: the parent now learns what a hit is from the child's
pain, and that knowledge restrains its own hitting through guilt; hitting the attacker has never
been tried so is worth nothing until it has been seen to work. Defence in the hand valued world
comes through projection (I assume the attacker fears as I do), which the from scratch head does
not have. Feeling a child's pain, by itself, produces grievance and conscience, not protection.

Stake scaled curiosity (19 Oct 2026, from scratch, 1500 turns, 3 games): defensive hits by
parents went from 0 to 0, 4 and 3; children killed 4, 11, 13 of 6, 14, 20 born; still extinct.
What the agents have learned about hitting, summed over one game: hitting a weak stranger pays
8.8 per hit and costs 3.1 (loot against retaliation); hitting a well stranger pays 6.6 and costs
7.8; hitting a thief when hungry pays 29. So preying on the weak is a correct lesson in this
world, and children are the weakest thing in view. Defence by one parent, adjacent only, does not
change that arithmetic for the predator. The from scratch world is missing not logic but
consequence: nothing makes hitting a child cost the hitter more than it yields.

### Why from scratch parents do not defend (19 Oct 2026, 1500 turns, 3 games each step)

Dumping the parents' options at the moment a child is hit answered it. In every sampled case
the attacker was the other parent. About half of all hits on children are by a parent (own
parent hits 8, 2, 23 of child hits 18, 5, 44): a first hit on anything is an experiment from
scratch, a hit on an infant drops its food at your feet, and a hungry or low guilt parent learns
that it pays. The other parent does respond to the attacker, 15, 3 and 31 times a game once the
stake was aimed properly, but mostly by threatening or stealing from them (speech scores above
the hit); defensive hits 4, 0, 2. With empathy scaled by grievance and the stake aimed at the
offender, the arithmetic for a defending parent is right; what kills the children is the
parents the dials made, which is the theory's own claim about low guilt parents, here with the
from scratch twist that every parent is low guilt toward its child until it has hurt it once.
Hand valued world over 4000 turns (second game): population at the cap from turn 2500, 448
births, lexicon carried through (92% wrong, 89% hurt, 70% take, 20% give at 4000).

Signed outcomes (19 Oct 2026): with the expected outcome signed, hitting one's own child is
learned as −32 (fed) and −14 (hungry) after one or two trials, the most negative act in the
table. Hits on children remain mostly parental (17 of 18 in one game, with about 30 parents):
they are the trials. Two hits kill an infant, so the lesson costs the child. Adults who know
what a hit feels like and have guilt above about 0.3 never run the trial; the low guilt third
do. Children in the from scratch world die of their parents' first experiment.

### Care, death, coined words (19 Oct 2026, 1500 turns)

Removed as my own engineering: the grievance switch on harm, the stake term on finding out, the
approach-to-hurt candidate. Added per Larry: care weights (strangers 0, learned), per agent kin,
death as the end of plans, the word die, coined words.

Hand valued: at the cap of 100 by 1500, 241 births; of 141 child deaths 70 by hits, 36 of age.
From scratch: a population that persists for the first time, 62 to 64 births and 5 to 8 alive
at 1500 through complete founder turnover; the founders are nearly all killed (16 to 17 of 18
by turn 500): with strangers at zero, a hit carries no guilt until care is learned. Hit children
do tell: 29, 1 and 15 teaching sentences from hit children, 8, 0, 4 to a parent, understood 4,
0, 1; most parents (34/37, 20/20, 20/22) nonetheless know what a hit does from being told by
someone. Words: nearly everyone speaks every meaning by 500, in 3 to 9 dialect words per
meaning, the commonest shared by 2 or 3; convergence is slow because everyone coins first.

Hit strength (19 Oct 2026, 1500 turns): hand valued 2467 full, 1917 quarter, 116 half (on
children 872 full, 703 quarter; 169 of 284 children killed); from scratch 192 full, 297 quarter
(on children 40 and 67; all 19 children and 17 founders killed). The light hit is used freely
and spares no one: loot scales with force, so hitting the weak pays at every strength.

### Invented languages and concept words (19 Oct 2026)

Coined act words drift: in a crowded hand valued world at turn 800, 153 of 168 coined words no
longer meant what their coiner meant and most had come to mean take, the commonest act within
ten turns of any sentence; words coined for "wrong" went first, because what visibly follows
"you wronged me" is somebody taking. The learner is weak against base rates; in the sparse from
scratch world words keep their meanings.

Concept words, from scratch, 1500 turns: 313 coined for 77 situations, 461 word meanings
learned from others, 40 told situation values received. Lessons that crossed: hitting a fed thief
+68 (own −9.8), idling hungry and alone −18 (own −100), giving to a friend +5, a child with a
thief −22 (own +47), asking a stranger or thief what a word means −10 to −51 (the first opinion
about language), and one mistranslation (eating when hungry told −72 against own +54: the
listener's meaning for the word was not the speaker's).

### Mood and water (19 Oct 2026, 600 turns)

Hand valued: 57 alive from 18 (73 births), 731 drinks, mean mood 93, 56 of 57 next to someone,
5530 sentences with 85 content-free signals (near none before); deaths 8 thirst, 25 hits, 1
starved. From scratch: extinct by 200, 13 killed, 6 of thirst; mood collapses because every
early outcome is a surprise, and at low mood a hit does up to 1.5x, so the first fight is
lethal. Constants: mood drain 1, attention 10, surprise 0.1, water drain 1, drink 30, 6 springs.
Thirst felt (19 Oct 2026): from scratch thirst deaths fell to 3 and 7 of 18 (agents that never
saw a spring); 10 to 15 killed by hits, no births; the contested test with mood and water went
extinct in both games with no births, and me competing ranked 4, 9, 8 with no children anywhere.

### Mood as a light touch, reproduction as the largest pull (19 Oct 2026)

Mood now moves food and hit damage within 10% and the energy drain up to 1.5x at zero. Breed
drive 300 with the pull reaching across the view. From scratch unchanged (1 born, 12 killed, 1
alive at 600): founders are dead or scattered before breeding age. Hand valued: 104 births, 48
alive at 600, 27 starved as the pull competes with eating. Diagnosis of the from scratch
collapse: with mood and water inside the one-number wealth the learning signal about food and
hits is drowned by mood noise (with the ledger reverted to energy and food, 10 to 11 alive at
150 as before); the fix proposed is a ledger per need, valued by how empty each need is.
Founders start as adults (19 Oct 2026): age had counted from turn 0, so every founder in every test
since children were added spent its first 100 turns half grown and infertile. Fixed; from
scratch 600 turns: 21 births, 5 alive, 26 killed; hand valued 203 births, 64 alive.

### Ledger per need, scale, and loot (19 Oct 2026)

Four column lessons with one way explaining away: lessons read correctly for food and drift
(eat when hungry energy +5 food −9; walk to food +13; idle −2) but coincidences remain in a
short violent life (hitting a well stranger water +12). From scratch deaths unchanged. A big
world (60 founders, 56x56, 240 food, 24 springs): all founders dead by 250 on both the old and
new ledger (71 to 80 killed), 35 to 42 children born, extinct by 1000 to 1500; scale does not
change the shape. Removing the automatic drop of food on a hit did not change it either: the
hitting is exploration (a quarter hit costs 0.5, less than a step; every target and circumstance
is a discovery worth 6; no guilt toward strangers), not loot.
