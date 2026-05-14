const { handleStickyMessageDeletion } = require('../../Utilities/StickyMessages/stickyManager');

module.exports = {
  name: 'messageDelete',
  once: false,

  async execute(message) {
    await handleStickyMessageDeletion(message);
  }
};
