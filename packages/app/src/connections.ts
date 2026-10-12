/** What the Connection tab says about each provider's key. */
export interface Connection {
  readonly providerId: string;
  readonly label: string;
  readonly offers: string;
  readonly placeholder: string;
  readonly keysUrl: string;
  readonly keysSite: string;
  /** Set when the provider can only be reached through a proxy the user deploys. */
  readonly proxy?: { readonly setupUrl: string };
}

/** Every installed provider that needs the user's key, in the order Settings lists them. */
export const CONNECTIONS: readonly Connection[] = [
  {
    providerId: 'openrouter',
    label: 'OpenRouter',
    offers: 'Hundreds of text and image models from many makers behind one key.',
    placeholder: 'sk-or-…',
    keysUrl: 'https://openrouter.ai/settings/keys',
    keysSite: 'openrouter.ai',
  },
  {
    providerId: 'openai',
    label: 'OpenAI',
    offers: 'GPT text models and GPT Image pictures, straight from OpenAI.',
    placeholder: 'sk-…',
    keysUrl: 'https://platform.openai.com/api-keys',
    keysSite: 'platform.openai.com',
  },
  {
    providerId: 'anthropic',
    label: 'Anthropic',
    offers: 'Claude text models, straight from Anthropic.',
    placeholder: 'sk-ant-…',
    keysUrl: 'https://console.anthropic.com/settings/keys',
    keysSite: 'console.anthropic.com',
  },
  {
    providerId: 'wiro',
    label: 'WIRO',
    offers: 'Image models. Use a project with API key authentication (no signature).',
    placeholder: 'API key',
    keysUrl: 'https://wiro.ai/panel/project',
    keysSite: 'wiro.ai',
    proxy: {
      setupUrl: 'https://github.com/ArndRosemeier/Virtuocity/blob/main/docs/wiro-proxy.js',
    },
  },
];
