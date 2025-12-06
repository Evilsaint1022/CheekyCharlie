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
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];

        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
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