const { Router } = require('express');
const { connectToDatabase, getCollection } = require('../mongodb');

const router = Router();

router.get('/get-conversations', async (req, res) => {
  try {
    await connectToDatabase();
    const userId = req.auth.sub;
    console.log(userId);
    const usersCollection = getCollection('users');
    const user = await usersCollection.findOne({ user_id: userId });

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

module.exports = router;