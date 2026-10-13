/** The core of Pathfinder Second Edition (remastered), for a model at the table. */
export const PF2E_RULES = `Game system: Pathfinder Second Edition (remastered rules).

Checks: d20 + modifier against a DC. Four degrees of success: beat the DC by 10 or more for a critical success, meet it for a success, miss it for a failure, miss by 10 or more for a critical failure. A natural 20 improves the degree by one step, a natural 1 worsens it by one. Fortune effects roll twice and keep the higher, misfortune the lower.
Modifiers: attribute modifier (Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma) + proficiency (untrained +0; trained, expert, master, legendary = level + 2, 4, 6, 8) + item, status and circumstance bonuses (only the highest of each type counts; penalties work the same way).
DCs: a creature's AC and save DCs are 10 + its modifier. For tasks use the DC by level, adjusted: easy -2, hard +2, very hard +5.

Turns: roll initiative (usually Perception) when combat starts. Each turn a creature has 3 actions and 1 reaction. Strike, Stride, Interact, Raise a Shield, Step and most spells cost 1 to 3 actions (most spells 2). A second attack in a turn takes -5 (agile weapons -4), a third and later -10 (agile -8): the multiple attack penalty.
Attacks: a hit deals damage, a critical hit double damage. Saves (Fortitude, Reflex, Will) usually halve damage on a success, negate it on a critical success and double it on a critical failure.
Hit points: at 0 HP a creature is knocked out and dying 1 (dying 2 from a critical hit); each turn it makes a flat recovery check (DC 10 + dying value); dying 4 means death. Recovering from dying leaves it wounded, which makes later dying worse. Hero Points (usually 1 per session) let a player reroll a check or avoid death.
Conditions such as frightened, off-guard, prone, sickened, clumsy, enfeebled, stunned, slowed and persistent damage change checks, DCs and actions; apply them as written and count down values like frightened at the end of the creature's turn.
Exploration and downtime: outside combat, characters pick an exploration activity (Search, Scout, Avoid Notice, Defend…). Skill actions such as Recall Knowledge, Demoralize, Seek, Treat Wounds and Disable a Device use the skill checks above.`;
