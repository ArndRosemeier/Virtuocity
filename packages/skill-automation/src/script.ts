/**
 * The automation language. A script is a list of model calls, one per line
 * (a prompt may span lines):
 *
 *   name = LLM("prompt")   keeps the answer in `name`
 *   LLM("prompt")          adds the answer to the one message the run posts
 *
 * `[name]` in a prompt puts in a variable's value, `[[` is a plain `[`, and
 * `\"` a quote. `[context]` is the story so far. Variables starting with `_`
 * keep their value from one run to the next (empty before the first). `//`
 * starts a comment.
 */

/** A piece of a prompt: plain text, or a variable whose value goes there. */
export type PromptPart = { readonly text: string } | { readonly variable: string };

export interface Statement {
  /** The line the statement starts on, for messages. */
  readonly line: number;
  /** The variable the answer goes into; without one, the answer is posted. */
  readonly target?: string;
  readonly prompt: readonly PromptPart[];
}

export type Parsed =
  | { readonly ok: true; readonly statements: readonly Statement[] }
  | { readonly ok: false; readonly errors: readonly string[] };

/** The story so far, set by the run itself. */
export const CONTEXT = 'context';
const RESERVED = new Set([CONTEXT, 'LLM']);

/** Whether a variable keeps its value between runs. */
export const isKept = (name: string) => name.startsWith('_');

const NAME = '[A-Za-z_][A-Za-z0-9_]*';
const BLANK = /(?:\s|\/\/[^\n]*)*/y;
const CALL = /LLM[ \t]*\([ \t]*"/y;
const TARGET = new RegExp(`(${NAME})[ \\t]*=[ \\t]*`, 'y');
const CLOSE = /[ \t]*\)/y;
const LINE_END = /[ \t]*(?:\/\/[^\n]*)?(?:\r?\n|$)/y;
const VARIABLE = new RegExp(`^(${NAME})\\]`);

class SyntaxProblem extends Error {}

/** Reads the source left to right; every read either matches at the cursor or moves nothing. */
class Reader {
  #at = 0;
  constructor(private readonly source: string) {}

  get done(): boolean {
    return this.#at >= this.source.length;
  }

  line(at = this.#at): number {
    return this.source.slice(0, at).split('\n').length;
  }

  match(pattern: RegExp): RegExpExecArray | undefined {
    pattern.lastIndex = this.#at;
    const found = pattern.exec(this.source);
    if (!found) return undefined;
    this.#at = pattern.lastIndex;
    return found;
  }

  fail(message: string, at = this.#at): never {
    throw new SyntaxProblem(`Line ${this.line(at)}: ${message}`);
  }

  /** The prompt up to its closing quote, with `\"` and `\\` read as the character they escape. */
  quoted(): string {
    const start = this.#at;
    let text = '';
    while (!this.done) {
      const char = this.source.charAt(this.#at);
      const next = this.source.charAt(this.#at + 1);
      if (char === '"') {
        this.#at++;
        return text;
      }
      const escaped = char === '\\' && (next === '"' || next === '\\');
      text += escaped ? next : char;
      this.#at += escaped ? 2 : 1;
    }
    return this.fail('the prompt is never closed: end it with "', start);
  }
}

/** Splits a prompt into text and variables; `[[` is a plain `[`. */
export function promptParts(prompt: string, line: number): PromptPart[] {
  const parts: PromptPart[] = [];
  let text = '';
  for (let i = 0; i < prompt.length; i++) {
    const char = prompt.charAt(i);
    if (char !== '[') {
      text += char;
    } else if (prompt.charAt(i + 1) === '[') {
      text += '[';
      i++;
    } else {
      const variable = VARIABLE.exec(prompt.slice(i + 1))?.[1];
      if (!variable) {
        throw new SyntaxProblem(
          `Line ${line}: [ starts a variable such as [name]; write [[ for a plain [`,
        );
      }
      if (text) parts.push({ text });
      parts.push({ variable });
      text = '';
      i += variable.length + 1;
    }
  }
  if (text) parts.push({ text });
  return parts;
}

function statement(reader: Reader): Statement {
  const line = reader.line();
  let target: string | undefined;
  if (!reader.match(CALL)) {
    target = reader.match(TARGET)?.[1];
    if (target === undefined) reader.fail('expected LLM("...") or name = LLM("...")');
    if (!reader.match(CALL)) reader.fail(`expected LLM("...") after ${target} =`);
  }
  const prompt = promptParts(reader.quoted(), line);
  if (!reader.match(CLOSE)) reader.fail('expected ) after the prompt');
  if (!reader.match(LINE_END)) reader.fail('put each LLM(...) on a line of its own');
  return target === undefined ? { line, prompt } : { line, target, prompt };
}

/** The variables a script keeps between runs: those starting with `_` that it sets. */
export function keptNames(statements: readonly Statement[]): Set<string> {
  return new Set(statements.flatMap((s) => (s.target && isKept(s.target) ? [s.target] : [])));
}

/** Variables used before they are set, reserved names, and a script that posts nothing. */
export function meaningProblems(statements: readonly Statement[]): string[] {
  const known = new Set([CONTEXT, ...keptNames(statements)]);
  const problems: string[] = [];
  for (const { line, target, prompt } of statements) {
    for (const part of prompt) {
      if ('variable' in part && !known.has(part.variable)) {
        problems.push(
          `Line ${line}: [${part.variable}] is not set yet; set it on an earlier line with ${part.variable} = LLM("...")`,
        );
      }
    }
    if (target && RESERVED.has(target)) {
      problems.push(`Line ${line}: ${target} is a name of its own; pick another`);
    } else if (target) {
      known.add(target);
    }
  }
  if (!statements.some((s) => s.target === undefined)) {
    problems.push('Nothing to post: add at least one LLM("...") that is not kept in a variable.');
  }
  return problems;
}

/** Reads a script, or says what is wrong with it, line by line. */
export function parseScript(source: string): Parsed {
  const reader = new Reader(source);
  const statements: Statement[] = [];
  try {
    reader.match(BLANK);
    while (!reader.done) {
      statements.push(statement(reader));
      reader.match(BLANK);
    }
  } catch (error) {
    if (error instanceof SyntaxProblem) return { ok: false, errors: [error.message] };
    throw error;
  }
  const errors = meaningProblems(statements);
  return errors.length > 0 ? { ok: false, errors } : { ok: true, statements };
}
