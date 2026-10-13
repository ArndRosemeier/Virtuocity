import { useContext, useState } from 'react';
import type { MediaPartData } from '@virtuocity/core';
import { IconButton } from '@virtuocity/ui';
import { saveFile } from './files';
import { runSafely } from './LibraryActors';
import { AssetsContext } from './media';
import { pictureFileName, pictureFileType } from './picture';

/** Browsers take pictures on the clipboard only as PNG; others are redrawn as one. */
async function asPng(blob: Blob): Promise<Blob> {
  if (blob.type === 'image/png') return blob;
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  [canvas.width, canvas.height] = [bitmap.width, bitmap.height];
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob((png) => (png ? resolve(png) : reject(new Error('No PNG'))), 'image/png'),
  );
}

const canCopy = () => typeof ClipboardItem !== 'undefined' && 'write' in navigator.clipboard;

/** Copy and Save for the picture a space shows; Save uses the file picker where there is one. */
export function PictureActions({ picture }: { picture: MediaPartData }) {
  const assets = useContext(AssetsContext);
  const [copied, setCopied] = useState(false);
  const blob = async () => {
    const asset = await assets?.get(picture.assetId);
    if (!asset) throw new Error('This picture is missing from this browser.');
    return new Blob([asset.bytes as Uint8Array<ArrayBuffer>], { type: asset.mime });
  };
  const copy = () =>
    runSafely(async () => {
      // The item is made right away with a promise, so Safari keeps the click's permission.
      const png = blob().then(asPng);
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  const save = () =>
    runSafely(async () =>
      saveFile(pictureFileName(picture), await blob(), pictureFileType(picture.mime)),
    );
  return (
    <>
      {canCopy() && (
        <IconButton
          size="sm"
          icon="copy"
          label={copied ? 'Copied' : 'Copy the picture'}
          onClick={copy}
        />
      )}
      <IconButton size="sm" icon="download" label="Save the picture…" onClick={save} />
    </>
  );
}
