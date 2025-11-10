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
