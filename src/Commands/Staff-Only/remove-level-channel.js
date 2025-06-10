const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField } = require('discord.js');
const db = require('../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove-level-channel')
        .setDescription('Remove the configured level-up channel'),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const userId = interaction.user.id;

        const member = interaction.guild.members.cache.get(userId);

        // Fetch whitelisted roles from the database
        const whitelistedRoles = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];

        // Check for permission
        if (
            !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !member.roles.cache.some(role => whitelistedRoles.includes(role.id))
        ) {
            return interaction.reply({ content: 'You do not have permission to remove the level-up channel!', flags: 64 });
        }

        // Fetch current settings or default to empty object
        const currentSettings = await db.settings.get(`${guildName}_${guildId}`) || {};

        // Check if a level-up channel is set
        if (!currentSettings.LevelChannel) {
            return interaction.reply({ content: 'No level-up channel is currently set.', flags: 64 });
        }

        // Remove the LevelChannelId field only
        delete currentSettings.LevelChannel;

        // Save updated settings
        db.settings.set(`${guildName}_${guildId}`, currentSettings);

        // Logging the action
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${guildName}_${guildId} ${interaction.user.tag} used the remove-level-channel command to remove the level-up channel.`);

        return interaction.reply({ content: '✅ The level-up channel has been removed.', flags: 64 });
    }
};
