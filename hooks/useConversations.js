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
  
async function getConversationNewUI(userId, client) {
    try {
        await connectToDatabase();
        const conversationsCollection = getCollection(`${client}-conversations`);
        const conversation = await conversationsCollection.findOne({ userId });
        if (conversation && conversation.content) {
            return conversation.content;
        }
        return [];
    } catch (error) {
        console.error('Error al recuperar el historial:', error);
        return [];
    }
}

module.exports = { saveConversationNewUI, getConversationNewUI }