# Test harnesses (checkpoint 1)

Each runs game.html headless with Playwright (`node <file> [args]`; needs `npm i playwright`
and a Chromium; they expect the game at file:///home/claude/dials-v1/game.html, edit the path).

- experiment-leadership.js `<horizon> <games> [hand]`: AIs alone in the contested world; leadership table; `hand` turns tabula rasa off.
- human-lord-vs-agents.js: scripted lord strategy against the agents, contested, tabula rasa on.
- optimal-strategy.js: the "optimal" scripted strategy (teach, reciprocate, pool, timed enforcement).
- dial-correlations.js: 14 games, correlation of each dial with leadership, hits, survival.
- timing-learning.js: learned success rates of requests by circumstance.
- conscience-before-after-hurt.js: hits dealt by guilt level before and after first being hurt.
- teaching-spread.js: how many agents know harm only from being told.
- control-vs-contested.js `control|contested`: lord strategy in scattered vs clustered food.
- first-strategy-bot.js: the morning's first policy bot (hand valued world).
