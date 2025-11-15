const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-starboard-count')
    .setDescription('Set how many reactions are needed to send a message to the starboard')
    .addNumberOption(option =>
      option.setName('count')
        .setDescription('The number of reactions needed to send a message to the starboard')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (interaction.channel.isDMBased()) {
      return interaction.reply({
        content: "This command cannot be used in DMs.",
        flags: 64
      });
    }
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
        }

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const guildKey = `${guildName}_${guildId}`;
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];

        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
        }

    const count = interaction.options.getNumber('count');

    if (count < 1) {
      return interaction.reply({ content: 'The count must be at least 1.', flags: 64 });
    }

    // Load or create existing starboard settings
    const existingData = await db.starboard.get(guildKey) || {};
    existingData.starboardCount = count;

    // Save without overwriting other fields
    await db.starboard.set(guildKey, existingData);

    await interaction.reply({ content: `✅ Starboard count set to **${count}**.`, flags: 64 });
  },
};
