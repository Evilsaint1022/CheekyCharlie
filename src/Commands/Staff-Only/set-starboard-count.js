const { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField, MessageFlags } = require('discord.js');
const db = require('../../Handlers/database');

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

    const user = interaction.user;
    const userId = user.id;
    const guild = interaction.guild;
    const guildId = guild.id;
    const guildName = guild.name;
    const guildKey = `${guildName}_${guildId}`;

    const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildKey}.whitelistedRoles`) || [];
    const member = guild.members.cache.get(userId);
    const memberRoles = interaction.member.roles.cache.map(role => role.id);
    const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

    if (
      !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
      !hasPermission
    ) {
      return interaction.reply({
        content: '❌ You do not have permission to set the starboard count!',
        flags: 64
      });
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
