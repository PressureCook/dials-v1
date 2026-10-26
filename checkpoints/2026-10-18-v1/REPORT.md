# Dials: a minimal rule set for human behaviour, checkpoint 1

Larry Kuyayama, with Claude. 18 October 2026.

## Abstract

We ask what the smallest set of ingredients is that can produce the range of human social
behaviour, and test it by building a world in which agents differ only in three
sensitivities, reward, fear and guilt, and everything else is learned. Starting from five
ingredients (a draining need, four actions, the three dials, memory of outcomes, and
recognition of individuals) and two rules (agents assume others run the same equation;
agents perceive within a range), we built a first person, turn based world and ran
roughly a hundred and fifty games over one day, with a human playing, with scripted
strategies, and with the agents alone. We report what formed and what did not. The main
claims: scarcity, not personality, decides whether politics happens; foresight is what
makes society possible at all; once agents learn from outcomes rather than projecting,
reward drives social life and guilt restrains violence, while fear makes survivors; given
the ability to ask and to learn when asking works, leaders emerge without being scripted;
and a lone learner starting from nothing can discover what actions do and that a shared
store is useful, but cannot invent reciprocity inside one life. The last result motivates
inheritance as the next ingredient.

## 1. The question

Treat behaviours as dishes and ask for the smallest set of ingredients that can make any
of them. An ingredient earns its place only if there is a behaviour that cannot exist
without it. The theory under test is that psychopathy is a region of a shared space of
conditioning sensitivities rather than a separate kind, and that the sensitivities are
three: to reward, to fear, and to guilt (which we take to include empathy).

## 2. The model

### 2.1 Ingredients and rules

1. Need. Energy, 0 to 100, draining each turn; death at 0. Food tiles regrow slowly and
   there is never enough.
2. Actions. Take, give, hurt, signal (and move as the physical primitive that reaches a
   target). Every action costs energy.
3. Dials. Reward, fear, guilt, fixed for life, the only personality.
4. Memory. Per individual: what they did (take, give, hurt, promises kept and broken),
   decaying; open promises; what I did to them; what my own acts led to; what their acts
   felt like when done to me.
5. Recognition. Individuals have identities and are remembered.

Rule A: others run my equation; I predict them from their record. Rule B: I perceive
actions and carried food within a range; stashes only when I saw them buried.

### 2.2 The decision

For each possible action: score = reward × gain − cost − fear × loss − guilt × harm;
highest wins. Reward is willingness to spend energy for predicted gain, so high reward
is not strictly better: in a poor world the driven starve chasing thin margins. Guilt
covers harm I cause and harm I let happen. Hot states scale a dial briefly after a
prediction error.

### 2.3 What the dials are

After the from scratch runs we restate them: reward, fear and guilt are coefficients on
experienced outcomes. Gain and loss are what happened to me after I acted, learned per
situation. Harm is what I know an act feels like from having had it done to me, or from
being told by someone I trust. Nothing is known in advance; guilt without experience is
inert, and empathy is memory projected onto another.

### 2.4 Language

A sentence is vocabulary words in any order (me, you, names, anyone, everyone, will,
did, not, if, ?, take, give, hurt, stash, go, signal, here, there, numbers). The
listener reads roles by convention: first person word is the subject, second the
object, an action before any person is a statement about the action. From this come
promises, threats, reports, rules, offers, questions, directions, permissions and
teaching. Listeners weigh a speaker by credibility, (promises kept + ½) ÷ (kept + broken
+ 1), and threats additionally by the speaker's seen violence.

### 2.5 Learning

Every gift, hit and request opens a trial closed by its outcome within a window (did
they give back, steal again, comply), filed by the circumstances (kind of request,
distance to what was asked about). Predictions blend personal experience, general
experience and projection by evidence. An untried circumstance is worth its uncertainty
times what is at stake times the horizon, which is where experiment comes from. In the
from scratch mode every action starts worth nothing and gain, loss and harm are the
learned averages of what followed, credited as the difference from the agent's own
baseline drift. Witnesses learn at half weight from what visibly happens to others, and
sentences such as "hurt wrongs you" pass felt experience between heads.

The ledger in SPEC.md files every mechanic under one of the five ingredients or two
rules. Nothing has been added at the ingredient level since the morning.

## 3. Method

A single HTML file runs the world: 18 agents on a 28 by 28 board, 40 scattered food
tiles (control) or 14 in three clusters (contested). One agent may be a human, seeing
only a 9 by 9 window and never the board size. Experiments ran headless in the same
engine with scripted strategies or no human, 600 to 800 turns, 4 to 14 games per
condition. Leadership was scored by distinct people who gave to an agent (subjects),
gifts received, enforcements carried out at the agent's request, and pooled deposits
made into the agent's home.

## 4. Results

1. Validation of the dials in a hand valued world (20 seeds × 16 agents). Reward cuts
   idling (r = −0.6) and raises theft (+0.3); guilt cuts theft (−0.5) and hurting; fear
   is weak until there is danger to fear.
