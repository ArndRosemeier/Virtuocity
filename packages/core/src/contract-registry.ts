import type { Contract } from './contract';
import { ancestry, fulfils } from './contract';
import type { ContractRef } from './contract-version';
import { parseRef } from './contract-version';

/**
 * All known contracts, by `name@major.minor`. Registering a contract also
 * registers its ancestors. Registering the same contract twice is fine (several
 * skills may bring it), but two different definitions with one id are not.
 */
export class ContractRegistry {
  readonly #byId = new Map<string, Contract>();

  register(contract: Contract): void {
    for (const c of ancestry(contract)) this.#add(c);
  }

  get(id: string): Contract {
    const contract = this.#byId.get(id);
    if (!contract) throw new Error(`Unknown contract "${id}"`);
    return contract;
  }

  /** The newest registered minor version that satisfies the reference. */
  find(ref: ContractRef | string): Contract | undefined {
    const wanted = typeof ref === 'string' ? parseRef(ref) : ref;
    return this.list()
      .filter((c) => c.name === wanted.name && fulfils(c, wanted))
      .sort((a, b) => b.version.minor - a.version.minor)[0];
  }

  list(): Contract[] {
    return [...this.#byId.values()];
  }

  /** Every registered contract usable where `ref` is required, including itself. */
  descendantsOf(ref: ContractRef | string): Contract[] {
    const wanted = typeof ref === 'string' ? parseRef(ref) : ref;
    return this.list().filter((c) => fulfils(c, wanted));
  }

  #add(contract: Contract): void {
    const existing = this.#byId.get(contract.id);
    if (existing === contract) return;
    if (existing) throw new Error(`Contract "${contract.id}" is defined twice`);
    for (const other of this.list()) assertMinorCompatible(other, contract);
    this.#byId.set(contract.id, contract);
  }
}

/** A newer minor version must keep every action of the older one in the same major. */
function assertMinorCompatible(a: Contract, b: Contract): void {
  if (a.name !== b.name || a.version.major !== b.version.major) return;
  const [older, newer] = a.version.minor < b.version.minor ? [a, b] : [b, a];
  const missing = Object.keys(older.actions).filter((name) => !Object.hasOwn(newer.actions, name));
  if (missing.length > 0) {
    throw new Error(
      `"${newer.id}" drops actions of "${older.id}" (${missing.join(', ')}); that needs a new major version`,
    );
  }
}
