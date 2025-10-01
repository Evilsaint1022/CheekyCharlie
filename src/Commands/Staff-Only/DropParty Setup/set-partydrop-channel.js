const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-partydrop-channel')
        .setDescription('Set the channel where the party drops will go')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel for the party drops')
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

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const userId = interaction.user.id;

        // Check if the user has Administrator permissions or a whitelisted role
        const member = interaction.guild.members.cache.get(userId);
        const whitelistedRoles = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];

        if (
            !interaction.member.permissions.has(PermissionFlagsBits.Administrator) &&
            !member.roles.cache.some(role => whitelistedRoles.includes(role.id))
        ) {
            return interaction.reply({
                content: 'You do not have permission to set the party drops channel!',
                flags: 64,
            });
        }

        // Get the channel from the interaction
        const channel = interaction.options.getChannel('channel');

        // Fetch current settings or default to empty object
        const currentSettings = await db.settings.get(`${guildName}_${guildId}`) || {};

        // Update only the DropPartyChannel field
        currentSettings.DropPartyChannel = channel.id;

        // Save updated settings
        db.settings.set(`${guildName}_${guildId}`, currentSettings);

        // Logging the action
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[⭐] [SET-PARTYDROP-CHANNEL] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString()}] ${guildName} ${guildId} ${interaction.user.tag} set the drop party channel to "${channel.id}"`);

        return interaction.reply({
            content: `✅ Drops will now appear in <#${channel.id}>.`,
            flags: 64,
        });
    },
};
