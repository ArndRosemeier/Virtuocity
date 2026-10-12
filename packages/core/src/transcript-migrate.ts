import type { Content, OutputPart } from './output';
import type { ToolRun } from './tools';
import { TOOL_USE, describeToolRun } from './tools';

type V1Message = { readonly parts: readonly OutputPart[] } & Record<string, unknown>;
type V1Op =
  | { readonly type: 'append'; readonly message: V1Message }
  | { readonly type: 'edit'; readonly messageId: string; readonly parts: readonly OutputPart[] };

/** How a version 1 part reads as plain text. */
function partText(part: OutputPart): string {
  if (part.kind === 'text') return String(part.data);
  if (part.kind === TOOL_USE) return describeToolRun(part.data as ToolRun);
  const alt = (part.data as { alt?: unknown } | null)?.alt;
  return typeof alt === 'string' ? alt : `[${part.kind}]`;
}

/**
 * Version 1 messages held several parts; version 2 messages hold one piece of
 * content. A lone part is kept as it is. Several parts (a turn with tool calls)
 * become one text message reading like the parts did, so nothing is lost.
 */
export function partsToContent(parts: readonly OutputPart[]): Content {
  const [only] = parts;
  if (parts.length === 1 && only) return { ...only, text: partText(only) };
  const text = parts.map(partText).join('\n').trim();
  return { kind: 'text', data: text, text };
}

/** Upgrades a saved transcript operation to the current version. */
export function migrateTranscriptOp(payload: unknown, fromVersion: number): unknown {
  if (fromVersion >= 2) return payload;
  const op = payload as V1Op;
  if (op.type === 'edit') {
    return { type: 'edit', messageId: op.messageId, content: partsToContent(op.parts) };
  }
  const { parts, ...rest } = op.message;
  return { type: 'append', message: { ...rest, ...partsToContent(parts) } };
}
