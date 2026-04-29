require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai'); 

const app = express();
app.use(cors());
app.use(express.json());

// Inicializa Gemini. Si no hay llave, tiramos un log claro.
if (!process.env.GEMINI_API_KEY) {
    console.error("⚠️ ALERTA CRÍTICA: No se encontró GEMINI_API_KEY en las variables de entorno.");
}
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Función utilitaria para extraer JSON seguro
const extractJSON = (text) => {
    try {
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
            return JSON.parse(match[0]);
        }
        return JSON.parse(text); 
    } catch (e) {
        throw new Error("El texto de la IA no contiene un JSON válido.");
    }
};

// ============================================================================
// ENDPOINT: GENERADOR DE CARACTERÍSTICAS
// ============================================================================
app.post('/api/generar-caracteristicas', async (req, res) => {
  try {
    const { nombre, categoria, sistema } = req.body;
    if (!nombre) return res.status(400).json({ error: "Falta el nombre del producto" });

    const promptRefacciones = `Actúa como un vendedor experto en refacciones de motocicletas. 
    Genera exactamente 4 características técnicas y atractivas para el siguiente producto:
    - Producto: ${nombre}
    - Categoría: ${categoria || 'General'}
    - Sistema: ${sistema || 'General'}
    
    Devuelve SOLO las características, un punto por renglón. NO uses viñetas (*, -, •).`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash', // <--- CAMBIO AQUÍ (1,500 peticiones diarias gratis)
      contents: promptRefacciones,
    });

    let textoLimpio = response.text.replace(/^[-*•]\s*/gm, '').trim();
    res.json({ caracteristicas: textoLimpio });

  } catch (error) {
    console.error("Error al generar características:", error);
    res.status(500).json({ error: error.message || "Error interno al generar características" });
  }
});

// ============================================================================
// ENDPOINT: ORQUESTADOR DE EXTRACCIÓN (MATRIZ DE COMPATIBILIDAD)
// ============================================================================
app.post('/api/procesar-matriz', async (req, res) => {
  try {
    const { textoProveedor, marcaSeleccionada } = req.body;
    if (!textoProveedor) return res.status(400).json({ error: "No se proporcionó texto" });

    const promptMatriz = `
      Analiza el siguiente texto y extrae TODAS las motocicletas y sus años compatibles.
      El texto tiene números pegados (ej: "20152TRN150" significa fin en 2015, sigue TRN150). Sepáralos.
      
      Devuelve ÚNICAMENTE un arreglo JSON. NADA MÁS.
      Formato exacto:
      [
        {
          "marca": "${marcaSeleccionada || 'ITALIKA'}",
          "modelo": "string en mayúsculas",
          "cilindraje": "string en mayúsculas o 'N/A'",
          "años": ["string"] (Si dice "2020-2022", incluye todos los años intermedios)
        }
      ]
      
      TEXTO: 
      "${textoProveedor}"
    `;

    const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash', // <--- EL NUEVO MODELO ESTABLE CON 1500 PETICIONES/DÍA
    contents: promptMatriz, // (o promptRefacciones)
});

    const data = extractJSON(response.text);
    res.status(200).json(data);

  } catch (error) {
    console.error("Error en el Extractor de Matriz:", error);
    res.status(500).json({ error: error.message || "Fallo al estructurar los datos con IA" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => console.log(`Servidor Omnicanal corriendo en puerto ${port}`));