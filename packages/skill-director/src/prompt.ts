import type { DirectorCandidate } from '@virtuocity/contract-director';
import type { Actor, ChatMessage, Message } from '@virtuocity/core';

/** One line of the session as the director reads it: who said what. */
function line(message: Message, actors: readonly Actor[]): string {
  const name = actors.find((a) => a.id === message.actorId)?.personality.name ?? message.actorId;
  return `${name}: ${message.text}`;
}

function who(candidate: DirectorCandidate): string {
  return `- ${candidate.name}${candidate.person ? ' (a person)' : ''}`;
}

/** What the director reads: the session so far and what it knows beyond it. */
export interface DirectorView {
  readonly transcript: readonly Message[];
  /** Everyone in the session, to name who said what. */
  readonly actors: readonly Actor[];
  readonly context?: string;
}

/**
 * Asks the model to pick who takes the next turn, by name, from the director's
 * own perspective. Its personality says how it directs.
 */
export function directorPrompt(
  director: Actor,
  candidates: readonly DirectorCandidate[],
  { transcript, actors, context = '' }: DirectorView,
): ChatMessage[] {
  const system = [
    `You are ${director.personality.name}. You direct a session without taking part in it: after every turn you decide who takes the next one.`,
    director.personality.description,
    `Who may take the next turn:\n${candidates.map(who).join('\n')}`,
    'Pick a person when the session should wait for them, for example when they were asked something or it is their move.',
    context && `What you know:\n\n${context}`,
    'Answer with one JSON object only, like {"next": "<name>"}, naming exactly one of them.',
  ]
    .filter(Boolean)
    .join('\n\n');
  const story = transcript
    .filter((m) => m.text.trim() !== '')
    .map((m) => line(m, actors))
    .join('\n\n');
  const user = story ? `The session so far:\n\n${story}` : 'Nothing has happened yet.';
  return [
    { role: 'system', content: system },
    { role: 'user', content: `${user}\n\nWho takes the next turn?` },
  ];
}
