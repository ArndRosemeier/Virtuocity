import type { ListChoice } from '@virtuocity/ui';
import type { AppHost } from './types';

/** The app's lists settings fields pick from: installed contracts and panels. */
export function appChoices(host: AppHost): (source: string) => readonly ListChoice[] {
  return (source) => {
    if (source === 'contracts') {
      return host.contracts
        .list()
        .map((c) => ({ value: c.id, label: `${c.id}: ${c.description}` }));
    }
    if (source === 'panels') {
      return host.panels.list().map((p) => ({ value: p.id, label: `${p.title} (${p.slot})` }));
    }
    return [];
  };
}
