// handlers/AI-Handler.js
const { handleAIMessage } = require('../AI-Response/AI-Response');

function registerAIHandler(client) {
  client.on('messageCreate', (message) => handleAIMessage(client, message));
}

module.exports = registerAIHandler;
