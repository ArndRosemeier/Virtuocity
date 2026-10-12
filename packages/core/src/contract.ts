import { z } from 'zod';
import type { ContractRef, ContractVersion } from './contract-version';
import { assertContractName, formatRef, parseVersion, satisfies } from './contract-version';
import type { Identified } from './registry';

/**
 * One thing a contract promises: a named action with a typed input and output.
 * Schemas must be representable as JSON Schema, so the same definition drives
 * runtime validation, LLM tool calls and the forms humans fill in.
 */
export interface ActionSpec<
  I extends z.ZodType = z.ZodType,
  O extends z.ZodType = z.ZodType,
  Opt extends boolean = boolean,
> {
  readonly description: string;
  readonly input: I;
  readonly output: O;
  /** Optional actions may be left out by an implementation. */
  readonly optional: Opt;
}

export type ActionMap = Readonly<Record<string, ActionSpec>>;

/** What a caller passes to an action. */
export type ActionInput<S> = S extends ActionSpec<infer I> ? z.input<I> : never;
/** What a caller gets back from an action. */
export type ActionOutput<S> = S extends ActionSpec<z.ZodType, infer O> ? z.output<O> : never;

interface ActionDraft<I extends z.ZodType, O extends z.ZodType> {
  readonly description: string;
  readonly input: I;
  readonly output: O;
}

/** A required action: every implementation must provide it. */
export function action<I extends z.ZodType, O extends z.ZodType>(
  draft: ActionDraft<I, O>,
): ActionSpec<I, O, false> {
  return { ...draft, optional: false };
}

/** An action implementations may leave out. Callers check before relying on it. */
export function optionalAction<I extends z.ZodType, O extends z.ZodType>(
  draft: ActionDraft<I, O>,
): ActionSpec<I, O, true> {
  return { ...draft, optional: true };
}

/** What a conformance case can do with the implementation under test. */
export interface ConformanceTarget<A = ActionMap> {
  invoke<K extends keyof A & string>(
    action: K,
    input: ActionInput<A[K]>,
  ): Promise<ActionOutput<A[K]>>;
  implements(action: keyof A & string): boolean;
}

/** One check every implementation of a contract (and of its descendants) must pass. */
export interface ConformanceCase<A = ActionMap> {
  readonly name: string;
  /** Resolves when the implementation conforms; throws with a reason otherwise. */
  run(target: ConformanceTarget<A>): Promise<void>;
}

/**
 * A contract: the shared promise that makes skills of the same kind
 * interchangeable. Contracts are pure interfaces and may extend one or more
 * parents; a contract is accepted wherever any of its ancestors is required.
 * The `id` is `name@major.minor`.
 */
export interface Contract<A = ActionMap> extends Identified, ContractRef {
  readonly description: string;
  readonly parents: readonly Contract[];
  /** Own and inherited actions. */
  readonly actions: A;
  /** Event types implementations emit, own and inherited. */
  readonly emits: readonly string[];
  /** Event types implementations react to, own and inherited. */
  readonly listensTo: readonly string[];
  /** Output kinds implementations produce, own and inherited. */
  readonly outputs: readonly string[];
  /** This contract's own conformance cases; ancestors' cases apply too. */
  readonly conformance: readonly ConformanceCase<A>[];
}

type UnionToIntersection<U> = (U extends unknown ? (u: U) => void : never) extends (
  i: infer I,
) => void
  ? I
  : never;

/** Actions a contract gets from its parents. */
export type InheritedActions<P extends readonly Contract[]> = UnionToIntersection<
  P[number]['actions']
>;

export interface ContractSpec<A extends ActionMap, P extends readonly Contract[]> {
  readonly name: string;
  /** `major.minor`, e.g. `'1.0'`. */
  readonly version: string;
  readonly description: string;
  readonly extends?: P;
  readonly actions: A;
  readonly emits?: readonly string[];
  readonly listensTo?: readonly string[];
  readonly outputs?: readonly string[];
  readonly conformance?: readonly ConformanceCase<A & InheritedActions<P>>[];
}

export function defineContract<A extends ActionMap, const P extends readonly Contract[] = []>(
  spec: ContractSpec<A, P>,
): Contract<A & InheritedActions<P>> {
  assertContractName(spec.name);
  const version: ContractVersion = parseVersion(spec.version);
  const parents: readonly Contract[] = spec.extends ?? [];
  const id = formatRef({ name: spec.name, version });
  const actions = mergeActions(id, parents, spec.actions);
  const inherit = (
    own: readonly string[] | undefined,
    pick: (c: Contract) => readonly string[],
  ) => [...new Set([...parents.flatMap(pick), ...(own ?? [])])];
  return {
    id,
    name: spec.name,
    version,
    description: spec.description,
    parents,
    actions: actions as A & InheritedActions<P>,
    emits: inherit(spec.emits, (c) => c.emits),
    listensTo: inherit(spec.listensTo, (c) => c.listensTo),
    outputs: inherit(spec.outputs, (c) => c.outputs),
    conformance: spec.conformance ?? [],
  };
}

function mergeActions(id: string, parents: readonly Contract[], own: ActionMap): ActionMap {
  const merged = new Map<string, ActionSpec>();
  for (const parent of parents) {
    for (const [name, spec] of Object.entries(parent.actions)) {
      const existing = merged.get(name);
      if (existing && existing !== spec) {
        throw new Error(`Contract "${id}" inherits conflicting definitions of action "${name}"`);
      }
      merged.set(name, spec);
    }
  }
  for (const [name, spec] of Object.entries(own)) {
    if (merged.has(name)) {
      throw new Error(`Contract "${id}" cannot redefine inherited action "${name}"`);
    }
    assertJsonSchema(id, name, spec);
    merged.set(name, spec);
  }
  return Object.fromEntries(merged);
}

function assertJsonSchema(id: string, name: string, spec: ActionSpec): void {
  for (const [side, schema] of [
    ['input', spec.input],
    ['output', spec.output],
  ] as const) {
    try {
      z.toJSONSchema(schema);
    } catch (error) {
      throw new Error(`Contract "${id}" action "${name}" ${side} is not representable as JSON`, {
        cause: error,
      });
    }
  }
}

/** The contract itself and every ancestor, each once. */
export function ancestry(contract: Contract): Contract[] {
  const seen = new Map<string, Contract>();
  const visit = (c: Contract) => {
    if (seen.has(c.id)) return;
    seen.set(c.id, c);
    c.parents.forEach(visit);
  };
  visit(contract);
  return [...seen.values()];
}

/** True when `contract` can be used where `wanted` is required (itself or an ancestor satisfies it). */
export function fulfils(contract: Contract, wanted: ContractRef): boolean {
  return ancestry(contract).some((c) => satisfies(c, wanted));
}
