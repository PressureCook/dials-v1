# Dials engine v2

Headless engine for the dials model: the same ingredients and rules as `dials-v1/game.html`,
laid out for many agents.

- `params.mjs` the constants (P) and the needs
- `engine.mjs` the world: tiles, agents in typed arrays, the spatial grid, candidates, learning
  from outcomes, the ledger per need, acts, birth, death
- `speech.mjs` the grammar, raw-word sentences, per-agent lexicons with coined words, hearing,
  requests, trials and the speech candidates (mixed into the World prototype)
- `index.mjs` import this: `import { World, srand, P, ACT } from "./index.mjs"`
- `bench.mjs N T side seed` population, acts and deaths every 100 turns, ms per turn
- `society.mjs seed T cap` the society test: gifts, hits, leaders by distinct givers, shared words

Run: `node bench.mjs 50 300 40 7`, `node society.mjs 7 1500 80`,
`node --max-old-space-size=4096 bench.mjs 5000 20 400 7`.

Dials are state with a plasticity switch (`plastic_dials`, off). Tiles carry a type and level
for the technology work (`work` is a stub).

## Technology and terrain (tech.mjs)
Materials are property vectors; a thing is its set of materials and a level; fixed laws read the
properties (hand: strength, work rate, carry cap, act cost, eating; tile: shelter, store, well,
field). Two actions, make and build, try any single or pair of what is held. Terrain: heights,
springs on high ground, water flowing down to pools; food regrows where it is wet.
`P.tech` turns making and building off (materials and terrain remain).
