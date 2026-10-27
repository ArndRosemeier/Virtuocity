import type Anthropic from '@anthropic-ai/sdk';
import type {
  ChatMessage,
  ChatPart,
  CompletionRequest,
  CompletionResult,
  ToolCall,
} from '@virtuocity/core';

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

type ImageType = Anthropic.Base64ImageSource['media_type'];
const IMAGE_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const isImageType = (mime: string): mime is ImageType => IMAGE_TYPES.includes(mime);

/** Words as text, pictures as base64 images; a picture Anthropic cannot read becomes its `alt`. */
function partBlock(part: ChatPart): Block {
  const data = part.type === 'image' ? /^data:[^;]+;base64,(.*)$/s.exec(part.url ?? '')?.[1] : '';
  if (part.type === 'text') return { type: 'text', text: part.text };
  if (!data || !isImageType(part.mime)) return { type: 'text', text: part.alt };
  return { type: 'image', source: { type: 'base64', media_type: part.mime, data } };
}

function userMessage(message: Extract<ChatMessage, { role: 'user' }>): MessageParam | undefined {
  if (typeof message.content === 'string') {
    return message.content ? { role: 'user', content: message.content } : undefined;
  }
  return message.content.length > 0
    ? { role: 'user', content: message.content.map(partBlock) }
    : undefined;
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
  return message.role === 'user' ? userMessage(message) : undefined;
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
  const { tools, toolChoice, responseSchema, reasoningEffort } = request;
  if (reasoningEffort === 'none' || reasoningEffort === 'minimal') {
    throw new Error(`Anthropic does not support reasoning effort "${reasoningEffort}"`);
  }
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
    ...(responseSchema || reasoningEffort
      ? {
          output_config: {
            ...(responseSchema
              ? { format: { type: 'json_schema', schema: { ...responseSchema.schema } } }
              : {}),
            ...(reasoningEffort ? { effort: reasoningEffort } : {}),
          },
        }
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
