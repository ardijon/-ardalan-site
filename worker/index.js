export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      })
    }

    if (url.pathname === '/counter') {
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      }

      if (request.method === 'GET') {
        const total = parseInt(await env.VISITORS.get('total')) || 0
        return new Response(JSON.stringify({ total }), { headers: corsHeaders })
      }

      if (request.method === 'POST') {
        const total = await env.VISITORS.get('total')
        const newTotal = (parseInt(total) || 0) + 1
        await env.VISITORS.put('total', newTotal.toString())
        return new Response(JSON.stringify({ total: newTotal }), { headers: corsHeaders })
      }
    }

    return new Response('Not Found', { status: 404 })
  },
}
