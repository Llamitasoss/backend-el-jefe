require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

// Inicializamos la conexión con Google usando tu llave secreta
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/chat', async (req, res) => {
    try {
        // Obtenemos los datos que nos manda tu página web
        const { contents, systemInstruction } = req.body;

        // Extraemos las instrucciones de "El Jefe"
        let instrucciones = "";
        if (systemInstruction && systemInstruction.parts && systemInstruction.parts.length > 0) {
            instrucciones = systemInstruction.parts[0].text;
        }

        // Configuramos el modelo oficial
     const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    systemInstruction: instrucciones
});

        // Hacemos la petición a la IA con el historial del chat
        const result = await model.generateContent({ contents: contents });
        const response = await result.response;
        const textoRespuesta = response.text();

        // Le devolvemos a la página web la respuesta en el formato exacto que espera
        res.json({
            candidates: [
                { content: { parts: [{ text: textoRespuesta }] } }
            ]
        });

    } catch (error) {
        console.error("Error procesando el chat:", error);
        res.status(500).json({ error: "Hubo un problema de conexión con el asistente." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🏍️ Servidor de El Jefe encendido y usando la librería oficial en http://localhost:${PORT}`);
});