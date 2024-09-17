const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

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

module.exports = { sendMessageToSlack, sendMessageToWhatsApp }