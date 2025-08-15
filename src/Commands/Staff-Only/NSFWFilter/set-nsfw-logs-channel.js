const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const db = require("../../../Handlers/database");

module.exports = {

    data: new SlashCommandBuilder()
        .setName('set-nsfw-logs-channel')
        .setDescription('Toggle the NSFW filter for the server.')
        .addChannelOption(option =>
            option.setName('channel')
                  .setDescription('The channel to set as the NSFW logs channel.')
        ),

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

        const channel = interaction.options.getChannel('channel') || interaction.channel;

        if (!channel.isTextBased() || !channel.isSendable()) {
            return interaction.reply({
                content: "Please select a valid text channel.",
                flags: MessageFlags.Ephemeral
            });
        }

        await db.settings.set(`${guildName}_${guildId}.nsfwLogsChannel`, channel.id);

        return interaction.reply({
            content: `NSFW logs channel has been set to <#${channel.id}>.`,
            flags: MessageFlags.Ephemeral
        });

    }

}