import { IconButton } from '@virtuocity/ui';
import { useAppActions } from './actions';
import { RendererSelect } from './RendererSelect';
import { STORY_VIEW, rendererActors, rendererOf, setRenderer, storyView } from './storyView';
import type { PanelProps } from './types';

/** Picks this story's view, and opens it for editing (e.g. its system prompt). */
export function StoryViewPicker({ host, session }: PanelProps) {
  const { openEditActor } = useAppActions();
  if (!storyView(session)) return null;
  const pick = (actorId: string) => {
    const renderer = rendererActors(host).find((a) => a.id === actorId);
    if (renderer) void setRenderer(session, renderer);
  };
  return (
    <div className="story-view-picker">
      <RendererSelect
        host={host}
        label="Session view"
        hint="How this session is drawn. Edit it to change its settings."
        value={rendererOf(host, session)?.id ?? ''}
        onChange={pick}
      />
      <IconButton
        icon="edit"
        label="Edit the story view"
        onClick={() => openEditActor(STORY_VIEW)}
      />
    </div>
  );
}
