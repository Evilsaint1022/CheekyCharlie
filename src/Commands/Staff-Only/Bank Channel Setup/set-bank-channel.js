const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const db = require("../../../Handlers/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set-bank-channel")
    .setDescription("Set the bank channel for this server.")
    .addChannelOption(option =>
      option.setName("channel")
        .setDescription("The channel to assign or mention during bumps.")
        .setRequired(true)
    ),

  async execute(interaction) {

    // Prevent command usage in DMs
        if (interaction.channel.isDMBased()) {
        return interaction.reply({
        content: "This command cannot be used in DMs.",
        flags: MessageFlags.Ephemeral // Makes the reply ephemeral
    });
  }

  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
        }

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];

        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
        }

    try {
      const { guild, options } = interaction;
      const guildId = guild.id;
      const guildName = guild.name;
      
      //console logs
      console.log(`[💰] [SET-BANK-CHANNEL] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.username} used the set-bank-channel command.`);

      const channel = options.getChannel("channel");
      const key = `${guildName}_${guildId}`;

      const existing = await db.settings.get(key) || {};
      existing.bankchannel = channel.id;

      await db.settings.set(key, existing);

      await interaction.reply({
        content: `✅ Bank channel set to <#${channel.id}>`,
        flags: MessageFlags.Ephemeral
      });

    } catch (error) {
      console.error("Error setting Bank channel:", error);
      await interaction.reply({
        content: "❌ Failed to set the Bank channel.",
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
