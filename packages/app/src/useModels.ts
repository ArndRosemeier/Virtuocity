import { useEffect, useState, useSyncExternalStore } from 'react';
import type { ModelCatalogState, ProviderCatalog } from '@virtuocity/ui';
import { subscribeSettings } from './settings';
import type { AppHost } from './types';

const LOADING: ModelCatalogState = { models: [], loading: true };

/** The providers that are ready (their key is set); re-renders when a key changes. */
export function useReadyProviders(host: AppHost): readonly string[] {
  const ids = useSyncExternalStore(subscribeSettings, () =>
    host.providers
      .list()
      .filter((p) => p.ready())
      .map((p) => p.id)
      .join(','),
  );
  return ids ? ids.split(',') : [];
}

async function loadCatalog(host: AppHost, id: string): Promise<ModelCatalogState> {
  const provider = host.providers.find(id);
  if (!provider?.listModels) return { models: [], loading: false };
  try {
    return { models: await provider.listModels(), loading: false };
  } catch (error) {
    return {
      models: [],
      loading: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Every ready provider with its model catalog; providers cache catalogs, so every picker can call this. */
export function useProviderCatalogs(host: AppHost): ProviderCatalog[] {
  const ready = useReadyProviders(host);
  const key = ready.join(',');
  const [catalogs, setCatalogs] = useState<Readonly<Record<string, ModelCatalogState>>>({});
  useEffect(() => {
    let live = true;
    for (const id of key ? key.split(',') : []) {
      void loadCatalog(host, id).then(
        (catalog) => live && setCatalogs((all) => ({ ...all, [id]: catalog })),
      );
    }
    return () => {
      live = false;
    };
  }, [host, key]);
  return ready.map((id) => ({
    id,
    name: host.providers.find(id)?.name ?? id,
    catalog: catalogs[id] ?? LOADING,
  }));
}
