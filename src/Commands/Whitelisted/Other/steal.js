const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const db = require('../../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("steal")
    .setDescription("Steal an emoji and add it to this server")
    .addStringOption(option =>
      option
        .setName("emoji")
        .setDescription("The emoji you want to steal")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("name")
        .setDescription("Optional name for the emoji")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEmojisAndStickers),

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
    const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];

    const memberRoles = interaction.member.roles.cache.map(role => role.id);
    const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

    if (!hasPermission) {
        return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
    }

    const emojiInput = interaction.options.getString("emoji");
    const customName = interaction.options.getString("name");

    // Match custom emoji format <:name:id> or <a:name:id>
    const emojiRegex = /<(a?):(\w+):(\d+)>/;
    const match = emojiInput.match(emojiRegex);

    if (!match) {
      return interaction.reply({
        content: "❌ That doesn't look like a custom emoji.",
        flags: 64
      });
    }

    const animated = match[1] === "a";
    const emojiName = match[2];
    const emojiId = match[3];

    // Use provided name OR original emoji name
    const finalName = customName ?? emojiName;

    // Emoji image URL
    const emojiURL = `https://cdn.discordapp.com/emojis/${emojiId}.${animated ? "gif" : "png"}`;

    try {
      const emoji = await interaction.guild.emojis.create({
        attachment: emojiURL,
        name: finalName
      });

      await interaction.reply({
        content: `✅ Emoji added! ${emoji} **:${emoji.name}:**`
      });

      console.log(`[⭐] [STEAL] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.tag} used the steal command to steal ${emojiName} ${emojiId}`);

    } catch (error) {
      console.error(error);
      interaction.reply({
        content: "❌ Failed to add emoji. Make sure I have permission and the server has space.",
        flags: 64
      });
    }
  }
};
