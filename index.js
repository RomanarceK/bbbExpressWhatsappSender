const express = require('express');
const xml2js = require('xml2js');
const bodyParser = require('body-parser');
const moment = require('moment');
require("dotenv").config();
const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const axios = require('axios');

const app = express();
const port = 3001;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(bodyParser.raw({ type: '*/*' }));

app.post('/send-message', async (req, res) => {
  const userData = req.body;
  const username = userData.username;
  const phone = userData.phone;
  const query = userData.query;

  try {
    const response = await client.messages.create({
      contentSid: 'HX9b638f2528bb6a26939ccbe2d6ccf6ca',
      from: 'whatsapp:+17074021487',
      contentVariables: JSON.stringify({
        1: username,
        2: query,
        3: phone
      }),
      messagingServiceSid: 'MG697fa907221a26b2da9cbc99068577b1',
      to: 'whatsapp:+5493564522800'
    });

    if (response.sid) {
      console.log(`Mensaje enviado a WhatsApp: ${phone}`);
      res.status(200).send(`Mensaje enviado exitosamente a: ${phone}`);
    } else {
      console.error('Error al enviar mensaje, respuesta sin SID.');
      res.status(500).send('Error al enviar mensaje');
    }
  } catch (error) {
    console.error(`Error al enviar mensaje: ${error.message}`);
    res.status(500).send(`Error al enviar mensaje: ${error.message}`);
  }
});

app.post('/consultar-envio', async (req, res) => {
  try {
    const rawBody = req.query.xml;
    const xmlString = rawBody.toString('utf8');

    xml2js.parseString(xmlString, (err, result) => {
      if (err) {
        console.error('Error al parsear la respuesta XML:', err);
        res.status(500).send('Error al parsear la respuesta XML');
        return;
      }

      const comentario = result['soap:Envelope']['soap:Body'][0]['Trazabilidad_EnvioResponse'][0]['Trazabilidad_EnvioResult'][0]['diffgr:diffgram'][0]['NewDataSet'][0]['Table'][0]['comentario'][0];
      const fechayhora = result['soap:Envelope']['soap:Body'][0]['Trazabilidad_EnvioResponse'][0]['Trazabilidad_EnvioResult'][0]['diffgr:diffgram'][0]['NewDataSet'][0]['Table'][0]['fechayhora'][0];
      const fechaParseada = moment.utc(fechayhora).format('DD--MM--YYYY');

      const mensaje = `El estado de su envío es: ${comentario}, y la última actualización fue el: ${fechaParseada}`;
      res.status(200).send(mensaje);
    });
  } catch (error) {
    console.error('Error al consultar la API externa:', error);
    res.status(500).send('No se encontró información relacionada al código de trazabilidad');
  }
});

app.post('/crear-pedido', (req, res) => {
  try {
    const rawBody = req.query.xml;
    const xmlString = rawBody.toString('utf8');
    
    xml2js.parseString(xmlString, (err, result) => {
      if (err) {
          console.error('Error al parsear XML:', err);
          res.status(400).send('Error al parsear XML');
          return;
      }

      const resultData = result['soap:Envelope']['soap:Body'][0]['PedidosResponse'][0]['PedidosResult'][0];
      console.log(resultData);
      res.status(200).send(resultData);
    });
  } catch (error) {
    console.error('Error al parsear XML: ', error);
    res.status(400).send('Error al parsear XML');
  }
});

