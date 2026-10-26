// Dials engine v2: parameters. Same meanings as game.html; constants are first guesses carried over.
export const P = {
  W: 40, H: 40, food_tiles: 120, food_max: 10, food_regrow: 0.10, springs: 12,
  eat_value: 10, base_drain: 1, act_cost: 0.6, hurt_cost: 4, hurt_damage: 25, hurt_spread: 0.6,
  carry_cap: 8, view_range: 4, memory_decay: 0.995, promise_window: 6, guilt_drain: 0.5, horizon: 10, stash_memory: 40,
  social_horizon: 10, impression: 4, explore: 6,
  mood_drain: 1, attention: 10, surprise: 0.1, water_drain: 1, drink: 30,
  birth_cost: 30, birth_food: 6, child_energy: 40, grow_turns: 100, max_pop: 250,
  old_age: 600, old_span: 600, mortality: 0.02,
  kin_max: 1, death_worth: 100, death_zone: 25, breed_drive: 300, breed_window: 20,
  stranger_prior: { take: 0.15, give: 0.05, hurt: 0.05 },
  share_credit: false, word_known: 3, learn_words: true, tabula_rasa: true,
  plastic_dials: false, dial_rate: 0.01,      // dials as state: drift with experience, relax to the set point
  // technology: materials on tiles, things generated per world, work, wear
  tech: true, n_materials: 3, material_spread: 0.3, material_tiles: 40, res_max: 6, material_regrow: 0.05, work_cost: 1, steps_per_level: 3, law_k: 1.5, max_level: 3, wear_hand: 0.0005, wear_tile: 0.0005, store_cap: 20,
};
export const NEEDS = ["energy", "food", "mood", "water"];
