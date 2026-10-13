import type { MediaPartData, OutputPart } from '@virtuocity/core';
import { IMAGE_PART } from '@virtuocity/core';
import type { FileType } from './files';

/** The picture a space shows, if it shows one (its first image part). */
export function shownPicture(shown: unknown): MediaPartData | undefined {
  if (typeof shown !== 'object' || shown === null || !('parts' in shown)) return undefined;
  const { parts } = shown as { parts?: readonly OutputPart[] };
  const part = parts?.find((p) => p.kind === IMAGE_PART);
  const data = part?.data as Partial<MediaPartData> | undefined;
  return data && typeof data.assetId === 'string' && typeof data.mime === 'string'
    ? { assetId: data.assetId, mime: data.mime, ...(data.alt ? { alt: data.alt } : {}) }
    : undefined;
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/svg+xml': '.svg',
};

/** The file extension for a picture's type, e.g. `.png` for `image/png`. */
export function pictureExtension(mime: string): string {
  return EXTENSIONS[mime] ?? `.${mime.replace(/^image\//, '').replace(/[^a-z0-9]/g, '') || 'img'}`;
}

/** A file name for a picture: its description, shortened, or "picture". */
export function pictureFileName({ alt, mime }: MediaPartData): string {
  const words = (alt ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 8);
  const base = words.join('-').slice(0, 60).replace(/-+$/, '') || 'picture';
  return `${base}${pictureExtension(mime)}`;
}

/** The kind of file the save picker offers for a picture. */
export function pictureFileType(mime: string): FileType {
  return { description: 'Picture', accept: { [mime]: [pictureExtension(mime)] } };
}
