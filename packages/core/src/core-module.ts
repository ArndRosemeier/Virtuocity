import type { Flow } from './flow';
import type { VirtuocityModule } from './module';
import { AUDIO_MODALITY, IMAGE_MODALITY, TEXT_MODALITY } from './models';
import { castContributor, castDoc } from './cast';
import { channelsDoc } from './channels';
import { setupDoc } from './setup';
import { transcriptDoc } from './transcript';
import { turnTakingFlow } from './turn-taking';
import { leastRecentDirector } from './turns';

/** Built-in defaults every app installs first. */
export const coreModule: VirtuocityModule = {
  id: 'core',
  register: (host) => {
    host.directors.register(leastRecentDirector);
    host.flows.register(turnTakingFlow as Flow);
    host.docTypes.register(transcriptDoc);
    host.docTypes.register(castDoc);
    host.docTypes.register(setupDoc);
    host.docTypes.register(channelsDoc);
    host.contextContributors.register(castContributor(() => host.profileFields.list()));
    for (const modality of [TEXT_MODALITY, IMAGE_MODALITY, AUDIO_MODALITY])
      host.modalities.register(modality);
  },
};
