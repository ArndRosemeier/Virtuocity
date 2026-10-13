import type { VirtuocityModule } from './module';
import { DECISIONS_MODALITY } from './decisions';
import { AUDIO_MODALITY, IMAGE_MODALITY, TEXT_MODALITY } from './models';
import { castContributor, castDoc } from './cast';
import { channelsDoc } from './channels';
import { instructionsContract } from './instructions';
import { setupDoc } from './setup';
import { transcriptDoc } from './transcript';

/** Built-in defaults every app installs first. */
export const coreModule: VirtuocityModule = {
  id: 'core',
  register: (host) => {
    host.contracts.register(instructionsContract);
    host.docTypes.register(transcriptDoc);
    host.docTypes.register(castDoc);
    host.docTypes.register(setupDoc);
    host.docTypes.register(channelsDoc);
    host.contextContributors.register(castContributor(() => host.profileFields.list()));
    for (const modality of [TEXT_MODALITY, IMAGE_MODALITY, AUDIO_MODALITY, DECISIONS_MODALITY])
      host.modalities.register(modality);
  },
};
