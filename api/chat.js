// api/chat.js - Función serverless para Vercel
const { Groq } = require('groq-sdk');

// Configurar Groq con la API key de las variables de entorno
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

module.exports = async (req, res) => {
    // Configurar CORS para Vercel
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Manejar preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Solo permitir POST
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: true, 
            message: 'Método no permitido. Solo POST.' 
        });
    }

    const { 
        message, 
        model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile', 
        provider = process.env.PROVIDER || 'groq' 
    } = req.body;

    // Validar que el mensaje existe
    if (!message) {
        return res.status(400).json({ 
            error: true, 
            message: 'Mensaje es requerido.' 
        });
    }

    // Verificar que la API key esté configurada
    if (!process.env.GROQ_API_KEY) {
        console.error("GROQ_API_KEY no está configurada en Vercel.");
        return res.status(500).json({ 
            error: true, 
            message: 'API Key no configurada en el servidor.' 
        });
    }

    try {
        // Llamar a Groq API
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: message,
                },
            ],
            model: model,
            temperature: 0.7,
            max_tokens: 1024,
        });

        // Retornar respuesta exitosa
        res.status(200).json({ 
            reply: chatCompletion.choices[0]?.message?.content || "No se pudo generar una respuesta." 
        });

    } catch (error) {
        console.error('Error al llamar a Groq API:', error);
        res.status(500).json({ 
            error: true, 
            message: 'Error al procesar la solicitud de chat.', 
            details: error.message 
        });
    }
};