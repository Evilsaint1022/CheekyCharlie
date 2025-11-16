const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove-staff-app-channel')
        .setDescription('Remove the staff application channel.'),

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

        const channelKey = `${guildName}_${guildId}.channel`;
        const existingChannel = await db.staff_app_questions.get(channelKey);

        if (!existingChannel) {
            return interaction.reply({
                content: '❌ No staff application channel is currently set.',
                flags: 64
            });
        }

        await db.staff_app_questions.delete(channelKey);

        console.log(`[⭐] [REMOVE-STAFF-APP-CHANNEL] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.username} removed staff application channel`);

        await interaction.reply({
            content: '✅ Staff application channel removed successfully.',
            flags: 64
        });
    },
};
