// api/chat.js - Función serverless para Vercel (v2.0)
const { Groq } = require('groq-sdk');

module.exports = async (req, res) => {
    // Log para debugging
    console.log('=== API CHAT DEBUG ===');
    console.log('Method:', req.method);
    console.log('Headers:', req.headers);
    console.log('Body type:', typeof req.body);
    console.log('Body:', req.body);
    
    // Configurar CORS para Vercel
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Manejar preflight requests
    if (req.method === 'OPTIONS') {
        console.log('OPTIONS request handled');
        return res.status(200).end();
    }

    // Solo permitir POST
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: true, 
            message: 'Método no permitido. Solo POST.' 
        });
    }

    try {
        // Parsear el body de la petición
        let body;
        if (typeof req.body === 'string') {
            body = JSON.parse(req.body);
        } else {
            body = req.body;
        }

        const { 
            message, 
            messages,
            model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
        } = body;

        // Extraer el mensaje del usuario del array de messages si existe
        let userMessage = message;
        if (!userMessage && messages && Array.isArray(messages) && messages.length > 0) {
            // Buscar el último mensaje del usuario
            const lastUserMessage = messages.filter(msg => msg.role === 'user').pop();
            if (lastUserMessage) {
                userMessage = lastUserMessage.content;
            }
        }

        // Validar que el mensaje existe
        if (!userMessage) {
            console.log('ERROR: No message provided');
            console.log('Parsed body:', body);
            console.log('Extracted userMessage:', userMessage);
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

        // Configurar Groq con la API key
        const groq = new Groq({
            apiKey: process.env.GROQ_API_KEY,
        });

        // Llamar a Groq API
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: userMessage,
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
        console.error('Error en api/chat.js:', error);
        res.status(500).json({ 
            error: true, 
            message: 'Error al procesar la solicitud de chat.', 
            details: error.message 
        });
    }
};