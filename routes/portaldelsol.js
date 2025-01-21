const { Router } = require('express');
const router = Router();
const { getConversationNewUI, saveConversationNewUI } = require('../hooks/useConversations');
const axios = require('axios');

router.post('/ask', async (req, res) => {
  try {
    const cloudRunUrl = 'http://0.0.0.0:8080/generate-response/';
    const question = req.body.question;
    const userId = req.body.userid;
    const username = req.body.username;
    const phone = req.body.phone;

    if (!question || !userId) {
      return res.status(400).json({ success: false, error: 'La pregunta y el userId son requeridos' });
    }

    // Obtener el historial de la conversación
    let conversationHistory = await getConversationNewUI(userId, 'portaldelsol');

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
    console.log('PORTAL DEL SOL RESPONSE: ', response.data.response);

    // Agregar la respuesta del asistente al historial
    conversationHistory.push(`role: assistant, content: ${answer}`);

    // Guardar el historial de la conversación actualizado
    await saveConversationNewUI(userId, conversationHistory, username, phone, 'portaldelsol');

    // Retornar la respuesta generada a Chatfuel
    res.status(200).json(answer);
  } catch (error) {
    console.error('Error al procesar con ChatGPT:', error);
    res.status(500).json({ success: false, error: 'Error al procesar con ChatGPT' });
  }
});

module.exports = router;