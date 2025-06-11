const { Router } = require('express');
const router = Router();
const { getConversationNewUI, saveConversationNewUI } = require('../hooks/useConversations');
const { getConversation, saveConversation } = require('../hooks/useMake');
const axios = require('axios');
const { getIO } = require('../socket');

router.post('/ask', async (req, res) => {
  try {
    const cloudRunUrl = 'https://giletta-app-680874547105.us-east1.run.app/generate-response/';
    const question = req.body.question;
    const userId = req.body.userid;
    const username = req.body.username;
    const phone = req.body.phone;

    if (!question || !userId) {
      return res.status(400).json({ success: false, error: 'La pregunta y el userId son requeridos' });
    }

    // Obtener el historial de la conversación
    let conversationHistory = await getConversationNewUI(userId, 'giletta');

    if (!conversationHistory || conversationHistory == "Accepted") {
      conversationHistory = [];
    }

    conversationHistory.push(`role: user, content: ${question}, timestamp: ${new Date()}`);
    let cutConversationHistory = [];
    if (conversationHistory.length > 12) {
      cutConversationHistory = conversationHistory.slice(-12);
    } else {
      cutConversationHistory = conversationHistory;
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
    console.log('GILETTA RESPONSE: ', response.data.response);
    
    // Agregar la respuesta del asistente al historial
    conversationHistory.push(`role: assistant, content: ${answer}, timestamp: ${new Date()}`);

    // Guardar el historial de la conversación actualizado
    await saveConversationNewUI(userId, conversationHistory, username, phone, 'giletta');
    const conversationId = await getConversationNewUI(userId, 'giletta', true);

    const io = getIO();
    io.emit('newMessage', {
      conversationId: conversationId,
      messages: [
        {
          role: 'user',
          content: `role: user, content: ${question}, timestamp: ${new Date()}`
        },
        {
          role: 'assistant',
          content: `role: assistant, content: ${answer}, timestamp: ${new Date()}`
        }
      ]
    });

    res.status(200).json(answer);
  } catch (error) {
    console.error('Error al procesar con ChatGPT:', error);
    res.status(500).json({ success: false, error: 'Error al procesar con ChatGPT' });
  }
});

router.post('/ask-giletta-ig', async (req, res) => {
  try {
    const cloudRunUrl = 'https://giletta-app-680874547105.us-east1.run.app/generate-response/';
    const question = req.body.question;
    const userId = req.body.userid;
    const getUrl = "https://hook.eu2.make.com/bed73d1m8wx66k7w2gqeo5284wjjkwbr";
    const saveUrl = "https://hook.eu2.make.com/tcqe90ht2hgb522ezae6zd9oi74911ux";

    if (!question || !userId) {
      return res.status(400).json({ success: false, error: 'La pregunta y el userId son requeridos' });
    }

    // Obtener el historial de la conversación
    let conversationHistory = await getConversation(userId, getUrl);

    if (!conversationHistory || conversationHistory == "Accepted") {
      conversationHistory = [];
    }

    // Agregar la nueva pregunta al historial
    conversationHistory.push(`role: user, content: ${question}`);
    let cutConversationHistory = [];
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
    console.log('GILETTA IG RESPONSE: ', response.data.response);
    // Agregar la respuesta del asistente al historial
    conversationHistory.push(`role: assistant, content: ${answer}`);

    // Guardar el historial de la conversación actualizado
    await saveConversation(userId, conversationHistory, saveUrl);

    // Retornar la respuesta generada a Chatfuel
    res.status(200).json(answer);
  } catch (error) {
    console.error('Error al procesar con ChatGPT:', error);
    res.status(500).json({ success: false, error: 'Error al procesar con ChatGPT' });
  }
});

module.exports = router;