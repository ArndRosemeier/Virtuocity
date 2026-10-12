import type { AssetStore, SessionRuntime } from '@virtuocity/core';
import { IconButton, Icon } from '@virtuocity/ui';
import { useAppActions } from './actions';
import { Calls } from './Calls';
import { SessionMenu } from './SessionMenu';
import { StatsBadge } from './StatsBadge';
import type { AppHost } from './types';
import { WhatsNew } from './WhatsNew';

export function Header({
  host,
  session,
  assets,
}: {
  host: AppHost;
  session: SessionRuntime;
  assets: AssetStore;
}) {
  const { openSettings, openLibrary } = useAppActions();
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand__mark">
          <Icon name="lantern" />
        </span>
        <span className="brand__name">Virtuocity</span>
        <WhatsNew />
      </div>
      <div className="app-header__end">
        <StatsBadge stats={session.allStats()} showModels={false} />
        <Calls session={session} />
        <IconButton icon="bookmark" label="Library" onClick={openLibrary} />
        <SessionMenu host={host} session={session} assets={assets} />
        <IconButton icon="settings" label="Settings" onClick={() => openSettings()} />
      </div>
    </header>
  );
}
