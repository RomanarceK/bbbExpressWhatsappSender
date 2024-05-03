const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const puppeteer = require('puppeteer');
require("dotenv").config();

const app = express();
const port = 3001;

app.listen(port, () => {
  console.log(`Server listening on port: ${port}`);
});

app.use(express.json());

(async () => {
  const browser = await puppeteer.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--single-process', '--no-zygote'],
    executablePath: process.env.NODE_ENV === "production" 
    ? process.env.PUPPETEER_EXECUTABLE_PATH
    : puppeteer.executablePath(), 
  });
  const page = await browser.newPage();

  const client = new Client({
    puppeteer: { browser, page },
    authStrategy: new LocalAuth({
      clientId: 'admin'
    }),
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    },
  });

  // Handle WhatsApp events
  client.on('qr', (qr) => {
    console.log(`QR received ${qr}`);
  });

  client.on('ready', () => {
    console.log('Client is ready');
  });

  client.on('error', (error) => {
    console.error('Error:', error);
  });

  await client.initialize();

  app.post('/send-message', (req, res) => {
    const userData = req.body;
    const username = userData.username;
    const phone = userData.phone;
    const query = userData.query;

    const message = `¡Hola! El usuario: ${username}, espera ser contactado para responder su consulta sobre una cotización. 
    Localidad de origen, destino y carga: ${query}. El número de contacto es el siguiente: ${phone}. ¡Muchas gracias!`;

    const asesorNumber = '5493564339696@c.us';

    client.sendMessage(asesorNumber, message)
      .then(() => {
        console.log(`Message sent to ${asesorNumber}: ${message}`);
        res.status(200).send('Message sent successfully');
      })
      .catch((error) => {
        console.error(`Error sending message: ${error}`);
        res.status(500).send('Error sending message');
      });
  });

  app.get('/restart-session', (req, res) => {
    client.initialize()
      .then(() => {
        console.log('Session restarted successfully');
        res.status(200).send('Session restarted successfully');
      })
      .catch((error) => {
        console.error('Error restarting session:', error);
        res.status(500).send('Failed to restart session');
      });
  });
})();