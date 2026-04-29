require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai'); 

const app = express();
app.use(cors());
app.use(express.json());

// Inicializa Gemini con la llave de tu archivo .env
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ============================================================================
// 1. ENDPOINT: PRUEBA BÁSICA
// ============================================================================
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

// ============================================================================
// 2. ENDPOINT: GENERADOR DE CARACTERÍSTICAS
// ============================================================================
app.post('/api/generar-caracteristicas', async (req, res) => {
  try {
    const { nombre, categoria, sistema } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: "Falta el nombre del producto" });
    }

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

    let textoLimpio = response.text.replace(/^[-*•]\s*/gm, '').trim();
    res.json({ caracteristicas: textoLimpio });

  } catch (error) {
    console.error("Error al generar características:", error);
    res.status(500).json({ error: "Error interno al generar características" });
  }
});

// ============================================================================
// 3. ENDPOINT: ORQUESTADOR DE EXTRACCIÓN (MATRIZ DE COMPATIBILIDAD)
// ============================================================================
app.post('/api/procesar-matriz', async (req, res) => {
  try {
    const { textoProveedor, marcaSeleccionada } = req.body;

    if (!textoProveedor) {
      return res.status(400).json({ error: "No se proporcionó texto para analizar" });
    }

    const promptMatriz = `
      Actúa como un analista experto en datos de motocicletas. 
      Analiza el siguiente texto y extrae TODAS las motocicletas y sus años compatibles.
      ATENCIÓN: El texto puede tener errores de formato, faltas de ortografía o números pegados (ejemplo: "20152TRN150" significa que un modelo termina en el año 2015, y el siguiente modelo es TRN150). Usa tu lógica para separar las palabras y los años.
      
      REGLAS ESTRICTAS:
      1. Devuelve ÚNICAMENTE un arreglo JSON puro. NADA de texto adicional, NADA de explicaciones, NADA de formato markdown (\`\`\`json).
      2. Si el texto indica que es una pieza "universal" o "para cualquier moto", devuelve: [{"universal": true}]
      3. Formato exacto de cada objeto en el JSON:
      [
        {
          "marca": "${marcaSeleccionada || 'ITALIKA'}",
          "modelo": "string en mayúsculas (ej. FT150, CARGO 150)",
          "cilindraje": "string en mayúsculas (ej. 150CC) o dejar como 'N/A' si no se menciona",
          "años": ["string"] (ej. ["2020", "2021", "2022"]. Si el texto dice "2020-2022", debes incluir todos los años intermedios en el array)
        }
      ]
      
      TEXTO A ANALIZAR: 
      "${textoProveedor}"
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptMatriz,
    });

    let jsonText = response.text;
    
    // Limpieza de seguridad: Quitamos markdown residual si Gemini decide ponerlo
    jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();

    // Intentamos convertir el texto a un objeto JSON real
    const data = JSON.parse(jsonText);
    
    // Enviamos el resultado al panel web
    res.status(200).json(data);

  } catch (error) {
    console.error("Error en el Extractor de Matriz:", error);
    res.status(500).json({ error: "Fallo al estructurar los datos con IA" });
  }
});

// ============================================================================
// INICIO DEL SERVIDOR
// ============================================================================
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => console.log(`Servidor Omnicanal corriendo en puerto ${port}`));