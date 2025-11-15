const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset-one-word-story')
    .setDescription('Reset the current one-word story.'),

  async execute(interaction) {
    // Prevent command usage in DMs
    if (interaction.channel.isDMBased()) {
      return interaction.reply({
        content: "This command cannot be used in DMs.",
        flags: 64 // Makes the reply ephemeral
      });
    }

    const guild = interaction.guild;

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

    const guildKey = `${guild.name}_${guild.id}`;
    const currentStory = await db.onewordstory.get(guildKey + ".story") || [];

    if (currentStory.length === 0) {
      return interaction.reply({
        content: "The one-word story is already empty.",
        flags: 64
      });
    }

    // Reset the story
    await db.onewordstory.set(guildKey + ".story", []);
    await db.onewordstory.set(guildKey + ".lastAuthor", null);

    await interaction.reply({
      content: "✅ The one-word story has been reset.",
      flags: 64
    });

    // Console log
    console.log(`[⭐] [RESET-ONE-WORD-STORY] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.username} used the reset-one-word-story command.`);
  }
};
