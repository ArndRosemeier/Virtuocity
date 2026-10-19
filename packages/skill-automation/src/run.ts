import type { PromptPart, Statement } from './script';
import { CONTEXT, keptNames } from './script';

export interface RunInput {
  /** The story so far, for `[context]`. */
  readonly context: string;
  /** What the variables starting with `_` held after the last run. */
  readonly kept: Readonly<Record<string, string>>;
}

export interface RunResult {
  /** The results of the statements not kept in a variable, joined into one message. */
  readonly text: string;
  /** The variables starting with `_` that the script sets, for the next run. */
  readonly kept: Record<string, string>;
}

/** Asks the model one prompt and returns its answer. */
export type Ask = (prompt: string) => Promise<string>;

const fill = (prompt: readonly PromptPart[], values: ReadonlyMap<string, string>) =>
  prompt.map((part) => ('text' in part ? part.text : (values.get(part.variable) ?? ''))).join('');

/**
 * Runs a parsed script top to bottom: a model call for each `LLM(...)`, the
 * filled-in text for each plain one. Ordinary variables start empty every
 * run; kept ones start with their last value.
 */
export async function runScript(
  statements: readonly Statement[],
  input: RunInput,
  ask: Ask,
): Promise<RunResult> {
  const values = new Map<string, string>(Object.entries(input.kept));
  values.set(CONTEXT, input.context);
  const posted: string[] = [];
  for (const statement of statements) {
    const { target, prompt } = statement;
    const text = fill(prompt, values);
    const answer = (statement.ask ? await ask(text) : text).trim();
    if (target === undefined) posted.push(answer);
    else values.set(target, answer);
  }
  const kept = [...keptNames(statements)].map((name) => [name, values.get(name) ?? ''] as const);
  return { text: posted.filter(Boolean).join('\n\n'), kept: Object.fromEntries(kept) };
}
