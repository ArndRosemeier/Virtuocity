/** The core of D&D 5th edition (2014 rules), for a model at the table. */
export const DND5E_RULES = `Game system: Dungeons & Dragons 5th edition, the 2014 rules (System Reference Document 5.1).

Checks: d20 + ability modifier, + proficiency bonus if proficient (double with expertise), against a DC; meeting the DC succeeds. Typical DCs: very easy 5, easy 10, medium 15, hard 20, very hard 25, nearly impossible 30. Advantage rolls two d20 and keeps the higher, disadvantage the lower; having both cancels out. Ability checks and saving throws have no automatic success on a natural 20.
Proficiency bonus by level: +2 (1-4), +3 (5-8), +4 (9-12), +5 (13-16), +6 (17-20). Ability modifier = (score - 10) / 2, rounded down.
Attacks: d20 + ability modifier + proficiency against the target's AC. A natural 20 always hits and is a critical hit (roll the damage dice twice); a natural 1 always misses.
Saving throws: against a spell save DC of 8 + proficiency + spellcasting ability modifier.

Combat: roll initiative (Dexterity check) at the start. On its turn a creature can move up to its speed and take one action (Attack, Cast a Spell, Dash, Disengage, Dodge, Help, Hide, Ready, Search, Use an Object), plus a bonus action if something grants one, and one reaction per round (such as an opportunity attack when a foe leaves reach).
Hit points: at 0 HP a character falls unconscious and makes death saving throws each turn (d20, 10 or more succeeds; three successes stabilize, three failures mean death; a natural 20 regains 1 HP, a natural 1 counts as two failures). Damage of at least the character's maximum HP beyond 0 kills outright.
Rests: a short rest (1 hour) spends Hit Dice to heal; a long rest (8 hours) restores HP, half the Hit Dice and most spell slots.
Spellcasting: spells use slots by level; cantrips are free. Concentration ends when the caster casts another concentration spell or fails a Constitution save (DC 10 or half the damage taken, whichever is higher).
Conditions such as blinded, charmed, frightened, grappled, incapacitated, invisible, paralyzed, poisoned, prone, restrained, stunned and unconscious apply as written; exhaustion has six levels.`;
