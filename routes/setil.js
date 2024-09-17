const { Router } = require('express');
const router = Router();
const { getSheetData } = require('../googleApiAuth');
const { getConversationNewUI, saveConversationNewUI } = require('../hooks/useConversations');

router.post('/get-itinerary-url', async (req, res) => {
    try {
      const openaiApiKey = process.env.OPENAI_KEY;
      const userId = req.body.userid;
      const username = req.body.username;
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
      En base al último mensaje del historial de la conversación con el usuario y el listado de itinerarios disponibles en nuestra base de datos, 
      debes seleccionar y retornar el nombre del viaje, el transporte, el año y el mes adecuado, para utilizarlos como parámetros en la búsqueda del itinerario y que haya una coincidencia.
      Usa la lista de itinerarios disponibles para traducir o adaptar el nombre del viaje mencionado por el usuario. Es importante que el nombre, transporte, año o mes que retornes, coincidan exactamente con el nombre, transporte, año o mes que está almacenado en el listado.
      Ten en cuenta que el usuario en la conversación puede no haber específicado el tipo de transporte, año o mes de salida del viaje que le interesa. En ese caso, deja el/los datos vacíos y retorna el nombre del viaje que coincida con el itinerario más próximo a salir.
      También ten en cuenta que en el historial de la conversación, puede haber información sobre transporte, año o mes del itinerario que no esté almacenada o especificada en la lista de viajes disponibles. Si es el caso no la retornes, ya que eso evitará que haya coincidencias en la búsqueda del itinerario.
      La busqueda generará coincidencias y retornará el itinerario solo si se cumple al menos una condición. Es decir, si existe un itinerario bajo el nombre que enviamos por parámetro, retornará un resultado. Si se cumple lo anterior pero no coinciden alguno de los parámetros con los datos del itinerario almacenado, no retornará nada. Por esto, es importante retornar solo los parámetros que nos aseguren una coincidencia.
      Retorna siempre y únicamente la información relacionados al último viaje mencionado en el historial de la conversación. Pueden haberse mencionado más de un viaje en el historial, dale relevancia únicamente al mencionado en el útlimo mensaje. 
      Devuelve el resultado en el formato: "viaje: <nombre del viaje>, transporte: <transporte>, año: <año>, mes: <mes>".
  
      Historial de la conversación:
      ${cutConversationHistory.join('\n')}
      
      Listado de itinerarios:
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
      const viaje = params.match(/viaje: (.+?),/i)?.[1] || '';
      const transporte = params.match(/transporte: (.+?),/i)?.[1].trim() === '-' ? '' : params.match(/transporte: (.+?),/i)?.[1] || '';
      const anio = params.match(/año: (.+?),/i)?.[1].trim() === '-' ? '' : params.match(/año: (.+?),/i)?.[1] || '';
      const mes = params.match(/mes: (.+?)(?:,|$)/i)?.[1].trim() === '-' ? '' : params.match(/mes: (.+?)(?:,|$)/i)?.[1] || '';
      if (!viaje) {
        return res.status(400).json({ success: false, error: 'No se pudo identificar el nombre del viaje en la conversación' });
      }
  
      // Llamar al endpoint /get-url para obtener la URL del itinerario
      const itineraryResponse = await axios.get(getItineraryUrl, {
        params: {
          viaje,
          transporte,
          anio,
          mes
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
    if (conversationHistory.length > 8) {
      cutConversationHistory = conversationHistory.slice(-8);
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
    res.status(200).json(answer);
  } catch (error) {
    console.error('Error al procesar con ChatGPT:', error);
    res.status(500).json({ success: false, error: 'Error al procesar con ChatGPT' });
  }
});

module.exports = router;