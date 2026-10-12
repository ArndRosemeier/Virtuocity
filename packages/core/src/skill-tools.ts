import type { Contract } from './contract';
import { actionSpec, provides } from './implementation';
import type { Skill } from './skill';
import type { Tool } from './tools';
import { defineTool } from './tools';

/** A contract action as a tool, e.g. `dice-roller_roll`. `call` performs the action. */
export function actionTool(
  contract: Contract,
  action: string,
  call: (input: unknown) => Promise<unknown>,
): Tool {
  const spec = actionSpec(contract, action);
  return defineTool({
    name: `${contract.name}_${action}`,
    description: spec.description,
    input: spec.input,
    run: call,
  });
}

/**
 * The abilities an actor's other skills offer, as tools for `skill`'s model
 * calls: every provided action of every contract they implement. Contracts
 * `skill` implements itself are left out, so a skill never calls itself.
 */
export function skillTools(
  skills: readonly Skill[],
  skill: Skill,
  call: (contract: Contract, action: string, input: unknown) => Promise<unknown>,
): Tool[] {
  const own = new Set((skill.implements ?? []).map((i) => i.contract.name));
  const tools = new Map<string, Tool>();
  for (const other of skills) {
    if (other.id === skill.id) continue;
    for (const implementation of other.implements ?? []) {
      const { contract } = implementation;
      if (own.has(contract.name)) continue;
      for (const action of Object.keys(contract.actions)) {
        if (!provides(implementation, action)) continue;
        const tool = actionTool(contract, action, (input) => call(contract, action, input));
        if (!tools.has(tool.spec.name)) tools.set(tool.spec.name, tool);
      }
    }
  }
  return [...tools.values()];
}
