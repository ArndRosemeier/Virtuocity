import { bookRoomModule } from '@virtuocity/book-room';
import { ModuleHost, coreModule, loadModules } from '@virtuocity/core';
import { imageWorkflowModule } from '@virtuocity/image-workflow';
import { anthropicModule } from '@virtuocity/anthropic';
import { openAIModule, openRouterModule } from '@virtuocity/openai-api';
import { conversationModule } from '@virtuocity/skill-conversation';
import { diceModule } from '@virtuocity/skill-dice';
import { chroniclerModule } from '@virtuocity/skill-chronicler';
import { illustratorModule } from '@virtuocity/skill-illustrator';
import { galleryModule } from '@virtuocity/skill-gallery';
import { factGathererModule } from '@virtuocity/skill-fact-gatherer';
import { sessionAnalyticsModule } from '@virtuocity/skill-session-analytics';
import { premiseModule } from '@virtuocity/skill-premise';
import { automationModule } from '@virtuocity/skill-automation';
import { canvasModule } from '@virtuocity/skill-canvas';
import { chatViewModule } from '@virtuocity/skill-chat-view';
import { systemPromptModule } from '@virtuocity/skill-system-prompt';
import { roleplayViewModule } from '@virtuocity/skill-roleplay-view';
import { roleplayModule } from '@virtuocity/roleplay';
import { reviewerModule } from '@virtuocity/skill-reviewer';
import { directorModule } from '@virtuocity/skill-director';
import { sessionTypeModule } from '@virtuocity/skill-session-type';
import { turnTakingModule } from '@virtuocity/turn-taking';
import { writerModule } from '@virtuocity/skill-writer';
import { tabletopModule as tabletopSkillsModule } from '@virtuocity/skill-tabletop';
import { tabletopModule } from '@virtuocity/tabletop';
import { bookPanelModule } from './BookPanel';
import { castPanelModule } from './CastPanel';
import { channelsPanelModule } from './ChannelsPanel';
import { composerModule } from './Composer';
import { feedModule } from './Feed';
import { jobsPanelModule } from './JobsPanel';
import { spacesPanelModule } from './SpacesPanel';
import { taskPanelModule } from './TaskPanel';
import { defaultRenderersModule } from './renderers';
import { loggingFetch, promptLog } from './promptLog';
import { keySetting, readSetting } from './settings';
import type { AppHost, AppModule, PanelProps } from './types';
import type { ComponentType, ReactNode } from 'react';

/** Every provider call goes through this fetch, so the prompt log sees all of them. */
const logged = loggingFetch(promptLog, (input, init) => globalThis.fetch(input, init), Date.now);

/** Reads the user's key for a provider at call time, so key changes apply at once. */
const keyOf = (providerId: string) => ({
  apiKey: () => readSetting(keySetting(providerId)),
  fetch: logged,
});

/** The one place that decides which modules are installed. */
export function createHost(): AppHost {
  return loadModules(new ModuleHost<ReactNode, ComponentType<PanelProps>>(), [
    coreModule as AppModule,
    turnTakingModule as AppModule,
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
    conversationModule as AppModule,
    diceModule as AppModule,
    reviewerModule as AppModule,
    directorModule as AppModule,
    sessionTypeModule as AppModule,
    writerModule as AppModule,
    illustratorModule as AppModule,
    galleryModule as AppModule,
    chroniclerModule as AppModule,
    factGathererModule as AppModule,
    sessionAnalyticsModule as AppModule,
    premiseModule as AppModule,
    automationModule as AppModule,
    canvasModule as AppModule,
    chatViewModule as AppModule,
    systemPromptModule as AppModule,
    roleplayViewModule as AppModule,
    roleplayModule as AppModule,
    bookRoomModule as AppModule,
    imageWorkflowModule as AppModule,
    tabletopSkillsModule as AppModule,
    tabletopModule as AppModule,
    bookPanelModule,
  ]);
}
