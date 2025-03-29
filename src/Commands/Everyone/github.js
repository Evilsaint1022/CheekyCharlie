const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('github')
    .setDescription('Get the Evilsaint1022 GitHub Repository link'),

  async execute(interaction) {
    const { guild, user, channel } = interaction;
    const timestamp = new Date().toLocaleTimeString();
    const guildIconUrl = guild.iconURL() || '';
    const messageContent = 'Check out the GitHub repository:\nhttps://github.com/Evilsaint1022/CheekyCharlie';

    await interaction.reply({ content: messageContent });

    // Console Logs
    console.log(`[${timestamp}] ${guild.name} ${guild.id} ${user.username} used the github command.`);
  },
};

