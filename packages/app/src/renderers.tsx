import type { MediaPartData, ToolRun } from '@virtuocity/core';
import { AUDIO_PART, IMAGE_PART, TOOL_USE } from '@virtuocity/core';
import type { ChatView } from '@virtuocity/contract-render';
import { CHAT_VIEW } from '@virtuocity/contract-render';
import {
  SESSION_FIGURES,
  SESSION_OUTLINE,
  sessionFiguresSchema,
  sessionOutlineSchema,
} from '@virtuocity/contract-analytics';
import type { RichText } from '@virtuocity/skill-roleplay-view';
import { RICH_TEXT } from '@virtuocity/skill-roleplay-view';
import { ChatViewPart } from './ChatView';
import { RichTextView } from './RichText';
import { SessionFiguresView } from './SessionFigures';
import { SessionOutlineView } from './SessionOutline';
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
      id: RICH_TEXT,
      render: (part) => <RichTextView text={part.data as RichText} />,
    });
    host.renderers.register({
      id: CHAT_VIEW,
      render: (part) => <ChatViewPart host={host} view={part.data as ChatView} />,
    });
    host.renderers.register({
      id: SESSION_OUTLINE,
      render: (part) => {
        const outline = sessionOutlineSchema.safeParse(part.data);
        return outline.success ? <SessionOutlineView outline={outline.data} /> : null;
      },
    });
    host.renderers.register({
      id: SESSION_FIGURES,
      render: (part) => {
        const figures = sessionFiguresSchema.safeParse(part.data);
        return figures.success ? <SessionFiguresView figures={figures.data} /> : null;
      },
    });
  },
};
