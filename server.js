// server.js — Proxy endurecido con Groq (free) compatible con tu front
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
// Compatibilidad: Node < 18 no trae fetch; usa node-fetch v2
const fetch = global.fetch || require('node-fetch');

const app = express();

// 🔒 HELMET: Headers de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// 📊 MORGAN: Logging de requests
app.use(morgan('combined'));

// 🚦 RATE LIMITING: 60 requests por minuto
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 60, // máximo 60 requests por ventana
  message: {
    error: true,
    message: 'Demasiadas solicitudes, intenta de nuevo en un minuto'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// 🌐 CORS: Configuración segura con allowlist
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:8080', 'http://127.0.0.1:5500', 'file://'];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (mobile apps, Postman, file://, etc.)
    if (!origin || origin === 'null') return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 📦 BODY PARSER: Límite de 1MB
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const PROVIDER = process.env.PROVIDER || 'groq';

// 🎯 ENDPOINT PRINCIPAL: Chat con Groq
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model, max_tokens = 1000, temperature = 0.7 } = req.body || {};

    // Validación básica
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ 
        error: true, 
        message: 'Se requieren mensajes válidos' 
      });
    }

    if (PROVIDER === 'groq') {
      const key = process.env.GROQ_API_KEY;
      if (!key) {
        return res.status(500).json({ 
          error: true, 
          message: 'Falta GROQ_API_KEY en .env' 
        });
      }

      // 🕐 TIMEOUT: 30 segundos con AbortSignal
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'User-Agent': 'MetricasSocial/1.0'
          },
          body: JSON.stringify({
            model: model || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
            messages: messages,
            max_tokens: Math.min(max_tokens, 4000), // Límite de seguridad
            temperature: Math.max(0, Math.min(temperature, 2)), // Rango válido
            stream: false
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const text = await r.text();
        
        if (!r.ok) {
          console.error(`Groq API Error: ${r.status} - ${text}`);
          return res.status(r.status).json({
            error: true,
            message: 'Error en el servicio de IA',
            details: r.status === 401 ? 'Clave API inválida' : 'Error del servidor'
          });
        }

        return res.status(200).send(text); // OpenAI-style: {choices:[{message:{content}}]}

      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          return res.status(408).json({
            error: true,
            message: 'Timeout: La solicitud tardó demasiado tiempo'
          });
        }
        
        throw fetchError;
      }
    }

    return res.status(400).json({ 
      error: true, 
      message: `Provider ${PROVIDER} no soportado` 
    });

  } catch (e) {
    console.error('Error en /api/chat:', e);
    return res.status(500).json({ 
      error: true, 
      message: 'Error interno del servidor' 
    });
  }
});

// 🏥 HEALTH CHECK
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    provider: PROVIDER,
    version: '1.0.0'
  });
});

// 📁 SERVIR ARCHIVOS ESTÁTICOS (después de las rutas de API)
app.use(express.static('.'));

// 🚫 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: true,
    message: 'Endpoint no encontrado'
  });
});

// 🛡️ Error Handler Global
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  
  if (err.message === 'No permitido por CORS') {
    return res.status(403).json({
      error: true,
      message: 'Origen no permitido'
    });
  }
  
  res.status(500).json({
    error: true,
    message: 'Error interno del servidor'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Proxy endurecido listo en http://localhost:${PORT}`);
  console.log(`🔒 Usando ${PROVIDER} con medidas de seguridad activas`);
  console.log(`🌐 CORS permitido para: ${allowedOrigins.join(', ')}`);
});