const { SlashCommandBuilder, PermissionsBitField, ChannelType } = require('discord.js');
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

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const userId = interaction.user.id;

        const member = interaction.guild.members.cache.get(userId);

        // Fetch whitelisted roles from the database
        const whitelistedRoles = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];

        // Check for permission
        if (
            !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !member.roles.cache.some(role => whitelistedRoles.includes(role.id))
        ) {
            return interaction.reply({ content: 'You do not have permission to remove the vent channel!', flags: 64 });
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
        console.log(`[⭐] [REMOVE-VENT-CHANNEL] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ")}] ${guildName} ${guildId} ${interaction.user.tag} used the remove-vent-channel command to remove the vent channel.`);

        return interaction.reply({ content: '✅ The vent channel has been removed.', flags: 64 });
    },
};
