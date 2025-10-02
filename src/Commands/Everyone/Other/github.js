const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('github')
    .setDescription('Get the Evilsaint1022 GitHub Repository link'),

  async execute(interaction) {

    // Prevent command usage in DMs
        if (interaction.channel.isDMBased()) {
        return interaction.reply({
        content: "This command cannot be used in DMs.",
        flags: 64 // Makes the reply ephemeral
    });
}

    const { guild, user, channel } = interaction;
    const timestamp = new Date().toLocaleTimeString();
    const guildIconUrl = guild.iconURL() || '';
    const messageContent = 'Check out the GitHub repository:\nhttps://github.com/Evilsaint1022/CheekyCharlie';

    await interaction.reply({ content: messageContent });

    // Console Logs
    console.log(`[🌿] [GITHUB] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ")}] ${guild.name} ${guild.id} ${user.username} used the github command.`);
  },
};

