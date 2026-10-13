import type { AssetStore } from './assets';
import { encodeBase64 } from './media';
import type { ChatMessage, ChatPart } from './provider';

/** Gives every picture in a call its data URL from the asset store; missing ones become their `alt`. */
export async function withPictureUrls(
  messages: readonly ChatMessage[],
  assets: AssetStore,
): Promise<ChatMessage[]> {
  const resolve = async (part: ChatPart): Promise<ChatPart> => {
    if (part.type !== 'image' || part.url) return part;
    const asset = await assets.get(part.assetId);
    if (!asset) return { type: 'text', text: part.alt };
    return { ...part, url: `data:${asset.mime};base64,${encodeBase64(asset.bytes)}` };
  };
  return Promise.all(
    messages.map(async (m) =>
      m.role === 'user' && typeof m.content !== 'string'
        ? { ...m, content: await Promise.all(m.content.map(resolve)) }
        : m,
    ),
  );
}
