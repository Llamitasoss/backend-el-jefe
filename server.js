// Importar librerías necesarias
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // Usando node-fetch@2

const app = express();

// Configuración de seguridad y formato
app.use(cors()); // Permite que tu frontend en GitHub se comunique con este servidor
app.use(express.json()); // Permite entender los datos en formato JSON

// Ruta principal de la IA
app.post('/api/chat', async (req, res) => {
    try {
        // 1. Leer la llave secreta desde el archivo .env (o variables de Render)
        const API_KEY = process.env.GEMINI_API_KEY; 
        
        if (!API_KEY) {
            console.error("Falta la API Key de Gemini en las variables de entorno.");
            return res.status(500).json({ error: "Configuración del servidor incompleta." });
        }

        // 2. Preparar la URL de Google Gemini
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

        // 3. Extraer lo que nos manda el panel web o el catálogo
        const { contents, systemInstruction, generationConfig } = req.body;

        // 4. Armar el paquete exacto para Google
        const payload = {
            contents: contents
        };
        
        // Si el frontend pide instrucciones especiales (prompt) o formato JSON, se lo agregamos
        if (systemInstruction) payload.systemInstruction = systemInstruction;
        if (generationConfig) payload.generationConfig = generationConfig;

        // 5. Enviar la petición a Google
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // Revisar si Google devolvió algún error
        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Google respondió con error ${response.status}: ${errorData}`);
        }

        // 6. Recibir la respuesta exitosa y mandarla de vuelta a tu página web
        const data = await response.json();
        res.json(data); 
        
    } catch (error) {
        console.error("Error procesando la solicitud:", error.message);
        res.status(500).json({ error: "Ocurrió un error en el servidor al contactar a la IA." });
    }
});

// Ruta de prueba para saber si el servidor está "despierto"
app.get('/', (req, res) => {
    res.send("¡El servidor de El Jefe está activo y listo!");
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor de El Jefe activo y escuchando en el puerto ${PORT}`);
});