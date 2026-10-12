import type { ComponentType, ReactNode } from 'react';
import { ModuleHost, loadModules } from '@virtuocity/core';
import { openRouterModule } from '@virtuocity/openrouter';
import { diceModule } from '@virtuocity/skill-dice';
import { defaultRenderersModule } from './renderers';
import { readApiKey } from './settings';
import type { AppHost, AppModule } from './types';

/** The one place that decides which modules are installed. */
export function createHost(): AppHost {
  return loadModules(new ModuleHost<ReactNode, ComponentType>(), [
    defaultRenderersModule,
    openRouterModule({ apiKey: readApiKey }) as AppModule,
    diceModule as AppModule,
  ]);
}
