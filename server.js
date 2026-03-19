require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();

// Middlewares
app.use(cors()); 
app.use(express.json());

// Inicializa Gemini con tu clave segura
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/procesar-matriz', async (req, res) => {
  const { textoProveedor, marcaSeleccionada } = req.body;

  if (!textoProveedor) {
    return res.status(400).json({ error: 'Falta el texto a procesar' });
  }

  try {
    // AQUÍ ESTÁ LA MAGIA: Llamando al motor de razonamiento 2.5
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Eres un experto en refacciones de motocicletas. 
      Analiza el siguiente texto comprimido de un proveedor y extrae los modelos y años.
      
      Reglas estrictas:
      1. Devuelve ÚNICAMENTE un arreglo JSON válido. Nada de texto extra, ni saludos, ni formato markdown (\`\`\`json).
      2. Cada objeto debe tener exactamente estas propiedades: 
         - "marca": usa "${marcaSeleccionada || 'ITALIKA'}"
         - "modelo": solo letras y números limpios, en mayúsculas. Ignora números de lista pegados al inicio (ej. si dice "1RC200" debe ser "RC200").
         - "cilindraje": infiérelo del modelo si es evidente (ej. "RC200" -> "200CC", "DM250" -> "250CC", "FT125" -> "125CC"). Si no se puede deducir, pon "N/A".
         - "años": un arreglo de strings con los años ordenados de menor a mayor (ej. ["2020", "2021", "2022"]).
         - "tipo": pon "N/A".

      Texto a analizar:
      "${textoProveedor}"
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Limpiamos la respuesta de la IA
    const jsonLimpio = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const datosEstructurados = JSON.parse(jsonLimpio);

    res.json(datosEstructurados);

  } catch (error) {
    console.error("Error procesando con IA:", error);
    res.status(500).json({ error: 'Fallo al procesar el texto con Gemini 2.5' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor backend de IA corriendo en el puerto ${PORT}`);
});