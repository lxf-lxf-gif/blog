export const config = {
    runtime: 'edge', // 使用 Edge Runtime 以支持流式传输
};

export default async function handler(req) {
    // CORS check
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { url, body, headers } = await req.json();

        if (!url) {
            return new Response(JSON.stringify({ error: 'Target URL is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 这一步非常重要：在 Edge Network 中发起请求
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            body: JSON.stringify(body),
        });

        // 创建一个新的 Response 对象用于返回，透传原始 Response 的 body
        // 这样可以保留流式 (Stream) 特性
        const newResponse = new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': response.headers.get('Content-Type') || 'application/json',
            },
        });

        return newResponse;

    } catch (error) {
        console.error('Proxy Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            },
        });
    }
}
