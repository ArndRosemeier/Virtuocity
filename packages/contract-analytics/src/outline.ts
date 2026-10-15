import { z } from '@virtuocity/core';

/**
 * Output kind of a session outline: one thin, colored line per post, in
 * order, coloured by what kind of post it is. Its data is a `SessionOutline`.
 * Clicking a line brings that post into view in the session.
 */
export const SESSION_OUTLINE = 'session-outline';

/** The kinds of post an outline tells apart, each with its own color. */
export const POST_TYPES = ['person', 'ai', 'picture', 'sound', 'tool', 'hidden', 'other'] as const;

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
};

export const outlineRowSchema = z.object({
  messageId: z.string().describe('The post this line stands for'),
  type: z.enum(POST_TYPES).describe('What kind of post it is'),
  title: z.string().describe('Shown on hover, e.g. "Wren · Picture"'),
});

export const sessionOutlineSchema = z.object({ rows: z.array(outlineRowSchema) });

export type OutlineRow = z.output<typeof outlineRowSchema>;
export type SessionOutline = z.output<typeof sessionOutlineSchema>;
