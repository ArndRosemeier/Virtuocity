import type { Actor } from './actor';
import type { ContractAdapter } from './adapter';
import type { Blueprint } from './blueprint';
import type { Channel } from './channels';
import type { ContextContributor } from './context-assembly';
import { ContractRegistry } from './contract-registry';
import type { DocType } from './doc-type';
import type { Flow } from './flow';
import type { InstructionSource } from './instructions';
import type { ModalityInfo } from './models';
import type { Identified } from './registry';
import { Registry } from './registry';
import { RendererRegistry } from './output';
import type { ModelProvider } from './provider';
import type { ProfileField } from './settings';
import type { Skill } from './skill';
import type { WritePolicy } from './workspace';

/**
 * A piece of UI contributed by a module. `C` is the UI's component type.
 * Slots: `main` holds views (the story feed, a manuscript, a scene), `input`
 * holds controls (the chat composer, action buttons), `side` holds panels.
 */
export interface PanelContribution<C = unknown> extends Identified {
  readonly title: string;
  readonly slot: 'main' | 'input' | 'side' | (string & {});
  readonly component: C;
}

/** All extension points a module can plug into. */
export class ModuleHost<R = unknown, C = unknown> {
  readonly contracts = new ContractRegistry();
  readonly adapters = new Registry<ContractAdapter>('contract adapter');
  readonly docTypes = new Registry<DocType>('document type');
  readonly policies = new Registry<WritePolicy>('write policy');
  readonly skills = new Registry<Skill>('skill');
  readonly modalities = new Registry<ModalityInfo>('modality');
  readonly blueprints = new Registry<Blueprint>('blueprint');
  readonly providers = new Registry<ModelProvider>('model provider');
  readonly flows = new Registry<Flow>('flow');
  readonly renderers = new RendererRegistry<R>();
  readonly panels = new Registry<PanelContribution<C>>('panel');
  readonly profileFields = new Registry<ProfileField>('profile field');
  readonly channels = new Registry<Channel>('channel');
  readonly contextContributors = new Registry<ContextContributor>('context contributor');
  readonly instructions = new Registry<InstructionSource>('instruction source');
  /** Ready-made actors modules offer outside any blueprint, e.g. story views. */
  readonly actors = new Registry<Actor>('ready-made actor');
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
