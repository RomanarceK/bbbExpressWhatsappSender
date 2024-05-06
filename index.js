const express = require('express');
require("dotenv").config();
const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const app = express();
const port = 3001;

app.listen(port, () => {
  console.log(`Server listening on port: ${port}`);
});

app.use(express.json());

app.post('/send-message', async (req, res) => {
  // Extraer datos del cuerpo de la solicitud
  const userData = req.body;
  const username = userData.username;
  const phone = userData.phone;
  const query = userData.query;

  // Construir el mensaje para WhatsApp
  const message = `¡Hola! El usuario: ${username}, espera ser contactado para responder su consulta sobre una cotización. 
  Localidad de origen, destino y carga: ${query}. El número de contacto es el siguiente: ${phone}. ¡Muchas gracias!`;

  // Enviar mensaje a WhatsApp
  try {
    const response = await client.messages.create({
      to: 'whatsapp:+5493564640816', // Número del asesor
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
