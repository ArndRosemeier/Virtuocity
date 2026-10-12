import type { StoryLine } from '@virtuocity/contract-memory';
import { summarizerContract } from '@virtuocity/contract-memory';
import type { Skill, SkillContext, VirtuocityModule } from '@virtuocity/core';
import { implement, turnEnded } from '@virtuocity/core';
import { chronicle } from './chronicle';
import { memoryContributor, memoryDoc } from './memory';
import { differentialPrompt, fullPrompt } from './prompt';
import { chroniclerSettings } from './settings';

export * from './lines';
export * from './memory';
export * from './prompt';
export * from './settings';

const DEFAULT_WORDS = 300;

interface Request {
  readonly lines: readonly StoryLine[];
  readonly previous?: { readonly summary: string; readonly upTo: string } | undefined;
  readonly words?: number | undefined;
}

async function write(ctx: SkillContext, messages: ReturnType<typeof fullPrompt>): Promise<string> {
  const { text } = await ctx.complete({ modality: 'text', messages });
  const summary = text.trim();
  if (!summary) throw new Error('The model returned an empty summary.');
  return summary;
}

/** Re-reads the whole story every time: slower and dearer, but never drifts. */
function summarizeFully(request: Request, ctx: SkillContext): Promise<string> {
  return write(ctx, fullPrompt(ctx.actor, request.lines, request.words ?? DEFAULT_WORDS));
}

/** Folds only the lines after the last summary into it; reads everything when there is none. */
function summarizeDifferentially(request: Request, ctx: SkillContext): Promise<string> {
  const { lines, previous, words = DEFAULT_WORDS } = request;
  const covered = previous ? lines.findIndex((l) => l.id === previous.upTo) : -1;
  if (!previous || covered < 0) return summarizeFully(request, ctx);
  const since = lines.slice(covered + 1);
  if (since.length === 0) return Promise.resolve(previous.summary);
  return write(ctx, differentialPrompt(ctx.actor, previous.summary, since, words));
}

/** A chronicler: keeps the story's summary current, summarizing in its own way. */
function chronicler(
  id: string,
  name: string,
  summarize: (request: Request, ctx: SkillContext) => Promise<string>,
): Skill {
  return {
    id,
    name,
    backing: 'llm',
    settings: chroniclerSettings,
    implements: [
      implement(summarizerContract, {
        summarize: async (input, ctx) => ({ summary: await summarize(input, ctx) }),
      }),
    ],
    listensTo: [turnEnded.type],
    onEvent: (_event, ctx) => {
      chronicle(ctx);
      return Promise.resolve();
    },
  };
}

export const differentialChroniclerSkill = chronicler(
  'differential-chronicler',
  'Chronicler (differential)',
  summarizeDifferentially,
);

export const fullChroniclerSkill = chronicler(
  'full-chronicler',
  'Chronicler (full)',
  summarizeFully,
);

export const chroniclerModule: VirtuocityModule = {
  id: 'skill-chronicler',
  register: (host) => {
    host.contracts.register(summarizerContract);
    host.docTypes.register(memoryDoc);
    host.contextContributors.register(memoryContributor);
    host.skills.register(differentialChroniclerSkill);
    host.skills.register(fullChroniclerSkill);
  },
};
