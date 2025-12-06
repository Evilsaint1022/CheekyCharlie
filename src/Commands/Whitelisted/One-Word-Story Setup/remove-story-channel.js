const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove-story-channel')
        .setDescription('Remove the currently set story channel.'),

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

        const guildKey = `${guildName}_${guildId}`;

        // Get existing settings
        const currentSettings = await db.settings.get(guildKey);

        if (!currentSettings || !currentSettings.story_channel) {
            return interaction.reply({
                content: '⚠️ No story channel is currently set.',
                flags: 64
            });
        }

        // Delete just the story_channel key
        delete currentSettings.story_channel;

        // Save updated settings
        await db.settings.set(guildKey, currentSettings);

        await interaction.reply({
            content: '🗑️ Story channel has been removed.',
            flags: 64
        });

        // Console logs
        console.log(`[⭐] [RMOVE-STORY-CHANNEL] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.username} used the remove-story-channel command.`);
    }
};