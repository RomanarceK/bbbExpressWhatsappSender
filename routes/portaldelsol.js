const { Router } = require('express');
const router = Router();
const { getConversationNewUI, saveConversationNewUI } = require('../hooks/useConversations');
const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const axios = require('axios');

router.post('/ask', async (req, res) => {
  try {
    const cloudRunUrl = 'https://portaldelsol-app-619713117025.us-central1.run.app/generate-response/';
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
    conversationHistory.push(`role: user, content: ${question}, timestamp: ${new Date().toISOString()}`);
    let cutConversationHistory = [];
    // Mantener solo las últimas 20 entradas
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
    console.log('PORTAL DEL SOL RESPONSE: ', response.data.response);

    // Agregar la respuesta del asistente al historial
    conversationHistory.push(`role: assistant, content: ${answer}, timestamp: ${new Date().toISOString()}`);

    // Guardar el historial de la conversación actualizado
    await saveConversationNewUI(userId, conversationHistory, username, phone, 'portaldelsol');

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

router.post('/terrenos-notify', async (req, res) => {
  const { zona, username, phone, payment } = req.body;

  try {
    const response = await client.messages.create({
      contentSid: 'HX3eef5d7b07de6de52f8cfbea7b4f317c',
      from: 'whatsapp:+17074021487',
      contentVariables: JSON.stringify({
        1: username,
        2: zona,
        3: payment,
        4: phone,
      }),
      messagingServiceSid: 'MG697fa907221a26b2da9cbc99068577b1',
      to: 'whatsapp:+5493564339696'
    });

    if (response.sid) {
      console.log(`Mensaje enviado a WhatsApp: ${phone}`);
      res.status(200).json({success: true, message: 'Mensaje enviado a WhatsApp'});
    } else {
      console.error('Error al enviar mensaje, respuesta sin SID.');
      res.status(500).send('Error al enviar mensaje');
    }
  } catch (error) {
    console.error(`Error al enviar mensaje: ${error.message}`);
    res.status(500).send(`Error al enviar mensaje: ${error.message}`);
  }
});

router.post('/casas-notify', async (req, res) => {
  const { username, phone, payment } = req.body;

  try {
    const response = await client.messages.create({
      contentSid: 'HX75e67318b0ccf7f79a5151cb359c9fa5',
      from: 'whatsapp:+17074021487',
      contentVariables: JSON.stringify({
        1: username,
        2: payment,
        3: phone,
      }),
      messagingServiceSid: 'MG697fa907221a26b2da9cbc99068577b1',
      to: 'whatsapp:+5493564339696'
    });

    if (response.sid) {
      console.log(`Mensaje enviado a WhatsApp: ${phone}`);
      res.status(200).json({success: true, message: 'Mensaje enviado a WhatsApp'});
    } else {
      console.error('Error al enviar mensaje, respuesta sin SID.');
      res.status(500).send('Error al enviar mensaje');
    }
  } catch (error) {
    console.error(`Error al enviar mensaje: ${error.message}`);
    res.status(500).send(`Error al enviar mensaje: ${error.message}`);
  }
});

router.post('/casas-notify', async (req, res) => {
  const { username, phone, payment } = req.body;

  try {
    const response = await client.messages.create({
      contentSid: 'HX75e67318b0ccf7f79a5151cb359c9fa5',
      from: 'whatsapp:+17074021487',
      contentVariables: JSON.stringify({
        1: username,
        2: payment,
        3: phone,
      }),
      messagingServiceSid: 'MG697fa907221a26b2da9cbc99068577b1',
      to: 'whatsapp:+5493564339696'
    });

    if (response.sid) {
      console.log(`Mensaje enviado a WhatsApp: ${phone}`);
      res.status(200).json({success: true, message: 'Mensaje enviado a WhatsApp'});
    } else {
      console.error('Error al enviar mensaje, respuesta sin SID.');
      res.status(500).send('Error al enviar mensaje');
    }
  } catch (error) {
    console.error(`Error al enviar mensaje: ${error.message}`);
    res.status(500).send(`Error al enviar mensaje: ${error.message}`);
  }
});

module.exports = router;