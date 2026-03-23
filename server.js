require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai'); 

const app = express();
app.use(cors());
app.use(express.json());

// Inicializa Gemini con la llave de tu archivo .env
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Endpoint de prueba que ya tenías
app.post('/api/generar', async (req, res) => {
  try {
    const prompt = req.body.prompt || "Hola";
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({ result: response.text });

  } catch (error) {
    console.error("Error en Gemini:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// NUEVO ENDPOINT: Generador de Características de Productos
app.post('/api/generar-caracteristicas', async (req, res) => {
  try {
    const { nombre, categoria, sistema } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: "Falta el nombre del producto" });
    }

    // Prompt estricto para que el formato cuadre con tu Textarea
    const promptRefacciones = `Actúa como un vendedor experto en refacciones de motocicletas. 
    Genera exactamente 4 características técnicas y atractivas para el siguiente producto que se subirá a un catálogo web:
    - Producto: ${nombre}
    - Categoría: ${categoria || 'General'}
    - Sistema: ${sistema || 'General'}
    
    REGLAS ESTRICTAS:
    1. Devuelve SOLO las características, un punto por renglón.
    2. NO uses viñetas (*, -, •), ni números al principio de las oraciones.
    3. Sé conciso, profesional y directo.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptRefacciones,
    });

    // Limpiamos el texto por si la IA se salta las reglas e incluye viñetas
    let textoLimpio = response.text.replace(/^[-*•]\s*/gm, '').trim();

    res.json({ caracteristicas: textoLimpio });

  } catch (error) {
    console.error("Error al generar características:", error);
    res.status(500).json({ error: "Error interno al generar características" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Servidor corriendo en puerto ${port}`));