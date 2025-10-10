// api/chat.js — Vercel serverless, proxy OpenAI-compatible para Groq
export default async function handler(req, res) {
    // CORS básico (por si abres desde otro origen)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
  
    try {
      const GROQ_API_KEY = process.env.GROQ_API_KEY;
      const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
      if (!GROQ_API_KEY) {
        res.status(500).json({ error: true, message: 'Falta GROQ_API_KEY' });
        return;
      }
  
      // Vercel te entrega body ya parseado; si no, parseamos
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { messages, model = GROQ_MODEL, max_tokens = 1000, temperature = 0.7 } = body;
  
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: (messages && messages.length) ? messages : [{ role: 'user', content: 'Hola 👋' }],
          max_tokens,
          temperature,
          stream: false
        })
      });
  
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type','application/json').send(text);
    } catch (e) {
      res.status(500).json({ error: true, message: e.message });
    }
  }
  