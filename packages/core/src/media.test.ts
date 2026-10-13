import { describe, expect, it } from 'vitest';
import type { StoredAsset } from './assets';
import { createAssetStore } from './assets';
import { AUDIO_PART, IMAGE_PART, decodeDataUrl, storeMedia } from './media';
import { withPictureUrls } from './pictures';
import { memoryStore } from './storage';

describe('media', () => {
  it('decodes base64 and plain data URLs', () => {
    expect(decodeDataUrl('data:image/png;base64,AAEC')).toEqual({
      mime: 'image/png',
      bytes: new Uint8Array([0, 1, 2]),
    });
    expect(new TextDecoder().decode(decodeDataUrl('data:text/plain,hi%21').bytes)).toBe('hi!');
    expect(() => decodeDataUrl('https://example.com/a.png')).toThrow(/data URL/);
  });

  it('stores media and returns parts that point at it', async () => {
    const assets = createAssetStore(memoryStore<StoredAsset>());
    const parts = await storeMedia(
      assets,
      [
        { mime: 'image/png', bytes: new Uint8Array([1]) },
        { mime: 'audio/wav', bytes: new Uint8Array([2]) },
      ],
      'A lantern',
    );
    expect(parts.map((p) => p.kind)).toEqual([IMAGE_PART, AUDIO_PART]);
    expect(parts[0]?.data).toMatchObject({ mime: 'image/png', alt: 'A lantern' });
    const stored = await assets.get(parts[0]?.data.assetId ?? '');
    expect(stored?.bytes).toEqual(new Uint8Array([1]));
  });

  it('gives pictures in a prompt their bytes as data URLs, and lost ones their description', async () => {
    const assets = createAssetStore(memoryStore<StoredAsset>());
    const ref = await assets.put(new Uint8Array([0, 1, 2]), 'image/png');
    const picture = (assetId: string) =>
      ({ type: 'image', assetId, mime: 'image/png', alt: 'A fox' }) as const;
    const [message] = await withPictureUrls(
      [{ role: 'user', content: [picture(ref.id), picture('gone')] }],
      assets,
    );
    expect(message?.content).toEqual([
      { ...picture(ref.id), url: 'data:image/png;base64,AAEC' },
      { type: 'text', text: 'A fox' },
    ]);
  });
});
