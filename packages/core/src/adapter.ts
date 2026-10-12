import type { ActionInput, ActionMap, ActionOutput, Contract } from './contract';
import { fulfils } from './contract';
import type { ContractRef } from './contract-version';
import type { Handlers, Implementation } from './implementation';
import { implement, invokeAction } from './implementation';
import type { Identified } from './registry';
import type { SkillContext } from './skill-context';

/** Calls actions on the implementation an adapter wraps. */
export interface AdapterSource<A> {
  invoke<K extends keyof A & string>(
    action: K,
    input: ActionInput<A[K]>,
    ctx: SkillContext,
  ): Promise<ActionOutput<A[K]>>;
}

/**
 * Lets an implementation of one contract serve requests for another, typically
 * an older major version, so sessions saved against `visualizer@1` keep working
 * when only `visualizer@2` skills are installed.
 */
export interface ContractAdapter extends Identified {
  readonly from: Contract;
  readonly to: Contract;
  adapt(source: Implementation): Implementation;
}

export interface AdapterSpec<F, T> {
  readonly id: string;
  readonly from: Contract<F>;
  readonly to: Contract<T>;
  readonly handlers: (source: AdapterSource<F>) => Handlers<T>;
}

export function defineAdapter<F extends ActionMap, T extends ActionMap>(
  spec: AdapterSpec<F, T>,
): ContractAdapter {
  return {
    id: spec.id,
    from: spec.from,
    to: spec.to,
    adapt: (source) => {
      const invoke = (action: string, input: unknown, ctx: SkillContext) =>
        invokeAction(source, action, input, ctx);
      return implement(spec.to, spec.handlers({ invoke } as AdapterSource<F>));
    },
  };
}

/**
 * Finds the candidate that can serve `wanted`: first one whose contract fulfils
 * it directly, otherwise one that an adapter can bridge.
 */
export function resolveImplementation<T>(
  candidates: readonly T[],
  implementationsOf: (candidate: T) => readonly Implementation[],
  wanted: ContractRef,
  adapters: readonly ContractAdapter[],
): { readonly candidate: T; readonly implementation: Implementation } | undefined {
  const pairs = candidates.flatMap((candidate) =>
    implementationsOf(candidate).map((implementation) => ({ candidate, implementation })),
  );
  const direct = pairs.find((p) => fulfils(p.implementation.contract, wanted));
  if (direct) return direct;
  for (const adapter of adapters.filter((a) => fulfils(a.to, wanted))) {
    const source = pairs.find((p) => fulfils(p.implementation.contract, adapter.from));
    if (source) return { ...source, implementation: adapter.adapt(source.implementation) };
  }
  return undefined;
}
