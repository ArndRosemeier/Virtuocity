import type { Actor } from './actor';
import type { ConformanceTarget, Contract } from './contract';
import { ancestry } from './contract';
import { coreModule } from './core-module';
import { provides } from './implementation';
import { ModuleHost, loadModules } from './module';
import type { ModelOverrides } from './models';
import { qualifyOverrides } from './models';
import type { ModelProvider } from './provider';
import { SessionRuntime } from './runtime';
import type { Skill } from './skill';

/** One case of a contract's suite, tagged with the contract that defined it. */
export interface ConformanceEntry {
  readonly contractId: string;
  readonly name: string;
  run(target: ConformanceTarget): Promise<void>;
}

/**
 * Every case an implementation of `contract` must pass: its own and those of
 * all its ancestors, so a child is checked as a valid stand-in for each parent.
 */
export function conformanceSuite(contract: Contract): ConformanceEntry[] {
  return ancestry(contract).flatMap((c) =>
    c.conformance.map((testCase) => ({
      contractId: c.id,
      name: testCase.name,
      run: (target: ConformanceTarget) => testCase.run(target),
    })),
  );
}

export class ConformanceFailure extends Error {
  override readonly name = 'ConformanceFailure';
}

/** Assertion for conformance cases, which must not depend on a test framework. */
export function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new ConformanceFailure(message);
}

export interface ConformanceSetup {
  /** The skill under test, plus any it needs. */
  readonly skills: readonly Skill[];
  /** Use `scriptedProvider` or `replayProvider` so LLM-backed skills stay deterministic. */
  readonly provider?: ModelProvider;
  readonly modelDefaults?: ModelOverrides;
}

const ACTOR_ID = 'subject';

/** A minimal session with one AI actor holding the skills, ready to be checked. */
export function conformanceTarget<A>(
  contract: Contract<A>,
  setup: ConformanceSetup,
): ConformanceTarget<A> {
  const host = loadModules(new ModuleHost(), [coreModule]);
  setup.skills.forEach((skill) => host.skills.register(skill));
  if (setup.provider) host.providers.register(setup.provider);
  const runtime = new SessionRuntime({
    host,
    modelDefaults: () =>
      qualifyOverrides(setup.modelDefaults ?? { text: 'test-model' }, setup.provider?.id ?? 'none'),
  });
  const actor: Actor = {
    id: ACTOR_ID,
    controller: 'ai',
    personality: { name: 'Subject', description: '' },
    skillIds: setup.skills.map((s) => s.id),
  };
  const joined = runtime.join(actor);
  const erased = contract as Contract;
  return {
    invoke: async (action, input) => {
      await joined;
      return runtime.invoke(ACTOR_ID, contract, action, input);
    },
    implements: (action) => {
      const implementation = runtime.implementationFor(ACTOR_ID, erased);
      return implementation !== undefined && provides(implementation, action);
    },
  };
}
