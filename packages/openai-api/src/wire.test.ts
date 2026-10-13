import { describe, expect, it } from 'vitest';
import { requestBody } from './wire';

const fox = { type: 'image', assetId: 'a', mime: 'image/png', alt: 'A fox' } as const;

describe('chat requests on the wire', () => {
  it('sends pictures as image URLs, and pictures without bytes as their description', () => {
    const body = requestBody({
      modality: 'text',
      model: 'm',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Look:' },
            { ...fox, url: 'data:x' },
          ],
        },
        { role: 'user', content: [fox] },
      ],
    });
    expect(body.messages).toEqual([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Look:' },
          { type: 'image_url', image_url: { url: 'data:x' } },
        ],
      },
      { role: 'user', content: [{ type: 'text', text: 'A fox' }] },
    ]);
  });

  it('asks a talking model that can paint for pictures and text', () => {
    const request = { modality: 'text', model: 'm', messages: [] };
    expect(requestBody(request, ['image', 'text']).modalities).toEqual(['image', 'text']);
    expect(requestBody(request, ['text'])).not.toHaveProperty('modalities');
  });
});
