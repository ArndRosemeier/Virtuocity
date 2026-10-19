import { automationContract } from '@virtuocity/contract-automation';
import type { CallStats, Content, Skill, SkillContext, VirtuocityModule } from '@virtuocity/core';
import { implement, readSettings, sessionText, textContent, turnEnded } from '@virtuocity/core';
import { keepValues, keptDoc, keptValues } from './kept';
import { runScript } from './run';
import { parseScript } from './script';
import { automationSettings, due } from './settings';

export * from './kept';
export * from './run';
export * from './script';
export * from './settings';

/** What is wrong with the actor's script, line by line; empty when it can run. */
function scriptProblems(stored: unknown): readonly string[] {
  const parsed = parseScript(readSettings(automationSettings, stored).script);
  return parsed.ok ? [] : parsed.errors;
}

/** Runs the actor's script once, keeping its `_` variables for the next run. */
async function automate(
  ctx: SkillContext,
  signal?: AbortSignal,
): Promise<{ message: Content; stats: CallStats[] }> {
  const parsed = parseScript(readSettings(automationSettings, ctx.settings).script);
  if (!parsed.ok) throw new Error(`The script cannot run. ${parsed.errors.join(' ')}`);
  const stats: CallStats[] = [];
  const ask = async (prompt: string) => {
    const messages = [{ role: 'user' as const, content: prompt }];
    const result = await ctx.complete({
      modality: 'text',
      messages,
      ...(signal ? { signal } : {}),
    });
    stats.push(result.stats);
    return result.text;
  };
  const context = sessionText(ctx.transcript, ctx.actors);
  const kept = keptValues(ctx.state, ctx.actor.id);
  const result = await runScript(parsed.statements, { context, kept }, ask);
  await keepValues(ctx.state, ctx.actor.id, result.kept);
  if (!result.text) throw new Error('The model returned nothing to post.');
  return { message: textContent(result.text), stats };
}

/** Runs the script and posts its message. */
async function runAndPost(ctx: SkillContext, signal?: AbortSignal): Promise<void> {
  const { message, stats } = await automate(ctx, signal);
  await ctx.post(message, stats);
}

/** Automations with a run going, so turns ending meanwhile don't start a second one. */
const running = new Set<string>();

function runInBackground(ctx: SkillContext): void {
  const id = ctx.actor.id;
  if (running.has(id)) return;
  running.add(id);
  ctx.startJob('Running the automation', ({ signal }) =>
    runAndPost(ctx, signal).finally(() => running.delete(id)),
  );
}

/**
 * Runs a script of model calls written in its settings and posts what it
 * produces as one message. Picked by a person, it runs right away; with
 * `automatic` on, it also runs in the background after other actors' turns.
 * A script that cannot run is refused when the actor is saved.
 */
export const automationSkill: Skill = {
  id: 'automation',
  name: 'Automation',
  backing: 'hybrid',
  modalities: ['text'],
  settings: automationSettings,
  checkSettings: scriptProblems,
  implements: [
    implement(automationContract, {
      run: async (_input, ctx) => ({ message: (await automate(ctx)).message }),
    }),
  ],
  onRequest: (ctx) => runAndPost(ctx),
  listensTo: [turnEnded.type],
  onEvent: (event, ctx) => {
    const { automatic, every } = readSettings(automationSettings, ctx.settings);
    if (automatic && turnEnded.is(event)) {
      if (due(ctx.transcript, ctx.actor.id, event.payload.actorId, every)) runInBackground(ctx);
    }
    return Promise.resolve();
  },
};

export const automationModule: VirtuocityModule = {
  id: 'skill-automation',
  register: (host) => {
    host.contracts.register(automationContract);
    host.docTypes.register(keptDoc);
    host.skills.register(automationSkill);
  },
};
