import type { Actor } from './actor';
import type { Identified } from './registry';
import type { Message } from './transcript';
import type { StateView } from './workspace';

/** One thing an actor knows, offered to its model calls: a summary, the outline, who is here. */
export interface ContextPiece {
  readonly id: string;
  readonly title: string;
  readonly text: string;
  /** Higher first. When the budget is tight, low-priority pieces are left out. */
  readonly priority: number;
}

/** What a contributor sees: everything from the reading actor's perspective. */
export interface ContextRequest {
  readonly actor: Actor;
  readonly actors: readonly Actor[];
  /** People and the actors who take turns talking; see `SessionRuntime.cast`. */
  readonly cast: readonly Actor[];
  readonly state: StateView;
  readonly transcript: readonly Message[];
}

/** Modules contribute context pieces; every LLM skill can use them. */
export interface ContextContributor extends Identified {
  contribute(request: ContextRequest): readonly ContextPiece[];
}

export interface AssembledContext {
  /** The pieces that fit, highest priority first. */
  readonly pieces: readonly ContextPiece[];
  /** Ids of pieces left out for lack of room. */
  readonly dropped: readonly string[];
  readonly tokens: number;
  /** The pieces as one block of text for a prompt. */
  readonly text: string;
}

/** A rough token count (about four characters per token), good enough for budgeting. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function formatContext(pieces: readonly ContextPiece[]): string {
  return pieces.map((p) => `## ${p.title}\n${p.text.trim()}`).join('\n\n');
}

/**
 * Picks pieces by priority until the budget is used up. A piece that doesn't
 * fit is skipped, so a smaller, less important one can still make it in.
 */
export function assembleContext(
  pieces: readonly ContextPiece[],
  budget: number,
  estimate: (text: string) => number = estimateTokens,
): AssembledContext {
  const sorted = [...pieces].sort((a, b) => b.priority - a.priority);
  const kept: ContextPiece[] = [];
  const dropped: string[] = [];
  let tokens = 0;
  for (const piece of sorted) {
    const cost = estimate(`## ${piece.title}\n${piece.text}`);
    if (tokens + cost <= budget) {
      kept.push(piece);
      tokens += cost;
    } else dropped.push(piece.id);
  }
  return { pieces: kept, dropped, tokens, text: formatContext(kept) };
}

/** The newest items that fit the budget, in their original order. */
export function fitNewest<T>(items: readonly T[], budget: number, cost: (item: T) => number): T[] {
  const kept: T[] = [];
  let used = 0;
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i] as T;
    used += cost(item);
    if (used > budget) break;
    kept.unshift(item);
  }
  return kept;
}
