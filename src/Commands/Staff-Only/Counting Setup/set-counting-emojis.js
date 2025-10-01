const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-counting-emojis')
    .setDescription('Set the custom emojis for counting')
    .addStringOption(option =>
      option.setName('correct_emoji')
        .setDescription('Emoji to show when the number is correct')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('wrong_emoji')
        .setDescription('Emoji to show when the number is wrong')
        .setRequired(true)),

  async execute(interaction) {

    // Prevent command usage in DMs
        if (interaction.channel.isDMBased()) {
        return interaction.reply({
        content: "This command cannot be used in DMs.",
        flags: 64 // Makes the reply ephemeral
    });
}
    const guild = interaction.guild;
    const guildId = interaction.guild.id;
    const guildName = interaction.guild.name;
    const correctEmoji = interaction.options.getString('correct_emoji');
    const wrongEmoji = interaction.options.getString('wrong_emoji');
    const guildKey = `${interaction.guild.name}_${interaction.guild.id}`;
    const userId = interaction.user.id;

    const whitelistedRoles = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];
    const member = guild.members.cache.get(userId);

      if (
        !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
        !member.roles.cache.some(role => whitelistedRoles.includes(role.id))
      ) {
        return interaction.reply({
          content: '❌ You do not have permission to set the bump channel!',
          flags: 64
        });
      }

    await db.countingemojis.set(guildKey, {
      correct_emoji: correctEmoji,
      wrong_emoji: wrongEmoji
    });

    await interaction.reply({
      content: `✅ Counting emojis updated for this server:\nCorrect Emoji: ${correctEmoji}\nWrong Emoji: ${wrongEmoji}`,
      flags: 64
    });

    //console logs
    console.log(`[⭐] [SET-COUNTING-EMOJIS] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString()}] ${guildName} ${guildId} ${interaction.user.username} used the set-counting-emojis command.`);
  }
};
