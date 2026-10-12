import type { VirtuocityModule } from './module';
import { leastRecentDirector } from './turns';

/** Built-in defaults every app installs first. */
export const coreModule: VirtuocityModule = {
  id: 'core',
  register: (host) => host.directors.register(leastRecentDirector),
};
