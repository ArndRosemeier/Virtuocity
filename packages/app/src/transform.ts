import { createContext, useContext } from 'react';
import type { ChatMessage, SessionRuntime } from '@virtuocity/core';
import type { TextField, TransformText } from '@virtuocity/ui';

/** Runs a text prompt for the person with the default text model and returns the reply. */
export type AskModel = (messages: readonly ChatMessage[]) => Promise<string>;

export const AskModelContext = createContext<AskModel | null>(null);

export function askModel(session: SessionRuntime): AskModel {
  return async (messages) => {
    const { text } = await session.assist({ modality: 'text', messages }, 'transform-text');
    if (!text.trim()) throw new Error('The model returned nothing.');
    return text.trim();
  };
}

/** What the model may know about the actor a field belongs to. */
export interface TransformAbout {
  readonly name: string;
  /** Other fields already filled in, by label. */
  readonly known: readonly (readonly [string, string])[];
}

const SYSTEM =
  'You turn short notes into the finished text of one field in an actor editor. Keep every idea in the notes and add concrete, fitting details. If the text is already detailed, improve it instead. Write only what this field is for, in at most about 120 words. Reply with the new text of the field only: no preamble, no quotes, no headings.';

/** The prompt that transforms one field's text. */
export function transformPrompt(
  field: TextField,
  text: string,
  about?: TransformAbout,
): ChatMessage[] {
  const lines = [`Field: ${field.label}${field.hint ? ` (${field.hint})` : ''}`];
  if (about?.name.trim()) lines.push(`Actor: ${about.name.trim()}`);
  for (const [label, value] of about?.known ?? []) {
    if (value.trim() && label !== field.label) lines.push(`${label}: ${value.trim()}`);
  }
  lines.push('', `Text to transform:\n"""\n${text.trim()}\n"""`);
  return [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: lines.join('\n') },
  ];
}

/** "Transform by AI" for fields of one actor, or undefined when the app offers no model. */
export function useTransform(about: TransformAbout): TransformText | undefined {
  const ask = useContext(AskModelContext);
  return ask ? (field, text) => ask(transformPrompt(field, text, about)) : undefined;
}
