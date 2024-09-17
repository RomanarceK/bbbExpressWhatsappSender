const { Router } = require('express');
const router = Router();
const { sendWhatsAppTemplateMessage } = require('../hooks/useTwilio');
const { 
  getSlackChannelFromGoogleSheets, 
  sendToGoogleSheets, 
  getChatfuelUserIdFromGoogleSheets, 
  getSlackEvents,
  saveSlackEvent,
  getWhatsappNumberFromGoogleSheets,
  sendSignalToChatfuel
} = require('../hooks/useMake');
const { createSlackChannel, inviteUserToSlackChannel } = require('../hooks/useSlack');
const { sendMessageToSlack, sendMessageToWhatsApp } = require('../hooks/useTwilio');

// Nueva ruta para iniciar una conversación en Slack cuando se solicita un asesor
router.post('/live-asesor', async (req, res) => {
    console.log('Inicia sesión en vivo...');
    const { user_id, user_message, chatfuel_user_id } = req.body;
    const slackUserId = process.env.SLACK_ASESOR_ID;
  
    try {
      // Verificar si el canal ya existe, excluyendo los archivados
      let slackChannel = await getSlackChannelFromGoogleSheets(user_id);
  
      if (slackChannel === '' || slackChannel === undefined || slackChannel === 'Accepted') {
        console.log('Slack channel not found. Creating a new one...');
        // Crear un canal en Slack para el usuario
        slackChannel = await createSlackChannel(user_id);
        await inviteUserToSlackChannel(slackChannel, slackUserId);
        await sendToGoogleSheets(user_id, slackChannel, chatfuel_user_id);
      }
  
      await sendMessageToSlack(slackChannel, user_message);
  
      res.status(200).send({
        message: 'Conversación iniciada en Slack',
        data: {
          user_id: user_id,
          slack_channel: slackChannel,
          user_message: user_message
        }
      });
    } catch (error) {
      console.error(`Error al iniciar la conversación en Slack: ${error.message}`);
      res.status(500).send(`Error al iniciar la conversación en Slack: ${error.message}`);
    }
});
  
// Ruta para recibir mensajes de WhatsApp en Slack
router.post('/whatsapp-webhook', async (req, res) => {
    console.log('Nuevo mensaje de Whatsapp!');
    const userMessage = req.body.Body;
    const userId = req.body.From.replace('whatsapp:+', '').trim();
    console.log(userMessage);
    console.log(req.body);
    try {
      // Recuperar el canal de Slack correspondiente
      let slackChannel = await getSlackChannelFromGoogleSheets(userId);
  
      if (slackChannel === '' || slackChannel === undefined) {
        console.log('Slack channel not found. Creating a new one from wpp webhook...');
        const chatfuelUserId = await getChatfuelUserIdFromGoogleSheets(userId);
        const slackChannel = await createSlackChannel(userId);
        await sendToGoogleSheets(userId, slackChannel, chatfuelUserId);
  
        const slackUserId = process.env.SLACK_ASESOR_ID;
        await inviteUserToSlackChannel(slackChannel, slackUserId);
      }
  
      await sendMessageToSlack(slackChannel, userMessage);
  
      res.status(200).send({
        message: 'Mensaje recibido y enviado a Slack',
        data: {
          user_id: userId,
          slack_channel: slackChannel,
          user_message: userMessage
        }
      });
    } catch (error) {
      console.error(`Error al recibir el mensaje de WhatsApp: ${error.message}`);
      res.status(500).send(`Error al recibir el mensaje de WhatsApp: ${error.message}`);
    }
});
  
// Slack Webhook - Envia los mensajes hacia Whatsapp
router.post('/activate', async (req, res) => {
    console.log('Nuevo mensaje recibido desde Slack!');
    const { event, event_id } = req.body;
    console.log('Conenido del evento de Slack: ', event);
    console.log('Event id: ', event_id);
  
    const slackEvents = await getSlackEvents();
    console.log('SlackEvents: ', slackEvents);
    const processedEventIds = new Set(slackEvents.map(event => event["0"]));
    console.log('Processed SlackEvents: ', processedEventIds);
    console.log('Event condition response: ', processedEventIds.has(event_id));
  
    if (!event_id || processedEventIds.has(event_id)) {
      console.log('Evento duplicado o sin ID', event_id);
      return res.status(200).send('Evento duplicado o sin ID');
    }
  
    await saveSlackEvent(event_id);
  
    if (event && event.type === 'message' && !event.bot_id) {
      const slackChannel = event.channel;
      const userMessage = event.text;
  
      const whatsappNumber = await getWhatsappNumberFromGoogleSheets(slackChannel);
      await sendWhatsAppTemplateMessage(whatsappNumber);
  
      if (userMessage.trim() === 'consulta_finalizada') {
        console.log('Flujo de finalizar conversación: ', userMessage.trim());
        // Finalizar la conversación
        if (whatsappNumber) {
          await sendSignalToChatfuel(whatsappNumber);
          res.status(200).send('Conversación finalizada y flujo de Chatfuel reanudado');
        } else {
          res.status(404).send('Usuario no encontrado para el canal de Slack');
        }
      } else {
        // Continuar la conversación normal
        if (whatsappNumber) {
          try {
            await sendMessageToWhatsApp(whatsappNumber, userMessage);
            res.status(200).send('Mensaje enviado a WhatsApp');
          } catch (error) {
            console.error(`Error al enviar el mensaje a WhatsApp: ${error.message}`);
            res.status(500).send(`Error al enviar el mensaje a WhatsApp: ${error.message}`);
          }
        } else {
          res.status(404).send('Usuario no encontrado para el canal de Slack');
        }
      }
    } else {
      res.status(200).send('Evento no procesado');
    }
});

module.exports = router;