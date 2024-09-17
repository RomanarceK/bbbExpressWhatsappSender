const axios = require('axios');

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
      throw error;
    }
}

module.exports = { inviteUserToSlackChannel, createSlackChannel }