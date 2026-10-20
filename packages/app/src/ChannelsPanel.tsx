import { channelContents, everyone } from '@virtuocity/core';
import type { AppModule, PanelProps } from './types';
import { USER_ID } from './useSession';

/** Continuous outputs: what each channel shows or plays now, like the scene picture. */
function ChannelsPanel({ host, session }: PanelProps) {
  const contents = channelContents(session.workspace.view(USER_ID));
  const showing = host.channels.list().filter((c) => contents[c.id]);
  if (showing.length === 0) {
    return <p className="muted">Pictures and sound that stay up while the session moves on.</p>;
  }
  return (
    <div className="stack channels">
      {showing.map((channel) => {
        const content = contents[channel.id];
        if (!content) return null;
        const by = everyone(session).find((a) => a.id === content.actorId)?.personality.name;
        return (
          <figure key={channel.id} className="channel">
            {host.renderers.render(content.part)}
            <figcaption className="muted">
              {channel.title}
              {by ? `, by ${by}` : ''}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}

export const channelsPanelModule: AppModule = {
  id: 'channels-panel',
  register: (host) =>
    host.panels.register({
      id: 'channels',
      title: 'Now showing',
      slot: 'side',
      component: ChannelsPanel,
    }),
};
