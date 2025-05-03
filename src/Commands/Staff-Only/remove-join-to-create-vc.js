const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField } = require('discord.js');
const db = require('../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove-join-to-create-vc')
        .setDescription('Remove the settingsured Join To Create channel'),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const userId = interaction.user.id;

        // Fetch whitelisted roles from the database
        const whitelistedRoles = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];

        // Check if the user has the required permissions or a whitelisted role
        const member = interaction.guild.members.cache.get(userId);
        if (
            !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !member.roles.cache.some(role => whitelistedRoles.includes(role.id))
        ) {
            return interaction.reply({ content: 'You do not have permission to remove the Join To Create channel!', flags: 64 });
        }

        // Check if a Join To Create channel is set in the database
        const joinToCreateVC = await db.settings.get(`${guildName}_${guildId}_joinToCreateVC`);
        if (!joinToCreateVC) {
            return interaction.reply({ content: 'No Join To Create channel was set.', flags: 64 });
        }

        // Remove the Join To Create channel from the database
        db.settings.delete(`${guildName}_${guildId}_joinToCreateVC`);

        // Logging the action
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${interaction.guild.name} ${guildName}_${guildId} ${interaction.user.tag} removed the Join To Create channel.`);

        return interaction.reply({ content: 'The Join To Create channel has been removed.', flags: 64 });
    },
};
