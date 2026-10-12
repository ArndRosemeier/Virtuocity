import type { MediaPartData, ToolRun } from '@virtuocity/core';
import { AUDIO_PART, IMAGE_PART, TOOL_USE } from '@virtuocity/core';
import type { ChatView } from '@virtuocity/skill-chat-view';
import { CHAT_VIEW } from '@virtuocity/skill-chat-view';
import { ChatViewPart } from './ChatView';
import { AudioPart, ImagePart } from './media';
import type { AppModule } from './types';

const brief = (value: unknown) => {
  const text = JSON.stringify(value);
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
};

/** One tool call: which ability was used, with what, and what came back. */
function ToolUse({ run }: { run: ToolRun }) {
  return (
    <p className="tool-use" data-failed={run.error !== undefined}>
      <span className="tool-use__name">{run.tool.replace('_', ' · ')}</span>
      <code>{brief(run.input)}</code>
      <span aria-hidden>→</span>
      <code>{run.error === undefined ? brief(run.output ?? null) : run.error}</code>
    </p>
  );
}

/** Default renderers are plain code; any skill can replace them per output kind. */
export const defaultRenderersModule: AppModule = {
  id: 'default-renderers',
  register: (host) => {
    host.renderers.register({
      id: 'text',
      render: (part) => <p className="story-text">{String(part.data)}</p>,
    });
    host.renderers.register({
      id: TOOL_USE,
      render: (part) => <ToolUse run={part.data as ToolRun} />,
    });
    host.renderers.register({
      id: IMAGE_PART,
      render: (part) => <ImagePart data={part.data as MediaPartData} />,
    });
    host.renderers.register({
      id: AUDIO_PART,
      render: (part) => <AudioPart data={part.data as MediaPartData} />,
    });
    host.renderers.register({
      id: CHAT_VIEW,
      render: (part) => <ChatViewPart host={host} view={part.data as ChatView} />,
    });
  },
};
