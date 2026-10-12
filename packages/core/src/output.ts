import type { Identified } from './registry';
import { Registry } from './registry';

/** One piece of a message: text, an image, a dice roll, a sound... */
export interface OutputPart<D = unknown> {
  /** Output kind, e.g. `'text'`, `'image'`, `'dice-roll'`. */
  readonly kind: string;
  readonly data: D;
}

/**
 * Turns an output part into something the UI can show. `R` is the UI's
 * render type (a React node in the web app), so the core stays UI-agnostic.
 * The renderer's id is the output kind it handles.
 */
export interface Renderer<R = unknown, D = unknown> extends Identified {
  render(part: OutputPart<D>): R;
}

/**
 * Every output kind has exactly one active renderer. Modules ship defaults
 * with `register` and skills swap them with `replace`.
 */
export class RendererRegistry<R = unknown> extends Registry<Renderer<R>> {
  constructor() {
    super('renderer');
  }

  render(part: OutputPart): R {
    return this.get(part.kind).render(part);
  }
}