2. Playing from the inside. Hurting a random agent produced, with no rule for any of it,
   appeasement (a promise), then grievance (telling everyone), then deterrence (a
   threat). A stash buried in view was raided within two turns. A fear 0.1 agent robbed
   the human five times and shrugged off three hits. Violence buys nothing one on one
   against the fearless.
3. Units. Friendship and speech were worthless until their predicted returns were valued
   in the same energy units as food. Most apparent social failures that day were this.
4. Scarcity makes politics. Same rules, same lord strategy: in the scattered world one
   fiefdom in five games; in the clustered world five in five, with gangs of three to
   six, tribute, enforcers, pooled deposits, and three to five of eighteen starving.
5. Foresight makes society. With one step valuation nobody gives, ever (0 gifts per
   game), and no one leads. With a ten turn social horizon gifts appear, theft falls two
   thirds to four fifths, and hierarchies form every game.
6. Projection versus learning (14 games each, 252 agents). With projection only, all
   three dials correlated with leadership and fear with violence (0.30). With learning
   from outcomes, fear's link to violence fell to 0.07 (fearful agents hit thieves,
   watched them keep stealing, and stopped), guilt's link to violence appeared (−0.21),
   and leaders were average on every dial. Reward drives social life, guilt restrains
   violence, fear makes survivors.
7. Leadership learned, not issued. When requests are generated from the grammar, lessons
   are filed by circumstance, and untried circumstances carry the value of finding out,
   agents learn when asking works (enforcement requests succeed 39% with the enforcer
   adjacent, 20% at two or three squares; tribute demands 14%) and act on it. Leaders
   then run protection states unaided, with enforcers, pooling and sends. Violence rises
   and leaders skew low guilt, the only time the ruthless profile came out ahead.
8. The human against the agents. A scripted lord beats one step agents outright, loses
   socially to horizon agents while out hoarding them, and beats learning agents on
   control (enforcement, pooling, stash) while losing on gift volume. The remaining gap
   between scripted and learned play was timing, which result 7 then closed.
9. From scratch. With every action starting worth nothing, physics is learned correctly
   within a life (eat when hungry 45, go to food 10, idle 1, talk 0, hitting a thief
   break even), but society never starts: zero gifts, no leaders, three to five
   survivors. Harm known only by experience gives a developing conscience: high guilt
   agents hit at 0.6 per 100 turns until first hurt, then never; low guilt 3.0 before,
   1.2 after. Half the agents, never hurt, never acquired a conscience about hitting.
10. Imitation and teaching. Survivors rise, 729 teaching sentences in four games, 25 of
    72 agents knew what a hit does only from being told. The shared store appears from
    nothing (up to 30 deposits into one agent's home). Gift exchange still does not
    start. An optimal scripted strategy survives but gains no following, except two
    games in which an agent's experimental gift was returned and a reciprocal pair
    formed.

## 5. Claims the simulation currently makes

C1. Hierarchy is a product of geography. Nothing in the dials makes a lord; the same
agent in a scattered world is a hermit. The dials decide who takes which role once
scarcity forces contact.

C2. Foresight, not temperament, is the precondition for society. Without valuing social
acts by their predicted effect over time, no one gives, and nothing social forms.

C3. Once agents learn from outcomes, reward predicts social activity and leadership,
guilt predicts restraint from violence, and fear predicts survival, not leadership.
Earlier fear effects were artefacts of projection.

C4. Punishment deters only those who fear; the fearless are immune to everything but
death, and a society that has learned punishment does not work on them has no answer
yet but exclusion or killing.

C5. Leadership requires timing, and timing is learnable from experience once lessons
are filed by circumstance and untried circumstances are worth trying.

C6. Conscience develops. Guilt is a sensitivity, not a value; it multiplies what the
agent knows harm to be, and that knowledge comes from being harmed or being told.

C7. A lone learner can discover what actions do and that a shared store pays, but
cannot invent reciprocity inside one life, because the first gift is a certain loss
that only pays in a population that already returns gifts. Culture spreads what exists;
inheritance is needed for a discovery to outlive its discoverer.

C8. The first institution to emerge from nothing is the shared store, not the gift.

## 6. Limitations

Constants throughout are first guesses, tuned only where a result depended on units.
Leadership measures are confounded by gift loops (fixed by charging gifts) and by
exposure. Worlds are small (18 agents), short (800 turns), and harsh; the from scratch
world loses most of its population. Paranoia, betrayal detection, false reports, lying
in answers, ostracism and killing as policy are not represented. Word order roles are a
fixed convention rather than learned. Results are from 4 to 14 games per condition and
should be read as directions, not estimates.

## 7. Next

Reproduction: children with dials near their parents' and some of their parents'
lessons, costing surplus to raise. The prediction from C7 is that a gift economy will
exist in the second generation of a population whose first generation found it by
accident once, and that inherited lessons will do what imitation and teaching alone did
not. After that: the society's answer to the unpunishable, and learned word order.
