const express = require('express');
const xml2js = require('xml2js');
const bodyParser = require('body-parser');
require("dotenv").config();
const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const app = express();
const port = 3001;

app.listen(port, () => {
  console.log(`Server listening on port: ${port}`);
});

app.use(express.json());
app.use(bodyParser.raw({ type: '*/*' }));

app.post('/send-message', async (req, res) => {
  const userData = req.body;
  const username = userData.username;
  const phone = userData.phone;
  const query = userData.query;

  const message = `¡Hola! El usuario: ${username}, espera ser contactado para responder su consulta sobre una cotización. 
  Localidad de origen, destino y carga: ${query}. El número de contacto es el siguiente: ${phone}. ¡Muchas gracias!`;

  try {
    const response = await client.messages.create({
      to: 'whatsapp:+5493564522800',
      from: 'whatsapp:+14155238886',
      body: message
    });

    if (response) {
        console.log(`Mensaje enviado a WhatsApp: ${message}`);
        res.status(200).send('Mensaje enviado exitosamente');
    } else {
        console.error(`Error al enviar mensaje`);    
    }
  } catch (error) {
    console.error(`Error al enviar mensaje: ${error}`);
    res.status(500).send('Error al enviar mensaje');
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

      const mensaje = `El estado de su envío es: ${comentario}, y la última actualización fue el: ${fechayhora}`;
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