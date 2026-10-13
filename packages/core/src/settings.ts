import { z } from 'zod';
import type { Actor } from './actor';
import type { Identified } from './registry';

/** Settings a skill offers per actor. Every field has a default. */
export type SettingsSchema = z.ZodObject;

/**
 * Declares a skill's settings. Every field needs a default, so an actor
 * without stored settings still gets a complete, valid set.
 */
export function defineSettings<S extends z.ZodRawShape>(shape: S): z.ZodObject<S> {
  const schema = z.object(shape);
  const empty = schema.safeParse({});
  if (!empty.success) {
    const missing = empty.error.issues.map((issue) => issue.path.join('.'));
    throw new Error(`Settings need defaults: ${missing.join(', ')}`);
  }
  z.toJSONSchema(schema);
  return schema;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Lists of the app's that a settings field can pick from instead of free text. */
export type ChoiceSource = 'contracts' | 'panels' | 'cast-skills';

/**
 * A text setting the app offers as a pick from one of its lists: an installed
 * contract (`name@major.minor`), a panel id, or the id of a skill that can act
 * on its turn. Stored as the plain string.
 */
export function choice(source: ChoiceSource): z.ZodString {
  return z.string().meta({ choices: source });
}

/** Stored settings, with defaults for anything missing and invalid values dropped. */
export function readSettings<S extends SettingsSchema>(schema: S, stored: unknown): z.output<S> {
  const whole = schema.safeParse(isRecord(stored) ? stored : {});
  if (whole.success) return whole.data;
  const record = isRecord(stored) ? stored : {};
  const fields: Record<string, z.ZodType> = schema.shape;
  const valid = Object.entries(record).filter(
    ([key, value]) => fields[key]?.safeParse(value).success ?? false,
  );
  return schema.parse(Object.fromEntries(valid));
}

/** A skill's settings for one actor (defaults when the actor has none). */
export function skillSettings<S extends SettingsSchema>(
  actor: Actor,
  skillId: string,
  schema: S,
): z.output<S> {
  return readSettings(schema, actor.settings?.[skillId]);
}

/**
 * A field modules add to every actor's profile, such as appearance or voice.
 * Any skill can read it; the app shows it when creating or editing an actor.
 */
export interface ProfileField<S extends z.ZodType = z.ZodType> extends Identified {
  readonly label: string;
  readonly description: string;
  readonly schema: S;
}

export function defineProfileField<S extends z.ZodType>(field: ProfileField<S>): ProfileField<S> {
  z.toJSONSchema(field.schema);
  return field;
}

/** An actor's value for a profile field, or `undefined` when unset or invalid. */
export function profileValue<S extends z.ZodType>(
  actor: Actor,
  field: ProfileField<S>,
): z.output<S> | undefined {
  const parsed = field.schema.safeParse(actor.profile?.[field.id]);
  return parsed.success ? parsed.data : undefined;
}
