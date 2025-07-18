const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../Handlers/database'); // Make sure countingemojis and whitelisted are exported

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove-counting-emojis')
    .setDescription('Reset the custom emojis for counting feedback.'),

  async execute(interaction) {

    if (interaction.channel.isDMBased()) {
      console.log('Command used in DM, aborting.');
      return interaction.reply({
        content: "❌ This command cannot be used in DMs.",
        flags: 64 // ephemeral
      });
    }

    const user = interaction.user;
    const guild = interaction.guild;
    const guildId = guild.id;
    const guildName = guild.name;
    const guildKey = `${guildName}_${guildId}`;
    const userId = user.id;
    const member = guild.members.cache.get(userId);

    const whitelistedRoles = await db.whitelisted.get(`${guildKey}.whitelistedRoles`) || [];

    const hasPermission = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
    const hasWhitelistedRole = member.roles.cache.some(role => whitelistedRoles.includes(role.id));

    if (!hasPermission && !hasWhitelistedRole) {
      return interaction.reply({
        content: '❌ You do not have permission to reset the counting emojis!',
        flags: 64
      });
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
    console.log(`[${new Date().toLocaleTimeString()}] ${guildName} ${guildId} ${interaction.user.username} used the remove-counting-emojis command.`);
  }
};
