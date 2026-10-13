import type { DirectorCandidate } from '@virtuocity/contract-director';
import type { Actor, DecisionQuestion, Message, SkillContext } from '@virtuocity/core';
import { actorName, chosen, estimateTokens, fitNewest } from '@virtuocity/core';

/** How much of the session a decision model reads; Jev takes about 32k tokens in all. */
export const STORY_BUDGET = 20_000;
export const CONTEXT_BUDGET = 4_000;

const QUESTION = 'next';

/** The option names the model chooses from: names, or ids when two candidates share a name. */
function optionsOf(candidates: readonly DirectorCandidate[]): string[] {
  const names = candidates.map((c) => c.name);
  return new Set(names).size === names.length ? names : candidates.map((c) => c.id);
}

function criterion(candidate: DirectorCandidate, actors: readonly Actor[]): string {
  if (candidate.person)
    return 'A person. Pick them when it is their move; the session waits for them.';
  const about = actors.find((a) => a.id === candidate.id)?.personality.description;
  return about ? `In the cast: ${about}` : 'In the cast.';
}

/** The one question a director asks: who of the candidates takes the next turn. */
export function nextQuestion(
  director: Actor,
  candidates: readonly DirectorCandidate[],
  actors: readonly Actor[],
): DecisionQuestion {
  const options = optionsOf(candidates);
  const instructions = [
    'Who takes the next turn in this session?',
    director.personality.description,
  ].filter(Boolean);
  return {
    type: 'choice',
    instructions: instructions.join(' '),
    criteria: Object.fromEntries(candidates.map((c, i) => [options[i], criterion(c, actors)])),
  };
}

/** The newest lines of the session that fit the budget, as "Name: text". */
export function storyLines(transcript: readonly Message[], actors: readonly Actor[]): string[] {
  const nameOf = (id: string) => actorName(actors, id);
  const lines = transcript
    .filter((m) => m.text.trim() !== '')
    .map((m) => `${nameOf(m.actorId)}: ${m.text}`);
  return fitNewest(lines, STORY_BUDGET, estimateTokens);
}

/** Asks the decisions model (Jev by default) who goes next. */
export async function decideNext(
  candidates: readonly DirectorCandidate[],
  ctx: SkillContext,
): Promise<DirectorCandidate | undefined> {
  const { text: background } = ctx.context(CONTEXT_BUDGET);
  const state = { background, session: storyLines(ctx.transcript, ctx.actors) };
  const question = nextQuestion(ctx.actor, candidates, ctx.actors);
  const result = await ctx.decide({ state, questions: { [QUESTION]: question } });
  const options = optionsOf(candidates);
  const picked = options.indexOf(chosen(result, QUESTION) ?? '');
  return candidates[picked] ?? candidates[0];
}
