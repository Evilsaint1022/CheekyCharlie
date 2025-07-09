const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove-rss-channel')
        .setDescription('Remove the channel where RSS news will be sent'),

    async execute(interaction) {
        // Prevent usage in DMs
        if (interaction.channel.isDMBased()) {
            return interaction.reply({
                content: "This command cannot be used in DMs.",
                flags: MessageFlags.Ephemeral
            });
        }

        // Check for administrator permission
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: 'You do not have permission to use this command.',
                flags: MessageFlags.Ephemeral
            });
        }

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;

        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];
        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasWhitelistedRole = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasWhitelistedRole) {
            return interaction.reply({
                content: 'You do not have the required whitelisted role to use this command.',
                flags: MessageFlags.Ephemeral
            });
        }

        await db.settings.delete(`${guildName}_${guildId}.rssTopics`);
        await db.settings.delete(`${guildName}_${guildId}.rssNewsChannel`);

        await interaction.reply({
            content: 'RSS channel has been removed.',
            flags: MessageFlags.Ephemeral
        });
    },
};
