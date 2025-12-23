// Cloudflare Worker entry script
// Serves static assets and prepared for future server-side functionality

export interface Env {
    // Add your bindings here, e.g.:
    // MY_KV_NAMESPACE: KVNamespace;
    // MY_D1_DATABASE: D1Database;
}

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);

        // Future server-side routes can be added here
        // Example: Leaderboard API
        if (url.pathname.startsWith('/api/')) {
            // Placeholder for future API routes
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

        // Static assets are served automatically by Cloudflare Workers Sites
        // This is a fallback that shouldn't normally be reached
        return new Response('Not found', { status: 404 });
    },
};
