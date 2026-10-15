import { keptParts } from '@virtuocity/core';

/** The latest analysis of each analytics actor. In the log, so it rewinds and saves with the session. */
export const analyses = keptParts(
  'session-analyses',
  'The latest analysis of each session analytics actor.',
);
