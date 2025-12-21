const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove-level-channel')
        .setDescription('Remove the configured level-up channel'),

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
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];

        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
        }

        // Fetch current settings or default to empty object
        const currentSettings = await db.settings.get(`${guildId}`) || {};

        // Check if a level-up channel is set
        if (!currentSettings.LevelChannel) {
            return interaction.reply({ content: 'No level-up channel is currently set.', flags: 64 });
        }

        // Remove the LevelChannelId field only
        delete currentSettings.LevelChannel;

        // Save updated settings
        db.settings.set(`${guildId}`, currentSettings);

        // Logging the action
        const timestamp = new Date().toISOString();
        console.log(`[⭐] [REMOVE-LEVEL-CHANNEL] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.tag} used the remove-level-channel command to remove the level-up channel.`);

        return interaction.reply({ content: '✅ The level-up channel has been removed.', flags: 64 });
    }
};
