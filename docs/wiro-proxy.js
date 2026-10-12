/* global fetch, Headers, Response, URL */
/**
 * A CORS proxy for WIRO, to deploy as a Cloudflare Worker (free plan is enough).
 * WIRO's API answers no browser preflight, so Virtuocity calls
 * `<worker url>?url=<WIRO url>` instead; the worker forwards the call to
 * wiro.ai only and adds the CORS headers browsers need.
 *
 * Setup: dash.cloudflare.com > Workers & Pages > Create > Worker, paste this
 * file, Deploy, then copy the worker URL into Settings > Connection > WIRO.
 */
/** Only these pages may use the proxy; add your own if you host Virtuocity elsewhere. */
const ALLOWED_ORIGINS = ['https://arndrosemeier.github.io', 'http://localhost:5173'];

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-api-key, x-nonce, x-signature',
    Vary: 'Origin',
  };
}

const FORWARDED = ['content-type', 'x-api-key', 'x-nonce', 'x-signature'];

function allowed(target) {
  return target.protocol === 'https:' && /(^|\.)wiro\.ai$/.test(target.hostname);
}

export default {
  async fetch(request) {
    const origin = request.headers.get('origin') ?? '';
    if (!ALLOWED_ORIGINS.includes(origin))
      return new Response('Origin not allowed', { status: 403 });
    const CORS = cors(origin);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const raw = new URL(request.url).searchParams.get('url') ?? '';
    const target = URL.canParse(raw) ? new URL(raw) : undefined;
    if (!target || !allowed(target))
      return new Response('Only https://*.wiro.ai can be reached', { status: 403, headers: CORS });
    const headers = new Headers();
    for (const name of FORWARDED) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' ? undefined : await request.arrayBuffer(),
    });
    const response = new Response(upstream.body, upstream);
    for (const [name, value] of Object.entries(CORS)) response.headers.set(name, value);
    return response;
  },
};
