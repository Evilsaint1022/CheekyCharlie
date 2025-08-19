const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require("discord.js");
const db = require("../../../Handlers/database");

module.exports = {

    data: new SlashCommandBuilder()
        .setName('remove-nsfw-logs-channel')
        .setDescription('Remove the NSFW logs channel for the server.'),

    async execute(interaction) {

        if (interaction.channel.isDMBased()) {
            return interaction.reply({
                content: "This command cannot be used in DMs.",
                flags: MessageFlags.Ephemeral
            });
        }

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;

        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const whitelistedRoles = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];
            const userRoles = interaction.member.roles.cache.map(role => role.id);
            const hasWhitelistedRole = whitelistedRoles.some(roleId => userRoles.includes(roleId));

            if (!hasWhitelistedRole) {
                return interaction.reply({ 
                    content: 'You do not have permission to use this command.', 
                    flags: MessageFlags.Ephemeral 
                });
            }
        }

        const currentChannel = await db.settings.get(`${guildName}_${guildId}.nsfwLogsChannel`);

        if (!currentChannel) {
            return interaction.reply({
                content: "No NSFW logs channel is currently set.",
                flags: MessageFlags.Ephemeral
            });
        }

        await db.settings.delete(`${guildName}_${guildId}.nsfwLogsChannel`);

        return interaction.reply({
            content: "NSFW logs channel has been removed.",
            flags: MessageFlags.Ephemeral
        });

    }

}
