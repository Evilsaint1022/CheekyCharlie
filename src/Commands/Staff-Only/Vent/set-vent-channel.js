const { SlashCommandBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-vent-channel')
        .setDescription('Set the channel where vent confessions will be sent')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to set for vent confessions')
                .setRequired(true)
        ),

    async execute(interaction) {
        if (interaction.channel.isDMBased()) {
            return interaction.reply({
                content: "This command cannot be used in DMs.",
                flags: 64
            });
        }

        const user = interaction.user;
        const userId = user.id;
        const guild = interaction.guild;
        const guildId = guild.id;
        const guildName = guild.name;
        const guildKey = `${guildName}_${guildId}`;

        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildKey}.whitelistedRoles`) || [];
        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (
            !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !hasPermission
        ) {
            return interaction.reply({
                content: '❌ You do not have permission to set the vent channel!',
                flags: 64
            });
        }

        const channel = interaction.options.getChannel('channel');

        if (channel.type !== ChannelType.GuildText) {
            return interaction.reply({ content: 'Please select a valid text channel.', flags: 64 });
        }

        const existingData = await db.settings.get(guildKey) || {};

        existingData.ventChannelId = channel.id;

        await db.settings.set(guildKey, existingData);

        const timestamp = new Date().toLocaleTimeString();
        const datestamp = new Date().toLocaleDateString();
        console.log(`[${timestamp}] [${datestamp}] ${guildName} ${guildId} ${interaction.user.tag} used the set-vent-channel command to set the channel ID "${channel.id}"`);

        await interaction.reply({ content: `✅ Vent channel set to ${channel.url}.`, flags: 64 });
    },
};
