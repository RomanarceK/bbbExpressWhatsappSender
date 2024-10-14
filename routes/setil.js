const { Router } = require('express');
const router = Router();
const { getSheetData } = require('../googleApiAuth');
const { getConversationNewUI, saveConversationNewUI } = require('../hooks/useConversations');
const axios = require('axios');

router.post('/get-itinerary-url', async (req, res) => {
    try {
      const openaiApiKey = process.env.OPENAI_KEY;
      const userId = req.body.userid;
      const username = req.body.username;
      const query = req.body.query;
      const phone = req.body.phone;
      const getItineraryUrl = 'https://itinerarios-urls-619713117025.us-central1.run.app/get-url';
  
      if (!userId) {
        return res.status(400).json({ success: false, error: 'El userId es requerido' });
      }
  
      // Obtener el historial de la conversación
      let conversationHistory = await getConversationNewUI(userId, 'setil');
  
      if (!conversationHistory || conversationHistory == "Accepted") {
        conversationHistory = [];
      }
      let cutConversationHistory = [];
      if (conversationHistory.length > 2) {
        cutConversationHistory = conversationHistory.slice(-2);
      }
      console.log('Conversation HISTORY: ', conversationHistory);
  
      // Recuperar los datos del Google Sheet
      const viajesData = await getSheetData('Hoja 1!A:E');
      // Construir la lista de viajes en el prompt
      let viajesList = "Lista de viajes disponibles:\n";
      viajesData.forEach(row => {
        const [viaje, transporte, anio, mes] = row;
        viajesList += `- Viaje: ${viaje}. Transporte: ${transporte}. Año: ${anio}. Mes: ${mes}.\n`;
      });
  
      // Crear el prompt para identificar los parámetros necesarios
      const prompt = `
      Basado en el último mensaje del historial de la conversación con el usuario y el listado de itinerarios disponibles en nuestra base de datos,
      selecciona y retorna únicamente el **nombre del viaje** que mejor coincida con lo mencionado por el usuario.
      
      Usa la lista de itinerarios disponibles para traducir o adaptar el nombre del viaje mencionado por el usuario. Es importante que el nombre
      que retornes coincida **exactamente** con uno de los nombres almacenados en el listado de itinerarios.

      Si el usuario menciona más de un viaje en el historial de la conversación, **ignora los anteriores** y dale relevancia únicamente al viaje
      mencionado en el último mensaje.

      Ten en cuenta que el usuario puede no haber especificado el nombre del viaje de forma exacta o completa, por lo que debes seleccionar el 
      nombre del viaje más cercano o relevante basado en el contexto. Si no hay coincidencias claras, retorna un mensaje vacío.

      No consideres ningún otro dato como el transporte, el año o el mes del viaje. Solo necesitamos el nombre exacto que coincida con los datos
      almacenados en nuestra lista de itinerarios.

      Devuelve solo el nombre del viaje en el formato: "viaje: <nombre del viaje>". No devuelvas ningún otro dato o texto adicional.

      Historial de la conversación:
      ${cutConversationHistory.join('\n')}

      Ultima pregunta: ${query}

      Listado de itinerarios disponibles:
      ${viajesList}
    `;
  
      // Llamar a la API de OpenAI para obtener los parámetros del itinerario
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Eres un asistente encargado de analizar el historial de una conversación y determinar el valor de 4 datos importantes para recuperar el itinerario de un viaje específico: nombre del viaje, transporte, año y mes." },
          { role: "user", content: prompt }
        ]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        }
      });
  
      const params = response.data.choices[0].message.content.trim();
      console.log('Parámetros identificados:', params);
  
      // Extraer los parámetros del LLM
      const viaje = params.match(/viaje: (.+?)(,|$)/i)?.[1] || '';
      if (!viaje) {
        return res.status(400).json({ success: false, error: 'No se pudo identificar el nombre del viaje en la conversación' });
      }
  
      // Llamar al endpoint /get-url para obtener la URL del itinerario
      const itineraryResponse = await axios.get(getItineraryUrl, {
        params: {
          viaje
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });
  
      const itineraryUrl = itineraryResponse.data.url;
  
      // Agregar la solicitud y la URL del itinerario al historial
      conversationHistory.push(`role: user, content: Solicitud de itinerario para ${viaje}`);
      conversationHistory.push(`role: assistant, content: Aquí tienes el itinerario: ${itineraryUrl}`);
  
      // Guardar el historial de la conversación actualizado
      await saveConversationNewUI(userId, conversationHistory, username, phone, 'setil');
      console.log('Itinerario enviado: ', itineraryUrl);
      // Retornar la URL del itinerario a Chatfuel
      res.status(200).json(itineraryUrl);
    } catch (error) {
      console.error('Error al procesar la solicitud de itinerario:', error);
      res.status(200).json('No se encontró itinerario disponible.');
    }
});

router.post('/ask', async (req, res) => {
  try {
    const cloudRunUrl = 'https://setil-free-app-619713117025.us-central1.run.app/generate-response/';
    const question = req.body.question;
    const userId = req.body.userid;
    const username = req.body.username;
    const phone = req.body.phone;

    if (!question || !userId) {
      return res.status(400).json({ success: false, error: 'La pregunta y el userId son requeridos' });
    }

    // Obtener el historial de la conversación
    let conversationHistory = await getConversationNewUI(userId, 'setil');

    if (!conversationHistory || conversationHistory == "Accepted") {
      conversationHistory = [];
    }

    // Agregar la nueva pregunta al historial
    conversationHistory.push(`role: user, content: ${question}`);
    let cutConversationHistory = [];
    // Mantener solo las últimas 20 entradas
    if (conversationHistory.length > 12) {
      cutConversationHistory = conversationHistory.slice(-12);
    }

    // Llamar al servicio en Cloud Run para obtener la respuesta generada
    const response = await axios.post(cloudRunUrl, {
      query: question,
      history: cutConversationHistory
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const answer = response.data.response;
    console.log('SETIL RESPONSE: ', response.data.response);

    // Agregar la respuesta del asistente al historial
    conversationHistory.push(`role: assistant, content: ${answer}`);

    // Guardar el historial de la conversación actualizado
    await saveConversationNewUI(userId, conversationHistory, username, phone, 'setil');

    // Retornar la respuesta generada a Chatfuel
    res.status(200).json({
      success: true,
      answer: answer
    });
  } catch (error) {
    console.error('Error al procesar con ChatGPT:', error);
    res.status(500).json({ success: false, error: 'Error al procesar con ChatGPT' });
  }
});

module.exports = router;