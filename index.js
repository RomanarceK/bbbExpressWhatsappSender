const express = require('express');
const xml2js = require('xml2js');
const bodyParser = require('body-parser');
const moment = require('moment');
require("dotenv").config();
const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const axios = require('axios');

const app = express();
const port = 3001;

app.listen(port, () => {
  console.log(`Server listening on port: ${port}`);
});

app.use(express.json());
app.use(bodyParser.raw({ type: '*/*' }));

const conversations = {};
const chatfuelUsers = {};

app.post('/send-message', async (req, res) => {
  const userData = req.body;
  const username = userData.username;
  const phone = userData.phone;
  const query = userData.query;

  try {
    const response = await client.messages.create({
      contentSid: 'HX9b638f2528bb6a26939ccbe2d6ccf6ca',
      from: 'whatsapp:+15304530886',
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
  const { user_id, user_message, chatfuel_user_id } = req.body;
  const formattedUserId = "+" + user_id;
  console.log(formattedUserId);

  try {
    // Crear un canal en Slack para el usuario
    const slackChannel = await createSlackChannel(formattedUserId);

    // Guardar la conversación en memoria
    conversations[formattedUserId] = slackChannel;
    chatfuelUsers[formattedUserId] = chatfuel_user_id;

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

// Ruta para recibir mensajes de WhatsApp desde Twilio
app.post('/whatsapp-webhook', async (req, res) => {
  const userMessage = req.body.message;
  const userId = req.body.from;

  try {
    // Recuperar el canal de Slack correspondiente
    const slackChannel = conversations[userId];
    if (!slackChannel) {
      // Crear un canal en Slack para el usuario
      const slackChannel = await createSlackChannel(userId);
      await sendMessageToSlack(slackChannel, userMessage);
      
      res.status(200).send({
        message: 'Mensaje recibido y enviado a Slack',
        data: {
          user_id: userId,
          slack_channel: slackChannel,
          user_message: userMessage
        }
      });
    } else {
      await sendMessageToSlack(slackChannel, userMessage);

      res.status(200).send({
        message: 'Mensaje recibido y enviado a Slack',
        data: {
          user_id: userId,
          slack_channel: slackChannel,
          user_message: userMessage
        }
      });
    }
  } catch (error) {
    console.error(`Error al recibir el mensaje de WhatsApp: ${error.message}`);
    res.status(500).send(`Error al recibir el mensaje de WhatsApp: ${error.message}`);
  }
});

// Slack Webhook
app.post('/activate', async (req, res) => {
  const { event } = req.body;

  if (event && event.type === 'message' && !event.bot_id) {
    const slackChannel = event.channel;
    const userMessage = event.text;
    const userId = Object.keys(conversations).find(key => conversations[key] === slackChannel);
    console.log('User ID: ', userId);
    if (userMessage.trim() === '/fin') {
      // Finalizar la conversación
      if (userId) {
        delete conversations[userId];

        // Aquí puedes agregar el código para enviar una señal a Chatfuel para reanudar el flujo
        await sendSignalToChatfuel(userId);

        res.status(200).send('Conversación finalizada y flujo de Chatfuel reanudado');
      } else {
        res.status(404).send('Usuario no encontrado para el canal de Slack');
      }
    } else {
      // Continuar la conversación normal
      if (userId) {
        try {
          await sendMessageToWhatsApp(userId, userMessage);
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
  const slackToken = process.env.SLACK_API_BOT_TOKEN;
  console.log(slackToken);
  const slackUrl = 'https://slack.com/api/conversations.create';
  const response = await axios.post(slackUrl, {
    name: `user-${userId}`,
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${slackToken}`
    }
  });
  console.log('slack channel create response: ', response);
  if (response.data.ok) {
    return response.data.channel.id;
  } else {
    throw new Error('Error al crear el canal en Slack');
  }
}

// Función para enviar un mensaje a Slack
async function sendMessageToSlack(channel, message) {
  const slackToken = process.env.SLACK_BOT_TOKEN;
  const slackUrl = 'https://slack.com/api/chat.postMessage';
  const response = await axios.post(slackUrl, {
    channel: channel,
    text: message,
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${slackToken}`
    }
  });
  console.log('slack msg response: ', response);
  if (!response.data) {
    throw new Error('Error al enviar la señal a Chatfuel');
  }
}

// Función para enviar una señal a Chatfuel
async function sendSignalToChatfuel(userId) {
  const chatfuelUserId = chatfuelUsers[userId];
  const makeUrl = `https://hook.eu2.make.com/5vn8ko3mj12wh5up1p7osnug656v0qlx`;
  const response = await axios.post(makeUrl, {
    block_name: 'Flow',
    user_id: chatfuelUserId
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.data.success) {
    throw new Error('Error al enviar la señal a Chatfuel');
  }
}

// Función para enviar un mensaje a WhatsApp usando Twilio
async function sendMessageToWhatsApp(to, message) {
  await client.messages.create({
    from: 'whatsapp:+15304530886',
    body: message,
    to: `whatsapp:${to}`
  });
}