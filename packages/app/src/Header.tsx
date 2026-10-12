import type { AssetStore, SessionRuntime } from '@virtuocity/core';
import { Button, IconButton, Icon } from '@virtuocity/ui';
import { useAppActions } from './actions';
import { Calls } from './Calls';
import { SessionMenu } from './SessionMenu';
import { StatsBadge } from './StatsBadge';
import { WhatsNew } from './WhatsNew';
import { useSessions } from './switcher';

export function Header({ session, assets }: { session: SessionRuntime; assets: AssetStore }) {
  const { openSettings, openLibrary, openSessions } = useAppActions();
  const { entries, openId } = useSessions();
  const open = entries.find((e) => e.id === openId);
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand__mark">
          <Icon name="lantern" />
        </span>
        <span className="brand__name">Virtuocity</span>
        <WhatsNew />
        <Button variant="ghost" icon="folder" title="Sessions" onClick={openSessions}>
          {open?.name ?? 'Sessions'}
        </Button>
      </div>
      <div className="app-header__end">
        <StatsBadge stats={session.allStats()} showModels={false} />
        <Calls session={session} />
        <IconButton icon="bookmark" label="Library" onClick={openLibrary} />
        <SessionMenu session={session} assets={assets} />
        <IconButton icon="settings" label="Settings" onClick={() => openSettings()} />
      </div>
    </header>
  );
}
