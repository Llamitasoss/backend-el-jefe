// Dentro de tu server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // O la librería que uses

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/chat', async (req, res) => {
    try {
        // Lee la llave desde tu archivo .env
        const API_KEY = process.env.GEMINI_API_KEY; 
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

        // Extraemos lo que nos manda el panel web
        const { contents, systemInstruction, generationConfig } = req.body;

        // Armamos el paquete para Google
        const payload = {
            contents: contents
        };
        
        // Si el panel pide instrucciones especiales o formato JSON, se lo agregamos
        if (systemInstruction) payload.systemInstruction = systemInstruction;
        if (generationConfig) payload.generationConfig = generationConfig;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        res.json(data); // Devolvemos la respuesta al panel
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error en el servidor." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor de El Jefe activo en puerto ${PORT}`));