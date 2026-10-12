import { useEffect, useState } from 'react';
import type { ModelCatalogState } from '@virtuocity/ui';
import type { AppHost } from './types';

export type ModelCatalog = ModelCatalogState;

/** The provider's model catalog; providers cache it, so every picker can call this. */
export function useModels(host: AppHost, providerId = 'openrouter'): ModelCatalog {
  const [catalog, setCatalog] = useState<ModelCatalog>({ models: [], loading: true });
  useEffect(() => {
    const provider = host.providers.find(providerId);
    if (!provider?.listModels) {
      setCatalog({ models: [], loading: false });
      return;
    }
    let live = true;
    provider.listModels().then(
      (models) => live && setCatalog({ models, loading: false }),
      (error: unknown) =>
        live &&
        setCatalog({
          models: [],
          loading: false,
          error: error instanceof Error ? error.message : String(error),
        }),
    );
    return () => {
      live = false;
    };
  }, [host, providerId]);
  return catalog;
}
