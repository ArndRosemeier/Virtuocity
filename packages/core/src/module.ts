import type { Seat } from './actor';
import type { Identified } from './registry';
import { Registry } from './registry';
import { RendererRegistry } from './output';
import type { ModelProvider } from './provider';
import type { Skill } from './skill';
import type { Director } from './turns';

/** A ruleset bundle (free form, D&D 5e, Pathfinder 2e...). */
export interface GameMode extends Identified {
  readonly name: string;
  /** Skills this mode makes available to actors. */
  readonly skillIds: readonly string[];
  /** Seats a new session of this mode starts with. */
  readonly defaultSeats: readonly Seat[];
}

/** A UI area contributed by a module. `C` is the UI's component type. */
export interface PanelContribution<C = unknown> extends Identified {
  readonly title: string;
  readonly slot: 'side' | 'bottom' | (string & {});
  readonly component: C;
}

/** All extension points a module can plug into. */
export class ModuleHost<R = unknown, C = unknown> {
  readonly skills = new Registry<Skill>('skill');
  readonly gameModes = new Registry<GameMode>('game mode');
  readonly providers = new Registry<ModelProvider>('model provider');
  readonly directors = new Registry<Director>('director');
  readonly renderers = new RendererRegistry<R>();
  readonly panels = new Registry<PanelContribution<C>>('panel');
}

/** The unit of extension. Each package exports one or more of these. */
export interface VirtuocityModule<R = unknown, C = unknown> extends Identified {
  register(host: ModuleHost<R, C>): void;
}

export function loadModules<R, C>(
  host: ModuleHost<R, C>,
  modules: readonly VirtuocityModule<R, C>[],
): ModuleHost<R, C> {
  for (const module of modules) module.register(host);
  return host;
}
