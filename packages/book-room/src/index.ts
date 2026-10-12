import type { Flow, VirtuocityModule } from '@virtuocity/core';
import { bookPipelineFlow } from './pipeline';
import { manuscriptDoc } from './manuscript';

export * from './manuscript';
export * from './pipeline';

/** Book room: a manuscript document and the draft, review and approve pipeline. */
export const bookRoomModule: VirtuocityModule = {
  id: 'book-room',
  register: (host) => {
    host.docTypes.register(manuscriptDoc);
    host.flows.register(bookPipelineFlow as Flow);
  },
};
