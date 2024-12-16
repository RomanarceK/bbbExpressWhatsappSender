const { Router } = require('express');
const router = Router();
const { getConversationNewUI, saveConversationNewUI } = require('../hooks/useConversations');
const axios = require('axios');
const { getIO } = require('../socket');


router.post('/ask', async (req, res) => {
    try {
      const cloudRunUrl = 'http://0.0.0.0:8080/generate-response/';
      const { question, userid, username, phone } = req.body;
  
      if (!userid || !question) {
        return res.status(400).json({ success: false, error: 'El userId y la pregunta son requeridos' });
      }
  
      let conversationHistory = await getConversationNewUI(userid, 'buenamesa');
  
      if (!conversationHistory || conversationHistory === "Accepted") {
        conversationHistory = [];
      }
  
      conversationHistory.push(`role: user, content: ${question}, timestamp: ${new Date()}`);
      let cutConversationHistory = [];
      if (conversationHistory.length > 6) {
        cutConversationHistory = conversationHistory.slice(-6);
      }
  
      const response = await axios.post(cloudRunUrl, {
        query: question,
        history: cutConversationHistory
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
  
      const answer = response.data.response;
      console.log('BUENA MESA RESPONSE: ', answer);
  
      conversationHistory.push(`role: assistant, content: ${answer}, timestamp: ${new Date()}`);
  
      await saveConversationNewUI(userid, conversationHistory, username, phone, 'buenamesa');
  
      const conversationId = await getConversationNewUI(userid, 'buenamesa', true);
  
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