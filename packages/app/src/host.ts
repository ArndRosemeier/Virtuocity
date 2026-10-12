import { bookRoomModule } from '@virtuocity/book-room';
import { ModuleHost, coreModule, loadModules } from '@virtuocity/core';
import { anthropicModule } from '@virtuocity/anthropic';
import { openAIModule, openRouterModule } from '@virtuocity/openai-api';
import { wiroModule } from '@virtuocity/wiro';
import { conversationModule } from '@virtuocity/skill-conversation';
import { diceModule } from '@virtuocity/skill-dice';
import { chroniclerModule } from '@virtuocity/skill-chronicler';
import { illustratorModule } from '@virtuocity/skill-illustrator';
import { premiseModule } from '@virtuocity/skill-premise';
import { canvasModule } from '@virtuocity/skill-canvas';
import { chatViewModule } from '@virtuocity/skill-chat-view';
import { systemPromptModule } from '@virtuocity/skill-system-prompt';
import { roleplayViewModule } from '@virtuocity/skill-roleplay-view';
import { roleplayModule } from '@virtuocity/roleplay';
import { reviewerModule } from '@virtuocity/skill-reviewer';
import { writerModule } from '@virtuocity/skill-writer';
import { bookPanelModule } from './BookPanel';
import { castPanelModule } from './CastPanel';
import { channelsPanelModule } from './ChannelsPanel';
import { composerModule } from './Composer';
import { feedModule } from './Feed';
import { jobsPanelModule } from './JobsPanel';
import { spacesPanelModule } from './SpacesPanel';
import { taskPanelModule } from './TaskPanel';
import { defaultRenderersModule } from './renderers';
import { keySetting, proxySetting, readSetting } from './settings';
import type { AppHost, AppModule, PanelProps } from './types';
import type { ComponentType, ReactNode } from 'react';

/** Reads the user's key for a provider at call time, so key changes apply at once. */
const keyOf = (providerId: string) => ({ apiKey: () => readSetting(keySetting(providerId)) });

/** The one place that decides which modules are installed. */
export function createHost(): AppHost {
  return loadModules(new ModuleHost<ReactNode, ComponentType<PanelProps>>(), [
    coreModule as AppModule,
    defaultRenderersModule,
    feedModule,
    composerModule,
    channelsPanelModule,
    castPanelModule,
    spacesPanelModule,
    taskPanelModule,
    jobsPanelModule,
    openRouterModule(keyOf('openrouter')) as AppModule,
    openAIModule(keyOf('openai')) as AppModule,
    anthropicModule(keyOf('anthropic')) as AppModule,
    wiroModule({ ...keyOf('wiro'), proxy: () => readSetting(proxySetting('wiro')) }) as AppModule,
    conversationModule as AppModule,
    diceModule as AppModule,
    reviewerModule as AppModule,
    writerModule as AppModule,
    illustratorModule as AppModule,
    chroniclerModule as AppModule,
    premiseModule as AppModule,
    canvasModule as AppModule,
    chatViewModule as AppModule,
    systemPromptModule as AppModule,
    roleplayViewModule as AppModule,
    roleplayModule as AppModule,
    bookRoomModule as AppModule,
    bookPanelModule,
  ]);
}
