const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField } = require('discord.js');
const db = require('../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove-level-channel')
        .setDescription('Remove the configured level-up channel'),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        const member = interaction.guild.members.cache.get(userId);

        // Fetch whitelisted roles from the database
        const whitelistedRoles = await db.config.get(`${guildId}.whitelistedRoles`) || [];

        // Check for permission
        if (
            !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !member.roles.cache.some(role => whitelistedRoles.includes(role.id))
        ) {
            return interaction.reply({ content: 'You do not have permission to remove the level-up channel!', flags: MessageFlags.Ephemeral, });
        }

        // Check if a level-up channel is set
        const levelChannelId = await db.config.get(`${guildId}.levelChannelId`);
        if (!levelChannelId) {
            return interaction.reply({ content: 'No level-up channel is currently set.', flags: MessageFlags.Ephemeral, });
        }

        // Remove the level-up channel ID from the database
        db.config.delete(`${guildId}.levelChannelId`);

        // Logging the action
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${interaction.guild.name} ${guildId} ${interaction.user.tag} used the remove-level-channel command to remove the level-up channel.`);

        return interaction.reply({ content: 'The level-up channel has been removed.', flags: MessageFlags.Ephemeral, });
    }
};
