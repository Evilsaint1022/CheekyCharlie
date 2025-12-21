const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
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

    const correctEmoji = interaction.options.getString('correct_emoji');
    const wrongEmoji = interaction.options.getString('wrong_emoji');
    const guildKey = `${interaction.guild.id}`;

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];

        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
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
    console.log(`[⭐] [SET-COUNTING-EMOJIS] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.username} used the set-counting-emojis command.`);
  }
};
