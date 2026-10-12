import type { AppModule } from './types';

/** Default renderers are plain code; any skill can replace them per output kind. */
export const defaultRenderersModule: AppModule = {
  id: 'default-renderers',
  register: (host) => {
    host.renderers.register({
      id: 'text',
      render: (part) => <p className="text-part">{String(part.data)}</p>,
    });
  },
};
