import type { Picture } from '@virtuocity/contract-visual';
import { illustratorContract } from '@virtuocity/contract-visual';
import type {
  CallStats,
  ChatMessage,
  Skill,
  SkillContext,
  VirtuocityModule,
} from '@virtuocity/core';
import { IMAGE_PART, implement, storeMedia, turnEnded } from '@virtuocity/core';

interface Request {
  readonly description: string;
  readonly style?: string | undefined;
}

/** The image model's instructions; the illustrator's description sets the house style. */
export function illustratePrompt(ctx: SkillContext, request: Request): ChatMessage[] {
  const style = [request.style, ctx.actor.personality.description].filter(Boolean).join('. ');
  return [
    {
      role: 'user',
      content: [
        'Draw one picture of the following. No text or lettering in the picture.',
        style && `Style: ${style}`,
        `Subject:\n${request.description}`,
      ]
        .filter(Boolean)
        .join('\n\n'),
    },
  ];
}

const ALT_LENGTH = 140;

function altText(description: string): string {
  const flat = description.replace(/\s+/g, ' ').trim();
  return flat.length > ALT_LENGTH ? `${flat.slice(0, ALT_LENGTH - 1)}…` : flat;
}

async function illustrate(
  ctx: SkillContext,
  request: Request,
  signal?: AbortSignal,
): Promise<{ picture: Picture; stats: CallStats }> {
  const result = await ctx.complete({
    modality: 'image',
    messages: illustratePrompt(ctx, request),
    ...(signal ? { signal } : {}),
  });
  const [part] = await storeMedia(ctx.assets, result.media ?? [], altText(request.description));
  if (!part || part.kind !== IMAGE_PART) {
    throw new Error('The image model returned no picture. Pick an image model in Settings.');
  }
  return { picture: { ...part.data, alt: part.data.alt ?? 'A picture' }, stats: result.stats };
}

/** The text of the last message, if the turn that just ended produced one. */
function lastText(ctx: SkillContext, actorId: string): string | undefined {
  const message = ctx.transcript.at(-1);
  if (message?.actorId !== actorId) return undefined;
  const text = message.parts
    .filter((p) => p.kind === 'text')
    .map((p) => String(p.data))
    .join('\n');
  return text.trim() || undefined;
}

/**
 * Draws pictures with an image model. As an actor in a scene it illustrates
 * each other actor's turn in the background, so the story never waits for it.
 */
export const illustratorSkill: Skill = {
  id: 'illustrator',
  name: 'Illustrator',
  backing: 'llm',
  implements: [
    implement(illustratorContract, {
      illustrate: async (input, ctx) => (await illustrate(ctx, input)).picture,
    }),
  ],
  listensTo: [turnEnded.type],
  onEvent: (event, ctx) => {
    if (!turnEnded.is(event) || event.payload.actorId === ctx.actor.id) return Promise.resolve();
    const text = lastText(ctx, event.payload.actorId);
    if (!text) return Promise.resolve();
    ctx.startJob('Illustrating the scene', async ({ signal }) => {
      const { picture, stats } = await illustrate(ctx, { description: text }, signal);
      await ctx.post([{ kind: IMAGE_PART, data: picture }], [stats]);
    });
    return Promise.resolve();
  },
};

export const illustratorModule: VirtuocityModule = {
  id: 'skill-illustrator',
  register: (host) => {
    host.contracts.register(illustratorContract);
    host.skills.register(illustratorSkill);
  },
};
