const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove-partydrop-channel')
        .setDescription('Remove the configured party drops channel'),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const userId = interaction.user.id;

        // Check if the user has Administrator permissions or a whitelisted role
        const member = interaction.guild.members.cache.get(userId);
        const whitelistedRoles = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];

        if (
            !interaction.member.permissions.has(PermissionFlagsBits.Administrator) &&
            !member.roles.cache.some(role => whitelistedRoles.includes(role.id))
        ) {
            return interaction.reply({
                content: 'You do not have permission to remove the party drops channel!',
                flags: MessageFlags.Ephemeral,
            });
        }

        // Check if a party drop channel is set
        const channelSettings = await db.settings.get(`${guildName}_${guildId}_channelSettings`) || {};
        if (!channelSettings.DropPartyChannelId) {
            return interaction.reply({
                content: 'No party drop channel was set.',
                flags: MessageFlags.Ephemeral,
            });
        }

        // Remove the DropPartyChannelId from the database
        delete channelSettings.DropPartyChannelId;
        db.settings.set(`${guildName}_${guildId}_channelSettings`, channelSettings);

        // Logging the action
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${guildName}_${guildId} ${interaction.user.tag} removed the drop party channel.`);

        return interaction.reply({
            content: 'The party drops channel has been removed.',
            flags: MessageFlags.Ephemeral,
        });
    },
};
