const { connectToDatabase, getCollection  } = require('../mongodb');

async function saveConversationNewUI(userId, conversationHistory, username, phone, client) {
    try {
        await connectToDatabase();
        const conversationsCollection = getCollection(`${client}-conversations`);
        const existingConversation = await conversationsCollection.findOne({ userId });
        
        if (existingConversation) {
            await conversationsCollection.updateOne(
                { userId },
                { $set: { content: conversationHistory, updated_at: new Date() } }
            );
        } else {
            const newConversation = {
                userId,
                username,
                phone,
                content: conversationHistory,
                created_at: new Date(),
                updated_at: new Date(),
            };
            await conversationsCollection.insertOne(newConversation);
        }
        console.log('Conversación guardada correctamente');
    } catch (error) {
        console.error('Error al guardar el historial:', error);
    }
}
  
async function getConversationNewUI(userId, client, idSearch=false) {
    try {
        await connectToDatabase();
        const conversationsCollection = getCollection(`${client}-conversations`);
        const conversation = await conversationsCollection.findOne({ userId });
        if (conversation && idSearch) {
            return conversation._id;
        }
        if (conversation && conversation.content) {
            return conversation.content;
        }
        return [];
    } catch (error) {
        console.error('Error al recuperar el historial:', error);
        return [];
    }
}

// Función para actualizar el estado de lectura de los mensajes
async function updateLastReadTimestamp(userId, conversationId, lastReadTimestamp) {
    try {
        await connectToDatabase();
        const readStatusCollection = getCollection('read-status');
        await readStatusCollection.updateOne(
            { userId: userId, conversationId: conversationId },
            { $set: { lastReadTimestamp: lastReadTimestamp } },
            { upsert: true }
        );
        console.log('Estado de lectura actualizado para el usuario:', userId);
    } catch (error) {
        console.error('Error al actualizar el estado de lectura:', error);
    }
}

module.exports = { 
    saveConversationNewUI, 
    getConversationNewUI, 
    updateLastReadTimestamp
};