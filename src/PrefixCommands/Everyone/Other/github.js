module.exports = {
  name: 'github',
  aliases: [`cheekycharlie`],

  async execute(message, args) {

    // Prevent command usage in DMs
    if (!message.guild) {
      return message.reply('This command cannot be used in DMs.');
    }

    const { guild, author } = message;

    const messageContent =
      'Check out the GitHub repository:\nhttps://github.com/Evilsaint1022/CheekyCharlie';

    // Send the message
    await message.channel.send(messageContent);

    // Console Logs
    console.log(
      `[🌿] [GITHUB] [${new Date().toLocaleDateString('en-GB')}] ` +
      `[${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ` +
      `${guild.name} ${guild.id} ${author.username} used the github command.`
    );
  },
};
