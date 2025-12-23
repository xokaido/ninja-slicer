// Cloudflare Worker entry script
// Serves static assets and prepared for future server-side functionality

import { getAssetFromKV } from '@cloudflare/kv-asset-handler';
// @ts-ignore
import manifestJSON from '__STATIC_CONTENT_MANIFEST';
const assetManifest = JSON.parse(manifestJSON);

export interface Env {
    __STATIC_CONTENT: KVNamespace;
}

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);

        // API Routes
        if (url.pathname.startsWith('/api/')) {
            if (url.pathname === '/api/health') {
                return new Response(JSON.stringify({ status: 'ok' }), {
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            return new Response(JSON.stringify({ error: 'Not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Static Assets
        try {
            return await getAssetFromKV(
                {
                    request,
                    waitUntil: ctx.waitUntil.bind(ctx),
                },
                {
                    ASSET_NAMESPACE: env.__STATIC_CONTENT,
                    ASSET_MANIFEST: assetManifest,
                }
            );
        } catch (e) {
            if (e instanceof Error) {
                // Fallback to index.html for SPA routing (if needed)
                // or return 404
            }
            return new Response('Not found', { status: 404 });
        }
    },
};

