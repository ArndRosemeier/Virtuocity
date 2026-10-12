import { z } from 'zod';
import type { Content } from './output';
import type {
  ChatMessage,
  Complete,
  CompletionResult,
  ModelRequest,
  ToolCall,
  ToolSpec,
} from './provider';

/** Something a model can call: a description for the model and the code that runs it. */
export interface Tool {
  readonly spec: ToolSpec;
  /** Validates the arguments and runs the tool. Errors are reported back to the model. */
  run(args: unknown): Promise<unknown>;
}

const TOOL_NAME = /^[a-zA-Z0-9_-]{1,64}$/;

export interface ToolDraft<S extends z.ZodType> {
  readonly name: string;
  readonly description: string;
  readonly input: S;
  run(input: z.output<S>): Promise<unknown>;
}

export function defineTool<S extends z.ZodType>(draft: ToolDraft<S>): Tool {
  if (!TOOL_NAME.test(draft.name)) throw new Error(`Invalid tool name "${draft.name}"`);
  return {
    spec: {
      name: draft.name,
      description: draft.description,
      parameters: z.toJSONSchema(draft.input),
    },
    run: async (args) => draft.run(draft.input.parse(args)),
  };
}

/** One tool call the model made, with what came of it. */
export interface ToolRun {
  readonly tool: string;
  readonly input: unknown;
  readonly output?: unknown;
  readonly error?: string;
}

export interface ToolLoopResult {
  /** The final answer, made without tool calls. */
  readonly result: CompletionResult;
  /** Every call made, for cost tracking. */
  readonly calls: readonly CompletionResult[];
  readonly runs: readonly ToolRun[];
}

async function runCall(tools: readonly Tool[], call: ToolCall): Promise<ToolRun> {
  let input: unknown = call.arguments;
  try {
    input = call.arguments.trim() === '' ? {} : JSON.parse(call.arguments);
    const tool = tools.find((t) => t.spec.name === call.name);
    if (!tool) throw new Error(`There is no tool named "${call.name}"`);
    return { tool: call.name, input, output: await tool.run(input) };
  } catch (error) {
    const message = error instanceof z.ZodError ? z.prettifyError(error) : String(error);
    return { tool: call.name, input, error: message };
  }
}

function toolMessage(call: ToolCall, run: ToolRun): ChatMessage {
  const content =
    run.error === undefined ? JSON.stringify(run.output ?? null) : `Error: ${run.error}`;
  return { role: 'tool', toolCallId: call.id, content };
}

/**
 * Lets the model call tools until it answers in plain text. Failed calls are
 * reported to the model so it can correct itself. After `maxRounds` rounds of
 * tool calls the model must answer.
 */
export async function completeWithTools(
  complete: Complete,
  request: ModelRequest,
  tools: readonly Tool[],
  maxRounds = 4,
): Promise<ToolLoopResult> {
  if (tools.length === 0) {
    const result = await complete(request);
    return { result, calls: [result], runs: [] };
  }
  const specs = tools.map((t) => t.spec);
  const calls: CompletionResult[] = [];
  const runs: ToolRun[] = [];
  let messages: readonly ChatMessage[] = request.messages;
  for (let round = 0; ; round++) {
    const first = round === 0 ? request.toolChoice : undefined;
    const toolChoice = round >= maxRounds ? 'none' : (first ?? 'auto');
    const result = await complete({ ...request, messages, tools: specs, toolChoice });
    calls.push(result);
    const wanted = toolChoice === 'none' ? [] : (result.toolCalls ?? []);
    if (wanted.length === 0) return { result, calls, runs };
    const assistant: ChatMessage = { role: 'assistant', content: result.text, toolCalls: wanted };
    const answers: ChatMessage[] = [];
    for (const call of wanted) {
      const run = await runCall(tools, call);
      runs.push(run);
      answers.push(toolMessage(call, run));
    }
    messages = [...messages, assistant, ...answers];
  }
}

/** Output kind for a tool call shown in a message. Its data is a `ToolRun`. */
export const TOOL_USE = 'tool-use';

/** A tool call as content for the story, reading as one line of text. */
export function toolUseContent(run: ToolRun): Content<ToolRun> {
  return { kind: TOOL_USE, data: run, text: describeToolRun(run) };
}

/** One line describing a tool call, for prompts and plain-text views. */
export function describeToolRun(run: ToolRun): string {
  const result =
    run.error === undefined ? JSON.stringify(run.output ?? null) : `failed: ${run.error}`;
  return `[${run.tool} ${JSON.stringify(run.input)} → ${result}]`;
}
