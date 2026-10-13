import { describe, expect, it } from 'vitest';
import { pictureExtension, pictureFileName, pictureFileType, shownPicture } from './picture';

const picture = { assetId: 'sha256-1', mime: 'image/png', alt: 'A fox, in the snow!' };

describe('pictures a space shows', () => {
  it('finds the first image of what a space shows', () => {
    const shown = {
      parts: [
        { kind: 'text', data: 'hi' },
        { kind: 'image', data: picture },
      ],
    };
    expect(shownPicture(shown)).toEqual(picture);
    expect(shownPicture({ parts: [{ kind: 'text', data: 'hi' }] })).toBeUndefined();
    expect(shownPicture(undefined)).toBeUndefined();
  });

  it('names the file after the description and the type', () => {
    expect(pictureFileName(picture)).toBe('a-fox-in-the-snow.png');
    expect(pictureFileName({ assetId: 'x', mime: 'image/jpeg' })).toBe('picture.jpg');
    expect(pictureExtension('image/webp')).toBe('.webp');
    expect(pictureFileType('image/png').accept).toEqual({ 'image/png': ['.png'] });
  });
});
