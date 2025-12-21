const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove-counting-emojis')
    .setDescription('Reset the custom emojis for counting feedback.'),

  async execute(interaction) {

    if (interaction.channel.isDMBased()) {
      return interaction.reply({
        content: "❌ This command cannot be used in DMs.",
        flags: 64 // ephemeral
      });
    }

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const guildKey = `${guildId}`;
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];

        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
        }

    const existing = await db.countingemojis.get(guildKey);

    if (!existing || (!existing.correct_emoji && !existing.wrong_emoji)) {
      return interaction.reply({
        content: 'ℹ️ There are no custom counting emojis set for this server.',
        flags: 64
      });
    }

    await db.countingemojis.set(guildKey, {}); // Reset only this guild's data, keeping structure intact if needed

    await interaction.reply({
      content: '✅ The custom counting emojis have been reset to default for this server.',
      flags: 64
    });

    //console logs
    console.log(`[⭐] [REMOVE-COUNTING-EMOJI] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.username} used the remove-counting-emojis command.`);
  }
};
