const { Router } = require('express');
const { connectToDatabase, getCollection } = require('../mongodb');
const { updateLastReadTimestamp } = require('../hooks/useConversations')
const { ObjectId } = require('mongodb');

const router = Router();

router.get('/get-conversations', async (req, res) => {
  try {
    await connectToDatabase();
    const userId = req.auth.sub;
    const usersCollection = getCollection('users');
    const user = await usersCollection.findOne({ sub: userId });

    if (!user) {
      return res.status(404).send('Usuario no encontrado');
    }

    // Usar el cliente del usuario para buscar las conversaciones
    const conversationsCollection = getCollection(`${user.client}-conversations`);
    
    if (!conversationsCollection) {
      return res.status(403).send('El usuario no tiene acceso a ninguna conversación. Contáctese con soporte para solucionarlo.');
    }

    // Recuperar las conversaciones
    const conversations = await conversationsCollection.find({}).toArray();
    res.status(200).json(conversations); 
  } catch (error) {
    res.status(500).send(`Error al recuperar las conversaciones: ${error.message}`);
  }
});

router.post('/update-read-status', async (req, res) => {
  const { userId, conversationId } = req.body;

  try {
      const lastReadTimestamp = new Date();
      await updateLastReadTimestamp(userId, conversationId, lastReadTimestamp);
      res.status(200).json({ success: true });
  } catch (error) {
      console.error('Error al actualizar el estado de lectura:', error);
      res.status(500).json({ success: false, error: 'Error al actualizar el estado de lectura.' });
  }
});

router.post('/unread-messages', async (req, res) => {
  const { userId, conversationIds, client } = req.body;

  if (!Array.isArray(conversationIds)) {
    return res.status(400).json({ error: 'conversationIds debe ser un array' });
  }

  try {
    const readStatusCollection = getCollection('read-status');
    const conversationCollection = getCollection(`${client}-conversations`);
    const objectIds = conversationIds.map(id => new ObjectId(id));

    const readStatusesArray = await readStatusCollection
      .find({ userId, conversationId: { $in: conversationIds } })
      .toArray();

    const readStatusMap = {};
    readStatusesArray.forEach(status => {
      readStatusMap[status.conversationId] = new Date(status.lastReadTimestamp);
    });

    const conversationsArray = await conversationCollection
      .find({ _id: { $in: objectIds } }, { projection: { content: 1 } })
      .toArray();

    const conversationMap = {};
    conversationsArray.forEach(conv => {
      conversationMap[conv._id.toString()] = conv;
    });

    const unreadCounts = {};
    conversationIds.forEach(conversationId => {
      const lastReadTimestamp = readStatusMap[conversationId] || new Date(0);
      const conversation = conversationMap[conversationId];

      if (!conversation || !Array.isArray(conversation.content)) {
        unreadCounts[conversationId] = 0;
        return;
      }

      const unreadMessages = conversation.content.filter(message => {
        const roleMatch = message.match(/role: user/);
        const timestampMatch = message.match(/timestamp: (.+)$/);
        if (!roleMatch || !timestampMatch || !timestampMatch[1]) {
          return false;
        }
        const messageTimestamp = new Date(timestampMatch[1]).getTime();
        const lastRead = lastReadTimestamp.getTime();
        return messageTimestamp > lastRead;
      });

      unreadCounts[conversationId] = unreadMessages.length;
    });

    res.status(200).json({ unreadCounts });
  } catch (error) {
    console.error('Error al obtener mensajes no leídos:', error);
    res.status(500).json({ error: 'Error al obtener mensajes no leídos' });
  }
});

module.exports = router;