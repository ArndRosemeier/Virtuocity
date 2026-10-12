import { z } from 'zod';
import type { Contract } from './contract';
import type { EventBus } from './events';
import { defineEvent } from './events';
import { ContractError, actionSpec, validate } from './implementation';

export type JsonSchema = z.core.JSONSchema.BaseSchema;

/**
 * A contract action waiting for a person. Humans can fill any seat, so any
 * action can be assigned to a human; the UI renders a form from the schemas.
 */
export interface HumanTask {
  readonly id: string;
  readonly actorId: string;
  readonly contractId: string;
  readonly action: string;
  readonly description: string;
  readonly input: unknown;
  readonly inputSchema: JsonSchema;
  readonly outputSchema: JsonSchema;
  readonly createdAt: number;
}

export const humanTaskCreated = defineEvent<{ readonly taskId: string }>('human-task.created');
export const humanTaskSettled = defineEvent<{
  readonly taskId: string;
  readonly outcome: 'submitted' | 'cancelled';
}>('human-task.settled');

interface Pending {
  readonly task: HumanTask;
  readonly output: z.ZodType;
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: ContractError) => void;
}

export interface HumanTaskOptions {
  readonly bus: EventBus;
  readonly newId?: () => string;
  readonly now?: () => number;
}

/** Contract actions assigned to humans, waiting to be answered. */
export class HumanTaskQueue {
  readonly #pending = new Map<string, Pending>();
  readonly #newId: () => string;
  readonly #now: () => number;

  constructor(private readonly options: HumanTaskOptions) {
    this.#newId = options.newId ?? (() => crypto.randomUUID());
    this.#now = options.now ?? Date.now;
  }

  pending(): HumanTask[] {
    return [...this.#pending.values()].map((p) => p.task);
  }

  /** Creates a task and resolves with the human's validated answer. */
  async request(
    actorId: string,
    contract: Contract,
    action: string,
    input: unknown,
  ): Promise<unknown> {
    const spec = actionSpec(contract, action);
    const parsed = validate(spec.input, input, 'invalid-input', `${contract.id} ${action}`);
    const task: HumanTask = {
      id: this.#newId(),
      actorId,
      contractId: contract.id,
      action,
      description: spec.description,
      input: parsed,
      inputSchema: z.toJSONSchema(spec.input),
      outputSchema: z.toJSONSchema(spec.output),
      createdAt: this.#now(),
    };
    const answer = new Promise<unknown>((resolve, reject) => {
      this.#pending.set(task.id, { task, output: spec.output, resolve, reject });
    });
    await this.options.bus.emit(humanTaskCreated.create({ taskId: task.id }, actorId));
    return answer;
  }

  /** Answers a task. Invalid output throws and leaves the task open for another try. */
  async submit(taskId: string, output: unknown): Promise<void> {
    const pending = this.#take(taskId, false);
    const where = `${pending.task.contractId} ${pending.task.action}`;
    const value = validate(pending.output, output, 'invalid-output', where);
    this.#pending.delete(taskId);
    pending.resolve(value);
    await this.#settled(pending.task, 'submitted');
  }

  async cancel(taskId: string, reason = 'cancelled by the user'): Promise<void> {
    const pending = this.#take(taskId, true);
    pending.reject(new ContractError('cancelled', reason));
    await this.#settled(pending.task, 'cancelled');
  }

  #take(taskId: string, remove: boolean): Pending {
    const pending = this.#pending.get(taskId);
    if (!pending) throw new Error(`Unknown human task "${taskId}"`);
    if (remove) this.#pending.delete(taskId);
    return pending;
  }

  async #settled(task: HumanTask, outcome: 'submitted' | 'cancelled'): Promise<void> {
    await this.options.bus.emit(
      humanTaskSettled.create({ taskId: task.id, outcome }, task.actorId),
    );
  }
}
