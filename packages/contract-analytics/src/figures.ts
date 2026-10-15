import { z } from '@virtuocity/core';

/**
 * Output kind of a few labeled figures about the session, e.g. how many words
 * it holds. Its data is a `SessionFigures`: groups of label and value pairs,
 * each value already written for people ("12,480").
 */
export const SESSION_FIGURES = 'session-figures';

export const figureSchema = z.object({
  label: z.string().describe('What is counted, e.g. Words'),
  value: z.string().describe('The figure as people read it, e.g. 12,480'),
});

export const figureGroupSchema = z.object({
  title: z.string().describe('What the group is about, e.g. Words per speaker'),
  figures: z.array(figureSchema),
});

export const sessionFiguresSchema = z.object({ groups: z.array(figureGroupSchema) });

export type Figure = z.output<typeof figureSchema>;
export type FigureGroup = z.output<typeof figureGroupSchema>;
export type SessionFigures = z.output<typeof sessionFiguresSchema>;
