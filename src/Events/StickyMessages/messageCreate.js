const { handleStickyChannelMessage } = require('../../Utilities/StickyMessages/stickyManager');

module.exports = {
  name: 'messageCreate',
  once: false,

  async execute(message, client) {
    await handleStickyChannelMessage(message, client);
  }
};
