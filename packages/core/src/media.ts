import type { AssetStore } from './assets';
import type { Content } from './output';

/** Pictures and sound a model produced, before they are stored. */
export interface GeneratedMedia {
  readonly mime: string;
  readonly bytes: Uint8Array;
}

/** Data of an `image` or `audio` message part: the stored asset and a description. */
export interface MediaPartData {
  readonly assetId: string;
  readonly mime: string;
  readonly alt?: string;
}

export const IMAGE_PART = 'image';
export const AUDIO_PART = 'audio';

/** Stores generated media and returns content that points at it, described by `alt`. */
export async function storeMedia(
  assets: AssetStore,
  media: readonly GeneratedMedia[],
  alt?: string,
): Promise<Content<MediaPartData>[]> {
  return Promise.all(
    media.map(async ({ mime, bytes }) => {
      const ref = await assets.put(bytes, mime);
      const kind = mime.startsWith('audio/') ? AUDIO_PART : IMAGE_PART;
      const text = alt ?? (kind === IMAGE_PART ? 'A picture' : 'A sound');
      return { kind, data: { assetId: ref.id, mime, ...(alt ? { alt } : {}) }, text };
    }),
  );
}

/** Decodes a `data:` URL (as models return generated media) into bytes. */
export function decodeDataUrl(url: string): GeneratedMedia {
  const match = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(url);
  if (!match) throw new Error('Not a data URL');
  const [, mime = 'application/octet-stream', base64, payload = ''] = match;
  if (!base64) return { mime, bytes: new TextEncoder().encode(decodeURIComponent(payload)) };
  return { mime, bytes: decodeBase64(payload) };
}

export function decodeBase64(text: string): Uint8Array {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function encodeBase64(bytes: Uint8Array): string {
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''));
}