// Nueva ruta para iniciar una conversación en Slack cuando se solicita un asesor
app.post('/live-asesor', async (req, res) => {
  console.log('Inicia sesión en vivo...');
  const { user_id, user_message, chatfuel_user_id } = req.body;
  const slackUserId = process.env.SLACK_ASESOR_ID;

  try {
    // Verificar si el canal ya existe, excluyendo los archivados
    let slackChannel = await getSlackChannelFromGoogleSheets(user_id);

    if (slackChannel === '' || slackChannel === undefined) {
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
app.post('/whatsapp-webhook', async (req, res) => {
  console.log('Nuevo mensaje de Whatsapp!');
  const userMessage = req.body.Body;
  const userId = req.body.From.replace('whatsapp:+', '').trim();

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
app.post('/activate', async (req, res) => {
  console.log('Nuevo mensaje recibido desde Slack!');
  const { event } = req.body;
  console.log('Conenido del evento de Slack: ', event);

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

// Función para crear un canal en Slack
async function createSlackChannel(userId) {
  const channelName = `user${userId}`;
  const slackToken = process.env.SLACK_API_BOT_TOKEN;
  const slackUrl = 'https://slack.com/api/conversations.create';

  try {
    const response = await axios.post(slackUrl, {
      name: channelName,
      token: slackToken
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${slackToken}`
      }
    });

    if (response.data.ok) {
      console.log('Canal de slack creado!');
      return response.data.channel.id;
    } else {
      throw new Error(`Error al crear el canal en Slack: ${response.data.error}`);
    }
  } catch (error) {
    console.error('Error al crear el canal en Slack:', error.message);
    throw error; // Propaga el error para manejarlo en el caller
  }
}

// Función para enviar un mensaje a Slack
async function sendMessageToSlack(channel, message) {
  const slackToken = process.env.SLACK_API_BOT_TOKEN;
  const slackUrl = 'https://slack.com/api/chat.postMessage';
  console.log('Debug sender slack channel: ', channel, 'Message: ', message);
  const response = await axios.post(slackUrl, {
    channel: channel,
    text: message,
    token: slackToken
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${slackToken}`
    }
  });

  if (!response.data) {
    throw new Error('Error al enviar mensaje');
  } else {
    return response.data.ok;
  }
}

// Función para enviar una señal a Chatfuel
async function sendSignalToChatfuel(userId) {
  const apiKey = process.env.CHATFUEL_API_KEY;
  const botId = process.env.CHATFUEL_BOT_ID;
  const chatfuelUserId = await getChatfuelUserIdFromGoogleSheets(userId);

  const url = `https://api.chatfuel.com/bots/${botId}/users/${chatfuelUserId}/send?chatfuel_token=${apiKey}&chatfuel_flow_name=Flow`;

  try {
    const response = await axios.post(url, null, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Chatfuel signal response: ', response.data);

    if (response.data.result === 'success') {
      console.log('Conversación en vivo cerrada y usuario redirigido al flujo principal en Chatfuel');
    } else {
      throw new Error('Error al enviar la señal a Chatfuel');
    }
  } catch (error) {
    console.error('Error al enviar la señal a Chatfuel:', error.message);
    throw error; // Propaga el error para manejarlo en el caller
  }
}

// Función para enviar un mensaje a WhatsApp usando Twilio
async function sendMessageToWhatsApp(to, message) {
  const response = await client.messages.create({
    from: 'whatsapp:+17074021487',
    body: message,
    to: `whatsapp:+${to}`,
    messagingServiceSid: 'MG697fa907221a26b2da9cbc99068577b1'
  });

  if (response.sid) {
    return `Mensaje enviado exitosamente a: ${to}`;
  } else {
    return "Error al enviar mensaje por Whatsapp";
  }
}

async function sendToGoogleSheets(userId, slackChannel, chatfuelUserId) {
  const makeUrl = 'https://hook.eu2.make.com/8l2rap71szpkxycvf98my956ktjv68kc';
  try {
    const response = await axios.post(makeUrl, {
      user_id: userId,
      slack_channel: slackChannel,
      chatfuel_user_id: chatfuelUserId
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log('Datos enviados a Google Sheets');
    } else {
      throw new Error('Error al enviar los datos a Google Sheets');
    }
  } catch (error) {
    console.error('Error al enviar los datos a Google Sheets:', error.message);
  }
}

const getSlackChannelFromGoogleSheets = async (user_id) => {
  const makeUrl = `https://hook.eu2.make.com/qw1ovswl5vf1cb1hht7x9lc78rcbjjbd`;

  try {
    const response = await axios.post(makeUrl, {
      user_id: user_id
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('GET slack channel response: ', response.data);
    if (response.data !== '') {
      return response.data;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error al verificar el canal en Google Sheets:', error.message);
    throw error;
  }
};

const getChatfuelUserIdFromGoogleSheets = async (user_id) => {
  const makeUrl = `https://hook.eu2.make.com/58jsl18wt5f8qg89vpwktuhk3wvitm3c`;

  try {
    const response = await axios.post(makeUrl, {
      user_id: user_id
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('GET Chatfuel user id response: ', response.data);
    if (response.data !== '') {
      return response.data;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error al verificar el canal en Google Sheets:', error.message);
    throw error;
  }
};

const getWhatsappNumberFromGoogleSheets = async (channel_id) => {
  const makeUrl = `https://hook.eu2.make.com/81u3o5pew7nffvonb3j9pkhfnfocwp9u`;

  try {
    const response = await axios.post(makeUrl, {
      channel_id: channel_id
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('GET wpp number data response: ', response.data);
    if (response.data !== '') {
      return response.data;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error al verificar el canal en Google Sheets:', error.message);
    throw error;
  }
};

const checkLastWhatsappTemplateSent = async (user_id) => {
  const makeUrl = `https://hook.eu2.make.com/2df36xgr738r5jcoeo81cwmhbnd6cnk2`;

  try {
    const response = await axios.post(makeUrl, {
      user_id: user_id
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('GET last template send response: ', response.data);
    if (response.data !== '') {
      return response.data;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error al verificar el canal en Google Sheets:', error.message);
    throw error;
  }
};

async function saveLastWhatsappTemplateSent(userId, slackChannel, chatfuelUserId) {
  const makeUrl = 'https://hook.eu2.make.com/m7ezs9rs803js411ba76bww82mefhdx7';
  try {
    const response = await axios.post(makeUrl, {
      user_id: userId
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('Save last template send response: ', response.data);
    if (response.data.success) {
      console.log('Datos enviados a Google Sheets');
    } else {
      throw new Error('Error al enviar los datos a Google Sheets');
    }
  } catch (error) {
    console.error('Error al enviar los datos a Google Sheets:', error.message);
  }
}

// Función para enviar un mensaje de plantilla a WhatsApp usando Twilio
async function sendWhatsAppTemplateMessage(to, forceSend = false) {
  console.log('Enviando plantilla de Whatsapp...');
  const from = 'whatsapp:+17074021487';

  if (!forceSend) {
    // Verifica si ya se envió un template en las últimas 24 horas
    const lastTemplateSent = await checkLastWhatsappTemplateSent(to);
    if (lastTemplateSent) {
      const lastSentDate = new Date(lastTemplateSent);
      const now = new Date();
      const timeDifference = now - lastSentDate; // Diferencia en milisegundos

      if (timeDifference < (24 * 60 * 60 * 1000)) { // 24 horas
        console.log('Template ya enviado en las últimas 24 horas');
        return;
      }
    }
  }

  try {
    const response = await client.messages.create({
      from: from,
      to: `whatsapp:+${to}`,
      contentSid: 'HXf8ce9f32eef174eb3a244f9b64c8fc73',
      messagingServiceSid: 'MG697fa907221a26b2da9cbc99068577b1'
    });

    await saveLastWhatsappTemplateSent(to);
    return;
  } catch (error) {
    console.error(`Error al enviar el mensaje de plantilla a WhatsApp: ${error.message}`);
  }
}

// Función para invitar a un usuario al canal de Slack
async function inviteUserToSlackChannel(channelId, userId) {
  const slackToken = process.env.SLACK_API_BOT_TOKEN;
  const slackUrl = 'https://slack.com/api/conversations.invite';

  try {
    const response = await axios.post(slackUrl, {
      channel: channelId,
      users: userId
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${slackToken}`
      }
    });

    if (response.data.ok) {
      console.log(`Usuario ${userId} invitado al canal ${channelId}`);
      return response.data.ok;
    } else {
      throw new Error(`Error al invitar al usuario al canal en Slack: ${response.data.error}`);
    }
  } catch (error) {
    console.error('Error al invitar al usuario al canal en Slack:', error.message);
    throw error;
  }
}

app.listen(port, () => {
  console.log(`Server listening on port: ${port}`);
});