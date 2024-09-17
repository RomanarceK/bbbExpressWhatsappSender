require("dotenv").config();

async function saveSlackEvent(event_id) {
    const makeUrl = 'https://hook.eu2.make.com/qx0t09gmf5x70d0146k52lf5agurjfg3';
    try {
      const response = await axios.post(makeUrl, {
        event_id: event_id
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
  
      if (response.data !== '') {
        console.log('Evento guardado en Google Sheets', response.data);
      } else {
        throw new Error('Error al enviar los datos a Google Sheets');
      }
    } catch (error) {
      console.error('Error al enviar los datos a Google Sheets:', error.message);
    }
}
  
const getSlackEvents = async function (user_id) {
    const makeUrl = `https://hook.eu2.make.com/3849vkotn8e1qmrb1qgiljldttwv94gc`;
  
    try {
      const response = await axios.post(makeUrl, {}, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('GET slack events response: ', response.data);
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
  
      if (response.data.result === 'ok') {
        console.log('Conversación en vivo cerrada y usuario redirigido al flujo principal en Chatfuel');
        return;
      } else {
        throw new Error('Error al enviar la señal a Chatfuel');
      }
    } catch (error) {
      console.error('Error al enviar la señal a Chatfuel:', error.message);
      throw error; // Propaga el error para manejarlo en el caller
    }
}

async function saveConversation(userId, conversation, url) {
  const currentDate = new Date().toISOString();

  try {
    const response = await axios.post(url, {
      user_id: userId,
      conversation: JSON.stringify(conversation),
      date: currentDate
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data) {
      console.log('Mensaje guardado en Google Sheets');
    } else {
      throw new Error('Error al enviar los datos a Google Sheets');
    }
  } catch (error) {
    console.error('Error al enviar los datos a Google Sheets: ', error.message);
  }
}

async function getConversation(userId, url) {
  try {
    const response = await axios.get(url, {
      params: {
        user_id: userId
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data && response.data !== 'Accepted') {
      return response.data;
    } else {
      console.log('No se encontró conversación previa, iniciando nueva.');
      return [];
    }
  } catch (error) {
    console.error('Error al recuperar la conversación de Google Sheets: ', error.message);
    return [];
  }
}

module.exports = { 
  saveSlackEvent, 
  getSlackEvents, 
  sendToGoogleSheets, 
  getSlackChannelFromGoogleSheets, 
  getChatfuelUserIdFromGoogleSheets,
  getWhatsappNumberFromGoogleSheets,
  checkLastWhatsappTemplateSent,
  saveLastWhatsappTemplateSent,
  sendWhatsAppTemplateMessage,
  sendSignalToChatfuel,
  saveConversation,
  getConversation
}