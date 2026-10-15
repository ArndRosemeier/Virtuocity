import { z } from '@virtuocity/core';

/**
 * Output kind of a session outline: one thin, colored line per post, in
 * order, coloured by what kind of post it is, plus the markers actors placed
 * between posts (e.g. a chronicler's "Summarized"). Its data is a
 * `SessionOutline`. Clicking a line brings that post or marker into view.
 */
export const SESSION_OUTLINE = 'session-outline';

/** The kinds of post an outline tells apart, each with its own color. */
export const POST_TYPES = [
  'person',
  'ai',
  'picture',
  'sound',
  'tool',
  'hidden',
  'other',
  'marker',
] as const;

export type PostType = (typeof POST_TYPES)[number];

/** What each kind of post is called, e.g. in the outline's legend. */
export const POST_TYPE_NAMES: Readonly<Record<PostType, string>> = {
  person: 'Text by a person',
  ai: 'Text by an AI actor',
  picture: 'Picture',
  sound: 'Sound',
  tool: 'Tool use',
  hidden: 'Hidden from the people',
  other: 'Anything else',
  marker: 'Marker, e.g. Summarized',
};

export const outlineRowSchema = z.object({
  messageId: z.string().describe('The post this line stands for, or that a marker follows'),
  type: z.enum(POST_TYPES).describe('What kind of post it is'),
  title: z.string().describe('Shown on hover, e.g. "Wren · Picture"'),
  markerOf: z
    .string()
    .optional()
    .describe('For a marker: the actor that placed it, whose space clicking it opens'),
});

export const sessionOutlineSchema = z.object({ rows: z.array(outlineRowSchema) });

export type OutlineRow = z.output<typeof outlineRowSchema>;
export type SessionOutline = z.output<typeof sessionOutlineSchema>;
