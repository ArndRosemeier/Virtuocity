import type { z } from 'zod';
import type { ActionMap, ActionSpec, Contract } from './contract';
import type { SkillContext } from './skill-context';

export type ContractErrorCode =
  | 'no-implementation'
  | 'unknown-action'
  | 'not-implemented'
  | 'invalid-input'
  | 'invalid-output'
  | 'failed'
  | 'cancelled';

/** Every way a contract call can go wrong, with a code callers can branch on. */
export class ContractError extends Error {
  constructor(
    readonly code: ContractErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ContractError';
  }
}

/** Gets the parsed input and returns the output (validated by the core afterwards). */
export type ActionHandler<S> =
  S extends ActionSpec<infer I, infer O>
    ? (input: z.output<I>, ctx: SkillContext) => Promise<z.input<O>>
    : never;

type RequiredKeys<A> = {
  [K in keyof A]: A[K] extends { readonly optional: true } ? never : K;
}[keyof A];
type OptionalKeys<A> = Exclude<keyof A, RequiredKeys<A>>;

/** Handlers for every required action, and optionally for the optional ones. */
export type Handlers<A> = { readonly [K in RequiredKeys<A>]: ActionHandler<A[K]> } & {
  readonly [K in OptionalKeys<A>]?: ActionHandler<A[K]>;
};

type ErasedHandler = (input: unknown, ctx: SkillContext) => Promise<unknown>;

/** A skill's implementation of one contract. Build it with `implement`. */
export interface Implementation {
  readonly contract: Contract;
  readonly handlers: Readonly<Partial<Record<string, ErasedHandler>>>;
}

/** Type-checks the handlers against the contract and verifies none is missing. */
export function implement<A extends ActionMap>(
  contract: Contract<A>,
  handlers: Handlers<A>,
): Implementation {
  const erased = handlers as Readonly<Partial<Record<string, ErasedHandler>>>;
  for (const [name, spec] of Object.entries(contract.actions)) {
    if (!spec.optional && !hasHandler(erased, name)) {
      throw new Error(`Implementation of "${contract.id}" is missing action "${name}"`);
    }
  }
  for (const name of Object.keys(erased)) {
    if (!Object.hasOwn(contract.actions, name)) {
      throw new Error(`"${contract.id}" has no action "${name}" to implement`);
    }
  }
  return { contract, handlers: erased };
}

function hasHandler(handlers: Implementation['handlers'], name: string): boolean {
  return Object.hasOwn(handlers, name) && typeof handlers[name] === 'function';
}

/** True when the implementation provides the action (always true for required ones). */
export function provides(implementation: Implementation, action: string): boolean {
  return hasHandler(implementation.handlers, action);
}

/** Looks up an action of a contract, ignoring anything inherited from `Object.prototype`. */
export function actionSpec(contract: Contract, action: string): ActionSpec {
  const spec = Object.hasOwn(contract.actions, action) ? contract.actions[action] : undefined;
  if (!spec)
    throw new ContractError('unknown-action', `"${contract.id}" has no action "${action}"`);
  return spec;
}

/** Validates a value against one side of an action, throwing a `ContractError` on mismatch. */
export function validate(
  schema: z.ZodType,
  value: unknown,
  code: 'invalid-input' | 'invalid-output',
  where: string,
): unknown {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ContractError(code, `${where}: ${result.error.message}`, { cause: result.error });
  }
  return result.data;
}

/** Runs one action: validates the input, calls the handler, validates the output. */
export async function invokeAction(
  implementation: Implementation,
  action: string,
  input: unknown,
  ctx: SkillContext,
): Promise<unknown> {
  const { contract, handlers } = implementation;
  const where = `${contract.id} ${action}`;
  const spec = actionSpec(contract, action);
  const handler = hasHandler(handlers, action) ? handlers[action] : undefined;
  if (!handler) throw new ContractError('not-implemented', `${where} is not implemented`);
  const parsed = validate(spec.input, input, 'invalid-input', where);
  let output: unknown;
  try {
    output = await handler(parsed, ctx);
  } catch (error) {
    if (error instanceof ContractError) throw error;
    throw new ContractError('failed', `${where} failed: ${String(error)}`, { cause: error });
  }
  return validate(spec.output, output, 'invalid-output', where);
}
