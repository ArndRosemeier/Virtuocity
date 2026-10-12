/**
 * Contract versions are `major.minor`. A minor release only adds to what the
 * contract promises; a major release may change anything.
 */
export interface ContractVersion {
  readonly major: number;
  readonly minor: number;
}

/** Points at a contract by name and minimum version, e.g. `visualizer@1` or `visualizer@1.2`. */
export interface ContractRef {
  readonly name: string;
  readonly version: ContractVersion;
}

const NAME = /^[a-z][a-z0-9-]*$/;
const VERSION = /^(\d+)(?:\.(\d+))?$/;

export function parseVersion(text: string): ContractVersion {
  const match = VERSION.exec(text);
  if (!match) throw new Error(`Invalid contract version "${text}", expected "major.minor"`);
  return { major: Number(match[1]), minor: Number(match[2] ?? 0) };
}

export function formatRef(ref: ContractRef): string {
  return `${ref.name}@${ref.version.major}.${ref.version.minor}`;
}

/** Parses `name@major` or `name@major.minor`; a missing minor means "any minor". */
export function parseRef(text: string): ContractRef {
  const [name = '', version = '', ...rest] = text.split('@');
  if (!NAME.test(name) || rest.length > 0) throw new Error(`Invalid contract reference "${text}"`);
  return { name, version: parseVersion(version) };
}

export function assertContractName(name: string): void {
  if (!NAME.test(name)) {
    throw new Error(`Invalid contract name "${name}": use lowercase letters, digits and dashes`);
  }
}

/** True when a contract at `actual` can serve a request for `wanted`. */
export function satisfies(actual: ContractRef, wanted: ContractRef): boolean {
  return (
    actual.name === wanted.name &&
    actual.version.major === wanted.version.major &&
    actual.version.minor >= wanted.version.minor
  );
}
