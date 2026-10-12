import { z } from 'zod';
import type { ChatMessage, Complete, CompletionResult, ModelRequest } from './provider';

/** The JSON value in a model reply, tolerating code fences and text around it. */
export function extractJson(reply: string): unknown {
  const start = reply.search(/[[{]/);
  const end = Math.max(reply.lastIndexOf('}'), reply.lastIndexOf(']'));
  if (start < 0 || end < start) throw new Error('The reply contains no JSON');
  return JSON.parse(reply.slice(start, end + 1));
}

export interface StructuredOptions {
  /** Names the answer for providers that support JSON Schema output. */
  readonly name?: string;
  /** How often to show the model its mistake and ask again. Default 2. */
  readonly repairs?: number;
}

export interface StructuredResult<T> {
  readonly value: T;
  /** Every call made, including failed attempts, for cost tracking. */
  readonly calls: readonly CompletionResult[];
}

/** The answer could not be parsed or validated, even after repairs. */
export class StructuredOutputError extends Error {
  constructor(
    message: string,
    readonly calls: readonly CompletionResult[],
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'StructuredOutputError';
  }
}

function parse<S extends z.ZodType>(schema: S, text: string): z.output<S> {
  return schema.parse(extractJson(text));
}

function describe(error: unknown): string {
  return error instanceof z.ZodError ? z.prettifyError(error) : String(error);
}

/**
 * Asks for an answer matching `schema`. Invalid answers are shown back to the
 * model with what was wrong, up to `repairs` times.
 */
export async function completeStructured<S extends z.ZodType>(
  complete: Complete,
  request: ModelRequest,
  schema: S,
  options: StructuredOptions = {},
): Promise<StructuredResult<z.output<S>>> {
  const responseSchema = { name: options.name ?? 'answer', schema: z.toJSONSchema(schema) };
  const calls: CompletionResult[] = [];
  let messages: readonly ChatMessage[] = request.messages;
  let lastError: unknown;
  for (let attempt = 0; attempt <= (options.repairs ?? 2); attempt++) {
    const result = await complete({ ...request, messages, responseSchema });
    calls.push(result);
    try {
      return { value: parse(schema, result.text), calls };
    } catch (error) {
      lastError = error;
      messages = [
        ...messages,
        { role: 'assistant', content: result.text },
        {
          role: 'user',
          content: `That answer is not valid:\n${describe(error)}\nReply again with only the corrected JSON.`,
        },
      ];
    }
  }
  throw new StructuredOutputError(`No valid answer: ${describe(lastError)}`, calls, {
    cause: lastError,
  });
}
