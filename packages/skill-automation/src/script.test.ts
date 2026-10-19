import { describe, expect, it } from 'vitest';
import type { Parsed } from './script';
import { parseScript } from './script';

const errors = (parsed: Parsed) => (parsed.ok ? [] : parsed.errors);

describe('parseScript', () => {
  it('reads kept and posted calls, with prompts that span lines', () => {
    const parsed = parseScript(`// a comment
mood = LLM("Name the mood.

[context]")   // trailing comment

LLM( "Write a [mood] line." )`);
    expect(parsed).toEqual({
      ok: true,
      statements: [
        {
          line: 2,
          ask: true,
          target: 'mood',
          prompt: [{ text: 'Name the mood.\n\n' }, { variable: 'context' }],
        },
        {
          line: 6,
          ask: true,
          prompt: [{ text: 'Write a ' }, { variable: 'mood' }, { text: ' line.' }],
        },
      ],
    });
  });

  it('reads plain text, kept or posted, that asks no model', () => {
    const parsed = parseScript('who = "the [[old] innkeeper"\n"Ask [who]:\n[context]" // posted');
    expect(parsed).toEqual({
      ok: true,
      statements: [
        { line: 1, ask: false, target: 'who', prompt: [{ text: 'the [old] innkeeper' }] },
        {
          line: 2,
          ask: false,
          prompt: [{ text: 'Ask ' }, { variable: 'who' }, { text: ':\n' }, { variable: 'context' }],
        },
      ],
    });
  });

  it('reads \\" as a quote, \\\\ as a backslash and [[ as a plain [', () => {
    const parsed = parseScript('LLM("Say \\"hi\\" [[1] \\\\ \\n")');
    expect(parsed.ok && parsed.statements[0]?.prompt).toEqual([{ text: 'Say "hi" [1] \\ \\n' }]);
  });

  it('refuses a variable used before the line that sets it', () => {
    expect(errors(parseScript('LLM("[later]")\nlater = LLM("x")'))).toEqual([
      'Line 1: [later] is not set yet; set it on an earlier line with later = LLM("...")',
    ]);
    expect(errors(parseScript('x = LLM("[x]")\nLLM("[x]")'))).toHaveLength(1);
  });

  it('lets a kept variable be read before it is set, since it holds the last run', () => {
    const parsed = parseScript('LLM("Before: [_notes]")\n_notes = LLM("[_notes] and more")');
    expect(parsed.ok).toBe(true);
  });

  it('refuses a script that posts nothing, and an empty one', () => {
    expect(errors(parseScript('x = LLM("a")'))[0]).toMatch(/Nothing to post/);
    expect(errors(parseScript('  // only a comment\n'))[0]).toMatch(/Nothing to post/);
  });

  it('keeps context and LLM as names of their own', () => {
    expect(errors(parseScript('context = LLM("a")\nLLM("b")'))).toEqual([
      'Line 1: context is a name of its own; pick another',
    ]);
  });

  it('says on which line the syntax goes wrong', () => {
    expect(errors(parseScript('LLM("a")\nmood LLM("b")'))).toEqual([
      'Line 2: expected LLM("..."), "..." or name = ...',
    ]);
    expect(errors(parseScript('x = a'))).toEqual([
      'Line 1: expected LLM("...") or "..." after x =',
    ]);
    expect(errors(parseScript('LLM("a"'))).toEqual(['Line 1: expected ) after the prompt']);
    expect(errors(parseScript('\n\nLLM("open'))).toEqual([
      'Line 3: the quotes are never closed: end the text with "',
    ]);
    expect(errors(parseScript('LLM("a") LLM("b")'))).toEqual([
      'Line 1: put each statement on a line of its own',
    ]);
    expect(errors(parseScript('"a")'))).toEqual([
      'Line 1: put each statement on a line of its own',
    ]);
    expect(errors(parseScript('LLM("a [not a name]")'))).toEqual([
      'Line 1: [ starts a variable such as [name]; write [[ for a plain [',
    ]);
  });
});
