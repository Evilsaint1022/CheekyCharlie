const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-staff-app-channel')
        .setDescription('Set the channel where staff applications will be posted.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel for staff applications')
                .setRequired(true)
        ),

    async execute(interaction) {

        if (interaction.channel.isDMBased()) {
            return interaction.reply({
                content: "This command cannot be used in DMs.",
                flags: 64
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

        if (channel.type !== 0) {
            return interaction.reply({
                content: '❌ Please select a text channel.',
                flags: 64
            });
        }

        const channelKey = `${guildName}_${guildId}.channel`;
        await db.staff_app_questions.set(channelKey, channel.id);

        console.log(`[⭐] [SET-STAFF-APP-CHANNEL] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.username} set staff application channel to #${channel.name}`);

        await interaction.reply({
            content: `✅ Staff application channel set to <#${channel.id}>`,
            flags: 64
        });
    },
};
