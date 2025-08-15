const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-rss-channel')
        .setDescription('The channel where rss news will be sent')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The channel to set for rss news')
                .setRequired(true)
        ),

    async execute(interaction) {
        
        // Prevent command usage in DMs
        if (interaction.channel.isDMBased()) {
        return interaction.reply({
        content: "This command cannot be used in DMs.",
        flags: 64 // Makes the reply ephemeral
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

        const channel = interaction.options.getChannel('channel');

        if (channel.type !== ChannelType.GuildText) {
            return interaction.reply({ content: 'Please select a valid text channel.', flags: MessageFlags.Ephemeral });
        }

        await db.settings.set(`${guildName}_${guildId}.rssTopics`, []);
        await db.settings.set(`${guildName}_${guildId}.rssNewsChannel`, channel.id);

        await interaction.reply({ content: `RSS channel set to ${channel.url}.`, flags: MessageFlags.Ephemeral });

    },
};
