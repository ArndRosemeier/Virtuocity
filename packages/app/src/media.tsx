import { createContext, useContext, useEffect, useState } from 'react';
import type { AssetStore, MediaPartData } from '@virtuocity/core';

/** The asset store media parts point into; provided once by the app. */
export const AssetsContext = createContext<AssetStore | null>(null);

/** An object URL for a stored asset, revoked when no longer shown. */
function useAssetUrl(assetId: string): string | undefined | null {
  const assets = useContext(AssetsContext);
  const [url, setUrl] = useState<string | null>();
  useEffect(() => {
    let current: string | undefined;
    let live = true;
    void assets?.get(assetId).then((asset) => {
      if (!live) return;
      if (!asset) return setUrl(null);
      current = URL.createObjectURL(
        new Blob([asset.bytes as Uint8Array<ArrayBuffer>], { type: asset.mime }),
      );
      setUrl(current);
    });
    return () => {
      live = false;
      if (current) URL.revokeObjectURL(current);
    };
  }, [assets, assetId]);
  return url;
}

export function ImagePart({ data }: { data: MediaPartData }) {
  const url = useAssetUrl(data.assetId);
  if (url === null) return <p className="muted">This picture is missing from this browser.</p>;
  return (
    <figure className="media-image">
      {url ? <img src={url} alt={data.alt ?? ''} /> : <div className="media-image__loading" />}
    </figure>
  );
}

export function AudioPart({ data }: { data: MediaPartData }) {
  const url = useAssetUrl(data.assetId);
  if (url === null) return <p className="muted">This sound is missing from this browser.</p>;
  return url ? <audio className="media-audio" controls src={url} aria-label={data.alt} /> : null;
}
