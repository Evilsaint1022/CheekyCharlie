const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
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
    const guildId = guild.id;
    const guildName = guild.name;
    const userId = interaction.user.id;

    // Permission checks
    const whitelistedRoles = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];
    const member = guild.members.cache.get(userId);

    if (
      !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
      !member.roles.cache.some(role => whitelistedRoles.includes(role.id))
    ) {
      return interaction.reply({
        content: '❌ You do not have permission to reset the one-word story!',
        flags: 64
      });
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
    console.log(`[RESET-ONE-WORD-STORY] [${new Date().toLocaleDateString()}] [${new Date().toLocaleTimeString()}] ${guildName} ${guildId} ${interaction.user.username} used the reset-one-word-story command.`);
  }
};
