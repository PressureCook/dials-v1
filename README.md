# Dials v1: agents that lie, gossip and threaten

A ground up rewrite of the dials simulation, at the level of individual agents. Sixteen agents with their own reward, fear and guilt dials forage, steal, give, make promises, break them, gossip and threaten in a world with too little food. Then I measure how each dial changes behaviour.

`game.html` is the browser version you can watch.
`game.html` runs with one shared language (`learn_words:false` near the top of the script). Set it to `true` for the experiment where every agent learns words for itself and coins its own.
 Related: [dials-model](https://github.com/PressureCook/dials-model), [dial-society](https://github.com/PressureCook/dial-society).

## Notes

Restart of the dial simulation. Nothing from Dial Society is used. SPEC.md has the
agreed ingredients and the decision equation; dials.py is the whole simulation.

    python3 dials.py                       # 16 agents, 300 turns, summary table
    python3 dials.py --log                 # plus event log (takes, gives, hurts, promises, threats, gossip, deaths)
    python3 dials.py --render              # ASCII observer view every 50 turns
    python3 dials.py --stats               # 20 seeds: correlation of each dial with each behaviour

Observer view key: `,` `:` `#` food (little to lots), `$` stash, letters are agents
(capital letter = low energy). The observer view is for us; agents only ever get
`agent_view`, which is what the first person version will show the player.

## State of v1 (18 Oct 2026)

What the stats say over 20 seeds, 16 random dial agents each, 300 turns:

- reward: strongly cuts idling (r -0.6), raises theft (+0.3), cuts giving and
  signalling (-0.3). Reward 0 agents sit still and starve. As designed.
- guilt: strongly cuts theft (r -0.5), cuts hurting, raises giving slightly.
- fear: weak so far (|r| about 0.1). Fear needs danger to bite, and v1 worlds have
  little violence yet. It does raise giving slightly and lower theft slightly.
- survival about a third, which keeps the world scarce enough for dials to matter.

Behaviours seen in logs: foraging, eating, stashing, theft, repeat theft of the same
victim, giving to the starving, threats, promises kept and broken, gossip, the odd
hurt. Not seen yet: alliances, trade chains, exploration (known food is always in
range at this density), punishment of thieves.

## Known rough edges

- Signal gains are hand set constants. They should come from the same prediction
  machinery as everything else (how much does this sentence change the listener's
  tally, and what is that worth to me).
- No vocabulary beyond three sentence shapes.
- Hot states exist but have not been checked for effect.
- Tuning constants in `P` at the top of the file are first guesses.

## Rule for changes

Rule changes may only change what agents can do. Anything that changes a decision
goes through the three dials or it does not go in.

## game.html (first person, turn based)

Open `game.html` in a browser. You are one agent among 18 with the same actions.
Turn based: every action you take (including waiting), every AI takes one action and
the world drains. You see only your view range (4 tiles), never the board size, and
the feed shows only what happens within it. Your dials are not set anywhere: the
others estimate you from what you do.

Speech is words in any order from the palette (me, you, names in view, will, did, not, if,
?, take, give, hurt, stash, go, signal, here, there, numbers). The listener takes the first
person word as subject and the second as object; an action said before any person is a
statement about the action ("hurt me" teaches that hurt wrongs me). There is no preview: the
words go out raw and each listener reads them for itself. Press enter to say it; it is addressed to
your target and heard by everyone in view, each weighing it by how often you have kept
your word to them. The AIs compose from the same grammar (threats, promises, reports
about their biggest grievance, and complaints to your face).

Conversation: a question ("A3 will give 2 to me?") is answered truthfully by anyone who
values you enough to bother; a request ("you will give 2 to me") makes a credible asker
worth giving to; an offer ("I will give 3 to you if you give 2 to me") is accepted by
doing your half, which then binds the other side's promise. Agents aim their speech at
whoever last spoke to them. SPEC.md has a ledger of every mechanic and why it is in.

Places: click an empty tile to point at it ("there"), or choose "here". "You will stash 4
here" asks your target to bring food and bury it where you stand; they keep ownership but
you are permitted to dig it (Q), and it is not theft. "You will take from me" grants the
same permission for your own stash. Permitted stashes show in the panel.

Sending: "you will go to A9" sends your target toward A9 (they head for where A9 was when
you said it, then home in once they see them); "you will go there" sends them to a square.
Follow with "you will hurt A9" or "you will stash 4 here" to chain an instruction.

Teaching: "anyone did hurt you" says "hurt wrongs you"; the listener learns what a hit
costs from your word, weighted by how much they trust you. Also "take wrongs you", "hurt is
bad" (whom: anyone). In the from scratch world (tabula_rasa:true at the top of the file)
this is how the unhurt learn not to hurt.

Children: press B with an adjacent target to choose a child with them; it is born when they
choose you back within 20 turns. Both need to be grown and not old, with 50 turns since their last
child; nothing else, so a starving pair can choose a child and pay for it. Each parent pays 15 energy and 2 food. The AIs weigh a child as a
fixed drive against the cost, so the reward dial decides who has children. A child stays close to
whichever parent it can see until it is grown. Children have random dials, half
strength and half carry capacity, little foresight, and grow up over 100 turns. They inherit
nothing; what they know, someone taught them. A parent feels a child's gains and losses as
half its own, which is the only thing about kin that is written in. After 600 turns of age
everyone weakens and may die of old age; fertility ends with it.

Words for good and bad: "give help you" says give helps you; "take wrong you" says take
wrongs you; "stash help anyone" says stash is good. A listener who trusts you takes it as
experience of their own.

Words are learned, not installed (learn_words at the top of the file). The AIs coin their own words
(x and three letters) when they have none for a thing, and adopt the words they hear most; "die" is
in the vocabulary and a reported death ends every plan with the dead. They also coin concept words
(k and three letters) for situations they have a lesson about and teach them ("kabc help 12"); the
feed shows them raw, and "kabc ?" asks what one means. Each AI keeps its own
lexicon: a word means whatever act it sees follow it, from the speaker or the person spoken
to, more often than that act happens anyway. Until an AI has learned a word, any sentence
using it is noise to them. Children are born without words. You, the player, understand
everything; the AIs have to earn each word by watching what you and each other do after saying
it, so a threat means nothing until they have seen "hurt" followed by hurting.

Ask what a word means with the word and "?" alone ("hurt ?"). Anyone who knows it and thinks you
worth answering says the word and then does the act within a few turns; stay and watch. The AIs
ask each other the same way, and anyone teaching ("hurt wrong you") tries to follow the word with
the act.

Water and mood: water drains and kills at 0; drink (R) on a spring, the blue tiles, which never run
dry and cannot be carried. Mood drains too and does not kill, but sets how much energy food gives
and how much hits and hunger take; being spoken to refills it, whatever is said, and what you have
learned to expect from a kind of sentence moves it.

Stash knowledge fades after 40 turns unless refreshed.

dials.py is the batch version for stats and is now behind game.html on rules.
