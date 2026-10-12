import type Anthropic from '@anthropic-ai/sdk';
import type { ChatMessage, CompletionRequest, CompletionResult, ToolCall } from '@virtuocity/core';

type MessageParam = Anthropic.MessageParam;
type Block = Anthropic.ContentBlockParam;

/** Tool arguments arrive as JSON text; Anthropic wants the object. */
function toolInput(args: string): unknown {
  try {
    return JSON.parse(args) as unknown;
  } catch {
    return {};
  }
}

function assistantBlocks(message: Extract<ChatMessage, { role: 'assistant' }>): Block[] {
  const text: Block[] = message.content ? [{ type: 'text', text: message.content }] : [];
  const calls: Block[] = (message.toolCalls ?? []).map((c) => ({
    type: 'tool_use',
    id: c.id,
    name: c.name,
    input: toolInput(c.arguments),
  }));
  return [...text, ...calls];
}

/** One chat message in Anthropic's shape; empty ones are left out, since the API refuses them. */
function toMessage(message: ChatMessage): MessageParam | undefined {
  if (message.role === 'tool') {
    const result: Block = {
      type: 'tool_result',
      tool_use_id: message.toolCallId,
      content: message.content,
    };
    return { role: 'user', content: [result] };
  }
  if (message.role === 'assistant') {
    const content = assistantBlocks(message);
    return content.length > 0 ? { role: 'assistant', content } : undefined;
  }
  return message.role === 'user' && message.content ? message : undefined;
}

/** A conversation must open with the user, so one that opens with the model gets a nudge first. */
const OPENING: MessageParam = { role: 'user', content: 'Continue.' };

export function toMessages(messages: readonly ChatMessage[]): MessageParam[] {
  const converted = messages.map(toMessage).filter((m): m is MessageParam => m !== undefined);
  return converted[0]?.role === 'assistant' ? [OPENING, ...converted] : converted;
}

function systemText(messages: readonly ChatMessage[]): string {
  return messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');
}

const CHOICES = {
  auto: { type: 'auto' },
  required: { type: 'any' },
  none: { type: 'none' },
} as const;

/** The Messages API request for one call; `maxTokens` is the model's output limit. */
export function toParams(
  request: CompletionRequest,
  maxTokens: number,
): Anthropic.MessageStreamParams {
  const { tools, toolChoice, responseSchema } = request;
  const system = systemText(request.messages);
  return {
    model: request.model,
    max_tokens: maxTokens,
    messages: toMessages(request.messages),
    ...(system ? { system } : {}),
    ...(tools?.length
      ? {
          tools: tools.map((t) => ({
            name: t.name,
            description: t.description,
            input_schema: { type: 'object', ...t.parameters },
          })),
        }
      : {}),
    ...(toolChoice && tools?.length ? { tool_choice: CHOICES[toolChoice] } : {}),
    ...(responseSchema
      ? { output_config: { format: { type: 'json_schema', schema: { ...responseSchema.schema } } } }
      : {}),
  };
}

export function fromMessage(message: Anthropic.Message): CompletionResult {
  const text = message.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
  const toolCalls: ToolCall[] = message.content.flatMap((b) =>
    b.type === 'tool_use' ? [{ id: b.id, name: b.name, arguments: JSON.stringify(b.input) }] : [],
  );
  const { usage } = message;
  const cached = (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0);
  return {
    text,
    ...(toolCalls.length ? { toolCalls } : {}),
    stats: {
      model: message.model,
      promptTokens: usage.input_tokens + cached,
      completionTokens: usage.output_tokens,
    },
  };
}
