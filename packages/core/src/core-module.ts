import type { VirtuocityModule } from './module';
import { AUDIO_MODALITY, IMAGE_MODALITY, TEXT_MODALITY } from './models';
import { leastRecentDirector } from './turns';

/** Built-in defaults every app installs first. */
export const coreModule: VirtuocityModule = {
  id: 'core',
  register: (host) => {
    host.directors.register(leastRecentDirector);
    for (const modality of [TEXT_MODALITY, IMAGE_MODALITY, AUDIO_MODALITY])
      host.modalities.register(modality);
  },
};
