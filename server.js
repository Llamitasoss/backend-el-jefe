// Importar librerías necesarias
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Configuración de seguridad y formato
app.use(cors()); 
app.use(express.json()); 

// Función mágica para "pausar" el servidor si Google nos bloquea temporalmente
const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Ruta principal de la IA
app.post('/api/chat', async (req, res) => {
    try {
        const API_KEY = process.env.GEMINI_API_KEY; 
        
        if (!API_KEY) {
            return res.status(500).json({ error: "Falta la configuración de Google." });
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

        // Armar el paquete
        const payload = { contents: req.body.contents };
        if (req.body.systemInstruction) payload.systemInstruction = req.body.systemInstruction;
        if (req.body.generationConfig) payload.generationConfig = req.body.generationConfig;

        // ==========================================
        // SISTEMA ANTI-COLAPSO (MANEJO DE CUOTA)
        // ==========================================
        let intentosMaximos = 3;
        let respuestaExitosa = null;

        while (intentosMaximos > 0 && !respuestaExitosa) {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.status === 429) {
                // Error 429: Límite de 20 consultas por minuto de Google
                console.log(`⚠️ Límite de cuota detectado. Pausando el servidor 15 segundos... (Quedan ${intentosMaximos - 1} intentos)`);
                await esperar(15000); // Se queda calladito 15 segundos y vuelve a intentar
                intentosMaximos--;
            } else if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Error de Google ${response.status}: ${errorData}`);
            } else {
                respuestaExitosa = await response.json();
            }
        }

        // Si después de esperar 3 veces sigue bloqueado, le avisamos a tu Panel amablemente
        if (!respuestaExitosa) {
            return res.status(429).json({ error: "QUOTA_EXCEEDED" });
        }

        res.json(respuestaExitosa); 
        
    } catch (error) {
        console.error("Error procesando solicitud:", error.message);
        res.status(500).json({ error: "Error en el servidor." });
    }
});

// Ruta para el PIN secreto
app.post('/api/login', (req, res) => {
    const { pin } = req.body;
    const PIN_SECRETO = process.env.ADMIN_PIN || "0000"; 

    if (pin === PIN_SECRETO) res.json({ success: true });
    else res.status(401).json({ success: false, error: "PIN incorrecto" });
});

app.get('/', (req, res) => {
    res.send("¡Servidor de El Jefe activo, protegido y con plan Starter!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor activo y escuchando en el puerto ${PORT}`);
});