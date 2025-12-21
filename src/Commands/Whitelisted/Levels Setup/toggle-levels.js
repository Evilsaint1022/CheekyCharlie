const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('toggle-levels')
    .setDescription('Toggle the levels feature on or off for this server.'),

  async execute(interaction) {
    if (interaction.channel.isDMBased()) {
      return interaction.reply({
        content: 'This command cannot be used in DMs.',
        flags: MessageFlags.Ephemeral,
      });
    }

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];

        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
        }


    console.log(`[⭐] [TOGGLE-LEVELS] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.tag} used the toggle levels command.`);

    // Get current levels state (default false)
    const currentState = await db.settings.get(`${guildId}.levels`) || false;

    if (currentState) {
      await db.settings.set(`${guildId}.levels`, false);
      await interaction.reply({
        content: 'Levels feature has been **disabled** for this server.',
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await db.settings.set(`${guildId}.levels`, true);
      await interaction.reply({
        content: 'Levels feature has been **enabled** for this server.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
