import type { SessionRuntime } from '@virtuocity/core';
import { IconButton, Icon } from '@virtuocity/ui';
import { useAppActions } from './actions';
import { StatsBadge } from './StatsBadge';

export function Header({ session }: { session: SessionRuntime }) {
  const { openSettings } = useAppActions();
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand__mark">
          <Icon name="lantern" />
        </span>
        <span className="brand__name">Virtuocity</span>
      </div>
      <div className="app-header__end">
        <StatsBadge stats={session.messages.allStats()} showModels={false} />
        <IconButton icon="settings" label="Settings" onClick={() => openSettings()} />
      </div>
    </header>
  );
}
