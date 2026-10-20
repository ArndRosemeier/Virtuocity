import type { z } from 'zod';
import type { Actor } from './actor';
import type { Contract } from './contract';
import type { VEvent } from './events';
import { defineEvent } from './events';
import type { Identified } from './registry';
import type { InvokeAction } from './skill-context';
import type { Message } from './transcript';
import type { StateView } from './workspace';

/**
 * What a flow can do while it runs. Every turn and every contract action
 * counts as a step, so step limits and interrupts apply everywhere.
 */
export interface FlowContext {
  readonly actors: readonly Actor[];
  /** The main transcript, omnisciently. */
  transcript(): readonly Message[];
  /** Shared documents; changes are made in the name of the flow. */
  readonly state: StateView;
  /** Lets one actor take a turn. */
  runTurn(actorId: string): Promise<void>;
  /** Asks an actor for a contract action; human actors get a task. */
  readonly invoke: InvokeAction;
  /** The cast: people and the actors who take turns talking. */
  cast(): readonly Actor[];
  /** Whether a cast actor's settings say it speaks only when a person picks it, never a director. */
  waitsToBeAsked(actorId: string): boolean;
  /** Whether an actor's skills serve a contract, e.g. whether it can direct. */
  serves(actorId: string, contract: Contract): boolean;
  /** Tells everyone listening that something happened, e.g. that the scene changed. */
  emit(event: VEvent): Promise<void>;
  /** Aborted when the human interrupts the run. */
  readonly signal: AbortSignal;
  /** Steps taken so far in this run. */
  readonly steps: number;
}

/**
 * An orchestrator: turn-taking, a writing pipeline, a game loop. A run does
 * some steps and returns, which pauses the session. Flows keep no state of
 * their own between runs; they read documents to decide what comes next, so
 * rewinding, branching and loading a session also move the flow.
 */
export interface Flow<I = unknown> extends Identified {
  readonly name: string;
  readonly description: string;
  /** Validates what the human passes to start a run. */
  readonly input: z.ZodType;
  run(ctx: FlowContext, input: I): Promise<void>;
}

export type FlowOutcome = 'paused' | 'interrupted' | 'step-limit' | 'failed';

export interface FlowResult {
  readonly outcome: FlowOutcome;
  readonly steps: number;
  readonly error?: unknown;
}

export const flowStarted = defineEvent<{ readonly flowId: string }>('flow.started');
export const flowEnded = defineEvent<{ readonly flowId: string; readonly result: FlowResult }>(
  'flow.ended',
);

/** Thrown inside a run when it must stop: the human interrupted or the step limit was hit. */
export class FlowStop extends Error {
  constructor(readonly outcome: 'interrupted' | 'step-limit') {
    super(outcome === 'interrupted' ? 'The run was interrupted' : 'The run hit its step limit');
    this.name = 'FlowStop';
  }
}

export function defineFlow<I>(flow: Flow<I>): Flow<I> {
  return flow;
}
