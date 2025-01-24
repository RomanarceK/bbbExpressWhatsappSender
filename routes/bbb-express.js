const { Router } = require('express');
const router = Router();
const xml2js = require('xml2js');
const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const moment = require('moment');
const { getConversation, saveConversation } = require('../hooks/useMake');
const axios = require('axios');

router.post('/send-message', async (req, res) => {
  const userData = req.body;
  const username = userData.username;
  const phone = userData.phone;
  const query = userData.query;

  try {
    const response = await client.messages.create({
      contentSid: 'HXe770ab72fee7a451774df96ff86093a4',
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

router.post('/send-bulk-message', async (req, res) => {
  const phone = req.body.number;
  try {
    const response = await client.messages.create({
      contentSid: 'HX43d959045b3f0b9ade06d80c06db5bd6',
      from: 'whatsapp:+17074021487',
      messagingServiceSid: 'MG697fa907221a26b2da9cbc99068577b1',
      to: `whatsapp:${phone}`
    });

    if (response.sid) {
      console.log(`Mensaje enviado a WhatsApp: ${phone}`);
      res.status(200).send({
        success: true,
        message: `Mensaje enviado exitosamente a: ${phone}`
      });
    } else {
      console.error('Error al enviar mensaje, respuesta sin SID.');
      res.status(500).send({
        success: false,
        message: `Error al enviar mensaje, respuesta sin SID.`
      });
    }
  } catch (error) {
    console.error(`Error al enviar mensaje: ${error.message}`);
    res.status(500).send({
      success: false,
      message: error.message
    });
  }
});
  
router.post('/nuevo-pedido', async (req, res) => {
  const userData = req.body;
  const username = userData.username;
  const phone = userData.phone;
  const sucursal = userData.sucursal;
  const razonSocial = userData.razonSocial;
  const bultos = userData.bultos;
  const detalleBultos = userData.detalleBultos;
  const domicilio = userData.domicilio;
  const localidad = userData.localidad;
  const provincia = userData.provincia;

  const query = `Datos del pedido: Sucursal: ${sucursal}. Razón social: ${razonSocial}. Cantidad de bultos: ${bultos}. Tipo de carga: ${detalleBultos}. Domicilio: ${domicilio}. Localidad: ${localidad}. Provincia: ${provincia}.`;
  console.log('Query nuevo pedido: ', query);
  try {
    const response = await client.messages.create({
      contentSid: 'HX0862f418ac9221b387dfbb889ed77bb9',
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
      console.log(`Mensaje sobre nuevo pedido enviado a WhatsApp: ${phone}`);
      res.status(200).send(`Mensaje sobre nuevo pedido enviado exitosamente a: ${phone}`);
    } else {
      console.error('Error al enviar mensaje sobre nuevo pedido, respuesta sin SID.');
      res.status(500).send('Error al enviar mensaje sobre nuevo pedido');
    }
  } catch (error) {
    console.error(`Error al enviar mensaje sobre nuevo pedido: ${error.message}`);
    res.status(500).send(`Error al enviar mensaje sobre nuevo pedido: ${error.message}`);
  }
});
  
router.post('/consultar-envio', async (req, res) => {
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
      const fechaParseada = moment.utc(fechayhora).format('DD/MM/YYYY');

      const mensaje = `El estado de su envío es: ${comentario}, y la última actualización fue el: ${fechaParseada}`;
      res.status(200).send(mensaje);
    });
  } catch (error) {
    console.error('Error al consultar la API externa:', error);
    res.status(500).send('No se encontró información relacionada al código de trazabilidad');
  }
});
  
router.post('/crear-pedido', (req, res) => {
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

router.post('/ask-bbbexpress', async (req, res) => {
  try {
    const cloudRunUrl = 'https://bbbexpress-app-619713117025.us-central1.run.app/generate-response/';
    const question = req.body.question;
    const userId = req.body.userid;
    const getUrl = "https://hook.eu2.make.com/ycaamvx16hpp483or9st54ex52fd2hjn";
    const saveUrl = "https://hook.eu2.make.com/go1wayfm33cyc6ffe5k0ua1w12h2lruu";

    if (!question || !userId) {
      return res.status(400).json({ success: false, error: 'La pregunta y el userId son requeridos' });
    }

    // Obtener el historial de la conversación
    let conversationHistory = await getConversation(userId, getUrl);

    if (!conversationHistory || conversationHistory == "Accepted") {
      conversationHistory = [];
    }

    // Agregar la nueva pregunta al historial
    conversationHistory.push(`role: user, content: ${question}`);

    // Mantener solo las últimas 20 entradas
    let cutConversationHistory = [];
    if (conversationHistory.length > 20) {
      cutConversationHistory = conversationHistory.slice(-20);
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
    console.log('BBB RESPONSE: ', response.data.response);
    // Agregar la respuesta del asistente al historial
    conversationHistory.push(`role: assistant, content: ${answer}`);

    // Guardar el historial de la conversación actualizado
    await saveConversation(userId, conversationHistory, saveUrl);

    // Retornar la respuesta generada a Chatfuel
    res.status(200).json(answer);
  } catch (error) {
    console.error('Error al procesar con ChatGPT:', error);
    res.status(500).json({ success: false, error: 'Error al procesar con ChatGPT' });
  }
});

module.exports = router;