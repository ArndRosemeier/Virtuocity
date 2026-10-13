export class ConformanceFailure extends Error {
  override readonly name = 'ConformanceFailure';
}

/** Assertion for conformance cases, which must not depend on a test framework. */
export function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new ConformanceFailure(message);
}
