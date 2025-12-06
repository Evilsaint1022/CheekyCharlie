const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const db = require("../../../Handlers/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set-bankinterest-channel")
    .setDescription("Set the bank interest channel for this server.")
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
        flags: 64 // Makes the reply ephemeral
    });
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
       const channel = options.getChannel("channel");
      
      //console logs
      console.log(`[💰] [SET-BANKINTEREST-CHANNEL] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.username} used the set-bankinterest-channel command to set ${channel.name} - ${channel.id}`);

      const key = `${guildName}_${guildId}`;

      const existing = await db.settings.get(key) || {};
      existing.bankinterest = channel.id;

      await db.settings.set(key, existing);

      await interaction.reply({
        content: `✅ Bank Interest channel has been set to <#${channel.id}>`,
        flags: 64
      });

    } catch (error) {
      console.error("Error setting Bank channel:", error);
      await interaction.reply({
        content: "❌ Failed to set the Bank channel.",
        flags: 64
      });
    }
  }
};
