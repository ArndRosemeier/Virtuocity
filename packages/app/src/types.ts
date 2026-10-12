import type { ComponentType, ReactNode } from 'react';
import type { ModuleHost, SessionRuntime, VirtuocityModule } from '@virtuocity/core';

/** Every panel gets the running session and the module host. */
export interface PanelProps {
  readonly session: SessionRuntime;
  readonly host: AppHost;
}

/** In the web app, renderers produce React nodes and panels are React components. */
export type AppHost = ModuleHost<ReactNode, ComponentType<PanelProps>>;
export type AppModule = VirtuocityModule<ReactNode, ComponentType<PanelProps>>;
