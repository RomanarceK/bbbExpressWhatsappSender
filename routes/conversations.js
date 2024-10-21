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
    const unreadCounts = {};
    const readStatusCollection = getCollection('read-status');
    const conversationCollection = getCollection(`${client}-conversations`);

    for (const conversationId of conversationIds) {
      const readStatus = await readStatusCollection.findOne({ userId, conversationId });
      const lastReadTimestamp = readStatus ? new Date(readStatus.lastReadTimestamp) : new Date(0);
      const conversation = await conversationCollection.findOne({ _id: new ObjectId(conversationId) });

      if (!conversation || !Array.isArray(conversation.content)) {
        unreadCounts[conversationId] = 0;
        continue;
      }

      // Filtrar los mensajes no leídos por role: 'user' y timestamp mayor que lastReadTimestamp
      const unreadMessages = conversation.content.filter((message) => {
        // Verifica que el mensaje tenga el role 'user' y un timestamp válido
        const roleMatch = message.match(/role: user/);
        const timestampMatch = message.match(/timestamp: (.+)$/);

        if (!roleMatch || !timestampMatch || !timestampMatch[1]) {
          return false; // Ignora los mensajes que no tengan role 'user' o no tengan timestamp
        }

        const messageTimestamp = new Date(timestampMatch[1]).getTime();
        const lastRead = new Date(lastReadTimestamp).getTime();

        // Solo contar el mensaje si es posterior al último leído y tiene el role 'user'
        return messageTimestamp > lastRead;
      });

      unreadCounts[conversationId] = unreadMessages.length;
    }

    res.status(200).json({ unreadCounts });
  } catch (error) {
    console.error('Error al obtener mensajes no leídos:', error);
    res.status(500).json({ error: 'Error al obtener mensajes no leídos' });
  }
});

module.exports = router;