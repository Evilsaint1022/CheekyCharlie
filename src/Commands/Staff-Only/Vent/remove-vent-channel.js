const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove-vent-channel')
        .setDescription('Remove the current vent channel'),

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

        // Fetch current settings or default to empty object
        const currentSettings = await db.settings.get(`${guildName}_${guildId}`) || {};

        // Check if a vent channel is set
        if (!currentSettings.ventChannelId) {
            return interaction.reply({ content: 'No vent channel is currently set.', flags: 64 });
        }

        delete currentSettings.ventChannelId;

        db.settings.set(`${guildName}_${guildId}`, currentSettings);

        const timestamp = new Date().toISOString();
        console.log(`[⭐] [REMOVE-VENT-CHANNEL] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.tag} used the remove-vent-channel command to remove the vent channel.`);

        return interaction.reply({ content: '✅ The vent channel has been removed.', flags: 64 });
    },
};
