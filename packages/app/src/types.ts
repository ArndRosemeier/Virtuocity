import type { ComponentType, ReactNode } from 'react';
import type { ModuleHost, VirtuocityModule } from '@virtuocity/core';

/** In the web app, renderers produce React nodes and panels are React components. */
export type AppHost = ModuleHost<ReactNode, ComponentType>;
export type AppModule = VirtuocityModule<ReactNode, ComponentType>;
