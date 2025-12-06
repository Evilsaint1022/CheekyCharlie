const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove-partydrop-channel')
        .setDescription('Remove the configured party drops channel'),

    async execute(interaction) {

        // Prevent command usage in DMs
        if (interaction.channel.isDMBased()) {
        return interaction.reply({
        content: "This command cannot be used in DMs.",
        flags: 64 // Makes the reply ephemeral
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

        // Fetch current settings or default to empty object
        const channelSettings = await db.settings.get(`${guildName}_${guildId}`) || {};

        // Check if a party drop channel is set
        if (!channelSettings.DropPartyChannel) {
            return interaction.reply({
                content: 'No party drop channel was set.',
                flags: 64,
            });
        }

        // Remove the DropPartyChannel field only
        delete channelSettings.DropPartyChannel;

        // Save updated settings object
        db.settings.set(`${guildName}_${guildId}`, channelSettings);

        // Logging the action
        const timestamp = new Date().toISOString();
        console.log(`[⭐] [REMOVE-DROPPARTY-CHANNEL] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.tag} removed the drop party channel.`);

        return interaction.reply({
            content: 'The party drops channel has been removed.',
            flags: 64,
        });
    },
};
