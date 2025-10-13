// netlify/functions/chat.js - Función para Netlify
const { Groq } = require('groq-sdk');

exports.handler = async (event, context) => {
    // Log para debugging
    console.log('=== NETLIFY FUNCTION DEBUG ===');
    console.log('GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY);
    console.log('GROQ_MODEL:', process.env.GROQ_MODEL);
    console.log('Event method:', event.httpMethod);
    console.log('Event body:', event.body);
    
    // Configurar CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    // Manejar preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: '',
        };
    }

    try {
        // Verificar que sea POST
        if (event.httpMethod !== 'POST') {
            return {
                statusCode: 405,
                headers,
                body: JSON.stringify({ error: 'Method not allowed' }),
            };
        }

        // Parsear el body
        const body = JSON.parse(event.body || '{}');
        const { message, messages, model = 'llama-3.3-70b-versatile' } = body;

        // Usar messages si está disponible, sino usar message
        const messageToUse = messages || message;

        if (!messageToUse) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Message is required' }),
            };
        }

        // Inicializar Groq
        const groq = new Groq({
            apiKey: process.env.GROQ_API_KEY,
        });

        // Generar respuesta
        const completion = await groq.chat.completions.create({
            messages: messageToUse,
            model: model,
            temperature: 0.7,
            max_tokens: 1000,
        });

        const response = completion.choices[0]?.message?.content || 'No response generated';

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ response }),
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
