import { ModuleHost, coreModule, loadModules } from '@virtuocity/core';
import { openRouterModule } from '@virtuocity/openrouter';
import { conversationModule } from '@virtuocity/skill-conversation';
import { diceModule } from '@virtuocity/skill-dice';
import { reviewerModule } from '@virtuocity/skill-reviewer';
import { castPanelModule } from './CastPanel';
import { taskPanelModule } from './TaskPanel';
import { defaultRenderersModule } from './renderers';
import { API_KEY, readSetting } from './settings';
import type { AppHost, AppModule, PanelProps } from './types';
import type { ComponentType, ReactNode } from 'react';

/** The one place that decides which modules are installed. */
export function createHost(): AppHost {
  return loadModules(new ModuleHost<ReactNode, ComponentType<PanelProps>>(), [
    coreModule as AppModule,
    defaultRenderersModule,
    castPanelModule,
    taskPanelModule,
    openRouterModule({ apiKey: () => readSetting(API_KEY) }) as AppModule,
    conversationModule as AppModule,
    diceModule as AppModule,
    reviewerModule as AppModule,
  ]);
}
