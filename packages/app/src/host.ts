import { bookRoomModule } from '@virtuocity/book-room';
import { ModuleHost, coreModule, loadModules } from '@virtuocity/core';
import { openRouterModule } from '@virtuocity/openrouter';
import { conversationModule } from '@virtuocity/skill-conversation';
import { diceModule } from '@virtuocity/skill-dice';
import { chroniclerModule } from '@virtuocity/skill-chronicler';
import { illustratorModule } from '@virtuocity/skill-illustrator';
import { roleplayModule } from '@virtuocity/roleplay';
import { reviewerModule } from '@virtuocity/skill-reviewer';
import { writerModule } from '@virtuocity/skill-writer';
import { bookPanelModule } from './BookPanel';
import { castPanelModule } from './CastPanel';
import { channelsPanelModule } from './ChannelsPanel';
import { composerModule } from './Composer';
import { feedModule } from './Feed';
import { jobsPanelModule } from './JobsPanel';
import { memoryPanelModule } from './MemoryPanel';
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
    feedModule,
    composerModule,
    channelsPanelModule,
    castPanelModule,
    memoryPanelModule,
    taskPanelModule,
    jobsPanelModule,
    openRouterModule({ apiKey: () => readSetting(API_KEY) }) as AppModule,
    conversationModule as AppModule,
    diceModule as AppModule,
    reviewerModule as AppModule,
    writerModule as AppModule,
    illustratorModule as AppModule,
    chroniclerModule as AppModule,
    roleplayModule as AppModule,
    bookRoomModule as AppModule,
    bookPanelModule,
  ]);
}
