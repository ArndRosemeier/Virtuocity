import type { ListChoice } from '@virtuocity/ui';
import type { AppHost } from './types';

/** The app's lists settings fields pick from: installed contracts, panels and skills that can act. */
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
    if (source === 'cast-skills') {
      return host.skills
        .list()
        .filter((s) => s.takeTurn !== undefined || s.onRequest !== undefined)
        .map((s) => ({ value: s.id, label: s.name }));
    }
    return [];
  };
}
