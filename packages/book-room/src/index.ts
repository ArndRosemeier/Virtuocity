import type { Flow, VirtuocityModule } from '@virtuocity/core';
import { sessionTypeContract } from '@virtuocity/core';
import { bookRoomStarters, bookRoomType } from './starters';
import { bookPipelineFlow } from './pipeline';
import { manuscriptContributor } from './context';
import { manuscriptDoc } from './manuscript';

export * from './starters';
export * from './context';
export * from './manuscript';
export * from './pipeline';

/** Book room: a manuscript document and the draft, review and approve pipeline. */
export const bookRoomModule: VirtuocityModule = {
  id: 'book-room',
  register: (host) => {
    host.docTypes.register(manuscriptDoc);
    host.flows.register(bookPipelineFlow as Flow);
    host.contextContributors.register(manuscriptContributor);
    host.contracts.register(sessionTypeContract);
    [bookRoomType, ...bookRoomStarters].forEach((s) => host.starters.register(s));
  },
};
