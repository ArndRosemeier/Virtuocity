import { keptParts } from '@virtuocity/core';

/** The facts each fact gatherer has gathered. In the log, so they rewind, branch and save with the session. */
export const gatheredFacts = keptParts('facts', 'The facts each fact gatherer has gathered.');
