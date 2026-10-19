import { describe, expect, it } from 'vitest';
import { runScript } from './run';
import type { Statement } from './script';
import { parseScript } from './script';

function statements(source: string): readonly Statement[] {
  const parsed = parseScript(source);
  if (!parsed.ok) throw new Error(parsed.errors.join('\n'));
  return parsed.statements;
}

/** A model that answers every prompt with what it was asked, so tests see the filled prompts. */
const echo = (prompts: string[]) => (prompt: string) => {
  prompts.push(prompt);
  return Promise.resolve(` <${prompt}> `);
};

describe('runScript', () => {
  it('fills variables in order and posts the bare calls as one message', async () => {
    const prompts: string[] = [];
    const script = statements('a = LLM("one [context]")\nLLM("two [a]")\nLLM("three")');
    const result = await runScript(script, { context: 'story', kept: {} }, echo(prompts));
    expect(prompts).toEqual(['one story', 'two <one story>', 'three']);
    expect(result.text).toBe('<two <one story>>\n\n<three>');
    expect(result.kept).toEqual({});
  });

  it('starts kept variables with their last value and hands back only those it sets', async () => {
    const prompts: string[] = [];
    const script = statements('LLM("was [_n]")\n_n = LLM("next")');
    const kept = { _n: 'old', _gone: 'stale' };
    const result = await runScript(script, { context: '', kept }, echo(prompts));
    expect(prompts).toEqual(['was old', 'next']);
    expect(result.kept).toEqual({ _n: '<next>' });
  });

  it('reads a kept variable as empty before its first run', async () => {
    const prompts: string[] = [];
    await runScript(
      statements('LLM("[_n]!")\n_n = LLM("x")'),
      { context: '', kept: {} },
      echo(prompts),
    );
    expect(prompts[0]).toBe('!');
  });

  it('posts plain text filled in, without asking the model', async () => {
    const prompts: string[] = [];
    const script = statements('a = LLM("one")\nb = "[a] and [context]"\n"Result: [b]"');
    const result = await runScript(script, { context: 'story', kept: {} }, echo(prompts));
    expect(prompts).toEqual(['one']);
    expect(result.text).toBe('Result: <one> and story');
  });

  it('leaves out empty answers instead of posting blank lines', async () => {
    const answers = ['', 'only'];
    const script = statements('LLM("a")\nLLM("b")');
    const result = await runScript(script, { context: '', kept: {} }, () =>
      Promise.resolve(answers.shift() ?? ''),
    );
    expect(result.text).toBe('only');
  });
});
